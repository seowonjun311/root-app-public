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

// SAVED_CAFE_V42_VISIT_STORE
// SAVED_CAFE_V46_VISIT_DETAIL_METADATA

const SAVED_CAFE_VISIT_GUEST_KEY =
  'root_saved_cafe_visits_guest_v1';

const SAVED_CAFE_VISIT_USER_KEY_PREFIX =
  'root_saved_cafe_visits_user_v1:';

const SAVED_CAFE_VISIT_GUEST_ADOPTION_KEY_PREFIX =
  'root_saved_cafe_visits_guest_adoption_v1:';

const SAVED_CAFE_VISIT_VERSION = 1;
const SAVED_CAFE_VISIT_LOAD_TIMEOUT_MS = 4500;
const SAVED_CAFE_VISIT_READ_TIMEOUT_MS = 6000;
const SAVED_CAFE_VISIT_WRITE_TIMEOUT_MS = 9000;
const RECENT_VISIT_DAYS = 30;

export const MAX_SAVED_CAFE_VISIT_NOTE_LENGTH = 120;
export const SAVED_CAFE_FREQUENT_VISIT_COUNT = 3;

export type SavedCafeVisitPurpose =
  | 'study'
  | 'work'
  | 'date'
  | 'conversation'
  | 'dessert'
  | 'rest'
  | 'other';

export type SavedCafeVisitCompanion =
  | 'alone'
  | 'friend'
  | 'partner'
  | 'family'
  | 'coworker'
  | 'other';

export type SavedCafeVisitRevisitIntent =
  | 'yes'
  | 'maybe'
  | 'no';

export type SavedCafeVisit = {
  id: string;
  placeId: string;
  visitedAt: string;
  rating: number | null;
  note: string;
  purpose: SavedCafeVisitPurpose | null;
  companion: SavedCafeVisitCompanion | null;
  revisitIntent: SavedCafeVisitRevisitIntent | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedCafeDeletedVisit = {
  id: string;
  deletedAt: string;
};

export type SavedCafeVisitState = {
  version: 1;
  visits: SavedCafeVisit[];
  deletedVisits: SavedCafeDeletedVisit[];
  updatedAt: string;
};

export type AddSavedCafeVisitInput = {
  placeId: string;
  visitedAt?: string;
  rating?: number | null;
  note?: string;
  purpose?: SavedCafeVisitPurpose | null;
  companion?: SavedCafeVisitCompanion | null;
  revisitIntent?: SavedCafeVisitRevisitIntent | null;
};

export type UpdateSavedCafeVisitInput = {
  rating?: number | null;
  note?: string;
  purpose?: SavedCafeVisitPurpose | null;
  companion?: SavedCafeVisitCompanion | null;
  revisitIntent?: SavedCafeVisitRevisitIntent | null;
};

export type SavedCafeVisitSummary = {
  visitCount: number;
  lastVisitedAt: string | null;
  averageRating: number | null;
  isFrequent: boolean;
  isRecent: boolean;
};

type SavedCafeVisitScope = {
  uid: string | null;
  storageKey: string;
  isGuest: boolean;
};

type PreparedSavedCafeVisitState = {
  state: SavedCafeVisitState;
  adoptedGuestData: boolean;
};

let runningSync:
  | Promise<SavedCafeVisitState>
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

function normalizeNote(
  value: unknown,
) {
  return typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, ' ')
        .slice(
          0,
          MAX_SAVED_CAFE_VISIT_NOTE_LENGTH,
        )
    : '';
}

function normalizeRating(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1 ||
    parsed > 5
  ) {
    return null;
  }

  return Math.round(parsed);
}

const SAVED_CAFE_VISIT_PURPOSE_VALUES:
  SavedCafeVisitPurpose[] = [
    'study',
    'work',
    'date',
    'conversation',
    'dessert',
    'rest',
    'other',
  ];

const SAVED_CAFE_VISIT_COMPANION_VALUES:
  SavedCafeVisitCompanion[] = [
    'alone',
    'friend',
    'partner',
    'family',
    'coworker',
    'other',
  ];

const SAVED_CAFE_VISIT_REVISIT_VALUES:
  SavedCafeVisitRevisitIntent[] = [
    'yes',
    'maybe',
    'no',
  ];

