import { PARTS, PC } from '../constants.js';
import { esc, fmtW, fmtN, dkey, n2, e1rm } from '../util.js';
import { V, finished, exById, work, itemVol } from '../state.js';
import { figs } from '../charts.js';

export function vAn() {
  const fin = finished().slice().reverse();
  const cnt = {}; fin.forEach(w => w.items.forEach(it => { if (work(it).length) cnt[it.ex] = (cnt[it.ex] || 0) + 1; }));
  const exs = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
  if (!exs.length) return `<div class="top"><div><h1>분석</h1><p class="sub">기록이 쌓이면 1RM과 볼륨 변화를 보여드려요</p></div></div><div class="card"><p class="empty">완료한 운동이 아직 없어요.</p></div>`;
  if (!V.anEx || !cnt[V.anEx]) V.anEx = exs[0];
  const anEx = V.anEx;
  const ex = exById(anEx); const bw = ex.eq === 'bw';
  const ses = fin.map(w => {
    const it = w.items.find(i => i.ex === anEx); if (!it) return null; const ws = work(it); if (!ws.length) return null;
    return {d: w.date, e: Math.max(...ws.map(s => e1rm(s.w, s.r))), top: Math.max(...ws.map(s => n2(s.w))), reps: Math.max(...ws.map(s => n2(s.r))), v: itemVol(it)};
  }).filter(Boolean).slice(-24);
  const metric = bw && !ses.some(s => s.top > 0) ? 'reps' : 'e';
  figs.set('f1', {kind: 'line', pts: ses.map(s => [s.d, metric === 'e' ? s.e : s.reps]), unit: metric === 'e' ? 'kg' : '회'});
  figs.set('f2', {kind: 'bar', pts: ses.map(s => [s.d, s.v]), unit: 'kg'});
  const best = ses.reduce((b, s) => s.e > b.e ? s : b, ses[0]);
  const since = dkey(new Date(Date.now() - 6 * 864e5));
  const ps = {}; PARTS.forEach(p => ps[p] = 0);
  finished().filter(w => w.date >= since).forEach(w => w.items.forEach(it => { const p = exById(it.ex).part; if (p in ps) ps[p] += work(it).length; }));
  const mx = Math.max(1, ...Object.values(ps));
  const prs = exs.map(id => { let b = {e: 0}; fin.forEach(w => w.items.filter(i => i.ex === id).forEach(it => work(it).forEach(s => { const e = e1rm(s.w, s.r); if (e > b.e) b = {e, w: s.w, r: s.r, d: w.date}; }))); return {id, ...b}; }).filter(p => p.e > 0).sort((a, b) => b.e - a.e).slice(0, 8);
  const last = ses[ses.length - 1], prev = ses[ses.length - 2];
  return `<div class="top"><div><h1>분석</h1><p class="sub">추정 1RM = 무게 × (1 + 횟수 ÷ 30), 웜업 제외</p></div></div>
  <select class="selx" id="anSel" aria-label="운동 선택">${exs.map(id => `<option value="${esc(id)}"${id === anEx ? ' selected' : ''}>${esc(exById(id).name)} (${cnt[id]}회)</option>`).join('')}</select>
  <div class="kpis"><div class="kpi"><small>${metric === 'e' ? '최고 추정 1RM' : '최고 횟수'}</small><b>${metric === 'e' ? fmtW(Math.round(best.e * 10) / 10) + 'kg' : Math.max(...ses.map(s => s.reps)) + '회'}</b><small>${esc(best.d)}</small></div>
  <div class="kpi"><small>최고 무게</small><b>${fmtW(Math.max(...ses.map(s => s.top)))}kg</b><small>${ses.length}회 기록</small></div>
  <div class="kpi"><small>최근 볼륨</small><b>${fmtN(last.v)}</b><small>kg · ${esc(last.d)}</small></div>
  <div class="kpi"><small>직전 대비 1RM</small><b>${prev ? ((last.e - prev.e) >= 0 ? '+' : '') + fmtW(Math.round((last.e - prev.e) * 10) / 10) : '—'}</b><small>kg</small></div></div>
  <div class="card"><h3>${metric === 'e' ? '추정 1RM 추이' : '최고 횟수 추이'}</h3><div class="fig"><svg data-f="f1"></svg></div></div>
  <div class="card"><h3>세션별 볼륨</h3><div class="fig" style="min-height:180px"><svg data-f="f2"></svg></div></div>
  <h2>최근 7일 부위별 세트</h2><div class="card">${PARTS.map(p => `<div class="bar"><span>${p}</span><span class="tr"><i style="width:${ps[p] / mx * 100}%;background:${PC[p]}"></i></span><b>${ps[p]}</b></div>`).join('')}</div>
  <h2>종목별 최고 기록</h2><div class="card"><table>${prs.map(p => `<tr><td>${esc(exById(p.id).name)}<br><span class="tag">${esc(fmtW(p.w))}kg × ${esc(p.r)} · ${esc(p.d)}</span></td><td class="n">${fmtW(Math.round(p.e * 10) / 10)}kg</td></tr>`).join('')}</table></div>`;
}
