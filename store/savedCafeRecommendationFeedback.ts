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

// SAVED_CAFE_V49_RECOMMENDATION_FEEDBACK_STORE

const SAVED_CAFE_RECOMMENDATION_FEEDBACK_GUEST_KEY =
  'root_saved_cafe_recommendation_feedback_guest_v1';

const SAVED_CAFE_RECOMMENDATION_FEEDBACK_USER_KEY_PREFIX =
  'root_saved_cafe_recommendation_feedback_user_v1:';

const SAVED_CAFE_RECOMMENDATION_FEEDBACK_GUEST_ADOPTION_KEY_PREFIX =
  'root_saved_cafe_recommendation_feedback_guest_adoption_v1:';

const SAVED_CAFE_RECOMMENDATION_FEEDBACK_VERSION = 1;

const SAVED_CAFE_RECOMMENDATION_FEEDBACK_LOAD_TIMEOUT_MS =
  4500;

const SAVED_CAFE_RECOMMENDATION_FEEDBACK_READ_TIMEOUT_MS =
  6000;

const SAVED_CAFE_RECOMMENDATION_FEEDBACK_WRITE_TIMEOUT_MS =
  9000;

export type SavedCafeRecommendationReaction =
  | 'interested'
  | 'wantToGo'
  | 'notInterested';

export type SavedCafeRecommendationFeedback = {
  placeId: string;
  reaction:
    | SavedCafeRecommendationReaction
    | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedCafeRecommendationFeedbackState = {
  version: 1;
  feedbacks:
    SavedCafeRecommendationFeedback[];
  updatedAt: string;
};

export type SavedCafeRecommendationFeedbackSummary = {
  total: number;
  interested: number;
  wantToGo: number;
  notInterested: number;
};

type SavedCafeRecommendationFeedbackScope = {
  uid: string | null;
  storageKey: string;
  isGuest: boolean;
};

type PreparedSavedCafeRecommendationFeedbackState = {
  state:
    SavedCafeRecommendationFeedbackState;
  adoptedGuestData: boolean;
};

let runningSync:
  | Promise<SavedCafeRecommendationFeedbackState>
  | null = null;

let syncRequested = false;
let syncRequestVersion = 0;
let latestSyncReason = 'unspecified';

function createNowIso() {
  return new Date().toISOString();
}

function parseDateTime(
  value: unknown,
) {
  if (
    value &&
    typeof (value as any)?.toDate ===
      'function'
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
    value &&
    typeof (value as any)?.seconds ===
      'number'
  ) {
    return Number(
      (value as any).seconds,
    ) * 1000;
  }

  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return 0;
  }

  const parsed =
    new Date(value).getTime();

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function normalizeId(
  value: unknown,
) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

const REACTION_VALUES:
  SavedCafeRecommendationReaction[] = [
    'interested',
    'wantToGo',
    'notInterested',
  ];

function normalizeReaction(
  value: unknown,
): SavedCafeRecommendationReaction | null {
  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  return REACTION_VALUES.includes(
    value as SavedCafeRecommendationReaction,
  )
    ? value as SavedCafeRecommendationReaction
    : null;
}

function normalizeIsoDate(
  value: unknown,
  fallback: string,
) {
  const time =
    parseDateTime(value);

  return time > 0
    ? new Date(time).toISOString()
    : fallback;
}

function createEmptyState():
  SavedCafeRecommendationFeedbackState {
  return {
    version:
      SAVED_CAFE_RECOMMENDATION_FEEDBACK_VERSION,
    feedbacks: [],
    updatedAt: createNowIso(),
  };
}

function normalizeFeedback(
  value: unknown,
): SavedCafeRecommendationFeedback | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const source =
    value as Partial<SavedCafeRecommendationFeedback>;

  const placeId =
    normalizeId(
      source.placeId,
    );

  if (!placeId) {
    return null;
  }

  const now =
    createNowIso();

  const createdAt =
    normalizeIsoDate(
      source.createdAt,
      now,
    );

  const updatedAt =
    normalizeIsoDate(
      source.updatedAt,
      createdAt,
    );

  return {
    placeId,
    reaction:
      normalizeReaction(
        source.reaction,
      ),
    createdAt,
    updatedAt,
  };
}

function keepLatestFeedbacks(
  values:
    SavedCafeRecommendationFeedback[],
) {
  const map =
    new Map<
      string,
      SavedCafeRecommendationFeedback
    >();

  values.forEach((value) => {
    const current =
      map.get(
        value.placeId,
      );

    if (
      !current ||
      parseDateTime(
        value.updatedAt,
      ) >=
        parseDateTime(
          current.updatedAt,
        )
    ) {
      map.set(
        value.placeId,
        value,
      );
    }
  });

  return Array.from(
    map.values(),
  );
}

