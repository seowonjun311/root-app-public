// ROOT_CREW_CHAT_V11_STORE

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from '@react-native-firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref as storageRef,
} from '@react-native-firebase/storage';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { sanitizeText, validateText } from '../utils/textGuard';

export const ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH = 500;
export const ROOT_CREW_CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const ROOT_CREW_CHAT_REPLY_PREVIEW_MAX_LENGTH = 120;
export const ROOT_CREW_CHAT_REACTION_EMOJIS = [
  '👍', '❤️', '🔥', '👏', '😂',
] as const;
export const ROOT_CREW_CHAT_REPORT_REASONS = [
  'spam', 'harassment', 'privacy', 'other',
] as const;

const ROOT_CREW_CHAT_LAST_READ_PREFIX = 'root_crew_chat_last_read_v1';
const firebaseApp = getApp();
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);
const firebaseStorage = getStorage(firebaseApp);

export type RootCrewChatReactionEmoji =
  (typeof ROOT_CREW_CHAT_REACTION_EMOJIS)[number];
export type RootCrewChatReportReason =
  (typeof ROOT_CREW_CHAT_REPORT_REASONS)[number];

export type RootCrewChatReply = {
  messageId: string;
  authorNickname: string;
  text: string;
};

export type RootCrewChatImage = {
  storagePath: string;
  downloadUrl: string;
  width: number;
  height: number;
  contentType: string;
  size: number;
};

export type RootCrewChatImageDraft = {
  localUri: string;
  width: number;
  height: number;
  contentType: string;
  size: number;
  fileName: string;
};

export type RootCrewChatMessage = {
  id: string;
  version: 1 | 2;
  crewId: string;
  authorId: string;
  authorNickname: string;
  authorEmoji: string;
  text: string;
  status: 'active';
  createdAt: string;
  updatedAt: string;
  replyTo?: RootCrewChatReply | null;
  image?: RootCrewChatImage | null;
};

export type RootCrewChatReaction = {
  id: string;
  version: 1;
  crewId: string;
  messageId: string;
  userId: string;
  emoji: RootCrewChatReactionEmoji;
  createdAt: string;
  updatedAt: string;
};

export type RootCrewChatReport = {
  id: string;
  version: 1;
  crewId: string;
  messageId: string;
  messageAuthorId: string;
  reporterId: string;
  reason: RootCrewChatReportReason;
  messageText: string;
  status: 'pending';
  createdAt: string;
  updatedAt: string;
};

export type SendRootCrewChatMessageOptions = {
  replyTo?: RootCrewChatMessage | null;
  image?: RootCrewChatImageDraft | null;
};

function normalizeId(value: unknown) {
  return String(value ?? '').trim();
}

function sanitizeStorageSegment(value: unknown) {
  return normalizeId(value)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 160);
}

function toPutFilePath(uri: string) {
  return uri.startsWith('file://')
    ? decodeURIComponent(uri.replace('file://', ''))
    : uri;
}

function getMessagesCollection(crewId: string) {
  return collection(firebaseDb, 'crews', crewId, 'messages');
}

function getReactionsCollection(crewId: string) {
  return collection(firebaseDb, 'crews', crewId, 'messageReactions');
}

function getReportsCollection(crewId: string) {
  return collection(firebaseDb, 'crews', crewId, 'messageReports');
}

function getLastReadKey(uid: string, crewId: string) {
  return [ROOT_CREW_CHAT_LAST_READ_PREFIX, uid, crewId].join(':');
}

function getReactionId(messageId: string, uid: string) {
  return `${sanitizeStorageSegment(messageId)}_${sanitizeStorageSegment(uid)}`;
}

function getReportId(messageId: string, uid: string) {
  return `${sanitizeStorageSegment(messageId)}_${sanitizeStorageSegment(uid)}`;
}

function getImageExtension(contentType: string, fileName: string) {
  const normalizedName = fileName.toLowerCase();
  if (contentType === 'image/png' || normalizedName.endsWith('.png')) {
    return 'png';
  }
  if (contentType === 'image/webp' || normalizedName.endsWith('.webp')) {
    return 'webp';
  }
  return 'jpg';
}

export async function pickRootCrewChatImage(): Promise<RootCrewChatImageDraft | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('사진을 첨부하려면 사진 접근 권한이 필요해요.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const size =
    typeof asset.fileSize === 'number'
      ? asset.fileSize
      : new File(asset.uri).size;
  const contentType = asset.mimeType ?? 'image/jpeg';
  if (!contentType.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error('JPG, PNG 또는 WEBP 사진만 첨부할 수 있어요.');
  }
  if (!size || size > ROOT_CREW_CHAT_IMAGE_MAX_BYTES) {
    throw new Error('사진은 10MB 이하만 첨부할 수 있어요.');
  }

  return {
    localUri: asset.uri,
    width: Math.max(1, Math.round(asset.width)),
    height: Math.max(1, Math.round(asset.height)),
    contentType,
    size,
    fileName: asset.fileName ?? 'crew-photo.jpg',
  };
}

