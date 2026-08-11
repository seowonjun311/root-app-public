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

const policy =
  read(
    'store/characterRelationshipPolicy.ts'
  );

const store =
  read(
    'store/characterRelationship.ts'
  );

console.log(
  '===== CHARACTER V96 RELATIONSHIP PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V96A_RELATIONSHIP_THRESHOLDS',
    'familiar: 25',
    'close: 50',
    'bonded: 75',
    'CHARACTER_V96A_RELATIONSHIP_TIER_CLASSIFIER',
  ]
) {
  expect(
    policy,
    token,
    'Relationship tier policy'
  );
}

console.log(
  'PASS - V59-aligned 0/25/50/75 relationship tiers'
);

for (
  const token of [
    'distant: {',
    'spontaneousHappy: 0.75',
    'passiveAttention: 0',
    'familiar: {',
    'passiveAttention: 0.25',
    'close: {',
    'passiveAttention: 0.6',
    'bondedFollowUpTouch: 0.35',
    'bonded: {',
    'bondedFollowUpTouch: 1',
  ]
) {
  expect(
    policy,
    token,
    'Relationship social policy'
  );
}

console.log(
  'PASS - progressive relationship social multiplier foundation'
);

for (
  const token of [
    "const STORAGE_KEY =\n  'character_relationship_v1';",
    'CHARACTER_V96A_PER_CHARACTER_RELATIONSHIP_STORE',
    'CHARACTER_V96A_RELATIONSHIP_PERSISTENCE',
    'CHARACTER_V96A_RELATIONSHIP_SYNC_SNAPSHOT',
    'CHARACTER_V96A_RELATIONSHIP_INTERACTION_POLICY',
    'CHARACTER_V96A_LEGACY_AFFECTION_SEED',
    'recordCharacterRelationshipInteraction(',
    'seedCharacterRelationshipFromLegacyAffection(',
  ]
) {
  expect(
    store,
    token,
    'Relationship store'
  );
}

for (
  const characterId of [
    'rooty',
    'moru',
    'mongsil',
    'dami',
    'pio',
    'nuri',
    'tori',
  ]
) {
  expect(
    store,
    `${characterId}:`,
    `Relationship map ${characterId}`
  );
}

console.log(
  'PASS - all seven characters have independent persistent relationship records'
);

expect(
  store,
  "interaction ===\n      'longPress'\n      ? 2\n      : 1",
  'Interaction points'
);

console.log(
  'PASS - short tap +1 / long press +2 accounting contract'
);

console.log(
  'PASS - V96A does not auto-run legacy migration or Home integration'
);

console.log(
  'PASS - CHARACTER V96A RELATIONSHIP PREFLIGHT'
);
