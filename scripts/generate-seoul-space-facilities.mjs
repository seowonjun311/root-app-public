import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const allRawPath = path.join(
  projectRoot,
  'tmp',
  'seoul-space-all-raw.json'
);

const seoulRawPath = path.join(
  projectRoot,
  'tmp',
  'seoul-space-seoul-raw.json'
);

const reviewRawPath = path.join(
  projectRoot,
  'tmp',
  'seoul-space-review.json'
);

const outputDataPath = path.join(
  projectRoot,
  'store',
  'seoulSpaceFacilities.ts'
);

const outputSelectorsPath = path.join(
  projectRoot,
  'store',
  'seoulSpaceSelectors.ts'
);

const outputSummaryPath = path.join(
  projectRoot,
  'tmp',
  'seoul-space-normalized-summary.json'
);

const outputExcludedPath = path.join(
  projectRoot,
  'tmp',
  'seoul-space-excluded.json'
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

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `필수 파일을 찾지 못했습니다: ${filePath}`
    );
  }

  const source = fs
    .readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '');

  const parsed = JSON.parse(source);

  return Array.isArray(parsed)
    ? parsed
    : [];
}

function cleanText(value) {
  return String(value ?? '').trim();
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
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const parsed = Number(text);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function getValidCoordinates(row) {
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
    row?.SVCNM,
    row?.PLACENM,
    row?.MINCLASSNM,
    row?.MAXCLASSNM,
    row?.DTLCONT,
  ]
    .map(cleanText)
    .join(' ');
}

function getCorrectedDistrict(row) {
  const originalDistrict =
    cleanText(row?.AREANM);

  if (
    SEOUL_DISTRICTS.has(
      originalDistrict
    )
  ) {
    return originalDistrict;
  }

  const searchText =
    getSearchText(row);

  if (
    searchText.includes(
      '회현지하도상가'
    )
  ) {
    return '중구';
  }

  if (
    searchText.includes(
      '잠실지하광장'
    )
  ) {
    return '송파구';
  }

  if (
    searchText.includes(
      '틈새미술관'
    ) ||
    searchText.includes(
      '을지3구역'
    )
  ) {
    return '중구';
  }

  return null;
}

function getExclusionReason(row) {
  const searchText =
    getSearchText(row);

  const category =
    cleanText(row?.MINCLASSNM);

  const campingTerms = [
    '캠핑장',
    '오토캠핑',
    '서울캠핑장',
    '텐트 설치',
  ];

  if (
    campingTerms.some(
      (term) =>
        searchText.includes(term)
    ) ||
    category.includes('캠핑')
  ) {
    return 'duplicateCamping';
  }

  const militaryTerms = [
    '예비군',
    '동원훈련',
    '기본훈련',
    '훈련복장',
    '전투복',
    '전투화',
    '수송버스',
    '금곡훈련',
    '지축예비군',
    '성동구대대',
    '중랑구대대',
  ];

  if (
    militaryTerms.some(
      (term) =>
        searchText.includes(term)
    )
  ) {
    return 'militarySupport';
  }

  if (!getCorrectedDistrict(row)) {
    return 'outsideOrUnknown';
  }

  return null;
}

function getFacilityFullName(row) {
  const placeName =
    cleanText(row?.PLACENM);

  if (placeName) {
    return placeName;
  }

  const serviceName =
    cleanText(row?.SVCNM);

  return (
    serviceName ||
    '시설명 확인 필요'
  );
}

function getFacilityDisplayName(
  fullPlaceName
) {
  const parts =
    cleanText(fullPlaceName)
      .split('>')
      .map((item) => item.trim())
      .filter(Boolean);

  if (parts.length > 0) {
    return parts[
      parts.length - 1
    ];
  }

  return (
    cleanText(fullPlaceName) ||
    '시설명 확인 필요'
  );
}

