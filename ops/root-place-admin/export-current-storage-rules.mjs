// ROOT_PLACE_V11_EXPORT_CURRENT_STORAGE_RULES

import fs from 'node:fs';
import path from 'node:path';

import {
  applicationDefault,
  initializeApp,
} from 'firebase-admin/app';

import {
  getSecurityRules,
} from 'firebase-admin/security-rules';

function readArg(name) {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);

  if (
    index < 0 ||
    index + 1 >= args.length
  ) {
    return '';
  }

  return String(args[index + 1] ?? '').trim();
}

const projectId = readArg('--project');
const bucket = readArg('--bucket');
const output = readArg('--output');

if (
  !projectId ||
  !bucket ||
  !output
) {
  console.error(
    'Usage: node export-current-storage-rules.mjs --project <projectId> --bucket <bucket> --output <path>',
  );
  process.exit(2);
}

const credentialPath =
  String(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '',
  ).trim();

if (
  credentialPath &&
  !fs.existsSync(credentialPath)
) {
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS points to a missing file.',
  );
}

initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket: bucket,
});

const ruleset =
  await getSecurityRules()
    .getStorageRuleset(bucket);

const sourceFiles =
  Array.isArray(ruleset.source)
    ? ruleset.source
    : [];

if (sourceFiles.length === 0) {
  throw new Error(
    'The live Storage ruleset contains no source files.',
  );
}

let sourceFile = null;

if (sourceFiles.length === 1) {
  sourceFile = sourceFiles[0];
} else {
  const named =
    sourceFiles.filter(
      (item) =>
        String(item?.name ?? '')
          .toLowerCase()
          .endsWith('storage.rules'),
    );

  if (named.length !== 1) {
    throw new Error(
      'The live Storage ruleset has multiple source files and storage.rules could not be selected safely.',
    );
  }

  sourceFile = named[0];
}

const content =
  String(sourceFile?.content ?? '');

if (
  !content.includes(
    'service firebase.storage',
  )
) {
  throw new Error(
    'Selected live Storage rules source does not contain service firebase.storage.',
  );
}

const fullOutput =
  path.resolve(output);

fs.mkdirSync(
  path.dirname(fullOutput),
  { recursive: true },
);

fs.writeFileSync(
  fullOutput,
  content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n'),
  'utf8',
);

const metadata = {
  projectId,
  bucket,
  rulesetName: String(ruleset.name ?? ''),
  createTime:
    ruleset.createTime
      ? new Date(ruleset.createTime).toUTCString()
      : null,
  sourceName: String(sourceFile?.name ?? ''),
  output: fullOutput,
  bytes: Buffer.byteLength(content, 'utf8'),
};

fs.writeFileSync(
  `${fullOutput}.metadata.json`,
  `${JSON.stringify(metadata, null, 2)}\n`,
  'utf8',
);

console.log(
  'PASS - current deployed Storage rules exported',
);

console.log(
  JSON.stringify(metadata, null, 2),
);
