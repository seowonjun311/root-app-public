// ROOT_PLACE_V1_COMMON_DOMAIN

export const ROOT_PLACE_SCHEMA_VERSION =
  1 as const;

export type RootPlaceCategory =
  | 'cafe'
  | 'yajang'
  | 'nopo'
  | 'food'
  | 'tteokbokki'
  | 'beach'
  | 'valley'
  | 'pool_indoor'
  | 'pool_outdoor'
  | 'camping'
  | 'festival'
  | 'culture'
  | 'nature'
  | 'activity'
  | 'other';

export type RootPlaceSeason =
  | 'all'
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter';

export type RootPlaceSource =
  | 'root'
  | 'publicData'
  | 'kakao'
  | 'naver'
  | 'google'
  | 'user'
  | 'manual';

export type RootPlaceVerificationStatus =
  | 'verified'
  | 'community'
  | 'needs_review'
  | 'closed'
  | 'moved';

export type RootPlaceMediaKind =
  | 'image'
  | 'video';

export type RootPlaceMediaSource =
  | 'root'
  | 'user';

export type RootPlaceMediaStatus =
  | 'pending'
  | 'visible'
  | 'hidden';

export type RootPlaceReportKind =
  | 'new_place'
  | 'location'
  | 'name'
  | 'business_hours'
  | 'closed'
  | 'moved'
  | 'category'
  | 'tag'
  | 'outdoor_status'
  | 'water_status'
  | 'waiting'
  | 'media'
  | 'other';

export type RootPlaceReportStatus =
  | 'pending'
  | 'accepted'
  | 'rejected';

export type RootGeoPoint = {
  latitude: number;
  longitude: number;
};

export type RootPlace = {
  version: 1;
  placeId: string;
  name: string;
  normalizedName: string;
  categories: RootPlaceCategory[];
  primaryCategory: RootPlaceCategory;
  primaryTheme?: string | null;
  themes: string[];
  seasons: RootPlaceSeason[];
  tags: string[];
  representativeTags: string[];
  address?: string | null;
  roadAddress?: string | null;
  latitude: number;
  longitude: number;
  phone?: string | null;
  placeUrl?: string | null;
  externalProvider?: string | null;
  externalPlaceId?: string | null;
  source: RootPlaceSource;
  verificationStatus:
    RootPlaceVerificationStatus;
  representativeMediaId?: string | null;
  representativeImageUrl?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RootPlaceMedia = {
  version: 1;
  mediaId: string;
  placeId: string;
  authorUid: string;
  kind: RootPlaceMediaKind;
  source: RootPlaceMediaSource;
  status: RootPlaceMediaStatus;
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string | null;
  capturedAt?: string | null;
  visitedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RootPlaceReport = {
  version: 1;
  reportId: string;
  placeId?: string | null;
  authorUid: string;
  kind: RootPlaceReportKind;
  status: RootPlaceReportStatus;
  value?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mediaIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type RootPlaceVisit = {
  version: 1;
  visitId: string;
  placeId: string;
  authorUid: string;
  visitedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  gpsVerified: boolean;
  mediaIds: string[];
  note?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RootPlaceSeed = {
  placeId: string;
  name: string;
  categories: RootPlaceCategory[];
  primaryCategory: RootPlaceCategory;
  primaryTheme?: string | null;
  themes?: string[];
  seasons?: RootPlaceSeason[];
  tags?: string[];
  representativeTags?: string[];
  address?: string | null;
  roadAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  placeUrl?: string | null;
  externalProvider?: string | null;
  externalPlaceId?: string | null;
  source?: RootPlaceSource;
};

const cleanText = (
  value: unknown,
): string =>
  String(
    value ?? '',
  ).trim();

const uniqueText = (
  values: readonly unknown[] | null | undefined,
): string[] =>
  Array.from(
    new Set(
      (
        values ??
        []
      )
        .map(
          cleanText,
        )
        .filter(
          Boolean,
        ),
    ),
  );

export const normalizeRootPlaceName = (
  value: unknown,
): string =>
  cleanText(
    value,
  )
    .normalize(
      'NFKC',
    )
    .toLocaleLowerCase(
      'ko-KR',
    );

export const isValidRootLatitude = (
  value: unknown,
): value is number =>
  typeof value ===
    'number' &&
  Number.isFinite(
    value,
  ) &&
  value >=
    -90 &&
  value <=
    90;

export const isValidRootLongitude = (
  value: unknown,
): value is number =>
  typeof value ===
    'number' &&
  Number.isFinite(
    value,
  ) &&
  value >=
    -180 &&
  value <=
    180;

export const createRootPlaceFromSeed = (
  seed: RootPlaceSeed,
  now =
    new Date().toISOString(),
): RootPlace => {
  const name =
    cleanText(
      seed.name,
    );

  if (!name) {
    throw new Error(
      'ROOT_PLACE_NAME_REQUIRED',
    );
  }

  const latitude =
    seed.latitude;

  const longitude =
    seed.longitude;

  if (
    !isValidRootLatitude(
      latitude,
    ) ||
    !isValidRootLongitude(
      longitude,
    )
  ) {
    throw new Error(
      'ROOT_PLACE_VALID_GPS_REQUIRED',
    );
  }

  const categories =
    Array.from(
      new Set([
        seed.primaryCategory,
        ...(
          seed.categories ??
          []
        ),
      ]),
    );

  return {
    version:
      ROOT_PLACE_SCHEMA_VERSION,
    placeId:
      cleanText(
        seed.placeId,
      ),
    name,
    normalizedName:
      normalizeRootPlaceName(
        name,
      ),
    categories,
    primaryCategory:
      seed.primaryCategory,
    primaryTheme:
      seed.primaryTheme ??
      null,
    themes:
      uniqueText(
        seed.themes,
      ),
    seasons:
      (
        seed.seasons &&
        seed.seasons.length >
          0
          ? Array.from(
              new Set(
                seed.seasons,
              ),
            )
          : [
              'all' as const,
            ]
      ),
    tags:
      uniqueText(
        seed.tags,
      ),
    representativeTags:
      uniqueText(
        seed
          .representativeTags,
      ),
    address:
      cleanText(
        seed.address,
      ) ||
      null,
    roadAddress:
      cleanText(
        seed.roadAddress,
      ) ||
      null,
    latitude,
    longitude,
    phone:
      cleanText(
        seed.phone,
      ) ||
      null,
    placeUrl:
      cleanText(
        seed.placeUrl,
      ) ||
      null,
    externalProvider:
      cleanText(
        seed.externalProvider,
      ) ||
      null,
    externalPlaceId:
      cleanText(
        seed.externalPlaceId,
      ) ||
      null,
    source:
      seed.source ??
      'manual',
    verificationStatus:
      'needs_review',
    representativeMediaId:
      null,
    representativeImageUrl:
      null,
    lastActivityAt:
      now,
    createdAt:
      now,
    updatedAt:
      now,
  };
};

export const getRootPlaceSearchText = (
  place: Pick<
    RootPlace,
    | 'name'
    | 'categories'
    | 'primaryTheme'
    | 'themes'
    | 'tags'
    | 'representativeTags'
    | 'address'
    | 'roadAddress'
  >,
): string =>
  [
    place.name,
    ...place.categories,
    place.primaryTheme ??
      '',
    ...place.themes,
    ...place.tags,
    ...place.representativeTags,
    place.address ??
      '',
    place.roadAddress ??
      '',
  ]
    .map(
      (
        value,
      ) =>
        normalizeRootPlaceName(
          value,
        ),
    )
    .filter(
      Boolean,
    )
    .join(
      ' ',
    );
