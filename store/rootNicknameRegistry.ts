// ROOT_EXPLORE_V12D91_NICKNAME_REGISTRY_FOUNDATION
// ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_ACTIVE_RUNTIME
// ROOT_EXPLORE_V12D92_LEGACY_COMPATIBLE_REGISTRY_IDS

import {
  getApp,
} from '@react-native-firebase/app';
import {
  doc,
  getFirestore,
  runTransaction,
} from '@react-native-firebase/firestore';

import {
  getRootCloudUidOrNull,
} from './rootCloudSession';
import {
  buildRootUserPublicProfile,
} from './rootUserPublicProfile';

export const ROOT_NICKNAME_REGISTRY_COLLECTION =
  'rootNicknames';

export const ROOT_NICKNAME_REGISTRY_VERSION =
  1 as const;

export const ROOT_NICKNAME_REGISTRY_ACTIVATION =
  'V1.2D92_ACTIVE';

const NEW_NICKNAME_CLAIM =
  /^[0-9A-Za-z가-힣_]{2,12}$/u;

const RESERVED_FIRESTORE_DOCUMENT_ID =
  /^__.*__$/u;

const cleanUid = (
  value: unknown,
): string =>
  String(
    value ?? '',
  ).trim();

const snapshotExists = (
  snapshot: any,
): boolean =>
  typeof snapshot?.exists ===
    'function'
    ? Boolean(
        snapshot.exists(),
      )
    : Boolean(
        snapshot?.exists,
      );

export const normalizeRootNicknameForRegistry = (
  nickname: string,
): string =>
  String(
    nickname ?? '',
  )
    .normalize(
      'NFKC',
    )
    .trim();

const assertRootNicknameRegistryDocumentIdSafe = (
  nickname: string,
): string => {
  const value =
    normalizeRootNicknameForRegistry(
      nickname,
    );

  /*
   * D9.2 V1 incorrectly treated the app's NEW nickname allowlist as if it were
   * a historical data-migration requirement. Existing ROOT accounts may have
   * older Google/default display names that contain spaces or other Unicode.
   *
   * Registry IDs therefore use Firestore's real document-ID safety boundary,
   * while NEW nickname claims remain intentionally restricted below.
   */
  /*
   * Keep the runtime boundary conservatively below Firestore's 1,500-byte
   * document-ID limit without depending on extra encoding globals in Hermes.
   * 256 UTF-16 code units can occupy at most 1,024 UTF-8 bytes.
   */
  if (
    !value ||
    value.length >
      256 ||
    value.includes(
      '/',
    ) ||
    value ===
      '.' ||
    value ===
      '..' ||
    RESERVED_FIRESTORE_DOCUMENT_ID.test(
      value,
    )
  ) {
    throw new Error(
      'ROOT_NICKNAME_REGISTRY_UNSAFE_DOCUMENT_ID',
    );
  }

  return value;
};

export const getRootNicknameRegistryDocumentId = (
  nickname: string,
): string =>
  assertRootNicknameRegistryDocumentIdSafe(
    nickname,
  );

export const getRootNicknameClaimDocumentId = (
  nickname: string,
): string => {
  const value =
    assertRootNicknameRegistryDocumentIdSafe(
      nickname,
    );

  if (
    !NEW_NICKNAME_CLAIM.test(
      value,
    )
  ) {
    throw new Error(
      'ROOT_NICKNAME_CLAIM_UNSAFE_NICKNAME',
    );
  }

  return value;
};

export const buildRootNicknameRegistryRecord = (
  uid: string,
  nickname: string,
  updatedAt =
    new Date().toISOString(),
) => {
  const normalizedUid =
    cleanUid(
      uid,
    );

  if (!normalizedUid) {
    throw new Error(
      'ROOT_NICKNAME_REGISTRY_UID_REQUIRED',
    );
  }

  const registryNickname =
    getRootNicknameRegistryDocumentId(
      nickname,
    );

  return {
    version:
      ROOT_NICKNAME_REGISTRY_VERSION,
    uid:
      normalizedUid,
    nickname:
      registryNickname,
    updatedAt,
  };
};

