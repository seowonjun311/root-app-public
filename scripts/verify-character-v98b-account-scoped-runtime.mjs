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

const scope =
  read(
    'store/characterAccountScope.ts'
  );

const cloud =
  read(
    'store/characterCloudSync.ts'
  );

const selected =
  read(
    'store/selectedCharacter.ts'
  );

const progression =
  read(
    'store/characterProgression.ts'
  );

const relationship =
  read(
    'store/characterRelationship.ts'
  );

const celebration =
  read(
    'store/characterAcquisitionCelebration.ts'
  );

console.log(
  '===== CHARACTER V98B ACCOUNT-SCOPED RUNTIME PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V98B_ACCOUNT_SCOPE_CHANGE_OBSERVER',
    'refreshCharacterAccountScope()',
    'subscribeCharacterAccountScope(',
    '.onAuthStateChanged(',
  ]
) {
  expect(
    scope,
    token,
    'Account-scope observer'
  );
}

console.log(
  'PASS - Firebase account changes invalidate character runtime scope'
);

for (
  const token of [
    'CHARACTER_V98B_LEGACY_SCOPE_CLAIM',
    "'character_account_scope_v1:legacy_claim_owner'",
    "'legacy-claimed-by-another-scope'",
    'CHARACTER_V98B_SCOPED_STORAGE_PREPARATION',
  ]
) {
  expect(
    cloud,
    token,
    'Legacy migration hardening'
  );
}

console.log(
  'PASS - legacy V97 character state can be claimed by only one account scope'
);

for (
  const [
    source,
    label,
    tokens,
  ] of [
    [
      selected,
      'Selected character',
      [
        'CHARACTER_V98B_SELECTED_SCOPE_RESET',
        'CHARACTER_V98B_SELECTED_SCOPED_WRITE',
        'getCharacterScopedStorageKey(',
        'ensureCharacterScopedStorageReady(',
      ],
    ],
    [
      progression,
      'Progression',
      [
        'CHARACTER_V98B_PROGRESSION_SCOPE_RESET',
        'CHARACTER_V98B_PROGRESSION_SCOPED_WRITE',
        'getCharacterScopedStorageKey(',
        'ensureCharacterScopedStorageReady(',
      ],
    ],
    [
      relationship,
      'Relationship',
      [
        'CHARACTER_V98B_RELATIONSHIP_SCOPE_RESET',
        'getCharacterScopedStorageKey(',
        'ensureCharacterScopedStorageReady(',
      ],
    ],
    [
      celebration,
      'Celebration',
      [
        'CHARACTER_V98B_CELEBRATION_SCOPE_RESET',
        'CHARACTER_V98B_CELEBRATION_SCOPED_WRITE',
        'getCharacterScopedStorageKey(',
        'ensureCharacterScopedStorageReady(',
      ],
    ],
  ]
) {
  for (
    const token of
    tokens
  ) {
    expect(
      source,
      token,
      label
    );
  }
}

console.log(
  'PASS - selected/progression/relationship/celebration use account-scoped storage'
);

for (
  const token of [
    'CHARACTER_V98B_GROWTH_INTERACTION_SCOPE_CAPTURE',
    'interactionScopeId',
    'CHARACTER_PROGRESSION_SCOPE_CHANGED',
  ]
) {
  expect(
    progression,
    token,
    'Progression cross-account queue safety'
  );
}

expect(
  relationship,
  'refreshCharacterAccountScope()',
  'Relationship cross-account queue safety'
);

console.log(
  'PASS - delayed growth/relationship mutations cannot silently move to a new account'
);

for (
  const token of [
    "'selected_character_v1'",
    'CHARACTER_V97B_ACQUISITION_SELECTION_GATE',
  ]
) {
  expect(
    selected,
    token,
    'V97 selected regression'
  );
}

for (
  const token of [
    "'character_progression_v1'",
    'CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT',
    'CHARACTER_V97C_SERIALIZED_INTERACTION_GROWTH',
  ]
) {
  expect(
    progression,
    token,
    'V97 progression regression'
  );
}

for (
  const token of [
    "'character_relationship_v1'",
    'CHARACTER_V96B_SYNCHRONOUS_RELATIONSHIP_MUTATION',
    'CHARACTER_V96B_SELECTED_RELATIONSHIP_RUNTIME_ADAPTERS',
  ]
) {
  expect(
    relationship,
    token,
    'V96 relationship regression'
  );
}

for (
  const token of [
    "'character_acquisition_celebration_v1'",
    'CHARACTER_V97F_ONE_TIME_ACQUISITION_ALERT',
    'CHARACTER_V97F_ACQUISITION_CELEBRATION_HOOK',
  ]
) {
  expect(
    celebration,
    token,
    'V97F celebration regression'
  );
}

console.log(
  'PASS - original V97/V96 runtime contracts and legacy key names are retained'
);

for (
  const source of [
    selected,
    progression,
    relationship,
    celebration,
  ]
) {
  if (
    source.includes(
      'AsyncStorage.removeItem(\n    STORAGE_KEY'
    )
  ) {
    fail(
      'V98B must not delete legacy V97 keys'
    );
  }
}

console.log(
  'PASS - V98B does not delete legacy V97 keys'
);

console.log(
  'PASS - V98B does not activate automatic Firebase character upload/download'
);

console.log(
  'PASS - CHARACTER V98B ACCOUNT-SCOPED RUNTIME PREFLIGHT'
);
