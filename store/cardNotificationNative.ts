import {
    NativeModules,
    Platform,
} from 'react-native';

export type NativeCardNotification = {
  id: string;
  packageName: string;
  title: string;
  text: string;
  postedAt: number;
  receivedAt: number;
  fingerprint: string;
};

type RootCardNotificationModuleType = {
  openNotificationAccessSettings:
    () => void;

  hasNotificationAccess:
    () => Promise<boolean>;

  getPendingNotifications:
    () => Promise<string>;

  removePendingNotification:
    (
      fingerprint: string
    ) => Promise<boolean>;

  clearPendingNotifications:
    () => Promise<boolean>;
};

const nativeModule =
  NativeModules
    .RootCardNotificationModule as
    | RootCardNotificationModuleType
    | undefined;

export const isCardNotificationSupported =
  Platform.OS === 'android';

function requireCardModule():
  RootCardNotificationModuleType {
  if (
    Platform.OS !== 'android'
  ) {
    throw new Error(
      '카드 결제 알림 자동 입력은 Android에서만 사용할 수 있습니다.'
    );
  }

  if (!nativeModule) {
    throw new Error(
      'RootCardNotificationModule을 찾을 수 없습니다. 네이티브 코드를 추가한 뒤 development build를 다시 설치해 주세요.'
    );
  }

  return nativeModule;
}

export function openCardNotificationSettings() {
  requireCardModule()
    .openNotificationAccessSettings();
}

export async function hasCardNotificationAccess():
  Promise<boolean> {
  if (
    Platform.OS !== 'android' ||
    !nativeModule
  ) {
    return false;
  }

  try {
    return await nativeModule
      .hasNotificationAccess();
  } catch (
    error
  ) {
    console.warn(
      '카드 알림 접근 상태 확인 실패',
      error
    );

    return false;
  }
}

export async function getNativePendingCardNotifications():
  Promise<NativeCardNotification[]> {
  if (
    Platform.OS !== 'android' ||
    !nativeModule
  ) {
    return [];
  }

  try {
    const raw =
      await nativeModule
        .getPendingNotifications();

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (
    error
  ) {
    console.warn(
      '카드 결제 알림 읽기 실패',
      error
    );

    return [];
  }
}

export async function removeNativePendingCardNotification(
  fingerprint: string
) {
  if (!nativeModule) {
    return;
  }

  try {
    await nativeModule
      .removePendingNotification(
        fingerprint
      );
  } catch (
    error
  ) {
    console.warn(
      '카드 결제 알림 삭제 실패',
      error
    );
  }
}

export async function clearNativePendingCardNotifications() {
  if (!nativeModule) {
    return;
  }

  try {
    await nativeModule
      .clearPendingNotifications();
  } catch (
    error
  ) {
    console.warn(
      '카드 결제 알림 전체 삭제 실패',
      error
    );
  }
}