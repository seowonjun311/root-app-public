import React, {
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
import {
  useSelectedCharacter,
} from '../store/selectedCharacter';

const ACTIONS:
  readonly CharacterAction[] = [
  'idle',
  'walk',
  'sit',
  'sleep',
  'happy',
  'touch',
];

const CHARACTER_LABEL:
  Record<CharacterId, string> = {
  rooty: '\uB8E8\uD2F0',
  moru: '\uBAA8\uB8E8',
  mongsil: '\uBABD\uC2E4',
  dami: '\uB2E4\uBBF8',
};

const ACTION_LABEL:
  Record<CharacterAction, string> = {
  idle: '\uAE30\uBCF8',
  walk: '\uAC77\uAE30',
  sit: '\uC549\uAE30',
  sleep: '\uC7A0\uC790\uAE30',
  happy: '\uAE30\uC068',
  touch: '\uD130\uCE58',
};

// CHARACTER_V69_COMPATIBILITY_PREVIEW_SCREEN
// CHARACTER_V70_SELECT_AND_SAVE_SCREEN
export default function CharacterPreviewScreen() {
  const {
    selectedCharacter,
    ready,
    selectCharacter,
  } =
    useSelectedCharacter();

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
    saving,
    setSaving,
  ] =
    useState(false);

  useEffect(
    () => {
      if (ready) {
        setCharacterId(
          selectedCharacter
        );
      }
    },
    [
      ready,
      selectedCharacter,
    ]
  );

  const definition =
    getCharacterAssetDefinition(
      characterId
    );

  const rawFrames =
    definition.frames[action].length;

  const resolvedFrames =
    getCharacterFrames(
      characterId,
      action
    ).length;

  const isCurrent =
    ready &&
    characterId ===
      selectedCharacter;

  const save =
    async () => {
      if (
        saving ||
        isCurrent
      ) {
        return;
      }

      setSaving(
        true
      );

      try {
        await selectCharacter(
          characterId
        );
      }
      finally {
        setSaving(
          false
        );
      }
    };

  return (
    <>
      <Stack.Screen
        options={{
          title:
            '\uCE90\uB9AD\uD130 \uC120\uD0DD',
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
            Character V70
          </Text>

          <Text
            style={
              styles.sub
            }
          >
            {'\uCE90\uB9AD\uD130\uB97C \uBBF8\uB9AC \uBCF4\uACE0 Home\uC5D0 \uC0AC\uC6A9\uD560 \uCE90\uB9AD\uD130\uB97C \uC800\uC7A5\uD558\uC138\uC694.'}
          </Text>

          <View
            style={
              styles.card
            }
          >
            <CharacterSprite
              characterId={
                characterId
              }
              action={
                action
              }
              size={220}
            />

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
              frames: {
                rawFrames
              } / resolved: {
                resolvedFrames
              }
            </Text>

            <Text
              style={
                styles.current
              }
            >
              {'\uD604\uC7AC Home: '}
              {
                ready
                  ? CHARACTER_LABEL[
                      selectedCharacter
                    ]
                  : '\uBD88\uB7EC\uC624\uB294 \uC911'
              }
            </Text>

            <Pressable
              disabled={
                saving ||
                isCurrent
              }
              onPress={
                () => {
                  void save();
                }
              }
              style={[
                styles.save,
                (
                  saving ||
                  isCurrent
                ) &&
                  styles.disabled,
              ]}
            >
              <Text
                style={
                  styles.saveText
                }
              >
                {
                  saving
                    ? '\uC800\uC7A5 \uC911...'
                    : isCurrent
                      ? '\uD604\uC7AC \uC0AC\uC6A9 \uC911'
                      : 'Home\uC5D0 \uC0AC\uC6A9'
                }
              </Text>
            </Pressable>
          </View>

          <Text
            style={
              styles.section
            }
          >
            {'\uCE90\uB9AD\uD130'}
          </Text>

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

          <Text
            style={
              styles.section
            }
          >
            {'\uD589\uB3D9'}
          </Text>

          <View
            style={
              styles.row
            }
          >
            {ACTIONS.map(
              (item) => (
                <Pressable
                  key={item}
                  onPress={
                    () =>
                      setAction(
                        item
                      )
                  }
                  style={[
                    styles.choice,
                    item ===
                      action &&
                      styles.selected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      item ===
                        action &&
                        styles.selectedText,
                    ]}
                  >
                    {
                      ACTION_LABEL[
                        item
                      ]
                    }
                  </Text>
                </Pressable>
              )
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
              {'\uB8E8\uD2F0\uB294 \uAE30\uC874 RootySprite\uC640 \uBC29\uD5A5/fallback \uACBD\uB85C\uB97C \uADF8\uB300\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uBAA8\uB8E8\u00B7\uBABD\uC2E4\u00B7\uB2E4\uBBF8\uB294 Home\uC758 \uAE30\uC874 action\uC744 CharacterSprite\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.'}
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
    sub: {
      fontSize: 14,
      color: '#6E665D',
    },
    card: {
      alignItems: 'center',
      padding: 20,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      gap: 6,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: '#2F2B26',
    },
    meta: {
      fontSize: 13,
      color: '#746B61',
    },
    current: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '700',
      color: '#4F473F',
    },
    save: {
      marginTop: 10,
      minWidth: 130,
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: '#2F2B26',
    },
    disabled: {
      opacity: 0.45,
    },
    saveText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    section: {
      fontSize: 16,
      fontWeight: '800',
      color: '#2F2B26',
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    choice: {
      minWidth: 88,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#D8CEC0',
      backgroundColor: '#FFFFFF',
    },
    selected: {
      borderColor: '#2F2B26',
      backgroundColor: '#2F2B26',
    },
    choiceText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#5F574F',
    },
    selectedText: {
      color: '#FFFFFF',
    },
    note: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#EEE6D9',
      gap: 8,
    },
    noteText: {
      fontSize: 13,
      lineHeight: 19,
      color: '#645D55',
    },
  });
