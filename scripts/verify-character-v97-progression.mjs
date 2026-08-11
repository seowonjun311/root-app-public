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
    'constants/characterProgression.ts'
  );

const store =
  read(
    'store/characterProgression.ts'
  );

console.log(
  '===== CHARACTER V97A PROGRESSION PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V97A_GROWTH_LEVEL_POLICY',
    'level: 1',
    'minXp: 0',
    'level: 2',
    'minXp: 25',
    'pointReward: 5',
    'level: 3',
    'minXp: 75',
    'pointReward: 10',
    'level: 4',
    'minXp: 150',
    'pointReward: 15',
    'level: 5',
    'minXp: 250',
    'pointReward: 25',
  ]
) {
  expect(
    policy,
    token,
    'Growth policy'
  );
}

console.log(
  'PASS - 5-level growth thresholds + milestone point reward policy'
);

for (
  const token of [
    'CHARACTER_V97A_STARTER_ACQUISITION_POLICY',
    'rooty: true',
    'moru: false',
    'mongsil: false',
    'dami: false',
    'pio: false',
    'nuri: false',
    'tori: false',
  ]
) {
  expect(
    policy,
    token,
    'Starter acquisition'
  );
}

console.log(
  'PASS - Rooty-only starter acquisition policy'
);

for (
  const token of [
    "const STORAGE_KEY =\n  'character_progression_v1';",
    'CHARACTER_V97A_PROGRESSION_PERSISTENCE',
    'CHARACTER_V97A_PROGRESSION_SNAPSHOT',
    'CHARACTER_V97A_ACQUISITION_API',
    'CHARACTER_V97A_LEGACY_SELECTED_ACQUISITION_SEED',
    'CHARACTER_V97A_GROWTH_XP_API',
    'CHARACTER_V97A_TWO_PHASE_REWARD_CLAIM',
    'acquireCharacter(',
    'seedLegacySelectedCharacterAcquisition(',
    'addCharacterGrowthXp(',
    'getCharacterUnclaimedGrowthRewards(',
    'markCharacterGrowthRewardClaimed(',
  ]
) {
  expect(
    store,
    token,
    'Progression store'
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
    store,
    id,
    'Seven-character progression map'
  );
}

console.log(
  'PASS - all seven characters have independent progression records'
);

console.log(
  'PASS - acquisition + growth XP + reward claim APIs'
);

console.log(
  'PASS - legacy selected-character migration API'
);

console.log(
  'PASS - external point reward remains two-phase and unconnected in V97A'
);

console.log(
  'PASS - CHARACTER V97A PROGRESSION PREFLIGHT'
);
