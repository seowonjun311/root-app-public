import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';
import {
  getAuth,
} from '@react-native-firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';

// SAVED_CAFE_V50_RECOMMENDATION_PREFERENCE_STORE

const GUEST_KEY =
  'root_saved_cafe_recommendation_preferences_guest_v1';
const USER_KEY_PREFIX =
  'root_saved_cafe_recommendation_preferences_user_v1:';
const GUEST_ADOPTION_KEY_PREFIX =
  'root_saved_cafe_recommendation_preferences_guest_adoption_v1:';

const LOAD_TIMEOUT_MS = 4500;
const READ_TIMEOUT_MS = 6000;
const WRITE_TIMEOUT_MS = 9000;

export type SavedCafeRecommendationPreferenceAxisId =
  | 'studyWork'
  | 'quietRest'
  | 'dateMood'
  | 'dessert'
  | 'spacious'
  | 'viewPhoto'
  | 'solo'
  | 'lateNight';

export type SavedCafeRecommendationPreferenceWeight =
  | -2
  | -1
  | 0
  | 1
  | 2;

export type SavedCafeRecommendationAutoLearningStrength =
  | 'low'
  | 'balanced'
  | 'high';

export type SavedCafeRecommendationPreferenceState = {
  version: 1;
  weights: Record<
    SavedCafeRecommendationPreferenceAxisId,
    SavedCafeRecommendationPreferenceWeight
  >;
  autoLearningStrength:
    SavedCafeRecommendationAutoLearningStrength;
  updatedAt: string;
};

export type SavedCafeRecommendationPreferenceSummary = {
  adjustedCount: number;
  positiveCount: number;
  negativeCount: number;
  autoLearningStrength:
    SavedCafeRecommendationAutoLearningStrength;
  autoLearningStrengthLabel: string;
};

export const SAVED_CAFE_RECOMMENDATION_PREFERENCE_AXES:
  ReadonlyArray<{
    id: SavedCafeRecommendationPreferenceAxisId;
    label: string;
    description: string;
  }> = [
    {
      id: 'studyWork',
      label: '공부·작업',
      description:
        '공부, 노트북, 와이파이, 콘센트, 넓은 테이블을 중요하게 봐요.',
    },
    {
      id: 'quietRest',
      label: '조용·휴식',
      description:
        '조용함, 독서, 편안한 분위기와 오래 머물기 좋은 곳을 봐요.',
    },
    {
      id: 'dateMood',
      label: '데이트·감성',
      description:
        '데이트, 감성 분위기, 채광과 특별한 무드를 중요하게 봐요.',
    },
    {
      id: 'dessert',
      label: '커피·디저트',
      description:
        '커피, 케이크, 베이커리, 브런치와 시그니처 메뉴를 봐요.',
    },
    {
      id: 'spacious',
      label: '넓은 공간',
      description:
        '대형 공간, 많은 좌석, 넓은 좌석 간격과 단체 이용을 봐요.',
    },
    {
      id: 'viewPhoto',
      label: '뷰·사진',
      description:
        '좋은 뷰, 사진 포인트, 야경, 노을과 정원을 중요하게 봐요.',
    },
    {
      id: 'solo',
      label: '혼자 가기',
      description:
        '1인석, 혼자 머물기 편함, 독서와 노트북 이용을 봐요.',
    },
    {
      id: 'lateNight',
      label: '심야·24시간',
      description:
        '심야 영업, 24시간, 늦게까지 영업하는 카페를 중요하게 봐요.',
    },
  ];

const DEFAULT_WEIGHTS:
  Record<
    SavedCafeRecommendationPreferenceAxisId,
    SavedCafeRecommendationPreferenceWeight
  > = {
    studyWork: 0,
    quietRest: 0,
    dateMood: 0,
    dessert: 0,
    spacious: 0,
    viewPhoto: 0,
    solo: 0,
    lateNight: 0,
  };

type Scope = {
  uid: string | null;
  storageKey: string;
  isGuest: boolean;
};

