import type {
  LatLng,
} from 'react-native-maps';

export type FacilityKind =
  | 'camping'
  | 'sports'
  | 'space'
  | 'education';

export type FacilityListItem = {
  id: string;
  kind: FacilityKind;
  name: string;
  icon: string;
  district: string;
  categoryLabel: string;
  statusLabel: string;
  reservationCount: number;
  receptionText: string;
  paidType: string;
  primaryTitle: string;
  reservationUrl: string;
};

export type FacilityReservationItem = {
  id: string;
  title: string;
  statusText: string;
  paidType: string;
  targetText: string;
  receptionText: string;
  useText: string;
  telephone: string;
  url: string;
};

export type FacilityDetailData = {
  kind: FacilityKind;
  facilityId: string;
  name: string;
  icon: string;
  district: string;
  locationLabel: string;
  categoryLabel: string;
  statusLabel: string;
  reservationCount: number;
  itemLabel: string;
  coordinate: LatLng | null;
  officialUrl: string;
  reservations: FacilityReservationItem[];
};

export function getParam(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return String(
      value[0] ?? ''
    ).trim();
  }

  return String(
    value ?? ''
  ).trim();
}

export function getText(
  value: unknown
) {
  return String(
    value ?? ''
  ).trim();
}

export function getFirstText(
  source: any,
  keys: readonly string[]
) {
  for (const key of keys) {
    const value =
      getText(
        source?.[key]
      );

    if (value) {
      return value;
    }
  }

  return '';
}

export function getNumber(
  value: unknown
) {
  const result =
    Number(value);

  return Number.isFinite(
    result
  )
    ? result
    : null;
}

export function normalizeDistrictName(
  value: string
) {
  return value
    .replace(/서울특별시/g, '')
    .replace(/서울시/g, '')
    .replace(/\s+/g, '')
    .trim();
}

export function matchesDistrict(
  value: unknown,
  districtName: string
) {
  const target =
    normalizeDistrictName(
      districtName
    );

  if (!target) {
    return true;
  }

  return (
    normalizeDistrictName(
      getText(value)
    ) === target
  );
}

export function formatDateTime(
  value: unknown
) {
  const text =
    getText(value);

  if (!text) {
    return '';
  }

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/
  );

  if (!match) {
    return text;
  }

  const dateLabel =
    `${match[1]}.${Number(
      match[2]
    )}.${Number(
      match[3]
    )}`;

  if (
    !match[4] ||
    !match[5]
  ) {
    return dateLabel;
  }

  return `${dateLabel} ${match[4]}:${match[5]}`;
}

export function formatRange(
  startValue: unknown,
  endValue: unknown,
  emptyLabel: string
) {
  const start =
    formatDateTime(
      startValue
    );
  const end =
    formatDateTime(
      endValue
    );

  if (start && end) {
    return `${start} ~ ${end}`;
  }

  if (start) {
    return `${start}부터`;
  }

  if (end) {
    return `${end}까지`;
  }

  return emptyLabel;
}

export function formatReception(
  startValue: unknown,
  endValue: unknown
) {
  const start =
    formatShortDate(
      startValue
    );
  const end =
    formatShortDate(
      endValue
    );

  if (start && end) {
    return `접수 ${start}~${end}`;
  }

  if (start) {
    return `접수 ${start}부터`;
  }

  if (end) {
    return `접수 ${end}까지`;
  }

  return '예약 일정 확인';
}

function formatShortDate(
  value: unknown
) {
  const match =
    getText(value).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (!match) {
    return '';
  }

  return `${Number(
    match[2]
  )}.${Number(
    match[3]
  )}`;
}

