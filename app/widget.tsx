import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRootTheme } from '../store/rootTheme';

function getParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function encodeParam(
  value: string | undefined
) {
  return encodeURIComponent(value ?? '');
}

export default function WidgetRoute() {
  const { themeMode, theme } =
    useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  const params = useLocalSearchParams<{
    action?: string;
    goalId?: string;
    category?: string;
    mealType?: string;
    widgetTs?: string;
  }>();

  const routedKeyRef =
    useRef<string | null>(null);

  useEffect(() => {
    const action =
      getParam(params.action)?.trim();

    const goalId =
      getParam(params.goalId)?.trim();

    const category =
      getParam(params.category)?.trim();

    const mealType =
      getParam(params.mealType)?.trim();

    const widgetTs =
      getParam(params.widgetTs)?.trim() ||
      String(Date.now());

    const routeKey = [
      action ?? '',
      goalId ?? '',
      category ?? '',
      mealType ?? '',
      widgetTs,
    ].join('|');

    if (
      routedKeyRef.current === routeKey
    ) {
      return;
    }

    routedKeyRef.current = routeKey;

    const encodedWidgetTs =
      encodeParam(widgetTs);

    const moveToTarget = () => {
      if (action === 'openDay') {
  router.replace(
    `/(tabs)/day?openTodoSection=true&widgetTs=${encodedWidgetTs}`
  );

  return;
}

      if (
        action === 'openTodoAdd' ||
        action === 'todo'
      ) {
        router.replace(
          `/(tabs)/day?openTodoModal=true&widgetTs=${encodedWidgetTs}`
        );
        return;
      }

      if (
        action === 'openMealAdd' ||
        action === 'meal'
      ) {
        const encodedMealType =
          encodeParam(
            mealType || 'breakfast'
          );

        router.replace(
          `/(tabs)/day?openMealModal=true&mealType=${encodedMealType}&widgetTs=${encodedWidgetTs}`
        );
        return;
      }

      /*
 * + 가계부 버튼
 * → 가계부 입력창 바로 열기
 */
if (
  action === 'ledger' ||
  action === 'openLedgerAdd'
) {
  router.replace(
    `/(tabs)/day?openLedgerModal=true&widgetTs=${encodedWidgetTs}`
  );

  return;
}

/*
 * 오늘의 가계부 영역
 * → 하루 탭의 가계부 위치로 이동
 */
if (
  action ===
  'openLedgerSection'
) {
  router.replace(
    `/(tabs)/day?openLedgerSection=true&widgetTs=${encodedWidgetTs}`
  );

  return;
}

      if (
        action === 'openCategory'
      ) {
        const encodedCategory =
          encodeParam(
            category || 'study'
          );

        router.replace(
          `/(tabs)?widgetAction=openCategory&category=${encodedCategory}&widgetTs=${encodedWidgetTs}`
        );
        return;
      }

      if (
        action === 'startTimer'
      ) {
        const encodedGoalId =
          encodeParam(goalId);

        router.replace(
          `/(tabs)?widgetAction=startTimer&goalId=${encodedGoalId}&widgetTs=${encodedWidgetTs}`
        );
        return;
      }

      if (
        action === 'completeGoal'
      ) {
        const encodedGoalId =
          encodeParam(goalId);

        router.replace(
          `/(tabs)?widgetAction=completeGoal&goalId=${encodedGoalId}&widgetTs=${encodedWidgetTs}`
        );
        return;
      }

      router.replace('/(tabs)');
    };

    const timer = setTimeout(
      moveToTarget,
      50
    );

    return () => {
      clearTimeout(timer);
    };
  }, [
    params.action,
    params.goalId,
    params.category,
    params.mealType,
    params.widgetTs,
  ]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.loadingCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.line,
            borderRadius: isCityBlack
              ? 4
              : 28,
          },
        ]}
      >
        <Text style={styles.icon}>
          🦊
        </Text>

        <Text
          style={[
            styles.title,
            { color: theme.text },
          ]}
        >
          위젯에서 여는 중
        </Text>

        <Text
          style={[
            styles.description,
            { color: theme.subText },
          ]}
        >
          선택한 기록 화면으로 이동하고 있어요.
        </Text>

        <ActivityIndicator
          size="large"
          color={theme.button}
          style={styles.indicator}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 34,
    borderWidth: 1,
  },

  icon: {
    fontSize: 54,
    marginBottom: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  description: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },

  indicator: {
    marginTop: 22,
  },
});