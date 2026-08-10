import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useEffect,
  useState,
} from 'react';

import {
  CHARACTER_IDS,
  type CharacterId,
} from '../constants/characterAssets';
import type {
  CharacterRestWeights,
  CharacterSocialChanceChannel,
} from './characterPersonalityPolicy';

const STORAGE_KEY =
  'character_runtime_statistics_v1';

export const CHARACTER_RUNTIME_STATISTICS_LIMIT =
  100;

export type CharacterRestStatisticSample = {
  timestamp: number;
  personalityRest:
    CharacterRestWeights | null;
  finalRest:
    CharacterRestWeights;
  behavior: string;
};

export type CharacterSocialStatisticSample = {
  timestamp: number;
  channel:
    CharacterSocialChanceChannel;
  chance: number;
};

export type CharacterRuntimeStatistics = {
  restSamples:
    CharacterRestStatisticSample[];
  socialSamples:
    CharacterSocialStatisticSample[];
};

type StatisticsMap =
  Record<
    CharacterId,
    CharacterRuntimeStatistics
  >;

type Listener =
  () => void;

const listeners =
  new Set<Listener>();

function emptyCharacterStatistics():
  CharacterRuntimeStatistics {
  return {
    restSamples: [],
    socialSamples: [],
  };
}

function createEmptyMap():
  StatisticsMap {
  return {
    rooty:
      emptyCharacterStatistics(),
    moru:
      emptyCharacterStatistics(),
    mongsil:
      emptyCharacterStatistics(),
    dami:
      emptyCharacterStatistics(),
  };
}

let cached:
  StatisticsMap =
  createEmptyMap();

let loaded =
  false;

let loadPromise:
  Promise<StatisticsMap> | null =
  null;

let writeQueue:
  Promise<void> =
  Promise.resolve();

function emit() {
  listeners.forEach(
    (listener) => {
      listener();
    }
  );
}

function clampChance(
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

  return Math.min(
    1,
    Math.max(
      0,
      value
    )
  );
}

function normalizeWeight(
  value: unknown
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(
      value
    ) ||
    value < 0
  ) {
    return 0;
  }

  return value;
}

function normalizeRestWeights(
  value: unknown
): CharacterRestWeights | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  return {
    lookAround:
      normalizeWeight(
        record.lookAround
      ),
    sitRest:
      normalizeWeight(
        record.sitRest
      ),
    nap:
      normalizeWeight(
        record.nap
      ),
  };
}

function normalizeRestSample(
  value: unknown
): CharacterRestStatisticSample | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  const finalRest =
    normalizeRestWeights(
      record.finalRest
    );

  if (
    finalRest === null
  ) {
    return null;
  }

  const timestamp =
    typeof record.timestamp === 'number' &&
    Number.isFinite(
      record.timestamp
    )
      ? record.timestamp
      : 0;

  const behavior =
    typeof record.behavior === 'string'
      ? record.behavior
      : 'unknown';

  return {
    timestamp,
    personalityRest:
      normalizeRestWeights(
        record.personalityRest
      ),
    finalRest,
    behavior,
  };
}

function isSocialChannel(
  value: unknown
): value is CharacterSocialChanceChannel {
  return (
    value ===
      'spontaneousHappy' ||
    value ===
      'passiveAttention' ||
    value ===
      'bondedFollowUpTouch'
  );
}

function normalizeSocialSample(
  value: unknown
): CharacterSocialStatisticSample | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  if (
    !isSocialChannel(
      record.channel
    )
  ) {
    return null;
  }

  const timestamp =
    typeof record.timestamp === 'number' &&
    Number.isFinite(
      record.timestamp
    )
      ? record.timestamp
      : 0;

  return {
    timestamp,
    channel:
      record.channel,
    chance:
      clampChance(
        record.chance
      ),
  };
}

function normalizeCharacterStatistics(
  value: unknown
): CharacterRuntimeStatistics {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(
      value
    )
  ) {
    return emptyCharacterStatistics();
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  const restSamples =
    Array.isArray(
      record.restSamples
    )
      ? record.restSamples
          .map(
            normalizeRestSample
          )
          .filter(
            (
              sample
            ): sample is CharacterRestStatisticSample =>
              sample !== null
          )
          .slice(
            -CHARACTER_RUNTIME_STATISTICS_LIMIT
          )
      : [];

  const socialSamples =
    Array.isArray(
      record.socialSamples
    )
      ? record.socialSamples
          .map(
            normalizeSocialSample
          )
          .filter(
            (
              sample
            ): sample is CharacterSocialStatisticSample =>
              sample !== null
          )
          .slice(
            -CHARACTER_RUNTIME_STATISTICS_LIMIT
          )
      : [];

  return {
    restSamples,
    socialSamples,
  };
}

