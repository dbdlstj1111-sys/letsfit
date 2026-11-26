import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { THEMES, LV, RPES, REST_OPTS } from './constants.js';
import { $, esc, n2, fmtW, fmtSec, fmtN, clock, today, uid } from './util.js';
import * as store from './storage.js';
import { S, V, save, hydrate, mark, touchW, touchMeta, flush, active, cur, exById, lastSets, seedSets, wSets, wVol, title, avgRest, elapsed } from './state.js';
import { R, startRest, stopRest, pauseRest, adjustRest, tick, restoreRest } from './timer.js';
import { observeFigs } from './charts.js';
import { openSheet, closeSheet, ask, takeConfirm, toast, runToastAction } from './ui.js';
import { initSwipe } from './swipe.js';
import { P, openPicker, filterPick, routineEditor } from './sheets.js';
import { shareBackup, copyBackup, importBackup } from './backup.js';
import { paintSave } from './views/common.js';
import { vRec, planLoadSheet } from './views/record.js';
import { vRt } from './views/routines.js';
import { vCal } from './views/calendar.js';
import { vAn } from './views/analysis.js';
import { vSet, storageRows, wakeStatus } from './views/settings.js';
import { initWake, syncWake } from './wake.js';
import { tick321, endBeep } from './sound.js';

/* ---------- 화면 ---------- */
function applyTheme() {
  const t = S.meta.settings.theme || {};
  const th = THEMES.find(x => x[0] === t.acc) || THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--acc', th[2]);
  // 라이트/다크를 고르면 data-theme로 색을 강제하고, 시스템이면 기기 설정(prefers-color-scheme)을 따른다
  if (t.mode === 'light' || t.mode === 'dark') root.dataset.theme = t.mode;
  else delete root.dataset.theme;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', th[2]);
}

const VIEWS = {rec: vRec, rt: vRt, cal: vCal, an: vAn, set: vSet};
function render() {
  applyTheme();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === V.view));
  $('#app').innerHTML = VIEWS[V.view]();
  paintSave();
  observeFigs();
  if (V.view === 'set') refreshStorage();
  syncWake(); // 운동 시작·완료 같은 상태 변화에 맞춰 화면 켜짐 유지 갱신
}
const paintWake = () => { const el = $('#wakeStat'); if (el) el.innerHTML = wakeStatus(); };
save.onChange = paintSave;

async function refreshStorage() {
  V.storage = await store.storageInfo();
  const el = $('#stInfo'); if (el) el.innerHTML = storageRows();
}

