import {
  getAuth as getRootPlaceCommunityAuth,
} from '@react-native-firebase/auth';

// ROOT_EXPLORE_V12A_COMMUNITY_MEDIA_LIVE_REPORTS

import {
  getApp,
} from '@react-native-firebase/app';

import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref as storageRef,
} from '@react-native-firebase/storage';

import * as ImagePicker from 'expo-image-picker';

import type {
  RootPlaceContributionKind,
} from './rootExplorePlace';

// ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD
const assertOwnRootPlaceCommunityUid = (
  uid: unknown,
): string => {
  const requestedUid =
    String(
      uid ?? '',
    ).trim();

  const authUid =
    getRootPlaceCommunityAuth()
      .currentUser
      ?.uid ??
    null;

  if (
    !authUid ||
    !requestedUid ||
    String(
      authUid,
    ) !==
      requestedUid
  ) {
    throw new Error(
      'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
    );
  }

  return requestedUid;
};


export type RootPlaceReportKind =
  Exclude<
    RootPlaceContributionKind,
    'photo'
  >;

export type RootPlaceReportSelection = {
  value: string;
  label: string;
};

export type RootPlaceMediaKind =
  | 'photo'
  | 'video';

export type RootPlaceCommunityRecord = {
  id: string;
  placeId: string;
  placeName: string;
  districtId: string;
  userId: string;
  kind:
    RootPlaceContributionKind;
  value?: string;
  valueLabel?: string;
  createdAt: string;
  observedAt: string;
  moderationStatus: 'pending';
  source: 'root-explore';
  liveStatus?: {
    openNow?: boolean;
    waitingMinutes?: number;
    outdoorOpen?: boolean;
    rainAvailable?: boolean;
    rainCoveredOnly?: boolean;
    visitVerified?: boolean;
  };
  media?: {
    mediaType:
      RootPlaceMediaKind;
    downloadUrl: string;
    storagePath: string;
    mimeType: string;
    fileName: string;
    width: number;
    height: number;
    durationMs: number | null;
    fileSize: number | null;
  };
};

