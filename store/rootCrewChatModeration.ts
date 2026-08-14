// ROOT_CREW_CHAT_V12_MODERATION

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import {
  deleteObject,
  getStorage,
  ref as storageRef,
} from '@react-native-firebase/storage';

import { getRootPlaceModeratorAccess } from './rootPlaceModeration';

const firebaseApp = getApp();
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);
const firebaseStorage = getStorage(firebaseApp);

export type RootCrewChatModerationStatus =
  | 'pending'
  | 'dismissed'
  | 'message_deleted';

export type RootCrewChatModerationReport = {
  id: string;
  version: 1;
  crewId: string;
  messageId: string;
  messageAuthorId: string;
  reporterId: string;
  reason: 'spam' | 'harassment' | 'privacy' | 'other';
  messageText: string;
  status: RootCrewChatModerationStatus;
  createdAt: string;
  updatedAt: string;
  reviewerId?: string;
  reviewedAt?: string;
  resolution?: 'dismissed' | 'message_deleted';
  messageImageUrl?: string;
};

async function requireRootModerator() {
  const access = await getRootPlaceModeratorAccess(false);
  if (!access.allowed || !access.uid) {
    throw new Error('ROOT 관리자 권한이 필요합니다.');
  }
  return access.uid;
}

export function subscribeRootCrewChatPendingReports(
  onChange: (reports: RootCrewChatModerationReport[]) => void,
  onError?: (error: Error) => void
) {
  let stopped = false;
  const unsubscribes: Array<() => void> = [];
  const reportsByCrew = new Map<string, RootCrewChatModerationReport[]>();
  const emit = () => {
    if (stopped) return;
    onChange(
      Array.from(reportsByCrew.values())
        .flat()
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .slice(0, 100)
    );
  };

  void getDocs(query(collection(firebaseDb, 'crews'), limit(200)))
    .then((crewSnapshot) => {
      if (stopped) return;
      crewSnapshot.docs.forEach((crewDocument) => {
        const crewId = crewDocument.id;
        const reportQuery = query(
          collection(firebaseDb, 'crews', crewId, 'messageReports'),
          where('status', '==', 'pending'),
          limit(100)
        );
        unsubscribes.push(
          onSnapshot(
            reportQuery,
            (snapshot) => {
              void Promise.all(
                snapshot.docs.map(async (reportSnapshot) => {
                  const report = {
                    ...(reportSnapshot.data() as Omit<RootCrewChatModerationReport, 'id'>),
                    id: reportSnapshot.id,
                  };
                  const messageSnapshot = await getDoc(
                    doc(firebaseDb, 'crews', crewId, 'messages', report.messageId)
                  );
                  return {
                    ...report,
                    messageImageUrl: String(
                      messageSnapshot.data()?.image?.downloadUrl ?? ''
                    ).trim() || undefined,
                  };
                })
              )
                .then((reports) => {
                  reportsByCrew.set(crewId, reports);
                  emit();
                })
                .catch((error) => onError?.(error as Error));
            },
            (error) => onError?.(error as Error)
          )
        );
      });
      emit();
    })
    .catch((error) => onError?.(error as Error));

  return () => {
    stopped = true;
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

async function resolveReport(
  report: RootCrewChatModerationReport,
  resolution: 'dismissed' | 'message_deleted'
) {
  const reviewerId = await requireRootModerator();
  const now = new Date().toISOString();
  await updateDoc(
    doc(firebaseDb, 'crews', report.crewId, 'messageReports', report.id),
    {
      status: resolution,
      resolution,
      reviewerId,
      reviewedAt: now,
      updatedAt: now,
    }
  );
}

export async function dismissRootCrewChatReport(
  report: RootCrewChatModerationReport
) {
  await resolveReport(report, 'dismissed');
}

export async function deleteReportedRootCrewChatMessage(
  report: RootCrewChatModerationReport
) {
  await requireRootModerator();
  const messageReference = doc(
    firebaseDb,
    'crews',
    report.crewId,
    'messages',
    report.messageId
  );
  const messageSnapshot = await getDoc(messageReference);
  if (messageSnapshot.exists()) {
    const imagePath = String(messageSnapshot.data()?.image?.storagePath ?? '').trim();
    if (imagePath) {
      try {
        await deleteObject(storageRef(firebaseStorage, imagePath));
      } catch (error: any) {
        if (error?.code !== 'storage/object-not-found') {
          throw error;
        }
      }
    }
    await deleteDoc(messageReference);
  }
  await resolveReport(report, 'message_deleted');
}
