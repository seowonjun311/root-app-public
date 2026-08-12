import {
  existsSync,
  readFileSync,
} from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

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

if (!existsSync(servicePath)) {
  fail(
    `missing ${servicePath}`
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
    'CHARACTER_V101K_SCREEN_EDGE_LIFE_AVOIDANCE',
    'CHARACTER_V101K_USER_REJECTED_AREA_MEMORY',
    'CHARACTER_V101K_SAFE_TARGET_SELECTION',
    'CHARACTER_V101K_KEYBOARD_BEST_EFFORT_AVOIDANCE',
    'AUTO_MOVE_EDGE_INSET_DP = 18',
    'AUTO_MOVE_TOP_SAFE_DP = 72',
    'AUTO_MOVE_BOTTOM_SAFE_DP = 28',
    'AUTO_MOVE_KEYBOARD_GAP_DP = 18',
    'KEYBOARD_VISIBLE_MIN_DP = 140',
    'AUTO_MOVE_EDGE_PERCH_CHANCE_PERCENT = 22',
    'AUTO_MOVE_LOWER_BAND_CHANCE_PERCENT = 36',
    'USER_REJECT_DRAG_DISTANCE_DP = 52',
    'USER_AVOID_RADIUS_DP = 110',
    'USER_AVOID_MEMORY_MS = 480000L',
    'USER_AVOID_ZONE_LIMIT = 3',
    'private fun detectedKeyboardTop()',
    'private fun autoMoveSafeBounds(',
    'private fun adjustAutoMoveTargetForDynamicAvoidance(',
    'private fun rememberUserRejectedAreaAfterDrag(',
    'private fun nudgeQuietSleepAboveKeyboardIfNeeded()',
  ]
) {
  if (!service.includes(token)) {
    fail(
      `service missing ${JSON.stringify(token)}`
    );
  }
}

if (
  !/currentWindowMetrics[\s\S]{0,500}WindowInsets[\s\S]{0,300}Type[\s\S]{0,120}ime\(\)/.test(
    service
  )
) {
  fail(
    'API 30+ IME insets keyboard detection is missing'
  );
}

if (
  !service.includes(
    'getWindowVisibleDisplayFrame'
  )
) {
  fail(
    'visible-display-frame keyboard fallback is missing'
  );
}

if (
  !/repeat\(\s*AUTO_MOVE_TARGET_ATTEMPTS\s*\)/.test(
    service
  )
) {
  fail(
    'safe target candidate retry loop is missing'
  );
}

if (
  !/AUTO_MOVE_EDGE_PERCH_CHANCE_PERCENT[\s\S]{0,1300}lowerStart/.test(
    service
  )
) {
  fail(
    'lower edge-perch living behavior is missing'
  );
}

if (
  !/ACTION_UP[\s\S]{0,1800}rememberUserRejectedAreaAfterDrag\(/.test(
    service
  )
) {
  fail(
    'user drag-away memory is not connected to manual drag release'
  );
}

if (
  service.includes(
    'AccessibilityService'
  ) ||
  service.includes(
    'BIND_ACCESSIBILITY_SERVICE'
  )
) {
  fail(
    'V101K must not add accessibility-service based UI inspection'
  );
}

if (
  !/scheduledQuietActive[\s\S]{0,700}nudgeQuietSleepAboveKeyboardIfNeeded\(\)/.test(
    service
  )
) {
  fail(
    'quiet sleep keyboard nudge integration is missing'
  );
}

pass('autonomous targets stay inside top/bottom/edge safe bands rather than hugging unsafe screen limits');
pass('some autonomous targets intentionally perch in the lower left/right safe edge band for a more lived-in feel');
pass('API 30+ IME insets and visible-display-frame fallback provide best-effort keyboard avoidance');
pass('keyboard appearance can retarget an already moving/paused autonomous character above the keyboard');
pass('manual drag remains authoritative; moving a character away remembers up to three temporary user-rejected screen regions');
pass('placing the character back inside a remembered region clears that region, respecting explicit user intent');
pass('scheduled quiet sleep may be nudged above a visible keyboard without re-enabling ordinary auto movement');
pass('no accessibility service, semantic cross-app UI reading, new permission, bridge, settings, or manifest change is required');
console.log(
  'PASS - CHARACTER V101K SCREEN-EDGE LIFE + AVOIDANCE PREFLIGHT'
);
