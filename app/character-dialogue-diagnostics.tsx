import React, {
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  router,
} from 'expo-router';

import {
  CHARACTER_DIALOGUE_RELEASE_TUNING,
  runCharacterDialogueDeterministicDiagnostics,
  type CharacterDialogueDiagnosticCheck,
} from '../store/characterDialogueDiagnostics';

// CHARACTER_V99E_DIALOGUE_DIAGNOSTICS_SCREEN
const CONTEXT_LABEL = {
  idle:
    'idle',
  lookAround:
    '둘러보기',
  sit:
    '앉아 쉬기',
  sleep:
    '잠들기',
} as const;

function CheckRow(
  {
    item,
  }: {
    item:
      CharacterDialogueDiagnosticCheck;
  }
) {
  return (
    <View
      style={
        styles.checkRow
      }
    >
      <View
        style={
          styles.checkCopy
        }
      >
        <Text
          style={
            styles.checkLabel
          }
        >
          {item.label}
        </Text>

        <Text
          style={
            styles.checkValue
          }
        >
          기대 {item.expected}
          {'  ·  '}
          실제 {item.actual}
        </Text>
      </View>

      <Text
        style={[
          styles.passBadge,
          !item.pass &&
            styles.failBadge,
        ]}
      >
        {
          item.pass
            ? 'PASS'
            : 'CHECK'
        }
      </Text>
    </View>
  );
}

