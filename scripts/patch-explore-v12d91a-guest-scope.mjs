// ROOT_EXPLORE_V12D91A_GUEST_SCOPE_INTEGRATION_PATCHER
import fs from 'node:fs';

const read = (file) =>
  fs.readFileSync(file, 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

const write = (file, source) =>
  fs.writeFileSync(
    file,
    source.endsWith('\n')
      ? source
      : source + '\n',
    'utf8',
  );

const count = (source, token) =>
  source.split(token).length - 1;

const findFunction = (source, token) => {
  const start = source.indexOf(token);
  if (start < 0) {
    throw new Error(`Function anchor not found: ${token}`);
  }

  const brace = source.indexOf('{', start);
  if (brace < 0) {
    throw new Error(`Function opening brace not found: ${token}`);
  }

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = brace; index < source.length; index += 1) {
    const ch = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote !== null) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === quote) {
        quote = null;
      }

      continue;
    }

    if (ch === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;

      if (depth === 0) {
        return {
          start,
          end: index + 1,
          text: source.slice(start, index + 1),
        };
      }
    }
  }

  throw new Error(`Function closing brace not found: ${token}`);
};

const replaceFunction = (source, token, transform) => {
  const slice = findFunction(source, token);
  const next = transform(slice.text);

  if (next === slice.text) {
    throw new Error(`Function transform made no change: ${token}`);
  }

  return (
    source.slice(0, slice.start) +
    next +
    source.slice(slice.end)
  );
};

const addImport = (source, statement) => {
  if (source.includes(statement)) {
    return source;
  }

  const importRegex =
    /import[\s\S]*?from\s+['"][^'"]+['"];\s*/g;

  let lastImportEnd = 0;

  for (const match of source.matchAll(importRegex)) {
    lastImportEnd =
      Math.max(
        lastImportEnd,
        match.index + match[0].length,
      );
  }

  if (lastImportEnd === 0) {
    throw new Error(
      `No import block found for ${statement}`,
    );
  }

  return (
    source.slice(0, lastImportEnd) +
    statement +
    '\n' +
    source.slice(lastImportEnd)
  );
};

const removeUnusedNamespacedAuthImport = (source) => {
  if (
    !source.includes('auth()') &&
    !source.includes('auth.')
  ) {
    return source.replace(
      /import\s+auth\s+from\s+['"]@react-native-firebase\/auth['"];\s*/g,
      '',
    );
  }

  return source;
};


// ROOT_EXPLORE_V12D91A_V10_GENERIC_EFFECTIVE_USER_CENTRALIZER
const centralizeModuleFirebaseCurrentUser = ({
  file,
  rootCloudImport,
  marker,
  helperName,
  label,
}) => {
  let source =
    read(file);

  if (
    source.includes(
      marker,
    )
  ) {
    throw new Error(
      `${label} D9.1A V10 marker already exists.`,
    );
  }

  source =
    addImport(
      source,
      rootCloudImport,
    );

  const patterns = [
    {
      key:
        'firebaseAuth',
      regex:
        /firebaseAuth\s*\.\s*currentUser/g,
      expression:
        'firebaseAuth.currentUser',
    },
    {
      key:
        'namespacedAuth',
      regex:
        /auth\(\)\s*\.\s*currentUser/g,
      expression:
        'auth().currentUser',
    },
    {
      key:
        'modularGetAuth',
      regex:
        /getAuth\(\s*getApp\(\)\s*,?\s*\)\s*\.\s*currentUser/g,
      expression:
        'getAuth(getApp()).currentUser',
    },
  ];

  const counts =
    patterns.map(
      (
        item,
      ) => ({
        ...item,
        count:
          [
            ...source.matchAll(
              new RegExp(
                item.regex.source,
                'g',
              ),
            ),
          ].length,
      }),
    );

  const rawAuthCount =
    counts.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.count,
      0,
    );

  if (
    rawAuthCount <
      1
  ) {
    throw new Error(
      `${label} has no direct Firebase currentUser usage to centralize.`,
    );
  }

  const authSource =
    counts.find(
      (
        item,
      ) =>
        item.count >
        0,
    );

  if (!authSource) {
    throw new Error(
      `${label} auth source could not be selected.`,
    );
  }

  for (const item of patterns) {
    source =
      source.replace(
        new RegExp(
          item.regex.source,
          'g',
        ),
        `${helperName}()`,
      );
  }

  const importMatches =
    [
      ...source.matchAll(
        /import[\s\S]*?from\s+['"][^'"]+['"];\s*/g,
      ),
    ];

  if (
    importMatches.length ===
      0
  ) {
    throw new Error(
      `${label} import block not found for effective-user helper insertion.`,
    );
  }

  const lastImport =
    importMatches[
      importMatches.length -
      1
    ];

  const insertAt =
    lastImport.index +
    lastImport[0].length;

  const helper =
`\n// ${marker}\nfunction ${helperName}() {\n  const cloudUid =\n    getRootCloudUidOrNull();\n\n  if (!cloudUid) {\n    return null;\n  }\n\n  const firebaseUser =\n    ${authSource.expression};\n\n  if (\n    !firebaseUser?.uid ||\n    firebaseUser.uid !==\n      cloudUid\n  ) {\n    return null;\n  }\n\n  return firebaseUser;\n}\n\n`;

  source =
    source.slice(
      0,
      insertAt,
    ) +
    helper +
    source.slice(
      insertAt,
    );

  const helperSlice =
    findFunction(
      source,
      `function ${helperName}`,
    );

  const rawPattern =
    /(?:firebaseAuth\s*\.\s*currentUser|auth\(\)\s*\.\s*currentUser|getAuth\(\s*getApp\(\)\s*,?\s*\)\s*\.\s*currentUser)/g;

  const helperRaw =
    [
      ...helperSlice.text.matchAll(
        rawPattern,
      ),
    ].length;

  const outsideHelper =
    source.slice(
      0,
      helperSlice.start,
    ) +
    source.slice(
      helperSlice.end,
    );

  const outsideRaw =
    [
      ...outsideHelper.matchAll(
        rawPattern,
      ),
    ].length;

  if (
    helperRaw !==
      1 ||
    outsideRaw !==
      0
  ) {
    throw new Error(
      `${label} effective-user boundary invalid: helperRaw=${helperRaw}, outsideRaw=${outsideRaw}.`,
    );
  }

  write(
    file,
    source,
  );

  console.log(
    `PASS - ${label} centralized ${rawAuthCount} direct Firebase currentUser occurrence(s) behind one ROOT guest-aware effective-user helper`,
  );
};

