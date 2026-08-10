import type {
  RootyRestBehavior,
  RootyRestBehaviorProbabilities,
} from './rootyBehaviorPolicy';

// ROOTY_BEHAVIOR_V66_NORMAL_REST_ANTI_REPETITION_POLICY
export const ROOTY_REST_ANTI_REPEAT_POLICY = {
  repeatStreakThreshold: 2,
  repeatedBehaviorWeight: 0.55,
} as const;

export type RootyRestAntiRepeatState = {
  behavior:
    RootyRestBehavior |
    null;
  streak: number;
};

function normalizeStreak(
  value: number
): number {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value)
  );
}

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

export function getRootyRestAntiRepeatProbabilities(
  probabilities:
    RootyRestBehaviorProbabilities,
  state:
    RootyRestAntiRepeatState
): RootyRestBehaviorProbabilities {
  const normalized =
    normalizeProbabilities(
      probabilities
    );

  const streak =
    normalizeStreak(
      state.streak
    );

  if (
    state.behavior == null ||
    streak <
      ROOTY_REST_ANTI_REPEAT_POLICY
        .repeatStreakThreshold
  ) {
    return normalized;
  }

  const adjusted = {
    ...normalized,
  };

  adjusted[state.behavior] =
    adjusted[state.behavior] *
    ROOTY_REST_ANTI_REPEAT_POLICY
      .repeatedBehaviorWeight;

  return normalizeProbabilities(
    adjusted
  );
}

export function getRootyNextRestAntiRepeatState(
  state:
    RootyRestAntiRepeatState,
  behavior:
    RootyRestBehavior
): RootyRestAntiRepeatState {
  const currentStreak =
    normalizeStreak(
      state.streak
    );

  if (
    state.behavior ===
      behavior
  ) {
    return {
      behavior,
      streak:
        Math.min(
          999,
          currentStreak + 1
        ),
    };
  }

  return {
    behavior,
    streak: 1,
  };
}
