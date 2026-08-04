import {
  Ionicons,
} from '@expo/vector-icons';
import {
  router,
} from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
} from 'react-native-maps';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useRootTheme,
} from '../../store/rootTheme';
import type {
  FacilityDetailData,
} from './facilityModels';

type Props = {
  detail: FacilityDetailData | null;
};

async function openUrl(
  url: string
) {
  const normalizedUrl =
    String(url ?? '').trim();

  if (!normalizedUrl) {
    Alert.alert(
      '예약 페이지가 없어요.',
      '현재 연결된 공식 예약 주소를 확인할 수 없어요.'
    );

    return;
  }

  try {
    const supported =
      await Linking.canOpenURL(
        normalizedUrl
      );

    if (!supported) {
      Alert.alert(
        '예약 페이지를 열 수 없어요.',
        '잠시 후 다시 시도해 주세요.'
      );

      return;
    }

    await Linking.openURL(
      normalizedUrl
    );
  } catch (error) {
    console.log(
      'FACILITY DETAIL URL ERROR',
      error
    );

    Alert.alert(
      '예약 페이지를 열지 못했어요.',
      '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
    );
  }
}

export default function FacilityDetailView({
  detail,
}: Props) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();
  const insets =
    useSafeAreaInsets();

  if (!detail) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[
          styles.safeArea,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <View style={styles.errorScreen}>
          <Text
            style={[
              styles.errorTitle,
              { color: theme.text },
            ]}
          >
            시설 정보를 찾지 못했어요.
          </Text>

          <Text
            style={[
              styles.errorText,
              { color: theme.subText },
            ]}
          >
            예약·시설 목록으로 돌아가 다시 선택해 주세요.
          </Text>

          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.errorButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 9,
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.errorButtonText,
                { color: theme.text },
              ]}
            >
              돌아가기
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + 32,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 9,
                opacity:
                  pressed
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={theme.text}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text
              numberOfLines={1}
              style={[
                styles.headerTitle,
                { color: theme.text },
              ]}
            >
              예약·시설 상세
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.headerSubtitle,
                { color: theme.subText },
              ]}
            >
              선택한 종류의 데이터만 불러왔어요.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 3
                  : 16,
            },
          ]}
        >
          <View
            style={[
              styles.heroIconBox,
              {
                backgroundColor:
                  theme.background,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 13,
              },
            ]}
          >
            <Text style={styles.heroIcon}>
              {detail.icon}
            </Text>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroTitleRow}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: theme.text },
                ]}
              >
                {detail.name}
              </Text>

              <Text
                style={[
                  styles.heroStatus,
                  { color: theme.text },
                ]}
              >
                {detail.statusLabel}
              </Text>
            </View>

            <Text
              style={[
                styles.heroMeta,
                { color: theme.subText },
              ]}
            >
              {detail.locationLabel}
              {' · '}
              {detail.categoryLabel}
            </Text>

            <Text
              style={[
                styles.heroCount,
                { color: theme.subText },
              ]}
            >
              {detail.itemLabel}{' '}
              {detail.reservationCount}개
            </Text>
          </View>
        </View>

        {detail.coordinate ? (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 14,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text },
                ]}
              >
                위치
              </Text>

              <Text
                style={[
                  styles.sectionCount,
                  { color: theme.subText },
                ]}
              >
                {detail.district}
              </Text>
            </View>

            <MapView
              style={styles.map}
              initialRegion={{
                latitude:
                  detail.coordinate.latitude,
                longitude:
                  detail.coordinate.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={detail.coordinate}
                title={detail.name}
                description={
                  detail.categoryLabel
                }
              />
            </MapView>
          </View>
        ) : null}

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor:
                theme.card,
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 3
                  : 14,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
              ]}
            >
              {detail.kind === 'education'
                ? '진행 중인 교육 프로그램'
                : '예약 가능한 상품'}
            </Text>

            <Text
              style={[
                styles.sectionCount,
                { color: theme.subText },
              ]}
            >
              {detail.reservations.length}개
            </Text>
          </View>

          {detail.reservations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.text },
                ]}
              >
                연결된 {detail.itemLabel}이 없어요.
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  { color: theme.subText },
                ]}
              >
                공식 예약 페이지에서 최신 정보를 확인해 주세요.
              </Text>

              <Pressable
                disabled={!detail.officialUrl}
                onPress={() =>
                  void openUrl(
                    detail.officialUrl
                  )
                }
                style={({ pressed }) => [
                  styles.officialButton,
                  {
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 7,
                    opacity:
                      !detail.officialUrl
                        ? 0.4
                        : pressed
                          ? 0.55
                          : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.officialButtonText,
                    { color: theme.text },
                  ]}
                >
                  공식 예약 페이지
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {detail.reservations.map(
                (
                  reservation,
                  index
                ) => (
                  <View
                    key={reservation.id}
                    style={[
                      styles.reservationCard,
                      {
                        backgroundColor:
                          theme.background,
                        borderColor:
                          theme.line,
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 11,
                      },
                    ]}
                  >
                    <View style={styles.reservationHeader}>
                      <View
                        style={[
                          styles.numberBox,
                          {
                            borderColor:
                              theme.line,
                            borderRadius:
                              isCityBlack
                                ? 2
                                : 7,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.numberText,
                            { color: theme.text },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.reservationTitle,
                          { color: theme.text },
                        ]}
                      >
                        {reservation.title}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.reservationMeta,
                        { color: theme.subText },
                      ]}
                    >
                      {reservation.statusText}
                      {' · '}
                      {reservation.paidType}
                    </Text>

                    <Text
                      style={[
                        styles.infoText,
                        { color: theme.text },
                      ]}
                    >
                      접수 · {reservation.receptionText}
                    </Text>

                    <Text
                      style={[
                        styles.infoText,
                        { color: theme.text },
                      ]}
                    >
                      이용 · {reservation.useText}
                    </Text>

                    {reservation.targetText ? (
                      <Text
                        style={[
                          styles.infoText,
                          { color: theme.text },
                        ]}
                      >
                        대상 · {reservation.targetText}
                      </Text>
                    ) : null}

                    <Pressable
                      disabled={!reservation.url}
                      onPress={() =>
                        void openUrl(
                          reservation.url
                        )
                      }
                      style={({ pressed }) => [
                        styles.reservationButton,
                        {
                          borderColor:
                            theme.strongLine ??
                            theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 7,
                          opacity:
                            !reservation.url
                              ? 0.4
                              : pressed
                                ? 0.55
                                : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reservationButtonText,
                          { color: theme.text },
                        ]}
                      >
                        예약 페이지 열기
                      </Text>
                    </Pressable>
                  </View>
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 10,
  },
  heroCard: {
    borderWidth: 0.8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroIconBox: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    fontSize: 28,
  },
  heroContent: {
    flex: 1,
    minWidth: 0,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  heroStatus: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  heroMeta: {
    marginTop: 5,
    fontSize: 9.5,
    lineHeight: 14,
  },
  heroCount: {
    marginTop: 4,
    fontSize: 9.5,
  },
  sectionCard: {
    borderWidth: 0.8,
    padding: 11,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: '800',
  },
  map: {
    height: 190,
    width: '100%',
  },
  list: {
    gap: 8,
  },
  reservationCard: {
    borderWidth: 0.8,
    padding: 10,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  numberBox: {
    width: 24,
    height: 24,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  reservationTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '900',
  },
  reservationMeta: {
    marginTop: 7,
    fontSize: 9.5,
    lineHeight: 14,
  },
  infoText: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 14,
  },
  reservationButton: {
    minHeight: 31,
    marginTop: 9,
    paddingHorizontal: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  reservationButtonText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  emptyCard: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 5,
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: 'center',
  },
  officialButton: {
    minHeight: 31,
    marginTop: 10,
    paddingHorizontal: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialButtonText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  errorScreen: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 7,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  errorButton: {
    minHeight: 32,
    marginTop: 12,
    paddingHorizontal: 12,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
});
