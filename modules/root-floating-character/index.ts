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
  scale: number;
  autoMoveEnabled: boolean;
  goalSpeechEnabled: boolean;
  pendingGoalCount: number;
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
  setScale(
    scale: number
  ):
    Promise<number>;
  setAutoMoveEnabled(
    enabled: boolean
  ):
    Promise<boolean>;
  setGoalSnapshot(
    goalsJson: string
  ):
    Promise<number>;
  setGoalCompletionSnapshot(
    completionsJson: string
  ):
    Promise<number>;
  setLifestyleContextSnapshot(
    contextJson: string
  ):
    Promise<boolean>;
  setGoalSpeechEnabled(
    enabled: boolean
  ):
    Promise<boolean>;
  showGoalSpeechNow():
    Promise<boolean>;
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
// CHARACTER_V101C_FLOATING_MOTION_SCALE_JS_BRIDGE
// CHARACTER_V101E_GOAL_SPEECH_JS_BRIDGE
// CHARACTER_V101F_GOAL_COMPLETION_JS_BRIDGE
// CHARACTER_V101G_LIFESTYLE_JS_BRIDGE
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
      scale:
        1,
      autoMoveEnabled:
        true,
      goalSpeechEnabled:
        true,
      pendingGoalCount:
        0,
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

export async function setFloatingCharacterScale(
  scale: number
): Promise<number> {
  if (
    nativeModule ===
    null
  ) {
    return 1;
  }

  return nativeModule.setScale(
    scale
  );
}

export async function setFloatingCharacterAutoMoveEnabled(
  enabled: boolean
): Promise<boolean> {
  if (
    nativeModule ===
    null
  ) {
    return false;
  }

  return nativeModule.setAutoMoveEnabled(
    enabled
  );
}

export type FloatingCharacterGoalSnapshotItem = {
  id: string;
  title: string;
};

export async function setFloatingCharacterGoalSnapshot(
  goals:
    FloatingCharacterGoalSnapshotItem[]
): Promise<number> {
  if (
    nativeModule ===
    null
  ) {
    return 0;
  }

  return nativeModule.setGoalSnapshot(
    JSON.stringify(
      goals
    )
  );
}

export type FloatingCharacterGoalCompletionSnapshotItem = {
  id: string;
  title: string;
  dateKey: string;
};

export async function setFloatingCharacterGoalCompletionSnapshot(
  completions:
    FloatingCharacterGoalCompletionSnapshotItem[]
): Promise<number> {
  if (
    nativeModule ===
    null
  ) {
    return 0;
  }

  return nativeModule.setGoalCompletionSnapshot(
    JSON.stringify(
      completions
    )
  );
}

export type FloatingCharacterLifestyleContextSnapshot = {
  dateKey: string;
  pendingGoalCount?: number;
  completedGoalCount?: number;
  dueGoalCount?: number;
  todayExpense?: number;
  dailyBudget?: number;
  monthExpense?: number;
  monthBudget?: number;
};

export async function setFloatingCharacterLifestyleContextSnapshot(
  snapshot:
    FloatingCharacterLifestyleContextSnapshot
): Promise<boolean> {
  if (
    nativeModule ===
      null ||
    typeof nativeModule.setLifestyleContextSnapshot !==
      'function'
  ) {
    return false;
  }

  return nativeModule.setLifestyleContextSnapshot(
    JSON.stringify(
      snapshot
    )
  );
}

export async function setFloatingCharacterGoalSpeechEnabled(
  enabled: boolean
): Promise<boolean> {
  if (
    nativeModule ===
    null
  ) {
    return false;
  }

  return nativeModule.setGoalSpeechEnabled(
    enabled
  );
}

export async function showFloatingCharacterGoalSpeechNow():
  Promise<boolean> {
  if (
    nativeModule ===
    null
  ) {
    return false;
  }

  return nativeModule.showGoalSpeechNow();
}
