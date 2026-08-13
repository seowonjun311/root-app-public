import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';
import {
  getAuth,
} from '@react-native-firebase/auth';
import {
  getRootCloudUidOrNull,
} from './rootCloudSession';
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';

// SAVED_CAFE_V40_FOLDER_STORE

const SAVED_CAFE_FOLDER_GUEST_KEY =
  'root_saved_cafe_folders_guest_v1';

const SAVED_CAFE_FOLDER_USER_KEY_PREFIX =
  'root_saved_cafe_folders_user_v1:';

const SAVED_CAFE_FOLDER_GUEST_ADOPTION_KEY_PREFIX =
  'root_saved_cafe_folders_guest_adoption_v1:';

const SAVED_CAFE_FOLDER_VERSION = 1;
const SAVED_CAFE_FOLDER_LOAD_TIMEOUT_MS = 4500;
const SAVED_CAFE_FOLDER_READ_TIMEOUT_MS = 6000;
const SAVED_CAFE_FOLDER_WRITE_TIMEOUT_MS = 9000;

export const MAX_SAVED_CAFE_FOLDERS = 30;
export const MAX_SAVED_CAFE_FOLDER_NAME_LENGTH = 20;

export const SAVED_CAFE_FOLDER_EMOJIS = [
  '☕',
  '📚',
  '💻',
  '🌙',
  '❤️',
  '🌿',
  '📸',
  '🍰',
  '🗺️',
  '⭐',
] as const;

export type SavedCafeFolder = {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedCafeFolderMembership = {
  key: string;
  folderId: string;
  placeId: string;
  addedAt: string;
  updatedAt: string;
};

export type SavedCafeFolderDeletedItem = {
  id: string;
  deletedAt: string;
};

export type SavedCafeFolderDeletedMembership = {
  key: string;
  folderId: string;
  placeId: string;
  deletedAt: string;
};

export type SavedCafeFolderState = {
  version: 1;
  folders: SavedCafeFolder[];
  memberships: SavedCafeFolderMembership[];
  deletedFolders: SavedCafeFolderDeletedItem[];
  deletedMemberships: SavedCafeFolderDeletedMembership[];
  updatedAt: string;
};

export type CreateSavedCafeFolderInput = {
  name: string;
  emoji?: string;
};

export type UpdateSavedCafeFolderInput = {
  name?: string;
  emoji?: string;
};

type SavedCafeFolderScope = {
  uid: string | null;
  storageKey: string;
  isGuest: boolean;
};

type PreparedSavedCafeFolderState = {
  state: SavedCafeFolderState;
  adoptedGuestData: boolean;
};

let runningSync:
  | Promise<SavedCafeFolderState>
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

function normalizeFolderName(
  value: unknown,
) {
  return typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, ' ')
        .slice(
          0,
          MAX_SAVED_CAFE_FOLDER_NAME_LENGTH,
        )
    : '';
}

function normalizeFolderEmoji(
  value: unknown,
) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return SAVED_CAFE_FOLDER_EMOJIS[0];
  }

  return Array.from(
    value.trim(),
  )
    .slice(0, 2)
    .join('');
}

function normalizeId(
  value: unknown,
) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function createMembershipKey(
  folderId: string,
  placeId: string,
) {
  return `${folderId}::${placeId}`;
}

function createEmptyState(): SavedCafeFolderState {
  return {
    version:
      SAVED_CAFE_FOLDER_VERSION,
    folders: [],
    memberships: [],
    deletedFolders: [],
    deletedMemberships: [],
    updatedAt: createNowIso(),
  };
}

function normalizeFolder(
  value: unknown,
): SavedCafeFolder | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const source =
    value as Partial<SavedCafeFolder>;

  const id =
    normalizeId(source.id);

  const name =
    normalizeFolderName(
      source.name,
    );

  if (!id || !name) {
    return null;
  }

  const createdAt =
    parseDateTime(
      source.createdAt,
    ) > 0
      ? String(source.createdAt)
      : createNowIso();

  const updatedAt =
    parseDateTime(
      source.updatedAt,
    ) > 0
      ? String(source.updatedAt)
      : createdAt;

  return {
    id,
    name,
    emoji:
      normalizeFolderEmoji(
        source.emoji,
      ),
    createdAt,
    updatedAt,
  };
}

