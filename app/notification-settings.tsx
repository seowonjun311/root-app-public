import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  loadRootOnboardingData,
  setRootNotifications,
} from '../store/rootMemory';
import { useRootTheme } from '../store/rootTheme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

type RootNotificationItem = {
  id: string;
  hour: number;
  minute: number;
  days: number[];
  message: string;
  notificationIds?: string[];
};

async function loadSavedNotifications(): Promise<RootNotificationItem[]> {
  const data = await loadRootOnboardingData();

  return data?.notifications ?? [];
}

async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();

  let status = current.status;

  if (status !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }

  if (status !== 'granted') {
    Alert.alert(
      '알림 권한 필요',
      '알림을 받으려면 휴대폰 설정에서 알림 권한을 허용해 주세요.'
    );
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('root-reminder', {
      name: '루트 알림',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return true;
}

async function scheduleRootNotification(
  hour: number,
  minute: number,
  days: number[],
  message: string
) {
  const notificationIds: string[] = [];

  for (const day of days) {
    // 앱 요일: 월=1, 화=2 ... 일=7
    // Expo WEEKLY 요일: 일=1, 월=2 ... 토=7
    const expoWeekday = day === 7 ? 1 : day + 1;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '루트',
        body: message || '목표를 시작할 시간이에요',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: expoWeekday,
        hour,
        minute,
        channelId: 'root-reminder',
      },
    });

    notificationIds.push(id);
  }

  return notificationIds;
}

export default function NotificationSettingsScreen() {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';

  const [notifications, setNotifications] =
    useState<RootNotificationItem[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);

  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [message, setMessage] = useState('');
  const [selectedDays, setSelectedDays] =
    useState([1, 2, 3, 4, 5]);

  useFocusEffect(
    useCallback(() => {
      const loadNotifications = async () => {
        const saved = await loadSavedNotifications();
        setNotifications(saved);
      };

      loadNotifications();
    }, [])
  );

  const openAddModal = () => {
    setHour(9);
    setMinute(0);
    setMessage('');
    setSelectedDays([1, 2, 3, 4, 5]);
    setModalVisible(true);
  };

  const saveNotification = async () => {
    if (selectedDays.length === 0) {
      Alert.alert(
        '요일 선택',
        '알림을 받을 요일을 하나 이상 선택해 주세요.'
      );
      return;
    }

    const allowed = await requestNotificationPermission();

    if (!allowed) return;

    try {
      const notificationIds = await scheduleRootNotification(
        hour,
        minute,
        selectedDays,
        message.trim()
      );

      const next: RootNotificationItem[] = [
        ...notifications,
        {
          id: Date.now().toString(),
          hour,
          minute,
          days: [...selectedDays].sort((a, b) => a - b),
          message: message.trim(),
          notificationIds,
        },
      ];

      setNotifications(next);
      await setRootNotifications(next);

      setModalVisible(false);
      setCompleteModal(true);
    } catch (error: any) {
      console.log('ROOT NOTIFICATION SAVE ERROR', error);

      Alert.alert(
        '알림 저장 실패',
        error?.message ?? '알림을 저장하지 못했어요.'
      );
    }
  };

  const removeNotification = async (id: string) => {
    const target = notifications.find(
      (item) => item.id === id
    );

    try {
      if (target?.notificationIds?.length) {
        await Promise.all(
          target.notificationIds.map((notificationId) =>
            Notifications.cancelScheduledNotificationAsync(
              notificationId
            )
          )
        );
      }

      const next = notifications.filter(
        (item) => item.id !== id
      );

      setNotifications(next);
      await setRootNotifications(next);
    } catch (error: any) {
      console.log('ROOT NOTIFICATION DELETE ERROR', error);

      Alert.alert(
        '알림 삭제 실패',
        error?.message ?? '알림을 삭제하지 못했어요.'
      );
    }
  };
const modalBoxTheme = {
  backgroundColor:
    theme.card,

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 16,
};

const primaryButtonTheme = {
  backgroundColor:
    'transparent',

  borderColor:
    theme.strongLine,

  borderWidth:
    1,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
};

const secondaryButtonTheme = {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
};

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: theme.text },
            ]}
          >
             알림 설정
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={[
              styles.closeButton,
              {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
},
            ]}
          >
            <Ionicons
  name="arrow-back"
  size={19}
  color={theme.text}
