import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  type ComponentProps,
  useCallback,
  useMemo,
  useState,
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

import {
  PLACE_PRIMARY_THEME_MAP,
} from '../../store/placeThemeCatalog';
import {
  loadSavedCafeEntries,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  getSavedCafeVisitSummary,
  loadSavedCafeVisitState,
  SAVED_CAFE_FREQUENT_VISIT_COUNT,
  type SavedCafeVisit,
  type SavedCafeVisitCompanion,
  type SavedCafeVisitPurpose,
  type SavedCafeVisitRevisitIntent,
  type SavedCafeVisitState,
} from '../../store/savedCafeVisits';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V43_VISIT_INSIGHTS_SCREEN
// SAVED_CAFE_V47_VISIT_PREFERENCE_INSIGHTS

const RECENT_DAYS = 30;
const WEEKDAY_LABELS = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
] as const;

function parseTime(value: string) {
  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function formatDate(value: string) {
  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return '날짜 확인 필요';
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, '0'),
    String(
      date.getDate(),
    ).padStart(2, '0'),
  ].join('.');
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
    const message =
      (
        error as {
          message: string;
        }
      ).message.trim();

    if (message) {
      return message;
    }
  }

  return '잠시 후 다시 시도해 주세요.';
}

type PrimaryThemeId =
  SavedCafeLocalEntry['cafe']['primaryTheme'];

function getPrimaryThemeLabel(
  themeId: PrimaryThemeId,
) {
  return (
    PLACE_PRIMARY_THEME_MAP[
      themeId
    ]?.label ??
    themeId
  );
}

type CafeInsightRow = {
  entry: SavedCafeLocalEntry;
  visitCount: number;
  lastVisitedAt: string | null;
  averageRating: number | null;
  isFrequent: boolean;
};

type ThemeInsightRow = {
  themeId: PrimaryThemeId;
  label: string;
  visitCount: number;
  cafeCount: number;
};

type RecentVisitRow = {
  visit: SavedCafeVisit;
  entry: SavedCafeLocalEntry;
};

type VisitCategoryRow = {
  id: string;
  label: string;
  count: number;
  percentage: number;
};

type CafePreferenceRow = {
  entry: SavedCafeLocalEntry;
  visitCount: number;
  lastVisitedAt: string;
};

const PURPOSE_OPTIONS: ReadonlyArray<{
  id: SavedCafeVisitPurpose;
  label: string;
}> = [
  { id: 'study', label: '공부' },
  { id: 'work', label: '업무·노트북' },
  { id: 'date', label: '데이트' },
  { id: 'conversation', label: '대화·모임' },
  { id: 'dessert', label: '커피·디저트' },
  { id: 'rest', label: '휴식' },
  { id: 'other', label: '기타' },
];

const COMPANION_OPTIONS: ReadonlyArray<{
  id: SavedCafeVisitCompanion;
  label: string;
}> = [
  { id: 'alone', label: '혼자' },
  { id: 'friend', label: '친구' },
  { id: 'partner', label: '연인' },
  { id: 'family', label: '가족' },
  { id: 'coworker', label: '동료' },
  { id: 'other', label: '기타' },
];

const REVISIT_OPTIONS: ReadonlyArray<{
  id: SavedCafeVisitRevisitIntent;
  label: string;
}> = [
  { id: 'yes', label: '또 가고 싶어요' },
  { id: 'maybe', label: '생각해 볼래요' },
  { id: 'no', label: '다시 가진 않을래요' },
];

function buildVisitCategoryRows<T extends string>(
  visits: SavedCafeVisit[],
  options: ReadonlyArray<{
    id: T;
    label: string;
  }>,
  getValue: (
    visit: SavedCafeVisit,
  ) => T | null,
): VisitCategoryRow[] {
  const trackedCount =
    visits.reduce(
      (count, visit) =>
        getValue(visit)
          ? count + 1
          : count,
      0,
    );

  if (trackedCount === 0) {
    return [];
  }

  return options
    .map((option) => {
      const count =
        visits.reduce(
          (total, visit) =>
            getValue(visit) ===
            option.id
              ? total + 1
              : total,
          0,
        );

      return {
        id: option.id,
        label: option.label,
        count,
        percentage:
          Math.round(
            (count /
              trackedCount) *
              100,
          ),
      };
    })
    .filter(
      (row) =>
        row.count > 0,
    )
    .sort(
      (first, second) =>
        second.count -
        first.count,
    );
}

function buildCafePreferenceRows(
  visits: SavedCafeVisit[],
  entryMap: Map<
    string,
    SavedCafeLocalEntry
  >,
): CafePreferenceRow[] {
  const map =
    new Map<
      string,
      {
        visitCount: number;
        lastVisitedAt: string;
      }
    >();

  visits.forEach((visit) => {
    const current =
      map.get(
        visit.placeId,
      );

    if (!current) {
      map.set(
        visit.placeId,
        {
          visitCount: 1,
          lastVisitedAt:
            visit.visitedAt,
        },
      );
      return;
    }

    current.visitCount += 1;

    if (
      parseTime(
        visit.visitedAt,
      ) >
      parseTime(
        current.lastVisitedAt,
      )
    ) {
      current.lastVisitedAt =
        visit.visitedAt;
    }
  });

  return Array.from(
    map.entries(),
  )
    .map(([
      placeId,
      value,
    ]) => {
      const entry =
        entryMap.get(
          placeId,
        );

      return entry
        ? {
            entry,
            visitCount:
              value.visitCount,
            lastVisitedAt:
              value.lastVisitedAt,
          }
        : null;
    })
    .filter(
      (
        row,
      ): row is CafePreferenceRow =>
        Boolean(row),
    )
    .sort((first, second) => {
      if (
        second.visitCount !==
        first.visitCount
      ) {
        return (
          second.visitCount -
          first.visitCount
        );
      }

      return (
        parseTime(
          second.lastVisitedAt,
        ) -
        parseTime(
          first.lastVisitedAt,
        )
      );
    });
}

export default function SavedCafeVisitInsightsScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    entries,
    setEntries,
  ] = useState<
    SavedCafeLocalEntry[]
  >([]);

  const [
    visitState,
    setVisitState,
  ] = useState<
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
    reloadVersion,
    setReloadVersion,
  ] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setLoadError('');

      void Promise.all([
        loadSavedCafeEntries(),
        loadSavedCafeVisitState(),
      ])
        .then(([
          nextEntries,
          nextVisitState,
        ]) => {
          if (!active) {
            return;
          }

          setEntries(nextEntries);
          setVisitState(
            nextVisitState,
          );
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE VISIT INSIGHTS LOAD ERROR',
            error,
          );

          if (active) {
            setLoadError(
              getErrorMessage(
                error,
              ),
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

  const validVisits =
    useMemo(
      () =>
        (visitState?.visits ?? [])
          .filter((visit) =>
            entryMap.has(
              visit.placeId,
            ),
          )
          .sort(
            (first, second) =>
              parseTime(
                second.visitedAt,
              ) -
              parseTime(
                first.visitedAt,
              ),
          ),
      [
        entryMap,
        visitState,
      ],
    );

  const cafeRows =
    useMemo<CafeInsightRow[]>(() => {
      if (!visitState) {
        return [];
      }

      return entries
        .map((entry) => {
          const summary =
            getSavedCafeVisitSummary(
              visitState,
              entry.cafe.placeId,
            );

          return {
            entry,
            visitCount:
              summary.visitCount,
            lastVisitedAt:
              summary.lastVisitedAt,
            averageRating:
              summary.averageRating,
            isFrequent:
              summary.isFrequent,
          };
        })
        .filter(
          (row) =>
            row.visitCount > 0,
        );
    }, [entries, visitState]);

  const now = Date.now();

  const recentThreshold =
    now -
    RECENT_DAYS *
      24 *
      60 *
      60 *
      1000;

  const currentDate =
    new Date(now);

  const currentYear =
    currentDate.getFullYear();

  const currentMonth =
    currentDate.getMonth();

  const ratedVisits =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            typeof visit.rating ===
            'number',
        ),
      [validVisits],
    );

  const averageRating =
    useMemo(() => {
      if (
        ratedVisits.length === 0
      ) {
        return null;
      }

      const total =
        ratedVisits.reduce(
          (sum, visit) =>
            sum +
            (visit.rating ?? 0),
          0,
        );

      return (
        Math.round(
          (total /
            ratedVisits.length) *
            10,
        ) / 10
      );
    }, [ratedVisits]);

  const recentVisitCount =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            parseTime(
              visit.visitedAt,
            ) >= recentThreshold,
        ).length,
      [
        recentThreshold,
        validVisits,
      ],
    );

  const monthVisitCount =
    useMemo(
      () =>
        validVisits.filter(
          (visit) => {
            const date =
              new Date(
                visit.visitedAt,
              );

            return (
              Number.isFinite(
                date.getTime(),
              ) &&
              date.getFullYear() ===
                currentYear &&
              date.getMonth() ===
                currentMonth
            );
          },
        ).length,
      [
        currentMonth,
        currentYear,
        validVisits,
      ],
    );

  const frequentCafeCount =
    useMemo(
      () =>
        cafeRows.filter(
          (row) =>
            row.isFrequent,
        ).length,
      [cafeRows],
    );

  const topVisited =
    useMemo(
      () =>
        [...cafeRows]
          .sort((first, second) => {
            if (
              second.visitCount !==
              first.visitCount
            ) {
              return (
                second.visitCount -
                first.visitCount
              );
            }

            return (
              parseTime(
                second.lastVisitedAt ??
                  '',
              ) -
              parseTime(
                first.lastVisitedAt ??
                  '',
              )
            );
          })
          .slice(0, 5),
      [cafeRows],
    );

  const topRated =
    useMemo(
      () =>
        cafeRows
          .filter(
            (
              row,
            ): row is CafeInsightRow & {
              averageRating: number;
            } =>
              typeof row.averageRating ===
              'number',
          )
          .sort((first, second) => {
            if (
              second.averageRating !==
              first.averageRating
            ) {
              return (
                second.averageRating -
                first.averageRating
              );
            }

            return (
              second.visitCount -
              first.visitCount
            );
          })
          .slice(0, 5),
      [cafeRows],
    );

  const themeRows =
    useMemo<ThemeInsightRow[]>(() => {
      const map =
        new Map<
          PrimaryThemeId,
          {
            visitCount: number;
            cafeIds: Set<string>;
          }
        >();

      validVisits.forEach(
        (visit) => {
          const entry =
            entryMap.get(
              visit.placeId,
            );

          if (!entry) {
            return;
          }

          const themeId =
            entry.cafe.primaryTheme;

          const current =
            map.get(themeId) ?? {
              visitCount: 0,
              cafeIds:
                new Set<string>(),
            };

          current.visitCount += 1;
          current.cafeIds.add(
            entry.cafe.placeId,
          );

          map.set(
            themeId,
            current,
          );
        },
      );

      return Array.from(
        map.entries(),
      )
        .map(([
          themeId,
          value,
        ]) => ({
          themeId,
          label:
            getPrimaryThemeLabel(
              themeId,
            ),
          visitCount:
            value.visitCount,
          cafeCount:
            value.cafeIds.size,
        }))
        .sort(
          (first, second) =>
            second.visitCount -
            first.visitCount,
        )
        .slice(0, 5);
    }, [entryMap, validVisits]);

  const weekdayCounts =
    useMemo(() => {
      const counts =
        Array.from(
          { length: 7 },
          () => 0,
        );

      validVisits.forEach(
        (visit) => {
          const date =
            new Date(
              visit.visitedAt,
            );

          if (
            Number.isFinite(
              date.getTime(),
            )
          ) {
            counts[
              date.getDay()
            ] += 1;
          }
        },
      );

      return counts;
    }, [validVisits]);

  const topWeekdayIndex =
    useMemo(() => {
      if (
        validVisits.length === 0
      ) {
        return -1;
      }

      let bestIndex = 0;

      for (
        let index = 1;
        index < weekdayCounts.length;
        index += 1
      ) {
        if (
          weekdayCounts[index] >
          weekdayCounts[bestIndex]
        ) {
          bestIndex = index;
        }
      }

      return bestIndex;
    }, [
      validVisits.length,
      weekdayCounts,
    ]);

  const ratingCounts =
    useMemo(() => {
      const counts =
        new Map<number, number>();

      for (
        let rating = 1;
        rating <= 5;
        rating += 1
      ) {
        counts.set(rating, 0);
      }

      ratedVisits.forEach(
        (visit) => {
          const rating =
            visit.rating;

          if (
            typeof rating ===
            'number'
          ) {
            counts.set(
              rating,
              (counts.get(rating) ??
                0) + 1,
            );
          }
        },
      );

      return counts;
    }, [ratedVisits]);

  // SAVED_CAFE_V47_VISIT_PREFERENCE_CALCULATION
  const recentVisits =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            parseTime(
              visit.visitedAt,
            ) >= recentThreshold,
        ),
      [
        recentThreshold,
        validVisits,
      ],
    );

  const purposeRows =
    useMemo(
      () =>
        buildVisitCategoryRows(
          validVisits,
          PURPOSE_OPTIONS,
          (visit) =>
            visit.purpose,
        ),
      [validVisits],
    );

  const companionRows =
    useMemo(
      () =>
        buildVisitCategoryRows(
          validVisits,
          COMPANION_OPTIONS,
          (visit) =>
            visit.companion,
        ),
      [validVisits],
    );

  const revisitRows =
    useMemo(
      () =>
        buildVisitCategoryRows(
          validVisits,
          REVISIT_OPTIONS,
          (visit) =>
            visit.revisitIntent,
        ),
      [validVisits],
    );

  const purposeTrackedCount =
    purposeRows.reduce(
      (sum, row) =>
        sum + row.count,
      0,
    );

  const companionTrackedCount =
    companionRows.reduce(
      (sum, row) =>
        sum + row.count,
      0,
    );

  const revisitTrackedCount =
    revisitRows.reduce(
      (sum, row) =>
        sum + row.count,
      0,
    );

  const metadataVisitCount =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            Boolean(
              visit.purpose ||
                visit.companion ||
                visit.revisitIntent,
            ),
        ).length,
      [validVisits],
    );

  const completeDetailCount =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            Boolean(
              visit.purpose &&
                visit.companion &&
                visit.revisitIntent,
            ),
        ).length,
      [validVisits],
    );

  const completeDetailRate =
    validVisits.length > 0
      ? Math.round(
          (completeDetailCount /
            validVisits.length) *
            100,
        )
      : 0;

  const revisitYesCount =
    revisitRows.find(
      (row) =>
        row.id === 'yes',
    )?.count ?? 0;

  const revisitYesRate =
    revisitTrackedCount > 0
      ? Math.round(
          (revisitYesCount /
            revisitTrackedCount) *
            100,
        )
      : 0;

  const recentMetadataVisitCount =
    useMemo(
      () =>
        recentVisits.filter(
          (visit) =>
            Boolean(
              visit.purpose ||
                visit.companion ||
                visit.revisitIntent,
            ),
        ).length,
      [recentVisits],
    );

  const recentMetadataRate =
    recentVisits.length > 0
      ? Math.round(
          (recentMetadataVisitCount /
            recentVisits.length) *
            100,
        )
      : 0;

  const recentPurposeRows =
    useMemo(
      () =>
        buildVisitCategoryRows(
          recentVisits,
          PURPOSE_OPTIONS,
          (visit) =>
            visit.purpose,
        ),
      [recentVisits],
    );

  const recentCompanionRows =
    useMemo(
      () =>
        buildVisitCategoryRows(
          recentVisits,
          COMPANION_OPTIONS,
          (visit) =>
            visit.companion,
        ),
      [recentVisits],
    );

  const recentRevisitRows =
    useMemo(
      () =>
        buildVisitCategoryRows(
          recentVisits,
          REVISIT_OPTIONS,
          (visit) =>
            visit.revisitIntent,
        ),
      [recentVisits],
    );

  const recentRevisitTrackedCount =
    recentRevisitRows.reduce(
      (sum, row) =>
        sum + row.count,
      0,
    );

  const recentRevisitYesCount =
    recentRevisitRows.find(
      (row) =>
        row.id === 'yes',
    )?.count ?? 0;

  const recentRevisitYesRate =
    recentRevisitTrackedCount > 0
      ? Math.round(
          (recentRevisitYesCount /
            recentRevisitTrackedCount) *
            100,
        )
      : 0;

  const dominantPurpose =
    purposeRows[0] ??
    null;

  const dominantCompanion =
    companionRows[0] ??
    null;

  const recentDominantPurpose =
    recentPurposeRows[0] ??
    null;

  const recentDominantCompanion =
    recentCompanionRows[0] ??
    null;

  const studyTopCafe =
    useMemo(
      () =>
        buildCafePreferenceRows(
          validVisits.filter(
            (visit) =>
              visit.purpose ===
              'study',
          ),
          entryMap,
        )[0] ?? null,
      [
        entryMap,
        validVisits,
      ],
    );

  const dateTopCafe =
    useMemo(
      () =>
        buildCafePreferenceRows(
          validVisits.filter(
            (visit) =>
              visit.purpose ===
              'date',
          ),
          entryMap,
        )[0] ?? null,
      [
        entryMap,
        validVisits,
      ],
    );

  const aloneTopCafe =
    useMemo(
      () =>
        buildCafePreferenceRows(
          validVisits.filter(
            (visit) =>
              visit.companion ===
              'alone',
          ),
          entryMap,
        )[0] ?? null,
      [
        entryMap,
        validVisits,
      ],
    );

  const revisitCafeRows =
    useMemo(
      () =>
        buildCafePreferenceRows(
          validVisits.filter(
            (visit) =>
              visit.revisitIntent ===
              'yes',
          ),
          entryMap,
        ).slice(
          0,
          5,
        ),
      [
        entryMap,
        validVisits,
      ],
    );

  const recentRows =
    useMemo<RecentVisitRow[]>(
      () =>
        validVisits
          .map((visit) => {
            const entry =
              entryMap.get(
                visit.placeId,
              );

            return entry
              ? {
                  visit,
                  entry,
                }
              : null;
          })
          .filter(
            (
              row,
            ): row is RecentVisitRow =>
              Boolean(row),
          )
          .slice(0, 8),
      [entryMap, validVisits],
    );

  const visitRate =
    entries.length > 0
      ? Math.round(
          (cafeRows.length /
            entries.length) *
            100,
        )
      : 0;

  const topTheme =
    themeRows[0] ?? null;

  const openVisitTimeline =
    useCallback(
      (placeId: string) => {
        router.push({
          pathname:
            '/place/saved-cafe-visits',
          params: {
            placeId,
          },
        } as never);
      },
      [],
    );



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
          style={styles.headerTextArea}
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
          >
            카페 방문 인사이트
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
            방문 기록으로 나의 카페 취향과 재방문 패턴을 확인해요.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="카페 방문 기록으로 이동"
          onPress={() =>
            router.replace(
              '/place/saved-cafe-visits' as never,
            )
          }
          style={({ pressed }) => [
            styles.headerTextButton,
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
            name="time-outline"
            size={14}
            color={theme.text}
          />
          <Text
            style={[
              styles.headerTextButtonLabel,
              {
                color: theme.text,
              },
            ]}
          >
            기록
          </Text>
        </Pressable>
      </View>

      {loading ? (
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
            카페 방문 통계를 계산하고 있어요.
          </Text>
        </View>
      ) : loadError ? (
        <View
          style={styles.centerArea}
        >
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color={theme.subText}
          />
          <Text
            style={[
              styles.emptyTitle,
              {
                color: theme.text,
              },
            ]}
          >
            방문 통계를 불러오지 못했어요.
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
            onPress={() =>
              setReloadVersion(
                (value) =>
                  value + 1,
              )
            }
            style={({ pressed }) => [
              styles.retryButton,
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
              name="refresh-outline"
              size={15}
              color={theme.text}
            />
            <Text
              style={[
                styles.retryButtonText,
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
      ) : validVisits.length === 0 ? (
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
              name="analytics-outline"
              size={35}
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
              아직 분석할 방문 기록이 없어요.
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
              카페를 방문할 때 기록을 남기면 자주 가는 곳과 취향이 자동으로 정리돼요.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.replace(
                  '/place/saved-cafe-visits' as never,
                )
              }
              style={({ pressed }) => [
                styles.retryButton,
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
                name="add-circle-outline"
                size={15}
                color={theme.text}
              />
              <Text
                style={[
                  styles.retryButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                방문 기록 남기기
              </Text>
            </Pressable>
          </View>
        </View>
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
          {/* SAVED_CAFE_V48_PERSONALIZED_RECOMMENDATION_ENTRY */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ROOT 맞춤 카페 추천 열기"
            onPress={() =>
              router.push(
                '/place/saved-cafe-recommendations' as never,
              )
            }
            style={({ pressed }) => [
              styles.calendarEntryCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 14,
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.calendarEntryIcon,
                {
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
                name="sparkles-outline"
                size={19}
                color={theme.text}
              />
            </View>
            <View
              style={styles.calendarEntryTextArea}
            >
              <Text
                style={[
                  styles.calendarEntryLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                ROOT 맞춤 추천
              </Text>
              <Text
                style={[
                  styles.calendarEntryTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                내 취향에 맞는 저장 카페를 골라요
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.calendarEntryDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문 목적·동행·재방문 의향과 카페 키워드를 함께 분석해요.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={theme.subText}
            />
          </Pressable>
          {/* SAVED_CAFE_V45_VISIT_CALENDAR_ENTRY */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 방문 캘린더 열기"
            onPress={() =>
              router.push(
                '/place/saved-cafe-visit-calendar' as never,
              )
            }
            style={({ pressed }) => [
              styles.calendarEntryCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 14,
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.calendarEntryIcon,
                {
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
                name="calendar-outline"
                size={19}
                color={theme.text}
              />
            </View>

            <View
              style={styles.calendarEntryTextArea}
            >
              <Text
                style={[
                  styles.calendarEntryLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문 캘린더
              </Text>
              <Text
                style={[
                  styles.calendarEntryTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                월별 카페 발자국을 한눈에 봐요
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.calendarEntryDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문일·횟수·날짜별 메모와 연속 방문 기록을 확인해요.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={theme.subText}
            />
          </Pressable>

          {/* SAVED_CAFE_V44_VISIT_CHALLENGES_ENTRY */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 방문 도전과제 열기"
            onPress={() =>
              router.push(
                '/place/saved-cafe-visit-challenges' as never,
              )
            }
            style={({ pressed }) => [
              styles.challengeEntryCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 14,
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.challengeEntryIcon,
                {
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
                name="trophy-outline"
                size={19}
                color={theme.text}
              />
            </View>

            <View
              style={styles.challengeEntryTextArea}
            >
              <Text
                style={[
                  styles.challengeEntryLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                ROOT 카페 도전
              </Text>
              <Text
                style={[
                  styles.challengeEntryTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                방문 기록으로 도전과제를 달성해요
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.challengeEntryDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문·재방문·별점·메모·취향 다양성의 진행도를 확인해요.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={theme.subText}
            />
          </Pressable>

          <View
            style={styles.metricGrid}
          >
            <MetricCard
              label="총 방문"
              value={`${validVisits.length}회`}
              icon="walk-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="방문 카페"
              value={`${cafeRows.length}곳`}
              icon="cafe-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="이번 달"
              value={`${monthVisitCount}회`}
              icon="calendar-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="최근 30일"
              value={`${recentVisitCount}회`}
              icon="time-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="자주 가요"
              value={`${frequentCafeCount}곳`}
              icon="repeat-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="평균 별점"
              value={
                averageRating !== null
                  ? `${averageRating}점`
                  : '미입력'
              }
              icon="star-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
          </View>

          <View
            style={[
              styles.insightHero,
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
            <View
              style={styles.insightHeroIcon}
            >
              <Ionicons
                name="sparkles-outline"
                size={24}
                color={theme.text}
              />
            </View>
            <View
              style={styles.insightHeroTextArea}
            >
              <Text
                style={[
                  styles.insightHeroLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                나의 카페 방문 패턴
              </Text>
              <Text
                style={[
                  styles.insightHeroTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {topTheme
                  ? `${topTheme.label} 테마를 가장 자주 찾았어요.`
                  : '방문 기록을 더 쌓아보세요.'}
              </Text>
              <Text
                style={[
                  styles.insightHeroDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                저장한 카페 중 {visitRate}%를 실제로 방문했고, 자주 가는 카페 기준은 {SAVED_CAFE_FREQUENT_VISIT_COUNT}회 이상이에요.
                {topWeekdayIndex >= 0
                  ? ` ${WEEKDAY_LABELS[topWeekdayIndex]}요일 방문이 가장 많아요.`
                  : ''}
              </Text>
            </View>
          </View>

          <SectionTitle
            title="가장 자주 간 카페"
            subtitle="누적 방문 횟수 기준"
            theme={theme}
          />

          <View
            style={styles.stack}
          >
            {topVisited.map(
              (row, index) => (
                <CafeRankCard
                  key={
                    row.entry.cafe.placeId
                  }
                  rank={index + 1}
                  entry={row.entry}
                  primaryValue={`${row.visitCount}회 방문`}
                  secondaryValue={
                    row.lastVisitedAt
                      ? `최근 ${formatDate(row.lastVisitedAt)}`
                      : '최근 방문 없음'
                  }
                  badge={
                    row.isFrequent
                      ? '자주 가요'
                      : null
                  }
                  onPress={() =>
                    openVisitTimeline(
                      row.entry.cafe.placeId,
                    )
                  }
                  theme={theme}
                  isCityBlack={isCityBlack}
                />
              ),
            )}
          </View>

          {topRated.length > 0 ? (
            <>
              <SectionTitle
                title="평점이 높은 카페"
                subtitle="내 방문 별점 평균"
                theme={theme}
              />

              <View
                style={styles.stack}
              >
                {topRated.map(
                  (row, index) => (
                    <CafeRankCard
                      key={
                        row.entry.cafe.placeId
                      }
                      rank={index + 1}
                      entry={row.entry}
                      primaryValue={`★ ${row.averageRating}`}
                      secondaryValue={`${row.visitCount}회 방문`}
                      badge={null}
                      onPress={() =>
                        openVisitTimeline(
                          row.entry.cafe.placeId,
                        )
                      }
                      theme={theme}
                      isCityBlack={isCityBlack}
                    />
                  ),
                )}
              </View>
            </>
          ) : null}

          <SectionTitle
            title="방문 테마"
            subtitle="실제 방문 횟수로 계산"
            theme={theme}
          />

          <View
            style={[
              styles.panel,
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
            {themeRows.map(
              (row, index) => (
                <View
                  key={row.themeId}
                  style={[
                    styles.simpleRow,
                    index > 0
                      ? {
                          borderTopWidth:
                            StyleSheet.hairlineWidth,
                          borderTopColor:
                            theme.line,
                        }
                      : null,
                  ]}
                >
                  <View
                    style={styles.simpleRank}
                  >
                    <Text
                      style={[
                        styles.simpleRankText,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View
                    style={styles.simpleTextArea}
                  >
                    <Text
                      style={[
                        styles.simpleTitle,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={[
                        styles.simpleSubtitle,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {row.cafeCount}곳에서 {row.visitCount}회 방문
                    </Text>
                  </View>
                </View>
              ),
            )}
          </View>

          <SectionTitle
            title="요일별 방문"
            subtitle="어떤 요일에 카페를 찾는지 확인해요"
            theme={theme}
          />

          <View
            style={[
              styles.weekdayRow,
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
            {WEEKDAY_LABELS.map(
              (label, index) => (
                <View
                  key={label}
                  style={styles.weekdayItem}
                >
                  <Text
                    style={[
                      styles.weekdayLabel,
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
                      styles.weekdayValue,
                      {
                        color:
                          index ===
                          topWeekdayIndex
                            ? theme.text
                            : theme.subText,
                      },
                    ]}
                  >
                    {weekdayCounts[index]}
                  </Text>
                </View>
              ),
            )}
          </View>

          {ratedVisits.length > 0 ? (
            <>
              <SectionTitle
                title="별점 분포"
                subtitle={`${ratedVisits.length}개의 별점 기록`}
                theme={theme}
              />

              <View
                style={[
                  styles.panel,
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
                {[5, 4, 3, 2, 1].map(
                  (rating, index) => (
                    <View
                      key={rating}
                      style={[
                        styles.ratingRow,
                        index > 0
                          ? {
                              borderTopWidth:
                                StyleSheet.hairlineWidth,
                              borderTopColor:
                                theme.line,
                            }
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ratingLabel,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        ★ {rating}
                      </Text>
                      <Text
                        style={[
                          styles.ratingCount,
                          {
                            color:
                              theme.subText,
                          },
                        ]}
                      >
                        {ratingCounts.get(rating) ?? 0}개
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </>
          ) : null}

          {/* SAVED_CAFE_V47_VISIT_PREFERENCE_UI */}
          <SectionTitle
            title="나의 카페 취향"
            subtitle="방문 목적·동행·재방문 의향으로 자동 분석"
            theme={theme}
          />
          <View
            style={styles.metricGrid}
          >
            <MetricCard
              label="취향 기록"
              value={`${metadataVisitCount}/${validVisits.length}`}
              icon="pencil-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="상세 완성률"
              value={`${completeDetailRate}%`}
              icon="checkmark-circle-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="또 가고 싶어요"
              value={
                revisitTrackedCount > 0
                  ? `${revisitYesRate}%`
                  : '미입력'
              }
              icon="heart-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
            <MetricCard
              label="최근 30일 기록"
              value={`${recentMetadataRate}%`}
              icon="time-outline"
              theme={theme}
              isCityBlack={isCityBlack}
            />
          </View>

          <View
            style={[
              styles.insightHero,
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
            <View
              style={styles.insightHeroIcon}
            >
              <Ionicons
                name="heart-outline"
                size={21}
                color={theme.text}
              />
            </View>
            <View
              style={styles.insightHeroTextArea}
            >
              <Text
                style={[
                  styles.insightHeroLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                취향 요약
              </Text>
              <Text
                style={[
                  styles.insightHeroTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {dominantPurpose
                  ? `${dominantPurpose.label} 방문이 가장 많아요`
                  : '상세 방문 기록을 조금 더 쌓아 보세요'}
              </Text>
              <Text
                style={[
                  styles.insightHeroDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {dominantPurpose
                  ? `목적 기록 ${purposeTrackedCount}회 중 ${dominantPurpose.label} ${dominantPurpose.count}회(${dominantPurpose.percentage}%)`
                  : 'V46 방문 상세에서 목적을 선택하면 나의 카페 사용 패턴이 보여요.'}
                {dominantCompanion
                  ? ` · 동행은 ${dominantCompanion.label} ${dominantCompanion.percentage}%`
                  : ''}
              </Text>
            </View>
          </View>

          {purposeRows.length > 0 ? (
            <>
              <SectionTitle
                title="방문 목적 비율"
                subtitle={`${purposeTrackedCount}회의 목적 기록`}
                theme={theme}
              />
              <CategoryDistributionPanel
                rows={purposeRows}
                theme={theme}
                isCityBlack={isCityBlack}
              />
            </>
          ) : null}

          {companionRows.length > 0 ? (
            <>
              <SectionTitle
                title="누구와 함께 갔나요"
                subtitle={`${companionTrackedCount}회의 동행 기록`}
                theme={theme}
              />
              <CategoryDistributionPanel
                rows={companionRows}
                theme={theme}
                isCityBlack={isCityBlack}
              />
            </>
          ) : null}

          {revisitRows.length > 0 ? (
            <>
              <SectionTitle
                title="재방문 의향"
                subtitle={`${revisitTrackedCount}회의 재방문 의향 기록`}
                theme={theme}
              />
              <CategoryDistributionPanel
                rows={revisitRows}
                theme={theme}
                isCityBlack={isCityBlack}
              />
            </>
          ) : null}

          {recentVisitCount > 0 ? (
            <>
              <SectionTitle
                title="최근 30일 취향 패턴"
                subtitle={`${recentVisitCount}회 방문 기준`}
                theme={theme}
              />
              <View
                style={[
                  styles.insightHero,
                  {
                    marginTop: 0,
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
                  style={styles.insightHeroIcon}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={21}
                    color={theme.text}
                  />
                </View>
                <View
                  style={styles.insightHeroTextArea}
                >
                  <Text
                    style={[
                      styles.insightHeroLabel,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    최근 흐름
                  </Text>
                  <Text
                    style={[
                      styles.insightHeroTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {recentDominantPurpose
                      ? `${recentDominantPurpose.label} 중심의 카페 생활`
                      : '최근 방문의 목적을 기록해 보세요'}
                  </Text>
                  <Text
                    style={[
                      styles.insightHeroDescription,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {`상세 기록 ${recentMetadataVisitCount}/${recentVisitCount}회(${recentMetadataRate}%)`}
                    {recentDominantCompanion
                      ? ` · ${recentDominantCompanion.label} 방문 ${recentDominantCompanion.percentage}%`
                      : ''}
                    {recentRevisitTrackedCount > 0
                      ? ` · 또 가고 싶어요 ${recentRevisitYesRate}%`
                      : ''}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {studyTopCafe ||
          dateTopCafe ||
          aloneTopCafe ? (
            <>
              <SectionTitle
                title="상황별 자주 간 카페"
                subtitle="공부·데이트·혼자 방문 기준"
                theme={theme}
              />
              <View
                style={styles.stack}
              >
                {studyTopCafe ? (
                  <CafeRankCard
                    rank={1}
                    entry={studyTopCafe.entry}
                    primaryValue={`${studyTopCafe.visitCount}회`}
                    secondaryValue={`최근 ${formatDate(studyTopCafe.lastVisitedAt)}`}
                    badge="공부"
                    onPress={() =>
                      openVisitTimeline(
                        studyTopCafe.entry.cafe.placeId,
                      )
                    }
                    theme={theme}
                    isCityBlack={isCityBlack}
                  />
                ) : null}
                {dateTopCafe ? (
                  <CafeRankCard
                    rank={1}
                    entry={dateTopCafe.entry}
                    primaryValue={`${dateTopCafe.visitCount}회`}
                    secondaryValue={`최근 ${formatDate(dateTopCafe.lastVisitedAt)}`}
                    badge="데이트"
                    onPress={() =>
                      openVisitTimeline(
                        dateTopCafe.entry.cafe.placeId,
                      )
                    }
                    theme={theme}
                    isCityBlack={isCityBlack}
                  />
                ) : null}
                {aloneTopCafe ? (
                  <CafeRankCard
                    rank={1}
                    entry={aloneTopCafe.entry}
                    primaryValue={`${aloneTopCafe.visitCount}회`}
                    secondaryValue={`최근 ${formatDate(aloneTopCafe.lastVisitedAt)}`}
                    badge="혼자"
                    onPress={() =>
                      openVisitTimeline(
                        aloneTopCafe.entry.cafe.placeId,
                      )
                    }
                    theme={theme}
                    isCityBlack={isCityBlack}
                  />
                ) : null}
              </View>
            </>
          ) : null}

          {revisitCafeRows.length > 0 ? (
            <>
              <SectionTitle
                title="다시 가고 싶은 카페"
                subtitle="‘또 가고 싶어요’로 남긴 방문 기준"
                theme={theme}
              />
              <View
                style={styles.stack}
              >
                {revisitCafeRows.map(
                  (row, index) => (
                    <CafeRankCard
                      key={
                        row.entry.cafe.placeId
                      }
                      rank={index + 1}
                      entry={row.entry}
                      primaryValue={`${row.visitCount}회`}
                      secondaryValue={`최근 ${formatDate(row.lastVisitedAt)}`}
                      badge="재방문"
                      onPress={() =>
                        openVisitTimeline(
                          row.entry.cafe.placeId,
                        )
                      }
                      theme={theme}
                      isCityBlack={isCityBlack}
                    />
                  ),
                )}
              </View>
            </>
          ) : null}

          <SectionTitle
            title="최근 방문"
            subtitle="최근 8개의 방문 기록"
            theme={theme}
          />

          <View
            style={styles.stack}
          >
            {recentRows.map(
              ({
                visit,
                entry,
              }) => (
                <Pressable
                  key={visit.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.cafe.name} 방문 기록 열기`}
                  onPress={() =>
                    openVisitTimeline(
                      entry.cafe.placeId,
                    )
                  }
                  style={({ pressed }) => [
                    styles.recentCard,
                    {
                      backgroundColor:
                        theme.card,
                      borderColor:
                        theme.line,
                      borderRadius:
                        isCityBlack
                          ? 3
                          : 13,
                      opacity:
                        pressed
                          ? 0.58
                          : 1,
                    },
                  ]}
                >
                  <View
                    style={styles.recentIconBox}
                  >
                    <Ionicons
                      name="cafe-outline"
                      size={17}
                      color={theme.text}
                    />
                  </View>
                  <View
                    style={styles.recentTextArea}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.recentTitle,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {entry.cafe.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.recentSubtitle,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {formatDate(
                        visit.visitedAt,
                      )}
                      {typeof visit.rating ===
                      'number'
                        ? ` · ★ ${visit.rating}`
                        : ''}
                      {visit.note
                        ? ` · ${visit.note}`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={theme.subText}
                  />
                </Pressable>
              ),
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="저장 카페 상세 목록 열기"
            onPress={() =>
              router.push(
                '/place/saved-cafes' as never,
              )
            }
            style={({ pressed }) => [
              styles.footerButton,
              {
                backgroundColor:
                  theme.background,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <Ionicons
              name="cafe-outline"
              size={15}
              color={theme.text}
            />
            <Text
              style={[
                styles.footerButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              저장 카페 살펴보기
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

type Theme = ReturnType<
  typeof useRootTheme
>['theme'];

type MetricCardProps = {
  label: string;
  value: string;
  icon: ComponentProps<
    typeof Ionicons
  >['name'];
  theme: Theme;
  isCityBlack: boolean;
};

function MetricCard({
  label,
  value,
  icon,
  theme,
  isCityBlack,
}: MetricCardProps) {
  return (
    <View
      style={[
        styles.metricCard,
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
        size={16}
        color={theme.subText}
      />
      <Text
        style={[
          styles.metricValue,
          {
            color: theme.text,
          },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.metricLabel,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

type SectionTitleProps = {
  title: string;
  subtitle: string;
  theme: Theme;
};

function SectionTitle({
  title,
  subtitle,
  theme,
}: SectionTitleProps) {
  return (
    <View
      style={styles.sectionHeader}
    >
      <Text
        style={[
          styles.sectionTitle,
          {
            color: theme.text,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.sectionSubtitle,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

type CategoryDistributionPanelProps = {
  rows: VisitCategoryRow[];
  theme: Theme;
  isCityBlack: boolean;
};

function CategoryDistributionPanel({
  rows,
  theme,
  isCityBlack,
}: CategoryDistributionPanelProps) {
  return (
    <View
      style={[
        styles.panel,
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
      {rows.map(
        (row, index) => (
          <View
            key={row.id}
            style={[
              styles.ratingRow,
              index > 0
                ? {
                    borderTopWidth:
                      StyleSheet.hairlineWidth,
                    borderTopColor:
                      theme.line,
                  }
                : null,
            ]}
          >
            <View
              style={styles.simpleTextArea}
            >
              <Text
                style={[
                  styles.ratingLabel,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {row.label}
              </Text>
              <Text
                style={[
                  styles.simpleSubtitle,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {row.count}회 기록
              </Text>
            </View>
            <Text
              style={[
                styles.ratingCount,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {row.percentage}%
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

type CafeRankCardProps = {
  rank: number;
  entry: SavedCafeLocalEntry;
  primaryValue: string;
  secondaryValue: string;
  badge: string | null;
  onPress: () => void;
  theme: Theme;
  isCityBlack: boolean;
};

function CafeRankCard({
  rank,
  entry,
  primaryValue,
  secondaryValue,
  badge,
  onPress,
  theme,
  isCityBlack,
}: CafeRankCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.cafe.name} 방문 기록 열기`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rankCard,
        {
          backgroundColor:
            theme.card,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 3
              : 13,
          opacity:
            pressed
              ? 0.58
              : 1,
        },
      ]}
    >
      <View
        style={[
          styles.rankBox,
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
        <Text
          style={[
            styles.rankNumber,
            {
              color: theme.text,
            },
          ]}
        >
          {rank}
        </Text>
      </View>

      <View
        style={styles.rankTextArea}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.rankTitle,
            {
              color: theme.text,
            },
          ]}
        >
          {entry.cafe.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.rankSubtitle,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {getPrimaryThemeLabel(
            entry.cafe.primaryTheme,
          )}
          {' · '}
          {secondaryValue}
        </Text>
      </View>

      <View
        style={styles.rankValueArea}
      >
        <Text
          style={[
            styles.rankValue,
            {
              color: theme.text,
            },
          ]}
        >
          {primaryValue}
        </Text>
        {badge ? (
          <Text
            style={[
              styles.rankBadge,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {badge}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={14}
        color={theme.subText}
      />
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
    fontSize: 9.5,
    fontWeight: '700',
  },

  headerTextButton: {
    height: 34,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  headerTextButtonLabel: {
    fontSize: 9,
    fontWeight: '900',
  },

  centerArea: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  centerDescription: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
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
    marginTop: 10,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyDescription: {
    marginTop: 6,
    maxWidth: 330,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },

  retryButton: {
    minHeight: 35,
    marginTop: 10,
    paddingHorizontal: 11,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  retryButtonText: {
    fontSize: 9.5,
    fontWeight: '900',
  },

  content: {
    padding: 14,
  },

  calendarEntryCard: {
    minHeight: 78,
    marginBottom: 8,
    padding: 11,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  calendarEntryIcon: {
    width: 40,
    height: 40,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarEntryTextArea: {
    flex: 1,
    minWidth: 0,
  },

  calendarEntryLabel: {
    fontSize: 8,
    fontWeight: '900',
  },

  calendarEntryTitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '900',
  },

  calendarEntryDescription: {
    marginTop: 3,
    fontSize: 8.3,
    fontWeight: '700',
  },

  challengeEntryCard: {
    minHeight: 78,
    marginBottom: 12,
    padding: 11,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  challengeEntryIcon: {
    width: 40,
    height: 40,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  challengeEntryTextArea: {
    flex: 1,
    minWidth: 0,
  },

  challengeEntryLabel: {
    fontSize: 8,
    fontWeight: '900',
  },

  challengeEntryTitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '900',
  },

  challengeEntryDescription: {
    marginTop: 3,
    fontSize: 8.3,
    fontWeight: '700',
  },

  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  metricCard: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    minHeight: 92,
    padding: 12,
    borderWidth:
      StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },

  metricValue: {
    marginTop: 9,
    fontSize: 17,
    fontWeight: '900',
  },

  metricLabel: {
    marginTop: 3,
    fontSize: 8.8,
    fontWeight: '800',
  },

  insightHero: {
    marginTop: 12,
    padding: 15,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  insightHeroIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  insightHeroTextArea: {
    flex: 1,
    minWidth: 0,
  },

  insightHeroLabel: {
    fontSize: 8.5,
    fontWeight: '900',
  },

  insightHeroTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },

  insightHeroDescription: {
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 15,
  },

  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 8.8,
    fontWeight: '700',
  },

  stack: {
    gap: 7,
  },

  rankCard: {
    minHeight: 72,
    padding: 10,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  rankBox: {
    width: 34,
    height: 34,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rankNumber: {
    fontSize: 12,
    fontWeight: '900',
  },

  rankTextArea: {
    flex: 1,
    minWidth: 0,
  },

  rankTitle: {
    fontSize: 11.5,
    fontWeight: '900',
  },

  rankSubtitle: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: '700',
  },

  rankValueArea: {
    alignItems: 'flex-end',
    gap: 3,
  },

  rankValue: {
    fontSize: 10.5,
    fontWeight: '900',
  },

  rankBadge: {
    fontSize: 8,
    fontWeight: '800',
  },

  panel: {
    borderWidth:
      StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  simpleRow: {
    minHeight: 62,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  simpleRank: {
    width: 24,
    alignItems: 'center',
  },

  simpleRankText: {
    fontSize: 9.5,
    fontWeight: '900',
  },

  simpleTextArea: {
    flex: 1,
    minWidth: 0,
  },

  simpleTitle: {
    fontSize: 10.5,
    fontWeight: '900',
  },

  simpleSubtitle: {
    marginTop: 3,
    fontSize: 8.5,
    fontWeight: '700',
  },

  weekdayRow: {
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },

  weekdayItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 5,
  },

  weekdayLabel: {
    fontSize: 8.5,
    fontWeight: '800',
  },

  weekdayValue: {
    fontSize: 12,
    fontWeight: '900',
  },

  ratingRow: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ratingLabel: {
    fontSize: 10,
    fontWeight: '900',
  },

  ratingCount: {
    fontSize: 9,
    fontWeight: '800',
  },

  recentCard: {
    minHeight: 65,
    padding: 10,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  recentIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentTextArea: {
    flex: 1,
    minWidth: 0,
  },

  recentTitle: {
    fontSize: 10.5,
    fontWeight: '900',
  },

  recentSubtitle: {
    marginTop: 4,
    fontSize: 8.5,
    fontWeight: '700',
  },

  footerButton: {
    minHeight: 38,
    marginTop: 20,
    paddingHorizontal: 12,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  footerButtonText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
});
