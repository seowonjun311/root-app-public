// ROOT_CREW_CHAT_V1_SCREEN

import {
  Ionicons,
} from '@expo/vector-icons';
import {
  getAuth,
} from '@react-native-firebase/auth';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  getRootCrewChatLastReadAt,
  markRootCrewChatRead,
  ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH,
  sendRootCrewChatMessage,
  subscribeRootCrewChatMessages,
  deleteRootCrewChatMessage,
  type RootCrewChatMessage,
} from '../store/rootCrewChat';
import {
  getRootCrews,
  getRootOnboardingData,
  subscribeRootCrews,
} from '../store/rootMemory';

function formatMessageTime(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(
    date
  );
}

export default function CrewChatScreen() {
  const params =
    useLocalSearchParams<{
      id?: string;
    }>();
  const crewId =
    String(
      params.id ?? ''
    );
  const authUser =
    getAuth().currentUser;
  const profile =
    getRootOnboardingData();
  const uid =
    authUser?.uid ?? '';
  const [crew, setCrew] =
    useState<any>(
      getRootCrews().find(
        (
          item: any
        ) =>
          String(
            item?.id ?? ''
          ) === crewId
      ) ?? null
    );
  const [messages, setMessages] =
    useState<RootCrewChatMessage[]>([]);
  const [text, setText] =
    useState('');
  const [loading, setLoading] =
    useState(true);
  const [sending, setSending] =
    useState(false);
  const [error, setError] =
    useState('');
  const [initialUnreadCount, setInitialUnreadCount] =
    useState(0);
  const didReadInitialSnapshotRef =
    useRef(false);

  const isMember =
    useMemo(
      () =>
        Boolean(
          uid &&
          crew?.memberIds?.some(
            (
              memberId: unknown
            ) =>
              String(
                memberId
              ) === uid
          )
        ),
      [crew?.memberIds, uid]
    );

  const isOwner =
    crew?.ownerId === uid;

  useEffect(
    () => {
      const unsubscribe =
        subscribeRootCrews(
          (
            crews
          ) => {
            setCrew(
              crews.find(
                (
                  item
                ) =>
                  String(
                    item.id
                  ) === crewId
              ) ?? null
            );
          }
        );

      return () => {
        unsubscribe?.();
      };
    },
    [crewId]
  );

  useEffect(
    () => {
      if (
        !crewId ||
        !uid ||
        !isMember
      ) {
        setLoading(false);
        return;
      }

      const unsubscribe =
        subscribeRootCrewChatMessages(
          crewId,
          (
            nextMessages
          ) => {
            setMessages(
              nextMessages
            );
            setLoading(false);

            if (
              !didReadInitialSnapshotRef.current
            ) {
              didReadInitialSnapshotRef.current =
                true;

              void getRootCrewChatLastReadAt(
                uid,
                crewId
              ).then(
                (
                  lastReadAt
                ) => {
                  const unread =
                    nextMessages.filter(
                      (
                        message
                      ) =>
                        message.authorId !== uid &&
                        Date.parse(
                          message.createdAt
                        ) > lastReadAt
                    ).length;

                  setInitialUnreadCount(
                    unread
                  );
                  return markRootCrewChatRead(
                    uid,
                    crewId
                  );
                }
              );
            } else {
              void markRootCrewChatRead(
                uid,
                crewId
              );
            }
          },
          () => {
            setLoading(false);
            setError(
              '크루 대화를 불러오지 못했어요. 멤버 권한과 인터넷 연결을 확인해주세요.'
            );
          }
        );

      return () => {
        unsubscribe?.();
      };
    },
    [crewId, isMember, uid]
  );

  const handleSend =
    async () => {
      if (
        sending
      ) {
        return;
      }

      setSending(true);
      setError('');

      try {
        await sendRootCrewChatMessage(
          crewId,
          text,
          {
            nickname:
              profile?.nickname ??
              profile?.displayName,
            profileEmoji:
              profile?.profileEmoji,
          }
        );
        setText('');
      } catch (
        sendError
      ) {
        setError(
          sendError instanceof Error
            ? sendError.message
            : '메시지를 보내지 못했어요.'
        );
      } finally {
        setSending(false);
      }
    };

  const confirmDelete =
    (
      message: RootCrewChatMessage
    ) => {
      const canDelete =
        message.authorId === uid ||
        isOwner;

      if (
        !canDelete
      ) {
        return;
      }

      Alert.alert(
        '메시지 삭제',
        '이 메시지를 삭제할까요?',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              void deleteRootCrewChatMessage(
                crewId,
                message.id
              ).catch(
                () => {
                  setError(
                    '메시지를 삭제하지 못했어요.'
                  );
                }
              );
            },
          },
        ]
      );
    };

  if (
    !uid
  ) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>
          로그인이 필요해요
        </Text>
        <Text style={styles.emptyText}>
          게스트는 크루 대화에 참여할 수 없어요.
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            돌아가기
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (
    !loading &&
    !isMember
  ) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>
          크루 멤버 전용 대화예요
        </Text>
        <Text style={styles.emptyText}>
          가입이 승인된 활성 멤버만 대화를 볼 수 있어요.
        </Text>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            돌아가기
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
            style={styles.headerBack}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#5f3b1b"
            />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text
              style={styles.title}
              numberOfLines={1}
            >
              {crew?.title ?? '크루 대화'}
            </Text>
            <Text style={styles.memberCount}>
              멤버 {crew?.memberIds?.length ?? 0}명 · 멤버 전용
            </Text>
          </View>
        </View>

        {crew?.notice?.trim() ? (
          <View style={styles.notice}>
            <Text style={styles.noticeLabel}>
              📌 크루 공지
            </Text>
            <Text
              style={styles.noticeText}
              numberOfLines={3}
            >
              {crew.notice}
            </Text>
          </View>
        ) : null}

        {initialUnreadCount > 0 ? (
          <Text style={styles.unreadText}>
            여기부터 읽지 않은 메시지 {initialUnreadCount}개예요.
          </Text>
        ) : null}

        {error ? (
          <Text style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        <FlatList
          style={styles.list}
          contentContainerStyle={
            messages.length === 0
              ? styles.emptyList
              : styles.messageList
          }
          data={messages}
          inverted
          keyExtractor={(
            item
          ) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesEmoji}>
                💬
              </Text>
              <Text style={styles.emptyTitle}>
                첫 대화를 시작해보세요
              </Text>
              <Text style={styles.emptyText}>
                오늘의 목표나 같이 가고 싶은 장소를 이야기해보세요.
              </Text>
            </View>
          }
          renderItem={({
            item,
          }) => {
            const mine =
              item.authorId === uid;

            return (
              <Pressable
                style={[
                  styles.messageRow,
                  mine && styles.myMessageRow,
                ]}
                onLongPress={() =>
                  confirmDelete(
                    item
                  )
                }
                delayLongPress={450}
              >
                {!mine ? (
                  <Text style={styles.avatar}>
                    {item.authorEmoji || '🌱'}
                  </Text>
                ) : null}
                <View style={styles.messageColumn}>
                  {!mine ? (
                    <Text style={styles.nickname}>
                      {item.authorNickname || '루트유저'}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      mine
                        ? styles.myBubble
                        : styles.otherBubble,
                    ]}
                  >
                    <Text style={styles.messageText}>
                      {item.text}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.time,
                      mine && styles.myTime,
                    ]}
                  >
                    {formatMessageTime(
                      item.createdAt
                    )}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />

        <View style={styles.composer}>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="크루에게 메시지 보내기"
              placeholderTextColor="#a68158"
              multiline
              maxLength={ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH}
            />
            <Text style={styles.counter}>
              {text.length}/{ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH}
            </Text>
          </View>
          <Pressable
            style={[
              styles.sendButton,
              (
                sending ||
                !text.trim()
              ) && styles.sendButtonDisabled,
            ]}
            disabled={
              sending ||
              !text.trim()
            }
            onPress={() => {
              void handleSend();
            }}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color="#fffaf2"
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f0e5',
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#f7f0e5',
  },
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#dfc28e',
    backgroundColor: '#fffaf2',
  },
  headerBack: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 42,
    alignItems: 'center',
  },
  title: {
    maxWidth: '100%',
    fontSize: 18,
    fontWeight: '900',
    color: '#3d2515',
  },
  memberCount: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#8a6a3a',
  },
  notice: {
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfc28e',
    backgroundColor: '#fff3cf',
  },
  noticeLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7a4c1f',
  },
  noticeText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#5f3b1b',
  },
  unreadText: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#ead7b7',
    color: '#6b3514',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    marginHorizontal: 14,
    marginTop: 8,
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyMessages: {
    alignItems: 'center',
    padding: 28,
    transform: [
      {
        rotate: '180deg',
      },
    ],
  },
  emptyMessagesEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#3d2515',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#8a6a3a',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#7a4c1f',
  },
  backButtonText: {
    color: '#fffaf2',
    fontWeight: '900',
  },
  messageRow: {
    maxWidth: '86%',
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  myMessageRow: {
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 34,
    marginRight: 7,
    fontSize: 25,
    textAlign: 'center',
  },
  messageColumn: {
    flexShrink: 1,
  },
  nickname: {
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#6b3514',
  },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#c9982d',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#fffaf2',
    borderWidth: 1,
    borderColor: '#ead7b7',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: '#3d2515',
  },
  time: {
    marginTop: 3,
    fontSize: 10,
    color: '#9a7a55',
  },
  myTime: {
    textAlign: 'right',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'android' ? 10 : 8,
    borderTopWidth: 1,
    borderTopColor: '#dfc28e',
    backgroundColor: '#fffaf2',
  },
  inputBox: {
    flex: 1,
    minHeight: 46,
    maxHeight: 126,
    paddingLeft: 13,
    paddingRight: 8,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8b56c',
    backgroundColor: '#fff',
  },
  input: {
    minHeight: 24,
    maxHeight: 82,
    padding: 0,
    color: '#3d2515',
    fontSize: 15,
  },
  counter: {
    marginTop: 2,
    fontSize: 9,
    color: '#a68158',
    textAlign: 'right',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7a4c1f',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
