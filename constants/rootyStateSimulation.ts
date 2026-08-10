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

  /**
   * ROOTY_BEHAVIOR_V57_TIME_BASED_STATE_DRIFT_CONFIG
   *
   * While the app is active, mood moves one point toward 70
   * after each uninterrupted 10-minute active interval.
   *
   * V57 intentionally does not simulate background/offline time.
   */
  moodBaseline: 70,
  moodDriftStep: 1,
  moodDriftIntervalMs: 10 * 60_000,

  /**
   * ROOTY_BEHAVIOR_V58_OFFLINE_STATE_DRIFT_CONFIG
   *
   * Offline/background mood catch-up reuses the V57 interval
   * and step, but one return is capped so long absences do not
   * cause an abrupt state jump.
   */
  offlineMoodMaxAdjustment: 6,
} as const;
