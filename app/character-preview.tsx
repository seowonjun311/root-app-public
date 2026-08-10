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
  Link,
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
  resolveStandardCharacterScaleX,
} from '../constants/characterFacing';
import {
  getCharacterPlaybackMode,
} from '../constants/characterPlayback';
import {
  getCharacterPresentationProfile,
} from '../constants/characterPresentation';
import {
  CHARACTER_SCALE_MAX,
  CHARACTER_SCALE_MIN,
  CHARACTER_SCALE_STEP,
  CHARACTER_TRANSLATE_Y_MAX,
  CHARACTER_TRANSLATE_Y_MIN,
  CHARACTER_TRANSLATE_Y_STEP,
  useCharacterPresentationOverride,
} from '../store/characterPresentationOverrides';
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
// CHARACTER_V71_PRESENTATION_PREVIEW
// CHARACTER_V72_DEVICE_CALIBRATION_SCREEN
// CHARACTER_V73_PLAYBACK_REPLAY_PREVIEW
// CHARACTER_V74_STANDARD_FACING_PREVIEW
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

  const [
    calibrating,
    setCalibrating,
  ] =
    useState(false);

  const [
    playbackKey,
    setPlaybackKey,
  ] =
    useState(0);

  const [
    previewFacing,
    setPreviewFacing,
  ] =
    useState<
      'left' |
      'right'
    >(
      'right'
    );

  const {
    override,
    adjustOverride,
    resetOverride,
  } =
    useCharacterPresentationOverride(
      characterId
    );

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

  const presentation =
    getCharacterPresentationProfile(
      characterId
    );

  const playbackMode =
    getCharacterPlaybackMode(
      action
    );

  const rawFrames =
    definition.frames[action].length;

  const resolvedFrames =
    getCharacterFrames(
      characterId,
      action
    ).length;

  const effectivePreviewScale =
    presentation.previewScale *
    override.scale;

  const previewSize =
    Math.max(
      1,
      Math.round(
        220 *
        effectivePreviewScale
      )
    );

  const effectivePreviewTranslateY =
    presentation.previewTranslateY +
    override.translateY;

  const previewScaleX =
    characterId === 'rooty'
      ? 1
      : resolveStandardCharacterScaleX(
          previewFacing
        );

  const isCurrent =
    ready &&
    characterId ===
      selectedCharacter;

  const canCalibrate =
    characterId !==
    'rooty';

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

  const adjust =
    async (
      scaleDelta: number,
      translateYDelta: number
    ) => {
      if (
        !canCalibrate ||
        calibrating
      ) {
        return;
      }

      setCalibrating(
        true
      );

      try {
        await adjustOverride(
          scaleDelta,
          translateYDelta
        );
      }
      finally {
        setCalibrating(
          false
        );
      }
    };

  const reset =
    async () => {
      if (
        !canCalibrate ||
        calibrating
      ) {
        return;
      }

      setCalibrating(
        true
      );

      try {
        await resetOverride();
      }
      finally {
        setCalibrating(
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
            Character V72
          </Text>

          <Text
            style={
              styles.sub
            }
          >
            {'\uCE90\uB9AD\uD130\uB97C \uC120\uD0DD\uD558\uACE0 \uD06C\uAE30\uC640 \uBC14\uB2E5 \uC704\uCE58\uB97C \uC2E4\uAE30\uAE30\uC5D0\uC11C \uB9DE\uCD94\uC138\uC694.'}
          </Text>

          {/* CHARACTER_V81_DEVICE_VALIDATION_ENTRY */}
          <Link
            href={
              '/character-device-validation' as never
            }
            asChild
          >
            <Pressable
              style={
                styles.diagnosticsButton
              }
            >
              <Text
                style={
                  styles.diagnosticsButtonText
                }
              >
                {'\uC2E4\uAE30\uAE30 \uC885\uD569 \uAC80\uC99D'}
              </Text>
            </Pressable>
          </Link>

          {/* CHARACTER_V77_DIAGNOSTICS_ENTRY */}
          <Link
            href={
              '/character-runtime-diagnostics' as never
            }
            asChild
          >
            <Pressable
              style={
                styles.diagnosticsButton
              }
            >
              <Text
                style={
                  styles.diagnosticsButtonText
                }
              >
                {'\uB7F0\uD0C0\uC784 \uC131\uACA9 \uC9C4\uB2E8'}
              </Text>
            </Pressable>
          </Link>

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
              playbackKey={
                playbackKey
              }
              playbackMode={
                playbackMode
              }
              size={
                previewSize
              }
              frameDurationMs={
                presentation.frameDurationMs[
                  action
                ]
              }
              style={{
                transform: [
                  {
                    translateY:
                      effectivePreviewTranslateY,
                  },
                  {
                    scaleX:
                      previewScaleX,
                  },
                ],
              }}
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
                styles.meta
              }
            >
              frame: {
                presentation.frameDurationMs[
                  action
                ]
              }ms
            </Text>

            <Text
              style={
                styles.meta
              }
            >
              playback: {
                playbackMode
              }
            </Text>

            <Pressable
              onPress={
                () => {
                  setPlaybackKey(
                    (current) =>
                      current + 1
                  );
                }
              }
              style={
                styles.replayButton
              }
            >
              <Text
                style={
                  styles.replayButtonText
                }
              >
                {'\uB2E4\uC2DC \uC7AC\uC0DD'}
              </Text>
            </Pressable>

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
                      ? '\uD604\uC7A5 \uC0AC\uC6A9 \uC911'
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

          <Text
            style={
              styles.section
            }
          >
            {'\uBC29\uD5A5 \uBBF8\uB9AC\uBCF4\uAE30'}
          </Text>

          {characterId !== 'rooty' ? (
            <View
              style={
                styles.row
              }
            >
              <Pressable
                onPress={
                  () =>
                    setPreviewFacing(
                      'left'
                    )
                }
                style={[
                  styles.choice,
                  previewFacing ===
                    'left' &&
                    styles.selected,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    previewFacing ===
                      'left' &&
                      styles.selectedText,
                  ]}
                >
                  {'\uC67C\uCABD'}
                </Text>
              </Pressable>

              <Pressable
                onPress={
                  () =>
                    setPreviewFacing(
                      'right'
                    )
                }
                style={[
                  styles.choice,
                  previewFacing ===
                    'right' &&
                    styles.selected,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    previewFacing ===
                      'right' &&
                      styles.selectedText,
                  ]}
                >
                  {'\uC624\uB978\uCABD'}
                </Text>
              </Pressable>
            </View>
          ) : (
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
                {'\uB8E8\uD2F0 Home\uC740 \uAE30\uC874 directional resolver\uB97C \uADF8\uB300\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.'}
              </Text>
            </View>
          )}

          <Text
            style={
              styles.section
            }
          >
            {'Home \uD06C\uAE30\u00B7\uBC14\uB2E5 \uBCF4\uC815'}
          </Text>

          {canCalibrate ? (
            <View
              style={
                styles.calibrationCard
              }
            >
              <Text
                style={
                  styles.calibrationValue
                }
              >
                {'\uD06C\uAE30: '}
                {
                  override.scale.toFixed(
                    2
                  )
                }
                {'  /  Y: '}
                {
                  override.translateY
                }
                px
              </Text>

              <Text
                style={
                  styles.calibrationHint
                }
              >
                {'Y\uAC00 \uC791\uC544\uC9C0\uBA74 \uC704\uB85C, \uCEE4\uC9C0\uBA74 \uC544\uB798\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4.'}
              </Text>

              <View
                style={
                  styles.calibrationRow
                }
              >
                <Pressable
                  disabled={
                    calibrating ||
                    override.scale <=
                      CHARACTER_SCALE_MIN
                  }
                  onPress={
                    () => {
                      void adjust(
                        -CHARACTER_SCALE_STEP,
                        0
                      );
                    }
                  }
                  style={[
                    styles.calibrationButton,
                    (
                      calibrating ||
                      override.scale <=
                        CHARACTER_SCALE_MIN
                    ) &&
                      styles.disabled,
                  ]}
                >
                  <Text
                    style={
                      styles.calibrationButtonText
                    }
                  >
                    {'\uD06C\uAE30 -'}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    calibrating ||
                    override.scale >=
                      CHARACTER_SCALE_MAX
                  }
                  onPress={
                    () => {
                      void adjust(
                        CHARACTER_SCALE_STEP,
                        0
                      );
                    }
                  }
                  style={[
                    styles.calibrationButton,
                    (
                      calibrating ||
                      override.scale >=
                        CHARACTER_SCALE_MAX
                    ) &&
                      styles.disabled,
                  ]}
                >
                  <Text
                    style={
                      styles.calibrationButtonText
                    }
                  >
                    {'\uD06C\uAE30 +'}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    calibrating ||
                    override.translateY <=
                      CHARACTER_TRANSLATE_Y_MIN
                  }
                  onPress={
                    () => {
                      void adjust(
                        0,
                        -CHARACTER_TRANSLATE_Y_STEP
                      );
                    }
                  }
                  style={[
                    styles.calibrationButton,
                    (
                      calibrating ||
                      override.translateY <=
                        CHARACTER_TRANSLATE_Y_MIN
                    ) &&
                      styles.disabled,
                  ]}
                >
                  <Text
                    style={
                      styles.calibrationButtonText
                    }
                  >
                    {'\uC704\uB85C'}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    calibrating ||
                    override.translateY >=
                      CHARACTER_TRANSLATE_Y_MAX
                  }
                  onPress={
                    () => {
                      void adjust(
                        0,
                        CHARACTER_TRANSLATE_Y_STEP
                      );
                    }
                  }
                  style={[
                    styles.calibrationButton,
                    (
                      calibrating ||
                      override.translateY >=
                        CHARACTER_TRANSLATE_Y_MAX
                    ) &&
                      styles.disabled,
                  ]}
                >
                  <Text
                    style={
                      styles.calibrationButtonText
                    }
                  >
                    {'\uC544\uB798\uB85C'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                disabled={
                  calibrating ||
                  (
                    override.scale ===
                      1 &&
                    override.translateY ===
                      0
                  )
                }
                onPress={
                  () => {
                    void reset();
                  }
                }
                style={[
                  styles.resetButton,
                  (
                    calibrating ||
                    (
                      override.scale ===
                        1 &&
                      override.translateY ===
                        0
                    )
                  ) &&
                    styles.disabled,
                ]}
              >
                <Text
                  style={
                    styles.resetButtonText
                  }
                >
                  {'\uBCF4\uC815\uAC12 \uCD08\uAE30\uD654'}
                </Text>
              </Pressable>

              <Text
                style={
                  styles.calibrationSaved
                }
              >
                {'\uBC84\uD2BC\uC744 \uB204\uB974\uBA74 \uC790\uB3D9 \uC800\uC7A5\uB418\uACE0 Home\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4.'}
              </Text>
            </View>
          ) : (
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
                {'\uB8E8\uD2F0\uB294 \uAE30\uC874 Legacy RootySprite\uC758 \uD06C\uAE30\u00B7\uBC29\uD5A5\u00B7fallback \uACBD\uB85C\uB97C \uBCF4\uD638\uD558\uAE30 \uC704\uD574 V72 \uBCF4\uC815 \uB300\uC0C1\uC5D0\uC11C \uC81C\uC678\uD569\uB2C8\uB2E4.'}
              </Text>
            </View>
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
              {'\uBAA8\uB8E8\u00B7\uBABD\uC2E4\u00B7\uB2E4\uBBF8\uB294 \uAC01\uAC01 \uB2E4\uB978 \uBCF4\uC815\uAC12\uC744 \uC800\uC7A5\uD569\uB2C8\uB2E4.'}
            </Text>

            <Text
              style={
                styles.noteText
              }
            >
              {'\uBCF4\uC815\uAC12\uC744 \uC800\uC7A5\uD55C \uB4A4 \uC571\uC744 \uB2E4\uC2DC \uCF1C\uB3C4 \uC720\uC9C0\uB429\uB2C8\uB2E4.'}
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
    diagnosticsButton: {
      alignSelf: 'flex-start',
      paddingVertical: 9,
      paddingHorizontal: 13,
      borderRadius: 11,
      backgroundColor: '#2F2B26',
    },
    diagnosticsButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
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
    replayButton: {
      marginTop: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#BEB2A3',
      backgroundColor: '#F8F4EE',
    },
    replayButtonText: {
      fontSize: 13,
      fontWeight: '800',
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
    calibrationCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      gap: 10,
    },
    calibrationValue: {
      fontSize: 15,
      fontWeight: '800',
      color: '#2F2B26',
    },
    calibrationHint: {
      fontSize: 12,
      color: '#746B61',
    },
    calibrationRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    calibrationButton: {
      minWidth: 78,
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#BEB2A3',
      backgroundColor: '#F8F4EE',
    },
    calibrationButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#4F473F',
    },
    resetButton: {
      alignSelf: 'flex-start',
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: '#2F2B26',
    },
    resetButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    calibrationSaved: {
      fontSize: 12,
      color: '#5F704F',
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
