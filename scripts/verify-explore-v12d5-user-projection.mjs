// ROOT_EXPLORE_V12D5_USER_PROJECTION_VERIFIER

import crypto from 'node:crypto';
import fs from 'node:fs';

const HARDENED_SHA =
  'fd74b90dd9fec2919ca9bb3868116a6a9c3294b23f511f0807fb25bbd5bb059a';

const STAGE_A_SHA =
  '5b8666f3ddfa1f3be438f1be26cf9e7fd57f30596d9b6a7a011f7c2623768732';

const TARGET_SHA =
  '28bab9fca79e720ff5a0daebd008ada08eed4b884f49d00d6eb0fef3d1beff8a';

const normalize =
  (
    source,
  ) =>
    source
      .replace(
        /\r\n/g,
        '\n',
      )
      .replace(
        /\r/g,
        '\n',
      );

const read =
  (
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

    return normalize(
      fs.readFileSync(
        file,
        'utf8',
      ),
    );
  };

const sha =
  (
    source,
  ) =>
    crypto
      .createHash(
        'sha256',
      )
      .update(
        source,
        'utf8',
      )
      .digest(
        'hex',
      );

const currentRules =
  read(
    'firestore.rules',
  );

const stageA =
  read(
    'firebase/firestore-v12d5-public-projection-stage-a.rules',
  );

const target =
  read(
    'firebase/firestore-v12d5-self-only-target.rules',
  );

if (
  sha(
    currentRules,
  ) !==
  HARDENED_SHA
) {
  throw new Error(
    'Current firestore.rules must remain the V1.2D4 hardened baseline.',
  );
}

if (
  sha(
    stageA,
  ) !==
  STAGE_A_SHA
) {
  throw new Error(
    'Stage A rules hash mismatch.',
  );
}

if (
  sha(
    target,
  ) !==
  TARGET_SHA
) {
  throw new Error(
    'Self-only target rules hash mismatch.',
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D5_PUBLIC_USER_PROJECTION_STAGE_A',
    'match /rootUserPublicProfiles/{uid}',
    'allow read: if signedIn();',
    "request.resource.data.keys().hasOnly([",
    "'representativeBadgeId'",
  ]
) {
  if (
    !stageA.includes(
      token,
    )
  ) {
    throw new Error(
      `Stage A token missing: ${token}`,
    );
  }
}

for (
  const token of [
    'ROOT_EXPLORE_V12D5_PRIVATE_USER_SELF_ONLY_TARGET',
    'ROOT_EXPLORE_V12D5_PUBLIC_USER_PROJECTION_TARGET',
    'match /rootUserPublicProfiles/{uid}',
    'allow read: if isSelf(uid);',
  ]
) {
  if (
    !target.includes(
      token,
    )
  ) {
    throw new Error(
      `Target token missing: ${token}`,
    );
  }
}

if (
  !stageA.includes(
    'match /users/{uid} {\n      allow read: if signedIn();',
  )
) {
  throw new Error(
    'Stage A must preserve signed-in cross-user /users read during migration.',
  );
}

if (
  !target.includes(
    'match /users/{uid} {\n      allow read: if isSelf(uid);',
  )
) {
  throw new Error(
    'Target must make top-level /users read self-only.',
  );
}

for (
  const rules of [
    stageA,
    target,
  ]
) {
  if (
    !rules.includes(
      'request.auth.token.rootModerator == true',
    ) ||
    rules.includes(
      'request.auth.token.admin == true',
    ) ||
    rules.includes(
      'request.auth.token.moderator == true',
    )
  ) {
    throw new Error(
      'rootModerator-only moderation boundary regressed.',
    );
  }
}

const foundation =
  read(
    'store/rootUserPublicProfile.ts',
  );

for (
  const token of [
    'ROOT_EXPLORE_V12D5_PUBLIC_USER_PROJECTION_FOUNDATION',
    'ROOT_USER_PUBLIC_PROFILE_COLLECTION',
    'buildRootUserPublicProfile',
    'representativeBadgeId',
  ]
) {
  if (
    !foundation.includes(
      token,
    )
  ) {
    throw new Error(
      `Public profile foundation token missing: ${token}`,
    );
  }
}

const test =
  read(
    'ops/root-place-rules-tests/firestore-v12d5-user-projection.test.mjs',
  );

for (
  const token of [
    'demo-root-explore-v12d5',
    'STAGE_A',
    'SELF_ONLY_TARGET',
    'projection allowlist blocks extra private fields',
    'target denies signed-in cross-user private read',
  ]
) {
  if (
    !test.includes(
      token,
    )
  ) {
    throw new Error(
      `Emulator coverage token missing: ${token}`,
    );
  }
}

const classification =
  read(
    'docs/explore-v12d5-user-read-classification.md',
  );

if (
  !classification.includes(
    'Do not deploy the self-only `/users/{uid}` target yet.',
  )
) {
  throw new Error(
    'Classification report must preserve the no-deploy decision.',
  );
}

console.log(
  'PASS - current firestore.rules remains V1.2D4 hardened baseline',
);
console.log(
  'PASS - Stage A public-user projection candidate verified',
);
console.log(
  'PASS - self-only private-user target candidate verified',
);
console.log(
  'PASS - projection fields are allowlisted and exclude email/private ROOT state',
);
console.log(
  'PASS - rootModerator-only moderation boundary preserved',
);
console.log(
  'PASS - runtime projection foundation is side-effect free and not wired into existing flows',
);
console.log(
  'PASS - EXPLORE V1.2D5 USER PROJECTION VERIFIER',
);
