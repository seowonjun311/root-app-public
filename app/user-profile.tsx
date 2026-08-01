import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import RootVillagePreview from '../components/RootVillagePreview';
import {
    getEarnedBadges,
    getRootMainBadgeId,
    getRootOnboardingData,
    loadRootCrewPosts,
    subscribeRootCrewPosts,
    toggleRootFollowUser,
} from '../store/rootMemory';
import { useRootTheme } from '../store/rootTheme';

const FOLLOWING_CREW_USERS_KEY = 'following_crew_users_v1';

const CATEGORY_ITEMS = [
  { id: 'exercise', label: '운동', icon: '🏃' },
  { id: 'study', label: '공부', icon: '📚' },
  { id: 'mental', label: '정신', icon: '🧘' },
  { id: 'daily', label: '일', icon: '💼' },
];

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours <= 0) return `${minutes}분`;
  if (minutes <= 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

function normalizeCategory(value: unknown) {
  const category = String(value ?? '').trim();

  if (category === 'exercise' || category === '운동') return 'exercise';
  if (category === 'study' || category === '공부') return 'study';
  if (category === 'mental' || category === '정신') return 'mental';
  if (
    category === 'daily' ||
    category === '일' ||
    category === '일상'
  ) {
    return 'daily';
  }

  return category;
}

function getDateKey(value: unknown) {
  const date = new Date(String(value ?? ''));
  if (!Number.isFinite(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateStreak(posts: any[]) {
  const dateSet = new Set(
    posts
      .map((post) => getDateKey(post?.date ?? post?.createdAt))
      .filter(Boolean)
  );

  if (dateSet.size === 0) return 0;

  const todayKey = getTodayKey();
  const yesterdayKey = shiftDateKey(todayKey, -1);

  let cursor = dateSet.has(todayKey)
    ? todayKey
    : dateSet.has(yesterdayKey)
    ? yesterdayKey
    : '';

  if (!cursor) return 0;

  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
}

function getPostTime(post: any) {
  const time = new Date(post?.createdAt ?? post?.date ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export default function UserProfileScreen() {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';

  const params = useLocalSearchParams<{
    userId?: string | string[];
    crewId?: string | string[];
    nickname?: string | string[];
    profileEmoji?: string | string[];
    level?: string | string[];
    followers?: string | string[];
    following?: string | string[];
    mainBadgeIcon?: string | string[];
    mainBadgeTitle?: string | string[];
  }>();

  const targetUserId = String(getParam(params.userId) ?? '');
  const crewId = String(getParam(params.crewId) ?? '');
  const nicknameParam = String(getParam(params.nickname) ?? '');
  const emojiParam = String(getParam(params.profileEmoji) ?? '');
  const levelParam = toSafeNumber(getParam(params.level), 0);
  const followersParam = toSafeNumber(getParam(params.followers), 0);
  const followingParam = toSafeNumber(getParam(params.following), 0);
  const mainBadgeIconParam = String(getParam(params.mainBadgeIcon) ?? '');
  const mainBadgeTitleParam = String(getParam(params.mainBadgeTitle) ?? '');

  const [crewPosts, setCrewPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [followSaving, setFollowSaving] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const currentProfile = getRootOnboardingData();
  const currentUserId = String(
    currentProfile?.uid ?? currentProfile?.guestId ?? 'guest'
  );
  const isMyProfile =
    targetUserId.length > 0 && targetUserId === currentUserId;

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [posts, savedFollowing] = await Promise.all([
          loadRootCrewPosts(),
          AsyncStorage.getItem(FOLLOWING_CREW_USERS_KEY),
        ]);

        if (!mounted) return;

        setCrewPosts(Array.isArray(posts) ? posts : []);

        const rootFollowing = Array.isArray(
          getRootOnboardingData()?.followingUsers
        )
          ? getRootOnboardingData()?.followingUsers
          : [];

        let localFollowing: string[] = [];
        if (savedFollowing) {
          try {
            const parsed = JSON.parse(savedFollowing);
            localFollowing = Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            localFollowing = [];
          }
        }

        setFollowingUserIds(
          Array.from(
            new Set<string>([
              ...rootFollowing.map(String),
              ...localFollowing,
            ])
          )
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    const unsubscribePosts = subscribeRootCrewPosts((posts) => {
      if (!mounted) return;
      setCrewPosts(Array.isArray(posts) ? posts : []);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribePosts?.();
    };
  }, []);

  const targetPosts = useMemo(() => {
    const byUserId = crewPosts.filter(
      (post: any) =>
        String(post?.userId ?? '') === targetUserId &&
        post?.status !== 'hidden'
    );

    if (byUserId.length > 0 || !nicknameParam) {
      return [...byUserId].sort((a, b) => getPostTime(b) - getPostTime(a));
    }

    return crewPosts
      .filter(
        (post: any) =>
          String(post?.nickname ?? '') === nicknameParam &&
          post?.status !== 'hidden'
      )
      .sort((a, b) => getPostTime(b) - getPostTime(a));
  }, [crewPosts, nicknameParam, targetUserId]);

  const latestProfilePost = targetPosts[0] ?? null;

  /*
   * 본인 프로필이면 현재 저장된 마을을 사용하고,
   * 다른 사용자라면 그 사용자의 게시글 중
   * placedBuildings가 들어 있는 가장 최신 게시글을 사용합니다.
   */
  const profileVillageBuildings = useMemo(() => {
    if (
      isMyProfile &&
      Array.isArray(currentProfile?.placedBuildings)
    ) {
      return currentProfile.placedBuildings;
    }

    const villagePost = targetPosts.find(
      (post: any) =>
        Array.isArray(post?.placedBuildings) &&
        post.placedBuildings.length > 0
    );

    return Array.isArray(villagePost?.placedBuildings)
      ? villagePost.placedBuildings
      : [];
  }, [
    currentProfile?.placedBuildings,
    isMyProfile,
    targetPosts,
  ]);

  const displayNickname =
    nicknameParam ||
    latestProfilePost?.nickname ||
    (isMyProfile ? currentProfile?.nickname : '') ||
    '루트유저';

  const displayEmoji =
    emojiParam ||
    latestProfilePost?.profileEmoji ||
    (isMyProfile ? currentProfile?.profileEmoji : '') ||
    '🦊';

  const totalMinutes = targetPosts.reduce(
    (sum, post) => sum + Math.max(0, toSafeNumber(post?.minutes)),
    0
  );

  const displayLevel = Math.max(
    1,
    levelParam ||
      toSafeNumber(latestProfilePost?.level) ||
      (isMyProfile ? toSafeNumber(currentProfile?.level) : 0) ||
      Math.floor(totalMinutes / 300) + 1
  );

  const streakDays = calculateStreak(targetPosts);
  const shareCount = targetPosts.length;
  const photoCount = targetPosts.filter(
    (post) => post?.photoUri || post?.photo_url
  ).length;
  const cheerCount = targetPosts.reduce(
    (sum, post) => sum + Math.max(0, toSafeNumber(post?.cheers)),
    0
  );
  const commentCount = targetPosts.reduce(
    (sum, post) =>
      sum + (Array.isArray(post?.comments) ? post.comments.length : 0),
    0
  );

  const categoryMinutes = useMemo(() => {
    const totals: Record<string, number> = {
      exercise: 0,
      study: 0,
      mental: 0,
      daily: 0,
    };

    targetPosts.forEach((post) => {
      const category = normalizeCategory(post?.category);
      if (category in totals) {
        totals[category] += Math.max(0, toSafeNumber(post?.minutes));
      }
    });

    return totals;
  }, [targetPosts]);

  const derivedBadges = useMemo(() => {
    const badges: Array<{ id: string; icon: string; title: string }> = [];

    if (shareCount >= 1) {
      badges.push({ id: 'first_share', icon: '🌱', title: '첫 걸음' });
    }
    if (photoCount >= 1) {
      badges.push({ id: 'first_photo', icon: '📸', title: '첫 공유' });
    }
    if (cheerCount >= 1) {
      badges.push({ id: 'first_cheer', icon: '👏', title: '첫 응원' });
    }
    if (commentCount >= 1) {
      badges.push({ id: 'first_comment', icon: '💬', title: '첫 소통' });
    }
    if (shareCount >= 10) {
      badges.push({ id: 'share_10', icon: '📝', title: '공유 10회' });
    }
    if (streakDays >= 7) {
      badges.push({ id: 'streak_7', icon: '🔥', title: '7일 연속' });
    }

    return badges;
  }, [cheerCount, commentCount, photoCount, shareCount, streakDays]);

  const actualMyBadges = isMyProfile
    ? getEarnedBadges().map((badge: any) => ({
        id: String(badge?.id ?? badge?.title ?? ''),
        icon: String(badge?.icon ?? '🏅'),
        title: String(badge?.title ?? '뱃지'),
      }))
    : [];

  const visibleBadges = actualMyBadges.length > 0 ? actualMyBadges : derivedBadges;

  const currentMainBadgeId = isMyProfile ? getRootMainBadgeId() : null;
  const mainBadge =
    visibleBadges.find((badge) => badge.id === currentMainBadgeId) ??
    (mainBadgeIconParam || mainBadgeTitleParam
      ? {
          id: 'route-main-badge',
          icon: mainBadgeIconParam || '🌱',
          title: mainBadgeTitleParam || '첫 걸음',
        }
      : visibleBadges[0] ?? {
          id: 'none',
          icon: '🌱',
          title: '첫 걸음',
        });

  const isFollowing = followingUserIds.includes(targetUserId);

  const baseFollowers = Math.max(
    0,
    followersParam ||
      toSafeNumber(latestProfilePost?.followersCount) ||
      toSafeNumber(latestProfilePost?.followerCount) ||
      toSafeNumber(latestProfilePost?.followers)
  );

  const displayFollowers = Math.max(0, baseFollowers + (isFollowing ? 1 : 0));
  const displayFollowing = Math.max(
    0,
    followingParam ||
      toSafeNumber(latestProfilePost?.followingCount) ||
      toSafeNumber(latestProfilePost?.following)
  );

  const visibleFeedPosts = useMemo(() => {
    if (!crewId) return targetPosts;

    return targetPosts.filter(
      (post: any) =>
        String(post?.crewId ?? '') === crewId ||
        String(post?.sharedCrewId ?? '') === crewId
    );
  }, [crewId, targetPosts]);

  const outlineTheme = {
    backgroundColor: 'transparent',
    borderColor: theme.line,
    borderWidth: 0.5,
    borderRadius: isCityBlack ? 4 : 12,
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.button} />
        <Text style={[styles.loadingText, { color: theme.subText }]}>
          사용자 프로필을 불러오는 중이에요.
        </Text>
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
          style={styles.backButton}
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
            ← 돌아가기
          </Text>
        </Pressable>

        {/* 사용자 기본 정보 */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <Pressable
            style={styles.profileHeaderRow}
            onPress={() =>
              setShowBadgeModal(true)
            }
            accessibilityRole="button"
            accessibilityLabel={
              `획득한 뱃지 보기, 대표 뱃지 ${mainBadge.icon} ${mainBadge.title}, ` +
              `레벨 ${displayLevel}, ${streakDays}일 연속`
            }
          >
            <Text style={styles.profileEmoji}>
              {displayEmoji}
            </Text>

            <Text
              style={[
                styles.profileName,
                { color: theme.text },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayNickname}
            </Text>
          </Pressable>

          <View
            style={[
              styles.profileDivider,
              {
                backgroundColor: theme.line,
              },
            ]}
          />

          <View style={styles.villageTitleRow}>
            <Text
              style={[
                styles.villageTitle,
                { color: theme.text },
              ]}
            >
              마을
            </Text>
          </View>

          <RootVillagePreview
            placedBuildings={
              profileVillageBuildings
            }
            height={190}
            showCharacter
            onPress={() => {
              router.push({
                pathname: '/friend-village',
                params: {
  userId:
    targetUserId,

  nickname:
    displayNickname,

  profileEmoji:
    displayEmoji,

  placedBuildings:
    JSON.stringify(
      profileVillageBuildings
    ),
},
              });
            }}
          />

          <View
            style={[
              styles.profileDivider,
              styles.profileDividerAfterVillage,
              {
                backgroundColor: theme.line,
              },
            ]}
          />

          <View style={styles.statsRow}>
            {[
              {
                value: displayFollowers,
                label: '팔로워',
              },
              {
                value: displayFollowing,
                label: '팔로잉',
              },
              {
                value: shareCount,
                label: '공유',
              },
            ].map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.statItem,
                  index > 0 && {
                    borderLeftWidth: 0.5,
                    borderLeftColor: theme.line,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statLabel,
                    { color: theme.subText },
                  ]}
                >
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.statValue,
                    { color: theme.text },
                  ]}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {!isMyProfile && targetUserId ? (
            <Pressable
              style={[
                styles.followButton,
                outlineTheme,
                isFollowing && {
                  borderColor: theme.strongLine,
                  borderWidth: 1,
                },
              ]}
              disabled={followSaving}
              onPress={async () => {
                try {
                  setFollowSaving(true);

                  const nextFollowing =
                    await toggleRootFollowUser(
                      targetUserId
                    );

                  const safeNextFollowing =
                    Array.isArray(nextFollowing)
                      ? nextFollowing.map(String)
                      : [];

                  setFollowingUserIds(
                    safeNextFollowing
                  );

                  await AsyncStorage.setItem(
                    FOLLOWING_CREW_USERS_KEY,
                    JSON.stringify(
                      safeNextFollowing
                    )
                  );
                } catch (error) {
                  console.log(
                    'USER PROFILE FOLLOW ERROR',
                    error
                  );
                } finally {
                  setFollowSaving(false);
                }
              }}
            >
              <Text
                style={[
                  styles.followButtonText,
                  { color: theme.text },
                ]}
              >
                {followSaving
                  ? '처리 중'
                  : isFollowing
                  ? '팔로잉'
                  : '+ 팔로우'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* 현재 크루에서 공유한 기록 */}
        <View
          style={
            styles.sectionHeaderRow
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
            {crewId
              ? '이 크루에 공유한 기록'
              : '공유 기록'}
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
            {visibleFeedPosts.length}개
          </Text>
        </View>

        {visibleFeedPosts.length ===
        0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 4
                    : 14,
              },
            ]}
          >
            <Text
              style={
                styles.emptyIcon
              }
            >
              🌱
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {crewId
                ? '아직 이 크루에 공유한 기록이 없어요.'
                : '아직 공유한 기록이 없어요.'}
            </Text>
          </View>
        ) : (
          visibleFeedPosts.map(
            (post: any, index: number) => {
              const photoUri =
                post?.photoUri ??
                post?.photo_url ??
                '';

              const memo =
                String(
                  post?.shareMemo ??
                    post?.memo ??
                    ''
                ).trim();

              const dateText =
                getDateKey(
                  post?.date ??
                    post?.createdAt
                );

              return (
                <View
                  key={String(
                    post?.id ??
                      index
                  )}
                  style={[
                    styles.feedCard,
                    {
                      backgroundColor:
                        theme.card,
                      borderColor:
                        theme.line,
                      borderRadius:
                        isCityBlack
                          ? 4
                          : 14,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.feedTopRow
                    }
                  >
                    <Text
                      style={[
                        styles.feedDate,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {dateText}
                    </Text>

                    <Text
                      style={[
                        styles.feedMinutes,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {formatMinutes(
                        Math.max(
                          0,
                          toSafeNumber(
                            post?.minutes
                          )
                        )
                      )}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.feedTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {post?.title ??
                      '기록'}
                  </Text>

                  {photoUri ? (
                    <Image
                      source={{
                        uri: photoUri,
                      }}
                      style={
                        styles.feedImage
                      }
                      resizeMode="cover"
                    />
                  ) : null}

                  {memo ? (
                    <Text
                      style={[
                        styles.feedMemo,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {memo}
                    </Text>
                  ) : null}

                  <View
                    style={
                      styles.feedBottomRow
                    }
                  >
                    <Text
                      style={[
                        styles.feedReaction,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      👏{' '}
                      {Math.max(
                        0,
                        toSafeNumber(
                          post?.cheers
                        )
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.feedReaction,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      💬{' '}
                      {Array.isArray(
                        post?.comments
                      )
                        ? post.comments
                            .length
                        : 0}
                    </Text>
                  </View>
                </View>
              );
            }
          )
        )}

        {/* 이 사용자의 전체 공유 기록 통계 */}
        <View
          style={
            styles.statisticsHeader
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
            사용자 활동 통계
          </Text>

          <Text
            style={[
              styles.statisticsGuideText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            이 사용자가 공유한 전체 기록의 누적 시간이에요.
          </Text>
        </View>

        <View
          style={[
            styles.statisticsBox,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 4
                  : 14,
            },
          ]}
        >
          {CATEGORY_ITEMS.map(
            (item, index) => (
              <View
                key={item.id}
                style={[
                  styles.statisticsRow,
                  index <
                    CATEGORY_ITEMS.length -
                      1 && {
                    borderBottomWidth:
                      0.5,
                    borderBottomColor:
                      theme.line,
                  },
                ]}
              >
                <Text
                  style={
                    styles.statisticsIcon
                  }
                >
                  {item.icon}
                </Text>

                <Text
                  style={[
                    styles.statisticsLabel,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {item.label}
                </Text>

                <Text
                  style={[
                    styles.statisticsValue,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {formatMinutes(
                    categoryMinutes[
                      item.id
                    ] ?? 0
                  )}
                </Text>
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* 대표 뱃지를 누르면 획득한 뱃지를 표시합니다. */}
      <Modal
        visible={showBadgeModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowBadgeModal(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setShowBadgeModal(
              false
            )
          }
        >
          <Pressable
            style={[
              styles.badgeModalBox,
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
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.badgeModalHeader
              }
            >
              <View
                style={
                  styles.badgeModalHeaderTextBox
                }
              >
                <Text
                  style={[
                    styles.badgeModalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  획득한 뱃지
                </Text>

                <Text
                  style={[
                    styles.badgeModalCount,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  총 {visibleBadges.length}개
                </Text>
              </View>

              <Pressable
                style={
                  styles.modalCloseButton
                }
                onPress={() =>
                  setShowBadgeModal(
                    false
                  )
                }
              >
                <Text
                  style={[
                    styles.modalCloseText,
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

            <ScrollView
              style={
                styles.badgeModalList
              }
              showsVerticalScrollIndicator={
                false
              }
            >
              {visibleBadges.length ===
              0 ? (
                <View
                  style={
                    styles.badgeEmptyBox
                  }
                >
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    아직 공개된 뱃지가 없어요.
                  </Text>
                </View>
              ) : (
                visibleBadges.map(
                  (badge, index) => {
                    const selected =
                      badge.id ===
                      mainBadge.id;

                    return (
                      <View
                        key={badge.id}
                        style={[
                          styles.badgeListItem,
                          index <
                            visibleBadges.length -
                              1 && {
                            borderBottomWidth:
                              0.5,
                            borderBottomColor:
                              theme.line,
                          },
                        ]}
                      >
                        <Text
                          style={
                            styles.badgeListIcon
                          }
                        >
                          {badge.icon}
                        </Text>

                        <Text
                          style={[
                            styles.badgeListTitle,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {badge.title}
                        </Text>

                        {selected ? (
                          <Text
                            style={[
                              styles.mainBadgeLabel,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            대표
                          </Text>
                        ) : null}
                      </View>
                    );
                  }
                )
              )}
            </ScrollView>

            <Pressable
              style={[
                styles.badgeModalConfirmButton,
                outlineTheme,
              ]}
              onPress={() =>
                setShowBadgeModal(
                  false
                )
              }
            >
              <Text
                style={[
                  styles.badgeModalConfirmText,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 100,
  },

  center: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '800',
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
  },

  backText: {
    fontSize: 15,
    fontWeight: '900',
  },

  profileCard: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
    borderWidth: 0.5,
  },

  profileHeaderRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileEmoji: {
    width: 42,
    marginRight: 9,
    fontSize: 31,
    textAlign: 'center',
  },

  profileHeaderTextBox: {
    flex: 1,
  },

  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },

  mainBadgeButton: {
    maxWidth: 126,
    minHeight: 30,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainBadgeButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },

  profileMetaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  profileMetaText: {
    fontSize: 12,
    fontWeight: '800',
  },

  profileDivider: {
    width: '100%',
    height: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },

  villageTitleRow: {
    minHeight: 28,
    marginBottom: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  villageTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  villageCount: {
    fontSize: 10,
    fontWeight: '800',
  },

  profileDividerAfterVillage: {
    marginTop: 8,
    marginBottom: 2,
  },

  statsRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  statValue: {
    fontSize: 11,
    fontWeight: '900',
  },

  statLabel: {
    fontSize: 10,
    fontWeight: '800',
  },

  followButton: {
    marginTop: 8,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  followButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },

  sectionHeaderRow: {
    marginTop: 23,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },

  sectionCount: {
    marginLeft: 10,
    fontSize: 11,
    fontWeight: '800',
  },

  emptyBox: {
    minHeight: 116,
    padding: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    fontSize: 27,
  },

  emptyText: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  feedCard: {
    marginBottom: 10,
    padding: 13,
    borderWidth: 0.5,
  },

  feedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  feedDate: {
    fontSize: 10,
    fontWeight: '800',
  },

  feedMinutes: {
    fontSize: 10,
    fontWeight: '900',
  },

  feedTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '900',
  },

  feedImage: {
    width: '100%',
    height: 190,
    marginTop: 9,
    borderRadius: 10,
  },

  feedMemo: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },

  feedBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 13,
  },

  feedReaction: {
    fontSize: 11,
    fontWeight: '800',
  },

  statisticsHeader: {
    marginTop: 23,
    marginBottom: 9,
  },

  statisticsGuideText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  statisticsBox: {
    borderWidth: 0.5,
    overflow: 'hidden',
  },

  statisticsRow: {
    minHeight: 47,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statisticsIcon: {
    width: 30,
    fontSize: 20,
  },

  statisticsLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },

  statisticsValue: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },

  modalOverlay: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeModalBox: {
    width: '100%',
    maxHeight: '76%',
    padding: 16,
    borderWidth: 0.5,
  },

  badgeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeModalHeaderTextBox: {
    flex: 1,
  },

  badgeModalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  badgeModalCount: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '800',
  },

  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseText: {
    marginTop: -2,
    fontSize: 28,
    fontWeight: '500',
  },

  badgeModalList: {
    marginTop: 12,
    maxHeight: 390,
  },

  badgeListItem: {
    minHeight: 52,
    paddingHorizontal: 5,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeListIcon: {
    width: 41,
    fontSize: 25,
    textAlign: 'center',
  },

  badgeListTitle: {
    flex: 1,
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '900',
  },

  mainBadgeLabel: {
    fontSize: 11,
    fontWeight: '900',
  },

  badgeEmptyBox: {
    paddingVertical: 28,
  },

  badgeModalConfirmButton: {
    marginTop: 13,
    minHeight: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeModalConfirmText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
