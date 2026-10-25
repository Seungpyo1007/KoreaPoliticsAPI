# KoreaPoliticsAPI

한국 정치 기록을 출처와 함께 모으는 공개 데이터셋. 레코드 하나에 JSON 파일 하나씩 둠. 처음 가져다 쓰는 곳은 [DEMOCRACY](https://github.com/Seungpyo1007/DEMOCRACY) 앱임.

## 들어 있는 것

- 정치인: 이름, 출생연도, 경력·학력
- 사진 메타데이터: 원본 주소, 라이선스, 저작자. 사진 파일은 없음
- 정당: 이름, 이전 이름, 존속 기간, 색과 색의 출처
- 여당 기간
- 자리: 국회의원 선거구, 시·도지사, 구청장·시장·군수
- 임기: 누가 어느 자리에 언제부터 언제까지 있었는지. 국회의원과 국회의장단은 제헌 국회부터 들어 있음
- 대수별 국회: 개원일, 종료일, 의원정수, 선거일, 정당별 득표율과 의석
- 국회 연표: 헌법 제정·개정, 대통령 탄핵소추 가결, 국회 해산과 임기 단축
- 선거공보 공약 제목
- 용어 설명과 팁

법안, 표결, 출석, 선거구별 개표 결과처럼 국회·선관위 API가 원본인 데이터는 여기 넣지 않음. 그쪽 API를 바로 쓰면 됨. 대수별 정당 의석은 국회 자료를 요약한 것이라 넣음.

## 폴더

```text
data/
  people/<id>.json
  photos/<person-id>.json
  parties/<id>.json
  ruling_periods.json
  assemblies/<number>.json
  events/<date>_<slug>.json
  offices/<type>/<code>.json
  terms/<type>/<code>/<starts-on>.json
  pledges/<election-id>/<type>/<code>.json
  tips/<id>.json
  _verify/status.json
schema/      타입별 JSON Schema
scripts/     검증기
```

## 출처

값마다 `source_urls`가 하나 이상 붙음. 출처에서 확인 안 되는 값은 `null`로 둠.

출처 등급은 `scripts/tiers.json`에 있음.

- T1: 국회, 선관위, 정부·지자체, 정당 공식 사이트. 하나만 있어도 됨
- T2: 언론 보도, 위키백과. 서로 다른 곳 두 개가 있어야 하고 하나뿐이면 yellow로 남음
- T3: 블로그 같은 곳. 참고만 하고 근거로는 안 씀
- 나무위키와 커뮤니티 게시판은 출처로 못 씀. CI에서 걸림

타입별 green/yellow/red 개수는 `data/_verify/status.json`에서 볼 수 있음.

## 쓰는 법

날짜 태그(`vYYYY.MM.DD`, 같은 날 두 번째부터는 `vYYYY.MM.DD.2`) 릴리스마다 타입별 JSON 배열과 `manifest.json`(파일별 sha256)을 붙임. manifest의 `schema_version`은 필드 이름을 바꾸거나 뺄 때만 올라감. Releases에서 받으면 됨. 개발 중인 최신 상태는 `develop`의 `data/`에 있음.

## 라이선스

- 코드(`schema/`, `scripts/`): MIT. [LICENSE](LICENSE)
- 데이터(`data/`): CC BY 4.0. [LICENSE-DATA](LICENSE-DATA)

데이터를 쓸 때는 "Data from KoreaPoliticsAPI"와 각 레코드의 원 출처를 같이 적어 주면 됨.

사진 메타데이터도 데이터 라이선스를 따름. 사진 자체는 이 레포에서 배포하지 않고 저작권과 초상권은 원 권리자에게 있음. 선거공보 공약은 본문 라이선스를 아직 확인 못 해서 제목만 넣음.

## 정정·삭제 요청

틀린 값은 이슈로 알려 주면 됨. 권리 침해나 개인정보 문제는 rush94434@gmail.com 으로 보내 주면 확인 후 해당 레코드를 다음 릴리스에서 뺌.
