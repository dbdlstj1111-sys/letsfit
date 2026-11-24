// 세트 줄을 왼쪽으로 밀어서 삭제. 세로 스크롤은 그대로 두고 가로로 민 경우만 처리한다.
const START = 10;   // 이만큼 움직여야 가로/세로 판단
const DELETE = 90;  // 이만큼 밀면 놓았을 때 삭제

export function initSwipe(onDelete) {
  let g = null;          // 진행 중인 제스처
  let suppressClick = false;

  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const row = e.target.closest('.srow');
    if (!row || !row.parentElement.classList.contains('swipe')) return;
    g = {row, id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, mode: null};
  });

  document.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.mode) {
      if (Math.abs(dx) < START && Math.abs(dy) < START) return;
      if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
        g.mode = 'swipe';
        try { g.row.setPointerCapture(e.pointerId); } catch (err) {}
        document.activeElement?.blur?.();
        g.row.parentElement.classList.add('on');
      } else { g = null; return; }
    }
    g.dx = Math.min(0, dx);
    g.row.style.transform = `translateX(${g.dx}px)`;
    g.row.parentElement.classList.toggle('armed', g.dx <= -DELETE);
  });

  const end = e => {
    if (!g || e.pointerId !== g.id) return;
    const {row, dx, mode} = g; g = null;
    if (mode !== 'swipe') return;
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 350);
    const wrap = row.parentElement;
    row.classList.add('snap');
    if (dx <= -DELETE && e.type === 'pointerup') {
      row.style.transform = 'translateX(-110%)';
      setTimeout(() => onDelete(row), 180);
    } else {
      row.style.transform = '';
      setTimeout(() => { row.classList.remove('snap'); wrap.classList.remove('on', 'armed'); }, 200);
    }
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);

  // 밀고 손을 뗄 때 아래 버튼이 눌리지 않도록
  document.addEventListener('click', e => {
    if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; }
  }, true);
}
