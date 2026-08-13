// ROOT_EXPLORE_V12D91_GUEST_LOCAL_ONLY_BOUNDARY
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getRootOnboardingData } from './rootMemory';

const cleanUid = (value: unknown): string | null => {
  const v = String(value ?? '').trim();
  return v ? v : null;
};

export const getRootCloudSessionSnapshot = () => {
  const local = getRootOnboardingData() as any;
  const loginType =
    typeof local?.loginType === 'string'
      ? local.loginType
      : null;
  const isGuest =
    loginType === 'guest' ||
    local?.isGuest === true;
  const localUid = cleanUid(local?.uid);
  const authUid = cleanUid(
    getAuth(getApp()).currentUser?.uid,
  );

  return {
    loginType,
    isGuest,
    localUid,
    authUid,
    cloudUid: isGuest
      ? null
      : (authUid ?? localUid),
  };
};

export const getRootCloudUidOrNull = (): string | null =>
  getRootCloudSessionSnapshot().cloudUid;

export const isRootGuestLocalOnlySession = (): boolean =>
  getRootCloudSessionSnapshot().isGuest;
