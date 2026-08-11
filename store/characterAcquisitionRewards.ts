import {
  CHARACTER_IDS,
  type CharacterId,
} from '../constants/characterAssets';
import {
  type CharacterAcquisitionSource,
} from '../constants/characterProgression';
import {
  acquireCharacter,
  getAllCharacterProgressionSnapshots,
  loadCharacterProgression,
} from './characterProgression';
import {
  getCharacterRelationshipSnapshot,
  loadCharacterRelationships,
} from './characterRelationship';
import {
  getRootOnboardingData,
} from './rootMemory';

export type CharacterAcquisitionMetrics = {
  rootyGrowthXp: number;
  totalGrowthXp: number;
  maxRelationshipPoints: number;
  explorationVisitedCount: number;
  explorationPoints: number;
  acquiredCount: number;
};

export type CharacterAcquisitionRewardStatus = {
  characterId:
    CharacterId;
  acquired: boolean;
  eligible: boolean;
  source:
    CharacterAcquisitionSource;
  requirementText: string;
  progressText: string;
};

type AcquisitionRule = {
  characterId:
    Exclude<
      CharacterId,
      'rooty'
    >;
  source:
    CharacterAcquisitionSource;
  requirementText: string;
  progressText:
    (
      metrics:
        CharacterAcquisitionMetrics
    ) => string;
  isEligible:
    (
      metrics:
        CharacterAcquisitionMetrics
    ) => boolean;
};

// CHARACTER_V97E_REAL_ACQUISITION_RULES
const ACQUISITION_RULES:
  readonly AcquisitionRule[] = [
  {
    characterId:
      'moru',
    source:
      'growthReward',
    requirementText:
      '루티 성장 Lv.2 달성 (25 XP)',
    progressText:
      (
        metrics
      ) =>
        `루티 성장 ${metrics.rootyGrowthXp}/25 XP`,
    isEligible:
      (
        metrics
      ) =>
        metrics.rootyGrowthXp >=
        25,
  },
  {
    characterId:
      'mongsil',
    source:
      'growthReward',
    requirementText:
      '획득 캐릭터 성장 XP 합계 75 달성',
    progressText:
      (
        metrics
      ) =>
        `성장 XP 합계 ${metrics.totalGrowthXp}/75`,
    isEligible:
      (
        metrics
      ) =>
        metrics.totalGrowthXp >=
        75,
  },
  {
    characterId:
      'dami',
    source:
      'relationshipReward',
    requirementText:
      '캐릭터 친밀도 75(bonded) 달성',
    progressText:
      (
        metrics
      ) =>
        `최고 친밀도 ${metrics.maxRelationshipPoints}/75`,
    isEligible:
      (
        metrics
      ) =>
        metrics.maxRelationshipPoints >=
        75,
  },
  {
    characterId:
      'pio',
    source:
      'explorationReward',
    requirementText:
      '탐험 장소 5곳 방문',
    progressText:
      (
        metrics
      ) =>
        `탐험 방문 ${metrics.explorationVisitedCount}/5`,
    isEligible:
      (
        metrics
      ) =>
        metrics.explorationVisitedCount >=
        5,
  },
  {
    characterId:
      'nuri',
    source:
      'explorationReward',
    requirementText:
      '탐험 장소 15곳 방문',
    progressText:
      (
        metrics
      ) =>
        `탐험 방문 ${metrics.explorationVisitedCount}/15`,
    isEligible:
      (
        metrics
      ) =>
        metrics.explorationVisitedCount >=
        15,
  },
  {
    characterId:
      'tori',
    source:
      'relationshipReward',
    requirementText:
      '다른 6캐릭터 획득 + 친밀도 75 + 성장 XP 합계 250',
    progressText:
      (
        metrics
      ) =>
        (
          `획득 ${metrics.acquiredCount}/6 · ` +
          `친밀도 ${metrics.maxRelationshipPoints}/75 · ` +
          `성장 ${metrics.totalGrowthXp}/250 XP`
        ),
    isEligible:
      (
        metrics
      ) =>
        metrics.acquiredCount >=
          6 &&
        metrics.maxRelationshipPoints >=
          75 &&
        metrics.totalGrowthXp >=
          250,
  },
];

