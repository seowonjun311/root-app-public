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
} from 'react';
import {
  ActivityIndicator,
  Alert,
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
  CAFE_THEME_MAP,
} from '../../store/cafeKeywordCatalog';
import {
  PLACE_PRIMARY_THEME_MAP,
} from '../../store/placeThemeCatalog';
import {
  createSavedCafeFolder,
  deleteSavedCafeFolder,
  loadSavedCafeFolderState,
  MAX_SAVED_CAFE_FOLDERS,
  MAX_SAVED_CAFE_FOLDER_NAME_LENGTH,
  pruneSavedCafeFolderMemberships,
  SAVED_CAFE_FOLDER_EMOJIS,
  setSavedCafeFolderMembership,
  updateSavedCafeFolder,
  type SavedCafeFolder,
  type SavedCafeFolderState,
} from '../../store/savedCafeFolders';
import {
  loadSavedCafeEntries,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V40_FOLDER_SCREEN

const STATUS_LABELS = {
  wantToGo: '가보고 싶어요',
  favorite: '좋아하는 장소',
  visited: '방문했어요',
} as const;

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

function normalizeSearchText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase('ko-KR');
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === 'string'
  ) {
    const message =
      (
        error as {
          message: string;
        }
      ).message.trim();

    if (message) {
      return message;
    }
  }

  return '잠시 후 다시 시도해 주세요.';
}

