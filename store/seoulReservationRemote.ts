import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getApp,
} from '@react-native-firebase/app';
import {
  getAuth,
  getIdToken,
} from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  getFirestore,
} from '@react-native-firebase/firestore';
import {
  useEffect,
  useState,
} from 'react';
import {
  InteractionManager,
} from 'react-native';

import {
  SEOUL_CAMPING_FACILITIES,
} from './seoulCampingFacilities';
import {
  SEOUL_EDUCATION_PLACES,
} from './seoulEducationPrograms';
import {
  SEOUL_SPACE_FACILITIES,
} from './seoulSpaceFacilities';
import {
  SEOUL_SPORTS_FACILITIES,
} from './seoulSportsFacilities';

const CATEGORY_KEYS = [
  'camping',
  'sports',
  'spaces',
  'education',
] as const;

type ReservationCategory =
  typeof CATEGORY_KEYS[number];

type ReservationDataset =
  Record<
    ReservationCategory,
    any[]
  >;

export type SeoulReservationDataSource =
  | 'static'
  | 'cache'
  | 'remote'
  | 'rest';

export type SeoulReservationRemoteState = {
  revision: number;
  loading: boolean;
  source:
    SeoulReservationDataSource;
  dataVersion: string | null;
  error: string | null;
  counts: Record<
    ReservationCategory,
    number
  >;
};

const FIREBASE_PROJECT_ID =
  'root-c7949';

const FIRESTORE_REST_BASE =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const COLLECTION_NAMES: Record<
  ReservationCategory,
  string
> = {
  camping:
    'publicReservationCamping',
  sports:
    'publicReservationSports',
  spaces:
    'publicReservationSpaces',
  education:
    'publicReservationEducation',
};

const VERSION_STORAGE_KEY =
  'root_seoul_reservation_remote_version_v1';

const CACHE_TIMEOUT_MS =
  3_000;

const SDK_META_TIMEOUT_MS =
  5_000;

const SDK_DATA_TIMEOUT_MS =
  20_000;

const REST_META_TIMEOUT_MS =
  20_000;

const REST_DATA_TIMEOUT_MS =
  60_000;

const REST_REQUEST_TIMEOUT_MS =
  30_000;

const listeners =
  new Set<() => void>();

let loadPromise:
  Promise<void> | null = null;

let state:
  SeoulReservationRemoteState = {
    revision: 0,
    loading: false,
    source: 'static',
    dataVersion: null,
    error: null,
    counts: {
      camping:
        SEOUL_CAMPING_FACILITIES.length,
      sports:
        SEOUL_SPORTS_FACILITIES.length,
      spaces:
        SEOUL_SPACE_FACILITIES.length,
      education:
        SEOUL_EDUCATION_PLACES.length,
    },
  };

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(
    error ??
    '알 수 없는 오류'
  );
}

function publishState(
  patch: Partial<
    Omit<
      SeoulReservationRemoteState,
      'revision'
    >
  >
) {
  state = {
    ...state,
    ...patch,
    revision:
      state.revision + 1,
  };

  for (
    const listener of
      listeners
  ) {
    listener();
  }
}

function subscribe(
  listener: () => void
) {
  listeners.add(listener);

  return () => {
    listeners.delete(
      listener
    );
  };
}

function createEmptyDataset():
  ReservationDataset {
  return {
    camping: [],
    sports: [],
    spaces: [],
    education: [],
  };
}

function removeUploadMetadata(
  value: any
) {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return value;
  }

  const {
    _sync: ignoredSync,
    ...cleanValue
  } = value;

  void ignoredSync;

  return cleanValue;
}

function snapshotToItems(
  querySnapshot: any
) {
  return querySnapshot.docs.map(
    (
      documentSnapshot: any
    ) => {
      const rawData =
        documentSnapshot.data() ??
        {};

      const normalized =
        removeUploadMetadata(
          rawData
        );

      const dataId =
        String(
          normalized?.id ??
          ''
        ).trim();

      return {
        ...normalized,
        id:
          dataId ||
          documentSnapshot.id,
      };
    }
  );
}

function getDatasetCounts(
  dataset:
    ReservationDataset
) {
  return {
    camping:
      dataset.camping.length,
    sports:
      dataset.sports.length,
    spaces:
      dataset.spaces.length,
    education:
      dataset.education.length,
  };
}

