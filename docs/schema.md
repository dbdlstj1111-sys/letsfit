# 데이터 형식 (schema 1)

IndexedDB 이름 `letsfit`, 버전 1.

| 저장소 | 키 | 내용 |
| --- | --- | --- |
| `workouts` | `id` (keyPath) | 운동 기록 1건 |
| `meta` | `'meta'` | 루틴·직접 추가 운동·설정 |
| `kv` | 문자열 | 앱 내부 값 (`lastBackupAt`) — 백업에 포함하지 않음 |

## workout
`id`(w-…), `date`(YYYY-MM-DD), `start`(준비 중이면 null), `end`(ms, 진행 중이면 null), `planned`(true면 시작 전 준비 화면), `pausedAt`, `pausedMs`, `intensity`(1~5), `note`, `items[]`, `updatedAt`.
삭제는 `{id, deleted: true, updatedAt}` 형태로 남긴다(나중에 동기화용).

- item: `ex`(운동 id), `rest`(초 또는 null), `sets[]`
- set: `t`(N 일반 / W 웜업 / D 드롭), `w`(kg), `r`(회), `rpe`, `done`, `restS`(실제 휴식 초), `auto`({w, r}: 앞 세트를 따라 자동으로 채워진 칸, 선택)

## meta
`routines[]` (`{id, name, items: [{ex, sets, r, w}]}`), `custom[]` (`{id, name, part, eq}`), `settings.rest`, `settings.theme{acc, mode}`, `updatedAt`.

## 백업 파일
```json
{"app": "letsfit", "schema": 1, "v": 1, "exported": "ISO 시각", "meta": {...}, "workouts": [...]}
```
VER1 백업(`app: "setnote"`, schema 없음)도 그대로 복원한다. 형식을 바꾸면 `SCHEMA`(src/storage.js)를 올리고 복원 시 변환 함수를 추가한다.

## localStorage (보조)
- `letsfit.rest`: 진행 중인 휴식 타이머
- `letsfit.fallback`: IndexedDB 저장 실패 시 비상 사본(다음 실행 때 합친 뒤 삭제)
- `setnote.v1`: VER1 데이터. 같은 주소에서 발견되면 첫 실행 때 옮기고 `setnote.v1.migrated`로 보관
