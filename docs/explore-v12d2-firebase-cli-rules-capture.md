# ROOT 탐험 V1.2D2 Firebase CLI + 현재 Firestore Rules 확보

## 기준

V1.2D1:

`7a15a9f675cc7a0012022f61d0c027ee6d8f4388`

현재 확인된 Firebase project ID:

`root-c7949`

## 목적

이번 단계에서는 실제 운영 Firestore Rules를 덮어쓰지 않는다.

먼저:

1. Firebase CLI 설치/로그인 준비
2. Firebase Admin SDK credential 준비
3. 현재 배포 중인 Firestore Rules 원본 백업
4. V1.2D moderation fragment를 로컬 candidate에만 병합
5. current ↔ candidate 검토

까지만 수행한다.

## Firebase CLI

공식 Firebase CLI 설치 방식:

```powershell
npm install -g firebase-tools
```

설치 후:

```powershell
firebase --version
firebase login
firebase projects:list
```

`root-c7949`가 표시되는지 확인한다.

## Firebase Admin credential

Firestore Rules 원본 export는 Firebase Admin SDK의
`getFirestoreRuleset()`을 사용한다.

서비스 계정 JSON은 저장소에 넣지 않는다.

예:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\root-firebase-admin.json"
```

## 현재 Rules 확보

프로젝트 루트에서:

```powershell
Set-Location C:\Users\cwoos\root-app-new

.\scripts\run-explore-v12d2-rules-capture.ps1
```

동작:

- live Firestore ruleset 조회
- 현재 source를 `tmp/firebase-live-rules/<timestamp>/firestore.rules.current`로 저장
- moderation fragment를 로컬에서 병합
- `firestore.rules.candidate` 생성
- current/candidate SHA256 출력

## 안전장치

다음 경우 candidate 자동 병합을 중단한다.

- live rules source가 여러 파일인데 firestore.rules를 하나로 안전하게 고를 수 없음
- `service cloud.firestore` 블록이 정확히 하나가 아님
- `/databases/{database}/documents` 블록이 정확히 하나가 아님
- 현재 rules에 이미 moderation collection token이 존재함
- 구조적 중괄호 경계를 안전하게 찾지 못함

## 절대 하지 않는 것

이 단계의 export/merge 도구에는 다음 기능이 없다.

- `firebase deploy`
- `releaseFirestoreRuleset`
- `releaseFirestoreRulesetFromSource`
- `setCustomUserClaims`
- public Firestore write

즉 실수로 운영 Rules가 변경되지 않는다.

## 다음 확인

capture 성공 후 다음 두 파일을 비교한다.

```text
firestore.rules.current
firestore.rules.candidate
```

candidate에는 기존 rules 전체가 그대로 있고
`match /databases/{database}/documents` 블록 안에
V1.2D moderation rules만 추가되어야 한다.

검토가 끝난 뒤에만 다음 V1.2D3에서:

- `firestore.rules`
- `firebase.json`
- `.firebaserc`
- rules syntax/semantic test
- 실제 deploy 직전 hash confirmation

을 진행한다.
