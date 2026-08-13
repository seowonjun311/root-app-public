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
// CHARACTER_V98A_ACCOUNT_SCOPE_IDENTITY
// ROOT_EXPLORE_V12D91A_CHARACTER_GUEST_PRECEDENCE
export function getCharacterAccountScopeSnapshot():
  CharacterAccountScopeSnapshot {
  const rootData =
    getRootOnboardingData();

  const rootIsGuest =
    rootData?.loginType ===
      'guest' ||
    rootData?.isGuest ===
      true;

  if (rootIsGuest) {
    const guestId =
      normalizeIdentityPart(
        rootData?.guestId
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

  const guestId =
    normalizeIdentityPart(
      rootData?.guestId
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

// ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_CHARACTER_SCOPE
export function getAuthenticatedCharacterAccountScopeSnapshot(
  expectedUid?:
    string |
    null
): CharacterAccountScopeSnapshot {
  const activeUid =
    normalizeIdentityPart(
      auth()
        .currentUser
        ?.uid
    );

  const requestedUid =
    normalizeIdentityPart(
      expectedUid
    );

  const uid =
    requestedUid ??
    activeUid;

  if (
    uid ===
      null ||
    activeUid ===
      null ||
    uid !==
      activeUid
  ) {
    throw new Error(
      'CHARACTER_AUTHENTICATED_SCOPE_UID_MISMATCH'
    );
  }

  const scopeId =
    'uid_' +
    uid;

  return {
    kind:
      'user',
    scopeId,
    storagePrefix:
      STORAGE_NAMESPACE +
      ':' +
      scopeId,
    cloudUid:
      uid,
    guestId:
      null,
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
// CHARACTER_V98B_ACCOUNT_SCOPE_CHANGE_OBSERVER
type CharacterAccountScopeListener =
  (
    scope:
      CharacterAccountScopeSnapshot
  ) => void;

const characterAccountScopeListeners =
  new Set<
    CharacterAccountScopeListener
  >();

let observedScopeId:
  string | null =
  null;

let authObserverInstalled =
  false;

function emitCharacterAccountScope(
  scope:
    CharacterAccountScopeSnapshot
): void {
  characterAccountScopeListeners
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

export function refreshCharacterAccountScope():
  CharacterAccountScopeSnapshot {
  const scope =
    getCharacterAccountScopeSnapshot();

  if (
    observedScopeId !==
    scope.scopeId
  ) {
    observedScopeId =
      scope.scopeId;

    emitCharacterAccountScope(
      scope
    );

    if (
      __DEV__
    ) {
      console.log(
        '[CHARACTER V98] account scope changed',
        {
          kind:
            scope.kind,
          scopeId:
            scope.scopeId,
        }
      );
    }
  }

  return scope;
}

function ensureCharacterAccountAuthObserver():
  void {
  if (
    authObserverInstalled
  ) {
    return;
  }

  authObserverInstalled =
    true;

  auth()
    .onAuthStateChanged(
      () => {
        refreshCharacterAccountScope();
      }
    );
}

export function subscribeCharacterAccountScope(
  listener:
    CharacterAccountScopeListener
): () => void {
  ensureCharacterAccountAuthObserver();

  characterAccountScopeListeners
    .add(
      listener
    );

  return () => {
    characterAccountScopeListeners
      .delete(
        listener
      );
  };
}
