import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = process.cwd();
const tmpDirectory = path.join(
  projectRoot,
  'tmp'
);

const chunkSize = 1000;
const baseUrl =
  'http://openapi.seoul.go.kr:8088';

const services = [
  {
    id: 'institution',
    serviceName:
      'ListPublicReservationInstitution',
    outputFiles: [
      'seoul-institution-all-raw.json',
      'seoul-space-all-raw.json',
      'seoul-space-raw.json',
      'seoul-camping-all-raw.json',
      'seoul-camping-raw.json',
    ],
  },
  {
    id: 'sports',
    serviceName:
      'ListPublicReservationSport',
    outputFiles: [
      'seoul-sports-all-raw.json',
      'seoul-sports-raw.json',
      'seoul-sport-all-raw.json',
    ],
  },
  {
    id: 'education',
    serviceName:
      'ListPublicReservationEducation',
    outputFiles: [
      'seoul-education-all-raw.json',
    ],
  },
];

function cleanText(value) {
  return String(value ?? '').trim();
}

function readEnvironmentFile(
  filePath
) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs
    .readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '');

  const result = {};

  for (
    const rawLine of
      source.split(/\r?\n/)
  ) {
    const line =
      rawLine.trim();

    if (
      !line ||
      line.startsWith('#')
    ) {
      continue;
    }

    const separatorIndex =
      line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const name =
      line
        .slice(
          0,
          separatorIndex
        )
        .trim();

    let value =
      line
        .slice(
          separatorIndex + 1
        )
        .trim();

    if (
      (
        value.startsWith('"') &&
        value.endsWith('"')
      ) ||
      (
        value.startsWith("'") &&
        value.endsWith("'")
      )
    ) {
      value =
        value.slice(1, -1);
    }

    result[name] = value;
  }

  return result;
}

function getApiKey() {
  const keyNames = [
    'SEOUL_OPEN_DATA_API_KEY',
    'SEOUL_OPEN_API_KEY',
    'SEOUL_API_KEY',
    'EXPO_PUBLIC_SEOUL_OPEN_DATA_API_KEY',
    'EXPO_PUBLIC_SEOUL_OPEN_API_KEY',
    'EXPO_PUBLIC_SEOUL_API_KEY',
  ];

  for (const keyName of keyNames) {
    const value =
      cleanText(
        process.env[keyName]
      );

    if (value) {
      return {
        value,
        source:
          `환경변수 ${keyName}`,
      };
    }
  }

  const environmentFiles = [
    '.env',
    '.env.local',
    '.env.development',
  ];

  for (
    const relativePath of
      environmentFiles
  ) {
    const filePath =
      path.join(
        projectRoot,
        relativePath
      );

    const values =
      readEnvironmentFile(
        filePath
      );

    for (
      const keyName of
        keyNames
    ) {
      const value =
        cleanText(
          values[keyName]
        );

      if (value) {
        return {
          value,
          source:
            `${relativePath} / ${keyName}`,
        };
      }
    }
  }

  throw new Error(
    [
      '서울 API 인증키를 찾지 못했습니다.',
      '',
      '.env 또는 GitHub Secret에 다음 이름으로 저장하세요.',
      'SEOUL_OPEN_DATA_API_KEY=실제인증키',
    ].join('\n')
  );
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  return [value];
}

