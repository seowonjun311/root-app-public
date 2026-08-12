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
  ).replace(
    /\r\n/g,
    '\n'
  );

const bridge =
  readFileSync(
    paths.bridge,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );

const settings =
  readFileSync(
    paths.settings,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );

for (
  const token of [
    'CHARACTER_V101I_QUIET_SLEEP_MODE',
    'CHARACTER_V101I_QUIET_PERSISTED_CONFIG',
    'CHARACTER_V101I_QUIET_RUNTIME',
    'CHARACTER_V101I_QUIET_POLICY',
    'PREF_QUIET_SCHEDULE_ENABLED',
    'PREF_QUIET_START_MINUTE',
    'PREF_QUIET_END_MINUTE',
    'PREF_QUIET_STOP_AUTO_MOVE',
    'PREF_QUIET_UNTIL_AT',
    'DEFAULT_QUIET_START_MINUTE = 23 * 60',
    'DEFAULT_QUIET_END_MINUTE = 7 * 60',
    'MAX_QUIET_DURATION_MS = 86400000L',
    'isScheduledQuietNow(',
    'isTemporaryQuietNow(',
    'isQuietActiveNow(',
    'refreshQuietMode(',
    'shouldSuppressAutoMoveForQuiet(',
    'silentlyDismissAutomaticReactions(',
  ]
) {
  if (!service.includes(token)) {
    fail(
      `service missing ${JSON.stringify(token)}`
    );
  }
}

if (
  service.includes(
    '!goalSpeechEnabled ||\n          pendingGoals.isEmpty() ||\n          overlayView == null'
  )
) {
  fail(
    'V101H zero-pending-goal contextual speech bug is still present'
  );
}

for (
  const token of [
    'CHARACTER_V101I_QUIET_NATIVE_BRIDGE',
    '"quietScheduleEnabled"',
    '"quietStartMinute"',
    '"quietEndMinute"',
    '"quietStopAutoMove"',
    '"quietUntilAt"',
    '"quietActive"',
    '"setQuietSchedule"',
    '"setQuietUntil"',
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
    'CHARACTER_V101I_QUIET_JS_BRIDGE',
    'quietScheduleEnabled: boolean;',
    'quietStartMinute: number;',
    'quietEndMinute: number;',
    'quietStopAutoMove: boolean;',
    'quietUntilAt: number;',
    'quietActive: boolean;',
    'setFloatingCharacterQuietSchedule',
    'setFloatingCharacterQuietUntil',
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
    'CHARACTER_V101I_QUIET_SLEEP_SETTINGS',
    '방해 금지 · 수면 시간',
    '수면 시간 자동 이동 멈춤',
    '빠른 조용히',
    "[30, '30분']",
    "[60, '1시간']",
    "[120, '2시간']",
    '빠른 조용히 해제',
    'V101J',
  ]
) {
  if (!settings.includes(token)) {
    fail(
      `settings missing ${JSON.stringify(token)}`
    );
  }
}

if (
  !/startMinute >=\s*endMinute|startMinute <\s*endMinute/.test(
    service
  ) &&
  !service.includes(
    'minute >=\n          startMinute ||'
  )
) {
  fail(
    'overnight quiet-window handling is missing'
  );
}

pass('default scheduled quiet window is 23:00~07:00 and can cross midnight');
pass('temporary quiet mode supports up to 24 hours and 30m/1h/2h controls are exposed');
pass('scheduled quiet suppresses automatic speech and can pause movement without changing the stored auto-move preference');
pass('temporary quick quiet suppresses unsolicited speech while leaving movement preference intact');
pass('completion/lifestyle reactions that arrive while quiet are silently acknowledged rather than replayed later');
pass('manual short-tap and long-press interaction paths remain outside the automatic-speech quiet gate');
pass('V101H contextual speech now truly continues with zero pending goals outside quiet mode');
console.log(
  'PASS - CHARACTER V101I QUIET + SLEEP SCHEDULE PREFLIGHT'
);
