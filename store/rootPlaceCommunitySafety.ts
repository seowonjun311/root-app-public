// ROOT_EXPLORE_V12D_COMMUNITY_SAFETY

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';

import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  doc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';

export type RootPlaceCommunityReportReason =
  | 'wrong_or_misleading'
  | 'inappropriate_media'
  | 'wrong_place'
  | 'spam'
  | 'privacy'
  | 'other';

export type RootPlaceCommunitySafetyAction =
  | 'report'
  | 'hide'
  | 'unhide';

export type RootPlaceCommunitySafetyReport = {
  id: string;
  reporterUid: string;
  placeId: string;
  placeName: string;
  districtId: string;
  reason:
    RootPlaceCommunityReportReason;
  createdAt: string;
  status: 'pending';
  targetType:
    'public-place-community';
  publicApprovedReportCount: number;
  publicLastObservedAt: string;
};

const firebaseApp =
  getApp();

const firebaseAuth =
  getAuth(
    firebaseApp
  );

const firebaseDb =
  getFirestore(
    firebaseApp
  );

const HIDDEN_KEY_PREFIX =
  'root_place_public_community_hidden_v1';

function getScopeId() {
  const uid =
    firebaseAuth
      .currentUser
      ?.uid;

  return uid
    ? `uid:${uid}`
    : 'guest-device';
}

function getHiddenKey() {
  return (
    `${HIDDEN_KEY_PREFIX}:` +
    getScopeId()
  );
}

function normalizeIds(
  value: unknown
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item
          ) =>
            String(
              item ?? ''
            ).trim()
        )
        .filter(Boolean)
    )
  );
}

export async function
loadRootPlaceHiddenPublicCommunityIds() {
  const raw =
    await AsyncStorage
      .getItem(
        getHiddenKey()
      );

  if (!raw) {
    return [];
  }

  try {
    return normalizeIds(
      JSON.parse(
        raw
      )
    );
  } catch {
    return [];
  }
}

async function saveHiddenIds(
  ids: string[]
) {
  const normalized =
    normalizeIds(
      ids
    );

  await AsyncStorage
    .setItem(
      getHiddenKey(),
      JSON.stringify(
        normalized
      )
    );

  return normalized;
}

export async function
hideRootPlacePublicCommunity(
  placeId: string
) {
  const normalizedPlaceId =
    String(
      placeId ??
        ''
    ).trim();

  if (!normalizedPlaceId) {
    return (
      await loadRootPlaceHiddenPublicCommunityIds()
    );
  }

  const current =
    await loadRootPlaceHiddenPublicCommunityIds();

  return saveHiddenIds([
    ...current,
    normalizedPlaceId,
  ]);
}

export async function
unhideRootPlacePublicCommunity(
  placeId: string
) {
  const normalizedPlaceId =
    String(
      placeId ??
        ''
    ).trim();

  const current =
    await loadRootPlaceHiddenPublicCommunityIds();

  return saveHiddenIds(
    current.filter(
      (
        id
      ) =>
        id !==
        normalizedPlaceId
    )
  );
}

export function
applyRootPlacePublicCommunitySafety(
  place: any,
  hiddenPlaceIds:
    string[]
) {
  const placeId =
    String(
      place?.id ??
        ''
    );

  if (
    !hiddenPlaceIds.includes(
      placeId
    )
  ) {
    return {
      ...place,
      rootPublicCommunityHidden:
        false,
    };
  }

  return {
    ...place,
    approvedUserPhotoUrl:
      undefined,
    rootPublicCommunityPhotoCount:
      0,
    rootPublicApprovedReportCount:
      0,
    rootPublicCommunityHighlights:
      [],
    rootPublicLiveStatus:
      undefined,
    rootPublicCommunityLastObservedAt:
      '',
    rootPublicCommunityHidden:
      true,
  };
}

function makeReportId(
  uid: string,
  placeId: string
) {
  return (
    `${uid}_` +
    `${String(placeId).replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    )}_` +
    `${Date.now()}_` +
    `${Math.random()
      .toString(36)
      .slice(2, 8)}`
  );
}

async function
mirrorSafetyReportToModerationQueueBestEffort(
  report:
    RootPlaceCommunitySafetyReport
) {
  try {
    await setDoc(
      doc(
        firebaseDb,
        'rootPlaceCommunityReports',
        report.id
      ),
      report,
      {
        merge: false,
      }
    );

    console.log(
      'ROOT PLACE COMMUNITY SAFETY MODERATION QUEUE DONE',
      {
        reportId:
          report.id,
        placeId:
          report.placeId,
      }
    );
  } catch (error) {
    /*
     * V1.2D 규칙이 아직 배포되지 않아도
     * 사용자의 users/{uid} 신고 원본 저장은 성공해야 한다.
     */
    console.log(
      'ROOT PLACE COMMUNITY SAFETY MODERATION QUEUE DEFERRED',
      {
        reportId:
          report.id,
        error,
      }
    );
  }
}

export async function
reportRootPlacePublicCommunity({
  place,
  districtId,
  reason,
}: {
  place: any;
  districtId: string;
  reason:
    RootPlaceCommunityReportReason;
}) {
  const user =
    firebaseAuth.currentUser;

  if (!user?.uid) {
    const error =
      new Error(
        'ROOT_PLACE_SAFETY_AUTH_REQUIRED'
      );

    (
      error as any
    ).code =
      'ROOT_PLACE_SAFETY_AUTH_REQUIRED';

    throw error;
  }

  const placeId =
    String(
      place?.id ??
        ''
    ).trim();

  if (!placeId) {
    throw new Error(
      'ROOT_PLACE_SAFETY_PLACE_REQUIRED'
    );
  }

  const createdAt =
    new Date()
      .toISOString();

  const report:
    RootPlaceCommunitySafetyReport = {
      id:
        makeReportId(
          user.uid,
          placeId
        ),
      reporterUid:
        user.uid,
      placeId,
      placeName:
        String(
          place?.name ??
            'ROOT 탐험 장소'
        ),
      districtId:
        String(
          districtId ??
            ''
        ).trim(),
      reason,
      createdAt,
      status: 'pending',
      targetType:
        'public-place-community',
      publicApprovedReportCount:
        Math.max(
          0,
          Number(
            place
              ?.rootPublicApprovedReportCount ??
              0
          ) || 0
        ),
      publicLastObservedAt:
        String(
          place
            ?.rootPublicCommunityLastObservedAt ??
            ''
        ),
    };

  await setDoc(
    doc(
      firebaseDb,
      'users',
      user.uid
    ),
    {
      rootPlaceCommunitySafety: {
        version: 1,
        updatedAt:
          createdAt,
        reportsById: {
          [report.id]:
            report,
        },
      },
    },
    {
      merge: true,
    }
  );

  void mirrorSafetyReportToModerationQueueBestEffort(
    report
  );

  return report;
}

export function
getRootPlaceCommunitySafetyErrorMessage(
  error: unknown
) {
  const code =
    String(
      (
        error as any
      )?.code ??
        (
          error as any
        )?.message ??
        ''
    );

  if (
    code.includes(
      'ROOT_PLACE_SAFETY_AUTH_REQUIRED'
    )
  ) {
    return '로그인 후 커뮤니티 정보를 신고할 수 있어요.';
  }

  if (
    code.includes(
      'permission-denied'
    )
  ) {
    return 'Firebase 권한 설정 때문에 신고를 저장하지 못했어요.';
  }

  return '신고를 저장하지 못했어요. 잠시 후 다시 시도해주세요.';
}
