// 휴식 타이머. 시각(timestamp) 기준이라 화면이 잠겨도 다시 열면 남은 시간이 맞다.
// 앱이 완전히 종료돼도 이어지도록 상태를 localStorage에 둔다.
import { $, clock } from './util.js';
import { S, active, cur, elapsed, touchW } from './state.js';
import { unlockAudio, tick321, endBeep } from './sound.js';

export const R = {rest: null};
const RK = 'letsfit.rest';

// 터치할 때와 앱으로 돌아올 때마다 오디오를 깨워 둔다
document.addEventListener('pointerdown', unlockAudio, {passive: true});
document.addEventListener('visibilitychange', () => { if (!document.hidden) unlockAudio(); });

export function saveRest() {
  try {
    const r = R.rest;
    if (!r) return localStorage.removeItem(RK);
    let ii = -1, si = -1;
    const w = r.wid && S.workouts[r.wid];
    if (w && r.set && w.items) w.items.forEach((it, a) => { const b = it.sets.indexOf(r.set); if (b >= 0) { ii = a; si = b; } });
    const {set, ...rest} = r;
    localStorage.setItem(RK, JSON.stringify({...rest, ii, si}));
  } catch (e) {}
}

export function restoreRest() {
  try {
    const d = JSON.parse(localStorage.getItem(RK));
    if (!d) return;
    const w = d.wid ? S.workouts[d.wid] : null;
    if (d.wid && (!w || w.deleted || w.end)) return localStorage.removeItem(RK);
    const set = w && d.ii >= 0 ? (w.items[d.ii] && w.items[d.ii].sets[d.si]) : null;
    const {ii, si, ...rest} = d;
    R.rest = {...rest, set: set || null};
    $('#rest').classList.add('on');
    $('#rest').classList.toggle('over', !!d.fired);
    tick();
  } catch (e) {}
}

export function startRest(sec, w, set) {
  const now = Date.now();
  R.rest = {startAt: now, endAt: now + sec * 1000, total: sec, fired: false, wid: w ? w.id : null, set: set || null, pausedMs: 0, pauseStart: null, pausedLeft: null};
  const a = active(); if (a && a.pausedAt) pauseRest(true);
  $('#rest').classList.add('on'); $('#rest').classList.remove('over');
  saveRest(); tick();
}

export function stopRest(record) {
  if (!R.rest) return;
  const r = R.rest; R.rest = null; $('#rest').classList.remove('on', 'over');
  saveRest();
  if (record && r.set) {
    const pm = r.pausedMs + (r.pauseStart ? Date.now() - r.pauseStart : 0);
    r.set.restS = Math.max(1, Math.round((Date.now() - r.startAt - pm) / 1000));
    const w = S.workouts[r.wid]; if (w && !w.deleted) touchW(w);
  }
}

export function pauseRest(on) {
  const r = R.rest; if (!r) return; const now = Date.now();
  if (on && !r.pauseStart) { r.pauseStart = now; if (!r.fired) r.pausedLeft = r.endAt - now; }
  if (!on && r.pauseStart) { r.pausedMs += now - r.pauseStart; r.pauseStart = null; if (r.pausedLeft != null) { r.endAt = now + r.pausedLeft; r.pausedLeft = null; } }
  saveRest();
}

export function adjustRest(d) {
  const r = R.rest; if (!r) return; d *= 1000;
  if (r.pausedLeft != null) r.pausedLeft = Math.max(0, r.pausedLeft + d);
  else {
    if (r.fired && d > 0) { r.endAt = Date.now(); r.fired = false; $('#rest').classList.remove('over'); }
    r.endAt += d; if (r.endAt <= Date.now() && !r.fired) r.endAt = Date.now();
  }
  r.cd = null; // 시간을 늘리면 카운트다운을 다시 할 수 있게
  r.total = Math.max(r.total, (r.pausedLeft ?? (r.endAt - Date.now())) / 1000);
  saveRest(); tick();
}

export function tick() {
  const r = R.rest;
  if (r) {
    const left = r.pausedLeft != null ? r.pausedLeft : r.endAt - Date.now();
    // 끝나기 3·2·1초 전 짧은 비프, 끝나면 더 큰 비프
    const sec = Math.ceil(left / 1000);
    if (left > 0 && sec <= 3 && !r.pauseStart && r.cd !== sec) { r.cd = sec; tick321(); }
    if (left <= 0 && !r.fired) { r.fired = true; saveRest(); endBeep(); $('#rest').classList.add('over'); }
    $('#restT').innerHTML = (left > 0 ? clock(left + 999) : '+' + clock(-left)) + '<small>' + (r.pauseStart ? '일시정지' : left > 0 ? '휴식' : '초과 · 다음 세트 시작 시 끝') + '</small>';
    $('#restP').style.width = Math.max(0, Math.min(100, left / (r.total * 1000) * 100)) + '%';
  }
  const el = $('#elapsed'); const w = cur(); if (el && w && !w.end) el.textContent = clock(elapsed(w));
}
