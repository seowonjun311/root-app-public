import {
  readFileSync,
} from 'node:fs';

function read(path) {
  return readFileSync(
    path,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );
}

function fail(message) {
  throw new Error(
    message
  );
}

function expect(
  source,
  token,
  label
) {
  if (!source.includes(token)) {
    fail(
      `${label}: missing ${JSON.stringify(token)}`
    );
  }
}

const moduleIndex =
  read(
    'modules/root-floating-character/index.ts'
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

console.log(
  '===== CHARACTER V101C FLOATING MOTION + SCALE PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V101C_FLOATING_MOTION_SCALE',
    'CHARACTER_V101C_AUTONOMOUS_MOTION',
    'CHARACTER_V101C_DRAG_PINCH_SCALE',
    'ScaleGestureDetector(',
    'AUTO_MOVE_TICK_MS',
    'AUTO_MOVE_RESUME_AFTER_TOUCH_MS',
    'PREF_AUTO_MOVE',
    'PREF_SCALE',
    'MIN_SCALE = 0.60f',
    'MAX_SCALE = 1.60f',
    'startAutoMoveLoop(',
    'stopAutoMoveLoop()',
    'chooseAutoMoveTarget(',
    'applyOverlayScale(',
    'clampOverlayPosition(',
    'windowManager.updateViewLayout(',
    'persistScaleAndPosition()',
    'TYPE_APPLICATION_OVERLAY',
    'START_STICKY',
    'onTaskRemoved(',
    'CHARACTER_V101B_NATIVE_IDLE_ANIMATION',
    'IDLE_FRAME_DURATION_MS',
  ]
) {
  expect(
    serviceKotlin,
    token,
    'Native floating service'
  );
}

if (
  !/Random\.nextLong\(\s*AUTO_MOVE_PAUSE_MIN_MS,\s*AUTO_MOVE_PAUSE_MAX_MS\s*\+\s*1\s*\)/s.test(
    serviceKotlin
  )
) {
  fail(
    'Native floating service: autonomous movement pause window is missing'
  );
}

if (
  !/event\.pointerCount\s*==\s*1[\s\S]*!scaleDetector\.isInProgress/.test(
    serviceKotlin
  )
) {
  fail(
    'Native floating service: one-finger drag / pinch separation is missing'
  );
}

console.log(
  'PASS - native overlay supports autonomous motion, drag priority, pinch scale, bounds, and persistence'
);

for (
  const token of [
    'CHARACTER_V101C_MOTION_SCALE_NATIVE_BRIDGE',
    '"scale" to 1.0',
    '"autoMoveEnabled" to true',
    '"setScale"',
    '"setAutoMoveEnabled"',
    '.readScale(',
    '.readAutoMoveEnabled(',
    '.setScale(',
    '.setAutoMoveEnabled(',
    'CHARACTER_V101B_EAS_KOTLIN_NULL_RETURN_FIX',
  ]
) {
  expect(
    moduleKotlin,
    token,
    'Native Expo bridge'
  );
}

if (
  /return@AsyncFunction\s*(?:\r?\n|\})/.test(
    moduleKotlin
  )
) {
  fail(
    'Native Expo bridge: bare return@AsyncFunction reintroduced'
  );
}

console.log(
  'PASS - Expo bridge exposes scale and auto-move configuration without V101B return regression'
);

for (
  const token of [
    'CHARACTER_V101C_FLOATING_MOTION_SCALE_JS_BRIDGE',
    'scale: number;',
    'autoMoveEnabled: boolean;',
    'setFloatingCharacterScale(',
    'setFloatingCharacterAutoMoveEnabled(',
    'startFloatingCharacter(',
    'stopFloatingCharacter()',
    'updateFloatingCharacter(',
  ]
) {
  expect(
    moduleIndex,
    token,
    'TypeScript bridge'
  );
}

console.log(
  'PASS - TypeScript bridge exposes persisted motion/scale settings'
);

for (
  const token of [
    'CHARACTER_V101C_FLOATING_MOTION_SCALE_SETTINGS',
    'PanResponder.create(',
    '<Switch',
    '자동 이동',
    '캐릭터 크기',
    '60%',
    '160%',
    'setFloatingCharacterScale(',
    'setFloatingCharacterAutoMoveEnabled(',
    '두 손가락',
    '약 4초 후',
    '화면 위 표시 권한 열기',
    '현재 캐릭터 화면 위에 켜기',
    '화면 위 캐릭터 끄기',
  ]
) {
  expect(
    settings,
    token,
    'Floating settings screen'
  );
}

console.log(
  'PASS - settings screen exposes auto-move toggle and 60%-160% scale control'
);

console.log(
  'PASS - CHARACTER V101C FLOATING MOTION + SCALE PREFLIGHT'
);
