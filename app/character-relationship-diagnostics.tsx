import {
  Link,
  Stack,
} from 'expo-router';
import React, {
  useCallback,
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
  getCharacterRelationshipSnapshot,
  loadCharacterRelationships,
  subscribeCharacterRelationships,
  type CharacterRelationshipSnapshot,
} from '../store/characterRelationship';
import {
  CHARACTER_RELATIONSHIP_SOCIAL_MULTIPLIERS,
  CHARACTER_RELATIONSHIP_THRESHOLDS,
  type CharacterRelationshipTier,
} from '../store/characterRelationshipPolicy';
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

const TIER_LABEL:
  Record<
    CharacterRelationshipTier,
    string
  > = {
  distant:
    '\uB0AF\uC124\uC74C',
  familiar:
    '\uC775\uC219\uD568',
  close:
    '\uAC00\uAE4C\uC6C0',
  bonded:
    '\uB3C8\uB3C5\uD568',
};

function percent(
  value: number
): string {
  return (
    (
      value *
      100
    ).toFixed(
      0
    ) +
    '%'
  );
}

function lastInteractionText(
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

function nextTierText(
  snapshot:
    CharacterRelationshipSnapshot
): string {
  switch (
    snapshot.tier
  ) {
    case 'distant':
      return (
        '\uC775\uC219\uD568\uAE4C\uC9C0 ' +
        Math.max(
          0,
          CHARACTER_RELATIONSHIP_THRESHOLDS
            .familiar -
            snapshot.points
        ) +
        'p'
      );

    case 'familiar':
      return (
        '\uAC00\uAE4C\uC6C0\uAE4C\uC9C0 ' +
        Math.max(
          0,
          CHARACTER_RELATIONSHIP_THRESHOLDS
            .close -
            snapshot.points
        ) +
        'p'
      );

    case 'close':
      return (
        '\uB3C8\uB3C5\uD568\uAE4C\uC9C0 ' +
        Math.max(
          0,
          CHARACTER_RELATIONSHIP_THRESHOLDS
            .bonded -
            snapshot.points
        ) +
        'p'
      );

    case 'bonded':
      return '\uCD5C\uB300 \uCE5C\uBC00\uB3C4';
  }
}

function RelationshipCard({
  characterId,
  snapshot,
  selected,
}: {
  characterId:
    CharacterId;
  snapshot:
    CharacterRelationshipSnapshot;
  selected:
    boolean;
}) {
  const multipliers =
    CHARACTER_RELATIONSHIP_SOCIAL_MULTIPLIERS[
      snapshot.tier
    ];

  return (
    <View
      style={[
        styles.card,
        selected
          ? styles.cardSelected
          : null,
      ]}
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View>
          <Text
            style={
              styles.characterName
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
              styles.characterId
            }
          >
            {characterId}
          </Text>
        </View>

        <View
          style={[
            styles.tierBadge,
            selected
              ? styles.tierBadgeSelected
              : null,
          ]}
        >
          <Text
            style={[
              styles.tierText,
              selected
                ? styles.tierTextSelected
                : null,
            ]}
          >
            {
              TIER_LABEL[
                snapshot.tier
              ]
            }
          </Text>
        </View>
      </View>

      {
        selected
          ? (
              <Text
                style={
                  styles.selectedText
                }
              >
                {'\uD604\uC7AC Home \uC120\uD0DD \uCE90\uB9AD\uD130'}
              </Text>
            )
          : null
      }

      <View
        style={
          styles.pointRow
        }
      >
        <Text
          style={
            styles.pointValue
          }
        >
          {
            snapshot.points
          }
          /100
        </Text>

        <Text
          style={
            styles.nextTier
          }
        >
          {
            nextTierText(
              snapshot
            )
          }
        </Text>
      </View>

      <View
        style={
          styles.metricGrid
        }
      >
        <View
          style={
            styles.metric
          }
        >
          <Text
            style={
              styles.metricLabel
            }
          >
            {'\uC9E7\uC740 \uD130\uCE58'}
          </Text>
          <Text
            style={
              styles.metricValue
            }
          >
            {
              snapshot.tapCount
            }
          </Text>
        </View>

        <View
          style={
            styles.metric
          }
        >
          <Text
            style={
              styles.metricLabel
            }
          >
            {'\uAE38\uAC8C \uB204\uB974\uAE30'}
          </Text>
          <Text
            style={
              styles.metricValue
            }
          >
            {
              snapshot.longPressCount
            }
          </Text>
        </View>

        <View
          style={
            styles.metric
          }
        >
          <Text
            style={
              styles.metricLabel
            }
          >
            {'Legacy seed'}
          </Text>
          <Text
            style={
              styles.metricValue
            }
          >
            {
              snapshot.legacySeeded
                ? 'YES'
                : 'NO'
            }
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.sectionLabel
        }
      >
        {'\uAD00\uACC4 \uBC30\uC728'}
      </Text>

      <Text
        style={
          styles.detailText
        }
      >
        {
          'happy x' +
          multipliers
            .spontaneousHappy
            .toFixed(
              2
            )
        }
      </Text>

      <Text
        style={
          styles.detailText
        }
      >
        {
          'passive x' +
          multipliers
            .passiveAttention
            .toFixed(
              2
            )
        }
      </Text>

      <Text
        style={
          styles.detailText
        }
      >
        {
          'follow-up x' +
          multipliers
            .bondedFollowUpTouch
            .toFixed(
              2
            )
        }
      </Text>

      <Text
        style={
          styles.lastInteraction
        }
      >
        {
          '\uB9C8\uC9C0\uB9C9 \uC0C1\uD638\uC791\uC6A9: ' +
          lastInteractionText(
            snapshot.lastInteractionAt
          )
        }
      </Text>
    </View>
  );
}

