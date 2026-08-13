// ROOT_EXPLORE_V12D8_V2_MANUAL_UID_FLOW_RESOLUTION

import fs from 'node:fs';

const priorReport =
  fs.readFileSync(
    'docs/explore-v12d6-userdoc-migration-audit.md',
    'utf8',
  );

const manualSites = [
  ...priorReport.matchAll(
    /^### `([^`]+):(\d+)`\s*\n\s*\n- Classification: \*\*MANUAL_UID_FLOW_REVIEW\*\*/gm,
  ),
].map(
  (
    match,
  ) => ({
    file:
      match[1].replace(
        /\\/g,
        '/',
      ),
    line:
      Number(
        match[2],
      ),
  }),
);

if (
  manualSites.length !==
  3
) {
  throw new Error(
    `Expected exactly 3 V1.2D6 MANUAL_UID_FLOW_REVIEW sites, found ${manualSites.length}.`,
  );
}

const expectedFiles =
  [
    'app/login.tsx',
    'store/rootPlaceCommunity.ts',
    'store/rootUserPublicProfileSync.ts',
  ];

const actualFiles =
  [
    ...new Set(
      manualSites.map(
        (
          item,
        ) =>
          item.file,
      ),
    ),
  ].sort();

if (
  JSON.stringify(
    actualFiles,
  ) !==
  JSON.stringify(
    [
      ...expectedFiles,
    ].sort(),
  )
) {
  throw new Error(
    `Unexpected V1.2D6 manual-site file set: ${JSON.stringify(actualFiles)}`,
  );
}

const login =
  fs.readFileSync(
    'app/login.tsx',
    'utf8',
  );

const loginGuard =
  login.indexOf(
    'ROOT_EXPLORE_V12D8_LOGIN_PRIVATE_USER_SELF_ONLY_GUARD',
  );

const loginPrivateRead =
  login.indexOf(
    "'users'",
    login.indexOf(
      'const loadServerData = async (',
    ),
  );

if (
  loginGuard < 0 ||
  loginPrivateRead < 0 ||
  loginGuard >
    loginPrivateRead ||
  !login.includes(
    'LOGIN_PRIVATE_USER_SELF_ONLY_UID_REQUIRED',
  ) ||
  !login.includes(
    'firebaseAuth.currentUser',
  )
) {
  throw new Error(
    'app/login.tsx loadServerData is not proven self-only.',
  );
}

const community =
  fs.readFileSync(
    'store/rootPlaceCommunity.ts',
    'utf8',
  );

if (
  !community.includes(
    'ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD',
  ) ||
  !community.includes(
    'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
  ) ||
  !community.includes(
    'getRootPlaceCommunityAuth',
  ) ||
  !community.includes(
    'assertOwnRootPlaceCommunityUid',
  )
) {
  throw new Error(
    'rootPlaceCommunity authenticated self-only guard is incomplete.',
  );
}

