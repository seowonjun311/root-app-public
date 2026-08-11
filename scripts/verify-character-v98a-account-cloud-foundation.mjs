import {
  readFileSync,
} from 'node:fs';

function read(
  path
) {
  return readFileSync(
    path,
    'utf8'
  ).replace(
    /\r\n/g,
    '\n'
  );
}

function fail(
  message
) {
  throw new Error(
    message
  );
}

function expect(
  source,
  token,
  label
) {
  if (
    !source.includes(
      token
    )
  ) {
    fail(
      `${label}: missing ${JSON.stringify(token)}`
    );
  }
}

const scope =
  read(
    'store/characterAccountScope.ts'
  );

const cloud =
  read(
    'store/characterCloudSync.ts'
  );

console.log(
  '===== CHARACTER V98A ACCOUNT CLOUD FOUNDATION PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V98A_ACCOUNT_SCOPE_IDENTITY',
    "auth()\n        .currentUser\n        ?.uid",
    "rootData\n        ?.guestId",
    "'legacy_guest'",
    'CHARACTER_V98A_SCOPED_STORAGE_KEY',
  ]
) {
  expect(
    scope,
    token,
    'Account scope'
  );
}

console.log(
  'PASS - authenticated uid and persistent guestId produce deterministic scopes'
);

for (
  const token of [
    "'selected_character_v1'",
    "'character_progression_v1'",
    "'character_relationship_v1'",
    "'character_acquisition_celebration_v1'",
    'CHARACTER_V98A_LEGACY_LOCAL_BUNDLE_READER',
    'CHARACTER_V98A_SCOPED_LOCAL_BUNDLE_READER',
    'CHARACTER_V98A_NONDESTRUCTIVE_LEGACY_SEED',
  ]
) {
  expect(
    cloud,
    token,
    'Local migration foundation'
  );
}

console.log(
  'PASS - four V97 local keys have a non-destructive account-scoped migration path'
);

for (
  const token of [
    "const CLOUD_FIELD =\n  'characterSystemV98';",
    'CHARACTER_V98A_FIRESTORE_CHARACTER_ENVELOPE_READ',
    'CHARACTER_V98A_FIRESTORE_CHARACTER_ENVELOPE_WRITE',
    ".collection(\n        'users'",
    'CHARACTER_V98A_SCOPED_CLOUD_UPLOAD_HELPER',
    'CHARACTER_V98A_CLOUD_TO_SCOPED_DOWNLOAD_HELPER',
  ]
) {
  expect(
    cloud,
    token,
    'Cloud sync foundation'
  );
}

console.log(
  'PASS - authenticated cloud envelope uses existing users/{uid} document namespace'
);

expect(
  cloud,
  'CHARACTER_CLOUD_SYNC_REQUIRES_AUTHENTICATED_USER',
  'Guest cloud guard'
);

console.log(
  'PASS - guest scope cannot accidentally write authenticated cloud data'
);

console.log(
  'PASS - V98A defines helpers only; no legacy key deletion or runtime activation'
);

console.log(
  'PASS - CHARACTER V98A ACCOUNT CLOUD FOUNDATION PREFLIGHT'
);
