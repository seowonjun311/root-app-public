import type {
  RootyConditionSnapshot,
} from './rootyCondition';
import {
  applySelectedCharacterPersonalityToSocialChance,
} from './characterPersonalityPolicy';

// ROOTY_BEHAVIOR_V63_AFFECTION_SOCIAL_RESPONSE_POLICY
export const ROOTY_AFFECTION_INTERACTION_POLICY = {
  bondedTapFollowUpTouchChance: 0.35,
} as const;

export function getRootyBondedTapFollowUpChance(
  condition:
    RootyConditionSnapshot
): number {
  if (
    !condition.flags.isBonded
  ) {
    return 0;
  }

  return (
    // CHARACTER_V76_PERSONALITY_SOCIAL_63
    applySelectedCharacterPersonalityToSocialChance(
      'bondedFollowUpTouch',
      ROOTY_AFFECTION_INTERACTION_POLICY
      .bondedTapFollowUpTouchChance
    )
  );
}

export function shouldQueueRootyBondedTapFollowUp(
  condition:
    RootyConditionSnapshot,
  roll: number
): boolean {
  const chance =
    getRootyBondedTapFollowUpChance(
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
