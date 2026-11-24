import { PC, EQ } from '../constants.js';
import { esc, fmtW, fmtN, fmtSec, clock, dlabel, dkey, today, isStandalone } from '../util.js';
import { S, V, cur, finished, exById, lastSets, itemVol, wVol, wSets, parts, title, elapsed, avgRest } from '../state.js';
import { R } from '../timer.js';
import { saveTag } from './common.js';
import { backupDue } from '../backup.js';

const PAUSE_ICON = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>';

export function vRec() {
  const w = cur();
  if (!w) return vStart();
  if (w.planned) return V.home ? vStart(w) : vPlan(w);
  const isEdit = !!w.end;
  const cards = w.items.map((it, ii) => exCard(w, it, ii)).join('');
  return `<div class="wbar${w.pausedAt ? ' paused' : ''}"><div class="grow"><div class="tline">${isEdit ? '<div class="t">기록 편집</div>' : `<div class="t" id="elapsed">${clock(elapsed(w))}</div><button class="pbtn" data-act="pause" aria-label="${w.pausedAt ? '다시 시작' : '일시정지'}">${w.pausedAt ? PLAY_ICON : PAUSE_ICON}</button>`}</div><div class="sub">${w.pausedAt ? '일시정지됨 · ' : ''}${esc(isEdit ? dlabel(w.date) : title(w))} · ${wSets(w)}세트 · ${fmtN(wVol(w))}kg</div></div>
  <button class="btn sm" data-act="timer">타이머</button><button class="icon" data-act="wmenu" aria-label="운동 메뉴">⋯</button><button class="btn sm pri" data-act="${isEdit ? 'editDone' : 'finish'}">${isEdit ? '저장' : '완료'}</button></div>
  ${cards || '<p class="empty">아래에서 운동을 추가하세요.</p>'}
  <button class="btn ghost" data-act="addEx">+ 운동 추가</button>`;
}

// 운동 준비 화면: 시작 전에 종목·세트를 정하고 루틴이나 지난 기록을 불러온다
function vPlan(w) {
  const sets = w.items.reduce((a, it) => a + it.sets.length, 0);
  const cards = w.items.map((it, ii) => exCard(w, it, ii)).join('');
  return `<div class="wbar"><button class="icon" data-act="planHome" aria-label="홈으로" style="font-size:26px;color:var(--ink)">‹</button><div class="grow"><div class="t">운동 준비</div><div class="sub">${w.items.length}종목 · ${sets}세트${w.items.length ? ' · ' + esc(title(w)) : ''}</div></div>
  <button class="icon" data-act="wmenu" aria-label="준비 메뉴">⋯</button><button class="btn sm pri" data-act="startPlan">시작</button></div>
  <div class="row" style="margin-bottom:12px"><button class="btn" style="flex:1" data-act="planLoad">루틴·지난 기록 불러오기</button></div>
  ${cards || '<div class="card"><p class="empty">오늘 할 운동을 추가하거나, 루틴·지난 기록을 불러오세요. 세트와 무게를 정한 뒤 시작을 누르면 시간이 재기 시작해요.</p></div>'}
  <button class="btn ghost" data-act="addEx">+ 운동 추가</button>
  ${w.items.length ? '<button class="btn pri" style="width:100%;margin-top:12px;min-height:52px;font-size:17px" data-act="startPlan">운동 시작</button>' : ''}`;
}

/** 불러오기 시트: 루틴과 최근 운동 */
export function planLoadSheet() {
  const rts = S.meta.routines.map(r => `<button class="pick" data-act="planLoadRt" data-id="${esc(r.id)}"><span>${esc(r.name)}</span><small>${r.items.length}종목</small></button>`).join('');
  const past = finished().slice(0, 15).map(w => `<button class="pick" data-act="planLoadW" data-id="${esc(w.id)}"><span>${esc(title(w))}</span><em>${esc(dlabel(w.date))}</em><small>${w.items.length}종목 · ${wSets(w)}세트</small></button>`).join('');
  return `<h3>불러오기</h3><p class="hint">고른 운동이 준비 목록에 추가돼요. 무게·횟수는 지난 기록 그대로 채워져요.</p>
  <div class="pgh">루틴</div>${rts || '<p class="empty">저장된 루틴이 없어요.</p>'}
  <div class="pgh">지난 운동</div>${past || '<p class="empty">아직 기록이 없어요.</p>'}
  <div class="row" style="margin-top:14px"><button class="btn" data-act="close">닫기</button></div>`;
}

