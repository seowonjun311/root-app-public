import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from 'react-native';
import { checkBadgeReward } from '../../store/badgeReward';
import {
  addRootCrew,
  addRootCrewNotification,
  addRootCrewPostComment,
  addRootCrewReport,
  approveRootCrewJoinRequest,
  deleteAllRootCrewNotifications,
  deleteRootCrewNotification,
  getEarnedBadges,
  getRootCrewNotifications,
  getRootMainBadgeId,
  getRootOnboardingData,
  joinRootCrew,
  loadRootCrewJoinRequests,
  loadRootCrewPosts,
  loadRootCrewReports,
  loadRootCrews,
  markAllRootCrewNotificationsRead,
  markRootCrewNotificationRead,
  rejectRootCrewJoinRequest,
  requestRootCrewJoin,
  ROOT_BADGES,
  setRootMainBadgeId,
  subscribeRootCrewJoinRequests,
  subscribeRootCrewNotifications,
  subscribeRootCrewPosts,
  subscribeRootCrews,
  toggleRootCrewPostCheer,
  toggleRootFollowUser,
} from '../../store/rootMemory';
import { useRootTheme } from '../../store/rootTheme';
import { validateText } from '../../utils/textGuard';
const categories = [  { id: 'all', label: '전체', icon: '✨' },  { id: 'exercise', label: '운동', icon: '🏃' },  { id: 'study', label: '공부', icon: '📚' },  { id: 'mental', label: '정신', icon: '🧘' }, { id: 'daily', label: '일', icon: '💼' },];
const reportReasons = [  '욕설/비방',  '스팸/홍보',  '부적절한 사진',  '허위 기록',  '기타',];
const HIDDEN_CREW_USERS_KEY = 'hidden_crew_users_v1';
const BLOCKED_CREW_USERS_KEY = 'blocked_crew_users_v1';
const CREW_REPORT_LIST_KEY = 'crew_report_list_v1';
const HIDDEN_CREW_POSTS_KEY = 'hidden_crew_posts_v1';



function getCrewPostDate(value: any) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value?.toDate ===
    'function'
  ) {
    return value.toDate();
  }

  if (
    typeof value?.seconds ===
    'number'
  ) {
    return new Date(
      value.seconds * 1000
    );
  }

  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function formatCrewPostElapsedTime(
  value: any
) {
  const date =
    getCrewPostDate(value);

  if (!date) {
    return '방금 전';
  }

  const diffMs = Math.max(
    0,
    Date.now() -
      date.getTime()
  );

  const minutes = Math.floor(
    diffMs / 60000
  );

  if (minutes < 1) {
    return '방금 전';
  }

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}시간 전`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}일 전`;
  }

  const weeks = Math.floor(
    days / 7
  );

  if (weeks < 5) {
    return `${weeks}주 전`;
  }

  const months = Math.floor(
    days / 30
  );

  if (months < 12) {
    return `${months}개월 전`;
  }

  return `${Math.floor(
    days / 365
  )}년 전`;
}

function formatCrewPostMinutes(
  value: any
) {
  const totalMinutes =
    Math.max(
      0,
      Math.floor(
        Number(value) || 0
      )
    );

  if (totalMinutes < 60) {
    return `${totalMinutes}분`;
  }

  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  return minutes > 0
    ? `${hours}시간 ${minutes}분`
    : `${hours}시간`;
}



