export type ExplorationDistrictId =
  | 'jongno'
  | 'jung'
  | 'seodaemun'
  | 'yongsan'
  | 'mapo';

export type ExplorationAreaType =
  | '단일 지점'
  | '넓은 공간'
  | '거리·경로';

export type ExplorationVerificationPoint = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

export type ExplorationPlaceDefinition = {
  id: string;
  districtId: ExplorationDistrictId;
  district: string;
  name: string;
  description: string;
  areaType: ExplorationAreaType;
  category: string;
  icon: string;
  rewardPoints: number;
  rewardLabel: string;
  rewardBuildingId: string;
  rewardStampId: string;
  mapLatitude: number;
  mapLongitude: number;
  verificationPoints: ExplorationVerificationPoint[];
};

export type ExplorationThemeDefinition = {
  id: string;
  districtId: ExplorationDistrictId;
  name: string;
  shortLabel: string;
  icon: string;
  description: string;
  badgeName: string;
  badgeDescription: string;
  requiredPlaceIds: readonly string[];
  points: number;
};

export type ExplorationDistrictDefinition = {
  id: ExplorationDistrictId;
  name: string;
  icon: string;
  available: boolean;
  order: number;
  subtitle: string;
  centerLatitude: number;
  centerLongitude: number;
};

export type ExplorationRewardDefinition = {
  points: number;
  buildingId: string;
  stampId: string;
};

export const EXPLORATION_DISTRICTS: readonly ExplorationDistrictDefinition[] = [
  {
    id: 'jongno',
    name: '종로구',
    icon: '🏯',
    available: true,
    order: 1,
    subtitle: '궁궐·역사·골목 탐험',
    centerLatitude: 37.5759,
    centerLongitude: 126.9822,
  },
  {
    id: 'jung',
    name: '중구',
    icon: '🏙️',
    available: true,
    order: 2,
    subtitle: '도심·근현대·산책 탐험',
    centerLatitude: 37.5612,
    centerLongitude: 126.9941,
  },
  {
    id: 'seodaemun',
    name: '서대문구',
    icon: '🕊️',
    available: true,
    order: 3,
    subtitle: '독립·캠퍼스·자연 탐험',
    centerLatitude: 37.5763,
    centerLongitude: 126.9448,
  },
  {
    id: 'yongsan',
    name: '용산구',
    icon: '🗼',
    available: false,
    order: 4,
    subtitle: '서울 중심권 확장',
    centerLatitude: 37.5326,
    centerLongitude: 126.9905,
  },
  {
    id: 'mapo',
    name: '마포구',
    icon: '🌉',
    available: false,
    order: 5,
    subtitle: '한강·문화권 확장',
    centerLatitude: 37.5663,
    centerLongitude: 126.9019,
  },
] as const;

export const EXPLORATION_PLACE_CATALOG: Record<
  string,
  ExplorationPlaceDefinition
