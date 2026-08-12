import {
  existsSync,
  readFileSync,
} from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS - ${message}`);
}

if (!existsSync(servicePath)) {
  fail(`missing ${servicePath}`);
}

const service =
  readFileSync(
    servicePath,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );

for (
  const token of [
    'CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE',
    'CHARACTER_V101B_NATIVE_IDLE_ANIMATION',
    'CHARACTER_V101C_FLOATING_MOTION_SCALE',
    'CHARACTER_V101D_WALK_STATE_ANIMATION',
    'CHARACTER_V101D_NATIVE_WALK_FRAMES',
    'WALK_FRAME_DURATION_MS = 220L',
    'private var walkingAnimationActive = false',
    'private fun startWalkAnimation(',
    'private fun setMovementAnimation(',
    'walkDrawableFramesForCharacter(',
    'AUTO_MOVE_PAUSE_MIN_MS = 2000L',
    'AUTO_MOVE_PAUSE_MAX_MS = 5000L',
    'AUTO_MOVE_RESUME_AFTER_TOUCH_MS = 4000L',
    'ScaleGestureDetector(',
    'TYPE_APPLICATION_OVERLAY',
  ]
) {
  if (!service.includes(token)) {
    fail(`service missing ${JSON.stringify(token)}`);
  }
}

const ids = [
  'rooty',
  'moru',
  'mongsil',
  'dami',
  'pio',
  'nuri',
  'tori',
];

for (const id of ids) {
  for (let frame = 1; frame <= 4; frame += 1) {
    const frameText =
      String(frame).padStart(
        2,
        '0'
      );

    const path =
      `modules/root-floating-character/android/src/main/res/drawable-nodpi/root_character_${id}_walk_${frameText}.png`;

    if (!existsSync(path)) {
      fail(`missing native walk frame ${path}`);
    }

    const token =
      `R.drawable.root_character_${id}_walk_${frameText}`;

    if (!service.includes(token)) {
      fail(`service mapping missing ${token}`);
    }
  }
}

if (
  !/if \(walkingAnimationActive\)[\s\S]{0,300}walkDrawableFramesForCharacter\(/.test(
    service
  )
) {
  fail('animation runnable does not select walk frames while moving');
}

if (
  !/if \(walkingAnimationActive\)[\s\S]{0,700}WALK_FRAME_DURATION_MS[\s\S]{0,250}IDLE_FRAME_DURATION_MS/.test(
    service
  )
) {
  fail('animation runnable does not switch walk/idle cadence');
}

const movementTrueCount =
  (
    service.match(
      /setMovementAnimation\(\s*true\s*\)/g
    ) ||
    []
  ).length;

const movementFalseCount =
  (
    service.match(
      /setMovementAnimation\(\s*false\s*\)/g
    ) ||
    []
  ).length;

if (movementTrueCount < 2) {
  fail(
    `expected autonomous + manual drag walk transitions, found ${movementTrueCount}`
  );
}

if (movementFalseCount < 5) {
  fail(
    `expected pause/touch/stop idle transitions, found ${movementFalseCount}`
  );
}

pass('all 28 native walk frames exist and are mapped');
pass('autonomous movement uses walk animation and pauses use idle animation');
pass('manual one-finger drag uses walk animation and release returns to idle');
pass('V101A overlay, V101B idle animation, and V101C motion/scale contracts remain present');
console.log('PASS - CHARACTER V101D WALK-STATE ANIMATION PREFLIGHT');
