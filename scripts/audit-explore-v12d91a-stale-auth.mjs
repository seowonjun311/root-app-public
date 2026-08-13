// ROOT_EXPLORE_V12D91A_STALE_AUTH_AUDIT
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const roots = [
  'app',
  'components',
  'store',
  'hooks',
  'contexts',
  'services',
  'utils',
  'lib',
  'providers',
].filter((item) =>
  fs.existsSync(path.join(ROOT, item))
);

const extensions =
  new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
  ]);

const walk = (directory) => {
  const output = [];

  for (
    const entry of
    fs.readdirSync(
      directory,
      { withFileTypes: true },
    )
  ) {
    const full =
      path.join(
        directory,
        entry.name,
      );

    if (entry.isDirectory()) {
      output.push(...walk(full));
      continue;
    }

    if (
      entry.isFile() &&
      extensions.has(
        path.extname(entry.name).toLowerCase(),
      )
    ) {
      output.push(full);
    }
  }

  return output;
};

const files =
  roots.flatMap((root) =>
    walk(path.join(ROOT, root))
  );

const normalizePath = (file) =>
  file.replace(/\\/g, '/');

const lineOf = (source, offset) =>
  source.slice(0, offset).split('\n').length;

const authPatterns = [
  /auth\(\)\s*\.\s*currentUser/g,
  /firebaseAuth\s*\.\s*currentUser/g,
  /getAuth\([\s\S]{0,120}?\)\s*\.\s*currentUser/g,
  /getRootPlaceCommunityAuth\(\)\s*\.\s*currentUser/g,
];

const cloudSignals = [
  "'users'",
  '"users"',
  '`users`',
  'firestore',
  'Firestore',
  'Storage',
  'storage',
  'cloud',
  'Cloud',
  'server',
  'Server',
  'sync',
  'Sync',
  'upload',
  'download',
];

const explicitlyReviewedFiles = new Set([
  // Authentication/control boundary.
  'app/login.tsx',

  // D9.1 guest nickname path is explicitly local-only.
  // The remaining member-only /users collection nickname query is
  // intentionally tracked by the separate D9.1 -> D9.2 blocker audit.
  'app/onboarding.tsx',

  // Central ROOT cloud-session boundary.
  'store/rootCloudSession.ts',

  // Authenticated self verification / diagnostics.
  'store/rootUserPublicProfileSync.ts',

  // Moderator/admin-only control paths.
  'store/rootPlaceModeration.ts',
  'store/rootPlaceCommunitySafety.ts',

  // Media token/REST helpers remain explicitly authenticated, while the
  // public backup entry gate itself is hardened by D9.1A.
  'store/mediaBackup.ts',

  // This file contains the only raw Firebase Auth read that is allowed to
  // construct account identity; guest precedence is verified structurally.
  'store/characterAccountScope.ts',

  // D9.1 saved-cafe runtime already derives its owner scope from
  // getRootCloudUidOrNull() before reaching the D9 authenticated self guards.
  'store/savedCafeFolders.ts',
  'store/savedCafeLocal.ts',
  'store/savedCafeRecommendationFeedback.ts',
  'store/savedCafeRecommendationPreferences.ts',
  'store/savedCafeVisits.ts',

  // V10 reviewed auth-control UI. Exact raw-auth count and control markers
  // are enforced below so this does not become a blanket future exemption.
  'app/(tabs)/settings.tsx',

  // V51 diagnostic intentionally observes real Firebase Auth state while the
  // five actual saved-cafe sync stores remain guest-aware through D9.1.
  // Exact raw-auth count and diagnostic markers are enforced below.
  'store/savedCafeDiagnostics.ts',
]);

const countRawAuthCurrentUser =
  (
    source,
  ) => {
    const patterns = [
      /auth\(\)\s*\.\s*currentUser/g,
      /firebaseAuth\s*\.\s*currentUser/g,
      /getAuth\([\s\S]{0,120}?\)\s*\.\s*currentUser/g,
      /getRootPlaceCommunityAuth\(\)\s*\.\s*currentUser/g,
    ];

    return patterns.reduce(
      (
        total,
        pattern,
      ) =>
        total +
        [
          ...source.matchAll(
            new RegExp(
              pattern.source,
              'g',
            ),
          ),
        ].length,
      0,
    );
  };

