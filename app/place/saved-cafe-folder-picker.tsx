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
  createSavedCafeFolder,
  loadSavedCafeFolderState,
  MAX_SAVED_CAFE_FOLDERS,
  MAX_SAVED_CAFE_FOLDER_NAME_LENGTH,
  SAVED_CAFE_FOLDER_EMOJIS,
  setSavedCafeFolderMembership,
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

// SAVED_CAFE_V41_QUICK_FOLDER_PICKER

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

export default function SavedCafeFolderPickerScreen() {
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
    folderState,
    setFolderState,
  ] =
    useState<SavedCafeFolderState | null>(
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
    reloadVersion,
    setReloadVersion,
  ] = useState(0);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    busyFolderId,
    setBusyFolderId,
  ] = useState<string | null>(
    null,
  );

  const [
    editorVisible,
    setEditorVisible,
  ] = useState(false);

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
    creatingFolder,
    setCreatingFolder,
  ] = useState(false);

  const [
    editorError,
    setEditorError,
  ] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async () => {
        setLoading(true);
        setLoadError('');

        try {
          const [
            entries,
            nextFolderState,
          ] = await Promise.all([
            loadSavedCafeEntries(),
            loadSavedCafeFolderState(),
          ]);

          if (!active) {
            return;
          }

          const found =
            entries.find(
              (item) =>
                item.cafe.placeId ===
                placeId,
            ) ?? null;

          setEntry(found);
          setFolderState(
            nextFolderState,
          );

          if (!found) {
            setLoadError(
              '저장한 카페를 찾을 수 없어요.',
            );
          }
        } catch (error) {
          console.log(
            'SAVED CAFE QUICK FOLDER LOAD ERROR',
            error,
          );

          if (active) {
            setLoadError(
              '카페 폴더 정보를 불러오지 못했어요.',
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
    }, [
      placeId,
      reloadVersion,
    ]),
  );

  const selectedFolderIds =
    useMemo(() => {
      const ids = new Set<string>();

      if (!folderState || !placeId) {
        return ids;
      }

      folderState.memberships.forEach(
        (membership) => {
          if (
            membership.placeId ===
            placeId
          ) {
            ids.add(
              membership.folderId,
            );
          }
        },
      );

      return ids;
    }, [
      folderState,
      placeId,
    ]);

  const folderCafeCounts =
    useMemo(() => {
      const counts =
        new Map<string, number>();

      folderState?.memberships.forEach(
        (membership) => {
          counts.set(
            membership.folderId,
            (
              counts.get(
                membership.folderId,
              ) ?? 0
            ) + 1,
          );
        },
      );

      return counts;
    }, [folderState]);

  const filteredFolders =
    useMemo(() => {
      const query =
        normalizeSearchText(
          searchQuery,
        );

      const folders =
        folderState?.folders ?? [];

      if (!query) {
        return folders;
      }

      return folders.filter(
        (folder) =>
          normalizeSearchText(
            `${folder.emoji} ${folder.name}`,
          ).includes(query),
      );
    }, [
      folderState,
      searchQuery,
    ]);

  const openEditor =
    useCallback(() => {
      if (
        !folderState ||
        folderState.folders.length >=
          MAX_SAVED_CAFE_FOLDERS
      ) {
        Alert.alert(
          '폴더를 더 만들 수 없어요.',
          `카페 폴더는 최대 ${MAX_SAVED_CAFE_FOLDERS}개까지 만들 수 있어요.`,
        );
        return;
      }

      setFolderName('');
      setFolderEmoji(
        SAVED_CAFE_FOLDER_EMOJIS[0],
      );
      setEditorError('');
      setEditorVisible(true);
    }, [folderState]);

  const closeEditor =
    useCallback(() => {
      if (creatingFolder) {
        return;
      }

      setEditorVisible(false);
      setEditorError('');
    }, [creatingFolder]);

  const toggleFolder =
    useCallback(
      async (
        folder: SavedCafeFolder,
      ) => {
        if (
          !placeId ||
          busyFolderId
        ) {
          return;
        }

        const included =
          selectedFolderIds.has(
            folder.id,
          );

        setBusyFolderId(
          folder.id,
        );

        try {
          const next =
            await setSavedCafeFolderMembership(
              folder.id,
              placeId,
              !included,
            );

          setFolderState(next);
        } catch (error) {
          console.log(
            'SAVED CAFE QUICK FOLDER TOGGLE ERROR',
            error,
          );

          Alert.alert(
            '폴더를 변경하지 못했어요.',
            getErrorMessage(error),
          );
        } finally {
          setBusyFolderId(null);
        }
      },
      [
        busyFolderId,
        placeId,
        selectedFolderIds,
      ],
    );

  const createFolder =
    useCallback(async () => {
      if (
        creatingFolder ||
        !placeId ||
        !folderState
      ) {
        return;
      }

      const normalizedName =
        folderName
          .trim()
          .slice(
            0,
            MAX_SAVED_CAFE_FOLDER_NAME_LENGTH,
          );

      if (!normalizedName) {
        setEditorError(
          '폴더 이름을 입력해 주세요.',
        );
        return;
      }

      setCreatingFolder(true);
      setEditorError('');

      try {
        const existingIds =
          new Set(
            folderState.folders.map(
              (folder) =>
                folder.id,
            ),
          );

        const createdState =
          await createSavedCafeFolder({
            name: normalizedName,
            emoji: folderEmoji,
          });

        const createdFolder =
          createdState.folders.find(
            (folder) =>
              !existingIds.has(
                folder.id,
              ),
          );

        if (!createdFolder) {
          throw new Error(
            '새로 만든 폴더를 찾지 못했어요.',
          );
        }

        const next =
          await setSavedCafeFolderMembership(
            createdFolder.id,
            placeId,
            true,
          );

        setFolderState(next);
        setEditorVisible(false);
        setFolderName('');
        setEditorError('');
      } catch (error) {
        console.log(
          'SAVED CAFE QUICK FOLDER CREATE ERROR',
          error,
        );

        setEditorError(
          getErrorMessage(error),
        );
      } finally {
        setCreatingFolder(false);
      }
    }, [
      creatingFolder,
      folderEmoji,
      folderName,
      folderState,
      placeId,
    ]);

  const openFolder =
    useCallback(
      (
        folder: SavedCafeFolder,
      ) => {
        router.push({
          pathname:
            '/place/saved-cafe-folders',
          params: {
            folderId: folder.id,
          },
        } as never);
      },
      [],
    );

  const retryLoad =
    useCallback(() => {
      setReloadVersion(
        (value) => value + 1,
      );
    }, []);

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
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          onPress={() =>
            router.back()
          }
          style={({ pressed }) => [
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
            color={theme.text}
          />
        </Pressable>

        <View
          style={
            styles.headerTextArea
          }
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
          >
            폴더에 담기
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.subtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {entry
              ? entry.cafe.name
              : '저장한 카페를 분류해요.'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 카페 폴더 만들기"
          disabled={
            loading ||
            !folderState
          }
          onPress={openEditor}
          style={({ pressed }) => [
            styles.createHeaderButton,
            {
              borderColor:
                theme.line,
              borderRadius:
                isCityBlack
                  ? 2
                  : 9,
              opacity:
                loading ||
                !folderState
                  ? 0.4
                  : pressed
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
              styles.createHeaderText,
              {
                color: theme.text,
              },
            ]}
          >
            새 폴더
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View
          style={
            styles.centerArea
          }
        >
          <ActivityIndicator
            size="small"
            color={theme.text}
          />
          <Text
            style={[
              styles.centerDescription,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            카페 폴더를 불러오는 중이에요.
          </Text>
        </View>
      ) : loadError ||
        !entry ||
        !folderState ? (
        <View
          style={
            styles.centerArea
          }
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
              size={29}
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
              폴더를 열 수 없어요.
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
              {loadError ||
                '카페 정보를 확인해 주세요.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="카페 폴더 다시 불러오기"
              onPress={retryLoad}
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
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + 28,
            },
          ]}
        >
          <View
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
              style={[
                styles.cafeIconBox,
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
              <Ionicons
                name="cafe-outline"
                size={21}
                color={theme.text}
              />
            </View>

            <View
              style={
                styles.cafeTextArea
              }
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
                {entry.cafe.name}
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
              <Text
                style={[
                  styles.selectedCountText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                현재 {selectedFolderIds.size}개 폴더에 담겨 있어요.
              </Text>
            </View>
          </View>

          {folderState.folders.length >
          0 ? (
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
                  value={searchQuery}
                  onChangeText={
                    setSearchQuery
                  }
                  placeholder="폴더 이름 검색"
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
                {searchQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="폴더 검색어 지우기"
                    onPress={() =>
                      setSearchQuery('')
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

              <Text
                style={[
                  styles.searchSummary,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                전체 {folderState.folders.length}개 · 선택 {selectedFolderIds.size}개
              </Text>
            </View>
          ) : null}

          {folderState.folders.length ===
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
                name="folder-open-outline"
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
                새 폴더를 만들면 이 카페가 바로 담겨요.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="첫 카페 폴더 만들기"
                onPress={openEditor}
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
                  첫 폴더 만들기
                </Text>
              </Pressable>
            </View>
          ) : filteredFolders.length ===
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
                다른 폴더 이름으로 검색해 보세요.
              </Text>
            </View>
          ) : (
            filteredFolders.map(
              (folder) => {
                const selected =
                  selectedFolderIds.has(
                    folder.id,
                  );

                const busy =
                  busyFolderId !== null;

                return (
                  <View
                    key={folder.id}
                    style={[
                      styles.folderCard,
                      {
                        backgroundColor:
                          theme.card,
                        borderColor:
                          selected
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
                      accessibilityLabel={`${folder.name} 폴더 열기`}
                      onPress={() =>
                        openFolder(folder)
                      }
                      style={({ pressed }) => [
                        styles.folderInfoArea,
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
                          styles.folderEmojiBox,
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
                        <Text
                          style={
                            styles.folderEmojiText
                          }
                        >
                          {folder.emoji}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.folderTextArea
                        }
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.folderName,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {folder.name}
                        </Text>
                        <Text
                          style={[
                            styles.folderCount,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          카페 {folderCafeCounts.get(
                            folder.id,
                          ) ?? 0}곳
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={
                        selected
                          ? `${entry.cafe.name}을 ${folder.name} 폴더에서 빼기`
                          : `${entry.cafe.name}을 ${folder.name} 폴더에 담기`
                      }
                      accessibilityState={{
                        checked:
                          selected,
                        disabled: busy,
                      }}
                      disabled={busy}
                      onPress={() => {
                        void toggleFolder(
                          folder,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.toggleButton,
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
                              : 9,
                          opacity:
                            busy
                              ? 0.48
                              : pressed
                                ? 0.58
                                : 1,
                        },
                      ]}
                    >
                      {busyFolderId ===
                      folder.id ? (
                        <ActivityIndicator
                          size="small"
                          color={
                            selected
                              ? theme.buttonText
                              : theme.text
                          }
                        />
                      ) : (
                        <Ionicons
                          name={
                            selected
                              ? 'checkmark'
                              : 'add'
                          }
                          size={16}
                          color={
                            selected
                              ? theme.buttonText
                              : theme.text
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.toggleButtonText,
                          {
                            color:
                              selected
                                ? theme.buttonText
                                : theme.text,
                          },
                        ]}
                      >
                        {selected
                          ? '담김'
                          : '담기'}
                      </Text>
                    </Pressable>
                  </View>
                );
              },
            )
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 폴더 전체 관리"
            onPress={() =>
              router.push(
                '/place/saved-cafe-folders' as never,
              )
            }
            style={({ pressed }) => [
              styles.manageAllButton,
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
              name="folder-open-outline"
              size={16}
              color={theme.text}
            />
            <Text
              style={[
                styles.manageAllButtonText,
                {
                  color: theme.text,
                },
              ]}
            >
              모든 폴더 관리
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={
                theme.subText
              }
            />
          </Pressable>
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
        <View
          style={
            styles.modalOverlay
          }
        >
          <Pressable
            style={
              StyleSheet.absoluteFillObject
            }
            onPress={
              closeEditor
            }
          />

          <View
            style={[
              styles.modalCard,
              {
                paddingBottom:
                  insets.bottom + 18,
                backgroundColor:
                  theme.card,
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 3
                    : 17,
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View
                style={
                  styles.modalTitleArea
                }
              >
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  새 카페 폴더
                </Text>
                <Text
                  style={[
                    styles.modalDescription,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  만들면 이 카페가 바로 담겨요.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="새 폴더 창 닫기"
                disabled={
                  creatingFolder
                }
                onPress={
                  closeEditor
                }
                style={({ pressed }) => ({
                  opacity:
                    creatingFolder
                      ? 0.35
                      : pressed
                        ? 0.5
                        : 1,
                })}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={theme.text}
                />
              </Pressable>
            </View>

            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              아이콘
            </Text>

            <View
              style={
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
                      accessibilityLabel={`${emoji} 폴더 아이콘`}
                      accessibilityState={{
                        selected,
                      }}
                      onPress={() =>
                        setFolderEmoji(
                          emoji,
                        )
                      }
                      style={({ pressed }) => [
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
                              : 10,
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
            </View>

            <Text
              style={[
                styles.fieldLabel,
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
              onChangeText={(value) => {
                setFolderName(
                  value.slice(
                    0,
                    MAX_SAVED_CAFE_FOLDER_NAME_LENGTH,
                  ),
                );
                setEditorError('');
              }}
              placeholder="예: 공부할 곳"
              placeholderTextColor={
                theme.mutedText
              }
              maxLength={
                MAX_SAVED_CAFE_FOLDER_NAME_LENGTH
              }
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                void createFolder();
              }}
              selectionColor={
                theme.text
              }
              style={[
                styles.nameInput,
                {
                  color:
                    theme.text,
                  backgroundColor:
                    theme.background,
                  borderColor:
                    editorError
                      ? theme.strongLine
                      : theme.line,
                  borderRadius:
                    isCityBlack
                      ? 2
                      : 10,
                },
              ]}
            />

            <Text
              style={[
                styles.nameCounter,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {folderName.length}/{MAX_SAVED_CAFE_FOLDER_NAME_LENGTH}
            </Text>

            {editorError ? (
              <Text
                style={[
                  styles.editorError,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {editorError}
              </Text>
            ) : null}

            <View
              style={
                styles.modalActionRow
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="새 폴더 만들기 취소"
                disabled={
                  creatingFolder
                }
                onPress={
                  closeEditor
                }
                style={({ pressed }) => [
                  styles.modalCancelButton,
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
                      creatingFolder
                        ? 0.4
                        : pressed
                          ? 0.55
                          : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelText,
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
                accessibilityLabel="새 폴더 만들고 카페 담기"
                disabled={
                  creatingFolder
                }
                onPress={() => {
                  void createFolder();
                }}
                style={({ pressed }) => [
                  styles.modalSaveButton,
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
                      creatingFolder
                        ? 0.68
                        : pressed
                          ? 0.72
                          : 1,
                  },
                ]}
              >
                {creatingFolder ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      theme.buttonText
                    }
                  />
                ) : (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={
                      theme.buttonText
                    }
                  />
                )}
                <Text
                  style={[
                    styles.modalSaveText,
                    {
                      color:
                        theme.buttonText,
                    },
                  ]}
                >
                  {creatingFolder
                    ? '만드는 중'
                    : '만들고 담기'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      zIndex: 2,
    },

    headerButton: {
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

    createHeaderButton: {
      minHeight: 34,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    createHeaderText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    centerArea: {
      flex: 1,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    centerDescription: {
      fontSize: 10,
      fontWeight: '700',
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 12,
      gap: 10,
    },

    cafeCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    cafeIconBox: {
      width: 45,
      height: 45,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cafeTextArea: {
      flex: 1,
      minWidth: 0,
    },

    cafeName: {
      fontSize: 14.5,
      fontWeight: '900',
    },

    cafeAddress: {
      marginTop: 4,
      fontSize: 9.5,
      fontWeight: '700',
    },

    selectedCountText: {
      marginTop: 5,
      fontSize: 8.8,
      fontWeight: '800',
    },

    searchCard: {
      padding: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    searchBox: {
      minHeight: 38,
      paddingHorizontal: 9,
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

    searchSummary: {
      marginTop: 8,
      fontSize: 8.8,
      fontWeight: '800',
    },

    folderCard: {
      minHeight: 76,
      padding: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    folderInfoArea: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    folderEmojiBox: {
      width: 42,
      height: 42,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    folderEmojiText: {
      fontSize: 20,
    },

    folderTextArea: {
      flex: 1,
      minWidth: 0,
    },

    folderName: {
      fontSize: 12.5,
      fontWeight: '900',
    },

    folderCount: {
      marginTop: 4,
      fontSize: 8.8,
      fontWeight: '700',
    },

    toggleButton: {
      minWidth: 68,
      minHeight: 36,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },

    toggleButtonText: {
      fontSize: 9.5,
      fontWeight: '900',
    },

    messageCard: {
      width: '100%',
      padding: 22,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
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
      lineHeight: 16,
      textAlign: 'center',
    },

    messageButton: {
      minHeight: 36,
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

    manageAllButton: {
      minHeight: 42,
      paddingHorizontal: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    manageAllButtonText: {
      flex: 1,
      fontSize: 10,
      fontWeight: '900',
    },

    modalOverlay: {
      flex: 1,
      paddingHorizontal: 18,
      backgroundColor:
        'rgba(0,0,0,0.38)',
      justifyContent: 'center',
    },

    modalCard: {
      maxHeight: '90%',
      paddingHorizontal: 16,
      paddingTop: 16,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    modalTitleArea: {
      flex: 1,
    },

    modalTitle: {
      fontSize: 16,
      fontWeight: '900',
    },

    modalDescription: {
      marginTop: 4,
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    fieldLabel: {
      marginTop: 15,
      marginBottom: 7,
      fontSize: 9,
      fontWeight: '900',
    },

    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    emojiButton: {
      width: 42,
      height: 42,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emojiButtonText: {
      fontSize: 20,
    },

    nameInput: {
      minHeight: 42,
      paddingHorizontal: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      fontSize: 11,
      fontWeight: '800',
    },

    nameCounter: {
      marginTop: 5,
      fontSize: 8.5,
      fontWeight: '700',
      textAlign: 'right',
    },

    editorError: {
      marginTop: 8,
      fontSize: 9,
      fontWeight: '800',
      lineHeight: 14,
    },

    modalActionRow: {
      marginTop: 17,
      flexDirection: 'row',
      gap: 8,
    },

    modalCancelButton: {
      flex: 0.8,
      minHeight: 40,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalCancelText: {
      fontSize: 10,
      fontWeight: '900',
    },

    modalSaveButton: {
      flex: 1.2,
      minHeight: 40,
      paddingHorizontal: 10,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    modalSaveText: {
      fontSize: 10,
      fontWeight: '900',
    },
  });
