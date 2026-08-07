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
  buildSavedCafeIntegrityRepairPlan,
  getSavedCafeIntegrityBackupSummaries,
  runSafeSavedCafeIntegrityRepair,
  type SavedCafeIntegrityBackupSummary,
  type SavedCafeIntegrityRepairPlan,
  type SavedCafeIntegrityRepairResult,
} from '../../store/savedCafeIntegrityRepair';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V52_INTEGRITY_REPAIR_SCREEN

function formatTime(
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

export default function SavedCafeIntegrityRepairScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    plan,
    setPlan,
  ] = useState<
    SavedCafeIntegrityRepairPlan | null
  >(null);

  const [
    backups,
    setBackups,
  ] = useState<
    SavedCafeIntegrityBackupSummary[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    repairing,
    setRepairing,
  ] = useState(false);

  const [
    errorText,
    setErrorText,
  ] = useState('');

  const [
    lastResult,
    setLastResult,
  ] = useState<
    SavedCafeIntegrityRepairResult | null
  >(null);

  const refresh =
    useCallback(
      async () => {
        setLoading(true);
        setErrorText('');

        try {
          const [
            nextPlan,
            nextBackups,
          ] = await Promise.all([
            buildSavedCafeIntegrityRepairPlan(),
            getSavedCafeIntegrityBackupSummaries(),
          ]);

          setPlan(
            nextPlan,
          );
          setBackups(
            nextBackups,
          );
        } catch (error) {
          console.log(
            'SAVED CAFE V52 INTEGRITY LOAD ERROR',
            error,
          );

          setErrorText(
            getErrorMessage(
              error,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [
      refresh,
    ]),
  );

  const runRepair =
    useCallback(
      async () => {
        if (
          repairing ||
          loading
        ) {
          return;
        }

        setRepairing(true);
        setErrorText('');

        try {
          const result =
            await runSafeSavedCafeIntegrityRepair();

          setLastResult(
            result,
          );

          const nextBackups =
            await getSavedCafeIntegrityBackupSummaries();

          setPlan(
            result.after,
          );
          setBackups(
            nextBackups,
          );

          Alert.alert(
            '안전 복구 완료',
            result.changedCount > 0
              ? `${result.changedCount}개의 안전 복구 항목을 정리했어요. 방문 기록은 삭제하지 않았어요.`
              : '자동으로 정리할 안전 복구 항목이 없어요.',
          );
        } catch (error) {
          console.log(
            'SAVED CAFE V52 INTEGRITY REPAIR ERROR',
            error,
          );

          const message =
            getErrorMessage(
              error,
            );

          setErrorText(
            message,
          );

          Alert.alert(
            '복구를 완료하지 못했어요',
            message,
          );
        } finally {
          setRepairing(false);
        }
      },
      [
        loading,
        repairing,
      ],
    );

  const confirmRepair =
    useCallback(() => {
      if (
        repairing ||
        loading
      ) {
        return;
      }

      if (
        !plan ||
        plan.safeActionCount === 0
      ) {
        Alert.alert(
          '안전 복구',
          '현재 자동으로 정리할 안전 복구 항목이 없어요.',
        );

        return;
      }

      Alert.alert(
        '안전 복구 실행',
        [
          '실행 전에 현재 카페 관련 상태를 로컬 백업으로 남겨요.',
          '',
          '깨진 폴더 연결과 저장 목록에 없는 카페의 활성 추천 피드백만 정리해요.',
          '',
          '저장 목록에 없는 카페의 과거 방문 기록은 삭제하지 않아요.',
        ].join('\n'),
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '복구 실행',
            onPress: () => {
              void runRepair();
            },
          },
        ],
      );
    }, [
      loading,
      plan,
      repairing,
      runRepair,
    ]);

  const safeIssues =
    plan?.issues.filter(
      (item) =>
        item.level ===
        'safe',
    ) ?? [];

  const reviewIssues =
    plan?.issues.filter(
      (item) =>
        item.level ===
        'review',
    ) ?? [];

  const latestBackup =
    backups[0] ??
    null;

  const busy =
    loading ||
    repairing;

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
            카페 데이터 안전 복구
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
            V52 무결성 분석 · 백업 · 안전 정리
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
            {busy ? (
              <ActivityIndicator
                size="small"
                color={theme.text}
              />
            ) : (
              <Ionicons
                name={
                  plan?.safeActionCount
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
              {plan
                ? plan.safeActionCount > 0
                  ? `${plan.safeActionCount}개의 안전 복구 항목이 있어요`
                  : '자동 복구가 필요한 오류를 찾지 못했어요'
                : '카페 데이터를 분석하고 있어요'}
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
              방문 기록은 과거 기록일 수 있어 자동 삭제하지 않고 별도 검토 항목으로 남겨요.
            </Text>
          </View>
        </View>

        <View
          style={styles.actionRow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="데이터 다시 분석"
            disabled={busy}
            onPress={() => {
              void refresh();
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
                  busy
                    ? 0.45
                    : pressed
                      ? 0.6
                      : 1,
              },
            ]}
          >
            <Ionicons
              name="scan-outline"
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
              다시 분석
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="안전 복구 실행"
            disabled={
              busy ||
              !plan ||
              plan.safeActionCount === 0
            }
            onPress={
              confirmRepair
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
                  busy ||
                  !plan ||
                  plan.safeActionCount === 0
                    ? 0.4
                    : pressed
                      ? 0.6
                      : 1,
              },
            ]}
          >
            <Ionicons
              name="construct-outline"
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
              안전 복구
            </Text>
          </Pressable>
        </View>

        {errorText ? (
          <View
            style={[
              styles.noticeCard,
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
                styles.noticeText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {errorText}
            </Text>
          </View>
        ) : null}

        {plan ? (
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
              {[
                [
                  '저장 카페',
                  `${plan.metrics.savedCafeCount}곳`,
                ],
                [
                  '방문 기록',
                  `${plan.metrics.visitCount}회`,
                ],
                [
                  '폴더 / 연결',
                  `${plan.metrics.folderCount}개 / ${plan.metrics.folderMembershipCount}건`,
                ],
                [
                  '활성 추천 피드백',
                  `${plan.metrics.activeFeedbackCount}개`,
                ],
              ].map(
                ([label, value], index, all) => (
                  <View
                    key={label}
                    style={[
                      styles.metricRow,
                      index <
                      all.length - 1
                        ? {
                            borderBottomColor:
                              theme.line,
                            borderBottomWidth:
                              StyleSheet.hairlineWidth,
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
                ),
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
              자동 복구 가능
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
              폴더 연결과 추천 피드백 중 의미가 분명한 항목만 자동 정리해요.
            </Text>

            {safeIssues.length > 0 ? (
              <View
                style={styles.stack}
              >
                {safeIssues.map(
                  (issue) => (
                    <View
                      key={issue.id}
                      style={[
                        styles.issueCard,
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
                        name="checkmark-circle-outline"
                        size={17}
                        color={theme.text}
                      />
                      <View
                        style={styles.issueTextArea}
                      >
                        <Text
                          style={[
                            styles.issueTitle,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {issue.title}
                        </Text>
                        <Text
                          style={[
                            styles.issueSummary,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {issue.summary}
                        </Text>
                      </View>
                    </View>
                  ),
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.noticeCard,
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
                  name="shield-checkmark-outline"
                  size={17}
                  color={theme.text}
                />
                <Text
                  style={[
                    styles.noticeText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  현재 자동 복구 대상이 없어요.
                </Text>
              </View>
            )}

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              검토 필요
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
              과거 방문 기록과 폴더 이름처럼 의미 판단이 필요한 데이터는 자동으로 바꾸지 않아요.
            </Text>

            {reviewIssues.length > 0 ? (
              <View
                style={styles.stack}
              >
                {reviewIssues.map(
                  (issue) => (
                    <View
                      key={issue.id}
                      style={[
                        styles.issueCard,
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
                        name="information-circle-outline"
                        size={17}
                        color={theme.text}
                      />
                      <View
                        style={styles.issueTextArea}
                      >
                        <Text
                          style={[
                            styles.issueTitle,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {issue.title}
                        </Text>
                        <Text
                          style={[
                            styles.issueSummary,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {issue.summary}
                        </Text>
                      </View>
                    </View>
                  ),
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.noticeCard,
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
                  name="checkmark-outline"
                  size={17}
                  color={theme.text}
                />
                <Text
                  style={[
                    styles.noticeText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  현재 별도 검토가 필요한 데이터가 없어요.
                </Text>
              </View>
            )}
          </>
        ) : null}

        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          복구 백업
        </Text>
        <View
          style={[
            styles.backupCard,
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
            name="archive-outline"
            size={17}
            color={theme.text}
          />
          <View
            style={styles.backupTextArea}
          >
            <Text
              style={[
                styles.issueTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {latestBackup
                ? `최근 백업 · ${formatTime(latestBackup.createdAt)}`
                : '아직 복구 백업이 없어요'}
            </Text>
            <Text
              style={[
                styles.issueSummary,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {latestBackup
                ? `최대 5개를 로컬에 보관해요. 현재 ${backups.length}개가 있어요.`
                : '안전 복구를 실제 실행하기 직전에 현재 상태를 자동 저장해요.'}
            </Text>
          </View>
        </View>

        {lastResult ? (
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
              복구 후 V51 재검사
            </Text>
            <View
              style={[
                styles.resultCard,
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
                  styles.resultTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                PASS {lastResult.postDiagnostic.passCount}
                {'  ·  '}
                확인 {lastResult.postDiagnostic.warningCount}
                {'  ·  '}
                FAIL {lastResult.postDiagnostic.failCount}
              </Text>
              <Text
                style={[
                  styles.issueSummary,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                안전 복구 {lastResult.changedCount}건 · 동기화 경고 {lastResult.syncWarningCount}건
              </Text>
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
            V52 안전 복구는 저장 카페 자체와 방문 기록을 삭제하지 않아요. 실제 변경 전 로컬 백업을 만들고, 정리 후 V51 진단을 다시 실행해 연결 상태를 확인해요.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    header: {
      minHeight: 74,
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerButton: {
      width: 34,
      height: 34,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextArea: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
    },
    subtitle: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: '500',
    },
    content: {
      padding: 16,
      gap: 10,
    },
    heroCard: {
      borderWidth: 1,
      padding: 14,
      flexDirection: 'row',
      gap: 11,
      alignItems: 'flex-start',
    },
    heroIcon: {
      width: 38,
      height: 38,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextArea: {
      flex: 1,
      minWidth: 0,
    },
    heroTitle: {
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 20,
    },
    heroDescription: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      minHeight: 40,
      borderWidth: 1,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '700',
    },
    sectionTitle: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '800',
    },
    sectionDescription: {
      marginTop: -4,
      fontSize: 11,
      lineHeight: 17,
    },
    metricCard: {
      borderWidth: 1,
      overflow: 'hidden',
    },
    metricRow: {
      minHeight: 39,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    metricValue: {
      fontSize: 12,
      fontWeight: '800',
    },
    stack: {
      gap: 7,
    },
    issueCard: {
      borderWidth: 1,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },
    issueTextArea: {
      flex: 1,
      minWidth: 0,
    },
    issueTitle: {
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 17,
    },
    issueSummary: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 17,
    },
    noticeCard: {
      borderWidth: 1,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    noticeText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '600',
    },
    backupCard: {
      borderWidth: 1,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },
    backupTextArea: {
      flex: 1,
      minWidth: 0,
    },
    resultCard: {
      borderWidth: 1,
      padding: 12,
    },
    resultTitle: {
      fontSize: 12,
      fontWeight: '800',
    },
    safetyCard: {
      marginTop: 8,
      borderWidth: 1,
      padding: 11,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    safetyText: {
      flex: 1,
      fontSize: 10.5,
      lineHeight: 16,
    },
  });
