// Motor de desenho: traços vetoriais redesenhados em 3 quadros com tremor, como no WigglyPaint.
const CW = 1600, CH = 681, FRAMES = 3, FRAME_MS = 110;

function hash(a, b, c) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 1, 0x165667b1) ^ Math.imul((c | 0) + 7, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function wiggled(s, frame, amp) {
  return s.pts.map(([x, y], i) => [
    x + (hash(s.seed, i, frame) - 0.5) * 2 * amp,
    y + (hash(s.seed, i, frame + 50) - 0.5) * 2 * amp,
  ]);
}

function smoothPath(ctx, p) {
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  if (p.length < 3) { p.slice(1).forEach(([x, y]) => ctx.lineTo(x, y)); return; }
  for (let i = 1; i < p.length - 1; i++) {
    ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  }
  const l = p[p.length - 1];
  ctx.lineTo(l[0], l[1]);
}

function line(ctx, p, w) {
  if (p.length === 1) {
    ctx.beginPath(); ctx.arc(p[0][0], p[0][1], w / 2, 0, Math.PI * 2); ctx.fill(); return;
  }
  ctx.lineWidth = w; smoothPath(ctx, p); ctx.stroke();
}

function starShape(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function starStamps(pts, gap) {
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc >= gap) { out.push(pts[i]); acc = 0; }
  }
  return out;
}

function drawStroke(ctx, s, frame, amp) {
  const p = wiggled(s, frame, amp), w = s.size;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle = s.color;
  if (s.brush === 'borracha') ctx.globalCompositeOperation = 'destination-out';
  switch (s.brush) {
    case 'lapis': line(ctx, p, Math.max(2, w * 0.45)); break;
    case 'giz':
      ctx.globalAlpha = 0.8; line(ctx, p, w * 0.8);
      ctx.globalAlpha = 0.55;
      line(ctx, p.map(([x, y]) => [x + w * 0.3, y - w * 0.25]), w * 0.3);
      line(ctx, p.map(([x, y]) => [x - w * 0.3, y + w * 0.3]), w * 0.25);
      break;
    case 'spray': {
      const r = w * 1.4, dot = Math.max(1.2, w * 0.09);
      p.forEach(([x, y], i) => {
        for (let k = 0; k < 7; k++) {
          const a = hash(s.seed, i, 100 + k) * Math.PI * 2, d = Math.sqrt(hash(s.seed, i, 200 + k)) * r;
          ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, dot, dot);
        }
      });
      break;
    }
    case 'estrela': {
      ctx.lineWidth = 2; ctx.strokeStyle = '#141414';
      starStamps(p, w * 2.2).forEach(([x, y], i) => starShape(ctx, x, y, w * 0.9, hash(s.seed, i, 300) + frame * 0.08));
      break;
    }
    default: line(ctx, p, w);
  }
  ctx.restore();
}

// Desenha os traços em `layer` e copia para `target` com a opacidade da umidade.
function renderDrawing(target, layer, strokes, frame, amp, opacity) {
  const lc = layer.getContext('2d'), tc = target.getContext('2d');
  const k = layer.width / CW;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, layer.width, layer.height);
  lc.setTransform(k, 0, 0, k, 0, 0);
  strokes.forEach((s) => drawStroke(lc, s, frame, amp));
  tc.clearRect(0, 0, target.width, target.height);
  tc.globalAlpha = opacity;
  tc.drawImage(layer, 0, 0, target.width, target.height);
  tc.globalAlpha = 1;
}

function makeLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
