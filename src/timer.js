// 휴식 타이머. 시각(timestamp) 기준이라 화면이 잠겨도 다시 열면 남은 시간이 맞다.
// 앱이 완전히 종료돼도 이어지도록 상태를 localStorage에 둔다.
import { $, clock } from './util.js';
import { S, active, cur, elapsed, touchW } from './state.js';

export const R = {rest: null};
const RK = 'letsfit.rest';
let ac = null;

document.addEventListener('pointerdown', () => {
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {}
}, {passive: true});

function beep() {
  try {
    if (!ac) return;
    [0, .3, .6].forEach(t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ac.destination); const at = ac.currentTime + t; g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.35, at + .02); g.gain.exponentialRampToValueAtTime(.0001, at + .2); o.start(at); o.stop(at + .22); });
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
}

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
  r.total = Math.max(r.total, (r.pausedLeft ?? (r.endAt - Date.now())) / 1000);
  saveRest(); tick();
}

export function tick() {
  const r = R.rest;
  if (r) {
    const left = r.pausedLeft != null ? r.pausedLeft : r.endAt - Date.now();
    if (left <= 0 && !r.fired) { r.fired = true; saveRest(); beep(); $('#rest').classList.add('over'); }
    $('#restT').innerHTML = (left > 0 ? clock(left + 999) : '+' + clock(-left)) + '<small>' + (r.pauseStart ? '일시정지' : left > 0 ? '휴식' : '초과 · 다음 세트 시작 시 끝') + '</small>';
    $('#restP').style.width = Math.max(0, Math.min(100, left / (r.total * 1000) * 100)) + '%';
  }
  const el = $('#elapsed'); const w = cur(); if (el && w && !w.end) el.textContent = clock(elapsed(w));
}
