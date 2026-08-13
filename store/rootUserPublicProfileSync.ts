// ROOT_EXPLORE_V12D6_PUBLIC_PROFILE_SYNC_ADAPTER
//
// Migration-safe adapter only.
// This file is intentionally NOT imported by existing runtime flows in V1.2D6.
// Stage A Security Rules are not deployed yet, so wiring client writes before
// Stage A release would create permission-denied traffic.

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

export const ROOT_USER_PUBLIC_PROFILE_SYNC_ACTIVATION =
  'V1.2D7_AFTER_STAGE_A_RELEASE' as const;
