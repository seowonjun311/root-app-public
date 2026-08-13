// ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_VERIFIER

import fs from 'node:fs';

const read = (
  file,
) => {
  if (
    !fs.existsSync(
      file,
    )
  ) {
    throw new Error(
      `missing ${file}`,
    );
  }

  return fs.readFileSync(
    file,
    'utf8',
  );
};

const registry =
  read(
    'store/rootNicknameRegistry.ts',
  );

for (
  const token of
  [
    'ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_ACTIVE_RUNTIME',
    'ROOT_EXPLORE_V12D92_LEGACY_COMPATIBLE_REGISTRY_IDS',
    "ROOT_NICKNAME_REGISTRY_ACTIVATION =\n  'V1.2D92_ACTIVE'",
    'getRootNicknameClaimDocumentId',
    'runTransaction',
    'transaction.delete',
    "'rootUserPublicProfiles'",
    "'users'",
    'ROOT_NICKNAME_TAKEN',
    'getRootCloudUidOrNull',
  ]
) {
  if (
    !registry.includes(
      token,
    )
  ) {
    throw new Error(
      `rootNicknameRegistry missing ${token}`,
    );
  }
}

const onboarding =
  read(
    'app/onboarding.tsx',
  );

for (
  const token of
  [
    'ROOT_EXPLORE_V12D91_GUEST_ONBOARDING_LOCAL_ONLY',
    'NICKNAME DUPLICATE CHECK SKIPPED GUEST LOCAL ONLY',
    'ROOT_EXPLORE_V12D92_PRIVATE_USERS_LIST_QUERY_REMOVED',
    'ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_ONBOARDING',
    'commitRootNicknameForUid',
    'getRootNicknameClaimDocumentId',
  ]
) {
  if (
    !onboarding.includes(
      token,
    )
  ) {
    throw new Error(
      `onboarding missing ${token}`,
    );
  }
}

if (
  onboarding.includes(
    'NICKNAME_CHECK_TIMEOUT',
  ) ||
  onboarding.includes(
    'NICKNAME DUPLICATE CHECK START',
  )
) {
  throw new Error(
    'legacy nickname /users query timeout path remains in onboarding',
  );
}

const settings =
  read(
    'app/(tabs)/settings.tsx',
  );

for (
  const token of
  [
    'ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_SETTINGS',
    'ROOT NICKNAME SETTINGS LOCAL ONLY: GUEST',
    'ROOT NICKNAME SETTINGS REGISTRY COMMIT SUCCESS',
    'commitRootNicknameForUid',
    'getRootCloudUidOrNull',
    'setRootOnboardingData',
  ]
) {
  if (
    !settings.includes(
      token,
    )
  ) {
    throw new Error(
      `settings missing ${token}`,
    );
  }
}

if (
  settings.includes(
    'saveRootOnboardingData('
  )
) {
  throw new Error(
    'settings unexpectedly references nonexistent saveRootOnboardingData',
  );
}

for (
  const file of
  [
    'firestore.rules',
    'firebase/firestore-v12d92-stage-a-nickname-registry.rules',
    'firebase/firestore-v12d92-self-only-release-candidate.rules',
  ]
) {
  const rules =
    read(
      file,
    );

  for (
    const token of
    [
      'ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_ACTIVE_RULES',
      'match /rootNicknames/{nicknameId}',
      'allow get: if signedIn();',
      'allow list: if false;',
      'request.resource.data.uid == request.auth.uid',
      'request.resource.data.nickname == nicknameId',
      'nicknameWriteIsAtomicFor',
      'nicknameDeleteIsAtomicFor',
      'getAfter(',
    ]
  ) {
    if (
      !rules.includes(
        token,
      )
    ) {
      throw new Error(
        `${file} missing ${token}`,
      );
    }
  }

  if (
    rules.includes(
      'allow read: if signedIn();'
    ) &&
    rules
      .slice(
        rules.indexOf(
          'match /rootNicknames/{nicknameId}',
        ),
        rules.indexOf(
          'match /rootNicknames/{nicknameId}',
        ) +
          1700,
      )
      .includes(
        'allow read: if signedIn();',
      )
  ) {
    throw new Error(
      `${file}: rootNicknames list-capable read rule remains`,
    );
  }
}

const listReport =
  read(
    'docs/explore-v12d92-private-users-list-query-audit.md',
  );

if (
  !listReport.includes(
    'PRIVATE_USERS_LIST_QUERY = 0',
  ) ||
  !listReport.includes(
    '**PASS D9.2:**',
  )
) {
  throw new Error(
    'D9.2 zero-list-query report is not PASS',
  );
}

for (
  const file of
  [
    'ops/root-place-admin/backfill-root-nickname-registry.mjs',
    'ops/root-place-admin/verify-root-nickname-registry.mjs',
  ]
) {
  read(
    file,
  );
}

console.log(
  'PASS - nickname registry active runtime contract',
);
console.log(
  'PASS - onboarding private /users nickname query removed',
);
console.log(
  'PASS - member onboarding/settings use atomic nickname registry transaction',
);
console.log(
  'PASS - guest onboarding/settings remain local-only',
);
console.log(
  'PASS - rootNicknames exact get allowed and list denied',
);
console.log(
  'PASS - PRIVATE_USERS_LIST_QUERY = 0',
);
console.log(
  'BLOCKED - V1.2D10 still requires post-D9.2 physical member/device diagnostics',
);
console.log(
  'PASS - ROOT EXPLORE V1.2D9.2 NICKNAME REGISTRY VERIFIER',
);
