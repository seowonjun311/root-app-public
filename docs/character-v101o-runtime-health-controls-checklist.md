# CHARACTER V101O – 플로팅 캐릭터 런타임 진단 · 안전 복구 체크리스트

## 진단 카드
- [ ] 사용자 설정 ON/OFF 표시
- [ ] Foreground service 실행/중지 표시
- [ ] 실제 오버레이 뷰 부착/분리 표시
- [ ] Home handoff 활성/해제 표시
- [ ] 화면 ON/OFF 표시
- [ ] 현재 행동 idle/walk/sit/sleep/happy/touch 표시
- [ ] 현재/저장 x,y와 화면 px 크기 표시
- [ ] 저장 scale 표시

## 상태 새로고침
- [ ] 버튼을 누르면 즉시 native 상태를 다시 읽음
- [ ] 앱을 다시 active로 가져와도 상태가 갱신됨

## 플로팅 복구
- [ ] 사용자 OFF이면 자동으로 ON으로 바꾸지 않음
- [ ] overlay 권한이 없으면 권한 필요 안내
- [ ] service가 꺼졌지만 userEnabled=true이면 service 재시작 요청
- [ ] service는 살아있고 overlay만 빠졌다면 overlay 재부착
- [ ] Home handoff 중이면 시스템 overlay를 겹쳐 띄우지 않음
- [ ] screen OFF 상태에서 애니메이션/말풍선을 억지로 재개하지 않음

## 위치 초기화
- [ ] 확인창 후 x/y + 저장 display geometry만 초기화
- [ ] 기본 위치 x=18dp, y=180dp로 복구
- [ ] scale 유지
- [ ] autoMove 설정 유지
- [ ] userEnabled ON/OFF 유지
- [ ] Home handoff 중이면 Home 위에 overlay를 붙이지 않고 다음 release 때 기본 위치 사용

## 회귀
- [ ] V101N Home handoff 유지
- [ ] V101M reboot/package restore 유지
- [ ] V101L rotation/resolution geometry 유지
- [ ] V101J behavior state machine 유지
- [ ] AndroidManifest/권한 변경 없음
- [ ] wake lock 없음
- [ ] AccessibilityService 없음

## 빌드
V101O도 기존 누적 native 변경과 함께 나중 fresh Android development build에서 실기기 검증합니다.
