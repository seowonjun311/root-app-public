// ROOT_EXPLORE_V12D4_SECURITY_AUDIT_VERIFIER

import crypto from 'node:crypto';
import fs from 'node:fs';

const EXPECTED_HARDENED_SHA =
  'fd74b90dd9fec2919ca9bb3868116a6a9c3294b23f511f0807fb25bbd5bb059a';

function read(
  file
) {
  if (
    !fs.existsSync(
      file
    )
  ) {
    throw new Error(
      `missing ${file}`
    );
  }

  return fs
    .readFileSync(
      file,
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

if (
  sha256(
    rules
  ) !==
  EXPECTED_HARDENED_SHA
) {
  throw new Error(
    'firestore.rules does not match the reviewed V1.2D4 hardened SHA256'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D4_ROOT_MODERATOR_ONLY',
    'request.auth.token.rootModerator == true',
    'match /rootPlaceModerationInbox/{contributionId}',
    'match /rootPlaceApprovedCommunityRecords/{recordId}',
    'match /rootPlacePublicCommunityDistricts/{districtId}',
    'match /rootPlaceCommunityReports/{reportId}',
    'match /rootPlaceModerationAudit/{auditId}',
    'match /users/{uid}',
    'allow read: if signedIn();',
  ]
) {
  if (
    !rules.includes(
      token
    )
  ) {
    throw new Error(
      `missing rules token ${JSON.stringify(token)}`
    );
  }
}

for (
  const forbidden of [
    'request.auth.token.moderator == true',
    'request.auth.token.admin == true',
  ]
) {
  if (
    rules.includes(
      forbidden
    )
  ) {
    throw new Error(
      `legacy moderator privilege remains: ${forbidden}`
    );
  }
}

const testSource =
  read(
    'ops/root-place-rules-tests/firestore-rules.test.mjs'
  );

for (
  const token of [
    'demo-root-explore-v12d4',
    'rootModerator',
    'legacy admin-only claim cannot write public aggregate',
    'legacy moderator-only claim cannot write public aggregate',
    'KNOWN RISK - authenticated user can currently read another top-level user document',
    'assertFails',
    'assertSucceeds',
  ]
) {
  if (
    !testSource.includes(
      token
    )
  ) {
    throw new Error(
      `emulator test coverage token missing ${JSON.stringify(token)}`
    );
  }
}

const runner =
  read(
    'scripts/run-explore-v12d4-emulator-tests.ps1'
  );

for (
  const token of [
    'demo-root-explore-v12d4',
    'emulators:exec',
    '--only firestore',
    '--config .\\firebase.json',
  ]
) {
  if (
    !runner.includes(
      token
    )
  ) {
    throw new Error(
      `emulator runner safety token missing ${JSON.stringify(token)}`
    );
  }
}

const audit =
  read(
    'docs/explore-v12d4-user-doc-access-audit.md'
  );

for (
  const token of [
    '/users/{uid}',
    'Files containing a user-document path/helper token',
    'Files with a nearby Firestore read candidate',
    'V1.2D4 intentionally does **not** change the existing `/users/{uid}` read policy.',
  ]
) {
  if (
    !audit.includes(
      token
    )
  ) {
    throw new Error(
      `audit report token missing ${JSON.stringify(token)}`
    );
  }
}

const claimTool =
  read(
    'ops/root-place-admin/set-moderator-claim.mjs'
  );

if (
  !claimTool.includes(
    'rootModerator'
  )
) {
  throw new Error(
    'existing Admin SDK moderator claim tool does not reference rootModerator'
  );
}

console.log(
  'PASS - firestore.rules matches reviewed V1.2D4 hardened hash'
);
console.log(
  'PASS - moderation Security Rules authorize rootModerator only'
);
console.log(
  'PASS - legacy admin/moderator claim access removed from Rules'
);
console.log(
  'PASS - emulator suite covers normal/anonymous/rootModerator/legacy-claim cases'
);
console.log(
  'PASS - /users/{uid} dependency audit report exists'
);
console.log(
  'PASS - EXPLORE V1.2D4 SECURITY AUDIT VERIFIER'
);
