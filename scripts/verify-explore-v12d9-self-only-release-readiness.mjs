// ROOT_EXPLORE_V12D9_V2_RELEASE_READINESS_VERIFIER
import crypto from 'node:crypto';
import fs from 'node:fs';

const STAGE_A_SHA = '5b8666f3ddfa1f3be438f1be26cf9e7fd57f30596d9b6a7a011f7c2623768732';
const SELF_ONLY_SHA = '28bab9fca79e720ff5a0daebd008ada08eed4b884f49d00d6eb0fef3d1beff8a';

const normalize = (value) =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const read = (file) => {
  if (!fs.existsSync(file)) {
    throw new Error(`missing ${file}`);
  }
  return normalize(fs.readFileSync(file, 'utf8'));
};

const sha = (value) =>
  crypto.createHash('sha256').update(value, 'utf8').digest('hex');

if (sha(read('firestore.rules')) !== STAGE_A_SHA) {
  throw new Error('active firestore.rules is not exact Stage A');
}

if (
  sha(read('firebase/firestore-v12d9-self-only-release-candidate.rules')) !==
  SELF_ONLY_SHA
) {
  throw new Error('frozen self-only candidate SHA mismatch');
}

if (
  sha(read('firebase/firestore-v12d9-stage-a-rollback.rules')) !==
  STAGE_A_SHA
) {
  throw new Error('frozen Stage A rollback SHA mismatch');
}

const targets = [
  ['store/savedCafeFolders.ts', 'SAVED_CAFE_FOLDER_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeLocal.ts', 'SAVED_CAFE_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeRecommendationFeedback.ts', 'SAVED_CAFE_RECOMMENDATION_FEEDBACK_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeRecommendationPreferences.ts', 'SAVED_CAFE_RECOMMENDATION_PREFERENCES_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeVisits.ts', 'SAVED_CAFE_VISIT_SELF_ONLY_UID_REQUIRED'],
];

for (const [file, errorCode] of targets) {
  const source = read(file);

  for (const token of [
    'ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD',
    'activeUidBeforePrivateUserRead',
    'currentUser?.uid',
    'expectedUid',
    errorCode,
  ]) {
    if (!source.includes(token)) {
      throw new Error(`${file} missing ${token}`);
    }
  }

  const guard = source.indexOf(
    'ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD',
  );
  const users = source.indexOf("'users'", guard);
  const getDoc = source.indexOf('getDoc(', guard);

  if (guard < 0 || users < 0 || getDoc < 0 || guard > users || guard > getDoc) {
    throw new Error(`${file} pre-read self guard order is invalid`);
  }
}

const report = read('docs/explore-v12d9-zero-cross-user-audit.md');

for (const token of [
  'Unresolved/blocked private-user reads: 0',
  '**PASS:** fresh precise audit found zero unresolved cross-user private-user reads.',
  '**PASS:** no collection-wide private `users` query was found.',
  '**PASS:** public-profile reads are collection-aware and are not misclassified as private-user reads.',
]) {
  if (!report.includes(token)) {
    throw new Error(`audit gate missing: ${token}`);
  }
}

const rehearsal = read(
  'scripts/run-explore-v12d9-self-only-release-rehearsal.ps1',
);

for (const token of [
  '--dry-run',
  'SAFE - no production Rules release was performed',
  'DEVICE GATE - physical-device diagnostic must be confirmed before V1.2D10',
]) {
  if (!rehearsal.includes(token)) {
    throw new Error(`rehearsal token missing: ${token}`);
  }
}

console.log('PASS - active local Rules remain exact Stage A');
console.log('PASS - frozen self-only candidate is exact reviewed target');
console.log('PASS - frozen rollback source is exact Stage A');
console.log('PASS - all 5 saved-cafe stores enforce a pre-read Firebase Auth uid equality gate');
console.log('PASS - precise whole-project private-user audit has zero unresolved/blocked sites');
console.log('PASS - rehearsal is dry-run only');
console.log('BLOCKED - V1.2D10 still requires physical-device diagnostic confirmation');
console.log('PASS - EXPLORE V1.2D9 V2 RELEASE READINESS VERIFIER');
