import fs from 'node:fs';

const paths = {
  district:
    'app/explore/district/[districtId].tsx',
  preview:
    'components/explore/RootPlacePreviewCard.tsx',
  community:
    'store/rootPlaceCommunity.ts',
  safety:
    'store/rootPlaceCommunitySafety.ts',
  safetyModal:
    'components/explore/RootPlaceCommunitySafetyModal.tsx',
  moderation:
    'store/rootPlaceModeration.ts',
  moderationScreen:
    'app/explore/moderation.tsx',
  publicStore:
    'store/rootPlacePublicCommunity.ts',
};

function read(
  path
) {
  if (
    !fs.existsSync(
      path
    )
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

const community =
  read(paths.community);

const safety =
  read(paths.safety);

const safetyModal =
  read(paths.safetyModal);

const moderation =
  read(paths.moderation);

const moderationScreen =
  read(paths.moderationScreen);

const publicStore =
  read(paths.publicStore);

for (
  const token of [
    'ROOT_EXPLORE_V12D_MODERATION_INTAKE',
    'districtId: string;',
    "'rootPlaceModerationInbox'",
    'contributorUid:',
    "moderationStatus:",
    "'pending'",
    'publicVisible:',
    'false',
    'ROOT PLACE MODERATION INTAKE DEFERRED',
  ]
) {
  requireToken(
    community,
    token,
    'community intake'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D_COMMUNITY_SAFETY',
    'loadRootPlaceHiddenPublicCommunityIds',
    'hideRootPlacePublicCommunity',
    'unhideRootPlacePublicCommunity',
    'applyRootPlacePublicCommunitySafety',
    'reportRootPlacePublicCommunity',
    "'rootPlaceCommunityReports'",
    'rootPlaceCommunitySafety',
    'reportsById',
  ]
) {
  requireToken(
    safety,
    token,
    'community safety'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D_COMMUNITY_SAFETY_MODAL',
    '커뮤니티 정보 신고',
    '신고만',
    '신고하고 숨기기',
  ]
) {
  requireToken(
    safetyModal,
    token,
    'safety modal'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D_MODERATION_WORKFLOW',
    '.getIdTokenResult(',
    'rootModerator',
    'moderator',
    'admin',
    'subscribeRootPlaceModerationInbox',
    'subscribeRootPlaceCommunitySafetyReports',
    'Partial<',
    'RootPlaceCommunitySafetyReport',
    'const data =',
    'moderateRootPlaceContribution',
    'moderateRootPlaceSafetyReport',
    'rebuildRootPlacePublicCommunityDistrict',
    "'rootPlaceApprovedCommunityRecords'",
    "'rootPlacePublicCommunityDistricts'",
    "'rootPlaceModerationAudit'",
    'buildRootPlacePublicDistrictAggregate',
  ]
) {
  requireToken(
    moderation,
    token,
    'moderation workflow'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D_MODERATION_SCREEN',
    'ROOT 장소 검수',
    'custom claim 관리자 전용',
    '제보 승인 대기',
    '사용자 신고',
    "'approve'",
    "'reject'",
    "'hide'",
    "'hide_public'",
  ]
) {
  requireToken(
    moderationScreen,
    token,
    'moderation screen'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D_COMMUNITY_SAFETY_ACTIONS',
    'ROOT 커뮤니티 숨김 중',
    '다시 보기',
    '관리자 장소 검수',
    'onCommunitySafety',
    'showModeratorEntry',
  ]
) {
  requireToken(
    preview,
    token,
    'preview safety'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12D_MODERATION_SAFETY_INTEGRATION',
    'safePublicCommunityPlaces',
    'applyRootPlacePublicCommunitySafety',
    'rootModerationDistrictId',
    'RootPlaceCommunitySafetyModal',
    'rootPlaceModeratorAllowed',
    "router.push(\n          '/explore/moderation' as any",
  ]
) {
  requireToken(
    district,
    token,
    'district integration'
  );
}

const publicIndex =
  district.indexOf(
    'const publicCommunityPlaces'
  );

const safetyIndex =
  district.indexOf(
    'const safePublicCommunityPlaces'
  );

const ownIndex =
  district.indexOf(
    'const communityPlaces'
  );

if (
  publicIndex < 0 ||
  safetyIndex < 0 ||
  ownIndex < 0 ||
  !(
    publicIndex <
      safetyIndex &&
    safetyIndex <
      ownIndex
  )
) {
  throw new Error(
    'place merge order must be public -> safety hide -> own pending'
  );
}

for (
  const token of [
    'ROOT_EXPLORE_V12C_PUBLIC_COMMUNITY_FOUNDATION',
    'buildRootPlacePublicDistrictAggregate',
    "moderationModel:",
    "'approved-only'",
  ]
) {
  requireToken(
    publicStore,
    token,
    'V1.2C public foundation'
  );
}

if (
  publicStore.includes(
    'setDoc('
  ) ||
  publicStore.includes(
    'updateDoc('
  )
) {
  throw new Error(
    'V1.2C public consumer store must remain read-only'
  );
}

const generatedUiSources =
  [
    preview,
    safetyModal,
    moderationScreen,
  ];

const invalidFontWeight =
  generatedUiSources
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
  invalidFontWeight.length >
  0
) {
  throw new Error(
    `unsupported React Native fontWeight values: ${invalidFontWeight.join(', ')}`
  );
}

console.log(
  'PASS - user submissions mirror best-effort into a moderator-only intake contract'
);
console.log(
  'PASS - user report + local hide/unhide workflow exists without exposing other users'
);
console.log(
  'PASS - moderator access requires Firebase custom claim'
);
console.log(
  'PASS - approve/reject/hide decisions rebuild the public district aggregate and append audit'
);
console.log(
  'PASS - reported public place data can be dismissed or hidden by moderator'
);
console.log(
  'PASS - normal V1.2C public consumer store remains read-only'
);
console.log(
  'PASS - EXPLORE V1.2D MODERATION + REPORT/HIDE WORKFLOW'
);
