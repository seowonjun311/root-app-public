# CHARACTER V101N – Home ↔ 플로팅 캐릭터 handoff 체크리스트

## 목적

Home의 루티와 시스템 플로팅 캐릭터가 동시에 겹쳐 보이지 않도록 화면 소유권을 자연스럽게 넘깁니다.

## Home 진입

- [ ] 플로팅 캐릭터가 켜진 상태에서 ROOT Home으로 들어오면 시스템 오버레이가 사라짐
- [ ] foreground service 자체는 종료되지 않음
- [ ] V101M의 사용자 ON 상태는 그대로 유지됨
- [ ] Home의 기존 Rooty 행동 상태 머신은 그대로 동작함
- [ ] Home Rooty의 마을 좌표를 네이티브 화면 좌표로 강제 변환하지 않음

## Home 이탈

- [ ] 기록/크루/하루/탐험 등 다른 화면으로 이동하면 플로팅 캐릭터가 다시 나타남
- [ ] ROOT를 백그라운드로 보내도 플로팅 캐릭터가 다시 나타남
- [ ] 다시 나타날 때 이전 플로팅 위치가 유지됨
- [ ] 회전/해상도 변경이 있었다면 V101L geometry 보정 후 안전영역 안으로 복구됨
- [ ] 저장된 확대/축소 비율과 자동 이동 설정이 유지됨

## 중복 반응 방지

- [ ] Home에 있는 동안 플로팅 목표 말풍선이 화면 위에 별도로 나타나지 않음
- [ ] Home에 있는 동안 발생한 목표 완료를 Home 이탈 후 뒤늦게 플로팅 캐릭터가 다시 축하하지 않음
- [ ] Home에 있는 동안 발생한 생활/가계부 반응을 나중에 뒤늦게 재생하지 않음

## 사용자 OFF 의도

- [ ] 설정에서 캐릭터 OFF → Home 이동/이탈 후에도 다시 켜지지 않음
- [ ] foreground 알림의 숨기기 → 사용자 OFF로 저장됨
- [ ] 알림에서 숨긴 뒤 재부팅/앱 업데이트 후 캐릭터가 부활하지 않음

## 기존 기능 회귀

- [ ] 짧은 터치 반응 정상
- [ ] 길게 누르기 메뉴 정상
- [ ] 드래그 정상
- [ ] 핀치 크기조절 정상
- [ ] 자동 이동 정상
- [ ] sit/sleep/happy/touch 상태 정상
- [ ] 키보드 회피 정상
- [ ] 수면시간/빠른 조용히 정상
- [ ] 화면 OFF/ON 복구 정상
- [ ] 재부팅/앱 업데이트 복구 정상
- [ ] 캐릭터를 사용자가 OFF한 경우 복구하지 않음

## 개발 검증

- [ ] V101A~M verifier PASS
- [ ] V101N verifier PASS
- [ ] 캐릭터 asset verifier PASS
- [ ] TypeScript PASS
- [ ] Expo Android autolinking PASS
- [ ] git diff --check PASS
- [ ] 정확히 7개 파일만 변경
- [ ] working tree clean
- [ ] local main == origin/main

## 빌드

V101N에서도 Android 빌드는 의도적으로 보류합니다.
이후 네이티브 기능을 더 누적한 뒤 fresh development build 한 번으로 검증합니다.