// --------------------------------------------------
// 1. Character account scope: ROOT guest state wins.
// --------------------------------------------------
{
  const file = 'store/characterAccountScope.ts';
  let source = read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91A_CHARACTER_GUEST_PRECEDENCE',
    )
  ) {
    throw new Error('Character D9.1A marker already exists.');
  }

  const newFunction = `// CHARACTER_V98A_ACCOUNT_SCOPE_IDENTITY
// ROOT_EXPLORE_V12D91A_CHARACTER_GUEST_PRECEDENCE
export function getCharacterAccountScopeSnapshot():
  CharacterAccountScopeSnapshot {
  const rootData =
    getRootOnboardingData();

  const rootIsGuest =
    rootData?.loginType ===
      'guest' ||
    rootData?.isGuest ===
      true;

  if (rootIsGuest) {
    const guestId =
      normalizeIdentityPart(
        rootData?.guestId
      ) ??
      'legacy_guest';

    const scopeId =
      'guest_' +
      guestId;

    return {
      kind:
        'guest',
      scopeId,
      storagePrefix:
        STORAGE_NAMESPACE +
        ':' +
        scopeId,
      cloudUid:
        null,
      guestId,
    };
  }

  const firebaseUid =
    normalizeIdentityPart(
      auth()
        .currentUser
        ?.uid
    );

  if (
    firebaseUid !==
    null
  ) {
    const scopeId =
      'uid_' +
      firebaseUid;

    return {
      kind:
        'user',
      scopeId,
      storagePrefix:
        STORAGE_NAMESPACE +
        ':' +
        scopeId,
      cloudUid:
        firebaseUid,
      guestId:
        null,
    };
  }

  const guestId =
    normalizeIdentityPart(
      rootData?.guestId
    ) ??
    'legacy_guest';

  const scopeId =
    'guest_' +
    guestId;

  return {
    kind:
      'guest',
    scopeId,
    storagePrefix:
      STORAGE_NAMESPACE +
      ':' +
      scopeId,
    cloudUid:
      null,
    guestId,
  };
}

// ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_CHARACTER_SCOPE
export function getAuthenticatedCharacterAccountScopeSnapshot(
  expectedUid?:
    string |
    null
): CharacterAccountScopeSnapshot {
  const activeUid =
    normalizeIdentityPart(
      auth()
        .currentUser
        ?.uid
    );

  const requestedUid =
    normalizeIdentityPart(
      expectedUid
    );

  const uid =
    requestedUid ??
    activeUid;

  if (
    uid ===
      null ||
    activeUid ===
      null ||
    uid !==
      activeUid
  ) {
    throw new Error(
      'CHARACTER_AUTHENTICATED_SCOPE_UID_MISMATCH'
    );
  }

  const scopeId =
    'uid_' +
    uid;

  return {
    kind:
      'user',
    scopeId,
    storagePrefix:
      STORAGE_NAMESPACE +
      ':' +
      scopeId,
    cloudUid:
      uid,
    guestId:
      null,
  };
}`;

  source =
    replaceFunction(
      source,
      'export function getCharacterAccountScopeSnapshot',
      () => newFunction,
    );

  write(file, source);
  console.log(
    'PASS - character scope now gives ROOT guest state precedence over stale Firebase Auth',
  );
}

