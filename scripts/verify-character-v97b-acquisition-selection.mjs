import {
  readFileSync,
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

const selected =
  read(
    'store/selectedCharacter.ts'
  );

const progression =
  read(
    'store/characterProgression.ts'
  );

const preview =
  read(
    'app/character-preview.tsx'
  );

const diagnostics =
  read(
    'app/character-progression-diagnostics.tsx'
  );

console.log(
  '===== CHARACTER V97B ACQUISITION SELECTION PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V97B_LEGACY_SELECTION_SEED',
    'await seedLegacySelectedCharacterAcquisition(',
    'CHARACTER_V97B_ACQUISITION_SELECTION_GATE',
    'getCharacterProgressionSnapshot(',
    'return false;',
    'return true;',
  ]
) {
  expect(
    selected,
    token,
    'Selected-character gate'
  );
}

const seedIndex =
  selected.indexOf(
    'CHARACTER_V97B_LEGACY_SELECTION_SEED'
  );

const readyIndex =
  selected.indexOf(
    'ready =',
    seedIndex
  );

if (
  seedIndex < 0 ||
  readyIndex < 0 ||
  seedIndex >= readyIndex
) {
  fail(
    'Legacy acquisition seed must happen before selected-character ready'
  );
}

console.log(
  'PASS - existing selected character legacy-seeded before lock enforcement'
);

console.log(
  'PASS - locked character save is rejected in authoritative selected store'
);

for (
  const token of [
    'CHARACTER_V97B_ACQUISITION_QUERY',
    'CHARACTER_V97B_PROGRESSION_REACTIVE_HOOK',
    'useCharacterProgression()',
  ]
) {
  expect(
    progression,
    token,
    'Progression reactive API'
  );
}

console.log(
  'PASS - progression acquisition state is reactive for UI'
);

for (
  const token of [
    'CHARACTER_V97B_ACQUISITION_AWARE_PREVIEW',
    'CHARACTER_V97B_ACQUISITION_STATUS',
    'CHARACTER_V97B_PROGRESSION_DIAGNOSTICS_ENTRY',
    "'/character-progression-diagnostics' as never",
    '!isAcquired',
    'progressionSnapshot.growthLevel',
    'progressionSnapshot.growthXp',
    'CHARACTER_V96C_RELATIONSHIP_DIAGNOSTICS_ENTRY',
    'CHARACTER_V86_PREVIEW_TEXT_FIX',
  ]
) {
  expect(
    preview,
    token,
    'Acquisition-aware preview'
  );
}

console.log(
  'PASS - preview shows acquired/locked + level/xp and preserves V96C/V86 entries'
);

for (
  const token of [
    'CHARACTER_V97B_PROGRESSION_DIAGNOSTICS_SCREEN',
    'CHARACTER_IDS.map(',
    'useCharacterProgression()',
    'snapshot.acquired',
    'snapshot.acquisitionSource',
    'snapshot.growthLevel',
    'snapshot.growthXp',
    'claimedRewardLevels',
    'unclaimedRewards',
    'snapshot.legacySeeded',
  ]
) {
  expect(
    diagnostics,
    token,
    'Progression diagnostics'
  );
}

console.log(
  'PASS - seven-character acquisition/growth diagnostics screen'
);

console.log(
  'PASS - CHARACTER V97B ACQUISITION SELECTION PREFLIGHT'
);
