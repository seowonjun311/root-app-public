import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';

import {
  getAuth,
  getIdToken,
} from '@react-native-firebase/auth';

import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  getRootOnboardingData,
  loadRootOnboardingData,
  saveRootOnboardingData,
} from './rootMemory';

import {
  EXPLORATION_REWARD_BY_PLACE as EXPLORATION_REWARD_CATALOG,
  type ExplorationRewardDefinition,
} from './explorationCatalog';

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

const getExplorationUserRef =
  (
    uid: string
  ) =>
    doc(
      firebaseDb,
      'users',
      String(
        uid
      )
    );

/*
 * 탐험 통합 데이터 키
 */
export const ROOT_EXPLORATION_DATA_KEY =
  'root_exploration_cloud_v1';

/*
 * 예전 탐험 코드와의 호환을 위해 함께 유지하는 키입니다.
 */
export const EXPLORATION_RECORDS_KEY =
  'root_exploration_records_v1';

export const EXPLORATION_REWARDS_KEY =
  'root_exploration_rewards_v1';

export const EXPLORATION_MAIN_BADGE_KEY =
  'root_exploration_main_badge_v1';

export type ExplorationVisitRecord = {
  placeId: string;
  verifiedAt: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  distanceMeters: number;

  journalMemo: string;
  journalMood: string | null;
  journalUpdatedAt: string | null;
  journalPhotoUrls: string[];

  journalFeedSharedAt: string | null;
  journalFeedSharedJournalUpdatedAt: string | null;
  journalFeedPostId: string | null;

  /*
   * 공유내리기처럼 공유 필드를 null로 바꾼 경우에도
   * 서버의 오래된 공유 상태가 다시 살아나지 않도록
   * 공유 상태의 마지막 변경 시각을 별도로 저장합니다.
   */
  journalFeedStatusUpdatedAt: string | null;
};

export type LegacyExplorationRewardData = {
  points: number;
  unlockedBuildingIds: string[];
  unlockedStampIds: string[];
  unlockedThemeBadgeIds?: string[];
};

export type RootExplorationData = {
  version: 1;
  points: number;
  visitedPlaceIds: string[];
  completedThemeIds: string[];
  claimedRewardIds: string[];
  unlockedBuildingIds: string[];
  unlockedStampIds: string[];
  mainBadgeId: string | null;
  visitRecords: ExplorationVisitRecord[];
  updatedAt: string;
};

export type CompleteExplorationInput = {
  placeId: string;
  rewardId?: string;
  points?: number;
  buildingId?: string | null;
  stampId?: string | null;
  verifiedAt?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  distanceMeters?: number;
};

export type CompleteThemeInput = {
  themeId: string;
  rewardId?: string;
  points?: number;
  buildingId?: string | null;
  stampId?: string | null;
};

export type SaveExplorationJournalInput = {
  placeId: string;
  memo?: string | null;
  mood?: string | null;

  /*
   * 전달하지 않으면 기존 사진을 유지합니다.
   * 빈 배열을 전달하면 사진을 모두 제거합니다.
   */
  photoUrls?: string[] | null;
};

export type MarkExplorationJournalFeedSharedInput = {
  placeId: string;
  sharedJournalUpdatedAt?: string | null;
  postId?: string | null;
  sharedAt?: string | null;
};

export type ClearExplorationJournalFeedSharedInput = {
  placeId: string;
};

export type DeleteExplorationJournalInput = {
  placeId: string;

  /*
   * true이면 여행기 내용과 함께 피드 연결 상태도 초기화합니다.
   * 피드 게시물과 Storage 사진 자체의 삭제는 record.tsx가 담당합니다.
   */
  clearFeedStatus?: boolean;
};

export type ExplorationServerInspection = {
  uid: string;
  exists: boolean;
  source: 'rest' | 'sdk';
  checkedAt: string;
  data: RootExplorationData | null;
};

/*
 * 장소 보상은 최신 explorationCatalog.ts를 그대로 사용합니다.
 * 따라서 서울 270곳을 이 파일에 다시 하드코딩할 필요가 없습니다.
 */
export const EXPLORATION_REWARD_BY_PLACE:
  Record<string, ExplorationRewardDefinition> =
  EXPLORATION_REWARD_CATALOG;

const EPOCH_ISO = new Date(0).toISOString();
const MAX_JOURNAL_PHOTOS = 5;
const SERVER_TIMEOUT_MS = 3500;
const REST_SERVER_TIMEOUT_MS = 12000;
const SERVER_CONFIRM_ATTEMPTS = 2;

const createNowIso = () => new Date().toISOString();

const createEmptyExplorationData = (): RootExplorationData => ({
  version: 1,
  points: 0,
  visitedPlaceIds: [],
  completedThemeIds: [],
  claimedRewardIds: [],
  unlockedBuildingIds: [],
  unlockedStampIds: [],
  mainBadgeId: null,
  visitRecords: [],
  updatedAt: createNowIso(),
});

export const getEmptyExplorationData = () =>
  createEmptyExplorationData();

const isPlainObject = (
  value: unknown
): value is Record<string, any> =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value);

const safeArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const normalizeId = (value: unknown): string | null => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const uniqueStrings = (values: unknown[]): string[] =>
  Array.from(
    new Set(
      values
        .map(normalizeId)
        .filter((value): value is string => Boolean(value))
    )
  );

const safeNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const safeNonNegativeNumber = (
  value: unknown,
  fallback = 0
) => Math.max(0, safeNumber(value, fallback));

const safeJsonParse = <T,>(
  raw: string | null,
  fallback: T
): T => {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.log('EXPLORATION JSON PARSE ERROR', error);
    return fallback;
  }
};

const normalizeIso = (
  value: unknown,
  fallback = EPOCH_ISO
): string => {
  const text = String(value ?? '').trim();
  if (!text) return fallback;

  const timestamp = new Date(text).getTime();
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : fallback;
};

const normalizeNullableIso = (
  value: unknown
): string | null => {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const timestamp = new Date(text).getTime();
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : null;
};

const getIsoTime = (value: unknown) => {
  const normalized = normalizeNullableIso(value);
  return normalized ? new Date(normalized).getTime() : 0;
};

const getLatestIso = (
  firstValue: unknown,
  secondValue: unknown
) => {
  const first = normalizeIso(firstValue);
  const second = normalizeIso(secondValue);

  return new Date(first).getTime() >= new Date(second).getTime()
    ? first
    : second;
};

const normalizeJournalPhotoUrls = (
  value: unknown
): string[] =>
  uniqueStrings(
    safeArray(value).map((item: any) =>
      isPlainObject(item)
        ? item.url ??
          item.downloadUrl ??
          item.photoUrl ??
          item.uri
        : item
    )
  ).slice(0, MAX_JOURNAL_PHOTOS);

/*
 * explore-gyeongbokgung / visit-gyeongbokgung 형식도
 * 내부에서는 gyeongbokgung으로 통일합니다.
 */
export const normalizeExplorationPlaceId = (
  value: unknown
): string | null => {
  const normalized = normalizeId(value);
  if (!normalized) return null;

  if (normalized.startsWith('explore-')) {
    return normalized.slice('explore-'.length);
  }

  if (normalized.startsWith('visit-')) {
    return normalized.slice('visit-'.length);
  }

  return normalized;
};

export const getExplorationVisitRewardId = (
  placeId: string
) => {
  const normalizedPlaceId =
    normalizeExplorationPlaceId(placeId);

  return normalizedPlaceId
    ? `visit-${normalizedPlaceId}`
    : '';
};

