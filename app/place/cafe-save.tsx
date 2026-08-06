import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CAFE_CORE_THEMES,
  CAFE_KEYWORD_GROUPS,
  CAFE_KEYWORD_MAP,
  MAX_CAFE_KEYWORDS,
  MAX_REPRESENTATIVE_CAFE_KEYWORDS,
  type CafeKeywordId,
  type CafeThemeId,
} from '../../store/cafeKeywordCatalog';
import {
  PLACE_PRIMARY_THEMES,
  PLACE_SEASONS,
} from '../../store/placeThemeCatalog';
import {
  createSavedCafe,
} from '../../store/savedPlaces';
import {
  saveCafeEntry,
} from '../../store/savedCafeLocal';
import {
  searchKakaoCafes,
  type KakaoCafeSearchResult,
} from '../../store/kakaoCafeSearch';
import {
  type PlacePrimaryThemeId,
  type PlaceSeasonId,
  type SavedPlaceStatusId,
} from '../../store/placeTypes';
import {
  useRootTheme,
} from '../../store/rootTheme';

const DEFAULT_CAFE_SEARCH_REGION = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.16,
  longitudeDelta: 0.16,
};

const STATUS_OPTIONS: readonly {
  id: SavedPlaceStatusId;
  label: string;
  description: string;
  icon:
    | 'bookmark-outline'
    | 'heart-outline'
    | 'checkmark-circle-outline';
}[] = [
  {
    id: 'wantToGo',
    label: '가보고 싶어요',
    description:
      '나중에 방문할 장소로 저장해요.',
    icon: 'bookmark-outline',
  },
  {
    id: 'favorite',
    label: '좋아하는 장소',
    description:
      '자주 가거나 추천하는 장소예요.',
    icon: 'heart-outline',
  },
  {
    id: 'visited',
    label: '방문했어요',
    description:
      '이미 방문한 장소로 기록해요.',
    icon:
      'checkmark-circle-outline',
  },
];

function getFirstParam(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ''
    : value ?? '';
}

function createManualPlaceId(
  name: string,
  address: string,
) {
  const source =
    `${name.trim()}|${address.trim()}`
      .toLowerCase();

  let hash = 0;

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    hash =
      (
        hash * 31 +
        source.charCodeAt(index)
      ) >>> 0;
  }

  return `manual-cafe-${hash.toString(36)}`;
}