// --------------------------------------------------
// 2. Login: preserve guest -> Google handoff.
// --------------------------------------------------
{
  const file = 'app/login.tsx';
  let source = read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_HANDOFF_SCOPE',
    )
  ) {
    throw new Error(
      'Login D9.1A explicit authenticated handoff marker already exists.',
    );
  }

  /*
   * V10 reached TypeScript after every runtime/audit/verifier gate passed,
   * but its import-merging regex was too broad:
   *
   *   import {([\s\S]*?)} from '../store/characterAccountScope'
   *
   * could start at an earlier named import and span across multiple import
   * declarations. The later `replace(/\}\s*from/, ...)` then inserted
   * getAuthenticatedCharacterAccountScopeSnapshot into the FIRST import
   * (observed: @react-native-firebase/app) instead of characterAccountScope.
   *
   * V11 does not merge braces at all. It adds one dedicated import statement,
   * then proves the symbol is imported only from characterAccountScope.
   */
  const characterScopeModuleRegex =
    /from\s*['"]\.\.\/store\/characterAccountScope['"]\s*;/g;

  const characterScopeModuleMatches =
    [
      ...source.matchAll(
        characterScopeModuleRegex,
      ),
    ];

  if (
    characterScopeModuleMatches.length !==
      1
  ) {
    throw new Error(
      `Login characterAccountScope module import expected exactly 1 before V11 dedicated import, found ${characterScopeModuleMatches.length}.`,
    );
  }

  const authenticatedScopeImport =
    `import {
  getAuthenticatedCharacterAccountScopeSnapshot,
} from '../store/characterAccountScope';`;

  source =
    addImport(
      source,
      authenticatedScopeImport,
    );

  const correctImportRegex =
    /import\s*\{\s*getAuthenticatedCharacterAccountScopeSnapshot\s*,?\s*\}\s*from\s*['"]\.\.\/store\/characterAccountScope['"]\s*;/m;

  if (
    !correctImportRegex.test(
      source,
    )
  ) {
    throw new Error(
      'Login authenticated character scope dedicated import was not installed from characterAccountScope.',
    );
  }

  const wrongFirebaseAppImportRegex =
    /import\s*\{[^}]*\bgetAuthenticatedCharacterAccountScopeSnapshot\b[^}]*\}\s*from\s*['"]@react-native-firebase\/app['"]\s*;/m;

  if (
    wrongFirebaseAppImportRegex.test(
      source,
    )
  ) {
    throw new Error(
      'Login authenticated character scope symbol was incorrectly inserted into @react-native-firebase/app.',
    );
  }

  /*
   * V1/V2/V3 all proved the same important thing:
   * trying to rediscover the later ROOT-session-save shape is brittle and
   * unnecessary for guest -> Google character migration.
   *
   * The migration already has one stable V98D handoff site immediately after
   * Firebase authentication.  We only need to make THAT scope explicit.
   *
   * Normal character scope remains guest-aware.  Once ROOT local state is
   * committed as Google and the destination screen refreshes/mounts, the
   * ordinary scope resolver naturally becomes the authenticated user scope.
   */
  const handoffRegex =
    /const authenticatedCharacterScope\s*=\s*refreshCharacterAccountScope\(\);/g;

  const handoffMatches =
    [
      ...source.matchAll(
        handoffRegex,
      ),
    ];

  if (
    handoffMatches.length !==
    1
  ) {
    throw new Error(
      `Expected exactly one V98D authenticated character handoff scope, found ${handoffMatches.length}.`,
    );
  }

  source =
    source.replace(
      handoffRegex,
`// ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_HANDOFF_SCOPE
          const authenticatedCharacterScope =
            getAuthenticatedCharacterAccountScopeSnapshot(
              user.uid
            );`,
    );

  if (
    !source.includes(
      'CHARACTER_V98D_GUEST_TO_GOOGLE_CHARACTER_HANDOFF',
    ) ||
    !source.includes(
      'guestCharacterScopeBeforeGoogleLogin',
    )
  ) {
    throw new Error(
      'Existing V98D guest-to-Google migration contract is missing.',
    );
  }

  /*
   * Final provenance gate before writing login.tsx.
   * This specifically prevents a repeat of the V10 TS2614 failure.
   */
  const authenticatedScopeImportOccurrences =
    [
      ...source.matchAll(
        /\bgetAuthenticatedCharacterAccountScopeSnapshot\b/g,
      ),
    ].length;

  if (
    authenticatedScopeImportOccurrences <
      2
  ) {
    throw new Error(
      `Login authenticated scope symbol expected in import + handoff usage, found ${authenticatedScopeImportOccurrences}.`,
    );
  }

  write(
    file,
    source,
  );

  console.log(
    'PASS - guest-to-Google character migration uses explicit authenticated scope with import provenance locked to characterAccountScope',
  );
}


// --------------------------------------------------
// 3. Home: central ROOT guest-aware Firebase user.
// --------------------------------------------------
{
  const file = 'app/(tabs)/index.tsx';
  let source = read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91A_HOME_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    )
  ) {
    throw new Error(
      'Home D9.1A effective-user marker already exists.',
    );
  }

  source =
    addImport(
      source,
      `import {
  getRootCloudUidOrNull,
} from '../../store/rootCloudSession';`,
    );

  /*
   * V4/V5 proved that trying to parse individual Home callbacks is brittle:
   * the current Home file has deeply nested callbacks and multiline auth
   * declarations.  V6 removes that dependency entirely.
   *
   * We centralize every direct Home Firebase current-user lookup behind ONE
   * helper.  The helper preserves the real Firebase User object for member
   * functionality, but returns null whenever ROOT local state says guest.
   */
  const firebaseRawCount =
    count(
      source,
      'firebaseAuth.currentUser',
    );

  const namespacedRawCount =
    count(
      source,
      'auth().currentUser',
    );

  const rawAuthCount =
    firebaseRawCount +
    namespacedRawCount;

  if (
    rawAuthCount <
      1
  ) {
    throw new Error(
      'Home has no direct Firebase currentUser usage to centralize.',
    );
  }

  const authExpression =
    firebaseRawCount >
      0
      ? 'firebaseAuth.currentUser'
      : 'auth().currentUser';

  source =
    source
      .split(
        'firebaseAuth.currentUser',
      )
      .join(
        'getRootEffectiveHomeFirebaseUser()',
      )
      .split(
        'auth().currentUser',
      )
      .join(
        'getRootEffectiveHomeFirebaseUser()',
      );

  const importMatches =
    [
      ...source.matchAll(
        /import[\s\S]*?from\s+['"][^'"]+['"];\s*/g,
      ),
    ];

  if (
    importMatches.length ===
      0
  ) {
    throw new Error(
      'Home import block not found for effective-user helper insertion.',
    );
  }

  const lastImport =
    importMatches[
      importMatches.length -
      1
    ];

  const helperInsertAt =
    lastImport.index +
    lastImport[0].length;

  const helper =
