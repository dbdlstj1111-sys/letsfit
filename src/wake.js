// 운동 중 화면 켜짐 유지 (Screen Wake Lock).
// 운동을 시작한 뒤(준비 화면 제외)부터 완료까지, 마지막으로 화면을 만진 뒤 설정한 시간 동안 켜 둔다.
// 휴식 타이머가 도는 동안에는 알림음이 나도록 시간과 상관없이 켜 둔다.
import { S, active } from './state.js';
import { R } from './timer.js';

export const WAKE_OPTS = [[0, '끄기'], [5, '5분'], [10, '10분'], [15, '15분'], [30, '30분'], [-1, '운동 끝까지']];
export const DEFAULT_WAKE = 10;

let sentinel = null, lastTouch = Date.now(), failed = false;
export const wakeSupported = () => 'wakeLock' in navigator;
export const wakeState = () => !wakeSupported() ? 'unsupported' : sentinel ? 'on' : failed && shouldHold() ? 'failed' : 'off';
export const wakeMinutes = () => { const m = S.meta.settings.wake; return m == null ? DEFAULT_WAKE : +m; };

function shouldHold() {
  const min = wakeMinutes();
  if (!min || document.hidden) return false;
  const w = active();
  if (!w || w.planned || w.end) return false;
  if (R.rest && !R.rest.fired) return true;
  return min < 0 || Date.now() - lastTouch < min * 60000;
}

/** 지금 켜 둬야 하는지 보고 잠금을 요청하거나 푼다 (주기적으로·화면 터치 때 호출) */
export async function syncWake() {
  if (!wakeSupported()) return;
  const want = shouldHold();
  if (want && !sentinel) {
    try {
      const s = await navigator.wakeLock.request('screen');
      if (!shouldHold()) { s.release(); return; }
      sentinel = s; failed = false;
      // iOS는 앱이 화면에서 사라지면 자동으로 풀어 버린다 → 돌아오면 다시 요청
      s.addEventListener('release', () => { if (sentinel === s) sentinel = null; onChange && onChange(); });
      onChange && onChange();
    } catch (e) { if (!failed) { failed = true; onChange && onChange(); } }
  } else if (!want && sentinel) {
    const s = sentinel; sentinel = null;
    try { await s.release(); } catch (e) {}
    onChange && onChange();
  }
}

let onChange = null;
export function initWake(cb) {
  onChange = cb;
  // 터치·입력할 때마다 '마지막으로 만진 시각'을 갱신. 요청이 실패했으면 터치 직후 다시 시도한다.
  const touch = () => { lastTouch = Date.now(); if (!sentinel || failed) syncWake(); };
  document.addEventListener('pointerdown', touch, {passive: true});
  document.addEventListener('keydown', touch);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lastTouch = Date.now(); syncWake(); });
  setInterval(syncWake, 5000);
}
