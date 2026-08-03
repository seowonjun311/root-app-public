import {
  SEOUL_SPORTS_FACILITIES,
  type SeoulSportsFacility,
  type SeoulSportsReservation,
} from './seoulSportsFacilities';

export type RootSportsReservationStatus =
  | 'open'
  | 'scheduled'
  | 'closed'
  | 'unknown';

export type SeoulSportsFacilitySummary = {
  facility: SeoulSportsFacility;
  primaryReservation:
    SeoulSportsReservation | null;
  status:
    RootSportsReservationStatus;
  statusLabel: string;
  openReservationCount: number;
  scheduledReservationCount: number;
};

function parseSeoulSportsDate(
  value: string | null
) {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    !Number.isFinite(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

export function getSportsReservationStatus(
  reservation:
    SeoulSportsReservation,
  now = new Date()
): RootSportsReservationStatus {
  const statusText =
    reservation.statusText.trim();

  if (
    statusText.includes('접수중')
  ) {
    return 'open';
  }

  if (
    statusText.includes('접수예정') ||
    statusText.includes('안내중')
  ) {
    return 'scheduled';
  }

  if (
    statusText.includes('마감') ||
    statusText.includes('종료')
  ) {
    return 'closed';
  }

  const receptionStart =
    parseSeoulSportsDate(
      reservation.receptionStartAt
    );

  const receptionEnd =
    parseSeoulSportsDate(
      reservation.receptionEndAt
    );

  if (
    receptionStart &&
    now.getTime() <
      receptionStart.getTime()
  ) {
    return 'scheduled';
  }

  if (
    receptionStart &&
    receptionEnd &&
    now.getTime() >=
      receptionStart.getTime() &&
    now.getTime() <=
      receptionEnd.getTime()
  ) {
    return 'open';
  }

  if (
    receptionEnd &&
    now.getTime() >
      receptionEnd.getTime()
  ) {
    return 'closed';
  }

  return 'unknown';
}

export function getSportsStatusLabel(
  status:
    RootSportsReservationStatus
) {
  if (status === 'open') {
    return '접수 중';
  }

  if (status === 'scheduled') {
    return '접수 예정';
  }

  if (status === 'closed') {
    return '예약 마감';
  }

  return '상태 확인';
}

function getReservationSortRank(
  status:
    RootSportsReservationStatus
) {
  if (status === 'open') {
    return 0;
  }

  if (status === 'scheduled') {
    return 1;
  }

  if (status === 'unknown') {
    return 2;
  }

  return 3;
}

export function getPrimarySportsReservation(
  facility:
    SeoulSportsFacility,
  now = new Date()
) {
  const sorted =
    [...facility.reservations].sort(
      (first, second) => {
        const firstStatus =
          getSportsReservationStatus(
            first,
            now
          );

        const secondStatus =
          getSportsReservationStatus(
            second,
            now
          );

        const rankDifference =
          getReservationSortRank(
            firstStatus
          ) -
          getReservationSortRank(
            secondStatus
          );

        if (
          rankDifference !== 0
        ) {
          return rankDifference;
        }

        return first.title.localeCompare(
          second.title,
          'ko'
        );
      }
    );

  return sorted[0] ?? null;
}

export function getSportsFacilitySummary(
  facility:
    SeoulSportsFacility,
  now = new Date()
): SeoulSportsFacilitySummary {
  let openReservationCount = 0;
  let scheduledReservationCount = 0;

  for (
    const reservation of
      facility.reservations
  ) {
    const status =
      getSportsReservationStatus(
        reservation,
        now
      );

    if (status === 'open') {
      openReservationCount += 1;
    }

    if (
      status === 'scheduled'
    ) {
      scheduledReservationCount += 1;
    }
  }

  const primaryReservation =
    getPrimarySportsReservation(
      facility,
      now
    );

  const status =
    primaryReservation
      ? getSportsReservationStatus(
          primaryReservation,
          now
        )
      : 'unknown';

  return {
    facility,
    primaryReservation,
    status,
    statusLabel:
      getSportsStatusLabel(status),
    openReservationCount,
    scheduledReservationCount,
  };
}

export function getSportsFacilitySummaries(
  now = new Date()
) {
  return SEOUL_SPORTS_FACILITIES
    .map((facility) =>
      getSportsFacilitySummary(
        facility,
        now
      )
    )
    .sort((first, second) => {
      const statusOrder = {
        open: 0,
        scheduled: 1,
        unknown: 2,
        closed: 3,
      } as const;

      const statusDifference =
        statusOrder[first.status] -
        statusOrder[second.status];

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      return first.facility.name.localeCompare(
        second.facility.name,
        'ko'
      );
    });
}

export function getInsideSeoulSportsSummaries(
  now = new Date()
) {
  return getSportsFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.locationType ===
      'insideSeoul'
  );
}

export function getSeoulOperatedOutsideSportsSummaries(
  now = new Date()
) {
  return getSportsFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.locationType ===
      'seoulOperatedOutside'
  );
}

export function getSportsSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getInsideSeoulSportsSummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.district ===
      normalizedDistrict
  );
}
