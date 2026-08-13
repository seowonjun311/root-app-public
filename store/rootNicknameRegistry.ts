// ROOT_EXPLORE_V12D91_NICKNAME_REGISTRY_FOUNDATION
export const ROOT_NICKNAME_REGISTRY_COLLECTION =
  'rootNicknames';
export const ROOT_NICKNAME_REGISTRY_VERSION = 1;
export const ROOT_NICKNAME_REGISTRY_ACTIVATION =
  'V1.2D92_AFTER_RULES_RELEASE';

const SAFE_NICKNAME = /^[0-9A-Za-z가-힣_]{2,12}$/u;

export const normalizeRootNicknameForRegistry = (
  nickname: string,
): string =>
  String(nickname ?? '')
    .normalize('NFKC')
    .trim();

export const getRootNicknameRegistryDocumentId = (
  nickname: string,
): string => {
  const value =
    normalizeRootNicknameForRegistry(nickname);

  if (!SAFE_NICKNAME.test(value)) {
    throw new Error(
      'ROOT_NICKNAME_REGISTRY_UNSAFE_NICKNAME',
    );
  }

  return value;
};

export const buildRootNicknameRegistryRecord = (
  uid: string,
  nickname: string,
  updatedAt = new Date().toISOString(),
) => {
  const clean = String(uid ?? '').trim();

  if (!clean) {
    throw new Error(
      'ROOT_NICKNAME_REGISTRY_UID_REQUIRED',
    );
  }

  const safeNickname =
    getRootNicknameRegistryDocumentId(
      nickname,
    );

  return {
    version: 1 as const,
    uid: clean,
    nickname: safeNickname,
    updatedAt,
  };
};
