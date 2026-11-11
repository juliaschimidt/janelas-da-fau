const $ = (id) => document.getElementById(id);
const stage = $('stage');

// computador: a tela inteira (1440×900) é escalada pra caber.
// celular deitado: layout próprio que ocupa a tela toda, e a janela cresce até onde couber.
const celular = matchMedia('(orientation: landscape) and (max-height: 560px)');
function fit() {
  const m = celular.matches, W = $('W'), cell = $('Wcell');
  document.body.classList.toggle('m', m);
  if (!m) {
    W.style.width = '1202px';
    stage.style.transform = `translate(-50%,-50%) scale(${Math.min(innerWidth / 1440, innerHeight / 900)})`;
    return;
  }
  stage.style.transform = 'none';
  const cs = getComputedStyle(W), v = (n) => parseFloat(cs.getPropertyValue(n)) || 0;
  const bw = v('--bw'), fw = v('--fw'), extraH = 2 * bw + v('--banh') + fw + v('--sill') + bw;
  const w = Math.min(cell.clientWidth - 2 * v('--ov'), (cell.clientHeight - extraH) * 2.35 + 2 * (bw + fw));
  W.style.width = `${Math.max(120, Math.floor(w))}px`;
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 300));
if (celular.addEventListener) celular.addEventListener('change', fit); else celular.addListener(fit);
fit();

document.querySelectorAll('[data-i]').forEach((el) => { el.innerHTML = I[el.dataset.i]; });
$('ck').innerHTML = I.clock(20);
$('fl').innerHTML = I.flag(15);

// ---------- janela + canvas
$('W').innerHTML = win('dd', 22);
$('dd').innerHTML = `<canvas id="cv" width="${CW}" height="${CH}"></canvas>`;
$('W').querySelector('.glass').insertAdjacentHTML('beforeend', '<div class="hint" id="hint">desenhe o que você veria por aqui ✎</div>');
const cv = $('cv'), layer = makeLayer(CW, CH);

const st = {
  brush: 'pincel', eraser: false, size: 2, color: 0,
  strokes: [], live: null,
  clima: { temperatura: null, vento: null, umidade: null, fonte: 'indisponivel' },
  agora: null, offset: 0, frame: 0, dirty: true,
};
const amp = () => amplitudePara(st.clima);
const opac = () => opacidadePara(st.clima);
const cores = () => paletaPara(st.clima.temperatura).cores;

// ---------- ferramentas
function renderTools() {
  $('brushes').innerHTML = BR.map(([k, n]) =>
    `<button class="brush ${k === st.brush && !st.eraser ? 'on' : ''}" data-b="${k}">${I[k]}${n}</button>`).join('');
  $('dots').innerHTML = CONFIG.espessuras.map((s, i) =>
    `<button class="dotwrap ${i === st.size ? 'on' : ''}" data-s="${i}" title="espessura ${i + 1}"><div class="dot" style="width:${4 + i * 4.5}px;height:${4 + i * 4.5}px"></div></button>`).join('');
  const shapes = ['46% 54% 40% 60%/55% 45% 55% 45%', '58% 42% 55% 45%/45% 60% 40% 55%', '40% 60% 48% 52%/60% 40% 60% 40%'];
  $('blobs').innerHTML = cores().map((c, i) =>
    `<button class="blob ${i === st.color ? 'on' : ''}" data-c="${i}" title="cor ${i + 1}" style="background:${c};border-radius:${shapes[i]}"></button>`).join('');
  $('bBorr').classList.toggle('on', st.eraser);
  st.dirty = true;
}
$('brushes').onclick = (e) => { const b = e.target.closest('[data-b]'); if (b) { st.brush = b.dataset.b; st.eraser = false; renderTools(); } };
$('dots').onclick = (e) => { const b = e.target.closest('[data-s]'); if (b) { st.size = +b.dataset.s; renderTools(); } };
$('blobs').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { st.color = +b.dataset.c; st.eraser = false; renderTools(); } };
$('bBorr').onclick = () => { st.eraser = !st.eraser; renderTools(); };
$('bUndo').onclick = undo;
addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && $('ov').hidden) { e.preventDefault(); undo(); }
});
function undo() { st.strokes.pop(); afterEdit(); }
function afterEdit() {
  $('hint').hidden = st.strokes.length > 0;
  st.dirty = true;
}

