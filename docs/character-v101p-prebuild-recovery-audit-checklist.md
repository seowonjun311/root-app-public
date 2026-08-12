# CHARACTER V101P v3 – 누적 Native pre-build 감사 + recovery edge-case 체크리스트

## 목적
V101A~O에서 누적된 Android floating character native 체인을 fresh development build 직전에 한 번 더 잠근다.
새 기능을 추가하지 않고, 사용자 OFF/권한/서비스 재생성/Home handoff 사이의 recovery race만 강화한다.

## 자동 감사 계약
- [ ] exact baseline = V101O commit
- [ ] V101A~O verifier 전부 PASS
- [ ] standard character asset verifier PASS
- [ ] TypeScript PASS
- [ ] Expo Android autolinking에서 root-floating-character resolve
- [ ] AndroidManifest byte-content unchanged
- [ ] exactly 4 files changed: Service / Home handoff hook / V101P verifier / checklist
- [ ] wake lock 추가 없음
- [ ] AccessibilityService 추가 없음
- [ ] restricted FGS type 추가 없음

## 사용자 OFF recovery
- [ ] 플로팅 캐릭터를 명시적으로 OFF한 뒤 stale START_STICKY 복구 경로가 실행되어도 캐릭터가 다시 나타나지 않음
- [ ] 알림의 `숨기기` 후에도 동일하게 다시 나타나지 않음
- [ ] repair 요청 직후 OFF가 들어와도 실제 repair 처리 시점에서 다시 OFF를 확인함
- [ ] position reset 요청 직후 OFF가 들어와도 캐릭터가 다시 attach되지 않음

## overlay 권한 recovery
- [ ] 권한이 없는 상태에서 START_STICKY 복구가 overlay를 만들지 않음
- [ ] repair/reset 처리 시점에 권한이 사라졌다면 overlay를 다시 붙이지 않음
- [ ] 권한을 다시 허용한 뒤 사용자 ON 상태에서 명시적 `플로팅 복구`는 정상 동작
- [ ] 권한을 다시 허용해도 사용자 OFF라면 복구 버튼이 ON 상태로 바꾸지 않음

## Home handoff service-recreation
- [ ] ROOT Home이 active일 때 system overlay가 분리됨
- [ ] Home active 중 service-only recreation이 발생해도 최대 heartbeat 주기 안에 handoff가 재확인되어 중복 캐릭터가 유지되지 않음
- [ ] Home에서 다른 탭으로 이동하면 heartbeat가 중단되고 overlay가 복귀함
- [ ] ROOT를 background로 보내면 heartbeat가 중단되고 overlay가 복귀함
- [ ] Home을 다시 열면 heartbeat가 다시 시작됨
- [ ] Home village x/y는 native floating x/y와 계속 독립적임

## 기존 recovery 회귀
- [ ] BOOT_COMPLETED restore는 사용자 ON + overlay 권한일 때만 동작
- [ ] MY_PACKAGE_REPLACED restore도 같은 조건을 따름
- [ ] LOCKED_BOOT_COMPLETED 사용 안 함
- [ ] 회전/해상도 변경 시 V101L 좌표 remap 유지
- [ ] screen OFF 시 visual runtime suspension 유지
- [ ] screen ON 시 기존 quiet/auto-move/behavior policy 복구
- [ ] V101O 런타임 진단의 service/user/permission/overlay/Home/screen/behavior/geometry 표시 유지
- [ ] V101O `상태 새로고침` / `플로팅 복구` / `위치 초기화` 유지

## 빌드 경계
V101P 자체는 Android build를 실행하지 않는다.
이 체크리스트의 기기 항목은 이후 fresh Android development build에서 확인한다.


## v3 verifier compatibility
- [ ] V101N original `state ===` / `active` hook expression remains byte-shape compatible with the legacy V101N regression verifier
- [ ] Heartbeat logic is additive and does not replace the original focus/AppState handoff expression

- [ ] V101O `repairVisibleRuntime()` keeps `homeHandoffActive` as the first guard, then re-checks user intent + permission before overlay repair
