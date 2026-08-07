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
  CAFE_KEYWORD_MAP,
} from '../../store/cafeKeywordCatalog';
import {
  PLACE_PRIMARY_THEME_MAP,
} from '../../store/placeThemeCatalog';
import {
  loadSavedCafeEntries,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  getSavedCafeRecommendationFeedback,
  getSavedCafeRecommendationFeedbackSummary,
  loadSavedCafeRecommendationFeedbackState,
  setSavedCafeRecommendationFeedback,
  type SavedCafeRecommendationFeedbackState,
  type SavedCafeRecommendationReaction,
} from '../../store/savedCafeRecommendationFeedback';
import {
  getSavedCafeRecommendationPreferenceSummary,
  loadSavedCafeRecommendationPreferenceState,
  type SavedCafeRecommendationPreferenceState,
} from '../../store/savedCafeRecommendationPreferences';
import {
  buildSavedCafeRecommendations,
  type SavedCafeRecommendation,
  type SavedCafeRecommendationMode,
} from '../../store/savedCafeRecommendations';
import {
  loadSavedCafeVisitState,
  type SavedCafeVisitState,
} from '../../store/savedCafeVisits';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V48_PERSONALIZED_RECOMMENDATION_SCREEN
// SAVED_CAFE_V49_RECOMMENDATION_FEEDBACK_SCREEN
// SAVED_CAFE_V50_RECOMMENDATION_PREFERENCE_ENTRY

