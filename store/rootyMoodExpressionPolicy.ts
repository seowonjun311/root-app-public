import type {
  RootyConditionSnapshot,
} from './rootyCondition';
import {
  applySelectedCharacterPersonalityToSocialChance,
} from './characterPersonalityPolicy';
import {
  applySelectedCharacterRelationshipToSocialChance,
} from './characterRelationship';

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
    // CHARACTER_V76_PERSONALITY_SOCIAL_61
  // CHARACTER_V96B_RELATIONSHIP_SOCIAL_V61
    applySelectedCharacterRelationshipToSocialChance(
      'spontaneousHappy',
  applySelectedCharacterPersonalityToSocialChance(
        'spontaneousHappy',
        ROOTY_MOOD_EXPRESSION_POLICY
        .excitedSpontaneousHappyChance
      )
    )
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
