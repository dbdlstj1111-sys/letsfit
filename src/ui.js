import { $, esc } from './util.js';

export function openSheet(html) { $('#panel').innerHTML = html; $('#sheet').classList.add('on'); }
export function closeSheet() { $('#sheet').classList.remove('on'); $('#panel').innerHTML = ''; }

let confirmFn = null;
export function ask(text, ok, fn, danger = true) {
  confirmFn = fn;
  openSheet(`<h3>${esc(text)}</h3><div class="row"><button class="btn ${danger ? 'danger' : 'pri'}" data-act="confirmOk">${esc(ok)}</button><button class="btn" data-act="close">취소</button></div>`);
}
export function takeConfirm() { const f = confirmFn; confirmFn = null; return f; }

let toastT, toastFn = null;
/** action: {label, fn} 을 주면 버튼이 달린 알림(예: 실행 취소)을 6초간 띄운다 */
export function toast(t, action) {
  const el = $('#toast');
  toastFn = action ? action.fn : null;
  el.innerHTML = esc(t) + (action ? `<button data-act="toastAct">${esc(action.label)}</button>` : '');
  el.classList.toggle('act', !!action);
  el.classList.add('on'); clearTimeout(toastT);
  toastT = setTimeout(hideToast, action ? 6000 : 2200);
}
export function hideToast() { const el = $('#toast'); el.classList.remove('on', 'act'); toastFn = null; }
export function runToastAction() { const f = toastFn; hideToast(); f && f(); }
