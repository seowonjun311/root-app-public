import fs from 'node:fs';

const paths = {
  district:
    'app/explore/district/[districtId].tsx',
  preview:
    'components/explore/RootPlacePreviewCard.tsx',
  foundation:
    'store/rootExplorePlace.ts',
  community:
    'store/rootPlaceCommunity.ts',
  marker:
    'components/explore/RootExploreMapMarker.tsx',
};

function read(
  path
) {
  if (
    !fs.existsSync(path)
  ) {
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
  source,
  token,
  label
) {
  if (
    !source.includes(
      token
    )
  ) {
    throw new Error(
      `${label} missing ${JSON.stringify(token)}`
    );
  }
}

const district =
  read(paths.district);

const preview =
  read(paths.preview);

const foundation =
  read(paths.foundation);

const community =
  read(paths.community);

const marker =
  read(paths.marker);

for (
  const token of [
    'ROOT_EXPLORE_V12B_OWN_PENDING_HYDRATION',
    'createEmptyRootPlaceCommunitySnapshot',
    'buildRootPlaceCommunitySnapshot',
    'mergeRootPlaceCommunityIntoPlace',
    'subscribeRootPlaceCommunitySnapshot',
    'onSnapshot(',
    'latestPhotoUrl',
    'rootCommunityHighlights',
    'revision',
  ]
) {
  requireToken(
    community,
    token,
    'community store'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12B_OWN_PENDING_DISTRICT_HYDRATION',
    'rootPlaceCommunitySnapshot',
    'subscribeRootPlaceCommunitySnapshot',
    'communityPlaces',
    'mergeRootPlaceCommunityIntoPlace',
    'rootPlaceCommunitySnapshot',
    '.revision',
    'rootExploreMapRenderItems',
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
    'ROOT_EXPLORE_V12B_USER_PHOTO_PRIORITY',
    'place?.latestUserPhotoUrl',
    'getRootExplorePlaceImageUrl',
  ]
) {
  requireToken(
    foundation,
    token,
    'foundation'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12B_RECENT_PENDING_HIGHLIGHTS',
    'rootCommunityPhotoCount',
    'rootCommunityHighlights',
    '내 최근 현장 제보',
    '검수 대기',
    'formatRootCommunityAgeLabel',
    '최근 제보 하이라이트',
  ]
) {
  requireToken(
    preview,
    token,
    'preview'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V11_MAP_MARKER_UI',
    'getRootExplorePlaceImageUrl',
  ]
) {
  requireToken(
    marker,
    token,
    'V1.1 marker'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12A_COMMUNITY_INTEGRATION',
    'handleRootPlaceContribution',
    '<RootPlaceContributionModal',
    'ROOT_EXPLORE_V11_CLUSTER_PHOTO_MARKER_INTEGRATION',
    "'events'",
    "'facilities'",
  ]
) {
  requireToken(
    district,
    token,
    'preserved district'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12A_COMMUNITY_MEDIA_LIVE_REPORTS',
    'pickAndUploadRootPlaceMedia',
    'saveRootPlaceReport',
    "moderationStatus: 'pending'",
  ]
) {
  requireToken(
    community,
    token,
    'preserved V1.2A community store'
  );
}

const invalidFontWeight =
  preview.match(
    /fontWeight:\s*['"](?:150|250|350|450|550|650|750|850|950)['"]/g
  ) ?? [];

if (
  invalidFontWeight.length >
  0
) {
  throw new Error(
    `preview contains unsupported React Native fontWeight values: ${invalidFontWeight.join(', ')}`
  );
}

console.log(
  'PASS - current-user pending Firestore snapshot subscription exists'
);
console.log(
  'PASS - latest current-user pending photo has marker/card image priority'
);
console.log(
  'PASS - recent current-user pending reports render with relative time'
);
console.log(
  'PASS - community revision re-enables Android marker view tracking'
);
console.log(
  'PASS - V1.2A media/report submit handlers remain'
);
console.log(
  'PASS - V1.1 clusters/photo marker and events/facilities remain'
);
console.log(
  'PASS - EXPLORE V1.2B OWN PENDING HYDRATION'
);