function replaceExportedArray(
  target:
    readonly unknown[],
  nextValues:
    any[]
) {
  const mutableTarget =
    target as unknown as any[];

  mutableTarget.splice(
    0,
    mutableTarget.length,
    ...nextValues
  );
}

function applyDataset(
  dataset:
    ReservationDataset
) {
  replaceExportedArray(
    SEOUL_CAMPING_FACILITIES,
    dataset.camping
  );

  replaceExportedArray(
    SEOUL_SPORTS_FACILITIES,
    dataset.sports
  );

  replaceExportedArray(
    SEOUL_SPACE_FACILITIES,
    dataset.spaces
  );

  replaceExportedArray(
    SEOUL_EDUCATION_PLACES,
    dataset.education
  );
}

function validateCategory(
  category:
    ReservationCategory,
  items:
    any[],
  expectedCount?: number
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      `${category} 원격 데이터가 비어 있습니다.`
    );
  }

  if (
    expectedCount !==
      undefined &&
    Number.isFinite(
      expectedCount
    ) &&
    items.length !==
      expectedCount
  ) {
    throw new Error(
      [
        `${category} 문서 개수가 일치하지 않습니다.`,
        `예상=${expectedCount}`,
        `실제=${items.length}`,
      ].join(' ')
    );
  }

  const idSet =
    new Set<string>();

  for (
    const item of
      items
  ) {
    const id =
      String(
        item?.id ??
        ''
      ).trim();

    if (!id) {
      throw new Error(
        `${category} 데이터에 ID가 없는 항목이 있습니다.`
      );
    }

    if (
      idSet.has(id)
    ) {
      throw new Error(
        `${category} 데이터 ID가 중복되었습니다: ${id}`
      );
    }

    idSet.add(id);
  }
}

function validateDataset(
  dataset:
    ReservationDataset,
  expectedCounts?: Partial<
    Record<
      ReservationCategory,
      number
    >
  >
) {
  for (
    const category of
      CATEGORY_KEYS
  ) {
    validateCategory(
      category,
      dataset[category],
      expectedCounts?.[
        category
      ]
    );
  }
}

function getExpectedCounts(
  metaData: any
) {
  const result: Partial<
    Record<
      ReservationCategory,
      number
    >
  > = {};

  for (
    const category of
      CATEGORY_KEYS
  ) {
    const count =
      Number(
        metaData?.counts?.[
          category
        ]?.documents
      );

    if (
      Number.isFinite(count) &&
      count > 0
    ) {
      result[category] =
        count;
    }
  }

  return result;
}

function datasetMatchesCounts(
  dataset:
    ReservationDataset | null,
  expectedCounts: Partial<
    Record<
      ReservationCategory,
      number
    >
  >
) {
  if (!dataset) {
    return false;
  }

  return CATEGORY_KEYS.every(
    (
      category
    ) => {
      const expected =
        expectedCounts[
          category
        ];

      if (
        expected ===
        undefined
      ) {
        return (
          dataset[
            category
          ].length > 0
        );
      }

      return (
        dataset[
          category
        ].length ===
        expected
      );
    }
  );
}

function withTimeout<T>(
  promise:
    Promise<T>,
  timeoutMs:
    number,
  label:
    string
) {
  return new Promise<T>(
    (
      resolve,
      reject
    ) => {
      const timeoutId =
        setTimeout(
          () => {
            reject(
              new Error(
                `${label} 시간 초과`
              )
            );
          },
          timeoutMs
        );

      promise.then(
        (
          value
        ) => {
          clearTimeout(
            timeoutId
          );

          resolve(value);
        },
        (
          error
        ) => {
          clearTimeout(
            timeoutId
          );

          reject(error);
        }
      );
    }
  );
}

async function readSdkCollections(
  mode:
    'cache' | 'server'
) {
  const database =
    getFirestore(
      getApp()
    );

  const entries =
    await Promise.all(
      CATEGORY_KEYS.map(
        async (
          category
        ) => {
          const reference =
            collection(
              database,
              COLLECTION_NAMES[
                category
              ]
            );

          const querySnapshot =
            mode === 'cache'
              ? await getDocsFromCache(
                  reference
                )
              : await getDocsFromServer(
                  reference
                );

          return [
            category,
            snapshotToItems(
              querySnapshot
            ),
          ] as const;
        }
      )
    );

  const dataset =
    createEmptyDataset();

  for (
    const [
      category,
      items,
    ] of entries
  ) {
    dataset[
      category
    ] = items;
  }

  return dataset;
}

