import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
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
  getRootCrewLevelByMinutes,
  getRootCrewMemberLimitByLevel,
  getRootCrews,
  getRootOnboardingData,
  loadRootCrewPosts,
  loadRootCrews,
  subscribeRootCrewPosts,
  subscribeRootCrews,
  transferRootCrewOwnership,
} from '../store/rootMemory';

import {
  useRootTheme,
} from '../store/rootTheme';

function getParam(
  value:
    | string
    | string[]
    | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function formatRankingTime(
  minutes: number
) {
  const safeMinutes =
    Math.max(
      0,
      Math.floor(
        Number(minutes) || 0
      )
    );

  const hour =
    Math.floor(
      safeMinutes / 60
    );

  const minute =
    safeMinutes % 60;

  if (hour <= 0) {
    return `${minute}분`;
  }

  if (minute <= 0) {
    return `${hour}시간`;
  }

  return `${hour}시간 ${minute}분`;
}

function getRankingMark(
  index: number
) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';

  return `${index + 1}`;
}

export default function CrewMembersScreen() {
  const {
    themeMode,
    theme,
  } = useRootTheme();

  const isCityBlack =
    themeMode ===
    'cityBlack';

  const params =
    useLocalSearchParams<{
      id?:
        | string
        | string[];

      transfer?:
        | string
        | string[];
    }>();

  const crewId =
    getParam(
      params.id
    ) ?? '';

  const transferMode =
    getParam(
      params.transfer
    ) === '1';

  const [
    selectedCrew,
    setSelectedCrew,
  ] = useState<any>(
    null
  );

  const [
    crewPosts,
    setCrewPosts,
  ] = useState<any[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    showGuideModal,
    setShowGuideModal,
  ] = useState(false);

  const [
    showMemberModal,
    setShowMemberModal,
  ] = useState(false);

  const [
    memberSearchText,
    setMemberSearchText,
  ] = useState('');

  const [
    transferTarget,
    setTransferTarget,
  ] = useState<any>(
    null
  );

  const [
    transferLoading,
    setTransferLoading,
  ] = useState(false);

  const [
    transferModeOpened,
    setTransferModeOpened,
  ] = useState(false);

  const [
    noticeModal,
    setNoticeModal,
  ] = useState<{
    title: string;
    message: string;
  } | null>(
    null
  );

  const userProfile =
    getRootOnboardingData();

  const userId =
    String(
      userProfile?.uid ??
        userProfile?.guestId ??
        'guest'
    );

  useEffect(() => {
    let mounted = true;

    const localCrew =
      getRootCrews().find(
        (crew: any) =>
          String(
            crew?.id ?? ''
          ) ===
          String(crewId)
      );

    if (localCrew) {
      setSelectedCrew(
        localCrew
      );

      setLoading(false);
    }

    const loadData =
      async () => {
        try {
          const [
            crews,
            posts,
          ] =
            await Promise.all([
              loadRootCrews(),
              loadRootCrewPosts(),
            ]);

          if (!mounted) {
            return;
          }

          const foundCrew =
            (
              crews ?? []
            ).find(
              (
                crew: any
              ) =>
                String(
                  crew?.id ??
                    ''
                ) ===
                String(
                  crewId
                )
            );

          setSelectedCrew(
            foundCrew ??
              localCrew ??
              null
          );

          setCrewPosts(
            Array.isArray(
              posts
            )
              ? posts
              : []
          );
        } catch (
          error
        ) {
          console.log(
            'CREW MEMBERS LOAD ERROR',
            error
          );

          if (!mounted) {
            return;
          }

          setSelectedCrew(
            localCrew ??
              null
          );
        } finally {
          if (mounted) {
            setLoading(
              false
            );
          }
        }
      };

    loadData();

    const unsubscribeCrews =
      subscribeRootCrews(
        (
          crews
        ) => {
          if (!mounted) {
            return;
          }

          const foundCrew =
            (
              crews ?? []
            ).find(
              (
                crew: any
              ) =>
                String(
                  crew?.id ??
                    ''
                ) ===
                String(
                  crewId
                )
            );

          setSelectedCrew(
            foundCrew ??
              localCrew ??
              null
          );

          setLoading(
            false
          );
        }
      );

    const unsubscribePosts =
      subscribeRootCrewPosts(
        (
          posts
        ) => {
          if (!mounted) {
            return;
          }

          setCrewPosts(
            Array.isArray(
              posts
            )
              ? posts
              : []
          );
        }
      );

    return () => {
      mounted = false;

      unsubscribeCrews?.();
      unsubscribePosts?.();
    };
  }, [
    crewId,
  ]);

  useEffect(() => {
    if (
      !transferMode ||
      !selectedCrew ||
      transferModeOpened
    ) {
      return;
    }

    setShowMemberModal(
      true
    );

    setTransferModeOpened(
      true
    );
  }, [
    transferMode,
    selectedCrew,
    transferModeOpened,
  ]);

  const selectedCrewId =
    String(
      selectedCrew?.id ??
        ''
    );

  const isOwner =
    String(
      selectedCrew?.ownerId ??
        ''
    ) ===
    userId;

  const selectedCrewPosts =
    useMemo(
      () =>
        crewPosts
          .filter(
            Boolean
          )
          .filter(
            (
              post: any
            ) => {
              const isThisCrew =
                String(
                  post?.crewId ??
                    ''
                ) ===
                  selectedCrewId ||
                String(
                  post
                    ?.sharedCrewId ??
                    ''
                ) ===
                  selectedCrewId;

              return (
                isThisCrew &&
                post?.status !==
                  'hidden'
              );
            }
          ),
      [
        crewPosts,
        selectedCrewId,
      ]
    );

  const selectedCrewTotalMinutes =
    useMemo(
      () =>
        selectedCrewPosts.reduce(
          (
            sum: number,
            post: any
          ) =>
            sum +
            Math.max(
              0,
              Number(
                post?.minutes ??
                  0
              ) || 0
            ),
          0
        ),
      [
        selectedCrewPosts,
      ]
    );

  const crewLevel =
    getRootCrewLevelByMinutes(
      selectedCrewTotalMinutes
    );

  const maxMemberCount =
    getRootCrewMemberLimitByLevel(
      crewLevel
    );

  const currentMemberCount =
    (
      selectedCrew
        ?.memberIds ??
      []
    ).length;

  const selectedCrewMembers =
    useMemo(
      () => {
        const fallbackEmojis = [
          '🐻',
          '🐰',
          '🐱',
          '🐶',
          '🦊',
        ];

        const memberIds =
          Array.from(
            new Set(
              (
                selectedCrew
                  ?.memberIds ??
                []
              ).map(
                (
                  memberId: any
                ) =>
                  String(
                    memberId
                  )
              )
            )
          );

        return memberIds.map(
          (
            memberId,
            index
          ) => {
            const isMe =
              memberId ===
              userId;

            const memberPosts =
              selectedCrewPosts.filter(
                (
                  post: any
                ) =>
                  String(
                    post?.userId ??
                      ''
                  ) ===
                  memberId
              );

            const latestProfilePost =
              [
                ...memberPosts,
              ].sort(
                (
                  first,
                  second
                ) => {
                  const firstTime =
                    new Date(
                      first
                        ?.createdAt ??
                        first
                          ?.date ??
                        0
                    ).getTime();

                  const secondTime =
                    new Date(
                      second
                        ?.createdAt ??
                        second
                          ?.date ??
                        0
                    ).getTime();

                  return (
                    secondTime -
                    firstTime
                  );
                }
              )[0];

            const totalMinutes =
              memberPosts.reduce(
                (
                  sum: number,
                  post: any
                ) =>
                  sum +
                  Math.max(
                    0,
                    Number(
                      post
                        ?.minutes ??
                        0
                    ) || 0
                  ),
                0
              );

            const calculatedLevel =
              Math.max(
                1,
                Math.floor(
                  totalMinutes /
                    300
                ) + 1
              );

            return {
              id:
                memberId,

              originalIndex:
                index,

              nickname:
                isMe
                  ? userProfile
                      ?.nickname ??
                    latestProfilePost
                      ?.nickname ??
                    '나'
                  : latestProfilePost
                      ?.nickname ??
                    `크루원 ${
                      index +
                      1
                    }`,

              profileEmoji:
                isMe
                  ? userProfile
                      ?.profileEmoji ??
                    latestProfilePost
                      ?.profileEmoji ??
                    '🦊'
                  : latestProfilePost
                      ?.profileEmoji ??
                    fallbackEmojis[
                      index %
                        fallbackEmojis.length
                    ],

              level:
                isMe
                  ? userProfile
                      ?.level ??
                    calculatedLevel
                  : latestProfilePost
                      ?.level ??
                    calculatedLevel,
            };
          }
        );
      },
      [
        selectedCrew
          ?.memberIds,
        selectedCrewPosts,
        userId,
        userProfile
          ?.nickname,
        userProfile
          ?.profileEmoji,
        userProfile
          ?.level,
      ]
    );

  const filteredCrewMembers =
    useMemo(
      () => {
        const keyword =
          memberSearchText
            .trim()
            .toLowerCase();

        if (!keyword) {
          return selectedCrewMembers;
        }

        return selectedCrewMembers.filter(
          (
            member: any
          ) =>
            String(
              member
                ?.nickname ??
                ''
            )
              .toLowerCase()
              .includes(
                keyword
              )
        );
      },
      [
        memberSearchText,
        selectedCrewMembers,
      ]
    );

  const weeklyCrewPosts =
    useMemo(
      () => {
        const weekAgo =
          Date.now() -
          7 *
            24 *
            60 *
            60 *
            1000;

        return selectedCrewPosts.filter(
          (
            post: any
          ) => {
            const postTime =
              new Date(
                post?.date ??
                  post?.createdAt ??
                  ''
              ).getTime();

            return (
              Number.isFinite(
                postTime
              ) &&
              postTime >=
                weekAgo
            );
          }
        );
      },
      [
        selectedCrewPosts,
      ]
    );

  const selectedCrewWeeklyRanking =
    useMemo(
      () =>
        selectedCrewMembers
          .map(
            (
              member: any
            ) => {
              const memberPosts =
                weeklyCrewPosts.filter(
                  (
                    post: any
                  ) => {
                    const postUserId =
                      String(
                        post?.userId ??
                          ''
                      );

                    if (
                      postUserId
                    ) {
                      return (
                        postUserId ===
                        String(
                          member.id
                        )
                      );
                    }

                    return (
                      String(
                        post?.nickname ??
                          ''
                      ) ===
                      String(
                        member.nickname ??
                          ''
                      )
                    );
                  }
                );

              return {
                key:
                  String(
                    member.id
                  ),

                nickname:
                  member.nickname,

                emoji:
                  member.profileEmoji,

                level:
                   member.level ?? 1,

                minutes:
                  memberPosts.reduce(
                    (
                      sum: number,
                      post: any
                    ) =>
                      sum +
                      Math.max(
                        0,
                        Number(
                          post
                            ?.minutes ??
                            0
                        ) || 0
                      ),
                    0
                  ),

                count:
                  memberPosts.length,

                originalIndex:
                  member.originalIndex,
              };
            }
          )
          .sort(
            (
              first: any,
              second: any
            ) => {
              if (
                second.minutes !==
                first.minutes
              ) {
                return (
                  second.minutes -
                  first.minutes
                );
              }

              if (
                second.count !==
                first.count
              ) {
                return (
                  second.count -
                  first.count
                );
              }

              return (
                first.originalIndex -
                second.originalIndex
              );
            }
          ),
      [
        selectedCrewMembers,
        weeklyCrewPosts,
      ]
    );

  const outlineButtonTheme = {
    backgroundColor:
      'transparent',

    borderColor:
      theme.line,

    borderWidth:
      0.5,

    borderRadius:
      isCityBlack
        ? 4
        : 10,
  };

  const dangerlessStrongButtonTheme = {
    backgroundColor:
      'transparent',

    borderColor:
      theme.strongLine,

    borderWidth:
      0.8,

    borderRadius:
      isCityBlack
        ? 4
        : 10,
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={
            theme.button
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                theme.subText,
            },
          ]}
        >
          크루 멤버를 불러오는 중이에요.
        </Text>
      </View>
    );
  }

  if (!selectedCrew) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Text
          style={
            styles.emptyIcon
          }
        >
          👥
        </Text>

        <Text
          style={[
            styles.emptyText,
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
            styles.emptyBackButton,
            outlineButtonTheme,
          ]}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={[
              styles.emptyBackText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            내 크루로 돌아가기
          </Text>
        </Pressable>
      </View>
    );
  }

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
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={[
              styles.backText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            ← 내 크루로 돌아가기
          </Text>
        </Pressable>

        <View
          style={
            styles.crewHeaderRow
          }
        >
          <Text
            style={[
              styles.crewTitle,
              {
                color:
                  theme.text,
              },
            ]}
            numberOfLines={
              1
            }
          >
            {selectedCrew
              ?.title ??
              '크루'}
          </Text>

          <Pressable
            style={[
              styles.helpButton,
              {
                borderColor:
                  theme.line,

                backgroundColor:
                  'transparent',
              },
            ]}
            onPress={() =>
              setShowGuideModal(
                true
              )
            }
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

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                theme.line,
            },
          ]}
        />

        <View
          style={
            styles.memberSummaryRow
          }
        >
          <View
            style={
              styles.memberSummaryTextBox
            }
          >
            <Text
              style={[
                styles.memberCountText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              크루 인원{' '}
              {currentMemberCount}
              {' / '}
              {maxMemberCount}명
            </Text>

            <Text
              style={[
                styles.crewLevelText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              크루 Lv.
              {crewLevel}
            </Text>
          </View>

          <Pressable
            style={[
              styles.memberViewButton,
              outlineButtonTheme,
            ]}
            onPress={() =>
              setShowMemberModal(
                true
              )
            }
          >
            <Text
              style={[
                styles.memberViewButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              멤버 보기
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                theme.line,
            },
          ]}
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
          이번 주 랭킹
        </Text>

        <View
          style={[
            styles.rankingList,
            {
              borderColor:
                theme.line,

              backgroundColor:
                theme.card,

              borderRadius:
                isCityBlack
                  ? 4
                  : 14,
            },
          ]}
        >
          {selectedCrewWeeklyRanking.map(
            (
              item: any,
              index: number
            ) => (
              <Pressable
  key={
    item.key
  }
  style={[
    styles.rankingItem,

    index <
      selectedCrewWeeklyRanking.length -
        1 && {
      borderBottomWidth:
        0.5,

      borderBottomColor:
        theme.line,
    },
  ]}
  onPress={() => {
    router.push({
      pathname:
        '/user-profile',

      params: {
        userId:
          String(
            item.key
          ),

        nickname:
          String(
            item.nickname ??
              '루트유저'
          ),

        profileEmoji:
          String(
            item.emoji ??
              '🦊'
          ),

        level:
          String(
            item.level ??
              1
          ),

        crewId:
          selectedCrewId,
      },
    });
  }}
>
  <Text
    style={[
      styles.rankingRank,
      {
        color:
          theme.text,
      },
    ]}
  >
    {getRankingMark(
      index
    )}
  </Text>

  <Text
    style={
      styles.rankingEmoji
    }
  >
    {item.emoji}
  </Text>

  <Text
    style={[
      styles.rankingName,
      {
        color:
          theme.text,
      },
    ]}
    numberOfLines={
      1
    }
  >
    {item.nickname}
  </Text>

  <Text
    style={[
      styles.rankingResult,
      {
        color:
          theme.subText,
      },
    ]}
    numberOfLines={
      1
    }
  >
    {formatRankingTime(
      item.minutes
    )}
    {' · '}
    {item.count}회
  </Text>
</Pressable>
            )
          )}
        </View>
      </ScrollView>

      <Modal
        visible={
          showGuideModal
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowGuideModal(
            false
          )
        }
      >
        <Pressable
          style={
            styles.centerModalOverlay
          }
          onPress={() =>
            setShowGuideModal(
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
                styles.guideTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              크루 안내
            </Text>

            <Text
              style={[
                styles.guideText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              크루 레벨이 올라가면 가입할 수 있는 총인원이 늘어나요.
              {'\n\n'}
              Lv.1은 10명, Lv.2는 15명, Lv.3은 20명, Lv.4는 25명,
              Lv.5부터는 최대 30명까지 가입할 수 있어요.
              {'\n\n'}
              최근 7일 동안 공유한 기록 시간을 기준으로 순위가 정해져요.
              기록 시간이 같으면 기록 횟수가 많은 멤버가 앞에 표시돼요.
            </Text>

            <Pressable
              style={[
                styles.guideCloseButton,
                outlineButtonTheme,
              ]}
              onPress={() =>
                setShowGuideModal(
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

      <Modal
        visible={
          showMemberModal
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowMemberModal(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setShowMemberModal(
              false
            )
          }
        >
          <Pressable
            style={[
              styles.memberModalBox,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.line,

                borderTopLeftRadius:
                  isCityBlack
                    ? 4
                    : 18,

                borderTopRightRadius:
                  isCityBlack
                    ? 4
                    : 18,
              },
            ]}
            onPress={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.modalHeaderRow
              }
            >
              <View
                style={
                  styles.modalHeaderTextBox
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
                  크루 멤버
                </Text>

                <Text
                  style={[
                    styles.memberModalSubText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {isOwner
  ? `총 ${currentMemberCount}명 · 프로필 확인 또는 크루장 위임`
  : `총 ${currentMemberCount}명 · 멤버 프로필을 볼 수 있어요.`}
                </Text>
              </View>

              <Pressable
                style={
                  styles.modalCloseIcon
                }
                onPress={() =>
                  setShowMemberModal(
                    false
                  )
                }
              >
                <Text
                  style={[
                    styles.modalCloseIconText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <TextInput
              value={
                memberSearchText
              }
              onChangeText={
                setMemberSearchText
              }
              placeholder="닉네임 검색"
              placeholderTextColor={
                theme.subText
              }
              style={[
                styles.memberSearchInput,
                {
                  backgroundColor:
                    'transparent',

                  borderColor:
                    theme.line,

                  color:
                    theme.text,

                  borderRadius:
                    isCityBlack
                      ? 4
                      : 10,
                },
              ]}
            />

            <ScrollView
              style={
                styles.memberList
              }
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              {filteredCrewMembers.length ===
              0 ? (
                <View
                  style={
                    styles.noMemberResult
                  }
                >
                  <Text
                    style={[
                      styles.noMemberResultText,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    검색된 멤버가 없어요.
                  </Text>
                </View>
              ) : (
                filteredCrewMembers.map(
                  (
                    member: any,
                    index: number
                  ) => {
                    const isOwnerMember =
                      String(
                        member.id
                      ) ===
                      String(
                        selectedCrew
                          .ownerId
                      );

                    const isMe =
                      String(
                        member.id
                      ) ===
                      userId;

                    return (
                      <View
                        key={
                          member.id
                        }
                        style={[
                          styles.memberListItem,

                          index <
                            filteredCrewMembers.length -
                              1 && {
                            borderBottomWidth:
                              0.5,

                            borderBottomColor:
                              theme.line,
                          },
                        ]}
                      >
                        <Pressable
  style={
    styles.memberProfileButton
  }
  onPress={() => {
  setShowMemberModal(
    false
  );

  /*
   * Android에서는 Modal이 완전히 닫힌 후
   * 새 화면으로 이동해야 안정적으로 작동합니다.
   */
  setTimeout(() => {
    router.push({
      pathname:
        '/user-profile',

      params: {
        userId:
          String(
            member.id
          ),

        nickname:
          String(
            member.nickname ??
              '루트유저'
          ),

        profileEmoji:
          String(
            member.profileEmoji ??
              '🦊'
          ),

        level:
          String(
            member.level ??
              1
          ),

        crewId:
          selectedCrewId,
      },
    });
  }, 250);
}}
>
  <Text
    style={
      styles.memberListEmoji
    }
  >
    {
      member.profileEmoji
    }
  </Text>

  <View
    style={
      styles.memberListTextBox
    }
  >
    <Text
      style={[
        styles.memberListName,
        {
          color:
            theme.text,
        },
      ]}
      numberOfLines={
        1
      }
    >
      {
        member.nickname
      }
      {isMe
        ? ' · 나'
        : ''}
    </Text>

    <Text
      style={[
        styles.memberListSub,
        {
          color:
            theme.subText,
        },
      ]}
    >
      {isOwnerMember
        ? '크루장'
        : '멤버'}
      {' · Lv.'}
      {
        member.level
      }
    </Text>
  </View>
</Pressable>

                        {isOwner &&
                        !isOwnerMember &&
                        !isMe ? (
                          <Pressable
                            style={[
                              styles.transferButton,
                              dangerlessStrongButtonTheme,
                            ]}
                            onPress={() =>
                              setTransferTarget(
                                member
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.transferButtonText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              위임
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  }
                )
              )}
            </ScrollView>

            <Pressable
              style={[
                styles.closeButton,
                outlineButtonTheme,
              ]}
              onPress={() =>
                setShowMemberModal(
                  false
                )
              }
            >
              <Text
                style={[
                  styles.closeButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                닫기
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={
          !!transferTarget
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setTransferTarget(
            null
          )
        }
      >
        <Pressable
          style={
            styles.centerModalOverlay
          }
          onPress={() => {
            if (
              !transferLoading
            ) {
              setTransferTarget(
                null
              );
            }
          }}
        >
          <Pressable
            style={[
              styles.confirmBox,
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
                styles.confirmTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              크루장을 위임할까요?
            </Text>

            <Text
              style={[
                styles.confirmMessage,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {transferTarget
                ?.profileEmoji ??
                '🦊'}{' '}
              {transferTarget
                ?.nickname ??
                '이 멤버'}
              님에게 크루장을 위임합니다.
              {'\n'}
              위임 후에는 일반 멤버가 됩니다.
            </Text>

            <View
              style={
                styles.confirmButtonRow
              }
            >
              <Pressable
                style={[
                  styles.confirmButton,
                  outlineButtonTheme,
                ]}
                disabled={
                  transferLoading
                }
                onPress={() =>
                  setTransferTarget(
                    null
                  )
                }
              >
                <Text
                  style={[
                    styles.confirmButtonText,
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
                style={[
                  styles.confirmButton,
                  dangerlessStrongButtonTheme,
                ]}
                disabled={
                  transferLoading
                }
                onPress={async () => {
                  if (
                    !transferTarget
                  ) {
                    return;
                  }

                  const nextOwnerNickname =
                    String(
                      transferTarget
                        ?.nickname ??
                        '새 크루장'
                    );

                  try {
                    setTransferLoading(
                      true
                    );

                    const nextCrews =
                      await transferRootCrewOwnership(
                        selectedCrewId,
                        String(
                          transferTarget.id
                        ),
                        nextOwnerNickname
                      );

                    const updatedCrew =
                      nextCrews.find(
                        (
                          crew: any
                        ) =>
                          String(
                            crew?.id ??
                              ''
                          ) ===
                          selectedCrewId
                      );

                    setSelectedCrew(
                      updatedCrew ?? {
                        ...selectedCrew,

                        ownerId:
                          transferTarget.id,

                        ownerNickname:
                          nextOwnerNickname,

                        deleteRequestedAt:
                          null,
                      }
                    );

                    setTransferTarget(
                      null
                    );

                    setShowMemberModal(
                      false
                    );

                    setNoticeModal({
                      title:
                        '크루장 위임 완료',

                      message:
                        `${nextOwnerNickname}님이 새 크루장이 되었어요.`,
                    });
                  } catch (
                    error: any
                  ) {
                    const errorCode =
                      String(
                        error?.message ??
                          ''
                      );

                    setTransferTarget(
                      null
                    );

                    setNoticeModal({
                      title:
                        '위임하지 못했어요',

                      message:
                        errorCode ===
                        'NEW_OWNER_NOT_MEMBER'
                          ? '선택한 사용자가 더 이상 크루 멤버가 아니에요.'
                          : errorCode ===
                            'NOT_CREW_OWNER'
                          ? '현재 크루장만 위임할 수 있어요.'
                          : '크루장 위임 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.',
                    });
                  } finally {
                    setTransferLoading(
                      false
                    );
                  }
                }}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {transferLoading
                    ? '위임 중'
                    : '위임하기'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={
          noticeModal !==
          null
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setNoticeModal(
            null
          )
        }
      >
        <Pressable
          style={
            styles.centerModalOverlay
          }
          onPress={() =>
            setNoticeModal(
              null
            )
          }
        >
          <Pressable
            style={[
              styles.confirmBox,
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
                styles.confirmTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {
                noticeModal
                  ?.title
              }
            </Text>

            <Text
              style={[
                styles.confirmMessage,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {
                noticeModal
                  ?.message
              }
            </Text>

            <Pressable
              style={[
                styles.noticeOkButton,
                outlineButtonTheme,
              ]}
              onPress={() =>
                setNoticeModal(
                  null
                )
              }
            >
              <Text
                style={[
                  styles.confirmButtonText,
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
      paddingTop: 42,
      paddingBottom: 90,
    },

    centerContainer: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 24,
    },

    loadingText: {
      marginTop: 14,

      fontSize: 14,
      fontWeight: '800',

      textAlign: 'center',
    },

    emptyIcon: {
      fontSize: 42,
    },

    emptyText: {
      marginTop: 12,

      fontSize: 18,
      fontWeight: '900',

      textAlign: 'center',
    },

    emptyBackButton: {
      marginTop: 18,

      minHeight: 36,

      paddingHorizontal: 14,

      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyBackText: {
      fontSize: 13,
      fontWeight: '900',
    },

    backButton: {
      alignSelf: 'flex-start',

      paddingVertical: 4,
    },

    backText: {
      fontSize: 15,
      fontWeight: '900',
    },

    crewHeaderRow: {
      marginTop: 24,

      flexDirection: 'row',
      alignItems: 'center',
    },

    crewTitle: {
      flex: 1,

      marginRight: 12,

      fontSize: 25,
      fontWeight: '900',
    },

    helpButton: {
      width: 27,
      height: 27,

      borderWidth: 0.7,
      borderRadius: 999,

      alignItems: 'center',
      justifyContent: 'center',
    },

    helpButtonText: {
      fontSize: 14,
      fontWeight: '900',
    },

    divider: {
      width: '100%',
      height: 0.5,

      marginTop: 15,
      marginBottom: 15,
    },

    memberSummaryRow: {
      minHeight: 48,

      flexDirection: 'row',
      alignItems: 'center',
    },

    memberSummaryTextBox: {
      flex: 1,
    },

    memberCountText: {
      fontSize: 16,
      fontWeight: '900',
    },

    crewLevelText: {
      marginTop: 3,

      fontSize: 11,
      fontWeight: '800',
    },

    memberViewButton: {
      minWidth: 82,
      minHeight: 34,

      paddingHorizontal: 12,

      alignItems: 'center',
      justifyContent: 'center',
    },

    memberViewButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },

    sectionTitle: {
      marginBottom: 11,

      fontSize: 20,
      fontWeight: '900',
    },

    rankingList: {
      borderWidth: 0.5,

      overflow: 'hidden',
    },

    rankingItem: {
      minHeight: 52,

      paddingHorizontal: 11,
      paddingVertical: 9,

      flexDirection: 'row',
      alignItems: 'center',
    },

    rankingRank: {
      width: 32,

      fontSize: 17,
      fontWeight: '900',

      textAlign: 'center',
    },

    rankingEmoji: {
      width: 31,

      marginRight: 7,

      fontSize: 22,

      textAlign: 'center',
    },

    rankingName: {
      flex: 1,

      marginRight: 8,

      fontSize: 14,
      fontWeight: '900',
    },

    rankingResult: {
      fontSize: 11,
      fontWeight: '800',

      textAlign: 'right',
    },

    centerModalOverlay: {
      flex: 1,

      paddingHorizontal: 24,

      backgroundColor:
        'rgba(0, 0, 0, 0.42)',

      alignItems: 'center',
      justifyContent: 'center',
    },

    guideModalBox: {
      width: '100%',

      padding: 17,

      borderWidth: 0.5,
    },

    guideTitle: {
      fontSize: 18,
      fontWeight: '900',
    },

    guideText: {
      marginTop: 11,

      fontSize: 13,
      fontWeight: '800',
      lineHeight: 20,
    },

    guideCloseButton: {
      marginTop: 16,

      minHeight: 35,

      alignItems: 'center',
      justifyContent: 'center',
    },

    guideCloseText: {
      fontSize: 12,
      fontWeight: '900',
    },

    modalOverlay: {
      flex: 1,

      backgroundColor:
        'rgba(0, 0, 0, 0.42)',

      justifyContent: 'flex-end',
    },

    memberModalBox: {
      maxHeight: '86%',

      paddingHorizontal: 16,
      paddingTop: 17,
      paddingBottom: 30,

      borderWidth: 0.5,
    },

    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    modalHeaderTextBox: {
      flex: 1,

      marginRight: 10,
    },

    modalTitle: {
      fontSize: 19,
      fontWeight: '900',
    },

    memberModalSubText: {
      marginTop: 4,

      fontSize: 11,
      fontWeight: '800',
    },

    modalCloseIcon: {
      width: 30,
      height: 30,

      alignItems: 'center',
      justifyContent: 'center',
    },

    modalCloseIconText: {
      marginTop: -2,

      fontSize: 27,
      fontWeight: '500',
    },

    memberSearchInput: {
      marginTop: 14,

      minHeight: 38,

      paddingHorizontal: 11,
      paddingVertical: 7,

      borderWidth: 0.5,

      fontSize: 13,
      fontWeight: '800',
    },

    memberList: {
      maxHeight: 430,

      marginTop: 10,
    },

    memberListItem: {
      minHeight: 54,

      paddingHorizontal: 7,
      paddingVertical: 8,

      flexDirection: 'row',
      alignItems: 'center',
    },

memberProfileButton: {
  flex: 1,

  flexDirection: 'row',
  alignItems: 'center',
},



    memberListEmoji: {
      width: 35,

      marginRight: 7,

      fontSize: 23,

      textAlign: 'center',
    },

    memberListTextBox: {
      flex: 1,
    },

    memberListName: {
      fontSize: 14,
      fontWeight: '900',
    },

    memberListSub: {
      marginTop: 3,

      fontSize: 11,
      fontWeight: '800',
    },

    transferButton: {
      minWidth: 47,
      minHeight: 30,

      marginLeft: 8,

      paddingHorizontal: 8,

      alignItems: 'center',
      justifyContent: 'center',
    },

    transferButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    noMemberResult: {
      paddingVertical: 30,

      alignItems: 'center',
    },

    noMemberResultText: {
      fontSize: 13,
      fontWeight: '800',
    },

    closeButton: {
      marginTop: 12,

      minHeight: 36,

      alignItems: 'center',
      justifyContent: 'center',
    },

    closeButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },

    confirmBox: {
      width: '100%',

      padding: 17,

      borderWidth: 0.5,
    },

    confirmTitle: {
      fontSize: 18,
      fontWeight: '900',
    },

    confirmMessage: {
      marginTop: 10,

      fontSize: 13,
      fontWeight: '800',
      lineHeight: 20,
    },

    confirmButtonRow: {
      marginTop: 16,

      flexDirection: 'row',

      gap: 8,
    },

    confirmButton: {
      flex: 1,

      minHeight: 35,

      alignItems: 'center',
      justifyContent: 'center',
    },

    confirmButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },

    noticeOkButton: {
      marginTop: 16,

      minHeight: 35,

      alignItems: 'center',
      justifyContent: 'center',
    },
  });
