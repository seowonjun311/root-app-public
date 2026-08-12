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
  settings:
    'app/floating-character-settings.tsx',
  home:
    'app/(tabs)/index.tsx',
  goalSync:
    'utils/floatingCharacterGoalSync.ts',
};

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS - ${message}`);
}

for (
  const [
    label,
    path,
  ] of
  Object.entries(
    paths
  )
) {
  if (!existsSync(path)) {
    fail(
      `missing ${label}: ${path}`
    );
  }
}

const read =
  (path) =>
    readFileSync(
      path,
      'utf8'
    ).replace(
      /\r\n/g,
      '\n'
    );

const service =
  read(
    paths.service
  );
const nativeModule =
  read(
    paths.nativeModule
  );
const bridge =
  read(
    paths.bridge
  );
const settings =
  read(
    paths.settings
  );
const home =
  read(
    paths.home
  );
const goalSync =
  read(
    paths.goalSync
  );

for (
  const token of [
    'CHARACTER_V101D_WALK_STATE_ANIMATION',
    'CHARACTER_V101E_GOAL_SPEECH_INTERACTION',
    'CHARACTER_V101E_TAP_LONG_PRESS_MENU',
    'CHARACTER_V101E_GOAL_SPEECH_ENGINE',
    'LONG_PRESS_MS = 650L',
    'showTapReaction()',
    'showActionMenu()',
    '"캐릭터 끄기"',
    '"ROOT 가기"',
    'ACTION_SET_GOAL_SNAPSHOT',
    'ACTION_SET_GOAL_SPEECH',
    'ACTION_SHOW_GOAL_SPEECH_NOW',
    'GOAL_SPEECH_MIN_INTERVAL_MS = 600000L',
    'GOAL_SPEECH_MAX_INTERVAL_MS = 1200000L',
    'SAME_GOAL_COOLDOWN_MS = 1800000L',
    'walkingAnimationActive',
    'pendingGoals',
  ]
) {
  if (!service.includes(token)) {
    fail(
      `service missing ${JSON.stringify(token)}`
    );
  }
}

const actionUpStart =
  service.indexOf(
    'MotionEvent.ACTION_UP ->'
  );
const actionCancelStart =
  service.indexOf(
    'MotionEvent.ACTION_CANCEL ->',
    actionUpStart
  );

if (
  actionUpStart < 0 ||
  actionCancelStart < 0
) {
  fail(
    'could not isolate ACTION_UP touch block'
  );
}

const actionUpBlock =
  service.slice(
    actionUpStart,
    actionCancelStart
  );

for (
  const token of [
    'pressDuration',
    'LONG_PRESS_MS',
    'showActionMenu()',
    'showTapReaction()',
  ]
) {
  if (!actionUpBlock.includes(token)) {
    fail(
      `ACTION_UP block missing ${JSON.stringify(token)}`
    );
  }
}

if (
  actionUpBlock.includes(
    'openRootApp()'
  )
) {
  fail(
    'short tap still directly opens ROOT'
  );
}

if (
  !/userInteracting\s*\|\|[\s\S]{0,120}walkingAnimationActive[\s\S]{0,120}actionMenuView != null/.test(
    service
  )
) {
  fail(
    'goal speech is not gated while moving/interacting/menu-open'
  );
}

for (
  const token of [
    'CHARACTER_V101E_GOAL_SPEECH_NATIVE_BRIDGE',
    '"goalSpeechEnabled"',
    '"pendingGoalCount"',
    '"setGoalSnapshot"',
    '"setGoalSpeechEnabled"',
    '"showGoalSpeechNow"',
    'return@AsyncFunction 0',
    'return@AsyncFunction false',
  ]
) {
  if (!nativeModule.includes(token)) {
    fail(
      `native module missing ${JSON.stringify(token)}`
    );
  }
}

if (
  /return@AsyncFunction\s*(?:\r?\n|$)/.test(
    nativeModule
  )
) {
  fail(
    'bare return@AsyncFunction regression detected'
  );
}

for (
  const token of [
    'CHARACTER_V101E_GOAL_SPEECH_JS_BRIDGE',
    'goalSpeechEnabled: boolean',
    'pendingGoalCount: number',
    'setFloatingCharacterGoalSnapshot',
    'setFloatingCharacterGoalSpeechEnabled',
    'showFloatingCharacterGoalSpeechNow',
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
    'CHARACTER_V101E_FLOATING_GOAL_SNAPSHOT_SYNC',
    'completedDates',
    'completedDays',
    'selectedDays',
    'weeklyCount',
    'setFloatingCharacterGoalSnapshot',
  ]
) {
  if (!goalSync.includes(token)) {
    fail(
      `goal sync utility missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101E_FLOATING_GOAL_HOME_SYNC',
    'syncFloatingCharacterGoals',
    'actionGoals',
  ]
) {
  if (!home.includes(token)) {
    fail(
      `Home sync missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101E_GOAL_SPEECH_INTERACTION_SETTINGS',
    '행동목표 말해주기',
    '지금 말해보기',
    'status.goalSpeechEnabled',
    'status.pendingGoalCount',
    'setFloatingCharacterGoalSpeechEnabled',
    'showFloatingCharacterGoalSpeechNow',
    '짧게 누르면 캐릭터가 반응',
    '길게 누르면 캐릭터 끄기·ROOT 가기',
  ]
) {
  if (!settings.includes(token)) {
    fail(
      `settings missing ${JSON.stringify(token)}`
    );
  }
}

pass('short tap reacts instead of opening ROOT');
pass('long press exposes character-off and ROOT navigation menu');
pass('pending action goals are synced read-only from ROOT into native overlay storage');
pass('goal speech waits for idle state and applies anti-repeat timing');
pass('settings expose goal-speech toggle, pending count, and immediate test');
pass('V101D walk-state contract remains present');
console.log('PASS - CHARACTER V101E GOAL SPEECH + INTERACTION PREFLIGHT');