async function loadSdkMeta() {
  const database =
    getFirestore(
      getApp()
    );

  const metaSnapshot =
    await getDocFromServer(
      doc(
        database,
        'publicReservationMeta',
        'seoul'
      )
    );

  if (
    !metaSnapshot.exists()
  ) {
    throw new Error(
      '서울 예약 메타 문서가 없습니다.'
    );
  }

  return (
    metaSnapshot.data() ??
    {}
  );
}

function decodeFirestoreValue(
  value: any
): any {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null;
  }

  if (
    'nullValue' in value
  ) {
    return null;
  }

  if (
    'booleanValue' in value
  ) {
    return Boolean(
      value.booleanValue
    );
  }

  if (
    'integerValue' in value
  ) {
    return Number(
      value.integerValue
    );
  }

  if (
    'doubleValue' in value
  ) {
    return Number(
      value.doubleValue
    );
  }

  if (
    'timestampValue' in value
  ) {
    return String(
      value.timestampValue
    );
  }

  if (
    'stringValue' in value
  ) {
    return String(
      value.stringValue
    );
  }

  if (
    'bytesValue' in value
  ) {
    return String(
      value.bytesValue
    );
  }

  if (
    'referenceValue' in value
  ) {
    return String(
      value.referenceValue
    );
  }

  if (
    'geoPointValue' in value
  ) {
    return {
      latitude:
        Number(
          value.geoPointValue
            ?.latitude
        ),
      longitude:
        Number(
          value.geoPointValue
            ?.longitude
        ),
    };
  }

  if (
    'arrayValue' in value
  ) {
    const values =
      Array.isArray(
        value.arrayValue
          ?.values
      )
        ? value.arrayValue.values
        : [];

    return values.map(
      decodeFirestoreValue
    );
  }

  if (
    'mapValue' in value
  ) {
    const fields =
      value.mapValue
        ?.fields ??
      {};

    return Object.fromEntries(
      Object.entries(
        fields
      ).map(
        (
          [
            key,
            fieldValue,
          ]
        ) => [
          key,
          decodeFirestoreValue(
            fieldValue
          ),
        ]
      )
    );
  }

  return null;
}

function decodeFirestoreDocument(
  documentData: any
) {
  const fields =
    documentData?.fields ??
    {};

  const decoded =
    Object.fromEntries(
      Object.entries(
        fields
      ).map(
        (
          [
            key,
            value,
          ]
        ) => [
          key,
          decodeFirestoreValue(
            value
          ),
        ]
      )
    ) as Record<
      string,
      any
    >;

  const normalized =
    removeUploadMetadata(
      decoded
    );

  const documentId =
    String(
      documentData?.name ??
      ''
    )
      .split('/')
      .pop() ??
    '';

  const dataId =
    String(
      normalized?.id ??
      ''
    ).trim();

  return {
    ...normalized,
    id:
      dataId ||
      documentId,
  };
}

async function createRestHeaders(
  forceRefresh:
    boolean
): Promise<Record<string, string>> {
  try {
    const auth =
      getAuth(
        getApp()
      );

    const user =
      auth.currentUser;

    if (!user) {
      return {};
    }

    const token =
      await getIdToken(
        user,
        forceRefresh
      );

    return {
      Authorization:
        `Bearer ${token}`,
    };
  } catch (
    error
  ) {
    console.log(
      'SEOUL RESERVATION REST AUTH TOKEN ERROR',
      getErrorMessage(
        error
      )
    );

    return {};
  }
}

function getRestErrorDetail(
  responseBody:
    string
) {
  try {
    const parsed =
      JSON.parse(
        responseBody
      );

    return String(
      parsed?.error?.message ??
      responseBody
    ).slice(
      0,
      500
    );
  } catch {
    return responseBody.slice(
      0,
      500
    );
  }
}

