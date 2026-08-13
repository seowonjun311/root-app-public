// ROOT_EXPLORE_V12C_PUBLIC_COMMUNITY_FOUNDATION

import {
  getApp,
} from '@react-native-firebase/app';

import {
  doc,
  getFirestore,
  onSnapshot,
} from '@react-native-firebase/firestore';

import type {
  RootPlaceContributionKind,
} from './rootExplorePlace';

const firebaseApp =
  getApp();

const firebaseDb =
  getFirestore(
    firebaseApp
  );

const LIVE_STATUS_WINDOW_MS =
  12 * 60 * 60 * 1000;

const WAITING_WINDOW_MS =
  3 * 60 * 60 * 1000;

export type RootPlacePublicHighlight = {
  id: string;
  kind:
    RootPlaceContributionKind;
  label: string;
  observedAt: string;
  reportCount: number;
  confidence: number;
};

export type RootPlacePublicConsensus<
  T
> = {
  value: T;
  reportCount: number;
  confidence: number;
  observedAt: string;
};

export type RootPlacePublicLiveStatus = {
  openNow?:
    RootPlacePublicConsensus<
      boolean
    >;
  waitingMinutes?:
    RootPlacePublicConsensus<
      number
    >;
  outdoorOpen?:
    RootPlacePublicConsensus<
      boolean
    >;
  rainAvailable?:
    RootPlacePublicConsensus<
      boolean
    >;
};

export type RootPlacePublicPlaceSummary = {
  placeId: string;
  representativePhotoUrl: string;
  recentPhotoUrls: string[];
  photoCount: number;
  approvedReportCount: number;
  latestObservedAt: string;
  highlights:
    RootPlacePublicHighlight[];
  liveStatus:
    RootPlacePublicLiveStatus;
};

export type RootPlacePublicDistrictSnapshot = {
  districtId: string;
  updatedAt: string;
  revision: string;
  byPlaceId:
    Record<
      string,
      RootPlacePublicPlaceSummary
    >;
};

export type RootPlaceApprovedCommunityRecord = {
  id: string;
  placeId: string;
  kind:
    RootPlaceContributionKind;
  value?: string;
  valueLabel?: string;
  observedAt: string;
  createdAt?: string;
  moderationStatus:
    'approved';
  publicVisible:
    true;
  isRepresentative?: boolean;
  media?: {
    mediaType:
      | 'photo'
      | 'video';
    downloadUrl: string;
  };
  liveStatus?: {
    openNow?: boolean;
    waitingMinutes?: number;
    outdoorOpen?: boolean;
    rainAvailable?: boolean;
  };
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

function toFiniteTimestamp(
  value: unknown
) {
  const timestamp =
    Date.parse(
      String(
        value ?? ''
      )
    );

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}

function clampConfidence(
  value: number
) {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

function normalizeStringArray(
  value: unknown,
  limit = 8
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
  ).slice(
    0,
    limit
  );
}

function normalizePublicHighlight(
  value: any,
  index: number
):
  RootPlacePublicHighlight | null {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return null;
  }

  const label =
    String(
      value.label ??
        ''
    ).trim();

  if (!label) {
    return null;
  }

  return {
    id:
      String(
        value.id ??
          `highlight-${index}`
      ),
    kind:
      String(
        value.kind ??
          'correction'
      ) as
        RootPlaceContributionKind,
    label,
    observedAt:
      String(
        value.observedAt ??
          ''
      ),
    reportCount:
      Math.max(
        1,
        Number(
          value.reportCount ??
            1
        ) || 1
      ),
    confidence:
      clampConfidence(
        Number(
          value.confidence ??
            1
        ) || 0
      ),
  };
}

function normalizeConsensus<
  T extends
    boolean | number
>(
  value: any,
  expectedType:
    'boolean' | 'number'
):
  RootPlacePublicConsensus<T> |
  undefined {
  if (
    !value ||
    typeof value !==
      'object' ||
    typeof value.value !==
      expectedType
  ) {
    return undefined;
  }

  return {
    value:
      value.value as T,
    reportCount:
      Math.max(
        1,
        Number(
          value.reportCount ??
            1
        ) || 1
      ),
    confidence:
      clampConfidence(
        Number(
          value.confidence ??
            1
        ) || 0
      ),
    observedAt:
      String(
        value.observedAt ??
          ''
      ),
  };
}

