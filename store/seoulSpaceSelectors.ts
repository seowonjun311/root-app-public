import {
  SEOUL_SPACE_FACILITIES,
  type SeoulSpaceFacility,
  type SeoulSpaceKind,
  type SeoulSpaceReservation,
} from './seoulSpaceFacilities';

export type RootSpaceReservationStatus =
  | 'open'
  | 'scheduled'
  | 'closed'
  | 'unknown';

export type SeoulSpaceFacilitySummary = {
  facility: SeoulSpaceFacility;
  primaryReservation:
    SeoulSpaceReservation | null;
  status:
    RootSpaceReservationStatus;
  statusLabel: string;
  openReservationCount: number;
  scheduledReservationCount: number;
};

function parseSpaceDate(
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

export function getSpaceReservationStatus(
  reservation:
    SeoulSpaceReservation,
  now = new Date()
): RootSpaceReservationStatus {
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
    statusText.includes('종료') ||
    statusText.includes('취소')
  ) {
    return 'closed';
  }

  const receptionStart =
    parseSpaceDate(
      reservation.receptionStartAt
    );

  const receptionEnd =
    parseSpaceDate(
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

export function getSpaceStatusLabel(
  status:
    RootSpaceReservationStatus
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

export function getSpaceKindLabel(
  kind: SeoulSpaceKind
) {
  if (kind === 'meetingRoom') {
    return '회의·세미나실';
  }

  if (kind === 'lectureRoom') {
    return '강의실';
  }

  if (kind === 'hall') {
    return '강당';
  }

  if (kind === 'multipurpose') {
    return '다목적실';
  }

  if (kind === 'performance') {
    return '공연공간';
  }

  if (kind === 'exhibition') {
    return '전시공간';
  }

  if (kind === 'studio') {
    return '연습·창작공간';
  }

  if (kind === 'plaza') {
    return '광장·야외공간';
  }

  if (kind === 'community') {
    return '주민·공유공간';
  }

  return '기타 공간';
}

function getStatusRank(
  status:
    RootSpaceReservationStatus
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

export function getPrimarySpaceReservation(
  facility:
    SeoulSpaceFacility,
  now = new Date()
) {
  const sorted =
    [...facility.reservations].sort(
      (first, second) => {
        const firstStatus =
          getSpaceReservationStatus(
            first,
            now
          );

        const secondStatus =
          getSpaceReservationStatus(
            second,
            now
          );

        const statusDifference =
          getStatusRank(
            firstStatus
          ) -
          getStatusRank(
            secondStatus
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

  return sorted[0] ?? null;
}

export function getSpaceFacilitySummary(
  facility:
    SeoulSpaceFacility,
  now = new Date()
): SeoulSpaceFacilitySummary {
  let openReservationCount = 0;
  let scheduledReservationCount = 0;

  for (
    const reservation of
      facility.reservations
  ) {
    const status =
      getSpaceReservationStatus(
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
    getPrimarySpaceReservation(
      facility,
      now
    );

  const status =
    primaryReservation
      ? getSpaceReservationStatus(
          primaryReservation,
          now
        )
      : 'unknown';

  return {
    facility,
    primaryReservation,
    status,
    statusLabel:
      getSpaceStatusLabel(status),
    openReservationCount,
    scheduledReservationCount,
  };
}

export function getSpaceFacilitySummaries(
  now = new Date()
) {
  return SEOUL_SPACE_FACILITIES
    .map((facility) =>
      getSpaceFacilitySummary(
        facility,
        now
      )
    )
    .sort((first, second) => {
      const statusDifference =
        getStatusRank(
          first.status
        ) -
        getStatusRank(
          second.status
        );

      if (
        statusDifference !== 0
      ) {
        return statusDifference;
      }

      const districtDifference =
        first.facility.district.localeCompare(
          second.facility.district,
          'ko'
        );

      if (
        districtDifference !== 0
      ) {
        return districtDifference;
      }

      return first.facility.name.localeCompare(
        second.facility.name,
        'ko'
      );
    });
}

export function getSpaceSummariesByDistrict(
  district: string,
  now = new Date()
) {
  const normalizedDistrict =
    district.trim();

  return getSpaceFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.district ===
      normalizedDistrict
  );
}

export function getSpaceSummariesByKind(
  kind: SeoulSpaceKind,
  now = new Date()
) {
  return getSpaceFacilitySummaries(
    now
  ).filter(
    (summary) =>
      summary.facility.spaceKind ===
      kind
  );
}
