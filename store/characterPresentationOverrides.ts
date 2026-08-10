import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  type CharacterId,
} from '../constants/characterAssets';

export type StandardCharacterId =
  Exclude<
    CharacterId,
    'rooty'
  >;

export type CharacterPresentationOverride = {
  scale: number;
  translateY: number;
};

const STORAGE_KEY =
  'character_presentation_overrides_v1';

export const CHARACTER_SCALE_MIN =
  0.7;

export const CHARACTER_SCALE_MAX =
  1.4;

export const CHARACTER_SCALE_STEP =
  0.05;

export const CHARACTER_TRANSLATE_Y_MIN =
  -40;

export const CHARACTER_TRANSLATE_Y_MAX =
  40;

export const CHARACTER_TRANSLATE_Y_STEP =
  2;

const STANDARD_IDS:
  readonly StandardCharacterId[] = [
  'moru',
  'mongsil',
  'dami',
];

const DEFAULT_OVERRIDE:
  CharacterPresentationOverride = {
  scale: 1,
  translateY: 0,
};

type OverrideMap =
  Record<
    StandardCharacterId,
    CharacterPresentationOverride
  >;

type Listener =
  (
    characterId:
      StandardCharacterId,
    value:
      CharacterPresentationOverride
  ) => void;

function createDefaultMap():
  OverrideMap {
  return {
    moru: {
      ...DEFAULT_OVERRIDE,
    },
    mongsil: {
      ...DEFAULT_OVERRIDE,
    },
    dami: {
      ...DEFAULT_OVERRIDE,
    },
  };
}

let cachedOverrides:
  OverrideMap =
  createDefaultMap();

let overridesReady =
  false;

let loadPromise:
  Promise<OverrideMap> | null =
  null;

const listeners =
  new Set<Listener>();

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function normalizeScale(
  value: unknown
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(
      value
    )
  ) {
    return 1;
  }

  return (
    Math.round(
      clamp(
        value,
        CHARACTER_SCALE_MIN,
        CHARACTER_SCALE_MAX
      ) *
      100
    ) /
    100
  );
}

function normalizeTranslateY(
  value: unknown
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  return Math.round(
    clamp(
      value,
      CHARACTER_TRANSLATE_Y_MIN,
      CHARACTER_TRANSLATE_Y_MAX
    )
  );
}

function normalizeOverride(
  value: unknown
): CharacterPresentationOverride {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(
      value
    )
  ) {
    return {
      ...DEFAULT_OVERRIDE,
    };
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  return {
    scale:
      normalizeScale(
        record.scale
      ),
    translateY:
      normalizeTranslateY(
        record.translateY
      ),
  };
}

function normalizeMap(
  value: unknown
): OverrideMap {
  const next =
    createDefaultMap();

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(
      value
    )
  ) {
    return next;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  STANDARD_IDS.forEach(
    (characterId) => {
      next[
        characterId
      ] =
        normalizeOverride(
          record[
            characterId
          ]
        );
    }
  );

  return next;
}

function isStandardCharacterId(
  characterId: CharacterId
): characterId is StandardCharacterId {
  return (
    characterId !==
    'rooty'
  );
}

function emit(
  characterId:
    StandardCharacterId,
  value:
    CharacterPresentationOverride
) {
  listeners.forEach(
    (listener) => {
      listener(
        characterId,
        value
      );
    }
  );
}

async function persistMap(
  next:
    OverrideMap
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      next
    )
  );
}

// CHARACTER_V72_PRESENTATION_OVERRIDE_PERSISTENCE
export async function loadCharacterPresentationOverrides():
  Promise<OverrideMap> {
  if (
    overridesReady
  ) {
    return cachedOverrides;
  }

  if (
    loadPromise
  ) {
    return loadPromise;
  }

  loadPromise =
    (async () => {
      let next =
        createDefaultMap();

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
        if (__DEV__) {
          console.warn(
            '[CHARACTER V72] override load failed',
            error
          );
        }
      }

      cachedOverrides =
        next;

      overridesReady =
        true;

      STANDARD_IDS.forEach(
        (characterId) => {
          emit(
            characterId,
            cachedOverrides[
              characterId
            ]
          );
        }
      );

      return cachedOverrides;
    })();

  try {
    return await loadPromise;
  }
  finally {
    loadPromise =
      null;
  }
}