> = {
  gyeongbokgung: {
    id: 'gyeongbokgung',
    districtId: 'jongno',
    district: '종로구',
    name: '경복궁',
    description: '조선 왕조의 법궁이자 서울을 대표하는 궁궐이에요.',
    areaType: '넓은 공간',
    category: '궁궐',
    icon: '🏯',
    rewardPoints: 30,
    rewardLabel: '경복궁 건물',
    rewardBuildingId: 'explore-gyeongbokgung',
    rewardStampId: 'stamp-gyeongbokgung',
    mapLatitude: 37.579617,
    mapLongitude: 126.977041,
    verificationPoints: [
      { latitude: 37.579617, longitude: 126.977041, radiusMeters: 300 },
    ],
  },
  changdeokgung: {
    id: 'changdeokgung',
    districtId: 'jongno',
    district: '종로구',
    name: '창덕궁',
    description: '자연과 궁궐 건축이 아름답게 어우러진 왕궁이에요.',
    areaType: '넓은 공간',
    category: '궁궐',
    icon: '🏛️',
    rewardPoints: 30,
    rewardLabel: '창덕궁 건물',
    rewardBuildingId: 'explore-changdeokgung',
    rewardStampId: 'stamp-changdeokgung',
    mapLatitude: 37.57943,
    mapLongitude: 126.99103,
    verificationPoints: [
      { latitude: 37.57943, longitude: 126.99103, radiusMeters: 350 },
    ],
  },
  changgyeonggung: {
    id: 'changgyeonggung',
    districtId: 'jongno',
    district: '종로구',
    name: '창경궁',
    description: '궁궐과 정원이 함께 이어지는 조선 시대 궁궐이에요.',
    areaType: '넓은 공간',
    category: '궁궐',
    icon: '🌸',
    rewardPoints: 30,
    rewardLabel: '창경궁 건물',
    rewardBuildingId: 'explore-changgyeonggung',
    rewardStampId: 'stamp-changgyeonggung',
    mapLatitude: 37.57876,
    mapLongitude: 126.99513,
    verificationPoints: [
      { latitude: 37.57876, longitude: 126.99513, radiusMeters: 350 },
    ],
  },
  jongmyo: {
    id: 'jongmyo',
    districtId: 'jongno',
    district: '종로구',
    name: '종묘',
    description: '조선 왕실의 제례 공간으로 이어져 온 역사 명소예요.',
    areaType: '넓은 공간',
    category: '역사',
    icon: '⛩️',
    rewardPoints: 30,
    rewardLabel: '종묘 건물',
    rewardBuildingId: 'explore-jongmyo',
    rewardStampId: 'stamp-jongmyo',
    mapLatitude: 37.57419,
    mapLongitude: 126.99414,
    verificationPoints: [
      { latitude: 37.57419, longitude: 126.99414, radiusMeters: 350 },
    ],
  },
  cheongwadae: {
    id: 'cheongwadae',
    districtId: 'jongno',
    district: '종로구',
    name: '청와대',
    description: '대한민국 현대사를 상징하는 대표적인 역사 공간이에요.',
    areaType: '넓은 공간',
    category: '역사',
    icon: '🏛️',
    rewardPoints: 30,
    rewardLabel: '청와대 건물',
    rewardBuildingId: 'explore-cheongwadae',
    rewardStampId: 'stamp-cheongwadae',
    mapLatitude: 37.58661,
    mapLongitude: 126.97481,
    verificationPoints: [
      { latitude: 37.58661, longitude: 126.97481, radiusMeters: 350 },
    ],
  },
  bukchon: {
    id: 'bukchon',
    districtId: 'jongno',
    district: '종로구',
    name: '북촌한옥마을',
    description: '한옥과 골목이 이어지는 서울의 대표 전통 마을이에요.',
    areaType: '넓은 공간',
    category: '전통마을',
    icon: '🏘️',
    rewardPoints: 20,
    rewardLabel: '한옥 장식',
    rewardBuildingId: 'explore-bukchon',
    rewardStampId: 'stamp-bukchon',
    mapLatitude: 37.58262,
    mapLongitude: 126.98315,
    verificationPoints: [
      { latitude: 37.58262, longitude: 126.98315, radiusMeters: 500 },
    ],
  },
  insadong: {
    id: 'insadong',
    districtId: 'jongno',
    district: '종로구',
    name: '인사동',
    description: '전통문화 상점과 갤러리가 이어지는 대표 거리예요.',
    areaType: '거리·경로',
    category: '전통거리',
    icon: '🎐',
    rewardPoints: 20,
    rewardLabel: '전통거리 장식',
    rewardBuildingId: 'explore-insadong',
    rewardStampId: 'stamp-insadong',
    mapLatitude: 37.57435,
    mapLongitude: 126.98585,
    verificationPoints: [
      { latitude: 37.57435, longitude: 126.98585, radiusMeters: 450 },
    ],
  },
  ikseondong: {
    id: 'ikseondong',
    districtId: 'jongno',
    district: '종로구',
    name: '익선동 한옥거리',
    description: '한옥 골목과 현대적인 공간이 만나는 거리예요.',
    areaType: '거리·경로',
    category: '골목',
    icon: '🏡',
    rewardPoints: 20,
    rewardLabel: '한옥상점 장식',
    rewardBuildingId: 'explore-ikseondong',
    rewardStampId: 'stamp-ikseondong',
    mapLatitude: 37.57302,
    mapLongitude: 126.98962,
    verificationPoints: [
      { latitude: 37.57302, longitude: 126.98962, radiusMeters: 400 },
    ],
  },
  'gwangjang-market': {
    id: 'gwangjang-market',
    districtId: 'jongno',
    district: '종로구',
    name: '광장시장',
    description: '오랜 역사와 활기찬 분위기를 가진 전통시장이에요.',
    areaType: '넓은 공간',
    category: '전통시장',
    icon: '🏮',
    rewardPoints: 20,
    rewardLabel: '시장 건물',
    rewardBuildingId: 'explore-gwangjang-market',
    rewardStampId: 'stamp-gwangjang-market',
    mapLatitude: 37.57004,
    mapLongitude: 126.99967,
    verificationPoints: [
      { latitude: 37.57004, longitude: 126.99967, radiusMeters: 400 },
    ],
  },
  'gwanghwamun-square': {
    id: 'gwanghwamun-square',
    districtId: 'jongno',
    district: '종로구',
    name: '광화문광장',
    description: '서울 도심의 역사와 시민 공간이 만나는 광장이에요.',
    areaType: '넓은 공간',
    category: '광장',
    icon: '🗿',
    rewardPoints: 20,
    rewardLabel: '광화문 장식',
    rewardBuildingId: 'explore-gwanghwamun-square',
    rewardStampId: 'stamp-gwanghwamun-square',
    mapLatitude: 37.57239,
    mapLongitude: 126.9769,
    verificationPoints: [
      { latitude: 37.57239, longitude: 126.9769, radiusMeters: 400 },
    ],
  },

  deoksugung: {
    id: 'deoksugung',
    districtId: 'jung',
    district: '중구',
    name: '덕수궁',
    description: '전통 궁궐과 근대 건축이 함께 남아 있는 도심 궁궐이에요.',
    areaType: '넓은 공간',
    category: '궁궐·근대',
    icon: '🏛️',
    rewardPoints: 30,
    rewardLabel: '덕수궁 건물',
    rewardBuildingId: 'explore-deoksugung',
    rewardStampId: 'stamp-deoksugung',
    mapLatitude: 37.56582,
    mapLongitude: 126.97514,
    verificationPoints: [
      { latitude: 37.56582, longitude: 126.97514, radiusMeters: 300 },
    ],
  },
  'seoul-plaza': {
    id: 'seoul-plaza',
    districtId: 'jung',
    district: '중구',
    name: '서울광장',
    description: '서울시청 앞에서 시민 행사와 도심 풍경을 만나는 광장이에요.',
    areaType: '넓은 공간',
    category: '광장',
    icon: '🌿',
    rewardPoints: 20,
    rewardLabel: '서울광장 장식',
    rewardBuildingId: 'explore-seoul-plaza',
    rewardStampId: 'stamp-seoul-plaza',
    mapLatitude: 37.56632,
    mapLongitude: 126.97795,
    verificationPoints: [
      { latitude: 37.56632, longitude: 126.97795, radiusMeters: 300 },
    ],
  },
  sungnyemun: {
    id: 'sungnyemun',
    districtId: 'jung',
    district: '중구',
    name: '숭례문',
    description: '서울 도성의 남쪽 정문으로 남아 있는 대표 문화유산이에요.',
    areaType: '단일 지점',
    category: '역사',
    icon: '🏯',
    rewardPoints: 30,
    rewardLabel: '숭례문 건물',
    rewardBuildingId: 'explore-sungnyemun',
    rewardStampId: 'stamp-sungnyemun',
    mapLatitude: 37.55998,
    mapLongitude: 126.97531,
    verificationPoints: [
      { latitude: 37.55998, longitude: 126.97531, radiusMeters: 250 },
    ],
  },
  'namsangol-hanok': {
    id: 'namsangol-hanok',
    districtId: 'jung',
    district: '중구',
    name: '남산골한옥마을',
    description: '남산 아래에서 한옥과 전통 정원을 만나는 문화 공간이에요.',
    areaType: '넓은 공간',
    category: '전통마을',
    icon: '🏘️',
    rewardPoints: 20,
    rewardLabel: '남산골 한옥 장식',
    rewardBuildingId: 'explore-namsangol-hanok',
    rewardStampId: 'stamp-namsangol-hanok',
    mapLatitude: 37.55928,
    mapLongitude: 126.99448,
    verificationPoints: [
      { latitude: 37.55928, longitude: 126.99448, radiusMeters: 350 },
    ],
  },
  'myeongdong-cathedral': {
    id: 'myeongdong-cathedral',
    districtId: 'jung',
    district: '중구',
    name: '명동대성당',
    description: '명동 중심에서 근대 건축과 역사적 의미를 만나는 장소예요.',
    areaType: '단일 지점',
    category: '근대문화',
    icon: '⛪',
    rewardPoints: 30,
    rewardLabel: '명동대성당 건물',
    rewardBuildingId: 'explore-myeongdong-cathedral',
    rewardStampId: 'stamp-myeongdong-cathedral',
    mapLatitude: 37.56318,
    mapLongitude: 126.98734,
    verificationPoints: [
      { latitude: 37.56318, longitude: 126.98734, radiusMeters: 250 },
    ],
  },
  'jangchungdan-park': {
    id: 'jangchungdan-park',
    districtId: 'jung',
    district: '중구',
    name: '장충단공원',
    description: '도심 속 역사와 산책로가 이어지는 중구의 대표 공원이에요.',
    areaType: '넓은 공간',
    category: '자연·산책',
    icon: '🌳',
    rewardPoints: 20,
    rewardLabel: '장충단공원 장식',
    rewardBuildingId: 'explore-jangchungdan-park',
    rewardStampId: 'stamp-jangchungdan-park',
    mapLatitude: 37.557791,
    mapLongitude: 127.004367,
    verificationPoints: [
      { latitude: 37.557791, longitude: 127.004367, radiusMeters: 400 },
    ],
  },
  ddp: {
    id: 'ddp',
    districtId: 'jung',
    district: '중구',
    name: '동대문디자인플라자',
    description: '미래적인 건축과 디자인 전시가 이어지는 서울의 대표 문화 공간이에요.',
    areaType: '넓은 공간',
    category: '현대문화',
    icon: '🛸',
    rewardPoints: 30,
    rewardLabel: 'DDP 건물',
    rewardBuildingId: 'explore-ddp',
    rewardStampId: 'stamp-ddp',
    mapLatitude: 37.56648,
    mapLongitude: 127.00922,
    verificationPoints: [
      { latitude: 37.56648, longitude: 127.00922, radiusMeters: 400 },
    ],
  },
  cheonggyecheon: {
    id: 'cheonggyecheon',
    districtId: 'jung',
    district: '중구',
    name: '청계천',
    description: '도심 한가운데를 따라 물길과 산책로가 이어지는 휴식 공간이에요.',
    areaType: '거리·경로',
    category: '자연·산책',
    icon: '🌊',
    rewardPoints: 20,
    rewardLabel: '청계천 장식',
    rewardBuildingId: 'explore-cheonggyecheon',
    rewardStampId: 'stamp-cheonggyecheon',
    mapLatitude: 37.56865,
    mapLongitude: 126.98275,
    verificationPoints: [
      { latitude: 37.56865, longitude: 126.98275, radiusMeters: 500 },
    ],
  },
  'jeongdong-gil': {
    id: 'jeongdong-gil',
    districtId: 'jung',
    district: '중구',
    name: '정동길',
    description: '근대 건축과 돌담길이 이어지는 서울의 대표 도심 산책로예요.',
    areaType: '거리·경로',
    category: '근대거리',
    icon: '🍂',
    rewardPoints: 20,
    rewardLabel: '정동길 장식',
    rewardBuildingId: 'explore-jeongdong-gil',
    rewardStampId: 'stamp-jeongdong-gil',
    mapLatitude: 37.5651,
    mapLongitude: 126.9738,
    verificationPoints: [
      { latitude: 37.5651, longitude: 126.9738, radiusMeters: 400 },
    ],
  },
  'seoullo-7017': {
    id: 'seoullo-7017',
    districtId: 'jung',
    district: '중구',
    name: '서울로7017',
    description: '서울역 고가를 보행길로 바꾼 도심 정원형 산책로예요.',
    areaType: '거리·경로',
    category: '도시산책',
    icon: '🌉',
    rewardPoints: 20,
    rewardLabel: '서울로 장식',
    rewardBuildingId: 'explore-seoullo-7017',
    rewardStampId: 'stamp-seoullo-7017',
    mapLatitude: 37.5568,
    mapLongitude: 126.9698,
    verificationPoints: [
      { latitude: 37.5568, longitude: 126.9698, radiusMeters: 500 },
    ],
  },

  'seodaemun-prison': {
    id: 'seodaemun-prison',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '서대문형무소역사관',
    description: '독립운동가들의 희생과 한국 근현대사를 기억하는 역사 교육 공간이에요.',
    areaType: '넓은 공간',
    category: '근현대역사',
    icon: '🧱',
    rewardPoints: 30,
    rewardLabel: '서대문형무소 역사관 건물',
    rewardBuildingId: 'explore-seodaemun-prison',
    rewardStampId: 'stamp-seodaemun-prison',
    mapLatitude: 37.57461,
    mapLongitude: 126.95561,
    verificationPoints: [
      { latitude: 37.57461, longitude: 126.95561, radiusMeters: 350 },
    ],
  },
  dongnimmun: {
    id: 'dongnimmun',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '독립문',
    description: '자주독립의 뜻을 담아 세운 서울의 대표 근대 문화유산이에요.',
    areaType: '단일 지점',
    category: '역사유산',
    icon: '🕊️',
    rewardPoints: 30,
    rewardLabel: '독립문 건물',
    rewardBuildingId: 'explore-dongnimmun',
    rewardStampId: 'stamp-dongnimmun',
    mapLatitude: 37.57229,
    mapLongitude: 126.95929,
    verificationPoints: [
      { latitude: 37.57229, longitude: 126.95929, radiusMeters: 250 },
    ],
  },
  'independence-park': {
    id: 'independence-park',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '서대문독립공원',
    description: '독립문과 역사관을 잇고 독립운동의 의미를 돌아보는 역사 공원이에요.',
    areaType: '넓은 공간',
    category: '역사공원',
    icon: '🌳',
    rewardPoints: 20,
    rewardLabel: '독립공원 기념 장식',
    rewardBuildingId: 'explore-independence-park',
    rewardStampId: 'stamp-independence-park',
    mapLatitude: 37.57405,
    mapLongitude: 126.95774,
    verificationPoints: [
      { latitude: 37.57405, longitude: 126.95774, radiusMeters: 450 },
    ],
  },
  'seodaemun-natural-history': {
    id: 'seodaemun-natural-history',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '서대문자연사박물관',
    description: '지구와 생명의 역사를 표본과 전시로 만나는 자연사 교육 공간이에요.',
    areaType: '넓은 공간',
    category: '박물관',
    icon: '🦕',
    rewardPoints: 30,
    rewardLabel: '자연사박물관 건물',
    rewardBuildingId: 'explore-seodaemun-natural-history',
    rewardStampId: 'stamp-seodaemun-natural-history',
    mapLatitude: 37.57676,
    mapLongitude: 126.93787,
    verificationPoints: [
      { latitude: 37.57676, longitude: 126.93787, radiusMeters: 350 },
    ],
  },
  'ewha-ecc': {
    id: 'ewha-ecc',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '이화여대 ECC',
    description: '캠퍼스 지형과 현대 건축이 어우러진 신촌·이대권의 대표 공간이에요.',
    areaType: '넓은 공간',
    category: '캠퍼스·건축',
    icon: '🎓',
    rewardPoints: 30,
    rewardLabel: '이화 ECC 건물',
    rewardBuildingId: 'explore-ewha-ecc',
    rewardStampId: 'stamp-ewha-ecc',
    mapLatitude: 37.56188,
    mapLongitude: 126.94686,
    verificationPoints: [
      { latitude: 37.56188, longitude: 126.94686, radiusMeters: 400 },
    ],
  },
  'sinchon-yonsei-ro': {
    id: 'sinchon-yonsei-ro',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '신촌 연세로',
    description: '대학가의 젊은 문화와 거리 행사가 이어지는 서대문의 대표 거리예요.',
    areaType: '거리·경로',
    category: '문화거리',
    icon: '🎵',
    rewardPoints: 20,
    rewardLabel: '신촌 문화거리 장식',
    rewardBuildingId: 'explore-sinchon-yonsei-ro',
    rewardStampId: 'stamp-sinchon-yonsei-ro',
    mapLatitude: 37.55724,
    mapLongitude: 126.93687,
    verificationPoints: [
      { latitude: 37.55724, longitude: 126.93687, radiusMeters: 500 },
      { latitude: 37.55963, longitude: 126.93672, radiusMeters: 450 },
    ],
  },
  'yonsei-underwood': {
    id: 'yonsei-underwood',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '연세대 언더우드관',
    description: '근대 대학 건축과 캠퍼스 역사를 함께 만나는 상징적인 건물이에요.',
    areaType: '단일 지점',
    category: '근대건축·캠퍼스',
    icon: '🏫',
    rewardPoints: 30,
    rewardLabel: '언더우드관 건물',
    rewardBuildingId: 'explore-yonsei-underwood',
    rewardStampId: 'stamp-yonsei-underwood',
    mapLatitude: 37.56587,
    mapLongitude: 126.93865,
    verificationPoints: [
      { latitude: 37.56587, longitude: 126.93865, radiusMeters: 350 },
    ],
  },
  'ansan-jarakgil': {
    id: 'ansan-jarakgil',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '안산자락길',
    description: '도심 가까이에서 숲과 전망을 즐길 수 있는 순환형 산책길이에요.',
    areaType: '거리·경로',
    category: '자연·산책',
    icon: '🌲',
    rewardPoints: 20,
    rewardLabel: '안산 숲길 장식',
    rewardBuildingId: 'explore-ansan-jarakgil',
    rewardStampId: 'stamp-ansan-jarakgil',
    mapLatitude: 37.57975,
    mapLongitude: 126.95116,
    verificationPoints: [
      { latitude: 37.57975, longitude: 126.95116, radiusMeters: 650 },
      { latitude: 37.58245, longitude: 126.94365, radiusMeters: 650 },
      { latitude: 37.57615, longitude: 126.94015, radiusMeters: 650 },
    ],
  },
  'hongjecheon-waterfall': {
    id: 'hongjecheon-waterfall',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '홍제천 인공폭포',
    description: '홍제천 물길과 폭포 풍경을 함께 즐기는 도심 수변 휴식 공간이에요.',
    areaType: '넓은 공간',
    category: '자연·수변',
    icon: '💧',
    rewardPoints: 20,
    rewardLabel: '홍제천 폭포 장식',
    rewardBuildingId: 'explore-hongjecheon-waterfall',
    rewardStampId: 'stamp-hongjecheon-waterfall',
    mapLatitude: 37.58032,
    mapLongitude: 126.93641,
    verificationPoints: [
      { latitude: 37.58032, longitude: 126.93641, radiusMeters: 450 },
    ],
  },
  'yeonhui-forest-rest': {
    id: 'yeonhui-forest-rest',
    districtId: 'seodaemun',
    district: '서대문구',
    name: '연희숲속쉼터',
    description: '안산과 홍제천을 잇는 숲속에서 쉬어 가는 서대문의 자연 공간이에요.',
    areaType: '넓은 공간',
    category: '자연·산책',
    icon: '🍃',
    rewardPoints: 20,
    rewardLabel: '연희 숲속 장식',
    rewardBuildingId: 'explore-yeonhui-forest-rest',
    rewardStampId: 'stamp-yeonhui-forest-rest',
    mapLatitude: 37.57814,
    mapLongitude: 126.93516,
    verificationPoints: [
      { latitude: 37.57814, longitude: 126.93516, radiusMeters: 450 },
    ],
  },

};