function normalizeState(
  value: unknown,
): SavedCafeRecommendationFeedbackState {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return createEmptyState();
  }

  const source =
    value as Partial<SavedCafeRecommendationFeedbackState>;

  const feedbacks =
    keepLatestFeedbacks(
      (
        Array.isArray(
          source.feedbacks,
        )
          ? source.feedbacks
          : []
      )
        .map(
          normalizeFeedback,
        )
        .filter(
          (
            item,
          ): item is SavedCafeRecommendationFeedback =>
            Boolean(item),
        ),
    );

  const latestItemTime =
    Math.max(
      parseDateTime(
        source.updatedAt,
      ),
      ...feedbacks.map(
        (item) =>
          parseDateTime(
            item.updatedAt,
          ),
      ),
    );

  return {
    version:
      SAVED_CAFE_RECOMMENDATION_FEEDBACK_VERSION,
    feedbacks:
      feedbacks.sort(
        (first, second) =>
          parseDateTime(
            second.updatedAt,
          ) -
          parseDateTime(
            first.updatedAt,
          ),
      ),
    updatedAt:
      latestItemTime > 0
        ? new Date(
            latestItemTime,
          ).toISOString()
        : createNowIso(),
  };
}

export function mergeSavedCafeRecommendationFeedbackStates(
  first:
    SavedCafeRecommendationFeedbackState,
  second:
    SavedCafeRecommendationFeedbackState,
) {
  return normalizeState({
    feedbacks: [
      ...first.feedbacks,
      ...second.feedbacks,
    ],
    updatedAt:
      parseDateTime(
        first.updatedAt,
      ) >=
      parseDateTime(
        second.updatedAt,
      )
        ? first.updatedAt
        : second.updatedAt,
  });
}

function getCurrentScope():
  SavedCafeRecommendationFeedbackScope {
  const uid =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  return {
    uid,
    storageKey:
      uid
        ? `${SAVED_CAFE_RECOMMENDATION_FEEDBACK_USER_KEY_PREFIX}${uid}`
        : SAVED_CAFE_RECOMMENDATION_FEEDBACK_GUEST_KEY,
    isGuest: !uid,
  };
}

function getGuestAdoptionKey(
  uid: string,
) {
  return `${SAVED_CAFE_RECOMMENDATION_FEEDBACK_GUEST_ADOPTION_KEY_PREFIX}${uid}`;
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
      'SAVED CAFE RECOMMENDATION FEEDBACK LOCAL READ ERROR',
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
  state:
    SavedCafeRecommendationFeedbackState,
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
  scope:
    SavedCafeRecommendationFeedbackScope,
): Promise<PreparedSavedCafeRecommendationFeedbackState> {
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
        SAVED_CAFE_RECOMMENDATION_FEEDBACK_GUEST_KEY,
      );

    if (
      guest &&
      guest.feedbacks.length > 0
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
        'SAVED CAFE RECOMMENDATION FEEDBACK GUEST DATA ADOPTED',
        {
          uid: scope.uid,
          feedbackCount:
            adopted.feedbacks.length,
        },
      );

      return {
        state: adopted,
        adoptedGuestData: true,
      };
    }
  }

  const empty =
    createEmptyState();

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
  return userData
    ?.savedCafeRecommendationFeedbackData
    ? normalizeState(
        userData.savedCafeRecommendationFeedbackData,
      )
    : createEmptyState();
}

function toFirestoreSafeState(
  state:
    SavedCafeRecommendationFeedbackState,
) {
  return JSON.parse(
    JSON.stringify(
      normalizeState(state),
    ),
  ) as SavedCafeRecommendationFeedbackState;
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
      'SAVED CAFE RECOMMENDATION FEEDBACK SYNC LOCAL ONLY',
      {
        reason,
        feedbackCount:
          prepared.state.feedbacks.length,
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
      'SAVED_CAFE_RECOMMENDATION_FEEDBACK_SELF_ONLY_UID_REQUIRED',
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
      SAVED_CAFE_RECOMMENDATION_FEEDBACK_READ_TIMEOUT_MS,
      'SAVED_CAFE_RECOMMENDATION_FEEDBACK_FIRESTORE_READ_TIMEOUT',
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
      'SAVED_CAFE_RECOMMENDATION_FEEDBACK_AUTH_UID_CHANGED_DURING_READ',
    );
  }

  const serverState =
    getSnapshotExists(
      snapshot,
    )
      ? createServerState(
          snapshot.data(),
        )
      : createEmptyState();

  const latestLocal =
    (
      await readStateFromKey(
        scope.storageKey,
      )
    ) ?? prepared.state;

  const merged =
    mergeSavedCafeRecommendationFeedbackStates(
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
        uid:
          expectedUid,
        savedCafeRecommendationFeedbackData:
          firestoreState,
        savedCafeRecommendationFeedbackUpdatedAt:
          firestoreState.updatedAt,
      },
      {
        merge: true,
      },
    ),
    SAVED_CAFE_RECOMMENDATION_FEEDBACK_WRITE_TIMEOUT_MS,
    'SAVED_CAFE_RECOMMENDATION_FEEDBACK_FIRESTORE_WRITE_TIMEOUT',
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
      'SAVED_CAFE_RECOMMENDATION_FEEDBACK_AUTH_UID_CHANGED_DURING_WRITE',
    );
  }

  if (
    prepared.adoptedGuestData
  ) {
    await Promise.all([
      AsyncStorage.removeItem(
        SAVED_CAFE_RECOMMENDATION_FEEDBACK_GUEST_KEY,
      ),
      AsyncStorage.removeItem(
        getGuestAdoptionKey(
          expectedUid,
        ),
      ),
    ]);
  }

  console.log(
    'SAVED CAFE RECOMMENDATION FEEDBACK CLOUD SYNC DONE',
    {
      uid:
        expectedUid,
      reason,
      feedbackCount:
        merged.feedbacks.length,
      adoptedGuestData:
        prepared.adoptedGuestData,
    },
  );

  return merged;
}