const normalizeVisitRecord = (
  value: any,
  fallbackVerifiedAt: string
): ExplorationVisitRecord | null => {
  const placeId = normalizeExplorationPlaceId(
    value?.placeId ?? value?.explorationId ?? value?.id
  );

  if (!placeId) return null;

  return {
    placeId,
    verifiedAt: normalizeIso(
      value?.verifiedAt ??
        value?.completedAt ??
        fallbackVerifiedAt,
      fallbackVerifiedAt
    ),
    latitude: safeNumber(value?.latitude),
    longitude: safeNumber(value?.longitude),
    accuracyMeters: safeNonNegativeNumber(
      value?.accuracyMeters
    ),
    distanceMeters: safeNonNegativeNumber(
      value?.distanceMeters
    ),
    journalMemo: String(
      value?.journalMemo ?? value?.travelMemo ?? ''
    )
      .trim()
      .slice(0, 500),
    journalMood: normalizeId(
      value?.journalMood ?? value?.travelMood
    ),
    journalUpdatedAt: normalizeNullableIso(
      value?.journalUpdatedAt ?? value?.travelUpdatedAt
    ),
    journalPhotoUrls: normalizeJournalPhotoUrls(
      value?.journalPhotoUrls ??
        value?.journalPhotos ??
        value?.travelPhotoUrls ??
        value?.travelPhotos
    ),
    journalFeedSharedAt: normalizeNullableIso(
      value?.journalFeedSharedAt ??
        value?.travelFeedSharedAt ??
        value?.journalSharedAt
    ),
    journalFeedSharedJournalUpdatedAt:
      normalizeNullableIso(
        value?.journalFeedSharedJournalUpdatedAt ??
          value?.travelFeedSharedJournalUpdatedAt ??
          value?.journalSharedVersionAt
      ),
    journalFeedPostId: normalizeId(
      value?.journalFeedPostId ??
        value?.travelFeedPostId ??
        value?.journalSharedPostId
    ),
    journalFeedStatusUpdatedAt: normalizeNullableIso(
      value?.journalFeedStatusUpdatedAt ??
        value?.travelFeedStatusUpdatedAt ??
        value?.journalShareStatusUpdatedAt ??
        value?.journalFeedSharedAt ??
        value?.travelFeedSharedAt ??
        value?.journalSharedAt
    ),
  };
};

const mergeVisitRecords = (
  ...recordSources: unknown[]
): ExplorationVisitRecord[] => {
  const byPlaceId = new Map<string, ExplorationVisitRecord>();

  recordSources
    .flatMap((source) => safeArray(source))
    .forEach((value) => {
      const record = normalizeVisitRecord(value, EPOCH_ISO);
      if (!record) return;

      const current = byPlaceId.get(record.placeId);
      if (!current) {
        byPlaceId.set(record.placeId, record);
        return;
      }

      const verificationSource =
        getIsoTime(record.verifiedAt) >
        getIsoTime(current.verifiedAt)
          ? record
          : current;

      /*
       * 여행기 삭제도 journalUpdatedAt을 남기므로
       * 빈 여행기가 서버의 오래된 글보다 최신일 수 있습니다.
       */
      const journalSource =
        getIsoTime(record.journalUpdatedAt) >=
        getIsoTime(current.journalUpdatedAt)
          ? record
          : current;

      const currentFeedStatusAt =
        getIsoTime(current.journalFeedStatusUpdatedAt) ||
        getIsoTime(current.journalFeedSharedAt);

      const nextFeedStatusAt =
        getIsoTime(record.journalFeedStatusUpdatedAt) ||
        getIsoTime(record.journalFeedSharedAt);

      const feedShareSource =
        nextFeedStatusAt >= currentFeedStatusAt
          ? record
          : current;

      byPlaceId.set(record.placeId, {
        ...verificationSource,
        journalMemo: journalSource.journalMemo,
        journalMood: journalSource.journalMood,
        journalUpdatedAt: journalSource.journalUpdatedAt,
        journalPhotoUrls: journalSource.journalPhotoUrls,
        journalFeedSharedAt:
          feedShareSource.journalFeedSharedAt,
        journalFeedSharedJournalUpdatedAt:
          feedShareSource
            .journalFeedSharedJournalUpdatedAt,
        journalFeedPostId:
          feedShareSource.journalFeedPostId,
        journalFeedStatusUpdatedAt:
          feedShareSource.journalFeedStatusUpdatedAt,
      });
    });

  return Array.from(byPlaceId.values()).sort(
    (first, second) =>
      getIsoTime(second.verifiedAt) -
      getIsoTime(first.verifiedAt)
  );
};

const inferVisitedPlacesFromRewards = (
  buildingIds: string[],
  stampIds: string[]
) => {
  const visitedPlaceIds: string[] = [];

  Object.entries(EXPLORATION_REWARD_BY_PLACE).forEach(
    ([placeId, definition]) => {
      if (
        buildingIds.includes(definition.buildingId) ||
        stampIds.includes(definition.stampId)
      ) {
        visitedPlaceIds.push(placeId);
      }
    }
  );

  return uniqueStrings(visitedPlaceIds);
};

const inferClaimedRewardIds = (
  visitedPlaceIds: string[],
  completedThemeIds: string[],
  buildingIds: string[],
  stampIds: string[],
  existingClaimIds: string[]
) => {
  const claimed = new Set<string>(
    uniqueStrings(existingClaimIds)
  );

  visitedPlaceIds.forEach((placeId) => {
    const rewardId = getExplorationVisitRewardId(placeId);
    if (rewardId) claimed.add(rewardId);
  });

  Object.entries(EXPLORATION_REWARD_BY_PLACE).forEach(
    ([placeId, definition]) => {
      if (
        buildingIds.includes(definition.buildingId) ||
        stampIds.includes(definition.stampId)
      ) {
        const rewardId =
          getExplorationVisitRewardId(placeId);
        if (rewardId) claimed.add(rewardId);
      }
    }
  );

  completedThemeIds.forEach((themeId) =>
    claimed.add(themeId)
  );

  return Array.from(claimed).filter(Boolean);
};

const calculateKnownVisitPoints = (
  claimedRewardIds: string[]
) => {
  const countedPlaces = new Set<string>();
  let total = 0;

  claimedRewardIds.forEach((rewardId) => {
    const normalizedRewardId = normalizeId(rewardId);
    if (
      !normalizedRewardId ||
      !normalizedRewardId.startsWith('visit-')
    ) {
      return;
    }

    const placeId =
      normalizeExplorationPlaceId(normalizedRewardId);

    if (!placeId || countedPlaces.has(placeId)) return;

    const definition =
      EXPLORATION_REWARD_BY_PLACE[placeId];

    if (!definition) return;

    countedPlaces.add(placeId);
    total += safeNonNegativeNumber(definition.points);
  });

  return total;
};

/*
 * 새 데이터뿐 아니라 records / rewards 형태의 예전 데이터도 읽습니다.
 */
