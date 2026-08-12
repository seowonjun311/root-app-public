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
  getFloatingCharacterRuntimeHealth,
  getFloatingCharacterStatus,
  isFloatingCharacterSupported,
  openFloatingCharacterPermissionSettings,
  repairFloatingCharacterRuntime,
  resetFloatingCharacterPosition,
  setFloatingCharacterAutoMoveEnabled,
  setFloatingCharacterGoalSpeechEnabled,
  setFloatingCharacterQuietSchedule,
  setFloatingCharacterQuietUntil,
  setFloatingCharacterScale,
  showFloatingCharacterGoalSpeechNow,
  startFloatingCharacter,
  stopFloatingCharacter,
  updateFloatingCharacter,
  type FloatingCharacterRuntimeHealth,
  type RootFloatingCharacterStatus,
} from '../modules/root-floating-character';
import {
  useSelectedCharacter,
} from '../store/selectedCharacter';
import {
  getRootOnboardingData,
} from '../store/rootMemory';
import {
  syncFloatingCharacterGoals,
} from '../utils/floatingCharacterGoalSync';

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

function formatQuietMinute(
  minute: number
) {
  const safe =
    (
      Math.round(
        minute
      ) %
        1440 +
      1440
    ) %
    1440;

  const hour =
    Math.floor(
      safe /
        60
    );

  return `${String(hour).padStart(2, '0')}:00`;
}

function shiftQuietHour(
  minute: number,
  delta: number
) {
  const hour =
    Math.floor(
      minute /
        60
    );

  return (
    (
      hour +
        delta +
        24
    ) %
      24
  ) *
    60;
}

function formatRuntimeState(
  state: string
) {
  switch (state) {
    case 'off':
      return '사용자 OFF';
    case 'permission_missing':
      return '권한 필요';
    case 'stopped':
      return '서비스 복구 필요';
    case 'instance_missing':
      return '서비스 인스턴스 복구 필요';
    case 'home_owned':
      return '정상 · Home 소유';
    case 'screen_off':
      return '정상 · 화면 OFF';
    case 'visible':
      return '정상 · 표시 중';
    case 'overlay_missing':
      return '복구 필요 · 오버레이 누락';
    default:
      return state;
  }
}

function formatBehaviorMode(
  mode: string
) {
  switch (mode) {
    case 'idle':
      return '대기';
    case 'walk':
      return '걷기';
    case 'sit':
      return '앉기';
    case 'sleep':
      return '수면';
    case 'happy':
      return '기쁨';
    case 'touch':
      return '터치 반응';
    case 'stopped':
      return '중지';
    default:
      return mode;
  }
}