`
// ROOT_EXPLORE_V12D91A_HOME_EFFECTIVE_FIREBASE_USER_BOUNDARY
function getRootEffectiveHomeFirebaseUser() {
  const cloudUid =
    getRootCloudUidOrNull();

  if (!cloudUid) {
    return null;
  }

  const firebaseUser =
    ${authExpression};

  if (
    !firebaseUser?.uid ||
    firebaseUser.uid !==
      cloudUid
  ) {
    return null;
  }

  return firebaseUser;
}

`;

  source =
    source.slice(
      0,
      helperInsertAt,
    ) +
    helper +
    source.slice(
      helperInsertAt,
    );

  const remainingFirebaseRaw =
    count(
      source,
      'firebaseAuth.currentUser',
    );

  const remainingNamespacedRaw =
    count(
      source,
      'auth().currentUser',
    );

  const remainingRaw =
    remainingFirebaseRaw +
    remainingNamespacedRaw;

  if (
    remainingRaw !==
      1
  ) {
    throw new Error(
      `Home direct Firebase currentUser count after centralization must be exactly 1 inside helper, found ${remainingRaw}.`,
    );
  }

  const helperSlice =
    findFunction(
      source,
      'function getRootEffectiveHomeFirebaseUser',
    );

  const helperRaw =
    count(
      helperSlice.text,
      'firebaseAuth.currentUser',
    ) +
    count(
      helperSlice.text,
      'auth().currentUser',
    );

  if (
    helperRaw !==
      1
  ) {
    throw new Error(
      `Home effective-user helper must contain exactly one raw Firebase currentUser, found ${helperRaw}.`,
    );
  }

  const outsideHelper =
    source.slice(
      0,
      helperSlice.start,
    ) +
    source.slice(
      helperSlice.end,
    );

  const outsideRaw =
    count(
      outsideHelper,
      'firebaseAuth.currentUser',
    ) +
    count(
      outsideHelper,
      'auth().currentUser',
    );

  if (
    outsideRaw !==
      0
  ) {
    throw new Error(
      `Home still has ${outsideRaw} raw Firebase currentUser occurrence(s) outside the guest-aware helper.`,
    );
  }

  if (
    source.includes(
      'HOME EXPLORATION MAIN BADGE SERVER SKIPPED: NO USER'
    )
  ) {
    source =
      source.replace(
        'HOME EXPLORATION MAIN BADGE SERVER SKIPPED: NO USER',
        'HOME EXPLORATION MAIN BADGE SERVER SKIPPED: ROOT GUEST OR NO CLOUD USER',
      );
  }

  console.log(
    'INFO - Home direct auth-currentUser centralization',
    {
      before:
        rawAuthCount,
      firebaseAuthBefore:
        firebaseRawCount,
      namespacedAuthBefore:
        namespacedRawCount,
      after:
        remainingRaw,
      outsideHelper:
        outsideRaw,
    }
  );

  write(
    file,
    source,
  );

  console.log(
    `PASS - Home centralized ${rawAuthCount} direct Firebase currentUser occurrence(s) behind one ROOT guest-aware effective-user helper`,
  );
}


// --------------------------------------------------
// 4. rootMemory: central effective cloud user.
// --------------------------------------------------
{
  const file = 'store/rootMemory.ts';
  let source = read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91A_ROOT_MEMORY_GUEST_CLOUD_BOUNDARY',
    )
  ) {
    throw new Error(
      'rootMemory D9.1A marker already exists.',
    );
  }

  const patterns = [
    {
      regex:
        /firebaseAuth\s*\.\s*currentUser/g,
      expression:
        'firebaseAuth.currentUser',
    },
    {
      regex:
        /auth\(\)\s*\.\s*currentUser/g,
      expression:
        'auth().currentUser',
    },
  ];

  const counts =
    patterns.map(
      (
        item,
      ) => ({
        ...item,
        count:
          [
            ...source.matchAll(
              new RegExp(
                item.regex.source,
                'g',
              ),
            ),
          ].length,
      }),
    );

  const rawBefore =
    counts.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.count,
      0,
    );

  if (
    rawBefore <
      1
  ) {
    throw new Error(
      'rootMemory has no direct Firebase currentUser usage to harden.',
    );
  }

  const authSource =
    counts.find(
      (
        item,
      ) =>
        item.count >
        0,
    );

  if (!authSource) {
    throw new Error(
      'rootMemory auth source could not be selected.',
    );
  }

  for (const item of patterns) {
    source =
      source.replace(
        new RegExp(
          item.regex.source,
          'g',
        ),
        'getRootEffectiveCloudUser()',
      );
  }

  const helperAnchor =
    'function getCurrentBadgeOwnerId';

  const helperIndex =
    source.indexOf(
      helperAnchor,
    );

  if (
    helperIndex <
      0
  ) {
    throw new Error(
      'rootMemory badge owner helper anchor not found.',
    );
  }

  const helper =
