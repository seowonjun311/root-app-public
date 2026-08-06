import type {
  PlacePrimaryThemeId,
  PlaceSeasonId,
} from './placeTypes';

export const PLACE_PRIMARY_THEMES = [
  { id: 'study', label: '공부', description: '공부, 독서, 노트북 작업을 위한 장소' },
  { id: 'nightOutdoor', label: '야장', description: '야외 좌석과 밤 분위기를 즐기기 좋은 장소' },
  { id: 'walk', label: '산책', description: '걷거나 가볍게 나들이하기 좋은 장소' },
  { id: 'date', label: '데이트', description: '연인과 시간을 보내기 좋은 장소' },
  { id: 'photo', label: '사진', description: '사진과 풍경을 즐기기 좋은 장소' },
  { id: 'foodCafe', label: '맛집·카페', description: '음식, 커피, 디저트를 즐기기 좋은 장소' },
  { id: 'culture', label: '문화생활', description: '전시, 공연, 독서, 취미 활동을 위한 장소' },
  { id: 'nature', label: '자연', description: '숲, 바다, 산, 강과 가까운 장소' },
  { id: 'family', label: '아이·가족', description: '아이 또는 가족과 방문하기 좋은 장소' },
  { id: 'pet', label: '반려동물', description: '반려동물과 함께 방문하기 좋은 장소' },
  { id: 'activity', label: '운동·활동', description: '운동, 체험, 레저 활동을 위한 장소' },
  { id: 'rest', label: '휴식', description: '조용히 쉬고 재충전하기 좋은 장소' },
] as const satisfies readonly {
  id: PlacePrimaryThemeId;
  label: string;
  description: string;
}[];

export const PLACE_SEASONS = [
  { id: 'all', label: '연중', description: '계절과 상관없이 방문하기 좋음' },
  { id: 'spring', label: '봄', description: '봄에 특히 방문하기 좋음' },
  { id: 'summer', label: '여름', description: '여름에 특히 방문하기 좋음' },
  { id: 'autumn', label: '가을', description: '가을에 특히 방문하기 좋음' },
  { id: 'winter', label: '겨울', description: '겨울에 특히 방문하기 좋음' },
] as const satisfies readonly {
  id: PlaceSeasonId;
  label: string;
  description: string;
}[];

export const SEASONAL_THEME_GROUPS = [
  {
    season: 'spring',
    label: '봄',
    themes: [
      { id: 'cherryBlossomSpot', label: '벚꽃놀이하기 좋은 곳' },
      { id: 'springFlowerSpot', label: '봄꽃 구경하기 좋은 곳' },
      { id: 'springPicnicSpot', label: '피크닉하기 좋은 곳' },
      { id: 'springWalkSpot', label: '봄 산책하기 좋은 곳' },
      { id: 'springDriveCourse', label: '봄 드라이브 코스' },
      { id: 'springFestivalEvent', label: '봄 축제·행사' },
      { id: 'springOutdoorDateSpot', label: '야외 데이트하기 좋은 곳' },
      { id: 'springCyclingSpot', label: '자전거 타기 좋은 곳' },
    ],
    tags: [
      { id: 'cherryBlossom', label: '벚꽃' },
      { id: 'forsythia', label: '개나리' },
      { id: 'azalea', label: '진달래' },
      { id: 'canolaFlower', label: '유채꽃' },
      { id: 'picnic', label: '피크닉' },
      { id: 'picnicMat', label: '돗자리' },
      { id: 'outdoorWalk', label: '야외산책' },
      { id: 'springFestival', label: '봄축제' },
    ],
  },
  {
    season: 'summer',
    label: '여름',
    themes: [
      { id: 'summerOutdoorPubSpot', label: '야장하기 좋은 곳' },
      { id: 'waterPlaySpot', label: '물놀이하기 좋은 곳' },
      { id: 'valleyWaterfallSpot', label: '계곡·폭포' },
      { id: 'beachSpot', label: '해수욕장' },
      { id: 'poolWaterparkSpot', label: '수영장·워터파크' },
      { id: 'riversideOutingSpot', label: '한강·강변 나들이' },
      { id: 'summerNightWalkSpot', label: '여름밤 산책' },
      { id: 'summerNightViewSpot', label: '야경 보기 좋은 곳' },
      { id: 'summerCampingSpot', label: '캠핑·차박' },
      { id: 'summerFestivalEvent', label: '여름 축제' },
      { id: 'indoorSummerEscapeSpot', label: '실내 피서 장소' },
    ],
    tags: [
      { id: 'outdoorSeating', label: '야외좌석' },
      { id: 'hanRiver', label: '한강' },
      { id: 'waterPlay', label: '물놀이' },
      { id: 'valley', label: '계곡' },
      { id: 'nightMarket', label: '야시장' },
      { id: 'nightWalk', label: '밤산책' },
      { id: 'rooftop', label: '루프탑' },
      { id: 'indoorDate', label: '실내데이트' },
    ],
  },
  {
    season: 'autumn',
    label: '가을',
    themes: [
      { id: 'autumnFoliageSpot', label: '단풍놀이하기 좋은 곳' },
      { id: 'silverGrassReedSpot', label: '억새·갈대 명소' },
      { id: 'autumnWalkSpot', label: '가을 산책하기 좋은 곳' },
      { id: 'autumnHikingSpot', label: '등산하기 좋은 곳' },
      { id: 'autumnDriveCourse', label: '가을 드라이브 코스' },
      { id: 'autumnCampingSpot', label: '캠핑하기 좋은 곳' },
      { id: 'autumnFestivalEvent', label: '가을 축제' },
      { id: 'autumnSunsetSpot', label: '노을 보기 좋은 곳' },
      { id: 'outdoorReadingSpot', label: '독서하기 좋은 야외 공간' },
    ],
    tags: [
      { id: 'foliage', label: '단풍' },
      { id: 'ginkgo', label: '은행나무' },
      { id: 'silverGrass', label: '억새' },
      { id: 'reeds', label: '갈대' },
      { id: 'hiking', label: '등산' },
      { id: 'sunset', label: '노을' },
      { id: 'autumnFestival', label: '가을축제' },
      { id: 'camping', label: '캠핑' },
    ],
  },
  {
    season: 'winter',
    label: '겨울',
    themes: [
      { id: 'snowViewSpot', label: '눈 구경하기 좋은 곳' },
      { id: 'sleddingSpot', label: '썰매장' },
      { id: 'skiSnowboardSpot', label: '스키·스노보드' },
      { id: 'iceRinkSpot', label: '스케이트장' },
      { id: 'winterLightFestival', label: '겨울 빛축제' },
      { id: 'christmasMoodSpot', label: '크리스마스 분위기 좋은 곳' },
      { id: 'winterNightViewSpot', label: '겨울 야경 명소' },
      { id: 'hotSpringSaunaSpot', label: '온천·찜질방' },
      { id: 'winterIndoorExperienceSpot', label: '실내 체험 공간' },
      { id: 'winterSeaSpot', label: '겨울 바다' },
      { id: 'warmCafeSpot', label: '따뜻한 카페' },
    ],
    tags: [
      { id: 'snowFlower', label: '눈꽃' },
      { id: 'sled', label: '썰매' },
      { id: 'skate', label: '스케이트' },
      { id: 'ski', label: '스키' },
      { id: 'christmas', label: '크리스마스' },
      { id: 'lightFestival', label: '빛축제' },
      { id: 'hotSpring', label: '온천' },
      { id: 'winterSea', label: '겨울바다' },
    ],
  },
] as const;

