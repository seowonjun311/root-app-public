import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CAFE_KEYWORD_MAP,
  CAFE_THEME_MAP,
} from '../../store/cafeKeywordCatalog';
import {
  PLACE_PRIMARY_THEME_MAP,
  PLACE_SEASON_MAP,
} from '../../store/placeThemeCatalog';
import {
  loadSavedCafeEntries,
  removeSavedCafeEntry,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  useRootTheme,
} from '../../store/rootTheme';

const STATUS_LABELS = {
  wantToGo: '가보고 싶어요',
  favorite: '좋아하는 장소',
  visited: '방문했어요',
} as const;

export default function SavedCafesScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const [
    entries,
    setEntries,
  ] =
    useState<
      SavedCafeLocalEntry[]
    >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const reload =
    useCallback(() => {
      let mounted = true;

      setLoading(true);

      loadSavedCafeEntries()
        .then((next) => {
          if (mounted) {
            setEntries(next);
          }
        })
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });

      return () => {
        mounted = false;
      };
    }, []);

  useFocusEffect(reload);

  const confirmRemove =
    (
      entry:
        SavedCafeLocalEntry,
    ) => {
      Alert.alert(
        '저장한 카페 삭제',
        `${entry.cafe.name}을(를) 저장 목록에서 삭제할까요?`,
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '삭제',
            style:
              'destructive',
            onPress:
              async () => {
                const next =
                  await removeSavedCafeEntry(
                    entry.cafe
                      .placeId,
                  );

                setEntries(next);
              },
          },
        ],
      );
    };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 8,
            borderBottomColor:
              theme.line,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={({
            pressed,
          }) => [
            styles.headerButton,
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
            size={19}
            color={
              theme.text
            }
          />
        </Pressable>

        <View
          style={
            styles.headerText
          }
        >
          <Text
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            저장한 카페
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {loading
              ? '불러오는 중...'
              : `${entries.length}곳을 저장했어요.`}
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push(
              '/place/cafe-save' as never,
            )
          }
          style={({
            pressed,
          }) => [
            styles.addButton,
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
            name="add"
            size={17}
            color={
              theme.text
            }
          />
          <Text
            style={[
              styles.addButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            추가
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + 28,
          },
        ]}
      >
        {!loading &&
        entries.length === 0 ? (
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
                    : 15,
              },
            ]}
          >
            <Ionicons
              name="cafe-outline"
              size={28}
              color={
                theme.subText
              }
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              아직 저장한 카페가 없어요.
            </Text>

            <Text
              style={[
                styles.emptyDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              좋아하는 카페나 가보고 싶은 카페를 목적·계절·키워드와 함께 저장해 보세요.
            </Text>
          </View>
        ) : null}

        {entries.map(
          (entry) => {
            const cafe =
              entry.cafe;

            return (
              <View
                key={
                  cafe.placeId
                }
                style={[
                  styles.cafeCard,
                  {
                    backgroundColor:
                      theme.card,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 3
                        : 15,
                  },
                ]}
              >
                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.cardTitleArea
                    }
                  >
                    <Text
                      style={[
                        styles.cafeName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {cafe.name}
                    </Text>

                    <Text
                      style={[
                        styles.cafeAddress,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      {entry.roadAddress ||
                        entry.address ||
                        '주소 미입력'}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${cafe.name} 삭제`}
                    onPress={() =>
                      confirmRemove(
                        entry,
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.deleteButton,
                      {
                        borderColor:
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
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={
                        theme.subText
                      }
                    />
                  </Pressable>
                </View>

                <View
                  style={
                    styles.summaryRow
                  }
                >
                  <SummaryBadge
                    label={
                      STATUS_LABELS[
                        cafe.status
                      ]
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />

                  <SummaryBadge
                    label={
                      PLACE_PRIMARY_THEME_MAP[
                        cafe.primaryTheme
                      ].label
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />

                  {cafe.seasons.map(
                    (seasonId) => (
                      <SummaryBadge
                        key={
                          seasonId
                        }
                        label={
                          PLACE_SEASON_MAP[
                            seasonId
                          ].label
                        }
                        theme={theme}
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>

                <Text
                  style={[
                    styles.themeLine,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {cafe.themes
                    .map(
                      (themeId) =>
                        CAFE_THEME_MAP[
                          themeId
                        ].label,
                    )
                    .join(' · ')}
                </Text>

                {cafe.representativeTags.length >
                0 ? (
                  <View
                    style={
                      styles.keywordRow
                    }
                  >
                    {cafe.representativeTags.map(
                      (keywordId) => (
                        <Text
                          key={
                            keywordId
                          }
                          style={[
                            styles.keywordText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          #
                          {
                            CAFE_KEYWORD_MAP[
                              keywordId
                            ].label
                          }
                        </Text>
                      ),
                    )}
                  </View>
                ) : null}

                {cafe.memo ? (
                  <Text
                    style={[
                      styles.memo,
                      {
                        color:
                          theme.text,
                        backgroundColor:
                          theme.background,
                        borderColor:
                          theme.line,
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 9,
                      },
                    ]}
                  >
                    {cafe.memo}
                  </Text>
                ) : null}
              </View>
            );
          },
        )}
      </ScrollView>
    </View>
  );
}

type SummaryBadgeProps = {
  label: string;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function SummaryBadge({
  label,
  theme,
  isCityBlack,
}: SummaryBadgeProps) {
  return (
    <View
      style={[
        styles.summaryBadge,
        {
          backgroundColor:
            theme.background,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 2
              : 999,
        },
      ]}
    >
      <Text
        style={[
          styles.summaryBadgeText,
          {
            color:
              theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    header: {
      minHeight: 76,
      paddingHorizontal: 14,
      paddingBottom: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    headerButton: {
      width: 36,
      height: 36,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 19,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 10,
      fontWeight: '700',
    },

    addButton: {
      height: 34,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },

    addButtonText: {
      fontSize: 10,
      fontWeight: '900',
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 10,
    },

    emptyCard: {
      minHeight: 210,
      padding: 22,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '900',
    },

    emptyDescription: {
      marginTop: 7,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 16,
      textAlign: 'center',
    },

    cafeCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      gap: 8,
    },

    cardTitleArea: {
      flex: 1,
      minWidth: 0,
    },

    cafeName: {
      fontSize: 14,
      fontWeight: '900',
    },

    cafeAddress: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
    },

    deleteButton: {
      width: 30,
      height: 30,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryRow: {
      marginTop: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },

    summaryBadge: {
      minHeight: 25,
      paddingHorizontal: 8,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryBadgeText: {
      fontSize: 9,
      fontWeight: '800',
    },

    themeLine: {
      marginTop: 9,
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 15,
    },

    keywordRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    keywordText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    memo: {
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 16,
    },
  });
