# ROOT 탐험 V1.2D1 Firebase Moderation Security Bootstrap

## 기준

V1.2D commit:

`225448a07cd4fd4fc279cfdce310fad0c79575b2`

V1.2D 코드에는 이미:

- 사용자 moderation intake
- 사용자 신고
- 사용자 로컬 숨김/다시 보기
- custom-claim 관리자 화면
- 승인/거절/숨김
- public aggregate 재계산
- moderation audit

가 들어 있다.

V1.2D1은 **실제 Firebase 배포 전 보안 운영 도구**를 준비한다.

## 절대 하지 않는 것

설치기는 다음을 자동으로 하지 않는다.

- live `firestore.rules` 덮어쓰기
- Firebase rules 배포
- 관리자 custom claim 변경
- 서비스 계정 JSON 생성/복사/커밋
- public Firestore 데이터 수정

실제 프로젝트 규칙과 credential을 확인하기 전 자동 배포하지 않는다.

## 1. 보안 preflight

프로젝트 루트:

```powershell
node .\scripts\run-explore-v12d1-security-preflight.mjs
```

확인 항목:

- Node.js 22+
- Firebase CLI
- firebase.json
- .firebaserc
- firestore.rules
- google-services.json project_id
- GOOGLE_APPLICATION_CREDENTIALS
- 현재 firestore.rules에 V1.2D moderation token 존재 여부

## 2. Rules fragment

파일:

`firebase/root-place-moderation.rules.fragment`

이 파일은 단독 배포 파일이 아니다.

현재 실제 `firestore.rules`의:

```text
service cloud.firestore {
  match /databases/{database}/documents {
    ...
  }
}
```

안쪽에 안전하게 병합해야 한다.

기존 `/users/{uid}` 규칙을 삭제하거나 대체하면 안 된다.

## 3. Firebase Admin 도구 설치

Firebase Admin Node SDK 14.2.0은 Node.js 22+ 환경을 사용한다.

```powershell
Set-Location C:\Users\cwoos\root-app-new\ops\root-place-admin

npm install
```

`node_modules`나 서비스 계정 JSON은 Git에 추가하지 않는다.

## 4. 서비스 계정 / ADC

로컬 Windows에서 서비스 계정 JSON을 사용할 경우 예:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\root-firebase-admin.json"
```

서비스 계정 파일은 ROOT 저장소 밖에 둔다.

## 5. 관리자 claim 검증

먼저 현재 claim 확인:

```powershell
node .\verify-moderator-claim.mjs --project <PROJECT_ID> --uid <UID>
```

관리자 claim 설정:

```powershell
node .\set-moderator-claim.mjs `
  --project <PROJECT_ID> `
  --uid <UID> `
  --confirm <PROJECT_ID>:<UID>
```

이 도구는 기존 custom claims를 먼저 읽고 보존한 뒤:

```text
rootModerator = true
```

만 추가한다.

해제:

```powershell
node .\set-moderator-claim.mjs `
  --project <PROJECT_ID> `
  --uid <UID> `
  --disable `
  --confirm <PROJECT_ID>:<UID>
```

## 6. 토큰 갱신

custom claim 변경 후 기존 로그인 세션의 ID token에는 즉시 반영되지 않을 수 있다.

앱에서 로그아웃 → 로그인하거나 ID token을 강제 갱신한 뒤 관리자 화면을 확인한다.

## 7. Firestore rules 배포

실제 `firestore.rules`에 fragment를 병합한 후 검토한다.

그 뒤 Firebase CLI가 올바른 프로젝트를 가리키는지 확인하고:

```powershell
firebase deploy --only firestore
```

를 사용한다.

멀티 프로젝트를 사용한다면 `firebase use` 결과를 반드시 먼저 확인한다.

## 8. 권한 실기기 검증

일반 사용자:

- moderation inbox create: 자신의 제보만 가능
- moderation inbox read/update: 거부
- approved private records: 거부
- public district aggregate read: 가능
- public district aggregate write: 거부
- moderation audit: 거부

관리자:

- moderation inbox read/update: 가능
- approved private records read/write: 가능
- public district aggregate write: 가능
- moderation audit create/read: 가능

## 9. V1.2E

V1.2D1은 임시 운영 보안 단계다.

최종 구조는 V1.2E에서:

```text
관리자 앱
  ↓ callable request
Cloud Functions/Admin SDK
  ↓
approved records
  ↓
public aggregate rebuild
  ↓
audit
```

로 바꾼다.

그 시점에는 일반 클라이언트와 관리자 클라이언트 모두
`rootPlacePublicCommunityDistricts`를 직접 write하지 않게 잠글 수 있다.
