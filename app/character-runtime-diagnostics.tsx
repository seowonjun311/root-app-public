import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Stack,
} from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getCharacterPersonalityProfile,
} from '../constants/characterPersonality';
import {
  useCharacterRuntimeDiagnostics,
} from '../store/characterRuntimeDiagnostics';
import {
  useSelectedCharacter,
} from '../store/selectedCharacter';

const ROOTY_STATE_STORAGE_KEY =
  'rooty_state_v1';

type PersistedRootyState = {
  mood?: number;
  energy?: number;
  affection?: number;
  updatedAt?: number;
  lastUpdatedAt?: number;
};

function percent(
  value:
    number | undefined
): string {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(
      value
    )
  ) {
    return '-';
  }

  return (
    (
      value *
      100
    ).toFixed(
      1
    ) +
    '%'
  );
}

function valueText(
  value:
    number | undefined
): string {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(
      value
    )
  ) {
    return '-';
  }

  return value.toFixed(
    1
  );
}

function timestampText(
  value:
    number | null
): string {
  if (
    value === null
  ) {
    return '-';
  }

  return new Date(
    value
  ).toLocaleTimeString();
}

// CHARACTER_V77_RUNTIME_DIAGNOSTICS_SCREEN
export default function CharacterRuntimeDiagnosticsScreen() {
  const {
    selectedCharacter,
    ready,
  } =
    useSelectedCharacter();

  const runtime =
    useCharacterRuntimeDiagnostics();

  const [
    rootyState,
    setRootyState,
  ] =
    useState<PersistedRootyState>(
      {}
    );

  const [
    stateReadAt,
    setStateReadAt,
  ] =
    useState<number | null>(
      null
    );

  const [
    stateError,
    setStateError,
  ] =
    useState<string | null>(
      null
    );

  const personality =
    getCharacterPersonalityProfile(
      selectedCharacter
    );

  const refreshState =
    useCallback(
      async () => {
        try {
          const raw =
            await AsyncStorage.getItem(
              ROOTY_STATE_STORAGE_KEY
            );

          if (
            raw === null
          ) {
            setRootyState(
              {}
            );
          }
          else {
            const parsed =
              JSON.parse(
                raw
              ) as
                PersistedRootyState;

            setRootyState(
              parsed
            );
          }

          setStateReadAt(
            Date.now()
          );

          setStateError(
            null
          );
        }
        catch (error) {
          setStateError(
            error instanceof Error
              ? error.message
              : String(
                  error
                )
          );
        }
      },
      []
    );

  useEffect(
    () => {
      void refreshState();

      const timer =
        setInterval(
          () => {
            void refreshState();
          },
          2000
        );

      return () => {
        clearInterval(
          timer
        );
      };
    },
    [
      refreshState,
    ]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uB7F0\uD0C0\uC784 \uC9C4\uB2E8',
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
            Character V77
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {'\uC77D\uAE30 \uC804\uC6A9 \uAD00\uCC30 \uD654\uBA74\uC785\uB2C8\uB2E4. \uD589\uB3D9 \uD655\uB960\uACFC \uC0C1\uD0DC\uB97C \uBCF4\uC5EC\uC8FC\uAE30\uB9CC \uD558\uACE0 \uAC12\uC744 \uBCC0\uACBD\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'}
          </Text>

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
              {'\uD604\uC7AC \uCE90\uB9AD\uD130'}
            </Text>

            <Text
              style={
                styles.bigValue
              }
            >
              {
                ready
                  ? selectedCharacter
                  : 'loading'
              }
            </Text>

            <Text
              style={
                styles.rowText
              }
            >
              personality: {
                personality.id
              }
            </Text>
          </View>

          <View
            style={
              styles.card
            }
          >
            <View
              style={
                styles.cardHeader
              }
            >
              <Text
                style={
                  styles.cardTitle
                }
              >
                {'Rooty \uC0C1\uD0DC \uC2A4\uB0C5\uC0F7'}
              </Text>

              <Pressable
                onPress={
                  () => {
                    void refreshState();
                  }
                }
                style={
                  styles.button
                }
              >
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  {'\uC0C8\uB85C\uACE0\uCE68'}
                </Text>
              </Pressable>
            </View>

            <Text
              style={
                styles.metric
              }
            >
              mood: {
                valueText(
                  rootyState.mood
                )
              }
            </Text>

            <Text
              style={
                styles.metric
              }
            >
              energy: {
                valueText(
                  rootyState.energy
                )
              }
            </Text>

            <Text
              style={
                styles.metric
              }
            >
              affection: {
                valueText(
                  rootyState.affection
                )
              }
            </Text>

            <Text
              style={
                styles.small
              }
            >
              {'\uC800\uC7A5 \uC2A4\uB0C5\uC0F7 \uC77D\uC740 \uC2DC\uAC04: '}
              {
                timestampText(
                  stateReadAt
                )
              }
            </Text>

            {stateError ? (
              <Text
                style={
                  styles.error
                }
              >
                {
                  stateError
                }
              </Text>
            ) : null}
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
              {'V75 \uC131\uACA9 \uC801\uC6A9 \uD6C4 rest'}
            </Text>

            {runtime.personalityRest ? (
              <>
                <Text
                  style={
                    styles.metric
                  }
                >
                  lookAround: {
                    percent(
                      runtime.personalityRest
                        .lookAround
                    )
                  }
                </Text>

                <Text
                  style={
                    styles.metric
                  }
                >
                  sitRest: {
                    percent(
                      runtime.personalityRest
                        .sitRest
                    )
                  }
                </Text>

                <Text
                  style={
                    styles.metric
                  }
                >
                  nap: {
                    percent(
                      runtime.personalityRest
                        .nap
                    )
                  }
                </Text>
              </>
            ) : (
              <Text
                style={
                  styles.empty
                }
              >
                {'Home\uC5D0\uC11C rest \uC0AC\uC774\uD074\uC774 \uC2E4\uD589\uB418\uBA74 \uD45C\uC2DC\uB429\uB2C8\uB2E4.'}
              </Text>
            )}
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
              {'V66 anti-repeat \uC801\uC6A9 \uD6C4 \uCD5C\uC885 rest'}
            </Text>

            {runtime.finalRest ? (
              <>
                <Text
                  style={
                    styles.metric
                  }
                >
                  lookAround: {
                    percent(
                      runtime.finalRest
                        .lookAround
                    )
                  }
                </Text>

                <Text
                  style={
                    styles.metric
                  }
                >
                  sitRest: {
                    percent(
                      runtime.finalRest
                        .sitRest
                    )
                  }
                </Text>

                <Text
                  style={
                    styles.metric
                  }
                >
                  nap: {
                    percent(
                      runtime.finalRest
                        .nap
                    )
                  }
                </Text>

                <Text
                  style={
                    styles.selectedBehavior
                  }
                >
                  {'\uC2E4\uC81C \uC120\uD0DD: '}
                  {
                    runtime.selectedRestBehavior ??
                    '-'
                  }
                </Text>
              </>
            ) : (
              <Text
                style={
                  styles.empty
                }
              >
                {'\uC544\uC9C1 V66 rest \uC120\uD0DD \uC0D8\uD50C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
              </Text>
            )}
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
              {'Social chance'}
            </Text>

            <Text
              style={
                styles.metric
              }
            >
              spontaneousHappy: {
                percent(
                  runtime.socialChance
                    .spontaneousHappy
                )
              }
            </Text>

            <Text
              style={
                styles.metric
              }
            >
              passiveAttention: {
                percent(
                  runtime.socialChance
                    .passiveAttention
                )
              }
            </Text>

            <Text
              style={
                styles.metric
              }
            >
              bondedFollowUpTouch: {
                percent(
                  runtime.socialChance
                    .bondedFollowUpTouch
                )
              }
            </Text>
          </View>

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
              {'\uC9C4\uB2E8 \uAC12\uC740 Home \uB7F0\uD0C0\uC784\uC5D0\uC11C \uC2E4\uC81C \uD655\uB960 \uD30C\uC774\uD504\uB77C\uC778\uC774 \uD638\uCD9C\uB420 \uB54C\uB9C8\uB2E4 \uAC31\uC2E0\uB429\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'Rooty \uC0C1\uD0DC\uB294 rooty_state_v1\uC744 2\uCD08\uB9C8\uB2E4 \uC77D\uAE30 \uC804\uC6A9\uC73C\uB85C \uC870\uD68C\uD569\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uCD5C\uC2E0 \uB7F0\uD0C0\uC784 \uC0D8\uD50C: '}
              {
                timestampText(
                  runtime.updatedAt
                )
              }
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
      gap: 14,
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
    card: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      gap: 8,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#2F2B26',
    },
    bigValue: {
      fontSize: 22,
      fontWeight: '800',
      color: '#4F473F',
    },
    rowText: {
      fontSize: 13,
      color: '#6E665D',
    },
    metric: {
      fontSize: 14,
      fontWeight: '700',
      color: '#4F473F',
    },
    small: {
      marginTop: 4,
      fontSize: 11,
      color: '#877D72',
    },
    selectedBehavior: {
      marginTop: 6,
      fontSize: 15,
      fontWeight: '800',
      color: '#2F2B26',
    },
    empty: {
      fontSize: 13,
      lineHeight: 19,
      color: '#877D72',
    },
    error: {
      fontSize: 12,
      color: '#9B3D34',
    },
    button: {
      paddingVertical: 7,
      paddingHorizontal: 11,
      borderRadius: 10,
      backgroundColor: '#2F2B26',
    },
    buttonText: {
      fontSize: 12,
      fontWeight: '800',
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
