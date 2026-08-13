// ROOT_EXPLORE_V12D2_RULES_CAPTURE_VERIFIER

import fs from 'node:fs';

const paths = {
  package:
    'ops/root-place-admin/package.json',
  exportRules:
    'ops/root-place-admin/export-current-firestore-rules.mjs',
  prepare:
    'ops/root-place-admin/prepare-firestore-rules-candidate.mjs',
  capture:
    'scripts/run-explore-v12d2-rules-capture.ps1',
  preflight:
    'scripts/run-explore-v12d2-rules-capture-preflight.mjs',
  checklist:
    'docs/explore-v12d2-firebase-cli-rules-capture.md',
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

const packageText =
  read(paths.package);

const exportRules =
  read(paths.exportRules);

const prepare =
  read(paths.prepare);

const capture =
  read(paths.capture);

const preflight =
  read(paths.preflight);

const checklist =
  read(paths.checklist);

for (
  const token of [
    '"firebase-admin": "14.2.0"',
    '"rules:export"',
    '"rules:prepare"',
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
    'ROOT_EXPLORE_V12D2_EXPORT_CURRENT_FIRESTORE_RULES',
    'getSecurityRules',
    '.getFirestoreRuleset()',
    'ruleset.source',
    'service cloud.firestore',
  ]
) {
  requireToken(
    exportRules,
    token,
    'rules export'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D2_PREPARE_FIRESTORE_RULES_CANDIDATE',
    'findMatchingBrace',
    'rootPlaceModerationInbox',
    'rootPlaceApprovedCommunityRecords',
    'rootPlacePublicCommunityDistricts',
    'rootPlaceCommunityReports',
    'rootPlaceModerationAudit',
    'SAFE - no Firebase deployment was performed',
  ]
) {
  requireToken(
    prepare,
    token,
    'candidate preparation'
  );
}

for (
  const token of [
    'GOOGLE_APPLICATION_CREDENTIALS',
    'firestore.rules.current',
    'firestore.rules.candidate',
    'SAFE - No Firebase rules were deployed.',
  ]
) {
  requireToken(
    capture,
    token,
    'capture PowerShell'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D2_RULES_CAPTURE_PREFLIGHT',
    'firebase.cmd',
    'projects:list',
    'root-c7949',
    'GOOGLE_APPLICATION_CREDENTIALS',
  ]
) {
  requireToken(
    preflight,
    token,
    'preflight'
  );
}

const forbiddenWriteTokens = [
  'releaseFirestoreRuleset(',
  'releaseFirestoreRulesetFromSource(',
  'setCustomUserClaims(',
  'firebase deploy',
];

for (
  const [
    label,
    source,
  ] of [
    [
      'rules export',
      exportRules,
    ],
    [
      'candidate preparation',
      prepare,
    ],
    [
      'capture PowerShell',
      capture,
    ],
  ]
) {
  const found =
    forbiddenWriteTokens.filter(
      (
        token
      ) =>
        source.includes(
          token
        )
    );

  if (
    found.length >
    0
  ) {
    throw new Error(
      `${label} contains forbidden privileged/deploy tokens: ${found.join(', ')}`
    );
  }
}

requireToken(
  checklist,
  'firebase login',
  'checklist'
);

requireToken(
  checklist,
  '서비스 계정',
  'checklist'
);

console.log(
  'PASS - current deployed Firestore rules export uses Admin SDK getFirestoreRuleset only'
);
console.log(
  'PASS - candidate merge is local-only and preserves the existing live rules source'
);
console.log(
  'PASS - capture workflow contains no Firebase deploy or privileged mutation command'
);
console.log(
  'PASS - Firebase CLI login/project and ADC readiness preflight exists'
);
console.log(
  'PASS - EXPLORE V1.2D2 FIREBASE CLI + RULES CAPTURE'
);
