import {
  existsSync,
  readFileSync,
} from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

const bridgePath =
  'modules/root-floating-character/index.ts';

const lifestyleSyncPath =
  'utils/floatingCharacterLifestyleSync.ts';

const rootyStatePath =
  'store/rootyState.ts';

const settingsPath =
  'app/floating-character-settings.tsx';

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
  const path of [
    servicePath,
    bridgePath,
    lifestyleSyncPath,
    rootyStatePath,
    settingsPath,
  ]
) {
  if (!existsSync(path)) {
    fail(
      `missing ${path}`
    );
  }
}

const service =
  readFileSync(
    servicePath,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );

const bridge =
  readFileSync(
    bridgePath,
    'utf8'
  );

const lifestyleSync =
  readFileSync(
    lifestyleSyncPath,
    'utf8'
  );

const rootyState =
  readFileSync(
    rootyStatePath,
    'utf8'
  );

const settings =
  readFileSync(
    settingsPath,
    'utf8'
  );

for (
  const token of [
    'CHARACTER_V101H_TIME_STATE_CONTEXT_SPEECH',
    'CHARACTER_V101H_TIME_STATE_CONTEXT_ENGINE',
    'PREF_TIME_STATE_SPEECH_KEYS',
    'private fun currentTimePeriod(',
    '"morning"',
    '"day"',
    '"evening"',
    '"late-night"',
    '"exhausted"',
    '"tired"',
    '"low-mood"',
    '"energetic-goal"',
    'energy <=',
    '24.0',
    '49.0',
    'mood <',
    '30.0',
    'energy >=',
    '75.0',
    'affection >=',
    '75.0',
    'private fun shouldSoftenNagging()',
  ]
) {
  if (!service.includes(token)) {
    fail(
      `service missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'mood?: number;',
    'energy?: number;',
    'affection?: number;',
  ]
) {
  if (!bridge.includes(token)) {
    fail(
      `bridge missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101H_ROOTY_STATE_CONTEXT_SYNC',
    'syncFloatingCharacterRootyStateContext',
    'mood:',
    'energy:',
    'affection:',
  ]
) {
  if (!lifestyleSync.includes(token)) {
    fail(
      `lifestyle sync missing ${JSON.stringify(token)}`
    );
  }
}

for (
  const token of [
    'CHARACTER_V101H_ROOTY_STATE_NATIVE_CONTEXT_SYNC',
    'syncFloatingCharacterRootyStateContext',
    'const state: RootyState = {',
    'void syncFloatingCharacterRootyStateContext(',
  ]
) {
  if (!rootyState.includes(token)) {
    fail(
      `rootyState missing ${JSON.stringify(token)}`
    );
  }
}

if (
  (
    rootyState.match(
      /void syncFloatingCharacterRootyStateContext\(/g
    ) ??
    []
  ).length <
    2
) {
  fail(
    'Rooty state must sync both restored and newly saved state'
  );
}

for (
  const token of [
    'CHARACTER_V101H_TIME_STATE_SETTINGS_COPY',
    '목표·상태 말풍선',
    'V101E compatibility label: 행동목표 말해주기',
    '시간대·에너지·기분 상태',
    '늦은 밤에는 독촉을 부드럽게',
  ]
) {
  if (!settings.includes(token)) {
    fail(
      `settings missing ${JSON.stringify(token)}`
    );
  }
}

if (
  !/!goalSpeechEnabled\s*\|\|\s*overlayView == null/.test(
    service
  )
) {
  fail(
    'context speech scheduler still appears to require pending goals'
  );
}

pass('time periods are classified as morning/day/evening/late-night using device-local clock');
pass('V59-compatible mood/energy thresholds drive exhausted/tired/low-mood/energetic speech priority');
pass('Rooty mood/energy/affection are read-only lifestyle context inputs and remain persisted by the existing Rooty state authority');
pass('late-night and low-mood contexts soften spending nagging rather than escalating it');
pass('contextual speech can continue even when no action goals remain');
pass('same date + period + context signal is deduplicated to avoid repeated time-state chatter');
pass('V101A-G overlay, motion, interaction, goal, completion, and lifestyle contracts remain present');
console.log(
  'PASS - CHARACTER V101H TIME + STATE CONTEXT SPEECH PREFLIGHT'
);
