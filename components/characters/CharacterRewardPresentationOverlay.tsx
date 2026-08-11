import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  type CharacterId,
} from '../../constants/characterAssets';
import {
  saveSelectedCharacter,
} from '../../store/selectedCharacter';
import {
  completeCharacterRewardPresentation,
  getCharacterRewardPresentationSnapshot,
  registerCharacterRewardPresentationHost,
  subscribeCharacterRewardPresentation,
  type CharacterRewardPresentationEvent,
} from '../../store/characterRewardPresentation';
import CharacterSprite from './CharacterSprite';

const CHARACTER_LABEL:
  Record<
    CharacterId,
    string
  > = {
  rooty: '루티',
  moru: '모루',
  mongsil: '몽실',
  dami: '다미',
  pio: '피오',
  nuri: '누리',
  tori: '토리',
};

const CHARACTER_TAGLINE:
  Record<
    CharacterId,
    string
  > = {
  rooty:
    '함께 성장하는 균형 잡힌 숲 친구',
  moru:
    '호기심 많고 활발한 숲 친구',
  mongsil:
    '포근하고 느긋한 휴식 친구',
  dami:
    '따뜻하고 사교적인 다정한 친구',
  pio:
    '새로운 곳을 좋아하는 탐험가',
  nuri:
    '장난기 많고 모험적인 친구',
  tori:
    '수줍지만 마음이 따뜻한 친구',
};

type Props = {
  hostId: string;
};