export async function sendRootCrewChatMessage(
  crewId: string,
  text: string,
  profile?: {
    nickname?: string | null;
    profileEmoji?: string | null;
  },
  options: SendRootCrewChatMessageOptions = {}
): Promise<RootCrewChatMessage> {
  const normalizedCrewId = normalizeId(crewId);
  const normalizedText = sanitizeText(text);
  const currentUser = firebaseAuth.currentUser;
  const imageDraft = options.image ?? null;

  if (!currentUser?.uid) {
    throw new Error('로그인한 크루 멤버만 대화할 수 있어요.');
  }
  if (!normalizedCrewId) {
    throw new Error('크루 정보를 찾을 수 없어요.');
  }
  if (!normalizedText && !imageDraft) {
    throw new Error('메시지나 사진을 입력해주세요.');
  }
  if (normalizedText) {
    const validationError = validateText(normalizedText, {
      label: '메시지',
      min: 1,
      max: ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH,
    });
    if (validationError) {
      throw new Error(validationError);
    }
  }

  const messageRef = doc(getMessagesCollection(normalizedCrewId));
  const now = new Date().toISOString();
  const replyTo = options.replyTo
    ? {
        messageId: normalizeId(options.replyTo.id),
        authorNickname: sanitizeText(
          options.replyTo.authorNickname || '루트유저'
        ).slice(0, 40),
        text: sanitizeText(
          options.replyTo.text || (options.replyTo.image ? '사진' : '메시지')
        ).slice(0, ROOT_CREW_CHAT_REPLY_PREVIEW_MAX_LENGTH),
      }
    : null;

  let uploadedImage: RootCrewChatImage | null = null;
  let uploadedReference: ReturnType<typeof storageRef> | null = null;

  try {
    if (imageDraft) {
      const extension = getImageExtension(imageDraft.contentType, imageDraft.fileName);
      const storagePath = [
        'crew-chat',
        sanitizeStorageSegment(normalizedCrewId),
        sanitizeStorageSegment(currentUser.uid),
        sanitizeStorageSegment(messageRef.id),
        `photo.${extension}`,
      ].join('/');
      uploadedReference = storageRef(firebaseStorage, storagePath);
      await putFile(uploadedReference, toPutFilePath(imageDraft.localUri), {
        contentType: imageDraft.contentType,
      });
      uploadedImage = {
        storagePath,
        downloadUrl: await getDownloadURL(uploadedReference),
        width: imageDraft.width,
        height: imageDraft.height,
        contentType: imageDraft.contentType,
        size: imageDraft.size,
      };
    }

    const message: RootCrewChatMessage = {
      id: messageRef.id,
      version: 2,
      crewId: normalizedCrewId,
      authorId: currentUser.uid,
      authorNickname:
        sanitizeText(
          profile?.nickname ?? currentUser.displayName ?? '루트유저'
        ).slice(0, 40) || '루트유저',
      authorEmoji:
        sanitizeText(profile?.profileEmoji ?? '🌱').slice(0, 8) || '🌱',
      text: normalizedText,
      replyTo,
      image: uploadedImage,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(messageRef, message);
    return message;
  } catch (error) {
    if (uploadedReference) {
      try {
        await deleteObject(uploadedReference);
      } catch {
        // Preserve the original send error.
      }
    }
    throw error;
  }
}

export function subscribeRootCrewChatMessages(
  crewId: string,
  onChange: (messages: RootCrewChatMessage[]) => void,
  onError?: (error: Error) => void
) {
  const normalizedCrewId = normalizeId(crewId);
  if (!normalizedCrewId) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(
      getMessagesCollection(normalizedCrewId),
      orderBy('createdAt', 'desc'),
      limit(100)
    ),
    (snapshot) => {
      onChange(
        (snapshot.docs.map((messageSnapshot) => ({
          id: messageSnapshot.id,
          ...messageSnapshot.data(),
        })) as RootCrewChatMessage[]).filter(
          (message) => message.status === 'active'
        )
      );
    },
    (error) => onError?.(error)
  );
}