export default function CafeSaveScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      placeId?: string | string[];
      name?: string | string[];
      address?: string | string[];
      roadAddress?: string | string[];
      latitude?: string | string[];
      longitude?: string | string[];
      externalProvider?: string | string[];
    }>();

  const initialName =
    getFirstParam(params.name);

  const initialAddress =
    getFirstParam(
      params.roadAddress,
    ) ||
    getFirstParam(
      params.address,
    );

  const [
    placeName,
    setPlaceName,
  ] = useState(initialName);

  const [
    address,
    setAddress,
  ] = useState(initialAddress);

  const [
    status,
    setStatus,
  ] =
    useState<SavedPlaceStatusId>(
      'wantToGo',
    );

  const [
    primaryTheme,
    setPrimaryTheme,
  ] =
    useState<PlacePrimaryThemeId>(
      'foodCafe',
    );

  const [
    selectedThemes,
    setSelectedThemes,
  ] = useState<CafeThemeId[]>(
    [],
  );

  const [
    selectedSeasons,
    setSelectedSeasons,
  ] = useState<PlaceSeasonId[]>(
    ['all'],
  );

  const [
    selectedKeywords,
    setSelectedKeywords,
  ] = useState<CafeKeywordId[]>(
    [],
  );

  const [
    representativeKeywords,
    setRepresentativeKeywords,
  ] = useState<CafeKeywordId[]>(
    [],
  );

  const [
    memo,
    setMemo,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    saveCompleteVisible,
    setSaveCompleteVisible,
  ] = useState(false);

  const [
    savedCafeName,
    setSavedCafeName,
  ] = useState('');

  const [
    savedCafeSummary,
    setSavedCafeSummary,
  ] = useState('');

  const [
    selectedPlace,
    setSelectedPlace,
  ] =
    useState<KakaoCafeSearchResult | null>(
      null,
    );

  const [
    searchVisible,
    setSearchVisible,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState(initialName);

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<KakaoCafeSearchResult[]>(
      [],
    );

  const [
    selectedSearchResultId,
    setSelectedSearchResultId,
  ] = useState<string | null>(
    null,
  );

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    searchError,
    setSearchError,
  ] = useState('');

  const searchMapRef =
    useRef<MapView | null>(
      null,
    );

  const selectedKeywordLabels =
    useMemo(
      () =>
        representativeKeywords.map(
          (keywordId) =>
            CAFE_KEYWORD_MAP[
              keywordId
            ].label,
        ),
      [
        representativeKeywords,
      ],
    );

  const toggleTheme = (
    themeId: CafeThemeId,
    recommendedPrimaryTheme:
      PlacePrimaryThemeId,
  ) => {
    setSelectedThemes(
      (current) => {
        if (
          current.includes(
            themeId,
          )
        ) {
          return current.filter(
            (item) =>
              item !== themeId,
          );
        }

        return [
          ...current,
          themeId,
        ];
      },
    );

    if (
      selectedThemes.length === 0
    ) {
      setPrimaryTheme(
        recommendedPrimaryTheme,
      );
    }
  };

  const toggleSeason = (
    seasonId: PlaceSeasonId,
  ) => {
    setSelectedSeasons(
      (current) => {
        if (
          current.includes(
            seasonId,
          )
        ) {
          const next =
            current.filter(
              (item) =>
                item !== seasonId,
            );

          return next.length > 0
            ? next
            : ['all'];
        }

        if (
          seasonId === 'all'
        ) {
          return ['all'];
        }

        return [
          ...current.filter(
            (item) =>
              item !== 'all',
          ),
          seasonId,
        ];
      },
    );
  };

  const toggleKeyword = (
    keywordId: CafeKeywordId,
  ) => {
    setSelectedKeywords(
      (current) => {
        if (
          current.includes(
            keywordId,
          )
        ) {
          setRepresentativeKeywords(
            (representatives) =>
              representatives.filter(
                (item) =>
                  item !== keywordId,
              ),
          );

          return current.filter(
            (item) =>
              item !== keywordId,
          );
        }

        if (
          current.length >=
          MAX_CAFE_KEYWORDS
        ) {
          Alert.alert(
            '키워드 선택',
            `키워드는 최대 ${MAX_CAFE_KEYWORDS}개까지 선택할 수 있어요.`,
          );

          return current;
        }

        return [
          ...current,
          keywordId,
        ];
      },
    );
  };

  const toggleRepresentativeKeyword =
    (
      keywordId: CafeKeywordId,
    ) => {
      if (
        !selectedKeywords.includes(
          keywordId,
        )
      ) {
        return;
      }

      setRepresentativeKeywords(
        (current) => {
          if (
            current.includes(
              keywordId,
            )
          ) {
            return current.filter(
              (item) =>
                item !== keywordId,
            );
          }

          if (
            current.length >=
            MAX_REPRESENTATIVE_CAFE_KEYWORDS
          ) {
            Alert.alert(
              '대표 키워드',
              `대표 키워드는 최대 ${MAX_REPRESENTATIVE_CAFE_KEYWORDS}개까지 선택할 수 있어요.`,
            );

            return current;
          }

          return [
            ...current,
            keywordId,
          ];
        },
      );
    };

  const focusSearchResult = (
    result: KakaoCafeSearchResult,
  ) => {
    setSelectedSearchResultId(
      result.id,
    );

    searchMapRef.current
      ?.animateToRegion(
        {
          latitude:
            result.latitude,
          longitude:
            result.longitude,
          latitudeDelta:
            0.008,
          longitudeDelta:
            0.008,
        },
        280,
      );
  };

  const fitSearchResults = (
    results:
      KakaoCafeSearchResult[],
  ) => {
    if (
      results.length === 0
    ) {
      return;
    }

    setTimeout(
      () => {
        searchMapRef.current
          ?.fitToCoordinates(
            results.map(
              (result) => ({
                latitude:
                  result.latitude,
                longitude:
                  result.longitude,
              }),
            ),
            {
              edgePadding: {
                top: 56,
                right: 46,
                bottom: 56,
                left: 46,
              },
              animated: true,
            },
          );
      },
      120,
    );
  };

  const handleCafeSearch =
    async (
      requestedQuery?: string,
    ) => {
      const query =
        (
          requestedQuery ??
          searchQuery
        ).trim();

      if (!query) {
        Alert.alert(
          '카페 검색',
          '검색할 카페 이름을 입력해 주세요.',
        );

        return;
      }

      setSearchQuery(query);
      setSearching(true);
      setSearchError('');

      try {
        const results =
          await searchKakaoCafes(
            query,
          );

        setSearchResults(
          results,
        );

        const firstResult =
          results[0] ?? null;

        setSelectedSearchResultId(
          firstResult?.id ??
            null,
        );

        if (results.length === 0) {
          setSearchError(
            '검색된 카페가 없어요. 지역명이나 지점명을 함께 입력해 보세요.',
          );

          return;
        }

        fitSearchResults(
          results,
        );
      } catch (error) {
        console.log(
          'CAFE PLACE SEARCH ERROR',
          error,
        );

        setSearchResults([]);
        setSelectedSearchResultId(
          null,
        );
        setSearchError(
          error instanceof Error
            ? error.message
            : '카페를 검색하지 못했어요.',
        );
      } finally {
        setSearching(false);
      }
    };

  const openCafeSearch =
    () => {
      const query =
        placeName.trim();

      if (!query) {
        Alert.alert(
          '카페 검색',
          '카페 이름을 먼저 입력해 주세요.',
        );

        return;
      }

      setSearchVisible(true);
      setSearchQuery(query);

      void handleCafeSearch(
        query,
      );
    };

  const confirmSearchResult =
    () => {
      const result =
        searchResults.find(
          (item) =>
            item.id ===
            selectedSearchResultId,
        );

      if (!result) {
        Alert.alert(
          '카페 선택',
          '지도나 목록에서 카페를 하나 선택해 주세요.',
        );

        return;
      }

      setSelectedPlace(
        result,
      );
      setPlaceName(
        result.name,
      );
      setAddress(
        result.displayAddress,
      );
      setSearchVisible(false);
    };

  const handlePlaceNameChange =
    (
      value: string,
    ) => {
      setPlaceName(value);

      if (
        selectedPlace &&
        value.trim() !==
          selectedPlace.name
      ) {
        setSelectedPlace(
          null,
        );
      }
    };

  const handleAddressChange =
    (
      value: string,
    ) => {
      setAddress(value);

      if (
        selectedPlace &&
        value.trim() !==
          selectedPlace.displayAddress
      ) {
        setSelectedPlace(
          null,
        );
      }
    };

  const handleSave =
    async () => {
      const trimmedName =
        placeName.trim();

      if (!trimmedName) {
        Alert.alert(
          '카페 이름',
          '저장할 카페 이름을 입력해 주세요.',
        );

        return;
      }

      if (
        selectedThemes.length ===
        0
      ) {
        Alert.alert(
          '카페 테마',
          '카페 테마를 한 개 이상 선택해 주세요.',
        );

        return;
      }

      setSaving(true);

      try {
        const providedPlaceId =
          getFirstParam(
            params.placeId,
          );

        const placeId =
          selectedPlace
            ? `kakao-${selectedPlace.id}`
            : providedPlaceId ||
              createManualPlaceId(
                trimmedName,
                address,
              );

        const now =
          new Date().toISOString();

        const cafe =
          createSavedCafe(
            {
              placeId,
              name:
                trimmedName,
              status,
              primaryTheme,
              themes:
                selectedThemes,
              seasons:
                selectedSeasons,
              tags:
                selectedKeywords,
              representativeTags:
                representativeKeywords,
              memo,
              createdBy:
                'local-device',
            },
            now,
          );

        const latitudeValue =
          selectedPlace
            ?.latitude ??
          Number(
            getFirstParam(
              params.latitude,
            ),
          );

        const longitudeValue =
          selectedPlace
            ?.longitude ??
          Number(
            getFirstParam(
              params.longitude,
            ),
          );

        const providerParam =
          getFirstParam(
            params.externalProvider,
          );

        const externalProvider =
          selectedPlace
            ? 'kakao'
            : providerParam ===
                'kakao' ||
              providerParam ===
                'naver' ||
              providerParam ===
                'google' ||
              providerParam ===
                'publicData'
              ? providerParam
              : 'manual';

        await saveCafeEntry({
          cafe,
          address:
            selectedPlace
              ?.address ||
            getFirstParam(
              params.address,
            ) ||
            address.trim() ||
            undefined,
          roadAddress:
            selectedPlace
              ?.roadAddress ||
            getFirstParam(
              params.roadAddress,
            ) ||
            address.trim() ||
            undefined,
          latitude:
            Number.isFinite(
              latitudeValue,
            )
              ? latitudeValue
              : undefined,
          longitude:
            Number.isFinite(
              longitudeValue,
            )
              ? longitudeValue
              : undefined,
          externalProvider,
          externalPlaceId:
            selectedPlace
              ?.id,
          phone:
            selectedPlace
              ?.phone ||
            undefined,
          placeUrl:
            selectedPlace
              ?.placeUrl ||
            undefined,
          savedAt: now,
        });

        setSavedCafeName(
          trimmedName,
        );

        setSavedCafeSummary(
          representativeKeywords.length >
          0
            ? `대표 특징 · ${selectedKeywordLabels.join(' · ')}`
            : '나만의 카페 목록에 저장했어요.',
        );

        setSaveCompleteVisible(
          true,
        );
      } catch (error) {
        console.log(
          'CAFE SAVE ERROR',
          error,
        );

        Alert.alert(
          '저장하지 못했어요',
          error instanceof Error
            ? error.message
            : '잠시 후 다시 시도해 주세요.',
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 8,
            borderBottomColor:
              theme.line,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={() =>
            router.back()
          }
          style={({
            pressed,
          }) => [
            styles.headerButton,
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
            size={19}
            color={
              theme.text
            }
          />
        </Pressable>

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
            카페 저장
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
            목적·계절·특징을 골라 나만의 장소로 저장해요.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="저장한 카페 보기"
          onPress={() =>
            router.push(
              '/place/saved-cafes' as never,
            )
          }
          style={({
            pressed,
          }) => [
            styles.headerButton,
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
            name="bookmark-outline"
            size={18}
            color={
              theme.text
            }
          />
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
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
        <SectionCard
          title="1. 카페 정보"
          description="검색 결과에서 들어오면 이름과 주소가 자동으로 채워져요."
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          <View
            style={
              styles.placeSearchRow
            }
          >
            <TextInput
              value={placeName}
              onChangeText={
                handlePlaceNameChange
              }
              onSubmitEditing={
                openCafeSearch
              }
              returnKeyType="search"
              placeholder="카페 이름"
              placeholderTextColor={
                theme.mutedText
              }
              maxLength={80}
              style={[
                styles.input,
                styles.placeNameInput,
                {
                  color:
                    theme.text,
                  borderColor:
                    theme.line,
                  backgroundColor:
                    theme.background,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                },
              ]}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 검색"
              onPress={
                openCafeSearch
              }
              style={({
                pressed,
              }) => [
                styles.placeSearchButton,
                {
                  backgroundColor:
                    theme.card2,
                  borderColor:
                    theme.strongLine,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                  opacity:
                    pressed
                      ? 0.62
                      : 1,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={15}
                color={
                  theme.text
                }
              />
              <Text
                style={[
                  styles.placeSearchButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                검색
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={address}
            onChangeText={
              handleAddressChange
            }
            placeholder="검색한 카페의 주소가 자동으로 입력돼요."
            placeholderTextColor={
              theme.mutedText
            }
            maxLength={160}
            style={[
              styles.input,
              {
                color:
                  theme.text,
                borderColor:
                  theme.line,
                backgroundColor:
                  theme.background,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
              },
            ]}
          />

          {selectedPlace ? (
            <View
              style={[
                styles.confirmedPlaceBox,
                {
                  backgroundColor:
                    theme.card2,
                  borderColor:
                    theme.strongLine,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 9,
                },
              ]}
            >
              <Ionicons
                name="location"
                size={15}
                color={
                  theme.text
                }
              />

              <View
                style={
                  styles.confirmedPlaceText
                }
              >
                <Text
                  style={[
                    styles.confirmedPlaceTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  카카오맵에서 장소를 확정했어요
                </Text>

                <Text
                  numberOfLines={2}
                  style={[
                    styles.confirmedPlaceAddress,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {selectedPlace.displayAddress}
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={[
                styles.placeSearchHelp,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              같은 이름의 지점이 있다면 검색 후 지도에서 정확한 장소를 골라 주세요.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="2. 어떻게 저장할까요?"
          description="현재 이 장소와 나의 관계를 하나 선택해요."
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          <View
            style={
              styles.verticalOptions
            }
          >
            {STATUS_OPTIONS.map(
              (option) => (
                <ChoiceRow
                  key={
                    option.id
                  }
                  selected={
                    status ===
                    option.id
                  }
                  label={
                    option.label
                  }
                  description={
                    option.description
                  }
                  icon={
                    option.icon
                  }
                  onPress={() =>
                    setStatus(
                      option.id,
                    )
                  }
                  theme={theme}
                  isCityBlack={
                    isCityBlack
                  }
                />
              ),
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="3. 대표 테마"
          description="이 카페를 찾게 되는 가장 중요한 목적을 하나 선택해요."
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          <View
            style={
              styles.chipWrap
            }
          >
            {PLACE_PRIMARY_THEMES.map(
              (option) => (
                <Chip
                  key={
                    option.id
                  }
                  label={
                    option.label
                  }
                  selected={
                    primaryTheme ===
                    option.id
                  }
                  onPress={() =>
                    setPrimaryTheme(
                      option.id,
                    )
                  }
                  theme={theme}
                  isCityBlack={
                    isCityBlack
                  }
                />
              ),
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="4. 어떤 카페인가요?"
          description={`여러 개 선택할 수 있어요 · ${selectedThemes.length}개 선택`}
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          <View
            style={
              styles.chipWrap
            }
          >
            {CAFE_CORE_THEMES.map(
              (option) => (
                <Chip
                  key={
                    option.id
                  }
                  label={
                    option.label
                  }
                  selected={selectedThemes.includes(
                    option.id,
                  )}
                  onPress={() =>
                    toggleTheme(
                      option.id,
                      option.primaryTheme,
                    )
                  }
                  theme={theme}
                  isCityBlack={
                    isCityBlack
                  }
                />
              ),
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="5. 어울리는 계절"
          description="하나의 장소에 여러 계절을 선택할 수 있어요."
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          <View
            style={
              styles.chipWrap
            }
          >
            {PLACE_SEASONS.map(
              (option) => (
                <Chip
                  key={
                    option.id
                  }
                  label={
                    option.label
                  }
                  selected={selectedSeasons.includes(
                    option.id,
                  )}
                  onPress={() =>
                    toggleSeason(
                      option.id,
                    )
                  }
                  theme={theme}
                  isCityBlack={
                    isCityBlack
                  }
                />
              ),
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="6. 세부 특징"
          description={`최대 ${MAX_CAFE_KEYWORDS}개 · ${selectedKeywords.length}/${MAX_CAFE_KEYWORDS}`}
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          {CAFE_KEYWORD_GROUPS.map(
            (group) => (
              <View
                key={
                  group.id
                }
                style={
                  styles.keywordGroup
                }
              >
                <Text
                  style={[
                    styles.keywordGroupTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {group.label}
                </Text>

                <View
                  style={
                    styles.chipWrap
                  }
                >
                  {group.keywords.map(
                    (keyword) => (
                      <Chip
                        key={
                          keyword.id
                        }
                        label={
                          keyword.label
                        }
                        selected={selectedKeywords.includes(
                          keyword.id,
                        )}
                        onPress={() =>
                          toggleKeyword(
                            keyword.id,
                          )
                        }
                        theme={theme}
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>
              </View>
            ),
          )}
        </SectionCard>

        <SectionCard
          title="7. 대표 키워드"
          description={`선택한 특징 중 최대 ${MAX_REPRESENTATIVE_CAFE_KEYWORDS}개 · ${representativeKeywords.length}/${MAX_REPRESENTATIVE_CAFE_KEYWORDS}`}
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          {selectedKeywords.length >
          0 ? (
            <View
              style={
                styles.chipWrap
              }
            >
              {selectedKeywords.map(
                (keywordId) => (
                  <Chip
                    key={
                      keywordId
                    }
                    label={
                      CAFE_KEYWORD_MAP[
                        keywordId
                      ].label
                    }
                    selected={representativeKeywords.includes(
                      keywordId,
                    )}
                    onPress={() =>
                      toggleRepresentativeKeyword(
                        keywordId,
                      )
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                ),
              )}
            </View>
          ) : (
            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              먼저 세부 특징을 선택해 주세요.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="8. 추천 메모"
          description={`${memo.length}/300`}
          theme={theme}
          isCityBlack={
            isCityBlack
          }
        >
          <TextInput
            value={memo}
            onChangeText={
              setMemo
            }
            placeholder="예: 평일 저녁에는 조용하고 2층에 콘센트가 많아요."
            placeholderTextColor={
              theme.mutedText
            }
            multiline
            maxLength={300}
            textAlignVertical="top"
            style={[
              styles.memoInput,
              {
                color:
                  theme.text,
                borderColor:
                  theme.line,
                backgroundColor:
                  theme.background,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
              },
            ]}
          />
        </SectionCard>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="카페 저장하기"
          disabled={saving}
          onPress={
            handleSave
          }
          style={({
            pressed,
          }) => [
            styles.saveButton,
            {
              backgroundColor:
                theme.button,
              borderColor:
                theme.strongLine,
              borderRadius:
                isCityBlack
                  ? 2
                  : theme.radius.button,
              opacity:
                saving
                  ? 0.5
                  : pressed
                    ? 0.72
                    : 1,
            },
          ]}
        >
          <Ionicons
            name={
              saving
                ? 'hourglass-outline'
                : 'bookmark'
            }
            size={18}
            color={
              theme.buttonText
            }
          />
          <Text
            style={[
              styles.saveButtonText,
              {
                color:
                  theme.buttonText,
              },
            ]}
          >
            {saving
              ? '저장 중...'
              : '이 카페 저장하기'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={searchVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() =>
          setSearchVisible(false)
        }
      >
        <View
          style={[
            styles.searchModalScreen,
            {
              backgroundColor:
                theme.background,
              paddingTop:
                insets.top + 8,
              paddingBottom:
                insets.bottom + 8,
            },
          ]}
        >
          <View
            style={[
              styles.searchModalHeader,
              {
                borderBottomColor:
                  theme.line,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 검색 닫기"
              onPress={() =>
                setSearchVisible(false)
              }
              style={({
                pressed,
              }) => [
                styles.searchModalClose,
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
                name="close"
                size={20}
                color={theme.text}
              />
            </Pressable>

            <View
              style={
                styles.searchModalHeaderText
              }
            >
              <Text
                style={[
                  styles.searchModalTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                카페 찾기
              </Text>
              <Text
                style={[
                  styles.searchModalSubtitle,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                지도와 주소를 확인하고 정확한 지점을 선택하세요.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.searchModalContent
            }
          >
            <View
              style={
                styles.searchModalInputRow
              }
            >
              <TextInput
                value={searchQuery}
                onChangeText={
                  setSearchQuery
                }
                onSubmitEditing={() =>
                  void handleCafeSearch()
                }
                returnKeyType="search"
                placeholder="예: 핀커피 성수"
                placeholderTextColor={
                  theme.mutedText
                }
                maxLength={80}
                style={[
                  styles.searchModalInput,
                  {
                    color:
                      theme.text,
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 10,
                  },
                ]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 다시 검색"
                disabled={searching}
                onPress={() =>
                  void handleCafeSearch()
                }
                style={({
                  pressed,
                }) => [
                  styles.searchModalButton,
                  {
                    backgroundColor:
                      theme.button,
                    borderColor:
                      theme.strongLine,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 10,
                    opacity:
                      searching
                        ? 0.5
                        : pressed
                          ? 0.7
                          : 1,
                  },
                ]}
              >
                {searching ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      theme.buttonText
                    }
                  />
                ) : (
                  <Ionicons
                    name="search"
                    size={16}
                    color={
                      theme.buttonText
                    }
                  />
                )}
                <Text
                  style={[
                    styles.searchModalButtonText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  검색
                </Text>
              </Pressable>
            </View>

            {searchError ? (
              <View
                style={[
                  styles.searchErrorBox,
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
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color={
                    theme.subText
                  }
                />
                <Text
                  style={[
                    styles.searchErrorText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {searchError}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.searchMapFrame,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 12,
                },
              ]}
            >
              <MapView
                ref={searchMapRef}
                style={styles.searchMap}
                provider={
                  Platform.OS ===
                  'android'
                    ? PROVIDER_GOOGLE
                    : undefined
                }
                initialRegion={
                  DEFAULT_CAFE_SEARCH_REGION
                }
                toolbarEnabled={false}
                onMapReady={() =>
                  fitSearchResults(
                    searchResults,
                  )
                }
                showsCompass
                showsPointsOfInterest={
                  false
                }
              >
                {searchResults.map(
                  (
                    result,
                    index,
                  ) => (
                    <Marker
                      key={result.id}
                      coordinate={{
                        latitude:
                          result.latitude,
                        longitude:
                          result.longitude,
                      }}
                      title={`${index + 1}. ${result.name}`}
                      description={
                        result.displayAddress
                      }
                      onPress={() =>
                        focusSearchResult(
                          result,
                        )
                      }
                    />
                  ),
                )}
              </MapView>

              {searchResults.length ===
              0 ? (
                <View
                  pointerEvents="none"
                  style={
                    styles.searchMapEmpty
                  }
                >
                  {searching ? (
                    <ActivityIndicator
                      size="large"
                      color={
                        theme.text
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="map-outline"
                        size={30}
                        color={
                          theme.mutedText
                        }
                      />
                      <Text
                        style={[
                          styles.searchMapEmptyText,
                          {
                            color:
                              theme.subText,
                          },
                        ]}
                      >
                        검색 결과가 지도에 표시돼요.
                      </Text>
                    </>
                  )}
                </View>
              ) : null}
            </View>

            <View
              style={
                styles.searchResultHeader
              }
            >
              <Text
                style={[
                  styles.searchResultTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                검색 결과
              </Text>
              <Text
                style={[
                  styles.searchResultCount,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {searchResults.length}곳
              </Text>
            </View>

            <ScrollView
              style={
                styles.searchResultScroll
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.searchResultList
              }
            >
              {searchResults.map(
                (
                  result,
                  index,
                ) => {
                  const selected =
                    result.id ===
                    selectedSearchResultId;

                  return (
                    <Pressable
                      key={result.id}
                      onPress={() =>
                        focusSearchResult(
                          result,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.searchResultCard,
                        {
                          backgroundColor:
                            selected
                              ? theme.card2
                              : theme.card,
                          borderColor:
                            selected
                              ? theme.strongLine
                              : theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 10,
                          opacity:
                            pressed
                              ? 0.62
                              : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.searchResultNumber,
                          {
                            backgroundColor:
                              selected
                                ? theme.button
                                : theme.background,
                            borderColor:
                              theme.line,
                            borderRadius:
                              isCityBlack
                                ? 2
                                : 999,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.searchResultNumberText,
                            {
                              color:
                                selected
                                  ? theme.buttonText
                                  : theme.text,
                            },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.searchResultText
                        }
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.searchResultName,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {result.name}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.searchResultAddress,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {result.displayAddress}
                        </Text>
                        {result.categoryName ? (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.searchResultCategory,
                              {
                                color:
                                  theme.mutedText,
                              },
                            ]}
                          >
                            {result.categoryName}
                          </Text>
                        ) : null}
                      </View>

                      <Ionicons
                        name={
                          selected
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={19}
                        color={
                          selected
                            ? theme.text
                            : theme.mutedText
                        }
                      />
                    </Pressable>
                  );
                },
              )}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="선택한 카페 확정"
              disabled={
                !selectedSearchResultId
              }
              onPress={
                confirmSearchResult
              }
              style={({
                pressed,
              }) => [
                styles.confirmPlaceButton,
                {
                  backgroundColor:
                    theme.button,
                  borderColor:
                    theme.strongLine,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : theme.radius.button,
                  opacity:
                    !selectedSearchResultId
                      ? 0.45
                      : pressed
                        ? 0.72
                        : 1,
                },
              ]}
            >
              <Ionicons
                name="location"
                size={17}
                color={
                  theme.buttonText
                }
              />
              <Text
                style={[
                  styles.confirmPlaceButtonText,
                  {
                    color:
                      theme.buttonText,
                  },
                ]}
              >
                이 카페로 확정
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          saveCompleteVisible
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setSaveCompleteVisible(
            false,
          )
        }
      >
        <View
          style={
            styles.saveCompleteOverlay
          }
        >
          <View
            style={[
              styles.saveCompleteCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 18,
              },
            ]}
          >
            <View
              style={[
                styles.saveCompleteIconBox,
                {
                  backgroundColor:
                    theme.card2,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 14,
                },
              ]}
            >
              <Ionicons
                name="bookmark"
                size={24}
                color={
                  theme.text
                }
              />
            </View>

            <Text
              style={[
                styles.saveCompleteTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              카페 저장 완료
            </Text>

            <Text
              style={[
                styles.saveCompleteMessage,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {`"${savedCafeName}" 저장이 완료됐어요.`}
            </Text>

            <Text
              style={[
                styles.saveCompleteSummary,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {savedCafeSummary}
            </Text>

            <View
              style={
                styles.saveCompleteActions
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="저장한 카페 목록 보기"
                onPress={() => {
                  setSaveCompleteVisible(
                    false,
                  );

                  router.replace(
                    '/place/saved-cafes' as never,
                  );
                }}
                style={({
                  pressed,
                }) => [
                  styles.saveCompletePrimaryButton,
                  {
                    backgroundColor:
                      theme.button,
                    borderColor:
                      theme.strongLine,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : theme.radius.button,
                    opacity:
                      pressed
                        ? 0.72
                        : 1,
                  },
                ]}
              >
                <Ionicons
                  name="list-outline"
                  size={16}
                  color={
                    theme.buttonText
                  }
                />

                <Text
                  style={[
                    styles.saveCompletePrimaryText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  저장 목록 보기
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="탐험으로 돌아가기"
                onPress={() => {
                  setSaveCompleteVisible(
                    false,
                  );

                  router.back();
                }}
                style={({
                  pressed,
                }) => [
                  styles.saveCompleteSecondaryButton,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : theme.radius.button,
                    opacity:
                      pressed
                        ? 0.58
                        : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.saveCompleteSecondaryText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  탐험으로
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

type SectionCardProps = {
  title: string;
  description: string;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
  children:
    React.ReactNode;
};

function SectionCard({
  title,
  description,
  theme,
  isCityBlack,
  children,
}: SectionCardProps) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor:
            theme.card,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 3
              : 15,
        },
      ]}
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
        {title}
      </Text>

      <Text
        style={[
          styles.sectionDescription,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {description}
      </Text>

      <View
        style={
          styles.sectionBody
        }
      >
        {children}
      </View>
    </View>
  );
}

type ChoiceRowProps = {
  selected: boolean;
  label: string;
  description: string;
  icon:
    | 'bookmark-outline'
    | 'heart-outline'
    | 'checkmark-circle-outline';
  onPress: () => void;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function ChoiceRow({
  selected,
  label,
  description,
  icon,
  onPress,
  theme,
  isCityBlack,
}: ChoiceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.choiceRow,
        {
          backgroundColor:
            selected
              ? theme.card2
              : theme.background,
          borderColor:
            selected
              ? theme.strongLine
              : theme.line,
          borderRadius:
            isCityBlack
              ? 2
              : 10,
          opacity:
            pressed
              ? 0.65
              : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={
          selected
            ? theme.text
            : theme.subText
        }
      />

      <View
        style={
          styles.choiceText
        }
      >
        <Text
          style={[
            styles.choiceLabel,
            {
              color:
                theme.text,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.choiceDescription,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? 'checkmark-circle'
            : 'ellipse-outline'
        }
        size={18}
        color={
          selected
            ? theme.text
            : theme.mutedText
        }
      />
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function Chip({
  label,
  selected,
  onPress,
  theme,
  isCityBlack,
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.chip,
        {
          backgroundColor:
            selected
              ? theme.card2
              : theme.background,
          borderColor:
            selected
              ? theme.strongLine
              : theme.line,
          borderRadius:
            isCityBlack
              ? 2
              : 999,
          opacity:
            pressed
              ? 0.6
              : 1,
        },
      ]}
    >
      {selected ? (
        <Ionicons
          name="checkmark"
          size={13}
          color={
            theme.text
          }
        />
      ) : null}

      <Text
        style={[
          styles.chipText,
          {
            color:
              theme.text,
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

    header: {
      minHeight: 76,
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    headerButton: {
      width: 36,
      height: 36,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
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
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 14,
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 11,
    },

    sectionCard: {
      borderWidth:
        StyleSheet.hairlineWidth,
      padding: 13,
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: '900',
    },

    sectionDescription: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
    },

    sectionBody: {
      marginTop: 12,
      gap: 9,
    },

    input: {
      minHeight: 42,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 12,
      fontWeight: '700',
    },

    placeSearchRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 7,
    },

    placeNameInput: {
      flex: 1,
      minWidth: 0,
    },

    placeSearchButton: {
      width: 76,
      minHeight: 42,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    placeSearchButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    placeSearchHelp: {
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    confirmedPlaceBox: {
      minHeight: 48,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },

    confirmedPlaceText: {
      flex: 1,
      minWidth: 0,
    },

    confirmedPlaceTitle: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    confirmedPlaceAddress: {
      marginTop: 2,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    memoInput: {
      minHeight: 104,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },

    verticalOptions: {
      gap: 7,
    },

    choiceRow: {
      minHeight: 58,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    choiceText: {
      flex: 1,
      minWidth: 0,
    },

    choiceLabel: {
      fontSize: 12,
      fontWeight: '900',
    },

    choiceDescription: {
      marginTop: 2,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 13,
    },

    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    chip: {
      minHeight: 32,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    chipText: {
      fontSize: 10,
      fontWeight: '800',
    },

    keywordGroup: {
      gap: 7,
      marginBottom: 7,
    },

    keywordGroupTitle: {
      fontSize: 11,
      fontWeight: '900',
    },

    emptyText: {
      fontSize: 10.5,
      fontWeight: '700',
    },

    searchModalScreen: {
      flex: 1,
    },

    searchModalHeader: {
      minHeight: 66,
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    searchModalClose: {
      width: 36,
      height: 36,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    searchModalHeaderText: {
      flex: 1,
      minWidth: 0,
    },

    searchModalTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    searchModalSubtitle: {
      marginTop: 2,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 13,
    },

    searchModalContent: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 11,
      gap: 9,
    },

    searchModalInputRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 7,
    },

    searchModalInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 42,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 12,
      fontWeight: '700',
    },

    searchModalButton: {
      width: 78,
      minHeight: 42,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    searchModalButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    searchErrorBox: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    searchErrorText: {
      flex: 1,
      minWidth: 0,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    searchMapFrame: {
      height: 250,
      overflow: 'hidden',
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    searchMap: {
      ...StyleSheet.absoluteFillObject,
    },

    searchMapEmpty: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    searchMapEmptyText: {
      fontSize: 10.5,
      fontWeight: '700',
    },

    searchResultHeader: {
      minHeight: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    searchResultTitle: {
      fontSize: 12.5,
      fontWeight: '900',
    },

    searchResultCount: {
      fontSize: 10,
      fontWeight: '800',
    },

    searchResultScroll: {
      flex: 1,
      minHeight: 0,
    },

    searchResultList: {
      gap: 7,
      paddingBottom: 4,
    },

    searchResultCard: {
      minHeight: 72,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    searchResultNumber: {
      width: 28,
      height: 28,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    searchResultNumberText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    searchResultText: {
      flex: 1,
      minWidth: 0,
    },

    searchResultName: {
      fontSize: 11.5,
      fontWeight: '900',
    },

    searchResultAddress: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 13,
    },

    searchResultCategory: {
      marginTop: 3,
      fontSize: 8.5,
      fontWeight: '700',
    },

    confirmPlaceButton: {
      minHeight: 46,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    confirmPlaceButtonText: {
      fontSize: 12.5,
      fontWeight: '900',
    },

    saveCompleteOverlay: {
      flex: 1,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(22, 17, 12, 0.46)',
    },

    saveCompleteCard: {
      width: '100%',
      maxWidth: 360,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 16,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
    },

    saveCompleteIconBox: {
      width: 52,
      height: 52,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    saveCompleteTitle: {
      marginTop: 13,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.35,
      textAlign: 'center',
    },

    saveCompleteMessage: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 18,
      textAlign: 'center',
    },

    saveCompleteSummary: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
      textAlign: 'center',
    },

    saveCompleteActions: {
      width: '100%',
      marginTop: 18,
      flexDirection: 'row',
      gap: 8,
    },

    saveCompletePrimaryButton: {
      flex: 1.25,
      minHeight: 42,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    saveCompleteSecondaryButton: {
      flex: 0.75,
      minHeight: 42,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    saveCompletePrimaryText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    saveCompleteSecondaryText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    saveButton: {
      minHeight: 48,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    saveButtonText: {
      fontSize: 13,
      fontWeight: '900',
    },
  });