export const EXPLORATION_THEME_CATALOG: Record<
  string,
  ExplorationThemeDefinition
> = {
  'theme-jongno-palace': {
    id: 'theme-jongno-palace',
    districtId: 'jongno',
    name: '종로 궁궐 탐험',
    shortLabel: '궁궐',
    icon: '🏯',
    description: '종로의 대표 궁궐 세 곳을 모두 방문해요.',
    badgeName: '종로 궁궐 여행 완주',
    badgeDescription: '경복궁·창덕궁·창경궁을 모두 방문해 종로의 궁궐 여행을 완성했어요.',
    requiredPlaceIds: ['gyeongbokgung', 'changdeokgung', 'changgyeonggung'],
    points: 0,
  },
  'theme-jongno-history': {
    id: 'theme-jongno-history',
    districtId: 'jongno',
    name: '종로 역사 탐험',
    shortLabel: '역사',
    icon: '📜',
    description: '조선부터 현대까지 이어지는 종로의 역사 장소를 돌아봐요.',
    badgeName: '종로 역사 탐험가',
    badgeDescription: '종로의 대표 역사 장소를 모두 방문해 역사 탐험가가 되었어요.',
    requiredPlaceIds: [
      'gyeongbokgung',
      'jongmyo',
      'cheongwadae',
      'bukchon',
      'gwanghwamun-square',
    ],
    points: 0,
  },
  'theme-jongno-alley': {
    id: 'theme-jongno-alley',
    districtId: 'jongno',
    name: '종로 골목 탐험',
    shortLabel: '골목',
    icon: '🏘️',
    description: '한옥·시장·전통거리가 이어지는 종로의 골목을 걸어요.',
    badgeName: '종로 골목 여행자',
    badgeDescription: '종로의 한옥과 시장, 골목을 모두 방문해 골목 여행을 완성했어요.',
    requiredPlaceIds: ['insadong', 'ikseondong', 'bukchon', 'gwangjang-market'],
    points: 0,
  },
  'theme-jung-modern': {
    id: 'theme-jung-modern',
    districtId: 'jung',
    name: '중구 근현대 탐험',
    shortLabel: '근현대',
    icon: '🏛️',
    description: '덕수궁과 정동, 서울 도심의 근현대 흔적을 따라가요.',
    badgeName: '중구 근현대 탐험가',
    badgeDescription: '덕수궁·서울광장·숭례문·정동길을 방문해 중구 근현대 탐험을 완성했어요.',
    requiredPlaceIds: ['deoksugung', 'seoul-plaza', 'sungnyemun', 'jeongdong-gil'],
    points: 0,
  },
  'theme-jung-landmark': {
    id: 'theme-jung-landmark',
    districtId: 'jung',
    name: '중구 랜드마크 탐험',
    shortLabel: '랜드마크',
    icon: '🏙️',
    description: '중구를 대표하는 역사 건축과 현대 명소를 찾아가요.',
    badgeName: '중구 랜드마크 수집가',
    badgeDescription: '덕수궁·숭례문·명동대성당·DDP를 방문해 중구의 대표 랜드마크를 모았어요.',
    requiredPlaceIds: ['deoksugung', 'sungnyemun', 'myeongdong-cathedral', 'ddp'],
    points: 0,
  },
  'theme-jung-walk': {
    id: 'theme-jung-walk',
    districtId: 'jung',
    name: '중구 도심 산책',
    shortLabel: '산책',
    icon: '🌿',
    description: '한옥마을과 물길, 돌담길, 도심 정원을 이어 걸어요.',
    badgeName: '중구 도심 산책가',
    badgeDescription: '남산골한옥마을·장충단공원·청계천·정동길·서울로7017을 방문해 중구 도심 산책을 완성했어요.',
    requiredPlaceIds: ['namsangol-hanok', 'jangchungdan-park', 'cheonggyecheon', 'jeongdong-gil', 'seoullo-7017'],
    points: 0,
  },

  'theme-seodaemun-independence': {
    id: 'theme-seodaemun-independence',
    districtId: 'seodaemun',
    name: '서대문 독립 역사 탐험',
    shortLabel: '독립역사',
    icon: '🕊️',
    description: '독립문과 형무소, 독립공원을 따라 근현대사의 현장을 돌아봐요.',
    badgeName: '서대문 독립 역사 수호자',
    badgeDescription: '서대문형무소역사관·독립문·서대문독립공원을 방문해 독립 역사의 발자취를 완성했어요.',
    requiredPlaceIds: ['seodaemun-prison', 'dongnimmun', 'independence-park'],
    points: 0,
  },
  'theme-seodaemun-campus': {
    id: 'theme-seodaemun-campus',
    districtId: 'seodaemun',
    name: '서대문 캠퍼스 문화 탐험',
    shortLabel: '캠퍼스',
    icon: '🎓',
    description: '신촌과 이대, 연세대의 건축과 젊은 문화를 이어서 탐험해요.',
    badgeName: '서대문 캠퍼스 문화 여행자',
    badgeDescription: '이화여대 ECC·신촌 연세로·연세대 언더우드관을 방문해 서대문의 캠퍼스 문화를 완성했어요.',
    requiredPlaceIds: ['ewha-ecc', 'sinchon-yonsei-ro', 'yonsei-underwood'],
    points: 0,
  },
  'theme-seodaemun-nature': {
    id: 'theme-seodaemun-nature',
    districtId: 'seodaemun',
    name: '서대문 숲과 물길 탐험',
    shortLabel: '자연산책',
    icon: '🌿',
    description: '안산 숲길과 홍제천 물길, 자연사 공간을 이어 걸어요.',
    badgeName: '서대문 숲과 물길 탐험가',
    badgeDescription: '안산자락길·홍제천 인공폭포·연희숲속쉼터·서대문자연사박물관을 방문해 자연 탐험을 완성했어요.',
    requiredPlaceIds: [
      'ansan-jarakgil',
      'hongjecheon-waterfall',
      'yeonhui-forest-rest',
      'seodaemun-natural-history',
    ],
    points: 0,
  },

};

