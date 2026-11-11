"""Servidor mínimo do janelas da FAU: arquivos estáticos + API de clima, desenhos e denúncias."""
import hmac
import json
import os
import re
import ssl
import threading
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(BASE, "static")
if not os.path.isdir(STATIC):  # se os arquivos da pasta static foram enviados soltos, junto do server.py
    STATIC = BASE
DATA = os.path.join(BASE, "data")
DRAWINGS = os.path.join(DATA, "desenhos.json")
REPORTS = os.path.join(DATA, "denuncias.json")

SLOT_SECONDS = 20 * 60
LAT, LON = -23.5595, -46.7313  # Cidade Universitária (só para a fonte reserva)
WEATHER_TTL = 5 * 60
NO_WEATHER = {"temperatura": None, "vento": None, "umidade": None, "fonte": "indisponivel", "medido": None}
STALE_OK = 90 * 60  # a estação publica de hora em hora; um dado de até 90 min ainda vale
MAX_BODY = 5_000_000
# senha da página /moderar: configure a variável MODERACAO_SENHA no serviço de hospedagem
MOD_SENHA = os.environ.get("MODERACAO_SENHA", "")

SYSTEM_CA = "/etc/ssl/certs/ca-certificates.crt"
SSL_CTX = ssl.create_default_context(cafile=SYSTEM_CA if os.path.exists(SYSTEM_CA) else None)

lock = threading.Lock()
weather_cache = {"t": 0, "data": None}


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save(path, items):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False)
    os.replace(tmp, path)


IAG_URL = "https://estacao.iag.usp.br/"
HEADERS = {"User-Agent": "janelas-da-fau/1.0 (projeto academico FAU-USP)"}


def http_get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=8, context=SSL_CTX) as r:
        return r.read().decode("utf-8", "replace")


def num(txt):
    return float(txt.replace(",", "."))


def parse_iag(html):
    """Lê a tabela 'Condições Atuais' da página inicial da estação."""
    rows = {}
    for label, value in re.findall(r'class="spec(?:alt)?">\s*([^<]+?)\s*</td>\s*<td[^>]*>(.*?)</td>', html, re.S):
        rows[label.rstrip(": ").strip().lower()] = re.sub(r"<[^>]+>", " ", value).strip()
    temp = re.search(r"(-?\d+(?:,\d+)?)\s*°C", rows["temperatura do ar"])
    ur = re.search(r"(\d+(?:,\d+)?)\s*%", rows["ur"])
    vento_txt = rows.get("vento", "").lower()
    if "calmo" in vento_txt:
        vento = 0.0
    else:
        m = re.search(r"(\d+(?:,\d+)?)\s*(km/h|m/s|kt|n[óo]s)", vento_txt)
        vento = num(m.group(1)) * {"km/h": 1, "m/s": 3.6}.get(m.group(2), 1.852)
    medido = re.search(r'class="data">\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})', html)
    return {
        "temperatura": num(temp.group(1)),
        "vento": round(vento, 1),
        "umidade": round(num(ur.group(1))),
        "fonte": "estacao",
        "medido": medido.group(1) if medido else None,
    }


def fetch_open_meteo():
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={LAT}&longitude={LON}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m&wind_speed_unit=kmh"
        "&timezone=America%2FSao_Paulo"
    )
    cur = json.loads(http_get(url))["current"]
    return {
        "temperatura": cur["temperature_2m"],
        "vento": cur["wind_speed_10m"],
        "umidade": cur["relative_humidity_2m"],
        "fonte": "modelo",
        "medido": cur["time"].replace("T", " "),
    }


def agora_sp():
    """Data e hora de agora em São Paulo (UTC-3, sem horário de verão)."""
    return time.strftime("%Y-%m-%d %H:%M", time.gmtime(time.time() - 3 * 3600))


def fetch_weather():
    if time.time() - weather_cache["t"] < WEATHER_TTL:
        return weather_cache["data"] or NO_WEATHER
    data = None
    for source in (lambda: parse_iag(http_get(IAG_URL)), fetch_open_meteo):
        try:
            data = source()
            break
        except Exception as e:  # noqa: BLE001 - qualquer falha cai para a próxima fonte
            print("clima:", source, repr(e), flush=True)
    if data:
        # a fonte reserva arredonda o horário para os próximos 15 min; nunca mostra horário no futuro
        if data.get("medido") and data["medido"] > agora_sp():
            data["medido"] = agora_sp()
        weather_cache.update(t=time.time(), data=data, ok=time.time())
    elif weather_cache.get("data") and time.time() - weather_cache.get("ok", 0) < STALE_OK:
        data = weather_cache["data"]
        weather_cache["t"] = time.time()
    else:
        data = NO_WEATHER
        weather_cache.update(t=time.time(), data=None)
    return data


def public(d):
    return {k: d[k] for k in ("id", "numero", "inicio", "fim", "clima", "tracos")}


def active(drawings):
    return [d for d in drawings if not d.get("removido")]


def current_drawing(drawings, now):
    """O desenho na parede: o último enviado, enquanto não passaram os 20 min."""
    shown = [d for d in active(drawings) if d["inicio"] <= now < d["fim"]]
    return shown[-1] if shown else None