export default function CharacterDialogueDiagnosticsScreen() {
  const [
    runCount,
    setRunCount,
  ] =
    useState(
      0
    );

  const snapshot =
    useMemo(
      () => {
        void runCount;

        return runCharacterDialogueDeterministicDiagnostics();
      },
      [
        runCount,
      ]
    );

  const tuning =
    CHARACTER_DIALOGUE_RELEASE_TUNING;

  return (
    <View
      style={
        styles.screen
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          onPress={
            () =>
              router.back()
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            뒤로
          </Text>
        </Pressable>

        <View>
          <Text
            style={
              styles.title
            }
          >
            대사 정책 진단
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            V99E deterministic release simulation
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={[
            styles.statusCard,
            !snapshot.releaseReady &&
              styles.statusCardFail,
          ]}
        >
          <Text
            style={
              styles.statusEyebrow
            }
          >
            RELEASE STATUS
          </Text>

          <Text
            style={
              styles.statusTitle
            }
          >
            {
              snapshot.releaseReady
                ? 'READY'
                : 'CHECK REQUIRED'
            }
          </Text>

          <Text
            style={
              styles.statusBody
            }
          >
            {
              snapshot.passedChecks
            }
            {' / '}
            {
              snapshot.totalChecks
            }
            {' checks · seed '}
            {
              snapshot.seed
            }
          </Text>

          <Text
            style={
              styles.statusBody
            }
          >
            context당 {
              snapshot.samplesPerContext
                .toLocaleString()
            }회 고정 시뮬레이션
          </Text>
        </View>

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            출시 튜닝
          </Text>

          <Text
            style={
              styles.cardDescription
            }
          >
            V99D 값을 바꾸지 않고 출시 범위 안인지 검증합니다.
          </Text>

          <View
            style={
              styles.tuningGrid
            }
          >
            <View
              style={
                styles.tuningItem
              }
            >
              <Text
                style={
                  styles.tuningValue
                }
              >
                {
                  tuning
                    .interactionCooldownMs /
                  1000
                }s
              </Text>
              <Text
                style={
                  styles.tuningLabel
                }
              >
                터치 대사
              </Text>
            </View>

            <View
              style={
                styles.tuningItem
              }
            >
              <Text
                style={
                  styles.tuningValue
                }
              >
                {
                  tuning
                    .startupGraceMs /
                  1000
                }s
              </Text>
              <Text
                style={
                  styles.tuningLabel
                }
              >
                시작 유예
              </Text>
            </View>

            <View
              style={
                styles.tuningItem
              }
            >
              <Text
                style={
                  styles.tuningValue
                }
              >
                {
                  tuning
                    .autonomousCooldownMs /
                  1000
                }s
              </Text>
              <Text
                style={
                  styles.tuningLabel
                }
              >
                자율 cooldown
              </Text>
            </View>
          </View>

          {
            snapshot
              .releaseTuningChecks
              .map(
                (
                  item
                ) => (
                  <CheckRow
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                  />
                )
              )
          }
        </View>

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            친밀도 경계
          </Text>

          {
            snapshot
              .relationshipChecks
              .map(
                (
                  item
                ) => (
                  <CheckRow
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                  />
                )
              )
          }
        </View>

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            상태 우선순위
          </Text>

          {
            snapshot
              .statePriorityChecks
              .map(
                (
                  item
                ) => (
                  <CheckRow
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                  />
                )
              )
          }
        </View>

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            자율 대사 확률
          </Text>

          <Text
            style={
              styles.cardDescription
            }
          >
            같은 seed로 다시 실행하면 같은 결과가 나옵니다.
          </Text>

          {
            snapshot
              .autonomousRateChecks
              .map(
                (
                  item
                ) => (
                  <View
                    key={
                      item.context
                    }
                    style={
                      styles.rateRow
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.checkLabel
                        }
                      >
                        {
                          CONTEXT_LABEL[
                            item.context
                          ]
                        }
                      </Text>

                      <Text
                        style={
                          styles.checkValue
                        }
                      >
                        기대 {
                          (
                            item.expectedRate *
                            100
                          ).toFixed(
                            1
                          )
                        }%
                        {'  ·  '}
                        관측 {
                          (
                            item.observedRate *
                            100
                          ).toFixed(
                            2
                          )
                        }%
                        {'  ·  '}
                        {
                          item.hits
                        }회
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.passBadge,
                        !item.pass &&
                          styles.failBadge,
                      ]}
                    >
                      {
                        item.pass
                          ? 'PASS'
                          : 'CHECK'
                      }
                    </Text>
                  </View>
                )
              )
          }
        </View>

        <Pressable
          onPress={
            () =>
              setRunCount(
                (
                  value
                ) =>
                  value +
                  1
              )
          }
          style={
            styles.runButton
          }
        >
          <Text
            style={
              styles.runButtonText
            }
          >
            같은 시드로 다시 검증
          </Text>
        </Pressable>

        <Text
          style={
            styles.footer
          }
        >
          이 화면은 실제 대사를 발생시키거나 친밀도·XP·클라우드 데이터를 변경하지 않습니다.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#F6F2EC',
    },
    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 12,
      paddingTop: 18,
      paddingHorizontal:
        18,
      paddingBottom: 12,
    },
    backButton: {
      paddingHorizontal:
        12,
      paddingVertical:
        8,
      borderRadius:
        12,
      backgroundColor:
        '#FFFFFF',
    },
    backText: {
      fontSize: 12,
      fontWeight:
        '800',
      color:
        '#453D36',
    },
    title: {
      fontSize: 20,
      fontWeight:
        '900',
      color:
        '#302A25',
    },
    subtitle: {
      marginTop: 2,
      fontSize: 11,
      color:
        '#7B7067',
    },
    content: {
      paddingHorizontal:
        18,
      paddingBottom: 40,
      gap: 12,
    },
    statusCard: {
      padding: 18,
      borderRadius:
        20,
      backgroundColor:
        '#E6F2E8',
      borderWidth: 1,
      borderColor:
        '#C5DEC9',
    },
    statusCardFail: {
      backgroundColor:
        '#F7E7E4',
      borderColor:
        '#E6C1BA',
    },
    statusEyebrow: {
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#6E645B',
      letterSpacing:
        1.1,
    },
    statusTitle: {
      marginTop: 3,
      fontSize: 26,
      fontWeight:
        '900',
      color:
        '#2D3C31',
    },
    statusBody: {
      marginTop: 4,
      fontSize: 12,
      fontWeight:
        '700',
      color:
        '#5E655F',
    },
    card: {
      padding: 16,
      borderRadius:
        18,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E5DDD4',
    },
    cardTitle: {
      fontSize: 15,
      fontWeight:
        '900',
      color:
        '#342E29',
    },
    cardDescription: {
      marginTop: 4,
      marginBottom: 8,
      fontSize: 11,
      lineHeight: 16,
      color:
        '#7A7067',
    },
    tuningGrid: {
      flexDirection:
        'row',
      gap: 8,
      marginTop: 10,
      marginBottom: 8,
    },
    tuningItem: {
      flex: 1,
      paddingVertical:
        10,
      borderRadius:
        13,
      backgroundColor:
        '#F7F3EE',
      alignItems:
        'center',
    },
    tuningValue: {
      fontSize: 16,
      fontWeight:
        '900',
      color:
        '#3D352F',
    },
    tuningLabel: {
      marginTop: 2,
      fontSize: 9,
      fontWeight:
        '700',
      color:
        '#81766D',
    },
    checkRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      gap: 10,
      paddingVertical:
        9,
      borderTopWidth: 1,
      borderTopColor:
        '#F0EBE5',
    },
    checkCopy: {
      flex: 1,
    },
    checkLabel: {
      fontSize: 12,
      fontWeight:
        '800',
      color:
        '#403831',
    },
    checkValue: {
      marginTop: 2,
      fontSize: 10,
      color:
        '#81766D',
    },
    passBadge: {
      paddingHorizontal:
        8,
      paddingVertical:
        4,
      borderRadius:
        999,
      overflow:
        'hidden',
      fontSize: 9,
      fontWeight:
        '900',
      color:
        '#365B3F',
      backgroundColor:
        '#E1F0E4',
    },
    failBadge: {
      color:
        '#824B43',
      backgroundColor:
        '#F5E1DD',
    },
    rateRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      gap: 10,
      paddingVertical:
        10,
      borderTopWidth: 1,
      borderTopColor:
        '#F0EBE5',
    },
    runButton: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical:
        14,
      borderRadius:
        16,
      backgroundColor:
        '#403831',
    },
    runButtonText: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#FFFFFF',
    },
    footer: {
      paddingHorizontal:
        10,
      fontSize: 10,
      lineHeight: 15,
      textAlign:
        'center',
      color:
        '#81776E',
    },
  });