function getSpaceKind(
  category,
  name,
  title
) {
  const searchText = [
    category,
    name,
    title,
  ]
    .map(cleanText)
    .join(' ');

  if (
    searchText.includes('회의실') ||
    searchText.includes('세미나')
  ) {
    return 'meetingRoom';
  }

  if (
    searchText.includes('강의실') ||
    searchText.includes('교실') ||
    searchText.includes('교육장')
  ) {
    return 'lectureRoom';
  }

  if (
    searchText.includes('강당') ||
    searchText.includes('대강당')
  ) {
    return 'hall';
  }

  if (
    searchText.includes('다목적')
  ) {
    return 'multipurpose';
  }

  if (
    searchText.includes('공연') ||
    searchText.includes('무대') ||
    searchText.includes('극장')
  ) {
    return 'performance';
  }

  if (
    searchText.includes('전시') ||
    searchText.includes('미술관') ||
    searchText.includes('갤러리')
  ) {
    return 'exhibition';
  }

  if (
    searchText.includes('연습실') ||
    searchText.includes('스튜디오') ||
    searchText.includes('녹음실') ||
    searchText.includes('창작실')
  ) {
    return 'studio';
  }

  if (
    searchText.includes('광장') ||
    searchText.includes('야외공간') ||
    searchText.includes('마당')
  ) {
    return 'plaza';
  }

  if (
    searchText.includes('주민') ||
    searchText.includes('공유공간') ||
    searchText.includes('커뮤니티') ||
    searchText.includes('자치회관') ||
    searchText.includes('청년공간')
  ) {
    return 'community';
  }

  return 'other';
}

function getStatusRank(statusText) {
  const text =
    cleanText(statusText);

  if (text.includes('접수중')) {
    return 0;
  }

  if (
    text.includes('접수예정') ||
    text.includes('안내중')
  ) {
    return 1;
  }

  if (
    text.includes('마감') ||
    text.includes('종료') ||
    text.includes('취소')
  ) {
    return 2;
  }

  return 3;
}

function hashText(value) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^= value.charCodeAt(
      index
    );

    hash = Math.imul(
      hash,
      16777619
    );
  }

  return (
    hash >>> 0
  ).toString(16);
}

function createFacilityId(
  district,
  fullPlaceName
) {
  return `seoul-space-${hashText(
    `${district}|${fullPlaceName}`
  )}`;
}

function normalizeReservation(row) {
  return {
    serviceId:
      cleanText(row?.SVCID),

    title:
      cleanText(row?.SVCNM),

    statusText:
      cleanText(row?.SVCSTATNM) ||
      '상태 미확인',

    majorCategory:
      cleanText(row?.MAXCLASSNM) ||
      '시설대관',

    category:
      cleanText(row?.MINCLASSNM) ||
      '기타',

    paidType:
      cleanText(row?.PAYATNM),

    targetText:
      cleanText(row?.USETGTINFO),

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

    serviceUrl:
      cleanText(row?.SVCURL),

    imageUrl:
      cleanText(row?.IMGURL),

    telephone:
      cleanText(row?.TELNO),

    detailText:
      cleanText(row?.DTLCONT),
  };
}

function getMostCommonCategory(
  reservations
) {
  const counts = new Map();

  for (
    const reservation of
      reservations
  ) {
    const category =
      reservation.category ||
      '기타';

    counts.set(
      category,
      (
        counts.get(category) ??
        0
      ) + 1
    );
  }

  const sorted =
    [...counts.entries()].sort(
      (first, second) => {
        if (
          first[1] !== second[1]
        ) {
          return (
            second[1] -
            first[1]
          );
        }

        return first[0].localeCompare(
          second[0],
          'ko'
        );
      }
    );

  return sorted[0]?.[0] ?? '기타';
}

