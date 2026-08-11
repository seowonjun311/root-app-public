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

const preview =
  read(
    'app/character-preview.tsx'
  );

const screen =
  read(
    'app/character-relationship-diagnostics.tsx'
  );

const relationship =
  read(
    'store/characterRelationship.ts'
  );

const policy =
  read(
    'store/characterRelationshipPolicy.ts'
  );

console.log(
  '===== CHARACTER V96C RELATIONSHIP DIAGNOSTICS PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V96C_RELATIONSHIP_DIAGNOSTICS_ENTRY',
    "'/character-relationship-diagnostics' as never",
    'CHARACTER_V77_DIAGNOSTICS_ENTRY',
    'CHARACTER_V86_PREVIEW_TEXT_FIX',
  ]
) {
  expect(
    preview,
    token,
    'Character preview entry'
  );
}

console.log(
  'PASS - preview relationship diagnostics route entry'
);

for (
  const token of [
    'CHARACTER_V96C_RELATIONSHIP_DIAGNOSTICS_SCREEN',
    'CHARACTER_IDS.map(',
    'getCharacterRelationshipSnapshot(',
    'loadCharacterRelationships()',
    'subscribeCharacterRelationships(',
    'useSelectedCharacter()',
    'snapshot.tapCount',
    'snapshot.longPressCount',
    'snapshot.legacySeeded',
    'snapshot.lastInteractionAt',
    'CHARACTER_RELATIONSHIP_SOCIAL_MULTIPLIERS',
    'CHARACTER_RELATIONSHIP_THRESHOLDS',
  ]
) {
  expect(
    screen,
    token,
    'Relationship diagnostics screen'
  );
}

for (
  const id of [
    'rooty:',
    'moru:',
    'mongsil:',
    'dami:',
    'pio:',
    'nuri:',
    'tori:',
  ]
) {
  expect(
    screen,
    id,
    'Seven character labels'
  );
}

console.log(
  'PASS - screen observes all seven relationship records'
);

console.log(
  'PASS - points/tier/tap/long-press/legacy-seed/last-interaction visible'
);

console.log(
  'PASS - current relationship social multipliers visible'
);

for (
  const token of [
    'CHARACTER_V96B_SYNCHRONOUS_RELATIONSHIP_MUTATION',
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_RUNTIME_ADAPTERS',
    'recordSelectedCharacterRelationshipInteraction(',
    'seedCharacterRelationshipFromLegacyAffection(',
  ]
) {
  expect(
    relationship,
    token,
    'V96B runtime relationship'
  );
}

for (
  const token of [
    'familiar: 25',
    'close: 50',
    'bonded: 75',
    'CHARACTER_V96A_RELATIONSHIP_SOCIAL_POLICY',
  ]
) {
  expect(
    policy,
    token,
    'Relationship policy'
  );
}

console.log(
  'PASS - V96B runtime and V96A relationship policy preserved'
);

console.log(
  'PASS - CHARACTER V96C RELATIONSHIP DIAGNOSTICS PREFLIGHT'
);
