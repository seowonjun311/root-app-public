import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import * as Location from 'expo-location';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  Marker,
  type Region,
} from 'react-native-maps';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CAFE_KEYWORD_MAP,
  CAFE_THEME_MAP,
} from '../../store/cafeKeywordCatalog';
import {
  PLACE_PRIMARY_THEME_MAP,
} from '../../store/placeThemeCatalog';
import {
  loadSavedCafeEntries,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V37_MAP_SCREEN
// SAVED_CAFE_V38_MAP_SEARCH_FILTER
// SAVED_CAFE_V39_CURRENT_LOCATION_DISTANCE

const DEFAULT_REGION: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const STATUS_LABELS = {
  wantToGo: '가보고 싶어요',
  favorite: '좋아하는 장소',
  visited: '방문했어요',
} as const;

const MAP_FILTER_ALL = '__all__' as const;

type SavedCafeMapStatusFilter =
  | typeof MAP_FILTER_ALL
  | keyof typeof STATUS_LABELS;

const STATUS_FILTER_OPTIONS: {
  id: SavedCafeMapStatusFilter;
  label: string;
}[] = [
  {
    id: MAP_FILTER_ALL,
    label: '전체',
  },
  {
    id: 'wantToGo',
    label: '가보고 싶어요',
  },
  {
    id: 'favorite',
    label: '좋아하는 장소',
  },
  {
    id: 'visited',
    label: '방문했어요',
  },
];

const DISTANCE_FILTER_OPTIONS: {
  radiusKm: number | null;
  label: string;
}[] = [
  {
    radiusKm: null,
    label: '전체',
  },
  {
    radiusKm: 1,
    label: '1km',
  },
  {
    radiusKm: 3,
    label: '3km',
  },
  {
    radiusKm: 5,
    label: '5km',
  },
  {
    radiusKm: 10,
    label: '10km',
  },
  {
    radiusKm: 30,
    label: '30km',
  },
];

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type LocationPermissionState =
  | 'unknown'
  | 'granted'
  | 'denied';

type MappableSavedCafeEntry =
  SavedCafeLocalEntry & {
    latitude: number;
    longitude: number;
  };

function isMappableSavedCafeEntry(
  entry: SavedCafeLocalEntry,
): entry is MappableSavedCafeEntry {
  const latitude = entry.latitude;
  const longitude = entry.longitude;

  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function getMarkerColor(
  status: keyof typeof STATUS_LABELS,
) {
  switch (status) {
    case 'favorite':
      return '#D96C63';
    case 'visited':
      return '#5E9A73';
    default:
      return '#D98B45';
  }
}

function normalizeMapSearchText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase('ko-KR');
}

function getDistanceKm(
  first: MapCoordinate,
  second: MapCoordinate,
) {
  const earthRadiusKm = 6371;
  const toRadians = (
    value: number,
  ) => (value * Math.PI) / 180;

  const latitudeDifference =
    toRadians(
      second.latitude -
        first.latitude,
    );

  const longitudeDifference =
    toRadians(
      second.longitude -
        first.longitude,
    );

  const firstLatitude =
    toRadians(first.latitude);

  const secondLatitude =
    toRadians(second.latitude);

  const haversine =
    Math.sin(
      latitudeDifference / 2,
    ) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDifference / 2,
      ) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    )
  );
}

function formatDistance(
  distanceKm: number,
) {
  if (distanceKm < 1) {
    return `${Math.max(
      1,
      Math.round(
        distanceKm * 1000,
      ),
    )}m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(
      1,
    )}km`;
  }

  return `${Math.round(
    distanceKm,
  )}km`;
}

