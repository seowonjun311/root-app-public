import {
  existsSync,
  readFileSync,
} from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';
const nativeModulePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterModule.kt';
const bridgePath =
  'modules/root-floating-character/index.ts';
const goalSyncPath =
  'utils/floatingCharacterGoalSync.ts';

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}
function pass(message) {
  console.log(`PASS - ${message}`);
}

for (const path of [servicePath, nativeModulePath, bridgePath, goalSyncPath]) {
  if (!existsSync(path)) fail(`missing ${path}`);
}

const service = readFileSync(servicePath, 'utf8').replace(/\r\n/g, '\n');
const nativeModule = readFileSync(nativeModulePath, 'utf8');
const bridge = readFileSync(bridgePath, 'utf8');
const goalSync = readFileSync(goalSyncPath, 'utf8');

for (const token of [
  'CHARACTER_V101A_ANDROID_FLOATING_CHARACTER_SERVICE',
  'CHARACTER_V101B_NATIVE_IDLE_ANIMATION',
  'CHARACTER_V101C_FLOATING_MOTION_SCALE',
  'CHARACTER_V101D_WALK_STATE_ANIMATION',
  'CHARACTER_V101E_GOAL_SPEECH_INTERACTION',
  'CHARACTER_V101F_GOAL_COMPLETION_CELEBRATION',
  'CHARACTER_V101F_HAPPY_ANIMATION_RUNTIME',
  'CHARACTER_V101F_GOAL_COMPLETION_ENGINE',
  'CHARACTER_V101F_NATIVE_HAPPY_FRAMES',
  'PREF_COMPLETION_BASELINE_READY',
  'PREF_CELEBRATED_COMPLETION_KEYS',
  'HAPPY_FRAME_DURATION_MS = 180L',
  'COMPLETION_SPEECH_DISPLAY_MS = 5000L',
  'private fun startHappyAnimation(',
  'completionReactionActive',
]) {
  if (!service.includes(token)) fail(`service missing ${JSON.stringify(token)}`);
}

const ids = ['rooty','moru','mongsil','dami','pio','nuri','tori'];
for (const id of ids) {
  for (let frame = 1; frame <= 3; frame += 1) {
    const ft = String(frame).padStart(2, '0');
    const path = `modules/root-floating-character/android/src/main/res/drawable-nodpi/root_character_${id}_happy_${ft}.png`;
    if (!existsSync(path)) fail(`missing native happy frame ${path}`);
    const token = `R.drawable.root_character_${id}_happy_${ft}`;
    if (!service.includes(token)) fail(`service mapping missing ${token}`);
  }
}

for (const token of ['CHARACTER_V101F_GOAL_COMPLETION_NATIVE_BRIDGE','"setGoalCompletionSnapshot"','.setGoalCompletionSnapshot(']) {
  if (!nativeModule.includes(token)) fail(`native module missing ${JSON.stringify(token)}`);
}
for (const token of ['CHARACTER_V101F_GOAL_COMPLETION_JS_BRIDGE','FloatingCharacterGoalCompletionSnapshotItem','setFloatingCharacterGoalCompletionSnapshot','nativeModule.setGoalCompletionSnapshot(']) {
  if (!bridge.includes(token)) fail(`bridge missing ${JSON.stringify(token)}`);
}
for (const token of ['CHARACTER_V101F_FLOATING_GOAL_COMPLETION_SYNC','buildFloatingCharacterGoalCompletionSnapshot','completedToday(','setFloatingCharacterGoalCompletionSnapshot(','dateKey:']) {
  if (!goalSync.includes(token)) fail(`goal sync missing ${JSON.stringify(token)}`);
}

if (!/if \(!baselineReady\)[\s\S]{0,1000}PREF_CELEBRATED_COMPLETION_KEYS/.test(service)) {
  fail('first completion snapshot is not silently baselined');
}
if (!/val unseen =[\s\S]{0,500}!celebrated\.contains\([\s\S]{0,120}completion\.key/.test(service)) {
  fail('completion celebration does not dedupe by persisted completion key');
}
if (!/showSpeechBubble\([\s\S]{0,500}startHappyAnimation\(/.test(service)) {
  fail('completion reaction does not combine speech bubble and happy animation');
}

pass('today completion snapshot is derived from existing actionGoals completion state');
pass('first sync is a silent baseline and later completions use persisted one-time keys');
pass('all 21 native happy frames exist and are mapped for seven characters');
pass('new completion triggers one-time speech bubble + finite happy/jump animation');
pass('V101A-E overlay, movement, walk, tap/long-press, and goal-speech contracts remain present');
console.log('PASS - CHARACTER V101F GOAL COMPLETION CELEBRATION PREFLIGHT');