/* ---------- 동작 ---------- */
function ctx(el) {
  const w = cur(); const c = el.closest('[data-i]'); const r = el.closest('[data-s]');
  const ii = c ? +c.dataset.i : -1; const si = r ? +r.dataset.s : -1;
  const it = w && ii >= 0 ? w.items[ii] : null;
  return {w, ii, si, it, s: it && si >= 0 ? it.sets[si] : null};
}
let menuCtx = null;
// 운동을 바로 시작하지 않고 준비 화면(planned)에 담는다. 진행 중인 운동이 있으면 거기에 추가.
function toPlan(items) {
  let w = active();
  if (w && !w.planned) { w.items.push(...items); touchW(w); toast('진행 중인 운동에 추가했어요'); }
  else if (w) { w.items.push(...items); touchW(w); }
  else {
    w = {id: uid('w-'), date: today(), start: null, planned: true, end: null, items, intensity: null, note: '', updatedAt: Date.now()};
    S.workouts[w.id] = w; touchW(w);
  }
  V.editId = null; V.home = false; V.view = 'rec'; render(); window.scrollTo(0, 0);
  return w;
}
const routineItems = r => r.items.map(i => ({ex: i.ex, rest: null, sets: seedSets(i.ex, +i.sets || 3, i.r, i.w)}));
const cloneItems = w => w.items.map(it => ({ex: it.ex, rest: it.rest || null, sets: it.sets.map(s => ({t: s.t, w: s.w, r: s.r, rpe: null, done: false}))}));
const isBlank = s => (s.w === '' || s.w == null) && (s.r === '' || s.r == null);
// before 이전 세트 중 무게·횟수가 적힌 가장 가까운 세트 (웜업은 다른 세트가 없을 때만)
const lastFilled = (sets, before) => {
  const prev = sets.slice(0, before).reverse().filter(s => !isBlank(s));
  return prev.find(s => s.t !== 'W') || prev[0] || null;
};
// 세트에 무게·횟수를 적으면 뒤쪽 세트 중 비어 있거나 자동으로 채워진 칸을 같은 값으로 채운다.
// 완료한 세트, 웜업, 드롭 세트, 직접 적은 칸은 건드리지 않는다.
function fillFollowing(input, it, si, f) {
  const src = it.sets[si];
  if (src.t === 'W') return;
  const card = input.closest('.ex');
  for (let j = si + 1; j < it.sets.length; j++) {
    const s = it.sets[j];
    if (s.done || s.t !== 'N') continue;
    const blank = s[f] === '' || s[f] == null;
    if (!blank && !(s.auto && s.auto[f])) continue;
    s[f] = src[f];
    s.auto = Object.assign({}, s.auto, {[f]: src[f] !== ''});
    const el = card && card.querySelector(`.srow[data-s="${j}"] [data-f="${f}"]`);
    if (el) el.value = f === 'w' ? fmtW(src[f]) : src[f];
  }
}
// 세트 삭제 + 6초간 실행 취소
function deleteSet({w, it, si, s}) {
  if (!w || !it || !s) return;
  if (R.rest && R.rest.set === s) stopRest(false);
  it.sets.splice(si, 1); touchW(w); render();
  toast('세트를 삭제했어요', {label: '실행 취소', fn: () => {
    if (!it.sets.includes(s)) { it.sets.splice(Math.min(si, it.sets.length), 0, s); touchW(w); render(); }
  }});
}
initSwipe(row => deleteSet(ctx(row)));
const tombstone = id => { S.workouts[id] = {id, deleted: true, updatedAt: Date.now()}; mark(id); };
function doImport(txt) { const r = importBackup(txt); if (r.ok) render(); toast(r.msg); }

