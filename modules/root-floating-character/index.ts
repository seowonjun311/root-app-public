import {
  requireOptionalNativeModule,
} from 'expo-modules-core';
import {
  Platform,
} from 'react-native';

export type RootFloatingCharacterStatus = {
  supported: boolean;
  permissionGranted: boolean;
  running: boolean;
  characterId: string | null;
};

type RootFloatingCharacterNativeModule = {
  canDrawOverlays():
    Promise<boolean>;
  openOverlayPermissionSettings():
    Promise<void>;
  getStatus():
    Promise<RootFloatingCharacterStatus>;
  start(
    characterId: string
  ):
    Promise<boolean>;
  stop():
    Promise<void>;
  updateCharacter(
    characterId: string
  ):
    Promise<void>;
};

const nativeModule =
  Platform.OS ===
  'android'
    ? (
        requireOptionalNativeModule(
          'RootFloatingCharacter'
        ) as
          RootFloatingCharacterNativeModule |
          null
      )
    : null;

// CHARACTER_V101A_FLOATING_OVERLAY_JS_BRIDGE
export function isFloatingCharacterSupported():
  boolean {
  return (
    Platform.OS ===
      'android' &&
    nativeModule !==
      null
  );
}

export async function canDrawFloatingCharacter():
  Promise<boolean> {
  if (
    nativeModule ===
    null
  ) {
    return false;
  }

  return nativeModule.canDrawOverlays();
}

export async function openFloatingCharacterPermissionSettings():
  Promise<void> {
  if (
    nativeModule ===
    null
  ) {
    return;
  }

  await nativeModule.openOverlayPermissionSettings();
}

export async function getFloatingCharacterStatus():
  Promise<RootFloatingCharacterStatus> {
  if (
    nativeModule ===
    null
  ) {
    return {
      supported:
        false,
      permissionGranted:
        false,
      running:
        false,
      characterId:
        null,
    };
  }

  return nativeModule.getStatus();
}

export async function startFloatingCharacter(
  characterId: string
): Promise<boolean> {
  if (
    nativeModule ===
    null
  ) {
    return false;
  }

  return nativeModule.start(
    characterId
  );
}

export async function stopFloatingCharacter():
  Promise<void> {
  if (
    nativeModule ===
    null
  ) {
    return;
  }

  await nativeModule.stop();
}

export async function updateFloatingCharacter(
  characterId: string
): Promise<void> {
  if (
    nativeModule ===
    null
  ) {
    return;
  }

  await nativeModule.updateCharacter(
    characterId
  );
}
