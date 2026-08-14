// ROOT_CREW_CHAT_V1_STORE

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';
import {
  getAuth,
} from '@react-native-firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  sanitizeText,
  validateText,
} from '../utils/textGuard';

export const ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH = 500;

const ROOT_CREW_CHAT_LAST_READ_PREFIX =
  'root_crew_chat_last_read_v1';

const firebaseApp =
  getApp();
const firebaseAuth =
  getAuth(
    firebaseApp
  );
const firebaseDb =
  getFirestore(
    firebaseApp
  );

export type RootCrewChatMessage = {
  id: string;
  version: 1;
  crewId: string;
  authorId: string;
  authorNickname: string;
  authorEmoji: string;
  text: string;
  status: 'active';
  createdAt: string;
  updatedAt: string;
};

function normalizeId(
  value: unknown
) {
  return String(
    value ?? ''
  ).trim();
}

function getMessagesCollection(
  crewId: string
) {
  return collection(
    firebaseDb,
    'crews',
    crewId,
    'messages'
  );
}

function getLastReadKey(
  uid: string,
  crewId: string
) {
  return [
    ROOT_CREW_CHAT_LAST_READ_PREFIX,
    uid,
    crewId,
  ].join(':');
}

export async function sendRootCrewChatMessage(
  crewId: string,
  text: string,
  profile?: {
    nickname?: string | null;
    profileEmoji?: string | null;
  }
): Promise<RootCrewChatMessage> {
  const normalizedCrewId =
    normalizeId(
      crewId
    );
  const normalizedText =
    sanitizeText(
      text
    );
  const currentUser =
    firebaseAuth.currentUser;

  if (
    !currentUser?.uid
  ) {
    throw new Error(
      '로그인한 크루 멤버만 대화할 수 있어요.'
    );
  }

  if (
    !normalizedCrewId
  ) {
    throw new Error(
      '크루 정보를 찾을 수 없어요.'
    );
  }

  const validationError =
    validateText(
      normalizedText,
      {
        label: '메시지',
        min: 1,
        max:
          ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH,
      }
    );

  if (
    validationError
  ) {
    throw new Error(
      validationError
    );
  }

  const messageRef =
    doc(
      getMessagesCollection(
        normalizedCrewId
      )
    );
  const now =
    new Date().toISOString();
  const message: RootCrewChatMessage = {
    id:
      messageRef.id,
    version: 1,
    crewId:
      normalizedCrewId,
    authorId:
      currentUser.uid,
    authorNickname:
      sanitizeText(
        profile?.nickname ??
          currentUser.displayName ??
          '루트유저'
      ).slice(
        0,
        40
      ) || '루트유저',
    authorEmoji:
      sanitizeText(
        profile?.profileEmoji ??
          '🌱'
      ).slice(
        0,
        8
      ) || '🌱',
    text:
      normalizedText,
    status:
      'active',
    createdAt:
      now,
    updatedAt:
      now,
  };

  await setDoc(
    messageRef,
    message
  );

  return message;
}

export function subscribeRootCrewChatMessages(
  crewId: string,
  onChange: (
    messages: RootCrewChatMessage[]
  ) => void,
  onError?: (
    error: Error
  ) => void
) {
  const normalizedCrewId =
    normalizeId(
      crewId
    );

  if (
    !normalizedCrewId
  ) {
    onChange([]);
    return () => undefined;
  }

  const messagesQuery =
    query(
      getMessagesCollection(
        normalizedCrewId
      ),
      orderBy(
        'createdAt',
        'desc'
      ),
      limit(100)
    );

  return onSnapshot(
    messagesQuery,
    (
      snapshot
    ) => {
      onChange(
        (
          snapshot.docs
            .map(
              (
                messageSnapshot
              ) => ({
                id:
                  messageSnapshot.id,
                ...messageSnapshot.data(),
              })
            ) as RootCrewChatMessage[]
        )
          .filter(
            (
              message
            ) =>
              message.status ===
                'active'
          )
      );
    },
    (
      error
    ) => {
      onError?.(
        error
      );
    }
  );
}

export async function deleteRootCrewChatMessage(
  crewId: string,
  messageId: string
) {
  const normalizedCrewId =
    normalizeId(
      crewId
    );
  const normalizedMessageId =
    normalizeId(
      messageId
    );

  if (
    !normalizedCrewId ||
    !normalizedMessageId
  ) {
    throw new Error(
      '삭제할 메시지를 찾을 수 없어요.'
    );
  }

  await deleteDoc(
    doc(
      firebaseDb,
      'crews',
      normalizedCrewId,
      'messages',
      normalizedMessageId
    )
  );
}

export async function getRootCrewChatLastReadAt(
  uid: string,
  crewId: string
) {
  const raw =
    await AsyncStorage.getItem(
      getLastReadKey(
        normalizeId(uid),
        normalizeId(crewId)
      )
    );
  const value =
    Number(
      raw
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

export async function markRootCrewChatRead(
  uid: string,
  crewId: string,
  readAt = Date.now()
) {
  await AsyncStorage.setItem(
    getLastReadKey(
      normalizeId(uid),
      normalizeId(crewId)
    ),
    String(
      readAt
    )
  );
}

export function countUnreadRootCrewChatMessages(
  messages: RootCrewChatMessage[],
  uid: string,
  lastReadAt: number
) {
  return messages.filter(
    (
      message
    ) =>
      message.authorId !==
        uid &&
      Date.parse(
        message.createdAt
      ) > lastReadAt
  ).length;
}
