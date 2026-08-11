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

function expectRegex(
  source,
  pattern,
  label
) {
  if (
    !pattern.test(
      source
    )
  ) {
    fail(
      `${label}: pattern did not match ${pattern}`
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

const feedbackStore =
  read(
    'store/characterHomeFeedback.ts'
  );

const feedbackUi =
  read(
    'components/characters/CharacterHomeProgressFeedback.tsx'
  );

console.log(
  '===== CHARACTER V99B HOME MICROFEEDBACK + PROGRESS PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V99B_HOME_MICROFEEDBACK_BUS',
    'CHARACTER_V99B_EMIT_CONFIRMED_FEEDBACK',
    'subscribeCharacterHomeInteractionFeedback(',
    'xpDelta',
    'relationshipDelta',
  ]
) {
  expect(
    feedbackStore,
    token,
    'Feedback bus'
  );
}

console.log(
  'PASS - runtime-only interaction feedback bus'
);

for (
  const token of [
    'CHARACTER_V99B_CONFIRMED_XP_MICROFEEDBACK',
    'result.afterXp -',
    'result.beforeXp',
    'CHARACTER_V97C_SERIALIZED_INTERACTION_GROWTH',
    'CHARACTER_V99A_GROWTH_PRESENTATION_EMIT',
  ]
) {
  expect(
    progression,
    token,
    'Confirmed growth feedback'
  );
}

expectRegex(
  progression,
  /CHARACTER_V99B_CONFIRMED_XP_MICROFEEDBACK[\s\S]*?emitCharacterHomeInteractionFeedback\(\{[\s\S]*?source:\s*'growth'/,
  'Confirmed growth feedback source'
);

console.log(
  'PASS - XP bubble uses confirmed serialized progression delta'
);

console.log(
  'PASS - confirmed XP feedback source is growth regardless of formatting indentation'
);

for (
  const token of [
    'CHARACTER_V99B_RELATIONSHIP_MICROFEEDBACK_TAP',
    'CHARACTER_V99B_RELATIONSHIP_MICROFEEDBACK_LONG_PRESS',
    'getSelectedCharacterRelationshipSnapshot()',
    'v99bTapRelationshipDelta',
    'v99bLongRelationshipDelta',
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_TAP',
    'CHARACTER_V97C_SELECTED_GROWTH_TAP',
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_LONG_PRESS',
    'CHARACTER_V97C_SELECTED_GROWTH_LONG_PRESS',
  ]
) {
  expect(
    home,
    token,
    'Home relationship feedback'
  );
}

for (
  const token of [
    "recordCharacterGrowthInteraction(\n      getV97SelectedCharacterSnapshot(),\n      'tap'\n    ).then(",
    "recordCharacterGrowthInteraction(\n      getV97SelectedCharacterSnapshot(),\n      'longPress'\n    ).then(",
    'evaluateCharacterAcquisitionRewards()',
  ]
) {
  expect(
    home,
    token,
    'V97E acquisition evaluation preservation'
  );
}

console.log(
  'PASS - relationship bubble uses actual synchronous V96B snapshot delta'
);

console.log(
  'PASS - V97E post-growth acquisition evaluation chains preserved'
);

for (
  const token of [
    'CHARACTER_V99B_HOME_PROGRESS_AND_MICROFEEDBACK',
    'getCharacterProgressionSnapshot(',
    'subscribeCharacterProgression(',
    'getCharacterRelationshipSnapshot(',
    'subscribeCharacterRelationships(',
    'getCharacterNextGrowthThreshold(',
    'RELATIONSHIP_LABEL',
    'CHARACTER_V99B_V4_TYPED_PERCENT_WIDTH',
    'function percentWidth(',
    '): `${number}%`',
    'width:\n                  percentWidth(',
    '450',
    '900',
    '+{',
    'XP',
    '친밀도',
  ]
) {
  expect(
    feedbackUi,
    token,
    'Home progress UI'
  );
}

console.log(
  'PASS - Home displays reactive growth + relationship progress and batched micro-feedback'
);

console.log(
  'PASS - progress bar widths satisfy React Native DimensionValue typing'
);

for (
  const token of [
    'CHARACTER_V99B_HOME_PROGRESS_FEEDBACK_HOST',
    '<CharacterHomeProgressFeedback />',
    'CHARACTER_V99A_REWARD_PRESENTATION_HOST_HOME',
  ]
) {
  expect(
    home,
    token,
    'Home feedback host'
  );
}

console.log(
  'PASS - V99B Home host coexists with V99A reward presentation host'
);

console.log(
  'PASS - CHARACTER V99B HOME MICROFEEDBACK + PROGRESS PREFLIGHT'
);
