// ROOT_EXPLORE_V12D91A_GUEST_SCOPE_VERIFIER
import fs from 'node:fs';

const read = (file) => {
  if (!fs.existsSync(file)) {
    throw new Error(`missing ${file}`);
  }
  return fs.readFileSync(file, 'utf8');
};

const required = [
  [
    'store/characterAccountScope.ts',
    [
      'ROOT_EXPLORE_V12D91A_CHARACTER_GUEST_PRECEDENCE',
      'getAuthenticatedCharacterAccountScopeSnapshot',
      'CHARACTER_AUTHENTICATED_SCOPE_UID_MISMATCH',
    ],
  ],
  [
    'app/login.tsx',
    [
      'getAuthenticatedCharacterAccountScopeSnapshot',
      'ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_HANDOFF_SCOPE',
      'CHARACTER_V98D_GUEST_TO_GOOGLE_CHARACTER_HANDOFF',
      'guestCharacterScopeBeforeGoogleLogin',
    ],
  ],
  [
    'app/(tabs)/index.tsx',
    [
      'ROOT_EXPLORE_V12D91A_HOME_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveHomeFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/rootMemory.ts',
    [
      'ROOT_EXPLORE_V12D91A_ROOT_MEMORY_GUEST_CLOUD_BOUNDARY',
      'getRootEffectiveCloudUser',
    ],
  ],
  [
    'store/dailyCloud.ts',
    [
      'ROOT_EXPLORE_V12D91A_DAILY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveDailyFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/explorationCloud.ts',
    [
      'ROOT_EXPLORE_V12D91A_EXPLORATION_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveExplorationFirebaseUser',
      'getRootCloudUidOrNull',
      'EXPLORATION SYNC LOCAL ONLY: ROOT GUEST OR NO CLOUD USER',
    ],
  ],
  [
    'store/mediaBackup.ts',
    [
      'ROOT_EXPLORE_V12D91A_MEDIA_BACKUP_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveMediaBackupFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/rootPlaceCommunity.ts',
    [
      'ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_GUEST_CLOUD_BOUNDARY',
      'ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectivePlaceCommunityFirebaseUser',
      'ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD',
    ],
  ],
  [
    'app/add-action-goal.tsx',
    [
      'ROOT_EXPLORE_V12D91A_ACTION_GOAL_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveActionGoalFirebaseUser',
    ],
  ],
  [
    'app/add-result-goal.tsx',
    [
      'ROOT_EXPLORE_V12D91A_RESULT_GOAL_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveResultGoalFirebaseUser',
    ],
  ],
  [
    'store/characterGrowthPointReward.ts',
    [
      'ROOT_EXPLORE_V12D91A_CHARACTER_GROWTH_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveCharacterGrowthFirebaseUser',
    ],
  ],
  [
    'store/savedCafeIntegrityRepair.ts',
    [
      'ROOT_EXPLORE_V12D91A_SAVED_CAFE_INTEGRITY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveSavedCafeIntegrityFirebaseUser',
    ],
  ],
];

for (const [file, tokens] of required) {
  const source = read(file);

  for (const token of tokens) {
    if (!source.includes(token)) {
      throw new Error(`${file} missing ${token}`);
    }
  }
}

const loginSource =
  read(
    'app/login.tsx',
  );

if (
  !/import\s*\{\s*getAuthenticatedCharacterAccountScopeSnapshot\s*,?\s*\}\s*from\s*['"]\.\.\/store\/characterAccountScope['"]\s*;/m.test(
    loginSource,
  )
) {
  throw new Error(
    'Login authenticated character scope import is not sourced from characterAccountScope.',
  );
}

if (
  /import\s*\{[^}]*\bgetAuthenticatedCharacterAccountScopeSnapshot\b[^}]*\}\s*from\s*['"]@react-native-firebase\/app['"]\s*;/m.test(
    loginSource,
  )
) {
  throw new Error(
    'Login authenticated character scope symbol leaked into @react-native-firebase/app import.',
  );
}

const homeIndex =
  read(
    'app/(tabs)/index.tsx',
  );

const homeHelperStart =
  homeIndex.indexOf(
    'function getRootEffectiveHomeFirebaseUser',
  );

if (
  homeHelperStart <
    0
) {
  throw new Error(
    'Home effective Firebase-user helper missing.',
  );
}

const homeHelperTail =
  homeIndex.slice(
    homeHelperStart,
  );

const homeHelperMatch =
  homeHelperTail.match(
    /function getRootEffectiveHomeFirebaseUser\(\)\s*\{[\s\S]*?\n\}/,
  );

if (
  !homeHelperMatch
) {
  throw new Error(
    'Home effective Firebase-user helper body unresolved.',
  );
}

const homeHelperText =
  homeHelperMatch[0];

const helperRawAuthCount =
  (
    homeHelperText.match(
      /firebaseAuth\s*\.currentUser/g,
    ) ?? []
  ).length +
  (
    homeHelperText.match(
      /auth\(\)\s*\.currentUser/g,
    ) ?? []
  ).length;

const homeOutsideHelper =
  homeIndex.replace(
    homeHelperText,
    '',
  );

const outsideRawAuthCount =
  (
    homeOutsideHelper.match(
      /firebaseAuth\s*\.currentUser/g,
    ) ?? []
  ).length +
  (
    homeOutsideHelper.match(
      /auth\(\)\s*\.currentUser/g,
    ) ?? []
  ).length;

if (
  helperRawAuthCount !==
    1 ||
  outsideRawAuthCount !==
    0
) {
  throw new Error(
    `Home effective-user boundary invalid: helperRaw=${helperRawAuthCount}, outsideRaw=${outsideRawAuthCount}`,
  );
}

const explorationCloud =
  read(
    'store/explorationCloud.ts',
  );

const explorationHelperStart =
  explorationCloud.indexOf(
    'function getRootEffectiveExplorationFirebaseUser',
  );

if (
  explorationHelperStart <
    0
) {
  throw new Error(
    'Exploration effective Firebase-user helper missing.',
  );
}

const explorationHelperTail =
  explorationCloud.slice(
    explorationHelperStart,
  );

const explorationHelperMatch =
  explorationHelperTail.match(
    /function getRootEffectiveExplorationFirebaseUser\(\)\s*\{[\s\S]*?\n\}/,
  );

if (
  !explorationHelperMatch
) {
  throw new Error(
    'Exploration effective Firebase-user helper body unresolved.',
  );
}

const explorationHelperText =
  explorationHelperMatch[0];

const explorationRawPattern =
  /(?:auth\(\)\s*\.currentUser|firebaseAuth\s*\.currentUser)/g;

const explorationHelperRawCount =
  [
    ...explorationHelperText.matchAll(
      explorationRawPattern,
    ),
  ].length;

const explorationOutsideHelper =
  explorationCloud.replace(
    explorationHelperText,
    '',
  );

const explorationOutsideRawCount =
  [
    ...explorationOutsideHelper.matchAll(
      explorationRawPattern,
    ),
  ].length;

if (
  explorationHelperRawCount !==
    1 ||
  explorationOutsideRawCount !==
    0
) {
  throw new Error(
    `Exploration effective-user boundary invalid: helperRaw=${explorationHelperRawCount}, outsideRaw=${explorationOutsideRawCount}`,
  );
}

const mediaBackup =
  read(
    'store/mediaBackup.ts',
  );

const mediaHelperStart =
  mediaBackup.indexOf(
    'function getRootEffectiveMediaBackupFirebaseUser',
  );

if (
  mediaHelperStart <
    0
) {
  throw new Error(
    'Media Backup effective Firebase-user helper missing.',
  );
}

const mediaHelperTail =
  mediaBackup.slice(
    mediaHelperStart,
  );

const mediaHelperMatch =
  mediaHelperTail.match(
    /function getRootEffectiveMediaBackupFirebaseUser\(\)\s*\{[\s\S]*?\n\}/,
  );

if (
  !mediaHelperMatch
) {
  throw new Error(
    'Media Backup effective Firebase-user helper body unresolved.',
  );
}

const mediaHelperText =
  mediaHelperMatch[0];

const mediaRawPattern =
  /(?:auth\(\)\s*\.\s*currentUser|firebaseAuth\s*\.\s*currentUser)/g;

const mediaHelperRawCount =
  [
    ...mediaHelperText.matchAll(
      mediaRawPattern,
    ),
  ].length;

const mediaOutsideHelper =
  mediaBackup.replace(
    mediaHelperText,
    '',
  );

const mediaOutsideRawCount =
  [
    ...mediaOutsideHelper.matchAll(
      mediaRawPattern,
    ),
  ].length;

if (
  mediaHelperRawCount !==
    1 ||
  mediaOutsideRawCount !==
    0
) {
  throw new Error(
    `Media Backup effective-user boundary invalid: helperRaw=${mediaHelperRawCount}, outsideRaw=${mediaOutsideRawCount}`,
  );
}

const placeCommunity =
  read(
    'store/rootPlaceCommunity.ts',
  );

if (
  /getRootPlaceCommunityAuth\(\)\s*\.\s*currentUser/.test(
    placeCommunity,
  )
) {
  throw new Error(
    'Place Community still derives V1.2D8 self-only authUid from legacy raw Firebase currentUser.',
  );
}

for (const token of [
  'ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD',
  'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
  'assertOwnRootPlaceCommunityUid',
  'ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_GUEST_CLOUD_BOUNDARY',
]) {
  if (
    !placeCommunity.includes(
      token,
    )
  ) {
    throw new Error(
      `Place Community regression: missing ${token}`,
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
        `${file} D9.1 regression: missing ${token}`,
      );
    }
  }
}

