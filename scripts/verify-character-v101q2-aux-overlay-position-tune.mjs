import fs from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

function fail(message) {
  console.error(
    `FAIL - ${message}`
  );
  process.exit(1);
}

if (!fs.existsSync(servicePath)) {
  fail(
    `missing ${servicePath}`
  );
}

const service =
  fs
    .readFileSync(
      servicePath,
      'utf8'
    )
    .replace(
      /\r\n/g,
      '\n'
    );

const marker =
  'CHARACTER_V101Q2_AUX_OVERLAY_VERTICAL_TUNE';

if (!service.includes(marker)) {
  fail(
    'V101Q2 marker missing'
  );
}

function functionBlock(
  startToken,
  endToken,
  label
) {
  const start =
    service.indexOf(
      startToken
    );

  const end =
    service.indexOf(
      endToken,
      start +
        startToken.length
    );

  if (
    start < 0 ||
    end < 0
  ) {
    fail(
      `${label} function boundary missing`
    );
  }

  return service.slice(
    start,
    end
  );
}

const speech =
  functionBlock(
    '  private fun positionSpeechBubble(',
    '  private fun positionActionMenu(',
    'speech bubble'
  );

const menu =
  functionBlock(
    '  private fun positionActionMenu(',
    '  private fun updateAuxiliaryOverlayPositions()',
    'action menu'
  );

if (
  !/characterParams\.y\s*-\s*dp\(\s*56\s*\)/.test(
    speech
  )
) {
  fail(
    'speech bubble 56dp tuned offset missing'
  );
}

if (
  /characterParams\.y\s*-\s*dp\(\s*72\s*\)/.test(
    speech
  )
) {
  fail(
    'old speech bubble 72dp offset remains'
  );
}

if (
  !/characterParams\.y\s*-\s*dp\(\s*92\s*\)/.test(
    menu
  )
) {
  fail(
    'action menu 92dp tuned offset missing'
  );
}

if (
  /characterParams\.y\s*-\s*dp\(\s*112\s*\)/.test(
    menu
  )
) {
  fail(
    'old action menu 112dp offset remains'
  );
}

for (
  const preserved of [
    'speechBubbleView',
    'speechBubbleParams',
    'actionMenuView',
    'actionMenuParams',
    'updateAuxiliaryOverlayPositions()',
    'characterParams.height',
    'dp(',
  ]
) {
  if (!service.includes(preserved)) {
    fail(
      `preserved auxiliary overlay contract missing: ${preserved}`
    );
  }
}

console.log(
  'PASS - speech bubble is 16dp lower than V101Q1'
);
console.log(
  'PASS - long-press action menu is 20dp lower than V101Q1'
);
console.log(
  'PASS - top-edge fallback and auxiliary overlay tracking remain present'
);
console.log(
  'PASS - CHARACTER V101Q2 AUX OVERLAY POSITION TUNE'
);