const A = {
  go: el => {
    V.view = el.dataset.v;
    // 준비 중일 때 하단 '기록'을 누르면 홈(시작 화면)으로. 준비 목록은 남아 있고 홈에서 '이어서'로 돌아간다.
    if (V.view === 'rec' && !V.editId) { const a = active(); if (a && a.planned) V.home = true; }
    closeSheet(); render(); window.scrollTo(0, 0);
  },
  planHome: () => { V.home = true; render(); window.scrollTo(0, 0); },
  planResume: () => { V.home = false; render(); window.scrollTo(0, 0); },
  close: closeSheet,
  retry: () => flush(),
  confirmOk: () => { const f = takeConfirm(); closeSheet(); f && f(); },
  newEmpty: () => toPlan([]),
  startRt: el => { const r = S.meta.routines.find(x => x.id === el.dataset.id); if (r) toPlan(routineItems(r)); },
  again: el => { const src = S.workouts[el.dataset.id]; if (src && src.items) toPlan(cloneItems(src)); },
  planLoad: () => openSheet(planLoadSheet()),
  planLoadRt: el => { const r = S.meta.routines.find(x => x.id === el.dataset.id); if (!r) return; closeSheet(); toPlan(routineItems(r)); toast(r.name + ' 루틴을 불러왔어요'); },
  planLoadW: el => { const src = S.workouts[el.dataset.id]; if (!src || !src.items) return; closeSheet(); toPlan(cloneItems(src)); toast('지난 운동을 불러왔어요'); },
  startPlan: () => {
    const w = cur(); if (!w || !w.planned) return;
    if (!w.items.length) return toast('운동을 하나 이상 추가하세요');
    delete w.planned; w.start = Date.now(); w.date = today(); touchW(w);
    render(); window.scrollTo(0, 0); toast('운동을 시작했어요');
  },
  addEx: () => openPicker(id => { const w = cur(); w.items.push({ex: id, rest: null, sets: seedSets(id)}); touchW(w); closeSheet(); render(); setTimeout(() => { const cs = document.querySelectorAll('.ex'); cs[cs.length - 1]?.scrollIntoView({block: 'center'}); }, 30); }),
  pfilter: el => { P.part = el.dataset.p; document.querySelectorAll('.chips .chip').forEach(c => c.classList.toggle('sel', c === el)); filterPick(); },
  pick: el => P.cb && P.cb(el.dataset.ex),
  pickClose: () => P.back ? P.back() : closeSheet(),
  addCustom: () => {
    const name = $('#cName').value.trim(); if (!name) return toast('운동 이름을 입력하세요');
    const e = {id: uid('c-'), name, part: $('#cPart').value, eq: $('#cEq').value};
    S.meta.custom.push(e); touchMeta(); P.cb && P.cb(e.id);
  },
  delCustom: el => ask('이 운동을 목록에서 지울까요? 지난 기록은 남아요.', '삭제', () => { S.meta.custom = S.meta.custom.filter(e => e.id !== el.dataset.id); touchMeta(); render(); }),
  done: el => {
    const {w, it, s} = ctx(el); if (!s) return;
    if (w.planned) return toast('시작을 누른 뒤 세트를 완료할 수 있어요');
    if (!s.done) { if (!w.end) stopRest(true); } else { if (R.rest && R.rest.set === s) stopRest(false); delete s.restS; }
    s.done = !s.done;
    const row = el.closest('.srow');
    if (s.done && !n2(s.r)) { const p = row.querySelector('[data-f=r]').placeholder; if (n2(p)) s.r = n2(p); }
    if (s.done && s.w === '') { const p = row.querySelector('[data-f=w]').placeholder; if (n2(p)) s.w = n2(p); }
    // 세트를 완료하면 바로 다음 빈 세트에 같은 무게·횟수를 채운다 (웜업 제외)
    const next = it.sets[ctx(el).si + 1];
    if (s.done && s.t !== 'W' && next && !next.done && isBlank(next)) { next.w = s.w; next.r = s.r; }
    touchW(w);
    if (s.done && !w.end) startRest(+it.rest || S.meta.settings.rest, w, s);
    render();
  },
  usePrev: el => { const {w, si, it, s} = ctx(el); const p = (lastSets(it.ex, w.start, w.id) || [])[si]; if (!p) return; s.w = p.w; s.r = p.r; touchW(w); render(); },
  addSet: el => { const {w, it} = ctx(el); const base = lastFilled(it.sets, it.sets.length) || {w: '', r: ''}; it.sets.push({t: 'N', w: base.w, r: base.r, rpe: null, done: false}); touchW(w); render(); },
  addDrop: el => { const {w, it} = ctx(el); const base = it.sets[it.sets.length - 1]; if (!base) return toast('먼저 세트를 추가하세요'); const nw = n2(base.w) ? Math.max(0, Math.round(n2(base.w) * .8 / 2.5) * 2.5) : ''; it.sets.push({t: 'D', w: nw, r: base.r, rpe: null, done: false}); touchW(w); render(); },
  rpe: el => { menuCtx = ctx(el); const cv = menuCtx.s.rpe; openSheet(`<h3>세트 강도 (RPE)</h3><p class="hint">이 세트를 마쳤을 때 몇 회를 더 할 수 있었는지로 고르세요.</p><div class="opts">${RPES.map(([v, t]) => `<button class="opt${cv === v ? ' sel' : ''}" data-act="rpeSet" data-v="${v}"><b>${v}</b><small>${t}</small></button>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn" data-act="rpeSet" data-v="">지우기</button><button class="btn" data-act="close">닫기</button></div>`); },
  rpeSet: el => { const {w, s} = menuCtx; s.rpe = el.dataset.v ? +el.dataset.v : null; touchW(w); closeSheet(); render(); },
  setMenu: el => { menuCtx = ctx(el); const t = menuCtx.s.t; openSheet(`<h3>${menuCtx.si + 1}번째 세트</h3><div class="opts">${[['N', '일반', '본세트'], ['W', '웜업', '통계 제외'], ['D', '드롭', '직전 세트에 이어서']].map(([k, a, b]) => `<button class="opt${t === k ? ' sel' : ''}" data-act="setType" data-t="${k}"><b style="font-size:17px">${a}</b><small>${b}</small></button>`).join('')}</div><div class="row" style="margin-top:12px"><button class="btn" data-act="setDup">아래에 복제</button><button class="btn danger" data-act="setDel">세트 삭제</button><button class="btn" data-act="close">닫기</button></div>`); },
  setType: el => { const {w, s} = menuCtx; s.t = el.dataset.t; touchW(w); closeSheet(); render(); },
  setDup: () => { const {w, it, si, s} = menuCtx; const c = {...s, done: false, rpe: null}; delete c.restS; it.sets.splice(si + 1, 0, c); touchW(w); closeSheet(); render(); },
  setDel: () => { closeSheet(); deleteSet(menuCtx); },
  toastAct: runToastAction,
  exMenu: el => {
    if (el) menuCtx = ctx(el);
    const r = +menuCtx.it.rest || S.meta.settings.rest; const ar = avgRest(menuCtx.it);
    openSheet(`<h3>${esc(exById(menuCtx.it.ex).name)}</h3><p class="hint">이 운동의 휴식 시간${ar ? ' · 오늘 평균 실제 휴식 ' + fmtSec(ar) : ''}</p><div class="step"><button class="btn" data-act="exRestStep" data-d="-10">−10초</button><b>${fmtSec(r)}</b><button class="btn" data-act="exRestStep" data-d="10">+10초</button></div><div class="opts">${REST_OPTS.map(s => `<button class="opt${s === r ? ' sel' : ''}" data-act="exRest" data-s="${s}"><b>${fmtSec(s)}</b></button>`).join('')}</div>
    <div class="row" style="margin-top:14px"><button class="btn" data-act="exPrev">지난 기록 그대로</button><button class="btn" data-act="exMove" data-d="-1">위로</button><button class="btn" data-act="exMove" data-d="1">아래로</button><button class="btn danger" data-act="exDel">운동 빼기</button></div>`);
  },
  exRestStep: el => { const {w, it} = menuCtx; it.rest = Math.min(900, Math.max(10, (+it.rest || S.meta.settings.rest) + +el.dataset.d)); touchW(w); render(); A.exMenu(); },
  exRest: el => { const {w, it} = menuCtx; it.rest = +el.dataset.s; touchW(w); closeSheet(); render(); },
  exPrev: () => { const {w, it} = menuCtx; const p = lastSets(it.ex, w.start, w.id); if (!p) { toast('지난 기록이 없어요'); return; } it.sets = p.map(s => ({t: s.t, w: s.w, r: s.r, rpe: null, done: false})); touchW(w); closeSheet(); render(); },
  exMove: el => { const {w, ii} = menuCtx; const j = ii + +el.dataset.d; if (j < 0 || j >= w.items.length) return closeSheet(); const [x] = w.items.splice(ii, 1); w.items.splice(j, 0, x); touchW(w); closeSheet(); render(); },
  exDel: () => { const {w, ii, it} = menuCtx; if (R.rest && it.sets.includes(R.rest.set)) stopRest(false); w.items.splice(ii, 1); touchW(w); closeSheet(); render(); },
  timer: () => openSheet(`<h3>타이머</h3><p class="hint">세트 완료(✓)를 누르면 휴식 타이머가 자동으로 시작돼요.</p><div class="opts">${[30, 45, 60, 90, 120, 180, 240, 300].map(s => `<button class="opt" data-act="timerGo" data-s="${s}"><b>${s >= 60 ? s / 60 + '분' : s + '초'}</b></button>`).join('')}</div><div class="row" style="margin-top:12px"><input id="tCustom" class="search" style="flex:1" inputmode="numeric" placeholder="직접 입력 (초)"><button class="btn pri" data-act="timerGo">시작</button></div>`),
  timerGo: el => { const s = +el.dataset.s || +($('#tCustom')?.value || 0); if (!s) return toast('시간을 입력하세요'); closeSheet(); startRest(s); },
  restAdj: el => adjustRest(+el.dataset.d),
  restSkip: () => { stopRest(true); render(); },
  pause: () => {
    const w = cur(); if (!w || w.end) return; const now = Date.now();
    if (w.pausedAt) { w.pausedMs = (w.pausedMs || 0) + now - w.pausedAt; w.pausedAt = null; pauseRest(false); }
    else { w.pausedAt = now; pauseRest(true); }
    touchW(w); render();
  },
  wmenu: () => { const w = cur();
    if (w.planned) return openSheet(`<h3>운동 준비</h3><div class="row"><button class="btn" data-act="saveAsRt">루틴으로 저장</button><button class="btn danger" data-act="planDiscard">준비 취소</button><button class="btn" data-act="close">닫기</button></div>`);
    openSheet(`<h3>${w.end ? '기록 편집' : '진행 중인 운동'}</h3><div class="field">날짜<input type="date" id="wDate" value="${esc(w.date)}"></div><div class="row"><button class="btn" data-act="saveAsRt">루틴으로 저장</button><button class="btn danger" data-act="wDiscard">${w.end ? '기록 삭제' : '운동 취소'}</button><button class="btn" data-act="close">닫기</button></div>`); },
  saveAsRt: () => { const w = cur(); if (!w.items.length) return toast('운동이 없어요'); P.rDraft = {id: uid('r-'), name: title(w), items: w.items.map(it => { const ns = it.sets.filter(s => s.t === 'N'); return {ex: it.ex, sets: ns.length || it.sets.length || 3, r: ns[0]?.r ?? '', w: ''}; })}; routineEditor(); },
  planDiscard: () => ask('준비한 운동 목록을 지울까요?', '지우기', () => { const w = cur(); tombstone(w.id); render(); }),
  wDiscard: () => ask('이 운동 기록을 삭제할까요?', '삭제', () => { const w = cur(); if (!w.end) stopRest(false); tombstone(w.id); V.editId = null; render(); }),
  finish: () => {
    const w = cur();
    if (!wSets(w)) return ask('기록된 세트가 없어요. 이 운동을 지울까요?', '지우기', () => { stopRest(false); tombstone(w.id); render(); });
    openSheet(`<h3>운동 완료</h3><p class="hint">${clock(elapsed(w))} · ${wSets(w)}세트 · ${fmtN(wVol(w))}kg</p><p class="sub" style="margin:0 0 8px">오늘 운동 강도</p>
    <div class="opts">${LV.map(([a], i) => `<button class="opt${w.intensity === i + 1 ? ' sel' : ''}" data-act="lv" data-v="${i + 1}"><b>${i + 1}</b><small>${a}</small></button>`).join('')}</div>
    <div class="field" style="margin-top:12px">메모<textarea id="wNote" rows="2" placeholder="컨디션, 자세 메모 등">${esc(w.note)}</textarea></div>
    <div class="row"><button class="btn pri" data-act="finishOk">저장하고 끝내기</button><button class="btn" data-act="close">계속하기</button></div>`);
  },
  lv: el => { const w = cur(); w.intensity = +el.dataset.v; touchW(w); document.querySelectorAll('[data-act=lv]').forEach(b => b.classList.toggle('sel', b === el)); },
  finishOk: () => {
    const w = cur(); w.note = $('#wNote').value.trim(); stopRest(false);
    if (w.pausedAt) { w.pausedMs = (w.pausedMs || 0) + Date.now() - w.pausedAt; w.pausedAt = null; }
    w.end = Date.now(); touchW(w); flush(); closeSheet();
    V.calSel = w.date; V.calM = new Date(); V.view = 'cal'; render(); toast('기록을 저장했어요');
  },
  editW: el => { V.editId = el.dataset.id; V.view = 'rec'; render(); window.scrollTo(0, 0); },
  editDone: () => { const w = cur(); touchW(w); V.editId = null; V.calSel = w.date; V.view = 'cal'; render(); toast('수정했어요'); },
  delW: el => ask('이 운동 기록을 삭제할까요?', '삭제', () => { tombstone(el.dataset.id); render(); }),
  pickDay: el => { V.calSel = el.dataset.k; render(); },
  mon: el => { V.calM = new Date(V.calM.getFullYear(), V.calM.getMonth() + +el.dataset.d, 1); render(); },
  editRt: el => { const r = el.dataset.id && S.meta.routines.find(x => x.id === el.dataset.id); P.rDraft = r ? JSON.parse(JSON.stringify(r)) : {id: uid('r-'), name: '', items: []}; routineEditor(); },
  rAdd: () => openPicker(id => { P.rDraft.items.push({ex: id, sets: 3, r: 10, w: ''}); routineEditor(); }, routineEditor),
  rDel: el => { P.rDraft.items.splice(+el.closest('[data-k]').dataset.k, 1); routineEditor(); },
  rSave: () => {
    const r = P.rDraft; if (!r.items.length) return toast('운동을 하나 이상 추가하세요');
    if (!r.name.trim()) r.name = [...new Set(r.items.map(i => exById(i.ex).part))].join(' · ');
    const k = S.meta.routines.findIndex(x => x.id === r.id); if (k >= 0) S.meta.routines[k] = r; else S.meta.routines.push(r);
    touchMeta(); closeSheet(); render(); toast('루틴을 저장했어요');
  },
  rRemove: () => ask('이 루틴을 삭제할까요?', '삭제', () => { S.meta.routines = S.meta.routines.filter(x => x.id !== P.rDraft.id); touchMeta(); render(); }),
  setRestStep: el => { S.meta.settings.rest = Math.min(900, Math.max(10, S.meta.settings.rest + +el.dataset.d)); touchMeta(); render(); },
  setMode: el => { S.meta.settings.theme = Object.assign({}, S.meta.settings.theme, {mode: el.dataset.k}); touchMeta(); render(); },
  setAcc: el => { S.meta.settings.theme = Object.assign({}, S.meta.settings.theme, {acc: el.dataset.k}); touchMeta(); render(); },
  setWake: el => { S.meta.settings.wake = +el.dataset.v; touchMeta(); render(); },
  testSound: () => { [0, 1000, 2000].forEach(t => setTimeout(tick321, t)); setTimeout(endBeep, 3000); },
  setRest: el => { S.meta.settings.rest = +el.dataset.s; touchMeta(); render(); },
  exportFile: async () => {
    const r = await shareBackup();
    if (r === 'cancel') return toast('백업을 취소했어요');
    toast(r === 'shared' ? '백업했어요. ‘파일에 저장’으로 iCloud Drive에 보관하세요' : '백업 파일을 저장했어요');
    render();
  },
  exportCopy: async () => { try { await copyBackup(); toast('백업 내용을 복사했어요. 메모 앱 등에 붙여넣어 보관하세요'); render(); } catch (e) { toast('복사가 막혀 있어요. 백업 파일 저장을 써주세요'); } },
  importText: () => doImport($('#impText').value),
  wipe: () => ask('모든 기록과 루틴을 지울까요? 되돌릴 수 없어요.', '모두 삭제', () => {
    stopRest(false);
    const now = Date.now(); Object.keys(S.workouts).forEach(id => { S.workouts[id] = {id, deleted: true, updatedAt: now}; mark(id); });
    S.meta.routines = []; S.meta.custom = []; V.editId = null; touchMeta(); render(); toast('모두 삭제했어요');
  }),
  applyUpdate: async () => { $('#upd').classList.remove('on'); await flush(); updateSW && updateSW(true); },
};

/* ---------- 이벤트 ---------- */
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = A[el.dataset.act]; if (f) f(el, e); });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.f) {
    const {w, it, si, s} = ctx(t); if (!s) return;
    const f = t.dataset.f, v = t.value.trim();
    s[f] = v === '' ? '' : n2(v);
    if (s.auto) s.auto = {...s.auto, [f]: false}; // 직접 고친 칸은 더 이상 자동으로 바뀌지 않음
    fillFollowing(t, it, si, f);
    touchW(w); return;
  }
  if (t.dataset.rf && P.rDraft) { const it = P.rDraft.items[+t.closest('[data-k]').dataset.k]; it[t.dataset.rf] = t.value.trim() === '' ? '' : n2(t.value); return; }
  if (t.id === 'rName' && P.rDraft) P.rDraft.name = t.value;
  if (t.id === 'wNote') { const w = cur(); if (w) { w.note = t.value; touchW(w); } }
  if (t.id === 'pq') filterPick();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'anSel') { V.anEx = t.value; render(); }
  if (t.id === 'wDate' && t.value) { const w = cur(); w.date = t.value; touchW(w); render(); }
  if (t.id === 'impFile' && t.files[0]) { const fr = new FileReader(); fr.onload = () => doImport(String(fr.result)); fr.readAsText(t.files[0]); t.value = ''; }
});
document.addEventListener('focusin', e => { if (e.target.classList.contains('num')) setTimeout(() => e.target.select && e.target.select(), 0); });
// 앱을 내리거나 닫을 때 남은 저장을 즉시 마무리
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else { tick(); if (V.view === 'rec') render(); } });
window.addEventListener('pagehide', () => flush());
// 첫 탭에서도 영구 저장을 한 번 더 요청 (사용자 동작 직후 승인율이 높음)
document.addEventListener('pointerdown', () => { store.requestPersist(); }, {once: true, passive: true});

