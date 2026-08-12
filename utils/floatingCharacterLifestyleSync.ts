import {
  setFloatingCharacterLifestyleContextSnapshot,
} from '../modules/root-floating-character';

// CHARACTER_V101G_FLOATING_SPENDING_CONTEXT_SYNC

type LedgerLikeItem = {
  type?: string;
  amount?: number | string;
  cancelled?: boolean;
};

function formatDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
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

function formatMonthKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}`;
}

function getFixedDailyBudget(
  monthBudget: number,
  date: Date
) {
  if (
    !Number.isFinite(
      monthBudget
    ) ||
    monthBudget <=
      0
  ) {
    return 0;
  }

  const daysInMonth =
    new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    ).getDate();

  const baseAmount =
    Math.floor(
      monthBudget /
        daysInMonth
    );

  const remainder =
    monthBudget -
    baseAmount *
      daysInMonth;

  return (
    baseAmount +
    (
      date.getDate() <=
        remainder
        ? 1
        : 0
    )
  );
}

function sumActiveExpenses(
  items:
    LedgerLikeItem[]
) {
  return (
    Array.isArray(
      items
    )
      ? items
      : []
  )
    .filter(
      item =>
        item?.type ===
          'expense' &&
        !item?.cancelled
    )
    .reduce(
      (
        sum,
        item
      ) => {
        const amount =
          Number(
            item?.amount ??
              0
          );

        return (
          sum +
          (
            Number.isFinite(
              amount
            ) &&
            amount >
              0
              ? amount
              : 0
          )
        );
      },
      0
    );
}

export function buildFloatingCharacterSpendingContext(
  ledgers:
    Record<
      string,
      LedgerLikeItem[]
    >,
  ledgerBudgets:
    Record<
      string,
      number
    >,
  now =
    new Date()
) {
  const dateKey =
    formatDateKey(
      now
    );

  const monthKey =
    formatMonthKey(
      now
    );

  const safeLedgers =
    ledgers &&
    typeof ledgers ===
      'object'
      ? ledgers
      : {};

  const safeBudgets =
    ledgerBudgets &&
    typeof ledgerBudgets ===
      'object'
      ? ledgerBudgets
      : {};

  const monthBudget =
    Math.max(
      0,
      Number(
        safeBudgets[
          monthKey
        ] ??
          0
      ) ||
        0
    );

  const todayExpense =
    sumActiveExpenses(
      safeLedgers[
        dateKey
      ] ??
        []
    );

  const monthExpense =
    Object.entries(
      safeLedgers
    )
      .filter(
        ([
          key,
        ]) =>
          key.startsWith(
            monthKey
          )
      )
      .reduce(
        (
          sum,
          [
            ,
            items,
          ]
        ) =>
          sum +
          sumActiveExpenses(
            items
          ),
        0
      );

  return {
    dateKey,
    todayExpense,
    dailyBudget:
      getFixedDailyBudget(
        monthBudget,
        now
      ),
    monthExpense,
    monthBudget,
  };
}

export async function syncFloatingCharacterSpendingContext(
  ledgers:
    Record<
      string,
      LedgerLikeItem[]
    >,
  ledgerBudgets:
    Record<
      string,
      number
    >
): Promise<boolean> {
  return setFloatingCharacterLifestyleContextSnapshot(
    buildFloatingCharacterSpendingContext(
      ledgers,
      ledgerBudgets
    )
  );
}

export type FloatingCharacterRootyStateContext = {
  mood: number;
  energy: number;
  affection: number;
};

function clampStateValue(
  value: number
) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number.isFinite(
          value
        )
          ? value
          : 50
      )
    )
  );
}

// CHARACTER_V101H_ROOTY_STATE_CONTEXT_SYNC
export async function syncFloatingCharacterRootyStateContext(
  state:
    FloatingCharacterRootyStateContext
): Promise<boolean> {
  return setFloatingCharacterLifestyleContextSnapshot({
    dateKey:
      formatDateKey(
        new Date()
      ),
    mood:
      clampStateValue(
        state.mood
      ),
    energy:
      clampStateValue(
        state.energy
      ),
    affection:
      clampStateValue(
        state.affection
      ),
  });
}
