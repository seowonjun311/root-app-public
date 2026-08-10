import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useEffect,
  useState,
} from 'react';

import {
  CHARACTER_IDS,
  type CharacterId,
} from '../constants/characterAssets';

const STORAGE_KEY =
  'character_v81_device_validation_v1';

export const CHARACTER_DEVICE_VALIDATION_CHECK_IDS = [
  'selectedVisible',
  'selectedPersistsAfterRestart',
  'idle',
  'walk',
  'sit',
  'sleep',
  'happy',
  'touch',
  'leftRightFacing',
  'transitionStability',
  'staysInVillageBounds',
  'presentationAlignment',
  'runtimeDiagnostics',
  'runtimeStatistics',
  'personalityValidation',
] as const;

export type CharacterDeviceValidationCheckId =
  typeof CHARACTER_DEVICE_VALIDATION_CHECK_IDS[number];

export type CharacterDeviceValidationStatus =
  'UNTESTED' |
  'PASS' |
  'FAIL';

type CharacterDeviceValidationRecord =
  Record<
    CharacterDeviceValidationCheckId,
    CharacterDeviceValidationStatus
  >;

type CharacterDeviceValidationMap =
  Record<
    CharacterId,
    CharacterDeviceValidationRecord
  >;

type Listener =
  () => void;

const listeners =
  new Set<Listener>();

let loaded =
  false;

let loadPromise:
  Promise<CharacterDeviceValidationMap> | null =
  null;

let writeQueue:
  Promise<void> =
  Promise.resolve();

function createEmptyRecord():
  CharacterDeviceValidationRecord {
  return {
    selectedVisible:
      'UNTESTED',
    selectedPersistsAfterRestart:
      'UNTESTED',
    idle:
      'UNTESTED',
    walk:
      'UNTESTED',
    sit:
      'UNTESTED',
    sleep:
      'UNTESTED',
    happy:
      'UNTESTED',
    touch:
      'UNTESTED',
    leftRightFacing:
      'UNTESTED',
    transitionStability:
      'UNTESTED',
    staysInVillageBounds:
      'UNTESTED',
    presentationAlignment:
      'UNTESTED',
    runtimeDiagnostics:
      'UNTESTED',
    runtimeStatistics:
      'UNTESTED',
    personalityValidation:
      'UNTESTED',
  };
}

function createEmptyMap():
  CharacterDeviceValidationMap {
  return {
    rooty:
      createEmptyRecord(),
    moru:
      createEmptyRecord(),
    mongsil:
      createEmptyRecord(),
    dami:
      createEmptyRecord(),
  };
}

let cached:
  CharacterDeviceValidationMap =
  createEmptyMap();

function isStatus(
  value: unknown
): value is CharacterDeviceValidationStatus {
  return (
    value ===
      'UNTESTED' ||
    value ===
      'PASS' ||
    value ===
      'FAIL'
  );
}

function normalizeRecord(
  value: unknown
): CharacterDeviceValidationRecord {
  const next =
    createEmptyRecord();

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

  CHARACTER_DEVICE_VALIDATION_CHECK_IDS.forEach(
    (checkId) => {
      const status =
        record[
          checkId
        ];

      if (
        isStatus(
          status
        )
      ) {
        next[
          checkId
        ] =
          status;
      }
    }
  );

  return next;
}

function normalizeMap(
  value: unknown
): CharacterDeviceValidationMap {
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
        normalizeRecord(
          record[
            characterId
          ]
        );
    }
  );

  return next;
}

function cloneRecord(
  record:
    CharacterDeviceValidationRecord
): CharacterDeviceValidationRecord {
  return {
    ...record,
  };
}

function cloneMap(
  value:
    CharacterDeviceValidationMap
): CharacterDeviceValidationMap {
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
  };
}

function emit() {
  listeners.forEach(
    (listener) => {
      listener();
    }
  );
}

// CHARACTER_V81_DEVICE_VALIDATION_STORE
export async function loadCharacterDeviceValidation():
  Promise<CharacterDeviceValidationMap> {
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
            '[CHARACTER V81] validation load failed',
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
        CharacterDeviceValidationMap
    ) => void
): void {
  writeQueue =
    writeQueue
      .then(
        async () => {
          await loadCharacterDeviceValidation();

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
              '[CHARACTER V81] validation write failed',
              error
            );
          }
        }
      );
}

export function setCharacterDeviceValidationStatus(
  characterId: CharacterId,
  checkId:
    CharacterDeviceValidationCheckId,
  status:
    CharacterDeviceValidationStatus
): void {
  enqueueMutation(
    (next) => {
      next[
        characterId
      ][
        checkId
      ] =
        status;
    }
  );
}

export function resetCharacterDeviceValidation(
  characterId: CharacterId
): void {
  enqueueMutation(
    (next) => {
      next[
        characterId
      ] =
        createEmptyRecord();
    }
  );
}

export function getCharacterDeviceValidationSnapshot(
  characterId: CharacterId
): CharacterDeviceValidationRecord {
  return cloneRecord(
    cached[
      characterId
    ]
  );
}

export function subscribeCharacterDeviceValidation(
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

export function useCharacterDeviceValidation(
  characterId: CharacterId
) {
  const [
    record,
    setRecord,
  ] =
    useState<CharacterDeviceValidationRecord>(
      () =>
        getCharacterDeviceValidationSnapshot(
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

          setRecord(
            getCharacterDeviceValidationSnapshot(
              characterId
            )
          );

          setReady(
            loaded
          );
        };

      refresh();

      const unsubscribe =
        subscribeCharacterDeviceValidation(
          refresh
        );

      void loadCharacterDeviceValidation()
        .then(
          refresh
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
    record,
    ready,
  };
}
