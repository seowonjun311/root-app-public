import {
  getApp,
} from '@react-native-firebase/app';
import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  loadSavedCafeEntriesLocalOnly,
  syncSavedCafeEntries,
  type SavedCafeLocalEntry,
} from './savedCafeLocal';
import {
  loadSavedCafeFolderStateLocalOnly,
  syncSavedCafeFolderState,
  type SavedCafeFolderState,
} from './savedCafeFolders';
import {
  loadSavedCafeRecommendationFeedbackStateLocalOnly,
  syncSavedCafeRecommendationFeedbackState,
  type SavedCafeRecommendationFeedbackState,
} from './savedCafeRecommendationFeedback';
import {
  loadSavedCafeRecommendationPreferenceStateLocalOnly,
  syncSavedCafeRecommendationPreferenceState,
  type SavedCafeRecommendationPreferenceState,
} from './savedCafeRecommendationPreferences';
import {
  buildSavedCafeRecommendations,
  type SavedCafeRecommendationMode,
} from './savedCafeRecommendations';
import {
  loadSavedCafeVisitStateLocalOnly,
  syncSavedCafeVisitState,
  type SavedCafeVisitState,
} from './savedCafeVisits';

// SAVED_CAFE_V51_INTEGRATION_DIAGNOSTICS

export type SavedCafeDiagnosticStatus =
  | 'pass'
  | 'warning'
  | 'fail'
  | 'info';

export type SavedCafeDiagnosticCheck = {
  id: string;
  title: string;
  status: SavedCafeDiagnosticStatus;
  summary: string;
  detail?: string;
};

export type SavedCafeDiagnosticMetrics = {
  savedCafeCount: number;
  visitCount: number;
  folderCount: number;
  folderMembershipCount: number;
  feedbackCount: number;
  preferenceAdjustedCount: number;
  recommendationCount: number;
};

export type SavedCafeDiagnosticReport = {
  mode: 'local' | 'sync';
  generatedAt: string;
  signedIn: boolean;
  checks: SavedCafeDiagnosticCheck[];
  metrics: SavedCafeDiagnosticMetrics;
  passCount: number;
  warningCount: number;
  failCount: number;
  infoCount: number;
};

type LoadedDiagnosticState = {
  entries: SavedCafeLocalEntry[];
  visits: SavedCafeVisitState;
  folders: SavedCafeFolderState;
  feedback:
    SavedCafeRecommendationFeedbackState;
  preferences:
    SavedCafeRecommendationPreferenceState;
};

const RECOMMENDATION_MODES:
  SavedCafeRecommendationMode[] = [
    'all',
    'new',
    'study',
    'date',
    'solo',
    'revisit',
  ];

function createCheck(
  id: string,
  title: string,
  status: SavedCafeDiagnosticStatus,
  summary: string,
  detail?: string,
): SavedCafeDiagnosticCheck {
  return {
    id,
    title,
    status,
    summary,
    detail,
  };
}

function getDuplicateValues(
  values: readonly string[],
) {
  const seen =
    new Set<string>();
  const duplicates =
    new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  });

  return Array.from(
    duplicates,
  );
}

function isValidIsoDate(
  value: string,
) {
  const time =
    new Date(value).getTime();

  return Number.isFinite(time);
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

  return String(error);
}

async function loadLocalDiagnosticState():
  Promise<LoadedDiagnosticState> {
  const [
    entries,
    visits,
    folders,
    feedback,
    preferences,
  ] = await Promise.all([
    loadSavedCafeEntriesLocalOnly(),
    loadSavedCafeVisitStateLocalOnly(),
    loadSavedCafeFolderStateLocalOnly(),
    loadSavedCafeRecommendationFeedbackStateLocalOnly(),
    loadSavedCafeRecommendationPreferenceStateLocalOnly(),
  ]);

  return {
    entries,
    visits,
    folders,
    feedback,
    preferences,
  };
}

