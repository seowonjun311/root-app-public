// ROOT_EXPLORE_V12D6_PUBLIC_PROFILE_BACKFILL_ADMIN

import {
  applicationDefault,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import {
  FieldPath,
  getFirestore,
} from 'firebase-admin/firestore';

const EXPECTED_PROJECT =
  'root-c7949';

const COLLECTION =
  'rootUserPublicProfiles';

const VERSION =
  1;

const args =
  process.argv.slice(
    2,
  );

const valueAfter =
  (
    name,
  ) => {
    const index =
      args.indexOf(
        name,
      );

    if (
      index < 0
    ) {
      return null;
    }

    return args[
      index + 1
    ] ??
      null;
  };

const hasFlag =
  (
    name,
  ) =>
    args.includes(
      name,
    );

const projectId =
  valueAfter(
    '--project',
  );

const write =
  hasFlag(
    '--write',
  );

const confirm =
  valueAfter(
    '--confirm',
  );

const maxDocsRaw =
  valueAfter(
    '--max-docs',
  );

const maxDocs =
  maxDocsRaw
    ? Number(
        maxDocsRaw,
      )
    : 10000;

if (
  !projectId
) {
  throw new Error(
    '--project is required.',
  );
}

if (
  projectId !==
  EXPECTED_PROJECT
) {
  throw new Error(
    `Expected project ${EXPECTED_PROJECT}, got ${projectId}.`,
  );
}

if (
  !Number.isInteger(
    maxDocs,
  ) ||
  maxDocs <=
    0
) {
  throw new Error(
    '--max-docs must be a positive integer.',
  );
}

if (
  write
) {
  const expectedConfirm =
    `${projectId}:${COLLECTION}`;

  if (
    confirm !==
    expectedConfirm
  ) {
    throw new Error(
      `Write mode requires --confirm ${expectedConfirm}`,
    );
  }
}

const asNullableString =
  (
    value,
  ) => {
    if (
      typeof value !==
      'string'
    ) {
      return null;
    }

    const trimmed =
      value.trim();

    return trimmed
      ? trimmed
      : null;
  };

const firstString =
  (
    source,
    keys,
  ) => {
    for (
      const key of
      keys
    ) {
      const value =
        asNullableString(
          source[
            key
          ],
        );

      if (
        value
      ) {
        return value;
      }
    }

    return null;
  };

const projectPublicProfile =
  (
    uid,
    source,
    updatedAt,
  ) => ({
    version:
      VERSION,
    uid,
    displayName:
      firstString(
        source,
        [
          'displayName',
          'name',
        ],
      ),
    nickname:
      firstString(
        source,
        [
          'nickname',
          'nickName',
        ],
      ),
    photoURL:
      firstString(
        source,
        [
          'photoURL',
          'photoUrl',
          'profileImageUrl',
          'profileImageURL',
        ],
      ),
    representativeBadgeId:
      firstString(
        source,
        [
          'representativeBadgeId',
          'selectedBadgeId',
          'mainBadgeId',
        ],
      ),
    updatedAt,
  });

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

let scanned =
  0;

let projected =
  0;

let writable =
  0;

let batches =
  0;

let lastId =
  null;

const pageSize =
  250;

const startedAt =
  new Date()
    .toISOString();

while (
  scanned <
  maxDocs
) {
  let query =
    db
      .collection(
        'users',
      )
      .orderBy(
        FieldPath.documentId(),
      )
      .limit(
        Math.min(
          pageSize,
          maxDocs -
            scanned,
        ),
      );

  if (
    lastId
  ) {
    query =
      query.startAfter(
        lastId,
      );
  }

  const snapshot =
    await query.get();

  if (
    snapshot.empty
  ) {
    break;
  }

  batches +=
    1;

  const pendingWrites = [];

  for (
    const userDoc of
    snapshot.docs
  ) {
    scanned +=
      1;

    lastId =
      userDoc.id;

    const profile =
      projectPublicProfile(
        userDoc.id,
        userDoc.data(),
        startedAt,
      );

    projected +=
      1;

    if (
      write
    ) {
      pendingWrites.push(
        {
          id:
            userDoc.id,
          profile,
        },
      );
    }
  }

  if (
    write &&
    pendingWrites.length >
      0
  ) {
    const batch =
      db.batch();

    for (
      const item of
      pendingWrites
    ) {
      batch.set(
        db
          .collection(
            COLLECTION,
          )
          .doc(
            item.id,
          ),
        item.profile,
        {
          merge: false,
        },
      );

      writable +=
        1;
    }

    await batch.commit();
  }

  if (
    snapshot.size <
    pageSize
  ) {
    break;
  }
}

console.log(
  JSON.stringify(
    {
      projectId,
      mode:
        write
          ? 'WRITE'
          : 'DRY_RUN',
      collection:
        COLLECTION,
      scannedUsers:
        scanned,
      projectedProfiles:
        projected,
      writesCommitted:
        write
          ? writable
          : 0,
      pages:
        batches,
      maxDocs,
      truncated:
        scanned >=
        maxDocs,
      sensitiveFieldValuesPrinted:
        false,
    },
    null,
    2,
  ),
);

if (
  write
) {
  console.log(
    'PASS - confirmed Admin SDK projection backfill write completed.',
  );
}
else {
  console.log(
    'PASS - dry-run only; no Firestore document writes were performed.',
  );
  console.log(
    `NEXT WRITE COMMAND REQUIRES EXPLICIT CONFIRMATION: --write --confirm ${projectId}:${COLLECTION}`,
  );
}
