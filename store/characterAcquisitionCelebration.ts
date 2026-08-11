import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useEffect,
} from 'react';
import {
  Alert,
} from 'react-native';

import {
  CHARACTER_IDS,
  type CharacterId,
} from '../constants/characterAssets';
import {
  getAllCharacterProgressionSnapshots,
  loadCharacterProgression,
  useCharacterProgression,
} from './characterProgression';
import {
  getCharacterScopedStorageKey,
  refreshCharacterAccountScope,
  subscribeCharacterAccountScope,
  type CharacterAccountScopeSnapshot,
} from './characterAccountScope';
import {
  ensureCharacterScopedStorageReady,
} from './characterCloudSync';

const STORAGE_KEY =
  'character_acquisition_celebration_v1';

const CHARACTER_LABEL:
  Record<
    CharacterId,
    string
  > = {
  rooty:
    '\uB8E8\uD2F0',
  moru:
    '\uBAA8\uB8E8',
  mongsil:
    '\uBABD\uC2E4',
  dami:
    '\uB2E4\uBBF8',
  pio:
    '\uD53C\uC624',
  nuri:
    '\uB204\uB9AC',
  tori:
    '\uD1A0\uB9AC',
};

let activeCharacter:
  CharacterId | null =
  null;

let checkPromise:
  Promise<void> | null =
  null;

// CHARACTER_V98B_CELEBRATION_SCOPE_RESET
subscribeCharacterAccountScope(
  () => {
    activeCharacter =
      null;

    checkPromise =
      null;
  }
);

function normalizeSeen(
  value: unknown
): CharacterId[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  const allowed =
    new Set(
      CHARACTER_IDS
    );

  return Array.from(
    new Set(
      value.filter(
        (
          item
        ): item is CharacterId =>
          typeof item ===
            'string' &&
          allowed.has(
            item as
              CharacterId
          )
      )
    )
  );
}

async function loadSeen(
  scope:
    CharacterAccountScopeSnapshot =
      refreshCharacterAccountScope()
): Promise<CharacterId[]> {
  await ensureCharacterScopedStorageReady(
    scope
  );

  try {
    const raw =
      await AsyncStorage.getItem(
        getCharacterScopedStorageKey(
          STORAGE_KEY,
          scope
        )
      );

    if (
      raw === null
    ) {
      return [];
    }

    return normalizeSeen(
      JSON.parse(
        raw
      )
    );
  }
  catch (error) {
    if (
      __DEV__
    ) {
      console.warn(
        '[CHARACTER V97] acquisition celebration load failed',
        error
      );
    }

    return [];
  }
}

async function markSeen(
  characterId:
    CharacterId
): Promise<void> {
  const scope =
    refreshCharacterAccountScope();

  const current =
    await loadSeen(
      scope
    );

  if (
    current.includes(
      characterId
    )
  ) {
    return;
  }

  if (
    refreshCharacterAccountScope()
      .scopeId !==
    scope.scopeId
  ) {
    return;
  }

  // CHARACTER_V98B_CELEBRATION_SCOPED_WRITE
  await AsyncStorage.setItem(
    getCharacterScopedStorageKey(
      STORAGE_KEY,
      scope
    ),
    JSON.stringify([
      ...current,
      characterId,
    ])
  );
}

function acquisitionSourceText(
  source: string | null
): string {
  switch (
    source
  ) {
    case 'growthReward':
      return '\uC131\uC7A5 \uBCF4\uC0C1';

    case 'relationshipReward':
      return '\uCE5C\uBC00\uB3C4 \uBCF4\uC0C1';

    case 'explorationReward':
      return '\uD0D0\uD5D8 \uBCF4\uC0C1';

    case 'eventReward':
      return '\uC774\uBCA4\uD2B8 \uBCF4\uC0C1';

    case 'points':
      return '\uD3EC\uC778\uD2B8 \uD68D\uB4DD';

    case 'admin':
      return '\uAD00\uB9AC\uC790 \uD68D\uB4DD';

    default:
      return '\uCE90\uB9AD\uD130 \uBCF4\uC0C1';
  }
}