export type RootPlaceMediaUploadResult = {
  record:
    RootPlaceCommunityRecord;
  canceled: boolean;
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

const firebaseStorage =
  getStorage(
    firebaseApp
  );

const PHOTO_MAX_BYTES =
  25 * 1024 * 1024;

const VIDEO_MAX_BYTES =
  100 * 1024 * 1024;

const VIDEO_MAX_DURATION_MS =
  60 * 1000;

function sanitizeKey(
  value: unknown
) {
  return (
    String(
      value ?? 'unknown'
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      )
      .slice(
        0,
        100
      ) ||
    'unknown'
  );
}

function getRequiredUser() {
  const user =
    firebaseAuth.currentUser;

  if (!user?.uid) {
    const error =
      new Error(
        'ROOT_PLACE_AUTH_REQUIRED'
      );

    (
      error as any
    ).code =
      'ROOT_PLACE_AUTH_REQUIRED';

    throw error;
  }

  return user;
}

function toPutFilePath(
  uri: string
) {
  if (
    uri.startsWith(
      'file://'
    )
  ) {
    return decodeURI(
      uri.slice(7)
    );
  }

  return uri;
}

function getExtension(
  asset:
    ImagePicker.ImagePickerAsset
) {
  const fromName =
    String(
      asset.fileName ??
        ''
    )
      .split('?')[0]
      .toLowerCase()
      .match(
        /\.([a-z0-9]{2,5})$/
      )
      ?.[1];

  if (fromName) {
    return fromName;
  }

  const mimeType =
    String(
      asset.mimeType ??
        ''
    ).toLowerCase();

  const mimeExtension =
    mimeType
      .split('/')[1]
      ?.replace(
        'jpeg',
        'jpg'
      )
      ?.replace(
        'quicktime',
        'mov'
      );

  if (mimeExtension) {
    return mimeExtension;
  }

  const uriExtension =
    String(
      asset.uri
    )
      .split('?')[0]
      .toLowerCase()
      .match(
        /\.([a-z0-9]{2,5})$/
      )
      ?.[1];

  if (uriExtension) {
    return uriExtension;
  }

  return asset.type ===
    'video'
    ? 'mp4'
    : 'jpg';
}

function getContentType(
  asset:
    ImagePicker.ImagePickerAsset,
  extension: string
) {
  const explicit =
    String(
      asset.mimeType ??
        ''
    ).trim();

  if (explicit) {
    return explicit;
  }

  const normalized =
    extension.toLowerCase();

  if (
    normalized === 'png'
  ) {
    return 'image/png';
  }

  if (
    normalized === 'webp'
  ) {
    return 'image/webp';
  }

  if (
    normalized === 'heic' ||
    normalized === 'heif'
  ) {
    return 'image/heic';
  }

  if (
    normalized === 'mov'
  ) {
    return 'video/quicktime';
  }

  if (
    normalized === 'm4v'
  ) {
    return 'video/x-m4v';
  }

  if (
    normalized === 'mp4'
  ) {
    return 'video/mp4';
  }

  return asset.type ===
    'video'
    ? 'video/mp4'
    : 'image/jpeg';
}

function makeContributionId(
  uid: string,
  placeId: string,
  kind:
    RootPlaceContributionKind
) {
  const random =
    Math.random()
      .toString(36)
      .slice(2, 9);

  return [
    sanitizeKey(uid),
    sanitizeKey(placeId),
    sanitizeKey(kind),
    Date.now(),
    random,
  ].join('_');
}

function getPlaceIdentity(
  place: any
) {
  const placeId =
    String(
      place?.id ??
        ''
    ).trim();

  if (!placeId) {
    const error =
      new Error(
        'ROOT_PLACE_ID_REQUIRED'
      );

    (
      error as any
    ).code =
      'ROOT_PLACE_ID_REQUIRED';

    throw error;
  }

  const placeName =
    String(
      place?.name ??
        'ROOT 탐험 장소'
    ).trim() ||
    'ROOT 탐험 장소';

  const districtId =
    String(
      place
        ?.rootModerationDistrictId ??
        place?.districtId ??
        place?.district ??
        ''
    ).trim();

  return {
    placeId,
    placeName,
    districtId,
  };
}

function getLiveStatus(
  kind:
    RootPlaceReportKind,
  value: string
):
  RootPlaceCommunityRecord[
    'liveStatus'
  ] {
  if (
    kind ===
    'business_hours'
  ) {
    if (
      value ===
      'open_now'
    ) {
      return {
        openNow: true,
      };
    }

    if (
      value ===
      'closed_now'
    ) {
      return {
        openNow: false,
      };
    }
  }

  if (
    kind ===
    'waiting'
  ) {
    const waitingByValue:
      Record<
        string,
        number
      > = {
        none: 0,
        within_10: 10,
        around_20: 20,
        over_30: 30,
      };

    if (
      value in
      waitingByValue
    ) {
      return {
        waitingMinutes:
          waitingByValue[
            value
          ],
      };
    }
  }

  if (
    kind ===
    'outdoor_status'
  ) {
    if (
      value ===
      'outdoor_open'
    ) {
      return {
        outdoorOpen: true,
      };
    }

    if (
      value ===
      'outdoor_closed'
    ) {
      return {
        outdoorOpen: false,
      };
    }
  }

  if (
    kind ===
    'rain_status'
  ) {
    if (
      value ===
      'rain_available'
    ) {
      return {
        rainAvailable:
          true,
        rainCoveredOnly:
          false,
      };
    }

    if (
      value ===
      'covered_only'
    ) {
      return {
        rainAvailable:
          true,
        rainCoveredOnly:
          true,
      };
    }

    if (
      value ===
      'rain_unavailable'
    ) {
      return {
        rainAvailable:
          false,
        rainCoveredOnly:
          false,
      };
    }
  }

  if (
    kind ===
    'visit'
  ) {
    return {
      visitVerified: true,
    };
  }

  return undefined;
}

async function persistUserContribution(
  record:
    RootPlaceCommunityRecord
) {
  const userDocument =
    doc(
      firebaseDb,
      'users', assertOwnRootPlaceCommunityUid(record.userId));

  const safePlaceId =
    sanitizeKey(
      record.placeId
    );

  await setDoc(
    userDocument,
    {
      rootPlaceCommunityData: {
        version: 1,
        updatedAt:
          record.createdAt,
        contributionsById: {
          [record.id]:
            record,
        },
        latestByPlace: {
          [safePlaceId]:
            record,
        },
      },
    },
    {
      merge: true,
    }
  );

  // ROOT_EXPLORE_V12D_MODERATION_INTAKE
  if (
    record.districtId
  ) {
    void setDoc(
      doc(
        firebaseDb,
        'rootPlaceModerationInbox',
        record.id
      ),
      {
        ...record,
        contributorUid:
          record.userId,
        moderationStatus:
          'pending',
        publicVisible:
          false,
        submittedAt:
          record.createdAt,
      },
      {
        merge: false,
      }
    ).then(
      () => {
        console.log(
          'ROOT PLACE MODERATION INTAKE DONE',
          {
            contributionId:
              record.id,
            placeId:
              record.placeId,
            districtId:
              record.districtId,
          }
        );
      }
    ).catch(
      (
        error
      ) => {
        /*
         * 신규 moderation 규칙이 아직 배포되지 않았어도
         * users/{uid} 원본 제보 저장은 실패시키지 않는다.
         */
        console.log(
          'ROOT PLACE MODERATION INTAKE DEFERRED',
          {
            contributionId:
              record.id,
            error,
          }
        );
      }
    );
  }
}

function validatePickedAsset(
  asset:
    ImagePicker.ImagePickerAsset
) {
  const fileSize =
    typeof asset.fileSize ===
    'number'
      ? asset.fileSize
      : null;

  if (
    asset.type ===
    'video'
  ) {
    if (
      fileSize !== null &&
      fileSize >
        VIDEO_MAX_BYTES
    ) {
      const error =
        new Error(
          'ROOT_PLACE_VIDEO_TOO_LARGE'
        );

      (
        error as any
      ).code =
        'ROOT_PLACE_VIDEO_TOO_LARGE';

      throw error;
    }

    const duration =
      typeof asset.duration ===
      'number'
        ? asset.duration
        : null;

    if (
      duration !== null &&
      duration >
        VIDEO_MAX_DURATION_MS
    ) {
      const error =
        new Error(
          'ROOT_PLACE_VIDEO_TOO_LONG'
        );

      (
        error as any
      ).code =
        'ROOT_PLACE_VIDEO_TOO_LONG';

      throw error;
    }

    return;
  }

  if (
    fileSize !== null &&
    fileSize >
      PHOTO_MAX_BYTES
  ) {
    const error =
      new Error(
        'ROOT_PLACE_PHOTO_TOO_LARGE'
      );

    (
      error as any
    ).code =
      'ROOT_PLACE_PHOTO_TOO_LARGE';

    throw error;
  }
}

export async function
pickAndUploadRootPlaceMedia(
  place: any
):
  Promise<
    RootPlaceMediaUploadResult
  > {
  const user =
    getRequiredUser();

  const {
    placeId,
    placeName,
    districtId,
  } =
    getPlaceIdentity(
      place
    );

  const permission =
    await ImagePicker
      .requestMediaLibraryPermissionsAsync();

  if (
    !permission.granted
  ) {
    const error =
      new Error(
        'ROOT_PLACE_MEDIA_PERMISSION_REQUIRED'
      );

    (
      error as any
    ).code =
      'ROOT_PLACE_MEDIA_PERMISSION_REQUIRED';

    throw error;
  }

  const result =
    await ImagePicker
      .launchImageLibraryAsync({
        mediaTypes: [
          'images',
          'videos',
        ],
        allowsEditing:
          false,
        allowsMultipleSelection:
          false,
        quality: 0.9,
      });

  if (
    result.canceled ||
    !result.assets?.[0]
  ) {
    return {
      record:
        null as any,
      canceled: true,
    };
  }

  const asset =
    result.assets[0];

  validatePickedAsset(
    asset
  );

  const mediaType:
    RootPlaceMediaKind =
      asset.type ===
      'video'
        ? 'video'
        : 'photo';

  const extension =
    getExtension(
      asset
    );

  const contentType =
    getContentType(
      asset,
      extension
    );

  const createdAt =
    new Date()
      .toISOString();

  const contributionId =
    makeContributionId(
      user.uid,
      placeId,
      'photo'
    );

  const safeUid =
    sanitizeKey(
      user.uid
    );

  const safePlaceId =
    sanitizeKey(
      placeId
    );

  /*
   * ROOT의 기존 공유/여행기 업로드와 동일한
   * shared-posts/{uid}/{fileName} 깊이를 유지한다.
   * 별도 Storage rule 경로를 추가하지 않아도 되도록
   * 기존 앱 계약을 재사용한다.
   */
  const storagePath =
    `shared-posts/` +
    `${safeUid}/` +
    `${safeUid}_root_place_` +
    `${safePlaceId}_` +
    `${Date.now()}_` +
    `${mediaType}.` +
    `${extension}`;

  const fileReference =
    storageRef(
      firebaseStorage,
      storagePath
    );

  await putFile(
    fileReference,
    toPutFilePath(
      asset.uri
    ),
    {
      contentType,
    }
  );

  const downloadUrl =
    await getDownloadURL(
      fileReference
    );

  const record:
    RootPlaceCommunityRecord = {
      id:
        contributionId,
      placeId,
      placeName,
      districtId,
      userId:
        user.uid,
      kind: 'photo',
      createdAt,
      observedAt:
        createdAt,
      moderationStatus:
        'pending',
      source:
        'root-explore',
      media: {
        mediaType,
        downloadUrl,
        storagePath,
        mimeType:
          contentType,
        fileName:
          String(
            asset.fileName ??
              `${safePlaceId}.${extension}`
          ),
        width:
          Number(
            asset.width ??
              0
          ) || 0,
        height:
          Number(
            asset.height ??
              0
          ) || 0,
        durationMs:
          typeof asset.duration ===
          'number'
            ? asset.duration
            : null,
        fileSize:
          typeof asset.fileSize ===
          'number'
            ? asset.fileSize
            : null,
      },
    };

  try {
    await persistUserContribution(
      record
    );
  } catch (error) {
    try {
      await deleteObject(
        fileReference
      );
    } catch (
      cleanupError
    ) {
      console.log(
        'ROOT PLACE MEDIA ORPHAN CLEANUP ERROR',
        cleanupError
      );
    }

    throw error;
  }

  console.log(
    'ROOT PLACE MEDIA UPLOAD DONE',
    {
      placeId,
      mediaType,
      storagePath,
      moderationStatus:
        record
          .moderationStatus,
    }
  );

  return {
    record,
    canceled: false,
  };
}

export async function
saveRootPlaceReport({
  place,
  kind,
  selection,
}: {
  place: any;
  kind:
    RootPlaceReportKind;
  selection:
    RootPlaceReportSelection;
}) {
  const user =
    getRequiredUser();

  const {
    placeId,
    placeName,
    districtId,
  } =
    getPlaceIdentity(
      place
    );

  const createdAt =
    new Date()
      .toISOString();

  const record:
    RootPlaceCommunityRecord = {
      id:
        makeContributionId(
          user.uid,
          placeId,
          kind
        ),
      placeId,
      placeName,
      districtId,
      userId:
        user.uid,
      kind,
      value:
        selection.value,
      valueLabel:
        selection.label,
      createdAt,
      observedAt:
        createdAt,
      moderationStatus:
        'pending',
      source:
        'root-explore',
      liveStatus:
        getLiveStatus(
          kind,
          selection.value
        ),
    };

  await persistUserContribution(
    record
  );

  console.log(
    'ROOT PLACE REPORT SAVE DONE',
    {
      placeId,
      kind,
      value:
        selection.value,
      moderationStatus:
        record
          .moderationStatus,
    }
  );

  return record;
}

export function
getRootPlaceCommunityErrorMessage(
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
      'ROOT_PLACE_AUTH_REQUIRED'
    )
  ) {
    return '로그인 후 사진·동영상과 현장 정보를 제보할 수 있어요.';
  }

  if (
    code.includes(
      'ROOT_PLACE_MEDIA_PERMISSION_REQUIRED'
    )
  ) {
    return '사진과 동영상을 선택할 수 있도록 미디어 접근 권한을 허용해주세요.';
  }

  if (
    code.includes(
      'ROOT_PLACE_VIDEO_TOO_LONG'
    )
  ) {
    return '동영상은 60초 이내로 선택해주세요.';
  }

  if (
    code.includes(
      'ROOT_PLACE_VIDEO_TOO_LARGE'
    )
  ) {
    return '동영상은 100MB 이하로 선택해주세요.';
  }

  if (
    code.includes(
      'ROOT_PLACE_PHOTO_TOO_LARGE'
    )
  ) {
    return '사진은 25MB 이하로 선택해주세요.';
  }

  if (
    code.includes(
      'storage/unauthorized'
    ) ||
    code.includes(
      'permission-denied'
    )
  ) {
    return 'Firebase 권한 설정 때문에 저장하지 못했어요. 로그인 상태와 보안 규칙을 확인해주세요.';
  }

  return '제보를 저장하지 못했어요. 잠시 후 다시 시도해주세요.';
}

