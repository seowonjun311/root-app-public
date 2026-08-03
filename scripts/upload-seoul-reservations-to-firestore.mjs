import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const argumentsSet =
  new Set(
    process.argv.slice(2)
  );

const dryRun =
  argumentsSet.has(
    '--dry-run'
  );

const authCheck =
  argumentsSet.has(
    '--auth-check'
  );

if (
  dryRun &&
  authCheck
) {
  throw new Error(
    '--dry-run과 --auth-check는 동시에 사용할 수 없습니다.'
  );
}

const expectedProjectId =
  String(
    process.env.FIREBASE_PROJECT_ID ??
    'root-c7949'
  ).trim();

const documentSafeLimitBytes =
  900_000;

const writeBatchSize =
  400;

const syncVersion =
  new Date().toISOString();

const datasets = [
  {
    key: 'camping',
    label: '캠핑·피크닉',
    collection:
      'publicReservationCamping',
    file:
      'store/seoulCampingFacilities.ts',
    exportName:
      'SEOUL_CAMPING_FACILITIES',
    itemCountConstant:
      'SEOUL_CAMPING_FACILITY_COUNT',
    nestedCountConstant:
      'SEOUL_CAMPING_RESERVATION_COUNT',
    nestedField:
      'reservations',
  },
  {
    key: 'sports',
    label: '체육시설',
    collection:
      'publicReservationSports',
    file:
      'store/seoulSportsFacilities.ts',
    exportName:
      'SEOUL_SPORTS_FACILITIES',
    itemCountConstant:
      'SEOUL_SPORTS_FACILITY_COUNT',
    nestedCountConstant:
      'SEOUL_SPORTS_RESERVATION_COUNT',
    nestedField:
      'reservations',
  },
  {
    key: 'spaces',
    label: '공간대관',
    collection:
      'publicReservationSpaces',
    file:
      'store/seoulSpaceFacilities.ts',
    exportName:
      'SEOUL_SPACE_FACILITIES',
    itemCountConstant:
      'SEOUL_SPACE_FACILITY_COUNT',
    nestedCountConstant:
      'SEOUL_SPACE_RESERVATION_COUNT',
    nestedField:
      'reservations',
  },
  {
    key: 'education',
    label: '교육·체험',
    collection:
      'publicReservationEducation',
    file:
      'store/seoulEducationPrograms.ts',
    exportName:
      'SEOUL_EDUCATION_PLACES',
    itemCountConstant:
      'SEOUL_EDUCATION_PLACE_COUNT',
    nestedCountConstant:
      'SEOUL_EDUCATION_PROGRAM_COUNT',
    nestedField:
      'programs',
  },
];

function escapeRegExp(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

function readSource(
  relativePath
) {
  const filePath =
    path.join(
      projectRoot,
      relativePath
    );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `필수 데이터 파일을 찾지 못했습니다: ${filePath}`
    );
  }

  return fs
    .readFileSync(
      filePath,
      'utf8'
    )
    .replace(/^\uFEFF/, '');
}

function findJsonArrayEnd(
  source,
  startIndex
) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let index = startIndex;
    index < source.length;
    index += 1
  ) {
    const character =
      source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '[') {
      depth += 1;
      continue;
    }

    if (character === ']') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractArray(
  source,
  exportName
) {
  const marker =
    `export const ${exportName}`;

  const markerIndex =
    source.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error(
      `${exportName} 선언을 찾지 못했습니다.`
    );
  }

  const equalsIndex =
    source.indexOf(
      '=',
      markerIndex +
        marker.length
    );

  if (equalsIndex < 0) {
    throw new Error(
      `${exportName}의 등호를 찾지 못했습니다.`
    );
  }

  const arrayStart =
    source.indexOf(
      '[',
      equalsIndex
    );

  if (arrayStart < 0) {
    throw new Error(
      `${exportName} 배열 시작점을 찾지 못했습니다.`
    );
  }

  const arrayEnd =
    findJsonArrayEnd(
      source,
      arrayStart
    );

  if (arrayEnd < 0) {
    throw new Error(
      `${exportName} 배열 끝을 찾지 못했습니다.`
    );
  }

  const value =
    JSON.parse(
      source.slice(
        arrayStart,
        arrayEnd + 1
      )
    );

  if (!Array.isArray(value)) {
    throw new Error(
      `${exportName} 데이터가 배열이 아닙니다.`
    );
  }

  return value;
}

