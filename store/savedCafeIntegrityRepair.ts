import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getApp,
} from '@react-native-firebase/app';
import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  loadSavedCafeEntriesLocalOnly,
  type SavedCafeLocalEntry,
} from './savedCafeLocal';
import {
  loadSavedCafeFolderStateLocalOnly,
  pruneSavedCafeFolderMemberships,
  setSavedCafeFolderMembership,
  syncSavedCafeFolderState,
  type SavedCafeFolderState,
} from './savedCafeFolders';
import {
  loadSavedCafeRecommendationFeedbackStateLocalOnly,
  setSavedCafeRecommendationFeedback,
  syncSavedCafeRecommendationFeedbackState,
  type SavedCafeRecommendationFeedbackState,
} from './savedCafeRecommendationFeedback';
import {
  loadSavedCafeRecommendationPreferenceStateLocalOnly,
  type SavedCafeRecommendationPreferenceState,
} from './savedCafeRecommendationPreferences';
import {
  runSavedCafeIntegrationDiagnostics,
  type SavedCafeDiagnosticReport,
} from './savedCafeDiagnostics';
import {
  loadSavedCafeVisitStateLocalOnly,
  type SavedCafeVisitState,
} from './savedCafeVisits';

// SAVED_CAFE_V52_INTEGRITY_REPAIR

const BACKUP_VERSION = 1;
const BACKUP_LIMIT = 5;
const BACKUP_KEY_PREFIX =
  'root_saved_cafe_integrity_backups_v1:';

type LoadedIntegrityState = {
  entries: SavedCafeLocalEntry[];
  visits: SavedCafeVisitState;
  folders: SavedCafeFolderState;
  feedback:
    SavedCafeRecommendationFeedbackState;
  preferences:
    SavedCafeRecommendationPreferenceState;
};

export type SavedCafeIntegrityIssueKind =
  | 'folder-membership-missing-cafe'
  | 'folder-membership-missing-folder'
  | 'feedback-missing-cafe'
  | 'visit-missing-cafe'
  | 'duplicate-folder-name';

export type SavedCafeIntegrityIssueLevel =
  | 'safe'
  | 'review';

export type SavedCafeIntegrityIssue = {
  id: string;
  kind: SavedCafeIntegrityIssueKind;
  level: SavedCafeIntegrityIssueLevel;
  title: string;
  summary: string;
  placeId?: string;
  folderId?: string;
  visitId?: string;
};

export type SavedCafeIntegrityPlanMetrics = {
  savedCafeCount: number;
  visitCount: number;
  folderCount: number;
  folderMembershipCount: number;
  activeFeedbackCount: number;
  staleFolderMembershipCount: number;
  orphanFeedbackCount: number;
  orphanVisitCount: number;
  duplicateFolderNameCount: number;
};

export type SavedCafeIntegrityRepairPlan = {
  generatedAt: string;
  safeActionCount: number;
  reviewActionCount: number;
  metrics: SavedCafeIntegrityPlanMetrics;
  issues: SavedCafeIntegrityIssue[];
};

type SavedCafeIntegritySnapshot = {
  entries: SavedCafeLocalEntry[];
  visits: SavedCafeVisitState;
  folders: SavedCafeFolderState;
  feedback:
    SavedCafeRecommendationFeedbackState;
  preferences:
    SavedCafeRecommendationPreferenceState;
};

type SavedCafeIntegrityBackup = {
  version: 1;
  id: string;
  createdAt: string;
  reason: string;
  snapshot: SavedCafeIntegritySnapshot;
};

export type SavedCafeIntegrityBackupSummary = {
  id: string;
  createdAt: string;
  reason: string;
  savedCafeCount: number;
  visitCount: number;
  folderCount: number;
  folderMembershipCount: number;
  activeFeedbackCount: number;
};

export type SavedCafeIntegrityRepairResult = {
  generatedAt: string;
  backupId: string | null;
  changedCount: number;
  before: SavedCafeIntegrityRepairPlan;
  after: SavedCafeIntegrityRepairPlan;
  postDiagnostic: SavedCafeDiagnosticReport;
  syncWarningCount: number;
};

function nowIso() {
  return new Date().toISOString();
}

function getBackupScopeKey() {
  const uid =
    getAuth(
      getApp(),
    ).currentUser?.uid ??
    null;

  return `${BACKUP_KEY_PREFIX}${
    uid
      ? `user:${uid}`
      : 'guest'
  }`;
}

function isBackup(
  value: unknown,
): value is SavedCafeIntegrityBackup {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const source =
    value as Partial<SavedCafeIntegrityBackup>;

  return (
    source.version === BACKUP_VERSION &&
    typeof source.id === 'string' &&
    Boolean(source.id.trim()) &&
    typeof source.createdAt === 'string' &&
    typeof source.reason === 'string' &&
    Boolean(source.snapshot) &&
    typeof source.snapshot === 'object'
  );
}