function finiteNumber(
  value: unknown
): number {
  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function uniqueStringCount(
  value: unknown
): number {
  if (
    !Array.isArray(
      value
    )
  ) {
    return 0;
  }

  return new Set(
    value
      .filter(
        (
          item
        ): item is string =>
          typeof item ===
            'string' &&
          item.length >
            0
      )
  ).size;
}

function getExplorationMetrics():
  Pick<
    CharacterAcquisitionMetrics,
    | 'explorationVisitedCount'
    | 'explorationPoints'
  > {
  const root =
    getRootOnboardingData() ??
    {};

  const exploration =
    (
      root
        ?.explorationData &&
      typeof root
        .explorationData ===
        'object'
    )
      ? root
          .explorationData
      : (
          root
            ?.rootData
            ?.explorationData &&
          typeof root
            .rootData
            .explorationData ===
            'object'
        )
        ? root
            .rootData
            .explorationData
        : {};

  const visitedCount =
    Math.max(
      uniqueStringCount(
        exploration
          ?.visitedPlaceIds
      ),
      uniqueStringCount(
        root
          ?.visitedPlaceIds
      )
    );

  const explorationPoints =
    Math.max(
      0,
      finiteNumber(
        exploration
          ?.points ??
        root
          ?.explorationPoints ??
        0
      )
    );

  return {
    explorationVisitedCount:
      visitedCount,
    explorationPoints,
  };
}

// CHARACTER_V97E_ACQUISITION_METRICS
export async function getCharacterAcquisitionMetrics():
  Promise<
    CharacterAcquisitionMetrics
  > {
  await Promise.all([
    loadCharacterProgression(),
    loadCharacterRelationships(),
  ]);

  const progression =
    getAllCharacterProgressionSnapshots();

  let totalGrowthXp =
    0;

  let acquiredCount =
    0;

  let maxRelationshipPoints =
    0;

  for (
    const characterId of
    CHARACTER_IDS
  ) {
    const snapshot =
      progression[
        characterId
      ];

    if (
      snapshot.acquired
    ) {
      acquiredCount +=
        1;

      totalGrowthXp +=
        Math.max(
          0,
          snapshot.growthXp
        );
    }

    maxRelationshipPoints =
      Math.max(
        maxRelationshipPoints,
        getCharacterRelationshipSnapshot(
          characterId
        ).points
      );
  }

  const exploration =
    getExplorationMetrics();

  return {
    rootyGrowthXp:
      progression
        .rooty
        .growthXp,
    totalGrowthXp,
    maxRelationshipPoints,
    explorationVisitedCount:
      exploration
        .explorationVisitedCount,
    explorationPoints:
      exploration
        .explorationPoints,
    acquiredCount,
  };
}

export function getCharacterAcquisitionRequirementText(
  characterId:
    CharacterId
): string {
  if (
    characterId ===
    'rooty'
  ) {
    return '기본 지급 캐릭터';
  }

  return (
    ACQUISITION_RULES.find(
      (
        rule
      ) =>
        rule.characterId ===
        characterId
    )
      ?.requirementText ??
    '획득 조건 준비 중'
  );
}

// CHARACTER_V97E_ACQUISITION_STATUS
export async function getCharacterAcquisitionRewardStatuses():
  Promise<
    CharacterAcquisitionRewardStatus[]
  > {
  const metrics =
    await getCharacterAcquisitionMetrics();

  const progression =
    getAllCharacterProgressionSnapshots();

  return ACQUISITION_RULES.map(
    (
      rule
    ) => ({
      characterId:
        rule.characterId,
      acquired:
        progression[
          rule.characterId
        ].acquired,
      eligible:
        rule.isEligible(
          metrics
        ),
      source:
        rule.source,
      requirementText:
        rule.requirementText,
      progressText:
        rule.progressText(
          metrics
        ),
    })
  );
}

// CHARACTER_V97E_ACQUISITION_EVALUATOR
export async function evaluateCharacterAcquisitionRewards():
  Promise<
    CharacterId[]
  > {
  const unlocked:
    CharacterId[] =
    [];

  await Promise.all([
    loadCharacterProgression(),
    loadCharacterRelationships(),
  ]);

  // Recalculate before every rule. Earlier unlocks in this same pass can
  // legitimately satisfy Tori's "six acquired characters" requirement.
  for (
    const rule of
    ACQUISITION_RULES
  ) {
    const progression =
      getAllCharacterProgressionSnapshots();

    if (
      progression[
        rule.characterId
      ].acquired
    ) {
      continue;
    }

    const metrics =
      await getCharacterAcquisitionMetrics();

    if (
      !rule.isEligible(
        metrics
      )
    ) {
      continue;
    }

    const acquired =
      await acquireCharacter(
        rule.characterId,
        rule.source
      );

    if (
      acquired
    ) {
      unlocked.push(
        rule.characterId
      );

      if (
        __DEV__
      ) {
        console.log(
          '[CHARACTER V97] acquisition reward unlocked',
          {
            characterId:
              rule.characterId,
            source:
              rule.source,
            requirement:
              rule.requirementText,
            metrics,
          }
        );
      }
    }
  }

  return unlocked;
}
