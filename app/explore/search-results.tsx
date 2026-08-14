// ROOT_EXPLORE_DISCOVERY_V1_RESULTS

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EXPLORATION_PLACE_CATALOG,
  type ExplorationPlaceDefinition,
} from '../../store/explorationCatalog';
import {
  FESTIVAL_CATALOG,
  type FestivalDefinition,
} from '../../store/festivalCatalog';
import {
  searchKakaoCafes,
  type KakaoCafeSearchResult,
} from '../../store/kakaoCafeSearch';
import {
  loadSavedCafeEntriesLocalOnly,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import { useRootTheme } from '../../store/rootTheme';

type ResultKind = 'place' | 'festival' | 'cafe';
type ResultFilter = 'all' | ResultKind;
type ViewMode = 'list' | 'map';

type DiscoveryResult = {
  key: string;
  id: string;
  kind: ResultKind;
  name: string;
  description: string;
  category: string;
  region: string;
  icon: string;
  latitude: number;
  longitude: number;
  reason: string;
  score: number;
  detailPath?: string;
  externalUrl?: string;
};

const FILTER_OPTIONS: readonly {
  id: ResultFilter;
  label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'place', label: '장소' },
  { id: 'festival', label: '축제·행사' },
  { id: 'cafe', label: '카페' },
];

const MOOD_LABELS: Record<string, string> = {
  quiet: '조용한',
  nature: '자연 속',
  active: '활동적인',
  culture: '문화·전시',
  food: '맛있는',
  photo: '사진 좋은',
  rest: '쉬기 좋은',
  cafe: '카페 중심',
};

const WHEN_LABELS: Record<string, string> = {
  today: '오늘',
  weekend: '이번 주말',
  tonight: '오늘 저녁',
  later: '날짜는 아직',
};

const COMPANION_LABELS: Record<string, string> = {
  alone: '혼자',
  date: '연인과',
  friend: '친구와',
  family: '가족과',
  pet: '반려동물과',
};

const MOOD_KEYWORDS: Record<string, readonly string[]> = {
  quiet: ['조용', '고요', '산책', '숲', '서원', '사찰'],
  nature: ['자연', '숲', '공원', '계곡', '바다', '해변', '산'],
  active: ['체험', '레저', '트레킹', '등산', '자전거', '활동'],
  culture: ['문화', '전시', '미술', '박물관', '공연', '역사'],
  food: ['음식', '맛집', '시장', '먹거리', '카페', '커피'],
  photo: ['전망', '야경', '일몰', '정원', '꽃', '풍경'],
  rest: ['휴식', '공원', '산책', '정원', '숲', '호수'],
  cafe: ['카페', '커피', '베이커리', '브런치'],
};

const COMPANION_KEYWORDS: Record<string, readonly string[]> = {
  alone: ['산책', '박물관', '미술', '책', '카페', '숲'],
  date: ['야경', '일몰', '정원', '카페', '전시', '바다'],
  friend: ['체험', '시장', '레저', '축제', '음식', '공연'],
  family: ['가족', '공원', '체험', '박물관', '생태', '동물'],
  pet: ['공원', '산책', '숲', '야외', '잔디', '해변'],
};

