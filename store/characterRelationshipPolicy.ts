export type CharacterRelationshipTier =
  | 'distant'
  | 'familiar'
  | 'close'
  | 'bonded';

export type CharacterRelationshipSocialChannel =
  | 'spontaneousHappy'
  | 'passiveAttention'
  | 'bondedFollowUpTouch';

export type CharacterRelationshipSocialMultipliers = {
  spontaneousHappy: number;
  passiveAttention: number;
  bondedFollowUpTouch: number;
};

// CHARACTER_V96A_RELATIONSHIP_THRESHOLDS
// Keep the semantic boundaries aligned with the established V59 affection
// language while relationship points become per-character in V96+.
export const CHARACTER_RELATIONSHIP_THRESHOLDS = {
  familiar: 25,
  close: 50,
  bonded: 75,
} as const;

// CHARACTER_V96A_RELATIONSHIP_SOCIAL_POLICY
// Personality (V75/V95) answers "who is this character?".
// Relationship answers "how comfortable is this character with this user?".
//
// These multipliers are FOUNDATION ONLY in V96A. They are not wired into
// Home behavior until V96B.
export const CHARACTER_RELATIONSHIP_SOCIAL_MULTIPLIERS:
  Record<
    CharacterRelationshipTier,
    CharacterRelationshipSocialMultipliers
  > = {
  distant: {
    spontaneousHappy: 0.75,
    passiveAttention: 0,
    bondedFollowUpTouch: 0,
  },
  familiar: {
    spontaneousHappy: 0.9,
    passiveAttention: 0.25,
    bondedFollowUpTouch: 0,
  },
  close: {
    spontaneousHappy: 1,
    passiveAttention: 0.6,
    bondedFollowUpTouch: 0.35,
  },
  bonded: {
    spontaneousHappy: 1.05,
    passiveAttention: 1,
    bondedFollowUpTouch: 1,
  },
};

function normalizePoints(
  points: number
): number {
  if (
    !Number.isFinite(
      points
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        points
      )
    )
  );
}

function clampChance(
  value: number
): number {
  if (
    !Number.isFinite(
      value
    ) ||
    value <= 0
  ) {
    return 0;
  }

  if (
    value >= 1
  ) {
    return 1;
  }

  return value;
}

// CHARACTER_V96A_RELATIONSHIP_TIER_CLASSIFIER
export function getCharacterRelationshipTier(
  points: number
): CharacterRelationshipTier {
  const value =
    normalizePoints(
      points
    );

  if (
    value <
    CHARACTER_RELATIONSHIP_THRESHOLDS
      .familiar
  ) {
    return 'distant';
  }

  if (
    value <
    CHARACTER_RELATIONSHIP_THRESHOLDS
      .close
  ) {
    return 'familiar';
  }

  if (
    value <
    CHARACTER_RELATIONSHIP_THRESHOLDS
      .bonded
  ) {
    return 'close';
  }

  return 'bonded';
}

export function getCharacterRelationshipSocialMultiplier(
  tier: CharacterRelationshipTier,
  channel: CharacterRelationshipSocialChannel
): number {
  return (
    CHARACTER_RELATIONSHIP_SOCIAL_MULTIPLIERS[
      tier
    ][
      channel
    ]
  );
}

export function applyCharacterRelationshipToSocialChance(
  tier: CharacterRelationshipTier,
  channel: CharacterRelationshipSocialChannel,
  chance: number
): number {
  const base =
    clampChance(
      chance
    );

  return clampChance(
    base *
      getCharacterRelationshipSocialMultiplier(
        tier,
        channel
      )
  );
}
