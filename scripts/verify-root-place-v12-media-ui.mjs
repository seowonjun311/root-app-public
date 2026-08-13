// ROOT_PLACE_V12_MEDIA_UI_VERIFIER

import fs from 'node:fs';

const read = (path) => {
  if (!fs.existsSync(path)) {
    throw new Error(`missing ${path}`);
  }

  return fs.readFileSync(
    path,
    'utf8',
  ).replace(
    /\r\n?/g,
    '\n',
  );
};

const requireTokens = (
  label,
  source,
  tokens,
) => {
  for (const token of tokens) {
    if (!source.includes(token)) {
      throw new Error(
        `${label} missing token: ${token}`,
      );
    }
  }
};

const packageJson =
  JSON.parse(
    read('package.json'),
  );

const district =
  read(
    'app/explore/district/[districtId].tsx',
  );

const preview =
  read(
    'components/explore/RootPlacePreviewCard.tsx',
  );

const modal =
  read(
    'components/explore/RootPlaceMediaModal.tsx',
  );

const media =
  read(
    'store/rootPlaceMedia.ts',
  );

const moderation =
  read(
    'store/rootPlaceModeration.ts',
  );

const moderationScreen =
  read(
    'app/explore/moderation.tsx',
  );

const rules =
  read(
    'firestore.rules',
  );

if (
  packageJson.dependencies?.[
    'expo-video'
  ] !== '~3.0.16'
) {
  throw new Error(
    'expo-video must be pinned to SDK 54 compatible ~3.0.16',
  );
}

requireTokens(
  'district integration',
  district,
  [
    'RootPlaceMediaModal',
    'pickAndUploadRootCanonicalPlaceMedia',
    'loadRootPlaceMediaFeed',
    'canonicalRepresentativeUrl',
  ],
);

if (
  district.includes(
    'pickAndUploadRootPlaceMedia(',
  )
) {
  throw new Error(
    'legacy community media upload is still wired to the district card',
  );
}

requireTokens(
  'preview card',
  preview,
  [
    'onOpenMedia',
    'canonicalMediaCount',
    'canonicalRepresentativeUrl',
  ],
);

requireTokens(
  'media modal',
  modal,
  [
    'ROOT_PLACE_V12_MEDIA_FEED_MODAL',
    'VideoView',
    'surfaceType="textureView"',
    '사진·동영상 추가',
    '게스트 로컬 임시저장',
  ],
);

requireTokens(
  'media store',
  media,
  [
    'loadRootPlaceMediaFeed',
    'createEmptyRootPlaceMediaFeed',
    'deleteOwnRootPlaceMedia',
    'getRootPlaceMediaErrorMessage',
  ],
);

requireTokens(
  'moderation store',
  moderation,
  [
    'subscribeRootPlaceMediaModerationInbox',
    'moderateRootPlaceMedia',
    "targetType:\n        'media'",
  ],
);

requireTokens(
  'moderation screen',
  moderationScreen,
  [
    '미디어 승인 대기',
    'ModerationMediaPreview',
    '공개 승인',
  ],
);

requireTokens(
  'firestore rules',
  rules,
  [
    'ROOT_PLACE_V12_MEDIA_FEED_MODERATION',
    '|| isRootPlaceModerator()',
    "request.resource.data.status in ['visible', 'hidden']",
    ".affectedKeys()",
    "'updatedAt'",
  ],
);

console.log(
  'PASS - ROOT PLACE V1.2 canonical media feed + moderation UI',
);
