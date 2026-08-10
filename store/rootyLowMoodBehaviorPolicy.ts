import type {
  RootyConditionSnapshot,
} from './rootyCondition';

import type {
  RootyRestBehaviorProbabilities,
} from './rootyBehaviorPolicy';

// ROOTY_BEHAVIOR_V62_LOW_MOOD_CALM_REST_POLICY
export const ROOTY_LOW_MOOD_BEHAVIOR_POLICY = {
  lookAroundWeight: 0.75,
  sitRestWeight: 1.30,
  napWeight: 1.00,
} as const;

function normalizeRestProbabilities(
  probabilities:
    RootyRestBehaviorProbabilities
): RootyRestBehaviorProbabilities {
  const lookAround =
    Math.max(
      0,
      probabilities.lookAround
    );

  const sitRest =
    Math.max(
      0,
      probabilities.sitRest
    );

  const nap =
    Math.max(
      0,
      probabilities.nap
    );

  const total =
    lookAround +
    sitRest +
    nap;

  if (total <= 0) {
    return {
      lookAround: 1 / 3,
      sitRest: 1 / 3,
      nap: 1 / 3,
    };
  }

  return {
    lookAround:
      lookAround / total,
    sitRest:
      sitRest / total,
    nap:
      nap / total,
  };
}

export function getRootyLowMoodRestProbabilities(
  energyProbabilities:
    RootyRestBehaviorProbabilities,
  condition:
    RootyConditionSnapshot
): RootyRestBehaviorProbabilities {
  if (
    !condition.flags.isLowMood
  ) {
    return energyProbabilities;
  }

  /**
   * V60 energy priority remains authoritative.
   * When tired/exhausted, preserve the exact V60 result
   * so V62 never weakens recovery behavior.
   */
  if (
    condition.flags.isTired
  ) {
    return energyProbabilities;
  }

  return normalizeRestProbabilities({
    lookAround:
      energyProbabilities.lookAround *
      ROOTY_LOW_MOOD_BEHAVIOR_POLICY
        .lookAroundWeight,
    sitRest:
      energyProbabilities.sitRest *
      ROOTY_LOW_MOOD_BEHAVIOR_POLICY
        .sitRestWeight,
    nap:
      energyProbabilities.nap *
      ROOTY_LOW_MOOD_BEHAVIOR_POLICY
        .napWeight,
  });
}