export const normalizeExplorationData = (
  value: any
): RootExplorationData => {
  const source = isPlainObject(value) ? value : {};
  const legacyRewards = isPlainObject(source?.rewards)
    ? source.rewards
    : {};

  const updatedAt = normalizeIso(
    source?.updatedAt,
    createNowIso()
  );

  const visitRecords = mergeVisitRecords(
    source?.visitRecords,
    source?.records
  );

  const directVisitedIds = uniqueStrings(
    safeArray(source?.visitedPlaceIds).map(
      normalizeExplorationPlaceId
    )
  );

  const unlockedBuildingIds = uniqueStrings([
    ...safeArray(source?.unlockedBuildingIds),
    ...safeArray(legacyRewards?.unlockedBuildingIds),
  ]);

  const unlockedStampIds = uniqueStrings([
    ...safeArray(source?.unlockedStampIds),
    ...safeArray(legacyRewards?.unlockedStampIds),
  ]);

  const mainBadgeId = normalizeId(
    source?.mainBadgeId ??
      source?.explorationMainBadgeId
  );

  const completedThemeIds = uniqueStrings([
    ...safeArray(source?.completedThemeIds),
    ...safeArray(source?.unlockedThemeBadgeIds),
    ...safeArray(legacyRewards?.unlockedThemeBadgeIds),
    ...(mainBadgeId ? [mainBadgeId] : []),
  ]);

  const rewardVisitedIds = inferVisitedPlacesFromRewards(
    unlockedBuildingIds,
    unlockedStampIds
  );

  const visitedPlaceIds = uniqueStrings([
    ...directVisitedIds,
    ...visitRecords.map((record) => record.placeId),
    ...rewardVisitedIds,
  ]);

  /*
   * 예전 데이터에 방문 ID만 있고 상세 기록이 없더라도
   * 방문 완료 상태가 사라지지 않도록 최소 기록을 만듭니다.
   */
  const recordMap = new Map(
    visitRecords.map((record) => [record.placeId, record])
  );

  visitedPlaceIds.forEach((placeId) => {
    if (recordMap.has(placeId)) return;

    recordMap.set(placeId, {
      placeId,
      verifiedAt: updatedAt,
      latitude: 0,
      longitude: 0,
      accuracyMeters: 0,
      distanceMeters: 0,
      journalMemo: '',
      journalMood: null,
      journalUpdatedAt: null,
      journalPhotoUrls: [],
      journalFeedSharedAt: null,
      journalFeedSharedJournalUpdatedAt: null,
      journalFeedPostId: null,
      journalFeedStatusUpdatedAt: null,
    });
  });

  const finalVisitRecords = Array.from(
    recordMap.values()
  ).sort(
    (first, second) =>
      getIsoTime(second.verifiedAt) -
      getIsoTime(first.verifiedAt)
  );

  const claimedRewardIds = inferClaimedRewardIds(
    visitedPlaceIds,
    completedThemeIds,
    unlockedBuildingIds,
    unlockedStampIds,
    uniqueStrings(safeArray(source?.claimedRewardIds))
  );

  const knownVisitPoints =
    calculateKnownVisitPoints(claimedRewardIds);

  const savedPoints = Math.max(
    safeNonNegativeNumber(source?.points),
    safeNonNegativeNumber(legacyRewards?.points)
  );

  return {
    version: 1,
    points: Math.max(savedPoints, knownVisitPoints),
    visitedPlaceIds,
    completedThemeIds,
    claimedRewardIds,
    unlockedBuildingIds,
    unlockedStampIds,
    mainBadgeId,
    visitRecords: finalVisitRecords,
    updatedAt,
  };
};

/*
 * 로컬과 서버 데이터는 배열을 합집합으로 합치고,
 * 포인트는 큰 값, 대표 뱃지는 현재 기기의 값을 우선합니다.
 */
export const mergeExplorationData = (
  localData: unknown,
  serverData: unknown
): RootExplorationData => {
  const local = normalizeExplorationData(localData);
  const server = normalizeExplorationData(serverData);

  return normalizeExplorationData({
    version: 1,
    points: Math.max(local.points, server.points),
    visitedPlaceIds: uniqueStrings([
      ...server.visitedPlaceIds,
      ...local.visitedPlaceIds,
    ]),
    completedThemeIds: uniqueStrings([
      ...server.completedThemeIds,
      ...local.completedThemeIds,
    ]),
    claimedRewardIds: uniqueStrings([
      ...server.claimedRewardIds,
      ...local.claimedRewardIds,
    ]),
    unlockedBuildingIds: uniqueStrings([
      ...server.unlockedBuildingIds,
      ...local.unlockedBuildingIds,
    ]),
    unlockedStampIds: uniqueStrings([
      ...server.unlockedStampIds,
      ...local.unlockedStampIds,
    ]),
    mainBadgeId: local.mainBadgeId ?? server.mainBadgeId,
    visitRecords: mergeVisitRecords(
      server.visitRecords,
      local.visitRecords
    ),
    updatedAt: getLatestIso(
      local.updatedAt,
      server.updatedAt
    ),
  });
};

const readCurrentRootData = async () => {
  const memoryData = getRootOnboardingData();
  if (memoryData) return memoryData;

  try {
    return (await loadRootOnboardingData()) ?? {};
  } catch (error) {
    console.log('EXPLORATION ROOT LOCAL LOAD ERROR', error);
    return {};
  }
};

const buildLegacyRewards = (
  data: RootExplorationData
): LegacyExplorationRewardData => ({
  points: data.points,
  unlockedBuildingIds: data.unlockedBuildingIds,
  unlockedStampIds: data.unlockedStampIds,
  unlockedThemeBadgeIds: data.completedThemeIds,
});

const persistLocalExplorationData = async (
  inputData: RootExplorationData,
  touchUpdatedAt: boolean
) => {
  const normalized = normalizeExplorationData({
    ...inputData,
    updatedAt: touchUpdatedAt
      ? createNowIso()
      : inputData?.updatedAt ?? createNowIso(),
  });

  await AsyncStorage.multiSet([
    [
      ROOT_EXPLORATION_DATA_KEY,
      JSON.stringify(normalized),
    ],
    [
      EXPLORATION_RECORDS_KEY,
      JSON.stringify(normalized.visitRecords),
    ],
    [
      EXPLORATION_REWARDS_KEY,
      JSON.stringify(buildLegacyRewards(normalized)),
    ],
  ]);

  if (normalized.mainBadgeId) {
    await AsyncStorage.setItem(
      EXPLORATION_MAIN_BADGE_KEY,
      normalized.mainBadgeId
    );
  } else {
    await AsyncStorage.removeItem(
      EXPLORATION_MAIN_BADGE_KEY
    );
  }

  const currentRootData =
  await readCurrentRootData();

const currentUser =
  firebaseAuth.currentUser;

  await saveRootOnboardingData({
    ...currentRootData,
    ...(currentUser?.uid ? { uid: currentUser.uid } : {}),
    explorationData: normalized,
    explorationMainBadgeId: normalized.mainBadgeId,
  });

  console.log('EXPLORATION LOCAL SAVE DONE', {
    points: normalized.points,
    visitedCount: normalized.visitedPlaceIds.length,
    completedThemeCount:
      normalized.completedThemeIds.length,
    claimedRewardCount:
      normalized.claimedRewardIds.length,
    buildingCount:
      normalized.unlockedBuildingIds.length,
    stampCount: normalized.unlockedStampIds.length,
    mainBadgeId: normalized.mainBadgeId,
  });

  return normalized;
};

export const saveLocalExplorationData = async (
  data: RootExplorationData
) => persistLocalExplorationData(data, true);

export const loadLocalExplorationData = async (): Promise<
  RootExplorationData