const STOP_WORDS = new Set([
  '곳',
  '장소',
  '좋은',
  '좋아',
  '하기',
  '할만한',
  '갈만한',
  '이번',
  '뭐',
  '하지',
  '가볍게',
  '떠나는',
]);

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[?!.,·/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function getSearchTokens(query: string) {
  const normalized = normalizeText(query);
  const tokens = normalized
    .split(' ')
    .filter(
      (token) => token.length > 1 && !STOP_WORDS.has(token)
    );

  if (normalized.includes('카공')) {
    tokens.push('카페', '공부', '노트북');
  }
  if (normalized.includes('비 오는') || normalized.includes('비오는')) {
    tokens.push('실내', '전시', '박물관');
  }
  if (normalized.includes('데이트')) {
    tokens.push('야경', '산책', '카페', '전시');
  }
  if (normalized.includes('바다')) {
    tokens.push('해변', '해수욕장', '해안');
  }
  if (normalized.includes('주말')) {
    tokens.push('축제', '행사', '체험');
  }

  return Array.from(new Set(tokens));
}

function scoreText(
  fields: readonly { text: string; weight: number }[],
  tokens: readonly string[]
) {
  return tokens.reduce((total, token) => {
    const best = fields.reduce(
      (score, field) =>
        normalizeText(field.text).includes(token)
          ? Math.max(score, field.weight)
          : score,
      0
    );
    return total + best;
  }, 0);
}

function getRecommendationKeywords(
  moods: readonly string[],
  companion: string,
  when: string
) {
  const keywords = moods.flatMap(
    (mood) => MOOD_KEYWORDS[mood] ?? []
  );
  keywords.push(...(COMPANION_KEYWORDS[companion] ?? []));

  if (when === 'tonight') {
    keywords.push('야간', '야경', '공연', '시장');
  }

  return Array.from(new Set(keywords));
}

function placeToResult(
  place: ExplorationPlaceDefinition,
  tokens: readonly string[],
  recommendation: boolean
): DiscoveryResult | null {
  const score = scoreText(
    [
      { text: place.name, weight: 12 },
      { text: place.category, weight: 8 },
      { text: place.district, weight: 6 },
      { text: place.description, weight: 4 },
    ],
    tokens
  );

  if (tokens.length > 0 && score === 0) {
    return null;
  }

  const matchedToken = tokens.find((token) =>
    normalizeText(
      `${place.category} ${place.description}`
    ).includes(token)
  );

  return {
    key: `place:${place.id}`,
    id: place.id,
    kind: 'place',
    name: place.name,
    description: place.description,
    category: place.category,
    region: place.district,
    icon: place.icon || '📍',
    latitude: place.mapLatitude,
    longitude: place.mapLongitude,
    reason: recommendation
      ? matchedToken
        ? `원하는 분위기 ‘${matchedToken}’와 잘 맞아요.`
        : '선택한 조건과 가까운 ROOT 탐험 장소예요.'
      : matchedToken
        ? `검색한 ‘${matchedToken}’ 특징이 포함되어 있어요.`
        : '검색어와 관련된 ROOT 탐험 장소예요.',
    score,
    detailPath: `/explore/place/${place.id}`,
  };
}

function festivalToResult(
  festival: FestivalDefinition,
  tokens: readonly string[],
  recommendation: boolean
): DiscoveryResult | null {
  if (
    festival.scheduleStatus === 'ended' ||
    festival.scheduleStatus === 'cancelled'
  ) {
    return null;
  }

  const score = scoreText(
    [
      { text: festival.name, weight: 12 },
      { text: festival.category, weight: 9 },
      { text: festival.regionName, weight: 6 },
      { text: festival.districtName, weight: 6 },
      { text: festival.description, weight: 4 },
      { text: festival.featuredReason, weight: 3 },
    ],
    tokens
  );

  if (tokens.length > 0 && score === 0) {
    return null;
  }

  const matchedToken = tokens.find((token) =>
    normalizeText(
      `${festival.category} ${festival.description}`
    ).includes(token)
  );

  return {
    key: `festival:${festival.id}`,
    id: festival.id,
    kind: 'festival',
    name: festival.name,
    description: festival.description,
    category: festival.category,
    region: `${festival.regionName} ${festival.districtName}`,
    icon: festival.icon || '🎪',
    latitude: festival.latitude,
    longitude: festival.longitude,
    reason: recommendation
      ? matchedToken
        ? `원하는 분위기 ‘${matchedToken}’와 이어지는 행사예요.`
        : festival.featuredReason
      : matchedToken
        ? `검색한 ‘${matchedToken}’와 관련된 행사예요.`
        : festival.featuredReason,
    score: score + (festival.scale === 'mega' ? 3 : 0),
    detailPath: `/explore/festival/${festival.id}`,
  };
}

function savedCafeToResult(
  entry: SavedCafeLocalEntry,
  tokens: readonly string[],
  recommendation: boolean
): DiscoveryResult | null {
  const cafe = entry.cafe;
  const text = [
    '카페',
    cafe.name,
    cafe.primaryTheme,
    cafe.themes.join(' '),
    cafe.tags.join(' '),
    cafe.representativeTags.join(' '),
    cafe.memo,
    entry.address,
    entry.roadAddress,
  ].join(' ');
  const score = scoreText(
    [{ text, weight: 8 }],
    tokens
  );

  if (tokens.length > 0 && score === 0) {
    return null;
  }

  const latitude = Number(entry.latitude);
  const longitude = Number(entry.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    key: `saved-cafe:${cafe.placeId}`,
    id: cafe.placeId,
    kind: 'cafe',
    name: cafe.name,
    description: cafe.memo || '내가 ROOT에 저장한 카페예요.',
    category: '저장 카페',
    region: entry.roadAddress || entry.address || '주소 정보 없음',
    icon: '☕',
    latitude,
    longitude,
    reason: recommendation
      ? '내 취향과 선택한 분위기를 함께 반영했어요.'
      : '내 ROOT 카페 저장 정보와 검색어가 일치해요.',
    score: score + 10,
    detailPath: `/place/cafe-detail?placeId=${encodeURIComponent(cafe.placeId)}`,
  };
}

function kakaoCafeToResult(
  cafe: KakaoCafeSearchResult
): DiscoveryResult {
  return {
    key: `kakao-cafe:${cafe.id}`,
    id: cafe.id,
    kind: 'cafe',
    name: cafe.name,
    description: cafe.categoryName || '카카오 장소 검색 결과',
    category: '카페',
    region: cafe.displayAddress,
    icon: '☕',
    latitude: cafe.latitude,
    longitude: cafe.longitude,
    reason: '검색어와 일치하는 실시간 카페 후보예요.',
    score: 7,
    externalUrl: cafe.placeUrl,
  };
}

export default function ExploreSearchResultsScreen() {
  const params = useLocalSearchParams<{
    source?: string | string[];
    q?: string | string[];
    when?: string | string[];
    companion?: string | string[];
    moods?: string | string[];
  }>();
  const { theme, isCityBlack } = useRootTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const source = firstParam(params.source);
  const initialQuery = firstParam(params.q);
  const when = firstParam(params.when);
  const companion = firstParam(params.companion);
  const moods = firstParam(params.moods)
    .split(',')
    .filter(Boolean);
  const recommendation = source === 'recommend';

  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [savedCafes, setSavedCafes] = useState<SavedCafeLocalEntry[]>([]);
  const [onlineCafes, setOnlineCafes] = useState<KakaoCafeSearchResult[]>([]);
  const [cafeLoading, setCafeLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const recommendationKeywords = useMemo(
    () => getRecommendationKeywords(moods, companion, when),
    [companion, moods.join(','), when]
  );
  const searchTokens = useMemo(
    () =>
      recommendation
        ? recommendationKeywords
        : getSearchTokens(activeQuery),
    [activeQuery, recommendation, recommendationKeywords]
  );

  const isCafeIntent = useMemo(() => {
    const text = normalizeText(
      `${activeQuery} ${moods.join(' ')}`
    );
    return (
      text.includes('카페') ||
      text.includes('카공') ||
      text.includes('커피') ||
      moods.includes('cafe')
    );
  }, [activeQuery, moods.join(',')]);

  useEffect(() => {
    let active = true;
    void loadSavedCafeEntriesLocalOnly()
      .then((entries) => {
        if (active) setSavedCafes(entries);
      })
      .catch(() => {
        if (active) setSavedCafes([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!isCafeIntent || recommendation) {
      setOnlineCafes([]);
      return () => {
        active = false;
      };
    }

    setCafeLoading(true);
    void searchKakaoCafes(activeQuery || '카페')
      .then((results) => {
        if (active) setOnlineCafes(results);
      })
      .catch(() => {
        if (active) setOnlineCafes([]);
      })
      .finally(() => {
        if (active) setCafeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeQuery, isCafeIntent, recommendation]);

  const allResults = useMemo(() => {
    const places = Object.values(EXPLORATION_PLACE_CATALOG)
      .map((place) =>
        placeToResult(place, searchTokens, recommendation)
      )
      .filter((item): item is DiscoveryResult => Boolean(item));
    const festivals = FESTIVAL_CATALOG
      .map((festival) =>
        festivalToResult(festival, searchTokens, recommendation)
      )
      .filter((item): item is DiscoveryResult => Boolean(item));
    const localCafes = savedCafes
      .map((entry) =>
        savedCafeToResult(entry, searchTokens, recommendation)
      )
      .filter((item): item is DiscoveryResult => Boolean(item));
    const externalCafes = onlineCafes.map(kakaoCafeToResult);

    return [...localCafes, ...places, ...festivals, ...externalCafes]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))
      .slice(0, 100);
  }, [onlineCafes, recommendation, savedCafes, searchTokens]);

  const results = useMemo(
    () =>
      filter === 'all'
        ? allResults
        : allResults.filter((item) => item.kind === filter),
    [allResults, filter]
  );

  const selectedResult =
    results.find((item) => item.key === selectedKey) ?? results[0] ?? null;

  const resultTitle = recommendation
    ? `${WHEN_LABELS[when] ?? '이번'} ${COMPANION_LABELS[companion] ?? ''} 추천`
    : `‘${activeQuery}’ 검색 결과`;
  const recommendationSummary = moods
    .map((mood) => MOOD_LABELS[mood] ?? mood)
    .join(' · ');

  const openResult = useCallback((result: DiscoveryResult) => {
    if (result.detailPath) {
      router.push(result.detailPath as any);
      return;
    }
    if (result.externalUrl) {
      void Linking.openURL(result.externalUrl);
    }
  }, []);

  const submitSearch = () => {
    const next = query.trim();
    if (!next) return;
    setActiveQuery(next);
    setFilter('all');
    setSelectedKey(null);
  };

  const fitMap = useCallback(() => {
    const coordinates = results
      .filter(
        (item) =>
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude)
      )
      .slice(0, 60)
      .map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
      }));

    if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 60, right: 45, bottom: 180, left: 45 },
        animated: true,
      });
    }
  }, [results]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconButton,
            {
              borderColor: theme.line,
              borderRadius: isCityBlack ? 2 : 10,
              opacity: pressed ? 0.55 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>탐험 결과</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subText }]}>지도와 목록에서 비교해 보세요</Text>
        </View>
        <Pressable
          onPress={() => router.replace('/explore/recommend' as any)}
          style={({ pressed }) => [
            styles.iconButton,
            {
              borderColor: theme.line,
              borderRadius: isCityBlack ? 2 : 10,
              opacity: pressed ? 0.55 : 1,
            },
          ]}
        >
          <Ionicons name="options-outline" size={19} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.topArea}>
        {!recommendation ? (
          <View
            style={[
              styles.searchRow,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 2 : 12,
              },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={theme.subText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              placeholder="다른 조건으로 다시 검색"
              placeholderTextColor={theme.subText}
              style={[styles.searchInput, { color: theme.text }]}
            />
            <Pressable
              onPress={submitSearch}
              style={({ pressed }) => [
                styles.searchButton,
                {
                  backgroundColor: theme.button,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.searchButtonText, { color: theme.buttonText }]}>검색</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryText}>
            <Text style={[styles.resultTitle, { color: theme.text }]}>{resultTitle}</Text>
            <Text style={[styles.resultSubtitle, { color: theme.subText }]}>
              {recommendationSummary || 'ROOT 탐험 데이터'} · {results.length}개
            </Text>
          </View>
          <View
            style={[
              styles.viewToggle,
              {
                borderColor: theme.line,
                borderRadius: isCityBlack ? 2 : 10,
              },
            ]}
          >
            {(['list', 'map'] as const).map((mode) => {
              const selected = viewMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={[
                    styles.viewToggleButton,
                    selected && { backgroundColor: theme.button },
                  ]}
                >
                  <Ionicons
                    name={mode === 'list' ? 'list-outline' : 'map-outline'}
                    size={16}
                    color={selected ? theme.buttonText : theme.text}
                  />
                  <Text
                    style={[
                      styles.viewToggleText,
                      { color: selected ? theme.buttonText : theme.text },
                    ]}
                  >
                    {mode === 'list' ? '목록' : '지도'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((item) => {
            const selected = filter === item.id;
            const count =
              item.id === 'all'
                ? allResults.length
                : allResults.filter((result) => result.kind === item.id).length;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setFilter(item.id);
                  setSelectedKey(null);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? theme.button : theme.card,
                    borderColor: selected ? theme.strongLine : theme.line,
                    borderRadius: isCityBlack ? 2 : 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: selected ? theme.buttonText : theme.text },
                  ]}
                >
                  {item.label} {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {cafeLoading ? (
        <View style={styles.loadingLine}>
          <ActivityIndicator size="small" color={theme.text} />
          <Text style={[styles.loadingText, { color: theme.subText }]}>실시간 카페 후보도 찾고 있어요.</Text>
        </View>
      ) : null}

      {results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔎</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>조건에 맞는 결과가 아직 없어요</Text>
          <Text style={[styles.emptyDescription, { color: theme.subText }]}>검색어를 짧게 바꾸거나 다른 분위기를 선택해 보세요.</Text>
        </View>
      ) : viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: selectedResult?.latitude ?? 36.35,
              longitude: selectedResult?.longitude ?? 127.8,
              latitudeDelta: 5.4,
              longitudeDelta: 5.4,
            }}
            onMapReady={fitMap}
            showsUserLocation
            showsMyLocationButton
            moveOnMarkerPress={false}
          >
            {results.slice(0, 60).map((item) => (
              <Marker
                key={item.key}
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                title={item.name}
                description={item.reason}
                pinColor={
                  item.key === selectedResult?.key
                    ? '#7A4C22'
                    : item.kind === 'festival'
                      ? '#D97935'
                      : item.kind === 'cafe'
                        ? '#4E7A67'
                        : '#B75B4A'
                }
                onPress={() => setSelectedKey(item.key)}
              />
            ))}
          </MapView>

          {selectedResult ? (
            <View style={styles.mapPreview}>
              <ResultCard
                result={selectedResult}
                theme={theme}
                isCityBlack={isCityBlack}
                compact
                onPress={() => openResult(selectedResult)}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
        >
          {results.map((result) => (
            <ResultCard
              key={result.key}
              result={result}
              theme={theme}
              isCityBlack={isCityBlack}
              onPress={() => openResult(result)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function ResultCard({
  result,
  theme,
  isCityBlack,
  compact = false,
  onPress,
}: {
  result: DiscoveryResult;
  theme: any;
  isCityBlack: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultCard,
        compact && styles.resultCardCompact,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderRadius: isCityBlack ? 3 : 15,
          opacity: pressed ? 0.68 : 1,
        },
      ]}
    >
      <View style={[styles.resultIcon, { backgroundColor: theme.background }]}>
        <Text style={styles.resultIconText}>{result.icon}</Text>
      </View>
      <View style={styles.resultBody}>
        <View style={styles.resultNameRow}>
          <Text numberOfLines={1} style={[styles.resultName, { color: theme.text }]}>{result.name}</Text>
          <View style={[styles.kindBadge, { borderColor: theme.line }]}>
            <Text style={[styles.kindText, { color: theme.subText }]}>
              {result.kind === 'festival' ? '행사' : result.kind === 'cafe' ? '카페' : '장소'}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.resultMeta, { color: theme.subText }]}>{result.region} · {result.category}</Text>
        {!compact ? (
          <Text numberOfLines={2} style={[styles.resultDescription, { color: theme.subText }]}>{result.description}</Text>
        ) : null}
        <View style={styles.reasonRow}>
          <Ionicons name="sparkles-outline" size={13} color={theme.text} />
          <Text numberOfLines={2} style={[styles.reasonText, { color: theme.text }]}>{result.reason}</Text>
        </View>
      </View>
      <Ionicons name={result.externalUrl ? 'open-outline' : 'chevron-forward'} size={18} color={theme.subText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 62,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900' },
  headerSubtitle: { marginTop: 2, fontSize: 9, fontWeight: '700' },
  topArea: { paddingHorizontal: 15, gap: 11 },
  searchRow: {
    minHeight: 47,
    paddingLeft: 12,
    paddingRight: 5,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 12, fontWeight: '700' },
  searchButton: { minWidth: 50, height: 37, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { fontSize: 10, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryText: { flex: 1, minWidth: 0 },
  resultTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
  resultSubtitle: { marginTop: 3, fontSize: 9.5, fontWeight: '700' },
  viewToggle: { padding: 3, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  viewToggleButton: { minWidth: 55, height: 31, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  viewToggleText: { fontSize: 9, fontWeight: '900' },
  filterRow: { gap: 6, paddingBottom: 2 },
  filterChip: { minHeight: 32, paddingHorizontal: 11, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 9.5, fontWeight: '900' },
  loadingLine: { minHeight: 35, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 9.5, fontWeight: '700' },
  listContent: { padding: 15, gap: 9 },
  resultCard: { minHeight: 108, padding: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultCardCompact: { minHeight: 94, padding: 10 },
  resultIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultIconText: { fontSize: 22 },
  resultBody: { flex: 1, minWidth: 0 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultName: { flex: 1, fontSize: 13, fontWeight: '900' },
  kindBadge: { minHeight: 21, paddingHorizontal: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  kindText: { fontSize: 8, fontWeight: '900' },
  resultMeta: { marginTop: 3, fontSize: 9, fontWeight: '700' },
  resultDescription: { marginTop: 5, fontSize: 9.5, fontWeight: '600', lineHeight: 14 },
  reasonRow: { marginTop: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  reasonText: { flex: 1, fontSize: 9.2, fontWeight: '800', lineHeight: 13 },
  mapContainer: { flex: 1, marginTop: 10, overflow: 'hidden' },
  mapPreview: { position: 'absolute', left: 12, right: 12, bottom: 14 },
  emptyState: { flex: 1, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { marginTop: 13, fontSize: 15, fontWeight: '900' },
  emptyDescription: { marginTop: 7, textAlign: 'center', fontSize: 10.5, fontWeight: '700', lineHeight: 16 },
});
