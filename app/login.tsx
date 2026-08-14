import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getApp,
} from '@react-native-firebase/app';

import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';

import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';
import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';
import * as Notifications from 'expo-notifications';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';




import {
  getDailySyncRestoreDecision,
  syncDailyDataToServer,
} from '../store/dailyCloud';



import {
  loadLocalExplorationData,
  mergeExplorationData,
  normalizeExplorationData,
  saveLocalExplorationData,
} from '../store/explorationCloud';
import {
  getRootOnboardingData,
  loadRootOnboardingData,
  saveRootOnboardingData
} from '../store/rootMemory';
import {
  bestEffortSyncOwnRootUserPublicProfile,
} from '../store/rootUserPublicProfileSync';
import { useRootTheme } from '../store/rootTheme';
import {
  getCharacterAccountScopeSnapshot,
  refreshCharacterAccountScope,
  type CharacterAccountScopeSnapshot,
} from '../store/characterAccountScope';
import {
  migrateGuestCharacterBundleToAuthenticatedUserIfEmpty,
} from '../store/characterCloudSync';

import {
  getAuthenticatedCharacterAccountScopeSnapshot,
} from '../store/characterAccountScope';
const firebaseApp =
  getApp();

const firebaseAuth =
  getAuth(
    firebaseApp
  );

const firebaseDb =
  getFirestore(
    firebaseApp
  );


GoogleSignin.configure({
  webClientId:
    '914235938891-8f8h890fnb4phoijtcilvui995quuud3.apps.googleusercontent.com',
});

// ROOT_AUTH_V10_LOGIN_RESILIENCE
const ROOT_AUTH_SERVER_TIMEOUT_MS =
  15000;

const ROOT_AUTH_SERVER_RETRY_DELAYS_MS = [
  2000,
  5000,
  10000,
] as const;

const waitForRootAuthRetry =
  (delayMs: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });

const isTransientRootAuthServerError =
  (error: any) => {
    const code = String(
      error?.code ?? '',
    ).toLowerCase();

    return [
      'aborted',
      'cancelled',
      'deadline-exceeded',
      'internal',
      'network-request-failed',
      'resource-exhausted',
      'unavailable',
      'unknown',
    ].some((candidate) =>
      code.includes(candidate)
    );
  };

type LoadServerDataOptions = {
  onTimeout?: () => void;

  onResolved?: (
    info: {
      exists: boolean;
    }
  ) => void;

  onError?: (
    error: any
  ) => void;

  onLateData?: (
    serverData: any | null
  ) =>
    | void
    | Promise<void>;
};

type ServerFetchResult =
  | {
      ok: true;
      exists: boolean;
      data: any | null;
    }
  | {
      ok: false;
      exists: false;
      data: null;
      error: any;
    };

