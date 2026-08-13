// ROOT_EXPLORE_V12D7_STAGE_A_ACTIVATION_VERIFIER

import crypto from 'node:crypto';
import fs from 'node:fs';

const STAGE_A_SHA =
  '5b8666f3ddfa1f3be438f1be26cf9e7fd57f30596d9b6a7a011f7c2623768732';

const normalize =
  (source) =>
    source
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

const read =
  (file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`missing ${file}`);
    }

    return normalize(
      fs.readFileSync(
        file,
        'utf8',
      ),
    );
  };

const sha =
  (source) =>
    crypto
      .createHash('sha256')
      .update(source, 'utf8')
      .digest('hex');

const rules =
  read('firestore.rules');

if (
  sha(rules) !==
  STAGE_A_SHA
) {
  throw new Error(
    'Active firestore.rules must be the reviewed Stage A source.',
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D5_PUBLIC_USER_PROJECTION_STAGE_A',
    'match /rootUserPublicProfiles/{uid}',
    'allow read: if signedIn();',
    'ROOT_EXPLORE_V12D4_ROOT_MODERATOR_ONLY',
  ]
) {
  if (
    !rules.includes(token)
  ) {
    throw new Error(
      `Active Stage A token missing: ${token}`,
    );
  }
}

const target =
  read(
    'firebase/firestore-v12d5-self-only-target.rules',
  );

if (
  rules ===
  target
) {
  throw new Error(
    'Self-only target must not be active in V1.2D7.',
  );
}

const profileFoundation =
  read(
    'store/rootUserPublicProfile.ts',
  );

for (
  const token of [
    'ROOT_EXPLORE_V12D7_PUBLIC_PROFILE_SOURCE_NORMALIZATION',
    'badgeMainBadgeId',
    'source.rootData',
  ]
) {
  if (
    !profileFoundation.includes(token)
  ) {
    throw new Error(
      `Public profile normalization token missing: ${token}`,
    );
  }
}

const syncAdapter =
  read(
    'store/rootUserPublicProfileSync.ts',
  );

for (
  const token of [
    'ROOT_EXPLORE_V12D7_STAGE_A_LIVE_DUAL_WRITE',
    'shouldSyncRootUserPublicProfileFromMerge',
    'V1.2D7_STAGE_A_LIVE',
  ]
) {
  if (
    !syncAdapter.includes(token)
  ) {
    throw new Error(
      `Sync adapter activation token missing: ${token}`,
    );
  }
}

const rootMemory =
  read(
    'store/rootMemory.ts',
  );

if (
  !rootMemory.includes(
    'ROOT_EXPLORE_V12D7_ROOT_MEMORY_PROFILE_SYNC',
  ) ||
  !rootMemory.includes(
    'shouldSyncRootUserPublicProfileFromMerge',
  )
) {
  throw new Error(
    'rootMemory selective public-profile sync hook missing.',
  );
}

const login =
  read(
    'app/login.tsx',
  );

if (
  !login.includes(
    'ROOT_EXPLORE_V12D7_LOGIN_PROFILE_SYNC',
  ) ||
  !login.includes(
    'bestEffortSyncOwnRootUserPublicProfile',
  )
) {
  throw new Error(
    'login public-profile sync hook missing.',
  );
}

const backfill =
  read(
    'ops/root-place-admin/backfill-root-user-public-profiles.mjs',
  );

for (
  const token of [
    'ROOT_EXPLORE_V12D7_ATOMIC_CONFIRMED_BACKFILL',
    'MAX_ATOMIC_USERS',
    'batch.create',
    '--confirm',
  ]
) {
  if (
    !backfill.includes(token)
  ) {
    throw new Error(
      `Backfill safety token missing: ${token}`,
    );
  }
}

const verifyBackfill =
  read(
    'ops/root-place-admin/verify-root-user-public-profiles.mjs',
  );

if (
  !verifyBackfill.includes(
    'ROOT_EXPLORE_V12D7_PUBLIC_PROFILE_BACKFILL_VERIFIER',
  )
) {
  throw new Error(
    'Backfill verifier marker missing.',
  );
}

const d6Audit =
  read(
    'docs/explore-v12d6-userdoc-migration-audit.md',
  );

if (
  !d6Audit.includes(
    'MANUAL_UID_FLOW_REVIEW',
  )
) {
  throw new Error(
    'V1.2D6 manual uid-flow blocker must remain visible.',
  );
}

console.log(
  'PASS - active local Firestore Rules are the reviewed Stage A source',
);
console.log(
  'PASS - self-only target remains inactive',
);
console.log(
  'PASS - own-profile dual-write hooks are activated for login and selective rootMemory presentation changes',
);
console.log(
  'PASS - Admin backfill is single-batch guarded and separately verified',
);
console.log(
  'BLOCKED - self-only /users/{uid} release still waits for manual uid-flow review',
);
console.log(
  'PASS - EXPLORE V1.2D7 STAGE A ACTIVATION VERIFIER',
);