const MODE_OPTIONS: ReadonlyArray<{
  id: SavedCafeRecommendationMode;
  label: string;
}> = [
  { id: 'all', label: '전체 추천' },
  { id: 'new', label: '아직 안 간 곳' },
  { id: 'study', label: '공부·작업' },
  { id: 'date', label: '데이트' },
  { id: 'solo', label: '혼자' },
  { id: 'revisit', label: '다시 가기' },
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

function getStatusLabel(
  entry: SavedCafeLocalEntry,
) {
  switch (
    entry.cafe.status
  ) {
    case 'favorite':
      return '좋아하는 곳';
    case 'visited':
      return '가본 곳';
    default:
      return '가고 싶은 곳';
  }
}

function getVisitSummaryText(
  recommendation:
    SavedCafeRecommendation,
) {
  if (
    recommendation.visitCount ===
    0
  ) {
    return '아직 방문 기록 없음';
  }

  const parts = [
    `${recommendation.visitCount}회 방문`,
  ];

  if (
    recommendation.averageRating !==
    null
  ) {
    parts.push(
      `평균 ★${recommendation.averageRating.toFixed(1)}`,
    );
  }

  return parts.join(
    ' · ',
  );
}

export default function SavedCafeRecommendationsScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    entries,
    setEntries,
  ] = useState<
    SavedCafeLocalEntry[]
  >([]);

  const [
    visitState,
    setVisitState,
  ] = useState<
    SavedCafeVisitState | null
  >(null);

  const [
    feedbackState,
    setFeedbackState,
  ] = useState<
    SavedCafeRecommendationFeedbackState | null
  >(null);

  const [
    preferenceState,
    setPreferenceState,
  ] = useState<
    SavedCafeRecommendationPreferenceState | null
  >(null);

  const [
    savingFeedbackPlaceId,
    setSavingFeedbackPlaceId,
  ] = useState<string | null>(
    null,
  );

  const [
    mode,
    setMode,
  ] = useState<
    SavedCafeRecommendationMode
  >('all');

  const [
    loading,
    setLoading,
  ] = useState(true);

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

      void Promise.all([
        loadSavedCafeEntries(),
        loadSavedCafeVisitState(),
        loadSavedCafeRecommendationFeedbackState(),
        loadSavedCafeRecommendationPreferenceState(),
      ])
        .then(([
          nextEntries,
          nextVisitState,
          nextFeedbackState,
          nextPreferenceState,
        ]) => {
          if (!active) {
            return;
          }

          setEntries(
            nextEntries,
          );
          setVisitState(
            nextVisitState,
          );
          setFeedbackState(
            nextFeedbackState,
          );
          setPreferenceState(
            nextPreferenceState,
          );
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE RECOMMENDATION LOAD ERROR',
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

  const result =
    useMemo(
      () =>
        buildSavedCafeRecommendations(
          entries,
          visitState,
          mode,
          feedbackState,
          preferenceState,
        ),
      [
        entries,
        feedbackState,
        mode,
        preferenceState,
        visitState,
      ],
    );

  const feedbackSummary =
    useMemo(
      () =>
        getSavedCafeRecommendationFeedbackSummary(
          feedbackState,
        ),
      [feedbackState],
    );

  const preferenceSummary =
    useMemo(
      () =>
        getSavedCafeRecommendationPreferenceSummary(
          preferenceState,
        ),
      [preferenceState],
    );

  const recommendations =
    result.recommendations.slice(
      0,
      20,
    );

  const openCafeDetail =
    useCallback(
      (placeId: string) => {
        router.push({
          pathname:
            '/place/cafe-detail',
          params: {
            placeId,
          },
        } as never);
      },
      [],
    );

  const saveRecommendationFeedback =
    useCallback(
      async (
        placeId: string,
        reaction:
          SavedCafeRecommendationReaction,
      ) => {
        if (
          savingFeedbackPlaceId
        ) {
          return;
        }

        const currentReaction =
          getSavedCafeRecommendationFeedback(
            feedbackState,
            placeId,
          )?.reaction ??
          null;

        const nextReaction =
          currentReaction ===
          reaction
            ? null
            : reaction;

        setSavingFeedbackPlaceId(
          placeId,
        );

        try {
          const nextState =
            await setSavedCafeRecommendationFeedback(
              placeId,
              nextReaction,
            );

          setFeedbackState(
            nextState,
          );
        } catch (error) {
          console.log(
            'SAVED CAFE RECOMMENDATION FEEDBACK SAVE ERROR',
            error,
          );

          Alert.alert(
            '피드백 저장 실패',
            getErrorMessage(
              error,
            ),
          );
        } finally {
          setSavingFeedbackPlaceId(
            null,
          );
        }
      },
      [
        feedbackState,
        savingFeedbackPlaceId,
      ],
    );

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
          style={({ pressed }) => [
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
            numberOfLines={1}
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            ROOT 맞춤 카페 추천
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
            저장 카페와 방문 기록으로 지금의 취향에 맞는 곳을 골라요.
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
            나의 카페 취향을 계산하고 있어요.
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
            추천을 불러오지 못했어요.
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
            accessibilityLabel="추천 다시 불러오기"
            onPress={() =>
              setReloadVersion(
                (value) =>
                  value + 1,
              )
            }
            style={({ pressed }) => [
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
            <Ionicons
              name="refresh-outline"
              size={15}
              color={theme.text}
            />
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
      ) : entries.length === 0 ? (
        <View
          style={styles.centerState}
        >
          <Ionicons
            name="cafe-outline"
            size={34}
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
            먼저 카페를 저장해 주세요.
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
            저장한 카페가 생기면 테마와 키워드를 비교해 개인 추천을 만들어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="저장 카페 목록으로 이동"
            onPress={() =>
              router.replace(
                '/place/saved-cafes' as never,
              )
            }
            style={({ pressed }) => [
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
              저장 카페 보기
            </Text>
          </Pressable>
        </View>
      ) : (
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
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 16,
              },
            ]}
          >
            <View
              style={[
                styles.profileIcon,
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
                name="sparkles-outline"
                size={22}
                color={theme.text}
              />
            </View>

            <View
              style={styles.profileTextArea}
            >
              <View
                style={styles.profileTopRow}
              >
                <Text
                  style={[
                    styles.profileLabel,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  추천 정확도
                </Text>
                <Text
                  style={[
                    styles.confidenceText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {result.profile.confidenceLabel}
                </Text>
              </View>

              <Text
                style={[
                  styles.profileTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {result.profile.headline}
              </Text>

              <Text
                style={[
                  styles.profileDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {result.profile.description}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.tipCard,
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
                styles.tipText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              방문 상세 기록과 추천 카드의 피드백을 함께 학습해 다음 추천 순위를 바로 조정해요.
            </Text>
          </View>

          {/* SAVED_CAFE_V50_RECOMMENDATION_PREFERENCE_SUMMARY */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 추천 취향 설정 열기"
            onPress={() =>
              router.push(
                '/place/saved-cafe-recommendation-preferences' as never,
              )
            }
            style={({ pressed }: { pressed: boolean }) => [
              styles.learningCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 14,
                opacity:
                  pressed
                    ? 0.58
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.learningIcon,
                {
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                },
              ]}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={theme.text}
              />
            </View>

            <View
              style={styles.learningTextArea}
            >
              <View
                style={styles.learningTopRow}
              >
                <Text
                  style={[
                    styles.learningTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  취향 설정 {preferenceSummary.adjustedCount}개
                </Text>
                <Text
                  style={[
                    styles.learningStatus,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  자동 학습 {preferenceSummary.autoLearningStrengthLabel}
                </Text>
              </View>

              <Text
                style={[
                  styles.learningDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {preferenceSummary.adjustedCount > 0
                  ? `중요 ${preferenceSummary.positiveCount} · 덜 선호 ${preferenceSummary.negativeCount} · 눌러서 가중치 조절`
                  : '공부·조용함·데이트·디저트 같은 추천 우선순위를 직접 정할 수 있어요.'}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={theme.subText}
            />
          </Pressable>

          {/* SAVED_CAFE_V49_RECOMMENDATION_FEEDBACK_SUMMARY */}
          <View
            style={[
              styles.learningCard,
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
              style={[
                styles.learningIcon,
                {
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                },
              ]}
            >
              <Ionicons
                name="school-outline"
                size={18}
                color={theme.text}
              />
            </View>

            <View
              style={styles.learningTextArea}
            >
              <View
                style={styles.learningTopRow}
              >
                <Text
                  style={[
                    styles.learningTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  추천 학습 {feedbackSummary.total}개
                </Text>
                <Text
                  style={[
                    styles.learningStatus,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  실시간 반영
                </Text>
              </View>

              <Text
                style={[
                  styles.learningDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {feedbackSummary.total > 0
                  ? `관심 ${feedbackSummary.interested} · 나중에 ${feedbackSummary.wantToGo} · 관심 없음 ${feedbackSummary.notInterested}`
                  : '아래 추천 카드에서 반응을 남기면 비슷한 카페의 점수도 함께 조정돼요.'}
              </Text>
            </View>
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
            어떤 상황의 카페를 찾을까요?
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.modeRow
            }
          >
            {MODE_OPTIONS.map(
              (option) => {
                const selected =
                  option.id === mode;

                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setMode(
                        option.id,
                      )
                    }
                    style={({ pressed }) => [
                      styles.modeChip,
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
                            : 999,
                        opacity:
                          pressed
                            ? 0.6
                            : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
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
                  </Pressable>
                );
              },
            )}
          </ScrollView>

          <View
            style={styles.sectionHeadingRow}
          >
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                추천 카페
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                저장한 {entries.length}곳 중 추천 점수가 높은 순서예요.
              </Text>
            </View>
            <Text
              style={[
                styles.resultCount,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {recommendations.length}곳
            </Text>
          </View>

          {recommendations.length ===
          0 ? (
            <View
              style={[
                styles.emptyModeCard,
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
              <Ionicons
                name="search-outline"
                size={26}
                color={theme.subText}
              />
              <Text
                style={[
                  styles.emptyModeTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                이 조건에 맞는 저장 카페가 아직 없어요.
              </Text>
              <Text
                style={[
                  styles.emptyModeDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                다른 추천 조건을 선택하거나 카페를 더 저장해 보세요.
              </Text>
            </View>
          ) : (
            <View
              style={styles.stack}
            >
              {recommendations.map(
                (
                  recommendation,
                  index,
                ) => (
                  <RecommendationCard
                    key={
                      recommendation
                        .entry.cafe.placeId
                    }
                    rank={index + 1}
                    recommendation={
                      recommendation
                    }
                    onPress={() =>
                      openCafeDetail(
                        recommendation
                          .entry.cafe
                          .placeId,
                      )
                    }
                    savingFeedback={
                      savingFeedbackPlaceId ===
                      recommendation
                        .entry.cafe.placeId
                    }
                    onFeedback={(
                      reaction,
                    ) => {
                      void saveRecommendationFeedback(
                        recommendation
                          .entry.cafe.placeId,
                        reaction,
                      );
                    }}
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                ),
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

type RecommendationCardProps = {
  rank: number;
  recommendation:
    SavedCafeRecommendation;
  onPress: () => void;
  savingFeedback: boolean;
  onFeedback: (
    reaction:
      SavedCafeRecommendationReaction,
  ) => void;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function RecommendationCard({
  rank,
  recommendation,
  onPress,
  savingFeedback,
  onFeedback,
  theme,
  isCityBlack,
}: RecommendationCardProps) {
  const {
    entry,
  } = recommendation;

  const address =
    entry.roadAddress ||
    entry.address ||
    '';

  const representativeLabels =
    entry.cafe.representativeTags
      .map(
        (tag) =>
          CAFE_KEYWORD_MAP[tag]
            ?.label ?? tag,
      )
      .slice(
        0,
        3,
      );

  const primaryThemeLabel =
    PLACE_PRIMARY_THEME_MAP[
      entry.cafe.primaryTheme
    ]?.label ??
    entry.cafe.primaryTheme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.cafe.name} 추천 상세 보기`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.recommendationCard,
        {
          backgroundColor:
            theme.card,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 3
              : 15,
          opacity:
            pressed
              ? 0.58
              : 1,
        },
      ]}
    >
      <View
        style={styles.cardTopRow}
      >
        <View
          style={[
            styles.rankBadge,
            {
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 2
                  : 9,
            },
          ]}
        >
          <Text
            style={[
              styles.rankText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {rank}
          </Text>
        </View>

        <View
          style={styles.cardTitleArea}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.cafeName,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {entry.cafe.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.cafeMeta,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {primaryThemeLabel} · {getStatusLabel(entry)}
          </Text>
        </View>

        <View
          style={[
            styles.scoreBadge,
            {
              backgroundColor:
                theme.background,
              borderColor:
                theme.strongLine,
              borderRadius:
                isCityBlack
                  ? 2
                  : 10,
            },
          ]}
        >
          <Text
            style={[
              styles.scoreLabel,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            추천
          </Text>
          <Text
            style={[
              styles.scoreValue,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {recommendation.score}
          </Text>
        </View>
      </View>

      {address ? (
        <Text
          numberOfLines={1}
          style={[
            styles.address,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {address}
        </Text>
      ) : null}

      <Text
        style={[
          styles.visitSummary,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {getVisitSummaryText(
          recommendation,
        )}
      </Text>

      {representativeLabels.length >
      0 ? (
        <View
          style={styles.tagRow}
        >
          {representativeLabels.map(
            (label) => (
              <View
                key={label}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            ),
          )}
        </View>
      ) : null}

      <View
        style={[
          styles.reasonArea,
          {
            borderTopColor:
              theme.line,
          },
        ]}
      >
        {recommendation.reasons.map(
          (reason) => (
            <View
              key={reason}
              style={styles.reasonRow}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={14}
                color={theme.subText}
              />
              <Text
                style={[
                  styles.reasonText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {reason}
              </Text>
            </View>
          ),
        )}
      </View>

      {/* SAVED_CAFE_V49_RECOMMENDATION_FEEDBACK_UI */}
      <View
        style={[
          styles.feedbackArea,
          {
            borderTopColor:
              theme.line,
          },
        ]}
      >
        <View
          style={styles.feedbackHeaderRow}
        >
          <Text
            style={[
              styles.feedbackLabel,
              {
                color:
                  theme.text,
              },
            ]}
          >
            이 추천 어때요?
          </Text>
          <Text
            style={[
              styles.feedbackHint,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            같은 버튼을 다시 누르면 해제
          </Text>
        </View>

        <View
          style={styles.feedbackButtonRow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected:
                recommendation.feedbackReaction ===
                'interested',
              disabled:
                savingFeedback,
            }}
            accessibilityLabel="이 카페 추천에 관심 있어요"
            disabled={
              savingFeedback
            }
            onPress={(event) => {
              event.stopPropagation();
              onFeedback(
                'interested',
              );
            }}
            style={({ pressed }) => {
              const selected =
                recommendation.feedbackReaction ===
                'interested';

              return [
                styles.feedbackButton,
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
                    savingFeedback
                      ? 0.45
                      : pressed
                        ? 0.6
                        : 1,
                },
              ];
            }}
          >
            <Ionicons
              name="heart-outline"
              size={14}
              color={
                recommendation.feedbackReaction ===
                'interested'
                  ? theme.buttonText
                  : theme.text
              }
            />
            <Text
              style={[
                styles.feedbackButtonText,
                {
                  color:
                    recommendation.feedbackReaction ===
                    'interested'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              관심 있어요
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected:
                recommendation.feedbackReaction ===
                'wantToGo',
              disabled:
                savingFeedback,
            }}
            accessibilityLabel="이 카페를 나중에 가볼래요"
            disabled={
              savingFeedback
            }
            onPress={(event) => {
              event.stopPropagation();
              onFeedback(
                'wantToGo',
              );
            }}
            style={({ pressed }) => {
              const selected =
                recommendation.feedbackReaction ===
                'wantToGo';

              return [
                styles.feedbackButton,
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
                    savingFeedback
                      ? 0.45
                      : pressed
                        ? 0.6
                        : 1,
                },
              ];
            }}
          >
            <Ionicons
              name="bookmark-outline"
              size={14}
              color={
                recommendation.feedbackReaction ===
                'wantToGo'
                  ? theme.buttonText
                  : theme.text
              }
            />
            <Text
              style={[
                styles.feedbackButtonText,
                {
                  color:
                    recommendation.feedbackReaction ===
                    'wantToGo'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              나중에 가볼래요
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected:
                recommendation.feedbackReaction ===
                'notInterested',
              disabled:
                savingFeedback,
            }}
            accessibilityLabel="이 카페 추천에 관심 없어요"
            disabled={
              savingFeedback
            }
            onPress={(event) => {
              event.stopPropagation();
              onFeedback(
                'notInterested',
              );
            }}
            style={({ pressed }) => {
              const selected =
                recommendation.feedbackReaction ===
                'notInterested';

              return [
                styles.feedbackButton,
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
                    savingFeedback
                      ? 0.45
                      : pressed
                        ? 0.6
                        : 1,
                },
              ];
            }}
          >
            <Ionicons
              name="close-circle-outline"
              size={14}
              color={
                recommendation.feedbackReaction ===
                'notInterested'
                  ? theme.buttonText
                  : theme.text
              }
            />
            <Text
              style={[
                styles.feedbackButtonText,
                {
                  color:
                    recommendation.feedbackReaction ===
                    'notInterested'
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              관심 없어요
            </Text>
          </Pressable>
        </View>

        {recommendation.feedbackReaction ? (
          <Text
            style={[
              styles.feedbackAppliedText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {recommendation.feedbackReaction ===
            'interested'
              ? '이 카페와 비슷한 특성을 더 추천하도록 학습했어요.'
              : recommendation.feedbackReaction ===
                  'wantToGo'
                ? '이 카페를 다음 추천에서도 더 잘 보이도록 반영했어요.'
                : '이 카페와 비슷한 특성의 추천 점수를 낮추도록 학습했어요.'}
          </Text>
        ) : null}
      </View>

      <View
        style={styles.detailHint}
      >
        <Text
          style={[
            styles.detailHintText,
            {
              color:
                theme.text,
            },
          ]}
        >
          카페 상세 보기
        </Text>
        <Ionicons
          name="chevron-forward"
          size={15}
          color={theme.text}
        />
      </View>
    </Pressable>
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
      marginTop: 3,
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
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

    profileCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
    },

    profileIcon: {
      width: 42,
      height: 42,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    profileTextArea: {
      flex: 1,
      minWidth: 0,
    },

    profileTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 8,
    },

    profileLabel: {
      fontSize: 9,
      fontWeight: '800',
    },

    confidenceText: {
      fontSize: 10,
      fontWeight: '900',
    },

    profileTitle: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.25,
    },

    profileDescription: {
      marginTop: 5,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
    },

    tipCard: {
      minHeight: 40,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    tipText: {
      flex: 1,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    learningCard: {
      minHeight: 62,
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    learningIcon: {
      width: 36,
      height: 36,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    learningTextArea: {
      flex: 1,
      minWidth: 0,
    },

    learningTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 8,
    },

    learningTitle: {
      fontSize: 11.5,
      fontWeight: '900',
    },

    learningStatus: {
      fontSize: 8.8,
      fontWeight: '800',
    },

    learningDescription: {
      marginTop: 4,
      fontSize: 9.2,
      fontWeight: '700',
      lineHeight: 14,
    },

    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    sectionSubtitle: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
    },

    modeRow: {
      gap: 7,
      paddingRight: 4,
    },

    modeChip: {
      minHeight: 33,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modeChipText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    sectionHeadingRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent:
        'space-between',
      gap: 10,
    },

    resultCount: {
      fontSize: 10,
      fontWeight: '800',
    },

    stack: {
      gap: 9,
    },

    recommendationCard: {
      padding: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    rankBadge: {
      width: 30,
      height: 30,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    rankText: {
      fontSize: 12,
      fontWeight: '900',
    },

    cardTitleArea: {
      flex: 1,
      minWidth: 0,
    },

    cafeName: {
      fontSize: 13.5,
      fontWeight: '900',
      letterSpacing: -0.2,
    },

    cafeMeta: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
    },

    scoreBadge: {
      width: 48,
      minHeight: 42,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    scoreLabel: {
      fontSize: 8,
      fontWeight: '800',
    },

    scoreValue: {
      marginTop: 1,
      fontSize: 15,
      fontWeight: '900',
    },

    address: {
      marginTop: 9,
      fontSize: 9.5,
      fontWeight: '700',
    },

    visitSummary: {
      marginTop: 5,
      fontSize: 9.5,
      fontWeight: '800',
    },

    tagRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },

    tagChip: {
      minHeight: 25,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    tagText: {
      fontSize: 8.8,
      fontWeight: '800',
    },

    reasonArea: {
      marginTop: 10,
      paddingTop: 9,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      gap: 5,
    },

    reasonRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },

    reasonText: {
      flex: 1,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    feedbackArea: {
      marginTop: 10,
      paddingTop: 9,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      gap: 7,
    },

    feedbackHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 8,
    },

    feedbackLabel: {
      fontSize: 10,
      fontWeight: '900',
    },

    feedbackHint: {
      fontSize: 8,
      fontWeight: '700',
    },

    feedbackButtonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },

    feedbackButton: {
      minHeight: 30,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    feedbackButtonText: {
      fontSize: 9,
      fontWeight: '900',
    },

    feedbackAppliedText: {
      fontSize: 8.8,
      fontWeight: '700',
      lineHeight: 13,
    },

    detailHint: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 3,
    },

    detailHintText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    emptyModeCard: {
      minHeight: 150,
      padding: 20,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyModeTitle: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '900',
      textAlign: 'center',
    },

    emptyModeDescription: {
      marginTop: 5,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
      textAlign: 'center',
    },
  });
