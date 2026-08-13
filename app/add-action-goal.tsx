import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
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

import {
  getRootCloudUidOrNull,
} from '../store/rootCloudSession';

// ROOT_EXPLORE_V12D91A_ACTION_GOAL_EFFECTIVE_FIREBASE_USER_BOUNDARY
function getRootEffectiveActionGoalFirebaseUser() {
  const cloudUid =
    getRootCloudUidOrNull();

  if (!cloudUid) {
    return null;
  }

  const firebaseUser =
    auth().currentUser;

  if (
    !firebaseUser?.uid ||
    firebaseUser.uid !==
      cloudUid
  ) {
    return null;
  }

  return firebaseUser;
}

type CategoryId =
  | 'exercise'
  | 'study'
  | 'mental'
  | 'daily';

type ActionType =
  | '확인형'
  | '시간기록형';
  

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

const TOTAL_STEPS = 4;

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

const ACTION_TYPES: {
  title: ActionType;
  desc: (
    category: CategoryId
  ) => string;
}[] = [
  {
    title: '확인형',
    desc: () =>
      '행동을 완료한 뒤 확인 버튼을 누릅니다.',
  },
  {
    title: '시간기록형',
    desc: (category) =>
      category === 'exercise'
        ? '시간 측정, GPS 이동거리 기록, 칼로리 계산이 가능합니다.'
        : '행동에 사용한 시간을 측정합니다.',
  },
  
];

function getParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function isCategoryId(
  value: string | undefined
): value is CategoryId {
  return (
    value === 'exercise' ||
    value === 'study' ||
    value === 'mental' ||
    value === 'daily'
  );
}

function getCategoryInfo(
  category: CategoryId
) {
  if (category === 'exercise') {
    return {
      label: '운동',
      icon: '🏃',
    };
  }

  if (category === 'study') {
    return {
      label: '공부',
      icon: '📚',
    };
  }

  if (category === 'mental') {
    return {
      label: '정신',
      icon: '🧘',
    };
  }

  return {
    label: '일',
    icon: '💼',
  };
}

export default function AddActionGoalScreen() {
  const { themeMode, theme } =
    useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  const params = useLocalSearchParams<{
    category?: string | string[];
  }>();

  const categoryParam = getParam(
    params.category
  );

  const category: CategoryId =
    isCategoryId(categoryParam)
      ? categoryParam
      : 'daily';

  const categoryInfo =
    getCategoryInfo(category);

  const [step, setStep] =
    useState(1);

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

  const [
    exerciseType,
    setExerciseType,
  ] = useState('');

  const [
    customExerciseName,
    setCustomExerciseName,
  ] = useState('');

  const [noticeModal, setNoticeModal] =
    useState<{
      title: string;
      message: string;
    } | null>(null);

  const scrollRef =
    useRef<ScrollView | null>(null);

  const progressPercent =
    (step / TOTAL_STEPS) * 100;

  const scrollToActionInput = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 470,
        animated: true,
      });
    }, 250);
  };

  const openNotice = (
    title: string,
    message: string
  ) => {
    setNoticeModal({
      title,
      message,
    });
  };

  const goToStep = (
    nextStep: number
  ) => {
    setStep(nextStep);

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 0,
        animated: true,
      });
    }, 50);
  };

  const trimmedActionGoal =
    actionGoal.trim();

    const effectiveWeeklyCount =
  repeatType === 'weekdays'
    ? selectedDays.length
    : weeklyCount;

const selectedDayLabels =
  DAY_OPTIONS.filter(
    (_, index) =>
      selectedDays.includes(
        index
      )
  );

