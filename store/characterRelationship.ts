import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  getCharacterRelationshipTier,
  type CharacterRelationshipTier,
} from './characterRelationshipPolicy';

// CHARACTER_V96A_PER_CHARACTER_RELATIONSHIP_STORE
const STORAGE_KEY =
  'character_relationship_v1';

export const CHARACTER_RELATIONSHIP_STORAGE_VERSION =
  1;

export const CHARACTER_RELATIONSHIP_MAX_POINTS =
  100;

export type CharacterRelationshipInteraction =
  | 'tap'
  | 'longPress';

export type CharacterRelationshipRecord = {
  points: number;
  tapCount: number;
  longPressCount: number;
  lastInteractionAt:
    number | null;
  legacySeeded: boolean;
};

export type CharacterRelationshipSnapshot =
  CharacterRelationshipRecord & {
    tier:
      CharacterRelationshipTier;
  };

export type CharacterRelationshipMap =
  Record<
    CharacterId,
    CharacterRelationshipRecord
  >;

type Listener =
  () => void;

const listeners =
  new Set<Listener>();

function emptyRecord():
  CharacterRelationshipRecord {
  return {
    points: 0,
    tapCount: 0,
    longPressCount: 0,
    lastInteractionAt: null,
    legacySeeded: false,
  };
}

function createEmptyMap():
  CharacterRelationshipMap {
  return {
    rooty:
      emptyRecord(),
    moru:
      emptyRecord(),
    mongsil:
      emptyRecord(),
    dami:
      emptyRecord(),
    pio:
      emptyRecord(),
    nuri:
      emptyRecord(),
    tori:
      emptyRecord(),
  };
}

function clampPoints(
  value: unknown
): number {
  if (
    typeof value !==
      'number' ||
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      CHARACTER_RELATIONSHIP_MAX_POINTS,
      Math.round(
        value
      )
    )
  );
}

function normalizeCount(
  value: unknown
): number {
  if (
    typeof value !==
      'number' ||
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return 0;
  }

  return Math.floor(
    value
  );
}

function normalizeTimestamp(
  value: unknown
): number | null {
  if (
    typeof value !==
      'number' ||
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return null;
  }

  return Math.floor(
    value
  );
}

function normalizeRecord(
  value: unknown
): CharacterRelationshipRecord {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return emptyRecord();
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  return {
    points:
      clampPoints(
        record.points
      ),
    tapCount:
      normalizeCount(
        record.tapCount
      ),
    longPressCount:
      normalizeCount(
        record.longPressCount
      ),
    lastInteractionAt:
      normalizeTimestamp(
        record.lastInteractionAt
      ),
    legacySeeded:
      record.legacySeeded ===
      true,
  };
}

function normalizeMap(
  value: unknown
): CharacterRelationshipMap {
  const empty =
    createEmptyMap();

  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return empty;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  return {
    rooty:
      normalizeRecord(
        record.rooty
      ),
    moru:
      normalizeRecord(
        record.moru
      ),
    mongsil:
      normalizeRecord(
        record.mongsil
      ),
    dami:
      normalizeRecord(
        record.dami
      ),
    pio:
      normalizeRecord(
        record.pio
      ),
    nuri:
      normalizeRecord(
        record.nuri
      ),
    tori:
      normalizeRecord(
        record.tori
      ),
  };
}

function cloneRecord(
  value:
    CharacterRelationshipRecord
): CharacterRelationshipRecord {
  return {
    ...value,
  };
}

function cloneMap(
  value:
    CharacterRelationshipMap
): CharacterRelationshipMap {
  return {
    rooty:
      cloneRecord(
        value.rooty
      ),
    moru:
      cloneRecord(
        value.moru
      ),
    mongsil:
      cloneRecord(
        value.mongsil
      ),
    dami:
      cloneRecord(
        value.dami
      ),
    pio:
      cloneRecord(
        value.pio
      ),
    nuri:
      cloneRecord(
        value.nuri
      ),
    tori:
      cloneRecord(
        value.tori
      ),
  };
}

let cached:
  CharacterRelationshipMap =
  createEmptyMap();

let loaded =
  false;

let loadPromise:
  Promise<CharacterRelationshipMap> | null =
  null;

