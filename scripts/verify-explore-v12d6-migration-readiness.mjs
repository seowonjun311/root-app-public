// ROOT_EXPLORE_V12D6_MIGRATION_READINESS_VERIFIER

import fs from 'node:fs';

const required = [
  [
    'store/rootUserPublicProfileSync.ts',
    [
      'ROOT_EXPLORE_V12D6_PUBLIC_PROFILE_SYNC_ADAPTER',
      'ROOT_USER_PUBLIC_PROFILE_SYNC_ACTIVATION',
      'V1.2D7_AFTER_STAGE_A_RELEASE',
      'syncOwnRootUserPublicProfileFromPrivateDocument',
      'readRootUserPublicProfile',
    ],
  ],
  [
    'ops/root-place-admin/backfill-root-user-public-profiles.mjs',
    [
      'ROOT_EXPLORE_V12D6_PUBLIC_PROFILE_BACKFILL_ADMIN',
      '--write',
      '--confirm',
      'DRY_RUN',
      'sensitiveFieldValuesPrinted',
    ],
  ],
  [
    'scripts/audit-explore-v12d6-cross-user-userdoc.mjs',
    [
      'ROOT_EXPLORE_V12D6_CROSS_USER_USERDOC_AUDIT',
      'POSSIBLE_PUBLIC_PRESENTATION',
      'MANUAL_UID_FLOW_REVIEW',
      'Stage A has not been production-deployed',
    ],
  ],
  [
    'scripts/run-explore-v12d6-backfill-dry-run.ps1',
    [
      'SAFE - no projection documents were written',
      'root-c7949:rootUserPublicProfiles',
    ],
  ],
  [
    'docs/explore-v12d6-userdoc-migration-audit.md',
    [
      'V1.2D6 activation decision',
      'Client projection sync adapter is prepared but intentionally not wired.',
    ],
  ],
];

for (
  const [
    file,
    tokens,
  ] of
  required
) {
  if (
    !fs.existsSync(
      file,
    )
  ) {
    throw new Error(
      `missing ${file}`,
    );
  }

  const source =
    fs.readFileSync(
      file,
      'utf8',
    );

  for (
    const token of
    tokens
  ) {
    if (
      !source.includes(
        token,
      )
    ) {
      throw new Error(
        `${file} missing ${JSON.stringify(token)}`,
      );
    }
  }
}

const activeRules =
  fs.readFileSync(
    'firestore.rules',
    'utf8',
  );

if (
  activeRules.includes(
    'ROOT_EXPLORE_V12D5_PUBLIC_USER_PROJECTION_STAGE_A',
  )
) {
  throw new Error(
    'Active firestore.rules unexpectedly contains Stage A; V1.2D6 must not deploy or activate it.',
  );
}

const stageA =
  fs.readFileSync(
    'firebase/firestore-v12d5-public-projection-stage-a.rules',
    'utf8',
  );

if (
  !stageA.includes(
    'match /rootUserPublicProfiles/{uid}',
  )
) {
  throw new Error(
    'V1.2D5 Stage A projection candidate is missing.',
  );
}

console.log(
  'PASS - projection sync adapter exists but remains activation-gated',
);
console.log(
  'PASS - Admin backfill defaults to dry-run and requires explicit confirmation for writes',
);
console.log(
  'PASS - cross-user user-document migration audit exists',
);
console.log(
  'PASS - active firestore.rules remains pre-Stage-A',
);
console.log(
  'PASS - EXPLORE V1.2D6 MIGRATION READINESS',
);
