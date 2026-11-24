# LETS FIT
개인용 웨이트 트레이닝 기록 PWA. 아이폰 Safari 홈 화면 앱으로 사용.

## 구조
- src/main.js: 시작(boot), 화면 그리기(render), 버튼 동작(A), 이벤트, PWA 등록
- src/state.js: 메모리 상태 S, 화면 상태 V, 저장 예약(mark/flush), 계산 함수
- src/storage.js: IndexedDB(idb) — 모든 저장 코드는 여기에만
- src/backup.js: 백업 내보내기(공유 시트)·복원·7일 알림
- src/timer.js: 휴식 타이머(시각 기준, localStorage로 종료 후에도 이어짐)
- src/charts.js, src/sheets.js, src/ui.js, src/views/*.js

## 규칙
- 한국어 UI. 폰트: Inter + Noto Sans KR(Google Fonts). 숫자는 tabular-nums.
- 빌드: Vite + 바닐라 JS(ES 모듈). 프레임워크 추가 금지.
- 저장: IndexedDB(idb). 모든 저장 코드는 src/storage.js에만.
- 데이터 형식은 docs/schema.md를 따르고, 바꾸면 schema 번호를 올리고 마이그레이션을 추가.
- 백업 JSON은 app: 'setnote'(VER1)와 'letsfit'을 모두 복원 가능해야 함.
- 사용자가 입력한 문자열은 항상 escape 후 출력.
- 터치 영역 44px 이상, 입력 글자 16px 이상(iOS 자동 확대 방지).
- safe-area(env(safe-area-inset-*)) 유지.
- vite base '/letsfit/'는 바꾸지 않는다(주소가 바뀌면 아이폰 저장소가 새로 시작됨).

## 명령
- npm run dev / npm run build / npm run preview / npm run icons
- 배포: main 브랜치에 push하면 GitHub Actions가 Pages에 배포.

## 검증
- 변경 후 npm run build 성공 + 아이폰 14 화면 크기로 기록→완료→캘린더→분석 흐름 확인.
