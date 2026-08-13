// ROOT_EXPLORE_V12D91_PATCHER
import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

const write = (file, source) =>
  fs.writeFileSync(
    file,
    source.endsWith('\n') ? source : source + '\n',
    'utf8',
  );

let onboarding = read('app/onboarding.tsx');

if (
  onboarding.includes(
    'ROOT_EXPLORE_V12D91_GUEST_ONBOARDING_LOCAL_ONLY',
  )
) {
  throw new Error(
    'D9.1 onboarding marker already exists',
  );
}

const uidRegex =
  /const currentUser\s*=\s*auth\(\)\.currentUser;\s*const uid\s*=\s*currentUser\?\.uid\s*\?\?\s*previousData\?\.uid\s*\?\?\s*null;/m;

if (!uidRegex.test(onboarding)) {
  throw new Error(
    'onboarding currentUser/uid anchor not found',
  );
}

onboarding = onboarding.replace(
  uidRegex,
`// ROOT_EXPLORE_V12D91_GUEST_ONBOARDING_LOCAL_ONLY
const isGuestSession =
  previousData?.loginType === 'guest' ||
  previousData?.isGuest === true;

const currentUser = auth().currentUser;
const authenticatedUid =
  currentUser?.uid ?? null;

const uid =
  isGuestSession
    ? null
    : (
        authenticatedUid ??
        previousData?.uid ??
        null
      );

if (isGuestSession) {
  console.log(
    'NICKNAME DUPLICATE CHECK SKIPPED GUEST LOCAL ONLY',
    {
      guestId: previousData?.guestId ?? null,
      staleAuthPresent: Boolean(authenticatedUid),
    }
  );
}`,
);

if (
  !onboarding.includes(
    "NICKNAME DUPLICATE CHECK SKIPPED GUEST LOCAL ONLY",
  )
) {
  throw new Error(
    'guest nickname skip marker missing',
  );
}

write('app/onboarding.tsx', onboarding);
console.log(
  'PASS - guest onboarding cloud uid forced null',
);

const saved = [
  'store/savedCafeFolders.ts',
  'store/savedCafeLocal.ts',
  'store/savedCafeRecommendationFeedback.ts',
  'store/savedCafeRecommendationPreferences.ts',
  'store/savedCafeVisits.ts',
];

for (const file of saved) {
  let source = read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91_GUEST_LOCAL_ONLY_SCOPE',
    )
  ) {
    throw new Error(
      `D9.1 marker already exists: ${file}`,
    );
  }

  const importRegex =
    /import\s*\{\s*getAuth,\s*\}\s*from\s*'@react-native-firebase\/auth';/m;

  if (!importRegex.test(source)) {
    throw new Error(
      `${file}: getAuth import anchor missing`,
    );
  }

  source = source.replace(
    importRegex,
    (m) =>
`${m}
import {
  getRootCloudUidOrNull,
} from './rootCloudSession';`,
  );

  const scopeRegex =
    /function getCurrentScope\(\):\s*([A-Za-z_$][\w$]*)\s*\{\s*const uid\s*=\s*getAuth\(\s*getApp\(\),?\s*\)\.currentUser\?\.uid\s*\?\?\s*null;/m;

  const match = source.match(scopeRegex);

  if (!match) {
    throw new Error(
      `${file}: getCurrentScope auth uid anchor missing`,
    );
  }

  source = source.replace(
    scopeRegex,
`function getCurrentScope(): ${match[1]} {
  // ROOT_EXPLORE_V12D91_GUEST_LOCAL_ONLY_SCOPE
  const uid =
    getRootCloudUidOrNull();`,
  );

  if (
    !source.includes(
      'ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD',
    )
  ) {
    throw new Error(
      `${file}: D9 pre-read guard missing`,
    );
  }

  write(file, source);
  console.log(
    `PASS - ${file} guest scope local-only`,
  );
}
