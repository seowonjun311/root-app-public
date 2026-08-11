import {
  type CharacterId,
} from './characterAssets';

export type CharacterAcquisitionSource =
  | 'starter'
  | 'legacy'
  | 'growthReward'
  | 'relationshipReward'
  | 'explorationReward'
  | 'eventReward'
  | 'points'
  | 'admin';

export type CharacterGrowthLevel =
  | 1
  | 2
  | 3
  | 4
  | 5;

export type CharacterGrowthReward = {
  level:
    CharacterGrowthLevel;
  minXp: number;
  pointReward: number;
};

// CHARACTER_V97A_GROWTH_LEVEL_POLICY
export const CHARACTER_GROWTH_LEVELS:
  readonly CharacterGrowthReward[] = [
  {
    level: 1,
    minXp: 0,
    pointReward: 0,
  },
  {
    level: 2,
    minXp: 25,
    pointReward: 5,
  },
  {
    level: 3,
    minXp: 75,
    pointReward: 10,
  },
  {
    level: 4,
    minXp: 150,
    pointReward: 15,
  },
  {
    level: 5,
    minXp: 250,
    pointReward: 25,
  },
] as const;

export const CHARACTER_MAX_GROWTH_LEVEL:
  CharacterGrowthLevel =
  5;

// CHARACTER_V97A_STARTER_ACQUISITION_POLICY
// Rooty remains the guaranteed starter character.
// V97B will introduce lock-aware selection with a legacy-safe migration.
export const CHARACTER_STARTER_ACQUIRED:
  Record<
    CharacterId,
    boolean
  > = {
  rooty: true,
  moru: false,
  mongsil: false,
  dami: false,
  pio: false,
  nuri: false,
  tori: false,
};

function normalizeXp(
  xp: number
): number {
  if (
    !Number.isFinite(
      xp
    ) ||
    xp <= 0
  ) {
    return 0;
  }

  return Math.floor(
    xp
  );
}

export function getCharacterGrowthLevel(
  xp: number
): CharacterGrowthLevel {
  const value =
    normalizeXp(
      xp
    );

  let level:
    CharacterGrowthLevel =
    1;

  for (
    const milestone of
    CHARACTER_GROWTH_LEVELS
  ) {
    if (
      value >=
      milestone.minXp
    ) {
      level =
        milestone.level;
    }
  }

  return level;
}

export function getCharacterGrowthReward(
  level:
    CharacterGrowthLevel
): CharacterGrowthReward {
  const found =
    CHARACTER_GROWTH_LEVELS.find(
      (item) =>
        item.level ===
        level
    );

  if (
    !found
  ) {
    return CHARACTER_GROWTH_LEVELS[
      0
    ];
  }

  return found;
}

export function getCharacterNextGrowthThreshold(
  xp: number
): number | null {
  const value =
    normalizeXp(
      xp
    );

  for (
    const milestone of
    CHARACTER_GROWTH_LEVELS
  ) {
    if (
      milestone.minXp >
      value
    ) {
      return milestone.minXp;
    }
  }

  return null;
}

export function getCharacterNewlyReachedGrowthLevels(
  beforeXp: number,
  afterXp: number
): CharacterGrowthLevel[] {
  const before =
    normalizeXp(
      beforeXp
    );

  const after =
    normalizeXp(
      afterXp
    );

  if (
    after <= before
  ) {
    return [];
  }

  return CHARACTER_GROWTH_LEVELS
    .filter(
      (milestone) =>
        milestone.level > 1 &&
        milestone.minXp >
          before &&
        milestone.minXp <=
          after
    )
    .map(
      (milestone) =>
        milestone.level
    );
}