`// ROOT_EXPLORE_V12D91A_ROOT_MEMORY_GUEST_CLOUD_BOUNDARY\nfunction getRootEffectiveCloudUser() {\n  const rootIsGuest =\n    onboardingData?.loginType ===\n      'guest' ||\n    onboardingData?.isGuest ===\n      true;\n\n  if (rootIsGuest) {\n    return null;\n  }\n\n  return ${authSource.expression};\n}\n\n`;

  source =
    source.slice(
      0,
      helperIndex,
    ) +
    helper +
    source.slice(
      helperIndex,
    );

  const helperSlice =
    findFunction(
      source,
      'function getRootEffectiveCloudUser',
    );

  const rawPattern =
    /(?:firebaseAuth\s*\.\s*currentUser|auth\(\)\s*\.\s*currentUser)/g;

  const helperRaw =
    [
      ...helperSlice.text.matchAll(
        rawPattern,
      ),
    ].length;

  const outsideText =
    source.slice(
      0,
      helperSlice.start,
    ) +
    source.slice(
      helperSlice.end,
    );

  const outsideRaw =
    [
      ...outsideText.matchAll(
        rawPattern,
      ),
    ].length;

  if (
    helperRaw !==
      1 ||
    outsideRaw !==
      0
  ) {
    throw new Error(
      `rootMemory effective-user boundary invalid: helperRaw=${helperRaw}, outsideRaw=${outsideRaw}.`,
    );
  }

  write(
    file,
    source,
  );

  console.log(
    `PASS - rootMemory centralized ${rawBefore} direct auth-currentUser usage(s) behind ROOT guest cloud boundary`,
  );
}

// --------------------------------------------------
// 5. Daily cloud: central ROOT guest-aware Firebase user.
// --------------------------------------------------
{
  centralizeModuleFirebaseCurrentUser({
    file:
      'store/dailyCloud.ts',
    rootCloudImport:
      `import {
  getRootCloudUidOrNull,
} from './rootCloudSession';`,
    marker:
      'ROOT_EXPLORE_V12D91A_DAILY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    helperName:
      'getRootEffectiveDailyFirebaseUser',
    label:
      'Daily cloud',
  });
}

// --------------------------------------------------
// 6. Exploration: central ROOT guest-aware Firebase user.
// --------------------------------------------------
{
  const file = 'store/explorationCloud.ts';
  let source = read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91A_EXPLORATION_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    )
  ) {
    throw new Error(
      'Exploration D9.1A effective-user marker already exists.',
    );
  }

  source =
    addImport(
      source,
      `import {
  getRootCloudUidOrNull,
} from './rootCloudSession';`,
    );

  /*
   * V6 proved Home centralization is robust, while the old Exploration patch
   * still used callback-body parsing and failed at persistLocalExplorationData.
   *
   * V7 applies the same safer policy to the ENTIRE explorationCloud module:
   * every direct Firebase current-user lookup is routed through one helper.
   *
   * The helper returns null for ROOT guest sessions and returns the Firebase
   * User only when its uid matches the ROOT effective cloud uid.
   */
  const namespacedPattern =
    /auth\(\)\s*\.currentUser/g;

  const modularPattern =
    /firebaseAuth\s*\.currentUser/g;

  const namespacedRawCount =
    [
      ...source.matchAll(
        namespacedPattern,
      ),
    ].length;

  const modularRawCount =
    [
      ...source.matchAll(
        modularPattern,
      ),
    ].length;

  const rawAuthCount =
    namespacedRawCount +
    modularRawCount;

  if (
    rawAuthCount <
      1
  ) {
    throw new Error(
      'Exploration has no direct Firebase currentUser usage to centralize.',
    );
  }

  const authExpression =
    modularRawCount >
      0
      ? 'firebaseAuth.currentUser'
      : 'auth().currentUser';

  source =
    source
      .replace(
        modularPattern,
        'getRootEffectiveExplorationFirebaseUser()',
      )
      .replace(
        namespacedPattern,
        'getRootEffectiveExplorationFirebaseUser()',
      );

  const importMatches =
    [
      ...source.matchAll(
        /import[\s\S]*?from\s+['"][^'"]+['"];\s*/g,
      ),
    ];

  if (
    importMatches.length ===
      0
  ) {
    throw new Error(
      'Exploration import block not found for effective-user helper insertion.',
    );
  }

  const lastImport =
    importMatches[
      importMatches.length -
      1
    ];

  const helperInsertAt =
    lastImport.index +
    lastImport[0].length;

  const helper =