function normalizeMembership(
  value: unknown,
): SavedCafeFolderMembership | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const source =
    value as Partial<SavedCafeFolderMembership>;

  const folderId =
    normalizeId(
      source.folderId,
    );

  const placeId =
    normalizeId(
      source.placeId,
    );

  if (
    !folderId ||
    !placeId
  ) {
    return null;
  }

  const key =
    createMembershipKey(
      folderId,
      placeId,
    );

  const addedAt =
    parseDateTime(
      source.addedAt,
    ) > 0
      ? String(source.addedAt)
      : createNowIso();

  const updatedAt =
    parseDateTime(
      source.updatedAt,
    ) > 0
      ? String(source.updatedAt)
      : addedAt;

  return {
    key,
    folderId,
    placeId,
    addedAt,
    updatedAt,
  };
}

function normalizeDeletedFolder(
  value: unknown,
): SavedCafeFolderDeletedItem | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const source =
    value as Partial<SavedCafeFolderDeletedItem>;

  const id =
    normalizeId(source.id);

  if (!id) {
    return null;
  }

  const deletedAt =
    parseDateTime(
      source.deletedAt,
    ) > 0
      ? String(source.deletedAt)
      : createNowIso();

  return {
    id,
    deletedAt,
  };
}

function normalizeDeletedMembership(
  value: unknown,
): SavedCafeFolderDeletedMembership | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const source =
    value as Partial<SavedCafeFolderDeletedMembership>;

  const folderId =
    normalizeId(
      source.folderId,
    );

  const placeId =
    normalizeId(
      source.placeId,
    );

  if (
    !folderId ||
    !placeId
  ) {
    return null;
  }

  const key =
    createMembershipKey(
      folderId,
      placeId,
    );

  const deletedAt =
    parseDateTime(
      source.deletedAt,
    ) > 0
      ? String(source.deletedAt)
      : createNowIso();

  return {
    key,
    folderId,
    placeId,
    deletedAt,
  };
}

function keepLatestByKey<T>(
  values: T[],
  getKey: (value: T) => string,
  getUpdatedAt:
    (value: T) => string,
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
): SavedCafeFolderState {
  const source =
    value &&
    typeof value === 'object'
      ? value as Partial<SavedCafeFolderState>
      : {};

  const folders =
    keepLatestByKey(
      (
        Array.isArray(
          source.folders,
        )
          ? source.folders
          : []
      )
        .map(normalizeFolder)
        .filter(
          (
            item,
          ): item is SavedCafeFolder =>
            Boolean(item),
        ),
      (item) => item.id,
      (item) => item.updatedAt,
    );

  const deletedFolders =
    keepLatestByKey(
      (
        Array.isArray(
          source.deletedFolders,
        )
          ? source.deletedFolders
          : []
      )
        .map(
          normalizeDeletedFolder,
        )
        .filter(
          (
            item,
          ): item is SavedCafeFolderDeletedItem =>
            Boolean(item),
        ),
      (item) => item.id,
      (item) => item.deletedAt,
    );

  const deletedFolderMap =
    new Map(
      deletedFolders.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );

  const activeFolders =
    folders.filter((folder) => {
      const deleted =
        deletedFolderMap.get(
          folder.id,
        );

      return (
        !deleted ||
        parseDateTime(
          folder.updatedAt,
        ) >
          parseDateTime(
            deleted.deletedAt,
          )
      );
    });

  const activeFolderIds =
    new Set(
      activeFolders.map(
        (folder) =>
          folder.id,
      ),
    );

  const memberships =
    keepLatestByKey(
      (
        Array.isArray(
          source.memberships,
        )
          ? source.memberships
          : []
      )
        .map(
          normalizeMembership,
        )
        .filter(
          (
            item,
          ): item is SavedCafeFolderMembership =>
            Boolean(item),
        ),
      (item) => item.key,
      (item) => item.updatedAt,
    );

  const deletedMemberships =
    keepLatestByKey(
      (
        Array.isArray(
          source.deletedMemberships,
        )
          ? source.deletedMemberships
          : []
      )
        .map(
          normalizeDeletedMembership,
        )
        .filter(
          (
            item,
          ): item is SavedCafeFolderDeletedMembership =>
            Boolean(item),
        ),
      (item) => item.key,
      (item) => item.deletedAt,
    );

  const deletedMembershipMap =
    new Map(
      deletedMemberships.map(
        (item) => [
          item.key,
          item,
        ],
      ),
    );

  const activeMemberships =
    memberships.filter(
      (membership) => {
        if (
          !activeFolderIds.has(
            membership.folderId,
          )
        ) {
          return false;
        }

        const deleted =
          deletedMembershipMap.get(
            membership.key,
          );

        return (
          !deleted ||
          parseDateTime(
            membership.updatedAt,
          ) >
            parseDateTime(
              deleted.deletedAt,
            )
        );
      },
    );

  const latestItemTime =
    Math.max(
      parseDateTime(
        source.updatedAt,
      ),
      ...activeFolders.map(
        (folder) =>
          parseDateTime(
            folder.updatedAt,
          ),
      ),
      ...activeMemberships.map(
        (membership) =>
          parseDateTime(
            membership.updatedAt,
          ),
      ),
      ...deletedFolders.map(
        (item) =>
          parseDateTime(
            item.deletedAt,
          ),
      ),
      ...deletedMemberships.map(
        (item) =>
          parseDateTime(
            item.deletedAt,
          ),
      ),
    );

  return {
    version:
      SAVED_CAFE_FOLDER_VERSION,
    folders:
      activeFolders.sort(
        (first, second) =>
          parseDateTime(
            second.updatedAt,
          ) -
          parseDateTime(
            first.updatedAt,
          ),
      ),
    memberships:
      activeMemberships.sort(
        (first, second) =>
          parseDateTime(
            second.updatedAt,
          ) -
          parseDateTime(
            first.updatedAt,
          ),
      ),
    deletedFolders,
    deletedMemberships,
    updatedAt:
      latestItemTime > 0
        ? new Date(
            latestItemTime,
          ).toISOString()
        : createNowIso(),
  };
}

