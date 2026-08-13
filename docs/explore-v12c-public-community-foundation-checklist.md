# ROOT 탐험 V1.2C 공개 커뮤니티 기반

## 핵심 원칙

V1.2C부터 여러 사용자의 정보를 보여줄 수 있는 공개 구조를 준비한다.

하지만 사용자 `pending` 원본을 앱에서 직접 긁어모으지 않는다.

흐름은 반드시 다음처럼 분리한다.

`users/{uid}.rootPlaceCommunityData`
→ 검수/승격
→ `rootPlacePublicCommunityDistricts/{districtId}`
→ 일반 사용자 읽기

## 공개 Firestore 문서

한 장소마다 listener를 수십 개 만들지 않고
지역별 문서 1개를 구독한다.

`rootPlacePublicCommunityDistricts/{districtId}`

예상 구조:

- `version`
- `districtId`
- `updatedAt`
- `revision`
- `moderationModel: approved-only`
- `byPlaceId`

장소별 summary:

- `representativePhotoUrl`
- `recentPhotoUrls`
- `photoCount`
- `approvedReportCount`
- `latestObservedAt`
- `highlights`
- `liveStatus`

## 보안

- [ ] 앱 클라이언트에는 public aggregate write 함수가 없다.
- [ ] `setDoc/addDoc/updateDoc`로 public aggregate를 쓰지 않는다.
- [ ] 현재 사용자 pending 원본은 기존 users/{uid} 경로에 유지한다.
- [ ] 공개 데이터에는 approved + publicVisible 데이터만 승격한다.
- [ ] Firestore 규칙을 이번 설치기에서 임의 변경하지 않는다.

## 사진 우선순위

지도와 ROOT 장소 카드:

1. 현재 사용자의 pending 최신 사진
2. 승인된 공개 대표사진
3. ROOT/카탈로그 대표사진
4. 기본 장소 아이콘

사용자 본인이 방금 업로드한 사진은 검수 중이어도 본인 화면에서 먼저 볼 수 있다.
다른 사용자는 승인된 공개사진만 본다.

## 공개 커뮤니티 현황

승인된 데이터가 있으면 장소 카드에 별도 영역을 표시한다.

예:

`ROOT 커뮤니티 현황        승인 6`
- `야외석 운영 중 · 3명 · 12분 전`
- `20분 내외 · 2명 · 18분 전`
- `비 와도 가능 · 2명 · 1시간 전`

그 아래에 기존 개인 pending 영역:

`내 최근 현장 제보          검수 대기`

를 별도로 유지한다.

## liveStatus 집계 기반

V1.2C pure aggregate builder는 향후 관리자/Cloud Function에서 재사용할 수 있다.

- 영업 여부: 최근 12시간 승인 제보 다수결
- 야외석 여부: 최근 12시간 승인 제보 다수결
- 우천 이용: 최근 12시간 승인 제보 다수결
- 웨이팅: 최근 3시간 승인 제보의 중앙값
- confidence: 동의 비율 또는 최소 제보 수 기반

이 함수는 클라이언트에서 public Firestore write를 수행하지 않는다.

## 실기기

현재 public aggregate 문서가 아직 없다면 화면은 오류 없이 기존 V1.2B처럼 동작해야 한다.

- [ ] 문서 없음 → 빈 public snapshot
- [ ] 문서 있음 → 승인 사진/현황 hydrate
- [ ] public 읽기 권한 거부 → 기존 pending/카탈로그 화면 유지
- [ ] 지역 이동 → 이전 listener 해제 + 새 district listener
- [ ] public revision 변경 → Android marker tracking 재실행

## 보존

- [ ] V1.0 검색/#야장/#노포
- [ ] V1.1 숫자 클러스터/사진 마커
- [ ] V1.2A 실제 사진·동영상 업로드/현장 제보
- [ ] V1.2B 본인 pending hydrate
- [ ] 축제·행사
- [ ] 예약·시설
- [ ] 장소 상세
- [ ] V101Q2 캐릭터 코드
- [ ] package.json
