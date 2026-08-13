// ROOT_EXPLORE_V12D8_V2_SELF_ONLY_READ_GUARD_PATCHER

import fs from 'node:fs';

const normalize = (source) =>
  source
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

const write = (
  file,
  source,
) => {
  fs.writeFileSync(
    file,
    source.endsWith('\n')
      ? source
      : source + '\n',
    'utf8',
  );
};

const findMatchingParen = (
  source,
  openIndex,
) => {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (
    let index = openIndex;
    index < source.length;
    index += 1
  ) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (
      char === "'" ||
      char === '"' ||
      char === '`'
    ) {
      quote = char;
      continue;
    }

    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

const splitTopLevelArgs = (
  source,
  start,
  end,
) => {
  const spans = [];
  let argStart = start;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let quote = null;
  let escaped = false;

  for (
    let index = start;
    index < end;
    index += 1
  ) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (
      char === "'" ||
      char === '"' ||
      char === '`'
    ) {
      quote = char;
      continue;
    }

    if (char === '(') {
      paren += 1;
    } else if (char === ')') {
      paren -= 1;
    } else if (char === '[') {
      bracket += 1;
    } else if (char === ']') {
      bracket -= 1;
    } else if (char === '{') {
      brace += 1;
    } else if (char === '}') {
      brace -= 1;
    } else if (
      char === ',' &&
      paren === 0 &&
      bracket === 0 &&
      brace === 0
    ) {
      spans.push({
        start: argStart,
        end: index,
      });

      argStart = index + 1;
    }
  }

  spans.push({
    start: argStart,
    end,
  });

  return spans;
};