async function fetchRestJson(
  url:
    string,
  label:
    string
) {
  for (
    let attempt = 0;
    attempt < 2;
    attempt += 1
  ) {
    const headers =
      await createRestHeaders(
        attempt > 0
      );

    const result =
      await withTimeout(
        (async () => {
          const response =
            await fetch(
              url,
              {
                method: 'GET',
                headers,
              }
            );

          const responseBody =
            await response.text();

          return {
            response,
            responseBody,
          };
        })(),
        REST_REQUEST_TIMEOUT_MS,
        label
      );

    if (
      result.response.ok
    ) {
      if (
        !result.responseBody
      ) {
        return {};
      }

      return JSON.parse(
        result.responseBody
      );
    }

    if (
      result.response.status ===
        401 &&
      attempt === 0
    ) {
      continue;
    }

    throw new Error(
      [
        `${label} 실패`,
        `HTTP ${result.response.status}`,
        getRestErrorDetail(
          result.responseBody
        ),
      ].join(': ')
    );
  }

  throw new Error(
    `${label} 인증 재시도 실패`
  );
}

async function loadRestMeta() {
  const url =
    `${FIRESTORE_REST_BASE}/publicReservationMeta/seoul`;

  const documentData =
    await fetchRestJson(
      url,
      '서울 예약 REST 메타 읽기'
    );

  return decodeFirestoreDocument(
    documentData
  );
}

async function loadRestCollection(
  category:
    ReservationCategory
) {
  const collectionName =
    COLLECTION_NAMES[
      category
    ];

  const items:
    any[] = [];

  let nextPageToken =
    '';

  do {
    const pageTokenQuery =
      nextPageToken
        ? `&pageToken=${encodeURIComponent(
            nextPageToken
          )}`
        : '';

    const url =
      [
        FIRESTORE_REST_BASE,
        '/',
        collectionName,
        '?pageSize=300',
        pageTokenQuery,
      ].join('');

    const responseData =
      await fetchRestJson(
        url,
        `${category} REST 데이터 읽기`
      );

    const documents =
      Array.isArray(
        responseData?.documents
      )
        ? responseData.documents
        : [];

    items.push(
      ...documents.map(
        decodeFirestoreDocument
      )
    );

    nextPageToken =
      String(
        responseData
          ?.nextPageToken ??
        ''
      ).trim();
  } while (
    nextPageToken
  );

  return items;
}

async function readRestCollections() {
  const entries =
    await Promise.all(
      CATEGORY_KEYS.map(
        async (
          category
        ) => {
          const items =
            await loadRestCollection(
              category
            );

          return [
            category,
            items,
          ] as const;
        }
      )
    );

  const dataset =
    createEmptyDataset();

  for (
    const [
      category,
      items,
    ] of entries
  ) {
    dataset[
      category
    ] = items;
  }

  return dataset;
}

async function storeRemoteVersion(
  remoteVersion:
    string
) {
  if (
    !remoteVersion
  ) {
    return;
  }

  await AsyncStorage.setItem(
    VERSION_STORAGE_KEY,
    remoteVersion
  );
}

async function applyRemoteResult(
  source:
    'remote' | 'rest',
  metaData:
    any,
  dataset:
    ReservationDataset
) {
  const expectedCounts =
    getExpectedCounts(
      metaData
    );

  validateDataset(
    dataset,
    expectedCounts
  );

  applyDataset(
    dataset
  );

  const remoteVersion =
    String(
      metaData?.version ??
      metaData?.updatedAt ??
      ''
    ).trim();

  await storeRemoteVersion(
    remoteVersion
  );

  const counts =
    getDatasetCounts(
      dataset
    );

  publishState({
    loading: false,
    source,
    dataVersion:
      remoteVersion ||
      null,
    error: null,
    counts,
  });

  console.log(
    source === 'rest'
      ? 'SEOUL RESERVATION REST APPLIED'
      : 'SEOUL RESERVATION REMOTE APPLIED',
    {
      version:
        remoteVersion ||
        null,
      counts,
    }
  );
}

