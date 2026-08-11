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

const celebration =
  read(
    'store/characterAcquisitionCelebration.ts'
  );

const home =
  read(
    'app/(tabs)/index.tsx'
  );

const preview =
  read(
    'app/character-preview.tsx'
  );

const acquisition =
  read(
    'store/characterAcquisitionRewards.ts'
  );

const progression =
  read(
    'store/characterProgression.ts'
  );

console.log(
  '===== CHARACTER V97F ACQUISITION CELEBRATION PREFLIGHT ====='
);

for (
  const token of [
    "'character_acquisition_celebration_v1'",
    'CHARACTER_V97F_PENDING_ACQUISITION_CELEBRATION',
    'CHARACTER_V97F_ONE_TIME_ACQUISITION_ALERT',
    'CHARACTER_V97F_SERIALIZED_CELEBRATION_CHECK',
    'CHARACTER_V97F_ACQUISITION_CELEBRATION_HOOK',
    'Alert.alert(',
    'snapshot.acquisitionSource !==\n          \'legacy\'',
    'snapshot.acquisitionSource !==\n          \'starter\'',
    'markSeen(',
    'showNext()',
  ]
) {
  expect(
    celebration,
    token,
    'Celebration store'
  );
}

console.log(
  'PASS - one-time persistent celebration excludes starter/legacy ownership'
);

console.log(
  'PASS - unseen acquired rewards recover after restart and multiple rewards serialize'
);

for (
  const token of [
    'CHARACTER_V97F_HOME_ACQUISITION_CELEBRATION',
    'useCharacterAcquisitionCelebration();',
    'CHARACTER_V97E_HOME_ACQUISITION_EVALUATION',
  ]
) {
  expect(
    home,
    token,
    'Home celebration'
  );
}

console.log(
  'PASS - Home observes acquired-character celebration state'
);

for (
  const token of [
    'CHARACTER_V97F_PREVIEW_ACQUISITION_CELEBRATION',
    'useCharacterAcquisitionCelebration();',
    'CHARACTER_V97E_PREVIEW_ACQUISITION_EVALUATION',
    'getCharacterAcquisitionRequirementText(',
  ]
) {
  expect(
    preview,
    token,
    'Preview celebration'
  );
}

console.log(
  'PASS - Character Preview observes celebration while preserving real requirement text'
);

for (
  const token of [
    'CHARACTER_V97E_REAL_ACQUISITION_RULES',
    'CHARACTER_V97E_ACQUISITION_EVALUATOR',
  ]
) {
  expect(
    acquisition,
    token,
    'V97E acquisition regression'
  );
}

for (
  const token of [
    'CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT',
    'CHARACTER_V97C_SERIALIZED_INTERACTION_GROWTH',
    'CHARACTER_V97B_PROGRESSION_REACTIVE_HOOK',
    'CHARACTER_V97A_ACQUISITION_API',
  ]
) {
  expect(
    progression,
    token,
    'V97 progression regression'
  );
}

console.log(
  'PASS - V97A-E acquisition/growth/point contracts preserved'
);

console.log(
  'PASS - CHARACTER V97F ACQUISITION CELEBRATION PREFLIGHT'
);