> => {
  const [
    newDataRaw,
    legacyRecordsRaw,
    legacyRewardsRaw,
    legacyMainBadgeRaw,
  ] = await Promise.all([
    AsyncStorage.getItem(ROOT_EXPLORATION_DATA_KEY),
    AsyncStorage.getItem(EXPLORATION_RECORDS_KEY),
    AsyncStorage.getItem(EXPLORATION_REWARDS_KEY),
    AsyncStorage.getItem(EXPLORATION_MAIN_BADGE_KEY),
  ]);

  const currentRootData = await readCurrentRootData();

  const parsedNewData = safeJsonParse<any>(
    newDataRaw,
    {}
  );

  const parsedLegacyRecords = safeJsonParse<any[]>(
    legacyRecordsRaw,
    []
  );

  const parsedLegacyRewards = safeJsonParse<any>(
    legacyRewardsRaw,
    {}
  );

  const legacyBadgeId =
    normalizeId(legacyMainBadgeRaw) ??
    normalizeId(currentRootData?.explorationMainBadgeId);

  const legacyData = normalizeExplorationData({
    version: 1,
    records: parsedLegacyRecords,
    rewards: parsedLegacyRewards,
    mainBadgeId: legacyBadgeId,
    updatedAt:
      parsedNewData?.updatedAt ??
      currentRootData?.explorationData?.updatedAt ??
      createNowIso(),
  });

  const newLocalData =
    normalizeExplorationData(parsedNewData);

  const rootExplorationData = normalizeExplorationData({
    ...(isPlainObject(currentRootData?.explorationData)
      ? currentRootData.explorationData
      : {}),
    mainBadgeId:
      currentRootData?.explorationData?.mainBadgeId ??
      currentRootData?.explorationMainBadgeId,
  });

  const migratedData = mergeExplorationData(
    mergeExplorationData(legacyData, newLocalData),
    rootExplorationData
  );

  const saved = await persistLocalExplorationData(
    {
      ...migratedData,
      updatedAt:
        migratedData.updatedAt === EPOCH_ISO
          ? createNowIso()
          : migratedData.updatedAt,
    },
    false
  );

  console.log('EXPLORATION LOCAL MIGRATION DONE', {
    hadNewData: Boolean(newDataRaw),
    hadLegacyRecords: Boolean(legacyRecordsRaw),
    hadLegacyRewards: Boolean(legacyRewardsRaw),
    hadLegacyMainBadge: Boolean(legacyMainBadgeRaw),
    visitedCount: saved.visitedPlaceIds.length,
    points: saved.points,
    mainBadgeId: saved.mainBadgeId,
  });

  return saved;
};

export const clearLocalExplorationData = async () => {
  await AsyncStorage.multiRemove([
    ROOT_EXPLORATION_DATA_KEY,
    EXPLORATION_RECORDS_KEY,
    EXPLORATION_REWARDS_KEY,
    EXPLORATION_MAIN_BADGE_KEY,
  ]);

  return persistLocalExplorationData(
    createEmptyExplorationData(),
    true
  );
};

const getSnapshotExists = (snapshot: any) =>
  typeof snapshot?.exists === 'function'
    ? snapshot.exists()
    : Boolean(snapshot?.exists);

const checkAuthUid =
  (
    expectedUid?:
      string |
      null
  ) => {
    const currentUid =
      firebaseAuth
        .currentUser
        ?.uid ??
      null;

    if (
      !currentUid
    ) {
      const error:
        any =
        new Error(
          'EXPLORATION_LOGIN_REQUIRED'
        );

      error.code =
        'EXPLORATION_LOGIN_REQUIRED';

      throw error;
    }

    if (
      expectedUid &&
      String(
        expectedUid
      ) !==
        String(
          currentUid
        )
    ) {
      const error:
        any =
        new Error(
          'EXPLORATION_AUTH_UID_MISMATCH'
        );

      error.code =
        'EXPLORATION_AUTH_UID_MISMATCH';

      throw error;
    }

    return currentUid;
  };

const withExplorationTimeout = async <T,>(
  promise: Promise<T>,
  milliseconds: number,
  errorCode: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      const error: any = new Error(errorCode);
      error.code = errorCode;
      reject(error);
    }, milliseconds);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

type ExplorationServerSource =
  | 'sdk'
  | 'rest';

type ExplorationServerLoadResult = {
  source: ExplorationServerSource;
  data: RootExplorationData | null;
};

const EXPLORATION_REST_FIELD_PATHS = [
  'uid',
  'explorationData',
  'explorationUpdatedAt',
  'explorationMainBadgeId',
  'explorationMainBadgeUpdatedAt',
  'rootData.uid',
  'rootData.explorationData',
  'rootData.explorationMainBadgeId',
  'updatedAt',
];

const createExplorationError = (
  code: string,
  detail?: string
) => {
  const error: any =
    new Error(
      detail
        ? `${code}: ${detail}`
        : code
    );

  error.code = code;
  return error;
};

const getExplorationRestDocumentUrl = (
  uid: string
) => {
  const projectId =
    firebaseApp.options.projectId;

  if (!projectId) {
    throw createExplorationError(
      'EXPLORATION_FIREBASE_PROJECT_ID_NOT_FOUND'
    );
  }

  return (
    'https://firestore.googleapis.com/v1/' +
    `projects/${encodeURIComponent(String(projectId))}/` +
    'databases/(default)/documents/' +
    `users/${encodeURIComponent(String(uid))}`
  );
};

const getExplorationRestIdToken = async () => {
  const currentUser =
    firebaseAuth.currentUser;

  if (!currentUser?.uid) {
    throw createExplorationError(
      'EXPLORATION_LOGIN_REQUIRED'
    );
  }

  return withExplorationTimeout(
    getIdToken(
      currentUser,
      false
    ),
    REST_SERVER_TIMEOUT_MS,
    'EXPLORATION_REST_TOKEN_TIMEOUT'
  );
};

function toFirestoreRestValue(
  value: any
): any {
  if (value === null) {
    return {
      nullValue: null,
    };
  }

  if (
    typeof value ===
    'string'
  ) {
    return {
      stringValue: value,
    };
  }

  if (
    typeof value ===
    'boolean'
  ) {
    return {
      booleanValue: value,
    };
  }

  if (
    typeof value ===
    'number'
  ) {
    if (
      !Number.isFinite(
        value
      )
    ) {
      return {
        nullValue: null,
      };
    }

    return Number.isInteger(
      value
    )
      ? {
          integerValue:
            String(value),
        }
      : {
          doubleValue:
            value,
        };
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return {
      arrayValue: {
        values:
          value
            .filter(
              (item) =>
                item !==
                undefined
            )
            .map(
              toFirestoreRestValue
            ),
      },
    };
  }

  if (
    typeof value ===
      'object' &&
    value !== null
  ) {
    return {
      mapValue: {
        fields:
          toFirestoreRestFields(
            value
          ),
      },
    };
  }

  return {
    stringValue:
      String(value),
  };
}

function toFirestoreRestFields(
  data: Record<
    string,
    any
  >
) {
  return Object.fromEntries(
    Object.entries(
      data
    )
      .filter(
        (
          [, value]
        ) =>
          value !==
          undefined
      )
      .map(
        (
          [key, value]
        ) => [
          key,
          toFirestoreRestValue(
            value
          ),
        ]
      )
  );
}

