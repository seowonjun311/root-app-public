import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useMemo } from 'react';
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
  type LatLng,
} from 'react-native-maps';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useRootTheme } from '../../../store/rootTheme';
import { useSeoulReservationData } from '../../../store/seoulReservationRemote';
import {
  getCampingStatusLabel,
  getInsideSeoulCampingSummaries,
  getSeoulOperatedOutsideCampingSummaries,
} from '../../../store/seoulCampingSelectors';
import {
  getInsideSeoulSportsSummaries,
  getSeoulOperatedOutsideSportsSummaries,
  getSportsStatusLabel,
} from '../../../store/seoulSportsSelectors';
import {
  getSpaceFacilitySummaries,
  getSpaceKindLabel,
} from '../../../store/seoulSpaceSelectors';
import {
  getEducationCategoryLabel,
  getEducationPlaceSummaries,
} from '../../../store/seoulEducationSelectors';
import type {
  SeoulEducationCategory,
} from '../../../store/seoulEducationPrograms';

type FacilityKind =
  | 'camping'
  | 'sports'
  | 'space'
  | 'education';

type NormalizedReservation = {
  id: string;
  title: string;
  statusText: string;
  paidType: string;
  targetText: string;
  receptionText: string;
  useText: string;
  telephone: string;
  url: string;
};

type FacilityDetail = {
  kind: FacilityKind;
  facilityId: string;
  name: string;
  icon: string;
  district: string;
  locationLabel: string;
  categoryLabel: string;
  statusLabel: string;
  reservationCount: number;
  itemLabel: string;
  coordinate: LatLng | null;
  officialUrl: string;
  reservations: NormalizedReservation[];
};

function getParam(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim();
  }

  return String(value ?? '').trim();
}

function getText(
  value: unknown
) {
  return String(value ?? '').trim();
}

function getFirstText(
  source: any,
  keys: readonly string[]
) {
  for (const key of keys) {
    const value = getText(
      source?.[key]
    );

    if (value) {
      return value;
    }
  }

  return '';
}

function getNumber(
  value: unknown
) {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function formatDateTime(
  value: unknown
) {
  const text = getText(value);

  if (!text) {
    return '';
  }

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/
  );

  if (!match) {
    return text;
  }

  const dateLabel =
    `${match[1]}.${Number(match[2])}.${Number(match[3])}`;

  if (!match[4] || !match[5]) {
    return dateLabel;
  }

  return `${dateLabel} ${match[4]}:${match[5]}`;
}

function formatRange(
  startValue: unknown,
  endValue: unknown,
  emptyLabel: string
) {
  const start =
    formatDateTime(startValue);
  const end =
    formatDateTime(endValue);

  if (start && end) {
    return `${start} ~ ${end}`;
  }

  if (start) {
    return `${start}부터`;
  }

  if (end) {
    return `${end}까지`;
  }

  return emptyLabel;
}

function getSportsIcon(
  category: string
) {
  if (category.includes('테니스')) {
    return '🎾';
  }

  if (
    category.includes('축구') ||
    category.includes('풋살')
  ) {
    return '⚽';
  }

  if (category.includes('야구')) {
    return '⚾';
  }

  if (category.includes('농구')) {
    return '🏀';
  }

  if (category.includes('배구')) {
    return '🏐';
  }

  if (
    category.includes('배드민턴') ||
    category.includes('피클볼')
  ) {
    return '🏸';
  }

  if (category.includes('탁구')) {
    return '🏓';
  }

  if (category.includes('수영')) {
    return '🏊';
  }

  if (category.includes('골프')) {
    return '⛳';
  }

  return '🏟️';
}

function getSpaceIcon(
  kind: string
) {
  if (kind === 'meetingRoom') {
    return '🗣️';
  }

  if (kind === 'lectureRoom') {
    return '🧑‍🏫';
  }

  if (kind === 'hall') {
    return '🏛️';
  }

  if (kind === 'performance') {
    return '🎭';
  }

  if (kind === 'exhibition') {
    return '🖼️';
  }

  if (kind === 'studio') {
    return '🎙️';
  }

  if (kind === 'plaza') {
    return '🌳';
  }

  if (kind === 'community') {
    return '🤝';
  }

  return '🏢';
}



