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
  text,
  token,
  label
) {
  if (
    !text.includes(
      token
    )
  ) {
    fail(
      `${label}: missing ${JSON.stringify(token)}`
    );
  }
}

function block(
  text,
  characterId
) {
  const start =
    text.indexOf(
      `${characterId}: {`
    );

  if (
    start < 0
  ) {
    fail(
      `Missing personality: ${characterId}`
    );
  }

  const end =
    text.indexOf(
      '\n  },',
      start
    );

  if (
    end < 0
  ) {
    fail(
      `Missing personality close: ${characterId}`
    );
  }

  return text.slice(
    start,
    end +
      '\n  },'.length
  );
}

const personality =
  read(
    'constants/characterPersonality.ts'
  );

const statistics =
  read(
    'store/characterRuntimeStatistics.ts'
  );

const validation =
  read(
    'store/characterPersonalityValidation.ts'
  );

console.log(
  '===== CHARACTER V95B PROBABILITY PREFLIGHT ====='
);

const policyVersions = {
  rooty: 1,
  moru: 1,
  mongsil: 1,
  dami: 1,
  pio: 2,
  nuri: 2,
  tori: 2,
};

for (
  const [
    id,
    version,
  ] of Object.entries(
    policyVersions
  )
) {
  expect(
    block(
      personality,
      id
    ),
    `policyVersion: ${version}`,
    `${id} policy version`
  );
}

console.log(
  'PASS - personality policy versions'
);

const pio =
  block(
    personality,
    'pio'
  );

for (
  const token of [
    "id: 'explorer-curious'",
    'lookAround: 1.55',
    'sitRest: 0.85',
    'nap: 0.55',
    'spontaneousHappy: 1.15',
    'passiveAttention: 0.75',
    'bondedFollowUpTouch: 0.85',
  ]
) {
  expect(
    pio,
    token,
    'Pio explorer profile'
  );
}

console.log(
  'PASS - Pio explorer-curious probability fingerprint'
);

const nuri =
  block(
    personality,
    'nuri'
  );

for (
  const token of [
    "id: 'playful-adventurous'",
    'lookAround: 1.15',
    'sitRest: 0.8',
    'nap: 0.6',
    'spontaneousHappy: 1.65',
    'passiveAttention: 1.05',
    'bondedFollowUpTouch: 1',
  ]
) {
  expect(
    nuri,
    token,
    'Nuri playful profile'
  );
}

console.log(
  'PASS - Nuri playful-adventurous probability fingerprint'
);

for (
  const token of [
    'CHARACTER_V95B_VERSIONED_REST_STATISTICS',
    'CHARACTER_V95B_VERSIONED_SOCIAL_STATISTICS',
    'personalityPolicyVersion: number;',
    ').policyVersion,',
  ]
) {
  expect(
    statistics,
    token,
    'Versioned statistics'
  );
}

console.log(
  'PASS - V78 new samples carry personality policy version'
);

for (
  const token of [
    'CHARACTER_V95B_CURRENT_POLICY_STATISTICS_ONLY',
    'currentPolicyVersion',
    'sample.personalityPolicyVersion ===',
    'currentStatistics',
  ]
) {
  expect(
    validation,
    token,
    'V79 current-policy filtering'
  );
}

console.log(
  'PASS - V79 validates only current-policy samples'
);

console.log(
  'PASS - CHARACTER V95B PROBABILITY PREFLIGHT'
);