// CHARACTER_V97F_PENDING_ACQUISITION_CELEBRATION
export async function getPendingCharacterAcquisitionCelebrations():
  Promise<CharacterId[]> {
  await loadCharacterProgression();

  const seen =
    new Set(
      await loadSeen()
    );

  const snapshots =
    getAllCharacterProgressionSnapshots();

  return CHARACTER_IDS.filter(
    (
      characterId
    ) => {
      if (
        characterId ===
        'rooty'
      ) {
        return false;
      }

      const snapshot =
        snapshots[
          characterId
        ];

      if (
        !snapshot.acquired ||
        seen.has(
          characterId
        )
      ) {
        return false;
      }

      // Existing-user migration should not suddenly show a "new character"
      // celebration for something the user already owned before V97.
      return (
        snapshot.acquisitionSource !==
          'legacy' &&
        snapshot.acquisitionSource !==
          'starter'
      );
    }
  );
}

async function showNext():
  Promise<void> {
  if (
    activeCharacter !==
    null
  ) {
    return;
  }

  const pending =
    await getPendingCharacterAcquisitionCelebrations();

  const characterId =
    pending[0];

  if (
    !characterId
  ) {
    return;
  }

  const snapshots =
    getAllCharacterProgressionSnapshots();

  const snapshot =
    snapshots[
      characterId
    ];

  activeCharacter =
    characterId;

  // CHARACTER_V97F_ONE_TIME_ACQUISITION_ALERT
  Alert.alert(
    '\uC0C8 \uCE90\uB9AD\uD130 \uD68D\uB4DD!',
    (
      CHARACTER_LABEL[
        characterId
      ] +
      '\uB97C \uD68D\uB4DD\uD588\uC5B4\uC694.\n' +
      acquisitionSourceText(
        snapshot.acquisitionSource
      ) +
      '\uC73C\uB85C \uC7A0\uAE08\uC774 \uD574\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.'
    ),
    [
      {
        text:
          '\uD655\uC778',
        onPress:
          () => {
            const completed =
              characterId;

            activeCharacter =
              null;

            void markSeen(
              completed
            )
              .then(
                () =>
                  showNext()
              )
              .catch(
                (error) => {
                  if (
                    __DEV__
                  ) {
                    console.warn(
                      '[CHARACTER V97] acquisition celebration save failed',
                      error
                    );
                  }
                }
              );
          },
      },
    ],
    {
      cancelable:
        false,
    }
  );
}

// CHARACTER_V97F_SERIALIZED_CELEBRATION_CHECK
export function showPendingCharacterAcquisitionCelebrations():
  Promise<void> {
  if (
    checkPromise
  ) {
    return checkPromise;
  }

  checkPromise =
    showNext()
      .finally(
        () => {
          checkPromise =
            null;
        }
      );

  return checkPromise;
}

// CHARACTER_V97F_ACQUISITION_CELEBRATION_HOOK
export function useCharacterAcquisitionCelebration():
  void {
  const progression =
    useCharacterProgression();

  const acquisitionSignature =
    CHARACTER_IDS.map(
      (
        characterId
      ) => {
        const snapshot =
          progression.snapshots[
            characterId
          ];

        return (
          characterId +
          ':' +
          (
            snapshot.acquired
              ? '1'
              : '0'
          ) +
          ':' +
          (
            snapshot.acquisitionSource ??
            '-'
          )
        );
      }
    ).join(
      '|'
    );

  useEffect(
    () => {
      if (
        !progression.ready
      ) {
        return;
      }

      void showPendingCharacterAcquisitionCelebrations();
    },
    [
      progression.ready,
      acquisitionSignature,
    ]
  );
}
