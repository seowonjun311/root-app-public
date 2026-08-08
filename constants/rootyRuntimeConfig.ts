/**
 * ROOTY_BEHAVIOR_V20_RUNTIME_CONTINUITY_TUNING
 *
 * One source of truth for relaunch/resume timing.
 * Values intentionally preserve the existing V4 behavior.
 */
export const ROOTY_RUNTIME_CONTINUITY = {
  shortResumeWindowMs: 15_000,
  mediumResumeWindowMs: 10 * 60_000,

  sleepResumeDelayMs: 8_000,
  sitResumeDelayMs: 3_500,
  idleResumeDelayMs: 1_600,
  fallbackResumeDelayMs: 800,
} as const;