/>
          </Pressable>
        </View>

        {notifications.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
},
            ]}
          >
            <Text style={styles.emptyIcon}>
              🔕
            </Text>

            <Text
              style={[
                styles.emptyTitle,
                { color: theme.text },
              ]}
            >
              설정된 알림이 없습니다.
            </Text>

            <Text
              style={[
                styles.emptyDesc,
                { color: theme.subText },
              ]}
            >
              알림을 추가하면 목표 달성을 도와드려요.
            </Text>

            <Pressable
              style={[
                styles.addButton,
                primaryButtonTheme,
              ]}
              onPress={openAddModal}
            >
              <Text
  style={[
    styles.addButtonText,
    {
      color:
        theme.text,
    },
  ]}
>
  알림 추가
</Text>
            </Pressable>

            <View
              style={[
                styles.infoBox,
                {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
},
              ]}
            >
              <Text
  style={[
    styles.infoText,
    {
      color:
        theme.subText,
    },
  ]}
>
  선택한 요일과 시간마다 반복 알림이 울려요.
</Text>
            </View>
          </View>
        ) : (
          <>
            {notifications.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
},
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text
                    style={[
                      styles.time,
                      { color: theme.text },
                    ]}
                  >
                    {String(item.hour).padStart(2, '0')}:
                    {String(item.minute).padStart(2, '0')}
                  </Text>

                  <Pressable
                    style={[
                      styles.deleteButton,
                      {
  backgroundColor:
    'transparent',

  borderColor:
    theme.danger,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 8,
},
                    ]}
                    onPress={() =>
                      removeNotification(item.id)
                    }
                  >
                    <Text
                      style={[
                        styles.deleteText,
                        { color: theme.danger },
                      ]}
                    >
                      삭제
                    </Text>
                  </Pressable>
                </View>

                <Text
                  style={[
                    styles.days,
                    { color: theme.subText },
                  ]}
                >
                  {item.days
                    .map(
                      (day) =>
                        DAYS[day - 1]
                    )
                    .join(' · ')}
                </Text>

                <Text
                  style={[
                    styles.message,
                    { color: theme.text },
                  ]}
                >
                  {item.message ||
                    '목표를 시작할 시간이에요'}
                </Text>
              </View>
            ))}

            <Pressable
              style={[
                styles.addButton,
                primaryButtonTheme,
              ]}
              onPress={openAddModal}
            >
              <Text
  style={[
    styles.addButtonText,
    {
      color:
        theme.text,
    },
  ]}
>
  알림 추가
