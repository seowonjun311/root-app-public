// ROOT_PLACE_V1_FOUNDATION_VERIFIER

import fs from 'node:fs';

const requireFile = (
  file,
) => {
  if (
    !fs.existsSync(
      file,
    )
  ) {
    throw new Error(
      `missing ${file}`,
    );
  }

  return fs.readFileSync(
    file,
    'utf8',
  );
};

const domain =
  requireFile(
    'store/rootPlaceDomain.ts',
  );

const repository =
  requireFile(
    'store/rootPlaceRepository.ts',
  );

const contribution =
  requireFile(
    'store/rootPlaceContribution.ts',
  );

const bridge =
  requireFile(
    'store/rootPlaceSavedCafeBridge.ts',
  );

const rules =
  requireFile(
    'firestore.rules',
  );

for (
  const token of
  [
    'ROOT_PLACE_V1_COMMON_DOMAIN',
    'RootPlace',
    'RootPlaceMedia',
    'RootPlaceReport',
    'RootPlaceVisit',
    'tteokbokki',
    'beach',
    'valley',
    'pool_indoor',
    'pool_outdoor',
    'camping',
    'festival',
  ]
) {
  if (
    !domain.includes(
      token,
    )
  ) {
    throw new Error(
      `domain missing ${token}`,
    );
  }
}

for (
  const token of
  [
    'ROOT_PLACE_V1_FIRESTORE_REPOSITORY',
    'readRootPlace',
    'listRootPlaces',
    'listRootPlacesByCategory',
    "'rootPlaces'",
  ]
) {
  if (
    !repository.includes(
      token,
    )
  ) {
    throw new Error(
      `repository missing ${token}`,
    );
  }
}

for (
  const token of
  [
    'ROOT_PLACE_V1_CONTRIBUTION_FOUNDATION',
    'getRootCloudUidOrNull',
    'ROOT PLACE REPORT LOCAL ONLY: GUEST',
    'ROOT PLACE VISIT LOCAL ONLY: GUEST',
    "'rootPlaceReports'",
    "'rootPlaceVisits'",
  ]
) {
  if (
    !contribution.includes(
      token,
    )
  ) {
    throw new Error(
      `contribution missing ${token}`,
    );
  }
}

for (
  const token of
  [
    'ROOT_PLACE_V1_SAVED_CAFE_BRIDGE',
    'SavedCafeLocalEntry',
    'savedCafeEntryToRootPlaceSeed',
    "primaryCategory:\n      'cafe'",
  ]
) {
  if (
    !bridge.includes(
      token,
    )
  ) {
    throw new Error(
      `cafe bridge missing ${token}`,
    );
  }
}

for (
  const token of
  [
    'ROOT_PLACE_V1_FIRESTORE_FOUNDATION',
    'match /rootPlaces/{placeId}',
    'match /rootPlaceMedia/{mediaId}',
    'match /rootPlaceReports/{reportId}',
    'match /rootPlaceVisits/{visitId}',
    'allow create, update, delete: if false;',
    'request.resource.data.authorUid == request.auth.uid',
  ]
) {
  if (
    !rules.includes(
      token,
    )
  ) {
    throw new Error(
      `rules missing ${token}`,
    );
  }
}

for (
  const preserved of
  [
    'match /users/{uid}',
    'rootUserPublicProfiles',
    'rootNicknames',
    'nicknameWriteIsAtomicFor',
    'nicknameDeleteIsAtomicFor',
  ]
) {
  if (
    !rules.includes(
      preserved,
    )
  ) {
    throw new Error(
      `D10 contract missing ${preserved}`,
    );
  }
}

console.log(
  'PASS - ROOT common place schema connected',
);
console.log(
  'PASS - rootPlaces read repository connected',
);
console.log(
  'PASS - guest-aware report/visit contribution foundation connected',
);
console.log(
  'PASS - existing saved cafe shape bridges into RootPlaceSeed without migration',
);
console.log(
  'PASS - media metadata foundation reserved for V1.1 upload connection',
);
console.log(
  'PASS - D10 self-only user/public-profile/nickname contracts preserved',
);
console.log(
  'PASS - ROOT PLACE V1 FOUNDATION',
);
