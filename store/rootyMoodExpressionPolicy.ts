import type {
  RootyConditionSnapshot,
} from './rootyCondition';

// ROOTY_BEHAVIOR_V61_MOOD_BASED_EXPRESSION_POLICY
export const ROOTY_MOOD_EXPRESSION_POLICY = {
  excitedSpontaneousHappyChance: 0.22,
} as const;

export function getRootySpontaneousHappyChance(
  condition:
    RootyConditionSnapshot
): number {
  if (
    !condition.flags.isExcited
  ) {
    return 0;
  }

  /**
   * V60 energy condition keeps priority.
   * A tired/exhausted Rooty should rest instead of
   * replacing a recovery opportunity with celebration.
   */
  if (
    condition.flags.isTired
  ) {
    return 0;
  }

  return (
    ROOTY_MOOD_EXPRESSION_POLICY
      .excitedSpontaneousHappyChance
  );
}

export function shouldStartRootySpontaneousHappy(
  condition:
    RootyConditionSnapshot,
  roll: number
): boolean {
  const chance =
    getRootySpontaneousHappyChance(
      condition
    );

  if (chance <= 0) {
    return false;
  }

  if (
    !Number.isFinite(roll)
  ) {
    return false;
  }

  return (
    roll >= 0 &&
    roll < chance
  );
}
