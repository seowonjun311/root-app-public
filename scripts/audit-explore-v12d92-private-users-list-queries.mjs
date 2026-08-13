// ROOT_EXPLORE_V12D92_PRIVATE_USERS_LIST_QUERY_ZERO_AUDIT

import fs from 'node:fs';
import path from 'node:path';

const ROOT =
  process.cwd();

const roots = [
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
    item,
  ) =>
    fs.existsSync(
      path.join(
        ROOT,
        item,
      ),
    ),
);

const extensions =
  new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
  ]);

const walk = (
  directory,
) => {
  const output = [];

  for (
    const entry of
    fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      },
    )
  ) {
    const full =
      path.join(
        directory,
        entry.name,
      );

    if (
      entry.isDirectory()
    ) {
      output.push(
        ...walk(
          full,
        ),
      );
      continue;
    }

    if (
      entry.isFile() &&
      extensions.has(
        path.extname(
          entry.name,
        ).toLowerCase(),
      )
    ) {
      output.push(
        full,
      );
    }
  }

  return output;
};

const lineOf = (
  source,
  offset,
) =>
  source
    .slice(
      0,
      offset,
    )
    .split(
      '\n',
    )
    .length;

const files =
  roots.flatMap(
    (
      root,
    ) =>
      walk(
        path.join(
          ROOT,
          root,
        ),
      ),
  );

const findings = [];

const patterns = [
  {
    kind:
      'NAMESPACED_USERS_WHERE',
    regex:
      /(?:firestore\(\)|[A-Za-z_$][\w$]*)\s*\.collection\(\s*['"]users['"]\s*\)[\s\S]{0,1400}?\.where\s*\(/g,
  },
  {
    kind:
      'MODULAR_USERS_QUERY',
    regex:
      /getDocs\s*\(\s*query\s*\(\s*collection\s*\([\s\S]{0,300}?['"]users['"][\s\S]{0,300}?\)[\s\S]{0,1400}?where\s*\(/g,
  },
];

for (
  const file of
  files
) {
  const source =
    fs.readFileSync(
      file,
      'utf8',
    );

  for (
    const pattern of
    patterns
  ) {
    for (
      const match of
      source.matchAll(
        new RegExp(
          pattern.regex.source,
          'g',
        ),
      )
    ) {
      findings.push({
        file:
          path
            .relative(
              ROOT,
              file,
            )
            .replace(
              /\\/g,
              '/',
            ),
        line:
          lineOf(
            source,
            match.index,
          ),
        kind:
          pattern.kind,
      });
    }
  }
}

const unique =
  [
    ...new Map(
      findings.map(
        (
          item,
        ) => [
          `${item.file}:${item.line}:${item.kind}`,
          item,
        ],
      ),
    ).values(),
  ];

const onboarding =
  fs.readFileSync(
    'app/onboarding.tsx',
    'utf8',
  );

if (
  onboarding.includes(
    'NICKNAME DUPLICATE CHECK START',
  ) ||
  onboarding.includes(
    'NICKNAME_CHECK_TIMEOUT',
  ) ||
  /\.collection\(\s*['"]users['"]\s*\)[\s\S]{0,1200}?\.where\s*\(/m.test(
    onboarding,
  )
) {
  unique.push({
    file:
      'app/onboarding.tsx',
    line:
      0,
    kind:
      'KNOWN_ONBOARDING_NICKNAME_LIST_QUERY_REMAINS',
  });
}

const lines = [
  '# ROOT Explore V1.2D9.2 — private /users list-query zero audit',
  '',
  `- Runtime files scanned: ${files.length}`,
  `- PRIVATE_USERS_LIST_QUERY = ${unique.length}`,
  '',
];

if (
  unique.length ===
    0
) {
  lines.push(
    '- **PASS D9.2:** zero private `/users` collection list queries remain.',
    '- Nickname uniqueness now uses exact `rootNicknames/{nickname}` documents.',
    '- **BLOCKED D10:** self-only release still requires physical member/device diagnostics after D9.2.',
  );
}
else {
  lines.push(
    '- **BLOCKED:** private `/users` list query remains.',
    '',
    '## Findings',
  );

  for (
    const item of
    unique
  ) {
    lines.push(
      `- \`${item.file}:${item.line}\` — ${item.kind}`,
    );
  }
}

fs.writeFileSync(
  'docs/explore-v12d92-private-users-list-query-audit.md',
  lines.join(
    '\n',
  ) +
    '\n',
  'utf8',
);

console.log(
  `INFO - PRIVATE_USERS_LIST_QUERY = ${unique.length}`,
);

if (
  unique.length !==
    0
) {
  throw new Error(
    `V1.2D9.2 requires PRIVATE_USERS_LIST_QUERY = 0; found ${unique.length}`,
  );
}

console.log(
  'PASS - zero private /users list queries remain',
);
