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

import type {
  SavedCafe,
} from './savedPlaces';

export const SAVED_CAFE_LOCAL_KEY =
  'root_saved_cafes_v1';

const SAVED_CAFE_GUEST_KEY =
  'root_saved_cafes_guest_v2';

const SAVED_CAFE_USER_KEY_PREFIX =
  'root_saved_cafes_user_v2:';

const SAVED_CAFE_GUEST_ADOPTION_KEY_PREFIX =
  'root_saved_cafes_guest_adoption_v2:';

const SAVED_CAFE_CLOUD_VERSION = 2;
const SAVED_CAFE_LOAD_TIMEOUT_MS = 4500;
const SAVED_CAFE_READ_TIMEOUT_MS = 6000;
const SAVED_CAFE_WRITE_TIMEOUT_MS = 9000;

export type SavedCafeLocalEntry = {
  cafe: SavedCafe;
  address?: string;
  roadAddress?: string;
  latitude?: number;
  longitude?: number;
  externalProvider?:
    | 'kakao'
    | 'naver'
    | 'google'
    | 'publicData'
    | 'manual';
  externalPlaceId?: string;
  phone?: string;
  placeUrl?: string;
  savedAt: string;
};

export type SavedCafeDeletedEntry = {
  placeId: string;
  deletedAt: string;
};

export type SavedCafeCloudState = {
  version: 2;
  entries: SavedCafeLocalEntry[];
  deletedEntries: SavedCafeDeletedEntry[];
  updatedAt: string;
};

export type SavedCafeSyncOptions = {
  reason?: string;
};

export type SavedCafeSyncPhase =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'
  | 'guest';

export type SavedCafeSyncStatus = {
  phase: SavedCafeSyncPhase;
  uid: string | null;
  isGuest: boolean;
  lastAttemptAt: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
};

type SavedCafeSyncStatusListener =
  (
    status: SavedCafeSyncStatus,
  ) => void;

type SavedCafeScope = {
  uid: string | null;
  storageKey: string;
  isGuest: boolean;
};

type PreparedLocalState = {
  state: SavedCafeCloudState;
  adoptedGuestData: boolean;
};

let runningSync:
  | Promise<SavedCafeLocalEntry[]>
  | null = null;

let syncRequested = false;
let syncRequestVersion = 0;
let latestSyncReason = 'unspecified';

let savedCafeSyncStatus:
  SavedCafeSyncStatus = {
  phase: 'idle',
  uid: null,
  isGuest: true,
  lastAttemptAt: null,
  lastSyncedAt: null,
  errorMessage: null,
};

const savedCafeSyncStatusListeners =
  new Set<
    SavedCafeSyncStatusListener
  >();

function copySavedCafeSyncStatus(): SavedCafeSyncStatus {
  return {
    ...savedCafeSyncStatus,
  };
}

function publishSavedCafeSyncStatus() {
  const snapshot =
    copySavedCafeSyncStatus();

  savedCafeSyncStatusListeners.forEach(
    (listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.log(
          'SAVED CAFE SYNC STATUS LISTENER ERROR',
          error,
        );
      }
    },
  );
}

function updateSavedCafeSyncStatus(
  patch:
    Partial<SavedCafeSyncStatus>,
) {
  const uidChanged =
    patch.uid !== undefined &&
    patch.uid !==
      savedCafeSyncStatus.uid;

  savedCafeSyncStatus = {
    ...savedCafeSyncStatus,
    ...(uidChanged
      ? {
          lastSyncedAt: null,
        }
      : {}),
    ...patch,
  };

  publishSavedCafeSyncStatus();
}

function getSavedCafeSyncErrorMessage(
  error: unknown,
) {
  if (
    error &&
    typeof error === 'object'
  ) {
    const source =
      error as {
        code?: unknown;
        message?: unknown;
      };

    if (
      typeof source.message ===
        'string' &&
      source.message.trim()
    ) {
      return source.message.trim();
    }

    if (
      typeof source.code ===
        'string' &&
      source.code.trim()
    ) {
      return source.code.trim();
    }
  }

  return String(
    error || 'UNKNOWN_SYNC_ERROR',
  );
}

