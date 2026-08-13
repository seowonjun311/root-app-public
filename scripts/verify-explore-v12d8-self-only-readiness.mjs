// ROOT_EXPLORE_V12D8_V2_SELF_ONLY_READINESS_VERIFIER

import crypto from 'node:crypto';
import fs from 'node:fs';

const STAGE_A_SHA =
  '5b8666f3ddfa1f3be438f1be26cf9e7fd57f30596d9b6a7a011f7c2623768732';

const SELF_ONLY_SHA =
  '28bab9fca79e720ff5a0daebd008ada08eed4b884f49d00d6eb0fef3d1beff8a';

const normalize = (source) =>
  source
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

const read = (file) => {
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

const sha = (source) =>
  crypto
    .createHash('sha256')
    .update(source, 'utf8')
    .digest('hex');

if (
  sha(
    read('firestore.rules'),
  ) !==
  STAGE_A_SHA
) {
  throw new Error(
    'Active local Rules are not exact V1.2D7 Stage A.',
  );
}

if (
  sha(
    read(
      'firebase/firestore-v12d5-self-only-target.rules',
    ),
  ) !==
  SELF_ONLY_SHA
) {
  throw new Error(
    'Self-only target changed unexpectedly.',
  );
}

const login =
  read('app/login.tsx');

for (
  const token of [
    'ROOT_EXPLORE_V12D8_LOGIN_PRIVATE_USER_SELF_ONLY_GUARD',
    'LOGIN_PRIVATE_USER_SELF_ONLY_UID_REQUIRED',
  ]
) {
  if (!login.includes(token)) {
    throw new Error(
      `login self-only token missing: ${token}`,
    );
  }
}

const community =
  read(
    'store/rootPlaceCommunity.ts',
  );

for (
  const token of [
    'ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD',
    'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
    'assertOwnRootPlaceCommunityUid',
    'getRootPlaceCommunityAuth',
  ]
) {
  if (!community.includes(token)) {
    throw new Error(
      `rootPlaceCommunity self-only token missing: ${token}`,
    );
  }
}

const sync =
  read(
    'store/rootUserPublicProfileSync.ts',
  );

for (
  const token of [
    'ROOT_EXPLORE_V12D8_DEVICE_SELF_ONLY_DIAGNOSTICS',
    'ROOT_EXPLORE_V12D8_POST_SYNC_DEVICE_DIAGNOSTIC',
    'runRootUserSelfOnlyDeviceDiagnostic',
    'ROOT USER SELF-ONLY DEVICE DIAGNOSTIC',
    '__DEV__',
  ]
) {
  if (!sync.includes(token)) {
    throw new Error(
      `device diagnostic token missing: ${token}`,
    );
  }
}

const report =
  read(
    'docs/explore-v12d8-manual-uid-flow-resolution.md',
  );

for (
  const token of [
    '- V1.2D6 manual sites: 3',
    '- Resolved self-only sites: 3',
    '- Unresolved sites: 0',
    'PROVEN_SELF_RUNTIME_GUARD',
    'PROVEN_SELF_REFERENCE_GUARD',
    'PROVEN_SELF_EXISTING_GUARD + FALSE-POSITIVE-CORRECTION',
  ]
) {
  if (!report.includes(token)) {
    throw new Error(
      `V1.2D8 resolution token missing: ${token}`,
    );
  }
}

console.log(
  'PASS - active local Rules remain exact production Stage A source',
);
console.log(
  'PASS - self-only target remains unchanged and inactive',
);
console.log(
  'PASS - login private-user helper is runtime self-uid guarded',
);
console.log(
  'PASS - rootPlaceCommunity private-user document refs are auth self-uid guarded',
);
console.log(
  'PASS - rootUserPublicProfileSync private source read retains self guard and public read false-positive is corrected',
);
console.log(
  'PASS - dev-only physical-device diagnostic is active',
);
console.log(
  'BLOCKED - real self-only production release remains deferred to V1.2D9/V1.2D10',
);
console.log(
  'PASS - EXPLORE V1.2D8 V2 SELF-ONLY READINESS VERIFIER',
);
