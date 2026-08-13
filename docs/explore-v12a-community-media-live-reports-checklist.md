# ROOT 탐험 V1.2A 사용자 미디어 · 현장 제보 저장

## 이번 단계

V1.0/V1.1에서 만든 ROOT 장소 카드와 지도 마커 위에
실제 사용자 사진·동영상 선택, Firebase Storage 업로드,
Firestore 제보 저장을 연결한다.

## 사용자 미디어

장소 카드의 `사진 추가하기` 또는 `사진`을 누른다.

- [ ] 사진/동영상 선택기가 열린다.
- [ ] 사진과 동영상 모두 선택 가능하다.
- [ ] 선택 취소 시 오류 없이 돌아온다.
- [ ] 로그인하지 않은 사용자는 업로드할 수 없다는 안내가 나온다.
- [ ] 사진 25MB 초과 시 제한 안내가 나온다.
- [ ] 동영상 100MB 초과 시 제한 안내가 나온다.
- [ ] 동영상 60초 초과 시 제한 안내가 나온다.
- [ ] Storage 업로드 성공 후 downloadUrl이 생성된다.
- [ ] Firestore 저장 실패 시 업로드한 Storage object 삭제를 시도한다.

### Storage 경로

새 규칙 경로를 임의로 추가하지 않고
기존 ROOT 공유/여행기 업로드와 같은 구조를 재사용한다.

`shared-posts/{uid}/{uid}_root_place_{placeId}_{time}_{mediaType}.{ext}`

## Firestore staging

V1.2A는 사용자가 제출한 원본을 바로 장소 공식정보로 덮어쓰지 않는다.

`users/{uid}.rootPlaceCommunityData`

아래 구조로 검수 대기 데이터를 저장한다.

- `contributionsById`
- `latestByPlace`
- `moderationStatus: pending`
- `observedAt`
- `source: root-explore`

V1.2B에서 이 staging 데이터를 읽어 최근 현장사진/최근 제보 UI와
공개 장소 집계 구조로 연결한다.

## 현장 제보

### 영업시간
- [ ] 지금 영업 중
- [ ] 지금 영업 종료
- [ ] 영업시간 수정 필요

### 웨이팅
- [ ] 없음
- [ ] 10분 내외
- [ ] 20분 내외
- [ ] 30분 이상

### 야장·야외석
- [ ] 야외석 운영 중
- [ ] 야외석 닫힘
- [ ] 확인 필요

### 우천
- [ ] 비 와도 가능
- [ ] 천막 자리만 가능
- [ ] 비 오면 어려움

### 방문
- [ ] 지금 방문 인증

### 정보 수정
- [ ] 정보 수정 필요

## liveStatus 구조

제보 record에는 가능한 경우 다음 값을 함께 기록한다.

- `openNow`
- `waitingMinutes`
- `outdoorOpen`
- `rainAvailable`
- `rainCoveredOnly`
- `visitVerified`

## 보존

- [ ] V1.0 장소 검색 / #야장 / #노포
- [ ] V1.0 ROOT 장소 카드
- [ ] V1.1 숫자 클러스터
- [ ] V1.1 확대 사진 마커
- [ ] 축제·행사
- [ ] 예약·시설
- [ ] 장소 상세
- [ ] V101Q2 캐릭터 코드 변경 없음
- [ ] package.json 변경 없음

## 실기기 Firebase 확인

정적 TypeScript 검증만으로 Firebase 보안 규칙과 실제 계정 권한까지
확정할 수는 없다. 로그인한 실기기에서 아래를 한 번 확인한다.

- [ ] 사진 1장 업로드 성공
- [ ] 동영상 1개 업로드 성공
- [ ] Firestore users/{uid}.rootPlaceCommunityData 생성 확인
- [ ] 영업시간 제보 저장
- [ ] 웨이팅 제보 저장
- [ ] 야외석 제보 저장
- [ ] 우천 제보 저장
- [ ] 방문 인증 저장
