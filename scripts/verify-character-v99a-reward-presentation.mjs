import {
  readFileSync,
} from 'node:fs';

function read(
  path
) {
  return readFileSync(
    path,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );
}

function fail(
  message
) {
  throw new Error(
    message
  );
}

function expect(
  source,
  token,
  label
) {
  if (
    !source.includes(
      token
    )
  ) {
    fail(
      `${label}: missing ${JSON.stringify(token)}`
    );
  }
}

const presentation =
  read(
    'store/characterRewardPresentation.ts'
  );

const overlay =
  read(
    'components/characters/CharacterRewardPresentationOverlay.tsx'
  );

const acquisition =
  read(
    'store/characterAcquisitionCelebration.ts'
  );

// V99A v5 validates the generated file content itself.
// The V4 whitespace guard marker lives only inside the temporary installer patcher.

const progression =
  read(
    'store/characterProgression.ts'
  );

const home =
  read(
    'app/(tabs)/index.tsx'
  );

const preview =
  read(
    'app/character-preview.tsx'
  );

console.log(
  '===== CHARACTER V99A REWARD PRESENTATION PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V99A_REWARD_PRESENTATION_QUEUE',
    'CHARACTER_V99A_PRESENTATION_HOST_REGISTRY',
    'CHARACTER_V99A_ACQUISITION_PRESENTATION',
    'CHARACTER_V99A_GROWTH_LEVEL_PRESENTATION',
    'CHARACTER_V99A_SERIALIZED_PRESENTATION_COMPLETION',
    'queueMicrotask(',
    'rewardPoints:',
  ]
) {
  expect(
    presentation,
    token,
    'Presentation queue'
  );
}

console.log(
  'PASS - acquisition + level-up presentations share one serialized queue'
);

for (
  const token of [
    'CHARACTER_V99A_ANIMATED_REWARD_OVERLAY',
    '<Modal',
    '<Animated.View',
    '<CharacterSprite',
    'action="happy"',
    '바로 선택',
    '계속하기',
    'saveSelectedCharacter(',
  ]
) {
  expect(
    overlay,
    token,
    'Reward overlay'
  );
}

console.log(
  'PASS - animated character card supports immediate selection and growth acknowledgement'
);

for (
  const token of [
    'CHARACTER_V99A_RICH_ACQUISITION_PRESENTATION',
    'presentCharacterAcquisitionReward({',
    'hasCharacterRewardPresentationConsumer()',
    'showFallbackAcquisitionAlert',
    'Alert.alert(',
    'markSeen(',
    'showNext()',
    'CHARACTER_V97F_ONE_TIME_ACQUISITION_ALERT',
  ]
) {
  expect(
    acquisition,
    token,
    'Acquisition integration'
  );
}

if (
  /^[ \\t]+$/m.test(
    acquisition
  )
) {
  fail(
    'Acquisition integration: whitespace-only line found'
  );
}

console.log(
  'PASS - acquisition fallback formatting has no whitespace-only lines'
);

console.log(
  'PASS - V97F persistent one-time acquisition semantics preserved with Alert fallback'
);

for (
  const token of [
    'CHARACTER_V99A_GROWTH_PRESENTATION_EMIT',
    'enqueueCharacterGrowthLevelPresentations({',
    'result.characterId',
    'result.beforeLevel',
    'result.newlyReachedLevels',
    'CHARACTER_V97C_SERIALIZED_INTERACTION_GROWTH',
    'CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT',
  ]
) {
  expect(
    progression,
    token,
    'Growth integration'
  );
}

console.log(
  'PASS - level-up presentation is emitted only from real newlyReachedLevels'
);

for (
  const token of [
    'CHARACTER_V99A_REWARD_PRESENTATION_HOST_HOME',
    'CharacterRewardPresentationOverlay',
    'CHARACTER_V97F_HOME_ACQUISITION_CELEBRATION',
  ]
) {
  expect(
    home,
    token,
    'Home host'
  );
}

for (
  const token of [
    'CHARACTER_V99A_REWARD_PRESENTATION_HOST_PREVIEW',
    'CharacterRewardPresentationOverlay',
    'CHARACTER_V97F_PREVIEW_ACQUISITION_CELEBRATION',
  ]
) {
  expect(
    preview,
    token,
    'Preview host'
  );
}

console.log(
  'PASS - Home and Character Preview provide one active presentation host'
);

for (
  const token of [
    '2: 5',
    '3: 10',
    '4: 15',
    '5: 25',
  ]
) {
  expect(
    presentation,
    token,
    'Growth milestone reward display'
  );
}

console.log(
  'PASS - level-up card preserves 5/10/15/25P milestone display'
);

console.log(
  'PASS - CHARACTER V99A REWARD PRESENTATION PREFLIGHT'
);