export default function CrewScreen() {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';
  const styles = useMemo(
    () => createStyles(theme, isCityBlack),
    [theme, isCityBlack]
  );
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [crewPosts, setCrewPosts] = useState<any[]>([]);
  const [
    selectedFeedImageUri,
    setSelectedFeedImageUri,
  ] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [newBadge, setNewBadge] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
   const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(  getRootOnboardingData());
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [showBadgeList, setShowBadgeList] = useState(false);
  const [mainBadgeId, setMainBadgeId] = useState<string | null>(  getRootMainBadgeId());
const [crews, setCrews] =
  useState<any[]>([]);

const crewsRef =
  useRef<any[]>([]);

const hasInitialCrewLoadRef =
  useRef(false);

const emptyCrewRefreshTimerRef =
  useRef<
    ReturnType<
      typeof setTimeout
    > |
    null
  >(null);

const applyCrewState =
  useCallback(
    (
      value:
        any
    ) => {
      const safeCrews =
        Array.isArray(
          value
        )
          ? value
          : [];

      crewsRef.current =
        safeCrews;

      setCrews(
        safeCrews
      );

      return safeCrews;
    },
    []
  );
const [showCreateCrewModal, setShowCreateCrewModal] = useState(false);
const [showCrewSearchModal, setShowCrewSearchModal] = useState(false);
const [crewSearchCategory, setCrewSearchCategory] = useState('all');
const [newCrewCategory, setNewCrewCategory] =  useState<'exercise' | 'study' | 'mental' | 'daily' | null>(null);
const [newCrewTitle, setNewCrewTitle] = useState('');
const [newCrewIcon, setNewCrewIcon] = useState('🏃');
const [newCrewDescription, setNewCrewDescription] = useState('');
const [newCrewJoinType, setNewCrewJoinType] =  useState<'free' | 'approval'>('free');
const [noticeModal, setNoticeModal] =  useState<{ title: string; message: string } | null>(null);
const [joinRequests, setJoinRequests] = useState<any[]>([]);
const [reportPost, setReportPost] = useState<any>(null);
const [reportReason, setReportReason] = useState('');
const [reportDetail, setReportDetail] = useState('');
const [isSubmittingReport, setIsSubmittingReport] = useState(false);
const [showBlockedManageModal, setShowBlockedManageModal] = useState(false);
const [showPostMenu, setShowPostMenu] = useState<any>(null);
const [crewReports, setCrewReports] = useState<any[]>([]);
const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
const [deleteNotificationTarget, setDeleteNotificationTarget] =
  useState<any>(null);

const [showDeleteAllNotificationsConfirm, setShowDeleteAllNotificationsConfirm] =
  useState(false);

const latestRootData =
  getRootOnboardingData() ??
  userProfile ??
  {};

const userEmoji =
  latestRootData?.profileEmoji ??
  '🦊';

const userNickname =
  latestRootData?.nickname ??
  '루트유저';

const userId =
  String(
    latestRootData?.uid ??
      latestRootData?.guestId ??
      'guest'
  );

  console.log(
  'CREW CURRENT USER CHECK',
  {
    userId,
    uid: latestRootData?.uid,
    guestId:
      latestRootData?.guestId,
    email:
      latestRootData?.email,
    loginType:
      latestRootData?.loginType,
  }
);

useFocusEffect(
  useCallback(() => {
    hasInitialCrewLoadRef.current =
      false;

    let isActive =
      true;

    /*
     * 크루 목록은 다른 서버 작업보다
     * 가장 먼저 독립적으로 불러옵니다.
     */
    const loadCrewsFirst =
      async () => {
        try {
          const loadedCrews =
            await loadRootCrews();

          if (
            !isActive
          ) {
            return;
          }

          const safeLoadedCrews =
            applyCrewState(
              loadedCrews
            );

          console.log(
            'CREW LOAD CHECK',
            {
              currentUserId:
                userId,

              crewCount:
                safeLoadedCrews
                  .length,

              crews:
                safeLoadedCrews.map(
                  (
                    crew:
                      any
                  ) => ({
                    id:
                      crew?.id,

                    title:
                      crew
                        ?.title,

                    ownerId:
                      crew
                        ?.ownerId,

                    memberIds:
                      crew
                        ?.memberIds ??
                      [],
                  })
                ),
            }
          );
        } catch (
          error:
            any
        ) {
          console.log(
            'CREW LIST INITIAL LOAD ERROR',
            {
              message:
                error?.message ??
                String(
                  error
                ),

              code:
                error?.code ??
                null,

              currentUserId:
                userId,
            }
          );
        } finally {
          if (
            isActive
          ) {
            hasInitialCrewLoadRef.current =
              true;
          }
        }
      };

    /*
     * 게시물 서버가 느려도
     * 크루 목록 표시를 막지 않습니다.
     */
    const loadPosts =
      async () => {
        try {
          const posts =
            await loadRootCrewPosts();

          if (
            isActive
          ) {
            setCrewPosts(
              Array.isArray(
                posts
              )
                ? posts
                : []
            );
          }
        } catch (
          error
        ) {
          console.log(
            'CREW POST INITIAL LOAD ERROR',
            error
          );
        }
      };

    /*
     * 가입 요청도 별도로 처리합니다.
     */
    const loadJoinRequests =
      async () => {
        try {
          const loadedRequests =
            await loadRootCrewJoinRequests();

          if (
            isActive
          ) {
            setJoinRequests(
              Array.isArray(
                loadedRequests
              )
                ? loadedRequests
                : []
            );
          }
        } catch (
          error
        ) {
          console.log(
            'CREW JOIN REQUEST INITIAL LOAD ERROR',
            error
          );
        }
      };

    /*
     * 신고 목록도 별도로 처리합니다.
     */
    const loadReports =
      async () => {
        try {
          const loadedReports =
            await loadRootCrewReports();

          if (
            isActive
          ) {
            setCrewReports(
              Array.isArray(
                loadedReports
              )
                ? loadedReports
                : []
            );
          }
        } catch (
          error
        ) {
          console.log(
            'CREW REPORT INITIAL LOAD ERROR',
            error
          );
        }
      };

    /*
     * 숨김·차단 설정은 로컬에서
     * 한 번에 불러옵니다.
     */
    const loadLocalSettings =
      async () => {
        try {
          const [
            savedHiddenUsers,
            savedBlockedUsers,
            savedHiddenPosts,
          ] =
            await Promise.all([
              AsyncStorage.getItem(
                HIDDEN_CREW_USERS_KEY
              ),

              AsyncStorage.getItem(
                BLOCKED_CREW_USERS_KEY
              ),

              AsyncStorage.getItem(
                HIDDEN_CREW_POSTS_KEY
              ),
            ]);

          if (
            !isActive
          ) {
            return;
          }

          setHiddenUserIds(
            savedHiddenUsers
              ? JSON.parse(
                  savedHiddenUsers
                )
              : []
          );

          setBlockedUserIds(
            savedBlockedUsers
              ? JSON.parse(
                  savedBlockedUsers
                )
              : []
          );

          setHiddenPostIds(
            savedHiddenPosts
              ? JSON.parse(
                  savedHiddenPosts
                )
              : []
          );
        } catch (
          error
        ) {
          console.log(
            'CREW LOCAL SETTINGS LOAD ERROR',
            error
          );
        }
      };

    /*
     * 메모리에 있는 값은 서버를 기다리지
     * 않고 즉시 화면에 적용합니다.
     */
    const data =
      getRootOnboardingData();

    setNotifications(
      getRootCrewNotifications()
    );

    setEarnedBadges(
      getEarnedBadges()
    );

    setMainBadgeId(
      getRootMainBadgeId()
    );

    setFollowingUsers(
      data?.followingUsers ??
        []
    );

    setUserProfile(
      data
    );

    /*
     * 서로 기다리지 않고 동시에 시작합니다.
     * 한 요청이 멈춰도 다른 화면 데이터는 표시됩니다.
     */
    void loadCrewsFirst();
    void loadPosts();
    void loadJoinRequests();
    void loadReports();
    void loadLocalSettings();

    return () => {
      isActive =
        false;
    };
  }, [
    applyCrewState,
    userId,
  ])
);


useFocusEffect(
  useCallback(() => {
    const unsubscribeCrews =
  subscribeRootCrews(
    (nextCrews) => {
      console.log(
        'CREW SUBSCRIBE CHECK',
        {
          currentUserId:
            userId,

          crewCount:
            nextCrews?.length ??
            0,

          crews: (
            nextCrews ?? []
          ).map(
            (crew: any) => ({
              id:
                crew?.id,

              title:
                crew?.title,

              ownerId:
                crew?.ownerId,

              memberIds:
                crew?.memberIds ??
                [],
            })
          ),
        }
      );

      const safeNextCrews =
        Array.isArray(nextCrews)
          ? nextCrews
          : [];


/*
 * 최초 로컬 크루를 아직 불러오는 중이라면
 * 서버 구독의 빈 배열로 화면을 초기화하지 않습니다.
 */
if (
  safeNextCrews.length ===
    0 &&
  !hasInitialCrewLoadRef
    .current
) {
  console.log(
    'CREW EMPTY SNAPSHOT IGNORED: INITIAL LOCAL LOAD PENDING'
  );

  return;
}


      /*
       * Firestore 구독이 연결되는 순간
       * 일시적으로 빈 배열을 보내는 경우가 있습니다.
       * 이미 크루를 불러온 상태라면 바로 지우지 않고
       * 잠시 후 서버에서 한 번 더 확인합니다.
       */
      if (
        safeNextCrews.length === 0 &&
        crewsRef.current.length > 0
      ) {
        if (
          emptyCrewRefreshTimerRef.current
        ) {
          clearTimeout(
            emptyCrewRefreshTimerRef.current
          );
        }

        emptyCrewRefreshTimerRef.current =
          setTimeout(async () => {
            try {
              const refreshedCrews =
                await loadRootCrews();

              const safeRefreshedCrews =
  Array.isArray(
    refreshedCrews
  )
    ? refreshedCrews
    : [];

applyCrewState(
  safeRefreshedCrews
);
            } catch (error) {
              console.log(
                'CREW EMPTY REFRESH ERROR',
                error
              );
            }
          }, 500);

        return;
      }

      if (
        emptyCrewRefreshTimerRef.current
      ) {
        clearTimeout(
          emptyCrewRefreshTimerRef.current
        );

        emptyCrewRefreshTimerRef.current =
          null;
      }

      applyCrewState(
  safeNextCrews
);
    }
  );

    const unsubscribePosts = subscribeRootCrewPosts((nextPosts) => {
      setCrewPosts(nextPosts);
    });

    const unsubscribeJoinRequests =
      subscribeRootCrewJoinRequests((nextRequests) => {
        setJoinRequests(nextRequests);
      });

      const unsubscribeNotifications =
  subscribeRootCrewNotifications(userId, (nextNotifications) => {
    setNotifications(nextNotifications);
  });

    return () => {
      unsubscribeCrews();
      unsubscribePosts();
      unsubscribeJoinRequests();
       unsubscribeNotifications();

      if (
        emptyCrewRefreshTimerRef.current
      ) {
        clearTimeout(
          emptyCrewRefreshTimerRef.current
        );

        emptyCrewRefreshTimerRef.current =
          null;
      }
    };
  }, [
  applyCrewState,
  userId,
])
);

/*
 * 게시글의 실제 작성자 ID를 항상 문자열로 맞춥니다.
 * 게시글 id는 게시글 자체의 ID이므로 userId가 있으면 반드시 userId를 우선합니다.
 */
const getCrewPostUserId = (post: any) =>
  String(
    post?.userId ??
      post?.ownerId ??
      post?.uid ??
      post?.id ??
      ''
  );

/*
 * 이전 코드에서는 팔로우할 때 게시글 id(profileUser.id)를 저장했습니다.
 * 이미 저장된 예전 값도 해당 게시글의 userId로 해석해 줍니다.
 */
const resolveStoredFollowingUserId = (savedId: any) => {
  const savedIdText = String(savedId ?? '');

  const legacyPost = crewPosts.find(
    (post: any) =>
      String(post?.id ?? '') === savedIdText
  );

  return legacyPost
    ? getCrewPostUserId(legacyPost)
    : savedIdText;
};

const followedUserIdSet = new Set(
  followingUsers.map(resolveStoredFollowingUserId)
);

const isFollowingUser = (targetUserId: any) =>
  followedUserIdSet.has(String(targetUserId ?? ''));

/*
 * 언팔로우할 때는 실제 저장되어 있는 값이 예전 게시글 id인지,
 * 새 userId인지 찾아서 정확히 제거합니다.
 */
const getStoredFollowingId = (targetUserId: any) => {
  const targetIdText = String(targetUserId ?? '');

  return followingUsers.find(
    (savedId) =>
      resolveStoredFollowingUserId(savedId) ===
      targetIdText
  );
};

/*
 * 숨김/차단 목록에는 ID만 저장되어 있으므로,
 * 전체 crewPosts에서 같은 작성자를 찾아 닉네임을 표시합니다.
 */
const getCrewUserNickname = (targetUserId: any) => {
  const targetIdText = String(targetUserId ?? '');

  const matchedPost = crewPosts.find(
    (post: any) =>
      getCrewPostUserId(post) === targetIdText
  );

  return (
    matchedPost?.nickname ??
    matchedPost?.userNickname ??
    '루트 사용자'
  );
};

/*
 * 같은 사용자가 숨김과 차단에 모두 있으면
 * 더 강한 상태인 차단 한 줄만 보여줍니다.
 */
const managedCrewUsers = [
  ...hiddenUserIds
    .filter(
      (id) =>
        !blockedUserIds.includes(id)
    )
    .map((id) => ({
      id,
      status: 'hidden' as const,
    })),

  ...blockedUserIds.map((id) => ({
    id,
    status: 'blocked' as const,
  })),
];

/*
 * 전체 피드에는 전체공개 게시글만 표시합니다.
 *
 * 이전 게시글 호환:
 * target이 없고 crewId도 없는 게시글은
 * 기존 전체공개 게시글로 판단합니다.
 */
const globalVisiblePosts =
  crewPosts.filter(
    (post: any) => {
      if (
        post?.target ===
        'public'
      ) {
        return true;
      }

      if (
        post?.target ===
        'crew'
      ) {
        return false;
      }

      const hasCrewId =
        Boolean(
          post?.crewId ??
          post?.sharedCrewId
        );

      return !hasCrewId;
    }
  );

const baseFeeds =
  feedMode === 'following'
    ? globalVisiblePosts.filter(
        (feed: any) =>
          isFollowingUser(
            getCrewPostUserId(feed)
          )
      )
    : globalVisiblePosts;
const visibleBaseFeeds = baseFeeds.filter((feed: any) => {
const targetUserId = getCrewPostUserId(feed);  
const targetPostId = String(feed.id ?? '');


return (
  !hiddenUserIds.includes(targetUserId) &&
  !blockedUserIds.includes(targetUserId) &&
  !hiddenPostIds.includes(targetPostId)
);
});
const crewIconOptionsByCategory = {
  exercise: [    '🏃',    '🚴',    '🏋️',    '🤸',    '🤾',    '🏊',    '🥊',    '🥋',    '⚽',    '🏀',    '🏐',    '🎾',    '🏸',    '🥏',    '⛳',    '🏓',    '💪',    '🔥',    '🏆',    '🎯',  ],
  study: [    '📚',    '📖',    '📕',    '📘',    '📗',    '📙',    '✏️',    '📝',    '📒',    '📓',    '📑',    '📋',    '📊',    '📈',   '📐',    '🧮',    '💡',    '🧠',    '🏆',    '🌱',  ],
  mental: [    '🧘',   '🌱',    '🌿',    '🍀',    '☕',    '🌙',    '✨',    '🕯️',    '🪷',    '💙',  ],
 daily: [
 '💼',
 '💻',
 '🖥️',
 '📊',
 '📈',
 '📝',
 '🛠️',
 '🎨',
 '📷',
 '🏆',
],
};
const categoryFilteredFeeds =  selectedCategory === 'all'    ? visibleBaseFeeds    : visibleBaseFeeds.filter((feed) => feed.category === selectedCategory);
const filteredFeeds = categoryFilteredFeeds;
const openCrewDetailPage = (crew: any) => {
  if (!crew || !crew.id) {
    setNoticeModal({
      title: '크루 오류',
      message: '크루 정보를 불러오지 못했어요.',
    });
    return;
  }

  router.push({
    pathname: '/crew-detail',
    params: {
      id: String(crew.id),
    },
  });
};
const handleNotificationPress = async (item: any) => {
  const nextNotifications =
    await markRootCrewNotificationRead(item?.id);

  setNotifications(nextNotifications);

  setShowNotifications(false);

  if (
   item.type === 'joinRequest' ||
    item.type === 'joinApproved' ||
    item.type === 'joinRejected' ||
    item.type === 'notice' ||
    item.type === 'goal'
  ) {
    if (item.postId) {
      router.push({
        pathname: '/crew-detail',
        params: {
          id: String(item.postId),
        },
      });
    }
    return;
  }

  if (
  item.type ===
  'follow'
) {
  const targetUser =
    crewPosts.find(
      (post: any) =>
        getCrewPostUserId(
          post
        ) ===
        String(
          item?.userId ??
            ''
        )
    );

  const targetUserId =
    String(
      targetUser?.userId ??
        item?.userId ??
        ''
    );

  if (!targetUserId) {
    setNoticeModal({
      title:
        '프로필 없음',

      message:
        '해당 사용자의 정보를 찾을 수 없어요.',
    });

    return;
  }

  router.push({
    pathname:
      '/user-profile',

    params: {
      userId:
        targetUserId,

      nickname:
        String(
          targetUser
            ?.nickname ??
            '루트유저'
        ),

      profileEmoji:
        String(
          targetUser
            ?.profileEmoji ??
            '🦊'
        ),

      level:
        String(
          targetUser
            ?.level ??
            1
        ),

      followers:
        String(
          targetUser
            ?.followersCount ??
            targetUser
              ?.followerCount ??
            0
        ),

      following:
        String(
          targetUser
            ?.followingCount ??
            0
        ),

      mainBadgeIcon:
        String(
          targetUser
            ?.mainBadgeIcon ??
            targetUser
              ?.mainBadge
              ?.icon ??
            ''
        ),

      mainBadgeTitle:
        String(
          targetUser
            ?.mainBadgeTitle ??
            targetUser
              ?.mainBadge
              ?.title ??
            ''
        ),
    },
  });

  return;
}

  const targetPost = crewPosts.find(
    (post: any) => String(post.id) === String(item.postId)
  );

  if (!targetPost) {
    setNoticeModal({
      title: '게시글 없음',
      message: '해당 게시글을 찾을 수 없어요.',
    });
    return;
  }

  const targetUserId = String(
    targetPost.userId ?? targetPost.id ?? ''
  );

  if (blockedUserIds.includes(targetUserId)) {
    setNoticeModal({
      title: '차단한 사용자',
      message: '차단한 사용자의 알림은 열 수 없어요.',
    });
    return;
  }

  setCommentPost(targetPost);
};

const getCrewOwnerUserId = (
  crew: any
) =>
  String(
    crew?.ownerId ??
      crew?.ownerUid ??
      crew?.createdBy ??
      ''
  ).trim();

const getCrewMemberUserIds = (
  crew: any
) => {
  const rawMembers =
    Array.isArray(crew?.memberIds)
      ? crew.memberIds
      : Array.isArray(
          crew?.memberUids
        )
      ? crew.memberUids
      : Array.isArray(crew?.members)
      ? crew.members
      : [];

  return rawMembers
    .map((member: any) =>
      String(
        typeof member === 'object' &&
          member !== null
          ? member?.uid ??
              member?.userId ??
              member?.id ??
              ''
          : member
      ).trim()
    )
    .filter(Boolean);
};

const normalizedCurrentUserId =
  String(userId).trim();

const myOwnedCrews =
  crews.filter((crew: any) =>
    getCrewOwnerUserId(crew) ===
    normalizedCurrentUserId
  );

const ownedCrewIdSet =
  new Set(
    myOwnedCrews.map(
      (crew: any) =>
        String(crew?.id ?? '')
    )
  );

const myJoinedOnlyCrews =
  crews.filter((crew: any) => {
    const isOwner =
      getCrewOwnerUserId(crew) ===
      normalizedCurrentUserId;

    const isMember =
      getCrewMemberUserIds(
        crew
      ).includes(
        normalizedCurrentUserId
      );

    return !isOwner && isMember;
  });

console.log(
  'MY CREW FILTER CHECK',
  {
    currentUserId:
      normalizedCurrentUserId,
    totalCrewCount:
      crews.length,
    ownedCrewCount:
      myOwnedCrews.length,
    joinedCrewCount:
      myJoinedOnlyCrews.length,
  }
);

const myCrewJoinRequests:
  any[] =
  joinRequests.filter(
    (request: any) => {
      const isPending =
        request?.status ===
        'pending';

      const isMyCrewRequest =
        ownedCrewIdSet.has(
          String(
            request?.crewId ??
              ''
          )
        );

      return (
        isPending &&
        isMyCrewRequest
      );
    }
  );

const crewSearchKeyword =
  searchText
    .trim()
    .toLowerCase();

const crewSearchResultCrews = crews.filter((crew) => {
  const categoryMatched =
    crewSearchCategory === 'all' ||
    crew.category === crewSearchCategory;

  const title = String(crew.title ?? '').toLowerCase();
  const description = String(crew.description ?? '').toLowerCase();

  const categoryLabel =
    categories.find((item) => item?.id === crew.category)?.label ?? '';

  const keywordMatched =
    crewSearchKeyword.length === 0 ||
    title.includes(crewSearchKeyword) ||
    description.includes(crewSearchKeyword) ||
    categoryLabel.toLowerCase().includes(crewSearchKeyword);

  return categoryMatched && keywordMatched;
});
      
const handleSubmitReport = async () => {
  if (!reportPost || isSubmittingReport) {
    return;
  }

  Keyboard.dismiss();

  if (!reportReason) {
    setNoticeModal({
      title: '신고 사유 선택',
      message: '신고 사유를 먼저 선택해주세요.',
    });
    return;
  }

  setIsSubmittingReport(true);

  try {
    const newReport = {
      id: String(Date.now()),
      postId: String(reportPost.id),
      postTitle:
        reportPost.title ??
        '제목 없는 기록',
      crewId:
        reportPost.crewId ??
        reportPost.sharedCrewId ??
        null,
      reporterId: userId,
      targetUserId:
        getCrewPostUserId(reportPost),
      targetNickname:
        reportPost.nickname ??
        '루트유저',
      reason: reportReason,
      detail: reportDetail.trim(),
      createdAt:
        new Date().toISOString(),
    };

    await addRootCrewReport(newReport);

    const nextReports = [
      ...crewReports,
      newReport,
    ];

    setCrewReports(nextReports);

    const reportCount =
      nextReports.filter(
        (item) =>
          String(item.postId) ===
          String(reportPost.id)
      ).length;

    if (reportCount >= 3) {
      const postId =
        String(reportPost.id);

      const nextHiddenPostIds =
        hiddenPostIds.includes(postId)
          ? hiddenPostIds
          : [
              ...hiddenPostIds,
              postId,
            ];

      setHiddenPostIds(
        nextHiddenPostIds
      );

      await AsyncStorage.setItem(
        HIDDEN_CREW_POSTS_KEY,
        JSON.stringify(
          nextHiddenPostIds
        )
      );
    }

    setReportPost(null);
    setReportReason('');
    setReportDetail('');

    setNoticeModal({
      title:
        reportCount >= 3
          ? '신고 접수 및 자동 숨김'
          : '신고 접수 완료',
      message:
        reportCount >= 3
          ? '신고가 3회 이상 접수되어 이 게시글이 자동으로 숨겨졌어요.'
          : '신고가 접수되었어요. 확인 후 조치할게요.',
    });
  } catch (error: any) {
    console.log(
      'CREW REPORT ERROR',
      {
        message:
          error?.message ??
          String(error),
        code:
          error?.code ??
          null,
      }
    );

    setNoticeModal({
      title: '신고 실패',
      message:
        '신고를 저장하지 못했어요.\n\n' +
        String(
          error?.code ??
          error?.message ??
          '오류 원인을 확인할 수 없어요.'
        ),
    });
  } finally {
    setIsSubmittingReport(false);
  }
};

const mainBadge =  earnedBadges.find((badge) => badge.id === mainBadgeId) ??  earnedBadges[0] ?? {    id: 'none',    icon: '🌱',    title: '새싹 루터',  };
const earnedBadgeIds = earnedBadges.map((badge) => badge.id);
const isGuest = !!userProfile && !userProfile?.uid;

if (isGuest) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>크루</Text>

      <View style={styles.emptyFeedBox}>
        <Text style={styles.emptyFeedTitle}>
          구글 로그인이 필요해요
        </Text>

        <Text style={styles.emptyFeedDesc}>
  공유 기능은 구글 로그인 후 사용할 수 있어요.
</Text>

        <Pressable
  style={styles.guestLoginButton}
  onPress={() => router.push('/settings')}
>
  <Text style={styles.guestLoginButtonText}>
    로그인하러 가기
  </Text>
</Pressable>
      </View>
    </View>
  );
}

  return (
    <>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 130 }}
    >
    
<View style={styles.titleRow}>
  <Text style={styles.title}>크루</Text>

  <View style={styles.crewTopButtonRow}>
    <Pressable
      style={styles.crewTopButton}
      onPress={() => {
        setShowNotifications(true);
      }}
    >
      <Text style={styles.crewTopButtonText}>
        {notifications.filter((n) => !n.read).length > 0
          ? `🔔 ${notifications.filter((n) => !n.read).length}`
          : '🔔'}
      </Text>
    </Pressable>
  </View>
</View>