`
// ROOT_EXPLORE_V12D91A_EXPLORATION_EFFECTIVE_FIREBASE_USER_BOUNDARY
function getRootEffectiveExplorationFirebaseUser() {
  const cloudUid =
    getRootCloudUidOrNull();

  if (!cloudUid) {
    return null;
  }

  const firebaseUser =
    ${authExpression};

  if (
    !firebaseUser?.uid ||
    firebaseUser.uid !==
      cloudUid
  ) {
    return null;
  }

  return firebaseUser;
}

`;

  source =
    source.slice(
      0,
      helperInsertAt,
    ) +
    helper +
    source.slice(
      helperInsertAt,
    );

  source =
    source
      .replace(
        'EXPLORATION SYNC LOCAL ONLY: NO GOOGLE USER',
        'EXPLORATION SYNC LOCAL ONLY: ROOT GUEST OR NO CLOUD USER',
      )
      .replace(
        'SERVER SKIPPED: LOCAL USER',
        'SERVER SKIPPED: ROOT GUEST OR NO CLOUD USER',
      );

  const helperSlice =
    findFunction(
      source,
      'function getRootEffectiveExplorationFirebaseUser',
    );

  const helperRaw =
    [
      ...helperSlice.text.matchAll(
        /(?:auth\(\)\s*\.currentUser|firebaseAuth\s*\.currentUser)/g,
      ),
    ].length;

  const outsideHelper =
    source.slice(
      0,
      helperSlice.start,
    ) +
    source.slice(
      helperSlice.end,
    );

  const outsideRaw =
    [
      ...outsideHelper.matchAll(
        /(?:auth\(\)\s*\.currentUser|firebaseAuth\s*\.currentUser)/g,
      ),
    ].length;

  const finalRaw =
    helperRaw +
    outsideRaw;

  if (
    helperRaw !==
      1
  ) {
    throw new Error(
      `Exploration effective-user helper must contain exactly one raw Firebase currentUser, found ${helperRaw}.`,
    );
  }

  if (
    outsideRaw !==
      0
  ) {
    throw new Error(
      `Exploration still has ${outsideRaw} raw Firebase currentUser occurrence(s) outside the guest-aware helper.`,
    );
  }

  if (
    finalRaw !==
      1
  ) {
    throw new Error(
      `Exploration direct Firebase currentUser count after centralization must be exactly 1 inside helper, found ${finalRaw}.`,
    );
  }

  console.log(
    'INFO - Exploration direct auth-currentUser centralization',
    {
      before:
        rawAuthCount,
      namespacedAuthBefore:
        namespacedRawCount,
      modularAuthBefore:
        modularRawCount,
      after:
        finalRaw,
      outsideHelper:
        outsideRaw,
    }
  );

  write(
    file,
    source,
  );

  console.log(
    `PASS - Exploration centralized ${rawAuthCount} direct Firebase currentUser occurrence(s) behind one ROOT guest-aware effective-user helper`,
  );
}


// --------------------------------------------------
// 7. Media Backup: central ROOT guest-aware Firebase user.
// --------------------------------------------------
{
  const file = 'store/mediaBackup.ts';
  let source = read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91A_MEDIA_BACKUP_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    )
  ) {
    throw new Error(
      'Media Backup D9.1A effective-user marker already exists.',
    );
  }

  source =
    addImport(
      source,
      `import {
  getRootCloudUidOrNull,
} from './rootCloudSession';`,
    );

  /*
   * V8 proved that the current mediaBackup.ts has TWO direct current-user
   * declarations, not the single declaration assumed by the older snapshot.
   *
   * Do not guess which function owns them.  V9 centralizes the ENTIRE module,
   * exactly like the already successful Home and Exploration migrations.
   * Every direct Firebase current-user expression becomes one guest-aware
   * helper call, while the helper keeps the real Firebase User object for
   * authenticated backup behavior.
   */
  const namespacedPattern =
    /auth\(\)\s*\.\s*currentUser/g;

  const modularPattern =
    /firebaseAuth\s*\.\s*currentUser/g;

  const namespacedRawCount =
    [
      ...source.matchAll(
        namespacedPattern,
      ),
    ].length;

  const modularRawCount =
    [
      ...source.matchAll(
        modularPattern,
      ),
    ].length;

  const rawAuthCount =
    namespacedRawCount +
    modularRawCount;

  if (
    rawAuthCount <
      1
  ) {
    throw new Error(
      'Media Backup has no direct Firebase currentUser usage to centralize.',
    );
  }

  const authExpression =
    modularRawCount >
      0
      ? 'firebaseAuth.currentUser'
      : 'auth().currentUser';

  source =
    source
      .replace(
        modularPattern,
        'getRootEffectiveMediaBackupFirebaseUser()',
      )
      .replace(
        namespacedPattern,
        'getRootEffectiveMediaBackupFirebaseUser()',
      );

  const importMatches =
    [
      ...source.matchAll(
        /import[\s\S]*?from\s+['\"][^'\"]+['\"];\s*/g,
      ),
    ];

  if (
    importMatches.length ===
      0
  ) {
    throw new Error(
      'Media Backup import block not found for effective-user helper insertion.',
    );
  }

  const lastImport =
    importMatches[
      importMatches.length -
      1
    ];

  const helperInsertAt =
    lastImport.index +
    lastImport[0].length;

  const helper =
`
// ROOT_EXPLORE_V12D91A_MEDIA_BACKUP_EFFECTIVE_FIREBASE_USER_BOUNDARY
function getRootEffectiveMediaBackupFirebaseUser() {
  const cloudUid =
    getRootCloudUidOrNull();

  if (!cloudUid) {
    return null;
  }

  const firebaseUser =
    ${authExpression};

  if (
    !firebaseUser?.uid ||
    firebaseUser.uid !==
      cloudUid
  ) {
    return null;
  }

  return firebaseUser;
}

`;

  source =
    source.slice(
      0,
      helperInsertAt,
    ) +
    helper +
    source.slice(
      helperInsertAt,
    );

  const helperSlice =
    findFunction(
      source,
      'function getRootEffectiveMediaBackupFirebaseUser',
    );

  const rawPattern =
    /(?:auth\(\)\s*\.\s*currentUser|firebaseAuth\s*\.\s*currentUser)/g;

  const helperRaw =
    [
      ...helperSlice.text.matchAll(
        rawPattern,
      ),
    ].length;

  const outsideHelper =
    source.slice(
      0,
      helperSlice.start,
    ) +
    source.slice(
      helperSlice.end,
    );

  const outsideRaw =
    [
      ...outsideHelper.matchAll(
        rawPattern,
      ),
    ].length;

  const finalRaw =
    helperRaw +
    outsideRaw;

  if (
    helperRaw !==
      1
  ) {
    throw new Error(
      `Media Backup effective-user helper must contain exactly one raw Firebase currentUser, found ${helperRaw}.`,
    );
  }

  if (
    outsideRaw !==
      0
  ) {
    throw new Error(
      `Media Backup still has ${outsideRaw} raw Firebase currentUser occurrence(s) outside the guest-aware helper.`,
    );
  }

  if (
    finalRaw !==
      1
  ) {
    throw new Error(
      `Media Backup direct Firebase currentUser count after centralization must be exactly 1 inside helper, found ${finalRaw}.`,
    );
  }

  console.log(
    'INFO - Media Backup direct auth-currentUser centralization',
    {
      before:
        rawAuthCount,
      namespacedAuthBefore:
        namespacedRawCount,
      modularAuthBefore:
        modularRawCount,
      after:
        finalRaw,
      outsideHelper:
        outsideRaw,
    }
  );

  write(
    file,
    source,
  );

  console.log(
    `PASS - Media Backup centralized ${rawAuthCount} direct Firebase currentUser occurrence(s) behind one ROOT guest-aware effective-user helper`,
  );
}


