import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FestivalAudience } from './festivalCatalog';

declare const process: {
  env: {
    EXPO_PUBLIC_SEOUL_OPEN_API_KEY?: string;
    EXPO_PUBLIC_SEOUL_CULTURE_PROXY_URL?: string;
  };
};

export type SeoulCultureContentType =
  | 'performance'
  | 'exhibition'
  | 'festival'
  | 'experience'
  | 'other';

export type SeoulCultureReservationStatus =
  | 'required'
  | 'recommended'
  | 'unknown';

export type SeoulCultureVenueType =
  | 'indoor'
  | 'outdoor'
  | 'mixed'
  | 'unknown';

export type SeoulCultureEvent = {
  id: string;
  title: string;
  rawCategory: string;
  contentType: SeoulCultureContentType;
  districtName: string;
  place: string;
  organizationName: string;
  targetAudienceText: string;
  feeText: string;
  isFree: boolean | null;
  inquiry: string;
  player: string;
  program: string;
  description: string;
  officialUrl: string;
  culturePortalUrl: string;
  imageUrl: string;
  registeredAt: string | null;
  startDate: string;
  endDate: string;
  themeCode: string;
  longitude: number | null;
  latitude: number | null;
  eventTime: string;
  reservationStatus: SeoulCultureReservationStatus;
  venueType: SeoulCultureVenueType;
  audiences: FestivalAudience[];
  isLargeExhibition: boolean;
  rewardPoints: number;
  radiusMeters: number;
  sourceCheckedAt: string;
};

export type SeoulCultureFetchResult = {
  events: SeoulCultureEvent[];
  fetchedAt: string;
  isFromCache: boolean;
  isStaleCache: boolean;
  isSampleMode: boolean;
};

type SeoulCultureApiRow = {
  CODENAME?: unknown;
  GUNAME?: unknown;
  TITLE?: unknown;
  DATE?: unknown;
  PLACE?: unknown;
  ORG_NAME?: unknown;
  USE_TRGT?: unknown;
  USE_FEE?: unknown;
  INQUIRY?: unknown;
  PLAYER?: unknown;
  PROGRAM?: unknown;
  ETC_DESC?: unknown;
  ORG_LINK?: unknown;
  MAIN_IMG?: unknown;
  RGSTDATE?: unknown;
  TICKET?: unknown;
  STRTDATE?: unknown;
  END_DATE?: unknown;
  THEMECODE?: unknown;
  LOT?: unknown;
  LAT?: unknown;
  IS_FREE?: unknown;
  HMPG_ADDR?: unknown;
  PRO_TIME?: unknown;
};

type SeoulCultureApiEnvelope = {
  culturalEventInfo?: {
    list_total_count?: unknown;
    RESULT?: {
      CODE?: unknown;
      MESSAGE?: unknown;
    };
    row?: SeoulCultureApiRow[];
  };
  RESULT?: {
    CODE?: unknown;
    MESSAGE?: unknown;
  };
};

type SeoulCultureCache = {
  fetchedAt: string;
  events: SeoulCultureEvent[];
  isSampleMode: boolean;
};

const SEOUL_CULTURE_CACHE_KEY =
  'root_seoul_culture_events_v2';
const SEOUL_CULTURE_CACHE_TTL_MS =
  6 * 60 * 60 * 1000;
const SEOUL_CULTURE_MAX_ROWS = 3000;
const SEOUL_CULTURE_PAGE_SIZE = 1000;
const SEOUL_CULTURE_SOURCE_NAME =
  '서울 열린데이터광장 문화행사 정보';

const getApiKey = () => {
  const key = String(
    process.env.EXPO_PUBLIC_SEOUL_OPEN_API_KEY ??
      'sample'
  ).trim();

  return key || 'sample';
};

const getProxyUrl = () =>
  String(
    process.env
      .EXPO_PUBLIC_SEOUL_CULTURE_PROXY_URL ?? ''
  ).trim();

