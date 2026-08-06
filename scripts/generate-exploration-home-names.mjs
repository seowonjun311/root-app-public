import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const projectRoot = process.cwd();
const catalogPath = path.join(
  projectRoot,
  'store',
  'explorationCatalog.ts'
);
const outputPath = path.join(
  projectRoot,
  'store',
  'explorationHomeNames.ts'
);

const checkOnly =
  process.argv.includes('--check');

if (!fs.existsSync(catalogPath)) {
  throw new Error(
    `탐험 카탈로그를 찾지 못했습니다: ${catalogPath}`
  );
}

const catalogSource =
  fs.readFileSync(
    catalogPath,
    'utf8'
  ).replace(/^\uFEFF/, '');

const transpiled =
  ts.transpileModule(
    catalogSource,
    {
      compilerOptions: {
        module:
          ts.ModuleKind.CommonJS,
        target:
          ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName:
        'explorationCatalog.ts',
      reportDiagnostics: false,
    }
  ).outputText;

const moduleObject = {
  exports: {},
};

const context = {
  module: moduleObject,
  exports: moduleObject.exports,
  require: (specifier) => {
    throw new Error(
      `탐험 카탈로그 생성 중 예상하지 않은 import가 있습니다: ${specifier}`
    );
  },
  console,
};

vm.runInNewContext(
  transpiled,
  context,
  {
    filename:
      'explorationCatalog.generated.cjs',
    timeout: 60_000,
  }
);

const catalogExports =
  moduleObject.exports;

const rewardNames =
  catalogExports
    .EXPLORATION_REWARD_NAMES;

const themeBadgeNames =
  catalogExports
    .EXPLORATION_THEME_BADGE_NAMES;

const isStringRecord = (
  value
) => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Object.entries(value)
    .every(
      ([key, item]) =>
        typeof key === 'string' &&
        typeof item === 'string'
    );
};

if (!isStringRecord(rewardNames)) {
  throw new Error(
    'EXPLORATION_REWARD_NAMES를 생성하지 못했습니다.'
  );
}

if (!isStringRecord(themeBadgeNames)) {
  throw new Error(
    'EXPLORATION_THEME_BADGE_NAMES를 생성하지 못했습니다.'
  );
}

const sortRecord = (
  value
) =>
  Object.fromEntries(
    Object.entries(value)
      .sort(
        ([left], [right]) =>
          left.localeCompare(
            right,
            'en'
          )
      )
  );

const sortedRewardNames =
  sortRecord(rewardNames);

const sortedThemeBadgeNames =
  sortRecord(themeBadgeNames);

const catalogHash =
  crypto
    .createHash('sha256')
    .update(catalogSource)
    .digest('hex');

const generatedSource = `/*
 * 이 파일은 store/explorationCatalog.ts에서 자동 생성됩니다.
 *
 * 홈 화면이 8만 줄이 넘는 전체 탐험 카탈로그를 직접 불러오지 않고,
 * 실제로 필요한 보상 이름과 대표 뱃지 이름만 읽도록 분리한 파일입니다.
 *
 * 직접 수정하지 말고 다음 명령으로 다시 생성하세요.
 * npm run generate:exploration-home-names
 *
 * source-sha256: ${catalogHash}
 */

export const EXPLORATION_REWARD_NAMES:
  Readonly<Record<string, string>> =
  Object.freeze(
${JSON.stringify(
  sortedRewardNames,
  null,
  2
)
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
  );

export const EXPLORATION_THEME_BADGE_NAMES:
  Readonly<Record<string, string>> =
  Object.freeze(
${JSON.stringify(
  sortedThemeBadgeNames,
  null,
  2
)
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
  );

export const EXPLORATION_HOME_NAME_COUNTS =
  Object.freeze({
    rewardNames: ${
      Object.keys(
        sortedRewardNames
      ).length
    },
    themeBadgeNames: ${
      Object.keys(
        sortedThemeBadgeNames
      ).length
    },
  });
`;

if (checkOnly) {
  if (!fs.existsSync(outputPath)) {
    throw new Error(
      `생성된 홈 탐험 이름 파일이 없습니다: ${outputPath}`
    );
  }

  const currentSource =
    fs.readFileSync(
      outputPath,
      'utf8'
    )
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n');

  if (
    currentSource !==
    generatedSource
  ) {
    throw new Error(
      'explorationHomeNames.ts가 현재 explorationCatalog.ts와 일치하지 않습니다.'
    );
  }

  console.log(
    '홈 탐험 이름 파일 최신 상태 확인',
    {
      rewardNameCount:
        Object.keys(
          sortedRewardNames
        ).length,
      themeBadgeNameCount:
        Object.keys(
          sortedThemeBadgeNames
        ).length,
      catalogHash,
    }
  );

  process.exit(0);
}

fs.writeFileSync(
  outputPath,
  generatedSource,
  'utf8'
);

console.log(
  '홈 탐험 이름 파일 생성 완료',
  {
    outputPath,
    rewardNameCount:
      Object.keys(
        sortedRewardNames
      ).length,
    themeBadgeNameCount:
      Object.keys(
        sortedThemeBadgeNames
      ).length,
    catalogHash,
  }
);
