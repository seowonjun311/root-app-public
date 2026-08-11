import {
  createHash,
} from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  dirname,
  join,
  relative,
} from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const SCRIPT_DIR =
  dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const PROJECT_ROOT =
  dirname(
    SCRIPT_DIR
  );

const CHARACTERS_ROOT =
  join(
    PROJECT_ROOT,
    'characters'
  );

// CHARACTER_V89_STANDARD23_ASSET_PREFLIGHT
const STANDARD_WIDTH =
  1024;

const STANDARD_HEIGHT =
  1536;

const ACTION_COUNTS = {
  idle: 4,
  walk: 4,
  sit: 4,
  sleep: 5,
  happy: 4,
  touch: 2,
};

const EXPECTED_RUNTIME_COUNT =
  Object.values(
    ACTION_COUNTS
  ).reduce(
    (sum, count) =>
      sum + count,
    0
  );

const PNG_SIGNATURE =
  Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]);

function fail(message) {
  throw new Error(
    message
  );
}

function zeroPad(
  value
) {
  return String(
    value
  ).padStart(
    2,
    '0'
  );
}

function expectedRuntimeNames(
  characterId
) {
  const names = [];

  for (
    const [
      action,
      count,
    ] of Object.entries(
      ACTION_COUNTS
    )
  ) {
    for (
      let index = 1;
      index <= count;
      index += 1
    ) {
      names.push(
        `${characterId}_${action}_${zeroPad(index)}.png`
      );
    }
  }

  // CHARACTER_V92_TORI_STANDARD22_EXCEPTION
  // Tori intentionally uses 3 happy frames, for 22 runtime frames total.
  if (characterId === 'tori') {
    return names.filter(
      (name) =>
        name !== 'tori_happy_04.png'
    );
  }

  return names;
}

function parsePngDimensions(
  filePath
) {
  const buffer =
    readFileSync(
      filePath
    );

  if (
    buffer.length < 24
  ) {
    fail(
      `PNG too small: ${relative(PROJECT_ROOT, filePath)}`
    );
  }

  if (
    !buffer
      .subarray(
        0,
        8
      )
      .equals(
        PNG_SIGNATURE
      )
  ) {
    fail(
      `Invalid PNG signature: ${relative(PROJECT_ROOT, filePath)}`
    );
  }

  if (
    buffer
      .subarray(
        12,
        16
      )
      .toString(
        'ascii'
      ) !== 'IHDR'
  ) {
    fail(
      `PNG IHDR missing at expected position: ${relative(PROJECT_ROOT, filePath)}`
    );
  }

  return {
    width:
      buffer.readUInt32BE(
        16
      ),
    height:
      buffer.readUInt32BE(
        20
      ),
    buffer,
  };
}

function sha256(
  buffer
) {
  return createHash(
    'sha256'
  )
    .update(
      buffer
    )
    .digest(
      'hex'
    );
}

