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
    'korea' | 'seoul'
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

      setHeavyLoading(true);

      console.log(
        'EXPLORE HEAVY LOAD START',
        {
          requestedRegion:
            requestedRegionRef.current,
        }
      );

      requestAnimationFrame(() => {
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
            () => module.default
          );

          console.log(
            'EXPLORE HEAVY LOAD READY',
            {
              requestedRegion:
                requestedRegionRef.current,
            }
          );
        } catch (error) {
          heavyLoadStartedRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setHeavyLoading(false);
            setWaitingLabel(
              '탐험 화면을 준비하지 못했어요. 다시 눌러 주세요.'
            );
          }

          console.log(
            'EXPLORE HEAVY LOAD ERROR',
            error
          );
        }
      });
    }, []);

  useEffect(() => {
    mountedRef.current = true;

    console.log(
      'EXPLORE SHELL READY'
    );

    return () => {
      mountedRef.current = false;
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
          regionId === 'seoul'
        ) {
          setShellMapLevel(
            'seoul'
          );

          setWaitingLabel(
            '서울 탐험 데이터를 준비하고 있어요.'
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
      [loadHeavyScreen]
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
        style={styles.header}
      >
        <View
          style={styles.headerLeft}
        >
          {
            shellMapLevel ===
            'seoul' ? (
              <Pressable
                onPress={() => {
                  requestedRegionRef.current =
                    'korea';

                  setShellMapLevel(
                    'korea'
                  );

                  setRequestedRegion(
                    'korea'
                  );
                }}
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
                shellMapLevel ===
                'seoul'
                  ? '서울특별시 탐험'
                  : '대한민국 탐험'
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
                shellMapLevel ===
                'seoul'
                  ? '자치구를 눌러 탐험장소·축제·예약시설을 확인하세요.'
                  : '지역을 눌러 ROOT 탐험을 시작하세요.'
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
              insets.bottom + 28,
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
              <View
                style={[
                  styles.shellMapStage,
                  {
                    height: 470,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height={470}
                  viewBox="0 0 360 490"
                  pointerEvents="none"
                >
                  {
                    KOREA_REGION_SHAPES.map(
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
                              isCityBlack
                                ? '#666666'
                                : shape.fill
                            }
                            stroke={
                              theme.background
                            }
                            strokeWidth="2"
                          />

                          <SvgText
                            x={
                              shape.labelX
                            }
                            y={
                              shape.labelY + 3
                            }
                            fontSize={
                              shape.labelSize ??
                              10
                            }
                            fontWeight="800"
                            fill={
                              isCityBlack
                                ? '#FFFFFF'
                                : '#3E342B'
                            }
                            textAnchor="middle"
                          >
                            {
                              shape.shortLabel
                            }
                          </SvgText>
                        </G>
                      )
                    )
                  }

                  <Circle
                    cx="331"
                    cy="170"
                    r="5"
                    fill={
                      isCityBlack
                        ? '#666666'
                        : '#F4B16A'
                    }
                    stroke={
                      theme.background
                    }
                    strokeWidth="1.2"
                  />

                  <Circle
                    cx="346"
                    cy="182"
                    r="2.8"
                    fill={
                      isCityBlack
                        ? '#666666'
                        : '#F4B16A'
                    }
                    stroke={
                      theme.background
                    }
                    strokeWidth="1"
                  />
                </Svg>

                <View
                  pointerEvents="box-none"
                  style={
                    styles.shellMapTouchLayer
                  }
                >
                  {
                    KOREA_REGION_SHAPES.map(
                      (shape) => {
                        const touchSize =
                          shape.touchRadius
                            ? 44
                            : 66;

                        return (
                          <Pressable
                            key={`region-touch-${shape.id}`}
                            accessibilityRole="button"
                            accessibilityLabel={`${shape.shortLabel} 탐험 열기`}
                            onPress={() =>
                              openRegion(
                                shape.id
                              )
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.shellMapTouchTarget,
                              {
                                left:
                                  `${
                                    (shape.labelX / 360) *
                                    100
                                  }%`,
                                top:
                                  (shape.labelY / 490) *
                                  470,
                                width:
                                  touchSize,
                                height:
                                  touchSize,
                                borderRadius:
                                  touchSize / 2,
                                transform: [
                                  {
                                    translateX:
                                      -touchSize / 2,
                                  },
                                  {
                                    translateY:
                                      -touchSize / 2,
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
            ) : (
              <View
                style={[
                  styles.shellMapStage,
                  {
                    height: 330,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height={330}
                  viewBox="0 0 360 330"
                  pointerEvents="none"
                >
                  {
                    SEOUL_DISTRICT_SHAPES.map(
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
                              isCityBlack
                                ? '#666666'
                                : '#E8D8B8'
                            }
                            stroke={
                              theme.background
                            }
                            strokeWidth="1.5"
                          />

                          <SvgText
                            x={
                              shape.labelX
                            }
                            y={
                              shape.labelY + 3
                            }
                            fontSize={
                              shape.name.length >
                              3
                                ? 7.1
                                : 8.5
                            }
                            fontWeight="700"
                            fill={
                              isCityBlack
                                ? '#FFFFFF'
                                : '#4D4035'
                            }
                            textAnchor="middle"
                          >
                            {
                              shape.name
                            }
                          </SvgText>
                        </G>
                      )
                    )
                  }
                </Svg>

                <View
                  pointerEvents="box-none"
                  style={
                    styles.shellMapTouchLayer
                  }
                >
                  {
                    SEOUL_DISTRICT_SHAPES.map(
                      (shape) => {
                        const touchSize =
                          shape.name.length > 3
                            ? 48
                            : 52;

                        return (
                          <Pressable
                            key={`district-touch-${shape.id}`}
                            accessibilityRole="button"
                            accessibilityLabel={`${shape.name} 탐험 열기`}
                            onPress={() =>
                              openDistrict(
                                shape.id,
                                shape.name
                              )
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.shellMapTouchTarget,
                              {
                                left:
                                  `${
                                    (shape.labelX / 360) *
                                    100
                                  }%`,
                                top:
                                  shape.labelY,
                                width:
                                  touchSize,
                                height:
                                  touchSize,
                                borderRadius:
                                  touchSize / 2,
                                transform: [
                                  {
                                    translateX:
                                      -touchSize / 2,
                                  },
                                  {
                                    translateY:
                                      -touchSize / 2,
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
            style={styles.noticeText}
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
      position: 'relative',
      width: '100%',
    },

    shellMapTouchLayer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 5,
    },

    shellMapTouchTarget: {
      position: 'absolute',
      backgroundColor: 'rgba(255,255,255,0.001)',
      zIndex: 6,
    },

    screen: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    headerLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
    },
    subtitle: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 14,
    },
    backButton: {
      width: 34,
      height: 34,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readyBadge: {
      minHeight: 32,
      paddingHorizontal: 9,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    readyBadgeText: {
      fontSize: 9,
      fontWeight: '800',
    },
    content: {
      paddingHorizontal: 14,
      gap: 11,
    },
    mapCard: {
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingTop: 8,
      overflow: 'hidden',
    },
    noticeCard: {
      borderWidth: 1,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    noticeIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noticeText: {
      flex: 1,
      minWidth: 0,
    },
    noticeTitle: {
      fontSize: 11,
      fontWeight: '900',
    },
    noticeDescription: {
      marginTop: 3,
      fontSize: 9.5,
      lineHeight: 14,
    },
    loadButton: {
      minHeight: 30,
      paddingHorizontal: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadButtonText: {
      fontSize: 9.5,
      fontWeight: '900',
    },
  });
