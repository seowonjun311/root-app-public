import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CHARACTER_GROWTH_LEVELS,
  getCharacterNextGrowthThreshold,
} from '../../constants/characterProgression';
import {
  getCharacterProgressionSnapshot,
  loadCharacterProgression,
  subscribeCharacterProgression,
} from '../../store/characterProgression';
import {
  getCharacterRelationshipSnapshot,
  loadCharacterRelationships,
  subscribeCharacterRelationships,
} from '../../store/characterRelationship';
import {
  subscribeCharacterHomeInteractionFeedback,
  type CharacterHomeFeedbackEvent,
} from '../../store/characterHomeFeedback';
import {
  useSelectedCharacter,
} from '../../store/selectedCharacter';

const RELATIONSHIP_LABEL = {
  distant:
    '낯선 사이',
  familiar:
    '익숙한 사이',
  close:
    '가까운 사이',
  bonded:
    '소중한 친구',
} as const;

function relationshipBand(
  points: number
): {
  min: number;
  max: number;
} {
  if (
    points >=
    75
  ) {
    return {
      min: 75,
      max: 100,
    };
  }

  if (
    points >=
    50
  ) {
    return {
      min: 50,
      max: 75,
    };
  }

  if (
    points >=
    25
  ) {
    return {
      min: 25,
      max: 50,
    };
  }

  return {
    min: 0,
    max: 25,
  };
}

