import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

import {
  getCharacterAccountScopeSnapshot,
  getCharacterScopedStorageKey,
  refreshCharacterAccountScope,
  subscribeCharacterAccountScope,
  type CharacterAccountScopeSnapshot,
} from './characterAccountScope';
import {
  CHARACTER_IDS,
} from '../constants/characterAssets';

export const CHARACTER_LOCAL_STATE_KEYS = {
  selectedCharacter:
    'selected_character_v1',
  progression:
    'character_progression_v1',
  relationship:
    'character_relationship_v1',
  acquisitionCelebration:
    'character_acquisition_celebration_v1',
} as const;

export type CharacterLocalStateBundle = {
  selectedCharacter:
    string | null;
  progression:
    string | null;
  relationship:
    string | null;
  acquisitionCelebration:
    string | null;
};

export type CharacterCloudEnvelope = {
  version: 1;
  ownerUid: string;
  scopeId: string;
  updatedAt: string;
  bundle:
    CharacterLocalStateBundle;
};

export type CharacterScopedSeedResult = {
  seeded: boolean;
  reason:
    | 'seeded-from-legacy'
    | 'scoped-data-exists'
    | 'legacy-data-empty'
    | 'legacy-claimed-by-another-scope';
  scope:
    CharacterAccountScopeSnapshot;
};

const CLOUD_FIELD =
  'characterSystemV98';

// CHARACTER_V98B_LEGACY_SCOPE_CLAIM
const LEGACY_SCOPE_CLAIM_KEY =
  'character_account_scope_v1:legacy_claim_owner';

const scopedPreparationPromises =
  new Map<
    string,
    Promise<CharacterScopedSeedResult>
  >();

function hasAnyData(
  bundle:
    CharacterLocalStateBundle
): boolean {
  return Object.values(
    bundle
  ).some(
    (
      value
    ) =>
      value !== null
  );
}

async function readBundle(
  keyFor:
    (
      baseKey: string
    ) => string
): Promise<
  CharacterLocalStateBundle
> {
  const entries =
    await AsyncStorage.multiGet([
      keyFor(
        CHARACTER_LOCAL_STATE_KEYS
          .selectedCharacter
      ),
      keyFor(
        CHARACTER_LOCAL_STATE_KEYS
          .progression
      ),
      keyFor(
        CHARACTER_LOCAL_STATE_KEYS
          .relationship
      ),
      keyFor(
        CHARACTER_LOCAL_STATE_KEYS
          .acquisitionCelebration
      ),
    ]);

  return {
    selectedCharacter:
      entries[0]?.[1] ??
      null,
    progression:
      entries[1]?.[1] ??
      null,
    relationship:
      entries[2]?.[1] ??
      null,
    acquisitionCelebration:
      entries[3]?.[1] ??
      null,
  };
}

// CHARACTER_V98A_LEGACY_LOCAL_BUNDLE_READER
export function readLegacyCharacterLocalBundle():
  Promise<CharacterLocalStateBundle> {
  return readBundle(
    (
      baseKey
    ) =>
      baseKey
  );
}

