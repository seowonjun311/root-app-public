import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

import {
  getCharacterAccountScopeSnapshot,
  getCharacterScopedStorageKey,
  type CharacterAccountScopeSnapshot,
} from './characterAccountScope';

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

  const bundle =
    normalizeBundle(
      record.bundle
    );

  if (
    bundle === null
  ) {
    return null;
  }

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
