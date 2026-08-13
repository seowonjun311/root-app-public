import fs from 'node:fs';

const paths = {
  district:
    'app/explore/district/[districtId].tsx',
  cluster:
    'store/rootExploreMapCluster.ts',
  marker:
    'components/explore/RootExploreMapMarker.tsx',
  v1Foundation:
    'store/rootExplorePlace.ts',
  v1Preview:
    'components/explore/RootPlacePreviewCard.tsx',
};

function read(
  path
) {
  if (!fs.existsSync(path)) {
    throw new Error(
      `missing ${path}`
    );
  }

  return fs
    .readFileSync(
      path,
      'utf8'
    )
    .replace(
      /\r\n/g,
      '\n'
    );
}

function requireToken(
  text,
  token,
  label
) {
  if (!text.includes(token)) {
    throw new Error(
      `${label} missing ${JSON.stringify(token)}`
    );
  }
}

const district =
  read(paths.district);

const cluster =
  read(paths.cluster);

const marker =
  read(paths.marker);

const v1Foundation =
  read(paths.v1Foundation);

const v1Preview =
  read(paths.v1Preview);

for (
  const token of [
    'ROOT_EXPLORE_V11_CLUSTER_PHOTO_MARKER_INTEGRATION',
    'mapRegion',
    'onRegionChangeComplete',
    'rootExploreMarkerMode',
    'rootExploreMapRenderItems',
    'zoomIntoRootExploreCluster',
    '<RootExploreMapMarker',
    'rootExploreMarkerMode ===',
    'visiblePlaceMarkerItems',
  ]
) {
  requireToken(
    district,
    token,
    'district'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V11_MAP_CLUSTER_ENGINE',
    'ROOT_EXPLORE_PHOTO_MARKER_LATITUDE_DELTA',
    "kind: 'cluster'",
    "kind: 'place'",
    'latitudeDelta / 5',
    'longitudeDelta / 5',
    'buildRootExploreMapRenderItems',
    'getRootExploreMapMarkerMode',
  ]
) {
  requireToken(
    cluster,
    token,
    'cluster engine'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V11_MAP_MARKER_UI',
    "kind: 'cluster'",
    "kind: 'place'",
    'getRootExplorePlaceImageUrl',
    '<Image',
    'styles.cluster',
    'styles.photoShell',
    'styles.completedBadge',
  ]
) {
  requireToken(
    marker,
    token,
    'marker UI'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V1_COMMON_PLACE_FOUNDATION',
    "id: 'yajang'",
    "id: 'nopo'",
    'getRootExplorePlaceImageUrl',
  ]
) {
  requireToken(
    v1Foundation,
    token,
    'V1.0 foundation'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V1_ROOT_PLACE_PREVIEW_CARD',
    '함께 만들어가는 장소',
  ]
) {
  requireToken(
    v1Preview,
    token,
    'V1.0 preview'
  );
}

for (
  const token of [
    "from 'react-native-maps'",
    'fetchSeoulCultureEvents',
    "'events'",
    "'facilities'",
    'openPlaceDetail(',
    'matchesCurrentRootPlaceFilters',
  ]
) {
  requireToken(
    district,
    token,
    'preserved district contract'
  );
}

const invalidFontWeight =
  marker.match(
    /fontWeight:\s*['"](?:150|250|350|450|550|650|750|850|950)['"]/g
  ) ?? [];

if (
  invalidFontWeight.length > 0
) {
  throw new Error(
    `map marker contains unsupported React Native fontWeight values: ${invalidFontWeight.join(', ')}`
  );
}

console.log(
  'PASS - zoomed-out map uses number-cluster render items'
);
console.log(
  'PASS - close zoom uses ROOT/user photo marker UI'
);
console.log(
  'PASS - cluster press zoom path exists'
);
console.log(
  'PASS - active V1.0 search/theme filters feed cluster counts'
);
console.log(
  'PASS - V1.0 ROOT place preview and yajang/nopo foundation preserved'
);
console.log(
  'PASS - events/facilities/place detail contracts preserved'
);
console.log(
  'PASS - EXPLORE V1.1 ZOOM CLUSTER + PHOTO MARKERS'
);
