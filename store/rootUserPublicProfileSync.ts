// ROOT_EXPLORE_V12D6_PUBLIC_PROFILE_SYNC_ADAPTER
// ROOT_EXPLORE_V12D7_STAGE_A_LIVE_DUAL_WRITE

import {
  getAuth,
} from '@react-native-firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  buildRootUserPublicProfile,
  ROOT_USER_PUBLIC_PROFILE_COLLECTION,
  type RootUserPublicProfile,
} from './rootUserPublicProfile';

export type RootUserPublicProfileSyncResult = {
  ok: boolean;
  reason:
    | 'synced'
    | 'missing_private_user'
    | 'not_authenticated'
    | 'uid_mismatch'
    | 'write_denied_or_failed';
  profile?: RootUserPublicProfile;
  errorMessage?: string;
};

const PUBLIC_PROFILE_SOURCE_KEYS =
  new Set([
    'displayName',
    'name',
    'nickname',
    'nickName',
    'photoURL',
    'photoUrl',
    'profileImageUrl',
    'profileImageURL',
    'representativeBadgeId',
    'selectedBadgeId',
    'mainBadgeId',
    'badgeMainBadgeId',
  ]);

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  Boolean(
    value,
  ) &&
  typeof value ===
    'object' &&
  !Array.isArray(
    value,
  );

const hasPublicProfileSourceKey = (
  source: Record<string, unknown>,
): boolean =>
  Object.keys(
    source,
  ).some(
    (
      key,
    ) =>
      PUBLIC_PROFILE_SOURCE_KEYS.has(
        key,
      ),
  );

export const shouldSyncRootUserPublicProfileFromMerge = (
  data: Record<string, unknown>,
): boolean => {
  if (
    hasPublicProfileSourceKey(
      data,
    )
  ) {
    return true;
  }

  const rootData =
    data.rootData;

  return isRecord(
    rootData,
  )
    ? hasPublicProfileSourceKey(
        rootData,
      )
    : false;
};

const getCurrentUid = (): string | null =>
  getAuth()
    .currentUser
    ?.uid ??
  null;

const normalizeUid = (
  uid: string,
): string =>
  String(
    uid ?? '',
  ).trim();

export const readRootUserPublicProfile = async (
  uid: string,
): Promise<RootUserPublicProfile | null> => {
  const normalizedUid =
    normalizeUid(
      uid,
    );

  if (
    !normalizedUid
  ) {
    return null;
  }

  const snapshot =
    await getDoc(
      doc(
        getFirestore(),
        ROOT_USER_PUBLIC_PROFILE_COLLECTION,
        normalizedUid,
      ),
    );

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  return snapshot.data() as
    RootUserPublicProfile;
};

export const buildOwnRootUserPublicProfileFromPrivateDocument = async (
  uid: string,
): Promise<RootUserPublicProfileSyncResult> => {
  const normalizedUid =
    normalizeUid(
      uid,
    );

  const currentUid =
    getCurrentUid();

  if (
    !currentUid
  ) {
    return {
      ok: false,
      reason:
        'not_authenticated',
    };
  }

  if (
    currentUid !==
    normalizedUid
  ) {
    return {
      ok: false,
      reason:
        'uid_mismatch',
    };
  }

  const snapshot =
    await getDoc(
      doc(
        getFirestore(),
        'users',
        normalizedUid,
      ),
    );

  if (
    !snapshot.exists()
  ) {
    return {
      ok: false,
      reason:
        'missing_private_user',
    };
  }

  const profile =
    buildRootUserPublicProfile(
      normalizedUid,
      snapshot.data() as
        Record<
          string,
          unknown
        >,
      new Date()
        .toISOString(),
    );

  return {
    ok: true,
    reason:
      'synced',
    profile,
  };
};

export const syncOwnRootUserPublicProfileFromPrivateDocument = async (
  uid: string,
): Promise<RootUserPublicProfileSyncResult> => {
  const built =
    await buildOwnRootUserPublicProfileFromPrivateDocument(
      uid,
    );

  if (
    !built.ok ||
    !built.profile
  ) {
    return built;
  }

  try {
    await setDoc(
      doc(
        getFirestore(),
        ROOT_USER_PUBLIC_PROFILE_COLLECTION,
        built.profile.uid,
      ),
      built.profile,
      {
        merge: false,
      },
    );

    // ROOT_EXPLORE_V12D8_POST_SYNC_DEVICE_DIAGNOSTIC
    if (__DEV__) {
      try {
        const diagnostic =
          await runRootUserSelfOnlyDeviceDiagnostic(
            built.profile.uid,
            'post-public-profile-sync',
          );

        console.log(
          'ROOT USER SELF-ONLY DEVICE DIAGNOSTIC',
          diagnostic,
        );
      }
      catch (
        diagnosticError
      ) {
        console.log(
          'ROOT USER SELF-ONLY DEVICE DIAGNOSTIC ERROR',
          {
            message:
              diagnosticError instanceof Error
                ? diagnosticError.message
                : String(
                    diagnosticError,
                  ),
          },
        );
      }
    }

    return built;
  }
  catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : String(
            error,
          );

    return {
      ok: false,
      reason:
        'write_denied_or_failed',
      profile:
        built.profile,
      errorMessage:
        message,
    };
  }
};

