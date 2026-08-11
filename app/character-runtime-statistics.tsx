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
  getCharacterPersonalityProfile,
} from '../constants/characterPersonality';
import type {
  CharacterRestWeights,
  CharacterSocialChanceChannel,
} from '../store/characterPersonalityPolicy';
import {
  CHARACTER_RUNTIME_STATISTICS_LIMIT,
  useCharacterRuntimeStatistics,
} from '../store/characterRuntimeStatistics';
import {
  useSelectedCharacter,
} from '../store/selectedCharacter';

const CHARACTER_LABEL:
  Record<CharacterId, string> = {
  rooty: '\uB8E8\uD2F0',
  moru: '\uBAA8\uB8E8',
  mongsil: '\uBABD\uC2E4',
  dami: '\uB2E4\uBBF8',  // CHARACTER_V90B_PIO_RUNTIME_STATISTICS_SCREEN
  pio: '\uD53C\uC624',

};

const SOCIAL_CHANNELS:
  readonly CharacterSocialChanceChannel[] = [
  'spontaneousHappy',
  'passiveAttention',
  'bondedFollowUpTouch',
];

function percent(
  value: number
): string {
  if (
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

function average(
  values: number[]
): number | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    values.length
  );
}

function averageRest(
  values:
    CharacterRestWeights[]
): CharacterRestWeights | null {
  if (
    values.length === 0
  ) {
    return null;
  }

  const total =
    values.reduce(
      (
        current,
        value
      ) => ({
        lookAround:
          current.lookAround +
          value.lookAround,
        sitRest:
          current.sitRest +
          value.sitRest,
        nap:
          current.nap +
          value.nap,
      }),
      {
        lookAround: 0,
        sitRest: 0,
        nap: 0,
      }
    );

  return {
    lookAround:
      total.lookAround /
      values.length,
    sitRest:
      total.sitRest /
      values.length,
    nap:
      total.nap /
      values.length,
  };
}

function timeText(
  value:
    number | undefined
): string {
  if (
    typeof value !== 'number'
  ) {
    return '-';
  }

  return new Date(
    value
  ).toLocaleString();
}

