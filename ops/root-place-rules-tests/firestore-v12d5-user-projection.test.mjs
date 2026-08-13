// ROOT_EXPLORE_V12D5_USER_PROJECTION_EMULATOR_TESTS

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
  'demo-root-explore-v12d5';

const STAGE_A_RULES =
  'firebase/firestore-v12d5-public-projection-stage-a.rules';

const TARGET_RULES =
  'firebase/firestore-v12d5-self-only-target.rules';

const validProfile = (
  uid,
  nickname,
) => ({
  version: 1,
  uid,
  displayName:
    nickname,
  nickname,
  photoURL:
    null,
  representativeBadgeId:
    null,
  updatedAt:
    '2026-08-13T00:00:00.000Z',
});

const runSuite =
  async (
    label,
    rulesPath,
    crossUserPrivateReadShouldSucceed,
  ) => {
    const rules =
      fs.readFileSync(
        rulesPath,
        'utf8',
      );

    const env =
      await initializeTestEnvironment({
        projectId:
          PROJECT_ID,
        firestore: {
          rules,
        },
      });

    let count =
      0;

    const pass =
      (
        name,
      ) => {
        count +=
          1;

        console.log(
          `PASS - ${label} - ${name}`,
        );
      };

    try {
      await env.clearFirestore();

      await env.withSecurityRulesDisabled(
        async (
          context,
        ) => {
          const db =
            context.firestore();

          await setDoc(
            doc(
              db,
              'users',
              'alice',
            ),
            {
              displayName:
                'Alice private',
              email:
                'alice-private@example.invalid',
              rootPlaceCommunityData: {
                pendingPrivateExample:
                  true,
              },
            },
          );

          await setDoc(
            doc(
              db,
              'users',
              'bob',
            ),
            {
              displayName:
                'Bob private',
              email:
                'bob-private@example.invalid',
            },
          );

          await setDoc(
            doc(
              db,
              'rootUserPublicProfiles',
              'bob',
            ),
            validProfile(
              'bob',
              'Bob',
            ),
          );
        },
      );

      const anon =
        env.unauthenticatedContext();

      const alice =
        env.authenticatedContext(
          'alice',
        );

      const bob =
        env.authenticatedContext(
          'bob',
        );

      const rootModerator =
        env.authenticatedContext(
          'root-mod',
          {
            rootModerator:
              true,
          },
        );

      await assertFails(
        getDoc(
          doc(
            anon.firestore(),
            'users',
            'alice',
          ),
        ),
      );
      pass(
        'anonymous cannot read private user document',
      );

      await assertSucceeds(
        getDoc(
          doc(
            alice.firestore(),
            'users',
            'alice',
          ),
        ),
      );
      pass(
        'user can read own private user document',
      );

      const crossUserPrivateRead =
        getDoc(
          doc(
            bob.firestore(),
            'users',
            'alice',
          ),
        );

      if (
        crossUserPrivateReadShouldSucceed
      ) {
        await assertSucceeds(
          crossUserPrivateRead,
        );
        pass(
          'migration compatibility keeps signed-in cross-user private read',
        );
      }
      else {
        await assertFails(
          crossUserPrivateRead,
        );
        pass(
          'target denies signed-in cross-user private read',
        );
      }

      await assertFails(
        getDoc(
          doc(
            anon.firestore(),
            'rootUserPublicProfiles',
            'bob',
          ),
        ),
      );
      pass(
        'anonymous cannot read signed-in public profile projection',
      );

      await assertSucceeds(
        getDoc(
          doc(
            alice.firestore(),
            'rootUserPublicProfiles',
            'bob',
          ),
        ),
      );
      pass(
        'signed-in user can read another public profile projection',
      );

      await assertSucceeds(
        setDoc(
          doc(
            alice.firestore(),
            'rootUserPublicProfiles',
            'alice',
          ),
          validProfile(
            'alice',
            'Alice',
          ),
        ),
      );
      pass(
        'user can create own public projection',
      );

      await assertFails(
        setDoc(
          doc(
            alice.firestore(),
            'rootUserPublicProfiles',
            'bob',
          ),
          validProfile(
            'bob',
            'Spoofed Bob',
          ),
        ),
      );
      pass(
        'user cannot write another public projection',
      );

      await assertFails(
        setDoc(
          doc(
            alice.firestore(),
            'rootUserPublicProfiles',
            'alice-spoof',
          ),
          validProfile(
            'alice',
            'Spoof',
          ),
        ),
      );
      pass(
        'public projection uid must match document id and auth uid',
      );

      await assertFails(
        setDoc(
          doc(
            alice.firestore(),
            'rootUserPublicProfiles',
            'alice',
          ),
          {
            ...validProfile(
              'alice',
              'Alice',
            ),
            email:
              'must-not-be-public@example.invalid',
          },
        ),
      );
      pass(
        'projection allowlist blocks extra private fields',
      );

      await assertSucceeds(
        updateDoc(
          doc(
            alice.firestore(),
            'rootUserPublicProfiles',
            'alice',
          ),
          {
            nickname:
              'Alice 2',
            updatedAt:
              '2026-08-13T00:01:00.000Z',
          },
        ),
      );
      pass(
        'user can update allowed own projection fields',
      );

      await assertFails(
        updateDoc(
          doc(
            bob.firestore(),
            'rootUserPublicProfiles',
            'alice',
          ),
          {
            nickname:
              'Hacked',
          },
        ),
      );
      pass(
        'another user cannot update projection',
      );

      await assertSucceeds(
        setDoc(
          doc(
            rootModerator.firestore(),
            'rootPlacePublicCommunityDistricts',
            `${label}-moderator-check`,
          ),
          {
            version: 1,
          },
        ),
      );
      pass(
        'rootModerator moderation privilege remains intact',
      );

      await assertSucceeds(
        deleteDoc(
          doc(
            alice.firestore(),
            'rootUserPublicProfiles',
            'alice',
          ),
        ),
      );
      pass(
        'user can delete own projection',
      );

      console.log(
        `PASS - ${label} - ${count} projection/private-user assertions`,
      );
    }
    finally {
      await env.cleanup();
    }

    return count;
  };

const stageCount =
  await runSuite(
    'STAGE_A',
    STAGE_A_RULES,
    true,
  );

const targetCount =
  await runSuite(
    'SELF_ONLY_TARGET',
    TARGET_RULES,
    false,
  );

console.log(
  `PASS - ${stageCount + targetCount} total V1.2D5 emulator assertions`,
);
console.log(
  'PASS - target self-only private user policy is proven in emulator without production deploy',
);
console.log(
  'PASS - EXPLORE V1.2D5 USER PROJECTION EMULATOR TESTS',
);
