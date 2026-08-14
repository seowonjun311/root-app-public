// ROOT_CREW_CHAT_V12_PUSH_REGISTRATION

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const firebaseApp = getApp();
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);

export const ROOT_CREW_CHAT_CHANNEL_ID = 'root-crew-chat';

function getTokenDocumentId(token: string) {
  return token.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
}

export async function registerRootCrewChatPushToken() {
  const user = firebaseAuth.currentUser;
  if (!user?.uid) {
    return { registered: false as const, reason: 'signed-out' as const };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ROOT_CREW_CHAT_CHANNEL_ID, {
      name: '크루 채팅',
      description: '가입한 크루의 새 메시지를 알려드려요.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#F28C28',
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return { registered: false as const, reason: 'permission-denied' as const };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('EAS projectId를 찾을 수 없습니다.');
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;
  const now = new Date().toISOString();
  const tokenReference = doc(
    firebaseDb,
    'users',
    user.uid,
    'pushTokens',
    getTokenDocumentId(token)
  );
  const existingToken = await getDoc(tokenReference);
  await setDoc(
    tokenReference,
    {
      version: 1,
      userId: user.uid,
      token,
      platform: Platform.OS,
      enabled: true,
      createdAt: existingToken.data()?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );

  return { registered: true as const, token };
}
