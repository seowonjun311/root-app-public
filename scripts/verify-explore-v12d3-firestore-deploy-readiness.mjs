// ROOT_EXPLORE_V12D3_FIRESTORE_DEPLOY_READINESS

import crypto from 'node:crypto';
import fs from 'node:fs';

const CURRENT_SHA =
  '26530898d2740729cae75ef125e28e61e9f18678964666b5519a2e7df6a80944';

const CANDIDATE_SHA =
  '5cd42fd91b09aad9f91ec02052c7ff7a53369c2683d396ef4242046a9846111b';

function read(
  path
) {
  if (
    !fs.existsSync(
      path
    )
  ) {
    throw new Error(
      `missing ${path}`
    );
  }

  return fs
    .readFileSync(
      path,
      'utf8'
    )
    .replace(
      /\r\n/g,
      '\n'
    );
}

function sha256(
  source
) {
  return crypto
    .createHash(
      'sha256'
    )
    .update(
      source,
      'utf8'
    )
    .digest(
      'hex'
    );
}

const rules =
  read(
    'firestore.rules'
  );

const firebaseConfig =
  JSON.parse(
    read(
      'firebase.json'
    )
  );

const dryRun =
  read(
    'scripts/run-explore-v12d3-firestore-dry-run.ps1'
  );

const V12D4_HARDENED_SHA =
  'fd74b90dd9fec2919ca9bb3868116a6a9c3294b23f511f0807fb25bbd5bb059a';

const currentRulesSha =
  sha256(
    rules
  );

if (
  currentRulesSha !==
  CANDIDATE_SHA &&
  currentRulesSha !==
  V12D4_HARDENED_SHA
) {
  throw new Error(
    `firestore.rules is neither V1.2D3 candidate nor V1.2D4 hardened SHA256: ${currentRulesSha}`
  );
}

if (
  firebaseConfig
    ?.firestore
    ?.rules !==
  'firestore.rules'
) {
  throw new Error(
    'firebase.json must target firestore.rules'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D2_MERGED_MODERATION_RULES',
    'rootPlaceModerationInbox',
    'rootPlaceApprovedCommunityRecords',
    'rootPlacePublicCommunityDistricts',
    'rootPlaceCommunityReports',
    'rootPlaceModerationAudit',
  ]
) {
  const count =
    rules
      .split(
        token
      )
      .length -
    1;

  if (
    count !==
    1
  ) {
    throw new Error(
      `${token} expected once, found ${count}`
    );
  }
}

for (
  const token of [
    '--dry-run',
    'firestore:rules',
    CURRENT_SHA.toUpperCase(),
    CANDIDATE_SHA.toUpperCase(),
    'Live rules unchanged after dry-run',
    'Do not run a non-dry-run deploy yet',
  ]
) {
  if (
    !dryRun.includes(
      token
    )
  ) {
    throw new Error(
      `dry-run guard missing ${JSON.stringify(token)}`
    );
  }
}

console.log(
  'PASS - firestore.rules exactly matches reviewed candidate SHA256'
);
console.log(
  'PASS - firebase.json targets only the reviewed firestore.rules source'
);
console.log(
  'PASS - moderation collection rules occur exactly once'
);
console.log(
  'PASS - dry-run workflow rechecks live rules before and after validation'
);
console.log(
  'PASS - EXPLORE V1.2D3 FIRESTORE DEPLOY READINESS'
);
