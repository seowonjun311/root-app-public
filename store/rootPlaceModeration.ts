// ROOT_EXPLORE_V12D_MODERATION_WORKFLOW

import {
  getApp,
} from '@react-native-firebase/app';

import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

import type {
  RootPlaceCommunityRecord,
} from './rootPlaceCommunity';

import {
  buildRootPlacePublicDistrictAggregate,
  type RootPlaceApprovedCommunityRecord,
} from './rootPlacePublicCommunity';

import type {
  RootPlaceCommunitySafetyReport,
} from './rootPlaceCommunitySafety';

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

export type RootPlaceModerationDecision =
  | 'approve'
  | 'reject'
  | 'hide';

export type RootPlaceSafetyModerationDecision =
  | 'dismiss'
  | 'hide_public';

export type RootPlaceModerationInboxItem =
  Omit<
    RootPlaceCommunityRecord,
    'moderationStatus'
  > & {
    contributorUid: string;
    moderationStatus:
      | 'pending'
      | 'approved'
      | 'rejected'
      | 'hidden';
    publicVisible: boolean;
    submittedAt: string;
    moderatedAt?: string;
    moderatorUid?: string;
  };

type RootPlaceModerationApprovedRecord =
  RootPlaceApprovedCommunityRecord & {
    districtId: string;
  };

function sanitizeDocumentId(
  value: unknown
) {
  return (
    String(
      value ?? ''
    )
      .trim()
      .replace(
        /\//g,
        '_'
      ) ||
    'unknown'
  );
}