function fromFirestoreRestValue(
  value: any
): any {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'nullValue'
    )
  ) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'stringValue'
    )
  ) {
    return value.stringValue;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'booleanValue'
    )
  ) {
    return Boolean(
      value.booleanValue
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'integerValue'
    )
  ) {
    return Number(
      value.integerValue
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'doubleValue'
    )
  ) {
    return Number(
      value.doubleValue
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'timestampValue'
    )
  ) {
    return value.timestampValue;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'referenceValue'
    )
  ) {
    return value.referenceValue;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'bytesValue'
    )
  ) {
    return value.bytesValue;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'geoPointValue'
    )
  ) {
    return value.geoPointValue;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'arrayValue'
    )
  ) {
    const values =
      Array.isArray(
        value.arrayValue
          ?.values
      )
        ? value.arrayValue
            .values
        : [];

    return values.map(
      fromFirestoreRestValue
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      'mapValue'
    )
  ) {
    return fromFirestoreRestFields(
      value.mapValue
        ?.fields ??
        {}
    );
  }

  return null;
}

function fromFirestoreRestFields(
  fields: any
): Record<
  string,
  any
> {
  const safeFields =
    isPlainObject(
      fields
    )
      ? fields
      : {};

  return Object.fromEntries(
    Object.entries(
      safeFields
    ).map(
      (
        [key, value]
      ) => [
        key,
        fromFirestoreRestValue(
          value
        ),
      ]
    )
  );
}

const extractExplorationDataFromUserDocument = (
  userData: any
): RootExplorationData => {
  const direct = isPlainObject(userData?.explorationData)
    ? userData.explorationData
    : {};

  const nested = isPlainObject(
    userData?.rootData?.explorationData
  )
    ? userData.rootData.explorationData
    : {};

  return normalizeExplorationData({
    ...nested,
    ...direct,
    mainBadgeId:
      direct?.mainBadgeId ??
      nested?.mainBadgeId ??
      userData?.explorationMainBadgeId ??
      userData?.rootData?.explorationMainBadgeId,
    updatedAt:
      direct?.updatedAt ??
      nested?.updatedAt ??
      userData?.explorationUpdatedAt ??
      userData?.updatedAt ??
      createNowIso(),
  });
};

const loadServerExplorationDataWithSdk =
  async (
    uid: string
  ): Promise<
    RootExplorationData |
    null
  > => {
    const userReference =
      getExplorationUserRef(
        uid
      );

    const snapshot =
      await withExplorationTimeout(
        getDoc(
          userReference
        ),
        SERVER_TIMEOUT_MS,
        'EXPLORATION_SERVER_LOAD_TIMEOUT'
      );

    if (
      !getSnapshotExists(
        snapshot
      )
    ) {
      return null;
    }

    return extractExplorationDataFromUserDocument(
      snapshot.data() ??
        {}
    );
  };

const loadServerExplorationDataWithRest =
  async (
    uid: string
  ): Promise<
    RootExplorationData |
    null
  > => {
    const token =
      await getExplorationRestIdToken();

    const maskQuery =
      EXPLORATION_REST_FIELD_PATHS
        .map(
          (fieldPath) =>
            'mask.fieldPaths=' +
            encodeURIComponent(
              fieldPath
            )
        )
        .join('&');

    const response =
      await withExplorationTimeout(
        fetch(
          `${getExplorationRestDocumentUrl(uid)}?${maskQuery}`,
          {
            method: 'GET',
            headers: {
              Authorization:
                `Bearer ${token}`,
              Accept:
                'application/json',
            },
          }
        ),
        REST_SERVER_TIMEOUT_MS,
        'EXPLORATION_REST_LOAD_TIMEOUT'
      );

    const responseText =
      await response.text();

    if (
      response.status ===
      404
    ) {
      return null;
    }

    if (!response.ok) {
      throw createExplorationError(
        `EXPLORATION_REST_LOAD_HTTP_${response.status}`,
        responseText
      );
    }

    let documentData:
      any = {};

    try {
      documentData =
        responseText
          ? JSON.parse(
              responseText
            )
          : {};
    } catch (
      parseError: any
    ) {
      throw createExplorationError(
        'EXPLORATION_REST_LOAD_PARSE_ERROR',
        parseError?.message ??
          String(
            parseError
          )
      );
    }

    const userData =
      fromFirestoreRestFields(
        documentData?.fields ??
          {}
      );

    return extractExplorationDataFromUserDocument(
      userData
    );
  };

const loadServerExplorationDataResult =
  async (
    uid: string
  ): Promise<
    ExplorationServerLoadResult
  > => {
    try {
      const data =
        await loadServerExplorationDataWithSdk(
          uid
        );

      return {
        source: 'sdk',
        data,
      };
    } catch (
      sdkError: any
    ) {
      console.log(
        'EXPLORATION SDK SERVER LOAD ERROR: REST FALLBACK',
        {
          uid,
          code:
            sdkError?.code ??
            null,
          message:
            sdkError?.message ??
            String(
              sdkError
            ),
        }
      );

      const data =
        await loadServerExplorationDataWithRest(
          uid
        );

      return {
        source: 'rest',
        data,
      };
    }
  };

export const loadServerExplorationData =
  async (
    expectedUid?:
      string |
      null
  ): Promise<
    RootExplorationData |
    null
  > => {
    const uid =
      checkAuthUid(
        expectedUid
      );

    const result =
      await loadServerExplorationDataResult(
        uid
      );

    return result.data;
  };

const saveServerExplorationDataWithSdk =
  async (
    data:
      RootExplorationData,

    uid:
      string
  ) => {
    const normalized =
      normalizeExplorationData(
        data
      );

    const userReference =
      getExplorationUserRef(
        uid
      );

    /*
     * 탐험 데이터 저장은 기존 값을 읽고
     * 계산해야 하는 트랜잭션이 아닙니다.
     *
     * 이미 로컬·서버 병합이 끝난 normalized 값을
     * 그대로 저장하므로 직접 merge 저장합니다.
     *
     * 문서가 없으면 생성되고,
     * 문서가 있으면 지정한 데이터만 병합됩니다.
     */
    await setDoc(
      userReference,

      {
        uid,

        explorationData:
          normalized,

        explorationUpdatedAt:
          normalized.updatedAt,

        explorationMainBadgeId:
          normalized.mainBadgeId,

        explorationMainBadgeUpdatedAt:
          normalized.updatedAt,

        rootData: {
          uid,

          explorationData:
            normalized,

          explorationMainBadgeId:
            normalized.mainBadgeId,
        },

        updatedAt:
          normalized.updatedAt,
      },

      {
        merge:
          true,
      }
    );

    return normalized;
  };

const saveServerExplorationDataWithRest =
  async (
    data:
      RootExplorationData,

    uid:
      string
  ) => {
    const normalized =
      normalizeExplorationData(
        data
      );

    const token =
      await getExplorationRestIdToken();

    const updateMaskQuery =
      EXPLORATION_REST_FIELD_PATHS
        .map(
          (fieldPath) =>
            'updateMask.fieldPaths=' +
            encodeURIComponent(
              fieldPath
            )
        )
        .join('&');

    const payload = {
      uid,

      explorationData:
        normalized,

      explorationUpdatedAt:
        normalized.updatedAt,

      explorationMainBadgeId:
        normalized.mainBadgeId,

      explorationMainBadgeUpdatedAt:
        normalized.updatedAt,

      rootData: {
        uid,

        explorationData:
          normalized,

        explorationMainBadgeId:
          normalized.mainBadgeId,
      },

      updatedAt:
        normalized.updatedAt,
    };

    const response =
      await withExplorationTimeout(
        fetch(
          `${getExplorationRestDocumentUrl(uid)}?${updateMaskQuery}`,
          {
            method: 'PATCH',
            headers: {
              Authorization:
                `Bearer ${token}`,
              'Content-Type':
                'application/json',
              Accept:
                'application/json',
            },
            body:
              JSON.stringify({
                fields:
                  toFirestoreRestFields(
                    payload
                  ),
              }),
          }
        ),
        REST_SERVER_TIMEOUT_MS,
        'EXPLORATION_REST_SAVE_TIMEOUT'
      );

    const responseText =
      await response.text();

    if (!response.ok) {
      throw createExplorationError(
        `EXPLORATION_REST_SAVE_HTTP_${response.status}`,
        responseText
      );
    }

    console.log(
      'EXPLORATION REST SERVER SAVE DONE',
      {
        uid,
        points:
          normalized.points,
        visitedCount:
          normalized
            .visitedPlaceIds
            .length,
        updatedAt:
          normalized.updatedAt,
      }
    );

    return normalized;
  };

