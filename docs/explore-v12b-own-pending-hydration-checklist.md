# ROOT 탐험 V1.2B 내 제보 실시간 반영

## 목표

V1.2A에서 `users/{uid}.rootPlaceCommunityData`에 저장한
현재 로그인 사용자의 검수 대기 사진과 현장 제보를
다시 읽어서 탐험 지도와 ROOT 장소 카드에 즉시 반영한다.

이 단계는 아직 **전체 사용자 공개 집계가 아니다.**
보안 규칙을 넓히지 않고 현재 로그인 사용자가 직접 제출한
pending 데이터만 본인 화면에 hydrate한다.

## 지도 사진 마커

- [ ] 사용자가 장소에 사진을 업로드한다.
- [ ] Firestore user document snapshot이 갱신된다.
- [ ] 해당 장소가 `latestUserPhotoUrl`로 hydrate된다.
- [ ] 가까운 줌의 ROOT 원형 마커가 새 사진으로 갱신된다.
- [ ] 선택 장소 카드 hero 이미지도 같은 사진을 우선 사용한다.
- [ ] 공식/ROOT 대표사진 자체는 수정하지 않는다.
- [ ] 동영상은 썸네일 생성 전이므로 사진 마커로 사용하지 않는다.

### 사진 우선순위

현재 사용자 pending 사진 → ROOT/카탈로그 대표사진 → 기본 아이콘

pending 사진은 현재 사용자의 개인 화면에서만 우선한다.

## 최근 제보 하이라이트

장소 카드에 `내 최근 현장 제보 · 검수 대기` 패널을 표시한다.

최대 3개의 서로 다른 최신 항목을 표시한다.

예:
- `야외석 운영 중 · 8분 전`
- `20분 내외 · 12분 전`
- `비 와도 가능 · 1시간 전`
- `현장 사진을 추가했어요 · 2시간 전`

## 재실행/재진입

- [ ] 화면 재진입 시 Firestore `users/{uid}` snapshot을 다시 구독한다.
- [ ] 같은 계정의 기존 pending 기록도 다시 hydrate된다.
- [ ] 로그아웃/게스트 상태에서는 빈 community snapshot을 사용한다.
- [ ] 구독 해제 시 listener도 정리한다.

## Android 지도 갱신

react-native-maps Android marker view는 `tracksViewChanges=false` 상태에서
child image 변경이 즉시 보이지 않을 수 있으므로 community revision이 바뀌면
기존 V1.1 marker tracking effect를 다시 실행한다.

- [ ] 새 사진 업로드 후 marker tracking window가 다시 열린다.
- [ ] 사진이 로드된 뒤 기존 V1.1 방식대로 tracking이 다시 꺼진다.

## 보존

- [ ] V1.0 검색 / #야장 / #노포
- [ ] V1.0 ROOT 장소 카드
- [ ] V1.1 숫자 클러스터
- [ ] V1.1 확대 사진 마커
- [ ] V1.2A 사진/동영상 업로드
- [ ] V1.2A 영업시간/웨이팅/야외석/우천/방문/수정 제보
- [ ] 축제·행사
- [ ] 예약·시설
- [ ] 장소 상세
- [ ] V101Q2 캐릭터 코드 변경 없음

## 다음 V1.2C

전체 사용자에게 공유되는 커뮤니티 데이터는 별도 단계로 진행한다.

권장 구조:
- user pending 원본은 계속 `users/{uid}`에 보존
- moderation/promotion을 거친 공개 데이터만 별도 public place aggregate에 반영
- 공개 대표사진 선정
- 다수 사용자 최근 제보 집계
- 악성/중복 제보 신고·숨김·관리자 검수

V1.2B에서는 Firestore 보안 규칙을 임의로 넓히지 않는다.
