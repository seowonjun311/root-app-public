/**
 * ROOTY V65 keeps spontaneous expression spacing
 * independent from normal walk/rest behavior.
 */

// ROOTY_BEHAVIOR_V65_SPONTANEOUS_ANTI_REPETITION_COOLDOWN_POLICY
export const ROOTY_SPONTANEOUS_COOLDOWN_POLICY = {
  suppressedRestCycles: 2,
} as const;

export type RootySpontaneousCooldownResolution = {
  suppressed: boolean;
  currentCooldownCycles: number;
  nextCooldownCycles: number;
};

function normalizeCooldownCycles(
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

export function getRootySpontaneousCooldownAfterTrigger():
  number {
  return (
    ROOTY_SPONTANEOUS_COOLDOWN_POLICY
      .suppressedRestCycles
  );
}

export function resolveRootySpontaneousCooldown(
  cooldownCycles: number,
  skipConsume = false
): RootySpontaneousCooldownResolution {
  const currentCooldownCycles =
    normalizeCooldownCycles(
      cooldownCycles
    );

  const suppressed =
    currentCooldownCycles > 0;

  const nextCooldownCycles =
    suppressed &&
    !skipConsume
      ? Math.max(
          0,
          currentCooldownCycles - 1
        )
      : currentCooldownCycles;

  return {
    suppressed,
    currentCooldownCycles,
    nextCooldownCycles,
  };
}
