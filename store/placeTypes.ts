export const PLACE_CATEGORY_IDS = ['cafe'] as const;
export type PlaceCategoryId = (typeof PLACE_CATEGORY_IDS)[number];

export const PLACE_PRIMARY_THEME_IDS = [
  'study',
  'nightOutdoor',
  'walk',
  'date',
  'photo',
  'foodCafe',
  'culture',
  'nature',
  'family',
  'pet',
  'activity',
  'rest',
] as const;
export type PlacePrimaryThemeId =
  (typeof PLACE_PRIMARY_THEME_IDS)[number];

export const PLACE_SEASON_IDS = [
  'all',
  'spring',
  'summer',
  'autumn',
  'winter',
] as const;
export type PlaceSeasonId =
  (typeof PLACE_SEASON_IDS)[number];

export const SAVED_PLACE_STATUS_IDS = [
  'wantToGo',
  'favorite',
  'visited',
] as const;
export type SavedPlaceStatusId =
  (typeof SAVED_PLACE_STATUS_IDS)[number];

export type PlaceCatalogOption<TId extends string> = {
  id: TId;
  label: string;
  description?: string;
};

export type PlaceThemeSelection<
  TThemeId extends string = string,
  TTagId extends string = string,
> = {
  primaryTheme: PlacePrimaryThemeId;
  themes: TThemeId[];
  seasons: PlaceSeasonId[];
  tags: TTagId[];
  representativeTags: TTagId[];
};

export type PlaceVerification<TValue> = {
  value: TValue;
  verifiedAt: string;
  verifiedBy?: string;
  source?: 'user' | 'owner' | 'publicData' | 'externalPlaceApi';
};

export function uniqueStringValues<T extends string>(
  values: readonly T[],
): T[] {
  return Array.from(new Set(values));
}

export function normalizePlaceSeasons(
  seasons: readonly PlaceSeasonId[],
): PlaceSeasonId[] {
  const normalized = uniqueStringValues(seasons).filter(
    (season): season is PlaceSeasonId =>
      PLACE_SEASON_IDS.includes(season),
  );

  return normalized.length > 0 ? normalized : ['all'];
}

export function isPlacePrimaryThemeId(
  value: unknown,
): value is PlacePrimaryThemeId {
  return (
    typeof value === 'string' &&
    PLACE_PRIMARY_THEME_IDS.includes(
      value as PlacePrimaryThemeId,
    )
  );
}

export function isPlaceSeasonId(
  value: unknown,
): value is PlaceSeasonId {
  return (
    typeof value === 'string' &&
    PLACE_SEASON_IDS.includes(value as PlaceSeasonId)
  );
}
