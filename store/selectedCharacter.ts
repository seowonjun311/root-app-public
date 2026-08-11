import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  CHARACTER_IDS,
  type CharacterId,
} from '../constants/characterAssets';
import {
  getCharacterProgressionSnapshot,
  loadCharacterProgression,
  seedLegacySelectedCharacterAcquisition,
} from './characterProgression';

const STORAGE_KEY =
  'selected_character_v1';

const DEFAULT_CHARACTER:
  CharacterId =
  'rooty';

type Listener =
  (
    characterId: CharacterId
  ) => void;

let cachedCharacter:
  CharacterId =
  DEFAULT_CHARACTER;

let ready =
  false;

let loadPromise:
  Promise<CharacterId> | null =
  null;

const listeners =
  new Set<Listener>();

// CHARACTER_V70_SELECTED_CHARACTER_PERSISTENCE
export function isCharacterId(
  value: unknown
): value is CharacterId {
  return (
    typeof value === 'string' &&
    (
      CHARACTER_IDS as
        readonly string[]
    ).includes(
      value
    )
  );
}

function emit(
  characterId: CharacterId
) {
  listeners.forEach(
    (listener) => {
      listener(
        characterId
      );
    }
  );
}

export async function loadSelectedCharacter():
  Promise<CharacterId> {
  if (ready) {
    return cachedCharacter;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise =
    (async () => {
      let next:
        CharacterId =
        DEFAULT_CHARACTER;

      try {
        const raw =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (
          isCharacterId(
            raw
          )
        ) {
          next =
            raw;
        }
        else if (
          raw !== null
        ) {
          await AsyncStorage.setItem(
            STORAGE_KEY,
            DEFAULT_CHARACTER
          );
        }
      }
      catch (error) {
        if (__DEV__) {
          console.warn(
            '[CHARACTER V70] load failed',
            error
          );
        }
      }

      // CHARACTER_V97B_LEGACY_SELECTION_SEED
      // Preserve the character this existing user already had selected
      // before acquisition locks become authoritative.
      await loadCharacterProgression();

      await seedLegacySelectedCharacterAcquisition(
        next
      );

      if (
        !getCharacterProgressionSnapshot(
          next
        ).acquired
      ) {
        next =
          DEFAULT_CHARACTER;

        await AsyncStorage.setItem(
          STORAGE_KEY,
          next
        );
      }

      cachedCharacter =
        next;

      ready =
        true;

      emit(
        next
      );

      return next;
    })();

  try {
    return await loadPromise;
  }
  finally {
    loadPromise =
      null;
  }
}

export async function saveSelectedCharacter(
  characterId: CharacterId
): Promise<boolean> {
  // CHARACTER_V97B_ACQUISITION_SELECTION_GATE
  await loadCharacterProgression();

  if (
    !getCharacterProgressionSnapshot(
      characterId
    ).acquired
  ) {
    if (
      __DEV__
    ) {
      console.warn(
        '[CHARACTER V97] locked selection rejected',
        {
          characterId,
        }
      );
    }

    return false;
  }

  await AsyncStorage.setItem(
    STORAGE_KEY,
    characterId
  );

  cachedCharacter =
    characterId;

  ready =
    true;

  emit(
    characterId
  );

  if (__DEV__) {
    console.log(
      '[CHARACTER V70] saved',
      {
        characterId,
      }
    );
  }
  return true;

}

export function subscribeSelectedCharacter(
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

export function useSelectedCharacter() {
  const [
    selectedCharacter,
    setSelectedCharacter,
  ] =
    useState<CharacterId>(
      cachedCharacter
    );

  const [
    selectedCharacterReady,
    setSelectedCharacterReady,
  ] =
    useState(
      ready
    );

  useEffect(
    () => {
      let cancelled =
        false;

      const unsubscribe =
        subscribeSelectedCharacter(
          (characterId) => {
            if (cancelled) {
              return;
            }

            setSelectedCharacter(
              characterId
            );

            setSelectedCharacterReady(
              true
            );
          }
        );

      void loadSelectedCharacter()
        .then(
          (characterId) => {
            if (cancelled) {
              return;
            }

            setSelectedCharacter(
              characterId
            );

            setSelectedCharacterReady(
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
    []
  );

  const selectCharacter =
    useCallback(
      async (
        characterId:
          CharacterId
      ) => {
        return saveSelectedCharacter(
          characterId
        );
      },
      []
    );

  return {
    selectedCharacter,
    ready:
      selectedCharacterReady,
    selectCharacter,
  };
}

// CHARACTER_V76_SELECTED_CHARACTER_SNAPSHOT
export function getSelectedCharacterSnapshot():
  CharacterId {
  return cachedCharacter;
}
