import {
  getApp,
} from '@react-native-firebase/app';

import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from '@react-native-firebase/auth';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  Platform,
  View,
} from 'react-native';

import {
  loadRootOnboardingData,
} from '../store/rootMemory';

import {
  syncSavedCafeEntries,
} from '../store/savedCafeLocal';

import {
  useRootTheme,
} from '../store/rootTheme';

export default function RootLayout() {
  const {
    themeMode,
    theme,
  } = useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  /*
   * RootLayout에서는
   * Firebase 인증 상태만 확인합니다.
   *
   * Firestore 사용자 데이터 복원과 병합은
   * login.tsx에서 한 번만 담당합니다.
   *
   * 두 파일이 동시에 users/{uid}를 읽으면서
   * 데이터 복원이 경쟁하는 것을 방지합니다.
   */
  useEffect(() => {
    let isMounted = true;

    let handlingAuthState =
      false;

    const authInstance =
  getAuth(
    getApp()
  );

const unsubscribe =
  onAuthStateChanged(
    authInstance,
    async (
      user
    ) => {
          if (
            !isMounted ||
            handlingAuthState
          ) {
            return;
          }

          handlingAuthState =
            true;

          try {
            const localData =
              await loadRootOnboardingData();

            if (!isMounted) {
              return;
            }

            const currentAuthUid =
              user?.uid
                ? String(
                    user.uid
                  )
                : null;

            const localRootUid =
              localData?.uid
                ? String(
                    localData.uid
                  )
                : null;

            console.log(
              'ROOT AUTH STATE CHECK',
              {
                currentAuthUid,
                localRootUid,

                loginType:
                  localData
                    ?.loginType ??
                  null,

                forceLogout:
                  localData
                    ?.forceLogout ===
                  true,
              }
            );

            /*
             * 강제 로그아웃 상태가 아니라면
             * RootLayout에서 할 작업은 없습니다.
             *
             * 서버 데이터 복원은
             * login.tsx가 담당합니다.
             */
            if (
              localData
                ?.forceLogout !==
              true
            ) {
              if (currentAuthUid) {
                void syncSavedCafeEntries({
                  reason:
                    'root-auth-state',
                }).catch(
                  (
                    error: any,
                  ) => {
                    console.log(
                      'ROOT SAVED CAFE SYNC ERROR',
                      {
                        uid:
                          currentAuthUid,
                        code:
                          error?.code ??
                          null,
                        message:
                          error?.message ??
                          String(error),
                      },
                    );
                  },
                );
              }

              return;
            }

            const forceLogoutOwnerUid =
              localRootUid;

            /*
             * 강제 로그아웃을 설정한 계정과
             * 현재 Firebase 인증 계정이
             * 같은 경우에만 로그아웃합니다.
             */
            if (
              user &&
              forceLogoutOwnerUid &&
              forceLogoutOwnerUid ===
                currentAuthUid
            ) {
              console.log(
                'ROOT FORCE LOGOUT EXECUTED',
                {
                  uid:
                    currentAuthUid,
                }
              );

              await signOut(
  authInstance
);

              return;
            }

            /*
             * 다른 Google 계정으로
             * 로그인한 상태라면 이전 계정의
             * forceLogout을 적용하지 않습니다.
             *
             * 실제 forceLogout 해제는
             * login.tsx의 Google 로그인 과정에서
             * 처리합니다.
             */
            console.log(
              'ROOT STALE FORCE LOGOUT IGNORED',
              {
                forceLogoutOwnerUid,
                currentAuthUid,
              }
            );
          } catch (
            error: any
          ) {
            console.log(
              'ROOT AUTH STATE ERROR',
              {
                code:
                  error?.code ??
                  null,

                message:
                  error?.message ??
                  String(
                    error
                  ),
              }
            );
          } finally {
            handlingAuthState =
              false;
          }
        }
      );

    return () => {
      isMounted = false;

      unsubscribe();
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,

        backgroundColor:
          theme.background,
      }}
    >
      <StatusBar
        style={
          isCityBlack
            ? 'light'
            : 'dark'
        }
        backgroundColor={
          theme.background
        }
        translucent={false}
      />

      <Stack
        screenOptions={{
          headerShown: false,

          contentStyle: {
            backgroundColor:
              theme.background,
          },

          animation:
            isCityBlack
              ? 'fade'
              : Platform.OS ===
                'android'
              ? 'fade_from_bottom'
              : 'slide_from_right',

          gestureEnabled: true,

          presentation:
            'card',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            animation:
              'fade',
          }}
        />

        <Stack.Screen
          name="login"
          options={{
            animation:
              'fade',

            gestureEnabled:
              false,
          }}
        />

        <Stack.Screen
          name="onboarding"
          options={{
            animation:
              'fade',

            gestureEnabled:
              false,
          }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{
            animation:
              'fade',

            gestureEnabled:
              false,
          }}
        />

        <Stack.Screen
          name="add-result-goal"
        />

        <Stack.Screen
          name="add-action-goal"
        />

        <Stack.Screen
          name="crew-detail"
        />

        <Stack.Screen
          name="crew-missions"
        />

        <Stack.Screen
          name="crew-members"
        />

        <Stack.Screen
          name="friend-village"
        />

        <Stack.Screen
          name="notification-settings"
        />

        <Stack.Screen
          name="privacy-policy"
        />

        <Stack.Screen
          name="widget"
          options={{
            animation:
              'fade',

            gestureEnabled:
              false,
          }}
        />

        <Stack.Screen
          name="modal"
          options={{
            presentation:
              'transparentModal',

            animation:
              'fade',
          }}
        />
      </Stack>
    </View>
  );
}