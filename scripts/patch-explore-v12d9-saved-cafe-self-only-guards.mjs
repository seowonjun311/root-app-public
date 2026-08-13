// ROOT_EXPLORE_V12D9_V2_SAVED_CAFE_PRE_READ_SELF_GUARDS
import fs from 'node:fs';

const targets = [
  ['store/savedCafeFolders.ts', 'SAVED_CAFE_FOLDER_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeLocal.ts', 'SAVED_CAFE_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeRecommendationFeedback.ts', 'SAVED_CAFE_RECOMMENDATION_FEEDBACK_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeRecommendationPreferences.ts', 'SAVED_CAFE_RECOMMENDATION_PREFERENCES_SELF_ONLY_UID_REQUIRED'],
  ['store/savedCafeVisits.ts', 'SAVED_CAFE_VISIT_SELF_ONLY_UID_REQUIRED'],
];

const normalize = (value) =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

for (const [file, errorCode] of targets) {
  if (!fs.existsSync(file)) {
    throw new Error(`missing ${file}`);
  }

  let source = normalize(fs.readFileSync(file, 'utf8'));

  if (source.includes('ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD')) {
    throw new Error(`V1.2D9 guard already exists in ${file}`);
  }

  const regex = /  const expectedUid =\s*\n\s*scope\.uid;/g;
  const matches = [...source.matchAll(regex)];

  if (matches.length !== 1) {
    throw new Error(
      `${file}: expected exactly one "const expectedUid = scope.uid" anchor, found ${matches.length}`,
    );
  }

  const anchor = matches[0][0];

  const replacement = `${anchor}

  // ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD
  const activeUidBeforePrivateUserRead =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  if (
    !activeUidBeforePrivateUserRead ||
    String(
      activeUidBeforePrivateUserRead,
    ) !==
      String(
        expectedUid,
      )
  ) {
    throw new Error(
      '${errorCode}',
    );
  }`;

  source = source.replace(anchor, replacement);

  const guardIndex = source.indexOf(
    'ROOT_EXPLORE_V12D9_SAVED_CAFE_SELF_ONLY_PRE_READ_GUARD',
  );
  const usersIndex = source.indexOf("'users'", guardIndex);
  const getDocIndex = source.indexOf('getDoc(', guardIndex);

  if (
    guardIndex < 0 ||
    usersIndex < 0 ||
    getDocIndex < 0 ||
    guardIndex > usersIndex ||
    guardIndex > getDocIndex
  ) {
    throw new Error(
      `${file}: pre-read guard is not before the private users read`,
    );
  }

  fs.writeFileSync(
    file,
    source.endsWith('\n') ? source : source + '\n',
    'utf8',
  );

  console.log(`PASS - ${file} pre-read authenticated self uid guard installed`);
}

console.log('PASS - all 5 saved-cafe stores hardened before private user read');
