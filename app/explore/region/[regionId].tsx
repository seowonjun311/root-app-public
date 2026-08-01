import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from 'expo-router';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
    useRootTheme,
} from '../../../store/rootTheme';

const EXPLORATION_RECORDS_KEY =
  'root_exploration_records_v1';

type ExplorationRecord = {
  placeId: string;
  verifiedAt?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  distanceMeters?: number;
};

type PlaceFilter =
  | 'all'
  | 'unvisited'
  | 'completed';

type JongnoPlace = {
  id: string;
  name: string;
  description: string;

  areaType:
    | '단일 지점'
    | '넓은 공간'
    | '거리·경로';

  rewardPoints: number;
  rewardLabel: string;
  completed: boolean;
};

type JongnoTheme = {
  id: string;
  title: string;
  description: string;
  totalCount: number;
};

const JONGNO_PLACES: JongnoPlace[] = [
  {
    id: 'gyeongbokgung',
    name: '경복궁',

    description:
      '조선 왕조의 법궁이자 서울을 대표하는 궁궐이에요.',

    areaType:
      '넓은 공간',

    rewardPoints: 30,
    rewardLabel:
      '경복궁 건물',

    completed: false,
  },

  {
    id: 'changdeokgung',
    name: '창덕궁',

    description:
      '자연과 궁궐 건축이 아름답게 어우러진 왕궁이에요.',

    areaType:
      '넓은 공간',

    rewardPoints: 30,
    rewardLabel:
      '창덕궁 건물',

    completed: false,
  },

  {
    id: 'changgyeonggung',
    name: '창경궁',

    description:
      '궁궐과 정원이 함께 이어지는 조선 시대 궁궐이에요.',

    areaType:
      '넓은 공간',

    rewardPoints: 30,
    rewardLabel:
      '창경궁 건물',

    completed: false,
  },

  {
    id: 'jongmyo',
    name: '종묘',

    description:
      '조선 왕실의 제례 공간으로 이어져 온 역사 명소예요.',

    areaType:
      '넓은 공간',

    rewardPoints: 30,
    rewardLabel:
      '종묘 건물',

    completed: false,
  },

  {
    id: 'cheongwadae',
    name: '청와대',

    description:
      '대한민국 현대사를 상징하는 대표적인 역사 공간이에요.',

    areaType:
      '넓은 공간',

    rewardPoints: 30,
    rewardLabel:
      '청와대 건물',

    completed: false,
  },

  {
    id: 'bukchon',
    name: '북촌한옥마을',

    description:
      '한옥과 골목이 이어지는 서울의 대표 전통 마을이에요.',

    areaType:
      '넓은 공간',

    rewardPoints: 20,
    rewardLabel:
      '한옥 장식',

    completed: false,
  },

  {
    id: 'insadong',
    name: '인사동',

    description:
      '전통문화 상점과 갤러리가 이어지는 대표 거리예요.',

    areaType:
      '거리·경로',

    rewardPoints: 20,
    rewardLabel:
      '전통거리 장식',

    completed: false,
  },

  {
    id: 'ikseondong',
    name: '익선동 한옥거리',

    description:
      '한옥 골목과 현대적인 공간이 만나는 거리예요.',

    areaType:
      '거리·경로',

    rewardPoints: 20,
    rewardLabel:
      '한옥상점 장식',

    completed: false,
  },

  {
    id: 'gwangjang-market',
    name: '광장시장',

    description:
      '오랜 역사와 활기찬 분위기를 가진 전통시장이에요.',

    areaType:
      '넓은 공간',

    rewardPoints: 20,
    rewardLabel:
      '시장 건물',

    completed: false,
  },

  {
    id: 'gwanghwamun-square',
    name: '광화문광장',

    description:
      '서울 도심의 역사와 시민 공간이 만나는 광장이에요.',

    areaType:
      '넓은 공간',

    rewardPoints: 20,
    rewardLabel:
      '광화문 장식',

    completed: false,
  },
];

