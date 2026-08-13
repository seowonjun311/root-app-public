import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
    getDownloadURL,
    getStorage,
    putFile,
    ref as storageRef,
} from '@react-native-firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';

import {
    loadRootOnboardingData,
    saveRootOnboardingData,
    setRootOnboardingData,
} from './rootMemory';

import {
  getRootCloudUidOrNull,
} from './rootCloudSession';

// ROOT_EXPLORE_V12D91A_MEDIA_BACKUP_EFFECTIVE_FIREBASE_USER_BOUNDARY
function getRootEffectiveMediaBackupFirebaseUser() {
  const cloudUid =
    getRootCloudUidOrNull();

  if (!cloudUid) {
    return null;
  }

  const firebaseUser =
    auth().currentUser;

  if (
    !firebaseUser?.uid ||
    firebaseUser.uid !==
      cloudUid
  ) {
    return null;
  }

  return firebaseUser;
}

const DAILY_MEALS_KEY =
  'daily_meals_v1';

const MEDIA_BACKUP_CHECKPOINT_KEY =
  'root_media_backup_checkpoint_v2';

const MEDIA_BACKUP_RESULT_KEY =
  'root_media_backup_result_v2';

const UPLOAD_TIMEOUT_MS =
  90_000;

const DOWNLOAD_URL_TIMEOUT_MS =
  30_000;

const FIRESTORE_SAVE_TIMEOUT_MS =
  60_000;

const FIRESTORE_REST_TIMEOUT_MS =
  45_000;

const FIRESTORE_VERIFY_RETRY_DELAY_MS =
  900;

const RECORD_PHOTO_FIELDS = [
  'originalPhotoUri',
  'original_photo_url',
  'originalPhotoUrl',
  'photoUri',
  'photo_url',
  'decoratedPhotoUri',
  'decorated_photo_url',
  'sharedPhotoUrl',
  'shared_photo_url',
] as const;

const RECORD_ROUTE_FIELDS = [
  'routeImageUri',
  'route_image_uri',
  'sharedRouteImageUrl',
  'shared_route_image_url',
] as const;

type BackupKind =
  | 'record-photo'
  | 'route-image'
  | 'meal-photo';

export type MediaBackupStage =
  | 'preparing'
  | 'uploading'
  | 'saving-local'
  | 'saving-server'
  | 'completed'
  | 'cancelled';

export type MediaBackupProgress = {
  stage: MediaBackupStage;
  processedCount: number;
  totalCount: number;
  percent: number;
  currentKind: BackupKind | null;
  currentLabel: string;
  uploadedFileCount: number;
  resumedFileCount: number;
  missingFileCount: number;
  failedCount: number;
};

export type MediaBackupResult = {
  status:
    | 'complete'
    | 'incomplete'
    | 'cancelled';
  cancelled: boolean;
  uploadedFileCount: number;
  resumedFileCount: number;
  recordPhotoCount: number;
  routeImageCount: number;
  mealPhotoCount: number;
  updatedRecordCount: number;
  updatedMealCount: number;
  skippedCloudUrlCount: number;
  missingFileCount: number;
  failedCount: number;
  remainingLocalUriCount: number;
  recoverableMediaCount: number;
  unrecoverableRecordCount: number;
  unrecoverableMealCount: number;
  processedCount: number;
  totalCount: number;
  serverSaved: boolean;
  canClearAppData: boolean;
  completedAt: string;
};

type MediaBackupCheckpoint = {
  version: 2;
  uid: string;
  uploadedUrlBySource: Record<
    string,
    string
  >;
  missingSourceUris: string[];
  updatedAt: string;
};

type InternalBackupController = {
  isCancelled: () => boolean;
  cancel: () => void;
  setCurrentTask: (
    task: any | null
  ) => void;
};

export type MediaBackupController = {
  isCancelled: () => boolean;
  cancel: () => void;
};

export type MediaBackupOptions = {
  controller?: MediaBackupController;
  onProgress?: (
    progress: MediaBackupProgress
  ) => void;
};

export const createMediaBackupController =
  (): MediaBackupController => {
    let cancelled = false;
    let currentTask: any | null =
      null;

    const controller:
      InternalBackupController = {
      isCancelled: () =>
        cancelled,

      cancel: () => {
        cancelled = true;

        try {
          currentTask?.cancel?.();
        } catch (
          error
        ) {
          console.log(
            'MEDIA BACKUP CANCEL TASK ERROR',
            error
          );
        }
      },

      setCurrentTask: (
        task
      ) => {
        currentTask = task;
      },
    };

    return controller;
  };

const getInternalController = (
  externalController?:
    MediaBackupController
): InternalBackupController => {
  if (
    externalController
  ) {
    return {
      isCancelled:
        externalController
          .isCancelled,

      cancel:
        externalController
          .cancel,

      setCurrentTask: (
        task
      ) => {
        (
          externalController as any
        ).setCurrentTask?.(
          task
        );
      },
    };
  }

  return createMediaBackupController() as InternalBackupController;
};

const isCloudUri = (
  value: unknown
) => {
  const uri =
    String(
      value ?? ''
    ).trim();

  return (
    uri.startsWith(
      'https://'
    ) ||
    uri.startsWith(
      'http://'
    ) ||
    uri.startsWith(
      'gs://'
    )
  );
};

const isFilledUri = (
  value: unknown
) =>
  Boolean(
    String(
      value ?? ''
    ).trim()
  );

const isLocalUri = (
  value: unknown
) =>
  isFilledUri(
    value
  ) &&
  !isCloudUri(
    value
  );

const sanitizeStorageName = (
  value: unknown
) =>
  String(
    value ?? 'unknown'
  ).replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );

const hashText = (
  value: string
) => {
  let hash = 2166136261;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    Math.abs(hash) >>> 0
  ).toString(36);
};

const getImageExtension = (
  uri: string
) => {
  const cleanUri =
    String(uri)
      .split('?')[0]
      .toLowerCase();

  const matched =
    cleanUri.match(
      /\.([a-z0-9]{2,5})$/
    );

  const extension =
    matched?.[1] ??
    'jpg';

  if (
    [
      'jpeg',
      'jpg',
      'png',
      'webp',
      'heic',
      'heif',
    ].includes(
      extension
    )
  ) {
    return extension;
  }

  return 'jpg';
};

const getImageContentType = (
  uri: string
) => {
  const extension =
    getImageExtension(
      uri
    );

  if (
    extension === 'png'
  ) {
    return 'image/png';
  }

  if (
    extension === 'webp'
  ) {
    return 'image/webp';
  }

  if (
    extension === 'heic' ||
    extension === 'heif'
  ) {
    return 'image/heic';
  }

  return 'image/jpeg';
};

