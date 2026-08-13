// ROOT_EXPLORE_V12D4_FIRESTORE_EMULATOR_TESTS

import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const PROJECT_ID =
  'demo-root-explore-v12d4';

const rules =
  fs.readFileSync(
    'firestore.rules',
    'utf8'
  );

const env =
  await initializeTestEnvironment({
    projectId:
      PROJECT_ID,
    firestore: {
      rules,
    },
  });

const results = [];

async function run(
  name,
  operation
) {
  await operation();

  results.push(
    name
  );

  console.log(
    `PASS - ${name}`
  );
}

try {
  await env.clearFirestore();

  await env.withSecurityRulesDisabled(
    async (
      context
    ) => {
      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          'users',
          'alice'
        ),
        {
          displayName:
            'Alice',
          rootPlaceCommunityData: {
            version: 1,
            pendingPrivateExample: true,
          },
        }
      );

      await setDoc(
        doc(
          db,
          'users',
          'bob'
        ),
        {
          displayName:
            'Bob',
        }
      );

      await setDoc(
        doc(
          db,
          'rootPlacePublicCommunityDistricts',
          'seoul-jongno'
        ),
        {
          version: 1,
          districtId:
            'seoul-jongno',
        }
      );

      await setDoc(
        doc(
          db,
          'rootPlaceApprovedCommunityRecords',
          'approved-seed'
        ),
        {
          placeId:
            'place-seed',
          moderationStatus:
            'approved',
          publicVisible:
            true,
        }
      );
    }
  );

  const anon =
    env.unauthenticatedContext();

  const alice =
    env.authenticatedContext(
      'alice'
    );

  const bob =
    env.authenticatedContext(
      'bob'
    );

  const rootModerator =
    env.authenticatedContext(
      'root-mod',
      {
        rootModerator:
          true,
      }
    );

  const legacyAdminOnly =
    env.authenticatedContext(
      'legacy-admin',
      {
        admin:
          true,
      }
    );

  const legacyModeratorOnly =
    env.authenticatedContext(
      'legacy-moderator',
      {
        moderator:
          true,
      }
    );

  await run(
    'unauthenticated user cannot read /users/{uid}',
    async () => {
      await assertFails(
        getDoc(
          doc(
            anon.firestore(),
            'users',
            'alice'
          )
        )
      );
    }
  );

  await run(
    'authenticated user can read own /users/{uid}',
    async () => {
      await assertSucceeds(
        getDoc(
          doc(
            alice.firestore(),
            'users',
            'alice'
          )
        )
      );
    }
  );

  await run(
    'KNOWN RISK - authenticated user can currently read another top-level user document',
    async () => {
      await assertSucceeds(
        getDoc(
          doc(
            bob.firestore(),
            'users',
            'alice'
          )
        )
      );
    }
  );

  await run(
    'user can write own /users/{uid}',
    async () => {
      await assertSucceeds(
        setDoc(
          doc(
            alice.firestore(),
            'users',
            'alice'
          ),
          {
            displayName:
              'Alice updated',
          },
          {
            merge: true,
          }
        )
      );
    }
  );

  await run(
    'user cannot write another /users/{uid}',
    async () => {
      await assertFails(
        setDoc(
          doc(
            bob.firestore(),
            'users',
            'alice'
          ),
          {
            compromised:
              true,
          },
          {
            merge: true,
          }
        )
      );
    }
  );

  await run(
    'public aggregate remains readable without authentication',
    async () => {
      await assertSucceeds(
        getDoc(
          doc(
            anon.firestore(),
            'rootPlacePublicCommunityDistricts',
            'seoul-jongno'
          )
        )
      );
    }
  );

  await run(
    'normal user cannot write public aggregate',
    async () => {
      await assertFails(
        setDoc(
          doc(
            alice.firestore(),
            'rootPlacePublicCommunityDistricts',
            'blocked-normal'
          ),
          {
            version: 1,
          }
        )
      );
    }
  );

  await run(
    'rootModerator claim can write public aggregate',
    async () => {
      await assertSucceeds(
        setDoc(
          doc(
            rootModerator.firestore(),
            'rootPlacePublicCommunityDistricts',
            'allowed-root-mod'
          ),
          {
            version: 1,
          }
        )
      );
    }
  );

  await run(
    'legacy admin-only claim cannot write public aggregate',
    async () => {
      await assertFails(
        setDoc(
          doc(
            legacyAdminOnly.firestore(),
            'rootPlacePublicCommunityDistricts',
            'blocked-legacy-admin'
          ),
          {
            version: 1,
          }
        )
      );
    }
  );

  await run(
    'legacy moderator-only claim cannot write public aggregate',
    async () => {
      await assertFails(
        setDoc(
          doc(
            legacyModeratorOnly.firestore(),
            'rootPlacePublicCommunityDistricts',
            'blocked-legacy-moderator'
          ),
          {
            version: 1,
          }
        )
      );
    }
  );

  await run(
    'contributor can create own pending moderation inbox record',
    async () => {
      await assertSucceeds(
        setDoc(
          doc(
            alice.firestore(),
            'rootPlaceModerationInbox',
            'alice-contribution'
          ),
          {
            contributorUid:
              'alice',
            userId:
              'alice',
            moderationStatus:
              'pending',
            publicVisible:
              false,
            placeId:
              'place-a',
          }
        )
      );
    }
  );

  await run(
    'contributor cannot spoof another uid in moderation inbox',
    async () => {
      await assertFails(
        setDoc(
          doc(
            alice.firestore(),
            'rootPlaceModerationInbox',
            'spoofed-contribution'
          ),
          {
            contributorUid:
              'bob',
            userId:
              'bob',
            moderationStatus:
              'pending',
            publicVisible:
              false,
            placeId:
              'place-b',
          }
        )
      );
    }
  );

  await run(
    'normal user cannot read moderation inbox',
    async () => {
      await assertFails(
        getDoc(
          doc(
            alice.firestore(),
            'rootPlaceModerationInbox',
            'alice-contribution'
          )
        )
      );
    }
  );

  await run(
    'rootModerator can read moderation inbox',
    async () => {
      await assertSucceeds(
        getDoc(
          doc(
            rootModerator.firestore(),
            'rootPlaceModerationInbox',
            'alice-contribution'
          )
        )
      );
    }
  );

  await run(
    'legacy admin-only claim cannot read moderation inbox',
    async () => {
      await assertFails(
        getDoc(
          doc(
            legacyAdminOnly.firestore(),
            'rootPlaceModerationInbox',
            'alice-contribution'
          )
        )
      );
    }
  );

  await run(
    'rootModerator can update moderation inbox',
    async () => {
      await assertSucceeds(
        updateDoc(
          doc(
            rootModerator.firestore(),
            'rootPlaceModerationInbox',
            'alice-contribution'
          ),
          {
            moderationStatus:
              'approved',
            publicVisible:
              true,
          }
        )
      );
    }
  );

  await run(
    'normal user cannot read approved moderation records',
    async () => {
      await assertFails(
        getDoc(
          doc(
            alice.firestore(),
            'rootPlaceApprovedCommunityRecords',
            'approved-seed'
          )
        )
      );
    }
  );

  await run(
    'rootModerator can read approved moderation records',
    async () => {
      await assertSucceeds(
        getDoc(
          doc(
            rootModerator.firestore(),
            'rootPlaceApprovedCommunityRecords',
            'approved-seed'
          )
        )
      );
    }
  );

  await run(
    'reporter can create own pending community report',
    async () => {
      await assertSucceeds(
        setDoc(
          doc(
            alice.firestore(),
            'rootPlaceCommunityReports',
            'report-alice'
          ),
          {
            reporterUid:
              'alice',
            status:
              'pending',
            placeId:
              'place-a',
          }
        )
      );
    }
  );

  await run(
    'reporter cannot spoof reporterUid',
    async () => {
      await assertFails(
        setDoc(
          doc(
            alice.firestore(),
            'rootPlaceCommunityReports',
            'report-spoof'
          ),
          {
            reporterUid:
              'bob',
            status:
              'pending',
            placeId:
              'place-a',
          }
        )
      );
    }
  );

  await run(
    'normal user cannot read community report queue',
    async () => {
      await assertFails(
        getDoc(
          doc(
            alice.firestore(),
            'rootPlaceCommunityReports',
            'report-alice'
          )
        )
      );
    }
  );

  await run(
    'rootModerator can update community report queue',
    async () => {
      await assertSucceeds(
        updateDoc(
          doc(
            rootModerator.firestore(),
            'rootPlaceCommunityReports',
            'report-alice'
          ),
          {
            status:
              'dismissed',
          }
        )
      );
    }
  );

  await run(
    'rootModerator can create moderation audit entry',
    async () => {
      await assertSucceeds(
        setDoc(
          doc(
            rootModerator.firestore(),
            'rootPlaceModerationAudit',
            'audit-1'
          ),
          {
            action:
              'approve',
            createdAt:
              'emulator-test',
          }
        )
      );
    }
  );

  await run(
    'normal user cannot create moderation audit entry',
    async () => {
      await assertFails(
        setDoc(
          doc(
            alice.firestore(),
            'rootPlaceModerationAudit',
            'audit-normal'
          ),
          {
            action:
              'approve',
          }
        )
      );
    }
  );

  await run(
    'moderation audit entries cannot be updated even by rootModerator',
    async () => {
      await assertFails(
        updateDoc(
          doc(
            rootModerator.firestore(),
            'rootPlaceModerationAudit',
            'audit-1'
          ),
          {
            action:
              'changed',
          }
        )
      );
    }
  );

  await run(
    'moderation audit entries cannot be deleted even by rootModerator',
    async () => {
      await assertFails(
        deleteDoc(
          doc(
            rootModerator.firestore(),
            'rootPlaceModerationAudit',
            'audit-1'
          )
        )
      );
    }
  );

  console.log(
    `PASS - ${results.length} Firestore emulator allow/deny assertions`
  );
  console.log(
    'PASS - legacy admin/moderator claims have no moderation privilege'
  );
  console.log(
    'FINDING - cross-user top-level /users/{uid} read is still intentionally reproduced for dependency audit'
  );
  console.log(
    'PASS - EXPLORE V1.2D4 FIRESTORE EMULATOR TESTS'
  );
}
finally {
  await env.cleanup();
}
