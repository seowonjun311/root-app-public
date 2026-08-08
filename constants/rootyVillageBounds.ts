/**
 * ROOTY_BEHAVIOR_V21_CENTRALIZED_VILLAGE_BOUNDS
 *
 * One source of truth for Rooty's allowed village movement area.
 * Values intentionally preserve existing Home and runtime behavior.
 */
export const ROOTY_VILLAGE_BOUNDS = {
  minX: 120,
  maxX: 1200,
  minY: 80,
  maxY: 900,
} as const;
