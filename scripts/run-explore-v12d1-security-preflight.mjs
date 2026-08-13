// ROOT_EXPLORE_V12D1_SECURITY_PREFLIGHT

import fs from 'node:fs';

import {
  spawnSync,
} from 'node:child_process';

function pass(
  message
) {
  console.log(
    `PASS - ${message}`
  );
}

function warn(
  message
) {
  console.log(
    `WARN - ${message}`
  );
}

function info(
  message
) {
  console.log(
    `INFO - ${message}`
  );
}

function exists(
  path
) {
  return fs.existsSync(
    path
  );
}

const major =
  Number(
    process.versions
      .node
      .split('.')[0]
  );

if (
  major >=
  22
) {
  pass(
    `Node.js ${process.versions.node} supports firebase-admin 14.x`
  );
} else {
  warn(
    `Node.js ${process.versions.node} is below the Node.js 22+ target used by the moderation admin tool`
  );
}

const cli =
  spawnSync(
    'firebase',
    [
      '--version',
    ],
    {
      encoding:
        'utf8',
      shell:
        process.platform ===
        'win32',
    }
  );

if (
  cli.status ===
  0
) {
  pass(
    `Firebase CLI ${String(cli.stdout).trim()} found`
  );
} else {
  warn(
    'Firebase CLI command was not found. Install/update firebase-tools before rules deployment.'
  );
}

const configPaths = [
  'firebase.json',
  '.firebaserc',
  'firestore.rules',
];

for (
  const path of
  configPaths
) {
  if (
    exists(
      path
    )
  ) {
    pass(
      `${path} exists`
    );
  } else {
    warn(
      `${path} does not exist in the repository root`
    );
  }
}

const candidateGoogleServices = [
  'google-services.json',
  'android/app/google-services.json',
];

const projectIds =
  new Set();

for (
  const path of
  candidateGoogleServices
) {
  if (
    !exists(
      path
    )
  ) {
    continue;
  }

  try {
    const parsed =
      JSON.parse(
        fs.readFileSync(
          path,
          'utf8'
        )
      );

    const projectId =
      String(
        parsed
          ?.project_info
          ?.project_id ??
          ''
      ).trim();

    if (
      projectId
    ) {
      projectIds.add(
        projectId
      );
      info(
        `${path} project_id = ${projectId}`
      );
    }
  } catch {
    warn(
      `${path} could not be parsed`
    );
  }
}

if (
  projectIds.size ===
  1
) {
  pass(
    `one Firebase project_id detected: ${Array.from(projectIds)[0]}`
  );
} else if (
  projectIds.size >
  1
) {
  warn(
    `multiple Firebase project IDs detected: ${Array.from(projectIds).join(', ')}`
  );
} else {
  warn(
    'No Firebase project_id was detected from google-services.json files.'
  );
}

const credentialPath =
  String(
    process.env
      .GOOGLE_APPLICATION_CREDENTIALS ??
      ''
  ).trim();

if (
  credentialPath
) {
  if (
    exists(
      credentialPath
    )
  ) {
    pass(
      'GOOGLE_APPLICATION_CREDENTIALS points to an existing file'
    );
  } else {
    warn(
      'GOOGLE_APPLICATION_CREDENTIALS is set but the file does not exist'
    );
  }
} else {
  warn(
    'GOOGLE_APPLICATION_CREDENTIALS is not set'
  );
}

if (
  exists(
    'firestore.rules'
  )
) {
  const currentRules =
    fs.readFileSync(
      'firestore.rules',
      'utf8'
    );

  const requiredTokens = [
    'rootPlaceModerationInbox',
    'rootPlaceApprovedCommunityRecords',
    'rootPlacePublicCommunityDistricts',
    'rootPlaceCommunityReports',
    'rootPlaceModerationAudit',
    'rootModerator',
  ];

  const missing =
    requiredTokens.filter(
      (
        token
      ) =>
        !currentRules.includes(
          token
        )
    );

  if (
    missing.length ===
    0
  ) {
    pass(
      'firestore.rules already appears to contain the V1.2D moderation contracts'
    );
  } else {
    warn(
      `firestore.rules still needs V1.2D merge tokens: ${missing.join(', ')}`
    );
  }
}

pass(
  'V1.2D1 preflight completed without changing Firebase resources'
);

console.log('');
console.log(
  'NEXT - Merge firebase/root-place-moderation.rules.fragment into the real firestore.rules only after reviewing the current rules.'
);
console.log(
  'NEXT - Install ops/root-place-admin dependencies and set rootModerator using a service-account/ADC credential.'
);
console.log(
  'NEXT - Deploy Firestore rules only after the merged rules pass review.'
);
