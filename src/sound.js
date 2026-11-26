// 휴식 알림음. 듣고 있는 음악은 멈추거나 줄이지 않고 그 위에 섞어서 낸다.
// 이어폰을 쓰고 있으면 소리도 이어폰으로 나간다(현재 출력 장치를 따름).
let ac = null;

// 'ambient': 다른 앱의 음악과 섞어서 재생(음악 볼륨·재생에 영향 없음).
// 대신 이어폰 없이 아이폰이 무음 모드면 스피커로는 들리지 않을 수 있다.
try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}

function ctx() {
  try {
    if (!ac || ac.state === 'closed') ac = new (window.AudioContext || window.webkitAudioContext)();
    // iOS는 전화·다른 앱·화면 잠금 뒤 'interrupted'/'suspended'로 멈춰 둔다
    if (ac.state !== 'running') ac.resume().catch(() => {});
  } catch (e) { ac = null; }
  return ac;
}

/** 사용자 터치 때마다 불러서 오디오를 깨워 둔다 (iOS는 터치 직후에만 재생을 허락) */
export function unlockAudio() { ctx(); }

function tone(a, at, freq, dur, gain, type = 'sine') {
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
  g.gain.setValueAtTime(gain, at + dur - 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.start(at); o.stop(at + dur + 0.02);
}

/** 3·2·1초 카운트다운: 짧은 비프 */
export function tick321() {
  const a = ctx(); if (!a) return;
  tone(a, a.currentTime + 0.01, 880, 0.12, 0.45);
}

/** 휴식 끝: 더 높고 길고 큰 비프 두 번 */
export function endBeep() {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + 0.01;
  tone(a, t, 1320, 0.35, 0.9, 'triangle');
  tone(a, t + 0.45, 1320, 0.55, 0.9, 'triangle');
}
