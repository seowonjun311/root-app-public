// ROOT_CREW_CHAT_V11_VERIFIER

import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const requireTokens = (label, source, tokens) => {
  for (const token of tokens) {
    if (!source.includes(token)) {
      throw new Error(`${label} missing token: ${token}`);
    }
  }
};

const app = read('app/crew-chat.tsx');
const store = read('store/rootCrewChat.ts');
const firestore = read('firestore.rules');
const firestoreCandidate = read('firebase/firestore-crew-chat-v11.rules');
const storage = read('storage.rules');
const storageCandidate = read('firebase/storage-crew-chat-v11.rules');
const test = read('ops/root-place-rules-tests/crew-chat-v11.test.mjs');
const packageJson = JSON.parse(read('package.json'));

requireTokens('chat screen', app, [
  'ROOT_CREW_CHAT_V11_SCREEN',
  'pickRootCrewChatImage',
  'subscribeRootCrewChatReactions',
  'toggleRootCrewChatReaction',
  'reportRootCrewChatMessage',
  'replyTarget',
  'imageDraft',
  '메시지 메뉴',
  '신고 사유를 선택해주세요',
]);

requireTokens('chat store', store, [
  'ROOT_CREW_CHAT_V11_STORE',
  'ROOT_CREW_CHAT_IMAGE_MAX_BYTES',
  "mediaTypes: ['images']",
  "'crew-chat'",
  'const replyTo = options.replyTo',
  'messageReactions',
  'messageReports',
  'deleteObject',
]);

requireTokens('Firestore rules', firestore, [
  'ROOT_CREW_CHAT_V11_MESSAGES_REPLIES_PHOTOS',
  'ROOT_CREW_CHAT_V11_REACTIONS',
  'ROOT_CREW_CHAT_V11_REPORTS',
  "request.resource.data.version == 2",
  "request.resource.data.image.size <= 10 * 1024 * 1024",
  'root-c7949.firebasestorage.app/o/crew-chat%2F',
  "allow update, delete: if false;",
]);

requireTokens('Storage rules', storage, [
  'ROOT_CREW_CHAT_V11_MEMBER_PHOTOS',
  'firestore.get(',
  'request.auth.uid in firestore.get(',
  "fileName.matches('photo\\\\.(jpg|png|webp)')",
  'request.resource.size <= 10 * 1024 * 1024',
]);

requireTokens('security suite', test, [
  'ROOT_CREW_CHAT_V11_FIRESTORE_STORAGE_TESTS',
  'V1 clients can still create text messages',
  'reply to missing message is rejected',
  'external photo URL is rejected',
  'unsupported reaction emoji is rejected',
  'duplicate report update is rejected',
  'outsider cannot read crew photo',
  'former member loses crew photo read access',
]);

if (firestore !== firestoreCandidate) {
  throw new Error('active Firestore Rules differ from V1.1 candidate');
}
if (storage !== storageCandidate) {
  throw new Error('active Storage Rules differ from V1.1 candidate');
}
if (packageJson.dependencies?.['expo-image-picker'] !== '~17.0.11') {
  throw new Error('SDK 54 expo-image-picker version changed');
}
if (!packageJson.dependencies?.['@react-native-firebase/storage']) {
  throw new Error('React Native Firebase Storage dependency missing');
}

console.log('PASS - CREW CHAT V1.1 replies, reactions, reports and member photos');
