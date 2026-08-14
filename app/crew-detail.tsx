import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
} from '@react-native-firebase/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  countUnreadRootCrewChatMessages,
  getRootCrewChatLastReadAt,
  subscribeRootCrewChatMessages,
} from '../store/rootCrewChat';
import {
  addRootCrewNotification,
  addRootCrewPostComment,
  addRootCrewReport,
  approveRootCrewJoinRequest,
  deleteAllRootCrewNotifications,
  deleteRootCrew,
  deleteRootCrewNotification,
  getRootCrewNotifications,
  getRootCrews,
  getRootOnboardingData,
  hideRootCrewPost,
  leaveRootCrew,
  loadRootCrewReports,
  loadRootCrews,
  markAllRootCrewNotificationsRead,
  markRootCrewNotificationRead,
  rejectRootCrewJoinRequest,
  subscribeRootCrewJoinRequests,
  subscribeRootCrewNotifications,
  subscribeRootCrewPosts,
  subscribeRootCrewReports,
  subscribeRootCrews,
  toggleRootCrewJoinType,
  toggleRootCrewPostCheer,
  updateRootCrew,
  updateRootCrewNotice,
  updateRootCrewReportStatus,
} from '../store/rootMemory';
import { useRootTheme } from '../store/rootTheme';

const categories = [
  { id: 'exercise', label: '운동', icon: '🏃' },
  { id: 'study', label: '공부', icon: '📚' },
  { id: 'mental', label: '정신', icon: '🧘' },
  { id: 'daily', label: '일상', icon: '🏠' },
];

const MAX_CREW_MEMBER_COUNT = 30;

const HIDDEN_CREW_POSTS_KEY = 'hidden_crew_posts_v1';
const FOLLOWING_CREW_USERS_KEY = 'following_crew_users_v1';
const CREW_SUPPORT_HISTORY_KEY = 'crew_support_history_v1';
const reportReasons = [
  '욕설/비방',
  '스팸/홍보',
  '부적절한 사진',
  '허위 기록',
  '기타',
];

const DARK_TEXT_COLORS = new Set([
  '#5f2f12',
  '#5f3b1b',
  '#6b3514',
  '#7a2e0e',
  '#7a4c1f',
  '#3d2515',
]);

const MUTED_TEXT_COLORS = new Set([
  '#8a5a24',
  '#8a6a3a',
  '#8b6a45',
  '#8b5a2b',
  '#b08a5a',
  '#c8b08a',
]);

const LIGHT_CARD_COLORS = new Set([
  '#f7f0e5',
  '#f8f1df',
  '#fffaf2',
]);

const LIGHT_SUBCARD_COLORS = new Set([
  '#fff8ec',
  '#fff3cf',
  '#ead7b7',
  '#ead7b3',
  '#f3d9a4',
  '#f3e4c8',
  '#fee2e2',
]);

const ACCENT_COLORS = new Set([
  '#f59e0b',
  '#9c651f',
  '#7c3aed',
  '#2f80ed',
  '#16a34a',
  '#c9982d',
  '#a86b16',
]);

const DANGER_COLORS = new Set([
  '#b91c1c',
  '#ef4444',
  '#c91f1f',
  '#c71f25',
  '#d81f26',
  '#d14d41',
]);

const LINE_COLORS = new Set([
  '#dfc28e',
  '#d8c3a5',
  '#d8b56c',
  '#e0c78f',
  '#c8b08a',
]);

function createCrewDetailThemedStyles(
  baseStyles: Record<string, any>,
  theme: any,
  isCityBlack: boolean
) {
  const themedStyles: Record<string, any> = {};

  const modalBoxKeys = new Set([
    'confirmBox',
    'reportModalBox',
    'profileModalBox',
    'memberModalBox',
    'noticeModalBox',
    'feedDetailBox',
  ]);

  const neutralButtonKeys = new Set([
    'leaveButton',
    'cancelButton',
    'submitButton',
    'approveButton',
    'rejectButton',
    'reportDoneButton',
    'cheerButton',
    'reportMenuButton',
    'reportReasonButton',
    'followButton',
    'feedModeButton',
    'followingManageButton',
    'supportButton',
    'noticeOkButton',
    'moreFeedButton',
    'feedPeriodButton',
    'feedSortButton',
    'missionToggle',
        'notificationDeleteButton',
    'notificationSmallButton',
    'crewManageSmallButton',
    'manageButton',
    'visitVillageButton',
    'unfollowSmallButton',
  ]);

  const activeButtonKeys = new Set([
    'activeCheerButton',
    'activeReportReasonButton',
    'followingButton',
    'activeFeedModeButton',
    'supportedButton',
    'activeFeedSortButton',
    'activeFeedPeriodButton',
    'activeMissionToggle',
  ]);

  const dangerButtonKeys = new Set([
    'dangerButton',
    'manageDangerButton',
    'deleteConfirmButton',
    'reportDeleteButton',
    'notificationSmallDangerButton',
    'crewLeaveSmallButton',
  ]);

  const neutralButtonTextKeys = new Set([
    'leaveButtonText',
    'cancelText',
    'submitText',
    'approveText',
    'rejectText',
    'reportDoneText',
    'cheerButtonText',
    'reportMenuText',
    'reportReasonText',
    'followButtonText',
    'feedModeText',
    'followingManageText',
    'supportButtonText',
    'noticeOkText',
    'moreFeedText',
    'feedPeriodText',
    'feedSortText',
    'missionToggleText',
    'notificationSmallButtonText',
    'crewManageSmallButtonText',
    'manageButtonText',
    'visitVillageButtonText',
  ]);

  const activeButtonTextKeys = new Set([
    'activeCheerButtonText',
    'activeReportReasonText',
    'followingButtonText',
    'activeFeedModeText',
    'activeFeedSortText',
    'activeFeedPeriodText',
    'activeMissionToggleText',
  ]);

  const dangerButtonTextKeys = new Set([
    'dangerButtonText',
    'deleteConfirmText',
    'reportDeleteText',
    'notificationSmallDangerText',
    'crewLeaveSmallButtonText',
    'unfollowSmallText',
  ]);


  Object.keys(baseStyles).forEach((key) => {
    const baseStyle = baseStyles[key];
    const flatStyle = StyleSheet.flatten(baseStyle) ?? {};
    const override: Record<string, any> = {};

    /*
     * 도시 모드의 기존 색상 치환을 유지합니다.
     * 따뜻한 모드에도 아래의 공통 버튼/모달 스타일은 동일하게 적용됩니다.
     */
    if (isCityBlack) {
      const backgroundColor = flatStyle.backgroundColor;

      if (backgroundColor === '#f5e9cf') {
        override.backgroundColor = theme.background;
      } else if (LIGHT_CARD_COLORS.has(backgroundColor)) {
        override.backgroundColor = theme.card;
      } else if (LIGHT_SUBCARD_COLORS.has(backgroundColor)) {
        override.backgroundColor = theme.card2;
      } else if (ACCENT_COLORS.has(backgroundColor)) {
        override.backgroundColor = theme.button;
      } else if (DANGER_COLORS.has(backgroundColor)) {
        override.backgroundColor = theme.danger;
      }

      const color = flatStyle.color;

      if (DARK_TEXT_COLORS.has(color)) {
        override.color = theme.text;
      } else if (MUTED_TEXT_COLORS.has(color)) {
        override.color = theme.subText;
      } else if (color === '#fff') {
        override.color = theme.buttonText;
      } else if (ACCENT_COLORS.has(color)) {
        override.color = theme.text;
      } else if (DANGER_COLORS.has(color)) {
        override.color = theme.danger;
      }

      const borderColor = flatStyle.borderColor;

      if (
        LINE_COLORS.has(borderColor) ||
        LIGHT_CARD_COLORS.has(borderColor) ||
        LIGHT_SUBCARD_COLORS.has(borderColor) ||
        borderColor === '#fff'
      ) {
        override.borderColor = theme.line;
      } else if (ACCENT_COLORS.has(borderColor)) {
        override.borderColor = theme.strongLine;
      } else if (DANGER_COLORS.has(borderColor)) {
        override.borderColor = theme.danger;
      }

      if (flatStyle.shadowColor) {
        override.shadowColor = '#000';
      }

      const lowerKey = key.toLowerCase();
      const width = flatStyle.width;
      const height = flatStyle.height;
      const radius = flatStyle.borderRadius;

      const isMeasuredCircle =
        typeof width === 'number' &&
        typeof height === 'number' &&
        width === height &&
        typeof radius === 'number' &&
        radius >= width / 2 - 1;

      const keepRound =
        isMeasuredCircle ||
        lowerKey.includes('avatar') ||
        lowerKey.includes('circle') ||
        lowerKey.includes('dot') ||
        lowerKey.includes('badge');

      if (typeof radius === 'number' && !keepRound) {
        override.borderRadius = 4;
      }
    }

    const commonRadius = isCityBlack ? 4 : 12;
    const modalRadius = isCityBlack ? 4 : 18;

    /* 아래에서 올라오는 입력/관리 창 */
    if (key === 'modalBox') {
      Object.assign(override, {
        backgroundColor: theme.card,
        borderTopLeftRadius: modalRadius,
        borderTopRightRadius: modalRadius,
        borderWidth: 0.5,
        borderColor: theme.line,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 18,
        maxHeight: '88%',
      });
    }

    /* 화면 중앙에 뜨는 확인·알림·프로필·상세 창 */
    if (modalBoxKeys.has(key)) {
      Object.assign(override, {
        backgroundColor: theme.card,
        borderRadius: modalRadius,
        borderWidth: 0.5,
        borderColor: theme.line,
        padding: 16,
      });
    }

    if (key === 'reportModalBox') {
      override.maxHeight = '85%';
    }

    if (key === 'feedDetailBox') {
      override.maxHeight = '86%';
    }

    if (key === 'modalTitle') {
      Object.assign(override, {
        color: theme.text,
        fontSize: 20,
        lineHeight: 26,
        marginBottom: 12,
      });
    }

    if (key === 'confirmTitle' || key === 'noticeModalTitle') {
      Object.assign(override, {
        color: theme.text,
        fontSize: 19,
        lineHeight: 25,
      });
    }

    if (key === 'confirmText' || key === 'noticeModalMessage') {
      Object.assign(override, {
        color: theme.subText,
        fontSize: 13,
        lineHeight: 20,
      });
    }

    /* 입력창은 배경 없이 얇은 테두리만 사용합니다. */
    if (key === 'input') {
      Object.assign(override, {
        backgroundColor: 'transparent',
        borderRadius: commonRadius,
        borderWidth: 0.5,
        borderColor: theme.line,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 13,
        color: theme.text,
      });
    }

    if (key === 'textArea') {
      Object.assign(override, {
        minHeight: 88,
      });
    }

    if (key === 'modalButtonRow') {
      Object.assign(override, {
        gap: 8,
        marginTop: 12,
        alignItems: 'center',
      });
    }

    /* 일반 버튼: 배경 없이 얇은 테두리 */
    if (neutralButtonKeys.has(key)) {
      Object.assign(override, {
        backgroundColor: 'transparent',
        borderWidth: 0.5,
        borderColor: theme.line,
        borderRadius: commonRadius,
        paddingVertical: 8,
      });
    }

    if (key === 'cancelButton') {
      Object.assign(override, {
        marginTop: 0,
        minHeight: 34,
        justifyContent: 'center',
      });
    }

    if (key === 'submitButton' || key === 'approveButton' || key === 'rejectButton') {
      Object.assign(override, {
        minHeight: 34,
        justifyContent: 'center',
      });
    }

    if (key === 'manageButton') {
      Object.assign(override, {
        paddingVertical: 10,
        minHeight: 42,
      });
    }

    if (key === 'crewManageSmallButton' || key === 'crewLeaveSmallButton') {
      Object.assign(override, {
        width: 64,
        paddingVertical: 7,
      });
    }

    if (
  key ===
  'notificationButton'
) {
  Object.assign(
    override,
    {
      width: 30,
      height: 30,

      paddingHorizontal: 0,
      paddingVertical: 0,

      backgroundColor:
        'transparent',

      borderWidth: 0,
      borderColor:
        'transparent',
    }
  );
}

    if (
  key ===
  'notificationDeleteButton'
) {
  Object.assign(
    override,
    {
      position:
        'absolute',

      right: 10,
      bottom: 10,

      minWidth: 45,
      minHeight: 27,

      paddingHorizontal: 8,
      paddingVertical: 3,

      backgroundColor:
        'transparent',

      borderWidth: 0.5,
      borderColor:
        theme.line,

      borderRadius:
        isCityBlack
          ? 4
          : 9,

      alignItems:
        'center',

      justifyContent:
        'center',

      elevation: 0,
    }
  );
}

    if (key === 'missionToggle') {
      Object.assign(override, {
        paddingHorizontal: 12,
        paddingVertical: 6,
      });
    }

    if (key === 'reportReasonButton') {
      Object.assign(override, {
        paddingHorizontal: 11,
        paddingVertical: 7,
      });
    }

    /* 선택된 버튼은 배경 대신 조금 더 진한 테두리로 구분합니다. */
    if (activeButtonKeys.has(key)) {
      Object.assign(override, {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.strongLine,
      });
    }

    /* 삭제·탈퇴·신고 버튼은 빨간 테두리만 사용합니다. */
    if (dangerButtonKeys.has(key)) {
      Object.assign(override, {
        backgroundColor: 'transparent',
        borderWidth: 0.5,
        borderColor: theme.danger,
        borderRadius: commonRadius,
        paddingVertical: 8,
        marginTop: 0,
      });
    }

    if (key === 'deleteConfirmButton') {
      Object.assign(override, {
        height: 34,
        minHeight: 34,
      });
    }

    if (key === 'dangerButton') {
      Object.assign(override, {
        minHeight: 34,
      });
    }

    if (neutralButtonTextKeys.has(key)) {
      Object.assign(override, {
        color: theme.text,
        fontSize: 12,
        lineHeight: 17,
      });
    }

    if (activeButtonTextKeys.has(key)) {
      Object.assign(override, {
        color: theme.text,
        fontSize: 12,
      });
    }

    if (dangerButtonTextKeys.has(key)) {
      Object.assign(override, {
        color: theme.danger,
        fontSize: 12,
        lineHeight: 17,
      });
    }

    if (key === 'notificationSmallDangerText') {
      override.color = theme.danger;
    }

    /* 목록 안의 작은 카드도 모달과 같은 얇은 테두리로 정리합니다. */
   if (
  key === 'commentItem'
) {
  Object.assign(
    override,
    {
      flexDirection: 'row',
      alignItems: 'flex-start',
      
      backgroundColor:
        'transparent',

      borderRadius:
        commonRadius,

      borderWidth: 0.5,
      borderColor:
        theme.line,

      paddingVertical: 8,
      paddingHorizontal: 10,

      marginBottom: 6,
    }
  );
}

if (
  key ===
    'commentNicknameText' ||
  key ===
    'commentBodyText'
) {
  override.color =
    theme.text;
}

    themedStyles[key] = [baseStyle, override];
  });

  return themedStyles;
}

