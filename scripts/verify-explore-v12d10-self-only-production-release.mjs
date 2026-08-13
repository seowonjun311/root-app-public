// ROOT_EXPLORE_V12D10_SELF_ONLY_PRODUCTION_RELEASE_VERIFIER

import fs from 'node:fs';
import crypto from 'node:crypto';

const normalizeLf = (
  source,
) =>
  source
    .replace(
      /\r\n/g,
      '\n',
    )
    .replace(
      /\r/g,
      '\n',
    );

const sha = (
  file,
) =>
  crypto
    .createHash(
      'sha256',
    )
    .update(
      Buffer.from(
        normalizeLf(
          fs.readFileSync(
            file,
            'utf8',
          ),
        ),
        'utf8',
      ),
    )
    .digest(
      'hex',
    )
    .toUpperCase();

const EXPECTED =
  'FA578EC3374BF692E4EFAB783511287EFEBCC5D39DB606CD7A3C34C1CB69470F';

for (
  const file of
  [
    'firestore.rules',
    'firebase/firestore-v12d10-self-only-production.rules',
    'firebase/firestore-v12d92-self-only-release-candidate.rules',
  ]
) {
  if (
    !fs.existsSync(
      file,
    )
  ) {
    throw new Error(
      `missing ${file}`,
    );
  }

  const actual =
    sha(
      file,
    );

  if (
    actual !==
      EXPECTED
  ) {
    throw new Error(
      `${file} SHA mismatch: ${actual}`,
    );
  }
}

const rules =
  fs.readFileSync(
    'firestore.rules',
    'utf8',
  );

for (
  const token of
  [
    'match /users/{uid}',
    'rootUserPublicProfiles',
    'rootNicknames',
    'allow list: if false;',
    'nicknameWriteIsAtomicFor',
    'nicknameDeleteIsAtomicFor',
  ]
) {
  if (
    !rules.includes(
      token,
    )
  ) {
    throw new Error(
      `D10 rules missing ${token}`,
    );
  }
}

const d92Report =
  fs.readFileSync(
    'docs/explore-v12d92-private-users-list-query-audit.md',
    'utf8',
  );

if (
  !d92Report.includes(
    'PRIVATE_USERS_LIST_QUERY = 0',
  )
) {
  throw new Error(
    'D9.2 list-query zero proof missing',
  );
}

console.log(
  'PASS - local firestore.rules exactly equals reviewed D10 self-only target',
);
console.log(
  'PASS - D9.2 public-profile and nickname-registry surfaces remain in target',
);
console.log(
  'PASS - PRIVATE_USERS_LIST_QUERY = 0 proof retained',
);
console.log(
  'PASS - D10 readiness is pinned to current D9.2 live/target hashes, not obsolete D8 Stage A',
);
console.log(
  'ACK - physical device diagnostic was explicitly skipped by user request',
);
console.log(
  'PASS - ROOT EXPLORE V1.2D10 SELF-ONLY RELEASE VERIFIER',
);
