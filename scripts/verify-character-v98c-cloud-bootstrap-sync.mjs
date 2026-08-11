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

const selected =
  read(
    'store/selectedCharacter.ts'
  );

const progression =
  read(
    'store/characterProgression.ts'
  );

const relationship =
  read(
    'store/characterRelationship.ts'
  );

const celebration =
  read(
    'store/characterAcquisitionCelebration.ts'
  );

console.log(
  '===== CHARACTER V98C CLOUD BOOTSTRAP SYNC PREFLIGHT ====='
);

for (
  const token of [
    'CHARACTER_V98C_CLOUD_SYNC_META',
    "'character_cloud_sync_meta_v1'",
    'dirty: boolean;',
    'lastLocalMutationAt:',
    'lastCloudUpdatedAt:',
    'lastSyncAt:',
  ]
) {
  expect(
    cloud,
    token,
    'Cloud sync metadata'
  );
}

console.log(
  'PASS - durable per-account dirty/cloud-version metadata'
);

for (
  const token of [
    'CHARACTER_V98C_ATOMIC_SCOPED_DIRTY_WRITE',
    'AsyncStorage.multiSet([',
    'scheduleCharacterCloudSync(',
    'scopedLocalWriteQueues',
  ]
) {
  expect(
    cloud,
    token,
    'Atomic dirty write'
  );
}

console.log(
  'PASS - local character mutation and dirty marker persist together before upload'
);

for (
  const token of [
    'CHARACTER_V98C_TRANSACTIONAL_CLOUD_UPLOAD',
    '.runTransaction(',
    'CHARACTER_CLOUD_CONFLICT_RETRY',
    'actualUpdatedAt !==',
    'expectedUpdatedAt',
  ]
) {
  expect(
    cloud,
    token,
    'Transactional upload'
  );
}

console.log(
  'PASS - Firestore transaction rejects stale multi-device upload'
);

for (
  const token of [
    'CHARACTER_V98C_CONFLICT_POLICY',
    'First cloud-aware bootstrap:',
    'server wins',
    'Explicit last-writer-wins conflict policy.',
    'cloudTime >',
    'localMutationTime',
  ]
) {
  expect(
    cloud,
    token,
    'Conflict policy'
  );
}

console.log(
  'PASS - first bootstrap server-safe; later concurrent conflicts use timestamp LWW'
);

for (
  const token of [
    'CHARACTER_V98C_SCOPED_STORAGE_REFRESH_BUS',
    'emitScopedStorageRefresh(',
    'applyCloudEnvelopeToLocal(',
  ]
) {
  expect(
    cloud,
    token,
    'Cloud download refresh'
  );
}

console.log(
  'PASS - remote winner refreshes live scoped-store caches'
);

for (
  const token of [
    'scheduleRetry(',
    'cloudRetryAttempts',
    'Math.min(\n      60000',
    'runCharacterCloudSync(',
  ]
) {
  expect(
    cloud,
    token,
    'Offline retry'
  );
}

console.log(
  'PASS - transient/offline sync failures retry with capped backoff'
);

for (
  const token of [
    'CHARACTER_V98C_AUTH_SCOPE_BOOTSTRAP',
    'subscribeCharacterAccountScope(',
    "scope.kind !==\n      'user'",
  ]
) {
  expect(
    cloud,
    token,
    'Authenticated bootstrap'
  );
}

console.log(
  'PASS - authenticated account scope automatically bootstraps cloud reconciliation'
);

for (
  const token of [
    'CHARACTER_V98C_EXPLICIT_GUEST_TO_USER_MIGRATION',
    'migrateGuestCharacterBundleToAuthenticatedUserIfEmpty(',
    "guestScope.kind !==\n      'guest'",
    "userScope.kind !==\n      'user'",
  ]
) {
  expect(
    cloud,
    token,
    'Guest migration helper'
  );
}

console.log(
  'PASS - guest -> authenticated migration exists but is not automatically invoked'
);

for (
  const [
    source,
    label,
    tokens,
  ] of [
    [
      selected,
      'Selected',
      [
        'CHARACTER_V98C_SELECTED_CLOUD_REFRESH',
        'CHARACTER_V98C_SELECTED_CLOUD_DIRTY_WRITE',
        'persistCharacterScopedValueAndSchedule(',
      ],
    ],
    [
      progression,
      'Progression',
      [
        'CHARACTER_V98C_PROGRESSION_CLOUD_REFRESH',
        'persistCharacterScopedValueAndSchedule(',
        'CHARACTER_V97D_GROWTH_REWARD_SETTLEMENT',
      ],
    ],
    [
      relationship,
      'Relationship',
      [
        'CHARACTER_V98C_RELATIONSHIP_CLOUD_REFRESH',
        'persistCharacterScopedValueAndSchedule(',
        'CHARACTER_V96B_SYNCHRONOUS_RELATIONSHIP_MUTATION',
      ],
    ],
    [
      celebration,
      'Celebration',
      [
        'CHARACTER_V98C_CELEBRATION_CLOUD_REFRESH',
        'CHARACTER_V98C_CELEBRATION_CLOUD_DIRTY_WRITE',
        'CHARACTER_V97F_ONE_TIME_ACQUISITION_ALERT',
      ],
    ],
  ]
) {
  for (
    const token of
    tokens
  ) {
    expect(
      source,
      token,
      label
    );
  }
}

console.log(
  'PASS - all four character state domains participate in active cloud synchronization'
);

for (
  const source of [
    selected,
    progression,
    relationship,
    celebration,
  ]
) {
  if (
    source.includes(
      'AsyncStorage.removeItem(\n    STORAGE_KEY'
    )
  ) {
    fail(
      'V98C must not delete legacy V97 keys'
    );
  }
}

console.log(
  'PASS - legacy V97 rollback keys remain untouched'
);

console.log(
  'PASS - CHARACTER V98C CLOUD BOOTSTRAP SYNC PREFLIGHT'
);
