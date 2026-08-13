# ROOT 탐험 V1.2D 관리자 검수 · 신고/숨김

## 이번 단계

V1.2C의 공개 aggregate 기반 위에 다음 흐름을 연결한다.

사용자 제보 → moderation intake → 관리자 승인/거절/숨김 →
승인 record → 지역 공개 aggregate 재계산 → 일반 사용자 반영.

또 일반 사용자는 공개 커뮤니티 정보에 대해 신고하거나
자기 화면에서 숨길 수 있다.

## 사용자 제보 intake

V1.2A의 원본 저장:

`users/{uid}.rootPlaceCommunityData`

는 계속 authoritative user raw copy로 유지한다.

V1.2D는 성공한 제보를 추가로:

`rootPlaceModerationInbox/{contributionId}`

에 best-effort mirror한다.

중요:

- moderation Firestore rules가 아직 없거나 쓰기가 거부돼도
  users/{uid} 원본 제보 저장을 실패시키지 않는다.
- `ROOT PLACE MODERATION INTAKE DEFERRED` 로그로 확인한다.
- 새로운 제보에는 districtId가 포함된다.

## 관리자 권한

관리자 화면:

`/explore/moderation`

Firebase ID token custom claim 중 하나가 true일 때만 사용한다.

- `rootModerator`
- `moderator`
- `admin`

클라이언트 UI 숨김은 보안이 아니다.
Firestore Rules에서도 같은 custom claim을 반드시 검사해야 한다.

## 관리자 제보 처리

관리자 화면의 contribution:

- 승인
- 거절
- 숨김

승인 시:

1. `rootPlaceApprovedCommunityRecords/{id}`에 public-safe record 저장
2. district의 approved records 조회
3. V1.2C `buildRootPlacePublicDistrictAggregate()`로 재계산
4. `rootPlacePublicCommunityDistricts/{districtId}` 갱신
5. moderation inbox 상태 변경
6. `rootPlaceModerationAudit/{auditId}` 생성

공개 aggregate에는 contributor uid를 포함하지 않는다.

## 사용자 신고

ROOT 장소 카드의 공개 커뮤니티 영역에:

- 신고
- 숨기기
- 다시 보기

를 제공한다.

신고 원본은:

`users/{uid}.rootPlaceCommunitySafety.reportsById`

에 저장한다.

관리자 큐 mirror:

`rootPlaceCommunityReports/{reportId}`

는 best-effort다.

## 개인 숨김

`root_place_public_community_hidden_v1:{scope}`

AsyncStorage를 사용한다.

숨김은 공개 데이터 자체를 삭제하지 않는다.
해당 사용자의 화면에서만:

- 승인 사용자 대표사진
- 공개 승인 제보
- 공개 liveStatus

를 숨긴다.

현재 사용자가 직접 올린 pending 사진/제보는 별도 레이어라 유지된다.

## 신고 관리자 처리

관리자 화면:

- 신고 기각
- 공개 숨김

`공개 숨김`은 해당 장소에 속한 승인 records의 publicVisible을 false로 바꾸고
지역 aggregate를 다시 계산한다.

## audit

모든 관리자 action은:

`rootPlaceModerationAudit/{auditId}`

에 기록한다.

필드 예:

- targetType
- targetId
- placeId
- districtId
- action
- moderatorUid
- moderatedAt

## 실기기 확인

- [ ] 일반 사용자 사진 제보 후 원본 users/{uid} 저장 성공
- [ ] rules 적용 뒤 moderation inbox mirror 성공
- [ ] 일반 사용자는 /explore/moderation 진입 불가
- [ ] moderator custom claim 계정은 관리자 진입 버튼 표시
- [ ] 승인 시 공개 ROOT 커뮤니티에 반영
- [ ] 거절 시 공개 반영 안 됨
- [ ] 숨김 시 기존 공개 반영 제거
- [ ] 일반 사용자 신고 저장
- [ ] 일반 사용자 로컬 숨김/다시 보기
- [ ] 관리자 신고 기각
- [ ] 관리자 공개 숨김
- [ ] audit document 생성

## 다음 단계

V1.2E:
- 서버 Cloud Function/Admin SDK로 moderator write를 이전
- 관리자 앱은 callable/request만 전송
- 자동 스팸/중복 사진 검사
- 대표사진 수동 지정
- 폐업/이전 같은 stable fact 다중 승인
