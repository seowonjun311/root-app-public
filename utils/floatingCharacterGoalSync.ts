import {
  setFloatingCharacterGoalSnapshot,
  type FloatingCharacterGoalSnapshotItem,
} from '../modules/root-floating-character';

// CHARACTER_V101E_FLOATING_GOAL_SNAPSHOT_SYNC
function getTodayIndex(
  date =
    new Date()
) {
  const day =
    date.getDay();

  return day === 0
    ? 6
    : day - 1;
}

function formatDateKey(
  date:
    Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function getWeekBounds(
  source =
    new Date()
) {
  const start =
    new Date(
      source
    );

  start.setHours(
    0,
    0,
    0,
    0
  );

  const day =
    start.getDay();

  const moveDays =
    day === 0
      ? -6
      : 1 - day;

  start.setDate(
    start.getDate() +
      moveDays
  );

  const end =
    new Date(
      start
    );

  end.setDate(
    end.getDate() +
      6
  );

  return {
    start:
      formatDateKey(
        start
      ),
    end:
      formatDateKey(
        end
      ),
  };
}

function normalizeSelectedDays(
  goal:
    any
) {
  return (
    Array.isArray(
      goal?.selectedDays
    )
      ? goal.selectedDays
      : []
  )
    .map(
      Number
    )
    .filter(
      (
        value:
          number
      ) =>
        Number.isInteger(
          value
        ) &&
        value >= 0 &&
        value <= 6
    );
}

function completedToday(
  goal:
    any,
  todayKey:
    string,
  todayIndex:
    number
) {
  if (
    Array.isArray(
      goal?.completedDates
    )
  ) {
    return goal.completedDates
      .map(
        (
          value:
            unknown
        ) =>
          String(
            value ??
              ''
          ).slice(
            0,
            10
          )
      )
      .includes(
        todayKey
      );
  }

  return (
    Array.isArray(
      goal?.completedDays
    )
      ? goal.completedDays
      : []
  )
    .map(
      Number
    )
    .includes(
      todayIndex
    );
}

function weeklyCompletionCount(
  goal:
    any,
  weekStart:
    string,
  weekEnd:
    string
) {
  if (
    !Array.isArray(
      goal?.completedDates
    )
  ) {
    return 0;
  }

  return new Set(
    goal.completedDates
      .map(
        (
          value:
            unknown
        ) =>
          String(
            value ??
              ''
          ).slice(
            0,
            10
          )
      )
      .filter(
        (
          dateKey:
            string
        ) =>
          dateKey >=
            weekStart &&
          dateKey <=
            weekEnd
      )
  ).size;
}

export function buildFloatingCharacterGoalSnapshot(
  actionGoals:
    any[]
):
  FloatingCharacterGoalSnapshotItem[] {
  const now =
    new Date();

  const todayIndex =
    getTodayIndex(
      now
    );

  const todayKey =
    formatDateKey(
      now
    );

  const week =
    getWeekBounds(
      now
    );

  const source =
    Array.isArray(
      actionGoals
    )
      ? actionGoals
      : [];

  return source
    .filter(
      (
        goal:
          any
      ) => {
        const title =
          String(
            goal?.title ??
              ''
          ).trim();

        if (!title) {
          return false;
        }

        if (
          completedToday(
            goal,
            todayKey,
            todayIndex
          )
        ) {
          return false;
        }

        const selectedDays =
          normalizeSelectedDays(
            goal
          );

        const repeatType =
          goal?.repeatType ===
            'weekdays' ||
          (
            !goal?.repeatType &&
            selectedDays.length >
              0
          )
            ? 'weekdays'
            : 'weeklyCount';

        if (
          repeatType ===
          'weekdays'
        ) {
          return selectedDays.includes(
            todayIndex
          );
        }

        const targetCount =
          Math.min(
            7,
            Math.max(
              1,
              Number(
                goal?.weeklyCount ??
                  1
              ) ||
                1
            )
          );

        if (
          weeklyCompletionCount(
            goal,
            week.start,
            week.end
          ) >=
          targetCount
        ) {
          return false;
        }

        return true;
      }
    )
    .map(
      (
        goal:
          any
      ) => ({
        id:
          String(
            goal?.id ??
              ''
          )
            .trim()
            .slice(
              0,
              80
            ),
        title:
          String(
            goal?.title ??
              ''
          )
            .trim()
            .slice(
              0,
              60
            ),
      })
    )
    .filter(
      (
        goal
      ) =>
        goal.id.length >
          0 &&
        goal.title.length >
          0
    )
    .slice(
      0,
      8
    );
}

export async function syncFloatingCharacterGoals(
  actionGoals:
    any[]
):
  Promise<number> {
  const snapshot =
    buildFloatingCharacterGoalSnapshot(
      actionGoals
    );

  return setFloatingCharacterGoalSnapshot(
    snapshot
  );
}
