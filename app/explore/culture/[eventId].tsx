import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
    router,
    useFocusEffect,
    useLocalSearchParams,
} from 'expo-router';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    completeExploration,
    loadLocalExplorationData,
} from '../../../store/explorationCloud';
import {
    FESTIVAL_AUDIENCE_LABELS,
    type FestivalAudience,
} from '../../../store/festivalCatalog';
import { useRootTheme } from '../../../store/rootTheme';
import {
    fetchSeoulCultureEvents,
    formatSeoulCultureDateLabel,
    getCachedSeoulCultureEvent,
    getSeoulCultureReservationLabel,
    getSeoulCultureSourceName,
    getSeoulCultureTypeIcon,
    getSeoulCultureTypeLabel,
    getSeoulCultureVenueTypeLabel,
    isSeoulCultureEventActive,
    type SeoulCultureEvent,
} from '../../../store/seoulCultureEvents';

function getDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371000;
  const toRadians = (value: number) =>
    (value * Math.PI) / 180;
  const deltaLatitude = toRadians(
    latitude2 - latitude1
  );
  const deltaLongitude = toRadians(
    longitude2 - longitude1
  );
  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}

function getEventStatusLabel(
  event: SeoulCultureEvent
) {
  const now = new Date();
  const start = new Date(
    `${event.startDate}T00:00:00+09:00`
  );
  const end = new Date(
    `${event.endDate}T23:59:59+09:00`
  );

  if (now.getTime() < start.getTime()) {
    return '예정';
  }

  if (now.getTime() <= end.getTime()) {
    return '진행 중';
  }

  return '종료';
}