// --------------------------------------------------
// 8. Action-goal cloud ownership.
// --------------------------------------------------
{
  centralizeModuleFirebaseCurrentUser({
    file:
      'app/add-action-goal.tsx',
    rootCloudImport:
      `import {
  getRootCloudUidOrNull,
} from '../store/rootCloudSession';`,
    marker:
      'ROOT_EXPLORE_V12D91A_ACTION_GOAL_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    helperName:
      'getRootEffectiveActionGoalFirebaseUser',
    label:
      'Action goal',
  });
}

// --------------------------------------------------
// 9. Result-goal cloud ownership.
// --------------------------------------------------
{
  centralizeModuleFirebaseCurrentUser({
    file:
      'app/add-result-goal.tsx',
    rootCloudImport:
      `import {
  getRootCloudUidOrNull,
} from '../store/rootCloudSession';`,
    marker:
      'ROOT_EXPLORE_V12D91A_RESULT_GOAL_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    helperName:
      'getRootEffectiveResultGoalFirebaseUser',
    label:
      'Result goal',
  });
}

// --------------------------------------------------
// 10. Character growth ROOT-point reward ownership.
// --------------------------------------------------
{
  centralizeModuleFirebaseCurrentUser({
    file:
      'store/characterGrowthPointReward.ts',
    rootCloudImport:
      `import {
  getRootCloudUidOrNull,
} from './rootCloudSession';`,
    marker:
      'ROOT_EXPLORE_V12D91A_CHARACTER_GROWTH_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    helperName:
      'getRootEffectiveCharacterGrowthFirebaseUser',
    label:
      'Character growth reward',
  });
}

// --------------------------------------------------
// 11. Saved-cafe integrity repair ownership.
// --------------------------------------------------
{
  centralizeModuleFirebaseCurrentUser({
    file:
      'store/savedCafeIntegrityRepair.ts',
    rootCloudImport:
      `import {
  getRootCloudUidOrNull,
} from './rootCloudSession';`,
    marker:
      'ROOT_EXPLORE_V12D91A_SAVED_CAFE_INTEGRITY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    helperName:
      'getRootEffectiveSavedCafeIntegrityFirebaseUser',
    label:
      'Saved-cafe integrity repair',
  });
}

