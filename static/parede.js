// Tela da projeção: mostra o desenho que está "na parede" agora, um por vez.
const $ = (id) => document.getElementById(id);
const POLL_MS = 2000;

function fit() {
  const k = Math.min(innerWidth / 1920, innerHeight / 1080);
  $('stage').style.transform = `translate(-50%,-50%) scale(${k})`;
}
addEventListener('resize', fit); fit();

document.querySelectorAll('[data-i]').forEach((el) => { el.innerHTML = I[el.dataset.i]; });
$('W').innerHTML = win('dd', 22);
$('dd').innerHTML = `<canvas id="cv" width="${CW}" height="${CH}"></canvas>`;
$('W').querySelector('.glass').insertAdjacentHTML('beforeend',
  `<div class="tmr" id="tmr" hidden>${I.clock(24)}<span><b id="tmv">--:--</b> <span id="tml">restantes</span></span><span class="prog"><i id="pg"></i></span><span class="n" id="num"></span></div>
   <div class="vazio" id="vazio">a janela está esperando um desenho<small>escaneie o QR code e desenhe o que você veria por aqui</small></div>`);

// o QR code vem de uma biblioteca externa; se ela não carregar, a parede continua funcionando
try {
  const qr = qrcode(0, 'M');
  qr.addData(location.origin + '/');
  qr.make();
  $('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
} catch (_) { $('qr').textContent = location.host; }

const st = { desenho: null, offset: 0, clima: null, frame: 0 };
const cv = $('cv'), layer = makeLayer(CW, CH);
const pad = (n) => String(Math.floor(n)).padStart(2, '0');

function renderClima() {
  const c = (st.desenho && st.desenho.clima) || st.clima || {};
  const n = (x) => (x == null ? '--' : Math.round(x));
  const pal = paletaPara(c.temperatura), v = ventoPara(c.vento);
  $('tv').textContent = n(c.temperatura);
  $('vv').textContent = n(c.vento);
  $('uv').textContent = n(c.umidade);
  $('sw').innerHTML = pal.cores.map((x) => `<span class="sw" style="background:${x}"></span>`).join('');
  $('lv').innerHTML = I.lv(v.nivel, 24);
  $('vt').textContent = v.nivel < 0 ? '→ sem dados do vento' : `→ traço ${v.texto}`;
  $('ut').textContent = c.umidade == null ? '→ sem dados' : `→ ${n(c.umidade)}% transparente`;
  const hex = parseInt(pal.cores[0].slice(1), 16);
  $('us').style.background = `rgba(${hex >> 16},${(hex >> 8) & 255},${hex & 255},${opacidadePara(c)})`;
  $('fonte').textContent = temDados(c) ? '● ao vivo' : '● sem dados do clima';
}

function tick() {
  const now = (Date.now() + st.offset) / 1000;
  const t = new Date(now * 1000);
  $('hora').textContent = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  const d = st.desenho;
  $('tmr').hidden = !d;
  $('vazio').hidden = !!d;
  if (!d) return;
  const rest = d.fim - now;
  // passaram os 20 min: a janela esvazia
  if (rest <= 0) { st.desenho = null; tick(); return; }
  $('num').textContent = `nº ${d.numero}`;
  $('tmv').textContent = `${pad(rest / 60)}:${pad(rest % 60)}`;
  $('pg').style.width = `${(100 * (1 - rest / (d.fim - d.inicio))).toFixed(1)}%`;
}

async function poll() {
  try {
    const atual = st.desenho ? st.desenho.id : '';
    const r = await fetch(`/api/agora?tenho=${encodeURIComponent(atual)}`, { cache: 'no-store' });
    const a = await r.json();
    st.offset = a.agora * 1000 - Date.now();
    const novo = a.desenho;
    if (!novo) st.desenho = null;
    else if (!st.desenho || novo.id !== st.desenho.id) {
      cv.classList.add('out');
      setTimeout(() => { st.desenho = novo; renderClima(); cv.classList.remove('out'); }, st.desenho ? 800 : 0);
    } else Object.assign(st.desenho, { fim: novo.fim, inicio: novo.inicio });
    renderClima();
    tick();
  } catch (_) { /* servidor fora do ar: mantém o último desenho */ }
}

async function pollClima() {
  try { st.clima = await (await fetch('/api/clima')).json(); renderClima(); } catch (_) { /* tenta de novo */ }
}

let last = 0;
function loop(t) {
  if (t - last >= FRAME_MS) {
    last = t;
    st.frame = (st.frame + 1) % FRAMES;
    const d = st.desenho;
    if (d) renderDrawing(cv, layer, d.tracos, st.frame, amplitudePara(d.clima), opacidadePara(d.clima));
    else cv.getContext('2d').clearRect(0, 0, CW, CH);
  }
  requestAnimationFrame(loop);
}

renderClima();
pollClima(); poll();
setInterval(poll, POLL_MS);
setInterval(pollClima, 5 * 60 * 1000);
setInterval(tick, 1000);
requestAnimationFrame(loop);
