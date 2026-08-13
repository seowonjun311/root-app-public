# ROOT PLACE V1.0 — 공통 장소 · 사진 메타데이터 · 제보 기반

## Baseline

- V1.2D10 commit: `118b934dd27c7d7bf4fab5fd958525faf37749eb`
- D10 self-only production SHA:
  `FA578EC3374BF692E4EFAB783511287EFEBCC5D39DB606CD7A3C34C1CB69470F`

## 이번 단계에서 연결되는 것

### 1. `rootPlaces/{placeId}`

ROOT 전체 장소의 canonical 문서다.

공통 필드:

- 장소명
- GPS
- 주소
- 카테고리
- 대표 테마
- 복수 테마
- 계절
- 태그
- 대표 태그
- 외부 provider/id
- 대표 이미지 포인터
- 검증 상태
- 최근 활동시각

카페, 야장, 노포, 맛집, 떡볶이, 해수욕장, 계곡, 실내/실외 수영장,
캠핑장, 축제, 문화, 자연/활동 장소가 같은 도메인을 사용한다.

Canonical 장소는 앱에서 직접 수정하지 않는다.
사용자 수정은 `rootPlaceReports`로 들어가고 승인 후 trusted Admin/Cloud
도구가 반영하는 구조다.

### 2. `rootPlaceMedia/{mediaId}`

사진/동영상 메타데이터 공통 계약이다.

V1.0은 스키마와 Rules만 연결한다.
실제 Storage 업로드와 썸네일/대표 이미지 선출은 V1.1에서 연결한다.

### 3. `rootPlaceReports/{reportId}`

사용자가 다음 내용을 제보할 수 있는 공통 기반:

- 새 장소
- 위치 수정
- 상호명
- 영업시간
- 폐업
- 이전
- 카테고리/태그
- 야외석 상태
- 계곡/물놀이 상태
- 웨이팅
- 사진 관련 제보
- 기타

회원은 본인의 pending 제보만 읽고 수정할 수 있다.
게스트 제보는 ROOT 로컬 queue에만 보존된다.

### 4. `rootPlaceVisits/{visitId}`

개인의 방문 기록은 private account-scoped 데이터다.

- 방문시각
- GPS
- GPS 인증 여부
- media ids
- 메모

공개 "최근 방문/현장 상태"는 이 private 문서를 직접 공개하지 않고
향후 별도의 allowlisted aggregate/projection으로 만든다.

### 5. 저장 카페 bridge

기존 `SavedCafeLocalEntry`를 파괴하거나 마이그레이션하지 않는다.

`rootPlaceSavedCafeBridge.ts`가 현재 저장 카페를 `RootPlaceSeed`로
변환하므로 기존 카페 기능을 유지하면서 공통 장소 엔진으로 점진적으로
이전할 수 있다.

## 보안

기존 D10:

- `/users/{uid}` self-only
- `rootUserPublicProfiles`
- `rootNicknames`
- `PRIVATE_USERS_LIST_QUERY = 0`

계약은 그대로 유지한다.

새 canonical `rootPlaces`는 signed-in read만 허용하며 client mutation은 막는다.
제보/방문/사용자 media metadata는 `authorUid == request.auth.uid` 계약을 사용한다.

## 다음

### ROOT PLACE V1.1

- 사진 + 동영상 Storage 업로드
- `rootPlaceMedia` 실제 create 연결
- 대표사진 후보
- 최근 사진 피드
- 사용자/ROOT 공식 media source 구분

### ROOT PLACE V1.2

- 장소 추가/수정 제보 UI
- 관리자 승인 파이프라인 foundation
- 새 장소 제보 → rootPlaces 승격

### ROOT PLACE V1.3

- 공통 지도
- 키워드/테마/계절 filter
- marker + 대표이미지
- 카페/야장/떡볶이/계곡/해수욕장 등 동일 지도 레이어
