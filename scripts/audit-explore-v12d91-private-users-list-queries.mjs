// ROOT_EXPLORE_V12D91_PRIVATE_USERS_LIST_QUERY_AUDIT
import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'app','components','store','hooks',
  'contexts','services','utils','lib','providers'
].filter((x) => fs.existsSync(x));

const exts =
  new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs']);

const walk = (dir) => {
  const out = [];
  for (
    const entry of
    fs.readdirSync(dir, { withFileTypes: true })
  ) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (
      entry.isFile() &&
      exts.has(path.extname(entry.name).toLowerCase())
    ) {
      out.push(full);
    }
  }
  return out;
};

const files = roots.flatMap(walk);
const lineOf = (s, i) =>
  s.slice(0, i).split('\n').length;

const patterns = [
  [
    'NAMESPACED_USERS_COLLECTION_QUERY',
    /(?:firestore\(\)|[A-Za-z_$][\w$]*)\s*\.\s*collection\s*\(\s*['"`]users['"`]\s*\)[\s\S]{0,650}?\.\s*(?:where|orderBy|limit|startAt|startAfter|endAt|endBefore)\s*\(/g
  ],
  [
    'MODULAR_USERS_GETDOCS_QUERY',
    /getDocs\s*\(\s*(?:query\s*\(\s*)?collection\s*\([\s\S]{0,260}?['"`]users['"`]/g
  ],
  [
    'MODULAR_USERS_ONSNAPSHOT_QUERY',
    /onSnapshot\s*\(\s*(?:query\s*\(\s*)?collection\s*\([\s\S]{0,260}?['"`]users['"`]/g
  ],
  [
    'MODULAR_USERS_QUERY',
    /query\s*\(\s*collection\s*\([\s\S]{0,260}?['"`]users['"`][\s\S]{0,520}?(?:where|orderBy|limit)\s*\(/g
  ],
];

const found = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');

  for (const [type, regex] of patterns) {
    for (const m of source.matchAll(regex)) {
      found.push({
        file: file.replace(/\\/g, '/'),
        line: lineOf(source, m.index),
        type,
      });
    }
  }
}

const unique = [];
const seen = new Set();

for (const item of found) {
  const key =
    `${item.file}:${item.line}:${item.type}`;
  if (!seen.has(key)) {
    seen.add(key);
    unique.push(item);
  }
}

const known =
  unique.filter(
    (x) => x.file === 'app/onboarding.tsx',
  );

const unexpected =
  unique.filter(
    (x) => x.file !== 'app/onboarding.tsx',
  );

const lines = [
  '# ROOT Explore V1.2D9.1 — private users list-query audit',
  '',
  `- Runtime files scanned: ${files.length}`,
  `- Private users collection/list query sites: ${unique.length}`,
  `- Known onboarding nickname migration blockers: ${known.length}`,
  `- Unexpected private users list queries: ${unexpected.length}`,
  '',
];

for (const item of unique) {
  lines.push(
    `- \`${item.file}:${item.line}\` — **${item.type}**`,
  );
}

lines.push(
  '',
  '## Decision',
  '',
);

if (
  known.length === 1 &&
  unexpected.length === 0
) {
  lines.push(
    '- **PASS D9.1:** exactly one known list-query blocker remains: authenticated onboarding nickname duplicate lookup.',
    '- **BLOCKED D10:** migrate that lookup to `rootNicknames/{nickname}` in V1.2D9.2 before self-only release.',
    '- Guest onboarding skips the query because its cloud uid is forced to `null`.',
  );
} else {
  lines.push(
    '- **BLOCKED:** list-query surface is not the expected single onboarding nickname query.',
  );
}

lines.push('');

fs.writeFileSync(
  'docs/explore-v12d91-private-users-list-query-audit.md',
  lines.join('\n'),
  'utf8',
);

console.log(
  `INFO - private users list queries: ${unique.length}`,
);
console.log(
  `INFO - known onboarding blockers: ${known.length}`,
);
console.log(
  `INFO - unexpected queries: ${unexpected.length}`,
);

if (
  known.length !== 1 ||
  unexpected.length !== 0
) {
  throw new Error(
    'D9.1 expected exactly one onboarding list-query blocker and zero unexpected queries',
  );
}

console.log(
  'PASS - exactly one known onboarding nickname list-query blocker remains',
);
