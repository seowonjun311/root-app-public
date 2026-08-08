/**
 * ROOTY_BEHAVIOR_V11_SYNCHRONIZED_WALK_MOTION
 *
 * One source of truth for Rooty's visual walk rhythm and village movement.
 * Tune these values together after phone visual verification.
 */
export const ROOTY_WALK_MOTION = {
  stepX: 40,
  stepY: 20,

  /**
   * One village movement step.
   */
  stepDurationMs: 900,

  /**
   * PNG frame rhythm.
   *
   * Generic walk has four frames:
   * 4 * 225ms = 900ms, one complete generic walk frame cycle per move step.
   *
   * V6 upRight has two frames:
   * 2 * 225ms = 450ms, two visual gait cycles per move step.
   */
  frameMs: 225,

  /**
   * Small RootySprite up/down body motion.
   * Up 225ms + down 225ms = 450ms.
   */
  bobHalfCycleMs: 225,

  /**
   * Schedule the next movement shortly after the current 900ms timing ends.
   */
  nextStepDelayMinMs: 1000,
  nextStepDelayMaxMs: 1150,

  blockedRetryDelayMinMs: 250,
  blockedRetryDelayMaxMs: 500,
} as const;