async function loadIntegrityState():
  Promise<LoadedIntegrityState> {
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

async function loadIntegrityBackups() {
  const raw =
    await AsyncStorage.getItem(
      getBackupScopeKey(),
    );

  if (!raw) {
    return [] as SavedCafeIntegrityBackup[];
  }

  try {
    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isBackup)
      .sort(
        (first, second) =>
          new Date(
            second.createdAt,
          ).getTime() -
          new Date(
            first.createdAt,
          ).getTime(),
      )
      .slice(0, BACKUP_LIMIT);
  } catch {
    return [];
  }
}

async function createIntegrityBackup(
  state: LoadedIntegrityState,
  reason: string,
) {
  const createdAt =
    nowIso();

  const backup:
    SavedCafeIntegrityBackup = {
      version: BACKUP_VERSION,
      id: [
        'cafe-integrity',
        Date.now().toString(36),
        Math.random()
          .toString(36)
          .slice(2, 8),
      ].join('-'),
      createdAt,
      reason,
      snapshot: {
        entries:
          state.entries,
        visits:
          state.visits,
        folders:
          state.folders,
        feedback:
          state.feedback,
        preferences:
          state.preferences,
      },
    };

  const current =
    await loadIntegrityBackups();

  const next = [
    backup,
    ...current.filter(
      (item) =>
        item.id !== backup.id,
    ),
  ].slice(
    0,
    BACKUP_LIMIT,
  );

  await AsyncStorage.setItem(
    getBackupScopeKey(),
    JSON.stringify(next),
  );

  return backup;
}

function normalizeFolderNameKey(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase(
      'ko-KR',
    );
}

function buildPlanFromState(
  state: LoadedIntegrityState,
): SavedCafeIntegrityRepairPlan {
  const issues:
    SavedCafeIntegrityIssue[] = [];

  const savedPlaceIds =
    new Set(
      state.entries.map(
        (entry) =>
          entry.cafe.placeId,
      ),
    );

  const folderIds =
    new Set(
      state.folders.folders.map(
        (folder) =>
          folder.id,
      ),
    );

  const staleMembershipKeys =
    new Set<string>();

  state.folders.memberships.forEach(
    (membership) => {
      if (
        !savedPlaceIds.has(
          membership.placeId,
        )
      ) {
        staleMembershipKeys.add(
          membership.key,
        );

        issues.push({
          id:
            `membership-cafe:${membership.key}`,
          kind:
            'folder-membership-missing-cafe',
          level: 'safe',
          title:
            '저장 목록에 없는 카페의 폴더 연결',
          summary:
            '카페는 현재 저장 목록에 없지만 폴더 연결이 남아 있어 안전하게 정리할 수 있어요.',
          placeId:
            membership.placeId,
          folderId:
            membership.folderId,
        });
      }

      if (
        !folderIds.has(
          membership.folderId,
        )
      ) {
        staleMembershipKeys.add(
          membership.key,
        );

        issues.push({
          id:
            `membership-folder:${membership.key}`,
          kind:
            'folder-membership-missing-folder',
          level: 'safe',
          title:
            '삭제된 폴더의 카페 연결',
          summary:
            '현재 존재하지 않는 폴더를 가리키는 연결이라 안전하게 정리할 수 있어요.',
          placeId:
            membership.placeId,
          folderId:
            membership.folderId,
        });
      }
    },
  );

  const orphanFeedback =
    state.feedback.feedbacks.filter(
      (item) =>
        item.reaction !== null &&
        !savedPlaceIds.has(
          item.placeId,
        ),
    );

  orphanFeedback.forEach(
    (item) => {
      issues.push({
        id:
          `feedback:${item.placeId}`,
        kind:
          'feedback-missing-cafe',
        level: 'safe',
        title:
          '저장 목록에 없는 카페의 추천 피드백',
        summary:
          '현재 추천 대상이 아닌 카페의 활성 피드백을 비활성 상태로 정리할 수 있어요.',
        placeId:
          item.placeId,
      });
    },
  );

  const orphanVisits =
    state.visits.visits.filter(
      (visit) =>
        !savedPlaceIds.has(
          visit.placeId,
        ),
    );

  orphanVisits.forEach(
    (visit) => {
      issues.push({
        id:
          `visit:${visit.id}`,
        kind:
          'visit-missing-cafe',
        level: 'review',
        title:
          '저장 목록에 없는 카페의 방문 기록',
        summary:
          '과거 방문 기록일 수 있어 자동 삭제하지 않아요. 기록 화면에서 직접 확인해 주세요.',
        placeId:
          visit.placeId,
        visitId:
          visit.id,
      });
    },
  );

  const folderNameGroups =
    new Map<
      string,
      string[]
    >();

  state.folders.folders.forEach(
    (folder) => {
      const key =
        normalizeFolderNameKey(
          folder.name,
        );

      const current =
        folderNameGroups.get(
          key,
        ) ?? [];

      current.push(
        folder.id,
      );

      folderNameGroups.set(
        key,
        current,
      );
    },
  );

  const duplicateFolderNames =
    Array.from(
      folderNameGroups.entries(),
    ).filter(
      ([key, ids]) =>
        Boolean(key) &&
        ids.length > 1,
    );

  duplicateFolderNames.forEach(
    ([nameKey, ids]) => {
      issues.push({
        id:
          `folder-name:${nameKey}`,
        kind:
          'duplicate-folder-name',
        level: 'review',
        title:
          '같은 이름의 폴더',
        summary:
          `${ids.length}개의 폴더가 같은 이름을 사용하고 있어요. 자동 이름 변경은 하지 않아요.`,
      });
    },
  );

  const activeFeedbackCount =
    state.feedback.feedbacks.filter(
      (item) =>
        item.reaction !== null,
    ).length;

  return {
    generatedAt:
      nowIso(),
    safeActionCount:
      staleMembershipKeys.size +
      orphanFeedback.length,
    reviewActionCount:
      orphanVisits.length +
      duplicateFolderNames.length,
    metrics: {
      savedCafeCount:
        state.entries.length,
      visitCount:
        state.visits.visits.length,
      folderCount:
        state.folders.folders.length,
      folderMembershipCount:
        state.folders.memberships.length,
      activeFeedbackCount,
      staleFolderMembershipCount:
        staleMembershipKeys.size,
      orphanFeedbackCount:
        orphanFeedback.length,
      orphanVisitCount:
        orphanVisits.length,
      duplicateFolderNameCount:
        duplicateFolderNames.length,
    },
    issues,
  };
}

