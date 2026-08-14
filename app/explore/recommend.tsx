// ROOT_EXPLORE_DISCOVERY_V1_RECOMMEND

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRootTheme } from '../../store/rootTheme';

const WHEN_OPTIONS = [
  { id: 'today', label: '오늘', icon: '☀️' },
  { id: 'weekend', label: '이번 주말', icon: '🗓️' },
  { id: 'tonight', label: '오늘 저녁', icon: '🌙' },
  { id: 'later', label: '날짜는 아직', icon: '✨' },
] as const;

const COMPANION_OPTIONS = [
  { id: 'alone', label: '혼자', icon: '🎧' },
  { id: 'date', label: '연인과', icon: '💛' },
  { id: 'friend', label: '친구와', icon: '🙌' },
  { id: 'family', label: '가족과', icon: '👨‍👩‍👧' },
  { id: 'pet', label: '반려동물과', icon: '🐾' },
] as const;

const MOOD_OPTIONS = [
  { id: 'quiet', label: '조용한', icon: '🤫' },
  { id: 'nature', label: '자연 속', icon: '🌿' },
  { id: 'active', label: '활동적인', icon: '🏃' },
  { id: 'culture', label: '문화·전시', icon: '🎨' },
  { id: 'food', label: '맛있는', icon: '🍽️' },
  { id: 'photo', label: '사진 좋은', icon: '📷' },
  { id: 'rest', label: '쉬기 좋은', icon: '🛋️' },
  { id: 'cafe', label: '카페 중심', icon: '☕' },
] as const;

type WhenId =
  (typeof WHEN_OPTIONS)[number]['id'];

type CompanionId =
  (typeof COMPANION_OPTIONS)[number]['id'];

type MoodId =
  (typeof MOOD_OPTIONS)[number]['id'];

export default function ExploreRecommendScreen() {
  const { theme, isCityBlack } = useRootTheme();
  const insets = useSafeAreaInsets();

  const [when, setWhen] =
    useState<WhenId | null>(null);
  const [companion, setCompanion] =
    useState<CompanionId | null>(null);
  const [moods, setMoods] =
    useState<MoodId[]>([]);

  const ready =
    Boolean(when) &&
    Boolean(companion) &&
    moods.length > 0;

  const selectedSummary = useMemo(() => {
    const whenLabel = WHEN_OPTIONS.find(
      (item) => item.id === when
    )?.label;
    const companionLabel = COMPANION_OPTIONS.find(
      (item) => item.id === companion
    )?.label;
    const moodLabels = moods
      .map(
        (mood) =>
          MOOD_OPTIONS.find(
            (item) => item.id === mood
          )?.label
      )
      .filter(Boolean);

    return [
      whenLabel,
      companionLabel,
      ...moodLabels,
    ]
      .filter(Boolean)
      .join(' · ');
  }, [companion, moods, when]);

  const toggleMood = (mood: MoodId) => {
    setMoods((current) => {
      if (current.includes(mood)) {
        return current.filter(
          (item) => item !== mood
        );
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, mood];
    });
  };

  const openResults = () => {
    if (!ready || !when || !companion) {
      return;
    }

    router.replace({
      pathname: '/explore/search-results',
      params: {
        source: 'recommend',
        when,
        companion,
        moods: moods.join(','),
      },
    } as any);
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            {
              borderColor: theme.line,
              borderRadius: isCityBlack ? 2 : 10,
              opacity: pressed ? 0.55 : 1,
            },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={theme.text}
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.text },
            ]}
          >
            ROOT 추천받기
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: theme.subText },
            ]}
          >
            세 가지만 알려주세요
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 118,
          },
        ]}
      >
        <View style={styles.intro}>
          <Text
            style={[
              styles.introTitle,
              { color: theme.text },
            ]}
          >
            지금 내게 맞는 탐험은?
          </Text>
          <Text
            style={[
              styles.introDescription,
              { color: theme.subText },
            ]}
          >
            선택한 조건을 함께 반영해 장소와 행사를 추천해요.
          </Text>
        </View>

        <QuestionSection
          step="1"
          title="언제 떠날까요?"
          description="가장 가까운 계획을 골라주세요."
          theme={theme}
          isCityBlack={isCityBlack}
        >
          <View style={styles.optionGrid}>
            {WHEN_OPTIONS.map((item) => (
              <ChoiceButton
                key={item.id}
                icon={item.icon}
                label={item.label}
                selected={when === item.id}
                onPress={() => setWhen(item.id)}
                theme={theme}
                isCityBlack={isCityBlack}
              />
            ))}
          </View>
        </QuestionSection>

        <QuestionSection
          step="2"
          title="누구와 함께하나요?"
          description="동행에 따라 편한 장소가 달라져요."
          theme={theme}
          isCityBlack={isCityBlack}
        >
          <View style={styles.optionGrid}>
            {COMPANION_OPTIONS.map((item) => (
              <ChoiceButton
                key={item.id}
                icon={item.icon}
                label={item.label}
                selected={companion === item.id}
                onPress={() => setCompanion(item.id)}
                theme={theme}
                isCityBlack={isCityBlack}
              />
            ))}
          </View>
        </QuestionSection>

        <QuestionSection
          step="3"
          title="어떤 분위기를 원하나요?"
          description={`최대 3개 · ${moods.length}/3 선택`}
          theme={theme}
          isCityBlack={isCityBlack}
        >
          <View style={styles.optionGrid}>
            {MOOD_OPTIONS.map((item) => (
              <ChoiceButton
                key={item.id}
                icon={item.icon}
                label={item.label}
                selected={moods.includes(item.id)}
                disabled={
                  moods.length >= 3 &&
                  !moods.includes(item.id)
                }
                onPress={() => toggleMood(item.id)}
                theme={theme}
                isCityBlack={isCityBlack}
              />
            ))}
          </View>
        </QuestionSection>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.background,
            borderColor: theme.line,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.summary,
            { color: theme.subText },
          ]}
        >
          {selectedSummary || '세 가지 질문에 답해 주세요.'}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="추천 결과 보기"
          disabled={!ready}
          onPress={openResults}
          style={({ pressed }) => [
            styles.resultButton,
            {
              backgroundColor: theme.button,
              borderRadius: isCityBlack ? 2 : 12,
              opacity: !ready ? 0.38 : pressed ? 0.72 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.resultButtonText,
              { color: theme.buttonText },
            ]}
          >
            추천 결과 보기
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={theme.buttonText}
          />
        </Pressable>
      </View>
    </View>
  );
}

