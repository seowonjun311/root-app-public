import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import {
  inspectServerExplorationData,
  type ExplorationVisitRecord,
} from '../../store/explorationCloud';
import { useRootTheme } from '../../store/rootTheme';

import {
  backupLocalMediaToCloud,
  createMediaBackupController,
  getLastMediaBackupResult,
  type MediaBackupController,
  type MediaBackupProgress,
  type MediaBackupResult,
} from '../../store/mediaBackup';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearRootOnboardingData,
  getRootOnboardingData,
  loadRootOnboardingData,
  setRootOnboardingData
} from '../../store/rootMemory';

import auth from '@react-native-firebase/auth';
import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';
import {
  commitRootNicknameForUid,
  getRootNicknameClaimDocumentId,
} from '../../store/rootNicknameRegistry';
import {
  getRootCloudUidOrNull,
} from '../../store/rootCloudSession';
GoogleSignin.configure({
  webClientId: '914235938891-8f8h890fnb4phoijtcilvui995quuud3.apps.googleusercontent.com',
});
const profileEmojiOptions = ['🦊', '🙂', '🐻', '🐰', '🐶', '🐱', '🐼', '🔥', '🌱', '⭐'];

const EXPLORATION_SERVER_PLACE_NAMES:
  Record<string, string> = {
  gyeongbokgung: '경복궁',
  changdeokgung: '창덕궁',
  changgyeonggung: '창경궁',
  jongmyo: '종묘',
  cheongwadae: '청와대',
  bukchon: '북촌한옥마을',
  'gwanghwamun-square': '광화문광장',
  insadong: '인사동',
  ikseondong: '익선동',
  'gwangjang-market': '광장시장',
};

const EXPLORATION_SERVER_MOOD_NAMES:
  Record<string, string> = {
  great: '😊 좋았어요',
  calm: '😌 편안했어요',
  special: '🤩 특별했어요',
  moved: '🥹 감동했어요',
  tired: '😅 힘들었어요',
};

