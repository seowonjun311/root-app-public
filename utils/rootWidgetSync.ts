import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

import { getRootOnboardingData } from '../store/rootMemory';

const ROOT_ONBOARDING_KEY =
  'root_onboarding_data';

const DAILY_TODOS_KEY =
  'daily_todos_v1';

const DAILY_MEALS_KEY =
  'daily_meals_v1';

const DAILY_CALORIE_PROFILE_KEY =
  'daily_calorie_profile_v1';

const DAILY_EXERCISE_CALORIES_KEY =
  'daily_exercise_calories_v1';

const DAILY_EXERCISE_CALORIE_LOGS_KEY =
  'daily_exercise_calorie_logs_v1';

const DAILY_LEDGER_KEY =
  'daily_ledger_v1';

const DAILY_SLEEP_START_AT_KEY =
  'daily_sleep_start_at_v1';

const DAILY_SLEEP_FROM_WIDGET_KEY =
  'daily_sleep_started_from_widget_v1';

type WidgetGoal = {
  id: string;
  title: string;
  type: 'timer' | 'check';
  isRunning: boolean;
  isDone: boolean;
  button: '기록중' | '시작' | '완료' | '확인';
};

type WidgetTodo = {
  text: string;
  completed: boolean;
};

type WidgetCalorieData = {
  intake: number;
  recommended: number;
  burned: number;
  remain: number;
  weight: number | string;
};

type WidgetLedgerData = {
  expenseText: string;
  incomeText: string;
  recentText: string;
};

type WidgetSleepData = {
  isSleeping: boolean;
  startedAt: string | null;
};

type RootWidgetData = {
  dateKey: string;

  study: WidgetGoal[];
  exercise: WidgetGoal[];
  mental: WidgetGoal[];
  daily: WidgetGoal[];

  todos: WidgetTodo[];
  calorie: WidgetCalorieData;
  ledger: WidgetLedgerData;

  ledgerExpenseText: string;
  ledgerIncomeText: string;
  ledgerRecentText: string;

  sleep: WidgetSleepData;
  updatedAt: number;
};

let runningWidgetSync:
  | Promise<void>
  | null = null;

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function safeParse<T>(
  value: string | null | undefined,
  fallback: T
): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.log(
      'ROOT WIDGET JSON PARSE ERROR',
      error
    );

    return fallback;
  }
}

function toSafeNumber(
  value: unknown,
  fallback = 0
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : fallback;
}

function calculateWidgetRecommendedCalories(
  profile: any
) {
  const height =
    toSafeNumber(profile?.height);

  const weight =
    toSafeNumber(profile?.weight);

  const age =
    toSafeNumber(profile?.age);

  if (
    height <= 0 ||
    weight <= 0 ||
    age <= 0
  ) {
    return 0;
  }

  const bmr =
    profile?.gender === 'female'
      ? 10 * weight +
        6.25 * height -
        5 * age -
        161
      : 10 * weight +
        6.25 * height -
        5 * age +
        5;

  return Math.max(
    0,
    Math.round(bmr * 1.3)
  );
}

function normalizeWidgetSleepStartAt(
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value === 'string'
  ) {
    const trimmed =
      value.trim();

    if (
      !trimmed ||
      trimmed === 'null' ||
      trimmed === 'undefined'
    ) {
      return null;
    }

    const numericValue =
      Number(trimmed);

    if (
      Number.isFinite(
        numericValue
      ) &&
      numericValue > 0
    ) {
      return new Date(
        numericValue
      ).toISOString();
    }

    const parsedTime =
      new Date(trimmed);

    if (
      Number.isFinite(
        parsedTime.getTime()
      )
    ) {
      return parsedTime.toISOString();
    }

    return null;
  }

  const numericValue =
    Number(value);

  if (
    Number.isFinite(
      numericValue
    ) &&
    numericValue > 0
  ) {
    return new Date(
      numericValue
    ).toISOString();
  }

  return null;
}

function getTodayIndex() {
  const day =
    new Date().getDay();

  return day === 0
    ? 6
    : day - 1;
}

function isGoalDoneToday(
  completedDays: unknown,
  todayIndex: number,
  todayKey: string
) {
  if (
    !Array.isArray(
      completedDays
    )
  ) {
    return false;
  }

  return completedDays.some(
    (value) => {
      return (
        value === todayIndex ||
        String(value) ===
          String(todayIndex) ||
        String(value) === todayKey
      );
    }
  );
}

function getExerciseCaloriesFromLogs(
  rawLogs: string | null,
  todayKey: string
) {
  const parsed =
    safeParse<any>(
      rawLogs,
      []
    );

  const logs: any[] =
    Array.isArray(parsed)
      ? parsed
      : Object.values(
          parsed ?? {}
        ).flat() as any[];

  return logs
    .filter((item) => {
      const itemDate =
        item?.date ??
        item?.log_date ??
        item?.createdAt
          ?.slice?.(0, 10);

      return (
        String(itemDate ?? '') ===
        todayKey
      );
    })
    .reduce(
      (
        sum: number,
        item: any
      ) => {
        return (
          sum +
          toSafeNumber(
            item?.calories
          )
        );
      },
      0
    );
}

