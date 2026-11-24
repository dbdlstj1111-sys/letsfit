// 운동 선택 시트, 루틴 편집 시트
import { PARTS, EQ } from './constants.js';
import { $, esc, fmtW } from './util.js';
import { S, finished, allEx, exById } from './state.js';
import { openSheet } from './ui.js';

export const P = {cb: null, back: null, part: '', rDraft: null};

export function openPicker(cb, back) {
  P.cb = cb; P.back = back || null; P.part = '';
  const freq = {}; finished().forEach(w => w.items.forEach(it => freq[it.ex] = (freq[it.ex] || 0) + 1));
  const list = allEx().slice().sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
  openSheet(`<h3>운동 추가</h3><input class="search" id="pq" placeholder="운동 이름 검색" autocomplete="off">
  <div class="chips"><button class="chip sel" data-act="pfilter" data-p="">전체</button>${PARTS.map(p => `<button class="chip" data-act="pfilter" data-p="${p}">${p}</button>`).join('')}</div>
  <div id="plist">${PARTS.concat(['기타']).map(pt => { const g = list.filter(e => (PARTS.includes(e.part) ? e.part : '기타') === pt); return g.length ? `<div class="pgh" data-g="${pt}">${pt}</div>` + g.map(e => `<button class="pick" data-act="pick" data-ex="${esc(e.id)}" data-part="${esc(pt)}" data-name="${esc(e.name)}"><span>${esc(e.name)}</span>${freq[e.id] ? `<em>${freq[e.id]}회</em>` : ''}<small>${EQ[e.eq] || ''}</small></button>`).join('') : ''; }).join('')}</div>
  <h2>직접 추가</h2><div class="field"><input id="cName" placeholder="운동 이름"></div>
  <div class="row"><select id="cPart" class="search" style="flex:1">${PARTS.map(p => `<option>${p}</option>`).join('')}</select><select id="cEq" class="search" style="flex:1">${Object.entries(EQ).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn pri" data-act="addCustom">추가</button></div>
  <div class="row" style="margin-top:14px"><button class="btn" data-act="pickClose">${P.back ? '돌아가기' : '닫기'}</button></div>`);
}

export function filterPick() {
  const q = ($('#pq')?.value || '').trim().toLowerCase();
  document.querySelectorAll('#plist .pick').forEach(b => { b.hidden = !((!P.part || b.dataset.part === P.part) && (!q || b.dataset.name.toLowerCase().includes(q))); });
  document.querySelectorAll('#plist .pgh').forEach(h => { h.hidden = !document.querySelector(`#plist .pick[data-part="${h.dataset.g}"]:not([hidden])`); });
}

export function routineEditor() {
  const r = P.rDraft;
  const exists = S.meta.routines.some(x => x.id === r.id);
  openSheet(`<h3>${exists ? '루틴 편집' : '새 루틴'}</h3>
  <div class="field">이름<input id="rName" value="${esc(r.name)}" placeholder="예: 가슴·삼두 A"></div>
  <div class="rhead"><span>운동</span><span>세트</span><span>회</span><span>kg</span><span></span></div>
  ${r.items.map((it, k) => `<div class="rrow" data-k="${k}"><span>${esc(exById(it.ex).name)}</span><input data-rf="sets" inputmode="numeric" value="${esc(it.sets)}"><input data-rf="r" inputmode="numeric" value="${esc(it.r)}"><input data-rf="w" inputmode="decimal" placeholder="이전" value="${esc(fmtW(it.w))}"><button class="icon" style="width:36px" data-act="rDel" aria-label="빼기">×</button></div>`).join('') || '<p class="empty">운동을 추가하세요.</p>'}
  <p class="hint" style="margin-top:10px">kg를 비워두면 시작할 때 지난 기록의 무게를 채워 넣어요.</p>
  <button class="btn ghost" data-act="rAdd">+ 운동 추가</button>
  <div class="row" style="margin-top:14px"><button class="btn pri" data-act="rSave">저장</button><button class="btn" data-act="close">취소</button>${exists ? '<button class="btn danger" data-act="rRemove">삭제</button>' : ''}</div>`);
}