</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
        >
          <View style={styles.modalBg}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              <View
                style={[
                  styles.modal,
                  modalBoxTheme,
                ]}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.text },
                  ]}
                >
                   알림 설정
                </Text>

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text },
                  ]}
                >
                  ⏰ 시간 설정
                </Text>

                <View
                  style={[
                    styles.timePickerBox,
                    {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
},
                  ]}
                >
                  <ScrollView
                    style={styles.timeScroll}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {Array.from({ length: 24 }).map(
                      (_, index) => {
                        const selected =
                          hour === index;

                        return (
                          <Pressable
                            key={index}
                            onPress={() =>
                              setHour(index)
                            }
                            style={[
                              styles.timeOption,
                              {
  backgroundColor:
    'transparent',

  borderColor:
    selected
      ? theme.strongLine
      : 'transparent',

  borderWidth:
    selected
      ? 1
      : 0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 8,
},
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeOptionText,
                                {
  color:
    selected
      ? theme.text
      : theme.subText,

  fontSize:
    selected
      ? 18
      : 15,

  fontWeight:
    selected
      ? '900'
      : '700',
},
                              ]}
                            >
                              {String(index).padStart(
                                2,
                                '0'
                              )}
                            </Text>
                          </Pressable>
                        );
                      }
                    )}
                  </ScrollView>

                  <Text
                    style={[
                      styles.colon,
                      { color: theme.text },
                    ]}
                  >
                    :
                  </Text>

                  <ScrollView
                    style={styles.timeScroll}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    {Array.from({ length: 60 }).map(
                      (_, index) => {
                        const selected =
                          minute === index;

                        return (
                          <Pressable
  key={index}
  onPress={() =>
    setMinute(index)
  }
  style={[
    styles.timeOption,
    {
      backgroundColor:
        'transparent',

      borderColor:
        selected
          ? theme.strongLine
          : 'transparent',

      borderWidth:
        selected
          ? 1
          : 0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 8,
    },
  ]}
>
  <Text
    style={[
      styles.timeOptionText,
      {
        color:
          selected
            ? theme.text
            : theme.subText,

        fontSize:
          selected
            ? 18
            : 15,

        fontWeight:
          selected
            ? '900'
            : '700',
      },
    ]}
  >
    {String(index).padStart(
      2,
      '0'
    )}
  </Text>
</Pressable>
                        );
                      }
                    )}
                  </ScrollView>
                </View>

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text },
                  ]}
                >
                  📅 요일 설정
                </Text>

                <View style={styles.dayRow}>
                  {DAYS.map((day, index) => {
                    const value = index + 1;
                    const active =
                      selectedDays.includes(value);

                    return (
                      <Pressable
                        key={day}
                        style={[
                           styles.dayButton,
                          {
  backgroundColor:
    'transparent',

  borderColor:
    active
      ? theme.strongLine
      : theme.line,

  borderWidth:
    active
      ? 1
      : 0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 8,
},
                        ]}
                        onPress={() => {
                          if (active) {
                            setSelectedDays(
                              selectedDays.filter(
                                (selectedDay) =>
                                  selectedDay !== value
                              )
                            );
                          } else {
                            setSelectedDays([
                              ...selectedDays,
                              value,
                            ]);
                          }
                        }}
                      >
                        <Text
                          style={[
                            active
                              ? styles.dayTextActive
                              : styles.dayText,
                            {
                              color:
    theme.text,
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text },
                  ]}
                >
                  💬 메시지
                </Text>

                <TextInput
                  style={[
                    styles.messageInput,
                    {
  backgroundColor:
    theme.card,

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  color:
    theme.text,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
},
                  ]}
                  value={message}
                  maxLength={20}
                  onChangeText={setMessage}
                  placeholder="20자 이내 알림 메시지"
                  placeholderTextColor={theme.subText}
                />

                <Pressable
                  style={[
                    styles.confirmButton,
                    primaryButtonTheme,
                  ]}
                  onPress={saveNotification}
                >
                  <Text
  style={[
    styles.confirmText,
    {
      color:
        theme.text,
    },
  ]}
>
  확인
</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.cancelButton,
                    secondaryButtonTheme,
                  ]}
                  onPress={() =>
                    setModalVisible(false)
                  }
                >
                  <Text
                    style={[
                      styles.cancelText,
                      { color: theme.text },
                    ]}
                  >
                    취소
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={completeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteModal(false)}
      >
        <Pressable
          style={styles.completeOverlay}
          onPress={() => setCompleteModal(false)}
        >
          <Pressable
            style={[
              styles.completeBox,
              {
  backgroundColor:
    theme.card,

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 16,
},
            ]}
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <Text
              style={[
                styles.completeTitle,
                { color: theme.text },
              ]}
            >
               알림 설정 완료
            </Text>

            <Text
              style={[
                styles.completeDesc,
                { color: theme.subText },
              ]}
            >
              설정한 요일과 시간에 알림이 울려요.
            </Text>

            <Pressable
              style={[
                styles.completeButton,
                primaryButtonTheme,
              ]}
              onPress={() =>
                setCompleteModal(false)
              }
            >
              <Text
  style={[
    styles.completeButtonText,
    {
      color:
        theme.text,
    },
  ]}
>
  확인
</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
 
container: {
  flex: 1,

  paddingHorizontal: 18,

  paddingTop:
    Platform.OS === 'android'
      ? 28
      : 14,
},

header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',

  marginBottom: 12,
},

title: {
  flex: 1,

  fontSize: 24,
  fontWeight: '900',
},

closeButton: {
  width: 34,
  height: 34,

  justifyContent: 'center',
  alignItems: 'center',
},

emptyContainer: {
  alignItems: 'center',

  marginTop: 26,

  paddingHorizontal: 18,
  paddingVertical: 22,

  borderWidth: 0.5,
},

emptyIcon: {
  fontSize: 38,
},

emptyTitle: {
  marginTop: 8,

  fontSize: 18,
  fontWeight: '900',

  textAlign: 'center',
},

emptyDesc: {
  marginTop: 6,

  fontSize: 13,
  fontWeight: '700',
  lineHeight: 19,

  textAlign: 'center',
},

addButton: {
  alignSelf: 'center',

  minWidth: 120,
  height: 40,

  marginTop: 16,
  paddingHorizontal: 18,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

addButtonText: {
  fontSize: 14,
  fontWeight: '900',
},

infoBox: {
  width: '100%',

  marginTop: 18,
  paddingHorizontal: 12,
  paddingVertical: 11,

  borderWidth: 0.5,
},

infoText: {
  fontSize: 12,
  fontWeight: '700',
  lineHeight: 18,

  textAlign: 'center',
},

card: {
  minHeight: 76,

  paddingHorizontal: 13,
  paddingVertical: 11,

  marginBottom: 8,

  borderWidth: 0.5,
},

cardTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

time: {
  fontSize: 18,
  fontWeight: '900',
},

days: {
  marginTop: 5,

  fontSize: 11,
  fontWeight: '800',
},

message: {
  marginTop: 5,

  fontSize: 13,
  fontWeight: '800',
  lineHeight: 18,
},

deleteButton: {
  minWidth: 48,
  height: 30,

  paddingHorizontal: 10,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

deleteText: {
  fontSize: 12,
  fontWeight: '900',
},

modalBg: {
  flex: 1,

  justifyContent: 'center',

  backgroundColor:
    'rgba(0,0,0,0.35)',
},

modalScrollContent: {
  flexGrow: 1,

  justifyContent: 'center',

  paddingVertical: 32,
},

modal: {
  marginHorizontal: 18,

  paddingHorizontal: 20,
  paddingVertical: 20,
},

modalTitle: {
  marginBottom: 18,

  fontSize: 20,
  fontWeight: '900',

  textAlign: 'center',
},

sectionTitle: {
  marginBottom: 8,

  fontSize: 15,
  fontWeight: '900',
},

timePickerBox: {
  height: 130,

  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',

  marginBottom: 18,
  paddingHorizontal: 18,

  borderWidth: 0.5,
},

timeScroll: {
  width: 72,
  height: 110,
},

timeOption: {
  height: 34,

  justifyContent: 'center',
  alignItems: 'center',
},

timeOptionText: {
  fontSize: 16,
},

colon: {
  marginHorizontal: 8,

  fontSize: 21,
  fontWeight: '900',
},

dayRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',

  gap: 4,
  marginBottom: 18,
},

dayButton: {
  flex: 1,
  height: 32,

  justifyContent: 'center',
  alignItems: 'center',
},

dayText: {
  fontSize: 12,
  fontWeight: '800',
},

dayTextActive: {
  fontSize: 12,
  fontWeight: '900',
},

messageInput: {
  height: 42,

  marginBottom: 16,

  paddingHorizontal: 12,
  paddingVertical: 0,

  fontSize: 14,
  fontWeight: '700',
},

confirmButton: {
  height: 40,

  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

confirmText: {
  fontSize: 14,
  fontWeight: '900',
},

cancelButton: {
  height: 40,

  marginTop: 8,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

cancelText: {
  fontSize: 14,
  fontWeight: '900',
},

completeOverlay: {
  flex: 1,

  backgroundColor:
    'rgba(0,0,0,0.35)',

  justifyContent: 'center',
  alignItems: 'center',

  paddingHorizontal: 20,
},

completeBox: {
  width: '86%',
  maxWidth: 420,

  paddingHorizontal: 20,
  paddingVertical: 20,

  borderWidth: 0.5,
},

completeTitle: {
  fontSize: 20,
  fontWeight: '900',

  textAlign: 'center',
},

completeDesc: {
  marginTop: 8,

  fontSize: 14,
  fontWeight: '700',
  lineHeight: 20,

  textAlign: 'center',
},

completeButton: {
  height: 40,

  marginTop: 18,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

completeButtonText: {
  fontSize: 14,
  fontWeight: '900',
},

});