async function runSyncLoop() {
  let latestState =
    createEmptyState();

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

export async function syncSavedCafeRecommendationFeedbackState(
  reason = 'manual',
) {
  syncRequestVersion += 1;
  syncRequested = true;
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
  void syncSavedCafeRecommendationFeedbackState(
    reason,
  ).catch((error) => {
    console.log(
      'SAVED CAFE RECOMMENDATION FEEDBACK BACKGROUND SYNC ERROR',
      {
        reason,
        error,
      },
    );
  });
}

export async function loadSavedCafeRecommendationFeedbackStateLocalOnly() {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  return prepared.state;
}

export async function loadSavedCafeRecommendationFeedbackState() {
  const local =
    await loadSavedCafeRecommendationFeedbackStateLocalOnly();

  const scope =
    getCurrentScope();

  if (!scope.uid) {
    return local;
  }

  try {
    return await withTimeout(
      syncSavedCafeRecommendationFeedbackState(
        'recommendation-screen-load',
      ),
      SAVED_CAFE_RECOMMENDATION_FEEDBACK_LOAD_TIMEOUT_MS,
      'SAVED_CAFE_RECOMMENDATION_FEEDBACK_LOAD_TIMEOUT',
    );
  } catch (error) {
    console.log(
      'SAVED CAFE RECOMMENDATION FEEDBACK LOAD FALLBACK',
      error,
    );

    startBackgroundSync(
      'recommendation-screen-load-retry',
    );

    return local;
  }
}

async function saveLocalMutation(
  nextState:
    SavedCafeRecommendationFeedbackState,
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

export async function setSavedCafeRecommendationFeedback(
  placeIdInput: string,
  reactionInput:
    | SavedCafeRecommendationReaction
    | null,
) {
  const placeId =
    normalizeId(
      placeIdInput,
    );

  if (!placeId) {
    throw new Error(
      '추천 피드백을 저장할 카페 정보가 올바르지 않아요.',
    );
  }

  const reaction =
    normalizeReaction(
      reactionInput,
    );

  const state =
    await loadSavedCafeRecommendationFeedbackStateLocalOnly();

  const current =
    state.feedbacks.find(
      (item) =>
        item.placeId ===
        placeId,
    );

  const now =
    createNowIso();

  const nextFeedback:
    SavedCafeRecommendationFeedback = {
      placeId,
      reaction,
      createdAt:
        current?.createdAt ??
        now,
      updatedAt: now,
    };

  const next =
    normalizeState({
      ...state,
      feedbacks: [
        nextFeedback,
        ...state.feedbacks.filter(
          (item) =>
            item.placeId !==
            placeId,
        ),
      ],
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    reaction
      ? `set-recommendation-feedback:${reaction}`
      : 'clear-recommendation-feedback',
  );
}

export function getSavedCafeRecommendationFeedback(
  state:
    | SavedCafeRecommendationFeedbackState
    | null
    | undefined,
  placeIdInput: string,
) {
  const placeId =
    normalizeId(
      placeIdInput,
    );

  if (!placeId) {
    return null;
  }

  return (
    state?.feedbacks.find(
      (item) =>
        item.placeId ===
        placeId,
    ) ?? null
  );
}

export function getSavedCafeRecommendationFeedbackSummary(
  state:
    | SavedCafeRecommendationFeedbackState
    | null
    | undefined,
): SavedCafeRecommendationFeedbackSummary {
  const summary:
    SavedCafeRecommendationFeedbackSummary = {
      total: 0,
      interested: 0,
      wantToGo: 0,
      notInterested: 0,
    };

  (
    state?.feedbacks ??
    []
  ).forEach((item) => {
    if (!item.reaction) {
      return;
    }

    summary.total += 1;
    summary[
      item.reaction
    ] += 1;
  });

  return summary;
}