async function performWidgetSync() {
  const { RootWidgetModule } =
    NativeModules;

  if (
    !RootWidgetModule
      ?.updateWidgetData
  ) {
    console.log(
      'RootWidgetModule 없음'
    );

    return;
  }

  const memoryData =
    getRootOnboardingData();

  const rootRaw = memoryData
    ? null
    : await AsyncStorage.getItem(
        ROOT_ONBOARDING_KEY
      );

  const rootData =
    memoryData ??
    safeParse<any>(
      rootRaw,
      null
    );

  const actionGoals =
    Array.isArray(
      rootData?.actionGoals
    )
      ? rootData.actionGoals
      : [];

  const runningGoalId =
    rootData?.runningTimer
      ?.goalId ?? null;

  const todayIndex =
    getTodayIndex();

  const todayKey =
    formatDateKey(
      new Date()
    );

  const makeGoals = (
    categoryId: string
  ): WidgetGoal[] => {
    return actionGoals
      .filter(
        (goal: any) =>
          goal?.category ===
            categoryId &&
          goal?.status !==
            'archived' &&
          goal?.status !==
            'deleted'
      )
      .slice(0, 4)
      .map((goal: any) => {
        const isTimer =
          goal?.type ===
            '시간기록형' ||
          goal?.type ===
            'timer';

        const isRunning =
          String(
            runningGoalId ?? ''
          ) ===
          String(goal?.id ?? '');

        const isDone =
          isGoalDoneToday(
            goal?.completedDays,
            todayIndex,
            todayKey
          );

        return {
          id: String(
            goal?.id ?? ''
          ),

          title:
            String(
              goal?.title ?? ''
            ),

          type: isTimer
            ? 'timer'
            : 'check',

          isRunning,

          isDone,

          button: isTimer
  ? isDone
    ? '완료'
    : isRunning
    ? '기록중'
    : '시작'
  : isDone
  ? '완료'
  : '확인',
        };
      })
      .filter(
        (goal: WidgetGoal) =>
          goal.id.length > 0
      );
  };

  const storageKeys = [
    DAILY_TODOS_KEY,
    DAILY_MEALS_KEY,
    DAILY_CALORIE_PROFILE_KEY,
    DAILY_EXERCISE_CALORIES_KEY,
    DAILY_EXERCISE_CALORIE_LOGS_KEY,
    DAILY_LEDGER_KEY,
    DAILY_SLEEP_START_AT_KEY,
  ];

  const storedPairs =
    await AsyncStorage.multiGet(
      storageKeys
    );

  const storageMap =
    new Map(
      storedPairs
    );

  const todosRaw =
    storageMap.get(
      DAILY_TODOS_KEY
    ) ?? null;

  const mealsRaw =
    storageMap.get(
      DAILY_MEALS_KEY
    ) ?? null;

  const calorieProfileRaw =
    storageMap.get(
      DAILY_CALORIE_PROFILE_KEY
    ) ?? null;

  const exerciseCaloriesRaw =
    storageMap.get(
      DAILY_EXERCISE_CALORIES_KEY
    ) ?? null;

  const exerciseCalorieLogsRaw =
    storageMap.get(
      DAILY_EXERCISE_CALORIE_LOGS_KEY
    ) ?? null;

  const ledgerRaw =
    storageMap.get(
      DAILY_LEDGER_KEY
    ) ?? null;

  const localSleepStartRaw =
    storageMap.get(
      DAILY_SLEEP_START_AT_KEY
    ) ?? null;

  const savedTodos =
    safeParse<
      Record<
        string,
        any[]
      >
    >(
      todosRaw,
      {}
    );

  const todayTodos =
    (
      savedTodos[
        todayKey
      ] ?? []
    )
      .slice(0, 4)
      .map(
        (todo: any) => ({
          text:
            String(
              todo?.text ?? ''
            ),

          completed:
            Boolean(
              todo?.completed
            ),
        })
      );

  let widgetSleepStartAt:
    | string
    | null = null;

  try {
    if (
      RootWidgetModule
        ?.getWidgetSleepStartAt
    ) {
      const nativeSleepValue =
        await Promise.resolve(
          RootWidgetModule
            .getWidgetSleepStartAt()
        );

      widgetSleepStartAt =
        normalizeWidgetSleepStartAt(
          nativeSleepValue
        );
    }
  } catch (error) {
    console.log(
      '위젯 수면 시작 상태 읽기 실패',
      error
    );
  }

  const localSleepStartAt =
    normalizeWidgetSleepStartAt(
      localSleepStartRaw
    );

  if (
    !localSleepStartAt &&
    widgetSleepStartAt
  ) {
    await AsyncStorage.multiSet([
      [
        DAILY_SLEEP_START_AT_KEY,
        widgetSleepStartAt,
      ],
      [
        DAILY_SLEEP_FROM_WIDGET_KEY,
        'true',
      ],
    ]);
  }

  const sleepStartAt =
    localSleepStartAt ??
    widgetSleepStartAt;

  const meals =
    safeParse<
      Record<
        string,
        Record<
          string,
          any[]
        >
      >
    >(
      mealsRaw,
      {}
    );

  const calorieProfile =
    safeParse<any>(
      calorieProfileRaw,
      {}
    );

  const exerciseCalories =
    safeParse<
      Record<
        string,
        number
      >
    >(
      exerciseCaloriesRaw,
      {}
    );

  const ledger =
    safeParse<
      Record<
        string,
        any[]
      >
    >(
      ledgerRaw,
      {}
    );

  const todayLedger =
    Array.isArray(
      ledger[todayKey]
    )
      ? ledger[todayKey]
      : [];

  const ledgerExpense =
    todayLedger
      .filter(
        (item: any) =>
          item?.type ===
          'expense'
      )
      .reduce(
        (
          sum: number,
          item: any
        ) => {
          return (
            sum +
            toSafeNumber(
              item?.amount
            )
          );
        },
        0
      );

  const ledgerIncome =
    todayLedger
      .filter(
        (item: any) =>
          item?.type ===
          'income'
      )
      .reduce(
        (
          sum: number,
          item: any
        ) => {
          return (
            sum +
            toSafeNumber(
              item?.amount
            )
          );
        },
        0
      );

  const ledgerRecentText =
    todayLedger.length > 0
      ? [...todayLedger]
          .slice(-2)
          .reverse()
          .map(
            (item: any) => {
              const sign =
                item?.type ===
                'expense'
                  ? '-'
                  : '+';

              const title =
                item?.memo ||
                item?.category ||
                '가계부';

              const amount =
                toSafeNumber(
                  item?.amount
                );

              return `${title} ${sign}${amount.toLocaleString(
                'ko-KR'
              )}원`;
            }
          )
          .join('\n')
      : '오늘 가계부 내역 없음';

  const todayMeals =
    meals[todayKey] ?? {};

  const intakeCalories =
    Object.values(
      todayMeals
    )
      .flatMap((items) =>
        Array.isArray(items)
          ? items
          : []
      )
      .reduce(
        (
          sum: number,
          item: any
        ) => {
          return (
            sum +
            toSafeNumber(
              item?.calories
            )
          );
        },
        0
      );

  const recommendedCalories =
    calculateWidgetRecommendedCalories(
      calorieProfile
    );

  const storedBurnedCalories =
    toSafeNumber(
      exerciseCalories[
        todayKey
      ]
    );

  const loggedBurnedCalories =
    getExerciseCaloriesFromLogs(
      exerciseCalorieLogsRaw,
      todayKey
    );

  const burnedCalories =
    storedBurnedCalories > 0
      ? storedBurnedCalories
      : loggedBurnedCalories;

  const remainCalories =
    recommendedCalories > 0
      ? recommendedCalories +
        burnedCalories -
        intakeCalories
      : 0;

  const calorieWidgetData: WidgetCalorieData =
    {
      intake:
        Math.max(
          0,
          Math.round(
            intakeCalories
          )
        ),

      recommended:
        recommendedCalories,

      burned:
        Math.max(
          0,
          Math.round(
            burnedCalories
          )
        ),

      remain:
        Math.round(
          remainCalories
        ),

      weight:
        calorieProfile?.weight ??
        '',
    };

  const expenseText =
    `${ledgerExpense.toLocaleString(
      'ko-KR'
    )}원`;

  const incomeText =
    `${ledgerIncome.toLocaleString(
      'ko-KR'
    )}원`;

  const ledgerWidgetData: WidgetLedgerData =
    {
      expenseText,
      incomeText,
      recentText:
        ledgerRecentText,
    };

  const widgetData: RootWidgetData = {
  dateKey: todayKey,

  study:
    makeGoals('study'),

  exercise:
    makeGoals('exercise'),

  mental:
    makeGoals('mental'),

  daily:
    makeGoals('daily'),

      todos:
        todayTodos,

      calorie:
        calorieWidgetData,

      ledger:
        ledgerWidgetData,

      ledgerExpenseText:
        expenseText,

      ledgerIncomeText:
        incomeText,

      ledgerRecentText,

      sleep: {
        isSleeping:
          Boolean(
            sleepStartAt
          ),

        startedAt:
          sleepStartAt,
      },

      updatedAt:
        Date.now(),
    };

  await Promise.resolve(
    RootWidgetModule.updateWidgetData(
      JSON.stringify(
        widgetData
      )
    )
  );

  console.log(
    '루트 위젯 동기화 완료',
    widgetData
  );
}

export const syncRootWidgetData =
  async (): Promise<void> => {
    if (
      runningWidgetSync
    ) {
      console.log(
        '루트 위젯 동기화가 이미 진행 중이라 기존 작업을 기다립니다.'
      );

      return runningWidgetSync;
    }

    runningWidgetSync =
      performWidgetSync()
        .catch((error) => {
          console.log(
            '루트 위젯 동기화 실패',
            error
          );
        })
        .finally(() => {
          runningWidgetSync =
            null;
        });

    return runningWidgetSync;
  };