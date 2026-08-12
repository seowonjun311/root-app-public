# CHARACTER V101Q2 auxiliary overlay position tune

## 목적

실기기에서 말풍선과 길게 누르기 메뉴가 캐릭터의 실제 머리보다
너무 위에 떠 보이는 시각적 간격을 줄인다.

## 변경

- 말풍선 위쪽 배치 offset: `72dp -> 56dp`
  - 화면상 약 `16dp` 아래로 이동
- 길게 누르기 메뉴 offset: `112dp -> 92dp`
  - 화면상 약 `20dp` 아래로 이동
- X축 중앙 정렬은 변경하지 않음
- 화면 상단 공간이 부족할 때 캐릭터 아래쪽에 표시하는 fallback은 변경하지 않음
- 드래그 중 auxiliary overlay 위치 추적은 변경하지 않음

## 실기기 확인

- [ ] 일반 말풍선이 캐릭터 머리 바로 위에 자연스럽게 보인다.
- [ ] 말풍선이 캐릭터 얼굴을 가리지 않는다.
- [ ] 길게 누르면 `화면에서 숨기기 / ROOT 가기` 메뉴가 캐릭터에 더 가깝게 표시된다.
- [ ] 메뉴가 캐릭터 머리와 겹치지 않는다.
- [ ] 캐릭터를 화면 위쪽으로 옮겼을 때 기존 아래쪽 fallback이 정상 작동한다.
- [ ] 캐릭터 드래그 중 말풍선/메뉴가 함께 따라온다.
- [ ] 화면 회전·화면 OFF/ON 이후 위치가 정상이다.

## 보존

- [ ] V101P recovery verifier
- [ ] V101Q1 Kotlin interpolation verifier
- [ ] 캐릭터 assets
- [ ] TypeScript
- [ ] Expo Android autolinking
- [ ] AndroidManifest 변경 없음
- [ ] native bridge 변경 없음
- [ ] settings 변경 없음
- [ ] PNG 변경 없음