function normalizeVisitPurpose(
  value: unknown,
): SavedCafeVisitPurpose | null {
  if (typeof value !== 'string') {
    return null;
  }

  return SAVED_CAFE_VISIT_PURPOSE_VALUES.includes(
    value as SavedCafeVisitPurpose,
  )
    ? value as SavedCafeVisitPurpose
    : null;
}

function normalizeVisitCompanion(
  value: unknown,
): SavedCafeVisitCompanion | null {
  if (typeof value !== 'string') {
    return null;
  }

  return SAVED_CAFE_VISIT_COMPANION_VALUES.includes(
    value as SavedCafeVisitCompanion,
  )
    ? value as SavedCafeVisitCompanion
    : null;
}

function normalizeVisitRevisitIntent(
  value: unknown,
): SavedCafeVisitRevisitIntent | null {
  if (typeof value !== 'string') {
    return null;
  }

  return SAVED_CAFE_VISIT_REVISIT_VALUES.includes(
    value as SavedCafeVisitRevisitIntent,
  )
    ? value as SavedCafeVisitRevisitIntent
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

function createEmptyState(): SavedCafeVisitState {
  return {
    version:
      SAVED_CAFE_VISIT_VERSION,
    visits: [],
    deletedVisits: [],
    updatedAt: createNowIso(),
  };
}

function normalizeVisit(
  value: unknown,
): SavedCafeVisit | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const source =
    value as Partial<SavedCafeVisit>;

  const id =
    normalizeId(source.id);

  const placeId =
    normalizeId(source.placeId);

  if (!id || !placeId) {
    return null;
  }

  const now =
    createNowIso();

  const createdAt =
    normalizeIsoDate(
      source.createdAt,
      now,
    );

  const visitedAt =
    normalizeIsoDate(
      source.visitedAt,
      createdAt,
    );

  const updatedAt =
    normalizeIsoDate(
      source.updatedAt,
      createdAt,
    );

  return {
    id,
    placeId,
    visitedAt,
    rating:
      normalizeRating(
        source.rating,
      ),
    note:
      normalizeNote(
        source.note,
      ),
    purpose:
      normalizeVisitPurpose(
        source.purpose,
      ),
    companion:
      normalizeVisitCompanion(
        source.companion,
      ),
    revisitIntent:
      normalizeVisitRevisitIntent(
        source.revisitIntent,
      ),
    createdAt,
    updatedAt,
  };
}

function normalizeDeletedVisit(
  value: unknown,
): SavedCafeDeletedVisit | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const source =
    value as Partial<SavedCafeDeletedVisit>;

  const id =
    normalizeId(source.id);

  if (!id) {
    return null;
  }

  return {
    id,
    deletedAt:
      normalizeIsoDate(
        source.deletedAt,
        createNowIso(),
      ),
  };
}

function keepLatestByKey<T>(
  values: T[],
  getKey: (value: T) => string,
  getUpdatedAt: (value: T) => string,
) {
  const map =
    new Map<string, T>();

  values.forEach((value) => {
    const key =
      getKey(value);

    const current =
      map.get(key);

    if (
      !current ||
      parseDateTime(
        getUpdatedAt(value),
      ) >=
        parseDateTime(
          getUpdatedAt(current),
        )
    ) {
      map.set(key, value);
    }
  });

  return Array.from(
    map.values(),
  );
}

