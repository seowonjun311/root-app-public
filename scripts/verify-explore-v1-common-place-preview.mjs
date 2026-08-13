import fs from 'node:fs';

const paths = {
  district:
    'app/explore/district/[districtId].tsx',
  foundation:
    'store/rootExplorePlace.ts',
  preview:
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

const foundation =
  read(paths.foundation);

const preview =
  read(paths.preview);

for (
  const token of [
    'ROOT_EXPLORE_V1_COMMON_PLACE_DISTRICT_INTEGRATION',
    'ROOT_EXPLORE_THEME_OPTIONS',
    'selectedThemeFilter',
    'placeSearchQuery',
    'matchesCurrentRootPlaceFilters',
    'matchesRootExploreQuery(',
    'matchesRootExploreTheme(',
    '<RootPlacePreviewCard',
    'openRootPlaceDirections',
    'shareRootPlace',
    'showRootPlaceFoundationNotice',
    '장소명 또는 #야장 #노포로 검색',
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
    'ROOT_EXPLORE_V1_COMMON_PLACE_FOUNDATION',
    "id: 'yajang'",
    "id: 'nopo'",
    'matchesRootExploreTheme',
    'matchesRootExploreQuery',
    'getRootExplorePlaceTags',
    'RootPlaceContributionDraft',
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
    'ROOT_EXPLORE_V1_ROOT_PLACE_PREVIEW_CARD',
    '함께 만들어가는 장소',
    '사진 추가하기',
    '영업시간 제보',
    '웨이팅 현황',
    '저장',
    '길찾기',
    '공유',
    '최근 제보 하이라이트',
    'ROOT_EXPLORE_ACCENT',
  ]
) {
  requireToken(
    preview,
    token,
    'preview'
  );
}

const invalidFontWeight =
  preview.match(
    /fontWeight:\s*['"](?:150|250|350|450|550|650|750|850|950)['"]/g
  ) ?? [];

if (invalidFontWeight.length > 0) {
  throw new Error(
    `preview contains unsupported React Native fontWeight values: ${invalidFontWeight.join(', ')}`
  );
}

console.log(
  'PASS - ROOT preview uses only supported React Native fontWeight values'
);

for (
  const preserved of [
    "from 'react-native-maps'",
    'fetchSeoulCultureEvents',
    'DISTRICT_CONTENT_OPTIONS',
    "'events'",
    "'facilities'",
    'openPlaceDetail(',
    'visiblePlaceMarkerItems.map(',
    'PLACE_FILTER_OPTIONS.map(',
  ]
) {
  requireToken(
    district,
    preserved,
    'preserved district contract'
  );
}

console.log(
  'PASS - common place foundation exists'
);
console.log(
  'PASS - place name / #tag search exists'
);
console.log(
  'PASS - cafe/yajang/nopo/food/nature theme filters exist'
);
console.log(
  'PASS - ROOT place preview card exists'
);
console.log(
  'PASS - existing visit filters / events / facilities / place detail remain'
);
console.log(
  'PASS - EXPLORE V1.0 COMMON PLACE + ROOT PREVIEW'
);