// ROOT_EXPLORE_V12B_OWN_PENDING_HYDRATION

export type RootPlaceCommunityHighlight = {
  id: string;
  kind:
    RootPlaceContributionKind;
  label: string;
  observedAt: string;
  moderationStatus: 'pending';
  mediaType?:
    RootPlaceMediaKind;
};

export type RootPlaceCommunityPlaceSummary = {
  placeId: string;
  latestPhotoUrl: string;
  photoCount: number;
  mediaCount: number;
  reportCount: number;
  latestObservedAt: string;
  highlights:
    RootPlaceCommunityHighlight[];
};

export type RootPlaceCommunitySnapshot = {
  ownerUserId: string | null;
  contributionCount: number;
  revision: string;
  byPlaceId:
    Record<
      string,
      RootPlaceCommunityPlaceSummary
    >;
};

export function
createEmptyRootPlaceCommunitySnapshot():
  RootPlaceCommunitySnapshot {
  return {
    ownerUserId: null,
    contributionCount: 0,
    revision: '',
    byPlaceId: {},
  };
}

function getRecordTimestamp(
  record:
    RootPlaceCommunityRecord
) {
  const value =
    Date.parse(
      String(
        record.observedAt ??
          record.createdAt ??
          ''
      )
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

function getRecordHighlightLabel(
  record:
    RootPlaceCommunityRecord
) {
  if (
    record.media
  ) {
    return record
      .media
      .mediaType ===
      'video'
      ? '동영상을 추가했어요'
      : '현장 사진을 추가했어요';
  }

  const explicit =
    String(
      record.valueLabel ??
        ''
    ).trim();

  if (explicit) {
    return explicit;
  }

  const fallback:
    Partial<
      Record<
        RootPlaceContributionKind,
        string
      >
    > = {
      business_hours:
        '영업시간을 제보했어요',
      waiting:
        '웨이팅을 제보했어요',
      outdoor_status:
        '야외석 운영을 제보했어요',
      rain_status:
        '우천 이용 정보를 제보했어요',
      visit:
        '방문을 인증했어요',
      correction:
        '정보 수정을 제안했어요',
    };

  return (
    fallback[
      record.kind
    ] ??
    '현장 정보를 제보했어요'
  );
}

export function
buildRootPlaceCommunitySnapshot(
  raw: unknown,
  ownerUserId:
    string | null = null
):
  RootPlaceCommunitySnapshot {
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

  const recordMap =
    (
      data
        .contributionsById &&
      typeof data
        .contributionsById ===
        'object'
    )
      ? data
          .contributionsById as
            Record<
              string,
              any
            >
      : {};

  const records =
    Object.values(
      recordMap
    )
      .filter(
        (
          item
        ): item is
          RootPlaceCommunityRecord =>
          Boolean(
            item &&
            typeof item ===
              'object' &&
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
          getRecordTimestamp(
            second
          ) -
          getRecordTimestamp(
            first
          )
      );

  const grouped =
    new Map<
      string,
      RootPlaceCommunityRecord[]
    >();

  for (
    const record of
    records
  ) {
    const placeId =
      String(
        record.placeId
      );

    const existing =
      grouped.get(
        placeId
      );

    if (existing) {
      existing.push(
        record
      );
    } else {
      grouped.set(
        placeId,
        [record]
      );
    }
  }

  const byPlaceId:
    Record<
      string,
      RootPlaceCommunityPlaceSummary
    > = {};

  let newestTimestamp =
    0;

  for (
    const [
      placeId,
      placeRecords,
    ] of grouped
  ) {
    const photoRecords =
      placeRecords.filter(
        (record) =>
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

    const mediaRecords =
      placeRecords.filter(
        (record) =>
          Boolean(
            record.media
          )
      );

    const reportRecords =
      placeRecords.filter(
        (record) =>
          !record.media
      );

    const latestPhotoUrl =
      String(
        photoRecords[0]
          ?.media
          ?.downloadUrl ??
          ''
      ).trim();

    const latestRecord =
      placeRecords[0];

    newestTimestamp =
      Math.max(
        newestTimestamp,
        getRecordTimestamp(
          latestRecord
        )
      );

    const seenKinds =
      new Set<string>();

    const highlights:
      RootPlaceCommunityHighlight[] =
        [];

    for (
      const record of
      placeRecords
    ) {
      const dedupeKey =
        record.media
          ? `media:${
              record
                .media
                .mediaType
            }`
          : `report:${
              record.kind
            }`;

      if (
        seenKinds.has(
          dedupeKey
        )
      ) {
        continue;
      }

      seenKinds.add(
        dedupeKey
      );

      highlights.push({
        id:
          String(
            record.id
          ),
        kind:
          record.kind,
        label:
          getRecordHighlightLabel(
            record
          ),
        observedAt:
          String(
            record.observedAt ??
              record.createdAt ??
              ''
          ),
        moderationStatus:
          'pending',
        mediaType:
          record
            .media
            ?.mediaType,
      });

      if (
        highlights.length >=
        3
      ) {
        break;
      }
    }

    byPlaceId[
      placeId
    ] = {
      placeId,
      latestPhotoUrl,
      photoCount:
        photoRecords.length,
      mediaCount:
        mediaRecords.length,
      reportCount:
        reportRecords.length,
      latestObservedAt:
        String(
          latestRecord
            ?.observedAt ??
            latestRecord
              ?.createdAt ??
            ''
        ),
      highlights,
    };
  }

  return {
    ownerUserId,
    contributionCount:
      records.length,
    revision:
      newestTimestamp >
      0
        ? String(
            newestTimestamp
          )
        : String(
            data.updatedAt ??
              ''
          ),
    byPlaceId,
  };
}

export function
mergeRootPlaceCommunityIntoPlace(
  place: any,
  snapshot:
    RootPlaceCommunitySnapshot
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
    latestUserPhotoUrl:
      summary.latestPhotoUrl ||
      undefined,
    rootCommunityPhotoCount:
      summary.photoCount,
    rootCommunityMediaCount:
      summary.mediaCount,
    rootCommunityHighlights:
      summary.highlights,
    rootCommunityLastObservedAt:
      summary
        .latestObservedAt,
  };
}

export function
subscribeRootPlaceCommunitySnapshot({
  onChange,
  onError,
}: {
  onChange:
    (
      snapshot:
        RootPlaceCommunitySnapshot
    ) => void;
  onError?:
    (
      error: unknown
    ) => void;
}) {
  const user =
    firebaseAuth.currentUser;

  if (
    !user?.uid
  ) {
    onChange(
      createEmptyRootPlaceCommunitySnapshot()
    );

    return () => {};
  }

  const uid =
    user.uid;

  return onSnapshot(
    doc(
      firebaseDb,
      'users', assertOwnRootPlaceCommunityUid(uid)),
    (
      snapshot
    ) => {
      const userData =
        snapshot.data();

      onChange(
        buildRootPlaceCommunitySnapshot(
          userData
            ?.rootPlaceCommunityData,
          uid
        )
      );
    },
    (
      error
    ) => {
      console.log(
        'ROOT PLACE COMMUNITY SNAPSHOT ERROR',
        error
      );

      onError?.(
        error
      );
    }
  );
}
