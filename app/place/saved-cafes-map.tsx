import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
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

  const coordinateEntries = useMemo(
    () => entries.filter(isMappableSavedCafeEntry),
    [entries],
  );

  const missingCoordinateCount =
    entries.length - coordinateEntries.length;

  const selectedEntry = useMemo(
    () =>
      coordinateEntries.find(
        (entry) =>
          entry.cafe.placeId === selectedPlaceId,
      ) ?? null,
    [coordinateEntries, selectedPlaceId],
  );

  const coordinateKey = useMemo(
    () =>
      coordinateEntries
        .map(
          (entry) =>
            `${entry.cafe.placeId}:${entry.latitude}:${entry.longitude}`,
        )
        .join('|'),
    [coordinateEntries],
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

          setSelectedPlaceId((current) => {
            if (
              current &&
              mappableEntries.some(
                (entry) =>
                  entry.cafe.placeId === current,
              )
            ) {
              return current;
            }

            return (
              mappableEntries[0]?.cafe.placeId ??
              null
            );
          });
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

  const fitMapToEntries = useCallback(
    (animated: boolean) => {
      const map = mapRef.current;

      if (!map || coordinateEntries.length === 0) {
        return;
      }

      if (coordinateEntries.length === 1) {
        const onlyEntry = coordinateEntries[0];

        map.animateToRegion(
          {
            latitude: onlyEntry.latitude,
            longitude: onlyEntry.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          animated ? 350 : 0,
        );
        return;
      }

      map.fitToCoordinates(
        coordinateEntries.map((entry) => ({
          latitude: entry.latitude,
          longitude: entry.longitude,
        })),
        {
          edgePadding: {
            top: 90,
            right: 48,
            bottom: 250,
            left: 48,
          },
          animated,
        },
      );
    },
    [coordinateEntries],
  );

  useEffect(() => {
    if (
      !mapReady ||
      !mapLaidOut ||
      !coordinateKey ||
      fittedCoordinateKeyRef.current === coordinateKey
    ) {
      return;
    }

    fittedCoordinateKeyRef.current = coordinateKey;

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
    (entry: MappableSavedCafeEntry) => {
      setSelectedPlaceId(entry.cafe.placeId);

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
        pathname: '/place/cafe-detail',
        params: {
          placeId: entry.cafe.placeId,
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
    fittedCoordinateKeyRef.current = '';
    setReloadVersion((value) => value + 1);
  }, []);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: theme.line,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="저장 카페 목록으로 돌아가기"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            {
              borderColor: theme.line,
              borderRadius: isCityBlack ? 2 : 9,
              opacity: pressed ? 0.55 : 1,
            },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={theme.text}
          />
        </Pressable>

        <View style={styles.headerTextArea}>
          <Text
            style={[
              styles.title,
              { color: theme.text },
            ]}
          >
            저장 카페 지도
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: theme.subText },
            ]}
          >
            {loading
              ? '카페 위치를 불러오는 중...'
              : `지도 ${coordinateEntries.length}곳 · 전체 ${entries.length}곳`}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="저장 카페 목록 보기"
          onPress={goToList}
          style={({ pressed }) => [
            styles.listButton,
            {
              borderColor: theme.line,
              borderRadius: isCityBlack ? 2 : 9,
              opacity: pressed ? 0.55 : 1,
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
              { color: theme.text },
            ]}
          >
            목록
          </Text>
        </Pressable>
      </View>

      {loading && entries.length === 0 ? (
        <View style={styles.centerArea}>
          <ActivityIndicator
            size="small"
            color={theme.text}
          />
          <Text
            style={[
              styles.centerDescription,
              { color: theme.subText },
            ]}
          >
            저장한 카페 위치를 확인하고 있어요.
          </Text>
        </View>
      ) : loadError && entries.length === 0 ? (
        <View style={styles.centerArea}>
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 3 : 16,
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
                { color: theme.text },
              ]}
            >
              지도를 불러오지 못했어요.
            </Text>
            <Text
              style={[
                styles.emptyDescription,
                { color: theme.subText },
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
                  backgroundColor: theme.background,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 9,
                  opacity: pressed ? 0.55 : 1,
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
                  { color: theme.text },
                ]}
              >
                다시 불러오기
              </Text>
            </Pressable>
          </View>
        </View>
      ) : coordinateEntries.length === 0 ? (
        <View style={styles.centerArea}>
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 3 : 16,
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
                { color: theme.text },
              ]}
            >
              지도에 표시할 카페가 없어요.
            </Text>
            <Text
              style={[
                styles.emptyDescription,
                { color: theme.subText },
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
                  backgroundColor: theme.background,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 9,
                  opacity: pressed ? 0.55 : 1,
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
                  { color: theme.text },
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
          onLayout={() => setMapLaidOut(true)}
        >
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            initialRegion={DEFAULT_REGION}
            mapType="standard"
            loadingEnabled
            toolbarEnabled={false}
            moveOnMarkerPress={false}
            showsCompass
            showsScale={false}
            showsBuildings
            showsTraffic={false}
            showsUserLocation={false}
            onMapReady={() => setMapReady(true)}
            mapPadding={{
              top: 70,
              right: 18,
              bottom: 205,
              left: 18,
            }}
          >
            {coordinateEntries.map((entry) => (
              <Marker
                key={entry.cafe.placeId}
                coordinate={{
                  latitude: entry.latitude,
                  longitude: entry.longitude,
                }}
                title={entry.cafe.name}
                description={
                  entry.roadAddress ||
                  entry.address ||
                  STATUS_LABELS[entry.cafe.status]
                }
                pinColor={getMarkerColor(entry.cafe.status)}
                onPress={() => selectEntry(entry)}
              />
            ))}
          </MapView>

          <View
            pointerEvents="box-none"
            style={StyleSheet.absoluteFillObject}
          >
            <View
              style={[
                styles.countCard,
                {
                  top: 12,
                  left: 12,
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 11,
                },
              ]}
            >
              <Text
                style={[
                  styles.countTitle,
                  { color: theme.text },
                ]}
              >
                지도에 {coordinateEntries.length}곳
              </Text>
              {missingCoordinateCount > 0 ? (
                <Text
                  style={[
                    styles.countDescription,
                    { color: theme.subText },
                  ]}
                >
                  좌표 없음 {missingCoordinateCount}곳
                </Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="모든 저장 카페가 보이도록 지도 맞추기"
              onPress={() => fitMapToEntries(true)}
              style={({ pressed }) => [
                styles.fitButton,
                {
                  top: 12,
                  right: 12,
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 11,
                  opacity: pressed ? 0.62 : 1,
                },
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={18}
                color={theme.text}
              />
            </Pressable>

            {selectedEntry ? (
              <View
                style={[
                  styles.selectedCard,
                  {
                    left: 12,
                    right: 12,
                    bottom: insets.bottom + 12,
                    backgroundColor: theme.card,
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 3 : 16,
                  },
                ]}
              >
                <View style={styles.selectedHeaderRow}>
                  <View style={styles.selectedTextArea}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.selectedName,
                        { color: theme.text },
                      ]}
                    >
                      {selectedEntry.cafe.name}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.selectedAddress,
                        { color: theme.subText },
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
                    onPress={() => openDetail(selectedEntry)}
                    style={({ pressed }) => [
                      styles.detailButton,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.line,
                        borderRadius: isCityBlack ? 2 : 9,
                        opacity: pressed ? 0.58 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailButtonText,
                        { color: theme.text },
                      ]}
                    >
                      상세 보기·수정
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={theme.subText}
                    />
                  </Pressable>
                </View>

                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.line,
                        borderRadius: isCityBlack ? 2 : 999,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.markerDot,
                        {
                          backgroundColor: getMarkerColor(
                            selectedEntry.cafe.status,
                          ),
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: theme.text },
                      ]}
                    >
                      {STATUS_LABELS[selectedEntry.cafe.status]}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.line,
                        borderRadius: isCityBlack ? 2 : 999,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: theme.text },
                      ]}
                    >
                      {PLACE_PRIMARY_THEME_MAP[
                        selectedEntry.cafe.primaryTheme
                      ]?.label ?? '카페'}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  header: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 3,
  },

  headerButton: {
    width: 36,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  emptyActionText: {
    fontSize: 9.5,
    fontWeight: '900',
  },

  countCard: {
    position: 'absolute',
    minHeight: 48,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },

  countTitle: {
    fontSize: 10,
    fontWeight: '900',
  },

  countDescription: {
    marginTop: 2,
    fontSize: 8.5,
    fontWeight: '700',
  },

  fitButton: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedCard: {
    position: 'absolute',
    minHeight: 132,
    padding: 13,
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
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
    borderWidth: StyleSheet.hairlineWidth,
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
