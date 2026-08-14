# CREW CHAT V1.2

## Included

- `rootModerator` 전용 크루 메시지 신고 검토 화면
- 신고 `문제없음` 처리 또는 메시지·첨부 사진 삭제
- 검토자 UID, 처리 시각, 처리 결과를 신고 문서에 감사 정보로 보존
- 채팅 사진을 누르면 원본 비율 전체화면 뷰어 표시
- 로그인 기기의 Expo Push Token을 `users/{uid}/pushTokens/{tokenId}`에 본인 권한으로 등록
- 새 메시지 생성 시 서울 리전 Firebase Function이 작성자를 제외한 현재 크루원에게 알림 발송
- 알림을 누르면 `/crew-chat?id={crewId}`로 이동
- 등록 해제된 Expo 토큰은 Function이 자동 비활성화

## Security boundaries

- 일반 크루원과 크루장은 신고 상태를 변경할 수 없다.
- `rootModerator`만 신고를 처리하고 신고된 메시지·사진을 삭제할 수 있다.
- Push Token은 소유자만 읽고 쓸 수 있으며 다른 사용자는 열람할 수 없다.
- 클라이언트는 다른 멤버의 Push Token을 읽지 않는다. 발송 대상 계산과 Expo Push 요청은 Admin SDK Function만 수행한다.
- Function은 메시지 문서가 실제로 생성될 때만 실행하고, 작성자와 현재 멤버 목록을 서버에서 다시 확인한다.
- V1/V1.1 메시지, 답장, 반응, 신고 생성, 사진 업로드 규칙은 그대로 호환된다.

## Native verification

원격 푸시는 Expo Go가 아닌 새 development/release build와 실제 Android 기기에서 확인한다.

1. 서로 다른 크루원 계정 두 개로 로그인한다.
2. 두 기기 모두 크루 채팅에 한 번 진입해 알림 권한과 Push Token 등록을 완료한다.
3. A가 메시지를 보내고 B의 앱을 백그라운드/종료한 상태에서 알림을 확인한다.
4. 알림을 눌러 정확한 크루 채팅으로 이동하는지 확인한다.
5. 사진을 누르고 전체화면 표시·닫기를 확인한다.
6. 신고 후 `rootModerator` 계정에서 문제없음/메시지 삭제를 각각 확인한다.
