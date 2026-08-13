// ROOT_EXPLORE_V12D_COMMUNITY_SAFETY_MODAL

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useRootTheme,
} from '../../store/rootTheme';

import type {
  RootPlaceCommunityReportReason,
} from '../../store/rootPlaceCommunitySafety';

const ACCENT =
  '#A96813';

const REASONS:
  Array<{
    value:
      RootPlaceCommunityReportReason;
    label: string;
    description: string;
  }> = [
    {
      value:
        'wrong_or_misleading',
      label:
        '정보가 사실과 달라요',
      description:
        '영업·웨이팅·야외석 등 현장 정보가 잘못됐어요.',
    },
    {
      value:
        'inappropriate_media',
      label:
        '부적절한 사진·콘텐츠',
      description:
        '장소와 무관하거나 불쾌한 콘텐츠가 포함돼요.',
    },
    {
      value:
        'wrong_place',
      label:
        '다른 장소의 정보예요',
      description:
        '사진 또는 제보가 이 장소와 맞지 않아요.',
    },
    {
      value:
        'spam',
      label:
        '광고·도배·스팸',
      description:
        '반복 광고나 의미 없는 제보로 보여요.',
    },
    {
      value:
        'privacy',
      label:
        '개인정보·초상권 문제',
      description:
        '노출되면 안 되는 개인정보 또는 사진이 있어요.',
    },
    {
      value:
        'other',
      label:
        '기타 문제',
      description:
        '그 밖에 검수가 필요한 이유가 있어요.',
    },
  ];

export default function
RootPlaceCommunitySafetyModal({
  visible,
  placeName,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  placeName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit:
    (
      reason:
        RootPlaceCommunityReportReason,
      hideAfter:
        boolean
    ) => void;
}) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        submitting
          ? undefined
          : onClose
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <Pressable
          style={
            StyleSheet
              .absoluteFill
          }
          disabled={
            submitting
          }
          onPress={
            onClose
          }
        />

        <View
          style={[
            styles.card,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 4
                  : 22,
            },
          ]}
        >
          <View
            style={
              styles.header
            }
          >
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
                커뮤니티 정보 신고
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.placeName,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {placeName}
              </Text>
            </View>

            <Pressable
              disabled={
                submitting
              }
              onPress={
                onClose
              }
              hitSlop={8}
            >
              <Ionicons
                name="close"
                size={23}
                color={
                  theme.text
                }
              />
            </Pressable>
          </View>

          <Text
            style={[
              styles.helper,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            신고 이유를 선택하면 관리자 검수 대상으로 저장돼요.
          </Text>

          <ScrollView
            style={
              styles.scroll
            }
            contentContainerStyle={
              styles.options
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {REASONS.map(
              (
                reason
              ) => (
                <View
                  key={
                    reason.value
                  }
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        theme.background,
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
                      styles.optionLabel,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {reason.label}
                  </Text>

                  <Text
                    style={[
                      styles.optionDescription,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {reason.description}
                  </Text>

                  <View
                    style={
                      styles.actions
                    }
                  >
                    <Pressable
                      disabled={
                        submitting
                      }
                      onPress={() =>
                        onSubmit(
                          reason.value,
                          false
                        )
                      }
                      style={[
                        styles.secondaryButton,
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
                      <Text
                        style={[
                          styles.secondaryText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        신고만
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={
                        submitting
                      }
                      onPress={() =>
                        onSubmit(
                          reason.value,
                          true
                        )
                      }
                      style={[
                        styles.primaryButton,
                        {
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 10,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        신고하고 숨기기
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )
            )}
          </ScrollView>

          {submitting ? (
            <View
              style={
                styles.saving
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  ACCENT
                }
              />
              <Text
                style={[
                  styles.savingText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                신고를 저장하고 있어요.
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    backdrop: {
      flex: 1,
      paddingHorizontal: 18,
      paddingVertical: 28,
      justifyContent:
        'center',
      backgroundColor:
        'rgba(33, 26, 20, 0.46)',
    },

    card: {
      width: '100%',
      maxHeight: '84%',
      padding: 16,
      borderWidth:
        StyleSheet.hairlineWidth,
      elevation: 14,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.22,
      shadowRadius: 12,
    },

    header: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 12,
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '900',
    },

    placeName: {
      marginTop: 3,
      fontSize: 10.5,
      lineHeight: 15,
      fontWeight: '700',
    },

    helper: {
      marginTop: 12,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '600',
    },

    scroll: {
      marginTop: 12,
    },

    options: {
      gap: 9,
      paddingBottom: 2,
    },

    option: {
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    optionLabel: {
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '900',
    },

    optionDescription: {
      marginTop: 3,
      fontSize: 9.5,
      lineHeight: 14,
      fontWeight: '600',
    },

    actions: {
      marginTop: 10,
      flexDirection: 'row',
      gap: 7,
    },

    secondaryButton: {
      flex: 1,
      minHeight: 34,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    secondaryText: {
      fontSize: 9.5,
      fontWeight: '800',
    },

    primaryButton: {
      flex: 1.35,
      minHeight: 34,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        ACCENT,
    },

    primaryText: {
      color: '#FFFFFF',
      fontSize: 9.5,
      fontWeight: '900',
    },

    saving: {
      marginTop: 12,
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 8,
    },

    savingText: {
      fontSize: 10,
      fontWeight: '700',
    },
  });
