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
- id는 ASCII 소문자 kebab-case. 한 번 쓴 id는 다른 대상에 다시 쓰지 않음
- 정치인 id는 국어 로마자 표기법을 음절마다 그대로 적용하고 성과 이름 사이에만 하이픈을 넣은 뒤 출생연도를 붙임 (`gwak-sangeon-1971`, `i-jaemyeong-1964`). 이름 안의 음운 변화는 반영하지 않고 lee, park 같은 관용 표기도 안 씀. `scripts/romanize.ts`의 `personId`로 만들면 됨
- 이름과 출생연도까지 같은 사람이 이미 있으면 뒤에 `-2`를 붙임. 출처의 출생연도가 1850년보다 이르거나 첫 임기 때 25세가 안 되면 틀린 값으로 보고 비워 두며, 그런 사람은 id에 연도가 없음
- 국회 선거구는 선거 때마다 다시 그어져서 대수별로 따로 둠 (`seoul-gwangjingueul-15`, `proportional-21`, `jeonguk-13`). 22대만 DEMOCRACY와 같은 `nec-` id를 씀
- 국회의장과 부의장은 `speaker/<대>`, `deputy-speaker/<대>` 자리에 임기로 넣음. 임시의장은 `how`를 `acting`으로 씀
- 비례대표처럼 여러 석인 자리는 office에 `seats`를 적고, 임기 파일 이름은 `<시작일>_<person-id>.json`으로 씀
- 정당 `name`은 선관위·국회 표기 그대로 씀. 이 이름으로 정당을 찾는 곳이 있어서 줄이거나 바꿔 적지 않음
- 임기의 `party_id`는 임기를 시작할 때 소속 정당. 비례대표 승계는 `how`를 `succession`으로 씀
- 21대 이전 임기는 이름이 같은 다른 정당을 아직 구분하지 못해서 `party_id`를 비우고 국회 자료의 정당 표기를 `party_name`에 둠
- 정당 이름이 바뀌면 기존 파일을 고치지 않고 새 파일을 만든 뒤 `predecessor`로 이어 줌. 옛 기록이 옛 이름을 가리키고 있어서임
- 날짜는 `YYYY-MM-DD`. 기간은 시작일은 포함하고 끝나는 날은 포함하지 않음
- `verified: true`는 green 레코드를 사람이 PR에서 출처를 열어 확인했을 때만 씀. 자동으로 올리지 않음

## 넣지 않는 것

- 사진, PDF, 한글 문서 같은 파일. CI에서 걸림
- 선거공보 공약 본문. 제목과 쪽수만 넣음
- 공약을 지켰는지에 대한 판정
- 나무위키, 커뮤니티 게시판 출처

새 출처 사이트를 쓰려면 `scripts/tiers.json`에 등급을 추가하는 PR을 같이 올리면 됨.

## 삭제 요청 처리

파일을 지우지 않고 `withdrawn: true`와 `withdrawn_reason`을 적음. 다음 릴리스부터 빠짐. 이슈에는 요청한 사람의 개인정보를 적지 않음.

## 커밋과 PR

- 커밋 메시지는 영어로 짧게 씀
- PR 설명은 한국어로, `.github/pull_request_template.md` 양식을 따름
