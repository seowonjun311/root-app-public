import AsyncStorage from '@react-native-async-storage/async-storage';

export type RootyState = {
  mood: number;
  energy: number;
  affection: number;
};

type RootyStateSnapshot = RootyState & {
  version: 1;
  savedAt: number;
};

export const ROOTY_STATE_KEY =
  'rooty_state_v1';

const ROOTY_STATE_VERSION = 1 as const;

export const ROOTY_DEFAULT_STATE: RootyState = {
  mood: 70,
  energy: 80,
  affection: 50,
};

function clampRootyStateValue(
  value: number
) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

function isFiniteRootyStateValue(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

function normalizeRootyStateSnapshot(
  value: unknown
): RootyStateSnapshot | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  const candidate =
    value as Partial<RootyStateSnapshot>;

  if (
    candidate.version !==
      ROOTY_STATE_VERSION
  ) {
    return null;
  }

  if (
    !isFiniteRootyStateValue(
      candidate.mood
    ) ||
    !isFiniteRootyStateValue(
      candidate.energy
    ) ||
    !isFiniteRootyStateValue(
      candidate.affection
    ) ||
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
      ROOTY_STATE_VERSION,
    mood:
      clampRootyStateValue(
        candidate.mood
      ),
    energy:
      clampRootyStateValue(
        candidate.energy
      ),
    affection:
      clampRootyStateValue(
        candidate.affection
      ),
    savedAt:
      candidate.savedAt,
  };
}

export async function loadRootyState():
  Promise<RootyState | null> {
  try {
    const raw =
      await AsyncStorage.getItem(
        ROOTY_STATE_KEY
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
        ROOTY_STATE_KEY
      );

      return null;
    }

    const normalized =
      normalizeRootyStateSnapshot(
        parsed
      );

    if (!normalized) {
      await AsyncStorage.removeItem(
        ROOTY_STATE_KEY
      );

      return null;
    }

    return {
      mood:
        normalized.mood,
      energy:
        normalized.energy,
      affection:
        normalized.affection,
    };
  } catch (error) {
    console.log(
      'ROOTY STATE LOAD ERROR',
      error
    );

    return null;
  }
}

// ROOTY_BEHAVIOR_V54_SERIALIZED_STATE_PERSISTENCE
let rootyStateSaveQueue:
  Promise<void> =
    Promise.resolve();

function createRootyStateSnapshot(
  state: RootyState
): RootyStateSnapshot {
  return {
    version:
      ROOTY_STATE_VERSION,
    mood:
      clampRootyStateValue(
        state.mood
      ),
    energy:
      clampRootyStateValue(
        state.energy
      ),
    affection:
      clampRootyStateValue(
        state.affection
      ),
    savedAt:
      Date.now(),
  };
}

async function writeRootyStateSnapshot(
  snapshot: RootyStateSnapshot
) {
  try {
    await AsyncStorage.setItem(
      ROOTY_STATE_KEY,
      JSON.stringify(
        snapshot
      )
    );
  } catch (error) {
    console.log(
      'ROOTY STATE SAVE ERROR',
      error
    );
  }
}

export function saveRootyState(
  state: RootyState
): Promise<void> {
  const snapshot =
    createRootyStateSnapshot(
      state
    );

  rootyStateSaveQueue =
    rootyStateSaveQueue
      .catch(() => undefined)
      .then(() =>
        writeRootyStateSnapshot(
          snapshot
        )
      );

  return rootyStateSaveQueue;
}