const loadServerData = async (
  uid: string,
  options: LoadServerDataOptions = {}
) => {

  // ROOT_EXPLORE_V12D8_LOGIN_PRIVATE_USER_SELF_ONLY_GUARD
  const activeAuthUid =
    firebaseAuth.currentUser
      ?.uid ??
    null;

  const requestedPrivateUid =
    String(
      uid ?? '',
    ).trim();

  if (
    !activeAuthUid ||
    !requestedPrivateUid ||
    String(
      activeAuthUid,
    ) !==
      requestedPrivateUid
  ) {
    throw new Error(
      'LOGIN_PRIVATE_USER_SELF_ONLY_UID_REQUIRED',
    );
  }

  let timeoutId:
    | ReturnType<
        typeof setTimeout
      >
    | null = null;

  let lateRecoveryEnabled = false;

  let lateDataDelivered = false;

  let retryStarted = false;

  console.log(
    'LOGIN SERVER USER LOAD START',
    {
      uid,
    }
  );

  /*
   * Firestore 요청은 타임아웃 뒤에도
   * 실제로는 계속 진행됩니다.
   *
   * 늦게 응답이 도착하면
   * onLateData에서 로컬·서버 데이터를
   * 다시 안전하게 병합합니다.
   */
  const serverPromise:
  Promise<ServerFetchResult> =
  getDoc(
    doc(
      firebaseDb,
      'users',
      uid
    )
  )
    .then(
        (
          snapshot
        ): ServerFetchResult => {
          const snapshotExists =
            typeof (
              snapshot as any
            ).exists ===
              'function'
              ? (
                  snapshot as any
                ).exists()
              : Boolean(
                  (
                    snapshot as any
                  ).exists
                );

          console.log(
            'LOGIN SERVER USER LOAD CHECK',
            {
              uid,
              exists:
                snapshotExists,
            }
          );

          return {
            ok: true,
            exists:
              snapshotExists,

            data:
              snapshotExists
                ? snapshot.data() ??
                  null
                : null,
          };
        }
      )
      .catch(
        (
          error: any
        ): ServerFetchResult => {
          console.log(
            'LOAD SERVER DATA ERROR',
            {
              uid,

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

          
          try {
            options.onError?.(
              error
            );
          } catch (
            callbackError
          ) {
            console.log(
              'LOGIN SERVER ERROR CALLBACK ERROR',
              callbackError
            );
          }

          return {
            ok: false,
            exists: false,
            data: null,
            error,
          };
        }
      );

  const deliverLateServerResult =
    async (
      result: ServerFetchResult
    ) => {
      if (
        !lateRecoveryEnabled ||
        lateDataDelivered ||
        !result.ok
      ) {
        return;
      }

      const activeRetryAuthUid =
        firebaseAuth.currentUser
          ?.uid ??
        null;

      if (
        !activeRetryAuthUid ||
        String(activeRetryAuthUid) !==
          requestedPrivateUid
      ) {
        console.log(
          'LOGIN SERVER LATE RESULT SKIPPED: AUTH CHANGED',
          {
            expectedUid:
              requestedPrivateUid,
            activeAuthUid:
              activeRetryAuthUid,
          }
        );

        return;
      }

      lateDataDelivered = true;

      console.log(
        'LOGIN SERVER USER LATE RESULT',
        {
          uid,
          exists:
            result.exists,
        }
      );

      try {
        await options
          .onLateData?.(
            result.data
          );
      } catch (
        lateError: any
      ) {
        console.log(
          'LOGIN SERVER LATE DATA APPLY ERROR',
          {
            uid,

            code:
              lateError?.code ??
              null,

            message:
              lateError?.message ??
              String(
                lateError
              ),
          }
        );
      }
    };

  const startBackgroundRetries =
    () => {
      if (retryStarted) {
        return;
      }

      retryStarted = true;
      lateRecoveryEnabled = true;

      void (async () => {
        for (
          const delayMs of
            ROOT_AUTH_SERVER_RETRY_DELAYS_MS
        ) {
          await waitForRootAuthRetry(
            delayMs
          );

          if (
            lateDataDelivered ||
            firebaseAuth.currentUser
              ?.uid !==
              requestedPrivateUid
          ) {
            return;
          }

          console.log(
            'LOGIN SERVER USER BACKGROUND RETRY',
            {
              uid,
              delayMs,
            }
          );

          try {
            const retrySnapshot =
              await getDoc(
                doc(
                  firebaseDb,
                  'users',
                  uid
                )
              );

            const retryExists =
              typeof (
                retrySnapshot as any
              ).exists ===
                'function'
                ? (
                    retrySnapshot as any
                  ).exists()
                : Boolean(
                    (
                      retrySnapshot as any
                    ).exists
                  );

            await deliverLateServerResult({
              ok: true,
              exists:
                retryExists,
              data:
                retryExists
                  ? retrySnapshot.data() ??
                    null
                  : null,
            });

            if (lateDataDelivered) {
              return;
            }
          } catch (
            retryError: any
          ) {
            console.log(
              'LOGIN SERVER USER BACKGROUND RETRY ERROR',
              {
                uid,
                delayMs,
                code:
                  retryError?.code ??
                  null,
                message:
                  retryError?.message ??
                  String(retryError),
              }
            );

            if (
              !isTransientRootAuthServerError(
                retryError
              )
            ) {
              return;
            }
          }
        }
      })();
    };

  /*
   * 15초 뒤 로컬 데이터로
   * 앱에 먼저 들어갑니다.
   */
  const timeoutPromise =
    new Promise<null>(
      (
        resolve
      ) => {
        timeoutId =
          setTimeout(
            () => {
              lateRecoveryEnabled =
                true;

              startBackgroundRetries();

              console.log(
                'LOGIN SERVER USER LOAD TIMEOUT: LOCAL DATA USED',
                {
                  uid,
                }
              );

              try {
                options
                  .onTimeout?.();
              } catch (
                callbackError
              ) {
                console.log(
                  'LOGIN SERVER TIMEOUT CALLBACK ERROR',
                  callbackError
                );
              }

              resolve(
                null
              );
            },
            ROOT_AUTH_SERVER_TIMEOUT_MS
          );
      }
    );

  /*
   * 서버가 15초보다 늦게 응답해도
   * 응답을 버리지 않고 후속 병합을 진행합니다.
   */
  void serverPromise.then(
    async (
      result
    ) => {
      await deliverLateServerResult(
        result
      );
    }
  );

  try {
    const result =
      await Promise.race<
        ServerFetchResult |
        null
      >([
        serverPromise,
        timeoutPromise,
      ]);

    /*
     * 15초 타임아웃입니다.
     */
    if (!result) {
      return null;
    }

    /*
     * Firestore 오류입니다.
     */
    if (!result.ok) {
      if (
        isTransientRootAuthServerError(
          result.error
        )
      ) {
        startBackgroundRetries();
      }

      return null;
    }

    try {
      options.onResolved?.({
        exists:
          result.exists,
      });
    } catch (
      callbackError
    ) {
      console.log(
        'LOGIN SERVER RESOLVED CALLBACK ERROR',
        callbackError
      );
    }

    return result.data;
  } finally {
    if (
      timeoutId
    ) {
      clearTimeout(
        timeoutId
      );
    }
  }
};

const restoreDailyData = async (dailyData: any) => {
  if (!dailyData) return;

  const restoreStringValue = async (
    key: string,
    value: unknown
  ) => {
    if (value === null || value === undefined) {
      return;
    }

    await AsyncStorage.setItem(
      key,
      String(value)
    );
  };

  await Promise.all([
    restoreStringValue(
      'daily_time_records_v1',
      dailyData.timeRecords
    ),
    restoreStringValue(
      'daily_record_colors_v1',
      dailyData.recordColors
    ),
    restoreStringValue(
      'daily_todos_v1',
      dailyData.todos
    ),
    restoreStringValue(
      'daily_story_v1',
      dailyData.story
    ),
   restoreStringValue(
  'daily_ledger_v1',
  dailyData.ledger
),

restoreStringValue(
  'daily_ledger_budgets_v1',
  dailyData.ledgerBudgets
),

restoreStringValue(
  'daily_meals_v1',
  dailyData.meals
),
    restoreStringValue(
      'daily_sleep_v1',
      dailyData.sleep
    ),
    restoreStringValue(
      'root_water_logs',
      dailyData.waterLogs
    ),
    restoreStringValue(
      'root_weight_logs',
      dailyData.weightLogs
    ),
    restoreStringValue(
      'root_step_logs',
      dailyData.stepLogs
    ),
    restoreStringValue(
      'daily_calorie_profile_v1',
      dailyData.calorieProfile
    ),
    restoreStringValue(
      'daily_exercise_calories_v1',
      dailyData.exerciseCalories
    ),
    restoreStringValue(
      'daily_exercise_calorie_logs_v1',
      dailyData.exerciseCalorieLogs
    ),
    restoreStringValue(
      'daily_sleep_start_at_v1',
      dailyData.sleepStartAt
    ),
    restoreStringValue(
      'root_water_enabled',
      dailyData.waterEnabled
    ),
    restoreStringValue(
      'root_weight_enabled',
      dailyData.weightEnabled
    ),
    restoreStringValue(
      'root_step_enabled',
      dailyData.stepEnabled
    ),
    restoreStringValue(
      'daily_show_sleep_v1',
      dailyData.showSleep
    ),
    restoreStringValue(
      'daily_show_ledger_v1',
      dailyData.showLedger
    ),
    restoreStringValue(
      'daily_show_story_v1',
      dailyData.showStory
    ),
    restoreStringValue(
      'daily_show_meal_v1',
      dailyData.showMeal
    ),
    restoreStringValue(
      'daily_show_weather_v1',
      dailyData.showWeather
    ),
    restoreStringValue(
      'daily_show_time_grid_v1',
      dailyData.showTimeGrid
    ),
  ]);
};

/*
 * 서버 하루 데이터를 로컬에 복원할지,
 * 현재 로컬 데이터를 서버로 다시 보낼지 결정합니다.
 */
const reconcileDailyDataAfterServerRead =
  async ({
    serverData,
    reason,
    allowServerRestore,
  }: {
    serverData:
      any | null;

    reason:
      string;

    allowServerRestore:
      boolean;
  }) => {
    const decision =
      await getDailySyncRestoreDecision(
        serverData
          ?.dailyUpdatedAt
      );

    console.log(
      'LOGIN DAILY RECONCILE CHECK',
      {
        reason,

        allowServerRestore,

        hasServerDailyData:
          Boolean(
            serverData
              ?.dailyData
          ),

        pending:
          decision.pending,

        localUpdatedAt:
          decision.localUpdatedAt,

        lastSyncedAt:
          decision.lastSyncedAt,

        serverUpdatedAt:
          decision.serverUpdatedAt,

        localIsNewer:
          decision.localIsNewer,

        shouldRestoreServer:
          decision.shouldRestoreServer,

        shouldRetryLocalSync:
          decision.shouldRetryLocalSync,
      }
    );

    /*
     * 미전송 로컬 변경이 없고
     * 서버 데이터를 복원해도 안전할 때만
     * 서버 하루 데이터를 로컬에 적용합니다.
     */
    if (
      allowServerRestore &&
      serverData
        ?.dailyData &&
      decision
        .shouldRestoreServer
    ) {
      await restoreDailyData(
        serverData.dailyData
      );

      console.log(
        'LOGIN DAILY SERVER RESTORE DONE',
        {
          reason,

          serverUpdatedAt:
            decision
              .serverUpdatedAt,
        }
      );

      return;
    }

    /*
     * 로컬에 아직 서버로 전송되지 않은
     * 기록이 있으면 서버 복원을 생략하고
     * 현재 로컬 데이터를 다시 저장합니다.
     */
    if (
      decision
        .shouldRetryLocalSync
    ) {
      console.log(
        'LOGIN DAILY LOCAL DATA KEPT',
        {
          reason,

          pending:
            decision.pending,

          localIsNewer:
            decision.localIsNewer,
        }
      );

      void syncDailyDataToServer()
        .catch(
          (
            error: any
          ) => {
            console.log(
              'LOGIN DAILY RETRY SYNC ERROR',
              {
                reason,

                code:
                  error
                    ?.code ??
                  null,

                message:
                  error
                    ?.message ??
                  String(
                    error
                  ),
              }
            );
          }
        );

      return;
    }

    console.log(
      'LOGIN DAILY RECONCILE NO ACTION',
      {
        reason,
      }
    );
  };

const pickLocalArray = (
  localValue: any,
  serverValue: any
) => {
  const localArray =
    Array.isArray(localValue)
      ? localValue
      : [];

  const serverArray =
    Array.isArray(serverValue)
      ? serverValue
      : [];

  /*
   * 로컬에 실제 데이터가 있으면 로컬 우선.
   * 로컬이 빈 배열이고 서버에 데이터가 있으면 서버 우선.
   *
   * 빈 로컬 배열이 서버 데이터를 지우는 것을 방지합니다.
   */
  if (localArray.length > 0) {
    return localArray;
  }

  if (serverArray.length > 0) {
    return serverArray;
  }

  return [];
};

const hasFinishedOnboarding = (
  value: any
) => {
  const goals =
    Array.isArray(value?.goals)
      ? value.goals
      : [];

  const actionGoals =
    Array.isArray(
      value?.actionGoals
    )
      ? value.actionGoals
      : [];

  return (
    value?.onboardingComplete ===
      true ||
    Boolean(
      value?.onboardingCompletedAt
    ) ||
    goals.length > 0 ||
    actionGoals.length > 0
  );
};

const mergeRootData = (
  localData: any,
  serverData: any,
  uid: string,
  forceLocal = false
) => {
  const serverRootData =
    serverData?.rootData ??
    serverData ??
    {};

  const localBelongsToUser =
    Boolean(localData?.uid) &&
    String(localData.uid) ===
      String(uid);

  /*
   * 같은 UID이거나 게스트 데이터를
   * Google 계정으로 옮기는 경우에는
   * 현재 기기의 로컬 데이터를 우선합니다.
   */
  if (
    !forceLocal &&
    !localBelongsToUser
  ) {
    return serverRootData;
  }

  return {
    ...serverRootData,
    ...(localData ?? {}),

    goals: pickLocalArray(
      localData?.goals,
      serverRootData?.goals
    ),

    actionGoals: pickLocalArray(
      localData?.actionGoals,
      serverRootData?.actionGoals
    ),

    archivedActionGoals:
      pickLocalArray(
        localData?.archivedActionGoals,
        serverRootData
          ?.archivedActionGoals
      ),

    actionLogs: pickLocalArray(
      localData?.actionLogs,
      serverRootData?.actionLogs
    ),

    notifications:
      pickLocalArray(
        localData?.notifications,
        serverRootData
          ?.notifications ??
          serverData?.notifications
      ),
  };
};

/*
 * Google 로그인 상태의 최종 ROOT 데이터를
 * 한 곳에서 동일한 형식으로 만듭니다.
 */
const makeGoogleLoginData = (
  sourceData: any,
  localData: any,
  serverData: any,
  user: any
) => {
  const serverRootData =
    serverData?.rootData ??
    serverData ??
    {};

  return {
    ...(sourceData ?? {}),

    loginType:
      'google',

    loginProvider:
      'google',

    isGuest:
      false,

    forceLogout:
      false,

    uid:
      user.uid,

    email:
      user.email ??
      localData?.email ??
      serverRootData
        ?.email ??
      null,

    nickname:
      sourceData
        ?.nickname ??
      localData
        ?.nickname ??
      serverRootData
        ?.nickname ??
      user.displayName ??
      '루트 사용자',

    photoURL:
      user.photoURL ??
      sourceData
        ?.photoURL ??
      localData
        ?.photoURL ??
      null,

    loggedInAt:
      new Date()
        .toISOString(),
  };
};

/*
 * 로컬과 서버를 모두 확인한 뒤 만들어진
 * 최종 ROOT 데이터를 Firestore에 저장합니다.
 *
 * 이 함수는 반드시 현재 Firebase UID와
 * 저장 대상 UID가 같을 때만 실행됩니다.
 */
const saveMergedRootDataToServer =
  async (
    uid: string,
    finalData: any,
    reason: string
  ) => {
    const currentAuthUid =
      firebaseAuth.currentUser
        ?.uid ??
      null;

    if (
      !currentAuthUid ||
      String(
        currentAuthUid
      ) !==
        String(
          uid
        )
    ) {
      console.log(
        'LOGIN BACKGROUND SERVER SAVE SKIPPED: AUTH UID MISMATCH',
        {
          uid,
          currentAuthUid,
          reason,
        }
      );

      return;
    }

    const savedAt =
      new Date()
        .toISOString();

    const finished =
      hasFinishedOnboarding(
        finalData
      );

    await setDoc(
  doc(
    firebaseDb,
    'users',
    uid
  ),
  {
    uid,

    email:
      finalData?.email ??
      null,

    nickname:
      finalData
        ?.nickname ??
      '루트 사용자',

    photoURL:
      finalData
        ?.photoURL ??
      null,

    rootData:
      finalData,

    ...(finished
      ? {
          onboardingComplete:
            true,

          onboardingCompletedAt:
            finalData
              ?.onboardingCompletedAt ??
            savedAt,
        }
      : {}),

    updatedAt:
      savedAt,
  },
  {
    merge: true,
  }
);

    // ROOT_EXPLORE_V12D7_LOGIN_PROFILE_SYNC
    const publicProfileSync =
      await bestEffortSyncOwnRootUserPublicProfile(
        uid,
      );

    if (
      !publicProfileSync.ok
    ) {
      console.log(
        'LOGIN PUBLIC PROFILE BEST-EFFORT SYNC RESULT',
        {
          reason:
            publicProfileSync.reason,
        },
      );
    }

    console.log(
      'LOGIN MERGED ROOT SERVER SAVE DONE',
      {
        uid,
        reason,

        actionGoalCount:
          finalData
            ?.actionGoals
            ?.length ?? 0,

        actionLogCount:
          finalData
            ?.actionLogs
            ?.length ?? 0,

        archivedGoalCount:
          finalData
            ?.archivedActionGoals
            ?.length ?? 0,
      }
    );
  };


const isPlainLoginObject =
  (
    value: unknown
  ): value is Record<
    string,
    any
  > => {
    return Boolean(
      value
    ) &&
      typeof value ===
        'object' &&
      !Array.isArray(
        value
      );
  };

/*
 * 로그인 과정에서 확인한 서버 사용자 문서의
 * 탐험 데이터를 현재 계정의 로컬 탐험 데이터와
 * 합쳐 별도 AsyncStorage 키와 ROOT 데이터에
 * 동시에 저장합니다.
 *
 * 다른 Google 계정의 데이터가 현재 계정에
 * 섞이지 않도록 allowDeviceLocalExploration이
 * false이면 기존 기기의 독립 탐험 키를
 * 병합 대상으로 사용하지 않습니다.
 */
const applyExplorationDataAfterLogin =
  async ({
    uid,
    finalData,
    serverData,
    reason,
    allowDeviceLocalExploration,
  }: {
    uid: string;
    finalData: any;
    serverData: any | null;
    reason: string;
    allowDeviceLocalExploration: boolean;
  }) => {
    const currentAuthUid =
  firebaseAuth
    .currentUser
    ?.uid ??
  null;

    if (
      !currentAuthUid ||
      String(
        currentAuthUid
      ) !==
        String(
          uid
        )
    ) {
      console.log(
        'LOGIN EXPLORATION RESTORE SKIPPED: AUTH UID MISMATCH',
        {
          uid,
          currentAuthUid,
          reason,
        }
      );

      await saveRootOnboardingData(
        finalData
      );

      return finalData;
    }

    try {
      const serverRootData =
        serverData?.rootData ??
        serverData ??
        {};

      const topLevelServerExploration =
        normalizeExplorationData({
          ...(
            isPlainLoginObject(
              serverData
                ?.explorationData
            )
              ? serverData
                  .explorationData
              : {}
          ),

          mainBadgeId:
            serverData
              ?.explorationData
              ?.mainBadgeId ??
            serverData
              ?.explorationMainBadgeId,
        });

      const rootServerExploration =
        normalizeExplorationData({
          ...(
            isPlainLoginObject(
              serverRootData
                ?.explorationData
            )
              ? serverRootData
                  .explorationData
              : {}
          ),

          mainBadgeId:
            serverRootData
              ?.explorationData
              ?.mainBadgeId ??
            serverRootData
              ?.explorationMainBadgeId,
        });

      const mergedServerExploration =
        mergeExplorationData(
          topLevelServerExploration,
          rootServerExploration
        );

      /*
       * 같은 Google UID 또는 게스트에서
       * Google로 전환하는 경우에만
       * 기기의 기존 탐험 키를 사용합니다.
       */
      const safeLocalExploration =
        allowDeviceLocalExploration
          ? await loadLocalExplorationData()
          : normalizeExplorationData({
              ...(
                isPlainLoginObject(
                  finalData
                    ?.explorationData
                )
                  ? finalData
                      .explorationData
                  : {}
              ),

              mainBadgeId:
                finalData
                  ?.explorationData
                  ?.mainBadgeId ??
                finalData
                  ?.explorationMainBadgeId,
            });

      const mergedExploration =
        mergeExplorationData(
          safeLocalExploration,
          mergedServerExploration
        );

      /*
       * 새 통합 키, 이전 호환 키,
       * ROOT 로컬 데이터를 함께 저장합니다.
       */
      const savedExploration =
        await saveLocalExplorationData(
          mergedExploration
        );

      const nextFinalData = {
        ...(finalData ?? {}),

        explorationData:
          savedExploration,

        explorationMainBadgeId:
          savedExploration
            .mainBadgeId,
      };

      await saveRootOnboardingData(
        nextFinalData
      );

      await AsyncStorage.setItem(
        'exploration_reload_signal',
        Date.now()
          .toString()
      );

      console.log(
        'LOGIN EXPLORATION RESTORE DONE',
        {
          uid,
          reason,

          points:
            savedExploration
              .points,

          visitedCount:
            savedExploration
              .visitedPlaceIds
              .length,

          completedThemeCount:
            savedExploration
              .completedThemeIds
              .length,

          buildingCount:
            savedExploration
              .unlockedBuildingIds
              .length,

          stampCount:
            savedExploration
              .unlockedStampIds
              .length,

          mainBadgeId:
            savedExploration
              .mainBadgeId,
        }
      );

      return nextFinalData;
    } catch (
      error: any
    ) {
      /*
       * 탐험 복원이 실패해도 기존 ROOT 로그인과
       * 홈 진입은 중단하지 않습니다.
       */
      await saveRootOnboardingData(
        finalData
      );

      console.log(
        'LOGIN EXPLORATION RESTORE ERROR: ROOT DATA KEPT',
        {
          uid,
          reason,

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

      return finalData;
    }
  };

export default function LoginScreen() {
  /*
   * 온보딩 첫 화면에서
   * showChoices=1을 보내면
   * 로그인 선택 화면을 강제로 표시합니다.
   */
  const params =
    useLocalSearchParams<{
      showChoices?: string;
    }>();

  const forceShowChoices =
    String(
      params?.showChoices ??
        ''
    ) === '1';

  const { themeMode, theme } =
    useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  const [loading, setLoading] =
    useState(true);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  useEffect(() => {
    const requestNotificationPermission =
      async () => {
        try {
          const permission =
            await Notifications.getPermissionsAsync();

          console.log(
            'CURRENT NOTIFICATION PERMISSION',
            permission
          );

          if (
            permission.status !== 'granted'
          ) {
            const result =
              await Notifications.requestPermissionsAsync();

            console.log(
              'REQUEST RESULT',
              result
            );
          }
        } catch (error) {
          console.log(
            'NOTIFICATION PERMISSION ERROR',
            error
          );
        }
      };

    requestNotificationPermission();
  }, []);

  useEffect(() => {
  const init = async () => {
    try {
      /*
       * 온보딩에서
       * "로그인 방식 다시 선택"을 눌러
       * 들어온 경우입니다.
       *
       * 저장된 Google·게스트 정보가 있어도
       * 자동으로 홈이나 온보딩으로 이동하지 않고
       * 로그인 선택 화면을 표시합니다.
       */
      if (forceShowChoices) {
        console.log(
          'LOGIN CHOICE SCREEN FORCED'
        );

        setLoading(false);
        return;
      }

      const data =
        await loadRootOnboardingData();

      if (!data) {
        setLoading(false);
        return;
      }

        if (data?.forceLogout) {
          setLoading(false);
          return;
        }

        if (
  data?.loginType ===
  'guest'
) {
  if (
    hasFinishedOnboarding(
      data
    )
  ) {
    router.replace(
      '/(tabs)'
    );
  } else {
    router.replace(
      '/onboarding'
    );
  }

  return;
}

        if (
  data?.loginType ===
    'google' &&
  data?.uid
) {
  const currentUser =
    firebaseAuth.currentUser;

  console.log(
    'LOGIN INIT CURRENT AUTH UID',
    currentUser?.uid
  );

  console.log(
    'LOGIN INIT LOCAL ROOT UID',
    data.uid
  );

  if (
    !currentUser?.uid ||
    String(
      currentUser.uid
    ) !==
      String(
        data.uid
      )
  ) {
    console.log(
      'Firebase Auth 로그인 상태가 아니라서 자동 진입 중단'
    );

    setLoading(
      false
    );

    return;
  }
 
  let serverTimedOut =
    false;

  let serverReadSucceeded =
    false;

  /*
   * 15초 뒤 서버 응답이 늦게 도착하면
   * 그 시점의 최신 로컬 데이터와
   * 서버 데이터를 다시 병합합니다.
   */
  const applyLateServerData =
    async (
      lateServerData:
        any | null
    ) => {
      const activeAuthUid =
        firebaseAuth.currentUser
          ?.uid ??
        null;

      if (
        !activeAuthUid ||
        String(
          activeAuthUid
        ) !==
          String(
            currentUser.uid
          )
      ) {
        console.log(
          'LOGIN LATE SERVER DATA SKIPPED: AUTH CHANGED',
          {
            expectedUid:
              currentUser.uid,

            activeAuthUid,
          }
        );

        return;
      }

      /*
       * 홈에 들어간 뒤 목표나 기록이
       * 새로 바뀌었을 수 있으므로,
       * 최초 data가 아니라 최신 로컬 값을
       * 다시 불러옵니다.
       */
      const latestLocalData =
        await loadRootOnboardingData() ??
        data;

      const lateSourceData =
        mergeRootData(
          latestLocalData,
          lateServerData,
          currentUser.uid
        );

      const lateFinalData =
        makeGoogleLoginData(
          lateSourceData,
          latestLocalData,
          lateServerData,
          currentUser
        );

      const lateFinalDataWithExploration =
        await applyExplorationDataAfterLogin({
          uid:
            currentUser.uid,

          finalData:
            lateFinalData,

          serverData:
            lateServerData,

          reason:
            'late-server-reconcile',

          allowDeviceLocalExploration:
            true,
        });

      /*
       * 서버 데이터를 확인한 뒤 병합했으므로
       * 이 시점에는 전체 rootData를
       * 안전하게 서버에 저장할 수 있습니다.
       */
      await saveMergedRootDataToServer(
        currentUser.uid,
        lateFinalDataWithExploration,
        'late-server-reconcile'
      );

/*
 * 서버 응답이 늦게 도착한 경우에는
 * 서버 dailyData로 로컬을 덮지 않습니다.
 *
 * 로컬에 pending 데이터가 있으면
 * 현재 로컬 데이터를 서버에 다시 저장합니다.
 */
await reconcileDailyDataAfterServerRead({
  serverData:
    lateServerData,

  reason:
    'late-server-reconcile',

  allowServerRestore:
    false,
});


      await AsyncStorage.setItem(
        'daily_reload_signal',
        Date.now()
          .toString()
      );

      console.log(
        'LOGIN LATE SERVER DATA RECONCILE DONE',
        {
          uid:
            currentUser.uid,

          actionGoalCount:
            lateFinalData
              ?.actionGoals
              ?.length ?? 0,

          actionLogCount:
            lateFinalData
              ?.actionLogs
              ?.length ?? 0,

          archivedGoalCount:
            lateFinalData
              ?.archivedActionGoals
              ?.length ?? 0,
        }
      );
    };

  const serverData: any =
    await loadServerData(
      currentUser.uid,
      {
        onTimeout: () => {
          serverTimedOut =
            true;
        },

        onResolved: () => {
          serverReadSucceeded =
            true;
        },

        onLateData:
          applyLateServerData,
      }
    );

  /*
   * 15초 안에 서버 데이터가 도착했을 때만
   * 하루 데이터를 즉시 복원합니다.
   *
   * 홈에 들어간 뒤 늦게 도착한 하루 데이터가
   * 사용자의 최신 하루 기록을 덮지 않도록,
   * 늦은 응답에서는 dailyData를 복원하지 않습니다.
   */
  await reconcileDailyDataAfterServerRead({
  serverData,

  reason:
    'automatic-login',

  allowServerRestore:
    true,
});

  const serverRootData =
    serverData?.rootData ??
    serverData ??
    {};

  const sourceData =
    mergeRootData(
      data,
      serverData,
      currentUser.uid
    );

  const finalData =
    makeGoogleLoginData(
      sourceData,
      data,
      serverData,
      currentUser
    );

  console.log(
    'LOGIN ROOT DATA MERGE CHECK',
    {
      localActionLogCount:
        data?.actionLogs
          ?.length ?? 0,

      serverActionLogCount:
        serverRootData
          ?.actionLogs
          ?.length ?? 0,

      nextActionLogCount:
        sourceData
          ?.actionLogs
          ?.length ?? 0,

      localActionGoalCount:
        data?.actionGoals
          ?.length ?? 0,

      serverActionGoalCount:
        serverRootData
          ?.actionGoals
          ?.length ?? 0,

      nextActionGoalCount:
        sourceData
          ?.actionGoals
          ?.length ?? 0,

      localArchivedGoalCount:
        data
          ?.archivedActionGoals
          ?.length ?? 0,

      nextArchivedGoalCount:
        sourceData
          ?.archivedActionGoals
          ?.length ?? 0,

      serverTimedOut,
      serverReadSucceeded,
    }
  );

  let finalDataForNavigation =
    finalData;

  /*
   * 서버 사용자 문서를 정상적으로 확인한 경우에는
   * 같은 로그인 과정에서 탐험 데이터도 로컬에 복원합니다.
   *
   * 타임아웃 또는 오류인 경우에는 기존 ROOT 데이터만
   * 먼저 유지하고, 늦은 서버 응답에서 탐험 복원을 진행합니다.
   */
  if (
    serverReadSucceeded
  ) {
    finalDataForNavigation =
      await applyExplorationDataAfterLogin({
        uid:
          currentUser.uid,

        finalData,

        serverData,

        reason:
          'automatic-login',

        allowDeviceLocalExploration:
          true,
      });
  } else {
    await saveRootOnboardingData(
      finalData
    );
  }

  /*
   * 서버 읽기가 정상 완료된 경우에는
   * 로컬 우선 병합 결과를 서버에 저장합니다.
   *
   * 타임아웃일 경우 서버 내용을 아직 모르므로
   * 즉시 덮어쓰지 않고 늦은 응답을 기다립니다.
   */
  if (
    serverReadSucceeded
  ) {
    void saveMergedRootDataToServer(
      currentUser.uid,
      finalDataForNavigation,
      'automatic-login'
    ).catch(
      (
        error: any
      ) => {
        console.log(
          'LOGIN AUTOMATIC SERVER SAVE ERROR',
          {
            uid:
              currentUser.uid,

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
      }
    );
  } else if (
    serverTimedOut
  ) {
    console.log(
      'LOGIN AUTOMATIC SERVER SAVE DEFERRED: WAITING FOR LATE SERVER DATA',
      {
        uid:
          currentUser.uid,
      }
    );
  } else {
    console.log(
      'LOGIN AUTOMATIC SERVER SAVE SKIPPED: SERVER READ ERROR',
      {
        uid:
          currentUser.uid,
      }
    );
  }

  await AsyncStorage.setItem(
    'daily_reload_signal',
    Date.now()
      .toString()
  );

  if (
    hasFinishedOnboarding(
      finalDataForNavigation
    )
  ) {
    router.replace(
      '/(tabs)'
    );
  } else {
    router.replace(
      '/onboarding'
    );
  }

  return;
}

        setLoading(false);
      } catch (error) {
        console.log(
          'LOGIN INIT ERROR',
          error
        );

        setLoading(false);
      }
    };

    init();
  }, [forceShowChoices]);

 const handleGuestLogin =
  async () => {
    try {
      /*
       * Firebase에 남아 있는
       * Google 인증부터 해제합니다.
       */
      if (
  firebaseAuth.currentUser
) {
  await signOut(
    firebaseAuth
  );

        console.log(
          'GUEST LOGIN FIREBASE SIGN OUT SUCCESS'
        );
      }
    } catch (error: any) {
      console.log(
        'GUEST LOGIN FIREBASE SIGN OUT ERROR',
        {
          code:
            error?.code ??
            null,

          message:
            error?.message ??
            String(error),
        }
      );
    }

    try {
      /*
       * Google 계정 선택 상태도 해제합니다.
       * 로그인된 Google 세션이 없어 발생하는 오류는
       * 게스트 전환을 막지 않습니다.
       */
      await GoogleSignin.signOut();

      console.log(
        'GUEST LOGIN GOOGLE SIGN OUT SUCCESS'
      );
    } catch (error: any) {
      console.log(
        'GUEST LOGIN GOOGLE SIGN OUT SKIPPED',
        {
          code:
            error?.code ??
            null,

          message:
            error?.message ??
            String(error),
        }
      );
    }

    try {
      const previousData =
        getRootOnboardingData();

      /*
       * 이미 게스트였던 경우에만
       * 기존 게스트 목표와 기록을 유지합니다.
       *
       * Google 계정의 데이터는 새로운
       * 게스트 계정으로 가져오지 않습니다.
       */
      const guestBase =
        previousData
          ?.loginType ===
        'guest'
          ? previousData
          : {};

      const next = {
        ...(guestBase ?? {}),

        guestId:
          guestBase
            ?.guestId ??
          `guest_${Date.now()}`,

        loginType:
          'guest',

        loginProvider:
          'guest',

        isGuest:
          true,

        forceLogout:
          false,

        /*
         * 이전 Google 계정 정보를 제거합니다.
         */
        email:
          null,

        uid:
          null,

        photoURL:
          null,

        loggedInAt:
          new Date()
            .toISOString(),
      };

      await saveRootOnboardingData(
        next
      );

      console.log(
        'GUEST LOGIN SAVE SUCCESS',
        {
          guestId:
            next.guestId,

          hasFinishedOnboarding:
            hasFinishedOnboarding(
              next
            ),
        }
      );

      if (
        hasFinishedOnboarding(
          next
        )
      ) {
        router.replace(
          '/(tabs)'
        );
      } else {
        router.replace(
          '/onboarding'
        );
      }
    } catch (error: any) {
      console.log(
        'GUEST LOGIN ERROR',
        {
          code:
            error?.code ??
            null,

          message:
            error?.message ??
            String(error),
        }
      );

      Alert.alert(
        '게스트 시작 실패',
        '게스트 정보를 저장하지 못했어요. 다시 시도해 주세요.'
      );
    }
  };

  const handleGoogleLogin =
  async () => {
    /*
     * 로그인 전에 저장돼 있던 ROOT 데이터입니다.
     *
     * Google 로그인 도중 서버 확인에 실패해도
     * 다른 계정의 로컬 데이터를 잘못 가져오지
     * 않도록 로그인 전 값을 따로 보관합니다.
     */
    const storedRoot =
      getRootOnboardingData();

    const previousRootBeforeLogin =
      storedRoot
        ? {
            ...storedRoot,
            forceLogout:
              false,
          }
        : null;

    // CHARACTER_V98D_GUEST_CHARACTER_SCOPE_CAPTURE
    const characterScopeBeforeGoogleLogin:
      CharacterAccountScopeSnapshot | null =
      previousRootBeforeLogin
        ?.loginType ===
        'guest'
        ? getCharacterAccountScopeSnapshot()
        : null;

    const guestCharacterScopeBeforeGoogleLogin =
      characterScopeBeforeGoogleLogin
        ?.kind ===
        'guest'
        ? characterScopeBeforeGoogleLogin
        : null;

    const normalizeRootArrays =
      (
        value: any
      ) => {
        return {
          ...(value ?? {}),

          goals:
            Array.isArray(
              value?.goals
            )
              ? value.goals
              : [],

          actionGoals:
            Array.isArray(
              value?.actionGoals
            )
              ? value.actionGoals
              : [],

          archivedActionGoals:
            Array.isArray(
              value
                ?.archivedActionGoals
            )
              ? value
                  .archivedActionGoals
              : [],

          actionLogs:
            Array.isArray(
              value?.actionLogs
            )
              ? value.actionLogs
              : [],

          notifications:
            Array.isArray(
              value?.notifications
            )
              ? value.notifications
              : [],
        };
      };

    const moveAfterGoogleLogin =
      (
        finalData: any
      ) => {
        if (
          hasFinishedOnboarding(
            finalData
          )
        ) {
          router.replace(
            '/(tabs)'
          );
        } else {
          router.replace(
            '/onboarding'
          );
        }
      };

    try {
      setGoogleLoading(
        true
      );

      /*
       * 이전 로그아웃 표시가 남아 있으면
       * 새 Google 인증까지 로그아웃될 수 있으므로
       * 인증 시작 전에 해제합니다.
       */
      if (
        storedRoot
          ?.forceLogout ===
        true
      ) {
        await saveRootOnboardingData(
          previousRootBeforeLogin
        );

        console.log(
          'LOGIN FORCE LOGOUT CLEARED',
          {
            previousUid:
              storedRoot
                ?.uid ??
              null,
          }
        );
      }

      await GoogleSignin
        .hasPlayServices();

      const userInfo =
        await GoogleSignin
          .signIn();

      const idToken =
        userInfo
          ?.data
          ?.idToken ??
        (
          userInfo as any
        )?.idToken;

      if (!idToken) {
        Alert.alert(
          '로그인 실패',
          'Google ID 토큰을 가져오지 못했어요.'
        );

        return;
      }

      const googleCredential =
  GoogleAuthProvider
    .credential(
      idToken
    );

const result =
  await signInWithCredential(
    firebaseAuth,
    googleCredential
  );

      const user =
        result.user;

      try {
        await user.getIdToken(
          true
        );

        console.log(
          'ROOT AUTH V1.0 ID TOKEN FORCE REFRESH SUCCESS',
          {
            uid:
              user.uid,
          }
        );
      } catch (
        tokenRefreshError: any
      ) {
        /*
         * 토큰 갱신 지연은 로그인 자체를 취소하지 않습니다.
         * Firestore가 기존 유효 토큰으로 먼저 연결되고,
         * 이후 SDK의 자동 갱신을 계속 사용할 수 있습니다.
         */
        console.log(
          'ROOT AUTH V1.0 ID TOKEN FORCE REFRESH DEFERRED',
          {
            uid:
              user.uid,
            code:
              tokenRefreshError?.code ??
              null,
            message:
              tokenRefreshError?.message ??
              String(tokenRefreshError),
          }
        );
      }

      // CHARACTER_V98D_GUEST_TO_GOOGLE_CHARACTER_HANDOFF
      if (
        guestCharacterScopeBeforeGoogleLogin
      ) {
        try {
          // ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_HANDOFF_SCOPE
          const authenticatedCharacterScope =
            getAuthenticatedCharacterAccountScopeSnapshot(
              user.uid
            );

          const migratedCharacterState =
            await migrateGuestCharacterBundleToAuthenticatedUserIfEmpty(
              guestCharacterScopeBeforeGoogleLogin,
              authenticatedCharacterScope
            );

          console.log(
            'CHARACTER V98D GUEST HANDOFF',
            {
              guestScopeId:
                guestCharacterScopeBeforeGoogleLogin
                  .scopeId,
              userScopeId:
                authenticatedCharacterScope
                  .scopeId,
              migrated:
                migratedCharacterState,
            }
          );
        }
        catch (error: any) {
          // Character handoff must never block the existing ROOT login.
          console.log(
            'CHARACTER V98D GUEST HANDOFF SKIPPED',
            {
              code:
                error
                  ?.code ??
                null,
              message:
                error
                  ?.message ??
                String(
                  error
                ),
            }
          );
        }
      }

      console.log(
        'GOOGLE UID',
        user.uid,
        user.email
      );

      const previousRoot =
        previousRootBeforeLogin;

      const wasGuestBeforeLogin =
        previousRoot
          ?.loginType ===
        'guest';

      const previousBelongsToUser =
        Boolean(
          previousRoot
            ?.uid
        ) &&
        String(
          previousRoot
            ?.uid
        ) ===
          String(
            user.uid
          );

      /*
       * 사용할 수 있는 로컬 데이터:
       *
       * 1. 같은 Google UID의 로컬 데이터
       * 2. Google 계정으로 옮길 게스트 데이터
       *
       * 다른 Google 계정의 데이터는 가져오지 않습니다.
       */
      const safeLocalRoot =
        wasGuestBeforeLogin ||
        previousBelongsToUser
          ? previousRoot
          : {};

      let serverTimedOut =
        false;

      let serverReadSucceeded =
        false;

      let serverDocumentExists =
        false;

      let serverReadError:
        any | null =
        null;

      /*
       * 서버가 15초보다 늦게 도착하면
       * 같은 UID 로컬 데이터는 안전하게 후속 병합합니다.
       *
       * 로컬 fallback이 없는 경우에도 인증을 유지한 채
       * 서버 존재 여부가 확인된 이 시점에만 로그인을 완료합니다.
       */
      const canUseLocalFallback =
        previousBelongsToUser;

      const applyLateServerData =
        async (
          lateServerData:
            any | null
        ) => {
          const activeAuthUid =
  firebaseAuth
    .currentUser
    ?.uid ??
  null;

          if (
            !activeAuthUid ||
            String(
              activeAuthUid
            ) !==
              String(
                user.uid
              )
          ) {
            console.log(
              'GOOGLE LOGIN LATE SERVER DATA SKIPPED: AUTH CHANGED',
              {
                expectedUid:
                  user.uid,

                activeAuthUid,
              }
            );

            return;
          }

          /*
           * 로그인 후 홈에서 기록이 바뀌었을 수 있으므로
           * 로그인 시작 시점의 데이터가 아니라
           * 현재 최신 로컬 데이터를 다시 불러옵니다.
           */
          const latestDeviceData =
            await loadRootOnboardingData() ??
            safeLocalRoot;

          const latestLocalData =
            canUseLocalFallback ||
            wasGuestBeforeLogin
              ? latestDeviceData
              : {};

          const lateSourceData =
            mergeRootData(
              latestLocalData,
              lateServerData,
              user.uid,
              wasGuestBeforeLogin
            );

          const normalizedLateSource =
            normalizeRootArrays(
              lateSourceData
            );

          const lateFinalData =
            makeGoogleLoginData(
              normalizedLateSource,
              latestLocalData,
              lateServerData,
              user
            );

          const lateFinalDataWithExploration =
            await applyExplorationDataAfterLogin({
              uid:
                user.uid,

              finalData:
                lateFinalData,

              serverData:
                lateServerData,

              reason:
                'manual-google-late-reconcile',

              allowDeviceLocalExploration:
                canUseLocalFallback ||
                wasGuestBeforeLogin,
            });

          /*
           * 늦게라도 서버 조회가 정상 완료됐으므로
           * 이때는 병합 데이터를 서버에 저장해도 안전합니다.
           *
           * lateServerData가 null이면
           * 서버 문서가 없다는 확인 결과이므로
           * 현재 로컬 데이터로 새 문서를 만듭니다.
           */
          await saveMergedRootDataToServer(
            user.uid,
            lateFinalDataWithExploration,
            'manual-google-late-reconcile'
          );

/*
 * 서버가 늦게 도착했을 때는
 * 서버 dailyData를 로컬에 덮어쓰지 않습니다.
 *
 * pending 로컬 데이터가 있으면
 * 서버 저장만 다시 시도합니다.
 */
await reconcileDailyDataAfterServerRead({
  serverData:
    lateServerData,

  reason:
    'manual-google-late-reconcile',

  allowServerRestore:
    !canUseLocalFallback &&
    !wasGuestBeforeLogin &&
    Boolean(lateServerData),
});

          
         

          await AsyncStorage
            .setItem(
              'daily_reload_signal',
              Date.now()
                .toString()
            );

          console.log(
            'GOOGLE LOGIN LATE SERVER RECONCILE DONE',
            {
              uid:
                user.uid,

              actionGoalCount:
                lateFinalDataWithExploration
                  ?.actionGoals
                  ?.length ??
                0,

              actionLogCount:
                lateFinalDataWithExploration
                  ?.actionLogs
                  ?.length ??
                0,

              archivedGoalCount:
                lateFinalDataWithExploration
                  ?.archivedActionGoals
                  ?.length ??
                0,
            }
          );

          if (
            !canUseLocalFallback
          ) {
            console.log(
              'ROOT AUTH V1.0 DEFERRED LOGIN COMPLETED',
              {
                uid:
                  user.uid,
                serverDocumentExists:
                  Boolean(lateServerData),
              }
            );

            moveAfterGoogleLogin(
              lateFinalDataWithExploration
            );
          }
        };

      const serverData:
        any =
        await loadServerData(
          user.uid,
          {
            onTimeout:
              () => {
                serverTimedOut =
                  true;
              },

            onResolved:
              (
                info
              ) => {
                serverReadSucceeded =
                  true;

                serverDocumentExists =
                  info.exists;
              },

            onError:
              (
                error
              ) => {
                serverReadError =
                  error;
              },

            onLateData:
              applyLateServerData,
          }
        );

      console.log(
        'GOOGLE LOGIN SERVER STATUS',
        {
          uid:
            user.uid,

          serverTimedOut,
          serverReadSucceeded,
          serverDocumentExists,

          serverErrorCode:
            serverReadError
              ?.code ??
            null,

          wasGuestBeforeLogin,
          previousBelongsToUser,
        }
      );

      /*
       * 1. 서버 읽기가 정상 완료된 경우
       *
       * 문서 존재 여부를 정확히 확인했으므로
       * 기존 사용자와 신규 사용자를 안전하게
       * 구분할 수 있습니다.
       */
      if (
        serverReadSucceeded
      ) {
        /*
         * 기존 Google 사용자이고 서버에 하루 데이터가 있으면
         * 서버 하루 데이터를 복원합니다.
         *
         * 게스트 → Google 전환에서는 현재 기기의
         * 게스트 하루 기록을 우선 유지합니다.
         */
        if (
  serverDocumentExists &&
  !wasGuestBeforeLogin
) {
  await reconcileDailyDataAfterServerRead({
    serverData,

    reason:
      'manual-google-existing-user',

    allowServerRestore:
      true,
  });
}

        const sourceData =
          serverDocumentExists
            ? mergeRootData(
                safeLocalRoot,
                serverData,
                user.uid,
                wasGuestBeforeLogin
              )
            : safeLocalRoot;

        const normalizedSourceData =
          normalizeRootArrays(
            sourceData
          );

        const finalData =
          makeGoogleLoginData(
            normalizedSourceData,
            safeLocalRoot,
            serverData,
            user
          );

        console.log(
          serverDocumentExists
            ? 'GOOGLE LOGIN VERIFIED EXISTING USER'
            : 'GOOGLE LOGIN VERIFIED NEW USER',
          {
            uid:
              user.uid,

            wasGuestBeforeLogin,

            actionGoalCount:
              finalData
                ?.actionGoals
                ?.length ??
              0,

            actionLogCount:
              finalData
                ?.actionLogs
                ?.length ??
              0,

            archivedGoalCount:
              finalData
                ?.archivedActionGoals
                ?.length ??
              0,
          }
        );

        const currentAuthUid =
  firebaseAuth
    .currentUser
    ?.uid ??
  null;

        if (
          !currentAuthUid ||
          String(
            currentAuthUid
          ) !==
            String(
              user.uid
            )
        ) {
          throw new Error(
            'AUTH_UID_MISMATCH_BEFORE_USER_SAVE'
          );
        }

        const finalDataWithExploration =
          await applyExplorationDataAfterLogin({
            uid:
              user.uid,

            finalData,

            serverData,

            reason:
              serverDocumentExists
                ? 'manual-google-existing-user'
                : 'manual-google-new-user',

            allowDeviceLocalExploration:
              wasGuestBeforeLogin ||
              previousBelongsToUser,
          });

        await AsyncStorage
          .setItem(
            'daily_reload_signal',
            Date.now()
              .toString()
          );

        /*
         * 서버 읽기는 이미 성공했으므로
         * 병합 결과를 안전하게 저장할 수 있습니다.
         *
         * 화면 이동을 막지 않도록 백그라운드에서 저장합니다.
         */
        void saveMergedRootDataToServer(
          user.uid,
          finalDataWithExploration,
          serverDocumentExists
            ? 'manual-google-existing-user'
            : 'manual-google-new-user'
        )
          .then(
            () => {
              return syncDailyDataToServer();
            }
          )
          .catch(
            (
              error: any
            ) => {
              console.log(
                'GOOGLE LOGIN VERIFIED SERVER SAVE ERROR',
                {
                  uid:
                    user.uid,

                  code:
                    error
                      ?.code ??
                    null,

                  message:
                    error
                      ?.message ??
                    String(
                      error
                    ),
                }
              );
            }
          );

        moveAfterGoogleLogin(
          finalDataWithExploration
        );

        return;
      }

      /*
       * 2. 서버가 15초 안에 응답하지 않은 경우
       *
       * 현재 로그인한 Google UID와 같은 로컬 데이터가
       * 있을 때만 로컬로 먼저 들어갑니다.
       *
       * 게스트 데이터나 다른 계정 데이터는
       * 서버 상태를 확인하지 못한 채 변환하지 않습니다.
       */
      if (
        serverTimedOut &&
        previousBelongsToUser
      ) {
        const normalizedLocalData =
          normalizeRootArrays(
            previousRoot
          );

        const localFinalData =
          makeGoogleLoginData(
            normalizedLocalData,
            previousRoot,
            null,
            user
          );

        await saveRootOnboardingData(
          localFinalData
        );

        await AsyncStorage
          .setItem(
            'daily_reload_signal',
            Date.now()
              .toString()
          );

        console.log(
          'GOOGLE LOGIN LOCAL FALLBACK USED',
          {
            uid:
              user.uid,

            reason:
              'server-timeout',

            actionGoalCount:
              localFinalData
                ?.actionGoals
                ?.length ??
              0,

            actionLogCount:
              localFinalData
                ?.actionLogs
                ?.length ??
              0,
          }
        );

        /*
         * 서버 내용은 아직 확인되지 않았으므로
         * 지금은 서버에 저장하지 않습니다.
         *
         * 서버 응답이 늦게 도착하면
         * applyLateServerData에서 병합 후 저장합니다.
         */
        moveAfterGoogleLogin(
          localFinalData
        );

        return;
      }

      /*
       * 3. 서버가 오류를 반환했지만
       * 동일 UID의 로컬 데이터가 있는 경우
       *
       * 로컬 데이터로 앱은 사용할 수 있게 하되,
       * 서버 상태를 알 수 없으므로 서버 저장은 하지 않습니다.
       */
      if (
        serverReadError &&
        previousBelongsToUser
      ) {
        const normalizedLocalData =
          normalizeRootArrays(
            previousRoot
          );

        const localFinalData =
          makeGoogleLoginData(
            normalizedLocalData,
            previousRoot,
            null,
            user
          );

        await saveRootOnboardingData(
          localFinalData
        );

        await AsyncStorage
          .setItem(
            'daily_reload_signal',
            Date.now()
              .toString()
          );

        console.log(
          'GOOGLE LOGIN LOCAL FALLBACK USED',
          {
            uid:
              user.uid,

            reason:
              'server-error',

            errorCode:
              serverReadError
                ?.code ??
              null,
          }
        );

        moveAfterGoogleLogin(
          localFinalData
        );

        return;
      }

      /*
       * 4. 서버 상태를 확인하지 못했고,
       * 같은 UID의 안전한 로컬 데이터도 없는 경우
       *
       * 인증은 유지하고 기존 로컬 상태도 보존합니다.
       * 진행 중인 원래 요청과 2초·5초·10초 재시도가
       * 서버 상태를 확인하면 applyLateServerData에서
       * 안전하게 로그인을 완료합니다.
       */
      console.log(
        'ROOT AUTH V1.0 LOGIN DEFERRED: SERVER STATUS UNVERIFIED',
        {
          uid:
            user.uid,

          serverTimedOut,

          serverErrorCode:
            serverReadError
              ?.code ??
            null,

          wasGuestBeforeLogin,
          previousBelongsToUser,
        }
      );

      /*
       * 로그인 전 게스트 또는 기존 로컬 상태는 보존하되,
       * Firebase·Google 인증 세션은 유지합니다.
       */
      if (
        previousRoot
      ) {
        await saveRootOnboardingData(
          previousRoot
        );
      }

      const serverRetryScheduled =
        serverTimedOut ||
        isTransientRootAuthServerError(
          serverReadError
        );

      Alert.alert(
        serverRetryScheduled
          ? '로그인 연결 재시도 중'
          : '계정 데이터 확인 필요',
        serverRetryScheduled
          ? 'Google 로그인은 유지했어요. 계정 데이터를 백그라운드에서 다시 확인하고 있으며 연결되면 자동으로 계속 진행합니다.'
          : `Google 로그인은 유지했지만 ${
              serverReadError?.code ??
              '서버 오류'
            } 때문에 계정 데이터를 읽지 못했어요. 네트워크와 계정 권한을 확인한 뒤 다시 시도해 주세요.`,
      );
    } catch (
      error: any
    ) {
      console.log(
        'GOOGLE LOGIN ERROR',
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

      Alert.alert(
        '로그인 실패',
        `${
          error?.code ??
          '오류코드 없음'
        }\n${
          error?.message ??
          '메시지 없음'
        }`
      );
    } finally {
      setGoogleLoading(
        false
      );
    }
  };

  const primaryButtonTheme = {
    backgroundColor: theme.button,
    borderColor: theme.strongLine,
    borderWidth: 1,
    borderRadius: isCityBlack ? 4 : 18,
  };

  const secondaryButtonTheme = {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: isCityBlack ? 4 : 18,
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <View
          style={[
            styles.loadingContentCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack
                ? 4
                : 28,
            },
          ]}
        >
          <Text style={styles.loadingLogo}>
            🌱
          </Text>

          <Text
            style={[
              styles.loadingTitle,
              { color: theme.text },
            ]}
          >
            루트 불러오는 중...
          </Text>

          <Text
            style={[
              styles.loadingText,
              { color: theme.subText },
            ]}
          >
            목표와 마을을 준비하고 있어요
          </Text>

          <ActivityIndicator
            size="large"
            color={theme.button}
            style={{ marginTop: 22 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.loginCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.line,
            borderRadius: isCityBlack
              ? 4
              : 30,
          },
        ]}
      >
        <Text style={styles.logo}>
          🦊
        </Text>

        <Text
          style={[
            styles.title,
            { color: theme.text },
          ]}
        >
          루트
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: theme.subText },
          ]}
        >
          목표를 이루고{'\n'}
          나만의 마을을 성장시켜보세요
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.guestButton,
            primaryButtonTheme,
            {
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          onPress={handleGuestLogin}
        >
          <Text
            style={[
              styles.guestText,
              { color: theme.buttonText },
            ]}
          >
            게스트로 시작하기
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            secondaryButtonTheme,
            {
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          onPress={handleGoogleLogin}
        >
          <View style={styles.googleButtonRow}>
            <Text style={styles.googleIcon}>
              G
            </Text>

            <Text
              style={[
                styles.googleText,
                { color: theme.text },
              ]}
            >
              Google로 로그인
            </Text>
          </View>
        </Pressable>

        <Text
          style={[
            styles.loginGuide,
            { color: theme.mutedText },
          ]}
        >
          Google 로그인 시 기록을 안전하게 동기화할 수 있어요.
        </Text>
      </View>

      <Modal
        visible={googleLoading}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.loadingOverlay}>
          <View
            style={[
              styles.loadingBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack
                  ? 4
                  : 28,
              },
            ]}
          >
            <Text style={styles.loadingLogo}>
              🦊
            </Text>

            <Text
              style={[
                styles.loadingTitle,
                { color: theme.text },
              ]}
            >
              Google 로그인 중...
            </Text>

            <Text
              style={[
                styles.loadingText,
                { color: theme.subText },
              ]}
            >
              데이터를 불러오고 있어요
            </Text>

            <ActivityIndicator
              size="large"
              color={theme.button}
              style={{ marginTop: 18 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },

  loginCard: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
  },

  logo: {
    fontSize: 80,
    textAlign: 'center',
  },

  title: {
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    lineHeight: 28,
    marginBottom: 36,
  },

  guestButton: {
    paddingVertical: 18,
    marginBottom: 12,
    alignItems: 'center',
  },

  guestText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
  },

  googleButton: {
    paddingVertical: 17,
    marginBottom: 12,
    alignItems: 'center',
  },

  googleButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  googleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    color: '#4285f4',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },

  googleText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
  },

  loginGuide: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingContentCard: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 28,
    paddingVertical: 34,
    alignItems: 'center',
    borderWidth: 1,
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingBox: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },

  loadingLogo: {
    fontSize: 54,
    marginBottom: 18,
  },

  loadingTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
