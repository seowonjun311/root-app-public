import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
  FESTIVAL_RECURRENCE_LABELS,
  FESTIVAL_SCALE_LABELS,
  getFestival,
  getFestivalAudiences,
  getFestivalContentTypeLabel,
  getFestivalScheduleLabel,
  getFestivalStatusLabel,
  isFestivalVisitWindowOpen,
  type FestivalDefinition,
} from '../../../store/festivalCatalog';
import { useRootTheme } from '../../../store/rootTheme';

function getDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function FestivalExploreScreen() {
  const { festivalId } = useLocalSearchParams<{ festivalId?: string }>();
  const { theme, isCityBlack } = useRootTheme();
  const insets = useSafeAreaInsets();

  const festival = useMemo<FestivalDefinition | null>(
    () => getFestival(Array.isArray(festivalId) ? festivalId[0] : festivalId),
    [festivalId]
  );

  const contentTypeLabel =
    festival
      ? getFestivalContentTypeLabel(festival)
      : '축제';

  const audienceLabels =
    festival
      ? getFestivalAudiences(festival).map(
          (audience) =>
            FESTIVAL_AUDIENCE_LABELS[audience]
        )
      : [];

  const [completed, setCompleted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resultModal, setResultModal] = useState<{
    title: string;
    message: string;
    success?: boolean;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const data = await loadLocalExplorationData();
          if (active && festival) {
            setCompleted(data.visitedPlaceIds.includes(festival.id));
          }
        } catch (error) {
          console.log('FESTIVAL DETAIL LOAD ERROR', error);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [festival])
  );

  const saveFestivalCompletion = async (
    latitude: number,
    longitude: number,
    accuracyMeters: number,
    distanceMeters: number
  ) => {
    if (!festival) return false;
    const before = await loadLocalExplorationData();
    const alreadyCompleted = before.visitedPlaceIds.includes(festival.id);

    await completeExploration({
      placeId: festival.id,
      verifiedAt: new Date().toISOString(),
      latitude,
      longitude,
      accuracyMeters,
      distanceMeters,
      points: festival.rewardPoints,
      stampId: festival.rewardStampId,
      rewardId: `visit-${festival.id}`,
    });

    const latest = await loadLocalExplorationData();
    const completedNow = latest.visitedPlaceIds.includes(festival.id);
    setCompleted(completedNow);
    return !alreadyCompleted && completedNow;
  };

  const completeForDevelopment = async () => {
    if (!festival) return;
    try {
      const rewarded = await saveFestivalCompletion(0, 0, 0, 0);
      setResultModal({
        title: rewarded ? `${festival.name} 테스트 완료!` : '이미 완료한 콘텐츠예요',
        message: rewarded
          ? `개발 테스트로 +${festival.rewardPoints}P와 ${festival.festivalYear} 한정 스탬프를 획득했어요.`
          : '이 콘텐츠의 참여 보상은 이미 획득했어요.',
        success: true,
      });
    } catch (error) {
      console.log('FESTIVAL DEV COMPLETE ERROR', error);
      setResultModal({ title: '저장 실패', message: '콘텐츠 완료 기록을 저장하지 못했어요.' });
    }
  };

  const verifyCurrentLocation = async () => {
    if (!festival) return;
    if (completed) {
      setResultModal({ title: '이미 완료한 콘텐츠예요', message: '이 축제의 참여 기록이 이미 저장되어 있어요.', success: true });
      return;
    }
    if (!festival.verificationReady || !isFestivalVisitWindowOpen(festival)) {
      setResultModal({
        title: 'GPS 인증 준비 중',
        message:
          `${contentTypeLabel} 일정과 공식 행사장 좌표가 확인된 경우에만 GPS 인증이 열려요. 현재는 행사 정보와 개최 일정을 먼저 확인해 주세요.`,
      });
      return;
    }

    try {
      setIsVerifying(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setResultModal({ title: '위치 권한이 필요해요', message: '설정에서 위치 권한을 허용한 뒤 다시 시도해 주세요.' });
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const accuracy = Number(location.coords.accuracy ?? 9999);
      if (accuracy > 100) {
        setResultModal({ title: '현재 위치가 정확하지 않아요', message: `현재 GPS 오차는 약 ${Math.round(accuracy)}m예요. 야외에서 잠시 기다린 뒤 다시 시도해 주세요.` });
        return;
      }
      const distance = getDistanceMeters(location.coords.latitude, location.coords.longitude, festival.latitude, festival.longitude);
      if (distance > festival.radiusMeters) {
        setResultModal({ title: '인증 범위 밖이에요', message: `${festival.name} 행사장에서 약 ${Math.round(distance)}m 떨어져 있어요.` });
        return;
      }
      const rewarded = await saveFestivalCompletion(
        location.coords.latitude,
        location.coords.longitude,
        accuracy,
        distance
      );
      setResultModal({
        title: `${festival.name} 참여 완료!`,
        message: rewarded
          ? `+${festival.rewardPoints} 탐험 포인트와 ${festival.festivalYear} 한정 스탬프를 획득했어요.`
          : '이미 참여 보상을 획득한 콘텐츠예요.',
        success: true,
      });
    } catch (error) {
      console.log('FESTIVAL LOCATION VERIFY ERROR', error);
      setResultModal({ title: '위치 인증 실패', message: '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!festival) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: theme.background, paddingTop: insets.top }]}> 
        <Text style={[styles.emptyTitle, { color: theme.text }]}>축제·행사·전시를 찾지 못했어요</Text>
        <Pressable onPress={() => router.back()} style={[styles.simpleButton, { borderColor: theme.line, borderRadius: theme.radius.button }]}> 
          <Text style={{ color: theme.text, fontWeight: '800' }}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}> 
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color={theme.text} />
          </Pressable>
          <View style={styles.headerTextBox}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{festival.name}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subText }]}>{festival.regionName} · {festival.districtName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: completed ? theme.button : theme.card, borderColor: completed ? theme.button : theme.line, borderRadius: theme.radius.button }]}> 
            <Text style={[styles.statusText, { color: completed ? theme.buttonText : theme.subText }]}>{completed ? '완료' : getFestivalStatusLabel(festival)}</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: theme.radius.card }]}> 
          <Text style={styles.heroIcon}>{festival.icon}</Text>
          <Text style={[styles.festivalName, { color: theme.text }]}>{festival.name}</Text>
          <Text style={[styles.description, { color: theme.subText }]}>{festival.description}</Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { borderColor: theme.strongLine, borderRadius: theme.radius.button }]}><Text style={[styles.tagText, { color: theme.text }]}>{contentTypeLabel}</Text></View>
            <View style={[styles.tag, { borderColor: theme.line, borderRadius: theme.radius.button }]}><Text style={[styles.tagText, { color: theme.subText }]}>{festival.category}</Text></View>
            <View style={[styles.tag, { borderColor: theme.line, borderRadius: theme.radius.button }]}><Text style={[styles.tagText, { color: theme.subText }]}>{FESTIVAL_SCALE_LABELS[festival.scale]}</Text></View>
            {festival.emerging && <View style={[styles.tag, { borderColor: theme.strongLine, borderRadius: theme.radius.button }]}><Text style={[styles.tagText, { color: theme.text }]}>최근 급성장</Text></View>}
            {audienceLabels.map((label) => (
              <View
                key={`${festival.id}-audience-${label}`}
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

        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: theme.radius.card }]}> 
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{contentTypeLabel} 일정</Text>
          <InfoRow icon="calendar-outline" title={getFestivalScheduleLabel(festival)} description={`${FESTIVAL_RECURRENCE_LABELS[festival.recurrenceType]} 개최 · 공식 확인일 ${festival.sourceCheckedAt}`} theme={theme} />
          <InfoRow icon="location-outline" title={festival.venueName} description="행사장과 운영 시간은 변경될 수 있어 방문 전 공식 공지를 확인해야 해요." theme={theme} />
          <Pressable onPress={() => void Linking.openURL(festival.sourceUrl)} style={[styles.sourceButton, { borderColor: theme.line, borderRadius: theme.radius.button }]}> 
            <Ionicons name="open-outline" size={15} color={theme.text} />
            <Text style={[styles.sourceButtonText, { color: theme.text }]}>{festival.sourceName}에서 일정 확인</Text>
          </Pressable>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: theme.radius.card }]}> 
          <Text style={[styles.sectionTitle, { color: theme.text }]}>추천 {contentTypeLabel} 미션</Text>
          {festival.missions.map((mission, index) => (
            <View key={`${festival.id}-mission-${index}`} style={styles.missionRow}>
              <Text style={[styles.missionNumber, { color: theme.text }]}>{index + 1}</Text>
              <Text style={[styles.missionText, { color: theme.subText }]}>{mission}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: theme.radius.card }]}> 
          <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 보상</Text>
          <InfoRow icon="wallet-outline" title={`+${festival.rewardPoints} 탐험 포인트`} description="콘텐츠별 최초 1회만 지급돼요." theme={theme} />
          <InfoRow icon="ribbon-outline" title={`${festival.festivalYear} 한정 탐험 스탬프`} description="같은 콘텐츠도 연도별로 다른 스탬프를 모을 수 있어요." theme={theme} />
        </View>

        <Pressable disabled={isVerifying} onPress={verifyCurrentLocation} style={({ pressed }) => [styles.verifyButton, { backgroundColor: completed ? theme.card2 : theme.button, borderColor: completed ? theme.line : theme.button, borderRadius: isCityBlack ? 4 : theme.radius.button, opacity: pressed || isVerifying ? 0.7 : 1 }]}> 
          {isVerifying ? <ActivityIndicator size="small" color={theme.buttonText} /> : <Ionicons name={completed ? 'checkmark-circle-outline' : 'locate-outline'} size={18} color={completed ? theme.mutedText : theme.buttonText} />}
          <Text style={[styles.verifyButtonText, { color: completed ? theme.mutedText : theme.buttonText }]}>{completed ? `${contentTypeLabel} 참여 완료` : festival.verificationReady ? '현재 위치로 인증' : '일정 확정 후 GPS 인증'}</Text>
        </Pressable>

        {__DEV__ && (
          <Pressable onPress={completeForDevelopment} style={[styles.developmentButton, { borderColor: theme.line, borderRadius: isCityBlack ? 4 : theme.radius.button }]}> 
            <Text style={[styles.developmentButtonText, { color: theme.subText }]}>개발 테스트로 완료하기</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={!!resultModal} transparent animationType="fade" onRequestClose={() => setResultModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: theme.radius.modal }]}> 
            <Ionicons name={resultModal?.success ? 'checkmark-circle-outline' : 'information-circle-outline'} size={30} color={theme.button} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>{resultModal?.title}</Text>
            <Text style={[styles.modalMessage, { color: theme.subText }]}>{resultModal?.message}</Text>
            <Pressable onPress={() => setResultModal(null)} style={[styles.modalButton, { borderColor: theme.strongLine, borderRadius: theme.radius.button }]}> 
              <Text style={[styles.modalButtonText, { color: theme.text }]}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, title, description, theme }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.button} />
      <View style={styles.infoTextBox}>
        <Text style={[styles.infoTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.infoDescription, { color: theme.subText }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerScreen: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  header: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTextBox: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { marginTop: 3, fontSize: 10, fontWeight: '700' },
  statusBadge: { minWidth: 66, minHeight: 32, paddingHorizontal: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 9, fontWeight: '900' },
  heroCard: { marginHorizontal: 14, padding: 18, borderWidth: 1, alignItems: 'center' },
  heroIcon: { fontSize: 38 },
  festivalName: { marginTop: 10, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  description: { marginTop: 8, fontSize: 11, fontWeight: '600', lineHeight: 18, textAlign: 'center' },
  tagRow: { marginTop: 13, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  tag: { paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1 },
  tagText: { fontSize: 9, fontWeight: '800' },
  sectionCard: { marginTop: 11, marginHorizontal: 14, padding: 15, borderWidth: 1 },
  sectionTitle: { marginBottom: 11, fontSize: 15, fontWeight: '900' },
  infoRow: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoTextBox: { flex: 1 },
  infoTitle: { fontSize: 11, fontWeight: '900' },
  infoDescription: { marginTop: 4, fontSize: 9, fontWeight: '600', lineHeight: 15 },
  sourceButton: { minHeight: 37, marginTop: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sourceButtonText: { fontSize: 10, fontWeight: '900' },
  missionRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 9 },
  missionNumber: { width: 23, height: 23, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', fontSize: 10, fontWeight: '900' },
  missionText: { flex: 1, fontSize: 10, fontWeight: '700' },
  verifyButton: { height: 43, marginTop: 14, marginHorizontal: 14, paddingHorizontal: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  verifyButtonText: { fontSize: 12, fontWeight: '900' },
  developmentButton: { height: 38, marginTop: 8, marginHorizontal: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  developmentButtonText: { fontSize: 10, fontWeight: '800' },
  emptyTitle: { fontSize: 20, fontWeight: '900' },
  simpleButton: { marginTop: 18, height: 38, paddingHorizontal: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '100%', maxWidth: 380, padding: 20, borderWidth: 1, alignItems: 'center' },
  modalTitle: { marginTop: 10, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  modalMessage: { marginTop: 8, fontSize: 11, fontWeight: '600', lineHeight: 18, textAlign: 'center' },
  modalButton: { height: 36, marginTop: 17, paddingHorizontal: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { fontSize: 11, fontWeight: '900' },
});