function addSavedCafeChecks(
  state: LoadedDiagnosticState,
  checks: SavedCafeDiagnosticCheck[],
) {
  const placeIds =
    state.entries.map(
      (entry) =>
        entry.cafe.placeId,
    );

  const invalidPlaceIds =
    placeIds.filter(
      (placeId) =>
        !placeId.trim(),
    );

  const duplicates =
    getDuplicateValues(
      placeIds,
    );

  if (
    invalidPlaceIds.length > 0
  ) {
    checks.push(
      createCheck(
        'saved-cafe-id',
        '저장 카페 식별자',
        'fail',
        `${invalidPlaceIds.length}개의 저장 카페에 placeId가 없어요.`,
      ),
    );
  } else if (
    duplicates.length > 0
  ) {
    checks.push(
      createCheck(
        'saved-cafe-id',
        '저장 카페 식별자',
        'fail',
        `중복 placeId ${duplicates.length}개를 발견했어요.`,
        duplicates
          .slice(0, 5)
          .join(', '),
      ),
    );
  } else {
    checks.push(
      createCheck(
        'saved-cafe-id',
        '저장 카페 식별자',
        'pass',
        `${state.entries.length}개의 저장 카페 식별자가 정상이에요.`,
      ),
    );
  }

  const invalidThemeEntries =
    state.entries.filter(
      (entry) =>
        !entry.cafe.primaryTheme ||
        !Array.isArray(
          entry.cafe.themes,
        ) ||
        !Array.isArray(
          entry.cafe.tags,
        ) ||
        !Array.isArray(
          entry.cafe.representativeTags,
        ),
    );

  checks.push(
    createCheck(
      'saved-cafe-metadata',
      '카페 추천 메타데이터',
      invalidThemeEntries.length === 0
        ? 'pass'
        : 'fail',
      invalidThemeEntries.length === 0
        ? '대표 테마·카페 테마·키워드 구조가 정상이에요.'
        : `${invalidThemeEntries.length}개의 카페 추천 메타데이터가 올바르지 않아요.`,
    ),
  );
}

function addVisitChecks(
  state: LoadedDiagnosticState,
  checks: SavedCafeDiagnosticCheck[],
) {
  const savedPlaceIds =
    new Set(
      state.entries.map(
        (entry) =>
          entry.cafe.placeId,
      ),
    );

  const duplicateVisitIds =
    getDuplicateValues(
      state.visits.visits.map(
        (visit) =>
          visit.id,
      ),
    );

  checks.push(
    createCheck(
      'visit-id',
      '방문 기록 식별자',
      duplicateVisitIds.length === 0
        ? 'pass'
        : 'fail',
      duplicateVisitIds.length === 0
        ? `${state.visits.visits.length}개의 방문 기록 ID가 정상이에요.`
        : `중복 방문 기록 ID ${duplicateVisitIds.length}개를 발견했어요.`,
      duplicateVisitIds
        .slice(0, 5)
        .join(', '),
    ),
  );

  const orphanVisits =
    state.visits.visits.filter(
      (visit) =>
        !savedPlaceIds.has(
          visit.placeId,
        ),
    );

  checks.push(
    createCheck(
      'visit-reference',
      '방문 ↔ 저장 카페 연결',
      orphanVisits.length === 0
        ? 'pass'
        : 'warning',
      orphanVisits.length === 0
        ? '모든 방문 기록이 현재 저장 카페와 연결돼 있어요.'
        : `현재 저장 목록에 없는 카페의 방문 기록이 ${orphanVisits.length}개 있어요.`,
      orphanVisits.length > 0
        ? '카페를 삭제한 뒤 방문 기록을 보존한 경우일 수 있어요. 자동 삭제하지 않습니다.'
        : undefined,
    ),
  );

  const invalidVisits =
    state.visits.visits.filter(
      (visit) =>
        !visit.placeId.trim() ||
        !isValidIsoDate(
          visit.visitedAt,
        ) ||
        (
          visit.rating !== null &&
          (
            !Number.isFinite(
              visit.rating,
            ) ||
            visit.rating < 1 ||
            visit.rating > 5
          )
        ),
    );

  checks.push(
    createCheck(
      'visit-shape',
      '방문 기록 기본값',
      invalidVisits.length === 0
        ? 'pass'
        : 'fail',
      invalidVisits.length === 0
        ? '방문 날짜와 별점 범위가 정상이에요.'
        : `${invalidVisits.length}개의 방문 기록에 잘못된 날짜 또는 별점이 있어요.`,
    ),
  );
}

function addFolderChecks(
  state: LoadedDiagnosticState,
  checks: SavedCafeDiagnosticCheck[],
) {
  const folderIds =
    state.folders.folders.map(
      (folder) =>
        folder.id,
    );

  const folderIdSet =
    new Set(
      folderIds,
    );

  const savedPlaceIds =
    new Set(
      state.entries.map(
        (entry) =>
          entry.cafe.placeId,
      ),
    );

  const duplicateFolderIds =
    getDuplicateValues(
      folderIds,
    );

  const duplicateFolderNames =
    getDuplicateValues(
      state.folders.folders.map(
        (folder) =>
          folder.name
            .trim()
            .toLocaleLowerCase(
              'ko-KR',
            ),
      ),
    );

  if (
    duplicateFolderIds.length > 0 ||
    duplicateFolderNames.length > 0
  ) {
    checks.push(
      createCheck(
        'folder-identity',
        '폴더 식별자·이름',
        'fail',
        `중복 폴더 ID ${duplicateFolderIds.length}개 · 중복 이름 ${duplicateFolderNames.length}개를 발견했어요.`,
      ),
    );
  } else {
    checks.push(
      createCheck(
        'folder-identity',
        '폴더 식별자·이름',
        'pass',
        `${state.folders.folders.length}개의 폴더가 정상이에요.`,
      ),
    );
  }

  const duplicateMemberships =
    getDuplicateValues(
      state.folders.memberships.map(
        (membership) =>
          membership.key,
      ),
    );

  const invalidMemberships =
    state.folders.memberships.filter(
      (membership) =>
        !folderIdSet.has(
          membership.folderId,
        ) ||
        !savedPlaceIds.has(
          membership.placeId,
        ),
    );

  if (
    duplicateMemberships.length > 0
  ) {
    checks.push(
      createCheck(
        'folder-membership',
        '폴더 ↔ 카페 연결',
        'fail',
        `중복 폴더 연결 ${duplicateMemberships.length}개를 발견했어요.`,
      ),
    );
  } else if (
    invalidMemberships.length > 0
  ) {
    checks.push(
      createCheck(
        'folder-membership',
        '폴더 ↔ 카페 연결',
        'warning',
        `현재 폴더/저장 카페와 맞지 않는 연결이 ${invalidMemberships.length}개 있어요.`,
        '삭제 직후 동기화 중인 데이터일 수 있어요. 자동 삭제하지 않습니다.',
      ),
    );
  } else {
    checks.push(
      createCheck(
        'folder-membership',
        '폴더 ↔ 카페 연결',
        'pass',
        `${state.folders.memberships.length}개의 폴더 연결이 정상이에요.`,
      ),
    );
  }
}

function addFeedbackChecks(
  state: LoadedDiagnosticState,
  checks: SavedCafeDiagnosticCheck[],
) {
  const validReactions =
    new Set([
      'interested',
      'wantToGo',
      'notInterested',
    ]);

  const savedPlaceIds =
    new Set(
      state.entries.map(
        (entry) =>
          entry.cafe.placeId,
      ),
    );

  const duplicateFeedbackPlaceIds =
    getDuplicateValues(
      state.feedback.feedbacks.map(
        (feedback) =>
          feedback.placeId,
      ),
    );

  const invalidFeedback =
    state.feedback.feedbacks.filter(
      (feedback) =>
        !feedback.placeId.trim() ||
        (
          feedback.reaction !== null &&
          !validReactions.has(
            feedback.reaction,
          )
        ),
    );

  if (
    duplicateFeedbackPlaceIds.length > 0 ||
    invalidFeedback.length > 0
  ) {
    checks.push(
      createCheck(
        'feedback-shape',
        '추천 피드백 데이터',
        'fail',
        `중복 피드백 ${duplicateFeedbackPlaceIds.length}개 · 잘못된 피드백 ${invalidFeedback.length}개를 발견했어요.`,
      ),
    );
  } else {
    checks.push(
      createCheck(
        'feedback-shape',
        '추천 피드백 데이터',
        'pass',
        `${state.feedback.feedbacks.length}개의 추천 피드백 구조가 정상이에요.`,
      ),
    );
  }

  const orphanFeedback =
    state.feedback.feedbacks.filter(
      (feedback) =>
        feedback.reaction !== null &&
        !savedPlaceIds.has(
          feedback.placeId,
        ),
    );

  checks.push(
    createCheck(
      'feedback-reference',
      '피드백 ↔ 저장 카페 연결',
      orphanFeedback.length === 0
        ? 'pass'
        : 'warning',
      orphanFeedback.length === 0
        ? '활성 추천 피드백이 현재 저장 카페와 정상 연결돼 있어요.'
        : `저장 목록에 없는 카페의 활성 피드백이 ${orphanFeedback.length}개 있어요.`,
      orphanFeedback.length > 0
        ? '과거 추천 피드백을 보존한 상태일 수 있어요.'
        : undefined,
    ),
  );
}

function addPreferenceChecks(
  state: LoadedDiagnosticState,
  checks: SavedCafeDiagnosticCheck[],
) {
  const weights =
    Object.values(
      state.preferences.weights,
    );

  const invalidWeights =
    weights.filter(
      (weight) =>
        ![
          -2,
          -1,
          0,
          1,
          2,
        ].includes(
          weight,
        ),
    );

  const validStrength =
    [
      'low',
      'balanced',
      'high',
    ].includes(
      state.preferences
        .autoLearningStrength,
    );

  checks.push(
    createCheck(
      'preference-shape',
      '사용자 직접 취향 설정',
      invalidWeights.length === 0 &&
      validStrength
        ? 'pass'
        : 'fail',
      invalidWeights.length === 0 &&
      validStrength
        ? '8개 직접 가중치와 자동 학습 강도가 정상이에요.'
        : '추천 취향 설정 값 중 허용 범위를 벗어난 값이 있어요.',
    ),
  );
}

function buildRecommendationSignature(
  state: LoadedDiagnosticState,
  mode: SavedCafeRecommendationMode,
) {
  const result =
    buildSavedCafeRecommendations(
      state.entries,
      state.visits,
      mode,
      state.feedback,
      state.preferences,
    );

  return {
    result,
    signature:
      result.recommendations
        .map(
          (item) =>
            `${item.entry.cafe.placeId}:${item.score}`,
        )
        .join('|'),
  };
}

function addRecommendationChecks(
  state: LoadedDiagnosticState,
  checks: SavedCafeDiagnosticCheck[],
) {
  const savedPlaceIds =
    new Set(
      state.entries.map(
        (entry) =>
          entry.cafe.placeId,
      ),
    );

  let invalidScoreCount = 0;
  let duplicatePlaceIdCount = 0;
  let invalidReferenceCount = 0;
  let invalidModeRuleCount = 0;
  let nondeterministicModeCount = 0;

  RECOMMENDATION_MODES.forEach(
    (mode) => {
      const first =
        buildRecommendationSignature(
          state,
          mode,
        );

      const second =
        buildRecommendationSignature(
          state,
          mode,
        );

      if (
        first.signature !==
        second.signature
      ) {
        nondeterministicModeCount += 1;
      }

      const recommendations =
        first.result.recommendations;

      invalidScoreCount +=
        recommendations.filter(
          (item) =>
            !Number.isFinite(
              item.score,
            ) ||
            item.score < 1 ||
            item.score > 99,
        ).length;

      duplicatePlaceIdCount +=
        getDuplicateValues(
          recommendations.map(
            (item) =>
              item.entry.cafe.placeId,
          ),
        ).length;

      invalidReferenceCount +=
        recommendations.filter(
          (item) =>
            !savedPlaceIds.has(
              item.entry.cafe.placeId,
            ),
        ).length;

      if (
        mode === 'new'
      ) {
        invalidModeRuleCount +=
          recommendations.filter(
            (item) =>
              item.visitCount !== 0,
          ).length;
      }

      if (
        mode === 'revisit'
      ) {
        invalidModeRuleCount +=
          recommendations.filter(
            (item) =>
              item.revisitYesCount <= 0,
          ).length;
      }
    },
  );

  const recommendationFailureCount =
    invalidScoreCount +
    duplicatePlaceIdCount +
    invalidReferenceCount +
    invalidModeRuleCount;

  checks.push(
    createCheck(
      'recommendation-integrity',
      '추천 엔진 6개 모드',
      recommendationFailureCount === 0
        ? 'pass'
        : 'fail',
      recommendationFailureCount === 0
        ? '전체/미방문/공부/데이트/혼자/재방문 추천의 점수와 필터 규칙이 정상이에요.'
        : `추천 점수·중복·참조·필터 규칙 오류를 ${recommendationFailureCount}건 발견했어요.`,
      recommendationFailureCount > 0
        ? `점수 ${invalidScoreCount} · 중복 ${duplicatePlaceIdCount} · 참조 ${invalidReferenceCount} · 모드 규칙 ${invalidModeRuleCount}`
        : undefined,
    ),
  );

  checks.push(
    createCheck(
      'recommendation-determinism',
      '추천 결과 결정성',
      nondeterministicModeCount === 0
        ? 'pass'
        : 'fail',
      nondeterministicModeCount === 0
        ? '같은 입력으로 다시 계산했을 때 6개 모드의 결과가 동일해요.'
        : `${nondeterministicModeCount}개 추천 모드가 같은 입력에서 다른 결과를 만들었어요.`,
    ),
  );
}

async function addCloudSyncChecks(
  checks: SavedCafeDiagnosticCheck[],
) {
  const uid =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  if (!uid) {
    checks.push(
      createCheck(
        'cloud-sync',
        '로그인·클라우드 동기화',
        'info',
        '게스트 상태라 클라우드 동기화 검사를 건너뛰었어요.',
        '로그인 후 `동기화 포함 점검`을 실행하면 Firestore 병합 경로까지 검사합니다.',
      ),
    );

    return false;
  }

  const syncTargets = [
    {
      id: 'saved-cafes',
      label: '저장 카페',
      run: () =>
        syncSavedCafeEntries({
          reason:
            'v51-runtime-diagnostic',
        }),
    },
    {
      id: 'visits',
      label: '방문 기록',
      run: () =>
        syncSavedCafeVisitState(
          'v51-runtime-diagnostic',
        ),
    },
    {
      id: 'folders',
      label: '폴더',
      run: () =>
        syncSavedCafeFolderState(
          'v51-runtime-diagnostic',
        ),
    },
    {
      id: 'feedback',
      label: '추천 피드백',
      run: () =>
        syncSavedCafeRecommendationFeedbackState(
          'v51-runtime-diagnostic',
        ),
    },
    {
      id: 'preferences',
      label: '추천 취향',
      run: () =>
        syncSavedCafeRecommendationPreferenceState(
          'v51-runtime-diagnostic',
        ),
    },
  ] as const;

  const results =
    await Promise.allSettled(
      syncTargets.map(
        (target) =>
          target.run(),
      ),
    );

  results.forEach(
    (result, index) => {
      const target =
        syncTargets[index];

      if (
        result.status ===
        'fulfilled'
      ) {
        checks.push(
          createCheck(
            `cloud-sync-${target.id}`,
            `${target.label} 클라우드 동기화`,
            'pass',
            'Firestore 병합 동기화가 완료됐어요.',
          ),
        );
      } else {
        checks.push(
          createCheck(
            `cloud-sync-${target.id}`,
            `${target.label} 클라우드 동기화`,
            'warning',
            '클라우드 동기화가 완료되지 않았어요. 로컬 데이터 검사는 계속 진행했어요.',
            getErrorMessage(
              result.reason,
            ),
          ),
        );
      }
    },
  );

  return true;
}

function buildMetrics(
  state: LoadedDiagnosticState,
): SavedCafeDiagnosticMetrics {
  const preferenceAdjustedCount =
    Object.values(
      state.preferences.weights,
    ).filter(
      (weight) =>
        weight !== 0,
    ).length;

  const recommendationCount =
    buildSavedCafeRecommendations(
      state.entries,
      state.visits,
      'all',
      state.feedback,
      state.preferences,
    ).recommendations.length;

  return {
    savedCafeCount:
      state.entries.length,
    visitCount:
      state.visits.visits.length,
    folderCount:
      state.folders.folders.length,
    folderMembershipCount:
      state.folders.memberships.length,
    feedbackCount:
      state.feedback.feedbacks.filter(
        (feedback) =>
          feedback.reaction !== null,
      ).length,
    preferenceAdjustedCount,
    recommendationCount,
  };
}

export async function runSavedCafeIntegrationDiagnostics(
  options: {
    includeCloudSync?: boolean;
  } = {},
): Promise<SavedCafeDiagnosticReport> {
  const includeCloudSync =
    Boolean(
      options.includeCloudSync,
    );

  const checks:
    SavedCafeDiagnosticCheck[] = [];

  let signedIn =
    Boolean(
      getAuth(
        getApp(),
      ).currentUser?.uid,
    );

  if (includeCloudSync) {
    signedIn =
      await addCloudSyncChecks(
        checks,
      );
  } else {
    checks.push(
      createCheck(
        'diagnostic-mode',
        '점검 모드',
        'info',
        signedIn
          ? '빠른 로컬 점검이에요. 클라우드 쓰기 없이 현재 기기 데이터를 검사합니다.'
          : '게스트 빠른 점검이에요. 현재 기기 데이터를 검사합니다.',
      ),
    );
  }

  let state:
    LoadedDiagnosticState;

  try {
    state =
      await loadLocalDiagnosticState();

    checks.push(
      createCheck(
        'local-load',
        'V40~V50 로컬 데이터 로드',
        'pass',
        '저장 카페·방문·폴더·추천 피드백·추천 취향을 모두 불러왔어요.',
      ),
    );
  } catch (error) {
    checks.push(
      createCheck(
        'local-load',
        'V40~V50 로컬 데이터 로드',
        'fail',
        '통합 데이터 로드 중 오류가 발생했어요.',
        getErrorMessage(error),
      ),
    );

    return finalizeReport(
      includeCloudSync
        ? 'sync'
        : 'local',
      signedIn,
      checks,
      {
        savedCafeCount: 0,
        visitCount: 0,
        folderCount: 0,
        folderMembershipCount: 0,
        feedbackCount: 0,
        preferenceAdjustedCount: 0,
        recommendationCount: 0,
      },
    );
  }

  addSavedCafeChecks(
    state,
    checks,
  );

  addVisitChecks(
    state,
    checks,
  );

  addFolderChecks(
    state,
    checks,
  );

  addFeedbackChecks(
    state,
    checks,
  );

  addPreferenceChecks(
    state,
    checks,
  );

  try {
    addRecommendationChecks(
      state,
      checks,
    );
  } catch (error) {
    checks.push(
      createCheck(
        'recommendation-execution',
        '추천 엔진 실행',
        'fail',
        '추천 엔진을 통합 데이터로 실행하는 중 오류가 발생했어요.',
        getErrorMessage(error),
      ),
    );
  }

  if (
    state.entries.length === 0
  ) {
    checks.push(
      createCheck(
        'runtime-data-volume',
        '실기기 시나리오 준비',
        'warning',
        '저장 카페가 없어 추천·방문 연결을 충분히 검증할 수 없어요.',
        '카페를 최소 2~3곳 저장한 뒤 다시 실행하면 더 의미 있는 결과를 볼 수 있어요.',
      ),
    );
  } else if (
    state.visits.visits.length ===
    0
  ) {
    checks.push(
      createCheck(
        'runtime-data-volume',
        '실기기 시나리오 준비',
        'warning',
        '방문 기록이 없어 V42~V47 연결을 충분히 검증할 수 없어요.',
        '저장 카페 한 곳에 방문 기록을 만든 뒤 다시 실행해 주세요.',
      ),
    );
  } else {
    checks.push(
      createCheck(
        'runtime-data-volume',
        '실기기 시나리오 준비',
        'pass',
        '저장 카페와 방문 기록이 있어 주요 통합 계산을 검증할 수 있어요.',
      ),
    );
  }

  return finalizeReport(
    includeCloudSync
      ? 'sync'
      : 'local',
    signedIn,
    checks,
    buildMetrics(state),
  );
}

function finalizeReport(
  mode: 'local' | 'sync',
  signedIn: boolean,
  checks: SavedCafeDiagnosticCheck[],
  metrics: SavedCafeDiagnosticMetrics,
): SavedCafeDiagnosticReport {
  const passCount =
    checks.filter(
      (check) =>
        check.status === 'pass',
    ).length;

  const warningCount =
    checks.filter(
      (check) =>
        check.status ===
        'warning',
    ).length;

  const failCount =
    checks.filter(
      (check) =>
        check.status === 'fail',
    ).length;

  const infoCount =
    checks.filter(
      (check) =>
        check.status === 'info',
    ).length;

  return {
    mode,
    generatedAt:
      new Date().toISOString(),
    signedIn,
    checks,
    metrics,
    passCount,
    warningCount,
    failCount,
    infoCount,
  };
}