export const EXPLORATION_REWARD_BY_PLACE: Record<
  string,
  ExplorationRewardDefinition
> = Object.fromEntries(
  Object.values(EXPLORATION_PLACE_CATALOG).map((place) => [
    place.id,
    {
      points: place.rewardPoints,
      buildingId: place.rewardBuildingId,
      stampId: place.rewardStampId,
    },
  ])
);

export const EXPLORATION_PLACE_META: Record<
  string,
  {
    name: string;
    district: string;
    districtId: ExplorationDistrictId;
    areaType: string;
    rewardLabel: string;
    mapLatitude: number;
    mapLongitude: number;
  }
> = Object.fromEntries(
  Object.values(EXPLORATION_PLACE_CATALOG).map((place) => [
    place.id,
    {
      name: place.name,
      district: place.district,
      districtId: place.districtId,
      areaType: place.category,
      rewardLabel: place.rewardLabel,
      mapLatitude: place.mapLatitude,
      mapLongitude: place.mapLongitude,
    },
  ])
);

export const EXPLORATION_COLLECTION_ICON_BY_PLACE: Record<string, string> =
  Object.fromEntries(
    Object.values(EXPLORATION_PLACE_CATALOG).map((place) => [
      place.id,
      place.icon,
    ])
  );

export const EXPLORATION_THEME_META: Record<
  string,
  { name: string; icon: string; districtId: ExplorationDistrictId }
