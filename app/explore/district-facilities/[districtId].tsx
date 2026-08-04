import {
  Ionicons,
} from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
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
  getExplorationDistrict,
} from '../../../store/explorationCatalog';
import {
  useRootTheme,
} from '../../../store/rootTheme';
import {
  getParam,
} from '../../../components/explore/facilityModels';

const CATEGORY_OPTIONS = [
  {
    id: 'camping',
    label: '캠핑·피크닉',
    icon: '🏕️',
    description: '캠핑장과 피크닉 시설',
    pathname:
      '/explore/facilities/camping',
  },
  {
    id: 'sports',
    label: '체육시설',
    icon: '🏟️',
    description: '테니스·풋살·체육관 등',
    pathname:
      '/explore/facilities/sports',
  },
  {
    id: 'space',
    label: '공간대관',
    icon: '🏢',
    description: '회의실·강당·공연장 등',
    pathname:
      '/explore/facilities/space',
  },
  {
    id: 'education',
    label: '교육·체험',
    icon: '🎨',
    description: '공예·환경·역사 프로그램',
    pathname:
      '/explore/facilities/education',
  },
] as const;

export default function DistrictFacilityCategoryScreen() {
  const {
    districtId: rawDistrictId,
  } = useLocalSearchParams<{
    districtId?:
      | string
      | string[];
  }>();

  const districtId =
    getParam(
      rawDistrictId
    );
  const district =
    getExplorationDistrict(
      districtId
    );
  const districtName =
    String(
      district?.name ??
        districtId ??
        '서울'
    ).trim() || '서울';

  const {
    theme,
    isCityBlack,
  } = useRootTheme();
  const insets =
    useSafeAreaInsets();

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
              {districtName} 예약·시설
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              종류를 선택하면 해당 데이터만 불러옵니다.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.noticeCard,
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
              styles.noticeTitle,
              { color: theme.text },
            ]}
          >
            예약·시설 종류 선택
          </Text>

          <Text
            style={[
              styles.noticeText,
              { color: theme.subText },
            ]}
          >
            네 종류의 대용량 데이터를 한꺼번에 열지 않아 자치구 화면에서 바로 표시됩니다.
          </Text>
        </View>

        <View style={styles.list}>
          {CATEGORY_OPTIONS.map(
            (option) => (
              <Pressable
                key={option.id}
                onPress={() => {
                  console.log(
                    'DISTRICT FACILITY CATEGORY SELECTED',
                    {
                      districtId,
                      kind: option.id,
                    }
                  );

                  router.push({
                    pathname:
                      option.pathname,
                    params: {
                      districtId,
                    },
                  } as any);
                }}
                style={({ pressed }) => [
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
                    opacity:
                      pressed
                        ? 0.62
                        : 1,
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
                    {option.icon}
                  </Text>
                </View>

                <View style={styles.cardText}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>

                  <Text
                    style={[
                      styles.cardDescription,
                      { color: theme.subText },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.subText}
                />
              </Pressable>
            )
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
    lineHeight: 14,
  },
  noticeCard: {
    borderWidth: 0.8,
    padding: 12,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  noticeText: {
    marginTop: 5,
    fontSize: 9.5,
    lineHeight: 14,
  },
  list: {
    gap: 9,
  },
  card: {
    minHeight: 74,
    padding: 11,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  cardDescription: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 14,
  },
});
