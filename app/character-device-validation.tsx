import {
  Link,
  Stack,
} from 'expo-router';
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CHARACTER_IDS,
  type CharacterId,
} from '../constants/characterAssets';
import {
  CHARACTER_DEVICE_VALIDATION_CHECK_IDS,
  resetCharacterDeviceValidation,
  setCharacterDeviceValidationStatus,
  type CharacterDeviceValidationCheckId,
  type CharacterDeviceValidationStatus,
  useCharacterDeviceValidation,
} from '../store/characterDeviceValidation';
import {
  useSelectedCharacter,
} from '../store/selectedCharacter';

const CHARACTER_LABEL:
  Record<CharacterId, string> = {
  rooty: '\uB8E8\uD2F0',
  moru: '\uBAA8\uB8E8',
  mongsil: '\uBABD\uC2E4',
  dami: '\uB2E4\uBBF8',
};

const CHECK_LABEL:
  Record<
    CharacterDeviceValidationCheckId,
    string
  > = {
  selectedVisible:
    '\uC120\uD0DD\uD55C \uCE90\uB9AD\uD130\uAC00 Home\uC5D0 \uC815\uC0C1 \uD45C\uC2DC',
  selectedPersistsAfterRestart:
    '\uC571 \uC7AC\uC2DC\uC791 \uD6C4 \uC120\uD0DD \uCE90\uB9AD\uD130 \uC720\uC9C0',
  idle:
    'idle \uC790\uC5F0\uC2A4\uB7EC\uC6C0',
  walk:
    'walk \uC774\uB3D9 \uBC0F \uD504\uB808\uC784',
  sit:
    'sit \uC790\uC138 \uBC0F \uC804\uD658',
  sleep:
    'sleep \uC790\uC138 \uBC0F \uC21C\uD658',
  happy:
    'happy \uC7AC\uC0DD \uBC0F \uB9C8\uC9C0\uB9C9 \uD504\uB808\uC784',
  touch:
    'touch \uBC18\uC751',
  leftRightFacing:
    '\uC88C/\uC6B0 \uBC29\uD5A5 \uD45C\uD604',
  transitionStability:
    '\uD589\uB3D9 \uC804\uD658 \uC2DC \uD504\uB808\uC784 \uD280\uAE40/\uC21C\uAC04\uC774\uB3D9 \uC5C6\uC74C',
  staysInVillageBounds:
    '\uB9C8\uC744 \uC774\uB3D9 \uBC94\uC704 \uBC16\uC73C\uB85C \uB098\uAC00\uC9C0 \uC54A\uC74C',
  presentationAlignment:
    '\uD06C\uAE30/\uBC14\uB2E5 \uC704\uCE58/\uC815\uB82C \uC790\uC5F0\uC2A4\uB7EC\uC6C0',
  runtimeDiagnostics:
    'V77 \uB7F0\uD0C0\uC784 \uC9C4\uB2E8 \uAC12 \uAC31\uC2E0',
  runtimeStatistics:
    'V78 \uB204\uC801 \uD1B5\uACC4 \uC99D\uAC00',
  personalityValidation:
    'V79 \uC131\uACA9 \uC790\uB3D9 \uAC80\uC99D \uD654\uBA74 \uC815\uC0C1',
};

function statusLabel(
  status:
    CharacterDeviceValidationStatus
): string {
  if (
    status ===
    'PASS'
  ) {
    return 'PASS';
  }

  if (
    status ===
    'FAIL'
  ) {
    return 'FAIL';
  }

  return '\uBBF8\uAC80\uC99D';
}