const toPutFilePath = (
  uri: string
) => {
  if (
    uri.startsWith(
      'file://'
    )
  ) {
    return decodeURI(
      uri.slice(7)
    );
  }

  return uri;
};

const ensureLocalFileExists =
  async (
    uri: string
  ) => {
    if (
      uri.startsWith(
        'content://'
      ) ||
      uri.startsWith(
        'ph://'
      )
    ) {
      return true;
    }

    const infoUri =
      uri.startsWith(
        '/'
      )
        ? `file://${uri}`
        : uri;

    if (
      !infoUri.startsWith(
        'file://'
      )
    ) {
      return true;
    }

    const fileInfo =
      await FileSystem
        .getInfoAsync(
          infoUri
        );

    return Boolean(
      fileInfo.exists
    );
  };

const safeJsonParse = <
  T,
>(
  raw: string | null,
  fallback: T
): T => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(
      raw
    ) as T;
  } catch (
    error
  ) {
    console.log(
      'MEDIA BACKUP JSON PARSE ERROR',
      error
    );

    return fallback;
  }
};

const getSnapshotExists = (
  snapshot: any
) => {
  return typeof snapshot
    ?.exists ===
    'function'
    ? snapshot.exists()
    : Boolean(
        snapshot
          ?.exists
      );
};

const withTimeout = <
  T,
>(
  promise:
    PromiseLike<T>,
  timeoutMs: number,
  timeoutCode: string,
  onTimeout?: () => void
): Promise<T> => {
  return new Promise<T>(
    (
      resolve,
      reject
    ) => {
      let settled = false;

      const timeoutId =
        setTimeout(
          () => {
            if (settled) {
              return;
            }

            settled = true;

            try {
              onTimeout?.();
            } catch (
              error
            ) {
              console.log(
                'MEDIA BACKUP TIMEOUT CALLBACK ERROR',
                error
              );
            }

            const timeoutError:
              any =
              new Error(
                timeoutCode
              );

            timeoutError.code =
              timeoutCode;

            reject(
              timeoutError
            );
          },
          timeoutMs
        );

      Promise.resolve(
        promise
      ).then(
        (
          value
        ) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(
            timeoutId
          );
          resolve(
            value
          );
        },
        (
          error
        ) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(
            timeoutId
          );
          reject(
            error
          );
        }
      );
    }
  );
};


const waitForMediaBackup =
  (
    milliseconds: number
  ) =>
    new Promise<void>(
      (
        resolve
      ) => {
        setTimeout(
          resolve,
          milliseconds
        );
      }
    );

const isPlainObject = (
  value: unknown
): value is Record<
  string,
  any
> => {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  return (
    prototype ===
      Object.prototype ||
    prototype ===
      null
  );
};

const getMediaBackupProjectId =
  () => {
    const projectId =
      String(
        (firestore() as any)
          ?.app
          ?.options
          ?.projectId ??
        (auth() as any)
          ?.app
          ?.options
          ?.projectId ??
        ''
      ).trim();

    if (!projectId) {
      throw new Error(
        'MEDIA_BACKUP_FIREBASE_PROJECT_ID_MISSING'
      );
    }

    return projectId;
  };

const getMediaBackupIdToken =
  async (
    expectedUid: string
  ) => {
    const currentUser =
      getRootEffectiveMediaBackupFirebaseUser();

    if (
      !currentUser?.uid ||
      String(
        currentUser.uid
      ) !==
        String(
          expectedUid
        )
    ) {
      throw new Error(
        'MEDIA_BACKUP_AUTH_UID_MISMATCH'
      );
    }

    return currentUser
      .getIdToken();
  };

const toFirestoreRestValue =
  (
    value: any
  ): any => {
    if (
      value === null ||
      value === undefined
    ) {
      return {
        nullValue: null,
      };
    }

    if (
      typeof value ===
      'string'
    ) {
      return {
        stringValue:
          value,
      };
    }

    if (
      typeof value ===
      'boolean'
    ) {
      return {
        booleanValue:
          value,
      };
    }

    if (
      typeof value ===
      'number'
    ) {
      const safeNumber =
        Number.isFinite(
          value
        )
          ? value
          : 0;

      return Number.isInteger(
        safeNumber
      )
        ? {
            integerValue:
              String(
                safeNumber
              ),
          }
        : {
            doubleValue:
              safeNumber,
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
            value.map(
              (
                item
              ) =>
                toFirestoreRestValue(
                  item
                )
            ),
        },
      };
    }

    if (
      isPlainObject(
        value
      )
    ) {
      const fields:
        Record<
          string,
          any
        > = {};

      Object.entries(
        value
      ).forEach(
        ([
          key,
          fieldValue,
        ]) => {
          if (
            fieldValue !==
            undefined
          ) {
            fields[
              key
            ] =
              toFirestoreRestValue(
                fieldValue
              );
          }
        }
      );

      return {
        mapValue: {
          fields,
        },
      };
    }

    return {
      stringValue:
        String(
          value
        ),
    };
  };

const fromFirestoreRestValue =
  (
    value: any
  ): any => {
    if (
      !value ||
      typeof value !==
        'object'
    ) {
      return null;
    }

    if (
      'nullValue' in
      value
    ) {
      return null;
    }

    if (
      'stringValue' in
      value
    ) {
      return value
        .stringValue;
    }

    if (
      'booleanValue' in
      value
    ) {
      return Boolean(
        value
          .booleanValue
      );
    }

    if (
      'integerValue' in
      value
    ) {
      return Number(
        value
          .integerValue
      );
    }

    if (
      'doubleValue' in
      value
    ) {
      return Number(
        value
          .doubleValue
      );
    }

    if (
      'timestampValue' in
      value
    ) {
      return String(
        value
          .timestampValue
      );
    }

    if (
      'arrayValue' in
      value
    ) {
      const values =
        Array.isArray(
          value
            ?.arrayValue
            ?.values
        )
          ? value
              .arrayValue
              .values
          : [];

      return values.map(
        fromFirestoreRestValue
      );
    }

    if (
      'mapValue' in
      value
    ) {
      const result:
        Record<
          string,
          any
        > = {};

      Object.entries(
        value
          ?.mapValue
          ?.fields ??
        {}
      ).forEach(
        ([
          key,
          fieldValue,
        ]) => {
          result[
            key
          ] =
            fromFirestoreRestValue(
              fieldValue
            );
        }
      );

      return result;
    }

    return null;
  };