// CHARACTER_V98A_SCOPED_LOCAL_BUNDLE_READER
export function readScopedCharacterLocalBundle(
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<CharacterLocalStateBundle> {
  return readBundle(
    (
      baseKey
    ) =>
      getCharacterScopedStorageKey(
        baseKey,
        scope
      )
  );
}

export async function writeScopedCharacterLocalBundle(
  bundle:
    CharacterLocalStateBundle,
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<void> {
  const writes:
    [string, string][] =
    [];

  const removals:
    string[] =
    [];

  for (
    const [
      logicalKey,
      baseKey,
    ] of Object.entries(
      CHARACTER_LOCAL_STATE_KEYS
    )
  ) {
    const value =
      bundle[
        logicalKey as
          keyof CharacterLocalStateBundle
      ];

    const scopedKey =
      getCharacterScopedStorageKey(
        baseKey,
        scope
      );

    if (
      value === null
    ) {
      removals.push(
        scopedKey
      );
    }
    else {
      writes.push([
        scopedKey,
        value,
      ]);
    }
  }

  if (
    writes.length > 0
  ) {
    await AsyncStorage.multiSet(
      writes
    );
  }

  if (
    removals.length > 0
  ) {
    await AsyncStorage.multiRemove(
      removals
    );
  }
}

// CHARACTER_V98A_NONDESTRUCTIVE_LEGACY_SEED
export async function seedScopedCharacterLocalBundleFromLegacyIfEmpty(
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<
  CharacterScopedSeedResult
> {
  const scoped =
    await readScopedCharacterLocalBundle(
      scope
    );

  const claimOwner =
    await AsyncStorage.getItem(
      LEGACY_SCOPE_CLAIM_KEY
    );

  if (
    hasAnyData(
      scoped
    )
  ) {
    // If this scope already contains migrated data and nobody claimed the
    // legacy bundle yet, make the ownership explicit before another account
    // can inherit the same V97 state.
    if (
      claimOwner ===
      null
    ) {
      const legacy =
        await readLegacyCharacterLocalBundle();

      if (
        hasAnyData(
          legacy
        )
      ) {
        await AsyncStorage.setItem(
          LEGACY_SCOPE_CLAIM_KEY,
          scope.scopeId
        );
      }
    }

    return {
      seeded:
        false,
      reason:
        'scoped-data-exists',
      scope,
    };
  }

  if (
    claimOwner !==
      null &&
    claimOwner !==
      scope.scopeId
  ) {
    return {
      seeded:
        false,
      reason:
        'legacy-claimed-by-another-scope',
      scope,
    };
  }

  const legacy =
    await readLegacyCharacterLocalBundle();

  if (
    !hasAnyData(
      legacy
    )
  ) {
    return {
      seeded:
        false,
      reason:
        'legacy-data-empty',
      scope,
    };
  }

  // Claim first. If the following copy fails, the same scope may retry
  // because claimOwner === scope.scopeId remains allowed.
  if (
    claimOwner ===
    null
  ) {
    await AsyncStorage.setItem(
      LEGACY_SCOPE_CLAIM_KEY,
      scope.scopeId
    );
  }

  await writeScopedCharacterLocalBundle(
    legacy,
    scope
  );

  return {
    seeded:
      true,
    reason:
      'seeded-from-legacy',
    scope,
  };
}

function assertAuthenticatedScope(
  scope:
    CharacterAccountScopeSnapshot
): string {
  if (
    scope.kind !==
      'user' ||
    scope.cloudUid ===
      null
  ) {
    throw new Error(
      'CHARACTER_CLOUD_SYNC_REQUIRES_AUTHENTICATED_USER'
    );
  }

  return scope.cloudUid;
}

function normalizeBundle(
  value: unknown
): CharacterLocalStateBundle | null {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  const normalize =
    (
      field: string
    ): string | null =>
      typeof record[
        field
      ] ===
        'string'
        ? record[
            field
          ] as string
        : null;

  return {
    selectedCharacter:
      normalize(
        'selectedCharacter'
      ),
    progression:
      normalize(
        'progression'
      ),
    relationship:
      normalize(
        'relationship'
      ),
    acquisitionCelebration:
      normalize(
        'acquisitionCelebration'
      ),
  };
}

// CHARACTER_V98E_RELEASE_SCHEMA_GUARD
export const CHARACTER_CLOUD_SCHEMA_VERSION =
  1 as const;

const CHARACTER_CLOUD_PERMANENT_ERROR_CODES =
  new Set([
    'CHARACTER_CLOUD_SCHEMA_UNSUPPORTED',
    'CHARACTER_CLOUD_OWNER_MISMATCH',
    'CHARACTER_CLOUD_SCOPE_MISMATCH',
    'CHARACTER_CLOUD_UPDATED_AT_INVALID',
    'CHARACTER_CLOUD_BUNDLE_INVALID',
    'CHARACTER_CLOUD_LOCAL_BUNDLE_INVALID',
  ]);

const cloudPermanentErrors =
  new Map<
    string,
    string
  >();

function createCharacterCloudPermanentError(
  code: string,
  message: string
): Error {
  const error =
    new Error(
      message
    ) as Error & {
      code?: string;
    };

  error.name =
    'CharacterCloudPermanentError';

  error.code =
    code;

  return error;
}

function getCharacterCloudErrorCode(
  error: unknown
): string | null {
  if (
    !error ||
    typeof error !==
      'object'
  ) {
    return null;
  }

  const code =
    (
      error as {
        code?: unknown;
      }
    ).code;

  return typeof code ===
    'string'
    ? code
    : null;
}

function isPermanentCharacterCloudSyncError(
  error: unknown
): boolean {
  const code =
    getCharacterCloudErrorCode(
      error
    );

  return (
    code !==
      null &&
    CHARACTER_CLOUD_PERMANENT_ERROR_CODES.has(
      code
    )
  );
}

function assertJsonObjectPayload(
  raw: string,
  label: string,
  requireCharacterKeys: boolean
): void {
  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        raw
      );
  }
  catch {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_BUNDLE_INVALID',
      label +
        ' is not valid JSON.'
    );
  }

  if (
    !parsed ||
    typeof parsed !==
      'object' ||
    Array.isArray(
      parsed
    )
  ) {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_BUNDLE_INVALID',
      label +
        ' must be a JSON object.'
    );
  }

  if (
    requireCharacterKeys
  ) {
    const record =
      parsed as
        Record<
          string,
          unknown
        >;

    const missing =
      CHARACTER_IDS.filter(
        (
          characterId
        ) =>
          !Object.prototype
            .hasOwnProperty
            .call(
              record,
              characterId
            )
      );

    if (
      missing.length >
      0
    ) {
      throw createCharacterCloudPermanentError(
        'CHARACTER_CLOUD_BUNDLE_INVALID',
        label +
          ' is missing character keys: ' +
          missing.join(
            ','
          )
      );
    }
  }
}

