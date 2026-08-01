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

const ACTION_TYPES: ActionType[] = [
  '확인형',
  '시간기록형',
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

export default function AddResultGoalScreen() {
  const { themeMode, theme } =
    useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  const params = useLocalSearchParams<{
    category?: string | string[];
    requireActionGoal?:
      | string
      | string[];
  }>();

  const categoryParam = getParam(
    params.category
  );

  const category: CategoryId =
    isCategoryId(categoryParam)
      ? categoryParam
      : 'daily';

  const requireActionGoal =
    getParam(
      params.requireActionGoal
    ) === 'true';

  const categoryInfo =
    getCategoryInfo(category);

  const [goal, setGoal] =
    useState('');
  const [
    durationWeeks,
    setDurationWeeks,
  ] = useState(8);

  const [
    exerciseType,
    setExerciseType,
  ] = useState('');

  const [
    customExerciseName,
    setCustomExerciseName,
  ] = useState('');

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

  const [noticeModal, setNoticeModal] =
    useState<{
      title: string;
      message: string;
    } | null>(null);

  const scrollRef =
    useRef<ScrollView | null>(null);

  const scrollToPosition = (
    y: number
  ) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y,
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

  const trimmedGoal = goal.trim();
  const trimmedActionGoal =
    actionGoal.trim();

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

  const repeatSettingValid =
  !requireActionGoal ||
  repeatType !== 'weekdays' ||
  selectedDays.length > 0;

const exerciseSettingValid =
  !requireActionGoal ||
  category !== 'exercise' ||
  exerciseType.length > 0;

const actionGoalLengthValid =
  !requireActionGoal ||
  (
    trimmedActionGoal.length >=
      ACTION_GOAL_MIN_LENGTH &&
    trimmedActionGoal.length <=
      ACTION_GOAL_MAX_LENGTH
  );

const canSave =
  trimmedGoal.length >= 2 &&
  actionGoalLengthValid &&
  repeatSettingValid &&
  exerciseSettingValid;

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

  const saveGoal =
  async () => {
    if (
      trimmedGoal.length < 2 ||
      trimmedGoal.length > 30
    ) {
      openNotice(
        '결과목표 확인',
        '결과목표는 2자 이상 30자 이하로 입력해 주세요.'
      );

      return;
    }

    if (
      durationWeeks < 1 ||
      durationWeeks > 104
    ) {
      openNotice(
        '기간 확인',
        '도전 기간은 1주부터 104주 사이로 선택해 주세요.'
      );

      return;
    }

    if (requireActionGoal) {
      if (
        category ===
          'exercise' &&
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


    }

    const previousData =
      getRootOnboardingData() ??
      {};

    const previousGoals =
      Array.isArray(
        previousData?.goals
      )
        ? previousData.goals
        : [];

    const previousActionGoals =
      Array.isArray(
        previousData?.actionGoals
      )
        ? previousData
            .actionGoals
        : [];

    const createdAt =
      new Date()
        .toISOString();

    const resultGoalId =
      Date.now();

    const actionGoalId =
      resultGoalId + 1;

    const newGoal = {
      id:
        resultGoalId,

      category,

      resultGoal:
        trimmedGoal,

      duration:
        `${durationWeeks}주`,

      durationWeeks,

      createdAt,
    };

    const selectedExercise =
      EXERCISE_TYPES.find(
        (item) =>
          item.label ===
          exerciseType
      );

    const newActionGoal = {
      id:
        actionGoalId,

      title:
        trimmedActionGoal,

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

      createdAt,

      /*
       * 어떤 결과목표에서 생성됐는지
       * 연결하기 위한 값입니다.
       */
      resultGoalId,

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

    /*
     * 같은 카테고리의 기존 결과목표는 제거하고
     * 새 결과목표를 넣습니다.
     */
    const nextGoals = [
      ...previousGoals.filter(
        (item: any) =>
          String(
            item?.category ??
              ''
          ) !==
          String(category)
      ),

      newGoal,
    ];

    const nextActionGoals =
      requireActionGoal
        ? [
            ...previousActionGoals,

            newActionGoal,
          ]
        : previousActionGoals;

    const nextData = {
  ...previousData,

  goals:
    nextGoals,

  actionGoals:
    nextActionGoals,

  updatedAt:
    createdAt,
};

const safeNextData = JSON.parse(
  JSON.stringify(nextData)
);

const uid =
  auth().currentUser?.uid ??
  previousData?.uid;

const shouldSaveToServer =
  Boolean(
    uid &&
    previousData?.isGuest !== true
  );

    try {
  /*
   * 1. 먼저 로컬에 저장합니다.
   *
   * 서버 연결 상태와 관계없이
   * 홈 화면에서 즉시 목표를 볼 수 있습니다.
   */
  await saveRootOnboardingData(
    safeNextData
  );

  console.log(
    'RESULT GOAL LOCAL SAVE DONE',
    {
      category,

      resultGoalId,

      resultGoal:
        newGoal.resultGoal,

      requireActionGoal,

      actionGoalTitle:
        requireActionGoal
          ? newActionGoal.title
          : null,

      resultGoalCount:
        nextGoals.length,

      actionGoalCount:
        nextActionGoals.length,
    }
  );

  /*
   * 2. 홈으로 먼저 이동합니다.
   */
  router.replace(
  '/(tabs)'
);

  /*
   * 3. 로그인 사용자라면
   * 서버 저장은 별도로 진행합니다.
   *
   * 서버 저장 실패가 로컬 목표 생성을
   * 취소하지 않도록 await하지 않습니다.
   */
  if (
    shouldSaveToServer &&
    uid
  ) {
    console.log(
      'RESULT GOAL FIRESTORE SAVE START',
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
          'RESULT GOAL FIRESTORE SAVE DONE',
          uid
        );
      })
      .catch((error) => {
        console.log(
          'RESULT GOAL FIRESTORE SAVE ERROR',
          error
        );
      });
  }
} catch (error) {
  console.log(
    'RESULT GOAL LOCAL SAVE ERROR',
    error
  );

  openNotice(
    '목표 저장 실패',
    '목표를 기기에 저장하지 못했어요. 다시 시도해 주세요.'
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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor:
                theme.card2,
              borderColor: theme.line,
              borderRadius:
                isCityBlack ? 4 : 20,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.backText,
              { color: theme.text },
            ]}
          >
            ‹
          </Text>
        </Pressable>

        <Text
          style={[
            styles.title,
            { color: theme.text },
          ]}
        >
          결과목표 만들기
        </Text>

        <Text
          style={[
            styles.sub,
            { color: theme.subText },
          ]}
        >
          선택한 카테고리에 새로운 결과목표를 추가해요.
        </Text>

        <View
          style={[
            styles.infoCard,
            cardTheme,
          ]}
        >
          <View
            style={
              styles.categoryInfoRow
            }
          >
            <Text
              style={
                styles.categoryInfoIcon
              }
            >
              {categoryInfo.icon}
            </Text>

            <View>
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
          </View>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          어떤 목표를 이루고 싶나요?
        </Text>

        <TextInput
          value={goal}
          onChangeText={setGoal}
          onFocus={() =>
            scrollToPosition(180)
          }
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

        <Text
          style={[
            styles.inputCount,
            { color: theme.mutedText },
          ]}
        >
          {goal.length} / 30
        </Text>

        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          얼마나 도전할까요?
        </Text>

        <View
          style={[
            styles.weekPickerCard,
            cardTheme,
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            nestedScrollEnabled
            contentContainerStyle={
              styles.weekPicker
            }
          >
            {Array.from(
              { length: 104 },
              (_, index) => index + 1
            ).map((week) => {
              const selected =
                durationWeeks === week;

              return (
                <Pressable
                  key={week}
                  onPress={() =>
                    setDurationWeeks(week)
                  }
                  style={[
                    styles.weekButton,
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
                      styles.weekButtonText,
                      {
                        color: selected
                          ? theme.buttonText
                          : theme.text,
                      },
                    ]}
                  >
                    {week}주
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View
          style={[
            styles.repeatBox,
            {
              backgroundColor:
                theme.card2,
              borderColor: theme.line,
              borderRadius:
                isCityBlack ? 4 : 18,
            },
          ]}
        >
          <Text
            style={[
              styles.repeatText,
              { color: theme.text },
            ]}
          >
            선택 기간 · {durationWeeks}주
          </Text>
        </View>

        {requireActionGoal && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
              ]}
            >
              행동목표도 함께 정해 주세요
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
                                  : 18,
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
                      onFocus={() =>
                        scrollToPosition(
                          560
                        )
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
                <TextInput
                  value={actionGoal}
                  onChangeText={
                    setActionGoal
                  }
                  onFocus={() =>
                    scrollToPosition(520)
                  }
                  maxLength={
  ACTION_GOAL_MAX_LENGTH
}
                  placeholder="예: 단어 30개 외우기"
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
                  {actionGoal.length}{' '}
/ {ACTION_GOAL_MAX_LENGTH}
                </Text>
              </>
            )}

            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
              ]}
            >
              행동 유형
            </Text>

            {ACTION_TYPES.map((type) => {
              const selected =
                actionType === type;

              return (
                <Pressable
                  key={type}
                  onPress={() =>
                    setActionType(type)
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
                          : 18,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      {
                        color: selected
                          ? theme.buttonText
                          : theme.text,
                      },
                    ]}
                  >
                    {type}
                  </Text>

                  <Text
                    style={[
                      styles.typeDescription,
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
                    {type === '시간기록형'
  ? '시간 측정과 GPS 이동거리 기록이 가능합니다.'
  : '행동을 완료한 뒤 확인 버튼을 누릅니다.'}
                  </Text>
                </Pressable>
              );
            })}

            <Text
  style={[
    styles.sectionTitle,
    { color: theme.text },
  ]}
>
  얼마나 자주 할까요?
</Text>

<View style={styles.repeatTypeRow}>
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

    <View style={styles.daySelectRow}>
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

    <View style={styles.numberRow}>
      {[1, 2, 3, 4, 5, 6, 7].map(
        (number) => {
          const selected =
            weeklyCount === number;

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
      { color: theme.text },
    ]}
  >
    {repeatType === 'weekdays'
      ? selectedDayLabels.length > 0
        ? `반복 일정 · 매주 ${selectedDayLabels.join(
            '·'
          )}`
        : '반복할 요일을 선택해 주세요.'
      : `반복 일정 · 원하는 날 주 ${weeklyCount}회`}
  </Text>
</View>
             
          </>
        )}

        <Pressable
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            primaryButtonTheme,
            {
              opacity: !canSave
                ? 0.4
                : pressed
                ? 0.75
                : 1,
            },
          ]}
          onPress={saveGoal}
        >
          <Text
            style={[
              styles.saveText,
              { color: theme.buttonText },
            ]}
          >
            결과목표 저장하기 🦊
          </Text>
        </Pressable>
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

  backButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  backText: {
    marginTop: -4,
    fontSize: 42,
    fontWeight: '500',
    lineHeight: 46,
  },

  title: {
    marginTop: 28,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 48,
  },

  sub: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
  },

  infoCard: {
    marginTop: 26,
    padding: 20,
    borderWidth: 1,
  },

  categoryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryInfoIcon: {
    marginRight: 14,
    fontSize: 36,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '800',
  },

  infoValue: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: '900',
  },

  sectionTitle: {
    marginTop: 32,
    marginBottom: 13,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 30,
  },

  input: {
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 17,
    fontSize: 17,
    fontWeight: '700',
  },

  inputCount: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  weekPickerCard: {
    paddingVertical: 10,
    borderWidth: 1,
  },

  weekPicker: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  weekButton: {
    marginRight: 8,
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderWidth: 1,
  },

  weekButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },

  repeatBox: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },

  repeatText: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },

  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
  },

  typeText: {
    fontSize: 19,
    fontWeight: '900',
  },

  typeDescription: {
    marginTop: 7,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
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

  saveButton: {
    marginTop: 38,
    paddingVertical: 20,
    alignItems: 'center',
  },

  saveText: {
    fontSize: 21,
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
});