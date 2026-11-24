import { PC, LV } from '../constants.js';
import { esc, fmtW, fmtN, fmtSec, clock, dlabel, dkey, today, pad, e1rm } from '../util.js';
import { V, live, finished, exById, work, wVol, wSets, parts, title, elapsed, avgRest } from '../state.js';

export function vCal() {
  const y = V.calM.getFullYear(), m = V.calM.getMonth();
  const byDay = {}; live().filter(w => w.end).forEach(w => (byDay[w.date] = byDay[w.date] || []).push(w));
  const first = new Date(y, m, 1); const start = new Date(y, m, 1 - first.getDay());
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const k = dkey(d);
    if (i >= 35 && d.getMonth() !== m) break;
    const ws = byDay[k] || []; const ps = [...new Set(ws.flatMap(parts))];
    cells += `<button class="day${d.getMonth() !== m ? ' out' : ''}${k === today() ? ' today' : ''}${k === V.calSel ? ' sel' : ''}${ws.length ? ' has' : ''}" data-act="pickDay" data-k="${k}">${d.getDate()}<span class="dots">${ps.slice(0, 4).map(p => `<i style="background:${PC[p] || '#999'}"></i>`).join('')}</span></button>`;
  }
  const mk = y + '-' + pad(m + 1);
  const mw = finished().filter(w => w.date.startsWith(mk));
  const days = new Set(mw.map(w => w.date)).size;
  const sel = (byDay[V.calSel] || []).sort((a, b) => a.start - b.start).map(w => `<div class="card"><div class="row" style="justify-content:space-between"><div style="flex:1"><h3>${esc(title(w))}</h3><p class="sub">${new Date(w.start).getHours()}:${pad(new Date(w.start).getMinutes())} · ${clock(elapsed(w))} · ${wSets(w)}세트 · ${fmtN(wVol(w))}kg${LV[w.intensity - 1] ? ' · 강도 ' + esc(LV[w.intensity - 1][0]) : ''}</p></div></div>
   <table>${w.items.map(it => { const ws = work(it); const best = ws.reduce((b, s) => e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b, ws[0] || {}); const dr = it.sets.filter(s => s.t === 'D').length; return `<tr><td>${esc(exById(it.ex).name)}${dr ? ' <span class="tag">드롭 ' + dr + '</span>' : ''}${avgRest(it) ? '<br><span class="tag">평균 휴식 ' + fmtSec(avgRest(it)) + '</span>' : ''}</td><td class="n">${ws.length}세트 · ${best.w != null ? esc(fmtW(best.w)) + '×' + esc(best.r) : '-'}</td></tr>`; }).join('')}</table>
   ${w.note ? `<p class="sub">${esc(w.note)}</p>` : ''}
   <div class="row" style="margin-top:10px"><button class="btn sm pri" data-act="again" data-id="${esc(w.id)}">다시 하기</button><button class="btn sm" data-act="editW" data-id="${esc(w.id)}">편집</button><button class="btn sm danger" data-act="delW" data-id="${esc(w.id)}">삭제</button></div></div>`).join('');
  return `<div class="top"><div><h1>${y}년 ${m + 1}월</h1><p class="sub">${days}일 운동 · ${mw.reduce((a, w) => a + wSets(w), 0)}세트 · ${fmtN(mw.reduce((a, w) => a + wVol(w), 0))}kg</p></div><div class="row"><button class="icon" data-act="mon" data-d="-1" aria-label="이전 달">‹</button><button class="icon" data-act="mon" data-d="1" aria-label="다음 달">›</button></div></div>
  <div class="card"><div class="cal">${'일월화수목금토'.split('').map(d => `<span class="dow">${d}</span>`).join('')}${cells}</div></div>
  <h2>${esc(dlabel(V.calSel))}</h2>${sel || '<p class="empty">이 날은 기록이 없어요.</p>'}`;
}
