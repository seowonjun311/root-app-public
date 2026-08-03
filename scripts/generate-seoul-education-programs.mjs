import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

const allRawPath = path.join(
  projectRoot,
  'tmp',
  'seoul-education-all-raw.json'
);

const outputDataPath = path.join(
  projectRoot,
  'store',
  'seoulEducationPrograms.ts'
);

const outputSelectorsPath = path.join(
  projectRoot,
  'store',
  'seoulEducationSelectors.ts'
);

const outputSummaryPath = path.join(
  projectRoot,
  'tmp',
  'seoul-education-normalized-summary.json'
);

const outputExcludedPath = path.join(
  projectRoot,
  'tmp',
  'seoul-education-excluded.json'
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

  const result = JSON.parse(source);

  return Array.isArray(result)
    ? result
    : [];
}

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
    .replace(/&#(\d+);/g, (
      _match,
      code
    ) => {
      const parsed = Number(code);

      return Number.isFinite(parsed)
        ? String.fromCodePoint(parsed)
        : '';
    });
}

function stripHtml(value) {
  return decodeHtmlEntities(
    cleanText(value)
      .replace(
        /<br\s*\/?>/gi,
        '\n'
      )
      .replace(
        /<\/p>/gi,
        '\n'
      )
      .replace(
        /<[^>]+>/g,
        ' '
      )
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

  return `${text.slice(
    0,
    maximumLength
  ).trim()}…`;
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
    row?.SVCNM,
    row?.PLACENM,
    row?.MINCLASSNM,
    row?.MAXCLASSNM,
    row?.USETGTINFO,
    row?.DTLCONT,
  ]
    .map(stripHtml)
    .join(' ');
}

function getLocationInfo(row) {
  const areaName =
    cleanText(row?.AREANM);

  const searchText =
    getSearchText(row);

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

  const seongdongTerms = [
    '성동 가드닝',
    '성동가드닝',
    '성동구 성동가드닝센터',
  ];

  if (
    seongdongTerms.some(
      (term) =>
        searchText.includes(term)
    )
  ) {
    return {
      operationScope:
        'insideSeoul',

      district:
        '성동구',

      locationLabel:
        '서울 성동구',

      corrected:
        true,
    };
  }

  if (
    searchText.includes(
      '서울도시건축학교'
    )
  ) {
    return {
      operationScope:
        'insideSeoul',

      district:
        '중구',

      locationLabel:
        '서울 중구',

      corrected:
        true,
    };
  }

  if (
    searchText.includes(
      '서울대공원'
    ) ||
    searchText.includes(
      '동물해설 단체교육'
    ) ||
    searchText.includes(
      '희망 힐링 주 아카데미'
    )
  ) {
    return {
      operationScope:
        'seoulOperatedOutside',

      district:
        null,

      locationLabel:
        '경기 과천',

      corrected:
        true,
    };
  }

  if (
    searchText.includes(
      '서울시립승화원'
    )
  ) {
    return {
      operationScope:
        'seoulOperatedOutside',

      district:
        null,

      locationLabel:
        '경기 고양',

      corrected:
        true,
    };
  }

  return {
    operationScope:
      'review',

    district:
      null,

    locationLabel:
      areaName ||
      '지역 확인 필요',

    corrected:
      false,
  };
}

function getExclusionReason(row) {
  const searchText =
    getSearchText(row);

  const militaryTerms = [
    '예비군',
    '동원훈련',
    '전투복',
    '전투화',
    '수송버스',
    '훈련복장 대여',
  ];

  if (
    militaryTerms.some(
      (term) =>
        searchText.includes(term)
    )
  ) {
    return 'militarySupport';
  }

  return null;
}