function createFacility(
  groupRows
) {
  const firstRow =
    groupRows[0];

  const district =
    getCorrectedDistrict(
      firstRow
    );

  if (!district) {
    throw new Error(
      '자치구가 없는 시설이 포함되었습니다.'
    );
  }

  const fullPlaceName =
    getFacilityFullName(
      firstRow
    );

  const reservations =
    groupRows
      .map(normalizeReservation)
      .sort((first, second) => {
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
      });

  const primaryCategory =
    getMostCommonCategory(
      reservations
    );

  const categoryNames =
    [
      ...new Set(
        reservations
          .map(
            (reservation) =>
              reservation.category
          )
          .filter(Boolean)
      ),
    ].sort((first, second) =>
      first.localeCompare(
        second,
        'ko'
      )
    );

  let longitude = null;
  let latitude = null;
  let imageUrl = '';
  let officialUrl = '';

  for (const row of groupRows) {
    const coordinates =
      getValidCoordinates(row);

    if (
      longitude === null &&
      coordinates.longitude !== null
    ) {
      longitude =
        coordinates.longitude;
    }

    if (
      latitude === null &&
      coordinates.latitude !== null
    ) {
      latitude =
        coordinates.latitude;
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

  const name =
    getFacilityDisplayName(
      fullPlaceName
    );

  return {
    id:
      createFacilityId(
        district,
        fullPlaceName
      ),

    name,

    fullPlaceName,

    district,

    locationLabel:
      `서울 ${district}`,

    primaryCategory,

    categoryNames,

    spaceKind:
      getSpaceKind(
        primaryCategory,
        name,
        reservations[0]?.title
      ),

    longitude,

    latitude,

    imageUrl,

    officialUrl,

    reservationCount:
      reservations.length,

    reservations,
  };
}

const allRows =
  readJson(allRawPath);

const seoulRows =
  readJson(seoulRawPath);

const reviewRows =
  readJson(reviewRawPath);

const sourceRows = [
  ...seoulRows,
  ...reviewRows,
];

const uniqueRows = [];
const excludedRows = [];
const serviceKeys = new Set();

let duplicateReservationCount = 0;

for (const row of sourceRows) {
  const serviceId =
    cleanText(row?.SVCID);

  const fallbackKey = [
    cleanText(row?.SVCNM),
    cleanText(row?.PLACENM),
    cleanText(row?.RCPTBGNDT),
  ].join('|');

  const uniqueKey =
    serviceId || fallbackKey;

  if (
    serviceKeys.has(uniqueKey)
  ) {
    duplicateReservationCount += 1;
    continue;
  }

  serviceKeys.add(uniqueKey);

  const exclusionReason =
    getExclusionReason(row);

  if (exclusionReason) {
    excludedRows.push({
      reason:
        exclusionReason,

      serviceId:
        cleanText(row?.SVCID),

      title:
        cleanText(row?.SVCNM),

      placeName:
        cleanText(row?.PLACENM),

      category:
        cleanText(
          row?.MINCLASSNM
        ),

      areaName:
        cleanText(row?.AREANM),
    });

    continue;
  }

  uniqueRows.push({
    ...row,
    __correctedDistrict:
      getCorrectedDistrict(row),
  });
}

const facilityGroups =
  new Map();

for (const row of uniqueRows) {
  const district =
    getCorrectedDistrict(row);

  const fullPlaceName =
    getFacilityFullName(row);

  const groupKey = [
    district,
    fullPlaceName,
  ].join('|');

  const previousRows =
    facilityGroups.get(
      groupKey
    ) ?? [];

  previousRows.push(row);

  facilityGroups.set(
    groupKey,
    previousRows
  );
}

const facilities =
  [...facilityGroups.values()]
    .map(createFacility)
    .sort((first, second) => {
      const districtDifference =
        first.district.localeCompare(
          second.district,
          'ko'
        );

      if (
        districtDifference !== 0
      ) {
        return districtDifference;
      }

      return first.name.localeCompare(
        second.name,
        'ko'
      );
    });

const districts =
  [
    ...new Set(
      facilities.map(
        (facility) =>
          facility.district
      )
    ),
  ].sort((first, second) =>
    first.localeCompare(
      second,
      'ko'
    )
  );

const categoryCountMap =
  new Map();

for (const row of uniqueRows) {
  const category =
    cleanText(
      row?.MINCLASSNM
    ) || '기타';

  categoryCountMap.set(
    category,
    (
      categoryCountMap.get(
        category
      ) ?? 0
    ) + 1
  );
}

const categoryCounts =
  [...categoryCountMap.entries()]
    .map(
      ([
        category,
        reservationCount,
      ]) => ({
        category,
        reservationCount,
      })
    )
    .sort(
      (first, second) =>
        second.reservationCount -
        first.reservationCount
    );

const districtCounts =
  districts.map((district) => {
    const districtFacilities =
      facilities.filter(
        (facility) =>
          facility.district ===
          district
      );

    return {
      district,

      facilityCount:
        districtFacilities.length,

      reservationCount:
        districtFacilities.reduce(
          (total, facility) =>
            total +
            facility.reservationCount,
          0
        ),
    };
  });

const facilitiesWithoutCoordinates =
  facilities.filter(
    (facility) =>
      facility.longitude === null ||
      facility.latitude === null
  );

const excludedReasonCounts =
  excludedRows.reduce(
    (result, row) => {
      result[row.reason] =
        (
          result[row.reason] ??
          0
        ) + 1;

      return result;
    },
    {}
  );

const correctedRows =
  reviewRows
    .map((row) => ({
      serviceId:
        cleanText(row?.SVCID),

      title:
        cleanText(row?.SVCNM),

      originalAreaName:
        cleanText(row?.AREANM),

      correctedDistrict:
        getCorrectedDistrict(row),
    }))
    .filter(
      (row) =>
        Boolean(
          row.correctedDistrict
        )
    );

const summary = {
  generatedAt:
    new Date().toISOString(),

  apiSourceReservationCount:
    allRows.length,

  loadedReservationCount:
    sourceRows.length,

  includedReservationCount:
    uniqueRows.length,

  excludedReservationCount:
    excludedRows.length,

  duplicateReservationCount,

  facilityCount:
    facilities.length,

  districtCount:
    districts.length,

  districts,

  districtCounts,

  categoryCounts,

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

        primaryCategory:
          facility.primaryCategory,
      })
    ),

  correctedRows,

  excludedReasonCounts,
};

