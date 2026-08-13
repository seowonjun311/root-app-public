import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';

import {
  getAuth,
  getIdToken,
} from '@react-native-firebase/auth';

import firestore, {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';
import {
  bestEffortSyncOwnRootUserPublicProfile,
  shouldSyncRootUserPublicProfileFromMerge,
} from './rootUserPublicProfileSync';


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

const getUserDocumentRef =
  (
    uid: string
  ) =>
    doc(
      firebaseDb,
      'users',
      String(
        uid
      )
    );

const mergeUserDocument =
  async (
    uid: string,
    data: Record<
      string,
      any
    >
  ) => {
    await setDoc(
      getUserDocumentRef(
        uid
      ),
      data,
      {
        merge:
          true,
      }
    );
    // ROOT_EXPLORE_V12D7_ROOT_MEMORY_PROFILE_SYNC
    if (
      shouldSyncRootUserPublicProfileFromMerge(
        data,
      )
    ) {
      const profileSync =
        await bestEffortSyncOwnRootUserPublicProfile(
          uid,
        );

      if (
        !profileSync.ok
      ) {
        console.log(
          'ROOT PUBLIC PROFILE BEST-EFFORT SYNC RESULT',
          {
            reason:
              profileSync.reason,
          },
        );
      }
    }

  };

let onboardingData: any = null;

const ROOT_ONBOARDING_KEY = 'root_onboarding_data';
const ROOT_CREW_POSTS_KEY = 'root_crew_posts_v1';

/*
 * 뱃지는 로그인 UID별로 분리해서 저장합니다.
 * v1 공용 키는 기존 계정의 확인 이력을 한 번만 이전할 때만 사용합니다.
 */
const ROOT_SEEN_BADGE_IDS_KEY_PREFIX =
  'root_seen_badge_ids_v2';
const ROOT_LEGACY_SEEN_BADGE_IDS_KEY =
  'root_seen_badge_ids_v1';
const ROOT_BADGE_MIGRATION_OWNER_KEY =
  'root_badge_migration_owner_v2';
const ROOT_MAIN_BADGE_ID_KEY_PREFIX =
  'root_main_badge_id_v2';
const ROOT_EARNED_BADGE_IDS_KEY_PREFIX =
  'root_earned_badge_ids_v3';
const ROOT_BADGE_RECOVERY_OWNER_KEY =
  'root_badge_recovery_owner_v3';

let persistedEarnedBadgeOwnerId:
  | string
  | null = null;
let persistedEarnedBadgeIds: string[] = [];

function getCurrentBadgeOwnerId(): string | null {
  const authUid = firebaseAuth.currentUser?.uid;

  if (authUid) {
    return String(authUid);
  }

  const guestId = onboardingData?.guestId;

  if (guestId) {
    return `guest:${String(guestId)}`;
  }

  return null;
}

function getOnboardingOwnerId(): string | null {
  if (onboardingData?.uid) {
    return String(onboardingData.uid);
  }

  if (onboardingData?.guestId) {
    return `guest:${String(onboardingData.guestId)}`;
  }

  return null;
}

function isCurrentBadgeOwner(
  ownerId: string
) {
  return (
    getOnboardingOwnerId() ===
    String(ownerId)
  );
}

function getSeenBadgeStorageKey(
  ownerId: string
) {
  return (
    `${ROOT_SEEN_BADGE_IDS_KEY_PREFIX}:` +
    String(ownerId)
  );
}

function getMainBadgeStorageKey(
  ownerId: string
) {
  return (
    `${ROOT_MAIN_BADGE_ID_KEY_PREFIX}:` +
    String(ownerId)
  );
}

function getEarnedBadgeStorageKey(
  ownerId: string
) {
  return (
    `${ROOT_EARNED_BADGE_IDS_KEY_PREFIX}:` +
    String(ownerId)
  );
}

function safeJsonParse<T>(
  raw: string | null,
  fallback: T
): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.log('ROOT MEMORY JSON PARSE ERROR', error);
    return fallback;
  }
}

async function saveJson(
  key: string,
  value: unknown
) {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.log('ROOT MEMORY STORAGE SAVE ERROR', {
      key,
      error,
    });
    throw error;
  }
}

async function loadJson<T>(
  key: string,
  fallback: T
): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return safeJsonParse(raw, fallback);
  } catch (error) {
    console.log('ROOT MEMORY STORAGE LOAD ERROR', {
      key,
      error,
    });
    return fallback;
  }
}

async function resolveWithTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number,
  timeoutLog: string
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;

      settled = true;
      console.log(timeoutLog);
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;

        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;

        settled = true;
        clearTimeout(timer);
        console.log(
          'ROOT MEMORY ASYNC LOAD ERROR',
          error
        );
        resolve(fallback);
      });
  });
}

async function rejectWriteWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorCode: string
): Promise<T> {
  let timeoutId:
    | ReturnType<
        typeof setTimeout
      >
    | null = null;

  const timeoutPromise =
    new Promise<never>(
      (
        _resolve,
        reject
      ) => {
        timeoutId =
          setTimeout(
            () => {
              reject(
                new Error(
                  errorCode
                )
              );
            },
            timeoutMs
          );
      }
    );

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(
        timeoutId
      );
    }
  }
}

function toFirestoreRestValue(
  value: any
): any {
  if (value === null) {
    return {
      nullValue: null,
    };
  }

  if (
    typeof value ===
    'string'
  ) {
    return {
      stringValue: value,
    };
  }

  if (
    typeof value ===
    'boolean'
  ) {
    return {
      booleanValue: value,
    };
  }

  if (
    typeof value ===
    'number'
  ) {
    if (
      !Number.isFinite(
        value
      )
    ) {
      return {
        nullValue: null,
      };
    }

    return Number.isInteger(
      value
    )
      ? {
          integerValue:
            String(value),
        }
      : {
          doubleValue:
            value,
        };
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return {
      arrayValue: {
        values:
          value
            .filter(
              (item) =>
                item !==
                undefined
            )
            .map(
              toFirestoreRestValue
            ),
      },
    };
  }

  if (
    typeof value ===
    'object'
  ) {
    const fields =
      Object.fromEntries(
        Object.entries(
          value
        )
          .filter(
            (
              [, item]
            ) =>
              item !==
              undefined
          )
          .map(
            (
              [key, item]
            ) => [
              key,
              toFirestoreRestValue(
                item
              ),
            ]
          )
      );

    return {
      mapValue: {
        fields,
      },
    };
  }

  return {
    stringValue:
      String(value),
  };
}

function toFirestoreRestFields(
  data: Record<
    string,
    any
  >
) {
  return Object.fromEntries(
    Object.entries(
      data
    )
      .filter(
        (
          [, value]
        ) =>
          value !==
          undefined
      )
      .map(
        (
          [key, value]
        ) => [
          key,
          toFirestoreRestValue(
            value
          ),
        ]
      )
  );
}

async function writeFirestoreRestDocument({
  collectionName,
  documentId,
  data,
  mergeFields,
}: {
  collectionName: string;
  documentId: string;
  data: Record<
    string,
    any
  >;
  mergeFields?:
    string[];
}) {
  const currentUser =
    firebaseAuth.currentUser;

  if (
    !currentUser?.uid
  ) {
    throw new Error(
      'FIRESTORE_REST_LOGIN_REQUIRED'
    );
  }

  const projectId =
    getApp()
      .options
      .projectId;

  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID_NOT_FOUND'
    );
  }

  const token =
  await rejectWriteWithTimeout(
    getIdToken(
      currentUser,
      false
    ),
    10000,
    'FIREBASE_AUTH_TOKEN_TIMEOUT'
  );

  const documentUrl =
  `https://firestore.googleapis.com/v1/` +
  `projects/${encodeURIComponent(
    String(
      projectId
    )
  )}/` +
  `databases/(default)/documents/` +
  `${encodeURIComponent(
    collectionName
  )}/` +
  `${encodeURIComponent(
    documentId
  )}`;

const updateMaskQuery =
  Array.isArray(
    mergeFields
  ) &&
  mergeFields.length > 0
    ? mergeFields
        .map(
          (
            field
          ) =>
            `updateMask.fieldPaths=` +
            encodeURIComponent(
              String(
                field
              )
            )
        )
        .join('&')
    : '';

const url =
  updateMaskQuery
    ? `${documentUrl}?${updateMaskQuery}`
    : documentUrl;

  const response =
    await rejectWriteWithTimeout(
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
              fields:
                toFirestoreRestFields(
                  data
                ),
            }),
        }
      ),
      15000,
      'FIRESTORE_REST_WRITE_TIMEOUT'
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `FIRESTORE_REST_WRITE_${response.status}: ` +
      responseText
    );
  }

  const savedDocument =
    JSON.parse(
      responseText
    );

  const expectedPhotoUri =
    String(
      data?.photoUri ??
        ''
    );

  const storedPhotoUri =
    String(
      savedDocument
        ?.fields
        ?.photoUri
        ?.stringValue ??
        ''
    );

  if (
    expectedPhotoUri &&
    storedPhotoUri !==
      expectedPhotoUri
  ) {
    throw new Error(
      'FIRESTORE_REST_WRITE_PHOTO_MISMATCH'
    );
  }

  console.log(
    'CREW POST REST WRITE SUCCESS',
    {
      documentId,

      expectedPhotoUri:
        expectedPhotoUri ||
        null,

      storedPhotoUri:
        storedPhotoUri ||
        null,
    }
  );

  return true;
}

async function hasFirestoreRestDocumentByStringField({
  collectionName,
  fieldPath,
  value,
}: {
  collectionName: string;
  fieldPath: string;
  value: string;
}) {
  const currentUser =
    firebaseAuth.currentUser;

  if (!currentUser?.uid) {
    throw new Error(
      'FIRESTORE_REST_LOGIN_REQUIRED'
    );
  }

  const projectId =
    getApp().options.projectId;

  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID_NOT_FOUND'
    );
  }

  const token =
    await rejectWriteWithTimeout(
      getIdToken(
        currentUser,
        false
      ),
      10000,
      'FIREBASE_AUTH_TOKEN_TIMEOUT'
    );

  const url =
    `https://firestore.googleapis.com/v1/` +
    `projects/${encodeURIComponent(
      String(projectId)
    )}/` +
    `databases/(default)/documents:runQuery`;

  const response =
    await rejectWriteWithTimeout(
      fetch(
        url,
        {
          method:
            'POST',

          headers: {
            Authorization:
              `Bearer ${token}`,

            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              structuredQuery: {
                from: [
                  {
                    collectionId:
                      collectionName,
                  },
                ],

                where: {
                  fieldFilter: {
                    field: {
                      fieldPath,
                    },

                    op:
                      'EQUAL',

                    value: {
                      stringValue:
                        String(value),
                    },
                  },
                },

                limit:
                  1,
              },
            }),
        }
      ),
      15000,
      'FIRESTORE_REST_QUERY_TIMEOUT'
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `FIRESTORE_REST_QUERY_${response.status}: ` +
      responseText
    );
  }

  const rows =
    responseText
      ? JSON.parse(
          responseText
        )
      : [];

  return (
    Array.isArray(rows) &&
    rows.some(
      (row: any) =>
        Boolean(
          row?.document?.name
        )
    )
  );
}

async function deleteFirestoreRestDocument({
  collectionName,
  documentId,
}: {
  collectionName: string;
  documentId: string;
}) {
  const currentUser =
    firebaseAuth.currentUser;

  if (!currentUser?.uid) {
    throw new Error(
      'FIRESTORE_REST_LOGIN_REQUIRED'
    );
  }

  const projectId =
    getApp().options.projectId;

  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID_NOT_FOUND'
    );
  }

  const token =
  await rejectWriteWithTimeout(
    getIdToken(
      currentUser,
      false
    ),
    10000,
    'FIREBASE_AUTH_TOKEN_TIMEOUT'
  );

  const url =
    `https://firestore.googleapis.com/v1/` +
    `projects/${encodeURIComponent(
      String(projectId)
    )}/` +
    `databases/(default)/documents/` +
    `${encodeURIComponent(
      collectionName
    )}/` +
    `${encodeURIComponent(
      documentId
    )}`;

  const response =
    await rejectWriteWithTimeout(
      fetch(
        url,
        {
          method: 'DELETE',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      ),
      15000,
      'FIRESTORE_REST_DELETE_TIMEOUT'
    );

  const responseText =
    await response.text();

  /*
   * 404는 이미 삭제된 상태이므로
   * 정상 완료로 처리합니다.
   */
  if (
    !response.ok &&
    response.status !== 404
  ) {
    throw new Error(
      `FIRESTORE_REST_DELETE_${response.status}: ` +
      responseText
    );
  }

  console.log(
    'CREW POST REST DELETE SUCCESS',
    {
      documentId,
      status:
        response.status,
    }
  );
}

export async function loadRootOnboardingData() {
  onboardingData = await loadJson<any | null>(
    ROOT_ONBOARDING_KEY,
    null
  );

  return onboardingData;
}

export async function saveRootOnboardingData(data: any) {
  onboardingData = data;

  await saveJson(
    ROOT_ONBOARDING_KEY,
    onboardingData
  );

  return onboardingData;
}

export type RootNotification = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  message: string;
};

export function setRootOnboardingData(data: any) {
  if (data === null || data === undefined) {
    return;
  }

  onboardingData = data;

  saveJson(
    ROOT_ONBOARDING_KEY,
    onboardingData
  ).catch((error) => {
    console.log(
      'SET ROOT ONBOARDING DATA ERROR',
      error
    );
  });
}

export async function clearRootOnboardingData() {
  onboardingData = null;

  try {
    await AsyncStorage.removeItem(
      ROOT_ONBOARDING_KEY
    );
  } catch (error) {
    console.log(
      'CLEAR ROOT ONBOARDING DATA ERROR',
      error
    );
  }
}

export function getRootOnboardingData() {
  return onboardingData;
}

export function getRootNotifications() {
  return onboardingData?.notifications ?? [];
}

export async function setRootNotifications(
  notifications: RootNotification[]
) {
  const currentUser = firebaseAuth.currentUser;

  onboardingData = {
    ...(onboardingData ?? {}),
    ...(currentUser?.uid ? { uid: currentUser.uid } : {}),
    notifications,
  };

  await AsyncStorage.setItem(
    ROOT_ONBOARDING_KEY,
    JSON.stringify(onboardingData)
  );

  if (currentUser?.uid) {
    try {
      await mergeUserDocument(
  currentUser.uid,
  {
    rootData:
      onboardingData,

    notifications,

    updatedAt:
      new Date()
        .toISOString(),
  }
);
    } catch (e) {
      console.log('SET ROOT NOTIFICATIONS SERVER SAVE ERROR', e);
    }
  }

  return onboardingData;
}

export function getRootActionLogs() {
  return onboardingData?.actionLogs ?? [];
}

export function setRootActionLogs(actionLogs: any[]) {
  onboardingData = {
    ...(onboardingData ?? {}),
    actionLogs,
  };

  AsyncStorage.setItem(
    ROOT_ONBOARDING_KEY,
    JSON.stringify(onboardingData)
  );

  return onboardingData;
}

export async function addRootActionLog(log: any) {
  console.log('ADD LOG CALLED', log);

  const currentUser = firebaseAuth.currentUser;

  const ownerId =
    currentUser?.uid
      ? String(currentUser.uid)
      : onboardingData?.guestId
      ? `guest:${String(
          onboardingData.guestId
        )}`
      : null;

  const prevLogs =
    onboardingData?.actionLogs ?? [];

  const ownedLog = {
    ...log,
    ...(ownerId
      ? { userId: String(ownerId) }
      : {}),
  };

  onboardingData = {
    ...(onboardingData ?? {}),
    ...(currentUser?.uid
      ? { uid: currentUser.uid }
      : {}),
    actionLogs: [ownedLog, ...prevLogs],
  };

  await AsyncStorage.setItem(
    ROOT_ONBOARDING_KEY,
    JSON.stringify(onboardingData)
  );

  if (currentUser?.uid) {
    try {
      await mergeUserDocument(
  currentUser.uid,
  {
    rootData:
      onboardingData,

    updatedAt:
      new Date()
        .toISOString(),
  }
);
    } catch (e) {
      console.log(
        'ADD ROOT ACTION LOG SERVER SAVE ERROR',
        e
      );
    }
  }

  console.log(
    'CURRENT LOGS',
    onboardingData.actionLogs.length
  );

  return onboardingData;
}


const SLEEP_RECORDS_KEY = 'root_sleep_records';

export type SleepMood = 'great' | 'good' | 'normal' | 'bad';

export type SleepRecord = {
  date: string;
  bedTime: string;
  wakeTime: string;
  sleepMinutes: number;
  mood: SleepMood;
  memo?: string;
};

