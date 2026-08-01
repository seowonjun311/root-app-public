import {
    router,
    useLocalSearchParams,
} from 'expo-router';

import {
    useEffect,
    useState,
} from 'react';

import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {
    getMissionDifficultyLabel,
    getMondayKey,
    getWeeklyCrewMissions,
} from '../store/crewMissions';

import {
    getRootCrews,
    subscribeRootCrewPosts,
    subscribeRootCrews,
} from '../store/rootMemory';

import {
    useRootTheme,
} from '../store/rootTheme';

function formatLocalDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function convertToDate(
  value: any
): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isFinite(
      value.getTime()
    )
      ? value
      : null;
  }

  if (
    typeof value?.toDate ===
    'function'
  ) {
    const converted =
      value.toDate();

    return Number.isFinite(
      converted?.getTime?.()
    )
      ? converted
      : null;
  }

  if (
    typeof value?.seconds ===
    'number'
  ) {
    const converted =
      new Date(
        value.seconds * 1000
      );

    return Number.isFinite(
      converted.getTime()
    )
      ? converted
      : null;
  }

  const converted =
    new Date(value);

  return Number.isFinite(
    converted.getTime()
  )
    ? converted
    : null;
}

function getPostDate(
  post: any
) {
  return convertToDate(
    post?.date ??
      post?.createdAt ??
      null
  );
}

function getPostDateKey(
  post: any
) {
  const rawValue =
    post?.date ??
    post?.createdAt ??
    '';

  if (
    typeof rawValue ===
      'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(
      rawValue
    )
  ) {
    return rawValue.slice(
      0,
      10
    );
  }

  const date =
    getPostDate(post);

  return date
    ? formatLocalDateKey(date)
    : '';
}

function normalizeCrewCategory(
  value: any
) {
  const category = String(
    value ?? ''
  ).trim();

  if (
    category === 'exercise' ||
    category === '운동'
  ) {
    return 'exercise';
  }

  if (
    category === 'study' ||
    category === '공부'
  ) {
    return 'study';
  }

  if (
    category === 'mental' ||
    category === '정신'
  ) {
    return 'mental';
  }

  if (
    category === 'daily' ||
    category === '일상' ||
    category === '일'
  ) {
    return 'daily';
  }

  return category;
}

