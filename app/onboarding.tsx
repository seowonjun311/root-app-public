import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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
  ACTION_GOAL_MAX_LENGTH,
  ACTION_GOAL_MIN_LENGTH,
} from '../store/rootConstants';

import {
  getRootOnboardingData,
  saveRootOnboardingData,
} from '../store/rootMemory';
import { useRootTheme } from '../store/rootTheme';
import { validateText } from '../utils/textGuard';

const TOTAL_STEPS = 7;

const CATEGORIES = [
  { id: 'exercise', icon: '🏃', label: '운동' },
  { id: 'study', icon: '📚', label: '공부' },
  { id: 'mental', icon: '🧘', label: '정신' },
  { id: 'daily', icon: '💼', label: '일' },
];

const EXERCISE_TYPES = [
  { label: '걷기', met: 3.5 },
  { label: '러닝', met: 8 },
  { label: '헬스', met: 6 },
  { label: '자전거', met: 7 },
  { label: '요가', met: 3 },
  { label: '스트레칭', met: 2.3 },
  { label: '등산', met: 6.5 },
  { label: '기타', met: 4 },
];

const DURATIONS = [
  '4주',
  '8주',
  '12주',
  '16주',
  '20주',
  '24주',
];

type CategoryId =
  | 'exercise'
  | 'study'
  | 'mental'
  | 'daily';

type ActionType =
  | '시간기록형'
  | '확인형';

type RepeatType =
  | 'weekdays'
  | 'weeklyCount';

const DAY_OPTIONS = [
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
  '일',
];

const REPEAT_TYPES: {
  id: RepeatType;
  label: string;
}[] = [
  {
    id: 'weekdays',
    label: '요일 지정',
  },
  {
    id: 'weeklyCount',
    label: '주 횟수',
  },
];

