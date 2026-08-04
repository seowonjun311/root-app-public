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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useRootTheme,
} from '../../store/rootTheme';
import type {
  FacilityKind,
  FacilityListItem,
} from './facilityModels';

type Props = {
  title: string;
  subtitle: string;
  districtLabel: string;
  items: FacilityListItem[];
};

const DETAIL_PATHS: Record<
  FacilityKind,
  string
> = {
  camping:
    '/explore/facility-detail/camping/[facilityId]',
  sports:
    '/explore/facility-detail/sports/[facilityId]',
  space:
    '/explore/facility-detail/space/[facilityId]',
  education:
    '/explore/facility-detail/education/[facilityId]',
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
      'FACILITY LIST URL ERROR',
      error
    );

    Alert.alert(
      '예약 페이지를 열지 못했어요.',
      '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
    );
  }
}

export default function FacilityListView({
  title,
  subtitle,
  districtLabel,
  items,
}: Props) {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();
  const insets =
    useSafeAreaInsets();

  const openDetail = (
    item: FacilityListItem
  ) => {
    console.log(
      'FACILITY CATEGORY DETAIL NAVIGATION START',
      {
        kind: item.kind,
        facilityId: item.id,
      }
    );

    router.push({
      pathname:
        DETAIL_PATHS[item.kind],
      params: {
        facilityId: item.id,
      },
    } as any);
  };

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
              insets.bottom + 30,
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
              {title}
            </Text>

            <Text
              numberOfLines={2}
              style={[
                styles.headerSubtitle,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
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
          <View>
            <Text
              style={[
                styles.summaryTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              {districtLabel}
            </Text>

            <Text
              style={[
                styles.summaryText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              필요한 종류만 불러와 화면 이동을 가볍게 만들었어요.
            </Text>
          </View>

          <Text
            style={[
              styles.summaryCount,
              {
                color: theme.text,
              },
            ]}
          >
            {items.length}곳
          </Text>
        </View>

        {items.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
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
            <Text
              style={[
                styles.emptyTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              등록된 시설이 없어요.
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
              다른 종류를 선택하거나 서울 전체에서 확인해 주세요.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map(
              (item) => (
                <View
                  key={`${item.kind}:${item.id}`}
                  style={[
                    styles.card,
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
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor:
                          theme.background,
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 11,
                      },
                    ]}
                  >
                    <Text style={styles.icon}>
                      {item.icon}
                    </Text>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.name,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={[
                          styles.status,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {item.statusLabel}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.meta,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {item.district ||
                        '지역 확인'}
                      {' · '}
                      {item.categoryLabel}
                      {' · '}
                      {item.reservationCount}개
                    </Text>

                    {item.primaryTitle ? (
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.primaryTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {item.primaryTitle}
                      </Text>
                    ) : null}

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.reception,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {item.receptionText}
                      {' · '}
                      {item.paidType}
                    </Text>

                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() =>
                          openDetail(item)
                        }
                        style={({ pressed }) => [
                          styles.actionButton,
                          {
                            borderColor:
                              theme.strongLine ??
                              theme.line,
                            borderRadius:
                              isCityBlack
                                ? 2
                                : 7,
                            opacity:
                              pressed
                                ? 0.55
                                : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          상세보기
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={
                          !item.reservationUrl
                        }
                        onPress={() =>
                          void openUrl(
                            item.reservationUrl
                          )
                        }
                        style={({ pressed }) => [
                          styles.actionButton,
                          {
                            borderColor:
                              theme.line,
                            borderRadius:
                              isCityBlack
                                ? 2
                                : 7,
                            opacity:
                              !item.reservationUrl
                                ? 0.4
                                : pressed
                                  ? 0.55
                                  : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          예약 페이지
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )
            )}
          </View>
        )}
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
    lineHeight: 14,
  },
  summaryCard: {
    borderWidth: 0.8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  summaryText: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 14,
  },
  summaryCount: {
    fontSize: 11,
    fontWeight: '900',
  },
  list: {
    gap: 9,
  },
  card: {
    borderWidth: 0.8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 23,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '900',
  },
  status: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  meta: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 14,
  },
  primaryTitle: {
    marginTop: 6,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
  },
  reception: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 14,
  },
  actionRow: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 7,
  },
  actionButton: {
    minHeight: 29,
    paddingHorizontal: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  emptyCard: {
    borderWidth: 0.8,
    padding: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