const toggleSelectedDay = (
  dayIndex: number
) => {
  setSelectedDays(
    (previous) => {
      if (
        previous.includes(
          dayIndex
        )
      ) {
        return previous.filter(
          (item) =>
            item !== dayIndex
        );
      }

      return [
        ...previous,
        dayIndex,
      ].sort(
        (a, b) => a - b
      );
    }
  );
};

  const cardTheme = {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderRadius: isCityBlack
      ? 4
      : 24,
  };

  const inputTheme = {
    backgroundColor: theme.card2,
    borderColor: theme.line,
    color: theme.text,
    borderRadius: isCityBlack
      ? 4
      : 20,
  };

  const primaryButtonTheme = {
    backgroundColor: theme.button,
    borderColor: theme.strongLine,
    borderWidth: 1,
    borderRadius: isCityBlack
      ? 4
      : 22,
  };

  const secondaryButtonTheme = {
    backgroundColor: theme.card2,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: isCityBlack
      ? 4
      : 22,
  };

  const moveToTypeStep = () => {
    if (
      category === 'exercise' &&
      !exerciseType
    ) {
      openNotice(
        '운동 선택',
        '운동 종류를 선택해 주세요.'
      );
      return;
    }

   if (
  trimmedActionGoal.length <
    ACTION_GOAL_MIN_LENGTH ||
  trimmedActionGoal.length >
    ACTION_GOAL_MAX_LENGTH
) {
  openNotice(
    '행동목표 확인',
    `행동목표는 ${ACTION_GOAL_MIN_LENGTH}자 이상 ${ACTION_GOAL_MAX_LENGTH}자 이하로 입력해 주세요.`
  );

  return;
}

    goToStep(3);
  };

 const saveActionGoal =
  async () => {
   if (
  trimmedActionGoal.length <
    ACTION_GOAL_MIN_LENGTH ||
  trimmedActionGoal.length >
    ACTION_GOAL_MAX_LENGTH
) {
  openNotice(
    '행동목표 확인',
    `행동목표는 ${ACTION_GOAL_MIN_LENGTH}자 이상 ${ACTION_GOAL_MAX_LENGTH}자 이하로 입력해 주세요.`
  );

  return;
}

    if (
  repeatType ===
    'weekdays' &&
  selectedDays.length === 0
) {
  openNotice(
    '요일 선택',
    '반복할 요일을 한 개 이상 선택해 주세요.'
  );

  return;
}

    const previousData =
      getRootOnboardingData() ??
      {};

const currentResultGoal =
  (
    Array.isArray(
      previousData?.goals
    )
      ? previousData.goals
      : []
  ).find(
    (item: any) =>
      String(
        item?.category ?? ''
      ) ===
      String(category)
  );


    const selectedExercise =
      EXERCISE_TYPES.find(
        (item) =>
          item.label ===
          exerciseType
      );

    const createdAt =
      new Date()
        .toISOString();

    const newActionGoal = {
      id:
        Date.now(),

      title:
        trimmedActionGoal,

      type:
  actionType,

repeatType,

selectedDays:
  repeatType ===
  'weekdays'
    ? [...selectedDays]
    : [],

weeklyCount:
  effectiveWeeklyCount,

/*
 * 기존 홈 호환용입니다.
 * 홈 수정 후에는 날짜 기록을 기준으로
 * 이번 주 진행률을 계산합니다.
 */
completedDays: [],

completedDates: [],

category,

resultGoalId:
  currentResultGoal?.id,

      createdAt,

      exerciseType:
        category ===
        'exercise'
          ? exerciseType
          : undefined,

      customExerciseName:
        category ===
          'exercise' &&
        exerciseType ===
          '기타'
          ? customExerciseName
              .trim()
          : undefined,

      met:
        category ===
          'exercise' &&
        actionType ===
          '시간기록형'
          ? selectedExercise
              ?.met ?? 4
          : undefined,
    };

    const previousActionGoals =
      Array.isArray(
        previousData
          ?.actionGoals
      )
        ? previousData
            .actionGoals
        : [];

    const nextData = {
  ...previousData,

  actionGoals: [
    ...previousActionGoals,
    newActionGoal,
  ],

  updatedAt: createdAt,
};

/*
 * Firestore는 undefined 값을
 * 그대로 저장할 수 없기 때문에 제거합니다.
 */
const safeNextData = JSON.parse(
  JSON.stringify(nextData)
);

const uid =
getRootEffectiveActionGoalFirebaseUser()?.uid ??
  previousData?.uid;

const shouldSaveToServer =
  Boolean(
    uid &&
    previousData?.isGuest !== true
  );

   try {
  /*
   * 1. 로컬에 먼저 저장합니다.
   *
   * Firestore가 느리거나 실패해도
   * 행동목표는 홈에 즉시 반영됩니다.
   */
  await saveRootOnboardingData(
    safeNextData
  );

  console.log(
    'ACTION GOAL LOCAL SAVE DONE',
    {
      id:
        newActionGoal.id,

      category:
        newActionGoal.category,

      title:
        newActionGoal.title,

      type:
        newActionGoal.type,

      repeatType:
        newActionGoal.repeatType,

      selectedDays:
        newActionGoal.selectedDays,

      weeklyCount:
        newActionGoal.weeklyCount,

      actionGoalCount:
        safeNextData
          .actionGoals
          .length,
    }
  );

  /*
   * 2. 홈으로 바로 이동합니다.
   */
  router.replace(
    '/(tabs)'
  );

  /*
   * 3. 로그인 사용자의 서버 저장은
   * 별도로 진행합니다.
   *
   * await하지 않으므로 서버 지연이
   * 화면 이동을 막지 않습니다.
   */
  if (
    shouldSaveToServer &&
    uid
  ) {
    console.log(
      'ACTION GOAL FIRESTORE SAVE START',
      uid
    );

    firestore()
      .collection('users')
      .doc(uid)
      .set(
        {
          rootData:
            safeNextData,

          updatedAt:
            createdAt,
        },
        {
          merge: true,
        }
      )
      .then(() => {
        console.log(
          'ACTION GOAL FIRESTORE SAVE DONE',
          uid
        );
      })
      .catch((error) => {
        console.log(
          'ACTION GOAL FIRESTORE SAVE ERROR',
          error
        );
      });
  }
} catch (error) {
  console.log(
    'ACTION GOAL LOCAL SAVE ERROR',
    error
  );

  openNotice(
    '행동목표 저장 실패',
    '행동목표를 기기에 저장하지 못했어요. 다시 시도해 주세요.'
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
        ref={scrollRef}
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
          styles.content
        }
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (step > 1) {
                goToStep(step - 1);
                return;
              }

              router.back();
            }}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor:
                  theme.card2,
                borderColor: theme.line,
                borderRadius:
                  isCityBlack ? 4 : 20,
                opacity: pressed
                  ? 0.7
                  : 1,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={26}
              color={theme.text}
            />
          </Pressable>

          <View
            style={
              styles.headerTitleWrap
            }
          >
            <Text
              style={[
                styles.topTitle,
                { color: theme.text },
              ]}
            >
              행동목표 추가
            </Text>

            <Text
              style={[
                styles.topSub,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              작은 행동이 목표를 현실로 만들어요.
            </Text>
          </View>
        </View>

        <View
          style={
            styles.progressHeader
          }
        >
          <Text
            style={[
              styles.progressText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {step} / {TOTAL_STEPS}
          </Text>

          <Text
            style={[
              styles.categoryLabel,
              { color: theme.text },
            ]}
          >
            {categoryInfo.icon}{' '}
            {categoryInfo.label}
          </Text>
        </View>

        <View
          style={[
            styles.progressBarBg,
            {
              backgroundColor:
                theme.card2,
              borderRadius:
                isCityBlack ? 2 : 999,
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
                  isCityBlack
                    ? 2
                    : 999,
              },
            ]}
          />
        </View>

        {step === 1 && (
          <>
            <View
              style={[
                styles.characterCard,
                cardTheme,
              ]}
            >
              <Text
                style={
                  styles.character
                }
              >
                {categoryInfo.icon}
              </Text>

              <Text
                style={[
                  styles.title,
                  { color: theme.text },
                ]}
              >
                새 행동목표를 만들어요
              </Text>

              <Text
                style={[
                  styles.sub,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                결과목표에 가까워질 수 있는 작은 행동을 하나 정해 보세요.
              </Text>
            </View>

            <View
              style={[
                styles.infoCard,
                cardTheme,
              ]}
            >
              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                카테고리
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  { color: theme.text },
                ]}
              >
                {categoryInfo.label}
              </Text>
            </View>

            <View
              style={[
                styles.infoCard,
                cardTheme,
              ]}
            >
              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                상태
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  { color: theme.text },
                ]}
              >
                기존 결과목표에 행동목표 추가
              </Text>
            </View>

            <Pressable
              style={[
                styles.mainButton,
                primaryButtonTheme,
              ]}
              onPress={() =>
                goToStep(2)
              }
            >
              <Text
                style={[
                  styles.mainButtonText,
                  {
                    color:
                      theme.buttonText,
                  },
                ]}
              >
                행동 이름 입력하기
              </Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <View
              style={[
                styles.characterCard,
                cardTheme,
              ]}
            >
              <Text
                style={
                  styles.character
                }
              >
                {category ===
                'exercise'
                  ? '🏃'
                  : categoryInfo.icon}
              </Text>

              <Text
                style={[
                  styles.title,
                  { color: theme.text },
                ]}
              >
                {category ===
                'exercise'
                  ? '어떤 운동을 할까요?'
                  : '어떤 행동을 할 건가요?'}
              </Text>

              <Text
                style={[
                  styles.sub,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {category ===
                'exercise'
                  ? '운동 종류는 칼로리 계산에 활용돼요.'
                  : '작게라도 바로 시작할 수 있는 행동을 적어보세요.'}
              </Text>
            </View>

            {category ===
            'exercise' ? (
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
                  <>
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      운동 이름 직접 입력
                    </Text>

                    <TextInput
                      value={
                        customExerciseName
                      }
                      onChangeText={(
                        text
                      ) => {
                        setCustomExerciseName(
                          text
                        );
                        setActionGoal(text);
                      }}
                      onFocus={
                        scrollToActionInput
                      }
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

                    <Text
                      style={[
                        styles.inputCount,
                        {
                          color:
                            theme.mutedText,
                        },
                      ]}
                    >
                      {customExerciseName.length}{' '}
/ {ACTION_GOAL_MAX_LENGTH}
                    
                    </Text>
                  </>
                )}
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text },
                  ]}
                >
                  행동 이름
                </Text>

                <TextInput
                  value={actionGoal}
                  onChangeText={
                    setActionGoal
                  }
                  onFocus={
                    scrollToActionInput
                  }
                  maxLength={
  ACTION_GOAL_MAX_LENGTH
}
                  placeholder="예: 책 10쪽 읽기"
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
                    styles.inputCount,
                    {
                      color:
                        theme.mutedText,
                    },
                  ]}
                >
                  {actionGoal.length} / {ACTION_GOAL_MAX_LENGTH}
                </Text>
              </>
            )}

            <View
              style={
                styles.stepButtonRow
              }
            >
              <Pressable
                style={[
                  styles.secondaryButton,
                  secondaryButtonTheme,
                ]}
                onPress={() =>
                  goToStep(1)
                }
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: theme.text },
                  ]}
                >
                  이전
                </Text>
              </Pressable>

              <Pressable
                disabled={
                  trimmedActionGoal.length <
                  2
                }
                style={[
                  styles.mainButton,
                  styles.stepMainButton,
                  primaryButtonTheme,
                  {
                    opacity:
                      trimmedActionGoal.length <
                      2
                        ? 0.4
                        : 1,
                  },
                ]}
                onPress={
                  moveToTypeStep
                }
              >
                <Text
                  style={[
                    styles.mainButtonText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  행동유형 선택하기
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View
              style={[
                styles.characterCard,
                cardTheme,
              ]}
            >
              <Text
                style={
                  styles.character
                }
              >
                ⏱️
              </Text>

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
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                행동에 맞는 기록 방식을 선택해 주세요.
              </Text>
            </View>

            {ACTION_TYPES.map(
              (item) => {
                const selected =
                  actionType ===
                  item.title;

                return (
                  <Pressable
                    key={item.title}
                    onPress={() =>
                      setActionType(
                        item.title
                      )
                    }
                    style={[
                      styles.typeCard,
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
                      {item.desc(category)}
                    </Text>
                  </Pressable>
                );
              }
            )}

            <View
              style={
                styles.stepButtonRow
              }
            >
              <Pressable
                style={[
                  styles.secondaryButton,
                  secondaryButtonTheme,
                ]}
                onPress={() =>
                  goToStep(2)
                }
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: theme.text },
                  ]}
                >
                  이전
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.mainButton,
                  styles.stepMainButton,
                  primaryButtonTheme,
                ]}
                onPress={() =>
                  goToStep(4)
                }
              >
                <Text
                  style={[
                    styles.mainButtonText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  다음으로
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <View
              style={[
                styles.characterCard,
                cardTheme,
              ]}
            >
              <Text
                style={
                  styles.character
                }
              >
                📅
              </Text>

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
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                꾸준히 반복할 수 있는 횟수를 선택해 주세요.
              </Text>
            </View>

            <View
              style={[
                styles.infoCard,
                cardTheme,
              ]}
            >
              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                행동목표
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  { color: theme.text },
                ]}
              >
                {trimmedActionGoal}
              </Text>
            </View>

            <View
              style={[
                styles.infoCard,
                cardTheme,
              ]}
            >
              <Text
                style={[
                  styles.infoLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                행동유형
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  { color: theme.text },
                ]}
              >
                {actionType}
              </Text>
            </View>

          <Text
  style={[
    styles.sectionTitle,
    {
      color:
        theme.text,
    },
  ]}
