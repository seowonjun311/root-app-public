import type {
  RootyConditionSnapshot,
} from './rootyCondition';

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
  if (
    !condition.flags.isBonded
  ) {
    return 0;
  }

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
    ROOTY_PASSIVE_SOCIAL_POLICY
      .bondedAttentionChance
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
