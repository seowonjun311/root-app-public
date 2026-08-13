// ROOT_EXPLORE_V12D6_CROSS_USER_USERDOC_AUDIT

import fs from 'node:fs';
import path from 'node:path';

const ROOT =
  process.cwd();

const OUTPUT =
  path.join(
    ROOT,
    'docs',
    'explore-v12d6-userdoc-migration-audit.md',
  );

const ROOTS =
  [
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

const USER_TOKENS = [
  "'users'",
  '"users"',
  '`users`',
  'getUserDocumentRef(',
];

const SELF_SIGNALS = [
  'currentUser.uid',
  'currentUser?.uid',
  'firebaseAuth.currentUser',
  'getAuth().currentUser',
  'auth().currentUser',
  'currentUid',
];

const PUBLIC_SIGNALS = [
  'nickname',
  'displayName',
  'photoURL',
  'photoUrl',
  'profileImage',
  'badge',
  'ranking',
  'member',
  'crew',
  'leader',
];

const walk =
  (
    directory,
  ) => {
    const output = [];

    for (
      const entry of
      fs.readdirSync(
        directory,
        {
          withFileTypes:
            true,
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
        EXTENSIONS.has(
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

const files =
  ROOTS.flatMap(
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

for (
  const full of
  files
) {
  const source =
    fs.readFileSync(
      full,
      'utf8',
    );

  if (
    !USER_TOKENS.some(
      (
        token,
      ) =>
        source.includes(
          token,
        ),
    )
  ) {
    continue;
  }

  const lines =
    source.split(
      /\r?\n/,
    );

  for (
    let index =
      0;
    index <
    lines.length;
    index +=
    1
  ) {
    if (
      !READ_TOKENS.some(
        (
          token,
        ) =>
          lines[
            index
          ].includes(
            token,
          ),
      )
    ) {
      continue;
    }

    const start =
      Math.max(
        0,
        index - 10,
      );

    const end =
      Math.min(
        lines.length,
        index + 14,
      );

    const context =
      lines
        .slice(
          start,
          end,
        )
        .join(
          '\n',
        );

    if (
      !USER_TOKENS.some(
        (
          token,
        ) =>
          context.includes(
            token,
          ),
      )
    ) {
      continue;
    }

    const hasSelfSignal =
      SELF_SIGNALS.some(
        (
          token,
        ) =>
          context.includes(
            token,
          ),
      );

    const hasPublicSignal =
      PUBLIC_SIGNALS.some(
        (
          token,
        ) =>
          context.toLowerCase()
            .includes(
              token.toLowerCase(),
            ),
      );

    const classification =
      hasSelfSignal
        ? 'LIKELY_SELF'
        : hasPublicSignal
          ? 'POSSIBLE_PUBLIC_PRESENTATION'
          : 'MANUAL_UID_FLOW_REVIEW';

    findings.push({
      file:
        path
          .relative(
            ROOT,
            full,
          )
          .replace(
            /\\/g,
            '/',
          ),
      readLine:
        index + 1,
      classification,
      context:
        lines
          .slice(
            Math.max(
              0,
              index - 3,
            ),
            Math.min(
              lines.length,
              index + 6,
            ),
          )
          .map(
            (
              line,
              offset,
            ) => ({
              line:
                Math.max(
                  0,
                  index - 3,
                ) +
                offset +
                1,
              code:
                line
                  .replace(
                    /\|/g,
                    '\\|',
                  )
                  .trim(),
            }),
          ),
    });
  }
}

const counts =
  findings.reduce(
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
  '# ROOT Explore V1.2D6 — cross-user `/users/{uid}` migration audit',
);
output.push(
  '',
);
output.push(
  '> Conservative static audit. A classification is not proof of runtime uid ownership.',
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
  `- Runtime files scanned: ${files.length}`,
);
output.push(
  `- User-document read sites found: ${findings.length}`,
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
  '## Migration rule',
);
output.push(
  '',
);
output.push(
  '- LIKELY_SELF stays on private `/users/{uid}`.',
);
output.push(
  '- POSSIBLE_PUBLIC_PRESENTATION must be moved to `rootUserPublicProfiles/{uid}` only after Stage A is live and the projection has been backfilled.',
);
output.push(
  '- MANUAL_UID_FLOW_REVIEW blocks the self-only Rules release until the uid source is proven.',
);
output.push(
  '',
);

for (
  const item of
  findings
) {
  output.push(
    `### \`${item.file}:${item.readLine}\``,
  );
  output.push(
    '',
  );
  output.push(
    `- Classification: **${item.classification}**`,
  );
  output.push(
    '',
  );
  output.push(
    '| line | code |',
  );
  output.push(
    '|---:|---|',
  );

  for (
    const contextLine of
    item.context
  ) {
    output.push(
      `| ${contextLine.line} | \`${contextLine.code}\` |`,
    );
  }

  output.push(
    '',
  );
}

output.push(
  '## V1.2D6 activation decision',
);
output.push(
  '',
);
output.push(
  '- Client projection sync adapter is prepared but intentionally not wired.',
);
output.push(
  '- Admin backfill tool is prepared and installer executes DRY_RUN only.',
);
output.push(
  '- Stage A has not been production-deployed, so client projection writes would currently be denied.',
);
output.push(
  '- Next activation phase must deploy Stage A first, run confirmed backfill, then enable dual-write/read migration.',
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
  `PASS - scanned ${files.length} runtime source files`,
);
console.log(
  `INFO - discovered ${findings.length} user-document read sites`,
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
  console.log(
    `INFO - ${key} = ${value}`,
  );
}

console.log(
  `PASS - migration audit written: ${path.relative(ROOT, OUTPUT).replace(/\\/g, '/')}`,
);
