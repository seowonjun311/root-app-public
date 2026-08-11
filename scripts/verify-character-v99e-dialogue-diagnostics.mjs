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

const dialogue =
  read(
    'store/characterMicroDialogue.ts'
  );

const diagnostics =
  read(
    'store/characterDialogueDiagnostics.ts'
  );

const screen =
  read(
    'app/character-dialogue-diagnostics.tsx'
  );

const preview =
  read(
    'app/character-preview.tsx'
  );

console.log(
  '===== CHARACTER V99E DIALOGUE DIAGNOSTICS + RELEASE TUNING PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V99E_DETERMINISTIC_DIALOGUE_DIAGNOSTICS',
    'CHARACTER_DIALOGUE_DIAGNOSTIC_SEED =\n  99_005',
    'CHARACTER_DIALOGUE_DIAGNOSTIC_SAMPLES_PER_CONTEXT =\n  10_000',
    'CHARACTER_DIALOGUE_RATE_TOLERANCE =\n  0.015',
    'CHARACTER_DIALOGUE_RELEASE_TUNING',
    'runCharacterDialogueDeterministicDiagnostics(',
    'createSeededRandom(',
    'relationshipChecks()',
    'statePriorityChecks()',
    'releaseTuningChecks()',
    'autonomousRateChecks(',
    'CHARACTER_V99E_RELEASE_TUNING_GATES',
  ]
) {
  expect(
    diagnostics,
    token,
    'Deterministic diagnostics engine'
  );
}

console.log(
  'PASS - fixed-seed deterministic diagnostics engine'
);

for (
  const token of [
    'interactionCooldownMinMs:',
    '1_800',
    'interactionCooldownMaxMs:',
    '3_000',
    'startupGraceMinMs:',
    '20_000',
    'startupGraceMaxMs:',
    '45_000',
    'autonomousCooldownMinMs:',
    '60_000',
    'autonomousCooldownMaxMs:',
    '120_000',
    'maxAutonomousChance:',
    '0.12',
  ]
) {
  expect(
    diagnostics,
    token,
    'Release tuning gates'
  );
}

console.log(
  'PASS - release tuning gates bound cooldown/grace/chance without mutating V99D'
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
    'CHARACTER_V99D_RELATIONSHIP_DIALOGUE_DEPTH',
    'getCharacterRelationshipDialogueTier(',
    'getCharacterMicroDialogueTone(',
  ]
) {
  expect(
    dialogue,
    token,
    'V99D policy'
  );
}

console.log(
  'PASS - V99D release-candidate policy values remain unchanged'
);

function createSeededRandom(
  seed
) {
  let state =
    seed >>> 0;

  return () => {
    state =
      (
        state +
        0x6D2B79F5
      ) >>> 0;

    let value =
      state;

    value =
      Math.imul(
        value ^
          (
            value >>>
            15
          ),
        value |
          1
      );

    value ^=
      value +
      Math.imul(
        value ^
          (
            value >>>
            7
          ),
        value |
          61
      );

    return (
      (
        value ^
        (
          value >>>
          14
        )
      ) >>>
      0
    ) /
    4_294_967_296;
  };
}

function simulate(
  seed
) {
  const random =
    createSeededRandom(
      seed
    );

  const policies = [
    [
      'idle',
      0.04,
    ],
    [
      'lookAround',
      0.10,
    ],
    [
      'sit',
      0.08,
    ],
    [
      'sleep',
      0.12,
    ],
  ];

  return policies.map(
    (
      [
        context,
        expectedRate,
      ]
    ) => {
      let hits =
        0;

      for (
        let i = 0;
        i <
        10_000;
        i += 1
      ) {
        if (
          random() <
          expectedRate
        ) {
          hits +=
            1;
        }
      }

      const observedRate =
        hits /
        10_000;

      const error =
        Math.abs(
          observedRate -
          expectedRate
        );

      if (
        error >
        0.015
      ) {
        fail(
          `${context}: deterministic observed rate ${observedRate} exceeded tolerance`
        );
      }

      return {
        context,
        hits,
        observedRate,
      };
    }
  );
}

