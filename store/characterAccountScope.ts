import auth from '@react-native-firebase/auth';

import {
  getRootOnboardingData,
} from './rootMemory';

export type CharacterAccountScopeKind =
  | 'user'
  | 'guest';

export type CharacterAccountScopeSnapshot = {
  kind:
    CharacterAccountScopeKind;
  scopeId: string;
  storagePrefix: string;
  cloudUid:
    string | null;
  guestId:
    string | null;
};

const STORAGE_NAMESPACE =
  'character_account_scope_v1';

function normalizeIdentityPart(
  value: unknown
): string | null {
  if (
    typeof value !==
      'string'
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  if (
    trimmed.length === 0
  ) {
    return null;
  }

  return trimmed.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );
}

// CHARACTER_V98A_ACCOUNT_SCOPE_IDENTITY
export function getCharacterAccountScopeSnapshot():
  CharacterAccountScopeSnapshot {
  const firebaseUid =
    normalizeIdentityPart(
      auth()
        .currentUser
        ?.uid
    );

  if (
    firebaseUid !==
    null
  ) {
    const scopeId =
      'uid_' +
      firebaseUid;

    return {
      kind:
        'user',
      scopeId,
      storagePrefix:
        STORAGE_NAMESPACE +
        ':' +
        scopeId,
      cloudUid:
        firebaseUid,
      guestId:
        null,
    };
  }

  const rootData =
    getRootOnboardingData();

  const guestId =
    normalizeIdentityPart(
      rootData
        ?.guestId
    ) ??
    'legacy_guest';

  const scopeId =
    'guest_' +
    guestId;

  return {
    kind:
      'guest',
    scopeId,
    storagePrefix:
      STORAGE_NAMESPACE +
      ':' +
      scopeId,
    cloudUid:
      null,
    guestId,
  };
}

// CHARACTER_V98A_SCOPED_STORAGE_KEY
export function getCharacterScopedStorageKey(
  baseKey: string,
  scope:
    CharacterAccountScopeSnapshot =
      getCharacterAccountScopeSnapshot()
): string {
  return (
    scope.storagePrefix +
    ':' +
    baseKey
  );
}