export default function CrewDetailScreen() {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack =
    themeMode === 'cityBlack';

  const S = useMemo(
    () =>
      createCrewDetailThemedStyles(
        styles,
        theme,
        isCityBlack
      ),
    [theme, isCityBlack]
  );

  const { id } = useLocalSearchParams();
  const [selectedCrew, setSelectedCrew] = useState<any>(null);
  const [crewLoading, setCrewLoading] = useState(true);
  const [crewPosts, setCrewPosts] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalHoursText, setGoalHoursText] = useState('');
  const [showEditCrewModal, setShowEditCrewModal] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
const [showCrewManageModal, setShowCrewManageModal] = useState(false);
const [editCrewTitle, setEditCrewTitle] = useState('');
const [editCrewDescription, setEditCrewDescription] = useState('');
const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
const [showLeaveCrewModal, setShowLeaveCrewModal] = useState(false);
const [leavingCrew, setLeavingCrew] = useState(false);
const [  changingJoinType,  setChangingJoinType,] = useState(false);
const [deleteRemainTick, setDeleteRemainTick] = useState(0);
const [crewReports, setCrewReports] = useState<any[]>([]);
const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
const [showReportManageModal, setShowReportManageModal] = useState(false);
const [showJoinRequestManageModal, setShowJoinRequestManageModal] =  useState(false);
const [crewNotifications, setCrewNotifications] = useState<any[]>([]);
const [showNotificationModal, setShowNotificationModal] = useState(false);
const [unreadChatCount, setUnreadChatCount] = useState(0);
const [deleteNotificationTarget, setDeleteNotificationTarget] =
  useState<any>(null);

const [showDeleteAllNotificationsConfirm, setShowDeleteAllNotificationsConfirm] =
  useState(false);

  const userProfile = getRootOnboardingData();
  const userId =
    userProfile?.uid ??
    userProfile?.guestId ??
    'guest';
const [showPostMenu, setShowPostMenu] = useState<any>(null);
const [reportPost, setReportPost] = useState<any>(null);
const [reportReason, setReportReason] = useState('');
const [reportDetail, setReportDetail] = useState('');    
const [commentPost, setCommentPost] = useState<any>(null);
const [commentText, setCommentText] = useState('');
const [selectedFeedPost, setSelectedFeedPost] = useState<any>(null);
const [profileUser, setProfileUser] = useState<any>(null);
const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
const [supportedUsersToday, setSupportedUsersToday] = useState<string[]>([]);
const [feedSortType, setFeedSortType] =  useState<'latest' | 'popular' | 'minutes'>('latest');
const [feedPeriod, setFeedPeriod] =  useState<'all' | 'today' | 'week' | 'month'>('all');
const [feedVisibleCount, setFeedVisibleCount] = useState(10);
const [noticeModal, setNoticeModal] = useState<{
  title: string;
  message: string;
} | null>(null);

const getDeleteRemainText = () => {
  if (!selectedCrew?.deleteRequestedAt) return '';

  const requestedAt = new Date(
    selectedCrew.deleteRequestedAt
  ).getTime();

  const endAt = requestedAt + 48 * 60 * 60 * 1000;
  deleteRemainTick;
  const remainMs = Math.max(
  0,
  endAt - Date.now() + deleteRemainTick * 0
);

  if (remainMs <= 0) {
    return '이제 정말 삭제할 수 있어요.';
  }

  const remainHours = Math.floor(
    remainMs / (1000 * 60 * 60)
  );

  const remainMinutes = Math.floor(
    (remainMs % (1000 * 60 * 60)) / (1000 * 60)
  );

  return `${remainHours}시간 ${remainMinutes}분 남음`;
};

useEffect(() => {
  if (!showDeleteConfirmModal) return;
  if (!selectedCrew?.deleteRequestedAt) return;

  const timer = setInterval(() => {
    setDeleteRemainTick((prev) => prev + 1);
  }, 1000 * 30);

  return () => clearInterval(timer);
}, [showDeleteConfirmModal, selectedCrew?.deleteRequestedAt]);

useEffect(() => {
  const loadLocalSettings = async () => {
    const serverReports = await loadRootCrewReports();

    const savedHiddenPosts = await AsyncStorage.getItem(
      HIDDEN_CREW_POSTS_KEY
    );

    const savedFollowingUsers = await AsyncStorage.getItem(
      FOLLOWING_CREW_USERS_KEY
    );

    const savedSupportHistory = await AsyncStorage.getItem(
      CREW_SUPPORT_HISTORY_KEY
    );

    setCrewReports(serverReports);
    
      setHiddenPostIds(
      savedHiddenPosts ? JSON.parse(savedHiddenPosts) : []
    );

    setFollowingUserIds(
      savedFollowingUsers ? JSON.parse(savedFollowingUsers) : []
    );


    const todayKey = new Date().toISOString().slice(0, 10);

    const supportHistory = savedSupportHistory
      ? JSON.parse(savedSupportHistory)
      : {};

    setSupportedUsersToday(
      supportHistory[todayKey] ?? []
    );
  };

  loadLocalSettings();

  setCrewLoading(true);

const localCrew = getRootCrews().find(
  (crew: any) => String(crew?.id ?? '') === String(id)
);

if (localCrew) {
  setSelectedCrew(localCrew);
  setCrewLoading(false);
}

const unsubscribeCrews = subscribeRootCrews((crews) => {
  const foundCrew = crews.find(
    (crew: any) => String(crew?.id ?? '') === String(id)
  );

  setSelectedCrew(foundCrew ?? localCrew ?? null);
  setCrewLoading(false);
});

  const unsubscribePosts = subscribeRootCrewPosts((posts) => {
    setCrewPosts(posts);
  });

  const unsubscribeRequests =
    subscribeRootCrewJoinRequests((requests) => {
      setJoinRequests(requests);
    });

    const unsubscribeReports =
  subscribeRootCrewReports((reports) => {
    setCrewReports(reports);
  });
  
    const unsubscribeNotifications =
  subscribeRootCrewNotifications(userId, (notifications) => {
    setCrewNotifications(notifications);
  });

setCrewNotifications(getRootCrewNotifications());

  return () => {
    unsubscribeCrews?.();
  unsubscribePosts?.();
  unsubscribeRequests?.();
  unsubscribeReports?.();
  unsubscribeNotifications?.();
  };
}, [id]);

useEffect(() => {
  const crewId =
    String(
      id ?? ''
    );
  const authUid =
    getAuth().currentUser?.uid ?? '';
  const memberIds =
    selectedCrew?.memberIds ?? [];
  const canReadChat =
    Boolean(
      crewId &&
      authUid &&
      memberIds.some(
        (
          memberId: unknown
        ) =>
          String(
            memberId
          ) === authUid
      )
    );

  if (
    !canReadChat
  ) {
    setUnreadChatCount(0);
    return;
  }

  let disposed =
    false;
  let unsubscribe:
    (() => void) |
    undefined;

  void getRootCrewChatLastReadAt(
    authUid,
    crewId
  ).then(
    (
      lastReadAt
    ) => {
      if (
        disposed
      ) {
        return;
      }

      unsubscribe =
        subscribeRootCrewChatMessages(
          crewId,
          (
            messages
          ) => {
            setUnreadChatCount(
              countUnreadRootCrewChatMessages(
                messages,
                authUid,
                lastReadAt
              )
            );
          },
          () => {
            setUnreadChatCount(0);
          }
        );
    }
  );

  return () => {
    disposed =
      true;
    unsubscribe?.();
  };
}, [
  id,
  selectedCrew?.memberIds,
]);

if (crewLoading) {
  return (
    <View style={S.container}>
      <Text style={S.emptyText}>
        크루 정보를 불러오는 중이에요.
      </Text>
    </View>
  );
}

  if (!selectedCrew) {
    return (
      <View style={S.container}>


        
        <Pressable onPress={() => router.back()}>
          <Text style={S.backText}>← 뒤로가기</Text>
        </Pressable>

        <Text style={S.emptyText}>
          크루 정보를 찾을 수 없어요.
        </Text>
      </View>
    );
  }

  const isOwner = selectedCrew?.ownerId === userId;
const isMember = (selectedCrew?.memberIds ?? []).some(
  (memberId: string) =>
    String(memberId) === String(userId)
);
const selectedCrewId = String(selectedCrew?.id ?? '');


const currentMemberCount =
  selectedCrew?.memberIds?.length ?? 0;

  const selectedCrewPosts = selectedCrew
  ? crewPosts
      .filter((post: any) => !!post)
      .filter((post: any) => {
        const targetPostId = String(post?.id ?? '');

        const isThisCrew =
          String(post?.crewId ?? '') === selectedCrewId ||
          String(post?.sharedCrewId ?? '') === selectedCrewId;

        return (
  isThisCrew &&
  post?.status !== 'hidden' &&
  !hiddenPostIds.includes(targetPostId)
);
      })
  : [];

const periodFilteredCrewPosts =
  selectedCrewPosts.filter((post: any) => {
    if (feedPeriod === 'all') return true;

    const postTime = new Date(
      post?.date ?? post?.createdAt ?? ''
    ).getTime();

    if (!postTime) return false;

    const now = new Date();

    if (feedPeriod === 'today') {
      const postDate = new Date(postTime);

      return (
        postDate.getFullYear() === now.getFullYear() &&
        postDate.getMonth() === now.getMonth() &&
        postDate.getDate() === now.getDate()
      );
    }

    if (feedPeriod === 'week') {
      const weekAgo =
        Date.now() - 7 * 24 * 60 * 60 * 1000;

      return postTime >= weekAgo;
    }

    if (feedPeriod === 'month') {
      const postDate = new Date(postTime);

      return (
        postDate.getFullYear() === now.getFullYear() &&
        postDate.getMonth() === now.getMonth()
      );
    }

    return true;
  });

const sortedCrewPosts = [...periodFilteredCrewPosts]
  .filter(Boolean)
  .sort((a: any, b: any) => {
    if (feedSortType === 'popular') {
      const aScore =
        Number(a?.cheers ?? 0) +
        Number(a?.comments?.length ?? 0) * 2;

      const bScore =
        Number(b?.cheers ?? 0) +
        Number(b?.comments?.length ?? 0) * 2;

      return bScore - aScore;
    }

    if (feedSortType === 'minutes') {
      return Number(b?.minutes ?? 0) - Number(a?.minutes ?? 0);
    }

    const aTime = new Date(
      a?.date ?? a?.createdAt ?? 0
    ).getTime();

    const bTime = new Date(
      b?.date ?? b?.createdAt ?? 0
    ).getTime();

    return bTime - aTime;
  });

const displayedCrewPosts =
  sortedCrewPosts.slice(0, feedVisibleCount);

  const selectedCrewReports = crewReports.filter(
  (report: any) =>
    report.status === 'pending' &&
    (
      String(report.crewId) === selectedCrewId ||
      selectedCrewPosts.some(
        (post: any) =>
          String(post?.id ?? '') === String(report?.postId ?? '')
      )
    )
);

const selectedCrewJoinRequests = joinRequests.filter(
  (request: any) =>
    String(request.crewId) === selectedCrewId &&
    request.status === 'pending'
);

const getThisMonthKey = () => {
  return new Date().toISOString().slice(0, 7);
};

  const selectedCrewGoalMinutes =
  Number(selectedCrew?.goalHours ?? 0) * 60;

const selectedCrewMonthlyMinutes = selectedCrewPosts
  .filter((post: any) => {
    const date = String(post.date ?? post.createdAt ?? '');
    return date.slice(0, 7) === getThisMonthKey();
  })
  .reduce(
    (sum: number, post: any) =>
      sum + Number(post.minutes ?? 0),
    0
  );

const selectedCrewGoalPercent =
  selectedCrewGoalMinutes > 0
    ? Math.min(
        100,
        (selectedCrewMonthlyMinutes / selectedCrewGoalMinutes) * 100
      )
    : 0;

    const selectedCrewTotalMinutes = selectedCrewPosts.reduce(
  (sum: number, post: any) =>
    sum + Number(post.minutes ?? 0),
  0
);

const selectedCrewExp = selectedCrewTotalMinutes;

const selectedCrewLevel =
  Math.floor(selectedCrewExp / 500) + 1;

const selectedCrewCurrentLevelExp =
  selectedCrewExp % 500;

const selectedCrewLevelPercent =
  (selectedCrewCurrentLevelExp / 500) * 100;

  const todayKey = new Date().toISOString().slice(0, 10);

const todayCrewPosts = selectedCrewPosts.filter((post: any) => {
  const postDate = String(
    post?.date ?? post?.createdAt ?? ''
  ).slice(0, 10);

  return postDate === todayKey;
});

const todayAttendanceUsers = Array.from(
  new Set(
    todayCrewPosts.map((post: any) =>
      String(post?.userId ?? post?.nickname ?? '')
    )
  )
).filter(Boolean);

const todayAttendanceCount =
  todayAttendanceUsers.length;

const attendancePercent =
  currentMemberCount > 0
    ? Math.min(
        100,
        (todayAttendanceCount / currentMemberCount) * 100
      )
    : 0;

    const selectedCrewWeeklyRanking = selectedCrewPosts
  .filter((post: any) => {
    if (!post.date) return false;

    const postTime = new Date(post.date).getTime();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return postTime >= weekAgo;
  })
  .reduce((acc: any[], post: any) => {
    const key = post.userId ?? post.nickname ?? 'unknown';

    const found = acc.find((item) => item.key === key);

    if (found) {
      found.minutes += Number(post.minutes ?? 0);
      found.count += 1;
    } else {
      acc.push({
        key,
        nickname: post.nickname ?? '루트유저',
        emoji: post.profileEmoji ?? '🦊',
        minutes: Number(post.minutes ?? 0),
        count: 1,
      });
    }

    return acc;
  }, [])
  .sort((a: any, b: any) => {
    if (b.minutes !== a.minutes) {
      return b.minutes - a.minutes;
    }

    return b.count - a.count;
  })
  .slice(0, 3);