const JONGNO_THEMES: JongnoTheme[] = [
  {
    id: 'palace',

    title:
      '서울 궁궐 여행',

    description:
      '경복궁·창덕궁·창경궁을 시작으로 서울의 궁궐을 모아보세요.',

        totalCount: 3,
  },

  {
    id: 'history',

    title:
      '종로 역사 탐험',

    description:
      '궁궐, 종묘, 광화문을 따라 서울의 역사를 만나보세요.',

        totalCount: 5,
  },

  {
    id: 'alley',

    title:
      '종로 골목 여행',

    description:
      '인사동·익선동·북촌·광장시장을 이어서 탐험해 보세요.',

        totalCount: 4,
  },
];

export default function RegionExploreScreen() {
  const {
    regionId,
  } =
    useLocalSearchParams<{
      regionId?: string;
    }>();

  const {
    theme,
    isCityBlack,
  } =
    useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    filter,
    setFilter,
  ] =
    useState<PlaceFilter>(
      'all'
    );

    const [
  completedPlaceIds,
  setCompletedPlaceIds,
] =
  useState<string[]>([]);

useFocusEffect(
  useCallback(() => {
    let mounted = true;

    const loadExplorationRecords =
      async () => {
        try {
          const raw =
            await AsyncStorage.getItem(
              EXPLORATION_RECORDS_KEY
            );

          const parsed:
            ExplorationRecord[] =
            raw
              ? JSON.parse(raw)
              : [];

          const ids =
            Array.isArray(parsed)
              ? parsed
                  .map(
                    (record) =>
                      String(
                        record?.placeId ??
                          ''
                      )
                  )
                  .filter(Boolean)
              : [];

          if (mounted) {
            setCompletedPlaceIds(
              Array.from(
                new Set(ids)
              )
            );
          }
        } catch (error) {
          console.log(
            'REGION EXPLORATION RECORD LOAD ERROR',
            error
          );

          if (mounted) {
            setCompletedPlaceIds(
              []
            );
          }
        }
      };

    loadExplorationRecords();

    return () => {
      mounted = false;
    };
  }, [])
);



  const isJongno =
    !regionId ||
    regionId ===
      'jongno';

const placesWithStatus =
  useMemo(
    () =>
      JONGNO_PLACES.map(
        (place) => ({
          ...place,

          completed:
            completedPlaceIds.includes(
              place.id
            ),
        })
      ),
    [completedPlaceIds]
  );


  const completedCount =
  placesWithStatus.filter(
    (place) =>
      place.completed
  ).length;

  const completedBuildingCount =
    completedCount;

const palacePlaceIds = [
  'gyeongbokgung',
  'changdeokgung',
  'changgyeonggung',
];

const historyPlaceIds = [
  'gyeongbokgung',
  'jongmyo',
  'cheongwadae',
  'bukchon',
  'gwanghwamun-square',
];

const alleyPlaceIds = [
  'insadong',
  'ikseondong',
  'bukchon',
  'gwangjang-market',
];

const getThemeProgress = (
  placeIds: string[]
) =>
  placeIds.filter(
    (id) =>
      completedPlaceIds.includes(
        id
      )
  ).length;

