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
  | 'gyeonggi';

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
            'gyeonggi'
        ) {
          setShellMapLevel(
            regionId
          );

          setWaitingLabel(
            regionId ===
              'seoul'
              ? '서울 탐험 데이터를 준비하고 있어요.'
              : '경기도 탐험 데이터를 준비하고 있어요.'
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
            ) : (
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
                getFill={(
                  shape
                ) =>
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
