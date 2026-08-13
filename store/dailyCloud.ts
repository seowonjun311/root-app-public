import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getAuth,
  getIdToken,
} from '@react-native-firebase/auth';

import {
  getApp,
} from '@react-native-firebase/app';

import {
  doc,
  enableNetwork,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';


import { getRootOnboardingData } from './rootMemory';

import {
  getRootCloudUidOrNull,
} from './rootCloudSession';

// ROOT_EXPLORE_V12D91A_DAILY_EFFECTIVE_FIREBASE_USER_BOUNDARY
function getRootEffectiveDailyFirebaseUser() {
  const cloudUid =
    getRootCloudUidOrNull();

  if (!cloudUid) {
    return null;
  }

  const firebaseUser =
    getAuth(getApp()).currentUser;

  if (
    !firebaseUser?.uid ||
    firebaseUser.uid !==
      cloudUid
  ) {
    return null;
  }

  return firebaseUser;
}

const DAILY_STORAGE_KEYS = {
  timeRecords:
    'daily_time_records_v1',

  recordColors:
    'daily_record_colors_v1',

  todos:
    'daily_todos_v1',

  story:
    'daily_story_v1',

  ledger:
    'daily_ledger_v1',

  ledgerBudgets:
    'daily_ledger_budgets_v1',

  meals:
    'daily_meals_v1',

  sleep:
    'daily_sleep_v1',

  waterLogs:
    'root_water_logs',

  weightLogs:
    'root_weight_logs',

  calorieProfile:
    'daily_calorie_profile_v1',

  exerciseCalories:
    'daily_exercise_calories_v1',

  exerciseCalorieLogs:
    'daily_exercise_calorie_logs_v1',

  sleepStartAt:
    'daily_sleep_start_at_v1',

  waterEnabled:
    'root_water_enabled',

  weightEnabled:
    'root_weight_enabled',

  stepLogs:
    'root_step_logs',

  stepEnabled:
    'root_step_enabled',

  showSleep:
    'daily_show_sleep_v1',

  showLedger:
    'daily_show_ledger_v1',

  showStory:
    'daily_show_story_v1',

  showMeal:
    'daily_show_meal_v1',

  showWeather:
    'daily_show_weather_v1',

  showTimeGrid:
    'daily_show_time_grid_v1',
} as const;

/*
 * 로컬 하루 데이터가 아직 서버에
 * 완전히 저장되지 않았음을 표시합니다.
 */
const DAILY_SYNC_PENDING_KEY =
  'daily_sync_pending_v1';

/*
 * 로컬 하루 데이터가 마지막으로
 * 변경된 시각입니다.
 */
const DAILY_LOCAL_UPDATED_AT_KEY =
  'daily_local_updated_at_v1';

/*
 * 서버 저장이 실제로 완료된
 * 마지막 로컬 변경 시각입니다.
 */
const DAILY_LAST_SYNCED_AT_KEY =
  'daily_last_synced_at_v1';

/*
 * 15초가 지나면 실패시키는 것이 아니라
 * 서버 응답이 느리다는 로그만 표시합니다.
 */
const DAILY_SYNC_SLOW_WARNING_MS =
  15000;

const DAILY_SYNC_HARD_TIMEOUT_MS =
  20000;

const DAILY_REST_TOKEN_TIMEOUT_MS =
  10000;

const DAILY_REST_WRITE_TIMEOUT_MS =
  20000;

type DailyDataKey =
  keyof typeof DAILY_STORAGE_KEYS;

type DailyServerData = Record<
  DailyDataKey,
  string
>;

export type DailySyncRestoreDecision = {
  pending:
    boolean;

  localUpdatedAt:
    string | null;

  lastSyncedAt:
    string | null;

  serverUpdatedAt:
    string | null;

  localIsNewer:
    boolean;

  shouldRestoreServer:
    boolean;

  shouldRetryLocalSync:
    boolean;
};

let runningSync:
  | Promise<void>
  | null =
  null;

let syncRequested =
  false;

/*
 * 동기화 요청이 새로 들어올 때마다 증가합니다.
 * 저장 중 추가 변경이 발생했는지 판별합니다.
 */
let syncRequestVersion =
  0;

function safe(
  value:
    | string
    | null
    | undefined
) {
  return value ?? '';
}

function parseDateTime(
  value:
    unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  /*
   * Firestore Timestamp 형식도 지원합니다.
   */
  if (
    typeof (
      value as any
    )?.toDate ===
    'function'
  ) {
    const date =
      (
        value as any
      ).toDate();

    const time =
      date?.getTime?.();

    return Number.isFinite(
      time
    )
      ? time
      : 0;
  }

  if (
    typeof (
      value as any
    )?.seconds ===
    'number'
  ) {
    return (
      Number(
        (
          value as any
        ).seconds
      ) *
      1000
    );
  }

  const parsed =
    new Date(
      String(
        value
      )
    ).getTime();

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function withTimeout<T>(
  promise:
    Promise<T>,

  timeoutMs:
    number,

  errorMessage:
    string
): Promise<T> {
  return new Promise<T>(
    (
      resolve,
      reject
    ) => {
      const timer =
        setTimeout(
          () => {
            reject(
              new Error(
                errorMessage
              )
            );
          },

          timeoutMs
        );

      promise
        .then(
          value => {
            clearTimeout(
              timer
            );

            resolve(
              value
            );
          }
        )
        .catch(
          error => {
            clearTimeout(
              timer
            );

            reject(
              error
            );
          }
        );
    }
  );
}

/*
 * 네이티브 Firestore 연결이 오래 멈춘 경우
 * 일반 HTTPS 기반 Firestore REST API로
 * dailyData와 dailyUpdatedAt만 갱신합니다.
 *
 * updateMask를 사용하므로 기존 rootData,
 * explorationData 등의 다른 필드는 건드리지 않습니다.
 */
async function writeDailyDataWithRest({
  authUid,
  dailyData,
  localUpdatedAt,
}: {
  authUid:
    string;

  dailyData:
    DailyServerData;

  localUpdatedAt:
    string;
}) {
  const currentUser =
  getRootEffectiveDailyFirebaseUser();

  if (
    !currentUser?.uid
  ) {
    throw new Error(
      'DAILY_FIRESTORE_REST_LOGIN_REQUIRED'
    );
  }

  if (
    String(
      currentUser.uid
    ) !==
    String(
      authUid
    )
  ) {
    throw new Error(
      'DAILY_FIRESTORE_REST_UID_MISMATCH'
    );
  }

  const projectId =
    getApp()
      .options
      .projectId;

  if (
    !projectId
  ) {
    throw new Error(
      'DAILY_FIRESTORE_PROJECT_ID_NOT_FOUND'
    );
  }

  /*
   * 현재 Firebase 사용자 토큰을 사용합니다.
   */
  const token =
  await withTimeout(
    getIdToken(
      currentUser,
      false
    ),

    DAILY_REST_TOKEN_TIMEOUT_MS,

    'DAILY_FIRESTORE_REST_TOKEN_TIMEOUT'
  );

  /*
   * DailyServerData의 값은 모두 문자열이므로
   * Firestore REST 문자열 필드로 변환합니다.
   */
  const dailyFields =
    Object.fromEntries(
      Object.entries(
        dailyData
      ).map(
        ([
          key,
          value,
        ]) => [
          key,

          {
            stringValue:
              String(
                value ?? ''
              ),
          },
        ]
      )
    );

  const url =
    `https://firestore.googleapis.com/v1/` +
    `projects/${encodeURIComponent(
      String(
        projectId
      )
    )}/` +
    `databases/(default)/documents/` +
    `users/${encodeURIComponent(
      authUid
    )}` +
    `?updateMask.fieldPaths=dailyData` +
    `&updateMask.fieldPaths=dailyUpdatedAt`;

  const response =
    await withTimeout(
      fetch(
        url,
        {
          method:
            'PATCH',

          headers: {
            Authorization:
              `Bearer ${token}`,

            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              fields: {
                dailyData: {
                  mapValue: {
                    fields:
                      dailyFields,
                  },
                },

                dailyUpdatedAt: {
                  stringValue:
                    localUpdatedAt,
                },
              },
            }),
        }
      ),

      DAILY_REST_WRITE_TIMEOUT_MS,

      'DAILY_FIRESTORE_REST_WRITE_TIMEOUT'
    );

  const responseText =
    await response.text();

  if (
    !response.ok
  ) {
    throw new Error(
      `DAILY_FIRESTORE_REST_WRITE_${response.status}: ` +
      responseText
    );
  }

  console.log(
    'dailyData saved via Firestore REST',
    {
      authUid,

      localUpdatedAt,

      status:
        response.status,
    }
  );
}


async function readDailyStorageData(): Promise<DailyServerData> {
  const entries =
    Object.entries(
      DAILY_STORAGE_KEYS
    ) as Array<
      [
        DailyDataKey,
        (
          typeof DAILY_STORAGE_KEYS
        )[DailyDataKey]
      ]
    >;

  const storageKeys =
    entries.map(
      (
        [
          ,
          storageKey,
        ]
      ) =>
        storageKey
    );

  const storedPairs =
    await AsyncStorage.multiGet(
      storageKeys
    );

  const storedMap =
    new Map<
      string,
      string | null
    >(
      storedPairs
    );

  return entries.reduce(
    (
      result,
      [
        field,
        storageKey,
      ]
    ) => {
      result[field] =
        safe(
          storedMap.get(
            storageKey
          )
        );

      return result;
    },
    {} as DailyServerData
  );
}

/*
 * 로그인에서 서버 하루 데이터를
 * 복원해도 되는지 판단합니다.
 */
export const getDailySyncRestoreDecision =
  async (
    serverUpdatedAt:
      unknown
  ): Promise<DailySyncRestoreDecision> => {
    const pairs =
      await AsyncStorage.multiGet([
        DAILY_SYNC_PENDING_KEY,
        DAILY_LOCAL_UPDATED_AT_KEY,
        DAILY_LAST_SYNCED_AT_KEY,
      ]);

    const map =
      new Map(
        pairs
      );

    const pending =
      map.get(
        DAILY_SYNC_PENDING_KEY
      ) ===
      'true';

    const localUpdatedAt =
      map.get(
        DAILY_LOCAL_UPDATED_AT_KEY
      ) ??
      null;

    const lastSyncedAt =
      map.get(
        DAILY_LAST_SYNCED_AT_KEY
      ) ??
      null;

    const normalizedServerUpdatedAt =
      serverUpdatedAt
        ? String(
            serverUpdatedAt
          )
        : null;

    const localTime =
      parseDateTime(
        localUpdatedAt
      );

    const serverTime =
      parseDateTime(
        serverUpdatedAt
      );

    /*
     * 양쪽 시각이 모두 있을 때만
     * 로컬이 더 최신인지 비교합니다.
     */
    const localIsNewer =
      localTime > 0 &&
      serverTime > 0 &&
      localTime >
        serverTime;

    /*
     * 전송 대기 중이거나
     * 로컬 수정 시각이 서버보다 최신이면
     * 서버 데이터로 덮어쓰면 안 됩니다.
     */
    const keepLocal =
      pending ||
      localIsNewer;

    return {
      pending,

      localUpdatedAt,

      lastSyncedAt,

      serverUpdatedAt:
        normalizedServerUpdatedAt,

      localIsNewer,

      shouldRestoreServer:
        !keepLocal,

      shouldRetryLocalSync:
        keepLocal,
    };
  };

async function performDailySync(): Promise<
  string | null
> {
  console.log(
    'syncDailyDataToServer START'
  );

  const currentUser =
  getRootEffectiveDailyFirebaseUser();

  const rootData =
    getRootOnboardingData();

  const authUid =
    currentUser
      ?.uid ??
    null;

  const localUid =
    rootData?.uid
      ? String(
          rootData.uid
        )
      : null;

  console.log(
    'current auth uid:',
    authUid
  );

  console.log(
    'root uid:',
    localUid
  );

  console.log(
    'daily sync uid:',
    authUid
  );

  /*
   * 로그인되지 않았으면 서버 저장은 보류합니다.
   * pending은 유지되므로 로그인 후 다시 시도됩니다.
   */
  if (
    !authUid
  ) {
    console.log(
      'Firebase Auth 로그인 상태가 아니라서 dailyData 서버 저장 보류'
    );

    return null;
  }

  /*
   * 다른 계정의 로컬 데이터를
   * 현재 Firebase 계정에 저장하지 않습니다.
   */
  if (
    localUid &&
    localUid !==
      authUid
  ) {
    console.log(
      '로컬 UID와 Firebase Auth UID가 달라서 dailyData 서버 저장 보류',
      {
        localUid,
        authUid,
      }
    );

    return null;
  }

  const [
    dailyData,
    storedLocalUpdatedAt,
  ] =
    await Promise.all([
      readDailyStorageData(),

      AsyncStorage.getItem(
        DAILY_LOCAL_UPDATED_AT_KEY
      ),
    ]);

  const localUpdatedAt =
    storedLocalUpdatedAt ??
    new Date()
      .toISOString();

  console.log(
    'daily todos raw:',
    dailyData.todos
  );

  const db =
  getFirestore(
    getApp()
  );

const writeStartedAt =
  Date.now();

let savedTransport:
  'native' |
  'rest' =
  'native';

/*
 * 혹시 Firestore 네트워크가 중단된 상태라면
 * 다시 활성화합니다.
 *
 * 활성화 완료를 기다리느라 저장이 막히지 않도록
 * 별도 Promise로 실행합니다.
 */
void enableNetwork(
  db
)
  .then(
    () => {
      console.log(
        'DAILY FIRESTORE NETWORK ENABLED'
      );
    }
  )
  .catch(
    (
      networkError: any
    ) => {
      console.log(
        'DAILY FIRESTORE ENABLE NETWORK ERROR',
        {
          code:
            networkError
              ?.code ??
            null,

          message:
            networkError
              ?.message ??
            String(
              networkError
            ),
        }
      );
    }
  );

/*
 * 15초에는 실패시키지 않고
 * 느린 연결임을 표시합니다.
 */
const slowWarningTimer =
  setTimeout(
    () => {
      console.log(
        'DAILY_FIRESTORE_WRITE_SLOW',
        {
          authUid,

          localUpdatedAt,

          waitingMs:
            Date.now() -
            writeStartedAt,
        }
      );
    },

    DAILY_SYNC_SLOW_WARNING_MS
  );

try {
  try {
    /*
     * 우선 기존 네이티브 Firestore로 저장합니다.
     */
    await withTimeout(
  setDoc(
    doc(
      db,
      'users',
      authUid
    ),
    {
      dailyData,

      /*
       * 실제 로컬 변경 시각을
       * 서버의 비교 시각으로 저장합니다.
       */
      dailyUpdatedAt:
        localUpdatedAt,
    },
    {
      merge:
        true,
    }
  ),

  DAILY_SYNC_HARD_TIMEOUT_MS,

  'DAILY_FIRESTORE_WRITE_TIMEOUT'
);
  } catch (
    nativeWriteError: any
  ) {
    const message =
      nativeWriteError
        ?.message ??
      String(
        nativeWriteError
      );

    /*
     * 권한 오류 등 실제 Firestore 오류는
     * REST로 숨기지 않고 그대로 전달합니다.
     */
    if (
      message !==
      'DAILY_FIRESTORE_WRITE_TIMEOUT'
    ) {
      throw nativeWriteError;
    }

    console.log(
      'DAILY FIRESTORE NATIVE WRITE TIMEOUT: REST FALLBACK START',
      {
        authUid,

        localUpdatedAt,

        elapsedMs:
          Date.now() -
          writeStartedAt,
      }
    );

    savedTransport =
      'rest';

    /*
     * 네이티브 Firestore 연결만 멈춘 경우를 대비해
     * 일반 HTTPS REST 저장을 실행합니다.
     */
    await writeDailyDataWithRest({
      authUid,

      dailyData,

      localUpdatedAt,
    });
  }
} finally {
  clearTimeout(
    slowWarningTimer
  );
}

console.log(
  'dailyData saved to Firestore',
  {
    localUpdatedAt,

    elapsedMs:
      Date.now() -
      writeStartedAt,

    transport:
      savedTransport,
  }
);

  return localUpdatedAt;
}

async function runDailySyncLoop() {
  while (
    true
  ) {
    const targetVersion =
      syncRequestVersion;

    syncRequested =
      false;

    let syncedAt:
      string | null =
      null;

    try {
      syncedAt =
        await performDailySync();
    } catch (
      error
    ) {
      /*
       * 오류를 삼키지 않고 호출자에게 전달합니다.
       * pending 표시는 그대로 유지됩니다.
       */
      console.log(
        'dailyData save error',
        error
      );

      throw error;
    }

    /*
     * 로그인되지 않은 상태 등으로
     * 서버 저장을 보류한 경우입니다.
     */
    if (
      !syncedAt
    ) {
      return;
    }

    /*
     * 저장 중 새 데이터 변경이 발생했다면
     * 최신 AsyncStorage를 다시 읽어 저장합니다.
     */
    if (
      targetVersion !==
        syncRequestVersion ||
      syncRequested
    ) {
      console.log(
        'dailyData 최신 변경 재동기화 실행'
      );

      continue;
    }

    /*
     * 가장 최신 변경까지 저장된 것으로 확인되면
     * 마지막 동기화 시각을 기록하고 pending을 제거합니다.
     */
    await AsyncStorage.setItem(
      DAILY_LAST_SYNCED_AT_KEY,
      syncedAt
    );

    await AsyncStorage.removeItem(
      DAILY_SYNC_PENDING_KEY
    );

    /*
     * pending 제거 도중 또 다른 저장 요청이
     * 들어왔는지 마지막으로 다시 확인합니다.
     */
    if (
      targetVersion ===
        syncRequestVersion &&
      !syncRequested
    ) {
      console.log(
        'DAILY SYNC STATE CLEAN',
        {
          syncedAt,
          version:
            targetVersion,
        }
      );

      return;
    }

    /*
     * pending 제거 직전에 새 요청이 들어온 경우
     * 다시 pending을 활성화하고 반복합니다.
     */
    await AsyncStorage.setItem(
      DAILY_SYNC_PENDING_KEY,
      'true'
    );
  }
}

export const syncDailyDataToServer =
  async (): Promise<void> => {
    const requestVersion =
      ++syncRequestVersion;

    syncRequested =
      true;

    const localUpdatedAt =
      new Date()
        .toISOString();

    /*
     * 서버 저장을 시작하기 전에
     * 로컬 변경 상태를 먼저 기록합니다.
     *
     * 앱이 바로 종료되어도 다음 실행에서
     * 오래된 서버 데이터가 로컬을 덮지 못합니다.
     */
    await AsyncStorage.multiSet([
      [
        DAILY_SYNC_PENDING_KEY,
        'true',
      ],

      [
        DAILY_LOCAL_UPDATED_AT_KEY,
        localUpdatedAt,
      ],
    ]);

    console.log(
      'DAILY LOCAL CHANGE MARKED',
      {
        requestVersion,
        localUpdatedAt,
      }
    );

    if (
      !runningSync
    ) {
      runningSync =
        runDailySyncLoop()
          .finally(
            () => {
              runningSync =
                null;
            }
          );
    } else {
      console.log(
        'dailyData 동기화 진행 중 · 최신 데이터 재동기화 예약',
        {
          requestVersion,
        }
      );
    }

    return runningSync;
  };