const reviewedExplicitAuthContracts = [
  {
    file:
      'app/(tabs)/settings.tsx',
    expectedRawCount:
      2,
    requiredAny:
      [
        'signOut',
        'logout',
        'deleteAccount',
      ],
    reason:
      'settings authentication/account-control surface',
  },
  {
    file:
      'store/savedCafeDiagnostics.ts',
    expectedRawCount:
      2,
    requiredAll:
      [
        'SAVED_CAFE_V51_INTEGRATION_DIAGNOSTICS',
        'runSavedCafeIntegrationDiagnostics',
      ],
    reason:
      'saved-cafe diagnostic deliberately observes real Firebase Auth state',
  },
];

const hardenedContracts = [
  [
    'store/characterAccountScope.ts',
    [
      'ROOT_EXPLORE_V12D91A_CHARACTER_GUEST_PRECEDENCE',
      'getAuthenticatedCharacterAccountScopeSnapshot',
      'CHARACTER_AUTHENTICATED_SCOPE_UID_MISMATCH',
    ],
  ],
  [
    'app/login.tsx',
    [
      'getAuthenticatedCharacterAccountScopeSnapshot',
      'ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_HANDOFF_SCOPE',
      'CHARACTER_V98D_GUEST_TO_GOOGLE_CHARACTER_HANDOFF',
      'guestCharacterScopeBeforeGoogleLogin',
    ],
  ],
  [
    'app/(tabs)/index.tsx',
    [
      'ROOT_EXPLORE_V12D91A_HOME_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveHomeFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/rootMemory.ts',
    [
      'ROOT_EXPLORE_V12D91A_ROOT_MEMORY_GUEST_CLOUD_BOUNDARY',
      'getRootEffectiveCloudUser',
    ],
  ],
  [
    'store/dailyCloud.ts',
    [
      'ROOT_EXPLORE_V12D91A_DAILY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveDailyFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/explorationCloud.ts',
    [
      'ROOT_EXPLORE_V12D91A_EXPLORATION_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveExplorationFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/mediaBackup.ts',
    [
      'ROOT_EXPLORE_V12D91A_MEDIA_BACKUP_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveMediaBackupFirebaseUser',
      'getRootCloudUidOrNull',
      'MEDIA_BACKUP_LOGIN_REQUIRED',
      'MEDIA_BACKUP_UID_MISMATCH',
    ],
  ],
  [
    'store/rootPlaceCommunity.ts',
    [
      'ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_GUEST_CLOUD_BOUNDARY',
      'ROOT_EXPLORE_V12D91A_PLACE_COMMUNITY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectivePlaceCommunityFirebaseUser',
      'getRootCloudUidOrNull',
      'ROOT_EXPLORE_V12D8_ROOT_PLACE_COMMUNITY_SELF_ONLY_GUARD',
      'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
      'assertOwnRootPlaceCommunityUid',
    ],
  ],
  [
    'app/add-action-goal.tsx',
    [
      'ROOT_EXPLORE_V12D91A_ACTION_GOAL_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveActionGoalFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'app/add-result-goal.tsx',
    [
      'ROOT_EXPLORE_V12D91A_RESULT_GOAL_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveResultGoalFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/characterGrowthPointReward.ts',
    [
      'ROOT_EXPLORE_V12D91A_CHARACTER_GROWTH_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveCharacterGrowthFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
  [
    'store/savedCafeIntegrityRepair.ts',
    [
      'ROOT_EXPLORE_V12D91A_SAVED_CAFE_INTEGRITY_EFFECTIVE_FIREBASE_USER_BOUNDARY',
      'getRootEffectiveSavedCafeIntegrityFirebaseUser',
      'getRootCloudUidOrNull',
    ],
  ],
];

const missingContracts = [];


for (const contract of reviewedExplicitAuthContracts) {
  if (
    !fs.existsSync(
      contract.file,
    )
  ) {
    missingContracts.push(
      `${contract.file}: reviewed auth-control/diagnostic file missing`,
    );
    continue;
  }

  const source =
    fs.readFileSync(
      contract.file,
      'utf8',
    );

  const rawCount =
    countRawAuthCurrentUser(
      source,
    );

  if (
    rawCount !==
      contract.expectedRawCount
  ) {
    missingContracts.push(
      `${contract.file}: reviewed explicit-auth count changed; expected ${contract.expectedRawCount}, found ${rawCount}`,
    );
  }

  if (
    Array.isArray(
      contract.requiredAll,
    )
  ) {
    for (const token of contract.requiredAll) {
      if (!source.includes(token)) {
        missingContracts.push(
          `${contract.file}: reviewed explicit-auth contract missing ${token}`,
        );
      }
    }
  }

  if (
    Array.isArray(
      contract.requiredAny,
    ) &&
    !contract.requiredAny.some(
      (
        token,
      ) =>
        source.includes(
          token,
        ),
    )
  ) {
    missingContracts.push(
      `${contract.file}: reviewed explicit-auth control markers missing`,
    );
  }
}

for (
  const [
    file,
    tokens,
  ] of hardenedContracts
) {
  if (!fs.existsSync(file)) {
    missingContracts.push(
      `${file}: file missing`,
    );
    continue;
  }

  const source =
    fs.readFileSync(
      file,
      'utf8',
    );

  for (const token of tokens) {
    if (!source.includes(token)) {
      missingContracts.push(
        `${file}: missing ${token}`,
      );
    }
  }
}

const rootMemory =
  fs.readFileSync(
    'store/rootMemory.ts',
    'utf8',
  );

const rootMemoryHelperStart =
  rootMemory.indexOf(
    'function getRootEffectiveCloudUser',
  );

if (
  rootMemoryHelperStart <
    0
) {
  missingContracts.push(
    'store/rootMemory.ts: effective cloud-user helper missing',
  );
}
else {
  const helperOpen =
    rootMemory.indexOf(
      '{',
      rootMemoryHelperStart,
    );

  let helperEnd =
    -1;

  if (
    helperOpen >=
      0
  ) {
    let depth = 0;

    for (
      let index =
        helperOpen;
      index <
        rootMemory.length;
      index +=
        1
    ) {
      const ch =
        rootMemory[index];

      if (ch === '{') {
        depth += 1;
      }
      else if (ch === '}') {
        depth -= 1;

        if (depth === 0) {
          helperEnd =
            index +
            1;
          break;
        }
      }
    }
  }

  if (
    helperEnd <
      0
  ) {
    missingContracts.push(
      'store/rootMemory.ts: effective cloud-user helper boundary unresolved',
    );
  }
  else {
    const helperText =
      rootMemory.slice(
        rootMemoryHelperStart,
        helperEnd,
      );

    const outsideText =
      rootMemory.slice(
        0,
        rootMemoryHelperStart,
      ) +
      rootMemory.slice(
        helperEnd,
      );

    const rawPattern =
      /(?:firebaseAuth\s*\.\s*currentUser|auth\(\)\s*\.\s*currentUser)/g;

    const helperRaw =
      [
        ...helperText.matchAll(
          rawPattern,
        ),
      ].length;

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
      missingContracts.push(
        `store/rootMemory.ts: effective cloud-user boundary invalid; helperRaw=${helperRaw}, outsideRaw=${outsideRaw}`,
      );
    }
  }
}

const exploration =
  fs.readFileSync(
    'store/explorationCloud.ts',
    'utf8',
  );

const explorationHelperStart =
  exploration.indexOf(
    'function getRootEffectiveExplorationFirebaseUser',
  );

if (
  explorationHelperStart <
    0
) {
  missingContracts.push(
    'store/explorationCloud.ts: effective Exploration Firebase-user helper missing',
  );
}
else {
  const helperOpen =
    exploration.indexOf(
      '{',
      explorationHelperStart,
    );

  let helperEnd =
    -1;

  if (
    helperOpen >=
      0
  ) {
    let depth = 0;

    for (
      let index =
        helperOpen;
      index <
        exploration.length;
      index +=
        1
    ) {
      const ch =
        exploration[index];

      if (
        ch ===
        '{'
      ) {
        depth +=
          1;
      }
      else if (
        ch ===
        '}'
      ) {
        depth -=
          1;

        if (
          depth ===
            0
        ) {
          helperEnd =
            index +
            1;

          break;
        }
      }
    }
  }

  if (
    helperEnd <
      0
  ) {
    missingContracts.push(
      'store/explorationCloud.ts: effective Exploration Firebase-user helper boundary unresolved',
    );
  }
  else {
    const helperText =
      exploration.slice(
        explorationHelperStart,
        helperEnd,
      );

    const outsideText =
      exploration.slice(
        0,
        explorationHelperStart,
      ) +
      exploration.slice(
        helperEnd,
      );

    const rawPattern =
      /(?:auth\(\)\s*\.currentUser|firebaseAuth\s*\.currentUser)/g;

    const helperRaw =
      [
        ...helperText.matchAll(
          rawPattern,
        ),
      ].length;

    const outsideRaw =
      [
        ...outsideText.matchAll(
          rawPattern,
        ),
      ].length;

    if (
      helperRaw !==
        1
    ) {
      missingContracts.push(
        `store/explorationCloud.ts: effective Exploration helper must contain exactly one raw Firebase currentUser; found ${helperRaw}`,
      );
    }

    if (
      outsideRaw !==
        0
    ) {
      missingContracts.push(
        `store/explorationCloud.ts: raw Firebase currentUser outside effective Exploration helper must be 0; found ${outsideRaw}`,
      );
    }
  }
}

const homeIndex =
  fs.readFileSync(
    'app/(tabs)/index.tsx',
    'utf8',
  );

const homeHelperStart =
  homeIndex.indexOf(
    'function getRootEffectiveHomeFirebaseUser',
  );

if (
  homeHelperStart <
    0
) {
  missingContracts.push(
    'app/(tabs)/index.tsx: effective Home Firebase-user helper missing',
  );
}
else {
  const helperOpen =
    homeIndex.indexOf(
      '{',
      homeHelperStart,
    );

  let helperEnd =
    -1;

  if (
    helperOpen >=
      0
  ) {
    let depth = 0;

    for (
      let index =
        helperOpen;
      index <
        homeIndex.length;
      index +=
        1
    ) {
      const ch =
        homeIndex[index];

      if (
        ch ===
        '{'
      ) {
        depth +=
          1;
      }
      else if (
        ch ===
        '}'
      ) {
        depth -=
          1;

        if (
          depth ===
            0
        ) {
          helperEnd =
            index +
            1;

          break;
        }
      }
    }
  }

  if (
    helperEnd <
      0
  ) {
    missingContracts.push(
      'app/(tabs)/index.tsx: effective Home Firebase-user helper boundary unresolved',
    );
  }
  else {
    const helperText =
      homeIndex.slice(
        homeHelperStart,
        helperEnd,
      );

    const outsideText =
      homeIndex.slice(
        0,
        homeHelperStart,
      ) +
      homeIndex.slice(
        helperEnd,
      );

    const helperRaw =
      (
        helperText.match(
          /firebaseAuth\s*\.currentUser/g,
        ) ?? []
      ).length +
      (
        helperText.match(
          /auth\(\)\s*\.currentUser/g,
        ) ?? []
      ).length;

    const outsideRaw =
      (
        outsideText.match(
          /firebaseAuth\s*\.currentUser/g,
        ) ?? []
      ).length +
      (
        outsideText.match(
          /auth\(\)\s*\.currentUser/g,
        ) ?? []
      ).length;

    if (
      helperRaw !==
        1
    ) {
      missingContracts.push(
        `app/(tabs)/index.tsx: effective Home helper must contain exactly one raw Firebase currentUser; found ${helperRaw}`,
      );
    }

    if (
      outsideRaw !==
        0
    ) {
      missingContracts.push(
        `app/(tabs)/index.tsx: raw Firebase currentUser outside effective Home helper must be 0; found ${outsideRaw}`,
      );
    }
  }
}


const mediaBackup =
  fs.readFileSync(
    'store/mediaBackup.ts',
    'utf8',
  );

const mediaHelperStart =
  mediaBackup.indexOf(
    'function getRootEffectiveMediaBackupFirebaseUser',
  );

if (
  mediaHelperStart <
    0
) {
  missingContracts.push(
    'store/mediaBackup.ts: effective Media Backup Firebase-user helper missing',
  );
}
else {
  const helperOpen =
    mediaBackup.indexOf(
      '{',
      mediaHelperStart,
    );

  let helperEnd =
    -1;

  if (
    helperOpen >=
      0
  ) {
    let depth = 0;

    for (
      let index =
        helperOpen;
      index <
        mediaBackup.length;
      index +=
        1
    ) {
      const ch =
        mediaBackup[index];

      if (
        ch ===
        '{'
      ) {
        depth +=
          1;
      }
      else if (
        ch ===
        '}'
      ) {
        depth -=
          1;

        if (
          depth ===
            0
        ) {
          helperEnd =
            index +
            1;

          break;
        }
      }
    }
  }

  if (
    helperEnd <
      0
  ) {
    missingContracts.push(
      'store/mediaBackup.ts: effective Media Backup Firebase-user helper boundary unresolved',
    );
  }
  else {
    const helperText =
      mediaBackup.slice(
        mediaHelperStart,
        helperEnd,
      );

    const outsideText =
      mediaBackup.slice(
        0,
        mediaHelperStart,
      ) +
      mediaBackup.slice(
        helperEnd,
      );

    const rawPattern =
      /(?:auth\(\)\s*\.\s*currentUser|firebaseAuth\s*\.\s*currentUser)/g;

    const helperRaw =
      [
        ...helperText.matchAll(
          rawPattern,
        ),
      ].length;

    const outsideRaw =
      [
        ...outsideText.matchAll(
          rawPattern,
        ),
      ].length;

    if (
      helperRaw !==
        1
    ) {
      missingContracts.push(
        `store/mediaBackup.ts: effective Media Backup helper must contain exactly one raw Firebase currentUser; found ${helperRaw}`,
      );
    }

    if (
      outsideRaw !==
        0
    ) {
      missingContracts.push(
        `store/mediaBackup.ts: raw Firebase currentUser outside effective Media Backup helper must be 0; found ${outsideRaw}`,
      );
    }
  }
}

const placeCommunity =
  fs.readFileSync(
    'store/rootPlaceCommunity.ts',
    'utf8',
  );

if (
  /getRootPlaceCommunityAuth\(\)\s*\.\s*currentUser/.test(
    placeCommunity,
  )
) {
  missingContracts.push(
    'store/rootPlaceCommunity.ts: self-only identity still derives from raw Firebase currentUser',
  );
}

if (
  !placeCommunity.includes(
    'ROOT_PLACE_COMMUNITY_SELF_ONLY_UID_REQUIRED',
  ) ||
  !placeCommunity.includes(
    'assertOwnRootPlaceCommunityUid',
  )
) {
  missingContracts.push(
    'store/rootPlaceCommunity.ts: V1.2D8 self-only assertion regressed',
  );
}

const findings = [];

for (const full of files) {
  const file =
    normalizePath(
      path.relative(ROOT, full),
    );

  const source =
    fs.readFileSync(full, 'utf8');

  const hasCloudSignal =
    cloudSignals.some((token) =>
      source.includes(token)
    );

  if (!hasCloudSignal) {
    continue;
  }

  for (const regex of authPatterns) {
    for (
      const match of
      source.matchAll(
        new RegExp(
          regex.source,
          'g',
        ),
      )
    ) {
      const context =
        source.slice(
          Math.max(0, match.index - 800),
          Math.min(
            source.length,
            match.index + 1200,
          ),
        );

      const explicitlyBounded =
        context.includes(
          'getRootCloudUidOrNull',
        ) ||
        context.includes(
          'getRootEffectiveCloudUser',
        ) ||
        context.includes(
          'ROOT_EXPLORE_V12D91A_CHARACTER_GUEST_PRECEDENCE',
        ) ||
        context.includes(
          'ROOT_EXPLORE_V12D91A_EXPLICIT_AUTHENTICATED_CHARACTER_SCOPE',
        ) ||
        context.includes(
          'ROOT_EXPLORE_V12D91A_V10_GENERIC_EFFECTIVE_USER_CENTRALIZER',
        ) ||
        context.includes(
          'getRootEffectiveDailyFirebaseUser',
        ) ||
        context.includes(
          'getRootEffectiveActionGoalFirebaseUser',
        ) ||
        context.includes(
          'getRootEffectiveResultGoalFirebaseUser',
        ) ||
        context.includes(
          'getRootEffectiveCharacterGrowthFirebaseUser',
        ) ||
        context.includes(
          'getRootEffectiveSavedCafeIntegrityFirebaseUser',
        ) ||
        context.includes(
          'getRootEffectivePlaceCommunityFirebaseUser',
        );

      const reviewed =
        explicitlyReviewedFiles.has(file);

      findings.push({
        file,
        line:
          lineOf(
            source,
            match.index,
          ),
        token:
          match[0]
            .replace(/\s+/g, ' ')
            .trim(),
        status:
          explicitlyBounded
            ? 'BOUNDARY_INTERNAL'
            : reviewed
            ? 'REVIEWED_EXPLICIT_AUTH'
            : 'UNREVIEWED_STALE_AUTH_RISK',
      });
    }
  }
}

const risks =
  findings.filter(
    (item) =>
      item.status ===
      'UNREVIEWED_STALE_AUTH_RISK',
  );

const report = [
  '# ROOT Explore V1.2D9.1A — stale Firebase Auth guest-scope audit',
  '',
  '> ROOT local guest state must take precedence over a stale Firebase Auth user for ordinary account-scoped data and cloud synchronization.',
  '',
  '## Summary',
  '',
  `- Runtime source files scanned: ${files.length}`,
  `- Auth-currentUser cloud-context occurrences: ${findings.length}`,
  `- Missing hardened contracts: ${missingContracts.length}`,
  `- Unreviewed stale-auth risks: ${risks.length}`,
  '',
  '## Hardened surfaces',
  '',
  '- Character account scope',
  '- Google guest-to-user character handoff + exact characterAccountScope import provenance',
  '- Home exploration main badge',
  '- rootMemory cloud/member-dependent operations',
  '- Daily cloud sync',
  '- Exploration cloud sync and journals',
  '- Media backup entry gate',
  '- Action-goal and result-goal cloud ownership',
  '- Character growth ROOT-point reward ownership',
  '- Saved-cafe integrity repair ownership',
  '- Place community private self assertion and remaining account identity',
  '- Settings explicit auth-control reads reviewed with exact-count gate',
  '- Saved-cafe diagnostic auth reads reviewed with exact-count gate',
  '- Saved cafe five-store boundary from V1.2D9.1 remains active',
  '',
  '## Auth-currentUser occurrences',
  '',
];

for (const item of findings) {
  report.push(
    `- \`${item.file}:${item.line}\` — **${item.status}** — \`${item.token}\``,
  );
}

if (missingContracts.length > 0) {
  report.push(
    '',
    '## Missing contracts',
    '',
  );

  for (const item of missingContracts) {
    report.push(`- ${item}`);
  }
}

report.push(
  '',
  '## Decision',
  '',
);

if (
  missingContracts.length === 0 &&
  risks.length === 0
) {
  report.push(
    '- **PASS:** all required guest-scope cloud boundaries are installed.',
    '- **PASS:** no unreviewed Firebase-auth-derived cloud identity remains in the runtime scan.',
    '- Explicit Firebase Auth use that remains is limited to reviewed authentication/control/token/self-verification contexts.',
    '- V1.2D9.2 nickname registry migration remains the next blocker before V1.2D10.',
  );
} else {
  report.push(
    '- **BLOCKED:** stale-auth integration is incomplete.',
    '- V1.2D9.2 and V1.2D10 must not proceed.',
  );
}

report.push('');

fs.writeFileSync(
  'docs/explore-v12d91a-stale-auth-audit.md',
  report.join('\n'),
  'utf8',
);

console.log(
  `PASS - runtime files scanned: ${files.length}`,
);
console.log(
  `INFO - auth-currentUser cloud-context occurrences: ${findings.length}`,
);
console.log(
  `INFO - missing hardened contracts: ${missingContracts.length}`,
);
console.log(
  `INFO - unreviewed stale-auth risks: ${risks.length}`,
);

for (const item of risks) {
  console.log(
    `BLOCK - ${item.file}:${item.line} ${item.token}`,
  );
}

if (
  missingContracts.length > 0 ||
  risks.length > 0
) {
  throw new Error(
    `V1.2D9.1A stale-auth audit blocked: missingContracts=${missingContracts.length}, risks=${risks.length}`,
  );
}

console.log(
  'PASS - ZERO UNREVIEWED STALE FIREBASE AUTH CLOUD-IDENTITY RISKS',
);