export function getCachedCharacterPresentationOverride(
  characterId: CharacterId
): CharacterPresentationOverride {
  if (
    !isStandardCharacterId(
      characterId
    )
  ) {
    return {
      ...DEFAULT_OVERRIDE,
    };
  }

  return {
    ...cachedOverrides[
      characterId
    ],
  };
}

export async function saveCharacterPresentationOverride(
  characterId: CharacterId,
  value:
    CharacterPresentationOverride
): Promise<void> {
  if (
    !isStandardCharacterId(
      characterId
    )
  ) {
    return;
  }

  const normalized =
    normalizeOverride(
      value
    );

  const next:
    OverrideMap = {
    ...cachedOverrides,
    [characterId]:
      normalized,
  };

  await persistMap(
    next
  );

  cachedOverrides =
    next;

  overridesReady =
    true;

  emit(
    characterId,
    normalized
  );

  if (__DEV__) {
    console.log(
      '[CHARACTER V72] presentation override saved',
      {
        characterId,
        ...normalized,
      }
    );
  }
}

export async function adjustCharacterPresentationOverride(
  characterId: CharacterId,
  scaleDelta: number,
  translateYDelta: number
): Promise<void> {
  if (
    !isStandardCharacterId(
      characterId
    )
  ) {
    return;
  }

  const current =
    cachedOverrides[
      characterId
    ];

  await saveCharacterPresentationOverride(
    characterId,
    {
      scale:
        current.scale +
        scaleDelta,
      translateY:
        current.translateY +
        translateYDelta,
    }
  );
}

export async function resetCharacterPresentationOverride(
  characterId: CharacterId
): Promise<void> {
  await saveCharacterPresentationOverride(
    characterId,
    {
      ...DEFAULT_OVERRIDE,
    }
  );
}

export function subscribeCharacterPresentationOverride(
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

export function useCharacterPresentationOverride(
  characterId: CharacterId
) {
  const [
    override,
    setOverride,
  ] =
    useState<CharacterPresentationOverride>(
      () =>
        getCachedCharacterPresentationOverride(
          characterId
        )
    );

  const [
    ready,
    setReady,
  ] =
    useState(
      overridesReady
    );

  useEffect(
    () => {
      let cancelled =
        false;

      setOverride(
        getCachedCharacterPresentationOverride(
          characterId
        )
      );

      setReady(
        overridesReady
      );

      const unsubscribe =
        subscribeCharacterPresentationOverride(
          (
            changedCharacterId,
            value
          ) => {
            if (
              cancelled ||
              changedCharacterId !==
                characterId
            ) {
              return;
            }

            setOverride({
              ...value,
            });

            setReady(
              true
            );
          }
        );

      void loadCharacterPresentationOverrides()
        .then(
          () => {
            if (
              cancelled
            ) {
              return;
            }

            setOverride(
              getCachedCharacterPresentationOverride(
                characterId
              )
            );

            setReady(
              true
            );
          }
        );

      return () => {
        cancelled =
          true;

        unsubscribe();
      };
    },
    [
      characterId,
    ]
  );

  const adjustOverride =
    useCallback(
      async (
        scaleDelta:
          number,
        translateYDelta:
          number
      ) => {
        await adjustCharacterPresentationOverride(
          characterId,
          scaleDelta,
          translateYDelta
        );
      },
      [
        characterId,
      ]
    );

  const resetOverride =
    useCallback(
      async () => {
        await resetCharacterPresentationOverride(
          characterId
        );
      },
      [
        characterId,
      ]
    );

  return {
    override,
    ready,
    adjustOverride,
    resetOverride,
  };
}