<View style={styles.crewHomeSection}>
  <Text style={styles.sectionTitle}>👑 내가 만든 크루</Text>

  {myOwnedCrews.length === 0 ? (
    <Pressable
      style={styles.crewEmptyOnlyButton}
      onPress={() =>
        setShowCreateCrewModal(true)
      }
    >
      <Text style={styles.crewEmptyOnlyButtonText}>
        크루 만들기
      </Text>
    </Pressable>
  ) : (
    myOwnedCrews.map((crew) => (
      <Pressable
        key={crew.id}
        style={styles.myCrewCard}
        onPress={() =>
          openCrewDetailPage(crew)
        }
      >
        <View style={styles.myCrewLeft}>
          <Text style={styles.crewMiniIcon}>
            {crew.icon ??
              categories.find(
                (category) =>
                  category.id ===
                  crew.category
              )?.icon ??
              '👥'}
          </Text>

          <Text
            style={styles.crewMiniTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {crew.title}
          </Text>

          <Text
            style={styles.crewMiniInfo}
            numberOfLines={1}
          >
            {Math.max(
              getCrewMemberUserIds(
                crew
              ).length,
              Number(
                crew.members ?? 1
              ) || 1
            ).toLocaleString()}명
          </Text>
        </View>

        <Text style={styles.crewRoleBadge}>
          크루장
        </Text>
      </Pressable>
    ))
  )}
</View>

{myCrewJoinRequests.length > 0 ? (
  <View style={styles.crewHomeSection}>
    <Text style={styles.sectionTitle}>
      👥 가입 신청 관리
    </Text>

    {myCrewJoinRequests.map((request) => {
      const targetCrew = crews.find(
        (crew) => String(crew.id) === String(request.crewId)
      );

      return (
        <View key={request?.id} style={styles.searchCrewCard}>
          <Text style={styles.crewMiniIcon}>
            {request.profileEmoji ?? '🦊'}
          </Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.crewMiniTitle}>
              {request.nickname ?? '루트유저'}
            </Text>

            <Text style={styles.crewMiniInfo}>
              {targetCrew?.title ?? '크루'} 가입 신청
            </Text>

            <View style={styles.createCrewButtonRow}>
              <Pressable
                style={styles.createCrewSubmitButton}
                onPress={async () => {
                  const nextRequests =
                    await approveRootCrewJoinRequest(request?.id);

                  const nextCrews = await loadRootCrews();

                  setJoinRequests(nextRequests);
                  applyCrewState(
  nextCrews
);

                  
                  await addRootCrewNotification({
                    id: String(Date.now()),
                    type: 'joinApproved',
                    userId,
                    targetUserId: request.userId,
                    postId: request.crewId,
                    message: `${targetCrew?.title ?? '크루'} 가입이 승인되었어요.`,
                    read: false,
                    createdAt: new Date().toISOString(),
                  });

                  setNoticeModal({
                    title: '가입 승인',
                    message: '가입 신청을 승인했습니다.',
                  });
                }}
              >
                <Text style={styles.createCrewSubmitText}>
                  승인
                </Text>
              </Pressable>

              <Pressable
                style={styles.createCrewCancelButton}
                onPress={async () => {
                  const nextRequests =
                    await rejectRootCrewJoinRequest(request?.id);

                  setJoinRequests(nextRequests);

                  await addRootCrewNotification({
                    id: String(Date.now()),
                    type: 'joinRejected',
                    userId,
                    targetUserId: request.userId,
                    postId: request.crewId,
                    message: `${targetCrew?.title ?? '크루'} 가입 신청이 거절되었어요.`,
                    read: false,
                    createdAt: new Date().toISOString(),
                  });

                  setNoticeModal({
                    title: '가입 거절',
                    message: '가입 신청을 거절했습니다.',
                  });
                }}
              >
                <Text style={styles.createCrewCancelText}>
                  거절
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    })}
  </View>
) : null}

<View style={styles.crewHomeSection}>
  <Text style={styles.sectionTitle}>🙋 내가 가입한 크루</Text>

  {myJoinedOnlyCrews.length === 0 ? (
    <Pressable
      style={styles.crewEmptyOnlyButton}
      onPress={() =>
        setShowCrewSearchModal(true)
      }
    >
      <Text style={styles.crewEmptyOnlyButtonText}>
        크루 가입하기
      </Text>
    </Pressable>
  ) : (
    myJoinedOnlyCrews.map((crew) => (
      <Pressable
        key={crew.id}
        style={styles.myCrewCard}
        onPress={() =>
          openCrewDetailPage(crew)
        }
      >
        <View style={styles.myCrewLeft}>
          <Text style={styles.crewMiniIcon}>
            {crew.icon ??
              categories.find(
                (category) =>
                  category.id ===
                  crew.category
              )?.icon ??
              '👥'}
          </Text>

          <Text
            style={styles.crewMiniTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {crew.title}
          </Text>

          <Text
            style={styles.crewMiniInfo}
            numberOfLines={1}
          >
            {Math.max(
              getCrewMemberUserIds(
                crew
              ).length,
              Number(
                crew.members ?? 1
              ) || 1
            ).toLocaleString()}명
          </Text>
        </View>

        <Text style={styles.crewRoleBadge}>
          멤버
        </Text>
      </Pressable>
    ))
  )}
</View>

     <View style={styles.categoryRow}>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => setSelectedCategory(category.id)}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.activeCategoryButton,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.activeCategoryText,
              ]}
            >
              {category.icon} {category.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.feedControlRow}>
  <Pressable
    style={[
      styles.feedControlButton,
      feedMode === 'all' && styles.activeFeedModeButton,
    ]}
    onPress={() => setFeedMode('all')}
  >
    <Text
      style={[
        styles.feedControlText,
        feedMode === 'all' && styles.activeFeedModeText,
      ]}
    >
      ✨ 전체
    </Text>
  </Pressable>

  <Pressable
    style={[
      styles.feedControlButton,
      feedMode === 'following' && styles.activeFeedModeButton,
    ]}
    onPress={() => setFeedMode('following')}
  >
    <Text
      style={[
        styles.feedControlText,
        feedMode === 'following' && styles.activeFeedModeText,
      ]}
    >
      ❤️ 팔로잉
    </Text>
  </Pressable>

  <Pressable
    style={styles.feedControlButton}
    onPress={() => setShowBlockedManageModal(true)}
  >
    <Text style={styles.feedControlText}>
      🚫 관리
    </Text>
  </Pressable>
</View>

<Text style={styles.sectionTitle}>
  {feedMode === 'following' ? '팔로잉 피드' : '전체 피드'}