export default function CrewMissionsScreen() {
  const {
    themeMode,
    theme,
  } = useRootTheme();

  const isCityBlack =
    themeMode ===
    'cityBlack';

  const params =
    useLocalSearchParams<{
      id?: string;
    }>();

  const crewId = String(
    params?.id ?? ''
  );

  const [
    selectedCrew,
    setSelectedCrew,
  ] = useState<any>(null);

  const [
    crewPosts,
    setCrewPosts,
  ] = useState<any[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    showMissionGuide,
    setShowMissionGuide,
  ] = useState(false);

  useEffect(() => {
    const localCrew =
      getRootCrews().find(
        (crew: any) =>
          String(
            crew?.id ?? ''
          ) === crewId
      );

    if (localCrew) {
      setSelectedCrew(
        localCrew
      );

      setLoading(false);
    }

    const unsubscribeCrews =
      subscribeRootCrews(
        (crews) => {
          const foundCrew =
            crews.find(
              (crew: any) =>
                String(
                  crew?.id ?? ''
                ) === crewId
            );

          setSelectedCrew(
            foundCrew ??
              localCrew ??
              null
          );

          setLoading(false);
        }
      );

    const unsubscribePosts =
      subscribeRootCrewPosts(
        (posts) => {
          setCrewPosts(
            Array.isArray(posts)
              ? posts
              : []
          );
        }
      );

    return () => {
      unsubscribeCrews?.();
      unsubscribePosts?.();
    };
  }, [crewId]);

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.text,
            },
          ]}
        >
          크루미션을 불러오는 중이에요.
        </Text>
      </View>
    );
  }

  if (!selectedCrew) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.text,
            },
          ]}
        >
          크루 정보를 찾을 수 없어요.
        </Text>

        <Pressable
          style={[
            styles.backButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 4
                  : 12,
            },
          ]}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={[
              styles.backButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            뒤로가기
          </Text>
        </Pressable>
      </View>
    );
  }

  const selectedCrewPosts =
    crewPosts
      .filter(Boolean)
      .filter(
        (post: any) => {
          const postCrewId =
            String(
              post?.crewId ?? ''
            );

          const sharedCrewId =
            String(
              post?.sharedCrewId ??
                ''
            );

          return (
            (postCrewId ===
              crewId ||
              sharedCrewId ===
                crewId) &&
            post?.status !==
              'hidden'
          );
        }
      );

  /*
   * 매주 월요일 00:00부터
   * 다음 월요일 00:00 전까지의
   * 기록만 이번 주 미션에 반영합니다.
   */
  const mondayKey =
    getMondayKey();

  const [
    mondayYear,
    mondayMonth,
    mondayDay,
  ] = mondayKey
    .split('-')
    .map(Number);

  const weekStartTime =
    new Date(
      mondayYear,
      mondayMonth - 1,
      mondayDay,
      0,
      0,
      0,
      0
    ).getTime();

  const weekEndTime =
    weekStartTime +
    7 *
      24 *
      60 *
      60 *
      1000;

  const weeklyCrewPosts =
    selectedCrewPosts.filter(
      (post: any) => {
        const postDate =
          getPostDate(post);

        if (!postDate) {
          return false;
        }

        const postTime =
          postDate.getTime();

        return (
          postTime >=
            weekStartTime &&
          postTime <
            weekEndTime
        );
      }
    );

  const weeklyPostCount =
    weeklyCrewPosts.length;

  const weeklyTotalMinutes =
    weeklyCrewPosts.reduce(
      (
        sum: number,
        post: any
      ) =>
        sum +
        Number(
          post?.minutes ?? 0
        ),
      0
    );

  const weeklyCheerCount =
    weeklyCrewPosts.reduce(
      (
        sum: number,
        post: any
      ) =>
        sum +
        Number(
          post?.cheers ?? 0
        ),
      0
    );

  const weeklyCommentCount =
    weeklyCrewPosts.reduce(
      (
        sum: number,
        post: any
      ) =>
        sum +
        Number(
          post?.comments
            ?.length ?? 0
        ),
      0
    );

  const weeklyPhotoPostCount =
    weeklyCrewPosts.filter(
      (post: any) =>
        post?.photoUri ||
        post?.photo_url
    ).length;

  const weeklyActiveUserCount =
    new Set(
      weeklyCrewPosts
        .map(
          (post: any) =>
            String(
              post?.userId ??
                post?.nickname ??
                ''
            )
        )
        .filter(Boolean)
    ).size;

  const todayKey =
    formatLocalDateKey(
      new Date()
    );

  const todayAttendanceCount =
    new Set(
      selectedCrewPosts
        .filter(
          (post: any) =>
            getPostDateKey(
              post
            ) === todayKey
        )
        .map(
          (post: any) =>
            String(
              post?.userId ??
                post?.nickname ??
                ''
            )
        )
        .filter(Boolean)
    ).size;

  const getMissionCurrentValue =
    (mission: any) => {
      if (
        mission.type ===
        'post'
      ) {
        return weeklyPostCount;
      }

      if (
        mission.type ===
        'minutes'
      ) {
        return weeklyTotalMinutes;
      }

      if (
        mission.type ===
        'photo'
      ) {
        return weeklyPhotoPostCount;
      }

      if (
        mission.type ===
        'cheer'
      ) {
        return weeklyCheerCount;
      }

      if (
        mission.type ===
        'comment'
      ) {
        return weeklyCommentCount;
      }

      if (
        mission.type ===
        'activeUser'
      ) {
        return weeklyActiveUserCount;
      }

      if (
        mission.type ===
        'todayAttendance'
      ) {
        return todayAttendanceCount;
      }

      if (
        mission.type ===
        'categoryPost'
      ) {
        return weeklyCrewPosts.filter(
          (post: any) =>
            normalizeCrewCategory(
              post?.category
            ) ===
            normalizeCrewCategory(
              mission?.category
            )
        ).length;
      }

      return 0;
    };

  const crewMissions =
    getWeeklyCrewMissions(
      crewId
    )
      .filter(Boolean)
      .map(
        (mission: any) => ({
          ...mission,

          current:
            getMissionCurrentValue(
              mission
            ),
        })
      );

  const completedMissionCount =
    crewMissions.filter(
      (mission: any) =>
        Number(
          mission?.current ?? 0
        ) >=
        Number(
          mission?.target ?? 0
        )
    ).length;

  const completedMissionExp =
    crewMissions
      .filter(
        (mission: any) =>
          Number(
            mission?.current ??
              0
          ) >=
          Number(
            mission?.target ??
              0
          )
      )
      .reduce(
        (
          sum: number,
          mission: any
        ) =>
          sum +
          Number(
            mission?.exp ?? 0
          ),
        0
      );

  return (
    <>
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor:
              theme.background,
          },
        ]}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Pressable
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={[
              styles.backText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            ← 내 크루 돌아가기
          </Text>
        </Pressable>

        <View
          style={[
            styles.summarySection,
            {
              borderColor:
                theme.line,
            },
          ]}
        >
          <View
            style={
              styles.summaryRow
            }
          >
            <Text
              style={[
                styles.summaryText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              이번 주 미션{' '}
              {completedMissionCount}
              {' / '}
              {crewMissions.length}
            </Text>

            <Pressable
              style={[
                styles.helpButton,
                {
                  borderColor:
                    theme.line,
                },
              ]}
              onPress={() =>
                setShowMissionGuide(
                  true
                )
              }
              hitSlop={8}
            >
              <Text
                style={[
                  styles.helpButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                ?
              </Text>
            </Pressable>
          </View>

          <Text
            style={[
              styles.expText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            이번 주 획득 EXP:{' '}
            {completedMissionExp}
          </Text>
        </View>

        <View
          style={[
            styles.missionList,
            {
              borderColor:
                theme.line,
            },
          ]}
        >
          {crewMissions.map(
            (
              mission: any,
              index: number
            ) => {
              const target =
                Number(
                  mission?.target ??
                    0
                );

              const current =
                Number(
                  mission?.current ??
                    0
                );

              const completed =
                target > 0 &&
                current >= target;

              return (
                <View
                  key={String(
                    mission?.id ??
                      mission?.title ??
                      index
                  )}
                  style={[
                    styles.missionRow,

                    index <
                      crewMissions.length -
                        1 && {
                      borderBottomWidth:
                        0.5,

                      borderBottomColor:
                        theme.line,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.missionInfoText,
                      {
                        color:
                          completed
                            ? theme.text
                            : theme.subText,
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {mission?.icon}{' '}
                    {mission?.title}
                    {' / '}
                    {getMissionDifficultyLabel(
                      mission?.difficulty
                    )}
                    {' / +'}
                    {mission?.exp}
                    EXP
                  </Text>

                  <Text
                    style={[
                      styles.missionProgressText,
                      {
                        color:
                          completed
                            ? theme.text
                            : theme.subText,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {Math.min(
                      current,
                      target
                    )}
                    /{target}
                    {mission?.unit}
                  </Text>
                </View>
              );
            }
          )}
        </View>
      </ScrollView>

      <Modal
        visible={
          showMissionGuide
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMissionGuide(
            false
          )
        }
      >
        <Pressable
          style={
            styles.guideOverlay
          }
          onPress={() =>
            setShowMissionGuide(
              false
            )
          }
        >
          <Pressable
            style={[
              styles.guideModalBox,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 4
                    : 16,
              },
            ]}
            onPress={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <Text
              style={[
                styles.guideModalTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              크루미션 안내
            </Text>

            <Text
              style={[
                styles.guideModalText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              매주 월요일마다 새로운 미션 15개가 자동으로 선정돼요.
            </Text>

            <Pressable
              style={[
                styles.guideCloseButton,
                {
                  borderColor:
                    theme.line,

                  borderRadius:
                    isCityBlack
                      ? 4
                      : 10,
                },
              ]}
              onPress={() =>
                setShowMissionGuide(
                  false
                )
              }
            >
              <Text
                style={[
                  styles.guideCloseText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                확인
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 48,
      paddingBottom: 80,
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },

    loadingText: {
      fontSize: 17,
      fontWeight: '900',
      textAlign: 'center',
    },

    backText: {
      marginBottom: 16,
      fontSize: 15,
      fontWeight: '900',
    },

    backButton: {
      marginTop: 20,
      minHeight: 40,
      paddingHorizontal: 18,
      borderWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
    },

    backButtonText: {
      fontSize: 14,
      fontWeight: '900',
    },

    summarySection: {
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      paddingVertical: 13,
    },

    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    summaryText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '900',
    },

    helpButton: {
      width: 25,
      height: 25,
      borderWidth: 0.5,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },

    helpButtonText: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '900',
      textAlign: 'center',
    },

    expText: {
      marginTop: 9,
      fontSize: 13,
      fontWeight: '900',
    },

    missionList: {
      marginTop: 13,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
    },

    missionRow: {
      minHeight: 43,
      paddingHorizontal: 4,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },

    missionInfoText: {
      flex: 1,
      minWidth: 0,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '900',
    },

    missionProgressText: {
      minWidth: 64,
      marginLeft: 8,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '900',
      textAlign: 'right',
    },

    guideOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },

    guideModalBox: {
      width: '100%',
      borderWidth: 0.5,
      padding: 17,
    },

    guideModalTitle: {
      fontSize: 17,
      fontWeight: '900',
    },

    guideModalText: {
      marginTop: 10,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '800',
    },

    guideCloseButton: {
      marginTop: 16,
      minHeight: 36,
      borderWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
    },

    guideCloseText: {
      fontSize: 12,
      fontWeight: '900',
    },
  });