export function mergeSavedCafeFolderStates(
  first: SavedCafeFolderState,
  second: SavedCafeFolderState,
) {
  return normalizeState({
    folders: [
      ...first.folders,
      ...second.folders,
    ],
    memberships: [
      ...first.memberships,
      ...second.memberships,
    ],
    deletedFolders: [
      ...first.deletedFolders,
      ...second.deletedFolders,
    ],
    deletedMemberships: [
      ...first.deletedMemberships,
      ...second.deletedMemberships,
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

function getCurrentScope(): SavedCafeFolderScope {
  // ROOT_EXPLORE_V12D91_GUEST_LOCAL_ONLY_SCOPE
  const uid =
    getRootCloudUidOrNull();

  return {
    uid,
    storageKey:
      uid
        ? `${SAVED_CAFE_FOLDER_USER_KEY_PREFIX}${uid}`
        : SAVED_CAFE_FOLDER_GUEST_KEY,
    isGuest: !uid,
  };
}

function getGuestAdoptionKey(
  uid: string,
) {
  return `${SAVED_CAFE_FOLDER_GUEST_ADOPTION_KEY_PREFIX}${uid}`;
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
      'SAVED CAFE FOLDER LOCAL READ ERROR',
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
  state: SavedCafeFolderState,
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
  scope: SavedCafeFolderScope,
): Promise<PreparedSavedCafeFolderState> {
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
        SAVED_CAFE_FOLDER_GUEST_KEY,
      );

    if (
      guest &&
      (
        guest.folders.length > 0 ||
        guest.memberships.length > 0 ||
        guest.deletedFolders.length > 0 ||
        guest.deletedMemberships.length > 0
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
        'SAVED CAFE FOLDER GUEST DATA ADOPTED',
        {
          uid: scope.uid,
          folderCount:
            adopted.folders.length,
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
    ?.savedCafeFolderData
    ? normalizeState(
        userData.savedCafeFolderData,
      )
    : createEmptyState();
}

function toFirestoreSafeState(
  state: SavedCafeFolderState,
) {
  return JSON.parse(
    JSON.stringify(
      normalizeState(state),
    ),
  ) as SavedCafeFolderState;
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
      'SAVED CAFE FOLDER SYNC LOCAL ONLY',
      {
        reason,
        folderCount:
          prepared.state.folders.length,
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
      'SAVED_CAFE_FOLDER_SELF_ONLY_UID_REQUIRED',
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
      SAVED_CAFE_FOLDER_READ_TIMEOUT_MS,
      'SAVED_CAFE_FOLDER_FIRESTORE_READ_TIMEOUT',
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
      'SAVED_CAFE_FOLDER_AUTH_UID_CHANGED_DURING_READ',
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
    mergeSavedCafeFolderStates(
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
        savedCafeFolderData:
          firestoreState,
        savedCafeFolderUpdatedAt:
          firestoreState.updatedAt,
      },
      {
        merge: true,
      },
    ),
    SAVED_CAFE_FOLDER_WRITE_TIMEOUT_MS,
    'SAVED_CAFE_FOLDER_FIRESTORE_WRITE_TIMEOUT',
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
      'SAVED_CAFE_FOLDER_AUTH_UID_CHANGED_DURING_WRITE',
    );
  }

  if (
    prepared.adoptedGuestData
  ) {
    await Promise.all([
      AsyncStorage.removeItem(
        SAVED_CAFE_FOLDER_GUEST_KEY,
      ),
      AsyncStorage.removeItem(
        getGuestAdoptionKey(
          expectedUid,
        ),
      ),
    ]);
  }

  console.log(
    'SAVED CAFE FOLDER CLOUD SYNC DONE',
    {
      uid: expectedUid,
      reason,
      folderCount:
        merged.folders.length,
      membershipCount:
        merged.memberships.length,
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

export async function syncSavedCafeFolderState(
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
  void syncSavedCafeFolderState(
    reason,
  ).catch((error) => {
    console.log(
      'SAVED CAFE FOLDER BACKGROUND SYNC ERROR',
      {
        reason,
        error,
      },
    );
  });
}

export async function loadSavedCafeFolderStateLocalOnly() {
  const scope =
    getCurrentScope();

  const prepared =
    await prepareLocalState(
      scope,
    );

  return prepared.state;
}

export async function loadSavedCafeFolderState() {
  const local =
    await loadSavedCafeFolderStateLocalOnly();

  const scope =
    getCurrentScope();

  if (!scope.uid) {
    return local;
  }

  try {
    return await withTimeout(
      syncSavedCafeFolderState(
        'folder-screen-load',
      ),
      SAVED_CAFE_FOLDER_LOAD_TIMEOUT_MS,
      'SAVED_CAFE_FOLDER_LOAD_TIMEOUT',
    );
  } catch (error) {
    console.log(
      'SAVED CAFE FOLDER LOAD FALLBACK',
      error,
    );

    startBackgroundSync(
      'folder-screen-load-retry',
    );

    return local;
  }
}

function createFolderId() {
  return [
    'cafe-folder',
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 9),
  ].join('-');
}

function assertFolderNameAvailable(
  state: SavedCafeFolderState,
  name: string,
  excludingFolderId?: string,
) {
  const normalized =
    normalizeFolderName(name);

  if (!normalized) {
    throw new Error(
      '폴더 이름을 입력해 주세요.',
    );
  }

  const key =
    normalized.toLocaleLowerCase(
      'ko-KR',
    );

  const duplicated =
    state.folders.some(
      (folder) =>
        folder.id !==
          excludingFolderId &&
        folder.name
          .toLocaleLowerCase(
            'ko-KR',
          ) === key,
    );

  if (duplicated) {
    throw new Error(
      '같은 이름의 폴더가 이미 있어요.',
    );
  }

  return normalized;
}

async function saveLocalMutation(
  nextState: SavedCafeFolderState,
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

export async function createSavedCafeFolder(
  input: CreateSavedCafeFolderInput,
) {
  const state =
    await loadSavedCafeFolderStateLocalOnly();

  if (
    state.folders.length >=
    MAX_SAVED_CAFE_FOLDERS
  ) {
    throw new Error(
      `카페 폴더는 최대 ${MAX_SAVED_CAFE_FOLDERS}개까지 만들 수 있어요.`,
    );
  }

  const name =
    assertFolderNameAvailable(
      state,
      input.name,
    );

  const now =
    createNowIso();

  const folder: SavedCafeFolder = {
    id: createFolderId(),
    name,
    emoji:
      normalizeFolderEmoji(
        input.emoji,
      ),
    createdAt: now,
    updatedAt: now,
  };

  const next =
    normalizeState({
      ...state,
      folders: [
        folder,
        ...state.folders,
      ],
      deletedFolders:
        state.deletedFolders.filter(
          (item) =>
            item.id !== folder.id,
        ),
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    'create-folder',
  );
}

export async function updateSavedCafeFolder(
  folderId: string,
  input: UpdateSavedCafeFolderInput,
) {
  const state =
    await loadSavedCafeFolderStateLocalOnly();

  const current =
    state.folders.find(
      (folder) =>
        folder.id === folderId,
    );

  if (!current) {
    throw new Error(
      '수정할 폴더를 찾을 수 없어요.',
    );
  }

  const name =
    input.name === undefined
      ? current.name
      : assertFolderNameAvailable(
          state,
          input.name,
          folderId,
        );

  const now =
    createNowIso();

  const updated: SavedCafeFolder = {
    ...current,
    name,
    emoji:
      input.emoji === undefined
        ? current.emoji
        : normalizeFolderEmoji(
            input.emoji,
          ),
    updatedAt: now,
  };

  const next =
    normalizeState({
      ...state,
      folders:
        state.folders.map(
          (folder) =>
            folder.id === folderId
              ? updated
              : folder,
        ),
      deletedFolders:
        state.deletedFolders.filter(
          (item) =>
            item.id !== folderId,
        ),
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    'update-folder',
  );
}

export async function deleteSavedCafeFolder(
  folderId: string,
) {
  const state =
    await loadSavedCafeFolderStateLocalOnly();

  const exists =
    state.folders.some(
      (folder) =>
        folder.id === folderId,
    );

  if (!exists) {
    return state;
  }

  const now =
    createNowIso();

  const removedMemberships =
    state.memberships.filter(
      (membership) =>
        membership.folderId ===
        folderId,
    );

  const next =
    normalizeState({
      ...state,
      folders:
        state.folders.filter(
          (folder) =>
            folder.id !== folderId,
        ),
      memberships:
        state.memberships.filter(
          (membership) =>
            membership.folderId !==
            folderId,
        ),
      deletedFolders: [
        ...state.deletedFolders,
        {
          id: folderId,
          deletedAt: now,
        },
      ],
      deletedMemberships: [
        ...state.deletedMemberships,
        ...removedMemberships.map(
          (membership) => ({
            key:
              membership.key,
            folderId:
              membership.folderId,
            placeId:
              membership.placeId,
            deletedAt: now,
          }),
        ),
      ],
      updatedAt: now,
    });

  return saveLocalMutation(
    next,
    'delete-folder',
  );
}

export async function setSavedCafeFolderMembership(
  folderId: string,
  placeId: string,
  included: boolean,
) {
  const normalizedFolderId =
    normalizeId(folderId);

  const normalizedPlaceId =
    normalizeId(placeId);

  if (
    !normalizedFolderId ||
    !normalizedPlaceId
  ) {
    throw new Error(
      '카페 또는 폴더 정보가 올바르지 않아요.',
    );
  }

  const state =
    await loadSavedCafeFolderStateLocalOnly();

  const folderExists =
    state.folders.some(
      (folder) =>
        folder.id ===
        normalizedFolderId,
    );

  if (!folderExists) {
    throw new Error(
      '카페를 담을 폴더를 찾을 수 없어요.',
    );
  }

  const key =
    createMembershipKey(
      normalizedFolderId,
      normalizedPlaceId,
    );

  const current =
    state.memberships.find(
      (membership) =>
        membership.key === key,
    );

  const now =
    createNowIso();

  const next =
    included
      ? normalizeState({
          ...state,
          memberships: [
            ...state.memberships.filter(
              (membership) =>
                membership.key !== key,
            ),
            {
              key,
              folderId:
                normalizedFolderId,
              placeId:
                normalizedPlaceId,
              addedAt:
                current?.addedAt ??
                now,
              updatedAt: now,
            },
          ],
          deletedMemberships:
            state.deletedMemberships.filter(
              (item) =>
                item.key !== key,
            ),
          updatedAt: now,
        })
      : normalizeState({
          ...state,
          memberships:
            state.memberships.filter(
              (membership) =>
                membership.key !== key,
            ),
          deletedMemberships: [
            ...state.deletedMemberships,
            {
              key,
              folderId:
                normalizedFolderId,
              placeId:
                normalizedPlaceId,
              deletedAt: now,
            },
          ],
          updatedAt: now,
        });

  return saveLocalMutation(
    next,
    included
      ? 'add-cafe-to-folder'
      : 'remove-cafe-from-folder',
  );
}

export async function pruneSavedCafeFolderMemberships(
  validPlaceIds: readonly string[],
) {
  const valid =
    new Set(
      validPlaceIds
        .map(normalizeId)
        .filter(Boolean),
    );

  const state =
    await loadSavedCafeFolderStateLocalOnly();

  const stale =
    state.memberships.filter(
      (membership) =>
        !valid.has(
          membership.placeId,
        ),
    );

  if (stale.length === 0) {
    return state;
  }

  const now =
    createNowIso();

  const staleKeys =
    new Set(
      stale.map(
        (membership) =>
          membership.key,
      ),
    );

  const next =
    normalizeState({
      ...state,
      memberships:
        state.memberships.filter(
          (membership) =>
            !staleKeys.has(
              membership.key,
            ),
        ),
      deletedMemberships: [
        ...state.deletedMemberships,
        ...stale.map(
          (membership) => ({
            key:
              membership.key,
            folderId:
              membership.folderId,
            placeId:
              membership.placeId,
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
