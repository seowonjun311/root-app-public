import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CHARACTER_IDS,
  type CharacterId,
} from '../constants/characterAssets';
import {
  CHARACTER_GROWTH_LEVELS,
  CHARACTER_STARTER_ACQUIRED,
  getCharacterGrowthLevel,
  getCharacterGrowthReward,
  getCharacterNewlyReachedGrowthLevels,
  type CharacterAcquisitionSource,
  type CharacterGrowthLevel,
  type CharacterGrowthReward,
} from '../constants/characterProgression';
import {
  useEffect,
  useState,
} from 'react';
import {
  grantCharacterGrowthMilestoneRootPoints,
} from './characterGrowthPointReward';
import {
  getCharacterScopedStorageKey,
  refreshCharacterAccountScope,
  subscribeCharacterAccountScope,
  type CharacterAccountScopeSnapshot,
} from './characterAccountScope';
import {
  ensureCharacterScopedStorageReady,
  persistCharacterScopedValueAndSchedule,
  subscribeCharacterScopedStorageRefresh,
} from './characterCloudSync';
import {
  enqueueCharacterGrowthLevelPresentations,
} from './characterRewardPresentation';
import {
  emitCharacterHomeInteractionFeedback,
} from './characterHomeFeedback';

// CHARACTER_V97A_PROGRESSION_PERSISTENCE
const STORAGE_KEY =
  'character_progression_v1';

export const CHARACTER_PROGRESSION_STORAGE_VERSION =
  1;

export type CharacterProgressionRecord = {
  acquired: boolean;
  acquiredAt:
    number | null;
  acquisitionSource:
    CharacterAcquisitionSource | null;
  growthXp: number;
  claimedRewardLevels:
    CharacterGrowthLevel[];
  updatedAt:
    number | null;
  legacySeeded: boolean;
};

export type CharacterProgressionSnapshot =
  CharacterProgressionRecord & {
    growthLevel:
      CharacterGrowthLevel;
    unclaimedRewards:
      CharacterGrowthReward[];
  };

export type CharacterProgressionMap =
  Record<
    CharacterId,
    CharacterProgressionRecord
  >;

export type CharacterGrowthMutationResult = {
  characterId:
    CharacterId;
  acquired: boolean;
  beforeXp: number;
  afterXp: number;
  beforeLevel:
    CharacterGrowthLevel;
  afterLevel:
    CharacterGrowthLevel;
  newlyReachedLevels:
    CharacterGrowthLevel[];
};

type Listener =
  () => void;

const listeners =
  new Set<Listener>();

function starterRecord(
  characterId:
    CharacterId
): CharacterProgressionRecord {
  const acquired =
    CHARACTER_STARTER_ACQUIRED[
      characterId
    ];

  return {
    acquired,
    acquiredAt:
      null,
    acquisitionSource:
      acquired
        ? 'starter'
        : null,
    growthXp: 0,
    claimedRewardLevels: [],
    updatedAt: null,
    legacySeeded: false,
  };
}

function createDefaultMap():
  CharacterProgressionMap {
  return {
    rooty:
      starterRecord(
        'rooty'
      ),
    moru:
      starterRecord(
        'moru'
      ),
    mongsil:
      starterRecord(
        'mongsil'
      ),
    dami:
      starterRecord(
        'dami'
      ),
    pio:
      starterRecord(
        'pio'
      ),
    nuri:
      starterRecord(
        'nuri'
      ),
    tori:
      starterRecord(
        'tori'
      ),
  };
}

function normalizeBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  if (
    typeof value ===
    'boolean'
  ) {
    return value;
  }

  return fallback;
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

function normalizeXp(
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

function isAcquisitionSource(
  value: unknown
): value is
  CharacterAcquisitionSource {
  return (
    value === 'starter' ||
    value === 'legacy' ||
    value === 'growthReward' ||
    value === 'relationshipReward' ||
    value === 'explorationReward' ||
    value === 'eventReward' ||
    value === 'points' ||
    value === 'admin'
  );
}

function isGrowthLevel(
  value: unknown
): value is
  CharacterGrowthLevel {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5
  );
}

function normalizeClaimedLevels(
  value: unknown
): CharacterGrowthLevel[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        isGrowthLevel
      )
    )
  )
    .filter(
      (level) =>
        level > 1
    )
    .sort(
      (
        left,
        right
      ) =>
        left -
        right
    );
}

