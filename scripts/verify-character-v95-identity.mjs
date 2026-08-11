import {
  readFileSync,
} from 'node:fs';

const personality =
  readFileSync(
    'constants/characterPersonality.ts',
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );

const validation =
  readFileSync(
    'store/characterPersonalityValidation.ts',
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );

function fail(
  message
) {
  throw new Error(
    message
  );
}

function extractBlock(
  characterId
) {
  const start =
    personality.indexOf(
      `${characterId}: {`
    );

  if (
    start < 0
  ) {
    fail(
      `Missing personality block: ${characterId}`
    );
  }

  const end =
    personality.indexOf(
      '\n  },',
      start
    );

  if (
    end < 0
  ) {
    fail(
      `Missing personality block close: ${characterId}`
    );
  }

  return personality.slice(
    start,
    end +
      '\n  },'.length
  );
}

const identities = {
  rooty:
    'balanced',
  moru:
    'curious-active',
  mongsil:
    'cozy-calm',
  dami:
    'social-warm',
  pio:
    'explorer-curious',
  nuri:
    'playful-adventurous',
  tori:
    'gentle-shy',
};

console.log(
  '===== CHARACTER V95 IDENTITY PREFLIGHT ====='
);

const seen =
  new Set();

for (
  const [
    characterId,
    identity,
  ] of Object.entries(
    identities
  )
) {
  const block =
    extractBlock(
      characterId
    );

  if (
    !block.includes(
      `id: '${identity}'`
    )
  ) {
    fail(
      `${characterId}: expected ${identity}`
    );
  }

  if (
    seen.has(
      identity
    )
  ) {
    fail(
      `Identity is not unique: ${identity}`
    );
  }

  seen.add(
    identity
  );

  console.log(
    `PASS - ${characterId}: ${identity}`
  );
}

if (
  seen.size !== 7
) {
  fail(
    `Expected 7 unique identity ids, found ${seen.size}`
  );
}

if (
  !validation.includes(
    'CHARACTER_V95A_PROFILE_DRIVEN_SIGNATURE_VALIDATION'
  )
) {
  fail(
    'Profile-driven V79 validator marker missing'
  );
}

for (
  const identity of
  Object.values(
    identities
  )
) {
  if (
    !validation.includes(
      `'${identity}'`
    )
  ) {
    fail(
      `V79 validation missing identity branch: ${identity}`
    );
  }
}

const tori =
  extractBlock(
    'tori'
  );

for (
  const token of [
    'lookAround: 1.25',
    'sitRest: 1.45',
    'nap: 1.1',
    'spontaneousHappy: 0.8',
    'passiveAttention: 0.85',
    'bondedFollowUpTouch: 1.55',
  ]
) {
  if (
    !tori.includes(
      token
    )
  ) {
    fail(
      `Tori V93 value missing: ${token}`
    );
  }
}

console.log(
  'PASS - Seven unique behavior identity labels'
);

console.log(
  'PASS - V79 personality signature validation is profile-driven'
);

console.log(
  'PASS - Tori V93 multiplier values preserved'
);

console.log(
  'PASS - CHARACTER V95A IDENTITY PREFLIGHT'
);
