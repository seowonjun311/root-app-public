import type {
  RootyConditionSnapshot,
} from './rootyCondition';
import {
  applySelectedCharacterPersonalityToSocialChance,
} from './characterPersonalityPolicy';
import {
  applySelectedCharacterRelationshipToSocialChance,
} from './characterRelationship';

// ROOTY_BEHAVIOR_V64_BONDED_PASSIVE_SOCIAL_ATTENTION_POLICY
export const ROOTY_PASSIVE_SOCIAL_POLICY = {
  bondedAttentionChance: 0.12,
  attentionDurationMinMs: 900,
  attentionDurationMaxMs: 1400,
} as const;

export function getRootyBondedPassiveAttentionChance(
  condition:
    RootyConditionSnapshot
): number {
  // CHARACTER_V96B_V64_SELECTED_RELATIONSHIP_GATE
  // The selected-character relationship multiplier now owns
  // distant/familiar/close/bonded social familiarity.

/**
   * V60/V62 recovery and low-mood calm behavior
   * keep priority over passive social expression.
   */
  if (
    condition.flags.isTired ||
    condition.flags.isLowMood
  ) {
    return 0;
  }

  return (
    // CHARACTER_V76_PERSONALITY_SOCIAL_64
  // CHARACTER_V96B_RELATIONSHIP_SOCIAL_V64
    applySelectedCharacterRelationshipToSocialChance(
      'passiveAttention',
  applySelectedCharacterPersonalityToSocialChance(
        'passiveAttention',
        ROOTY_PASSIVE_SOCIAL_POLICY
        .bondedAttentionChance
      )
    )
  );
}

export function shouldStartRootyBondedPassiveAttention(
  condition:
    RootyConditionSnapshot,
  roll: number
): boolean {
  const chance =
    getRootyBondedPassiveAttentionChance(
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
