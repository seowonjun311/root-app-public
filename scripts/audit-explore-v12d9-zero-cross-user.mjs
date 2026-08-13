// ROOT_EXPLORE_V12D9_V2_PRECISE_ZERO_CROSS_USER_AUDIT
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT = path.join(
  ROOT,
  'docs',
  'explore-v12d9-zero-cross-user-audit.md',
);

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
].filter((item) => fs.existsSync(path.join(ROOT, item)));

const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const walk = (directory) => {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...walk(full));
    } else if (
      entry.isFile() &&
      extensions.has(path.extname(entry.name).toLowerCase())
    ) {
      output.push(full);
    }
  }
  return output;
};

const files = roots.flatMap((root) => walk(path.join(ROOT, root)));
const normalizePath = (file) => file.replace(/\\/g, '/');
const lineOf = (source, offset) => source.slice(0, offset).split('\n').length;

const findMatching = (source, open, openChar = '(', closeChar = ')') => {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
};

const splitArgs = (source, start, end) => {
  const spans = [];
  let argStart = start;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote = null;
  let escaped = false;

  for (let i = start; i < end; i += 1) {
    const ch = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '(') paren += 1;
    else if (ch === ')') paren -= 1;
    else if (ch === '[') bracket += 1;
    else if (ch === ']') bracket -= 1;
    else if (ch === '{') brace += 1;
    else if (ch === '}') brace -= 1;
    else if (
      ch === ',' &&
      paren === 0 &&
      bracket === 0 &&
      brace === 0
    ) {
      spans.push({ start: argStart, end: i });
      argStart = i + 1;
    }
  }

  spans.push({ start: argStart, end });
  return spans;
};

const parseDocCall = (source, docIndex) => {
  const open = source.indexOf('(', docIndex);
  if (open < 0) return null;

  const close = findMatching(source, open);
  if (close < 0) return null;

  const args = splitArgs(source, open + 1, close);
  if (args.length < 3) return null;

  return {
    collection: source.slice(args[1].start, args[1].end).trim(),
    uid: source.slice(args[2].start, args[2].end).trim(),
  };
};

const resolveRead = (source, readOffset, readToken) => {
  const open = source.indexOf('(', readOffset + readToken.length - 1);
  if (open < 0) return null;
  const close = findMatching(source, open);
  if (close < 0) return null;

  const args = splitArgs(source, open + 1, close);
  if (args.length < 1) return null;

  const first = source.slice(args[0].start, args[0].end).trim();

  const directDocRelative = first.indexOf('doc(');
  if (directDocRelative >= 0) {
    const absoluteDoc = args[0].start + directDocRelative;
    const parsed = parseDocCall(source, absoluteDoc);
    return parsed
      ? { ...parsed, mechanism: 'direct-doc' }
      : null;
  }

  const helper = first.match(
    /getUserDocumentRef\s*\(\s*([\s\S]+?)\s*\)/,
  );
  if (helper) {
    return {
      collection: "'users'",
      uid: helper[1].trim(),
      mechanism: 'getUserDocumentRef',
    };
  }

  if (!/^[A-Za-z_$][\w$]*$/.test(first)) {
    return null;
  }

  const variable = first;
  const escaped = variable.replace(/[$]/g, '\\$&');
  const prefixStart = Math.max(0, readOffset - 12000);
  const prefix = source.slice(prefixStart, readOffset);

  const assignmentRegex = new RegExp(
    `(?:const|let)\\s+${escaped}\\s*=\\s*doc\\s*\\(`,
    'g',
  );
  const assignments = [...prefix.matchAll(assignmentRegex)];

  if (assignments.length === 0) {
    return null;
  }

  const latest = assignments[assignments.length - 1];
  const absoluteAssignment = prefixStart + latest.index;
  const docIndex = source.indexOf('doc', absoluteAssignment);
  const parsed = parseDocCall(source, docIndex);

  return parsed
    ? { ...parsed, mechanism: `ref-variable:${variable}` }
    : null;
};