// CHARACTER_V78_RUNTIME_STATISTICS_SCREEN
export default function CharacterRuntimeStatisticsScreen() {
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
    statistics,
    ready,
  } =
    useCharacterRuntimeStatistics(
      characterId
    );

  const personality =
    getCharacterPersonalityProfile(
      characterId
    );

  const restCount =
    statistics.restSamples.length;

  const behaviorCounts =
    useMemo(
      () => {
        const counts:
          Record<
            string,
            number
          > = {};

        statistics.restSamples.forEach(
          (sample) => {
            counts[
              sample.behavior
            ] =
              (
                counts[
                  sample.behavior
                ] ??
                0
              ) +
              1;
          }
        );

        return counts;
      },
      [
        statistics.restSamples,
      ]
    );

  const personalityAverage =
    useMemo(
      () =>
        averageRest(
          statistics.restSamples
            .map(
              (sample) =>
                sample.personalityRest
            )
            .filter(
              (
                value
              ): value is CharacterRestWeights =>
                value !== null
            )
        ),
      [
        statistics.restSamples,
      ]
    );

  const finalAverage =
    useMemo(
      () =>
        averageRest(
          statistics.restSamples.map(
            (sample) =>
              sample.finalRest
          )
        ),
      [
        statistics.restSamples,
      ]
    );

  const latestRest =
    statistics.restSamples[
      restCount - 1
    ];

  return (
    <>
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uB204\uC801 \uD1B5\uACC4',
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
            Character V78
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {'\uCE90\uB9AD\uD130\uBCC4 \uCD5C\uADFC rest \uC120\uD0DD\uACFC social chance \uD3C9\uAC00\uB97C \uCD5C\uB300 100\uAC1C\uC529 \uB204\uC801\uD569\uB2C8\uB2E4.'}
          </Text>

          {/* CHARACTER_V79_VALIDATION_ENTRY */}
          <Link
            href={
              '/character-personality-validation' as never
            }
            asChild
          >
            <Pressable
              style={
                styles.validationButton
              }
            >
              <Text
                style={
                  styles.validationButtonText
                }
              >
                {'\uC131\uACA9 \uC790\uB3D9 \uAC80\uC99D'}
              </Text>
            </Pressable>
          </Link>

          <View
            style={
              styles.row
            }
          >
            {CHARACTER_IDS.map(
              (id) => (
                <Pressable
                  key={id}
                  onPress={
                    () =>
                      setCharacterId(
                        id
                      )
                  }
                  style={[
                    styles.choice,
                    id ===
                      characterId &&
                      styles.selected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      id ===
                        characterId &&
                        styles.selectedText,
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
              styles.card
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              {'\uC120\uD0DD \uCE90\uB9AD\uD130'}
            </Text>

            <Text
              style={
                styles.bigValue
              }
            >
              {
                CHARACTER_LABEL[
                  characterId
                ]
              }
            </Text>

            <Text
              style={
                styles.metric
              }
            >
              personality: {
                personality.id
              }
            </Text>

            <Text
              style={
                styles.small
              }
            >
              {
                ready
                  ? '\uB204\uC801 \uB85C\uB4DC \uC644\uB8CC'
                  : '\uB204\uC801 \uB85C\uB4DC \uC911...'
              }
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
              {'\uC2E4\uC81C rest \uC120\uD0DD \uBD84\uD3EC'}
            </Text>

            <Text
              style={
                styles.metric
              }
            >
              {'\uD45C\uBCF8: '}
              {
                restCount
              }
              {' / '}
              {
                CHARACTER_RUNTIME_STATISTICS_LIMIT
              }
            </Text>

            {restCount > 0 ? (
              <>
                {Object.entries(
                  behaviorCounts
                )
                  .sort(
                    (
                      first,
                      second
                    ) =>
                      second[1] -
                      first[1]
                  )
                  .map(
                    (
                      [
                        behavior,
                        count,
                      ]
                    ) => (
                      <Text
                        key={
                          behavior
                        }
                        style={
                          styles.metric
                        }
                      >
                        {
                          behavior
                        }
                        {': '}
                        {
                          count
                        }
                        {' / '}
                        {
                          percent(
                            count /
                            restCount
                          )
                        }
                      </Text>
                    )
                  )}

                <Text
                  style={
                    styles.small
                  }
                >
                  {'\uCD5C\uADFC rest: '}
                  {
                    latestRest
                      ?.behavior ??
                    '-'
                  }
                  {' / '}
                  {
                    timeText(
                      latestRest
                        ?.timestamp
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
                {'Home\uC5D0\uC11C rest \uC120\uD0DD\uC774 \uBC1C\uC0DD\uD558\uBA74 \uB204\uC801\uB429\uB2C8\uB2E4.'}
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
              {'rest \uD655\uB960 \uD3C9\uADE0'}
            </Text>

            {personalityAverage ? (
              <>
                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  {'V75 personality \uC801\uC6A9 \uD6C4'}
                </Text>

                <Text
                  style={
                    styles.metric
                  }
                >
                  lookAround: {
                    percent(
                      personalityAverage
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
                      personalityAverage
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
                      personalityAverage
                        .nap
                    )
                  }
                </Text>
              </>
            ) : null}

            {finalAverage ? (
              <>
                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  {'V66 anti-repeat \uC801\uC6A9 \uD6C4'}
                </Text>

                <Text
                  style={
                    styles.metric
                  }
                >
                  lookAround: {
                    percent(
                      finalAverage
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
                      finalAverage
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
                      finalAverage
                        .nap
                    )
                  }
                </Text>
              </>
            ) : null}

            {!personalityAverage &&
            !finalAverage ? (
              <Text
                style={
                  styles.empty
                }
              >
                {'\uC544\uC9C1 rest \uD655\uB960 \uD45C\uBCF8\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
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
              {'Social chance \uD3C9\uAC00 \uD1B5\uACC4'}
            </Text>

            <Text
              style={
                styles.warning
              }
            >
              {'\uC774 \uD69F\uC218\uB294 social \uD589\uB3D9\uC758 \uC2E4\uC81C \uBC1C\uB3D9 \uD69F\uC218\uAC00 \uC544\uB2C8\uB77C V61/V63/V64 chance gate\uAC00 \uD3C9\uAC00\uB41C \uD69F\uC218\uC785\uB2C8\uB2E4.'}
            </Text>

            {SOCIAL_CHANNELS.map(
              (channel) => {
                const samples =
                  statistics.socialSamples.filter(
                    (sample) =>
                      sample.channel ===
                      channel
                  );

                const mean =
                  average(
                    samples.map(
                      (sample) =>
                        sample.chance
                    )
                  );

                const latest =
                  samples[
                    samples.length -
                    1
                  ];

                return (
                  <View
                    key={
                      channel
                    }
                    style={
                      styles.socialBlock
                    }
                  >
                    <Text
                      style={
                        styles.sectionLabel
                      }
                    >
                      {
                        channel
                      }
                    </Text>

                    <Text
                      style={
                        styles.metric
                      }
                    >
                      {'\uD3C9\uAC00: '}
                      {
                        samples.length
                      }
                    </Text>

                    <Text
                      style={
                        styles.metric
                      }
                    >
                      {'\uD3C9\uADE0 chance: '}
                      {
                        mean === null
                          ? '-'
                          : percent(
                              mean
                            )
                      }
                    </Text>

                    <Text
                      style={
                        styles.small
                      }
                    >
                      {'\uCD5C\uADFC chance: '}
                      {
                        latest
                          ? percent(
                              latest.chance
                            )
                          : '-'
                      }
                    </Text>
                  </View>
                );
              }
            )}
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
              {'\uD1B5\uACC4\uB294 character_runtime_statistics_v1\uC5D0 \uC800\uC7A5\uB418\uC5B4 \uC571\uC744 \uC7AC\uC2DC\uC791\uD574\uB3C4 \uC720\uC9C0\uB429\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uD589\uB3D9 \uC120\uD0DD \uB85C\uC9C1\uC740 \uBCC0\uACBD\uD558\uC9C0 \uC54A\uACE0 V77 \uAD00\uCC30 \uACB0\uACFC\uB9CC \uBE44\uB3D9\uAE30\uB85C \uB204\uC801\uD569\uB2C8\uB2E4.'}
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
    validationButton: {
      alignSelf: 'flex-start',
      paddingVertical: 9,
      paddingHorizontal: 13,
      borderRadius: 11,
      backgroundColor: '#2F2B26',
    },
    validationButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    choice: {
      minWidth: 78,
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 11,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: '#D8CEC0',
      backgroundColor: '#FFFFFF',
    },
    selected: {
      borderColor: '#2F2B26',
      backgroundColor: '#2F2B26',
    },
    choiceText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#5F574F',
    },
    selectedText: {
      color: '#FFFFFF',
    },
    card: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      gap: 8,
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
    sectionLabel: {
      marginTop: 5,
      fontSize: 13,
      fontWeight: '800',
      color: '#6A6056',
    },
    metric: {
      fontSize: 14,
      fontWeight: '700',
      color: '#4F473F',
    },
    small: {
      fontSize: 11,
      lineHeight: 17,
      color: '#877D72',
    },
    empty: {
      fontSize: 13,
      lineHeight: 19,
      color: '#877D72',
    },
    warning: {
      fontSize: 12,
      lineHeight: 18,
      color: '#8A5C2D',
    },
    socialBlock: {
      paddingTop: 5,
      gap: 4,
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