function assertCharacterLocalStateBundleIntegrity(
  bundle:
    CharacterLocalStateBundle,
  source:
    'cloud' |
    'local-upload'
): void {
  const errorCode =
    source ===
      'cloud'
      ? 'CHARACTER_CLOUD_BUNDLE_INVALID'
      : 'CHARACTER_CLOUD_LOCAL_BUNDLE_INVALID';

  const fail =
    (
      message: string
    ): never => {
      throw createCharacterCloudPermanentError(
        errorCode,
        message
      );
    };

  const selected =
    bundle
      .selectedCharacter;

  if (
    selected !==
      null &&
    !(
      CHARACTER_IDS as
        readonly string[]
    ).includes(
      selected
    )
  ) {
    fail(
      'selectedCharacter is invalid: ' +
      selected
    );
  }

  if (
    bundle.progression !==
    null
  ) {
    try {
      assertJsonObjectPayload(
        bundle.progression,
        'progression',
        true
      );
    }
    catch (error) {
      if (
        source ===
        'local-upload'
      ) {
        fail(
          (
            error as Error
          ).message
        );
      }

      throw error;
    }
  }

  if (
    bundle.relationship !==
    null
  ) {
    try {
      assertJsonObjectPayload(
        bundle.relationship,
        'relationship',
        true
      );
    }
    catch (error) {
      if (
        source ===
        'local-upload'
      ) {
        fail(
          (
            error as Error
          ).message
        );
      }

      throw error;
    }
  }

  if (
    bundle.acquisitionCelebration !==
    null
  ) {
    let parsed:
      unknown;

    try {
      parsed =
        JSON.parse(
          bundle
            .acquisitionCelebration
        );
    }
    catch {
      fail(
        'acquisitionCelebration is not valid JSON.'
      );
    }

    if (
      !Array.isArray(
        parsed
      ) ||
      parsed.some(
        (
          value
        ) =>
          typeof value !==
            'string' ||
          !(
            CHARACTER_IDS as
              readonly string[]
          ).includes(
            value
          )
      )
    ) {
      fail(
        'acquisitionCelebration must contain only valid character ids.'
      );
    }
  }
}

function assertRawCharacterBundleFieldTypes(
  value: unknown
): void {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_BUNDLE_INVALID',
      'Cloud character bundle must be an object.'
    );
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  for (
    const field of [
      'selectedCharacter',
      'progression',
      'relationship',
      'acquisitionCelebration',
    ]
  ) {
    const fieldValue =
      record[
        field
      ];

    if (
      fieldValue !==
        undefined &&
      fieldValue !==
        null &&
      typeof fieldValue !==
        'string'
    ) {
      throw createCharacterCloudPermanentError(
        'CHARACTER_CLOUD_BUNDLE_INVALID',
        field +
          ' must be a string or null.'
      );
    }
  }
}

// CHARACTER_V98A_FIRESTORE_CHARACTER_ENVELOPE_READ
export async function loadCharacterCloudEnvelope(
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<CharacterCloudEnvelope | null> {
  const uid =
    assertAuthenticatedScope(
      scope
    );

  const snapshot =
    await firestore()
      .collection(
        'users'
      )
      .doc(
        uid
      )
      .get();

  const raw =
    snapshot.data()
      ?.[CLOUD_FIELD];

  if (
    !raw ||
    typeof raw !==
      'object' ||
    Array.isArray(
      raw
    )
  ) {
    return null;
  }

  const record =
    raw as
      Record<
        string,
        unknown
      >;

  const version =
    Number(
      record.version
    );

  if (
    version !==
    CHARACTER_CLOUD_SCHEMA_VERSION
  ) {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_SCHEMA_UNSUPPORTED',
      'Unsupported character cloud schema version: ' +
      String(
        record.version
      )
    );
  }

  if (
    record.ownerUid !==
    uid
  ) {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_OWNER_MISMATCH',
      'Character cloud ownerUid does not match the active Firebase user.'
    );
  }

  if (
    record.scopeId !==
    scope.scopeId
  ) {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_SCOPE_MISMATCH',
      'Character cloud scopeId does not match the active account scope.'
    );
  }

  if (
    typeof record.updatedAt !==
      'string' ||
    !Number.isFinite(
      Date.parse(
        record.updatedAt
      )
    )
  ) {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_UPDATED_AT_INVALID',
      'Character cloud updatedAt is missing or invalid.'
    );
  }

  assertRawCharacterBundleFieldTypes(
    record.bundle
  );

  const bundle =
    normalizeBundle(
      record.bundle
    );

  if (
    bundle === null
  ) {
    throw createCharacterCloudPermanentError(
      'CHARACTER_CLOUD_BUNDLE_INVALID',
      'Character cloud bundle could not be normalized.'
    );
  }

  assertCharacterLocalStateBundleIntegrity(
    bundle,
    'cloud'
  );

  return {
    version: 1,
    ownerUid:
      typeof record.ownerUid ===
        'string'
        ? record.ownerUid
        : uid,
    scopeId:
      typeof record.scopeId ===
        'string'
        ? record.scopeId
        : scope.scopeId,
    updatedAt:
      typeof record.updatedAt ===
        'string'
        ? record.updatedAt
        : '',
    bundle,
  };
}