const formatRankingTime = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  if (hour <= 0) return `${minute}분`;
  if (minute <= 0) return `${hour}시간`;

  return `${hour}시간 ${minute}분`;
};

const profileUserId = profileUser
  ? String(profileUser.userId ?? profileUser.id ?? '')
  : '';

const profileUserPosts = profileUserId
  ? selectedCrewPosts.filter((post: any) => {
      const postUserId = String(
        post.userId ?? post.nickname ?? ''
      );

      return postUserId === profileUserId;
    })
  : [];

const profileTotalMinutes = profileUserPosts.reduce(
  (sum: number, post: any) =>
    sum + Number(post.minutes ?? 0),
  0
);

const profileWeeklyMinutes = profileUserPosts
  .filter((post: any) => {
const postTime = new Date(
      post.date ?? post.createdAt ?? ''
    ).getTime();

    const weekAgo =
      Date.now() - 7 * 24 * 60 * 60 * 1000;

    return postTime >= weekAgo;
  })
  .reduce(
    (sum: number, post: any) =>
      sum + Number(post.minutes ?? 0),
    0
  );

  const profileSupportCount = profileUserPosts.reduce(
  (sum: number, post: any) =>
    sum + Number(post.cheers ?? 0),
  0
);

const isFollowingProfileUser =
  profileUserId.length > 0 &&
  followingUserIds.includes(profileUserId);

  const alreadySupportedToday =
  profileUserId.length > 0 &&
  supportedUsersToday.includes(profileUserId);

