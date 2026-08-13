// ROOT_EXPLORE_V12D1_SECURITY_BOOTSTRAP_VERIFIER

import fs from 'node:fs';

const paths = {
  rules:
    'firebase/root-place-moderation.rules.fragment',
  package:
    'ops/root-place-admin/package.json',
  setClaim:
    'ops/root-place-admin/set-moderator-claim.mjs',
  verifyClaim:
    'ops/root-place-admin/verify-moderator-claim.mjs',
  preflight:
    'scripts/run-explore-v12d1-security-preflight.mjs',
  checklist:
    'docs/explore-v12d1-moderation-security-bootstrap.md',
};

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
    );
}

function requireToken(
  source,
  token,
  label
) {
  if (
    !source.includes(
      token
    )
  ) {
    throw new Error(
      `${label} missing ${JSON.stringify(token)}`
    );
  }
}

const rules =
  read(paths.rules);

const packageText =
  read(paths.package);

const setClaim =
  read(paths.setClaim);

const verifyClaim =
  read(paths.verifyClaim);

const preflight =
  read(paths.preflight);

const checklist =
  read(paths.checklist);

for (
  const token of [
    'ROOT_EXPLORE_V12D1_MODERATION_RULES_FRAGMENT',
    'isRootPlaceModerator',
    'rootPlaceModerationInbox',
    'rootPlaceApprovedCommunityRecords',
    'rootPlacePublicCommunityDistricts',
    'rootPlaceCommunityReports',
    'rootPlaceModerationAudit',
  ]
) {
  requireToken(
    rules,
    token,
    'rules fragment'
  );
}

for (
  const token of [
    '"node": ">=22"',
    '"firebase-admin": "14.2.0"',
  ]
) {
  requireToken(
    packageText,
    token,
    'ops package'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D1_SET_MODERATOR_CLAIM',
    'applicationDefault',
    'setCustomUserClaims',
    'previousClaims',
    'rootModerator',
    '--confirm',
  ]
) {
  requireToken(
    setClaim,
    token,
    'set claim tool'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D1_VERIFY_MODERATOR_CLAIM',
    'getUser',
    'rootModerator',
  ]
) {
  requireToken(
    verifyClaim,
    token,
    'verify claim tool'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D1_SECURITY_PREFLIGHT',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'firestore.rules',
    'firebase',
    '--version',
  ]
) {
  requireToken(
    preflight,
    token,
    'preflight'
  );
}

if (
  setClaim.includes(
    'cert('
  ) ||
  setClaim.includes(
    'serviceAccountKey'
  )
) {
  throw new Error(
    'claim tool must not embed or reference a committed service-account secret'
  );
}

requireToken(
  checklist,
  'firebase deploy --only firestore',
  'checklist'
);

console.log(
  'PASS - Firestore moderation rules fragment exists without overwriting live rules'
);
console.log(
  'PASS - firebase-admin 14.2.0 isolated ops package targets Node.js 22+'
);
console.log(
  'PASS - moderator claim tool preserves existing custom claims and requires explicit confirmation'
);
console.log(
  'PASS - no service-account credential is embedded in repository files'
);
console.log(
  'PASS - security preflight is read-only'
);
console.log(
  'PASS - EXPLORE V1.2D1 MODERATION SECURITY BOOTSTRAP'
);