async function requestJson(
  url,
  attempt = 1
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      90000
    );

  try {
    const response =
      await fetch(url, {
        method: 'GET',
        signal:
          controller.signal,
        headers: {
          Accept:
            'application/json',
        },
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (attempt >= 3) {
      throw error;
    }

    console.log(
      `  재시도 ${attempt}/2`
    );

    await delay(
      attempt * 2000
    );

    return requestJson(
      url,
      attempt + 1
    );
  } finally {
    clearTimeout(timeout);
  }
}

function createRequestUrl(
  apiKey,
  serviceName,
  startIndex,
  endIndex
) {
  return [
    baseUrl,
    encodeURIComponent(apiKey),
    'json',
    serviceName,
    startIndex,
    endIndex,
    '',
  ].join('/');
}

function getResponseBody(
  response,
  serviceName
) {
  const body =
    response?.[serviceName];

  if (body) {
    return body;
  }

  const result =
    response?.RESULT;

  if (result) {
    throw new Error(
      `${result.CODE ?? ''} ${
        result.MESSAGE ?? ''
      }`.trim()
    );
  }

  throw new Error(
    `${serviceName} 응답 본문을 찾지 못했습니다.`
  );
}

function countDuplicateServiceIds(
  rows
) {
  const counts = new Map();

  for (const row of rows) {
    const serviceId =
      cleanText(row?.SVCID);

    if (!serviceId) {
      continue;
    }

    counts.set(
      serviceId,
      (
        counts.get(
          serviceId
        ) ?? 0
      ) + 1
    );
  }

  return [...counts.values()]
    .filter(
      (count) => count > 1
    )
    .length;
}

function writeJson(
  filePath,
  value
) {
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

async function fetchService(
  apiKey,
  service
) {
  console.log('');
  console.log(
    `===== ${service.serviceName} =====`
  );

  const firstResponse =
    await requestJson(
      createRequestUrl(
        apiKey,
        service.serviceName,
        1,
        1
      )
    );

  const firstBody =
    getResponseBody(
      firstResponse,
      service.serviceName
    );

  const totalCount =
    Number(
      firstBody.list_total_count
    );

  if (
    !Number.isFinite(
      totalCount
    ) ||
    totalCount < 0
  ) {
    throw new Error(
      `${service.serviceName} 전체 개수가 올바르지 않습니다.`
    );
  }

  console.log(
    `전체 예약상품: ${totalCount}개`
  );

  const rows = [];

  for (
    let startIndex = 1;
    startIndex <= totalCount;
    startIndex += chunkSize
  ) {
    const endIndex =
      Math.min(
        totalCount,
        startIndex +
          chunkSize -
          1
      );

    console.log(
      `수집 중: ${startIndex} ~ ${endIndex}`
    );

    const response =
      await requestJson(
        createRequestUrl(
          apiKey,
          service.serviceName,
          startIndex,
          endIndex
        )
      );

    const body =
      getResponseBody(
        response,
        service.serviceName
      );

    rows.push(
      ...asArray(body.row)
        .filter(Boolean)
    );
  }

  if (
    totalCount > 0 &&
    rows.length === 0
  ) {
    throw new Error(
      `${service.serviceName} 데이터가 비어 있습니다.`
    );
  }

  for (
    const fileName of
      service.outputFiles
  ) {
    writeJson(
      path.join(
        tmpDirectory,
        fileName
      ),
      rows
    );
  }

  if (service.id === 'sports') {
    const seoulDistricts =
      new Set([
        '강남구',
        '강동구',
        '강북구',
        '강서구',
        '관악구',
        '광진구',
        '구로구',
        '금천구',
        '노원구',
        '도봉구',
        '동대문구',
        '동작구',
        '마포구',
        '서대문구',
        '서초구',
        '성동구',
        '성북구',
        '송파구',
        '양천구',
        '영등포구',
        '용산구',
        '은평구',
        '종로구',
        '중구',
        '중랑구',
      ]);

    const insideRows =
      rows.filter(
        (row) =>
          seoulDistricts.has(
            cleanText(row?.AREANM)
          )
      );

    const reviewRows =
      rows.filter(
        (row) =>
          !seoulDistricts.has(
            cleanText(row?.AREANM)
          )
      );

    if (
      insideRows.length +
        reviewRows.length !==
      rows.length
    ) {
      throw new Error(
        '체육시설 서울 내부·외부 분리 개수가 일치하지 않습니다.'
      );
    }

    writeJson(
      path.join(
        tmpDirectory,
        'seoul-sports-raw.json'
      ),
      insideRows
    );

    writeJson(
      path.join(
        tmpDirectory,
        'seoul-sports-review.json'
      ),
      reviewRows
    );

    console.log(
      `서울 내부 체육 예약상품: ${insideRows.length}개`
    );

    console.log(
      `서울 외부 검토 예약상품: ${reviewRows.length}개`
    );
  }

  const duplicateServiceIdCount =
    countDuplicateServiceIds(
      rows
    );

  console.log(
    `실제 수집: ${rows.length}개`
  );

  console.log(
    `중복 SVCID: ${duplicateServiceIdCount}개`
  );

  return {
    id:
      service.id,

    serviceName:
      service.serviceName,

    apiTotalCount:
      totalCount,

    collectedCount:
      rows.length,

    duplicateServiceIdCount,

    outputFiles:
      service.outputFiles,
  };
}

async function main() {
  fs.mkdirSync(
    tmpDirectory,
    {
      recursive: true,
    }
  );

  const apiKeyResult =
    getApiKey();

  console.log(
    '서울 API 인증키 확인 완료'
  );

  console.log(
    `인증키 위치: ${apiKeyResult.source}`
  );

  const results = [];

  for (
    const service of services
  ) {
    results.push(
      await fetchService(
        apiKeyResult.value,
        service
      )
    );
  }

  const summary = {
    generatedAt:
      new Date().toISOString(),

    results,
  };

  writeJson(
    path.join(
      tmpDirectory,
      'seoul-reservation-fetch-summary.json'
    ),
    summary
  );

  console.log('');
  console.log(
    '===== 서울 예약 API 수집 완료 ====='
  );

  for (
    const result of results
  ) {
    console.log(
      `${result.id}: ${result.collectedCount}개`
    );
  }

  console.log(
    '요약: tmp/seoul-reservation-fetch-summary.json'
  );
}

main().catch((error) => {
  console.error('');
  console.error(
    '서울 예약 API 수집 실패'
  );

  console.error(
    error instanceof Error
      ? error.stack ??
          error.message
      : error
  );

  process.exitCode = 1;
});