function normalizePublicPlaceSummary(
  placeId: string,
  value: any
):
  RootPlacePublicPlaceSummary {
  const highlights =
    Array.isArray(
      value?.highlights
    )
      ? value
          .highlights
          .map(
            (
              item: any,
              index: number
            ) =>
              normalizePublicHighlight(
                item,
                index
              )
          )
          .filter(
            (
              item:
                RootPlacePublicHighlight |
                null
            ): item is
              RootPlacePublicHighlight =>
              item !== null
          )
          .slice(
            0,
            3
          )
      : [];

  const liveStatus:
    RootPlacePublicLiveStatus = {};

  const openNow =
    normalizeConsensus<boolean>(
      value
        ?.liveStatus
        ?.openNow,
      'boolean'
    );

  const waitingMinutes =
    normalizeConsensus<number>(
      value
        ?.liveStatus
        ?.waitingMinutes,
      'number'
    );

  const outdoorOpen =
    normalizeConsensus<boolean>(
      value
        ?.liveStatus
        ?.outdoorOpen,
      'boolean'
    );

  const rainAvailable =
    normalizeConsensus<boolean>(
      value
        ?.liveStatus
        ?.rainAvailable,
      'boolean'
    );

  if (
    openNow
  ) {
    liveStatus.openNow =
      openNow;
  }

  if (
    waitingMinutes
  ) {
    liveStatus.waitingMinutes =
      waitingMinutes;
  }

  if (
    outdoorOpen
  ) {
    liveStatus.outdoorOpen =
      outdoorOpen;
  }

  if (
    rainAvailable
  ) {
    liveStatus.rainAvailable =
      rainAvailable;
  }

  return {
    placeId,
    representativePhotoUrl:
      String(
        value
          ?.representativePhotoUrl ??
          ''
      ).trim(),
    recentPhotoUrls:
      normalizeStringArray(
        value
          ?.recentPhotoUrls,
        6
      ),
    photoCount:
      Math.max(
        0,
        Number(
          value?.photoCount ??
            0
        ) || 0
      ),
    approvedReportCount:
      Math.max(
        0,
        Number(
          value
            ?.approvedReportCount ??
            0
        ) || 0
      ),
    latestObservedAt:
      String(
        value
          ?.latestObservedAt ??
          ''
      ),
    highlights,
    liveStatus,
  };
}

export function
createEmptyRootPlacePublicDistrictSnapshot(
  districtId = ''
):
  RootPlacePublicDistrictSnapshot {
  return {
    districtId,
    updatedAt: '',
    revision: '',
    byPlaceId: {},
  };
}

export function
normalizeRootPlacePublicDistrictSnapshot(
  districtId: string,
  raw: unknown
):
  RootPlacePublicDistrictSnapshot {
  const data =
    (
      raw &&
      typeof raw ===
        'object'
    )
      ? raw as
          Record<
            string,
            any
          >
      : {};

  const rawByPlaceId =
    (
      data.byPlaceId &&
      typeof data.byPlaceId ===
        'object'
    )
      ? data.byPlaceId as
          Record<
            string,
            any
          >
      : {};

  const byPlaceId:
    Record<
      string,
      RootPlacePublicPlaceSummary
    > = {};

  for (
    const [
      placeId,
      value,
    ] of Object.entries(
      rawByPlaceId
    )
  ) {
    const normalizedPlaceId =
      String(
        placeId
      ).trim();

    if (
      !normalizedPlaceId
    ) {
      continue;
    }

    byPlaceId[
      normalizedPlaceId
    ] =
      normalizePublicPlaceSummary(
        normalizedPlaceId,
        value
      );
  }

  const updatedAt =
    String(
      data.updatedAt ??
        ''
    );

  return {
    districtId,
    updatedAt,
    revision:
      String(
        data.revision ??
          updatedAt
      ),
    byPlaceId,
  };
}

export function
subscribeRootPlacePublicCommunityDistrict({
  districtId,
  onChange,
  onError,
}: {
  districtId: string;
  onChange:
    (
      snapshot:
        RootPlacePublicDistrictSnapshot
    ) => void;
  onError?:
    (
      error: unknown
    ) => void;
}) {
  const normalizedDistrictId =
    String(
      districtId ??
        ''
    ).trim();

  if (
    !normalizedDistrictId
  ) {
    onChange(
      createEmptyRootPlacePublicDistrictSnapshot()
    );

    return () => {};
  }

  const documentId =
    sanitizeDocumentId(
      normalizedDistrictId
    );

  return onSnapshot(
    doc(
      firebaseDb,
      'rootPlacePublicCommunityDistricts',
      documentId
    ),
    (
      snapshot
    ) => {
      if (
        !snapshot.exists()
      ) {
        onChange(
          createEmptyRootPlacePublicDistrictSnapshot(
            normalizedDistrictId
          )
        );

        return;
      }

      onChange(
        normalizeRootPlacePublicDistrictSnapshot(
          normalizedDistrictId,
          snapshot.data()
        )
      );
    },
    (
      error
    ) => {
      console.log(
        'ROOT PUBLIC PLACE COMMUNITY SNAPSHOT ERROR',
        {
          districtId:
            normalizedDistrictId,
          error,
        }
      );

      onError?.(
        error
      );
    }
  );
}

