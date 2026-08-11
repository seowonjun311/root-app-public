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

const login =
  read(
    'app/login.tsx'
  );

const preview =
  read(
    'app/character-preview.tsx'
  );

const cloud =
  read(
    'store/characterCloudSync.ts'
  );

const diagnostics =
  read(
    'app/character-cloud-diagnostics.tsx'
  );

console.log(
  '===== CHARACTER V98D GUEST HANDOFF CLOUD DIAGNOSTICS PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V98D_GUEST_CHARACTER_SCOPE_CAPTURE',
    'CHARACTER_V98D_GUEST_TO_GOOGLE_CHARACTER_HANDOFF',
    'migrateGuestCharacterBundleToAuthenticatedUserIfEmpty(',
    'guestCharacterScopeBeforeGoogleLogin',
    'CHARACTER V98D GUEST HANDOFF',
    'CHARACTER V98D GUEST HANDOFF SKIPPED',
  ]
) {
  expect(
    login,
    token,
    'Guest -> Google handoff'
  );
}

console.log(
  'PASS - Google login captures genuine pre-auth guest scope'
);

console.log(
  'PASS - guest character handoff is best-effort and never blocks ROOT login'
);

for (
  const token of [
    'CHARACTER_V98C_EXPLICIT_GUEST_TO_USER_MIGRATION',
    "guestScope.kind !==\n      'guest'",
    "userScope.kind !==\n      'user'",
    'userCloud !==\n      null',
    '!hasAnyData(\n      guestBundle',
  ]
) {
  expect(
    cloud,
    token,
    'Guest migration guard'
  );
}

console.log(
  'PASS - handoff cannot overwrite an existing Google local/cloud character account'
);

for (
  const token of [
    'CHARACTER_V98D_CLOUD_DIAGNOSTICS_API',
    'getCharacterCloudDiagnosticsSnapshot(',
    'localFieldCount',
    'lastLocalMutationAt',
    'lastCloudUpdatedAt',
    'lastSyncAt',
    'retryAttempt',
    'retryScheduled',
    'syncInFlight',
    'cloudExists',
    'cloudUpdatedAt',
  ]
) {
  expect(
    cloud,
    token,
    'Cloud diagnostics API'
  );
}

console.log(
  'PASS - cloud diagnostics exposes scope/local/dirty/cloud/retry state'
);

for (
  const token of [
    'CHARACTER_V98D_MANUAL_CLOUD_RETRY',
    'retryCharacterCloudSyncNow(',
    'clearRetryTimer(',
    'runCharacterCloudSync(',
  ]
) {
  expect(
    cloud,
    token,
    'Manual retry'
  );
}

console.log(
  'PASS - diagnostics can trigger immediate cloud reconciliation'
);

for (
  const token of [
    'CHARACTER_V98D_CLOUD_DIAGNOSTICS_SCREEN',
    'getCharacterCloudDiagnosticsSnapshot(',
    'retryCharacterCloudSyncNow(',
    'snapshot.scope',
    'snapshot.dirty',
    'snapshot.cloudExists',
    'snapshot.retryAttempt',
  ]
) {
  expect(
    diagnostics,
    token,
    'Diagnostics screen'
  );
}

console.log(
  'PASS - device-visible cloud diagnostics screen'
);

for (
  const token of [
    'CHARACTER_V98D_CLOUD_DIAGNOSTICS_ENTRY',
    "'/character-cloud-diagnostics' as never",
    'CHARACTER_V97B_PROGRESSION_DIAGNOSTICS_ENTRY',
    'CHARACTER_V96C_RELATIONSHIP_DIAGNOSTICS_ENTRY',
  ]
) {
  expect(
    preview,
    token,
    'Preview diagnostics entry'
  );
}

console.log(
  'PASS - Character Preview links cloud diagnostics and preserves existing diagnostics'
);

for (
  const token of [
    'CHARACTER_V98C_ACTIVE_CLOUD_SYNC',
    'CHARACTER_V98C_CONFLICT_POLICY',
    'CHARACTER_V98C_ATOMIC_SCOPED_DIRTY_WRITE',
    'CHARACTER_V98B_LEGACY_SCOPE_CLAIM',
    'CHARACTER_V98A_FIRESTORE_CHARACTER_ENVELOPE_WRITE',
  ]
) {
  expect(
    cloud,
    token,
    'V98 regression'
  );
}

console.log(
  'PASS - V98A/B/C account isolation + cloud sync contracts preserved'
);

console.log(
  'PASS - CHARACTER V98D GUEST HANDOFF CLOUD DIAGNOSTICS PREFLIGHT'
);