function normalizeRecord(
  characterId:
    CharacterId,
  value: unknown
): CharacterProgressionRecord {
  const fallback =
    starterRecord(
      characterId
    );

  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return fallback;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  const acquired =
    normalizeBoolean(
      record.acquired,
      fallback.acquired
    ) ||
    fallback.acquired;

  const source =
    isAcquisitionSource(
      record.acquisitionSource
    )
      ? record.acquisitionSource
      : (
          acquired
            ? (
                fallback
                  .acquisitionSource ??
                'legacy'
              )
            : null
        );

  return {
    acquired,
    acquiredAt:
      normalizeTimestamp(
        record.acquiredAt
      ),
    acquisitionSource:
      source,
    growthXp:
      normalizeXp(
        record.growthXp
      ),
    claimedRewardLevels:
      normalizeClaimedLevels(
        record.claimedRewardLevels
      ),
    updatedAt:
      normalizeTimestamp(
        record.updatedAt
      ),
    legacySeeded:
      record.legacySeeded ===
      true,
  };
}

function normalizeMap(
  value: unknown
): CharacterProgressionMap {
  const defaults =
    createDefaultMap();

  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return defaults;
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
        'rooty',
        record.rooty
      ),
    moru:
      normalizeRecord(
        'moru',
        record.moru
      ),
    mongsil:
      normalizeRecord(
        'mongsil',
        record.mongsil
      ),
    dami:
      normalizeRecord(
        'dami',
        record.dami
      ),
    pio:
      normalizeRecord(
        'pio',
        record.pio
      ),
    nuri:
      normalizeRecord(
        'nuri',
        record.nuri
      ),
    tori:
      normalizeRecord(
        'tori',
        record.tori
      ),
  };
}

function cloneRecord(
  value:
    CharacterProgressionRecord
): CharacterProgressionRecord {
  return {
    ...value,
    claimedRewardLevels:
      [
        ...value
          .claimedRewardLevels,
      ],
  };
}

