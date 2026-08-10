/**
 * ROOTY_BEHAVIOR_V56_AUTOMATIC_STATE_CHANGE_CONFIG
 *
 * First automatic state-simulation layer.
 *
 * V56 intentionally changes energy only:
 * - completed walk session: -2
 * - completed look-around: -1
 * - completed sit rest: +2
 * - completed nap: +6
 *
 * mood and affection remain interaction-driven in V56.
 */
export const ROOTY_STATE_SIMULATION = {
  walkSessionEnergyDelta: -2,
  lookAroundEnergyDelta: -1,
  sitRestEnergyDelta: 2,
  napEnergyDelta: 6,
} as const;