const dataFileSource = `export type SeoulSpaceKind =
  | 'meetingRoom'
  | 'lectureRoom'
  | 'hall'
  | 'multipurpose'
  | 'performance'
  | 'exhibition'
  | 'studio'
  | 'plaza'
  | 'community'
  | 'other';

export type SeoulSpaceReservation = {
  serviceId: string;
  title: string;
  statusText: string;
  majorCategory: string;
  category: string;
  paidType: string;
  targetText: string;
  receptionStartAt: string | null;
  receptionEndAt: string | null;
  useStartAt: string | null;
  useEndAt: string | null;
  serviceUrl: string;
  imageUrl: string;
  telephone: string;
  detailText: string;
};

export type SeoulSpaceFacility = {
  id: string;
  name: string;
  fullPlaceName: string;
  district: string;
  locationLabel: string;
  primaryCategory: string;
  categoryNames: readonly string[];
  spaceKind: SeoulSpaceKind;
  longitude: number | null;
  latitude: number | null;
  imageUrl: string;
  officialUrl: string;
  reservationCount: number;
  reservations: readonly SeoulSpaceReservation[];
};

export const SEOUL_SPACE_RESERVATION_COUNT =
  ${uniqueRows.length};

export const SEOUL_SPACE_FACILITY_COUNT =
  ${facilities.length};

export const SEOUL_SPACE_FACILITIES:
  readonly SeoulSpaceFacility[] =
${JSON.stringify(
  facilities,
  null,
  2
)};
`;

