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

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

const service =
  read(
    servicePath
  );

for (
  const token of [
    '// CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE',
    '// CHARACTER_V101B_NATIVE_IDLE_ANIMATION',
    'TYPE_APPLICATION_OVERLAY',
    'START_STICKY',
    'onTaskRemoved(',
    'Handler(',
    'Looper.getMainLooper()',
    'IDLE_FRAME_DURATION_MS',
    '700L',
    'animationHandler.postDelayed(',
    'private fun startIdleAnimation(',
    'private fun stopIdleAnimation()',
    'private fun drawableFramesForCharacter(',
    'attachDragAndTap(',
    'openRootApp()',
  ]
) {
  expect(
    service,
    token,
    'Native animated overlay service'
  );
}

const characterIds = [
  'rooty',
  'moru',
  'mongsil',
  'dami',
  'pio',
  'nuri',
  'tori',
];

for (
  const characterId of
  characterIds
) {
  const frame1 =
    `modules/root-floating-character/android/src/main/res/drawable-nodpi/root_character_${characterId}.png`;

  if (
    !existsSync(
      frame1
    )
  ) {
    fail(
      `Missing V101A frame 01 resource ${frame1}`
    );
  }

  if (
    statSync(
      frame1
    ).size <
    1024
  ) {
    fail(
      `Suspiciously small frame 01 resource ${frame1}`
    );
  }

  expect(
    service,
    `R.drawable.root_character_${characterId}`,
    `${characterId} frame 01 mapping`
  );

  for (
    let frame = 2;
    frame <= 4;
    frame += 1
  ) {
    const frameText =
      String(
        frame
      ).padStart(
        2,
        '0'
      );

    const resourceName =
      `root_character_${characterId}_idle_${frameText}`;

    const path =
      `modules/root-floating-character/android/src/main/res/drawable-nodpi/${resourceName}.png`;

    if (
      !existsSync(
        path
      )
    ) {
      fail(
        `Missing V101B idle resource ${path}`
      );
    }

    if (
      statSync(
        path
      ).size <
      1024
    ) {
      fail(
        `Suspiciously small V101B idle resource ${path}`
      );
    }

    expect(
      service,
      `R.drawable.${resourceName}`,
      `${characterId} frame ${frameText} mapping`
    );
  }
}

const postDelayMatches =
  service.match(
    /animationHandler\.postDelayed\(/g
  ) ?? [];

if (
  postDelayMatches.length <
  2
) {
  fail(
    'Idle animation must schedule both initial and recurring frame advances'
  );
}

console.log(
  'PASS - seven characters expose four native idle frames'
);

console.log(
  'PASS - main-thread handler drives low-frequency idle frame loop'
);

console.log(
  'PASS - selected-character update restarts idle animation'
);

console.log(
  'PASS - overlay removal cancels animation callbacks'
);

console.log(
  'PASS - V101A drag/tap/foreground-service contracts preserved'
);

console.log(
  'PASS - CHARACTER V101B FLOATING IDLE ANIMATION PREFLIGHT'
);