export const saveServerExplorationData =
  async (
    data:
      RootExplorationData,

    expectedUid?:
      string |
      null
  ) => {
    const uid =
      checkAuthUid(
        expectedUid
      );

    const normalized =
      normalizeExplorationData(
        data
      );

    let method:
      ExplorationServerSource =
      'sdk';

    try {
      await withExplorationTimeout(
        saveServerExplorationDataWithSdk(
          normalized,
          uid
        ),
        SERVER_TIMEOUT_MS,
        'EXPLORATION_SERVER_SAVE_TIMEOUT'
      );
    } catch (
      sdkError: any
    ) {
      method = 'rest';

      console.log(
        'EXPLORATION SDK SERVER SAVE ERROR: REST FALLBACK',
        {
          uid,
          code:
            sdkError?.code ??
            null,
          message:
            sdkError?.message ??
            String(
              sdkError
            ),
        }
      );

      await saveServerExplorationDataWithRest(
        normalized,
        uid
      );
    }

    console.log(
      'EXPLORATION SERVER SAVE DONE',
      {
        uid,
        method,
        points:
          normalized.points,
        visitedCount:
          normalized
            .visitedPlaceIds
            .length,
        claimedRewardCount:
          normalized
            .claimedRewardIds
            .length,
        mainBadgeId:
          normalized.mainBadgeId,
        updatedAt:
          normalized.updatedAt,
      }
    );

    return normalized;
  };

export const inspectServerExplorationData =
  async (
    expectedUid?:
      string |
      null
  ): Promise<
    ExplorationServerInspection
  > => {
    const uid =
      checkAuthUid(
        expectedUid
      );

    const loaded =
      await loadServerExplorationDataResult(
        uid
      );

    const result:
      ExplorationServerInspection = {
      uid,
      exists:
        loaded.data !==
        null,
      source:
        loaded.source,
      checkedAt:
        createNowIso(),
      data:
        loaded.data,
    };

    console.log(
      'EXPLORATION SERVER INSPECTION DONE',
      {
        uid,
        source:
          result.source,
        exists:
          result.exists,
        points:
          loaded.data
            ?.points ??
          0,
        visitedCount:
          loaded.data
            ?.visitedPlaceIds
            .length ??
          0,
        journalCount:
          loaded.data
            ?.visitRecords
            .filter(
              (
                record
              ) =>
                Boolean(
                  record.journalMemo
                ) ||
                Boolean(
                  record.journalMood
                ) ||
                record
                  .journalPhotoUrls
                  .length > 0
            ).length ??
          0,
      }
    );

    return result;
  };

const canonicalizeExplorationData = (
  value: RootExplorationData
) => {
  const normalized = normalizeExplorationData(value);

  return {
    ...normalized,
    visitedPlaceIds: [...normalized.visitedPlaceIds].sort(),
    completedThemeIds: [
      ...normalized.completedThemeIds,
    ].sort(),
    claimedRewardIds: [
      ...normalized.claimedRewardIds,
    ].sort(),
    unlockedBuildingIds: [
      ...normalized.unlockedBuildingIds,
    ].sort(),
    unlockedStampIds: [
      ...normalized.unlockedStampIds,
    ].sort(),
    visitRecords: [...normalized.visitRecords]
      .map((record) => ({
        ...record,
        journalPhotoUrls: [
          ...record.journalPhotoUrls,
        ].sort(),
      }))
      .sort((a, b) => a.placeId.localeCompare(b.placeId)),
  };
};

const isExplorationServerDataConfirmed = (
  expected: RootExplorationData,
  actual: RootExplorationData | null
) => {
  if (!actual) return false;

  return (
    JSON.stringify(canonicalizeExplorationData(expected)) ===
    JSON.stringify(canonicalizeExplorationData(actual))
  );
};

export const saveExplorationDataToServerConfirmed = async (
  data: RootExplorationData,
  expectedUid?: string | null
) => {
  const uid = checkAuthUid(expectedUid);
  const normalized = normalizeExplorationData(data);
  let lastError: any = null;

  for (
    let attempt = 1;
    attempt <= SERVER_CONFIRM_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await saveServerExplorationData(normalized, uid);

      const inspection =
        await inspectServerExplorationData(uid);

      if (
        isExplorationServerDataConfirmed(
          normalized,
          inspection.data
        )
      ) {
        console.log(
          'EXPLORATION SERVER SAVE CONFIRMED',
          {
            uid,
            attempt,
            source: inspection.source,
            updatedAt: normalized.updatedAt,
          }
        );

        return normalized;
      }

      const mismatchError: any = new Error(
        'EXPLORATION_SERVER_SAVE_VERIFY_MISMATCH'
      );
      mismatchError.code =
        'EXPLORATION_SERVER_SAVE_VERIFY_MISMATCH';
      lastError = mismatchError;
    } catch (error: any) {
      lastError = error;

      console.log(
        'EXPLORATION SERVER SAVE CONFIRM ERROR',
        {
          uid,
          attempt,
          code: error?.code ?? null,
          message: error?.message ?? String(error),
        }
      );
    }

    if (attempt < SERVER_CONFIRM_ATTEMPTS) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, 700 * attempt)
      );
    }
  }

  const finalError: any = new Error(
    'EXPLORATION_SERVER_SAVE_NOT_CONFIRMED'
  );
  finalError.code =
    'EXPLORATION_SERVER_SAVE_NOT_CONFIRMED';
  finalError.cause = lastError;
  finalError.localData = normalized;
  throw finalError;
};

export const syncExplorationDataConfirmed = async (): Promise<
  RootExplorationData
> => {
  const localData =
  await loadLocalExplorationData();

const currentUser =
  firebaseAuth.currentUser;

  if (!currentUser?.uid) {
    console.log(
      'EXPLORATION SYNC LOCAL ONLY: NO GOOGLE USER'
    );
    return localData;
  }

  let serverData: RootExplorationData | null = null;

  try {
    const inspection = await inspectServerExplorationData(
      currentUser.uid
    );
    serverData = inspection.data;
  } catch (loadError: any) {
    console.log(
      'EXPLORATION CONFIRMED SYNC SERVER LOAD ERROR: LOCAL WRITE CONTINUES',
      {
        uid: currentUser.uid,
        code: loadError?.code ?? null,
        message:
          loadError?.message ?? String(loadError),
      }
    );
  }

  const merged = normalizeExplorationData({
    ...mergeExplorationData(
      localData,
      serverData ?? createEmptyExplorationData()
    ),
    updatedAt: createNowIso(),
  });

  const localSaved = await persistLocalExplorationData(
    merged,
    false
  );

  await saveExplorationDataToServerConfirmed(
    localSaved,
    currentUser.uid
  );

  console.log('EXPLORATION SYNC CONFIRMED DONE', {
    uid: currentUser.uid,
    points: localSaved.points,
    visitedCount: localSaved.visitedPlaceIds.length,
    completedThemeCount:
      localSaved.completedThemeIds.length,
    updatedAt: localSaved.updatedAt,
  });

  return localSaved;
};

