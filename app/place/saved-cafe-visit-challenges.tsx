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

// SAVED_CAFE_V44_VISIT_CHALLENGES_SCREEN

const FREQUENT_VISIT_COUNT = 3;

type IconName =
  ComponentProps<
    typeof Ionicons
  >['name'];

type ChallengeGroup =
  | 'visit'
  | 'record'
  | 'taste';

type Challenge = {
  id: string;
  group: ChallengeGroup;
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  icon: IconName;
};

const GROUP_META: Record<
  ChallengeGroup,
  {
    title: string;
    subtitle: string;
    icon: IconName;
  }
> = {
  visit: {
    title: '방문 도전',
    subtitle:
      '새로운 카페와 재방문 기록을 쌓아보세요.',
    icon: 'walk-outline',
  },
  record: {
    title: '기록 도전',
    subtitle:
      '별점과 메모로 나만의 카페 기록을 채워요.',
    icon: 'create-outline',
  },
  taste: {
    title: '취향 도전',
    subtitle:
      '다양한 테마와 방문 패턴을 발견해요.',
    icon: 'sparkles-outline',
  },
};

function parseTime(
  value: string,
) {
  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
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

function getProgress(
  current: number,
  target: number,
) {
  if (target <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      current / target,
    ),
  );
}

function getProgressPercent(
  current: number,
  target: number,
) {
  return Math.round(
    getProgress(
      current,
      target,
    ) * 100,
  );
}

function isUnlocked(
  challenge: Challenge,
) {
  return (
    challenge.current >=
    challenge.target
  );
}

