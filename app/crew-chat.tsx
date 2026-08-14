// ROOT_CREW_CHAT_V11_SCREEN

import { Ionicons } from '@expo/vector-icons';
import { getAuth } from '@react-native-firebase/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  deleteRootCrewChatMessage,
  getRootCrewChatLastReadAt,
  markRootCrewChatRead,
  pickRootCrewChatImage,
  reportRootCrewChatMessage,
  ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH,
  ROOT_CREW_CHAT_REACTION_EMOJIS,
  sendRootCrewChatMessage,
  subscribeRootCrewChatMessages,
  subscribeRootCrewChatReactions,
  toggleRootCrewChatReaction,
  type RootCrewChatImageDraft,
  type RootCrewChatMessage,
  type RootCrewChatReaction,
  type RootCrewChatReportReason,
} from '../store/rootCrewChat';
import { getRootPlaceModeratorAccess } from '../store/rootPlaceModeration';
import { registerRootCrewChatPushToken } from '../store/rootCrewPushNotifications';
import {
  getRootCrews,
  getRootOnboardingData,
  subscribeRootCrews,
} from '../store/rootMemory';

const REPORT_OPTIONS: Array<{
  reason: RootCrewChatReportReason;
  label: string;
}> = [
  { reason: 'spam', label: '광고·도배' },
  { reason: 'harassment', label: '욕설·괴롭힘' },
  { reason: 'privacy', label: '개인정보 노출' },
  { reason: 'other', label: '기타 부적절한 내용' },
];

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function CrewChatScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const crewId = String(params.id ?? '');
  const authUser = getAuth().currentUser;
  const profile = getRootOnboardingData();
  const uid = authUser?.uid ?? '';
  const [crew, setCrew] = useState<any>(
    getRootCrews().find((item: any) => String(item?.id ?? '') === crewId) ?? null
  );
  const [messages, setMessages] = useState<RootCrewChatMessage[]>([]);
  const [reactions, setReactions] = useState<RootCrewChatReaction[]>([]);
  const [text, setText] = useState('');
  const [imageDraft, setImageDraft] = useState<RootCrewChatImageDraft | null>(null);
  const [replyTarget, setReplyTarget] = useState<RootCrewChatMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<RootCrewChatMessage | null>(null);
  const [reportMessage, setReportMessage] = useState<RootCrewChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isRootModerator, setIsRootModerator] = useState(false);
  const didReadInitialSnapshotRef = useRef(false);

  const isMember = useMemo(
    () =>
      Boolean(
        uid &&
          crew?.memberIds?.some(
            (memberId: unknown) => String(memberId) === uid
          )
      ),
    [crew?.memberIds, uid]
  );
  const isOwner = crew?.ownerId === uid;

  const reactionsByMessage = useMemo(() => {
    const grouped = new Map<string, RootCrewChatReaction[]>();
    reactions.forEach((reaction) => {
      const current = grouped.get(reaction.messageId) ?? [];
      current.push(reaction);
      grouped.set(reaction.messageId, current);
    });
    return grouped;
  }, [reactions]);

  useEffect(() => {
    const unsubscribe = subscribeRootCrews((crews) => {
      setCrew(crews.find((item) => String(item.id) === crewId) ?? null);
    });
    return () => unsubscribe?.();
  }, [crewId]);

  useEffect(() => {
    if (!uid) return;
    void getRootPlaceModeratorAccess(false)
      .then((access) => setIsRootModerator(access.allowed))
      .catch(() => setIsRootModerator(false));
    void registerRootCrewChatPushToken().catch(() => {
      // 채팅 자체는 푸시 등록 실패와 독립적으로 계속 사용할 수 있어요.
    });
  }, [uid]);

  useEffect(() => {
    if (!crewId || !uid || !isMember) {
      setLoading(false);
      return;
    }

    const unsubscribeMessages = subscribeRootCrewChatMessages(
      crewId,
      (nextMessages) => {
        setMessages(nextMessages);
        setLoading(false);
        if (!didReadInitialSnapshotRef.current) {
          didReadInitialSnapshotRef.current = true;
          void getRootCrewChatLastReadAt(uid, crewId).then((lastReadAt) => {
            setInitialUnreadCount(
              nextMessages.filter(
                (message) =>
                  message.authorId !== uid &&
                  Date.parse(message.createdAt) > lastReadAt
              ).length
            );
            return markRootCrewChatRead(uid, crewId);
          });
        } else {
          void markRootCrewChatRead(uid, crewId);
        }
      },
      () => {
        setLoading(false);
        setError('크루 대화를 불러오지 못했어요. 멤버 권한을 확인해주세요.');
      }
    );
    const unsubscribeReactions = subscribeRootCrewChatReactions(
      crewId,
      setReactions,
      () => setError('이모지 반응을 불러오지 못했어요.')
    );

    return () => {
      unsubscribeMessages?.();
      unsubscribeReactions?.();
    };
  }, [crewId, isMember, uid]);

  const handlePickImage = async () => {
    try {
      setError('');
      const picked = await pickRootCrewChatImage();
      if (picked) {
        setImageDraft(picked);
      }
    } catch (pickError) {
      setError(
        pickError instanceof Error ? pickError.message : '사진을 선택하지 못했어요.'
      );
    }
  };

  const handleSend = async () => {
    if (sending || (!text.trim() && !imageDraft)) {
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendRootCrewChatMessage(
        crewId,
        text,
        {
          nickname: profile?.nickname ?? profile?.displayName,
          profileEmoji: profile?.profileEmoji,
        },
        { replyTo: replyTarget, image: imageDraft }
      );
      setText('');
      setReplyTarget(null);
      setImageDraft(null);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : '메시지를 보내지 못했어요.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (
    message: RootCrewChatMessage,
    emoji: (typeof ROOT_CREW_CHAT_REACTION_EMOJIS)[number]
  ) => {
    setActionMessage(null);
    try {
      await toggleRootCrewChatReaction(crewId, message.id, emoji);
    } catch {
      setError('이모지 반응을 저장하지 못했어요.');
    }
  };

  const handleReport = async (
    message: RootCrewChatMessage,
    reason: RootCrewChatReportReason
  ) => {
    setReportMessage(null);
    try {
      await reportRootCrewChatMessage(crewId, message, reason);
      Alert.alert('신고 접수', '크루 메시지 신고가 접수되었어요.');
    } catch (reportError) {
      setError(
        reportError instanceof Error ? reportError.message : '신고를 접수하지 못했어요.'
      );
    }
  };

  const confirmDelete = (message: RootCrewChatMessage) => {
    setActionMessage(null);
    Alert.alert('메시지 삭제', '첨부 사진도 함께 삭제됩니다. 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          void deleteRootCrewChatMessage(crewId, message.id).catch(() => {
            setError('메시지를 삭제하지 못했어요.');
          });
        },
      },
    ]);
  };

  if (!uid) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>로그인이 필요해요</Text>
        <Text style={styles.emptyText}>게스트는 크루 대화에 참여할 수 없어요.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!loading && !isMember) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>크루 멤버 전용 대화예요</Text>
        <Text style={styles.emptyText}>가입이 승인된 활성 멤버만 대화를 볼 수 있어요.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.headerBack} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#5f3b1b" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title} numberOfLines={1}>
              {crew?.title ?? '크루 대화'}
            </Text>
            <Text style={styles.memberCount}>
              멤버 {crew?.memberIds?.length ?? 0}명 · 사진은 멤버만 열람
            </Text>
          </View>
          {isRootModerator ? (
            <Pressable
              style={styles.moderationButton}
              onPress={() => router.push('/crew-chat-moderation' as never)}
            >
              <Ionicons name="shield-checkmark-outline" size={19} color="#6d421f" />
              <Text style={styles.moderationButtonText}>신고</Text>
            </Pressable>
          ) : null}
        </View>

        {crew?.notice?.trim() ? (
          <View style={styles.notice}>
            <Text style={styles.noticeLabel}>📌 크루 공지</Text>
            <Text style={styles.noticeText} numberOfLines={3}>{crew.notice}</Text>
          </View>
        ) : null}
        {initialUnreadCount > 0 ? (
          <Text style={styles.unreadText}>
            여기부터 읽지 않은 메시지 {initialUnreadCount}개예요.
          </Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          style={styles.list}
          contentContainerStyle={
            messages.length === 0 ? styles.emptyList : styles.messageList
          }
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>첫 대화를 시작해보세요</Text>
              <Text style={styles.emptyText}>메시지와 사진으로 크루의 순간을 나눠보세요.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.authorId === uid;
            const messageReactions = reactionsByMessage.get(item.id) ?? [];
            const reactionCounts = ROOT_CREW_CHAT_REACTION_EMOJIS.map((emoji) => ({
              emoji,
              count: messageReactions.filter((reaction) => reaction.emoji === emoji).length,
              mine: messageReactions.some(
                (reaction) => reaction.emoji === emoji && reaction.userId === uid
              ),
            })).filter((reaction) => reaction.count > 0);

            return (
              <Pressable
                style={[styles.messageRow, mine && styles.myMessageRow]}
                onLongPress={() => setActionMessage(item)}
                delayLongPress={350}
              >
                {!mine ? <Text style={styles.avatar}>{item.authorEmoji || '🌱'}</Text> : null}
                <View style={styles.messageColumn}>
                  {!mine ? (
                    <Text style={styles.nickname}>{item.authorNickname || '루트유저'}</Text>
                  ) : null}
                  <View style={[styles.bubble, mine ? styles.myBubble : styles.otherBubble]}>
                    {item.replyTo ? (
                      <View style={styles.replyQuote}>
                        <Text style={styles.replyAuthor}>{item.replyTo.authorNickname}</Text>
                        <Text style={styles.replyText} numberOfLines={2}>{item.replyTo.text}</Text>
                      </View>
                    ) : null}
                    {item.image?.downloadUrl ? (
                      <Pressable onPress={() => setSelectedImageUrl(item.image?.downloadUrl ?? null)}>
                        <Image
                          source={{ uri: item.image.downloadUrl }}
                          style={styles.messageImage}
                          resizeMode="cover"
                        />
                        <View style={styles.expandBadge}>
                          <Ionicons name="expand-outline" size={15} color="#fff" />
                        </View>
                      </Pressable>
                    ) : null}
                    {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
                  </View>
                  {reactionCounts.length > 0 ? (
                    <View style={[styles.reactionList, mine && styles.myReactionList]}>
                      {reactionCounts.map((reaction) => (
                        <Pressable
                          key={reaction.emoji}
                          style={[styles.reactionChip, reaction.mine && styles.myReactionChip]}
                          onPress={() => void handleReaction(item, reaction.emoji)}
                        >
                          <Text style={styles.reactionText}>
                            {reaction.emoji} {reaction.count}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <Text style={[styles.time, mine && styles.myTime]}>
                    {formatMessageTime(item.createdAt)} · 길게 눌러 메뉴
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />

        {replyTarget ? (
          <View style={styles.composerPreview}>
            <View style={styles.previewCopy}>
              <Text style={styles.previewLabel}>{replyTarget.authorNickname}에게 답장</Text>
              <Text style={styles.previewText} numberOfLines={1}>
                {replyTarget.text || '사진'}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTarget(null)}>
              <Ionicons name="close" size={22} color="#755231" />
            </Pressable>
          </View>
        ) : null}
        {imageDraft ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageDraft.localUri }} style={styles.previewImage} />
            <Text style={styles.imagePreviewText}>사진 1장 · 최대 10MB</Text>
            <Pressable onPress={() => setImageDraft(null)}>
              <Ionicons name="close-circle" size={24} color="#755231" />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composer}>
          <Pressable style={styles.photoButton} onPress={() => void handlePickImage()}>
            <Ionicons name="image-outline" size={23} color="#6d421f" />
          </Pressable>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="메시지 또는 사진 보내기"
              placeholderTextColor="#a68158"
              multiline
              maxLength={ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH}
            />
            <Text style={styles.counter}>{text.length}/{ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH}</Text>
          </View>
          <Pressable
            style={[
              styles.sendButton,
              (sending || (!text.trim() && !imageDraft)) && styles.sendButtonDisabled,
            ]}
            disabled={sending || (!text.trim() && !imageDraft)}
            onPress={() => void handleSend()}
          >
            <Ionicons name="arrow-up" size={22} color="#fffaf2" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={Boolean(actionMessage)} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setActionMessage(null)}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>메시지 메뉴</Text>
            <View style={styles.emojiRow}>
              {ROOT_CREW_CHAT_REACTION_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => actionMessage && void handleReaction(actionMessage, emoji)}
                >
                  <Text style={styles.emojiButtonText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.sheetButton}
              onPress={() => {
                setReplyTarget(actionMessage);
                setActionMessage(null);
              }}
            >
              <Text style={styles.sheetButtonText}>↩ 답장하기</Text>
            </Pressable>
            {actionMessage?.authorId !== uid ? (
              <Pressable
                style={styles.sheetButton}
                onPress={() => {
                  setReportMessage(actionMessage);
                  setActionMessage(null);
                }}
              >
                <Text style={styles.reportButtonText}>⚑ 신고하기</Text>
              </Pressable>
            ) : null}
            {actionMessage && (actionMessage.authorId === uid || isOwner) ? (
              <Pressable
                style={styles.sheetButton}
                onPress={() => confirmDelete(actionMessage)}
              >
                <Text style={styles.deleteButtonText}>메시지 삭제</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={Boolean(reportMessage)} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setReportMessage(null)}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>신고 사유를 선택해주세요</Text>
            {REPORT_OPTIONS.map((option) => (
              <Pressable
                key={option.reason}
                style={styles.sheetButton}
                onPress={() => reportMessage && void handleReport(reportMessage, option.reason)}
              >
                <Text style={styles.sheetButtonText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(selectedImageUrl)}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.fullscreenViewer}>
          <Pressable
            accessibilityLabel="사진 닫기"
            style={styles.fullscreenClose}
            onPress={() => setSelectedImageUrl(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {selectedImageUrl ? (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.fullscreenHint}>화면에 맞춰 원본 비율로 표시돼요.</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f0e5' },
  container: { flex: 1 },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28,
    backgroundColor: '#f7f0e5',
  },
  header: {
    minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#dfc28e', backgroundColor: '#fffaf2',
  },
  headerBack: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, paddingRight: 42, alignItems: 'center' },
  moderationButton: { position: 'absolute', right: 9, minWidth: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  moderationButtonText: { marginTop: 1, fontSize: 9, fontWeight: '900', color: '#6d421f' },
  title: { maxWidth: '100%', fontSize: 18, fontWeight: '900', color: '#3d2515' },
  memberCount: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#8a6a3a' },
  notice: {
    marginHorizontal: 14, marginTop: 10, paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1, borderColor: '#dfc28e', backgroundColor: '#fff3cf',
  },
  noticeLabel: { fontSize: 12, fontWeight: '900', color: '#7a4c1f' },
  noticeText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: '#5f4125' },
  unreadText: { paddingHorizontal: 18, paddingTop: 8, color: '#986520', fontSize: 12 },
  errorText: { paddingHorizontal: 18, paddingTop: 8, color: '#b44b3b', fontSize: 12 },
  list: { flex: 1 },
  messageList: { paddingHorizontal: 14, paddingVertical: 14 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyMessages: { alignItems: 'center', padding: 28 },
  emptyMessagesEmoji: { fontSize: 34, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#4a2f1c' },
  emptyText: { marginTop: 8, textAlign: 'center', lineHeight: 20, color: '#806245' },
  backButton: { marginTop: 18, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#6f4626' },
  backButtonText: { color: '#fffaf2', fontWeight: '900' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6, paddingRight: 52 },
  myMessageRow: { justifyContent: 'flex-end', paddingRight: 0, paddingLeft: 52 },
  avatar: { width: 34, marginRight: 7, fontSize: 25, textAlign: 'center' },
  messageColumn: { maxWidth: '100%' },
  nickname: { marginBottom: 4, fontSize: 12, fontWeight: '800', color: '#705034' },
  bubble: { maxWidth: 270, borderRadius: 17, padding: 10 },
  otherBubble: { borderTopLeftRadius: 5, backgroundColor: '#fffaf2' },
  myBubble: { alignSelf: 'flex-end', borderTopRightRadius: 5, backgroundColor: '#f4cc79' },
  messageText: { fontSize: 15, lineHeight: 21, color: '#3f2b1d' },
  messageImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 7, backgroundColor: '#eadbc5' },
  expandBadge: { position: 'absolute', right: 7, top: 7, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20, 14, 10, 0.62)' },
  replyQuote: { borderLeftWidth: 3, borderLeftColor: '#b98745', paddingLeft: 8, marginBottom: 8 },
  replyAuthor: { fontSize: 11, fontWeight: '900', color: '#6f4626' },
  replyText: { marginTop: 2, fontSize: 11, color: '#765b42' },
  time: { marginTop: 3, fontSize: 10, color: '#9a8068' },
  myTime: { textAlign: 'right' },
  reactionList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 },
  myReactionList: { justifyContent: 'flex-end' },
  reactionChip: { borderWidth: 1, borderColor: '#dcc5a5', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#fffaf2' },
  myReactionChip: { borderColor: '#b77b31', backgroundColor: '#fff0cb' },
  reactionText: { fontSize: 11, color: '#5d4128' },
  composerPreview: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, padding: 10, borderRadius: 12, backgroundColor: '#fff3cf' },
  previewCopy: { flex: 1 },
  previewLabel: { fontSize: 11, fontWeight: '900', color: '#70461f' },
  previewText: { marginTop: 2, fontSize: 12, color: '#806245' },
  imagePreview: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 6, padding: 8, borderRadius: 12, backgroundColor: '#fffaf2' },
  previewImage: { width: 48, height: 48, borderRadius: 9, backgroundColor: '#eadbc5' },
  imagePreviewText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#765b42' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingHorizontal: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#dfc28e', backgroundColor: '#fffaf2' },
  photoButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5e3c2' },
  inputBox: { flex: 1, minHeight: 44, maxHeight: 112, borderWidth: 1, borderColor: '#dfc28e', borderRadius: 18, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 17, backgroundColor: '#fffdf8' },
  input: { minHeight: 24, maxHeight: 75, padding: 0, fontSize: 14, color: '#3f2b1d' },
  counter: { position: 'absolute', right: 10, bottom: 4, fontSize: 9, color: '#a18467' },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6f4626' },
  sendButtonDisabled: { opacity: 0.35 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 16, backgroundColor: 'rgba(37, 24, 15, 0.45)' },
  actionSheet: { borderRadius: 22, padding: 16, backgroundColor: '#fffaf2' },
  sheetTitle: { marginBottom: 12, fontSize: 16, fontWeight: '900', color: '#402918', textAlign: 'center' },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  emojiButton: { width: 48, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#f7ead3' },
  emojiButtonText: { fontSize: 24 },
  sheetButton: { minHeight: 44, justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#ead8bc' },
  sheetButtonText: { fontSize: 14, fontWeight: '800', color: '#4e3522', textAlign: 'center' },
  reportButtonText: { fontSize: 14, fontWeight: '800', color: '#9b6424', textAlign: 'center' },
  deleteButtonText: { fontSize: 14, fontWeight: '800', color: '#b14235', textAlign: 'center' },
  fullscreenViewer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090705' },
  fullscreenImage: { width: '100%', height: '100%' },
  fullscreenClose: { position: 'absolute', zIndex: 2, top: 48, right: 18, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.58)' },
  fullscreenHint: { position: 'absolute', bottom: 36, color: '#fff', fontSize: 12, opacity: 0.82 },
});
