import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
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
  loadSavedCafeEntries,
  type SavedCafeLocalEntry,
} from '../../store/savedCafeLocal';
import {
  loadSavedCafeVisitState,
  MAX_SAVED_CAFE_VISIT_NOTE_LENGTH,
  updateSavedCafeVisit,
  type SavedCafeVisit,
  type SavedCafeVisitCompanion,
  type SavedCafeVisitPurpose,
  type SavedCafeVisitRevisitIntent,
} from '../../store/savedCafeVisits';
import {
  useRootTheme,
} from '../../store/rootTheme';

// SAVED_CAFE_V46_VISIT_DETAIL_SCREEN

const PURPOSE_OPTIONS: Array<{
  id: SavedCafeVisitPurpose;
  label: string;
}> = [
  { id: 'study', label: '공부' },
  { id: 'work', label: '업무·노트북' },
  { id: 'date', label: '데이트' },
  { id: 'conversation', label: '대화·모임' },
  { id: 'dessert', label: '커피·디저트' },
  { id: 'rest', label: '휴식' },
  { id: 'other', label: '기타' },
];

const COMPANION_OPTIONS: Array<{
  id: SavedCafeVisitCompanion;
  label: string;
}> = [
  { id: 'alone', label: '혼자' },
  { id: 'friend', label: '친구' },
  { id: 'partner', label: '연인' },
  { id: 'family', label: '가족' },
  { id: 'coworker', label: '동료' },
  { id: 'other', label: '기타' },
];

const REVISIT_OPTIONS: Array<{
  id: SavedCafeVisitRevisitIntent;
  label: string;
}> = [
  { id: 'yes', label: '또 가고 싶어요' },
  { id: 'maybe', label: '생각해 볼래요' },
  { id: 'no', label: '다시 가진 않을래요' },
];

function getSingleParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ''
    : value ?? '';
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatVisitDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '방문 날짜를 확인할 수 없어요.';
  }

  return [
    `${date.getFullYear()}년`,
    `${date.getMonth() + 1}월`,
    `${date.getDate()}일`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}`,
  ].join(' ');
}

function getErrorMessage(error: unknown) {
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
    const message = (
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

export default function SavedCafeVisitDetailScreen() {
  const {
    theme,
    isCityBlack,
  } = useRootTheme();

  const insets = useSafeAreaInsets();
  const params =
    useLocalSearchParams<{
      visitId?: string | string[];
    }>();

  const visitId = getSingleParam(
    params.visitId,
  );

  const [
    visit,
    setVisit,
  ] = useState<SavedCafeVisit | null>(
    null,
  );

  const [
    entry,
    setEntry,
  ] = useState<SavedCafeLocalEntry | null>(
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
    saving,
    setSaving,
  ] = useState(false);

  const [
    rating,
    setRating,
  ] = useState<number | null>(null);

  const [
    note,
    setNote,
  ] = useState('');

  const [
    purpose,
    setPurpose,
  ] = useState<SavedCafeVisitPurpose | null>(
    null,
  );

  const [
    companion,
    setCompanion,
  ] = useState<SavedCafeVisitCompanion | null>(
    null,
  );

  const [
    revisitIntent,
    setRevisitIntent,
  ] = useState<
    SavedCafeVisitRevisitIntent | null
  >(null);

  const [
    reloadVersion,
    setReloadVersion,
  ] = useState(0);

  const applyVisitToEditor =
    useCallback(
      (nextVisit: SavedCafeVisit) => {
        setVisit(nextVisit);
        setRating(nextVisit.rating);
        setNote(nextVisit.note);
        setPurpose(
          nextVisit.purpose ?? null,
        );
        setCompanion(
          nextVisit.companion ?? null,
        );
        setRevisitIntent(
          nextVisit.revisitIntent ?? null,
        );
      },
      [],
    );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!visitId) {
        setVisit(null);
        setEntry(null);
        setLoadError(
          '방문 기록 식별자가 없어요.',
        );
        setLoading(false);
        return () => {
          active = false;
        };
      }

      setLoading(true);
      setLoadError('');

      void Promise.all([
        loadSavedCafeEntries(),
        loadSavedCafeVisitState(),
      ])
        .then(([
          entries,
          visitState,
        ]) => {
          if (!active) {
            return;
          }

          const nextVisit =
            visitState.visits.find(
              (item) =>
                item.id === visitId,
            ) ?? null;

          if (!nextVisit) {
            setVisit(null);
            setEntry(null);
            setLoadError(
              '이 방문 기록을 찾을 수 없어요.',
            );
            return;
          }

          const nextEntry =
            entries.find(
              (item) =>
                item.cafe.placeId ===
                nextVisit.placeId,
            ) ?? null;

          applyVisitToEditor(
            nextVisit,
          );
          setEntry(nextEntry);
        })
        .catch((error) => {
          console.log(
            'SAVED CAFE VISIT DETAIL LOAD ERROR',
            error,
          );

          if (active) {
            setLoadError(
              getErrorMessage(error),
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
      applyVisitToEditor,
      reloadVersion,
      visitId,
    ]),
  );

  const cafeName =
    entry?.cafe.name ??
    '저장 카페 방문';

  const cafeAddress =
    entry?.roadAddress ||
    entry?.address ||
    '';

  const hasChanges =
    useMemo(() => {
      if (!visit) {
        return false;
      }

      return (
        rating !== visit.rating ||
        note.trim() !== visit.note ||
        purpose !==
          (visit.purpose ?? null) ||
        companion !==
          (visit.companion ?? null) ||
        revisitIntent !==
          (visit.revisitIntent ?? null)
      );
    }, [
      companion,
      note,
      purpose,
      rating,
      revisitIntent,
      visit,
    ]);

  const saveDetail =
    useCallback(async () => {
      if (
        !visit ||
        saving
      ) {
        return;
      }

      setSaving(true);

      try {
        const nextState =
          await updateSavedCafeVisit(
            visit.id,
            {
              rating,
              note,
              purpose,
              companion,
              revisitIntent,
            },
          );

        const nextVisit =
          nextState.visits.find(
            (item) =>
              item.id === visit.id,
          );

        if (!nextVisit) {
          throw new Error(
            '저장한 방문 기록을 다시 찾을 수 없어요.',
          );
        }

        applyVisitToEditor(
          nextVisit,
        );

        Alert.alert(
          '저장 완료',
          '이번 카페 방문 상세 기록을 저장했어요.',
        );
      } catch (error) {
        Alert.alert(
          '저장 실패',
          getErrorMessage(error),
        );
      } finally {
        setSaving(false);
      }
    }, [
      applyVisitToEditor,
      companion,
      note,
      purpose,
      rating,
      revisitIntent,
      saving,
      visit,
    ]);

  const openCafeTimeline =
    useCallback(() => {
      if (!visit) {
        return;
      }

      router.push({
        pathname:
          '/place/saved-cafe-visits',
        params: {
          placeId:
            visit.placeId,
        },
      } as never);
    }, [visit]);

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
          accessibilityLabel="뒤로 가기"
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
          style={styles.headerTextArea}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            방문 상세
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
            한 번의 카페 방문을 더 자세히 기록해요.
          </Text>
        </View>

        {visit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카페 방문 타임라인 보기"
            onPress={
              openCafeTimeline
            }
            style={({ pressed }) => [
              styles.headerTextButton,
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
                styles.headerTextButtonLabel,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              타임라인
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View
          style={styles.centerState}
        >
          <ActivityIndicator
            color={theme.text}
          />
          <Text
            style={[
              styles.stateText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            방문 상세 기록을 불러오고 있어요.
          </Text>
        </View>
      ) : loadError || !visit ? (
        <View
          style={styles.centerState}
        >
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={theme.subText}
          />
          <Text
            style={[
              styles.stateTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            방문 기록을 열지 못했어요
          </Text>
          <Text
            style={[
              styles.stateText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {loadError ||
              '방문 기록이 없어요.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다시 시도"
            onPress={() =>
              setReloadVersion(
                (value) =>
                  value + 1,
              )
            }
            style={({ pressed }) => [
              styles.retryButton,
              {
                borderColor:
                  theme.line,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
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
                styles.retryButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
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
            <View
              style={styles.summaryIcon}
            >
              <Ionicons
                name="cafe-outline"
                size={21}
                color={theme.text}
              />
            </View>

            <View
              style={styles.summaryTextArea}
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
                {cafeName}
              </Text>

              {cafeAddress ? (
                <Text
                  numberOfLines={2}
                  style={[
                    styles.cafeAddress,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {cafeAddress}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.visitDate,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {formatVisitDate(
                  visit.visitedAt,
                )}
              </Text>
            </View>
          </View>

          <EditorSection
            title="만족도"
            description="이번 방문은 몇 점이었나요?"
            theme={theme}
          >
            <View
              style={styles.ratingRow}
            >
              {[
                1,
                2,
                3,
                4,
                5,
              ].map((value) => {
                const selected =
                  rating !== null &&
                  value <= rating;

                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${value}점`}
                    onPress={() =>
                      setRating(
                        rating === value
                          ? null
                          : value,
                      )
                    }
                    style={({ pressed }) => [
                      styles.ratingButton,
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
                            ? 0.6
                            : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        selected
                          ? 'star'
                          : 'star-outline'
                      }
                      size={18}
                      color={
                        selected
                          ? theme.buttonText
                          : theme.text
                      }
                    />
                  </Pressable>
                );
              })}
            </View>
          </EditorSection>

          <EditorSection
            title="방문 목적"
            description="이 카페에 온 가장 큰 이유를 골라 주세요."
            theme={theme}
          >
            <OptionWrap>
              {PURPOSE_OPTIONS.map(
                (option) => (
                  <ChoiceChip
                    key={option.id}
                    label={option.label}
                    selected={
                      purpose ===
                      option.id
                    }
                    onPress={() =>
                      setPurpose(
                        purpose ===
                          option.id
                          ? null
                          : option.id,
                      )
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                ),
              )}
            </OptionWrap>
          </EditorSection>

          <EditorSection
            title="누구와 함께"
            description="동행을 선택하면 나중에 방문 패턴을 떠올리기 쉬워요."
            theme={theme}
          >
            <OptionWrap>
              {COMPANION_OPTIONS.map(
                (option) => (
                  <ChoiceChip
                    key={option.id}
                    label={option.label}
                    selected={
                      companion ===
                      option.id
                    }
                    onPress={() =>
                      setCompanion(
                        companion ===
                          option.id
                          ? null
                          : option.id,
                      )
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                ),
              )}
            </OptionWrap>
          </EditorSection>

          <EditorSection
            title="재방문 의향"
            description="다음에 다시 찾고 싶은 곳인지 남겨 보세요."
            theme={theme}
          >
            <OptionWrap>
              {REVISIT_OPTIONS.map(
                (option) => (
                  <ChoiceChip
                    key={option.id}
                    label={option.label}
                    selected={
                      revisitIntent ===
                      option.id
                    }
                    onPress={() =>
                      setRevisitIntent(
                        revisitIntent ===
                          option.id
                          ? null
                          : option.id,
                      )
                    }
                    theme={theme}
                    isCityBlack={
                      isCityBlack
                    }
                  />
                ),
              )}
            </OptionWrap>
          </EditorSection>

          <EditorSection
            title="한 줄 기록"
            description="좋았던 메뉴, 자리, 분위기처럼 다음 방문에 기억하고 싶은 내용을 남겨요."
            theme={theme}
          >
            <View
              style={[
                styles.noteBox,
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
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={
                  MAX_SAVED_CAFE_VISIT_NOTE_LENGTH
                }
                multiline
                textAlignVertical="top"
                placeholder="예: 창가 자리가 조용했고 크림라테가 좋았어요."
                placeholderTextColor={
                  theme.subText
                }
                selectionColor={
                  theme.text
                }
                style={[
                  styles.noteInput,
                  {
                    color:
                      theme.text,
                  },
                ]}
              />
              <Text
                style={[
                  styles.noteCount,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {note.length}/
                {MAX_SAVED_CAFE_VISIT_NOTE_LENGTH}
              </Text>
            </View>
          </EditorSection>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="방문 상세 기록 저장"
            disabled={
              saving ||
              !hasChanges
            }
            onPress={() => {
              void saveDetail();
            }}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor:
                  theme.button,
                borderColor:
                  theme.strongLine,
                borderRadius:
                  isCityBlack
                    ? 2
                    : 11,
                opacity:
                  saving ||
                  !hasChanges
                    ? 0.42
                    : pressed
                      ? 0.7
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
                name="save-outline"
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
              {hasChanges
                ? '변경 내용 저장'
                : '저장된 상태예요'}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

type EditorSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
};

function EditorSection({
  title,
  description,
  children,
  theme,
}: EditorSectionProps) {
  return (
    <View
      style={styles.section}
    >
      <Text
        style={[
          styles.sectionTitle,
          {
            color:
              theme.text,
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
        style={styles.sectionBody}
      >
        {children}
      </View>
    </View>
  );
}

function OptionWrap({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <View
      style={styles.optionWrap}
    >
      {children}
    </View>
  );
}

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<
    typeof useRootTheme
  >['theme'];
  isCityBlack: boolean;
};

function ChoiceChip({
  label,
  selected,
  onPress,
  theme,
  isCityBlack,
}: ChoiceChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
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
              : 999,
          opacity:
            pressed
              ? 0.6
              : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.choiceChipText,
          {
            color:
              selected
                ? theme.buttonText
                : theme.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
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

    headerTextArea: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 18.5,
      fontWeight: '900',
      letterSpacing: -0.4,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 9.5,
      fontWeight: '700',
    },

    headerTextButton: {
      minHeight: 34,
      paddingHorizontal: 9,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerTextButtonLabel: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    centerState: {
      flex: 1,
      paddingHorizontal: 28,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    stateTitle: {
      marginTop: 3,
      fontSize: 15,
      fontWeight: '900',
      textAlign: 'center',
    },

    stateText: {
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 17,
      textAlign: 'center',
    },

    retryButton: {
      minHeight: 34,
      marginTop: 5,
      paddingHorizontal: 12,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },

    retryButtonText: {
      fontSize: 11,
      fontWeight: '900',
    },

    content: {
      paddingHorizontal: 14,
      paddingTop: 14,
      gap: 16,
    },

    summaryCard: {
      padding: 13,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },

    summaryIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryTextArea: {
      flex: 1,
      minWidth: 0,
    },

    cafeName: {
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.2,
    },

    cafeAddress: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 15,
    },

    visitDate: {
      marginTop: 7,
      fontSize: 10,
      fontWeight: '800',
    },

    section: {
      gap: 4,
    },

    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
    },

    sectionDescription: {
      fontSize: 9.5,
      fontWeight: '700',
      lineHeight: 14,
    },

    sectionBody: {
      marginTop: 5,
    },

    ratingRow: {
      flexDirection: 'row',
      gap: 7,
    },

    ratingButton: {
      width: 40,
      height: 36,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    optionWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },

    choiceChip: {
      minHeight: 32,
      paddingHorizontal: 11,
      borderWidth:
        StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
    },

    choiceChipText: {
      fontSize: 10.5,
      fontWeight: '900',
    },

    noteBox: {
      minHeight: 104,
      paddingHorizontal: 11,
      paddingTop: 9,
      paddingBottom: 7,
      borderWidth:
        StyleSheet.hairlineWidth,
    },

    noteInput: {
      minHeight: 70,
      padding: 0,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },

    noteCount: {
      marginTop: 4,
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'right',
    },

    saveButton: {
      minHeight: 43,
      borderWidth:
        StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    saveButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },
  });