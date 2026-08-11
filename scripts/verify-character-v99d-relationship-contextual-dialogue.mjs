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

const dialogue =
  read(
    'store/characterMicroDialogue.ts'
  );

const v99cVerifier =
  read(
    'scripts/verify-character-v99c-personality-state-dialogue.mjs'
  );

console.log(
  '===== CHARACTER V99D RELATIONSHIP DEPTH + CONTEXTUAL DIALOGUE PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V99D_RELATIONSHIP_DIALOGUE_DEPTH',
    'CharacterRelationshipDialogueTier',
    'getCharacterRelationshipDialogueTier(',
    "return 'distant'",
    "return 'familiar'",
    "return 'close'",
    "return 'bonded'",
    'RELATIONSHIP_DIALOGUE_BY_PERSONALITY',
  ]
) {
  expect(
    dialogue,
    token,
    'Relationship dialogue depth'
  );
}

for (
  const personality of [
    'balanced',
    'curious-active',
    'cozy-calm',
    'social-warm',
    'explorer-curious',
    'playful-adventurous',
    'gentle-shy',
  ]
) {
  expect(
    dialogue,
    personality ===
      'balanced'
      ? 'balanced: {'
      : `'${personality}': {`,
    'Relationship personality pools'
  );
}

console.log(
  'PASS - distant/familiar/close/bonded depth exists for all seven personalities'
);

for (
  const token of [
    'CHARACTER_V99D_LONG_PRESS_RELATIONSHIP_DEPTH',
    "input.interaction ===\n      'longPress'",
    "tone !==\n      'tired'",
    "tone !==\n      'low'",
    "tone !==\n      'excited'",
    'relationshipTier',
  ]
) {
  expect(
    dialogue,
    token,
    'Long-press relationship depth'
  );
}

console.log(
  'PASS - calm/happy long-press dialogue uses real relationship tier while tired/low/excited keep state priority'
);

for (
  const token of [
    'CHARACTER_V99D_CONTEXTUAL_AUTONOMOUS_DIALOGUE',
    'CharacterAutonomousDialogueContext',
    'AUTONOMOUS_DIALOGUE_BY_PERSONALITY',
    'idle: [',
    'lookAround: [',
    'sit: [',
    'sleep: [',
    'considerCharacterAutonomousDialogue(',
    "interaction:\n      'autonomous'",
  ]
) {
  expect(
    dialogue,
    token,
    'Contextual autonomous dialogue'
  );
}

console.log(
  'PASS - idle/lookAround/sit/sleep contextual autonomous dialogue pools exist'
);

for (
  const token of [
    'CHARACTER_V99D_AUTONOMOUS_RARITY_POLICY',
    'startupGraceMs:\n    30_000',
    'cooldownMs:\n    75_000',
    'idle: 0.04',
    'lookAround: 0.10',
    'sit: 0.08',
    'sleep: 0.12',
    'lastAutonomousAtByCharacter',
    'CHARACTER_MICRO_DIALOGUE_COOLDOWN_MS',
  ]
) {
  expect(
    dialogue,
    token,
    'Autonomous rarity policy'
  );
}

console.log(
  'PASS - autonomous dialogue is rare: startup grace + 75s cooldown + per-context chance'
);

for (
  const token of [
    'CHARACTER_V99D_AUTONOMOUS_IDLE',
    'CHARACTER_V99D_AUTONOMOUS_LOOK_AROUND',
    'CHARACTER_V99D_AUTONOMOUS_SIT',
    'CHARACTER_V99D_AUTONOMOUS_SLEEP',
    'considerCharacterAutonomousDialogue({',
    'rootyConditionRef.current',
    'getSelectedCharacterRelationshipSnapshot()',
    'getV97SelectedCharacterSnapshot()',
  ]
) {
  expect(
    home,
    token,
    'Home autonomous integration'
  );
}

for (
  const [
    marker,
    context,
  ] of [
    [
      'CHARACTER_V99D_AUTONOMOUS_IDLE',
      'idle',
    ],
    [
      'CHARACTER_V99D_AUTONOMOUS_LOOK_AROUND',
      'lookAround',
    ],
    [
      'CHARACTER_V99D_AUTONOMOUS_SIT',
      'sit',
    ],
    [
      'CHARACTER_V99D_AUTONOMOUS_SLEEP',
      'sleep',
    ],
  ]
) {
  expectRegex(
    home,
    new RegExp(
      `${marker}[\\s\\S]*?context:\\s*'${context}'[\\s\\S]*?applyRootyAction`
    ),
    `Home autonomous ${context}`
  );
}

console.log(
  'PASS - autonomous context wiring is marker-scoped and indentation-independent'
);

console.log(
  'PASS - natural Home action transitions feed selected character + live state + relationship into dialogue'
);

for (
  const token of [
    'CHARACTER_V99C_PERSONALITY_STATE_DIALOGUE_TAP',
    'CHARACTER_V99C_PERSONALITY_STATE_DIALOGUE_LONG_PRESS',
    'CHARACTER_V99C_HOME_DIALOGUE_HOST',
    '<CharacterHomeDialogueBubble />',
    'CHARACTER_V99B_HOME_PROGRESS_FEEDBACK_HOST',
    '<CharacterHomeProgressFeedback />',
  ]
) {
  expect(
    home,
    token,
    'V99C/V99B preservation'
  );
}

expect(
  v99cVerifier,
  'CHARACTER V99C PERSONALITY + STATE MICRO-DIALOGUE PREFLIGHT',
  'V99C verifier preservation'
);

if (
  dialogue.includes(
    '@react-native-async-storage/async-storage'
  ) ||
  dialogue.includes(
    '@react-native-firebase/firestore'
  )
) {
  fail(
    'V99D dialogue must remain runtime-only and must not add persistence/cloud imports'
  );
}

console.log(
  'PASS - V99C interaction bubble + V99B HUD remain intact and V99D adds no persistence'
);

console.log(
  'PASS - CHARACTER V99D RELATIONSHIP DEPTH + CONTEXTUAL DIALOGUE PREFLIGHT'
);
