// ROOT_EXPLORE_V12D7_PUBLIC_PROFILE_BACKFILL_VERIFIER

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

const ALLOWED_KEYS =
  [
    'displayName',
    'nickname',
    'photoURL',
    'representativeBadgeId',
    'uid',
    'updatedAt',
    'version',
  ];

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

    return index >=
      0
      ? args[
          index + 1
        ] ??
          null
      : null;
  };

const projectId =
  valueAfter(
    '--project',
  );

const reportPath =
  valueAfter(
    '--report',
  );

const expectEmpty =
  args.includes(
    '--expect-empty',
  );

if (
  projectId !==
  EXPECTED_PROJECT
) {
  throw new Error(
    `Expected project ${EXPECTED_PROJECT}.`,
  );
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

const expectedPublicFields =
  (
    uid,
    source,
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

const [
  users,
  profiles,
] =
  await Promise.all([
    db
      .collection(
        'users',
      )
      .orderBy(
        FieldPath.documentId(),
      )
      .get(),
    db
      .collection(
        COLLECTION,
      )
      .orderBy(
        FieldPath.documentId(),
      )
      .get(),
  ]);

const report = {
  projectId,
  expectEmpty,
  users:
    users.size,
  profiles:
    profiles.size,
  missingProfiles:
    0,
  extraProfiles:
    0,
  schemaMismatches:
    0,
  valueMismatches:
    0,
  sensitiveFieldValuesPrinted:
    false,
};

if (
  expectEmpty
) {
  if (
    profiles.size !==
    0
  ) {
    throw new Error(
      `Expected empty ${COLLECTION} collection before activation, found ${profiles.size}.`,
    );
  }

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
  console.log(
    'PASS - public-profile projection collection is empty before Stage A activation.',
  );
  process.exit(
    0,
  );
}

const profileById =
  new Map(
    profiles.docs.map(
      (
        snapshot,
      ) => [
        snapshot.id,
        snapshot.data(),
      ],
    ),
  );

const userIds =
  new Set(
    users.docs.map(
      (
        snapshot,
      ) =>
        snapshot.id,
    ),
  );

for (
  const userDoc of
  users.docs
) {
  const actual =
    profileById.get(
      userDoc.id,
    );

  if (
    !actual
  ) {
    report.missingProfiles +=
      1;
    continue;
  }

  const keys =
    Object.keys(
      actual,
    ).sort();

  if (
    JSON.stringify(
      keys,
    ) !==
    JSON.stringify(
      ALLOWED_KEYS,
    )
  ) {
    report.schemaMismatches +=
      1;
  }

  const expected =
    expectedPublicFields(
      userDoc.id,
      userDoc.data(),
    );

  for (
    const key of [
      'uid',
      'displayName',
      'nickname',
      'photoURL',
      'representativeBadgeId',
    ]
  ) {
    if (
      actual[
        key
      ] !==
      expected[
        key
      ]
    ) {
      report.valueMismatches +=
        1;
    }
  }

  if (
    actual.version !==
      1 ||
    typeof actual.updatedAt !==
      'string' ||
    !actual.updatedAt.trim()
  ) {
    report.schemaMismatches +=
      1;
  }
}

for (
  const profileDoc of
  profiles.docs
) {
  if (
    !userIds.has(
      profileDoc.id,
    )
  ) {
    report.extraProfiles +=
      1;
  }
}

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
  report.missingProfiles !==
    0 ||
  report.extraProfiles !==
    0 ||
  report.schemaMismatches !==
    0 ||
  report.valueMismatches !==
    0 ||
  report.profiles !==
    report.users
) {
  throw new Error(
    'Public profile backfill verification failed.',
  );
}

console.log(
  'PASS - every top-level user has exactly one allowlisted public profile projection.',
);