const getPrivateUserDocRefs = (
  source,
) => {
  const refs = [];
  const regex = /\bdoc\s*\(/g;

  for (
    const match of source.matchAll(regex)
  ) {
    const openIndex =
      match.index +
      match[0].lastIndexOf('(');

    const closeIndex =
      findMatchingParen(
        source,
        openIndex,
      );

    if (closeIndex < 0) {
      continue;
    }

    const args =
      splitTopLevelArgs(
        source,
        openIndex + 1,
        closeIndex,
      );

    if (args.length < 3) {
      continue;
    }

    const collectionArg =
      source
        .slice(
          args[1].start,
          args[1].end,
        )
        .trim();

    if (
      ![
        "'users'",
        '"users"',
        '`users`',
      ].includes(
        collectionArg,
      )
    ) {
      continue;
    }

    refs.push({
      callStart: match.index,
      callEnd: closeIndex + 1,
      uidStart: args[2].start,
      uidEnd: args[2].end,
      uidExpression:
        source
          .slice(
            args[2].start,
            args[2].end,
          )
          .trim(),
    });
  }

  return refs;
};

const patchLogin = () => {
  const file =
    'app/login.tsx';

  let source =
    normalize(
      fs.readFileSync(
        file,
        'utf8',
      ),
    );

  if (
    source.includes(
      'ROOT_EXPLORE_V12D8_LOGIN_PRIVATE_USER_SELF_ONLY_GUARD',
    )
  ) {
    throw new Error(
      'login V1.2D8 self-only guard already exists.',
    );
  }

  const functionStart =
    source.indexOf(
      'const loadServerData = async (',
    );

  if (functionStart < 0) {
    throw new Error(
      'loadServerData function anchor not found.',
    );
  }

  const arrowOpen =
    source.indexOf(
      ') => {',
      functionStart,
    );

  if (arrowOpen < 0) {
    throw new Error(
      'loadServerData opening brace not found.',
    );
  }

  const insertAt =
    arrowOpen +
    ') => {'.length;

  const guard =
    `

  // ROOT_EXPLORE_V12D8_LOGIN_PRIVATE_USER_SELF_ONLY_GUARD
  const activeAuthUid =
    firebaseAuth.currentUser
      ?.uid ??
    null;

  const requestedPrivateUid =
    String(
      uid ?? '',
    ).trim();

  if (
    !activeAuthUid ||
    !requestedPrivateUid ||
    String(
      activeAuthUid,
    ) !==
      requestedPrivateUid
  ) {
    throw new Error(
      'LOGIN_PRIVATE_USER_SELF_ONLY_UID_REQUIRED',
    );
  }
`;

  source =
    source.slice(
      0,
      insertAt,
    ) +
    guard +
    source.slice(
      insertAt,
    );

  write(
    file,
    source,
  );

  console.log(
    'PASS - loadServerData now enforces Firebase-authenticated self uid before private /users read',
  );
};

const patchRootPlaceCommunity = () => {
  const file =
    'store/rootPlaceCommunity.ts';

  let source =
    normalize(
      fs.readFileSync(
        file,
        'utf8',
      ),
    );

  if (
    source.includes(
      'ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD',
    )
  ) {
    throw new Error(
      'rootPlaceCommunity V1.2D8 self-only guard already exists.',
    );
  }

  const refs =
    getPrivateUserDocRefs(
      source,
    );

  if (refs.length < 1) {
    throw new Error(
      'rootPlaceCommunity contains no direct doc(..., users, uid) reference to harden.',
    );
  }

  const importLine =
    `import {
  getAuth as getRootPlaceCommunityAuth,
} from '@react-native-firebase/auth';

`;

  source =
    importLine +
    source;

  // Recompute refs after prefix insertion so offsets remain valid.
  const shiftedRefs =
    getPrivateUserDocRefs(
      source,
    );

  if (
    shiftedRefs.length !==
    refs.length
  ) {
    throw new Error(
      'rootPlaceCommunity private-user doc reference count changed unexpectedly after auth import insertion.',
    );
  }

  const replacements = [];

  for (
    const ref of
    shiftedRefs
  ) {
    if (
      ref.uidExpression.includes(
        'assertOwnRootPlaceCommunityUid',
      )
    ) {
      continue;
    }

    replacements.push({
      start: ref.uidStart,
      end: ref.uidEnd,
      text:
        ` assertOwnRootPlaceCommunityUid(${ref.uidExpression})`,
    });
  }

  for (
    const replacement of
    replacements.sort(
      (
        left,
        right,
      ) =>
        right.start -
        left.start,
    )
  ) {
    source =
      source.slice(
        0,
        replacement.start,
      ) +
      replacement.text +
      source.slice(
        replacement.end,
      );
  }

  const importRegex =
    /import[\s\S]*?from\s+['"][^'"]+['"]\s*;?/g;

  let lastImportEnd = 0;

  for (
    const match of
    source.matchAll(
      importRegex,
    )
  ) {
    lastImportEnd =
      Math.max(
        lastImportEnd,
        match.index +
          match[0].length,
      );
  }

  if (lastImportEnd === 0) {
    throw new Error(
      'rootPlaceCommunity import block could not be located.',
    );
  }

  const helper =
    `

// ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD
const assertOwnRootPlaceCommunityUid = (
  uid: unknown,
): string => {
  const requestedUid =
    String(
      uid ?? '',
    ).trim();

  const authUid =
    getRootPlaceCommunityAuth()
      .currentUser
      ?.uid ??
    null;

  if (
    !authUid ||
    !requestedUid ||
    String(
      authUid,
    ) !==
      requestedUid
  ) {
    throw new Error(
      'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
    );
  }

  return requestedUid;
};
`;

  source =
    source.slice(
      0,
      lastImportEnd,
    ) +
    helper +
    source.slice(
      lastImportEnd,
    );

  const hardenedRefs =
    getPrivateUserDocRefs(
      source,
    );

  if (
    hardenedRefs.length !==
    refs.length
  ) {
    throw new Error(
      'rootPlaceCommunity private-user ref count changed unexpectedly after hardening.',
    );
  }

  const unguarded =
    hardenedRefs.filter(
      (
        ref,
      ) =>
        !ref.uidExpression.includes(
          'assertOwnRootPlaceCommunityUid',
        ),
    );

  if (unguarded.length > 0) {
    throw new Error(
      `rootPlaceCommunity still has ${unguarded.length} unguarded private-user document reference(s).`,
    );
  }

  write(
    file,
    source,
  );

  console.log(
    `PASS - rootPlaceCommunity hardened ${hardenedRefs.length} private /users document reference(s) with authenticated self-uid assertion`,
  );
};

patchLogin();
patchRootPlaceCommunity();

console.log(
  'PASS - EXPLORE V1.2D8 V2 SELF-ONLY READ GUARD PATCHER',
);