// CHARACTER_V99A_ANIMATED_REWARD_OVERLAY
export default function CharacterRewardPresentationOverlay({
  hostId,
}: Props) {
  const [
    event,
    setEvent,
  ] =
    useState<
      CharacterRewardPresentationEvent | null
    >(
      null
    );

  const [
    selecting,
    setSelecting,
  ] =
    useState(
      false
    );

  const [
    errorText,
    setErrorText,
  ] =
    useState<
      string | null
    >(
      null
    );

  const opacity =
    useRef(
      new Animated.Value(
        0
      )
    ).current;

  const scale =
    useRef(
      new Animated.Value(
        0.82
      )
    ).current;

  const translateY =
    useRef(
      new Animated.Value(
        18
      )
    ).current;

  useEffect(
    () => {
      const refresh =
        () => {
          setEvent(
            getCharacterRewardPresentationSnapshot(
              hostId
            )
          );
        };

      const unregisterHost =
        registerCharacterRewardPresentationHost(
          hostId
        );

      const unsubscribe =
        subscribeCharacterRewardPresentation(
          refresh
        );

      refresh();

      return () => {
        unsubscribe();
        unregisterHost();
      };
    },
    [
      hostId,
    ]
  );

  useEffect(
    () => {
      setSelecting(
        false
      );

      setErrorText(
        null
      );

      if (
        event ===
        null
      ) {
        opacity.setValue(
          0
        );

        scale.setValue(
          0.82
        );

        translateY.setValue(
          18
        );

        return;
      }

      opacity.setValue(
        0
      );

      scale.setValue(
        0.82
      );

      translateY.setValue(
        18
      );

      Animated.parallel([
        Animated.timing(
          opacity,
          {
            toValue: 1,
            duration: 220,
            useNativeDriver:
              true,
          }
        ),
        Animated.spring(
          scale,
          {
            toValue: 1,
            damping: 11,
            stiffness: 155,
            mass: 0.7,
            useNativeDriver:
              true,
          }
        ),
        Animated.spring(
          translateY,
          {
            toValue: 0,
            damping: 12,
            stiffness: 145,
            mass: 0.8,
            useNativeDriver:
              true,
          }
        ),
      ]).start();
    },
    [
      event
        ?.id,
      opacity,
      scale,
      translateY,
    ]
  );

  const content =
    useMemo(
      () => {
        if (
          event ===
          null
        ) {
          return null;
        }

        const name =
          CHARACTER_LABEL[
            event.characterId
          ];

        if (
          event.type ===
          'acquisition'
        ) {
          return {
            eyebrow:
              'NEW CHARACTER',
            title:
              name +
              '를 만났어요!',
            body:
              CHARACTER_TAGLINE[
                event.characterId
              ],
            detail:
              event.sourceText +
              '으로 잠금이 해제되었어요.',
            reward:
              '새로운 친구가 ROOT 마을에 합류했어요',
          };
        }

        return {
          eyebrow:
            'LEVEL UP',
          title:
            name +
            ' Lv.' +
            event.level,
          body:
            name +
            '가 한 단계 더 성장했어요!',
          detail:
            'Lv.' +
            event.beforeLevel +
            ' → Lv.' +
            event.level,
          reward:
            event.rewardPoints >
              0
              ? '+' +
                event.rewardPoints +
                'P 성장 보상'
              : '성장 단계 달성',
        };
      },
      [
        event,
      ]
    );

  if (
    event ===
      null ||
    content ===
      null
  ) {
    return null;
  }

  const finish =
    (
      action:
        'dismiss' |
        'select'
    ) => {
      completeCharacterRewardPresentation(
        action
      );
    };

  const selectNow =
    async () => {
      if (
        selecting ||
        event.type !==
          'acquisition'
      ) {
        return;
      }

      setSelecting(
        true
      );

      setErrorText(
        null
      );

      try {
        const selected =
          await saveSelectedCharacter(
            event.characterId
          );

        if (
          !selected
        ) {
          setErrorText(
            '아직 이 캐릭터를 선택할 수 없어요.'
          );

          return;
        }

        finish(
          'select'
        );
      }
      catch (error: any) {
        setErrorText(
          error
            ?.message ??
          '캐릭터 선택 중 오류가 발생했어요.'
        );
      }
      finally {
        setSelecting(
          false
        );
      }
    };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={
        () => {}
      }
    >
      <View
        style={
          styles.backdrop
        }
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity,
              transform: [
                {
                  translateY,
                },
                {
                  scale,
                },
              ],
            },
          ]}
        >
          <Text
            style={
              styles.sparkle
            }
          >
            ✨
          </Text>

          <View
            style={
              styles.eyebrow
            }
          >
            <Text
              style={
                styles.eyebrowText
              }
            >
              {
                content.eyebrow
              }
            </Text>
          </View>

          <View
            style={
              styles.characterStage
            }
          >
            <CharacterSprite
              characterId={
                event.characterId
              }
              action="happy"
              size={190}
            />
          </View>

          <Text
            style={
              styles.title
            }
          >
            {
              content.title
            }
          </Text>

          <Text
            style={
              styles.body
            }
          >
            {
              content.body
            }
          </Text>

          <Text
            style={
              styles.detail
            }
          >
            {
              content.detail
            }
          </Text>

          <View
            style={
              styles.rewardPill
            }
          >
            <Text
              style={
                styles.rewardText
              }
            >
              {
                content.reward
              }
            </Text>
          </View>

          {
            errorText
              ? (
                  <Text
                    style={
                      styles.error
                    }
                  >
                    {
                      errorText
                    }
                  </Text>
                )
              : null
          }

          {
            event.type ===
              'acquisition'
              ? (
                  <View
                    style={
                      styles.actions
                    }
                  >
                    <Pressable
                      disabled={
                        selecting
                      }
                      onPress={
                        () =>
                          finish(
                            'dismiss'
                          )
                      }
                      style={[
                        styles.secondary,
                        selecting &&
                          styles.disabled,
                      ]}
                    >
                      <Text
                        style={
                          styles.secondaryText
                        }
                      >
                        나중에
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={
                        selecting
                      }
                      onPress={
                        () => {
                          void selectNow();
                        }
                      }
                      style={[
                        styles.primary,
                        selecting &&
                          styles.disabled,
                      ]}
                    >
                      <Text
                        style={
                          styles.primaryText
                        }
                      >
                        {
                          selecting
                            ? '선택 중...'
                            : '바로 선택'
                        }
                      </Text>
                    </Pressable>
                  </View>
                )
              : (
                  <Pressable
                    onPress={
                      () =>
                        finish(
                          'dismiss'
                        )
                    }
                    style={
                      styles.fullPrimary
                    }
                  >
                    <Text
                      style={
                        styles.primaryText
                      }
                    >
                      계속하기
                    </Text>
                  </Pressable>
                )
          }
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
      paddingHorizontal:
        24,
      backgroundColor:
        'rgba(23, 20, 17, 0.58)',
    },
    card: {
      width: '100%',
      maxWidth: 390,
      alignItems:
        'center',
      paddingHorizontal:
        22,
      paddingTop:
        20,
      paddingBottom:
        20,
      borderRadius:
        28,
      backgroundColor:
        '#FFFDF8',
      borderWidth:
        1,
      borderColor:
        '#E8DDCF',
      shadowColor:
        '#000000',
      shadowOpacity:
        0.2,
      shadowRadius:
        22,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      elevation: 12,
    },
    sparkle: {
      position:
        'absolute',
      right: 22,
      top: 18,
      fontSize: 26,
    },
    eyebrow: {
      paddingHorizontal:
        12,
      paddingVertical:
        6,
      borderRadius:
        999,
      backgroundColor:
        '#EEE5D8',
    },
    eyebrowText: {
      fontSize: 11,
      fontWeight:
        '900',
      letterSpacing:
        1.1,
      color:
        '#6F6254',
    },
    characterStage: {
      height: 200,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginTop: 6,
      marginBottom:
        2,
    },
    title: {
      fontSize: 24,
      lineHeight: 31,
      fontWeight:
        '900',
      textAlign:
        'center',
      color:
        '#302A25',
    },
    body: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      fontWeight:
        '700',
      textAlign:
        'center',
      color:
        '#5D5349',
    },
    detail: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      textAlign:
        'center',
      color:
        '#867A6E',
    },
    rewardPill: {
      marginTop: 13,
      paddingHorizontal:
        14,
      paddingVertical:
        9,
      borderRadius:
        14,
      backgroundColor:
        '#F4EBDD',
    },
    rewardText: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#6A5947',
    },
    error: {
      marginTop: 10,
      fontSize: 11,
      lineHeight: 16,
      textAlign:
        'center',
      color:
        '#A45147',
    },
    actions: {
      width: '100%',
      flexDirection:
        'row',
      gap: 10,
      marginTop: 18,
    },
    secondary: {
      flex: 1,
      minHeight: 48,
      justifyContent:
        'center',
      alignItems:
        'center',
      borderRadius:
        15,
      backgroundColor:
        '#F0EAE2',
    },
    primary: {
      flex: 1.35,
      minHeight: 48,
      justifyContent:
        'center',
      alignItems:
        'center',
      borderRadius:
        15,
      backgroundColor:
        '#302A25',
    },
    fullPrimary: {
      width: '100%',
      minHeight: 48,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginTop: 18,
      borderRadius:
        15,
      backgroundColor:
        '#302A25',
    },
    secondaryText: {
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#62584F',
    },
    primaryText: {
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#FFFFFF',
    },
    disabled: {
      opacity: 0.55,
    },
  });
