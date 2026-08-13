// ROOT_EXPLORE_V12D4_USER_DOC_ACCESS_AUDIT

import fs from 'node:fs';
import path from 'node:path';

const ROOT =
  process.cwd();

const OUTPUT =
  path.join(
    ROOT,
    'docs',
    'explore-v12d4-user-doc-access-audit.md'
  );

const SOURCE_ROOTS = [
  'app',
  'components',
  'store',
  'hooks',
  'contexts',
  'services',
  'utils',
  'lib',
  'providers',
].filter(
  (
    item
  ) =>
    fs.existsSync(
      path.join(
        ROOT,
        item
      )
    )
);

const EXTENSIONS =
  new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
  ]);

const READ_TOKENS = [
  'getDoc(',
  'getDocs(',
  'onSnapshot(',
];

const WRITE_TOKENS = [
  'setDoc(',
  'updateDoc(',
  'deleteDoc(',
  'addDoc(',
];

const USER_PATH_PATTERNS = [
  /['"`]users['"`]/,
  /getUserDocumentRef\s*\(/,
  /collection\s*\([^)]*['"`]users['"`]/,
  /doc\s*\([^)]*['"`]users['"`]/,
];

function walk(
  directory
) {
  const output = [];

  for (
    const entry of
    fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      }
    )
  ) {
    const full =
      path.join(
        directory,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {
      output.push(
        ...walk(
          full
        )
      );
      continue;
    }

    if (
      entry.isFile() &&
      EXTENSIONS.has(
        path.extname(
          entry.name
        ).toLowerCase()
      )
    ) {
      output.push(
        full
      );
    }
  }

  return output;
}

function hasUserPathToken(
  line
) {
  return USER_PATH_PATTERNS.some(
    (
      pattern
    ) =>
      pattern.test(
        line
      )
  );
}

function getNearbyIndexes(
  indexes,
  target,
  distance = 12
) {
  return indexes.filter(
    (
      item
    ) =>
      Math.abs(
        item - target
      ) <=
      distance
  );
}

function sanitize(
  value
) {
  return value
    .replace(
      /\|/g,
      '\\|'
    )
    .trim();
}

const files =
  SOURCE_ROOTS.flatMap(
    (
      root
    ) =>
      walk(
        path.join(
          ROOT,
          root
        )
      )
  );

const findings = [];

for (
  const file of files
) {
  const source =
    fs.readFileSync(
      file,
      'utf8'
    );

  const lines =
    source.split(
      /\r?\n/
    );

  const userIndexes = [];
  const readIndexes = [];
  const writeIndexes = [];

  lines.forEach(
    (
      line,
      index
    ) => {
      if (
        hasUserPathToken(
          line
        )
      ) {
        userIndexes.push(
          index
        );
      }

      if (
        READ_TOKENS.some(
          (
            token
          ) =>
            line.includes(
              token
            )
        )
      ) {
        readIndexes.push(
          index
        );
      }

      if (
        WRITE_TOKENS.some(
          (
            token
          ) =>
            line.includes(
              token
            )
        )
      ) {
        writeIndexes.push(
          index
        );
      }
    }
  );

  if (
    userIndexes.length ===
    0
  ) {
    continue;
  }

  const candidateIndexes =
    new Set();

  for (
    const userIndex of
    userIndexes
  ) {
    for (
      const readIndex of
      getNearbyIndexes(
        readIndexes,
        userIndex
      )
    ) {
      candidateIndexes.add(
        userIndex
      );
      candidateIndexes.add(
        readIndex
      );
    }
  }

  const helperRead =
    /(?:getDoc|getDocs|onSnapshot)\s*\(\s*getUserDocumentRef\s*\(/s
      .test(
        source
      );

  if (
    helperRead
  ) {
    for (
      const index of
      userIndexes
    ) {
      candidateIndexes.add(
        index
      );
    }
  }

  findings.push({
    file:
      path
        .relative(
          ROOT,
          file
        )
        .replace(
          /\\/g,
          '/'
        ),
    userIndexes,
    readIndexes,
    writeIndexes,
    candidateIndexes:
      [
        ...candidateIndexes,
      ].sort(
        (
          a,
          b
        ) =>
          a - b
      ),
    helperRead,
    lines,
  });
}

const readCandidateFiles =
  findings.filter(
    (
      item
    ) =>
      item.candidateIndexes.length >
        0 ||
      item.helperRead
  );

const lines = [];

lines.push(
  '# ROOT Explore V1.2D4 — `/users/{uid}` access dependency audit'
);
lines.push(
  ''
);
lines.push(
  '> Generated automatically from the exact V1.2D4 baseline before any `/users/{uid}` rule tightening.'
);
lines.push(
  ''
);
lines.push(
  '## Summary'
);
lines.push(
  ''
);
lines.push(
  `- Runtime source roots scanned: ${SOURCE_ROOTS.join(', ') || '(none found)'}`
);
lines.push(
  `- Source files scanned: ${files.length}`
);
lines.push(
  `- Files containing a user-document path/helper token: ${findings.length}`
);
lines.push(
  `- Files with a nearby Firestore read candidate: ${readCandidateFiles.length}`
);
lines.push(
  ''
);
lines.push(
  'This is a conservative static inventory, not proof that every candidate performs a cross-user read at runtime.'
);
lines.push(
  'The existing production rule remains unchanged in V1.2D4; tightening is deferred until each candidate is classified.'
);
lines.push(
  ''
);
lines.push(
  '## Candidate files'
);
lines.push(
  ''
);

if (
  readCandidateFiles.length ===
  0
) {
  lines.push(
    '_No nearby user-document read candidates were detected by the static scanner._'
  );
}
else {
  for (
    const finding of
    readCandidateFiles
  ) {
    lines.push(
      `### \`${finding.file}\``
    );
    lines.push(
      ''
    );

    if (
      finding.helperRead
    ) {
      lines.push(
        '- Detected a read call through `getUserDocumentRef(...)`.'
      );
    }

    lines.push(
      `- User path/helper occurrences: ${finding.userIndexes.length}`
    );
    lines.push(
      `- Firestore read-token occurrences: ${finding.readIndexes.length}`
    );
    lines.push(
      ''
    );
    lines.push(
      '| line | code |'
    );
    lines.push(
      '|---:|---|'
    );

    const indexes =
      finding.candidateIndexes.length >
      0
        ? finding.candidateIndexes
        : finding.userIndexes.slice(
            0,
            8
          );

    for (
      const index of
      indexes.slice(
        0,
        24
      )
    ) {
      lines.push(
        `| ${index + 1} | \`${sanitize(finding.lines[index])}\` |`
      );
    }

    if (
      indexes.length >
      24
    ) {
      lines.push(
        ''
      );
      lines.push(
        `_${indexes.length - 24} additional candidate lines omitted from this compact report._`
      );
    }

    lines.push(
      ''
    );
  }
}

lines.push(
  '## Required classification before production tightening'
);
lines.push(
  ''
);
lines.push(
  'For each candidate above, classify it as one of:'
);
lines.push(
  ''
);
lines.push(
  '- self-only private document read;'
);
lines.push(
  '- intentional cross-user public profile read;'
);
lines.push(
  '- crew/ranking/social read that should move to a public projection;'
);
lines.push(
  '- false positive / helper-only reference.'
);
lines.push(
  ''
);
lines.push(
  'V1.2D4 intentionally does **not** change the existing `/users/{uid}` read policy.'
);
lines.push(
  ''
);

fs.mkdirSync(
  path.dirname(
    OUTPUT
  ),
  {
    recursive: true,
  }
);

fs.writeFileSync(
  OUTPUT,
  lines.join(
    '\n'
  ) + '\n',
  'utf8'
);

console.log(
  `PASS - scanned ${files.length} runtime source files`
);
console.log(
  `INFO - ${findings.length} files contain user-document path/helper tokens`
);
console.log(
  `INFO - ${readCandidateFiles.length} files have nearby Firestore read candidates`
);
console.log(
  `PASS - audit report written: ${path.relative(ROOT, OUTPUT).replace(/\\/g, '/')}`
);