function extractNumberConstant(
  source,
  constantName
) {
  const pattern =
    new RegExp(
      `export\\s+const\\s+${escapeRegExp(
        constantName
      )}\\s*=\\s*(\\d+)`
    );

  const matched =
    source.match(pattern);

  if (!matched) {
    throw new Error(
      `${constantName} 상수를 찾지 못했습니다.`
    );
  }

  return Number(matched[1]);
}

function getDocumentId(
  item,
  dataset
) {
  const id =
    String(
      item?.id ?? ''
    ).trim();

  if (!id) {
    throw new Error(
      `${dataset.label} 데이터에 id가 없는 항목이 있습니다.`
    );
  }

  if (id.includes('/')) {
    throw new Error(
      `${dataset.label} 문서 ID에 슬래시가 있습니다: ${id}`
    );
  }

  return id;
}

function prepareDataset(
  dataset
) {
  const source =
    readSource(
      dataset.file
    );

  const items =
    extractArray(
      source,
      dataset.exportName
    );

  const declaredItemCount =
    extractNumberConstant(
      source,
      dataset.itemCountConstant
    );

  const declaredNestedCount =
    extractNumberConstant(
      source,
      dataset.nestedCountConstant
    );

  if (
    items.length !==
    declaredItemCount
  ) {
    throw new Error(
      [
        `${dataset.label} 시설 개수가 일치하지 않습니다.`,
        `배열=${items.length}`,
        `상수=${declaredItemCount}`,
      ].join(' ')
    );
  }

  const ids =
    new Set();

  const documents = [];

  let actualNestedCount = 0;
  let totalJsonBytes = 0;

  for (const item of items) {
    const id =
      getDocumentId(
        item,
        dataset
      );

    if (ids.has(id)) {
      throw new Error(
        `${dataset.label} 문서 ID가 중복되었습니다: ${id}`
      );
    }

    ids.add(id);

    const nestedItems =
      item?.[
        dataset.nestedField
      ];

    if (
      !Array.isArray(
        nestedItems
      )
    ) {
      throw new Error(
        [
          `${dataset.label} 항목의`,
          `${dataset.nestedField}`,
          `값이 배열이 아닙니다: ${id}`,
        ].join(' ')
      );
    }

    actualNestedCount +=
      nestedItems.length;

    const data = {
      ...item,

      _sync: {
        source:
          'seoulPublicReservation',
        dataset:
          dataset.key,
        version:
          syncVersion,
      },
    };

    const jsonBytes =
      Buffer.byteLength(
        JSON.stringify(data),
        'utf8'
      );

    if (
      jsonBytes >
      documentSafeLimitBytes
    ) {
      throw new Error(
        [
          `${dataset.label} 문서가 안전 크기를 초과했습니다.`,
          `id=${id}`,
          `크기=${jsonBytes} bytes`,
          `한도=${documentSafeLimitBytes} bytes`,
        ].join(' ')
      );
    }

    totalJsonBytes +=
      jsonBytes;

    documents.push({
      id,
      data,
      jsonBytes,
      nestedCount:
        nestedItems.length,
    });
  }

  if (
    actualNestedCount !==
    declaredNestedCount
  ) {
    throw new Error(
      [
        `${dataset.label} 예약상품 개수가 일치하지 않습니다.`,
        `실제=${actualNestedCount}`,
        `상수=${declaredNestedCount}`,
      ].join(' ')
    );
  }

  const largestDocuments =
    [...documents]
      .sort(
        (first, second) =>
          second.jsonBytes -
          first.jsonBytes
      )
      .slice(0, 5)
      .map(
        (document) => ({
          id:
            document.id,
          jsonBytes:
            document.jsonBytes,
          nestedCount:
            document.nestedCount,
          name:
            String(
              document.data?.name ??
              document.data?.title ??
              document.data?.placeName ??
              ''
            ),
        })
      );

  return {
    ...dataset,
    declaredItemCount,
    declaredNestedCount,
    actualNestedCount,
    totalJsonBytes,
    largestDocuments,
    documents,
  };
}