export function
mergeRootPlacePublicCommunityIntoPlace(
  place: any,
  snapshot:
    RootPlacePublicDistrictSnapshot
) {
  const placeId =
    String(
      place?.id ??
        ''
    );

  const summary =
    snapshot
      .byPlaceId[
        placeId
      ];

  if (!summary) {
    return place;
  }

  return {
    ...place,
    approvedUserPhotoUrl:
      summary
        .representativePhotoUrl ||
      undefined,
    rootPublicCommunityPhotoCount:
      summary
        .photoCount,
    rootPublicApprovedReportCount:
      summary
        .approvedReportCount,
    rootPublicCommunityHighlights:
      summary
        .highlights,
    rootPublicLiveStatus:
      summary
        .liveStatus,
    rootPublicCommunityLastObservedAt:
      summary
        .latestObservedAt,
  };
}

function getApprovedTimestamp(
  record:
    RootPlaceApprovedCommunityRecord
) {
  return (
    toFiniteTimestamp(
      record.observedAt
    ) ||
    toFiniteTimestamp(
      record.createdAt
    )
  );
}

function buildBooleanConsensus(
  records:
    RootPlaceApprovedCommunityRecord[],
  field:
    'openNow' |
    'outdoorOpen' |
    'rainAvailable',
  maxAgeMs: number,
  nowMs: number
):
  RootPlacePublicConsensus<boolean> |
  undefined {
  const usable =
    records
      .filter(
        (
          record
        ) => {
          const value =
            record
              .liveStatus
              ?.[field];

          if (
            typeof value !==
            'boolean'
          ) {
            return false;
          }

          const age =
            Math.max(
              0,
              nowMs -
              getApprovedTimestamp(
                record
              )
            );

          return (
            age <=
            maxAgeMs
          );
        }
      );

  if (
    usable.length ===
    0
  ) {
    return undefined;
  }

  const trueCount =
    usable.filter(
      (
        record
      ) =>
        record
          .liveStatus
          ?.[field] ===
        true
    ).length;

  const falseCount =
    usable.length -
    trueCount;

  const value =
    trueCount >=
    falseCount;

  const winningCount =
    Math.max(
      trueCount,
      falseCount
    );

  return {
    value,
    reportCount:
      usable.length,
    confidence:
      clampConfidence(
        winningCount /
        usable.length
      ),
    observedAt:
      usable[0]
        .observedAt,
  };
}