export default function SavedCafeVisitChallengesScreen() {
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

          setEntries(
            nextEntries,
          );
          setVisitState(
            nextVisitState,
          );
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE VISIT CHALLENGES LOAD ERROR',
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

  const visitedCafeIds =
    useMemo(
      () =>
        new Set(
          validVisits.map(
            (visit) =>
              visit.placeId,
          ),
        ),
      [validVisits],
    );

  const visitCounts =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >();

      validVisits.forEach(
        (visit) => {
          map.set(
            visit.placeId,
            (
              map.get(
                visit.placeId,
              ) ?? 0
            ) + 1,
          );
        },
      );

      return map;
    }, [validVisits]);

  const frequentCafeCount =
    useMemo(
      () =>
        Array.from(
          visitCounts.values(),
        ).filter(
          (count) =>
            count >=
            FREQUENT_VISIT_COUNT,
        ).length,
      [visitCounts],
    );

  const revisitCount =
    Math.max(
      0,
      validVisits.length -
        visitedCafeIds.size,
    );

  const ratedVisitCount =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            typeof visit.rating ===
            'number',
        ).length,
      [validVisits],
    );

  const noteVisitCount =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            visit.note
              .trim()
              .length > 0,
        ).length,
      [validVisits],
    );

  const fiveStarVisitCount =
    useMemo(
      () =>
        validVisits.filter(
          (visit) =>
            visit.rating === 5,
        ).length,
      [validVisits],
    );

  const visitedThemeCount =
    useMemo(() => {
      const themes =
        new Set<string>();

      visitedCafeIds.forEach(
        (placeId) => {
          const entry =
            entryMap.get(
              placeId,
            );

          if (entry) {
            themes.add(
              entry.cafe
                .primaryTheme,
            );
          }
        },
      );

      return themes.size;
    }, [
      entryMap,
      visitedCafeIds,
    ]);

  const weekdayCount =
    useMemo(() => {
      const weekdays =
        new Set<number>();

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
            weekdays.add(
              date.getDay(),
            );
          }
        },
      );

      return weekdays.size;
    }, [validVisits]);

  const monthVisitCount =
    useMemo(() => {
      const now =
        new Date();

      return validVisits.filter(
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
              now.getFullYear() &&
            date.getMonth() ===
              now.getMonth()
          );
        },
      ).length;
    }, [validVisits]);

  const challenges =
    useMemo<Challenge[]>(
      () => [
        {
          id: 'first-visit',
          group: 'visit',
          title: '첫 카페 발자국',
          description:
            '저장한 카페에서 첫 방문 기록을 남겨보세요.',
          current:
            validVisits.length,
          target: 1,
          unit: '회',
          icon:
            'footsteps-outline',
        },
        {
          id: 'five-visits',
          group: 'visit',
          title: '카페 산책가',
          description:
            '카페 방문 기록을 5회 쌓아요.',
          current:
            validVisits.length,
          target: 5,
          unit: '회',
          icon:
            'walk-outline',
        },
        {
          id: 'three-cafes',
          group: 'visit',
          title: '카페 탐험가',
          description:
            '서로 다른 카페 3곳을 방문해요.',
          current:
            visitedCafeIds.size,
          target: 3,
          unit: '곳',
          icon:
            'map-outline',
        },
        {
          id: 'ten-cafes',
          group: 'visit',
          title: '카페 수집가',
          description:
            '서로 다른 카페 10곳에 발자국을 남겨요.',
          current:
            visitedCafeIds.size,
          target: 10,
          unit: '곳',
          icon:
            'albums-outline',
        },
        {
          id: 'regular',
          group: 'visit',
          title: '나만의 단골집',
          description:
            '한 카페를 3회 이상 방문해 단골 카페를 만들어요.',
          current:
            frequentCafeCount,
          target: 1,
          unit: '곳',
          icon:
            'repeat-outline',
        },
        {
          id: 'revisit-five',
          group: 'visit',
          title: '다시 찾는 이유',
          description:
            '재방문 기록을 5회 쌓아보세요.',
          current:
            revisitCount,
          target: 5,
          unit: '회',
          icon:
            'refresh-outline',
        },
        {
          id: 'rated-five',
          group: 'record',
          title: '별점 기록가',
          description:
            '방문 기록 5개에 별점을 남겨요.',
          current:
            ratedVisitCount,
          target: 5,
          unit: '개',
          icon:
            'star-outline',
        },
        {
          id: 'note-five',
          group: 'record',
          title: '카페 한 줄 일기',
          description:
            '방문 메모를 5번 남겨 기억을 쌓아요.',
          current:
            noteVisitCount,
          target: 5,
          unit: '개',
          icon:
            'create-outline',
        },
        {
          id: 'five-star-three',
          group: 'record',
          title: '취향 확신',
          description:
            '별점 5점 방문 기록을 3개 만들어요.',
          current:
            fiveStarVisitCount,
          target: 3,
          unit: '개',
          icon:
            'heart-outline',
        },
        {
          id: 'theme-three',
          group: 'taste',
          title: '취향 넓히기',
          description:
            '서로 다른 대표 테마 3개를 방문해요.',
          current:
            visitedThemeCount,
          target: 3,
          unit: '개',
          icon:
            'sparkles-outline',
        },
        {
          id: 'weekday-five',
          group: 'taste',
          title: '요일 탐험',
          description:
            '서로 다른 요일 5일에 카페를 방문해요.',
          current:
            weekdayCount,
          target: 5,
          unit: '일',
          icon:
            'calendar-outline',
        },
        {
          id: 'month-three',
          group: 'taste',
          title: '이번 달 카페데이',
          description:
            '이번 달 카페 방문을 3회 기록해요.',
          current:
            monthVisitCount,
          target: 3,
          unit: '회',
          icon:
            'today-outline',
        },
        {
          id: 'master-thirty',
          group: 'taste',
          title: 'ROOT 카페 마스터',
          description:
            '누적 카페 방문 30회를 달성해요.',
          current:
            validVisits.length,
          target: 30,
          unit: '회',
          icon:
            'trophy-outline',
        },
      ],
      [
        fiveStarVisitCount,
        frequentCafeCount,
        monthVisitCount,
        noteVisitCount,
        ratedVisitCount,
        revisitCount,
        validVisits.length,
        visitedCafeIds.size,
        visitedThemeCount,
        weekdayCount,
      ],
    );

  const unlockedChallenges =
    useMemo(
      () =>
        challenges.filter(
          isUnlocked,
        ),
      [challenges],
    );

  const nextChallenge =
    useMemo(
      () =>
        challenges
          .filter(
            (challenge) =>
              !isUnlocked(
                challenge,
              ),
          )
          .sort(
            (first, second) =>
              getProgress(
                second.current,
                second.target,
              ) -
              getProgress(
                first.current,
                first.target,
              ),
          )[0] ?? null,
      [challenges],
    );

  const completionPercent =
    challenges.length > 0
      ? Math.round(
          (
            unlockedChallenges.length /
            challenges.length
          ) * 100,
        )
      : 0;

  const challengeGroups =
    useMemo(
      () =>
        (
          [
            'visit',
            'record',
            'taste',
          ] as const
        ).map(
          (group) => ({
            group,
            challenges:
              challenges.filter(
                (challenge) =>
                  challenge.group ===
                  group,
              ),
          }),
        ),
      [challenges],
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
            카페 방문 도전
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
            방문 기록을 ROOT식 작은 도전으로 이어가요.
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
          <Ionicons
            name="analytics-outline"
            size={14}
            color={theme.text}
          />
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
            카페 도전 진행도를 계산하고 있어요.
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
            방문 도전을 불러오지 못했어요.
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
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + 32,
            },
          ]}
        >
          <View
            style={[
              styles.heroCard,
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
              style={[
                styles.heroIcon,
                {
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 12,
                },
              ]}
            >
              <Ionicons
                name="trophy-outline"
                size={25}
                color={theme.text}
              />
            </View>

            <View
              style={styles.heroTextArea}
            >
              <Text
                style={[
                  styles.heroEyebrow,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                ROOT 카페 도전 진행도
              </Text>
              <Text
                style={[
                  styles.heroValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {unlockedChallenges.length}/{challenges.length} 완료
              </Text>
              <Text
                style={[
                  styles.heroDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문 횟수, 재방문, 별점, 메모와 취향 다양성을 함께 기록해요.
              </Text>
            </View>

            <Text
              style={[
                styles.heroPercent,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {completionPercent}%
            </Text>

            <View
              style={[
                styles.heroProgressTrack,
                {
                  backgroundColor:
                    theme.background,
                },
              ]}
            >
              <View
                style={[
                  styles.heroProgressFill,
                  {
                    backgroundColor:
                      theme.text,
                    width:
                      `${completionPercent}%`,
                  },
                ]}
              />
            </View>
          </View>

          {nextChallenge ? (
            <View
              style={[
                styles.nextCard,
                {
                  borderColor:
                    theme.line,
                  backgroundColor:
                    theme.card,
                  borderRadius:
                    isCityBlack
                      ? 3
                      : 14,
                },
              ]}
            >
              <View
                style={styles.nextHeader}
              >
                <View
                  style={[
                    styles.nextIcon,
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
                    name={nextChallenge.icon}
                    size={18}
                    color={theme.text}
                  />
                </View>

                <View
                  style={styles.nextTextArea}
                >
                  <Text
                    style={[
                      styles.nextLabel,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    다음 달성에 가까운 도전
                  </Text>
                  <Text
                    style={[
                      styles.nextTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {nextChallenge.title}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.nextValue,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {Math.min(
                    nextChallenge.current,
                    nextChallenge.target,
                  )}
                  /{nextChallenge.target}
                  {nextChallenge.unit}
                </Text>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor:
                      theme.background,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor:
                        theme.text,
                      width:
                        `${getProgressPercent(
                          nextChallenge.current,
                          nextChallenge.target,
                        )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.nextCard,
                {
                  borderColor:
                    theme.line,
                  backgroundColor:
                    theme.card,
                  borderRadius:
                    isCityBlack
                      ? 3
                      : 14,
                },
              ]}
            >
              <View
                style={styles.allCompleteRow}
              >
                <Ionicons
                  name="ribbon-outline"
                  size={25}
                  color={theme.text}
                />
                <View
                  style={styles.nextTextArea}
                >
                  <Text
                    style={[
                      styles.nextTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    모든 카페 도전을 달성했어요
                  </Text>
                  <Text
                    style={[
                      styles.nextDescription,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    방문 기록은 계속 쌓이며 다음 도전 확장에 활용할 수 있어요.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {challengeGroups.map(
            ({
              group,
              challenges:
                groupChallenges,
            }) => {
              const meta =
                GROUP_META[group];

              const groupUnlocked =
                groupChallenges.filter(
                  isUnlocked,
                ).length;

              return (
                <View
                  key={group}
                >
                  <View
                    style={
                      styles.sectionHeader
                    }
                  >
                    <View
                      style={styles.sectionTitleRow}
                    >
                      <Ionicons
                        name={meta.icon}
                        size={16}
                        color={theme.text}
                      />
                      <Text
                        style={[
                          styles.sectionTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {meta.title}
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
                        {groupUnlocked}/{groupChallenges.length}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.sectionSubtitle,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {meta.subtitle}
                    </Text>
                  </View>

                  <View
                    style={styles.stack}
                  >
                    {groupChallenges.map(
                      (challenge) => (
                        <ChallengeCard
                          key={
                            challenge.id
                          }
                          challenge={
                            challenge
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
              );
            },
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 방문 기록으로 이동"
            onPress={() =>
              router.push(
                '/place/saved-cafe-visits' as never,
              )
            }
            style={({ pressed }) => [
              styles.visitButton,
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
              name="add-circle-outline"
              size={17}
              color={theme.text}
            />
            <Text
              style={[
                styles.visitButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              방문 기록 더 쌓기
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function ChallengeCard({
  challenge,
  theme,
  isCityBlack,
}: {
  challenge: Challenge;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
}) {
  const unlocked =
    isUnlocked(
      challenge,
    );

  const percent =
    getProgressPercent(
      challenge.current,
      challenge.target,
    );

  return (
    <View
      style={[
        styles.challengeCard,
        {
          borderColor:
            theme.line,
          backgroundColor:
            theme.card,
          borderRadius:
            isCityBlack
              ? 3
              : 13,
        },
      ]}
    >
      <View
        style={[
          styles.challengeIcon,
          {
            borderColor:
              theme.line,
            backgroundColor:
              unlocked
                ? theme.background
                : 'transparent',
            borderRadius:
              isCityBlack
                ? 2
                : 11,
          },
        ]}
      >
        <Ionicons
          name={
            unlocked
              ? 'checkmark-circle-outline'
              : challenge.icon
          }
          size={20}
          color={
            unlocked
              ? theme.text
              : theme.subText
          }
        />
      </View>

      <View
        style={styles.challengeTextArea}
      >
        <View
          style={styles.challengeTitleRow}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.challengeTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {challenge.title}
          </Text>
          <Text
            style={[
              styles.challengeStatus,
              {
                color:
                  unlocked
                    ? theme.text
                    : theme.subText,
              },
            ]}
          >
            {unlocked
              ? '완료'
              : `${percent}%`}
          </Text>
        </View>

        <Text
          style={[
            styles.challengeDescription,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {challenge.description}
        </Text>

        <View
          style={styles.challengeProgressRow}
        >
          <View
            style={[
              styles.challengeProgressTrack,
              {
                backgroundColor:
                  theme.background,
              },
            ]}
          >
            <View
              style={[
                styles.challengeProgressFill,
                {
                  backgroundColor:
                    theme.text,
                  width:
                    `${percent}%`,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.challengeProgressValue,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {Math.min(
              challenge.current,
              challenge.target,
            )}
            /{challenge.target}
            {challenge.unit}
          </Text>
        </View>
      </View>
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

  heroCard: {
    padding: 15,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 11,
  },

  heroIcon: {
    width: 44,
    height: 44,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTextArea: {
    flex: 1,
    minWidth: 180,
  },

  heroEyebrow: {
    fontSize: 8.5,
    fontWeight: '900',
  },

  heroValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
  },

  heroDescription: {
    marginTop: 5,
    fontSize: 9.2,
    fontWeight: '700',
    lineHeight: 15,
  },

  heroPercent: {
    fontSize: 14,
    fontWeight: '900',
  },

  heroProgressTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
  },

  heroProgressFill: {
    height: '100%',
  },

  nextCard: {
    marginTop: 10,
    padding: 12,
    borderWidth:
      StyleSheet.hairlineWidth,
  },

  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  nextIcon: {
    width: 36,
    height: 36,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextTextArea: {
    flex: 1,
    minWidth: 0,
  },

  nextLabel: {
    fontSize: 8,
    fontWeight: '800',
  },

  nextTitle: {
    marginTop: 3,
    fontSize: 11.5,
    fontWeight: '900',
  },

  nextDescription: {
    marginTop: 4,
    fontSize: 8.8,
    fontWeight: '700',
    lineHeight: 14,
  },

  nextValue: {
    fontSize: 10,
    fontWeight: '900',
  },

  progressTrack: {
    height: 5,
    marginTop: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
  },

  allCompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },

  sectionCount: {
    marginLeft: 'auto',
    fontSize: 9,
    fontWeight: '900',
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 8.8,
    fontWeight: '700',
  },

  stack: {
    gap: 7,
  },

  challengeCard: {
    minHeight: 96,
    padding: 11,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  challengeIcon: {
    width: 40,
    height: 40,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  challengeTextArea: {
    flex: 1,
    minWidth: 0,
  },

  challengeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  challengeTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: '900',
  },

  challengeStatus: {
    fontSize: 8.5,
    fontWeight: '900',
  },

  challengeDescription: {
    marginTop: 4,
    fontSize: 8.8,
    fontWeight: '700',
    lineHeight: 14,
  },

  challengeProgressRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  challengeProgressTrack: {
    flex: 1,
    height: 5,
    overflow: 'hidden',
  },

  challengeProgressFill: {
    height: '100%',
  },

  challengeProgressValue: {
    minWidth: 52,
    textAlign: 'right',
    fontSize: 8,
    fontWeight: '900',
  },

  visitButton: {
    minHeight: 42,
    marginTop: 20,
    paddingHorizontal: 12,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  visitButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
});
