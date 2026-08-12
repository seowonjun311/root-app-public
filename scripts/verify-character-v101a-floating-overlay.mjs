import {
  existsSync,
  readFileSync,
  statSync,
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

const moduleIndex =
  read(
    'modules/root-floating-character/index.ts'
  );

const moduleConfig =
  read(
    'modules/root-floating-character/expo-module.config.json'
  );

const manifest =
  read(
    'modules/root-floating-character/android/src/main/AndroidManifest.xml'
  );

const moduleKotlin =
  read(
    'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterModule.kt'
  );

const serviceKotlin =
  read(
    'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt'
  );

const settings =
  read(
    'app/floating-character-settings.tsx'
  );

const preview =
  read(
    'app/character-preview.tsx'
  );

console.log(
  '===== CHARACTER V101A ANDROID FLOATING OVERLAY PREFLIGHT ====='
);

for (
  const token of [
    '"platforms": [',
    '"android"',
    'expo.modules.rootfloatingcharacter.RootFloatingCharacterModule',
  ]
) {
  expect(
    moduleConfig,
    token,
    'Expo local module config'
  );
}

console.log(
  'PASS - Android local Expo module autolink metadata'
);

for (
  const token of [
    'CHARACTER_V101A_FLOATING_OVERLAY_JS_BRIDGE',
    'requireOptionalNativeModule(',
    "'RootFloatingCharacter'",
    'startFloatingCharacter(',
    'stopFloatingCharacter()',
    'updateFloatingCharacter(',
    'getFloatingCharacterStatus()',
  ]
) {
  expect(
    moduleIndex,
    token,
    'JS bridge'
  );
}

console.log(
  'PASS - JS bridge exposes permission/start/stop/update/status'
);

for (
  const token of [
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
    'android:foregroundServiceType="specialUse"',
    'android:stopWithTask="false"',
    'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
  ]
) {
  expect(
    manifest,
    token,
    'Android manifest'
  );
}

console.log(
  'PASS - overlay + foreground-service manifest contract'
);

for (
  const token of [
    'CHARACTER_V101A_ANDROID_OVERLAY_NATIVE_BRIDGE',
    'Settings.ACTION_MANAGE_OVERLAY_PERMISSION',
    'Settings.canDrawOverlays(',
    'RootFloatingCharacterService.start(',
    'RootFloatingCharacterService.stop(',
  ]
) {
  expect(
    moduleKotlin,
    token,
    'Native module'
  );
}

// CHARACTER_V101A_V5_WHITESPACE_TOLERANT_UPDATE_BRIDGE_VERIFIER
// Kotlin formatting intentionally places RootFloatingCharacterService and
// .updateCharacter( on separate lines. Validate the semantic call while
// allowing whitespace/newlines between the receiver, dot, method, and paren.
if (
  !/RootFloatingCharacterService\s*\.\s*updateCharacter\s*\(/.test(
    moduleKotlin
  )
) {
  fail(
    'Native module: missing RootFloatingCharacterService.updateCharacter(...) bridge call'
  );
}

console.log(
  'PASS - native module controls Android overlay lifecycle'
);

for (
  const token of [
    'CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE',
    'TYPE_APPLICATION_OVERLAY',
    'START_STICKY',
    'FOREGROUND_SERVICE_TYPE_SPECIAL_USE',
    'onTaskRemoved(',
    'FLAG_NOT_FOCUSABLE',
    'FLAG_NOT_TOUCH_MODAL',
    'updateViewLayout(',
    'openRootApp()',
    'RootFloatingCharacterService::class.java',
    'ACTION_UPDATE',
    'EXTRA_CHARACTER_ID',
  ]
) {
  expect(
    serviceKotlin,
    token,
    'Floating service'
  );
}

if (
  !/fun\s+updateCharacter\s*\(/.test(
    serviceKotlin
  )
) {
  fail(
    'Floating service: missing updateCharacter(...) implementation'
  );
}

console.log(
  'PASS - foreground service owns draggable overlay after Activity removal'
);

for (
  const id of [
    'rooty',
    'moru',
    'mongsil',
    'dami',
    'pio',
    'nuri',
    'tori',
  ]
) {
  const path =
    `modules/root-floating-character/android/src/main/res/drawable-nodpi/root_character_${id}.png`;

  if (
    !existsSync(
      path
    )
  ) {
    fail(
      `Missing native overlay asset: ${path}`
    );
  }

  if (
    statSync(
      path
    ).size <=
      0
  ) {
    fail(
      `Empty native overlay asset: ${path}`
    );
  }
}

console.log(
  'PASS - seven selected-character idle sprites embedded as native resources'
);

for (
  const token of [
    'CHARACTER_V101A_FLOATING_OVERLAY_SETTINGS',
    'useSelectedCharacter()',
    '화면 위 표시 권한 열기',
    '현재 캐릭터 화면 위에 켜기',
    '화면 위 캐릭터 끄기',
    'AppState.addEventListener(',
  ]
) {
  expect(
    settings,
    token,
    'Floating settings screen'
  );
}

console.log(
  'PASS - device-visible permission/start/stop settings screen'
);

for (
  const token of [
    'CHARACTER_V101A_FLOATING_OVERLAY_ENTRY',
    "'/floating-character-settings' as never",
    '화면 위 캐릭터',
    'CHARACTER_V99E_DIALOGUE_DIAGNOSTICS_ENTRY',
  ]
) {
  expect(
    preview,
    token,
    'Character Preview entry'
  );
}

console.log(
  'PASS - Character Preview links floating overlay settings and preserves V99E diagnostics'
);

console.log(
  'PASS - CHARACTER V101A ANDROID FLOATING OVERLAY PREFLIGHT'
);