function getEducationIcon(
  category: SeoulEducationCategory
) {
  if (category === 'craftMaking') {
    return '🎨';
  }

  if (category === 'cookingFood') {
    return '🍳';
  }

  if (
    category === 'natureEnvironment' ||
    category === 'urbanAgriculture'
  ) {
    return '🌿';
  }

  if (category === 'historyCulture') {
    return '🏛️';
  }

  if (category === 'scienceDigital') {
    return '🔬';
  }

  if (category === 'healthSportsSafety') {
    return '🧘';
  }

  if (category === 'careerYouth') {
    return '💼';
  }

  if (category === 'liberalArtsLanguage') {
    return '📚';
  }

  return '🧑‍🏫';
}

function getCoordinate(
  facility: any
): LatLng | null {
  const latitude = getNumber(
    facility?.latitude
  );
  const longitude = getNumber(
    facility?.longitude
  );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function normalizeReservations(
  facility: any,
  fallbackUrl: string
) {
  const reservations = Array.isArray(
    facility?.reservations
  )
    ? facility.reservations
    : [];

  return reservations.map(
    (
      reservation: any,
      index: number
    ): NormalizedReservation => ({
      id:
        getFirstText(
          reservation,
          [
            'serviceId',
            'reservationId',
            'id',
          ]
        ) ||
        `${facility?.id ?? 'facility'}-${index}`,

      title:
        getFirstText(
          reservation,
          ['title', 'serviceName', 'name']
        ) || '예약상품',

      statusText:
        getFirstText(
          reservation,
          [
            'statusText',
            'statusLabel',
            'serviceStatusText',
            'serviceStatus',
          ]
        ) || '예약 상태 확인',

      paidType:
        getFirstText(
          reservation,
          ['paidType', 'feeType']
        ) || '요금 확인',

      targetText:
        getFirstText(
          reservation,
          [
            'targetText',
            'useTargetText',
            'useTargetInfo',
            'targetInfo',
          ]
        ),

      receptionText:
        formatRange(
          reservation?.receptionStartAt,
          reservation?.receptionEndAt,
          '접수 일정 확인'
        ),

      useText:
        formatRange(
          reservation?.useStartAt,
          reservation?.useEndAt,
          '이용 일정 확인'
        ),

      telephone:
        getFirstText(
          reservation,
          ['telephone', 'phone', 'tel']
        ),

      url:
        getFirstText(
          reservation,
          [
            'reservationUrl',
            'serviceUrl',
            'officialUrl',
          ]
        ) || fallbackUrl,
    })
  );
}

function findFacilityDetail(
  kind: FacilityKind,
  facilityId: string
): FacilityDetail | null {
  if (kind === 'camping') {
    const summaries = [
      ...getInsideSeoulCampingSummaries(),
      ...getSeoulOperatedOutsideCampingSummaries(),
    ];

    const summary = summaries.find(
      (item) =>
        item.facility.id === facilityId
    );

    if (!summary) {
      return null;
    }

    const facility: any =
      summary.facility;
    const officialUrl =
      getText(
        summary.primaryReservation
          ?.reservationUrl
      ) ||
      getText(facility.officialUrl);

    return {
      kind,
      facilityId,
      name:
        getText(facility.name) ||
        '캠핑·피크닉 시설',
      icon:
        facility.facilityKind ===
        'picnic'
          ? '🧺'
          : '🏕️',
      district:
        getText(facility.district) ||
        '지역 확인',
      locationLabel:
        getText(facility.locationLabel) ||
        getText(facility.district) ||
        '위치 확인',
      categoryLabel:
        facility.facilityKind ===
        'picnic'
          ? '피크닉장'
          : '캠핑장',
      statusLabel:
        getCampingStatusLabel(
          summary.primaryStatus
        ),
      reservationCount:
        Number(
          facility.reservationCount ??
            facility.reservations?.length ??
            0
        ),
      itemLabel: '예약상품',
      coordinate:
        getCoordinate(facility),
      officialUrl,
      reservations:
        normalizeReservations(
          facility,
          officialUrl
        ),
    };
  }

  if (kind === 'sports') {
    const summaries = [
      ...getInsideSeoulSportsSummaries(),
      ...getSeoulOperatedOutsideSportsSummaries(),
    ];

    const summary = summaries.find(
      (item) =>
        item.facility.id === facilityId
    );

    if (!summary) {
      return null;
    }

    const facility: any =
      summary.facility;
    const category =
      getText(
        facility.primaryCategory
      ) || '체육시설';
    const officialUrl =
      getText(
        summary.primaryReservation
          ?.serviceUrl
      ) ||
      getText(facility.officialUrl);

    return {
      kind,
      facilityId,
      name:
        getText(facility.name) ||
        '체육시설',
      icon: getSportsIcon(category),
      district:
        getText(facility.district) ||
        '지역 확인',
      locationLabel:
        getText(facility.locationLabel) ||
        getText(facility.district) ||
        '위치 확인',
      categoryLabel: category,
      statusLabel:
        getText(summary.statusLabel) ||
        getSportsStatusLabel(
          summary.status
        ),
      reservationCount:
        Number(
          facility.reservationCount ??
            facility.reservations?.length ??
            0
        ),
      itemLabel: '예약상품',
      coordinate:
        getCoordinate(facility),
      officialUrl,
      reservations:
        normalizeReservations(
          facility,
          officialUrl
        ),
    };
  }



  if (kind === 'education') {
    const summary =
      getEducationPlaceSummaries().find(
        (item) =>
          item.place.id === facilityId
      );

    if (!summary) {
      return null;
    }

    const place = summary.place;
    const officialUrl =
      getText(
        summary.primaryProgram
          ?.serviceUrl
      ) ||
      getText(place.officialUrl);

    return {
      kind,
      facilityId,
      name:
        getText(place.name) ||
        '교육·체험 장소',
      icon: getEducationIcon(
        place.primaryCategory
      ),
      district:
        getText(place.district) ||
        getText(place.locationLabel) ||
        '지역 확인',
      locationLabel:
        getText(place.locationLabel) ||
        getText(place.district) ||
        '위치 확인',
      categoryLabel:
        getEducationCategoryLabel(
          place.primaryCategory
        ),
      statusLabel:
        getText(summary.statusLabel) ||
        '상태 확인',
      reservationCount:
        Number(
          place.programCount ??
            place.programs?.length ??
            0
        ),
      itemLabel: '교육 프로그램',
      coordinate:
        getCoordinate(place),
      officialUrl,
      reservations:
        normalizeReservations(
          {
            id: place.id,
            reservations: place.programs,
          },
          officialUrl
        ),
    };
  }

  const summary =
    getSpaceFacilitySummaries().find(
      (item) =>
        item.facility.id === facilityId
    );

  if (!summary) {
    return null;
  }

  const facility: any =
    summary.facility;
  const officialUrl =
    getText(
      summary.primaryReservation
        ?.serviceUrl
    ) ||
    getText(facility.officialUrl);

  return {
    kind,
    facilityId,
    name:
      getText(facility.name) ||
      '공간대관 시설',
    icon:
      getSpaceIcon(
        getText(facility.spaceKind)
      ),
    district:
      getText(facility.district) ||
      '지역 확인',
    locationLabel:
      getText(facility.locationLabel) ||
      `서울 ${getText(
        facility.district
      )}`.trim(),
    categoryLabel:
      getSpaceKindLabel(
        facility.spaceKind
      ),
    statusLabel:
      getText(summary.statusLabel) ||
      '상태 확인',
    reservationCount:
      Number(
        facility.reservationCount ??
          facility.reservations?.length ??
          0
      ),
    itemLabel: '예약상품',
    coordinate:
      getCoordinate(facility),
    officialUrl,
    reservations:
      normalizeReservations(
        facility,
        officialUrl
      ),
  };
}

async function openReservationUrl(
  url: string
) {
  const normalizedUrl =
    getText(url);

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

export default function FacilityDetailScreen() {
  const {
    facilityId: rawFacilityId,
    kind: rawKind,
  } = useLocalSearchParams<{
    facilityId?: string | string[];
    kind?: string | string[];
  }>();

  const { theme, isCityBlack } =
    useRootTheme();
  const insets = useSafeAreaInsets();

  const seoulReservationData =
    useSeoulReservationData(
      false
    );

  const facilityId =
    getParam(rawFacilityId);
  const kindParam =
    getParam(rawKind);

  const kind: FacilityKind =
    kindParam === 'sports' ||
    kindParam === 'space' ||
    kindParam === 'education'
      ? kindParam
      : 'camping';

  const detail = useMemo(
    () =>
      findFacilityDetail(
        kind,
        facilityId
      ),
    [facilityId, kind, seoulReservationData.revision]
  );

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
        <View
          style={styles.errorScreen}
        >
          <Text
            style={[
              styles.errorTitle,
              {
                color: theme.text,
              },
            ]}
          >
            시설 정보를 찾지
            못했어요.
          </Text>

          <Text
            style={[
              styles.errorText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            예약·시설 목록으로 돌아가
            다시 선택해 주세요.
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
              style={{
                color: theme.text,
                fontSize: 11,
                fontWeight: '900',
              }}
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
                {
                  color: theme.text,
                },
              ]}
            >
              예약·시설 상세
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.headerSubtitle,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              서울 공공서비스예약
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
                  {
                    color: theme.text,
                  },
                ]}
              >
                {detail.name}
              </Text>

              <Text
                style={[
                  styles.heroStatus,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {detail.statusLabel}
              </Text>
            </View>

            <Text
              style={[
                styles.heroMeta,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {detail.locationLabel}
              {' · '}
              {detail.categoryLabel}
            </Text>

            <Text
              style={[
                styles.heroCount,
                {
                  color:
                    theme.subText,
                },
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
                  {
                    color: theme.text,
                  },
                ]}
              >
                위치
              </Text>

              <Text
                style={[
                  styles.sectionCount,
                  {
                    color:
                      theme.subText,
                  },
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
                {
                  color: theme.text,
                },
              ]}
            >
              {detail.kind === 'education'
                ? '진행 중인 교육 프로그램'
                : '예약 가능한 상품'}
            </Text>

            <Text
              style={[
                styles.sectionCount,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {detail.reservations.length}개
            </Text>
          </View>

          {detail.reservations.length ===
          0 ? (
            <View style={styles.emptyCard}>
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                연결된 {detail.itemLabel}이 없어요.
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                공식 예약 페이지에서 최신
                정보를 확인해 주세요.
              </Text>
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
                    <View
                      style={
                        styles.reservationHeader
                      }
                    >
                      <View
                        style={
                          styles.reservationNumber
                        }
                      >
                        <Text
                          style={[
                            styles.reservationNumberText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.reservationTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {reservation.title}
                      </Text>
                    </View>

                    <View
                      style={styles.tagRow}
                    >
                      <View
                        style={[
                          styles.tag,
                          {
                            borderColor:
                              theme.strongLine ??
                              theme.line,
                            borderRadius:
                              isCityBlack
                                ? 2
                                : 6,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {reservation.statusText}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.tag,
                          {
                            borderColor:
                              theme.line,
                            borderRadius:
                              isCityBlack
                                ? 2
                                : 6,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {reservation.paidType}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoList}>
                      <View style={styles.infoRow}>
                        <Text
                          style={[
                            styles.infoLabel,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          접수
                        </Text>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {reservation.receptionText}
                        </Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Text
                          style={[
                            styles.infoLabel,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          이용
                        </Text>
                        <Text
                          style={[
                            styles.infoValue,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {reservation.useText}
                        </Text>
                      </View>

                      {reservation.targetText ? (
                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            대상
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {reservation.targetText}
                          </Text>
                        </View>
                      ) : null}

                      {reservation.telephone ? (
                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            문의
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {reservation.telephone}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Pressable
                      onPress={() =>
                        void openReservationUrl(
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
                              : 8,
                          opacity:
                            pressed
                              ? 0.55
                              : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reservationButtonText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {detail.kind === 'education'
                          ? '교육 신청 페이지'
                          : '공식 예약 페이지'}
                      </Text>

                      <Ionicons
                        name="open-outline"
                        size={14}
                        color={theme.text}
                      />
                    </Pressable>
                  </View>
                )
              )}
            </View>
          )}
        </View>

        <Text
          style={[
            styles.notice,
            {
              color: theme.subText,
            },
          ]}
        >
          {detail.kind === 'education'
            ? '교육 일정·요금·참여 대상은 공식 신청 페이지의 최신 안내를 최종 기준으로 확인해 주세요.'
            : '예약 일정·요금·이용 대상은 공식 예약 페이지의 최신 안내를 최종 기준으로 확인해 주세요.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  headerRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 9.5,
  },
  heroCard: {
    padding: 13,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  heroStatus: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: '900',
  },
  heroMeta: {
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 15,
  },
  heroCount: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
  },
  sectionCard: {
    padding: 12,
    borderWidth: 0.8,
  },
  sectionHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: '800',
  },
  map: {
    width: '100%',
    height: 210,
    overflow: 'hidden',
  },
  list: {
    gap: 9,
  },
  reservationCard: {
    padding: 11,
    borderWidth: 0.8,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reservationNumber: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reservationNumberText: {
    fontSize: 10.5,
    fontWeight: '900',
  },
  reservationTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  tagRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 0.7,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  infoList: {
    marginTop: 9,
    gap: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoLabel: {
    width: 34,
    fontSize: 9.5,
    lineHeight: 15,
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    lineHeight: 15,
  },
  reservationButton: {
    marginTop: 10,
    minHeight: 34,
    paddingHorizontal: 10,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reservationButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
  emptyCard: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  notice: {
    paddingHorizontal: 4,
    fontSize: 9.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  errorScreen: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 7,
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 16,
    minWidth: 112,
    height: 36,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
