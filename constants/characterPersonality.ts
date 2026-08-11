import {
  type CharacterId,
} from './characterAssets';

export type CharacterPersonalityId =
  'balanced' |
  'curious-active' |
  'cozy-calm' |
  'social-warm' |
  'explorer-curious' |
  'playful-adventurous' |
  'gentle-shy';

export type CharacterPersonalityProfile = {
  id: CharacterPersonalityId;
  // CHARACTER_V95B_PERSONALITY_POLICY_VERSION
  policyVersion: number;
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
    policyVersion: 1,
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
    policyVersion: 1,
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
    policyVersion: 1,
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
    policyVersion: 1,
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
  // CHARACTER_V95A_PIO_EXPLORER_IDENTITY
pio: {
    id: 'explorer-curious',
    policyVersion: 2,
    restMultipliers: {
      lookAround: 1.55,
      sitRest: 0.85,
      nap: 0.55,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 1.15,
      passiveAttention: 0.75,
      bondedFollowUpTouch: 0.85,
    },
  },
  // CHARACTER_V91B_NURI_PERSONALITY
  // CHARACTER_V95A_NURI_PLAYFUL_IDENTITY
nuri: {
    id: 'playful-adventurous',
    policyVersion: 2,
    restMultipliers: {
      lookAround: 1.15,
      sitRest: 0.8,
      nap: 0.6,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 1.65,
      passiveAttention: 1.05,
      bondedFollowUpTouch: 1,
    },
  },
  // CHARACTER_V92B_TORI_PERSONALITY
  // CHARACTER_V93_TORI_GENTLE_SHY_PERSONALITY
  // Tori stays on the validated social-warm runtime profile id, while
  // these per-character multipliers make the behavior more reserved:
  // quiet observation, longer seated rest, less unsolicited celebration,
  // and warmer follow-up interaction after bonding.
  // CHARACTER_V95A_TORI_GENTLE_SHY_IDENTITY
tori: {
    id: 'gentle-shy',
    policyVersion: 2,
    restMultipliers: {
      lookAround: 1.25,
      sitRest: 1.45,
      nap: 1.1,
    },
    socialChanceMultipliers: {
      spontaneousHappy: 0.8,
      passiveAttention: 0.85,
      bondedFollowUpTouch: 1.55,
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
