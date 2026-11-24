import { PC } from '../constants.js';
import { esc } from '../util.js';
import { S, exById } from '../state.js';

export function vRt() {
  const list = S.meta.routines.map(r => {
    const ps = [...new Set(r.items.map(i => exById(i.ex).part))];
    return `<div class="card"><div class="row" style="justify-content:space-between"><div class="grow" style="flex:1"><h3>${esc(r.name)}</h3><p class="sub">${ps.map(p => `<span class="dot" style="background:${PC[p] || '#999'}"></span> ${esc(p)}`).join(' &nbsp;')}</p></div><button class="btn sm" data-act="editRt" data-id="${esc(r.id)}">편집</button><button class="btn sm pri" data-act="startRt" data-id="${esc(r.id)}">시작</button></div>
    <p class="sub" style="margin-top:8px">${esc(r.items.map(i => exById(i.ex).name + ' ' + (i.sets || 3) + '×' + (i.r || '-')).join(' · '))}</p></div>`;
  }).join('');
  return `<div class="top"><div><h1>루틴</h1><p class="sub">자주 하는 운동 순서를 저장해 두세요</p></div><button class="btn pri" data-act="editRt">새 루틴</button></div>
  ${list || '<div class="card"><p class="empty">루틴이 없어요. 예: 가슴·삼두 / 등·이두 / 하체 처럼 분할별로 만들어 보세요.</p></div>'}`;
}
