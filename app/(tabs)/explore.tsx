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

import {
  KOREA_REGION_SHAPES,
  SEOUL_DISTRICT_SHAPES,
  GYEONGGI_DISTRICT_SHAPES,
  BUSAN_DISTRICT_SHAPES,
  INCHEON_DISTRICT_SHAPES,
  DAEGU_DISTRICT_SHAPES,
  DAEJEON_DISTRICT_SHAPES,
  GWANGJU_DISTRICT_SHAPES,
  GANGWON_DISTRICT_SHAPES,
  CHUNGBUK_DISTRICT_SHAPES,
  CHUNGNAM_DISTRICT_SHAPES,
  JEONBUK_DISTRICT_SHAPES,
  JEONNAM_DISTRICT_SHAPES,
  GYEONGBUK_DISTRICT_SHAPES,
  GYEONGNAM_DISTRICT_SHAPES,
  JEJU_CITY_SHAPES,
  SEJONG_DISTRICT_SHAPES,
  ULSAN_DISTRICT_SHAPES,
  type ExplorationRegionId,
  type QuickShapeBase,
} from '../../components/explore/explorationQuickMapData';

type ExplorationMapLevel =
  | 'korea'
  | ExplorationRegionId;

type QuickMapLevel =
  | 'korea'
  | ExplorationRegionId;

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

  // CAFE SAVE ENTRY V28
  const openCafeSave =
    useCallback(() => {
      router.push(
        '/place/cafe-save' as any,
      );
    }, []);

  const openSavedCafes =
    useCallback(() => {
      router.push(
        '/place/saved-cafes' as any,
      );
    }, []);

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

        {/* CAFE SAVE ENTRY V28 */}
        <View
          style={[
            styles.cafeSaveCard,
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
              styles.cafeSaveIcon,
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
              name="cafe-outline"
              size={18}
              color={theme.text}
            />
          </View>

          <View
            style={styles.cafeSaveText}
          >
            <Text
              style={[
                styles.cafeSaveTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              나만의 카페 저장
            </Text>
            <Text
              style={[
                styles.cafeSaveDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              공부·심야·베이커리 같은 특징을 골라 저장해요.
            </Text>
          </View>

          <View
            style={styles.cafeSaveActions}
          >
            <Pressable
              onPress={openSavedCafes}
              style={({ pressed }) => [
                styles.cafeSaveActionButton,
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
                  styles.cafeSaveActionText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                저장 목록
              </Text>
            </Pressable>

            <Pressable
              onPress={openCafeSave}
              style={({ pressed }) => [
                styles.cafeSaveActionButton,
                {
                  borderColor:
                    theme.strongLine,
                  backgroundColor:
                    theme.button,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 8,
                  opacity:
                    pressed
                      ? 0.72
                      : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.cafeSaveActionText,
                  {
                    color:
                      theme.buttonText,
                  },
                ]}
              >
                카페 저장
              </Text>
            </Pressable>
          </View>
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

    // CAFE SAVE ENTRY V28
    cafeSaveCard: {
      borderWidth:
        StyleSheet.hairlineWidth,
      paddingHorizontal: 11,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    cafeSaveIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cafeSaveText: {
      flex: 1,
      minWidth: 0,
    },

    cafeSaveTitle: {
      fontSize: 11.5,
      fontWeight: '900',
    },

    cafeSaveDescription: {
      marginTop: 3,
      fontSize: 9.2,
      fontWeight: '700',
      lineHeight: 13,
    },

    cafeSaveActions: {
      gap: 5,
    },

    cafeSaveActionButton: {
      minWidth: 64,
      height: 29,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cafeSaveActionText: {
      fontSize: 9,
      fontWeight: '900',
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
