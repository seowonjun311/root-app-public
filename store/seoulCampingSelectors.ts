import {
  SEOUL_CAMPING_FACILITIES,
  type SeoulCampingFacility,
  type SeoulCampingReservation,
} from './seoulCampingFacilities';

export type SeoulCampingStatus =
  | 'open'
  | 'upcoming'
  | 'closed'
  | 'cancelled'
  | 'unknown';

export type SeoulCampingFacilitySummary = {
  facility:
    SeoulCampingFacility;
  primaryReservation:
    SeoulCampingReservation | null;
  primaryStatus:
    SeoulCampingStatus;
  openCount: number;
  upcomingCount: number;
  closedCount: number;
};

function parseCampingDate(
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

export function getCampingReservationStatus(
  reservation:
    SeoulCampingReservation,
  now = new Date()
): SeoulCampingStatus {
  const statusText =
    reservation.statusText.trim();

  if (
    statusText.includes('접수중')
  ) {
    return 'open';
  }

  if (
    statusText.includes('안내중')
  ) {
    return 'upcoming';
  }

  if (
    statusText.includes('취소')
  ) {
    return 'cancelled';
  }

  if (
    statusText.includes('마감') ||
    statusText.includes('종료') ||
    statusText.includes(
      '예약일시중지'
    )
  ) {
    return 'closed';
  }

  const receptionStart =
    parseCampingDate(
      reservation.receptionStartAt
    );

  const receptionEnd =
    parseCampingDate(
      reservation.receptionEndAt
    );

  if (
    receptionStart &&
    now.getTime() <
      receptionStart.getTime()
  ) {
    return 'upcoming';
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

export function getCampingStatusLabel(
  status:
    SeoulCampingStatus
) {
  if (status === 'open') {
    return '접수 중';
  }

  if (status === 'upcoming') {
    return '접수 예정';
  }

  if (status === 'closed') {
    return '예약 마감';
  }

  if (status === 'cancelled') {
    return '예약 취소';
  }

  return '상태 확인';
}

function getCampingStatusRank(
  status:
    SeoulCampingStatus
) {
  if (status === 'open') {
    return 0;
  }

  if (status === 'upcoming') {
    return 1;
  }

  if (status === 'unknown') {
    return 2;
  }

  if (status === 'closed') {
    return 3;
  }

  return 4;
}

export function getPrimaryCampingReservation(
  facility:
    SeoulCampingFacility,
  now = new Date()
) {
  const reservations =
    [...facility.reservations]
      .sort(
        (first, second) => {
          const statusDifference =
            getCampingStatusRank(
              getCampingReservationStatus(
                first,
                now
              )
            ) -
            getCampingStatusRank(
              getCampingReservationStatus(
                second,
                now
              )
            );

          if (
            statusDifference !== 0
          ) {
            return statusDifference;
          }

          return first.title.localeCompare(
            second.title,
            'ko'
          );
        }
      );

  return (
    reservations[0] ??
    null
  );
}

export function getCampingFacilitySummary(
  facility:
    SeoulCampingFacility,
  now = new Date()
): SeoulCampingFacilitySummary {
  let openCount = 0;
  let upcomingCount = 0;
  let closedCount = 0;

  for (
    const reservation of
      facility.reservations
  ) {
    const status =
      getCampingReservationStatus(
        reservation,
        now
      );

    if (status === 'open') {
      openCount += 1;
    }

    if (status === 'upcoming') {
      upcomingCount += 1;
    }

    if (
      status === 'closed' ||
      status === 'cancelled'
    ) {
      closedCount += 1;
    }
  }

  const primaryReservation =
    getPrimaryCampingReservation(
      facility,
      now
    );

  const primaryStatus =
    primaryReservation
      ? getCampingReservationStatus(
          primaryReservation,
          now
        )
      : 'unknown';

  return {
    facility,
    primaryReservation,
    primaryStatus,
    openCount,
    upcomingCount,
    closedCount,
  };
}

export function getCampingFacilitySummaries(
  now = new Date()
) {
  return SEOUL_CAMPING_FACILITIES
    .map(
      (facility) =>
        getCampingFacilitySummary(
          facility,
          now
        )
    )
    .sort(
      (first, second) => {
        const statusDifference =
          getCampingStatusRank(
            first.primaryStatus
          ) -
          getCampingStatusRank(
            second.primaryStatus
          );

        if (
          statusDifference !== 0
        ) {
          return statusDifference;
        }

        const locationDifference =
          first.facility.locationLabel.localeCompare(
            second.facility.locationLabel,
            'ko'
          );

        if (
          locationDifference !== 0
        ) {
          return locationDifference;
        }

        return first.facility.name.localeCompare(
          second.facility.name,
          'ko'
        );
      }
    );
}

export function getInsideSeoulCampingSummaries(
  now = new Date()
) {
  return getCampingFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.operationScope ===
      'insideSeoul'
  );
}

export function getSeoulOperatedOutsideCampingSummaries(
  now = new Date()
) {
  return getCampingFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.operationScope ===
      'seoulOperatedOutside'
  );
}

export function getCampingSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getInsideSeoulCampingSummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.district ===
      normalizedDistrict
  );
}