type PreparedState = {
  state: SavedCafeRecommendationPreferenceState;
  adoptedGuestData: boolean;
};

let runningSync:
  | Promise<SavedCafeRecommendationPreferenceState>
  | null = null;
let syncRequested = false;
let syncRequestVersion = 0;
let latestSyncReason = 'unspecified';

function nowIso() {
  return new Date().toISOString();
}

function parseDateTime(
  value: unknown,
) {
  if (
    value &&
    typeof (value as any)?.toDate === 'function'
  ) {
    const date =
      (value as any).toDate();
    const time =
      date?.getTime?.();

    return Number.isFinite(time)
      ? time
      : 0;
  }

  if (
    typeof value !== 'string'
  ) {
    return 0;
  }

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function normalizeWeight(
  value: unknown,
): SavedCafeRecommendationPreferenceWeight {
  const number =
    typeof value === 'number'
      ? Math.round(value)
      : Number(value);

  if (number <= -2) {
    return -2;
  }

  if (number === -1) {
    return -1;
  }

  if (number === 1) {
    return 1;
  }

  if (number >= 2) {
    return 2;
  }

  return 0;
}

function normalizeAutoLearningStrength(
  value: unknown,
): SavedCafeRecommendationAutoLearningStrength {
  return value === 'low' ||
    value === 'high'
    ? value
    : 'balanced';
}

export function createDefaultSavedCafeRecommendationPreferenceState():
  SavedCafeRecommendationPreferenceState {
  return {
    version: 1,
    weights: {
      ...DEFAULT_WEIGHTS,
    },
    autoLearningStrength:
      'balanced',
    updatedAt: nowIso(),
  };
}

function normalizeState(
  value: unknown,
): SavedCafeRecommendationPreferenceState {
  const source =
    value &&
    typeof value === 'object'
      ? value as any
      : {};

  const sourceWeights =
    source.weights &&
    typeof source.weights === 'object'
      ? source.weights as any
      : {};

  return {
    version: 1,
    weights: {
      studyWork:
        normalizeWeight(
          sourceWeights.studyWork,
        ),
      quietRest:
        normalizeWeight(
          sourceWeights.quietRest,
        ),
      dateMood:
        normalizeWeight(
          sourceWeights.dateMood,
        ),
      dessert:
        normalizeWeight(
          sourceWeights.dessert,
        ),
      spacious:
        normalizeWeight(
          sourceWeights.spacious,
        ),
      viewPhoto:
        normalizeWeight(
          sourceWeights.viewPhoto,
        ),
      solo:
        normalizeWeight(
          sourceWeights.solo,
        ),
      lateNight:
        normalizeWeight(
          sourceWeights.lateNight,
        ),
    },
    autoLearningStrength:
      normalizeAutoLearningStrength(
        source.autoLearningStrength,
      ),
    updatedAt:
      parseDateTime(
        source.updatedAt,
      ) > 0
        ? new Date(
            parseDateTime(
              source.updatedAt,
            ),
          ).toISOString()
        : nowIso(),
  };
}

function hasCustomPreferences(
  state: SavedCafeRecommendationPreferenceState,
) {
  return (
    Object.values(
      state.weights,
    ).some(
      (weight) =>
        weight !== 0,
    ) ||
    state.autoLearningStrength !==
      'balanced'
  );
}

export function mergeSavedCafeRecommendationPreferenceStates(
  first: SavedCafeRecommendationPreferenceState,
  second: SavedCafeRecommendationPreferenceState,
) {
  return parseDateTime(
    first.updatedAt,
  ) >=
    parseDateTime(
      second.updatedAt,
    )
    ? normalizeState(first)
    : normalizeState(second);
}

function getCurrentScope(): Scope {
  const uid =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  return {
    uid,
    storageKey:
      uid
        ? `${USER_KEY_PREFIX}${uid}`
        : GUEST_KEY,
    isGuest: !uid,
  };
}

function getGuestAdoptionKey(
  uid: string,
) {
  return `${GUEST_ADOPTION_KEY_PREFIX}${uid}`;
}

async function readStateFromKey(
  storageKey: string,
) {
  try {
    const raw =
      await AsyncStorage.getItem(
        storageKey,
      );

    return raw
      ? normalizeState(
          JSON.parse(raw),
        )
      : null;
  } catch (error) {
    console.log(
      'SAVED CAFE RECOMMENDATION PREFERENCE LOCAL READ ERROR',
      {
        storageKey,
        error,
      },
    );

    return null;
  }
}

async function writeStateToKey(
  storageKey: string,
  state: SavedCafeRecommendationPreferenceState,
) {
  const normalized =
    normalizeState(state);

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(
      normalized,
    ),
  );

  return normalized;
}