function normalizeState(
  value: unknown,
): SavedCafeVisitState {
  const source =
    value &&
    typeof value === 'object'
      ? value as Partial<SavedCafeVisitState>
      : {};

  const visits =
    keepLatestByKey(
      (
        Array.isArray(
          source.visits,
        )
          ? source.visits
          : []
      )
        .map(normalizeVisit)
        .filter(
          (
            item,
          ): item is SavedCafeVisit =>
            Boolean(item),
        ),
      (item) => item.id,
      (item) => item.updatedAt,
    );

  const deletedVisits =
    keepLatestByKey(
      (
        Array.isArray(
          source.deletedVisits,
        )
          ? source.deletedVisits
          : []
      )
        .map(
          normalizeDeletedVisit,
        )
        .filter(
          (
            item,
          ): item is SavedCafeDeletedVisit =>
            Boolean(item),
        ),
      (item) => item.id,
      (item) => item.deletedAt,
    );

  const deletedMap =
    new Map(
      deletedVisits.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );

  const activeVisits =
    visits.filter((visit) => {
      const deleted =
        deletedMap.get(
          visit.id,
        );

      return (
        !deleted ||
        parseDateTime(
          visit.updatedAt,
        ) >
          parseDateTime(
            deleted.deletedAt,
          )
      );
    });

  const latestItemTime =
    Math.max(
      parseDateTime(
        source.updatedAt,
      ),
      ...activeVisits.map(
        (visit) =>
          parseDateTime(
            visit.updatedAt,
          ),
      ),
      ...deletedVisits.map(
        (item) =>
          parseDateTime(
            item.deletedAt,
          ),
      ),
    );

  return {
    version:
      SAVED_CAFE_VISIT_VERSION,
    visits:
      activeVisits.sort(
        (first, second) =>
          parseDateTime(
            second.visitedAt,
          ) -
          parseDateTime(
            first.visitedAt,
          ),
      ),
    deletedVisits,
    updatedAt:
      latestItemTime > 0
        ? new Date(
            latestItemTime,
          ).toISOString()
        : createNowIso(),
  };
}

