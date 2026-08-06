import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CAFE_CORE_THEMES,
  CAFE_KEYWORD_MAP,
  CAFE_THEME_MAP,
} from '../../store/cafeKeywordCatalog';
import {
  PLACE_PRIMARY_THEMES,
  PLACE_PRIMARY_THEME_MAP,
  PLACE_SEASONS,
  PLACE_SEASON_MAP,
} from '../../store/placeThemeCatalog';
import {
  getSavedCafeSyncStatus,
  loadSavedCafeEntries,
  loadSavedCafeEntriesLocalOnly,
  removeSavedCafeEntry,
  subscribeSavedCafeSyncStatus,
  syncSavedCafeEntries,
  type SavedCafeLocalEntry,
  type SavedCafeSyncStatus,
} from '../../store/savedCafeLocal';
import {
  useRootTheme,
} from '../../store/rootTheme';

const STATUS_LABELS = {
  wantToGo: '가보고 싶어요',
  favorite: '좋아하는 장소',
  visited: '방문했어요',
} as const;

// SAVED_CAFE_V36_SEARCH_FILTER_SORT

const FILTER_ALL = '__all__' as const;

type SavedCafeStatusFilter =
  | typeof FILTER_ALL
  | keyof typeof STATUS_LABELS;

type SavedCafeSortOption =
  | 'updatedDesc'
  | 'updatedAsc'
  | 'nameAsc';

const STATUS_FILTER_OPTIONS: {
  id: SavedCafeStatusFilter;
  label: string;
}[] = [
  { id: FILTER_ALL, label: '전체' },
  { id: 'wantToGo', label: '가보고 싶어요' },
  { id: 'favorite', label: '좋아하는 장소' },
  { id: 'visited', label: '방문했어요' },
];

const SORT_OPTIONS: {
  id: SavedCafeSortOption;
  label: string;
}[] = [
  { id: 'updatedDesc', label: '최근 수정' },
  { id: 'updatedAsc', label: '오래된 순' },
  { id: 'nameAsc', label: '이름순' },
];

function normalizeCafeSearchText(value: string) {
  return value.trim().toLocaleLowerCase('ko-KR');
}

function getSavedCafeSortTime(entry: SavedCafeLocalEntry) {
  const values = [
    entry.cafe.updatedAt,
    entry.savedAt,
    entry.cafe.createdAt,
  ];

  return Math.max(
    ...values.map((value) => {
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    }),
  );
}

type SyncIconName =
  | 'phone-portrait-outline'
  | 'cloud-outline'
  | 'cloud-done-outline'
  | 'cloud-offline-outline'
  | 'alert-circle-outline';

type SyncPresentation = {
  icon: SyncIconName;
  title: string;
  description: string;
  canRetry: boolean;
};

function getSyncPresentation(
  status: SavedCafeSyncStatus,
): SyncPresentation {
  switch (status.phase) {
    case 'guest':
      return {
        icon:
          'phone-portrait-outline',
        title:
          '이 기기에 저장됨',
        description:
          '로그인하면 저장한 카페를 클라우드에 보관할 수 있어요.',
        canRetry: false,
      };

    case 'syncing':
      return {
        icon: 'cloud-outline',
        title:
          '카페 동기화 중',
        description:
          '다른 기기의 저장 내역을 확인하고 있어요.',
        canRetry: false,
      };

    case 'synced':
      return {
        icon:
          'cloud-done-outline',
        title: '동기화 완료',
        description:
          '저장한 카페가 클라우드에 안전하게 반영됐어요.',
        canRetry: false,
      };

    case 'offline':
      return {
        icon:
          'cloud-offline-outline',
        title:
          '오프라인 저장됨',
        description:
          '이 기기에는 저장됐어요. 인터넷 연결 후 다시 시도해 주세요.',
        canRetry: true,
      };

    case 'error':
      return {
        icon:
          'alert-circle-outline',
        title:
          '동기화 확인 필요',
        description:
          '카페는 이 기기에 남아 있어요. 다시 시도해 주세요.',
        canRetry: true,
      };

    default:
      return {
        icon: 'cloud-outline',
        title:
          '동기화 준비 중',
        description:
          '저장 목록의 클라우드 상태를 확인하고 있어요.',
        canRetry: false,
      };
  }
}

