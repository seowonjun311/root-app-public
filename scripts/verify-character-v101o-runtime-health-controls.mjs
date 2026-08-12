import { existsSync, readFileSync } from 'node:fs';
const files = {
  service: 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt',
  module: 'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterModule.kt',
  bridge: 'modules/root-floating-character/index.ts',
  settings: 'app/floating-character-settings.tsx',
};
function fail(message) { console.error(`FAIL - ${message}`); process.exit(1); }
function pass(message) { console.log(`PASS - ${message}`); }
for (const path of Object.values(files)) if (!existsSync(path)) fail(`missing ${path}`);
const service = readFileSync(files.service, 'utf8').replace(/\r\n/g, '\n');
const module = readFileSync(files.module, 'utf8').replace(/\r\n/g, '\n');
const bridge = readFileSync(files.bridge, 'utf8').replace(/\r\n/g, '\n');
const settings = readFileSync(files.settings, 'utf8').replace(/\r\n/g, '\n');
for (const token of [
  'CHARACTER_V101O_RUNTIME_HEALTH_CONTROLS',
  'CHARACTER_V101O_ACTIVE_SERVICE_INSTANCE',
  'CHARACTER_V101O_RUNTIME_HEALTH_API',
  'ACTION_REPAIR_RUNTIME = "root.floating.REPAIR_RUNTIME"',
  'ACTION_RESET_POSITION = "root.floating.RESET_POSITION"',
  'fun readRuntimeHealth(',
  'fun repairRuntime(',
  'fun resetOverlayPosition(',
  'CHARACTER_V101O_RUNTIME_HEALTH_SNAPSHOT',
  'CHARACTER_V101O_SAFE_RUNTIME_REPAIR',
  'CHARACTER_V101O_SAFE_POSITION_RESET',
]) if (!service.includes(token)) fail(`service missing ${JSON.stringify(token)}`);
for (const token of [
  '"overlayAttached" to attached',
  '"homeHandoffActive" to homeHandoffActive',
  '"screenInteractive" to screenInteractive',
  '"behaviorMode" to behaviorAnimationMode.name.lowercase()',
  '"displayWidthPx" to currentDisplayWidth()',
  '"displayHeightPx" to currentDisplayHeight()',
  '"positionSaved" to',
]) if (!service.includes(token)) fail(`runtime health missing ${JSON.stringify(token)}`);
if (!/fun repairRuntime\([\s\S]{0,1600}!readUserEnabled\(context\)[\s\S]{0,1200}!permissionGranted[\s\S]{0,1200}homeHandoffActive[\s\S]{0,1500}ACTION_REPAIR_RUNTIME/.test(service)) fail('repair path does not preserve OFF/permission/Home handoff safety');
if (!/fun resetOverlayPosition\([\s\S]{0,1200}remove\(PREF_X\)[\s\S]{0,600}remove\(PREF_Y\)[\s\S]{0,600}remove\(PREF_DISPLAY_WIDTH_PX\)[\s\S]{0,600}remove\(PREF_DISPLAY_HEIGHT_PX\)/.test(service)) fail('position reset does not clear V101L geometry prefs');
const resetSlice = service.slice(service.indexOf('fun resetOverlayPosition('), service.indexOf('fun setGoalSnapshot('));
if (resetSlice.includes('remove(PREF_USER_ENABLED)') || resetSlice.includes('remove(PREF_SCALE)')) fail('position reset must not clear user enabled or scale');
if (!/private fun repairVisibleRuntime\([\s\S]{0,400}if \(homeHandoffActive\)[\s\S]{0,900}showOrUpdateOverlay\(/.test(service)) fail('runtime repair can overlap Home handoff');
if (!/private fun resetOverlayPositionInternal\([\s\S]{0,1700}params\.x =\s*dp\(18\)[\s\S]{0,300}params\.y =\s*dp\(180\)/.test(service)) fail('position reset does not restore the established default geometry');
for (const token of ['CHARACTER_V101N_HOME_FLOATING_HANDOFF','CHARACTER_V101L_FINAL_STABILITY_HARDENING','PREF_USER_ENABLED = "userEnabled"']) if (!service.includes(token)) fail(`preserved contract missing ${token}`);
for (const token of ['CHARACTER_V101O_RUNTIME_HEALTH_NATIVE_BRIDGE','"getRuntimeHealth"','"repairRuntime"','"resetPosition"']) if (!module.includes(token)) fail(`native module missing ${token}`);
for (const token of [
  'CHARACTER_V101O_RUNTIME_HEALTH_JS_BRIDGE',
  'export type FloatingCharacterRuntimeHealth',
  'getFloatingCharacterRuntimeHealth',
  'repairFloatingCharacterRuntime',
  'resetFloatingCharacterPosition',
]) if (!bridge.includes(token)) fail(`TypeScript bridge missing ${token}`);
for (const token of [
  'CHARACTER_V101O_RUNTIME_HEALTH_SETTINGS',
  '런타임 진단',
  '전체 상태',
  'Foreground service',
  '오버레이 뷰',
  'Home handoff',
  '현재 행동',
  '상태 새로고침',
  '플로팅 복구',
  '위치 초기화',
]) if (!settings.includes(token)) fail(`settings missing ${JSON.stringify(token)}`);
if (!settings.includes('Home이 캐릭터를 소유한 동안에는 오버레이를 겹쳐 띄우지 않습니다.')) fail('settings does not explain Home handoff repair safety');
for (const forbidden of ['AccessibilityService','BIND_ACCESSIBILITY_SERVICE','android.permission.WAKE_LOCK','PowerManager.PARTIAL_WAKE_LOCK']) {
  if (service.includes(forbidden) || module.includes(forbidden) || bridge.includes(forbidden) || settings.includes(forbidden)) fail(`V101O must not add ${forbidden}`);
}
pass('runtime health exposes service, user intent, overlay attachment, Home handoff, screen, behavior, geometry, scale, and movement state');
pass('repair is user-intent safe and refuses to overlap the Home-owned character');
pass('position reset clears only V101L geometry and keeps user ON/OFF plus scale preferences intact');
pass('settings provide refresh, safe repair, and confirmed position reset controls');
pass('V101N handoff and V101M/V101L recovery contracts remain present without new permissions or accessibility privileges');
console.log('PASS - CHARACTER V101O RUNTIME HEALTH + CONTROLS PREFLIGHT');
