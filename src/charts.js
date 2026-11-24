import { esc } from './util.js';

export const figs = new Map();
let figRO = null;

export function observeFigs() {
  if (figRO) figRO.disconnect();
  figRO = new ResizeObserver(es => es.forEach(e => drawFig(e.target)));
  document.querySelectorAll('.fig>svg').forEach(s => figRO.observe(s));
}

export function drawFig(s) {
  const f = figs.get(s.dataset.f); if (!f) return;
  const W = s.clientWidth, H = s.clientHeight; if (!W || !H) return;
  const pts = f.pts; const L = 40, R = 10, T = 28, B = 24;
  const vals = pts.map(p => p[1]);
  let lo = f.kind === 'bar' ? 0 : Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
  const span = hi - lo; if (f.kind !== 'bar') { lo -= span * .15; hi += span * .1; } else hi *= 1.1;
  const x = i => pts.length === 1 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (pts.length - 1);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let g = '';
  for (let k = 0; k <= 3; k++) { const v = lo + (hi - lo) * k / 3; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--mute)">${v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)}</text>`; }
  const lab = d => { const [, m, dd] = d.split('-'); return +m + '/' + +dd; };
  const idx = pts.length > 1 ? [0, pts.length - 1] : [0];
  g += idx.map(i => `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 && pts.length > 1 ? 'start' : i ? 'end' : 'middle'}" font-size="11" fill="var(--mute)">${esc(lab(pts[i][0]))}</text>`).join('');
  if (f.kind === 'bar') {
    const bw = Math.max(3, Math.min(22, (W - L - R) / pts.length * .6));
    g += pts.map((p, i) => `<rect x="${x(i) - bw / 2}" y="${y(p[1])}" width="${bw}" height="${Math.max(0, y(lo) - y(p[1]))}" rx="3" fill="${i === pts.length - 1 ? 'var(--acc)' : 'var(--mute)'}" opacity="${i === pts.length - 1 ? 1 : .45}"/>`).join('');
  } else {
    const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(p[1])).join('');
    g += `<path d="${d}" fill="none" stroke="var(--acc)" stroke-width="2.5" stroke-linejoin="round"/>` + pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[1])}" r="${i === pts.length - 1 ? 5 : 3}" fill="${i === pts.length - 1 ? 'var(--acc)' : 'var(--card)'}" stroke="var(--acc)" stroke-width="2"/>`).join('');
    const lp = pts[pts.length - 1]; const tx = Math.min(x(pts.length - 1), W - R);
    g += `<text x="${tx}" y="${y(lp[1]) - 10}" text-anchor="end" font-size="14" font-weight="700" fill="var(--ink)">${Math.round(lp[1] * 10) / 10}${f.unit}</text>`;
  }
  s.innerHTML = g;
}
