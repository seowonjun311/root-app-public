import {
  Link,
  Stack,
} from 'expo-router';
import React from 'react';
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
  useCharacterProgression,
} from '../store/characterProgression';
import {
  useSelectedCharacter,
} from '../store/selectedCharacter';

const CHARACTER_LABEL:
  Record<
    CharacterId,
    string
  > = {
  rooty:
    '\uB8E8\uD2F0',
  moru:
    '\uBAA8\uB8E8',
  mongsil:
    '\uBABD\uC2E4',
  dami:
    '\uB2E4\uBBF8',
  pio:
    '\uD53C\uC624',
  nuri:
    '\uB204\uB9AC',
  tori:
    '\uD1A0\uB9AC',
};

function timeText(
  value: number | null
): string {
  if (
    value === null
  ) {
    return '-';
  }

  return new Date(
    value
  ).toLocaleString();
}

// CHARACTER_V97B_PROGRESSION_DIAGNOSTICS_SCREEN
export default function CharacterProgressionDiagnosticsScreen() {
  const progression =
    useCharacterProgression();

  const {
    selectedCharacter,
    ready:
      selectedReady,
  } =
    useSelectedCharacter();

  return (
    <SafeAreaView
      style={
        styles.safe
      }
    >
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uD68D\uB4DD\u00B7\uC131\uC7A5',
        }}
      />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={
            styles.hero
          }
        >
          <Text
            style={
              styles.title
            }
          >
            {'\uCE90\uB9AD\uD130 \uD68D\uB4DD\u00B7\uC131\uC7A5 \uC9C4\uB2E8'}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {'V97\uC758 \uD68D\uB4DD \uC5EC\uBD80, \uD68D\uB4DD \uACBD\uB85C, \uC131\uC7A5 XP, \uB808\uBCA8, \uBBF8\uC218\uB839 \uBCF4\uC0C1\uC744 \uD655\uC778\uD569\uB2C8\uB2E4.'}
          </Text>
        </View>

        <View
          style={
            styles.info
          }
        >
          <Text
            style={
              styles.infoText
            }
          >
            {
              progression.ready
                ? '\uD68D\uB4DD \uC800\uC7A5\uC18C \uB85C\uB4DC \uC644\uB8CC'
                : '\uD68D\uB4DD \uC800\uC7A5\uC18C \uB85C\uB4DC \uC911...'
            }
          </Text>

          <Text
            style={
              styles.infoText
            }
          >
            {
              selectedReady
                ? (
                    '\uD604\uC7AC Home: ' +
                    CHARACTER_LABEL[
                      selectedCharacter
                    ]
                  )
                : '\uD604\uC7AC Home: -'
            }
          </Text>
        </View>

        <View
          style={
            styles.links
          }
        >
          <Link
            href={
              '/character-preview' as never
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
                {'\uCE90\uB9AD\uD130 \uC120\uD0DD'}
              </Text>
            </Pressable>
          </Link>

          <Link
            href={
              '/character-relationship-diagnostics' as never
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
                {'\uCE5C\uBC00\uB3C4 \uC9C4\uB2E8'}
              </Text>
            </Pressable>
          </Link>
        </View>

        {
          CHARACTER_IDS.map(
            (
              characterId
            ) => {
              const snapshot =
                progression.snapshots[
                  characterId
                ];

              const selected =
                selectedReady &&
                selectedCharacter ===
                  characterId;

              return (
                <View
                  key={
                    characterId
                  }
                  style={[
                    styles.card,
                    selected
                      ? styles.selectedCard
                      : null,
                  ]}
                >
                  <View
                    style={
                      styles.row
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.name
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
                          styles.id
                        }
                      >
                        {
                          characterId
                        }
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        snapshot.acquired
                          ? styles.acquiredBadge
                          : styles.lockedBadge,
                      ]}
                    >
                      <Text
                        style={
                          styles.badgeText
                        }
                      >
                        {
                          snapshot.acquired
                            ? '\uD68D\uB4DD'
                            : '\uC7A0\uAE40'
                        }
                      </Text>
                    </View>
                  </View>

                  {
                    selected
                      ? (
                          <Text
                            style={
                              styles.selected
                            }
                          >
                            {'\uD604\uC7AC Home \uC0AC\uC6A9 \uC911'}
                          </Text>
                        )
                      : null
                  }

                  <Text
                    style={
                      styles.level
                    }
                  >
                    {
                      'Lv.' +
                      snapshot.growthLevel +
                      '  \u00B7  ' +
                      snapshot.growthXp +
                      ' XP'
                    }
                  </Text>

                  <Text
                    style={
                      styles.detail
                    }
                  >
                    {
                      '\uD68D\uB4DD \uACBD\uB85C: ' +
                      (
                        snapshot.acquisitionSource ??
                        '-'
                      )
                    }
                  </Text>

                  <Text
                    style={
                      styles.detail
                    }
                  >
                    {
                      '\uD68D\uB4DD \uC2DC\uAC04: ' +
                      timeText(
                        snapshot.acquiredAt
                      )
                    }
                  </Text>

                  <Text
                    style={
                      styles.detail
                    }
                  >
                    {
                      'legacySeeded: ' +
                      (
                        snapshot.legacySeeded
                          ? 'YES'
                          : 'NO'
                      )
                    }
                  </Text>

                  <Text
                    style={
                      styles.detail
                    }
                  >
                    {
                      '\uBCF4\uC0C1 \uC218\uB839: ' +
                      (
                        snapshot
                          .claimedRewardLevels
                          .length === 0
                          ? '-'
                          : snapshot
                              .claimedRewardLevels
                              .join(
                                ', '
                              )
                      )
                    }
                  </Text>

                  <Text
                    style={
                      styles.detail
                    }
                  >
                    {
                      '\uBBF8\uC218\uB839 \uBCF4\uC0C1: ' +
                      (
                        snapshot
                          .unclaimedRewards
                          .length === 0
                          ? '-'
                          : snapshot
                              .unclaimedRewards
                              .map(
                                (reward) =>
                                  'Lv.' +
                                  reward.level +
                                  ' +' +
                                  reward.pointReward +
                                  'P'
                              )
                              .join(
                                ', '
                              )
                      )
                    }
                  </Text>
                </View>
              );
            }
          )
        }

        <View
          style={
            styles.note
          }
        >
          <Text
            style={
              styles.noteTitle
            }
          >
            {'V97B \uAC80\uC99D'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'1. \uC124\uCE58 \uC804\uC5D0 \uC0AC\uC6A9 \uC911\uC774\uB358 \uCE90\uB9AD\uD130\uB294 legacy \uD68D\uB4DD \uCC98\uB9AC\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4.'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'2. Rooty\uB294 starter \uD68D\uB4DD \uC0C1\uD0DC\uB97C \uC720\uC9C0\uD574\uC57C \uD569\uB2C8\uB2E4.'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'3. \uC7A0\uAE34 \uCE90\uB9AD\uD130\uB294 Preview\uB294 \uAC00\uB2A5\uD558\uC9C0\uB9CC Home \uC120\uD0DD\uC740 \uBD88\uAC00\uD574\uC57C \uD569\uB2C8\uB2E4.'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'4. \uC7AC\uC2E4\uD589 \uD6C4\uC5D0\uB3C4 \uD68D\uB4DD/\uC7A0\uAE40 \uC0C1\uD0DC\uAC00 \uC720\uC9C0\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        '#F6F2EC',
    },
    content: {
      padding: 18,
      paddingBottom: 42,
      gap: 12,
    },
    hero: {
      padding: 18,
      borderRadius: 18,
      backgroundColor:
        '#2F2B26',
      gap: 7,
    },
    title: {
      fontSize: 21,
      fontWeight: '900',
      color:
        '#FFFFFF',
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 18,
      color:
        '#E8E0D6',
    },
    info: {
      padding: 14,
      borderRadius: 14,
      backgroundColor:
        '#EEE6D9',
      gap: 4,
    },
    infoText: {
      fontSize: 12,
      fontWeight: '700',
      color:
        '#625A51',
    },
    links: {
      flexDirection: 'row',
      gap: 10,
    },
    linkButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#D8CFC4',
    },
    linkText: {
      fontSize: 12,
      fontWeight: '800',
      color:
        '#4C463F',
    },
    card: {
      padding: 16,
      borderRadius: 16,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E0D7CD',
      gap: 5,
    },
    selectedCard: {
      borderWidth: 2,
      borderColor:
        '#2F2B26',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },
    name: {
      fontSize: 18,
      fontWeight: '900',
      color:
        '#302C28',
    },
    id: {
      marginTop: 2,
      fontSize: 10,
      color:
        '#8B8176',
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    acquiredBadge: {
      backgroundColor:
        '#DDEBD9',
    },
    lockedBadge: {
      backgroundColor:
        '#E8E3DD',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '900',
      color:
        '#4B453F',
    },
    selected: {
      fontSize: 11,
      fontWeight: '900',
      color:
        '#665D54',
    },
    level: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: '900',
      color:
        '#342F2A',
    },
    detail: {
      fontSize: 11,
      lineHeight: 17,
      color:
        '#6C635A',
    },
    note: {
      padding: 15,
      borderRadius: 15,
      backgroundColor:
        '#FFF9EC',
      borderWidth: 1,
      borderColor:
        '#E8DCBD',
      gap: 5,
    },
    noteTitle: {
      fontSize: 14,
      fontWeight: '900',
      color:
        '#4F4840',
    },
    noteText: {
      fontSize: 12,
      lineHeight: 18,
      color:
        '#6C635A',
    },
  });
