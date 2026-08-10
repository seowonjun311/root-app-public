import type {
  RootyState,
} from './rootyState';

// ROOTY_BEHAVIOR_V59_CONDITION_CLASSIFICATION
export type RootyMoodCondition =
  | 'low'
  | 'calm'
  | 'happy'
  | 'excited';

export type RootyEnergyCondition =
  | 'exhausted'
  | 'tired'
  | 'normal'
  | 'energetic';

export type RootyAffectionCondition =
  | 'distant'
  | 'familiar'
  | 'close'
  | 'bonded';

export type RootyConditionSnapshot = {
  mood:
    RootyMoodCondition;
  energy:
    RootyEnergyCondition;
  affection:
    RootyAffectionCondition;
  flags: {
    isLowMood: boolean;
    isExcited: boolean;
    isTired: boolean;
    isExhausted: boolean;
    isEnergetic: boolean;
    isBonded: boolean;
  };
};

function normalizeConditionValue(
  value: number
) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value)
    )
  );
}

export function getRootyMoodCondition(
  mood: number
): RootyMoodCondition {
  const value =
    normalizeConditionValue(
      mood
    );

  if (value < 30) {
    return 'low';
  }

  if (value < 60) {
    return 'calm';
  }

  if (value < 85) {
    return 'happy';
  }

  return 'excited';
}

export function getRootyEnergyCondition(
  energy: number
): RootyEnergyCondition {
  const value =
    normalizeConditionValue(
      energy
    );

  if (value < 25) {
    return 'exhausted';
  }

  if (value < 50) {
    return 'tired';
  }

  if (value < 75) {
    return 'normal';
  }

  return 'energetic';
}

export function getRootyAffectionCondition(
  affection: number
): RootyAffectionCondition {
  const value =
    normalizeConditionValue(
      affection
    );

  if (value < 25) {
    return 'distant';
  }

  if (value < 50) {
    return 'familiar';
  }

  if (value < 75) {
    return 'close';
  }

  return 'bonded';
}

export function getRootyConditionSnapshot(
  state: RootyState
): RootyConditionSnapshot {
  const mood =
    getRootyMoodCondition(
      state.mood
    );

  const energy =
    getRootyEnergyCondition(
      state.energy
    );

  const affection =
    getRootyAffectionCondition(
      state.affection
    );

  return {
    mood,
    energy,
    affection,
    flags: {
      isLowMood:
        mood === 'low',
      isExcited:
        mood === 'excited',
      isTired:
        energy === 'tired' ||
        energy === 'exhausted',
      isExhausted:
        energy === 'exhausted',
      isEnergetic:
        energy === 'energetic',
      isBonded:
        affection === 'bonded',
    },
  };
}
