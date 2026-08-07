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
  loadSavedCafeEntries,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  loadSavedCafeVisitState,
  type SavedCafeVisit,
  type SavedCafeVisitState,
} from '../../store/savedCafeVisits';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V45_VISIT_CALENDAR_SCREEN

type IconName =
  ComponentProps<
    typeof Ionicons
  >['name'];

type CalendarCell = {
  day: number;
  dateKey: string;
};

type VisitRow = {
  visit: SavedCafeVisit;
  entry: SavedCafeLocalEntry;
};

const WEEKDAY_LABELS = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
] as const;

const DAY_MS =
  24 * 60 * 60 * 1000;

function pad2(
  value: number,
) {
  return String(value).padStart(
    2,
    '0',
  );
}

function toDateKey(
  value: Date | string,
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return '';
  }

  return [
    date.getFullYear(),
    pad2(
      date.getMonth() + 1,
    ),
    pad2(
      date.getDate(),
    ),
  ].join('-');
}

function parseDateKeyToUtc(
  value: string,
) {
  const parts =
    value
      .split('-')
      .map(Number);

  if (
    parts.length !== 3 ||
    parts.some(
      (part) =>
        !Number.isFinite(part),
    )
  ) {
    return 0;
  }

  return Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
  );
}

function getMonthKey(
  date: Date,
) {
  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1,
  )}`;
}

function getMonthTitle(
  date: Date,
) {
  return `${date.getFullYear()}년 ${
    date.getMonth() + 1
  }월`;
}

function getDateLabel(
  dateKey: string,
) {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split('-')
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return '';
  }

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return `${month}월 ${day}일 ${
    WEEKDAY_LABELS[
      date.getDay()
    ]
  }요일`;
}

function getVisitTimeLabel(
  visitedAt: string,
) {
  const date =
    new Date(visitedAt);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return '시간 미상';
  }

  return `${pad2(
    date.getHours(),
  )}:${pad2(
    date.getMinutes(),
  )}`;
}

function moveMonthDate(
  date: Date,
  offset: number,
) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + offset,
    1,
  );
}

function buildMonthCells(
  monthDate: Date,
) {
  const year =
    monthDate.getFullYear();
  const month =
    monthDate.getMonth();
  const firstWeekday =
    new Date(
      year,
      month,
      1,
    ).getDay();
  const lastDay =
    new Date(
      year,
      month + 1,
      0,
    ).getDate();

  return Array.from(
    { length: 42 },
    (_, index): CalendarCell | null => {
      const day =
        index -
        firstWeekday +
        1;

      if (
        day < 1 ||
        day > lastDay
      ) {
        return null;
      }

      const date =
        new Date(
          year,
          month,
          day,
        );

      return {
        day,
        dateKey:
          toDateKey(date),
      };
    },
  );
}

function getLongestStreak(
  dateKeys: string[],
) {
  const uniqueTimes =
    Array.from(
      new Set(
        dateKeys
          .map(
            parseDateKeyToUtc,
          )
          .filter(
            (time) =>
              time > 0,
          ),
      ),
    ).sort(
      (first, second) =>
        first - second,
    );

  let longest = 0;
  let current = 0;
  let previous = 0;

  uniqueTimes.forEach(
    (time) => {
      if (
        previous > 0 &&
        time - previous ===
          DAY_MS
      ) {
        current += 1;
      }
      else {
        current = 1;
      }

      longest =
        Math.max(
          longest,
          current,
        );
      previous = time;
    },
  );

  return longest;
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

export default function SavedCafeVisitCalendarScreen() {
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

  const [
    cursorMonth,
    setCursorMonth,
  ] = useState(
    () => {
      const now =
        new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
    },
  );

  const [
    selectedDateKey,
    setSelectedDateKey,
  ] = useState(
    () => toDateKey(
      new Date(),
    ),
  );

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

          setEntries(
            nextEntries,
          );
          setVisitState(
            nextVisitState,
          );
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE VISIT CALENDAR LOAD ERROR',
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
        (
          visitState?.visits ??
          []
        )
          .filter((visit) =>
            entryMap.has(
              visit.placeId,
            ),
          )
          .sort(
            (first, second) =>
              new Date(
                second.visitedAt,
              ).getTime() -
              new Date(
                first.visitedAt,
              ).getTime(),
          ),
      [
        entryMap,
        visitState,
      ],
    );

  const visitsByDate =
    useMemo(() => {
      const map =
        new Map<
          string,
          SavedCafeVisit[]
        >();

      validVisits.forEach(
        (visit) => {
          const dateKey =
            toDateKey(
              visit.visitedAt,
            );

          if (!dateKey) {
            return;
          }

          const current =
            map.get(dateKey) ??
            [];

          current.push(visit);
          map.set(
            dateKey,
            current,
          );
        },
      );

      return map;
    }, [validVisits]);

  const monthKey =
    getMonthKey(
      cursorMonth,
    );

  const monthCells =
    useMemo(
      () =>
        buildMonthCells(
          cursorMonth,
        ),
      [cursorMonth],
    );

  const monthDateKeys =
    useMemo(
      () =>
        Array.from(
          visitsByDate.keys(),
        ).filter(
          (dateKey) =>
            dateKey.startsWith(
              `${monthKey}-`,
            ),
        ),
      [
        monthKey,
        visitsByDate,
      ],
    );

  const monthVisitCount =
    useMemo(
      () =>
        monthDateKeys.reduce(
          (sum, dateKey) =>
            sum +
            (
              visitsByDate.get(
                dateKey,
              )?.length ?? 0
            ),
          0,
        ),
      [
        monthDateKeys,
        visitsByDate,
      ],
    );

  const monthVisitDayCount =
    monthDateKeys.length;

  const busiestDay =
    useMemo<{
      dateKey: string;
      count: number;
    } | null>(() => {
      if (monthDateKeys.length === 0) {
        return null;
      }

      let bestDateKey =
        monthDateKeys[0];

      let bestCount =
        visitsByDate.get(
          bestDateKey,
        )?.length ?? 0;

      for (const dateKey of
        monthDateKeys.slice(1)) {
        const count =
          visitsByDate.get(
            dateKey,
          )?.length ?? 0;

        if (count > bestCount) {
          bestDateKey =
            dateKey;

          bestCount =
            count;
        }
      }

      return {
        dateKey: bestDateKey,
        count: bestCount,
      };
    }, [
      monthDateKeys,
      visitsByDate,
    ]);

  const longestVisitStreak =
    useMemo(
      () =>
        getLongestStreak(
          Array.from(
            visitsByDate.keys(),
          ),
        ),
      [visitsByDate],
    );

  const selectedVisitRows =
    useMemo<VisitRow[]>(
      () =>
        (
          visitsByDate.get(
            selectedDateKey,
          ) ?? []
        )
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
            ): row is VisitRow =>
              Boolean(row),
          )
          .sort(
            (first, second) =>
              new Date(
                second.visit
                  .visitedAt,
              ).getTime() -
              new Date(
                first.visit
                  .visitedAt,
              ).getTime(),
          ),
      [
        entryMap,
        selectedDateKey,
        visitsByDate,
      ],
    );

  const todayKey =
    toDateKey(
      new Date(),
    );

  const currentMonthKey =
    getMonthKey(
      new Date(),
    );

  const moveMonth =
    useCallback(
      (offset: number) => {
        setCursorMonth(
          (current) =>
            moveMonthDate(
              current,
              offset,
            ),
        );
        setSelectedDateKey('');
      },
      [],
    );

  const goCurrentMonth =
    useCallback(() => {
      const now =
        new Date();

      setCursorMonth(
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ),
      );
      setSelectedDateKey(
        toDateKey(now),
      );
    }, []);

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

  const metricCards: Array<{
    label: string;
    value: string;
    icon: IconName;
  }> = [
    {
      label: '이번 달 방문',
      value: `${monthVisitCount}회`,
      icon: 'cafe-outline',
    },
    {
      label: '방문한 날',
      value: `${monthVisitDayCount}일`,
      icon: 'calendar-outline',
    },
    {
      label: '가장 바쁜 날',
      value:
        busiestDay
          ? `${busiestDay.count}회`
          : '-',
      icon: 'bar-chart-outline',
    },
    {
      label: '최장 연속 방문',
      value: `${longestVisitStreak}일`,
      icon: 'flame-outline',
    },
  ];

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
            카페 방문 캘린더
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
            월별 방문일과 하루의 카페 기록을 한눈에 확인해요.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="카페 방문 인사이트로 이동"
          onPress={() =>
            router.replace(
              '/place/saved-cafe-visit-insights' as never,
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
          <Text
            style={[
              styles.headerTextButtonLabel,
              {
                color:
                  theme.text,
              },
            ]}
          >
            통계
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View
          style={styles.centerState}
        >
          <ActivityIndicator
            color={theme.text}
          />
          <Text
            style={[
              styles.stateText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            방문 캘린더를 불러오고 있어요.
          </Text>
        </View>
      ) : loadError ? (
        <View
          style={styles.centerState}
        >
          <Ionicons
            name="alert-circle-outline"
            size={27}
            color={theme.subText}
          />
          <Text
            style={[
              styles.stateTitle,
              {
                color: theme.text,
              },
            ]}
          >
            방문 캘린더를 불러오지 못했어요
          </Text>
          <Text
            style={[
              styles.stateText,
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
            accessibilityLabel="다시 시도"
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
                    : 10,
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
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + 28,
            },
          ]}
        >
          <View
            style={styles.monthHeader}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              onPress={() =>
                moveMonth(-1)
              }
              style={({ pressed }) => [
                styles.monthArrow,
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
                name="chevron-back"
                size={18}
                color={theme.text}
              />
            </Pressable>

            <View
              style={styles.monthTitleArea}
            >
              <Text
                style={[
                  styles.monthTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {getMonthTitle(
                  cursorMonth,
                )}
              </Text>
              <Text
                style={[
                  styles.monthSubtitle,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {monthVisitCount > 0
                  ? `${monthVisitDayCount}일 동안 ${monthVisitCount}회 방문`
                  : '아직 이 달의 방문 기록이 없어요'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              onPress={() =>
                moveMonth(1)
              }
              style={({ pressed }) => [
                styles.monthArrow,
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
                name="chevron-forward"
                size={18}
                color={theme.text}
              />
            </Pressable>
          </View>

          {monthKey !==
          currentMonthKey ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이번 달로 이동"
              onPress={
                goCurrentMonth
              }
              style={({ pressed }) => [
                styles.todayButton,
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
                name="today-outline"
                size={14}
                color={theme.text}
              />
              <Text
                style={[
                  styles.todayButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                이번 달
              </Text>
            </Pressable>
          ) : null}

          <View
            style={styles.metricGrid}
          >
            {metricCards.map(
              (metric) => (
                <View
                  key={metric.label}
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
                          : 12,
                    },
                  ]}
                >
                  <Ionicons
                    name={metric.icon}
                    size={16}
                    color={theme.text}
                  />
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {metric.value}
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
                    {metric.label}
                  </Text>
                </View>
              ),
            )}
          </View>

          {busiestDay ? (
            <Text
              style={[
                styles.busiestText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              이번 달 가장 많이 방문한 날은 {getDateLabel(
                busiestDay.dateKey,
              )} · {busiestDay.count}회예요.
            </Text>
          ) : null}

          <View
            style={[
              styles.calendarCard,
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
              style={styles.weekdayRow}
            >
              {WEEKDAY_LABELS.map(
                (label) => (
                  <Text
                    key={label}
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
                ),
              )}
            </View>

            <View
              style={styles.calendarGrid}
            >
              {monthCells.map(
                (cell, index) => {
                  if (!cell) {
                    return (
                      <View
                        key={`blank-${index}`}
                        style={styles.dayCell}
                      />
                    );
                  }

                  const visitCount =
                    visitsByDate.get(
                      cell.dateKey,
                    )?.length ?? 0;
                  const selected =
                    selectedDateKey ===
                    cell.dateKey;
                  const today =
                    todayKey ===
                    cell.dateKey;

                  return (
                    <Pressable
                      key={cell.dateKey}
                      accessibilityRole="button"
                      accessibilityLabel={`${cell.day}일 ${visitCount}회 방문`}
                      onPress={() =>
                        setSelectedDateKey(
                          cell.dateKey,
                        )
                      }
                      style={({ pressed }) => [
                        styles.dayCell,
                        selected
                          ? {
                              borderColor:
                                theme.text,
                              borderWidth: 1,
                              borderRadius:
                                isCityBlack
                                  ? 2
                                  : 9,
                            }
                          : null,
                        {
                          opacity:
                            pressed
                              ? 0.55
                              : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          {
                            color:
                              selected ||
                              visitCount > 0
                                ? theme.text
                                : theme.subText,
                            fontWeight:
                              today ||
                              visitCount > 0
                                ? '900'
                                : '700',
                          },
                        ]}
                      >
                        {cell.day}
                      </Text>

                      {visitCount > 0 ? (
                        <View
                          style={[
                            styles.visitCountBadge,
                            {
                              borderColor:
                                theme.line,
                              borderRadius:
                                isCityBlack
                                  ? 2
                                  : 7,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.visitCountText,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {visitCount}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                },
              )}
            </View>
          </View>

          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {selectedDateKey
                  ? getDateLabel(
                      selectedDateKey,
                    )
                  : '날짜를 선택해 주세요'}
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
                {selectedDateKey
                  ? `${selectedVisitRows.length}개의 방문 기록`
                  : '캘린더 날짜를 누르면 그날의 기록을 볼 수 있어요.'}
              </Text>
            </View>
          </View>

          {selectedDateKey &&
          selectedVisitRows.length ===
            0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 3
                      : 12,
                },
              ]}
            >
              <Ionicons
                name="cafe-outline"
                size={21}
                color={theme.subText}
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
                이 날은 방문 기록이 없어요
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
                다른 날짜를 선택하거나 방문 기록을 새로 남겨보세요.
              </Text>
            </View>
          ) : (
            selectedVisitRows.map(
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
                      visit.placeId,
                    )
                  }
                  style={({ pressed }) => [
                    styles.visitCard,
                    {
                      backgroundColor:
                        theme.card,
                      borderColor:
                        theme.line,
                      borderRadius:
                        isCityBlack
                          ? 3
                          : 12,
                      opacity:
                        pressed
                          ? 0.55
                          : 1,
                    },
                  ]}
                >
                  <View
                    style={styles.visitTopRow}
                  >
                    <View
                      style={styles.visitTitleArea}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.visitCafeName,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {entry.cafe.name}
                      </Text>
                      <Text
                        style={[
                          styles.visitTime,
                          {
                            color:
                              theme.subText,
                          },
                        ]}
                      >
                        {getVisitTimeLabel(
                          visit.visitedAt,
                        )}
                      </Text>
                    </View>

                    {typeof visit.rating ===
                    'number' ? (
                      <View
                        style={styles.ratingRow}
                      >
                        <Ionicons
                          name="star"
                          size={13}
                          color={theme.text}
                        />
                        <Text
                          style={[
                            styles.ratingText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {visit.rating}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {visit.note.trim() ? (
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.visitNote,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {visit.note.trim()}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.visitNote,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      방문 메모 없음
                    </Text>
                  )}
                </Pressable>
              ),
            )
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="방문 기록 화면으로 이동"
            onPress={() =>
              router.push(
                '/place/saved-cafe-visits' as never,
              )
            }
            style={({ pressed }) => [
              styles.historyButton,
              {
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
              name="time-outline"
              size={15}
              color={theme.text}
            />
            <Text
              style={[
                styles.historyButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              전체 방문 기록 보기
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    header: {
      minHeight: 74,
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    headerButton: {
      width: 38,
      height: 38,
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
      fontSize: 16,
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 3,
      fontSize: 8.5,
      fontWeight: '700',
    },

    headerTextButton: {
      minWidth: 46,
      height: 34,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerTextButtonLabel: {
      fontSize: 9,
      fontWeight: '900',
    },

    centerState: {
      flex: 1,
      paddingHorizontal: 28,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    stateTitle: {
      marginTop: 3,
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'center',
    },

    stateText: {
      fontSize: 9,
      fontWeight: '700',
      lineHeight: 15,
      textAlign: 'center',
    },

    retryButton: {
      minHeight: 38,
      marginTop: 6,
      paddingHorizontal: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    retryButtonText: {
      fontSize: 9,
      fontWeight: '900',
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 16,
    },

    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    monthArrow: {
      width: 38,
      height: 38,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    monthTitleArea: {
      flex: 1,
      alignItems: 'center',
    },

    monthTitle: {
      fontSize: 15,
      fontWeight: '900',
    },

    monthSubtitle: {
      marginTop: 3,
      fontSize: 8.3,
      fontWeight: '700',
    },

    todayButton: {
      alignSelf: 'center',
      minHeight: 32,
      marginTop: 10,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    todayButtonText: {
      fontSize: 8.5,
      fontWeight: '900',
    },

    metricGrid: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    metricCard: {
      width: '48.7%',
      minHeight: 76,
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    metricValue: {
      marginTop: 7,
      fontSize: 16,
      fontWeight: '900',
    },

    metricLabel: {
      marginTop: 2,
      fontSize: 8.2,
      fontWeight: '800',
    },

    busiestText: {
      marginTop: 9,
      fontSize: 8.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    calendarCard: {
      marginTop: 14,
      padding: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    weekdayRow: {
      flexDirection: 'row',
    },

    weekdayLabel: {
      width: '14.2857%',
      paddingVertical: 5,
      textAlign: 'center',
      fontSize: 8,
      fontWeight: '900',
    },

    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },

    dayCell: {
      width: '14.2857%',
      height: 52,
      paddingTop: 5,
      alignItems: 'center',
    },

    dayNumber: {
      fontSize: 9.5,
    },

    visitCountBadge: {
      minWidth: 20,
      height: 17,
      marginTop: 5,
      paddingHorizontal: 4,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    visitCountText: {
      fontSize: 7.5,
      fontWeight: '900',
    },

    sectionHeader: {
      marginTop: 20,
      marginBottom: 9,
    },

    sectionTitle: {
      fontSize: 12,
      fontWeight: '900',
    },

    sectionSubtitle: {
      marginTop: 3,
      fontSize: 8.3,
      fontWeight: '700',
    },

    emptyCard: {
      minHeight: 120,
      padding: 18,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      marginTop: 8,
      fontSize: 10.5,
      fontWeight: '900',
    },

    emptyDescription: {
      marginTop: 4,
      fontSize: 8.3,
      fontWeight: '700',
      textAlign: 'center',
    },

    visitCard: {
      minHeight: 80,
      marginBottom: 8,
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    visitTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    visitTitleArea: {
      flex: 1,
      minWidth: 0,
    },

    visitCafeName: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    visitTime: {
      marginTop: 3,
      fontSize: 8,
      fontWeight: '700',
    },

    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    ratingText: {
      fontSize: 9,
      fontWeight: '900',
    },

    visitNote: {
      marginTop: 9,
      fontSize: 8.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    historyButton: {
      minHeight: 42,
      marginTop: 14,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    historyButtonText: {
      fontSize: 9.5,
      fontWeight: '900',
    },
  });
