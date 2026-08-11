import {
  existsSync,
  readFileSync,
} from 'node:fs';

const files = {
  assets:
    'constants/characterAssets.ts',
  presentation:
    'constants/characterPresentation.ts',
  personality:
    'constants/characterPersonality.ts',
  overrides:
    'store/characterPresentationOverrides.ts',
  statistics:
    'store/characterRuntimeStatistics.ts',
  deviceValidation:
    'store/characterDeviceValidation.ts',
  personalityValidation:
    'store/characterPersonalityValidation.ts',
  imageDiagnostics:
    'app/character-image-diagnostics.tsx',
  deviceValidationScreen:
    'app/character-device-validation.tsx',
  runtimeStatisticsScreen:
    'app/character-runtime-statistics.tsx',
  personalityValidationScreen:
    'app/character-personality-validation.tsx',
  assetValidator:
    'scripts/verify-standard-character-assets.mjs',
};

function fail(
  message
) {
  throw new Error(
    message
  );
}

function read(
  path
) {
  if (
    !existsSync(
      path
    )
  ) {
    fail(
      `Missing file: ${path}`
    );
  }

  return readFileSync(
    path,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
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

function expectAbsent(
  source,
  token,
  label
) {
  if (
    source.includes(
      token
    )
  ) {
    fail(
      `${label}: unexpected ${JSON.stringify(token)}`
    );
  }
}

function count(
  source,
  token
) {
  let result = 0;
  let index = 0;

  while (true) {
    index =
      source.indexOf(
        token,
        index
      );

    if (
      index < 0
    ) {
      return result;
    }

    result += 1;
    index +=
      token.length;
  }
}

const source = {};

for (
  const [
    key,
    path,
  ] of Object.entries(
    files
  )
) {
  source[key] =
    read(
      path
    );
}

console.log(
  '===== CHARACTER V94 INTEGRATION PREFLIGHT ====='
);

console.log(
  'CHECK - seven registered character ids'
);

const characterIds = [
  'rooty',
  'moru',
  'mongsil',
  'dami',
  'pio',
  'nuri',
  'tori',
];

const characterIdsStart =
  source.assets.indexOf(
    'export const CHARACTER_IDS'
  );

if (
  characterIdsStart < 0
) {
  fail(
    'characterAssets: CHARACTER_IDS declaration not found'
  );
}

const characterIdsEnd =
  source.assets.indexOf(
    '] as const;',
    characterIdsStart
  );

if (
  characterIdsEnd < 0
) {
  fail(
    'characterAssets: CHARACTER_IDS close not found'
  );
}

const characterIdsSlice =
  source.assets.slice(
    characterIdsStart,
    characterIdsEnd
  );

for (
  const id of
  characterIds
) {
  const token =
    `'${id}'`;

  if (
    count(
      characterIdsSlice,
      token
    ) !== 1
  ) {
    fail(
      `CHARACTER_IDS: expected exactly one ${token}`
    );
  }
}

console.log(
  'PASS - CHARACTER_IDS contains rooty/moru/mongsil/dami/pio/nuri/tori exactly once'
);

console.log(
  'CHECK - Tori 22-frame registry contract'
);

const toriFrames = [
  ...[
    1,
    2,
    3,
    4,
  ].map(
    (index) =>
      `../characters/tori/tori_idle_0${index}.png`
  ),
  ...[
    1,
    2,
    3,
    4,
  ].map(
    (index) =>
      `../characters/tori/tori_walk_0${index}.png`
  ),
  ...[
    1,
    2,
    3,
    4,
  ].map(
    (index) =>
      `../characters/tori/tori_sit_0${index}.png`
  ),
  ...[
    1,
    2,
    3,
    4,
    5,
  ].map(
    (index) =>
      `../characters/tori/tori_sleep_0${index}.png`
  ),
  ...[
    1,
    2,
    3,
  ].map(
    (index) =>
      `../characters/tori/tori_happy_0${index}.png`
  ),
  ...[
    1,
    2,
  ].map(
    (index) =>
      `../characters/tori/tori_touch_0${index}.png`
  ),
];

for (
  const frame of
  toriFrames
) {
  if (
    count(
      source.assets,
      frame
    ) !== 1
  ) {
    fail(
      `Tori registry: expected exactly one require for ${frame}`
    );
  }
}

if (
  toriFrames.length !== 22
) {
  fail(
    `Internal V94 verifier error: expected 22 Tori frame names, got ${toriFrames.length}`
  );
}

expectAbsent(
  source.assets,
  '../characters/tori/tori_happy_04.png',
  'Tori registry'
);

expect(
  source.assets,
  '../characters/tori/tori_reference_sheet.png',
  'Tori registry'
);

expect(
  source.assets,
  "displayName: '\\uD1A0\\uB9AC'",
  'Tori display name'
);

console.log(
  'PASS - Tori has exactly 22 runtime frame requires + reference and no happy_04'
);

console.log(
  'CHECK - Tori presentation + personality'
);

for (
  const token of [
    'CHARACTER_V92B_TORI_PRESENTATION',
    'homeScale: 1.1',
    'homeTranslateY: 5',
  ]
) {
  expect(
    source.presentation,
    token,
    'Tori presentation'
  );
}

for (
  const token of [
    'CHARACTER_V93_TORI_GENTLE_SHY_PERSONALITY',
    "id: 'social-warm'",
    'lookAround: 1.25',
    'sitRest: 1.45',
    'nap: 1.1',
    'spontaneousHappy: 0.8',
    'passiveAttention: 0.85',
    'bondedFollowUpTouch: 1.55',
  ]
) {
  expect(
    source.personality,
    token,
    'Tori personality'
  );
}

console.log(
  'PASS - Tori presentation and V93 gentle-shy values found'
);

console.log(
  'CHECK - Tori cross-system integration markers'
);

const integrationMarkers = [
  [
    source.overrides,
    'CHARACTER_V92B_TORI_PRESENTATION_OVERRIDE',
    'V72 presentation overrides',
  ],
  [
    source.statistics,
    'CHARACTER_V92B_TORI_RUNTIME_STATISTICS',
    'V78 statistics',
  ],
  [
    source.deviceValidation,
    'CHARACTER_V92B_TORI_DEVICE_VALIDATION',
    'V81 device validation',
  ],
  [
    source.personalityValidation,
    'CHARACTER_V92B_TORI_PERSONALITY_VALIDATION',
    'V79 personality validation',
  ],
  [
    source.imageDiagnostics,
    'CHARACTER_V92B_TORI_IMAGE_DIAGNOSTICS',
    'V83 image diagnostics',
  ],
  [
    source.deviceValidationScreen,
    'CHARACTER_V92B_TORI_DEVICE_VALIDATION_SCREEN',
    'V81 validation screen',
  ],
  [
    source.runtimeStatisticsScreen,
    'CHARACTER_V92B_TORI_RUNTIME_STATISTICS_SCREEN',
    'V78 statistics screen',
  ],
  [
    source.personalityValidationScreen,
    'CHARACTER_V92B_TORI_PERSONALITY_VALIDATION_SCREEN',
    'V79 validation screen',
  ],
];

for (
  const [
    fileText,
    marker,
    label,
  ] of integrationMarkers
) {
  expect(
    fileText,
    marker,
    label
  );
}

console.log(
  'PASS - Tori is represented in V72/V78/V79/V81/V83 integration sources'
);

console.log(
  'CHECK - Tori asset-validator contract'
);

// Do not inspect the validator's internal source formatting here.
// V92A deliberately owns the Tori exception and the authoritative
// verification is the executable contract:
//
//   npm run verify:character-assets -- tori
//
// V94A runs that validator separately after this structural verifier.
// Merely reading the validator above already proves the script exists.
console.log(
  'PASS - V89/V92A validator script exists; executable Tori contract is checked separately'
);

console.log(
  ''
);

console.log(
  'PASS - CHARACTER V94 source integration preflight'
);

console.log(
  'NEXT - Run full asset validation + TypeScript, then complete the device checklist.'
);