// ---------- desenho com o mouse/caneta
function toCanvas(e) {
  const r = cv.getBoundingClientRect();
  return [Math.round(((e.clientX - r.left) / r.width) * CW), Math.round(((e.clientY - r.top) / r.height) * CH)];
}
cv.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  cv.setPointerCapture(e.pointerId);
  st.live = {
    brush: st.eraser ? 'borracha' : st.brush,
    color: cores()[st.color],
    size: CONFIG.espessuras[st.size] * (st.eraser ? 1.6 : 1),
    seed: (Math.random() * 1e9) | 0,
    pts: [toCanvas(e)],
  };
  st.strokes.push(st.live);
  afterEdit();
});
cv.addEventListener('pointermove', (e) => {
  if (!st.live) return;
  const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  const evs = co.length ? co : [e];
  for (const ev of evs) {
    const p = toCanvas(ev), l = st.live.pts[st.live.pts.length - 1];
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 4) st.live.pts.push(p);
  }
  st.dirty = true;
});
const endStroke = () => { st.live = null; };
cv.addEventListener('pointerup', endStroke);
cv.addEventListener('pointercancel', endStroke);

// ---------- prévia do traço
const prev = $('prev'), prevLayer = makeLayer(300, 110);
function renderPreview() {
  const k = CW / 300;
  const pts = Array.from({ length: 24 }, (_, i) => [(20 + i * 11) * k, (55 + Math.sin(i / 3.2) * 26) * k]);
  const s = { brush: st.eraser ? 'lapis' : st.brush, color: st.eraser ? '#f2ecdf' : cores()[st.color], size: CONFIG.espessuras[st.size] * k * 0.5, seed: 7, pts };
  renderDrawing(prev, prevLayer, [s], st.frame, amp() * k * 0.5, st.eraser ? 1 : opac());
}

