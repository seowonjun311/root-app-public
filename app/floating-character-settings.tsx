import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  router,
} from 'expo-router';

import {
  canDrawFloatingCharacter,
  getFloatingCharacterStatus,
  isFloatingCharacterSupported,
  openFloatingCharacterPermissionSettings,
  setFloatingCharacterAutoMoveEnabled,
  setFloatingCharacterScale,
  startFloatingCharacter,
  stopFloatingCharacter,
  updateFloatingCharacter,
  type RootFloatingCharacterStatus,
} from '../modules/root-floating-character';
import {
  useSelectedCharacter,
} from '../store/selectedCharacter';

const CHARACTER_LABEL = {
  rooty:
    '루티',
  moru:
    '모루',
  mongsil:
    '몽실',
  dami:
    '다미',
  pio:
    '피오',
  nuri:
    '누리',
  tori:
    '토리',
} as const;

const MIN_SCALE =
  0.6;
const MAX_SCALE =
  1.6;
const SCALE_RANGE =
  MAX_SCALE -
  MIN_SCALE;

function clampScale(
  value: number
) {
  return Math.max(
    MIN_SCALE,
    Math.min(
      MAX_SCALE,
      value
    )
  );
}

function roundScale(
  value: number
) {
  return Math.round(
    clampScale(
      value
    ) *
      20
  ) /
    20;
}

