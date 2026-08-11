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

function functionSlice(
  text,
  token
) {
  const start =
    text.indexOf(
      token
    );

  if (
    start < 0
  ) {
    fail(
      `Function missing: ${token}`
    );
  }

  const brace =
    text.indexOf(
      '{',
      start
    );

  let depth = 0;
  let quote = null;
  let escape = false;

  for (
    let i = brace;
    i < text.length;
    i += 1
  ) {
    const ch =
      text[i];

    if (
      escape
    ) {
      escape = false;
      continue;
    }

    if (
      quote !== null
    ) {
      if (
        ch === '\\'
      ) {
        escape = true;
      }
      else if (
        ch === quote
      ) {
        quote = null;
      }

      continue;
    }

    if (
      ch === "'" ||
      ch === '"' ||
      ch === '`'
    ) {
      quote = ch;
      continue;
    }

    if (
      ch === '{'
    ) {
      depth += 1;
    }
    else if (
      ch === '}'
    ) {
      depth -= 1;

      if (
        depth === 0
      ) {
        return text.slice(
          start,
          i + 1
        );
      }
    }
  }

  fail(
    `Function close missing: ${token}`
  );
}

const home =
  read(
    'app/(tabs)/index.tsx'
  );

const relationship =
  read(
    'store/characterRelationship.ts'
  );

const relationshipPolicy =
  read(
    'store/characterRelationshipPolicy.ts'
  );

const personalityPolicy =
  read(
    'store/characterPersonalityPolicy.ts'
  );

const mood =
  read(
    'store/rootyMoodExpressionPolicy.ts'
  );

const affection =
  read(
    'store/rootyAffectionInteractionPolicy.ts'
  );

const passive =
  read(
    'store/rootyPassiveSocialPolicy.ts'
  );

console.log(
  '===== CHARACTER V96B RUNTIME PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V96B_RELATIONSHIP_BOOTSTRAP',
    'await loadCharacterRelationships()',
    "seedCharacterRelationshipFromLegacyAffection(\n        'rooty'",
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_TAP',
    "recordSelectedCharacterRelationshipInteraction(\n      'tap'",
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_LONG_PRESS',
    "recordSelectedCharacterRelationshipInteraction(\n      'longPress'",
  ]
) {
  expect(
    home,
    token,
    'Home relationship runtime'
  );
}

const bootstrapIndex =
  home.indexOf(
    'CHARACTER_V96B_RELATIONSHIP_BOOTSTRAP'
  );

const readyIndex =
  home.indexOf(
    'rootyStateReadyRef.current =',
    bootstrapIndex
  );

if (
  bootstrapIndex < 0 ||
  readyIndex < 0 ||
  bootstrapIndex >=
    readyIndex
) {
  fail(
    'Relationship bootstrap must occur before Rooty runtime ready'
  );
}

console.log(
  'PASS - relationship store loads/seeds before Rooty runtime ready'
);

for (
  const token of [
    'CHARACTER_V96B_SYNCHRONOUS_RELATIONSHIP_MUTATION',
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_RUNTIME_ADAPTERS',
    'recordSelectedCharacterRelationshipInteraction(',
    'getSelectedCharacterRelationshipSnapshot(',
    'applySelectedCharacterRelationshipToSocialChance(',
    'getSelectedCharacterSnapshot()',
  ]
) {
  expect(
    relationship,
    token,
    'Relationship runtime store'
  );
}

console.log(
  'PASS - selected-character relationship mutation + snapshot adapters'
);

for (
  const token of [
    'CHARACTER_V96A_RELATIONSHIP_THRESHOLDS',
    'familiar: 25',
    'close: 50',
    'bonded: 75',
    'CHARACTER_V96A_RELATIONSHIP_SOCIAL_POLICY',
  ]
) {
  expect(
    relationshipPolicy,
    token,
    'Relationship policy'
  );
}

console.log(
  'PASS - V96A relationship tier policy preserved'
);

for (
  const [
    source,
    marker,
    channel,
    label,
  ] of [
    [
      mood,
      'CHARACTER_V96B_RELATIONSHIP_SOCIAL_V61',
      'spontaneousHappy',
      'V61',
    ],
    [
      affection,
      'CHARACTER_V96B_RELATIONSHIP_SOCIAL_V63',
      'bondedFollowUpTouch',
      'V63',
    ],
    [
      passive,
      'CHARACTER_V96B_RELATIONSHIP_SOCIAL_V64',
      'passiveAttention',
      'V64',
    ],
  ]
) {
  expect(
    source,
    marker,
    `${label} relationship marker`
  );

  expect(
    source,
    'applySelectedCharacterRelationshipToSocialChance(',
    `${label} relationship wrapper`
  );

  expect(
    source,
    'applySelectedCharacterPersonalityToSocialChance(',
    `${label} personality wrapper`
  );

  expect(
    source,
    `'${channel}'`,
    `${label} channel`
  );
}

console.log(
  'PASS - V61/V63/V64 compose personality then relationship'
);

const v63 =
  functionSlice(
    affection,
    'export function getRootyBondedTapFollowUpChance('
  );

if (
  v63.includes(
    '!condition.flags.isBonded'
  )
) {
  fail(
    'V63 still uses global affection as relationship gate'
  );
}

const v64 =
  functionSlice(
    passive,
    'export function getRootyBondedPassiveAttentionChance('
  );

if (
  v64.includes(
    '!condition.flags.isBonded'
  )
) {
  fail(
    'V64 still uses global affection as relationship gate'
  );
}

for (
  const token of [
    'condition.flags.isTired',
    'condition.flags.isLowMood',
  ]
) {
  expect(
    v64,
    token,
    'V64 safety suppression'
  );
}

console.log(
  'PASS - selected relationship replaces global affection gate'
);

console.log(
  'PASS - V64 tired/low-mood suppression preserved'
);

for (
  const [
    source,
    token,
    label,
  ] of [
    [
      mood,
      'excitedSpontaneousHappyChance: 0.22',
      'V61 base chance',
    ],
    [
      affection,
      'bondedTapFollowUpTouchChance: 0.35',
      'V63 base chance',
    ],
    [
      passive,
      'bondedAttentionChance: 0.12',
      'V64 base chance',
    ],
  ]
) {
  expect(
    source,
    token,
    label
  );
}

console.log(
  'PASS - V61/V63/V64 base probabilities preserved'
);

expect(
  personalityPolicy,
  'CHARACTER_V77_PERSONALITY_SOCIAL_OBSERVATION',
  'V77 personality social observation'
);

expect(
  personalityPolicy,
  'recordCharacterSocialChance(',
  'V78 personality statistics bridge'
);

if (
  personalityPolicy.includes(
    'applySelectedCharacterRelationshipToSocialChance'
  )
) {
  fail(
    'Relationship was inserted inside personality diagnostics stage'
  );
}

console.log(
  'PASS - V77/V78/V79 personality statistics remain personality-stage'
);

console.log(
  'PASS - CHARACTER V96B RUNTIME PREFLIGHT'
);
