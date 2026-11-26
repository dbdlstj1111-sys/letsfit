import { PC, EQ, THEMES, MODES, REST_OPTS } from '../constants.js';
import { esc, fmtSec, fmtBytes, isStandalone } from '../util.js';
import { S, V, finished } from '../state.js';
import { saveTag } from './common.js';
import { lastBackupLabel } from '../backup.js';
import { WAKE_OPTS, wakeMinutes, wakeState } from '../wake.js';

export function wakeStatus() {
  const s = wakeState();
  return s === 'unsupported' ? '<span class="bad">이 기기에서는 지원되지 않아요</span>' : s === 'on' ? '<span class="good">지금 화면 켜짐 유지 중</span>' : s === 'failed' ? '<span class="bad">요청이 거절됐어요 · 화면을 누르면 다시 시도해요</span>' : '<span>운동을 시작하면 동작해요</span>';
}

export function storageRows() {
  const st = V.storage || {};
  const p = st.persisted === true ? '<span class="good">승인됨</span>' : st.persisted === false ? '<span class="bad">거절됨 · 백업을 자주 해주세요</span>' : '<span>확인 중…</span>';
  return `<div class="kv"><span>영구 저장</span>${p}</div>
  <div class="kv"><span>실행 방식</span><span>${isStandalone() ? '홈 화면 앱' : '브라우저 탭'}</span></div>
  <div class="kv"><span>사용량</span><span>${st.usage != null ? fmtBytes(st.usage) : '—'}</span></div>
  <div class="kv"><span>마지막 백업</span><span>${esc(lastBackupLabel())}</span></div>`;
}

export function vSet() {
  const r = S.meta.settings.rest;
  const th = S.meta.settings.theme || {};
  return `<div class="top"><div><h1>설정</h1></div>${saveTag()}</div>
  <h2>테마</h2><div class="card"><div class="seg">${MODES.map(([k, l]) => `<button class="${(th.mode || 'system') === k ? 'sel' : ''}" data-act="setMode" data-k="${k}">${l}</button>`).join('')}</div>
  <div class="themes">${THEMES.map(([k, l, c]) => `<button class="th${(th.acc || 'red') === k ? ' sel' : ''}" data-act="setAcc" data-k="${k}"><i style="background:${c}"></i>${l}</button>`).join('')}</div></div>
  <h2>기본 휴식 시간</h2><div class="card"><div class="step"><button class="btn" data-act="setRestStep" data-d="-10">−10초</button><b>${fmtSec(r)}</b><button class="btn" data-act="setRestStep" data-d="10">+10초</button></div><div class="opts">${REST_OPTS.map(s => `<button class="opt${s === r ? ' sel' : ''}" data-act="setRest" data-s="${s}"><b>${fmtSec(s)}</b></button>`).join('')}</div></div>
  <h2>휴식 알림음</h2><div class="card"><p class="sub" style="margin:0 0 12px">끝나기 3초 전부터 짧게 삐-삐-삐, 끝나면 크게 두 번 울려요. 듣고 있는 음악은 멈추거나 줄이지 않고, 이어폰을 쓰면 이어폰으로 나와요.</p><button class="btn" data-act="testSound">알림음 들어보기</button></div>
  <h2>화면 켜짐 유지</h2><div class="card"><p class="sub" style="margin:0 0 12px">운동을 시작한 뒤 완료할 때까지, 마지막으로 화면을 만진 뒤 아래 시간 동안 화면이 꺼지지 않아요. 휴식 타이머가 도는 동안에는 항상 켜져 있어요.</p>
  <div class="opts">${WAKE_OPTS.map(([v, l]) => `<button class="opt${wakeMinutes() === v ? ' sel' : ''}" data-act="setWake" data-v="${v}"><b style="font-size:16px">${l}</b></button>`).join('')}</div>
  <div class="kv" style="margin-top:10px;border-top:1px solid var(--line)"><span>상태</span><span id="wakeStat">${wakeStatus()}</span></div></div>
  <h2>내가 추가한 운동</h2><div class="card">${S.meta.custom.map(e => `<div class="list-item"><span class="dot" style="background:${PC[e.part] || '#999'}"></span><div class="grow"><h3>${esc(e.name)}</h3><p>${esc(e.part)} · ${EQ[e.eq] || ''}</p></div><button class="btn sm danger" data-act="delCustom" data-id="${esc(e.id)}">삭제</button></div>`).join('') || '<p class="empty">운동 추가 화면의 “직접 추가”로 만들 수 있어요.</p>'}</div>
  <h2>저장 상태</h2><div class="card" id="stInfo">${storageRows()}</div>
  <h2>백업</h2><div class="card"><p class="sub" style="margin:0 0 12px">기록은 이 아이폰 안에만 저장돼요. 홈 화면 아이콘을 지우면 기록도 함께 지워지니, 백업 파일을 ‘파일에 저장 → iCloud Drive’로 보관하세요.</p>
  <div class="row"><button class="btn pri" data-act="exportFile">백업 파일 저장</button><button class="btn" data-act="exportCopy">복사</button><label class="btn">파일에서 복원<input type="file" accept=".json,application/json,text/plain" id="impFile" hidden></label></div>
  <details style="margin-top:12px"><summary class="sub">백업 텍스트 붙여넣기 (VER1 백업도 가능)</summary><textarea id="impText" class="search" rows="4" style="margin-top:8px" placeholder="복사해 둔 백업 내용을 붙여넣으세요"></textarea><button class="btn sm" data-act="importText" style="margin-top:8px">복원</button></details></div>
  <h2>초기화</h2><div class="card"><button class="btn danger" data-act="wipe">모든 기록 삭제</button></div>
  <p class="sub">기록 ${finished().length}건 · 루틴 ${S.meta.routines.length}개</p>`;
}