const selectorsFileSource = `import {
  SEOUL_SPACE_FACILITIES,
  type SeoulSpaceFacility,
  type SeoulSpaceKind,
  type SeoulSpaceReservation,
} from './seoulSpaceFacilities';

export type RootSpaceReservationStatus =
  | 'open'
  | 'scheduled'
  | 'closed'
  | 'unknown';

export type SeoulSpaceFacilitySummary = {
  facility: SeoulSpaceFacility;
  primaryReservation:
    SeoulSpaceReservation | null;
  status:
    RootSpaceReservationStatus;
  statusLabel: string;
  openReservationCount: number;
  scheduledReservationCount: number;
};

function parseSpaceDate(
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

export function getSpaceReservationStatus(
  reservation:
    SeoulSpaceReservation,
  now = new Date()
): RootSpaceReservationStatus {
  const statusText =
    reservation.statusText.trim();

  if (
    statusText.includes('접수중')
  ) {
    return 'open';
  }

  if (
    statusText.includes('접수예정') ||
    statusText.includes('안내중')
  ) {
    return 'scheduled';
  }

  if (
    statusText.includes('마감') ||
    statusText.includes('종료') ||
    statusText.includes('취소')
  ) {
    return 'closed';
  }

  const receptionStart =
    parseSpaceDate(
      reservation.receptionStartAt
    );

  const receptionEnd =
    parseSpaceDate(
      reservation.receptionEndAt
    );

  if (
    receptionStart &&
    now.getTime() <
      receptionStart.getTime()
  ) {
    return 'scheduled';
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

export function getSpaceStatusLabel(
  status:
    RootSpaceReservationStatus
) {
  if (status === 'open') {
    return '접수 중';
  }

  if (status === 'scheduled') {
    return '접수 예정';
  }

  if (status === 'closed') {
    return '예약 마감';
  }

  return '상태 확인';
}

export function getSpaceKindLabel(
  kind: SeoulSpaceKind
) {
  if (kind === 'meetingRoom') {
    return '회의·세미나실';
  }

  if (kind === 'lectureRoom') {
    return '강의실';
  }

  if (kind === 'hall') {
    return '강당';
  }

  if (kind === 'multipurpose') {
    return '다목적실';
  }

  if (kind === 'performance') {
    return '공연공간';
  }

  if (kind === 'exhibition') {
    return '전시공간';
  }

  if (kind === 'studio') {
    return '연습·창작공간';
  }

  if (kind === 'plaza') {
    return '광장·야외공간';
  }

  if (kind === 'community') {
    return '주민·공유공간';
  }

  return '기타 공간';
}

function getStatusRank(
  status:
    RootSpaceReservationStatus
) {
  if (status === 'open') {
    return 0;
  }

  if (status === 'scheduled') {
    return 1;
  }

  if (status === 'unknown') {
    return 2;
  }

  return 3;
}

export function getPrimarySpaceReservation(
  facility:
    SeoulSpaceFacility,
  now = new Date()
) {
  const sorted =
    [...facility.reservations].sort(
      (first, second) => {
        const firstStatus =
          getSpaceReservationStatus(
            first,
            now
          );

        const secondStatus =
          getSpaceReservationStatus(
            second,
            now
          );

        const statusDifference =
          getStatusRank(
            firstStatus
          ) -
          getStatusRank(
            secondStatus
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

  return sorted[0] ?? null;
}

export function getSpaceFacilitySummary(
  facility:
    SeoulSpaceFacility,
  now = new Date()
): SeoulSpaceFacilitySummary {
  let openReservationCount = 0;
  let scheduledReservationCount = 0;

  for (
    const reservation of
      facility.reservations
  ) {
    const status =
      getSpaceReservationStatus(
        reservation,
        now
      );

    if (status === 'open') {
      openReservationCount += 1;
    }

    if (
      status === 'scheduled'
    ) {
      scheduledReservationCount += 1;
    }
  }

  const primaryReservation =
    getPrimarySpaceReservation(
      facility,
      now
    );

  const status =
    primaryReservation
      ? getSpaceReservationStatus(
          primaryReservation,
          now
        )
      : 'unknown';

  return {
    facility,
    primaryReservation,
    status,
    statusLabel:
      getSpaceStatusLabel(status),
    openReservationCount,
    scheduledReservationCount,
  };
}

export function getSpaceFacilitySummaries(
  now = new Date()
) {
  return SEOUL_SPACE_FACILITIES
    .map((facility) =>
      getSpaceFacilitySummary(
        facility,
        now
      )
    )
    .sort((first, second) => {
      const statusDifference =
        getStatusRank(
          first.status
        ) -
        getStatusRank(
          second.status
        );

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      const districtDifference =
        first.facility.district.localeCompare(
          second.facility.district,
          'ko'
        );

      if (
        districtDifference !== 0
      ) {
        return districtDifference;
      }

      return first.facility.name.localeCompare(
        second.facility.name,
        'ko'
      );
    });
}

export function getSpaceSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getSpaceFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.district ===
      normalizedDistrict
  );
}

export function getSpaceSummariesByKind(
  kind: SeoulSpaceKind,
  now = new Date()
) {
  return getSpaceFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.spaceKind ===
      kind
  );
}
`;

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
  '===== 서울 공간대관 데이터 생성 결과 ====='
);

console.log(
  `원본 예약상품: ${summary.apiSourceReservationCount}개`
);

console.log(
  `포함된 예약상품: ${summary.includedReservationCount}개`
);

console.log(
  `제외된 예약상품: ${summary.excludedReservationCount}개`
);

console.log(
  `실제 공간시설: ${summary.facilityCount}곳`
);

console.log(
  `데이터가 있는 자치구: ${summary.districtCount}개`
);

console.log(
  `좌표 없는 시설: ${summary.facilityWithoutCoordinateCount}곳`
);

console.log('');
console.log(
  '===== 제외 결과 ====='
);

console.log(
  `캠핑 중복: ${summary.excludedReasonCounts.duplicateCamping ?? 0}개`
);

console.log(
  `예비군·수송·복장: ${summary.excludedReasonCounts.militarySupport ?? 0}개`
);

console.log(
  `서울 외부 또는 위치 미확인: ${summary.excludedReasonCounts.outsideOrUnknown ?? 0}개`
);

console.log('');
console.log(
  '===== 자치구 보정 결과 ====='
);

for (
  const row of
    summary.correctedRows
) {
  console.log(
    `- ${row.correctedDistrict} / ${row.title}`
  );
}

console.log('');
console.log(
  '생성 완료: store/seoulSpaceFacilities.ts'
);

console.log(
  '생성 완료: store/seoulSpaceSelectors.ts'
);

console.log(
  '생성 완료: tmp/seoul-space-normalized-summary.json'
);

console.log(
  '생성 완료: tmp/seoul-space-excluded.json'
);
