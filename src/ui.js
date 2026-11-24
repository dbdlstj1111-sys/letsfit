import { $, esc } from './util.js';

export function openSheet(html) { $('#panel').innerHTML = html; $('#sheet').classList.add('on'); }
export function closeSheet() { $('#sheet').classList.remove('on'); $('#panel').innerHTML = ''; }

let confirmFn = null;
export function ask(text, ok, fn, danger = true) {
  confirmFn = fn;
  openSheet(`<h3>${esc(text)}</h3><div class="row"><button class="btn ${danger ? 'danger' : 'pri'}" data-act="confirmOk">${esc(ok)}</button><button class="btn" data-act="close">취소</button></div>`);
}
export function takeConfirm() { const f = confirmFn; confirmFn = null; return f; }

let toastT;
export function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }
