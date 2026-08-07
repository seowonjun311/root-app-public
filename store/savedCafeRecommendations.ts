import {
  CAFE_KEYWORD_MAP,
  CAFE_THEME_MAP,
} from './cafeKeywordCatalog';
import type {
  SavedCafeLocalEntry,
} from './savedCafeLocal';
import type {
  SavedCafeRecommendationFeedbackState,
  SavedCafeRecommendationReaction,
} from './savedCafeRecommendationFeedback';
import type {
  SavedCafeVisit,
  SavedCafeVisitCompanion,
  SavedCafeVisitPurpose,
  SavedCafeVisitState,
} from './savedCafeVisits';
import {
  PLACE_PRIMARY_THEME_MAP,
} from './placeThemeCatalog';

// SAVED_CAFE_V48_PERSONALIZED_RECOMMENDATION_ENGINE
// SAVED_CAFE_V49_RECOMMENDATION_LEARNING_ENGINE

export type SavedCafeRecommendationMode =
  | 'all'
  | 'new'
  | 'study'
  | 'date'
  | 'solo'
  | 'revisit';

export type SavedCafeRecommendationConfidence =
  | 'starter'
  | 'growing'
  | 'strong';

export type SavedCafeRecommendation = {
  entry: SavedCafeLocalEntry;
  score: number;
  reasons: string[];
  visitCount: number;
  averageRating: number | null;
  lastVisitedAt: string | null;
  revisitYesCount: number;
  feedbackReaction:
    | SavedCafeRecommendationReaction
    | null;
  feedbackEffect: number;
};

export type SavedCafeRecommendationProfile = {
  visitCount: number;
  detailedVisitCount: number;
  positiveVisitCount: number;
  feedbackCount: number;
  dominantPurpose: SavedCafeVisitPurpose | null;
  dominantCompanion: SavedCafeVisitCompanion | null;
  confidence: SavedCafeRecommendationConfidence;
  confidenceLabel: string;
  headline: string;
  description: string;
};

export type SavedCafeRecommendationResult = {
  profile: SavedCafeRecommendationProfile;
  recommendations: SavedCafeRecommendation[];
};

type RecommendationSignal = {
  primaryThemes?: readonly string[];
  themes?: readonly string[];
  tags?: readonly string[];
};

type VisitSummary = {
  count: number;
  ratingTotal: number;
  ratingCount: number;
  lastVisitedAt: string | null;
  revisitYesCount: number;
  revisitNoCount: number;
};

const PURPOSE_LABELS:
  Record<SavedCafeVisitPurpose, string> = {
    study: '공부',
    work: '업무·노트북',
    date: '데이트',
    conversation: '대화·모임',
    dessert: '커피·디저트',
    rest: '휴식',
    other: '기타',
  };

const COMPANION_LABELS:
  Record<SavedCafeVisitCompanion, string> = {
    alone: '혼자',
    friend: '친구',
    partner: '연인',
    family: '가족',
    coworker: '동료',
    other: '기타',
  };

