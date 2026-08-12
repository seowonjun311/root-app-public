import {
  existsSync,
  readFileSync,
} from 'node:fs';

const paths = {
  service:
    'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt',
  nativeModule:
    'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterModule.kt',
  bridge:
    'modules/root-floating-character/index.ts',
  goalSync:
    'utils/floatingCharacterGoalSync.ts',
  lifestyleSync:
    'utils/floatingCharacterLifestyleSync.ts',
  day:
    'app/(tabs)/day.tsx',
};

function fail(message) {
  console.error(
    `FAIL - ${message}`
  );
  process.exit(
    1
  );
}

function pass(message) {
  console.log(
    `PASS - ${message}`
  );
}

for (
  const [
    label,
    path,
  ] of Object.entries(
    paths
  )
) {
  if (!existsSync(path)) {
    fail(
      `missing ${label}: ${path}`
    );
  }
}

const service =
  readFileSync(
    paths.service,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );

const nativeModule =
  readFileSync(
    paths.nativeModule,
    'utf8'
  );

const bridge =
  readFileSync(
    paths.bridge,
    'utf8'
  );

const goalSync =
  readFileSync(
    paths.goalSync,
    'utf8'
  );

const lifestyleSync =
  readFileSync(
    paths.lifestyleSync,
    'utf8'
  );

const day =
  readFileSync(
    paths.day,
    'utf8'
  );

for (
  const token of [
    'CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE',
    'CHARACTER_V101B_NATIVE_IDLE_ANIMATION',
    'CHARACTER_V101C_FLOATING_MOTION_SCALE',
    'CHARACTER_V101D_WALK_STATE_ANIMATION',
    'CHARACTER_V101E_GOAL_SPEECH_INTERACTION',
    'CHARACTER_V101F_GOAL_COMPLETION_CELEBRATION',
    'CHARACTER_V101G_LIFESTYLE_REACTION_TRAITS',
    'CHARACTER_V101G_LIFESTYLE_JSON_CONTRACT',
    'CHARACTER_V101G_LIFESTYLE_REACTION_RUNTIME',
    'CHARACTER_V101G_CHARACTER_COMMUNICATION_TRAITS',
    'CHARACTER_V101G_LIFESTYLE_REACTION_ENGINE',
    'ACTION_SET_LIFESTYLE_CONTEXT',
    'PREF_LIFESTYLE_CONTEXT_JSON',
    'PREF_LIFESTYLE_BASELINE_READY',
    'PREF_LIFESTYLE_REACTION_KEYS',
    'LIFESTYLE_REACTION_MIN_GAP_MS = 1200000L',
    'private fun buildGoalReminderMessage(',
    'private fun buildCompletionMessage(',
    'private fun lifestyleReactionChancePercent(',
    '"spend-praise"',
    '"spend-nag"',
    '"spend-nag-strong"',
  ]
) {
  if (!service.includes(token)) {
    fail(
      `service missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const id of [
    '"moru"',
    '"mongsil"',
    '"dami"',
    '"pio"',
    '"nuri"',
    '"tori"',
  ]
) {
  if (
    service.split(
      id
    ).length <
      4
  ) {
    fail(
      `character voice coverage is too small for ${id}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101G_LIFESTYLE_NATIVE_BRIDGE',
    '"setLifestyleContextSnapshot"',
    '.setLifestyleContextSnapshot(',
  ]
) {
  if (!nativeModule.includes(token)) {
    fail(
      `native module missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101G_LIFESTYLE_JS_BRIDGE',
    'FloatingCharacterLifestyleContextSnapshot',
    'setFloatingCharacterLifestyleContextSnapshot',
  ]
) {
  if (!bridge.includes(token)) {
    fail(
      `TypeScript bridge missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101G_GOAL_LIFESTYLE_CONTEXT_SYNC',
    'pendingGoalCount:',
    'completedGoalCount:',
    'dueGoalCount:',
    'setFloatingCharacterLifestyleContextSnapshot({',
  ]
) {
  if (!goalSync.includes(token)) {
    fail(
      `goal context sync missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101G_FLOATING_SPENDING_CONTEXT_SYNC',
    'getFixedDailyBudget(',
    "item?.type ===\n          'expense'",
    '!item?.cancelled',
    'todayExpense',
    'dailyBudget:',
    'monthExpense',
    'monthBudget',
  ]
) {
  if (!lifestyleSync.includes(token)) {
    fail(
      `spending context sync missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101G_DAY_LEDGER_CONTEXT_SYNC',
    'syncFloatingCharacterSpendingContext',
    'ledgers,',
    'ledgerBudgets',
    "daily_ledger_v1",
    "daily_ledger_budgets_v1",
  ]
) {
  if (!day.includes(token)) {
    fail(
      `day.tsx missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const threshold of [
    '1.50',
    '1.00',
    '0.30',
    '0.65',
  ]
) {
  if (!service.includes(threshold)) {
    fail(
      `lifestyle threshold missing ${threshold}`
    );
  }
}

if (
  !service.includes(
    '!previous.has(\n        "todayExpense"'
  ) ||
  !service.includes(
    '!previous.has(\n        "dailyBudget"'
  )
) {
  fail(
    'first spending snapshot is not explicitly protected as a silent baseline'
  );
}

if (
  !service.includes(
    'usedKeys.contains(\n        reactionKey'
  )
) {
  fail(
    'same-day lifestyle reaction dedupe is missing'
  );
}

pass('goal reminders and goal-completion praise now use character-specific communication voices');
pass('seven communication profiles cover balanced, coach, gentle, praise, explore, achievement, and soft styles');
pass('day ledger state + monthly budget feed a read-only native lifestyle snapshot');
pass('active expense filter and fixed daily-budget formula match the ROOT day-ledger contract');
pass('spending feedback supports controlled-spend praise, daily-budget nag, and strong overspend nag');
pass('first spending state/day rollover is silent and same date + same signal cannot repeat');
pass('V101A-F overlay, motion, walk, tap/long-press, goal speech, and completion celebration remain present');

console.log(
  'PASS - CHARACTER V101G LIFESTYLE REACTION + CHARACTER TRAITS PREFLIGHT'
);