const formatExplorationServerDate =
  (value: string | null | undefined) => {
    if (!value) {
      return '-';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return date
      .toLocaleString(
        'ko-KR',
        {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }
      );
  };


type ExplorationJournalFeedCheck = {
  hasShared: boolean;

  isLatest: boolean;

  needsReshare: boolean;

  statusText: string;

  currentVersion: string | null;

  sharedVersion: string | null;

  sharedAt: string | null;
};

/*
 * Firestore에 저장된 현재 여행기 버전과
 * 마지막 피드 카드에 반영된 여행기 버전을 비교합니다.
 *
 * markExplorationJournalFeedShared()가 피드공유 성공 시
 * journalUpdatedAt을 그대로 저장하므로 두 값이 같으면 최신입니다.
 */
const getExplorationJournalFeedCheck = (
  record: ExplorationVisitRecord
): ExplorationJournalFeedCheck => {
  const currentVersion =
    record.journalUpdatedAt ??
    null;

  const sharedVersion =
    record
      .journalFeedSharedJournalUpdatedAt ??
    null;

  const sharedAt =
    record.journalFeedSharedAt ??
    null;

  const hasShared =
    Boolean(
      record.journalFeedPostId
    ) ||
    Boolean(sharedAt) ||
    Boolean(sharedVersion);

  if (!hasShared) {
    return {
      hasShared: false,
      isLatest: false,
      needsReshare: false,
      statusText:
        '피드에 공유하지 않음',
      currentVersion,
      sharedVersion,
      sharedAt,
    };
  }

  if (!sharedVersion) {
    return {
      hasShared: true,
      isLatest: false,
      needsReshare: true,
      statusText:
        '피드 공유됨 · 공유 버전 확인 필요',
      currentVersion,
      sharedVersion,
      sharedAt,
    };
  }

  const currentTime =
    currentVersion
      ? new Date(
          currentVersion
        ).getTime()
      : Number.NaN;

  const sharedTime =
    new Date(
      sharedVersion
    ).getTime();

  const isLatest =
    currentVersion ===
      sharedVersion ||
    (
      Number.isFinite(
        currentTime
      ) &&
      Number.isFinite(
        sharedTime
      ) &&
      currentTime ===
        sharedTime
    );

  return {
    hasShared: true,
    isLatest,
    needsReshare:
      !isLatest,
    statusText:
      isLatest
        ? '피드에 최신 여행기 공유됨'
        : '수정됨 · 다시 공유 필요',
    currentVersion,
    sharedVersion,
    sharedAt,
  };
};
export default function SettingsScreen() {
  const [data, setData] = useState<any>(getRootOnboardingData());
  const [nicknameModal, setNicknameModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [mergeModal, setMergeModal] = useState(false);
  const [pendingGoogleData, setPendingGoogleData] = useState<any>(null);
  const [pendingServerData, setPendingServerData] = useState<any>(null);
  const [nickname, setNickname] = useState(data?.nickname ?? '');
  const [selectedEmoji, setSelectedEmoji] = useState(  data?.profileEmoji ?? '🦊');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const [
    mediaBackupLoading,
    setMediaBackupLoading,
  ] = useState(false);

  const [
    mediaBackupProgress,
    setMediaBackupProgress,
  ] = useState<
    MediaBackupProgress | null
  >(null);

  const [
    lastMediaBackupResult,
    setLastMediaBackupResult,
  ] = useState<
    MediaBackupResult | null
  >(null);

  const [
    mediaBackupStopRequested,
    setMediaBackupStopRequested,
  ] = useState(false);

  const [
    explorationServerCheckLoading,
    setExplorationServerCheckLoading,
  ] = useState(false);

  const mediaBackupControllerRef =
    useRef<
      MediaBackupController | null
    >(null);

  const nicknameModalScrollRef =
    useRef<any>(null);

  const [noticeModal, setNoticeModal] =
  useState<{
    title: string;
    message: string;
  } | null>(null);

  const { themeMode, theme, setThemeMode } = useRootTheme();
const isCityBlack =
  themeMode === 'cityBlack';

useEffect(() => {
  if (!nicknameModal) return;

  const keyboardShowSubscription =
    Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setTimeout(() => {
          nicknameModalScrollRef.current
            ?.scrollToEnd({
              animated: true,
            });
        }, 80);
      }
    );

  return () => {
    keyboardShowSubscription.remove();
  };
}, [nicknameModal]);

  useFocusEffect(
  useCallback(() => {
    const refresh = async () => {
      const latest =
        await loadRootOnboardingData();

      const latestBackupResult =
        await getLastMediaBackupResult();

      setData(latest);
      setNickname(
        latest?.nickname ?? ''
      );
      setSelectedEmoji(
        latest?.profileEmoji ?? '🦊'
      );
      setLastMediaBackupResult(
        latestBackupResult
      );
    };

    refresh();
  }, [])
);

  const isGuest =
  data?.loginType === 'guest' ||
  !data?.email;

const settingsModalBoxTheme = {
  backgroundColor:
    theme.card,

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 16,
};

const settingsModalTitleTheme = {
  color:
    theme.text,
};

const settingsModalDescTheme = {
  color:
    theme.subText,
};

const settingsModalInputTheme = {
  backgroundColor:
    theme.card,

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  color:
    theme.text,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
};

const settingsCancelButtonTheme = {
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

const settingsPrimaryButtonTheme = {
  backgroundColor:
    'transparent',

  borderColor:
    theme.strongLine,

  borderWidth:
    1,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
};

const settingsDangerButtonTheme = {
  backgroundColor:
    'transparent',

  borderColor:
    theme.danger,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
};

const settingsCancelTextTheme = {
  color:
    theme.text,
};

const settingsPrimaryTextTheme = {
  color:
    theme.text,
};

const settingsDangerTextTheme = {
  color:
    theme.danger,
};

const loadServerData = async (uid: string) => {
  const doc = await firestore()
    .collection('users')
    .doc(uid)
    .get();

  return doc.exists() ? doc.data() : null;
};

const saveServerData = async (
  uid: string,
  rootData: any
) => {
  const dailyData = await getDailyData();

  await firestore()
    .collection('users')
    .doc(uid)
    .set(
      {
        rootData,
        dailyData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
};

const getDailyData = async () => {
  const [
    timeRecords,
    todos,
    story,
    ledger,
    ledgerBudgets,
    meals,
    sleep,
    waterLogs,
    weightLogs,
    calorieProfile,
    exerciseCalories,
    exerciseCalorieLogs,
    recordColors,
    sleepStartAt,
    waterEnabled,
    weightEnabled,
    showSleep,
    showLedger,
    showStory,
    showMeal,
    showWeather,
    showTimeGrid,
    stepLogs,
    stepEnabled,
  ] = await Promise.all([
    AsyncStorage.getItem(
      'daily_time_records_v1'
    ),
    AsyncStorage.getItem(
      'daily_todos_v1'
    ),
    AsyncStorage.getItem(
      'daily_story_v1'
    ),
    AsyncStorage.getItem(
  'daily_ledger_v1'
),

AsyncStorage.getItem(
  'daily_ledger_budgets_v1'
),

AsyncStorage.getItem(
  'daily_meals_v1'
),
    AsyncStorage.getItem(
      'daily_sleep_v1'
    ),
    AsyncStorage.getItem(
      'root_water_logs'
    ),
    AsyncStorage.getItem(
      'root_weight_logs'
    ),
    AsyncStorage.getItem(
      'daily_calorie_profile_v1'
    ),
    AsyncStorage.getItem(
      'daily_exercise_calories_v1'
    ),
    AsyncStorage.getItem(
      'daily_exercise_calorie_logs_v1'
    ),
    AsyncStorage.getItem(
      'daily_record_colors_v1'
    ),
    AsyncStorage.getItem(
      'daily_sleep_start_at_v1'
    ),
    AsyncStorage.getItem(
      'root_water_enabled'
    ),
    AsyncStorage.getItem(
      'root_weight_enabled'
    ),
    AsyncStorage.getItem(
      'daily_show_sleep_v1'
    ),
    AsyncStorage.getItem(
      'daily_show_ledger_v1'
    ),
    AsyncStorage.getItem(
      'daily_show_story_v1'
    ),
    AsyncStorage.getItem(
      'daily_show_meal_v1'
    ),
    AsyncStorage.getItem(
      'daily_show_weather_v1'
    ),
    AsyncStorage.getItem(
      'daily_show_time_grid_v1'
    ),
    AsyncStorage.getItem(
      'root_step_logs'
    ),
    AsyncStorage.getItem(
      'root_step_enabled'
    ),
  ]);

  return {
    timeRecords,
    todos,
    story,
    ledger,
    ledgerBudgets,
    meals,
    sleep,
    waterLogs,
    weightLogs,
    calorieProfile,
    exerciseCalories,
    exerciseCalorieLogs,
    recordColors,
    sleepStartAt,
    waterEnabled,
    weightEnabled,
    showSleep,
    showLedger,
    showStory,
    showMeal,
    showWeather,
    showTimeGrid,
    stepLogs,
    stepEnabled,
  };
};

const restoreDailyData = async (dailyData: any) => {
  if (!dailyData) return;

  if (dailyData.timeRecords)
    await AsyncStorage.setItem('daily_time_records_v1', dailyData.timeRecords);

  if (dailyData.todos)
    await AsyncStorage.setItem('daily_todos_v1', dailyData.todos);

  if (dailyData.story)
    await AsyncStorage.setItem('daily_story_v1', dailyData.story);

 if (dailyData.ledger)
  await AsyncStorage.setItem(
    'daily_ledger_v1',
    dailyData.ledger
  );

if (
  dailyData.ledgerBudgets !== null &&
  dailyData.ledgerBudgets !== undefined
) {
  await AsyncStorage.setItem(
    'daily_ledger_budgets_v1',
    String(
      dailyData.ledgerBudgets
    )
  );
}

if (dailyData.meals)
  await AsyncStorage.setItem(
    'daily_meals_v1',
    dailyData.meals
  );

  if (dailyData.sleep)
    await AsyncStorage.setItem('daily_sleep_v1', dailyData.sleep);

  if (dailyData.waterLogs)
    await AsyncStorage.setItem('root_water_logs', dailyData.waterLogs);

  if (dailyData.weightLogs)
    await AsyncStorage.setItem('root_weight_logs', dailyData.weightLogs);

  if (dailyData.calorieProfile)
  await AsyncStorage.setItem('daily_calorie_profile_v1', dailyData.calorieProfile);

if (dailyData.exerciseCalories)
  await AsyncStorage.setItem('daily_exercise_calories_v1', dailyData.exerciseCalories);

if (dailyData.exerciseCalorieLogs)
  await AsyncStorage.setItem(
    'daily_exercise_calorie_logs_v1',
    dailyData.exerciseCalorieLogs
  );

if (dailyData.recordColors)
  await AsyncStorage.setItem(
    'daily_record_colors_v1',
    dailyData.recordColors
  );

if (dailyData.sleepStartAt)
  await AsyncStorage.setItem('daily_sleep_start_at_v1', dailyData.sleepStartAt);

if (dailyData.waterEnabled !== null && dailyData.waterEnabled !== undefined)
  await AsyncStorage.setItem('root_water_enabled', dailyData.waterEnabled);

if (dailyData.weightEnabled !== null && dailyData.weightEnabled !== undefined)
  await AsyncStorage.setItem('root_weight_enabled', dailyData.weightEnabled);

if (dailyData.showSleep !== null && dailyData.showSleep !== undefined)
  await AsyncStorage.setItem('daily_show_sleep_v1', dailyData.showSleep);

if (dailyData.showLedger !== null && dailyData.showLedger !== undefined)
  await AsyncStorage.setItem('daily_show_ledger_v1', dailyData.showLedger);

if (dailyData.showStory !== null && dailyData.showStory !== undefined)
  await AsyncStorage.setItem('daily_show_story_v1', dailyData.showStory);

if (dailyData.showMeal !== null && dailyData.showMeal !== undefined)
  await AsyncStorage.setItem('daily_show_meal_v1', dailyData.showMeal);

if (
  dailyData.showWeather !== null &&
  dailyData.showWeather !== undefined
) {
  await AsyncStorage.setItem(
    'daily_show_weather_v1',
    dailyData.showWeather
  );
}

if (
  dailyData.showTimeGrid !== null &&
  dailyData.showTimeGrid !== undefined
) {
  await AsyncStorage.setItem(
    'daily_show_time_grid_v1',
    dailyData.showTimeGrid
  );
}

if (dailyData.stepLogs)
  await AsyncStorage.setItem(
    'root_step_logs',
    dailyData.stepLogs
  );

if (
  dailyData.stepEnabled !== null &&
  dailyData.stepEnabled !== undefined
)
  await AsyncStorage.setItem(
    'root_step_enabled',
    dailyData.stepEnabled
  );

};

const clearDailyData = async () => {
  await AsyncStorage.multiRemove([
    'daily_time_records_v1',
    'daily_record_colors_v1',
    'daily_todos_v1',
    'daily_story_v1',
    'daily_ledger_v1',
    'daily_ledger_budgets_v1',
    'daily_meals_v1',
    'daily_sleep_v1',
    'daily_sleep_start_at_v1',
    'daily_calorie_profile_v1',
    'daily_exercise_calories_v1',
    'daily_exercise_calorie_logs_v1',
    'root_water_logs',
    'root_water_enabled',
    'root_weight_logs',
    'root_weight_enabled',
    'root_step_logs',
    'root_step_enabled',
    'daily_show_sleep_v1',
    'daily_show_ledger_v1',
    'daily_show_story_v1',
    'daily_show_meal_v1',
    'daily_show_weather_v1',
    'daily_show_time_grid_v1',
  ]);
};


  const googleLogin = async () => {
  try {
    setGoogleLoading(true);

    await GoogleSignin.hasPlayServices();

    const userInfo = await GoogleSignin.signIn();

    

const idToken =
  userInfo.data?.idToken ??
  (userInfo as any).idToken;

if (!idToken) {
  console.log('GOOGLE USER INFO', userInfo);

  Alert.alert(
    '로그인 실패',
    'Google ID 토큰을 가져오지 못했어요. Web Client ID를 다시 확인해 주세요.'
  );

  setGoogleLoading(false);
  return;
}

    const googleCredential =
      auth.GoogleAuthProvider.credential(
        idToken
      );

    const result =
      await auth().signInWithCredential(
        googleCredential
      );

    const user = result.user;

    console.log('SETTINGS GOOGLE UID', user.uid, user.email);

    const next = {
  ...data,
  loginType: 'google',
  isGuest: false,
  forceLogout: false,
  email: user.email,
  uid: user.uid,
  photoURL: user.photoURL,
  nickname:
    user.displayName ??
    data?.nickname ??
    '루트 사용자',
  loginProvider: 'google',
  loggedInAt: new Date().toISOString(),
};

    const serverData = await loadServerData(user.uid);

   
if (isGuest) {
  console.log('GUEST TO GOOGLE SHOW MERGE MODAL', {
    next,
    serverData,
  });

  setPendingGoogleData(next);
  setPendingServerData(serverData);

  setMergeModal(true);
  return;
}


if (!serverData) {
  await saveServerData(user.uid, next);
}

if (serverData?.dailyData) {
  await restoreDailyData(serverData.dailyData);

  await AsyncStorage.setItem(
    'daily_reload_signal',
    Date.now().toString()
  );
}

const finalData = {
  ...(serverData?.rootData ?? {}),
  loginType: 'google',
  isGuest: false,
  forceLogout: false,
  email: user.email,
  uid: user.uid,
  nickname:
    serverData?.rootData?.nickname ??
    next?.nickname ??
    user.displayName ??
    '루트 사용자',
  photoURL: user.photoURL,
  loginProvider: 'google',
  loggedInAt: new Date().toISOString(),
};

setRootOnboardingData(finalData);
setData(finalData);

Alert.alert(
  '로그인 성공',
  `${user.displayName ?? '루트 사용자'}님 환영합니다`
);

router.replace('/(tabs)');

    
  } catch (e: any) {
    console.log('GOOGLE LOGIN ERROR', e);

    Alert.alert(
      '로그인 실패',
      `${e?.code ?? '오류코드 없음'}\n${e?.message ?? '메시지 없음'}`
    );
  } finally {
    setGoogleLoading(false);
  }
};

  // ROOT_EXPLORE_V12D92_NICKNAME_REGISTRY_SETTINGS
  const saveNickname = async () => {
    let safeNickname:
      string;

    try {
      safeNickname =
        getRootNicknameClaimDocumentId(
          nickname
        );
    }
    catch {
      Alert.alert(
        '닉네임 제한',
        '닉네임은 2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요.'
      );
      return;
    }

    const next = {
      ...data,
      nickname:
        safeNickname,
      nickname_changed_at:
        new Date()
          .toISOString(),
    };

    const rootGuest =
      data?.loginType ===
        'guest' ||
      data?.isGuest ===
        true;

    if (rootGuest) {
      setRootOnboardingData(
        next
      );
      setData(
        next
      );
      setNicknameModal(
        false
      );

      console.log(
        'ROOT NICKNAME SETTINGS LOCAL ONLY: GUEST'
      );
      return;
    }

    const cloudUid =
      getRootCloudUidOrNull();

    if (!cloudUid) {
      Alert.alert(
        '닉네임 변경 실패',
        '로그인 상태를 확인한 뒤 다시 시도해 주세요.'
      );
      return;
    }

    try {
      await commitRootNicknameForUid({
        uid:
          cloudUid,
        nickname:
          safeNickname,
        previousNickname:
          data?.nickname ??
          null,
        rootData:
          next,
      });

      /*
       * Settings already owns the synchronous ROOT memory setter.
       * The server-side nickname/user/public-profile write has completed
       * atomically above; now mirror the committed state into local ROOT
       * memory using the same setter this screen already uses elsewhere.
       */
      setRootOnboardingData(
        next
      );

      setData(
        next
      );
      setNicknameModal(
        false
      );

      console.log(
        'ROOT NICKNAME SETTINGS REGISTRY COMMIT SUCCESS',
        {
          uid:
            cloudUid,
          nickname:
            safeNickname,
        }
      );
    }
    catch (error: any) {
      const message =
        String(
          error?.message ??
          error ??
          ''
        );

      if (
        message.includes(
          'ROOT_NICKNAME_TAKEN'
        )
      ) {
        Alert.alert(
          '닉네임 중복',
          `"${safeNickname}"은 이미 사용 중이에요. 다른 닉네임을 입력해 주세요.`
        );
        return;
      }

      console.log(
        'ROOT NICKNAME SETTINGS REGISTRY COMMIT ERROR',
        {
          code:
            error?.code ??
            null,
          message,
        }
      );

      Alert.alert(
        '닉네임 변경 실패',
        '닉네임을 서버에 안전하게 저장하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'
      );
    }
  };

  const logout = async (keepAsGuest = false) => {
  console.log('LOGOUT CALLED');

  const currentData = getRootOnboardingData();

  if (keepAsGuest) {
    const guestData = {
      ...(currentData ?? {}),
      loginType: 'guest',
      isGuest: true,
      forceLogout: false,
      email: null,
      uid: null,
      photoURL: null,
      loginProvider: 'guest',
      loggedInAt: new Date().toISOString(),
    };

    setRootOnboardingData(guestData);
    setData(guestData);
 } else {
  await clearRootOnboardingData();
  await clearDailyData();

  setData(null);
}

  setLogoutModal(false);

if (!keepAsGuest) {
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    console.log('GOOGLE SIGNOUT SKIP', e);
  }

  try {
    await auth().signOut();
  } catch (e) {
    console.log('FIREBASE SIGNOUT SKIP', e);
  }

  const logoutData = {
    loginType: null,
    isGuest: false,
    forceLogout: true,
    email: null,
    uid: null,
    photoURL: null,
    loginProvider: null,
  };

  setRootOnboardingData(logoutData);
  setData(logoutData);
}

router.replace('/login');
  };
  const deleteAccount = async () => {
  if (deleteConfirmText !== data?.email && !isGuest) {
    Alert.alert('확인 필요', '이메일을 정확히 입력해 주세요.');
    return;
  }

  if (!isGuest) {
    await auth().signOut();
    await GoogleSignin.signOut();
  }

 await clearRootOnboardingData();
await clearDailyData();

setData(null);
setDeleteConfirmText('');
setDeleteModal(false);

router.replace('/login');
};
  

  const stopMediaBackup = () => {
    if (
      !mediaBackupLoading ||
      !mediaBackupControllerRef
        .current
    ) {
      return;
    }

    setMediaBackupStopRequested(
      true
    );

    mediaBackupControllerRef
      .current
      .cancel();

    console.log(
      'SETTINGS MEDIA BACKUP STOP REQUESTED'
    );
  };

  const handleMediaBackup =
    async () => {
      if (
        isGuest ||
        !auth()
          .currentUser
          ?.uid
      ) {
        setNoticeModal({
          title:
            'Google 로그인 필요',

          message:
            '기록 사진을 클라우드에 백업하려면 Google 계정으로 로그인해야 해요.',
        });

        return;
      }

      if (
        mediaBackupLoading
      ) {
        return;
      }

      const controller =
        createMediaBackupController();

      mediaBackupControllerRef.current =
        controller;

      setMediaBackupProgress({
        stage:
          'preparing',
        processedCount: 0,
        totalCount: 0,
        percent: 0,
        currentKind: null,
        currentLabel:
          '백업할 사진을 확인하고 있어요',
        uploadedFileCount: 0,
        resumedFileCount: 0,
        missingFileCount: 0,
        failedCount: 0,
      });

      setMediaBackupStopRequested(
        false
      );

      setMediaBackupLoading(
        true
      );

      try {
        const result =
          await backupLocalMediaToCloud({
            controller,

            onProgress:
              (
                progress
              ) => {
                setMediaBackupProgress(
                  progress
                );
              },
          });

        const latestData =
          await loadRootOnboardingData();

        setData(
          latestData
        );

        setLastMediaBackupResult(
          result
        );

        console.log(
          'SETTINGS MEDIA BACKUP RESULT',
          result
        );

        if (
          result.cancelled
        ) {
          setNoticeModal({
            title:
              '백업을 중단했어요',

            message:
              `처리 ${result.processedCount}/${result.totalCount}개
` +
              `새로 업로드 ${result.uploadedFileCount}개
` +
              `이전 백업 이어받기 ${result.resumedFileCount}개

` +
              '완료한 주소는 임시 저장됐어요. 다음에 같은 버튼을 누르면 이어서 진행합니다.',
          });

          return;
        }

        if (
          result
            .canClearAppData
        ) {
          setNoticeModal({
            title:
              '클라우드 백업 완료',

            message:
              `새로 업로드 ${result.uploadedFileCount}개
` +
              `이전 백업 이어받기 ${result.resumedFileCount}개
` +
              `복원 가능한 클라우드 파일 ${result.recoverableMediaCount}개
` +
              `이미 사라진 옛 파일 ${result.missingFileCount}개
` +
              `복구 불가능한 기록 ${result.unrecoverableRecordCount}개
` +
              `복구 불가능한 식단 사진 ${result.unrecoverableMealCount}개

` +
              '현재 남아 있는 로컬 파일은 모두 백업됐고 서버 저장도 완료됐어요. 앱 데이터 초기화 테스트를 진행할 수 있어요.',
          });

          return;
        }

        setNoticeModal({
          title:
            '백업 확인 필요',

          message:
            `처리 ${result.processedCount}/${result.totalCount}개
` +
            `새로 업로드 ${result.uploadedFileCount}개
` +
            `이전 백업 이어받기 ${result.resumedFileCount}개
` +
            `이미 사라진 옛 파일 ${result.missingFileCount}개
` +
            `실패 ${result.failedCount}개
` +
            `남은 로컬 주소 ${result.remainingLocalUriCount}개
` +
            `서버 저장 ${result.serverSaved ? '완료' : '미완료'}

` +
            '앱 데이터는 아직 삭제하지 마세요. 같은 버튼을 누르면 완료된 파일은 건너뛰고 이어서 진행합니다.',
        });
      } catch (
        error: any
      ) {
        console.log(
          'SETTINGS MEDIA BACKUP ERROR',
          {
            code:
              error?.code ??
              null,

            message:
              error?.message ??
              String(
                error
              ),
          }
        );

        setNoticeModal({
          title:
            '백업 실패',

          message:
            error?.message ===
            'MEDIA_BACKUP_LOGIN_REQUIRED'
              ? 'Google 로그인 상태를 확인해 주세요.'
              : '기록 사진을 백업하지 못했어요. 완료된 파일 정보는 임시 저장되므로 인터넷 연결을 확인한 뒤 다시 실행해 주세요.',
        });
      } finally {
        mediaBackupControllerRef.current =
          null;

        setMediaBackupStopRequested(
          false
        );

        setMediaBackupLoading(
          false
        );
      }
    };

  const handleExplorationServerCheck =
    async () => {
      const currentUser =
        auth()
          .currentUser;

      if (
        isGuest ||
        !currentUser?.uid
      ) {
        setNoticeModal({
          title:
            'Google 로그인 필요',

          message:
            '새 기기에서 복원될 탐험 데이터를 확인하려면 Google 계정으로 로그인해야 해요.',
        });

        return;
      }

      if (
        explorationServerCheckLoading
      ) {
        return;
      }

      setExplorationServerCheckLoading(
        true
      );

      try {
        const inspection =
          await inspectServerExplorationData(
            currentUser.uid
          );

        if (
          !inspection.exists ||
          !inspection.data
        ) {
          setNoticeModal({
            title:
              '서버 탐험 데이터 없음',

            message:
              '현재 Google 계정의 Firestore에서 탐험 데이터를 찾지 못했어요. 이 점검은 기기의 로컬 데이터를 변경하지 않았어요.',
          });

          return;
        }

        const serverData =
          inspection.data;

        const journals =
          serverData
            .visitRecords
            .filter(
              (
                record: ExplorationVisitRecord
              ) =>
                record
                  .journalMemo
                  .trim()
                  .length >
                  0 ||
                Boolean(
                  record
                    .journalMood
                ) ||
                record
                  .journalPhotoUrls
                  .length >
                  0
            )
            .sort(
              (first, second) =>
                new Date(
                  second
                    .journalUpdatedAt ??
                  second
                    .verifiedAt
                ).getTime() -
                new Date(
                  first
                    .journalUpdatedAt ??
                  first
                    .verifiedAt
                ).getTime()
            );

        const journalFeedChecks =
          journals.map(
            (record) => ({
              record,
              feedCheck:
                getExplorationJournalFeedCheck(
                  record
                ),
            })
          );

        const sharedJournalCount =
          journalFeedChecks.filter(
            ({ feedCheck }) =>
              feedCheck.hasShared
          ).length;

        const latestSharedJournalCount =
          journalFeedChecks.filter(
            ({ feedCheck }) =>
              feedCheck.isLatest
          ).length;

        const needsReshareJournalCount =
          journalFeedChecks.filter(
            ({ feedCheck }) =>
              feedCheck.needsReshare
          ).length;

        const unsharedJournalCount =
          journalFeedChecks.filter(
            ({ feedCheck }) =>
              !feedCheck.hasShared
          ).length;

        const journalText =
          journalFeedChecks.length >
          0
            ? journalFeedChecks
                .map(
                  ({
                    record,
                    feedCheck,
                  }) => {
                    const placeName =
                      EXPLORATION_SERVER_PLACE_NAMES[
                        record.placeId
                      ] ??
                      record.placeId;

                    const moodText =
                      record
                        .journalMood
                        ? EXPLORATION_SERVER_MOOD_NAMES[
                            record
                              .journalMood
                          ] ??
                          record
                            .journalMood
                        : '기분 없음';

                    const memoText =
                      record
                        .journalMemo
                        .trim()
                        ? record
                            .journalMemo
                            .trim()
                            .slice(
                              0,
                              30
                            )
                        : '메모 없음';

                    const postConnectionText =
                      record
                        .journalFeedPostId
                        ? '연결됨'
                        : '없음';

                    return (
                      `${placeName} · ${moodText} · 사진 ${record.journalPhotoUrls.length}장\n` +
                      `${memoText}\n` +
                      `현재 여행기 버전: ${formatExplorationServerDate(
                        feedCheck.currentVersion
                      )}\n` +
                      `피드 공유 상태: ${feedCheck.statusText}\n` +
                      `공유된 여행기 버전: ${formatExplorationServerDate(
                        feedCheck.sharedVersion
                      )}\n` +
                      `다시 공유 필요: ${feedCheck.needsReshare ? '예' : '아니오'}\n` +
                      `마지막 피드 공유: ${formatExplorationServerDate(
                        feedCheck.sharedAt
                      )}\n` +
                      `피드 게시물 연결: ${postConnectionText}`
                    );
                  }
                )
                .join(
                  '\n\n────────────\n\n'
                )
            : '저장된 여행기가 없습니다.';

        const message =
          [
            `확인 방식: ${inspection.source === 'rest' ? 'Firestore REST 직접 조회' : 'Firestore SDK 조회'}`,
            `확인 시각: ${formatExplorationServerDate(inspection.checkedAt)}`,
            '',
            `포인트: ${serverData.points}`,
            `방문 장소: ${serverData.visitedPlaceIds.length}개`,
            `완료 테마: ${serverData.completedThemeIds.length}개`,
            `건물: ${serverData.unlockedBuildingIds.length}개`,
            `스탬프: ${serverData.unlockedStampIds.length}개`,
            `대표 뱃지: ${serverData.mainBadgeId ?? '없음'}`,
            `여행기: ${journals.length}개`,
            '',
            '[피드 공유 상태 요약]',
            `피드 공유됨: ${sharedJournalCount}개`,
            `최신 공유: ${latestSharedJournalCount}개`,
            `다시 공유 필요: ${needsReshareJournalCount}개`,
            `피드 미공유: ${unsharedJournalCount}개`,
            '',
            journalText,
            '',
            '버전은 여행기를 마지막으로 수정한 시각입니다. 현재 버전과 공유된 버전이 다르면 피드 카드를 다시 공유해야 해요.',
            '',
            '이 점검은 Firestore 서버 데이터만 읽었으며 현재 기기의 탐험 기록을 변경하지 않았어요.',
          ].join(
            '\n'
          );

        console.log(
          'SETTINGS EXPLORATION SERVER CHECK DONE',
          {
            source:
              inspection.source,
            points:
              serverData.points,
            visitedCount:
              serverData
                .visitedPlaceIds
                .length,
            buildingCount:
              serverData
                .unlockedBuildingIds
                .length,
            stampCount:
              serverData
                .unlockedStampIds
                .length,
            journalCount:
              journals.length,
            sharedJournalCount,
            latestSharedJournalCount,
            needsReshareJournalCount,
            unsharedJournalCount,
          }
        );

        setNoticeModal({
          title:
            '탐험 서버 데이터 점검',

          message,
        });
      } catch (
        error: any
      ) {
        console.log(
          'SETTINGS EXPLORATION SERVER CHECK ERROR',
          {
            code:
              error?.code ??
              null,
            message:
              error?.message ??
              String(
                error
              ),
          }
        );

        setNoticeModal({
          title:
            '탐험 서버 점검 실패',

          message:
            'Firestore 서버 데이터를 확인하지 못했어요. 인터넷 연결과 Google 로그인 상태를 확인한 뒤 다시 눌러 주세요. 기기의 로컬 데이터는 변경되지 않았어요.',
        });
      } finally {
        setExplorationServerCheckLoading(
          false
        );
      }
    };

  const settingItems = [
  {
    icon: '🔔',
    title: '알림 설정',
    desc: '목표 알림과 리마인드를 설정해요',
    onPress: () => router.push('/notification-settings'),
  },
    {
    icon: '👤',
    title: '캐릭터 · 닉네임 변경',
desc: '루트에서 사용할 캐릭터와 이름을 바꿔요',
    onPress: () => setNicknameModal(true),
  },
  {
    icon: '☁️',
    title: '기록 사진 클라우드 백업',
    desc: isGuest
      ? 'Google 로그인 후 기록 사진을 안전하게 저장해요'
      : lastMediaBackupResult
          ?.canClearAppData
      ? '백업 완료 · 앱 데이터 초기화 가능'
      : lastMediaBackupResult
          ?.cancelled
      ? `중단됨 · ${lastMediaBackupResult.processedCount}/${lastMediaBackupResult.totalCount}개 · 눌러서 이어하기`
      : '앱 데이터 초기화 전에 기록·GPS·식단 사진을 저장해요',
    onPress: handleMediaBackup,
  },
  {
    icon: '🔎',
    title: '탐험 서버 데이터 점검',
    desc: isGuest
      ? 'Google 로그인 후 서버 탐험 데이터를 확인해요'
      : '서버 탐험·여행기와 피드 최신 여부를 읽기 전용으로 확인해요',
    onPress:
      handleExplorationServerCheck,
  },
  {
    icon: isGuest ? '🔑' : '🚪',
    title: isGuest ? '로그인하기' : '로그아웃하기',
    desc: isGuest
      ? '게스트 기록을 계정으로 옮겨요'
      : '현재 계정에서 로그아웃해요',
    onPress: () => {
      if (isGuest) {
  googleLogin();
} else {
        setLogoutModal(true);
      }
    },
  },
  {
    icon: '🗑️',
    title: isGuest ? '게스트 기록 삭제' : '계정 삭제',
    desc: isGuest
      ? '이 기기에 저장된 목표와 기록을 삭제해요'
      : '계정과 모든 기록을 삭제해요',
    danger: true,
    onPress: () => setDeleteModal(true),
  },
  {
    icon: '🛡️',
    title: '개인정보처리방침',
    desc: '개인정보 처리 내용을 확인해요',
    onPress: () => router.push('/privacy-policy'),
  },
];

  return (
  <ScrollView
    style={[
      styles.container,
      { backgroundColor: theme.background },
    ]}
    contentContainerStyle={[
      styles.contentContainer,
      { backgroundColor: theme.background },
    ]}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
    nestedScrollEnabled
    overScrollMode="always"
  >
    <Text
      style={[
        styles.pageTitle,
        { color: theme.text },
      ]}
    >
      설정
    </Text>

      <View
  style={[
    styles.profileCard,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderWidth:
        0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
>
        <Text style={styles.fox}>
  {data?.profileEmoji ?? '🦊'}
</Text>

        <View>
          <Text
  style={[
    styles.nickname,
    { color: theme.text },
  ]}
>
  {data?.nickname ?? '게스트'}
</Text>

<Text
  style={[
    styles.email,
    { color: theme.subText },
  ]}
>
  {isGuest
    ? '로그인하면 기록이 안전하게 저장돼요'
    : data?.email}
</Text>
        </View>
      </View>
<View
  style={[
    styles.themeModeBox,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderWidth:
        0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
>
 <View
  style={
    styles.themeModeInlineRow
  }
>
  <Text
    numberOfLines={1}
    style={[
      styles.themeModeTitle,
      {
        color:
          theme.text,
      },
    ]}
  >
    화면 분위기
  </Text>

  <View
    style={
      styles.themeModeInlineButtons
    }
  >
    <Pressable
      style={[
        styles.themeModeButton,
        {
          backgroundColor:
            'transparent',

          borderColor:
            themeMode ===
            'warm'
              ? theme.strongLine
              : theme.line,

          borderWidth:
            themeMode ===
            'warm'
              ? 1
              : 0.5,

          borderRadius:
            isCityBlack
              ? 4
              : 10,
        },
      ]}
      onPress={() =>
        setThemeMode(
          'warm'
        )
      }
    >
      <Text
        style={[
          styles.themeModeButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        따뜻함
      </Text>
    </Pressable>

    <Pressable
      style={[
        styles.themeModeButton,
        {
          backgroundColor:
            'transparent',

          borderColor:
            themeMode ===
            'cityBlack'
              ? theme.strongLine
              : theme.line,

          borderWidth:
            themeMode ===
            'cityBlack'
              ? 1
              : 0.5,

          borderRadius:
            isCityBlack
              ? 4
              : 10,
        },
      ]}
      onPress={() =>
        setThemeMode(
          'cityBlack'
        )
      }
    >
      <Text
        style={[
          styles.themeModeButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        차가움
      </Text>
    </Pressable>
  </View>
</View>
</View>

            <View
  style={[
    styles.list,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderWidth:
        0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
>
        {settingItems.map(
  (item, index) => (
          <Pressable
            key={item.title}
            style={[
  styles.settingItem,
  {
    borderBottomColor:
      theme.line,

    borderBottomWidth:
      index ===
      settingItems.length - 1
        ? 0
        : 0.5,
  },
]}
            onPress={item.onPress}
          >
            <Text style={styles.settingIcon}>{item.icon}</Text>

            <View style={{ flex: 1 }}>
              <Text
  style={[
    styles.settingTitle,
    { color: item.danger ? theme.danger : theme.text },
  ]}
>
                {item.title}
              </Text>

              <Text
  style={[
    styles.settingDesc,
    { color: theme.subText },
  ]}
>
  {item.desc}
</Text>
            </View>

            <Ionicons
  name="chevron-forward"
  size={17}
  color={theme.mutedText}
/>
          </Pressable>
        ))}
      </View>


     {/* 닉네임 변경 */}
<Modal
  visible={nicknameModal}
  transparent
  animationType="slide"
>
  <KeyboardAvoidingView
    style={styles.nicknameKeyboardAvoiding}
    behavior={
      Platform.OS === 'ios'
        ? 'padding'
        : 'height'
    }
    keyboardVerticalOffset={0}
  >
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.modalBox,
          styles.nicknameModalBox,
          settingsModalBoxTheme,
        ]}
      >
        <ScrollView
          ref={nicknameModalScrollRef}
          style={styles.nicknameModalBodyScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.nicknameModalBodyContent
          }
        >
          <Text
            style={[
              styles.modalTitle,
              settingsModalTitleTheme,
            ]}
          >
            캐릭터 · 닉네임 변경
          </Text>

          <Text
            style={[
              styles.modalDesc,
              settingsModalDescTheme,
            ]}
          >
            닉네임은 최대 12자까지 가능해요.
          </Text>

          <View style={styles.emojiGrid}>
            {profileEmojiOptions.map(
              (emoji) => {
                const selected =
                  selectedEmoji === emoji;

                return (
                  <Pressable
                    key={emoji}
                    style={[
  styles.emojiOption,
  {
    backgroundColor:
      'transparent',

    borderColor:
      selected
        ? theme.strongLine
        : theme.line,

    borderWidth:
      selected
        ? 1
        : 0.5,

    borderRadius:
      isCityBlack
        ? 4
        : 10,
  },
]}
                    onPress={() =>
                      setSelectedEmoji(emoji)
                    }
                  >
                    <Text
                      style={
                        styles.emojiOptionText
                      }
                    >
                      {emoji}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <TextInput
            value={nickname}
            onChangeText={setNickname}
            onFocus={() => {
              setTimeout(() => {
                nicknameModalScrollRef.current
                  ?.scrollToEnd({
                    animated: true,
                  });
              }, 250);
            }}
            maxLength={12}
            style={[
              styles.input,
              settingsModalInputTheme,
            ]}
            placeholder="새 닉네임"
            placeholderTextColor={theme.subText}
          />
        </ScrollView>

        <View
          style={[
            styles.modalButtonRow,
            styles.nicknameModalButtonRow,
          ]}
        >
          <Pressable
            style={[
              styles.cancelButton,
              settingsCancelButtonTheme,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              setNicknameModal(false);
            }}
          >
            <Text
              style={[
                styles.cancelText,
                settingsCancelTextTheme,
              ]}
            >
              취소
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.saveButton,
              settingsPrimaryButtonTheme,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              saveNickname();
            }}
          >
            <Text
              style={[
                styles.saveText,
                settingsPrimaryTextTheme,
              ]}
            >
              저장
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>


<Modal visible={mergeModal} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    settingsModalBoxTheme,
  ]}
>
      <Text
  style={[
    styles.modalTitle,
    settingsModalTitleTheme,
  ]}
>기록을 어떻게 할까요?</Text>

      <Text
  style={[
    styles.modalDesc,
    settingsModalDescTheme,
  ]}
>
        게스트 기록을 Google 계정에 저장하거나,
기존 Google 계정 기록을 불러올 수 있어요.
      </Text>

      <Pressable
  style={[
    styles.mergeChoiceButton,
    settingsPrimaryButtonTheme,
    { marginTop: 24 },
  ]}
  onPress={async () => {
    if (!pendingGoogleData) return;

    const finalData = {
      ...(pendingGoogleData ?? {}),
      loginType: 'google',
      isGuest: false,
      forceLogout: false,
      loginProvider: 'google',
      loggedInAt: new Date().toISOString(),
    };

    setRootOnboardingData(finalData);
    setData(finalData);

    await saveServerData(finalData.uid, finalData);
   
    setMergeModal(false);
    setPendingGoogleData(null);
    setPendingServerData(null);

    Alert.alert('완료', '게스트 기록을 계정에 저장했어요.');

    router.replace('/(tabs)');
  }}
>
  <Text
    style={[
      styles.saveText,
      settingsPrimaryTextTheme,
    ]}
  >
    게스트 기록 이어서 사용
  </Text>
</Pressable>

<Pressable
  style={[
    styles.mergeChoiceCancelButton,
    settingsCancelButtonTheme,
    {
      marginTop: 12,
      marginBottom: 0,
    },
  ]}
  onPress={async () => {
    if (!pendingServerData) {
      Alert.alert(
        '계정 기록 없음',
        '이 Google 계정에는 아직 저장된 기록이 없어요. 게스트 기록을 이어서 사용해 주세요.'
      );
      return;
    }

    await clearDailyData();
    await restoreDailyData(pendingServerData.dailyData);

    await AsyncStorage.setItem(
      'daily_reload_signal',
      Date.now().toString()
    );

    const finalData = {
      ...(pendingServerData.rootData ?? {}),
      loginType: 'google',
      isGuest: false,
      forceLogout: false,
      email: pendingGoogleData?.email,
      uid: pendingGoogleData?.uid,
      nickname:
        pendingServerData.rootData?.nickname ??
        pendingGoogleData?.nickname ??
        '루트 사용자',
      photoURL: pendingGoogleData?.photoURL,
      loginProvider: 'google',
      loggedInAt: new Date().toISOString(),
    };

    setRootOnboardingData(finalData);
    setData(finalData);

    setMergeModal(false);
    setPendingGoogleData(null);
    setPendingServerData(null);

    setNoticeModal({
  title: '완료',
  message: '계정 기록을 불러왔어요.',
});

    router.replace('/(tabs)');
  }}
>
  <Text
    style={[
      styles.cancelText,
      settingsCancelTextTheme,
    ]}
  >
    계정 기록 불러오기
  </Text>
</Pressable>
    </View>
  </View>
</Modal>


      {/* 로그아웃 */}
      <Modal
        visible={logoutModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              settingsModalBoxTheme,
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                settingsModalTitleTheme,
              ]}
            >
              로그아웃할까요?
            </Text>

            <Text
              style={[
                styles.modalDesc,
                settingsModalDescTheme,
              ]}
            >
              현재 기록을 게스트 기록으로 남길 수 있어요.
            </Text>

            <Pressable
              style={[
                styles.mergeChoiceButton,
                settingsPrimaryButtonTheme,
                { marginTop: 24 },
              ]}
              onPress={() => logout(true)}
            >
              <Text
                style={[
                  styles.saveText,
                  settingsPrimaryTextTheme,
                ]}
              >
                게스트로 저장 후 로그아웃
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.deleteButton,
                settingsDangerButtonTheme,
                { marginTop: 12 },
              ]}
              onPress={() => logout(false)}
            >
              <Text
  style={[
    styles.saveText,
    settingsDangerTextTheme,
  ]}
>
  게스트 저장 없이 로그인 화면으로 가기
</Text>
            </Pressable>

            <Pressable
              style={[
                styles.mergeChoiceCancelButton,
                settingsCancelButtonTheme,
                {
                  marginTop: 12,
                  marginBottom: 0,
                },
              ]}
              onPress={() => setLogoutModal(false)}
            >
              <Text
                style={[
                  styles.cancelText,
                  settingsCancelTextTheme,
                ]}
              >
                취소
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 계정 삭제 */}
<Modal visible={deleteModal} transparent animationType="slide">
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View style={styles.modalOverlay}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.modalScrollContent}
      >
        <View
          style={[
            styles.modalBox,
            settingsModalBoxTheme,
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              settingsModalTitleTheme,
            ]}
          >
            {isGuest ? '게스트 기록 삭제' : '계정 삭제'}
          </Text>

          <Text
  style={[
    styles.modalDesc,
    settingsModalDescTheme,
  ]}
>
            {isGuest
              ? '이 기기에 저장된 게스트 목표와 기록이 삭제돼요. 되돌릴 수 없어요.'
              : '계정과 모든 기록이 삭제돼요. 되돌릴 수 없어요.'}
          </Text>

          {!isGuest && (
            <TextInput
  value={deleteConfirmText}
  onChangeText={setDeleteConfirmText}
  style={[
    styles.input,
    settingsModalInputTheme,
  ]}
  placeholder="이메일을 입력해 주세요"
  placeholderTextColor={theme.subText}
/>
          )}

          <View style={styles.modalButtonRow}>
            <Pressable
  style={[
    styles.cancelButton,
    settingsCancelButtonTheme,
  ]}
  onPress={() => setDeleteModal(false)}
>
  <Text
    style={[
      styles.cancelText,
      settingsCancelTextTheme,
    ]}
  >
    취소
  </Text>
</Pressable>

            <Pressable
  style={[
    styles.deleteButton,
    settingsDangerButtonTheme,
    { flex: 1 },
  ]}
  onPress={deleteAccount}
>
  <Text
  style={[
    styles.saveText,
    settingsDangerTextTheme,
  ]}
>
  삭제
</Text>
</Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal
  visible={
    googleLoading ||
    mediaBackupLoading ||
    explorationServerCheckLoading
  }
  transparent
  animationType="fade"
  onRequestClose={() => {
    if (
      mediaBackupLoading
    ) {
      stopMediaBackup();
    }
  }}
>
  <View
    style={
      styles.loadingOverlay
    }
  >
    <View
      style={[
        styles.loadingBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderWidth:
            0.5,

          borderRadius:
            isCityBlack
              ? 4
              : 16,
        },
      ]}
    >
      <Text
        style={
          styles.loadingFox
        }
      >
        🦊
      </Text>

      <Text
        style={[
          styles.loadingTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        {mediaBackupLoading
          ? mediaBackupStopRequested
            ? '백업을 안전하게 중단하는 중입니다'
            : '기록 사진 백업 중입니다'
          : explorationServerCheckLoading
          ? '탐험 서버 데이터를 확인하고 있어요'
          : 'Google 계정으로 연결 중입니다'}
      </Text>

      <Text
        style={[
          styles.loadingText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {mediaBackupLoading
          ? mediaBackupProgress
              ?.currentLabel ??
            '백업을 준비하고 있어요'
          : explorationServerCheckLoading
          ? '새 기기에서 복원될 Firestore 데이터만 읽고 있어요. 현재 기기의 기록은 변경하지 않아요.'
          : '게스트 데이터를 안전하게 저장하고 있어요...'}
      </Text>

      {mediaBackupLoading && (
        <>
          <Text
            style={[
              styles.mediaBackupCount,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {mediaBackupProgress
              ?.processedCount ??
              0}
            /
            {mediaBackupProgress
              ?.totalCount ??
              0}
            개 ·{' '}
            {mediaBackupProgress
              ?.percent ??
              0}
            %
          </Text>

          <View
            style={[
              styles.mediaBackupProgressTrack,
              {
                backgroundColor:
                  theme.line,
              },
            ]}
          >
            <View
              style={[
                styles.mediaBackupProgressFill,
                {
                  width:
                    `${mediaBackupProgress?.percent ?? 0}%`,

                  backgroundColor:
                    theme.button,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.mediaBackupStats,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            새 업로드{' '}
            {mediaBackupProgress
              ?.uploadedFileCount ??
              0}
            개 · 이어받기{' '}
            {mediaBackupProgress
              ?.resumedFileCount ??
              0}
            개{`
`}
            이미 사라진 파일{' '}
            {mediaBackupProgress
              ?.missingFileCount ??
              0}
            개 · 실패{' '}
            {mediaBackupProgress
              ?.failedCount ??
              0}
            개
          </Text>
        </>
      )}

      <ActivityIndicator
        size="large"
        color={
          theme.button
        }
        style={{
          marginTop: 18,
        }}
      />

      {mediaBackupLoading && (
        <Pressable
          style={[
            styles.mediaBackupStopButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 4
                  : 10,

              opacity:
                mediaBackupStopRequested
                  ? 0.5
                  : 1,
            },
          ]}
          disabled={
            mediaBackupStopRequested
          }
          onPress={
            stopMediaBackup
          }
        >
          <Text
            style={[
              styles.mediaBackupStopText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {mediaBackupStopRequested
              ? '중단 요청됨'
              : '백업 중단'}
          </Text>
        </Pressable>
      )}
    </View>
  </View>
</Modal>

<Modal
  visible={noticeModal !== null}
  transparent
  animationType="fade"
  statusBarTranslucent
  onRequestClose={() =>
    setNoticeModal(null)
  }
>
  <View style={styles.modalOverlay}>
    <Pressable
      style={styles.noticeBackdrop}
      onPress={() =>
        setNoticeModal(null)
      }
    />

    <View
      style={[
        styles.noticeBox,
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
    >
      <Text
        style={[
          styles.noticeTitle,
          { color: theme.text },
        ]}
      >
        {noticeModal?.title}
      </Text>

      <ScrollView
        style={styles.noticeMessageScroll}
        contentContainerStyle={
          styles.noticeMessageContent
        }
        showsVerticalScrollIndicator
        persistentScrollbar
        nestedScrollEnabled
        scrollEnabled
        bounces={false}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[
            styles.noticeMessage,
            { color: theme.subText },
          ]}
        >
          {noticeModal?.message}
        </Text>
      </ScrollView>

      <Pressable
        style={[
          styles.saveButton,
          settingsPrimaryButtonTheme,
          {
            flex: 0,
            width: '100%',
          },
        ]}
        onPress={() =>
          setNoticeModal(null)
        }
      >
        <Text
          style={[
            styles.saveText,
            settingsPrimaryTextTheme,
          ]}
        >
          확인
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>
    </ScrollView>
    
  );
}

export type RootNotification = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  message: string;
};

export const getRootNotifications = () => {
  const data = getRootOnboardingData();
  return data?.notifications ?? [];
};

export const setRootNotifications = (
  notifications: RootNotification[]
) => {
  const data = getRootOnboardingData();

  const next = {
    ...data,
    notifications,
  };

  setRootOnboardingData(next);

  return next;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5e9cf',
  },



  loadingOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'center',
  alignItems: 'center',
},



loadingBox: {
  width: '82%',

  paddingHorizontal: 20,
  paddingVertical: 20,

  alignItems: 'center',

  borderWidth: 0.5,
},

loadingFox: {
  fontSize: 38,
  marginBottom: 8,
},

loadingTitle: {
  fontSize: 18,
  fontWeight: '900',
  textAlign: 'center',
},

loadingText: {
  marginTop: 8,

  fontSize: 13,
  lineHeight: 19,

  textAlign: 'center',
},

noticeBackdrop: {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
},

noticeBox: {
  width: '86%',
  maxHeight: '88%',
  minHeight: 260,

  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 20,

  borderWidth: 0.5,
  alignSelf: 'center',
  overflow: 'hidden',
},

noticeTitle: {
  flexShrink: 0,
  marginBottom: 8,
  fontSize: 20,
  fontWeight: '900',
},

noticeMessageScroll: {
  width: '100%',
  flexShrink: 1,
  marginBottom: 18,
},

noticeMessageContent: {
  flexGrow: 0,
  paddingRight: 8,
  paddingBottom: 18,
},

noticeMessage: {
  fontSize: 14,
  lineHeight: 21,
},

emojiGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',

  gap: 7,
  marginTop: 10,
},

emojiOption: {
  width: '18.5%',
  aspectRatio: 1,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 0.5,
},

emojiOptionText: {
  fontSize: 24,
},

activeEmojiOption: {
  backgroundColor: '#f59e0b',
  borderColor: '#f59e0b',
},


contentContainer: {
  flexGrow: 1,

  paddingHorizontal: 18,

  paddingTop:
    Platform.OS === 'android'
      ? 28
      : 14,

  paddingBottom: 180,
},

pageTitle: {
  marginTop: 0,
  marginBottom: 12,

  fontSize: 24,
  fontWeight: '900',
},

profileCard: {
  minHeight: 82,

  flexDirection: 'row',
  alignItems: 'center',

  paddingHorizontal: 14,
  paddingVertical: 12,

  borderWidth: 0.5,
},

fox: {
  width: 52,
  marginRight: 10,

  fontSize: 38,
  textAlign: 'center',
},

nickname: {
  fontSize: 18,
  fontWeight: '900',
},

email: {
  marginTop: 3,

  fontSize: 12,
  fontWeight: '700',
},

list: {
  marginTop: 12,

  overflow: 'hidden',

  borderWidth: 0.5,
},

settingItem: {
  minHeight: 66,

  flexDirection: 'row',
  alignItems: 'center',

  paddingHorizontal: 13,
  paddingVertical: 10,
},

settingIcon: {
  width: 32,
  marginRight: 8,

  fontSize: 21,
  textAlign: 'center',
},

settingTitle: {
  fontSize: 15,
  fontWeight: '900',
},

settingDesc: {
  marginTop: 2,

  fontSize: 11,
  fontWeight: '600',
  lineHeight: 15,
},

  dangerText: {
    color: '#d14d41',
  },

nicknameKeyboardAvoiding: {
  flex: 1,
},

nicknameModalBox: {
  width: '90%',
  maxHeight: '88%',

  paddingHorizontal: 0,
  paddingTop: 0,
  paddingBottom: 0,

  overflow: 'hidden',
},

nicknameModalBodyContent: {
  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: 14,
},

nicknameModalButtonRow: {
  marginTop: 0,

  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 20,
},

nicknameModalBodyScroll: {
  width: '100%',
  flexShrink: 1,
},
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 14,
},


  modalScrollContent: {
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 40,
},

modalBox: {
  width: '90%',
  maxHeight: '88%',

  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: 22,

  borderWidth: 0.5,
},

modalTitle: {
  marginBottom: 8,

  fontSize: 20,
  fontWeight: '900',
},

modalDesc: {
  marginTop: 8,

  textAlign: 'center',

  fontSize: 14,
  lineHeight: 21,
},

input: {
  height: 42,
  marginTop: 16,

  paddingHorizontal: 12,
  paddingVertical: 0,

  borderWidth: 0.5,

  fontSize: 15,
},

modalButtonRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 18,
},

cancelButton: {
  flex: 1,
  height: 40,

  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

saveButton: {
  flex: 1,
  height: 40,

  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

deleteButton: {
  height: 40,
  minHeight: 40,

  paddingHorizontal: 10,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

cancelText: {
  fontSize: 14,
  fontWeight: '900',
},

saveText: {
  fontSize: 14,
  fontWeight: '900',
},

mergeChoiceButton: {
  height: 40,

  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

mergeChoiceCancelButton: {
  height: 40,

  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',

  marginBottom: 0,
},
themeModeBox: {
  marginTop: 12,

  paddingHorizontal: 14,
  paddingVertical: 10,

  borderWidth: 0.5,
},

themeModeInlineRow: {
  flexDirection: 'row',
  alignItems: 'center',
  width: '100%',
},

themeModeTitle: {
  marginRight: 12,

  fontSize: 15,
  fontWeight: '900',
},

themeModeInlineButtons: {
  flex: 1,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 7,
},

themeModeButton: {
  flex: 1,
  height: 34,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 0.5,
},

themeModeButtonText: {
  fontSize: 12,
  fontWeight: '900',
},

mediaBackupCount: {
  marginTop: 14,
  fontSize: 16,
  fontWeight: '900',
  textAlign: 'center',
},

mediaBackupProgressTrack: {
  width: '100%',
  height: 8,
  marginTop: 10,
  overflow: 'hidden',
  borderRadius: 4,
},

mediaBackupProgressFill: {
  height: '100%',
  borderRadius: 4,
},

mediaBackupStats: {
  marginTop: 10,
  fontSize: 12,
  fontWeight: '700',
  lineHeight: 18,
  textAlign: 'center',
},

mediaBackupStopButton: {
  width: '100%',
  height: 38,
  marginTop: 16,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
  backgroundColor: 'transparent',
},

mediaBackupStopText: {
  fontSize: 13,
  fontWeight: '900',
},

});