const PURPOSE_SIGNALS:
  Record<SavedCafeVisitPurpose, RecommendationSignal> = {
    study: {
      primaryThemes: [
        'study',
        'rest',
      ],
      themes: [
        'studyCafe',
        'laptopFriendlyCafe',
        'quietCafe',
      ],
      tags: [
        'studyFriendly',
        'laptopWorkFriendly',
        'readingFriendly',
        'quiet',
        'manyPowerOutlets',
        'goodWifi',
        'longStayAllowed',
        'laptopComfortable',
        'wideTable',
        'singleSeat',
      ],
    },
    work: {
      primaryThemes: [
        'study',
      ],
      themes: [
        'laptopFriendlyCafe',
        'studyCafe',
        'quietCafe',
      ],
      tags: [
        'laptopWorkFriendly',
        'goodWifi',
        'manyPowerOutlets',
        'wideTable',
        'longStayAllowed',
        'laptopComfortable',
        'noPressureLongStay',
      ],
    },
    date: {
      primaryThemes: [
        'date',
        'photo',
        'foodCafe',
      ],
      themes: [
        'dateCafe',
        'moodCafe',
        'viewCafe',
        'brunchCafe',
      ],
      tags: [
        'dateFriendly',
        'photoFriendly',
        'emotionalMood',
        'goodDaylight',
        'cozy',
        'photoSpot',
        'nightView',
        'sunsetView',
        'signatureMenu',
      ],
    },
    conversation: {
      primaryThemes: [
        'foodCafe',
        'date',
      ],
      themes: [
        'largeCafe',
        'brunchCafe',
        'moodCafe',
      ],
      tags: [
        'conversationFriendly',
        'groupFriendly',
        'groupSeat',
        'manySeats',
        'wideSeatSpacing',
        'groupUseAvailable',
      ],
    },
    dessert: {
      primaryThemes: [
        'foodCafe',
      ],
      themes: [
        'bakeryCafe',
        'brunchCafe',
        'moodCafe',
      ],
      tags: [
        'manyBreadOptions',
        'bakeryCafe',
        'variedDesserts',
        'goodCake',
        'goodCoffee',
        'brunchMenu',
        'signatureMenu',
      ],
    },
    rest: {
      primaryThemes: [
        'rest',
        'nature',
        'photo',
      ],
      themes: [
        'quietCafe',
        'viewCafe',
        'moodCafe',
      ],
      tags: [
        'restFriendly',
        'quiet',
        'quietMusic',
        'cozy',
        'goodDaylight',
        'wideSeatSpacing',
        'garden',
      ],
    },
    other: {},
  };

const COMPANION_SIGNALS:
  Record<SavedCafeVisitCompanion, RecommendationSignal> = {
    alone: {
      primaryThemes: [
        'study',
        'rest',
      ],
      themes: [
        'quietCafe',
        'studyCafe',
        'laptopFriendlyCafe',
      ],
      tags: [
        'soloFriendly',
        'singleSeat',
        'quiet',
        'readingFriendly',
        'laptopComfortable',
        'noPressureLongStay',
      ],
    },
    friend: {
      primaryThemes: [
        'foodCafe',
        'date',
      ],
      themes: [
        'largeCafe',
        'moodCafe',
        'brunchCafe',
      ],
      tags: [
        'conversationFriendly',
        'groupFriendly',
        'groupSeat',
        'manySeats',
        'variedDesserts',
      ],
    },
    partner: {
      primaryThemes: [
        'date',
        'photo',
      ],
      themes: [
        'dateCafe',
        'moodCafe',
        'viewCafe',
      ],
      tags: [
        'dateFriendly',
        'emotionalMood',
        'photoFriendly',
        'goodDaylight',
        'nightView',
        'sunsetView',
      ],
    },
    family: {
      primaryThemes: [
        'family',
        'foodCafe',
      ],
      themes: [
        'largeCafe',
        'bakeryCafe',
        'brunchCafe',
      ],
      tags: [
        'childFriendly',
        'groupSeat',
        'largeSpace',
        'manySeats',
        'parkingAvailable',
        'groupUseAvailable',
      ],
    },
    coworker: {
      primaryThemes: [
        'study',
        'foodCafe',
      ],
      themes: [
        'laptopFriendlyCafe',
        'largeCafe',
      ],
      tags: [
        'laptopWorkFriendly',
        'groupFriendly',
        'wideTable',
        'goodWifi',
        'manyPowerOutlets',
        'groupSeat',
      ],
    },
    other: {},
  };

const MODE_SIGNALS:
  Partial<
    Record<
      SavedCafeRecommendationMode,
      RecommendationSignal
    >
  > = {
    study: PURPOSE_SIGNALS.study,
    date: PURPOSE_SIGNALS.date,
    solo: COMPANION_SIGNALS.alone,
  };

function parseTime(
  value: string | null | undefined,
) {
  if (!value) {
    return 0;
  }

  const time =
    new Date(value).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.max(
    min,
    Math.min(
      max,
      value,
    ),
  );
}

function addWeight(
  map: Map<string, number>,
  key: string,
  amount: number,
) {
  if (!key || amount === 0) {
    return;
  }

  map.set(
    key,
    (map.get(key) ?? 0) +
      amount,
  );
}

function addSignalWeights(
  signal: RecommendationSignal,
  factor: number,
  primaryWeights: Map<string, number>,
  themeWeights: Map<string, number>,
  tagWeights: Map<string, number>,
) {
  signal.primaryThemes?.forEach(
    (id) =>
      addWeight(
        primaryWeights,
        id,
        factor * 1.8,
      ),
  );

  signal.themes?.forEach(
    (id) =>
      addWeight(
        themeWeights,
        id,
        factor * 1.6,
      ),
  );

  signal.tags?.forEach(
    (id) =>
      addWeight(
        tagWeights,
        id,
        factor,
      ),
  );
}

function getVisitPreferenceFactor(
  visit: SavedCafeVisit,
) {
  let factor = 1;

  if (
    typeof visit.rating === 'number'
  ) {
    if (visit.rating >= 5) {
      factor += 1;
    } else if (
      visit.rating >= 4
    ) {
      factor += 0.7;
    } else if (
      visit.rating === 3
    ) {
      factor += 0.2;
    } else {
      factor -= 0.35;
    }
  }

  if (
    visit.revisitIntent === 'yes'
  ) {
    factor += 0.9;
  } else if (
    visit.revisitIntent === 'maybe'
  ) {
    factor += 0.1;
  } else if (
    visit.revisitIntent === 'no'
  ) {
    factor -= 0.7;
  }

  return Math.max(
    0.2,
    factor,
  );
}

function buildVisitSummaryMap(
  visits: SavedCafeVisit[],
) {
  const map =
    new Map<
      string,
      VisitSummary
    >();

  visits.forEach((visit) => {
    const current =
      map.get(
        visit.placeId,
      ) ?? {
        count: 0,
        ratingTotal: 0,
        ratingCount: 0,
        lastVisitedAt: null,
        revisitYesCount: 0,
        revisitNoCount: 0,
      };

    current.count += 1;

    if (
      typeof visit.rating ===
      'number'
    ) {
      current.ratingTotal +=
        visit.rating;
      current.ratingCount += 1;
    }

    if (
      !current.lastVisitedAt ||
      parseTime(
        visit.visitedAt,
      ) >
        parseTime(
          current.lastVisitedAt,
        )
    ) {
      current.lastVisitedAt =
        visit.visitedAt;
    }

    if (
      visit.revisitIntent ===
      'yes'
    ) {
      current.revisitYesCount +=
        1;
    } else if (
      visit.revisitIntent ===
      'no'
    ) {
      current.revisitNoCount +=
        1;
    }

    map.set(
      visit.placeId,
      current,
    );
  });

  return map;
}

function getDominantValue<
  T extends string,
>(
  values: Array<T | null>,
): T | null {
  const counts =
    new Map<T, number>();

  values.forEach((value) => {
    if (!value) {
      return;
    }

    counts.set(
      value,
      (counts.get(value) ?? 0) +
        1,
    );
  });

  return (
    Array.from(
      counts.entries(),
    ).sort(
      (
        first,
        second,
      ) =>
        second[1] -
        first[1],
    )[0]?.[0] ?? null
  );
}

function matchesSignal(
  entry: SavedCafeLocalEntry,
  signal:
    | RecommendationSignal
    | undefined,
) {
  if (!signal) {
    return false;
  }

  return Boolean(
    signal.primaryThemes?.includes(
      entry.cafe.primaryTheme,
    ) ||
      entry.cafe.themes.some(
        (theme) =>
          signal.themes?.includes(
            theme,
          ),
      ) ||
      entry.cafe.tags.some(
        (tag) =>
          signal.tags?.includes(
            tag,
          ),
      ),
  );
}

