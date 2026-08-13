// ROOT_EXPLORE_V12D6_PUBLIC_PROFILE_BACKFILL_ADMIN
// ROOT_EXPLORE_V12D7_ATOMIC_CONFIRMED_BACKFILL

import fs from 'node:fs';
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

const MAX_ATOMIC_USERS =
  200;

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

const reportPath =
  valueAfter(
    '--report',
  );

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

const asRecord =
  (
    value,
  ) =>
    value &&
    typeof value ===
      'object' &&
    !Array.isArray(
      value,
    )
      ? value
      : {};

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
    sources,
    keys,
  ) => {
    for (
      const source of
      sources
    ) {
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
    }

    return null;
  };

const projectPublicProfile =
  (
    uid,
    source,
    updatedAt,
  ) => {
    const rootData =
      asRecord(
        source.rootData,
      );

    const sources =
      [
        source,
        rootData,
      ];

    return {
      version:
        VERSION,
      uid,
      displayName:
        firstString(
          sources,
          [
            'displayName',
            'name',
          ],
        ),
      nickname:
        firstString(
          sources,
          [
            'nickname',
            'nickName',
          ],
        ),
      photoURL:
        firstString(
          sources,
          [
            'photoURL',
            'photoUrl',
            'profileImageUrl',
            'profileImageURL',
          ],
        ),
      representativeBadgeId:
        firstString(
          sources,
          [
            'representativeBadgeId',
            'selectedBadgeId',
            'mainBadgeId',
            'badgeMainBadgeId',
          ],
        ),
      updatedAt,
    };
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

const userSnapshot =
  await db
    .collection(
      'users',
    )
    .orderBy(
      FieldPath.documentId(),
    )
    .limit(
      MAX_ATOMIC_USERS +
        1,
    )
    .get();

if (
  userSnapshot.size >
  MAX_ATOMIC_USERS
) {
  throw new Error(
    `Atomic V1.2D7 backfill supports at most ${MAX_ATOMIC_USERS} users. Found more than that; no writes performed.`,
  );
}

const existingProjectionSnapshot =
  await db
    .collection(
      COLLECTION,
    )
    .limit(
      1,
    )
    .get();

if (
  write &&
  !existingProjectionSnapshot.empty
) {
  throw new Error(
    'Confirmed V1.2D7 backfill requires an empty rootUserPublicProfiles collection to avoid overwriting pre-existing projection data.',
  );
}

const activatedAt =
  new Date()
    .toISOString();

const projected =
  userSnapshot.docs.map(
    (
      userDoc,
    ) => ({
      id:
        userDoc.id,
      profile:
        projectPublicProfile(
          userDoc.id,
          userDoc.data(),
          activatedAt,
        ),
    }),
  );

if (
  write &&
  projected.length >
    0
) {
  const batch =
    db.batch();

  for (
    const item of
    projected
  ) {
    batch.create(
      db
        .collection(
          COLLECTION,
        )
        .doc(
          item.id,
        ),
      item.profile,
    );
  }

  await batch.commit();
}

const report = {
  projectId,
  mode:
    write
      ? 'WRITE'
      : 'DRY_RUN',
  collection:
    COLLECTION,
  sourceUsers:
    userSnapshot.size,
  projectedProfiles:
    projected.length,
  writesCommitted:
    write
      ? projected.length
      : 0,
  existingProjectionCollectionWasEmpty:
    existingProjectionSnapshot.empty,
  atomicSingleBatch:
    true,
  maxAtomicUsers:
    MAX_ATOMIC_USERS,
  sensitiveFieldValuesPrinted:
    false,
};

if (
  reportPath
) {
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      report,
      null,
      2,
    ) + '\n',
    'utf8',
  );
}

console.log(
  JSON.stringify(
    report,
    null,
    2,
  ),
);

if (
  write
) {
  console.log(
    'PASS - confirmed Admin SDK public-profile backfill committed atomically.',
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
