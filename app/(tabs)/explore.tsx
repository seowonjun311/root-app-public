import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, {
  Circle,
  G,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';

import {
  useRootTheme,
} from '../../store/rootTheme';

type ExplorationMapLevel =
  | 'korea'
  | 'seoul'
  | 'busan'
  | 'incheon'
  | 'gangwon'
  | 'gyeonggi'
  | 'daejeon'
  | 'gwangju'
  | 'jeju'
  | 'chungbuk'
  | 'chungnam'
  | 'jeonbuk'
  | 'jeonnam'
  | 'gyeongbuk'
  | 'gyeongnam'
  | 'daegu'
  | 'sejong'
  | 'ulsan';

type QuickMapLevel =
  | 'korea'
  | 'seoul'
  | 'gyeonggi'
  | 'gangwon'
  | 'chungbuk'
  | 'chungnam'
  | 'jeonbuk'
  | 'jeonnam'
  | 'gyeongbuk'
  | 'gyeongnam'
  | 'jeju'
  | 'busan'
  | 'incheon'
  | 'daegu'
  | 'daejeon'
  | 'gwangju'
  | 'sejong'
  | 'ulsan';

type ExploreContentMode =
  | 'places'
  | 'events'
  | 'facilities';

type HeavyExploreProps = {
  initialMapLevel?:
    ExplorationMapLevel;
  initialContentMode?:
    ExploreContentMode;
};

type HeavyExploreComponent =
  ComponentType<
    HeavyExploreProps
  >;

type QuickShapeBase = {
  id: string;
  points: string;
  labelX: number;
  labelY: number;
  labelSize?: number;
  touchRadius?: number;
};

type QuickShapeMapProps<
  T extends QuickShapeBase
> = {
  shapes: readonly T[];
  viewWidth: number;
  viewHeight: number;
  displayHeight: number;
  getLabel: (
    shape: T
  ) => string;
  getFill: (
    shape: T
  ) => string;
  getLabelSize?: (
    shape: T
  ) => number;
  getTouchSize?: (
    shape: T
  ) => number;
  onPress: (
    shape: T
  ) => void;
  backgroundColor: string;
  textColor: string;
};

type KoreaRegionShape = {
  id: Exclude<
    ExplorationMapLevel,
    'korea'
  >;
  shortLabel: string;
  points: string;
  labelX: number;
  labelY: number;
  fill: string;
  labelSize?: number;
  touchRadius?: number;
};

/*
 * 대한민국 17개 광역지역의 단순화 SVG 지도입니다.
 *
 * 큰 도·특별자치도는 Polygon 전체를 누르고,
 * 서울·세종·대전·광주·대구·울산·부산처럼 작은 지역은
 * 별도의 투명 터치 영역을 함께 사용합니다.
 *
 * 배열 뒤쪽에 있는 광역시가 앞쪽의 도 위에 표시되도록
 * 도 → 광역시 순서로 배치했습니다.
 */
const KOREA_REGION_SHAPES: KoreaRegionShape[] = [
  {
    id: 'gyeonggi',
    shortLabel: '경기',
    points:
      '95,45 145,28 185,45 202,78 193,115 175,145 140,150 112,128 90,95',
    labelX: 154,
    labelY: 68,
    fill: '#F6D463',
    labelSize: 12,
  },
  {
    id: 'gangwon',
    shortLabel: '강원',
    points:
      '175,35 230,20 286,42 310,83 302,128 270,158 225,150 193,115 202,78',
    labelX: 250,
    labelY: 82,
    fill: '#A9D489',
    labelSize: 12,
  },
  {
    id: 'chungnam',
    shortLabel: '충남',
    points:
      '67,125 112,128 140,150 158,188 142,224 97,232 58,205 48,165',
    labelX: 95,
    labelY: 181,
    fill: '#F2A9B5',
    labelSize: 11,
  },
  {
    id: 'chungbuk',
    shortLabel: '충북',
    points:
      '140,150 175,145 225,150 235,188 213,225 175,235 142,224 158,188',
    labelX: 190,
    labelY: 184,
    fill: '#74C7CC',
    labelSize: 11,
  },
  {
    id: 'gyeongbuk',
    shortLabel: '경북',
    points:
      '225,150 270,158 302,128 315,175 305,225 280,270 238,268 213,225 235,188',
    labelX: 270,
    labelY: 196,
    fill: '#F4B16A',
    labelSize: 11,
  },
  {
    id: 'jeonbuk',
    shortLabel: '전북',
    points:
      '97,232 142,224 175,235 188,274 168,305 118,307 82,282 70,250',
    labelX: 130,
    labelY: 267,
    fill: '#B5D47A',
    labelSize: 11,
  },
  {
    id: 'jeonnam',
    shortLabel: '전남',
    points:
      '58,275 82,282 118,307 168,305 182,348 158,385 110,400 65,372 40,330',
    labelX: 108,
    labelY: 350,
    fill: '#F3CF4A',
    labelSize: 11,
  },
  {
    id: 'gyeongnam',
    shortLabel: '경남',
    points:
      '168,305 188,274 238,268 280,270 292,315 270,355 230,375 182,348',
    labelX: 228,
    labelY: 319,
    fill: '#B9A0D0',
    labelSize: 11,
  },
  {
    id: 'jeju',
    shortLabel: '제주',
    points:
      '110,445 145,435 190,442 205,455 178,470 130,468 105,458',
    labelX: 155,
    labelY: 457,
    fill: '#89C878',
    labelSize: 10,
  },

  /*
   * 아래부터는 도 내부 또는 가장자리에 표시되는 광역시입니다.
   * 뒤에 그려져서 도 위에 나타납니다.
   */
  {
    id: 'incheon',
    shortLabel: '인천',
    points:
      '88,89 104,80 116,91 111,111 94,116 83,103',
    labelX: 99,
    labelY: 101,
    fill: '#78B7E3',
    labelSize: 8,
    touchRadius: 12,
  },
  {
    id: 'seoul',
    shortLabel: '서울',
    points:
      '116,91 131,83 143,95 137,110 120,111',
    labelX: 129,
    labelY: 100,
    fill: '#B56CC7',
    labelSize: 8,
    touchRadius: 11,
  },
  {
    id: 'sejong',
    shortLabel: '세종',
    points:
      '132,165 145,159 154,171 149,184 135,181',
    labelX: 143,
    labelY: 174,
    fill: '#F28A1B',
    labelSize: 8,
    touchRadius: 11,
  },
  {
    id: 'daejeon',
    shortLabel: '대전',
    points:
      '139,194 153,186 164,199 159,214 144,214',
    labelX: 152,
    labelY: 203,
    fill: '#4C85D9',
    labelSize: 8,
    touchRadius: 11,
  },
  {
    id: 'gwangju',
    shortLabel: '광주',
    points:
      '105,313 119,307 130,319 125,334 109,334 100,322',
    labelX: 115,
    labelY: 323,
    fill: '#5DAA34',
    labelSize: 8,
    touchRadius: 11,
  },
  {
    id: 'daegu',
    shortLabel: '대구',
    points:
      '242,230 259,222 272,236 266,251 248,252 238,242',
    labelX: 255,
    labelY: 240,
    fill: '#EF6458',
    labelSize: 8,
    touchRadius: 12,
  },
  {
    id: 'ulsan',
    shortLabel: '울산',
    points:
      '278,278 292,271 304,285 299,302 285,303 276,291',
    labelX: 290,
    labelY: 290,
    fill: '#43B7BD',
    labelSize: 8,
    touchRadius: 11,
  },
  {
    id: 'busan',
    shortLabel: '부산',
    points:
      '250,338 268,333 280,346 270,361 252,360 243,349',
    labelX: 261,
    labelY: 349,
    fill: '#2F64B3',
    labelSize: 8,
    touchRadius: 11,
  },
];





type SeoulDistrictShape = {
  id: string;
  name: string;
  points: string;
  labelX: number;
  labelY: number;
};

const SEOUL_DISTRICT_SHAPES: SeoulDistrictShape[] = [
  { id: 'eunpyeong', name: '은평구', points: '68,66 99,48 125,61 121,93 88,103 62,87', labelX: 94, labelY: 77 },
  { id: 'seodaemun', name: '서대문구', points: '88,103 121,93 145,107 139,137 104,143 78,124', labelX: 111, labelY: 120 },
  { id: 'mapo', name: '마포구', points: '52,125 78,124 104,143 139,137 147,163 108,177 70,166', labelX: 99, labelY: 153 },
  { id: 'jongno', name: '종로구', points: '121,93 158,76 194,82 204,109 176,124 145,107', labelX: 165, labelY: 102 },
  { id: 'jung', name: '중구', points: '139,137 145,107 176,124 181,148 155,160', labelX: 158, labelY: 140 },
  { id: 'yongsan', name: '용산구', points: '139,137 155,160 181,148 199,169 180,194 143,187 128,163', labelX: 166, labelY: 175 },
  { id: 'seongbuk', name: '성북구', points: '158,76 181,51 217,58 230,89 204,109 194,82', labelX: 200, labelY: 78 },
  { id: 'gangbuk', name: '강북구', points: '181,51 190,20 221,12 244,38 217,58', labelX: 214, labelY: 37 },
  { id: 'dobong', name: '도봉구', points: '221,12 251,6 270,28 267,58 244,38', labelX: 246, labelY: 27 },
  { id: 'nowon', name: '노원구', points: '267,58 270,28 300,25 321,55 315,91 285,101', labelX: 294, labelY: 64 },
  { id: 'jungnang', name: '중랑구', points: '230,89 267,58 285,101 278,132 244,132', labelX: 260, labelY: 108 },
  { id: 'dongdaemun', name: '동대문구', points: '204,109 230,89 244,132 226,151 181,148 176,124', labelX: 214, labelY: 127 },
  { id: 'seongdong', name: '성동구', points: '181,148 226,151 240,174 215,191 199,169', labelX: 213, labelY: 170 },
  { id: 'gwangjin', name: '광진구', points: '226,151 244,132 278,132 287,164 263,188 240,174', labelX: 258, labelY: 160 },
  { id: 'gangdong', name: '강동구', points: '287,164 315,148 346,158 355,193 325,210 291,193', labelX: 322, labelY: 182 },
  { id: 'songpa', name: '송파구', points: '263,188 287,164 291,193 325,210 316,244 276,251 249,222', labelX: 288, labelY: 219 },
  { id: 'gangnam', name: '강남구', points: '215,191 240,174 263,188 249,222 276,251 238,265 205,235', labelX: 238, labelY: 226 },
  { id: 'seocho', name: '서초구', points: '180,194 215,191 205,235 238,265 210,294 170,280 153,238', labelX: 195, labelY: 247 },
  { id: 'dongjak', name: '동작구', points: '143,187 180,194 153,238 120,231 109,205', labelX: 146, labelY: 212 },
  { id: 'gwanak', name: '관악구', points: '120,231 153,238 170,280 145,300 105,285 91,254', labelX: 132, labelY: 269 },
  { id: 'yeongdeungpo', name: '영등포구', points: '108,177 128,163 143,187 109,205 76,201 60,181', labelX: 103, labelY: 188 },
  { id: 'guro', name: '구로구', points: '60,181 76,201 109,205 120,231 91,254 54,245 37,213', labelX: 77, labelY: 222 },
  { id: 'geumcheon', name: '금천구', points: '91,254 105,285 91,319 66,302 54,270', labelX: 83, labelY: 285 },
  { id: 'yangcheon', name: '양천구', points: '37,213 54,245 54,270 25,262 13,229', labelX: 37, labelY: 242 },
  { id: 'gangseo', name: '강서구', points: '12,150 52,125 70,166 60,181 37,213 13,229 2,191', labelX: 31, labelY: 181 },

];





type GyeonggiDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 경기도 31개 시·군의 단순화 지도입니다.
 * 경기도 31개 시·군의 대표 장소·GPS·테마 탐험이 모두 연결되어 있습니다.
 */
const GYEONGGI_DISTRICT_SHAPES: GyeonggiDistrictShape[] = [
  { id: 'gyeonggi-yeoncheon', name: '연천군', icon: '🦕', subtitle: '구석기·한탄강 지질·고구려·고려·평화 탐험', points: '100,15 178,15 190,58 135,68 95,42', labelX: 137, labelY: 39 },
  { id: 'gyeonggi-pocheon', name: '포천시', icon: '🏞️', subtitle: '아트밸리·산정호수·한탄강 지질·숲과 계곡 탐험', points: '190,20 266,32 270,92 220,112 190,58', labelX: 230, labelY: 60 },
  { id: 'gyeonggi-paju', name: '파주시', icon: '🕊️', subtitle: 'DMZ·예술·책·호수산림 탐험', points: '28,60 95,42 135,68 116,122 48,120', labelX: 78, labelY: 87 },
  { id: 'gyeonggi-dongducheon', name: '동두천시', icon: '🌲', subtitle: '소요산·평화역사·숲모험·레트로거리 탐험', points: '135,68 190,58 188,100 158,117 116,96', labelX: 153, labelY: 91 },
  { id: 'gyeonggi-yangju', name: '양주시', icon: '🎨', subtitle: '회암사지·양주목·별산대·장흥예술·꽃숲산길 탐험', points: '116,96 158,117 188,100 211,128 178,155 120,145', labelX: 156, labelY: 130 },
  { id: 'gyeonggi-uijeongbu', name: '의정부시', icon: '🥾', subtitle: '산사·수락산·예술도서관·경전철·원도심 탐험', points: '178,155 211,128 238,146 228,180 190,184', labelX: 209, labelY: 159 },
  { id: 'gyeonggi-gapyeong', name: '가평군', icon: '🌲', subtitle: '자라섬·아침고요·산과 계곡 탐험', points: '270,92 330,76 350,132 320,184 270,166 220,112', labelX: 302, labelY: 128 },
  { id: 'gyeonggi-gimpo', name: '김포시', icon: '🌉', subtitle: '애기봉·왕릉·성곽·항구·수로문화·한강생태 탐험', points: '15,130 72,122 83,169 53,197 10,176', labelX: 45, labelY: 158 },
  { id: 'gyeonggi-goyang', name: '고양시', icon: '🌸', subtitle: '호수공원·행주산성·왕릉·습지 탐험', points: '72,122 120,145 116,192 70,205 53,197 83,169', labelX: 94, labelY: 166 },
  { id: 'gyeonggi-guri', name: '구리시', icon: '🏺', subtitle: '동구릉·고구려·호수·한강·시장·생태 탐험', points: '228,180 250,172 260,199 238,218 218,204', labelX: 240, labelY: 197 },
  { id: 'gyeonggi-namyangju', name: '남양주시', icon: '🌿', subtitle: '다산·왕릉·사찰·호수·산림 탐험', points: '238,146 270,166 320,184 303,228 260,224 238,218 260,199', labelX: 279, labelY: 192 },
  { id: 'gyeonggi-yangpyeong', name: '양평군', icon: '🌿', subtitle: '두물머리·연꽃정원·용문산·문학·철도 탐험', points: '303,228 320,184 350,196 355,254 323,275 286,253', labelX: 329, labelY: 228 },
  { id: 'gyeonggi-bucheon', name: '부천시', icon: '🎬', subtitle: '만화·예술·꽃·생태 탐험', points: '18,210 62,205 70,239 45,257 12,242', labelX: 42, labelY: 231 },
  { id: 'gyeonggi-gwangmyeong', name: '광명시', icon: '💎', subtitle: '광명동굴·시장·문학·숲과 습지 탐험', points: '62,205 104,207 108,241 70,239', labelX: 85, labelY: 225 },
  { id: 'gyeonggi-anyang', name: '안양시', icon: '🎨', subtitle: '예술공원·건축·산사·안양천·도심공원 탐험', points: '104,207 145,205 151,241 108,241', labelX: 128, labelY: 225 },
  { id: 'gyeonggi-gwacheon', name: '과천시', icon: '🦁', subtitle: '대공원·동물원·과학·미술·역사·관악산 탐험', points: '145,205 183,202 190,238 151,241', labelX: 168, labelY: 223 },
  { id: 'gyeonggi-seongnam', name: '성남시', icon: '🌆', subtitle: '판교역사·예술·미래산업·공원생태·전통시장 탐험', points: '183,202 218,204 238,218 230,252 190,238', labelX: 211, labelY: 226 },
  { id: 'gyeonggi-hanam', name: '하남시', icon: '🌳', subtitle: '검단산·미사·도시전망·역사문화 탐험', points: '238,218 260,224 268,255 230,252', labelX: 250, labelY: 240 },
  { id: 'gyeonggi-gwangju', name: '광주시', icon: '🏯', subtitle: '남한산성·왕실도자·팔당습지·화담숲 탐험', points: '260,224 303,228 286,253 290,287 250,284 268,255', labelX: 277, labelY: 257 },
  { id: 'gyeonggi-siheung', name: '시흥시', icon: '🌅', subtitle: '오이도·선사·갯골·연꽃·호수·해양레저 탐험', points: '20,258 70,239 80,278 50,302 15,287', labelX: 48, labelY: 273 },
  { id: 'gyeonggi-ansan', name: '안산시', icon: '🌊', subtitle: '대부도·서해낙조·갯벌생태·예술·다문화 탐험', points: '70,239 108,241 118,281 80,278', labelX: 95, labelY: 263 },
  { id: 'gyeonggi-gunpo', name: '군포시', icon: '🌺', subtitle: '수리산·사찰·호수·철쭉·생태·도시문화 탐험', points: '108,241 151,241 156,278 118,281', labelX: 133, labelY: 262 },
  { id: 'gyeonggi-uiwang', name: '의왕시', icon: '🚂', subtitle: '왕송호수·철도·조류생태·백운호수·산사·한글문화 탐험', points: '151,241 190,238 194,276 156,278', labelX: 174, labelY: 260 },
  { id: 'gyeonggi-suwon', name: '수원시', icon: '🏰', subtitle: '수원화성·행궁동·호수공원 탐험', points: '194,276 230,252 250,284 237,316 194,315', labelX: 219, labelY: 288 },
  { id: 'gyeonggi-yongin', name: '용인시', icon: '🎢', subtitle: '에버랜드·민속촌·미술·숲정원 탐험', points: '230,252 268,255 290,287 280,325 237,316 250,284', labelX: 261, labelY: 288 },
  { id: 'gyeonggi-icheon', name: '이천시', icon: '🏺', subtitle: '도자예술·설봉역사·온천·농촌문화 탐험', points: '290,287 323,275 350,298 344,337 305,342 280,325', labelX: 318, labelY: 310 },
  { id: 'gyeonggi-hwaseong', name: '화성시', icon: '🌊', subtitle: '제부도·궁평항·융건릉·공룡화석 탐험', points: '50,302 80,278 118,281 156,278 194,315 174,350 110,360 55,342', labelX: 117, labelY: 320 },
  { id: 'gyeonggi-osan', name: '오산시', icon: '🕊️', subtitle: '독산성·평화·미니어처·수목원 탐험', points: '174,350 194,315 237,316 232,352 198,368', labelX: 207, labelY: 339 },
  { id: 'gyeonggi-pyeongtaek', name: '평택시', icon: '⚓', subtitle: '평택호·항만·생태정원·역사·국제문화 탐험', points: '110,360 174,350 198,368 190,410 118,414 85,388', labelX: 143, labelY: 384 },
  { id: 'gyeonggi-anseong', name: '안성시', icon: '🎭', subtitle: '남사당·농촌체험·사찰·성지·산성·호수 탐험', points: '198,368 232,352 280,325 305,342 300,390 250,414 190,410', labelX: 251, labelY: 375 },
  { id: 'gyeonggi-yeoju', name: '여주시', icon: '👑', subtitle: '왕릉·왕비생가·고찰·도자·남한강 생태 탐험', points: '305,342 344,337 355,370 340,410 300,390', labelX: 329, labelY: 371 },
];




type BusanDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 부산 16개 구·군의 단순화 지도입니다.
 * 부산 16개 구·군의 실제 장소·GPS·테마 데이터를 연결하고,
 * 원도심·역사공원·해운대·기장 추가 명소 30곳도 반영했습니다.
 */
const BUSAN_DISTRICT_SHAPES: BusanDistrictShape[] = [
  {
    id: 'busan-gangseo',
    name: '강서구',
    icon: '🌾',
    subtitle: '가덕도·대항전망대·낙동강생태·명지수변 탐험',
    points: '10,90 85,60 130,55 115,115 125,160 95,205 45,220 15,175',
    labelX: 64,
    labelY: 143,
  },
  {
    id: 'busan-buk',
    name: '북구',
    icon: '🌳',
    subtitle: '낙동강·수목원 탐험',
    points: '130,55 190,25 180,80 155,130 115,115',
    labelX: 151,
    labelY: 79,
  },
  {
    id: 'busan-geumjeong',
    name: '금정구',
    icon: '⛰️',
    subtitle: '금정산성·범어사·회동수원지·온천천 탐험',
    points: '190,25 250,20 265,110 220,115 180,80',
    labelX: 220,
    labelY: 68,
  },
  {
    id: 'busan-gijang',
    name: '기장군',
    icon: '🌊',
    subtitle: '동부산 해안·과학 탐험',
    points: '250,20 335,35 350,90 330,145 290,150 265,110',
    labelX: 307,
    labelY: 83,
  },
  {
    id: 'busan-sasang',
    name: '사상구',
    icon: '🌿',
    subtitle: '삼락생태공원·감전문화·낙동강 숲길 탐험',
    points: '95,205 125,160 165,160 175,215 135,240',
    labelX: 136,
    labelY: 199,
  },
  {
    id: 'busan-busanjin',
    name: '부산진구',
    icon: '🌃',
    subtitle: '서면·전포카페거리·시민공원·산복문화 탐험',
    points: '165,160 155,130 180,80 220,115 220,165 195,195 175,215',
    labelX: 188,
    labelY: 147,
  },
  {
    id: 'busan-dongnae',
    name: '동래구',
    icon: '🏯',
    subtitle: '읍성·온천 역사 탐험',
    points: '220,115 265,110 260,155 220,165',
    labelX: 241,
    labelY: 139,
  },
  {
    id: 'busan-yeonje',
    name: '연제구',
    icon: '🏟️',
    subtitle: '배산성지·온천천·시청·생활문화 탐험',
    points: '220,165 260,155 275,185 240,205 195,195',
    labelX: 238,
    labelY: 183,
  },
  {
    id: 'busan-haeundae',
    name: '해운대구',
    icon: '🏖️',
    subtitle: '해운대·송정 바다 탐험',
    points: '275,185 260,155 290,150 330,145 345,190 320,225 280,225',
    labelX: 310,
    labelY: 187,
  },
  {
    id: 'busan-suyeong',
    name: '수영구',
    icon: '🌉',
    subtitle: '광안리·민락수변·망미골목·수영사적 탐험',
    points: '240,205 275,185 280,225 255,245 225,232',
    labelX: 255,
    labelY: 222,
  },
  {
    id: 'busan-nam',
    name: '남구',
    icon: '🌅',
    subtitle: '오륙도·역사문화 탐험',
    points: '195,195 240,205 225,232 245,270 205,280 170,245',
    labelX: 208,
    labelY: 242,
  },
  {
    id: 'busan-dong',
    name: '동구',
    icon: '🚉',
    subtitle: '부산역·이바구길 탐험',
    points: '175,215 195,195 170,245 155,255 135,240',
    labelX: 169,
    labelY: 230,
  },
  {
    id: 'busan-jung',
    name: '중구',
    icon: '🗼',
    subtitle: '부산 원도심·시장 탐험',
    points: '135,240 155,255 145,275 122,272',
    labelX: 139,
    labelY: 260,
  },
  {
    id: 'busan-seo',
    name: '서구',
    icon: '🚡',
    subtitle: '송도·해안산책 탐험',
    points: '95,205 135,240 122,272 90,260 72,235',
    labelX: 104,
    labelY: 243,
  },
  {
    id: 'busan-saha',
    name: '사하구',
    icon: '🌇',
    subtitle: '감천문화·다대포·을숙도·아미산 낙조 탐험',
    points: '45,220 95,205 72,235 90,260 72,300 30,290 15,250',
    labelX: 55,
    labelY: 263,
  },
  {
    id: 'busan-yeongdo',
    name: '영도구',
    icon: '⚓',
    subtitle: '태종대·흰여울·봉래산·항구 해안 탐험',
    points: '145,275 170,245 205,280 190,310 155,315 130,295',
    labelX: 168,
    labelY: 292,
  },

];


type IncheonDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 인천 11개 지역의 단순화 지도입니다.
 * 제물포구·영종구·서해구·검단구를 포함한 현재 행정구역 기준으로
 * 실제 장소·GPS·테마 데이터를 연결합니다.
 */
const INCHEON_DISTRICT_SHAPES: IncheonDistrictShape[] = [
  {
    id: 'incheon-ganghwa',
    name: '강화군',
    icon: '🏯',
    subtitle: '고인돌·고려·평화·마니산·섬마을 탐험',
    points: '15,25 92,18 116,58 98,108 44,120 10,82',
    labelX: 62,
    labelY: 67,
  },
  {
    id: 'incheon-geomdan',
    name: '검단구',
    icon: '🏺',
    subtitle: '선사·가현산·아라뱃길·신도시 탐험',
    points: '112,55 172,45 191,92 166,125 108,113',
    labelX: 148,
    labelY: 87,
  },
  {
    id: 'incheon-gyeyang',
    name: '계양구',
    icon: '⛰️',
    subtitle: '계양산·산성·아라뱃길·역사문화 탐험',
    points: '172,45 230,55 238,105 191,115 191,92',
    labelX: 210,
    labelY: 80,
  },
  {
    id: 'incheon-seohae',
    name: '서해구',
    icon: '🌊',
    subtitle: '청라호수·생태·도자·도시숲 탐험',
    points: '108,113 166,125 182,171 145,205 92,178',
    labelX: 137,
    labelY: 157,
  },
  {
    id: 'incheon-bupyeong',
    name: '부평구',
    icon: '🎵',
    subtitle: '캠프마켓·문화거리·굴포천·나비공원 탐험',
    points: '166,125 191,115 238,105 246,158 214,181 182,171',
    labelX: 211,
    labelY: 145,
  },
  {
    id: 'incheon-namdong',
    name: '남동구',
    icon: '🌾',
    subtitle: '소래·습지·대공원·시장 탐험',
    points: '246,158 305,165 330,213 294,245 239,222 214,181',
    labelX: 277,
    labelY: 202,
  },
  {
    id: 'incheon-michuhol',
    name: '미추홀구',
    icon: '🏟️',
    subtitle: '문학산·도호부·수봉·생활문화 탐험',
    points: '182,171 214,181 239,222 207,244 166,222 145,205',
    labelX: 193,
    labelY: 211,
  },
  {
    id: 'incheon-jemulpo',
    name: '제물포구',
    icon: '⚓',
    subtitle: '개항장·월미도·배다리 탐험',
    points: '92,178 145,205 166,222 153,258 105,268 72,233',
    labelX: 122,
    labelY: 229,
  },
  {
    id: 'incheon-yeonsu',
    name: '연수구',
    icon: '🌆',
    subtitle: '송도·능허대·청량산 탐험',
    points: '166,222 207,244 239,222 280,265 248,310 189,302 153,258',
    labelX: 218,
    labelY: 273,
  },
  {
    id: 'incheon-yeongjong',
    name: '영종구',
    icon: '✈️',
    subtitle: '공항·영종 해안·용유·무의 탐험',
    points: '22,160 79,145 104,178 72,233 105,268 70,288 20,252 8,205',
    labelX: 55,
    labelY: 215,
  },
  {
    id: 'incheon-ongjin',
    name: '옹진군',
    icon: '🏝️',
    subtitle: '백령·대청·연평·덕적·영흥 섬과 지질·평화 탐험',
    points: '18,280 75,288 104,318 65,326 22,315',
    labelX: 57,
    labelY: 307,
  },
];


type DaeguDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 대구광역시 9개 구·군의 단순화 지도입니다.
 * 중구·동구·서구·남구·북구·수성구·달서구·달성군·군위군의
 * 실제 장소·GPS·테마 데이터를 기존 지역 상세 화면에 연결합니다.
 */
const DAEGU_DISTRICT_SHAPES: DaeguDistrictShape[] = [
  {
    id: 'daegu-gunwi',
    name: '군위군',
    icon: '🛕',
    subtitle: '삼국유사·화본역·팔공산 북부·한밤마을 탐험',
    points: '150,12 245,18 312,55 300,112 236,126 178,94 132,55',
    labelX: 221,
    labelY: 64,
  },
  {
    id: 'daegu-buk',
    name: '북구',
    icon: '🌉',
    subtitle: '금호강·구암동고분군·침산 탐험',
    points: '92,90 132,55 178,94 200,137 168,170 112,158 78,126',
    labelX: 139,
    labelY: 127,
  },
  {
    id: 'daegu-dong',
    name: '동구',
    icon: '🏔️',
    subtitle: '팔공산·동화사·동촌유원지 탐험',
    points: '178,94 236,126 300,112 342,148 326,214 270,226 214,184 200,137',
    labelX: 269,
    labelY: 166,
  },
  {
    id: 'daegu-seo',
    name: '서구',
    icon: '🌿',
    subtitle: '이현공원·달성토성·생활문화 탐험',
    points: '40,143 78,126 112,158 118,201 82,225 38,200',
    labelX: 77,
    labelY: 177,
  },
  {
    id: 'daegu-jung',
    name: '중구',
    icon: '🏙️',
    subtitle: '근대골목·서문시장·김광석길 탐험',
    points: '112,158 168,170 174,210 139,230 118,201',
    labelX: 143,
    labelY: 194,
  },
  {
    id: 'daegu-nam',
    name: '남구',
    icon: '🎨',
    subtitle: '앞산·안지랑·대명공연거리 탐험',
    points: '118,201 139,230 174,210 198,247 165,276 116,258 82,225',
    labelX: 145,
    labelY: 240,
  },
  {
    id: 'daegu-suseong',
    name: '수성구',
    icon: '🌊',
    subtitle: '수성못·미술관·진밭골 탐험',
    points: '174,210 214,184 270,226 282,282 232,310 198,247',
    labelX: 232,
    labelY: 252,
  },
  {
    id: 'daegu-dalseo',
    name: '달서구',
    icon: '🗼',
    subtitle: '이월드·수목원·월광수변·선사문화 탐험',
    points: '38,200 82,225 116,258 106,310 55,322 18,278',
    labelX: 70,
    labelY: 270,
  },
  {
    id: 'daegu-dalseong',
    name: '달성군',
    icon: '🌸',
    subtitle: '비슬산·사문진·달성습지·도동서원 탐험',
    points: '106,310 116,258 165,276 198,247 232,310 214,335 145,342 55,322',
    labelX: 151,
    labelY: 311,
  },
];


type DaejeonDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 대전광역시 5개 자치구의 단순화 지도입니다.
 * 유성구·대덕구·서구·중구·동구의 기존 장소·GPS·테마 데이터를
 * 기존 지역 상세 화면에 그대로 연결합니다.
 */
const DAEJEON_DISTRICT_SHAPES: DaejeonDistrictShape[] = [
  {
    id: 'daejeon-yuseong',
    name: '유성구',
    icon: '🔬',
    subtitle: '과학도시·유성온천·현충원·계룡산 숲길 탐험',
    points: '20,50 170,25 210,75 190,150 120,190 35,155',
    labelX: 107,
    labelY: 105,
  },
  {
    id: 'daejeon-daedeok',
    name: '대덕구',
    icon: '🌲',
    subtitle: '계족산·대청호·동춘당·산업역사 탐험',
    points: '210,30 335,55 330,155 255,165 190,150 210,75',
    labelX: 270,
    labelY: 103,
  },
  {
    id: 'daejeon-seo',
    name: '서구',
    icon: '🌳',
    subtitle: '한밭수목원·예술·도심공원·장태산 탐험',
    points: '35,155 120,190 190,150 210,220 160,290 55,270 20,220',
    labelX: 111,
    labelY: 226,
  },
  {
    id: 'daejeon-jung',
    name: '중구',
    icon: '🎭',
    subtitle: '오월드·뿌리공원·보문산·원도심문화 탐험',
    points: '190,150 255,165 265,230 220,285 160,290 210,220',
    labelX: 220,
    labelY: 225,
  },
  {
    id: 'daejeon-dong',
    name: '동구',
    icon: '🌄',
    subtitle: '대청호·식장산·숲휴양·원도심·철도문화 탐험',
    points: '255,165 330,155 345,240 300,305 220,285 265,230',
    labelX: 292,
    labelY: 235,
  },
];


type GwangjuDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 광주광역시 5개 자치구의 단순화 지도입니다.
 * 광산구·북구·서구·동구·남구의 기존 장소·GPS·테마 데이터를
 * 기존 지역 상세 화면에 그대로 연결합니다.
 */
const GWANGJU_DISTRICT_SHAPES: GwangjuDistrictShape[] = [
  {
    id: 'gwangju-gwangsan',
    name: '광산구',
    icon: '🌾',
    subtitle: '송정·황룡강·선비문학·공동체 탐험',
    points: '10,78 92,38 150,72 150,135 132,212 72,260 18,224',
    labelX: 79,
    labelY: 143,
  },
  {
    id: 'gwangju-buk',
    name: '북구',
    icon: '🌿',
    subtitle: '비엔날레·박물관·5·18·호수생태 탐험',
    points: '92,38 235,18 340,72 315,150 232,155 150,135 150,72',
    labelX: 229,
    labelY: 91,
  },
  {
    id: 'gwangju-seo',
    name: '서구',
    icon: '🌳',
    subtitle: '상무·5·18·호수공원·도심문화 탐험',
    points: '132,135 232,155 220,225 132,212',
    labelX: 181,
    labelY: 183,
  },
  {
    id: 'gwangju-dong',
    name: '동구',
    icon: '🎨',
    subtitle: '민주·예술·무등산 문화생태 탐험',
    points: '232,155 315,150 305,245 220,225',
    labelX: 269,
    labelY: 199,
  },
  {
    id: 'gwangju-nam',
    name: '남구',
    icon: '🏺',
    subtitle: '양림·사직·근대역사·전통민속 탐험',
    points: '72,260 132,212 220,225 305,245 270,314 150,310',
    labelX: 190,
    labelY: 270,
  },
];




type GangwonDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 강원특별자치도 18개 시·군의 단순화 지도입니다.
 * 기존 장소·GPS·테마 데이터는 지역 상세 화면에서 그대로 사용합니다.
 */
const GANGWON_DISTRICT_SHAPES: GangwonDistrictShape[] = [
  {
    id: 'gangwon-cheorwon',
    name: '철원군',
    icon: '🕊️',
    subtitle: '한탄강 지질·DMZ 평화·태봉역사·사찰 탐험',
    points: '20,30 90,20 110,65 80,95 25,90',
    labelX: 61,
    labelY: 58,
  },
  {
    id: 'gangwon-hwacheon',
    name: '화천군',
    icon: '🐟',
    subtitle: '파로호·산소길·DMZ 평화·별·계곡 탐험',
    points: '90,20 145,25 160,70 110,65',
    labelX: 127,
    labelY: 47,
  },
  {
    id: 'gangwon-yanggu',
    name: '양구군',
    icon: '🌿',
    subtitle: '파로호·숲·예술·국토정중앙·DMZ 생태 탐험',
    points: '145,25 200,30 205,78 160,70',
    labelX: 181,
    labelY: 52,
  },
  {
    id: 'gangwon-goseong',
    name: '고성군',
    icon: '🌊',
    subtitle: 'DMZ·화진포·송지호·왕곡마을·동해 누정 탐험',
    points: '250,20 320,25 340,90 295,100 260,70',
    labelX: 298,
    labelY: 59,
  },
  {
    id: 'gangwon-chuncheon',
    name: '춘천시',
    icon: '🌊',
    subtitle: '남이섬·강촌·소양강·의암호·문학문화 탐험',
    points: '65,90 110,65 160,70 170,120 125,145 75,135',
    labelX: 119,
    labelY: 107,
  },
  {
    id: 'gangwon-inje',
    name: '인제군',
    icon: '🏞️',
    subtitle: '설악고산·백담계곡·자작나무·평화생태 탐험',
    points: '160,70 205,78 260,70 295,100 275,145 215,150 170,120',
    labelX: 229,
    labelY: 109,
  },
  {
    id: 'gangwon-sokcho',
    name: '속초시',
    icon: '🏔️',
    subtitle: '권금성·울산바위·청초호·대포항·외옹치 탐험',
    points: '295,100 340,90 345,135 310,150 275,145',
    labelX: 316,
    labelY: 122,
  },
  {
    id: 'gangwon-yangyang',
    name: '양양군',
    icon: '🏄',
    subtitle: '낙산사·서핑해안·오색·미천골·남애항 탐험',
    points: '275,145 310,150 338,185 310,220 270,205',
    labelX: 306,
    labelY: 183,
  },
  {
    id: 'gangwon-hongcheon',
    name: '홍천군',
    icon: '🌲',
    subtitle: '팔봉산·수타사·무궁화·숲·산악레저 탐험',
    points: '75,135 125,145 170,120 215,150 205,195 145,205 90,185',
    labelX: 145,
    labelY: 166,
  },
  {
    id: 'gangwon-hoengseong',
    name: '횡성군',
    icon: '🐄',
    subtitle: '호수·고원숲·근대문화·가족레저 탐험',
    points: '90,185 145,205 150,250 95,250 65,215',
    labelX: 112,
    labelY: 222,
  },
  {
    id: 'gangwon-pyeongchang',
    name: '평창군',
    icon: '🏂',
    subtitle: '대관령목장·발왕산·오대산·백룡동굴·효석마을 탐험',
    points: '145,205 205,195 250,215 245,265 190,280 150,250',
    labelX: 199,
    labelY: 235,
  },
  {
    id: 'gangwon-gangneung',
    name: '강릉시',
    icon: '🌅',
    subtitle: '경포·주문진·헌화로·안반데기·커피문화 탐험',
    points: '270,205 310,220 330,270 285,280 245,265 250,215',
    labelX: 291,
    labelY: 244,
  },
  {
    id: 'gangwon-wonju',
    name: '원주시',
    icon: '🌉',
    subtitle: '소금산·치악산·예술·역사 탐험',
    points: '65,215 95,250 150,250 145,300 85,310 45,270',
    labelX: 98,
    labelY: 275,
  },
  {
    id: 'gangwon-jeongseon',
    name: '정선군',
    icon: '🚂',
    subtitle: '민둥산·정암사·병방치·아우라지·운탄고도 탐험',
    points: '190,280 245,265 285,280 275,320 220,335 175,315',
    labelX: 232,
    labelY: 301,
  },
  {
    id: 'gangwon-yeongwol',
    name: '영월군',
    icon: '🌌',
    subtitle: '단종역사·동강지질·래프팅·별빛·박물관 탐험',
    points: '145,300 175,315 220,335 180,355 125,345 85,310',
    labelX: 155,
    labelY: 329,
  },
  {
    id: 'gangwon-donghae',
    name: '동해시',
    icon: '🌊',
    subtitle: '무릉계곡·베틀바위·묵호·추암·망상 탐험',
    points: '285,280 330,270 342,305 312,325 275,320',
    labelX: 310,
    labelY: 300,
  },
  {
    id: 'gangwon-taebaek',
    name: '태백시',
    icon: '⛰️',
    subtitle: '태백산·발원지·지질·탄광문화·고원 탐험',
    points: '220,335 275,320 312,325 290,355 240,360',
    labelX: 268,
    labelY: 343,
  },
  {
    id: 'gangwon-samcheok',
    name: '삼척시',
    icon: '🌊',
    subtitle: '환선굴·대금굴·초곡해안·장호항·덕풍계곡 탐험',
    points: '312,325 342,305 350,345 320,365 290,355',
    labelX: 323,
    labelY: 341,
  },
];


type ChungbukDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 충청북도 11개 시·군의 단순화 지도입니다.
 * 기존 장소·GPS·테마 데이터는 지역 상세 화면에서 그대로 사용합니다.
 */
const CHUNGBUK_DISTRICT_SHAPES: ChungbukDistrictShape[] = [
  {
    id: 'chungbuk-chungju',
    name: '충주시',
    icon: '🏞️',
    subtitle: '호수·온천·중원문화·동굴·산성 탐험',
    points: '32,38 116,22 154,58 142,112 88,136 30,104',
    labelX: 91,
    labelY: 76,
  },
  {
    id: 'chungbuk-jecheon',
    name: '제천시',
    icon: '🌊',
    subtitle: '청풍호·월악산·의림지·약초문화 탐험',
    points: '154,58 224,28 276,54 266,116 210,142 142,112',
    labelX: 207,
    labelY: 82,
  },
  {
    id: 'chungbuk-danyang',
    name: '단양군',
    icon: '⛰️',
    subtitle: '도담삼봉·소백산·동굴·스카이워크 탐험',
    points: '276,54 332,42 350,96 330,152 278,150 266,116',
    labelX: 309,
    labelY: 99,
  },
  {
    id: 'chungbuk-eumseong',
    name: '음성군',
    icon: '🌳',
    subtitle: '평화기념·숲·성당·박물관 탐험',
    points: '30,104 88,136 104,190 52,212 18,172',
    labelX: 62,
    labelY: 160,
  },
  {
    id: 'chungbuk-jincheon',
    name: '진천군',
    icon: '🌉',
    subtitle: '농다리·초평호·보탑사·생거문화 탐험',
    points: '88,136 142,112 172,162 156,210 104,190',
    labelX: 131,
    labelY: 163,
  },
  {
    id: 'chungbuk-jeungpyeong',
    name: '증평군',
    icon: '🌲',
    subtitle: '좌구산·보강천·자전거·역사문화 탐험',
    points: '156,210 172,162 214,160 224,202 194,226',
    labelX: 190,
    labelY: 190,
  },
  {
    id: 'chungbuk-goesan',
    name: '괴산군',
    icon: '🏔️',
    subtitle: '산막이옛길·화양구곡·계곡·호수 탐험',
    points: '210,142 266,116 278,150 306,206 264,242 224,202 214,160',
    labelX: 258,
    labelY: 184,
  },
  {
    id: 'chungbuk-cheongju',
    name: '청주시',
    icon: '📚',
    subtitle: '직지·상당산성·청남대·현대미술 탐험',
    points: '18,172 52,212 104,190 156,210 194,226 178,282 108,302 42,264',
    labelX: 106,
    labelY: 240,
  },
  {
    id: 'chungbuk-boeun',
    name: '보은군',
    icon: '🌲',
    subtitle: '속리산·법주사·말티재·산성 탐험',
    points: '194,226 224,202 264,242 250,292 206,306 178,282',
    labelX: 220,
    labelY: 261,
  },
  {
    id: 'chungbuk-okcheon',
    name: '옥천군',
    icon: '📖',
    subtitle: '정지용문학·대청호·근대문화·숲 탐험',
    points: '108,302 178,282 206,306 208,350 146,364 94,340',
    labelX: 156,
    labelY: 325,
  },
  {
    id: 'chungbuk-yeongdong',
    name: '영동군',
    icon: '🎵',
    subtitle: '국악·와인·월류봉·폭포·사찰 탐험',
    points: '206,306 250,292 306,322 286,374 208,350',
    labelX: 252,
    labelY: 334,
  },
];


type ChungnamDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 충청남도 15개 시·군의 단순화 지도입니다.
 * 기존 장소·GPS·테마 데이터는 지역 상세 화면에서 그대로 사용합니다.
 */
const CHUNGNAM_DISTRICT_SHAPES: ChungnamDistrictShape[] = [
  {
    id: 'chungnam-dangjin',
    name: '당진시',
    icon: '🌅',
    subtitle: '서해대교·왜목마을·삽교호·해안문화 탐험',
    points: '58,30 128,18 164,54 148,102 82,112 42,72',
    labelX: 102,
    labelY: 66,
  },
  {
    id: 'chungnam-asan',
    name: '아산시',
    icon: '♨️',
    subtitle: '온양온천·현충사·외암마을·호수 탐험',
    points: '164,54 226,30 260,66 246,116 184,126 148,102',
    labelX: 205,
    labelY: 80,
  },
  {
    id: 'chungnam-cheonan',
    name: '천안시',
    icon: '🏛️',
    subtitle: '독립기념관·유관순·박물관·산책 탐험',
    points: '260,66 326,48 350,96 332,150 270,150 246,116',
    labelX: 299,
    labelY: 101,
  },
  {
    id: 'chungnam-taean',
    name: '태안군',
    icon: '🌊',
    subtitle: '해안국립공원·꽃지·신두리·섬 탐험',
    points: '14,70 42,72 82,112 68,174 34,224 10,180',
    labelX: 42,
    labelY: 137,
  },
  {
    id: 'chungnam-seosan',
    name: '서산시',
    icon: '🪨',
    subtitle: '해미읍성·마애삼존불·간월암·철새 탐험',
    points: '82,112 148,102 184,126 174,184 112,204 68,174',
    labelX: 126,
    labelY: 151,
  },
  {
    id: 'chungnam-yesan',
    name: '예산군',
    icon: '🌳',
    subtitle: '수덕사·예당호·덕산온천·시장 탐험',
    points: '184,126 246,116 270,150 250,204 190,216 174,184',
    labelX: 221,
    labelY: 164,
  },
  {
    id: 'chungnam-hongseong',
    name: '홍성군',
    icon: '🏯',
    subtitle: '홍주읍성·김좌진·남당항·역사문화 탐험',
    points: '68,174 112,204 126,252 70,268 34,224',
    labelX: 79,
    labelY: 220,
  },
  {
    id: 'chungnam-cheongyang',
    name: '청양군',
    icon: '⛰️',
    subtitle: '칠갑산·천장호·장곡사·알프스마을 탐험',
    points: '112,204 174,184 190,216 184,268 126,252',
    labelX: 153,
    labelY: 228,
  },
  {
    id: 'chungnam-gongju',
    name: '공주시',
    icon: '👑',
    subtitle: '공산성·무령왕릉·마곡사·백제문화 탐험',
    points: '250,204 270,150 332,150 336,214 286,246 236,238',
    labelX: 291,
    labelY: 192,
  },
  {
    id: 'chungnam-gyeryong',
    name: '계룡시',
    icon: '🌲',
    subtitle: '계룡산·군문화·숲길·신도안 탐험',
    points: '286,246 336,214 352,250 330,282 292,278',
    labelX: 320,
    labelY: 251,
  },
  {
    id: 'chungnam-boryeong',
    name: '보령시',
    icon: '🏖️',
    subtitle: '대천해수욕장·머드·성주산·섬 탐험',
    points: '34,224 70,268 114,292 100,342 46,354 14,306',
    labelX: 64,
    labelY: 293,
  },
  {
    id: 'chungnam-buyeo',
    name: '부여군',
    icon: '🏺',
    subtitle: '부소산성·궁남지·백제문화·사찰 탐험',
    points: '126,252 184,268 236,238 250,292 202,322 146,308 114,292',
    labelX: 184,
    labelY: 282,
  },
  {
    id: 'chungnam-nonsan',
    name: '논산시',
    icon: '🌉',
    subtitle: '탑정호·관촉사·선샤인랜드·딸기 탐험',
    points: '236,238 286,246 292,278 330,282 312,334 250,292',
    labelX: 275,
    labelY: 286,
  },
  {
    id: 'chungnam-seocheon',
    name: '서천군',
    icon: '🌾',
    subtitle: '국립생태원·신성리갈대밭·해안·한산모시 탐험',
    points: '14,306 46,354 106,372 146,342 146,308 114,292 70,268',
    labelX: 84,
    labelY: 333,
  },
  {
    id: 'chungnam-geumsan',
    name: '금산군',
    icon: '🌿',
    subtitle: '인삼·금강·산림문화·폭포 탐험',
    points: '250,292 312,334 300,376 232,372 202,322',
    labelX: 261,
    labelY: 337,
  },
];



type JeonbukDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 전북특별자치도 14개 시·군의 단순화 지도입니다.
 * 기존 장소·GPS·테마 데이터는 지역 상세 화면에서 그대로 사용합니다.
 */
const JEONBUK_DISTRICT_SHAPES: JeonbukDistrictShape[] = [
  {
    id: 'jeonbuk-gunsan',
    name: '군산시',
    icon: '🌊',
    subtitle: '근대문화·고군산군도·항구·철길 탐험',
    points: '22,42 86,24 126,58 114,116 52,126 16,88',
    labelX: 69,
    labelY: 75,
  },
  {
    id: 'jeonbuk-iksan',
    name: '익산시',
    icon: '👑',
    subtitle: '미륵사지·왕궁리·보석·근대문화 탐험',
    points: '126,58 194,34 232,70 218,126 154,138 114,116',
    labelX: 173,
    labelY: 83,
  },
  {
    id: 'jeonbuk-wanju',
    name: '완주군',
    icon: '🌲',
    subtitle: '대둔산·삼례문화·편백숲·마을 탐험',
    points: '232,70 300,50 348,92 330,146 270,156 218,126',
    labelX: 283,
    labelY: 103,
  },
  {
    id: 'jeonbuk-buan',
    name: '부안군',
    icon: '🏖️',
    subtitle: '변산반도·채석강·내소사·해안 탐험',
    points: '16,88 52,126 78,184 54,238 16,224 6,160',
    labelX: 40,
    labelY: 168,
  },
  {
    id: 'jeonbuk-gimje',
    name: '김제시',
    icon: '🌾',
    subtitle: '지평선·금산사·벽골제·평야 탐험',
    points: '52,126 114,116 154,138 148,196 90,210 78,184',
    labelX: 110,
    labelY: 161,
  },
  {
    id: 'jeonbuk-jeonju',
    name: '전주시',
    icon: '🏘️',
    subtitle: '한옥마을·경기전·전동성당·미식 탐험',
    points: '154,138 218,126 232,170 214,212 168,206 148,196',
    labelX: 190,
    labelY: 171,
  },
  {
    id: 'jeonbuk-jinan',
    name: '진안군',
    icon: '⛰️',
    subtitle: '마이산·용담호·홍삼·고원 탐험',
    points: '218,126 270,156 286,210 242,234 214,212 232,170',
    labelX: 251,
    labelY: 183,
  },
  {
    id: 'jeonbuk-muju',
    name: '무주군',
    icon: '🏔️',
    subtitle: '덕유산·태권도원·구천동·반디 탐험',
    points: '270,156 330,146 358,198 338,250 286,210',
    labelX: 319,
    labelY: 191,
  },
  {
    id: 'jeonbuk-gochang',
    name: '고창군',
    icon: '🪨',
    subtitle: '고인돌·선운사·읍성·갯벌 탐험',
    points: '16,224 54,238 92,278 74,344 20,356 4,292',
    labelX: 47,
    labelY: 287,
  },
  {
    id: 'jeonbuk-jeongeup',
    name: '정읍시',
    icon: '🍁',
    subtitle: '내장산·동학·구절초·전통문화 탐험',
    points: '54,238 90,210 148,196 164,252 128,294 92,278',
    labelX: 111,
    labelY: 246,
  },
  {
    id: 'jeonbuk-imsil',
    name: '임실군',
    icon: '🧀',
    subtitle: '치즈·옥정호·성수산·농촌문화 탐험',
    points: '148,196 168,206 214,212 228,266 184,290 164,252',
    labelX: 191,
    labelY: 242,
  },
  {
    id: 'jeonbuk-jangsu',
    name: '장수군',
    icon: '🐎',
    subtitle: '승마·논개·고원·산림 탐험',
    points: '214,212 242,234 286,210 314,266 278,310 228,266',
    labelX: 264,
    labelY: 259,
  },
  {
    id: 'jeonbuk-sunchang',
    name: '순창군',
    icon: '🌶️',
    subtitle: '고추장·강천산·섬진강·전통마을 탐험',
    points: '128,294 164,252 184,290 194,350 142,374 92,342',
    labelX: 145,
    labelY: 323,
  },
  {
    id: 'jeonbuk-namwon',
    name: '남원시',
    icon: '🌸',
    subtitle: '광한루원·춘향·지리산·국악 탐험',
    points: '184,290 228,266 278,310 270,370 194,350',
    labelX: 228,
    labelY: 326,
  },
];


type JeonnamDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 전라남도 22개 시·군의 단순화 지도입니다.
 * 다도해 섬 지역은 터치가 편하도록 하나의 단순화 영역으로 표시하고,
 * 기존 장소·GPS·테마 데이터는 지역 상세 화면에서 그대로 사용합니다.
 */
const JEONNAM_DISTRICT_SHAPES: JeonnamDistrictShape[] = [
  {
    id: 'jeonnam-jangseong',
    name: '장성군',
    icon: '🌲',
    subtitle: '백양사·축령산·호수·편백숲 탐험',
    points: '65,55 90,20 150,16 170,60 145,100 85,90',
    labelX: 116,
    labelY: 57,
  },
  {
    id: 'jeonnam-damyang',
    name: '담양군',
    icon: '🎋',
    subtitle: '죽녹원·메타세쿼이아·소쇄원·가사문화 탐험',
    points: '150,16 220,24 235,72 200,110 145,100 170,60',
    labelX: 192,
    labelY: 64,
  },
  {
    id: 'jeonnam-gokseong',
    name: '곡성군',
    icon: '🚂',
    subtitle: '섬진강·기차마을·장미·산책 탐험',
    points: '220,24 285,34 300,80 270,125 200,110 235,72',
    labelX: 255,
    labelY: 76,
  },
  {
    id: 'jeonnam-gurye',
    name: '구례군',
    icon: '⛰️',
    subtitle: '지리산·화엄사·산수유·섬진강 탐험',
    points: '285,34 350,50 365,105 335,150 270,125 300,80',
    labelX: 326,
    labelY: 91,
  },
  {
    id: 'jeonnam-yeonggwang',
    name: '영광군',
    icon: '🌅',
    subtitle: '백수해안·불갑사·법성포·노을 탐험',
    points: '5,120 15,75 65,55 85,90 78,150 30,165',
    labelX: 45,
    labelY: 112,
  },
  {
    id: 'jeonnam-hampyeong',
    name: '함평군',
    icon: '🦋',
    subtitle: '나비·생태공원·국화·농촌문화 탐험',
    points: '85,90 145,100 150,160 110,190 78,150',
    labelX: 113,
    labelY: 137,
  },
  {
    id: 'jeonnam-naju',
    name: '나주시',
    icon: '🏛️',
    subtitle: '읍성·영산강·곰탕·혁신도시 탐험',
    points: '145,100 200,110 215,170 180,215 150,160',
    labelX: 179,
    labelY: 151,
  },
  {
    id: 'jeonnam-hwasun',
    name: '화순군',
    icon: '🪨',
    subtitle: '고인돌·운주사·적벽·온천 탐험',
    points: '200,110 270,125 285,185 240,220 215,170',
    labelX: 244,
    labelY: 164,
  },
  {
    id: 'jeonnam-suncheon',
    name: '순천시',
    icon: '🌿',
    subtitle: '순천만·국가정원·낙안읍성·생태 탐험',
    points: '270,125 335,150 345,215 300,245 285,185',
    labelX: 310,
    labelY: 184,
  },
  {
    id: 'jeonnam-gwangyang',
    name: '광양시',
    icon: '🌉',
    subtitle: '매화·섬진강·구봉산·산업문화 탐험',
    points: '335,150 365,105 368,195 345,245 345,215',
    labelX: 354,
    labelY: 183,
  },
  {
    id: 'jeonnam-muan',
    name: '무안군',
    icon: '🌷',
    subtitle: '황토갯벌·회산백련지·낙지·해안 탐험',
    points: '30,165 78,150 110,190 100,245 45,250 15,215',
    labelX: 65,
    labelY: 203,
  },
  {
    id: 'jeonnam-mokpo',
    name: '목포시',
    icon: '⚓',
    subtitle: '유달산·근대역사·해상케이블카·항구 탐험',
    points: '15,215 45,250 58,282 30,300 4,270',
    labelX: 31,
    labelY: 258,
  },
  {
    id: 'jeonnam-yeongam',
    name: '영암군',
    icon: '🌕',
    subtitle: '월출산·도갑사·왕인문화·평야 탐험',
    points: '110,190 150,160 180,215 175,275 115,285 100,245',
    labelX: 141,
    labelY: 232,
  },
  {
    id: 'jeonnam-jangheung',
    name: '장흥군',
    icon: '🌳',
    subtitle: '편백숲·탐진강·정남진·문학 탐험',
    points: '180,215 240,220 250,285 205,320 175,275',
    labelX: 211,
    labelY: 261,
  },
  {
    id: 'jeonnam-boseong',
    name: '보성군',
    icon: '🍵',
    subtitle: '녹차밭·벌교·득량만·태백산맥 탐험',
    points: '240,220 300,245 305,305 250,330 250,285',
    labelX: 274,
    labelY: 271,
  },
  {
    id: 'jeonnam-yeosu',
    name: '여수시',
    icon: '🌊',
    subtitle: '밤바다·오동도·향일암·섬 여행 탐험',
    points: '300,245 345,215 365,245 360,335 320,360 305,305',
    labelX: 337,
    labelY: 286,
  },
  {
    id: 'jeonnam-haenam',
    name: '해남군',
    icon: '🌅',
    subtitle: '땅끝·대흥사·달마고도·공룡 탐험',
    points: '45,250 100,245 115,285 130,350 85,385 35,345 30,300 58,282',
    labelX: 79,
    labelY: 313,
  },
  {
    id: 'jeonnam-gangjin',
    name: '강진군',
    icon: '🏺',
    subtitle: '청자·다산초당·가우도·문화유산 탐험',
    points: '115,285 175,275 205,320 185,370 130,350',
    labelX: 158,
    labelY: 325,
  },
  {
    id: 'jeonnam-goheung',
    name: '고흥군',
    icon: '🚀',
    subtitle: '나로우주센터·팔영산·섬·해안 탐험',
    points: '250,330 305,305 320,360 300,430 255,405 230,360',
    labelX: 278,
    labelY: 365,
  },
  {
    id: 'jeonnam-sinan',
    name: '신안군',
    icon: '🏝️',
    subtitle: '천사대교·퍼플섬·염전·다도해 탐험',
    points: '0,250 24,240 45,270 38,310 55,340 25,365 2,335 10,295',
    labelX: 25,
    labelY: 307,
  },
  {
    id: 'jeonnam-jindo',
    name: '진도군',
    icon: '🎶',
    subtitle: '진도대교·운림산방·국악·섬 탐험',
    points: '30,300 35,345 85,385 70,430 20,420 0,365 25,365',
    labelX: 47,
    labelY: 382,
  },
  {
    id: 'jeonnam-wando',
    name: '완도군',
    icon: '🌴',
    subtitle: '청산도·보길도·해양치유·다도해 탐험',
    points: '85,385 130,350 185,370 190,430 135,458 70,430',
    labelX: 132,
    labelY: 412,
  },
];


type GyeongbukDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 경상북도 22개 시·군의 단순화 지도입니다.
 * 울릉군은 동해의 별도 섬 영역으로 표시하고,
 * 기존 장소·GPS·테마 데이터는 지역 상세 화면에서 그대로 사용합니다.
 */
const GYEONGBUK_DISTRICT_SHAPES: GyeongbukDistrictShape[] = [
  {
    id: 'gyeongbuk-yeongju',
    name: '영주시',
    icon: '🏯',
    subtitle: '부석사·소수서원·선비문화·소백산 탐험',
    points: '45,55 70,30 125,20 145,70 115,110 65,95',
    labelX: 91,
    labelY: 68,
  },
  {
    id: 'gyeongbuk-bonghwa',
    name: '봉화군',
    icon: '🌲',
    subtitle: '백두대간·청량산·산타마을·숲 탐험',
    points: '125,20 205,20 225,75 190,115 145,70',
    labelX: 177,
    labelY: 66,
  },
  {
    id: 'gyeongbuk-uljin',
    name: '울진군',
    icon: '🌊',
    subtitle: '금강송·성류굴·온천·동해안 탐험',
    points: '205,20 270,35 300,90 285,160 235,145 225,75',
    labelX: 260,
    labelY: 91,
  },
  {
    id: 'gyeongbuk-mungyeong',
    name: '문경시',
    icon: '⛰️',
    subtitle: '문경새재·철로자전거·도자기·산악 탐험',
    points: '25,150 30,95 65,95 115,110 120,165 65,180',
    labelX: 70,
    labelY: 136,
  },
  {
    id: 'gyeongbuk-yecheon',
    name: '예천군',
    icon: '🌀',
    subtitle: '회룡포·삼강주막·천문·곤충생태 탐험',
    points: '115,110 190,115 195,170 150,195 120,165',
    labelX: 157,
    labelY: 151,
  },
  {
    id: 'gyeongbuk-andong',
    name: '안동시',
    icon: '🎭',
    subtitle: '하회마을·서원·탈춤·유교문화 탐험',
    points: '190,115 235,145 245,210 195,225 195,170',
    labelX: 217,
    labelY: 174,
  },
  {
    id: 'gyeongbuk-yeongyang',
    name: '영양군',
    icon: '🌌',
    subtitle: '국제밤하늘·두들마을·산나물·문학 탐험',
    points: '235,145 285,160 300,215 270,250 245,210',
    labelX: 270,
    labelY: 197,
  },
  {
    id: 'gyeongbuk-yeongdeok',
    name: '영덕군',
    icon: '🦀',
    subtitle: '블루로드·대게·해맞이·해안 탐험',
    points: '285,160 315,170 330,240 295,280 270,250 300,215',
    labelX: 306,
    labelY: 222,
  },
  {
    id: 'gyeongbuk-sangju',
    name: '상주시',
    icon: '🚲',
    subtitle: '경천대·자전거·곶감·낙동강 탐험',
    points: '25,150 65,180 150,195 145,255 85,270 25,235',
    labelX: 83,
    labelY: 218,
  },
  {
    id: 'gyeongbuk-uiseong',
    name: '의성군',
    icon: '🧄',
    subtitle: '조문국·산운마을·마늘·빙계계곡 탐험',
    points: '150,195 195,170 195,225 245,210 260,260 215,285 145,255',
    labelX: 205,
    labelY: 239,
  },
  {
    id: 'gyeongbuk-cheongsong',
    name: '청송군',
    icon: '🍎',
    subtitle: '주왕산·주산지·사과·백자 탐험',
    points: '245,210 270,250 295,280 275,325 235,305 260,260',
    labelX: 267,
    labelY: 274,
  },
  {
    id: 'gyeongbuk-gimcheon',
    name: '김천시',
    icon: '🏞️',
    subtitle: '직지사·부항댐·황악산·포도 탐험',
    points: '10,300 25,235 85,270 95,325 40,345',
    labelX: 50,
    labelY: 295,
  },
  {
    id: 'gyeongbuk-gumi',
    name: '구미시',
    icon: '🌉',
    subtitle: '금오산·낙동강·산업문화·도시공원 탐험',
    points: '85,270 145,255 160,310 125,345 95,325',
    labelX: 126,
    labelY: 301,
  },
  {
    id: 'gyeongbuk-chilgok',
    name: '칠곡군',
    icon: '🕊️',
    subtitle: '호국평화·가산산성·왜관·숲 탐험',
    points: '145,255 215,285 210,335 160,350 160,310',
    labelX: 183,
    labelY: 307,
  },
  {
    id: 'gyeongbuk-gyeongsan',
    name: '경산시',
    icon: '🎓',
    subtitle: '갓바위·반곡지·삼성현·대학문화 탐험',
    points: '195,365 210,335 235,305 275,325 280,370 235,390',
    labelX: 239,
    labelY: 352,
  },
  {
    id: 'gyeongbuk-yeongcheon',
    name: '영천시',
    icon: '⭐',
    subtitle: '보현산·별빛·와인·호국문화 탐험',
    points: '235,305 275,325 295,280 315,330 310,390 280,370',
    labelX: 284,
    labelY: 339,
  },
  {
    id: 'gyeongbuk-pohang',
    name: '포항시',
    icon: '🌅',
    subtitle: '호미곶·영일대·스페이스워크·해양 탐험',
    points: '295,280 330,240 345,310 340,380 310,390 315,330',
    labelX: 326,
    labelY: 321,
  },
  {
    id: 'gyeongbuk-seongju',
    name: '성주군',
    icon: '🍈',
    subtitle: '성밖숲·세종대왕자태실·참외·가야산 탐험',
    points: '25,385 40,345 95,325 125,345 115,400 60,410',
    labelX: 76,
    labelY: 369,
  },
  {
    id: 'gyeongbuk-goryeong',
    name: '고령군',
    icon: '👑',
    subtitle: '대가야·고분군·우륵·낙동강 탐험',
    points: '60,410 115,400 160,350 170,410 125,450 70,455',
    labelX: 118,
    labelY: 414,
  },
  {
    id: 'gyeongbuk-cheongdo',
    name: '청도군',
    icon: '🌸',
    subtitle: '프로방스·운문사·레일바이크·감 탐험',
    points: '125,450 170,410 195,365 235,390 245,445 200,465',
    labelX: 194,
    labelY: 425,
  },
  {
    id: 'gyeongbuk-gyeongju',
    name: '경주시',
    icon: '🏺',
    subtitle: '불국사·대릉원·남산·신라문화 탐험',
    points: '230,475 235,390 280,370 310,390 325,455 285,490',
    labelX: 278,
    labelY: 432,
  },
  {
    id: 'gyeongbuk-ulleung',
    name: '울릉군',
    icon: '🏝️',
    subtitle: '울릉도·독도·성인봉·해안 탐험',
    points: '326,55 349,45 365,65 362,95 340,110 322,88',
    labelX: 344,
    labelY: 78,
  },
];


type GyeongnamDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 경상남도 18개 시·군의 단순화 지도입니다.
 * 거제·통영·남해 등 섬·해안 지역은 터치가 편하도록
 * 하나의 대표 영역으로 단순화해 표시합니다.
 */
const GYEONGNAM_DISTRICT_SHAPES: GyeongnamDistrictShape[] = [
  {
    id: 'gyeongnam-geochang',
    name: '거창군',
    icon: '⛰️',
    subtitle: '수승대·창포원·덕유산·산촌 탐험',
    points: '25,45 75,25 120,45 115,100 60,110 20,80',
    labelX: 70,
    labelY: 67,
  },
  {
    id: 'gyeongnam-hamyang',
    name: '함양군',
    icon: '🌲',
    subtitle: '상림·지리산·개평마을·산삼 탐험',
    points: '20,80 60,110 105,135 85,190 35,180 10,135',
    labelX: 57,
    labelY: 142,
  },
  {
    id: 'gyeongnam-hapcheon',
    name: '합천군',
    icon: '🏞️',
    subtitle: '해인사·영상테마파크·황매산·호수 탐험',
    points: '120,45 185,35 210,80 190,135 125,135 115,100',
    labelX: 161,
    labelY: 88,
  },
  {
    id: 'gyeongnam-changnyeong',
    name: '창녕군',
    icon: '🪷',
    subtitle: '우포늪·화왕산·부곡온천·생태 탐험',
    points: '185,35 245,45 260,105 225,145 190,135 210,80',
    labelX: 223,
    labelY: 88,
  },
  {
    id: 'gyeongnam-miryang',
    name: '밀양시',
    icon: '🏯',
    subtitle: '영남루·위양지·얼음골·아리랑 탐험',
    points: '245,45 310,55 325,115 285,150 260,105',
    labelX: 288,
    labelY: 96,
  },
  {
    id: 'gyeongnam-yangsan',
    name: '양산시',
    icon: '🛕',
    subtitle: '통도사·황산공원·천성산·배내골 탐험',
    points: '310,55 350,75 365,135 335,175 285,150 325,115',
    labelX: 329,
    labelY: 119,
  },
  {
    id: 'gyeongnam-sancheong',
    name: '산청군',
    icon: '🌿',
    subtitle: '동의보감촌·지리산·남사예담촌·한방 탐험',
    points: '35,180 85,190 135,170 150,230 105,260 45,240',
    labelX: 91,
    labelY: 213,
  },
  {
    id: 'gyeongnam-uiryeong',
    name: '의령군',
    icon: '🌾',
    subtitle: '솥바위·의병문화·벽계계곡·부자길 탐험',
    points: '105,135 125,135 190,135 190,205 150,230 135,170',
    labelX: 158,
    labelY: 173,
  },
  {
    id: 'gyeongnam-haman',
    name: '함안군',
    icon: '🌸',
    subtitle: '말이산고분군·악양생태공원·연꽃 탐험',
    points: '190,135 225,145 245,205 220,245 190,205',
    labelX: 216,
    labelY: 188,
  },
  {
    id: 'gyeongnam-changwon',
    name: '창원시',
    icon: '🌉',
    subtitle: '진해군항·마산해양·주남저수지·도시 탐험',
    points: '225,145 285,150 300,215 270,260 220,245 245,205',
    labelX: 264,
    labelY: 203,
  },
  {
    id: 'gyeongnam-gimhae',
    name: '김해시',
    icon: '👑',
    subtitle: '가야테마파크·수로왕릉·봉리단길·낙동강 탐험',
    points: '285,150 335,175 350,225 315,260 300,215',
    labelX: 319,
    labelY: 206,
  },
  {
    id: 'gyeongnam-hadong',
    name: '하동군',
    icon: '🍵',
    subtitle: '화개장터·십리벚꽃·차밭·섬진강 탐험',
    points: '45,240 105,260 115,320 70,350 25,310',
    labelX: 70,
    labelY: 291,
  },
  {
    id: 'gyeongnam-jinju',
    name: '진주시',
    icon: '🏯',
    subtitle: '진주성·남강·유등·역사문화 탐험',
    points: '105,260 150,230 220,245 205,305 150,330 115,320',
    labelX: 163,
    labelY: 283,
  },
  {
    id: 'gyeongnam-goseong',
    name: '고성군',
    icon: '🦕',
    subtitle: '공룡박물관·상족암·당항포·해안 탐험',
    points: '150,330 205,305 245,330 230,385 180,395',
    labelX: 199,
    labelY: 351,
  },
  {
    id: 'gyeongnam-sacheon',
    name: '사천시',
    icon: '🚠',
    subtitle: '바다케이블카·삼천포·항공우주·해안 탐험',
    points: '70,350 115,320 150,330 180,395 135,420 85,400',
    labelX: 125,
    labelY: 371,
  },
  {
    id: 'gyeongnam-tongyeong',
    name: '통영시',
    icon: '⛵',
    subtitle: '동피랑·미륵산·케이블카·한려수도 탐험',
    points: '180,395 230,385 255,425 225,465 175,455 135,420',
    labelX: 207,
    labelY: 426,
  },
  {
    id: 'gyeongnam-geoje',
    name: '거제시',
    icon: '🏝️',
    subtitle: '바람의언덕·외도·매미성·해금강 탐험',
    points: '255,425 310,405 340,445 325,495 275,510 225,465',
    labelX: 287,
    labelY: 461,
  },
  {
    id: 'gyeongnam-namhae',
    name: '남해군',
    icon: '🌊',
    subtitle: '독일마을·다랭이마을·금산·보리암 탐험',
    points: '35,405 85,400 135,420 115,475 65,490 25,455',
    labelX: 77,
    labelY: 445,
  },
];


type JejuCityShape = {
  id: 'jeju-si' | 'seogwipo-si';
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 기존 탐험 데이터에서 사용하는 실제 행정시 ID와 지도 형상입니다.
 * 제주시·서귀포시의 장소·GPS·테마 데이터는 기존 지역 상세 화면에서 그대로 사용합니다.
 */
const JEJU_CITY_SHAPES: JejuCityShape[] = [
  {
    id: 'jeju-si',
    name: '제주시',
    icon: '🍊',
    subtitle: '한라산 북쪽·동서 해안 탐험',
    points:
      '34,108 50,78 82,52 126,35 176,27 226,33 270,51 309,79 326,105 290,112 250,109 210,104 168,108 125,104 80,111',
    labelX: 176,
    labelY: 72,
  },
  {
    id: 'seogwipo-si',
    name: '서귀포시',
    icon: '🌴',
    subtitle: '한라산 남쪽·폭포와 올레 탐험',
    points:
      '34,108 80,111 125,104 168,108 210,104 250,109 290,112 326,105 313,137 279,163 231,182 176,191 118,181 72,158 44,134',
    labelX: 180,
    labelY: 151,
  },
];


type SejongDistrictShape = {
  id: 'sejong';
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 세종특별자치시는 자치구·군 없이 하나의 단일 행정지역으로 연결됩니다.
 * 전체 탐험 데이터를 불러오기 전에 세종 지도를 먼저 표시합니다.
 */
const SEJONG_DISTRICT_SHAPES: SejongDistrictShape[] = [
  {
    id: 'sejong',
    name: '세종특별자치시',
    icon: '🏛️',
    subtitle: '행정수도·호수·정원·기록문화·원도심 탐험',
    points:
      '112,18 208,12 272,54 292,118 270,182 300,238 246,306 164,316 92,276 58,210 74,146 54,84',
    labelX: 177,
    labelY: 164,
  },
];


type UlsanDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 울산광역시 5개 구·군의 단순화 지도입니다.
 * 중구·남구·동구·북구·울주군의 기존 장소·GPS·테마 데이터를
 * 기존 지역 상세 화면에 그대로 연결합니다.
 */
const ULSAN_DISTRICT_SHAPES: UlsanDistrictShape[] = [
  {
    id: 'ulsan-ulju',
    name: '울주군',
    icon: '⛰️',
    subtitle: '영남알프스·간절곶·옹기·생태문화 탐험',
    points: '15,45 165,20 205,75 190,145 165,205 185,275 110,320 25,270 45,170',
    labelX: 102,
    labelY: 166,
  },
  {
    id: 'ulsan-buk',
    name: '북구',
    icon: '🌊',
    subtitle: '강동해안·정자항·산업역사·숲길 탐험',
    points: '205,40 330,55 335,135 275,165 190,145 205,75',
    labelX: 262,
    labelY: 102,
  },
  {
    id: 'ulsan-jung',
    name: '중구',
    icon: '🏯',
    subtitle: '태화강·원도심·병영성·문화거리 탐험',
    points: '165,145 190,145 275,165 260,220 180,215 165,205',
    labelX: 218,
    labelY: 183,
  },
  {
    id: 'ulsan-nam',
    name: '남구',
    icon: '🐋',
    subtitle: '장생포·태화강·대공원·산업문화 탐험',
    points: '165,205 180,215 260,220 290,280 215,315 185,275',
    labelX: 225,
    labelY: 261,
  },
  {
    id: 'ulsan-dong',
    name: '동구',
    icon: '🌅',
    subtitle: '대왕암·일산해수욕장·조선해양·해안길 탐험',
    points: '275,165 335,135 350,210 330,290 290,280 260,220',
    labelX: 311,
    labelY: 221,
  },
];


function QuickShapeMap<
  T extends QuickShapeBase
>({
  shapes,
  viewWidth,
  viewHeight,
  displayHeight,
  getLabel,
  getFill,
  getLabelSize,
  getTouchSize,
  onPress,
  backgroundColor,
  textColor,
}: QuickShapeMapProps<T>) {
  return (
    <View
      style={[
        styles.shellMapStage,
        {
          height:
            displayHeight,
        },
      ]}
    >
      <Svg
        width="100%"
        height={
          displayHeight
        }
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        pointerEvents="none"
      >
        {
          shapes.map(
            (shape) => (
              <G
                key={
                  shape.id
                }
              >
                <Polygon
                  points={
                    shape.points
                  }
                  fill={
                    getFill(
                      shape
                    )
                  }
                  stroke={
                    backgroundColor
                  }
                  strokeWidth="1.8"
                />

                <SvgText
                  x={
                    shape.labelX
                  }
                  y={
                    shape.labelY + 3
                  }
                  fontSize={
                    getLabelSize
                      ? getLabelSize(
                          shape
                        )
                      : shape.labelSize ??
                        9
                  }
                  fontWeight="800"
                  fill={
                    textColor
                  }
                  textAnchor="middle"
                >
                  {
                    getLabel(
                      shape
                    )
                  }
                </SvgText>
              </G>
            )
          )
        }

        {
          viewWidth === 360 &&
          viewHeight === 490 ? (
            <>
              <Circle
                cx="331"
                cy="170"
                r="5"
                fill="#F4B16A"
                stroke={
                  backgroundColor
                }
                strokeWidth="1.2"
              />

              <Circle
                cx="346"
                cy="182"
                r="2.8"
                fill="#F4B16A"
                stroke={
                  backgroundColor
                }
                strokeWidth="1"
              />
            </>
          ) : null
        }
      </Svg>

      <View
        pointerEvents="box-none"
        style={
          styles.shellMapTouchLayer
        }
      >
        {
          shapes.map(
            (shape) => {
              const touchSize =
                getTouchSize
                  ? getTouchSize(
                      shape
                    )
                  : shape.touchRadius
                    ? 44
                    : 58;

              return (
                <Pressable
                  key={`quick-map-touch-${shape.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${getLabel(shape)} 탐험 열기`}
                  onPress={() =>
                    onPress(
                      shape
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.shellMapTouchTarget,
                    {
                      left:
                        `${
                          (
                            shape.labelX /
                            viewWidth
                          ) * 100
                        }%`,
                      top:
                        (
                          shape.labelY /
                          viewHeight
                        ) *
                        displayHeight,
                      width:
                        touchSize,
                      height:
                        touchSize,
                      borderRadius:
                        touchSize / 2,
                      transform: [
                        {
                          translateX:
                            -touchSize /
                            2,
                        },
                        {
                          translateY:
                            -touchSize /
                            2,
                        },
                      ],
                      opacity:
                        pressed
                          ? 0.45
                          : 1,
                    },
                  ]}
                />
              );
            }
          )
        }
      </View>
    </View>
  );
}

function getQuickMapTitle(
  mapLevel: QuickMapLevel
) {
  if (
    mapLevel === 'seoul'
  ) {
    return '서울특별시 탐험';
  }

  if (
    mapLevel === 'gyeonggi'
  ) {
    return '경기도 탐험';
  }

  if (
    mapLevel === 'gangwon'
  ) {
    return '강원특별자치도 탐험';
  }

  if (
    mapLevel === 'chungbuk'
  ) {
    return '충청북도 탐험';
  }

  if (
    mapLevel === 'chungnam'
  ) {
    return '충청남도 탐험';
  }

  if (
    mapLevel === 'jeonbuk'
  ) {
    return '전북특별자치도 탐험';
  }

  if (
    mapLevel === 'jeonnam'
  ) {
    return '전라남도 탐험';
  }

  if (
    mapLevel === 'gyeongbuk'
  ) {
    return '경상북도 탐험';
  }

  if (
    mapLevel === 'gyeongnam'
  ) {
    return '경상남도 탐험';
  }

  if (
    mapLevel === 'jeju'
  ) {
    return '제주특별자치도 탐험';
  }

  if (
    mapLevel === 'busan'
  ) {
    return '부산광역시 탐험';
  }

  if (
    mapLevel === 'incheon'
  ) {
    return '인천광역시 탐험';
  }

  if (
    mapLevel === 'daegu'
  ) {
    return '대구광역시 탐험';
  }

  if (
    mapLevel === 'daejeon'
  ) {
    return '대전광역시 탐험';
  }

  if (
    mapLevel === 'gwangju'
  ) {
    return '광주광역시 탐험';
  }

  if (
    mapLevel === 'sejong'
  ) {
    return '세종특별자치시 탐험';
  }

  if (
    mapLevel === 'ulsan'
  ) {
    return '울산광역시 탐험';
  }

  return '대한민국 탐험';
}

function getQuickMapSubtitle(
  mapLevel: QuickMapLevel
) {
  if (
    mapLevel === 'seoul'
  ) {
    return '자치구를 눌러 탐험장소·축제·예약시설을 확인하세요.';
  }

  if (
    mapLevel === 'gyeonggi'
  ) {
    return '시·군을 눌러 경기도 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'gangwon'
  ) {
    return '18개 시·군을 눌러 강원 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'chungbuk'
  ) {
    return '11개 시·군을 눌러 충북 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'chungnam'
  ) {
    return '15개 시·군을 눌러 충남 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'jeonbuk'
  ) {
    return '14개 시·군을 눌러 전북 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'jeonnam'
  ) {
    return '22개 시·군을 눌러 전남 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'gyeongbuk'
  ) {
    return '22개 시·군을 눌러 경북 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'gyeongnam'
  ) {
    return '18개 시·군을 눌러 경남 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'jeju'
  ) {
    return '제주시·서귀포시를 눌러 제주 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'busan'
  ) {
    return '구·군을 눌러 부산 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'incheon'
  ) {
    return '11개 지역을 눌러 인천 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'daegu'
  ) {
    return '9개 구·군을 눌러 대구 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'daejeon'
  ) {
    return '5개 구를 눌러 대전 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'gwangju'
  ) {
    return '5개 구를 눌러 광주 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'sejong'
  ) {
    return '세종특별자치시를 눌러 탐험을 시작하세요.';
  }

  if (
    mapLevel === 'ulsan'
  ) {
    return '5개 구·군을 눌러 울산 탐험을 시작하세요.';
  }

  return '지역을 눌러 ROOT 탐험을 시작하세요.';
}

export default function ExploreShellScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    shellMapLevel,
    setShellMapLevel,
  ] = useState<
    QuickMapLevel
  >('korea');

  const [
    requestedRegion,
    setRequestedRegion,
  ] =
    useState<ExplorationMapLevel>(
      'korea'
    );

  const [
    HeavyExploreScreen,
    setHeavyExploreScreen,
  ] =
    useState<
      HeavyExploreComponent | null
    >(null);

  const [
    heavyLoading,
    setHeavyLoading,
  ] = useState(false);

  const [
    waitingLabel,
    setWaitingLabel,
  ] = useState(
    '전국 탐험 데이터를 준비하고 있어요.'
  );

  const heavyLoadStartedRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const requestedRegionRef =
    useRef<ExplorationMapLevel>(
      'korea'
    );

  const loadHeavyScreen =
    useCallback(() => {
      if (
        heavyLoadStartedRef.current
      ) {
        return;
      }

      heavyLoadStartedRef.current =
        true;

      setHeavyLoading(
        true
      );

      console.log(
        'EXPLORE HEAVY LOAD START',
        {
          requestedRegion:
            requestedRegionRef.current,
        }
      );

      requestAnimationFrame(
        () => {
          try {
            const module =
              require(
                '../../components/explore/ExploreHeavyScreen'
              ) as {
                default:
                  HeavyExploreComponent;
              };

            if (
              !mountedRef.current
            ) {
              return;
            }

            setHeavyExploreScreen(
              () =>
                module.default
            );

            console.log(
              'EXPLORE HEAVY LOAD READY',
              {
                requestedRegion:
                  requestedRegionRef.current,
              }
            );
          } catch (
            error
          ) {
            heavyLoadStartedRef.current =
              false;

            if (
              mountedRef.current
            ) {
              setHeavyLoading(
                false
              );

              setWaitingLabel(
                '탐험 화면을 준비하지 못했어요. 다시 눌러 주세요.'
              );
            }

            console.log(
              'EXPLORE HEAVY LOAD ERROR',
              error
            );
          }
        }
      );
    }, []);

  useEffect(() => {
    mountedRef.current =
      true;

    console.log(
      'EXPLORE SHELL READY'
    );

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  const openRegion =
    useCallback(
      (
        regionId:
          Exclude<
            ExplorationMapLevel,
            'korea'
          >
      ) => {
        console.log(
          'EXPLORE SHELL REGION PRESSED',
          {
            regionId,
          }
        );

        requestedRegionRef.current =
          regionId;

        setRequestedRegion(
          regionId
        );

        if (
          regionId ===
            'seoul' ||
          regionId ===
            'gyeonggi' ||
          regionId ===
            'gangwon' ||
          regionId ===
            'chungbuk' ||
          regionId ===
            'chungnam' ||
          regionId ===
            'jeonbuk' ||
          regionId ===
            'jeonnam' ||
          regionId ===
            'gyeongbuk' ||
          regionId ===
            'gyeongnam' ||
          regionId ===
            'jeju' ||
          regionId ===
            'busan' ||
          regionId ===
            'incheon' ||
          regionId ===
            'daegu' ||
          regionId ===
            'daejeon' ||
          regionId ===
            'gwangju' ||
          regionId ===
            'sejong' ||
          regionId ===
            'ulsan'
        ) {
          setShellMapLevel(
            regionId
          );

          setWaitingLabel(
            regionId ===
              'seoul'
              ? '서울 탐험 데이터를 준비하고 있어요.'
              : regionId ===
                  'gyeonggi'
                ? '경기도 탐험 데이터를 준비하고 있어요.'
                : regionId ===
                    'gangwon'
                  ? '강원 탐험 데이터를 준비하고 있어요.'
                  : regionId ===
                      'chungbuk'
                    ? '충북 탐험 데이터를 준비하고 있어요.'
                    : regionId ===
                        'chungnam'
                      ? '충남 탐험 데이터를 준비하고 있어요.'
                      : regionId ===
                          'jeonbuk'
                        ? '전북 탐험 데이터를 준비하고 있어요.'
                        : regionId ===
                            'jeonnam'
                          ? '전남 탐험 데이터를 준비하고 있어요.'
                          : regionId ===
                              'gyeongbuk'
                            ? '경북 탐험 데이터를 준비하고 있어요.'
                            : regionId ===
                                'gyeongnam'
                              ? '경남 탐험 데이터를 준비하고 있어요.'
                              : regionId ===
                                  'jeju'
                                ? '제주 탐험 데이터를 준비하고 있어요.'
                                : regionId ===
                                    'busan'
                                  ? '부산 탐험 데이터를 준비하고 있어요.'
                    : regionId ===
                        'incheon'
                      ? '인천 탐험 데이터를 준비하고 있어요.'
                      : regionId ===
                          'daegu'
                        ? '대구 탐험 데이터를 준비하고 있어요.'
                        : regionId ===
                            'daejeon'
                          ? '대전 탐험 데이터를 준비하고 있어요.'
                          : regionId ===
                              'gwangju'
                            ? '광주 탐험 데이터를 준비하고 있어요.'
                            : regionId ===
                                'sejong'
                              ? '세종 탐험 데이터를 준비하고 있어요.'
                              : '울산 탐험 데이터를 준비하고 있어요.'
          );

          return;
        }

        setWaitingLabel(
          `${
            KOREA_REGION_SHAPES.find(
              (shape) =>
                shape.id ===
                regionId
            )?.shortLabel ??
            '지역'
          } 지도를 준비하고 있어요.`
        );

        loadHeavyScreen();
      },
      [
        loadHeavyScreen,
      ]
    );

  const openDistrict =
    useCallback(
      (
        districtId:
          string,
        districtName:
          string
      ) => {
        console.log(
          'EXPLORE SHELL DISTRICT PRESSED',
          {
            districtId,
            districtName,
          }
        );

        router.push({
          pathname:
            '/explore/district/[districtId]',
          params: {
            districtId,
          },
        } as any);
      },
      []
    );

  const goBackToKorea =
    useCallback(() => {
      requestedRegionRef.current =
        'korea';

      setShellMapLevel(
        'korea'
      );

      setRequestedRegion(
        'korea'
      );
    }, []);

  if (
    HeavyExploreScreen
  ) {
    return (
      <HeavyExploreScreen
        initialMapLevel={
          requestedRegion
        }
        initialContentMode="places"
      />
    );
  }

  const quickMapTitle =
    getQuickMapTitle(
      shellMapLevel
    );

  const quickMapSubtitle =
    getQuickMapSubtitle(
      shellMapLevel
    );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
          paddingTop:
            insets.top + 8,
        },
      ]}
    >
      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerLeft
          }
        >
          {
            shellMapLevel !==
            'korea' ? (
              <Pressable
                onPress={
                  goBackToKorea
                }
                style={({
                  pressed,
                }) => [
                  styles.backButton,
                  {
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 9,
                    opacity:
                      pressed
                        ? 0.55
                        : 1,
                  },
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={
                    theme.text
                  }
                />
              </Pressable>
            ) : null
          }

          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={[
                styles.title,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {
                quickMapTitle
              }
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {
                quickMapSubtitle
              }
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.readyBadge,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 2
                  : 9,
            },
          ]}
        >
          {
            heavyLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  theme.text
                }
              />
            ) : (
              <Ionicons
                name="map-outline"
                size={15}
                color={
                  theme.text
                }
              />
            )
          }

          <Text
            style={[
              styles.readyBadgeText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {
              heavyLoading
                ? '준비 중'
                : '빠른 지도'
            }
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom +
              28,
          },
        ]}
      >
        <View
          style={[
            styles.mapCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 3
                  : 16,
            },
          ]}
        >
          {
            shellMapLevel ===
            'korea' ? (
              <QuickShapeMap
                shapes={
                  KOREA_REGION_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  490
                }
                displayHeight={
                  470
                }
                getLabel={(
                  shape
                ) =>
                  shape.shortLabel
                }
                getFill={(
                  shape
                ) =>
                  isCityBlack
                    ? '#666666'
                    : shape.fill
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.labelSize ??
                  10
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.touchRadius
                    ? 44
                    : 66
                }
                onPress={(
                  shape
                ) =>
                  openRegion(
                    shape.id
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#3E342B'
                }
              />
            ) :
            shellMapLevel ===
            'seoul' ? (
              <QuickShapeMap
                shapes={
                  SEOUL_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  330
                }
                displayHeight={
                  330
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E8D8B8'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 7.1
                    : 8.5
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 48
                    : 52
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#4D4035'
                }
              />
            ) :
            shellMapLevel ===
            'gyeonggi' ? (
              <QuickShapeMap
                shapes={
                  GYEONGGI_DISTRICT_SHAPES
                }
                viewWidth={
                  370
                }
                viewHeight={
                  430
                }
                displayHeight={
                  430
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E8D8B8'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 6.8
                    : 7.8
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 46
                    : 50
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#4D4035'
                }
              />
            ) :
            shellMapLevel ===
            'gangwon' ? (
              <QuickShapeMap
                shapes={
                  GANGWON_DISTRICT_SHAPES
                }
                viewWidth={
                  370
                }
                viewHeight={
                  390
                }
                displayHeight={
                  390
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#DDE7D2'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 6.4
                    : 7.4
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 44
                    : 48
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#3E4A37'
                }
              />
            ) :
            shellMapLevel ===
            'chungbuk' ? (
              <QuickShapeMap
                shapes={
                  CHUNGBUK_DISTRICT_SHAPES
                }
                viewWidth={
                  370
                }
                viewHeight={
                  390
                }
                displayHeight={
                  390
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E5E0C7'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 6.8
                    : 7.8
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 46
                    : 50
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#494536'
                }
              />
            ) :
            shellMapLevel ===
            'chungnam' ? (
              <QuickShapeMap
                shapes={
                  CHUNGNAM_DISTRICT_SHAPES
                }
                viewWidth={
                  370
                }
                viewHeight={
                  390
                }
                displayHeight={
                  390
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#DDE4C9'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 6.6
                    : 7.6
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 44
                    : 48
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#46503A'
                }
              />
            ) :
            shellMapLevel ===
            'jeonbuk' ? (
              <QuickShapeMap
                shapes={
                  JEONBUK_DISTRICT_SHAPES
                }
                viewWidth={
                  370
                }
                viewHeight={
                  390
                }
                displayHeight={
                  390
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E8DCC9'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 6.6
                    : 7.6
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 44
                    : 48
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#51483D'
                }
              />
            ) :
            shellMapLevel ===
            'jeonnam' ? (
              <QuickShapeMap
                shapes={
                  JEONNAM_DISTRICT_SHAPES
                }
                viewWidth={
                  370
                }
                viewHeight={
                  470
                }
                displayHeight={
                  430
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#D8E8E1'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 6.2
                    : 7.1
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 38
                    : 42
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#365149'
                }
              />
            ) :
            shellMapLevel ===
            'gyeongbuk' ? (
              <QuickShapeMap
                shapes={
                  GYEONGBUK_DISTRICT_SHAPES
                }
                viewWidth={
                  370
                }
                viewHeight={
                  510
                }
                displayHeight={
                  450
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E4E4D2'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 5.9
                    : 6.8
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 36
                    : 40
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#48503A'
                }
              />
            ) :
            shellMapLevel ===
            'gyeongnam' ? (
              <QuickShapeMap
                shapes={
                  GYEONGNAM_DISTRICT_SHAPES
                }
                viewWidth={
                  375
                }
                viewHeight={
                  525
                }
                displayHeight={
                  450
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#DDE8D4'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 5.8
                    : 6.8
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 36
                    : 40
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#48503A'
                }
              />
            ) :
            shellMapLevel ===
            'jeju' ? (
              <QuickShapeMap
                shapes={
                  JEJU_CITY_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  220
                }
                displayHeight={
                  265
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={(
                  shape
                ) =>
                  isCityBlack
                    ? '#666666'
                    : shape.id ===
                        'jeju-si'
                      ? '#F3E4B6'
                      : '#DCEBC8'
                }
                getLabelSize={() =>
                  10
                }
                getTouchSize={() =>
                  76
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#48503A'
                }
              />
            ) :
            shellMapLevel ===
            'busan' ? (
              <QuickShapeMap
                shapes={
                  BUSAN_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  330
                }
                displayHeight={
                  330
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#D5E8F4'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 7.1
                    : 8.2
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 48
                    : 52
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#3D4A52'
                }
              />
            ) :
            shellMapLevel ===
            'incheon' ? (
              <QuickShapeMap
                shapes={
                  INCHEON_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  340
                }
                displayHeight={
                  340
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#CFE4F3'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 7
                    : 8.3
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 50
                    : 54
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#334A5C'
                }
              />
            ) :
            shellMapLevel ===
            'daegu' ? (
              <QuickShapeMap
                shapes={
                  DAEGU_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  350
                }
                displayHeight={
                  350
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E7D9B5'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 7
                    : 8.4
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 50
                    : 54
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#4B4031'
                }
              />
            ) :
            shellMapLevel ===
            'daejeon' ? (
              <QuickShapeMap
                shapes={
                  DAEJEON_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  330
                }
                displayHeight={
                  330
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#D9E6C5'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 7.2
                    : 8.6
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 52
                    : 56
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#3D4A36'
                }
              />
            ) :
            shellMapLevel ===
            'gwangju' ? (
              <QuickShapeMap
                shapes={
                  GWANGJU_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  330
                }
                displayHeight={
                  330
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E3D6EA'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 7.2
                    : 8.6
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 52
                    : 56
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#4A3F50'
                }
              />
            ) :
            shellMapLevel ===
            'sejong' ? (
              <QuickShapeMap
                shapes={
                  SEJONG_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  330
                }
                displayHeight={
                  330
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#E7D7B8'
                }
                getLabelSize={() =>
                  11
                }
                getTouchSize={() =>
                  180
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#4A4032'
                }
              />
            ) : (
              <QuickShapeMap
                shapes={
                  ULSAN_DISTRICT_SHAPES
                }
                viewWidth={
                  360
                }
                viewHeight={
                  330
                }
                displayHeight={
                  330
                }
                getLabel={(
                  shape
                ) =>
                  shape.name
                }
                getFill={() =>
                  isCityBlack
                    ? '#666666'
                    : '#CFE6E2'
                }
                getLabelSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 7.2
                    : 8.6
                }
                getTouchSize={(
                  shape
                ) =>
                  shape.name.length >
                  3
                    ? 52
                    : 56
                }
                onPress={(
                  shape
                ) =>
                  openDistrict(
                    shape.id,
                    shape.name
                  )
                }
                backgroundColor={
                  theme.background
                }
                textColor={
                  isCityBlack
                    ? '#FFFFFF'
                    : '#36514D'
                }
              />
            )
          }
        </View>

        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 3
                  : 13,
            },
          ]}
        >
          <View
            style={[
              styles.noticeIcon,
              {
                backgroundColor:
                  theme.background,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
              },
            ]}
          >
            <Ionicons
              name={
                heavyLoading
                  ? 'hourglass-outline'
                  : 'flash-outline'
              }
              size={17}
              color={
                theme.text
              }
            />
          </View>

          <View
            style={
              styles.noticeText
            }
          >
            <Text
              style={[
                styles.noticeTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {
                heavyLoading
                  ? waitingLabel
                  : shellMapLevel ===
                      'gyeonggi'
                    ? '경기도 지도부터 먼저 표시했어요.'
                    : shellMapLevel ===
                        'chungnam'
                      ? '충남 지도부터 먼저 표시했어요.'
                      : shellMapLevel ===
                          'jeonnam'
                        ? '전남 지도부터 먼저 표시했어요.'
                        : shellMapLevel ===
                            'jeju'
                          ? '제주 지도부터 먼저 표시했어요.'
                          : shellMapLevel ===
                              'busan'
                            ? '부산 지도부터 먼저 표시했어요.'
                      : shellMapLevel ===
                          'incheon'
                        ? '인천 지도부터 먼저 표시했어요.'
                        : shellMapLevel ===
                            'daegu'
                          ? '대구 지도부터 먼저 표시했어요.'
                          : shellMapLevel ===
                              'daejeon'
                            ? '대전 지도부터 먼저 표시했어요.'
                            : shellMapLevel ===
                                'gwangju'
                              ? '광주 지도부터 먼저 표시했어요.'
                              : shellMapLevel ===
                                  'ulsan'
                                ? '울산 지도부터 먼저 표시했어요.'
                                : '지도부터 먼저 표시했어요.'
              }
            </Text>

            <Text
              style={[
                styles.noticeDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              전국 장소·축제·보상 데이터는 지역이나 전체 보기를 누를 때 준비됩니다.
            </Text>
          </View>

          {
            !heavyLoading ? (
              <Pressable
                onPress={
                  loadHeavyScreen
                }
                style={({
                  pressed,
                }) => [
                  styles.loadButton,
                  {
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 8,
                    opacity:
                      pressed
                        ? 0.55
                        : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.loadButtonText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  전체 보기
                </Text>
              </Pressable>
            ) : null
          }
        </View>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    shellMapStage: {
      position:
        'relative',
      width:
        '100%',
    },

    shellMapTouchLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 5,
    },

    shellMapTouchTarget: {
      position:
        'absolute',
      backgroundColor:
        'rgba(255,255,255,0.001)',
      zIndex: 6,
    },

    screen: {
      flex: 1,
    },

    header: {
      minHeight: 68,
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 10,
    },

    headerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    backButton: {
      width: 34,
      height: 34,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 19,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 15,
    },

    readyBadge: {
      minHeight: 32,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    readyBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
    },

    content: {
      paddingHorizontal: 14,
      gap: 11,
    },

    mapCard: {
      overflow: 'hidden',
      borderWidth:
        StyleSheet.hairlineWidth,
      paddingHorizontal: 4,
      paddingVertical: 6,
    },

    noticeCard: {
      borderWidth:
        StyleSheet.hairlineWidth,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    noticeIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    noticeText: {
      flex: 1,
      minWidth: 0,
    },

    noticeTitle: {
      fontSize: 11.5,
      fontWeight: '900',
    },

    noticeDescription: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    loadButton: {
      minWidth: 62,
      height: 30,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    loadButtonText: {
      fontSize: 9.5,
      fontWeight: '900',
    },
  });