// --------------------------------------------------
// 12. Place Community: self-only assertion + central effective user.
// --------------------------------------------------
{
  const file =
    'store/rootPlaceCommunity.ts';

  let source =
    read(file);

  if (
    source.includes(
      'ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_GUEST_CLOUD_BOUNDARY',
    ) ||
    source.includes(
      'ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
    )
  ) {
    throw new Error(
      'rootPlaceCommunity D9.1A V10 marker already exists.',
    );
  }

  source =
    addImport(
      source,
      `import {
  getRootCloudUidOrNull,
} from './rootCloudSession';`,
    );

  const authUidRegex =
    /const\s+authUid\s*=\s*getRootPlaceCommunityAuth\(\)\s*\.\s*currentUser\s*\?\.\s*uid\s*\?\?\s*null\s*;/g;

  const authUidMatches =
    [
      ...source.matchAll(
        authUidRegex,
      ),
    ];

  if (
    authUidMatches.length !==
      1
  ) {
    throw new Error(
      `rootPlaceCommunity authUid self-only source expected exactly 1, found ${authUidMatches.length}.`,
    );
  }

  source =
    source.replace(
      authUidRegex,
`// ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_GUEST_CLOUD_BOUNDARY
  const authUid =
    getRootCloudUidOrNull();`,
    );

  if (
    !source.includes(
      'ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD',
    ) ||
    !source.includes(
      'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
    ) ||
    !source.includes(
      'assertOwnRootPlaceCommunityUid',
    )
  ) {
    throw new Error(
      'rootPlaceCommunity V1.2D8 self-only assertion regressed.',
    );
  }

  const rawPatterns = [
    {
      regex:
        /firebaseAuth\s*\.\s*currentUser/g,
      expression:
        'firebaseAuth.currentUser',
    },
    {
      regex:
        /auth\(\)\s*\.\s*currentUser/g,
      expression:
        'auth().currentUser',
    },
    {
      regex:
        /getAuth\(\s*getApp\(\)\s*,?\s*\)\s*\.\s*currentUser/g,
      expression:
        'getAuth(getApp()).currentUser',
    },
  ];

  const counts =
    rawPatterns.map(
      (
        item,
      ) => ({
        ...item,
        count:
          [
            ...source.matchAll(
              new RegExp(
                item.regex.source,
                'g',
              ),
            ),
          ].length,
      }),
    );

  const rawBefore =
    counts.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.count,
      0,
    );

  if (
    rawBefore <
      1
  ) {
    throw new Error(
      'rootPlaceCommunity expected at least one remaining direct Firebase currentUser after self-only authUid migration.',
    );
  }

  const authSource =
    counts.find(
      (
        item,
      ) =>
        item.count >
        0,
    );

  if (!authSource) {
    throw new Error(
      'rootPlaceCommunity remaining auth source could not be selected.',
    );
  }

  for (const item of rawPatterns) {
    source =
      source.replace(
        new RegExp(
          item.regex.source,
          'g',
        ),
        'getRootEffectivePlaceCommunityFirebaseUser()',
      );
  }

  const importMatches =
    [
      ...source.matchAll(
        /import[\s\S]*?from\s+['"][^'"]+['"];\s*/g,
      ),
    ];

  if (
    importMatches.length ===
      0
  ) {
    throw new Error(
      'rootPlaceCommunity import block not found for effective-user helper insertion.',
    );
  }

  const lastImport =
    importMatches[
      importMatches.length -
      1
    ];

  const helperInsertAt =
    lastImport.index +
    lastImport[0].length;

  const helper =
`\n// ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_EFFECTIVE_FIREBASE_USER_BOUNDARY\nfunction getRootEffectivePlaceCommunityFirebaseUser() {\n  const cloudUid =\n    getRootCloudUidOrNull();\n\n  if (!cloudUid) {\n    return null;\n  }\n\n  const firebaseUser =\n    ${authSource.expression};\n\n  if (\n    !firebaseUser?.uid ||\n    firebaseUser.uid !==\n      cloudUid\n  ) {\n    return null;\n  }\n\n  return firebaseUser;\n}\n\n`;

  source =
    source.slice(
      0,
      helperInsertAt,
    ) +
    helper +
    source.slice(
      helperInsertAt,
    );

  const helperSlice =
    findFunction(
      source,
      'function getRootEffectivePlaceCommunityFirebaseUser',
    );

  const rawPattern =
    /(?:firebaseAuth\s*\.\s*currentUser|auth\(\)\s*\.\s*currentUser|getAuth\(\s*getApp\(\)\s*,?\s*\)\s*\.\s*currentUser|getRootPlaceCommunityAuth\(\)\s*\.\s*currentUser)/g;

  const helperRaw =
    [
      ...helperSlice.text.matchAll(
        rawPattern,
      ),
    ].length;

  const outsideText =
    source.slice(
      0,
      helperSlice.start,
    ) +
    source.slice(
      helperSlice.end,
    );

  const outsideRaw =
    [
      ...outsideText.matchAll(
        rawPattern,
      ),
    ].length;

  if (
    helperRaw !==
      1 ||
    outsideRaw !==
      0
  ) {
    throw new Error(
      `rootPlaceCommunity effective-user boundary invalid: helperRaw=${helperRaw}, outsideRaw=${outsideRaw}.`,
    );
  }

  const remainingLegacyAuthHelperCalls =
    [
      ...source.matchAll(
        /getRootPlaceCommunityAuth\(\)/g,
      ),
    ].length;

  if (
    remainingLegacyAuthHelperCalls ===
      0
  ) {
    source =
      source.replace(
        /import\s*\{\s*getAuth\s+as\s+getRootPlaceCommunityAuth\s*,?\s*\}\s*from\s*['"]@react-native-firebase\/auth['"];\s*/g,
        '',
      );
  }

  write(
    file,
    source,
  );

  console.log(
    `PASS - Place Community self-only authUid uses ROOT cloud uid and ${rawBefore} remaining Firebase currentUser occurrence(s) are centralized`,
  );
}


console.log(
  'PASS - ROOT Explore V1.2D9.1A guest scope integration patch complete',
);