function exCard(w, it, ii) {
  const ex = exById(it.ex);
  const prev = lastSets(it.ex, w.start || Infinity, w.id) || [];
  let n = 0;
  const rows = it.sets.map((s, si) => {
    const lab = s.t === 'W' ? 'W' : s.t === 'D' ? '↳D' : ++n;
    const p = prev[si];
    return `<div class="swipe"><div class="sg srow t-${esc(s.t)}${s.done ? ' done' : ''}" data-s="${si}">
      <button class="badge" data-act="setMenu" aria-label="세트 메뉴">${lab}</button>
      <button class="prev" data-act="usePrev">${p ? esc(fmtW(p.w)) + '×' + esc(p.r) : '—'}</button>
      <input class="num" data-f="w" inputmode="decimal" placeholder="${p ? esc(fmtW(p.w)) : 'kg'}" value="${esc(fmtW(s.w))}">
      <input class="num" data-f="r" inputmode="numeric" placeholder="${p ? esc(p.r) : '회'}" value="${esc(s.r)}">
      <button class="rpe${s.rpe ? ' on' : ''}" data-act="rpe">${s.rpe ? esc(s.rpe) : 'RPE'}</button>
      <button class="chk" data-act="done" aria-label="세트 완료"><svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></button></div></div>${R.rest && R.rest.set === s ? '<div class="restline now">휴식 중</div>' : s.restS ? '<div class="restline">휴식 ' + fmtSec(s.restS) + '</div>' : ''}`;
  }).join('');
  const ar = avgRest(it);
  return `<article class="card ex${w.planned ? ' planning' : ''}" data-i="${ii}"><header><span class="dot" style="background:${PC[ex.part] || '#999'}"></span><div class="grow"><h3>${esc(ex.name)}</h3><p>${esc(ex.part)} · ${EQ[ex.eq] || ''} · 휴식 ${fmtSec(+it.rest || S.meta.settings.rest)}</p></div><button class="icon" data-act="exMenu" aria-label="운동 메뉴">⋯</button></header>
  <div class="sg shead"><span>세트</span><span>이전</span><span>kg</span><span>회</span><span>강도</span><span></span></div>${rows}
  <footer><button class="btn sm" data-act="addSet">+ 세트</button><button class="btn sm" data-act="addDrop">+ 드롭</button><span class="vol">${ar ? '평균 휴식 ' + fmtSec(ar) + ' · ' : ''}${fmtN(itemVol(it))}kg</span></footer></article>`;
}

function notices() {
  let h = '';
  if (!isStandalone() && matchMedia('(pointer:coarse)').matches) {
    h += `<div class="notice"><div class="grow"><b>홈 화면에 추가해서 쓰세요</b>Safari 공유 버튼 → ‘홈 화면에 추가’. 브라우저 탭에서만 쓰면 7일 미사용 시 기록이 지워질 수 있어요.</div></div>`;
  }
  const due = backupDue();
  if (due) {
    h += `<div class="notice"><div class="grow"><b>${due.never ? '아직 백업한 적이 없어요' : '백업한 지 ' + due.days + '일 지났어요'}</b>iCloud Drive에 백업 파일을 저장해 두세요.</div><button class="btn sm pri" data-act="exportFile">백업</button></div>`;
  }
  return h;
}

function vStart(plan) {
  const now = new Date(); const wk = new Date(now); wk.setDate(now.getDate() - ((now.getDay() + 6) % 7)); const wkKey = dkey(wk);
  const thisWeek = finished().filter(w => w.date >= wkKey);
  const rts = S.meta.routines.map(r => `<div class="list-item"><div class="grow"><h3>${esc(r.name)}</h3><p>${esc(r.items.map(i => exById(i.ex).name).join(' · ') || '운동 없음')}</p></div><button class="btn sm pri" data-act="startRt" data-id="${esc(r.id)}">시작</button></div>`).join('');
  const past = finished().slice(0, 8).map(w => `<div class="list-item"><span class="dot" style="background:${PC[parts(w)[0]] || '#999'}"></span><div class="grow"><h3>${esc(title(w))}</h3><p>${esc(dlabel(w.date))} · ${w.items.length}종목 · ${wSets(w)}세트</p></div><button class="btn sm" data-act="again" data-id="${esc(w.id)}">불러오기</button></div>`).join('');
  return `<div class="top"><div><h1>오늘 운동</h1><p class="sub">LETS FIT · ${esc(dlabel(today()))}</p></div>${saveTag()}</div>
  ${notices()}
  ${plan ? `<div class="notice"><div class="grow"><b>준비 중인 운동이 있어요</b>${plan.items.length}종목 · ${plan.items.reduce((a, it) => a + it.sets.length, 0)}세트${plan.items.length ? ' · ' + esc(title(plan)) : ''}</div><button class="btn sm pri" data-act="planResume">이어서</button></div>` : ''}
  <section class="hero"><div class="stats"><div><b>${thisWeek.length}</b><small>이번 주 운동</small></div><div><b>${thisWeek.reduce((a, w) => a + wSets(w), 0)}</b><small>세트</small></div><div><b>${fmtN(thisWeek.reduce((a, w) => a + wVol(w), 0) / 1000)}t</b><small>볼륨</small></div></div>
  <button class="btn" data-act="newEmpty">운동 시작</button></section>
  <h2>루틴으로 시작</h2><div class="card">${rts || '<p class="empty">저장된 루틴이 없어요. 루틴 탭에서 만들거나, 운동을 마칠 때 루틴으로 저장할 수 있어요.</p>'}</div>
  <h2>지난 운동 불러오기</h2><div class="card">${past || '<p class="empty">아직 기록이 없어요.</p>'}</div>`;
}
