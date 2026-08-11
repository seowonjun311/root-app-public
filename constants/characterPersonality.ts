import {
  type CharacterId,
} from './characterAssets';

export type CharacterPersonalityId =
  'balanced' |
  'curious-active' |
  'cozy-calm' |
  'social-warm';

export type CharacterPersonalityProfile = {
  id: CharacterPersonalityId;
  restMultipliers: {
    lookAround: number;
    sitRest: number;
    nap: number;
  };
  socialChanceMultipliers: {
    spontaneousHappy: number;
    passiveAttention: number;
    bondedFollowUpTouch: number;
  };
};

// CHARACTER_V75_PERSONALITY_PROFILE
export const CHARACTER_PERSONALITY:
  Record<
    CharacterId,
    CharacterPersonalityProfile
  > = {
  rooty: {
    id: 'balanced',
    restMultipliers: {
      lookAround: 1,
      sitRest: 1,
      nap: 1,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 1,
      passiveAttention: 1,
      bondedFollowUpTouch: 1,
    },
  },
  moru: {
    id: 'curious-active',
    restMultipliers: {
      lookAround: 1.25,
      sitRest: 0.95,
      nap: 0.7,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 1.35,
      passiveAttention: 0.85,
      bondedFollowUpTouch: 0.9,
    },
  },
  mongsil: {
    id: 'cozy-calm',
    restMultipliers: {
      lookAround: 0.75,
      sitRest: 1.15,
      nap: 1.45,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 0.75,
      passiveAttention: 0.9,
      bondedFollowUpTouch: 1,
    },
  },
  dami: {
    id: 'social-warm',
    restMultipliers: {
      lookAround: 1.15,
      sitRest: 1.2,
      nap: 0.8,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 1.15,
      passiveAttention: 1.5,
      bondedFollowUpTouch: 1.4,
    },
  },  // CHARACTER_V90B_PIO_PERSONALITY
  pio: {
    id: 'curious-active',
    restMultipliers: {
      lookAround: 1.25,
      sitRest: 0.95,
      nap: 0.7,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 1.35,
      passiveAttention: 0.85,
      bondedFollowUpTouch: 0.9,
    },
  },

};

export function getCharacterPersonalityProfile(
  characterId: CharacterId
): CharacterPersonalityProfile {
  return CHARACTER_PERSONALITY[
    characterId
  ];
}