function getSignalBoost(
  entry: SavedCafeLocalEntry,
  signal:
    | RecommendationSignal
    | undefined,
) {
  if (!signal) {
    return 0;
  }

  let score = 0;

  if (
    signal.primaryThemes?.includes(
      entry.cafe.primaryTheme,
    )
  ) {
    score += 12;
  }

  entry.cafe.themes.forEach(
    (theme) => {
      if (
        signal.themes?.includes(
          theme,
        )
      ) {
        score += 7;
      }
    },
  );

  entry.cafe.representativeTags.forEach(
    (tag) => {
      if (
        signal.tags?.includes(
          tag,
        )
      ) {
        score += 5;
      }
    },
  );

  entry.cafe.tags.forEach(
    (tag) => {
      if (
        signal.tags?.includes(
          tag,
        )
      ) {
        score += 2;
      }
    },
  );

  return Math.min(
    30,
    score,
  );
}

function getReasonLabelForTheme(
  id: string,
) {
  return (
    CAFE_THEME_MAP[id]?.label ??
    id
  );
}

function getReasonLabelForTag(
  id: string,
) {
  return (
    CAFE_KEYWORD_MAP[id]?.label ??
    id
  );
}

function getReasonLabelForPrimaryTheme(
  id: string,
) {
  return (
    PLACE_PRIMARY_THEME_MAP[id]
      ?.label ??
    id
  );
}

function getTopWeightedMatch(
  ids: readonly string[],
  weights: Map<string, number>,
) {
  return ids
    .map((id) => ({
      id,
      weight:
        weights.get(id) ?? 0,
    }))
    .filter(
      (item) =>
        item.weight > 0,
    )
    .sort(
      (
        first,
        second,
      ) =>
        second.weight -
        first.weight,
    )[0] ?? null;
}

function getModeReason(
  mode: SavedCafeRecommendationMode,
) {
  switch (mode) {
    case 'new':
      return '아직 가보지 않은 저장 카페예요';
    case 'study':
      return '공부·작업 조건을 우선 반영했어요';
    case 'date':
      return '데이트 취향을 우선 반영했어요';
    case 'solo':
      return '혼자 가기 좋은 조건을 우선 반영했어요';
    case 'revisit':
      return '다시 가고 싶다고 기록한 카페예요';
    default:
      return null;
  }
}

function buildProfile(
  visits: SavedCafeVisit[],
  feedbackCount: number,
): SavedCafeRecommendationProfile {
  const detailedVisitCount =
    visits.filter(
      (visit) =>
        Boolean(
          visit.purpose ||
            visit.companion ||
            visit.revisitIntent,
        ),
    ).length;

  const positiveVisitCount =
    visits.filter(
      (visit) =>
        visit.revisitIntent ===
          'yes' ||
        (
          typeof visit.rating ===
            'number' &&
          visit.rating >= 4
        ),
    ).length;

  const dominantPurpose =
    getDominantValue(
      visits.map(
        (visit) =>
          visit.purpose,
      ),
    );

  const dominantCompanion =
    getDominantValue(
      visits.map(
        (visit) =>
          visit.companion,
      ),
    );

  const learningSignalCount =
    detailedVisitCount +
    feedbackCount;

  const confidence:
    SavedCafeRecommendationConfidence =
      learningSignalCount >= 15
        ? 'strong'
        : learningSignalCount >= 6
          ? 'growing'
          : 'starter';

  const confidenceLabel =
    confidence === 'strong'
      ? '높음'
      : confidence === 'growing'
        ? '성장 중'
        : '시작 단계';

  const headline =
    dominantPurpose
      ? `${PURPOSE_LABELS[dominantPurpose]} 취향을 중심으로 추천해요`
      : visits.length > 0
        ? '방문한 카페의 특성을 바탕으로 추천해요'
        : '저장한 카페 정보로 첫 추천을 만들었어요';

  const descriptionParts = [
    `방문 ${visits.length}회`,
    `상세 기록 ${detailedVisitCount}회`,
    `추천 피드백 ${feedbackCount}개`,
  ];

  if (dominantCompanion) {
    descriptionParts.push(
      `${COMPANION_LABELS[dominantCompanion]} 방문이 가장 많음`,
    );
  }

  return {
    visitCount:
      visits.length,
    detailedVisitCount,
    positiveVisitCount,
    feedbackCount,
    dominantPurpose,
    dominantCompanion,
    confidence,
    confidenceLabel,
    headline,
    description:
      descriptionParts.join(
        ' · ',
      ),
  };
}