type QuestionSectionProps = {
  step: string;
  title: string;
  description: string;
  theme: any;
  isCityBlack: boolean;
  children: ReactNode;
};

function QuestionSection({
  step,
  title,
  description,
  theme,
  isCityBlack,
  children,
}: QuestionSectionProps) {
  return (
    <View
      style={[
        styles.questionCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderRadius: isCityBlack ? 3 : 18,
        },
      ]}
    >
      <View style={styles.questionHeader}>
        <View
          style={[
            styles.stepBadge,
            {
              backgroundColor: theme.button,
              borderRadius: isCityBlack ? 2 : 999,
            },
          ]}
        >
          <Text
            style={[
              styles.stepText,
              { color: theme.buttonText },
            ]}
          >
            {step}
          </Text>
        </View>

        <View style={styles.questionText}>
          <Text
            style={[
              styles.questionTitle,
              { color: theme.text },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.questionDescription,
              { color: theme.subText },
            ]}
          >
            {description}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}

type ChoiceButtonProps = {
  icon: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  theme: any;
  isCityBlack: boolean;
};

function ChoiceButton({
  icon,
  label,
  selected,
  disabled = false,
  onPress,
  theme,
  isCityBlack,
}: ChoiceButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceButton,
        {
          backgroundColor: selected
            ? theme.button
            : theme.background,
          borderColor: selected
            ? theme.strongLine
            : theme.line,
          borderRadius: isCityBlack ? 2 : 12,
          opacity: disabled ? 0.32 : pressed ? 0.62 : 1,
        },
      ]}
    >
      <Text style={styles.choiceIcon}>{icon}</Text>
      <Text
        style={[
          styles.choiceLabel,
          {
            color: selected
              ? theme.buttonText
              : theme.text,
          },
        ]}
      >
        {label}
      </Text>
      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={17}
          color={theme.buttonText}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 66,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 9.5,
    fontWeight: '700',
  },
  headerSpacer: { width: 38 },
  content: {
    paddingHorizontal: 15,
    gap: 12,
  },
  intro: {
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 4,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  introDescription: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  questionCard: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  stepBadge: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '900',
  },
  questionText: { flex: 1 },
  questionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  questionDescription: {
    marginTop: 3,
    fontSize: 9.5,
    fontWeight: '700',
  },
  optionGrid: {
    marginTop: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  choiceButton: {
    width: '48.7%',
    minHeight: 48,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  choiceIcon: { fontSize: 17 },
  choiceLabel: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '900',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summary: {
    marginBottom: 7,
    fontSize: 9.5,
    fontWeight: '700',
  },
  resultButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resultButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
