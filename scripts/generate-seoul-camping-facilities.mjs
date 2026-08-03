import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const rawCandidates = [
  path.join(
    projectRoot,
    'tmp',
    'seoul-institution-all-raw.json'
  ),
  path.join(
    projectRoot,
    'tmp',
    'seoul-space-all-raw.json'
  ),
  path.join(
    projectRoot,
    'tmp',
    'seoul-camping-all-raw.json'
  ),
];

const outputDataPath = path.join(
  projectRoot,
  'store',
  'seoulCampingFacilities.ts'
);

const outputSelectorsPath = path.join(
  projectRoot,
  'store',
  'seoulCampingSelectors.ts'
);

const outputSummaryPath = path.join(
  projectRoot,
  'tmp',
  'seoul-camping-normalized-summary.json'
);

const outputExcludedPath = path.join(
  projectRoot,
  'tmp',
  'seoul-camping-excluded.json'
);

const SEOUL_DISTRICTS = new Set([
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

function cleanText(value) {
  return String(value ?? '').trim();
}

function decodeHtmlEntities(value) {
  return cleanText(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(
      /&#(\d+);/g,
      (_match, code) => {
        const parsed = Number(code);

        return Number.isFinite(parsed)
          ? String.fromCodePoint(parsed)
          : '';
      }
    );
}

function stripHtml(value) {
  return decodeHtmlEntities(
    cleanText(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function limitText(
  value,
  maximumLength
) {
  const text = stripHtml(value);

  if (
    text.length <= maximumLength
  ) {
    return text;
  }

  return `${text
    .slice(0, maximumLength)
    .trim()}…`;
}

function readJson(filePath) {
  const source = fs
    .readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '');

  const result = JSON.parse(source);

  return Array.isArray(result)
    ? result
    : [];
}

function findRawInputPath() {
  for (
    const filePath of rawCandidates
  ) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  throw new Error(
    [
      '시설대관 API 원본 파일을 찾지 못했습니다.',
      ...rawCandidates,
    ].join('\n')
  );
}

function normalizeDateTime(value) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  return text
    .replace(/\.0+$/, '')
    .replace(' ', 'T');
}

function parseCoordinate(value) {
  const parsed =
    Number(cleanText(value));

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function getCoordinates(row) {
  const longitude =
    parseCoordinate(row?.X);

  const latitude =
    parseCoordinate(row?.Y);

  const longitudeValid =
    longitude !== null &&
    longitude >= 124 &&
    longitude <= 132;

  const latitudeValid =
    latitude !== null &&
    latitude >= 33 &&
    latitude <= 39.5;

  if (
    !longitudeValid ||
    !latitudeValid
  ) {
    return {
      longitude: null,
      latitude: null,
    };
  }

  return {
    longitude,
    latitude,
  };
}

function getSearchText(row) {
  return [
    row?.MAXCLASSNM,
    row?.MINCLASSNM,
    row?.SVCNM,
    row?.PLACENM,
    row?.USETGTINFO,
    row?.DTLCONT,
  ]
    .map(stripHtml)
    .join(' ');
}

function getCampingReservationSearchText(row) {
  /*
   * 상세 설명(DTLCONT)에는 다른 시설 안내가 함께 들어갈 수 있어
   * 캠핑 여부를 판단할 때 사용하지 않습니다.
   */
  return [
    row?.SVCNM,
    row?.PLACENM,
    row?.MINCLASSNM,
    row?.MAXCLASSNM,
  ]
    .map(stripHtml)
    .join(' ');
}

function isCampingReservation(row) {
  const searchText =
    getCampingReservationSearchText(
      row
    );

  /*
   * 캠핑장이나 공원에서 진행되는 촬영·녹화 대관은
   * 실제 캠핑 예약상품이 아니므로 먼저 제외합니다.
   */
  const excludedTerms = [
    '영화촬영',
    '영화 촬영',
    '촬영',
    '녹화',
  ];

  if (
    excludedTerms.some(
      (term) =>
        searchText.includes(term)
    )
  ) {
    return false;
  }

  const minimumCategory =
    cleanText(row?.MINCLASSNM);

  const maximumCategory =
    cleanText(row?.MAXCLASSNM);

  if (
    minimumCategory.includes('캠핑') ||
    minimumCategory.includes('피크닉') ||
    maximumCategory.includes('캠핑') ||
    maximumCategory.includes('피크닉')
  ) {
    return true;
  }

  const campingTerms = [
    '캠핑장',
    '서울캠핑장',
    '서울 캠핑장',
    '오토캠핑',
    '글램핑',
    '야영장',
    '캠핑존',
    '캠핑 사이트',
    '캠핑사이트',
    '피크닉장',
    '피크닉 가든',
  ];

  return campingTerms.some(
    (term) =>
      searchText.includes(term)
  );
}
function getFacilityKind(rows) {
  /*
   * 상세 설명에는 다른 캠핑장 안내가 섞일 수 있으므로
   * 시설명·상품명·공식 분류만 사용합니다.
   */
  const conciseText = rows
    .map((row) =>
      [
        row?.SVCNM,
        row?.PLACENM,
        row?.MINCLASSNM,
        row?.MAXCLASSNM,
      ]
        .map(stripHtml)
        .join(' ')
    )
    .join(' ');

  /*
   * 피크닉이라는 명칭이 시설명이나 상품명에 있으면
   * 캠핑보다 먼저 피크닉으로 판정합니다.
   */
  if (
    conciseText.includes('피크닉')
  ) {
    return 'picnic';
  }

  return 'camping';
}
function getCampingLocationSearchText(row) {
  return [
    row?.AREANM,
    row?.PLACENM,
    row?.SVCNM,
    row?.MINCLASSNM,
    row?.MAXCLASSNM,
  ]
    .map(stripHtml)
    .join(' ');
}

function getLocationInfo(row) {
  const areaName =
    cleanText(row?.AREANM);

  const searchText =
    getCampingLocationSearchText(
      row
    );

  if (
    SEOUL_DISTRICTS.has(
      areaName
    )
  ) {
    return {
      operationScope:
        'insideSeoul',

      district:
        areaName,

      locationLabel:
        `서울 ${areaName}`,

      corrected:
        false,
    };
  }

  const insideCorrections = [
    {
      terms: [
        '난지캠핑장',
        '난지 캠핑장',
      ],
      district:
        '마포구',
    },
    {
      terms: [
        '노을캠핑장',
        '노을 캠핑장',
      ],
      district:
        '마포구',
    },
    {
      terms: [
        '중랑캠핑숲',
        '중랑 캠핑숲',
      ],
      district:
        '중랑구',
    },
  ];

  for (
    const correction of
      insideCorrections
  ) {
    if (
      correction.terms.some(
        (term) =>
          searchText.includes(
            term
          )
      )
    ) {
      return {
        operationScope:
          'insideSeoul',

        district:
          correction.district,

        locationLabel:
          `서울 ${correction.district}`,

        corrected:
          true,
      };
    }
  }

  const outsideCorrections = [
    {
      terms: [
        '포천 자연마을',
        '포천자연마을',
      ],
      locationLabel:
        '경기 포천',
    },
    {
      terms: [
        '상주 감꽃마을',
        '상주감꽃마을',
      ],
      locationLabel:
        '경북 상주',
    },
    {
      terms: [
        '함평 나비마을',
        '함평나비마을',
      ],
      locationLabel:
        '전남 함평',
    },
    {
      terms: [
        '서천 금빛노을',
        '서천금빛노을',
      ],
      locationLabel:
        '충남 서천',
    },
    {
      terms: [
        '제천 하늘뜨레',
        '제천하늘뜨레',
      ],
      locationLabel:
        '충북 제천',
    },
  ];

  for (
    const correction of
      outsideCorrections
  ) {
    if (
      correction.terms.some(
        (term) =>
          searchText.includes(
            term
          )
      )
    ) {
      return {
        operationScope:
          'seoulOperatedOutside',

        district:
          null,

        locationLabel:
          correction.locationLabel,

        corrected:
          true,
      };
    }
  }

  return {
    operationScope:
      'seoulOperatedOutside',

    district:
      null,

    locationLabel:
      areaName ||
      '서울시 운영 외부 캠핑장',

    corrected:
      false,
  };
}
function getPlaceName(row) {
  const title =
    decodeHtmlEntities(
      row?.SVCNM
    );

  const rawPlaceName =
    decodeHtmlEntities(
      row?.PLACENM
    );

  const searchText =
    `${title} ${rawPlaceName}`
      .replace(/\s+/g, ' ')
      .trim();

  const canonicalFacilities = [
    {
      terms: [
        '난지캠핑장',
        '난지 캠핑장',
      ],
      name:
        '난지캠핑장',
    },
    {
      terms: [
        '노을캠핑장',
        '노을 캠핑장',
      ],
      name:
        '노을캠핑장',
    },
    {
      terms: [
        '중랑캠핑숲',
        '중랑 캠핑숲',
      ],
      name:
        '중랑캠핑숲',
    },
    {
      terms: [
        '포천 자연마을',
        '포천자연마을',
      ],
      name:
        '경기 포천 자연마을 서울캠핑장',
    },
    {
      terms: [
        '상주 감꽃마을',
        '상주감꽃마을',
      ],
      name:
        '경북 상주 감꽃마을 서울캠핑장',
    },
    {
      terms: [
        '함평 나비마을',
        '함평나비마을',
      ],
      name:
        '전남 함평 나비마을 서울캠핑장',
    },
    {
      terms: [
        '서천 금빛노을',
        '서천금빛노을',
      ],
      name:
        '충남 서천 금빛노을 서울캠핑장',
    },
    {
      terms: [
        '제천 하늘뜨레',
        '제천하늘뜨레',
      ],
      name:
        '충북 제천 하늘뜨레 서울캠핑장',
    },
  ];

  for (
    const facility of
      canonicalFacilities
  ) {
    if (
      facility.terms.some(
        (term) =>
          searchText.includes(
            term
          )
      )
    ) {
      return facility.name;
    }
  }

  if (rawPlaceName) {
    const parts =
      rawPlaceName
        .split('>')
        .map(
          (part) =>
            part.trim()
        )
        .filter(Boolean);

    return (
      parts[
        parts.length - 1
      ] ||
      rawPlaceName
    )
      .replace(/\s+/g, ' ')
      .trim();
  }

  return (
    title ||
    '캠핑·피크닉 시설'
  );
}
function normalizeFacilityName(value) {
  return cleanText(value)
    .replace(
      /\s+/g,
      ' '
    )
    .replace(
      /\s*예약\s*$/g,
      ''
    )
    .trim();
}

function hashText(value) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(index);

    hash = Math.imul(
      hash,
      16777619
    );
  }

  return (
    hash >>> 0
  ).toString(16);
}

function normalizeReservation(row) {
  return {
    serviceId:
      cleanText(row?.SVCID),

    title:
      decodeHtmlEntities(
        row?.SVCNM
      ) ||
      '캠핑 예약',

    statusText:
      cleanText(
        row?.SVCSTATNM
      ) ||
      '상태 미확인',

    paidType:
      cleanText(
        row?.PAYATNM
      ) ||
      '요금 확인',

    targetText:
      stripHtml(
        row?.USETGTINFO
      ),

    receptionStartAt:
      normalizeDateTime(
        row?.RCPTBGNDT
      ),

    receptionEndAt:
      normalizeDateTime(
        row?.RCPTENDDT
      ),

    useStartAt:
      normalizeDateTime(
        row?.SVCOPNBGNDT
      ),

    useEndAt:
      normalizeDateTime(
        row?.SVCOPNENDDT
      ),

    reservationUrl:
      cleanText(
        row?.SVCURL
      ),

    imageUrl:
      cleanText(
        row?.IMGURL
      ),

    telephone:
      cleanText(
        row?.TELNO
      ),

    detailText:
      limitText(
        row?.DTLCONT,
        1800
      ),
  };
}

function getStatusRank(statusText) {
  const text =
    cleanText(statusText);

  if (
    text.includes('접수중')
  ) {
    return 0;
  }

  if (
    text.includes('안내중')
  ) {
    return 1;
  }

  if (
    text.includes(
      '예약일시중지'
    )
  ) {
    return 2;
  }

  if (
    text.includes('마감') ||
    text.includes('종료')
  ) {
    return 3;
  }

  return 4;
}

function createFacility(rows) {
  const firstRow = rows[0];

  const location =
    getLocationInfo(firstRow);

  const name =
    normalizeFacilityName(
      getPlaceName(firstRow)
    );

  const reservations =
    rows
      .map(
        normalizeReservation
      )
      .sort(
        (first, second) => {
          const statusDifference =
            getStatusRank(
              first.statusText
            ) -
            getStatusRank(
              second.statusText
            );

          if (
            statusDifference !== 0
          ) {
            return statusDifference;
          }

          return first.title.localeCompare(
            second.title,
            'ko'
          );
        }
      );

  let longitude = null;
  let latitude = null;
  let imageUrl = '';
  let officialUrl = '';

  for (const row of rows) {
    const coordinate =
      getCoordinates(row);

    if (
      longitude === null &&
      coordinate.longitude !== null
    ) {
      longitude =
        coordinate.longitude;
    }

    if (
      latitude === null &&
      coordinate.latitude !== null
    ) {
      latitude =
        coordinate.latitude;
    }

    if (!imageUrl) {
      imageUrl =
        cleanText(row?.IMGURL);
    }

    if (!officialUrl) {
      officialUrl =
        cleanText(row?.SVCURL);
    }
  }

  return {
    id:
      `seoul-camping-${hashText(
        [
          location.operationScope,
          location.district ?? '',
          location.locationLabel,
          name,
        ].join('|')
      )}`,

    name,

    fullPlaceName:
      name,

    facilityKind:
      getFacilityKind(rows),

    operationScope:
      location.operationScope,

    district:
      location.district,

    locationLabel:
      location.locationLabel,

    longitude,

    latitude,

    imageUrl,

    officialUrl,

    reservationCount:
      reservations.length,

    reservations,
  };
}

const rawInputPath =
  findRawInputPath();

const allRows =
  readJson(rawInputPath);

const campingRows = [];
const excludedRows = [];
const duplicateKeys =
  new Set();

let duplicateReservationCount = 0;

for (const row of allRows) {
  if (!isCampingReservation(row)) {
    excludedRows.push({
      reason:
        'notCamping',

      serviceId:
        cleanText(row?.SVCID),

      title:
        decodeHtmlEntities(
          row?.SVCNM
        ),

      placeName:
        decodeHtmlEntities(
          row?.PLACENM
        ),

      category:
        cleanText(
          row?.MINCLASSNM
        ),
    });

    continue;
  }

  const uniqueKey =
    cleanText(row?.SVCID) ||
    [
      cleanText(row?.SVCNM),
      cleanText(row?.PLACENM),
      cleanText(row?.RCPTBGNDT),
    ].join('|');

  if (
    duplicateKeys.has(uniqueKey)
  ) {
    duplicateReservationCount += 1;
    continue;
  }

  duplicateKeys.add(uniqueKey);
  campingRows.push(row);
}

if (campingRows.length === 0) {
  throw new Error(
    '캠핑·피크닉 예약상품을 찾지 못했습니다.'
  );
}

const facilityGroups =
  new Map();

for (const row of campingRows) {
  const location =
    getLocationInfo(row);

  const name =
    normalizeFacilityName(
      getPlaceName(row)
    );

  const groupKey = [
    location.operationScope,
    location.district ?? '',
    location.locationLabel,
    name,
  ].join('|');

  const groupRows =
    facilityGroups.get(
      groupKey
    ) ?? [];

  groupRows.push(row);

  facilityGroups.set(
    groupKey,
    groupRows
  );
}

const facilities =
  [...facilityGroups.values()]
    .map(createFacility)
    .sort(
      (first, second) => {
        if (
          first.operationScope !==
          second.operationScope
        ) {
          return first.operationScope ===
            'insideSeoul'
            ? -1
            : 1;
        }

        const locationDifference =
          first.locationLabel.localeCompare(
            second.locationLabel,
            'ko'
          );

        if (
          locationDifference !== 0
        ) {
          return locationDifference;
        }

        return first.name.localeCompare(
          second.name,
          'ko'
        );
      }
    );

const insideFacilities =
  facilities.filter(
    (facility) =>
      facility.operationScope ===
      'insideSeoul'
  );

const outsideFacilities =
  facilities.filter(
    (facility) =>
      facility.operationScope ===
      'seoulOperatedOutside'
  );

const campingFacilities =
  facilities.filter(
    (facility) =>
      facility.facilityKind ===
      'camping'
  );

const picnicFacilities =
  facilities.filter(
    (facility) =>
      facility.facilityKind ===
      'picnic'
  );

const facilitiesWithoutCoordinates =
  facilities.filter(
    (facility) =>
      facility.latitude === null ||
      facility.longitude === null
  );

const districtNames = [
  ...new Set(
    insideFacilities
      .map(
        (facility) =>
          facility.district
      )
      .filter(Boolean)
  ),
].sort(
  (first, second) =>
    first.localeCompare(
      second,
      'ko'
    )
);

const summary = {
  generatedAt:
    new Date().toISOString(),

  rawInput:
    path.relative(
      projectRoot,
      rawInputPath
    ),

  sourceReservationCount:
    allRows.length,

  includedReservationCount:
    campingRows.length,

  duplicateReservationCount,

  facilityCount:
    facilities.length,

  insideSeoulFacilityCount:
    insideFacilities.length,

  outsideFacilityCount:
    outsideFacilities.length,

  campingFacilityCount:
    campingFacilities.length,

  picnicFacilityCount:
    picnicFacilities.length,

  districtCount:
    districtNames.length,

  districts:
    districtNames,

  facilityWithoutCoordinateCount:
    facilitiesWithoutCoordinates.length,

  facilitiesWithoutCoordinates:
    facilitiesWithoutCoordinates.map(
      (facility) => ({
        id:
          facility.id,

        name:
          facility.name,

        district:
          facility.district,

        locationLabel:
          facility.locationLabel,
      })
    ),

  outsideFacilities:
    outsideFacilities.map(
      (facility) => ({
        id:
          facility.id,

        name:
          facility.name,

        locationLabel:
          facility.locationLabel,

        reservationCount:
          facility.reservationCount,
      })
    ),
};

const dataFileSource = `export type SeoulCampingFacilityKind =
  | 'camping'
  | 'picnic';

export type SeoulCampingOperationScope =
  | 'insideSeoul'
  | 'seoulOperatedOutside';

export type SeoulCampingReservation = {
  serviceId: string;
  title: string;
  statusText: string;
  paidType: string;
  targetText: string;
  receptionStartAt: string | null;
  receptionEndAt: string | null;
  useStartAt: string | null;
  useEndAt: string | null;
  reservationUrl: string;
  imageUrl: string;
  telephone: string;
  detailText: string;
};

export type SeoulCampingFacility = {
  id: string;
  name: string;
  fullPlaceName: string;
  facilityKind:
    SeoulCampingFacilityKind;
  operationScope:
    SeoulCampingOperationScope;
  district: string | null;
  locationLabel: string;
  longitude: number | null;
  latitude: number | null;
  imageUrl: string;
  officialUrl: string;
  reservationCount: number;
  reservations:
    readonly SeoulCampingReservation[];
};

export const SEOUL_CAMPING_RESERVATION_COUNT =
  ${campingRows.length};

export const SEOUL_CAMPING_FACILITY_COUNT =
  ${facilities.length};

export const SEOUL_CAMPING_FACILITIES:
  readonly SeoulCampingFacility[] =
${JSON.stringify(
  facilities,
  null,
  2
)};
`;

const selectorsFileSource = `import {
  SEOUL_CAMPING_FACILITIES,
  type SeoulCampingFacility,
  type SeoulCampingReservation,
} from './seoulCampingFacilities';

export type SeoulCampingStatus =
  | 'open'
  | 'upcoming'
  | 'closed'
  | 'cancelled'
  | 'unknown';

export type SeoulCampingFacilitySummary = {
  facility:
    SeoulCampingFacility;
  primaryReservation:
    SeoulCampingReservation | null;
  primaryStatus:
    SeoulCampingStatus;
  openCount: number;
  upcomingCount: number;
  closedCount: number;
};

function parseCampingDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    !Number.isFinite(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

export function getCampingReservationStatus(
  reservation:
    SeoulCampingReservation,
  now = new Date()
): SeoulCampingStatus {
  const statusText =
    reservation.statusText.trim();

  if (
    statusText.includes('접수중')
  ) {
    return 'open';
  }

  if (
    statusText.includes('안내중')
  ) {
    return 'upcoming';
  }

  if (
    statusText.includes('취소')
  ) {
    return 'cancelled';
  }

  if (
    statusText.includes('마감') ||
    statusText.includes('종료') ||
    statusText.includes(
      '예약일시중지'
    )
  ) {
    return 'closed';
  }

  const receptionStart =
    parseCampingDate(
      reservation.receptionStartAt
    );

  const receptionEnd =
    parseCampingDate(
      reservation.receptionEndAt
    );

  if (
    receptionStart &&
    now.getTime() <
      receptionStart.getTime()
  ) {
    return 'upcoming';
  }

  if (
    receptionStart &&
    receptionEnd &&
    now.getTime() >=
      receptionStart.getTime() &&
    now.getTime() <=
      receptionEnd.getTime()
  ) {
    return 'open';
  }

  if (
    receptionEnd &&
    now.getTime() >
      receptionEnd.getTime()
  ) {
    return 'closed';
  }

  return 'unknown';
}

export function getCampingStatusLabel(
  status:
    SeoulCampingStatus
) {
  if (status === 'open') {
    return '접수 중';
  }

  if (status === 'upcoming') {
    return '접수 예정';
  }

  if (status === 'closed') {
    return '예약 마감';
  }

  if (status === 'cancelled') {
    return '예약 취소';
  }

  return '상태 확인';
}

function getCampingStatusRank(
  status:
    SeoulCampingStatus
) {
  if (status === 'open') {
    return 0;
  }

  if (status === 'upcoming') {
    return 1;
  }

  if (status === 'unknown') {
    return 2;
  }

  if (status === 'closed') {
    return 3;
  }

  return 4;
}

export function getPrimaryCampingReservation(
  facility:
    SeoulCampingFacility,
  now = new Date()
) {
  const reservations =
    [...facility.reservations]
      .sort(
        (first, second) => {
          const statusDifference =
            getCampingStatusRank(
              getCampingReservationStatus(
                first,
                now
              )
            ) -
            getCampingStatusRank(
              getCampingReservationStatus(
                second,
                now
              )
            );

          if (
            statusDifference !== 0
          ) {
            return statusDifference;
          }

          return first.title.localeCompare(
            second.title,
            'ko'
          );
        }
      );

  return (
    reservations[0] ??
    null
  );
}

export function getCampingFacilitySummary(
  facility:
    SeoulCampingFacility,
  now = new Date()
): SeoulCampingFacilitySummary {
  let openCount = 0;
  let upcomingCount = 0;
  let closedCount = 0;

  for (
    const reservation of
      facility.reservations
  ) {
    const status =
      getCampingReservationStatus(
        reservation,
        now
      );

    if (status === 'open') {
      openCount += 1;
    }

    if (status === 'upcoming') {
      upcomingCount += 1;
    }

    if (
      status === 'closed' ||
      status === 'cancelled'
    ) {
      closedCount += 1;
    }
  }

  const primaryReservation =
    getPrimaryCampingReservation(
      facility,
      now
    );

  const primaryStatus =
    primaryReservation
      ? getCampingReservationStatus(
          primaryReservation,
          now
        )
      : 'unknown';

  return {
    facility,
    primaryReservation,
    primaryStatus,
    openCount,
    upcomingCount,
    closedCount,
  };
}

export function getCampingFacilitySummaries(
  now = new Date()
) {
  return SEOUL_CAMPING_FACILITIES
    .map(
      (facility) =>
        getCampingFacilitySummary(
          facility,
          now
        )
    )
    .sort(
      (first, second) => {
        const statusDifference =
          getCampingStatusRank(
            first.primaryStatus
          ) -
          getCampingStatusRank(
            second.primaryStatus
          );

        if (
          statusDifference !== 0
        ) {
          return statusDifference;
        }

        const locationDifference =
          first.facility.locationLabel.localeCompare(
            second.facility.locationLabel,
            'ko'
          );

        if (
          locationDifference !== 0
        ) {
          return locationDifference;
        }

        return first.facility.name.localeCompare(
          second.facility.name,
          'ko'
        );
      }
    );
}

export function getInsideSeoulCampingSummaries(
  now = new Date()
) {
  return getCampingFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.operationScope ===
      'insideSeoul'
  );
}

export function getSeoulOperatedOutsideCampingSummaries(
  now = new Date()
) {
  return getCampingFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.operationScope ===
      'seoulOperatedOutside'
  );
}

export function getCampingSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getInsideSeoulCampingSummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.district ===
      normalizedDistrict
  );
}
`;

fs.mkdirSync(
  path.dirname(
    outputDataPath
  ),
  {
    recursive: true,
  }
);

fs.writeFileSync(
  outputDataPath,
  dataFileSource,
  'utf8'
);

fs.writeFileSync(
  outputSelectorsPath,
  selectorsFileSource,
  'utf8'
);

fs.writeFileSync(
  outputSummaryPath,
  `${JSON.stringify(
    summary,
    null,
    2
  )}\n`,
  'utf8'
);

fs.writeFileSync(
  outputExcludedPath,
  `${JSON.stringify(
    excludedRows,
    null,
    2
  )}\n`,
  'utf8'
);

console.log('');
console.log(
  '===== 서울 캠핑·피크닉 데이터 생성 결과 ====='
);

console.log(
  `시설대관 원본 예약상품: ${summary.sourceReservationCount}개`
);

console.log(
  `캠핑·피크닉 예약상품: ${summary.includedReservationCount}개`
);

console.log(
  `중복 예약상품: ${summary.duplicateReservationCount}개`
);

console.log(
  `전체 시설: ${summary.facilityCount}곳`
);

console.log(
  `서울 안 시설: ${summary.insideSeoulFacilityCount}곳`
);

console.log(
  `서울시 운영 외부 시설: ${summary.outsideFacilityCount}곳`
);

console.log(
  `캠핑장: ${summary.campingFacilityCount}곳`
);

console.log(
  `피크닉장: ${summary.picnicFacilityCount}곳`
);

console.log(
  `좌표 없는 시설: ${summary.facilityWithoutCoordinateCount}곳`
);

console.log('');
console.log(
  '===== 서울시 운영 외부 캠핑장 ====='
);

for (
  const facility of
    summary.outsideFacilities
) {
  console.log(
    `- ${facility.locationLabel} / ${facility.name} / ${facility.reservationCount}개 상품`
  );
}

console.log('');
console.log(
  '생성 완료: store/seoulCampingFacilities.ts'
);

console.log(
  '생성 완료: store/seoulCampingSelectors.ts'
);

console.log(
  '생성 완료: tmp/seoul-camping-normalized-summary.json'
);

console.log(
  '생성 완료: tmp/seoul-camping-excluded.json'
);