/* ---------- PWA ---------- */
let updateSW = null;
if ('serviceWorker' in navigator) {
  updateSW = registerSW({
    onNeedRefresh() { $('#upd').classList.add('on'); },
    onOfflineReady() { toast('오프라인에서도 쓸 수 있어요'); },
    onRegisteredSW(url, reg) { if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000); },
  });
}

/* ---------- 시작 ---------- */
async function boot() {
  let data = {meta: null, workouts: {}};
  try { data = await store.loadAll(); }
  catch (e) {
    $('#app').innerHTML = `<div class="card"><h3>기기 저장소를 열 수 없어요</h3><p class="sub">개인정보 보호 브라우징이거나 저장 공간이 부족할 수 있어요. 지금 기록은 저장되지 않으니 앱을 다시 열어 주세요.</p></div>`;
    console.error(e);
  }
  hydrate(data);
  const fresh = !data.meta && !Object.keys(data.workouts).length;

  // VER1(같은 주소의 localStorage) 데이터가 있으면 처음 한 번 옮긴다
  const legacy = fresh ? store.readLegacy() : null;
  if (legacy) {
    hydrate({meta: legacy.meta, workouts: legacy.workouts || {}});
    Object.keys(S.workouts).forEach(mark); mark('meta');
    await flush(); store.retireLegacy();
    setTimeout(() => toast('이전 기록을 옮겼어요'), 300);
  }

  // 지난번 IndexedDB 저장 실패 때 남긴 비상 사본을 합친다
  const fb = store.readFallback();
  if (fb) {
    for (const [id, w] of Object.entries(fb.workouts || {})) {
      const l = S.workouts[id];
      if (w && (!l || (w.updatedAt || 0) > (l.updatedAt || 0))) { S.workouts[id] = w; mark(id); }
    }
    if (fb.meta && (fb.meta.updatedAt || 0) > (S.meta.updatedAt || 0)) { hydrate({meta: fb.meta, workouts: S.workouts}); mark('meta'); }
    await flush();
  }

  V.lastBackup = (await store.kvGet('lastBackupAt')) || null;
  restoreRest();
  initWake(paintWake);
  render();
  setInterval(tick, 250);
  store.requestPersist().then(p => { V.storage = Object.assign({}, V.storage, {persisted: p}); });
}
boot();
