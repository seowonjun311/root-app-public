/**
 * ROOTY_BEHAVIOR_V19_CENTRALIZED_NATURAL_TUNING
 *
 * One source of truth for Rooty's natural routine tuning.
 * Movement/frame synchronization remains in ROOTY_WALK_MOTION.
 */
export const ROOTY_NATURAL_BEHAVIOR = {
  walkSessionMinSteps: 4,
  walkSessionMaxSteps: 7,

  headingMinSteps: 2,
  headingMaxSteps: 4,
  keepHeadingChance: 0.55,
  blockedRetryLimit: 3,

  postWalkRestDelayMinMs: 650,
  postWalkRestDelayMaxMs: 1200,

  restToWalkDelayMinMs: 800,
  restToWalkDelayMaxMs: 1500,

  lookTurnDelayMinMs: 650,
  lookTurnDelayMaxMs: 1100,
  lookReturnWalkDelayMinMs: 700,
  lookReturnWalkDelayMaxMs: 1400,

  sleepySitDelayMinMs: 1200,
  sleepySitDelayMaxMs: 2200,
  napDurationMinMs: 6500,
  napDurationMaxMs: 10500,
  wakeSitDelayMinMs: 900,
  wakeSitDelayMaxMs: 1400,

  sitRestDurationMinMs: 2800,
  sitRestDurationMaxMs: 4800,

  lookAroundThreshold: 0.45,
  sitRestThreshold: 0.78,

  nextCycleDelayMinMs: 1000,
  nextCycleDelayMaxMs: 1700,
} as const;
