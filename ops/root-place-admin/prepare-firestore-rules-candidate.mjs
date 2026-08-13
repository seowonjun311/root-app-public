// ROOT_EXPLORE_V12D2_PREPARE_FIRESTORE_RULES_CANDIDATE

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const args =
    process.argv.slice(2);

  const read =
    (
      name
    ) => {
      const index =
        args.indexOf(
          name
        );

      if (
        index < 0 ||
        index + 1 >=
          args.length
      ) {
        return '';
      }

      return String(
        args[index + 1] ??
          ''
      ).trim();
    };

  return {
    current:
      read('--current'),
    fragment:
      read('--fragment'),
    output:
      read('--output'),
  };
}

function sha256(
  source
) {
  return crypto
    .createHash(
      'sha256'
    )
    .update(
      source,
      'utf8'
    )
    .digest(
      'hex'
    );
}

function findNextStructuralBrace(
  source,
  startIndex
) {
  let mode =
    'code';

  for (
    let index =
      startIndex;
    index <
      source.length;
    index +=
      1
  ) {
    const char =
      source[index];

    const next =
      source[
        index + 1
      ];

    if (
      mode ===
      'line-comment'
    ) {
      if (
        char ===
        '\n'
      ) {
        mode =
          'code';
      }

      continue;
    }

    if (
      mode ===
      'block-comment'
    ) {
      if (
        char ===
          '*' &&
        next ===
          '/'
      ) {
        mode =
          'code';
        index +=
          1;
      }

      continue;
    }

    if (
      mode ===
      'single-string'
    ) {
      if (
        char ===
          '\\'
      ) {
        index +=
          1;
        continue;
      }

      if (
        char ===
        "'"
      ) {
        mode =
          'code';
      }

      continue;
    }

    if (
      mode ===
      'double-string'
    ) {
      if (
        char ===
          '\\'
      ) {
        index +=
          1;
        continue;
      }

      if (
        char ===
        '"'
      ) {
        mode =
          'code';
      }

      continue;
    }

    if (
      char ===
        '/' &&
      next ===
        '/'
    ) {
      mode =
        'line-comment';
      index +=
        1;
      continue;
    }

    if (
      char ===
        '/' &&
      next ===
        '*'
    ) {
      mode =
        'block-comment';
      index +=
        1;
      continue;
    }

    if (
      char ===
      "'"
    ) {
      mode =
        'single-string';
      continue;
    }

    if (
      char ===
      '"'
    ) {
      mode =
        'double-string';
      continue;
    }

    if (
      char ===
      '{'
    ) {
      return index;
    }
  }

  return -1;
}

function findMatchingBrace(
  source,
  openingIndex
) {
  let depth =
    0;

  let mode =
    'code';

  for (
    let index =
      openingIndex;
    index <
      source.length;
    index +=
      1
  ) {
    const char =
      source[index];

    const next =
      source[
        index + 1
      ];

    if (
      mode ===
      'line-comment'
    ) {
      if (
        char ===
        '\n'
      ) {
        mode =
          'code';
      }

      continue;
    }

    if (
      mode ===
      'block-comment'
    ) {
      if (
        char ===
          '*' &&
        next ===
          '/'
      ) {
        mode =
          'code';
        index +=
          1;
      }

      continue;
    }

    if (
      mode ===
      'single-string'
    ) {
      if (
        char ===
        '\\'
      ) {
        index +=
          1;
        continue;
      }

      if (
        char ===
        "'"
      ) {
        mode =
          'code';
      }

      continue;
    }

    if (
      mode ===
      'double-string'
    ) {
      if (
        char ===
          '\\'
      ) {
        index +=
          1;
        continue;
      }

      if (
        char ===
        '"'
      ) {
        mode =
          'code';
      }

      continue;
    }

    if (
      char ===
        '/' &&
      next ===
        '/'
    ) {
      mode =
        'line-comment';
      index +=
        1;
      continue;
    }

    if (
      char ===
        '/' &&
      next ===
        '*'
    ) {
      mode =
        'block-comment';
      index +=
        1;
      continue;
    }

    if (
      char ===
      "'"
    ) {
      mode =
        'single-string';
      continue;
    }

    if (
      char ===
      '"'
    ) {
      mode =
        'double-string';
      continue;
    }

    if (
      char ===
      '{'
    ) {
      depth +=
        1;
      continue;
    }

    if (
      char ===
      '}'
    ) {
      depth -=
        1;

      if (
        depth ===
        0
      ) {
        return index;
      }

      if (
        depth <
        0
      ) {
        return -1;
      }
    }
  }

  return -1;
}

function indentFragment(
  fragment,
  spaces
) {
  const prefix =
    ' '.repeat(
      spaces
    );

  return fragment
    .replace(
      /\r\n/g,
      '\n'
    )
    .trim()
    .split(
      '\n'
    )
    .map(
      (
        line
      ) =>
        line
          ? prefix +
            line
          : ''
    )
    .join(
      '\n'
    );
}

