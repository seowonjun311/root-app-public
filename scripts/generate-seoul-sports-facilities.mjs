import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const insideRawPath = path.join(
  projectRoot,
  'tmp',
  'seoul-sports-raw.json'
);

const reviewRawPath = path.join(
  projectRoot,
  'tmp',
  'seoul-sports-review.json'
);

const outputDataPath = path.join(
  projectRoot,
  'store',
  'seoulSportsFacilities.ts'
);

const outputSelectorsPath = path.join(
  projectRoot,
  'store',
  'seoulSportsSelectors.ts'
);

const outputSummaryPath = path.join(
  projectRoot,
  'tmp',
  'seoul-sports-normalized-summary.json'
);

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
  const longitude = parseCoordinate(row?.X);
  const latitude = parseCoordinate(row?.Y);

  const isValidLongitude =
    longitude !== null &&
    longitude >= 124 &&
    longitude <= 132;

  const isValidLatitude =
    latitude !== null &&
    latitude >= 33 &&
    latitude <= 39.5;

  if (
    !isValidLongitude ||
    !isValidLatitude
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

function getOutsideLocation(row) {
  const searchText = [
    row?.SVCNM,
    row?.PLACENM,
    row?.DTLCONT,
  ]
    .map(cleanText)
    .join(' ');

  if (searchText.includes('서울대공원')) {
    return {
      locationLabel: '경기 과천시',
      outsideRegionId: 'gyeonggi-gwacheon',
    };
  }

  if (
    searchText.includes(
      '난지물재생센터'
    )
  ) {
    return {
      locationLabel: '경기 고양시',
      outsideRegionId: 'gyeonggi-goyang',
    };
  }

  return {
    locationLabel: '서울시 운영 외부 시설',
    outsideRegionId: null,
  };
}

function getPlaceName(row) {
  const placeName = cleanText(
    row?.PLACENM
  );

  if (placeName) {
    return placeName;
  }

  const serviceName = cleanText(
    row?.SVCNM
  );

  return (
    serviceName ||
    '시설명 확인 필요'
  );
}

function getDisplayFacilityName(
  fullPlaceName
) {
  const parts = cleanText(
    fullPlaceName
  )
    .split('>')
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    parts.at(-1) ||
    cleanText(fullPlaceName) ||
    '시설명 확인 필요'
  );
}

