'use strict';

// ROOT_CREW_CHAT_V12_PUSH_FUNCTION

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_PATTERN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

function compactText(value, maximum) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

async function claimEvent(eventId) {
  const claim = db.collection('crewChatPushEvents').doc(eventId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(claim);
    if (snapshot.exists) return false;
    transaction.create(claim, {
      version: 1,
      status: 'sending',
      createdAt: new Date().toISOString(),
    });
    return true;
  });
}

async function readEnabledTokens(userIds) {
  const snapshots = await Promise.all(
    userIds.map((uid) =>
      db.collection('users').doc(uid).collection('pushTokens')
        .where('enabled', '==', true)
        .get()
    )
  );
  const tokens = [];
  snapshots.forEach((snapshot, index) => {
    snapshot.docs.forEach((tokenSnapshot) => {
      const token = compactText(tokenSnapshot.data().token, 220);
      if (EXPO_TOKEN_PATTERN.test(token)) {
        tokens.push({ token, reference: tokenSnapshot.ref, userId: userIds[index] });
      }
    });
  });
  return tokens;
}

exports.sendCrewChatPush = onDocumentCreated(
  {
    document: 'crews/{crewId}/messages/{messageId}',
    region: 'asia-northeast3',
    retry: true,
    maxInstances: 10,
  },
  async (event) => {
    const message = event.data?.data();
    const crewId = compactText(event.params.crewId, 160);
    if (!message || message.status !== 'active' || message.crewId !== crewId) return;

    const eventId = compactText(event.id, 220).replace(/[^A-Za-z0-9_-]/g, '_');
    if (!eventId || !(await claimEvent(eventId))) return;
    const claim = db.collection('crewChatPushEvents').doc(eventId);

    try {
      const crewSnapshot = await db.collection('crews').doc(crewId).get();
      if (!crewSnapshot.exists) return;
      const crew = crewSnapshot.data();
      const authorId = compactText(message.authorId, 160);
      const recipients = Array.from(new Set(Array.isArray(crew.memberIds) ? crew.memberIds : []))
        .map((value) => compactText(value, 160))
        .filter((uid) => uid && uid !== authorId)
        .slice(0, 30);
      if (!recipients.length) return;

      const tokens = await readEnabledTokens(recipients);
      if (!tokens.length) return;
      const author = compactText(message.authorNickname, 40) || '크루원';
      const preview = compactText(message.text, 120) || (message.image ? '사진을 보냈어요.' : '새 메시지');
      const notifications = tokens.map(({ token }) => ({
        to: token,
        title: compactText(crew.title, 60) || 'ROOT 크루 채팅',
        body: `${author}: ${preview}`,
        sound: 'default',
        channelId: 'root-crew-chat',
        priority: 'high',
        data: {
          type: 'crew-chat-message',
          crewId,
          messageId: compactText(event.params.messageId, 160),
          url: `/crew-chat?id=${encodeURIComponent(crewId)}`,
        },
      }));

      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });
      if (!response.ok) {
        throw new Error(`Expo push request failed: ${response.status}`);
      }
      const result = await response.json();
      const tickets = Array.isArray(result.data) ? result.data : [];
      await Promise.all(
        tickets.map((ticket, index) => {
          if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
            return tokens[index].reference.set(
              { enabled: false, updatedAt: new Date().toISOString() },
              { merge: true }
            );
          }
          return Promise.resolve();
        })
      );
      await claim.set(
        { status: 'sent', recipientCount: tokens.length, completedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (error) {
      await claim.delete().catch(() => {});
      logger.error('CREW CHAT V1.2 push failed', { crewId, eventId, error });
      throw error;
    }
  }
);