// CHARACTER_V101A_FLOATING_OVERLAY_SETTINGS
// CHARACTER_V101C_FLOATING_MOTION_SCALE_SETTINGS
export default function FloatingCharacterSettingsScreen() {
  const {
    selectedCharacter,
    ready:
      selectedReady,
  } =
    useSelectedCharacter();

  const [
    status,
    setStatus,
  ] =
    useState<
      RootFloatingCharacterStatus
    >({
      supported:
        false,
      permissionGranted:
        false,
      running:
        false,
      characterId:
        null,
      scale:
        1,
      autoMoveEnabled:
        true,
    });

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    scaleDraft,
    setScaleDraft,
  ] =
    useState(
      1
    );

  const scaleDraftRef =
    useRef(
      1
    );

  const [
    scaleTrackWidth,
    setScaleTrackWidth,
  ] =
    useState(
      0
    );

  const refresh =
    useCallback(
      async () => {
        try {
          const next =
            await getFloatingCharacterStatus();

          setStatus(
            next
          );
        }
        catch {
        }
      },
      []
    );

  useEffect(
    () => {
      void refresh();

      const subscription =
        AppState.addEventListener(
          'change',
          (
            state
          ) => {
            if (
              state ===
              'active'
            ) {
              void refresh();
            }
          }
        );

      return () => {
        subscription.remove();
      };
    },
    [
      refresh,
    ]
  );

  useEffect(
    () => {
      const next =
        roundScale(
          status.scale
        );

      setScaleDraft(
        next
      );
      scaleDraftRef.current =
        next;
    },
    [
      status.scale,
    ]
  );

  useEffect(
    () => {
      if (
        !selectedReady ||
        !status.running
      ) {
        return;
      }

      void updateFloatingCharacter(
        selectedCharacter
      )
        .then(
          refresh
        )
        .catch(
          () => {}
        );
    },
    [
      refresh,
      selectedCharacter,
      selectedReady,
      status.running,
    ]
  );

  const openPermission =
    async () => {
      if (
        Platform.OS !==
        'android'
      ) {
        return;
      }

      await openFloatingCharacterPermissionSettings();
    };

  const startOverlay =
    async () => {
      if (
        !selectedReady
      ) {
        return;
      }

      setBusy(
        true
      );

      try {
        const granted =
          await canDrawFloatingCharacter();

        if (
          !granted
        ) {
          Alert.alert(
            '화면 위 표시 권한이 필요해요',
            '설정에서 ROOT의 "다른 앱 위에 표시" 권한을 켠 뒤 이 화면으로 돌아와 주세요.',
            [
              {
                text:
                  '취소',
                style:
                  'cancel',
              },
              {
                text:
                  '설정 열기',
                onPress:
                  () => {
                    void openPermission();
                  },
              },
            ]
          );

          return;
        }

        const started =
          await startFloatingCharacter(
            selectedCharacter
          );

        await refresh();

        if (
          !started
        ) {
          Alert.alert(
            '캐릭터를 시작하지 못했어요',
            '화면 위 표시 권한을 다시 확인해 주세요.'
          );
        }
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const stopOverlay =
    async () => {
      setBusy(
        true
      );

      try {
        await stopFloatingCharacter();
        await refresh();
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const commitScale =
    useCallback(
      async (
        requested:
          number
      ) => {
        const next =
          roundScale(
            requested
          );

        setScaleDraft(
          next
        );
        scaleDraftRef.current =
          next;

        setBusy(
          true
        );

        try {
          await setFloatingCharacterScale(
            next
          );
          await refresh();
        }
        finally {
          setBusy(
            false
          );
        }
      },
      [
        refresh,
      ]
    );

  const applyScaleFromTrackX =
    useCallback(
      (
        x:
          number
      ) => {
        if (
          scaleTrackWidth <=
          0
        ) {
          return;
        }

        const ratio =
          Math.max(
            0,
            Math.min(
              1,
              x /
                scaleTrackWidth
            )
          );

        const next =
          roundScale(
            MIN_SCALE +
              ratio *
                SCALE_RANGE
          );

        setScaleDraft(
          next
        );
        scaleDraftRef.current =
          next;
      },
      [
        scaleTrackWidth,
      ]
    );

  const scalePanResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () =>
              true,
          onMoveShouldSetPanResponder:
            () =>
              true,
          onPanResponderGrant:
            (
              event
            ) => {
              applyScaleFromTrackX(
                event.nativeEvent.locationX
              );
            },
          onPanResponderMove:
            (
              event
            ) => {
              applyScaleFromTrackX(
                event.nativeEvent.locationX
              );
            },
          onPanResponderRelease:
            () => {
              void commitScale(
                scaleDraftRef.current
              );
            },
          onPanResponderTerminate:
            () => {
              void commitScale(
                scaleDraftRef.current
              );
            },
        }),
      [
        applyScaleFromTrackX,
        commitScale,
      ]
    );

  const adjustScale =
    (
      delta:
        number
    ) => {
      const next =
        roundScale(
          scaleDraftRef.current +
            delta
        );

      void commitScale(
        next
      );
    };

  const toggleAutoMove =
    async (
      enabled:
        boolean
    ) => {
      setBusy(
        true
      );

      setStatus(
        (
          current
        ) => ({
          ...current,
          autoMoveEnabled:
            enabled,
        })
      );

      try {
        await setFloatingCharacterAutoMoveEnabled(
          enabled
        );
        await refresh();
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const supported =
    isFloatingCharacterSupported();

  const scaleProgress =
    (
      scaleDraft -
        MIN_SCALE
    ) /
    SCALE_RANGE;

  const scaleFillWidth =
    scaleTrackWidth *
    scaleProgress;

  const scaleThumbLeft =
    scaleTrackWidth *
    scaleProgress;

  return (
    <View
      style={
        styles.screen
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          onPress={
            () =>
              router.back()
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            뒤로
          </Text>
        </Pressable>

        <View
          style={
            styles.headerCopy
          }
        >
          <Text
            style={
              styles.title
            }
          >
            화면 위 캐릭터
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            ROOT를 닫아도 캐릭터를 다른 앱 위에 표시
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardEyebrow
            }
          >
            SELECTED CHARACTER
          </Text>

          <Text
            style={
              styles.characterName
            }
          >
            {
              CHARACTER_LABEL[
                selectedCharacter
              ]
            }
          </Text>

          <Text
            style={
              styles.description
            }
          >
            한 손가락으로 드래그해 위치를 옮기고, 두 손가락을 벌리거나 오므려
            캐릭터 크기를 바꿀 수 있습니다. 가볍게 누르면 ROOT로 돌아옵니다.
          </Text>
        </View>

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            상태
          </Text>

          <View
            style={
              styles.statusRow
            }
          >
            <Text
              style={
                styles.statusLabel
              }
            >
              Android 지원
            </Text>

            <Text
              style={
                styles.statusValue
              }
            >
              {
                supported
                  ? '지원'
                  : '미지원'
              }
            </Text>
          </View>

          <View
            style={
              styles.statusRow
            }
          >
            <Text
              style={
                styles.statusLabel
              }
            >
              화면 위 표시 권한
            </Text>

            <Text
              style={
                styles.statusValue
              }
            >
              {
                status.permissionGranted
                  ? '허용됨'
                  : '필요'
              }
            </Text>
          </View>

          <View
            style={
              styles.statusRow
            }
          >
            <Text
              style={
                styles.statusLabel
              }
            >
              플로팅 캐릭터
            </Text>

            <Text
              style={
                styles.statusValue
              }
            >
              {
                status.running
                  ? '켜짐'
                  : '꺼짐'
              }
            </Text>
          </View>
        </View>

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.controlHeader
            }
          >
            <View
              style={
                styles.controlCopy
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                자동 이동
              </Text>

              <Text
                style={
                  styles.controlDescription
                }
              >
                캐릭터가 다른 앱 위에서 잠깐 쉬었다가 천천히 주변을 돌아다닙니다.
              </Text>
            </View>

            <Switch
              disabled={
                busy ||
                !supported
              }
              value={
                status.autoMoveEnabled
              }
              onValueChange={
                (
                  enabled
                ) => {
                  void toggleAutoMove(
                    enabled
                  );
                }
              }
            />
          </View>

          <Text
            style={
              styles.helperText
            }
          >
            캐릭터를 손으로 잡으면 자동 이동이 즉시 멈추고, 손을 뗀 뒤 약 4초 후 다시 움직입니다.
          </Text>
        </View>

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.scaleHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                캐릭터 크기
              </Text>

              <Text
                style={
                  styles.controlDescription
                }
              >
                설정 또는 화면 위 두 손가락 제스처로 조절
              </Text>
            </View>

            <Text
              style={
                styles.scalePercent
              }
            >
              {
                Math.round(
                  scaleDraft *
                    100
                )
              }%
            </Text>
          </View>

          <View
            style={
              styles.scaleControlRow
            }
          >
            <Pressable
              disabled={
                busy
              }
              onPress={
                () =>
                  adjustScale(
                    -0.1
                  )
              }
              style={[
                styles.scaleStepButton,
                busy &&
                  styles.disabledButton,
              ]}
            >
              <Text
                style={
                  styles.scaleStepText
                }
              >
                −
              </Text>
            </Pressable>

            <View
              onLayout={
                (
                  event
                ) => {
                  setScaleTrackWidth(
                    event.nativeEvent.layout.width
                  );
                }
              }
              style={
                styles.scaleTrackTouch
              }
              {...scalePanResponder.panHandlers}
            >
              <View
                style={
                  styles.scaleTrack
                }
              >
                <View
                  style={[
                    styles.scaleTrackFill,
                    {
                      width:
                        scaleFillWidth,
                    },
                  ]}
                />

                <View
                  style={[
                    styles.scaleThumb,
                    {
                      left:
                        scaleThumbLeft,
                    },
                  ]}
                />
              </View>
            </View>

            <Pressable
              disabled={
                busy
              }
              onPress={
                () =>
                  adjustScale(
                    0.1
                  )
              }
              style={[
                styles.scaleStepButton,
                busy &&
                  styles.disabledButton,
              ]}
            >
              <Text
                style={
                  styles.scaleStepText
                }
              >
                +
              </Text>
            </Pressable>
          </View>

          <View
            style={
              styles.scaleLabels
            }
          >
            <Text
              style={
                styles.scaleLabel
              }
            >
              60%
            </Text>

            <Text
              style={
                styles.scaleLabel
              }
            >
              160%
            </Text>
          </View>
        </View>

        <Pressable
          disabled={
            busy ||
            !supported
          }
          onPress={
            openPermission
          }
          style={[
            styles.secondaryButton,
            (
              busy ||
              !supported
            ) &&
              styles.disabledButton,
          ]}
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            화면 위 표시 권한 열기
          </Text>
        </Pressable>

        {
          status.running
            ? (
                <Pressable
                  disabled={
                    busy
                  }
                  onPress={
                    stopOverlay
                  }
                  style={[
                    styles.stopButton,
                    busy &&
                      styles.disabledButton,
                  ]}
                >
                  <Text
                    style={
                      styles.stopButtonText
                    }
                  >
                    화면 위 캐릭터 끄기
                  </Text>
                </Pressable>
              )
            : (
                <Pressable
                  disabled={
                    busy ||
                    !supported
                  }
                  onPress={
                    startOverlay
                  }
                  style={[
                    styles.primaryButton,
                    (
                      busy ||
                      !supported
                    ) &&
                      styles.disabledButton,
                  ]}
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    현재 캐릭터 화면 위에 켜기
                  </Text>
                </Pressable>
              )
        }

        <View
          style={
            styles.notice
          }
        >
          <Text
            style={
              styles.noticeTitle
            }
          >
            Android 전용
          </Text>

          <Text
            style={
              styles.noticeText
            }
          >
            자동 이동과 크기 값은 Android 네이티브 설정에 저장됩니다.
            ROOT를 닫거나 다른 앱을 사용해도 현재 설정을 유지합니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#F6F2EC',
    },
    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 12,
      paddingTop: 18,
      paddingHorizontal:
        18,
      paddingBottom: 12,
    },
    backButton: {
      paddingHorizontal:
        12,
      paddingVertical:
        8,
      borderRadius:
        12,
      backgroundColor:
        '#FFFFFF',
    },
    backText: {
      fontSize: 12,
      fontWeight:
        '800',
      color:
        '#453D36',
    },
    headerCopy: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight:
        '900',
      color:
        '#302A25',
    },
    subtitle: {
      marginTop: 2,
      fontSize: 11,
      color:
        '#7B7067',
    },
    content: {
      paddingHorizontal:
        18,
      paddingBottom: 40,
      gap: 12,
    },
    card: {
      padding: 16,
      borderRadius:
        18,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E5DDD4',
    },
    cardEyebrow: {
      fontSize: 10,
      fontWeight:
        '900',
      letterSpacing: 1,
      color:
        '#80736A',
    },
    characterName: {
      marginTop: 4,
      fontSize: 25,
      fontWeight:
        '900',
      color:
        '#342D27',
    },
    description: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color:
        '#766B62',
    },
    sectionTitle: {
      marginBottom: 6,
      fontSize: 14,
      fontWeight:
        '900',
      color:
        '#3D352F',
    },
    statusRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      paddingVertical:
        8,
      borderTopWidth: 1,
      borderTopColor:
        '#F0EAE4',
    },
    statusLabel: {
      fontSize: 12,
      fontWeight:
        '700',
      color:
        '#74695F',
    },
    statusValue: {
      fontSize: 12,
      fontWeight:
        '900',
      color:
        '#3D352F',
    },
    controlHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 14,
    },
    controlCopy: {
      flex: 1,
    },
    controlDescription: {
      fontSize: 11,
      lineHeight: 16,
      color:
        '#796D64',
    },
    helperText: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor:
        '#F0EAE4',
      fontSize: 10,
      lineHeight: 15,
      color:
        '#8A7D73',
    },
    scaleHeader: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      gap: 12,
    },
    scalePercent: {
      fontSize: 18,
      fontWeight:
        '900',
      color:
        '#3D352F',
    },
    scaleControlRow: {
      marginTop: 16,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 10,
    },
    scaleStepButton: {
      width: 38,
      height: 38,
      alignItems:
        'center',
      justifyContent:
        'center',
      borderRadius:
        12,
      borderWidth: 1,
      borderColor:
        '#D8CEC5',
      backgroundColor:
        '#F9F6F2',
    },
    scaleStepText: {
      fontSize: 22,
      fontWeight:
        '800',
      color:
        '#4D433B',
    },
    scaleTrackTouch: {
      flex: 1,
      height: 38,
      justifyContent:
        'center',
    },
    scaleTrack: {
      height: 8,
      borderRadius:
        999,
      backgroundColor:
        '#E5DED6',
      overflow:
        'visible',
    },
    scaleTrackFill: {
      position:
        'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius:
        999,
      backgroundColor:
        '#68594E',
    },
    scaleThumb: {
      position:
        'absolute',
      top: -7,
      width: 22,
      height: 22,
      marginLeft: -11,
      borderRadius:
        11,
      backgroundColor:
        '#403831',
      borderWidth: 3,
      borderColor:
        '#FFFFFF',
    },
    scaleLabels: {
      marginTop: 2,
      marginHorizontal:
        48,
      flexDirection:
        'row',
      justifyContent:
        'space-between',
    },
    scaleLabel: {
      fontSize: 9,
      fontWeight:
        '700',
      color:
        '#9A8D83',
    },
    primaryButton: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical:
        15,
      borderRadius:
        16,
      backgroundColor:
        '#403831',
    },
    primaryButtonText: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#FFFFFF',
    },
    secondaryButton: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical:
        14,
      borderRadius:
        16,
      borderWidth: 1,
      borderColor:
        '#D8CEC5',
      backgroundColor:
        '#FFFFFF',
    },
    secondaryButtonText: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#554B43',
    },
    stopButton: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical:
        15,
      borderRadius:
        16,
      backgroundColor:
        '#8B5149',
    },
    stopButtonText: {
      fontSize: 13,
      fontWeight:
        '900',
      color:
        '#FFFFFF',
    },
    disabledButton: {
      opacity: 0.45,
    },
    notice: {
      padding: 14,
      borderRadius:
        16,
      backgroundColor:
        '#EEE8E1',
    },
    noticeTitle: {
      fontSize: 11,
      fontWeight:
        '900',
      color:
        '#5F544C',
    },
    noticeText: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 16,
      color:
        '#7B7067',
    },
  });
