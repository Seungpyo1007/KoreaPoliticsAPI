# 기여 안내

## 브랜치

| 브랜치 | 용도 |
|---|---|
| `main` | 릴리스. 태그는 `vYYYY.MM.DD` |
| `develop` | 기본 브랜치. PR은 여기로 |
| `data/*` `feat/*` `fix/*` `chore/*` | develop에서 따서 작업 |

`main`과 `develop`에는 직접 push 못 함. 레포 소유자도 마찬가지임. PR로만 들어가고 `validate` 체크를 통과해야 하고 base가 최신이어야 병합됨.

## 레코드 추가·수정

1. 파일을 만들거나 고침. 폴더와 필드는 `schema/`와 README의 폴더 구조를 따름
2. `deno task status`로 `data/_verify/status.json`을 갱신
3. `deno task ci`가 통과하는지 확인
4. PR을 올림

Deno 2.9 이상이 필요함.

## 레코드 규칙

- 값마다 `source_urls`를 하나 이상 붙임. 출처에 없는 값은 `null`로 두고 추측해서 채우지 않음
- 경력·학력은 항목마다 출처를 따로 붙임
- 문구는 출처에 적힌 그대로 옮김. 요약하거나 평가하는 말을 덧붙이지 않음
- id는 ASCII 소문자 kebab-case. 정치인은 로마자 이름 뒤에 출생연도를 붙임 (`gwak-sangeon-1971`)
- 정당 이름이 바뀌면 기존 파일을 고치지 않고 새 파일을 만든 뒤 `predecessor`로 이어 줌. 옛 기록이 옛 이름을 가리키고 있어서임
- 날짜는 `YYYY-MM-DD`. 기간은 시작일은 포함하고 끝나는 날은 포함하지 않음
- `verified: true`는 green 레코드를 사람이 PR에서 출처를 열어 확인했을 때만 씀. 자동으로 올리지 않음

## 넣지 않는 것

- 사진, PDF, 한글 문서 같은 파일. CI에서 걸림
- 선거공보 공약 본문. 제목과 쪽수만 넣음
- 나무위키, 커뮤니티 게시판 출처

새 출처 사이트를 쓰려면 `scripts/tiers.json`에 등급을 추가하는 PR을 같이 올리면 됨.

## 삭제 요청 처리

파일을 지우지 않고 `withdrawn: true`와 `withdrawn_reason`을 적음. 다음 릴리스부터 빠짐. 이슈에는 요청한 사람의 개인정보를 적지 않음.

## 커밋과 PR

- 커밋 메시지는 영어로 짧게 씀
- PR 설명은 한국어로, `.github/pull_request_template.md` 양식을 따름