function isLikelyOfflineSyncError(
  error: unknown,
) {
  const text =
    getSavedCafeSyncErrorMessage(
      error,
    ).toLowerCase();

  return [
    'network',
    'offline',
    'unavailable',
    'timeout',
    'deadline-exceeded',
    'network-request-failed',
    'internet',
  ].some(
    (keyword) =>
      text.includes(keyword),
  );
}

function markSavedCafeSyncFailure(
  error: unknown,
) {
  const scope =
    getCurrentScope();

  updateSavedCafeSyncStatus({
    phase:
      isLikelyOfflineSyncError(
        error,
      )
        ? 'offline'
        : 'error',
    uid: scope.uid,
    isGuest: scope.isGuest,
    errorMessage:
      getSavedCafeSyncErrorMessage(
        error,
      ),
  });
}

export function getSavedCafeSyncStatus(): SavedCafeSyncStatus {
  const scope =
    getCurrentScope();

  const scopeChanged =
    scope.uid !==
      savedCafeSyncStatus.uid ||
    scope.isGuest !==
      savedCafeSyncStatus.isGuest;

  if (scopeChanged) {
    savedCafeSyncStatus = {
      ...savedCafeSyncStatus,
      phase: scope.uid
        ? 'idle'
        : 'guest',
      uid: scope.uid,
      isGuest:
        scope.isGuest,
      lastAttemptAt: null,
      lastSyncedAt: null,
      errorMessage: null,
    };
  } else if (
    !scope.uid &&
    savedCafeSyncStatus.phase !==
      'guest'
  ) {
    savedCafeSyncStatus = {
      ...savedCafeSyncStatus,
      phase: 'guest',
      errorMessage: null,
    };
  }

  return copySavedCafeSyncStatus();
}

export function subscribeSavedCafeSyncStatus(
  listener:
    SavedCafeSyncStatusListener,
) {
  savedCafeSyncStatusListeners.add(
    listener,
  );

  listener(
    getSavedCafeSyncStatus(),
  );

  return () => {
    savedCafeSyncStatusListeners.delete(
      listener,
    );
  };
}

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

function getEntryUpdatedTime(
  entry: SavedCafeLocalEntry,
) {
  return Math.max(
    parseDateTime(
      entry.cafe.updatedAt,
    ),
    parseDateTime(
      entry.savedAt,
    ),
    parseDateTime(
      entry.cafe.createdAt,
    ),
  );
}

function getEntryUpdatedAt(
  entry: SavedCafeLocalEntry,
) {
  const values = [
    entry.cafe.updatedAt,
    entry.savedAt,
    entry.cafe.createdAt,
  ].filter(
    (value): value is string =>
      typeof value === 'string' &&
      parseDateTime(value) > 0,
  );

  return values.sort(
    (first, second) =>
      parseDateTime(second) -
      parseDateTime(first),
  )[0] ?? createNowIso();
}

function isSavedCafeLocalEntry(
  value: unknown,
): value is SavedCafeLocalEntry {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const entry =
    value as Partial<SavedCafeLocalEntry>;

  return (
    !!entry.cafe &&
    typeof entry.cafe === 'object' &&
    typeof entry.cafe.placeId ===
      'string' &&
    entry.cafe.placeId.trim().length >
      0 &&
    typeof entry.cafe.name ===
      'string' &&
    entry.cafe.category ===
      'cafe' &&
    typeof entry.savedAt ===
      'string'
  );
}

function isSavedCafeDeletedEntry(
  value: unknown,
): value is SavedCafeDeletedEntry {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const deleted =
    value as Partial<SavedCafeDeletedEntry>;

  return (
    typeof deleted.placeId ===
      'string' &&
    deleted.placeId.trim().length >
      0 &&
    typeof deleted.deletedAt ===
      'string' &&
    parseDateTime(
      deleted.deletedAt,
    ) > 0
  );
}

