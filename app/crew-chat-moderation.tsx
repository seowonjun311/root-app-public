// ROOT_CREW_CHAT_V12_MODERATION_SCREEN

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  deleteReportedRootCrewChatMessage,
  dismissRootCrewChatReport,
  subscribeRootCrewChatPendingReports,
  type RootCrewChatModerationReport,
} from '../store/rootCrewChatModeration';
import { getRootPlaceModeratorAccess } from '../store/rootPlaceModeration';

const REASON_LABELS: Record<RootCrewChatModerationReport['reason'], string> = {
  spam: '광고·도배',
  harassment: '욕설·괴롭힘',
  privacy: '개인정보 노출',
  other: '기타 부적절한 내용',
};

export default function CrewChatModerationScreen() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [reports, setReports] = useState<RootCrewChatModerationReport[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let unsubscribe = () => {};
      void getRootPlaceModeratorAccess(false)
        .then((access) => {
          if (!active) return;
          setAllowed(access.allowed);
          setChecking(false);
          if (access.allowed) {
            unsubscribe = subscribeRootCrewChatPendingReports(
              (next) => active && setReports(next),
              () => active && setError('신고 목록을 불러오지 못했어요.')
            );
          }
        })
        .catch(() => {
          if (active) {
            setChecking(false);
            setError('관리자 권한을 확인하지 못했어요.');
          }
        });
      return () => {
        active = false;
        unsubscribe();
      };
    }, [])
  );

  const runDecision = async (
    report: RootCrewChatModerationReport,
    decision: 'dismiss' | 'delete'
  ) => {
    setBusyId(report.id);
    setError('');
    try {
      if (decision === 'delete') {
        await deleteReportedRootCrewChatMessage(report);
      } else {
        await dismissRootCrewChatReport(report);
      }
    } catch {
      setError('신고 처리에 실패했어요. 권한과 네트워크를 확인해주세요.');
    } finally {
      setBusyId(null);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#9a641e" />
        <Text style={styles.helper}>관리자 권한을 확인하고 있어요.</Text>
      </SafeAreaView>
    );
  }

  if (!allowed) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>접근할 수 없어요</Text>
        <Text style={styles.helper}>ROOT 관리자 계정만 신고를 검토할 수 있어요.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#5f3b1b" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>크루 채팅 신고 검토</Text>
          <Text style={styles.helper}>대기 중 {reports.length}건</Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={reports}
        keyExtractor={(item) => `${item.crewId}:${item.id}`}
        contentContainerStyle={reports.length ? styles.list : styles.emptyList}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.title}>대기 중인 신고가 없어요</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <Text style={styles.reasonBadge}>{REASON_LABELS[item.reason]}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('ko-KR')}</Text>
            </View>
            <Text style={styles.meta}>크루 {item.crewId} · 메시지 {item.messageId}</Text>
            {item.messageImageUrl ? (
              <Pressable onPress={() => setSelectedImageUrl(item.messageImageUrl ?? null)}>
                <Image
                  source={{ uri: item.messageImageUrl }}
                  style={styles.reportImage}
                  resizeMode="cover"
                />
              </Pressable>
            ) : null}
            <Text style={styles.message}>{item.messageText || '사진 메시지'}</Text>
            <View style={styles.actions}>
              <Pressable
                disabled={Boolean(busyId)}
                style={styles.secondaryButton}
                onPress={() => void runDecision(item, 'dismiss')}
              >
                <Text style={styles.secondaryButtonText}>문제없음</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(busyId)}
                style={styles.dangerButton}
                onPress={() =>
                  Alert.alert('메시지 삭제', '신고된 메시지와 첨부 사진을 삭제할까요?', [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: () => void runDecision(item, 'delete'),
                    },
                  ])
                }
              >
                <Text style={styles.dangerButtonText}>
                  {busyId === item.id ? '처리 중…' : '메시지 삭제'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
      {selectedImageUrl ? (
        <View style={styles.imageViewer}>
          <Image
            source={{ uri: selectedImageUrl }}
            style={styles.viewerImage}
            resizeMode="contain"
          />
          <Pressable style={styles.viewerClose} onPress={() => setSelectedImageUrl(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f0e5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#f7f0e5' },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#dfc28e', backgroundColor: '#fffaf2' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, paddingRight: 44, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: '#3d2515' },
  helper: { marginTop: 6, textAlign: 'center', color: '#806245' },
  error: { margin: 12, color: '#b14235', textAlign: 'center' },
  list: { padding: 14, gap: 12 },
  emptyList: { flexGrow: 1 },
  emptyEmoji: { marginBottom: 10, fontSize: 36 },
  card: { padding: 15, borderRadius: 18, borderWidth: 1, borderColor: '#dfc28e', backgroundColor: '#fffaf2' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reasonBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, overflow: 'hidden', fontSize: 12, fontWeight: '900', color: '#8b432f', backgroundColor: '#ffe2d4' },
  date: { flex: 1, textAlign: 'right', fontSize: 10, color: '#9a8068' },
  meta: { marginTop: 9, fontSize: 10, color: '#9a8068' },
  message: { marginTop: 9, fontSize: 15, lineHeight: 22, color: '#3f2b1d' },
  reportImage: { width: '100%', height: 210, marginTop: 10, borderRadius: 14, backgroundColor: '#eadbc5' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryButton: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 15, backgroundColor: '#6f4626' },
  primaryButtonText: { color: '#fffaf2', fontWeight: '900' },
  secondaryButton: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 14, backgroundColor: '#eee0c9' },
  secondaryButtonText: { color: '#5f4125', fontWeight: '900' },
  dangerButton: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 14, backgroundColor: '#b14235' },
  dangerButtonText: { color: '#fff', fontWeight: '900' },
  imageViewer: { ...StyleSheet.absoluteFillObject, zIndex: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090705' },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: { position: 'absolute', top: 48, right: 18, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.58)' },
});