export function subscribeRootCrewChatReactions(
  crewId: string,
  onChange: (reactions: RootCrewChatReaction[]) => void,
  onError?: (error: Error) => void
) {
  const normalizedCrewId = normalizeId(crewId);
  if (!normalizedCrewId) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(getReactionsCollection(normalizedCrewId), limit(500)),
    (snapshot) => {
      onChange(
        snapshot.docs.map((reactionSnapshot) => ({
          id: reactionSnapshot.id,
          ...reactionSnapshot.data(),
        })) as RootCrewChatReaction[]
      );
    },
    (error) => onError?.(error)
  );
}

export async function toggleRootCrewChatReaction(
  crewId: string,
  messageId: string,
  emoji: RootCrewChatReactionEmoji
) {
  const normalizedCrewId = normalizeId(crewId);
  const normalizedMessageId = normalizeId(messageId);
  const uid = firebaseAuth.currentUser?.uid ?? '';
  if (!normalizedCrewId || !normalizedMessageId || !uid) {
    throw new Error('반응을 남길 메시지를 찾을 수 없어요.');
  }
  if (!ROOT_CREW_CHAT_REACTION_EMOJIS.includes(emoji)) {
    throw new Error('지원하지 않는 반응이에요.');
  }

  const reactionId = getReactionId(normalizedMessageId, uid);
  const reactionRef = doc(
    firebaseDb,
    'crews',
    normalizedCrewId,
    'messageReactions',
    reactionId
  );
  const existing = await getDoc(reactionRef);
  if (existing.exists() && existing.data()?.emoji === emoji) {
    await deleteDoc(reactionRef);
    return;
  }

  const now = new Date().toISOString();
  const reaction: RootCrewChatReaction = {
    id: reactionId,
    version: 1,
    crewId: normalizedCrewId,
    messageId: normalizedMessageId,
    userId: uid,
    emoji,
    createdAt: existing.data()?.createdAt ?? now,
    updatedAt: now,
  };
  await setDoc(reactionRef, reaction);
}

export async function reportRootCrewChatMessage(
  crewId: string,
  message: RootCrewChatMessage,
  reason: RootCrewChatReportReason
) {
  const normalizedCrewId = normalizeId(crewId);
  const uid = firebaseAuth.currentUser?.uid ?? '';
  if (!normalizedCrewId || !uid || !message.id) {
    throw new Error('신고할 메시지를 찾을 수 없어요.');
  }
  if (message.authorId === uid) {
    throw new Error('내 메시지는 신고할 수 없어요.');
  }
  if (!ROOT_CREW_CHAT_REPORT_REASONS.includes(reason)) {
    throw new Error('신고 사유를 선택해주세요.');
  }

  const reportId = getReportId(message.id, uid);
  const reportRef = doc(getReportsCollection(normalizedCrewId), reportId);
  if ((await getDoc(reportRef)).exists()) {
    throw new Error('이미 신고한 메시지예요.');
  }
  const now = new Date().toISOString();
  const report: RootCrewChatReport = {
    id: reportId,
    version: 1,
    crewId: normalizedCrewId,
    messageId: message.id,
    messageAuthorId: message.authorId,
    reporterId: uid,
    reason,
    messageText: sanitizeText(message.text).slice(0, 500),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(reportRef, report);
}

export async function deleteRootCrewChatMessage(
  crewId: string,
  messageId: string
) {
  const normalizedCrewId = normalizeId(crewId);
  const normalizedMessageId = normalizeId(messageId);
  if (!normalizedCrewId || !normalizedMessageId) {
    throw new Error('삭제할 메시지를 찾을 수 없어요.');
  }

  const messageRef = doc(
    firebaseDb,
    'crews',
    normalizedCrewId,
    'messages',
    normalizedMessageId
  );
  const messageSnapshot = await getDoc(messageRef);
  const imagePath = normalizeId(messageSnapshot.data()?.image?.storagePath);
  if (imagePath) {
    await deleteObject(storageRef(firebaseStorage, imagePath));
  }
  await deleteDoc(messageRef);
}

export async function getRootCrewChatLastReadAt(uid: string, crewId: string) {
  const raw = await AsyncStorage.getItem(
    getLastReadKey(normalizeId(uid), normalizeId(crewId))
  );
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export async function markRootCrewChatRead(
  uid: string,
  crewId: string,
  readAt = Date.now()
) {
  await AsyncStorage.setItem(
    getLastReadKey(normalizeId(uid), normalizeId(crewId)),
    String(readAt)
  );
}

export function countUnreadRootCrewChatMessages(
  messages: RootCrewChatMessage[],
  uid: string,
  lastReadAt: number
) {
  return messages.filter(
    (message) =>
      message.authorId !== uid && Date.parse(message.createdAt) > lastReadAt
  ).length;
}