const cleanText = (value: unknown) =>
  String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeUrl = (value: unknown) => {
  const url = cleanText(value);

  if (!url) {
    return '';
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  return url;
};

const parseDatePart = (value: unknown) => {
  const text = cleanText(value);
  const match = text.match(
    /(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
};

const parseDateRangeFromText = (value: unknown) => {
  const text = cleanText(value);
  const matches = [
    ...text.matchAll(
      /(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/g
    ),
  ];

  const dates = matches
    .map((match) =>
      parseDatePart(match[0])
    )
    .filter(
      (item): item is string => Boolean(item)
    );

  return {
    startDate: dates[0] ?? null,
    endDate: dates[1] ?? dates[0] ?? null,
  };
};

const parseDateRange = (
  row: SeoulCultureApiRow
) => {
  const textRange = parseDateRangeFromText(
    row.DATE
  );

  const startDate =
    parseDatePart(row.STRTDATE) ??
    textRange.startDate;
  const endDate =
    parseDatePart(row.END_DATE) ??
    textRange.endDate ??
    startDate;

  if (!startDate || !endDate) {
    return null;
  }

  return {
    startDate,
    endDate,
  };
};

const parseCoordinate = (value: unknown) => {
  const parsed = Number(
    cleanText(value).replace(/,/g, '')
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const normalizeCoordinates = (
  row: SeoulCultureApiRow
) => {
  let longitude = parseCoordinate(row.LOT);
  let latitude = parseCoordinate(row.LAT);

  if (
    longitude != null &&
    latitude != null &&
    longitude >= 37 &&
    longitude <= 38.5 &&
    latitude >= 126 &&
    latitude <= 128
  ) {
    const previousLongitude = longitude;
    longitude = latitude;
    latitude = previousLongitude;
  }

  const validLongitude =
    longitude != null &&
    longitude >= 126.5 &&
    longitude <= 127.5;
  const validLatitude =
    latitude != null &&
    latitude >= 37 &&
    latitude <= 38;

  return {
    longitude: validLongitude
      ? longitude
      : null,
    latitude: validLatitude
      ? latitude
      : null,
  };
};

const includesAny = (
  text: string,
  keywords: readonly string[]
) => keywords.some((item) => text.includes(item));

const classifyContentType = (
  rawCategory: string
): SeoulCultureContentType => {
  const category = rawCategory.toLowerCase();

  if (
    includesAny(category, [
      '전시',
      '미술',
      '사진',
      '디자인',
    ])
  ) {
    return 'exhibition';
  }

  if (category.includes('축제')) {
    return 'festival';
  }

  if (
    includesAny(category, [
      '교육',
      '체험',
      '강좌',
      '문화교양',
      '워크숍',
    ])
  ) {
    return 'experience';
  }

  if (
    includesAny(category, [
      '연극',
      '뮤지컬',
      '클래식',
      '콘서트',
      '무용',
      '국악',
      '오페라',
      '독주',
      '공연',
    ])
  ) {
    return 'performance';
  }

  return 'other';
};

const inferIsFree = (
  row: SeoulCultureApiRow
) => {
  const isFreeText = cleanText(
    row.IS_FREE
  ).toLowerCase();
  const feeText = cleanText(
    row.USE_FEE
  ).toLowerCase();

  if (
    isFreeText.includes('무료') ||
    feeText === '무료' ||
    feeText.includes('무료')
  ) {
    return true;
  }

  if (
    isFreeText.includes('유료') ||
    /\d+[,.]?\d*\s*원/.test(feeText) ||
    feeText.includes('유료')
  ) {
    return false;
  }

  return null;
};

const inferReservationStatus = (
  row: SeoulCultureApiRow
): SeoulCultureReservationStatus => {
  const text = [
    row.USE_TRGT,
    row.USE_FEE,
    row.PROGRAM,
    row.ETC_DESC,
    row.TICKET,
    row.PRO_TIME,
  ]
    .map(cleanText)
    .join(' ')
    .toLowerCase();

  if (
    includesAny(text, [
      '사전예약',
      '사전 예약',
      '예약 필수',
      '예매 필수',
      '사전신청',
      '사전 신청',
      '선착순 접수',
      '예약자',
    ])
  ) {
    return 'required';
  }

  if (
    includesAny(text, [
      '예약',
      '예매',
      '신청',
      '접수',
      '선착순',
    ])
  ) {
    return 'recommended';
  }

  return 'unknown';
};

const inferVenueType = (
  row: SeoulCultureApiRow
): SeoulCultureVenueType => {
  const text = [
    row.PLACE,
    row.TITLE,
    row.ETC_DESC,
  ]
    .map(cleanText)
    .join(' ')
    .toLowerCase();

  const outdoor = includesAny(text, [
    '광장',
    '공원',
    '야외',
    '거리',
    '한강',
    '마당',
    '정원',
    '수변',
    '운동장',
  ]);

  const indoor = includesAny(text, [
    '공연장',
    '극장',
    '미술관',
    '박물관',
    '전시실',
    '전시장',
    '아트홀',
    '센터',
    '도서관',
    '교육실',
    'hall',
    '갤러리',
  ]);

  if (outdoor && indoor) {
    return 'mixed';
  }

  if (outdoor) {
    return 'outdoor';
  }

  if (indoor) {
    return 'indoor';
  }

  return 'unknown';
};

const inferAudiences = (
  row: SeoulCultureApiRow,
  contentType: SeoulCultureContentType
): FestivalAudience[] => {
  const text = [
    row.TITLE,
    row.CODENAME,
    row.USE_TRGT,
    row.PROGRAM,
    row.ETC_DESC,
  ]
    .map(cleanText)
    .join(' ')
    .toLowerCase();

  const audiences =
    new Set<FestivalAudience>();

  if (
    includesAny(text, [
      '유아',
      '어린이',
      '아동',
      '초등',
      '키즈',
      '아이',
      '가족',
      '보호자',
    ])
  ) {
    audiences.add('children');
    audiences.add('family');
  }

  if (
    includesAny(text, [
      '청소년',
      '중학생',
      '고등학생',
      '학생',
      '8세 이상',
      '만 7세',
    ])
  ) {
    audiences.add('teen');
  }

  if (
    includesAny(text, [
      '성인',
      '대학생',
      '직장인',
      '19세',
      '만 18세',
    ])
  ) {
    audiences.add('adult');
  }

  if (
    includesAny(text, [
      '중장년',
      '중년',
      '장년',
      '시니어',
      '어르신',
      '노년',
    ])
  ) {
    audiences.add('middleAge');
  }

  if (
    includesAny(text, [
      '누구나',
      '전 연령',
      '전연령',
      '시민 누구나',
    ])
  ) {
    audiences.add('children');
    audiences.add('teen');
    audiences.add('adult');
    audiences.add('middleAge');
    audiences.add('family');
  }

  if (contentType === 'performance') {
    audiences.add('teen');
    audiences.add('adult');
  }

  if (contentType === 'exhibition') {
    audiences.add('teen');
    audiences.add('adult');
    audiences.add('middleAge');
  }

  if (contentType === 'festival') {
    audiences.add('adult');
    audiences.add('family');
  }

  if (contentType === 'experience') {
    audiences.add('teen');
    audiences.add('adult');
  }

  if (audiences.size === 0) {
    audiences.add('adult');
  }

  return [...audiences];
};

const inferLargeExhibition = (
  row: SeoulCultureApiRow,
  contentType: SeoulCultureContentType
) => {
  if (contentType !== 'exhibition') {
    return false;
  }

  const text = [
    row.TITLE,
    row.PLACE,
    row.ORG_NAME,
    row.PROGRAM,
  ]
    .map(cleanText)
    .join(' ')
    .toLowerCase();

  return includesAny(text, [
    '국립중앙박물관',
    '국립현대미술관',
    '서울시립미술관',
    '서울역사박물관',
    '세종문화회관',
    '예술의전당',
    'ddp',
    '동대문디자인플라자',
    '코엑스',
    '롯데뮤지엄',
    '리움미술관',
    '한가람미술관',
    '아모레퍼시픽미술관',
    '특별전',
    '국제전',
    '비엔날레',
    '트리엔날레',
    '회고전',
    '명품전',
    '대규모',
  ]);
};

const hashText = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0)
    .toString(36)
    .padStart(7, '0');
};

const getRewardPoints = (
  contentType: SeoulCultureContentType,
  isLargeExhibition: boolean
) => {
  if (isLargeExhibition) {
    return 30;
  }

  if (
    contentType === 'festival' ||
    contentType === 'performance'
  ) {
    return 25;
  }

  return 20;
};

const normalizeRow = (
  row: SeoulCultureApiRow,
  checkedAt: string
): SeoulCultureEvent | null => {
  const title = cleanText(row.TITLE);
  const dateRange = parseDateRange(row);

  if (!title || !dateRange) {
    return null;
  }

  const rawCategory =
    cleanText(row.CODENAME) || '기타';
  const contentType =
    classifyContentType(rawCategory);
  const place = cleanText(row.PLACE);
  const coordinates =
    normalizeCoordinates(row);
  const isLargeExhibition =
    inferLargeExhibition(row, contentType);

  const idSeed = [
    title,
    dateRange.startDate,
    dateRange.endDate,
    place,
  ]
    .join('|')
    .toLowerCase();

  return {
    id: `seoul-culture-${hashText(idSeed)}`,
    title,
    rawCategory,
    contentType,
    districtName:
      cleanText(row.GUNAME) || '서울',
    place: place || '장소 확인 필요',
    organizationName: cleanText(
      row.ORG_NAME
    ),
    targetAudienceText: cleanText(
      row.USE_TRGT
    ),
    feeText:
      cleanText(row.USE_FEE) ||
      cleanText(row.IS_FREE) ||
      '요금 확인 필요',
    isFree: inferIsFree(row),
    inquiry: cleanText(row.INQUIRY),
    player: cleanText(row.PLAYER),
    program: cleanText(row.PROGRAM),
    description: cleanText(row.ETC_DESC),
    officialUrl: normalizeUrl(row.ORG_LINK),
    culturePortalUrl: normalizeUrl(
      row.HMPG_ADDR
    ),
    imageUrl: normalizeUrl(row.MAIN_IMG),
    registeredAt: parseDatePart(
      row.RGSTDATE
    ),
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    themeCode: cleanText(row.THEMECODE),
    longitude: coordinates.longitude,
    latitude: coordinates.latitude,
    eventTime: cleanText(row.PRO_TIME),
    reservationStatus:
      inferReservationStatus(row),
    venueType: inferVenueType(row),
    audiences: inferAudiences(
      row,
      contentType
    ),
    isLargeExhibition,
    rewardPoints: getRewardPoints(
      contentType,
      isLargeExhibition
    ),
    radiusMeters: 650,
    sourceCheckedAt: checkedAt,
  };
};

const parseIsoDate = (value: string) => {
  const parts = value
    .split('-')
    .map(Number);

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );
};

const isWithinCollectionWindow = (
  event: SeoulCultureEvent,
  now = new Date()
) => {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const earliest = new Date(today);
  earliest.setDate(earliest.getDate() - 7);

  const latest = new Date(today);
  latest.setMonth(latest.getMonth() + 13);

  const start = parseIsoDate(event.startDate);
  const end = parseIsoDate(event.endDate);

  return (
    end.getTime() >= earliest.getTime() &&
    start.getTime() <= latest.getTime()
  );
};

const eventSortValue = (
  event: SeoulCultureEvent,
  now = new Date()
) => {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const start = parseIsoDate(event.startDate);
  const end = parseIsoDate(event.endDate);

  if (
    today.getTime() >= start.getTime() &&
    today.getTime() <= end.getTime()
  ) {
    return -1;
  }

  return start.getTime();
};

const dedupeEvents = (
  events: SeoulCultureEvent[]
) => {
  const result = new Map<
    string,
    SeoulCultureEvent
  >();

  events.forEach((event) => {
    const key = [
      event.title.toLowerCase(),
      event.startDate,
      event.endDate,
      event.place.toLowerCase(),
    ].join('|');

    const current = result.get(key);

    if (!current) {
      result.set(key, event);
      return;
    }

    const currentScore = [
      current.officialUrl,
      current.culturePortalUrl,
      current.program,
      current.description,
      current.latitude,
    ].filter(Boolean).length;
    const nextScore = [
      event.officialUrl,
      event.culturePortalUrl,
      event.program,
      event.description,
      event.latitude,
    ].filter(Boolean).length;

    if (nextScore > currentScore) {
      result.set(key, event);
    }
  });

  return [...result.values()];
};

const readCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(
      SEOUL_CULTURE_CACHE_KEY
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(
      raw
    ) as SeoulCultureCache;

    if (
      !parsed ||
      !Array.isArray(parsed.events) ||
      typeof parsed.fetchedAt !== 'string'
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.log(
      'SEOUL CULTURE CACHE READ ERROR',
      error
    );
    return null;
  }
};

const writeCache = async (
  cache: SeoulCultureCache
) => {
  try {
    await AsyncStorage.setItem(
      SEOUL_CULTURE_CACHE_KEY,
      JSON.stringify(cache)
    );
  } catch (error) {
    console.log(
      'SEOUL CULTURE CACHE WRITE ERROR',
      error
    );
  }
};

const getRequestUrl = (
  startIndex: number,
  endIndex: number
) => {
  const proxyUrl = getProxyUrl();

  if (proxyUrl) {
    const separator = proxyUrl.includes('?')
      ? '&'
      : '?';

    return (
      `${proxyUrl}${separator}` +
      `startIndex=${startIndex}&endIndex=${endIndex}`
    );
  }

  const key = encodeURIComponent(getApiKey());

  return (
    `http://openapi.seoul.go.kr:8088/` +
    `${key}/json/culturalEventInfo/` +
    `${startIndex}/${endIndex}/`
  );
};

const fetchPage = async (
  startIndex: number,
  endIndex: number
) => {
  const response = await fetch(
    getRequestUrl(startIndex, endIndex),
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `서울 문화행사 API 응답 오류 (${response.status})`
    );
  }

  const payload =
    (await response.json()) as
      SeoulCultureApiEnvelope;
  const service = payload.culturalEventInfo;

  if (!service) {
    const code = cleanText(
      payload.RESULT?.CODE
    );
    const message = cleanText(
      payload.RESULT?.MESSAGE
    );

    throw new Error(
      message ||
        code ||
        '서울 문화행사 응답 형식을 확인할 수 없어요.'
    );
  }

  const code = cleanText(
    service.RESULT?.CODE
  );

  if (code && code !== 'INFO-000') {
    throw new Error(
      cleanText(service.RESULT?.MESSAGE) ||
        `서울 문화행사 API 오류 (${code})`
    );
  }

  const total = Number(
    service.list_total_count ?? 0
  );

  return {
    total: Number.isFinite(total)
      ? total
      : 0,
    rows: Array.isArray(service.row)
      ? service.row
      : [],
  };
};

export const fetchSeoulCultureEvents = async (
  options: {
    forceRefresh?: boolean;
  } = {}
): Promise<SeoulCultureFetchResult> => {
  const cache = await readCache();
  const now = Date.now();
  const cacheTime = cache
    ? new Date(cache.fetchedAt).getTime()
    : 0;
  const cacheFresh =
    cache != null &&
    Number.isFinite(cacheTime) &&
    now - cacheTime <
      SEOUL_CULTURE_CACHE_TTL_MS;

  if (
    !options.forceRefresh &&
    cache &&
    cacheFresh
  ) {
    return {
      events: cache.events,
      fetchedAt: cache.fetchedAt,
      isFromCache: true,
      isStaleCache: false,
      isSampleMode: cache.isSampleMode,
    };
  }

  const isSampleMode = getApiKey() === 'sample';
  const checkedAt = new Date().toISOString();

  try {
    const firstEndIndex = isSampleMode
      ? 5
      : SEOUL_CULTURE_PAGE_SIZE;
    const firstPage = await fetchPage(
      1,
      firstEndIndex
    );
    const rows = [...firstPage.rows];
    const totalToFetch = Math.min(
      firstPage.total || rows.length,
      SEOUL_CULTURE_MAX_ROWS
    );

    if (!isSampleMode) {
      for (
        let startIndex =
          SEOUL_CULTURE_PAGE_SIZE + 1;
        startIndex <= totalToFetch;
        startIndex += SEOUL_CULTURE_PAGE_SIZE
      ) {
        const endIndex = Math.min(
          startIndex +
            SEOUL_CULTURE_PAGE_SIZE -
            1,
          totalToFetch
        );
        const page = await fetchPage(
          startIndex,
          endIndex
        );
        rows.push(...page.rows);
      }
    }

    const events = dedupeEvents(
      rows
        .map((row) =>
          normalizeRow(row, checkedAt)
        )
        .filter(
          (
            event
          ): event is SeoulCultureEvent =>
            Boolean(event)
        )
        .filter((event) =>
          isWithinCollectionWindow(event)
        )
    ).sort((first, second) => {
      const dateDifference =
        eventSortValue(first) -
        eventSortValue(second);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return first.title.localeCompare(
        second.title,
        'ko'
      );
    });

    const nextCache: SeoulCultureCache = {
      fetchedAt: checkedAt,
      events,
      isSampleMode,
    };

    await writeCache(nextCache);

    return {
      events,
      fetchedAt: checkedAt,
      isFromCache: false,
      isStaleCache: false,
      isSampleMode,
    };
  } catch (error) {
    if (cache) {
      return {
        events: cache.events,
        fetchedAt: cache.fetchedAt,
        isFromCache: true,
        isStaleCache: true,
        isSampleMode: cache.isSampleMode,
      };
    }

    throw error;
  }
};

export const getCachedSeoulCultureEvent = async (
  eventId: string | undefined
) => {
  if (!eventId) {
    return null;
  }

  const cache = await readCache();

  return (
    cache?.events.find(
      (event) => event.id === eventId
    ) ?? null
  );
};

export const getSeoulCultureSourceName = () =>
  SEOUL_CULTURE_SOURCE_NAME;

export const getSeoulCultureTypeLabel = (
  contentType: SeoulCultureContentType
) => {
  const labels: Record<
    SeoulCultureContentType,
    string
  > = {
    performance: '공연',
    exhibition: '규모 전시',
    festival: '축제',
    experience: '교육·체험',
    other: '기타 행사',
  };

  return labels[contentType];
};

export const getSeoulCultureTypeIcon = (
  contentType: SeoulCultureContentType
) => {
  const icons: Record<
    SeoulCultureContentType,
    string
  > = {
    performance: '🎭',
    exhibition: '🖼️',
    festival: '🎉',
    experience: '🧩',
    other: '📍',
  };

  return icons[contentType];
};

export const getSeoulCultureReservationLabel = (
  status: SeoulCultureReservationStatus
) => {
  if (status === 'required') {
    return '예약 필요';
  }

  if (status === 'recommended') {
    return '예약·신청 확인';
  }

  return '현장·공식 안내 확인';
};

export const getSeoulCultureVenueTypeLabel = (
  venueType: SeoulCultureVenueType
) => {
  if (venueType === 'indoor') {
    return '실내';
  }

  if (venueType === 'outdoor') {
    return '야외';
  }

  if (venueType === 'mixed') {
    return '실내·야외';
  }

  return '장소 유형 확인';
};

export const formatSeoulCultureDateLabel = (
  event: Pick<
    SeoulCultureEvent,
    'startDate' | 'endDate'
  >
) => {
  const start = event.startDate
    .split('-')
    .map(Number);
  const end = event.endDate
    .split('-')
    .map(Number);

  const startLabel =
    `${start[1]}.${start[2]}`;
  const endLabel = `${end[1]}.${end[2]}`;

  return event.startDate === event.endDate
    ? startLabel
    : `${startLabel}~${endLabel}`;
};

export const isSeoulCultureEventActive = (
  event: SeoulCultureEvent,
  now = new Date()
) => {
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const start = parseIsoDate(event.startDate);
  const end = parseIsoDate(event.endDate);

  return (
    today.getTime() >= start.getTime() &&
    today.getTime() <= end.getTime()
  );
};
