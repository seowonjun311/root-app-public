// ROOT_EXPLORE_V12D_MODERATION_SCREEN

import {
  Ionicons,
} from '@expo/vector-icons';

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
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useRootTheme,
} from '../../store/rootTheme';

import {
  getRootPlaceModerationErrorMessage,
  getRootPlaceModeratorAccess,
  moderateRootPlaceContribution,
  moderateRootPlaceSafetyReport,
  subscribeRootPlaceCommunitySafetyReports,
  subscribeRootPlaceModerationInbox,
  type RootPlaceModerationDecision,
  type RootPlaceModerationInboxItem,
  type RootPlaceSafetyModerationDecision,
} from '../../store/rootPlaceModeration';

import type {
  RootPlaceCommunitySafetyReport,
} from '../../store/rootPlaceCommunitySafety';

const ACCENT =
  '#A96813';

export default function
RootPlaceModerationScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const [
    checkingAccess,
    setCheckingAccess,
  ] = useState(true);

  const [
    allowed,
    setAllowed,
  ] = useState(false);

  const [
    items,
    setItems,
  ] = useState<
    RootPlaceModerationInboxItem[]
  >([]);

  const [
    reports,
    setReports,
  ] = useState<
    RootPlaceCommunitySafetyReport[]
  >([]);

  const [
    busyId,
    setBusyId,
  ] = useState<
    string | null
  >(null);

  const [
    loadError,
    setLoadError,
  ] = useState<
    string | null
  >(null);

  useFocusEffect(
    useCallback(
      () => {
        let active =
          true;

        let stopInbox =
          () => {};

        let stopReports =
          () => {};

        void (
          async () => {
            try {
              setCheckingAccess(
                true
              );

              const access =
                await getRootPlaceModeratorAccess(
                  false
                );

              if (!active) {
                return;
              }

              setAllowed(
                access.allowed
              );

              if (
                !access.allowed
              ) {
                return;
              }

              stopInbox =
                subscribeRootPlaceModerationInbox({
                  onChange:
                    (
                      nextItems
                    ) => {
                      if (
                        active
                      ) {
                        setItems(
                          nextItems
                        );
                      }
                    },
                  onError:
                    (
                      error
                    ) => {
                      if (
                        active
                      ) {
                        setLoadError(
                          getRootPlaceModerationErrorMessage(
                            error
                          )
                        );
                      }
                    },
                });

              stopReports =
                subscribeRootPlaceCommunitySafetyReports({
                  onChange:
                    (
                      nextReports
                    ) => {
                      if (
                        active
                      ) {
                        setReports(
                          nextReports
                        );
                      }
                    },
                  onError:
                    (
                      error
                    ) => {
                      if (
                        active
                      ) {
                        setLoadError(
                          getRootPlaceModerationErrorMessage(
                            error
                          )
                        );
                      }
                    },
                });
            } catch (error) {
              if (
                active
              ) {
                setAllowed(
                  false
                );
                setLoadError(
                  getRootPlaceModerationErrorMessage(
                    error
                  )
                );
              }
            } finally {
              if (
                active
              ) {
                setCheckingAccess(
                  false
                );
              }
            }
          }
        )();

        return () => {
          active =
            false;

          stopInbox();
          stopReports();
        };
      },
      []
    )
  );

  const runContributionDecision =
    useCallback(
      async (
        item:
          RootPlaceModerationInboxItem,
        decision:
          RootPlaceModerationDecision
      ) => {
        if (
          busyId
        ) {
          return;
        }

        try {
          setBusyId(
            item.id
          );

          await moderateRootPlaceContribution({
            item,
            decision,
          });

          Alert.alert(
            '검수 완료',
            decision ===
              'approve'
              ? '승인 후 공개 집계를 다시 계산했어요.'
              : decision ===
                'reject'
                ? '제보를 거절했어요.'
                : '제보를 숨김 처리하고 공개 집계를 다시 계산했어요.'
          );
        } catch (error) {
          Alert.alert(
            '검수 실패',
            getRootPlaceModerationErrorMessage(
              error
            )
          );
        } finally {
          setBusyId(
            null
          );
        }
      },
      [
        busyId,
      ]
    );

  const runSafetyDecision =
    useCallback(
      async (
        report:
          RootPlaceCommunitySafetyReport,
        decision:
          RootPlaceSafetyModerationDecision
      ) => {
        if (
          busyId
        ) {
          return;
        }

        try {
          setBusyId(
            report.id
          );

          await moderateRootPlaceSafetyReport({
            report,
            decision,
          });

          Alert.alert(
            '신고 처리 완료',
            decision ===
              'hide_public'
              ? '해당 장소의 승인 커뮤니티 데이터를 공개에서 숨겼어요.'
              : '신고를 기각 처리했어요.'
          );
        } catch (error) {
          Alert.alert(
            '신고 처리 실패',
            getRootPlaceModerationErrorMessage(
              error
            )
          );
        } finally {
          setBusyId(
            null
          );
        }
      },
      [
        busyId,
      ]
    );

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          hitSlop={8}
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={
              theme.text
            }
          />
        </Pressable>

        <View
          style={
            styles.headerText
          }
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
            ROOT 장소 검수
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            custom claim 관리자 전용
          </Text>
        </View>
      </View>

      {checkingAccess ? (
        <View
          style={
            styles.center
          }
        >
          <ActivityIndicator
            color={
              ACCENT
            }
          />
          <Text
            style={[
              styles.centerText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            관리자 권한을 확인하고 있어요.
          </Text>
        </View>
      ) : !allowed ? (
        <View
          style={
            styles.center
          }
        >
          <Ionicons
            name="shield-outline"
            size={34}
            color={
              theme.subText
            }
          />
          <Text
            style={[
              styles.deniedTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            관리자 권한이 필요해요
          </Text>
          <Text
            style={[
              styles.centerText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            rootModerator / moderator / admin custom claim 중 하나가 true인 계정만 접근할 수 있어요.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {loadError ? (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 12,
                },
              ]}
            >
              <Text
                style={[
                  styles.noticeText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {loadError}
              </Text>
            </View>
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
            제보 승인 대기 {items.length}
          </Text>

          {items.length ===
          0 ? (
            <EmptyCard
              text="승인 대기 제보가 없어요."
            />
          ) : (
            items.map(
              (
                item
              ) => (
                <View
                  key={
                    item.id
                  }
                  style={[
                    styles.card,
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
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {item.placeName}
                  </Text>

                  <Text
                    style={[
                      styles.meta,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {item.districtId || '지역 미확인'} · {item.kind}
                  </Text>

                  <Text
                    style={[
                      styles.value,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {item.valueLabel ||
                      (
                        item.media
                          ? item.media.mediaType ===
                            'video'
                            ? '현장 동영상'
                            : '현장 사진'
                          : '현장 제보'
                      )}
                  </Text>

                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <ModerationButton
                      label="승인"
                      disabled={
                        busyId ===
                        item.id
                      }
                      primary
                      onPress={() =>
                        void runContributionDecision(
                          item,
                          'approve'
                        )
                      }
                    />

                    <ModerationButton
                      label="거절"
                      disabled={
                        busyId ===
                        item.id
                      }
                      onPress={() =>
                        void runContributionDecision(
                          item,
                          'reject'
                        )
                      }
                    />

                    <ModerationButton
                      label="숨김"
                      disabled={
                        busyId ===
                        item.id
                      }
                      destructive
                      onPress={() =>
                        void runContributionDecision(
                          item,
                          'hide'
                        )
                      }
                    />
                  </View>
                </View>
              )
            )
          )}

          <Text
            style={[
              styles.sectionTitle,
              styles.reportTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            사용자 신고 {reports.length}
          </Text>

          {reports.length ===
          0 ? (
            <EmptyCard
              text="처리할 사용자 신고가 없어요."
            />
          ) : (
            reports.map(
              (
                report
              ) => (
                <View
                  key={
                    report.id
                  }
                  style={[
                    styles.card,
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
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {report.placeName}
                  </Text>

                  <Text
                    style={[
                      styles.meta,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    신고 이유 · {report.reason}
                  </Text>

                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <ModerationButton
                      label="신고 기각"
                      disabled={
                        busyId ===
                        report.id
                      }
                      onPress={() =>
                        void runSafetyDecision(
                          report,
                          'dismiss'
                        )
                      }
                    />

                    <ModerationButton
                      label="공개 숨김"
                      disabled={
                        busyId ===
                        report.id
                      }
                      destructive
                      onPress={() =>
                        void runSafetyDecision(
                          report,
                          'hide_public'
                        )
                      }
                    />
                  </View>
                </View>
              )
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );

  function EmptyCard({
    text,
  }: {
    text: string;
  }) {
    return (
      <View
        style={[
          styles.emptyCard,
          {
            backgroundColor:
              theme.card,
            borderColor:
              theme.line,
            borderRadius:
              isCityBlack
                ? 2
                : 14,
          },
        ]}
      >
        <Text
          style={[
            styles.emptyText,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }

  function ModerationButton({
    label,
    primary = false,
    destructive = false,
    disabled,
    onPress,
  }: {
    label: string;
    primary?: boolean;
    destructive?: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        disabled={
          disabled
        }
        onPress={
          onPress
        }
        style={({ pressed }) => [
          styles.actionButton,
          {
            borderRadius:
              isCityBlack
                ? 2
                : 10,
            borderColor:
              primary
                ? ACCENT
                : destructive
                  ? '#B64B45'
                  : theme.line,
            backgroundColor:
              primary
                ? ACCENT
                : destructive
                  ? 'rgba(182, 75, 69, 0.10)'
                  : theme.background,
            opacity:
              disabled
                ? 0.45
                : pressed
                  ? 0.65
                  : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.actionText,
            {
              color:
                primary
                  ? '#FFFFFF'
                  : destructive
                    ? '#B64B45'
                    : theme.text,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
    },

    header: {
      minHeight: 62,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '900',
    },

    subtitle: {
      marginTop: 2,
      fontSize: 9,
      lineHeight: 13,
      fontWeight: '700',
    },

    center: {
      flex: 1,
      paddingHorizontal: 26,
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 10,
    },

    centerText: {
      maxWidth: 360,
      textAlign: 'center',
      fontSize: 10.5,
      lineHeight: 16,
      fontWeight: '600',
    },

    deniedTitle: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '900',
    },

    content: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    notice: {
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      marginBottom: 14,
    },

    noticeText: {
      fontSize: 9.5,
      lineHeight: 14,
      fontWeight: '700',
    },

    sectionTitle: {
      marginTop: 6,
      marginBottom: 9,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '900',
    },

    reportTitle: {
      marginTop: 24,
    },

    card: {
      padding: 12,
      marginBottom: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    cardTitle: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '900',
    },

    meta: {
      marginTop: 3,
      fontSize: 8.8,
      lineHeight: 13,
      fontWeight: '700',
    },

    value: {
      marginTop: 8,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '700',
    },

    actionRow: {
      marginTop: 11,
      flexDirection: 'row',
      gap: 7,
    },

    actionButton: {
      flex: 1,
      minHeight: 34,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 6,
    },

    actionText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    emptyCard: {
      padding: 18,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
    },

    emptyText: {
      fontSize: 10,
      fontWeight: '700',
    },
  });