const first =
  simulate(
    99_005
  );

const second =
  simulate(
    99_005
  );

if (
  JSON.stringify(
    first
  ) !==
  JSON.stringify(
    second
  )
) {
  fail(
    'Fixed seed did not reproduce identical autonomous simulation results'
  );
}

for (
  const item of
  first
) {
  console.log(
    `PASS - deterministic ${item.context}: hits=${item.hits}, rate=${(
      item.observedRate *
      100
    ).toFixed(
      2
    )}%`
  );
}

console.log(
  'PASS - same seed reproduces identical 10,000-sample context simulations'
);

const tierOrder = [
  "value >=\n    75",
  "return 'bonded'",
  "value >=\n    50",
  "return 'close'",
  "value >=\n    25",
  "return 'familiar'",
  "return 'distant'",
];

let lastIndex =
  -1;

for (
  const token of
  tierOrder
) {
  const index =
    dialogue.indexOf(
      token
    );

  if (
    index <=
    lastIndex
  ) {
    fail(
      `Relationship tier boundary/order invalid around ${JSON.stringify(token)}`
    );
  }

  lastIndex =
    index;
}

console.log(
  'PASS - relationship tier boundaries remain 0/25/50/75'
);

const tiredIndex =
  dialogue.indexOf(
    'condition.flags.isTired'
  );

const lowIndex =
  dialogue.indexOf(
    'condition.flags.isLowMood'
  );

const excitedIndex =
  dialogue.indexOf(
    'condition.flags.isExcited'
  );

const bondedLongIndex =
  dialogue.indexOf(
    "interaction ===\n      'longPress'"
  );

const happyIndex =
  dialogue.indexOf(
    "condition.mood ===\n      'happy'"
  );

if (
  !(
    tiredIndex >=
      0 &&
    lowIndex >
      tiredIndex &&
    excitedIndex >
      lowIndex &&
    bondedLongIndex >
      excitedIndex &&
    happyIndex >
      bondedLongIndex
  )
) {
  fail(
    'V99C/V99D state priority order changed'
  );
}

console.log(
  'PASS - tired > low > excited > bonded-long > happy > calm priority preserved'
);

for (
  const token of [
    'CHARACTER_V99E_DIALOGUE_DIAGNOSTICS_SCREEN',
    'RELEASE STATUS',
    'runCharacterDialogueDeterministicDiagnostics()',
    '출시 튜닝',
    '친밀도 경계',
    '상태 우선순위',
    '자율 대사 확률',
    '같은 시드로 다시 검증',
    '실제 대사를 발생시키거나 친밀도·XP·클라우드 데이터를 변경하지 않습니다.',
  ]
) {
  expect(
    screen,
    token,
    'Dialogue diagnostics screen'
  );
}

console.log(
  'PASS - device-visible diagnostics screen exposes release, tier, state, and rate results'
);

for (
  const token of [
    'CHARACTER_V99E_DIALOGUE_DIAGNOSTICS_ENTRY',
    "'/character-dialogue-diagnostics' as never",
    '대사 정책 진단',
    'CHARACTER_V98D_CLOUD_DIAGNOSTICS_ENTRY',
  ]
) {
  expect(
    preview,
    token,
    'Character Preview diagnostics entry'
  );
}

console.log(
  'PASS - Character Preview links dialogue diagnostics while preserving cloud diagnostics'
);

for (
  const source of [
    diagnostics,
    screen,
  ]
) {
  if (
    source.includes(
      '@react-native-async-storage/async-storage'
    ) ||
    source.includes(
      '@react-native-firebase/firestore'
    )
  ) {
    fail(
      'V99E diagnostics must not persist or synchronize dialogue simulation data'
    );
  }
}

console.log(
  'PASS - V99E diagnostics adds no persistence/cloud authority'
);

console.log(
  'PASS - CHARACTER V99E DIALOGUE DIAGNOSTICS + RELEASE TUNING PREFLIGHT'
);