async function loadSeoulReservationDataInternal() {
  publishState({
    loading: true,
    error: null,
  });

  let cacheDataset:
    ReservationDataset | null =
      null;

  let cacheApplied =
    false;

  try {
    cacheDataset =
      await withTimeout(
        readSdkCollections(
          'cache'
        ),
        CACHE_TIMEOUT_MS,
        'Firestore 캐시 읽기'
      );

    validateDataset(
      cacheDataset
    );

    applyDataset(
      cacheDataset
    );

    cacheApplied =
      true;

    publishState({
      source: 'cache',
      counts:
        getDatasetCounts(
          cacheDataset
        ),
    });

    console.log(
      'SEOUL RESERVATION CACHE APPLIED',
      getDatasetCounts(
        cacheDataset
      )
    );
  } catch (
    error
  ) {
    console.log(
      'SEOUL RESERVATION CACHE MISS',
      getErrorMessage(
        error
      )
    );
  }

  let sdkError:
    unknown = null;

  try {
    const metaData =
      await withTimeout(
        loadSdkMeta(),
        SDK_META_TIMEOUT_MS,
        '서울 예약 SDK 메타 확인'
      );

    const remoteVersion =
      String(
        metaData?.version ??
        metaData?.updatedAt ??
        ''
      ).trim();

    const expectedCounts =
      getExpectedCounts(
        metaData
      );

    const storedVersion =
      await AsyncStorage.getItem(
        VERSION_STORAGE_KEY
      );

    const validCachedVersion =
      cacheApplied &&
      Boolean(
        remoteVersion
      ) &&
      storedVersion ===
        remoteVersion &&
      datasetMatchesCounts(
        cacheDataset,
        expectedCounts
      );

    if (
      validCachedVersion
    ) {
      publishState({
        loading: false,
        source: 'cache',
        dataVersion:
          remoteVersion,
        error: null,
      });

      console.log(
        'SEOUL RESERVATION CACHE IS CURRENT',
        {
          version:
            remoteVersion,
          counts:
            state.counts,
        }
      );

      return;
    }

    const remoteDataset =
      await withTimeout(
        readSdkCollections(
          'server'
        ),
        SDK_DATA_TIMEOUT_MS,
        '서울 예약 SDK 데이터 읽기'
      );

    await applyRemoteResult(
      'remote',
      metaData,
      remoteDataset
    );

    return;
  } catch (
    error
  ) {
    sdkError =
      error;

    console.log(
      'SEOUL RESERVATION SDK LOAD ERROR: REST FALLBACK',
      getErrorMessage(
        error
      )
    );
  }

  try {
    const restMeta =
      await withTimeout(
        loadRestMeta(),
        REST_META_TIMEOUT_MS,
        '서울 예약 REST 메타 확인'
      );

    const restDataset =
      await withTimeout(
        readRestCollections(),
        REST_DATA_TIMEOUT_MS,
        '서울 예약 REST 데이터 읽기'
      );

    await applyRemoteResult(
      'rest',
      restMeta,
      restDataset
    );

    return;
  } catch (
    restError
  ) {
    const source =
      cacheApplied
        ? 'cache'
        : 'static';

    const errorMessage =
      [
        `SDK: ${getErrorMessage(
          sdkError
        )}`,
        `REST: ${getErrorMessage(
          restError
        )}`,
      ].join(' / ');

    publishState({
      loading: false,
      source,
      error:
        errorMessage,
    });

    console.log(
      'SEOUL RESERVATION FALLBACK USED',
      {
        source,
        sdkError:
          getErrorMessage(
            sdkError
          ),
        restError:
          getErrorMessage(
            restError
          ),
      }
    );
  }
}

export function ensureSeoulReservationData() {
  if (
    !loadPromise
  ) {
    loadPromise =
      loadSeoulReservationDataInternal();
  }

  return loadPromise;
}

export async function refreshSeoulReservationData() {
  loadPromise =
    null;

  await ensureSeoulReservationData();
}

export function useSeoulReservationData(
  autoLoad:
    boolean = true
) {
  const [
    currentState,
    setCurrentState,
  ] = useState(
    state
  );

  useEffect(
    () => {
      let disposed =
        false;

      const unsubscribe =
        subscribe(
          () => {
            if (disposed) {
              return;
            }

            setCurrentState(
              state
            );
          }
        );

      if (autoLoad) {
        InteractionManager
          .runAfterInteractions(
            () => {
              if (disposed) {
                return;
              }

              void ensureSeoulReservationData();
            }
          );
      }

      return () => {
        disposed = true;
        unsubscribe();
      };
    },
    [autoLoad]
  );

  return currentState;
}