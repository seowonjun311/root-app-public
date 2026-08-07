import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
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
  runSavedCafeIntegrationDiagnostics,
  type SavedCafeDiagnosticCheck,
  type SavedCafeDiagnosticReport,
  type SavedCafeDiagnosticStatus,
} from '../../store/savedCafeDiagnostics';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V51_INTEGRATION_DIAGNOSTICS_SCREEN

type DiagnosticRoute = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  pathname: string;
};

const MANUAL_ROUTES:
  DiagnosticRoute[] = [
    {
      label: '저장 카페',
      description:
        '검색·필터·지도·폴더 진입',
      icon: 'cafe-outline',
      pathname:
        '/place/saved-cafes',
    },
    {
      label: '방문 기록',
      description:
        'V42 타임라인·방문 추가',
      icon: 'time-outline',
      pathname:
        '/place/saved-cafe-visits',
    },
    {
      label: '방문 캘린더',
      description:
        'V45 월별 방문 기록',
      icon: 'calendar-outline',
      pathname:
        '/place/saved-cafe-visit-calendar',
    },
    {
      label: '방문 인사이트',
      description:
        'V43·V47 통계 확인',
      icon: 'stats-chart-outline',
      pathname:
        '/place/saved-cafe-visit-insights',
    },
    {
      label: '방문 챌린지',
      description:
        'V44 챌린지·마일스톤',
      icon: 'trophy-outline',
      pathname:
        '/place/saved-cafe-visit-challenges',
    },
    {
      label: '맞춤 추천',
      description:
        'V48·V49 추천과 피드백',
      icon: 'sparkles-outline',
      pathname:
        '/place/saved-cafe-recommendations',
    },
    {
      label: '취향 설정',
      description:
        'V50 직접 추천 가중치',
      icon: 'options-outline',
      pathname:
        '/place/saved-cafe-recommendation-preferences',
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

  return String(error);
}

function formatReportTime(
  value: string,
) {
  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime(),
    )
  ) {
    return '';
  }

  return date.toLocaleString(
    'ko-KR',
    {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function getStatusIcon(
  status: SavedCafeDiagnosticStatus,
): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'pass':
      return 'checkmark-circle-outline';
    case 'warning':
      return 'warning-outline';
    case 'fail':
      return 'close-circle-outline';
    default:
      return 'information-circle-outline';
  }
}

function getStatusLabel(
  status: SavedCafeDiagnosticStatus,
) {
  switch (status) {
    case 'pass':
      return 'PASS';
    case 'warning':
      return '확인';
    case 'fail':
      return 'FAIL';
    default:
      return '정보';
  }
}

export default function SavedCafeDiagnosticsScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    report,
    setReport,
  ] = useState<
    SavedCafeDiagnosticReport | null
  >(null);

  const [
    runningMode,
    setRunningMode,
  ] = useState<
    'local' | 'sync' | null
  >(null);

  const [
    runError,
    setRunError,
  ] = useState('');

  const runDiagnostics =
    useCallback(
      async (
        includeCloudSync:
          boolean,
      ) => {
        if (runningMode) {
          return;
        }

        setRunningMode(
          includeCloudSync
            ? 'sync'
            : 'local',
        );

        setRunError('');

        try {
          const next =
            await runSavedCafeIntegrationDiagnostics({
              includeCloudSync,
            });

          setReport(next);
        } catch (error) {
          console.log(
            'SAVED CAFE V51 DIAGNOSTICS ERROR',
            error,
          );

          setRunError(
            getErrorMessage(
              error,
            ),
          );
        } finally {
          setRunningMode(null);
        }
      },
      [runningMode],
    );

  useFocusEffect(
    useCallback(() => {
      if (
        !report &&
        !runningMode
      ) {
        void runDiagnostics(
          false,
        );
      }
    }, [
      report,
      runDiagnostics,
      runningMode,
    ]),
  );

  const confirmSyncDiagnostics =
    useCallback(() => {
      if (runningMode) {
        return;
      }

      Alert.alert(
        '동기화 포함 점검',
        '로그인 상태라면 저장 카페·방문·폴더·추천 피드백·취향 설정의 기존 Firestore 병합 동기화를 실행합니다. 데이터 삭제는 하지 않아요.',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '점검 실행',
            onPress: () => {
              void runDiagnostics(
                true,
              );
            },
          },
        ],
      );
    }, [
      runDiagnostics,
      runningMode,
    ]);

  const overallTitle =
    report
      ? report.failCount > 0
        ? '수정이 필요한 항목이 있어요'
        : report.warningCount > 0
          ? '핵심 검사는 통과했어요'
          : '카페 시스템이 안정적으로 연결돼 있어요'
      : '카페 시스템을 점검하고 있어요';

  const overallDescription =
    report
      ? report.failCount > 0
        ? 'FAIL 항목을 먼저 확인하고 V52로 넘어가지 않는 것을 권장해요.'
        : report.warningCount > 0
          ? '경고는 삭제된 과거 데이터나 테스트 데이터 부족처럼 확인이 필요한 항목이에요.'
          : 'V42~V50 데이터와 추천 계산에서 자동 진단 오류를 찾지 못했어요.'
      : '저장 카페부터 추천 취향까지 연결 상태를 읽고 있어요.';

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
            카페 시스템 통합 점검
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
            V42~V50 연결과 추천 계산을 비파괴 방식으로 검사해요.
          </Text>
        </View>
      </View>

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
            styles.heroCard,
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
              styles.heroIcon,
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
            {runningMode ? (
              <ActivityIndicator
                size="small"
                color={theme.text}
              />
            ) : (
              <Ionicons
                name={
                  report?.failCount
                    ? 'construct-outline'
                    : 'shield-checkmark-outline'
                }
                size={22}
                color={theme.text}
              />
            )}
          </View>

          <View
            style={styles.heroTextArea}
          >
            <Text
              style={[
                styles.heroTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {overallTitle}
            </Text>
            <Text
              style={[
                styles.heroDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {overallDescription}
            </Text>

            {report ? (
              <Text
                style={[
                  styles.reportTime,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {report.mode ===
                'sync'
                  ? '동기화 포함'
                  : '빠른 로컬'}{' '}
                · {formatReportTime(
                  report.generatedAt,
                )}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={styles.actionRow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="빠른 로컬 점검 실행"
            disabled={
              Boolean(
                runningMode,
              )
            }
            onPress={() => {
              void runDiagnostics(
                false,
              );
            }}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
                opacity:
                  runningMode
                    ? 0.45
                    : pressed
                      ? 0.6
                      : 1,
              },
            ]}
          >
            <Ionicons
              name="flash-outline"
              size={16}
              color={theme.text}
            />
            <Text
              style={[
                styles.actionButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              빠른 점검
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="클라우드 동기화 포함 점검 실행"
            disabled={
              Boolean(
                runningMode,
              )
            }
            onPress={
              confirmSyncDiagnostics
            }
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
                opacity:
                  runningMode
                    ? 0.45
                    : pressed
                      ? 0.6
                      : 1,
              },
            ]}
          >
            <Ionicons
              name="cloud-done-outline"
              size={16}
              color={theme.text}
            />
            <Text
              style={[
                styles.actionButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              동기화 포함
            </Text>
          </Pressable>
        </View>

        {runError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor:
                  theme.card,
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
              name="alert-circle-outline"
              size={17}
              color={theme.text}
            />
            <Text
              style={[
                styles.errorText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {runError}
            </Text>
          </View>
        ) : null}

        {report ? (
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
              진단 요약
            </Text>

            <View
              style={styles.summaryGrid}
            >
              <SummaryCard
                label="PASS"
                value={
                  report.passCount
                }
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              />
              <SummaryCard
                label="확인"
                value={
                  report.warningCount
                }
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              />
              <SummaryCard
                label="FAIL"
                value={
                  report.failCount
                }
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              />
              <SummaryCard
                label="정보"
                value={
                  report.infoCount
                }
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              />
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
              현재 데이터
            </Text>

            <View
              style={[
                styles.metricCard,
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
              <MetricRow
                label="저장 카페"
                value={`${report.metrics.savedCafeCount}곳`}
                theme={theme}
              />
              <MetricRow
                label="방문 기록"
                value={`${report.metrics.visitCount}회`}
                theme={theme}
              />
              <MetricRow
                label="폴더 / 연결"
                value={`${report.metrics.folderCount}개 / ${report.metrics.folderMembershipCount}건`}
                theme={theme}
              />
              <MetricRow
                label="활성 추천 피드백"
                value={`${report.metrics.feedbackCount}개`}
                theme={theme}
              />
              <MetricRow
                label="직접 취향 설정"
                value={`${report.metrics.preferenceAdjustedCount}개`}
                theme={theme}
              />
              <MetricRow
                label="전체 추천 후보"
                value={`${report.metrics.recommendationCount}곳`}
                theme={theme}
                last
              />
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
              자동 검사 결과
            </Text>

            <View
              style={styles.stack}
            >
              {report.checks.map(
                (check) => (
                  <DiagnosticCheckCard
                    key={check.id}
                    check={check}
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                ),
              )}
            </View>
          </>
        ) : null}

        <View
          style={[
            styles.safetyCard,
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
            name="lock-closed-outline"
            size={16}
            color={theme.subText}
          />
          <Text
            style={[
              styles.safetyText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            빠른 점검은 데이터를 삭제·수정하지 않아요. 동기화 포함 점검은 기존 저장 로직의 Firestore 병합 동기화만 실행하며 진단 과정에서 방문·폴더·피드백·취향 값을 임의로 바꾸지 않아요.
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
          화면별 수동 확인
        </Text>

        <Text
          style={[
            styles.sectionDescription,
            {
              color:
                theme.subText,
            },
          ]}
        >
          자동 검사가 통과한 뒤 아래 화면을 차례로 열어 실제 버튼·레이아웃·뒤로가기를 확인해 주세요.
        </Text>

        <View
          style={styles.stack}
        >
          {MANUAL_ROUTES.map(
            (item) => (
              <Pressable
                key={
                  item.pathname
                }
                accessibilityRole="button"
                accessibilityLabel={`${item.label} 화면 열기`}
                onPress={() =>
                  router.push(
                    item.pathname as never,
                  )
                }
                style={({ pressed }) => [
                  styles.routeCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 3
                        : 12,
                    opacity:
                      pressed
                        ? 0.58
                        : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.routeIcon,
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
                  <Ionicons
                    name={
                      item.icon
                    }
                    size={18}
                    color={
                      theme.text
                    }
                  />
                </View>

                <View
                  style={
                    styles.routeTextArea
                  }
                >
                  <Text
                    style={[
                      styles.routeTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.routeDescription,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={
                    theme.subText
                  }
                />
              </Pressable>
            ),
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function SummaryCard({
  label,
  value,
  theme,
  isCityBlack,
}: SummaryCardProps) {
  return (
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
              ? 2
              : 11,
        },
      ]}
    >
      <Text
        style={[
          styles.summaryValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.summaryLabel,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

type MetricRowProps = {
  label: string;
  value: string;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  last?: boolean;
};

function MetricRow({
  label,
  value,
  theme,
  last = false,
}: MetricRowProps) {
  return (
    <View
      style={[
        styles.metricRow,
        !last
          ? {
              borderBottomWidth:
                StyleSheet.hairlineWidth,
              borderBottomColor:
                theme.line,
            }
          : null,
      ]}
    >
      <Text
        style={[
          styles.metricLabel,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.metricValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

type DiagnosticCheckCardProps = {
  check: SavedCafeDiagnosticCheck;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function DiagnosticCheckCard({
  check,
  theme,
  isCityBlack,
}: DiagnosticCheckCardProps) {
  return (
    <View
      style={[
        styles.checkCard,
        {
          backgroundColor:
            theme.card,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 3
              : 12,
        },
      ]}
    >
      <View
        style={styles.checkTopRow}
      >
        <Ionicons
          name={
            getStatusIcon(
              check.status,
            )
          }
          size={18}
          color={theme.text}
        />

        <View
          style={styles.checkTitleArea}
        >
          <Text
            style={[
              styles.checkTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {check.title}
          </Text>
          <Text
            style={[
              styles.checkStatus,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {getStatusLabel(
              check.status,
            )}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.checkSummary,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {check.summary}
      </Text>

      {check.detail ? (
        <Text
          style={[
            styles.checkDetail,
            {
              color:
                theme.subText,
              borderTopColor:
                theme.line,
            },
          ]}
        >
          {check.detail}
        </Text>
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

    content: {
      paddingHorizontal: 14,
      paddingTop: 14,
      gap: 12,
    },

    heroCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
    },

    heroIcon: {
      width: 42,
      height: 42,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    heroTextArea: {
      flex: 1,
      minWidth: 0,
    },

    heroTitle: {
      fontSize: 14,
      fontWeight: '900',
    },

    heroDescription: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
    },

    reportTime: {
      marginTop: 6,
      fontSize: 8.8,
      fontWeight: '700',
    },

    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },

    actionButton: {
      flex: 1,
      minHeight: 39,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    actionButtonText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    errorCard: {
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },

    errorText: {
      flex: 1,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    sectionTitle: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '900',
    },

    sectionDescription: {
      marginTop: -6,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    summaryGrid: {
      flexDirection: 'row',
      gap: 7,
    },

    summaryCard: {
      flex: 1,
      minHeight: 68,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryValue: {
      fontSize: 18,
      fontWeight: '900',
    },

    summaryLabel: {
      marginTop: 3,
      fontSize: 8.5,
      fontWeight: '800',
    },

    metricCard: {
      borderWidth:
        StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },

    metricRow: {
      minHeight: 40,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },

    metricLabel: {
      fontSize: 9.5,
      fontWeight: '700',
    },

    metricValue: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    stack: {
      gap: 8,
    },

    checkCard: {
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    checkTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    checkTitleArea: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 8,
    },

    checkTitle: {
      flex: 1,
      fontSize: 11,
      fontWeight: '900',
    },

    checkStatus: {
      fontSize: 8.5,
      fontWeight: '900',
    },

    checkSummary: {
      marginTop: 7,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    checkDetail: {
      marginTop: 8,
      paddingTop: 7,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      fontSize: 8.8,
      fontWeight: '700',
      lineHeight: 13,
    },

    safetyCard: {
      padding: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },

    safetyText: {
      flex: 1,
      fontSize: 8.8,
      fontWeight: '700',
      lineHeight: 13,
    },

    routeCard: {
      minHeight: 58,
      padding: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    routeIcon: {
      width: 36,
      height: 36,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    routeTextArea: {
      flex: 1,
      minWidth: 0,
    },

    routeTitle: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    routeDescription: {
      marginTop: 3,
      fontSize: 8.8,
      fontWeight: '700',
    },
  });
