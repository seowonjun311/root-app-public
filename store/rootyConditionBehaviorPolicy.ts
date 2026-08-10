import {
  ROOTY_NATURAL_BEHAVIOR,
} from '../constants/rootyBehavior';

import type {
  RootyEnergyCondition,
} from './rootyCondition';

import type {
  RootyRestBehaviorProbabilities,
} from './rootyBehaviorPolicy';

// ROOTY_BEHAVIOR_V60_CONDITION_BASED_BEHAVIOR_POLICY
export type RootyWalkStepRange = {
  minSteps: number;
  maxSteps: number;
};

type RootyRestWeightSet = {
  lookAround: number;
  sitRest: number;
  nap: number;
};

const ROOTY_CONDITION_REST_WEIGHTS:
  Record<
    RootyEnergyCondition,
    RootyRestWeightSet
  > = {
    exhausted: {
      lookAround: 0.55,
      sitRest: 0.95,
      nap: 1.75,
    },
    tired: {
      lookAround: 0.80,
      sitRest: 1.05,
      nap: 1.30,
    },
    normal: {
      lookAround: 1,
      sitRest: 1,
      nap: 1,
    },
    energetic: {
      lookAround: 1,
      sitRest: 1,
      nap: 1,
    },
  };

function normalizeProbabilities(
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

export function getRootyConditionWalkStepRange(
  energyCondition:
    RootyEnergyCondition
): RootyWalkStepRange {
  if (
    energyCondition ===
    'exhausted'
  ) {
    return {
      minSteps: 2,
      maxSteps: 3,
    };
  }

  if (
    energyCondition ===
    'tired'
  ) {
    return {
      minSteps: 3,
      maxSteps: 5,
    };
  }

  return {
    minSteps:
      ROOTY_NATURAL_BEHAVIOR
        .walkSessionMinSteps,
    maxSteps:
      ROOTY_NATURAL_BEHAVIOR
        .walkSessionMaxSteps,
  };
}

export function getRootyConditionRestProbabilities(
  baseProbabilities:
    RootyRestBehaviorProbabilities,
  energyCondition:
    RootyEnergyCondition
): RootyRestBehaviorProbabilities {
  const weights =
    ROOTY_CONDITION_REST_WEIGHTS[
      energyCondition
    ];

  return normalizeProbabilities({
    lookAround:
      baseProbabilities.lookAround *
      weights.lookAround,
    sitRest:
      baseProbabilities.sitRest *
      weights.sitRest,
    nap:
      baseProbabilities.nap *
      weights.nap,
  });
}