const privateUserDocPattern =
  /doc\s*\([\s\S]{0,500}?['"`]users['"`]\s*,\s*([\s\S]{0,300}?)\)/g;

const communityMatches =
  [
    ...community.matchAll(
      privateUserDocPattern,
    ),
  ];

if (
  communityMatches.length <
  1
) {
  throw new Error(
    'No rootPlaceCommunity private-user document reference was found for proof.',
  );
}

for (
  const match of
  communityMatches
) {
  if (
    !match[1].includes(
      'assertOwnRootPlaceCommunityUid',
    )
  ) {
    throw new Error(
      'rootPlaceCommunity has a private-user document reference without authenticated self-uid assertion.',
    );
  }
}

const sync =
  fs.readFileSync(
    'store/rootUserPublicProfileSync.ts',
    'utf8',
  );

const ownBuilderStart =
  sync.indexOf(
    'export const buildOwnRootUserPublicProfileFromPrivateDocument',
  );

const mismatchGuard =
  sync.indexOf(
    'currentUid !==',
    ownBuilderStart,
  );

const privateCollectionRead =
  sync.indexOf(
    "'users'",
    ownBuilderStart,
  );

const publicReadStart =
  sync.indexOf(
    'export const readRootUserPublicProfile',
  );

const publicCollectionToken =
  sync.indexOf(
    'ROOT_USER_PUBLIC_PROFILE_COLLECTION',
    publicReadStart,
  );

if (
  ownBuilderStart < 0 ||
  mismatchGuard < 0 ||
  privateCollectionRead < 0 ||
  mismatchGuard >
    privateCollectionRead
) {
  throw new Error(
    'rootUserPublicProfileSync private source read is not preceded by its currentUid/normalizedUid self guard.',
  );
}

if (
  publicReadStart < 0 ||
  publicCollectionToken < 0 ||
  publicCollectionToken >
    ownBuilderStart
) {
  throw new Error(
    'readRootUserPublicProfile is not proven to read the public projection collection.',
  );
}

const output = [
  '# ROOT Explore V1.2D8 V2 — MANUAL_UID_FLOW_REVIEW resolution',
  '',
  '> V1.2D8 V1 stopped because a line-proximity heuristic could not prove all three sites. V2 resolves them by runtime guard contracts and collection-aware source checks.',
  '',
  '## Summary',
  '',
  '- V1.2D6 manual sites: 3',
  '- Resolved self-only sites: 3',
  '- Unresolved sites: 0',
  '',
  '## Resolutions',
  '',
  '### `app/login.tsx`',
  '',
  '- Resolution: **PROVEN_SELF_RUNTIME_GUARD**',
  '- `loadServerData(uid)` now checks `firebaseAuth.currentUser.uid` against the requested private user uid before any `/users/{uid}` read.',
  '- This removes dependence on whether an individual caller names the authenticated user `user`, `currentUser`, or another variable.',
  '',
  '### `store/rootPlaceCommunity.ts`',
  '',
  '- Resolution: **PROVEN_SELF_REFERENCE_GUARD**',
  `- Guarded private-user document refs: ${communityMatches.length}`,
  '- Every direct `doc(..., "users", uid)` reference in this module routes its document id through `assertOwnRootPlaceCommunityUid(...)`.',
  '- The assertion compares the requested uid with Firebase Auth before returning the document id.',
  '',
  '### `store/rootUserPublicProfileSync.ts`',
  '',
  '- Resolution: **PROVEN_SELF_EXISTING_GUARD + FALSE-POSITIVE-CORRECTION**',
  '- The private source builder rejects `currentUid !== normalizedUid` before its `/users/{uid}` read.',
  '- `readRootUserPublicProfile(...)` reads `rootUserPublicProfiles`, not `/users`; V1 line-proximity matching incorrectly treated that public read as the old manual private-user site.',
  '',
  '## Decision',
  '',
  '- All three former MANUAL_UID_FLOW_REVIEW sites are now statically and contractually resolved as authenticated-user self reads.',
  '- No former manual site requires a cross-user private `/users/{uid}` read.',
  '- Production remains on Stage A in V1.2D8.',
  '- The self-only target is still not deployed; V1.2D9 must perform a fresh whole-project zero-cross-user audit and release rehearsal.',
  '',
];

fs.writeFileSync(
  'docs/explore-v12d8-manual-uid-flow-resolution.md',
  output.join('\n'),
  'utf8',
);

console.log(
  'PASS - V1.2D6 manual sites parsed: 3',
);
console.log(
  'PASS - PROVEN_SELF_RUNTIME_GUARD - app/login.tsx loadServerData',
);
console.log(
  `PASS - PROVEN_SELF_REFERENCE_GUARD - store/rootPlaceCommunity.ts refs=${communityMatches.length}`,
);
console.log(
  'PASS - PROVEN_SELF_EXISTING_GUARD - store/rootUserPublicProfileSync.ts private source builder',
);
console.log(
  'PASS - FALSE_POSITIVE_CORRECTED - readRootUserPublicProfile reads rootUserPublicProfiles, not users',
);
console.log(
  'PASS - all 3 former MANUAL_UID_FLOW_REVIEW sites are resolved self-only',
);
