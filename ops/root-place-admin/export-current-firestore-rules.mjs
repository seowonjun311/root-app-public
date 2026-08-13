// ROOT_EXPLORE_V12D2_EXPORT_CURRENT_FIRESTORE_RULES

import fs from 'node:fs';
import path from 'node:path';

import {
  applicationDefault,
  initializeApp,
} from 'firebase-admin/app';

import {
  getSecurityRules,
} from 'firebase-admin/security-rules';

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
    projectId:
      read('--project'),
    output:
      read('--output'),
  };
}

const {
  projectId,
  output,
} = parseArgs();

if (
  !projectId ||
  !output
) {
  console.error(
    'Usage: node export-current-firestore-rules.mjs --project <projectId> --output <path>'
  );
  process.exit(2);
}

const credentialPath =
  String(
    process.env
      .GOOGLE_APPLICATION_CREDENTIALS ??
      ''
  ).trim();

if (
  credentialPath &&
  !fs.existsSync(
    credentialPath
  )
) {
  console.error(
    'GOOGLE_APPLICATION_CREDENTIALS points to a missing file.'
  );
  process.exit(3);
}

initializeApp({
  credential:
    applicationDefault(),
  projectId,
});

const ruleset =
  await getSecurityRules()
    .getFirestoreRuleset();

const sourceFiles =
  Array.isArray(
    ruleset.source
  )
    ? ruleset.source
    : [];

if (
  sourceFiles.length ===
  0
) {
  throw new Error(
    'The live Firestore ruleset contains no source files.'
  );
}

let sourceFile =
  null;

if (
  sourceFiles.length ===
  1
) {
  sourceFile =
    sourceFiles[0];
} else {
  const named =
    sourceFiles.filter(
      (
        item
      ) =>
        String(
          item?.name ??
            ''
        )
          .toLowerCase()
          .endsWith(
            'firestore.rules'
          )
    );

  if (
    named.length ===
    1
  ) {
    sourceFile =
      named[0];
  } else {
    console.error(
      'The live Firestore ruleset has multiple source files and a single firestore.rules source could not be selected safely.'
    );

    console.error(
      JSON.stringify(
        sourceFiles.map(
          (
            item
          ) => ({
            name:
              item.name,
            size:
              Buffer.byteLength(
                String(
                  item.content ??
                    ''
                ),
                'utf8'
              ),
          })
        ),
        null,
        2
      )
    );

    process.exit(4);
  }
}

const content =
  String(
    sourceFile
      ?.content ??
      ''
  );

if (
  !content.includes(
    'service cloud.firestore'
  )
) {
  throw new Error(
    'Selected live rules source does not contain service cloud.firestore.'
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
  content.replace(
    /\r\n/g,
    '\n'
  ),
  'utf8'
);

const metadataPath =
  `${fullOutput}.metadata.json`;

fs.writeFileSync(
  metadataPath,
  JSON.stringify(
    {
      projectId,
      rulesetName:
        ruleset.name,
      createTime:
        ruleset.createTime,
      sourceName:
        sourceFile.name,
      sourceCount:
        sourceFiles.length,
      exportedAt:
        new Date()
          .toISOString(),
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(
  'PASS - current deployed Firestore rules exported'
);

console.log(
  JSON.stringify(
    {
      projectId,
      rulesetName:
        ruleset.name,
      createTime:
        ruleset.createTime,
      sourceName:
        sourceFile.name,
      output:
        fullOutput,
      metadata:
        metadataPath,
      bytes:
        Buffer.byteLength(
          content,
          'utf8'
        ),
    },
    null,
    2
  )
);