function getEducationCategory(
  row
) {
  const originalCategory =
    cleanText(row?.MINCLASSNM);

  /*
   * 프로그램 분야는 이용 대상과 분리합니다.
   * USETGTINFO의 '가족', '어린이' 같은 문구는
   * audienceTags에서만 사용합니다.
   */
  const searchText = [
    row?.SVCNM,
    row?.PLACENM,
    row?.MINCLASSNM,
    row?.MAXCLASSNM,
    row?.DTLCONT,
  ]
    .map(stripHtml)
    .join(' ');

  const hasAny = (
    terms
  ) =>
    terms.some(
      (term) =>
        searchText.includes(term)
    );

  if (
    hasAny([
      '요리',
      '쿠킹',
      '음식',
      '식생활',
      '식문화',
      '제과',
      '제빵',
      '베이킹',
      '김치',
      '떡 만들기',
      '바리스타',
      '커피',
      '푸드',
    ])
  ) {
    return 'cookingFood';
  }

  if (
    originalCategory ===
      '공예/취미' ||
    originalCategory ===
      '미술제작' ||
    hasAny([
      '공예',
      '만들기',
      '목공',
      '도예',
      '도자',
      '라탄',
      '뜨개',
      '가죽',
      '염색',
      '비누',
      '캔들',
      '조향',
      '재봉',
      '드로잉',
      '그림',
      '미술',
      '회화',
      '캘리',
    ])
  ) {
    return 'craftMaking';
  }

  if (
    originalCategory ===
      '도시농업' ||
    hasAny([
      '도시농업',
      '텃밭',
      '농사',
      '농업',
      '작물',
      '모종',
      '수확',
      '농부',
    ])
  ) {
    return 'urbanAgriculture';
  }

  if (
    originalCategory ===
      '정보통신' ||
    hasAny([
      '코딩',
      '로봇',
      '인공지능',
      ' AI ',
      '디지털',
      '컴퓨터',
      '소프트웨어',
      '메이커',
      '3D',
      '드론',
      '과학실험',
      '천문',
      '우주',
    ])
  ) {
    return 'scienceDigital';
  }

  if (
    originalCategory ===
      '역사' ||
    hasAny([
      '역사',
      '문화재',
      '궁궐',
      '박물관',
      '유적',
      '전통',
      '역사해설',
      '건축',
      '도시문화',
      '문화 탐방',
    ])
  ) {
    return 'historyCulture';
  }

  if (
    originalCategory ===
      '자연/과학' ||
    hasAny([
      '환경',
      '생태',
      '자연',
      '숲',
      '식물',
      '가드닝',
      '정원',
      '원예',
      '동물',
      '곤충',
      '기후',
      '에너지',
      '재활용',
      '업사이클',
      '생물',
      '꿀벌',
      '테라리움',
    ])
  ) {
    return 'natureEnvironment';
  }

  if (
    originalCategory ===
      '스포츠' ||
    hasAny([
      '스포츠',
      '체육',
      '운동',
      '건강',
      '안전',
      '응급',
      '심폐',
      '수영',
      '축구',
      '농구',
      '배드민턴',
      '요가',
      '필라테스',
      '걷기',
      '자전거',
    ])
  ) {
    return 'healthSportsSafety';
  }

  if (
    originalCategory ===
      '청년정보' ||
    originalCategory ===
      '전문/자격증' ||
    hasAny([
      '청년',
      '진로',
      '취업',
      '창업',
      '직업',
      '자격증',
      '면접',
      '포트폴리오',
      '재무',
      '금융',
      '노동',
    ])
  ) {
    return 'careerYouth';
  }

  if (
    originalCategory ===
      '교양/어학' ||
    hasAny([
      '교양',
      '어학',
      '영어',
      '중국어',
      '일본어',
      '글쓰기',
      '독서',
      '인문',
      '철학',
    ])
  ) {
    return 'liberalArtsLanguage';
  }

  /*
   * 단순히 '가족 대상'인 프로그램은 제외하고,
   * 실제 부모교육·양육·가족관계 프로그램만 분류합니다.
   */
  if (
    hasAny([
      '부모교육',
      '부모 교육',
      '부모 코칭',
      '부모상담',
      '양육',
      '육아',
      '가족관계',
      '가족 관계',
      '부부교육',
      '부부 교육',
      '아빠교육',
      '엄마교육',
    ])
  ) {
    return 'familyParenting';
  }

  return 'other';
}
function getAudienceTags(row) {
  const searchText = [
    row?.SVCNM,
    row?.USETGTINFO,
    row?.DTLCONT,
  ]
    .map(stripHtml)
    .join(' ');

  const tags = [];

  const add = (
    tag
  ) => {
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  };

  if (
    /누구나|전 시민|전국민|모든 시민|전체 대상/.test(
      searchText
    )
  ) {
    add('all');
  }

  if (
    /유아|영유아|어린이|아동|초등/.test(
      searchText
    )
  ) {
    add('children');
  }

  if (
    /청소년|중학생|고등학생/.test(
      searchText
    )
  ) {
    add('teen');
  }

  if (
    /청년/.test(searchText)
  ) {
    add('youth');
  }

  if (
    /성인|대학생|직장인/.test(
      searchText
    )
  ) {
    add('adult');
  }

  if (
    /어르신|노인|시니어|65세/.test(
      searchText
    )
  ) {
    add('senior');
  }

  if (
    /가족|부모|보호자|엄마|아빠/.test(
      searchText
    )
  ) {
    add('family');
  }

  if (tags.length === 0) {
    add('unspecified');
  }

  return tags;
}

