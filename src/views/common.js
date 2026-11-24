import { save } from '../state.js';

export const SAVE = {ok: '기기에 저장됨', saving: '저장 중', err: '저장 실패 · 탭해서 재시도', full: '저장 공간 부족'};
export const saveTag = () => `<span class="sync" id="sync" data-act="retry"><i></i><span>${SAVE[save.state]}</span></span>`;
export function paintSave() {
  const el = document.getElementById('sync'); if (!el) return;
  const s = save.state;
  el.className = 'sync ' + (s === 'ok' ? 'ok' : (s === 'err' || s === 'full') ? 'err' : '');
  el.lastChild.textContent = SAVE[s];
}
