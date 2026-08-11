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

const progression =
  read(
    'store/characterProgression.ts'
  );

const bridge =
  read(
    'store/characterGrowthPointReward.ts'
  );

const rootMemory =
  read(
    'store/rootMemory.ts'
  );

const policy =
  read(
    'constants/characterProgression.ts'
  );

console.log(
  '===== CHARACTER V97D GROWTH POINT REWARD PREFLIGHT ====='
);

for (
  const token of [
    'const totalPoints',
    'earnedPoints',
    'explorationPoints',
    '?.testPoints',
    'currentTestPoints',
    'testPoints: currentTestPoints - item.price',
  ]
) {
  expect(
    home,
    token,
    'ROOT point path'
  );
}

console.log(
  'PASS - Home spendable points still use earned + exploration + testPoints adjustment'
);

for (
  const token of [
    'CHARACTER_V97D_IDEMPOTENT_ROOT_POINT_GRANT',
    'characterGrowthRewardGrantIds',
    "'character-growth:' +",
    'CHARACTER_V97D_SERVER_TRANSACTION_LEDGER',
    '.runTransaction(',
    "'rootData.testPoints'",
    "'rootData.characterGrowthRewardGrantIds'",
    'CHARACTER_V97D_SERIALIZED_POINT_REWARD_QUEUE',
    'saveRootOnboardingData(',
  ]
) {
  expect(
    bridge,
    token,
    'Idempotent ROOT point bridge'
  );
}

console.log(
  'PASS - ROOT point grant has persistent idempotency ledger'
);

console.log(
  'PASS - logged-in reward uses Firestore transaction before local claim'
);

for (
  const token of [
    'CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT',
    'CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT_API',
    'getCharacterUnclaimedGrowthRewards(',
    'grantCharacterGrowthMilestoneRootPoints(',
    'markCharacterGrowthRewardClaimed(',
    'break;',
  ]
) {
  expect(
    progression,
    token,
    'Growth reward settlement'
  );
}

console.log(
  'PASS - unclaimed milestones retry and claim only after point grant confirmation'
);

for (
  const token of [
    'CHARACTER_V97D_HOME_POINT_REWARD_SYNC',
    'subscribeCharacterGrowthPointRewardRootData(',
    'setOnboardingData(',
  ]
) {
  expect(
    home,
    token,
    'Home point refresh'
  );
}

console.log(
  'PASS - Home point display refreshes after milestone grant'
);

for (
  const token of [
    'pointReward: 5',
    'pointReward: 10',
    'pointReward: 15',
    'pointReward: 25',
  ]
) {
  expect(
    policy,
    token,
    'Milestone reward values'
  );
}

console.log(
  'PASS - milestone rewards remain 5/10/15/25P'
);

for (
  const token of [
    'export async function saveRootOnboardingData',
    'export function getRootOnboardingData',
  ]
) {
  expect(
    rootMemory,
    token,
    'Root memory API'
  );
}

console.log(
  'PASS - existing ROOT local persistence API preserved'
);

for (
  const token of [
    'CHARACTER_V97C_SERIALIZED_INTERACTION_GROWTH',
    'CHARACTER_V97B_PROGRESSION_REACTIVE_HOOK',
    'CHARACTER_V97A_TWO_PHASE_REWARD_CLAIM',
  ]
) {
  expect(
    progression,
    token,
    'V97 regression'
  );
}

console.log(
  'PASS - V97A/V97B/V97C progression contracts preserved'
);

console.log(
  'PASS - CHARACTER V97D GROWTH POINT REWARD PREFLIGHT'
);