export function buildSavedCafeRecommendations(
  entries: SavedCafeLocalEntry[],
  visitState:
    | SavedCafeVisitState
    | null,
  mode:
    SavedCafeRecommendationMode =
      'all',
  feedbackState:
    | SavedCafeRecommendationFeedbackState
    | null = null,
): SavedCafeRecommendationResult {
  const entryMap =
    new Map(
      entries.map(
        (entry) => [
          entry.cafe.placeId,
          entry,
        ],
      ),
    );

  const visits =
    (visitState?.visits ?? [])
      .filter((visit) =>
        entryMap.has(
          visit.placeId,
        ),
      );

  const feedbackMap =
    new Map(
      (
        feedbackState?.feedbacks ??
        []
      ).map(
        (feedback) => [
          feedback.placeId,
          feedback,
        ],
      ),
    );

  const activeFeedbacks =
    (
      feedbackState?.feedbacks ??
      []
    ).filter(
      (feedback) =>
        Boolean(
          feedback.reaction &&
            entryMap.has(
              feedback.placeId,
            ),
        ),
    );

  const profile =
    buildProfile(
      visits,
      activeFeedbacks.length,
    );

  const primaryWeights =
    new Map<string, number>();

  const themeWeights =
    new Map<string, number>();

  const tagWeights =
    new Map<string, number>();

  visits.forEach((visit) => {
    const entry =
      entryMap.get(
        visit.placeId,
      );

    if (!entry) {
      return;
    }

    const factor =
      getVisitPreferenceFactor(
        visit,
      );

    addWeight(
      primaryWeights,
      entry.cafe.primaryTheme,
      factor * 2,
    );

    entry.cafe.themes.forEach(
      (theme) =>
        addWeight(
          themeWeights,
          theme,
          factor * 1.4,
        ),
    );

    entry.cafe.tags.forEach(
      (tag) =>
        addWeight(
          tagWeights,
          tag,
          factor * 0.65,
        ),
    );

    entry.cafe.representativeTags.forEach(
      (tag) =>
        addWeight(
          tagWeights,
          tag,
          factor * 1.25,
        ),
    );

    if (visit.purpose) {
      addSignalWeights(
        PURPOSE_SIGNALS[
          visit.purpose
        ],
        factor * 0.7,
        primaryWeights,
        themeWeights,
        tagWeights,
      );
    }

    if (visit.companion) {
      addSignalWeights(
        COMPANION_SIGNALS[
          visit.companion
        ],
        factor * 0.45,
        primaryWeights,
        themeWeights,
        tagWeights,
      );
    }
  });

  // SAVED_CAFE_V49_RECOMMENDATION_FEEDBACK_LEARNING
  activeFeedbacks.forEach(
    (feedback) => {
      const entry =
        entryMap.get(
          feedback.placeId,
        );

      if (
        !entry ||
        !feedback.reaction
      ) {
        return;
      }

      const factor =
        feedback.reaction ===
        'interested'
          ? 1.25
          : feedback.reaction ===
              'wantToGo'
            ? 0.8
            : -1.15;

      addWeight(
        primaryWeights,
        entry.cafe.primaryTheme,
        factor * 2.5,
      );

      entry.cafe.themes.forEach(
        (theme) =>
          addWeight(
            themeWeights,
            theme,
            factor * 1.6,
          ),
      );

      entry.cafe.tags.forEach(
        (tag) =>
          addWeight(
            tagWeights,
            tag,
            factor * 0.7,
          ),
      );

      entry.cafe.representativeTags.forEach(
        (tag) =>
          addWeight(
            tagWeights,
            tag,
            factor * 1.4,
          ),
      );
    },
  );

  const visitSummaryMap =
    buildVisitSummaryMap(
      visits,
    );

  const modeSignal =
    MODE_SIGNALS[mode];

  const recommendations =
    entries
      .map((entry) => {
        const summary =
          visitSummaryMap.get(
            entry.cafe.placeId,
          ) ?? {
            count: 0,
            ratingTotal: 0,
            ratingCount: 0,
            lastVisitedAt: null,
            revisitYesCount: 0,
            revisitNoCount: 0,
          };

        const feedbackReaction =
          feedbackMap.get(
            entry.cafe.placeId,
          )?.reaction ??
          null;

        const averageRating =
          summary.ratingCount > 0
            ? Math.round(
                (
                  summary.ratingTotal /
                  summary.ratingCount
                ) *
                  10,
              ) / 10
            : null;

        let rawScore = 24;

        if (
          entry.cafe.status ===
          'favorite'
        ) {
          rawScore += 12;
        } else if (
          entry.cafe.status ===
          'wantToGo'
        ) {
          rawScore += 7;
        }

        rawScore += clamp(
          (
            primaryWeights.get(
              entry.cafe.primaryTheme,
            ) ?? 0
          ) * 1.4,
          -18,
          18,
        );

        const matchedThemes =
          entry.cafe.themes
            .map((id) => ({
              id,
              weight:
                themeWeights.get(id) ??
                0,
            }))
            .filter(
              (item) =>
                item.weight !== 0,
            );

        rawScore += clamp(
          matchedThemes.reduce(
            (sum, item) =>
              sum +
              item.weight * 0.9,
            0,
          ),
          -22,
          22,
        );

        const matchedTags =
          entry.cafe.tags
            .map((id) => ({
              id,
              weight:
                tagWeights.get(id) ??
                0,
            }))
            .filter(
              (item) =>
                item.weight !== 0,
            );

        rawScore += clamp(
          matchedTags.reduce(
            (sum, item) =>
              sum +
              item.weight * 0.55,
            0,
          ),
          -24,
          24,
        );

        entry.cafe.representativeTags.forEach(
          (tag) => {
            rawScore += clamp(
              (
                tagWeights.get(tag) ??
                0
              ) * 0.55,
              -4,
              4,
            );
          },
        );

        if (
          summary.count === 0
        ) {
          rawScore += 8;
        } else {
          rawScore += Math.min(
            7,
            summary.count * 1.25,
          );
        }

        if (
          averageRating !== null
        ) {
          rawScore +=
            (
              averageRating - 3
            ) * 4;
        }

        rawScore += Math.min(
          12,
          summary.revisitYesCount *
            4,
        );

        rawScore -= Math.min(
          12,
          summary.revisitNoCount *
            6,
        );

        let feedbackEffect = 0;

        if (
          feedbackReaction ===
          'interested'
        ) {
          feedbackEffect = 18;
        } else if (
          feedbackReaction ===
          'wantToGo'
        ) {
          feedbackEffect = 12;
        } else if (
          feedbackReaction ===
          'notInterested'
        ) {
          feedbackEffect = -38;
        }

        rawScore +=
          feedbackEffect;

        rawScore +=
          getSignalBoost(
            entry,
            modeSignal,
          );

        if (mode === 'new') {
          rawScore +=
            summary.count === 0
              ? 22
              : -30;
        } else if (
          mode === 'revisit'
        ) {
          rawScore +=
            summary.revisitYesCount >
            0
              ? 24
              : -24;
        }

        const reasons:
          string[] = [];

        if (
          feedbackReaction ===
          'interested'
        ) {
          reasons.push(
            '관심 있어요 피드백을 추천에 반영했어요',
          );
        } else if (
          feedbackReaction ===
          'wantToGo'
        ) {
          reasons.push(
            '나중에 가볼래요로 남겨둔 카페예요',
          );
        } else if (
          feedbackReaction ===
          'notInterested'
        ) {
          reasons.push(
            '관심 없음 피드백으로 추천 점수를 낮췄어요',
          );
        }

        const modeReason =
          getModeReason(mode);

        if (
          modeReason &&
          (
            mode === 'new'
              ? summary.count === 0
              : mode === 'revisit'
                ? summary.revisitYesCount >
                  0
                : matchesSignal(
                    entry,
                    modeSignal,
                  )
          )
        ) {
          reasons.push(
            modeReason,
          );
        }

        if (
          profile.dominantPurpose &&
          matchesSignal(
            entry,
            PURPOSE_SIGNALS[
              profile
                .dominantPurpose
            ],
          )
        ) {
          reasons.push(
            `${PURPOSE_LABELS[profile.dominantPurpose]} 취향과 잘 맞아요`,
          );
        }

        const topTag =
          getTopWeightedMatch(
            entry.cafe
              .representativeTags
              .length > 0
              ? entry.cafe
                  .representativeTags
              : entry.cafe.tags,
            tagWeights,
          );

        if (topTag) {
          reasons.push(
            `${getReasonLabelForTag(topTag.id)} 키워드가 취향과 일치해요`,
          );
        }

        const topTheme =
          getTopWeightedMatch(
            entry.cafe.themes,
            themeWeights,
          );

        if (
          topTheme &&
          reasons.length < 3
        ) {
          reasons.push(
            `${getReasonLabelForTheme(topTheme.id)} 선호가 반영됐어요`,
          );
        }

        if (
          summary.revisitYesCount >
            0 &&
          reasons.length < 3
        ) {
          reasons.push(
            '다시 가고 싶다고 기록했어요',
          );
        }

        if (
          summary.count === 0 &&
          reasons.length < 3
        ) {
          reasons.push(
            '저장해 두고 아직 방문하지 않았어요',
          );
        }

        if (
          reasons.length === 0
        ) {
          reasons.push(
            `${getReasonLabelForPrimaryTheme(entry.cafe.primaryTheme)} 테마를 바탕으로 추천해요`,
          );
        }

        const score =
          Math.max(
            1,
            Math.min(
              99,
              Math.round(
                rawScore,
              ),
            ),
          );

        return {
          entry,
          score,
          reasons:
            Array.from(
              new Set(reasons),
            ).slice(
              0,
              3,
            ),
          visitCount:
            summary.count,
          averageRating,
          lastVisitedAt:
            summary.lastVisitedAt,
          revisitYesCount:
            summary.revisitYesCount,
          feedbackReaction,
          feedbackEffect,
        };
      })
      .filter((item) => {
        if (mode === 'new') {
          return (
            item.visitCount === 0
          );
        }

        if (
          mode === 'revisit'
        ) {
          return (
            item.revisitYesCount >
            0
          );
        }

        return true;
      })
      .sort(
        (first, second) => {
          if (
            second.score !==
            first.score
          ) {
            return (
              second.score -
              first.score
            );
          }

          if (
            first.visitCount !==
            second.visitCount
          ) {
            return (
              first.visitCount -
              second.visitCount
            );
          }

          return first.entry.cafe.name.localeCompare(
            second.entry.cafe.name,
            'ko',
          );
        },
      );

  return {
    profile,
    recommendations,
  };
}
