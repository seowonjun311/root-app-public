import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  SavedCafe,
} from './savedPlaces';

export const SAVED_CAFE_LOCAL_KEY =
  'root_saved_cafes_v1';

export type SavedCafeLocalEntry = {
  cafe: SavedCafe;
  address?: string;
  roadAddress?: string;
  latitude?: number;
  longitude?: number;
  externalProvider?:
    | 'kakao'
    | 'naver'
    | 'google'
    | 'publicData'
    | 'manual';
  externalPlaceId?: string;
  phone?: string;
  placeUrl?: string;
  savedAt: string;
};

function isSavedCafeLocalEntry(
  value: unknown,
): value is SavedCafeLocalEntry {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const entry =
    value as Partial<SavedCafeLocalEntry>;

  return (
    !!entry.cafe &&
    typeof entry.cafe === 'object' &&
    typeof entry.cafe.placeId ===
      'string' &&
    typeof entry.cafe.name ===
      'string' &&
    entry.cafe.category ===
      'cafe' &&
    typeof entry.savedAt ===
      'string'
  );
}

export async function loadSavedCafeEntries(): Promise<
  SavedCafeLocalEntry[]
> {
  try {
    const raw =
      await AsyncStorage.getItem(
        SAVED_CAFE_LOCAL_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isSavedCafeLocalEntry)
      .sort(
        (first, second) =>
          second.savedAt.localeCompare(
            first.savedAt,
          ),
      );
  } catch (error) {
    console.log(
      'SAVED CAFE LOCAL LOAD ERROR',
      error,
    );

    return [];
  }
}

export async function saveCafeEntry(
  entry: SavedCafeLocalEntry,
): Promise<SavedCafeLocalEntry[]> {
  const current =
    await loadSavedCafeEntries();

  const next = [
    entry,
    ...current.filter(
      (item) =>
        item.cafe.placeId !==
        entry.cafe.placeId,
    ),
  ];

  await AsyncStorage.setItem(
    SAVED_CAFE_LOCAL_KEY,
    JSON.stringify(next),
  );

  console.log(
    'SAVED CAFE LOCAL SAVE DONE',
    {
      placeId:
        entry.cafe.placeId,
      name:
        entry.cafe.name,
      status:
        entry.cafe.status,
      primaryTheme:
        entry.cafe.primaryTheme,
      themeCount:
        entry.cafe.themes.length,
      seasonCount:
        entry.cafe.seasons.length,
      keywordCount:
        entry.cafe.tags.length,
      representativeKeywordCount:
        entry.cafe
          .representativeTags
          .length,
      savedCafeCount:
        next.length,
    },
  );

  return next;
}

export async function removeSavedCafeEntry(
  placeId: string,
): Promise<SavedCafeLocalEntry[]> {
  const current =
    await loadSavedCafeEntries();

  const next =
    current.filter(
      (item) =>
        item.cafe.placeId !==
        placeId,
    );

  await AsyncStorage.setItem(
    SAVED_CAFE_LOCAL_KEY,
    JSON.stringify(next),
  );

  console.log(
    'SAVED CAFE LOCAL REMOVE DONE',
    {
      placeId,
      savedCafeCount:
        next.length,
    },
  );

  return next;
}