const decodeFirestoreRestDocument =
  (
    documentData: any
  ) => {
    const result:
      Record<
        string,
        any
      > = {};

    Object.entries(
      documentData
        ?.fields ??
      {}
    ).forEach(
      ([
        key,
        value,
      ]) => {
        result[
          key
        ] =
          fromFirestoreRestValue(
            value
          );
      }
    );

    return result;
  };

const fetchMediaBackupWithTimeout =
  async (
    input: string,
    init?: RequestInit
  ) => {
    const abortController =
      typeof AbortController !==
      'undefined'
        ? new AbortController()
        : null;

    const timeoutId =
      setTimeout(
        () => {
          abortController
            ?.abort();
        },
        FIRESTORE_REST_TIMEOUT_MS
      );

    try {
      return await fetch(
        input,
        {
          ...(init ?? {}),
          ...(abortController
            ? {
                signal:
                  abortController
                    .signal,
              }
            : {}),
        }
      );
    } catch (
      error: any
    ) {
      if (
        error?.name ===
        'AbortError'
      ) {
        const timeoutError:
          any =
          new Error(
            'MEDIA_BACKUP_REST_TIMEOUT'
          );

        timeoutError.code =
          'MEDIA_BACKUP_REST_TIMEOUT';

        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(
        timeoutId
      );
    }
  };

const normalizeComparableValue =
  (
    value: any
  ): any => {
    if (
      value === undefined
    ) {
      return null;
    }

    if (
      value === null ||
      typeof value !==
        'object'
    ) {
      return value;
    }

    if (
      Array.isArray(
        value
      )
    ) {
      return value.map(
        normalizeComparableValue
      );
    }

    const next:
      Record<
        string,
        any
      > = {};

    Object.keys(
      value
    )
      .sort()
      .forEach(
        (
          key
        ) => {
          if (
            value[
              key
            ] !==
            undefined
          ) {
            next[
              key
            ] =
              normalizeComparableValue(
                value[
                  key
                ]
              );
          }
        }
      );

    return next;
  };

const stableStringify =
  (
    value: any
  ) =>
    JSON.stringify(
      normalizeComparableValue(
        value
      )
    );

type MediaBackupServerPayload = {
  uid: string;
  actionLogs: any[];
  meals: any;
  metadata: any;
  updatedAt: string;
};

const saveMediaBackupServerWithSdk =
  async (
    payload:
      MediaBackupServerPayload
  ) => {
    const userReference =
      firestore()
        .collection(
          'users'
        )
        .doc(
          payload.uid
        );

    await withTimeout(
      firestore()
        .runTransaction(
          async (
            transaction
          ) => {
            const snapshot =
              await transaction
                .get(
                  userReference
                );

            if (
              !getSnapshotExists(
                snapshot
              )
            ) {
              throw new Error(
                'MEDIA_BACKUP_USER_DOCUMENT_NOT_FOUND'
              );
            }

            transaction.update(
              userReference,
              {
                'rootData.actionLogs':
                  payload
                    .actionLogs,
                'rootData.mediaBackup':
                  payload
                    .metadata,
                'dailyData.meals':
                  JSON.stringify(
                    payload
                      .meals
                  ),
                mediaBackup:
                  payload
                    .metadata,
                mediaBackupUpdatedAt:
                  payload
                    .updatedAt,
                updatedAt:
                  payload
                    .updatedAt,
              }
            );
          }
        ),
      FIRESTORE_SAVE_TIMEOUT_MS,
      'MEDIA_BACKUP_SERVER_SAVE_TIMEOUT'
    );

    console.log(
      'MEDIA BACKUP SERVER SDK SAVE DONE',
      {
        uid:
          payload.uid,
        updatedAt:
          payload
            .updatedAt,
      }
    );
  };

const saveMediaBackupServerWithRest =
  async (
    payload:
      MediaBackupServerPayload
  ) => {
    const projectId =
      getMediaBackupProjectId();

    const idToken =
      await getMediaBackupIdToken(
        payload.uid
      );

    const fieldPaths = [
      'rootData.actionLogs',
      'rootData.mediaBackup',
      'dailyData.meals',
      'mediaBackup',
      'mediaBackupUpdatedAt',
      'updatedAt',
    ];

    const updateMask =
      fieldPaths
        .map(
          (
            fieldPath
          ) =>
            `updateMask.fieldPaths=${encodeURIComponent(
              fieldPath
            )}`
        )
        .join('&');

    const url =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/users/${encodeURIComponent(
        payload.uid
      )}?${updateMask}&currentDocument.exists=true`;

    const response =
      await fetchMediaBackupWithTimeout(
        url,
        {
          method: 'PATCH',
          headers: {
            Authorization:
              `Bearer ${idToken}`,
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify({
              fields: {
                rootData:
                  toFirestoreRestValue({
                    actionLogs:
                      payload
                        .actionLogs,
                    mediaBackup:
                      payload
                        .metadata,
                  }),
                dailyData:
                  toFirestoreRestValue({
                    meals:
                      JSON.stringify(
                        payload
                          .meals
                      ),
                  }),
                mediaBackup:
                  toFirestoreRestValue(
                    payload
                      .metadata
                  ),
                mediaBackupUpdatedAt:
                  toFirestoreRestValue(
                    payload
                      .updatedAt
                  ),
                updatedAt:
                  toFirestoreRestValue(
                    payload
                      .updatedAt
                  ),
              },
            }),
        }
      );

    if (!response.ok) {
      const bodyText =
        await response.text();

      const error: any =
        new Error(
          `MEDIA_BACKUP_REST_SAVE_FAILED_${response.status}`
        );

      error.code =
        'MEDIA_BACKUP_REST_SAVE_FAILED';
      error.details =
        bodyText;

      throw error;
    }

    console.log(
      'MEDIA BACKUP SERVER REST SAVE DONE',
      {
        uid:
          payload.uid,
        updatedAt:
          payload
            .updatedAt,
      }
    );
  };

const inspectMediaBackupServerWithRest =
  async (
    uid: string
  ) => {
    const projectId =
      getMediaBackupProjectId();

    const idToken =
      await getMediaBackupIdToken(
        uid
      );

    const url =
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/users/${encodeURIComponent(
        uid
      )}`;

    const response =
      await fetchMediaBackupWithTimeout(
        url,
        {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );

    if (
      response.status ===
      404
    ) {
      throw new Error(
        'MEDIA_BACKUP_USER_DOCUMENT_NOT_FOUND'
      );
    }

    if (!response.ok) {
      const bodyText =
        await response.text();

      const error: any =
        new Error(
          `MEDIA_BACKUP_REST_INSPECTION_FAILED_${response.status}`
        );

      error.code =
        'MEDIA_BACKUP_REST_INSPECTION_FAILED';
      error.details =
        bodyText;

      throw error;
    }

    const documentData =
      await response.json();

    const userData =
      decodeFirestoreRestDocument(
        documentData
      );

    console.log(
      'MEDIA BACKUP SERVER INSPECTION DONE',
      {
        uid,
        hasRootData:
          Boolean(
            userData
              ?.rootData
          ),
        hasDailyData:
          Boolean(
            userData
              ?.dailyData
          ),
        mediaBackupUpdatedAt:
          userData
            ?.mediaBackupUpdatedAt ??
          null,
      }
    );

    return userData;
  };

const verifyMediaBackupServerData =
  (
    serverUserData: any,
    payload:
      MediaBackupServerPayload
  ) => {
    const serverRootData =
      serverUserData
        ?.rootData ??
      {};

    const serverDailyData =
      serverUserData
        ?.dailyData ??
      {};

    const rawServerMeals =
      serverDailyData
        ?.meals;

    const serverMeals =
      typeof rawServerMeals ===
      'string'
        ? safeJsonParse(
            rawServerMeals,
            {}
          )
        : rawServerMeals ??
          {};

    const checks = {
      actionLogsMatch:
        stableStringify(
          serverRootData
            ?.actionLogs ??
          []
        ) ===
        stableStringify(
          payload
            .actionLogs
        ),
      mealsMatch:
        stableStringify(
          serverMeals
        ) ===
        stableStringify(
          payload
            .meals
        ),
      rootMetadataMatch:
        stableStringify(
          serverRootData
            ?.mediaBackup ??
          null
        ) ===
        stableStringify(
          payload
            .metadata
        ),
      topMetadataMatch:
        stableStringify(
          serverUserData
            ?.mediaBackup ??
          null
        ) ===
        stableStringify(
          payload
            .metadata
        ),
      updatedAtMatch:
        String(
          serverUserData
            ?.mediaBackupUpdatedAt ??
          ''
        ) ===
        String(
          payload
            .updatedAt
        ),
    };

    return {
      confirmed:
        Object.values(
          checks
        ).every(
          Boolean
        ),
      checks,
      serverActionLogCount:
        Array.isArray(
          serverRootData
            ?.actionLogs
        )
          ? serverRootData
              .actionLogs
              .length
          : 0,
      expectedActionLogCount:
        payload
          .actionLogs
          .length,
    };
  };

const saveAndConfirmMediaBackupServer =
  async (
    payload:
      MediaBackupServerPayload
  ) => {
    let saveMethod:
      | 'sdk'
      | 'rest' =
      'sdk';

    let restSaved =
      false;

    try {
      await saveMediaBackupServerWithSdk(
        payload
      );
    } catch (
      error: any
    ) {
      console.log(
        'MEDIA BACKUP SERVER SDK SAVE ERROR: REST FALLBACK',
        {
          code:
            error?.code ??
            null,
          message:
            error?.message ??
            String(
              error
            ),
          uid:
            payload.uid,
        }
      );

      await saveMediaBackupServerWithRest(
        payload
      );

      saveMethod =
        'rest';
      restSaved =
        true;
    }

    let lastVerification:
      any =
      null;

    for (
      let attempt = 1;
      attempt <= 2;
      attempt += 1
    ) {
      try {
        const serverUserData =
          await inspectMediaBackupServerWithRest(
            payload.uid
          );

        const verification =
          verifyMediaBackupServerData(
            serverUserData,
            payload
          );

        lastVerification =
          verification;

        if (
          verification
            .confirmed
        ) {
          console.log(
            'MEDIA BACKUP SERVER SAVE CONFIRMED',
            {
              uid:
                payload.uid,
              method:
                saveMethod,
              attempt,
              updatedAt:
                payload
                  .updatedAt,
              ...verification
                .checks,
              actionLogCount:
                verification
                  .expectedActionLogCount,
            }
          );

          return {
            method:
              saveMethod,
            attempt,
          };
        }

        console.log(
          'MEDIA BACKUP SERVER VERIFY MISMATCH',
          {
            uid:
              payload.uid,
            attempt,
            method:
              saveMethod,
            ...verification
              .checks,
            serverActionLogCount:
              verification
                .serverActionLogCount,
            expectedActionLogCount:
              verification
                .expectedActionLogCount,
          }
        );
      } catch (
        inspectionError: any
      ) {
        console.log(
          'MEDIA BACKUP SERVER INSPECTION ERROR',
          {
            uid:
              payload.uid,
            attempt,
            code:
              inspectionError
                ?.code ??
              null,
            message:
              inspectionError
                ?.message ??
              String(
                inspectionError
              ),
          }
        );
      }

      if (
        !restSaved
      ) {
        console.log(
          'MEDIA BACKUP SERVER VERIFY FAILED: REST REWRITE',
          {
            uid:
              payload.uid,
            attempt,
          }
        );

        await saveMediaBackupServerWithRest(
          payload
        );

        saveMethod =
          'rest';
        restSaved =
          true;
      }

      if (
        attempt < 2
      ) {
        await waitForMediaBackup(
          FIRESTORE_VERIFY_RETRY_DELAY_MS
        );
      }
    }

    const confirmationError:
      any =
      new Error(
        'MEDIA_BACKUP_SERVER_CONFIRM_FAILED'
      );

    confirmationError.code =
      'MEDIA_BACKUP_SERVER_CONFIRM_FAILED';
    confirmationError.details =
      lastVerification;

    throw confirmationError;
  };

const createEmptyCheckpoint = (
  uid: string
): MediaBackupCheckpoint => ({
  version: 2,
  uid,
  uploadedUrlBySource: {},
  missingSourceUris: [],
  updatedAt:
    new Date()
      .toISOString(),
});

const loadCheckpoint =
  async (
    uid: string
  ) => {
    const raw =
      await AsyncStorage
        .getItem(
          MEDIA_BACKUP_CHECKPOINT_KEY
        );

    const parsed =
      safeJsonParse<
        Partial<MediaBackupCheckpoint>
      >(
        raw,
        {}
      );

    if (
      String(
        parsed?.uid ?? ''
      ) !== uid
    ) {
      return createEmptyCheckpoint(
        uid
      );
    }

    return {
      version: 2 as const,
      uid,
      uploadedUrlBySource:
        parsed
          ?.uploadedUrlBySource &&
        typeof parsed
          .uploadedUrlBySource ===
          'object'
          ? {
              ...parsed
                .uploadedUrlBySource,
            }
          : {},
      missingSourceUris:
        Array.isArray(
          parsed
            ?.missingSourceUris
        )
          ? Array.from(
              new Set(
                parsed
                  .missingSourceUris
                  .map(
                    (
                      value
                    ) =>
                      String(
                        value ?? ''
                      ).trim()
                  )
                  .filter(
                    Boolean
                  )
              )
            )
          : [],
      updatedAt:
        String(
          parsed
            ?.updatedAt ??
          new Date()
            .toISOString()
        ),
    };
  };

const persistCheckpoint =
  async (
    checkpoint:
      MediaBackupCheckpoint
  ) => {
    checkpoint.updatedAt =
      new Date()
        .toISOString();

    await AsyncStorage
      .setItem(
        MEDIA_BACKUP_CHECKPOINT_KEY,
        JSON.stringify(
          checkpoint
        )
      );
  };

export const getLastMediaBackupResult =
  async (): Promise<
    MediaBackupResult | null
  > => {
    const raw =
      await AsyncStorage
        .getItem(
          MEDIA_BACKUP_RESULT_KEY
        );

    return safeJsonParse<
      MediaBackupResult | null
    >(
      raw,
      null
    );
  };

const collectUniqueLocalUris = (
  actionLogs: any[],
  meals: any
) => {
  const sourceUris =
    new Set<string>();

  actionLogs.forEach(
    (
      log: any
    ) => {
      [
        ...RECORD_PHOTO_FIELDS,
        ...RECORD_ROUTE_FIELDS,
      ].forEach(
        (
          field
        ) => {
          const value =
            String(
              log?.[field] ?? ''
            ).trim();

          if (
            isLocalUri(
              value
            )
          ) {
            sourceUris.add(
              value
            );
          }
        }
      );
    }
  );

  Object.values(
    meals ?? {}
  ).forEach(
    (
      mealDay: any
    ) => {
      Object.values(
        mealDay ?? {}
      ).forEach(
        (
          mealItems: any
        ) => {
          const safeMealItems =
            Array.isArray(
              mealItems
            )
              ? mealItems
              : [];

          safeMealItems.forEach(
            (
              item: any
            ) => {
              const value =
                String(
                  item
                    ?.imageUri ??
                  ''
                ).trim();

              if (
                isLocalUri(
                  value
                )
              ) {
                sourceUris.add(
                  value
                );
              }
            }
          );
        }
      );
    }
  );

  return sourceUris;
};

const countRemainingLocalUris = (
  actionLogs: any[],
  meals: any
) => {
  return collectUniqueLocalUris(
    actionLogs,
    meals
  ).size;
};

const hasCloudValue = (
  value: any,
  fields:
    readonly string[]
) => {
  return fields.some(
    (
      field
    ) =>
      isCloudUri(
        value?.[field]
      )
  );
};

const hasPendingLocalValue = (
  value: any,
  fields:
    readonly string[]
) => {
  return fields.some(
    (
      field
    ) =>
      isLocalUri(
        value?.[field]
      )
  );
};

const countRecoverableCloudUrls = (
  actionLogs: any[],
  meals: any
) => {
  const cloudUrls =
    new Set<string>();

  actionLogs.forEach(
    (
      log: any
    ) => {
      [
        ...RECORD_PHOTO_FIELDS,
        ...RECORD_ROUTE_FIELDS,
      ].forEach(
        (
          field
        ) => {
          const value =
            String(
              log?.[field] ?? ''
            ).trim();

          if (
            isCloudUri(
              value
            )
          ) {
            cloudUrls.add(
              value
            );
          }
        }
      );
    }
  );

  Object.values(
    meals ?? {}
  ).forEach(
    (
      mealDay: any
    ) => {
      Object.values(
        mealDay ?? {}
      ).forEach(
        (
          mealItems: any
        ) => {
          const safeMealItems =
            Array.isArray(
              mealItems
            )
              ? mealItems
              : [];

          safeMealItems.forEach(
            (
              item: any
            ) => {
              const value =
                String(
                  item
                    ?.imageUri ??
                  ''
                ).trim();

              if (
                isCloudUri(
                  value
                )
              ) {
                cloudUrls.add(
                  value
                );
              }
            }
          );
        }
      );
    }
  );

  return cloudUrls.size;
};

const persistWorkingLocalData =
  async (
    currentRootData: any,
    uid: string,
    actionLogs: any[],
    meals: any,
    metadata: any
  ) => {
    const nextRootData = {
      ...currentRootData,
      uid,
      actionLogs,
      mediaBackup:
        metadata,
    };

    await saveRootOnboardingData(
      nextRootData
    );

    setRootOnboardingData(
      nextRootData
    );

    await AsyncStorage
      .multiSet([
        [
          DAILY_MEALS_KEY,
          JSON.stringify(
            meals
          ),
        ],
        [
          MEDIA_BACKUP_RESULT_KEY,
          JSON.stringify(
            metadata
          ),
        ],
        [
          'daily_reload_signal',
          Date.now()
            .toString(),
        ],
      ]);

    return nextRootData;
  };

export const backupLocalMediaToCloud =
  async (
    options:
      MediaBackupOptions = {}
  ): Promise<
    MediaBackupResult
  > => {
    const currentUser =
      getRootEffectiveMediaBackupFirebaseUser();

    if (
      !currentUser?.uid
    ) {
      throw new Error(
        'MEDIA_BACKUP_LOGIN_REQUIRED'
      );
    }

    const uid =
      String(
        currentUser.uid
      );

    const controller =
      getInternalController(
        options.controller
      );

    const currentRootData =
      (
        await loadRootOnboardingData()
      ) ?? {};

    if (
      currentRootData
        ?.uid &&
      String(
        currentRootData.uid
      ) !== uid
    ) {
      throw new Error(
        'MEDIA_BACKUP_UID_MISMATCH'
      );
    }

    const actionLogs =
      Array.isArray(
        currentRootData
          ?.actionLogs
      )
        ? currentRootData
            .actionLogs
        : [];

    const mealsRaw =
      await AsyncStorage
        .getItem(
          DAILY_MEALS_KEY
        );

    const meals =
      safeJsonParse<
        Record<
          string,
          Record<
            string,
            any[]
          >
        >
      >(
        mealsRaw,
        {}
      );

    const checkpoint =
      await loadCheckpoint(
        uid
      );

    const uploadedUrlBySource =
      new Map<
        string,
        string
      >(
        Object.entries(
          checkpoint
            .uploadedUrlBySource
        )
      );

    const missingSourceUris =
      new Set<string>(
        checkpoint
          .missingSourceUris
      );

    const failedSourceUris =
      new Set<string>();

    const processedSourceUris =
      new Set<string>();

    const allLocalUris =
      collectUniqueLocalUris(
        actionLogs,
        meals
      );

    const result:
      MediaBackupResult = {
      status:
        'incomplete',
      cancelled: false,
      uploadedFileCount: 0,
      resumedFileCount: 0,
      recordPhotoCount: 0,
      routeImageCount: 0,
      mealPhotoCount: 0,
      updatedRecordCount: 0,
      updatedMealCount: 0,
      skippedCloudUrlCount: 0,
      missingFileCount: 0,
      failedCount: 0,
      remainingLocalUriCount:
        allLocalUris.size,
      recoverableMediaCount: 0,
      unrecoverableRecordCount: 0,
      unrecoverableMealCount: 0,
      processedCount: 0,
      totalCount:
        allLocalUris.size,
      serverSaved: false,
      canClearAppData: false,
      completedAt:
        new Date()
          .toISOString(),
    };

    let currentStage:
      MediaBackupStage =
      'preparing';

    let currentKind:
      BackupKind | null =
      null;

    let currentLabel =
      '백업할 사진을 확인하고 있어요';

    const emitProgress = () => {
      const percent =
        result.totalCount <= 0
          ? 100
          : Math.min(
              100,
              Math.round(
                (
                  result
                    .processedCount /
                  result
                    .totalCount
                ) *
                  100
              )
            );

      options.onProgress?.({
        stage:
          currentStage,
        processedCount:
          result
            .processedCount,
        totalCount:
          result
            .totalCount,
        percent,
        currentKind,
        currentLabel,
        uploadedFileCount:
          result
            .uploadedFileCount,
        resumedFileCount:
          result
            .resumedFileCount,
        missingFileCount:
          result
            .missingFileCount,
        failedCount:
          result
            .failedCount,
      });
    };

    const markProcessed = (
      sourceUri: string
    ) => {
      if (
        processedSourceUris.has(
          sourceUri
        )
      ) {
        return;
      }

      processedSourceUris.add(
        sourceUri
      );

      result.processedCount =
        processedSourceUris.size;

      emitProgress();
    };

    emitProgress();

    type ResolveResult =
      | {
          status:
            'cloud';
          url: string;
        }
      | {
          status:
            'missing';
          url: null;
        }
      | {
          status:
            'failed';
          url: null;
        }
      | {
          status:
            'empty';
          url: null;
        };

    const uploadLocalUri =
      async (
        sourceValue:
          unknown,
        kind:
          BackupKind
      ): Promise<
        ResolveResult
      > => {
        const sourceUri =
          String(
            sourceValue ?? ''
          ).trim();

        if (!sourceUri) {
          return {
            status:
              'empty',
            url: null,
          };
        }

        if (
          isCloudUri(
            sourceUri
          )
        ) {
          result
            .skippedCloudUrlCount +=
            1;

          return {
            status:
              'cloud',
            url:
              sourceUri,
          };
        }

        if (
          controller
            .isCancelled()
        ) {
          return {
            status:
              'failed',
            url: null,
          };
        }

        currentStage =
          'uploading';
        currentKind =
          kind;
        currentLabel =
          kind ===
          'route-image'
            ? 'GPS 지도를 백업하고 있어요'
            : kind ===
              'meal-photo'
            ? '식단 사진을 백업하고 있어요'
            : '기록 사진을 백업하고 있어요';

        emitProgress();

        const cachedUrl =
          uploadedUrlBySource
            .get(
              sourceUri
            );

        if (
          cachedUrl
        ) {
          if (
            !processedSourceUris.has(
              sourceUri
            )
          ) {
            result
              .resumedFileCount +=
              1;
          }

          markProcessed(
            sourceUri
          );

          console.log(
            'MEDIA BACKUP RESUME HIT',
            {
              kind,
              sourceUri,
              cachedUrl,
            }
          );

          return {
            status:
              'cloud',
            url:
              cachedUrl,
          };
        }

        if (
          missingSourceUris.has(
            sourceUri
          )
        ) {
          if (
            !processedSourceUris.has(
              sourceUri
            )
          ) {
            result
              .missingFileCount +=
              1;
          }

          markProcessed(
            sourceUri
          );

          return {
            status:
              'missing',
            url: null,
          };
        }

        if (
          failedSourceUris.has(
            sourceUri
          )
        ) {
          return {
            status:
              'failed',
            url: null,
          };
        }

        try {
          const exists =
            await ensureLocalFileExists(
              sourceUri
            );

          if (!exists) {
            missingSourceUris.add(
              sourceUri
            );

            checkpoint.missingSourceUris =
              Array.from(
                missingSourceUris
              );

            await persistCheckpoint(
              checkpoint
            );

            result
              .missingFileCount +=
              1;

            markProcessed(
              sourceUri
            );

            console.log(
              'MEDIA BACKUP FILE MISSING',
              {
                kind,
                sourceUri,
              }
            );

            return {
              status:
                'missing',
              url: null,
            };
          }

          const safeUid =
            sanitizeStorageName(
              uid
            );

          const extension =
            getImageExtension(
              sourceUri
            );

          const sourceHash =
            `${hashText(
              sourceUri
            )}_${
              sourceUri.length
            }`;

          const safeKind =
            kind.replace(
              /[^a-zA-Z0-9_-]/g,
              '_'
            );

          const storagePath =
            `shared-posts/` +
            `${safeUid}/` +
            `media_backup_` +
            `${safeKind}_` +
            `${sourceHash}.` +
            `${extension}`;

          const imageReference =
            storageRef(
              getStorage(),
              storagePath
            );

          /*
           * 이전 버전 백업이 업로드까지 마친 뒤
           * 앱이 종료되어 체크포인트를 남기지 못했더라도,
           * 같은 결정적 Storage 경로의 파일을 찾아
           * 다시 업로드하지 않고 이어받습니다.
           */
          try {
            const existingUrl =
              await withTimeout(
                getDownloadURL(
                  imageReference
                ),
                12_000,
                'MEDIA_BACKUP_EXISTING_URL_TIMEOUT'
              );

            if (
              existingUrl
            ) {
              uploadedUrlBySource.set(
                sourceUri,
                existingUrl
              );

              checkpoint.uploadedUrlBySource[
                sourceUri
              ] =
                existingUrl;

              await persistCheckpoint(
                checkpoint
              );

              result
                .resumedFileCount +=
                1;

              markProcessed(
                sourceUri
              );

              console.log(
                'MEDIA BACKUP STORAGE RESUME HIT',
                {
                  kind,
                  sourceUri,
                  storagePath,
                  existingUrl,
                }
              );

              return {
                status:
                  'cloud',
                url:
                  existingUrl,
              };
            }
          } catch (
            existingError: any
          ) {
            const existingCode =
              existingError?.code ??
              null;

            if (
              existingCode !==
                'storage/object-not-found' &&
              existingCode !==
                'MEDIA_BACKUP_EXISTING_URL_TIMEOUT'
            ) {
              console.log(
                'MEDIA BACKUP STORAGE RESUME CHECK SKIPPED',
                {
                  kind,
                  sourceUri,
                  storagePath,
                  code:
                    existingCode,
                  message:
                    existingError?.message ??
                    String(
                      existingError
                    ),
                }
              );
            }
          }

          if (
            controller
              .isCancelled()
          ) {
            return {
              status:
                'failed',
              url: null,
            };
          }

          console.log(
            'MEDIA BACKUP UPLOAD START',
            {
              kind,
              storagePath,
              sourceUri,
            }
          );

          const uploadTask:
            any =
            putFile(
              imageReference,
              toPutFilePath(
                sourceUri
              ),
              {
                contentType:
                  getImageContentType(
                    sourceUri
                  ),
              }
            );

          controller
            .setCurrentTask(
              uploadTask
            );

          await withTimeout(
            Promise.resolve(
              uploadTask
            ),
            UPLOAD_TIMEOUT_MS,
            'MEDIA_BACKUP_UPLOAD_TIMEOUT',
            () => {
              try {
                uploadTask
                  ?.cancel?.();
              } catch (
                error
              ) {
                console.log(
                  'MEDIA BACKUP TIMEOUT CANCEL ERROR',
                  error
                );
              }
            }
          );

          controller
            .setCurrentTask(
              null
            );

          if (
            controller
              .isCancelled()
          ) {
            return {
              status:
                'failed',
              url: null,
            };
          }

          const downloadUrl =
            await withTimeout(
              getDownloadURL(
                imageReference
              ),
              DOWNLOAD_URL_TIMEOUT_MS,
              'MEDIA_BACKUP_URL_TIMEOUT'
            );

          uploadedUrlBySource.set(
            sourceUri,
            downloadUrl
          );

          checkpoint.uploadedUrlBySource[
            sourceUri
          ] =
            downloadUrl;

          await persistCheckpoint(
            checkpoint
          );

          result
            .uploadedFileCount +=
            1;

          if (
            kind ===
            'record-photo'
          ) {
            result
              .recordPhotoCount +=
              1;
          } else if (
            kind ===
            'route-image'
          ) {
            result
              .routeImageCount +=
              1;
          } else {
            result
              .mealPhotoCount +=
              1;
          }

          markProcessed(
            sourceUri
          );

          console.log(
            'MEDIA BACKUP UPLOAD SUCCESS',
            {
              kind,
              storagePath,
              downloadUrl,
            }
          );

          return {
            status:
              'cloud',
            url:
              downloadUrl,
          };
        } catch (
          error: any
        ) {
          controller
            .setCurrentTask(
              null
            );

          if (
            controller
              .isCancelled() ||
            error?.code ===
              'storage/cancelled'
          ) {
            console.log(
              'MEDIA BACKUP UPLOAD CANCELLED',
              {
                kind,
                sourceUri,
              }
            );

            return {
              status:
                'failed',
              url: null,
            };
          }

          result.failedCount +=
            1;

          failedSourceUris.add(
            sourceUri
          );

          markProcessed(
            sourceUri
          );

          console.log(
            'MEDIA BACKUP UPLOAD ERROR',
            {
              kind,
              sourceUri,
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

          return {
            status:
              'failed',
            url: null,
          };
        }
      };

    const nextActionLogs:
      any[] = [];

    for (
      const log of actionLogs
    ) {
      if (
        controller
          .isCancelled()
      ) {
        break;
      }

      const originalLog = {
        ...(log ?? {}),
      };

      const nextLog = {
        ...originalLog,
      };

      const hadPhotoReference =
        RECORD_PHOTO_FIELDS.some(
          (
            field
          ) =>
            isFilledUri(
              originalLog?.[field]
            )
        );

      const hadRouteReference =
        RECORD_ROUTE_FIELDS.some(
          (
            field
          ) =>
            isFilledUri(
              originalLog?.[field]
            )
        );

      let changed = false;

      for (
        const field of
          RECORD_PHOTO_FIELDS
      ) {
        if (
          controller
            .isCancelled()
        ) {
          break;
        }

        const currentValue =
          nextLog?.[field];

        if (
          !isFilledUri(
            currentValue
          )
        ) {
          continue;
        }

        const resolved =
          await uploadLocalUri(
            currentValue,
            'record-photo'
          );

        if (
          resolved.status ===
            'cloud' &&
          resolved.url &&
          resolved.url !==
            currentValue
        ) {
          nextLog[field] =
            resolved.url;
          changed = true;
        } else if (
          resolved.status ===
          'missing'
        ) {
          nextLog[field] =
            null;
          changed = true;
        }
      }

      for (
        const field of
          RECORD_ROUTE_FIELDS
      ) {
        if (
          controller
            .isCancelled()
        ) {
          break;
        }

        const currentValue =
          nextLog?.[field];

        if (
          !isFilledUri(
            currentValue
          )
        ) {
          continue;
        }

        const resolved =
          await uploadLocalUri(
            currentValue,
            'route-image'
          );

        if (
          resolved.status ===
            'cloud' &&
          resolved.url &&
          resolved.url !==
            currentValue
        ) {
          nextLog[field] =
            resolved.url;
          changed = true;
        } else if (
          resolved.status ===
          'missing'
        ) {
          nextLog[field] =
            null;
          changed = true;
        }
      }

      if (
        changed
      ) {
        result
          .updatedRecordCount +=
          1;
      }

      const hasRecoverablePhoto =
        hasCloudValue(
          nextLog,
          RECORD_PHOTO_FIELDS
        ) ||
        hasPendingLocalValue(
          nextLog,
          RECORD_PHOTO_FIELDS
        );

      const hasRecoverableRoute =
        hasCloudValue(
          nextLog,
          RECORD_ROUTE_FIELDS
        ) ||
        hasPendingLocalValue(
          nextLog,
          RECORD_ROUTE_FIELDS
        ) ||
        Array.isArray(
          nextLog
            ?.route_coordinates
        );

      if (
        (
          hadPhotoReference ||
          hadRouteReference
        ) &&
        !hasRecoverablePhoto &&
        !hasRecoverableRoute
      ) {
        result
          .unrecoverableRecordCount +=
          1;
      }

      nextActionLogs.push(
        nextLog
      );
    }

    if (
      nextActionLogs.length <
      actionLogs.length
    ) {
      nextActionLogs.push(
        ...actionLogs.slice(
          nextActionLogs.length
        )
      );
    }

    const nextMeals:
      Record<
        string,
        Record<
          string,
          any[]
        >
      > = {};

    for (
      const [
        dateKey,
        mealDay,
      ] of Object.entries(
        meals
      )
    ) {
      const nextMealDay:
        Record<
          string,
          any[]
        > = {};

      for (
        const [
          mealType,
          mealItems,
        ] of Object.entries(
          mealDay ?? {}
        )
      ) {
        const safeMealItems =
          Array.isArray(
            mealItems
          )
            ? mealItems
            : [];

        const nextMealItems:
          any[] = [];

        for (
          const item of
            safeMealItems
        ) {
          const nextItem = {
            ...(item ?? {}),
          };

          if (
            controller
              .isCancelled()
          ) {
            nextMealItems.push(
              nextItem
            );
            continue;
          }

          const hadImage =
            isFilledUri(
              nextItem
                ?.imageUri
            );

          const currentValue =
            nextItem
              ?.imageUri;

          if (
            isFilledUri(
              currentValue
            )
          ) {
            const resolved =
              await uploadLocalUri(
                currentValue,
                'meal-photo'
              );

            if (
              resolved.status ===
                'cloud' &&
              resolved.url &&
              resolved.url !==
                currentValue
            ) {
              nextItem.imageUri =
                resolved.url;

              result
                .updatedMealCount +=
                1;
            } else if (
              resolved.status ===
              'missing'
            ) {
              nextItem.imageUri =
                undefined;

              result
                .updatedMealCount +=
                1;
            }
          }

          if (
            hadImage &&
            !isFilledUri(
              nextItem
                ?.imageUri
            )
          ) {
            result
              .unrecoverableMealCount +=
              1;
          }

          nextMealItems.push(
            nextItem
          );
        }

        nextMealDay[
          mealType
        ] =
          nextMealItems;
      }

      nextMeals[
        dateKey
      ] =
        nextMealDay;
    }

    currentStage =
      controller
        .isCancelled()
        ? 'cancelled'
        : 'saving-local';

    currentKind = null;
    currentLabel =
      controller
        .isCancelled()
        ? '백업을 중단하고 진행 상황을 저장하고 있어요'
        : '백업 결과를 기기에 저장하고 있어요';

    emitProgress();

    result.cancelled =
      controller
        .isCancelled();

    result
      .remainingLocalUriCount =
      countRemainingLocalUris(
        nextActionLogs,
        nextMeals
      );

    result
      .recoverableMediaCount =
      countRecoverableCloudUrls(
        nextActionLogs,
        nextMeals
      );

    result.completedAt =
      new Date()
        .toISOString();

    result.status =
      result.cancelled
        ? 'cancelled'
        : result.failedCount ===
            0 &&
          result
            .remainingLocalUriCount ===
            0
        ? 'complete'
        : 'incomplete';

    const localMetadata = {
      ...result,
      uid,
    };

    await persistWorkingLocalData(
      currentRootData,
      uid,
      nextActionLogs,
      nextMeals,
      localMetadata
    );

    if (
      result.cancelled
    ) {
      currentStage =
        'cancelled';
      currentLabel =
        '백업이 중단되었습니다. 다음 실행에서 이어서 진행할 수 있어요';
      emitProgress();

      console.log(
        'MEDIA BACKUP CANCELLED',
        localMetadata
      );

      return result;
    }

    currentStage =
      'saving-server';
    currentLabel =
      '백업 주소를 서버에 저장하고 있어요';
    emitProgress();

    const serverSaveCompletedAt =
      new Date()
        .toISOString();

    const serverCandidateCanClear =
      !result.cancelled &&
      result.failedCount ===
        0 &&
      result
        .remainingLocalUriCount ===
        0;

    const serverMetadataCandidate = {
      ...result,
      status:
        serverCandidateCanClear
          ? 'complete'
          : 'incomplete',
      serverSaved:
        true,
      canClearAppData:
        serverCandidateCanClear,
      completedAt:
        serverSaveCompletedAt,
      uid,
    };

    try {
      const serverSaveResult =
        await saveAndConfirmMediaBackupServer({
          uid,
          actionLogs:
            nextActionLogs,
          meals:
            nextMeals,
          metadata:
            serverMetadataCandidate,
          updatedAt:
            serverSaveCompletedAt,
        });

      result.serverSaved =
        true;
      result.canClearAppData =
        serverCandidateCanClear;
      result.status =
        serverCandidateCanClear
          ? 'complete'
          : 'incomplete';
      result.completedAt =
        serverSaveCompletedAt;

      console.log(
        'MEDIA BACKUP SERVER SAVE VERIFIED DONE',
        {
          uid,
          method:
            serverSaveResult
              .method,
          attempt:
            serverSaveResult
              .attempt,
          canClearAppData:
            result
              .canClearAppData,
          remainingLocalUriCount:
            result
              .remainingLocalUriCount,
          failedCount:
            result
              .failedCount,
        }
      );
    } catch (
      error: any
    ) {
      result.failedCount +=
        1;
      result.serverSaved =
        false;
      result.canClearAppData =
        false;
      result.status =
        'incomplete';
      result.completedAt =
        new Date()
          .toISOString();

      console.log(
        'MEDIA BACKUP SERVER SAVE ERROR',
        {
          code:
            error?.code ??
            null,
          message:
            error?.message ??
            String(
              error
            ),
          details:
            error?.details ??
            null,
        }
      );
    }

    result.canClearAppData =
      !result.cancelled &&
      result.failedCount ===
        0 &&
      result
        .remainingLocalUriCount ===
        0 &&
      result.serverSaved;

    result.status =
      result.canClearAppData
        ? 'complete'
        : 'incomplete';

    if (
      !result.serverSaved
    ) {
      result.completedAt =
        new Date()
          .toISOString();
    }

    const finalMetadata = {
      ...result,
      uid,
    };

    await persistWorkingLocalData(
      currentRootData,
      uid,
      nextActionLogs,
      nextMeals,
      finalMetadata
    );

    checkpoint.uploadedUrlBySource =
      Object.fromEntries(
        uploadedUrlBySource
      );
    checkpoint.missingSourceUris =
      Array.from(
        missingSourceUris
      );

    await persistCheckpoint(
      checkpoint
    );

    currentStage =
      'completed';
    currentLabel =
      result.canClearAppData
        ? '백업이 완료되었습니다'
        : '백업은 끝났지만 확인이 필요한 항목이 있어요';
    emitProgress();

    console.log(
      'MEDIA BACKUP DONE',
      finalMetadata
    );

    return result;
  };