function buildWaitingConsensus(
  records:
    RootPlaceApprovedCommunityRecord[],
  nowMs: number
):
  RootPlacePublicConsensus<number> |
  undefined {
  const usable =
    records
      .filter(
        (
          record
        ) => {
          const value =
            record
              .liveStatus
              ?.waitingMinutes;

          if (
            typeof value !==
            'number' ||
            !Number.isFinite(
              value
            )
          ) {
            return false;
          }

          const age =
            Math.max(
              0,
              nowMs -
              getApprovedTimestamp(
                record
              )
            );

          return (
            age <=
            WAITING_WINDOW_MS
          );
        }
      );

  if (
    usable.length ===
    0
  ) {
    return undefined;
  }

  const values =
    usable
      .map(
        (
          record
        ) =>
          Math.max(
            0,
            Number(
              record
                .liveStatus
                ?.waitingMinutes ??
                0
            )
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

  const middle =
    Math.floor(
      values.length /
      2
    );

  const median =
    values.length %
      2 ===
    0
      ? Math.round(
          (
            values[
              middle - 1
            ] +
            values[
              middle
            ]
          ) /
          2
        )
      : values[
          middle
        ];

  return {
    value:
      median,
    reportCount:
      usable.length,
    confidence:
      clampConfidence(
        usable.length /
        3
      ),
    observedAt:
      usable[0]
        .observedAt,
  };
}

function buildHighlightLabel(
  record:
    RootPlaceApprovedCommunityRecord
) {
  const explicit =
    String(
      record.valueLabel ??
        ''
    ).trim();

  if (
    explicit
  ) {
    return explicit;
  }

  if (
    record.media
      ?.mediaType ===
      'photo'
  ) {
    return '승인된 현장 사진';
  }

  if (
    record.media
      ?.mediaType ===
      'video'
  ) {
    return '승인된 현장 동영상';
  }

  return '승인된 현장 제보';
}

export function
buildRootPlacePublicDistrictAggregate({
  districtId,
  approvedRecords,
  nowMs =
    Date.now(),
}: {
  districtId: string;
  approvedRecords:
    RootPlaceApprovedCommunityRecord[];
  nowMs?: number;
}) {
  const records =
    approvedRecords
      .filter(
        (
          record
        ) =>
          record
            .moderationStatus ===
            'approved' &&
          record
            .publicVisible ===
            true &&
          Boolean(
            String(
              record.placeId ??
                ''
            ).trim()
          )
      )
      .sort(
        (
          first,
          second
        ) =>
          getApprovedTimestamp(
            second
          ) -
          getApprovedTimestamp(
            first
          )
      );

  const groups =
    new Map<
      string,
      RootPlaceApprovedCommunityRecord[]
    >();

  for (
    const record of
    records
  ) {
    const placeId =
      String(
        record.placeId
      );

    const group =
      groups.get(
        placeId
      );

    if (
      group
    ) {
      group.push(
        record
      );
    } else {
      groups.set(
        placeId,
        [record]
      );
    }
  }

  const byPlaceId:
    Record<
      string,
      RootPlacePublicPlaceSummary
    > = {};

  for (
    const [
      placeId,
      placeRecords,
    ] of groups
  ) {
    const photoRecords =
      placeRecords
        .filter(
          (
            record
          ) =>
            record
              .media
              ?.mediaType ===
              'photo' &&
            Boolean(
              String(
                record
                  .media
                  ?.downloadUrl ??
                  ''
              ).trim()
            )
        );

    const representative =
      photoRecords.find(
        (
          record
        ) =>
          record
            .isRepresentative ===
          true
      ) ??
      photoRecords[0];

    const recentPhotoUrls =
      Array.from(
        new Set(
          photoRecords
            .map(
              (
                record
              ) =>
                String(
                  record
                    .media
                    ?.downloadUrl ??
                    ''
                ).trim()
            )
            .filter(Boolean)
        )
      ).slice(
        0,
        6
      );

    const labelCounts =
      new Map<
        string,
        number
      >();

    for (
      const record of
      placeRecords
    ) {
      const label =
        buildHighlightLabel(
          record
        );

      labelCounts.set(
        `${record.kind}:${label}`,
        (
          labelCounts.get(
            `${record.kind}:${label}`
          ) ??
          0
        ) + 1
      );
    }

    const seenKinds =
      new Set<string>();

    const highlights:
      RootPlacePublicHighlight[] =
        [];

    for (
      const record of
      placeRecords
    ) {
      const kindKey =
        String(
          record.kind
        );

      if (
        seenKinds.has(
          kindKey
        )
      ) {
        continue;
      }

      seenKinds.add(
        kindKey
      );

      const label =
        buildHighlightLabel(
          record
        );

      const reportCount =
        labelCounts.get(
          `${record.kind}:${label}`
        ) ??
        1;

      highlights.push({
        id:
          String(
            record.id
          ),
        kind:
          record.kind,
        label,
        observedAt:
          record.observedAt,
        reportCount,
        confidence:
          clampConfidence(
            reportCount /
            3
          ),
      });

      if (
        highlights.length >=
        3
      ) {
        break;
      }
    }

    const liveStatus:
      RootPlacePublicLiveStatus = {};

    const openNow =
      buildBooleanConsensus(
        placeRecords,
        'openNow',
        LIVE_STATUS_WINDOW_MS,
        nowMs
      );

    const waitingMinutes =
      buildWaitingConsensus(
        placeRecords,
        nowMs
      );

    const outdoorOpen =
      buildBooleanConsensus(
        placeRecords,
        'outdoorOpen',
        LIVE_STATUS_WINDOW_MS,
        nowMs
      );

    const rainAvailable =
      buildBooleanConsensus(
        placeRecords,
        'rainAvailable',
        LIVE_STATUS_WINDOW_MS,
        nowMs
      );

    if (
      openNow
    ) {
      liveStatus.openNow =
        openNow;
    }

    if (
      waitingMinutes
    ) {
      liveStatus.waitingMinutes =
        waitingMinutes;
    }

    if (
      outdoorOpen
    ) {
      liveStatus.outdoorOpen =
        outdoorOpen;
    }

    if (
      rainAvailable
    ) {
      liveStatus.rainAvailable =
        rainAvailable;
    }

    byPlaceId[
      placeId
    ] = {
      placeId,
      representativePhotoUrl:
        String(
          representative
            ?.media
            ?.downloadUrl ??
            ''
        ),
      recentPhotoUrls,
      photoCount:
        photoRecords.length,
      approvedReportCount:
        placeRecords.length,
      latestObservedAt:
        String(
          placeRecords[0]
            ?.observedAt ??
            ''
        ),
      highlights,
      liveStatus,
    };
  }

  const updatedAt =
    new Date(
      nowMs
    ).toISOString();

  return {
    version: 1,
    districtId,
    updatedAt,
    revision:
      String(
        nowMs
      ),
    moderationModel:
      'approved-only',
    byPlaceId,
  };
}
