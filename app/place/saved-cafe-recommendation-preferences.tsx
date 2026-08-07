import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  getSavedCafeRecommendationPreferenceSummary,
  getSavedCafeRecommendationPreferenceWeightLabel,
  loadSavedCafeRecommendationPreferenceState,
  resetSavedCafeRecommendationPreferences,
  SAVED_CAFE_RECOMMENDATION_PREFERENCE_AXES,
  setSavedCafeRecommendationAutoLearningStrength,
  setSavedCafeRecommendationPreferenceWeight,
  type SavedCafeRecommendationAutoLearningStrength,
  type SavedCafeRecommendationPreferenceAxisId,
  type SavedCafeRecommendationPreferenceState,
  type SavedCafeRecommendationPreferenceWeight,
} from '../../store/savedCafeRecommendationPreferences';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V50_RECOMMENDATION_PREFERENCE_SCREEN

const WEIGHT_OPTIONS: ReadonlyArray<{
  value: SavedCafeRecommendationPreferenceWeight;
  label: string;
}> = [
  { value: -2, label: '--' },
  { value: -1, label: '-' },
  { value: 0, label: '0' },
  { value: 1, label: '+' },
  { value: 2, label: '++' },
];

const LEARNING_OPTIONS: ReadonlyArray<{
  value: SavedCafeRecommendationAutoLearningStrength;
  label: string;
  description: string;
}> = [
  {
    value: 'low',
    label: '낮게',
    description: '방문·피드백 기록보다 직접 설정을 더 안정적으로 유지해요.',
  },
  {
    value: 'balanced',
    label: '균형',
    description: '직접 설정과 방문·피드백 학습을 비슷한 비중으로 반영해요.',
  },
  {
    value: 'high',
    label: '높게',
    description: '최근 방문과 추천 피드백 변화에 더 빠르게 반응해요.',
  },
];

function getErrorMessage(
  error: unknown,
) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === 'string'
  ) {
    const message =
      (
        error as {
          message: string;
        }
      ).message.trim();

    if (message) {
      return message;
    }
  }

  return '잠시 후 다시 시도해 주세요.';
}

export default function SavedCafeRecommendationPreferencesScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    preferenceState,
    setPreferenceState,
  ] = useState<
    SavedCafeRecommendationPreferenceState | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingKey,
    setSavingKey,
  ] = useState<string | null>(
    null,
  );

  const [
    loadError,
    setLoadError,
  ] = useState('');

  const [
    reloadVersion,
    setReloadVersion,
  ] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setLoadError('');

      void loadSavedCafeRecommendationPreferenceState()
        .then((nextState) => {
          if (!active) {
            return;
          }

          setPreferenceState(
            nextState,
          );
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE RECOMMENDATION PREFERENCE SCREEN LOAD ERROR',
            error,
          );

          if (active) {
            setLoadError(
              getErrorMessage(
                error,
              ),
            );
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [reloadVersion]),
  );

  const summary =
    useMemo(
      () =>
        getSavedCafeRecommendationPreferenceSummary(
          preferenceState,
        ),
      [preferenceState],
    );

  const saveWeight =
    useCallback(
      async (
        axis: SavedCafeRecommendationPreferenceAxisId,
        weight: SavedCafeRecommendationPreferenceWeight,
      ) => {
        if (savingKey) {
          return;
        }

        setSavingKey(
          axis,
        );

        try {
          const nextState =
            await setSavedCafeRecommendationPreferenceWeight(
              axis,
              weight,
            );

          setPreferenceState(
            nextState,
          );
        } catch (error) {
          Alert.alert(
            '취향 저장 실패',
            getErrorMessage(
              error,
            ),
          );
        } finally {
          setSavingKey(null);
        }
      },
      [savingKey],
    );

  const saveLearningStrength =
    useCallback(
      async (
        strength: SavedCafeRecommendationAutoLearningStrength,
      ) => {
        if (savingKey) {
          return;
        }

        setSavingKey(
          'autoLearningStrength',
        );

        try {
          const nextState =
            await setSavedCafeRecommendationAutoLearningStrength(
              strength,
            );

          setPreferenceState(
            nextState,
          );
        } catch (error) {
          Alert.alert(
            '자동 학습 설정 실패',
            getErrorMessage(
              error,
            ),
          );
        } finally {
          setSavingKey(null);
        }
      },
      [savingKey],
    );

  const resetPreferences =
    useCallback(() => {
      if (savingKey) {
        return;
      }

      Alert.alert(
        '취향 설정 초기화',
        '직접 조절한 취향과 자동 학습 강도를 기본값으로 되돌릴까요?',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '초기화',
            style: 'destructive',
            onPress: () => {
              setSavingKey(
                'reset',
              );

              void resetSavedCafeRecommendationPreferences()
                .then((nextState) => {
                  setPreferenceState(
                    nextState,
                  );
                })
                .catch((error) => {
                  Alert.alert(
                    '초기화 실패',
                    getErrorMessage(
                      error,
                    ),
                  );
                })
                .finally(() => {
                  setSavingKey(null);
                });
            },
          },
        ],
      );
    }, [savingKey]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 8,
            borderBottomColor:
              theme.line,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={() =>
            router.back()
          }
          style={({ pressed }: { pressed: boolean }) => [
            styles.headerButton,
            {
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 2
                  : 9,
              opacity:
                pressed
                  ? 0.55
                  : 1,
            },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={theme.text}
          />
        </Pressable>

        <View
          style={styles.headerTextArea}
        >
          <Text
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            카페 추천 취향 설정
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.subtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            ROOT가 배우는 취향에 내가 원하는 우선순위를 더해요.
          </Text>
        </View>
      </View>

      {loading ? (
        <View
          style={styles.centerState}
        >
          <ActivityIndicator
            color={theme.text}
          />
          <Text
            style={[
              styles.centerDescription,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            취향 설정을 불러오고 있어요.
          </Text>
        </View>
      ) : loadError ? (
        <View
          style={styles.centerState}
        >
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color={theme.subText}
          />
          <Text
            style={[
              styles.centerTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            취향 설정을 불러오지 못했어요.
          </Text>
          <Text
            style={[
              styles.centerDescription,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {loadError}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="취향 설정 다시 불러오기"
            onPress={() =>
              setReloadVersion(
                (value) =>
                  value + 1,
              )
            }
            style={({ pressed }: { pressed: boolean }) => [
              styles.retryButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.retryButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              다시 불러오기
            </Text>
          </Pressable>
        </View>
      ) : preferenceState ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + 30,
            },
          ]}
        >
          {/* SAVED_CAFE_V50_RECOMMENDATION_PREFERENCE_SUMMARY */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 15,
              },
            ]}
          >
            <View
              style={styles.summaryIcon}
            >
              <Ionicons
                name="options-outline"
                size={22}
                color={theme.text}
              />
            </View>
            <View
              style={styles.summaryTextArea}
            >
              <Text
                style={[
                  styles.summaryTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                직접 설정 {summary.adjustedCount}개
              </Text>
              <Text
                style={[
                  styles.summaryDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                선호 {summary.positiveCount}개 · 덜 선호 {summary.negativeCount}개 · 자동 학습 {summary.autoLearningStrengthLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.infoCard,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 11,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={theme.subText}
            />
            <Text
              style={[
                styles.infoText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              `--`는 피하고 싶은 취향, `++`는 매우 중요한 취향이에요. 0은 자동 학습만 사용해요.
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
            직접 추천 가중치
          </Text>

          <View
            style={styles.stack}
          >
            {SAVED_CAFE_RECOMMENDATION_PREFERENCE_AXES.map(
              (axis) => {
                const weight =
                  preferenceState.weights[
                    axis.id
                  ];

                return (
                  <View
                    key={axis.id}
                    style={[
                      styles.preferenceCard,
                      {
                        backgroundColor:
                          theme.card,
                        borderColor:
                          theme.line,
                        borderRadius:
                          isCityBlack
                            ? 3
                            : 14,
                      },
                    ]}
                  >
                    <View
                      style={styles.preferenceHeader}
                    >
                      <View
                        style={styles.preferenceTextArea}
                      >
                        <Text
                          style={[
                            styles.preferenceTitle,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {axis.label}
                        </Text>
                        <Text
                          style={[
                            styles.preferenceDescription,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {axis.description}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.currentWeightLabel,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {getSavedCafeRecommendationPreferenceWeightLabel(
                          weight,
                        )}
                      </Text>
                    </View>

                    <View
                      style={styles.weightRow}
                    >
                      {WEIGHT_OPTIONS.map(
                        (option) => {
                          const selected =
                            option.value ===
                            weight;

                          return (
                            <Pressable
                              key={option.value}
                              accessibilityRole="button"
                              accessibilityState={{
                                selected,
                              }}
                              accessibilityLabel={`${axis.label} ${getSavedCafeRecommendationPreferenceWeightLabel(option.value)}`}
                              disabled={Boolean(savingKey)}
                              onPress={() => {
                                void saveWeight(
                                  axis.id,
                                  option.value,
                                );
                              }}
                              style={({ pressed }: { pressed: boolean }) => [
                                styles.weightButton,
                                {
                                  backgroundColor:
                                    selected
                                      ? theme.button
                                      : theme.background,
                                  borderColor:
                                    selected
                                      ? theme.strongLine
                                      : theme.line,
                                  borderRadius:
                                    isCityBlack
                                      ? 2
                                      : 9,
                                  opacity:
                                    savingKey &&
                                    savingKey !== axis.id
                                      ? 0.45
                                      : pressed
                                        ? 0.6
                                        : 1,
                                },
                              ]}
                            >
                              {savingKey === axis.id &&
                              selected ? (
                                <ActivityIndicator
                                  size="small"
                                  color={
                                    theme.buttonText
                                  }
                                />
                              ) : (
                                <Text
                                  style={[
                                    styles.weightButtonText,
                                    {
                                      color:
                                        selected
                                          ? theme.buttonText
                                          : theme.text,
                                    },
                                  ]}
                                >
                                  {option.label}
                                </Text>
                              )}
                            </Pressable>
                          );
                        },
                      )}
                    </View>
                  </View>
                );
              },
            )}
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
            자동 학습 강도
          </Text>

          <View
            style={styles.stack}
          >
            {LEARNING_OPTIONS.map(
              (option) => {
                const selected =
                  preferenceState.autoLearningStrength ===
                  option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    accessibilityLabel={`자동 학습 ${option.label}`}
                    disabled={Boolean(savingKey)}
                    onPress={() => {
                      void saveLearningStrength(
                        option.value,
                      );
                    }}
                    style={({ pressed }: { pressed: boolean }) => [
                      styles.learningCard,
                      {
                        backgroundColor:
                          selected
                            ? theme.button
                            : theme.card,
                        borderColor:
                          selected
                            ? theme.strongLine
                            : theme.line,
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 12,
                        opacity:
                          pressed
                            ? 0.6
                            : 1,
                      },
                    ]}
                  >
                    <View
                      style={styles.learningTextArea}
                    >
                      <Text
                        style={[
                          styles.learningTitle,
                          {
                            color:
                              selected
                                ? theme.buttonText
                                : theme.text,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.learningDescription,
                          {
                            color:
                              selected
                                ? theme.buttonText
                                : theme.subText,
                          },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.buttonText}
                      />
                    ) : null}
                  </Pressable>
                );
              },
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="추천 취향 설정 초기화"
            disabled={Boolean(savingKey)}
            onPress={resetPreferences}
            style={({ pressed }: { pressed: boolean }) => [
              styles.resetButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
                opacity:
                  savingKey
                    ? 0.45
                    : pressed
                      ? 0.58
                      : 1,
              },
            ]}
          >
            <Ionicons
              name="refresh-outline"
              size={16}
              color={theme.text}
            />
            <Text
              style={[
                styles.resetButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              기본값으로 초기화
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    header: {
      minHeight: 76,
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    headerButton: {
      width: 36,
      height: 36,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerTextArea: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 18.5,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
    },

    centerState: {
      flex: 1,
      paddingHorizontal: 28,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    centerTitle: {
      fontSize: 15,
      fontWeight: '900',
      textAlign: 'center',
    },

    centerDescription: {
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 17,
      textAlign: 'center',
    },

    retryButton: {
      minHeight: 35,
      marginTop: 5,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    retryButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 14,
      gap: 14,
    },

    summaryCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    summaryIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryTextArea: {
      flex: 1,
      minWidth: 0,
    },

    summaryTitle: {
      fontSize: 14,
      fontWeight: '900',
    },

    summaryDescription: {
      marginTop: 4,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    infoCard: {
      minHeight: 42,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    infoText: {
      flex: 1,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    stack: {
      gap: 9,
    },

    preferenceCard: {
      padding: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      gap: 11,
    },

    preferenceHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    preferenceTextArea: {
      flex: 1,
      minWidth: 0,
    },

    preferenceTitle: {
      fontSize: 12.5,
      fontWeight: '900',
    },

    preferenceDescription: {
      marginTop: 4,
      fontSize: 9.3,
      fontWeight: '700',
      lineHeight: 14,
    },

    currentWeightLabel: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    weightRow: {
      flexDirection: 'row',
      gap: 6,
    },

    weightButton: {
      flex: 1,
      minHeight: 34,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    weightButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    learningCard: {
      minHeight: 62,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    learningTextArea: {
      flex: 1,
      minWidth: 0,
    },

    learningTitle: {
      fontSize: 11.5,
      fontWeight: '900',
    },

    learningDescription: {
      marginTop: 4,
      fontSize: 9.2,
      fontWeight: '700',
      lineHeight: 14,
    },

    resetButton: {
      minHeight: 40,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    resetButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },
  });
