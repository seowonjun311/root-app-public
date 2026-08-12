import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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

// CHARACTER_V101A_FLOATING_OVERLAY_SETTINGS
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
    });

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
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

  const supported =
    isFloatingCharacterSupported();

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
            켜기를 누르면 현재 선택된 캐릭터가 Android 화면 위에 떠 있습니다.
            캐릭터를 드래그해 위치를 옮기고, 가볍게 누르면 ROOT로 돌아옵니다.
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
            이 기능은 Android의 시스템 오버레이와 포그라운드 서비스를 사용합니다.
            알림 영역에 ROOT 실행 알림이 유지됩니다.
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
