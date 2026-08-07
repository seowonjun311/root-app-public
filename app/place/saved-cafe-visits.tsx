import { Ionicons } from '@expo/vector-icons';
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
  ActivityIndicator,
  Alert,
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
  loadSavedCafeEntries,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  addSavedCafeVisit,
  deleteSavedCafeVisit,
  getSavedCafeVisitSummary,
  loadSavedCafeVisitState,
  MAX_SAVED_CAFE_VISIT_NOTE_LENGTH,
  pruneSavedCafeVisits,
  SAVED_CAFE_FREQUENT_VISIT_COUNT,
  updateSavedCafeVisit,
  type SavedCafeVisit,
  type SavedCafeVisitState,
} from '../../store/savedCafeVisits';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V42_VISIT_SCREEN

const RELATION_LABELS = {
  wantToGo: '가보고 싶어요',
  favorite: '좋아하는 장소',
  visited: '방문했어요',
} as const;

type VisitFilter =
  | 'all'
  | 'unvisited'
  | 'visited'
  | 'frequent'
  | 'recent';

const VISIT_FILTER_OPTIONS: {
  id: VisitFilter;
  label: string;
}[] = [
  {
    id: 'all',
    label: '전체',
  },
  {
    id: 'unvisited',
    label: '미방문',
  },
  {
    id: 'visited',
    label: '방문',
  },
  {
    id: 'frequent',
    label: '자주 가요',
  },
  {
    id: 'recent',
    label: '최근 30일',
  },
];

function firstParam(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ''
    : value ?? '';
}

function normalizeSearchText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase('ko-KR');
}

function formatDateTime(
  value: string,
) {
  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return '날짜 확인 필요';
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  const hour =
    String(
      date.getHours(),
    ).padStart(2, '0');

  const minute =
    String(
      date.getMinutes(),
    ).padStart(2, '0');

  return `${year}.${month}.${day} ${hour}:${minute}`;
}

function getVisitStatusLabel(
  summary:
    ReturnType<
      typeof getSavedCafeVisitSummary
    >,
) {
  if (
    summary.visitCount === 0
  ) {
    return '아직 미방문';
  }

  if (summary.isFrequent) {
    return '자주 가요';
  }

  return '방문했어요';
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === 'string'
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return '잠시 후 다시 시도해 주세요.';
}