> = Object.fromEntries(
  Object.values(EXPLORATION_THEME_CATALOG).map((theme) => [
    theme.id,
    {
      name: theme.name,
      icon: theme.icon,
      districtId: theme.districtId,
    },
  ])
);

export const EXPLORATION_THEME_PLACE_IDS: Record<string, string[]> =
  Object.fromEntries(
    Object.values(EXPLORATION_THEME_CATALOG).map((theme) => [
      theme.id,
      [...theme.requiredPlaceIds],
    ])
  );

export const EXPLORATION_THEME_FILTERS = [
  { id: 'all', label: '전체', icon: '🗺️' },
  ...Object.values(EXPLORATION_THEME_CATALOG).map((theme) => ({
    id: theme.id,
    label: theme.shortLabel,
    icon: theme.icon,
  })),
] as const;

export const EXPLORATION_THEME_RULES = Object.values(
  EXPLORATION_THEME_CATALOG
).map((theme) => ({
  themeId: theme.id,
  districtId: theme.districtId,
  requiredPlaceIds: [...theme.requiredPlaceIds],
  points: theme.points,
}));

export const EXPLORATION_REWARD_NAMES: Record<string, string> =
  Object.fromEntries(
    Object.values(EXPLORATION_PLACE_CATALOG).map((place) => [
      place.rewardBuildingId,
      place.rewardLabel,
    ])
  );

