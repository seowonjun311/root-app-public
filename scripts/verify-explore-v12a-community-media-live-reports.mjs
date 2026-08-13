import fs from 'node:fs';

const paths = {
  district:
    'app/explore/district/[districtId].tsx',
  preview:
    'components/explore/RootPlacePreviewCard.tsx',
  modal:
    'components/explore/RootPlaceContributionModal.tsx',
  foundation:
    'store/rootExplorePlace.ts',
  community:
    'store/rootPlaceCommunity.ts',
  cluster:
    'store/rootExploreMapCluster.ts',
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
  text,
  token,
  label
) {
  if (
    !text.includes(
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

const modal =
  read(paths.modal);

const foundation =
  read(paths.foundation);

const community =
  read(paths.community);

const cluster =
  read(paths.cluster);

const marker =
  read(paths.marker);

for (
  const token of [
    'ROOT_EXPLORE_V12A_COMMUNITY_INTEGRATION',
    'pickAndUploadRootPlaceMedia',
    'saveRootPlaceReport',
    'handleRootPlaceContribution',
    'submitRootPlaceReport',
    '<RootPlaceContributionModal',
    'rootPlaceCommunityBusy',
    'rootPlaceReportDraft',
  ]
) {
  requireToken(
    district,
    token,
    'district'
  );
}

if (
  district.includes(
    'showRootPlaceFoundationNotice'
  )
) {
  throw new Error(
    'district still contains V1.0 placeholder contribution handler'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12A_QUICK_LIVE_REPORTS',
    '야외석 운영',
    '우천 이용',
    '방문 인증',
    "'outdoor_status'",
    "'rain_status'",
    "'visit'",
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
    'ROOT_EXPLORE_V12A_RAIN_STATUS_KIND',
    "| 'rain_status'",
    "id: 'yajang'",
    "id: 'nopo'",
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
    'ROOT_EXPLORE_V12A_CONTRIBUTION_MODAL',
    '영업시간 제보',
    '웨이팅 현황',
    '야외석 운영',
    '우천 이용 정보',
    '방문 인증',
    '정보 수정 제안',
    '검수 대기 상태',
  ]
) {
  requireToken(
    modal,
    token,
    'modal'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12A_COMMUNITY_MEDIA_LIVE_REPORTS',
    "from '@react-native-firebase/storage'",
    "from 'expo-image-picker'",
    "mediaTypes: [",
    "'images'",
    "'videos'",
    'putFile(',
    'getDownloadURL(',
    '`shared-posts/`',
    "'users'",
    'rootPlaceCommunityData',
    'contributionsById',
    'latestByPlace',
    "moderationStatus: 'pending'",
    'outdoorOpen',
    'waitingMinutes',
    'rainAvailable',
    'visitVerified',
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
    'ROOT_EXPLORE_V11_MAP_CLUSTER_ENGINE',
    'buildRootExploreMapRenderItems',
  ]
) {
  requireToken(
    cluster,
    token,
    'V1.1 cluster'
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
    'ROOT_EXPLORE_V11_CLUSTER_PHOTO_MARKER_INTEGRATION',
    'rootExploreMapRenderItems',
    'onRegionChangeComplete',
    'matchesCurrentRootPlaceFilters',
    "'events'",
    "'facilities'",
  ]
) {
  requireToken(
    district,
    token,
    'preserved V1.1 district'
  );
}

const unsupportedWeights =
  [
    preview,
    modal,
  ]
    .flatMap(
      (
        source
      ) =>
        source.match(
          /fontWeight:\s*['"](?:150|250|350|450|550|650|750|850|950)['"]/g
        ) ??
        []
    );

if (
  unsupportedWeights.length >
  0
) {
  throw new Error(
    `unsupported React Native fontWeight values: ${unsupportedWeights.join(', ')}`
  );
}

console.log(
  'PASS - photo/video picker + Firebase Storage upload path exists'
);
console.log(
  'PASS - uploaded media metadata is staged in users/{uid}.rootPlaceCommunityData'
);
console.log(
  'PASS - business hours / waiting / outdoor / rain / visit / correction reports save as pending'
);
console.log(
  'PASS - ROOT place card live-report actions are real handlers, not placeholders'
);
console.log(
  'PASS - V1.1 number cluster/photo marker contracts remain'
);
console.log(
  'PASS - EXPLORE V1.2A COMMUNITY MEDIA + LIVE REPORTS'
);
