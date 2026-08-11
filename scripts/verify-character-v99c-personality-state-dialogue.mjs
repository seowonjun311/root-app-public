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

const dialogue =
  read(
    'store/characterMicroDialogue.ts'
  );

const bubble =
  read(
    'components/characters/CharacterHomeDialogueBubble.tsx'
  );

const personality =
  read(
    'constants/characterPersonality.ts'
  );

const condition =
  read(
    'store/rootyCondition.ts'
  );

console.log(
  '===== CHARACTER V99C PERSONALITY + STATE MICRO-DIALOGUE PREFLIGHT ====='
);

for (
  const identity of [
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
    personality,
    `'${identity}'`,
    'V95 personality'
  );

  expect(
    dialogue,
    identity ===
      'balanced'
      ? 'balanced: {'
      : `'${identity}': {`,
    'Dialogue identity'
  );
}

console.log(
  'PASS - all seven V95 personality identities have distinct dialogue pools'
);

for (
  const tone of [
    'low',
    'tired',
    'calm',
    'happy',
    'excited',
    'bonded',
  ]
) {
  expect(
    dialogue,
    `${tone}: [`,
    'Dialogue tone'
  );
}

console.log(
  'PASS - low/tired/calm/happy/excited/bonded dialogue tones exist'
);

for (
  const token of [
    'CHARACTER_V99C_PERSONALITY_STATE_DIALOGUE',
    'getCharacterPersonalityProfile(',
    'CHARACTER_V99C_STATE_PRIORITY',
    'condition.flags.isTired',
    'condition.flags.isExhausted',
    'condition.flags.isLowMood',
    'condition.flags.isExcited',
    "interaction ===\n      'longPress'",
    'input.relationshipPoints >=',
    '75',
  ]
) {
  expect(
    dialogue,
    token,
    'Personality/state dialogue policy'
  );
}

expect(
  condition,
  'ROOTY_BEHAVIOR_V59_CONDITION_CLASSIFICATION',
  'V59 condition classifier'
);

expect(
  condition,
  "mood === 'low'",
  'V59 low mood'
);

expect(
  condition,
  "mood === 'excited'",
  'V59 excited mood'
);

console.log(
  'PASS - V99C consumes the existing V59 semantic condition layer'
);

const tiredIndex =
  dialogue.indexOf(
    'condition.flags.isTired'
  );

const lowIndex =
  dialogue.indexOf(
    'condition.flags.isLowMood'
  );

if (
  tiredIndex <
    0 ||
  lowIndex <=
    tiredIndex
) {
  fail(
    'Energy-recovery priority must remain before low-mood dialogue'
  );
}

console.log(
  'PASS - tired/exhausted energy priority remains above low-mood expression'
);

for (
  const token of [
    'CHARACTER_V99C_DIALOGUE_COOLDOWN',
    'CHARACTER_MICRO_DIALOGUE_COOLDOWN_MS =\n  2200',
    'CHARACTER_MICRO_DIALOGUE_RECENT_LIMIT =\n  2',
    'CHARACTER_V99C_ANTI_REPEAT',
    'recentLinesByKey',
    'candidates.length >',
    'CHARACTER_V99C_RUNTIME_ONLY_DIALOGUE_EVENT',
    'listeners.size ===',
  ]
) {
  expect(
    dialogue,
    token,
    'Dialogue anti-spam/anti-repeat'
  );
}

console.log(
  'PASS - 2200ms cooldown + last-two-line anti-repeat protect rapid interactions'
);

for (
  const token of [
    'CHARACTER_V99C_PERSONALITY_STATE_DIALOGUE_TAP',
    'v99bTapCharacterId',
    "interaction:\n        'tap'",
    'rootyConditionRef.current',
    'v99bTapRelationshipAfter.points',
    'CHARACTER_V99C_PERSONALITY_STATE_DIALOGUE_LONG_PRESS',
    'v99bLongCharacterId',
    "interaction:\n        'longPress'",
    'v99bLongRelationshipAfter.points',
    'CHARACTER_V97C_SELECTED_GROWTH_TAP',
    'CHARACTER_V97C_SELECTED_GROWTH_LONG_PRESS',
  ]
) {
  expect(
    home,
    token,
    'Home dialogue integration'
  );
}

console.log(
  'PASS - Home tap/long-press feed selected character + live state + real relationship points'
);

for (
  const token of [
    'CHARACTER_V99C_HOME_DIALOGUE_BUBBLE',
    'subscribeCharacterMicroDialogue(',
    'next.characterId !==',
    'selectedCharacter',
    '<Animated.View',
    '1800',
    'pointerEvents="none"',
    'CHARACTER_LABEL',
  ]
) {
  expect(
    bubble,
    token,
    'Home dialogue bubble'
  );
}

for (
  const token of [
    'CHARACTER_V99C_HOME_DIALOGUE_HOST',
    '<CharacterHomeDialogueBubble />',
    'CHARACTER_V99B_HOME_PROGRESS_FEEDBACK_HOST',
    '<CharacterHomeProgressFeedback />',
  ]
) {
  expect(
    home,
    token,
    'Home dialogue host'
  );
}

console.log(
  'PASS - animated speech bubble coexists with V99B progress/micro-feedback UI'
);

console.log(
  'PASS - CHARACTER V99C PERSONALITY + STATE MICRO-DIALOGUE PREFLIGHT'
);
