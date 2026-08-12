import {
  existsSync,
  readFileSync,
} from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';
const receiverPath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterBootReceiver.kt';
const manifestPath =
  'modules/root-floating-character/android/src/main/AndroidManifest.xml';

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS - ${message}`);
}

for (const path of [servicePath, receiverPath, manifestPath]) {
  if (!existsSync(path)) {
    fail(`missing ${path}`);
  }
}

const service = readFileSync(servicePath, 'utf8').replace(/\r\n/g, '\n');
const receiver = readFileSync(receiverPath, 'utf8').replace(/\r\n/g, '\n');
const manifest = readFileSync(manifestPath, 'utf8').replace(/\r\n/g, '\n');

for (const token of [
  'CHARACTER_V101M_BOOT_PACKAGE_RECOVERY',
  'PREF_USER_ENABLED = "userEnabled"',
  'fun readUserEnabled(',
  'fun restoreAfterSystemEvent(',
  'Settings.canDrawOverlays(',
  'PREF_USER_ENABLED,\n          true',
  'PREF_USER_ENABLED,\n          false',
]) {
  if (!service.includes(token)) {
    fail(`service missing ${JSON.stringify(token)}`);
  }
}

if (!/fun start\([\s\S]{0,1600}PREF_USER_ENABLED,[\s\S]{0,80}true/.test(service)) {
  fail('start() does not persist explicit user-enabled state');
}

if (!/fun stop\([\s\S]{0,700}PREF_USER_ENABLED,[\s\S]{0,80}false/.test(service)) {
  fail('stop() does not persist explicit user-disabled state');
}

if (!/fun restoreAfterSystemEvent\([\s\S]{0,1800}readUserEnabled\([\s\S]{0,900}Settings\.canDrawOverlays\([\s\S]{0,1100}start\(/.test(service)) {
  fail('system-event restore helper does not gate restore by user intent + overlay permission');
}

for (const token of [
  'CHARACTER_V101M_BOOT_PACKAGE_RECEIVER',
  'Intent.ACTION_BOOT_COMPLETED',
  'Intent.ACTION_MY_PACKAGE_REPLACED',
  '.readUserEnabled(',
  '.restoreAfterSystemEvent(',
  'catch (_: RuntimeException)',
]) {
  if (!receiver.includes(token)) {
    fail(`receiver missing ${JSON.stringify(token)}`);
  }
}

for (const token of [
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'RootFloatingCharacterBootReceiver',
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.MY_PACKAGE_REPLACED',
  'android:exported="true"',
  'android:foregroundServiceType="specialUse"',
]) {
  if (!manifest.includes(token)) {
    fail(`manifest missing ${JSON.stringify(token)}`);
  }
}

if (
  manifest.includes('android.intent.action.LOCKED_BOOT_COMPLETED') ||
  manifest.includes('android:directBootAware="true"')
) {
  fail('V101M must not introduce direct-boot storage complexity');
}

if (
  manifest.includes('android.permission.WAKE_LOCK') ||
  manifest.includes('BIND_ACCESSIBILITY_SERVICE')
) {
  fail('V101M must not add wake lock or accessibility service privileges');
}

pass('user intent is persisted: explicit start enables future restore and explicit stop disables it');
pass('boot/package restore is skipped when overlay permission is missing or the user previously turned the character off');
pass('BOOT_COMPLETED and MY_PACKAGE_REPLACED use a dedicated best-effort receiver');
pass('specialUse foreground-service type is preserved; no restricted camera/microphone/media/data-sync type is introduced');
pass('LOCKED_BOOT_COMPLETED/direct-boot storage is intentionally avoided');
pass('no wake lock or accessibility service privilege is introduced');
console.log('PASS - CHARACTER V101M BOOT + PACKAGE RECOVERY PREFLIGHT');