// CHARACTER_V96C_RELATIONSHIP_DIAGNOSTICS_SCREEN
export default function CharacterRelationshipDiagnosticsScreen() {
  const {
    selectedCharacter,
    ready:
      selectedReady,
  } =
    useSelectedCharacter();

  const [
    relationshipReady,
    setRelationshipReady,
  ] =
    useState(
      false
    );

  const [
    revision,
    setRevision,
  ] =
    useState(
      0
    );

  const reload =
    useCallback(
      async () => {
        await loadCharacterRelationships();

        setRelationshipReady(
          true
        );

        setRevision(
          (current) =>
            current + 1
        );
      },
      []
    );

  useEffect(
    () => {
      let cancelled =
        false;

      const unsubscribe =
        subscribeCharacterRelationships(
          () => {
            if (
              cancelled
            ) {
              return;
            }

            setRelationshipReady(
              true
            );

            setRevision(
              (current) =>
                current + 1
            );
          }
        );

      void loadCharacterRelationships()
        .then(
          () => {
            if (
              cancelled
            ) {
              return;
            }

            setRelationshipReady(
              true
            );

            setRevision(
              (current) =>
                current + 1
            );
          }
        );

      return () => {
        cancelled =
          true;

        unsubscribe();
      };
    },
    []
  );

  const snapshots =
    useMemo(
      () => {
        void revision;

        return CHARACTER_IDS.map(
          (
            characterId
          ) => ({
            characterId,
            snapshot:
              getCharacterRelationshipSnapshot(
                characterId
              ),
          })
        );
      },
      [
        revision,
      ]
    );

  const selectedSnapshot =
    relationshipReady &&
    selectedReady
      ? getCharacterRelationshipSnapshot(
          selectedCharacter
        )
      : null;

  return (
    <SafeAreaView
      style={
        styles.safe
      }
    >
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uCE5C\uBC00\uB3C4 \uC9C4\uB2E8',
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
            {'\uCE90\uB9AD\uD130 \uCE5C\uBC00\uB3C4 \uC9C4\uB2E8'}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {'V96B\uC758 \uCE90\uB9AD\uD130\uBCC4 points / tier / \uD130\uCE58 \uD69F\uC218 / \uAD00\uACC4 \uBC30\uC728\uC744 \uC2E4\uC2DC\uAC04\uC73C\uB85C \uD655\uC778\uD569\uB2C8\uB2E4.'}
          </Text>
        </View>

        <View
          style={
            styles.summary
          }
        >
          <Text
            style={
              styles.summaryLabel
            }
          >
            {'\uD604\uC7AC \uC120\uD0DD'}
          </Text>

          <Text
            style={
              styles.summaryCharacter
            }
          >
            {
              selectedReady
                ? CHARACTER_LABEL[
                    selectedCharacter
                  ]
                : '\uB85C\uB4DC \uC911...'
            }
          </Text>

          <Text
            style={
              styles.summaryValue
            }
          >
            {
              selectedSnapshot
                ? (
                    selectedSnapshot.points +
                    ' / 100  \u00B7  ' +
                    TIER_LABEL[
                      selectedSnapshot.tier
                    ]
                  )
                : '-'
            }
          </Text>
        </View>

        <Pressable
          onPress={
            () => {
              void reload();
            }
          }
          style={
            styles.refreshButton
          }
        >
          <Text
            style={
              styles.refreshButtonText
            }
          >
            {'\uC0C8\uB85C\uACE0\uCE68'}
          </Text>
        </Pressable>

        <View
          style={
            styles.links
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
                {'Home\uC73C\uB85C \uAC00\uAE30'}
              </Text>
            </Pressable>
          </Link>

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
        </View>

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
            {'\uC2E4\uAE30\uAE30 \uAC80\uC99D \uC21C\uC11C'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'1. \uBAA8\uB8E8\uB97C \uC120\uD0DD\uD558\uACE0 Home\uC5D0\uC11C \uC9E7\uAC8C 3\uBC88 \uD130\uCE58'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'2. \uD1A0\uB9AC\uB85C \uBC14\uAFE0\uACE0 \uAE38\uAC8C 2\uBC88 \uB204\uB974\uAE30'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'3. \uC774 \uD654\uBA74\uC5D0\uC11C \uBAA8\uB8E8 +3 / \uD1A0\uB9AC +4\uAC00 \uB3C5\uB9BD\uC801\uC73C\uB85C \uBC18\uC601\uB410\uB294\uC9C0 \uD655\uC778'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'4. \uC571 \uC7AC\uC2E4\uD589 \uD6C4\uC5D0\uB3C4 \uAC12\uC774 \uC720\uC9C0\uB418\uB294\uC9C0 \uD655\uC778'}
          </Text>

          <Text
            style={
              styles.noteText
            }
          >
            {'5. distant\uC5D0\uC11C passive/follow-up\uC774 0\uC778\uC9C0, close/bonded\uB85C \uAC08\uC218\uB85D \uBC30\uC728\uC774 \uB298\uC5B4\uB098\uB294\uC9C0 \uD655\uC778'}
          </Text>
        </View>

        <Text
          style={
            styles.listTitle
          }
        >
          {'7\uCE90\uB9AD\uD130 \uB3C5\uB9BD \uCE5C\uBC00\uB3C4'}
        </Text>

        {
          snapshots.map(
            ({
              characterId,
              snapshot,
            }) => (
              <RelationshipCard
                key={
                  characterId
                }
                characterId={
                  characterId
                }
                snapshot={
                  snapshot
                }
                selected={
                  selectedReady &&
                  selectedCharacter ===
                    characterId
                }
              />
            )
          )
        }
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
      paddingBottom: 44,
      gap: 14,
    },
    hero: {
      padding: 18,
      borderRadius: 18,
      backgroundColor:
        '#2F2B26',
      gap: 7,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      color:
        '#FFFFFF',
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 19,
      color:
        '#E8E0D6',
    },
    summary: {
      padding: 16,
      borderRadius: 16,
      backgroundColor:
        '#EEE6D9',
      gap: 4,
    },
    summaryLabel: {
      fontSize: 11,
      fontWeight: '800',
      color:
        '#756A5F',
    },
    summaryCharacter: {
      fontSize: 22,
      fontWeight: '900',
      color:
        '#2F2B26',
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: '700',
      color:
        '#645D55',
    },
    refreshButton: {
      alignItems: 'center',
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor:
        '#2F2B26',
    },
    refreshButtonText: {
      fontSize: 13,
      fontWeight: '900',
      color:
        '#FFFFFF',
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
      borderWidth: 1,
      borderColor:
        '#D8CFC4',
      backgroundColor:
        '#FFFFFF',
    },
    linkText: {
      fontSize: 12,
      fontWeight: '800',
      color:
        '#504941',
    },
    note: {
      padding: 16,
      borderRadius: 16,
      backgroundColor:
        '#FFF9EC',
      borderWidth: 1,
      borderColor:
        '#E9DDBE',
      gap: 5,
    },
    noteTitle: {
      fontSize: 14,
      fontWeight: '900',
      color:
        '#514A42',
      marginBottom: 3,
    },
    noteText: {
      fontSize: 12,
      lineHeight: 18,
      color:
        '#6A6259',
    },
    listTitle: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '900',
      color:
        '#332F2A',
    },
    card: {
      padding: 16,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        '#E1D8CE',
      backgroundColor:
        '#FFFFFF',
      gap: 8,
    },
    cardSelected: {
      borderWidth: 2,
      borderColor:
        '#2F2B26',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },
    characterName: {
      fontSize: 19,
      fontWeight: '900',
      color:
        '#302C28',
    },
    characterId: {
      marginTop: 2,
      fontSize: 10,
      color:
        '#8A8075',
    },
    tierBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor:
        '#EEE8E0',
    },
    tierBadgeSelected: {
      backgroundColor:
        '#2F2B26',
    },
    tierText: {
      fontSize: 11,
      fontWeight: '900',
      color:
        '#665E55',
    },
    tierTextSelected: {
      color:
        '#FFFFFF',
    },
    selectedText: {
      fontSize: 11,
      fontWeight: '800',
      color:
        '#5D554C',
    },
    pointRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent:
        'space-between',
    },
    pointValue: {
      fontSize: 26,
      fontWeight: '900',
      color:
        '#2F2B26',
    },
    nextTier: {
      fontSize: 11,
      fontWeight: '700',
      color:
        '#776D62',
    },
    metricGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    metric: {
      flex: 1,
      padding: 10,
      borderRadius: 11,
      backgroundColor:
        '#F7F3EE',
      gap: 3,
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '800',
      color:
        '#857A6E',
    },
    metricValue: {
      fontSize: 15,
      fontWeight: '900',
      color:
        '#39342F',
    },
    sectionLabel: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: '900',
      color:
        '#72685E',
    },
    detailText: {
      fontSize: 12,
      fontWeight: '700',
      color:
        '#4D4741',
    },
    lastInteraction: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 15,
      color:
        '#8A8075',
    },
  });
