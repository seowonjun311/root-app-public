// ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_ADMIN_BACKFILL
// ROOT_EXPLORE_V12D92_LEGACY_COMPATIBLE_CANONICAL_BACKFILL

import fs from 'node:fs';
import path from 'node:path';

import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import {
  getFirestore,
} from 'firebase-admin/firestore';

const args =
  process.argv.slice(
    2,
  );

const getArg = (
  name,
  fallback =
    null,
) => {
  const index =
    args.indexOf(
      name,
    );

  if (
    index < 0 ||
    index + 1 >=
      args.length
  ) {
    return fallback;
  }

  return args[
    index +
    1
  ];
};

const projectId =
  getArg(
    '--project',
    '',
  );

const reportPath =
  getArg(
    '--report',
    '',
  );

const write =
  args.includes(
    '--write',
  );

const confirmation =
  getArg(
    '--confirm',
    '',
  );

if (!projectId) {
  throw new Error(
    '--project is required',
  );
}

if (
  write &&
  confirmation !==
    `${projectId}:rootNicknames`
) {
  throw new Error(
    'Write mode requires exact --confirm <project>:rootNicknames',
  );
}

const normalizeNickname = (
  value,
) =>
  String(
    value ?? '',
  )
    .normalize(
      'NFKC',
    )
    .trim();

const isFirestoreSafeDocumentId = (
  value,
) => {
  const bytes =
    Buffer.byteLength(
      value,
      'utf8',
    );

  return (
    Boolean(
      value,
    ) &&
    bytes <=
      1500 &&
    !value.includes(
      '/',
    ) &&
    value !==
      '.' &&
    value !==
      '..' &&
    !/^__.*__$/u.test(
      value,
    )
  );
};

if (
  getApps().length ===
    0
) {
  initializeApp({
    credential:
      applicationDefault(),
    projectId,
  });
}

const db =
  getFirestore();

const users =
  await db
    .collection(
      'users',
    )
    .get();

const desired =
  new Map();

const unsafeDocumentIds = [];
const collisions = [];
const withoutNickname = [];
let canonicalizedLegacyCount =
  0;

for (
  const document of
  users.docs
) {
  const data =
    document.data() ??
    {};

  const raw =
    data?.rootData
      ?.nickname ??
    data?.nickname ??
    null;

  if (
    raw ===
      null ||
    raw ===
      undefined ||
    String(
      raw,
    ).trim() ===
      ''
  ) {
    withoutNickname.push(
      document.id,
    );
    continue;
  }

  const original =
    String(
      raw,
    );

  const normalized =
    normalizeNickname(
      original,
    );

  if (
    original !==
      normalized
  ) {
    canonicalizedLegacyCount +=
      1;
  }

  if (
    !isFirestoreSafeDocumentId(
      normalized,
    )
  ) {
    unsafeDocumentIds.push({
      uid:
        document.id,
      reason:
        'FIRESTORE_DOCUMENT_ID_UNSAFE',
    });
    continue;
  }

  const existing =
    desired.get(
      normalized,
    );

  if (
    existing &&
    existing.uid !==
      document.id
  ) {
    collisions.push({
      nicknameKey:
        normalized,
      uids:
        [
          existing.uid,
          document.id,
        ],
    });
    continue;
  }

  desired.set(
    normalized,
    {
      version:
        1,
      uid:
        document.id,
      nickname:
        normalized,
      updatedAt:
        new Date()
          .toISOString(),
    },
  );
}

const existingRegistry =
  await db
    .collection(
      'rootNicknames',
    )
    .get();

const conflictingExisting = [];
const extraExisting = [];

for (
  const document of
  existingRegistry.docs
) {
  const expected =
    desired.get(
      document.id,
    );

  const actual =
    document.data() ??
    {};

  if (!expected) {
    extraExisting.push({
      id:
        document.id,
      uid:
        String(
          actual?.uid ??
          '',
        ),
    });
    continue;
  }

  if (
    String(
      actual?.uid ??
      '',
    ) !==
      expected.uid ||
    String(
      actual?.nickname ??
      '',
    ) !==
      expected.nickname ||
    Number(
      actual?.version ??
      0,
    ) !==
      1
  ) {
    conflictingExisting.push({
      id:
        document.id,
      expectedUid:
        expected.uid,
      actualUid:
        String(
          actual?.uid ??
          '',
        ),
    });
  }
}

const blocked =
  unsafeDocumentIds.length >
    0 ||
  collisions.length >
    0 ||
  conflictingExisting.length >
    0 ||
  extraExisting.length >
    0;

const report = {
  projectId,
  mode:
    write
      ? 'WRITE'
      : 'DRY_RUN',
  users:
    users.size,
  desiredRegistryDocuments:
    desired.size,
  usersWithoutNickname:
    withoutNickname.length,
  canonicalizedLegacyCount,
  unsafeDocumentIdCount:
    unsafeDocumentIds.length,
  collisionCount:
    collisions.length,
  existingRegistryDocuments:
    existingRegistry.size,
  conflictingExistingCount:
    conflictingExisting.length,
  extraExistingCount:
    extraExisting.length,
  blocked,
  unsafeDocumentIds,
  collisions,
  conflictingExisting,
  extraExisting,
};

if (reportPath) {
  const resolved =
    path.resolve(
      reportPath,
    );

  fs.mkdirSync(
    path.dirname(
      resolved,
    ),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    resolved,
    JSON.stringify(
      report,
      null,
      2,
    ) +
      '\n',
    'utf8',
  );
}

console.log(
  'ROOT NICKNAME REGISTRY BACKFILL PLAN',
  {
    mode:
      report.mode,
    users:
      report.users,
    desired:
      report
        .desiredRegistryDocuments,
    withoutNickname:
      report
        .usersWithoutNickname,
    canonicalizedLegacy:
      report
        .canonicalizedLegacyCount,
    unsafeDocumentIds:
      report
        .unsafeDocumentIdCount,
    collisions:
      report
        .collisionCount,
    existing:
      report
        .existingRegistryDocuments,
    conflicts:
      report
        .conflictingExistingCount,
    extras:
      report
        .extraExistingCount,
    blocked:
      report.blocked,
  },
);

if (blocked) {
  throw new Error(
    'ROOT_NICKNAME_REGISTRY_BACKFILL_BLOCKED',
  );
}

if (!write) {
  console.log(
    'PASS - legacy-compatible nickname registry backfill dry-run is collision-free and Firestore-ID-safe',
  );
  process.exit(
    0,
  );
}

const entries =
  [
    ...desired.entries(),
  ];

for (
  let index =
    0;
  index <
    entries.length;
  index +=
    400
) {
  const batch =
    db.batch();

  for (
    const [
      nickname,
      record,
    ] of
    entries.slice(
      index,
      index +
        400,
    )
  ) {
    batch.set(
      db
        .collection(
          'rootNicknames',
        )
        .doc(
          nickname,
        ),
      record,
    );
  }

  await batch.commit();
}

console.log(
  `PASS - nickname registry backfill wrote ${entries.length} document(s)`,
);
