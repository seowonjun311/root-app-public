import AsyncStorage from '@react-native-async-storage/async-storage';

import { ROOTY_RUNTIME_CONTINUITY } from '../constants/rootyRuntimeConfig';

import type {
  RootyAction,
} from '../constants/rootyAssets';

export type RootyDirection =
  | 'downRight'
  | 'downLeft'
  | 'upRight'
  | 'upLeft';

export type RootyRuntimeSnapshot = {
  version: 1;
  x: number;
  y: number;
  direction: RootyDirection;
  action: RootyAction;
  savedAt: number;
};

export type RootyRuntimeSaveInput = {
  x: number;
  y: number;
  direction: RootyDirection;
  action: RootyAction;
};

export const ROOTY_RUNTIME_STATE_KEY =
  'rooty_runtime_state_v1';

const ROOTY_RUNTIME_VERSION = 1 as const;

const ROOTY_MIN_X = 120;
const ROOTY_MAX_X = 1200;
const ROOTY_MIN_Y = 80;
const ROOTY_MAX_Y = 900;

const ROOTY_DIRECTIONS:
  readonly RootyDirection[] = [
    'downRight',
    'downLeft',
    'upRight',
    'upLeft',
  ];

const ROOTY_ACTIONS:
  readonly RootyAction[] = [
    'idle',
    'walk',
    'sit',
    'sleep',
    'happy',
    'touch',
  ];

function isRootyDirection(
  value: unknown
): value is RootyDirection {
  return (
    typeof value === 'string' &&
    ROOTY_DIRECTIONS.includes(
      value as RootyDirection
    )
  );
}

function isRootyAction(
  value: unknown
): value is RootyAction {
  return (
    typeof value === 'string' &&
    ROOTY_ACTIONS.includes(
      value as RootyAction
    )
  );
}

function isFiniteCoordinate(
  value: unknown,
  min: number,
  max: number
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function normalizeRootyRuntimeSnapshot(
  value: unknown
): RootyRuntimeSnapshot | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const candidate =
    value as Partial<RootyRuntimeSnapshot>;

  if (
    candidate.version !==
    ROOTY_RUNTIME_VERSION
  ) {
    return null;
  }

  if (
    !isFiniteCoordinate(
      candidate.x,
      ROOTY_MIN_X,
      ROOTY_MAX_X
    ) ||
    !isFiniteCoordinate(
      candidate.y,
      ROOTY_MIN_Y,
      ROOTY_MAX_Y
    )
  ) {
    return null;
  }

  if (
    !isRootyDirection(
      candidate.direction
    ) ||
    !isRootyAction(
      candidate.action
    )
  ) {
    return null;
  }

  if (
    typeof candidate.savedAt !==
      'number' ||
    !Number.isFinite(
      candidate.savedAt
    ) ||
    candidate.savedAt <= 0
  ) {
    return null;
  }

  return {
    version:
      ROOTY_RUNTIME_VERSION,
    x:
      candidate.x,
    y:
      candidate.y,
    direction:
      candidate.direction,
    action:
      candidate.action,
    savedAt:
      candidate.savedAt,
  };
}

export async function loadRootyRuntimeSnapshot():
  Promise<RootyRuntimeSnapshot | null> {
  try {
    const raw =
      await AsyncStorage.getItem(
        ROOTY_RUNTIME_STATE_KEY
      );

    if (!raw) {
      return null;
    }

    let parsed: unknown;

    try {
      parsed =
        JSON.parse(raw);
    } catch {
      await AsyncStorage.removeItem(
        ROOTY_RUNTIME_STATE_KEY
      );

      return null;
    }

    const normalized =
      normalizeRootyRuntimeSnapshot(
        parsed
      );

    if (!normalized) {
      await AsyncStorage.removeItem(
        ROOTY_RUNTIME_STATE_KEY
      );

      return null;
    }

    return normalized;
  } catch (error) {
    console.log(
      'ROOTY RUNTIME LOAD ERROR',
      error
    );

    return null;
  }
}

// ROOTY_BEHAVIOR_V17_SERIALIZED_RUNTIME_PERSISTENCE
let rootyRuntimeSaveQueue:
  Promise<void> =
    Promise.resolve();

function createRootyRuntimeSnapshot(
  input:
    RootyRuntimeSaveInput
): RootyRuntimeSnapshot {
  return {
    version:
      ROOTY_RUNTIME_VERSION,
    x:
      Math.max(
        ROOTY_MIN_X,
        Math.min(
          input.x,
          ROOTY_MAX_X
        )
      ),
    y:
      Math.max(
        ROOTY_MIN_Y,
        Math.min(
          input.y,
          ROOTY_MAX_Y
        )
      ),
    direction:
      input.direction,
    action:
      input.action,
    savedAt:
      Date.now(),
  };
}

async function writeRootyRuntimeSnapshot(
  snapshot:
    RootyRuntimeSnapshot
) {
  try {
    await AsyncStorage.setItem(
      ROOTY_RUNTIME_STATE_KEY,
      JSON.stringify(
        snapshot
      )
    );
  } catch (error) {
    console.log(
      'ROOTY RUNTIME SAVE ERROR',
      error
    );
  }
}

export function saveRootyRuntimeSnapshot(
  input:
    RootyRuntimeSaveInput
): Promise<void> {
  const snapshot =
    createRootyRuntimeSnapshot(
      input
    );

  const queuedWrite =
    rootyRuntimeSaveQueue.then(
      () =>
        writeRootyRuntimeSnapshot(
          snapshot
        )
    );

  rootyRuntimeSaveQueue =
    queuedWrite.catch(
      () => undefined
    );

  return queuedWrite;
}

export function resolveRootyResumeAction(
  snapshot: RootyRuntimeSnapshot,
  now = Date.now()
): RootyAction {
  const elapsedMs =
    Math.max(
      0,
      now -
        snapshot.savedAt
    );

  if (elapsedMs <=
    ROOTY_RUNTIME_CONTINUITY.shortResumeWindowMs) {
    if (
      snapshot.action ===
        'idle' ||
      snapshot.action ===
        'sit' ||
      snapshot.action ===
        'sleep'
    ) {
      return snapshot.action;
    }

    return 'idle';
  }

  if (
    elapsedMs <
    ROOTY_RUNTIME_CONTINUITY.mediumResumeWindowMs
  ) {
    const stableBucket =
      Math.floor(
        snapshot.savedAt /
          1000
      ) % 2;

    return stableBucket === 0
      ? 'idle'
      : 'sit';
  }

  return 'sleep';
}

export function getRootyResumeDelayMs(
  action: RootyAction
) {
  if (action === 'sleep') {
    return (
      ROOTY_RUNTIME_CONTINUITY.sleepResumeDelayMs
    );
  }

  if (action === 'sit') {
    return (
      ROOTY_RUNTIME_CONTINUITY.sitResumeDelayMs
    );
  }

  if (action === 'idle') {
    return (
      ROOTY_RUNTIME_CONTINUITY.idleResumeDelayMs
    );
  }

  return (
    ROOTY_RUNTIME_CONTINUITY.fallbackResumeDelayMs
  );
}