const audit =
  read(
    'docs/explore-v12d91a-stale-auth-audit.md',
  );

for (const token of [
  'Missing hardened contracts: 0',
  'Unreviewed stale-auth risks: 0',
  '**PASS:** all required guest-scope cloud boundaries are installed.',
  '**PASS:** no unreviewed Firebase-auth-derived cloud identity remains in the runtime scan.',
]) {
  if (!audit.includes(token)) {
    throw new Error(
      `D9.1A audit gate missing: ${token}`,
    );
  }
}

const listAudit =
  read(
    'docs/explore-v12d91-private-users-list-query-audit.md',
  );

if (
  !listAudit.includes(
    'Known onboarding nickname migration blockers: 1',
  ) ||
  !listAudit.includes(
    'Unexpected private users list queries: 0',
  )
) {
  throw new Error(
    'D9.1 private-users list-query audit regressed.',
  );
}

console.log(
  'PASS - Character, Home, rootMemory, Daily, Exploration, Media Backup, goals, character rewards, cafe repair, and Place Community use ROOT guest-aware boundaries',
);
console.log(
  'PASS - saved-cafe five-store guest local-only boundary remains intact',
);
console.log(
  'PASS - zero unreviewed stale Firebase Auth cloud-identity risks',
);
console.log(
  'PASS - exactly one known authenticated onboarding /users list-query blocker still remains for D9.2',
);
console.log(
  'BLOCKED - V1.2D10 remains blocked until D9.2 and member physical-device verification',
);
console.log(
  'PASS - ROOT EXPLORE V1.2D9.1A GUEST SCOPE VERIFIER',
);