async function prepareLocalState(
  scope: Scope,
): Promise<PreparedState> {
  const current =
    await readStateFromKey(
      scope.storageKey,
    );

  if (current) {
    const adoptionPending =
      scope.uid
        ? await AsyncStorage.getItem(
            getGuestAdoptionKey(
              scope.uid,
            ),
          ) === 'true'
        : false;

    return {
      state: current,
      adoptedGuestData:
        adoptionPending,
    };
  }

  if (!scope.isGuest) {
    const guest =
      await readStateFromKey(
        GUEST_KEY,
      );

    if (
      guest &&
      hasCustomPreferences(
        guest,
      )
    ) {
      const adopted =
        await writeStateToKey(
          scope.storageKey,
          guest,
        );

      if (scope.uid) {
        await AsyncStorage.setItem(
          getGuestAdoptionKey(
            scope.uid,
          ),
          'true',
        );
      }

      console.log(
        'SAVED CAFE RECOMMENDATION PREFERENCE GUEST DATA ADOPTED',
        {
          uid: scope.uid,
        },
      );

      return {
        state: adopted,
        adoptedGuestData: true,
      };
    }
  }

  const empty =
    createDefaultSavedCafeRecommendationPreferenceState();

  await writeStateToKey(
    scope.storageKey,
    empty,
  );

  return {
    state: empty,
    adoptedGuestData: false,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  return new Promise<T>(
    (resolve, reject) => {
      const timer =
        setTimeout(() => {
          reject(
            new Error(
              errorMessage,
            ),
          );
        }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    },
  );
}

function getSnapshotExists(
  snapshot: any,
) {
  return typeof snapshot?.exists ===
    'function'
    ? snapshot.exists()
    : Boolean(
        snapshot?.exists,
      );
}

function createServerState(
  userData: any,
) {
  if (
    userData
      ?.savedCafeRecommendationPreferenceData
  ) {
    return normalizeState(
      userData.savedCafeRecommendationPreferenceData,
    );
  }

  return {
    ...createDefaultSavedCafeRecommendationPreferenceState(),
    updatedAt:
      '1970-01-01T00:00:00.000Z',
  };
}

function toFirestoreSafeState(
  state: SavedCafeRecommendationPreferenceState,
) {
  return JSON.parse(
    JSON.stringify(
      normalizeState(state),
    ),
  ) as SavedCafeRecommendationPreferenceState;
}

async function performSync(
  reason: string,
) {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  if (!scope.uid) {
    console.log(
      'SAVED CAFE RECOMMENDATION PREFERENCE SYNC LOCAL ONLY',
      {
        reason,
      },
    );

    return prepared.state;
  }

  const expectedUid =
    scope.uid;

  // ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD
  const activeUidBeforePrivateUserRead =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  if (
    !activeUidBeforePrivateUserRead ||
    String(
      activeUidBeforePrivateUserRead,
    ) !==
      String(
        expectedUid,
      )
  ) {
    throw new Error(
      'SAVED_CAFE_RECOMMENDATION_PREFERENCES_SELF_ONLY_UID_REQUIRED',
    );
  }

  const db =
    getFirestore(
      getApp(),
    );

  const userRef =
    doc(
      db,
      'users',
      expectedUid,
    );

  const snapshot =
    await withTimeout(
      getDoc(userRef),
      READ_TIMEOUT_MS,
      'SAVED_CAFE_RECOMMENDATION_PREFERENCE_FIRESTORE_READ_TIMEOUT',
    );

  const activeUidAfterRead =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  if (
    activeUidAfterRead !==
    expectedUid
  ) {
    throw new Error(
      'SAVED_CAFE_RECOMMENDATION_PREFERENCE_AUTH_UID_CHANGED_DURING_READ',
    );
  }

  const serverState =
    getSnapshotExists(
      snapshot,
    )
      ? createServerState(
          snapshot.data(),
        )
      : {
          ...createDefaultSavedCafeRecommendationPreferenceState(),
          updatedAt:
            '1970-01-01T00:00:00.000Z',
        };

  const latestLocal =
    (
      await readStateFromKey(
        scope.storageKey,
      )
    ) ?? prepared.state;

  const merged =
    mergeSavedCafeRecommendationPreferenceStates(
      latestLocal,
      serverState,
    );

  await writeStateToKey(
    scope.storageKey,
    merged,
  );

  const firestoreState =
    toFirestoreSafeState(
      merged,
    );

  await withTimeout(
    setDoc(
      userRef,
      {
        uid: expectedUid,
        savedCafeRecommendationPreferenceData:
          firestoreState,
        savedCafeRecommendationPreferenceUpdatedAt:
          firestoreState.updatedAt,
      },
      {
        merge: true,
      },
    ),
    WRITE_TIMEOUT_MS,
    'SAVED_CAFE_RECOMMENDATION_PREFERENCE_FIRESTORE_WRITE_TIMEOUT',
  );

  const activeUidAfterWrite =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  if (
    activeUidAfterWrite !==
    expectedUid
  ) {
    throw new Error(
      'SAVED_CAFE_RECOMMENDATION_PREFERENCE_AUTH_UID_CHANGED_DURING_WRITE',
    );
  }

  if (
    prepared.adoptedGuestData
  ) {
    await Promise.all([
      AsyncStorage.removeItem(
        GUEST_KEY,
      ),
      AsyncStorage.removeItem(
        getGuestAdoptionKey(
          expectedUid,
        ),
      ),
    ]);
  }

  console.log(
    'SAVED CAFE RECOMMENDATION PREFERENCE CLOUD SYNC DONE',
    {
      uid: expectedUid,
      reason,
      adjustedCount:
        getSavedCafeRecommendationPreferenceSummary(
          merged,
        ).adjustedCount,
      adoptedGuestData:
        prepared.adoptedGuestData,
    },
  );

  return merged;
}

async function runSyncLoop() {
  let latestState =
    createDefaultSavedCafeRecommendationPreferenceState();

  while (true) {
    const targetVersion =
      syncRequestVersion;

    syncRequested = false;

    latestState =
      await performSync(
        latestSyncReason,
      );

    if (
      targetVersion ===
        syncRequestVersion &&
      !syncRequested
    ) {
      return latestState;
    }
  }
}

export async function syncSavedCafeRecommendationPreferenceState(
  reason = 'manual',
) {
  syncRequested = true;
  syncRequestVersion += 1;
  latestSyncReason = reason;

  if (!runningSync) {
    runningSync =
      runSyncLoop()
        .finally(() => {
          runningSync = null;
        });
  }

  return runningSync;
}

function startBackgroundSync(
  reason: string,
) {
  void syncSavedCafeRecommendationPreferenceState(
    reason,
  ).catch((error) => {
    console.log(
      'SAVED CAFE RECOMMENDATION PREFERENCE BACKGROUND SYNC ERROR',
      error,
    );
  });
}

export async function loadSavedCafeRecommendationPreferenceStateLocalOnly() {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  return prepared.state;
}

export async function loadSavedCafeRecommendationPreferenceState() {
  const local =
    await loadSavedCafeRecommendationPreferenceStateLocalOnly();

  try {
    return await withTimeout(
      syncSavedCafeRecommendationPreferenceState(
        'recommendation-preference-screen-load',
      ),
      LOAD_TIMEOUT_MS,
      'SAVED_CAFE_RECOMMENDATION_PREFERENCE_LOAD_TIMEOUT',
    );
  } catch (error) {
    console.log(
      'SAVED CAFE RECOMMENDATION PREFERENCE LOAD FALLBACK',
      error,
    );

    startBackgroundSync(
      'recommendation-preference-screen-load-retry',
    );

    return local;
  }
}

async function saveLocalMutation(
  nextState: SavedCafeRecommendationPreferenceState,
  reason: string,
) {
  const scope =
    getCurrentScope();

  const saved =
    await writeStateToKey(
      scope.storageKey,
      nextState,
    );

  startBackgroundSync(
    reason,
  );

  return saved;
}

export async function setSavedCafeRecommendationPreferenceWeight(
  axis: SavedCafeRecommendationPreferenceAxisId,
  weightInput: SavedCafeRecommendationPreferenceWeight,
) {
  const state =
    await loadSavedCafeRecommendationPreferenceStateLocalOnly();

  const weight =
    normalizeWeight(
      weightInput,
    );

  const next =
    normalizeState({
      ...state,
      weights: {
        ...state.weights,
        [axis]: weight,
      },
      updatedAt: nowIso(),
    });

  return saveLocalMutation(
    next,
    `set-recommendation-preference:${axis}:${weight}`,
  );
}

export async function setSavedCafeRecommendationAutoLearningStrength(
  strength: SavedCafeRecommendationAutoLearningStrength,
) {
  const state =
    await loadSavedCafeRecommendationPreferenceStateLocalOnly();

  const next =
    normalizeState({
      ...state,
      autoLearningStrength:
        normalizeAutoLearningStrength(
          strength,
        ),
      updatedAt: nowIso(),
    });

  return saveLocalMutation(
    next,
    `set-recommendation-auto-learning:${strength}`,
  );
}

export async function resetSavedCafeRecommendationPreferences() {
  const next =
    createDefaultSavedCafeRecommendationPreferenceState();

  next.updatedAt =
    nowIso();

  return saveLocalMutation(
    next,
    'reset-recommendation-preferences',
  );
}

export function getSavedCafeRecommendationPreferenceWeightLabel(
  weight: SavedCafeRecommendationPreferenceWeight,
) {
  switch (weight) {
    case -2:
      return '피하고 싶어요';
    case -1:
      return '덜 중요';
    case 1:
      return '중요';
    case 2:
      return '매우 중요';
    default:
      return '기본';
  }
}

export function getSavedCafeRecommendationAutoLearningStrengthLabel(
  strength: SavedCafeRecommendationAutoLearningStrength,
) {
  switch (strength) {
    case 'low':
      return '낮게';
    case 'high':
      return '높게';
    default:
      return '균형';
  }
}

export function getSavedCafeRecommendationPreferenceSummary(
  state:
    | SavedCafeRecommendationPreferenceState
    | null
    | undefined,
): SavedCafeRecommendationPreferenceSummary {
  const normalized =
    state
      ? normalizeState(state)
      : createDefaultSavedCafeRecommendationPreferenceState();

  const weights =
    Object.values(
      normalized.weights,
    );

  return {
    adjustedCount:
      weights.filter(
        (weight) =>
          weight !== 0,
      ).length,
    positiveCount:
      weights.filter(
        (weight) =>
          weight > 0,
      ).length,
    negativeCount:
      weights.filter(
        (weight) =>
          weight < 0,
      ).length,
    autoLearningStrength:
      normalized.autoLearningStrength,
    autoLearningStrengthLabel:
      getSavedCafeRecommendationAutoLearningStrengthLabel(
        normalized.autoLearningStrength,
      ),
  };
}