function normalizeMap(
  value: unknown
): StatisticsMap {
  const next =
    createEmptyMap();

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

  CHARACTER_IDS.forEach(
    (characterId) => {
      next[
        characterId
      ] =
        normalizeCharacterStatistics(
          record[
            characterId
          ]
        );
    }
  );

  return next;
}

function cloneCharacterStatistics(
  value:
    CharacterRuntimeStatistics
): CharacterRuntimeStatistics {
  return {
    restSamples:
      value.restSamples.map(
        (sample) => ({
          ...sample,
          personalityRest:
            sample.personalityRest
              ? {
                  ...sample.personalityRest,
                }
              : null,
          finalRest: {
            ...sample.finalRest,
          },
        })
      ),
    socialSamples:
      value.socialSamples.map(
        (sample) => ({
          ...sample,
        })
      ),
  };
}

function cloneMap(
  value:
    StatisticsMap
): StatisticsMap {
  return {
    rooty:
      cloneCharacterStatistics(
        value.rooty
      ),
    moru:
      cloneCharacterStatistics(
        value.moru
      ),
    mongsil:
      cloneCharacterStatistics(
        value.mongsil
      ),
    dami:
      cloneCharacterStatistics(
        value.dami
      ),
  };
}

// CHARACTER_V78_RUNTIME_STATISTICS_PERSISTENCE
export async function loadCharacterRuntimeStatistics():
  Promise<StatisticsMap> {
  if (
    loaded
  ) {
    return cached;
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
        if (__DEV__) {
          console.warn(
            '[CHARACTER V78] statistics load failed',
            error
          );
        }
      }

      cached =
        next;

      loaded =
        true;

      emit();

      return cached;
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
        StatisticsMap
    ) => void
): void {
  writeQueue =
    writeQueue
      .then(
        async () => {
          await loadCharacterRuntimeStatistics();

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
          if (__DEV__) {
            console.warn(
              '[CHARACTER V78] statistics write failed',
              error
            );
          }
        }
      );
}

export function recordCharacterRestStatistic(
  characterId: CharacterId,
  personalityRest:
    CharacterRestWeights | null,
  finalRest:
    CharacterRestWeights,
  behavior: string
): void {
  const sample:
    CharacterRestStatisticSample = {
    timestamp:
      Date.now(),
    personalityRest:
      personalityRest
        ? {
            ...personalityRest,
          }
        : null,
    finalRest: {
      ...finalRest,
    },
    behavior,
  };

  enqueueMutation(
    (next) => {
      next[
        characterId
      ].restSamples = [
        ...next[
          characterId
        ].restSamples,
        sample,
      ].slice(
        -CHARACTER_RUNTIME_STATISTICS_LIMIT
      );
    }
  );
}

export function recordCharacterSocialStatistic(
  characterId: CharacterId,
  channel:
    CharacterSocialChanceChannel,
  chance: number
): void {
  const sample:
    CharacterSocialStatisticSample = {
    timestamp:
      Date.now(),
    channel,
    chance:
      clampChance(
        chance
      ),
  };

  enqueueMutation(
    (next) => {
      next[
        characterId
      ].socialSamples = [
        ...next[
          characterId
        ].socialSamples,
        sample,
      ].slice(
        -CHARACTER_RUNTIME_STATISTICS_LIMIT
      );
    }
  );
}

export function getCharacterRuntimeStatisticsSnapshot(
  characterId: CharacterId
): CharacterRuntimeStatistics {
  return cloneCharacterStatistics(
    cached[
      characterId
    ]
  );
}

export function subscribeCharacterRuntimeStatistics(
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

export function useCharacterRuntimeStatistics(
  characterId: CharacterId
) {
  const [
    statistics,
    setStatistics,
  ] =
    useState<CharacterRuntimeStatistics>(
      () =>
        getCharacterRuntimeStatisticsSnapshot(
          characterId
        )
    );

  const [
    ready,
    setReady,
  ] =
    useState(
      loaded
    );

  useEffect(
    () => {
      let cancelled =
        false;

      const refresh =
        () => {
          if (
            cancelled
          ) {
            return;
          }

          setStatistics(
            getCharacterRuntimeStatisticsSnapshot(
              characterId
            )
          );

          setReady(
            loaded
          );
        };

      refresh();

      const unsubscribe =
        subscribeCharacterRuntimeStatistics(
          refresh
        );

      void loadCharacterRuntimeStatistics()
        .then(
          () => {
            refresh();
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

  return {
    statistics,
    ready,
  };
}
