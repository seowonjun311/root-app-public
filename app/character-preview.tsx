import React, {
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
  Stack,
} from 'expo-router';

import CharacterSprite from '../components/characters/CharacterSprite';
import {
  CHARACTER_IDS,
  getCharacterAssetDefinition,
  getCharacterFrames,
  type CharacterAction,
  type CharacterId,
} from '../constants/characterAssets';

const CHARACTER_ACTIONS:
  readonly CharacterAction[] = [
  'idle',
  'walk',
  'sit',
  'sleep',
  'happy',
  'touch',
];

const ACTION_LABELS:
  Record<
    CharacterAction,
    string
  > = {
  idle: '\uAE30\uBCF8',
  walk: '\uAC77\uAE30',
  sit: '\uC549\uAE30',
  sleep: '\uC7A0\uC790\uAE30',
  happy: '\uAE30\uC068',
  touch: '\uD130\uCE58',
};

const CHARACTER_LABELS:
  Record<
    CharacterId,
    string
  > = {
  rooty: '\uB8E8\uD2F0',
  moru: '\uBAA8\uB8E8',
  mongsil: '\uBABD\uC2E4',
  dami: '\uB2E4\uBBF8',
};

// CHARACTER_V69_COMPATIBILITY_PREVIEW_SCREEN
export default function CharacterPreviewScreen() {
  const [
    characterId,
    setCharacterId,
  ] =
    useState<CharacterId>(
      'rooty'
    );

  const [
    action,
    setAction,
  ] =
    useState<CharacterAction>(
      'idle'
    );

  const [
    paused,
    setPaused,
  ] =
    useState(false);

  const definition =
    useMemo(
      () =>
        getCharacterAssetDefinition(
          characterId
        ),
      [
        characterId,
      ]
    );

  const rawFrameCount =
    definition.frames[
      action
    ].length;

  const resolvedFrameCount =
    getCharacterFrames(
      characterId,
      action
    ).length;

  const fallbackUsed =
    rawFrameCount === 0 &&
    resolvedFrameCount > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uD504\uB9AC\uBDF0',
        }}
      />

      <SafeAreaView
        style={
          styles.safeArea
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
            Character V69
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {'Home \uC5F0\uACB0 \uC804 \uACF5\uC6A9 \uC561\uC158 \uD638\uD658 \uD504\uB9AC\uBDF0'}
          </Text>

          <View
            style={
              styles.previewCard
            }
          >
            <CharacterSprite
              characterId={
                characterId
              }
              action={
                action
              }
              paused={
                paused
              }
              size={220}
              testID="character-v69-preview-sprite"
            />

            <Text
              style={
                styles.characterName
              }
            >
              {
                CHARACTER_LABELS[
                  characterId
                ]
              }
            </Text>

            <Text
              style={
                styles.meta
              }
            >
              profile: {
                definition.frameProfile
              }
            </Text>

            <Text
              style={
                styles.meta
              }
            >
              action: {
                action
              }
            </Text>

            <Text
              style={
                styles.meta
              }
            >
              raw frames: {
                rawFrameCount
              } / resolved: {
                resolvedFrameCount
              }
            </Text>

            {fallbackUsed ? (
              <Text
                style={
                  styles.fallback
                }
              >
                {'idle fallback \uC0AC\uC6A9 \uC911'}
              </Text>
            ) : null}

            <Pressable
              onPress={
                () =>
                  setPaused(
                    (current) =>
                      !current
                  )
              }
              style={
                styles.pauseButton
              }
            >
              <Text
                style={
                  styles.pauseButtonText
                }
              >
                {
                  paused
                    ? '\uC7AC\uC0DD'
                    : '\uC77C\uC2DC\uC815\uC9C0'
                }
              </Text>
            </Pressable>
          </View>

          <Text
            style={
              styles.sectionTitle
            }
          >
            {'\uCE90\uB9AD\uD130'}
          </Text>

          <View
            style={
              styles.buttonGrid
            }
          >
            {CHARACTER_IDS.map(
              (id) => {
                const selected =
                  id ===
                  characterId;

                return (
                  <Pressable
                    key={id}
                    onPress={
                      () =>
                        setCharacterId(
                          id
                        )
                    }
                    style={[
                      styles.choiceButton,
                      selected &&
                        styles.choiceButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        selected &&
                          styles.choiceTextSelected,
                      ]}
                    >
                      {
                        CHARACTER_LABELS[
                          id
                        ]
                      }
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <Text
            style={
              styles.sectionTitle
            }
          >
            {'\uD589\uB3D9'}
          </Text>

          <View
            style={
              styles.buttonGrid
            }
          >
            {CHARACTER_ACTIONS.map(
              (item) => {
                const selected =
                  item ===
                  action;

                return (
                  <Pressable
                    key={item}
                    onPress={
                      () =>
                        setAction(
                          item
                        )
                    }
                    style={[
                      styles.choiceButton,
                      selected &&
                        styles.choiceButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        selected &&
                          styles.choiceTextSelected,
                      ]}
                    >
                      {
                        ACTION_LABELS[
                          item
                        ]
                      }
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <View
            style={
              styles.noteCard
            }
          >
            <Text
              style={
                styles.noteTitle
              }
            >
              {'V69 \uAC80\uC99D \uAE30\uC900'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uB8E8\uD2F0\uB294 legacy-rooty \uAC00\uBCC0 \uD504\uB808\uC784\uACFC fallback\uC744 \uC720\uC9C0\uD569\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uBAA8\uB8E8\u00B7\uBABD\uC2E4\u00B7\uB2E4\uBBF8\uB294 standard-23 \uD504\uB808\uC784\uC744 \uACF5\uC6A9 CharacterSprite\uB85C \uC7AC\uC0DD\uD569\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uC774 \uD654\uBA74\uC740 Home \uD589\uB3D9 \uC5D4\uC9C4\uACFC \uCE90\uB9AD\uD130 \uC120\uD0DD \uC800\uC7A5\uC5D0\uB294 \uC544\uC9C1 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        '#F6F1E8',
    },
    content: {
      padding: 20,
      paddingBottom: 48,
      gap: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: '#2F2B26',
    },
    subtitle: {
      fontSize: 14,
      color: '#6E665D',
    },
    previewCard: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor:
        '#FFFFFF',
      gap: 6,
    },
    characterName: {
      marginTop: 8,
      fontSize: 20,
      fontWeight: '800',
      color: '#2F2B26',
    },
    meta: {
      fontSize: 13,
      color: '#746B61',
    },
    fallback: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '700',
      color: '#9A6E2E',
    },
    pauseButton: {
      marginTop: 12,
      minWidth: 96,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor:
        '#2F2B26',
    },
    pauseButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    sectionTitle: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '800',
      color: '#2F2B26',
    },
    buttonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    choiceButton: {
      minWidth: 88,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        '#D8CEC0',
      backgroundColor:
        '#FFFFFF',
    },
    choiceButtonSelected: {
      borderColor:
        '#2F2B26',
      backgroundColor:
        '#2F2B26',
    },
    choiceText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#5F574F',
    },
    choiceTextSelected: {
      color: '#FFFFFF',
    },
    noteCard: {
      marginTop: 8,
      padding: 16,
      borderRadius: 16,
      backgroundColor:
        '#EEE6D9',
      gap: 8,
    },
    noteTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#2F2B26',
    },
    noteText: {
      fontSize: 13,
      lineHeight: 19,
      color: '#645D55',
    },
  });
