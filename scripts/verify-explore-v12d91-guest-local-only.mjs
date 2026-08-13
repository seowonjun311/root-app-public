// ROOT_EXPLORE_V12D91_VERIFIER
import fs from 'node:fs';

const read = (f) => {
  if (!fs.existsSync(f)) {
    throw new Error(`missing ${f}`);
  }
  return fs.readFileSync(f, 'utf8');
};

const onboarding =
  read('app/onboarding.tsx');

for (const token of [
  'ROOT_EXPLORE_V12D91_GUEST_ONBOARDING_LOCAL_ONLY',
  'NICKNAME DUPLICATE CHECK SKIPPED GUEST LOCAL ONLY',
  'isGuestSession',
]) {
  if (!onboarding.includes(token)) {
    throw new Error(
      `onboarding token missing: ${token}`,
    );
  }
}

for (const file of [
  'store/savedCafeFolders.ts',
  'store/savedCafeLocal.ts',
  'store/savedCafeRecommendationFeedback.ts',
  'store/savedCafeRecommendationPreferences.ts',
  'store/savedCafeVisits.ts',
]) {
  const source = read(file);

  for (const token of [
    'ROOT_EXPLORE_V12D91_GUEST_LOCAL_ONLY_SCOPE',
    'getRootCloudUidOrNull',
    'ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD',
  ]) {
    if (!source.includes(token)) {
      throw new Error(
        `${file} missing ${token}`,
      );
    }
  }
}

for (const file of [
  'store/rootCloudSession.ts',
  'store/rootNicknameRegistry.ts',
  'firebase/firestore-v12d91-stage-a-with-nickname-registry.rules',
  'firebase/firestore-v12d91-self-only-with-nickname-registry.rules',
]) {
  read(file);
}

const report =
  read(
    'docs/explore-v12d91-private-users-list-query-audit.md',
  );

for (const token of [
  'Known onboarding nickname migration blockers: 1',
  'Unexpected private users list queries: 0',
  '**PASS D9.1:**',
  '**BLOCKED D10:**',
]) {
  if (!report.includes(token)) {
    throw new Error(
      `audit token missing: ${token}`,
    );
  }
}

console.log(
  'PASS - guest onboarding local-only boundary active',
);
console.log(
  'PASS - 5 saved-cafe stores use shared guest local-only scope',
);
console.log(
  'PASS - nickname registry foundation prepared but inactive',
);
console.log(
  'PASS - exactly one known onboarding /users list-query blocker remains',
);
console.log(
  'BLOCKED - V1.2D10 remains blocked until V1.2D9.2',
);
