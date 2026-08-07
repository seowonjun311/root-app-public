import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  CAFE_CORE_THEMES,
  CAFE_KEYWORD_GROUPS,
  CAFE_KEYWORD_MAP,
  MAX_CAFE_KEYWORDS,
  MAX_REPRESENTATIVE_CAFE_KEYWORDS,
  type CafeKeywordId,
  type CafeThemeId,
} from '../../store/cafeKeywordCatalog';
import {
  PLACE_PRIMARY_THEME_MAP,
  PLACE_PRIMARY_THEMES,
  PLACE_SEASON_MAP,
  PLACE_SEASONS,
} from '../../store/placeThemeCatalog';
import {
  validateSavedCafe,
  type SavedCafe,
} from '../../store/savedPlaces';
import {
  loadSavedCafeEntries,
  saveCafeEntry,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  type PlacePrimaryThemeId,
  type PlaceSeasonId,
  type SavedPlaceStatusId,
} from '../../store/placeTypes';
import {
  useRootTheme,
} from '../../store/rootTheme';

const STATUS_OPTIONS: readonly {
  id: SavedPlaceStatusId;
  label: string;
  icon:
    | 'bookmark-outline'
    | 'heart-outline'
    | 'checkmark-circle-outline';
}[] = [
  {
    id: 'wantToGo',
    label: '가보고 싶어요',
    icon: 'bookmark-outline',
  },
  {
    id: 'favorite',
    label: '좋아하는 장소',
    icon: 'heart-outline',
  },
  {
    id: 'visited',
    label: '방문했어요',
    icon: 'checkmark-circle-outline',
  },
];

const STATUS_LABEL_MAP = Object.fromEntries(
  STATUS_OPTIONS.map((item) => [
    item.id,
    item.label,
  ]),
) as Record<SavedPlaceStatusId, string>;

function firstParam(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ''
    : value ?? '';
}

function formatSavedDate(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'ko-KR',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(date);
}

