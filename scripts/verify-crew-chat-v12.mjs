import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const requireTokens = (label, source, tokens) => {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label} missing token: ${token}`);
  }
};

const chat = read('app/crew-chat.tsx');
const moderation = read('app/crew-chat-moderation.tsx');
const store = read('store/rootCrewChatModeration.ts');
const push = read('store/rootCrewPushNotifications.ts');
const layout = read('app/_layout.tsx');
const firestore = read('firebase/firestore-crew-chat-v12.rules');
const storage = read('firebase/storage-crew-chat-v12.rules');
const fn = read('functions/index.js');

requireTokens('chat screen', chat, [
  'registerRootCrewChatPushToken()',
  'setSelectedImageUrl',
  'fullscreenViewer',
  "router.push('/crew-chat-moderation' as never)",
]);
requireTokens('moderation screen', moderation, [
  'subscribeRootCrewChatPendingReports',
  'dismissRootCrewChatReport',
  'deleteReportedRootCrewChatMessage',
  'ROOT 관리자 계정만',
]);
requireTokens('moderation store', store, [
  'requireRootModerator',
  'status: resolution',
  "'message_deleted'",
  'deleteObject',
]);
requireTokens('push registration', push, [
  'getExpoPushTokenAsync({ projectId })',
  "'pushTokens'",
  "ROOT_CREW_CHAT_CHANNEL_ID = 'root-crew-chat'",
]);
requireTokens('notification navigation', layout, [
  'addNotificationResponseReceivedListener',
  "url.startsWith('/crew-chat?id=')",
]);
requireTokens('Firestore rules', firestore, [
  'ROOT_CREW_CHAT_V12_PUSH_TOKENS',
  'isRootCrewModerator()',
  "'message_deleted'",
  'request.resource.data.token.matches',
]);
requireTokens('Storage rules', storage, [
  'isRootCrewModerator()',
  'ROOT_CREW_CHAT_V11_MEMBER_PHOTOS',
]);
requireTokens('push function', fn, [
  'onDocumentCreated(',
  "document: 'crews/{crewId}/messages/{messageId}'",
  'uid !== authorId',
  'https://exp.host/--/api/v2/push/send',
  'DeviceNotRegistered',
]);

execFileSync(process.execPath, ['--check', 'functions/index.js'], { stdio: 'inherit' });
console.log('PASS - CREW CHAT V1.2 report moderation, fullscreen photos and push notifications');
