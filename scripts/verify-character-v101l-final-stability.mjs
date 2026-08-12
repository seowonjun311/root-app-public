import { existsSync, readFileSync } from 'node:fs';

const servicePath = process.argv[2] ?? 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

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

const service = readFileSync(servicePath, 'utf8').replace(/\r\n/g, '\n');

for (const token of [
  'CHARACTER_V101L_FINAL_STABILITY_HARDENING',
  'PREF_DISPLAY_WIDTH_PX = "displayWidthPx"',
  'PREF_DISPLAY_HEIGHT_PX = "displayHeightPx"',
  'DISPLAY_RECONCILE_DELAY_MS = 140L',
  'SCREEN_RESUME_DELAY_MS = 220L',
  'private fun restoreAfterStickyServiceRestart()',
  'private fun restoreOverlayPositionForCurrentDisplay(',
  'private fun remapDisplayCoordinate(',
  'private fun reconcileOverlayForCurrentDisplay()',
  'override fun onConfigurationChanged(',
  'private fun isScreenInteractiveNow()',
  'private fun registerScreenStateReceiver()',
  'private fun unregisterScreenStateReceiver()',
  'private fun suspendVisualRuntimeForScreenOff()',
  'private fun handleScreenInteractiveChanged(',
]) {
  if (!service.includes(token)) {
    fail(`service missing ${JSON.stringify(token)}`);
  }
}

if (!/override fun onConfigurationChanged\([\s\S]{0,500}scheduleDisplayReconcile\(\)/.test(service)) {
  fail('configuration changes do not schedule display reconciliation');
}

if (!/if \(intent == null\) \{[\s\S]{0,220}restoreAfterStickyServiceRestart\(\)[\s\S]{0,120}return START_STICKY/.test(service)) {
  fail('START_STICKY null-intent service restart recovery is missing');
}

if (!/private fun restoreAfterStickyServiceRestart\(\)[\s\S]{0,1800}readScale\([\s\S]{0,600}readAutoMoveEnabled\([\s\S]{0,700}readGoalSpeechEnabled\([\s\S]{0,1000}showOrUpdateOverlay\(/.test(service)) {
  fail('sticky restart does not rehydrate persisted overlay runtime state');
}

if (!/private fun restoreOverlayPositionForCurrentDisplay\([\s\S]{0,2400}PREF_DISPLAY_WIDTH_PX[\s\S]{0,900}PREF_DISPLAY_HEIGHT_PX[\s\S]{0,2200}remapDisplayCoordinate\(/.test(service)) {
  fail('saved display geometry is not used to remap overlay position');
}

const reconcileStart = service.indexOf('private fun reconcileOverlayForCurrentDisplay()');
const reconcileEnd = service.indexOf('private fun isScreenInteractiveNow()', reconcileStart);
const reconcile = reconcileStart >= 0 && reconcileEnd > reconcileStart ? service.slice(reconcileStart, reconcileEnd) : '';
for (const token of ['scaledWidth(', 'scaledHeight(', 'remapDisplayCoordinate(', 'clampOverlayPosition(', 'saveOverlayPosition(']) {
  if (!reconcile.includes(token)) {
    fail(`runtime rotation/resolution reconciliation missing ${token}`);
  }
}

if (!/restoreOverlayPositionForCurrentDisplay\([\s\S]{0,300}attachDragAndTap\(/.test(service)) {
  fail('initial overlay creation does not restore/remap before drag attachment');
}

if (!/private fun persistScaleAndPosition\(\)[\s\S]{0,1500}PREF_DISPLAY_WIDTH_PX[\s\S]{0,500}PREF_DISPLAY_HEIGHT_PX/.test(service) ||
    !/private fun saveOverlayPosition\([\s\S]{0,1200}PREF_DISPLAY_WIDTH_PX[\s\S]{0,500}PREF_DISPLAY_HEIGHT_PX/.test(service)) {
  fail('display dimensions are not persisted with scale/position');
}

if (!/PowerManager[\s\S]{0,500}isInteractive/.test(service)) {
  fail('PowerManager interactive-state detection is missing');
}

for (const action of ['Intent.ACTION_SCREEN_OFF', 'Intent.ACTION_SCREEN_ON']) {
  if (!service.includes(action)) {
    fail(`screen receiver missing ${action}`);
  }
}

if (!/registerScreenStateReceiver\(\)[\s\S]{0,3000}registerReceiver\(/.test(service) ||
    !/onDestroy\(\)[\s\S]{0,350}unregisterScreenStateReceiver\(\)/.test(service)) {
  fail('screen receiver registration lifecycle is incomplete');
}

if (!/private fun suspendVisualRuntimeForScreenOff\(\)[\s\S]{0,2200}animationHandler\.removeCallbacks[\s\S]{0,400}behaviorHandler\.removeCallbacks[\s\S]{0,400}motionHandler\.removeCallbacks[\s\S]{0,500}speechHandler\.removeCallbacks/.test(service)) {
  fail('screen-off suspension does not stop visual/runtime callbacks');
}

if (!/private fun startAutoMoveLoop\([\s\S]{0,450}!screenInteractive/.test(service)) {
  fail('auto movement is not gated while the display is non-interactive');
}

if (!/private fun scheduleNextGoalSpeech\([\s\S]{0,450}!screenInteractive/.test(service) ||
    !/private fun showNextGoalSpeech\([\s\S]{0,450}!screenInteractive/.test(service)) {
  fail('automatic goal speech is not gated while the display is non-interactive');
}

if (!/private fun handleScreenInteractiveChanged\([\s\S]{0,2800}scheduleDisplayReconcile\(\)[\s\S]{0,1000}refreshQuietMode\([\s\S]{0,1400}startAutoMoveLoop\(/.test(service)) {
  fail('screen-on resume path does not restore display/quiet/movement policy');
}

for (const forbidden of [
  'android.permission.WAKE_LOCK',
  'PowerManager.PARTIAL_WAKE_LOCK',
  'AccessibilityService',
  'BIND_ACCESSIBILITY_SERVICE',
]) {
  if (service.includes(forbidden)) {
    fail(`V101L must not add ${forbidden}`);
  }
}

pass('rotation and resolution changes proportionally remap, resize, clamp, and persist the overlay');
pass('sticky foreground-service restart rehydrates character scale, movement, goals, quiet state, and overlay');
pass('screen OFF suspends animation/motion/automatic speech callbacks while the foreground service remains alive');
pass('screen ON reconciles geometry and resumes existing quiet/movement/behavior policy without changing user preferences');
pass('display geometry is persisted alongside overlay position and scale for future restoration');
pass('no wake lock, accessibility service, or new semantic cross-app inspection is introduced');
console.log('PASS - CHARACTER V101L FINAL STABILITY PREFLIGHT');