export default function SavedCafesMapScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const fittedCoordinateKeyRef = useRef('');

  const [
    entries,
    setEntries,
  ] = useState<SavedCafeLocalEntry[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState('');

  const [
    selectedPlaceId,
    setSelectedPlaceId,
  ] = useState<string | null>(null);

  const [
    mapReady,
    setMapReady,
  ] = useState(false);

  const [
    mapLaidOut,
    setMapLaidOut,
  ] = useState(false);

  const [
    reloadVersion,
    setReloadVersion,
  ] = useState(0);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<SavedCafeMapStatusFilter>(
      MAP_FILTER_ALL,
    );

  const [
    primaryThemeFilter,
    setPrimaryThemeFilter,
  ] = useState<string>(
    MAP_FILTER_ALL,
  );

  const [
    filtersExpanded,
    setFiltersExpanded,
  ] = useState(false);

  const [
    userCoordinate,
    setUserCoordinate,
  ] =
    useState<MapCoordinate | null>(
      null,
    );

  const [
    locationPermission,
    setLocationPermission,
  ] =
    useState<LocationPermissionState>(
      'unknown',
    );

  const [
    locating,
    setLocating,
  ] = useState(false);

  const [
    distanceRadiusKm,
    setDistanceRadiusKm,
  ] =
    useState<number | null>(
      null,
    );

  const normalizedSearchQuery =
    normalizeMapSearchText(
      searchQuery,
    );

  const allCoordinateEntries =
    useMemo(
      () =>
        entries.filter(
          isMappableSavedCafeEntry,
        ),
      [entries],
    );

  const primaryThemeOptions =
    useMemo(() => {
      const ids = Array.from(
        new Set(
          entries.map(
            (entry) =>
              entry.cafe.primaryTheme,
          ),
        ),
      );

      return ids.sort(
        (first, second) => {
          const firstLabel =
            PLACE_PRIMARY_THEME_MAP[
              first
            ]?.label ?? first;

          const secondLabel =
            PLACE_PRIMARY_THEME_MAP[
              second
            ]?.label ?? second;

          return firstLabel.localeCompare(
            secondLabel,
            'ko-KR',
          );
        },
      );
    }, [entries]);

  const filteredEntries =
    useMemo(() => {
      return entries.filter(
        (entry) => {
          const cafe = entry.cafe;

          if (
            statusFilter !==
              MAP_FILTER_ALL &&
            cafe.status !== statusFilter
          ) {
            return false;
          }

          if (
            primaryThemeFilter !==
              MAP_FILTER_ALL &&
            cafe.primaryTheme !==
              primaryThemeFilter
          ) {
            return false;
          }

          if (
            distanceRadiusKm !== null
          ) {
            if (
              !userCoordinate ||
              !isMappableSavedCafeEntry(
                entry,
              )
            ) {
              return false;
            }

            const distanceKm =
              getDistanceKm(
                userCoordinate,
                {
                  latitude:
                    entry.latitude,
                  longitude:
                    entry.longitude,
                },
              );

            if (
              distanceKm >
              distanceRadiusKm
            ) {
              return false;
            }
          }

          if (!normalizedSearchQuery) {
            return true;
          }

          const searchValues = [
            cafe.name,
            entry.address ?? '',
            entry.roadAddress ?? '',
            cafe.memo,
            STATUS_LABELS[
              cafe.status
            ],
            PLACE_PRIMARY_THEME_MAP[
              cafe.primaryTheme
            ]?.label ?? '',
            ...cafe.themes.map(
              (themeId) =>
                CAFE_THEME_MAP[
                  themeId
                ]?.label ?? '',
            ),
            ...cafe.tags.map(
              (keywordId) =>
                CAFE_KEYWORD_MAP[
                  keywordId
                ]?.label ?? '',
            ),
          ];

          return searchValues.some(
            (value) =>
              normalizeMapSearchText(
                value,
              ).includes(
                normalizedSearchQuery,
              ),
          );
        },
      );
    }, [
      distanceRadiusKm,
      entries,
      normalizedSearchQuery,
      primaryThemeFilter,
      statusFilter,
      userCoordinate,
    ]);

  const coordinateEntries =
    useMemo(() => {
      const nextEntries =
        filteredEntries.filter(
          isMappableSavedCafeEntry,
        );

      if (!userCoordinate) {
        return nextEntries;
      }

      return [
        ...nextEntries,
      ].sort(
        (first, second) =>
          getDistanceKm(
            userCoordinate,
            {
              latitude:
                first.latitude,
              longitude:
                first.longitude,
            },
          ) -
          getDistanceKm(
            userCoordinate,
            {
              latitude:
                second.latitude,
              longitude:
                second.longitude,
            },
          ),
      );
    }, [
      filteredEntries,
      userCoordinate,
    ]);

  const missingCoordinateCount =
    filteredEntries.length -
    coordinateEntries.length;

  const activeFilterCount = [
    statusFilter !== MAP_FILTER_ALL,
    primaryThemeFilter !==
      MAP_FILTER_ALL,
    distanceRadiusKm !== null,
  ].filter(Boolean).length;

  const hasActiveSearchOrFilter =
    normalizedSearchQuery.length > 0 ||
    activeFilterCount > 0;

  const selectedEntry = useMemo(
    () =>
      coordinateEntries.find(
        (entry) =>
          entry.cafe.placeId ===
          selectedPlaceId,
      ) ?? null,
    [
      coordinateEntries,
      selectedPlaceId,
    ],
  );

  const selectedDistanceKm =
    useMemo(() => {
      if (
        !selectedEntry ||
        !userCoordinate
      ) {
        return null;
      }

      return getDistanceKm(
        userCoordinate,
        {
          latitude:
            selectedEntry.latitude,
          longitude:
            selectedEntry.longitude,
        },
      );
    }, [
      selectedEntry,
      userCoordinate,
    ]);

  const coordinateKey = useMemo(
    () =>
      [
        userCoordinate
          ? `user:${userCoordinate.latitude}:${userCoordinate.longitude}`
          : 'user:none',
        `radius:${distanceRadiusKm ?? 'all'}`,
        ...coordinateEntries.map(
          (entry) =>
            `${entry.cafe.placeId}:${entry.latitude}:${entry.longitude}`,
        ),
      ].join('|'),
    [
      coordinateEntries,
      distanceRadiusKm,
      userCoordinate,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setLoadError('');

      loadSavedCafeEntries()
        .then((nextEntries) => {
          if (!active) {
            return;
          }

          setEntries(nextEntries);

          const mappableEntries =
            nextEntries.filter(
              isMappableSavedCafeEntry,
            );

          setSelectedPlaceId(
            (current) => {
              if (
                current &&
                mappableEntries.some(
                  (entry) =>
                    entry.cafe.placeId ===
                    current,
                )
              ) {
                return current;
              }

              return (
                mappableEntries[0]
                  ?.cafe.placeId ??
                null
              );
            },
          );
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE MAP LOAD ERROR',
            error,
          );

          if (active) {
            setLoadError(
              '저장한 카페 지도를 불러오지 못했어요.',
            );
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [reloadVersion]),
  );

  useEffect(() => {
    setSelectedPlaceId(
      (current) => {
        if (
          current &&
          coordinateEntries.some(
            (entry) =>
              entry.cafe.placeId ===
              current,
          )
        ) {
          return current;
        }

        return (
          coordinateEntries[0]
            ?.cafe.placeId ??
          null
        );
      },
    );

    fittedCoordinateKeyRef.current =
      '';
  }, [
    coordinateEntries,
    coordinateKey,
  ]);

  const fitMapToEntries = useCallback(
    (animated: boolean) => {
      const map = mapRef.current;

      if (
        !map ||
        coordinateEntries.length === 0
      ) {
        return;
      }

      if (
        coordinateEntries.length === 1
      ) {
        const onlyEntry =
          coordinateEntries[0];

        map.animateToRegion(
          {
            latitude:
              onlyEntry.latitude,
            longitude:
              onlyEntry.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          animated ? 350 : 0,
        );
        return;
      }

      map.fitToCoordinates(
        coordinateEntries.map(
          (entry) => ({
            latitude:
              entry.latitude,
            longitude:
              entry.longitude,
          }),
        ),
        {
          edgePadding: {
            top:
              filtersExpanded
                ? 310
                : 145,
            right: 48,
            bottom: 250,
            left: 48,
          },
          animated,
        },
      );
    },
    [
      coordinateEntries,
      filtersExpanded,
    ],
  );

  useEffect(() => {
    if (
      !mapReady ||
      !mapLaidOut ||
      !coordinateKey ||
      fittedCoordinateKeyRef
        .current === coordinateKey
    ) {
      return;
    }

    fittedCoordinateKeyRef.current =
      coordinateKey;

    const timer = setTimeout(() => {
      fitMapToEntries(false);
    }, 140);

    return () => {
      clearTimeout(timer);
    };
  }, [
    coordinateKey,
    fitMapToEntries,
    mapLaidOut,
    mapReady,
  ]);

  const selectEntry = useCallback(
    (
      entry: MappableSavedCafeEntry,
    ) => {
      setSelectedPlaceId(
        entry.cafe.placeId,
      );

      mapRef.current?.animateToRegion(
        {
          latitude: entry.latitude,
          longitude: entry.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        280,
      );
    },
    [],
  );

  const openDetail = useCallback(
    (entry: SavedCafeLocalEntry) => {
      router.push({
        pathname:
          '/place/cafe-detail',
        params: {
          placeId:
            entry.cafe.placeId,
        },
      } as never);
    },
    [],
  );

  const goToList = useCallback(() => {
    router.replace(
      '/place/saved-cafes' as never,
    );
  }, []);

  const retryLoad = useCallback(() => {
    fittedCoordinateKeyRef.current =
      '';

    setReloadVersion(
      (value) => value + 1,
    );
  }, []);

  const focusCurrentLocation =
    useCallback(async () => {
      if (locating) {
        return;
      }

      if (userCoordinate) {
        mapRef.current?.animateToRegion(
          {
            latitude:
              userCoordinate.latitude,
            longitude:
              userCoordinate.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          300,
        );
        return;
      }

      setLocating(true);

      try {
        let permission =
          await Location.getForegroundPermissionsAsync();

        if (
          permission.status !==
          'granted'
        ) {
          permission =
            await Location.requestForegroundPermissionsAsync();
        }

        if (
          permission.status !==
          'granted'
        ) {
          setLocationPermission(
            'denied',
          );

          Alert.alert(
            '위치 권한이 필요해요',
            '내 위치와 카페까지의 거리를 확인하려면 위치 권한을 허용해 주세요.',
          );
          return;
        }

        setLocationPermission(
          'granted',
        );

        const currentPosition =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy
                  .Balanced,
            },
          );

        const nextCoordinate = {
          latitude:
            currentPosition.coords
              .latitude,
          longitude:
            currentPosition.coords
              .longitude,
        };

        setUserCoordinate(
          nextCoordinate,
        );

        fittedCoordinateKeyRef.current =
          '';

        mapRef.current?.animateToRegion(
          {
            ...nextCoordinate,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          },
          320,
        );
      }
      catch (error) {
        console.log(
          'SAVED CAFE MAP LOCATION ERROR',
          error,
        );

        Alert.alert(
          '현재 위치를 확인하지 못했어요',
          '잠시 후 다시 시도해 주세요.',
        );
      }
      finally {
        setLocating(false);
      }
    }, [
      locating,
      userCoordinate,
    ]);

  const clearMapSearchAndFilters =
    useCallback(() => {
      setSearchQuery('');
      setStatusFilter(
        MAP_FILTER_ALL,
      );
      setPrimaryThemeFilter(
        MAP_FILTER_ALL,
      );
      setDistanceRadiusKm(null);
      fittedCoordinateKeyRef.current =
        '';
    }, []);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 8,
            borderBottomColor:
              theme.line,
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="저장 카페 목록으로 돌아가기"
          onPress={() =>
            router.back()
          }
          style={({ pressed }) => [
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
            color={theme.text}
          />
        </Pressable>

        <View
          style={
            styles.headerTextArea
          }
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
          >
            저장 카페 지도
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
            {loading
              ? '카페 위치를 불러오는 중...'
              : hasActiveSearchOrFilter
                ? `지도 ${coordinateEntries.length}곳 / 저장 ${entries.length}곳`
                : `지도 ${allCoordinateEntries.length}곳 · 전체 ${entries.length}곳`}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="저장 카페 목록 보기"
          onPress={goToList}
          style={({ pressed }) => [
            styles.listButton,
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
            name="list-outline"
            size={16}
            color={theme.text}
          />
          <Text
            style={[
              styles.listButtonText,
              {
                color: theme.text,
              },
            ]}
          >
            목록
          </Text>
        </Pressable>
      </View>

      {loading &&
      entries.length === 0 ? (
        <View
          style={styles.centerArea}
        >
          <ActivityIndicator
            size="small"
            color={theme.text}
          />
          <Text
            style={[
              styles.centerDescription,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            저장한 카페 위치를 확인하고 있어요.
          </Text>
        </View>
      ) : loadError &&
        entries.length === 0 ? (
        <View
          style={styles.centerArea}
        >
          <View
            style={[
              styles.emptyCard,
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
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={theme.text}
            />
            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              지도를 불러오지 못했어요.
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
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="저장 카페 지도 다시 불러오기"
              onPress={retryLoad}
              style={({ pressed }) => [
                styles.emptyActionButton,
                {
                  backgroundColor:
                    theme.background,
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
                name="refresh-outline"
                size={15}
                color={theme.text}
              />
              <Text
                style={[
                  styles.emptyActionText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                다시 불러오기
              </Text>
            </Pressable>
          </View>
        </View>
      ) : allCoordinateEntries
          .length === 0 ? (
        <View
          style={styles.centerArea}
        >
          <View
            style={[
              styles.emptyCard,
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
            <Ionicons
              name="map-outline"
              size={30}
              color={theme.text}
            />
            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              지도에 표시할 카페가 없어요.
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
              카카오 검색 결과에서 저장한 카페는 위치가 함께 기록돼요.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 추가 화면 열기"
              onPress={() =>
                router.push(
                  '/place/cafe-save' as never,
                )
              }
              style={({ pressed }) => [
                styles.emptyActionButton,
                {
                  backgroundColor:
                    theme.background,
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
                name="add"
                size={15}
                color={theme.text}
              />
              <Text
                style={[
                  styles.emptyActionText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                카페 추가
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={styles.mapArea}
          onLayout={() =>
            setMapLaidOut(true)
          }
        >
          <MapView
            ref={mapRef}
            style={
              StyleSheet.absoluteFillObject
            }
            initialRegion={
              DEFAULT_REGION
            }
            mapType="standard"
            loadingEnabled
            toolbarEnabled={false}
            moveOnMarkerPress={false}
            showsCompass
            showsScale={false}
            showsBuildings
            showsTraffic={false}
            showsUserLocation={
              locationPermission ===
              'granted'
            }
            showsMyLocationButton={false}
            onMapReady={() =>
              setMapReady(true)
            }
            mapPadding={{
              top:
                filtersExpanded
                  ? 310
                  : 145,
              right: 18,
              bottom: 205,
              left: 18,
            }}
          >
            {coordinateEntries.map(
              (entry) => (
                <Marker
                  key={
                    entry.cafe.placeId
                  }
                  coordinate={{
                    latitude:
                      entry.latitude,
                    longitude:
                      entry.longitude,
                  }}
                  title={
                    entry.cafe.name
                  }
                  description={
                    entry.roadAddress ||
                    entry.address ||
                    STATUS_LABELS[
                      entry.cafe.status
                    ]
                  }
                  pinColor={getMarkerColor(
                    entry.cafe.status,
                  )}
                  onPress={() =>
                    selectEntry(entry)
                  }
                />
              ),
            )}
          </MapView>

          <View
            pointerEvents="box-none"
            style={
              StyleSheet.absoluteFillObject
            }
          >
            <View
              style={[
                styles.searchFilterCard,
                {
                  top: 12,
                  left: 12,
                  right: 62,
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
                  styles.searchBox,
                  {
                    backgroundColor:
                      theme.background,
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
                  name="search-outline"
                  size={16}
                  color={
                    theme.subText
                  }
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={
                    setSearchQuery
                  }
                  placeholder="지도에서 카페 검색"
                  placeholderTextColor={
                    theme.subText
                  }
                  style={[
                    styles.searchInput,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  selectionColor={
                    theme.text
                  }
                />
                {searchQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="지도 카페 검색어 지우기"
                    onPress={() =>
                      setSearchQuery('')
                    }
                    hitSlop={8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={
                        theme.subText
                      }
                    />
                  </Pressable>
                ) : null}
              </View>

              <View
                style={
                  styles.filterSummaryRow
                }
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="지도 카페 필터 열기"
                  accessibilityState={{
                    expanded:
                      filtersExpanded,
                  }}
                  onPress={() =>
                    setFiltersExpanded(
                      (value) =>
                        !value,
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.filterToggle,
                    {
                      backgroundColor:
                        activeFilterCount >
                        0
                          ? theme.button
                          : theme.background,
                      borderColor:
                        activeFilterCount >
                        0
                          ? theme.strongLine
                          : theme.line,
                      borderRadius:
                        isCityBlack
                          ? 2
                          : 8,
                      opacity:
                        pressed
                          ? 0.58
                          : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="options-outline"
                    size={14}
                    color={
                      activeFilterCount >
                      0
                        ? theme.buttonText
                        : theme.text
                    }
                  />
                  <Text
                    style={[
                      styles.filterToggleText,
                      {
                        color:
                          activeFilterCount >
                          0
                            ? theme.buttonText
                            : theme.text,
                      },
                    ]}
                  >
                    필터
                    {activeFilterCount >
                    0
                      ? ` ${activeFilterCount}`
                      : ''}
                  </Text>
                  <Ionicons
                    name={
                      filtersExpanded
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={12}
                    color={
                      activeFilterCount >
                      0
                        ? theme.buttonText
                        : theme.subText
                    }
                  />
                </Pressable>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.resultCountText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  지도 {coordinateEntries.length}곳
                  {missingCoordinateCount >
                  0
                    ? ` · 좌표 없음 ${missingCoordinateCount}곳`
                    : ''}
                </Text>

                {hasActiveSearchOrFilter ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="지도 검색과 필터 초기화"
                    onPress={
                      clearMapSearchAndFilters
                    }
                    hitSlop={5}
                    style={({
                      pressed,
                    }) => ({
                      opacity:
                        pressed
                          ? 0.5
                          : 1,
                    })}
                  >
                    <Text
                      style={[
                        styles.resetText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      초기화
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              {filtersExpanded ? (
                <View
                  style={
                    styles.expandedFilters
                  }
                >
                  <Text
                    style={[
                      styles.filterTitle,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    관계
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles.filterChipRow
                    }
                  >
                    {STATUS_FILTER_OPTIONS.map(
                      (option) => (
                        <MapFilterChip
                          key={
                            option.id
                          }
                          label={
                            option.label
                          }
                          selected={
                            statusFilter ===
                            option.id
                          }
                          onPress={() =>
                            setStatusFilter(
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
                  </ScrollView>

                  <Text
                    style={[
                      styles.filterTitle,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    대표 테마
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={
                      false
                    }
                    contentContainerStyle={
                      styles.filterChipRow
                    }
                  >
                    <MapFilterChip
                      label="전체"
                      selected={
                        primaryThemeFilter ===
                        MAP_FILTER_ALL
                      }
                      onPress={() =>
                        setPrimaryThemeFilter(
                          MAP_FILTER_ALL,
                        )
                      }
                      theme={theme}
                      isCityBlack={
                        isCityBlack
                      }
                    />
                    {primaryThemeOptions.map(
                      (themeId) => (
                        <MapFilterChip
                          key={themeId}
                          label={
                            PLACE_PRIMARY_THEME_MAP[
                              themeId
                            ]?.label ??
                            themeId
                          }
                          selected={
                            primaryThemeFilter ===
                            themeId
                          }
                          onPress={() =>
                            setPrimaryThemeFilter(
                              themeId,
                            )
                          }
                          theme={theme}
                          isCityBlack={
                            isCityBlack
                          }
                        />
                      ),
                    )}
                  </ScrollView>

                  <Text
                    style={[
                      styles.filterTitle,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    내 주변 거리
                  </Text>

                  {userCoordinate ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={
                        styles.filterChipRow
                      }
                    >
                      {DISTANCE_FILTER_OPTIONS.map(
                        (option) => (
                          <MapFilterChip
                            key={
                              option.radiusKm ??
                              'all'
                            }
                            label={
                              option.label
                            }
                            selected={
                              distanceRadiusKm ===
                              option.radiusKm
                            }
                            onPress={() =>
                              setDistanceRadiusKm(
                                option.radiusKm,
                              )
                            }
                            theme={theme}
                            isCityBlack={
                              isCityBlack
                            }
                          />
                        ),
                      )}
                    </ScrollView>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="내 위치를 불러와 거리 필터 사용하기"
                      onPress={
                        focusCurrentLocation
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.locationFilterHint,
                        {
                          backgroundColor:
                            theme.background,
                          borderColor:
                            theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 8,
                          opacity:
                            pressed
                              ? 0.58
                              : 1,
                        },
                      ]}
                    >
                      {locating ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            theme.text
                          }
                        />
                      ) : (
                        <Ionicons
                          name="locate-outline"
                          size={14}
                          color={
                            theme.text
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.locationFilterHintText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        내 위치를 불러오면 거리 필터를 사용할 수 있어요.
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="현재 조건의 모든 저장 카페가 보이도록 지도 맞추기"
              disabled={
                coordinateEntries.length ===
                0
              }
              onPress={() =>
                fitMapToEntries(true)
              }
              style={({ pressed }) => [
                styles.fitButton,
                {
                  top: 12,
                  right: 12,
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 11,
                  opacity:
                    coordinateEntries
                      .length === 0
                      ? 0.38
                      : pressed
                        ? 0.62
                        : 1,
                },
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={18}
                color={theme.text}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                userCoordinate
                  ? '내 위치로 지도 이동'
                  : '현재 위치 확인'
              }
              onPress={
                focusCurrentLocation
              }
              disabled={locating}
              style={({ pressed }) => [
                styles.locationButton,
                {
                  top: 62,
                  right: 12,
                  backgroundColor:
                    userCoordinate
                      ? theme.button
                      : theme.card,
                  borderColor:
                    userCoordinate
                      ? theme.strongLine
                      : theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 11,
                  opacity:
                    locating
                      ? 0.55
                      : pressed
                        ? 0.62
                        : 1,
                },
              ]}
            >
              {locating ? (
                <ActivityIndicator
                  size="small"
                  color={
                    userCoordinate
                      ? theme.buttonText
                      : theme.text
                  }
                />
              ) : (
                <Ionicons
                  name={
                    userCoordinate
                      ? 'navigate'
                      : 'locate-outline'
                  }
                  size={18}
                  color={
                    userCoordinate
                      ? theme.buttonText
                      : theme.text
                  }
                />
              )}
            </Pressable>

            {coordinateEntries.length ===
            0 ? (
              <View
                style={[
                  styles.noResultCard,
                  {
                    top:
                      filtersExpanded
                        ? 300
                        : 135,
                    left: 22,
                    right: 22,
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 3
                        : 14,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={23}
                  color={
                    theme.subText
                  }
                />
                <Text
                  style={[
                    styles.noResultTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  조건에 맞는 지도 카페가 없어요.
                </Text>
                <Text
                  style={[
                    styles.noResultDescription,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  검색어를 바꾸거나 필터를 초기화해 보세요.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="지도 검색과 필터 초기화"
                  onPress={
                    clearMapSearchAndFilters
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.noResultResetButton,
                    {
                      backgroundColor:
                        theme.background,
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
                      styles.noResultResetText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    검색·필터 초기화
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {selectedEntry ? (
              <View
                style={[
                  styles.selectedCard,
                  {
                    left: 12,
                    right: 12,
                    bottom:
                      insets.bottom +
                      12,
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
                <View
                  style={
                    styles.selectedHeaderRow
                  }
                >
                  <View
                    style={
                      styles.selectedTextArea
                    }
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.selectedName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {
                        selectedEntry
                          .cafe.name
                      }
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.selectedAddress,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {selectedEntry.roadAddress ||
                        selectedEntry.address ||
                        '주소 정보 없음'}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${selectedEntry.cafe.name} 상세 보기 및 수정`}
                    onPress={() =>
                      openDetail(
                        selectedEntry,
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.detailButton,
                      {
                        backgroundColor:
                          theme.background,
                        borderColor:
                          theme.line,
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 9,
                        opacity:
                          pressed
                            ? 0.58
                            : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailButtonText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      상세 보기·수정
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={
                        theme.subText
                      }
                    />
                  </Pressable>
                </View>

                <View
                  style={
                    styles.badgeRow
                  }
                >
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          theme.background,
                        borderColor:
                          theme.line,
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 999,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.markerDot,
                        {
                          backgroundColor:
                            getMarkerColor(
                              selectedEntry
                                .cafe
                                .status,
                            ),
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {
                        STATUS_LABELS[
                          selectedEntry
                            .cafe
                            .status
                        ]
                      }
                    </Text>
                  </View>

                  {selectedDistanceKm !==
                  null ? (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            theme.background,
                          borderColor:
                            theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 999,
                        },
                      ]}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={12}
                        color={
                          theme.subText
                        }
                      />
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        내 위치에서{' '}
                        {formatDistance(
                          selectedDistanceKm,
                        )}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          theme.background,
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
                        styles.badgeText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {PLACE_PRIMARY_THEME_MAP[
                        selectedEntry
                          .cafe
                          .primaryTheme
                      ]?.label ??
                        '카페'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

type MapFilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function MapFilterChip({
  label,
  selected,
  onPress,
  theme,
  isCityBlack,
}: MapFilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor:
            selected
              ? theme.button
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
              ? 0.58
              : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.filterChipText,
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

const styles = StyleSheet.create({
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
    zIndex: 3,
  },

  headerButton: {
    width: 36,
    height: 36,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextArea: {
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
  },

  listButton: {
    height: 34,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  listButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },

  mapArea: {
    flex: 1,
    overflow: 'hidden',
  },

  centerArea: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  centerDescription: {
    fontSize: 10,
    fontWeight: '700',
  },

  emptyCard: {
    width: '100%',
    maxWidth: 430,
    padding: 24,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyDescription: {
    marginTop: 7,
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },

  emptyActionButton: {
    minHeight: 36,
    marginTop: 14,
    paddingHorizontal: 12,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  emptyActionText: {
    fontSize: 9.5,
    fontWeight: '900',
  },

  searchFilterCard: {
    position: 'absolute',
    padding: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    gap: 8,
  },

  searchBox: {
    minHeight: 38,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    fontSize: 10,
    fontWeight: '700',
  },

  filterSummaryRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  filterToggle: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  filterToggleText: {
    fontSize: 8.8,
    fontWeight: '900',
  },

  resultCountText: {
    flex: 1,
    minWidth: 0,
    fontSize: 8.5,
    fontWeight: '800',
  },

  resetText: {
    fontSize: 8.5,
    fontWeight: '900',
    textDecorationLine:
      'underline',
  },

  expandedFilters: {
    gap: 6,
  },

  filterTitle: {
    fontSize: 8.5,
    fontWeight: '900',
  },

  filterChipRow: {
    gap: 6,
    paddingRight: 5,
  },

  filterChip: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterChipText: {
    fontSize: 8.5,
    fontWeight: '800',
  },

  locationFilterHint: {
    minHeight: 34,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  locationFilterHintText: {
    flex: 1,
    minWidth: 0,
    fontSize: 8.5,
    fontWeight: '800',
  },

  fitButton: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationButton: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noResultCard: {
    position: 'absolute',
    minHeight: 155,
    padding: 18,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noResultTitle: {
    marginTop: 9,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  noResultDescription: {
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 14,
    textAlign: 'center',
  },

  noResultResetButton: {
    minHeight: 32,
    marginTop: 11,
    paddingHorizontal: 10,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noResultResetText: {
    fontSize: 9,
    fontWeight: '900',
  },

  selectedCard: {
    position: 'absolute',
    minHeight: 132,
    padding: 13,
    borderWidth:
      StyleSheet.hairlineWidth,
  },

  selectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  selectedTextArea: {
    flex: 1,
    minWidth: 0,
  },

  selectedName: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  selectedAddress: {
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 14,
  },

  detailButton: {
    minHeight: 34,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  detailButtonText: {
    fontSize: 8.8,
    fontWeight: '900',
  },

  badgeRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  badge: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  markerDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 8.8,
    fontWeight: '800',
  },
});