export const syncExplorationData = async (): Promise<
  RootExplorationData
> => {
  try {
    return await syncExplorationDataConfirmed();
  } catch (error: any) {
    console.log('EXPLORATION SYNC ERROR: LOCAL KEPT', {
      code: error?.code ?? null,
      message: error?.message ?? String(error),
    });

    return loadLocalExplorationData();
  }
};

let explorationMutationQueue: Promise<void> =
  Promise.resolve();

const runExplorationMutation = <T,>(
  work: () => Promise<T>
): Promise<T> => {
  const result = explorationMutationQueue.then(work, work);

  explorationMutationQueue = result.then(
    () => undefined,
    () => undefined
  );

  return result;
};

const startBackgroundExplorationSync = () => {
  void syncExplorationData().catch((error) => {
    console.log(
      'EXPLORATION BACKGROUND SYNC ERROR',
      error
    );
  });
};

/*
 * 장소 방문 완료
 */
export const completeExploration = async (
  input: CompleteExplorationInput
) => {
  const result = await runExplorationMutation(async () => {
    const current = await loadLocalExplorationData();
    const placeId = normalizeExplorationPlaceId(
      input.placeId
    );

    if (!placeId) {
      throw new Error('EXPLORATION_PLACE_ID_REQUIRED');
    }

    const definition =
      EXPLORATION_REWARD_BY_PLACE[placeId];

    const rewardId =
      normalizeId(input.rewardId) ??
      getExplorationVisitRewardId(placeId);

    const rewardAlreadyClaimed =
      current.claimedRewardIds.includes(rewardId);

    const rewardPoints = safeNonNegativeNumber(
      input.points ?? definition?.points ?? 0
    );

    const buildingId = normalizeId(
      input.buildingId ?? definition?.buildingId
    );

    const stampId = normalizeId(
      input.stampId ?? definition?.stampId
    );

    const currentRecord = current.visitRecords.find(
      (record) => record.placeId === placeId
    );

    const newRecord: ExplorationVisitRecord = {
      placeId,
      verifiedAt: normalizeIso(
        input.verifiedAt,
        createNowIso()
      ),
      latitude: safeNumber(input.latitude),
      longitude: safeNumber(input.longitude),
      accuracyMeters: safeNonNegativeNumber(
        input.accuracyMeters
      ),
      distanceMeters: safeNonNegativeNumber(
        input.distanceMeters
      ),
      journalMemo: currentRecord?.journalMemo ?? '',
      journalMood: currentRecord?.journalMood ?? null,
      journalUpdatedAt:
        currentRecord?.journalUpdatedAt ?? null,
      journalPhotoUrls:
        currentRecord?.journalPhotoUrls ?? [],
      journalFeedSharedAt:
        currentRecord?.journalFeedSharedAt ?? null,
      journalFeedSharedJournalUpdatedAt:
        currentRecord
          ?.journalFeedSharedJournalUpdatedAt ?? null,
      journalFeedPostId:
        currentRecord?.journalFeedPostId ?? null,
      journalFeedStatusUpdatedAt:
        currentRecord?.journalFeedStatusUpdatedAt ?? null,
    };

    const next = normalizeExplorationData({
      ...current,
      points:
        current.points +
        (rewardAlreadyClaimed ? 0 : rewardPoints),
      visitedPlaceIds: uniqueStrings([
        ...current.visitedPlaceIds,
        placeId,
      ]),
      claimedRewardIds: uniqueStrings([
        ...current.claimedRewardIds,
        rewardId,
      ]),
      unlockedBuildingIds: uniqueStrings([
        ...current.unlockedBuildingIds,
        ...(buildingId ? [buildingId] : []),
      ]),
      unlockedStampIds: uniqueStrings([
        ...current.unlockedStampIds,
        ...(stampId ? [stampId] : []),
      ]),
      visitRecords: mergeVisitRecords(
        current.visitRecords,
        [newRecord]
      ),
      updatedAt: createNowIso(),
    });

    const saved = await persistLocalExplorationData(
      next,
      false
    );

    console.log('EXPLORATION COMPLETE LOCAL DONE', {
      placeId,
      rewardId,
      rewardGranted: !rewardAlreadyClaimed,
      pointsAdded: rewardAlreadyClaimed
        ? 0
        : rewardPoints,
    });

    return {
      data: saved,
      rewardGranted: !rewardAlreadyClaimed,
      rewarded: !rewardAlreadyClaimed,
      pointsAdded: rewardAlreadyClaimed
        ? 0
        : rewardPoints,
    };
  });

  startBackgroundExplorationSync();
  return result;
};

/* 이전 이름과도 호환합니다. */
export const completeExplorationPlace = completeExploration;
export const completeExplorationVisit = completeExploration;

export const completeExplorationTheme = async (
  input: CompleteThemeInput
) => {
  const result = await runExplorationMutation(async () => {
    const current = await loadLocalExplorationData();
    const themeId = normalizeId(input.themeId);

    if (!themeId) {
      throw new Error('EXPLORATION_THEME_ID_REQUIRED');
    }

    const rewardId =
      normalizeId(input.rewardId) ?? themeId;

    const alreadyClaimed =
      current.claimedRewardIds.includes(rewardId);

    const points = safeNonNegativeNumber(input.points);
    const buildingId = normalizeId(input.buildingId);
    const stampId = normalizeId(input.stampId);

    const next = normalizeExplorationData({
      ...current,
      points:
        current.points + (alreadyClaimed ? 0 : points),
      completedThemeIds: uniqueStrings([
        ...current.completedThemeIds,
        themeId,
      ]),
      claimedRewardIds: uniqueStrings([
        ...current.claimedRewardIds,
        rewardId,
      ]),
      unlockedBuildingIds: uniqueStrings([
        ...current.unlockedBuildingIds,
        ...(buildingId ? [buildingId] : []),
      ]),
      unlockedStampIds: uniqueStrings([
        ...current.unlockedStampIds,
        ...(stampId ? [stampId] : []),
      ]),
      updatedAt: createNowIso(),
    });

    const saved = await persistLocalExplorationData(
      next,
      false
    );

    return {
      data: saved,
      rewardGranted: !alreadyClaimed,
      rewarded: !alreadyClaimed,
      pointsAdded: alreadyClaimed ? 0 : points,
    };
  });

  startBackgroundExplorationSync();
  return result;
};

export const completeThemeExploration =
  completeExplorationTheme;

export const setExplorationMainBadge = async (
  badgeId: string | null
) => {
  const saved = await runExplorationMutation(async () => {
    const current = await loadLocalExplorationData();
    const normalizedBadgeId = normalizeId(badgeId);

    const next = normalizeExplorationData({
      ...current,
      mainBadgeId: normalizedBadgeId,
      completedThemeIds: uniqueStrings([
        ...current.completedThemeIds,
        ...(normalizedBadgeId ? [normalizedBadgeId] : []),
      ]),
      claimedRewardIds: uniqueStrings([
        ...current.claimedRewardIds,
        ...(normalizedBadgeId ? [normalizedBadgeId] : []),
      ]),
      updatedAt: createNowIso(),
    });

    return persistLocalExplorationData(next, false);
  });

  startBackgroundExplorationSync();
  return saved;
};