function getPlaceFullName(row) {
  return (
    decodeHtmlEntities(
      row?.PLACENM
    ) ||
    decodeHtmlEntities(
      row?.SVCNM
    ) ||
    '장소 확인 필요'
  );
}

function getPlaceDisplayName(
  fullPlaceName
) {
  const parts =
    cleanText(fullPlaceName)
      .split('>')
      .map(
        (item) => item.trim()
      )
      .filter(Boolean);

  return (
    parts[
      parts.length - 1
    ] ||
    fullPlaceName
  );
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

function createPlaceId(
  operationScope,
  district,
  locationLabel,
  fullPlaceName
) {
  return `seoul-education-${hashText(
    [
      operationScope,
      district ?? '',
      locationLabel,
      fullPlaceName,
    ].join('|')
  )}`;
}

function normalizeProgram(row) {
  return {
    serviceId:
      cleanText(row?.SVCID),

    title:
      decodeHtmlEntities(
        row?.SVCNM
      ),

    originalCategory:
      cleanText(
        row?.MINCLASSNM
      ) || '기타',

    category:
      getEducationCategory(row),

    statusText:
      cleanText(
        row?.SVCSTATNM
      ) || '상태 미확인',

    paidType:
      cleanText(row?.PAYATNM),

    targetText:
      stripHtml(
        row?.USETGTINFO
      ),

    audienceTags:
      getAudienceTags(row),

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
      limitText(
        row?.DTLCONT,
        1800
      ),
  };
}

function getStatusRank(
  statusText
) {
  const text =
    cleanText(statusText);

  if (text.includes('접수중')) {
    return 0;
  }

  if (text.includes('안내중')) {
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

function getMostCommonValue(
  values,
  fallback
) {
  const counts = new Map();

  for (const value of values) {
    const normalized =
      cleanText(value);

    if (!normalized) {
      continue;
    }

    counts.set(
      normalized,
      (
        counts.get(
          normalized
        ) ?? 0
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

  return (
    sorted[0]?.[0] ??
    fallback
  );
}

function createEducationPlace(
  rows
) {
  const firstRow = rows[0];

  const location =
    getLocationInfo(firstRow);

  const fullPlaceName =
    getPlaceFullName(firstRow);

  const programs =
    rows
      .map(normalizeProgram)
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
    const coordinates =
      getCoordinates(row);

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

  const category =
    getMostCommonValue(
      programs.map(
        (program) =>
          program.category
      ),
      'other'
    );

  const categoryNames =
    [
      ...new Set(
        programs.map(
          (program) =>
            program.category
        )
      ),
    ].sort();

  const originalCategoryNames =
    [
      ...new Set(
        programs.map(
          (program) =>
            program.originalCategory
        )
      ),
    ].sort(
      (first, second) =>
        first.localeCompare(
          second,
          'ko'
        )
    );

  return {
    id:
      createPlaceId(
        location.operationScope,
        location.district,
        location.locationLabel,
        fullPlaceName
      ),

    name:
      getPlaceDisplayName(
        fullPlaceName
      ),

    fullPlaceName,

    operationScope:
      location.operationScope,

    district:
      location.district,

    locationLabel:
      location.locationLabel,

    primaryCategory:
      category,

    categoryNames,

    originalCategoryNames,

    longitude,

    latitude,

    imageUrl,

    officialUrl,

    programCount:
      programs.length,

    programs,
  };
}

const allRows =
  readJson(allRawPath);

const uniqueRows = [];
const excludedRows = [];
const reviewRows = [];
const serviceKeys = new Set();

let duplicateProgramCount = 0;

for (const row of allRows) {
  const serviceId =
    cleanText(row?.SVCID);

  const fallbackKey = [
    cleanText(row?.SVCNM),
    cleanText(row?.PLACENM),
    cleanText(row?.RCPTBGNDT),
  ].join('|');

  const uniqueKey =
    serviceId ||
    fallbackKey;

  if (
    serviceKeys.has(
      uniqueKey
    )
  ) {
    duplicateProgramCount += 1;
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
        serviceId,

      title:
        decodeHtmlEntities(
          row?.SVCNM
        ),

      placeName:
        decodeHtmlEntities(
          row?.PLACENM
        ),

      areaName:
        cleanText(row?.AREANM),
    });

    continue;
  }

  const location =
    getLocationInfo(row);

  if (
    location.operationScope ===
    'review'
  ) {
    reviewRows.push({
      serviceId:
        serviceId,

      title:
        decodeHtmlEntities(
          row?.SVCNM
        ),

      placeName:
        decodeHtmlEntities(
          row?.PLACENM
        ),

      areaName:
        cleanText(row?.AREANM),
    });

    continue;
  }

  uniqueRows.push(row);
}

const placeGroups = new Map();

for (const row of uniqueRows) {
  const location =
    getLocationInfo(row);

  const fullPlaceName =
    getPlaceFullName(row);

  const groupKey = [
    location.operationScope,
    location.district ?? '',
    location.locationLabel,
    fullPlaceName,
  ].join('|');

  const groupRows =
    placeGroups.get(
      groupKey
    ) ?? [];

  groupRows.push(row);

  placeGroups.set(
    groupKey,
    groupRows
  );
}

const places =
  [...placeGroups.values()]
    .map(createEducationPlace)
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
      }
    );

const insidePlaces =
  places.filter(
    (place) =>
      place.operationScope ===
      'insideSeoul'
  );

const outsidePlaces =
  places.filter(
    (place) =>
      place.operationScope ===
      'seoulOperatedOutside'
  );

const includedPrograms =
  places.flatMap(
    (place) =>
      place.programs
  );

const categoryCountMap =
  new Map();

for (
  const program of
    includedPrograms
) {
  categoryCountMap.set(
    program.category,
    (
      categoryCountMap.get(
        program.category
      ) ?? 0
    ) + 1
  );
}

const categoryCounts =
  [...categoryCountMap.entries()]
    .map(
      ([
        category,
        programCount,
      ]) => ({
        category,
        programCount,
      })
    )
    .sort(
      (first, second) =>
        second.programCount -
        first.programCount
    );

const districts =
  [
    ...new Set(
      insidePlaces
        .map(
          (place) =>
            place.district
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

const districtCounts =
  districts.map((district) => {
    const districtPlaces =
      insidePlaces.filter(
        (place) =>
          place.district ===
          district
      );

    return {
      district,

      placeCount:
        districtPlaces.length,

      programCount:
        districtPlaces.reduce(
          (
            total,
            place
          ) =>
            total +
            place.programCount,
          0
        ),
    };
  });

const placesWithoutCoordinates =
  places.filter(
    (place) =>
      place.longitude === null ||
      place.latitude === null
  );

const correctedRows =
  allRows
    .map((row) => {
      const originalAreaName =
        cleanText(row?.AREANM);

      const location =
        getLocationInfo(row);

      if (
        !location.corrected
      ) {
        return null;
      }

      return {
        serviceId:
          cleanText(row?.SVCID),

        title:
          decodeHtmlEntities(
            row?.SVCNM
          ),

        originalAreaName,

        operationScope:
          location.operationScope,

        district:
          location.district,

        locationLabel:
          location.locationLabel,
      };
    })
    .filter(Boolean);

const summary = {
  generatedAt:
    new Date().toISOString(),

  sourceProgramCount:
    allRows.length,

  includedProgramCount:
    includedPrograms.length,

  excludedProgramCount:
    excludedRows.length,

  reviewProgramCount:
    reviewRows.length,

  duplicateProgramCount,

  totalPlaceCount:
    places.length,

  insideSeoulProgramCount:
    insidePlaces.reduce(
      (
        total,
        place
      ) =>
        total +
        place.programCount,
      0
    ),

  insideSeoulPlaceCount:
    insidePlaces.length,

  outsideProgramCount:
    outsidePlaces.reduce(
      (
        total,
        place
      ) =>
        total +
        place.programCount,
      0
    ),

  outsidePlaceCount:
    outsidePlaces.length,

  districtCount:
    districts.length,

  districtCounts,

  categoryCounts,

  placeWithoutCoordinateCount:
    placesWithoutCoordinates.length,

  placesWithoutCoordinates:
    placesWithoutCoordinates.map(
      (place) => ({
        id:
          place.id,

        name:
          place.name,

        district:
          place.district,

        locationLabel:
          place.locationLabel,

        operationScope:
          place.operationScope,
      })
    ),

  correctedRows,

  reviewRows,
};

const dataFileSource = `export type SeoulEducationCategory =
  | 'craftMaking'
  | 'cookingFood'
  | 'natureEnvironment'
  | 'urbanAgriculture'
  | 'familyParenting'
  | 'historyCulture'
  | 'scienceDigital'
  | 'healthSportsSafety'
  | 'careerYouth'
  | 'liberalArtsLanguage'
  | 'other';

export type SeoulEducationAudience =
  | 'all'
  | 'children'
  | 'teen'
  | 'youth'
  | 'adult'
  | 'senior'
  | 'family'
  | 'unspecified';

export type SeoulEducationOperationScope =
  | 'insideSeoul'
  | 'seoulOperatedOutside';

export type SeoulEducationProgram = {
  serviceId: string;
  title: string;
  originalCategory: string;
  category: SeoulEducationCategory;
  statusText: string;
  paidType: string;
  targetText: string;
  audienceTags:
    readonly SeoulEducationAudience[];
  receptionStartAt: string | null;
  receptionEndAt: string | null;
  useStartAt: string | null;
  useEndAt: string | null;
  serviceUrl: string;
  imageUrl: string;
  telephone: string;
  detailText: string;
};

export type SeoulEducationPlace = {
  id: string;
  name: string;
  fullPlaceName: string;
  operationScope:
    SeoulEducationOperationScope;
  district: string | null;
  locationLabel: string;
  primaryCategory:
    SeoulEducationCategory;
  categoryNames:
    readonly SeoulEducationCategory[];
  originalCategoryNames:
    readonly string[];
  longitude: number | null;
  latitude: number | null;
  imageUrl: string;
  officialUrl: string;
  programCount: number;
  programs:
    readonly SeoulEducationProgram[];
};

export const SEOUL_EDUCATION_PROGRAM_COUNT =
  ${includedPrograms.length};

export const SEOUL_EDUCATION_PLACE_COUNT =
  ${places.length};

export const SEOUL_EDUCATION_PLACES:
  readonly SeoulEducationPlace[] =
${JSON.stringify(
  places,
  null,
  2
)};
`;

const selectorsFileSource = `import {
  SEOUL_EDUCATION_PLACES,
  type SeoulEducationAudience,
  type SeoulEducationCategory,
  type SeoulEducationPlace,
  type SeoulEducationProgram,
} from './seoulEducationPrograms';

export type RootEducationStatus =
  | 'open'
  | 'scheduled'
  | 'paused'
  | 'closed'
  | 'unknown';

export type SeoulEducationPlaceSummary = {
  place: SeoulEducationPlace;
  primaryProgram:
    SeoulEducationProgram | null;
  status: RootEducationStatus;
  statusLabel: string;
  openProgramCount: number;
  scheduledProgramCount: number;
};

function parseEducationDate(
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

export function getEducationProgramStatus(
  program:
    SeoulEducationProgram,
  now = new Date()
): RootEducationStatus {
  const statusText =
    program.statusText.trim();

  if (
    statusText.includes('접수중')
  ) {
    return 'open';
  }

  if (
    statusText.includes('안내중')
  ) {
    return 'scheduled';
  }

  if (
    statusText.includes(
      '예약일시중지'
    )
  ) {
    return 'paused';
  }

  if (
    statusText.includes('마감') ||
    statusText.includes('종료')
  ) {
    return 'closed';
  }

  const receptionStart =
    parseEducationDate(
      program.receptionStartAt
    );

  const receptionEnd =
    parseEducationDate(
      program.receptionEndAt
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

export function getEducationStatusLabel(
  status:
    RootEducationStatus
) {
  if (status === 'open') {
    return '접수 중';
  }

  if (status === 'scheduled') {
    return '접수 예정';
  }

  if (status === 'paused') {
    return '예약 일시중지';
  }

  if (status === 'closed') {
    return '예약 마감';
  }

  return '상태 확인';
}

export function getEducationCategoryLabel(
  category:
    SeoulEducationCategory
) {
  if (
    category ===
    'craftMaking'
  ) {
    return '공예·만들기';
  }

  if (
    category ===
    'cookingFood'
  ) {
    return '요리·식생활';
  }

  if (
    category ===
    'natureEnvironment'
  ) {
    return '환경·생태';
  }

  if (
    category ===
    'urbanAgriculture'
  ) {
    return '도시농업';
  }

  if (
    category ===
    'familyParenting'
  ) {
    return '가족·부모';
  }

  if (
    category ===
    'historyCulture'
  ) {
    return '역사·문화';
  }

  if (
    category ===
    'scienceDigital'
  ) {
    return '과학·디지털';
  }

  if (
    category ===
    'healthSportsSafety'
  ) {
    return '건강·체육·안전';
  }

  if (
    category ===
    'careerYouth'
  ) {
    return '진로·청년';
  }

  if (
    category ===
    'liberalArtsLanguage'
  ) {
    return '교양·어학';
  }

  return '기타';
}

export function getEducationAudienceLabel(
  audience:
    SeoulEducationAudience
) {
  if (audience === 'all') {
    return '누구나';
  }

  if (
    audience === 'children'
  ) {
    return '어린이';
  }

  if (audience === 'teen') {
    return '청소년';
  }

  if (audience === 'youth') {
    return '청년';
  }

  if (audience === 'adult') {
    return '성인';
  }

  if (audience === 'senior') {
    return '어르신';
  }

  if (audience === 'family') {
    return '가족';
  }

  return '대상 확인';
}

function getEducationStatusRank(
  status:
    RootEducationStatus
) {
  if (status === 'open') {
    return 0;
  }

  if (
    status === 'scheduled'
  ) {
    return 1;
  }

  if (status === 'paused') {
    return 2;
  }

  if (status === 'unknown') {
    return 3;
  }

  return 4;
}

export function getPrimaryEducationProgram(
  place:
    SeoulEducationPlace,
  now = new Date()
) {
  const programs =
    [...place.programs].sort(
      (first, second) => {
        const statusDifference =
          getEducationStatusRank(
            getEducationProgramStatus(
              first,
              now
            )
          ) -
          getEducationStatusRank(
            getEducationProgramStatus(
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

  return programs[0] ?? null;
}

export function getEducationPlaceSummary(
  place:
    SeoulEducationPlace,
  now = new Date()
): SeoulEducationPlaceSummary {
  let openProgramCount = 0;
  let scheduledProgramCount = 0;

  for (
    const program of
      place.programs
  ) {
    const status =
      getEducationProgramStatus(
        program,
        now
      );

    if (status === 'open') {
      openProgramCount += 1;
    }

    if (
      status === 'scheduled'
    ) {
      scheduledProgramCount += 1;
    }
  }

  const primaryProgram =
    getPrimaryEducationProgram(
      place,
      now
    );

  const status =
    primaryProgram
      ? getEducationProgramStatus(
          primaryProgram,
          now
        )
      : 'unknown';

  return {
    place,
    primaryProgram,
    status,
    statusLabel:
      getEducationStatusLabel(
        status
      ),
    openProgramCount,
    scheduledProgramCount,
  };
}

export function getEducationPlaceSummaries(
  now = new Date()
) {
  return SEOUL_EDUCATION_PLACES
    .map((place) =>
      getEducationPlaceSummary(
        place,
        now
      )
    )
    .sort((first, second) => {
      const statusDifference =
        getEducationStatusRank(
          first.status
        ) -
        getEducationStatusRank(
          second.status
        );

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      const districtDifference =
        first.place.locationLabel.localeCompare(
          second.place.locationLabel,
          'ko'
        );

      if (
        districtDifference !== 0
      ) {
        return districtDifference;
      }

      return first.place.name.localeCompare(
        second.place.name,
        'ko'
      );
    });
}

export function getInsideSeoulEducationSummaries(
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.operationScope ===
      'insideSeoul'
  );
}

export function getSeoulOperatedOutsideEducationSummaries(
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.operationScope ===
      'seoulOperatedOutside'
  );
}

export function getEducationSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getInsideSeoulEducationSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.district ===
      normalizedDistrict
  );
}

export function getEducationSummariesByCategory(
  category:
    SeoulEducationCategory,
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.categoryNames.includes(
        category
      )
  );
}

export function getEducationSummariesByAudience(
  audience:
    SeoulEducationAudience,
  now = new Date()
) {
  return getEducationPlaceSummaries(
    now
  ).filter(
    (summary) =>
      summary.place.programs.some(
        (program) =>
          program.audienceTags.includes(
            audience
          )
      )
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
    {
      excludedRows,
      reviewRows,
    },
    null,
    2
  )}\n`,
  'utf8'
);

console.log('');
console.log(
  '===== 서울 교육·체험 데이터 생성 결과 ====='
);

console.log(
  `원본 프로그램: ${summary.sourceProgramCount}개`
);

console.log(
  `포함된 프로그램: ${summary.includedProgramCount}개`
);

console.log(
  `서울 안 프로그램: ${summary.insideSeoulProgramCount}개`
);

console.log(
  `서울시 운영 외부 프로그램: ${summary.outsideProgramCount}개`
);

console.log(
  `전체 교육 장소: ${summary.totalPlaceCount}곳`
);

console.log(
  `서울 안 교육 장소: ${summary.insideSeoulPlaceCount}곳`
);

console.log(
  `서울시 운영 외부 장소: ${summary.outsidePlaceCount}곳`
);

console.log(
  `데이터가 있는 자치구: ${summary.districtCount}개`
);

console.log(
  `좌표 없는 장소: ${summary.placeWithoutCoordinateCount}곳`
);

console.log(
  `검토 필요 프로그램: ${summary.reviewProgramCount}개`
);

console.log('');
console.log(
  '===== ROOT 교육 분류 ====='
);

for (
  const item of
    summary.categoryCounts
) {
  console.log(
    `- ${item.category}: ${item.programCount}개`
  );
}

console.log('');
console.log(
  '===== 지역 보정 결과 ====='
);

for (
  const item of
    summary.correctedRows
) {
  console.log(
    `- ${item.locationLabel} / ${item.title}`
  );
}

console.log('');
console.log(
  '생성 완료: store/seoulEducationPrograms.ts'
);

console.log(
  '생성 완료: store/seoulEducationSelectors.ts'
);

console.log(
  '생성 완료: tmp/seoul-education-normalized-summary.json'
);

console.log(
  '생성 완료: tmp/seoul-education-excluded.json'
);