function cloneMap(
  value:
    CharacterProgressionMap
): CharacterProgressionMap {
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
  CharacterProgressionMap =
  createDefaultMap();

let loaded =
  false;

let loadPromise:
  Promise<CharacterProgressionMap> | null =
  null;

let writeQueue:
  Promise<void> =
  Promise.resolve();

let characterProgressionScopeId:
  string | null =
  null;

function resetCharacterProgressionScope(
  scopeId: string
): void {
  characterProgressionScopeId =
    scopeId;

  cached =
    createDefaultMap();

  loaded =
    false;

  loadPromise =
    null;
}

// CHARACTER_V98B_PROGRESSION_SCOPE_RESET
function ensureCharacterProgressionScope():
  CharacterAccountScopeSnapshot {
  const scope =
    refreshCharacterAccountScope();

  if (
    characterProgressionScopeId !==
    scope.scopeId
  ) {
    resetCharacterProgressionScope(
      scope.scopeId
    );
  }

  return scope;
}

subscribeCharacterAccountScope(
  (
    scope
  ) => {
    if (
      characterProgressionScopeId ===
      scope.scopeId
    ) {
      return;
    }

    resetCharacterProgressionScope(
      scope.scopeId
    );

    void loadCharacterProgression();
  }
);

// CHARACTER_V98C_PROGRESSION_CLOUD_REFRESH
subscribeCharacterScopedStorageRefresh(
  (
    scope
  ) => {
    if (
      refreshCharacterAccountScope()
        .scopeId !==
      scope.scopeId
    ) {
      return;
    }

    resetCharacterProgressionScope(
      scope.scopeId
    );

    void loadCharacterProgression();
  }
);

function emit(): void {
  listeners.forEach(
    (listener) => {
      listener();
    }
  );
}

function serializeWrite(
  next:
    CharacterProgressionMap,
  scope:
    CharacterAccountScopeSnapshot =
      ensureCharacterProgressionScope()
): Promise<void> {

  const serialized =
    JSON.stringify(
      next
    );

  writeQueue =
    writeQueue
      .then(
        () =>
          persistCharacterScopedValueAndSchedule(
            STORAGE_KEY,
            serialized,
            scope
          )
      )
      .catch(
        (error) => {
          if (
            __DEV__
          ) {
            console.warn(
              '[CHARACTER V97] progression write failed',
              error
            );
          }
        }
      );

  return writeQueue;
}

export async function loadCharacterProgression():
  Promise<CharacterProgressionMap> {
  const scope =
    ensureCharacterProgressionScope();

  await ensureCharacterScopedStorageReady(
    scope
  );

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
        createDefaultMap();

      try {
        const raw =
          await AsyncStorage.getItem(
            getCharacterScopedStorageKey(
              STORAGE_KEY,
              scope
            )
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
            '[CHARACTER V97] progression load failed',
            error
          );
        }
      }

      if (
        refreshCharacterAccountScope()
          .scopeId !==
        scope.scopeId
      ) {
        return cloneMap(
          createDefaultMap()
        );
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

  const currentLoadPromise =
    loadPromise;

  try {
    return await currentLoadPromise;
  }
  finally {
    if (
      loadPromise ===
      currentLoadPromise
    ) {
      loadPromise =
        null;
    }
  }
}

function currentUnclaimedRewards(
  record:
    CharacterProgressionRecord
): CharacterGrowthReward[] {
  const level =
    getCharacterGrowthLevel(
      record.growthXp
    );

  return CHARACTER_GROWTH_LEVELS
    .filter(
      (milestone) =>
        milestone.level > 1 &&
        milestone.level <=
          level &&
        !record
          .claimedRewardLevels
          .includes(
            milestone.level
          )
    );
}

// CHARACTER_V97A_PROGRESSION_SNAPSHOT
export function getCharacterProgressionSnapshot(
  characterId:
    CharacterId
): CharacterProgressionSnapshot {
  const record =
    cloneRecord(
      cached[
        characterId
      ]
    );

  return {
    ...record,
    growthLevel:
      getCharacterGrowthLevel(
        record.growthXp
      ),
    unclaimedRewards:
      currentUnclaimedRewards(
        record
      ),
  };
}

export function getAllCharacterProgressionSnapshots():
  Record<
    CharacterId,
    CharacterProgressionSnapshot
  > {
  return {
    rooty:
      getCharacterProgressionSnapshot(
        'rooty'
      ),
    moru:
      getCharacterProgressionSnapshot(
        'moru'
      ),
    mongsil:
      getCharacterProgressionSnapshot(
        'mongsil'
      ),
    dami:
      getCharacterProgressionSnapshot(
        'dami'
      ),
    pio:
      getCharacterProgressionSnapshot(
        'pio'
      ),
    nuri:
      getCharacterProgressionSnapshot(
        'nuri'
      ),
    tori:
      getCharacterProgressionSnapshot(
        'tori'
      ),
  };
}

export function isCharacterProgressionReady():
  boolean {
  return loaded;
}

export function subscribeCharacterProgression(
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

async function mutateRecord(
  characterId:
    CharacterId,
  mutate:
    (
      current:
        CharacterProgressionRecord
    ) =>
      CharacterProgressionRecord
): Promise<void> {
  const scope =
    ensureCharacterProgressionScope();

  await loadCharacterProgression();

  if (
    refreshCharacterAccountScope()
      .scopeId !==
    scope.scopeId
  ) {
    throw new Error(
      'CHARACTER_PROGRESSION_SCOPE_CHANGED'
    );
  }

  const next =
    cloneMap(
      cached
    );

  next[
    characterId
  ] =
    mutate(
      cloneRecord(
        next[
          characterId
        ]
      )
    );

  cached =
    next;

  emit();

  // CHARACTER_V98B_PROGRESSION_SCOPED_WRITE
  await serializeWrite(
    next,
    scope
  );
}

// CHARACTER_V97A_ACQUISITION_API
export async function acquireCharacter(
  characterId:
    CharacterId,
  source:
    CharacterAcquisitionSource
): Promise<boolean> {
  await loadCharacterProgression();

  const before =
    cached[
      characterId
    ];

  if (
    before.acquired
  ) {
    return false;
  }

  const now =
    Date.now();

  await mutateRecord(
    characterId,
    (current) => ({
      ...current,
      acquired: true,
      acquiredAt: now,
      acquisitionSource:
        source,
      updatedAt: now,
    })
  );

  return true;
}

// CHARACTER_V97A_LEGACY_SELECTED_ACQUISITION_SEED
// V97B should call this before enforcing lock-aware character selection.
// It protects the character that an existing user already had selected.
export async function seedLegacySelectedCharacterAcquisition(
  characterId:
    CharacterId
): Promise<void> {
  await loadCharacterProgression();

  const current =
    cached[
      characterId
    ];

  if (
    current.acquired ||
    current.legacySeeded
  ) {
    return;
  }

  const now =
    Date.now();

  await mutateRecord(
    characterId,
    (record) => ({
      ...record,
      acquired: true,
      acquiredAt: now,
      acquisitionSource:
        'legacy',
      updatedAt: now,
      legacySeeded: true,
    })
  );
}

// CHARACTER_V97A_GROWTH_XP_API
export async function addCharacterGrowthXp(
  characterId:
    CharacterId,
  amount: number
): Promise<CharacterGrowthMutationResult> {
  await loadCharacterProgression();

  const before =
    cached[
      characterId
    ];

  const beforeXp =
    before.growthXp;

  const beforeLevel =
    getCharacterGrowthLevel(
      beforeXp
    );

  if (
    !before.acquired ||
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {
    return {
      characterId,
      acquired:
        before.acquired,
      beforeXp,
      afterXp:
        beforeXp,
      beforeLevel,
      afterLevel:
        beforeLevel,
      newlyReachedLevels: [],
    };
  }

  const delta =
    Math.floor(
      amount
    );

  const afterXp =
    beforeXp +
    delta;

  const afterLevel =
    getCharacterGrowthLevel(
      afterXp
    );

  const newlyReachedLevels =
    getCharacterNewlyReachedGrowthLevels(
      beforeXp,
      afterXp
    );

  const now =
    Date.now();

  await mutateRecord(
    characterId,
    (current) => ({
      ...current,
      growthXp:
        afterXp,
      updatedAt:
        now,
    })
  );

  return {
    characterId,
    acquired: true,
    beforeXp,
    afterXp,
    beforeLevel,
    afterLevel,
    newlyReachedLevels,
  };
}

export function getCharacterUnclaimedGrowthRewards(
  characterId:
    CharacterId
): CharacterGrowthReward[] {
  return currentUnclaimedRewards(
    cached[
      characterId
    ]
  );
}

// CHARACTER_V97A_TWO_PHASE_REWARD_CLAIM
// IMPORTANT:
// 1. Caller reads an unclaimed reward.
// 2. Caller successfully grants the external/global point reward.
// 3. Only then caller marks the level claimed.
//
// V97A intentionally does NOT touch ROOT's global point store yet.
export async function markCharacterGrowthRewardClaimed(
  characterId:
    CharacterId,
  level:
    CharacterGrowthLevel
): Promise<boolean> {
  await loadCharacterProgression();

  const current =
    cached[
      characterId
    ];

  if (
    !current.acquired ||
    level <= 1 ||
    level >
      getCharacterGrowthLevel(
        current.growthXp
      ) ||
    current
      .claimedRewardLevels
      .includes(
        level
      )
  ) {
    return false;
  }

  const reward =
    getCharacterGrowthReward(
      level
    );

  if (
    reward.pointReward <= 0
  ) {
    return false;
  }

  const now =
    Date.now();

  await mutateRecord(
    characterId,
    (record) => ({
      ...record,
      claimedRewardLevels:
        Array.from(
          new Set([
            ...record
              .claimedRewardLevels,
            level,
          ])
        ).sort(
          (
            left,
            right
          ) =>
            left -
            right
        ),
      updatedAt:
        now,
    })
  );

  return true;
}

// Static compile-time assertion that the persistence map tracks the current
// seven-character registry contract.
const _characterProgressionRegistryContract:
  readonly CharacterId[] =
  CHARACTER_IDS;

void _characterProgressionRegistryContract;
// CHARACTER_V97B_ACQUISITION_QUERY
export function isCharacterAcquired(
  characterId:
    CharacterId
): boolean {
  return getCharacterProgressionSnapshot(
    characterId
  ).acquired;
}

// CHARACTER_V97B_PROGRESSION_REACTIVE_HOOK
export function useCharacterProgression() {
  const [
    progressionReady,
    setProgressionReady,
  ] =
    useState(
      loaded
    );

  const [
    revision,
    setRevision,
  ] =
    useState(
      0
    );

  useEffect(
    () => {
      let cancelled =
        false;

      const unsubscribe =
        subscribeCharacterProgression(
          () => {
            if (
              cancelled
            ) {
              return;
            }

            setProgressionReady(
              true
            );

            setRevision(
              (current) =>
                current + 1
            );
          }
        );

      void loadCharacterProgression()
        .then(
          () => {
            if (
              cancelled
            ) {
              return;
            }

            setProgressionReady(
              true
            );

            setRevision(
              (current) =>
                current + 1
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

  void revision;

  return {
    ready:
      progressionReady,
    snapshots:
      getAllCharacterProgressionSnapshots(),
  };
}
// CHARACTER_V97C_SERIALIZED_INTERACTION_GROWTH
export type CharacterGrowthInteraction =
  | 'tap'
  | 'longPress';

let characterGrowthInteractionQueue:
  Promise<void> =
  Promise.resolve();

export function recordCharacterGrowthInteraction(
  characterId:
    CharacterId,
  interaction:
    CharacterGrowthInteraction
): Promise<void> {
  // CHARACTER_V98B_GROWTH_INTERACTION_SCOPE_CAPTURE
  const interactionScopeId =
    refreshCharacterAccountScope()
      .scopeId;

  const amount =
    interaction ===
      'longPress'
      ? 2
      : 1;

  // Capture characterId and amount now, then serialize the mutation.
  // This prevents rapid taps from reading the same pre-increment XP value.
  characterGrowthInteractionQueue =
    characterGrowthInteractionQueue
      .then(
        async () => {
          if (
            refreshCharacterAccountScope()
              .scopeId !==
            interactionScopeId
          ) {
            return;
          }

          const result =
            await addCharacterGrowthXp(
              characterId,
              amount
            );
          // CHARACTER_V99B_CONFIRMED_XP_MICROFEEDBACK
          const confirmedXpDelta =
            Math.max(
              0,
              result.afterXp -
                result.beforeXp
            );

          if (
            confirmedXpDelta >
            0
          ) {
            emitCharacterHomeInteractionFeedback({
              characterId:
                result.characterId,
              xpDelta:
                confirmedXpDelta,
              source:
                'growth',
            });
          }
          // CHARACTER_V99A_GROWTH_PRESENTATION_EMIT
          if (
            result
              .newlyReachedLevels
              .length >
            0
          ) {
            enqueueCharacterGrowthLevelPresentations({
              characterId:
                result.characterId,
              beforeLevel:
                result.beforeLevel,
              newlyReachedLevels:
                result.newlyReachedLevels,
            });
          }

          // CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT
          const rewardSettlements =
            await settleCharacterGrowthMilestoneRewards(
              characterId
            );

          if (
            __DEV__
          ) {
            console.log(
              '[CHARACTER V97] growth interaction',
              {
                characterId,
                interaction,
                amount,
                acquired:
                  result.acquired,
                beforeXp:
                  result.beforeXp,
                afterXp:
                  result.afterXp,
                beforeLevel:
                  result.beforeLevel,
                afterLevel:
                  result.afterLevel,
                newlyReachedLevels:
                  result.newlyReachedLevels,
                rewardSettlements,
              }
            );
          }
        }
      )
      .catch(
        (error) => {
          if (
            __DEV__
          ) {
            console.warn(
              '[CHARACTER V97] growth interaction failed',
              {
                characterId,
                interaction,
                amount,
                error,
              }
            );
          }
        }
      );

  return characterGrowthInteractionQueue;
}
// CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT_API
export type CharacterGrowthRewardSettlement = {
  level:
    CharacterGrowthLevel;
  pointReward: number;
  newlyGranted: boolean;
  markedClaimed: boolean;
  grantId: string;
  rootPointAdjustment: number;
};

export async function settleCharacterGrowthMilestoneRewards(
  characterId:
    CharacterId
): Promise<
  CharacterGrowthRewardSettlement[]
> {
  await loadCharacterProgression();

  const pending =
    getCharacterUnclaimedGrowthRewards(
      characterId
    );

  const settled:
    CharacterGrowthRewardSettlement[] =
    [];

  for (
    const reward of
    pending
  ) {
    try {
      const grant =
        await grantCharacterGrowthMilestoneRootPoints(
          characterId,
          reward.level,
          reward.pointReward
        );

      const markedClaimed =
        await markCharacterGrowthRewardClaimed(
          characterId,
          reward.level
        );

      settled.push({
        level:
          reward.level,
        pointReward:
          reward.pointReward,
        newlyGranted:
          grant.newlyGranted,
        markedClaimed,
        grantId:
          grant.grantId,
        rootPointAdjustment:
          grant.rootPointAdjustment,
      });

      if (
        __DEV__
      ) {
        console.log(
          '[CHARACTER V97] growth reward settled',
          {
            characterId,
            level:
              reward.level,
            pointReward:
              reward.pointReward,
            newlyGranted:
              grant.newlyGranted,
            markedClaimed,
            grantId:
              grant.grantId,
            rootPointAdjustment:
              grant.rootPointAdjustment,
          }
        );
      }
    }
    catch (
      error
    ) {
      if (
        __DEV__
      ) {
        console.warn(
          '[CHARACTER V97] growth reward pending after grant failure',
          {
            characterId,
            level:
              reward.level,
            pointReward:
              reward.pointReward,
            error,
          }
        );
      }

      // Do not mark claimed. The next interaction retries every unclaimed
      // milestone, while the ROOT reward ledger prevents duplicate points.
      break;
    }
  }

  return settled;
}
