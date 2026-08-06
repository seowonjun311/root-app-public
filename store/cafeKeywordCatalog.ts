import type { PlacePrimaryThemeId } from './placeTypes';

export const CAFE_CORE_THEMES = [
  { id: 'studyCafe', label: '공부하기 좋은 카페', primaryTheme: 'study' },
  { id: 'laptopFriendlyCafe', label: '노트북하기 좋은 카페', primaryTheme: 'study' },
  { id: 'lateNightOr24HourCafe', label: '심야·24시간 카페', primaryTheme: 'foodCafe' },
  { id: 'largeCafe', label: '대형 카페', primaryTheme: 'foodCafe' },
  { id: 'hanokCafe', label: '한옥 카페', primaryTheme: 'culture' },
  { id: 'bakeryCafe', label: '베이커리 카페', primaryTheme: 'foodCafe' },
  { id: 'viewCafe', label: '뷰 좋은 카페', primaryTheme: 'photo' },
  { id: 'moodCafe', label: '감성 카페', primaryTheme: 'photo' },
  { id: 'quietCafe', label: '조용한 카페', primaryTheme: 'rest' },
  { id: 'dateCafe', label: '데이트 카페', primaryTheme: 'date' },
  { id: 'petFriendlyCafe', label: '반려동물 동반 카페', primaryTheme: 'pet' },
  { id: 'brunchCafe', label: '브런치 카페', primaryTheme: 'foodCafe' },
] as const satisfies readonly {
  id: string;
  label: string;
  primaryTheme: PlacePrimaryThemeId;
}[];

export type CafeThemeId =
  (typeof CAFE_CORE_THEMES)[number]['id'];

export const CAFE_KEYWORD_GROUPS = [
  {
    id: 'purpose',
    label: '이용 목적',
    keywords: [
      { id: 'studyFriendly', label: '공부하기 좋음' },
      { id: 'laptopWorkFriendly', label: '노트북 작업하기 좋음' },
      { id: 'readingFriendly', label: '책 읽기 좋음' },
      { id: 'soloFriendly', label: '혼자 가기 좋음' },
      { id: 'dateFriendly', label: '데이트하기 좋음' },
      { id: 'conversationFriendly', label: '대화하기 좋음' },
      { id: 'groupFriendly', label: '모임하기 좋음' },
      { id: 'photoFriendly', label: '사진 찍기 좋음' },
      { id: 'restFriendly', label: '조용히 쉬기 좋음' },
    ],
  },
  {
    id: 'hours',
    label: '운영 시간',
    keywords: [
      { id: 'lateNight', label: '심야 카페', mutable: true },
      { id: 'open24Hours', label: '24시간', mutable: true },
      { id: 'closesLate', label: '늦게까지 영업', mutable: true },
      { id: 'opensEarly', label: '아침 일찍 영업', mutable: true },
      { id: 'brunchHours', label: '브런치 시간대', mutable: true },
      { id: 'goodNightMood', label: '밤 분위기가 좋음' },
    ],
  },
  {
    id: 'space',
    label: '공간 특징',
    keywords: [
      { id: 'largeSpace', label: '대형 카페' },
      { id: 'manySeats', label: '좌석이 많음' },
      { id: 'wideTable', label: '넓은 테이블' },
      { id: 'singleSeat', label: '1인석' },
      { id: 'groupSeat', label: '단체석' },
      { id: 'sofaSeat', label: '소파석' },
      { id: 'outdoorSeating', label: '야외 좌석' },
      { id: 'terrace', label: '테라스' },
      { id: 'rooftop', label: '루프탑' },
      { id: 'garden', label: '정원' },
      { id: 'hanokSpace', label: '한옥' },
      { id: 'renovatedHouse', label: '주택 개조' },
      { id: 'warehouseStyle', label: '창고형' },
    ],
  },
  {
    id: 'workEnvironment',
    label: '공부·작업 환경',
    keywords: [
      { id: 'quiet', label: '조용함' },
      { id: 'manyPowerOutlets', label: '콘센트 많음', mutable: true },
      { id: 'goodWifi', label: '와이파이 좋음', mutable: true },
      { id: 'longStayAllowed', label: '장시간 이용 가능', mutable: true },
      { id: 'laptopComfortable', label: '노트북 사용이 편함', mutable: true },
      { id: 'quietMusic', label: '음악이 조용함' },
      { id: 'studyRoom', label: '스터디룸 있음', mutable: true },
      { id: 'wideSeatSpacing', label: '테이블 간격이 넓음' },
      { id: 'noPressureLongStay', label: '눈치 보이지 않음' },
    ],
  },
  {
    id: 'menu',
    label: '메뉴 특징',
    keywords: [
      { id: 'manyBreadOptions', label: '빵이 많음' },
      { id: 'bakeryCafe', label: '베이커리 카페' },
      { id: 'variedDesserts', label: '디저트가 다양함' },
      { id: 'goodCake', label: '케이크가 맛있음' },
      { id: 'goodCoffee', label: '커피가 맛있음' },
      { id: 'handDrip', label: '핸드드립' },
      { id: 'variedDecaf', label: '디카페인 다양함' },
      { id: 'brunchMenu', label: '브런치' },
      { id: 'traditionalTea', label: '전통차' },
      { id: 'veganMenu', label: '비건 메뉴' },
      { id: 'signatureMenu', label: '시그니처 메뉴' },
    ],
  },
  {
    id: 'atmosphereView',
    label: '분위기·풍경',
    keywords: [
      { id: 'emotionalMood', label: '감성적인 분위기' },
      { id: 'goodDaylight', label: '채광이 좋음' },
      { id: 'cozy', label: '아늑함' },
      { id: 'vintage', label: '빈티지' },
      { id: 'hanokMood', label: '한옥 분위기' },
      { id: 'hanRiverView', label: '한강뷰' },
      { id: 'oceanView', label: '바다뷰' },
      { id: 'mountainView', label: '산뷰' },
      { id: 'cityView', label: '시티뷰' },
      { id: 'nightView', label: '야경' },
      { id: 'sunsetView', label: '노을' },
      { id: 'photoSpot', label: '사진 찍기 좋음' },
    ],
  },
  {
    id: 'convenience',
    label: '편의사항',
    keywords: [
      { id: 'parkingAvailable', label: '주차 가능', mutable: true },
      { id: 'freeParking', label: '무료 주차', mutable: true },
      { id: 'indoorRestroom', label: '화장실 내부', mutable: true },
      { id: 'petAllowed', label: '반려동물 동반', mutable: true },
      { id: 'childFriendly', label: '아이와 방문 가능', mutable: true },
      { id: 'reservationAvailable', label: '예약 가능', mutable: true },
      { id: 'elevator', label: '엘리베이터 있음', mutable: true },
      { id: 'nearSubway', label: '역에서 가까움' },
      { id: 'wheelchairAccessible', label: '휠체어 접근 가능', mutable: true },
      { id: 'groupUseAvailable', label: '단체 이용 가능', mutable: true },
    ],
  },
] as const;

