# ROOT 공개 장소 커뮤니티 스키마 V1

## 1. 원본과 공개본 분리

### 사용자 원본

`users/{uid}.rootPlaceCommunityData`

사용자가 제출한 데이터의 원본이다.

상태:
- pending
- 향후 rejected / approved 상태 관리 가능

일반 사용자가 다른 사용자의 `users/{uid}` 문서를 직접 훑는 방식은 사용하지 않는다.

### 공개 집계

`rootPlacePublicCommunityDistricts/{districtId}`

검수 또는 서버 승격을 통과한 정보만 담는다.

앱 클라이언트는 read-only consumer다.

## 2. 공개 지역 문서

```ts
{
  version: 1,
  districtId: 'jongno',
  updatedAt: '...',
  revision: '...',
  moderationModel: 'approved-only',
  byPlaceId: {
    PLACE_ID: {
      placeId: 'PLACE_ID',
      representativePhotoUrl: 'https://...',
      recentPhotoUrls: ['https://...'],
      photoCount: 8,
      approvedReportCount: 12,
      latestObservedAt: '...',
      highlights: [
        {
          id: '...',
          kind: 'outdoor_status',
          label: '야외석 운영 중',
          observedAt: '...',
          reportCount: 3,
          confidence: 0.9
        }
      ],
      liveStatus: {
        outdoorOpen: {
          value: true,
          reportCount: 3,
          confidence: 1,
          observedAt: '...'
        },
        waitingMinutes: {
          value: 20,
          reportCount: 3,
          confidence: 1,
          observedAt: '...'
        }
      }
    }
  }
}
```

## 3. 승격 조건

공개 aggregate builder 입력은 다음 두 조건을 모두 만족해야 한다.

- `moderationStatus === 'approved'`
- `publicVisible === true`

pending 데이터를 public 문서에 그대로 복사하지 않는다.

## 4. 다음 운영 단계

V1.2D 이후에 별도 관리자/Cloud Function 파이프라인을 연결한다.

권장:
- 신고 누적
- 중복 사진 탐지
- 삭제/숨김
- 대표사진 승인
- 장소 폐업/이전 같은 고위험 수정은 다중 검증
- liveStatus는 시간 경과 시 자동 만료
- moderator audit log
