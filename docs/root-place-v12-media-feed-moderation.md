# ROOT PLACE V1.2 장소 미디어 피드 · 검수

## 기준선

- ROOT PLACE V1.1 commit:
  `d3c8d6afd8332bcc4534b9d2a45678e0a8b9121b`
- V1.1의 Storage 경로와 업로드 제한을 그대로 유지한다.
- V1.2는 `rootPlaceMedia`를 장소 카드와 관리자 검수 화면에 연결한다.

## 사용자 흐름

1. 장소 카드의 대표 이미지 또는 `사진` 탭을 누른다.
2. 공개 미디어, 내 업로드, 게스트 임시 미디어를 한 피드에서 확인한다.
3. `사진·동영상 추가` 또는 `사진 추가하기`를 누른다.
4. 로그인 회원은 Storage 업로드 후 `pending`으로 저장한다.
5. 게스트는 서버에 쓰지 않고 기기에만 임시 저장한다.
6. 회원은 본인 미디어를 Storage 파일과 메타데이터까지 함께 삭제할 수 있다.

## 대표 이미지

- 최신 `visible` 사진을 먼저 사용한다.
- 공개 사진이 없고 공개 동영상만 있으면 동영상이 대표 미디어 후보가 된다.
- 장소 카드 이미지는 공개 사진 URL을 기존 카탈로그 이미지보다 우선 표시한다.
- 검수 대기와 숨김 미디어는 다른 사용자 대표 이미지가 되지 않는다.

## 관리자 검수

`/explore/moderation`의 기존 custom claim 검사를 그대로 사용한다.

- `rootModerator`
- `moderator`
- `admin`

관리자는 `rootPlaceMedia`의 `pending` 항목만 조회하고 다음 결정을 내린다.

- 공개 승인: `pending → visible`
- 숨김: `pending → hidden`

결정 시 `status`와 `updatedAt`만 변경할 수 있으며 작성자, 장소, Storage 경로,
다운로드 URL 등 미디어 정체성 필드는 바꿀 수 없다. 모든 결정은
`rootPlaceModerationAudit`에도 기록한다.

## Firestore 보안

- 일반 로그인 사용자: `visible` 또는 본인 미디어만 조회
- 관리자: 검수용 `pending` 조회 허용
- 일반 사용자: `pending → visible` 자체 승격 금지 유지
- 관리자: `pending → visible/hidden`만 허용
- 관리자 변경 필드: `status`, `updatedAt`만 허용

## Expo SDK 54

- `expo-image-picker ~17.0.11`
- `expo-video ~3.0.16`
- iOS 동영상 선택 전에 미디어 라이브러리 권한을 요청한다.
- 동영상 피드는 `VideoView`와 기기 기본 컨트롤을 사용한다.
- Android 피드의 여러 영상 surface 충돌을 피하도록 `textureView`를 사용한다.

## 실기기 확인

- [ ] 장소 카드 대표 이미지 터치 시 미디어 피드가 열린다.
- [ ] 장소 카드 `사진` 탭에서 미디어 피드가 열린다.
- [ ] `사진 추가하기`가 canonical V1.1 업로드 API를 사용한다.
- [ ] 회원 사진 업로드 후 `검수 대기`로 표시된다.
- [ ] 회원 동영상 업로드 후 피드에서 재생된다.
- [ ] 게스트 선택 항목이 서버에 업로드되지 않고 임시 피드에만 표시된다.
- [ ] 본인 미디어 삭제 시 Storage와 Firestore가 함께 삭제된다.
- [ ] 일반 사용자는 다른 사용자의 pending 미디어를 읽을 수 없다.
- [ ] 일반 사용자는 pending을 visible로 바꿀 수 없다.
- [ ] 관리자는 pending 사진·동영상을 미리 볼 수 있다.
- [ ] 관리자 공개 승인 후 일반 로그인 사용자의 피드와 대표 이미지에 반영된다.
- [ ] 관리자 숨김 후 일반 사용자 피드에 표시되지 않는다.
- [ ] 검수 결정이 moderation audit에 기록된다.
- [ ] 기존 현장정보 제보·신고·공개 aggregate 흐름이 유지된다.

## 다음 단계

ROOT PLACE V1.3:

- 미디어 신고 대상을 개별 `mediaId`까지 확장
- 서버 썸네일 생성
- 대표 이미지 관리자 수동 고정
- 중복·유해 이미지 자동 검사
- 게스트 임시 미디어의 로그인 후 재업로드 안내