export type CafeKeywordGroupId =
  (typeof CAFE_KEYWORD_GROUPS)[number]['id'];
export type CafeKeywordId =
  (typeof CAFE_KEYWORD_GROUPS)[number]['keywords'][number]['id'];

export const MAX_CAFE_KEYWORDS = 10;
export const MAX_REPRESENTATIVE_CAFE_KEYWORDS = 3;

export const CAFE_THEME_IDS =
  CAFE_CORE_THEMES.map((theme) => theme.id) as CafeThemeId[];

export const CAFE_KEYWORDS =
  CAFE_KEYWORD_GROUPS.flatMap((group) =>
    group.keywords.map((keyword) => ({
      ...keyword,
      groupId: group.id,
      groupLabel: group.label,
    })),
  );

export const CAFE_KEYWORD_IDS =
  CAFE_KEYWORDS.map((keyword) => keyword.id) as CafeKeywordId[];

export const CAFE_MUTABLE_FACT_KEYWORD_IDS =
  CAFE_KEYWORDS.filter(
    (keyword) =>
      'mutable' in keyword &&
      keyword.mutable === true,
  ).map((keyword) => keyword.id) as CafeKeywordId[];

export const CAFE_KEYWORD_MAP =
  Object.fromEntries(
    CAFE_KEYWORDS.map(
      (item) => [
        item.id,
        item,
      ]
    )
  ) as Record<
    string,
    (typeof CAFE_KEYWORDS)[number]
  >;

export const CAFE_THEME_MAP =
  Object.fromEntries(
    CAFE_CORE_THEMES.map(
      (item) => [
        item.id,
        item,
      ]
    )
  ) as Record<
    string,
    (typeof CAFE_CORE_THEMES)[number]
  >;