function createEmptyState(): SavedCafeCloudState {
  return {
    version:
      SAVED_CAFE_CLOUD_VERSION,
    entries: [],
    deletedEntries: [],
    updatedAt: createNowIso(),
  };
}

function sortEntries(
  entries: SavedCafeLocalEntry[],
) {
  return [...entries].sort(
    (first, second) =>
      getEntryUpdatedTime(second) -
      getEntryUpdatedTime(first),
  );
}

function normalizeDeletedEntries(
  values: unknown,
) {
  const map =
    new Map<
      string,
      SavedCafeDeletedEntry
    >();

  if (Array.isArray(values)) {
    values
      .filter(
        isSavedCafeDeletedEntry,
      )
      .forEach((item) => {
        const current =
          map.get(item.placeId);

        if (
          !current ||
          parseDateTime(
            item.deletedAt,
          ) >
            parseDateTime(
              current.deletedAt,
            )
        ) {
          map.set(
            item.placeId,
            {
              placeId:
                item.placeId,
              deletedAt:
                item.deletedAt,
            },
          );
        }
      });
  }

  return Array.from(
    map.values(),
  ).sort(
    (first, second) =>
      parseDateTime(
        second.deletedAt,
      ) -
      parseDateTime(
        first.deletedAt,
      ),
  );
}

function normalizeState(
  value: unknown,
): SavedCafeCloudState {
  const source =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
      ? value as Record<string, any>
      : {};

  const sourceEntries =
    Array.isArray(value)
      ? value
      : source.entries;

  const entryMap =
    new Map<
      string,
      SavedCafeLocalEntry
    >();

  if (Array.isArray(sourceEntries)) {
    sourceEntries
      .filter(
        isSavedCafeLocalEntry,
      )
      .forEach((entry) => {
        const placeId =
          entry.cafe.placeId;

        const current =
          entryMap.get(placeId);

        if (
          !current ||
          getEntryUpdatedTime(entry) >=
            getEntryUpdatedTime(current)
        ) {
          entryMap.set(
            placeId,
            entry,
          );
        }
      });
  }

  const deletedEntries =
    normalizeDeletedEntries(
      source.deletedEntries ??
        source.deletions,
    );

  const deletedMap =
    new Map(
      deletedEntries.map(
        (item) => [
          item.placeId,
          item,
        ],
      ),
    );

  const entries =
    Array.from(
      entryMap.values(),
    ).filter((entry) => {
      const deleted =
        deletedMap.get(
          entry.cafe.placeId,
        );

      if (!deleted) {
        return true;
      }

      return (
        getEntryUpdatedTime(entry) >
        parseDateTime(
          deleted.deletedAt,
        )
      );
    });

  const activePlaceIds =
    new Set(
      entries.map(
        (entry) =>
          entry.cafe.placeId,
      ),
    );

  const effectiveDeletedEntries =
    deletedEntries.filter(
      (deleted) =>
        !activePlaceIds.has(
          deleted.placeId,
        ),
    );

  const updatedAtCandidates = [
    source.updatedAt,
    ...entries.map(
      getEntryUpdatedAt,
    ),
    ...effectiveDeletedEntries.map(
      (item) =>
        item.deletedAt,
    ),
  ];

  const updatedAt =
    updatedAtCandidates
      .filter(
        (item): item is string =>
          typeof item === 'string' &&
          parseDateTime(item) > 0,
      )
      .sort(
        (first, second) =>
          parseDateTime(second) -
          parseDateTime(first),
      )[0] ?? createNowIso();

  return {
    version:
      SAVED_CAFE_CLOUD_VERSION,
    entries:
      sortEntries(entries),
    deletedEntries:
      effectiveDeletedEntries,
    updatedAt,
  };
}

