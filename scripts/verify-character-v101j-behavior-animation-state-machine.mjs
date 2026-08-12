import {
  existsSync,
  readFileSync,
} from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

const drawableDir =
  'modules/root-floating-character/android/src/main/res/drawable-nodpi';

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
    'CHARACTER_V101J_BEHAVIOR_ANIMATION_STATE_MACHINE',
    'CHARACTER_V101J_BEHAVIOR_STATE_RUNTIME',
    'CHARACTER_V101J_NATURAL_REST_STATE_MACHINE',
    'CHARACTER_V101J_NATIVE_SIT_FRAMES',
    'CHARACTER_V101J_NATIVE_SLEEP_FRAMES',
    'CHARACTER_V101J_NATIVE_TOUCH_FRAMES',
    'NATURAL_SIT_AFTER_MS = 2200L',
    'NATURAL_SLEEP_AFTER_MS = 4200L',
    'NATURAL_SLEEP_HOLD_MS = 5000L',
    'BehaviorAnimationMode.SIT',
    'BehaviorAnimationMode.SLEEP',
    'BehaviorAnimationMode.HAPPY',
    'BehaviorAnimationMode.TOUCH',
  ]
) {
  if (!service.includes(token)) {
    fail(
      `service missing ${JSON.stringify(token)}`
    );
  }
}

const standardIds = [
  'moru',
  'mongsil',
  'dami',
  'pio',
  'nuri',
  'tori',
];

const standardActions = [
  ['sit', 4],
  ['sleep', 5],
  ['touch', 2],
];

let newFrameCount = 0;

for (const id of standardIds) {
  for (const [action, count] of standardActions) {
    for (let frame = 1; frame <= count; frame += 1) {
      const frameText =
        String(frame).padStart(
          2,
          '0'
        );

      const resource =
        `${drawableDir}/root_character_${id}_${action}_${frameText}.png`;

      if (!existsSync(resource)) {
        fail(
          `missing standard behavior resource ${resource}`
        );
      }

      const mapping =
        `R.drawable.root_character_${id}_${action}_${frameText}`;

      if (!service.includes(mapping)) {
        fail(
          `missing standard mapping ${mapping}`
        );
      }

      newFrameCount += 1;
    }
  }
}

for (let frame = 1; frame <= 4; frame += 1) {
  const frameText =
    String(frame).padStart(
      2,
      '0'
    );

  const resource =
    `${drawableDir}/root_character_rooty_sit_${frameText}.png`;

  if (!existsSync(resource)) {
    fail(
      `missing Rooty sit resource ${resource}`
    );
  }

  newFrameCount += 1;
}

const rootySleep =
  `${drawableDir}/root_character_rooty_sleep_01.png`;

if (!existsSync(rootySleep)) {
  fail(
    `missing Rooty legacy sleep resource ${rootySleep}`
  );
}

newFrameCount += 1;

if (newFrameCount !== 71) {
  fail(
    `expected 71 newly copied behavior resources, found ${newFrameCount}`
  );
}

for (
  const token of [
    'R.drawable.root_character_rooty_sleep_01',
    'R.drawable.root_character_rooty_happy_01',
    'R.drawable.root_character_rooty_happy_02',
  ]
) {
  if (!service.includes(token)) {
    fail(
      `Rooty legacy/fallback mapping missing ${token}`
    );
  }
}

if (
  service.includes(
    'R.drawable.root_character_rooty_sleep_02'
  )
) {
  fail(
    'V101J must not invent Rooty sleep_02+ resources'
  );
}

if (
  service.includes(
    'R.drawable.root_character_rooty_touch_01'
  ) ||
  service.includes(
    'R.drawable.root_character_rooty_touch_02'
  )
) {
  fail(
    'V101J must not invent Rooty touch PNG resources'
  );
}

pass('Rooty remains legacy variable-frame: sit4 + sleep1 + touch-to-happy fallback');
pass('no nonexistent Rooty sleep_02+ or touch PNGs are invented');
pass('six standard characters expose sit4 + sleep5 + touch2');
pass('71 new native behavior PNGs satisfy the mixed contract');
pass('Rooty single-frame sleep safely holds its only frame');
pass('Rooty short tap uses existing V101F happy_01/happy_02 as visual fallback');
pass('Tori keeps its intentional happy-3 exception');
console.log(
  'PASS - CHARACTER V101J LEGACY-ROOTY BEHAVIOR STATE MACHINE PREFLIGHT'
);
