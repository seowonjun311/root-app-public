// ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_ADMIN_VERIFY
// ROOT_EXPLORE_V12D92_LEGACY_COMPATIBLE_VERIFY

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

if (!projectId) {
  throw new Error(
    '--project is required',
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

const expected =
  new Map();

const unsafe = [];
const collisions = [];
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
    continue;
  }

  const original =
    String(
      raw,
    );

  const nickname =
    normalizeNickname(
      original,
    );

  if (
    original !==
      nickname
  ) {
    canonicalizedLegacyCount +=
      1;
  }

  if (
    !isFirestoreSafeDocumentId(
      nickname,
    )
  ) {
    unsafe.push(
      document.id,
    );
    continue;
  }

  const previous =
    expected.get(
      nickname,
    );

  if (
    previous &&
    previous !==
      document.id
  ) {
    collisions.push(
      nickname,
    );
    continue;
  }

  expected.set(
    nickname,
    document.id,
  );
}

const registry =
  await db
    .collection(
      'rootNicknames',
    )
    .get();

const missing = [];
const mismatched = [];
const extra = [];

const registryMap =
  new Map(
    registry.docs.map(
      (
        document,
      ) => [
        document.id,
        document,
      ],
    ),
  );

for (
  const [
    nickname,
    uid,
  ] of
  expected
) {
  const document =
    registryMap.get(
      nickname,
    );

  if (!document) {
    missing.push(
      nickname,
    );
    continue;
  }

  const data =
    document.data() ??
    {};

  if (
    Number(
      data?.version ??
      0,
    ) !==
      1 ||
    String(
      data?.uid ??
      '',
    ) !==
      uid ||
    String(
      data?.nickname ??
      '',
    ) !==
      nickname
  ) {
    mismatched.push(
      nickname,
    );
  }
}

for (
  const document of
  registry.docs
) {
  if (
    !expected.has(
      document.id,
    )
  ) {
    extra.push(
      document.id,
    );
  }
}

const ok =
  unsafe.length ===
    0 &&
  collisions.length ===
    0 &&
  missing.length ===
    0 &&
  mismatched.length ===
    0 &&
  extra.length ===
    0 &&
  registry.size ===
    expected.size;

const report = {
  projectId,
  users:
    users.size,
  expected:
    expected.size,
  registry:
    registry.size,
  canonicalizedLegacy:
    canonicalizedLegacyCount,
  unsafe:
    unsafe.length,
  collisions:
    collisions.length,
  missing:
    missing.length,
  mismatched:
    mismatched.length,
  extra:
    extra.length,
  ok,
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
  'ROOT NICKNAME REGISTRY VERIFY',
  report,
);

if (!ok) {
  throw new Error(
    'ROOT_NICKNAME_REGISTRY_VERIFY_FAILED',
  );
}

console.log(
  'PASS - rootNicknames exactly matches canonical Firestore-safe private-user nickname identities',
);