export const bestEffortSyncOwnRootUserPublicProfile = async (
  uid: string,
): Promise<RootUserPublicProfileSyncResult> => {
  try {
    return await syncOwnRootUserPublicProfileFromPrivateDocument(
      uid,
    );
  }
  catch (
    error
  ) {
    return {
      ok: false,
      reason:
        'write_denied_or_failed',
      errorMessage:
        error instanceof Error
          ? error.message
          : String(
              error,
            ),
    };
  }
};

// V1.2D6 activation target was V1.2D7_AFTER_STAGE_A_RELEASE.
// ROOT_EXPLORE_V12D8_DEVICE_SELF_ONLY_DIAGNOSTICS
export type RootUserSelfOnlyDeviceDiagnostic = {
  ok: boolean;
  reason: string;
  authenticated: boolean;
  authMatchesRequestedUid: boolean;
  privateUserReadable: boolean;
  publicProfileReadable: boolean;
  publicProjectionMatchesPrivateSource: boolean;
  unexpectedPublicFieldCount: number;
};

const ROOT_USER_PUBLIC_PROFILE_DIAGNOSTIC_FIELDS =
  [
    'version',
    'uid',
    'displayName',
    'nickname',
    'photoURL',
    'representativeBadgeId',
    'updatedAt',
  ] as const;

export const runRootUserSelfOnlyDeviceDiagnostic = async (
  uid: string,
  reason: string,
): Promise<RootUserSelfOnlyDeviceDiagnostic> => {
  const requestedUid =
    String(
      uid ?? '',
    ).trim();

  const authUid =
    getAuth()
      .currentUser
      ?.uid ??
    null;

  if (!authUid) {
    return {
      ok: false,
      reason,
      authenticated: false,
      authMatchesRequestedUid: false,
      privateUserReadable: false,
      publicProfileReadable: false,
      publicProjectionMatchesPrivateSource: false,
      unexpectedPublicFieldCount: 0,
    };
  }

  if (
    String(
      authUid,
    ) !==
    requestedUid
  ) {
    return {
      ok: false,
      reason,
      authenticated: true,
      authMatchesRequestedUid: false,
      privateUserReadable: false,
      publicProfileReadable: false,
      publicProjectionMatchesPrivateSource: false,
      unexpectedPublicFieldCount: 0,
    };
  }

  const privateSnapshot =
    await getDoc(
      doc(
        getFirestore(),
        'users',
        requestedUid,
      ),
    );

  const privateUserReadable =
    privateSnapshot.exists();

  const publicProfile =
    await readRootUserPublicProfile(
      requestedUid,
    );

  const publicProfileReadable =
    Boolean(
      publicProfile,
    );

  let publicProjectionMatchesPrivateSource =
    false;

  let unexpectedPublicFieldCount =
    0;

  if (
    privateUserReadable &&
    publicProfile
  ) {
    const expected =
      buildRootUserPublicProfile(
        requestedUid,
        privateSnapshot.data() as
          Record<
            string,
            unknown
          >,
        publicProfile.updatedAt,
      );

    publicProjectionMatchesPrivateSource =
      expected.version ===
        publicProfile.version &&
      expected.uid ===
        publicProfile.uid &&
      expected.displayName ===
        publicProfile.displayName &&
      expected.nickname ===
        publicProfile.nickname &&
      expected.photoURL ===
        publicProfile.photoURL &&
      expected.representativeBadgeId ===
        publicProfile.representativeBadgeId;

    const allowed =
      new Set<string>(
        ROOT_USER_PUBLIC_PROFILE_DIAGNOSTIC_FIELDS,
      );

    unexpectedPublicFieldCount =
      Object.keys(
        publicProfile as
          Record<
            string,
            unknown
          >,
      ).filter(
        (
          key,
        ) =>
          !allowed.has(
            key,
          ),
      ).length;
  }

  return {
    ok:
      privateUserReadable &&
      publicProfileReadable &&
      publicProjectionMatchesPrivateSource &&
      unexpectedPublicFieldCount ===
        0,
    reason,
    authenticated: true,
    authMatchesRequestedUid: true,
    privateUserReadable,
    publicProfileReadable,
    publicProjectionMatchesPrivateSource,
    unexpectedPublicFieldCount,
  };
};

export const ROOT_USER_PUBLIC_PROFILE_SYNC_ACTIVATION =
  'V1.2D7_STAGE_A_LIVE' as const;