function formatSyncTime(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toLocaleTimeString(
    'ko-KR',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

export default function SavedCafesScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    entries,
    setEntries,
  ] =
    useState<
      SavedCafeLocalEntry[]
    >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    syncStatus,
    setSyncStatus,
  ] =
    useState<
      SavedCafeSyncStatus
    >(
      getSavedCafeSyncStatus,
    );

  const [
    manualSyncing,
    setManualSyncing,
  ] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<SavedCafeStatusFilter>(FILTER_ALL);
  const [primaryThemeFilter, setPrimaryThemeFilter] =
    useState<string>(FILTER_ALL);
  const [cafeThemeFilter, setCafeThemeFilter] =
    useState<string>(FILTER_ALL);
  const [seasonFilter, setSeasonFilter] =
    useState<string>(FILTER_ALL);
  const [sortOption, setSortOption] =
    useState<SavedCafeSortOption>('updatedDesc');
  const [filtersExpanded, setFiltersExpanded] =
    useState(false);

  useEffect(() => {
    return subscribeSavedCafeSyncStatus(
      setSyncStatus,
    );
  }, []);

  const syncPresentation =
    getSyncPresentation(
      syncStatus,
    );

  const lastSyncTime =
    formatSyncTime(
      syncStatus.lastSyncedAt,
    );

  const normalizedSearchQuery =
    normalizeCafeSearchText(searchQuery);

  const activeFilterCount = [
    statusFilter !== FILTER_ALL,
    primaryThemeFilter !== FILTER_ALL,
    cafeThemeFilter !== FILTER_ALL,
    seasonFilter !== FILTER_ALL,
  ].filter(Boolean).length;

  const hasActiveSearchOrFilter =
    normalizedSearchQuery.length > 0 ||
    activeFilterCount > 0;

  const filteredEntries = useMemo(() => {
    const next = entries.filter((entry) => {
      const cafe = entry.cafe;

      if (
        statusFilter !== FILTER_ALL &&
        cafe.status !== statusFilter
      ) {
        return false;
      }

      if (
        primaryThemeFilter !== FILTER_ALL &&
        cafe.primaryTheme !== primaryThemeFilter
      ) {
        return false;
      }

      if (
        cafeThemeFilter !== FILTER_ALL &&
        !cafe.themes.some(
          (themeId) => themeId === cafeThemeFilter,
        )
      ) {
        return false;
      }

      if (
        seasonFilter !== FILTER_ALL &&
        !cafe.seasons.some(
          (seasonId) => seasonId === seasonFilter,
        )
      ) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const searchValues = [
        cafe.name,
        entry.address ?? '',
        entry.roadAddress ?? '',
        cafe.memo,
        STATUS_LABELS[cafe.status],
        PLACE_PRIMARY_THEME_MAP[cafe.primaryTheme]?.label ?? '',
        ...cafe.themes.map(
          (themeId) => CAFE_THEME_MAP[themeId]?.label ?? '',
        ),
        ...cafe.seasons.map(
          (seasonId) => PLACE_SEASON_MAP[seasonId]?.label ?? '',
        ),
        ...cafe.tags.map(
          (keywordId) => CAFE_KEYWORD_MAP[keywordId]?.label ?? '',
        ),
      ];

      return searchValues.some((value) =>
        normalizeCafeSearchText(value).includes(
          normalizedSearchQuery,
        ),
      );
    });

    return [...next].sort((first, second) => {
      if (sortOption === 'nameAsc') {
        return first.cafe.name.localeCompare(
          second.cafe.name,
          'ko-KR',
        );
      }

      const firstTime = getSavedCafeSortTime(first);
      const secondTime = getSavedCafeSortTime(second);

      return sortOption === 'updatedAsc'
        ? firstTime - secondTime
        : secondTime - firstTime;
    });
  }, [
    cafeThemeFilter,
    entries,
    normalizedSearchQuery,
    primaryThemeFilter,
    seasonFilter,
    sortOption,
    statusFilter,
  ]);

  const clearSearchAndFilters = () => {
    setSearchQuery('');
    setStatusFilter(FILTER_ALL);
    setPrimaryThemeFilter(FILTER_ALL);
    setCafeThemeFilter(FILTER_ALL);
    setSeasonFilter(FILTER_ALL);
    setSortOption('updatedDesc');
  };

  const retrySync =
    async () => {
      if (
        manualSyncing ||
        syncStatus.phase ===
          'syncing'
      ) {
        return;
      }

      setManualSyncing(true);

      try {
        const next =
          await syncSavedCafeEntries({
            reason:
              'saved-cafe-manual-retry',
          });

        setEntries(next);
      } catch {
        const localEntries =
          await loadSavedCafeEntriesLocalOnly();

        setEntries(localEntries);
      } finally {
        setManualSyncing(false);
      }
    };

  const [
    pendingRemoveEntry,
    setPendingRemoveEntry,
  ] =
    useState<
      SavedCafeLocalEntry |
      null
    >(null);

  const [
    removing,
    setRemoving,
  ] = useState(false);

  const reload =
    useCallback(() => {
      let mounted = true;

      setLoading(true);

      loadSavedCafeEntries()
        .then((next) => {
          if (mounted) {
            setEntries(next);
          }
        })
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });

      return () => {
        mounted = false;
      };
    }, []);

  useFocusEffect(reload);

  const confirmRemove =
    (
      entry:
        SavedCafeLocalEntry,
    ) => {
      if (removing) {
        return;
      }

      setPendingRemoveEntry(
        entry,
      );
    };

  const closeRemoveModal =
    () => {
      if (removing) {
        return;
      }

      setPendingRemoveEntry(
        null,
      );
    };

  const removePendingCafe =
    async () => {
      if (
        !pendingRemoveEntry ||
        removing
      ) {
        return;
      }

      setRemoving(true);

      try {
        const next =
          await removeSavedCafeEntry(
            pendingRemoveEntry
              .cafe
              .placeId,
          );

        setEntries(next);
        setPendingRemoveEntry(
          null,
        );
      }
      finally {
        setRemoving(false);
      }
    };

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
          },
        ]}
      >
        <Pressable
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
            저장한 카페
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
              ? '불러오는 중...'
              : hasActiveSearchOrFilter
                ? `${filteredEntries.length}곳 / 전체 ${entries.length}곳`
                : `${entries.length}곳을 저장했어요.`}
          </Text>
        </View>

        {/* SAVED_CAFE_V37_MAP_BUTTON */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="저장 카페 지도 보기"
          onPress={() =>
            router.push(
              '/place/saved-cafes-map' as never,
            )
          }
          style={({
            pressed,
          }) => [
            styles.addButton,
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
            name="map-outline"
            size={16}
            color={theme.text}
          />
          <Text
            style={[
              styles.addButtonText,
              { color: theme.text },
            ]}
          >
            지도
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push(
              '/place/cafe-save' as never,
            )
          }
          style={({
            pressed,
          }) => [
            styles.addButton,
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
            name="add"
            size={17}
            color={
              theme.text
            }
          />
          <Text
            style={[
              styles.addButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            추가
          </Text>
        </Pressable>
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
            styles.syncCard,
            {
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
          <View
            style={[
              styles.syncIconBox,
              {
                backgroundColor:
                  theme.background,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 11,
              },
            ]}
          >
            {syncStatus.phase ===
            'syncing' ? (
              <ActivityIndicator
                size="small"
                color={
                  theme.text
                }
              />
            ) : (
              <Ionicons
                name={
                  syncPresentation.icon
                }
                size={19}
                color={
                  theme.text
                }
              />
            )}
          </View>

          <View
            style={
              styles.syncTextArea
            }
          >
            <Text
              style={[
                styles.syncTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {
                syncPresentation.title
              }
            </Text>

            <Text
              style={[
                styles.syncDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {
                syncPresentation.description
              }
            </Text>

            {syncStatus.phase ===
              'synced' &&
            lastSyncTime ? (
              <Text
                style={[
                  styles.syncTime,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                마지막 동기화 {lastSyncTime}
              </Text>
            ) : null}
          </View>

          {syncPresentation.canRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 클라우드 동기화 다시 시도"
              disabled={
                manualSyncing
              }
              onPress={() => {
                void retrySync();
              }}
              style={({
                pressed,
              }) => [
                styles.syncRetryButton,
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
                    manualSyncing
                      ? 0.45
                      : pressed
                        ? 0.58
                        : 1,
                },
              ]}
            >
              {manualSyncing ? (
                <ActivityIndicator
                  size="small"
                  color={
                    theme.text
                  }
                />
              ) : (
                <Ionicons
                  name="refresh"
                  size={14}
                  color={
                    theme.text
                  }
                />
              )}

              <Text
                style={[
                  styles.syncRetryText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                다시 시도
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.searchFilterCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 3 : 14,
            },
          ]}
        >
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: theme.background,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 2 : 10,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={17}
              color={theme.subText}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="카페명·주소·테마·태그 검색"
              placeholderTextColor={theme.subText}
              style={[styles.searchInput, { color: theme.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              selectionColor={theme.text}
            />
            {searchQuery ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 검색어 지우기"
                onPress={() => setSearchQuery('')}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={17}
                  color={theme.subText}
                />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.filterToolbar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 필터 열기"
              accessibilityState={{ expanded: filtersExpanded }}
              onPress={() =>
                setFiltersExpanded((value) => !value)
              }
              style={({ pressed }) => [
                styles.filterToggleButton,
                {
                  backgroundColor:
                    activeFilterCount > 0
                      ? theme.button
                      : theme.background,
                  borderColor:
                    activeFilterCount > 0
                      ? theme.strongLine
                      : theme.line,
                  borderRadius: isCityBlack ? 2 : 9,
                  opacity: pressed ? 0.58 : 1,
                },
              ]}
            >
              <Ionicons
                name="options-outline"
                size={15}
                color={
                  activeFilterCount > 0
                    ? theme.buttonText
                    : theme.text
                }
              />
              <Text
                style={[
                  styles.filterToggleText,
                  {
                    color:
                      activeFilterCount > 0
                        ? theme.buttonText
                        : theme.text,
                  },
                ]}
              >
                필터
                {activeFilterCount > 0
                  ? ` ${activeFilterCount}`
                  : ''}
              </Text>
              <Ionicons
                name={
                  filtersExpanded
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                size={13}
                color={
                  activeFilterCount > 0
                    ? theme.buttonText
                    : theme.subText
                }
              />
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sortScroll}
              contentContainerStyle={styles.sortRow}
            >
              {SORT_OPTIONS.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  selected={sortOption === option.id}
                  onPress={() => setSortOption(option.id)}
                  theme={theme}
                  isCityBlack={isCityBlack}
                />
              ))}
            </ScrollView>
          </View>

          {filtersExpanded ? (
            <View style={styles.expandedFilters}>
              <FilterSection title="관계" theme={theme}>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.id}
                    label={option.label}
                    selected={statusFilter === option.id}
                    onPress={() => setStatusFilter(option.id)}
                    theme={theme}
                    isCityBlack={isCityBlack}
                  />
                ))}
              </FilterSection>

              <HorizontalFilterSection
                title="대표 테마"
                theme={theme}
              >
                <FilterChip
                  label="전체"
                  selected={primaryThemeFilter === FILTER_ALL}
                  onPress={() =>
                    setPrimaryThemeFilter(FILTER_ALL)
                  }
                  theme={theme}
                  isCityBlack={isCityBlack}
                />
                {PLACE_PRIMARY_THEMES.map((item) => (
                  <FilterChip
                    key={item.id}
                    label={item.label}
                    selected={primaryThemeFilter === item.id}
                    onPress={() =>
                      setPrimaryThemeFilter(item.id)
                    }
                    theme={theme}
                    isCityBlack={isCityBlack}
                  />
                ))}
              </HorizontalFilterSection>

              <HorizontalFilterSection
                title="카페 테마"
                theme={theme}
              >
                <FilterChip
                  label="전체"
                  selected={cafeThemeFilter === FILTER_ALL}
                  onPress={() =>
                    setCafeThemeFilter(FILTER_ALL)
                  }
                  theme={theme}
                  isCityBlack={isCityBlack}
                />
                {CAFE_CORE_THEMES.map((item) => (
                  <FilterChip
                    key={item.id}
                    label={item.label}
                    selected={cafeThemeFilter === item.id}
                    onPress={() => setCafeThemeFilter(item.id)}
                    theme={theme}
                    isCityBlack={isCityBlack}
                  />
                ))}
              </HorizontalFilterSection>

              <FilterSection title="계절" theme={theme}>
                <FilterChip
                  label="전체"
                  selected={seasonFilter === FILTER_ALL}
                  onPress={() => setSeasonFilter(FILTER_ALL)}
                  theme={theme}
                  isCityBlack={isCityBlack}
                />
                {PLACE_SEASONS.map((item) => (
                  <FilterChip
                    key={item.id}
                    label={item.label}
                    selected={seasonFilter === item.id}
                    onPress={() => setSeasonFilter(item.id)}
                    theme={theme}
                    isCityBlack={isCityBlack}
                  />
                ))}
              </FilterSection>
            </View>
          ) : null}

          <View style={styles.resultSummaryRow}>
            <Text
              style={[
                styles.resultSummaryText,
                { color: theme.subText },
              ]}
            >
              {hasActiveSearchOrFilter
                ? `조건에 맞는 카페 ${filteredEntries.length}곳`
                : `전체 카페 ${entries.length}곳`}
            </Text>

            {hasActiveSearchOrFilter ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 검색과 필터 초기화"
                onPress={clearSearchAndFilters}
                style={({ pressed }) => [
                  styles.resetButton,
                  {
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 2 : 8,
                    opacity: pressed ? 0.55 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={13}
                  color={theme.text}
                />
                <Text
                  style={[
                    styles.resetButtonText,
                    { color: theme.text },
                  ]}
                >
                  초기화
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {!loading &&
        entries.length === 0 ? (
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
                    : 15,
              },
            ]}
          >
            <Ionicons
              name="cafe-outline"
              size={28}
              color={
                theme.subText
              }
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
              아직 저장한 카페가 없어요.
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
              좋아하는 카페나 가보고 싶은 카페를 목적·계절·키워드와 함께 저장해 보세요.
            </Text>
          </View>
        ) : null}

        {!loading &&
        entries.length > 0 &&
        filteredEntries.length === 0 ? (
          <View
            style={[
              styles.noResultCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 3 : 15,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={25}
              color={theme.subText}
            />
            <Text
              style={[
                styles.noResultTitle,
                { color: theme.text },
              ]}
            >
              조건에 맞는 카페가 없어요.
            </Text>
            <Text
              style={[
                styles.noResultDescription,
                { color: theme.subText },
              ]}
            >
              검색어를 바꾸거나 필터를 초기화해 보세요.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 검색과 필터 초기화"
              onPress={clearSearchAndFilters}
              style={({ pressed }) => [
                styles.noResultResetButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 9,
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.noResultResetText,
                  { color: theme.text },
                ]}
              >
                검색·필터 초기화
              </Text>
            </Pressable>
          </View>
        ) : null}

        {filteredEntries.map(
          (entry) => {
            const cafe =
              entry.cafe;

            return (
              <View
                key={
                  cafe.placeId
                }
                style={[
                  styles.cafeCard,
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
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.cardTitleArea
                    }
                  >
                    <Text
                      style={[
                        styles.cafeName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {cafe.name}
                    </Text>

                    <Text
                      style={[
                        styles.cafeAddress,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {entry.roadAddress ||
                        entry.address ||
                        '주소 미입력'}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${cafe.name} 삭제`}
                    onPress={() =>
                      confirmRemove(
                        entry,
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.deleteButton,
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
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={
                        theme.subText
                      }
                    />
                  </Pressable>
                </View>

                <View
                  style={
                    styles.summaryRow
                  }
                >
                  <SummaryBadge
                    label={
                      STATUS_LABELS[
                        cafe.status
                      ]
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />

                  <SummaryBadge
                    label={
                      PLACE_PRIMARY_THEME_MAP[
                        cafe.primaryTheme
                      ].label
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />

                  {cafe.seasons.map(
                    (seasonId) => (
                      <SummaryBadge
                        key={
                          seasonId
                        }
                        label={
                          PLACE_SEASON_MAP[
                            seasonId
                          ].label
                        }
                        theme={theme}
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>

                <Text
                  style={[
                    styles.themeLine,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {cafe.themes
                    .map(
                      (themeId) =>
                        CAFE_THEME_MAP[
                          themeId
                        ].label,
                    )
                    .join(' · ')}
                </Text>

                {cafe.representativeTags.length >
                0 ? (
                  <View
                    style={
                      styles.keywordRow
                    }
                  >
                    {cafe.representativeTags.map(
                      (keywordId) => (
                        <Text
                          key={
                            keywordId
                          }
                          style={[
                            styles.keywordText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          #
                          {
                            CAFE_KEYWORD_MAP[
                              keywordId
                            ].label
                          }
                        </Text>
                      ),
                    )}
                  </View>
                ) : null}

                {cafe.memo ? (
                  <Text
                    style={[
                      styles.memo,
                      {
                        color:
                          theme.text,
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
                    {cafe.memo}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${cafe.name} 상세 보기 및 수정`}
                  onPress={() =>
                    router.push({
                      pathname: '/place/cafe-detail',
                      params: {
                        placeId:
                          cafe.placeId,
                      },
                    } as never)
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
                  <View
                    style={
                      styles.detailButtonTextArea
                    }
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={15}
                      color={
                        theme.text
                      }
                    />
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
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={
                      theme.subText
                    }
                  />
                </Pressable>
              </View>
            );
          },
        )}
      </ScrollView>

      <Modal
        visible={
          pendingRemoveEntry !==
          null
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          closeRemoveModal
        }
      >
        <View
          style={
            styles.removeOverlay
          }
        >
          <View
            style={[
              styles.removeCard,
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
                styles.removeIconBox,
                {
                  backgroundColor:
                    theme.background,
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
                name="trash-outline"
                size={23}
                color={
                  theme.text
                }
              />
            </View>

            <Text
              style={[
                styles.removeTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              저장한 카페 삭제
            </Text>

            <Text
              style={[
                styles.removeMessage,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {pendingRemoveEntry
                ? `"${pendingRemoveEntry.cafe.name}"을(를) 저장 목록에서 삭제할까요?`
                : ''}
            </Text>

            <Text
              style={[
                styles.removeDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              삭제하면 이 기기의 저장 목록에서 사라져요.
            </Text>

            <View
              style={
                styles.removeActions
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 삭제 취소"
                disabled={
                  removing
                }
                onPress={
                  closeRemoveModal
                }
                style={({
                  pressed,
                }) => [
                  styles.removeCancelButton,
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
                      removing
                        ? 0.45
                        : pressed
                          ? 0.58
                          : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.removeCancelText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  취소
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="저장한 카페 삭제"
                disabled={
                  removing
                }
                onPress={() => {
                  void removePendingCafe();
                }}
                style={({
                  pressed,
                }) => [
                  styles.removeConfirmButton,
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
                      removing
                        ? 0.68
                        : pressed
                          ? 0.72
                          : 1,
                  },
                ]}
              >
                {removing ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      theme.buttonText
                    }
                  />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={
                      theme.buttonText
                    }
                  />
                )}

                <Text
                  style={[
                    styles.removeConfirmText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  {removing
                    ? '삭제 중'
                    : '삭제'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useRootTheme>['theme'];
  isCityBlack: boolean;
};

function FilterChip({
  label,
  selected,
  onPress,
  theme,
  isCityBlack,
}: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected
            ? theme.button
            : theme.background,
          borderColor: selected
            ? theme.strongLine
            : theme.line,
          borderRadius: isCityBlack ? 2 : 999,
          opacity: pressed ? 0.58 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.filterChipText,
          {
            color: selected
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

type FilterSectionProps = {
  title: string;
  children: ReactNode;
  theme: ReturnType<typeof useRootTheme>['theme'];
};

function FilterSection({
  title,
  children,
  theme,
}: FilterSectionProps) {
  return (
    <View style={styles.filterSection}>
      <Text
        style={[
          styles.filterSectionTitle,
          { color: theme.subText },
        ]}
      >
        {title}
      </Text>
      <View style={styles.filterChipWrap}>{children}</View>
    </View>
  );
}

function HorizontalFilterSection({
  title,
  children,
  theme,
}: FilterSectionProps) {
  return (
    <View style={styles.filterSection}>
      <Text
        style={[
          styles.filterSectionTitle,
          { color: theme.subText },
        ]}
      >
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalFilterRow}
      >
        {children}
      </ScrollView>
    </View>
  );
}

type SummaryBadgeProps = {
  label: string;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function SummaryBadge({
  label,
  theme,
  isCityBlack,
}: SummaryBadgeProps) {
  return (
    <View
      style={[
        styles.summaryBadge,
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
          styles.summaryBadgeText,
          {
            color:
              theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
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
    },

    addButton: {
      height: 34,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    addButtonText: {
      fontSize: 10,
      fontWeight: '900',
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 10,
    },

    syncCard: {
      minHeight: 76,
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    syncIconBox: {
      width: 42,
      height: 42,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    syncTextArea: {
      flex: 1,
      minWidth: 0,
    },

    syncTitle: {
      fontSize: 11.5,
      fontWeight: '900',
    },

    syncDescription: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    syncTime: {
      marginTop: 3,
      fontSize: 8.5,
      fontWeight: '700',
    },

    syncRetryButton: {
      minHeight: 32,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    syncRetryText: {
      fontSize: 9,
      fontWeight: '900',
    },

    searchFilterCard: {
      padding: 11,
      borderWidth: StyleSheet.hairlineWidth,
      gap: 10,
    },

    searchBox: {
      minHeight: 42,
      paddingHorizontal: 11,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    searchInput: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 8,
      fontSize: 11,
      fontWeight: '700',
    },

    filterToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    filterToggleButton: {
      minHeight: 32,
      paddingHorizontal: 9,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    filterToggleText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    sortScroll: {
      flex: 1,
    },

    sortRow: {
      alignItems: 'center',
      gap: 6,
      paddingRight: 2,
    },

    expandedFilters: {
      gap: 11,
    },

    filterSection: {
      gap: 6,
    },

    filterSectionTitle: {
      fontSize: 9,
      fontWeight: '900',
    },

    filterChipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },

    horizontalFilterRow: {
      gap: 6,
      paddingRight: 6,
    },

    filterChip: {
      minHeight: 29,
      paddingHorizontal: 9,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterChipText: {
      fontSize: 9,
      fontWeight: '800',
    },

    resultSummaryRow: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },

    resultSummaryText: {
      flex: 1,
      minWidth: 0,
      fontSize: 9,
      fontWeight: '800',
    },

    resetButton: {
      minHeight: 28,
      paddingHorizontal: 8,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    resetButtonText: {
      fontSize: 8.5,
      fontWeight: '900',
    },

    noResultCard: {
      minHeight: 190,
      padding: 22,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    noResultTitle: {
      marginTop: 11,
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'center',
    },

    noResultDescription: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
      textAlign: 'center',
    },

    noResultResetButton: {
      minHeight: 34,
      marginTop: 13,
      paddingHorizontal: 11,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    noResultResetText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    emptyCard: {
      minHeight: 210,
      padding: 22,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '900',
    },

    emptyDescription: {
      marginTop: 7,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 16,
      textAlign: 'center',
    },

    cafeCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 8,
    },

    cardTitleArea: {
      flex: 1,
      minWidth: 0,
    },

    cafeName: {
      fontSize: 14,
      fontWeight: '900',
    },

    cafeAddress: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
    },

    deleteButton: {
      width: 30,
      height: 30,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryRow: {
      marginTop: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },

    summaryBadge: {
      minHeight: 25,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryBadgeText: {
      fontSize: 9,
      fontWeight: '800',
    },

    themeLine: {
      marginTop: 9,
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 15,
    },

    keywordRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    keywordText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    memo: {
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 16,
    },

    detailButton: {
      minHeight: 36,
      marginTop: 11,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 8,
    },

    detailButtonTextArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },

    detailButtonText: {
      fontSize: 10,
      fontWeight: '900',
    },

    removeOverlay: {
      flex: 1,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(22, 17, 12, 0.46)',
    },

    removeCard: {
      width: '100%',
      maxWidth: 350,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 16,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
    },

    removeIconBox: {
      width: 50,
      height: 50,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    removeTitle: {
      marginTop: 13,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.35,
      textAlign: 'center',
    },

    removeMessage: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 18,
      textAlign: 'center',
    },

    removeDescription: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
      textAlign: 'center',
    },

    removeActions: {
      width: '100%',
      marginTop: 18,
      flexDirection: 'row',
      gap: 8,
    },

    removeCancelButton: {
      flex: 0.8,
      minHeight: 42,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    removeConfirmButton: {
      flex: 1.2,
      minHeight: 42,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    removeCancelText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    removeConfirmText: {
      fontSize: 10.5,
      fontWeight: '900',
    },
  });