function getTimestamp(
  value: unknown
) {
  const parsed =
    Date.parse(
      String(
        value ?? ''
      )
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

export async function
getRootPlaceModeratorAccess(
  forceRefresh = false
) {
  const user =
    firebaseAuth.currentUser;

  if (!user?.uid) {
    return {
      allowed: false,
      uid: null as
        string | null,
      reason:
        'signed-out',
    };
  }

  const tokenResult =
    await user
      .getIdTokenResult(
        forceRefresh
      );

  const claims =
    (
      tokenResult
        .claims ??
      {}
    ) as
      Record<
        string,
        unknown
      >;

  const allowed =
    claims
      .rootModerator ===
      true ||
    claims
      .moderator ===
      true ||
    claims
      .admin ===
      true;

  return {
    allowed,
    uid:
      user.uid,
    reason:
      allowed
        ? 'custom-claim'
        : 'missing-claim',
  };
}

async function
requireModerator() {
  const access =
    await getRootPlaceModeratorAccess(
      false
    );

  if (
    !access.allowed ||
    !access.uid
  ) {
    const error =
      new Error(
        'ROOT_PLACE_MODERATOR_REQUIRED'
      );

    (
      error as any
    ).code =
      'ROOT_PLACE_MODERATOR_REQUIRED';

    throw error;
  }

  return access.uid;
}

function normalizeInboxItem(
  id: string,
  value: any
):
  RootPlaceModerationInboxItem |
  null {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return null;
  }

  const placeId =
    String(
      value.placeId ??
        ''
    ).trim();

  if (!placeId) {
    return null;
  }

  return {
    ...value,
    id:
      String(
        value.id ??
          id
      ),
    contributorUid:
      String(
        value.contributorUid ??
          value.userId ??
          ''
      ),
    districtId:
      String(
        value.districtId ??
          ''
      ),
    placeId,
    placeName:
      String(
        value.placeName ??
          'ROOT 탐험 장소'
      ),
    userId:
      String(
        value.userId ??
          value.contributorUid ??
          ''
      ),
    kind:
      value.kind ??
      'correction',
    createdAt:
      String(
        value.createdAt ??
          value.submittedAt ??
          ''
      ),
    observedAt:
      String(
        value.observedAt ??
          value.createdAt ??
          ''
      ),
    moderationStatus:
      value.moderationStatus ??
      'pending',
    publicVisible:
      value.publicVisible ===
      true,
    submittedAt:
      String(
        value.submittedAt ??
          value.createdAt ??
          ''
      ),
    source:
      'root-explore',
  };
}

export function
subscribeRootPlaceModerationInbox({
  onChange,
  onError,
}: {
  onChange:
    (
      items:
        RootPlaceModerationInboxItem[]
    ) => void;
  onError?:
    (
      error: unknown
    ) => void;
}) {
  const moderationQuery =
    query(
      collection(
        firebaseDb,
        'rootPlaceModerationInbox'
      ),
      where(
        'moderationStatus',
        '==',
        'pending'
      ),
      limit(
        100
      )
    );

  return onSnapshot(
    moderationQuery,
    (
      snapshot
    ) => {
      const items =
        snapshot.docs
          .map(
            (
              item
            ) =>
              normalizeInboxItem(
                item.id,
                item.data()
              )
          )
          .filter(
            (
              item
            ): item is
              RootPlaceModerationInboxItem =>
              item !== null
          )
          .sort(
            (
              first,
              second
            ) =>
              getTimestamp(
                second.submittedAt
              ) -
              getTimestamp(
                first.submittedAt
              )
          );

      onChange(
        items
      );
    },
    (
      error
    ) => {
      onError?.(
        error
      );
    }
  );
}

export function
subscribeRootPlaceCommunitySafetyReports({
  onChange,
  onError,
}: {
  onChange:
    (
      reports:
        RootPlaceCommunitySafetyReport[]
    ) => void;
  onError?:
    (
      error: unknown
    ) => void;
}) {
  const reportsQuery =
    query(
      collection(
        firebaseDb,
        'rootPlaceCommunityReports'
      ),
      where(
        'status',
        '==',
        'pending'
      ),
      limit(
        100
      )
    );

  return onSnapshot(
    reportsQuery,
    (
      snapshot
    ) => {
      const reports =
        snapshot.docs
          .map(
            (
              item
            ) => {
              const data =
                item.data() as
                  Partial<
                    RootPlaceCommunitySafetyReport
                  >;

              return {
                ...data,
                id:
                  String(
                    data.id ??
                      item.id
                  ),
              };
            }
          )
          .filter(
            (
              item
            ): item is
              RootPlaceCommunitySafetyReport =>
              Boolean(
                item &&
                String(
                  item.placeId ??
                    ''
                ).trim()
              )
          )
          .sort(
            (
              first,
              second
            ) =>
              getTimestamp(
                second.createdAt
              ) -
              getTimestamp(
                first.createdAt
              )
          );

      onChange(
        reports
      );
    },
    (
      error
    ) => {
      onError?.(
        error
      );
    }
  );
}

function toApprovedPublicRecord(
  item:
    RootPlaceModerationInboxItem
):
  RootPlaceModerationApprovedRecord {
  return {
    id:
      item.id,
    districtId:
      String(
        item.districtId
      ),
    placeId:
      item.placeId,
    kind:
      item.kind,
    value:
      item.value,
    valueLabel:
      item.valueLabel,
    observedAt:
      item.observedAt,
    createdAt:
      item.createdAt,
    moderationStatus:
      'approved',
    publicVisible:
      true,
    isRepresentative:
      false,
    media:
      item.media
        ? {
            mediaType:
              item.media
                .mediaType,
            downloadUrl:
              item.media
                .downloadUrl,
          }
        : undefined,
    liveStatus:
      item.liveStatus
        ? {
            openNow:
              item
                .liveStatus
                .openNow,
            waitingMinutes:
              item
                .liveStatus
                .waitingMinutes,
            outdoorOpen:
              item
                .liveStatus
                .outdoorOpen,
            rainAvailable:
              item
                .liveStatus
                .rainAvailable,
          }
        : undefined,
  };
}

export async function
rebuildRootPlacePublicCommunityDistrict(
  districtId: string
) {
  await requireModerator();

  const normalizedDistrictId =
    String(
      districtId ??
        ''
    ).trim();

  if (!normalizedDistrictId) {
    throw new Error(
      'ROOT_PLACE_MODERATION_DISTRICT_REQUIRED'
    );
  }

  const approvedQuery =
    query(
      collection(
        firebaseDb,
        'rootPlaceApprovedCommunityRecords'
      ),
      where(
        'districtId',
        '==',
        normalizedDistrictId
      ),
      limit(
        500
      )
    );

  const snapshot =
    await getDocs(
      approvedQuery
    );

  const approvedRecords =
    snapshot.docs
      .map(
        (
          item
        ) =>
          item.data() as
            RootPlaceModerationApprovedRecord
      )
      .filter(
        (
          item
        ): item is
          RootPlaceModerationApprovedRecord =>
          item
            .moderationStatus ===
            'approved' &&
          item
            .publicVisible ===
            true
      );

  const aggregate =
    buildRootPlacePublicDistrictAggregate({
      districtId:
        normalizedDistrictId,
      approvedRecords,
    });

  await setDoc(
    doc(
      firebaseDb,
      'rootPlacePublicCommunityDistricts',
      sanitizeDocumentId(
        normalizedDistrictId
      )
    ),
    aggregate,
    {
      merge: false,
    }
  );

  return aggregate;
}

export async function
moderateRootPlaceContribution({
  item,
  decision,
}: {
  item:
    RootPlaceModerationInboxItem;
  decision:
    RootPlaceModerationDecision;
}) {
  const moderatorUid =
    await requireModerator();

  const districtId =
    String(
      item.districtId ??
        ''
    ).trim();

  if (!districtId) {
    throw new Error(
      'ROOT_PLACE_MODERATION_DISTRICT_REQUIRED'
    );
  }

  const approvedRef =
    doc(
      firebaseDb,
      'rootPlaceApprovedCommunityRecords',
      item.id
    );

  if (
    decision ===
    'approve'
  ) {
    await setDoc(
      approvedRef,
      toApprovedPublicRecord(
        item
      ),
      {
        merge: false,
      }
    );
  } else {
    await setDoc(
      approvedRef,
      {
        id:
          item.id,
        districtId,
        placeId:
          item.placeId,
        moderationStatus:
          decision ===
          'reject'
            ? 'rejected'
            : 'hidden',
        publicVisible:
          false,
        updatedAt:
          new Date()
            .toISOString(),
      },
      {
        merge: true,
      }
    );
  }

  await rebuildRootPlacePublicCommunityDistrict(
    districtId
  );

  const moderatedAt =
    new Date()
      .toISOString();

  const auditId =
    `${item.id}_` +
    `${Date.now()}`;

  const batch =
    writeBatch(
      firebaseDb
    );

  batch.set(
    doc(
      firebaseDb,
      'rootPlaceModerationInbox',
      item.id
    ),
    {
      moderationStatus:
        decision ===
        'approve'
          ? 'approved'
          : decision ===
            'reject'
            ? 'rejected'
            : 'hidden',
      publicVisible:
        decision ===
        'approve',
      moderatorUid,
      moderatedAt,
    },
    {
      merge: true,
    }
  );

  batch.set(
    doc(
      firebaseDb,
      'rootPlaceModerationAudit',
      auditId
    ),
    {
      id:
        auditId,
      targetType:
        'contribution',
      targetId:
        item.id,
      placeId:
        item.placeId,
      districtId,
      action:
        decision,
      moderatorUid,
      moderatedAt,
    },
    {
      merge: false,
    }
  );

  await batch.commit();

  return {
    decision,
    moderatedAt,
  };
}

async function
hideApprovedPlaceCommunity(
  districtId: string,
  placeId: string
) {
  const approvedQuery =
    query(
      collection(
        firebaseDb,
        'rootPlaceApprovedCommunityRecords'
      ),
      where(
        'districtId',
        '==',
        districtId
      ),
      limit(
        500
      )
    );

  const snapshot =
    await getDocs(
      approvedQuery
    );

  const batch =
    writeBatch(
      firebaseDb
    );

  let changedCount =
    0;

  for (
    const item of
    snapshot.docs
  ) {
    const value =
      item.data();

    if (
      String(
        value?.placeId ??
          ''
      ) !==
      placeId
    ) {
      continue;
    }

    batch.set(
      item.ref,
      {
        publicVisible:
          false,
        moderationStatus:
          'hidden',
        updatedAt:
          new Date()
            .toISOString(),
      },
      {
        merge: true,
      }
    );

    changedCount +=
      1;
  }

  if (
    changedCount >
    0
  ) {
    await batch.commit();
  }

  await rebuildRootPlacePublicCommunityDistrict(
    districtId
  );

  return changedCount;
}

export async function
moderateRootPlaceSafetyReport({
  report,
  decision,
}: {
  report:
    RootPlaceCommunitySafetyReport;
  decision:
    RootPlaceSafetyModerationDecision;
}) {
  const moderatorUid =
    await requireModerator();

  const districtId =
    String(
      report.districtId ??
        ''
    ).trim();

  const placeId =
    String(
      report.placeId ??
        ''
    ).trim();

  if (
    !districtId ||
    !placeId
  ) {
    throw new Error(
      'ROOT_PLACE_SAFETY_REPORT_TARGET_REQUIRED'
    );
  }

  if (
    decision ===
    'hide_public'
  ) {
    await hideApprovedPlaceCommunity(
      districtId,
      placeId
    );
  }

  const moderatedAt =
    new Date()
      .toISOString();

  const auditId =
    `${report.id}_` +
    `${Date.now()}`;

  const batch =
    writeBatch(
      firebaseDb
    );

  batch.set(
    doc(
      firebaseDb,
      'rootPlaceCommunityReports',
      report.id
    ),
    {
      status:
        decision ===
        'hide_public'
          ? 'resolved_hidden'
          : 'dismissed',
      moderatorUid,
      moderatedAt,
    },
    {
      merge: true,
    }
  );

  batch.set(
    doc(
      firebaseDb,
      'rootPlaceModerationAudit',
      auditId
    ),
    {
      id:
        auditId,
      targetType:
        'community-report',
      targetId:
        report.id,
      placeId,
      districtId,
      action:
        decision,
      moderatorUid,
      moderatedAt,
      reason:
        report.reason,
    },
    {
      merge: false,
    }
  );

  await batch.commit();

  return {
    decision,
    moderatedAt,
  };
}

export function
getRootPlaceModerationErrorMessage(
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
      'ROOT_PLACE_MODERATOR_REQUIRED'
    )
  ) {
    return '관리자 권한이 있는 계정에서만 사용할 수 있어요.';
  }

  if (
    code.includes(
      'ROOT_PLACE_MODERATION_DISTRICT_REQUIRED'
    )
  ) {
    return '지역 정보가 없는 제보라 자동 승격할 수 없어요.';
  }

  if (
    code.includes(
      'permission-denied'
    )
  ) {
    return 'Firestore 관리자 보안 규칙이 아직 적용되지 않았거나 권한이 없어요.';
  }

  return '검수 작업을 완료하지 못했어요.';
}
