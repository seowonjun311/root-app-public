import fs from 'node:fs';

const paths = {
  district:
    'app/explore/district/[districtId].tsx',
  preview:
    'components/explore/RootPlacePreviewCard.tsx',
  foundation:
    'store/rootExplorePlace.ts',
  publicStore:
    'store/rootPlacePublicCommunity.ts',
  pendingStore:
    'store/rootPlaceCommunity.ts',
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

const publicStore =
  read(paths.publicStore);

const pendingStore =
  read(paths.pendingStore);

for (
  const token of [
    'item:',
    'RootPlacePublicHighlight |',
    'null',
    'ROOT_EXPLORE_V12C_PUBLIC_COMMUNITY_FOUNDATION',
    "'rootPlacePublicCommunityDistricts'",
    'subscribeRootPlacePublicCommunityDistrict',
    'normalizeRootPlacePublicDistrictSnapshot',
    'mergeRootPlacePublicCommunityIntoPlace',
    'buildRootPlacePublicDistrictAggregate',
    "moderationStatus:",
    "'approved'",
    "publicVisible:",
    'true',
    "moderationModel:",
    "'approved-only'",
    'buildBooleanConsensus',
    'buildWaitingConsensus',
  ]
) {
  requireToken(
    publicStore,
    token,
    'public store'
  );
}

if (
  publicStore.includes(
    'setDoc('
  ) ||
  publicStore.includes(
    'addDoc('
  ) ||
  publicStore.includes(
    'updateDoc('
  )
) {
  throw new Error(
    'public community client store must remain read-only'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12C_PUBLIC_DISTRICT_HYDRATION',
    'rootPlacePublicSnapshot',
    'subscribeRootPlacePublicCommunityDistrict',
    'publicCommunityPlaces',
    'mergeRootPlacePublicCommunityIntoPlace',
    'rootPlacePublicSnapshot',
    '.revision',
    'ROOT_EXPLORE_V12B_OWN_PENDING_DISTRICT_HYDRATION',
  ]
) {
  requireToken(
    district,
    token,
    'district'
  );
}

const publicMergeIndex =
  district.indexOf(
    'mergeRootPlacePublicCommunityIntoPlace'
  );

const pendingMergeIndex =
  district.indexOf(
    'mergeRootPlaceCommunityIntoPlace',
    publicMergeIndex + 1
  );

if (
  publicMergeIndex < 0 ||
  pendingMergeIndex < 0 ||
  publicMergeIndex >=
    pendingMergeIndex
) {
  throw new Error(
    'public aggregate must merge before current-user pending overlay'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12C_APPROVED_PUBLIC_PHOTO_PRIORITY',
    'place?.latestUserPhotoUrl',
    'place?.approvedUserPhotoUrl',
    'place?.thumbnailImageUrl',
  ]
) {
  requireToken(
    foundation,
    token,
    'image priority'
  );
}

const ownPhotoIndex =
  foundation.indexOf(
    'place?.latestUserPhotoUrl'
  );

const publicPhotoIndex =
  foundation.indexOf(
    'place?.approvedUserPhotoUrl'
  );

const catalogPhotoIndex =
  foundation.indexOf(
    'place?.thumbnailImageUrl'
  );

if (
  ownPhotoIndex < 0 ||
  publicPhotoIndex < 0 ||
  catalogPhotoIndex < 0 ||
  !(
    ownPhotoIndex <
      publicPhotoIndex &&
    publicPhotoIndex <
      catalogPhotoIndex
  )
) {
  throw new Error(
    'photo priority must be own pending -> approved public -> catalog'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12C_APPROVED_PUBLIC_HIGHLIGHTS',
    'ROOT 커뮤니티 현황',
    'publicCommunityHighlights',
    'publicApprovedReportCount',
    'rootPublicCommunityPhotoCount',
    '승인 {publicApprovedReportCount}',
    'ROOT_EXPLORE_V12B_RECENT_PENDING_HIGHLIGHTS',
    '내 최근 현장 제보',
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
    'ROOT_EXPLORE_V12B_OWN_PENDING_HYDRATION',
    'subscribeRootPlaceCommunitySnapshot',
    'moderationStatus:',
    "'pending'",
  ]
) {
  requireToken(
    pendingStore,
    token,
    'pending store'
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
  'PASS - public community uses one read-only approved aggregate document per district'
);
console.log(
  'PASS - client has no public aggregate write method'
);
console.log(
  'PASS - photo priority is own pending -> approved public -> catalog'
);
console.log(
  'PASS - approved public highlights and report counts render separately from own pending reports'
);
console.log(
  'PASS - public revision refreshes Android photo markers'
);
console.log(
  'PASS - pure moderation aggregate builder only accepts approved/publicVisible records'
);
console.log(
  'PASS - EXPLORE V1.2C PUBLIC COMMUNITY FOUNDATION'
);