export async function buildSavedCafeIntegrityRepairPlan() {
  const state =
    await loadIntegrityState();

  return buildPlanFromState(
    state,
  );
}

export async function getSavedCafeIntegrityBackupSummaries():
  Promise<SavedCafeIntegrityBackupSummary[]> {
  const backups =
    await loadIntegrityBackups();

  return backups.map(
    (backup) => ({
      id:
        backup.id,
      createdAt:
        backup.createdAt,
      reason:
        backup.reason,
      savedCafeCount:
        backup.snapshot
          .entries.length,
      visitCount:
        backup.snapshot
          .visits.visits.length,
      folderCount:
        backup.snapshot
          .folders.folders.length,
      folderMembershipCount:
        backup.snapshot
          .folders.memberships.length,
      activeFeedbackCount:
        backup.snapshot
          .feedback.feedbacks.filter(
            (item) =>
              item.reaction !== null,
          ).length,
    }),
  );
}

export async function runSafeSavedCafeIntegrityRepair():
  Promise<SavedCafeIntegrityRepairResult> {
  const beforeState =
    await loadIntegrityState();

  const before =
    buildPlanFromState(
      beforeState,
    );

  if (
    before.safeActionCount === 0
  ) {
    return {
      generatedAt:
        nowIso(),
      backupId:
        null,
      changedCount:
        0,
      before,
      after:
        before,
      postDiagnostic:
        await runSavedCafeIntegrationDiagnostics({
          includeCloudSync:
            false,
        }),
      syncWarningCount:
        0,
    };
  }

  const backup =
    await createIntegrityBackup(
      beforeState,
      'v52-safe-repair',
    );

  const validPlaceIds =
    beforeState.entries.map(
      (entry) =>
        entry.cafe.placeId,
    );

  const validFolderIds =
    new Set(
      beforeState.folders.folders.map(
        (folder) =>
          folder.id,
      ),
    );

  await pruneSavedCafeFolderMemberships(
    validPlaceIds,
  );

  const folderStateAfterCafePrune =
    await loadSavedCafeFolderStateLocalOnly();

  const missingFolderMemberships =
    folderStateAfterCafePrune
      .memberships
      .filter(
        (membership) =>
          !validFolderIds.has(
            membership.folderId,
          ),
      );

  for (
    const membership
    of missingFolderMemberships
  ) {
    await setSavedCafeFolderMembership(
      membership.folderId,
      membership.placeId,
      false,
    );
  }

  const orphanFeedback =
    beforeState.feedback.feedbacks.filter(
      (item) =>
        item.reaction !== null &&
        !validPlaceIds.includes(
          item.placeId,
        ),
    );

  for (
    const item
    of orphanFeedback
  ) {
    await setSavedCafeRecommendationFeedback(
      item.placeId,
      null,
    );
  }

  const syncResults =
    await Promise.allSettled([
      syncSavedCafeFolderState(
        'v52-safe-integrity-repair',
      ),
      syncSavedCafeRecommendationFeedbackState(
        'v52-safe-integrity-repair',
      ),
    ]);

  const syncWarningCount =
    syncResults.filter(
      (result) =>
        result.status ===
        'rejected',
    ).length;

  const afterState =
    await loadIntegrityState();

  const after =
    buildPlanFromState(
      afterState,
    );

  return {
    generatedAt:
      nowIso(),
    backupId:
      backup.id,
    changedCount:
      Math.max(
        0,
        before.safeActionCount -
          after.safeActionCount,
      ),
    before,
    after,
    postDiagnostic:
      await runSavedCafeIntegrationDiagnostics({
        includeCloudSync:
          false,
      }),
    syncWarningCount,
  };
}