export default function CafeDetailScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();
  const insets =
    useSafeAreaInsets();
  const params =
    useLocalSearchParams<{
      placeId?:
        | string
        | string[];
    }>();
  const placeId =
    firstParam(
      params.placeId,
    );

  const [
    entry,
    setEntry,
  ] =
    useState<SavedCafeLocalEntry | null>(
      null,
    );
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadError,
    setLoadError,
  ] = useState('');
  const [
    editing,
    setEditing,
  ] = useState(false);
  const [
    saving,
    setSaving,
  ] = useState(false);
  const [
    feedback,
    setFeedback,
  ] = useState('');
  const [
    saveCompleteVisible,
    setSaveCompleteVisible,
  ] = useState(false);

  const [
    status,
    setStatus,
  ] =
    useState<SavedPlaceStatusId>(
      'wantToGo',
    );
  const [
    primaryTheme,
    setPrimaryTheme,
  ] =
    useState<PlacePrimaryThemeId>(
      'foodCafe',
    );
  const [
    selectedThemes,
    setSelectedThemes,
  ] = useState<CafeThemeId[]>([]);
  const [
    selectedSeasons,
    setSelectedSeasons,
  ] = useState<PlaceSeasonId[]>([
    'all',
  ]);
  const [
    selectedKeywords,
    setSelectedKeywords,
  ] = useState<CafeKeywordId[]>([]);
  const [
    representativeKeywords,
    setRepresentativeKeywords,
  ] = useState<CafeKeywordId[]>([]);
  const [
    memo,
    setMemo,
  ] = useState('');

  const hydrateForm =
    useCallback(
      (
        nextEntry:
          SavedCafeLocalEntry,
      ) => {
        const cafe =
          nextEntry.cafe;

        setStatus(cafe.status);
        setPrimaryTheme(
          cafe.primaryTheme,
        );
        setSelectedThemes([
          ...cafe.themes,
        ]);
        setSelectedSeasons([
          ...cafe.seasons,
        ]);
        setSelectedKeywords([
          ...cafe.tags,
        ]);
        setRepresentativeKeywords([
          ...cafe.representativeTags,
        ]);
        setMemo(cafe.memo);
        setFeedback('');
      },
      [],
    );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setLoadError('');

      loadSavedCafeEntries()
        .then((entries) => {
          if (!active) {
            return;
          }

          const found =
            entries.find(
              (item) =>
                item.cafe.placeId ===
                placeId,
            ) ?? null;

          if (!found) {
            setEntry(null);
            setLoadError(
              '저장한 카페를 찾을 수 없어요.',
            );
            return;
          }

          setEntry(found);
          hydrateForm(found);
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE DETAIL LOAD ERROR',
            error,
          );

          if (active) {
            setLoadError(
              '카페 정보를 불러오지 못했어요.',
            );
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [
      hydrateForm,
      placeId,
    ]),
  );

  const selectedKeywordLabels =
    useMemo(
      () =>
        selectedKeywords.map(
          (keywordId) =>
            CAFE_KEYWORD_MAP[
              keywordId
            ].label,
        ),
      [selectedKeywords],
    );

  const startEditing = () => {
    if (!entry || saving) {
      return;
    }

    hydrateForm(entry);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (!entry || saving) {
      return;
    }

    hydrateForm(entry);
    setEditing(false);
  };

  const toggleTheme = (
    themeId: CafeThemeId,
  ) => {
    setFeedback('');
    setSelectedThemes(
      (current) =>
        current.includes(themeId)
          ? current.filter(
              (item) =>
                item !== themeId,
            )
          : [
              ...current,
              themeId,
            ],
    );
  };

  const toggleSeason = (
    seasonId: PlaceSeasonId,
  ) => {
    setFeedback('');
    setSelectedSeasons(
      (current) => {
        if (
          current.includes(
            seasonId,
          )
        ) {
          const next =
            current.filter(
              (item) =>
                item !== seasonId,
            );

          return next.length > 0
            ? next
            : ['all'];
        }

        if (
          seasonId === 'all'
        ) {
          return ['all'];
        }

        return [
          ...current.filter(
            (item) =>
              item !== 'all',
          ),
          seasonId,
        ];
      },
    );
  };

  const toggleKeyword = (
    keywordId: CafeKeywordId,
  ) => {
    setFeedback('');
    setSelectedKeywords(
      (current) => {
        if (
          current.includes(
            keywordId,
          )
        ) {
          setRepresentativeKeywords(
            (representatives) =>
              representatives.filter(
                (item) =>
                  item !== keywordId,
              ),
          );

          return current.filter(
            (item) =>
              item !== keywordId,
          );
        }

        if (
          current.length >=
          MAX_CAFE_KEYWORDS
        ) {
          setFeedback(
            `키워드는 최대 ${MAX_CAFE_KEYWORDS}개까지 선택할 수 있어요.`,
          );
          return current;
        }

        return [
          ...current,
          keywordId,
        ];
      },
    );
  };

  const toggleRepresentativeKeyword = (
    keywordId: CafeKeywordId,
  ) => {
    setFeedback('');

    if (
      !selectedKeywords.includes(
        keywordId,
      )
    ) {
      return;
    }

    setRepresentativeKeywords(
      (current) => {
        if (
          current.includes(
            keywordId,
          )
        ) {
          return current.filter(
            (item) =>
              item !== keywordId,
          );
        }

        if (
          current.length >=
          MAX_REPRESENTATIVE_CAFE_KEYWORDS
        ) {
          setFeedback(
            `대표 특징은 최대 ${MAX_REPRESENTATIVE_CAFE_KEYWORDS}개까지 선택할 수 있어요.`,
          );
          return current;
        }

        return [
          ...current,
          keywordId,
        ];
      },
    );
  };

  const handleSave =
    async () => {
      if (
        !entry ||
        saving
      ) {
        return;
      }

      if (
        selectedThemes.length ===
        0
      ) {
        setFeedback(
          '카페 테마를 한 개 이상 선택해 주세요.',
        );
        return;
      }

      setSaving(true);
      setFeedback('');

      try {
        const now =
          new Date().toISOString();
        const updatedCafe:
          SavedCafe = {
          ...entry.cafe,
          status,
          primaryTheme,
          themes: [
            ...selectedThemes,
          ],
          seasons: [
            ...selectedSeasons,
          ],
          tags: [
            ...selectedKeywords,
          ],
          representativeTags:
            representativeKeywords.filter(
              (keywordId) =>
                selectedKeywords.includes(
                  keywordId,
                ),
            ),
          memo: memo
            .trim()
            .slice(0, 300),
          updatedAt: now,
        };
        const validation =
          validateSavedCafe(
            updatedCafe,
          );

        if (!validation.valid) {
          setFeedback(
            validation.errors[0] ??
              '수정 내용을 확인해 주세요.',
          );
          return;
        }

        const updatedEntry:
          SavedCafeLocalEntry = {
          ...entry,
          cafe: updatedCafe,
        };

        await saveCafeEntry(
          updatedEntry,
        );

        setEntry(updatedEntry);
        hydrateForm(updatedEntry);
        setEditing(false);
        setSaveCompleteVisible(
          true,
        );
      } catch (error) {
        console.log(
          'SAVED CAFE DETAIL UPDATE ERROR',
          error,
        );
        setFeedback(
          error instanceof Error
            ? error.message
            : '카페 정보를 수정하지 못했어요.',
        );
      } finally {
        setSaving(false);
      }
    };

  const addressText =
    entry?.roadAddress ||
    entry?.address ||
    '주소 미입력';

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
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
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
              opacity: pressed
                ? 0.55
                : 1,
            },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={theme.text}
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
            {editing
              ? '관계·테마·계절·특징을 수정하고 있어요.'
              : '저장한 정보와 추천 메모를 확인해요.'}
          </Text>
        </View>

        {!loading &&
        entry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              editing
                ? '수정 취소'
                : '카페 정보 수정'
            }
            disabled={saving}
            onPress={
              editing
                ? cancelEditing
                : startEditing
            }
            style={({
              pressed,
            }) => [
              styles.editButton,
              {
                backgroundColor:
                  editing
                    ? theme.background
                    : theme.card2,
                borderColor:
                  editing
                    ? theme.line
                    : theme.strongLine,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 9,
                opacity:
                  saving
                    ? 0.45
                    : pressed
                      ? 0.6
                      : 1,
              },
            ]}
          >
            <Ionicons
              name={
                editing
                  ? 'close-outline'
                  : 'create-outline'
              }
              size={15}
              color={theme.text}
            />
            <Text
              style={[
                styles.editButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {editing
                ? '취소'
                : '수정'}
            </Text>
          </Pressable>
        ) : (
          <View
            style={
              styles.headerSpacer
            }
          />
        )}
      </View>

      {loading ? (
        <View
          style={
            styles.centerContent
          }
        >
          <ActivityIndicator
            size="small"
            color={theme.text}
          />
          <Text
            style={[
              styles.centerText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            카페 정보를 불러오는 중이에요.
          </Text>
        </View>
      ) : loadError ||
        !entry ? (
        <View
          style={
            styles.centerContent
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={theme.subText}
          />
          <Text
            style={[
              styles.errorTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            카페 정보를 열 수 없어요.
          </Text>
          <Text
            style={[
              styles.centerText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {loadError}
          </Text>
          <Pressable
            onPress={() =>
              router.replace(
                '/place/saved-cafes' as never,
              )
            }
            style={({
              pressed,
            }) => [
              styles.backToListButton,
              {
                backgroundColor:
                  theme.button,
                borderColor:
                  theme.strongLine,
                borderRadius:
                  isCityBlack
                    ? 2
                    : theme.radius.button,
                opacity: pressed
                  ? 0.72
                  : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.backToListText,
                {
                  color:
                    theme.buttonText,
                },
              ]}
            >
              저장 목록으로
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom +
                28,
            },
          ]}
        >
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
                styles.heroIcon,
                {
                  backgroundColor:
                    theme.card2,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 13,
                },
              ]}
            >
              <Ionicons
                name="cafe-outline"
                size={23}
                color={theme.text}
              />
            </View>
            <View
              style={
                styles.heroTextArea
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
                {entry.cafe.name}
              </Text>
              <Text
                style={[
                  styles.address,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {addressText}
              </Text>
              <Text
                style={[
                  styles.savedDate,
                  {
                    color:
                      theme.mutedText,
                  },
                ]}
              >
                {formatSavedDate(
                  entry.savedAt,
                )}
                에 저장
              </Text>
            </View>
          </View>

          {/* SAVED_CAFE_V42_DETAIL_VISIT_BUTTON */}
          {!editing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${entry.cafe.name} 방문 기록 관리`}
              onPress={() =>
                router.push({
                  pathname:
                    '/place/saved-cafe-visits',
                  params: {
                    placeId:
                      entry.cafe.placeId,
                  },
                } as never)
              }
              style={({ pressed }) => [
                styles.folderManageButton,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 3
                      : 13,
                  opacity:
                    pressed
                      ? 0.58
                      : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.folderManageIcon,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 10,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.text}
                />
              </View>
              <View
                style={
                  styles.folderManageTextArea
                }
              >
                <Text
                  style={[
                    styles.folderManageTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  방문 기록
                </Text>
                <Text
                  style={[
                    styles.folderManageDescription,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  실제 방문 횟수·최근 방문일·별점과 한 줄 기록을 관리해요.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.subText}
              />
            </Pressable>
          ) : null}

          {/* SAVED_CAFE_V41_DETAIL_FOLDER_BUTTON */}
          {!editing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${entry.cafe.name} 나만의 폴더 관리`}
              onPress={() =>
                router.push({
                  pathname:
                    '/place/saved-cafe-folder-picker',
                  params: {
                    placeId:
                      entry.cafe.placeId,
                  },
                } as never)
              }
              style={({ pressed }) => [
                styles.folderManageButton,
                {
                  backgroundColor:
                    theme.card,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 3
                      : 13,
                  opacity:
                    pressed
                      ? 0.58
                      : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.folderManageIcon,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 10,
                  },
                ]}
              >
                <Ionicons
                  name="folder-open-outline"
                  size={18}
                  color={theme.text}
                />
              </View>
              <View
                style={
                  styles.folderManageTextArea
                }
              >
                <Text
                  style={[
                    styles.folderManageTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  나만의 폴더
                </Text>
                <Text
                  style={[
                    styles.folderManageDescription,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  공부·데이트·주말 목록처럼 여러 폴더에 분류해요.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.subText}
              />
            </Pressable>
          ) : null}

          {editing ? (
            <>
              <SectionCard
                title="1. 관계"
                description="이 카페를 어떤 장소로 기억할지 선택해요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <View
                  style={
                    styles.chipRow
                  }
                >
                  {STATUS_OPTIONS.map(
                    (item) => (
                      <ChoiceChip
                        key={
                          item.id
                        }
                        label={
                          item.label
                        }
                        icon={
                          item.icon
                        }
                        selected={
                          status ===
                          item.id
                        }
                        onPress={() => {
                          setFeedback(
                            '',
                          );
                          setStatus(
                            item.id,
                          );
                        }}
                        theme={
                          theme
                        }
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>
              </SectionCard>

              <SectionCard
                title="2. 대표 테마"
                description="목록과 추천에서 가장 먼저 사용할 대표 목적이에요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <View
                  style={
                    styles.chipRow
                  }
                >
                  {PLACE_PRIMARY_THEMES.map(
                    (item) => (
                      <ChoiceChip
                        key={
                          item.id
                        }
                        label={
                          item.label
                        }
                        selected={
                          primaryTheme ===
                          item.id
                        }
                        onPress={() => {
                          setFeedback(
                            '',
                          );
                          setPrimaryTheme(
                            item.id,
                          );
                        }}
                        theme={
                          theme
                        }
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>
              </SectionCard>

              <SectionCard
                title="3. 카페 테마"
                description="한 개 이상 선택해 주세요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <View
                  style={
                    styles.chipRow
                  }
                >
                  {CAFE_CORE_THEMES.map(
                    (item) => (
                      <ChoiceChip
                        key={
                          item.id
                        }
                        label={
                          item.label
                        }
                        selected={
                          selectedThemes.includes(
                            item.id,
                          )
                        }
                        onPress={() =>
                          toggleTheme(
                            item.id,
                          )
                        }
                        theme={
                          theme
                        }
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>
              </SectionCard>

              <SectionCard
                title="4. 계절"
                description="여러 계절을 함께 선택할 수 있어요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <View
                  style={
                    styles.chipRow
                  }
                >
                  {PLACE_SEASONS.map(
                    (item) => (
                      <ChoiceChip
                        key={
                          item.id
                        }
                        label={
                          item.label
                        }
                        selected={
                          selectedSeasons.includes(
                            item.id,
                          )
                        }
                        onPress={() =>
                          toggleSeason(
                            item.id,
                          )
                        }
                        theme={
                          theme
                        }
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>
              </SectionCard>

              <SectionCard
                title="5. 세부 특징"
                description={`${selectedKeywords.length}/${MAX_CAFE_KEYWORDS}개 선택`}
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                {CAFE_KEYWORD_GROUPS.map(
                  (group) => (
                    <View
                      key={
                        group.id
                      }
                      style={
                        styles.keywordGroup
                      }
                    >
                      <Text
                        style={[
                          styles.keywordGroupTitle,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {group.label}
                      </Text>
                      <View
                        style={
                          styles.chipRow
                        }
                      >
                        {group.keywords.map(
                          (keyword) => (
                            <ChoiceChip
                              key={
                                keyword.id
                              }
                              label={
                                keyword.label
                              }
                              selected={
                                selectedKeywords.includes(
                                  keyword.id,
                                )
                              }
                              onPress={() =>
                                toggleKeyword(
                                  keyword.id,
                                )
                              }
                              theme={
                                theme
                              }
                              isCityBlack={
                                isCityBlack
                              }
                            />
                          ),
                        )}
                      </View>
                    </View>
                  ),
                )}
              </SectionCard>

              <SectionCard
                title="6. 대표 특징"
                description={`${representativeKeywords.length}/${MAX_REPRESENTATIVE_CAFE_KEYWORDS}개 선택`}
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                {selectedKeywords.length ===
                0 ? (
                  <EmptyValue
                    text="먼저 세부 특징을 선택해 주세요."
                    color={
                      theme.subText
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.chipRow
                    }
                  >
                    {selectedKeywords.map(
                      (keywordId) => (
                        <ChoiceChip
                          key={
                            keywordId
                          }
                          label={
                            CAFE_KEYWORD_MAP[
                              keywordId
                            ].label
                          }
                          icon="star-outline"
                          selected={
                            representativeKeywords.includes(
                              keywordId,
                            )
                          }
                          onPress={() =>
                            toggleRepresentativeKeyword(
                              keywordId,
                            )
                          }
                          theme={
                            theme
                          }
                          isCityBlack={
                            isCityBlack
                          }
                        />
                      ),
                    )}
                  </View>
                )}
              </SectionCard>

              <SectionCard
                title="7. 추천 메모"
                description={`${memo.length}/300`}
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <TextInput
                  value={memo}
                  onChangeText={
                    setMemo
                  }
                  placeholder="이 카페를 추천하는 이유나 방문 팁을 적어 주세요."
                  placeholderTextColor={
                    theme.mutedText
                  }
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                  style={[
                    styles.memoInput,
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
                          : 10,
                    },
                  ]}
                />
              </SectionCard>

              {feedback ? (
                <View
                  style={[
                    styles.feedbackCard,
                    {
                      backgroundColor:
                        theme.card2,
                      borderColor:
                        theme.strongLine,
                      borderRadius:
                        isCityBlack
                          ? 2
                          : 10,
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={theme.text}
                  />
                  <Text
                    style={[
                      styles.feedbackText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {feedback}
                  </Text>
                </View>
              ) : null}

              <View
                style={
                  styles.actionRow
                }
              >
                <Pressable
                  disabled={saving}
                  onPress={
                    cancelEditing
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.cancelButton,
                    {
                      backgroundColor:
                        theme.background,
                      borderColor:
                        theme.line,
                      borderRadius:
                        isCityBlack
                          ? 2
                          : theme.radius.button,
                      opacity:
                        saving
                          ? 0.45
                          : pressed
                            ? 0.58
                            : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    취소
                  </Text>
                </Pressable>

                <Pressable
                  disabled={saving}
                  onPress={() => {
                    void handleSave();
                  }}
                  style={({
                    pressed,
                  }) => [
                    styles.saveButton,
                    {
                      backgroundColor:
                        theme.button,
                      borderColor:
                        theme.strongLine,
                      borderRadius:
                        isCityBlack
                          ? 2
                          : theme.radius.button,
                      opacity:
                        saving
                          ? 0.66
                          : pressed
                            ? 0.72
                            : 1,
                    },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        theme.buttonText
                      }
                    />
                  ) : (
                    <Ionicons
                      name="checkmark"
                      size={17}
                      color={
                        theme.buttonText
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.saveButtonText,
                      {
                        color:
                          theme.buttonText,
                      },
                    ]}
                  >
                    {saving
                      ? '수정 저장 중'
                      : '수정 내용 저장'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <SectionCard
                title="관계"
                description="이 카페를 저장한 상태예요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <ValuePill
                  label={
                    STATUS_LABEL_MAP[
                      entry.cafe.status
                    ]
                  }
                  theme={theme}
                  isCityBlack={
                    isCityBlack
                  }
                />
              </SectionCard>

              <SectionCard
                title="대표 테마"
                description="가장 중요한 방문 목적이에요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <ValuePill
                  label={
                    PLACE_PRIMARY_THEME_MAP[
                      entry.cafe.primaryTheme
                    ].label
                  }
                  theme={theme}
                  isCityBlack={
                    isCityBlack
                  }
                />
              </SectionCard>

              <SectionCard
                title="카페 테마"
                description="이 카페를 설명하는 핵심 유형이에요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <View
                  style={
                    styles.valueRow
                  }
                >
                  {entry.cafe.themes.map(
                    (themeId) => (
                      <ValuePill
                        key={
                          themeId
                        }
                        label={
                          CAFE_CORE_THEMES.find(
                            (item) =>
                              item.id ===
                              themeId,
                          )?.label ??
                          themeId
                        }
                        theme={
                          theme
                        }
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>
              </SectionCard>

              <SectionCard
                title="계절"
                description="방문하기 좋은 계절이에요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                <View
                  style={
                    styles.valueRow
                  }
                >
                  {entry.cafe.seasons.map(
                    (seasonId) => (
                      <ValuePill
                        key={
                          seasonId
                        }
                        label={
                          PLACE_SEASON_MAP[
                            seasonId
                          ].label
                        }
                        theme={
                          theme
                        }
                        isCityBlack={
                          isCityBlack
                        }
                      />
                    ),
                  )}
                </View>
              </SectionCard>

              <SectionCard
                title="세부 특징"
                description={`${selectedKeywordLabels.length}개의 특징을 저장했어요.`}
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                {entry.cafe.tags.length ===
                0 ? (
                  <EmptyValue
                    text="선택한 특징이 없어요."
                    color={
                      theme.subText
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.valueRow
                    }
                  >
                    {entry.cafe.tags.map(
                      (keywordId) => (
                        <ValuePill
                          key={
                            keywordId
                          }
                          label={
                            CAFE_KEYWORD_MAP[
                              keywordId
                            ].label
                          }
                          featured={
                            entry.cafe.representativeTags.includes(
                              keywordId,
                            )
                          }
                          theme={
                            theme
                          }
                          isCityBlack={
                            isCityBlack
                          }
                        />
                      ),
                    )}
                  </View>
                )}
              </SectionCard>

              <SectionCard
                title="추천 메모"
                description="저장할 때 남긴 개인 메모예요."
                theme={theme}
                isCityBlack={
                  isCityBlack
                }
              >
                {entry.cafe.memo ? (
                  <Text
                    style={[
                      styles.memoText,
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
                            : 10,
                      },
                    ]}
                  >
                    {entry.cafe.memo}
                  </Text>
                ) : (
                  <EmptyValue
                    text="아직 작성한 추천 메모가 없어요."
                    color={
                      theme.subText
                    }
                  />
                )}
              </SectionCard>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 정보 수정 시작"
                onPress={
                  startEditing
                }
                style={({
                  pressed,
                }) => [
                  styles.fullEditButton,
                  {
                    backgroundColor:
                      theme.button,
                    borderColor:
                      theme.strongLine,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : theme.radius.button,
                    opacity: pressed
                      ? 0.72
                      : 1,
                  },
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={
                    theme.buttonText
                  }
                />
                <Text
                  style={[
                    styles.fullEditButtonText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  저장 정보 수정하기
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}

      <Modal
        visible={
          saveCompleteVisible
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setSaveCompleteVisible(
            false,
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 18,
              },
            ]}
          >
            <View
              style={[
                styles.modalIcon,
                {
                  backgroundColor:
                    theme.card2,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 14,
                },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={25}
                color={theme.text}
              />
            </View>
            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              카페 정보 수정 완료
            </Text>
            <Text
              style={[
                styles.modalMessage,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {entry
                ? `"${entry.cafe.name}"의 저장 정보를 수정했어요.`
                : ''}
            </Text>
            <View
              style={
                styles.modalActions
              }
            >
              <Pressable
                onPress={() =>
                  setSaveCompleteVisible(
                    false,
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.modalSecondaryButton,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : theme.radius.button,
                    opacity: pressed
                      ? 0.58
                      : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalSecondaryText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  계속 보기
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSaveCompleteVisible(
                    false,
                  );
                  router.replace(
                    '/place/saved-cafes' as never,
                  );
                }}
                style={({
                  pressed,
                }) => [
                  styles.modalPrimaryButton,
                  {
                    backgroundColor:
                      theme.button,
                    borderColor:
                      theme.strongLine,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : theme.radius.button,
                    opacity: pressed
                      ? 0.72
                      : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalPrimaryText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  목록으로
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type RootTheme = ReturnType<
  typeof useRootTheme
>['theme'];

type SectionCardProps = {
  title: string;
  description: string;
  theme: RootTheme;
  isCityBlack: boolean;
  children: ReactNode;
};

function SectionCard({
  title,
  description,
  theme,
  isCityBlack,
  children,
}: SectionCardProps) {
  return (
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
              : 15,
        },
      ]}
    >
      <Text
        style={[
          styles.sectionTitle,
          {
            color: theme.text,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {description}
      </Text>
      <View
        style={
          styles.sectionBody
        }
      >
        {children}
      </View>
    </View>
  );
}

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: RootTheme;
  isCityBlack: boolean;
  icon?:
    | 'bookmark-outline'
    | 'heart-outline'
    | 'checkmark-circle-outline'
    | 'star-outline';
};

function ChoiceChip({
  label,
  selected,
  onPress,
  theme,
  isCityBlack,
  icon,
}: ChoiceChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.choiceChip,
        {
          backgroundColor:
            selected
              ? theme.card2
              : theme.background,
          borderColor:
            selected
              ? theme.strongLine
              : theme.line,
          borderRadius:
            isCityBlack
              ? 2
              : 999,
          opacity: pressed
            ? 0.62
            : 1,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={13}
          color={theme.text}
        />
      ) : null}
      <Text
        style={[
          styles.choiceChipText,
          {
            color: theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type ValuePillProps = {
  label: string;
  theme: RootTheme;
  isCityBlack: boolean;
  featured?: boolean;
};

function ValuePill({
  label,
  theme,
  isCityBlack,
  featured = false,
}: ValuePillProps) {
  return (
    <View
      style={[
        styles.valuePill,
        {
          backgroundColor:
            featured
              ? theme.card2
              : theme.background,
          borderColor:
            featured
              ? theme.strongLine
              : theme.line,
          borderRadius:
            isCityBlack
              ? 2
              : 999,
        },
      ]}
    >
      {featured ? (
        <Ionicons
          name="star"
          size={12}
          color={theme.text}
        />
      ) : null}
      <Text
        style={[
          styles.valuePillText,
          {
            color: theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function EmptyValue({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  return (
    <Text
      style={[
        styles.emptyValue,
        { color },
      ]}
    >
      {text}
    </Text>
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
    headerSpacer: {
      width: 58,
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
    editButton: {
      height: 34,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    editButtonText: {
      fontSize: 10,
      fontWeight: '900',
    },
    centerContent: {
      flex: 1,
      paddingHorizontal: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerText: {
      marginTop: 9,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 17,
      textAlign: 'center',
    },
    errorTitle: {
      marginTop: 12,
      fontSize: 15,
      fontWeight: '900',
    },
    backToListButton: {
      minHeight: 40,
      marginTop: 18,
      paddingHorizontal: 18,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backToListText: {
      fontSize: 10.5,
      fontWeight: '900',
    },
    content: {
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 10,
    },
    heroCard: {
      padding: 14,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextArea: {
      flex: 1,
      minWidth: 0,
    },
    cafeName: {
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.25,
    },
    address: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
    },
    savedDate: {
      marginTop: 5,
      fontSize: 9,
      fontWeight: '700',
    },
    folderManageButton: {
      minHeight: 66,
      padding: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    folderManageIcon: {
      width: 39,
      height: 39,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderManageTextArea: {
      flex: 1,
      minWidth: 0,
    },
    folderManageTitle: {
      fontSize: 11.5,
      fontWeight: '900',
    },
    folderManageDescription: {
      marginTop: 4,
      fontSize: 8.8,
      fontWeight: '700',
      lineHeight: 13,
    },

    sectionCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
    },
    sectionDescription: {
      marginTop: 4,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },
    sectionBody: {
      marginTop: 11,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    choiceChip: {
      minHeight: 31,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    choiceChipText: {
      fontSize: 9.5,
      fontWeight: '800',
    },
    keywordGroup: {
      marginBottom: 13,
    },
    keywordGroupTitle: {
      marginBottom: 7,
      fontSize: 10,
      fontWeight: '900',
    },
    valueRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    valuePill: {
      minHeight: 29,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    valuePillText: {
      fontSize: 9.5,
      fontWeight: '800',
    },
    emptyValue: {
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 16,
    },
    memoText: {
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 17,
    },
    memoInput: {
      minHeight: 104,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 10.5,
      fontWeight: '700',
      lineHeight: 17,
    },
    feedbackCard: {
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },
    feedbackText: {
      flex: 1,
      fontSize: 10,
      fontWeight: '800',
      lineHeight: 16,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
    },
    cancelButton: {
      flex: 0.8,
      minHeight: 43,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 10.5,
      fontWeight: '900',
    },
    saveButton: {
      flex: 1.2,
      minHeight: 43,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    saveButtonText: {
      fontSize: 10.5,
      fontWeight: '900',
    },
    fullEditButton: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    fullEditButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },
    modalOverlay: {
      flex: 1,
      paddingHorizontal: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(22, 17, 12, 0.46)',
    },
    modalCard: {
      width: '100%',
      maxWidth: 350,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 16,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
    },
    modalIcon: {
      width: 50,
      height: 50,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      marginTop: 13,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.35,
      textAlign: 'center',
    },
    modalMessage: {
      marginTop: 8,
      fontSize: 11.5,
      fontWeight: '800',
      lineHeight: 18,
      textAlign: 'center',
    },
    modalActions: {
      width: '100%',
      marginTop: 18,
      flexDirection: 'row',
      gap: 8,
    },
    modalSecondaryButton: {
      flex: 0.9,
      minHeight: 42,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalPrimaryButton: {
      flex: 1.1,
      minHeight: 42,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalSecondaryText: {
      fontSize: 10.5,
      fontWeight: '900',
    },
    modalPrimaryText: {
      fontSize: 10.5,
      fontWeight: '900',
    },
  });
