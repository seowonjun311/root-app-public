import fs from 'node:fs';
import path from 'node:path';
import {
  spawnSync,
} from 'node:child_process';

const projectRoot = process.cwd();

const scriptsDirectory =
  path.join(
    projectRoot,
    'scripts'
  );

const strictMode =
  process.argv.includes(
    '--strict'
  );

const generatorDefinitions = [
  {
    id: 'camping',
    label: '캠핑·피크닉',
    exactNames: [
      'generate-seoul-camping-facilities.mjs',
      'generate-seoul-camping.mjs',
      'build-seoul-camping-facilities.mjs',
    ],
    pattern:
      /^(generate|build|create).*seoul.*camp/i,
    expectedFiles: [
      'store/seoulCampingFacilities.ts',
      'store/seoulCampingSelectors.ts',
    ],
  },
  {
    id: 'sports',
    label: '체육시설',
    exactNames: [
      'generate-seoul-sports-facilities.mjs',
      'generate-seoul-sports.mjs',
      'build-seoul-sports-facilities.mjs',
    ],
    pattern:
      /^(generate|build|create).*seoul.*sport/i,
    expectedFiles: [
      'store/seoulSportsFacilities.ts',
      'store/seoulSportsSelectors.ts',
    ],
  },
  {
    id: 'space',
    label: '공간대관',
    exactNames: [
      'generate-seoul-space-facilities.mjs',
      'generate-seoul-space.mjs',
      'build-seoul-space-facilities.mjs',
    ],
    pattern:
      /^(generate|build|create).*seoul.*(space|institution)/i,
    expectedFiles: [
      'store/seoulSpaceFacilities.ts',
      'store/seoulSpaceSelectors.ts',
    ],
  },
  {
    id: 'education',
    label: '교육·체험',
    exactNames: [
      'generate-seoul-education-programs.mjs',
      'generate-seoul-education.mjs',
    ],
    pattern:
      /^(generate|build|create).*seoul.*education/i,
    expectedFiles: [
      'store/seoulEducationPrograms.ts',
      'store/seoulEducationSelectors.ts',
    ],
  },
];

function runCommand(
  command,
  argumentsList,
  label
) {
  console.log('');
  console.log(
    `===== ${label} =====`
  );

  const result =
    spawnSync(
      command,
      argumentsList,
      {
        cwd:
          projectRoot,

        env:
          process.env,

        stdio:
          'inherit',

        shell: false,
      }
    );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} 실패: 종료 코드 ${result.status}`
    );
  }
}

function getScriptFiles() {
  if (
    !fs.existsSync(
      scriptsDirectory
    )
  ) {
    return [];
  }

  return fs
    .readdirSync(
      scriptsDirectory,
      {
        withFileTypes: true,
      }
    )
    .filter(
      (item) =>
        item.isFile()
    )
    .map(
      (item) =>
        item.name
    )
    .filter(
      (name) =>
        /\.(mjs|js|cjs)$/i.test(
          name
        )
    )
    .filter(
      (name) =>
        !name.includes(
          'update-seoul-reservations'
        ) &&
        !name.includes(
          'fetch-seoul-reservation-api'
        )
    );
}

function findGenerator(
  definition,
  scriptFiles
) {
  for (
    const exactName of
      definition.exactNames
  ) {
    if (
      scriptFiles.includes(
        exactName
      )
    ) {
      return exactName;
    }
  }

  return (
    scriptFiles.find(
      (name) =>
        definition.pattern.test(
          name
        )
    ) ?? null
  );
}

function getFileResult(
  relativePath
) {
  const absolutePath =
    path.join(
      projectRoot,
      relativePath
    );

  if (
    !fs.existsSync(
      absolutePath
    )
  ) {
    return {
      relativePath,
      exists: false,
      size: 0,
    };
  }

  const stat =
    fs.statSync(
      absolutePath
    );

  return {
    relativePath,
    exists: true,
    size:
      stat.size,
  };
}

function writeSummary(
  value
) {
  const filePath =
    path.join(
      projectRoot,
      'tmp',
      'seoul-reservation-update-summary.json'
    );

  fs.mkdirSync(
    path.dirname(filePath),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    'utf8'
  );
}

function main() {
  runCommand(
    process.execPath,
    [
      path.join(
        scriptsDirectory,
        'fetch-seoul-reservation-api.mjs'
      ),
    ],
    '서울 예약 API 통합 수집'
  );

  const scriptFiles =
    getScriptFiles();

  const generatorResults = [];
  const missingGenerators = [];

  console.log('');
  console.log(
    '===== 생성 스크립트 탐색 ====='
  );

  for (
    const definition of
      generatorDefinitions
  ) {
    const generatorName =
      findGenerator(
        definition,
        scriptFiles
      );

    if (!generatorName) {
      console.log(
        `[없음] ${definition.label}`
      );

      missingGenerators.push(
        definition.id
      );

      generatorResults.push({
        id:
          definition.id,

        label:
          definition.label,

        generator:
          null,

        status:
          'missing',
      });

      continue;
    }

    console.log(
      `[발견] ${definition.label}: ${generatorName}`
    );

    runCommand(
      process.execPath,
      [
        path.join(
          scriptsDirectory,
          generatorName
        ),
      ],
      `${definition.label} 데이터 생성`
    );

    generatorResults.push({
      id:
        definition.id,

      label:
        definition.label,

      generator:
        generatorName,

      status:
        'completed',
    });
  }

  const outputFiles =
    generatorDefinitions
      .flatMap(
        (definition) =>
          definition.expectedFiles
      )
      .map(
        getFileResult
      );

  console.log('');
  console.log(
    '===== 앱 데이터 파일 확인 ====='
  );

  for (
    const outputFile of
      outputFiles
  ) {
    console.log(
      outputFile.exists
        ? `[정상] ${outputFile.relativePath} / ${outputFile.size} bytes`
        : `[없음] ${outputFile.relativePath}`
    );
  }

  const typescriptCliPath =
    path.join(
      projectRoot,
      'node_modules',
      'typescript',
      'bin',
      'tsc'
    );

  if (
    !fs.existsSync(
      typescriptCliPath
    )
  ) {
    throw new Error(
      `TypeScript 실행 파일을 찾지 못했습니다: ${typescriptCliPath}`
    );
  }

  runCommand(
    process.execPath,
    [
      typescriptCliPath,
      '--noEmit',
      '--pretty',
      'false',
    ],
    'TypeScript 검사'
  );

  const summary = {
    generatedAt:
      new Date().toISOString(),

    strictMode,

    generatorResults,

    missingGenerators,

    outputFiles,
  };

  writeSummary(summary);

  console.log('');
  console.log(
    '===== 서울 예약 통합 갱신 결과 ====='
  );

  if (
    missingGenerators.length === 0
  ) {
    console.log(
      '수집·생성·TypeScript 검사가 모두 완료됐습니다.'
    );
  } else {
    console.log(
      `추가로 만들어야 할 생성기: ${missingGenerators.join(
        ', '
      )}`
    );
  }

  console.log(
    '요약: tmp/seoul-reservation-update-summary.json'
  );

  if (
    strictMode &&
    missingGenerators.length > 0
  ) {
    throw new Error(
      '자동 갱신에 필요한 생성 스크립트가 일부 없습니다.'
    );
  }
}

try {
  main();
} catch (error) {
  console.error('');
  console.error(
    '서울 예약 통합 갱신 실패'
  );

  console.error(
    error instanceof Error
      ? error.stack ??
          error.message
      : error
  );

  process.exitCode = 1;
}