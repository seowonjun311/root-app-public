export type StandardCharacterFacing =
  'left' |
  'right' |
  'neutral';

function normalizeDirection(
  value: unknown
): string {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  return value
    .toLowerCase()
    .replace(
      /[^a-z]/g,
      ''
    );
}

// CHARACTER_V74_STANDARD_CHARACTER_FACING_POLICY
export function resolveStandardCharacterFacing(
  direction: unknown
): StandardCharacterFacing {
  const normalized =
    normalizeDirection(
      direction
    );

  if (
    normalized.includes(
      'left'
    )
  ) {
    return 'left';
  }

  if (
    normalized.includes(
      'right'
    )
  ) {
    return 'right';
  }

  return 'neutral';
}

export function resolveStandardCharacterScaleX(
  direction: unknown
): 1 | -1 {
  return (
    resolveStandardCharacterFacing(
      direction
    ) === 'left'
      ? -1
      : 1
  );
}