// CHARACTER_V81_DEVICE_VALIDATION_SCREEN
export default function CharacterDeviceValidationScreen() {
  const {
    selectedCharacter,
    ready:
      selectedReady,
  } =
    useSelectedCharacter();

  const [
    characterId,
    setCharacterId,
  ] =
    useState<CharacterId>(
      'rooty'
    );

  useEffect(
    () => {
      if (
        selectedReady
      ) {
        setCharacterId(
          selectedCharacter
        );
      }
    },
    [
      selectedCharacter,
      selectedReady,
    ]
  );

  const {
    record,
    ready,
  } =
    useCharacterDeviceValidation(
      characterId
    );

  const summary =
    useMemo(
      () => {
        let pass =
          0;

        let fail =
          0;

        let untested =
          0;

        CHARACTER_DEVICE_VALIDATION_CHECK_IDS.forEach(
          (checkId) => {
            const status =
              record[
                checkId
              ];

            if (
              status ===
              'PASS'
            ) {
              pass +=
                1;
            }
            else if (
              status ===
              'FAIL'
            ) {
              fail +=
                1;
            }
            else {
              untested +=
                1;
            }
          }
        );

        return {
          pass,
          fail,
          untested,
        };
      },
      [
        record,
      ]
    );

  return (
    <>
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uC2E4\uAE30\uAE30 \uAC80\uC99D',
        }}
      />

      <SafeAreaView
        style={
          styles.screen
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Character V81
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {'\uC2E4\uC81C Home\uC5D0\uC11C \uCE90\uB9AD\uD130\uB97C \uBCF4\uBA70 \uAC01 \uD56D\uBAA9\uC744 PASS / FAIL\uB85C \uD655\uC815\uD558\uC138\uC694. \uC774 \uD654\uBA74\uC740 \uAC80\uC99D \uAE30\uB85D\uB9CC \uC800\uC7A5\uD569\uB2C8\uB2E4.'}
          </Text>

          <View
            style={
              styles.quickLinks
            }
          >
            <Link
              href={
                '/' as never
              }
              asChild
            >
              <Pressable
                style={
                  styles.linkButton
                }
              >
                <Text
                  style={
                    styles.linkText
                  }
                >
                  Home
                </Text>
              </Pressable>
            </Link>

            <Link
              href={
                '/character-runtime-diagnostics' as never
              }
              asChild
            >
              <Pressable
                style={
                  styles.linkButton
                }
              >
                <Text
                  style={
                    styles.linkText
                  }
                >
                  V77
                </Text>
              </Pressable>
            </Link>

            <Link
              href={
                '/character-runtime-statistics' as never
              }
              asChild
            >
              <Pressable
                style={
                  styles.linkButton
                }
              >
                <Text
                  style={
                    styles.linkText
                  }
                >
                  V78
                </Text>
              </Pressable>
            </Link>

            <Link
              href={
                '/character-personality-validation' as never
              }
              asChild
            >
              <Pressable
                style={
                  styles.linkButton
                }
              >
                <Text
                  style={
                    styles.linkText
                  }
                >
                  V79
                </Text>
              </Pressable>
            </Link>
          </View>

          <View
            style={
              styles.characterRow
            }
          >
            {CHARACTER_IDS.map(
              (id) => (
                <Pressable
                  key={
                    id
                  }
                  onPress={
                    () =>
                      setCharacterId(
                        id
                      )
                  }
                  style={[
                    styles.characterButton,
                    id ===
                      characterId &&
                      styles.characterButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.characterText,
                      id ===
                        characterId &&
                        styles.characterTextSelected,
                    ]}
                  >
                    {
                      CHARACTER_LABEL[
                        id
                      ]
                    }
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              {
                CHARACTER_LABEL[
                  characterId
                ]
              }
              {' \uAC80\uC99D \uD604\uD669'}
            </Text>

            <Text
              style={
                styles.summaryText
              }
            >
              PASS {
                summary.pass
              }
              {' / FAIL '}
              {
                summary.fail
              }
              {' / \uBBF8\uAC80\uC99D '}
              {
                summary.untested
              }
            </Text>

            <Text
              style={
                styles.small
              }
            >
              {
                ready
                  ? '\uAC80\uC99D \uAE30\uB85D \uB85C\uB4DC \uC644\uB8CC'
                  : '\uAC80\uC99D \uAE30\uB85D \uB85C\uB4DC \uC911...'
              }
            </Text>

            <Pressable
              onPress={
                () => {
                  Alert.alert(
                    '\uAC80\uC99D \uCD08\uAE30\uD654',
                    CHARACTER_LABEL[
                      characterId
                    ] +
                      '\uC758 \uC2E4\uAE30\uAE30 \uAC80\uC99D \uAE30\uB85D\uB9CC \uCD08\uAE30\uD654\uD569\uB2C8\uB2E4.',
                    [
                      {
                        text:
                          '\uCDE8\uC18C',
                        style:
                          'cancel',
                      },
                      {
                        text:
                          '\uCD08\uAE30\uD654',
                        style:
                          'destructive',
                        onPress:
                          () =>
                            resetCharacterDeviceValidation(
                              characterId
                            ),
                      },
                    ]
                  );
                }
              }
              style={
                styles.resetButton
              }
            >
              <Text
                style={
                  styles.resetText
                }
              >
                {'\uC774 \uCE90\uB9AD\uD130 \uAC80\uC99D\uB9CC \uCD08\uAE30\uD654'}
              </Text>
            </Pressable>
          </View>

          {CHARACTER_DEVICE_VALIDATION_CHECK_IDS.map(
            (checkId) => {
              const status =
                record[
                  checkId
                ];

              return (
                <View
                  key={
                    checkId
                  }
                  style={
                    styles.checkCard
                  }
                >
                  <View
                    style={
                      styles.checkHeader
                    }
                  >
                    <Text
                      style={
                        styles.checkLabel
                      }
                    >
                      {
                        CHECK_LABEL[
                          checkId
                        ]
                      }
                    </Text>

                    <Text
                      style={[
                        styles.currentStatus,
                        status ===
                          'PASS'
                          ? styles.passText
                          : status ===
                              'FAIL'
                            ? styles.failText
                            : styles.untestedText,
                      ]}
                    >
                      {
                        statusLabel(
                          status
                        )
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.statusRow
                    }
                  >
                    {(
                      [
                        'PASS',
                        'FAIL',
                        'UNTESTED',
                      ] as const
                    ).map(
                      (nextStatus) => (
                        <Pressable
                          key={
                            nextStatus
                          }
                          onPress={
                            () =>
                              setCharacterDeviceValidationStatus(
                                characterId,
                                checkId,
                                nextStatus
                              )
                          }
                          style={[
                            styles.statusButton,
                            status ===
                              nextStatus &&
                              styles.statusButtonSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusButtonText,
                              status ===
                                nextStatus &&
                                styles.statusButtonTextSelected,
                            ]}
                          >
                            {
                              statusLabel(
                                nextStatus
                              )
                            }
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              );
            }
          )}

          <View
            style={
              styles.note
            }
          >
            <Text
              style={
                styles.noteText
              }
            >
              {'\uC7AC\uC2DC\uC791 \uC720\uC9C0 \uD56D\uBAA9\uC740 \uCE90\uB9AD\uD130\uB97C \uC120\uD0DD\uD55C \uB4A4 \uC571\uC744 \uC644\uC804\uD788 \uC885\uB8CC\uD558\uACE0 \uB2E4\uC2DC \uC2E4\uD589\uD574 \uD655\uC778\uD558\uC138\uC694.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'V77/V78/V79\uB294 \uD574\uB2F9 \uD654\uBA74\uC744 \uC5F4\uC5B4 \uAC12\uC774 \uAC31\uC2E0\uB418\uB294\uC9C0 \uC9C1\uC811 \uD655\uC778\uD558\uC138\uC694.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F6F1E8',
    },
    content: {
      padding: 20,
      paddingBottom: 48,
      gap: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: '#2F2B26',
    },
    description: {
      fontSize: 13,
      lineHeight: 19,
      color: '#6E665D',
    },
    quickLinks: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    linkButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: '#2F2B26',
    },
    linkText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    characterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    characterButton: {
      minWidth: 76,
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#D8CEC0',
      backgroundColor: '#FFFFFF',
    },
    characterButtonSelected: {
      borderColor: '#2F2B26',
      backgroundColor: '#2F2B26',
    },
    characterText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#5F574F',
    },
    characterTextSelected: {
      color: '#FFFFFF',
    },
    summaryCard: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      gap: 7,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#2F2B26',
    },
    summaryText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#4F473F',
    },
    small: {
      fontSize: 11,
      color: '#877D72',
    },
    resetButton: {
      alignSelf: 'flex-start',
      marginTop: 4,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#CDBFB0',
    },
    resetText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#6A6056',
    },
    checkCard: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      gap: 10,
    },
    checkHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    checkLabel: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
      color: '#4F473F',
    },
    currentStatus: {
      fontSize: 11,
      fontWeight: '900',
    },
    passText: {
      color: '#497447',
    },
    failText: {
      color: '#A34B43',
    },
    untestedText: {
      color: '#877D72',
    },
    statusRow: {
      flexDirection: 'row',
      gap: 7,
    },
    statusButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: '#DED5CA',
      backgroundColor: '#FAF8F4',
    },
    statusButtonSelected: {
      borderColor: '#2F2B26',
      backgroundColor: '#2F2B26',
    },
    statusButtonText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6A6056',
    },
    statusButtonTextSelected: {
      color: '#FFFFFF',
    },
    note: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#EEE6D9',
      gap: 7,
    },
    noteText: {
      fontSize: 12,
      lineHeight: 18,
      color: '#645D55',
    },
  });