>
  얼마나 자주 할까요?
</Text>

<View
  style={
    styles.repeatTypeRow
  }
>
  {REPEAT_TYPES.map(
    (item) => {
      const selected =
        repeatType ===
        item.id;

      return (
        <Pressable
          key={item.id}
          onPress={() => {
            setRepeatType(
              item.id
            );
                     }}
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
    }
  )}
</View>

{repeatType ===
'weekdays' ? (
  <>
    <Text
      style={[
        styles.repeatGuideText,
        {
          color:
            theme.subText,
        },
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
        {
          color:
            theme.subText,
        },
      ]}
    >
      원하는 날 자유롭게 수행할 횟수를 선택해 주세요.
    </Text>

    <View
      style={
        styles.numberRow
      }
    >
      {[
        1,
        2,
        3,
        4,
        5,
        6,
        7,
      ].map(
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
    styles.repeatBox,
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
      styles.repeatText,
      {
        color:
          theme.text,
      },
    ]}
  >
    {repeatType ===
    'weekdays'
      ? selectedDayLabels
          .length > 0
        ? `반복 일정 · 매주 ${selectedDayLabels.join(
            '·'
          )}`
        : '반복할 요일을 선택해 주세요.'
      : `반복 일정 · 원하는 날 주 ${weeklyCount}회`}
  </Text>
</View>

            <View
              style={
                styles.stepButtonRow
              }
            >
              <Pressable
                style={[
                  styles.secondaryButton,
                  secondaryButtonTheme,
                ]}
                onPress={() =>
                  goToStep(3)
                }
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: theme.text },
                  ]}
                >
                  이전
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  primaryButtonTheme,
                ]}
                onPress={
                  saveActionGoal
                }
              >
                <Text
                  style={[
                    styles.saveText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  저장하기 🦊
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

  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 180,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  headerTitleWrap: {
    flex: 1,
    marginLeft: 14,
  },

  topTitle: {
    fontSize: 24,
    fontWeight: '900',
  },

  topSub: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 9,
  },

  progressText: {
    fontSize: 14,
    fontWeight: '800',
  },

  categoryLabel: {
    fontSize: 14,
    fontWeight: '900',
  },

  progressBarBg: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    marginBottom: 22,
  },

  progressBarFill: {
    height: '100%',
  },

  characterCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderWidth: 1,
  },

  character: {
    fontSize: 54,
  },

  title: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 38,
  },

  sub: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },

  infoCard: {
    marginTop: 16,
    padding: 20,
    borderWidth: 1,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '800',
  },

  infoValue: {
    marginTop: 7,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 28,
  },

  mainButton: {
    marginTop: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainButtonText: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },

  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  exerciseButton: {
    width: '48.5%',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 11,
    borderWidth: 1,
  },

  exerciseText: {
    fontSize: 18,
    fontWeight: '900',
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 13,
    fontSize: 21,
    fontWeight: '900',
  },

  input: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 17,
    fontSize: 18,
    fontWeight: '700',
  },

  inputCount: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  typeCard: {
    marginBottom: 12,
    padding: 20,
    borderWidth: 1,
  },

  typeTitle: {
    fontSize: 21,
    fontWeight: '900',
  },

  typeDesc: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },

  stepButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },

  secondaryButton: {
    flex: 0.8,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '900',
  },

  stepMainButton: {
    flex: 1.5,
    marginTop: 0,
  },

  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },

  numberButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  numberText: {
    fontSize: 19,
    fontWeight: '900',
  },

  repeatBox: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
  },

  repeatText: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },

  saveButton: {
    flex: 1.5,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveText: {
    fontSize: 19,
    fontWeight: '900',
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
  marginTop: 4,
},

repeatTypeButton: {
  flex: 1,
  paddingVertical: 15,
  alignItems: 'center',
  justifyContent:
    'center',
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
  justifyContent:
    'space-between',
  gap: 6,
},

daySelectButton: {
  flex: 1,
  height: 50,
  alignItems: 'center',
  justifyContent:
    'center',
  borderWidth: 1,
},

daySelectText: {
  fontSize: 17,
  fontWeight: '900',
},
});
