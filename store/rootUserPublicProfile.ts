// ROOT_EXPLORE_V12D5_PUBLIC_USER_PROJECTION_FOUNDATION
// ROOT_EXPLORE_V12D7_PUBLIC_PROFILE_SOURCE_NORMALIZATION

export const ROOT_USER_PUBLIC_PROFILE_COLLECTION =
  'rootUserPublicProfiles' as const;

export const ROOT_USER_PUBLIC_PROFILE_VERSION =
  1 as const;

export type RootUserPublicProfile = {
  version: 1;
  uid: string;
  displayName: string | null;
  nickname: string | null;
  photoURL: string | null;
  representativeBadgeId: string | null;
  updatedAt: string;
};

type UnknownRecord =
  Record<
    string,
    unknown
  >;

const asRecord = (
  value: unknown,
): UnknownRecord => {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    )
  ) {
    return {};
  }

  return value as
    UnknownRecord;
};

const asNullableTrimmedString = (
  value: unknown,
): string | null => {
  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed
    ? trimmed
    : null;
};

const pickFirstNullableString = (
  sources: readonly UnknownRecord[],
  keys: readonly string[],
): string | null => {
  for (
    const source of
    sources
  ) {
    for (
      const key of
      keys
    ) {
      const value =
        asNullableTrimmedString(
          source[key],
        );

      if (
        value
      ) {
        return value;
      }
    }
  }

  return null;
};

export const buildRootUserPublicProfile = (
  uid: string,
  source: UnknownRecord,
  updatedAt: string,
): RootUserPublicProfile => {
  const normalizedUid =
    String(
      uid ?? '',
    ).trim();

  if (
    !normalizedUid
  ) {
    throw new Error(
      'ROOT public profile requires uid.',
    );
  }

  const normalizedUpdatedAt =
    String(
      updatedAt ?? '',
    ).trim();

  if (
    !normalizedUpdatedAt
  ) {
    throw new Error(
      'ROOT public profile requires updatedAt.',
    );
  }

  const rootData =
    asRecord(
      source.rootData,
    );

  const sources =
    [
      source,
      rootData,
    ] as const;

  return {
    version:
      ROOT_USER_PUBLIC_PROFILE_VERSION,
    uid:
      normalizedUid,
    displayName:
      pickFirstNullableString(
        sources,
        [
          'displayName',
          'name',
        ],
      ),
    nickname:
      pickFirstNullableString(
        sources,
        [
          'nickname',
          'nickName',
        ],
      ),
    photoURL:
      pickFirstNullableString(
        sources,
        [
          'photoURL',
          'photoUrl',
          'profileImageUrl',
          'profileImageURL',
        ],
      ),
    representativeBadgeId:
      pickFirstNullableString(
        sources,
        [
          'representativeBadgeId',
          'selectedBadgeId',
          'mainBadgeId',
          'badgeMainBadgeId',
        ],
      ),
    updatedAt:
      normalizedUpdatedAt,
  };
};

export const ROOT_USER_PUBLIC_PROFILE_ALLOWED_FIELDS =
  [
    'version',
    'uid',
    'displayName',
    'nickname',
    'photoURL',
    'representativeBadgeId',
    'updatedAt',
  ] as const;
