// 모든 기기 저장 코드는 이 파일에만 둔다. (docs/schema.md 참고)
import { openDB } from 'idb';

const DB_NAME = 'letsfit';
const DB_VER = 1;
export const SCHEMA = 1;
const LEGACY_KEY = 'setnote.v1';
const FALLBACK_KEY = 'letsfit.fallback';

let dbp = null;
function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VER, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('workouts')) d.createObjectStore('workouts', {keyPath: 'id'});
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      },
      // iOS는 백그라운드에서 연결을 끊는 경우가 있어 다음 호출 때 다시 연다
      terminated() { dbp = null; },
      blocking() { dbp?.then(x => x.close()); dbp = null; },
    });
    dbp.catch(() => { dbp = null; });
  }
  return dbp;
}

// 연결이 끊긴 경우 한 번 다시 연결해서 재시도
async function withDb(fn) {
  try { return await fn(await db()); }
  catch (e) {
    if (e && e.name === 'QuotaExceededError') throw e;
    dbp = null;
    return await fn(await db());
  }
}

/** 전체 불러오기 → {meta: object|null, workouts: {id: workout}} */
export async function loadAll() {
  return withDb(async d => {
    const [list, meta] = await Promise.all([d.getAll('workouts'), d.get('meta', 'meta')]);
    const workouts = {};
    for (const w of list) if (w && w.id) workouts[w.id] = w;
    return {meta: meta || null, workouts};
  });
}

/** 바뀐 기록만 한 트랜잭션으로 저장 */
export async function saveRecords(meta, workouts) {
  return withDb(async d => {
    const tx = d.transaction(['workouts', 'meta'], 'readwrite');
    const ws = tx.objectStore('workouts');
    for (const w of workouts) ws.put(plain(w));
    if (meta) tx.objectStore('meta').put(plain(meta), 'meta');
    await tx.done;
  });
}

// 구조화 복제 가능한 순수 객체로 (undefined 필드 제거)
const plain = o => JSON.parse(JSON.stringify(o));

export const kvGet = k => withDb(d => d.get('kv', k)).catch(() => undefined);
export const kvSet = (k, v) => withDb(d => d.put('kv', v, k));

/** VER1이 같은 주소에서 쓰던 localStorage 데이터 (있을 때만) */
export function readLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && (d.meta || d.workouts) ? d : null;
  } catch (e) { return null; }
}
export function retireLegacy() {
  try { const raw = localStorage.getItem(LEGACY_KEY); if (raw) { localStorage.setItem(LEGACY_KEY + '.migrated', raw); localStorage.removeItem(LEGACY_KEY); } } catch (e) {}
}

/** IndexedDB 저장이 실패했을 때의 비상 사본 */
export function writeFallback(S) { try { localStorage.setItem(FALLBACK_KEY, JSON.stringify({meta: S.meta, workouts: S.workouts})); return true; } catch (e) { return false; } }
export function readFallback() { try { return JSON.parse(localStorage.getItem(FALLBACK_KEY)); } catch (e) { return null; } }
export function clearFallback() { try { localStorage.removeItem(FALLBACK_KEY); } catch (e) {} }

/** 영구 저장 요청. 결과: true | false | null(지원 안 함) */
export async function requestPersist() {
  const st = navigator.storage;
  if (!st || !st.persist) return null;
  try {
    if (st.persisted && await st.persisted()) return true;
    return await st.persist();
  } catch (e) { return false; }
}

export async function storageInfo() {
  const st = navigator.storage;
  const out = {persisted: null, usage: null, quota: null};
  if (!st) return out;
  try { if (st.persisted) out.persisted = await st.persisted(); } catch (e) {}
  try { if (st.estimate) { const e = await st.estimate(); out.usage = e.usage; out.quota = e.quota; } } catch (e) {}
  return out;
}