function clampProgress(
  value: number
): number {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

// CHARACTER_V99B_V4_TYPED_PERCENT_WIDTH
function percentWidth(
  progress: number
): `${number}%` {
  const percent =
    Math.round(
      clampProgress(
        progress
      ) *
      10000
    ) /
    100;

  return `${percent}%`;
}

type BubbleState = {
  characterId:
    CharacterHomeFeedbackEvent[
      'characterId'
    ];
  xpDelta: number;
  relationshipDelta:
    number;
  lastAt: number;
};

// CHARACTER_V99B_HOME_PROGRESS_AND_MICROFEEDBACK
export default function CharacterHomeProgressFeedback() {
  const {
    selectedCharacter,
    ready,
  } =
    useSelectedCharacter();

  const [
    revision,
    setRevision,
  ] =
    useState(
      0
    );

  const [
    bubble,
    setBubble,
  ] =
    useState<
      BubbleState | null
    >(
      null
    );

  const bubbleRef =
    useRef<
      BubbleState | null
    >(
      null
    );

  const clearTimer =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(
      null
    );

  const opacity =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const translateY =
    useRef(
      new Animated.Value(
        10
      )
    ).current;

  useEffect(
    () => {
      let cancelled =
        false;

      const refresh =
        () => {
          if (
            !cancelled
          ) {
            setRevision(
              (
                value
              ) =>
                value +
                1
            );
          }
        };

      const unsubscribeProgression =
        subscribeCharacterProgression(
          refresh
        );

      const unsubscribeRelationship =
        subscribeCharacterRelationships(
          refresh
        );

      void Promise.all([
        loadCharacterProgression(),
        loadCharacterRelationships(),
      ])
        .then(
          refresh
        )
        .catch(
          () => {}
        );

      return () => {
        cancelled =
          true;

        unsubscribeProgression();
        unsubscribeRelationship();
      };
    },
    []
  );

  useEffect(
    () => {
      const unsubscribe =
        subscribeCharacterHomeInteractionFeedback(
          (
            event
          ) => {
            if (
              !ready ||
              event.characterId !==
                selectedCharacter
            ) {
              return;
            }

            const previous =
              bubbleRef.current;

            const canBatch =
              previous !==
                null &&
              previous.characterId ===
                event.characterId &&
              event.at -
                previous.lastAt <=
                450;

            const next:
              BubbleState = {
              characterId:
                event.characterId,
              xpDelta:
                (
                  canBatch
                    ? previous
                        ?.xpDelta ??
                      0
                    : 0
                ) +
                event.xpDelta,
              relationshipDelta:
                (
                  canBatch
                    ? previous
                        ?.relationshipDelta ??
                      0
                    : 0
                ) +
                event.relationshipDelta,
              lastAt:
                event.at,
            };

            bubbleRef.current =
              next;

            setBubble(
              next
            );

            if (
              clearTimer.current
            ) {
              clearTimeout(
                clearTimer.current
              );
            }

            opacity.stopAnimation();
            translateY.stopAnimation();

            opacity.setValue(
              0
            );

            translateY.setValue(
              10
            );

            Animated.parallel([
              Animated.timing(
                opacity,
                {
                  toValue: 1,
                  duration: 130,
                  useNativeDriver:
                    true,
                }
              ),
              Animated.spring(
                translateY,
                {
                  toValue: 0,
                  damping: 12,
                  stiffness: 190,
                  mass: 0.55,
                  useNativeDriver:
                    true,
                }
              ),
            ]).start();

            clearTimer.current =
              setTimeout(
                () => {
                  Animated.timing(
                    opacity,
                    {
                      toValue: 0,
                      duration: 220,
                      useNativeDriver:
                        true,
                    }
                  ).start(
                    () => {
                      bubbleRef.current =
                        null;

                      setBubble(
                        null
                      );
                    }
                  );
                },
                900
              );
          }
        );

      return () => {
        unsubscribe();

        if (
          clearTimer.current
        ) {
          clearTimeout(
            clearTimer.current
          );
        }
      };
    },
    [
      opacity,
      ready,
      selectedCharacter,
      translateY,
    ]
  );

  const data =
    useMemo(
      () => {
        void revision;

        if (
          !ready
        ) {
          return null;
        }

        const progression =
          getCharacterProgressionSnapshot(
            selectedCharacter
          );

        const relationship =
          getCharacterRelationshipSnapshot(
            selectedCharacter
          );

        const currentMilestone =
          CHARACTER_GROWTH_LEVELS.find(
            (
              item
            ) =>
              item.level ===
              progression.growthLevel
          ) ??
          CHARACTER_GROWTH_LEVELS[
            0
          ];

        const nextThreshold =
          getCharacterNextGrowthThreshold(
            progression.growthXp
          );

        const growthProgress =
          nextThreshold ===
            null
            ? 1
            : clampProgress(
                (
                  progression.growthXp -
                  currentMilestone.minXp
                ) /
                Math.max(
                  1,
                  nextThreshold -
                    currentMilestone.minXp
                )
              );

        const relationBand =
          relationshipBand(
            relationship.points
          );

        const relationshipProgress =
          clampProgress(
            (
              relationship.points -
              relationBand.min
            ) /
            Math.max(
              1,
              relationBand.max -
                relationBand.min
            )
          );

        return {
          progression,
          relationship,
          nextThreshold,
          growthProgress,
          relationBand,
          relationshipProgress,
        };
      },
      [
        ready,
        revision,
        selectedCharacter,
      ]
    );

  if (
    data ===
    null
  ) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={
        StyleSheet.absoluteFill
      }
    >
      <View
        style={
          styles.progressCard
        }
      >
        <View
          style={
            styles.headerRow
          }
        >
          <Text
            style={
              styles.level
            }
          >
            Lv.{
              data
                .progression
                .growthLevel
            }
          </Text>

          <Text
            style={
              styles.relationshipLabel
            }
          >
            {
              RELATIONSHIP_LABEL[
                data
                  .relationship
                  .tier
              ]
            }
          </Text>
        </View>

        <View
          style={
            styles.metricRow
          }
        >
          <Text
            style={
              styles.metricLabel
            }
          >
            성장
          </Text>

          <Text
            style={
              styles.metricValue
            }
          >
            {
              data
                .progression
                .growthXp
            }
            {
              data
                .nextThreshold ===
                null
                ? ' XP MAX'
                : ' / ' +
                  data
                    .nextThreshold +
                  ' XP'
            }
          </Text>
        </View>

        <View
          style={
            styles.track
          }
        >
          <View
            style={[
              styles.fill,
              {
                width:
                  percentWidth(
                    data
                      .growthProgress
                  ),
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.metricRow,
            styles.relationshipMetric,
          ]}
        >
          <Text
            style={
              styles.metricLabel
            }
          >
            친밀도
          </Text>

          <Text
            style={
              styles.metricValue
            }
          >
            {
              data
                .relationship
                .points
            }
            {' / '}
            {
              data
                .relationBand
                .max
            }
          </Text>
        </View>

        <View
          style={
            styles.track
          }
        >
          <View
            style={[
              styles.fill,
              {
                width:
                  percentWidth(
                    data
                      .relationshipProgress
                  ),
              },
            ]}
          />
        </View>
      </View>

      {
        bubble !==
          null
          ? (
              <Animated.View
                style={[
                  styles.feedbackBubble,
                  {
                    opacity,
                    transform: [
                      {
                        translateY,
                      },
                    ],
                  },
                ]}
              >
                {
                  bubble.xpDelta >
                  0
                    ? (
                        <Text
                          style={
                            styles.feedbackText
                          }
                        >
                          +{
                            bubble.xpDelta
                          } XP
                        </Text>
                      )
                    : null
                }

                {
                  bubble
                    .relationshipDelta >
                  0
                    ? (
                        <Text
                          style={
                            styles.feedbackText
                          }
                        >
                          +{
                            bubble
                              .relationshipDelta
                          } 친밀도
                        </Text>
                      )
                    : null
                }
              </Animated.View>
            )
          : null
      }
    </View>
  );
}

const styles =
  StyleSheet.create({
    progressCard: {
      position:
        'absolute',
      top: 88,
      right: 12,
      width: 178,
      paddingHorizontal:
        12,
      paddingVertical:
        10,
      borderRadius:
        16,
      backgroundColor:
        'rgba(255,253,248,0.94)',
      borderWidth: 1,
      borderColor:
        'rgba(224,214,201,0.95)',
      shadowColor:
        '#000000',
      shadowOpacity:
        0.09,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 5,
    },
    headerRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 7,
    },
    level: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#302A25',
    },
    relationshipLabel: {
      fontSize: 10,
      fontWeight:
        '800',
      color:
        '#76695E',
    },
    metricRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 4,
    },
    relationshipMetric: {
      marginTop: 7,
    },
    metricLabel: {
      fontSize: 10,
      fontWeight:
        '800',
      color:
        '#74685E',
    },
    metricValue: {
      fontSize: 10,
      fontWeight:
        '800',
      color:
        '#403832',
    },
    track: {
      height: 5,
      overflow:
        'hidden',
      borderRadius:
        999,
      backgroundColor:
        '#E9E1D8',
    },
    fill: {
      height: '100%',
      borderRadius:
        999,
      backgroundColor:
        '#716355',
    },
    feedbackBubble: {
      position:
        'absolute',
      top: 178,
      alignSelf:
        'center',
      flexDirection:
        'row',
      gap: 8,
      paddingHorizontal:
        13,
      paddingVertical:
        8,
      borderRadius:
        999,
      backgroundColor:
        'rgba(48,42,37,0.92)',
    },
    feedbackText: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#FFFFFF',
    },
  });