const isMyProfile =
  profileUserId.length > 0 &&
  profileUserId === userId;

  const unreadNotificationCount = crewNotifications.filter(
  (item: any) => !item.read
).length;

  return (
      <>
    <ScrollView style={S.container}>
      <Pressable onPress={() => router.back()}>
  <Text style={S.backText}>← 크루목록</Text>
</Pressable>

<View
  style={
    S.crewCompactHeader
  }
>
  {/* 카테고리 / 알림 */}
  <View
    style={
      S.crewHeaderTopRow
    }
  >
    <Text
      style={
        S.crewCategoryBadge
      }
    >
      {categories.find(
        (item) =>
          item.id ===
          selectedCrew.category
      )?.icon ?? '👥'}{' '}

      {categories.find(
        (item) =>
          item.id ===
          selectedCrew.category
      )?.label ?? '크루'}
    </Text>

    <Pressable
      style={
        S.notificationButton
      }
      onPress={() =>
        setShowNotificationModal(
          true
        )
      }
    >
      <Text
        style={
          S.notificationButtonText
        }
      >
        🔔
      </Text>

      {unreadNotificationCount >
      0 ? (
        <View
          style={
            S.notificationBadge
          }
        >
          <Text
            style={
              S.notificationBadgeText
            }
          >
            {Math.min(
              unreadNotificationCount,
              99
            )}
          </Text>
        </View>
      ) : null}
    </Pressable>
  </View>

  {/* 크루 이름 / 관리·탈퇴 */}
  <View
    style={
      S.crewNameAndButtonRow
    }
  >
    <Text
      style={
        S.crewHeaderTitle
      }
      numberOfLines={1}
    >
      {selectedCrew.title}
    </Text>

    {isOwner ? (
      <Pressable
        style={
          S.crewManageSmallButton
        }
        onPress={() =>
          setShowCrewManageModal(
            true
          )
        }
      >
        <Text
          style={
            S.crewManageSmallButtonText
          }
        >
          관리
        </Text>
      </Pressable>
    ) : isMember ? (
      <Pressable
        style={
          S.crewLeaveSmallButton
        }
        onPress={() =>
          setShowLeaveCrewModal(
            true
          )
        }
      >
        <Text
          style={
            S.crewLeaveSmallButtonText
          }
        >
          탈퇴
        </Text>
      </Pressable>
    ) : null}
  </View>

 {/* 레벨 / 크루미션 */}
<View
  style={
    S.crewCompactInfoRow
  }
>
  <View
    style={
      S.crewLevelMissionRow
    }
  >
    <Text
      style={
        S.crewCompactLevelText
      }
      numberOfLines={1}
    >
      Lv.{selectedCrewLevel}{' '}
      {selectedCrewCurrentLevelExp}
      /500 EXP
    </Text>

    <Pressable
      style={
        S.crewMissionOpenButton
      }
      onPress={() => {
        router.push({
          pathname:
            '/crew-missions',

          params: {
            id:
              selectedCrewId,
          },
        });
      }}
    >
      <Text
        style={
          S.crewMissionOpenButtonText
        }
      >
        크루미션
      </Text>
    </Pressable>
  </View>

  {/* 멤버는 경험치 아래 */}
  <Pressable
    style={
      S.crewMemberButton
    }
    onPress={() => {
      setUnreadChatCount(0);
      router.push({
        pathname:
          '/crew-members',

        params: {
          id:
            selectedCrewId,
        },
      });
    }}
  >
    <Text
      style={
        S.crewMemberLinkText
      }
    >
      멤버 {currentMemberCount}명
    </Text>
  </Pressable>
</View>

{isMember ? (
  <Pressable
    style={S.crewChatButton}
    onPress={() => {
      router.push({
        pathname:
          '/crew-chat' as any,
        params: {
          id:
            selectedCrewId,
        },
      });
    }}
  >
    <View style={S.crewChatButtonCopy}>
      <Text style={S.crewChatButtonTitle}>
        💬 크루 대화
        {unreadChatCount > 0
          ? ` · 새 메시지 ${Math.min(unreadChatCount, 99)}`
          : ''}
      </Text>
      <Text style={S.crewChatButtonDescription}>
        멤버들과 목표와 탐험 이야기를 나눠보세요
      </Text>
    </View>
    <Text style={S.crewChatButtonArrow}>
      ›
    </Text>
  </Pressable>
) : null}

	  <View
    style={
      S.crewCompactDivider
    }
  />

  {/* 소개글 */}
  <View
    style={
      S.crewCompactDescription
    }
  >
        <Text
      style={
        S.crewDescriptionInline
      }
      numberOfLines={
        showFullDescription
          ? undefined
          : 3
      }
      onPress={() =>
        setShowFullDescription(
          (previous) =>
            !previous
        )
      }
    >
      {selectedCrew
        .description?.trim()
        ? selectedCrew.description
        : '소개글이 없습니다.'}
    </Text>
  </View>
</View>

<View style={S.feedBox}>
  <Text style={S.memberTitle}>📰 크루 피드</Text>

<View style={S.feedPeriodRow}>
  {[
    { id: 'all', label: '전체' },
    { id: 'today', label: '오늘' },
    { id: 'week', label: '이번 주' },
    { id: 'month', label: '이번 달' },
  ].map((item) => (
    <Pressable
      key={item?.id}
      style={[
        S.feedPeriodButton,
        feedPeriod === item?.id &&
          S.activeFeedPeriodButton,
      ]}
      onPress={() => {
        setFeedPeriod(item?.id as any);
        setFeedVisibleCount(10);
      }}
    >
      <Text
        style={[
          S.feedPeriodText,
          feedPeriod === item?.id &&
            S.activeFeedPeriodText,
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  ))}
</View>

<View style={S.feedSortRow}>
  {[
    { id: 'latest', label: '최신순' },
    { id: 'popular', label: '인기순' },
    { id: 'minutes', label: '기록시간순' },
  ].map((item) => (
    <Pressable
      key={item?.id}
      style={[
        S.feedSortButton,
        feedSortType === item?.id &&
          S.activeFeedSortButton,
      ]}
      onPress={() => {
        setFeedSortType(item?.id as any);
        setFeedVisibleCount(10);
      }}
    >
      <Text
        style={[
          S.feedSortText,
          feedSortType === item?.id &&
            S.activeFeedSortText,
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  ))}
</View>

  {sortedCrewPosts.length === 0 ? (
  <Text style={S.rankingEmptyText}>
    아직 이 크루에 공유된 기록이 없어요.
  </Text>
) : (
  <View style={S.feedCardList}>
  {displayedCrewPosts.map((post: any, index: number) => (
    <Pressable
  key={String(post?.id ?? index)}
  style={S.feedPostCard}
  onPress={() => setSelectedFeedPost(post)}
  onLongPress={() => setShowPostMenu(post)}
>
      <View style={S.feedPostHeader}>
        <Text style={S.feedPostEmoji}>
          {post?.profileEmoji ?? '🦊'}
        </Text>

        <View style={{ flex: 1 }}>
          <Text style={S.feedPostName}>
            {post?.nickname ?? '루트유저'}
          </Text>

          <Text style={S.feedPostDate}>
            {post?.date ?? ''}
          </Text>
        </View>

        <Text style={S.feedPostCategory}>
          {categories.find((c) => c.id === post?.category)?.icon ?? '✨'}
        </Text>
      </View>

      {(post?.photoUri || post?.photo_url) ? (
        <Image
          source={{ uri: post.photoUri ?? post.photo_url }}
          style={S.feedPostImage}
          resizeMode="cover"
        />
      ) : null}

      <Text style={S.feedPostTitle}>
        {post?.minutes ?? 0}분 {post?.title ?? '기록'}
      </Text>

      {post?.shareMemo ? (
        <Text style={S.feedPostMemo}>
          {post.shareMemo}
        </Text>
      ) : null}

      <View style={S.feedPostActionRow}>
        <Text style={S.feedPostActionText}>
          👏 {post?.cheers ?? 0}
        </Text>

        <Text style={S.feedPostActionText}>
          💬 {post?.comments?.length ?? 0}
        </Text>
      </View>
    </Pressable>
  ))}
</View>
)}
    {displayedCrewPosts.length < sortedCrewPosts.length ? (
    <Pressable
      style={S.moreFeedButton}
      onPress={() =>
        setFeedVisibleCount((prev) => prev + 10)
      }
    >
      <Text style={S.moreFeedText}>
        더 보기 {displayedCrewPosts.length} / {sortedCrewPosts.length}
      </Text>
    </Pressable>
  ) : null}
</View>

<View style={{ height: 80 }} />
    </ScrollView>

<Modal visible={showCrewManageModal} transparent animationType="slide">
  <KeyboardAvoidingView
    style={S.modalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View
  style={[
    S.modalBox,
    S.crewManageModalBox,
  ]}
>
      <View style={S.manageHeader}>
  <Text style={S.modalTitle}>⚙ 크루 관리</Text>

  <Pressable onPress={() => setShowCrewManageModal(false)}>
    <Text style={S.manageClose}>✕</Text>
  </Pressable>
</View>

<View style={S.manageGrid}>
      <Pressable
        style={S.manageButton}
        onPress={() => {
          setEditCrewTitle(selectedCrew?.title ?? '');
          setEditCrewDescription(selectedCrew?.description ?? '');
          setShowCrewManageModal(false);
          setShowEditCrewModal(true);
        }}
      >
        <Text style={S.manageButtonText}>이름/소개글 변경</Text>
      </Pressable>

      <Pressable
        style={S.manageButton}
        onPress={() => {
          setNoticeText(selectedCrew?.notice ?? '');
          setShowCrewManageModal(false);
          setShowNoticeModal(true);
        }}
      >
        <Text style={S.manageButtonText}>공지 변경</Text>
        </Pressable>

        <Pressable
  style={[
    S.manageButton,

    changingJoinType && {
      opacity: 0.55,
    },
  ]}
  disabled={
    changingJoinType
  }
  onPress={async () => {
    if (
      !selectedCrewId ||
      changingJoinType
    ) {
      return;
    }

    setChangingJoinType(
      true
    );

    try {
      const nextCrews =
        await toggleRootCrewJoinType(
          selectedCrewId
        );

      const updatedCrew =
        nextCrews.find(
          (
            crew:
              any
          ) =>
            String(
              crew?.id ??
                ''
            ) ===
            selectedCrewId
        );

      if (!updatedCrew) {
        throw new Error(
          'UPDATED_CREW_NOT_FOUND'
        );
      }

      setSelectedCrew(
        updatedCrew
      );

      setShowCrewManageModal(
        false
      );

      setTimeout(
        () => {
          setNoticeModal({
            title:
              '가입 방식 변경 완료',

            message:
              updatedCrew
                .joinType ===
              'approval'
                ? '승인가입으로 변경됐어요.'
                : '자유가입으로 변경됐어요.',
          });
        },
        150
      );
    } catch (
      error:
        any
    ) {
      console.log(
        'CREW JOIN TYPE CHANGE ERROR',
        {
          crewId:
            selectedCrewId,

          message:
            error?.message ??
            String(
              error
            ),
        }
      );

      setShowCrewManageModal(
        false
      );

      setTimeout(
        () => {
          setNoticeModal({
            title:
              '가입 방식 변경 실패',

            message:
              '가입 방식을 변경하지 못했어요. 잠시 후 다시 시도해 주세요.',
          });
        },
        150
      );
    } finally {
      setChangingJoinType(
        false
      );
    }
  }}
>
  <Text
    style={
      S.manageButtonText
    }
  >
    {changingJoinType
      ? '가입 방식 변경 중...'
      : `가입 방식 변경 · 현재 ${
          selectedCrew
            ?.joinType ===
          'approval'
            ? '승인가입'
            : '자유가입'
        }`}
  </Text>
</Pressable>

<Pressable
  style={S.manageButton}
  onPress={() => {
    setShowCrewManageModal(false);
    setShowJoinRequestManageModal(true);
  }}
>
  <Text style={S.manageButtonText}>
    가입 승인 목록
    {selectedCrewJoinRequests.length > 0
      ? ` (${selectedCrewJoinRequests.length})`
      : ''}
  </Text>
</Pressable>

<Pressable
  style={S.manageButton}
  onPress={() => {
    setShowCrewManageModal(false);

    router.push({
      pathname: '/crew-members',
      params: {
        id: selectedCrewId,
        transfer: '1',
      },
    });
  }}
>
  <Text style={S.manageButtonText}>
    크루장 위임
  </Text>
</Pressable>

<Pressable
  style={S.manageButton}
  onPress={() => {
    setShowCrewManageModal(false);
    setShowReportManageModal(true);
  }}
>
  <Text style={S.manageButtonText}>
    신고관리
  </Text>
</Pressable>

<Pressable
  style={S.dangerButton}
  onPress={() => {
    setShowCrewManageModal(false);

    if (currentMemberCount > 1) {
      setNoticeModal({
        title: '크루장 위임이 필요해요',
        message:
          '다른 멤버가 있는 크루는 바로 해체할 수 없어요.\n' +
          '크루장을 위임한 뒤 탈퇴하거나, 멤버가 모두 나간 뒤 해체해주세요.',
      });
      return;
    }

    setShowDeleteConfirmModal(true);
  }}
>
  <Text style={S.dangerButtonText}>
    크루 해체
  </Text>
</Pressable>

</View>
     
     </View>
  </KeyboardAvoidingView>
</Modal>

<Modal visible={!!profileUser} transparent animationType="fade">
  <View style={S.confirmOverlay}>
    <View style={S.profileModalBox}>
      <Text style={S.profileEmoji}>
        {profileUser?.profileEmoji ?? '🦊'}
      </Text>

<Text style={S.profileName}>
  {profileUser?.nickname ?? '루트유저'}
</Text>

      <Text style={S.profileSubText}>
  Lv.{profileUser?.level ?? 1}
</Text>

      <View style={S.profileStatsRow}>
  <View style={S.profileStatBox}>
    <Text style={S.profileStatLabel}>총 기록</Text>
    <Text style={S.profileStatValue}>
      {formatRankingTime(profileTotalMinutes)}
    </Text>
  </View>

  <View style={S.profileStatBox}>
    <Text style={S.profileStatLabel}>이번 주</Text>
    <Text style={S.profileStatValue}>
      {formatRankingTime(profileWeeklyMinutes)}
    </Text>
  </View>

  <View style={S.profileStatBox}>
  <Text style={S.profileStatLabel}>받은 응원</Text>
  <Text style={S.profileStatValue}>
    {profileSupportCount}회
  </Text>
</View>
</View>

{!isMyProfile ? (
  <>
    <Pressable
      style={[
        S.followButton,
        isFollowingProfileUser && S.followingButton,
      ]}
      onPress={async () => {
        if (!profileUserId) return;



        const wasFollowing = isFollowingProfileUser;

        const next = wasFollowing
          ? followingUserIds.filter((id) => id !== profileUserId)
          : [...followingUserIds, profileUserId];

        setFollowingUserIds(next);

        await AsyncStorage.setItem(
          FOLLOWING_CREW_USERS_KEY,
          JSON.stringify(next)
        );

        if (wasFollowing) {
  setNoticeModal({
    title: '팔로우 해제',
    message: '팔로잉 목록에서 해제되었어요.',
  });
}

        if (!wasFollowing) {
          await addRootCrewNotification({
  id: String(Date.now()),
  type: 'follow',
  userId,
  targetUserId: profileUserId,
  postId: profileUserId,
  message: `${userProfile?.nickname ?? '루트유저'}님이 회원님을 팔로우했어요.`,
  read: false,
  createdAt: new Date().toISOString(),
});
          setNoticeModal({
  title: '팔로우 완료',
  message: '이 유저의 기록을 팔로잉 피드에서 볼 수 있어요.',
});
        }
      }}
    >
      <Text
        style={[
          S.followButtonText,
          isFollowingProfileUser && S.followingButtonText,
        ]}
      >
        {isFollowingProfileUser ? '팔로잉' : '팔로우'}
      </Text>
    </Pressable>

    <Pressable
      style={[
  S.supportButton,
  alreadySupportedToday &&
    S.supportedButton,
]}
      onPress={async () => {
        if (!profileUserId) return;

         if (alreadySupportedToday) {
    setNoticeModal({
      title: '이미 응원했어요',
      message: '같은 유저는 하루에 한 번만 응원할 수 있어요.',
    });
    return;
  }

        await addRootCrewNotification({
  id: String(Date.now()),
  type: 'support',
  userId,
  targetUserId: profileUserId,
  postId: profileUserId,
  message: `${userProfile?.nickname ?? '루트유저'}님이 회원님을 응원했어요.`,
  read: false,
  createdAt: new Date().toISOString(),
});

const todayKey =
  new Date().toISOString().slice(0, 10);

const nextSupported = [
  ...supportedUsersToday,
  profileUserId,
];

setSupportedUsersToday(nextSupported);

const savedSupportHistory =
  await AsyncStorage.getItem(
    CREW_SUPPORT_HISTORY_KEY
  );

const supportHistory =
  savedSupportHistory
    ? JSON.parse(savedSupportHistory)
    : {};

supportHistory[todayKey] =
  nextSupported;

await AsyncStorage.setItem(
  CREW_SUPPORT_HISTORY_KEY,
  JSON.stringify(supportHistory)
);


        setNoticeModal({
  title: '응원 완료',
  message: '따뜻한 응원이 전달되었어요.',
});
      }}
    >
      <Text style={S.supportButtonText}>
        {alreadySupportedToday
  ? '오늘 응원 완료'
  : '응원하기'}
      </Text>
    </Pressable>
  </>
) : null}

<Pressable
  style={S.visitVillageButton}
  onPress={() => {
    router.push({
  pathname: '/friend-village',
  params: {
    userId: profileUser?.userId ?? profileUser?.id ?? '',
    nickname: profileUser?.nickname ?? '루트유저',
    profileEmoji: profileUser?.profileEmoji ?? '🦊',
    placedBuildings: JSON.stringify(
      profileUser?.placedBuildings ?? []
    ),
  },
});

setProfileUser(null);
  }}
>
  <Text style={S.visitVillageButtonText}>
    🏠 마을 방문하기
  </Text>
</Pressable>

      <Pressable
        style={S.cancelButton}
        onPress={() => setProfileUser(null)}
      >
        <Text style={S.cancelText}>닫기</Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal visible={showNotificationModal} transparent animationType="slide">
  <View style={S.confirmOverlay}>
    <View style={S.reportModalBox}>
      <Text style={S.modalTitle}>🔔 알림</Text>

<View style={S.notificationActionRow}>
  <Pressable
  style={S.notificationSmallButton}
  onPress={async () => {
    const nextNotifications =
      await markAllRootCrewNotificationsRead();

    setCrewNotifications(nextNotifications);
  }}
>
  <Text style={S.notificationSmallButtonText}>
    모두 읽음
  </Text>
</Pressable>

  <Pressable
    style={S.notificationSmallDangerButton}
    onPress={() => {
  setShowDeleteAllNotificationsConfirm(true);
}}
  >
    <Text style={S.notificationSmallDangerText}>
      모두 삭제
    </Text>
  </Pressable>
</View>

      {crewNotifications.length === 0 ? (
        <Text style={S.confirmText}>
          아직 받은 알림이 없어요.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 420 }}>
          {crewNotifications.filter(Boolean).map((item: any, index: number) => (
  <Pressable
    key={String(item?.id ?? index)}
              style={S.notificationItem}
              onPress={async () => {
  const nextNotifications =
    await markRootCrewNotificationRead(String(item?.id));

  setCrewNotifications(nextNotifications);
  setShowNotificationModal(false);

  const targetPost = crewPosts.find(
    (post: any) =>
      String(post.id) === String(item.postId)
  );

  if (targetPost) {
    setSelectedFeedPost(targetPost);
  }
}}
            >
              <Text
  style={S.notificationMessage}
  numberOfLines={2}
  ellipsizeMode="tail"
>
  {item.type === 'notice'
    ? '📌 ' + item.message
    : item.type === 'goal'
    ? '🎯 ' + item.message
    : item.type === 'memberLeft'
    ? '🚪 ' + item.message
    : item.type === 'support'
    ? '👏 ' + item.message
    : item.type === 'follow'
    ? '❤️ ' + item.message
    : item.type === 'joinRequest'
    ? '🙋 ' + item.message
    : item.type === 'joinApproved'
    ? '✅ ' + item.message
    : item.type === 'joinRejected'
    ? '❌ ' + item.message
    : '💬 ' + item.message}
</Text>

              <Text style={S.notificationDate}>
                {String(item.createdAt ?? '').slice(0, 10)}
              </Text>

<Pressable
  style={S.notificationDeleteButton}
  onPress={(event) => {
    event.stopPropagation();
    setDeleteNotificationTarget(item);
  }}
>
  <Text style={S.notificationDeleteText}>
    삭제
  </Text>
</Pressable>

            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable
        style={S.noticeOkButton}
        onPress={() => setShowNotificationModal(false)}
      >
        <Text style={S.noticeOkText}>확인</Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal visible={!!deleteNotificationTarget} transparent animationType="fade">
  <View style={S.confirmOverlay}>
    <View style={S.confirmBox}>
      <Text style={S.confirmTitle}>알림 삭제</Text>

      <Text style={S.confirmText}>
        이 알림을 삭제할까요?
      </Text>

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
          onPress={() => setDeleteNotificationTarget(null)}
        >
          <Text style={S.cancelText}>취소</Text>
        </Pressable>

        <Pressable
          style={S.dangerButton}
          onPress={async () => {
            const nextNotifications =
              await deleteRootCrewNotification(String(deleteNotificationTarget?.id ?? ''));

            setCrewNotifications(nextNotifications);
            setDeleteNotificationTarget(null);
          }}
        >
          <Text style={S.dangerButtonText}>삭제</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal visible={showDeleteAllNotificationsConfirm} transparent animationType="fade">
  <View style={S.confirmOverlay}>
    <View style={S.confirmBox}>
      <Text style={S.confirmTitle}>모든 알림 삭제</Text>

      <Text style={S.confirmText}>
        모든 알림을 삭제할까요? 삭제 후에는 되돌릴 수 없어요.
      </Text>

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
          onPress={() => setShowDeleteAllNotificationsConfirm(false)}
        >
          <Text style={S.cancelText}>취소</Text>
        </Pressable>

        <Pressable
          style={S.dangerButton}
          onPress={async () => {
            const nextNotifications =
              await deleteAllRootCrewNotifications();

            setCrewNotifications(nextNotifications);
            setShowDeleteAllNotificationsConfirm(false);
          }}
        >
          <Text style={S.dangerButtonText}>모두 삭제</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal visible={!!noticeModal} transparent animationType="fade">
  <View style={S.confirmOverlay}>
    <View style={S.noticeModalBox}>
      <Text style={S.noticeModalIcon}>🦊</Text>

      <Text style={S.noticeModalTitle}>
        {noticeModal?.title}
      </Text>

      <Text style={S.noticeModalMessage}>
        {noticeModal?.message}
      </Text>

      <Pressable
  style={S.noticeOkButton}
  onPress={() => setNoticeModal(null)}
>
  <Text style={S.noticeOkText}>확인</Text>
</Pressable>
    </View>
  </View>
</Modal>

<Modal visible={!!selectedFeedPost} transparent animationType="fade">
  <View style={S.feedDetailOverlay}>
    <View style={S.feedDetailBox}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={S.feedTop}>
          <Pressable
            style={S.feedProfilePress}
            onPress={() => {
              setProfileUser(selectedFeedPost);
              setSelectedFeedPost(null);
            }}
          >
            <Text style={S.feedAvatar}>
              {selectedFeedPost?.profileEmoji ?? '🦊'}
            </Text>

            <View style={{ flex: 1 }}>
              <Text style={S.feedUser}>
                {selectedFeedPost?.nickname ?? '루트유저'}
              </Text>

              <Text style={S.feedTitle}>
                {selectedFeedPost?.title}
              </Text>
            </View>
          </Pressable>

          <Text style={S.feedCategory}>
            {categories.find((c) => c.id === selectedFeedPost?.category)?.label ?? '기록'}
          </Text>
        </View>

        <Text style={S.feedMinutes}>
          {selectedFeedPost?.minutes ?? 0}분
        </Text>

        {selectedFeedPost?.shareMemo ? (
          <Text style={S.feedMemo}>
            “{selectedFeedPost.shareMemo}”
          </Text>
        ) : null}

        {selectedFeedPost?.photoUri || selectedFeedPost?.photo_url ? (
          <Image
            source={{
              uri: selectedFeedPost.photoUri ?? selectedFeedPost.photo_url,
            }}
            style={S.feedDetailImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={S.feedActionRow}>
          <Pressable
            onPress={() => {
              setCommentPost(selectedFeedPost);
              setSelectedFeedPost(null);
            }}
          >
            <Text style={S.feedActionText}>
              💬 댓글 {selectedFeedPost?.comments?.length ?? 0}
            </Text>
          </Pressable>

          <Pressable
            style={[
              S.cheerButton,
              selectedFeedPost?.cheered && S.activeCheerButton,
            ]}
            onPress={async () => {
              if (!selectedFeedPost?.id) return;

              const nextPosts = await toggleRootCrewPostCheer(
                selectedFeedPost.id
              );

              setCrewPosts([...nextPosts]);

              const updatedPost = nextPosts.find(
                (post: any) =>
                  String(post?.id ?? '') ===
                  String(selectedFeedPost?.id ?? '')
              );

              setSelectedFeedPost(updatedPost ?? selectedFeedPost);
            }}
          >
            <Text
              style={[
                S.cheerButtonText,
                selectedFeedPost?.cheered &&
                  S.activeCheerButtonText,
              ]}
            >
              👏 응원 {selectedFeedPost?.cheers ?? 0}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={S.cancelButton}
          onPress={() => setSelectedFeedPost(null)}
        >
          <Text style={S.cancelText}>닫기</Text>
        </Pressable>
      </ScrollView>
    </View>
  </View>
</Modal>

<Modal visible={!!commentPost} transparent animationType="slide">
  <KeyboardAvoidingView
    style={S.modalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View
  style={[
    S.modalBox,
    S.editCrewModalBox,
  ]}
>
      <Text style={S.modalTitle}>💬 댓글</Text>

      <ScrollView style={S.commentList}>
        {commentPost?.comments?.length ? (
          commentPost.comments.filter(Boolean).map((comment: any, index: number) => (
<View
  key={String(
    comment?.id ?? index
  )}
  style={S.commentItem}
>
  <Text
    style={
      S.commentNicknameText
    }
    numberOfLines={1}
  >
    {comment?.nickname ??
      '루트유저'}
  </Text>

  <Text
    style={
      S.commentBodyText
    }
    numberOfLines={2}
    ellipsizeMode="tail"
  >
    {String(
      comment?.text ?? ''
    )}
  </Text>
</View>
          ))
        ) : (
          <Text style={S.emptyCommentText}>
            아직 댓글이 없어요.
          </Text>
        )}
      </ScrollView>

      <TextInput
        value={commentText}
        onChangeText={setCommentText}
        placeholder="댓글을 입력하세요."
        placeholderTextColor={theme.subText}
        style={S.input}
      />

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
          onPress={() => {
            setCommentPost(null);
            setCommentText('');
          }}
        >
          <Text style={S.cancelText}>닫기</Text>
        </Pressable>

        <Pressable
          style={S.submitButton}
          onPress={() => {
  const targetPost =
    commentPost;

  const nextCommentText =
    commentText.trim();

  if (
    !targetPost ||
    !nextCommentText
  ) {
    return;
  }

  const targetPostId =
    String(
      targetPost?.id ?? ''
    );

  if (!targetPostId) {
    return;
  }

  const targetUserId =
    String(
      targetPost?.userId ??
        ''
    );

  const commentCreatedAt =
    new Date()
      .toISOString();

  /*
   * 서버 저장을 기다리지 않고
   * 댓글 창에 먼저 보여줄 댓글입니다.
   */
  const optimisticComment = {
    id:
      `local-${Date.now()}`,

    text:
      nextCommentText,

    nickname:
      userProfile?.nickname ??
      '루트유저',

    profileEmoji:
      userProfile
        ?.profileEmoji ??
      '🦊',

    createdAt:
      commentCreatedAt,
  };

  const previousComments =
    Array.isArray(
      targetPost?.comments
    )
      ? targetPost.comments
      : [];

  const optimisticPost = {
    ...targetPost,

    comments: [
      ...previousComments,
      optimisticComment,
    ],
  };

  /*
   * 댓글 창과 뒤쪽 피드에
   * 즉시 반영합니다.
   */
  setCommentPost(
    optimisticPost
  );

  setCrewPosts(
    (prevPosts) =>
      prevPosts.map(
        (post: any) =>
          String(
            post?.id ?? ''
          ) ===
          targetPostId
            ? optimisticPost
            : post
      )
  );

  setCommentText('');

  /*
   * 실제 로컬·Firestore 저장은
   * 화면 반영 후 진행합니다.
   */
  addRootCrewPostComment(
    targetPostId,

    nextCommentText,

    userProfile?.nickname ??
      '루트유저',

    userProfile
      ?.profileEmoji ??
      '🦊'
  )
    .then(
      (nextPosts) => {
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
         * 사용자가 아직 같은 댓글 창을
         * 보고 있을 때만 실제 저장 결과로 교체합니다.
         */
        setCommentPost(
          (
            currentPost: any
          ) =>
            String(
              currentPost
                ?.id ?? ''
            ) ===
            targetPostId
              ? updatedPost ??
                currentPost
              : currentPost
        );

        /*
         * 내 게시글에는 댓글 알림을
         * 보내지 않습니다.
         */
        if (
          targetUserId &&
          targetUserId !==
            String(userId)
        ) {
          addRootCrewNotification({
            id:
              String(
                Date.now()
              ),

            type:
              'comment',

            userId,

            targetUserId,

            postId:
              targetPostId,

            message:
              `${targetPost?.title ?? '기록'} 기록에 새 댓글이 달렸어요.`,

            read:
              false,

            createdAt:
              new Date()
                .toISOString(),
          }).catch(
            (
              error: any
            ) => {
              console.log(
                'CREW COMMENT NOTIFICATION ERROR',
                {
                  postId:
                    targetPostId,

                  message:
                    error
                      ?.message ??
                    String(
                      error
                    ),
                }
              );
            }
          );
        }
      }
    )
    .catch(
      (
        error: any
      ) => {
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

        setNoticeModal({
          title:
            '댓글 저장 확인',

          message:
            '댓글은 화면에 표시했지만 서버 저장이 지연되고 있어요.\n네트워크 연결을 확인해주세요.',
        });
      }
    );
}}
        >
          <Text style={S.submitText}>등록</Text>
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal visible={!!showPostMenu} transparent animationType="fade">
  <View style={S.modalOverlay}>
    <View
  style={[
    S.modalBox,
    S.editCrewModalBox,
  ]}
>

      <Text style={S.modalTitle}>
        게시글 메뉴
      </Text>

      <Pressable
        style={S.manageButton}
        onPress={() => {
          const targetPostId = String(showPostMenu?.id ?? '');
if (!targetPostId) return;

          const next = hiddenPostIds.includes(targetPostId)
            ? hiddenPostIds
            : [...hiddenPostIds, targetPostId];

          setHiddenPostIds(next);

          AsyncStorage.setItem(
            HIDDEN_CREW_POSTS_KEY,
            JSON.stringify(next)
          );

          setShowPostMenu(null);
          setNoticeModal({
  title: '게시글 숨김',
  message: '이 게시글이 피드에서 숨겨졌어요.',
});
        }}
      >
        <Text style={S.manageButtonText}>
          🚫 게시글 숨기기
        </Text>
      </Pressable>

      <Pressable
        style={S.dangerButton}
        onPress={() => {
          setReportPost(showPostMenu);
          setReportReason('');
          setReportDetail('');
          setShowPostMenu(null);
        }}
      >
        <Text style={S.dangerButtonText}>
          🚨 게시글 신고
        </Text>
      </Pressable>

      <Pressable
        style={S.cancelButton}
        onPress={() => setShowPostMenu(null)}
      >
        <Text style={S.cancelText}>
          취소
        </Text>
      </Pressable>

    </View>
  </View>
</Modal>

<Modal visible={!!reportPost} transparent animationType="slide">
  <KeyboardAvoidingView
    style={S.modalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View
  style={[
    S.modalBox,
    S.editCrewModalBox,
  ]}
>

      <Text style={S.modalTitle}>
        🚨 게시글 신고
      </Text>

      <View style={S.reportReasonGrid}>
        {reportReasons.map((reason) => (
          <Pressable
            key={reason}
            style={[
              S.reportReasonButton,
              reportReason === reason &&
                S.activeReportReasonButton,
            ]}
            onPress={() => setReportReason(reason)}
          >
            <Text
              style={[
                S.reportReasonText,
                reportReason === reason &&
                  S.activeReportReasonText,
              ]}
            >
              {reason}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={reportDetail}
        onChangeText={setReportDetail}
        placeholder="신고 내용을 입력해주세요."
        placeholderTextColor={theme.subText}
        style={[S.input, S.textArea]}
        multiline
      />

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
         onPress={() => {
  setReportPost(null);
  setReportReason('');
  setReportDetail('');
}}
        >
          <Text style={S.cancelText}>
            취소
          </Text>
        </Pressable>

        <Pressable
          style={S.dangerButton}
          onPress={async () => {
            if (!reportPost) return;

            if (!reportReason) return;

                        const newReport = {
  id: String(Date.now()),
  crewId: selectedCrewId,
  postId: reportPost.id,
  postTitle: reportPost.title,
  targetNickname: reportPost.nickname ?? '루트유저',
  reporterId: userId,
  reason: reportReason,
  detail: reportDetail.trim(),
  createdAt: new Date().toISOString(),
};

const nextReports = await addRootCrewReport(newReport);

setCrewReports(nextReports);

setReportPost(null);
            setReportReason('');
            setReportDetail('');
            setNoticeModal({
  title: '신고 완료',
  message: '운영진에게 신고가 접수되었습니다.',
});
          }}
        >
          <Text style={S.dangerButtonText}>
            신고하기
          </Text>
        </Pressable>
      </View>

    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal visible={showJoinRequestManageModal} transparent animationType="slide">
  <View style={S.confirmOverlay}>
    <View style={S.reportModalBox}>
      <Text style={S.modalTitle}>👥 가입 승인 목록</Text>

      {selectedCrewJoinRequests.length === 0 ? (
        <Text style={S.confirmText}>
          아직 가입 신청이 없어요.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 420 }}>
          {selectedCrewJoinRequests.filter(Boolean).map((request: any, index: number) => (
  <View key={String(request?.id ?? index)} style={S.joinRequestManageItem}>
              <Text style={S.joinRequestEmoji}>
                {request.profileEmoji ?? '🦊'}
              </Text>

              <View style={{ flex: 1 }}>
                <Text style={S.joinRequestName}>
                  {request.nickname ?? '루트유저'}
                </Text>

                <Text style={S.joinRequestSub}>
                  크루 가입을 신청했어요.
                </Text>
              </View>

              <View style={S.joinRequestActionRow}>
                <Pressable
                  style={S.approveButton}
                  onPress={async () => {
                    const nextRequests =
  await approveRootCrewJoinRequest(
    request?.id
  );

                    const nextCrews = await loadRootCrews();

                    const updatedCrew = nextCrews.find(
                      (crew: any) =>
                        String(crew.id) === selectedCrewId
                    );

                    setJoinRequests(nextRequests);
                    setSelectedCrew(updatedCrew ?? selectedCrew);

                    await addRootCrewNotification({
  id: String(Date.now()),
 type: 'joinApproved',
  userId,
  targetUserId: request.userId,
  postId: selectedCrewId,
  message: `${selectedCrew?.title ?? '크루'} 가입이 승인되었어요.`,
  read: false,
  createdAt: new Date().toISOString(),
});
                    setNoticeModal({
  title: '가입 승인',
  message: '가입 신청을 승인했습니다.',
});
                  }}
                >
                  <Text style={S.approveText}>승인</Text>
                </Pressable>

                <Pressable
                  style={S.rejectButton}
                  onPress={async () => {
                    const nextRequests =
  await rejectRootCrewJoinRequest(
    request?.id
  );

                    setJoinRequests(nextRequests);
                    await addRootCrewNotification({
  id: String(Date.now()),
 type: 'joinRejected',
  userId,
  targetUserId: request.userId,
  postId: selectedCrewId,
  message: `${selectedCrew?.title ?? '크루'} 가입 신청이 거절되었어요.`,
  read: false,
  createdAt: new Date().toISOString(),
});
                    setNoticeModal({
  title: '가입 거절',
  message: '가입 신청을 거절했습니다.',
});
                  }}
                >
                  <Text style={S.rejectText}>거절</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
        style={S.noticeOkButton}
        onPress={() => setShowJoinRequestManageModal(false)}
      >
        <Text style={S.noticeOkText}>확인</Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal visible={showReportManageModal} transparent animationType="slide">
  <View style={S.confirmOverlay}>
    <View style={S.reportModalBox}>
      <Text style={S.modalTitle}>🚨 신고 목록</Text>

      {selectedCrewReports.length === 0 ? (
        <Text style={S.confirmText}>
          아직 접수된 신고가 없어요.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 420 }}>
          {selectedCrewReports.filter(Boolean).map((report: any, index: number) => (
  <View key={String(report?.id ?? index)} style={S.reportItem}>
              <Text style={S.reportTitle}>
                {report.postTitle ?? '제목 없는 기록'}
              </Text>

              <Text style={S.reportText}>
                대상: {report.targetNickname ?? '루트유저'}
              </Text>

              <Text style={S.reportText}>
                사유: {report.reason}
              </Text>

              {report.detail ? (
                <Text style={S.reportText}>
                  내용: {report.detail}
                </Text>
              ) : null}

              <View style={S.reportButtonRow}>
                <Pressable
                  style={S.reportDeleteButton}
                 onPress={async () => {
  const targetPostId = String(report.postId);

  const nextHiddenPostIds = hiddenPostIds.includes(targetPostId)
    ? hiddenPostIds
    : [...hiddenPostIds, targetPostId];

  setHiddenPostIds(nextHiddenPostIds);

  await AsyncStorage.setItem(
    HIDDEN_CREW_POSTS_KEY,
    JSON.stringify(nextHiddenPostIds)
  );
await hideRootCrewPost(report.postId);

  const nextReports = await updateRootCrewReportStatus(
    report?.id,
    'hidden'
  );

  setCrewReports(nextReports);

  setNoticeModal({
    title: '숨김 완료',
    message: '게시글이 피드에서 숨겨졌습니다.',
  });
}}
                >
                  <Text style={S.reportDeleteText}>
                    피드에서 숨기기
                  </Text>
                </Pressable>

                <Pressable
                  style={S.reportDoneButton}
                  onPress={async () => {
  const nextReports = await updateRootCrewReportStatus(
    report?.id,
    'checked'
  );

  setCrewReports(nextReports);

  setNoticeModal({
    title: '처리 완료',
    message: '신고 처리가 완료되었습니다.',
  });
}}
                >
                  <Text style={S.reportDoneText}>
                    처리 완료
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
  style={S.noticeOkButton}
  onPress={() => setShowReportManageModal(false)}
>
  <Text style={S.noticeOkText}>
    확인
  </Text>
</Pressable>
    </View>
  </View>
</Modal>

<Modal visible={showEditCrewModal} transparent animationType="slide">
  <KeyboardAvoidingView
    style={S.modalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View
  style={[
    S.modalBox,
    S.editCrewModalBox,
  ]}
>
      <Text style={S.modalTitle}>✏️ 크루 정보 수정</Text>

      <TextInput
        value={editCrewTitle}
        onChangeText={setEditCrewTitle}
        placeholder="크루 이름"
        placeholderTextColor={theme.subText}
        style={S.input}
        maxLength={10}
      />

      <TextInput
        value={editCrewDescription}
        onChangeText={setEditCrewDescription}
        placeholder="크루 소개글"
        placeholderTextColor={theme.subText}
        style={[S.input, S.textArea]}
        multiline
      />

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
          onPress={() => setShowEditCrewModal(false)}
        >
          <Text style={S.cancelText}>취소</Text>
        </Pressable>

        <Pressable
          style={S.submitButton}
          onPress={async () => {
  if (!selectedCrew) {
    return;
  }

  const nextTitle =
    editCrewTitle.trim();

  const nextDescription =
    editCrewDescription.trim();

  if (
    nextTitle.length < 2
  ) {
    setNoticeModal({
      title:
        '크루 이름 확인',

      message:
        '크루 이름은 2글자 이상 입력해주세요.',
    });

    return;
  }

  try {
    const nextCrews =
      await updateRootCrew(
        selectedCrewId,
        {
          title:
            nextTitle,

          description:
            nextDescription,
        }
      );

    const updatedCrew =
      nextCrews.find(
        (
          crew:
            any
        ) =>
          String(
            crew?.id ?? ''
          ) ===
          selectedCrewId
      );

    setSelectedCrew(
      updatedCrew ??
        selectedCrew
    );

    setShowEditCrewModal(
      false
    );

    setNoticeModal({
      title:
        '수정 완료',

      message:
        '크루 정보가 수정됐어요.',
    });
  } catch (
    error:
      any
  ) {
    console.log(
      'CREW INFO UPDATE ERROR',
      {
        crewId:
          selectedCrewId,

        message:
          error?.message ??
          String(error),
      }
    );

    setNoticeModal({
      title:
        '수정 실패',

      message:
        '크루 정보를 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
    });
  }
}}
        >
          <Text style={S.submitText}>저장</Text>
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal visible={showLeaveCrewModal} transparent animationType="fade">
  <View style={S.confirmOverlay}>
    <View style={S.confirmBox}>
      <Text style={S.confirmTitle}>
        크루에서 탈퇴할까요?
      </Text>

      <Text style={S.confirmText}>
        {selectedCrew?.title ?? '이 크루'}에서 탈퇴합니다.{'\n'}
        기존에 공유한 기록은 크루 피드에 그대로 남습니다.
      </Text>

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
          disabled={leavingCrew}
          onPress={() => setShowLeaveCrewModal(false)}
        >
          <Text style={S.cancelText}>취소</Text>
        </Pressable>

        <Pressable
          style={S.deleteConfirmButton}
          disabled={leavingCrew}
          onPress={async () => {
            try {
              setLeavingCrew(true);

              await leaveRootCrew(
                selectedCrewId,
                userId
              );

              setShowLeaveCrewModal(false);

              router.replace('/(tabs)/crew');
            } catch (error: any) {
              const errorCode =
                String(error?.message ?? '');

              setShowLeaveCrewModal(false);

              setNoticeModal({
                title: '탈퇴하지 못했어요',
                message:
                  errorCode === 'OWNER_CANNOT_LEAVE'
                    ? '크루장은 먼저 다른 멤버에게 크루장을 위임해야 해요.'
                    : '크루 탈퇴 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.',
              });
            } finally {
              setLeavingCrew(false);
            }
          }}
        >
          <Text style={S.deleteConfirmText}>
            {leavingCrew ? '탈퇴 중' : '탈퇴'}
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal visible={showDeleteConfirmModal} transparent animationType="fade">
  <View style={S.confirmOverlay}>
    <View style={S.confirmBox}>
      <Text style={S.confirmTitle}>
        크루 해체
      </Text>

      {selectedCrew?.deleteRequestedAt ? (
        <>
          <Text style={S.confirmText}>
            해체 대기 중입니다.{'\n'}
{getDeleteRemainText()}
          </Text>

          <View style={S.modalButtonRow}>
            <Pressable
              style={S.cancelButton}
              onPress={async () => {
                const nextCrews = await updateRootCrew(selectedCrewId, {
                  deleteRequestedAt: null,
                });

                const updatedCrew = nextCrews.find(
                  (crew: any) =>
                    String(crew?.id ?? '') === selectedCrewId
                );

                setSelectedCrew(updatedCrew ?? {
                  ...selectedCrew,
                  deleteRequestedAt: null,
                });

                setShowDeleteConfirmModal(false);

                setNoticeModal({
                  title: '해체 취소',
                  message: '크루 해체 요청이 취소되었어요.',
                });
              }}
            >
              <Text style={S.cancelText}>해체 취소</Text>
            </Pressable>

            <Pressable
              style={S.deleteConfirmButton}
              onPress={async () => {
                const requestedAt = new Date(
                  selectedCrew.deleteRequestedAt
                ).getTime();

                const after48Hours =
                  Date.now() - requestedAt >=
                  48 * 60 * 60 * 1000;

                if (!after48Hours) {
                  setNoticeModal({
                    title: '아직 해체할 수 없어요',
                    message: '해체 요청 후 48시간이 지나야 최종 해체할 수 있어요.',
                  });
                  return;
                }

                try {
                  await deleteRootCrew(selectedCrewId);
                  setShowDeleteConfirmModal(false);
                  router.replace('/(tabs)/crew');
                } catch (error: any) {
                  const errorCode =
                    String(error?.message ?? '');

                  setShowDeleteConfirmModal(false);

                  setNoticeModal({
                    title: '크루를 해체하지 못했어요',
                    message:
                      errorCode === 'CREW_HAS_MEMBERS'
                        ? '다른 멤버가 남아 있어요. 크루장을 위임하거나 멤버가 모두 나간 뒤 다시 진행해주세요.'
                        : errorCode === 'DELETE_WAIT'
                        ? '해체 요청 후 48시간이 지나야 최종 해체할 수 있어요.'
                        : '크루 해체 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.',
                  });
                }
              }}
            >
              <Text style={S.deleteConfirmText}>
                최종 해체
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={S.confirmText}>
            해체 요청 후 48시간 동안 취소할 수 있어요.{'\n'}
그동안은 언제든 해체 요청을 취소할 수 있습니다.
          </Text>

          <View style={S.modalButtonRow}>
            <Pressable
              style={S.cancelButton}
              onPress={() => setShowDeleteConfirmModal(false)}
            >
              <Text style={S.cancelText}>취소</Text>
            </Pressable>

            <Pressable
              style={S.deleteConfirmButton}
              onPress={async () => {
                const deleteRequestedAt = new Date().toISOString();

                const nextCrews = await updateRootCrew(selectedCrewId, {
                  deleteRequestedAt,
                });

                const updatedCrew = nextCrews.find(
                  (crew: any) =>
                    String(crew?.id ?? '') === selectedCrewId
                );

                setSelectedCrew(updatedCrew ?? {
                  ...selectedCrew,
                  deleteRequestedAt,
                });

                setShowDeleteConfirmModal(false);

                setNoticeModal({
                  title: '해체 요청 완료',
                  message: '48시간 동안 해체 요청을 취소할 수 있어요.',
                });
              }}
            >
              <Text style={S.deleteConfirmText}>
                해체 요청
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  </View>
</Modal>

<Modal visible={showNoticeModal} transparent animationType="slide">
  <KeyboardAvoidingView
    style={S.modalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View
  style={[
    S.modalBox,
    S.editCrewModalBox,
  ]}
>
      <Text style={S.modalTitle}>📌 고정 공지 수정</Text>

      <TextInput
        value={noticeText}
        onChangeText={setNoticeText}
        placeholder="예: 이번 주는 하루 30분 이상 기록하기!"
        placeholderTextColor={theme.subText}
        style={[S.input, S.textArea]}
        multiline
      />

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
          onPress={() => setShowNoticeModal(false)}
        >
          <Text style={S.cancelText}>취소</Text>
        </Pressable>

        <Pressable
          style={S.submitButton}
          onPress={async () => {
  if (!selectedCrew) {
    return;
  }

  const nextNotice =
    noticeText.trim();

  try {
    const nextCrews =
      await updateRootCrewNotice(
        selectedCrewId,
        nextNotice
      );

    const updatedCrew =
      nextCrews.find(
        (crew: any) =>
          String(
            crew?.id ?? ''
          ) ===
          selectedCrewId
      );

    setSelectedCrew(
      updatedCrew ??
        selectedCrew
    );

    setShowNoticeModal(
      false
    );

    setNoticeText('');

    setNoticeModal({
      title:
        '공지 저장 완료',

      message:
        '공지사항이 변경됐어요.',
    });

    /*
     * 공지 저장은 완료됐으므로
     * 멤버 알림은 뒤에서 순서대로 저장합니다.
     */
    const targetMemberIds =
      (
        selectedCrew
          .memberIds ??
        []
      )
        .map(
          (
            memberId:
              string
          ) =>
            String(
              memberId
            )
        )
        .filter(
          (
            memberId:
              string
          ) =>
            memberId !==
            String(
              userId
            )
        );

    const notificationBaseId =
      Date.now();

    void (
      async () => {
        let failedCount =
          0;

        for (
          let index = 0;
          index <
          targetMemberIds.length;
          index += 1
        ) {
          const memberId =
            targetMemberIds[
              index
            ];

          try {
            await addRootCrewNotification({
              id:
                `${notificationBaseId}-` +
                `${index}-` +
                `${memberId}`,

              type:
                'notice',

              userId:
                String(
                  userId
                ),

              targetUserId:
                memberId,

              postId:
                selectedCrewId,

              message:
                `${
                  updatedCrew
                    ?.title ??
                  selectedCrew
                    ?.title ??
                  '크루'
                } 공지가 변경됐어요.`,

              read:
                false,

              createdAt:
                new Date()
                  .toISOString(),
            });
          } catch (
            notificationError:
              any
          ) {
            failedCount +=
              1;

            console.log(
              'CREW NOTICE NOTIFICATION SAVE ERROR',
              {
                memberId,

                message:
                  notificationError
                    ?.message ??
                  String(
                    notificationError
                  ),
              }
            );
          }
        }

        if (
          failedCount > 0
        ) {
          console.log(
            'CREW NOTICE NOTIFICATION PARTIAL ERROR',
            {
              failedCount,

              totalCount:
                targetMemberIds
                  .length,
            }
          );
        }
      }
    )();
  } catch (
    error:
      any
  ) {
    console.log(
      'CREW NOTICE UPDATE ERROR',
      {
        crewId:
          selectedCrewId,

        message:
          error?.message ??
          String(
            error
          ),
      }
    );

    setNoticeModal({
      title:
        '공지 저장 실패',

      message:
        '공지사항을 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
    });
  }
}}
        >
          <Text style={S.submitText}>저장</Text>
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal visible={showGoalModal} transparent animationType="slide">
  <KeyboardAvoidingView
    style={S.modalOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View
  style={[
    S.modalBox,
    S.editCrewModalBox,
  ]}
>
      <Text style={S.modalTitle}>🎯 크루 목표 설정</Text>

      <TextInput
        value={goalHoursText}
        onChangeText={setGoalHoursText}
        placeholder="예: 500"
        placeholderTextColor={theme.subText}
        style={S.input}
        keyboardType="number-pad"
      />

      <Text style={S.helpText}>
        모든 크루원이 공유한 시간이 합산되어 목표에 반영돼요.
      </Text>

      <View style={S.modalButtonRow}>
        <Pressable
          style={S.cancelButton}
          onPress={() => setShowGoalModal(false)}
        >
          <Text style={S.cancelText}>취소</Text>
        </Pressable>

        <Pressable
          style={S.submitButton}
          onPress={async () => {
            if (!selectedCrew) return;

            const goalHours = Number(goalHoursText);

            if (!goalHours || goalHours <= 0) return;

            const nextCrews = await updateRootCrew(selectedCrewId, {
              goalHours,
              goalUpdatedAt: new Date().toISOString(),
            });

            const updatedCrew = nextCrews.find(
              (crew: any) => String(crew?.id ?? '') === selectedCrewId
            );

            setSelectedCrew(updatedCrew ?? selectedCrew);
            setShowGoalModal(false);
            setGoalHoursText('');

await Promise.all(
  (selectedCrew.memberIds ?? [])
    .filter((memberId: string) => memberId !== userId)
    .map((memberId: string) =>
      addRootCrewNotification({
        id: `${Date.now()}-goal-${memberId}`,
       type: 'goal',
        userId,
        targetUserId: memberId,
        postId: selectedCrewId,
        message: `${selectedCrew?.title ?? '크루'} 목표가 변경되었어요.`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    )
);

            setNoticeModal({
  title: '목표 저장',
  message: '이번 달 크루 목표가 변경되었습니다.',
});
          }}
        >
          <Text style={S.submitText}>저장</Text>
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>
 </>
      );
      
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5e9cf', paddingHorizontal: 22, paddingTop: 54 },
  backText: { fontSize: 16, fontWeight: '900', color: '#8a5a24', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '900', color: '#6b3514', marginTop: 40 },
  crewIcon: { fontSize: 58, marginBottom: 16 },
  crewTitle: { fontSize: 42, fontWeight: '900', color: '#5f2f12' },
  crewMeta: { marginTop: 10, fontSize: 18, fontWeight: '900', color: '#8a6a3a' },
  infoBox: { marginTop: 24, backgroundColor: '#fff8ec', borderRadius: 22, padding: 18, borderWidth: 1.5, borderColor: '#dfc28e' },
  label: { fontSize: 16, fontWeight: '900', color: '#8a5a24', marginBottom: 10 },
  desc: { fontSize: 20, fontWeight: '900', color: '#5f3b1b' },
  noticeBox: { marginTop: 24, backgroundColor: '#fff3cf', borderRadius: 22, padding: 18, borderWidth: 2, borderColor: '#f59e0b' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noticeTitle: { fontSize: 21, fontWeight: '900', color: '#5f3b1b' },
  editText: { fontSize: 16, fontWeight: '900', color: '#2f80ed' },
  noticeText: { marginTop: 16, fontSize: 19, fontWeight: '900', color: '#6b3514', lineHeight: 28 },
  goalBox: { marginTop: 24, backgroundColor: '#fff8ec', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#dfc28e' },
  goalTitle: { fontSize: 22, fontWeight: '900', color: '#5f3b1b' },
  goalMainText: { marginTop: 22, fontSize: 38, fontWeight: '900', color: '#7a2e0e' },
  goalBarBg: { marginTop: 16, height: 16, borderRadius: 999, backgroundColor: '#ead7b7', overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 999, backgroundColor: '#f59e0b' },
  goalSubText: { marginTop: 14, fontSize: 15, fontWeight: '800', color: '#8a5a24' },
  goalEmptyText: { marginTop: 18, fontSize: 17, fontWeight: '900', color: '#8a5a24' },
  expBox: { marginTop: 24, backgroundColor: '#fff8ec', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#dfc28e' },
  expLevel: { fontSize: 20, fontWeight: '900', color: '#f59e0b' },
  expBarFill: { height: '100%', borderRadius: 999, backgroundColor: '#7c3aed' },
  memberTitle: { fontSize: 22, fontWeight: '900', color: '#5f3b1b', marginBottom: 16 },
  memberAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#f3d9a4', alignItems: 'center', justifyContent: 'center', marginRight: -6, borderWidth: 2, borderColor: '#fff8ec' },
  memberEmoji: { fontSize: 24 },
  rankingBox: { marginTop: 24, backgroundColor: '#fff8ec', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#dfc28e' },
  rankingEmptyText: { marginTop: 12, fontSize: 16, fontWeight: '900', color: '#8a5a24' },
  rankingItem: { marginTop: 14, backgroundColor: '#fff3cf', borderRadius: 18, padding: 14 },
  rankingTop: { flexDirection: 'row', alignItems: 'center' },
  rankingRank: { fontSize: 24, marginRight: 8 },
  rankingEmoji: { fontSize: 28, marginRight: 10 },
  rankingName: { fontSize: 17, fontWeight: '900', color: '#5f3b1b' },
  rankingSub: { marginTop: 4, fontSize: 13, fontWeight: '800', color: '#8a5a24' },
  rankingBarBg: { marginTop: 12, height: 10, borderRadius: 999, backgroundColor: '#ead7b7', overflow: 'hidden' },
  rankingBarFill: { height: '100%', borderRadius: 999, backgroundColor: '#f59e0b' },
  feedBox: { marginTop: 24, backgroundColor: '#fff8ec', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#dfc28e' },
  feedTop: { flexDirection: 'row', alignItems: 'center' },
  feedAvatar: { fontSize: 34, marginRight: 10 },
  feedMemo: {  marginTop: 10,  fontSize: 16,  fontWeight: '800',  color: '#6b3514',  lineHeight: 24,},
  feedUser: { fontSize: 15, fontWeight: '900', color: '#5f3b1b' },
  feedTitle: { marginTop: 3, fontSize: 17, fontWeight: '900', color: '#3d2515' },
  feedCategory: { fontSize: 12, fontWeight: '900', color: '#8a5a24', backgroundColor: '#ead7b7', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  feedMinutes: { marginTop: 14, fontSize: 28, fontWeight: '900', color: '#7a2e0e' },
  feedActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  feedActionText: { fontSize: 14, fontWeight: '900', color: '#8a5a24' },
  manageBox: { marginTop: 24, backgroundColor: '#fff8ec', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#dfc28e' },
   dangerButtonText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  leaveButton: { marginTop: 24, backgroundColor: '#ead7b7', borderRadius: 18, paddingVertical: 15, alignItems: 'center' },
  leaveButtonText: { fontSize: 16, fontWeight: '900', color: '#6b3514' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
  backgroundColor: '#fffaf2',
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,

  paddingHorizontal: 24,
  paddingTop: 24,
  paddingBottom: 20,

  maxHeight: '72%',   // 기존 90% → 72%
},
  modalTitle: { fontSize: 26, fontWeight: '900', color: '#5f3b1b', marginBottom: 16 },
  input: { backgroundColor: '#fff8ec', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, fontSize: 17, fontWeight: '800', color: '#5f3b1b', borderWidth: 1.5, borderColor: '#dfc28e' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  helpText: { marginTop: 12, fontSize: 14, fontWeight: '800', color: '#8a5a24' },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelButton: {
  flex: 1,
  marginTop: 12,
  backgroundColor: '#ead7b7',
  borderRadius: 18,
  paddingVertical: 16,
  alignItems: 'center',
  borderWidth: 1.5,
  borderColor: '#d8b56c',
},

cancelText: {
  fontSize: 17,
  fontWeight: '900',
  color: '#6b3514',
},
  submitButton: { flex: 1, backgroundColor: '#f59e0b', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  submitText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  joinRequestBox: { marginTop: 12, backgroundColor: '#fff3cf', borderRadius: 18, padding: 14 },
  joinRequestTitle: { fontSize: 16, fontWeight: '900', color: '#5f3b1b', marginBottom: 12 },
  joinRequestItem: { backgroundColor: '#fff8ec', borderRadius: 14, padding: 12, marginBottom: 10 },
  joinRequestUser: { fontSize: 15, fontWeight: '900', color: '#5f3b1b', marginBottom: 10 },
  joinRequestButtonRow: { flexDirection: 'row', gap: 8 },
  approveButton: { flex: 1, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  approveText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  rejectButton: { flex: 1, backgroundColor: '#ead7b7', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  rejectText: { fontSize: 14, fontWeight: '900', color: '#6b3514' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 22 },
  confirmBox: { backgroundColor: '#f7f0e5', borderRadius: 24, padding: 20 },
  confirmTitle: { fontSize: 24, fontWeight: '900', color: '#5f3b1b', marginBottom: 12 },
  confirmText: { fontSize: 16, fontWeight: '800', color: '#8a5a24', lineHeight: 24 },
  reportModalBox: { backgroundColor: '#f7f0e5', borderRadius: 24, padding: 20, maxHeight: '85%' },
  reportItem: { backgroundColor: '#fff8ec', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: '#dfc28e', marginBottom: 12 },
  reportTitle: { fontSize: 16, fontWeight: '900', color: '#5f3b1b', marginBottom: 8 },
  reportText: { fontSize: 14, fontWeight: '800', color: '#8a5a24', marginTop: 4 },
  reportButtonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reportDeleteButton: { flex: 1, backgroundColor: '#b91c1c', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  reportDeleteText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  reportDoneButton: { flex: 1, backgroundColor: '#ead7b7', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  reportDoneText: { fontSize: 13, fontWeight: '900', color: '#6b3514' },
  commentList: { maxHeight: 260, marginBottom: 12 },
commentItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',

  backgroundColor:
    'transparent',

  borderRadius: 10,

  paddingVertical: 8,
  paddingHorizontal: 10,

  marginBottom: 6,

  borderWidth: 0.5,
  borderColor: '#dfc28e',
},

commentNicknameText: {
  flexShrink: 0,

  marginRight: 8,

  fontSize: 13,
  lineHeight: 19,

  fontWeight: '900',
  color: '#5f3b1b',
},

commentBodyText: {
  flex: 1,
  flexShrink: 1,

  /*
   * Android에서 긴 글이
   * 정상적으로 줄어들도록 필요합니다.
   */
  minWidth: 0,

  fontSize: 13,
  lineHeight: 19,

  fontWeight: '700',
  color: '#6b3514',
},


  emptyCommentText: { textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#8a5a24', paddingVertical: 22 },
  cheerButton: { backgroundColor: '#ead7b7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  activeCheerButton: { backgroundColor: '#f59e0b' },
  cheerButtonText: { fontSize: 14, fontWeight: '900', color: '#8a5a24' },
  activeCheerButtonText: { color: '#fff' },
  reportMenuButton: { marginLeft: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: '#ead7b7', alignItems: 'center', justifyContent: 'center' },
  reportMenuText: { fontSize: 22, fontWeight: '900', color: '#6b3514', lineHeight: 24 },
  reportReasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  reportReasonButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#ead7b7' },
  activeReportReasonButton: { backgroundColor: '#f59e0b' },
  reportReasonText: { fontSize: 14, fontWeight: '900', color: '#6b3514' },
  activeReportReasonText: { color: '#fff' },
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.86)', alignItems: 'center', justifyContent: 'center' },
  imagePreviewFull: { width: '92%', height: '78%' },
  feedProfilePress: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  profileModalBox: { backgroundColor: '#f7f0e5', borderRadius: 26, padding: 22, alignItems: 'center' },
  profileEmoji: { fontSize: 64, marginBottom: 12 },
  profileName: { fontSize: 26, fontWeight: '900', color: '#5f3b1b' },
  profileSubText: { marginTop: 10, marginBottom: 20, fontSize: 15, fontWeight: '800', color: '#8a5a24' },
  memberModalBox: { backgroundColor: '#f7f0e5', borderRadius: 26, padding: 20, maxHeight: '82%' },
  memberList: { maxHeight: 460, marginBottom: 16 },
  memberListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8ec', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#dfc28e' },
  memberListEmoji: { fontSize: 34, marginRight: 12 },
  memberListName: { fontSize: 17, fontWeight: '900', color: '#5f3b1b' },
  memberListSub: { marginTop: 4, fontSize: 13, fontWeight: '800', color: '#8a5a24' },
  memberListArrow: { fontSize: 30, fontWeight: '900', color: '#b08a5a' },
  profileStatsRow: { width: '100%', flexDirection: 'row', gap: 10, marginBottom: 18 },
  profileStatBox: { flex: 1, backgroundColor: '#fff8ec', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#dfc28e' },
  profileStatLabel: { fontSize: 13, fontWeight: '900', color: '#8a5a24', marginBottom: 6 },
  profileStatValue: { fontSize: 15, fontWeight: '900', color: '#5f3b1b' },
  followButton: { width: '100%', backgroundColor: '#f59e0b', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  followingButton: { backgroundColor: '#ead7b7' },
  followButtonText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  followingButtonText: { color: '#6b3514' },
  feedModeRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 },
  feedModeButton: { flex: 1, backgroundColor: '#ead7b7', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  activeFeedModeButton: { backgroundColor: '#f59e0b' },
  feedModeText: { fontSize: 14, fontWeight: '900', color: '#8a5a24' },
  activeFeedModeText: { color: '#fff' },
  followingManageButton: { marginTop: 4, marginBottom: 8, backgroundColor: '#fff3cf', borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#f59e0b' },
  followingManageText: { fontSize: 14, fontWeight: '900', color: '#7a2e0e' },
  unfollowSmallButton: { backgroundColor: '#ead7b7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  unfollowSmallText: { fontSize: 13, fontWeight: '900', color: '#6b3514' },
  supportButton: { width: '100%', backgroundColor: '#fff3cf', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#f59e0b', marginBottom: 12 },
  supportedButton: { backgroundColor: '#ead7b7', borderColor: '#c8b08a' },
  supportButtonText: { fontSize: 16, fontWeight: '900', color: '#7a2e0e' },
  noticeModalBox: { backgroundColor: '#f7f0e5', borderRadius: 26, padding: 22, alignItems: 'center' },
  noticeModalIcon: { fontSize: 52, marginBottom: 10 },
  noticeModalTitle: { fontSize: 24, fontWeight: '900', color: '#5f3b1b', marginBottom: 8 },
  noticeModalMessage: { fontSize: 16, fontWeight: '800', color: '#8a5a24', textAlign: 'center', lineHeight: 23, marginBottom: 18 },
  mvpBox: { marginTop: 24, backgroundColor: '#fff3cf', borderRadius: 24, padding: 18, borderWidth: 2, borderColor: '#f59e0b' },
  mvpLabel: { fontSize: 20, fontWeight: '900', color: '#7a2e0e', marginBottom: 14 },
  mvpRow: { flexDirection: 'row', alignItems: 'center' },
  mvpEmoji: { fontSize: 42, marginRight: 12 },
  mvpName: { fontSize: 22, fontWeight: '900', color: '#5f3b1b' },
  mvpSubText: { marginTop: 5, fontSize: 14, fontWeight: '800', color: '#8a5a24' },
  mvpBadge: { backgroundColor: '#f59e0b', color: '#fff', fontSize: 14, fontWeight: '900', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  summaryBox: { marginTop: 24, backgroundColor: '#fff8ec', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#dfc28e' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, backgroundColor: '#fff3cf', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '900', color: '#7a2e0e' },
  summaryLabel: { marginTop: 5, fontSize: 12, fontWeight: '900', color: '#8a5a24' },
  feedSortRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  feedSortButton: { flex: 1, backgroundColor: '#ead7b7', borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  activeFeedSortButton: { backgroundColor: '#f59e0b' },
  feedSortText: { fontSize: 13, fontWeight: '900', color: '#6b3514' },
  activeFeedSortText: { color: '#fff' },
  moreFeedButton: { marginTop: 16, backgroundColor: '#ead7b7', borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  moreFeedText: { fontSize: 15, fontWeight: '900', color: '#6b3514' },
  feedPeriodRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  feedPeriodButton: { flex: 1, backgroundColor: '#fff3cf', borderRadius: 999, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#ead7b7' },
  activeFeedPeriodButton: { backgroundColor: '#7a2e0e', borderColor: '#7a2e0e' },
  feedPeriodText: { fontSize: 12, fontWeight: '900', color: '#8a5a24' },
  activeFeedPeriodText: { color: '#fff' },
  feedGrid: {  marginTop: 16,  flexDirection: 'row',  flexWrap: 'wrap',  gap: 8,},
feedGridItem: {  width: '31%',  aspectRatio: 1,  borderRadius: 14,  overflow: 'hidden',  backgroundColor: '#ead7b7',},
feedGridImage: {  width: '100%',  height: '100%',},
feedGridEmpty: {  flex: 1,  alignItems: 'center',  justifyContent: 'center',  backgroundColor: '#fff3cf',},
feedGridEmptyIcon: {  fontSize: 28,},
feedGridEmptyText: {  marginTop: 6, fontSize: 13,  fontWeight: '900',  color: '#6b3514',},
feedDetailOverlay: {  flex: 1,  backgroundColor: 'rgba(0,0,0,0.45)',  justifyContent: 'center',  padding: 22,},
feedDetailBox: {  maxHeight: '86%',  backgroundColor: '#fff3cf',  borderRadius: 28,  padding: 18,},
feedDetailImage: {  marginTop: 14, width: '100%',  height: 360,  borderRadius: 22,},
noticeOkButton: {  marginTop: 24,  backgroundColor: '#f59e0b',  borderRadius: 18, paddingVertical: 14,  alignItems: 'center',  width: '100%',},
noticeOkText: {  fontSize: 16,  fontWeight: '900',  color: '#fff',},
memberManageCard: {  marginTop: 24,  backgroundColor: '#fff8ec',  borderRadius: 24,  padding: 18,  borderWidth: 1.5,  borderColor: '#dfc28e',},
memberManageTitle: {  fontSize: 24,  fontWeight: '900',  color: '#5f3b1b',},
memberManageDesc: {
  marginTop: 12,
  fontSize: 15,
  fontWeight: '800',
  color: '#8a5a24',
},

memberManagePreview: {
  marginTop: 18,
  flexDirection: 'row',
},

rankingPreviewItem: {
  flex: 1,
  backgroundColor: '#fff3cf',
  borderRadius: 16,
  paddingVertical: 12,
  alignItems: 'center',
},

rankingPreviewMedal: {
  fontSize: 22,
},

rankingPreviewEmoji: {
  marginTop: 4,
  fontSize: 28,
},

rankingPreviewText: {
  marginTop: 6,
  fontSize: 12,
  fontWeight: '900',
  color: '#6b3514',
},
disabledJoinButton: {
  opacity: 0.45,
},

attendanceBox: {
  marginTop: 24,
  backgroundColor: '#fff8ec',
  borderRadius: 24,
  padding: 18,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

attendanceTitle: {
  fontSize: 22,
  fontWeight: '900',
  color: '#5f3b1b',
},

attendanceCount: {
  fontSize: 17,
  fontWeight: '900',
  color: '#f59e0b',
},

attendanceBarBg: {
  marginTop: 16,
  height: 14,
  borderRadius: 999,
  backgroundColor: '#ead7b7',
  overflow: 'hidden',
},

attendanceBarFill: {
  height: '100%',
  borderRadius: 999,
  backgroundColor: '#16a34a',
},

attendanceSubText: {
  marginTop: 12,
  fontSize: 14,
  fontWeight: '800',
  color: '#8a5a24',
},

missionBox: {
  marginTop: 24,
  backgroundColor: '#fff8ec',
  borderRadius: 24,
  padding: 18,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

missionTitle: {
  fontSize: 22,
  fontWeight: '900',
  color: '#5f3b1b',
},

missionCount: {
  fontSize: 17,
  fontWeight: '900',
  color: '#f59e0b',
},

missionDesc: {
  marginTop: 10,
  marginBottom: 14,
  fontSize: 14,
  fontWeight: '800',
  color: '#8a5a24',
},

missionExpText: {
  marginBottom: 12,
  fontSize: 13,
  fontWeight: '900',
  color: '#7a2e0e',
},

missionItem: {
  marginTop: 12,
  backgroundColor: '#fff3cf',
  borderRadius: 18,
  padding: 14,
},

completedMissionItem: {
  borderWidth: 2,
  borderColor: '#16a34a',
},

missionItemTitle: {
  flex: 1,
  fontSize: 15,
  fontWeight: '900',
  color: '#5f3b1b',
  marginRight: 8,
},

missionStatus: {
  fontSize: 12,
  fontWeight: '900',
  color: '#8a5a24',
  backgroundColor: '#ead7b7',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  overflow: 'hidden',
},

completedMissionStatus: {
  color: '#fff',
  backgroundColor: '#16a34a',
},

missionBarBg: {
  marginTop: 12,
  height: 10,
  borderRadius: 999,
  backgroundColor: '#ead7b7',
  overflow: 'hidden',
},

missionBarFill: {
  height: '100%',
  borderRadius: 999,
  backgroundColor: '#f59e0b',
},

missionProgressText: {
  marginTop: 8,
  fontSize: 13,
  fontWeight: '900',
  color: '#8a5a24',
},

missionRewardText: {
  marginTop: 6,
  fontSize: 12,
  fontWeight: '900',
  color: '#7a2e0e',
},

crewHeaderCard: {
  backgroundColor: '#fff8ec',
  borderRadius: 26,
  padding: 20,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

crewCategoryBadge: {
  alignSelf: 'flex-start',

  backgroundColor:
    '#f3e4c8',

  color:
    '#6b3514',

  fontSize: 12,
  fontWeight: '900',

  paddingHorizontal: 9,
  paddingVertical: 4,

  borderRadius: 999,
  overflow: 'hidden',
},

crewLevelRow: {
  marginTop: 16,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

crewLevelText: {
  fontSize: 17,
  fontWeight: '900',
  color: '#7a4c1f',
},

crewExpBarBg: {
  marginTop: 12,
  height: 14,
  backgroundColor: '#ead7b7',
  borderRadius: 999,
  overflow: 'hidden',
},

crewExpBarFill: {
  height: '100%',
  backgroundColor: '#7c3aed',
  borderRadius: 999,
},

crewExpText: {
  marginTop: 8,
  fontSize: 13,
  fontWeight: '800',
  color: '#8a5a24',
},

crewMemberSummaryCard: {
  marginTop: 14,
  backgroundColor: '#fff8ec',
  borderRadius: 20,
  padding: 16,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
  flexDirection: 'row',
  justifyContent: 'space-between',
},

crewMemberSummaryText: {
  fontSize: 16,
  fontWeight: '900',
  color: '#5f3b1b',
},

crewSimpleBox: {
  marginTop: 16,
  backgroundColor: '#fff8ec',
  borderRadius: 20,
  padding: 16,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

crewNoticeSimpleBox: {
  marginTop: 14,
  backgroundColor: '#fff3cf',
  borderRadius: 20,
  padding: 16,
  borderWidth: 1.5,
  borderColor: '#f59e0b',
},

simpleBoxTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#5f3b1b',
},

simpleBoxText: {
  marginTop: 10,
  fontSize: 16,
  fontWeight: '800',
  color: '#6b3514',
  lineHeight: 23,
},

crewMissionHeaderBox: {
  marginTop: 16,
  backgroundColor: '#fff8ec',
  borderRadius: 24,
  padding: 18,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

crewMissionSubText: {
  marginTop: 6,
  fontSize: 13,
  fontWeight: '800',
  color: '#8a5a24',
},

missionToggle: {
  backgroundColor: '#ead7b7',
  paddingHorizontal: 16,
  paddingVertical: 9,
  borderRadius: 999,
},

activeMissionToggle: {
  backgroundColor: '#16a34a',
},

missionToggleText: {
  fontSize: 14,
  fontWeight: '900',
  color: '#6b3514',
},

activeMissionToggleText: {
  color: '#fff',
},

manageHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 18,
},

manageClose: {
  fontSize: 34,
  fontWeight: '900',
  color: '#7a4c1f',
  paddingHorizontal: 8,
},

joinRequestManageItem: {
  backgroundColor: '#fff8ec',
  borderRadius: 18,
  padding: 14,
  marginBottom: 12,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

joinRequestEmoji: {
  fontSize: 34,
  marginBottom: 8,
},

joinRequestName: {
  fontSize: 18,
  fontWeight: '900',
  color: '#5f3b1b',
},

joinRequestSub: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: '800',
  color: '#8a5a24',
},

joinRequestActionRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 12,
},

feedCardList: {
  marginTop: 12,
},

feedPostCard: {
  backgroundColor: '#fff3cf',
  borderRadius: 22,
  padding: 14,
  marginBottom: 14,
},

feedPostHeader: {
  flexDirection: 'row',
  alignItems: 'center',
},

feedPostEmoji: {
  fontSize: 34,
  marginRight: 10,
},

feedPostName: {
  fontSize: 17,
  fontWeight: '900',
  color: '#5f3b1b',
},

feedPostDate: {
  marginTop: 3,
  fontSize: 13,
  fontWeight: '800',
  color: '#8a5a24',
},

feedPostCategory: {
  fontSize: 24,
},

feedPostImage: {
  marginTop: 14,
  width: '100%',
  height: 190,
  borderRadius: 18,
},

feedPostTitle: {
  marginTop: 14,
  fontSize: 22,
  fontWeight: '900',
  color: '#5f3b1b',
},

feedPostMemo: {
  marginTop: 8,
  fontSize: 15,
  fontWeight: '800',
  color: '#7a4c1f',
  lineHeight: 22,
},

feedPostActionRow: {
  marginTop: 14,
  flexDirection: 'row',
  gap: 16,
},

feedPostActionText: {
  fontSize: 15,
  fontWeight: '900',
  color: '#8a5a24',
},

visitVillageButton: {
  backgroundColor: '#c9982d',
  borderRadius: 18,
  paddingVertical: 14,
  alignItems: 'center',
  marginTop: 14,
},

visitVillageButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '900',
},


crewLevelBarRow:{
flexDirection:'row',
alignItems:'center',
marginTop:18,
},

crewTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},

crewMemberInlineCard: {
  marginTop: 22,
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff8ec',
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderWidth: 1.5,
  borderColor: '#ead7b7',
},

memberDivider: {
  width: 1.5,
  height: 20,
  backgroundColor: '#dfc28e',
  marginHorizontal: 12,
},

crewExpRight: {
  marginLeft: 10,
  fontSize: 14,
  fontWeight: '900',
  color: '#5f3b1b',
},

crewHeaderDivider: {
  height: 1.5,
  backgroundColor: '#ead7b7',
  marginTop: 20,
  marginBottom: 18,
},

crewDescriptionRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 14,
},

crewDescriptionLabel: {
  fontSize: 18,
  fontWeight: '900',
  color: '#5f3b1b',
},

crewDescriptionInline: {
  fontSize: 16,
  fontWeight: '800',

  color: '#6b3514',
  lineHeight: 23,
},
notificationButton: {
  width: 30,
  height: 30,

  backgroundColor:
    'transparent',

  borderWidth: 0,

  alignItems: 'center',
  justifyContent: 'center',

  padding: 0,

  position: 'relative',
},

notificationButtonText: {
  fontSize: 18,
},

notificationBadge: {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: '#ef4444',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
},

notificationBadgeText: {
  fontSize: 11,
  fontWeight: '900',
  color: '#fff',
},

notificationItem: {
  position: 'relative',

  backgroundColor:
    '#fff8ec',

  borderRadius: 14,

  /*
   * 삭제 버튼이 들어갈 오른쪽 공간만
   * 미리 확보합니다.
   */
  paddingLeft: 12,
  paddingRight: 68,

  /*
   * 위아래 여백을 줄여
   * 알림 한 칸의 높이를 줄입니다.
   */
  paddingTop: 10,
  paddingBottom: 10,

  borderWidth: 1,
  borderColor:
    '#dfc28e',

  marginBottom: 7,
},

notificationMessage: {
  fontSize: 14,
  fontWeight: '900',

  color:
    '#5f3b1b',

  lineHeight: 20,
},

notificationDate: {
  marginTop: 4,

  fontSize: 11,
  lineHeight: 15,

  fontWeight: '800',

  color:
    '#8a5a24',
},

notificationDeleteButton: {
  position: 'absolute',

  /*
   * 카드의 오른쪽 아래에 붙입니다.
   */
  right: 10,
  bottom: 10,

  minWidth: 45,
  minHeight: 27,

  backgroundColor:
    'transparent',

  borderRadius: 9,

  borderWidth: 0.5,
  borderColor:
    '#dfc28e',

  paddingHorizontal: 8,
  paddingVertical: 3,

  alignItems: 'center',
  justifyContent: 'center',

  zIndex: 5,
  elevation: 0,
},

notificationDeleteText: {
  fontSize: 12,
  fontWeight: '900',
  color: '#7a4c1f',
},
notificationActionRow: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 12,
},

notificationSmallButton: {
  flex: 1,
  backgroundColor: '#ead7b7',
  borderRadius: 14,
  paddingVertical: 10,
  alignItems: 'center',
},

notificationSmallButtonText: {
  fontSize: 13,
  fontWeight: '900',
  color: '#7a4c1f',
},

notificationSmallDangerButton: {
  flex: 1,
  backgroundColor: '#fee2e2',
  borderRadius: 14,
  paddingVertical: 10,
  alignItems: 'center',
},

notificationSmallDangerText: {
  fontSize: 13,
  fontWeight: '900',
  color: '#b91c1c',
},
crewManageSmallButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '900',
},

crewLeaveSmallButton: {
  width: 72,
  backgroundColor: '#ead7b7',
  paddingVertical: 10,
  borderRadius: 18,
  alignItems: 'center',
  borderWidth: 1.5,
  borderColor: '#d8b56c',
},

crewLeaveSmallButtonText: {
  color: '#b91c1c',
  fontSize: 14,
  fontWeight: '900',
},
crewHeaderTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

crewNameAndButtonRow: {
  marginTop: 8,

  flexDirection: 'row',
  alignItems: 'center',

  width: '100%',
},

crewHeaderTitle: {
  flex: 1,
  fontSize: 32,
  fontWeight: '900',
  color: '#5f2f12',
  marginRight: 10,
},

crewManageSmallButton: {
  width: 72,
  backgroundColor: '#a86b16',
  paddingVertical: 10,
  borderRadius: 18,
  alignItems: 'center',
},
manageGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  
  gap: 10,
},

manageButton: {
  width: '48%',
  backgroundColor: '#9c651f',
  borderRadius: 18,
  paddingVertical: 20,
  alignItems: 'center',
  justifyContent: 'center',
},

manageButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '900',
  textAlign: 'center',
},

dangerButton: {
  width: '48%',
  backgroundColor: '#c91f1f',
  borderRadius: 18,
  paddingVertical: 18,
  alignItems: 'center',
  justifyContent: 'center',

   marginTop: -8,
},
manageDangerButton: {
  backgroundColor: '#c71f25',
},
deleteConfirmButton: {
  flex: 1,
  backgroundColor: '#d81f26',
  borderRadius: 18,
  height: 72,
  justifyContent: 'center',
  alignItems: 'center',
},

deleteConfirmText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '900',
},

  crewCompactHeader: {
    backgroundColor:
      '#fff8ec',

    borderRadius: 22,

    paddingHorizontal: 18,
    paddingVertical: 17,

    borderWidth: 1.5,
    borderColor:
      '#dfc28e',
  },

crewCompactInfoRow: {
  marginTop: 10,

  alignItems: 'flex-start',
},

crewLevelMissionRow: {
  flexDirection: 'row',
  alignItems: 'center',

  gap: 5,
},

crewMemberButton: {
  alignSelf: 'flex-start',

  marginTop: 4,
},

  crewCompactLevelText: {
  fontSize: 14,
  fontWeight: '900',

  color:
    '#7a4c1f',
},

  crewMissionOpenButton: {
    minHeight: 32,

    paddingHorizontal: 11,
    paddingVertical: 6,

    backgroundColor:
      'transparent',

    borderWidth: 1,
    borderColor:
      '#dfc28e',

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',
  },

  crewMissionOpenButtonText: {
    fontSize: 12,
    fontWeight: '900',

    color:
      '#5f3b1b',
  },
crewMemberLinkText: {
  fontSize: 13,
  fontWeight: '900',

  color:
    '#5f3b1b',
},

crewChatButton: {
  minHeight: 58,
  marginTop: 13,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#dfc28e',
  backgroundColor: '#fff3cf',
},
crewChatButtonCopy: {
  flex: 1,
},
crewChatButtonTitle: {
  fontSize: 15,
  fontWeight: '900',
  color: '#3d2515',
},
crewChatButtonDescription: {
  marginTop: 3,
  fontSize: 11,
  lineHeight: 16,
  fontWeight: '700',
  color: '#8a6a3a',
},
crewChatButtonArrow: {
  marginLeft: 10,
  fontSize: 28,
  lineHeight: 30,
  fontWeight: '500',
  color: '#8a5a24',
},

  crewCompactDivider: {
  height: 1,

  marginTop: 12,
  marginBottom: 12,

  backgroundColor:
    '#ead7b7',
},

  crewCompactDescription: {
    width: '100%',
  },
crewManageModalBox: {
  paddingBottom:
    Platform.OS === 'android'
      ? 48
      : 24,
},
editCrewModalBox: {
  paddingBottom:
    Platform.OS === 'android'
      ? 58
      : 22,
},
});
