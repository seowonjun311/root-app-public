// ROOT_CREW_CHAT_V1_FIRESTORE_EMULATOR_TESTS

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
  'demo-root-crew-chat-v1';

const rules =
  fs.readFileSync(
    new URL(
      '../../firebase/firestore-crew-chat-v1.rules',
      import.meta.url
    ),
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

const validMessage =
  (
    id,
    crewId,
    authorId,
    text = '함께 목표를 달성해요!'
  ) => ({
    id,
    version: 1,
    crewId,
    authorId,
    authorNickname:
      authorId,
    authorEmoji:
      '🌱',
    text,
    status:
      'active',
    createdAt:
      '2026-08-13T12:00:00.000Z',
    updatedAt:
      '2026-08-13T12:00:00.000Z',
  });

const pass =
  async (
    label,
    operation
  ) => {
    await operation();
    console.log(
      `PASS - ${label}`
    );
  };

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
          'crews',
          'crew-a'
        ),
        {
          ownerId:
            'alice',
          memberIds: [
            'alice',
            'bob',
          ],
          members: 2,
          joinType:
            'free',
        }
      );

      await setDoc(
        doc(
          db,
          'crews',
          'crew-a',
          'messages',
          'bob-seed'
        ),
        validMessage(
          'bob-seed',
          'crew-a',
          'bob'
        )
      );

      await setDoc(
        doc(
          db,
          'crews',
          'crew-a',
          'messages',
          'alice-seed'
        ),
        validMessage(
          'alice-seed',
          'crew-a',
          'alice'
        )
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
  const outsider =
    env.authenticatedContext(
      'outsider'
    );

  const messageRef =
    (
      context,
      messageId
    ) =>
      doc(
        context.firestore(),
        'crews',
        'crew-a',
        'messages',
        messageId
      );

  await pass(
    'active member can read crew message',
    () =>
      assertSucceeds(
        getDoc(
          messageRef(
            bob,
            'bob-seed'
          )
        )
      )
  );

  await pass(
    'anonymous user cannot read crew message',
    () =>
      assertFails(
        getDoc(
          messageRef(
            anon,
            'bob-seed'
          )
        )
      )
  );

  await pass(
    'signed-in outsider cannot read crew message',
    () =>
      assertFails(
        getDoc(
          messageRef(
            outsider,
            'bob-seed'
          )
        )
      )
  );

  await pass(
    'active member can create own valid message',
    () =>
      assertSucceeds(
        setDoc(
          messageRef(
            bob,
            'bob-valid'
          ),
          validMessage(
            'bob-valid',
            'crew-a',
            'bob'
          )
        )
      )
  );

  await pass(
    'outsider cannot create crew message',
    () =>
      assertFails(
        setDoc(
          messageRef(
            outsider,
            'outsider-message'
          ),
          validMessage(
            'outsider-message',
            'crew-a',
            'outsider'
          )
        )
      )
  );

  await pass(
    'member cannot spoof another author',
    () =>
      assertFails(
        setDoc(
          messageRef(
            bob,
            'spoofed-message'
          ),
          validMessage(
            'spoofed-message',
            'crew-a',
            'alice'
          )
        )
      )
  );

  await pass(
    'message longer than 500 characters is rejected',
    () =>
      assertFails(
        setDoc(
          messageRef(
            bob,
            'too-long'
          ),
          validMessage(
            'too-long',
            'crew-a',
            'bob',
            '가'.repeat(501)
          )
        )
      )
  );

  await pass(
    'message updates are rejected',
    () =>
      assertFails(
        updateDoc(
          messageRef(
            bob,
            'bob-seed'
          ),
          {
            text:
              '수정 시도',
          }
        )
      )
  );

  await pass(
    'ordinary member cannot delete another member message',
    () =>
      assertFails(
        deleteDoc(
          messageRef(
            bob,
            'alice-seed'
          )
        )
      )
  );

  await pass(
    'crew owner can delete a member message',
    () =>
      assertSucceeds(
        deleteDoc(
          messageRef(
            alice,
            'bob-seed'
          )
        )
      )
  );

  await pass(
    'message author can delete own message',
    () =>
      assertSucceeds(
        deleteDoc(
          messageRef(
            bob,
            'bob-valid'
          )
        )
      )
  );

  await env.withSecurityRulesDisabled(
    async (
      context
    ) => {
      await updateDoc(
        doc(
          context.firestore(),
          'crews',
          'crew-a'
        ),
        {
          memberIds: [
            'alice',
          ],
          members: 1,
        }
      );
    }
  );

  await pass(
    'former member loses message read access immediately',
    () =>
      assertFails(
        getDoc(
          messageRef(
            bob,
            'alice-seed'
          )
        )
      )
  );

  console.log(
    'PASS - ROOT CREW CHAT V1 Firestore security suite'
  );
} finally {
  await env.cleanup();
}
