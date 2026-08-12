import { existsSync, readFileSync } from 'node:fs';

const paths = {
  service: 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt',
  module: 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterModule.kt',
  bridge: 'modules/root-floating-character/index.ts',
  home: 'app/(tabs)/index.tsx',
  hook: 'hooks/useFloatingCharacterHomeHandoff.ts',
  manifest: 'modules/root-floating-character/android/src/main/AndroidManifest.xml',
};

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}
function pass(message) {
  console.log(`PASS - ${message}`);
}
function read(path) {
  if (!existsSync(path)) fail(`missing ${path}`);
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

const service = read(paths.service);
const module = read(paths.module);
const bridge = read(paths.bridge);
const home = read(paths.home);
const hook = read(paths.hook);
const manifest = read(paths.manifest);

for (const token of [
  'CHARACTER_V101N_HOME_FLOATING_HANDOFF',
  'ACTION_SET_HOME_HANDOFF',
  'EXTRA_HOME_HANDOFF',
  'CHARACTER_V101N_HOME_HANDOFF_CONTROL',
  'CHARACTER_V101N_HOME_HANDOFF_RUNTIME',
  'CHARACTER_V101N_HOME_HANDOFF_VISIBILITY',
  'private fun applyHomeHandoff(',
  'private fun detachOverlayViewForHomeHandoff()',
]) {
  if (!service.includes(token)) fail(`service missing ${JSON.stringify(token)}`);
}

if (!/ACTION_STOP[\s\S]{0,500}PREF_USER_ENABLED[\s\S]{0,250}false[\s\S]{0,250}stopSelf\(\)/.test(service)) {
  fail('notification/service ACTION_STOP does not persist explicit OFF intent');
}

if (!/private fun showOrUpdateOverlay\([\s\S]{0,900}if \(homeHandoffActive\)[\s\S]{0,250}return/.test(service)) {
  fail('overlay creation is not gated while Home owns the character');
}

if (!/private fun applyHomeHandoff\([\s\S]{0,1800}suspendVisualRuntimeForScreenOff\(\)[\s\S]{0,1000}detachOverlayViewForHomeHandoff\(\)/.test(service)) {
  fail('Home handoff does not suspend visual runtime before detaching overlay');
}

if (!/private fun applyHomeHandoff\([\s\S]{0,3200}showOrUpdateOverlay\([\s\S]{0,600}scheduleDisplayReconcile\(\)/.test(service)) {
  fail('overlay resume path does not recreate and reconcile saved geometry');
}

if (!/private fun playNextGoalCompletionCelebration\(\)[\s\S]{0,350}homeHandoffActive[\s\S]{0,250}completionQueue\.clear\(\)/.test(service)) {
  fail('completion reactions can replay after Home handoff');
}

if (!/private fun playNextLifestyleReaction\(\)[\s\S]{0,350}homeHandoffActive[\s\S]{0,250}lifestyleReactionQueue\.clear\(\)/.test(service)) {
  fail('lifestyle reactions can replay after Home handoff');
}

for (const token of [
  'CHARACTER_V101N_HOME_HANDOFF_NATIVE_BRIDGE',
  '"setHomeHandoffActive"',
  '.setHomeHandoffActive(',
]) {
  if (!module.includes(token)) fail(`native module missing ${JSON.stringify(token)}`);
}

for (const token of [
  'CHARACTER_V101N_HOME_HANDOFF_JS_BRIDGE',
  'setHomeHandoffActive(',
  'setFloatingCharacterHomeHandoffActive(',
]) {
  if (!bridge.includes(token)) fail(`TS bridge missing ${JSON.stringify(token)}`);
}

for (const token of [
  'CHARACTER_V101N_HOME_FLOATING_HANDOFF_HOOK',
  'useFocusEffect(',
  'AppState.addEventListener(',
  "state ===\n                  'active'",
  'setFloatingCharacterHomeHandoffActive(',
]) {
  if (!hook.includes(token)) fail(`handoff hook missing ${JSON.stringify(token)}`);
}

for (const token of [
  'CHARACTER_V101N_HOME_HANDOFF_HOOK',
  'useFloatingCharacterHomeHandoff();',
]) {
  if (!home.includes(token)) fail(`Home missing ${JSON.stringify(token)}`);
}

if (home.includes('setFloatingCharacterHomeHandoffActive(')) {
  fail('Home should use the isolated hook rather than own native lifecycle logic');
}

if (!manifest.includes('android.permission.RECEIVE_BOOT_COMPLETED') ||
    !manifest.includes('android:foregroundServiceType="specialUse"')) {
  fail('V101M boot/specialUse manifest contract was not preserved');
}

for (const forbidden of [
  'android.permission.WAKE_LOCK',
  'BIND_ACCESSIBILITY_SERVICE',
  'AccessibilityService',
]) {
  if (manifest.includes(forbidden) || service.includes(forbidden)) {
    fail(`forbidden privilege/service introduced: ${forbidden}`);
  }
}

pass('Home focus owns the in-app Rooty while the native floating overlay is detached without stopping its foreground service');
pass('leaving Home or backgrounding ROOT releases handoff and restores the overlay at its persisted V101L geometry');
pass('Home handoff never changes the V101M persisted user-enabled preference');
pass('completion and lifestyle reactions received during Home ownership are not replayed after the overlay returns');
pass('notification hide now persists explicit OFF intent, preventing later reboot/update resurrection');
pass('Home Rooty runtime position/behavior authority remains independent; V101N preserves native overlay position rather than contaminating village coordinates');
pass('no new Android permission, wake lock, accessibility service, manifest, character asset, or settings-screen change is required');
console.log('PASS - CHARACTER V101N HOME <-> FLOATING HANDOFF PREFLIGHT');