export default function SavedCafeFoldersScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      folderId?:
        | string
        | string[];
    }>();

  const activeFolderId =
    firstParam(
      params.folderId,
    );

  const [
    folderState,
    setFolderState,
  ] =
    useState<SavedCafeFolderState | null>(
      null,
    );

  const [
    cafeEntries,
    setCafeEntries,
  ] =
    useState<SavedCafeLocalEntry[]>(
      [],
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
    reloadVersion,
    setReloadVersion,
  ] = useState(0);

  const [
    editorVisible,
    setEditorVisible,
  ] = useState(false);

  const [
    editingFolder,
    setEditingFolder,
  ] =
    useState<SavedCafeFolder | null>(
      null,
    );

  const [
    folderName,
    setFolderName,
  ] = useState('');

  const [
    folderEmoji,
    setFolderEmoji,
  ] = useState<string>(
    SAVED_CAFE_FOLDER_EMOJIS[0],
  );

  const [
    savingFolder,
    setSavingFolder,
  ] = useState(false);

  const [
    membershipBusyPlaceIds,
    setMembershipBusyPlaceIds,
  ] =
    useState<Set<string>>(
      () => new Set(),
    );

  const [
    cafeSearchQuery,
    setCafeSearchQuery,
  ] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async () => {
        setLoading(true);
        setLoadError('');

        try {
          const [
            nextCafeEntries,
            nextFolderState,
          ] = await Promise.all([
            loadSavedCafeEntries(),
            loadSavedCafeFolderState(),
          ]);

          const cleanedFolderState =
            await pruneSavedCafeFolderMemberships(
              nextCafeEntries.map(
                (entry) =>
                  entry.cafe.placeId,
              ),
            );

          if (!active) {
            return;
          }

          setCafeEntries(
            nextCafeEntries,
          );

          setFolderState(
            cleanedFolderState ??
              nextFolderState,
          );
        } catch (error) {
          console.log(
            'SAVED CAFE FOLDER SCREEN LOAD ERROR',
            error,
          );

          if (active) {
            setLoadError(
              '나만의 카페 목록을 불러오지 못했어요.',
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void run();

      return () => {
        active = false;
      };
    }, [reloadVersion]),
  );

  const folders =
    folderState?.folders ?? [];

  const memberships =
    folderState?.memberships ?? [];

  const cafeEntryMap =
    useMemo(
      () =>
        new Map(
          cafeEntries.map(
            (entry) => [
              entry.cafe.placeId,
              entry,
            ],
          ),
        ),
      [cafeEntries],
    );

  const activeFolder =
    useMemo(
      () =>
        folders.find(
          (folder) =>
            folder.id ===
            activeFolderId,
        ) ?? null,
      [
        activeFolderId,
        folders,
      ],
    );

  const membershipPlaceIds =
    useMemo(
      () =>
        new Set(
          memberships
            .filter(
              (membership) =>
                membership.folderId ===
                activeFolderId,
            )
            .map(
              (membership) =>
                membership.placeId,
            ),
        ),
      [
        activeFolderId,
        memberships,
      ],
    );

  const folderCounts =
    useMemo(() => {
      const map =
        new Map<string, number>();

      memberships.forEach(
        (membership) => {
          if (
            cafeEntryMap.has(
              membership.placeId,
            )
          ) {
            map.set(
              membership.folderId,
              (
                map.get(
                  membership.folderId,
                ) ?? 0
              ) + 1,
            );
          }
        },
      );

      return map;
    }, [
      cafeEntryMap,
      memberships,
    ]);

  const folderPreviewNames =
    useMemo(() => {
      const map =
        new Map<string, string[]>();

      memberships.forEach(
        (membership) => {
          const entry =
            cafeEntryMap.get(
              membership.placeId,
            );

          if (!entry) {
            return;
          }

          const current =
            map.get(
              membership.folderId,
            ) ?? [];

          if (
            current.length < 3 &&
            !current.includes(
              entry.cafe.name,
            )
          ) {
            current.push(
              entry.cafe.name,
            );

            map.set(
              membership.folderId,
              current,
            );
          }
        },
      );

      return map;
    }, [
      cafeEntryMap,
      memberships,
    ]);

  const unassignedCafeCount =
    useMemo(() => {
      const assignedPlaceIds =
        new Set(
          memberships.map(
            (membership) =>
              membership.placeId,
          ),
        );

      return cafeEntries.filter(
        (entry) =>
          !assignedPlaceIds.has(
            entry.cafe.placeId,
          ),
      ).length;
    }, [
      cafeEntries,
      memberships,
    ]);

  const normalizedCafeSearch =
    normalizeSearchText(
      cafeSearchQuery,
    );

  const filteredCafeEntries =
    useMemo(() => {
      const next =
        cafeEntries.filter(
          (entry) => {
            if (
              !normalizedCafeSearch
            ) {
              return true;
            }

            const cafe =
              entry.cafe;

            const searchValues = [
              cafe.name,
              entry.roadAddress ??
                '',
              entry.address ?? '',
              cafe.memo,
              STATUS_LABELS[
                cafe.status
              ],
              PLACE_PRIMARY_THEME_MAP[
                cafe.primaryTheme
              ]?.label ?? '',
              ...cafe.themes.map(
                (themeId) =>
                  CAFE_THEME_MAP[
                    themeId
                  ]?.label ?? '',
              ),
            ];

            return searchValues.some(
              (value) =>
                normalizeSearchText(
                  value,
                ).includes(
                  normalizedCafeSearch,
                ),
            );
          },
        );

      return next.sort(
        (first, second) => {
          const firstIncluded =
            membershipPlaceIds.has(
              first.cafe.placeId,
            );

          const secondIncluded =
            membershipPlaceIds.has(
              second.cafe.placeId,
            );

          if (
            firstIncluded !==
            secondIncluded
          ) {
            return firstIncluded
              ? -1
              : 1;
          }

          return first.cafe.name.localeCompare(
            second.cafe.name,
            'ko-KR',
          );
        },
      );
    }, [
      cafeEntries,
      membershipPlaceIds,
      normalizedCafeSearch,
    ]);

  const openCreateEditor =
    useCallback(() => {
      if (
        folders.length >=
        MAX_SAVED_CAFE_FOLDERS
      ) {
        Alert.alert(
          '폴더 개수 확인',
          `카페 폴더는 최대 ${MAX_SAVED_CAFE_FOLDERS}개까지 만들 수 있어요.`,
        );
        return;
      }

      setEditingFolder(null);
      setFolderName('');
      setFolderEmoji(
        SAVED_CAFE_FOLDER_EMOJIS[
          folders.length %
            SAVED_CAFE_FOLDER_EMOJIS.length
        ],
      );
      setEditorVisible(true);
    }, [
      folders.length,
    ]);

  const openEditEditor =
    useCallback(
      (folder: SavedCafeFolder) => {
        setEditingFolder(folder);
        setFolderName(
          folder.name,
        );
        setFolderEmoji(
          folder.emoji,
        );
        setEditorVisible(true);
      },
      [],
    );

  const closeEditor =
    useCallback(() => {
      if (savingFolder) {
        return;
      }

      setEditorVisible(false);
      setEditingFolder(null);
      setFolderName('');
    }, [savingFolder]);

  const saveFolder =
    useCallback(async () => {
      if (savingFolder) {
        return;
      }

      const name =
        folderName
          .trim()
          .replace(/\s+/g, ' ');

      if (!name) {
        Alert.alert(
          '폴더 이름 확인',
          '폴더 이름을 입력해 주세요.',
        );
        return;
      }

      setSavingFolder(true);

      try {
        const next =
          editingFolder
            ? await updateSavedCafeFolder(
                editingFolder.id,
                {
                  name,
                  emoji:
                    folderEmoji,
                },
              )
            : await createSavedCafeFolder(
                {
                  name,
                  emoji:
                    folderEmoji,
                },
              );

        setFolderState(next);
        setEditorVisible(false);
        setEditingFolder(null);
        setFolderName('');
      } catch (error) {
        Alert.alert(
          editingFolder
            ? '폴더 수정 실패'
            : '폴더 만들기 실패',
          getErrorMessage(error),
        );
      } finally {
        setSavingFolder(false);
      }
    }, [
      editingFolder,
      folderEmoji,
      folderName,
      savingFolder,
    ]);

  const confirmDeleteFolder =
    useCallback(
      (folder: SavedCafeFolder) => {
        const cafeCount =
          folderCounts.get(
            folder.id,
          ) ?? 0;

        Alert.alert(
          '폴더를 삭제할까요?',
          cafeCount > 0
            ? `${folder.name} 폴더에서 ${cafeCount}곳의 분류만 해제돼요. 저장한 카페 자체는 삭제되지 않아요.`
            : `${folder.name} 폴더를 삭제해요. 저장한 카페 자체는 삭제되지 않아요.`,
          [
            {
              text: '취소',
              style: 'cancel',
            },
            {
              text: '폴더 삭제',
              style:
                'destructive',
              onPress: () => {
                void (
                  async () => {
                    try {
                      const next =
                        await deleteSavedCafeFolder(
                          folder.id,
                        );

                      setFolderState(
                        next,
                      );

                      if (
                        activeFolderId ===
                        folder.id
                      ) {
                        router.replace(
                          '/place/saved-cafe-folders' as never,
                        );
                      }
                    } catch (error) {
                      Alert.alert(
                        '폴더 삭제 실패',
                        getErrorMessage(
                          error,
                        ),
                      );
                    }
                  }
                )();
              },
            },
          ],
        );
      },
      [
        activeFolderId,
        folderCounts,
      ],
    );

  const toggleMembership =
    useCallback(
      async (
        entry: SavedCafeLocalEntry,
      ) => {
        if (
          !activeFolder ||
          membershipBusyPlaceIds.has(
            entry.cafe.placeId,
          )
        ) {
          return;
        }

        const placeId =
          entry.cafe.placeId;

        const nextBusy =
          new Set(
            membershipBusyPlaceIds,
          );

        nextBusy.add(placeId);
        setMembershipBusyPlaceIds(
          nextBusy,
        );

        try {
          const next =
            await setSavedCafeFolderMembership(
              activeFolder.id,
              placeId,
              !membershipPlaceIds.has(
                placeId,
              ),
            );

          setFolderState(next);
        } catch (error) {
          Alert.alert(
            '폴더 저장 실패',
            getErrorMessage(error),
          );
        } finally {
          setMembershipBusyPlaceIds(
            (current) => {
              const updated =
                new Set(current);

              updated.delete(
                placeId,
              );

              return updated;
            },
          );
        }
      },
      [
        activeFolder,
        membershipBusyPlaceIds,
        membershipPlaceIds,
      ],
    );

  const openCafeDetail =
    useCallback(
      (
        entry: SavedCafeLocalEntry,
      ) => {
        router.push({
          pathname:
            '/place/cafe-detail',
          params: {
            placeId:
              entry.cafe.placeId,
          },
        } as never);
      },
      [],
    );

  const goBack =
    useCallback(() => {
      if (activeFolderId) {
        router.replace(
          '/place/saved-cafe-folders' as never,
        );
        return;
      }

      router.back();
    }, [activeFolderId]);

  const openFolder =
    useCallback(
      (folder: SavedCafeFolder) => {
        setCafeSearchQuery('');

        router.push({
          pathname:
            '/place/saved-cafe-folders',
          params: {
            folderId:
              folder.id,
          },
        } as never);
      },
      [],
    );

  const title =
    activeFolder
      ? activeFolder.name
      : '나만의 카페 목록';

  const subtitle =
    activeFolder
      ? `${membershipPlaceIds.size}곳을 담았어요.`
      : `${folders.length}개 폴더 · 저장 카페 ${cafeEntries.length}곳`;

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
            backgroundColor:
              theme.background,
            borderBottomColor:
              theme.line,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activeFolderId
              ? '폴더 목록으로 돌아가기'
              : '저장 카페 화면으로 돌아가기'
          }
          onPress={goBack}
          style={({ pressed }) => [
            styles.headerBackButton,
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
            color={theme.text}
          />
        </Pressable>

        <View
          style={
            styles.headerTextArea
          }
        >
          <Text
            numberOfLines={1}
            style={[
              styles.headerTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {activeFolder
              ? `${activeFolder.emoji} ${title}`
              : title}
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
            {loading
              ? '불러오는 중...'
              : subtitle}
          </Text>
        </View>

        {activeFolder ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${activeFolder.name} 폴더 수정`}
            onPress={() =>
              openEditEditor(
                activeFolder,
              )
            }
            style={({ pressed }) => [
              styles.headerActionButton,
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
              name="create-outline"
              size={15}
              color={theme.text}
            />
            <Text
              style={[
                styles.headerActionText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              수정
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="새 카페 폴더 만들기"
            onPress={
              openCreateEditor
            }
            style={({ pressed }) => [
              styles.headerActionButton,
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
              size={16}
              color={theme.text}
            />
            <Text
              style={[
                styles.headerActionText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              새 폴더
            </Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View
          style={styles.centerArea}
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
            나만의 카페 목록을 불러오고 있어요.
          </Text>
        </View>
      ) : loadError ? (
        <View
          style={styles.centerArea}
        >
          <View
            style={[
              styles.messageCard,
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
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={theme.text}
            />
            <Text
              style={[
                styles.messageTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              목록을 불러오지 못했어요.
            </Text>
            <Text
              style={[
                styles.messageDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 폴더 다시 불러오기"
              onPress={() =>
                setReloadVersion(
                  (value) =>
                    value + 1,
                )
              }
              style={({ pressed }) => [
                styles.messageButton,
                {
                  backgroundColor:
                    theme.background,
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
                name="refresh-outline"
                size={15}
                color={theme.text}
              />
              <Text
                style={[
                  styles.messageButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                다시 불러오기
              </Text>
            </Pressable>
          </View>
        </View>
      ) : activeFolderId &&
        !activeFolder ? (
        <View
          style={styles.centerArea}
        >
          <View
            style={[
              styles.messageCard,
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
            <Ionicons
              name="folder-open-outline"
              size={30}
              color={theme.text}
            />
            <Text
              style={[
                styles.messageTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              폴더를 찾을 수 없어요.
            </Text>
            <Text
              style={[
                styles.messageDescription,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              다른 기기에서 삭제됐거나 폴더 정보가 변경됐을 수 있어요.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 폴더 목록 보기"
              onPress={() =>
                router.replace(
                  '/place/saved-cafe-folders' as never,
                )
              }
              style={({ pressed }) => [
                styles.messageButton,
                {
                  backgroundColor:
                    theme.background,
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
                  styles.messageButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                폴더 목록
              </Text>
            </Pressable>
          </View>
        </View>
      ) : activeFolder ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + 26,
            },
          ]}
        >
          <View
            style={[
              styles.folderInfoCard,
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
              style={[
                styles.folderEmojiBox,
                {
                  backgroundColor:
                    theme.background,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 12,
                },
              ]}
            >
              <Text
                style={
                  styles.folderEmojiText
                }
              >
                {activeFolder.emoji}
              </Text>
            </View>

            <View
              style={
                styles.folderInfoTextArea
              }
            >
              <Text
                style={[
                  styles.folderInfoTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {activeFolder.name}
              </Text>
              <Text
                style={[
                  styles.folderInfoDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                한 카페를 여러 폴더에 동시에 담을 수 있어요.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${activeFolder.name} 폴더 삭제`}
              onPress={() =>
                confirmDeleteFolder(
                  activeFolder,
                )
              }
              style={({ pressed }) => [
                styles.iconActionButton,
                {
                  backgroundColor:
                    theme.background,
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
                name="trash-outline"
                size={16}
                color={theme.text}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.searchCard,
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
                styles.searchBox,
                {
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
              <Ionicons
                name="search-outline"
                size={16}
                color={
                  theme.subText
                }
              />
              <TextInput
                value={
                  cafeSearchQuery
                }
                onChangeText={
                  setCafeSearchQuery
                }
                placeholder="폴더에 담을 카페 검색"
                placeholderTextColor={
                  theme.subText
                }
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                selectionColor={
                  theme.text
                }
                style={[
                  styles.searchInput,
                  {
                    color:
                      theme.text,
                  },
                ]}
              />
              {cafeSearchQuery ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="폴더 카페 검색어 지우기"
                  onPress={() =>
                    setCafeSearchQuery(
                      '',
                    )
                  }
                  hitSlop={8}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={
                      theme.subText
                    }
                  />
                </Pressable>
              ) : null}
            </View>

            <View
              style={
                styles.searchSummaryRow
              }
            >
              <Text
                style={[
                  styles.searchSummaryText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                폴더 {membershipPlaceIds.size}곳 · 검색 결과 {filteredCafeEntries.length}곳
              </Text>
            </View>
          </View>

          {cafeEntries.length ===
          0 ? (
            <View
              style={[
                styles.messageCard,
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
              <Ionicons
                name="cafe-outline"
                size={30}
                color={theme.text}
              />
              <Text
                style={[
                  styles.messageTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                먼저 카페를 저장해 주세요.
              </Text>
              <Text
                style={[
                  styles.messageDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                저장한 카페가 생기면 이 폴더에 원하는 장소를 담을 수 있어요.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 추가 화면 열기"
                onPress={() =>
                  router.push(
                    '/place/cafe-save' as never,
                  )
                }
                style={({ pressed }) => [
                  styles.messageButton,
                  {
                    backgroundColor:
                      theme.background,
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
                  size={15}
                  color={theme.text}
                />
                <Text
                  style={[
                    styles.messageButtonText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  카페 추가
                </Text>
              </Pressable>
            </View>
          ) : filteredCafeEntries
              .length === 0 ? (
            <View
              style={[
                styles.messageCard,
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
              <Ionicons
                name="search-outline"
                size={27}
                color={
                  theme.subText
                }
              />
              <Text
                style={[
                  styles.messageTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                검색 결과가 없어요.
              </Text>
              <Text
                style={[
                  styles.messageDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                다른 카페명이나 테마로 검색해 보세요.
              </Text>
            </View>
          ) : (
            filteredCafeEntries.map(
              (entry) => {
                const placeId =
                  entry.cafe.placeId;

                const included =
                  membershipPlaceIds.has(
                    placeId,
                  );

                const busy =
                  membershipBusyPlaceIds.has(
                    placeId,
                  );

                return (
                  <View
                    key={placeId}
                    style={[
                      styles.cafeCard,
                      {
                        backgroundColor:
                          theme.card,
                        borderColor:
                          included
                            ? theme.strongLine
                            : theme.line,
                        borderRadius:
                          isCityBlack
                            ? 3
                            : 14,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.cafe.name} 상세 보기`}
                      onPress={() =>
                        openCafeDetail(
                          entry,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.cafeDetailArea,
                        {
                          opacity:
                            pressed
                              ? 0.58
                              : 1,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.cafeName,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        {
                          entry.cafe
                            .name
                        }
                      </Text>

                      <Text
                        numberOfLines={1}
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
                          '주소 정보 없음'}
                      </Text>

                      <View
                        style={
                          styles.cafeBadgeRow
                        }
                      >
                        <Text
                          style={[
                            styles.cafeBadgeText,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {
                            STATUS_LABELS[
                              entry.cafe
                                .status
                            ]
                          }
                        </Text>
                        <Text
                          style={[
                            styles.cafeBadgeDot,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          ·
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.cafeBadgeText,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {PLACE_PRIMARY_THEME_MAP[
                            entry.cafe
                              .primaryTheme
                          ]?.label ??
                            '카페'}
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        included
                          ? `${entry.cafe.name}을 ${activeFolder.name} 폴더에서 빼기`
                          : `${entry.cafe.name}을 ${activeFolder.name} 폴더에 담기`
                      }
                      accessibilityState={{
                        selected:
                          included,
                        disabled: busy,
                      }}
                      disabled={busy}
                      onPress={() => {
                        void toggleMembership(
                          entry,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.membershipButton,
                        {
                          backgroundColor:
                            included
                              ? theme.button
                              : theme.background,
                          borderColor:
                            included
                              ? theme.strongLine
                              : theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 9,
                          opacity:
                            busy
                              ? 0.45
                              : pressed
                                ? 0.58
                                : 1,
                        },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            included
                              ? theme.buttonText
                              : theme.text
                          }
                        />
                      ) : (
                        <Ionicons
                          name={
                            included
                              ? 'checkmark'
                              : 'add'
                          }
                          size={15}
                          color={
                            included
                              ? theme.buttonText
                              : theme.text
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.membershipButtonText,
                          {
                            color:
                              included
                                ? theme.buttonText
                                : theme.text,
                          },
                        ]}
                      >
                        {included
                          ? '담김'
                          : '담기'}
                      </Text>
                    </Pressable>
                  </View>
                );
              },
            )
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + 26,
            },
          ]}
        >
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
                    : 16,
              },
            ]}
          >
            <View
              style={[
                styles.summaryIconBox,
                {
                  backgroundColor:
                    theme.background,
                  borderColor:
                    theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 12,
                },
              ]}
            >
              <Ionicons
                name="folder-open-outline"
                size={23}
                color={theme.text}
              />
            </View>

            <View
              style={
                styles.summaryTextArea
              }
            >
              <Text
                style={[
                  styles.summaryTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                원하는 기준으로 카페를 모아보세요.
              </Text>
              <Text
                style={[
                  styles.summaryDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                공부할 곳, 데이트, 심야 카페처럼 자유롭게 만들 수 있어요.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.summaryBadgeRow
            }
          >
            <SummaryBadge
              label="폴더"
              value={`${folders.length}개`}
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
            <SummaryBadge
              label="저장 카페"
              value={`${cafeEntries.length}곳`}
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
            <SummaryBadge
              label="미분류"
              value={`${unassignedCafeCount}곳`}
              theme={theme}
              isCityBlack={
                isCityBlack
              }
            />
          </View>

          {folders.length === 0 ? (
            <View
              style={[
                styles.messageCard,
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
              <Ionicons
                name="folder-outline"
                size={31}
                color={theme.text}
              />
              <Text
                style={[
                  styles.messageTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                아직 만든 폴더가 없어요.
              </Text>
              <Text
                style={[
                  styles.messageDescription,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                첫 번째 나만의 카페 목록을 만들어 보세요.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="첫 카페 폴더 만들기"
                onPress={
                  openCreateEditor
                }
                style={({ pressed }) => [
                  styles.messageButton,
                  {
                    backgroundColor:
                      theme.background,
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
                  size={15}
                  color={theme.text}
                />
                <Text
                  style={[
                    styles.messageButtonText,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  새 폴더
                </Text>
              </Pressable>
            </View>
          ) : (
            folders.map(
              (folder) => {
                const count =
                  folderCounts.get(
                    folder.id,
                  ) ?? 0;

                const previews =
                  folderPreviewNames.get(
                    folder.id,
                  ) ?? [];

                return (
                  <View
                    key={folder.id}
                    style={[
                      styles.folderCard,
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${folder.name} 폴더 열기`}
                      onPress={() =>
                        openFolder(
                          folder,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.folderOpenArea,
                        {
                          opacity:
                            pressed
                              ? 0.58
                              : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.folderCardEmojiBox,
                          {
                            backgroundColor:
                              theme.background,
                            borderColor:
                              theme.line,
                            borderRadius:
                              isCityBlack
                                ? 2
                                : 12,
                          },
                        ]}
                      >
                        <Text
                          style={
                            styles.folderCardEmoji
                          }
                        >
                          {folder.emoji}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.folderCardTextArea
                        }
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.folderCardTitle,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {folder.name}
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.folderCardPreview,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {previews.length >
                          0
                            ? previews.join(
                                ' · ',
                              )
                            : '아직 담긴 카페가 없어요.'}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.folderCountArea
                        }
                      >
                        <Text
                          style={[
                            styles.folderCountText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {count}곳
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={15}
                          color={
                            theme.subText
                          }
                        />
                      </View>
                    </Pressable>

                    <View
                      style={[
                        styles.folderCardActions,
                        {
                          borderTopColor:
                            theme.line,
                        },
                      ]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${folder.name} 폴더 이름과 아이콘 수정`}
                        onPress={() =>
                          openEditEditor(
                            folder,
                          )
                        }
                        style={({
                          pressed,
                        }) => [
                          styles.folderCardActionButton,
                          {
                            opacity:
                              pressed
                                ? 0.5
                                : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name="create-outline"
                          size={14}
                          color={theme.text}
                        />
                        <Text
                          style={[
                            styles.folderCardActionText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          수정
                        </Text>
                      </Pressable>

                      <View
                        style={[
                          styles.actionDivider,
                          {
                            backgroundColor:
                              theme.line,
                          },
                        ]}
                      />

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${folder.name} 폴더 삭제`}
                        onPress={() =>
                          confirmDeleteFolder(
                            folder,
                          )
                        }
                        style={({
                          pressed,
                        }) => [
                          styles.folderCardActionButton,
                          {
                            opacity:
                              pressed
                                ? 0.5
                                : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color={theme.text}
                        />
                        <Text
                          style={[
                            styles.folderCardActionText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          삭제
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              },
            )
          )}
        </ScrollView>
      )}

      <Modal
        visible={editorVisible}
        transparent
        animationType="fade"
        onRequestClose={
          closeEditor
        }
      >
        <Pressable
          style={
            styles.modalBackdrop
          }
          onPress={
            closeEditor
          }
        >
          <Pressable
            style={[
              styles.editorCard,
              {
                marginBottom:
                  insets.bottom +
                  18,
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
            onPress={() => {
              // 모달 내부 탭이 배경으로 전달되지 않도록 유지합니다.
            }}
          >
            <View
              style={
                styles.editorHeader
              }
            >
              <View
                style={
                  styles.editorHeaderTextArea
                }
              >
                <Text
                  style={[
                    styles.editorTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {editingFolder
                    ? '카페 폴더 수정'
                    : '새 카페 폴더'}
                </Text>
                <Text
                  style={[
                    styles.editorSubtitle,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  한 카페를 여러 폴더에 담을 수 있어요.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 폴더 편집창 닫기"
                onPress={
                  closeEditor
                }
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={theme.text}
                />
              </Pressable>
            </View>

            <Text
              style={[
                styles.editorLabel,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              아이콘
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.emojiRow
              }
            >
              {SAVED_CAFE_FOLDER_EMOJIS.map(
                (emoji) => {
                  const selected =
                    folderEmoji ===
                    emoji;

                  return (
                    <Pressable
                      key={emoji}
                      accessibilityRole="button"
                      accessibilityLabel={`${emoji} 폴더 아이콘 선택`}
                      accessibilityState={{
                        selected,
                      }}
                      onPress={() =>
                        setFolderEmoji(
                          emoji,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.emojiButton,
                        {
                          backgroundColor:
                            selected
                              ? theme.button
                              : theme.background,
                          borderColor:
                            selected
                              ? theme.strongLine
                              : theme.line,
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 11,
                          opacity:
                            pressed
                              ? 0.58
                              : 1,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.emojiButtonText
                        }
                      >
                        {emoji}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </ScrollView>

            <Text
              style={[
                styles.editorLabel,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              폴더 이름
            </Text>

            <TextInput
              value={folderName}
              onChangeText={
                setFolderName
              }
              placeholder="예: 공부할 곳"
              placeholderTextColor={
                theme.subText
              }
              maxLength={
                MAX_SAVED_CAFE_FOLDER_NAME_LENGTH
              }
              autoFocus
              returnKeyType="done"
              selectionColor={
                theme.text
              }
              onSubmitEditing={() => {
                void saveFolder();
              }}
              style={[
                styles.editorInput,
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

            <Text
              style={[
                styles.editorCounter,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {folderName.length} / {MAX_SAVED_CAFE_FOLDER_NAME_LENGTH}
            </Text>

            <View
              style={
                styles.editorButtonRow
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="카페 폴더 편집 취소"
                disabled={
                  savingFolder
                }
                onPress={
                  closeEditor
                }
                style={({ pressed }) => [
                  styles.editorButton,
                  {
                    backgroundColor:
                      theme.background,
                    borderColor:
                      theme.line,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 9,
                    opacity:
                      savingFolder
                        ? 0.45
                        : pressed
                          ? 0.55
                          : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.editorButtonText,
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
                accessibilityRole="button"
                accessibilityLabel={
                  editingFolder
                    ? '카페 폴더 수정 저장'
                    : '새 카페 폴더 만들기'
                }
                disabled={
                  savingFolder
                }
                onPress={() => {
                  void saveFolder();
                }}
                style={({ pressed }) => [
                  styles.editorButton,
                  {
                    backgroundColor:
                      theme.button,
                    borderColor:
                      theme.strongLine,
                    borderRadius:
                      isCityBlack
                        ? 2
                        : 9,
                    opacity:
                      savingFolder
                        ? 0.55
                        : pressed
                          ? 0.68
                          : 1,
                  },
                ]}
              >
                {savingFolder ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      theme.buttonText
                    }
                  />
                ) : null}
                <Text
                  style={[
                    styles.editorButtonText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  {editingFolder
                    ? '저장'
                    : '만들기'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type SummaryBadgeProps = {
  label: string;
  value: string;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function SummaryBadge({
  label,
  value,
  theme,
  isCityBlack,
}: SummaryBadgeProps) {
  return (
    <View
      style={[
        styles.summaryBadge,
        {
          backgroundColor:
            theme.card,
          borderColor:
            theme.line,
          borderRadius:
            isCityBlack
              ? 3
              : 12,
        },
      ]}
    >
      <Text
        style={[
          styles.summaryBadgeLabel,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.summaryBadgeValue,
          {
            color:
              theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 3,
  },

  headerBackButton: {
    width: 36,
    height: 36,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextArea: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: '700',
  },

  headerActionButton: {
    minHeight: 34,
    paddingHorizontal: 9,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  headerActionText: {
    fontSize: 9,
    fontWeight: '900',
  },

  scrollContent: {
    padding: 14,
    gap: 10,
  },

  centerArea: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  centerText: {
    fontSize: 10,
    fontWeight: '700',
  },

  messageCard: {
    width: '100%',
    minHeight: 190,
    padding: 22,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  messageTitle: {
    marginTop: 11,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  messageDescription: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
    textAlign: 'center',
  },

  messageButton: {
    minHeight: 35,
    marginTop: 13,
    paddingHorizontal: 11,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  messageButtonText: {
    fontSize: 9.5,
    fontWeight: '900',
  },

  summaryCard: {
    minHeight: 92,
    padding: 13,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  summaryIconBox: {
    width: 50,
    height: 50,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryTextArea: {
    flex: 1,
    minWidth: 0,
  },

  summaryTitle: {
    fontSize: 12,
    fontWeight: '900',
  },

  summaryDescription: {
    marginTop: 5,
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 14,
  },

  summaryBadgeRow: {
    flexDirection: 'row',
    gap: 7,
  },

  summaryBadge: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth:
      StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },

  summaryBadgeLabel: {
    fontSize: 8.5,
    fontWeight: '800',
  },

  summaryBadgeValue: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '900',
  },

  folderCard: {
    overflow: 'hidden',
    borderWidth:
      StyleSheet.hairlineWidth,
  },

  folderOpenArea: {
    minHeight: 86,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  folderCardEmojiBox: {
    width: 48,
    height: 48,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  folderCardEmoji: {
    fontSize: 23,
  },

  folderCardTextArea: {
    flex: 1,
    minWidth: 0,
  },

  folderCardTitle: {
    fontSize: 13,
    fontWeight: '900',
  },

  folderCardPreview: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: '700',
  },

  folderCountArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  folderCountText: {
    fontSize: 10,
    fontWeight: '900',
  },

  folderCardActions: {
    height: 38,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },

  folderCardActionButton: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  folderCardActionText: {
    fontSize: 9,
    fontWeight: '900',
  },

  actionDivider: {
    width:
      StyleSheet.hairlineWidth,
    height: 18,
  },

  folderInfoCard: {
    minHeight: 82,
    padding: 12,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  folderEmojiBox: {
    width: 46,
    height: 46,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  folderEmojiText: {
    fontSize: 22,
  },

  folderInfoTextArea: {
    flex: 1,
    minWidth: 0,
  },

  folderInfoTitle: {
    fontSize: 12.5,
    fontWeight: '900',
  },

  folderInfoDescription: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 13,
  },

  iconActionButton: {
    width: 34,
    height: 34,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchCard: {
    padding: 10,
    borderWidth:
      StyleSheet.hairlineWidth,
    gap: 8,
  },

  searchBox: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    fontSize: 10,
    fontWeight: '700',
  },

  searchSummaryRow: {
    minHeight: 22,
    justifyContent: 'center',
  },

  searchSummaryText: {
    fontSize: 8.8,
    fontWeight: '800',
  },

  cafeCard: {
    minHeight: 84,
    padding: 11,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  cafeDetailArea: {
    flex: 1,
    minWidth: 0,
  },

  cafeName: {
    fontSize: 12,
    fontWeight: '900',
  },

  cafeAddress: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700',
  },

  cafeBadgeRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  cafeBadgeText: {
    maxWidth: 120,
    fontSize: 8.5,
    fontWeight: '800',
  },

  cafeBadgeDot: {
    fontSize: 8,
    fontWeight: '800',
  },

  membershipButton: {
    minWidth: 61,
    minHeight: 36,
    paddingHorizontal: 8,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  membershipButtonText: {
    fontSize: 9,
    fontWeight: '900',
  },

  modalBackdrop: {
    flex: 1,
    padding: 18,
    backgroundColor:
      'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },

  editorCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 16,
    borderWidth:
      StyleSheet.hairlineWidth,
  },

  editorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  editorHeaderTextArea: {
    flex: 1,
    minWidth: 0,
  },

  editorTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  editorSubtitle: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: '700',
  },

  editorLabel: {
    marginTop: 15,
    marginBottom: 7,
    fontSize: 9,
    fontWeight: '900',
  },

  emojiRow: {
    gap: 7,
    paddingRight: 3,
  },

  emojiButton: {
    width: 43,
    height: 43,
    borderWidth:
      StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emojiButtonText: {
    fontSize: 21,
  },

  editorInput: {
    minHeight: 44,
    paddingHorizontal: 11,
    borderWidth:
      StyleSheet.hairlineWidth,
    fontSize: 11,
    fontWeight: '800',
  },

  editorCounter: {
    marginTop: 5,
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'right',
  },

  editorButtonRow: {
    marginTop: 15,
    flexDirection: 'row',
    gap: 8,
  },

  editorButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  editorButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
});