export type SeasonalThemeId =
  (typeof SEASONAL_THEME_GROUPS)[number]['themes'][number]['id'];
export type SeasonalTagId =
  (typeof SEASONAL_THEME_GROUPS)[number]['tags'][number]['id'];

export const ANNUAL_THEME_GROUPS = [
  {
    id: 'studyWork',
    label: '공부·작업',
    themes: [
      { id: 'studyCafe', label: '공부하기 좋은 카페' },
      { id: 'laptopCafe', label: '노트북 하기 좋은 카페' },
      { id: 'readingPlace', label: '책 읽기 좋은 곳' },
      { id: 'quietSpace', label: '조용한 공간' },
      { id: 'studyRoom', label: '스터디룸' },
      { id: 'soloLongStayPlace', label: '혼자 오래 머물기 좋은 곳' },
      { id: 'coworkingSpace', label: '작업하기 좋은 공유공간' },
    ],
  },
  {
    id: 'foodMood',
    label: '음식·분위기',
    themes: [
      { id: 'outdoorPubSpot', label: '야장하기 좋은 곳' },
      { id: 'soloDiningSpot', label: '혼밥하기 좋은 곳' },
      { id: 'dateRestaurant', label: '데이트하기 좋은 식당' },
      { id: 'groupDiningSpot', label: '단체 모임하기 좋은 곳' },
      { id: 'moodCafe', label: '분위기 좋은 카페' },
      { id: 'dessertSpot', label: '디저트가 맛있는 곳' },
      { id: 'viewRestaurant', label: '뷰가 좋은 식당' },
      { id: 'lateOpenSpot', label: '늦게까지 영업하는 곳' },
      { id: 'goodValueSpot', label: '가성비 좋은 곳' },
    ],
  },
  {
    id: 'walkRest',
    label: '산책·휴식',
    themes: [
      { id: 'walkSpot', label: '산책하기 좋은 곳' },
      { id: 'quietRestSpot', label: '조용히 쉬기 좋은 곳' },
      { id: 'zoningOutSpot', label: '멍때리기 좋은 곳' },
      { id: 'sunsetSpot', label: '노을 보기 좋은 곳' },
      { id: 'nightViewSpot', label: '야경 보기 좋은 곳' },
      { id: 'parkForestSpot', label: '공원·숲' },
      { id: 'riversideLakeSpot', label: '강변·호수' },
      { id: 'petFriendlySpot', label: '반려동물과 가기 좋은 곳' },
      { id: 'manyBenchesSpot', label: '벤치가 많은 곳' },
      { id: 'picnicMatSpot', label: '돗자리 펴기 좋은 곳' },
    ],
  },
  {
    id: 'dateGroup',
    label: '데이트·모임',
    themes: [
      { id: 'dateSpot', label: '데이트하기 좋은 곳' },
      { id: 'firstDateSpot', label: '첫 데이트 장소' },
      { id: 'anniversarySpot', label: '기념일에 가기 좋은 곳' },
      { id: 'friendHangoutSpot', label: '친구와 가기 좋은 곳' },
      { id: 'familyHangoutSpot', label: '가족과 가기 좋은 곳' },
      { id: 'kidsSpot', label: '아이와 가기 좋은 곳' },
      { id: 'parentsSpot', label: '부모님과 가기 좋은 곳' },
      { id: 'blindDateSpot', label: '소개팅하기 좋은 곳' },
      { id: 'groupGatheringSpot', label: '단체 모임 장소' },
    ],
  },
  {
    id: 'photoScenery',
    label: '사진·풍경',
    themes: [
      { id: 'photoSpot', label: '사진 찍기 좋은 곳' },
      { id: 'lifeShotSpot', label: '인생사진 명소' },
      { id: 'nightViewLandmark', label: '야경 명소' },
      { id: 'sunsetLandmark', label: '노을 명소' },
      { id: 'architectureSpot', label: '건축물이 멋진 곳' },
      { id: 'alleyMoodSpot', label: '골목 감성이 좋은 곳' },
      { id: 'observatorySpot', label: '전망대' },
      { id: 'hanokHistorySpot', label: '한옥·역사 공간' },
      { id: 'mediaArtSpot', label: '미디어아트' },
    ],
  },
  {
    id: 'cultureHobby',
    label: '문화·취미',
    themes: [
      { id: 'exhibitionSpot', label: '전시 보기 좋은 곳' },
      { id: 'performanceSpot', label: '공연 보기 좋은 곳' },
      { id: 'independentBookstore', label: '독립서점' },
      { id: 'librarySpot', label: '도서관' },
      { id: 'workshopClassSpot', label: '공방·원데이클래스' },
      { id: 'musicListeningSpot', label: '음악 감상 공간' },
      { id: 'cinemaIndieFilmSpot', label: '영화관·독립영화관' },
      { id: 'historyTourSpot', label: '역사 탐방' },
      { id: 'museumArtMuseumSpot', label: '박물관·미술관' },
      { id: 'animationCharacterSpot', label: '애니메이션·캐릭터 관련 장소' },
    ],
  },
  {
    id: 'activityExperience',
    label: '활동·체험',
    themes: [
      { id: 'exerciseSpot', label: '운동하기 좋은 곳' },
      { id: 'runningCourse', label: '러닝 코스' },
      { id: 'cyclingCourse', label: '자전거 코스' },
      { id: 'hikingCourse', label: '등산 코스' },
      { id: 'climbingSpot', label: '클라이밍' },
      { id: 'waterLeisureSpot', label: '수상 레저' },
      { id: 'indoorSportsSpot', label: '실내 스포츠' },
      { id: 'unusualExperienceSpot', label: '이색 체험' },
      { id: 'escapeBoardGameSpot', label: '방탈출·보드게임' },
      { id: 'campingCarCampingSpot', label: '캠핑·차박' },
    ],
  },
  {
    id: 'convenience',
    label: '편의성 중심',
    themes: [
      { id: 'parkingEasySpot', label: '주차하기 좋은 곳' },
      { id: 'transitEasySpot', label: '대중교통으로 가기 좋은 곳' },
      { id: 'freeEnjoymentSpot', label: '무료로 즐길 수 있는 곳' },
      { id: 'reservableSpot', label: '예약 가능한 곳' },
      { id: 'rainyDaySpot', label: '비 오는 날 가기 좋은 곳' },
      { id: 'lateHoursSpot', label: '늦은 시간에도 갈 수 있는 곳' },
      { id: 'wheelchairAccessibleSpot', label: '휠체어 접근이 편한 곳' },
      { id: 'petAllowedSpot', label: '반려동물 동반 가능' },
      { id: 'restroomComfortSpot', label: '화장실이 편한 곳' },
      { id: 'soloFriendlySpot', label: '혼자 가도 부담 없는 곳' },
    ],
  },
] as const;

export type AnnualThemeGroupId =
  (typeof ANNUAL_THEME_GROUPS)[number]['id'];
export type AnnualThemeId =
  (typeof ANNUAL_THEME_GROUPS)[number]['themes'][number]['id'];

export const SEASONAL_THEME_COUNT =
  SEASONAL_THEME_GROUPS.reduce(
    (sum, group) => sum + group.themes.length,
    0,
  );

export const ANNUAL_THEME_COUNT =
  ANNUAL_THEME_GROUPS.reduce(
    (sum, group) => sum + group.themes.length,
    0,
  );
