import React, {
  useEffect,
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
  subscribeCharacterMicroDialogue,
  type CharacterMicroDialogueEvent,
} from '../../store/characterMicroDialogue';
import {
  useSelectedCharacter,
} from '../../store/selectedCharacter';

const CHARACTER_LABEL = {
  rooty: '루티',
  moru: '모루',
  mongsil: '몽실',
  dami: '다미',
  pio: '피오',
  nuri: '누리',
  tori: '토리',
} as const;

// CHARACTER_V99C_HOME_DIALOGUE_BUBBLE
export default function CharacterHomeDialogueBubble() {
  const {
    selectedCharacter,
    ready,
  } =
    useSelectedCharacter();

  const [
    event,
    setEvent,
  ] =
    useState<
      CharacterMicroDialogueEvent | null
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
        8
      )
    ).current;

  const scale =
    useRef(
      new Animated.Value(
        0.96
      )
    ).current;

  useEffect(
    () => {
      const unsubscribe =
        subscribeCharacterMicroDialogue(
          (
            next
          ) => {
            if (
              !ready ||
              next.characterId !==
                selectedCharacter
            ) {
              return;
            }

            if (
              clearTimer.current
            ) {
              clearTimeout(
                clearTimer.current
              );
            }

            setEvent(
              next
            );

            opacity.stopAnimation();
            translateY.stopAnimation();
            scale.stopAnimation();

            opacity.setValue(
              0
            );

            translateY.setValue(
              8
            );

            scale.setValue(
              0.96
            );

            Animated.parallel([
              Animated.timing(
                opacity,
                {
                  toValue: 1,
                  duration: 150,
                  useNativeDriver:
                    true,
                }
              ),
              Animated.spring(
                translateY,
                {
                  toValue: 0,
                  damping: 13,
                  stiffness: 185,
                  mass: 0.55,
                  useNativeDriver:
                    true,
                }
              ),
              Animated.spring(
                scale,
                {
                  toValue: 1,
                  damping: 13,
                  stiffness: 185,
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
                      duration: 240,
                      useNativeDriver:
                        true,
                    }
                  ).start(
                    () => {
                      setEvent(
                        null
                      );
                    }
                  );
                },
                1800
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
      scale,
      selectedCharacter,
      translateY,
    ]
  );

  if (
    event ===
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
      <Animated.View
        style={[
          styles.bubble,
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
            styles.name
          }
        >
          {
            CHARACTER_LABEL[
              event.characterId
            ]
          }
        </Text>

        <Text
          style={
            styles.text
          }
        >
          {
            event.text
          }
        </Text>

        <View
          style={
            styles.tail
          }
        />
      </Animated.View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    bubble: {
      position:
        'absolute',
      top: 230,
      alignSelf:
        'center',
      maxWidth: 286,
      minWidth: 150,
      paddingHorizontal:
        14,
      paddingVertical:
        11,
      borderRadius:
        17,
      backgroundColor:
        'rgba(255,253,248,0.97)',
      borderWidth: 1,
      borderColor:
        'rgba(220,210,198,0.96)',
      shadowColor:
        '#000000',
      shadowOpacity:
        0.11,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 6,
    },
    name: {
      marginBottom: 3,
      fontSize: 10,
      fontWeight:
        '900',
      color:
        '#7A6C60',
    },
    text: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight:
        '800',
      color:
        '#342D28',
      textAlign:
        'center',
    },
    tail: {
      position:
        'absolute',
      left: '50%',
      bottom: -6,
      width: 12,
      height: 12,
      marginLeft: -6,
      backgroundColor:
        'rgba(255,253,248,0.97)',
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor:
        'rgba(220,210,198,0.96)',
      transform: [
        {
          rotate:
            '45deg',
        },
      ],
    },
  });