let writeQueue:
  Promise<void> =
  Promise.resolve();

function emit(): void {
  listeners.forEach(
    (listener) => {
      listener();
    }
  );
}

// CHARACTER_V96A_RELATIONSHIP_PERSISTENCE
export async function loadCharacterRelationships():
  Promise<CharacterRelationshipMap> {
  if (
    loaded
  ) {
    return cloneMap(
      cached
    );
  }

  if (
    loadPromise
  ) {
    return loadPromise;
  }

  loadPromise =
    (async () => {
      let next =
        createEmptyMap();

      try {
        const raw =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (
          raw !== null
        ) {
          next =
            normalizeMap(
              JSON.parse(
                raw
              )
            );
        }
      }
      catch (error) {
        if (
          __DEV__
        ) {
          console.warn(
            '[CHARACTER V96] relationship load failed',
            error
          );
        }
      }

      cached =
        next;

      loaded =
        true;

      emit();

      return cloneMap(
        cached
      );
    })();

  try {
    return await loadPromise;
  }
  finally {
    loadPromise =
      null;
  }
}

function enqueueMutation(
  mutate:
    (
      next:
        CharacterRelationshipMap
    ) => void
): void {
  writeQueue =
    writeQueue
      .then(
        async () => {
          await loadCharacterRelationships();

          const next =
            cloneMap(
              cached
            );

          mutate(
            next
          );

          cached =
            next;

          emit();

          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
              next
            )
          );
        }
      )
      .catch(
        (error) => {
          if (
            __DEV__
          ) {
            console.warn(
              '[CHARACTER V96] relationship write failed',
              error
            );
          }
        }
      );
}

// CHARACTER_V96A_RELATIONSHIP_SYNC_SNAPSHOT
export function getCharacterRelationshipSnapshot(
  characterId: CharacterId
): CharacterRelationshipSnapshot {
  const record =
    cloneRecord(
      cached[
        characterId
      ]
    );

  return {
    ...record,
    tier:
      getCharacterRelationshipTier(
        record.points
      ),
  };
}

export function isCharacterRelationshipReady():
  boolean {
  return loaded;
}

export function subscribeCharacterRelationships(
  listener: Listener
): () => void {
  listeners.add(
    listener
  );

  return () => {
    listeners.delete(
      listener
    );
  };
}

function addPoints(
  current: number,
  delta: number
): number {
  if (
    !Number.isFinite(
      delta
    )
  ) {
    return current;
  }

  return clampPoints(
    current +
      delta
  );
}

// CHARACTER_V96A_RELATIONSHIP_INTERACTION_POLICY
// V96A defines the durable accounting contract only.
// V96B will connect these calls to the existing Home short/long press paths.
export function recordCharacterRelationshipInteraction(
  characterId: CharacterId,
  interaction:
    CharacterRelationshipInteraction
): void {
  const points =
    interaction ===
      'longPress'
      ? 2
      : 1;

  enqueueMutation(
    (next) => {
      const current =
        next[
          characterId
        ];

      next[
        characterId
      ] = {
        ...current,
        points:
          addPoints(
            current.points,
            points
          ),
        tapCount:
          current.tapCount +
          (
            interaction ===
              'tap'
              ? 1
              : 0
          ),
        longPressCount:
          current.longPressCount +
          (
            interaction ===
              'longPress'
              ? 1
              : 0
          ),
        lastInteractionAt:
          Date.now(),
      };
    }
  );
}

// CHARACTER_V96A_LEGACY_AFFECTION_SEED
// This does not run automatically in V96A.
// V96B can use it once for Rooty so the original V54/V59 relationship
// progress is not lost when per-character relationship becomes active.
export function seedCharacterRelationshipFromLegacyAffection(
  characterId: CharacterId,
  legacyAffection: number
): void {
  enqueueMutation(
    (next) => {
      const current =
        next[
          characterId
        ];

      if (
        current.legacySeeded ||
        current.points > 0 ||
        current.tapCount > 0 ||
        current.longPressCount > 0
      ) {
        return;
      }

      next[
        characterId
      ] = {
        ...current,
        points:
          clampPoints(
            legacyAffection
          ),
        legacySeeded:
          true,
      };
    }
  );
}