const themeProgressMap = {
  palace:
    getThemeProgress(
      palacePlaceIds
    ),

  history:
    getThemeProgress(
      historyPlaceIds
    ),

  alley:
    getThemeProgress(
      alleyPlaceIds
    ),
};


  const completedThemeCount =
  JONGNO_THEMES.filter(
    (themeItem) =>
      themeProgressMap[
        themeItem.id as keyof typeof themeProgressMap
      ] >=
      themeItem.totalCount
  ).length;

  const progressPercent =
    Math.round(
      (
        completedCount /
        JONGNO_PLACES.length
      ) * 100
    );

  const filteredPlaces =
  useMemo(() => {
    if (
      filter ===
      'completed'
    ) {
      return placesWithStatus.filter(
        (place) =>
          place.completed
      );
    }

    if (
      filter ===
      'unvisited'
    ) {
      return placesWithStatus.filter(
        (place) =>
          !place.completed
      );
    }

    return placesWithStatus;
  }, [
    filter,
    placesWithStatus,
  ]);
 const handlePlacePress = (
  place: JongnoPlace
) => {
  router.push({
    pathname:
      '/explore/place/[placeId]',

    params: {
      placeId:
        place.id,
    },
  });
};

  if (!isJongno) {
    return (
      <View
        style={[
          styles.centerScreen,
          {
            backgroundColor:
              theme.background,

            paddingTop:
              insets.top,
          },
        ]}
      >
        <Text
          style={[
            styles.emptyTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          준비 중이에요
        </Text>

        <Text
          style={[
            styles.emptyDescription,
            {
              color:
                theme.subText,
            },
          ]}
        >
          이 지역의 탐험 콘텐츠를
          준비하고 있어요.
        </Text>

        <Pressable
          onPress={() =>
            router.back()
          }
          style={[
            styles.simpleButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                theme.radius.button,
            },
          ]}
        >
          <Text
            style={[
              styles.simpleButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            돌아가기
          </Text>
        </Pressable>
      </View>
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
            insets.top,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            42 +
            insets.bottom,
        }}
      >
        {/* 상단 */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            hitSlop={10}
            onPress={() =>
              router.back()
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={
                theme.text
              }
            />
          </Pressable>

          <View
            style={
              styles.headerTextBox
            }
          >
            <Text
              style={[
                styles.headerTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              종로구
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              서울의 역사와 전통을
              만나는 지역
            </Text>
          </View>

          <View
            style={[
              styles.headerCount,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.line,

                borderRadius:
                  theme.radius.button,
              },
            ]}
          >
            <Text
              style={[
                styles.headerCountText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {completedCount}/10
            </Text>
          </View>
        </View>

        {/* 진행 카드 */}

        <View
          style={[
            styles.progressCard,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.line,

              borderRadius:
                theme.radius.card,
            },
          ]}
        >
          <View
            style={
              styles.progressTopRow
            }
          >
            <View>
              <Text
                style={[
                  styles.progressTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                종로구 탐험
              </Text>

              <Text
                style={[
                  styles.progressSub,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문한 장소{' '}
                {completedCount}/10
              </Text>
            </View>

            <View
              style={[
                styles.progressPercentBox,
                {
                  backgroundColor:
                    theme.card2,

                  borderRadius:
                    theme.radius.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.progressPercentText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {progressPercent}%
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor:
                  theme.card2,
              },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    `${progressPercent}%`,

                  backgroundColor:
                    theme.button,
                },
              ]}
            />
          </View>

          <View
            style={
              styles.summaryRow
            }
          >
            <SummaryItem
              icon="location-outline"
              label="방문"
              value={`${completedCount}/10`}
              theme={theme}
            />

            <SummaryItem
              icon="business-outline"
              label="건물"
              value={`${completedBuildingCount}/10`}
              theme={theme}
            />

            <SummaryItem
              icon="ribbon-outline"
              label="테마"
              value={`${completedThemeCount}/3`}
              theme={theme}
            />
          </View>
        </View>

        {/* 대표 테마 */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            대표 테마
          </Text>

          <Text
            style={[
              styles.sectionCaption,
              {
                color:
                  theme.mutedText,
              },
            ]}
          >
            여러 장소를 모아
            특별 뱃지를 획득해요
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.themeList
          }
        >
          {JONGNO_THEMES.map(
            (item) => (
              <View
                key={
                  item.id
                }
                style={[
                  styles.themeCard,
                  {
                    backgroundColor:
                      theme.card,

                    borderColor:
                      theme.line,

                    borderRadius:
                      theme.radius.box,
                  },
                ]}
              >
                <Ionicons
                  name={
                    item.id ===
                    'palace'
                      ? 'business-outline'
                      : item.id ===
                          'history'
                        ? 'library-outline'
                        : 'map-outline'
                  }
                  size={21}
                  color={
                    theme.button
                  }
                />

                <Text
                  style={[
                    styles.themeTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {item.title}
                </Text>

                <Text
                  numberOfLines={3}
                  style={[
                    styles.themeDescription,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {
                    item.description
                  }
                </Text>

                <View
                  style={
                    styles.themeBottomRow
                  }
                >
                  <Text
                    style={[
                      styles.themeProgress,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {
  themeProgressMap[
    item.id as keyof typeof themeProgressMap
  ]
}
/{
  item.totalCount
}
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={
                      theme.mutedText
                    }
                  />
                </View>
              </View>
            )
          )}
        </ScrollView>

        {/* 탐험 장소 제목 */}

        <View
          style={
            styles.placeSectionHeader
          }
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            탐험 장소
          </Text>

          <Text
            style={[
              styles.sectionCount,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {filteredPlaces.length}곳
          </Text>
        </View>

        {/* 필터 */}

        <View
          style={
            styles.filterRow
          }
        >
          <FilterButton
            label="전체"

            selected={
              filter ===
              'all'
            }

            onPress={() =>
              setFilter(
                'all'
              )
            }

            theme={theme}

            isCityBlack={
              isCityBlack
            }
          />

          <FilterButton
            label="미방문"

            selected={
              filter ===
              'unvisited'
            }

            onPress={() =>
              setFilter(
                'unvisited'
              )
            }

            theme={theme}

            isCityBlack={
              isCityBlack
            }
          />

          <FilterButton
            label="완료"

            selected={
              filter ===
              'completed'
            }

            onPress={() =>
              setFilter(
                'completed'
              )
            }

            theme={theme}

            isCityBlack={
              isCityBlack
            }
          />
        </View>

        {/* 장소 목록 */}

        <View
          style={
            styles.placeList
          }
        >
          {filteredPlaces.map(
            (
              place,
              index
            ) => (
              <Pressable
                key={
                  place.id
                }
                onPress={() =>
                  handlePlacePress(
                    place
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.placeCard,
                  {
                    backgroundColor:
                      theme.card,

                    borderColor:
                      theme.line,

                    borderRadius:
                      theme.radius.box,

                    opacity:
                      pressed
                        ? 0.7
                        : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.placeNumberBox,
                    {
                      backgroundColor:
                        place.completed
                          ? theme.button
                          : theme.card2,

                      borderRadius:
                        theme.radius.button,
                    },
                  ]}
                >
                  {place.completed ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={
                        theme.buttonText
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.placeNumber,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>

                <View
                  style={
                    styles.placeInfo
                  }
                >
                  <View
                    style={
                      styles.placeTitleRow
                    }
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.placeName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {place.name}
                    </Text>

                    <View
                      style={[
                        styles.areaTypeTag,
                        {
                          borderColor:
                            theme.line,

                          borderRadius:
                            theme.radius.button,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.areaTypeText,
                          {
                            color:
                              theme.subText,
                          },
                        ]}
                      >
                        {
                          place.areaType
                        }
                      </Text>
                    </View>
                  </View>

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.placeDescription,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {
                      place.description
                    }
                  </Text>

                  <View
                    style={
                      styles.rewardRow
                    }
                  >
                    <Ionicons
                      name="gift-outline"
                      size={14}
                      color={
                        theme.button
                      }
                    />

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.rewardText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      +{
                        place.rewardPoints
                      }
                      P ·{' '}
                      {
                        place.rewardLabel
                      }
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    theme.mutedText
                  }
                />
              </Pressable>
            )
          )}
        </View>

        {filteredPlaces.length ===
          0 && (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.line,

                borderRadius:
                  theme.radius.box,
              },
            ]}
          >
            <Ionicons
              name="map-outline"
              size={26}
              color={
                theme.button
              }
            />

            <Text
              style={[
                styles.emptyDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              아직 완료한 탐험이
              없어요.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  theme,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View
      style={
        styles.summaryItem
      }
    >
      <Ionicons
        name={icon}
        size={17}
        color={
          theme.button
        }
      />

      <Text
        style={[
          styles.summaryLabel,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function FilterButton({
  label,
  selected,
  onPress,
  theme,
  isCityBlack,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
  isCityBlack: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterButton,
        {
          backgroundColor:
            selected
              ? theme.button
              : 'transparent',

          borderColor:
            selected
              ? theme.button
              : theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 999,
        },
      ]}
    >
      <Text
        style={[
          styles.filterText,
          {
            color:
              selected
                ? theme.buttonText
                : theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    centerScreen: {
      flex: 1,

      paddingHorizontal: 24,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    header: {
      minHeight: 74,

      paddingHorizontal: 14,

      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: 38,
      height: 38,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerTextBox: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      fontSize: 23,
      fontWeight: '900',
    },

    headerSubtitle: {
      marginTop: 3,

      fontSize: 11,
      fontWeight: '700',
      lineHeight: 16,
    },

    headerCount: {
      minWidth: 58,
      height: 34,

      paddingHorizontal: 10,

      borderWidth: 1,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    headerCountText: {
      fontSize: 12,
      fontWeight: '900',
    },

    progressCard: {
      marginHorizontal: 14,

      padding: 15,

      borderWidth: 1,
    },

    progressTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    progressTitle: {
      fontSize: 18,
      fontWeight: '900',
    },

    progressSub: {
      marginTop: 3,

      fontSize: 11,
      fontWeight: '700',
    },

    progressPercentBox: {
      minWidth: 52,
      height: 34,

      paddingHorizontal: 10,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    progressPercentText: {
      fontSize: 12,
      fontWeight: '900',
    },

    progressTrack: {
      height: 7,
      marginTop: 14,

      overflow: 'hidden',
      borderRadius: 99,
    },

    progressFill: {
      height: '100%',
      borderRadius: 99,
    },

    summaryRow: {
      marginTop: 15,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-around',
    },

    summaryItem: {
      minWidth: 72,
      alignItems: 'center',
    },

    summaryLabel: {
      marginTop: 4,

      fontSize: 10,
      fontWeight: '700',
    },

    summaryValue: {
      marginTop: 2,

      fontSize: 12,
      fontWeight: '900',
    },

    sectionHeader: {
      marginTop: 22,

      paddingHorizontal: 18,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    sectionCaption: {
      marginTop: 4,

      fontSize: 10,
      fontWeight: '700',
    },

    themeList: {
      paddingHorizontal: 14,
      paddingTop: 11,
      paddingBottom: 2,

      gap: 10,
    },

    themeCard: {
      width: 190,
      minHeight: 145,

      padding: 13,

      borderWidth: 1,
    },

    themeTitle: {
      marginTop: 9,

      fontSize: 14,
      fontWeight: '900',
    },

    themeDescription: {
      flex: 1,

      marginTop: 6,

      fontSize: 10,
      fontWeight: '600',
      lineHeight: 16,
    },

    themeBottomRow: {
      marginTop: 8,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    themeProgress: {
      fontSize: 11,
      fontWeight: '900',
    },

    placeSectionHeader: {
      marginTop: 24,

      paddingHorizontal: 18,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    sectionCount: {
      fontSize: 11,
      fontWeight: '800',
    },

    filterRow: {
      paddingHorizontal: 14,
      paddingTop: 11,

      flexDirection: 'row',

      gap: 7,
    },

    filterButton: {
      height: 32,

      paddingHorizontal: 14,

      borderWidth: 1,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    filterText: {
      fontSize: 11,
      fontWeight: '900',
    },

    placeList: {
      paddingHorizontal: 14,
      paddingTop: 11,

      gap: 9,
    },

    placeCard: {
      minHeight: 112,

      padding: 12,

      borderWidth: 1,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 10,
    },

    placeNumberBox: {
      width: 38,
      height: 38,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    placeNumber: {
      fontSize: 13,
      fontWeight: '900',
    },

    placeInfo: {
      flex: 1,
      minWidth: 0,
    },

    placeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 7,
    },

    placeName: {
      flexShrink: 1,

      fontSize: 14,
      fontWeight: '900',
    },

    areaTypeTag: {
      paddingHorizontal: 7,
      paddingVertical: 3,

      borderWidth: 0.5,
    },

    areaTypeText: {
      fontSize: 8,
      fontWeight: '800',
    },

    placeDescription: {
      marginTop: 6,

      fontSize: 10,
      fontWeight: '600',
      lineHeight: 15,
    },

    rewardRow: {
      marginTop: 7,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 5,
    },

    rewardText: {
      flex: 1,

      fontSize: 9,
      fontWeight: '800',
    },

    emptyBox: {
      margin: 14,

      padding: 20,

      borderWidth: 1,

      alignItems: 'center',
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: '900',
    },

    emptyDescription: {
      marginTop: 8,

      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,

      textAlign: 'center',
    },

    simpleButton: {
      marginTop: 18,

      height: 38,

      paddingHorizontal: 20,

      borderWidth: 1,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    simpleButtonText: {
      fontSize: 12,
      fontWeight: '800',
    },
  });