export function mergeSavedCafeVisitStates(
  first: SavedCafeVisitState,
  second: SavedCafeVisitState,
) {
  return normalizeState({
    visits: [
      ...first.visits,
      ...second.visits,
    ],
    deletedVisits: [
      ...first.deletedVisits,
      ...second.deletedVisits,
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

function getCurrentScope(): SavedCafeVisitScope {
  const uid =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  return {
    uid,
    storageKey:
      uid
        ? `${SAVED_CAFE_VISIT_USER_KEY_PREFIX}${uid}`
        : SAVED_CAFE_VISIT_GUEST_KEY,
    isGuest: !uid,
  };
}

function getGuestAdoptionKey(
  uid: string,
) {
  return `${SAVED_CAFE_VISIT_GUEST_ADOPTION_KEY_PREFIX}${uid}`;
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
      'SAVED CAFE VISIT LOCAL READ ERROR',
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
  state: SavedCafeVisitState,
) {
  const normalized =
    normalizeState(state);

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(normalized),
  );

  return normalized;
}

async function prepareLocalState(
  scope: SavedCafeVisitScope,
): Promise<PreparedSavedCafeVisitState> {
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
        SAVED_CAFE_VISIT_GUEST_KEY,
      );

    if (
      guest &&
      (
        guest.visits.length > 0 ||
        guest.deletedVisits.length > 0
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
        'SAVED CAFE VISIT GUEST DATA ADOPTED',
        {
          uid: scope.uid,
          visitCount:
            adopted.visits.length,
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
    : Boolean(snapshot?.exists);
}

function createServerState(
  userData: any,
) {
  return userData
    ?.savedCafeVisitData
    ? normalizeState(
        userData.savedCafeVisitData,
      )
    : createEmptyState();
}

function toFirestoreSafeState(
  state: SavedCafeVisitState,
) {
  return JSON.parse(
    JSON.stringify(
      normalizeState(state),
    ),
  ) as SavedCafeVisitState;
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
      'SAVED CAFE VISIT SYNC LOCAL ONLY',
      {
        reason,
        visitCount:
          prepared.state.visits.length,
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
      'SAVED_CAFE_VISIT_SELF_ONLY_UID_REQUIRED',
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
      SAVED_CAFE_VISIT_READ_TIMEOUT_MS,
      'SAVED_CAFE_VISIT_FIRESTORE_READ_TIMEOUT',
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
      'SAVED_CAFE_VISIT_AUTH_UID_CHANGED_DURING_READ',
    );
  }

  const serverState =
    getSnapshotExists(snapshot)
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
    mergeSavedCafeVisitStates(
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
        savedCafeVisitData:
          firestoreState,
        savedCafeVisitUpdatedAt:
          firestoreState.updatedAt,
      },
      {
        merge: true,
      },
    ),
    SAVED_CAFE_VISIT_WRITE_TIMEOUT_MS,
    'SAVED_CAFE_VISIT_FIRESTORE_WRITE_TIMEOUT',
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
      'SAVED_CAFE_VISIT_AUTH_UID_CHANGED_DURING_WRITE',
    );
  }

  if (
    prepared.adoptedGuestData
  ) {
    await Promise.all([
      AsyncStorage.removeItem(
        SAVED_CAFE_VISIT_GUEST_KEY,
      ),
      AsyncStorage.removeItem(
        getGuestAdoptionKey(
          expectedUid,
        ),
      ),
    ]);
  }

  console.log(
    'SAVED CAFE VISIT CLOUD SYNC DONE',
    {
      uid: expectedUid,
      reason,
      visitCount:
        merged.visits.length,
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

export async function syncSavedCafeVisitState(
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
  void syncSavedCafeVisitState(
    reason,
  ).catch((error) => {
    console.log(
      'SAVED CAFE VISIT BACKGROUND SYNC ERROR',
      {
        reason,
        error,
      },
    );
  });
}

export async function loadSavedCafeVisitStateLocalOnly() {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  return prepared.state;
}

export async function loadSavedCafeVisitState() {
  const local =
    await loadSavedCafeVisitStateLocalOnly();

  const scope =
    getCurrentScope();

  if (!scope.uid) {
    return local;
  }

  try {
    return await withTimeout(
      syncSavedCafeVisitState(
        'visit-screen-load',
      ),
      SAVED_CAFE_VISIT_LOAD_TIMEOUT_MS,
      'SAVED_CAFE_VISIT_LOAD_TIMEOUT',
    );
  } catch (error) {
    console.log(
      'SAVED CAFE VISIT LOAD FALLBACK',
      error,
    );

    startBackgroundSync(
      'visit-screen-load-retry',
    );

    return local;
  }
}

function createVisitId() {
  return [
    'cafe-visit',
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 9),
  ].join('-');
}

async function saveLocalMutation(
  nextState: SavedCafeVisitState,
  reason: string,
) {
  const scope =
    getCurrentScope();

  const saved =
    await writeStateToKey(
      scope.storageKey,
      nextState,
    );

  startBackgroundSync(reason);

  return saved;
}

export async function addSavedCafeVisit(
  input: AddSavedCafeVisitInput,
) {
  const placeId =
    normalizeId(input.placeId);

  if (!placeId) {
    throw new Error(
      '방문할 카페 정보가 올바르지 않아요.',
    );
  }

  const state =
    await loadSavedCafeVisitStateLocalOnly();

  const now =
    createNowIso();

  const visit: SavedCafeVisit = {
    id: createVisitId(),
    placeId,
    visitedAt:
      normalizeIsoDate(
        input.visitedAt,
        now,
      ),
    rating:
      normalizeRating(
        input.rating,
      ),
    note:
      normalizeNote(
        input.note,
      ),
    purpose:
      normalizeVisitPurpose(
        input.purpose,
      ),
    companion:
      normalizeVisitCompanion(
        input.companion,
      ),
    revisitIntent:
      normalizeVisitRevisitIntent(
        input.revisitIntent,
      ),
    createdAt: now,
    updatedAt: now,
  };

  const next =
    normalizeState({
      ...state,
      visits: [
        visit,
        ...state.visits,
      ],
      deletedVisits:
        state.deletedVisits.filter(
          (item) =>
            item.id !== visit.id,
        ),
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    'add-visit',
  );
}

export async function updateSavedCafeVisit(
  visitId: string,
  input: UpdateSavedCafeVisitInput,
) {
  const id =
    normalizeId(visitId);

  const state =
    await loadSavedCafeVisitStateLocalOnly();

  const current =
    state.visits.find(
      (visit) =>
        visit.id === id,
    );

  if (!current) {
    throw new Error(
      '수정할 방문 기록을 찾을 수 없어요.',
    );
  }

  const now =
    createNowIso();

  const updated: SavedCafeVisit = {
    ...current,
    rating:
      input.rating === undefined
        ? current.rating
        : normalizeRating(
            input.rating,
          ),
    note:
      input.note === undefined
        ? current.note
        : normalizeNote(
            input.note,
          ),
    purpose:
      input.purpose === undefined
        ? current.purpose
        : normalizeVisitPurpose(
            input.purpose,
          ),
    companion:
      input.companion === undefined
        ? current.companion
        : normalizeVisitCompanion(
            input.companion,
          ),
    revisitIntent:
      input.revisitIntent === undefined
        ? current.revisitIntent
        : normalizeVisitRevisitIntent(
            input.revisitIntent,
          ),
    updatedAt: now,
  };

  const next =
    normalizeState({
      ...state,
      visits:
        state.visits.map(
          (visit) =>
            visit.id === id
              ? updated
              : visit,
        ),
      deletedVisits:
        state.deletedVisits.filter(
          (item) =>
            item.id !== id,
        ),
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    'update-visit',
  );
}

export async function deleteSavedCafeVisit(
  visitId: string,
) {
  const id =
    normalizeId(visitId);

  const state =
    await loadSavedCafeVisitStateLocalOnly();

  const exists =
    state.visits.some(
      (visit) =>
        visit.id === id,
    );

  if (!exists) {
    return state;
  }

  const now =
    createNowIso();

  const next =
    normalizeState({
      ...state,
      visits:
        state.visits.filter(
          (visit) =>
            visit.id !== id,
        ),
      deletedVisits: [
        ...state.deletedVisits,
        {
          id,
          deletedAt: now,
        },
      ],
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    'delete-visit',
  );
}

export async function pruneSavedCafeVisits(
  validPlaceIds: readonly string[],
) {
  const valid =
    new Set(
      validPlaceIds
        .map(normalizeId)
        .filter(Boolean),
    );

  const state =
    await loadSavedCafeVisitStateLocalOnly();

  const stale =
    state.visits.filter(
      (visit) =>
        !valid.has(
          visit.placeId,
        ),
    );

  if (stale.length === 0) {
    return state;
  }

  const now =
    createNowIso();

  const staleIds =
    new Set(
      stale.map(
        (visit) =>
          visit.id,
      ),
    );

  const next =
    normalizeState({
      ...state,
      visits:
        state.visits.filter(
          (visit) =>
            !staleIds.has(
              visit.id,
            ),
        ),
      deletedVisits: [
        ...state.deletedVisits,
        ...stale.map(
          (visit) => ({
            id:
              visit.id,
            deletedAt: now,
          }),
        ),
      ],
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    'prune-missing-cafes',
  );
}

export function getSavedCafeVisitSummary(
  state: SavedCafeVisitState,
  placeId: string,
): SavedCafeVisitSummary {
  const normalizedPlaceId =
    normalizeId(placeId);

  const visits =
    state.visits.filter(
      (visit) =>
        visit.placeId ===
        normalizedPlaceId,
    );

  const latest =
    visits.reduce<
      SavedCafeVisit | null
    >(
      (current, visit) => {
        if (!current) {
          return visit;
        }

        return parseDateTime(
          visit.visitedAt,
        ) >
          parseDateTime(
            current.visitedAt,
          )
          ? visit
          : current;
      },
      null,
    );

  const ratings =
    visits
      .map(
        (visit) =>
          visit.rating,
      )
      .filter(
        (
          rating,
        ): rating is number =>
          typeof rating ===
          'number',
      );

  const averageRating =
    ratings.length > 0
      ? Math.round(
          (
            ratings.reduce(
              (
                sum,
                rating,
              ) =>
                sum + rating,
              0,
            ) /
            ratings.length
          ) * 10,
        ) / 10
      : null;

  const lastVisitedAt =
    latest?.visitedAt ??
    null;

  const lastTime =
    parseDateTime(
      lastVisitedAt,
    );

  const recentThreshold =
    Date.now() -
    (
      RECENT_VISIT_DAYS *
      24 *
      60 *
      60 *
      1000
    );

  return {
    visitCount:
      visits.length,
    lastVisitedAt,
    averageRating,
    isFrequent:
      visits.length >=
      SAVED_CAFE_FREQUENT_VISIT_COUNT,
    isRecent:
      lastTime >=
        recentThreshold &&
      lastTime <= Date.now(),
  };
}
