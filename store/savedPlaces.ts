import {
  CAFE_KEYWORD_IDS,
  CAFE_THEME_IDS,
  MAX_CAFE_KEYWORDS,
  MAX_REPRESENTATIVE_CAFE_KEYWORDS,
  type CafeKeywordId,
  type CafeThemeId,
} from './cafeKeywordCatalog';

import {
  PLACE_PRIMARY_THEME_IDS,
  PLACE_SEASON_IDS,
  normalizePlaceSeasons,
  uniqueStringValues,
  type PlaceCategoryId,
  type PlacePrimaryThemeId,
  type PlaceSeasonId,
  type PlaceVerification,
  type SavedPlaceStatusId,
} from './placeTypes';

export const SAVED_PLACE_FLOW = [
  'searchPlace',
  'selectStatus',
  'selectRelatedKeywords',
  'selectRepresentativeKeywords',
  'writeRecommendationMemo',
] as const;

export type SavedPlace<
  TThemeId extends string = string,
  TTagId extends string = string,
> = {
  id: string;
  placeId: string;
  name: string;
  category: PlaceCategoryId;
  status: SavedPlaceStatusId;
  primaryTheme: PlacePrimaryThemeId;
  themes: TThemeId[];
  seasons: PlaceSeasonId[];
  tags: TTagId[];
  representativeTags: TTagId[];
  memo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedCafe = SavedPlace<CafeThemeId, CafeKeywordId> & {
  category: 'cafe';
};

export type PlaceRecord = {
  id: string;
  name: string;
  category: PlaceCategoryId;
  address?: string;
  roadAddress?: string;
  latitude?: number;
  longitude?: number;
  externalPlaceId?: string;
  externalProvider?: 'kakao' | 'naver' | 'google' | 'publicData';
  createdAt: string;
  updatedAt: string;
};

export type PlaceKeywordVote<
  TThemeId extends string = string,
  TTagId extends string = string,
> = {
  placeId: string;
  userId: string;
  primaryTheme: PlacePrimaryThemeId;
  themes: TThemeId[];
  seasons: PlaceSeasonId[];
  tags: TTagId[];
  representativeTags: TTagId[];
  updatedAt: string;
};

export type CafeMutableFacts = {
  closesAt?: PlaceVerification<string | null>;
  opensAt?: PlaceVerification<string | null>;
  open24Hours?: PlaceVerification<boolean>;
  parkingAvailable?: PlaceVerification<boolean>;
  freeParking?: PlaceVerification<boolean>;
  reservationAvailable?: PlaceVerification<boolean>;
  petAllowed?: PlaceVerification<boolean>;
  laptopAllowed?: PlaceVerification<boolean>;
  powerOutletAvailable?: PlaceVerification<boolean>;
  wheelchairAccessible?: PlaceVerification<boolean>;
};

export type CafeSearchFilter = {
  statuses?: SavedPlaceStatusId[];
  primaryThemes?: PlacePrimaryThemeId[];
  themes?: CafeThemeId[];
  seasons?: PlaceSeasonId[];
  tags?: CafeKeywordId[];
  requireAllTags?: boolean;
};

export type CreateSavedCafeInput = Omit<
  SavedCafe,
  'id' | 'category' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SavedCafeValidationResult = {
  valid: boolean;
  errors: string[];
};

function uniqueKnownValues<T extends string>(
  values: readonly T[],
  allowedValues: readonly T[],
): T[] {
  return uniqueStringValues(values).filter(
    (value) => allowedValues.includes(value),
  );
}

export function validateSavedCafe(
  cafe: Pick<
    SavedCafe,
    | 'primaryTheme'
    | 'themes'
    | 'seasons'
    | 'tags'
    | 'representativeTags'
  >,
): SavedCafeValidationResult {
  const errors: string[] = [];

  if (!PLACE_PRIMARY_THEME_IDS.includes(cafe.primaryTheme)) {
    errors.push('대표 테마가 올바르지 않습니다.');
  }

  if (cafe.themes.length === 0) {
    errors.push('카페 테마를 한 개 이상 선택해야 합니다.');
  }

  if (cafe.themes.some((theme) => !CAFE_THEME_IDS.includes(theme))) {
    errors.push('알 수 없는 카페 테마가 포함되어 있습니다.');
  }

  if (
    cafe.seasons.length === 0 ||
    cafe.seasons.some(
      (season) => !PLACE_SEASON_IDS.includes(season),
    )
  ) {
    errors.push('어울리는 계절을 한 개 이상 선택해야 합니다.');
  }

  if (cafe.tags.length > MAX_CAFE_KEYWORDS) {
    errors.push(
      `카페 키워드는 최대 ${MAX_CAFE_KEYWORDS}개까지 선택할 수 있습니다.`,
    );
  }

  if (cafe.tags.some((tag) => !CAFE_KEYWORD_IDS.includes(tag))) {
    errors.push('알 수 없는 카페 키워드가 포함되어 있습니다.');
  }

  if (
    cafe.representativeTags.length >
    MAX_REPRESENTATIVE_CAFE_KEYWORDS
  ) {
    errors.push(
      `대표 키워드는 최대 ${MAX_REPRESENTATIVE_CAFE_KEYWORDS}개까지 선택할 수 있습니다.`,
    );
  }

  if (
    cafe.representativeTags.some(
      (tag) => !cafe.tags.includes(tag),
    )
  ) {
    errors.push(
      '대표 키워드는 선택한 전체 키워드 안에서만 지정할 수 있습니다.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createSavedCafe(
  input: CreateSavedCafeInput,
  now = new Date().toISOString(),
): SavedCafe {
  const themes = uniqueKnownValues(input.themes, CAFE_THEME_IDS);

  const seasons = normalizePlaceSeasons(
    uniqueKnownValues(input.seasons, PLACE_SEASON_IDS),
  );

  const tags = uniqueKnownValues(
    input.tags,
    CAFE_KEYWORD_IDS,
  ).slice(0, MAX_CAFE_KEYWORDS);

  const representativeTags = uniqueKnownValues(
    input.representativeTags,
    CAFE_KEYWORD_IDS,
  )
    .filter((tag) => tags.includes(tag))
    .slice(0, MAX_REPRESENTATIVE_CAFE_KEYWORDS);

  const cafe: SavedCafe = {
    ...input,
    id: input.id ?? `saved-cafe-${Date.now()}`,
    category: 'cafe',
    themes,
    seasons,
    tags,
    representativeTags,
    memo: input.memo.trim().slice(0, 300),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  const validation = validateSavedCafe(cafe);

  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  return cafe;
}
