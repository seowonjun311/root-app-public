// ROOT_EXPLORE_V11_MAP_CLUSTER_ENGINE

export type RootExploreMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type RootExploreMapRegionLike =
  RootExploreMapCoordinate & {
    latitudeDelta: number;
    longitudeDelta: number;
  };

export type RootExploreMapPlaceItem = {
  place: any;
  coordinate: RootExploreMapCoordinate;
};

export type RootExploreMapRenderItem =
  | {
      kind: 'cluster';
      id: string;
      coordinate: RootExploreMapCoordinate;
      count: number;
      placeIds: string[];
    }
  | {
      kind: 'place';
      id: string;
      coordinate: RootExploreMapCoordinate;
      place: any;
    };

export type RootExploreMapMarkerMode =
  | 'cluster'
  | 'photo';

export const
  ROOT_EXPLORE_PHOTO_MARKER_LATITUDE_DELTA =
    0.03;

function finiteOr(
  value: unknown,
  fallback: number
) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

export function getRootExploreMapMarkerMode(
  region:
    RootExploreMapRegionLike
): RootExploreMapMarkerMode {
  return finiteOr(
    region.latitudeDelta,
    1
  ) <=
    ROOT_EXPLORE_PHOTO_MARKER_LATITUDE_DELTA
    ? 'photo'
    : 'cluster';
}

export function buildRootExploreMapRenderItems(
  items:
    readonly RootExploreMapPlaceItem[],
  region:
    RootExploreMapRegionLike
): RootExploreMapRenderItem[] {
  const mode =
    getRootExploreMapMarkerMode(
      region
    );

  if (mode === 'photo') {
    return items.map(
      (
        {
          place,
          coordinate,
        },
        index
      ) => ({
        kind: 'place' as const,
        id:
          String(
            place?.id ??
              `place-${index}`
          ),
        coordinate,
        place,
      })
    );
  }

  const latitudeDelta =
    Math.max(
      0.0001,
      Math.abs(
        finiteOr(
          region.latitudeDelta,
          0.08
        )
      )
    );

  const longitudeDelta =
    Math.max(
      0.0001,
      Math.abs(
        finiteOr(
          region.longitudeDelta,
          latitudeDelta
        )
      )
    );

  // Dependency-free ~5 x 5 screen grid. Reusable later by the nationwide map.
  const latitudeCell =
    Math.max(
      latitudeDelta / 5,
      0.0025
    );

  const longitudeCell =
    Math.max(
      longitudeDelta / 5,
      0.0025
    );

  type Bucket = {
    latitudeTotal: number;
    longitudeTotal: number;
    items:
      RootExploreMapPlaceItem[];
  };

  const buckets =
    new Map<string, Bucket>();

  for (
    const item of items
  ) {
    const latitude =
      finiteOr(
        item.coordinate.latitude,
        0
      );

    const longitude =
      finiteOr(
        item.coordinate.longitude,
        0
      );

    const latitudeIndex =
      Math.floor(
        latitude / latitudeCell
      );

    const longitudeIndex =
      Math.floor(
        longitude / longitudeCell
      );

    const key =
      `${latitudeIndex}:${longitudeIndex}`;

    const existing =
      buckets.get(key);

    if (existing) {
      existing.latitudeTotal +=
        latitude;

      existing.longitudeTotal +=
        longitude;

      existing.items.push(
        item
      );

      continue;
    }

    buckets.set(
      key,
      {
        latitudeTotal:
          latitude,
        longitudeTotal:
          longitude,
        items: [item],
      }
    );
  }

  return Array.from(
    buckets.entries()
  )
    .map(
      (
        [
          key,
          bucket,
        ]
      ) => {
        const count =
          bucket.items.length;

        const placeIds =
          bucket.items.map(
            (
              item,
              index
            ) =>
              String(
                item.place?.id ??
                  `${key}-${index}`
              )
          );

        return {
          kind: 'cluster' as const,
          id:
            `cluster:${key}:${placeIds.join(
              '|'
            )}`,
          coordinate: {
            latitude:
              bucket.latitudeTotal /
              count,
            longitude:
              bucket.longitudeTotal /
              count,
          },
          count,
          placeIds,
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        second.count -
        first.count ||
        first.id.localeCompare(
          second.id
        )
    );
}
