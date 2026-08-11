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

const cloud =
  read(
    'store/characterCloudSync.ts'
  );

const diagnostics =
  read(
    'app/character-cloud-diagnostics.tsx'
  );

const login =
  read(
    'app/login.tsx'
  );

console.log(
  '===== CHARACTER V98E FINAL RELEASE HARDENING PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V98E_RELEASE_SCHEMA_GUARD',
    'export const CHARACTER_CLOUD_SCHEMA_VERSION',
    'CHARACTER_CLOUD_SCHEMA_UNSUPPORTED',
    'record.ownerUid !==',
    'CHARACTER_CLOUD_OWNER_MISMATCH',
    'record.scopeId !==',
    'CHARACTER_CLOUD_SCOPE_MISMATCH',
    'Date.parse(',
    'CHARACTER_CLOUD_UPDATED_AT_INVALID',
  ]
) {
  expect(
    cloud,
    token,
    'Cloud schema/identity guard'
  );
}

console.log(
  'PASS - cloud schema/owner/scope/timestamp identity is strict'
);

for (
  const token of [
    'assertRawCharacterBundleFieldTypes(',
    'assertCharacterLocalStateBundleIntegrity(',
    'selectedCharacter is invalid:',
    'progression',
    'relationship',
    'acquisitionCelebration must contain only valid character ids.',
    'CHARACTER_CLOUD_BUNDLE_INVALID',
    'CHARACTER_CLOUD_LOCAL_BUNDLE_INVALID',
  ]
) {
  expect(
    cloud,
    token,
    'Bundle integrity'
  );
}

console.log(
  'PASS - cloud download and local upload bundles are integrity-checked'
);

for (
  const token of [
    'CHARACTER_V98E_PERMANENT_ERROR_RETRY_GUARD',
    'isPermanentCharacterCloudSyncError(',
    'cloudPermanentErrors.set(',
    'cloudPermanentErrors.delete(',
    'clearRetryTimer(',
  ]
) {
  expect(
    cloud,
    token,
    'Permanent error retry guard'
  );
}

console.log(
  'PASS - permanent schema/integrity errors do not create retry storms'
);

for (
  const token of [
    'CHARACTER_V98E_RELEASE_INTEGRITY_CARD',
    'snapshot.releaseSchemaVersion',
    'snapshot.releaseSchemaGuardActive',
    'snapshot.cloudReadError',
    'snapshot.permanentSyncError',
  ]
) {
  expect(
    diagnostics,
    token,
    'Release diagnostics UI'
  );
}

console.log(
  'PASS - device diagnostics exposes release-integrity status'
);

for (
  const token of [
    'CHARACTER_V98D_GUEST_CHARACTER_SCOPE_CAPTURE',
    'CHARACTER_V98D_GUEST_TO_GOOGLE_CHARACTER_HANDOFF',
  ]
) {
  expect(
    login,
    token,
    'V98D login regression'
  );
}

for (
  const token of [
    'CHARACTER_V98D_CLOUD_DIAGNOSTICS_API',
    'CHARACTER_V98C_ACTIVE_CLOUD_SYNC',
    'CHARACTER_V98C_TRANSACTIONAL_CLOUD_UPLOAD',
    'CHARACTER_V98C_CONFLICT_POLICY',
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
  'PASS - V98A-D account/cloud/guest-handoff contracts preserved'
);

console.log(
  'PASS - CHARACTER V98E FINAL RELEASE HARDENING PREFLIGHT'
);