const isPublicCollection = (collection) =>
  collection.includes('ROOT_USER_PUBLIC_PROFILE_COLLECTION') ||
  /['"`]rootUserPublicProfiles['"`]/.test(collection);

const isPrivateUsers = (collection) =>
  /['"`]users['"`]/.test(collection);

const isDirectSelf = (uid) => {
  const compact = String(uid ?? '').replace(/\s+/g, '');
  return (
    /(?:currentUser|authUser|firebaseUser)\??\.uid/.test(compact) ||
    /firebaseAuth\.currentUser\??\.uid/.test(compact) ||
    /getAuth\([^)]*\)\.currentUser\??\.uid/.test(compact) ||
    /assertOwnRootPlaceCommunityUid\s*\(/.test(compact)
  );
};

const preReadProof = (file, source, readOffset, uid) => {
  const compact = String(uid ?? '').replace(/\s+/g, '');
  const prefix = source.slice(Math.max(0, readOffset - 5000), readOffset);

  if (isDirectSelf(uid)) {
    return 'direct authenticated-user uid or authenticated self-uid assertion';
  }

  if (
    file === 'app/login.tsx' &&
    compact === 'uid' &&
    prefix.includes('ROOT_EXPLORE_V12D8_LOGIN_PRIVATE_USER_SELF_ONLY_GUARD') &&
    prefix.includes('LOGIN_PRIVATE_USER_SELF_ONLY_UID_REQUIRED')
  ) {
    return 'V1.2D8 login runtime Firebase Auth uid equality guard';
  }

  if (
    compact === 'expectedUid' &&
    prefix.includes('ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD') &&
    prefix.includes('activeUidBeforePrivateUserRead') &&
    prefix.includes('currentUser?.uid')
  ) {
    return 'V1.2D9 saved-cafe pre-read Firebase Auth uid equality guard';
  }

  if (
    file === 'store/rootUserPublicProfileSync.ts' &&
    compact === 'normalizedUid' &&
    prefix.includes('currentUid !==') &&
    prefix.includes('normalizedUid')
  ) {
    return 'public-profile private source currentUid/normalizedUid self guard';
  }

  if (
    file === 'store/rootUserPublicProfileSync.ts' &&
    compact === 'requestedUid' &&
    prefix.includes('authUid') &&
    prefix.includes('requestedUid') &&
    prefix.includes('authMatchesRequestedUid')
  ) {
    return 'V1.2D8 device diagnostic authenticated uid equality gate';
  }

  return null;
};

const findings = [];
const publicReads = [];

for (const full of files) {
  const file = normalizePath(path.relative(ROOT, full));
  const source = fs.readFileSync(full, 'utf8');

  for (const readToken of ['getDoc(', 'onSnapshot(', 'transaction.get(']) {
    let cursor = 0;

    while (true) {
      const offset = source.indexOf(readToken, cursor);
      if (offset < 0) break;
      cursor = offset + readToken.length;

      const descriptor = resolveRead(source, offset, readToken);
      if (!descriptor) continue;

      if (isPublicCollection(descriptor.collection)) {
        publicReads.push({
          file,
          line: lineOf(source, offset),
          readToken,
        });
        continue;
      }

      if (!isPrivateUsers(descriptor.collection)) continue;

      const proof = preReadProof(
        file,
        source,
        offset,
        descriptor.uid,
      );

      findings.push({
        file,
        line: lineOf(source, offset),
        readToken,
        uid: descriptor.uid.replace(/\s+/g, ' ').trim(),
        mechanism: descriptor.mechanism,
        status: proof ? 'PROVEN_SELF' : 'UNRESOLVED',
        proof: proof ?? 'no accepted authenticated self-uid pre-read proof',
      });
    }
  }

  const collectionQueryRegex =
    /(?:getDocs|onSnapshot)\s*\(\s*(?:query\s*\(\s*)?collection\s*\([\s\S]{0,450}?['"`]users['"`]/g;

  for (const match of source.matchAll(collectionQueryRegex)) {
    findings.push({
      file,
      line: lineOf(source, match.index),
      readToken: 'collection(users)',
      uid: '<collection-wide>',
      mechanism: 'collection-query',
      status: 'BLOCKED_COLLECTION_QUERY',
      proof: 'collection-wide private users query is incompatible with self-only rules',
    });
  }
}

const deduped = [];
const seen = new Set();

for (const item of findings) {
  const key = [
    item.file,
    item.line,
    item.readToken,
    item.uid,
    item.mechanism,
  ].join('|');

  if (!seen.has(key)) {
    seen.add(key);
    deduped.push(item);
  }
}

const blocked = deduped.filter(
  (item) => item.status !== 'PROVEN_SELF',
);

if (deduped.length < 13) {
  throw new Error(
    `Precise audit found only ${deduped.length} private-user reads; expected at least the 13 private reads implied by the V1 audit after excluding its public-profile false positive.`,
  );
}

if (publicReads.length < 1) {
  throw new Error(
    'Precise audit did not identify the known public-profile projection read.',
  );
}

const output = [
  '# ROOT Explore V1.2D9 V2 — precise zero-cross-user private read audit',
  '',
  '> Fresh collection-aware scan from the V1.2D8 baseline after saved-cafe pre-read hardening.',
  '',
  '## Summary',
  '',
  `- Runtime source files scanned: ${files.length}`,
  `- Private-user Firestore read sites found: ${deduped.length}`,
  `- Proven authenticated self reads: ${deduped.length - blocked.length}`,
  `- Unresolved/blocked private-user reads: ${blocked.length}`,
  `- Public-profile reads excluded from private-user count: ${publicReads.length}`,
  '',
  '## Private-user read sites',
  '',
  '| site | read | uid | result | proof |',
  '|---|---|---|---|---|',
];

for (const item of deduped) {
  output.push(
    `| \`${item.file}:${item.line}\` | \`${item.readToken}\` | \`${item.uid.replace(/\|/g, '\\|')}\` | **${item.status}** | ${item.proof.replace(/\|/g, '\\|')} |`,
  );
}

output.push('', '## Public projection reads', '');

for (const item of publicReads) {
  output.push(
    `- \`${item.file}:${item.line}\` — ${item.readToken} reads the public projection collection and is excluded from private \`/users/{uid}\` dependencies.`,
  );
}

output.push('', '## Release gate', '');

if (blocked.length === 0) {
  output.push(
    '- **PASS:** fresh precise audit found zero unresolved cross-user private-user reads.',
    '- **PASS:** no collection-wide private `users` query was found.',
    '- **PASS:** public-profile reads are collection-aware and are not misclassified as private-user reads.',
    '- Physical-device regression remains mandatory before V1.2D10.',
  );
} else {
  output.push(
    `- **BLOCKED:** ${blocked.length} private-user read site(s) remain unresolved.`,
    '- V1.2D10 must remain blocked.',
  );
}

output.push('');

fs.writeFileSync(OUTPUT, output.join('\n'), 'utf8');

console.log(`PASS - runtime files scanned: ${files.length}`);
console.log(`INFO - private-user Firestore read sites: ${deduped.length}`);
console.log(`INFO - proven self reads: ${deduped.length - blocked.length}`);
console.log(`INFO - unresolved/blocked: ${blocked.length}`);
console.log(`INFO - public-profile reads excluded: ${publicReads.length}`);

for (const item of deduped) {
  console.log(
    `${item.status === 'PROVEN_SELF' ? 'PASS' : 'BLOCK'} - ${item.status} - ${item.file}:${item.line} ${item.readToken} uid=${item.uid} - ${item.proof}`,
  );
}

for (const item of publicReads) {
  console.log(
    `PASS - PUBLIC_PROJECTION_READ - ${item.file}:${item.line} ${item.readToken}`,
  );
}

if (blocked.length > 0) {
  throw new Error(
    `V1.2D9 precise audit blocked by ${blocked.length} unresolved/private collection read site(s).`,
  );
}

console.log('PASS - ZERO UNRESOLVED CROSS-USER PRIVATE /users READS');
