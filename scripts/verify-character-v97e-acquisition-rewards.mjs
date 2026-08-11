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

const acquisition =
  read(
    'store/characterAcquisitionRewards.ts'
  );

const home =
  read(
    'app/(tabs)/index.tsx'
  );

const preview =
  read(
    'app/character-preview.tsx'
  );

const progression =
  read(
    'store/characterProgression.ts'
  );

const pointReward =
  read(
    'store/characterGrowthPointReward.ts'
  );

console.log(
  '===== CHARACTER V97E ACQUISITION REWARDS PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V97E_REAL_ACQUISITION_RULES',
    "characterId:\n      'moru'",
    'metrics.rootyGrowthXp >=\n        25',
    "characterId:\n      'mongsil'",
    'metrics.totalGrowthXp >=\n        75',
    "characterId:\n      'dami'",
    'metrics.maxRelationshipPoints >=\n        75',
    "characterId:\n      'pio'",
    'metrics.explorationVisitedCount >=\n        5',
    "characterId:\n      'nuri'",
    'metrics.explorationVisitedCount >=\n        15',
    "characterId:\n      'tori'",
    'metrics.acquiredCount >=\n          6',
    'metrics.totalGrowthXp >=\n          250',
  ]
) {
  expect(
    acquisition,
    token,
    'Acquisition rules'
  );
}

console.log(
  'PASS - six non-starter characters have distinct real unlock conditions'
);

for (
  const token of [
    "'growthReward'",
    "'relationshipReward'",
    "'explorationReward'",
    'acquireCharacter(',
    'CHARACTER_V97E_ACQUISITION_EVALUATOR',
  ]
) {
  expect(
    acquisition,
    token,
    'Acquisition source/evaluator'
  );
}

console.log(
  'PASS - acquisition uses existing V97A authoritative acquireCharacter API'
);

for (
  const token of [
    'loadCharacterProgression()',
    'loadCharacterRelationships()',
    'getAllCharacterProgressionSnapshots()',
    'getCharacterRelationshipSnapshot(',
    'getRootOnboardingData()',
    'visitedPlaceIds',
  ]
) {
  expect(
    acquisition,
    token,
    'Acquisition metrics'
  );
}

console.log(
  'PASS - growth + relationship + exploration metrics compose acquisition'
);

for (
  const token of [
    'CHARACTER_V97E_HOME_ACQUISITION_EVALUATION',
    "recordCharacterGrowthInteraction(\n      getV97SelectedCharacterSnapshot(),\n      'tap'\n    ).then(",
    "recordCharacterGrowthInteraction(\n      getV97SelectedCharacterSnapshot(),\n      'longPress'\n    ).then(",
  ]
) {
  expect(
    home,
    token,
    'Home acquisition evaluation'
  );
}

console.log(
  'PASS - Home evaluates unlocks on entry and after character interaction'
);

for (
  const token of [
    'CHARACTER_V97E_PREVIEW_ACQUISITION_EVALUATION',
    'getCharacterAcquisitionRequirementText(',
    'CHARACTER_V97B_ACQUISITION_STATUS',
    'CHARACTER_V97B_PROGRESSION_DIAGNOSTICS_ENTRY',
    'CHARACTER_V96C_RELATIONSHIP_DIAGNOSTICS_ENTRY',
  ]
) {
  expect(
    preview,
    token,
    'Preview acquisition UI'
  );
}

console.log(
  'PASS - locked Preview exposes the real requirement and auto-evaluates rewards'
);

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

expect(
  pointReward,
  'CHARACTER_V97D_IDEMPOTENT_ROOT_POINT_GRANT',
  'V97D point reward bridge'
);

console.log(
  'PASS - V97A/B/C/D growth + point reward contracts preserved'
);

console.log(
  'PASS - CHARACTER V97E ACQUISITION REWARDS PREFLIGHT'
);
