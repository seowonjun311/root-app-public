import { ROOTY_NATURAL_BEHAVIOR } from '../constants/rootyBehavior';
import type { RootyState } from './rootyState';

/**
 * ROOTY_BEHAVIOR_V55_STATE_BASED_PROBABILITY_POLICY
 *
 * V19 remains the baseline natural-behavior tuning.
 * V55 only changes which rest behavior is selected after walking.
 *
 * State values:
 * - mood: 0..100
 * - energy: 0..100
 * - affection: 0..100
 *
 * Baseline V19 probabilities:
 * - lookAround: 45%
 * - sitRest: 33%
 * - nap: 22%
 */
export type RootyRestBehavior =
  | 'lookAround'
  | 'sitRest'
  | 'nap';

export type RootyRestBehaviorProbabilities = {
  lookAround: number;
  sitRest: number;
  nap: number;
};

const ROOTY_MIN_REST_PROBABILITY =
  0.05;

function clamp01(
  value: number
) {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

function normalizeStateValue(
  value: number
) {
  const normalized =
    Number.isFinite(value)
      ? Math.max(
          0,
          Math.min(
            100,
            value
          )
        )
      : 50;

  return (
    normalized - 50
  ) / 50;
}

export function getRootyStateRestProbabilities(
  state: RootyState
): RootyRestBehaviorProbabilities {
  const energy =
    normalizeStateValue(
      state.energy
    );

  const mood =
    normalizeStateValue(
      state.mood
    );

  const affection =
    normalizeStateValue(
      state.affection
    );

  const baseLookAround =
    clamp01(
      ROOTY_NATURAL_BEHAVIOR
        .lookAroundThreshold
    );

  const baseSitRest =
    clamp01(
      ROOTY_NATURAL_BEHAVIOR
        .sitRestThreshold -
        ROOTY_NATURAL_BEHAVIOR
          .lookAroundThreshold
    );

  const baseNap =
    clamp01(
      1 -
        ROOTY_NATURAL_BEHAVIOR
          .sitRestThreshold
    );

  /*
   * Adjustments sum to zero before the minimum floor:
   *
   * energy:
   *   look +0.10 / sit -0.02 / nap -0.08
   *
   * mood:
   *   look +0.06 / sit -0.01 / nap -0.05
   *
   * affection:
   *   look +0.02 / sit -0.01 / nap -0.01
   *
   * High energy/mood therefore favors alert look-around behavior.
   * Low energy/mood shifts weight toward sitting and sleeping.
   * Affection is intentionally a small modifier in V55 so user
   * interaction influences personality without overpowering energy.
   */
  const rawLookAround =
    baseLookAround +
    (0.10 * energy) +
    (0.06 * mood) +
    (0.02 * affection);

  const rawSitRest =
    baseSitRest -
    (0.02 * energy) -
    (0.01 * mood) -
    (0.01 * affection);

  const rawNap =
    baseNap -
    (0.08 * energy) -
    (0.05 * mood) -
    (0.01 * affection);

  const lookAroundWeight =
    Math.max(
      ROOTY_MIN_REST_PROBABILITY,
      rawLookAround
    );

  const sitRestWeight =
    Math.max(
      ROOTY_MIN_REST_PROBABILITY,
      rawSitRest
    );

  const napWeight =
    Math.max(
      ROOTY_MIN_REST_PROBABILITY,
      rawNap
    );

  const total =
    lookAroundWeight +
    sitRestWeight +
    napWeight;

  return {
    lookAround:
      lookAroundWeight /
      total,
    sitRest:
      sitRestWeight /
      total,
    nap:
      napWeight /
      total,
  };
}

export function pickRootyRestBehavior(
  probabilities:
    RootyRestBehaviorProbabilities,
  roll = Math.random()
): RootyRestBehavior {
  const safeRoll =
    Number.isFinite(roll)
      ? Math.max(
          0,
          Math.min(
            0.999999999999,
            roll
          )
        )
      : Math.random();

  if (
    safeRoll <
    probabilities.lookAround
  ) {
    return 'lookAround';
  }

  if (
    safeRoll <
    probabilities.lookAround +
      probabilities.sitRest
  ) {
    return 'sitRest';
  }

  return 'nap';
}
