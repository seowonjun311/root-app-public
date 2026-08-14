// ROOT_CREW_CHAT_V11_FIRESTORE_STORAGE_TESTS

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
import {
  deleteObject,
  getBytes,
  ref,
  uploadBytes,
} from 'firebase/storage';

const PROJECT_ID = 'demo-root-crew-chat-v11';
const firestoreRules = fs.readFileSync(
  new URL('../../firebase/firestore-crew-chat-v11.rules', import.meta.url),
  'utf8'
);
const storageRules = fs.readFileSync(
  new URL('../../firebase/storage-crew-chat-v11.rules', import.meta.url),
  'utf8'
);

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules: firestoreRules },
  storage: { rules: storageRules },
});

const now = '2026-08-14T02:00:00.000Z';

const v1Message = (id, authorId, text = '기존 앱 메시지') => ({
  id,
  version: 1,
  crewId: 'crew-a',
  authorId,
  authorNickname: authorId,
  authorEmoji: '🌱',
  text,
  status: 'active',
  createdAt: now,
  updatedAt: now,
});

const v2Message = (id, authorId, overrides = {}) => ({
  id,
  version: 2,
  crewId: 'crew-a',
  authorId,
  authorNickname: authorId,
  authorEmoji: '🌱',
  text: 'V1.1 메시지',
  replyTo: null,
  image: null,
  status: 'active',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const reaction = (messageId, userId, emoji = '👍') => ({
  id: `${messageId}_${userId}`,
  version: 1,
  crewId: 'crew-a',
  messageId,
  userId,
  emoji,
  createdAt: now,
  updatedAt: now,
});

const report = (messageId, messageAuthorId, reporterId) => ({
  id: `${messageId}_${reporterId}`,
  version: 1,
  crewId: 'crew-a',
  messageId,
  messageAuthorId,
  reporterId,
  reason: 'spam',
  messageText: '신고 대상 메시지',
  status: 'pending',
  createdAt: now,
  updatedAt: now,
});

const pass = async (label, operation) => {
  await operation();
  console.log(`PASS - ${label}`);
};

try {
  await env.clearFirestore();
  await env.clearStorage();

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'crews', 'crew-a'), {
      ownerId: 'alice',
      memberIds: ['alice', 'bob'],
      members: 2,
      joinType: 'free',
    });
    await setDoc(
      doc(db, 'crews', 'crew-a', 'messages', 'alice-seed'),
      v2Message('alice-seed', 'alice')
    );
    await uploadBytes(
      ref(
        context.storage(),
        'crew-chat/crew-a/alice/alice-seed/photo.jpg'
      ),
      new Uint8Array([1, 2, 3]),
      { contentType: 'image/jpeg' }
    );
  });

  const anon = env.unauthenticatedContext();
  const alice = env.authenticatedContext('alice');
  const bob = env.authenticatedContext('bob');
  const outsider = env.authenticatedContext('outsider');

  const messageRef = (context, messageId) =>
    doc(context.firestore(), 'crews', 'crew-a', 'messages', messageId);
  const reactionRef = (context, reactionId) =>
    doc(context.firestore(), 'crews', 'crew-a', 'messageReactions', reactionId);
  const reportRef = (context, reportId) =>
    doc(context.firestore(), 'crews', 'crew-a', 'messageReports', reportId);

  await pass('V1 clients can still create text messages', () =>
    assertSucceeds(
      setDoc(messageRef(bob, 'legacy-v1'), v1Message('legacy-v1', 'bob'))
    )
  );

  await pass('member can create V1.1 text message', () =>
    assertSucceeds(
      setDoc(messageRef(bob, 'v11-text'), v2Message('v11-text', 'bob'))
    )
  );

  await pass('member can reply to an existing message', () =>
    assertSucceeds(
      setDoc(
        messageRef(bob, 'v11-reply'),
        v2Message('v11-reply', 'bob', {
          replyTo: {
            messageId: 'alice-seed',
            authorNickname: 'alice',
            text: 'V1.1 메시지',
          },
        })
      )
    )
  );

  await pass('reply to missing message is rejected', () =>
    assertFails(
      setDoc(
        messageRef(bob, 'missing-reply'),
        v2Message('missing-reply', 'bob', {
          replyTo: {
            messageId: 'missing',
            authorNickname: 'alice',
            text: '없는 메시지',
          },
        })
      )
    )
  );

  const validImage = {
    storagePath: 'crew-chat/crew-a/bob/photo-message/photo.jpg',
    downloadUrl:
      'https://firebasestorage.googleapis.com/v0/b/root-c7949.firebasestorage.app/o/crew-chat%2Fcrew-a%2Fbob%2Fphoto-message%2Fphoto.jpg?alt=media&token=test',
    width: 800,
    height: 600,
    contentType: 'image/jpeg',
    size: 3,
  };

  await pass('member can create photo-only message', () =>
    assertSucceeds(
      setDoc(
        messageRef(bob, 'photo-message'),
        v2Message('photo-message', 'bob', { text: '', image: validImage })
      )
    )
  );

  await pass('photo path spoof is rejected', () =>
    assertFails(
      setDoc(
        messageRef(bob, 'spoof-photo'),
        v2Message('spoof-photo', 'bob', {
          image: {
            ...validImage,
            storagePath: 'crew-chat/crew-a/alice/spoof-photo/photo.jpg',
          },
        })
      )
    )
  );

  await pass('external photo URL is rejected', () =>
    assertFails(
      setDoc(
        messageRef(bob, 'external-photo'),
        v2Message('external-photo', 'bob', {
          image: {
            ...validImage,
            storagePath: 'crew-chat/crew-a/bob/external-photo/photo.jpg',
            downloadUrl: 'https://example.com/tracking.jpg',
          },
        })
      )
    )
  );

  await pass('empty V1.1 message without photo is rejected', () =>
    assertFails(
      setDoc(
        messageRef(bob, 'empty-v11'),
        v2Message('empty-v11', 'bob', { text: '', image: null })
      )
    )
  );

  await pass('member can create own reaction', () =>
    assertSucceeds(
      setDoc(
        reactionRef(bob, 'alice-seed_bob'),
        reaction('alice-seed', 'bob')
      )
    )
  );

  await pass('member can change own reaction emoji', () =>
    assertSucceeds(
      updateDoc(reactionRef(bob, 'alice-seed_bob'), {
        emoji: '🔥',
        updatedAt: '2026-08-14T02:01:00.000Z',
      })
    )
  );

  await pass('outsider cannot read reactions', () =>
    assertFails(getDoc(reactionRef(outsider, 'alice-seed_bob')))
  );

  await pass('member cannot spoof another reactor', () =>
    assertFails(
      setDoc(
        reactionRef(bob, 'alice-seed_alice'),
        reaction('alice-seed', 'alice')
      )
    )
  );

  await pass('unsupported reaction emoji is rejected', () =>
    assertFails(
      setDoc(
        reactionRef(bob, 'v11-text_bob'),
        reaction('v11-text', 'bob', '💣')
      )
    )
  );

  await pass('member can report another member message once', () =>
    assertSucceeds(
      setDoc(
        reportRef(bob, 'alice-seed_bob'),
        report('alice-seed', 'alice', 'bob')
      )
    )
  );

  await pass('duplicate report update is rejected', () =>
    assertFails(
      setDoc(
        reportRef(bob, 'alice-seed_bob'),
        report('alice-seed', 'alice', 'bob')
      )
    )
  );

  await pass('message author cannot report own message', () =>
    assertFails(
      setDoc(
        reportRef(alice, 'alice-seed_alice'),
        report('alice-seed', 'alice', 'alice')
      )
    )
  );

  await pass('crew owner can read member report', () =>
    assertSucceeds(getDoc(reportRef(alice, 'alice-seed_bob')))
  );

  const bobPhoto = ref(
    bob.storage(),
    'crew-chat/crew-a/bob/storage-photo/photo.jpg'
  );
  await pass('member can upload own valid crew photo', () =>
    assertSucceeds(
      uploadBytes(bobPhoto, new Uint8Array([1, 2, 3]), {
        contentType: 'image/jpeg',
      })
    )
  );

  await pass('member can read crew photo', () =>
    assertSucceeds(getBytes(bobPhoto))
  );

  await pass('anonymous user cannot read crew photo', () =>
    assertFails(
      getBytes(
        ref(
          anon.storage(),
          'crew-chat/crew-a/bob/storage-photo/photo.jpg'
        )
      )
    )
  );

  await pass('outsider cannot read crew photo', () =>
    assertFails(
      getBytes(
        ref(
          outsider.storage(),
          'crew-chat/crew-a/bob/storage-photo/photo.jpg'
        )
      )
    )
  );

  await pass('member cannot upload into another uid folder', () =>
    assertFails(
      uploadBytes(
        ref(
          bob.storage(),
          'crew-chat/crew-a/alice/spoof/photo.jpg'
        ),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' }
      )
    )
  );

  await pass('non-image crew attachment is rejected', () =>
    assertFails(
      uploadBytes(
        ref(
          bob.storage(),
          'crew-chat/crew-a/bob/text-file/photo.jpg'
        ),
        new Uint8Array([1]),
        { contentType: 'text/plain' }
      )
    )
  );

  await pass('crew owner can delete member photo', () =>
    assertSucceeds(
      deleteObject(
        ref(
          alice.storage(),
          'crew-chat/crew-a/bob/storage-photo/photo.jpg'
        )
      )
    )
  );

  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'crews', 'crew-a'), {
      memberIds: ['alice'],
      members: 1,
    });
  });

  await pass('former member loses reply and reaction read access', () =>
    assertFails(getDoc(messageRef(bob, 'alice-seed')))
  );

  await pass('former member loses crew photo read access', () =>
    assertFails(
      getBytes(
        ref(
          bob.storage(),
          'crew-chat/crew-a/alice/alice-seed/photo.jpg'
        )
      )
    )
  );

  console.log('PASS - ROOT CREW CHAT V1.1 Firestore + Storage security suite');
} finally {
  await env.cleanup();
}
