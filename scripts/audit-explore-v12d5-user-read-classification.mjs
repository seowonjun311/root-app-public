// ROOT_EXPLORE_V12D5_USER_READ_CLASSIFICATION

import fs from 'node:fs';
import path from 'node:path';

const ROOT =
  process.cwd();

const SOURCE_REPORT =
  path.join(
    ROOT,
    'docs',
    'explore-v12d4-user-doc-access-audit.md',
  );

const OUTPUT =
  path.join(
    ROOT,
    'docs',
    'explore-v12d5-user-read-classification.md',
  );

if (
  !fs.existsSync(
    SOURCE_REPORT,
  )
) {
  throw new Error(
    'V1.2D4 user-document audit report is missing.',
  );
}

const prior =
  fs.readFileSync(
    SOURCE_REPORT,
    'utf8',
  );

const candidateFiles =
  [
    ...prior.matchAll(
      /^### `([^`]+)`$/gm,
    ),
  ]
    .map(
      (
        match,
      ) =>
        match[1],
    )
    .filter(
      Boolean,
    );

if (
  candidateFiles.length ===
  0
) {
  throw new Error(
    'No candidate files were parsed from the V1.2D4 audit report.',
  );
}

const READ_TOKENS = [
  'getDoc(',
  'getDocs(',
  'onSnapshot(',
];

const USER_TOKENS = [
  "'users'",
  '"users"',
  '`users`',
  'getUserDocumentRef(',
];

const classifyFile = (
  file,
  source,
) => {
  const lower =
    file.toLowerCase();

  if (
    lower.includes(
      'login',
    ) ||
    lower.includes(
      'auth',
    )
  ) {
    return {
      classification:
        'LIKELY_SELF_AUTH_BOOTSTRAP',
      migration:
        'Keep on private /users/{uid}; verify the requested uid is always the current authenticated uid.',
      confidence:
        'medium',
    };
  }

  if (
    lower.endsWith(
      '/rootmemory.ts',
    ) ||
    lower ===
    'store/rootmemory.ts'
  ) {
    return {
      classification:
        'LIKELY_SELF_ROOT_DOCUMENT',
      migration:
        'Keep private ROOT state on /users/{uid}; only cross-user presentation fields should move to rootUserPublicProfiles.',
      confidence:
        'medium',
    };
  }

  if (
    /(crew|ranking|rank|member|profile|social|friend|leaderboard)/i
      .test(
        file,
      ) ||
    /(memberIds|ownerNickname|ranking|profile|nickname|displayName)/
      .test(
        source,
      )
  ) {
    return {
      classification:
        'PUBLIC_PROJECTION_MIGRATION_CANDIDATE',
      migration:
        'Review the exact fields read from another uid and migrate only presentation-safe fields to rootUserPublicProfiles.',
      confidence:
        'medium',
    };
  }

  return {
    classification:
      'MANUAL_REVIEW_REQUIRED',
    migration:
      'Do not tighten /users/{uid} for this path until the target uid and fields are manually classified.',
    confidence:
      'low',
  };
};

const summarizeLines = (
  source,
) => {
  const lines =
    source.split(
      /\r?\n/,
    );

  const interesting =
    new Set();

  lines.forEach(
    (
      line,
      index,
    ) => {
      const isRead =
        READ_TOKENS.some(
          (
            token,
          ) =>
            line.includes(
              token,
            ),
        );

      const isUser =
        USER_TOKENS.some(
          (
            token,
          ) =>
            line.includes(
              token,
            ),
        );

      if (
        !isRead &&
        !isUser
      ) {
        return;
      }

      for (
        let cursor =
          Math.max(
            0,
            index - 2,
          );
        cursor <=
        Math.min(
          lines.length - 1,
          index + 3,
        );
        cursor +=
        1
      ) {
        interesting.add(
          cursor,
        );
      }
    },
  );

  return [
    ...interesting,
  ]
    .sort(
      (
        a,
        b,
      ) =>
        a - b,
    )
    .slice(
      0,
      36,
    )
    .map(
      (
        index,
      ) => ({
        line:
          index + 1,
        code:
          lines[index]
            .replace(
              /\|/g,
              '\\|',
            )
            .trim(),
      }),
    );
};

const results =
  candidateFiles.map(
    (
      file,
    ) => {
      const full =
        path.join(
          ROOT,
          file,
        );

      if (
        !fs.existsSync(
          full,
        )
      ) {
        return {
          file,
          missing: true,
          classification:
            'MISSING_SOURCE',
          migration:
            'Resolve the missing source before tightening user rules.',
          confidence:
            'none',
          excerpts: [],
        };
      }

      const source =
        fs.readFileSync(
          full,
          'utf8',
        );

      const classification =
        classifyFile(
          file,
          source,
        );

      return {
        file,
        missing: false,
        ...classification,
        excerpts:
          summarizeLines(
            source,
          ),
      };
    },
  );

const counts =
  results.reduce(
    (
      acc,
      item,
    ) => {
      acc[
        item.classification
      ] =
        (
          acc[
            item.classification
          ] ??
          0
        ) +
        1;

      return acc;
    },
    {},
  );

const output = [];

output.push(
  '# ROOT Explore V1.2D5 — user read classification',
);
output.push(
  '',
);
output.push(
  '> This report is heuristic and migration-oriented. It is not proof that a candidate is safe to switch to self-only Firestore reads.',
);
output.push(
  '',
);
output.push(
  '## Summary',
);
output.push(
  '',
);
output.push(
  `- V1.2D4 candidates parsed: ${candidateFiles.length}`,
);

for (
  const [
    key,
    value,
  ] of
  Object.entries(
    counts,
  )
) {
  output.push(
    `- ${key}: ${value}`,
  );
}

output.push(
  '',
);
output.push(
  '## Classification',
);
output.push(
  '',
);

for (
  const item of
  results
) {
  output.push(
    `### \`${item.file}\``,
  );
  output.push(
    '',
  );
  output.push(
    `- Classification: **${item.classification}**`,
  );
  output.push(
    `- Confidence: ${item.confidence}`,
  );
  output.push(
    `- Migration note: ${item.migration}`,
  );
  output.push(
    '',
  );

  if (
    item.excerpts.length >
    0
  ) {
    output.push(
      '| line | nearby user/read code |',
    );
    output.push(
      '|---:|---|',
    );

    for (
      const excerpt of
      item.excerpts
    ) {
      output.push(
        `| ${excerpt.line} | \`${excerpt.code}\` |`,
      );
    }

    output.push(
      '',
    );
  }
}

output.push(
  '## V1.2D5 decision',
);
output.push(
  '',
);
output.push(
  '- Do not deploy the self-only `/users/{uid}` target yet.',
);
output.push(
  '- Stage A adds a separate `rootUserPublicProfiles/{uid}` projection while preserving the current signed-in cross-user `/users/{uid}` read.',
);
output.push(
  '- The target rules demonstrate the final self-only private user rule and are emulator-tested only.',
);
output.push(
  '- Runtime reads must be migrated candidate-by-candidate before the target is eligible for production deploy.',
);
output.push(
  '',
);

fs.writeFileSync(
  OUTPUT,
  output.join(
    '\n',
  ) + '\n',
  'utf8',
);

console.log(
  `PASS - parsed ${candidateFiles.length} V1.2D4 user-read candidates`,
);

for (
  const item of
  results
) {
  console.log(
    `INFO - ${item.classification} - ${item.file}`,
  );
}

console.log(
  `PASS - classification report written: ${path.relative(ROOT, OUTPUT).replace(/\\/g, '/')}`,
);