export default function SavedCafeVisitsScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      placeId?:
        | string
        | string[];
    }>();

  const targetPlaceId =
    firstParam(
      params.placeId,
    );

  const [
    entries,
    setEntries,
  ] =
    useState<
      SavedCafeLocalEntry[]
    >([]);

  const [
    visitState,
    setVisitState,
  ] =
    useState<
      SavedCafeVisitState | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState('');

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    visitFilter,
    setVisitFilter,
  ] =
    useState<VisitFilter>('all');

  const [
    editorVisible,
    setEditorVisible,
  ] = useState(false);

  const [
    editorPlaceId,
    setEditorPlaceId,
  ] = useState('');

  const [
    editingVisitId,
    setEditingVisitId,
  ] = useState('');

  const [
    editorRating,
    setEditorRating,
  ] =
    useState<number | null>(null);

  const [
    editorNote,
    setEditorNote,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingVisitId,
    setDeletingVisitId,
  ] = useState('');

  const reload =
    useCallback(() => {
      let mounted = true;

      setLoading(true);
      setLoadError('');

      Promise.all([
        loadSavedCafeEntries(),
        loadSavedCafeVisitState(),
      ])
        .then(
          async ([
            nextEntries,
            nextVisitState,
          ]) => {
            const cleaned =
              await pruneSavedCafeVisits(
                nextEntries.map(
                  (entry) =>
                    entry.cafe.placeId,
                ),
              );

            if (!mounted) {
              return;
            }

            setEntries(
              nextEntries,
            );

            setVisitState(
              cleaned.updatedAt ===
                nextVisitState.updatedAt
                ? nextVisitState
                : cleaned,
            );
          },
        )
        .catch((error) => {
          if (mounted) {
            setLoadError(
              getErrorMessage(error),
            );
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

  const entryMap =
    useMemo(
      () =>
        new Map(
          entries.map(
            (entry) => [
              entry.cafe.placeId,
              entry,
            ],
          ),
        ),
      [entries],
    );

  const targetEntry =
    targetPlaceId
      ? entryMap.get(
          targetPlaceId,
        ) ?? null
      : null;

  const normalizedSearch =
    normalizeSearchText(
      searchQuery,
    );

  const cafeRows =
    useMemo(() => {
      if (!visitState) {
        return [];
      }

      return entries
        .map((entry) => ({
          entry,
          summary:
            getSavedCafeVisitSummary(
              visitState,
              entry.cafe.placeId,
            ),
        }))
        .filter(
          ({
            entry,
            summary,
          }) => {
            if (
              visitFilter ===
                'unvisited' &&
              summary.visitCount > 0
            ) {
              return false;
            }

            if (
              visitFilter ===
                'visited' &&
              summary.visitCount === 0
            ) {
              return false;
            }

            if (
              visitFilter ===
                'frequent' &&
              !summary.isFrequent
            ) {
              return false;
            }

            if (
              visitFilter ===
                'recent' &&
              !summary.isRecent
            ) {
              return false;
            }

            if (!normalizedSearch) {
              return true;
            }

            const values = [
              entry.cafe.name,
              entry.address ?? '',
              entry.roadAddress ?? '',
              RELATION_LABELS[
                entry.cafe.status
              ],
              getVisitStatusLabel(
                summary,
              ),
            ];

            return values.some(
              (value) =>
                normalizeSearchText(
                  value,
                ).includes(
                  normalizedSearch,
                ),
            );
          },
        )
        .sort(
          (
            first,
            second,
          ) => {
            const firstTime =
              first.summary
                .lastVisitedAt
                ? new Date(
                    first.summary
                      .lastVisitedAt,
                  ).getTime()
                : 0;

            const secondTime =
              second.summary
                .lastVisitedAt
                ? new Date(
                    second.summary
                      .lastVisitedAt,
                  ).getTime()
                : 0;

            if (
              firstTime !==
              secondTime
            ) {
              return (
                secondTime -
                firstTime
              );
            }

            return first.entry.cafe.name
              .localeCompare(
                second.entry.cafe.name,
                'ko-KR',
              );
          },
        );
    }, [
      entries,
      normalizedSearch,
      visitFilter,
      visitState,
    ]);

  const targetVisits =
    useMemo(() => {
      if (
        !visitState ||
        !targetPlaceId
      ) {
        return [];
      }

      return visitState.visits
        .filter(
          (visit) =>
            visit.placeId ===
            targetPlaceId,
        )
        .sort(
          (
            first,
            second,
          ) =>
            new Date(
              second.visitedAt,
            ).getTime() -
            new Date(
              first.visitedAt,
            ).getTime(),
        );
    }, [
      targetPlaceId,
      visitState,
    ]);

  const targetSummary =
    useMemo(
      () =>
        visitState &&
        targetPlaceId
          ? getSavedCafeVisitSummary(
              visitState,
              targetPlaceId,
            )
          : null,
      [
        targetPlaceId,
        visitState,
      ],
    );

  const globalSummary =
    useMemo(() => {
      if (!visitState) {
        return {
          totalVisits: 0,
          visitedCafes: 0,
          frequentCafes: 0,
        };
      }

      const visitedPlaceIds =
        new Set(
          visitState.visits.map(
            (visit) =>
              visit.placeId,
          ),
        );

      const frequentCafes =
        entries.filter(
          (entry) =>
            getSavedCafeVisitSummary(
              visitState,
              entry.cafe.placeId,
            ).isFrequent,
        ).length;

      return {
        totalVisits:
          visitState.visits.length,
        visitedCafes:
          visitedPlaceIds.size,
        frequentCafes,
      };
    }, [
      entries,
      visitState,
    ]);

  const resetEditor =
    () => {
      setEditorVisible(false);
      setEditorPlaceId('');
      setEditingVisitId('');
      setEditorRating(null);
      setEditorNote('');
    };

  const closeEditor =
    () => {
      if (saving) {
        return;
      }

      resetEditor();
    };

  const openCreateEditor =
    (placeId: string) => {
      setEditorPlaceId(placeId);
      setEditingVisitId('');
      setEditorRating(null);
      setEditorNote('');
      setEditorVisible(true);
    };

  const openEditEditor =
    (visit: SavedCafeVisit) => {
      setEditorPlaceId(
        visit.placeId,
      );
      setEditingVisitId(
        visit.id,
      );
      setEditorRating(
        visit.rating,
      );
      setEditorNote(
        visit.note,
      );
      setEditorVisible(true);
    };

  const saveVisit =
    async () => {
      if (
        !editorPlaceId ||
        saving
      ) {
        return;
      }

      setSaving(true);

      try {
        const next =
          editingVisitId
            ? await updateSavedCafeVisit(
                editingVisitId,
                {
                  rating:
                    editorRating,
                  note:
                    editorNote,
                },
              )
            : await addSavedCafeVisit({
                placeId:
                  editorPlaceId,
                rating:
                  editorRating,
                note:
                  editorNote,
              });

        setVisitState(next);
        resetEditor();
      } catch (error) {
        Alert.alert(
          '방문 기록 저장 실패',
          getErrorMessage(error),
        );
      } finally {
        setSaving(false);
      }
    };

  const confirmDeleteVisit =
    (visit: SavedCafeVisit) => {
      if (deletingVisitId) {
        return;
      }

      Alert.alert(
        '방문 기록 삭제',
        '이 방문 기록을 삭제할까요?',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              setDeletingVisitId(
                visit.id,
              );

              void deleteSavedCafeVisit(
                visit.id,
              )
                .then(
                  setVisitState,
                )
                .catch((error) => {
                  Alert.alert(
                    '삭제 실패',
                    getErrorMessage(
                      error,
                    ),
                  );
                })
                .finally(() => {
                  setDeletingVisitId('');
                });
            },
          },
        ],
      );
    };

  const editorCafe =
    editorPlaceId
      ? entryMap.get(
          editorPlaceId,
        ) ?? null
      : null;

  const pageTitle =
    targetEntry
      ? targetEntry.cafe.name
      : '카페 방문 기록';

  const pageSubtitle =
    targetEntry
      ? `${targetSummary?.visitCount ?? 0}번 방문했어요.`
      : `${globalSummary.totalVisits}개의 방문 기록이 있어요.`;

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
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
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
            numberOfLines={1}
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {pageTitle}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.subtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {pageSubtitle}
          </Text>
        </View>

        {targetEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${targetEntry.cafe.name} 오늘 방문 기록`}
            onPress={() =>
              openCreateEditor(
                targetEntry
                  .cafe
                  .placeId,
              )
            }
            style={({ pressed }) => [
              styles.addHeaderButton,
              {
                backgroundColor:
                  theme.button,
                borderColor:
                  theme.strongLine,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 9,
                opacity:
                  pressed
                    ? 0.72
                    : 1,
              },
            ]}
          >
            <Ionicons
              name="add"
              size={16}
              color={
                theme.buttonText
              }
            />
            <Text
              style={[
                styles.addHeaderText,
                {
                  color:
                    theme.buttonText,
                },
              ]}
            >
              오늘
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View
          style={
            styles.centerArea
          }
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
            방문 기록을 불러오는 중이에요.
          </Text>
        </View>
      ) : loadError ? (
        <View
          style={
            styles.centerArea
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color={theme.subText}
          />
          <Text
            style={[
              styles.messageTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            방문 기록을 불러오지 못했어요.
          </Text>
          <Text
            style={[
              styles.messageDescription,
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
            onPress={() => {
              const cleanup =
                reload();

              return cleanup;
            }}
            style={({ pressed }) => [
              styles.messageButton,
              {
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
            <Ionicons
              name="refresh-outline"
              size={15}
              color={theme.text}
            />
            <Text
              style={[
                styles.messageButtonText,
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
      ) : targetPlaceId ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + 30,
            },
          ]}
        >
          {!targetEntry ||
          !targetSummary ? (
            <MessageCard
              icon="cafe-outline"
              title="저장한 카페를 찾을 수 없어요."
              description="카페가 삭제됐거나 저장 목록이 변경됐어요."
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
          ) : (
            <>
              <View
                style={[
                  styles.cafeSummaryCard,
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
                    styles.cafeSummaryHeader
                  }
                >
                  <View
                    style={[
                      styles.cafeIconBox,
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
                    <Ionicons
                      name="cafe-outline"
                      size={21}
                      color={theme.text}
                    />
                  </View>
                  <View
                    style={
                      styles.cafeTextArea
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
                      {
                        targetEntry
                          .cafe
                          .name
                      }
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
                      {targetEntry
                        .roadAddress ||
                        targetEntry
                          .address ||
                        '주소 미입력'}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.summaryGrid
                  }
                >
                  <SummaryMetric
                    label="총 방문"
                    value={`${targetSummary.visitCount}회`}
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                  <SummaryMetric
                    label="최근 방문"
                    value={
                      targetSummary
                        .lastVisitedAt
                        ? formatDateTime(
                            targetSummary
                              .lastVisitedAt,
                          ).slice(
                            0,
                            10,
                          )
                        : '없음'
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                  <SummaryMetric
                    label="평균 별점"
                    value={
                      targetSummary
                        .averageRating
                        ? `${targetSummary.averageRating}점`
                        : '미입력'
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="오늘 방문 기록 추가"
                  onPress={() =>
                    openCreateEditor(
                      targetPlaceId,
                    )
                  }
                  style={({ pressed }) => [
                    styles.primaryActionButton,
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
                        pressed
                          ? 0.72
                          : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={17}
                    color={
                      theme.buttonText
                    }
                  />
                  <Text
                    style={[
                      styles.primaryActionText,
                      {
                        color:
                          theme.buttonText,
                      },
                    ]}
                  >
                    오늘 방문 기록하기
                  </Text>
                </Pressable>
              </View>

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
                  방문 타임라인
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
                  {targetVisits.length}개
                </Text>
              </View>

              {targetVisits.length ===
              0 ? (
                <MessageCard
                  icon="time-outline"
                  title="아직 방문 기록이 없어요."
                  description="방문한 날마다 기록하면 재방문 횟수와 최근 방문일을 확인할 수 있어요."
                  theme={theme}
                  isCityBlack={
                    isCityBlack
                  }
                />
              ) : (
                targetVisits.map(
                  (visit) => (
                    <VisitRecordCard
                      key={
                        visit.id
                      }
                      visit={
                        visit
                      }
                      deleting={
                        deletingVisitId ===
                        visit.id
                      }
                      onEdit={() =>
                        openEditEditor(
                          visit,
                        )
                      }
                      onDelete={() =>
                        confirmDeleteVisit(
                          visit,
                        )
                      }
                      theme={theme}
                      isCityBlack={
                        isCityBlack
                      }
                    />
                  ),
                )
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + 30,
            },
          ]}
        >
          <View
            style={
              styles.globalSummaryRow
            }
          >
            <SummaryMetric
              label="총 방문"
              value={`${globalSummary.totalVisits}회`}
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
            <SummaryMetric
              label="방문 카페"
              value={`${globalSummary.visitedCafes}곳`}
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
            <SummaryMetric
              label="자주 가는 곳"
              value={`${globalSummary.frequentCafes}곳`}
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
          </View>

          <View
            style={[
              styles.searchFilterCard,
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
                styles.searchBox,
                {
                  backgroundColor:
                    theme.background,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={theme.subText}
              />
              <TextInput
                value={searchQuery}
                onChangeText={
                  setSearchQuery
                }
                placeholder="카페명·주소 검색"
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
                selectionColor={
                  theme.text
                }
              />
              {searchQuery ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="검색어 지우기"
                  hitSlop={8}
                  onPress={() =>
                    setSearchQuery('')
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={17}
                    color={
                      theme.subText
                    }
                  />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.filterRow
              }
            >
              {VISIT_FILTER_OPTIONS.map(
                (option) => (
                  <FilterChip
                    key={
                      option.id
                    }
                    label={
                      option.label
                    }
                    selected={
                      visitFilter ===
                      option.id
                    }
                    onPress={() =>
                      setVisitFilter(
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
                styles.resultText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              조건에 맞는 카페 {cafeRows.length}곳
            </Text>
          </View>

          {entries.length === 0 ? (
            <MessageCard
              icon="cafe-outline"
              title="먼저 카페를 저장해 주세요."
              description="저장한 카페를 기준으로 방문 횟수와 재방문 기록을 관리해요."
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
          ) : cafeRows.length ===
            0 ? (
            <MessageCard
              icon="search-outline"
              title="조건에 맞는 카페가 없어요."
              description="검색어나 방문 필터를 바꿔 보세요."
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
          ) : (
            cafeRows.map(
              ({
                entry,
                summary,
              }) => (
                <View
                  key={
                    entry.cafe
                      .placeId
                  }
                  style={[
                    styles.cafeRowCard,
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
                    style={
                      styles.cafeRowHeader
                    }
                  >
                    <View
                      style={
                        styles.cafeTextArea
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
                        {
                          entry.cafe
                            .name
                        }
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
                        {entry
                          .roadAddress ||
                          entry.address ||
                          '주소 미입력'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
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
                          styles.statusBadgeText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {getVisitStatusLabel(
                          summary,
                        )}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.cafeMetaRow
                    }
                  >
                    <Text
                      style={[
                        styles.metaText,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {
                        RELATION_LABELS[
                          entry.cafe
                            .status
                        ]
                      }
                    </Text>
                    <Text
                      style={[
                        styles.metaText,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      방문 {summary.visitCount}회
                    </Text>
                    {summary.averageRating ? (
                      <Text
                        style={[
                          styles.metaText,
                          {
                            color:
                              theme.subText,
                          },
                        ]}
                      >
                        평균 {summary.averageRating}점
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.lastVisitText,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {summary
                      .lastVisitedAt
                      ? `최근 방문 ${formatDateTime(summary.lastVisitedAt)}`
                      : '아직 실제 방문 기록이 없어요.'}
                  </Text>

                  <View
                    style={
                      styles.cardActions
                    }
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.cafe.name} 오늘 방문 기록`}
                      onPress={() =>
                        openCreateEditor(
                          entry.cafe
                            .placeId,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.cardPrimaryButton,
                        {
                          backgroundColor:
                            theme.button,
                          borderColor:
                            theme.strongLine,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 9,
                          opacity:
                            pressed
                              ? 0.72
                              : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={15}
                        color={
                          theme.buttonText
                        }
                      />
                      <Text
                        style={[
                          styles.cardPrimaryText,
                          {
                            color:
                              theme.buttonText,
                          },
                        ]}
                      >
                        오늘 방문
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.cafe.name} 방문 기록 보기`}
                      onPress={() =>
                        router.push({
                          pathname:
                            '/place/saved-cafe-visits',
                          params: {
                            placeId:
                              entry.cafe
                                .placeId,
                          },
                        } as never)
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.cardSecondaryButton,
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
                          styles.cardSecondaryText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        기록 보기
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
                </View>
              ),
            )
          )}
        </ScrollView>
      )}

      <Modal
        visible={
          editorVisible
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          closeEditor
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 18,
                paddingBottom:
                  insets.bottom + 16,
              },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View
                  style={
                    styles.modalTitleArea
                  }
                >
                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {editingVisitId
                      ? '방문 기록 수정'
                      : '오늘 방문 기록'}
                  </Text>
                  <Text
                    style={[
                      styles.modalDescription,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {editorCafe
                      ?.cafe
                      .name ??
                      '저장한 카페'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="방문 기록 창 닫기"
                  disabled={saving}
                  hitSlop={8}
                  onPress={
                    closeEditor
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={
                      theme.text
                    }
                  />
                </Pressable>
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                별점 · 선택 사항
              </Text>

              <View
                style={
                  styles.ratingRow
                }
              >
                {[
                  1,
                  2,
                  3,
                  4,
                  5,
                ].map((rating) => {
                  const selected =
                    editorRating !==
                      null &&
                    rating <=
                      editorRating;

                  return (
                    <Pressable
                      key={rating}
                      accessibilityRole="button"
                      accessibilityLabel={`${rating}점`}
                      onPress={() =>
                        setEditorRating(
                          editorRating ===
                            rating
                            ? null
                            : rating,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.ratingButton,
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
                              : 9,
                          opacity:
                            pressed
                              ? 0.6
                              : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selected
                            ? 'star'
                            : 'star-outline'
                        }
                        size={18}
                        color={
                          selected
                            ? theme.buttonText
                            : theme.text
                        }
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                한 줄 기록 · 선택 사항
              </Text>

              <TextInput
                value={editorNote}
                onChangeText={
                  setEditorNote
                }
                placeholder="분위기, 메뉴, 다시 오고 싶은 이유를 적어 보세요."
                placeholderTextColor={
                  theme.subText
                }
                maxLength={
                  MAX_SAVED_CAFE_VISIT_NOTE_LENGTH
                }
                multiline
                textAlignVertical="top"
                selectionColor={
                  theme.text
                }
                style={[
                  styles.noteInput,
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
                        : 10,
                  },
                ]}
              />

              <Text
                style={[
                  styles.noteCounter,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {editorNote.length}/{MAX_SAVED_CAFE_VISIT_NOTE_LENGTH}
              </Text>

              <View
                style={
                  styles.modalActions
                }
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={
                    closeEditor
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.modalCancelButton,
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
                        saving
                          ? 0.45
                          : pressed
                            ? 0.58
                            : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalCancelText,
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
                  disabled={saving}
                  onPress={() => {
                    void saveVisit();
                  }}
                  style={({
                    pressed,
                  }) => [
                    styles.modalSaveButton,
                    {
                      backgroundColor:
                        theme.button,
                      borderColor:
                        theme.strongLine,
                      borderRadius:
                        isCityBlack
                          ? 2
                          : 9,
                      opacity:
                        saving
                          ? 0.68
                          : pressed
                            ? 0.72
                            : 1,
                    },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        theme.buttonText
                      }
                    />
                  ) : (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={
                        theme.buttonText
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.modalSaveText,
                      {
                        color:
                          theme.buttonText,
                      },
                    ]}
                  >
                    {saving
                      ? '저장 중'
                      : editingVisitId
                        ? '수정 저장'
                        : '방문 저장'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type SummaryMetricProps = {
  label: string;
  value: string;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function SummaryMetric({
  label,
  value,
  theme,
  isCityBlack,
}: SummaryMetricProps) {
  return (
    <View
      style={[
        styles.summaryMetric,
        {
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
    >
      <Text
        style={[
          styles.summaryMetricLabel,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.summaryMetricValue,
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

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
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
              ? 0.6
              : 1,
        },
      ]}
    >
      <Text
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

type VisitRecordCardProps = {
  visit: SavedCafeVisit;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function VisitRecordCard({
  visit,
  deleting,
  onEdit,
  onDelete,
  theme,
  isCityBlack,
}: VisitRecordCardProps) {
  return (
    <View
      style={[
        styles.visitCard,
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
        style={
          styles.visitHeader
        }
      >
        <View
          style={
            styles.visitTitleArea
          }
        >
          <Text
            style={[
              styles.visitDate,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {formatDateTime(
              visit.visitedAt,
            )}
          </Text>
          <Text
            style={[
              styles.visitSubtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            실제 방문 기록
          </Text>
        </View>

        <View
          style={
            styles.visitActions
          }
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="방문 기록 수정"
            disabled={deleting}
            onPress={onEdit}
            style={({ pressed }) => [
              styles.iconActionButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 8,
                opacity:
                  deleting
                    ? 0.42
                    : pressed
                      ? 0.58
                      : 1,
              },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color={theme.text}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="방문 기록 삭제"
            disabled={deleting}
            onPress={onDelete}
            style={({ pressed }) => [
              styles.iconActionButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 8,
                opacity:
                  deleting
                    ? 0.42
                    : pressed
                      ? 0.58
                      : 1,
              },
            ]}
          >
            {deleting ? (
              <ActivityIndicator
                size="small"
                color={theme.text}
              />
            ) : (
              <Ionicons
                name="trash-outline"
                size={15}
                color={theme.text}
              />
            )}
          </Pressable>
        </View>
      </View>

      {visit.rating ? (
        <View
          style={
            styles.visitRatingRow
          }
        >
          {[
            1,
            2,
            3,
            4,
            5,
          ].map((rating) => (
            <Ionicons
              key={rating}
              name={
                rating <=
                visit.rating!
                  ? 'star'
                  : 'star-outline'
              }
              size={14}
              color={theme.text}
            />
          ))}
          <Text
            style={[
              styles.visitRatingText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {visit.rating}점
          </Text>
        </View>
      ) : null}

      {visit.note ? (
        <Text
          style={[
            styles.visitNote,
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
          {visit.note}
        </Text>
      ) : (
        <Text
          style={[
            styles.visitNoNote,
            {
              color:
                theme.subText,
            },
          ]}
        >
          메모 없이 방문만 기록했어요.
        </Text>
      )}
    </View>
  );
}

type MessageCardProps = {
  icon:
    | 'cafe-outline'
    | 'time-outline'
    | 'search-outline';
  title: string;
  description: string;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function MessageCard({
  icon,
  title,
  description,
  theme,
  isCityBlack,
}: MessageCardProps) {
  return (
    <View
      style={[
        styles.messageCard,
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
      <Ionicons
        name={icon}
        size={28}
        color={theme.subText}
      />
      <Text
        style={[
          styles.messageTitle,
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
          styles.messageDescription,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {description}
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
      zIndex: 2,
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
      fontSize: 18.5,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
    },

    addHeaderButton: {
      minHeight: 34,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },

    addHeaderText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    centerArea: {
      flex: 1,
      padding: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    centerDescription: {
      fontSize: 10,
      fontWeight: '700',
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 10,
    },

    globalSummaryRow: {
      flexDirection: 'row',
      gap: 7,
    },

    summaryMetric: {
      flex: 1,
      minWidth: 0,
      minHeight: 64,
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryMetricLabel: {
      fontSize: 8.3,
      fontWeight: '800',
    },

    summaryMetricValue: {
      marginTop: 5,
      fontSize: 13,
      fontWeight: '900',
    },

    searchFilterCard: {
      padding: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
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

    filterRow: {
      paddingTop: 9,
      gap: 6,
    },

    filterChip: {
      minHeight: 29,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    filterChipText: {
      fontSize: 8.8,
      fontWeight: '900',
    },

    resultText: {
      marginTop: 8,
      fontSize: 8.7,
      fontWeight: '800',
    },

    cafeRowCard: {
      padding: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    cafeRowHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },

    cafeTextArea: {
      flex: 1,
      minWidth: 0,
    },

    cafeName: {
      fontSize: 13.5,
      fontWeight: '900',
    },

    cafeAddress: {
      marginTop: 4,
      fontSize: 9,
      fontWeight: '700',
    },

    statusBadge: {
      minHeight: 25,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    statusBadgeText: {
      fontSize: 8.5,
      fontWeight: '900',
    },

    cafeMetaRow: {
      marginTop: 9,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },

    metaText: {
      fontSize: 8.8,
      fontWeight: '800',
    },

    lastVisitText: {
      marginTop: 8,
      fontSize: 9,
      fontWeight: '700',
    },

    cardActions: {
      marginTop: 11,
      flexDirection: 'row',
      gap: 7,
    },

    cardPrimaryButton: {
      flex: 1,
      minHeight: 36,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    cardPrimaryText: {
      fontSize: 9.3,
      fontWeight: '900',
    },

    cardSecondaryButton: {
      flex: 1,
      minHeight: 36,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 4,
    },

    cardSecondaryText: {
      fontSize: 9.3,
      fontWeight: '900',
    },

    cafeSummaryCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    cafeSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    cafeIconBox: {
      width: 44,
      height: 44,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryGrid: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 7,
    },

    primaryActionButton: {
      minHeight: 40,
      marginTop: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    primaryActionText: {
      fontSize: 10,
      fontWeight: '900',
    },

    sectionHeader: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    sectionTitle: {
      fontSize: 12,
      fontWeight: '900',
    },

    sectionCount: {
      fontSize: 9,
      fontWeight: '800',
    },

    visitCard: {
      padding: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    visitHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },

    visitTitleArea: {
      flex: 1,
      minWidth: 0,
    },

    visitDate: {
      fontSize: 11.5,
      fontWeight: '900',
    },

    visitSubtitle: {
      marginTop: 3,
      fontSize: 8.5,
      fontWeight: '700',
    },

    visitActions: {
      flexDirection: 'row',
      gap: 6,
    },

    iconActionButton: {
      width: 32,
      height: 32,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    visitRatingRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    visitRatingText: {
      marginLeft: 4,
      fontSize: 8.8,
      fontWeight: '800',
    },

    visitNote: {
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 9.8,
      fontWeight: '700',
      lineHeight: 15,
    },

    visitNoNote: {
      marginTop: 9,
      fontSize: 8.8,
      fontWeight: '700',
    },

    messageCard: {
      minHeight: 160,
      padding: 20,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    messageTitle: {
      marginTop: 10,
      fontSize: 13.5,
      fontWeight: '900',
      textAlign: 'center',
    },

    messageDescription: {
      marginTop: 6,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 15,
      textAlign: 'center',
    },

    messageButton: {
      minHeight: 36,
      marginTop: 12,
      paddingHorizontal: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    messageButtonText: {
      fontSize: 9.3,
      fontWeight: '900',
    },

    modalOverlay: {
      flex: 1,
      paddingHorizontal: 18,
      backgroundColor:
        'rgba(0,0,0,0.38)',
      justifyContent: 'center',
    },

    modalCard: {
      maxHeight: '90%',
      paddingHorizontal: 16,
      paddingTop: 16,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    modalTitleArea: {
      flex: 1,
      minWidth: 0,
    },

    modalTitle: {
      fontSize: 16,
      fontWeight: '900',
    },

    modalDescription: {
      marginTop: 4,
      fontSize: 9.5,
      fontWeight: '700',
    },

    fieldLabel: {
      marginTop: 16,
      marginBottom: 7,
      fontSize: 9,
      fontWeight: '900',
    },

    ratingRow: {
      flexDirection: 'row',
      gap: 7,
    },

    ratingButton: {
      width: 42,
      height: 40,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    noteInput: {
      minHeight: 96,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 16,
    },

    noteCounter: {
      marginTop: 5,
      fontSize: 8.5,
      fontWeight: '700',
      textAlign: 'right',
    },

    modalActions: {
      marginTop: 16,
      flexDirection: 'row',
      gap: 8,
    },

    modalCancelButton: {
      flex: 0.8,
      minHeight: 40,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalCancelText: {
      fontSize: 10,
      fontWeight: '900',
    },

    modalSaveButton: {
      flex: 1.2,
      minHeight: 40,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    modalSaveText: {
      fontSize: 10,
      fontWeight: '900',
    },
  });