export default function OnboardingScreen() {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack =
    themeMode === 'cityBlack';

  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [category, setCategory] =
    useState<CategoryId | ''>('');
  const [duration, setDuration] =
    useState('');
  const [actionGoal, setActionGoal] =
    useState('');
  const [actionType, setActionType] =
    useState<ActionType>('확인형');
  const [
  repeatType,
  setRepeatType,
] = useState<RepeatType>(
  'weekdays'
);

const [
  selectedDays,
  setSelectedDays,
] = useState<number[]>([]);

const [
  weeklyCount,
  setWeeklyCount,
] = useState(3);

  const [exerciseType, setExerciseType] =
    useState('');
  const [
    customExerciseName,
    setCustomExerciseName,
  ] = useState('');
  const [nickname, setNickname] =
    useState('');

  const [noticeModal, setNoticeModal] =
    useState<{
      title: string;
      message: string;
    } | null>(null);

  const progressPercent =
    (step / TOTAL_STEPS) * 100;

  const cardTheme = {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: isCityBlack ? 4 : 28,
  };

  const inputTheme = {
    backgroundColor: theme.card2,
    borderColor: theme.line,
    color: theme.text,
    borderRadius: isCityBlack ? 4 : 18,
  };

  const primaryButtonTheme = {
    backgroundColor: theme.button,
    borderColor: theme.strongLine,
    borderWidth: 1,
    borderRadius: isCityBlack ? 4 : 20,
  };

  const secondaryButtonTheme = {
    backgroundColor: theme.card2,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: isCityBlack ? 4 : 20,
  };

  const openNotice = (
    title: string,
    message: string
  ) => {
    setNoticeModal({ title, message });
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
  };

const effectiveWeeklyCount =
  repeatType === 'weekdays'
    ? selectedDays.length
    : weeklyCount;

const selectedDayLabels =
  DAY_OPTIONS.filter(
    (_, index) =>
      selectedDays.includes(index)
  );

const toggleSelectedDay = (
  dayIndex: number
) => {
  setSelectedDays((previous) => {
    if (
      previous.includes(dayIndex)
    ) {
      return previous.filter(
        (item) =>
          item !== dayIndex
      );
    }

    return [
      ...previous,
      dayIndex,
    ].sort((a, b) => a - b);
  });
};

  const finishOnboarding = async () => {
    const nicknameError = validateText(
      nickname,
      {
        label: '닉네임',
        min: 2,
        max: 12,
        allowSpace: false,
      }
    );

    if (nicknameError) {
      openNotice(
        '닉네임 확인',
        nicknameError
      );
      return;
    }

    const nicknameValue = nickname.trim();
    const previousData =
  getRootOnboardingData();

const currentUser =
  auth().currentUser;

const uid =
  currentUser?.uid ??
  previousData?.uid ??
  null;

   if (uid) {
  try {
    console.log(
      'NICKNAME DUPLICATE CHECK START',
      {
        uid,
        nickname:
          nicknameValue,
      }
    );

    const nicknameQuery =
      firestore()
        .collection('users')
        .where(
          'rootData.nickname',
          '==',
          nicknameValue
        )
        .limit(5)
        .get();

    const sameNicknameUsers =
      await Promise.race([
        nicknameQuery,

        new Promise<never>(
          (_resolve, reject) => {
            setTimeout(() => {
              reject(
                new Error(
                  'NICKNAME_CHECK_TIMEOUT'
                )
              );
            }, 7000);
          }
        ),
      ]);

    const duplicatedByAnotherUser =
      sameNicknameUsers.docs.some(
        (document) =>
          String(
            document.id
          ) !==
          String(uid)
      );

    if (
      duplicatedByAnotherUser
    ) {
      console.log(
        'NICKNAME DUPLICATE FOUND',
        {
          uid,
          nickname:
            nicknameValue,
        }
      );

      openNotice(
        '닉네임 중복',
        `"${nicknameValue}"은 이미 사용 중이에요.\n다른 닉네임을 입력해 주세요.`
      );

      /*
       * 중복이면 아래 온보딩 저장을
       * 실행하지 않습니다.
       */
      return;
    }

    console.log(
      'NICKNAME AVAILABLE',
      {
        uid,
        nickname:
          nicknameValue,
      }
    );
  } catch (error: any) {
    console.log(
      'NICKNAME DUPLICATE CHECK ERROR',
      {
        uid,

        nickname:
          nicknameValue,

        code:
          error?.code ??
          null,

        message:
          error?.message ??
          String(error),
      }
    );

    /*
     * 중복 확인에 실패한 상태에서 저장하면
     * 중복 닉네임이 생길 수 있으므로 중단합니다.
     */
    openNotice(
      '닉네임 확인 실패',
      error?.message ===
        'NICKNAME_CHECK_TIMEOUT'
        ? '닉네임 확인 시간이 오래 걸리고 있어요.\n인터넷 연결을 확인한 뒤 다시 눌러 주세요.'
        : '닉네임 중복 여부를 확인하지 못했어요.\n인터넷 연결을 확인한 뒤 다시 눌러 주세요.'
    );

    return;
  }
}

    const selectedExercise =
      EXERCISE_TYPES.find(
        (item) =>
          item.label === exerciseType
      );

    const createdAt =
      new Date().toISOString();

      const resultGoalId =
  Date.now();

const actionGoalId =
  resultGoalId + 1;

    const newResultGoal = {
  id: resultGoalId,
  category,
  resultGoal: goal.trim(),
  duration,
  createdAt,
};

    const newActionGoal = {
  id: actionGoalId,

  title:
    actionGoal.trim(),

  type:
    actionType,

  repeatType,

  selectedDays:
    repeatType === 'weekdays'
      ? [...selectedDays]
      : [],

  weeklyCount:
    effectiveWeeklyCount,

  completedDays: [],

  completedDates: [],

  category,

  resultGoalId,

  createdAt,

  ...(category === 'exercise'
    ? {
        exerciseType,
      }
    : {}),

  ...(category === 'exercise' &&
  exerciseType === '기타'
    ? {
        customExerciseName:
          customExerciseName.trim(),
      }
    : {}),

  ...(category === 'exercise' &&
  actionType === '시간기록형'
    ? {
        met:
          selectedExercise?.met ??
          4,
      }
    : {}),
};

const nextData = {
  /*
   * 기존에 저장되어 있던 사용자 정보,
   * 설정, 기록 등을 먼저 유지합니다.
   */
  ...(previousData ?? {}),

  /*
   * Firebase 로그인 계정 정보
   */
  ...(uid
    ? {
        uid: String(uid),

        email:
          currentUser?.email ??
          previousData?.email ??
          null,

        loginType: 'google',
        loginProvider: 'google',

        isGuest: false,
        forceLogout: false,
      }
    : {
        /*
         * Firebase UID가 없는 경우에만
         * 게스트 사용자로 저장합니다.
         */
        loginType: 'guest',
        loginProvider: 'guest',

        isGuest: true,
        forceLogout: false,
      }),

  /*
   * 온보딩에서 입력한 닉네임
   */
  nickname: nicknameValue,

  /*
   * 동일 카테고리의 이전 결과목표는 제거하고
   * 새 결과목표를 저장합니다.
   */
  goals: [
    ...(
      previousData?.goals ??
      []
    ).filter(
      (item: any) =>
        item?.category !==
        category
    ),

    newResultGoal,
  ],

  /*
   * 기존 행동목표는 유지하고
   * 새 행동목표를 추가합니다.
   */
  actionGoals: [
    ...(
      previousData?.actionGoals ??
      []
    ),

    newActionGoal,
  ],

  category,

  /*
   * 온보딩 완료 여부를 명확히 저장합니다.
   */
  onboardingComplete: true,
  onboardingCompletedAt:
    createdAt,

  updatedAt:
    createdAt,
};

const safeNextData = JSON.parse(
  JSON.stringify(nextData)
);

try {
  /*
   * Google 로그인 사용자라면
   * 먼저 Firestore에 저장합니다.
   */
  if (uid) {
    await firestore()
  .collection('users')
  .doc(String(uid))
  .set(
    {
      uid:
        String(uid),

      email:
        safeNextData?.email ??
        null,

      nickname:
        safeNextData
          ?.nickname ??
        '루트 사용자',

      rootData:
        safeNextData,

      onboardingComplete:
        true,

      onboardingCompletedAt:
        createdAt,

      updatedAt:
        createdAt,
    },
    {
      merge: true,
    }
  );

console.log(
  'ONBOARDING SERVER SAVE SUCCESS',
  {
    uid,

    nickname:
      safeNextData
        ?.nickname,

    goalCount:
      safeNextData
        ?.goals
        ?.length ?? 0,

    actionGoalCount:
      safeNextData
        ?.actionGoals
        ?.length ?? 0,
  }
);
  }

  /*
   * 서버 저장 성공 후
   * 기기 내부에도 저장합니다.
   */
  await saveRootOnboardingData(
  safeNextData
);

  console.log(
  'ONBOARDING SAVE SUCCESS',
  {
    uid,
    nickname:
      safeNextData.nickname,
    goals:
      safeNextData.goals?.length ?? 0,
    actionGoals:
      safeNextData.actionGoals?.length ??
      0,
  }
);

  router.replace('/(tabs)');
} catch (error) {
  console.log(
    'ONBOARDING SAVE ERROR',
    error
  );

  openNotice(
    '목표 저장 실패',
    '목표를 계정에 저장하지 못했어요. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.'
  );
}
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor:
              theme.background,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.progressHeader}>
          <Text
            style={[
              styles.progressLabel,
              { color: theme.subText },
            ]}
          >
            루트 시작하기
          </Text>

          <Text
            style={[
              styles.progressStep,
              { color: theme.text },
            ]}
          >
            {step} / {TOTAL_STEPS}
          </Text>
        </View>

        <View
          style={[
            styles.progressBarBg,
            {
              backgroundColor:
                theme.card2,
              borderRadius: isCityBlack
                ? 2
                : 999,
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor:
                  theme.button,
                borderRadius:
                  isCityBlack ? 2 : 999,
              },
            ]}
          />
        </View>

        {step === 1 && (
          <>
            <View
              style={[
                styles.card,
                cardTheme,
              ]}
            >
              <Text
                style={[
                  styles.title,
                  { color: theme.text },
                ]}
              >
                어떤 여정을 시작하시겠습니까?
              </Text>

              <Text
                style={[
                  styles.sub,
                  { color: theme.subText },
                ]}
              >
                이루고 싶은 결과를 자유롭게 입력해 주세요.
              </Text>

              <TextInput
                value={goal}
                onChangeText={setGoal}
                maxLength={30}
                placeholder="예: 체중 5kg 감량하기"
                placeholderTextColor={
                  theme.mutedText
                }
                style={[
                  styles.input,
                  inputTheme,
                ]}
              />

              <View
                style={styles.exampleWrap}
              >
                {[
                  '체중 5kg 감량하기',
                  '영어 공부 습관 만들기',
                  '금연 성공하기',
                  '업무 집중력 높이기',
                ].map((item) => (
                  <Pressable
                    key={item}
                    onPress={() =>
                      setGoal(item)
                    }
                    style={[
                      styles.exampleButton,
                      {
                        backgroundColor:
                          theme.card2,
                        borderColor:
                          theme.line,
                        borderRadius:
                          isCityBlack
                            ? 4
                            : 999,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.exampleText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.firstStepButtonBox}>
  <Pressable
    onPress={() => {
      const goalError =
        validateText(goal, {
          label: '결과목표',
          min: 2,
          max: 30,
        });

      if (goalError) {
        openNotice(
          '결과목표 확인',
          goalError
        );

        return;
      }

      goToStep(2);
    }}
    style={[
      styles.nextButton,
      primaryButtonTheme,
    ]}
  >
    <Text
      style={[
        styles.nextText,
        {
          color:
            theme.buttonText,
        },
      ]}
    >
      다음 →
    </Text>
  </Pressable>

<Pressable
  style={[
    styles.loginChoiceButton,
    secondaryButtonTheme,
  ]}
  onPress={() => {
    router.replace({
      pathname: '/login',
      params: {
        showChoices: '1',
      },
    });
  }}
>
  <Text
    style={[
      styles.loginChoiceButtonText,
      {
        color: theme.text,
      },
    ]}
  >
    로그인 방식 다시 선택
  </Text>
</Pressable>

</View>
          </>
        )}

        {step === 2 && (
          <View
            style={[
              styles.card,
              cardTheme,
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: theme.text },
              ]}
            >
              이 목표는 어떤 영역인가요?
            </Text>

            <Text
              style={[
                styles.sub,
                { color: theme.subText },
              ]}
            >
              가장 가까운 카테고리를 선택해 주세요.
            </Text>

            <View
              style={styles.categoryRow}
            >
              {CATEGORIES.map((item) => {
                const selected =
                  category === item.id;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() =>
                      setCategory(
                        item.id as CategoryId
                      )
                    }
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor:
                          selected
                            ? theme.button
                            : theme.card2,
                        borderColor:
                          selected
                            ? theme.strongLine
                            : theme.line,
                        borderRadius:
                          isCityBlack
                            ? 4
                            : 22,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.categoryIcon
                      }
                    >
                      {item.icon}
                    </Text>

                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color: selected
                            ? theme.buttonText
                            : theme.text,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <Pressable
                onPress={() =>
                  goToStep(1)
                }
                style={[
                  styles.backButton,
                  secondaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.backText,
                    { color: theme.text },
                  ]}
                >
                  ← 이전
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!category) {
                    openNotice(
                      '카테고리 선택',
                      '목표 카테고리를 선택해 주세요.'
                    );
                    return;
                  }

                  goToStep(3);
                }}
                style={[
                  styles.nextButton,
                  primaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.nextText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  다음 →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 3 && (
          <View
            style={[
              styles.card,
              cardTheme,
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: theme.text },
              ]}
            >
              얼마 동안 도전하시겠습니까?
            </Text>

            <Text
              style={[
                styles.sub,
                { color: theme.subText },
              ]}
            >
              기본 기간을 선택하거나 직접 입력해 주세요.
            </Text>

            <View
              style={styles.durationWrap}
            >
              {DURATIONS.map((item) => {
                const selected =
                  duration === item;

                return (
                  <Pressable
                    key={item}
                    onPress={() =>
                      setDuration(item)
                    }
                    style={[
                      styles.durationButton,
                      {
                        backgroundColor:
                          selected
                            ? theme.button
                            : theme.card2,
                        borderColor:
                          selected
                            ? theme.strongLine
                            : theme.line,
                        borderRadius:
                          isCityBlack
                            ? 4
                            : 18,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        {
                          color: selected
                            ? theme.buttonText
                            : theme.text,
                        },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={styles.customDurationRow}
            >
              <TextInput
                value={duration.replace(
                  '주',
                  ''
                )}
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(text) => {
                  const onlyNumber =
                    text.replace(
                      /[^0-9]/g,
                      ''
                    );

                  setDuration(
                    onlyNumber
                      ? `${onlyNumber}주`
                      : ''
                  );
                }}
                placeholder="직접 입력"
                placeholderTextColor={
                  theme.mutedText
                }
                style={[
                  styles.customDurationInput,
                  inputTheme,
                ]}
              />

              <Text
                style={[
                  styles.customDurationText,
                  { color: theme.text },
                ]}
              >
                주
              </Text>
            </View>

            <View style={styles.navRow}>
              <Pressable
                onPress={() =>
                  goToStep(2)
                }
                style={[
                  styles.backButton,
                  secondaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.backText,
                    { color: theme.text },
                  ]}
                >
                  ← 이전
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const weekValue =
                    Number(
                      duration.replace(
                        '주',
                        ''
                      )
                    );

                  if (
                    !weekValue ||
                    weekValue < 1 ||
                    weekValue > 104
                  ) {
                    openNotice(
                      '기간 확인',
                      '기간은 1주부터 104주 사이로 입력해 주세요.'
                    );
                    return;
                  }

                  goToStep(4);
                }}
                style={[
                  styles.nextButton,
                  primaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.nextText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  다음 →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 4 && (
          <View
            style={[
              styles.card,
              cardTheme,
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: theme.text },
              ]}
            >
              {category === 'exercise'
                ? '어떤 운동을 하시겠습니까?'
                : '이 목표를 위해 어떤 행동을 하시겠습니까?'}
            </Text>

            <Text
              style={[
                styles.sub,
                { color: theme.subText },
              ]}
            >
              {category === 'exercise'
                ? '운동 종류를 선택해 주세요.'
                : '반복할 행동 목표를 입력해 주세요.'}
            </Text>

            {category === 'exercise' ? (
              <>
                <View
                  style={
                    styles.exerciseGrid
                  }
                >
                  {EXERCISE_TYPES.map(
                    (item) => {
                      const selected =
                        exerciseType ===
                        item.label;

                      return (
                        <Pressable
                          key={item.label}
                          onPress={() => {
                            setExerciseType(
                              item.label
                            );

                            if (
                              item.label !==
                              '기타'
                            ) {
                              setActionGoal(
                                item.label
                              );
                              setCustomExerciseName(
                                ''
                              );
                            } else {
                              setActionGoal('');
                              setCustomExerciseName(
                                ''
                              );
                            }
                          }}
                          style={[
                            styles.exerciseButton,
                            {
                              backgroundColor:
                                selected
                                  ? theme.button
                                  : theme.card2,
                              borderColor:
                                selected
                                  ? theme.strongLine
                                  : theme.line,
                              borderRadius:
                                isCityBlack
                                  ? 4
                                  : 20,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.exerciseText,
                              {
                                color: selected
                                  ? theme.buttonText
                                  : theme.text,
                              },
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>

                {exerciseType ===
                  '기타' && (
                  <TextInput
                    value={
                      customExerciseName
                    }
                    onChangeText={(text) => {
                      setCustomExerciseName(
                        text
                      );
                      setActionGoal(text);
                    }}
                    maxLength={
  ACTION_GOAL_MAX_LENGTH
}
                    placeholder="예: 농구, 복싱, 필라테스"
                    placeholderTextColor={
                      theme.mutedText
                    }
                    style={[
                      styles.input,
                      inputTheme,
                    ]}
                  />
                )}
              </>
            ) : (
              <TextInput
                value={actionGoal}
                onChangeText={setActionGoal}
                maxLength={20}
                placeholder="예: 영어 단어 30개 외우기"
                placeholderTextColor={
                  theme.mutedText
                }
                style={[
                  styles.input,
                  inputTheme,
                ]}
              />
            )}

            <View style={styles.navRow}>
              <Pressable
                onPress={() =>
                  goToStep(3)
                }
                style={[
                  styles.backButton,
                  secondaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.backText,
                    { color: theme.text },
                  ]}
                >
                  ← 이전
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const actionGoalError =
  validateText(
    actionGoal,
    {
      label: '행동목표',
      min:
        ACTION_GOAL_MIN_LENGTH,
      max:
        ACTION_GOAL_MAX_LENGTH,
    }
  );
                  if (actionGoalError) {
                    openNotice(
                      '행동목표 확인',
                      actionGoalError
                    );
                    return;
                  }

                  goToStep(5);
                }}
                style={[
                  styles.nextButton,
                  primaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.nextText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  다음 →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 5 && (
          <View
            style={[
              styles.card,
              cardTheme,
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: theme.text },
              ]}
            >
              이 행동은 어떻게 기록할까요?
            </Text>

            <Text
              style={[
                styles.sub,
                { color: theme.subText },
              ]}
            >
              행동에 맞는 기록 방식을 선택해 주세요.
            </Text>

            {[
              {
                title:
                  '시간기록형' as ActionType,
                desc:
                  category === 'exercise'
                    ? '시간 측정, GPS 이동거리 기록, 칼로리 계산이 가능합니다.'
                    : '행동에 사용한 시간을 측정합니다.',
              },
              {
                title:
                  '확인형' as ActionType,
                desc:
                  '행동을 완료한 뒤 확인 버튼을 누릅니다.',
              },
              
            ].map((item) => {
              const selected =
                actionType === item.title;

              return (
                <Pressable
                  key={item.title}
                  onPress={() =>
                    setActionType(
                      item.title
                    )
                  }
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor:
                        selected
                          ? theme.button
                          : theme.card2,
                      borderColor:
                        selected
                          ? theme.strongLine
                          : theme.line,
                      borderRadius:
                        isCityBlack
                          ? 4
                          : 22,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeTitle,
                      {
                        color: selected
                          ? theme.buttonText
                          : theme.text,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>

                  <Text
                    style={[
                      styles.typeDesc,
                      {
                        color: selected
                          ? theme.buttonText
                          : theme.subText,
                        opacity: selected
                          ? 0.85
                          : 1,
                      },
                    ]}
                  >
                    {item.desc}
                  </Text>
                </Pressable>
              );
            })}

            <View style={styles.navRow}>
              <Pressable
                onPress={() =>
                  goToStep(4)
                }
                style={[
                  styles.backButton,
                  secondaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.backText,
                    { color: theme.text },
                  ]}
                >
                  ← 이전
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  goToStep(6)
                }
                style={[
                  styles.nextButton,
                  primaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.nextText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  다음 →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 6 && (
          <View
            style={[
              styles.card,
              cardTheme,
            ]}
          >
            <Text
  style={[
    styles.title,
    { color: theme.text },
  ]}
>
  얼마나 자주 할까요?
</Text>

<Text
  style={[
    styles.sub,
    { color: theme.subText },
  ]}
>
  요일을 정하거나 일주일 횟수로 설정해 주세요.
</Text>

<View
  style={
    styles.repeatTypeRow
  }
>
  {REPEAT_TYPES.map((item) => {
    const selected =
      repeatType === item.id;

    return (
      <Pressable
        key={item.id}
        onPress={() =>
          setRepeatType(item.id)
        }
        style={[
          styles.repeatTypeButton,
          {
            backgroundColor:
              selected
                ? theme.button
                : theme.card2,

            borderColor:
              selected
                ? theme.strongLine
                : theme.line,

            borderRadius:
              isCityBlack
                ? 4
                : 16,
          },
        ]}
      >
        <Text
          style={[
            styles.repeatTypeText,
            {
              color:
                selected
                  ? theme.buttonText
                  : theme.text,
            },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  })}
</View>

{repeatType === 'weekdays' ? (
  <>
    <Text
      style={[
        styles.repeatGuideText,
        { color: theme.subText },
      ]}
    >
      반복할 요일을 선택해 주세요.
    </Text>

    <View
      style={
        styles.daySelectRow
      }
    >
      {DAY_OPTIONS.map(
        (day, index) => {
          const selected =
            selectedDays.includes(
              index
            );

          return (
            <Pressable
              key={day}
              onPress={() =>
                toggleSelectedDay(
                  index
                )
              }
              style={[
                styles.daySelectButton,
                {
                  backgroundColor:
                    selected
                      ? theme.button
                      : theme.card2,

                  borderColor:
                    selected
                      ? theme.strongLine
                      : theme.line,

                  borderRadius:
                    isCityBlack
                      ? 4
                      : 14,
                },
              ]}
            >
              <Text
                style={[
                  styles.daySelectText,
                  {
                    color:
                      selected
                        ? theme.buttonText
                        : theme.text,
                  },
                ]}
              >
                {day}
              </Text>
            </Pressable>
          );
        }
      )}
    </View>
  </>
) : (
  <>
    <Text
      style={[
        styles.repeatGuideText,
        { color: theme.subText },
      ]}
    >
      원하는 날 자유롭게 수행할 횟수를 선택해 주세요.
    </Text>

    <View
      style={
        styles.numberRow
      }
    >
      {[1, 2, 3, 4, 5, 6, 7].map(
        (number) => {
          const selected =
            weeklyCount ===
            number;

          return (
            <Pressable
              key={number}
              onPress={() =>
                setWeeklyCount(
                  number
                )
              }
              style={[
                styles.numberButton,
                {
                  backgroundColor:
                    selected
                      ? theme.button
                      : theme.card2,

                  borderColor:
                    selected
                      ? theme.strongLine
                      : theme.line,

                  borderRadius:
                    isCityBlack
                      ? 4
                      : 14,
                },
              ]}
            >
              <Text
                style={[
                  styles.numberText,
                  {
                    color:
                      selected
                        ? theme.buttonText
                        : theme.text,
                  },
                ]}
              >
                {number}
              </Text>
            </Pressable>
          );
        }
      )}
    </View>
  </>
)}

<View
  style={[
    styles.weekSummaryBox,
    {
      backgroundColor:
        theme.card2,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 18,
    },
  ]}
>
  <Text
    style={[
      styles.weekText,
      { color: theme.text },
    ]}
  >
    {repeatType === 'weekdays'
      ? selectedDayLabels.length > 0
        ? `매주 ${selectedDayLabels.join(
            '·'
          )}`
        : '요일을 선택해 주세요.'
      : `원하는 날 주 ${weeklyCount}회`}
  </Text>

  <Text
    style={[
      styles.weekSubText,
      { color: theme.subText },
    ]}
  >
    꾸준히 실천할 수 있는 일정으로 시작해 보세요.
  </Text>
</View>

            <View style={styles.navRow}>
              <Pressable
                onPress={() =>
                  goToStep(5)
                }
                style={[
                  styles.backButton,
                  secondaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.backText,
                    { color: theme.text },
                  ]}
                >
                  ← 이전
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
  if (
    repeatType === 'weekdays' &&
    selectedDays.length === 0
  ) {
    openNotice(
      '요일 선택',
      '반복할 요일을 한 개 이상 선택해 주세요.'
    );

    return;
  }

  goToStep(7);
}}
                style={[
                  styles.nextButton,
                  primaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.nextText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  다음 →
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 7 && (
          <>
            <View
              style={[
                styles.card,
                cardTheme,
              ]}
            >
              <Text
                style={[
                  styles.title,
                  { color: theme.text },
                ]}
              >
                이 여정을 함께 걸을 이름을 정해 주세요
              </Text>

              <Text
                style={[
                  styles.sub,
                  { color: theme.subText },
                ]}
              >
                루트에서 사용할 닉네임을 입력해 주세요.
              </Text>

              <View
                style={[
                  styles.foxBox,
                  {
                    backgroundColor:
                      theme.card2,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 4
                        : 28,
                  },
                ]}
              >
                <Text style={styles.foxEmoji}>
                  🦊
                </Text>
              </View>

              <TextInput
                value={nickname}
                onChangeText={setNickname}
                maxLength={12}
                autoCapitalize="none"
                placeholder="닉네임 입력"
                placeholderTextColor={
                  theme.mutedText
                }
                style={[
                  styles.input,
                  inputTheme,
                ]}
              />

              <Text
                style={[
                  styles.nicknameDesc,
                  { color: theme.subText },
                ]}
              >
                예시: 성장의길 · 턱걸이10 · 루트워커
              </Text>

              <Text
                style={[
                  styles.nicknameDesc,
                  { color: theme.mutedText },
                ]}
              >
                닉네임은 설정에서 나중에 변경할 수 있어요.
              </Text>
            </View>

            <View style={styles.navRow}>
              <Pressable
                onPress={() =>
                  goToStep(6)
                }
                style={[
                  styles.backButton,
                  secondaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.backText,
                    { color: theme.text },
                  ]}
                >
                  ← 이전
                </Text>
              </Pressable>

              <Pressable
                onPress={
                  finishOnboarding
                }
                style={[
                  styles.nextButton,
                  primaryButtonTheme,
                ]}
              >
                <Text
                  style={[
                    styles.nextText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  시작하기
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={noticeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setNoticeModal(null)
        }
      >
        <Pressable
          style={styles.noticeOverlay}
          onPress={() =>
            setNoticeModal(null)
          }
        >
          <Pressable
            style={[
              styles.noticeBox,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack ? 4 : 24,
              },
            ]}
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <Text
              style={[
                styles.noticeTitle,
                { color: theme.text },
              ]}
            >
              {noticeModal?.title}
            </Text>

            <Text
              style={[
                styles.noticeMessage,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {noticeModal?.message}
            </Text>

            <Pressable
              style={[
                styles.noticeButton,
                primaryButtonTheme,
              ]}
              onPress={() =>
                setNoticeModal(null)
              }
            >
              <Text
                style={[
                  styles.noticeButtonText,
                  {
                    color:
                      theme.buttonText,
                  },
                ]}
              >
                확인
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 80,
  },

  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  progressLabel: {
    fontSize: 14,
    fontWeight: '800',
  },

  progressStep: {
    fontSize: 15,
    fontWeight: '900',
  },

  progressBarBg: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    marginBottom: 20,
  },

  progressBarFill: {
    height: '100%',
  },

  card: {
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 32,
  },

  sub: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },

  input: {
    marginTop: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 17,
    fontSize: 18,
    fontWeight: '700',
  },

  exampleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    gap: 10,
  },

  exampleButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
  },

  exampleText: {
    fontSize: 14,
    fontWeight: '800',
  },

  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },

  backButton: {
    flex: 1,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  nextButton: {
    flex: 1,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 17,
    fontWeight: '900',
  },

  nextText: {
    fontSize: 17,
    fontWeight: '900',
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 7,
    marginTop: 22,
  },

  categoryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 17,
    borderWidth: 1,
  },

  categoryIcon: {
    fontSize: 31,
  },

  categoryText: {
    marginTop: 9,
    fontSize: 15,
    fontWeight: '900',
  },

  durationWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 22,
  },

  durationButton: {
    width: '31.5%',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },

  durationText: {
    fontSize: 18,
    fontWeight: '900',
  },

  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  customDurationInput: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 19,
    fontWeight: '800',
  },

  customDurationText: {
    marginLeft: 10,
    fontSize: 21,
    fontWeight: '900',
  },

  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  exerciseButton: {
    width: '48.5%',
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 11,
    borderWidth: 1,
  },

  exerciseText: {
    fontSize: 17,
    fontWeight: '900',
  },

  typeButton: {
    borderWidth: 1,
    padding: 18,
    marginTop: 14,
  },

  typeTitle: {
    fontSize: 19,
    fontWeight: '900',
  },

  typeDesc: {
    marginTop: 7,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },

  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 24,
  },

  numberButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  numberText: {
    fontSize: 19,
    fontWeight: '900',
  },

  weekSummaryBox: {
    marginTop: 20,
    padding: 18,
    borderWidth: 1,
  },

  weekText: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  weekSubText: {
    marginTop: 7,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },

  foxBox: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 22,
    marginBottom: 6,
    borderWidth: 1,
  },

  foxEmoji: {
    fontSize: 48,
  },

  nicknameDesc: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  noticeOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  noticeBox: {
    width: '100%',
    maxWidth: 420,
    padding: 22,
    borderWidth: 1,
  },

  noticeTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },

  noticeMessage: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },

  noticeButton: {
    marginTop: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },

  noticeButtonText: {
    fontSize: 17,
    fontWeight: '900',
  },
  repeatTypeRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 24,
},

repeatTypeButton: {
  flex: 1,
  paddingVertical: 15,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
},

repeatTypeText: {
  fontSize: 17,
  fontWeight: '900',
},

repeatGuideText: {
  marginTop: 18,
  marginBottom: 10,
  fontSize: 14,
  fontWeight: '700',
  lineHeight: 20,
},

daySelectRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 6,
},

daySelectButton: {
  flex: 1,
  height: 50,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
},

daySelectText: {
  fontSize: 17,
  fontWeight: '900',
},

googleLoginMoveButton: {
  width: '100%',

  minHeight: 48,

  paddingHorizontal: 16,
  paddingVertical: 12,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

googleLoginMoveText: {
  fontSize: 15,
  fontWeight: '900',
},
firstStepButtonBox: {
  width: '100%',
  marginTop: 4,
  marginBottom: 20,
  gap: 10,
},

loginChoiceButton: {
  width: '100%',

  minHeight: 44,

  paddingHorizontal: 14,
  paddingVertical: 10,

  alignItems: 'center',
  justifyContent: 'center',
},

loginChoiceButtonText: {
  fontSize: 15,
  fontWeight: '900',
},
});