const confirmJournalMutation = async (
  saved: RootExplorationData,
  label: string
) => {
  const currentUser =
  firebaseAuth.currentUser;

  if (!currentUser?.uid) {
    console.log(`${label} SERVER SKIPPED: LOCAL USER`);
    return saved;
  }

  try {
    return await syncExplorationDataConfirmed();
  } catch (error: any) {
    if (!error?.localData) error.localData = saved;
    throw error;
  }
};

export const saveExplorationJournal = async (
  input: SaveExplorationJournalInput
) => {
  const saved = await runExplorationMutation(async () => {
    const current = await loadLocalExplorationData();
    const placeId = normalizeExplorationPlaceId(
      input.placeId
    );

    if (!placeId) {
      throw new Error(
        'EXPLORATION_JOURNAL_PLACE_ID_REQUIRED'
      );
    }

    const currentRecord = current.visitRecords.find(
      (record) => record.placeId === placeId
    );

    if (!currentRecord) {
      throw new Error(
        'EXPLORATION_JOURNAL_RECORD_NOT_FOUND'
      );
    }

    const journalUpdatedAt = createNowIso();

    const nextVisitRecords = current.visitRecords.map(
      (record) =>
        record.placeId === placeId
          ? {
              ...record,
              journalMemo: String(input.memo ?? '')
                .trim()
                .slice(0, 500),
              journalMood: normalizeId(input.mood),
              journalPhotoUrls:
                input.photoUrls === undefined ||
                input.photoUrls === null
                  ? record.journalPhotoUrls
                  : normalizeJournalPhotoUrls(
                      input.photoUrls
                    ),
              journalUpdatedAt,
            }
          : record
    );

    const next = normalizeExplorationData({
      ...current,
      visitRecords: nextVisitRecords,
      updatedAt: journalUpdatedAt,
    });

    const localSaved = await persistLocalExplorationData(
      next,
      false
    );

    console.log('EXPLORATION JOURNAL LOCAL SAVE DONE', {
      placeId,
      journalUpdatedAt,
      photoCount:
        localSaved.visitRecords.find(
          (record) => record.placeId === placeId
        )?.journalPhotoUrls.length ?? 0,
    });

    return localSaved;
  });

  return confirmJournalMutation(
    saved,
    'EXPLORATION JOURNAL SAVE'
  );
};

export const markExplorationJournalFeedShared = async (
  input: MarkExplorationJournalFeedSharedInput
) => {
  const saved = await runExplorationMutation(async () => {
    const current = await loadLocalExplorationData();
    const placeId = normalizeExplorationPlaceId(
      input.placeId
    );

    if (!placeId) {
      throw new Error(
        'EXPLORATION_JOURNAL_SHARE_PLACE_ID_REQUIRED'
      );
    }

    const currentRecord = current.visitRecords.find(
      (record) => record.placeId === placeId
    );

    if (!currentRecord) {
      throw new Error(
        'EXPLORATION_JOURNAL_SHARE_RECORD_NOT_FOUND'
      );
    }

    const sharedJournalUpdatedAt =
      normalizeNullableIso(
        input.sharedJournalUpdatedAt
      ) ??
      currentRecord.journalUpdatedAt ??
      currentRecord.verifiedAt;

    const journalFeedSharedAt =
      normalizeNullableIso(input.sharedAt) ??
      createNowIso();

    const journalFeedPostId = normalizeId(input.postId);

    const nextVisitRecords = current.visitRecords.map(
      (record) =>
        record.placeId === placeId
          ? {
              ...record,
              journalFeedSharedAt,
              journalFeedSharedJournalUpdatedAt:
                sharedJournalUpdatedAt,
              journalFeedPostId,
              journalFeedStatusUpdatedAt:
                journalFeedSharedAt,
            }
          : record
    );

    const next = normalizeExplorationData({
      ...current,
      visitRecords: nextVisitRecords,
      updatedAt: journalFeedSharedAt,
    });

    return persistLocalExplorationData(next, false);
  });

  return confirmJournalMutation(
    saved,
    'EXPLORATION JOURNAL FEED STATUS SAVE'
  );
};

export const clearExplorationJournalFeedShared = async (
  input: ClearExplorationJournalFeedSharedInput
) => {
  const saved = await runExplorationMutation(async () => {
    const current = await loadLocalExplorationData();
    const placeId = normalizeExplorationPlaceId(
      input.placeId
    );

    if (!placeId) {
      throw new Error(
        'EXPLORATION_JOURNAL_UNSHARE_PLACE_ID_REQUIRED'
      );
    }

    const currentRecord = current.visitRecords.find(
      (record) => record.placeId === placeId
    );

    if (!currentRecord) {
      throw new Error(
        'EXPLORATION_JOURNAL_UNSHARE_RECORD_NOT_FOUND'
      );
    }

    const statusUpdatedAt = createNowIso();

    const nextVisitRecords = current.visitRecords.map(
      (record) =>
        record.placeId === placeId
          ? {
              ...record,
              journalFeedSharedAt: null,
              journalFeedSharedJournalUpdatedAt: null,
              journalFeedPostId: null,
              journalFeedStatusUpdatedAt:
                statusUpdatedAt,
            }
          : record
    );

    const next = normalizeExplorationData({
      ...current,
      visitRecords: nextVisitRecords,
      updatedAt: statusUpdatedAt,
    });

    return persistLocalExplorationData(next, false);
  });

  return confirmJournalMutation(
    saved,
    'EXPLORATION JOURNAL FEED STATUS CLEAR'
  );
};

export const deleteExplorationJournal = async (
  input: DeleteExplorationJournalInput
) => {
  const clearFeedStatus = input.clearFeedStatus === true;

  const saved = await runExplorationMutation(async () => {
    const current = await loadLocalExplorationData();
    const placeId = normalizeExplorationPlaceId(
      input.placeId
    );

    if (!placeId) {
      throw new Error(
        'EXPLORATION_JOURNAL_DELETE_PLACE_ID_REQUIRED'
      );
    }

    const currentRecord = current.visitRecords.find(
      (record) => record.placeId === placeId
    );

    if (!currentRecord) {
      throw new Error(
        'EXPLORATION_JOURNAL_DELETE_RECORD_NOT_FOUND'
      );
    }

    const deletedAt = createNowIso();

    const nextVisitRecords = current.visitRecords.map(
      (record) => {
        if (record.placeId !== placeId) return record;

        return {
          ...record,
          journalMemo: '',
          journalMood: null,
          journalPhotoUrls: [],
          journalUpdatedAt: deletedAt,
          ...(clearFeedStatus
            ? {
                journalFeedSharedAt: null,
                journalFeedSharedJournalUpdatedAt: null,
                journalFeedPostId: null,
                journalFeedStatusUpdatedAt: deletedAt,
              }
            : {}),
        };
      }
    );

    const next = normalizeExplorationData({
      ...current,
      visitRecords: nextVisitRecords,
      updatedAt: deletedAt,
    });

    return persistLocalExplorationData(next, false);
  });

  return confirmJournalMutation(
    saved,
    'EXPLORATION JOURNAL DELETE'
  );
};

/*
 * 이전 코드에서 사용하던 이름과의 호환 별칭입니다.
 */
export const loadExplorationData =
  loadLocalExplorationData;

export const saveExplorationData =
  saveLocalExplorationData;