function validateCharacter(
  characterId
) {
  if (
    !/^[a-z][a-z0-9_-]*$/.test(
      characterId
    )
  ) {
    fail(
      `Invalid character id "${characterId}". Use lowercase ASCII id names.`
    );
  }

  if (
    characterId === 'rooty'
  ) {
    fail(
      'rooty is legacy-rooty and is intentionally excluded from the standard-23 validator.'
    );
  }

  const folder =
    join(
      CHARACTERS_ROOT,
      characterId
    );

  if (
    !existsSync(
      folder
    )
  ) {
    fail(
      `Character folder does not exist: characters/${characterId}`
    );
  }

  if (
    !statSync(
      folder
    ).isDirectory()
  ) {
    fail(
      `Character path is not a directory: characters/${characterId}`
    );
  }

  const entries =
    readdirSync(
      folder,
      {
        withFileTypes: true,
      }
    );

  const visibleEntries =
    entries.filter(
      (entry) =>
        ![
          '.DS_Store',
          'Thumbs.db',
          'desktop.ini',
        ].includes(
          entry.name
        )
    );

  const nested =
    visibleEntries.filter(
      (entry) =>
        !entry.isFile()
    );

  if (
    nested.length > 0
  ) {
    fail(
      `${characterId}: nested/non-file entries are not allowed: ${nested.map((entry) => entry.name).join(', ')}`
    );
  }

  const actualNames =
    visibleEntries
      .map(
        (entry) =>
          entry.name
      )
      .sort();

  const expectedRuntime =
    expectedRuntimeNames(
      characterId
    );

  const expectedSet =
    new Set(
      expectedRuntime
    );

  const referenceName =
    `${characterId}_reference_sheet.png`;

  const allowedSet =
    new Set([
      ...expectedRuntime,
      referenceName,
    ]);

  const missing =
    expectedRuntime.filter(
      (name) =>
        !actualNames.includes(
          name
        )
    );

  const unexpected =
    actualNames.filter(
      (name) =>
        !allowedSet.has(
          name
        )
    );

  if (
    missing.length > 0
  ) {
    fail(
      `${characterId}: missing runtime frames (${missing.length}): ${missing.join(', ')}`
    );
  }

  if (
    unexpected.length > 0
  ) {
    fail(
      `${characterId}: unexpected files (${unexpected.length}): ${unexpected.join(', ')}`
    );
  }

  const runtimeNames =
    actualNames.filter(
      (name) =>
        expectedSet.has(
          name
        )
    );

  const expectedRuntimeCount =
    characterId === 'tori'
      ? EXPECTED_RUNTIME_COUNT - 1
      : EXPECTED_RUNTIME_COUNT;

  if (
    runtimeNames.length !==
      expectedRuntimeCount
  ) {
    fail(
      `${characterId}: expected ${expectedRuntimeCount} runtime frames, found ${runtimeNames.length}`
    );
  }

  const hashToNames =
    new Map();

  for (
    const name of
    expectedRuntime
  ) {
    const filePath =
      join(
        folder,
        name
      );

    const {
      width,
      height,
      buffer,
    } =
      parsePngDimensions(
        filePath
      );

    if (
      width !==
        STANDARD_WIDTH ||
      height !==
        STANDARD_HEIGHT
    ) {
      fail(
        `${characterId}: ${name} is ${width}x${height}; standard-23 runtime frames must be ${STANDARD_WIDTH}x${STANDARD_HEIGHT}`
      );
    }

    const hash =
      sha256(
        buffer
      );

    const duplicates =
      hashToNames.get(
        hash
      ) ?? [];

    duplicates.push(
      name
    );

    hashToNames.set(
      hash,
      duplicates
    );
  }

  const duplicateGroups =
    [
      ...hashToNames.values(),
    ].filter(
      (names) =>
        names.length > 1
    );

  if (
    duplicateGroups.length > 0
  ) {
    fail(
      `${characterId}: duplicate runtime image content detected: ${duplicateGroups.map((group) => `[${group.join(', ')}]`).join(' ')}`
    );
  }

  let referenceSummary =
    'none';

  if (
    actualNames.includes(
      referenceName
    )
  ) {
    const referencePath =
      join(
        folder,
        referenceName
      );

    const {
      width,
      height,
    } =
      parsePngDimensions(
        referencePath
      );

    referenceSummary =
      `${width}x${height}`;
  }

  return {
    characterId,
    runtimeCount:
      runtimeNames.length,
    width:
      STANDARD_WIDTH,
    height:
      STANDARD_HEIGHT,
    referenceSummary,
  };
}

function discoverCharacterIds() {
  if (
    !existsSync(
      CHARACTERS_ROOT
    )
  ) {
    fail(
      'characters directory does not exist.'
    );
  }

  return readdirSync(
    CHARACTERS_ROOT,
    {
      withFileTypes: true,
    }
  )
    .filter(
      (entry) =>
        entry.isDirectory()
    )
    .map(
      (entry) =>
        entry.name
    )
    .filter(
      (name) =>
        name !== 'rooty'
    )
    .sort();
}

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node scripts/verify-standard-character-assets.mjs',
      '  node scripts/verify-standard-character-assets.mjs --all',
      '  node scripts/verify-standard-character-assets.mjs <characterId> [characterId...]',
      '',
      'Examples:',
      '  npm run verify:character-assets',
      '  npm run verify:character-assets -- moru',
      '  npm run verify:character-assets -- tori',
    ].join(
      '\n'
    )
  );
}

const args =
  process.argv.slice(
    2
  );

if (
  args.includes(
    '--help'
  ) ||
  args.includes(
    '-h'
  )
) {
  printUsage();
  process.exit(
    0
  );
}

const explicitIds =
  args.filter(
    (value) =>
      value !== '--all'
  );

const characterIds =
  explicitIds.length > 0
    ? [
        ...new Set(
          explicitIds
        ),
      ]
    : discoverCharacterIds();

if (
  characterIds.length === 0
) {
  fail(
    'No standard character folders found.'
  );
}

console.log(
  `STANDARD CHARACTER PREFLIGHT: ${characterIds.join(', ')}`
);

const failures = [];
const passes = [];

for (
  const characterId of
  characterIds
) {
  try {
    const result =
      validateCharacter(
        characterId
      );

    passes.push(
      result
    );

    console.log(
      `PASS - ${result.characterId}: ${result.runtimeCount} runtime frames, ${result.width}x${result.height}, unique hashes, reference=${result.referenceSummary}`
    );
  } catch (error) {
    failures.push({
      characterId,
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });

    console.error(
      `FAIL - ${characterId}: ${failures.at(-1).message}`
    );
  }
}

console.log(
  ''
);

console.log(
  `SUMMARY - pass=${passes.length}, fail=${failures.length}`
);

if (
  failures.length > 0
) {
  process.exitCode =
    1;
} else {
  console.log(
    'PASS - All requested standard character assets are ready for registry work.'
  );
}
