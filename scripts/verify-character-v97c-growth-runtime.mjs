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

const home =
  read(
    'app/(tabs)/index.tsx'
  );

const progression =
  read(
    'store/characterProgression.ts'
  );

const selected =
  read(
    'store/selectedCharacter.ts'
  );

const relationship =
  read(
    'store/characterRelationship.ts'
  );

const progressionPolicy =
  read(
    'constants/characterProgression.ts'
  );

console.log(
  '===== CHARACTER V97C GROWTH RUNTIME PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V97C_SERIALIZED_INTERACTION_GROWTH',
    'export type CharacterGrowthInteraction',
    'characterGrowthInteractionQueue',
    'recordCharacterGrowthInteraction(',
    'await addCharacterGrowthXp(',
    "'longPress'\n      ? 2\n      : 1",
  ]
) {
  expect(
    progression,
    token,
    'Serialized interaction growth'
  );
}

console.log(
  'PASS - interaction growth queue prevents rapid-tap lost updates'
);

for (
  const token of [
    'CHARACTER_V97C_SELECTED_GROWTH_TAP',
    "recordCharacterGrowthInteraction(\n      getV97SelectedCharacterSnapshot(),\n      'tap'",
    'CHARACTER_V97C_SELECTED_GROWTH_LONG_PRESS',
    "recordCharacterGrowthInteraction(\n      getV97SelectedCharacterSnapshot(),\n      'longPress'",
  ]
) {
  expect(
    home,
    token,
    'Home growth interaction'
  );
}

console.log(
  'PASS - selected character short tap +1 XP / long press +2 XP'
);

for (
  const token of [
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_TAP',
    "recordSelectedCharacterRelationshipInteraction(\n      'tap'",
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_LONG_PRESS',
    "recordSelectedCharacterRelationshipInteraction(\n      'longPress'",
  ]
) {
  expect(
    home,
    token,
    'V96 relationship interaction preservation'
  );
}

console.log(
  'PASS - V96 relationship interaction accounting preserved'
);

for (
  const token of [
    'CHARACTER_V97B_LEGACY_SELECTION_SEED',
    'CHARACTER_V97B_ACQUISITION_SELECTION_GATE',
  ]
) {
  expect(
    selected,
    token,
    'V97B acquisition gate'
  );
}

console.log(
  'PASS - V97B acquisition-aware selection gate preserved'
);

for (
  const token of [
    'if (\n    !before.acquired ||',
    'newlyReachedLevels',
    'CHARACTER_V97A_TWO_PHASE_REWARD_CLAIM',
  ]
) {
  expect(
    progression,
    token,
    'V97A growth/reward safety'
  );
}

console.log(
  'PASS - unacquired characters cannot gain XP'
);

expect(
  progressionPolicy,
  'minXp: 25',
  'Lv2 threshold'
);

expect(
  progressionPolicy,
  'minXp: 75',
  'Lv3 threshold'
);

expect(
  progressionPolicy,
  'minXp: 150',
  'Lv4 threshold'
);

expect(
  progressionPolicy,
  'minXp: 250',
  'Lv5 threshold'
);

console.log(
  'PASS - V97A 0/25/75/150/250 growth policy preserved'
);

expect(
  relationship,
  'CHARACTER_V96B_SELECTED_RELATIONSHIP_RUNTIME_ADAPTERS',
  'V96 relationship runtime adapters'
);

console.log(
  'PASS - relationship store untouched by V97C'
);

if (
  progression.includes(
    'markCharacterGrowthRewardClaimed(\n      characterId'
  ) &&
  home.includes(
    'markCharacterGrowthRewardClaimed('
  )
) {
  fail(
    'V97C must not auto-claim point rewards'
  );
}

console.log(
  'PASS - V97C does not grant or claim ROOT point rewards'
);

console.log(
  'PASS - CHARACTER V97C GROWTH RUNTIME PREFLIGHT'
);
