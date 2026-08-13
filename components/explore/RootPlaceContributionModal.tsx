// ROOT_EXPLORE_V12A_CONTRIBUTION_MODAL

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
  RootPlaceReportKind,
  RootPlaceReportSelection,
} from '../../store/rootPlaceCommunity';

const ROOT_EXPLORE_ACCENT =
  '#A87532';

type Option = {
  value: string;
  label: string;
  description: string;
  icon:
    | 'checkmark-circle-outline'
    | 'close-circle-outline'
    | 'time-outline'
    | 'people-outline'
    | 'storefront-outline'
    | 'umbrella-outline'
    | 'alert-circle-outline'
    | 'location-outline';
};

const OPTIONS:
  Record<
    RootPlaceReportKind,
    readonly Option[]
  > = {
    business_hours: [
      {
        value:
          'open_now',
        label:
          '지금 영업 중',
        description:
          '현재 문을 열고 있어요.',
        icon:
          'checkmark-circle-outline',
      },
      {
        value:
          'closed_now',
        label:
          '지금 영업 종료',
        description:
          '현재 문을 닫았어요.',
        icon:
          'close-circle-outline',
      },
      {
        value:
          'hours_need_update',
        label:
          '영업시간 수정 필요',
        description:
          '표시된 시간이 실제와 달라요.',
        icon:
          'time-outline',
      },
    ],

    waiting: [
      {
        value: 'none',
        label:
          '웨이팅 없음',
        description:
          '바로 이용할 수 있어요.',
        icon:
          'checkmark-circle-outline',
      },
      {
        value:
          'within_10',
        label:
          '10분 내외',
        description:
          '잠깐 기다리면 들어갈 수 있어요.',
        icon:
          'people-outline',
      },
      {
        value:
          'around_20',
        label:
          '20분 내외',
        description:
          '조금 기다려야 해요.',
        icon:
          'people-outline',
      },
      {
        value:
          'over_30',
        label:
          '30분 이상',
        description:
          '현재 대기가 긴 편이에요.',
        icon:
          'people-outline',
      },
    ],

    outdoor_status: [
      {
        value:
          'outdoor_open',
        label:
          '야외석 운영 중',
        description:
          '지금 야장·야외 테이블을 이용할 수 있어요.',
        icon:
          'storefront-outline',
      },
      {
        value:
          'outdoor_closed',
        label:
          '야외석 닫힘',
        description:
          '오늘은 야외석을 운영하지 않아요.',
        icon:
          'close-circle-outline',
      },
      {
        value:
          'outdoor_unknown',
        label:
          '확인 필요',
        description:
          '현장 운영 여부가 확실하지 않아요.',
        icon:
          'alert-circle-outline',
      },
    ],

    rain_status: [
      {
        value:
          'rain_available',
        label:
          '비 와도 가능',
        description:
          '비가 와도 이용할 수 있어요.',
        icon:
          'umbrella-outline',
      },
      {
        value:
          'covered_only',
        label:
          '천막 자리만 가능',
        description:
          '지붕·천막이 있는 일부 자리만 가능해요.',
        icon:
          'umbrella-outline',
      },
      {
        value:
          'rain_unavailable',
        label:
          '비 오면 어려움',
        description:
          '우천 시 야외 이용이 어려워요.',
        icon:
          'close-circle-outline',
      },
    ],

    visit: [
      {
        value:
          'visited_now',
        label:
          '지금 방문 인증',
        description:
          '현재 시각 기준으로 이 장소 방문을 기록해요.',
        icon:
          'location-outline',
      },
    ],

    correction: [
      {
        value:
          'needs_correction',
        label:
          '정보 수정 필요',
        description:
          '주소·분류·장소 정보 중 수정이 필요한 항목이 있어요.',
        icon:
          'alert-circle-outline',
      },
    ],
  };

const TITLES:
  Record<
    RootPlaceReportKind,
    string
  > = {
    business_hours:
      '영업시간 제보',
    waiting:
      '웨이팅 현황',
    outdoor_status:
      '야외석 운영',
    rain_status:
      '우천 이용 정보',
    visit:
      '방문 인증',
    correction:
      '정보 수정 제안',
  };

export default function
RootPlaceContributionModal({
  visible,
  placeName,
  kind,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  placeName: string;
  kind:
    RootPlaceReportKind;
  submitting: boolean;
  onClose: () => void;
  onSubmit:
    (
      selection:
        RootPlaceReportSelection
    ) => void;
}) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const options =
    OPTIONS[kind];

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
                {TITLES[kind]}
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
              accessibilityRole="button"
              accessibilityLabel="제보 창 닫기"
              disabled={
                submitting
              }
              onPress={
                onClose
              }
              hitSlop={8}
              style={({ pressed }) => ({
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              })}
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
            지금 현장에서 확인한 정보에 가장 가까운 항목을 선택해주세요.
          </Text>

          <ScrollView
            style={
              styles.optionsScroll
            }
            contentContainerStyle={
              styles.options
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {options.map(
              (option) => (
                <Pressable
                  key={
                    option.value
                  }
                  disabled={
                    submitting
                  }
                  onPress={() =>
                    onSubmit({
                      value:
                        option.value,
                      label:
                        option.label,
                    })
                  }
                  style={({ pressed }) => [
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
                      opacity:
                        pressed
                          ? 0.6
                          : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      {
                        backgroundColor:
                          theme.card,
                        borderColor:
                          theme.line,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        option.icon
                      }
                      size={19}
                      color={
                        ROOT_EXPLORE_ACCENT
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.optionText
                    }
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
                      {option.label}
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
                      {option.description}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={
                      theme.subText
                    }
                  />
                </Pressable>
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
                  ROOT_EXPLORE_ACCENT
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
                제보를 저장하고 있어요.
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.pendingNotice,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              제보는 검수 대기 상태로 저장되며 장소의 공식 정보를 즉시 덮어쓰지 않아요.
            </Text>
          )}
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
      backgroundColor:
        'rgba(33, 26, 20, 0.46)',
      justifyContent:
        'center',
    },

    card: {
      width: '100%',
      maxHeight: '82%',
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
      alignItems: 'flex-start',
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
      letterSpacing: -0.4,
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

    optionsScroll: {
      marginTop: 12,
    },

    options: {
      gap: 8,
      paddingBottom: 2,
    },

    option: {
      minHeight: 66,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    optionIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    optionText: {
      flex: 1,
      minWidth: 0,
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

    pendingNotice: {
      marginTop: 12,
      fontSize: 9,
      lineHeight: 13,
      textAlign: 'center',
      fontWeight: '600',
    },
  });
