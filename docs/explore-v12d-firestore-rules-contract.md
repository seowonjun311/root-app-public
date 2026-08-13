# ROOT 탐험 V1.2D Firestore Rules 계약

이 문서는 규칙 **제안안**이다.
설치기가 현재 프로젝트의 실제 `firestore.rules` 파일을 자동 수정하지 않는다.

현재 운영 Rules와 병합한 뒤 Firebase에 별도로 배포해야 한다.

## moderator claim

```rules
function isRootPlaceModerator() {
  return request.auth != null
    && (
      request.auth.token.rootModerator == true
      || request.auth.token.moderator == true
      || request.auth.token.admin == true
    );
}
```

custom claim은 신뢰할 수 있는 Admin SDK/서버 환경에서만 부여한다.

## moderation inbox

```rules
match /rootPlaceModerationInbox/{contributionId} {
  allow create: if request.auth != null
    && request.resource.data.contributorUid == request.auth.uid
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.moderationStatus == 'pending'
    && request.resource.data.publicVisible == false;

  allow read, update: if isRootPlaceModerator();
  allow delete: if false;
}
```

## approved private records

```rules
match /rootPlaceApprovedCommunityRecords/{recordId} {
  allow read, write: if isRootPlaceModerator();
}
```

이 collection은 일반 사용자에게 공개하지 않는다.
공개 화면은 district aggregate만 읽는다.

## public district aggregate

```rules
match /rootPlacePublicCommunityDistricts/{districtId} {
  allow read: if true;
  allow write: if isRootPlaceModerator();
}
```

V1.2E에서 Cloud Function/Admin SDK promotion으로 이전하면
클라이언트 write를 다시 `false`로 잠그는 것이 최종 목표다.

## user reports

사용자 자신의 `users/{uid}` 쓰기 규칙은 기존 프로젝트 규칙을 유지한다.

관리자 mirror:

```rules
match /rootPlaceCommunityReports/{reportId} {
  allow create: if request.auth != null
    && request.resource.data.reporterUid == request.auth.uid
    && request.resource.data.status == 'pending';

  allow read, update: if isRootPlaceModerator();
  allow delete: if false;
}
```

## audit

```rules
match /rootPlaceModerationAudit/{auditId} {
  allow read, create: if isRootPlaceModerator();
  allow update, delete: if false;
}
```

## 중요한 배포 순서

1. moderator custom claim을 Admin SDK에서 설정
2. 사용자 계정 로그아웃/로그인 또는 token refresh
3. Rules 병합/배포
4. 일반 사용자 intake/report create 확인
5. 일반 사용자의 moderation read/write 거부 확인
6. moderator queue read 확인
7. moderator approve 후 public aggregate write 확인
8. audit create 확인