export const EXPLORATION_THEME_BADGE_NAMES: Record<string, string> =
  Object.fromEntries(
    Object.values(EXPLORATION_THEME_CATALOG).map((theme) => [
      theme.id,
      theme.badgeName,
    ])
  );

export const EXPLORATION_THEME_BADGE_DESCRIPTIONS: Record<string, string> =
  Object.fromEntries(
    Object.values(EXPLORATION_THEME_CATALOG).map((theme) => [
      theme.id,
      theme.badgeDescription,
    ])
  );

export const EXPLORATION_DISTRICT_ROADMAP = EXPLORATION_DISTRICTS.map(
  (district) => ({
    id: district.id,
    name: district.name,
    icon: district.icon,
    status: district.available ? 'active' : 'planned',
    subtitle: district.available ? '현재 탐험 가능' : district.subtitle,
    order: district.order,
  })
) as Array<{
  id: ExplorationDistrictId;
  name: string;
  icon: string;
  status: 'active' | 'planned';
  subtitle: string;
  order: number;
}>;

export const getExplorationPlace = (placeId: unknown) => {
  const normalized = String(placeId ?? '')
    .trim()
    .replace(/^explore-/, '');

  return EXPLORATION_PLACE_CATALOG[normalized] ?? null;
};

export const getExplorationDistrict = (districtId: unknown) =>
  EXPLORATION_DISTRICTS.find(
    (district) => district.id === String(districtId ?? '').trim()
  ) ?? null;

export const getExplorationPlacesByDistrict = (districtId: unknown) => {
  const normalized = String(districtId ?? '').trim();

  return Object.values(EXPLORATION_PLACE_CATALOG).filter(
    (place) => place.districtId === normalized
  );
};

export const getExplorationThemesByDistrict = (districtId: unknown) => {
  const normalized = String(districtId ?? '').trim();

  return Object.values(EXPLORATION_THEME_CATALOG).filter(
    (theme) => theme.districtId === normalized
  );
};

export const isExplorationThemeComplete = (
  themeId: string,
  visitedPlaceIds: readonly string[]
) => {
  const theme = EXPLORATION_THEME_CATALOG[themeId];
  if (!theme) return false;

  const visited = new Set(
    visitedPlaceIds.map((placeId) => String(placeId ?? '').trim())
  );

  return theme.requiredPlaceIds.every((placeId) => visited.has(placeId));
};