export function getCoordinate(
  source: any
): LatLng | null {
  const latitude =
    getNumber(
      source?.latitude
    );
  const longitude =
    getNumber(
      source?.longitude
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

export function normalizeReservations(
  values: unknown,
  ownerId: string,
  fallbackUrl: string
): FacilityReservationItem[] {
  const reservations =
    Array.isArray(values)
      ? values
      : [];

  return reservations.map(
    (
      reservation: any,
      index: number
    ): FacilityReservationItem => ({
      id:
        getFirstText(
          reservation,
          [
            'serviceId',
            'reservationId',
            'programId',
            'id',
          ]
        ) ||
        `${ownerId}-${index}`,

      title:
        getFirstText(
          reservation,
          [
            'title',
            'serviceName',
            'name',
          ]
        ) || '예약상품',

      statusText:
        getFirstText(
          reservation,
          [
            'statusText',
            'statusLabel',
            'serviceStatusText',
            'serviceStatus',
          ]
        ) || '예약 상태 확인',

      paidType:
        getFirstText(
          reservation,
          [
            'paidType',
            'feeType',
          ]
        ) || '요금 확인',

      targetText:
        getFirstText(
          reservation,
          [
            'targetText',
            'useTargetText',
            'useTargetInfo',
            'targetInfo',
          ]
        ),

      receptionText:
        formatRange(
          reservation
            ?.receptionStartAt,
          reservation
            ?.receptionEndAt,
          '접수 일정 확인'
        ),

      useText:
        formatRange(
          reservation?.useStartAt,
          reservation?.useEndAt,
          '이용 일정 확인'
        ),

      telephone:
        getFirstText(
          reservation,
          [
            'telephone',
            'phone',
            'tel',
          ]
        ),

      url:
        getFirstText(
          reservation,
          [
            'reservationUrl',
            'serviceUrl',
            'officialUrl',
          ]
        ) || fallbackUrl,
    })
  );
}

export function getSportsIcon(
  category: string
) {
  if (
    category.includes(
      '테니스'
    )
  ) {
    return '🎾';
  }

  if (
    category.includes('축구') ||
    category.includes('풋살')
  ) {
    return '⚽';
  }

  if (
    category.includes('야구')
  ) {
    return '⚾';
  }

  if (
    category.includes('농구')
  ) {
    return '🏀';
  }

  if (
    category.includes('배구')
  ) {
    return '🏐';
  }

  if (
    category.includes(
      '배드민턴'
    ) ||
    category.includes(
      '피클볼'
    )
  ) {
    return '🏸';
  }

  if (
    category.includes('탁구')
  ) {
    return '🏓';
  }

  if (
    category.includes('수영')
  ) {
    return '🏊';
  }

  if (
    category.includes('골프')
  ) {
    return '⛳';
  }

  return '🏟️';
}

export function getSpaceIcon(
  kind: string
) {
  if (kind === 'meetingRoom') {
    return '🗣️';
  }

  if (kind === 'lectureRoom') {
    return '🧑‍🏫';
  }

  if (kind === 'hall') {
    return '🏛️';
  }

  if (kind === 'multipurpose') {
    return '🧩';
  }

  if (kind === 'performance') {
    return '🎭';
  }

  if (kind === 'exhibition') {
    return '🖼️';
  }

  if (kind === 'studio') {
    return '🎙️';
  }

  if (kind === 'plaza') {
    return '🏙️';
  }

  if (kind === 'community') {
    return '🤝';
  }

  return '🏢';
}

export function getEducationIcon(
  category: string
) {
  if (category === 'craftMaking') {
    return '🎨';
  }

  if (category === 'cookingFood') {
    return '🍳';
  }

  if (
    category === 'natureEnvironment' ||
    category === 'urbanAgriculture'
  ) {
    return '🌿';
  }

  if (category === 'historyCulture') {
    return '🏛️';
  }

  if (category === 'scienceDigital') {
    return '🔬';
  }

  if (
    category === 'healthSportsSafety'
  ) {
    return '🧘';
  }

  if (category === 'careerYouth') {
    return '💼';
  }

  if (
    category === 'liberalArtsLanguage'
  ) {
    return '📚';
  }

  return '🧑‍🏫';
}
