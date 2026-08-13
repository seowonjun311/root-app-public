// ROOT_PLACE_V1_SAVED_CAFE_BRIDGE

import type {
  SavedCafeLocalEntry,
} from './savedCafeLocal';

import type {
  RootPlaceSeed,
} from './rootPlaceDomain';

export function savedCafeEntryToRootPlaceSeed(
  entry: SavedCafeLocalEntry,
): RootPlaceSeed {
  return {
    placeId:
      String(
        entry.cafe.placeId,
      ),
    name:
      String(
        entry.cafe.name,
      ),
    categories: [
      'cafe',
    ],
    primaryCategory:
      'cafe',
    primaryTheme:
      entry.cafe.primaryTheme,
    themes:
      [
        ...entry.cafe.themes,
      ],
    seasons:
      [
        ...entry.cafe.seasons,
      ] as RootPlaceSeed['seasons'],
    tags:
      [
        ...entry.cafe.tags,
      ],
    representativeTags:
      [
        ...entry.cafe
          .representativeTags,
      ],
    address:
      entry.address ??
      null,
    roadAddress:
      entry.roadAddress ??
      null,
    latitude:
      entry.latitude ??
      null,
    longitude:
      entry.longitude ??
      null,
    phone:
      entry.phone ??
      null,
    placeUrl:
      entry.placeUrl ??
      null,
    externalProvider:
      entry.externalProvider ??
      null,
    externalPlaceId:
      entry.externalPlaceId ??
      null,
    source:
      (
        entry.externalProvider ===
          'publicData'
          ? 'publicData'
          : entry.externalProvider ===
              'kakao'
            ? 'kakao'
            : entry.externalProvider ===
                'naver'
              ? 'naver'
              : entry.externalProvider ===
                  'google'
                ? 'google'
                : 'manual'
      ),
  };
}

export function savedCafeEntriesToRootPlaceSeeds(
  entries: readonly SavedCafeLocalEntry[],
): RootPlaceSeed[] {
  return entries.map(
    savedCafeEntryToRootPlaceSeed,
  );
}