export type ActionLog = {
  id: string;
  userId?: string;
  goalId?: string;
  actionGoalId: string;
  category: string;
  title: string;
  type: string;
  completedAt: string;
  date: string;
  minutes?: number;
  distanceKm?: number;
  calories?: number;
  pace?: number;
  photoUri?: string;
  decoratedPhotoUri?: string;
  routeCoordinates?: any[];
  [key: string]: any;
};



export function calculateSleepMinutes(bedTime: string, wakeTime: string) {
  const [bedHour, bedMinute] = bedTime.split(':').map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);

  let bedTotal = bedHour * 60 + bedMinute;
  let wakeTotal = wakeHour * 60 + wakeMinute;

  if (wakeTotal <= bedTotal) {
    wakeTotal += 24 * 60;
  }

  return wakeTotal - bedTotal;
}

export async function getSleepRecords(): Promise<SleepRecord[]> {
  const raw = await AsyncStorage.getItem(SLEEP_RECORDS_KEY);
  return safeJsonParse(raw, []);
}

export async function saveSleepRecord(record: SleepRecord) {
  const records = await getSleepRecords();

  const filtered = records.filter((item) => item.date !== record.date);
  const nextRecords = [record, ...filtered];

  await AsyncStorage.setItem(SLEEP_RECORDS_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export async function getSleepRecordByDate(date: string) {
  const records = await getSleepRecords();
  return records.find((item) => item.date === date) ?? null;
}

export function formatSleepMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}

export async function addRootPoints(points: number) {
  const currentUser = firebaseAuth.currentUser;

  onboardingData = {
    ...(onboardingData ?? {}),
    ...(currentUser?.uid ? { uid: currentUser.uid } : {}),
    testPoints: (onboardingData?.testPoints ?? 0) + points,
  };

  await AsyncStorage.setItem(
    ROOT_ONBOARDING_KEY,
    JSON.stringify(onboardingData)
  );

  if (!currentUser?.uid) {
    console.log(
      'ADD ROOT POINTS: 로그인 전이거나 게스트라서 서버 저장 생략'
    );
    return onboardingData;
  }

  try {
    await mergeUserDocument(
  currentUser.uid,
  {
    rootData:
      onboardingData,

    updatedAt:
      new Date()
        .toISOString(),
  }
);
  } catch (e) {
    console.log('ADD ROOT POINTS SERVER SAVE ERROR', e);
  }

  return onboardingData;
}

export type RootCrewPost = {
  id: string;
  sourceLogId: string;
  userId?: string;
  level?: number;
  placedBuildings?: any[];
  nickname?: string;
profileEmoji?: string;
  target: 'public' | 'crew';
  crewId: string | null;
  sharedCrewId?: string | null;
  category: string;
  title: string;
  date: string;
  minutes: number;
  distanceKm?: number;
  photoUri?: string | null;
routeImageUri?: string | null;
  routeCoordinates?: any[];
   memo?: string;
  shareMemo?: string;
  tags: string[];
  cheers: number;
  cheered?: boolean;
  status?: 'active' | 'hidden';
comments?: {
  id: string;
  text: string;
  nickname?: string;
  profileEmoji?: string;
  createdAt: string;
}[];
  createdAt: string;
  updatedAt?: string;
  syncStatus?:
  | 'pending'
  | 'synced'
  | 'failed';

syncError?: string | null;
};

export type RootCrewJoinRequest = {
  id: string;
  crewId: string;
  userId: string;
  nickname: string;
  profileEmoji?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
};

export type RootCrewReport = {
  id: string;
  postId: string;
  postTitle?: string;
  crewId?: string | null;
  reporterId: string;
  targetUserId?: string;
  targetNickname?: string;
  reason: string;
  detail?: string;
  status?: 'pending' | 'checked' | 'hidden' | 'rejected';
  createdAt: string;
  updatedAt?: string;
};

const ROOT_CREW_REPORTS_KEY = 'root_crew_reports_v1';

let rootCrewReports: RootCrewReport[] = [];

const ROOT_CREWS_KEY = 'root_crews_v1';

export type RootCrew = {
  id: string;
  title: string;
   icon?: string; // 추가
  category: 'exercise' | 'study' | 'mental' | 'daily';
  description: string;
  joinType: 'free' | 'approval';
  ownerId: string;
  ownerNickname: string;
  members: number;
  memberIds: string[];
  createdAt: string;
  notice?: string;
  noticeUpdatedAt?: string;
  goalHours?: number;
  goalUpdatedAt?: string;
  updatedAt?: string;

   deleteRequestedAt?: string | null;
};

let rootCrews: RootCrew[] = [];
let rootCrewJoinRequests: RootCrewJoinRequest[] = [];
const ROOT_CREW_JOIN_REQUESTS_KEY = 'root_crew_join_requests_v1';

export const loadRootCrews =
  async () => {
    let localCrews:
      RootCrew[] = [];

    try {
      const raw =
        await AsyncStorage.getItem(
          ROOT_CREWS_KEY
        );

      localCrews =
        safeJsonParse<
          RootCrew[]
        >(
          raw,
          []
        );

      rootCrews =
        localCrews;

      console.log(
        'CREW LOCAL LOAD SUCCESS',
        {
          count:
            rootCrews.length,
        }
      );
    } catch (
      localError
    ) {
      console.log(
        'CREW LOCAL LOAD ERROR',
        localError
      );

      localCrews = [];
      rootCrews = [];
    }

    /*
     * 크루 목록을 생성일 최신순으로
     * 불러오는 모듈형 쿼리입니다.
     */
    const crewListQuery =
      query(
        collection(
          firebaseDb,
          'crews'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    const serverLoadPromise =
      getDocs(
        crewListQuery
      )
        .then(
          async (
            snapshot
          ) => {
            const serverCrews =
              snapshot.docs.map(
                (
                  documentSnapshot
                ) => ({
                  id:
                    documentSnapshot
                      .id,

                  ...documentSnapshot
                    .data(),
                })
              ) as RootCrew[];

            rootCrews =
              serverCrews;

            await AsyncStorage.setItem(
              ROOT_CREWS_KEY,
              JSON.stringify(
                rootCrews
              )
            );

            console.log(
              'CREW SERVER LOAD SUCCESS',
              {
                count:
                  rootCrews.length,
              }
            );

            return rootCrews;
          }
        )
        .catch(
          (
            error
          ) => {
            console.log(
              'CREW SERVER LOAD ERROR',
              error
            );

            return localCrews;
          }
        );

    /*
     * Firestore 응답이 멈추더라도
     * 크루 화면 전체가 함께 멈추지 않도록
     * 최대 3초만 기다립니다.
     */
    return resolveWithTimeout(
      serverLoadPromise,
      localCrews,
      3000,
      'CREW SERVER LOAD TIMEOUT: LOCAL DATA USED'
    );
  };

export const subscribeRootCrews =
  (
    onChange:
      (
        crews:
          RootCrew[]
      ) => void
  ) => {
    const crewListQuery =
      query(
        collection(
          firebaseDb,
          'crews'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    return onSnapshot(
      crewListQuery,

      (
        snapshot
      ) => {
        rootCrews =
          snapshot.docs.map(
            (
              documentSnapshot
            ) => ({
              id:
                documentSnapshot
                  .id,

              ...documentSnapshot
                .data(),
            })
          ) as RootCrew[];

        void AsyncStorage.setItem(
          ROOT_CREWS_KEY,
          JSON.stringify(
            rootCrews
          )
        ).catch(
          (
            error
          ) => {
            console.log(
              'CREW SUBSCRIBE LOCAL SAVE ERROR',
              error
            );
          }
        );

        onChange(
          rootCrews
        );
      },

      (
        error
      ) => {
        console.log(
          'CREWS SUBSCRIBE ERROR',
          error
        );
      }
    );
  };

export const getRootCrews = () => {
  return rootCrews;
};

/*
 * 크루 경험치와 가입 가능 인원은
 * 크루에 공유된 전체 기록 시간을 기준으로 계산합니다.
 *
 * 500분마다 크루 레벨이 1 올라갑니다.
 * Lv.1: 10명
 * Lv.2: 15명
 * Lv.3: 20명
 * Lv.4: 25명
 * Lv.5 이상: 30명
 */
export function getRootCrewLevelByMinutes(
  totalMinutes: number
) {
  const safeMinutes =
    Math.max(
      0,
      Number(
        totalMinutes
      ) || 0
    );

  return (
    Math.floor(
      safeMinutes / 500
    ) + 1
  );
}

export function getRootCrewMemberLimitByLevel(
  level: number
) {
  const safeLevel =
    Math.max(
      1,
      Math.floor(
        Number(
          level
        ) || 1
      )
    );

  if (safeLevel <= 1) {
    return 10;
  }

  if (safeLevel === 2) {
    return 15;
  }

  if (safeLevel === 3) {
    return 20;
  }

  if (safeLevel === 4) {
    return 25;
  }

  return 30;
}

async function loadRootCrewTotalMinutesForLimit(
  crewId: string
) {
  const safeCrewId =
    String(
      crewId ?? ''
    );

  if (!safeCrewId) {
    return 0;
  }

  const localPosts =
    rootCrewPosts
      .filter(Boolean)
      .filter(
        (
          post: any
        ) => {
          const isThisCrew =
            String(
              post?.crewId ??
                ''
            ) ===
              safeCrewId ||
            String(
              post?.sharedCrewId ??
                ''
            ) ===
              safeCrewId;

          return (
            isThisCrew &&
            post?.status !==
              'hidden'
          );
        }
      );

  let targetPosts =
    localPosts;

  try {
    const crewPostQuery =
  query(
    collection(
      firebaseDb,
      'crewPosts'
    ),
    where(
      'crewId',
      '==',
      safeCrewId
    )
  );

const sharedCrewPostQuery =
  query(
    collection(
      firebaseDb,
      'crewPosts'
    ),
    where(
      'sharedCrewId',
      '==',
      safeCrewId
    )
  );

const [
  crewPostSnapshot,
  sharedCrewPostSnapshot,
] =
  await Promise.all([
    getDocs(
      crewPostQuery
    ),

    getDocs(
      sharedCrewPostQuery
    ),
  ]);

    const postMap =
      new Map<
        string,
        any
      >();

    [
      ...crewPostSnapshot.docs,
      ...sharedCrewPostSnapshot.docs,
    ].forEach(
      (
        document
      ) => {
        const data =
          document.data();

        postMap.set(
          String(
            document.id
          ),
          {
            id:
              document.id,

            ...data,
          }
        );
      }
    );

    targetPosts =
      Array.from(
        postMap.values()
      ).filter(
        (
          post: any
        ) =>
          post?.status !==
          'hidden'
      );
  } catch (
    error
  ) {
    console.log(
      'CREW MEMBER LIMIT POST LOAD ERROR: LOCAL POSTS USED',
      {
        crewId:
          safeCrewId,

        message:
          (
            error as any
          )?.message ??
          String(
            error
          ),
      }
    );
  }

  return targetPosts.reduce(
    (
      sum: number,
      post: any
    ) =>
      sum +
      Math.max(
        0,
        Number(
          post?.minutes ??
            0
        ) || 0
      ),
    0
  );
}

export async function getRootCrewMemberLimit(
  crewId: string
) {
  const totalMinutes =
    await loadRootCrewTotalMinutesForLimit(
      crewId
    );

  const crewLevel =
    getRootCrewLevelByMinutes(
      totalMinutes
    );

  return getRootCrewMemberLimitByLevel(
    crewLevel
  );
}

export const addRootCrew =
  async (
    crew:
      RootCrew
  ) => {
    const data =
      getRootOnboardingData();

    const authUid =
      firebaseAuth
        .currentUser
        ?.uid ??
      null;

    const userId =
      String(
        authUid ??
          data?.uid ??
          data?.guestId ??
          ''
      ).trim();

    const crewOwnerId =
      String(
        crew?.ownerId ??
          ''
      ).trim();

    if (!userId) {
      throw new Error(
        'LOGIN_REQUIRED'
      );
    }

    if (
      !crewOwnerId ||
      crewOwnerId !==
        userId
    ) {
      console.log(
        'CREATE CREW OWNER MISMATCH',
        {
          authUid,

          rootUid:
            data?.uid ??
            null,

          userId,

          crewOwnerId,
        }
      );

      throw new Error(
        'CREW_OWNER_MISMATCH'
      );
    }

    const safeCrewId =
      String(
        crew?.id ??
          Date.now()
      ).trim();

    if (!safeCrewId) {
      throw new Error(
        'CREW_ID_INVALID'
      );
    }

    /*
     * 네이티브 getDocs() 대신
     * REST로 현재 사용자가 만든
     * 크루가 있는지 확인합니다.
     */
    const serverHasOwnedCrew =
      await hasFirestoreRestDocumentByStringField({
        collectionName:
          'crews',

        fieldPath:
          'ownerId',

        value:
          userId,
      });

    const localOwnedCrewCount =
      rootCrews.filter(
        (
          item
        ) =>
          String(
            item?.ownerId ??
              ''
          ) ===
          userId
      ).length;

    console.log(
      'CREATE CREW LIMIT CHECK',
      {
        authUid,

        rootUid:
          data?.uid ??
          null,

        userId,

        crewOwnerId,

        localOwnedCrewCount,

        serverOwnedCrewCount:
          serverHasOwnedCrew
            ? 1
            : 0,
      }
    );

    if (
      serverHasOwnedCrew
    ) {
      throw new Error(
        'CREW_LIMIT'
      );
    }

    /*
     * 서버에는 소유 크루가 없으므로,
     * 이전 상태가 로컬에 잘못 남아 있으면
     * 제거합니다.
     */
    rootCrews =
      rootCrews.filter(
        (
          item
        ) =>
          String(
            item?.ownerId ??
              ''
          ) !==
          userId
      );

    const createdAt =
      crew?.createdAt ??
      new Date()
        .toISOString();

    const updatedAt =
      new Date()
        .toISOString();

    const memberIds =
      Array.from(
        new Set([
          userId,

          ...(
            crew?.memberIds ??
            []
          )
            .map(
              (
                memberId
              ) =>
                String(
                  memberId
                )
            )
            .filter(
              Boolean
            ),
        ])
      );

    const savedCrew:
      RootCrew = {
        ...crew,

        id:
          safeCrewId,

        ownerId:
          userId,

        ownerNickname:
          String(
            crew
              ?.ownerNickname ??
              data?.nickname ??
              firebaseAuth
                .currentUser
                ?.displayName ??
              '루트유저'
          ).trim() ||
          '루트유저',

        memberIds,

        members:
          memberIds.length,

        createdAt,

        updatedAt,

        deleteRequestedAt:
          null,
      };

    /*
     * 네이티브 setDoc()을 기다리지 않고
     * REST로 새 크루 문서를 저장합니다.
     */
    await writeFirestoreRestDocument({
      collectionName:
        'crews',

      documentId:
        safeCrewId,

      data:
        savedCrew,
    });

    rootCrews = [
      savedCrew,

      ...rootCrews.filter(
        (
          item
        ) =>
          String(
            item?.id ??
              ''
          ) !==
          safeCrewId
      ),
    ];

    await AsyncStorage.setItem(
      ROOT_CREWS_KEY,
      JSON.stringify(
        rootCrews
      )
    );

    console.log(
      'CREATE CREW REST SAVE SUCCESS',
      {
        id:
          savedCrew.id,

        title:
          savedCrew.title,

        ownerId:
          savedCrew.ownerId,

        crewCount:
          rootCrews.length,
      }
    );

    return [
      ...rootCrews,
    ];
  };

export const joinRootCrew = async (
  crew: RootCrew,
  userId: string
) => {
  const safeCrewId =
    String(
      crew?.id ?? ''
    );

  const safeUserId =
    String(
      userId ?? ''
    );

  if (
    !safeCrewId ||
    !safeUserId
  ) {
    throw new Error(
      'CREW_JOIN_INVALID'
    );
  }

  const memberLimit =
    await getRootCrewMemberLimit(
      safeCrewId
    );

  const crewRef =
    doc(
      firebaseDb,
      'crews',
      safeCrewId
    );

  const savedCrew =
    await runTransaction(
      firebaseDb,

      async (
        transaction
      ): Promise<RootCrew> => {
        const snapshot =
          await transaction.get(
            crewRef
          );

        if (
          !snapshot.exists()
        ) {
          throw new Error(
            'CREW_NOT_FOUND'
          );
        }

        const serverCrew = {
          id:
            snapshot.id,

          ...snapshot.data(),
        } as RootCrew;

        const currentMemberIds =
          Array.from(
            new Set(
              (
                serverCrew
                  ?.memberIds ??
                []
              ).map(
                (
                  memberId
                ) =>
                  String(
                    memberId
                  )
              )
            )
          );

        const alreadyMember =
          currentMemberIds.includes(
            safeUserId
          );

        if (
          alreadyMember
        ) {
          return serverCrew;
        }

        if (
          currentMemberIds.length >=
          memberLimit
        ) {
          throw new Error(
            'CREW_FULL'
          );
        }

        const nextMemberIds = [
          ...currentMemberIds,
          safeUserId,
        ];

        const updatedAt =
          new Date()
            .toISOString();

        transaction.update(
          crewRef,
          {
            memberIds:
              nextMemberIds,

            members:
              nextMemberIds.length,

            updatedAt,
          }
        );

        return {
          ...serverCrew,

          memberIds:
            nextMemberIds,

          members:
            nextMemberIds.length,

          updatedAt,
        };
      }
    );

  rootCrews = [
    savedCrew,

    ...rootCrews.filter(
      (
        item
      ) =>
        String(
          item?.id ??
            ''
        ) !==
        safeCrewId
    ),
  ];

  await AsyncStorage.setItem(
    ROOT_CREWS_KEY,
    JSON.stringify(
      rootCrews
    )
  );

  return rootCrews;
};

export const loadRootCrewJoinRequests =
  async () => {
    let localRequests:
      RootCrewJoinRequest[] = [];

    try {
      const raw =
        await AsyncStorage.getItem(
          ROOT_CREW_JOIN_REQUESTS_KEY
        );

      localRequests =
        safeJsonParse<
          RootCrewJoinRequest[]
        >(
          raw,
          []
        );

      rootCrewJoinRequests =
        localRequests;
    } catch (
      error
    ) {
      console.log(
        'CREW JOIN REQUEST LOCAL LOAD ERROR',
        error
      );

      localRequests = [];
      rootCrewJoinRequests = [];
    }

    const joinRequestQuery =
      query(
        collection(
          firebaseDb,
          'crewJoinRequests'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    const serverLoadPromise =
      getDocs(
        joinRequestQuery
      )
        .then(
          async (
            snapshot
          ) => {
            rootCrewJoinRequests =
              snapshot.docs.map(
                (
                  documentSnapshot
                ) => ({
                  id:
                    documentSnapshot.id,

                  ...documentSnapshot.data(),
                })
              ) as RootCrewJoinRequest[];

            await AsyncStorage.setItem(
              ROOT_CREW_JOIN_REQUESTS_KEY,
              JSON.stringify(
                rootCrewJoinRequests
              )
            );

            return rootCrewJoinRequests;
          }
        )
        .catch(
          (
            error
          ) => {
            console.log(
              'CREW JOIN REQUEST SERVER LOAD ERROR',
              error
            );

            return localRequests;
          }
        );

    return resolveWithTimeout(
      serverLoadPromise,
      localRequests,
      3000,
      'CREW JOIN REQUEST SERVER LOAD TIMEOUT: LOCAL DATA USED'
    );
  };

export const subscribeRootCrewJoinRequests =
  (
    onChange:
      (
        requests:
          RootCrewJoinRequest[]
      ) => void
  ) => {
    const joinRequestQuery =
      query(
        collection(
          firebaseDb,
          'crewJoinRequests'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    return onSnapshot(
      joinRequestQuery,

      (
        snapshot
      ) => {
        rootCrewJoinRequests =
          snapshot.docs.map(
            (
              documentSnapshot
            ) => ({
              id:
                documentSnapshot.id,

              ...documentSnapshot.data(),
            })
          ) as RootCrewJoinRequest[];

        void AsyncStorage.setItem(
          ROOT_CREW_JOIN_REQUESTS_KEY,
          JSON.stringify(
            rootCrewJoinRequests
          )
        ).catch(
          (
            error
          ) => {
            console.log(
              'CREW JOIN REQUEST SUBSCRIBE LOCAL SAVE ERROR',
              error
            );
          }
        );

        onChange([
          ...rootCrewJoinRequests,
        ]);
      },

      (
        error
      ) => {
        console.log(
          'CREW JOIN REQUEST SUBSCRIBE ERROR',
          error
        );

        /*
         * 구독 실패 시 기존 로컬 요청을
         * 빈 배열로 지우지 않습니다.
         */
        onChange([
          ...rootCrewJoinRequests,
        ]);
      }
    );
  };

export const getRootCrewJoinRequests = () => {
  return rootCrewJoinRequests;
};

export const requestRootCrewJoin = async (
  crewId: string,
  userId: string,
  nickname: string,
  profileEmoji?: string
) => {
  const safeCrewId =
    String(
      crewId ?? ''
    );

  const safeUserId =
    String(
      userId ?? ''
    );

  if (
    !safeCrewId ||
    !safeUserId
  ) {
    throw new Error(
      'CREW_JOIN_INVALID'
    );
  }

  const crewRef =
  doc(
    firebaseDb,
    'crews',
    safeCrewId
  );

 const [
  crewSnapshot,
  memberLimit,
] =
  await Promise.all([
    getDoc(
      crewRef
    ),

    getRootCrewMemberLimit(
      safeCrewId
    ),
  ]);

  const snapshotExists =
  crewSnapshot.exists();

  if (
    !snapshotExists
  ) {
    throw new Error(
      'CREW_NOT_FOUND'
    );
  }

  const serverCrew = {
    id:
      crewSnapshot.id,

    ...crewSnapshot.data(),
  } as RootCrew;

  const currentMemberIds =
    Array.from(
      new Set(
        (
          serverCrew
            ?.memberIds ??
          []
        ).map(
          (
            memberId
          ) =>
            String(
              memberId
            )
        )
      )
    );

  if (
    currentMemberIds.includes(
      safeUserId
    )
  ) {
    return rootCrewJoinRequests;
  }

  if (
    currentMemberIds.length >=
    memberLimit
  ) {
    throw new Error(
      'CREW_FULL'
    );
  }

  const exists =
    rootCrewJoinRequests.some(
      (
        request
      ) =>
        String(
          request
            .crewId
        ) ===
          safeCrewId &&
        String(
          request
            .userId
        ) ===
          safeUserId &&
        request.status ===
          'pending'
    );

  if (exists) {
    return rootCrewJoinRequests;
  }

  const newRequest:
    RootCrewJoinRequest = {
      id:
        String(
          Date.now()
        ),

      crewId:
        safeCrewId,

      userId:
        safeUserId,

      nickname:
        nickname
          ?.trim() ||
        '루트유저',

      profileEmoji,

      status:
        'pending',

      createdAt:
        new Date()
          .toISOString(),
    };

  const joinRequestRef =
  doc(
    firebaseDb,
    'crewJoinRequests',
    String(
      newRequest.id
    )
  );

await setDoc(
  joinRequestRef,
  newRequest
);

  rootCrewJoinRequests = [
    newRequest,

    ...rootCrewJoinRequests,
  ];

  await AsyncStorage.setItem(
    ROOT_CREW_JOIN_REQUESTS_KEY,
    JSON.stringify(
      rootCrewJoinRequests
    )
  );

  return rootCrewJoinRequests;
};

  
export const approveRootCrewJoinRequest = async (
  requestId: string
) => {
  const safeRequestId =
    String(
      requestId ?? ''
    );

  const request =
    rootCrewJoinRequests.find(
      (
        item
      ) =>
        String(
          item?.id ??
            ''
        ) ===
        safeRequestId
    );

  if (!request) {
    return rootCrewJoinRequests;
  }

  if (
    request.status !==
    'pending'
  ) {
    return rootCrewJoinRequests;
  }

  const safeCrewId =
    String(
      request.crewId
    );

  const memberLimit =
    await getRootCrewMemberLimit(
      safeCrewId
    );

  const crewRef =
    doc(
      firebaseDb,
      'crews',
      safeCrewId
    );

  const requestRef =
    doc(
      firebaseDb,
      'crewJoinRequests',
      safeRequestId
    );

  const updatedAt =
    new Date()
      .toISOString();

  const savedCrew =
    await runTransaction(
      firebaseDb,

      async (
        transaction
      ): Promise<RootCrew> => {
        const crewSnapshot =
          await transaction.get(
            crewRef
          );

        if (
          !crewSnapshot.exists()
        ) {
          throw new Error(
            'CREW_NOT_FOUND'
          );
        }

        const serverCrew = {
          id:
            crewSnapshot.id,

          ...crewSnapshot.data(),
        } as RootCrew;

        const currentMemberIds =
          Array.from(
            new Set(
              (
                serverCrew
                  ?.memberIds ??
                []
              ).map(
                (
                  memberId
                ) =>
                  String(
                    memberId
                  )
              )
            )
          );

        const safeRequestUserId =
          String(
            request.userId
          );

        const alreadyMember =
          currentMemberIds.includes(
            safeRequestUserId
          );

        if (
          !alreadyMember &&
          currentMemberIds.length >=
            memberLimit
        ) {
          throw new Error(
            'CREW_FULL'
          );
        }

        const nextMemberIds =
          alreadyMember
            ? currentMemberIds
            : [
                ...currentMemberIds,
                safeRequestUserId,
              ];

        transaction.update(
          crewRef,
          {
            memberIds:
              nextMemberIds,

            members:
              nextMemberIds.length,

            updatedAt,
          }
        );

        transaction.set(
          requestRef,
          {
            status:
              'approved',

            updatedAt,
          },
          {
            merge:
              true,
          }
        );

        return {
          ...serverCrew,

          memberIds:
            nextMemberIds,

          members:
            nextMemberIds.length,

          updatedAt,
        };
      }
    );

  rootCrewJoinRequests =
    rootCrewJoinRequests.map(
      (
        item
      ) =>
        String(
          item?.id ??
            ''
        ) ===
        safeRequestId
          ? {
              ...item,

              status:
                'approved',

              updatedAt,
            } as any
          : item
    );

  rootCrews = [
    savedCrew,

    ...rootCrews.filter(
      (
        crew
      ) =>
        String(
          crew?.id ??
            ''
        ) !==
        safeCrewId
    ),
  ];

  await Promise.all([
    AsyncStorage.setItem(
      ROOT_CREW_JOIN_REQUESTS_KEY,
      JSON.stringify(
        rootCrewJoinRequests
      )
    ),

    AsyncStorage.setItem(
      ROOT_CREWS_KEY,
      JSON.stringify(
        rootCrews
      )
    ),
  ]);

  return rootCrewJoinRequests;
};

export const rejectRootCrewJoinRequest = async (
  requestId: string
) => {
  rootCrewJoinRequests = rootCrewJoinRequests.map((item) =>
    item?.id === requestId
      ? {
          ...item,
          status: 'rejected',
          updatedAt: new Date().toISOString(),
        } as any
      : item
  );

  await AsyncStorage.setItem(
    ROOT_CREW_JOIN_REQUESTS_KEY,
    JSON.stringify(rootCrewJoinRequests)
  );

 const requestRef =
  doc(
    firebaseDb,
    'crewJoinRequests',
    String(
      requestId
    )
  );

await setDoc(
  requestRef,
  {
    status:
      'rejected',

    updatedAt:
      new Date()
        .toISOString(),
  },
  {
    merge:
      true,
  }
);

  return rootCrewJoinRequests;
};

export const cancelRootCrewJoinRequest = async (
  crewId: string,
  userId: string
) => {
  rootCrewJoinRequests = rootCrewJoinRequests.map((item) =>
    item.crewId === crewId &&
    item.userId === userId &&
    item.status === 'pending'
      ? {
          ...item,
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        } as any
      : item
  );

  await AsyncStorage.setItem(
    ROOT_CREW_JOIN_REQUESTS_KEY,
    JSON.stringify(rootCrewJoinRequests)
  );

  const targetRequest = rootCrewJoinRequests.find(
    (item) =>
      item.crewId === crewId &&
      item.userId === userId &&
      item.status === 'cancelled'
  );

 if (
  targetRequest
) {
  const requestRef =
    doc(
      firebaseDb,
      'crewJoinRequests',
      String(
        targetRequest.id
      )
    );

  await setDoc(
    requestRef,
    {
      status:
        'cancelled',

      updatedAt:
        new Date()
          .toISOString(),
    },
    {
      merge:
        true,
    }
  );
}

  return rootCrewJoinRequests;
};

export const leaveRootCrew =
  async (
    crewId:
      string,

    userId:
      string
  ) => {
    const safeCrewId =
      String(
        crewId ??
          ''
      ).trim();

    const safeUserId =
      String(
        userId ??
          ''
      ).trim();

    if (
      !safeCrewId ||
      !safeUserId
    ) {
      throw new Error(
        'CREW_LEAVE_INVALID'
      );
    }

    const targetCrew =
      rootCrews.find(
        (
          crew
        ) =>
          String(
            crew?.id ??
              ''
          ) ===
          safeCrewId
      );

    if (!targetCrew) {
      throw new Error(
        'CREW_NOT_FOUND'
      );
    }

    if (
      String(
        targetCrew
          .ownerId
      ) ===
      safeUserId
    ) {
      throw new Error(
        'OWNER_CANNOT_LEAVE'
      );
    }

    const currentMemberIds =
      Array.from(
        new Set(
          (
            targetCrew
              .memberIds ??
            []
          )
            .map(
              (
                memberId
              ) =>
                String(
                  memberId
                )
            )
            .filter(
              Boolean
            )
        )
      );

    const isCurrentMember =
      currentMemberIds.includes(
        safeUserId
      );

    if (
      !isCurrentMember
    ) {
      return [
        ...rootCrews,
      ];
    }

    const nextMemberIds =
      currentMemberIds.filter(
        (
          memberId
        ) =>
          memberId !==
          safeUserId
      );

    const updatedAt =
      new Date()
        .toISOString();

    const leavingNickname =
      onboardingData
        ?.nickname ??
      firebaseAuth
        .currentUser
        ?.displayName ??
      '크루원';

    const notificationId =
      `${Date.now()}` +
      `-member-left-` +
      `${safeCrewId}-` +
      `${safeUserId}`;

    const memberLeftNotification:
      RootCrewNotification = {
        id:
          notificationId,

        type:
          'memberLeft',

        userId:
          safeUserId,

        targetUserId:
          String(
            targetCrew
              .ownerId
          ),

        postId:
          safeCrewId,

        message:
          `${leavingNickname}님이 ` +
          `${targetCrew.title} ` +
          `크루에서 탈퇴했어요.`,

        read:
          false,

        createdAt:
          updatedAt,
      };

    const crewRef =
      doc(
        firebaseDb,
        'crews',
        safeCrewId
      );

    const notificationRef =
      doc(
        firebaseDb,
        'crewNotifications',
        notificationId
      );

    const batch =
      writeBatch(
        firebaseDb
      );

    batch.update(
      crewRef,
      {
        memberIds:
          nextMemberIds,

        members:
          nextMemberIds.length,

        updatedAt,
      }
    );

    batch.set(
      notificationRef,
      memberLeftNotification
    );

    try {
      /*
       * 네이티브 Firestore가 멈춰도
       * 화면이 무한히 '탈퇴 중'으로
       * 남지 않도록 제한합니다.
       */
      await rejectWriteWithTimeout(
        batch.commit(),
        5000,
        'CREW_LEAVE_BATCH_TIMEOUT'
      );

      console.log(
        'CREW LEAVE BATCH SUCCESS',
        {
          crewId:
            safeCrewId,

          userId:
            safeUserId,
        }
      );
    } catch (
      batchError:
        any
    ) {
      console.log(
        'CREW LEAVE BATCH ERROR: REST FALLBACK',
        {
          crewId:
            safeCrewId,

          userId:
            safeUserId,

          code:
            batchError
              ?.code ??
            null,

          message:
            batchError
              ?.message ??
            String(
              batchError
            ),
        }
      );

      /*
       * 핵심인 크루 멤버 제거를
       * REST로 다시 저장합니다.
       */
      await writeFirestoreRestDocument({
        collectionName:
          'crews',

        documentId:
          safeCrewId,

        data: {
          memberIds:
            nextMemberIds,

          members:
            nextMemberIds.length,

          updatedAt,
        },

        mergeFields: [
          'memberIds',
          'members',
          'updatedAt',
        ],
      });

      /*
       * 크루장 알림은 부가 기능이므로
       * 실패하더라도 탈퇴 완료 자체를
       * 취소하지 않습니다.
       */
      try {
        await writeFirestoreRestDocument({
          collectionName:
            'crewNotifications',

          documentId:
            notificationId,

          data:
            memberLeftNotification,
        });
      } catch (
        notificationError:
          any
      ) {
        console.log(
          'CREW LEAVE NOTIFICATION REST ERROR',
          {
            notificationId,

            message:
              notificationError
                ?.message ??
              String(
                notificationError
              ),
          }
        );
      }

      console.log(
        'CREW LEAVE REST FALLBACK SUCCESS',
        {
          crewId:
            safeCrewId,

          userId:
            safeUserId,
        }
      );
    }

    /*
     * 서버 배치 또는 REST 저장이
     * 성공한 뒤 로컬 목록을 갱신합니다.
     */
    rootCrews =
      rootCrews.map(
        (
          crew
        ) =>
          String(
            crew?.id ??
              ''
          ) ===
          safeCrewId
            ? {
                ...crew,

                memberIds:
                  nextMemberIds,

                members:
                  nextMemberIds.length,

                updatedAt,
              }
            : crew
      );

    await AsyncStorage.setItem(
      ROOT_CREWS_KEY,
      JSON.stringify(
        rootCrews
      )
    );

    console.log(
      'CREW MEMBER LEFT',
      {
        crewId:
          safeCrewId,

        userId:
          safeUserId,

        nickname:
          leavingNickname,

        ownerId:
          targetCrew
            .ownerId,

        members:
          nextMemberIds
            .length,
      }
    );

    return [
      ...rootCrews,
    ];
  };

export const transferRootCrewOwnership =
  async (
    crewId:
      string,

    newOwnerId:
      string,

    newOwnerNickname:
      string
  ) => {
    const safeCrewId =
      String(
        crewId ?? ''
      ).trim();

    const safeNewOwnerId =
      String(
        newOwnerId ?? ''
      ).trim();

    const currentUserId =
      String(
        firebaseAuth
          .currentUser
          ?.uid ??
          onboardingData
            ?.uid ??
          onboardingData
            ?.guestId ??
          ''
      ).trim();

    if (!currentUserId) {
      throw new Error(
        'LOGIN_REQUIRED'
      );
    }

    if (
      !safeCrewId ||
      !safeNewOwnerId
    ) {
      throw new Error(
        'CREW_TRANSFER_INVALID'
      );
    }

    const targetCrew =
      rootCrews.find(
        (
          crew
        ) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
      );

    if (!targetCrew) {
      throw new Error(
        'CREW_NOT_FOUND'
      );
    }

    if (
      String(
        targetCrew.ownerId
      ) !==
      currentUserId
    ) {
      throw new Error(
        'NOT_CREW_OWNER'
      );
    }

    if (
      safeNewOwnerId ===
      currentUserId
    ) {
      throw new Error(
        'ALREADY_CREW_OWNER'
      );
    }

    const isNewOwnerMember =
      (
        targetCrew
          .memberIds ??
        []
      ).some(
        (
          memberId
        ) =>
          String(
            memberId
          ) ===
          safeNewOwnerId
      );

    if (
      !isNewOwnerMember
    ) {
      throw new Error(
        'NEW_OWNER_NOT_MEMBER'
      );
    }

    const safeOwnerNickname =
      String(
        newOwnerNickname ??
          ''
      ).trim() ||
      '새 크루장';

    const updatedAt =
      new Date()
        .toISOString();

    /*
     * 멈추는 네이티브 트랜잭션을
     * 사용하지 않고 REST로 바로
     * 크루장 정보를 변경합니다.
     */
    await writeFirestoreRestDocument({
      collectionName:
        'crews',

      documentId:
        safeCrewId,

      data: {
        ownerId:
          safeNewOwnerId,

        ownerNickname:
          safeOwnerNickname,

        deleteRequestedAt:
          null,

        updatedAt,
      },

      mergeFields: [
        'ownerId',
        'ownerNickname',
        'deleteRequestedAt',
        'updatedAt',
      ],
    });

    const savedCrew:
      RootCrew = {
        ...targetCrew,

        ownerId:
          safeNewOwnerId,

        ownerNickname:
          safeOwnerNickname,

        deleteRequestedAt:
          null,

        updatedAt,
      };

    rootCrews =
      rootCrews.map(
        (
          crew
        ) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
            ? savedCrew
            : crew
      );

    /*
     * 서버 위임은 이미 완료됐으므로
     * 로컬 저장 실패가 서버 결과를
     * 실패로 바꾸지 않게 처리합니다.
     */
    try {
      await AsyncStorage.setItem(
        ROOT_CREWS_KEY,
        JSON.stringify(
          rootCrews
        )
      );
    } catch (
      localSaveError:
        any
    ) {
      console.log(
        'CREW OWNERSHIP TRANSFER LOCAL SAVE ERROR',
        {
          crewId:
            safeCrewId,

          message:
            localSaveError
              ?.message ??
            String(
              localSaveError
            ),
        }
      );
    }

    console.log(
      'CREW OWNERSHIP TRANSFER REST SAVE SUCCESS',
      {
        crewId:
          safeCrewId,

        previousOwnerId:
          currentUserId,

        newOwnerId:
          safeNewOwnerId,

        newOwnerNickname:
          safeOwnerNickname,
      }
    );

    return [
      ...rootCrews,
    ];
  };

export const kickRootCrewMember = async (
  crewId: string,
  memberId: string
) => {
  const currentUserId =
    firebaseAuth.currentUser?.uid ??
    onboardingData?.uid ??
    onboardingData?.guestId ??
    '';

  const targetCrew = rootCrews.find(
    (crew) => String(crew.id) === String(crewId)
  );

  if (!targetCrew) {
    throw new Error('CREW_NOT_FOUND');
  }

  if (
    String(targetCrew.ownerId) !==
    String(currentUserId)
  ) {
    throw new Error('NOT_CREW_OWNER');
  }

  if (
    String(targetCrew.ownerId) ===
    String(memberId)
  ) {
    throw new Error('CANNOT_KICK_OWNER');
  }

  const nextMemberIds = (targetCrew.memberIds ?? []).filter(
    (id) => String(id) !== String(memberId)
  );

  const updatedAt = new Date().toISOString();

  await firestore()
    .collection('crews')
    .doc(String(crewId))
    .update({
      memberIds: nextMemberIds,
      members: nextMemberIds.length,
      updatedAt,
    });

  rootCrews = rootCrews.map((crew) =>
    String(crew.id) === String(crewId)
      ? {
          ...crew,
          memberIds: nextMemberIds,
          members: nextMemberIds.length,
          updatedAt,
        }
      : crew
  );

  await AsyncStorage.setItem(
    ROOT_CREWS_KEY,
    JSON.stringify(rootCrews)
  );

  return rootCrews;
};

export const updateRootCrew =
  async (
    crewId:
      string,

    updates:
      Partial<RootCrew>
  ) => {
    const safeCrewId =
      String(
        crewId ?? ''
      ).trim();

    if (!safeCrewId) {
      throw new Error(
        'CREW_UPDATE_INVALID'
      );
    }

    const targetCrew =
      rootCrews.find(
        (
          crew
        ) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
      );

    if (!targetCrew) {
      throw new Error(
        'CREW_NOT_FOUND'
      );
    }

    /*
     * undefined 값은 서버에
     * 저장하지 않습니다.
     */
    const safeUpdates =
      Object.fromEntries(
        Object.entries(
          updates ?? {}
        ).filter(
          (
            [, value]
          ) =>
            value !==
            undefined
        )
      );

    const updatedAt =
      new Date()
        .toISOString();

    const updatePayload = {
      ...safeUpdates,

      updatedAt,
    };

    const previousCrews = [
      ...rootCrews,
    ];

    /*
     * 변경된 로컬 목록을 만듭니다.
     */
    rootCrews =
      rootCrews.map(
        (
          crew
        ) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
            ? {
                ...crew,

                ...safeUpdates,

                updatedAt,
              } as RootCrew
            : crew
      );

    await AsyncStorage.setItem(
      ROOT_CREWS_KEY,
      JSON.stringify(
        rootCrews
      )
    );

    try {
      /*
       * 멈추는 네이티브 Firestore를
       * 기다리지 않고 REST로 바로
       * 부분 업데이트합니다.
       */
      await writeFirestoreRestDocument({
        collectionName:
          'crews',

        documentId:
          safeCrewId,

        data:
          updatePayload,

        mergeFields:
          Object.keys(
            updatePayload
          ),
      });

      console.log(
        'CREW UPDATE REST SAVE SUCCESS',
        {
          crewId:
            safeCrewId,

          updatedFields:
            Object.keys(
              updatePayload
            ),
        }
      );
    } catch (
      saveError:
        any
    ) {
      /*
       * 서버 저장이 실패하면
       * 로컬 데이터도 원상복구합니다.
       */
      rootCrews =
        previousCrews;

      await AsyncStorage.setItem(
        ROOT_CREWS_KEY,
        JSON.stringify(
          rootCrews
        )
      );

      console.log(
        'CREW UPDATE REST SAVE ERROR',
        {
          crewId:
            safeCrewId,

          message:
            saveError
              ?.message ??
            String(
              saveError
            ),
        }
      );

      throw saveError;
    }

    return [
      ...rootCrews,
    ];
  };

export const updateRootCrewNotice =
  async (
    crewId: string,
    notice: string
  ) => {
    const safeCrewId =
      String(
        crewId ?? ''
      ).trim();

    if (!safeCrewId) {
      throw new Error(
        'CREW_NOTICE_INVALID'
      );
    }

    const targetCrew =
      rootCrews.find(
        (crew) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
      );

    if (!targetCrew) {
      throw new Error(
        'CREW_NOT_FOUND'
      );
    }

    const safeNotice =
      String(
        notice ?? ''
      ).trim();

    const updatedAt =
      new Date()
        .toISOString();

    const previousCrews = [
      ...rootCrews,
    ];

    rootCrews =
      rootCrews.map(
        (crew) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
            ? {
                ...crew,

                notice:
                  safeNotice,

                noticeUpdatedAt:
                  updatedAt,

                updatedAt,
              }
            : crew
      );

    await AsyncStorage.setItem(
      ROOT_CREWS_KEY,
      JSON.stringify(
        rootCrews
      )
    );

    try {
      await writeFirestoreRestDocument({
        collectionName:
          'crews',

        documentId:
          safeCrewId,

        data: {
          notice:
            safeNotice,

          noticeUpdatedAt:
            updatedAt,

          updatedAt,
        },

        mergeFields: [
          'notice',
          'noticeUpdatedAt',
          'updatedAt',
        ],
      });

      console.log(
        'CREW NOTICE REST SAVE SUCCESS',
        {
          crewId:
            safeCrewId,

          noticeLength:
            safeNotice.length,
        }
      );
    } catch (
      saveError: any
    ) {
      rootCrews =
        previousCrews;

      await AsyncStorage.setItem(
        ROOT_CREWS_KEY,
        JSON.stringify(
          rootCrews
        )
      );

      console.log(
        'CREW NOTICE REST SAVE ERROR',
        {
          crewId:
            safeCrewId,

          message:
            saveError
              ?.message ??
            String(
              saveError
            ),
        }
      );

      throw saveError;
    }

    return [
      ...rootCrews,
    ];
  };

export const toggleRootCrewJoinType =
  async (
    crewId:
      string
  ) => {
    const safeCrewId =
      String(
        crewId ?? ''
      ).trim();

    if (!safeCrewId) {
      throw new Error(
        'CREW_JOIN_TYPE_INVALID'
      );
    }

    const targetCrew =
      rootCrews.find(
        (
          crew
        ) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
      );

    if (!targetCrew) {
      throw new Error(
        'CREW_NOT_FOUND'
      );
    }

    const nextJoinType:
      RootCrew['joinType'] =
      targetCrew.joinType ===
      'approval'
        ? 'free'
        : 'approval';

    const updatedAt =
      new Date()
        .toISOString();

    /*
     * 서버 저장 실패 시 복구하기 위한
     * 기존 목록입니다.
     */
    const previousCrews = [
      ...rootCrews,
    ];

    /*
     * 화면과 로컬 저장소에는
     * 변경 결과를 먼저 반영합니다.
     */
    rootCrews =
      rootCrews.map(
        (
          crew
        ) =>
          String(
            crew?.id ?? ''
          ) ===
          safeCrewId
            ? {
                ...crew,

                joinType:
                  nextJoinType,

                updatedAt,
              }
            : crew
      );

    await AsyncStorage.setItem(
      ROOT_CREWS_KEY,
      JSON.stringify(
        rootCrews
      )
    );

    try {
      /*
       * 현재 네이티브 Firestore가
       * 계속 타임아웃되므로 REST로
       * 바로 저장합니다.
       */
      await writeFirestoreRestDocument({
        collectionName:
          'crews',

        documentId:
          safeCrewId,

        data: {
          joinType:
            nextJoinType,

          updatedAt,
        },

        mergeFields: [
          'joinType',
          'updatedAt',
        ],
      });

      console.log(
        'CREW JOIN TYPE REST SAVE SUCCESS',
        {
          crewId:
            safeCrewId,

          joinType:
            nextJoinType,
        }
      );
    } catch (
      saveError:
        any
    ) {
      /*
       * 서버 저장이 실패하면
       * 로컬 변경도 원래 상태로 되돌립니다.
       */
      rootCrews =
        previousCrews;

      await AsyncStorage.setItem(
        ROOT_CREWS_KEY,
        JSON.stringify(
          rootCrews
        )
      );

      console.log(
        'CREW JOIN TYPE REST SAVE ERROR',
        {
          crewId:
            safeCrewId,

          joinType:
            nextJoinType,

          message:
            saveError?.message ??
            String(
              saveError
            ),
        }
      );

      throw saveError;
    }

    return [
      ...rootCrews,
    ];
  };

export const deleteRootCrew = async (crewId: string) => {
  const currentUserId =
    firebaseAuth.currentUser?.uid ??
    onboardingData?.uid ??
    onboardingData?.guestId ??
    '';

  const targetCrew = rootCrews.find(
    (crew) => String(crew.id) === String(crewId)
  );

  if (!targetCrew) {
    throw new Error('CREW_NOT_FOUND');
  }

  if (
    String(targetCrew.ownerId) !==
    String(currentUserId)
  ) {
    throw new Error('NOT_CREW_OWNER');
  }

  const memberIds =
    targetCrew.memberIds ?? [];

  if (
    memberIds.length !== 1 ||
    String(memberIds[0]) !==
      String(currentUserId)
  ) {
    throw new Error('CREW_HAS_MEMBERS');
  }

  if (!targetCrew.deleteRequestedAt) {
    throw new Error('DELETE_NOT_REQUESTED');
  }

  const requestedAt = new Date(
    targetCrew.deleteRequestedAt
  ).getTime();

  const passed =
    Number.isFinite(requestedAt) &&
    Date.now() - requestedAt >=
      48 * 60 * 60 * 1000;

  if (!passed) {
    throw new Error('DELETE_WAIT');
  }

  const [
    crewPostSnapshot,
    sharedCrewPostSnapshot,
    joinRequestSnapshot,
    reportSnapshot,
    notificationSnapshot,
  ] = await Promise.all([
    firestore()
      .collection('crewPosts')
      .where('crewId', '==', crewId)
      .get(),

    firestore()
      .collection('crewPosts')
      .where('sharedCrewId', '==', crewId)
      .get(),

    firestore()
      .collection('crewJoinRequests')
      .where('crewId', '==', crewId)
      .get(),

    firestore()
      .collection('crewReports')
      .where('crewId', '==', crewId)
      .get(),

    firestore()
      .collection('crewNotifications')
      .where('postId', '==', crewId)
      .get(),
  ]);

  const deleteRefs = new Map<string, any>();

  [
    ...crewPostSnapshot.docs,
    ...sharedCrewPostSnapshot.docs,
    ...joinRequestSnapshot.docs,
    ...reportSnapshot.docs,
    ...notificationSnapshot.docs,
  ].forEach((doc) => {
    deleteRefs.set(doc.ref.path, doc.ref);
  });

  await Promise.all(
    Array.from(deleteRefs.values()).map(
      (ref) => ref.delete()
    )
  );

  await firestore()
    .collection('crews')
    .doc(String(crewId))
    .delete();

  rootCrews = rootCrews.filter(
    (crew) => String(crew.id) !== String(crewId)
  );

  rootCrewPosts = rootCrewPosts.filter(
    (post: any) =>
      String(post.crewId ?? '') !== String(crewId) &&
      String(post.sharedCrewId ?? '') !== String(crewId)
  );

  rootCrewJoinRequests =
    rootCrewJoinRequests.filter(
      (request) =>
        String(request.crewId) !== String(crewId)
    );

  rootCrewReports = rootCrewReports.filter(
    (report) =>
      String(report.crewId ?? '') !== String(crewId)
  );

  rootCrewNotifications =
    rootCrewNotifications.filter(
      (notification) =>
        String(notification.postId ?? '') !==
        String(crewId)
    );

  await Promise.all([
    AsyncStorage.setItem(
      ROOT_CREWS_KEY,
      JSON.stringify(rootCrews)
    ),
    AsyncStorage.setItem(
      ROOT_CREW_POSTS_KEY,
      JSON.stringify(rootCrewPosts)
    ),
    AsyncStorage.setItem(
      ROOT_CREW_JOIN_REQUESTS_KEY,
      JSON.stringify(rootCrewJoinRequests)
    ),
    AsyncStorage.setItem(
      ROOT_CREW_REPORTS_KEY,
      JSON.stringify(rootCrewReports)
    ),
    AsyncStorage.setItem(
      ROOT_CREW_NOTIFICATIONS_KEY,
      JSON.stringify(rootCrewNotifications)
    ),
  ]);

  return rootCrews;
};

export const loadRootCrewReports =
  async () => {
    let localReports:
      RootCrewReport[] = [];

    try {
      const raw =
        await AsyncStorage.getItem(
          ROOT_CREW_REPORTS_KEY
        );

      localReports =
        safeJsonParse<
          RootCrewReport[]
        >(
          raw,
          []
        );

      rootCrewReports =
        localReports;
    } catch (
      error
    ) {
      console.log(
        'CREW REPORT LOCAL LOAD ERROR',
        error
      );

      localReports = [];
      rootCrewReports = [];
    }

    const reportQuery =
      query(
        collection(
          firebaseDb,
          'crewReports'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    const serverLoadPromise =
      getDocs(
        reportQuery
      )
        .then(
          async (
            snapshot
          ) => {
            rootCrewReports =
              snapshot.docs.map(
                (
                  documentSnapshot
                ) => ({
                  id:
                    documentSnapshot.id,

                  ...documentSnapshot.data(),
                })
              ) as RootCrewReport[];

            await AsyncStorage.setItem(
              ROOT_CREW_REPORTS_KEY,
              JSON.stringify(
                rootCrewReports
              )
            );

            return rootCrewReports;
          }
        )
        .catch(
          (
            error
          ) => {
            console.log(
              'CREW REPORT SERVER LOAD ERROR',
              error
            );

            return localReports;
          }
        );

    return resolveWithTimeout(
      serverLoadPromise,
      localReports,
      3000,
      'CREW REPORT SERVER LOAD TIMEOUT: LOCAL DATA USED'
    );
  };

export const getRootCrewReports = () => {
  return rootCrewReports;
};
export const addRootCrewReport = async (
  report: RootCrewReport
) => {
  rootCrewReports = [report, ...rootCrewReports];

  await AsyncStorage.setItem(
    ROOT_CREW_REPORTS_KEY,
    JSON.stringify(rootCrewReports)
  );

  await firestore()
    .collection('crewReports')
    .doc(report?.id)
    .set({
      ...report,
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });

  return rootCrewReports;
};

export const updateRootCrewReportStatus = async (
  reportId: string,
  status: 'pending' | 'checked' | 'hidden' | 'rejected'
) => {
  rootCrewReports = rootCrewReports.map((report) =>
    report?.id === reportId
      ? {
          ...report,
          status,
          updatedAt: new Date().toISOString(),
        }
      : report
  );

  await AsyncStorage.setItem(
    ROOT_CREW_REPORTS_KEY,
    JSON.stringify(rootCrewReports)
  );

  await firestore()
    .collection('crewReports')
    .doc(String(reportId))
    .set(
      {
        status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

  return rootCrewReports;
};

export const subscribeRootCrewReports =
  (
    onChange:
      (
        reports:
          RootCrewReport[]
      ) => void
  ) => {
    const reportQuery =
      query(
        collection(
          firebaseDb,
          'crewReports'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    return onSnapshot(
      reportQuery,

      (
        snapshot
      ) => {
        rootCrewReports =
          snapshot.docs.map(
            (
              documentSnapshot
            ) => ({
              id:
                documentSnapshot.id,

              ...documentSnapshot.data(),
            })
          ) as RootCrewReport[];

        void AsyncStorage.setItem(
          ROOT_CREW_REPORTS_KEY,
          JSON.stringify(
            rootCrewReports
          )
        ).catch(
          (
            error
          ) => {
            console.log(
              'CREW REPORT SUBSCRIBE LOCAL SAVE ERROR',
              error
            );
          }
        );

        onChange([
          ...rootCrewReports,
        ]);
      },

      (
        error
      ) => {
        console.log(
          'CREW REPORT SUBSCRIBE ERROR',
          error
        );

        onChange([
          ...rootCrewReports,
        ]);
      }
    );
  };

export type RootCrewNotification = {
  id: string;
  type:
    | 'comment'
    | 'follow'
    | 'cheer'
    | 'support'
    | 'joinRequest'
    | 'joinApproved'
    | 'joinRejected'
    | 'notice'
    | 'goal'
    | 'memberLeft';
  userId?: string;
  targetUserId?: string;
  postId?: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const ROOT_CREW_NOTIFICATIONS_KEY =
  'root_crew_notifications_v1';

let rootCrewNotifications: RootCrewNotification[] = [];

export const markRootCrewNotificationRead = async (
  notificationId: string
) => {
  rootCrewNotifications =
    onboardingData?.crewNotifications ?? [];

  rootCrewNotifications = rootCrewNotifications.map(
    (item: RootCrewNotification) =>
      String(item?.id) === String(notificationId)
        ? {
            ...item,
            read: true,
          }
        : item
  );

  onboardingData = {
    ...(onboardingData ?? {}),
    crewNotifications: rootCrewNotifications,
  };

  await AsyncStorage.setItem(
    ROOT_ONBOARDING_KEY,
    JSON.stringify(onboardingData)
  );

  await AsyncStorage.setItem(
    ROOT_CREW_NOTIFICATIONS_KEY,
    JSON.stringify(rootCrewNotifications)
  );

  await firestore()
    .collection('crewNotifications')
    .doc(String(notificationId))
    .set(
      {
        read: true,
      },
      { merge: true }
    );

  return rootCrewNotifications;
};

export const deleteRootCrewNotification =
  async (
    notificationId:
      string
  ) => {
    const safeId =
      String(
        notificationId ?? ''
      ).trim();

    if (!safeId) {
      throw new Error(
        'CREW_NOTIFICATION_DELETE_INVALID'
      );
    }

    const previousNotifications:
      RootCrewNotification[] =
      Array.isArray(
        onboardingData
          ?.crewNotifications
      )
        ? [
            ...onboardingData
              .crewNotifications,
          ]
        : [
            ...rootCrewNotifications,
          ];

    const nextNotifications =
      previousNotifications.filter(
        (
          item:
            RootCrewNotification
        ) =>
          String(
            item?.id ?? ''
          ) !==
          safeId
      );

    /*
     * 화면과 로컬 저장소에
     * 삭제 결과를 먼저 반영합니다.
     */
    rootCrewNotifications =
      nextNotifications;

    onboardingData = {
      ...(onboardingData ?? {}),

      crewNotifications:
        nextNotifications,
    };

    await Promise.all([
      AsyncStorage.setItem(
        ROOT_ONBOARDING_KEY,
        JSON.stringify(
          onboardingData
        )
      ),

      AsyncStorage.setItem(
        ROOT_CREW_NOTIFICATIONS_KEY,
        JSON.stringify(
          nextNotifications
        )
      ),
    ]);

    try {
      /*
       * 구형 firestore()
       * collection().doc().delete()
       * 대신 REST로 바로 삭제합니다.
       */
      await deleteFirestoreRestDocument({
        collectionName:
          'crewNotifications',

        documentId:
          safeId,
      });

      console.log(
        'CREW NOTIFICATION REST DELETE SUCCESS',
        {
          notificationId:
            safeId,
        }
      );
    } catch (
      deleteError:
        any
    ) {
      /*
       * 서버 삭제 실패 시
       * 로컬 알림을 원래대로 복구합니다.
       */
      rootCrewNotifications =
        previousNotifications;

      onboardingData = {
        ...(onboardingData ?? {}),

        crewNotifications:
          previousNotifications,
      };

      await Promise.all([
        AsyncStorage.setItem(
          ROOT_ONBOARDING_KEY,
          JSON.stringify(
            onboardingData
          )
        ),

        AsyncStorage.setItem(
          ROOT_CREW_NOTIFICATIONS_KEY,
          JSON.stringify(
            previousNotifications
          )
        ),
      ]);

      console.log(
        'CREW NOTIFICATION REST DELETE ERROR',
        {
          notificationId:
            safeId,

          message:
            deleteError
              ?.message ??
            String(
              deleteError
            ),
        }
      );

      throw deleteError;
    }

    return [
      ...nextNotifications,
    ];
  };


export const markAllRootCrewNotificationsRead = async () => {
  const notifications = onboardingData?.crewNotifications ?? [];

  const nextNotifications = notifications.map(
    (item: RootCrewNotification) => ({
      ...item,
      read: true,
    })
  );

  onboardingData = {
    ...(onboardingData ?? {}),
    crewNotifications: nextNotifications,
  };

  await AsyncStorage.setItem(
    ROOT_ONBOARDING_KEY,
    JSON.stringify(onboardingData)
  );

  await AsyncStorage.setItem(
    ROOT_CREW_NOTIFICATIONS_KEY,
    JSON.stringify(nextNotifications)
  );

  await Promise.all(
    nextNotifications.map((item: RootCrewNotification) =>
      firestore()
        .collection('crewNotifications')
        .doc(String(item?.id))
        .set({ read: true }, { merge: true })
    )
  );

  return nextNotifications;
};

export const deleteAllRootCrewNotifications =
  async () => {
   const notifications:
  RootCrewNotification[] =
  Array.isArray(
    onboardingData
      ?.crewNotifications
  )
    ? (
        onboardingData
          .crewNotifications as
          RootCrewNotification[]
      )
    : [];

const notificationIds:
  string[] =
  notifications
    .map(
      (
        item:
          RootCrewNotification
      ) =>
        String(
          item?.id ?? ''
        )
    )
    .filter(
      (
        notificationId:
          string
      ) =>
        notificationId.length > 0
    );

    rootCrewNotifications = [];

    onboardingData = {
      ...(onboardingData ?? {}),

      crewNotifications: [],
    };

    /*
     * 로컬에서는 즉시 모두 삭제합니다.
     */
    await Promise.all([
      AsyncStorage.setItem(
        ROOT_ONBOARDING_KEY,
        JSON.stringify(
          onboardingData
        )
      ),

      AsyncStorage.setItem(
        ROOT_CREW_NOTIFICATIONS_KEY,
        JSON.stringify([])
      ),
    ]);

    /*
     * Firestore 삭제는 뒤에서 진행합니다.
     */
    Promise.all(
      notificationIds.map(
        (notificationId) =>
          firestore()
            .collection(
              'crewNotifications'
            )
            .doc(
              notificationId
            )
            .delete()
      )
    )
      .then(() => {
        console.log(
          'CREW ALL NOTIFICATIONS SERVER DELETE SUCCESS',
          {
            count:
              notificationIds.length,
          }
        );
      })
      .catch(
        (error: any) => {
          console.log(
            'CREW ALL NOTIFICATIONS SERVER DELETE ERROR',
            {
              count:
                notificationIds.length,

              message:
                error?.message ??
                String(error),
            }
          );
        }
      );

    return [];
  };

export const addRootCrewNotification =
  async (
    notification:
      RootCrewNotification
  ) => {
    const nextNotification:
      RootCrewNotification = {
        ...notification,

        id:
          String(
            notification
              ?.id ??
              Date.now()
          ),

        read:
          notification
            ?.read ??
          false,

        createdAt:
          notification
            ?.createdAt ??
          new Date()
            .toISOString(),
      };

    const previousOnboardingData =
      onboardingData;

    const previousNotifications =
      Array.isArray(
        onboardingData
          ?.crewNotifications
      )
        ? [
            ...onboardingData
              .crewNotifications,
          ]
        : [
            ...rootCrewNotifications,
          ];

    const nextNotifications = [
      nextNotification,

      ...previousNotifications.filter(
        (
          item:
            RootCrewNotification
        ) =>
          String(
            item?.id ?? ''
          ) !==
          String(
            nextNotification.id
          )
      ),
    ];

    rootCrewNotifications =
      nextNotifications;

    onboardingData = {
      ...(onboardingData ?? {}),

      crewNotifications:
        nextNotifications,
    };

    await Promise.all([
      AsyncStorage.setItem(
        ROOT_ONBOARDING_KEY,
        JSON.stringify(
          onboardingData
        )
      ),

      AsyncStorage.setItem(
        ROOT_CREW_NOTIFICATIONS_KEY,
        JSON.stringify(
          nextNotifications
        )
      ),
    ]);

    try {
      await writeFirestoreRestDocument({
        collectionName:
          'crewNotifications',

        documentId:
          String(
            nextNotification.id
          ),

        data:
          nextNotification,
      });

      console.log(
        'CREW NOTIFICATION REST SAVE SUCCESS',
        {
          notificationId:
            nextNotification.id,

          type:
            nextNotification.type,

          targetUserId:
            nextNotification
              .targetUserId ??
            null,
        }
      );
    } catch (
      saveError: any
    ) {
      rootCrewNotifications =
        previousNotifications;

      onboardingData =
        previousOnboardingData;

      await Promise.all([
        AsyncStorage.setItem(
          ROOT_ONBOARDING_KEY,
          JSON.stringify(
            onboardingData
          )
        ),

        AsyncStorage.setItem(
          ROOT_CREW_NOTIFICATIONS_KEY,
          JSON.stringify(
            previousNotifications
          )
        ),
      ]);

      console.log(
        'CREW NOTIFICATION REST SAVE ERROR',
        {
          notificationId:
            nextNotification.id,

          message:
            saveError
              ?.message ??
            String(
              saveError
            ),
        }
      );

      throw saveError;
    }

    return [
      ...nextNotifications,
    ];
  };

export const loadRootCrewNotifications =
  async (
    userId:
      string
  ) => {
    let localNotifications:
      RootCrewNotification[] =
      Array.isArray(
        onboardingData
          ?.crewNotifications
      )
        ? onboardingData
            .crewNotifications
        : [];

    try {
      const raw =
        await AsyncStorage.getItem(
          ROOT_CREW_NOTIFICATIONS_KEY
        );

      const storedNotifications =
        safeJsonParse<
          RootCrewNotification[]
        >(
          raw,
          []
        );

      if (
        storedNotifications.length >
        0
      ) {
        localNotifications =
          storedNotifications;
      }
    } catch (
      error
    ) {
      console.log(
        'CREW NOTIFICATION LOCAL LOAD ERROR',
        error
      );
    }

    const notificationQuery =
      query(
        collection(
          firebaseDb,
          'crewNotifications'
        ),
        where(
          'targetUserId',
          '==',
          String(userId)
        )
      );

    const serverLoadPromise =
      getDocs(
        notificationQuery
      )
        .then(
          async (
            snapshot
          ) => {
            const notifications =
              snapshot.docs
                .map(
                  (
                    documentSnapshot
                  ) => ({
                    id:
                      documentSnapshot.id,

                    ...documentSnapshot.data(),
                  })
                )
                .sort(
                  (
                    first:
                      any,
                    second:
                      any
                  ) =>
                    String(
                      second
                        ?.createdAt ??
                        ''
                    ).localeCompare(
                      String(
                        first
                          ?.createdAt ??
                          ''
                      )
                    )
                ) as RootCrewNotification[];

            rootCrewNotifications =
              notifications;

            onboardingData = {
              ...(onboardingData ??
                {}),

              crewNotifications:
                notifications,
            };

            await Promise.all([
              AsyncStorage.setItem(
                ROOT_ONBOARDING_KEY,
                JSON.stringify(
                  onboardingData
                )
              ),

              AsyncStorage.setItem(
                ROOT_CREW_NOTIFICATIONS_KEY,
                JSON.stringify(
                  notifications
                )
              ),
            ]);

            return notifications;
          }
        )
        .catch(
          (
            error
          ) => {
            console.log(
              'CREW NOTIFICATION SERVER LOAD ERROR',
              error
            );

            return localNotifications;
          }
        );

    return resolveWithTimeout(
      serverLoadPromise,
      localNotifications,
      3000,
      'CREW NOTIFICATION SERVER LOAD TIMEOUT: LOCAL DATA USED'
    );
  };

export const subscribeRootCrewNotifications =
  (
    userId:
      string,

    onChange:
      (
        notifications:
          RootCrewNotification[]
      ) => void
  ) => {
    const notificationQuery =
      query(
        collection(
          firebaseDb,
          'crewNotifications'
        ),
        where(
          'targetUserId',
          '==',
          String(userId)
        )
      );

    return onSnapshot(
      notificationQuery,

      (
        snapshot
      ) => {
        const notifications =
          snapshot.docs
            .map(
              (
                documentSnapshot
              ) => ({
                id:
                  documentSnapshot.id,

                ...documentSnapshot.data(),
              })
            )
            .sort(
              (
                first:
                  any,
                second:
                  any
              ) =>
                String(
                  second?.createdAt ??
                    ''
                ).localeCompare(
                  String(
                    first?.createdAt ??
                      ''
                  )
                )
            ) as RootCrewNotification[];

        rootCrewNotifications =
          notifications;

        onboardingData = {
          ...(onboardingData ??
            {}),

          crewNotifications:
            notifications,
        };

        void Promise.all([
          AsyncStorage.setItem(
            ROOT_ONBOARDING_KEY,
            JSON.stringify(
              onboardingData
            )
          ),

          AsyncStorage.setItem(
            ROOT_CREW_NOTIFICATIONS_KEY,
            JSON.stringify(
              notifications
            )
          ),
        ]).catch(
          (
            error
          ) => {
            console.log(
              'CREW NOTIFICATION SUBSCRIBE LOCAL SAVE ERROR',
              error
            );
          }
        );

        onChange(
          notifications
        );
      },

      (
        error
      ) => {
        console.log(
          'CREW NOTIFICATION SUBSCRIBE ERROR',
          error
        );

        onChange(
          Array.isArray(
            onboardingData
              ?.crewNotifications
          )
            ? onboardingData
                .crewNotifications
            : []
        );
      }
    );
  };

let rootCrewPosts: RootCrewPost[] = [];

const rootCrewPostListeners =
  new Set<
    (
      posts: RootCrewPost[]
    ) => void
  >();

const emitRootCrewPosts = () => {
  const nextPosts = [
    ...rootCrewPosts,
  ];

  rootCrewPostListeners.forEach(
    (listener) => {
      try {
        listener(nextPosts);
      } catch (error) {
        console.log(
          'CREW POST LISTENER ERROR',
          error
        );
      }
    }
  );

  console.log(
    'CREW POST STATE EMITTED',
    {
      postCount:
        nextPosts.length,
      listenerCount:
        rootCrewPostListeners.size,
    }
  );
};

const mergeCrewPostsWithLocal = (
  serverPosts: RootCrewPost[]
) => {
  const currentUid =
    firebaseAuth.currentUser?.uid ??
    null;

  const serverPostIds = new Set(
    serverPosts.map((post) =>
      String(post.id)
    )
  );

  const unsyncedLocalPosts =
    currentUid
      ? rootCrewPosts.filter(
          (post) =>
            String(
              post.userId ?? ''
            ) ===
              String(currentUid) &&
            !serverPostIds.has(
              String(post.id)
            )
        )
      : [];

  const mergedMap = new Map<
    string,
    RootCrewPost
  >();

  serverPosts.forEach(
  (post) => {
    mergedMap.set(
      String(post.id),
      {
        ...post,
        syncStatus:
          'synced',
        syncError:
          null,
      }
    );
  }
);

  unsyncedLocalPosts.forEach((post) => {
    mergedMap.set(
      String(post.id),
      post
    );
  });

  return Array.from(
    mergedMap.values()
  ).sort((a, b) =>
    String(
      b.createdAt ??
      b.updatedAt ??
      ''
    ).localeCompare(
      String(
        a.createdAt ??
        a.updatedAt ??
        ''
      )
    )
  );
};

export const loadRootCrewPosts =
  async () => {
    let localPosts:
      RootCrewPost[] = [];

    try {
      const raw =
        await AsyncStorage.getItem(
          ROOT_CREW_POSTS_KEY
        );

      localPosts =
        safeJsonParse<
          RootCrewPost[]
        >(
          raw,
          []
        );

      rootCrewPosts =
        localPosts;

      emitRootCrewPosts();

      console.log(
        'CREW POST LOCAL LOAD SUCCESS',
        {
          count:
            rootCrewPosts.length,
        }
      );
    } catch (
      localError
    ) {
      console.log(
        'CREW POST LOCAL LOAD ERROR',
        localError
      );

      localPosts = [];
      rootCrewPosts = [];
    }

    const postQuery =
      query(
        collection(
          firebaseDb,
          'crewPosts'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    const serverLoadPromise =
      getDocs(
        postQuery
      )
        .then(
          async (
            snapshot
          ) => {
            const serverPosts =
              snapshot.docs.map(
                (
                  documentSnapshot
                ) => ({
                  id:
                    documentSnapshot.id,

                  ...documentSnapshot.data(),
                })
              ) as RootCrewPost[];

            rootCrewPosts =
              mergeCrewPostsWithLocal(
                serverPosts
              );

            emitRootCrewPosts();

            await AsyncStorage.setItem(
              ROOT_CREW_POSTS_KEY,
              JSON.stringify(
                rootCrewPosts
              )
            );

            console.log(
              'CREW POST SERVER LOAD SUCCESS',
              {
                serverCount:
                  serverPosts.length,

                mergedCount:
                  rootCrewPosts.length,
              }
            );

            return rootCrewPosts;
          }
        )
        .catch(
          (
            error
          ) => {
            console.log(
              'CREW POST SERVER LOAD ERROR',
              error
            );

            return localPosts;
          }
        );

    return resolveWithTimeout(
      serverLoadPromise,
      localPosts,
      3000,
      'CREW POST SERVER LOAD TIMEOUT: LOCAL DATA USED'
    );
  };

export const subscribeRootCrewPosts =
  (
    onChange:
      (
        posts:
          RootCrewPost[]
      ) => void
  ) => {
    rootCrewPostListeners.add(
      onChange
    );

    onChange([
      ...rootCrewPosts,
    ]);

    const postQuery =
      query(
        collection(
          firebaseDb,
          'crewPosts'
        ),
        orderBy(
          'createdAt',
          'desc'
        )
      );

    const unsubscribeFirestore =
      onSnapshot(
        postQuery,

        (
          snapshot
        ) => {
          const serverPosts =
            snapshot.docs.map(
              (
                documentSnapshot
              ) => ({
                id:
                  documentSnapshot.id,

                ...documentSnapshot.data(),
              })
            ) as RootCrewPost[];

          rootCrewPosts =
            mergeCrewPostsWithLocal(
              serverPosts
            );

          void AsyncStorage.setItem(
            ROOT_CREW_POSTS_KEY,
            JSON.stringify(
              rootCrewPosts
            )
          ).catch(
            (
              error
            ) => {
              console.log(
                'CREW POST SUBSCRIBE LOCAL SAVE ERROR',
                error
              );
            }
          );

          console.log(
            'CREW POST SNAPSHOT RECEIVED',
            {
              serverCount:
                serverPosts.length,

              mergedCount:
                rootCrewPosts.length,
            }
          );

          emitRootCrewPosts();
        },

        (
          error
        ) => {
          console.log(
            'CREW POST SUBSCRIBE ERROR',
            error
          );

          emitRootCrewPosts();
        }
      );

    return () => {
      rootCrewPostListeners.delete(
        onChange
      );

      unsubscribeFirestore();
    };
  };

export const getRootCrewPosts = () => {
  return rootCrewPosts;
};

const removeUndefinedFields = (value: any): any => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedFields(item))
      .filter((item) => item !== undefined);
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    return Object.entries(value).reduce(
      (acc: any, [key, itemValue]) => {
        if (itemValue === undefined) {
          return acc;
        }

        const cleanedValue =
          removeUndefinedFields(itemValue);

        if (cleanedValue !== undefined) {
          acc[key] = cleanedValue;
        }

        return acc;
      },
      {}
    );
  }

  return value;
};

export const addRootCrewPost =
  async (
    post: RootCrewPost
  ) => {
    const currentUser =
      firebaseAuth.currentUser;

    if (!currentUser?.uid) {
      throw new Error(
        'LOGIN_REQUIRED'
      );
    }

    const postId =
      String(post.id);

    const now =
      new Date()
        .toISOString();

    const localPost =
      rootCrewPosts.find(
        (item) =>
          String(
            item?.id
          ) === postId
      ) ?? null;

    const nextPost:
      RootCrewPost = {
      ...(localPost ?? {}),
      ...post,

      id:
        postId,

      userId:
        currentUser.uid,

      status:
        post.status ??
        localPost?.status ??
        'active',

      cheers:
        localPost?.cheers ??
        post.cheers ??
        0,

      cheered:
        localPost?.cheered ??
        post.cheered,

      comments:
        localPost?.comments ??
        post.comments ??
        [],

      createdAt:
        localPost?.createdAt ??
        post.createdAt ??
        now,

      updatedAt:
        now,

      /*
       * 서버 응답 전에는
       * 동기화 대기 상태입니다.
       */
      syncStatus:
        'pending',

      syncError:
        null,
    };

    const pendingPost =
      removeUndefinedFields(
        nextPost
      ) as RootCrewPost;

    /*
     * 서버 연결을 기다리지 않고
     * 우선 로컬에 게시물을 저장합니다.
     */
    rootCrewPosts =
      rootCrewPosts.some(
        (item) =>
          String(
            item?.id
          ) === postId
      )
        ? rootCrewPosts.map(
            (item) =>
              String(
                item?.id
              ) === postId
                ? pendingPost
                : item
          )
        : [
            pendingPost,
            ...rootCrewPosts,
          ];

    await AsyncStorage.setItem(
      ROOT_CREW_POSTS_KEY,
      JSON.stringify(
        rootCrewPosts
      )
    );

    emitRootCrewPosts();

    console.log(
      'CREW POST LOCAL SAVE SUCCESS',
      {
        postId,

        postCount:
          rootCrewPosts.length,

        target:
          pendingPost.target,

        crewId:
          pendingPost.crewId ??
          null,

        syncStatus:
          'pending',
      }
    );

    /*
     * syncStatus와 syncError는
     * 앱 로컬 상태이므로 Firestore에는
     * 저장하지 않습니다.
     */
    const serverPost:
      Record<string, any> = {
      ...pendingPost,
    };

    delete serverPost.syncStatus;
    delete serverPost.syncError;

/*
 * Firestore 게시물 저장이
 * 완료될 때까지 기다립니다.
 *
 * 저장 실패 시 오류를 다시 throw하여
 * record.tsx가 공유 성공으로
 * 잘못 처리하지 않도록 합니다.
 */
console.log(
  'CREW POST SERVER WRITE START',
  {
    postId,

    userId:
      currentUser.uid,

    target:
      serverPost.target,

    crewId:
      serverPost.crewId ??
      null,

    photoUri:
      serverPost.photoUri ??
      null,
  }
);

try {
  const firestoreDb =
    firestore();

  /*
   * enableNetwork 자체가 오래 대기하더라도
   * 게시물 저장 타임아웃을 막지 않도록
   * await하지 않고 별도로 실행합니다.
   */
  void firestoreDb
    .enableNetwork()
    .then(() => {
      console.log(
        'CREW POST FIRESTORE NETWORK ENABLED',
        {
          postId,
        }
      );
    })
    .catch(
      (
        networkError: any
      ) => {
        console.log(
          'CREW POST FIRESTORE NETWORK ENABLE ERROR',
          {
            postId,

            code:
              networkError?.code ??
              null,

            message:
              networkError?.message ??
              String(
                networkError
              ),
          }
        );
      }
    );

  /*
   * enableNetwork 완료를 기다리지 않고
   * 즉시 쓰기를 시작합니다.
   *
   * Firestore 쓰기가 끝나지 않으면
   * 15초 후 반드시 catch로 이동합니다.
   */
  await rejectWriteWithTimeout(
    firestoreDb
      .collection(
        'crewPosts'
      )
      .doc(
        postId
      )
      .set(
        serverPost,
        {
          merge: true,
        }
      ),

    15000,

    'FIRESTORE_POST_WRITE_TIMEOUT'
  );

  /*
   * Firestore 저장 성공 후
   * 로컬 게시물도 동기화 완료로
   * 변경합니다.
   */
  rootCrewPosts =
    rootCrewPosts.map(
      (item) =>
        String(
          item?.id
        ) === postId
          ? {
              ...item,

              syncStatus:
                'synced',

              syncError:
                null,
            }
          : item
    );

  await AsyncStorage.setItem(
    ROOT_CREW_POSTS_KEY,
    JSON.stringify(
      rootCrewPosts
    )
  );

  emitRootCrewPosts();

  console.log(
    'CREW POST SERVER WRITE SUCCESS',
    {
      postId,

      target:
        serverPost.target,

      photoUri:
        serverPost.photoUri ??
        null,

      syncStatus:
        'synced',
    }
  );
} catch (
  error: any
) {
  const errorMessage =
    error?.message ??
    String(error);

      /*
   * RNFirebase의 쓰기 Promise가
   * 시간 안에 끝나지 않았더라도,
   * 실제 서버에는 저장됐을 수 있습니다.
   *
   * REST로 해당 문서를 직접 확인하고
   * 존재하면 정상 성공으로 처리합니다.
   */
  if (
    errorMessage ===
    'FIRESTORE_POST_WRITE_TIMEOUT'
  ) {
    try {
     if (
  errorMessage ===
  'FIRESTORE_POST_WRITE_TIMEOUT'
) {
  try {
    await writeFirestoreRestDocument({
      collectionName:
        'crewPosts',

      documentId:
        postId,

      data:
        serverPost,
    });

    rootCrewPosts =
      rootCrewPosts.map(
        (item) =>
          String(
            item?.id
          ) === postId
            ? {
                ...item,

                syncStatus:
                  'synced',

                syncError:
                  null,
              }
            : item
      );

    await AsyncStorage.setItem(
      ROOT_CREW_POSTS_KEY,
      JSON.stringify(
        rootCrewPosts
      )
    );

    emitRootCrewPosts();

    console.log(
      'CREW POST TIMEOUT BUT REST WRITE SUCCESS',
      {
        postId,

        photoUri:
          serverPost
            ?.photoUri ??
          null,

        syncStatus:
          'synced',
      }
    );

    return rootCrewPosts;
  } catch (
    restWriteError: any
  ) {
    console.log(
      'CREW POST REST WRITE ERROR',
      {
        postId,

        message:
          restWriteError
            ?.message ??
          String(
            restWriteError
          ),
      }
    );
  }
}



    } catch (
      verifyError: any
    ) {
      console.log(
        'CREW POST TIMEOUT VERIFY ERROR',
        {
          postId,

          message:
            verifyError?.message ??
            String(
              verifyError
            ),
        }
      );
    }
  }

  /*
   * REST 확인에서도 서버 문서가 없을 때만
   * 실제 실패로 표시합니다.
   */

  /*
   * 실패한 게시물은 로컬에서
   * 동기화 실패 상태로 표시합니다.
   */
  rootCrewPosts =
    rootCrewPosts.map(
      (item) =>
        String(
          item?.id
        ) === postId
          ? {
              ...item,

              syncStatus:
                'failed',

              syncError:
                errorMessage,
            }
          : item
    );

  try {
    await AsyncStorage.setItem(
      ROOT_CREW_POSTS_KEY,
      JSON.stringify(
        rootCrewPosts
      )
    );

    emitRootCrewPosts();
  } catch (
    localSaveError
  ) {
    console.log(
      'CREW POST SYNC ERROR LOCAL SAVE ERROR',
      localSaveError
    );
  }

  console.error(
    'CREW POST SERVER WRITE ERROR',
    {
      postId,

      code:
        error?.code ??
        null,

      message:
        errorMessage,
    }
  );

  /*
   * record.tsx의 공유 함수
   * catch로 오류를 전달합니다.
   */
  throw error;
}

return rootCrewPosts;
  };

  export const removeRootCrewPost =
  async (
    postId: string
  ) => {
    const safePostId =
      String(
        postId
      );

    try {
      /*
       * 우선 네이티브 Firestore로 삭제합니다.
       */
      await rejectWriteWithTimeout(
        firestore()
          .collection(
            'crewPosts'
          )
          .doc(
            safePostId
          )
          .delete(),

        15000,

        'FIRESTORE_POST_DELETE_TIMEOUT'
      );

      console.log(
        'CREW POST SERVER DELETE SUCCESS',
        safePostId
      );
    } catch (
      error: any
    ) {
      const errorMessage =
        error?.message ??
        String(
          error
        );

      /*
       * 네이티브 삭제 응답이 멈춘 경우
       * REST API로 확실하게 삭제합니다.
       */
      if (
        errorMessage ===
        'FIRESTORE_POST_DELETE_TIMEOUT'
      ) {
        await deleteFirestoreRestDocument({
          collectionName:
            'crewPosts',

          documentId:
            safePostId,
        });
      } else {
        console.log(
          'CREW POST SERVER DELETE ERROR',
          {
            postId:
              safePostId,

            code:
              error?.code ??
              null,

            message:
              errorMessage,
          }
        );

        throw error;
      }
    }

    /*
     * 서버 삭제 완료 후에만
     * 로컬 목록에서도 제거합니다.
     */
    rootCrewPosts =
      rootCrewPosts.filter(
        (post) =>
          String(
            post.id
          ) !==
          safePostId
      );

    await AsyncStorage.setItem(
      ROOT_CREW_POSTS_KEY,
      JSON.stringify(
        rootCrewPosts
      )
    );

    emitRootCrewPosts();

    console.log(
      'CREW POST LOCAL DELETE SUCCESS',
      safePostId
    );

    return rootCrewPosts;
  };

export const hideRootCrewPost = async (postId: string) => {
  rootCrewPosts = rootCrewPosts.map((post) =>
    String(post.id) === String(postId)
      ? {
          ...post,
          status: 'hidden',
          updatedAt: new Date().toISOString(),
        }
      : post
  );

  await AsyncStorage.setItem(
    ROOT_CREW_POSTS_KEY,
    JSON.stringify(rootCrewPosts)
  );


emitRootCrewPosts();

  await firestore()
    .collection('crewPosts')
    .doc(String(postId))
    .set(
      {
        status: 'hidden',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

  return rootCrewPosts;
};

export const toggleRootCrewPostCheer = async (postId: string) => {
  rootCrewPosts = rootCrewPosts.map((post) => {
    if (
  String(post.id) !==
  String(postId)
) {
  return post;
}

    const cheered = post.cheered === true;

    return {
      ...post,
      cheered: !cheered,
      cheers: cheered
        ? Math.max((post.cheers ?? 0) - 1, 0)
        : (post.cheers ?? 0) + 1,
    };
  });

  await AsyncStorage.setItem(
    ROOT_CREW_POSTS_KEY,
    JSON.stringify(rootCrewPosts)
  );

  emitRootCrewPosts();

  const updatedPost =
  rootCrewPosts.find(
    (post) =>
      String(post.id) ===
      String(postId)
  );

if (updatedPost) {
  await firestore()
    .collection('crewPosts')
    .doc(String(postId))
    .set(
      {
        cheers: updatedPost.cheers ?? 0,
        cheered: updatedPost.cheered ?? false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
}
  return rootCrewPosts;

  
};
export const addRootCrewPostComment =
  async (
    postId: string,
    text: string,
    nickname?: string,
    profileEmoji?: string
  ) => {
    const safePostId =
      String(postId ?? '');

    const createdAt =
      new Date().toISOString();

    rootCrewPosts =
      rootCrewPosts.map(
        (post) => {
          if (
            String(
              post?.id ?? ''
            ) !== safePostId
          ) {
            return post;
          }

          const comments =
            Array.isArray(
              post?.comments
            )
              ? post.comments
              : [];

          return {
            ...post,

            comments: [
              ...comments,

              {
                id:
                  String(
                    Date.now()
                  ),

                text,

                nickname:
                  nickname ??
                  onboardingData
                    ?.nickname ??
                  '루트유저',

                profileEmoji:
                  profileEmoji ??
                  onboardingData
                    ?.profileEmoji ??
                  '🦊',

                createdAt,
              },
            ],

            updatedAt:
              createdAt,
          };
        }
      );

    /*
     * 로컬 저장은 기다립니다.
     * 이 작업이 완료되면 댓글은
     * 현재 기기에 확실히 저장된 상태입니다.
     */
    await AsyncStorage.setItem(
      ROOT_CREW_POSTS_KEY,
      JSON.stringify(
        rootCrewPosts
      )
    );

    /*
     * 구독 중인 화면을 즉시 갱신합니다.
     */
    emitRootCrewPosts();

    const nextPosts = [
      ...rootCrewPosts,
    ];

    const updatedPost =
      rootCrewPosts.find(
        (post) =>
          String(
            post?.id ?? ''
          ) === safePostId
      );

    console.log(
      'CREW COMMENT LOCAL SAVE SUCCESS',
      {
        postId:
          safePostId,

        commentCount:
          updatedPost
            ?.comments
            ?.length ?? 0,
      }
    );

    /*
     * Firestore 저장은 화면을
     * 기다리게 하지 않고 진행합니다.
     */
    if (updatedPost) {
      firestore()
        .collection(
          'crewPosts'
        )
        .doc(
          safePostId
        )
        .set(
          {
            comments:
              updatedPost
                .comments ??
              [],

            updatedAt:
              createdAt,
          },
          {
            merge: true,
          }
        )
        .then(() => {
          console.log(
            'CREW COMMENT SERVER SAVE SUCCESS',
            {
              postId:
                safePostId,

              commentCount:
                updatedPost
                  ?.comments
                  ?.length ??
                0,
            }
          );
        })
        .catch(
          (error: any) => {
            console.log(
              'CREW COMMENT SERVER SAVE ERROR',
              {
                postId:
                  safePostId,

                code:
                  error?.code ??
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
    }

    /*
     * Firestore 응답을 기다리지 않고
     * 로컬 저장 결과를 바로 반환합니다.
     */
    return nextPosts;
  };


export const getRootCrewNotifications = () => {
  return onboardingData?.crewNotifications ?? [];
};

export const toggleRootFollowUser = async (
  userId: string
) => {
  const following =
    onboardingData?.followingUsers ?? [];

  const exists =
    following.includes(userId);

  onboardingData = {
    ...(onboardingData ?? {}),
    followingUsers: exists
      ? following.filter(
          (id: string) => id !== userId
        )
      : [...following, userId],
  };

  await AsyncStorage.setItem(
    ROOT_ONBOARDING_KEY,
    JSON.stringify(onboardingData)
  );

  return onboardingData.followingUsers;
};

export const setRootMainBadgeId = async (
  badgeId: string
) => {
  const ownerId =
    getCurrentBadgeOwnerId();

  if (!ownerId) {
    console.log(
      'SET MAIN BADGE SKIPPED: OWNER 없음'
    );
    return onboardingData;
  }

  if (!isCurrentBadgeOwner(ownerId)) {
    console.log(
      'SET MAIN BADGE SKIPPED: UID 불일치',
      {
        ownerId,
        rootOwnerId:
          getOnboardingOwnerId(),
      }
    );
    return onboardingData;
  }

  const currentUser =
    firebaseAuth.currentUser;

  onboardingData = {
    ...(onboardingData ?? {}),
    ...(currentUser?.uid
      ? { uid: currentUser.uid }
      : {}),
    mainBadgeId: badgeId,
  };

  await Promise.all([
    AsyncStorage.setItem(
      ROOT_ONBOARDING_KEY,
      JSON.stringify(onboardingData)
    ),
    AsyncStorage.setItem(
      getMainBadgeStorageKey(ownerId),
      JSON.stringify(badgeId)
    ),
  ]);

  if (
    currentUser?.uid &&
    String(currentUser.uid) === ownerId
  ) {
    try {
      await mergeUserDocument(
  currentUser.uid,
  {
    badgeMainBadgeId:
      badgeId,

    updatedAt:
      new Date()
        .toISOString(),
  }
);
    } catch (error) {
      console.log(
        'SET MAIN BADGE SERVER SAVE ERROR',
        error
      );
    }
  }

  return onboardingData;
};

export const getRootMainBadgeId = () => {
  const ownerId =
    getCurrentBadgeOwnerId();

  if (
    !ownerId ||
    !isCurrentBadgeOwner(ownerId)
  ) {
    return null;
  }

  return (
    onboardingData?.mainBadgeId ??
    null
  );
};

export const loadRootMainBadgeId =
  async (): Promise<
    string | null
  > => {
    const ownerId =
      getCurrentBadgeOwnerId();

    if (
      !ownerId ||
      !isCurrentBadgeOwner(
        ownerId
      )
    ) {
      return null;
    }

    const localRaw =
      await AsyncStorage.getItem(
        getMainBadgeStorageKey(
          ownerId
        )
      );

    const localBadgeId =
      safeJsonParse<
        string | null
      >(
        localRaw,
        null
      );

    const memoryBadgeId =
      typeof onboardingData
        ?.mainBadgeId ===
      'string'
        ? onboardingData
            .mainBadgeId
        : null;

    let serverBadgeId:
      | string
      | null = null;

    const currentUser =
      firebaseAuth.currentUser;

    if (
      currentUser?.uid &&
      String(
        currentUser.uid
      ) ===
        String(ownerId)
    ) {
      try {
        const snapshot =
          await resolveWithTimeout<
            any | null
          >(
            getDoc(
  getUserDocumentRef(
    currentUser.uid
  )
),

            null,

            2500,

            'MAIN BADGE SERVER LOAD TIMEOUT: LOCAL DATA USED'
          );

        if (snapshot) {
          const serverData =
            snapshot.data() as any;

          const candidate =
            serverData
              ?.badgeMainBadgeId ??
            serverData
              ?.rootData
              ?.mainBadgeId ??
            null;

          serverBadgeId =
            typeof candidate ===
            'string'
              ? candidate
              : null;
        }
      } catch (error) {
        console.log(
          'LOAD MAIN BADGE SERVER ERROR',
          error
        );
      }
    }

    const resolvedBadgeId =
      serverBadgeId ??
      memoryBadgeId ??
      localBadgeId ??
      null;

    if (resolvedBadgeId) {
      onboardingData = {
        ...(onboardingData ??
          {}),

        mainBadgeId:
          resolvedBadgeId,
      };

      await Promise.all([
        AsyncStorage.setItem(
          ROOT_ONBOARDING_KEY,
          JSON.stringify(
            onboardingData
          )
        ),

        AsyncStorage.setItem(
          getMainBadgeStorageKey(
            ownerId
          ),

          JSON.stringify(
            resolvedBadgeId
          )
        ),
      ]);
    }

    return resolvedBadgeId;
  };

export type RootBadge = {
  id: string;
  icon: string;
  title: string;
  desc: string;
  group:
    | 'start'
    | 'streak'
    | 'exercise'
    | 'study'
    | 'mental'
    | 'daily'
    | 'share'
    | 'cheer'
    | 'comment'
    | 'follow';
  conditionText: string;
};

export const ROOT_BADGES: RootBadge[] = [
  // 시작 / 꾸준함
  {
    id: 'first_action',
    icon: '🌱',
    title: '첫 걸음',
    desc: '루트에서 첫 행동목표를 완료했어요.',
    group: 'start',
    conditionText: '행동목표 1회 완료',
  },
  {
    id: 'action_10',
    icon: '🌿',
    title: '꾸준함의 씨앗',
    desc: '작은 실천을 10번 쌓았어요.',
    group: 'start',
    conditionText: '행동목표 10회 완료',
  },
  {
    id: 'action_50',
    icon: '🌳',
    title: '꾸준함의 나무',
    desc: '루틴이 삶에 뿌리내리기 시작했어요.',
    group: 'start',
    conditionText: '행동목표 50회 완료',
  },
  {
    id: 'action_100',
    icon: '🏡',
    title: '습관의 마을',
    desc: '꾸준함으로 마을 하나를 세웠어요.',
    group: 'start',
    conditionText: '행동목표 100회 완료',
  },

  // 연속 기록
  {
    id: 'streak_3',
    icon: '🔥',
    title: '3일 연속',
    desc: '3일 연속으로 기록을 남겼어요.',
    group: 'streak',
    conditionText: '3일 연속 기록',
  },
  {
    id: 'streak_7',
    icon: '🔥',
    title: '7일 연속',
    desc: '일주일 동안 루틴을 이어갔어요.',
    group: 'streak',
    conditionText: '7일 연속 기록',
  },
  {
    id: 'streak_30',
    icon: '🔥',
    title: '30일 연속',
    desc: '한 달 동안 흐름을 끊지 않았어요.',
    group: 'streak',
    conditionText: '30일 연속 기록',
  },
  {
    id: 'streak_100',
    icon: '☀️',
    title: '100일의 태양',
    desc: '100일 동안 꾸준히 성장했어요.',
    group: 'streak',
    conditionText: '100일 연속 기록',
  },

  // 운동
  {
    id: 'exercise_10h',
    icon: '🏃',
    title: '운동 입문',
    desc: '운동 시간을 10시간 쌓았어요.',
    group: 'exercise',
    conditionText: '운동 10시간',
  },
  {
    id: 'exercise_50h',
    icon: '💪',
    title: '운동러',
    desc: '몸을 움직이는 습관이 생겼어요.',
    group: 'exercise',
    conditionText: '운동 50시간',
  },
  {
    id: 'exercise_100h',
    icon: '🏆',
    title: '운동왕',
    desc: '운동 시간이 100시간을 넘었어요.',
    group: 'exercise',
    conditionText: '운동 100시간',
  },
  {
    id: 'exercise_500h',
    icon: '👑',
    title: '운동의 신',
    desc: '엄청난 운동 시간을 쌓았어요.',
    group: 'exercise',
    conditionText: '운동 500시간',
  },

  // 공부
  {
    id: 'study_10h',
    icon: '📖',
    title: '공부 시작',
    desc: '공부 시간을 10시간 쌓았어요.',
    group: 'study',
    conditionText: '공부 10시간',
  },
  {
    id: 'study_50h',
    icon: '📚',
    title: '공부러',
    desc: '공부 습관이 만들어지고 있어요.',
    group: 'study',
    conditionText: '공부 50시간',
  },
  {
    id: 'study_100h',
    icon: '🎓',
    title: '공부왕',
    desc: '공부 시간이 100시간을 넘었어요.',
    group: 'study',
    conditionText: '공부 100시간',
  },
  {
    id: 'study_500h',
    icon: '🧠',
    title: '지식의 현자',
    desc: '꾸준히 지식을 쌓아왔어요.',
    group: 'study',
    conditionText: '공부 500시간',
  },

  // 정신
  {
    id: 'mental_10h',
    icon: '🌸',
    title: '마음 돌보기',
    desc: '마음 챙김 시간을 10시간 쌓았어요.',
    group: 'mental',
    conditionText: '정신 10시간',
  },
  {
    id: 'mental_50h',
    icon: '🧘',
    title: '마음 수련',
    desc: '마음을 돌보는 습관이 생겼어요.',
    group: 'mental',
    conditionText: '정신 50시간',
  },
  {
    id: 'mental_100h',
    icon: '☯️',
    title: '정신의 달인',
    desc: '내면의 균형을 오래 지켜왔어요.',
    group: 'mental',
    conditionText: '정신 100시간',
  },

  // 일상
  {
    id: 'daily_10h',
    icon: '🏠',
    title: '생활 습관',
    desc: '일상 루틴을 10시간 실천했어요.',
    group: 'daily',
    conditionText: '일상 10시간',
  },
  {
    id: 'daily_50h',
    icon: '🌞',
    title: '일상 마스터',
    desc: '생활 리듬이 안정되고 있어요.',
    group: 'daily',
    conditionText: '일상 50시간',
  },
  {
    id: 'daily_100h',
    icon: '⭐',
    title: '생활왕',
    desc: '일상을 꾸준히 가꿔왔어요.',
    group: 'daily',
    conditionText: '일상 100시간',
  },

  // 공유
  {
    id: 'share_1',
    icon: '📸',
    title: '첫 공유',
    desc: '첫 기록을 크루에 공유했어요.',
    group: 'share',
    conditionText: '공유 1개',
  },
  {
    id: 'share_10',
    icon: '📷',
    title: '기록러',
    desc: '공유 기록이 10개를 넘었어요.',
    group: 'share',
    conditionText: '공유 10개',
  },
  {
    id: 'share_50',
    icon: '🌍',
    title: '영향력 있는 루터',
    desc: '많은 기록을 사람들과 나눴어요.',
    group: 'share',
    conditionText: '공유 50개',
  },

  // 응원
  {
    id: 'cheer_10',
    icon: '👏',
    title: '응원받는 사람',
    desc: '응원을 10개 받았어요.',
    group: 'cheer',
    conditionText: '응원 10개',
  },
  {
    id: 'cheer_100',
    icon: '💖',
    title: '인기인',
    desc: '응원을 100개 받았어요.',
    group: 'cheer',
    conditionText: '응원 100개',
  },

  // 댓글
  {
    id: 'comment_10',
    icon: '💬',
    title: '소통 시작',
    desc: '댓글이 10개 쌓였어요.',
    group: 'comment',
    conditionText: '댓글 10개',
  },
  {
    id: 'comment_100',
    icon: '🗨️',
    title: '소통왕',
    desc: '많은 사람들과 이야기를 나눴어요.',
    group: 'comment',
    conditionText: '댓글 100개',
  },

  // 팔로우
  {
    id: 'follow_1',
    icon: '🤝',
    title: '첫 연결',
    desc: '첫 팔로우 관계가 생겼어요.',
    group: 'follow',
    conditionText: '팔로잉 1명',
  },
  {
    id: 'follow_10',
    icon: '👥',
    title: '함께하는 루터',
    desc: '여러 사람과 함께 성장하고 있어요.',
    group: 'follow',
    conditionText: '팔로잉 10명',
  },
];

export const getEarnedBadges = (
  requestedOwnerId?: string | null
) => {
  const ownerId =
    requestedOwnerId ??
    getCurrentBadgeOwnerId();

  if (!ownerId) {
    return [];
  }

  if (!isCurrentBadgeOwner(ownerId)) {
    console.log(
      'BADGE CALCULATION SKIPPED: UID 불일치',
      {
        ownerId,
        rootOwnerId:
          getOnboardingOwnerId(),
      }
    );
    return [];
  }

  const allActionLogs =
    onboardingData?.actionLogs ?? [];

  /*
   * 이전 기록에는 userId가 없을 수 있습니다.
   * 현재 UID의 rootData에 들어 있는 무소유 기록은
   * 기존 기록으로 인정하고, 다른 UID가 적힌 기록은 제외합니다.
   */
  const actionLogs =
    allActionLogs.filter(
      (log: any) =>
        !log?.userId ||
        String(log.userId) ===
          String(ownerId)
    );

  const followingUsers =
    onboardingData?.followingUsers ?? [];

  /*
   * 전체 크루 글이 아니라 현재 UID가 작성한 글만
   * 공유·응원·댓글 뱃지 계산에 사용합니다.
   */
  const posts = rootCrewPosts.filter(
    (post) =>
      String(post?.userId ?? '') ===
      String(ownerId)
  );

  const completedCount =
    actionLogs.length;

  const getLogMinutes = (log: any) =>
    Number(
      log?.duration_minutes ??
        log?.minutes ??
        0
    );

  const getCategoryMinutes = (
    category: string
  ) =>
    actionLogs
      .filter(
        (log: any) =>
          log?.category === category
      )
      .reduce(
        (sum: number, log: any) =>
          sum + getLogMinutes(log),
        0
      );

  const exerciseMinutes =
    getCategoryMinutes('exercise');
  const studyMinutes =
    getCategoryMinutes('study');
  const mentalMinutes =
    getCategoryMinutes('mental');
  const dailyMinutes =
    getCategoryMinutes('daily');

  const shareCount = posts.length;

  const cheerCount = posts.reduce(
    (sum, post) =>
      sum + Number(post.cheers ?? 0),
    0
  );

  const commentCount = posts.reduce(
    (sum, post) =>
      sum +
      (Array.isArray(post.comments)
        ? post.comments.length
        : 0),
    0
  );

  const followingCount =
    followingUsers.length;

  const earnedIds: string[] = [];

  ROOT_BADGES.forEach((badge) => {
    switch (badge.id) {
      case 'first_action':
        if (completedCount >= 1)
          earnedIds.push(badge.id);
        break;

      case 'action_10':
        if (completedCount >= 10)
          earnedIds.push(badge.id);
        break;

      case 'action_50':
        if (completedCount >= 50)
          earnedIds.push(badge.id);
        break;

      case 'action_100':
        if (completedCount >= 100)
          earnedIds.push(badge.id);
        break;

      case 'exercise_10h':
        if (exerciseMinutes >= 600)
          earnedIds.push(badge.id);
        break;

      case 'exercise_50h':
        if (exerciseMinutes >= 3000)
          earnedIds.push(badge.id);
        break;

      case 'exercise_100h':
        if (exerciseMinutes >= 6000)
          earnedIds.push(badge.id);
        break;

      case 'exercise_500h':
        if (exerciseMinutes >= 30000)
          earnedIds.push(badge.id);
        break;

      case 'study_10h':
        if (studyMinutes >= 600)
          earnedIds.push(badge.id);
        break;

      case 'study_50h':
        if (studyMinutes >= 3000)
          earnedIds.push(badge.id);
        break;

      case 'study_100h':
        if (studyMinutes >= 6000)
          earnedIds.push(badge.id);
        break;

      case 'study_500h':
        if (studyMinutes >= 30000)
          earnedIds.push(badge.id);
        break;

      case 'mental_10h':
        if (mentalMinutes >= 600)
          earnedIds.push(badge.id);
        break;

      case 'mental_50h':
        if (mentalMinutes >= 3000)
          earnedIds.push(badge.id);
        break;

      case 'mental_100h':
        if (mentalMinutes >= 6000)
          earnedIds.push(badge.id);
        break;

      case 'daily_10h':
        if (dailyMinutes >= 600)
          earnedIds.push(badge.id);
        break;

      case 'daily_50h':
        if (dailyMinutes >= 3000)
          earnedIds.push(badge.id);
        break;

      case 'daily_100h':
        if (dailyMinutes >= 6000)
          earnedIds.push(badge.id);
        break;

      case 'share_1':
        if (shareCount >= 1)
          earnedIds.push(badge.id);
        break;

      case 'share_10':
        if (shareCount >= 10)
          earnedIds.push(badge.id);
        break;

      case 'share_50':
        if (shareCount >= 50)
          earnedIds.push(badge.id);
        break;

      case 'cheer_10':
        if (cheerCount >= 10)
          earnedIds.push(badge.id);
        break;

      case 'cheer_100':
        if (cheerCount >= 100)
          earnedIds.push(badge.id);
        break;

      case 'comment_10':
        if (commentCount >= 10)
          earnedIds.push(badge.id);
        break;

      case 'comment_100':
        if (commentCount >= 100)
          earnedIds.push(badge.id);
        break;

      case 'follow_1':
        if (followingCount >= 1)
          earnedIds.push(badge.id);
        break;

      case 'follow_10':
        if (followingCount >= 10)
          earnedIds.push(badge.id);
        break;
    }
  });

  const persistedIds =
    persistedEarnedBadgeOwnerId ===
    String(ownerId)
      ? persistedEarnedBadgeIds
      : [];

  const allEarnedIds = new Set([
    ...persistedIds,
    ...earnedIds,
  ]);

  return ROOT_BADGES.filter(
    (badge) =>
      allEarnedIds.has(badge.id)
  );
};

async function saveEarnedBadgeIdsForOwner(
  ownerId: string,
  badgeIds: string[]
) {
  const uniqueBadgeIds = [
    ...new Set(
      badgeIds
        .filter(
          (badgeId) =>
            typeof badgeId ===
            'string'
        )
        .map(String)
    ),
  ];

  if (
    !isCurrentBadgeOwner(
      ownerId
    )
  ) {
    console.log(
      'SAVE EARNED BADGES SKIPPED: UID 불일치',
      {
        ownerId,

        rootOwnerId:
          getOnboardingOwnerId(),
      }
    );

    return uniqueBadgeIds;
  }

  persistedEarnedBadgeOwnerId =
    String(ownerId);

  persistedEarnedBadgeIds =
    uniqueBadgeIds;

  onboardingData = {
    ...(onboardingData ??
      {}),

    badgeEarnedIds:
      uniqueBadgeIds,
  };

  await Promise.all([
    AsyncStorage.setItem(
      getEarnedBadgeStorageKey(
        ownerId
      ),

      JSON.stringify(
        uniqueBadgeIds
      )
    ),

    AsyncStorage.setItem(
      ROOT_ONBOARDING_KEY,

      JSON.stringify(
        onboardingData
      )
    ),
  ]);

  const currentUser =
    firebaseAuth.currentUser;

  if (
    currentUser?.uid &&
    String(
      currentUser.uid
    ) ===
      String(ownerId)
  ) {
    try {
      await mergeUserDocument(
  currentUser.uid,
  {
    badgeEarnedIds:
      uniqueBadgeIds,

    updatedAt:
      new Date()
        .toISOString(),
  }
);
    } catch (error) {
      console.log(
        'SAVE EARNED BADGES SERVER ERROR',
        error
      );
    }
  }

  return uniqueBadgeIds;
}

export const loadRootEarnedBadges =
  async () => {
    const ownerId =
      getCurrentBadgeOwnerId();

    if (
      !ownerId ||
      !isCurrentBadgeOwner(ownerId)
    ) {
      persistedEarnedBadgeOwnerId =
        null;
      persistedEarnedBadgeIds = [];
      return [];
    }

    const foundIds =
      new Set<string>();

    const localRaw =
      await AsyncStorage.getItem(
        getEarnedBadgeStorageKey(
          ownerId
        )
      );

    safeJsonParse<string[]>(
      localRaw,
      []
    ).forEach((id) => {
      if (typeof id === 'string') {
        foundIds.add(id);
      }
    });

    if (
      Array.isArray(
        onboardingData?.badgeEarnedIds
      )
    ) {
      onboardingData.badgeEarnedIds.forEach(
        (id: unknown) => {
          if (typeof id === 'string') {
            foundIds.add(id);
          }
        }
      );
    }

    const currentUser =
      firebaseAuth.currentUser;

    if (
  currentUser?.uid &&
  String(currentUser.uid) ===
    String(ownerId)
) {
  try {
    const snapshot =
      await resolveWithTimeout<any | null>(
        getDoc(
  getUserDocumentRef(
    currentUser.uid
  )
),

        null,

        2500,

        'BADGE SERVER LOAD TIMEOUT: LOCAL DATA USED'
      );

    if (!snapshot) {
      console.log(
        'BADGE SERVER SNAPSHOT EMPTY: LOCAL DATA USED'
      );
    } else {
      const serverData =
        snapshot.data() as any;

      const serverIds =
        Array.isArray(
          serverData?.badgeEarnedIds
        )
          ? serverData.badgeEarnedIds
          : Array.isArray(
              serverData?.rootData
                ?.badgeEarnedIds
            )
          ? serverData.rootData
              .badgeEarnedIds
          : [];

      serverIds.forEach(
        (id: unknown) => {
          if (
            typeof id ===
            'string'
          ) {
            foundIds.add(id);
          }
        }
      );
    }
  } catch (error) {
    console.log(
      'LOAD EARNED BADGES SERVER ERROR',
      error
    );
  }
}
 

    persistedEarnedBadgeOwnerId =
      String(ownerId);
    persistedEarnedBadgeIds = [
      ...foundIds,
    ];

    /*
     * 현재 기록과 게시글에서 다시 계산되는 뱃지도
     * 기존 획득 이력과 합칩니다. 획득한 뱃지는
     * 기록 삭제나 계정 전환 때문에 사라지지 않습니다.
     */
    const calculatedIds =
      getEarnedBadges(ownerId).map(
        (badge) => badge.id
      );

    const mergedIds = [
      ...new Set([
        ...foundIds,
        ...calculatedIds,
      ]),
    ];

    await saveEarnedBadgeIdsForOwner(
      ownerId,
      mergedIds
    );

    return ROOT_BADGES.filter(
      (badge) =>
        mergedIds.includes(badge.id)
    );
  };

/*
 * 이전 버전의 공용 뱃지 이력을 현재 로그인 계정에
 * 한 번만 복구합니다. 수정 후 원래 계정으로 먼저
 * 앱을 실행해야 합니다.
 */
export const recoverLegacyBadgesForCurrentUser =
  async () => {
    const ownerId =
      getCurrentBadgeOwnerId();

    if (
      !ownerId ||
      !isCurrentBadgeOwner(ownerId)
    ) {
      return [];
    }

    const recoveryOwner =
      await AsyncStorage.getItem(
        ROOT_BADGE_RECOVERY_OWNER_KEY
      );

    if (
      recoveryOwner &&
      String(recoveryOwner) !==
        String(ownerId)
    ) {
      return loadRootEarnedBadges();
    }

    const legacyRaw =
      await AsyncStorage.getItem(
        ROOT_LEGACY_SEEN_BADGE_IDS_KEY
      );

    const legacyIds =
      safeJsonParse<string[]>(
        legacyRaw,
        []
      ).filter(
        (id) => typeof id === 'string'
      );

    const existingBadges =
      await loadRootEarnedBadges();

    const mergedIds = [
      ...new Set([
        ...existingBadges.map(
          (badge) => badge.id
        ),
        ...legacyIds,
      ]),
    ];

    await saveEarnedBadgeIdsForOwner(
      ownerId,
      mergedIds
    );

    await saveSeenBadgeIdsForOwner(
      ownerId,
      mergedIds
    );

    const previousMigrationOwner =
      await AsyncStorage.getItem(
        ROOT_BADGE_MIGRATION_OWNER_KEY
      );

    if (
      previousMigrationOwner &&
      String(previousMigrationOwner) !==
        String(ownerId)
    ) {
      /*
       * 테스트 계정에 잘못 복사된 로컬 확인 이력은
       * 제거합니다. 서버 값은 해당 계정 로그인 시
       * 획득 이력과 교집합으로 자동 정리됩니다.
       */
      await AsyncStorage.removeItem(
        getSeenBadgeStorageKey(
          previousMigrationOwner
        )
      );
    }

    await Promise.all([
      AsyncStorage.setItem(
        ROOT_BADGE_RECOVERY_OWNER_KEY,
        String(ownerId)
      ),
      AsyncStorage.setItem(
        ROOT_BADGE_MIGRATION_OWNER_KEY,
        String(ownerId)
      ),
    ]);

    console.log(
      'LEGACY BADGES RECOVERED FOR OWNER',
      {
        ownerId,
        badgeCount:
          mergedIds.length,
      }
    );

    return ROOT_BADGES.filter(
      (badge) =>
        mergedIds.includes(badge.id)
    );
  };

async function saveSeenBadgeIdsForOwner(
  ownerId: string,
  badgeIds: string[]
) {
  const uniqueBadgeIds = [
    ...new Set(
      badgeIds
        .filter(
          (badgeId) =>
            typeof badgeId === 'string'
        )
        .map(String)
    ),
  ];

  if (!isCurrentBadgeOwner(ownerId)) {
    console.log(
      'SAVE BADGE IDS SKIPPED: UID 불일치',
      {
        ownerId,
        rootOwnerId:
          getOnboardingOwnerId(),
      }
    );
    return uniqueBadgeIds;
  }

  const currentUser =
    firebaseAuth.currentUser;

  onboardingData = {
    ...(onboardingData ?? {}),
    ...(currentUser?.uid
      ? { uid: currentUser.uid }
      : {}),
    badgeSeenIds: uniqueBadgeIds,
  };

  await Promise.all([
    AsyncStorage.setItem(
      getSeenBadgeStorageKey(ownerId),
      JSON.stringify(uniqueBadgeIds)
    ),
    AsyncStorage.setItem(
      ROOT_ONBOARDING_KEY,
      JSON.stringify(onboardingData)
    ),
  ]);

  if (
    currentUser?.uid &&
    String(currentUser.uid) ===
      String(ownerId)
  ) {
    try {
      await mergeUserDocument(
  currentUser.uid,
  {
    badgeSeenIds:
      uniqueBadgeIds,

    updatedAt:
      new Date()
        .toISOString(),
  }
);
    } catch (error) {
      console.log(
        'SAVE BADGE SEEN IDS SERVER ERROR',
        error
      );
    }
  }

  return uniqueBadgeIds;
}

export const getSeenBadgeIds =
  async (): Promise<string[]> => {
    const ownerId =
      getCurrentBadgeOwnerId();

    if (
      !ownerId ||
      !isCurrentBadgeOwner(ownerId)
    ) {
      return [];
    }

    const earnedBadges =
      await loadRootEarnedBadges();

    const earnedIdSet = new Set(
      earnedBadges.map(
        (badge) => badge.id
      )
    );

    const foundIds =
      new Set<string>();

    const localRaw =
      await AsyncStorage.getItem(
        getSeenBadgeStorageKey(ownerId)
      );

    safeJsonParse<string[]>(
      localRaw,
      []
    ).forEach((id) => {
      if (typeof id === 'string') {
        foundIds.add(id);
      }
    });

    if (
      Array.isArray(
        onboardingData?.badgeSeenIds
      )
    ) {
      onboardingData.badgeSeenIds.forEach(
        (id: unknown) => {
          if (typeof id === 'string') {
            foundIds.add(id);
          }
        }
      );
    }

    const currentUser =
      firebaseAuth.currentUser;

    if (
      currentUser?.uid &&
      String(currentUser.uid) === ownerId
    ) {
      try {
        const snapshot =
  await getDoc(
    getUserDocumentRef(
      currentUser.uid
    )
  );

        const serverData =
          snapshot.data() as any;

        const serverIds =
          Array.isArray(
            serverData?.badgeSeenIds
          )
            ? serverData.badgeSeenIds
            : Array.isArray(
                serverData?.rootData
                  ?.badgeSeenIds
              )
            ? serverData.rootData
                .badgeSeenIds
            : [];

        serverIds.forEach(
          (id: unknown) => {
            if (typeof id === 'string') {
              foundIds.add(id);
            }
          }
        );
      } catch (error) {
        console.log(
          'LOAD BADGE SEEN IDS SERVER ERROR',
          error
        );
      }
    }

    /*
     * 잘못 다른 계정에서 이전된 확인 이력은
     * 실제 획득 뱃지와의 교집합만 남깁니다.
     */
    const sanitizedIds = [
      ...foundIds,
    ].filter((id) =>
      earnedIdSet.has(id)
    );

    return saveSeenBadgeIdsForOwner(
      ownerId,
      sanitizedIds
    );
  };

export const saveSeenBadgeIds =
  async (badgeIds: string[]) => {
    const ownerId =
      getCurrentBadgeOwnerId();

    if (
      !ownerId ||
      !isCurrentBadgeOwner(ownerId)
    ) {
      return [];
    }

    return saveSeenBadgeIdsForOwner(
      ownerId,
      badgeIds
    );
  };

export const checkNewEarnedBadges =
  async () => {
    const ownerId =
      getCurrentBadgeOwnerId();

    if (
      !ownerId ||
      !isCurrentBadgeOwner(ownerId)
    ) {
      return [];
    }

    const earnedBadges =
      await loadRootEarnedBadges();

    const seenBadgeIds =
      await getSeenBadgeIds();

    const newBadges =
      earnedBadges.filter(
        (badge) =>
          !seenBadgeIds.includes(
            badge.id
          )
      );

    if (newBadges.length > 0) {
      await saveSeenBadgeIdsForOwner(
        ownerId,
        [
          ...seenBadgeIds,
          ...newBadges.map(
            (badge) => badge.id
          ),
        ]
      );
    }

    console.log(
      'BADGE CHECK RESULT',
      {
        ownerId,
        earnedIds:
          earnedBadges.map(
            (badge) => badge.id
          ),
        seenBadgeIds,
        newBadgeIds:
          newBadges.map(
            (badge) => badge.id
          ),
      }
    );

    return newBadges;
  };

export default {};
