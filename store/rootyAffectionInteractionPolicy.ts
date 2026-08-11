import type {
  RootyConditionSnapshot,
} from './rootyCondition';
import {
  applySelectedCharacterPersonalityToSocialChance,
} from './characterPersonalityPolicy';
import {
  applySelectedCharacterRelationshipToSocialChance,
} from './characterRelationship';

// ROOTY_BEHAVIOR_V63_AFFECTION_SOCIAL_RESPONSE_POLICY
export const ROOTY_AFFECTION_INTERACTION_POLICY = {
  bondedTapFollowUpTouchChance: 0.35,
} as const;

export function getRootyBondedTapFollowUpChance(
  condition:
    RootyConditionSnapshot
): number {
  // CHARACTER_V96B_V63_SELECTED_RELATIONSHIP_GATE
  // The selected-character relationship multiplier now owns the
  // distant/familiar/close/bonded progression.
  void condition;

return (
    // CHARACTER_V76_PERSONALITY_SOCIAL_63
  // CHARACTER_V96B_RELATIONSHIP_SOCIAL_V63
    applySelectedCharacterRelationshipToSocialChance(
      'bondedFollowUpTouch',
  applySelectedCharacterPersonalityToSocialChance(
        'bondedFollowUpTouch',
        ROOTY_AFFECTION_INTERACTION_POLICY
        .bondedTapFollowUpTouchChance
      )
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
