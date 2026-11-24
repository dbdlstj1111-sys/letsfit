// 백업 파일 만들기·공유·복원. 형식은 docs/schema.md 참고.
import { S, V, live, finished, mark, touchMeta } from './state.js';
import { SCHEMA, kvSet } from './storage.js';
import { today, dlabel, dkey } from './util.js';

const DAY = 864e5;
const APPS = ['setnote', 'letsfit'];

export function exportJSON() {
  return JSON.stringify({app: 'letsfit', schema: SCHEMA, v: 1, exported: new Date().toISOString(), meta: S.meta, workouts: live()});
}

export async function markBackedUp() {
  V.lastBackup = Date.now();
  try { await kvSet('lastBackupAt', V.lastBackup); } catch (e) {}
}

/** 공유 시트(→ 파일에 저장 → iCloud Drive). 공유가 안 되면 다운로드. 결과: 'shared' | 'downloaded' | 'cancel' */
export async function shareBackup() {
  const data = exportJSON();
  const name = 'letsfit-backup-' + today() + '.json';
  // navigator.share는 사용자 탭 직후 바로 불러야 하므로 앞에 await를 두지 않는다
  const candidates = [new File([data], name, {type: 'application/json'}), new File([data], name, {type: 'text/plain'})];
  const file = navigator.canShare ? candidates.find(f => { try { return navigator.canShare({files: [f]}); } catch (e) { return false; } }) : null;
  if (file && navigator.share) {
    try { await navigator.share({files: [file], title: 'LETS FIT 백업'}); await markBackedUp(); return 'shared'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  const url = URL.createObjectURL(new Blob([data], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  await markBackedUp();
  return 'downloaded';
}

export async function copyBackup() {
  await navigator.clipboard.writeText(exportJSON());
  await markBackedUp();
}

const validW = w => w && typeof w.id === 'string' && /^w-[\w-]+$/.test(w.id) && Array.isArray(w.items) && w.items.every(i => i && typeof i.ex === 'string' && Array.isArray(i.sets));

/** 백업 텍스트를 현재 기록에 합친다. 결과: {ok, msg} */
export function importBackup(txt) {
  let d; try { d = JSON.parse(txt); } catch (e) { return {ok: false, msg: '백업 형식이 올바르지 않아요'}; }
  if (!d || !APPS.includes(d.app) || !Array.isArray(d.workouts)) return {ok: false, msg: 'LETS FIT 백업 파일이 아니에요'};
  if ((d.schema || 1) > SCHEMA) return {ok: false, msg: '더 새 버전 앱의 백업이에요. 앱을 업데이트하세요'};
  const now = Date.now(); let n = 0;
  d.workouts.forEach(w => { if (validW(w)) { w.updatedAt = now; S.workouts[w.id] = w; mark(w.id); n++; } });
  if (d.meta && typeof d.meta === 'object') {
    const ids = new Set(S.meta.routines.map(r => r.id)); (d.meta.routines || []).forEach(r => { if (r && r.id && Array.isArray(r.items) && !ids.has(r.id)) S.meta.routines.push(r); });
    const cids = new Set(S.meta.custom.map(r => r.id)); (d.meta.custom || []).forEach(r => { if (r && r.id && r.name && !cids.has(r.id)) S.meta.custom.push(r); });
  }
  touchMeta();
  return {ok: true, msg: '기록 ' + n + '건을 복원했어요'};
}

/** 마지막 백업 후 7일이 지났으면 {days, never} */
export function backupDue() {
  const fin = finished(); if (!fin.length) return null;
  const base = V.lastBackup || fin[fin.length - 1].start;
  const days = Math.floor((Date.now() - base) / DAY);
  return days >= 7 ? {days, never: !V.lastBackup} : null;
}

export function lastBackupLabel() {
  if (!V.lastBackup) return '아직 없음';
  const days = Math.floor((Date.now() - V.lastBackup) / DAY);
  return dlabel(dkey(new Date(V.lastBackup))) + (days ? ' · ' + days + '일 전' : ' · 오늘');
}
