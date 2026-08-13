// ROOT_PLACE_V1_FIRESTORE_REPOSITORY

import {
  getApp,
} from '@react-native-firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  where,
} from '@react-native-firebase/firestore';

import type {
  RootPlace,
  RootPlaceCategory,
} from './rootPlaceDomain';

const ROOT_PLACES_COLLECTION =
  'rootPlaces';

const database = () =>
  getFirestore(
    getApp(),
  );

const normalizeLimit = (
  value: number | undefined,
) =>
  Math.min(
    200,
    Math.max(
      1,
      Math.floor(
        value ??
        100,
      ),
    ),
  );

const fromSnapshot = (
  snapshot: any,
): RootPlace | null => {
  const exists =
    typeof snapshot?.exists ===
      'function'
      ? snapshot.exists()
      : snapshot?.exists;

  if (!exists) {
    return null;
  }

  return {
    ...(snapshot.data() as
      RootPlace),
    placeId:
      String(
        snapshot.id,
      ),
  };
};

export async function readRootPlace(
  placeId: string,
): Promise<RootPlace | null> {
  const safePlaceId =
    String(
      placeId ??
      '',
    ).trim();

  if (!safePlaceId) {
    return null;
  }

  const snapshot =
    await getDoc(
      doc(
        database(),
        ROOT_PLACES_COLLECTION,
        safePlaceId,
      ),
    );

  return fromSnapshot(
    snapshot,
  );
}

export async function listRootPlaces(
  maxResults =
    100,
): Promise<RootPlace[]> {
  const snapshot =
    await getDocs(
      query(
        collection(
          database(),
          ROOT_PLACES_COLLECTION,
        ),
        limit(
          normalizeLimit(
            maxResults,
          ),
        ),
      ),
    );

  return snapshot.docs
    .map(
      fromSnapshot,
    )
    .filter(
      (
        item,
      ): item is RootPlace =>
        Boolean(
          item,
        ),
    );
}

export async function listRootPlacesByCategory(
  category: RootPlaceCategory,
  maxResults =
    100,
): Promise<RootPlace[]> {
  const snapshot =
    await getDocs(
      query(
        collection(
          database(),
          ROOT_PLACES_COLLECTION,
        ),
        where(
          'categories',
          'array-contains',
          category,
        ),
        limit(
          normalizeLimit(
            maxResults,
          ),
        ),
      ),
    );

  return snapshot.docs
    .map(
      fromSnapshot,
    )
    .filter(
      (
        item,
      ): item is RootPlace =>
        Boolean(
          item,
        ),
    );
}