def status(d, cur, now):
    if d.get("removido"):
        return "removido"
    if cur and d["id"] == cur["id"]:
        return "na parede"
    return "já exibido"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=STATIC, **kw)

    def log_message(self, fmt, *args):
        if "/api/" in self.path and not self.path.startswith("/api/agora"):
            print(self.address_string(), fmt % args, flush=True)

    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        # proxies (como o do preview e alguns serviços de hospedagem) podem mandar o corpo em "chunked"
        if "chunked" in self.headers.get("Transfer-Encoding", "").lower():
            body = b""
            while True:
                size = int(self.rfile.readline().split(b";")[0].strip() or b"0", 16)
                if size == 0:
                    self.rfile.readline()
                    return body
                body += self.rfile.read(size)
                self.rfile.readline()
                if len(body) > MAX_BODY:
                    return None
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            return None
        return self.rfile.read(n)

    def read_json(self):
        try:
            raw = self.read_body()
            return json.loads(raw) if raw else None
        except (ValueError, json.JSONDecodeError):
            return None

    def do_GET(self):
        url = urllib.parse.urlsplit(self.path)
        if url.path == "/api/clima":
            return self.send_json(fetch_weather())
        if url.path == "/api/agora":
            now = time.time()
            with lock:
                drawings = load(DRAWINGS)
            cur = current_drawing(drawings, now)
            desenho = public(cur) if cur else None
            # a parede pergunta a cada 2 s; se ela já tem este desenho, não reenvia os traços
            if desenho and urllib.parse.parse_qs(url.query).get("tenho") == [cur["id"]]:
                desenho.pop("tracos")
            return self.send_json({"agora": now, "desenho": desenho})
        if url.path in ("/api/moderacao", "/api/moderacao/baixar"):
            if not self.mod_ok():
                return
            now = time.time()
            with lock:
                drawings, reports = load(DRAWINGS), load(REPORTS)
            if url.path.endswith("/baixar"):
                body = json.dumps({"desenhos": drawings, "denuncias": reports}, ensure_ascii=False).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="janelas_da_fau_desenhos.json"')
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                return self.wfile.write(body)
            cur = current_drawing(drawings, now)
            lista = []
            for d in reversed(drawings):
                motivos = [r["motivo"] for r in reports if r["id"] == d["id"]]
                lista.append({**public(d), "criado": d["criado"], "status": status(d, cur, now), "denuncias": motivos})
            return self.send_json({"agora": now, "desenhos": lista})
        if url.path.rstrip("/") in ("/parede", "/cartaz", "/moderar"):
            self.path = url.path.rstrip("/") + ".html"
        return super().do_GET()

    def mod_ok(self):
        if not MOD_SENHA:
            self.send_json({"erro": "senha não configurada no servidor (MODERACAO_SENHA)"}, 503)
            return False
        if not hmac.compare_digest(self.headers.get("X-Senha", "").encode(), MOD_SENHA.encode()):
            self.send_json({"erro": "senha errada"}, 401)
            return False
        return True

    def do_POST(self):
        body = self.read_json()
        if body is None:
            return self.send_json({"erro": "corpo inválido"}, 400)
        if self.path == "/api/desenhos":
            tracos = body.get("tracos")
            if not isinstance(tracos, list) or not tracos or not all(
                    isinstance(t, dict) and isinstance(t.get("pts"), list) for t in tracos):
                return self.send_json({"erro": "desenho vazio"}, 400)
            now = time.time()
            with lock:
                drawings = load(DRAWINGS)
                # o desenho novo entra na hora, no lugar do que estava na parede
                for antigo in drawings:
                    if antigo["fim"] > now:
                        antigo["fim"] = now
                inicio = now
                d = {
                    "id": f"{int(now * 1000):x}",
                    "numero": len(drawings) + 1,
                    "criado": now,
                    "inicio": inicio,
                    "fim": inicio + SLOT_SECONDS,
                    "clima": body.get("clima") or fetch_weather(),
                    "tracos": tracos,
                }
                drawings.append(d)
                save(DRAWINGS, drawings)
            return self.send_json({"id": d["id"], "numero": d["numero"], "inicio": inicio, "agora": now}, 201)
        if self.path == "/api/denuncias":
            if not body.get("id"):
                return self.send_json({"erro": "id obrigatório"}, 400)
            with lock:
                reports = load(REPORTS)
                reports.append({"id": body["id"], "motivo": str(body.get("motivo", ""))[:200], "quando": time.time()})
                save(REPORTS, reports)
            return self.send_json({"ok": True}, 201)
        if self.path == "/api/moderacao/remover":
            if not self.mod_ok():
                return
            now = time.time()
            with lock:
                drawings = load(DRAWINGS)
                d = next((d for d in drawings if d["id"] == body.get("id")), None)
                if not d:
                    return self.send_json({"erro": "desenho não encontrado"}, 404)
                d["removido"] = True
                if d["fim"] > now:
                    d["fim"] = now
                save(DRAWINGS, drawings)
            return self.send_json({"ok": True})
        return self.send_json({"erro": "não encontrado"}, 404)


if __name__ == "__main__":
    os.makedirs(DATA, exist_ok=True)
    port = int(os.environ.get("PORT", "8000"))
    print(f"janelas da FAU em http://localhost:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