// ---------- animação (3 quadros de tremor)
const thumb = $('thumb'), thumbLayer = makeLayer(320, 136);
let lastFrame = 0;
function loop(t) {
  if (t - lastFrame >= FRAME_MS) { st.frame = (st.frame + 1) % FRAMES; lastFrame = t; st.dirty = true; }
  if (st.dirty) {
    renderDrawing(cv, layer, st.strokes, st.frame, amp(), opac());
    renderPreview();
    const d = st.agora && st.agora.desenho;
    if (d) renderDrawing(thumb, thumbLayer, d.tracos, st.frame, amplitudePara(d.clima), opacidadePara(d.clima));
    else thumb.getContext('2d').clearRect(0, 0, thumb.width, thumb.height);
    st.dirty = false;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- clima
function renderClima() {
  const c = st.clima, pal = paletaPara(c.temperatura), v = ventoPara(c.vento);
  const n = (x) => (x == null ? '--' : Math.round(x));
  $('tv').textContent = n(c.temperatura);
  $('vv').textContent = n(c.vento);
  $('uv').textContent = n(c.umidade);
  $('ut').textContent = n(c.umidade);
  $('sw').innerHTML = pal.cores.map((x) => `<span class="sw" style="width:16px;height:16px;background:${x}"></span>`).join('');
  $('vt').innerHTML = v.texto.replace('balança ', 'traço balança<br>').replace('quase parado', 'traço quase<br>parado').replace('sem dados', 'sem dados<br>do vento');
  $('lv').innerHTML = I.lv(v.nivel, 26);
  $('us').style.background = hexA(pal.cores[0], opac());
  $('pr').textContent = pal.rotulo;
  $('fonte').textContent = !temDados(c) ? '● sem dados' : c.medido ? `● medido às ${c.medido.slice(11, 16)}` : '● ao vivo';
  renderTools();
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
async function fetchClima() {
  const r = await fetch('/api/clima');
  if (!r.ok) throw new Error();
  return r.json();
}
async function loadClima() {
  try {
    {
      const c = await fetchClima(), mudouPaleta = paletaPara(c.temperatura) !== paletaPara(st.clima.temperatura);
      st.clima = c;
      if (mudouPaleta) {
        st.color = Math.min(st.color, 2);
      }
    }
  } catch (_) {
    if (!st.clima.medido) st.clima = { temperatura: null, vento: null, umidade: null, fonte: 'indisponivel' };
  }
  renderClima();
}
function tickClock() {
  const d = new Date();
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  $('dt').textContent = `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ---------- agora na parede
async function loadAgora() {
  try {
    const r = await fetch('/api/agora');
    if (!r.ok) return;
    st.agora = await r.json();
    st.offset = st.agora.agora * 1000 - Date.now();
    st.dirty = true;
    tickTimer();
  } catch (_) { /* tenta de novo no próximo ciclo */ }
}
function tickTimer() {
  const d = st.agora && st.agora.desenho;
  const reported = d && denunciados().includes(d.id);
  $('bRep').disabled = !d || reported;
  $('bRep').lastChild.textContent = reported ? 'denunciado' : 'denunciar';
  $('fila').textContent = d ? `nº ${d.numero}` : '';
  if (!d) { $('tmv').textContent = '--:--'; $('tml').innerHTML = 'janela<br>vazia'; $('pg').style.width = '0'; return; }
  const now = (Date.now() + st.offset) / 1000, rest = Math.max(0, d.fim - now);
  if (rest <= 0) { st.agora.desenho = null; st.dirty = true; tickTimer(); loadAgora(); return; }
  $('tmv').textContent = `${String(Math.floor(rest / 60)).padStart(2, '0')}:${String(Math.floor(rest % 60)).padStart(2, '0')}`;
  $('tml').innerHTML = 'até<br>sair';
  $('pg').style.width = `${(100 * (1 - rest / (d.fim - d.inicio))).toFixed(1)}%`;
}
const denunciados = () => JSON.parse(localStorage.getItem('denunciados') || '[]');

// ---------- modais
function modal({ titulo, corpo, ok = 'confirmar', cancelar = 'cancelar', tipo = 'ok', onOpen, validar }) {
  return new Promise((resolve) => {
    $('mt').textContent = titulo;
    $('mb').innerHTML = corpo;
    $('mOk').textContent = ok;
    $('mOk').className = `mbtn ${tipo}`;
    $('mNo').textContent = cancelar;
    $('mNo').hidden = !cancelar;
    $('ov').hidden = false;
    if (onOpen) onOpen($('mb'));
    const check = () => { $('mOk').disabled = validar ? !validar($('mb')) : false; };
    $('mb').oninput = check; check();
    const close = (v) => {
      $('ov').hidden = true; $('mOk').onclick = $('mNo').onclick = $('ov').onclick = null; removeEventListener('keydown', key);
      resolve(v ? $('mb') : null);
    };
    const key = (e) => { if (e.key === 'Escape') close(false); };
    addEventListener('keydown', key);
    $('mOk').onclick = () => close(true);
    $('mNo').onclick = () => close(false);
    $('ov').onclick = (e) => { if (e.target === $('ov')) close(false); };
    $('mOk').focus();
  });
}
let toastT;
function toast(msg) {
  $('toast').textContent = msg; $('toast').hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; }, 3000);
}
const temTraco = () => st.strokes.some((s) => s.brush !== 'borracha');

$('bLixo').onclick = async () => {
  if (!st.strokes.length) return toast('a janela já está vazia');
  const ok = await modal({
    titulo: 'APAGAR O DESENHO?',
    corpo: 'Tudo o que você desenhou nesta janela vai sumir, e não dá pra desfazer.',
    ok: 'apagar tudo', cancelar: 'voltar', tipo: 'danger',
  });
  if (ok) { st.strokes = []; afterEdit(); }
};

$('bSend').onclick = async () => {
  if (!temTraco()) return toast('desenhe alguma coisa antes de enviar ✎');
  const ok = await modal({
    titulo: 'ENVIAR PRA JANELA?',
    corpo: `<canvas id="mprev" width="800" height="340"></canvas>Seu desenho entra na parede na hora, no lugar do que está lá agora, e fica até 20 min (ou até alguém mandar outro). Depois de enviado, não dá pra editar.`,
    ok: 'enviar', cancelar: 'continuar desenhando',
    onOpen: () => renderDrawing($('mprev'), makeLayer(800, 340), st.strokes, 0, 0, opac()),
  });
  if (!ok) return;
  $('bSend').disabled = true;
  try {
    const r = await fetch('/api/desenhos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracos: st.strokes, clima: st.clima }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
    const res = await r.json();
    st.strokes = []; afterEdit();
    await loadAgora();
    await modal({
      titulo: 'ENVIADO! ✦',
      corpo: `Seu desenho é o <b>nº ${res.numero}</b>. Ele já está na janela agora!<div class="note">olhe para a parede</div>`,
      ok: 'desenhar outro', cancelar: '',
    });
  } catch (e) {
    console.error('envio falhou', e);
    toast('não deu pra enviar agora, tenta de novo');
  } finally {
    $('bSend').disabled = false;
  }
};

$('bRep').onclick = async () => {
  const d = st.agora && st.agora.desenho;
  if (!d) return;
  const motivos = ['conteúdo ofensivo ou discurso de ódio', 'conteúdo sexual', 'dados pessoais ou assédio', 'outro motivo'];
  const mb = await modal({
    titulo: 'DENUNCIAR ESTE DESENHO?',
    corpo: `O desenho <b>nº ${d.numero}</b>, que está na parede agora, vai ser revisado pela equipe. Por que você quer denunciar?` +
      motivos.map((m) => `<label><input type="radio" name="mot" value="${m}">${m}</label>`).join(''),
    ok: 'denunciar', cancelar: 'cancelar', tipo: 'danger',
    validar: (b) => !!b.querySelector('input:checked'),
  });
  if (!mb) return;
  try {
    const r = await fetch('/api/denuncias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id, motivo: mb.querySelector('input:checked').value }),
    });
    if (!r.ok) throw new Error();
    localStorage.setItem('denunciados', JSON.stringify([...denunciados(), d.id]));
    tickTimer();
    toast('denúncia enviada, obrigado por avisar');
  } catch (_) {
    toast('não deu pra enviar a denúncia, tenta de novo');
  }
};

$('sobre').onclick = () => modal({
  titulo: 'COMO FUNCIONA',
  corpo: 'Desenhe o que você veria por esta janela e envie. Cada desenho fica até <b>20 min</b> projetado na parede da rampa, ou até alguém mandar um novo.<br><br>O clima de agora na Cidade Universitária muda o seu traço: a <b>temperatura</b> escolhe as 3 cores, o <b>vento</b> faz o traço balançar e a <b>umidade</b> deixa o traço transparente (quanto mais úmido, mais transparente).',
  ok: 'bora desenhar', cancelar: '',
});

renderClima(); tickClock(); afterEdit();
loadClima(); loadAgora();
setInterval(loadClima, 5 * 60 * 1000);
setInterval(loadAgora, 15 * 1000);
setInterval(tickClock, 15 * 1000);
setInterval(tickTimer, 1000);

// aberto com dois cliques no index.html: sem servidor, nada de clima nem envio
if (location.protocol === 'file:') modal({
  titulo: 'ABRA PELO SERVIDOR',
  corpo: 'Esta página foi aberta direto do arquivo, então não consegue buscar o clima nem enviar desenhos.<br><br>Abra pelo link do site publicado (o mesmo do QR code).',
  ok: 'entendi', cancelar: '',
});