</Text>
{filteredFeeds.length === 0 ? (
  <View style={styles.emptyFeedBox}>
    <Text style={styles.emptyFeedTitle}>
      아직 보여줄 기록이 없어요.
    </Text>
    <Text style={styles.emptyFeedDesc}>
      관심 있는 유저를 팔로우하면 여기에 기록이 모여요.
    </Text>
  </View>
) : null}
      {filteredFeeds.map((feed) => {
        const targetUserId =
          getCrewPostUserId(feed);

        const categoryLabel =
          categories.find(
            (category) =>
              category.id ===
              feed.category
          )?.label ??
          String(
            feed.category ??
              '전체'
          );

        const visibilityLabel =
          feed.target === 'crew' ||
          feed.crewId ||
          feed.sharedCrewId
            ? '크루공개'
            : '전체공개';

        const elapsedTime =
          formatCrewPostElapsedTime(
            feed.createdAt ??
              feed.sharedAt ??
              feed.updatedAt
          );

        const minutes =
          Number(
            feed.minutes ?? 0
          );

        const distanceKm =
          Number(
            feed.distanceKm ?? 0
          );

        const photoUri =
          String(
            feed?.photoUri ??
              feed?.photo_url ??
              ''
          ).trim();

        return (
          <View
            key={feed.id}
            style={styles.feedCard}
          >
            {/* 사용자 · 공개 범위 · 경과 시간 */}
            <View
              style={
                styles.feedTop
              }
            >
              <Pressable
                style={
                  styles.feedProfilePress
                }
                onPress={() => {
                  const profileUserId =
                    getCrewPostUserId(
                      feed
                    );

                  if (!profileUserId) {
                    return;
                  }

                  if (
                    blockedUserIds.includes(
                      profileUserId
                    )
                  ) {
                    setNoticeModal({
                      title:
                        '차단한 사용자',

                      message:
                        '차단한 사용자의 프로필은 볼 수 없어요.',
                    });

                    return;
                  }

                  router.push({
                    pathname:
                      '/user-profile',

                    params: {
                      userId:
                        profileUserId,

                      nickname:
                        String(
                          feed?.nickname ??
                            '루트유저'
                        ),

                      profileEmoji:
                        String(
                          feed?.profileEmoji ??
                            '🦊'
                        ),

                      level:
                        String(
                          feed?.level ??
                            1
                        ),

                      followers:
                        String(
                          feed?.followersCount ??
                            feed?.followerCount ??
                            feed?.followers ??
                            0
                        ),

                      following:
                        String(
                          feed?.followingCount ??
                            feed?.following ??
                            0
                        ),

                      mainBadgeIcon:
                        String(
                          feed?.mainBadgeIcon ??
                            feed?.mainBadge?.icon ??
                            ''
                        ),

                      mainBadgeTitle:
                        String(
                          feed?.mainBadgeTitle ??
                            feed?.mainBadge?.title ??
                            ''
                        ),
                    },
                  });
                }}
              >
                <View
                  style={
                    styles.feedAvatar
                  }
                >
                  <Text
                    style={
                      styles.feedAvatarText
                    }
                  >
                    {feed.profileEmoji ??
                      userEmoji}
                  </Text>
                </View>

                <Text
                  style={
                    styles.feedUserName
                  }
                  numberOfLines={1}
                >
                  {feed.nickname ??
                    userNickname}
                </Text>

                <Text
                  style={
                    styles.feedUserMeta
                  }
                  numberOfLines={1}
                >
                  · {visibilityLabel}
                  {' · '}
                  {elapsedTime}
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.reportMenuButton
                }
                onPress={() => {
                  setShowPostMenu(
                    feed
                  );
                }}
              >
                <Text
                  style={
                    styles.reportMenuText
                  }
                >
                  ⋮
                </Text>
              </Pressable>
            </View>

            <View style={styles.feedBody}>
              {/* 카테고리 · 행동목표 · 시간 · 거리 */}
              <View
                style={
                  styles.feedSummaryRow
                }
              >
                <Text
                  style={
                    styles.feedGoalTitle
                  }
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {categoryLabel}
                  {' · '}
                  {feed.title ??
                    '행동목표'}
                </Text>

                {minutes > 0 ||
                distanceKm > 0 ? (
                  <View
                    style={
                      styles.feedMetricsRow
                    }
                  >
                    {minutes > 0 ? (
                      <Text
                        style={
                          styles.feedRecordInfoText
                        }
                      >
                        {formatCrewPostMinutes(
                          minutes
                        )}
                      </Text>
                    ) : null}

                    {distanceKm > 0 ? (
                      <Text
                        style={
                          styles.feedRecordInfoText
                        }
                      >
                        {distanceKm.toFixed(
                          2
                        )}
                        km
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {/* 피드 사진을 누르면 전체 사진을 표시합니다. */}
              {photoUri ? (
                <Pressable
                  style={
                    styles.feedImagePressable
                  }
                  onPress={() => {
                    setSelectedFeedImageUri(
                      photoUri
                    );
                  }}
                >
                  <Image
                    source={{
                      uri: photoUri,
                    }}
                    style={
                      styles.feedImage
                    }
                    resizeMode="cover"
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.feedActionRow}>
              <Pressable
                style={styles.feedCommentButton}
                onPress={() => {
                  if (
                    blockedUserIds.includes(
                      targetUserId
                    )
                  ) {
                    setNoticeModal({
                      title:
                        '차단한 사용자',
                      message:
                        '차단한 사용자의 기록에는 댓글을 남길 수 없어요.',
                    });
                    return;
                  }

                  setCommentPost(feed);
                }}
              >
                <Text style={styles.feedActionText}>
                  💬 {feed.comments?.length ?? 0}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.cheerButton,
                  feed.cheered &&
                    styles.activeCheerButton,
                ]}
                onPress={async () => {
                  if (
                    blockedUserIds.includes(
                      targetUserId
                    )
                  ) {
                    setNoticeModal({
                      title:
                        '차단한 사용자',
                      message:
                        '차단한 사용자의 기록은 응원할 수 없어요.',
                    });
                    return;
                  }

                  const wasCheered =
                    feed.cheered === true;

                  const nextPosts =
                    await toggleRootCrewPostCheer(
                      feed.id
                    );

                  setCrewPosts([
                    ...nextPosts,
                  ]);

                  setEarnedBadges(
                    getEarnedBadges()
                  );

                  await checkBadgeReward(
                    setNewBadge,
                    setEarnedBadges
                  );

                  if (
                    !wasCheered &&
                    targetUserId !== userId
                  ) {
                    await addRootCrewNotification({
                      id: String(
                        Date.now()
                      ),
                      type: 'support',
                      userId,
                      targetUserId:
                        feed.userId,
                      postId:
                        feed.id,
                      message:
                        `${userNickname}님이 "${feed.title}" 기록을 응원했어요.`,
                      read: false,
                      createdAt:
                        new Date().toISOString(),
                    });
                  }
                }}
              >
                <Text
                  style={[
                    styles.cheerButtonText,
                    feed.cheered &&
                      styles.activeCheerButtonText,
                  ]}
                >
                  👏 {feed.cheers ?? 0}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
      <View style={{ height: 130 }} />
    </ScrollView>

<Modal visible={showCrewSearchModal} transparent animationType="slide">
  <KeyboardAvoidingView
    style={styles.createCrewModalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
  >
    <View style={styles.createCrewModalBox}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.createCrewModalContent}
      >
        <View style={styles.crewSearchModalHeader}>
          <Text style={styles.createCrewTitle}>🔍 크루 검색</Text>

          <Pressable onPress={() => setShowCrewSearchModal(false)}>
            <Text style={styles.profileClose}>×</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.subText} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="크루 이름, 소개글 검색"
            placeholderTextColor={theme.subText}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.categoryRow}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setCrewSearchCategory(category.id)}
              style={[
                styles.categoryButton,
                crewSearchCategory === category.id &&
                  styles.activeCategoryButton,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  crewSearchCategory === category.id &&
                    styles.activeCategoryText,
                ]}
              >
                {category.icon} {category.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {crewSearchResultCrews.length === 0 ? (
          <View style={styles.emptyFeedBox}>
            <Text style={styles.emptyFeedTitle}>
              검색된 크루가 없어요.
            </Text>
          </View>
        ) : (
          crewSearchResultCrews.map((crew) => {
            const alreadyJoined = (
  crew?.memberIds ?? []
).some(
  (memberId: any) =>
    String(memberId) ===
    String(userId)
);

const alreadyRequested =
  joinRequests.some(
    (item: any) =>
      String(
        item?.crewId ?? ''
      ) ===
        String(
          crew?.id ?? ''
        ) &&
      String(
        item?.userId ?? ''
      ) ===
        String(userId) &&
      item?.status ===
        'pending'
  );

            return (
              <View
  key={crew.id}
  style={styles.searchCrewCard}
>
                <Text style={styles.crewMiniIcon}>
                  {crew.icon ??
                    categories.find((c) => c.id === crew.category)?.icon ??
                    '👥'}
                </Text>

                <View style={{ flex: 1 }}>
                  <Text style={styles.crewMiniTitle}>{crew.title}</Text>

                  <Text style={styles.crewMiniInfo}>
                    {crew.description || '소개글이 없어요.'}
                  </Text>

                  <Text style={styles.crewMiniInfo}>
                    {Number(
                      crew.memberIds?.length ?? crew.members ?? 1
                    ).toLocaleString()}
                    명 · {crew.joinType === 'approval' ? '승인가입' : '자유가입'}
                  </Text>

                  <Pressable
  disabled={alreadyJoined || alreadyRequested}
  onPress={async () => {
    if (alreadyJoined || alreadyRequested) return;

    if (crew.joinType === 'approval') {
      const nextRequests = await requestRootCrewJoin(
        crew.id,
        userId,
        userNickname,
        userEmoji
      );

      setJoinRequests(nextRequests);

      await addRootCrewNotification({
  id: String(Date.now()),
  type: 'joinRequest',
  userId,
  targetUserId: crew.ownerId,
  postId: crew.id,
  message: `${userNickname}님이 ${crew.title} 가입을 신청했어요.`,
  read: false,
  createdAt: new Date().toISOString(),
});

      setNoticeModal({
        title: '가입 신청 완료',
        message: '크루장 승인 후 가입돼요.',
      });

      return;
    }

    const nextCrews = await joinRootCrew(crew, userId);

    applyCrewState(
  nextCrews
);
    setShowCrewSearchModal(false);

    setNoticeModal({
      title: '크루 가입 완료',
      message: `${crew.title} 크루에 가입했어요.`,
    });
  }}
>
  <Text
    style={[
      styles.searchCrewStatus,
      alreadyJoined && styles.searchCrewStatusJoined,
      alreadyRequested && styles.searchCrewStatusRequested,
    ]}
  >
    {alreadyJoined
      ? '가입중'
      : alreadyRequested
      ? '신청중'
      : crew.joinType === 'approval'
      ? '신청하기'
      : '가입하기'}
  </Text>
</Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>

    <Modal visible={!!commentPost} transparent animationType="slide">
  <KeyboardAvoidingView
    style={styles.commentModalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View style={styles.commentModalBox}>
      <Text style={styles.commentModalTitle}>💬 댓글</Text>
      <ScrollView style={styles.commentList}>
        {commentPost?.comments?.length ? (
  commentPost.comments
    .filter(Boolean)
    .map(
      (
        comment: any,
        index: number
      ) => (
        <View
          key={String(
            comment?.id ??
              index
          )}
          style={
            styles.commentItem
          }
        >
          <Text
            style={
              styles.commentNicknameText
            }
            numberOfLines={1}
          >
            {comment?.nickname ??
              userNickname ??
              '루트유저'}
          </Text>

          <Text
            style={
              styles.commentBodyText
            }
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {String(
              comment?.text ??
                ''
            )}
          </Text>
        </View>
      )
    )
) : (
          <Text style={styles.noCommentText}>
            아직 댓글이 없어요.
          </Text>
        )}
      </ScrollView>



      <TextInput
        value={commentText}
        onChangeText={setCommentText}
        placeholder="댓글을 입력하세요."
        placeholderTextColor={theme.subText}
        style={styles.commentInput}
      />

      <View style={styles.commentButtonRow}>
        <Pressable
          style={styles.commentCancelButton}
          onPress={() => {
            setCommentPost(null);
            setCommentText('');
                      }}
        >
          <Text style={styles.commentCancelText}>닫기</Text>
        </Pressable>

        <Pressable
          style={styles.commentSubmitButton}
          onPress={async () => {
  if (!commentPost) {
    return;
  }

  const nextCommentText =
    commentText.trim();

  const commentError =
    validateText(
      nextCommentText,
      {
        label: '댓글',
        min: 1,
        max: 100,
      }
    );

  if (commentError) {
    setNoticeModal({
      title:
        '댓글 확인',

      message:
        commentError,
    });

    return;
  }

  const targetPostId =
    String(
      commentPost?.id ??
        ''
    );

  const targetUserId =
    String(
      commentPost?.userId ??
        ''
    );

  try {
    const nextPosts =
      await addRootCrewPostComment(
        targetPostId,

        nextCommentText,

        userNickname ??
          '루트유저',

        userEmoji ??
          '🦊'
      );

    setCrewPosts([
      ...nextPosts,
    ]);

    const updatedPost =
      nextPosts.find(
        (post: any) =>
          String(
            post?.id ?? ''
          ) ===
          targetPostId
      );

   /*
 * 댓글 데이터는 crewPosts에
 * 이미 반영됐으므로 댓글창을 닫습니다.
 */
setCommentPost(null);

setCommentText('');

Keyboard.dismiss();

console.log(
  'CREW COMMENT UI COMPLETE',
  {
    postId:
      targetPostId,

    commentCount:
      updatedPost
        ?.comments
        ?.length ?? 0,
  }
);

/*
 * Android에서 기존 Modal이
 * 닫힌 다음 완료창을 표시합니다.
 */
setTimeout(() => {
  setNoticeModal({
    title:
      '댓글 등록 완료',

    message:
      '댓글이 정상적으로 등록되었어요.',
  });
}, 350);
    /*
     * 상대방 알림은 댓글 표시 뒤
     * 별도로 전송합니다.
     */
    if (
      targetUserId &&
      targetUserId !==
        String(userId)
    ) {
      addRootCrewNotification({
        id:
          String(Date.now()),

        type:
          'comment',

        userId,

        targetUserId,

        postId:
          targetPostId,

        message:
          `${commentPost?.title ?? '기록'} 기록에 새 댓글이 달렸어요.`,

        read:
          false,

        createdAt:
          new Date()
            .toISOString(),
      }).catch(
        (error: any) => {
          console.log(
            'CREW COMMENT NOTIFICATION ERROR',
            error
          );
        }
      );
    }

    setNotifications(
      getRootCrewNotifications()
    );

    setEarnedBadges(
      getEarnedBadges()
    );

    checkBadgeReward(
      setNewBadge,
      setEarnedBadges
    ).catch(
      (error: any) => {
        console.log(
          'CREW COMMENT BADGE CHECK ERROR',
          error
        );
      }
    );
  } catch (error: any) {
    console.log(
      'CREW COMMENT SAVE ERROR',
      {
        postId:
          targetPostId,

        message:
          error?.message ??
          String(error),

        code:
          error?.code ??
          null,
      }
    );

    setCommentPost(null);

Keyboard.dismiss();

setTimeout(() => {
  setNoticeModal({
    title:
      '댓글 등록 실패',

    message:
      '댓글을 등록하지 못했어요.\n네트워크 연결을 확인한 뒤 다시 시도해주세요.',
  });
}, 350);
  }
}}
        >
          <Text style={styles.commentSubmitText}>등록</Text>
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal visible={showNotifications} transparent animationType="slide">
  <View style={styles.notificationModalOverlay}>
    <View style={styles.notificationModalBox}>
      <Text style={styles.notificationModalTitle}>🔔 알림</Text>

<View style={styles.notificationActionRow}>
  <Pressable
    style={styles.notificationSmallButton}
    onPress={async () => {
      const nextNotifications =
        await markAllRootCrewNotificationsRead();

      setNotifications(nextNotifications);
    }}
  >
    <Text style={styles.notificationSmallButtonText}>
      모두 읽음
    </Text>
  </Pressable>

 <Pressable
  style={
    styles.notificationSmallDangerButton
  }
  onPress={() => {
    /*
     * 기존 알림 Modal을 먼저 닫아야
     * Android에서 확인창 버튼이 눌립니다.
     */
    setShowNotifications(false);

    setTimeout(() => {
      setShowDeleteAllNotificationsConfirm(
        true
      );
    }, 250);
  }}
>
    <Text style={styles.notificationSmallDangerText}>
      모두 삭제
    </Text>
  </Pressable>
</View>

      <ScrollView style={styles.notificationList}>
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <Pressable
  key={String(
    item?.id ?? ''
  )}
  style={[
    styles.notificationItem,
    item?.read &&
      styles.readNotificationItem,
  ]}
  onPress={() =>
    handleNotificationPress(item)
  }
>
  <Text
    style={
      styles.notificationText
    }
    numberOfLines={2}
    ellipsizeMode="tail"
  >
    {item.type === 'follow'
      ? '❤️ ' + item.message
      : item.type ===
          'joinRequest'
      ? '🙋 ' + item.message
      : item.type ===
          'joinApproved'
      ? '✅ ' + item.message
      : item.type ===
          'joinRejected'
      ? '❌ ' + item.message
      : item.type === 'support'
      ? '👏 ' + item.message
      : item.type === 'notice'
      ? '📌 ' + item.message
      : item.type === 'goal'
      ? '🎯 ' + item.message
      : '💬 ' + item.message}
  </Text>

  <Text
    style={
      styles.notificationDate
    }
  >
    {String(
      item?.createdAt ?? ''
    )
      .slice(0, 16)
      .replace('T', ' ')}
  </Text>

  <Pressable
    style={
      styles.notificationDeleteButton
    }
    hitSlop={8}
    onPress={(event) => {
      /*
       * 바깥쪽 알림 Pressable이
       * 함께 눌리는 것을 막습니다.
       */
      event.stopPropagation();

      /*
       * 알림창을 먼저 닫은 뒤
       * 삭제 확인창을 엽니다.
       */
      setShowNotifications(false);

      setTimeout(() => {
        setDeleteNotificationTarget(
          item
        );
      }, 250);
    }}
  >
    <Text
      style={
        styles.notificationDeleteText
      }
    >
      삭제
    </Text>
  </Pressable>
</Pressable>
          ))
        ) : (
          <Text style={styles.noNotificationText}>
            아직 알림이 없어요.
          </Text>
        )}
      </ScrollView>

      <Pressable
        style={styles.notificationCloseButton}
        onPress={() => setShowNotifications(false)}
      >
        <Text style={styles.notificationCloseText}>닫기</Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal visible={showBadgeList} transparent animationType="slide">
  <View style={styles.badgeModalOverlay}>
    <View style={styles.badgeModalBox}>
      <View style={styles.badgeModalHeader}>
        <Text style={styles.badgeModalTitle}>🏅 전체 뱃지</Text>

        <Pressable onPress={() => setShowBadgeList(false)}>
          <Text style={styles.badgeModalClose}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.badgeModalDesc}>
        획득한 뱃지와 아직 잠긴 뱃지를 확인해요.
      </Text>

      <ScrollView style={styles.badgeList}>
        {ROOT_BADGES.map((badge) => {
          const earned = earnedBadgeIds.includes(badge.id);

          return (
            <Pressable
  key={badge.id}
  disabled={!earned}
  onPress={async () => {
    if (!earned) return;

    await setRootMainBadgeId(badge.id);
    setMainBadgeId(badge.id);
    setShowBadgeList(false);
  }}
  style={[
    styles.badgeListItem,
    !earned && styles.lockedBadgeItem,
    mainBadgeId === badge.id && styles.activeMainBadgeItem,
  ]}
>
              <Text style={styles.badgeListIcon}>
                {earned ? badge.icon : '🔒'}
              </Text>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.badgeListTitle,
                    !earned && styles.lockedBadgeText,
                  ]}
                >
                  {badge.title}
                </Text>

                <Text
                  style={[
                    styles.badgeListDesc,
                    !earned && styles.lockedBadgeText,
                  ]}
                >
                  {earned ? badge.desc : badge.conditionText}
                </Text>
              </View>

              <Text
                style={[
                  styles.badgeStatusText,
                  earned && styles.earnedBadgeStatusText,
                ]}
              >
                {mainBadgeId === badge.id ? '대표' : earned ? '획득' : '잠김'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  </View>
</Modal>

<Modal
  visible={!!newBadge}
  transparent
  animationType="fade"
>
  <View style={styles.newBadgeOverlay}>
    <View style={styles.newBadgeBox}>
      <Text style={styles.newBadgeTitle}>
        🎉 새로운 뱃지 획득!
      </Text>

      <Text style={styles.newBadgeIcon}>
        {newBadge?.icon}
      </Text>

      <Text style={styles.newBadgeName}>
        {newBadge?.title}
      </Text>

      <Text style={styles.newBadgeDesc}>
        {newBadge?.desc}
      </Text>

      <Pressable
        style={styles.newBadgeButton}
        onPress={() => setNewBadge(null)}
      >
        <Text style={styles.newBadgeButtonText}>
          확인
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal visible={showCreateCrewModal} transparent animationType="slide">
  <KeyboardAvoidingView
    style={styles.createCrewModalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View style={styles.createCrewModalBox}>
      <ScrollView
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={styles.createCrewModalContent}
  >
      <Text style={styles.createCrewTitle}>🛖 크루 만들기</Text>

      <Text style={styles.createCrewLabel}>1. 카테고리 선택</Text>
      <View style={styles.createCrewCategoryRow}>
        {categories
          .filter((item) => item?.id !== 'all')
          .map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.createCrewCategoryButton,
                newCrewCategory === category.id &&
                  styles.activeCreateCrewCategoryButton,
              ]}
              onPress={() => {
  const nextCategory =
    category.id as 'exercise' | 'study' | 'mental' | 'daily';

  setNewCrewCategory(nextCategory);
  setNewCrewIcon(crewIconOptionsByCategory[nextCategory][0]);
}}
            >
              <Text
                style={[
                  styles.createCrewCategoryText,
                  newCrewCategory === category.id &&
                    styles.activeCreateCrewCategoryText,
                ]}
              >
                {category.icon} {category.label}
              </Text>
            </Pressable>
          ))}
      </View>

<Text style={styles.createCrewLabel}>2. 크루 이모티콘</Text>

<View style={styles.crewIconSelectRow}>
  {(newCrewCategory
    ? crewIconOptionsByCategory[newCrewCategory]
    : []
  ).map((icon) => (
    <Pressable
      key={icon}
      style={[
        styles.crewIconSelectButton,
        newCrewIcon === icon &&
          styles.activeCrewIconSelectButton,
      ]}
      onPress={() => setNewCrewIcon(icon)}
    >
      <Text style={styles.crewIconSelectText}>
        {icon}
      </Text>
    </Pressable>
  ))}
</View>

      <Text style={styles.createCrewLabel}>3. 크루 이름</Text>
      <TextInput
        value={newCrewTitle}
        onChangeText={setNewCrewTitle}
        placeholder="자전거 출근 크루"
        placeholderTextColor={theme.subText}
        style={styles.createCrewInput}
        maxLength={10}
      />

      <Text style={styles.createCrewLabel}>4. 소개글</Text>
      <TextInput
        value={newCrewDescription}
        onChangeText={setNewCrewDescription}
        placeholder="매일 함께 성장하는 크루예요."
        placeholderTextColor={theme.subText}
        style={[styles.createCrewInput, styles.createCrewTextArea]}
        multiline
      />

      <Text style={styles.createCrewLabel}>5. 가입 방식</Text>
      <View style={styles.joinTypeRow}>
        <Pressable
          style={[
            styles.joinTypeButton,
            newCrewJoinType === 'free' && styles.activeJoinTypeButton,
          ]}
          onPress={() => setNewCrewJoinType('free')}
        >
          <Text
            style={[
              styles.joinTypeText,
              newCrewJoinType === 'free' &&
                styles.activeJoinTypeText,
            ]}
          >
            자유가입
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.joinTypeButton,
            newCrewJoinType === 'approval' && styles.activeJoinTypeButton,
          ]}
          onPress={() => setNewCrewJoinType('approval')}
        >
          <Text
            style={[
              styles.joinTypeText,
              newCrewJoinType === 'approval' &&
                styles.activeJoinTypeText,
            ]}
          >
            승인가입
          </Text>
        </Pressable>
      </View>

      <View style={styles.createCrewButtonRow}>
        <Pressable
          style={styles.createCrewCancelButton}
          onPress={() => setShowCreateCrewModal(false)}
        >
          <Text style={styles.createCrewCancelText}>취소</Text>
        </Pressable>

        <Pressable
  style={styles.createCrewSubmitButton}
  onPress={async () => {
    const latestData =
      getRootOnboardingData() ??
      userProfile ??
      {};

    const currentUserId =
      String(
        latestData?.uid ??
          latestData?.guestId ??
          'guest'
      );

  
    if (!newCrewCategory) {
      setNoticeModal({
        title: '카테고리 선택',
        message:
          '크루의 카테고리를 먼저 선택해주세요.',
      });

      return;
    }

    const crewTitleError =
      validateText(
        newCrewTitle,
        {
          label: '크루 이름',
          min: 2,
          max: 10,
        }
      );

    if (crewTitleError) {
      setNoticeModal({
        title: '크루 이름 확인',
        message:
          crewTitleError,
      });

      return;
    }

    const duplicatedCrew =
      crews.some(
        (crew: any) =>
          String(
            crew?.title ?? ''
          )
            .trim()
            .toLowerCase() ===
          newCrewTitle
            .trim()
            .toLowerCase()
      );

    if (duplicatedCrew) {
      setNoticeModal({
        title: '크루 이름 중복',
        message:
          '이미 사용 중인 크루 이름이에요.',
      });

      return;
    }

    if (
      newCrewDescription
        .trim()
        .length > 0
    ) {
      const crewDescError =
        validateText(
          newCrewDescription,
          {
            label:
              '크루 소개글',
            max: 80,
          }
        );

      if (crewDescError) {
        setNoticeModal({
          title:
            '크루 소개 확인',
          message:
            crewDescError,
        });

        return;
      }
    }

    try {
  const nextCrews =
    await addRootCrew({
      id:
        String(
          Date.now()
        ),

      title:
        newCrewTitle.trim(),

      icon:
        newCrewIcon,

      category:
        newCrewCategory,

      description:
        newCrewDescription.trim(),

      joinType:
        newCrewJoinType,

      ownerId:
        userId,

      ownerNickname:
        userNickname,

      members:
        1,

      memberIds: [
        userId,
      ],

      createdAt:
        new Date()
          .toISOString(),
    });

  setCrews(
    nextCrews
  );

  setShowCreateCrewModal(
    false
  );

  setNewCrewCategory(
    null
  );

  setNewCrewTitle(
    ''
  );

  setNewCrewDescription(
    ''
  );

  setNewCrewJoinType(
    'free'
  );

  setNoticeModal({
    title:
      '크루 생성 완료',

    message:
      '새 크루가 만들어졌어요.',
  });
} catch (
  error:
    any
) {
  console.log(
    'CREATE CREW BUTTON ERROR',
    {
      message:
        error?.message ??
        String(error),
    }
  );

  if (
    error?.message ===
    'CREW_LIMIT'
  ) {
    setNoticeModal({
      title:
        '크루 생성 제한',

      message:
        '크루는 한 사람당 1개만 만들 수 있어요.',
    });

    return;
  }

  setNoticeModal({
    title:
      '크루 생성 실패',

    message:
      '크루를 만들지 못했어요. 잠시 후 다시 시도해주세요.',
  });
}
  }}
>
  <Text
    style={
      styles.createCrewSubmitText
    }
  >
    크루 만들기
  </Text>
</Pressable>
      </View>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>


<Modal
  visible={showBlockedManageModal}
  transparent
  animationType="fade"
  onRequestClose={() =>
    setShowBlockedManageModal(false)
  }
>
  <View style={styles.newBadgeOverlay}>
    <View style={styles.blockManageModalBox}>
      <Text style={styles.blockManageTitle}>
        숨김/차단 관리
      </Text>

      <View style={styles.blockManageDivider} />

      {managedCrewUsers.length === 0 ? (
        <Text style={styles.blockManageEmptyText}>
          숨기거나 차단한 사용자가 없어요.
        </Text>
      ) : (
        <ScrollView
          style={styles.blockManageList}
          showsVerticalScrollIndicator={false}
        >
          {managedCrewUsers.map((item) => {
            const isBlocked =
              item.status === 'blocked';

            return (
              <View
                key={`${item.status}-${item.id}`}
                style={styles.blockManageUserRow}
              >
                <Text
                  style={styles.blockManageNickname}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {getCrewUserNickname(item.id)}
                </Text>

                <Text
                  style={[
                    styles.blockManageStatus,
                    isBlocked &&
                      styles.blockManageBlockedStatus,
                  ]}
                >
                  {isBlocked ? '차단' : '숨김'}
                </Text>

                <Pressable
                  style={styles.blockManageReleaseButton}
                  onPress={async () => {
                    if (isBlocked) {
                      const nextBlocked =
                        blockedUserIds.filter(
                          (id) =>
                            String(id) !==
                            String(item.id)
                        );

                      const nextHidden =
                        hiddenUserIds.filter(
                          (id) =>
                            String(id) !==
                            String(item.id)
                        );

                      setBlockedUserIds(nextBlocked);
                      setHiddenUserIds(nextHidden);

                      await AsyncStorage.multiSet([
                        [
                          BLOCKED_CREW_USERS_KEY,
                          JSON.stringify(nextBlocked),
                        ],
                        [
                          HIDDEN_CREW_USERS_KEY,
                          JSON.stringify(nextHidden),
                        ],
                      ]);

                      return;
                    }

                    const nextHidden =
                      hiddenUserIds.filter(
                        (id) =>
                          String(id) !==
                          String(item.id)
                      );

                    setHiddenUserIds(nextHidden);

                    await AsyncStorage.setItem(
                      HIDDEN_CREW_USERS_KEY,
                      JSON.stringify(nextHidden)
                    );
                  }}
                >
                  <Text style={styles.blockManageReleaseText}>
                    해제
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Pressable
        style={styles.blockManageCloseButton}
        onPress={() =>
          setShowBlockedManageModal(false)
        }
      >
        <Text style={styles.blockManageCloseText}>
          닫기
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal visible={!!showPostMenu} transparent animationType="fade">
  <View style={styles.newBadgeOverlay}>
    <View style={styles.postMenuBox}>
      <Pressable
        style={styles.postMenuButton}
        onPress={() => {
          const targetUserId = String(
            showPostMenu?.userId ??
              showPostMenu?.id ??
              ''
          );

          if (!targetUserId) return;

          setHiddenUserIds((prev) => {
            const next = prev.includes(targetUserId)
              ? prev
              : [...prev, targetUserId];

            AsyncStorage.setItem(
              HIDDEN_CREW_USERS_KEY,
              JSON.stringify(next)
            );

            return next;
          });

          setShowPostMenu(null);

          setNoticeModal({
            title: '사용자 숨김 완료',
            message: '이 사용자의 게시글이 피드에서 숨겨졌어요.',
          });
        }}
      >
        <Text style={styles.postMenuButtonText}>
          사용자 숨기기
        </Text>
      </Pressable>

      <Pressable
        style={styles.postMenuButton}
        onPress={async () => {
          const targetUserId =
            getCrewPostUserId(showPostMenu);

          if (!targetUserId) return;

          const nextBlockedUserIds =
            blockedUserIds.includes(targetUserId)
              ? blockedUserIds
              : [
                  ...blockedUserIds,
                  targetUserId,
                ];

          setBlockedUserIds(
            nextBlockedUserIds
          );

          await AsyncStorage.setItem(
            BLOCKED_CREW_USERS_KEY,
            JSON.stringify(
              nextBlockedUserIds
            )
          );

          /*
           * 차단한 사용자가 팔로잉 중이면
           * 실제 저장소에서도 함께 해제합니다.
           */
          const storedFollowId =
            getStoredFollowingId(
              targetUserId
            );

          if (storedFollowId) {
            const nextFollowing =
              await toggleRootFollowUser(
                storedFollowId
              );

            setFollowingUsers(
              nextFollowing.map(
                (id: any) =>
                  String(id)
              )
            );
          }

          setShowPostMenu(null);
          

          setNoticeModal({
            title: '사용자 차단 완료',
            message: '이 사용자의 게시글과 프로필이 차단되었어요.',
          });
        }}
      >
        <Text style={styles.postMenuButtonText}>
          사용자차단
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.postMenuButton,
          styles.postMenuDangerButton,
        ]}
        onPress={() => {
          setReportPost(showPostMenu);
          setReportReason('');
          setReportDetail('');
          setShowPostMenu(null);
        }}
      >
        <Text style={styles.postMenuDangerText}>
          게시글 신고
        </Text>
      </Pressable>

      <Pressable
        style={styles.postMenuButton}
        onPress={() => setShowPostMenu(null)}
      >
        <Text style={styles.postMenuButtonText}>
          취소
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal
  visible={!!reportPost}
  transparent
  animationType="slide"
  onRequestClose={() => {
    if (isSubmittingReport) return;

    Keyboard.dismiss();
    setReportPost(null);
    setReportReason('');
    setReportDetail('');
  }}
>
  <KeyboardAvoidingView
    style={styles.createCrewModalOverlay}
    behavior={
      Platform.OS === 'ios'
        ? 'padding'
        : undefined
    }
  >
    <View style={styles.createCrewModalBox}>
      <ScrollView
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 4,
        }}
      >
        <Text style={styles.createCrewTitle}>
          🚨 신고하기
        </Text>

        <Text style={styles.createCrewLabel}>
          신고 사유
        </Text>

        <View style={styles.reportReasonGrid}>
          {reportReasons.map((reason) => (
            <Pressable
              key={reason}
              style={[
                styles.reportReasonButton,
                reportReason === reason &&
                  styles.activeReportReasonButton,
              ]}
              onPress={() =>
                setReportReason(reason)
              }
            >
              <Text
                style={[
                  styles.reportReasonText,
                  reportReason === reason &&
                    styles.activeReportReasonText,
                ]}
              >
                {reason}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.createCrewLabel}>
          상세 내용
        </Text>

        <TextInput
          value={reportDetail}
          onChangeText={setReportDetail}
          placeholder="신고 내용을 간단히 적어주세요."
          placeholderTextColor={theme.subText}
          style={[
            styles.createCrewInput,
            styles.createCrewTextArea,
          ]}
          multiline
          returnKeyType="done"
          blurOnSubmit
        />

        <View style={styles.createCrewButtonRow}>
          <Pressable
            disabled={isSubmittingReport}
            style={styles.createCrewCancelButton}
            onPress={() => {
              Keyboard.dismiss();
              setReportPost(null);
              setReportReason('');
              setReportDetail('');
            }}
          >
            <Text style={styles.createCrewCancelText}>
              취소
            </Text>
          </Pressable>

          <Pressable
            disabled={isSubmittingReport}
            style={[
              styles.crewDangerButton,
              { flex: 1 },
              isSubmittingReport && {
                opacity: 0.55,
              },
            ]}
            onPressIn={() =>
              Keyboard.dismiss()
            }
            onPress={handleSubmitReport}
          >
            <Text style={styles.crewDangerButtonText}>
              {isSubmittingReport
                ? '신고 중...'
                : '신고하기'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal
  visible={
    !!deleteNotificationTarget
  }
  transparent
  animationType="fade"
  onRequestClose={() => {
    setDeleteNotificationTarget(
      null
    );

    setTimeout(() => {
      setShowNotifications(true);
    }, 250);
  }}
>
  <View
    style={
      styles.newBadgeOverlay
    }
  >
    <View
      style={
        styles.newBadgeBox
      }
    >
      <Text
        style={
          styles.newBadgeName
        }
      >
        알림 삭제
      </Text>

      <Text
        style={
          styles.newBadgeDesc
        }
      >
        이 알림을 삭제할까요?
      </Text>

      <View
        style={
          styles.notificationConfirmButtonRow
        }
      >
        <Pressable
          style={[
            styles.newBadgeButton,
            styles.notificationConfirmButton,
          ]}
          onPress={() => {
            setDeleteNotificationTarget(
              null
            );

            setTimeout(() => {
              setShowNotifications(
                true
              );
            }, 250);
          }}
        >
          <Text
            style={
              styles.newBadgeButtonText
            }
          >
            취소
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.crewDangerButton,
            styles.notificationConfirmButton,
          ]}
          onPress={async () => {
            const targetId =
              String(
                deleteNotificationTarget
                  ?.id ?? ''
              );

            if (!targetId) {
              return;
            }

            /*
             * 화면에서 즉시 제거합니다.
             */
            setNotifications(
              (prev) =>
                prev.filter(
                  (item) =>
                    String(
                      item?.id ?? ''
                    ) !== targetId
                )
            );

            setDeleteNotificationTarget(
              null
            );

            setTimeout(() => {
              setShowNotifications(
                true
              );
            }, 250);

            try {
              const nextNotifications =
                await deleteRootCrewNotification(
                  targetId
                );

              setNotifications(
                nextNotifications
              );
            } catch (
              error: any
            ) {
              console.log(
                'CREW NOTIFICATION DELETE ERROR',
                {
                  notificationId:
                    targetId,

                  message:
                    error?.message ??
                    String(error),
                }
              );
            }
          }}
        >
          <Text
            style={
              styles.crewDangerButtonText
            }
          >
            삭제
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal
  visible={
    showDeleteAllNotificationsConfirm
  }
  transparent
  animationType="fade"
  onRequestClose={() => {
    setShowDeleteAllNotificationsConfirm(
      false
    );

    setTimeout(() => {
      setShowNotifications(true);
    }, 250);
  }}
>
  <View
    style={
      styles.newBadgeOverlay
    }
  >
    <View
      style={
        styles.newBadgeBox
      }
    >
      <Text
        style={
          styles.newBadgeName
        }
      >
        모든 알림 삭제
      </Text>

      <Text
        style={
          styles.newBadgeDesc
        }
      >
        모든 알림을 삭제할까요?
        {'\n'}
        삭제 후에는 되돌릴 수
        없어요.
      </Text>

      <View
        style={
          styles.notificationConfirmButtonRow
        }
      >
        <Pressable
          style={[
            styles.newBadgeButton,
            styles.notificationConfirmButton,
          ]}
          onPress={() => {
            setShowDeleteAllNotificationsConfirm(
              false
            );

            setTimeout(() => {
              setShowNotifications(
                true
              );
            }, 250);
          }}
        >
          <Text
            style={
              styles.newBadgeButtonText
            }
          >
            취소
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.crewDangerButton,
            styles.notificationConfirmButton,
          ]}
          onPress={async () => {
            /*
             * 화면에서 먼저 제거합니다.
             */
            setNotifications([]);

            setShowDeleteAllNotificationsConfirm(
              false
            );

            try {
              const nextNotifications =
                await deleteAllRootCrewNotifications();

              setNotifications(
                nextNotifications
              );
            } catch (
              error: any
            ) {
              console.log(
                'CREW ALL NOTIFICATIONS DELETE ERROR',
                {
                  message:
                    error?.message ??
                    String(error),
                }
              );
            }

            setTimeout(() => {
              setShowNotifications(
                true
              );
            }, 250);
          }}
        >
          <Text
            style={
              styles.crewDangerButtonText
            }
          >
            모두 삭제
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal
  visible={
    !!selectedFeedImageUri
  }
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() => {
    setSelectedFeedImageUri(
      null
    );
  }}
>
  <View
    style={
      styles.feedImageModalOverlay
    }
  >
    {selectedFeedImageUri ? (
      <Image
        source={{
          uri:
            selectedFeedImageUri,
        }}
        style={
          styles.feedFullImage
        }
        resizeMode="contain"
      />
    ) : null}

    <Pressable
      style={
        styles.feedImageModalCloseButton
      }
      hitSlop={16}
      onPress={() => {
        setSelectedFeedImageUri(
          null
        );
      }}
    >
      <Text
        style={
          styles.feedImageModalCloseText
        }
      >
        ×
      </Text>
    </Pressable>
  </View>
</Modal>

<Modal visible={!!noticeModal} transparent animationType="fade">
  <View style={styles.newBadgeOverlay}>
    <View style={styles.newBadgeBox}>
      <Text style={styles.newBadgeIcon}>🦊</Text>
      <Text style={styles.newBadgeName}>{noticeModal?.title}</Text>
      <Text style={styles.newBadgeDesc}>{noticeModal?.message}</Text>

      <Pressable
        style={styles.newBadgeButton}
        onPress={() => setNoticeModal(null)}
      >
        <Text style={styles.newBadgeButtonText}>확인</Text>
      </Pressable>
    </View>
  </View>
</Modal>
</>
      );
}

const createStyles = (theme: any, isCityBlack: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isCityBlack ? theme.background : '#f5e9cf',
    paddingHorizontal: 18,
  },

  title: {
    marginTop: 22,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: isCityBlack ? theme.text : '#6b3514',
  },

  createCrewModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

createCrewModalBox: {
  backgroundColor: theme.card,
  borderTopLeftRadius: isCityBlack ? 4 : 18,
  borderTopRightRadius: isCityBlack ? 4 : 18,
  borderWidth: 0.5,
  borderColor: theme.line,
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 18,
  maxHeight: '94%',
},

createCrewTitle: {
  fontSize: 20,
  lineHeight: 25,
  fontWeight: '900',
  color: theme.text,
  marginBottom: 14,
},

createCrewLabel: {
  marginTop: 12,
  marginBottom: 6,
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',
  color: theme.text,
},

createCrewCategoryRow: {
  flexDirection: 'row',
  gap: 6,
},

createCrewCategoryButton: {
  flex: 1,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingHorizontal: 6,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

activeCreateCrewCategoryButton: {
  backgroundColor: 'transparent',
  borderColor: theme.strongLine,
  borderWidth: 1,
},

createCrewCategoryText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
  color: theme.text,
},

activeCreateCrewCategoryText: {
  color: theme.text,
  fontWeight: '900',
},

createCrewInput: {
  minHeight: 38,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingHorizontal: 11,
  paddingVertical: 8,
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',
  color: theme.text,
  borderWidth: 0.5,
  borderColor: theme.line,
},

createCrewTextArea: {
  minHeight: 72,
  textAlignVertical: 'top',
},

joinTypeRow: {
  flexDirection: 'row',
  gap: 10,
},

joinTypeButton: {
  flex: 1,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

activeJoinTypeButton: {
  backgroundColor: 'transparent',
  borderColor: theme.strongLine,
  borderWidth: 1,
},

joinTypeText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',
  color: theme.text,
},

activeJoinTypeText: {
  color: theme.text,
  fontWeight: '900',
},

createCrewButtonRow: {
  marginTop: 16,
  flexDirection: 'row',
  gap: 8,
},

createCrewCancelButton: {
  flex: 1,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

createCrewCancelText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',
  color: theme.text,
},

createCrewSubmitButton: {
  flex: 1,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

createCrewSubmitText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
  color: theme.text,
},

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: isCityBlack ? theme.subText : '#8b6a45',
  },
profileModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

profileModalBox: {
  backgroundColor: theme.card,
  borderTopLeftRadius: isCityBlack ? 4 : 18,
  borderTopRightRadius: isCityBlack ? 4 : 18,
  borderWidth: 0.5,
  borderColor: theme.line,
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 20,
  maxHeight: '88%',
},

profileHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 18,
},

profileAvatar: {
  width: 62,
  height: 62,
  borderRadius: isCityBlack ? 4 : 31,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},

profileAvatarText: {
  fontSize: 34,
},

profileName: {
  fontSize: 26,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

profileLevel: {
  marginTop: 4,
  fontSize: 15,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

profileClose: {
  fontSize: 34,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},

followRow: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 20,
},

followBox: {
  flex: 1,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  paddingVertical: 14,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

followNumber: {
  fontSize: 22,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a3514',
},

followLabel: {
  marginTop: 4,
  fontSize: 13,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

profileSectionTitle: {
  marginTop: 12,
  marginBottom: 10,
  fontSize: 20,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

profileStatGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
},

profileStatCard: {
  width: '48%',
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 14,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

profileStatIcon: {
  fontSize: 24,
},

profileStatLabel: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

profileStatValue: {
  marginTop: 4,
  fontSize: 20,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a3514',
},

profileFeedList: {
  maxHeight: 180,
},

profileFeedItem: {
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 16,
  padding: 12,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

profileFeedTitle: {
  fontSize: 16,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

profileFeedInfo: {
  marginTop: 4,
  fontSize: 13,
  fontWeight: '700',
  color: isCityBlack ? theme.subText : '#8b6a45',
},
searchBox: {
  marginTop: 8,
  minHeight: 38,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingHorizontal: 11,
  paddingVertical: 6,
  borderWidth: 0.5,
  borderColor: theme.line,
},

searchInput: {
  flex: 1,
  marginLeft: 7,
  paddingVertical: 0,
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',
  color: theme.text,
},

createCrewButton: {
  marginTop: 14,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  paddingHorizontal: 12,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  gap: 6,
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

createCrewText: {
  color: theme.text,
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
},

  
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    color: isCityBlack ? theme.text : '#5f3b1b',
  },

  notificationModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

notificationModalBox: {
  backgroundColor:
    theme.card,

  borderTopLeftRadius:
    isCityBlack
      ? 4
      : 18,

  borderTopRightRadius:
    isCityBlack
      ? 4
      : 18,

  borderWidth: 0.5,
  borderColor:
    theme.line,

  paddingHorizontal: 16,
  paddingTop: 16,

  /*
   * 삼성 하단 내비게이션 바가
   * 닫기 버튼을 덮지 않도록 합니다.
   */
  paddingBottom:
    Platform.OS === 'android'
      ? 58
      : 22,

  maxHeight:
    Platform.OS === 'android'
      ? '78%'
      : '75%',
},

notificationModalTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
  marginBottom: 14,
},

notificationList: {
  maxHeight: 320,
},

notificationItem: {
  position: 'relative',

  backgroundColor:
    theme.card,

  borderRadius:
    isCityBlack
      ? 4
      : 10,

  paddingLeft: 11,

   paddingRight: 62,

  paddingTop: 9,
  paddingBottom: 8,

  marginBottom: 6,

  borderWidth: 0.5,
  borderColor:
    theme.line,
},

followButton: {
  marginBottom: 16,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

followButtonText: {
  color: theme.text,
  fontWeight: '900',
  fontSize: 13,
  lineHeight: 17,
},

followingButton: {
  backgroundColor: 'transparent',
  borderColor: theme.line,
},

followingButtonText: {
  color: theme.text,
},

notificationText: {
  fontSize: 14,
  lineHeight: 19,

  fontWeight: '800',

  color:
    isCityBlack
      ? theme.text
      : '#5f3b1b',
},

noNotificationText: {
  textAlign: 'center',
  color: isCityBlack ? theme.subText : '#8b6a45',
  fontSize: 15,
  fontWeight: '800',
  paddingVertical: 24,
},

notificationCloseButton: {
  marginTop: 12,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

notificationCloseText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
  color: theme.text,
},

  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  moreText: {
    fontSize: 14,
    fontWeight: '900',
    color: isCityBlack ? theme.subText : '#2f80ed',
  },

  horizontalList: {
    gap: 12,
    paddingRight: 10,
  },

  crewMiniCard: {
    width: 145,
    minHeight: 155,
    backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
    borderRadius: isCityBlack ? 4 : 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: isCityBlack ? theme.line : '#dfc28e',
  },
myCrewSplitRow: {
  flexDirection: 'row',
  gap: 12,
  alignItems: 'flex-start',
},

myCrewColumn: {
  flex: 1,
},
  myCrewCard: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isCityBlack
      ? theme.card
      : '#f7f0e5',
    borderRadius: isCityBlack ? 4 : 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 0.7,
    borderColor: isCityBlack
      ? theme.line
      : '#d8c09a',
    marginTop: 8,
  },

  myCrewLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },

  emptyCrewCard: {
    width: 135,
    minHeight: 140,
    backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',
    borderRadius: isCityBlack ? 4 : 22,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCrewText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '900',
    color: isCityBlack ? theme.text : '#9c651f',
  },
  crewMiniIcon: {
    fontSize: 23,
    marginRight: 8,
  },
  crewMiniTitle: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: isCityBlack
      ? theme.text
      : '#5f3b1b',
  },
  crewMiniInfo: {
    marginLeft: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: isCityBlack
      ? theme.subText
      : '#8b6a45',
  },

  crewTypeBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: isCityBlack ? theme.button : '#f59e0b',
    borderRadius: isCityBlack ? 4 : 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  crewTypeText: {
    color: isCityBlack ? theme.buttonText : '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  categoryRow: {
    marginTop: 26,
    marginBottom: 22,
    flexDirection: 'row',
    gap: 6,
  },

categoryButton: {
  flex: 1,
  minHeight: 32,
  paddingHorizontal: 4,
  paddingVertical: 6,
  borderRadius: isCityBlack ? 4 : 10,
  backgroundColor: 'transparent',
  borderWidth: 0.5,
  borderColor: theme.line,
  alignItems: 'center',
  justifyContent: 'center',
},

activeCategoryButton: {
  backgroundColor: 'transparent',
  borderColor: theme.strongLine,
  borderWidth: 1,
},

categoryText: {
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '800',
  color: theme.text,
},

activeCategoryText: {
  color: theme.text,
  fontWeight: '900',
},

  feedCard: {
    marginTop: 14,
    backgroundColor: isCityBlack ? theme.card : '#f7f0e5',
    borderRadius: isCityBlack ? 4 : 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: theme.line,
  },

  feedTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  feedUserRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  feedUserName: {
    flexShrink: 1,
    maxWidth: 112,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    color: isCityBlack ? theme.text : '#5f3b1b',
  },

  feedUserMeta: {
    flexShrink: 1,
    marginLeft: 4,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    color: theme.subText,
  },

  feedAvatar: {
    width: 38,
    height: 38,
    borderRadius: isCityBlack ? 4 : 19,
    backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

activeCheerButton: {
  backgroundColor: 'transparent',
  borderWidth: 0,
},

activeCheerButtonText: {
  color: theme.text,
  fontWeight: '900',
},

  feedAvatarText: {
    fontSize: 21,
  },

  feedTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: isCityBlack ? theme.text : '#5f3b1b',
  },

  feedModeRow: {
  flexDirection: 'row',
  gap: 10,
  marginBottom: 14,
},

crewFeedSection: {
  marginTop: 18,
},

crewFeedTitle: {
  fontSize: 20,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
  marginBottom: 12,
},

emptyCrewFeedBox: {
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 18,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

emptyCrewFeedText: {
  fontSize: 15,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

crewFeedCard: {
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 20,
  padding: 14,
  marginBottom: 12,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

crewFeedTop: {
  flexDirection: 'row',
  alignItems: 'center',
},

crewFeedAvatar: {
  width: 42,
  height: 42,
  borderRadius: isCityBlack ? 4 : 21,
  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},

crewFeedAvatarText: {
  fontSize: 22,
},

crewFeedUser: {
  fontSize: 15,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

crewFeedPostTitle: {
  marginTop: 3,
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

crewFeedCategory: {
  backgroundColor: isCityBlack ? theme.button : '#f59e0b',
  color: isCityBlack ? theme.buttonText : '#fff',
  fontSize: 12,
  fontWeight: '900',
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: isCityBlack ? 4 : 12,
},

crewFeedMinutes: {
  marginTop: 12,
  fontSize: 24,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a3514',
},

crewFeedMemo: {
  marginTop: 8,
  fontSize: 15,
  fontWeight: '800',
  color: isCityBlack ? theme.text : '#7a4c1f',
  lineHeight: 21,
},

crewFeedImage: {
  marginTop: 12,
  width: '100%',
  height: 150,
  borderRadius: isCityBlack ? 4 : 16,
},

crewFeedActionRow: {
  marginTop: 12,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#dfc28e',
  flexDirection: 'row',
  justifyContent: 'space-between',
},

crewFeedActionText: {
  fontSize: 14,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},

feedModeButton: {
  flex: 1,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  paddingVertical: 13,
  alignItems: 'center',
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

activeFeedModeButton: {
  backgroundColor: 'transparent',
  borderColor: theme.strongLine,
  borderWidth: 1,
},

feedModeText: {
  fontSize: 15,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

activeFeedModeText: {
  color: theme.text,
  fontWeight: '900',
},

emptyFeedBox: {
  marginTop: 14,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 22,
  padding: 22,
  alignItems: 'center',
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

emptyFeedTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

emptyFeedDesc: {
  marginTop: 8,
  fontSize: 14,
  fontWeight: '700',
  color: isCityBlack ? theme.subText : '#8b6a45',
  textAlign: 'center',
  lineHeight: 20,
},

  feedMetaText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: theme.subText,
  },

  feedBody: {
    marginTop: 13,
  },

  feedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  feedGoalTitle: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: theme.text,
  },

  feedMetricsRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  feedRecordInfoText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    color: theme.subText,
  },

  feedShareMemo: {
  marginTop: 8,
  fontSize: 16,
  fontWeight: '800',
  color: isCityBlack ? theme.text : '#7a4c1f',
  lineHeight: 22,
},

  feedDetailText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: isCityBlack ? theme.subText : '#2563eb',
  },

  photoPlaceholder: {
    marginTop: 16,
    height: 170,
    borderRadius: isCityBlack ? 4 : 20,
    backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

commentModalTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
  marginBottom: 14,
},

commentList: {
  maxHeight: 260,
},
titleRow: {
  marginTop: 12,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
},

notificationButton: {
  fontSize: 28,
},
noCommentText: {
  textAlign: 'center',
  color: isCityBlack ? theme.subText : '#8b6a45',
  fontSize: 15,
  fontWeight: '800',
  paddingVertical: 20,
},

commentButtonRow: {
  marginTop: 10,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,
},
badgeSectionHeader: {
  marginTop: 12,
  marginBottom: 10,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

badgeMoreText: {
  fontSize: 14,
  fontWeight: '900',
  color: isCityBlack ? theme.subText : '#2f80ed',
},

badgeModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

badgeModalBox: {
  backgroundColor: theme.card,
  borderTopLeftRadius: isCityBlack ? 4 : 18,
  borderTopRightRadius: isCityBlack ? 4 : 18,
  borderWidth: 0.5,
  borderColor: theme.line,
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 20,
  maxHeight: '88%',
},

badgeModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

badgeModalTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

badgeModalClose: {
  fontSize: 34,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},

badgeModalDesc: {
  marginTop: 8,
  marginBottom: 14,
  fontSize: 15,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

badgeList: {
  maxHeight: 560,
},

badgeListItem: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 14,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

lockedBadgeItem: {
  opacity: 0.48,
},

badgeListIcon: {
  width: 44,
  fontSize: 28,
  marginRight: 10,
},

mainBadgeCard: {
  borderColor: isCityBlack ? theme.strongLine : '#f59e0b',
  borderWidth: 2,
  backgroundColor: isCityBlack ? theme.card2 : '#fff3d1',
},

badgeListTitle: {
  fontSize: 16,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

badgeListDesc: {
  marginTop: 4,
  fontSize: 13,
  fontWeight: '700',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

lockedBadgeText: {
  color: isCityBlack ? theme.subText : '#7f7162',
},

badgeStatusText: {
  fontSize: 13,
  fontWeight: '900',
  color: isCityBlack ? theme.subText : '#7f7162',
},
newBadgeOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 24,
},
blockManageButton: {
  marginBottom: 10,
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: isCityBlack ? 4 : 18,
  backgroundColor: isCityBlack ? theme.card2 : '#ead7b7',
  borderWidth: 1,
  borderColor: isCityBlack ? theme.line : '#d8b982',
  alignItems: 'center',
},

blockManageButtonText: {
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.text : '#6b3514',
},

newBadgeBox: {
  width: '88%',
  backgroundColor: theme.card,
  borderRadius: isCityBlack ? 4 : 18,
  paddingHorizontal: 18,
  paddingVertical: 18,
  alignItems: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

newBadgeTitle: {
  fontSize: 24,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

newBadgeIcon: {
  marginTop: 18,
  fontSize: 64,
},

newBadgeName: {
  marginTop: 10,
  fontSize: 26,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a3514',
},

newBadgeDesc: {
  marginTop: 10,
  fontSize: 16,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
  textAlign: 'center',
},

newBadgeButton: {
  marginTop: 16,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  paddingHorizontal: 26,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

newBadgeButtonText: {
  color: theme.text,
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
},
earnedBadgeStatusText: {
  color: isCityBlack ? theme.text : '#f59e0b',
},
commentCancelButton: {
  flex: 1,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

commentCancelText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',
  color: theme.text,
},

commentSubmitButton: {
  flex: 1,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

commentSubmitText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
  color: theme.text,
},

  photoPlaceholderText: {
    marginTop: 6,
    color: isCityBlack ? theme.text : '#9c651f',
    fontSize: 15,
    fontWeight: '900',
  },
myCrewSubTitle: {
  marginTop: 10,
  marginBottom: 10,
  fontSize: 17,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},
crewRoleBadge: {
  alignSelf: 'center',
  backgroundColor: 'transparent',
  color: theme.text,
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '900',
  paddingHorizontal: 9,
  paddingVertical: 4,
  borderWidth: 0.5,
  borderColor: theme.strongLine,
  borderRadius: isCityBlack ? 4 : 8,
},
crewDetailOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

crewDetailBox: {
  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',
  borderTopLeftRadius: isCityBlack ? 4 : 28,
  borderTopRightRadius: isCityBlack ? 4 : 28,
  padding: 20,
  paddingBottom: 34,
  maxHeight: '86%',
},

crewDetailHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12,
},

crewDetailIcon: {
  fontSize: 46,
},

crewDetailTitle: {
  marginTop: 8,
  fontSize: 28,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

crewDetailMeta: {
  marginTop: 6,
  fontSize: 15,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

crewDetailClose: {
  fontSize: 36,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},

crewDetailInfoBox: {
  marginTop: 16,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

crewDetailLabel: {
  fontSize: 14,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#9c651f',
  marginBottom: 8,
},

crewRankingSection: {
  marginTop: 18,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

emptyCrewRankingText: {
  fontSize: 15,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

crewRankingItem: {
  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',
  borderRadius: isCityBlack ? 4 : 16,
  padding: 12,
  marginBottom: 8,
},

crewRankingRank: {
  width: 34,
  fontSize: 24,
},

crewRankingEmoji: {
  width: 34,
  fontSize: 24,
  marginRight: 8,
},

crewRankingName: {
  fontSize: 15,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

crewRankingSub: {
  marginTop: 3,
  fontSize: 12,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

crewDetailDesc: {
  fontSize: 16,
  fontWeight: '800',
  color: isCityBlack ? theme.text : '#5f3b1b',
  lineHeight: 22,
},

crewManageBox: {
  marginTop: 18,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.strongLine : '#f59e0b',
},

crewManageTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
  marginBottom: 12,
},

blockManageModalBox: {
  width: '88%',
  maxHeight: '70%',
  backgroundColor: theme.card,
  borderRadius: isCityBlack ? 4 : 16,
  padding: 16,
  borderWidth: 0.5,
  borderColor: theme.line,
},

blockManageTitle: {
  fontSize: 18,
  lineHeight: 24,
  fontWeight: '900',
  color: theme.text,
  textAlign: 'center',
},

blockManageDivider: {
  height: 0.5,
  backgroundColor: theme.line,
  marginTop: 12,
  marginBottom: 8,
},

blockManageList: {
  maxHeight: 280,
},

blockManageUserRow: {
  minHeight: 42,
  flexDirection: 'row',
  alignItems: 'center',
  borderBottomWidth: 0.5,
  borderBottomColor: theme.line,
  paddingVertical: 7,
},

blockManageNickname: {
  flex: 1,
  minWidth: 0,
  marginRight: 8,
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '800',
  color: theme.text,
},

blockManageStatus: {
  minWidth: 44,
  textAlign: 'center',
  marginRight: 7,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderWidth: 0.5,
  borderColor: theme.line,
  borderRadius: isCityBlack ? 4 : 8,
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '900',
  color: theme.text,
  overflow: 'hidden',
},

blockManageBlockedStatus: {
  borderColor: theme.danger,
  color: theme.danger,
},

blockManageReleaseButton: {
  minWidth: 48,
  minHeight: 28,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
  borderRadius: isCityBlack ? 4 : 8,
  paddingHorizontal: 9,
  paddingVertical: 4,
},

blockManageReleaseText: {
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '900',
  color: theme.text,
},

blockManageEmptyText: {
  paddingVertical: 22,
  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
  color: theme.subText,
  textAlign: 'center',
},

blockManageCloseButton: {
  alignSelf: 'center',
  minWidth: 90,
  minHeight: 32,
  marginTop: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
  borderRadius: isCityBlack ? 4 : 9,
  paddingHorizontal: 16,
  paddingVertical: 6,
},

blockManageCloseText: {
  fontSize: 12,
  lineHeight: 17,
  fontWeight: '900',
  color: theme.text,
},

postMenuBox: {
  width: '76%',
  backgroundColor: theme.card,
  borderRadius: isCityBlack ? 4 : 16,
  padding: 16,
  borderWidth: 0.5,
  borderColor: theme.line,
},

postMenuButton: {
  minHeight: 36,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 8,
  paddingHorizontal: 12,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
  marginBottom: 8,
},

postMenuButtonText: {
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '900',
  color: theme.text,
},

postMenuDangerButton: {
  borderColor: theme.danger,
},

postMenuDangerText: {
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '900',
  color: theme.danger,
},

crewManageButton: {
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
  borderWidth: 0.5,
  borderColor: theme.line,
},

crewManageButtonText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',
  color: theme.text,
},

crewDangerButton: {
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.danger,
},

crewDangerButtonText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',
  color: theme.danger,
},

crewLeaveButton: {
  marginTop: 18,
  backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',
  borderRadius: isCityBlack ? 4 : 16,
  paddingVertical: 15,
  alignItems: 'center',
},

crewLeaveButtonText: {
  fontSize: 16,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},
emptyMyCrewBox: {
  minHeight: 170,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
  justifyContent: 'center',
},

emptyMyCrewText: {
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

  feedImagePressable: {
    marginTop: 12,
    width: '100%',
    height: 240,
    borderRadius:
      isCityBlack
        ? 4
        : 14,
    overflow: 'hidden',
    backgroundColor:
      theme.card2,
  },

  feedImage: {
    width: '100%',
    height: '100%',
  },

  feedImageModalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedFullImage: {
    width: '100%',
    height: '100%',
  },

  feedImageModalCloseButton: {
    position: 'absolute',
    top:
      Platform.OS === 'ios'
        ? 52
        : 26,
    right: 18,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  feedImageModalCloseText: {
    color: '#ffffff',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '400',
    textShadowColor:
      'rgba(0,0,0,0.8)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 6,
  },

  tagRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tagText: {
    color: isCityBlack ? theme.subText : '#2f80ed',
    fontSize: 14,
    fontWeight: '900',
  },

  crewMemberSection: {
  marginTop: 18,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

crewMemberRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
},

crewMemberAvatar: {
  width: 42,
  height: 42,
  borderRadius: isCityBlack ? 4 : 21,
  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: -6,
  borderWidth: 2,
  borderColor: isCityBlack ? theme.line : '#fff8ec',
},

crewMemberEmoji: {
  fontSize: 22,
},

crewMemberMoreBox: {
  width: 42,
  height: 42,
  borderRadius: isCityBlack ? 4 : 21,
  backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 4,
},

crewMemberMoreText: {
  fontSize: 14,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},

crewMemberCountText: {
  marginTop: 12,
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

  feedActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
  },

  cheerButton: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cheerButtonText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    color: theme.subText,
  },

  feedCommentButton: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.subText,
  },
commentModalBox: {
  backgroundColor:
    theme.card,

  borderTopLeftRadius:
    isCityBlack
      ? 4
      : 18,

  borderTopRightRadius:
    isCityBlack
      ? 4
      : 18,

  borderWidth: 0.5,
  borderColor:
    theme.line,

  paddingHorizontal: 16,
  paddingTop: 16,

  /*
   * Android 하단 내비게이션 바가
   * 버튼을 가리지 않도록 여백을 확보합니다.
   */
  paddingBottom:
    Platform.OS === 'android'
      ? 58
      : 22,

  maxHeight:
    Platform.OS === 'android'
      ? '80%'
      : '82%',
},
commentItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',

  backgroundColor:
    'transparent',

  borderRadius:
    isCityBlack
      ? 4
      : 10,

  paddingVertical: 8,
  paddingHorizontal: 10,

  marginBottom: 6,

  borderWidth: 0.5,
  borderColor:
    theme.line,
},

commentNicknameText: {
  flexShrink: 0,

  marginRight: 8,

  fontSize: 13,
  lineHeight: 19,

  fontWeight: '900',
  color: theme.text,
},

commentBodyText: {
  flex: 1,
  flexShrink: 1,
  minWidth: 0,

  fontSize: 13,
  lineHeight: 19,

  fontWeight: '700',
  color: theme.text,
},

commentInput: {
  marginTop: 12,
  minHeight: 40,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingHorizontal: 11,
  paddingVertical: 8,
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',
  color: theme.text,
  borderWidth: 0.5,
  borderColor: theme.line,
},
readNotificationItem: {
  opacity: 0.55,
},

profileMetaText: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

badgeGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  marginBottom: 14,
},

badgeCard: {
  width: '48%',
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  paddingVertical: 14,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
  alignItems: 'center',
},

badgeIcon: {
  fontSize: 28,
  marginBottom: 6,
},

badgeTitle: {
  fontSize: 14,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
  textAlign: 'center',
},
activeMainBadgeItem: {
  borderColor: isCityBlack ? theme.strongLine : '#f59e0b',
  borderWidth: 2,
  backgroundColor: isCityBlack ? theme.card2 : '#fff3d1',
},
crewAlbumSection: {
  marginTop: 18,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

crewAlbumGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

crewAlbumItem: {
  width: '31%',
  aspectRatio: 1,
  borderRadius: isCityBlack ? 4 : 14,
  overflow: 'hidden',
  backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',
},

crewAlbumImage: {
  width: '100%',
  height: '100%',
},

crewRankingTop: {
  flexDirection: 'row',
  alignItems: 'center',
},

crewRankingBarBg: {
  marginTop: 10,
  height: 10,
  backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',
  borderRadius: isCityBlack ? 4 : 10,
  overflow: 'hidden',
},

crewRankingBarFill: {
  height: '100%',
  backgroundColor: isCityBlack ? theme.button : '#f59e0b',
  borderRadius: isCityBlack ? 4 : 10,
},

crewPhotoModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},
crewPhotoModalBox: {  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',  borderTopLeftRadius: isCityBlack ? 4 : 28,  borderTopRightRadius: isCityBlack ? 4 : 28,  padding: 20,  paddingBottom: 34,  maxHeight: '88%',},
crewPhotoHeader: {  flexDirection: 'row',  alignItems: 'center',  gap: 12,  marginBottom: 16,},
crewPhotoUser: {  fontSize: 22,  fontWeight: '900',  color: isCityBlack ? theme.text : '#5f3b1b',},
crewPhotoMeta: {  marginTop: 4,  fontSize: 14,  fontWeight: '800',  color: isCityBlack ? theme.subText : '#8b6a45',},
crewPhotoLargeImage: {  width: '100%',  height: 260,  borderRadius: isCityBlack ? 4 : 20,},
crewPhotoMapBox: {  marginTop: 14,  borderRadius: isCityBlack ? 4 : 18,  overflow: 'hidden',  backgroundColor: isCityBlack ? theme.card2 : '#e8f1ff',},
crewPhotoMap: {  width: '100%',  height: 200,},
crewPhotoMemo: {  marginTop: 14,  fontSize: 16,  fontWeight: '800',  color: isCityBlack ? theme.text : '#7a4c1f',  lineHeight: 22,},
imagePreviewOverlay: {  flex: 1,  backgroundColor: 'rgba(0,0,0,0.9)',},
imagePreviewCloseArea: {  flex: 1,  justifyContent: 'center',  alignItems: 'center',},
imagePreviewCloseText: {  position: 'absolute',  top: 48,  right: 24,  color: '#fff',  fontSize: 42,  fontWeight: '900',  zIndex: 10,},
imagePreviewFull: {  width: '100%',  height: '85%',},
joinRequestBox: {  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',  borderRadius: isCityBlack ? 4 : 16,  padding: 14,  marginBottom: 12,  borderWidth: 1.5,  borderColor: isCityBlack ? theme.line : '#dfc28e',},
joinRequestTitle: {  fontSize: 16,  fontWeight: '900',  color: isCityBlack ? theme.text : '#5f3b1b',  marginBottom: 10,},
joinRequestItem: {  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',  borderRadius: isCityBlack ? 4 : 14,  padding: 12,  marginBottom: 8,},
joinRequestUser: {  fontSize: 15,  fontWeight: '900',  color: isCityBlack ? theme.text : '#5f3b1b',  marginBottom: 10,},
joinRequestButtonRow: {  flexDirection: 'row',  gap: 8,},
joinApproveButton: {  flex: 1,  backgroundColor: isCityBlack ? theme.button : '#f59e0b',  borderRadius: isCityBlack ? 4 : 12,  paddingVertical: 10,  alignItems: 'center',},
joinApproveText: {  color: isCityBlack ? theme.buttonText : '#fff',  fontSize: 14,  fontWeight: '900',},
joinRejectButton: {  flex: 1,  backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',  borderRadius: isCityBlack ? 4 : 12,  paddingVertical: 10,  alignItems: 'center',},
joinRejectText: {  color: isCityBlack ? theme.text : '#7a4c1f', fontSize: 14,  fontWeight: '900',},
crewNoticeBox: {
  marginTop: 16,
  backgroundColor: isCityBlack ? theme.card2 : '#fff3cf',
  borderRadius: isCityBlack ? 4 : 20,
  padding: 16,
  borderWidth: 2,
  borderColor: isCityBlack ? theme.strongLine : '#f59e0b',
},
crewNoticeHeader: {  flexDirection: 'row',  justifyContent: 'space-between',  alignItems: 'center',  marginBottom: 10,},
crewNoticeTitle: {  fontSize: 16,  fontWeight: '900',  color: isCityBlack ? theme.text : '#5f3b1b',},
crewNoticeEdit: {  fontSize: 14,  fontWeight: '900',  color: isCityBlack ? theme.subText : '#2f80ed',},
crewNoticeText: {  fontSize: 16,  fontWeight: '800',  color: isCityBlack ? theme.text : '#7a4c1f',  lineHeight: 22,},
memberManageList: {  marginTop: 14,  gap: 8,},
memberManageItem: {  flexDirection: 'row',  alignItems: 'center',  justifyContent: 'space-between',  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',  borderRadius: isCityBlack ? 4 : 14,  paddingVertical: 10,  paddingHorizontal: 12,},
memberManageText: {  fontSize: 14,  fontWeight: '900',  color: isCityBlack ? theme.text : '#5f3b1b',},
kickButton: {  backgroundColor: isCityBlack ? theme.card2 : '#fff1f1',  borderRadius: isCityBlack ? 4 : 12,  paddingVertical: 7,  paddingHorizontal: 12,},
kickButtonText: {  fontSize: 13,  fontWeight: '900',  color: isCityBlack ? theme.danger : '#c2410c',},
emptyRecommendBox: {  width: 220,  minHeight: 155,  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',  borderRadius: isCityBlack ? 4 : 22,  padding: 18,  borderWidth: 1.5,  borderColor: isCityBlack ? theme.line : '#dfc28e',  justifyContent: 'center',  alignItems: 'center',},
emptyRecommendText: {  fontSize: 15,  fontWeight: '900',  color: isCityBlack ? theme.subText : '#8b6a45',  textAlign: 'center',},

crewSearchSection: {
  marginTop: 28,
},

smallCreateCrewButton: {
  backgroundColor: isCityBlack ? theme.button : '#9c651f',
  borderRadius: isCityBlack ? 4 : 14,
  paddingVertical: 8,
  paddingHorizontal: 12,
},

smallCreateCrewText: {
  color: isCityBlack ? theme.buttonText : '#fff',
  fontSize: 13,
  fontWeight: '900',
},
lockedCrewContentBox: {
  marginTop: 18,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 18,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
  alignItems: 'center',
},

lockedCrewContentTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

lockedCrewContentText: {
  marginTop: 8,
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
  textAlign: 'center',
  lineHeight: 20,
},
crewMembersModalTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

crewMembersList: {
  marginTop: 12,
  maxHeight: 520,
},

crewMemberListItem: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 14,
  marginBottom: 10,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

crewMemberListAvatar: {
  width: 48,
  height: 48,
  borderRadius: isCityBlack ? 4 : 24,
  backgroundColor: isCityBlack ? theme.card : '#f7f0e5',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

crewMemberListEmoji: {
  fontSize: 26,
},

crewMemberListName: {
  fontSize: 16,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

crewMemberListInfo: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},
crewGoalBox: {
  marginTop: 16,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

crewGoalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

crewGoalTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
},

crewGoalEdit: {
  fontSize: 14,
  fontWeight: '900',
  color: isCityBlack ? theme.subText : '#2f80ed',
},

crewGoalMainText: {
  marginTop: 14,
  fontSize: 26,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a3514',
},

crewGoalBarBg: {
  marginTop: 10,
  height: 12,
  backgroundColor: isCityBlack ? theme.card2 : '#ead7b3',
  borderRadius: isCityBlack ? 4 : 12,
  overflow: 'hidden',
},

crewGoalBarFill: {
  height: '100%',
  backgroundColor: isCityBlack ? theme.button : '#f59e0b',
  borderRadius: isCityBlack ? 4 : 12,
},

crewGoalSubText: {
  marginTop: 10,
  fontSize: 13,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

crewGoalEmptyText: {
  marginTop: 12,
  fontSize: 15,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
},

crewGoalHelpText: {
  marginTop: 10,
  fontSize: 14,
  fontWeight: '800',
  color: isCityBlack ? theme.subText : '#8b6a45',
  lineHeight: 20,
},

crewExpBox: {
  marginTop: 16,
  backgroundColor: isCityBlack ? theme.card2 : '#fff8ec',
  borderRadius: isCityBlack ? 4 : 18,
  padding: 16,
  borderWidth: 1.5,
  borderColor: isCityBlack ? theme.line : '#dfc28e',
},

crewExpLevel: {
  fontSize: 18,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#f59e0b',
},

crewExpBarFill: {
  height: '100%',
  backgroundColor: isCityBlack ? theme.button : '#9c651f',
  borderRadius: isCityBlack ? 4 : 12,
},

reportMenuButton: {
  marginLeft: 8,
  width: 30,
  height: 30,
  borderRadius: isCityBlack ? 4 : 9,
  backgroundColor: 'transparent',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

reportMenuText: {
  fontSize: 20,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#7a4c1f',
},

reportReasonGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

reportReasonButton: {
  minHeight: 32,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: isCityBlack ? 4 : 10,
  backgroundColor: 'transparent',
  borderWidth: 0.5,
  borderColor: theme.line,
  alignItems: 'center',
  justifyContent: 'center',
},

activeReportReasonButton: {
  backgroundColor: 'transparent',
  borderColor: theme.strongLine,
  borderWidth: 1,
},

reportReasonText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
  color: theme.text,
},

activeReportReasonText: {
  color: theme.text,
  fontWeight: '900',
},

reportManageItem: {
  width: '100%',
  padding: 14,
  borderRadius: isCityBlack ? 4 : 16,
  backgroundColor: isCityBlack ? theme.card2 : '#fff7e8',
  borderWidth: 1,
  borderColor: isCityBlack ? theme.line : '#e3c58d',
  marginBottom: 10,
},

reportManageTitle: {
  fontSize: 15,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
  marginBottom: 6,
},

reportManageText: {
  fontSize: 13,
  fontWeight: '700',
  color: isCityBlack ? theme.subText : '#8a5a24',
  marginTop: 3,
},
reportManageButtonRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 12,
},

reportDeletePostButton: {
  flex: 1,
  minHeight: 32,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 6,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.danger,
},

reportDeletePostText: {
  color: theme.danger,
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
},

reportDoneButton: {
  flex: 1,
  minHeight: 32,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 6,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

reportDoneText: {
  color: theme.text,
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
},

crewTopButtonRow: {
  flexDirection: 'row',
  gap: 8,
  alignItems: 'center',
   marginBottom: 6,
},

crewTopButton: {
  minWidth: 36,
  minHeight: 30,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderWidth: 0.5,
  borderColor: theme.line,
  alignItems: 'center',
  justifyContent: 'center',
},

crewTopButtonText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
  color: theme.text,
},

crewHomeSection: {
  marginTop: 20,
},

crewEmptyOnlyButton: {
  alignSelf: 'flex-start',
  marginTop: 10,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingHorizontal: 16,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

crewEmptyOnlyButtonText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
  color: theme.text,
},

crewEmptyActionBox: {
  marginTop: 10,
  backgroundColor: theme.card,
  borderRadius: isCityBlack ? 4 : 12,
  paddingHorizontal: 16,
  paddingVertical: 16,
  alignItems: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

crewEmptyActionIcon: {
  fontSize: 42,
  marginBottom: 8,
},

crewEmptyActionTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: isCityBlack ? theme.text : '#5f3b1b',
  marginBottom: 12,
},

crewEmptyActionButton: {
  backgroundColor: 'transparent',
  color: theme.text,
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',
  paddingHorizontal: 14,
  paddingVertical: 7,
  borderRadius: isCityBlack ? 4 : 10,
  borderWidth: 0.5,
  borderColor: theme.strongLine,
  overflow: 'hidden',
},

crewSearchModalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

searchCrewCard: {
  flexDirection: 'row',
  gap: 10,
  backgroundColor: theme.card,
  borderRadius: isCityBlack ? 4 : 12,
  paddingHorizontal: 11,
  paddingVertical: 10,
  marginBottom: 8,
  borderWidth: 0.5,
  borderColor: theme.line,
},

searchCrewStatus: {
  marginTop: 7,
  alignSelf: 'flex-start',
  backgroundColor: 'transparent',
  color: theme.text,
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '900',
  paddingHorizontal: 9,
  paddingVertical: 4,
  borderRadius: isCityBlack ? 4 : 9,
  borderWidth: 0.5,
  borderColor: theme.strongLine,
  overflow: 'hidden',
},

searchCrewStatusJoined: {
  backgroundColor: 'transparent',
  color: theme.subText,
  borderColor: theme.line,
},

searchCrewStatusRequested: {
  backgroundColor: 'transparent',
  color: theme.subText,
  borderColor: theme.line,
},
crewIconSelectRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

crewIconSelectButton: {
  width: 38,
  height: 38,
  borderRadius: isCityBlack ? 4 : 10,
  backgroundColor: 'transparent',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

activeCrewIconSelectButton: {
  backgroundColor: 'transparent',
  borderColor: theme.strongLine,
  borderWidth: 1,
},

crewIconSelectText: {
  fontSize: 24,
},
createCrewModalContent: {
  paddingBottom: 120,
},
feedControlRow: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 14,
},

feedControlButton: {
  flex: 1,
  minHeight: 32,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 6,
  paddingHorizontal: 6,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

feedControlText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
  color: theme.text,
},
guestLoginButton: {
  marginTop: 18,
  minWidth: 150,
  minHeight: 34,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 7,
  paddingHorizontal: 24,
  alignSelf: 'center',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.strongLine,
},

guestLoginButtonText: {
  color: theme.text,
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
},
notificationDeleteButton: {
  position: 'absolute',

  top: 8,
  right: 8,

  zIndex: 5,

  /*
   * Android의 회색 그림자를 제거합니다.
   */
  elevation: 0,
  shadowOpacity: 0,

  minWidth: 44,
  minHeight: 26,

  backgroundColor:
    'transparent',

  borderRadius:
    isCityBlack
      ? 4
      : 8,

  paddingHorizontal: 8,
  paddingVertical: 3,

  borderWidth: 0.5,
  borderColor:
    theme.danger,

  alignItems: 'center',
  justifyContent: 'center',
},

notificationConfirmButtonRow: {
  width: '100%',

  marginTop: 16,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,
},

notificationConfirmButton: {
  flex: 1,

  marginTop: 0,

  minHeight: 34,

  paddingHorizontal: 8,
  paddingVertical: 6,

  alignItems: 'center',
  justifyContent: 'center',
},

notificationDeleteText: {
  fontSize: 11,
  lineHeight: 15,

  fontWeight: '800',

  color:
    theme.danger,

  includeFontPadding: false,
},
notificationDate: {
  marginTop: 4,

  fontSize: 11,
  lineHeight: 15,

  color:
    isCityBlack
      ? theme.subText
      : '#9b8b77',
},
notificationActionRow: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 12,
},

notificationSmallButton: {
  flex: 1,
  minHeight: 32,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 6,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.line,
},

notificationSmallButtonText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
  color: theme.text,
},

notificationSmallDangerButton: {
  flex: 1,
  minHeight: 32,
  backgroundColor: 'transparent',
  borderRadius: isCityBlack ? 4 : 10,
  paddingVertical: 6,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  borderColor: theme.danger,
},

notificationSmallDangerText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
  color: theme.danger,
},
feedProfilePress: {
  flex: 1,
  minWidth: 0,

  flexDirection: 'row',
  alignItems: 'center',
},
});