// CHARACTER_V98A_FIRESTORE_CHARACTER_ENVELOPE_WRITE
export async function saveCharacterCloudEnvelope(
  bundle:
    CharacterLocalStateBundle,
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<CharacterCloudEnvelope> {
  const uid =
    assertAuthenticatedScope(
      scope
    );

  assertCharacterLocalStateBundleIntegrity(
    bundle,
    'local-upload'
  );

  const envelope:
    CharacterCloudEnvelope = {
    version: 1,
    ownerUid:
      uid,
    scopeId:
      scope.scopeId,
    updatedAt:
      new Date()
        .toISOString(),
    bundle,
  };

  await firestore()
    .collection(
      'users'
    )
    .doc(
      uid
    )
    .set(
      {
        [CLOUD_FIELD]:
          envelope,
        characterSystemUpdatedAt:
          envelope.updatedAt,
      },
      {
        merge: true,
      }
    );

  return envelope;
}

// CHARACTER_V98A_SCOPED_CLOUD_UPLOAD_HELPER
export async function uploadScopedCharacterBundleToCloud(
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<CharacterCloudEnvelope> {
  const bundle =
    await readScopedCharacterLocalBundle(
      scope
    );

  return saveCharacterCloudEnvelope(
    bundle,
    scope
  );
}

// CHARACTER_V98A_CLOUD_TO_SCOPED_DOWNLOAD_HELPER
export async function downloadCharacterCloudBundleToScopedLocal(
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<boolean> {
  const envelope =
    await loadCharacterCloudEnvelope(
      scope
    );

  if (
    envelope === null
  ) {
    return false;
  }

  await writeScopedCharacterLocalBundle(
    envelope.bundle,
    scope
  );

  return true;
}
// CHARACTER_V98B_SCOPED_STORAGE_PREPARATION
export function ensureCharacterScopedStorageReady(
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): Promise<CharacterScopedSeedResult> {
  const existing =
    scopedPreparationPromises.get(
      scope.scopeId
    );

  if (
    existing
  ) {
    return existing;
  }

  const task =
    seedScopedCharacterLocalBundleFromLegacyIfEmpty(
      scope
    )
      .finally(
        () => {
          if (
            scopedPreparationPromises.get(
              scope.scopeId
            ) ===
            task
          ) {
            scopedPreparationPromises.delete(
              scope.scopeId
            );
          }
        }
      );

  scopedPreparationPromises.set(
    scope.scopeId,
    task
  );

  return task;
}
// ==================================================
// CHARACTER V98C active cloud synchronization
// ==================================================

// CHARACTER_V98C_CLOUD_SYNC_META
type CharacterCloudSyncMeta = {
  version: 1;
  dirty: boolean;
  lastLocalMutationAt:
    string | null;
  lastCloudUpdatedAt:
    string | null;
  lastSyncAt:
    string | null;
};

export type CharacterCloudSyncResult =
  | 'guest-local-only'
  | 'idle'
  | 'uploaded'
  | 'downloaded'
  | 'empty';

type CharacterScopedStorageRefreshListener =
  (
    scope:
      CharacterAccountScopeSnapshot
  ) => void;

const CLOUD_SYNC_META_KEY =
  'character_cloud_sync_meta_v1';

const scopedStorageRefreshListeners =
  new Set<
    CharacterScopedStorageRefreshListener
  >();

const cloudSyncQueues =
  new Map<
    string,
    Promise<CharacterCloudSyncResult>
  >();

const cloudRetryTimers =
  new Map<
    string,
    ReturnType<
      typeof setTimeout
    >
  >();

const cloudRetryAttempts =
  new Map<
    string,
    number
  >();

const scopedLocalWriteQueues =
  new Map<
    string,
    Promise<void>
  >();

const cloudBootstrapStarted =
  new Set<string>();

function syncMetaKey(
  scope:
    CharacterAccountScopeSnapshot
): string {
  return getCharacterScopedStorageKey(
    CLOUD_SYNC_META_KEY,
    scope
  );
}

function parseIsoTime(
  value:
    string | null
): number {
  if (
    value ===
    null
  ) {
    return 0;
  }

  const parsed =
    Date.parse(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

async function readCloudSyncMeta(
  scope:
    CharacterAccountScopeSnapshot
): Promise<
  CharacterCloudSyncMeta | null
> {
  try {
    const raw =
      await AsyncStorage.getItem(
        syncMetaKey(
          scope
        )
      );

    if (
      raw ===
      null
    ) {
      return null;
    }

    const value =
      JSON.parse(
        raw
      );

    if (
      !value ||
      typeof value !==
        'object' ||
      Array.isArray(
        value
      )
    ) {
      return null;
    }

    const record =
      value as
        Record<
          string,
          unknown
        >;

    return {
      version: 1,
      dirty:
        record.dirty ===
        true,
      lastLocalMutationAt:
        typeof record.lastLocalMutationAt ===
          'string'
          ? record.lastLocalMutationAt
          : null,
      lastCloudUpdatedAt:
        typeof record.lastCloudUpdatedAt ===
          'string'
          ? record.lastCloudUpdatedAt
          : null,
      lastSyncAt:
        typeof record.lastSyncAt ===
          'string'
          ? record.lastSyncAt
          : null,
    };
  }
  catch (error) {
    if (
      __DEV__
    ) {
      console.warn(
        '[CHARACTER V98] cloud meta read failed',
        error
      );
    }

    return null;
  }
}

async function writeCloudSyncMeta(
  scope:
    CharacterAccountScopeSnapshot,
  meta:
    CharacterCloudSyncMeta
): Promise<void> {
  await AsyncStorage.setItem(
    syncMetaKey(
      scope
    ),
    JSON.stringify(
      meta
    )
  );
}

function emitScopedStorageRefresh(
  scope:
    CharacterAccountScopeSnapshot
): void {
  scopedStorageRefreshListeners
    .forEach(
      (
        listener
      ) => {
        listener(
          scope
        );
      }
    );
}

// CHARACTER_V98C_SCOPED_STORAGE_REFRESH_BUS
export function subscribeCharacterScopedStorageRefresh(
  listener:
    CharacterScopedStorageRefreshListener
): () => void {
  scopedStorageRefreshListeners
    .add(
      listener
    );

  return () => {
    scopedStorageRefreshListeners
      .delete(
        listener
      );
  };
}

function clearRetryTimer(
  scopeId: string
): void {
  const timer =
    cloudRetryTimers.get(
      scopeId
    );

  if (
    timer
  ) {
    clearTimeout(
      timer
    );

    cloudRetryTimers.delete(
      scopeId
    );
  }
}

function scheduleRetry(
  scope:
    CharacterAccountScopeSnapshot
): void {
  if (
    scope.kind !==
    'user'
  ) {
    return;
  }

  if (
    cloudRetryTimers.has(
      scope.scopeId
    )
  ) {
    return;
  }

  const attempt =
    (
      cloudRetryAttempts.get(
        scope.scopeId
      ) ??
      0
    ) +
    1;

  cloudRetryAttempts.set(
    scope.scopeId,
    attempt
  );

  const delay =
    Math.min(
      60000,
      1500 *
        Math.pow(
          2,
          Math.min(
            attempt - 1,
            5
          )
        )
    );

  const timer =
    setTimeout(
      () => {
        cloudRetryTimers.delete(
          scope.scopeId
        );

        void runCharacterCloudSync(
          scope
        );
      },
      delay
    );

  cloudRetryTimers.set(
    scope.scopeId,
    timer
  );
}

function markCloudSyncSucceeded(
  scope:
    CharacterAccountScopeSnapshot
): void {
  clearRetryTimer(
    scope.scopeId
  );

  cloudRetryAttempts.set(
    scope.scopeId,
    0
  );

  cloudPermanentErrors.delete(
    scope.scopeId
  );
}

// CHARACTER_V98C_ATOMIC_SCOPED_DIRTY_WRITE
export function persistCharacterScopedValueAndSchedule(
  baseKey: string,
  value: string,
  scope:
    CharacterAccountScopeSnapshot =
      refreshCharacterAccountScope()
): Promise<void> {
  const previous =
    scopedLocalWriteQueues.get(
      scope.scopeId
    ) ??
    Promise.resolve();

  const task =
    previous
      .then(
        async () => {
          await ensureCharacterScopedStorageReady(
            scope
          );

          const currentMeta =
            await readCloudSyncMeta(
              scope
            );

          const now =
            new Date()
              .toISOString();

          const nextMeta:
            CharacterCloudSyncMeta = {
            version: 1,
            dirty: true,
            lastLocalMutationAt:
              now,
            lastCloudUpdatedAt:
              currentMeta
                ?.lastCloudUpdatedAt ??
              null,
            lastSyncAt:
              currentMeta
                ?.lastSyncAt ??
              null,
          };

          await AsyncStorage.multiSet([
            [
              getCharacterScopedStorageKey(
                baseKey,
                scope
              ),
              value,
            ],
            [
              syncMetaKey(
                scope
              ),
              JSON.stringify(
                nextMeta
              ),
            ],
          ]);
        }
      )
      .then(
        () => {
          scheduleCharacterCloudSync(
            scope
          );
        }
      );

  scopedLocalWriteQueues.set(
    scope.scopeId,
    task
      .then(
        () => undefined,
        () => undefined
      )
  );

  return task;
}

// CHARACTER_V98C_TRANSACTIONAL_CLOUD_UPLOAD
async function saveCharacterCloudEnvelopeIfUnchanged(
  bundle:
    CharacterLocalStateBundle,
  expectedUpdatedAt:
    string | null,
  scope:
    CharacterAccountScopeSnapshot
): Promise<CharacterCloudEnvelope> {
  const uid =
    assertAuthenticatedScope(
      scope
    );

  assertCharacterLocalStateBundleIntegrity(
    bundle,
    'local-upload'
  );

  const reference =
    firestore()
      .collection(
        'users'
      )
      .doc(
        uid
      );

  const envelope:
    CharacterCloudEnvelope = {
    version: 1,
    ownerUid:
      uid,
    scopeId:
      scope.scopeId,
    updatedAt:
      new Date()
        .toISOString(),
    bundle,
  };

  await firestore()
    .runTransaction(
      async (
        transaction
      ) => {
        const snapshot =
          await transaction.get(
            reference
          );

        const raw =
          snapshot.data()
            ?.[CLOUD_FIELD];

        const actualUpdatedAt =
          (
            raw &&
            typeof raw ===
              'object' &&
            !Array.isArray(
              raw
            ) &&
            typeof (
              raw as
                Record<
                  string,
                  unknown
                >
            ).updatedAt ===
              'string'
          )
            ? (
                raw as
                  Record<
                    string,
                    unknown
                  >
              ).updatedAt as string
            : null;

        if (
          actualUpdatedAt !==
          expectedUpdatedAt
        ) {
          throw new Error(
            'CHARACTER_CLOUD_CONFLICT_RETRY'
          );
        }

        transaction.set(
          reference,
          {
            [CLOUD_FIELD]:
              envelope,
            characterSystemUpdatedAt:
              envelope.updatedAt,
          },
          {
            merge: true,
          }
        );
      }
    );

  return envelope;
}

async function applyCloudEnvelopeToLocal(
  envelope:
    CharacterCloudEnvelope,
  scope:
    CharacterAccountScopeSnapshot
): Promise<void> {
  assertCharacterLocalStateBundleIntegrity(
    envelope.bundle,
    'cloud'
  );

  await writeScopedCharacterLocalBundle(
    envelope.bundle,
    scope
  );

  await writeCloudSyncMeta(
    scope,
    {
      version: 1,
      dirty: false,
      lastLocalMutationAt:
        null,
      lastCloudUpdatedAt:
        envelope.updatedAt,
      lastSyncAt:
        new Date()
          .toISOString(),
    }
  );

  emitScopedStorageRefresh(
    scope
  );
}

async function uploadDirtyLocalBundle(
  local:
    CharacterLocalStateBundle,
  cloud:
    CharacterCloudEnvelope | null,
  scope:
    CharacterAccountScopeSnapshot
): Promise<CharacterCloudSyncResult> {
  const envelope =
    await saveCharacterCloudEnvelopeIfUnchanged(
      local,
      cloud
        ?.updatedAt ??
      null,
      scope
    );

  await writeCloudSyncMeta(
    scope,
    {
      version: 1,
      dirty: false,
      lastLocalMutationAt:
        null,
      lastCloudUpdatedAt:
        envelope.updatedAt,
      lastSyncAt:
        new Date()
          .toISOString(),
    }
  );

  return 'uploaded';
}

// CHARACTER_V98C_CONFLICT_POLICY
async function reconcileCharacterCloud(
  scope:
    CharacterAccountScopeSnapshot
): Promise<CharacterCloudSyncResult> {
  await ensureCharacterScopedStorageReady(
    scope
  );

  if (
    scope.kind !==
      'user'
  ) {
    return 'guest-local-only';
  }

  const [
    local,
    meta,
    cloud,
  ] =
    await Promise.all([
      readScopedCharacterLocalBundle(
        scope
      ),
      readCloudSyncMeta(
        scope
      ),
      loadCharacterCloudEnvelope(
        scope
      ),
    ]);

  const localHasData =
    hasAnyData(
      local
    );

  if (
    cloud ===
    null
  ) {
    if (
      !localHasData
    ) {
      return 'empty';
    }

    return uploadDirtyLocalBundle(
      local,
      null,
      scope
    );
  }

  if (
    !localHasData
  ) {
    await applyCloudEnvelopeToLocal(
      cloud,
      scope
    );

    return 'downloaded';
  }

  // First cloud-aware bootstrap:
  // if a server bundle already exists, server wins rather than letting an
  // unknown/stale local install overwrite another device.
  if (
    meta ===
    null
  ) {
    await applyCloudEnvelopeToLocal(
      cloud,
      scope
    );

    return 'downloaded';
  }

  if (
    !meta.dirty
  ) {
    if (
      meta.lastCloudUpdatedAt !==
      cloud.updatedAt
    ) {
      await applyCloudEnvelopeToLocal(
        cloud,
        scope
      );

      return 'downloaded';
    }

    return 'idle';
  }

  const localMutationTime =
    parseIsoTime(
      meta.lastLocalMutationAt
    );

  const cloudTime =
    parseIsoTime(
      cloud.updatedAt
    );

  const cloudChangedSinceLastSync =
    meta.lastCloudUpdatedAt !==
    cloud.updatedAt;

  // Explicit last-writer-wins conflict policy.
  // If remote changed since the last known cloud version and is newer than
  // this device's local dirty mutation, remote wins.
  if (
    cloudChangedSinceLastSync &&
    cloudTime >
      localMutationTime
  ) {
    await applyCloudEnvelopeToLocal(
      cloud,
      scope
    );

    return 'downloaded';
  }

  return uploadDirtyLocalBundle(
    local,
    cloud,
    scope
  );
}

function enqueueCharacterCloudSync(
  scope:
    CharacterAccountScopeSnapshot
): Promise<CharacterCloudSyncResult> {
  const previous =
    cloudSyncQueues.get(
      scope.scopeId
    );

  if (
    previous
  ) {
    return previous;
  }

  const task =
    reconcileCharacterCloud(
      scope
    )
      .then(
        (
          result
        ) => {
          markCloudSyncSucceeded(
            scope
          );

          return result;
        }
      )
      .catch(
        async (
          error
        ) => {
          if (
            __DEV__
          ) {
            console.warn(
              '[CHARACTER V98] cloud sync failed',
              {
                scopeId:
                  scope.scopeId,
                error,
              }
            );
          }

          // CHARACTER_V98E_PERMANENT_ERROR_RETRY_GUARD
          if (
            isPermanentCharacterCloudSyncError(
              error
            )
          ) {
            clearRetryTimer(
              scope.scopeId
            );

            cloudPermanentErrors.set(
              scope.scopeId,
              getCharacterCloudErrorCode(
                error
              ) ??
              'CHARACTER_CLOUD_PERMANENT_ERROR'
            );
          }
          else {
            scheduleRetry(
              scope
            );
          }

          throw error;
        }
      )
      .finally(
        () => {
          if (
            cloudSyncQueues.get(
              scope.scopeId
            ) ===
            task
          ) {
            cloudSyncQueues.delete(
              scope.scopeId
            );
          }
        }
      );

  cloudSyncQueues.set(
    scope.scopeId,
    task
  );

  return task;
}

// CHARACTER_V98C_ACTIVE_CLOUD_SYNC
export function runCharacterCloudSync(
  scope:
    CharacterAccountScopeSnapshot =
      refreshCharacterAccountScope()
): Promise<CharacterCloudSyncResult> {
  return enqueueCharacterCloudSync(
    scope
  );
}

export function scheduleCharacterCloudSync(
  scope:
    CharacterAccountScopeSnapshot =
      refreshCharacterAccountScope()
): void {
  if (
    scope.kind !==
      'user'
  ) {
    return;
  }

  clearRetryTimer(
    scope.scopeId
  );

  const timer =
    setTimeout(
      () => {
        cloudRetryTimers.delete(
          scope.scopeId
        );

        void runCharacterCloudSync(
          scope
        );
      },
      700
    );

  cloudRetryTimers.set(
    scope.scopeId,
    timer
  );
}

// CHARACTER_V98C_EXPLICIT_GUEST_TO_USER_MIGRATION
export async function migrateGuestCharacterBundleToAuthenticatedUserIfEmpty(
  guestScope:
    CharacterAccountScopeSnapshot,
  userScope:
    CharacterAccountScopeSnapshot =
      refreshCharacterAccountScope()
): Promise<boolean> {
  if (
    guestScope.kind !==
      'guest' ||
    userScope.kind !==
      'user'
  ) {
    return false;
  }

  await ensureCharacterScopedStorageReady(
    userScope
  );

  const [
    userLocal,
    userCloud,
    guestBundle,
  ] =
    await Promise.all([
      readScopedCharacterLocalBundle(
        userScope
      ),
      loadCharacterCloudEnvelope(
        userScope
      ),
      readScopedCharacterLocalBundle(
        guestScope
      ),
    ]);

  if (
    hasAnyData(
      userLocal
    ) ||
    userCloud !==
      null ||
    !hasAnyData(
      guestBundle
    )
  ) {
    return false;
  }

  await writeScopedCharacterLocalBundle(
    guestBundle,
    userScope
  );

  await writeCloudSyncMeta(
    userScope,
    {
      version: 1,
      dirty: true,
      lastLocalMutationAt:
        new Date()
          .toISOString(),
      lastCloudUpdatedAt:
        null,
      lastSyncAt:
        null,
    }
  );

  emitScopedStorageRefresh(
    userScope
  );

  scheduleCharacterCloudSync(
    userScope
  );

  return true;
}

// CHARACTER_V98C_AUTH_SCOPE_BOOTSTRAP
subscribeCharacterAccountScope(
  (
    scope
  ) => {
    if (
      scope.kind !==
      'user' ||
    cloudBootstrapStarted.has(
      scope.scopeId
    )
  ) {
      return;
    }

    cloudBootstrapStarted.add(
      scope.scopeId
    );

    void runCharacterCloudSync(
      scope
    );
  }
);
// CHARACTER_V98D_CLOUD_DIAGNOSTICS_API
export type CharacterCloudDiagnosticsSnapshot = {
  scope:
    CharacterAccountScopeSnapshot;
  localHasData: boolean;
  localFieldCount: number;
  dirty: boolean;
  lastLocalMutationAt:
    string | null;
  lastCloudUpdatedAt:
    string | null;
  lastSyncAt:
    string | null;
  cloudExists: boolean;
  cloudUpdatedAt:
    string | null;
  cloudOwnerUid:
    string | null;
  cloudScopeId:
    string | null;
  retryAttempt: number;
  retryScheduled: boolean;
  syncInFlight: boolean;
  releaseSchemaVersion: number;
  releaseSchemaGuardActive: boolean;
  cloudReadError:
    string | null;
  permanentSyncError:
    string | null;
};

export async function getCharacterCloudDiagnosticsSnapshot():
  Promise<CharacterCloudDiagnosticsSnapshot> {
  const scope =
    refreshCharacterAccountScope();

  await ensureCharacterScopedStorageReady(
    scope
  );

  const [
    local,
    meta,
  ] =
    await Promise.all([
      readScopedCharacterLocalBundle(
        scope
      ),
      readCloudSyncMeta(
        scope
      ),
    ]);

  let cloud:
    CharacterCloudEnvelope | null =
    null;

  let cloudReadError:
    string | null =
    null;

  if (
    scope.kind ===
    'user'
  ) {
    try {
      cloud =
        await loadCharacterCloudEnvelope(
          scope
        );
    }
    catch (error) {
      if (
        __DEV__
      ) {
        console.warn(
          '[CHARACTER V98] diagnostics cloud read failed',
          error
        );
      }

      cloudReadError =
        getCharacterCloudErrorCode(
          error
        ) ??
        (
          error instanceof Error
            ? error.message
            : String(
                error
              )
        );
    }
  }

  const localFieldCount =
    Object.values(
      local
    ).filter(
      (
        value
      ) =>
        value !==
        null
    ).length;

  return {
    scope,
    localHasData:
      hasAnyData(
        local
      ),
    localFieldCount,
    dirty:
      meta
        ?.dirty ??
      false,
    lastLocalMutationAt:
      meta
        ?.lastLocalMutationAt ??
      null,
    lastCloudUpdatedAt:
      meta
        ?.lastCloudUpdatedAt ??
      null,
    lastSyncAt:
      meta
        ?.lastSyncAt ??
      null,
    cloudExists:
      cloud !==
      null,
    cloudUpdatedAt:
      cloud
        ?.updatedAt ??
      null,
    cloudOwnerUid:
      cloud
        ?.ownerUid ??
      null,
    cloudScopeId:
      cloud
        ?.scopeId ??
      null,
    retryAttempt:
      cloudRetryAttempts.get(
        scope.scopeId
      ) ??
      0,
    retryScheduled:
      cloudRetryTimers.has(
        scope.scopeId
      ),
    syncInFlight:
      cloudSyncQueues.has(
        scope.scopeId
      ),
    releaseSchemaVersion:
      CHARACTER_CLOUD_SCHEMA_VERSION,
    releaseSchemaGuardActive:
      true,
    cloudReadError,
    permanentSyncError:
      cloudPermanentErrors.get(
        scope.scopeId
      ) ??
      null,
  };
}

// CHARACTER_V98D_MANUAL_CLOUD_RETRY
export async function retryCharacterCloudSyncNow():
  Promise<CharacterCloudSyncResult> {
  const scope =
    refreshCharacterAccountScope();

  clearRetryTimer(
    scope.scopeId
  );

  return runCharacterCloudSync(
    scope
  );
}
