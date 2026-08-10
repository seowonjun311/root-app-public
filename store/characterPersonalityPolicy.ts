import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  getCharacterPersonalityProfile,
} from '../constants/characterPersonality';
import {
  getSelectedCharacterSnapshot,
} from './selectedCharacter';

export type CharacterRestWeights = {
  lookAround: number;
  sitRest: number;
  nap: number;
};

export type CharacterSocialChanceChannel =
  'spontaneousHappy' |
  'passiveAttention' |
  'bondedFollowUpTouch';

function clamp01(
  value: number
): number {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  if (
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

function safeWeight(
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

  return value;
}

function normalizeRestWeights(
  weights:
    CharacterRestWeights
): CharacterRestWeights {
  const lookAround =
    safeWeight(
      weights.lookAround
    );

  const sitRest =
    safeWeight(
      weights.sitRest
    );

  const nap =
    safeWeight(
      weights.nap
    );

  const total =
    lookAround +
    sitRest +
    nap;

  if (
    total <= 0
  ) {
    return {
      lookAround:
        1 / 3,
      sitRest:
        1 / 3,
      nap:
        1 / 3,
    };
  }

  return {
    lookAround:
      lookAround /
      total,
    sitRest:
      sitRest /
      total,
    nap:
      nap /
      total,
  };
}

// CHARACTER_V75_PERSONALITY_PROBABILITY_POLICY
export function applyCharacterPersonalityToRestWeights(
  characterId: CharacterId,
  weights:
    CharacterRestWeights
): CharacterRestWeights {
  if (
    characterId ===
    'rooty'
  ) {
    return {
      ...weights,
    };
  }

  const profile =
    getCharacterPersonalityProfile(
      characterId
    );

  return normalizeRestWeights({
    lookAround:
      weights.lookAround *
      profile.restMultipliers.lookAround,
    sitRest:
      weights.sitRest *
      profile.restMultipliers.sitRest,
    nap:
      weights.nap *
      profile.restMultipliers.nap,
  });
}

export function applyCharacterPersonalityToSocialChance(
  characterId: CharacterId,
  channel:
    CharacterSocialChanceChannel,
  baseChance: number
): number {
  const base =
    clamp01(
      baseChance
    );

  if (
    characterId ===
    'rooty'
  ) {
    return base;
  }

  const multiplier =
    getCharacterPersonalityProfile(
      characterId
    )
      .socialChanceMultipliers[
        channel
      ];

  return clamp01(
    base *
    multiplier
  );
}

// CHARACTER_V76_SELECTED_CHARACTER_RUNTIME_ADAPTERS
export function applySelectedCharacterPersonalityToRestWeights(
  weights:
    CharacterRestWeights
): CharacterRestWeights {
  return applyCharacterPersonalityToRestWeights(
    getSelectedCharacterSnapshot(),
    weights
  );
}

export function applySelectedCharacterPersonalityToSocialChance(
  channel:
    CharacterSocialChanceChannel,
  baseChance: number
): number {
  return applyCharacterPersonalityToSocialChance(
    getSelectedCharacterSnapshot(),
    channel,
    baseChance
  );
}