const {
  current,
  fragment,
  output,
} = parseArgs();

if (
  !current ||
  !fragment ||
  !output
) {
  console.error(
    'Usage: node prepare-firestore-rules-candidate.mjs --current <current.rules> --fragment <fragment> --output <candidate.rules>'
  );
  process.exit(2);
}

const currentSource =
  fs.readFileSync(
    current,
    'utf8'
  )
    .replace(
      /\r\n/g,
      '\n'
    );

const fragmentSource =
  fs.readFileSync(
    fragment,
    'utf8'
  )
    .replace(
      /\r\n/g,
      '\n'
    );

const duplicateTokens = [
  'rootPlaceModerationInbox',
  'rootPlaceApprovedCommunityRecords',
  'rootPlacePublicCommunityDistricts',
  'rootPlaceCommunityReports',
  'rootPlaceModerationAudit',
];

const duplicates =
  duplicateTokens.filter(
    (
      token
    ) =>
      currentSource.includes(
        token
      )
  );

if (
  duplicates.length >
  0
) {
  console.error(
    'The current live rules already contain V1.2D moderation tokens. Automatic candidate merge is blocked to avoid duplicate match blocks.'
  );

  console.error(
    duplicates.join(
      ', '
    )
  );

  process.exit(3);
}

const serviceCount =
  (
    currentSource.match(
      /service\s+cloud\.firestore/g
    ) ??
    []
  ).length;

if (
  serviceCount !==
  1
) {
  throw new Error(
    `Expected exactly one service cloud.firestore block, found ${serviceCount}.`
  );
}

const documentsAnchor =
  /match\s+\/databases\/\{database\}\/documents\s*/g;

const anchorMatches =
  Array.from(
    currentSource.matchAll(
      documentsAnchor
    )
  );

if (
  anchorMatches.length !==
  1
) {
  throw new Error(
    `Expected exactly one match /databases/{database}/documents block, found ${anchorMatches.length}.`
  );
}

const anchor =
  anchorMatches[0];

const anchorEnd =
  Number(
    anchor.index
  ) +
  String(
    anchor[0]
  ).length;

const openingBrace =
  findNextStructuralBrace(
    currentSource,
    anchorEnd
  );

if (
  openingBrace <
  0
) {
  throw new Error(
    'Could not find the opening brace for the Firestore documents match block.'
  );
}

const closingBrace =
  findMatchingBrace(
    currentSource,
    openingBrace
  );

if (
  closingBrace <
  0
) {
  throw new Error(
    'Could not safely locate the closing brace for the Firestore documents match block.'
  );
}

const beforeClose =
  currentSource
    .slice(
      0,
      closingBrace
    )
    .replace(
      /\s+$/g,
      ''
    );

const afterClose =
  currentSource
    .slice(
      closingBrace
    );

const inserted =
  indentFragment(
    fragmentSource,
    4
  );

const candidate =
  `${beforeClose}\n\n` +
  `    // ROOT_EXPLORE_V12D2_MERGED_MODERATION_RULES\n` +
  `${inserted}\n` +
  `${afterClose}`;

for (
  const token of
  duplicateTokens
) {
  const count =
    candidate
      .split(
        token
      ).length -
    1;

  if (
    count !==
    1
  ) {
    throw new Error(
      `Candidate expected exactly one ${token} token, found ${count}.`
    );
  }
}

if (
  !candidate.includes(
    'isRootPlaceModerator'
  )
) {
  throw new Error(
    'Candidate is missing isRootPlaceModerator().'
  );
}

const fullOutput =
  path.resolve(
    output
  );

fs.mkdirSync(
  path.dirname(
    fullOutput
  ),
  {
    recursive: true,
  }
);

fs.writeFileSync(
  fullOutput,
  candidate,
  'utf8'
);

const metadata = {
  generatedAt:
    new Date()
      .toISOString(),
  current:
    path.resolve(
      current
    ),
  fragment:
    path.resolve(
      fragment
    ),
  output:
    fullOutput,
  currentSha256:
    sha256(
      currentSource
    ),
  fragmentSha256:
    sha256(
      fragmentSource
    ),
  candidateSha256:
    sha256(
      candidate
    ),
  currentBytes:
    Buffer.byteLength(
      currentSource,
      'utf8'
    ),
  candidateBytes:
    Buffer.byteLength(
      candidate,
      'utf8'
    ),
};

fs.writeFileSync(
  `${fullOutput}.metadata.json`,
  JSON.stringify(
    metadata,
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(
  'PASS - local Firestore rules candidate prepared'
);

console.log(
  'SAFE - no Firebase deployment was performed'
);

console.log(
  JSON.stringify(
    metadata,
    null,
    2
  )
);
