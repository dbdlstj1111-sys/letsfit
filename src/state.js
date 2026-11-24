// 메모리 상태 + 계산. 저장은 storage.js에 위임한다.
import { BASE } from './constants.js';
import { n2, today } from './util.js';
import * as store from './storage.js';

export const blankMeta = () => ({routines: [], custom: [], settings: {rest: 90}, updatedAt: 0});
export const S = {meta: blankMeta(), workouts: {}};

/** 화면 상태 */
export const V = {view: 'rec', calM: new Date(), calSel: today(), anEx: null, editId: null, lastBackup: null, storage: null};

export function hydrate(data) {
  const m = Object.assign(blankMeta(), (data && data.meta) || {});
  m.settings = Object.assign({rest: 90}, m.settings || {});
  if (!(+m.settings.rest > 0)) m.settings.rest = 90;
  m.routines = Array.isArray(m.routines) ? m.routines : [];
  m.custom = Array.isArray(m.custom) ? m.custom : [];
  S.meta = m;
  S.workouts = (data && data.workouts) || {};
}

/* ---------- 저장 ---------- */
const pending = new Set();
let flushT = null, flushing = null;
export const save = {state: 'ok', onChange: null};
function setSave(s) { save.state = s; save.onChange && save.onChange(s); }

export function mark(id) { pending.add(id); clearTimeout(flushT); flushT = setTimeout(flush, 250); }
export function touchW(w) { w.updatedAt = Date.now(); mark(w.id); }
export function touchMeta() { S.meta.updatedAt = Date.now(); mark('meta'); }
export const hasPending = () => pending.size > 0;

export async function flush() {
  clearTimeout(flushT);
  if (flushing) { await flushing; }
  if (!pending.size) return;
  const ids = [...pending]; pending.clear();
  setSave('saving');
  flushing = (async () => {
    try {
      await store.saveRecords(ids.includes('meta') ? S.meta : null, ids.filter(i => i !== 'meta').map(i => S.workouts[i]).filter(Boolean));
      if (!pending.size) store.clearFallback();
      setSave('ok');
    } catch (e) {
      ids.forEach(i => pending.add(i));
      store.writeFallback(S);
      setSave(e && e.name === 'QuotaExceededError' ? 'full' : 'err');
    } finally { flushing = null; }
  })();
  return flushing;
}

/* ---------- 조회 ---------- */
export const live = () => Object.values(S.workouts).filter(w => w && !w.deleted && Array.isArray(w.items));
export const finished = () => live().filter(w => w.end).sort((a, b) => b.start - a.start);
export const active = () => live().filter(w => !w.end).sort((a, b) => b.start - a.start)[0];
export const cur = () => (V.editId && S.workouts[V.editId] && !S.workouts[V.editId].deleted) ? S.workouts[V.editId] : active();
export const exById = id => S.meta.custom.find(e => e.id === id) || BASE.find(e => e.id === id) || {id, name: '(삭제된 운동)', part: '기타', eq: 'bb'};
export const allEx = () => [...BASE, ...S.meta.custom];

/* ---------- 계산 ---------- */
export const work = it => it.sets.filter(s => s.t !== 'W' && n2(s.r) > 0);
export const itemVol = it => work(it).reduce((a, s) => a + n2(s.w) * n2(s.r), 0);
export const wVol = w => w.items.reduce((a, it) => a + itemVol(it), 0);
export const wSets = w => w.items.reduce((a, it) => a + work(it).length, 0);
export const parts = w => [...new Set(w.items.map(it => exById(it.ex).part))];
export const title = w => parts(w).join(' · ') || '운동';
export const elapsed = w => (w.end || w.pausedAt || Date.now()) - w.start - (w.pausedMs || 0);
export const avgRest = it => { const r = it.sets.map(s => +s.restS).filter(x => x > 0); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0; };

export function lastSets(exId, before = Infinity, skip = null) {
  for (const w of finished()) { if (w.id === skip || w.start >= before) continue; const it = w.items.find(i => i.ex === exId); if (it && it.sets.length) return it.sets; }
  return null;
}
export function seedSets(exId, n, r, wt) {
  const prev = lastSets(exId);
  const pw = prev ? prev.filter(s => s.t !== 'W') : [];
  if (!n && prev) return prev.map(s => ({t: s.t, w: s.w, r: s.r, rpe: null, done: false}));
  return Array.from({length: n || 3}, (_, k) => {
    const p = pw[Math.min(k, pw.length - 1)] || {};
    return {t: 'N', w: (wt !== '' && wt != null) ? wt : (p.w ?? ''), r: (r !== '' && r != null) ? r : (p.r ?? ''), rpe: null, done: false};
  });
}