function writeDryRunSummary(
  preparedDatasets
) {
  const outputPath =
    path.join(
      projectRoot,
      'tmp',
      'firestore-seoul-reservations-dry-run.json'
    );

  const summary = {
    checkedAt:
      new Date().toISOString(),

    projectId:
      expectedProjectId,

    documentSafeLimitBytes,

    writeBatchSize,

    totalDocumentCount:
      preparedDatasets.reduce(
        (
          total,
          dataset
        ) =>
          total +
          dataset.documents.length,
        0
      ),

    totalNestedItemCount:
      preparedDatasets.reduce(
        (
          total,
          dataset
        ) =>
          total +
          dataset.actualNestedCount,
        0
      ),

    totalJsonBytes:
      preparedDatasets.reduce(
        (
          total,
          dataset
        ) =>
          total +
          dataset.totalJsonBytes,
        0
      ),

    datasets:
      preparedDatasets.map(
        (dataset) => ({
          key:
            dataset.key,
          label:
            dataset.label,
          collection:
            dataset.collection,
          documentCount:
            dataset.documents.length,
          nestedItemCount:
            dataset.actualNestedCount,
          totalJsonBytes:
            dataset.totalJsonBytes,
          largestDocuments:
            dataset.largestDocuments,
        })
      ),
  };

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      summary,
      null,
      2
    )}\n`,
    'utf8'
  );

  return {
    outputPath,
    summary,
  };
}

function readServiceAccount() {
  const rawJson =
    String(
      process.env
        .FIREBASE_SERVICE_ACCOUNT_JSON ??
      ''
    ).trim();

  const rawBase64 =
    String(
      process.env
        .FIREBASE_SERVICE_ACCOUNT_BASE64 ??
      ''
    ).trim();

  let source = '';

  if (rawJson) {
    source = rawJson;
  } else if (rawBase64) {
    source =
      Buffer
        .from(
          rawBase64,
          'base64'
        )
        .toString('utf8');
  } else {
    throw new Error(
      [
        'Firebase 서비스 계정 인증정보가 없습니다.',
        'FIREBASE_SERVICE_ACCOUNT_JSON 또는',
        'FIREBASE_SERVICE_ACCOUNT_BASE64를 설정하세요.',
      ].join(' ')
    );
  }

  const serviceAccount =
    JSON.parse(
      source.replace(
        /^\uFEFF/,
        ''
      )
    );

  if (
    serviceAccount.project_id !==
    expectedProjectId
  ) {
    throw new Error(
      [
        'Firebase 프로젝트 ID가 일치하지 않습니다.',
        `예상=${expectedProjectId}`,
        `인증정보=${serviceAccount.project_id ?? '없음'}`,
      ].join(' ')
    );
  }

  return serviceAccount;
}

function splitIntoChunks(
  values,
  chunkSize
) {
  const chunks = [];

  for (
    let index = 0;
    index < values.length;
    index += chunkSize
  ) {
    chunks.push(
      values.slice(
        index,
        index + chunkSize
      )
    );
  }

  return chunks;
}

async function uploadDataset(
  database,
  dataset
) {
  const collection =
    database.collection(
      dataset.collection
    );

  for (
    const chunk of
      splitIntoChunks(
        dataset.documents,
        writeBatchSize
      )
  ) {
    const batch =
      database.batch();

    for (
      const document of
        chunk
    ) {
      batch.set(
        collection.doc(
          document.id
        ),
        document.data
      );
    }

    await batch.commit();
  }

  const currentIds =
    new Set(
      dataset.documents.map(
        (document) =>
          document.id
      )
    );

  const existingSnapshot =
    await collection.get();

  const staleReferences =
    existingSnapshot.docs
      .filter(
        (document) =>
          !currentIds.has(
            document.id
          )
      )
      .map(
        (document) =>
          document.ref
      );

  for (
    const chunk of
      splitIntoChunks(
        staleReferences,
        writeBatchSize
      )
  ) {
    const batch =
      database.batch();

    for (
      const reference of
        chunk
    ) {
      batch.delete(reference);
    }

    await batch.commit();
  }

  return {
    written:
      dataset.documents.length,
    deleted:
      staleReferences.length,
  };
}

async function main() {
  const preparedDatasets =
    datasets.map(
      prepareDataset
    );

  const {
    outputPath,
    summary,
  } =
    writeDryRunSummary(
      preparedDatasets
    );

  console.log('');
  console.log(
    '===== Firestore 예약 데이터 검사 ====='
  );

  console.log(
    `Firebase Project ID: ${expectedProjectId}`
  );

  console.log(
    `문서 안전 한도: ${documentSafeLimitBytes} bytes`
  );

  console.log(
    `배치 크기: ${writeBatchSize}개`
  );

  for (
    const dataset of
      preparedDatasets
  ) {
    console.log('');
    console.log(
      `${dataset.label}`
    );

    console.log(
      `  컬렉션: ${dataset.collection}`
    );

    console.log(
      `  문서: ${dataset.documents.length}개`
    );

    console.log(
      `  예약상품: ${dataset.actualNestedCount}개`
    );

    console.log(
      `  전체 JSON 크기: ${dataset.totalJsonBytes} bytes`
    );

    const largest =
      dataset.largestDocuments[0];

    console.log(
      `  최대 문서: ${largest?.jsonBytes ?? 0} bytes`
    );

    console.log(
      `  최대 문서 ID: ${largest?.id ?? '없음'}`
    );
  }

  console.log('');
  console.log(
    `전체 문서: ${summary.totalDocumentCount}개`
  );

  console.log(
    `전체 예약상품: ${summary.totalNestedItemCount}개`
  );

  console.log(
    `전체 JSON 크기: ${summary.totalJsonBytes} bytes`
  );

  console.log(
    `검사 파일: ${path.relative(
      projectRoot,
      outputPath
    )}`
  );

  if (dryRun) {
    console.log('');
    console.log(
      'DRY RUN 완료: Firestore에는 아무 데이터도 쓰지 않았습니다.'
    );

    return;
  }

  const serviceAccount =
    readServiceAccount();

  const {
    cert,
    getApps,
    initializeApp,
  } =
    await import(
      'firebase-admin/app'
    );

  const {
    getFirestore,
  } =
    await import(
      'firebase-admin/firestore'
    );

  const application =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential:
            cert(
              serviceAccount
            ),
          projectId:
            expectedProjectId,
        });

  const database =
    getFirestore(
      application
    );

  if (authCheck) {
    await database
      .collection(
        'publicReservationMeta'
      )
      .doc('seoul')
      .get();

    console.log('');
    console.log(
      '===== Firebase 인증 확인 완료 ====='
    );

    console.log(
      `Firebase Project ID: ${expectedProjectId}`
    );

    console.log(
      'Firestore 읽기 권한: 정상'
    );

    console.log(
      'Firestore에는 데이터를 쓰지 않았습니다.'
    );

    return;
  }
  const uploadResults = [];

  for (
    const dataset of
      preparedDatasets
  ) {
    console.log('');
    console.log(
      `${dataset.label} 업로드 중...`
    );

    const result =
      await uploadDataset(
        database,
        dataset
      );

    uploadResults.push({
      key:
        dataset.key,
      collection:
        dataset.collection,
      ...result,
    });

    console.log(
      `  저장 ${result.written}개 / 삭제 ${result.deleted}개`
    );
  }

  await database
    .collection(
      'publicReservationMeta'
    )
    .doc('seoul')
    .set({
      schemaVersion: 1,
      source:
        'seoulPublicReservation',
      projectId:
        expectedProjectId,
      version:
        syncVersion,
      updatedAt:
        syncVersion,

      counts: Object.fromEntries(
        preparedDatasets.map(
          (dataset) => [
            dataset.key,
            {
              documents:
                dataset.documents.length,
              items:
                dataset.actualNestedCount,
            },
          ]
        )
      ),
    });

  console.log('');
  console.log(
    '===== Firestore 업로드 완료 ====='
  );

  console.log(
    JSON.stringify(
      uploadResults,
      null,
      2
    )
  );
}

main().catch(
  (error) => {
    console.error('');
    console.error(
      'Firestore 예약 데이터 처리 실패'
    );

    console.error(
      error instanceof Error
        ? error.stack ??
            error.message
        : error
    );

    process.exitCode = 1;
  }
);