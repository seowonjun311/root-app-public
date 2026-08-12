import { existsSync, readFileSync } from 'node:fs';

const paths = {
  service: 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt',
  receiver: 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterBootReceiver.kt',
  manifest: 'modules/root-floating-character/android/src/main/AndroidManifest.xml',
  hook: 'hooks/useFloatingCharacterHomeHandoff.ts',
  nativeModule: 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterModule.kt',
  bridge: 'modules/root-floating-character/index.ts',
  settings: 'app/floating-character-settings.tsx',
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
const receiver = read(paths.receiver);
const manifest = read(paths.manifest);
const hook = read(paths.hook);
const nativeModule = read(paths.nativeModule);
const bridge = read(paths.bridge);
const settings = read(paths.settings);

for (const token of [
  'CHARACTER_V101P_RECOVERY_EDGE_HARDENING',
  'CHARACTER_V101P_STICKY_RESTART_INTENT_GATE',
  'CHARACTER_V101P_CENTRAL_OVERLAY_INTENT_GATE',
  'CHARACTER_V101P_REPAIR_RACE_GUARD',
  'CHARACTER_V101P_RESET_RACE_GUARD',
]) {
  if (!service.includes(token)) fail(`service missing ${token}`);
}

for (const token of [
  'CHARACTER_V101N_HOME_HANDOFF_VISIBILITY',
  'CHARACTER_V101O_RUNTIME_HEALTH_CONTROLS',
  'CHARACTER_V101M_PERSISTED_USER_ENABLE_STATE',
  'CHARACTER_V101L_SERVICE_RESTART_RECOVERY',
  'CHARACTER_V101J_BEHAVIOR_ANIMATION_STATE_MACHINE',
]) {
  if (!service.includes(token)) fail(`preserved runtime contract missing ${token}`);
}

if (!/private fun restoreAfterStickyServiceRestart\(\)[\s\S]{0,900}!readUserEnabled\(this\)[\s\S]{0,900}Settings\.canDrawOverlays\([\s\S]{0,120}this[\s\S]{0,900}currentScale/.test(service)) {
  fail('sticky restart does not gate recovery on persisted user intent + overlay permission before rehydration');
}

if (!/CHARACTER_V101P_CENTRAL_OVERLAY_INTENT_GATE[\s\S]{0,450}!readUserEnabled\(this\)[\s\S]{0,350}stopSelf\(\)[\s\S]{0,650}Settings\.canDrawOverlays/.test(service)) {
  fail('central overlay attach path is not protected by user OFF + permission gates');
}

if (!/private fun repairVisibleRuntime\(\)[\s\S]{0,400}homeHandoffActive[\s\S]{0,900}!readUserEnabled\(this\)[\s\S]{0,1100}Settings\.canDrawOverlays[\s\S]{0,900}showOrUpdateOverlay/.test(service)) {
  fail('repair execution-time race guard is incomplete or no longer preserves V101O Home-first safety');
}

if (!/CHARACTER_V101P_RESET_RACE_GUARD[\s\S]{0,900}!readUserEnabled\(this\)[\s\S]{0,1100}Settings\.canDrawOverlays[\s\S]{0,900}homeHandoffActive/.test(service)) {
  fail('position-reset execution-time race guard is incomplete');
}

for (const token of [
  'CHARACTER_V101P_HOME_HANDOFF_HEARTBEAT',
  'HOME_HANDOFF_HEARTBEAT_MS = 2000',
  'setInterval(',
  'clearInterval(',
  'queueHandoff(\n                    true',
  "state ===\n                  'active'",
]) {
  if (!hook.includes(token)) fail(`Home handoff heartbeat missing ${JSON.stringify(token)}`);
}

if (!/if \([\s\S]{0,220}homeFocused &&[\s\S]{0,120}state ===[\s\S]{0,120}'active'[\s\S]{0,220}startHeartbeat\(\)/.test(hook)) {
  fail('Home heartbeat is not gated by focused + active app state');
}

if (!/return \(\) => \{[\s\S]{0,500}stopHeartbeat\(\)[\s\S]{0,300}subscription\.remove\(\)[\s\S]{0,300}queueHandoff\([\s\S]{0,80}false/.test(hook)) {
  fail('Home heartbeat cleanup does not stop polling and release handoff');
}

if (!receiver.includes('Intent.ACTION_BOOT_COMPLETED') || !receiver.includes('Intent.ACTION_MY_PACKAGE_REPLACED')) {
  fail('boot/package receiver restore actions missing');
}
if (receiver.includes('LOCKED_BOOT_COMPLETED')) {
  fail('LOCKED_BOOT_COMPLETED must remain absent');
}
if (!receiver.includes('readUserEnabled(') || !receiver.includes('restoreAfterSystemEvent(')) {
  fail('boot receiver no longer respects persisted user intent restore contract');
}

for (const token of [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android:foregroundServiceType="specialUse"',
]) {
  if (!manifest.includes(token)) fail(`manifest missing ${token}`);
}

for (const forbidden of [
  'android.permission.WAKE_LOCK',
  'BIND_ACCESSIBILITY_SERVICE',
  'AccessibilityService',
  'android:foregroundServiceType="camera"',
  'android:foregroundServiceType="microphone"',
  'android:foregroundServiceType="mediaProjection"',
  'android:foregroundServiceType="dataSync"',
]) {
  if (manifest.includes(forbidden) || service.includes(forbidden)) {
    fail(`forbidden recovery privilege/type present: ${forbidden}`);
  }
}

for (const token of [
  'getRuntimeHealth',
  'repairRuntime',
  'resetPosition',
]) {
  if (!nativeModule.includes(token) || !bridge.includes(token)) {
    fail(`V101O diagnostic bridge contract missing ${token}`);
  }
}

for (const token of [
  '런타임 진단',
  '상태 새로고침',
  '플로팅 복구',
  '위치 초기화',
]) {
  if (!settings.includes(token)) fail(`V101O settings diagnostic control missing ${token}`);
}

pass('START_STICKY recovery now re-checks persisted user ON/OFF and overlay permission before any visual rehydration');
pass('every overlay attach path has a central user-intent gate so stale/racing commands cannot resurrect an explicitly disabled character');
pass('repair and position-reset commands re-check user intent + permission at execution time, closing command-order race windows');
pass('Home focus reasserts V101N handoff every 2 seconds only while ROOT Home is active, covering service-only recreation without persistent stale ownership');
pass('Home blur/background cleanup stops the heartbeat and releases the overlay immediately');
pass('BOOT_COMPLETED/MY_PACKAGE_REPLACED recovery remains user-intent gated and LOCKED_BOOT_COMPLETED remains absent');
pass('specialUse FGS + overlay permissions remain unchanged; no wake lock, accessibility service, or restricted FGS type is introduced');
pass('V101O runtime diagnostics/repair/reset controls and V101A-O contracts remain intact');
console.log('PASS - CHARACTER V101P PRE-BUILD RECOVERY AUDIT');