function DetailRow({
  label,
  value,
  color,
  subColor,
}: {
  label: string;
  value: string;
  color: string;
  subColor: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.detailRow}>
      <Text
        style={[
          styles.detailLabel,
          { color: subColor },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.detailValue,
          { color },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function SeoulCultureDetailScreen() {
  const { eventId } = useLocalSearchParams<{
    eventId?: string | string[];
  }>();
  const resolvedEventId = Array.isArray(eventId)
    ? eventId[0]
    : eventId;
  const { theme, isCityBlack } = useRootTheme();
  const insets = useSafeAreaInsets();

  const [event, setEvent] =
    useState<SeoulCultureEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [completed, setCompleted] =
    useState(false);
  const [isVerifying, setIsVerifying] =
    useState(false);
  const [resultModal, setResultModal] =
    useState<{
      title: string;
      message: string;
      success?: boolean;
    } | null>(null);

  const audienceLabels = useMemo(
    () =>
      event
        ? event.audiences.map(
            (audience: FestivalAudience) =>
              FESTIVAL_AUDIENCE_LABELS[
                audience
              ]
          )
        : [],
    [event]
  );

  const loadEvent = useCallback(async () => {
    if (!resolvedEventId) {
      setLoading(false);
      setLoadError(
        '문화행사 식별값을 확인하지 못했어요.'
      );
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      let nextEvent =
        await getCachedSeoulCultureEvent(
          resolvedEventId
        );

      if (!nextEvent) {
        const result =
          await fetchSeoulCultureEvents();
        nextEvent =
          result.events.find(
            (item: SeoulCultureEvent) =>
              item.id === resolvedEventId
          ) ?? null;
      }

      setEvent(nextEvent);

      if (!nextEvent) {
        setLoadError(
          '저장된 문화행사를 찾지 못했어요. 목록을 새로고침한 뒤 다시 열어 주세요.'
        );
        return;
      }

      const exploration =
        await loadLocalExplorationData();
      setCompleted(
        exploration.visitedPlaceIds.includes(
          nextEvent.id
        )
      );
    } catch (error) {
      console.log(
        'SEOUL CULTURE DETAIL LOAD ERROR',
        error
      );
      setLoadError(
        error instanceof Error
          ? error.message
          : '문화행사 정보를 불러오지 못했어요.'
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedEventId]);

  useFocusEffect(
    useCallback(() => {
      void loadEvent();
    }, [loadEvent])
  );

  const saveCompletion = async (
    latitude: number,
    longitude: number,
    accuracyMeters: number,
    distanceMeters: number
  ) => {
    if (!event) {
      return false;
    }

    const before =
      await loadLocalExplorationData();
    const alreadyCompleted =
      before.visitedPlaceIds.includes(event.id);

    await completeExploration({
      placeId: event.id,
      verifiedAt: new Date().toISOString(),
      latitude,
      longitude,
      accuracyMeters,
      distanceMeters,
      points: event.rewardPoints,
      stampId: `stamp-${event.id}`,
      rewardId: `visit-${event.id}`,
    });

    const latest =
      await loadLocalExplorationData();
    const completedNow =
      latest.visitedPlaceIds.includes(event.id);
    setCompleted(completedNow);

    return !alreadyCompleted && completedNow;
  };

  const verifyCurrentLocation = async () => {
    if (!event) {
      return;
    }

    if (completed) {
      setResultModal({
        title: '이미 참여 완료했어요',
        message:
          '이 문화행사의 탐험 기록이 이미 저장되어 있어요.',
        success: true,
      });
      return;
    }

    if (!isSeoulCultureEventActive(event)) {
      setResultModal({
        title: '현재 인증 기간이 아니에요',
        message:
          `${event.startDate}부터 ${event.endDate}까지 행사 기간에만 GPS 인증할 수 있어요.`,
      });
      return;
    }

    if (
      event.latitude == null ||
      event.longitude == null
    ) {
      setResultModal({
        title: 'GPS 위치 확인 중',
        message:
          '서울 문화행사 데이터에 정확한 행사장 좌표가 없어 GPS 인증을 열지 않았어요. 행사 정보는 정상적으로 확인할 수 있어요.',
      });
      return;
    }

    try {
      setIsVerifying(true);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setResultModal({
          title: '위치 권한이 필요해요',
          message:
            '설정에서 위치 권한을 허용한 뒤 다시 시도해 주세요.',
        });
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      const accuracy = Number(
        location.coords.accuracy ?? 9999
      );

      if (accuracy > 100) {
        setResultModal({
          title: '현재 위치가 정확하지 않아요',
          message:
            `현재 GPS 오차는 약 ${Math.round(
              accuracy
            )}m예요. 야외에서 잠시 기다린 뒤 다시 시도해 주세요.`,
        });
        return;
      }

      const distance = getDistanceMeters(
        location.coords.latitude,
        location.coords.longitude,
        event.latitude,
        event.longitude
      );

      if (distance > event.radiusMeters) {
        setResultModal({
          title: '인증 범위 밖이에요',
          message:
            `${event.place}에서 약 ${Math.round(
              distance
            )}m 떨어져 있어요. 행사장에 도착한 뒤 다시 인증해 주세요.`,
        });
        return;
      }

      const rewarded = await saveCompletion(
        location.coords.latitude,
        location.coords.longitude,
        accuracy,
        distance
      );

      setResultModal({
        title: `${event.title} 참여 완료!`,
        message: rewarded
          ? `+${event.rewardPoints} 탐험 포인트와 문화행사 스탬프를 획득했어요.`
          : '이미 참여 보상을 획득한 문화행사예요.',
        success: true,
      });
    } catch (error) {
      console.log(
        'SEOUL CULTURE LOCATION ERROR',
        error
      );
      setResultModal({
        title: '위치 인증 실패',
        message:
          '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const openUrl = async (url: string) => {
    if (!url) {
      return;
    }

    try {
      const supported =
        await Linking.canOpenURL(url);

      if (!supported) {
        throw new Error('unsupported url');
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log(
        'SEOUL CULTURE OPEN URL ERROR',
        error
      );
      setResultModal({
        title: '링크를 열지 못했어요',
        message:
          '잠시 후 다시 시도하거나 행사명을 검색해 주세요.',
      });
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerScreen,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top,
          },
        ]}
      >
        <ActivityIndicator color={theme.text} />
        <Text
          style={[
            styles.loadingText,
            { color: theme.subText },
          ]}
        >
          서울 문화행사를 불러오고 있어요.
        </Text>
      </View>
    );
  }

  if (!event || loadError) {
    return (
      <View
        style={[
          styles.centerScreen,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top,
          },
        ]}
      >
        <Text
          style={[
            styles.emptyTitle,
            { color: theme.text },
          ]}
        >
          문화행사를 찾지 못했어요
        </Text>
        <Text
          style={[
            styles.emptyDescription,
            { color: theme.subText },
          ]}
        >
          {loadError ??
            '문화 목록에서 다시 열어 주세요.'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.simpleButton,
            {
              borderColor: theme.line,
              borderRadius: theme.radius.button,
            },
          ]}
        >
          <Text
            style={{
              color: theme.text,
              fontWeight: '800',
            }}
          >
            돌아가기
          </Text>
        </Pressable>
      </View>
    );
  }

  const officialLinks = [
    {
      label: '행사 공식 페이지',
      url: event.officialUrl,
    },
    {
      label: '서울문화포털 상세',
      url: event.culturePortalUrl,
    },
  ].filter((item) => Boolean(item.url));

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 45 + insets.bottom,
        }}
      >
        <View style={styles.header}>
          <Pressable
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={theme.text}
            />
          </Pressable>

          <View style={styles.headerTextBox}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.text },
              ]}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.subText },
              ]}
            >
              서울 · {event.districtName}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: completed
                  ? theme.button
                  : theme.card,
                borderColor: completed
                  ? theme.button
                  : theme.line,
                borderRadius: theme.radius.button,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: completed
                    ? theme.buttonText
                    : theme.subText,
                },
              ]}
            >
              {completed
                ? '완료'
                : getEventStatusLabel(event)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: theme.radius.card,
            },
          ]}
        >
          <Text style={styles.heroIcon}>
            {getSeoulCultureTypeIcon(
              event.contentType
            )}
          </Text>
          <Text
            style={[
              styles.eventName,
              { color: theme.text },
            ]}
          >
            {event.title}
          </Text>

          <View style={styles.tagRow}>
            <View
              style={[
                styles.tag,
                {
                  borderColor:
                    theme.strongLine ?? theme.line,
                  borderRadius: theme.radius.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: theme.text },
                ]}
              >
                {getSeoulCultureTypeLabel(
                  event.contentType
                )}
              </Text>
            </View>

            <View
              style={[
                styles.tag,
                {
                  borderColor: theme.line,
                  borderRadius: theme.radius.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: theme.subText },
                ]}
              >
                {event.rawCategory}
              </Text>
            </View>

            <View
              style={[
                styles.tag,
                {
                  borderColor: theme.line,
                  borderRadius: theme.radius.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: theme.subText },
                ]}
              >
                {event.isFree === true
                  ? '무료'
                  : event.isFree === false
                    ? '유료'
                    : '요금 확인'}
              </Text>
            </View>

            {audienceLabels.map((label: string) => (
              <View
                key={`${event.id}-${label}`}
                style={[
                  styles.tag,
                  {
                    borderColor: theme.line,
                    borderRadius:
                      theme.radius.button,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: theme.subText },
                  ]}
                >
                  추천 {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: theme.radius.card,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.text },
            ]}
          >
            일정과 관람 정보
          </Text>

          <DetailRow
            label="기간"
            value={`${event.startDate} ~ ${event.endDate} (${formatSeoulCultureDateLabel(
              event
            )})`}
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="시간"
            value={event.eventTime || '공식 안내 확인'}
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="장소"
            value={event.place}
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="장소 유형"
            value={getSeoulCultureVenueTypeLabel(
              event.venueType
            )}
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="대상"
            value={
              event.targetAudienceText ||
              '이용 대상 확인 필요'
            }
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="요금"
            value={event.feeText}
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="예약"
            value={getSeoulCultureReservationLabel(
              event.reservationStatus
            )}
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="주관"
            value={event.organizationName}
            color={theme.text}
            subColor={theme.subText}
          />
          <DetailRow
            label="문의"
            value={event.inquiry}
            color={theme.text}
            subColor={theme.subText}
          />
        </View>

        {(event.player ||
          event.program ||
          event.description) && (
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: theme.radius.card,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
              ]}
            >
              프로그램 상세
            </Text>

            <DetailRow
              label="출연"
              value={event.player}
              color={theme.text}
              subColor={theme.subText}
            />
            <DetailRow
              label="프로그램"
              value={event.program}
              color={theme.text}
              subColor={theme.subText}
            />
            <DetailRow
              label="안내"
              value={event.description}
              color={theme.text}
              subColor={theme.subText}
            />
          </View>
        )}

        {officialLinks.length > 0 && (
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: theme.radius.card,
              },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
              ]}
            >
              공식 정보
            </Text>

            {officialLinks.map((item) => (
              <Pressable
                key={item.label}
                onPress={() =>
                  void openUrl(item.url)
                }
                style={({ pressed }) => [
                  styles.linkButton,
                  {
                    borderColor: theme.line,
                    borderRadius: isCityBlack
                      ? 2
                      : 9,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.linkButtonText,
                    { color: theme.text },
                  ]}
                >
                  {item.label}
                </Text>
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={theme.subText}
                />
              </Pressable>
            ))}

            <Text
              style={[
                styles.sourceText,
                { color: theme.subText },
              ]}
            >
              출처 · {getSeoulCultureSourceName()} · 데이터 확인 {event.sourceCheckedAt.slice(
                0,
                10
              )}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.rewardCard,
            {
              backgroundColor: theme.card,
              borderColor: completed
                ? theme.strongLine ?? theme.line
                : theme.line,
              borderRadius: theme.radius.card,
            },
          ]}
        >
          <View style={styles.rewardTop}>
            <View>
              <Text
                style={[
                  styles.rewardTitle,
                  { color: theme.text },
                ]}
              >
                서울 문화행사 탐험
              </Text>
              <Text
                style={[
                  styles.rewardDescription,
                  { color: theme.subText },
                ]}
              >
                행사 기간에 현장에서 GPS로 인증하면 최초 1회 보상을 받아요.
              </Text>
            </View>
            <Text
              style={[
                styles.rewardPoints,
                { color: theme.text },
              ]}
            >
              +{event.rewardPoints}P
            </Text>
          </View>

          <Pressable
            disabled={isVerifying || completed}
            onPress={() =>
              void verifyCurrentLocation()
            }
            style={({ pressed }) => [
              styles.verifyButton,
              {
                backgroundColor: completed
                  ? theme.card
                  : theme.button,
                borderColor: completed
                  ? theme.line
                  : theme.button,
                borderRadius: theme.radius.button,
                opacity:
                  isVerifying
                    ? 0.55
                    : pressed
                      ? 0.75
                      : 1,
              },
            ]}
          >
            {isVerifying ? (
              <ActivityIndicator
                color={theme.buttonText}
              />
            ) : (
              <Text
                style={[
                  styles.verifyButtonText,
                  {
                    color: completed
                      ? theme.subText
                      : theme.buttonText,
                  },
                ]}
              >
                {completed
                  ? '문화행사 참여 완료'
                  : event.latitude == null ||
                      event.longitude == null
                    ? '행사장 좌표 확인 중'
                    : '현재 위치로 인증'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(resultModal)}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setResultModal(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: theme.radius.card,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.text },
              ]}
            >
              {resultModal?.title}
            </Text>
            <Text
              style={[
                styles.modalMessage,
                { color: theme.subText },
              ]}
            >
              {resultModal?.message}
            </Text>
            <Pressable
              onPress={() => setResultModal(null)}
              style={[
                styles.modalButton,
                {
                  borderColor: theme.line,
                  borderRadius: theme.radius.button,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.text,
                  fontWeight: '800',
                }}
              >
                확인
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 11,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
  simpleButton: {
    marginTop: 16,
    minHeight: 38,
    paddingHorizontal: 18,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 10,
  },
  statusBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 18,
    borderWidth: 0.8,
  },
  heroIcon: {
    fontSize: 42,
  },
  eventName: {
    marginTop: 10,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '900',
  },
  tagRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderWidth: 0.8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  detailRow: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.22)',
  },
  detailLabel: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  detailValue: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 18,
  },
  linkButton: {
    minHeight: 42,
    marginTop: 8,
    paddingHorizontal: 12,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sourceText: {
    marginTop: 12,
    fontSize: 9,
    lineHeight: 15,
  },
  rewardCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderWidth: 0.8,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  rewardDescription: {
    maxWidth: 250,
    marginTop: 5,
    fontSize: 10,
    lineHeight: 16,
  },
  rewardPoints: {
    marginLeft: 'auto',
    fontSize: 15,
    fontWeight: '900',
  },
  verifyButton: {
    height: 42,
    marginTop: 14,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    padding: 18,
    borderWidth: 0.8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalMessage: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalButton: {
    height: 38,
    marginTop: 16,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
