// ROOT_EXPLORE_V12D2_RULES_CAPTURE_PREFLIGHT

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

const firebaseCommand =
  process.platform ===
    'win32'
    ? 'firebase.cmd'
    : 'firebase';

const firebaseVersion =
  spawnSync(
    firebaseCommand,
    [
      '--version',
    ],
    {
      encoding:
        'utf8',
      shell: false,
    }
  );

if (
  firebaseVersion.status ===
  0
) {
  pass(
    `Firebase CLI ${String(firebaseVersion.stdout).trim()} found`
  );
} else {
  warn(
    'Firebase CLI is not available on PATH.'
  );
}

const projectList =
  spawnSync(
    firebaseCommand,
    [
      'projects:list',
      '--json',
    ],
    {
      encoding:
        'utf8',
      shell: false,
    }
  );

if (
  projectList.status ===
  0
) {
  try {
    const parsed =
      JSON.parse(
        String(
          projectList.stdout ??
            '{}'
        )
      );

    const rows =
      Array.isArray(
        parsed?.result
      )
        ? parsed.result
        : Array.isArray(
            parsed
          )
          ? parsed
          : [];

    const ids =
      rows.map(
        (
          item
        ) =>
          String(
            item?.projectId ??
              item?.project_id ??
              ''
          )
      );

    if (
      ids.includes(
        'root-c7949'
      )
    ) {
      pass(
        'Firebase CLI login can access project root-c7949'
      );
    } else {
      warn(
        'Firebase CLI is authenticated, but root-c7949 was not found in projects:list.'
      );
    }
  } catch {
    warn(
      'Firebase projects:list returned output that could not be parsed.'
    );
  }
} else {
  warn(
    'Firebase CLI is not logged in or cannot list projects. Run firebase login.'
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
    fs.existsSync(
      credentialPath
    )
  ) {
    pass(
      'GOOGLE_APPLICATION_CREDENTIALS points to an existing file'
    );
  } else {
    warn(
      'GOOGLE_APPLICATION_CREDENTIALS is set but points to a missing file'
    );
  }
} else {
  warn(
    'GOOGLE_APPLICATION_CREDENTIALS is not set; Admin SDK rules export cannot run yet'
  );
}

const adminPackage =
  'ops/root-place-admin/node_modules/firebase-admin/package.json';

if (
  fs.existsSync(
    adminPackage
  )
) {
  const parsed =
    JSON.parse(
      fs.readFileSync(
        adminPackage,
        'utf8'
      )
    );

  pass(
    `firebase-admin ${parsed.version} installed for ops/root-place-admin`
  );
} else {
  warn(
    'ops/root-place-admin dependencies are not installed yet'
  );
}

for (
  const path of [
    'firebase/root-place-moderation.rules.fragment',
    'ops/root-place-admin/export-current-firestore-rules.mjs',
    'ops/root-place-admin/prepare-firestore-rules-candidate.mjs',
    'scripts/run-explore-v12d2-rules-capture.ps1',
  ]
) {
  if (
    fs.existsSync(
      path
    )
  ) {
    pass(
      `${path} exists`
    );
  } else {
    warn(
      `${path} is missing`
    );
  }
}

pass(
  'V1.2D2 rules capture preflight completed without changing Firebase resources'
);