export type CommitRootNicknameInput = {
  uid: string;
  nickname: string;
  previousNickname?:
    | string
    | null;
  rootData:
    Record<
      string,
      any
    >;
};

export type CommitRootNicknameResult = {
  nickname: string;
  updatedAt: string;
  rootData:
    Record<
      string,
      any
    >;
};

export const commitRootNicknameForUid =
  async (
    input:
      CommitRootNicknameInput,
  ): Promise<
    CommitRootNicknameResult
  > => {
    const uid =
      cleanUid(
        input?.uid,
      );

    const cloudUid =
      getRootCloudUidOrNull();

    if (
      !uid ||
      !cloudUid ||
      cloudUid !== uid
    ) {
      throw new Error(
        'ROOT_NICKNAME_REGISTRY_AUTH_UID_MISMATCH',
      );
    }

    /*
     * NEW member claims keep ROOT's 2~12 Korean/English/number/underscore rule.
     * Only historical backfill / previous-name release uses the broader,
     * Firestore-safe registry ID boundary.
     */
    const nickname =
      getRootNicknameClaimDocumentId(
        input.nickname,
      );

    const previousNickname =
      (() => {
        if (
          !input
            .previousNickname
        ) {
          return null;
        }

        try {
          return getRootNicknameRegistryDocumentId(
            input.previousNickname,
          );
        }
        catch {
          return null;
        }
      })();

    const updatedAt =
      new Date()
        .toISOString();

    const rootData = {
      ...(
        input.rootData ??
        {}
      ),
      uid,
      nickname,
      loginType:
        'google',
      loginProvider:
        'google',
      isGuest:
        false,
      forceLogout:
        false,
      updatedAt,
    };

    const database =
      getFirestore(
        getApp(),
      );

    const nextReference =
      doc(
        database,
        ROOT_NICKNAME_REGISTRY_COLLECTION,
        nickname,
      );

    const previousReference =
      previousNickname &&
      previousNickname !==
        nickname
        ? doc(
            database,
            ROOT_NICKNAME_REGISTRY_COLLECTION,
            previousNickname,
          )
        : null;

    const userReference =
      doc(
        database,
        'users',
        uid,
      );

    const publicProfileReference =
      doc(
        database,
        'rootUserPublicProfiles',
        uid,
      );

    const registryRecord =
      buildRootNicknameRegistryRecord(
        uid,
        nickname,
        updatedAt,
      );

    const publicProfile =
      buildRootUserPublicProfile(
        uid,
        {
          rootData,
        },
        updatedAt,
      );

    await runTransaction(
      database,
      async (
        transaction,
      ) => {
        /*
         * Firestore transactions require all reads before any write.
         */
        const nextSnapshot =
          await transaction.get(
            nextReference,
          );

        const previousSnapshot =
          previousReference
            ? await transaction.get(
                previousReference,
              )
            : null;

        if (
          snapshotExists(
            nextSnapshot,
          )
        ) {
          const ownerUid =
            cleanUid(
              nextSnapshot
                .data()
                ?.uid,
            );

          if (
            ownerUid !==
              uid
          ) {
            throw new Error(
              'ROOT_NICKNAME_TAKEN',
            );
          }
        }

        if (
          previousReference &&
          previousSnapshot &&
          snapshotExists(
            previousSnapshot,
          )
        ) {
          const previousOwner =
            cleanUid(
              previousSnapshot
                .data()
                ?.uid,
            );

          if (
            previousOwner ===
              uid
          ) {
            transaction.delete(
              previousReference,
            );
          }
        }

        transaction.set(
          nextReference,
          registryRecord,
        );

        transaction.set(
          userReference,
          {
            nickname,
            rootData,
            updatedAt,
          },
          {
            merge: true,
          },
        );

        transaction.set(
          publicProfileReference,
          publicProfile,
          {
            merge: true,
          },
        );
      },
    );

    return {
      nickname,
      updatedAt,
      rootData,
    };
  };