// CHARACTER_V101A_FLOATING_OVERLAY_SETTINGS
// CHARACTER_V101C_FLOATING_MOTION_SCALE_SETTINGS
// CHARACTER_V101E_GOAL_SPEECH_INTERACTION_SETTINGS
// CHARACTER_V101I_QUIET_SLEEP_SETTINGS
// CHARACTER_V101O_RUNTIME_HEALTH_SETTINGS
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
      goalSpeechEnabled:
        true,
      pendingGoalCount:
        0,
      quietScheduleEnabled:
        true,
      quietStartMinute:
        23 * 60,
      quietEndMinute:
        7 * 60,
      quietStopAutoMove:
        true,
      quietUntilAt:
        0,
      quietActive:
        false,
    });

  const [
    runtimeHealth,
    setRuntimeHealth,
  ] =
    useState<
      FloatingCharacterRuntimeHealth
    >({
      userEnabled: false,
      permissionGranted: false,
      serviceRunning: false,
      instanceReady: false,
      overlayAttached: false,
      homeHandoffActive: false,
      screenInteractive: true,
      runtimeState: 'stopped',
      behaviorMode: 'stopped',
      characterId: 'rooty',
      x: 0,
      y: 0,
      displayWidthPx: 0,
      displayHeightPx: 0,
      positionSaved: false,
      scale: 1,
      autoMoveEnabled: true,
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
          await syncFloatingCharacterGoals(
            getRootOnboardingData()
              ?.actionGoals ??
              []
          );

          const [
            next,
            nextRuntimeHealth,
          ] =
            await Promise.all([
              getFloatingCharacterStatus(),
              getFloatingCharacterRuntimeHealth(),
            ]);

          setStatus(
            next
          );
          setRuntimeHealth(
            nextRuntimeHealth
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

  const toggleGoalSpeech =
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
          goalSpeechEnabled:
            enabled,
        })
      );

      try {
        await setFloatingCharacterGoalSpeechEnabled(
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

  const updateQuietSchedule =
    async (
      patch:
        Partial<{
          enabled: boolean;
          startMinute: number;
          endMinute: number;
          stopAutoMove: boolean;
        }>
    ) => {
      const enabled =
        patch.enabled ??
        status.quietScheduleEnabled;

      const startMinute =
        patch.startMinute ??
        status.quietStartMinute;

      const endMinute =
        patch.endMinute ??
        status.quietEndMinute;

      const stopAutoMove =
        patch.stopAutoMove ??
        status.quietStopAutoMove;

      setBusy(
        true
      );

      try {
        await setFloatingCharacterQuietSchedule(
          enabled,
          startMinute,
          endMinute,
          stopAutoMove
        );
        await refresh();
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const startQuietFor =
    async (
      minutes:
        number
    ) => {
      setBusy(
        true
      );

      try {
        await setFloatingCharacterQuietUntil(
          Date.now() +
            minutes *
              60 *
              1000
        );
        await refresh();
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const clearTemporaryQuiet =
    async () => {
      setBusy(
        true
      );

      try {
        await setFloatingCharacterQuietUntil(
          0
        );
        await refresh();
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const testGoalSpeech =
    async () => {
      if (
        !status.running
      ) {
        Alert.alert(
          '플로팅 캐릭터를 먼저 켜주세요',
          '행동목표 말풍선은 화면 위 캐릭터가 켜져 있을 때 확인할 수 있어요.'
        );
        return;
      }

      setBusy(
        true
      );

      try {
        await syncFloatingCharacterGoals(
          getRootOnboardingData()
            ?.actionGoals ??
            []
        );

        await showFloatingCharacterGoalSpeechNow();
        await refresh();
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const repairRuntime =
    async () => {
      setBusy(
        true
      );

      try {
        const result =
          await repairFloatingCharacterRuntime();

        await refresh();

        if (
          result ===
          'disabled'
        ) {
          Alert.alert(
            '플로팅 캐릭터가 꺼져 있어요',
            '사용자 OFF 상태는 자동으로 바꾸지 않습니다. 아래의 켜기 버튼으로 직접 시작해 주세요.'
          );
        }
        else if (
          result ===
          'permission_missing'
        ) {
          Alert.alert(
            '화면 위 표시 권한이 필요해요',
            '권한을 허용한 뒤 다시 복구를 눌러 주세요.'
          );
        }
        else if (
          result ===
          'home_owned'
        ) {
          Alert.alert(
            'Home이 캐릭터를 표시 중이에요',
            'Home handoff 중에는 시스템 오버레이를 겹쳐 띄우지 않습니다.'
          );
        }
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const resetPositionNow =
    async () => {
      setBusy(
        true
      );

      try {
        await resetFloatingCharacterPosition();
        await refresh();
      }
      finally {
        setBusy(
          false
        );
      }
    };

  const confirmResetPosition =
    () => {
      Alert.alert(
        '플로팅 위치를 초기화할까요?',
        '사용자 ON/OFF와 크기 설정은 유지하고 위치만 기본값으로 되돌립니다.',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '위치 초기화',
            onPress: () => {
              void resetPositionNow();
            },
          },
        ]
      );
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
            캐릭터 크기를 바꿀 수 있습니다. 짧게 누르면 캐릭터가 반응하고,
            길게 누르면 캐릭터 끄기·ROOT 가기 메뉴가 열립니다.
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
          <Text
            style={
              styles.sectionTitle
            }
          >
            런타임 진단
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>전체 상태</Text>
            <Text style={styles.statusValue}>
              {formatRuntimeState(runtimeHealth.runtimeState)}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>사용자 설정</Text>
            <Text style={styles.statusValue}>
              {runtimeHealth.userEnabled ? '켜짐' : '꺼짐'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Foreground service</Text>
            <Text style={styles.statusValue}>
              {runtimeHealth.serviceRunning ? '실행' : '중지'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>오버레이 뷰</Text>
            <Text style={styles.statusValue}>
              {runtimeHealth.overlayAttached ? '부착됨' : '분리됨'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Home handoff</Text>
            <Text style={styles.statusValue}>
              {runtimeHealth.homeHandoffActive ? '활성' : '해제'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>화면 상태</Text>
            <Text style={styles.statusValue}>
              {runtimeHealth.screenInteractive ? 'ON' : 'OFF'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>현재 행동</Text>
            <Text style={styles.statusValue}>
              {formatBehaviorMode(runtimeHealth.behaviorMode)}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>플로팅 위치</Text>
            <Text style={styles.statusValue}>
              {runtimeHealth.x}, {runtimeHealth.y}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>화면 크기</Text>
            <Text style={styles.statusValue}>
              {runtimeHealth.displayWidthPx} × {runtimeHealth.displayHeightPx}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>저장 스케일</Text>
            <Text style={styles.statusValue}>
              {Math.round(runtimeHealth.scale * 100)}%
            </Text>
          </View>

          <Pressable
            disabled={busy}
            onPress={() => {
              void refresh();
            }}
            style={[
              styles.secondaryButton,
              { marginTop: 12 },
              busy && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              상태 새로고침
            </Text>
          </Pressable>

          <Pressable
            disabled={busy || !supported}
            onPress={() => {
              void repairRuntime();
            }}
            style={[
              styles.secondaryButton,
              { marginTop: 8 },
              (busy || !supported) && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              플로팅 복구
            </Text>
          </Pressable>

          <Pressable
            disabled={busy || !supported}
            onPress={confirmResetPosition}
            style={[
              styles.secondaryButton,
              { marginTop: 8 },
              (busy || !supported) && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              위치 초기화
            </Text>
          </Pressable>

          <Text style={styles.helperText}>
            복구는 사용자 ON/OFF를 바꾸지 않으며, Home이 캐릭터를 소유한 동안에는 오버레이를 겹쳐 띄우지 않습니다.
          </Text>
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
                목표·상태 말풍선
                {/* CHARACTER_V101H_TIME_STATE_SETTINGS_COPY */}
                {/* V101E compatibility label: 행동목표 말해주기 */}
              </Text>

              <Text
                style={
                  styles.controlDescription
                }
              >
                남은 행동목표와 시간대·에너지·기분 상태를 캐릭터가 쉬는 동안 가끔 말해줍니다.
              </Text>
            </View>

            <Switch
              disabled={
                busy ||
                !supported
              }
              value={
                status.goalSpeechEnabled
              }
              onValueChange={
                (
                  enabled
                ) => {
                  void toggleGoalSpeech(
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
            현재 말할 수 있는 미완료 행동목표 {
              status.pendingGoalCount
            }개 · 같은 목표·시간대 반응은 반복을 줄이고, 늦은 밤에는 독촉을 부드럽게 합니다.
          </Text>

          <Pressable
            disabled={
              busy ||
              !supported ||
              !status.running ||
              !status.goalSpeechEnabled
            }
            onPress={
              testGoalSpeech
            }
            style={[
              styles.secondaryButton,
              styles.goalSpeechTestButton,
              (
                busy ||
                !supported ||
                !status.running ||
                !status.goalSpeechEnabled ||
                status.quietActive
              ) &&
                styles.disabledButton,
            ]}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              지금 말해보기
            </Text>
          </Pressable>
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
                방해 금지 · 수면 시간
              </Text>

              <Text
                style={
                  styles.controlDescription
                }
              >
                설정 시간에는 자동 말풍선을 멈춥니다. 빠른 조용히는 말풍선만 잠시 쉬고 캐릭터 이동은 유지합니다.
              </Text>
            </View>

            <Switch
              disabled={
                busy ||
                !supported
              }
              value={
                status.quietScheduleEnabled
              }
              onValueChange={
                (
                  enabled
                ) => {
                  void updateQuietSchedule({
                    enabled,
                  });
                }
              }
            />
          </View>

          <Text
            style={
              styles.helperText
            }
          >
            현재 상태: {
              status.quietActive
                ? '조용히 모드'
                : '일반 모드'
            } · 기본 23:00~07:00
          </Text>

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
                () => {
                  void updateQuietSchedule({
                    startMinute:
                      shiftQuietHour(
                        status.quietStartMinute,
                        -1
                      ),
                  });
                }
              }
              style={
                styles.scaleStepButton
              }
            >
              <Text
                style={
                  styles.scaleStepText
                }
              >
                −
              </Text>
            </Pressable>

            <Text
              style={[
                styles.statusValue,
                {
                  flex: 1,
                  textAlign: 'center',
                },
              ]}
            >
              시작 {
                formatQuietMinute(
                  status.quietStartMinute
                )
              }
            </Text>

            <Pressable
              disabled={
                busy
              }
              onPress={
                () => {
                  void updateQuietSchedule({
                    startMinute:
                      shiftQuietHour(
                        status.quietStartMinute,
                        1
                      ),
                  });
                }
              }
              style={
                styles.scaleStepButton
              }
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
              styles.scaleControlRow
            }
          >
            <Pressable
              disabled={
                busy
              }
              onPress={
                () => {
                  void updateQuietSchedule({
                    endMinute:
                      shiftQuietHour(
                        status.quietEndMinute,
                        -1
                      ),
                  });
                }
              }
              style={
                styles.scaleStepButton
              }
            >
              <Text
                style={
                  styles.scaleStepText
                }
              >
                −
              </Text>
            </Pressable>

            <Text
              style={[
                styles.statusValue,
                {
                  flex: 1,
                  textAlign: 'center',
                },
              ]}
            >
              종료 {
                formatQuietMinute(
                  status.quietEndMinute
                )
              }
            </Text>

            <Pressable
              disabled={
                busy
              }
              onPress={
                () => {
                  void updateQuietSchedule({
                    endMinute:
                      shiftQuietHour(
                        status.quietEndMinute,
                        1
                      ),
                  });
                }
              }
              style={
                styles.scaleStepButton
              }
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
            style={[
              styles.controlHeader,
              {
                marginTop: 14,
              },
            ]}
          >
            <View
              style={
                styles.controlCopy
              }
            >
              <Text
                style={
                  styles.statusLabel
                }
              >
                수면 시간 자동 이동 멈춤
              </Text>
              <Text
                style={
                  styles.controlDescription
                }
              >
                저장된 자동 이동 ON/OFF 값은 바꾸지 않고 수면 시간에만 잠시 멈춥니다.
              </Text>
            </View>

            <Switch
              disabled={
                busy ||
                !supported
              }
              value={
                status.quietStopAutoMove
              }
              onValueChange={
                (
                  stopAutoMove
                ) => {
                  void updateQuietSchedule({
                    stopAutoMove,
                  });
                }
              }
            />
          </View>

          <Text
            style={[
              styles.statusLabel,
              {
                marginTop: 16,
                marginBottom: 8,
              },
            ]}
          >
            빠른 조용히
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: 8,
            }}
          >
            {
              [
                [30, '30분'],
                [60, '1시간'],
                [120, '2시간'],
              ].map(
                (
                  [
                    minutes,
                    label,
                  ]
                ) => (
                  <Pressable
                    key={
                      String(
                        minutes
                      )
                    }
                    disabled={
                      busy ||
                      !supported
                    }
                    onPress={
                      () => {
                        void startQuietFor(
                          Number(
                            minutes
                          )
                        );
                      }
                    }
                    style={[
                      styles.secondaryButton,
                      {
                        flex: 1,
                        paddingVertical: 10,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      {
                        label
                      }
                    </Text>
                  </Pressable>
                )
              )
            }
          </View>

          {
            status.quietUntilAt >
              Date.now() && (
              <Pressable
                disabled={
                  busy
                }
                onPress={
                  () => {
                    void clearTemporaryQuiet();
                  }
                }
                style={[
                  styles.secondaryButton,
                  {
                    marginTop: 8,
                  },
                ]}
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  빠른 조용히 해제
                </Text>
              </Pressable>
            )
          }

          <Text
            style={
              styles.helperText
            }
          >
            수면 시간에는 V101J sleep 애니메이션으로 조용히 쉬며, 빠른 조용히는 자동 말풍선을 억제합니다.
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
            자동 이동·크기·행동목표 말풍선 설정은 Android 네이티브에 저장됩니다.
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
    goalSpeechTestButton: {
      marginTop: 12,
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