function getStatusRank(statusText) {
  const text = cleanText(statusText);

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
    text.includes('종료')
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
    hash ^= value.charCodeAt(index);

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
  locationType,
  district,
  fullPlaceName
) {
  const hashSource = [
    locationType,
    district ?? '',
    fullPlaceName,
  ].join('|');

  return `seoul-sports-${hashText(
    hashSource
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
      '체육시설',

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
  const categoryCounts =
    new Map();

  for (
    const reservation of
      reservations
  ) {
    const category =
      reservation.category ||
      '기타';

    categoryCounts.set(
      category,
      (
        categoryCounts.get(
          category
        ) ?? 0
      ) + 1
    );
  }

  return (
    [...categoryCounts.entries()]
      .sort((first, second) => {
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
      })[0]?.[0] ?? '기타'
  );
}

function createFacility(
  groupRows,
  locationInfo
) {
  const firstRow =
    groupRows[0];

  const fullPlaceName =
    getPlaceName(firstRow);

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

  return {
    id: createFacilityId(
      locationInfo.locationType,
      locationInfo.district,
      fullPlaceName
    ),

    name:
      getDisplayFacilityName(
        fullPlaceName
      ),

    fullPlaceName,

    locationType:
      locationInfo.locationType,

    district:
      locationInfo.district,

    locationLabel:
      locationInfo.locationLabel,

    outsideRegionId:
      locationInfo.outsideRegionId,

    primaryCategory:
      getMostCommonCategory(
        reservations
      ),

    categoryNames,

    longitude,

    latitude,

    imageUrl,

    officialUrl,

    reservationCount:
      reservations.length,

    reservations,
  };
}

const insideRows =
  readJson(insideRawPath);

const reviewRows =
  readJson(reviewRawPath);

const serviceIdMap =
  new Map();

let duplicateReservationCount = 0;

for (
  const row of [
    ...insideRows,
    ...reviewRows,
  ]
) {
  const serviceId =
    cleanText(row?.SVCID);

  const fallbackId = [
    cleanText(row?.SVCNM),
    cleanText(row?.PLACENM),
    cleanText(row?.RCPTBGNDT),
  ].join('|');

  const uniqueKey =
    serviceId || fallbackId;

  if (
    serviceIdMap.has(uniqueKey)
  ) {
    duplicateReservationCount += 1;
    continue;
  }

  serviceIdMap.set(
    uniqueKey,
    row
  );
}

const uniqueRows =
  [...serviceIdMap.values()];

const insideGroups =
  new Map();

const outsideGroups =
  new Map();

for (const row of uniqueRows) {
  const district =
    cleanText(row?.AREANM);

  const fullPlaceName =
    getPlaceName(row);

  if (district.endsWith('구')) {
    const groupKey = [
      district,
      fullPlaceName,
    ].join('|');

    const previousRows =
      insideGroups.get(groupKey) ??
      [];

    previousRows.push(row);

    insideGroups.set(
      groupKey,
      previousRows
    );

    continue;
  }

  const outside =
    getOutsideLocation(row);

  const groupKey = [
    outside.locationLabel,
    fullPlaceName,
  ].join('|');

  const previousRows =
    outsideGroups.get(groupKey) ??
    [];

  previousRows.push(row);

  outsideGroups.set(
    groupKey,
    previousRows
  );
}

const insideFacilities =
  [...insideGroups.values()]
    .map((groupRows) => {
      const district =
        cleanText(
          groupRows[0]?.AREANM
        );

      return createFacility(
        groupRows,
        {
          locationType:
            'insideSeoul',

          district,

          locationLabel:
            `서울 ${district}`,

          outsideRegionId:
            null,
        }
      );
    })
    .sort((first, second) => {
      const districtDifference =
        String(
          first.district ?? ''
        ).localeCompare(
          String(
            second.district ?? ''
          ),
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

const outsideFacilities =
  [...outsideGroups.values()]
    .map((groupRows) => {
      const outside =
        getOutsideLocation(
          groupRows[0]
        );

      return createFacility(
        groupRows,
        {
          locationType:
            'seoulOperatedOutside',

          district:
            null,

          locationLabel:
            outside.locationLabel,

          outsideRegionId:
            outside.outsideRegionId,
        }
      );
    })
    .sort((first, second) => {
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
    });

const facilities = [
  ...insideFacilities,
  ...outsideFacilities,
];

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

const districts =
  [
    ...new Set(
      insideFacilities
        .map(
          (facility) =>
            facility.district
        )
        .filter(Boolean)
    ),
  ].sort((first, second) =>
    first.localeCompare(
      second,
      'ko'
    )
  );

const facilitiesWithoutCoordinates =
  facilities.filter(
    (facility) =>
      facility.longitude === null ||
      facility.latitude === null
  );

const summary = {
  generatedAt:
    new Date().toISOString(),

  sourceReservationCount:
    insideRows.length +
    reviewRows.length,

  uniqueReservationCount:
    uniqueRows.length,

  duplicateReservationCount,

  insideSeoulReservationCount:
    insideRows.length,

  outsideReservationCount:
    reviewRows.length,

  totalFacilityCount:
    facilities.length,

  insideSeoulFacilityCount:
    insideFacilities.length,

  outsideFacilityCount:
    outsideFacilities.length,

  districtCount:
    districts.length,

  districts,

  categoryCounts,

  facilityWithoutCoordinateCount:
    facilitiesWithoutCoordinates.length,

  facilitiesWithoutCoordinates:
    facilitiesWithoutCoordinates.map(
      (facility) => ({
        id: facility.id,
        name: facility.name,
        district:
          facility.district,
        locationLabel:
          facility.locationLabel,
      })
    ),

  outsideFacilities:
    outsideFacilities.map(
      (facility) => ({
        id: facility.id,
        name: facility.name,
        fullPlaceName:
          facility.fullPlaceName,
        locationLabel:
          facility.locationLabel,
        reservationCount:
          facility.reservationCount,
      })
    ),
};

const dataFileSource = `export type SeoulSportsLocationType =
  | 'insideSeoul'
  | 'seoulOperatedOutside';

export type SeoulSportsReservation = {
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

export type SeoulSportsFacility = {
  id: string;
  name: string;
  fullPlaceName: string;
  locationType: SeoulSportsLocationType;
  district: string | null;
  locationLabel: string;
  outsideRegionId: string | null;
  primaryCategory: string;
  categoryNames: readonly string[];
  longitude: number | null;
  latitude: number | null;
  imageUrl: string;
  officialUrl: string;
  reservationCount: number;
  reservations: readonly SeoulSportsReservation[];
};

export const SEOUL_SPORTS_RESERVATION_COUNT =
  ${uniqueRows.length};

export const SEOUL_SPORTS_FACILITY_COUNT =
  ${facilities.length};

export const SEOUL_SPORTS_FACILITIES:
  readonly SeoulSportsFacility[] =
${JSON.stringify(facilities, null, 2)};
`;

const selectorsFileSource = `import {
  SEOUL_SPORTS_FACILITIES,
  type SeoulSportsFacility,
  type SeoulSportsReservation,
} from './seoulSportsFacilities';

export type RootSportsReservationStatus =
  | 'open'
  | 'scheduled'
  | 'closed'
  | 'unknown';

export type SeoulSportsFacilitySummary = {
  facility: SeoulSportsFacility;
  primaryReservation:
    SeoulSportsReservation | null;
  status:
    RootSportsReservationStatus;
  statusLabel: string;
  openReservationCount: number;
  scheduledReservationCount: number;
};

function parseSeoulSportsDate(
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

export function getSportsReservationStatus(
  reservation:
    SeoulSportsReservation,
  now = new Date()
): RootSportsReservationStatus {
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
    statusText.includes('종료')
  ) {
    return 'closed';
  }

  const receptionStart =
    parseSeoulSportsDate(
      reservation.receptionStartAt
    );

  const receptionEnd =
    parseSeoulSportsDate(
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

export function getSportsStatusLabel(
  status:
    RootSportsReservationStatus
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

function getReservationSortRank(
  status:
    RootSportsReservationStatus
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

export function getPrimarySportsReservation(
  facility:
    SeoulSportsFacility,
  now = new Date()
) {
  const sorted =
    [...facility.reservations].sort(
      (first, second) => {
        const firstStatus =
          getSportsReservationStatus(
            first,
            now
          );

        const secondStatus =
          getSportsReservationStatus(
            second,
            now
          );

        const rankDifference =
          getReservationSortRank(
            firstStatus
          ) -
          getReservationSortRank(
            secondStatus
          );

        if (
          rankDifference !== 0
        ) {
          return rankDifference;
        }

        return first.title.localeCompare(
          second.title,
          'ko'
        );
      }
    );

  return sorted[0] ?? null;
}

export function getSportsFacilitySummary(
  facility:
    SeoulSportsFacility,
  now = new Date()
): SeoulSportsFacilitySummary {
  let openReservationCount = 0;
  let scheduledReservationCount = 0;

  for (
    const reservation of
      facility.reservations
  ) {
    const status =
      getSportsReservationStatus(
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
    getPrimarySportsReservation(
      facility,
      now
    );

  const status =
    primaryReservation
      ? getSportsReservationStatus(
          primaryReservation,
          now
        )
      : 'unknown';

  return {
    facility,
    primaryReservation,
    status,
    statusLabel:
      getSportsStatusLabel(status),
    openReservationCount,
    scheduledReservationCount,
  };
}

export function getSportsFacilitySummaries(
  now = new Date()
) {
  return SEOUL_SPORTS_FACILITIES
    .map((facility) =>
      getSportsFacilitySummary(
        facility,
        now
      )
    )
    .sort((first, second) => {
      const statusOrder = {
        open: 0,
        scheduled: 1,
        unknown: 2,
        closed: 3,
      } as const;

      const statusDifference =
        statusOrder[first.status] -
        statusOrder[second.status];

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      return first.facility.name.localeCompare(
        second.facility.name,
        'ko'
      );
    });
}

export function getInsideSeoulSportsSummaries(
  now = new Date()
) {
  return getSportsFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.locationType ===
      'insideSeoul'
  );
}

export function getSeoulOperatedOutsideSportsSummaries(
  now = new Date()
) {
  return getSportsFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.locationType ===
      'seoulOperatedOutside'
  );
}

export function getSportsSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getInsideSeoulSportsSummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.district ===
      normalizedDistrict
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

console.log('');
console.log(
  '===== 서울 체육시설 데이터 생성 결과 ====='
);
console.log(
  `전체 예약상품: ${summary.uniqueReservationCount}개`
);
console.log(
  `서울 안 시설: ${summary.insideSeoulFacilityCount}곳`
);
console.log(
  `서울시 운영 외부 시설: ${summary.outsideFacilityCount}곳`
);
console.log(
  `전체 시설: ${summary.totalFacilityCount}곳`
);
console.log(
  `데이터가 있는 자치구: ${summary.districtCount}개`
);
console.log(
  `좌표 없는 시설: ${summary.facilityWithoutCoordinateCount}곳`
);
console.log('');
console.log(
  '===== 서울시 운영 외부 체육시설 ====='
);

for (
  const facility of
    summary.outsideFacilities
) {
  console.log(
    `- ${facility.locationLabel} / ` +
    `${facility.name} / ` +
    `${facility.reservationCount}개 상품`
  );
}

console.log('');
console.log(
  '생성 완료: store/seoulSportsFacilities.ts'
);
console.log(
  '생성 완료: store/seoulSportsSelectors.ts'
);
console.log(
  '생성 완료: tmp/seoul-sports-normalized-summary.json'
);