export function mergeSavedCafeStates(
  localValue: unknown,
  serverValue: unknown,
): SavedCafeCloudState {
  const local =
    normalizeState(localValue);

  const server =
    normalizeState(serverValue);

  return normalizeState({
    version:
      SAVED_CAFE_CLOUD_VERSION,
    entries: [
      ...server.entries,
      ...local.entries,
    ],
    deletedEntries: [
      ...server.deletedEntries,
      ...local.deletedEntries,
    ],
    updatedAt:
      parseDateTime(
        local.updatedAt,
      ) >=
      parseDateTime(
        server.updatedAt,
      )
        ? local.updatedAt
        : server.updatedAt,
  });
}

function getGuestAdoptionKey(
  uid: string,
) {
  return `${SAVED_CAFE_GUEST_ADOPTION_KEY_PREFIX}${uid}`;
}

function getCurrentScope(): SavedCafeScope {
  const uid =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  if (uid) {
    return {
      uid,
      storageKey:
        `${SAVED_CAFE_USER_KEY_PREFIX}${uid}`,
      isGuest: false,
    };
  }

  return {
    uid: null,
    storageKey:
      SAVED_CAFE_GUEST_KEY,
    isGuest: true,
  };
}

async function readStateFromKey(
  storageKey: string,
): Promise<SavedCafeCloudState | null> {
  try {
    const raw =
      await AsyncStorage.getItem(
        storageKey,
      );

    if (!raw) {
      return null;
    }

    return normalizeState(
      JSON.parse(raw),
    );
  } catch (error) {
    console.log(
      'SAVED CAFE LOCAL STATE READ ERROR',
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
  state: SavedCafeCloudState,
) {
  const normalized =
    normalizeState(state);

  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(normalized),
  );

  return normalized;
}

async function readLegacyState() {
  return readStateFromKey(
    SAVED_CAFE_LOCAL_KEY,
  );
}

async function prepareLocalState(
  scope: SavedCafeScope,
): Promise<PreparedLocalState> {
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

  const legacy =
    await readLegacyState();

  if (legacy) {
    const migrated =
      await writeStateToKey(
        scope.storageKey,
        legacy,
      );

    await AsyncStorage.removeItem(
      SAVED_CAFE_LOCAL_KEY,
    );

    console.log(
      'SAVED CAFE LEGACY LOCAL MIGRATION DONE',
      {
        uid: scope.uid,
        isGuest:
          scope.isGuest,
        savedCafeCount:
          migrated.entries.length,
      },
    );

    return {
      state: migrated,
      adoptedGuestData: false,
    };
  }

  if (!scope.isGuest) {
    const guest =
      await readStateFromKey(
        SAVED_CAFE_GUEST_KEY,
      );

    if (
      guest &&
      (
        guest.entries.length > 0 ||
        guest.deletedEntries.length > 0
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
        'SAVED CAFE GUEST DATA ADOPTED',
        {
          uid: scope.uid,
          savedCafeCount:
            adopted.entries.length,
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
        setTimeout(
          () => {
            reject(
              new Error(
                errorMessage,
              ),
            );
          },
          timeoutMs,
        );

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
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
  if (
    userData?.savedCafeData
  ) {
    return normalizeState(
      userData.savedCafeData,
    );
  }

  const legacyEntries =
    userData?.savedCafeEntries ??
    userData?.savedCafes;

  if (Array.isArray(legacyEntries)) {
    return normalizeState({
      entries:
        legacyEntries,
      updatedAt:
        userData?.savedCafeUpdatedAt,
    });
  }

  return createEmptyState();
}

function toFirestoreSafeState(
  state: SavedCafeCloudState,
): SavedCafeCloudState {
  return JSON.parse(
    JSON.stringify(
      normalizeState(state),
    ),
  ) as SavedCafeCloudState;
}

async function performSavedCafeSync(
  reason: string,
): Promise<SavedCafeLocalEntry[]> {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  if (!scope.uid) {
    console.log(
      'SAVED CAFE SYNC LOCAL ONLY',
      {
        reason,
        savedCafeCount:
          prepared.state.entries.length,
      },
    );

    return prepared.state.entries;
  }

  const expectedUid =
    scope.uid;

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
      SAVED_CAFE_READ_TIMEOUT_MS,
      'SAVED_CAFE_FIRESTORE_READ_TIMEOUT',
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
      'SAVED_CAFE_AUTH_UID_CHANGED_DURING_READ',
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
    mergeSavedCafeStates(
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
        savedCafeData:
          firestoreState,
        savedCafeUpdatedAt:
          firestoreState.updatedAt,
      },
      {
        merge: true,
      },
    ),
    SAVED_CAFE_WRITE_TIMEOUT_MS,
    'SAVED_CAFE_FIRESTORE_WRITE_TIMEOUT',
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
      'SAVED_CAFE_AUTH_UID_CHANGED_DURING_WRITE',
    );
  }

  if (prepared.adoptedGuestData) {
    await Promise.all([
      AsyncStorage.removeItem(
        SAVED_CAFE_GUEST_KEY,
      ),
      AsyncStorage.removeItem(
        getGuestAdoptionKey(
          expectedUid,
        ),
      ),
    ]);
  }

  console.log(
    'SAVED CAFE CLOUD SYNC DONE',
    {
      uid:
        expectedUid,
      reason,
      savedCafeCount:
        merged.entries.length,
      deletedCafeCount:
        merged.deletedEntries.length,
      adoptedGuestData:
        prepared.adoptedGuestData,
    },
  );

  return merged.entries;
}

async function runSavedCafeSyncLoop() {
  let latestEntries:
    SavedCafeLocalEntry[] = [];

  while (true) {
    const targetVersion =
      syncRequestVersion;

    syncRequested = false;

    latestEntries =
      await performSavedCafeSync(
        latestSyncReason,
      );

    if (
      targetVersion ===
        syncRequestVersion &&
      !syncRequested
    ) {
      return latestEntries;
    }

    console.log(
      'SAVED CAFE CLOUD RESYNC REQUESTED',
      {
        targetVersion,
        currentVersion:
          syncRequestVersion,
      },
    );
  }
}

export async function syncSavedCafeEntries(
  options: SavedCafeSyncOptions = {},
): Promise<SavedCafeLocalEntry[]> {
  syncRequestVersion += 1;
  syncRequested = true;
  latestSyncReason =
    options.reason ??
    'manual';

  const requestScope =
    getCurrentScope();

  updateSavedCafeSyncStatus({
    phase: requestScope.uid
      ? 'syncing'
      : 'guest',
    uid: requestScope.uid,
    isGuest:
      requestScope.isGuest,
    lastAttemptAt:
      createNowIso(),
    errorMessage: null,
  });

  if (!runningSync) {
    runningSync =
      runSavedCafeSyncLoop()
        .then((entries) => {
          const activeScope =
            getCurrentScope();

          updateSavedCafeSyncStatus({
            phase:
              activeScope.uid
                ? 'synced'
                : 'guest',
            uid:
              activeScope.uid,
            isGuest:
              activeScope.isGuest,
            lastSyncedAt:
              activeScope.uid
                ? createNowIso()
                : null,
            errorMessage: null,
          });

          return entries;
        })
        .catch(
          (error: unknown) => {
            markSavedCafeSyncFailure(
              error,
            );

            throw error;
          },
        )
        .finally(() => {
          runningSync = null;
        });
  }

  return runningSync;
}
function startBackgroundSync(
  reason: string,
) {
  void syncSavedCafeEntries({
    reason,
  }).catch((error: any) => {
    console.log(
      'SAVED CAFE BACKGROUND SYNC ERROR',
      {
        reason,
        code:
          error?.code ??
          null,
        message:
          error?.message ??
          String(error),
      },
    );
  });
}

async function loadLocalStateOnly() {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  return prepared.state;
}

export async function loadSavedCafeEntriesLocalOnly(): Promise<
  SavedCafeLocalEntry[]
> {
  const state =
    await loadLocalStateOnly();

  return state.entries;
}

export async function loadSavedCafeEntries(): Promise<
  SavedCafeLocalEntry[]
> {
  const localEntries =
    await loadSavedCafeEntriesLocalOnly();

  const scope =
    getCurrentScope();

  if (!scope.uid) {
    return localEntries;
  }

  try {
    return await withTimeout(
      syncSavedCafeEntries({
        reason:
          'saved-cafe-list-load',
      }),
      SAVED_CAFE_LOAD_TIMEOUT_MS,
      'SAVED_CAFE_LIST_SYNC_TIMEOUT',
    );
  } catch (error: any) {
    console.log(
      'SAVED CAFE LOAD CLOUD FALLBACK',
      {
        code:
          error?.code ??
          null,
        message:
          error?.message ??
          String(error),
        savedCafeCount:
          localEntries.length,
      },
    );

    return loadSavedCafeEntriesLocalOnly();
  }
}

export async function saveCafeEntry(
  entry: SavedCafeLocalEntry,
): Promise<SavedCafeLocalEntry[]> {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  const now =
    createNowIso();

  const normalizedEntry:
    SavedCafeLocalEntry = {
    ...entry,
    cafe: {
      ...entry.cafe,
      updatedAt:
        entry.cafe.updatedAt ||
        now,
    },
    savedAt:
      entry.savedAt ||
      now,
  };

  const next =
    normalizeState({
      ...prepared.state,
      entries: [
        normalizedEntry,
        ...prepared.state.entries.filter(
          (item) =>
            item.cafe.placeId !==
            normalizedEntry.cafe.placeId,
        ),
      ],
      deletedEntries:
        prepared.state.deletedEntries.filter(
          (item) =>
            item.placeId !==
            normalizedEntry.cafe.placeId,
        ),
      updatedAt:
        getEntryUpdatedAt(
          normalizedEntry,
        ),
    });

  await writeStateToKey(
    scope.storageKey,
    next,
  );

  console.log(
    'SAVED CAFE LOCAL SAVE DONE',
    {
      uid: scope.uid,
      placeId:
        normalizedEntry.cafe.placeId,
      name:
        normalizedEntry.cafe.name,
      status:
        normalizedEntry.cafe.status,
      primaryTheme:
        normalizedEntry.cafe.primaryTheme,
      themeCount:
        normalizedEntry.cafe.themes.length,
      seasonCount:
        normalizedEntry.cafe.seasons.length,
      keywordCount:
        normalizedEntry.cafe.tags.length,
      representativeKeywordCount:
        normalizedEntry.cafe
          .representativeTags
          .length,
      savedCafeCount:
        next.entries.length,
    },
  );

  if (scope.uid) {
    startBackgroundSync(
      'saved-cafe-save',
    );
  }

  return next.entries;
}

export async function removeSavedCafeEntry(
  placeId: string,
): Promise<SavedCafeLocalEntry[]> {
  const trimmedPlaceId =
    placeId.trim();

  if (!trimmedPlaceId) {
    return loadSavedCafeEntriesLocalOnly();
  }

  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  const deletedAt =
    createNowIso();

  const next =
    normalizeState({
      ...prepared.state,
      entries:
        prepared.state.entries.filter(
          (item) =>
            item.cafe.placeId !==
            trimmedPlaceId,
        ),
      deletedEntries: [
        {
          placeId:
            trimmedPlaceId,
          deletedAt,
        },
        ...prepared.state.deletedEntries.filter(
          (item) =>
            item.placeId !==
            trimmedPlaceId,
        ),
      ],
      updatedAt:
        deletedAt,
    });

  await writeStateToKey(
    scope.storageKey,
    next,
  );

  console.log(
    'SAVED CAFE LOCAL REMOVE DONE',
    {
      uid: scope.uid,
      placeId:
        trimmedPlaceId,
      deletedAt,
      savedCafeCount:
        next.entries.length,
      deletedCafeCount:
        next.deletedEntries.length,
    },
  );

  if (scope.uid) {
    startBackgroundSync(
      'saved-cafe-remove',
    );
  }

  return next.entries;
}
