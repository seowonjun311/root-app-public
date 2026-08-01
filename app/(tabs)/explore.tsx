import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  G,
  Polygon,
  Path as SvgPath,
  Text as SvgText,
} from 'react-native-svg';

import {
  EXPLORATION_DISTRICTS,
  EXPLORATION_PLACE_CATALOG,
  EXPLORATION_REWARD_NAMES,
  EXPLORATION_THEME_BADGE_DESCRIPTIONS,
  EXPLORATION_THEME_BADGE_NAMES,
  EXPLORATION_THEME_CATALOG,
  getExplorationDistrict,
  getExplorationPlacesByDistrict,
  getExplorationThemesByDistrict,
} from '../../store/explorationCatalog';
import {
  loadLocalExplorationData,
  setExplorationMainBadge,
  syncExplorationData,
  type RootExplorationData,
} from '../../store/explorationCloud';
import {
  FESTIVAL_AUDIENCE_LABELS,
  FESTIVAL_CATALOG,
  FESTIVAL_SCALE_LABELS,
  getFestivalAudienceLabels,
  getFestivalAudiences,
  getFestivalContentTypeLabel,
  getFestivalScheduleLabel,
  getFestivalsByDistrict,
  getFestivalsByRegion,
  type FestivalAudience,
  type FestivalDefinition,
  type FestivalRegionId,
} from '../../store/festivalCatalog';
import { useRootTheme } from '../../store/rootTheme';
import {
  fetchSeoulCultureEvents,
  formatSeoulCultureDateLabel,
  getSeoulCultureReservationLabel,
  getSeoulCultureTypeIcon,
  getSeoulCultureTypeLabel,
  getSeoulCultureVenueTypeLabel,
  type SeoulCultureContentType,
  type SeoulCultureEvent,
} from '../../store/seoulCultureEvents';


const EXPLORATION_BADGE_NOTICE_KEY =
  'root_exploration_badge_notice_v1';

type NationalFestivalRegionFilter =
  | 'all'
  | FestivalRegionId;

type NationalFestivalAudienceFilter =
  | 'all'
  | FestivalAudience;

const NATIONAL_FESTIVAL_AUDIENCE_FILTERS: readonly {
  id: NationalFestivalAudienceFilter;
  label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'children', label: '아이와' },
  { id: 'teen', label: '청소년' },
  { id: 'adult', label: '성인' },
  { id: 'middleAge', label: '중장년' },
  { id: 'family', label: '가족' },
];

function doesFestivalMatchAudience(
  festival: FestivalDefinition,
  audienceFilter: NationalFestivalAudienceFilter
) {
  if (audienceFilter === 'all') {
    return true;
  }

  return getFestivalAudiences(
    festival
  ).includes(audienceFilter);
}

type SeoulCulturePeriodFilter =
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'nextMonth';

type SeoulCultureTypeFilter =
  | 'all'
  | SeoulCultureContentType;

type SeoulCultureConditionFilter =
  | 'all'
  | 'free'
  | 'paid'
  | 'reservation';

const SEOUL_CULTURE_PERIOD_FILTERS: readonly {
  id: SeoulCulturePeriodFilter;
  label: string;
}[] = [
  { id: 'today', label: '오늘' },
  { id: 'thisWeek', label: '이번 주' },
  { id: 'thisMonth', label: '이번 달' },
  { id: 'nextMonth', label: '다음 달' },
];

const SEOUL_CULTURE_TYPE_FILTERS: readonly {
  id: SeoulCultureTypeFilter;
  label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'performance', label: '공연' },
  { id: 'exhibition', label: '규모 전시' },
  { id: 'festival', label: '축제' },
  { id: 'experience', label: '교육·체험' },
  { id: 'other', label: '기타' },
];

const SEOUL_CULTURE_CONDITION_FILTERS: readonly {
  id: SeoulCultureConditionFilter;
  label: string;
}[] = [
  { id: 'all', label: '전체 조건' },
  { id: 'free', label: '무료' },
  { id: 'paid', label: '유료' },
  { id: 'reservation', label: '예약·신청' },
];

type NationalFestivalPeriodFilter =
  | 'thisWeek'
  | 'thisMonth'
  | 'nextWeek'
  | `month-${number}-${number}`;

type NationalFestivalPeriodOption = {
  id: NationalFestivalPeriodFilter;
  label: string;
  targetYear?: number;
  targetMonth?: number;
};

function getNationalFestivalPeriodFilters(
  now: Date
): NationalFestivalPeriodOption[] {
  const options: NationalFestivalPeriodOption[] = [
    {
      id: 'thisWeek',
      label: '이번 주',
    },
    {
      id: 'thisMonth',
      label: '이번 달',
    },
    {
      id: 'nextWeek',
      label: '다음 주',
    },
  ];

  for (let offset = 1; offset <= 12; offset += 1) {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth() + offset,
      1
    );

    const targetYear =
      targetDate.getFullYear();
    const targetMonth =
      targetDate.getMonth() + 1;

    options.push({
      id:
        `month-${targetYear}-${targetMonth}` as
          NationalFestivalPeriodFilter,
      label:
        targetYear === now.getFullYear()
          ? `${targetMonth}월`
          : `${String(targetYear).slice(-2)}년 ${targetMonth}월`,
      targetYear,
      targetMonth,
    });
  }

  return options;
}

const NATIONAL_FESTIVAL_REGION_FILTERS: readonly {
  id: NationalFestivalRegionFilter;
  label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'seoul', label: '서울' },
  { id: 'gyeonggi', label: '경기' },
  { id: 'incheon', label: '인천' },
  { id: 'busan', label: '부산' },
  { id: 'gangwon', label: '강원' },
  { id: 'daegu', label: '대구' },
  { id: 'daejeon', label: '대전' },
  { id: 'gwangju', label: '광주' },
  { id: 'ulsan', label: '울산' },
  { id: 'sejong', label: '세종' },
  { id: 'chungbuk', label: '충북' },
  { id: 'chungnam', label: '충남' },
  { id: 'jeonbuk', label: '전북' },
  { id: 'jeonnam', label: '전남' },
  { id: 'gyeongbuk', label: '경북' },
  { id: 'gyeongnam', label: '경남' },
  { id: 'jeju', label: '제주' },
];

const FESTIVAL_SCALE_SORT_ORDER = {
  mega: 0,
  emerging: 1,
  major: 2,
  regional: 3,
} as const;

function getUpcomingFestivalDistance(
  festival: FestivalDefinition,
  now: Date
) {
  if (festival.scheduleStatus === 'cancelled') {
    return Number.MAX_SAFE_INTEGER;
  }

  const nowDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  if (festival.exactStartDate) {
    const exactStart =
      getLocalDateFromIso(
        festival.exactStartDate
      );

    const exactEnd =
      getLocalDateFromIso(
        festival.exactEndDate
      ) ?? exactStart;

    if (exactStart && exactEnd) {
      const startTime =
        getStartOfDay(exactStart).getTime();
      const endTime =
        getEndOfDay(exactEnd).getTime();
      const nowTime = nowDate.getTime();

      if (
        nowTime >= startTime &&
        nowTime <= endTime
      ) {
        return -1;
      }

      if (nowTime < startTime) {
        return startTime - nowTime;
      }

      return Number.MAX_SAFE_INTEGER - 1;
    }
  }

  let startMonth = festival.usualStartMonth;
  let startDay = 1;

  const isApproximateCurrentMonth =
    !festival.exactStartDate &&
    startMonth === nowDate.getMonth() + 1;

  if (isApproximateCurrentMonth) {
    return 0;
  }

  let candidate = new Date(
    nowDate.getFullYear(),
    Math.max(0, Math.min(11, startMonth - 1)),
    Math.max(1, Math.min(31, startDay))
  );

  if (candidate.getTime() < nowDate.getTime()) {
    const yearStep =
      festival.recurrenceType === 'biennial'
        ? 2
        : 1;

    candidate = new Date(
      nowDate.getFullYear() + yearStep,
      Math.max(0, Math.min(11, startMonth - 1)),
      Math.max(1, Math.min(31, startDay))
    );
  }

  return candidate.getTime() - nowDate.getTime();
}

function sortUpcomingFestivals(
  festivals: readonly FestivalDefinition[]
) {
  const now = new Date();

  return [...festivals].sort(
    (first, second) => {
      const distanceDifference =
        getUpcomingFestivalDistance(first, now) -
        getUpcomingFestivalDistance(second, now);

      if (distanceDifference !== 0) {
        return distanceDifference;
      }

      if (first.emerging !== second.emerging) {
        return first.emerging ? -1 : 1;
      }

      const scaleDifference =
        FESTIVAL_SCALE_SORT_ORDER[first.scale] -
        FESTIVAL_SCALE_SORT_ORDER[second.scale];

      if (scaleDifference !== 0) {
        return scaleDifference;
      }

      const regionDifference =
        first.regionName.localeCompare(
          second.regionName,
          'ko'
        );

      if (regionDifference !== 0) {
        return regionDifference;
      }

      return first.name.localeCompare(
        second.name,
        'ko'
      );
    }
  );
}


function getLocalDateFromIso(
  value: string | null
) {
  if (!value) {
    return null;
  }

  const parts = value
    .split('-')
    .map((item) => Number(item));

  if (
    parts.length !== 3 ||
    !Number.isFinite(parts[0]) ||
    !Number.isFinite(parts[1]) ||
    !Number.isFinite(parts[2])
  ) {
    return null;
  }

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );
}

function getStartOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate()
  );
}

function getEndOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999
  );
}

function getThisWeekRange(now: Date) {
  const today = getStartOfDay(now);
  const mondayOffset =
    (today.getDay() + 6) % 7;

  const start = new Date(today);
  start.setDate(
    today.getDate() - mondayOffset
  );

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start,
    end: getEndOfDay(end),
  };
}

function getNextWeekRange(now: Date) {
  const thisWeek = getThisWeekRange(now);

  const start = new Date(
    thisWeek.start
  );
  start.setDate(
    start.getDate() + 7
  );

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start,
    end: getEndOfDay(end),
  };
}

function getMonthRange(
  now: Date,
  monthOffset: number
) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth() + monthOffset,
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + monthOffset + 1,
    0,
    23,
    59,
    59,
    999
  );

  return {
    start,
    end,
  };
}

function doesFestivalExactDateOverlap(
  festival: FestivalDefinition,
  rangeStart: Date,
  rangeEnd: Date
) {
  const exactStart =
    getLocalDateFromIso(
      festival.exactStartDate
    );

  if (!exactStart) {
    return false;
  }

  const exactEnd =
    getLocalDateFromIso(
      festival.exactEndDate
    ) ?? exactStart;

  return (
    getEndOfDay(exactEnd).getTime() >=
      rangeStart.getTime() &&
    getStartOfDay(exactStart).getTime() <=
      rangeEnd.getTime()
  );
}

function doesUsualMonthInclude(
  festival: FestivalDefinition,
  month: number
) {
  const startMonth =
    festival.usualStartMonth;
  const endMonth =
    festival.usualEndMonth;

  if (startMonth <= endMonth) {
    return (
      month >= startMonth &&
      month <= endMonth
    );
  }

  return (
    month >= startMonth ||
    month <= endMonth
  );
}

function filterFestivalsByPeriod(
  festivals: readonly FestivalDefinition[],
  period: NationalFestivalPeriodFilter
) {
  const availableFestivals =
    festivals.filter(
      (festival) =>
        festival.scheduleStatus !==
        'cancelled'
    );

  const now = new Date();

  if (
    period === 'thisWeek' ||
    period === 'nextWeek'
  ) {
    const range =
      period === 'thisWeek'
        ? getThisWeekRange(now)
        : getNextWeekRange(now);

    return sortUpcomingFestivals(
      availableFestivals.filter(
        (festival) =>
          doesFestivalExactDateOverlap(
            festival,
            range.start,
            range.end
          )
      )
    );
  }

  let targetYear =
    now.getFullYear();
  let targetMonth =
    now.getMonth() + 1;

  if (period.startsWith('month-')) {
    const parts =
      period
        .split('-')
        .map((value) => Number(value));

    if (
      parts.length === 3 &&
      Number.isFinite(parts[1]) &&
      Number.isFinite(parts[2])
    ) {
      targetYear = parts[1];
      targetMonth = parts[2];
    }
  }

  const rangeStart = new Date(
    targetYear,
    targetMonth - 1,
    1
  );

  const rangeEnd = new Date(
    targetYear,
    targetMonth,
    0,
    23,
    59,
    59,
    999
  );

  return sortUpcomingFestivals(
    availableFestivals.filter(
      (festival) => {
        if (festival.exactStartDate) {
          return doesFestivalExactDateOverlap(
            festival,
            rangeStart,
            rangeEnd
          );
        }

        return doesUsualMonthInclude(
          festival,
          targetMonth
        );
      }
    )
  );
}

function getFestivalPeriodLabel(
  period: NationalFestivalPeriodFilter,
  options: readonly NationalFestivalPeriodOption[]
) {
  return (
    options.find(
      (option) => option.id === period
    )?.label ?? '이번 달'
  );
}

function doesSeoulCultureEventOverlap(
  event: SeoulCultureEvent,
  rangeStart: Date,
  rangeEnd: Date
) {
  const start = getLocalDateFromIso(
    event.startDate
  );
  const end =
    getLocalDateFromIso(event.endDate) ??
    start;

  if (!start || !end) {
    return false;
  }

  return (
    getEndOfDay(end).getTime() >=
      rangeStart.getTime() &&
    getStartOfDay(start).getTime() <=
      rangeEnd.getTime()
  );
}

function getSeoulCulturePeriodRange(
  period: SeoulCulturePeriodFilter,
  now = new Date()
) {
  if (period === 'today') {
    return {
      start: getStartOfDay(now),
      end: getEndOfDay(now),
    };
  }

  if (period === 'thisWeek') {
    return getThisWeekRange(now);
  }

  return getMonthRange(
    now,
    period === 'nextMonth' ? 1 : 0
  );
}

function getSeoulCulturePeriodLabel(
  period: SeoulCulturePeriodFilter
) {
  return (
    SEOUL_CULTURE_PERIOD_FILTERS.find(
      (option) => option.id === period
    )?.label ?? '이번 달'
  );
}

function formatSeoulCultureFetchedAt(
  value: string
) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '갱신 시각 확인 중';
  }

  return `${date.getMonth() + 1}.${date.getDate()} ${String(
    date.getHours()
  ).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')} 갱신`;
}

type ExplorationMapLevel =
  | 'korea'
  | 'seoul'
  | 'busan'
  | 'incheon'
  | 'gangwon'
  | 'gyeonggi'
  | 'daejeon'
  | 'gwangju'
  | 'jeju'
  | 'chungbuk'
  | 'chungnam'
  | 'jeonbuk'
  | 'jeonnam'
  | 'gyeongbuk'
  | 'gyeongnam'
  | 'daegu'
  | 'sejong'
  | 'ulsan';

type KoreaRegionMarker = {
  id: string;
  name: string;
  shortLabel: string;
  icon: string;
  x: number;
  y: number;
  available: boolean;
  nextRegion?: boolean;
};

/*
 * 1단계 대한민국 지도입니다.
 * 대한민국 17개 광역지역이 모두 열렸습니다.
 * 세종은 단일 지역 지도로, 울산은 5개 구·군 지도로 연결합니다.
 */
const KOREA_REGION_MARKERS: KoreaRegionMarker[] = [
  { id: 'seoul', name: '서울특별시', shortLabel: '서울', icon: '🏙️', x: 102, y: 92, available: true },
  { id: 'incheon', name: '인천광역시', shortLabel: '인천', icon: '🌊', x: 78, y: 98, available: true },
  { id: 'gyeonggi', name: '경기도', shortLabel: '경기', icon: '🏰', x: 122, y: 111, available: true },
  { id: 'gangwon', name: '강원특별자치도', shortLabel: '강원', icon: '🏔️', x: 184, y: 78, available: true },
  { id: 'sejong', name: '세종특별자치시', shortLabel: '세종', icon: '🏛️', x: 119, y: 168, available: true },
  { id: 'daejeon', name: '대전광역시', shortLabel: '대전', icon: '🔬', x: 120, y: 190, available: true },
  { id: 'chungbuk', name: '충청북도', shortLabel: '충북', icon: '📖', x: 180, y: 186, available: true },
  { id: 'chungnam', name: '충청남도', shortLabel: '충남', icon: '🇰🇷', x: 142, y: 205, available: true },
  { id: 'jeonbuk', name: '전북특별자치도', shortLabel: '전북', icon: '🏯', x: 145, y: 248, available: true },
  { id: 'gwangju', name: '전남광주통합특별시 광주권', shortLabel: '광주권', icon: '🎨', x: 83, y: 270, available: true },
  { id: 'jeonnam', name: '전남광주통합특별시 전남권', shortLabel: '전남권', icon: '🌿', x: 105, y: 306, available: true },
  { id: 'gyeongbuk', name: '경상북도', shortLabel: '경북', icon: '🏯', x: 190, y: 174, available: true },
  { id: 'daegu', name: '대구광역시', shortLabel: '대구', icon: '🍎', x: 184, y: 218, available: true },
  { id: 'ulsan', name: '울산광역시', shortLabel: '울산', icon: '🐋', x: 224, y: 261, available: true },
  { id: 'gyeongnam', name: '경상남도', shortLabel: '경남', icon: '⚓', x: 160, y: 280, available: true },
  { id: 'busan', name: '부산광역시', shortLabel: '부산', icon: '🌉', x: 207, y: 306, available: true },
  { id: 'jeju', name: '제주특별자치도', shortLabel: '제주', icon: '🍊', x: 126, y: 407, available: true },
];

const KOREA_OPEN_REGION_COUNT =
  KOREA_REGION_MARKERS.filter(
    (region) => region.available
  ).length;

type SeoulDistrictShape = {
  id: string;
  name: string;
  points: string;
  labelX: number;
  labelY: number;
};

const SEOUL_DISTRICT_SHAPES: SeoulDistrictShape[] = [
  { id: 'eunpyeong', name: '은평구', points: '68,66 99,48 125,61 121,93 88,103 62,87', labelX: 94, labelY: 77 },
  { id: 'seodaemun', name: '서대문구', points: '88,103 121,93 145,107 139,137 104,143 78,124', labelX: 111, labelY: 120 },
  { id: 'mapo', name: '마포구', points: '52,125 78,124 104,143 139,137 147,163 108,177 70,166', labelX: 99, labelY: 153 },
  { id: 'jongno', name: '종로구', points: '121,93 158,76 194,82 204,109 176,124 145,107', labelX: 165, labelY: 102 },
  { id: 'jung', name: '중구', points: '139,137 145,107 176,124 181,148 155,160', labelX: 158, labelY: 140 },
  { id: 'yongsan', name: '용산구', points: '139,137 155,160 181,148 199,169 180,194 143,187 128,163', labelX: 166, labelY: 175 },
  { id: 'seongbuk', name: '성북구', points: '158,76 181,51 217,58 230,89 204,109 194,82', labelX: 200, labelY: 78 },
  { id: 'gangbuk', name: '강북구', points: '181,51 190,20 221,12 244,38 217,58', labelX: 214, labelY: 37 },
  { id: 'dobong', name: '도봉구', points: '221,12 251,6 270,28 267,58 244,38', labelX: 246, labelY: 27 },
  { id: 'nowon', name: '노원구', points: '267,58 270,28 300,25 321,55 315,91 285,101', labelX: 294, labelY: 64 },
  { id: 'jungnang', name: '중랑구', points: '230,89 267,58 285,101 278,132 244,132', labelX: 260, labelY: 108 },
  { id: 'dongdaemun', name: '동대문구', points: '204,109 230,89 244,132 226,151 181,148 176,124', labelX: 214, labelY: 127 },
  { id: 'seongdong', name: '성동구', points: '181,148 226,151 240,174 215,191 199,169', labelX: 213, labelY: 170 },
  { id: 'gwangjin', name: '광진구', points: '226,151 244,132 278,132 287,164 263,188 240,174', labelX: 258, labelY: 160 },
  { id: 'gangdong', name: '강동구', points: '287,164 315,148 346,158 355,193 325,210 291,193', labelX: 322, labelY: 182 },
  { id: 'songpa', name: '송파구', points: '263,188 287,164 291,193 325,210 316,244 276,251 249,222', labelX: 288, labelY: 219 },
  { id: 'gangnam', name: '강남구', points: '215,191 240,174 263,188 249,222 276,251 238,265 205,235', labelX: 238, labelY: 226 },
  { id: 'seocho', name: '서초구', points: '180,194 215,191 205,235 238,265 210,294 170,280 153,238', labelX: 195, labelY: 247 },
  { id: 'dongjak', name: '동작구', points: '143,187 180,194 153,238 120,231 109,205', labelX: 146, labelY: 212 },
  { id: 'gwanak', name: '관악구', points: '120,231 153,238 170,280 145,300 105,285 91,254', labelX: 132, labelY: 269 },
  { id: 'yeongdeungpo', name: '영등포구', points: '108,177 128,163 143,187 109,205 76,201 60,181', labelX: 103, labelY: 188 },
  { id: 'guro', name: '구로구', points: '60,181 76,201 109,205 120,231 91,254 54,245 37,213', labelX: 77, labelY: 222 },
  { id: 'geumcheon', name: '금천구', points: '91,254 105,285 91,319 66,302 54,270', labelX: 83, labelY: 285 },
  { id: 'yangcheon', name: '양천구', points: '37,213 54,245 54,270 25,262 13,229', labelX: 37, labelY: 242 },
  { id: 'gangseo', name: '강서구', points: '12,150 52,125 70,166 60,181 37,213 13,229 2,191', labelX: 31, labelY: 181 },

];


type BusanDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 부산 16개 구·군의 단순화 지도입니다.
 * 부산 16개 구·군의 실제 장소·GPS·테마 데이터를 연결하고,
 * 원도심·역사공원·해운대·기장 추가 명소 30곳도 반영했습니다.
 */
const BUSAN_DISTRICT_SHAPES: BusanDistrictShape[] = [
  {
    id: 'busan-gangseo',
    name: '강서구',
    icon: '🌾',
    subtitle: '가덕도·대항전망대·낙동강생태·명지수변 탐험',
    points: '10,90 85,60 130,55 115,115 125,160 95,205 45,220 15,175',
    labelX: 64,
    labelY: 143,
  },
  {
    id: 'busan-buk',
    name: '북구',
    icon: '🌳',
    subtitle: '낙동강·수목원 탐험',
    points: '130,55 190,25 180,80 155,130 115,115',
    labelX: 151,
    labelY: 79,
  },
  {
    id: 'busan-geumjeong',
    name: '금정구',
    icon: '⛰️',
    subtitle: '금정산성·범어사·회동수원지·온천천 탐험',
    points: '190,25 250,20 265,110 220,115 180,80',
    labelX: 220,
    labelY: 68,
  },
  {
    id: 'busan-gijang',
    name: '기장군',
    icon: '🌊',
    subtitle: '동부산 해안·과학 탐험',
    points: '250,20 335,35 350,90 330,145 290,150 265,110',
    labelX: 307,
    labelY: 83,
  },
  {
    id: 'busan-sasang',
    name: '사상구',
    icon: '🌿',
    subtitle: '삼락생태공원·감전문화·낙동강 숲길 탐험',
    points: '95,205 125,160 165,160 175,215 135,240',
    labelX: 136,
    labelY: 199,
  },
  {
    id: 'busan-busanjin',
    name: '부산진구',
    icon: '🌃',
    subtitle: '서면·전포카페거리·시민공원·산복문화 탐험',
    points: '165,160 155,130 180,80 220,115 220,165 195,195 175,215',
    labelX: 188,
    labelY: 147,
  },
  {
    id: 'busan-dongnae',
    name: '동래구',
    icon: '🏯',
    subtitle: '읍성·온천 역사 탐험',
    points: '220,115 265,110 260,155 220,165',
    labelX: 241,
    labelY: 139,
  },
  {
    id: 'busan-yeonje',
    name: '연제구',
    icon: '🏟️',
    subtitle: '배산성지·온천천·시청·생활문화 탐험',
    points: '220,165 260,155 275,185 240,205 195,195',
    labelX: 238,
    labelY: 183,
  },
  {
    id: 'busan-haeundae',
    name: '해운대구',
    icon: '🏖️',
    subtitle: '해운대·송정 바다 탐험',
    points: '275,185 260,155 290,150 330,145 345,190 320,225 280,225',
    labelX: 310,
    labelY: 187,
  },
  {
    id: 'busan-suyeong',
    name: '수영구',
    icon: '🌉',
    subtitle: '광안리·민락수변·망미골목·수영사적 탐험',
    points: '240,205 275,185 280,225 255,245 225,232',
    labelX: 255,
    labelY: 222,
  },
  {
    id: 'busan-nam',
    name: '남구',
    icon: '🌅',
    subtitle: '오륙도·역사문화 탐험',
    points: '195,195 240,205 225,232 245,270 205,280 170,245',
    labelX: 208,
    labelY: 242,
  },
  {
    id: 'busan-dong',
    name: '동구',
    icon: '🚉',
    subtitle: '부산역·이바구길 탐험',
    points: '175,215 195,195 170,245 155,255 135,240',
    labelX: 169,
    labelY: 230,
  },
  {
    id: 'busan-jung',
    name: '중구',
    icon: '🗼',
    subtitle: '부산 원도심·시장 탐험',
    points: '135,240 155,255 145,275 122,272',
    labelX: 139,
    labelY: 260,
  },
  {
    id: 'busan-seo',
    name: '서구',
    icon: '🚡',
    subtitle: '송도·해안산책 탐험',
    points: '95,205 135,240 122,272 90,260 72,235',
    labelX: 104,
    labelY: 243,
  },
  {
    id: 'busan-saha',
    name: '사하구',
    icon: '🌇',
    subtitle: '감천문화·다대포·을숙도·아미산 낙조 탐험',
    points: '45,220 95,205 72,235 90,260 72,300 30,290 15,250',
    labelX: 55,
    labelY: 263,
  },
  {
    id: 'busan-yeongdo',
    name: '영도구',
    icon: '⚓',
    subtitle: '태종대·흰여울·봉래산·항구 해안 탐험',
    points: '145,275 170,245 205,280 190,310 155,315 130,295',
    labelX: 168,
    labelY: 292,
  },

];


type IncheonDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 2026년 7월 1일 출범한 인천 9구·2군의 단순화 지도입니다.
 * 제물포구부터 옹진군까지 인천 11개 지역의 실제 장소·GPS·테마 데이터를 연결합니다.
 */
const INCHEON_DISTRICT_SHAPES: IncheonDistrictShape[] = [
  { id: 'incheon-ganghwa', name: '강화군', icon: '🏯', subtitle: '고인돌·고려·평화·마니산·섬마을 탐험', points: '15,25 92,18 116,58 98,108 44,120 10,82', labelX: 62, labelY: 67 },
  { id: 'incheon-geomdan', name: '검단구', icon: '🏺', subtitle: '선사·가현산·아라뱃길·신도시 탐험', points: '112,55 172,45 191,92 166,125 108,113', labelX: 148, labelY: 87 },
  { id: 'incheon-gyeyang', name: '계양구', icon: '⛰️', subtitle: '계양산·산성·아라뱃길·역사문화 탐험', points: '172,45 230,55 238,105 191,115 191,92', labelX: 210, labelY: 80 },
  { id: 'incheon-seohae', name: '서해구', icon: '🌊', subtitle: '청라호수·생태·도자·도시숲 탐험', points: '108,113 166,125 182,171 145,205 92,178', labelX: 137, labelY: 157 },
  { id: 'incheon-bupyeong', name: '부평구', icon: '🎵', subtitle: '캠프마켓·문화거리·굴포천·나비공원 탐험', points: '166,125 191,115 238,105 246,158 214,181 182,171', labelX: 211, labelY: 145 },
  { id: 'incheon-namdong', name: '남동구', icon: '🌾', subtitle: '소래·습지·대공원·시장 탐험', points: '246,158 305,165 330,213 294,245 239,222 214,181', labelX: 277, labelY: 202 },
  { id: 'incheon-michuhol', name: '미추홀구', icon: '🏟️', subtitle: '문학산·도호부·수봉·생활문화 탐험', points: '182,171 214,181 239,222 207,244 166,222 145,205', labelX: 193, labelY: 211 },
  { id: 'incheon-jemulpo', name: '제물포구', icon: '⚓', subtitle: '개항장·월미도·배다리 탐험', points: '92,178 145,205 166,222 153,258 105,268 72,233', labelX: 122, labelY: 229 },
  { id: 'incheon-yeonsu', name: '연수구', icon: '🌆', subtitle: '송도·능허대·청량산 탐험', points: '166,222 207,244 239,222 280,265 248,310 189,302 153,258', labelX: 218, labelY: 273 },
  { id: 'incheon-yeongjong', name: '영종구', icon: '✈️', subtitle: '공항·영종 해안·용유·무의 탐험', points: '22,160 79,145 104,178 72,233 105,268 70,288 20,252 8,205', labelX: 55, labelY: 215 },
  { id: 'incheon-ongjin', name: '옹진군', icon: '🏝️', subtitle: '백령·대청·연평·덕적·영흥 섬과 지질·평화 탐험', points: '18,280 75,288 104,318 65,326 22,315', labelX: 57, labelY: 307 },
];


type GyeonggiDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 경기도 31개 시·군의 단순화 지도입니다.
 * 경기도 31개 시·군의 대표 장소·GPS·테마 탐험이 모두 연결되어 있습니다.
 */
const GYEONGGI_DISTRICT_SHAPES: GyeonggiDistrictShape[] = [
  { id: 'gyeonggi-yeoncheon', name: '연천군', icon: '🦕', subtitle: '구석기·한탄강 지질·고구려·고려·평화 탐험', points: '100,15 178,15 190,58 135,68 95,42', labelX: 137, labelY: 39 },
  { id: 'gyeonggi-pocheon', name: '포천시', icon: '🏞️', subtitle: '아트밸리·산정호수·한탄강 지질·숲과 계곡 탐험', points: '190,20 266,32 270,92 220,112 190,58', labelX: 230, labelY: 60 },
  { id: 'gyeonggi-paju', name: '파주시', icon: '🕊️', subtitle: 'DMZ·예술·책·호수산림 탐험', points: '28,60 95,42 135,68 116,122 48,120', labelX: 78, labelY: 87 },
  { id: 'gyeonggi-dongducheon', name: '동두천시', icon: '🌲', subtitle: '소요산·평화역사·숲모험·레트로거리 탐험', points: '135,68 190,58 188,100 158,117 116,96', labelX: 153, labelY: 91 },
  { id: 'gyeonggi-yangju', name: '양주시', icon: '🎨', subtitle: '회암사지·양주목·별산대·장흥예술·꽃숲산길 탐험', points: '116,96 158,117 188,100 211,128 178,155 120,145', labelX: 156, labelY: 130 },
  { id: 'gyeonggi-uijeongbu', name: '의정부시', icon: '🥾', subtitle: '산사·수락산·예술도서관·경전철·원도심 탐험', points: '178,155 211,128 238,146 228,180 190,184', labelX: 209, labelY: 159 },
  { id: 'gyeonggi-gapyeong', name: '가평군', icon: '🌲', subtitle: '자라섬·아침고요·산과 계곡 탐험', points: '270,92 330,76 350,132 320,184 270,166 220,112', labelX: 302, labelY: 128 },
  { id: 'gyeonggi-gimpo', name: '김포시', icon: '🌉', subtitle: '애기봉·왕릉·성곽·항구·수로문화·한강생태 탐험', points: '15,130 72,122 83,169 53,197 10,176', labelX: 45, labelY: 158 },
  { id: 'gyeonggi-goyang', name: '고양시', icon: '🌸', subtitle: '호수공원·행주산성·왕릉·습지 탐험', points: '72,122 120,145 116,192 70,205 53,197 83,169', labelX: 94, labelY: 166 },
  { id: 'gyeonggi-guri', name: '구리시', icon: '🏺', subtitle: '동구릉·고구려·호수·한강·시장·생태 탐험', points: '228,180 250,172 260,199 238,218 218,204', labelX: 240, labelY: 197 },
  { id: 'gyeonggi-namyangju', name: '남양주시', icon: '🌿', subtitle: '다산·왕릉·사찰·호수·산림 탐험', points: '238,146 270,166 320,184 303,228 260,224 238,218 260,199', labelX: 279, labelY: 192 },
  { id: 'gyeonggi-yangpyeong', name: '양평군', icon: '🌿', subtitle: '두물머리·연꽃정원·용문산·문학·철도 탐험', points: '303,228 320,184 350,196 355,254 323,275 286,253', labelX: 329, labelY: 228 },
  { id: 'gyeonggi-bucheon', name: '부천시', icon: '🎬', subtitle: '만화·예술·꽃·생태 탐험', points: '18,210 62,205 70,239 45,257 12,242', labelX: 42, labelY: 231 },
  { id: 'gyeonggi-gwangmyeong', name: '광명시', icon: '💎', subtitle: '광명동굴·시장·문학·숲과 습지 탐험', points: '62,205 104,207 108,241 70,239', labelX: 85, labelY: 225 },
  { id: 'gyeonggi-anyang', name: '안양시', icon: '🎨', subtitle: '예술공원·건축·산사·안양천·도심공원 탐험', points: '104,207 145,205 151,241 108,241', labelX: 128, labelY: 225 },
  { id: 'gyeonggi-gwacheon', name: '과천시', icon: '🦁', subtitle: '대공원·동물원·과학·미술·역사·관악산 탐험', points: '145,205 183,202 190,238 151,241', labelX: 168, labelY: 223 },
  { id: 'gyeonggi-seongnam', name: '성남시', icon: '🌆', subtitle: '판교역사·예술·미래산업·공원생태·전통시장 탐험', points: '183,202 218,204 238,218 230,252 190,238', labelX: 211, labelY: 226 },
  { id: 'gyeonggi-hanam', name: '하남시', icon: '🌳', subtitle: '검단산·미사·도시전망·역사문화 탐험', points: '238,218 260,224 268,255 230,252', labelX: 250, labelY: 240 },
  { id: 'gyeonggi-gwangju', name: '광주시', icon: '🏯', subtitle: '남한산성·왕실도자·팔당습지·화담숲 탐험', points: '260,224 303,228 286,253 290,287 250,284 268,255', labelX: 277, labelY: 257 },
  { id: 'gyeonggi-siheung', name: '시흥시', icon: '🌅', subtitle: '오이도·선사·갯골·연꽃·호수·해양레저 탐험', points: '20,258 70,239 80,278 50,302 15,287', labelX: 48, labelY: 273 },
  { id: 'gyeonggi-ansan', name: '안산시', icon: '🌊', subtitle: '대부도·서해낙조·갯벌생태·예술·다문화 탐험', points: '70,239 108,241 118,281 80,278', labelX: 95, labelY: 263 },
  { id: 'gyeonggi-gunpo', name: '군포시', icon: '🌺', subtitle: '수리산·사찰·호수·철쭉·생태·도시문화 탐험', points: '108,241 151,241 156,278 118,281', labelX: 133, labelY: 262 },
  { id: 'gyeonggi-uiwang', name: '의왕시', icon: '🚂', subtitle: '왕송호수·철도·조류생태·백운호수·산사·한글문화 탐험', points: '151,241 190,238 194,276 156,278', labelX: 174, labelY: 260 },
  { id: 'gyeonggi-suwon', name: '수원시', icon: '🏰', subtitle: '수원화성·행궁동·호수공원 탐험', points: '194,276 230,252 250,284 237,316 194,315', labelX: 219, labelY: 288 },
  { id: 'gyeonggi-yongin', name: '용인시', icon: '🎢', subtitle: '에버랜드·민속촌·미술·숲정원 탐험', points: '230,252 268,255 290,287 280,325 237,316 250,284', labelX: 261, labelY: 288 },
  { id: 'gyeonggi-icheon', name: '이천시', icon: '🏺', subtitle: '도자예술·설봉역사·온천·농촌문화 탐험', points: '290,287 323,275 350,298 344,337 305,342 280,325', labelX: 318, labelY: 310 },
  { id: 'gyeonggi-hwaseong', name: '화성시', icon: '🌊', subtitle: '제부도·궁평항·융건릉·공룡화석 탐험', points: '50,302 80,278 118,281 156,278 194,315 174,350 110,360 55,342', labelX: 117, labelY: 320 },
  { id: 'gyeonggi-osan', name: '오산시', icon: '🕊️', subtitle: '독산성·평화·미니어처·수목원 탐험', points: '174,350 194,315 237,316 232,352 198,368', labelX: 207, labelY: 339 },
  { id: 'gyeonggi-pyeongtaek', name: '평택시', icon: '⚓', subtitle: '평택호·항만·생태정원·역사·국제문화 탐험', points: '110,360 174,350 198,368 190,410 118,414 85,388', labelX: 143, labelY: 384 },
  { id: 'gyeonggi-anseong', name: '안성시', icon: '🎭', subtitle: '남사당·농촌체험·사찰·성지·산성·호수 탐험', points: '198,368 232,352 280,325 305,342 300,390 250,414 190,410', labelX: 251, labelY: 375 },
  { id: 'gyeonggi-yeoju', name: '여주시', icon: '👑', subtitle: '왕릉·왕비생가·고찰·도자·남한강 생태 탐험', points: '305,342 344,337 355,370 340,410 300,390', labelX: 329, labelY: 371 },
];


type DaejeonDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 대전광역시 5개 자치구의 단순화 지도입니다.
 * 유성구·중구·동구·서구·대덕구 탐험이 모두 열렸습니다.
 */
const DAEJEON_DISTRICT_SHAPES: DaejeonDistrictShape[] = [
  {
    id: 'daejeon-yuseong',
    name: '유성구',
    icon: '🔬',
    subtitle: '과학도시·유성온천·현충원·계룡산 숲길 탐험',
    points: '20,50 170,25 210,75 190,150 120,190 35,155',
    labelX: 107,
    labelY: 105,
  },
  {
    id: 'daejeon-daedeok',
    name: '대덕구',
    icon: '🌲',
    subtitle: '계족산·대청호·동춘당·산업역사 탐험',
    points: '210,30 335,55 330,155 255,165 190,150 210,75',
    labelX: 270,
    labelY: 103,
  },
  {
    id: 'daejeon-seo',
    name: '서구',
    icon: '🌳',
    subtitle: '한밭수목원·예술·도심공원·장태산 탐험',
    points: '35,155 120,190 190,150 210,220 160,290 55,270 20,220',
    labelX: 111,
    labelY: 226,
  },
  {
    id: 'daejeon-jung',
    name: '중구',
    icon: '🎭',
    subtitle: '오월드·뿌리공원·보문산·원도심문화 탐험',
    points: '190,150 255,165 265,230 220,285 160,290 210,220',
    labelX: 220,
    labelY: 225,
  },
  {
    id: 'daejeon-dong',
    name: '동구',
    icon: '🌄',
    subtitle: '대청호·식장산·숲휴양·원도심·철도문화 탐험',
    points: '255,165 330,155 345,240 300,305 220,285 265,230',
    labelX: 292,
    labelY: 235,
  },
];

type GangwonDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 강원특별자치도 18개 시·군의 단순화 지도입니다.
 * 춘천시·원주시·속초시·강릉시·동해시·태백시·삼척시·홍천군·횡성군·영월군·평창군·정선군·철원군·화천군·양구군·인제군·고성군·양양군의 대표 여행지·GPS·테마 탐험을 연결합니다.
 */
const GANGWON_DISTRICT_SHAPES: GangwonDistrictShape[] = [
  { id: 'gangwon-cheorwon', name: '철원군', icon: '🕊️', subtitle: '한탄강 지질·DMZ 평화·태봉역사·사찰 탐험', points: '20,30 90,20 110,65 80,95 25,90', labelX: 61, labelY: 58 },
  { id: 'gangwon-hwacheon', name: '화천군', icon: '🐟', subtitle: '파로호·산소길·DMZ 평화·별·계곡 탐험', points: '90,20 145,25 160,70 110,65', labelX: 127, labelY: 47 },
  { id: 'gangwon-yanggu', name: '양구군', icon: '🌿', subtitle: '파로호·숲·예술·국토정중앙·DMZ 생태 탐험', points: '145,25 200,30 205,78 160,70', labelX: 181, labelY: 52 },
  { id: 'gangwon-goseong', name: '고성군', icon: '🌊', subtitle: 'DMZ·화진포·송지호·왕곡마을·동해 누정 탐험', points: '250,20 320,25 340,90 295,100 260,70', labelX: 298, labelY: 59 },
  { id: 'gangwon-chuncheon', name: '춘천시', icon: '🌊', subtitle: '남이섬·강촌·소양강·의암호·문학문화 탐험', points: '65,90 110,65 160,70 170,120 125,145 75,135', labelX: 119, labelY: 107 },
  { id: 'gangwon-inje', name: '인제군', icon: '🏞️', subtitle: '설악고산·백담계곡·자작나무·평화생태 탐험', points: '160,70 205,78 260,70 295,100 275,145 215,150 170,120', labelX: 229, labelY: 109 },
  { id: 'gangwon-sokcho', name: '속초시', icon: '🏔️', subtitle: '권금성·울산바위·청초호·대포항·외옹치 탐험', points: '295,100 340,90 345,135 310,150 275,145', labelX: 316, labelY: 122 },
  { id: 'gangwon-yangyang', name: '양양군', icon: '🏄', subtitle: '낙산사·서핑해안·오색·미천골·남애항 탐험', points: '275,145 310,150 338,185 310,220 270,205', labelX: 306, labelY: 183 },
  { id: 'gangwon-hongcheon', name: '홍천군', icon: '🌲', subtitle: '팔봉산·수타사·무궁화·숲·산악레저 탐험', points: '75,135 125,145 170,120 215,150 205,195 145,205 90,185', labelX: 145, labelY: 166 },
  { id: 'gangwon-hoengseong', name: '횡성군', icon: '🐄', subtitle: '호수·고원숲·근대문화·가족레저 탐험', points: '90,185 145,205 150,250 95,250 65,215', labelX: 112, labelY: 222 },
  { id: 'gangwon-pyeongchang', name: '평창군', icon: '🏂', subtitle: '대관령목장·발왕산·오대산·백룡동굴·효석마을 탐험', points: '145,205 205,195 250,215 245,265 190,280 150,250', labelX: 199, labelY: 235 },
  { id: 'gangwon-gangneung', name: '강릉시', icon: '🌅', subtitle: '경포·주문진·헌화로·안반데기·커피문화 탐험', points: '270,205 310,220 330,270 285,280 245,265 250,215', labelX: 291, labelY: 244 },
  { id: 'gangwon-wonju', name: '원주시', icon: '🌉', subtitle: '소금산·치악산·예술·역사 탐험', points: '65,215 95,250 150,250 145,300 85,310 45,270', labelX: 98, labelY: 275 },
  { id: 'gangwon-jeongseon', name: '정선군', icon: '🚂', subtitle: '민둥산·정암사·병방치·아우라지·운탄고도 탐험', points: '190,280 245,265 285,280 275,320 220,335 175,315', labelX: 232, labelY: 301 },
  { id: 'gangwon-yeongwol', name: '영월군', icon: '🌌', subtitle: '단종역사·동강지질·래프팅·별빛·박물관 탐험', points: '145,300 175,315 220,335 180,355 125,345 85,310', labelX: 155, labelY: 329 },
  { id: 'gangwon-donghae', name: '동해시', icon: '🌊', subtitle: '무릉계곡·베틀바위·묵호·추암·망상 탐험', points: '285,280 330,270 342,305 312,325 275,320', labelX: 310, labelY: 300 },
  { id: 'gangwon-taebaek', name: '태백시', icon: '⛰️', subtitle: '태백산·발원지·지질·탄광문화·고원 탐험', points: '220,335 275,320 312,325 290,355 240,360', labelX: 268, labelY: 343 },
  { id: 'gangwon-samcheok', name: '삼척시', icon: '🌊', subtitle: '환선굴·대금굴·초곡해안·장호항·덕풍계곡 탐험', points: '312,325 342,305 350,345 320,365 290,355', labelX: 323, labelY: 341 },
];

type GwangjuDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 전남광주통합특별시 광주권 5개 자치구의 단순화 지도입니다.
 * 기존 저장 ID의 호환성을 유지하면서 광주권 동구부터 탐험을 엽니다.
 */
const GWANGJU_DISTRICT_SHAPES: GwangjuDistrictShape[] = [
  {
    id: "gwangju-gwangsan",
    name: "광산구",
    icon: "🌾",
    subtitle: "송정·황룡강·선비문학·공동체 탐험",
    points: "10,78 92,38 150,72 150,135 132,212 72,260 18,224",
    labelX: 79,
    labelY: 143,
  },
  {
    id: "gwangju-buk",
    name: "북구",
    icon: "🌿",
    subtitle: "비엔날레·박물관·5·18·호수생태 탐험",
    points: "92,38 235,18 340,72 315,150 232,155 150,135 150,72",
    labelX: 229,
    labelY: 91,
  },
  {
    id: "gwangju-seo",
    name: "서구",
    icon: "🌳",
    subtitle: "상무·5·18·호수공원·도심문화 탐험",
    points: "132,135 232,155 220,225 132,212",
    labelX: 181,
    labelY: 183,
  },
  {
    id: "gwangju-dong",
    name: "동구",
    icon: "🎨",
    subtitle: "민주·예술·무등산 문화생태 탐험",
    points: "232,155 315,150 305,245 220,225",
    labelX: 269,
    labelY: 199,
  },
  {
    id: "gwangju-nam",
    name: "남구",
    icon: "🏺",
    subtitle: "양림·사직·근대역사·전통민속 탐험",
    points: "72,260 132,212 220,225 305,245 270,314 150,310",
    labelX: 190,
    labelY: 270,
  },
];

type ChungbukDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

const CHUNGBUK_DISTRICT_SHAPES: ChungbukDistrictShape[] = [
  {
    id: "chungbuk-jincheon",
    name: "진천군",
    icon: "🏺",
    subtitle: "농다리·초평호·종박물관·역사 탐험",
    points: "34,54 102,28 145,72 122,128 62,132 25,98",
    labelX: 81,
    labelY: 86,
  },
  {
    id: "chungbuk-eumseong",
    name: "음성군",
    icon: "🎼",
    subtitle: "반기문·품바·산업·산림휴양 탐험",
    points: "102,28 190,18 225,65 205,125 145,72",
    labelX: 170,
    labelY: 68,
  },
  {
    id: "chungbuk-chungju",
    name: "충주시",
    icon: "🌊",
    subtitle: "중앙탑·탄금호·수안보·중원문화 탐험",
    points: "190,18 270,35 300,92 270,162 205,125 225,65",
    labelX: 252,
    labelY: 94,
  },
  {
    id: "chungbuk-jecheon",
    name: "제천시",
    icon: "⛰️",
    subtitle: "청풍호 호반길·금수산·월악산 계곡·산사 탐험",
    points: "270,35 334,65 348,130 300,180 270,162 300,92",
    labelX: 313,
    labelY: 111,
  },
  {
    id: "chungbuk-danyang",
    name: "단양군",
    icon: "🗻",
    subtitle: "소백산계곡·죽령옛길·온달산성·남한강 지질 탐험",
    points: "334,65 358,100 356,190 315,225 300,180 348,130",
    labelX: 337,
    labelY: 157,
  },
  {
    id: "chungbuk-jeungpyeong",
    name: "증평군",
    icon: "🌿",
    subtitle: "좌구산·보강천·민속·김득신 탐험",
    points: "62,132 122,128 137,178 92,205 50,180",
    labelX: 94,
    labelY: 163,
  },
  {
    id: "chungbuk-goesan",
    name: "괴산군",
    icon: "🏞️",
    subtitle: "산막이옛길·화양구곡·연풍·한지 탐험",
    points: "122,128 205,125 270,162 250,242 180,255 137,178",
    labelX: 196,
    labelY: 190,
  },
  {
    id: "chungbuk-cheongju",
    name: "청주시",
    icon: "📖",
    subtitle: "직지·산성·청남대·문화재생 탐험",
    points: "20,170 50,180 92,205 105,275 58,320 12,275",
    labelX: 59,
    labelY: 245,
  },
  {
    id: "chungbuk-boeun",
    name: "보은군",
    icon: "🌲",
    subtitle: "속리산·법주사·말티재·삼년산성 탐험",
    points: "105,275 180,255 250,242 240,310 175,342 115,330",
    labelX: 176,
    labelY: 296,
  },
  {
    id: "chungbuk-okcheon",
    name: "옥천군",
    icon: "📜",
    subtitle: "정지용·부소담악·대청호·장령산 탐험",
    points: "12,275 58,320 115,330 132,382 65,402 15,360",
    labelX: 68,
    labelY: 350,
  },
  {
    id: "chungbuk-yeongdong",
    name: "영동군",
    icon: "🍇",
    subtitle: "와인·국악·월류봉·평화 탐험",
    points: "115,330 175,342 240,310 270,365 225,412 132,382",
    labelX: 194,
    labelY: 370,
  },
];

type ChungnamDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

const CHUNGNAM_DISTRICT_SHAPES: ChungnamDistrictShape[] = [
  {
    id: "chungnam-dangjin",
    name: "당진시",
    icon: "🌉",
    subtitle: "삽교호·왜목·솔뫼·면천 탐험",
    points: "105,24 190,18 224,58 205,105 135,110 88,70",
    labelX: 157,
    labelY: 66,
  },
  {
    id: "chungnam-asan",
    name: "아산시",
    icon: "♨️",
    subtitle: "현충사·외암마을·온양온천·영인산 탐험",
    points: "190,18 280,22 315,70 285,120 205,105 224,58",
    labelX: 255,
    labelY: 70,
  },
  {
    id: "chungnam-cheonan",
    name: "천안시",
    icon: "🇰🇷",
    subtitle: "독립기념관·유관순·태조산·호수 탐험",
    points: "280,22 365,42 395,100 360,158 285,120 315,70",
    labelX: 343,
    labelY: 91,
  },
  {
    id: "chungnam-taean",
    name: "태안군",
    icon: "🌊",
    subtitle: "북부해안길·안면도 정원·항구·가의도·옹도 탐험",
    points: "18,70 88,70 105,135 78,205 25,230 8,155",
    labelX: 53,
    labelY: 143,
  },
  {
    id: "chungnam-seosan",
    name: "서산시",
    icon: "🌅",
    subtitle: "해미읍성·백제미소·간월암·천수만 탐험",
    points: "88,70 135,110 175,155 150,215 78,205 105,135",
    labelX: 122,
    labelY: 157,
  },
  {
    id: "chungnam-yesan",
    name: "예산군",
    icon: "🌳",
    subtitle: "수덕사·예당호·추사고택·황새공원 탐험",
    points: "135,110 205,105 250,150 230,215 175,155",
    labelX: 199,
    labelY: 159,
  },
  {
    id: "chungnam-gongju",
    name: "공주시",
    icon: "🏯",
    subtitle: "백제왕도·근대신앙·동학·계룡산 자연미술 탐험",
    points: "205,105 285,120 360,158 342,235 270,250 230,215 250,150",
    labelX: 291,
    labelY: 184,
  },
  {
    id: "chungnam-hongseong",
    name: "홍성군",
    icon: "🐉",
    subtitle: "홍주읍성·김좌진·용봉산·남당항 탐험",
    points: "78,205 150,215 168,270 112,302 52,270 25,230",
    labelX: 105,
    labelY: 252,
  },
  {
    id: "chungnam-cheongyang",
    name: "청양군",
    icon: "🌶️",
    subtitle: "칠갑산·천장호·장곡사·고추문화 탐험",
    points: "150,215 230,215 270,250 240,305 168,270",
    labelX: 211,
    labelY: 259,
  },
  {
    id: "chungnam-boryeong",
    name: "보령시",
    icon: "🏖️",
    subtitle: "대천항·성주산·서해 섬길·등대·호수 탐험",
    points: "52,270 112,302 140,365 85,410 25,365 18,305",
    labelX: 77,
    labelY: 339,
  },
  {
    id: "chungnam-buyeo",
    name: "부여군",
    icon: "👑",
    subtitle: "사비도성·백제절터·가마·백마강 탐험",
    points: "112,302 168,270 240,305 225,365 165,398 140,365",
    labelX: 180,
    labelY: 336,
  },
  {
    id: "chungnam-gyeryong",
    name: "계룡시",
    icon: "⛰️",
    subtitle: "계룡대·사계고택·향적산·두계천 탐험",
    points: "270,250 310,245 330,285 305,320 265,305",
    labelX: 299,
    labelY: 284,
  },
  {
    id: "chungnam-nonsan",
    name: "논산시",
    icon: "🌉",
    subtitle: "관촉사·탑정호·강경·선샤인랜드 탐험",
    points: "240,305 265,305 305,320 330,385 275,420 225,365",
    labelX: 278,
    labelY: 356,
  },
  {
    id: "chungnam-geumsan",
    name: "금산군",
    icon: "🌿",
    subtitle: "인삼·적벽강·산림·칠백의총 탐험",
    points: "330,285 382,275 412,335 390,410 330,385 305,320",
    labelX: 366,
    labelY: 342,
  },
  {
    id: "chungnam-seocheon",
    name: "서천군",
    icon: "🌾",
    subtitle: "생태원·장항·신성리·한산모시 탐험",
    points: "85,410 140,365 165,398 200,430 115,448 55,435",
    labelX: 119,
    labelY: 414,
  },
];

type JeonbukDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

const JEONBUK_DISTRICT_SHAPES: JeonbukDistrictShape[] = [
  {
    id: "jeonbuk-gunsan",
    name: "군산시",
    icon: "⚓",
    subtitle: "근대역사·선유도·시간여행 탐험",
    points: "18,55 105,25 148,70 126,132 45,138 8,92",
    labelX: 72,
    labelY: 82,
  },
  {
    id: "jeonbuk-iksan",
    name: "익산시",
    icon: "👑",
    subtitle: "미륵사지·왕궁리·보석·생태습지 탐험",
    points: "105,25 200,25 232,82 190,132 126,132 148,70",
    labelX: 168,
    labelY: 79,
  },
  {
    id: "jeonbuk-wanju",
    name: "완주군",
    icon: "⛰️",
    subtitle: "대둔산·삼례문화예술촌·고산 탐험",
    points: "200,25 286,45 316,110 270,166 190,132 232,82",
    labelX: 252,
    labelY: 92,
  },
  {
    id: "jeonbuk-jinan",
    name: "진안군",
    icon: "🐴",
    subtitle: "마이산·탑사·용담호 탐험",
    points: "286,45 355,65 386,125 336,180 270,166 316,110",
    labelX: 330,
    labelY: 108,
  },
  {
    id: "jeonbuk-muju",
    name: "무주군",
    icon: "🏔️",
    subtitle: "덕유산·구천동·적상산·태권도·반딧불 탐험",
    points: "355,65 410,95 418,170 375,215 336,180 386,125",
    labelX: 383,
    labelY: 139,
  },
  {
    id: "jeonbuk-jeonju",
    name: "전주시",
    icon: "🏘️",
    subtitle: "한옥마을·전라감영·문학공예·원도심예술 탐험",
    points: "126,132 190,132 222,180 190,225 120,210 95,166",
    labelX: 159,
    labelY: 178,
  },
  {
    id: "jeonbuk-gimje",
    name: "김제시",
    icon: "🌾",
    subtitle: "금산사·벽골제·지평선 탐험",
    points: "45,138 126,132 95,166 120,210 90,270 20,245 8,180",
    labelX: 63,
    labelY: 205,
  },
  {
    id: "jeonbuk-buan",
    name: "부안군",
    icon: "🌊",
    subtitle: "채석강·내소사·변산반도 탐험",
    points: "20,245 90,270 115,330 65,380 10,345",
    labelX: 57,
    labelY: 315,
  },
  {
    id: "jeonbuk-jeongeup",
    name: "정읍시",
    icon: "🍁",
    subtitle: "내장산·동학·구절초 탐험",
    points: "90,270 120,210 190,225 212,290 165,345 115,330",
    labelX: 153,
    labelY: 283,
  },
  {
    id: "jeonbuk-gochang",
    name: "고창군",
    icon: "🪨",
    subtitle: "고인돌·선운사·고창읍성 탐험",
    points: "10,345 65,380 135,420 80,455 15,440",
    labelX: 70,
    labelY: 407,
  },
  {
    id: "jeonbuk-imsil",
    name: "임실군",
    icon: "🧀",
    subtitle: "치즈테마파크·옥정호·사선대 탐험",
    points: "190,225 270,166 302,230 280,300 212,290",
    labelX: 248,
    labelY: 245,
  },
  {
    id: "jeonbuk-jangsu",
    name: "장수군",
    icon: "🐎",
    subtitle: "논개사당·장안산·승마문화 탐험",
    points: "270,166 336,180 375,215 356,285 302,230",
    labelX: 334,
    labelY: 224,
  },
  {
    id: "jeonbuk-sunchang",
    name: "순창군",
    icon: "🌶️",
    subtitle: "강천산·고추장·채계산 탐험",
    points: "165,345 212,290 280,300 270,370 205,420 135,420",
    labelX: 214,
    labelY: 355,
  },
  {
    id: "jeonbuk-namwon",
    name: "남원시",
    icon: "🌙",
    subtitle: "광한루·산성·서원·사찰·국악·고전문학 탐험",
    points: "280,300 356,285 400,340 380,420 270,370",
    labelX: 337,
    labelY: 350,
  },
];

type ExtendedMapLevel =
  | 'jeonnam'
  | 'gyeongbuk'
  | 'gyeongnam'
  | 'daegu'
  | 'sejong'
  | 'ulsan';

type ExtendedDistrictShape = {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

type ExtendedDistrictSeed = Omit<
  ExtendedDistrictShape,
  'points' | 'labelX' | 'labelY'
>;

const createDistrictGridShapes = (
  districts: ExtendedDistrictSeed[],
  columns: number
): ExtendedDistrictShape[] => {
  const outerPadding = 12;
  const horizontalGap = 5;
  const verticalGap = 5;
  const usableWidth = 460 - outerPadding * 2;
  const cellWidth =
    (usableWidth - horizontalGap * (columns - 1)) /
    columns;
  const rows = Math.ceil(districts.length / columns);
  const usableHeight = 420;
  const cellHeight =
    (usableHeight - verticalGap * (rows - 1)) / rows;

  return districts.map((district, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x =
      outerPadding + column * (cellWidth + horizontalGap);
    const y = 10 + row * (cellHeight + verticalGap);
    const right = x + cellWidth;
    const bottom = y + cellHeight;
    const notch = Math.min(7, cellWidth * 0.08);

    return {
      ...district,
      points: [
        `${x + notch},${y}`,
        `${right},${y + notch}`,
        `${right - notch},${bottom}`,
        `${x},${bottom - notch}`,
      ].join(' '),
      labelX: x + cellWidth / 2,
      labelY: y + cellHeight / 2 + 3,
    };
  });
};

const JEONNAM_DISTRICT_SHAPES = createDistrictGridShapes(
  [
  { id: "jeonnam-mokpo", name: "목포시", icon: "⚓", subtitle: "고하도·개항장·해양호국·예술문학 탐험" },
  { id: "jeonnam-yeosu", name: "여수시", icon: "🌊", subtitle: "밤바다·예술섬·거문도·백도·지질해안 탐험" },
  { id: "jeonnam-suncheon", name: "순천시", icon: "🌿", subtitle: "국가정원·습지과학·조계산 산사·차문화 탐험" },
  { id: "jeonnam-naju", name: "나주시", icon: "🏯", subtitle: "금성관·영산강·반남고분 탐험" },
  { id: "jeonnam-gwangyang", name: "광양시", icon: "🌉", subtitle: "매화마을·구봉산·백운산 탐험" },
  { id: "jeonnam-damyang", name: "담양군", icon: "🎋", subtitle: "죽녹원·메타세쿼이아·소쇄원 탐험" },
  { id: "jeonnam-gokseong", name: "곡성군", icon: "🚂", subtitle: "섬진강기차마을·장미공원 탐험" },
  { id: "jeonnam-gurye", name: "구례군", icon: "🌸", subtitle: "지리산 산사·폭포·산수유·섬진강·정원 탐험" },
  { id: "jeonnam-goheung", name: "고흥군", icon: "🚀", subtitle: "우주센터·나로도·팔영산 탐험" },
  { id: "jeonnam-boseong", name: "보성군", icon: "🍵", subtitle: "녹차밭·율포·제암산 탐험" },
  { id: "jeonnam-hwasun", name: "화순군", icon: "🪨", subtitle: "고인돌·적벽·운주사 탐험" },
  { id: "jeonnam-jangheung", name: "장흥군", icon: "🌲", subtitle: "편백숲·정남진·천관산 탐험" },
  { id: "jeonnam-gangjin", name: "강진군", icon: "🏺", subtitle: "다산초당·청자·가우도 탐험" },
  { id: "jeonnam-haenam", name: "해남군", icon: "🌅", subtitle: "달마산·공룡화석·명량·오시아노 낙조 탐험" },
  { id: "jeonnam-yeongam", name: "영암군", icon: "⛰️", subtitle: "월출산·도갑사·영암호 탐험" },
  { id: "jeonnam-muan", name: "무안군", icon: "🌾", subtitle: "회산백련지·황토갯벌·초의선사 탐험" },
  { id: "jeonnam-hampyeong", name: "함평군", icon: "🦋", subtitle: "나비축제·자연생태공원 탐험" },
  { id: "jeonnam-yeonggwang", name: "영광군", icon: "🌇", subtitle: "백수해안도로·불갑사·법성포 탐험" },
  { id: "jeonnam-jangseong", name: "장성군", icon: "🌳", subtitle: "백양사·황룡강·축령산 탐험" },
  { id: "jeonnam-wando", name: "완도군", icon: "🏝️", subtitle: "청산도·보길도·완도수목원·장보고·섬길 탐험" },
  { id: "jeonnam-jindo", name: "진도군", icon: "🎶", subtitle: "호국유적·남도음악·다도해 섬길·낙조 탐험" },
  { id: "jeonnam-sinan", name: "신안군", icon: "🟣", subtitle: "퍼플섬·천사대교·흑산도·홍도·섬생태 탐험" },
  ],
  4
);

const GYEONGBUK_DISTRICT_SHAPES = createDistrictGridShapes(
  [
  { id: "gyeongbuk-pohang", name: "포항시", icon: "🌊", subtitle: "호미곶·스페이스워크·구룡포 탐험" },
  { id: "gyeongbuk-gyeongju", name: "경주시", icon: "🏯", subtitle: "신라왕경·남산왕릉·동해사찰·서원 탐험" },
  { id: "gyeongbuk-gimcheon", name: "김천시", icon: "🌲", subtitle: "직지사·사명대사공원·부항댐 탐험" },
  { id: "gyeongbuk-andong", name: "안동시", icon: "🎭", subtitle: "하회마을·종택·유교마을·민속공예 탐험" },
  { id: "gyeongbuk-gumi", name: "구미시", icon: "🏞️", subtitle: "금오산·박정희생가·낙동강 탐험" },
  { id: "gyeongbuk-yeongju", name: "영주시", icon: "🛕", subtitle: "부석사·소수서원·무섬마을 탐험" },
  { id: "gyeongbuk-yeongcheon", name: "영천시", icon: "🌌", subtitle: "보현산천문대·임고서원·은해사 탐험" },
  { id: "gyeongbuk-sangju", name: "상주시", icon: "🚲", subtitle: "경천대·상주자전거박물관·낙동강 탐험" },
  { id: "gyeongbuk-mungyeong", name: "문경시", icon: "🚂", subtitle: "문경새재·철로자전거·석탄박물관 탐험" },
  { id: "gyeongbuk-gyeongsan", name: "경산시", icon: "🌸", subtitle: "반곡지·갓바위·삼성현역사문화 탐험" },
  { id: "gyeongbuk-uiseong", name: "의성군", icon: "🦕", subtitle: "조문국박물관·고운사·빙계계곡 탐험" },
  { id: "gyeongbuk-cheongsong", name: "청송군", icon: "🍎", subtitle: "주왕산·주산지·청송백자 탐험" },
  { id: "gyeongbuk-yeongyang", name: "영양군", icon: "🌌", subtitle: "국제밤하늘보호공원·두들마을·선바위 탐험" },
  { id: "gyeongbuk-yeongdeok", name: "영덕군", icon: "🌊", subtitle: "블루로드·해맞이공원·괴시마을 탐험" },
  { id: "gyeongbuk-cheongdo", name: "청도군", icon: "🐂", subtitle: "프로방스·운문사·읍성 탐험" },
  { id: "gyeongbuk-goryeong", name: "고령군", icon: "👑", subtitle: "대가야박물관·지산동고분군·우륵 탐험" },
  { id: "gyeongbuk-seongju", name: "성주군", icon: "🌳", subtitle: "세종대왕자태실·성밖숲·가야산 탐험" },
  { id: "gyeongbuk-chilgok", name: "칠곡군", icon: "🕊️", subtitle: "호국평화·가산산성·문학 탐험" },
  { id: "gyeongbuk-yecheon", name: "예천군", icon: "🐞", subtitle: "회룡포·삼강주막·곤충생태 탐험" },
  { id: "gyeongbuk-bonghwa", name: "봉화군", icon: "🌲", subtitle: "백두대간수목원·청량산·산타마을 탐험" },
  { id: "gyeongbuk-uljin", name: "울진군", icon: "🌊", subtitle: "성류굴·금강소나무·동해안 탐험" },
  { id: "gyeongbuk-ulleung", name: "울릉군", icon: "🏝️", subtitle: "나리분지·성인봉·해안비경·독도 역사 탐험" },
  ],
  4
);

const GYEONGNAM_DISTRICT_SHAPES = createDistrictGridShapes(
  [
  { id: "gyeongnam-changwon", name: "창원시", icon: "🌸", subtitle: "진해 벚꽃·주남저수지·마산만 탐험" },
  { id: "gyeongnam-jinju", name: "진주시", icon: "🏯", subtitle: "진주성·남강유등·진양호 탐험" },
  { id: "gyeongnam-tongyeong", name: "통영시", icon: "⚓", subtitle: "통제영·미륵산·한산도·연대도·섬예술 탐험" },
  { id: "gyeongnam-sacheon", name: "사천시", icon: "🚀", subtitle: "바다케이블카·우주항공·비토섬 탐험" },
  { id: "gyeongnam-gimhae", name: "김해시", icon: "👑", subtitle: "가야왕도·봉하마을·화포천 탐험" },
  { id: "gyeongnam-miryang", name: "밀양시", icon: "🌉", subtitle: "영남루·얼음골·표충사 탐험" },
  { id: "gyeongnam-geoje", name: "거제시", icon: "🌊", subtitle: "외도·바람의언덕·매미성·저도·평화역사 탐험" },
  { id: "gyeongnam-yangsan", name: "양산시", icon: "🛕", subtitle: "통도사·천성산·황산공원 탐험" },
  { id: "gyeongnam-uiryeong", name: "의령군", icon: "🕊️", subtitle: "충익사·자굴산·솥바위 탐험" },
  { id: "gyeongnam-haman", name: "함안군", icon: "🏺", subtitle: "말이산고분군·무진정·악양 탐험" },
  { id: "gyeongnam-changnyeong", name: "창녕군", icon: "🌿", subtitle: "우포늪·화왕산·부곡온천 탐험" },
  { id: "gyeongnam-goseong", name: "고성군", icon: "🦕", subtitle: "상족암·공룡박물관·당항포 탐험" },
  { id: "gyeongnam-namhae", name: "남해군", icon: "🏝️", subtitle: "금산·독일마을·다랭이·노도·섬해안길 탐험" },
  { id: "gyeongnam-hadong", name: "하동군", icon: "🍵", subtitle: "화개장터·쌍계사·평사리 탐험" },
  { id: "gyeongnam-sancheong", name: "산청군", icon: "🌿", subtitle: "지리산계곡·봉우리·한방·사찰·경호강 탐험" },
  { id: "gyeongnam-hamyang", name: "함양군", icon: "🌲", subtitle: "상림공원·대봉산·화림동계곡 탐험" },
  { id: "gyeongnam-geochang", name: "거창군", icon: "🌉", subtitle: "창포원·감악산·Y자형출렁다리 탐험" },
  { id: "gyeongnam-hapcheon", name: "합천군", icon: "📚", subtitle: "가야산 법보·계곡·황매산·합천호·별빛 탐험" },
  ],
  4
);

const DAEGU_DISTRICT_SHAPES = createDistrictGridShapes(
  [
  { id: "daegu-jung", name: "중구", icon: "🏙️", subtitle: "근대골목·서문시장·김광석길 탐험" },
  { id: "daegu-dong", name: "동구", icon: "🏔️", subtitle: "팔공산·동화사·동촌유원지 탐험" },
  { id: "daegu-seo", name: "서구", icon: "🌿", subtitle: "이현공원·달성토성·생활문화 탐험" },
  { id: "daegu-nam", name: "남구", icon: "🎨", subtitle: "앞산·안지랑·대명공연거리 탐험" },
  { id: "daegu-buk", name: "북구", icon: "🌉", subtitle: "금호강·구암동고분군·침산 탐험" },
  { id: "daegu-suseong", name: "수성구", icon: "🌊", subtitle: "수성못·미술관·진밭골 탐험" },
  { id: "daegu-dalseo", name: "달서구", icon: "🗼", subtitle: "이월드·수목원·월광수변·선사문화 탐험" },
  { id: "daegu-dalseong", name: "달성군", icon: "🌸", subtitle: "비슬산·사문진·달성습지·도동서원 탐험" },
  { id: "daegu-gunwi", name: "군위군", icon: "🛕", subtitle: "삼국유사·화본역·팔공산 북부·한밤마을 탐험" },
  ],
  3
);


const SEJONG_DISTRICT_SHAPES = createDistrictGridShapes(
  [
    {
      id: 'sejong',
      name: '세종특별자치시',
      icon: '🏛️',
      subtitle: '행정수도·호수·정원·기록문화·원도심 탐험',
    },
  ],
  1
);

const ULSAN_DISTRICT_SHAPES = createDistrictGridShapes(
  [
    {
      id: 'ulsan-jung',
      name: '중구',
      icon: '🌿',
      subtitle: '태화강·원도심·병영성·외솔 한글문화 탐험',
    },
    {
      id: 'ulsan-nam',
      name: '남구',
      icon: '🐋',
      subtitle: '울산대공원·장생포·고래문화·도심생태 탐험',
    },
    {
      id: 'ulsan-dong',
      name: '동구',
      icon: '🌊',
      subtitle: '대왕암·일산해수욕장·슬도·주전해안 탐험',
    },
    {
      id: 'ulsan-buk',
      name: '북구',
      icon: '🚗',
      subtitle: '강동해안·정자항·무룡산·쇠부리문화 탐험',
    },
    {
      id: 'ulsan-ulju',
      name: '울주군',
      icon: '🌄',
      subtitle: '간절곶·영남알프스·반구천 암각화·옹기문화 탐험',
    },
  ],
  3
);

const EXTENDED_REGION_CONFIG: Record<
  ExtendedMapLevel,
  {
    title: string;
    shortTitle: string;
    unitLabel: string;
    shapes: ExtendedDistrictShape[];
    firstDistrictId: string;
    openCount: number;
  }
> = {
  jeonnam: {
    title: '전남권',
    shortTitle: '전남',
    unitLabel: '시·군',
    shapes: JEONNAM_DISTRICT_SHAPES,
    firstDistrictId: 'jeonnam-mokpo',
    openCount: 22,
  },
  gyeongbuk: {
    title: '경상북도',
    shortTitle: '경북',
    unitLabel: '시·군',
    shapes: GYEONGBUK_DISTRICT_SHAPES,
    firstDistrictId: 'gyeongbuk-pohang',
    openCount: 22,
  },
  gyeongnam: {
    title: '경상남도',
    shortTitle: '경남',
    unitLabel: '시·군',
    shapes: GYEONGNAM_DISTRICT_SHAPES,
    firstDistrictId: 'gyeongnam-changwon',
    openCount: 18,
  },
  daegu: {
    title: '대구광역시',
    shortTitle: '대구',
    unitLabel: '구·군',
    shapes: DAEGU_DISTRICT_SHAPES,
    firstDistrictId: 'daegu-jung',
    openCount: 9,
  },
  sejong: {
    title: '세종특별자치시',
    shortTitle: '세종',
    unitLabel: '지역',
    shapes: SEJONG_DISTRICT_SHAPES,
    firstDistrictId: 'sejong',
    openCount: 1,
  },
  ulsan: {
    title: '울산광역시',
    shortTitle: '울산',
    unitLabel: '구·군',
    shapes: ULSAN_DISTRICT_SHAPES,
    firstDistrictId: 'ulsan-jung',
    openCount: 5,
  },
};

const isExtendedMapLevel = (
  value: ExplorationMapLevel
): value is ExtendedMapLevel =>
  value === 'jeonnam' ||
  value === 'gyeongbuk' ||
  value === 'gyeongnam' ||
  value === 'daegu' ||
  value === 'sejong' ||
  value === 'ulsan';

type JejuCityShape = {
  id: 'jeju-si' | 'seogwipo-si';
  name: string;
  icon: string;
  subtitle: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * 제주특별자치도는 제주시와 서귀포시 두 행정시로 나눕니다.
 * 제주시와 서귀포시의 실제 장소·GPS·테마 데이터가 모두 연결되어 있습니다.
 */
const JEJU_CITY_SHAPES: JejuCityShape[] = [
  {
    id: 'jeju-si',
    name: '제주시',
    icon: '🍊',
    subtitle: '한라산 북쪽·동서 해안 탐험',
    points:
      '34,108 50,78 82,52 126,35 176,27 226,33 270,51 309,79 326,105 290,112 250,109 210,104 168,108 125,104 80,111',
    labelX: 176,
    labelY: 72,
  },
  {
    id: 'seogwipo-si',
    name: '서귀포시',
    icon: '🌴',
    subtitle: '한라산 남쪽·폭포와 올레 탐험',
    points:
      '34,108 80,111 125,104 168,108 210,104 250,109 290,112 326,105 313,137 279,163 231,182 176,191 118,181 72,158 44,134',
    labelX: 180,
    labelY: 151,
  },
];

const OPEN_EXPLORATION_DISTRICT_IDS = new Set<string>([
  'jongno',
  'jung',
  'seodaemun',
  'yongsan',
  'mapo',
  'eunpyeong',
  'seongbuk',
  'dongdaemun',
  'jungnang',
  'gangbuk',
  'dobong',
  'nowon',
  'seongdong',
  'gwangjin',
  'gangdong',
  'songpa',
  'gangnam',
  'seocho',
  'dongjak',
  'gwanak',
  'yeongdeungpo',
  'guro',
  'geumcheon',
  'yangcheon',
  'gangseo',
  'busan-jung',
  'busan-seo',
  'busan-dong',
  'busan-yeongdo',
  'busan-busanjin',
  'busan-dongnae',
  'busan-nam',
  'busan-buk',
  'busan-geumjeong',
  'busan-gangseo',
  'busan-sasang',
  'busan-saha',
  'busan-yeonje',
  'busan-suyeong',
  'busan-haeundae',
  'busan-gijang',
  'jeju-si',
  'seogwipo-si',
  'incheon-jemulpo',
  'incheon-yeongjong',
  'incheon-michuhol',
  'incheon-yeonsu',
  'incheon-namdong',
  'incheon-bupyeong',
  'incheon-gyeyang',
  'incheon-seohae',
  'incheon-geomdan',
  'incheon-ganghwa',
  'incheon-ongjin',
  'gangwon-sokcho',
  'gangwon-gangneung',
  'gangwon-donghae',
  'gangwon-taebaek',
  'gangwon-samcheok',
  'gangwon-hongcheon',
  'gangwon-hoengseong',
  'gangwon-yeongwol',
  'gangwon-pyeongchang',
  'gangwon-jeongseon',
  'gangwon-cheorwon',
  'gangwon-hwacheon',
  'gangwon-yanggu',
  'gangwon-inje',
  'gangwon-goseong',
  'gangwon-yangyang',
  'gangwon-chuncheon',
  'gangwon-wonju',
  'gyeonggi-suwon',
  'gyeonggi-yongin',
  'gyeonggi-gapyeong',
  'gyeonggi-paju',
  'gyeonggi-goyang',
  'gyeonggi-gwacheon',
  'gyeonggi-guri',
  'gyeonggi-namyangju',
  'gyeonggi-osan',
  'gyeonggi-siheung',
  'gyeonggi-gunpo',
  'gyeonggi-uiwang',
  'gyeonggi-hanam',
  'gyeonggi-icheon',
  'gyeonggi-anseong',
  'gyeonggi-gimpo',
  'gyeonggi-hwaseong',
  'gyeonggi-gwangju',
  'gyeonggi-yangju',
  'gyeonggi-pocheon',
  'gyeonggi-yeoju',
  'gyeonggi-yeoncheon',
  'gyeonggi-yangpyeong',
  'gyeonggi-dongducheon',
  'gyeonggi-uijeongbu',
  'gyeonggi-anyang',
  'gyeonggi-bucheon',
  'gyeonggi-gwangmyeong',
  'gyeonggi-pyeongtaek',
  'gyeonggi-ansan',
  'gyeonggi-seongnam',
  'daejeon-yuseong',
  'daejeon-jung',
  'daejeon-dong',
  'daejeon-seo',
  "daejeon-daedeok",
  "gwangju-dong",
  "gwangju-nam",
  "gwangju-seo",
  "gwangju-buk",
  "gwangju-gwangsan",
  "chungbuk-cheongju",
  "chungbuk-chungju",
  "chungbuk-jecheon",
  "chungbuk-danyang",
  "chungbuk-boeun",
  "chungbuk-okcheon",
  "chungbuk-yeongdong",
  "chungbuk-jeungpyeong",
  "chungbuk-jincheon",
  "chungbuk-goesan",
  "chungbuk-eumseong",
  "chungnam-cheonan",
  "chungnam-gongju",
  "chungnam-boryeong",
  "chungnam-asan",
  "chungnam-seosan",
  "chungnam-nonsan",
  "chungnam-gyeryong",
  "chungnam-dangjin",
  "chungnam-geumsan",
  "chungnam-buyeo",
  "chungnam-seocheon",
  "chungnam-cheongyang",
  "chungnam-hongseong",
  "chungnam-yesan",
  "chungnam-taean",
  "jeonbuk-jeonju",
  "jeonbuk-gunsan",
  "jeonbuk-iksan",
  'jeonbuk-wanju',
  'jeonbuk-jinan',
  'jeonbuk-muju',
  'jeonbuk-gimje',
  'jeonbuk-buan',
  'jeonbuk-jeongeup',
  'jeonbuk-gochang',
  'jeonbuk-imsil',
  'jeonbuk-jangsu',
  'jeonbuk-sunchang',
  'jeonbuk-namwon',
  'jeonnam-mokpo',
  'jeonnam-yeosu',
  'jeonnam-suncheon',
  'jeonnam-naju',
  'jeonnam-gwangyang',
  'jeonnam-damyang',
  'jeonnam-gokseong',
  'jeonnam-gurye',
  'jeonnam-goheung',
  'jeonnam-boseong',
  'jeonnam-hwasun',
  'jeonnam-jangheung',
  'jeonnam-gangjin',
  'jeonnam-haenam',
  'jeonnam-yeongam',
  'jeonnam-muan',
  'jeonnam-hampyeong',
  'jeonnam-yeonggwang',
  'jeonnam-jangseong',
  'jeonnam-wando',
  'jeonnam-jindo',
  'jeonnam-sinan',
  'gyeongbuk-pohang',
  'gyeongbuk-gyeongju',
  'gyeongbuk-gimcheon',
  'gyeongbuk-andong',
  'gyeongbuk-gumi',
  'gyeongbuk-yeongju',
  'gyeongbuk-yeongcheon',
  'gyeongbuk-sangju',
  'gyeongbuk-mungyeong',
  'gyeongbuk-gyeongsan',
  'gyeongbuk-uiseong',
  'gyeongbuk-cheongsong',
  'gyeongbuk-yeongyang',
  'gyeongbuk-yeongdeok',
  'gyeongbuk-cheongdo',
  'gyeongbuk-goryeong',
  'gyeongbuk-seongju',
  'gyeongbuk-chilgok',
  'gyeongbuk-yecheon',
  'gyeongbuk-bonghwa',
  'gyeongbuk-uljin',
  'gyeongbuk-ulleung',
  'gyeongnam-changwon',
  'gyeongnam-jinju',
  'gyeongnam-tongyeong',
  'gyeongnam-sacheon',
  'gyeongnam-gimhae',
  'gyeongnam-miryang',
  'gyeongnam-geoje',
  'gyeongnam-yangsan',
  'gyeongnam-uiryeong',
  'gyeongnam-haman',
  'gyeongnam-changnyeong',
  'gyeongnam-goseong',
  'gyeongnam-namhae',
  'gyeongnam-hadong',
  'gyeongnam-sancheong',
  'gyeongnam-hamyang',
  'gyeongnam-geochang',
  'gyeongnam-hapcheon',
  'daegu-jung',
  'daegu-dong',
  'daegu-seo',
  'daegu-nam',
  'daegu-buk',
  'daegu-suseong',
  'daegu-dalseo',
  'daegu-dalseong',
  'daegu-gunwi',
  'sejong',
  'ulsan-jung',
  'ulsan-nam',
  'ulsan-dong',
  'ulsan-buk',
  'ulsan-ulju',
]);

const EXPLORATION_DISTRICT_FALLBACKS: Record<string, any> = {
  jongno: {
    id: 'jongno',
    name: '종로구',
    icon: '🏯',
    available: true,
    order: 1,
    subtitle: '궁궐·역사·골목 탐험',
    centerLatitude: 37.5759,
    centerLongitude: 126.9822,
  },
  jung: {
    id: 'jung',
    name: '중구',
    icon: '🏙️',
    available: true,
    order: 2,
    subtitle: '도심·근현대·산책 탐험',
    centerLatitude: 37.5612,
    centerLongitude: 126.9941,
  },
  seodaemun: {
    id: 'seodaemun',
    name: '서대문구',
    icon: '🕊️',
    available: true,
    order: 3,
    subtitle: '독립·캠퍼스·자연 탐험',
    centerLatitude: 37.5763,
    centerLongitude: 126.9448,
  },
  yongsan: {
    id: 'yongsan',
    name: '용산구',
    icon: '🗼',
    available: true,
    order: 4,
    subtitle: '역사·문화·한강 탐험',
    centerLatitude: 37.5326,
    centerLongitude: 126.9905,
  },
  mapo: {
    id: 'mapo',
    name: '마포구',
    icon: '🌉',
    available: true,
    order: 5,
    subtitle: '문화·시장·한강 탐험',
    centerLatitude: 37.5663,
    centerLongitude: 126.9019,
  },
  eunpyeong: {
    id: 'eunpyeong',
    name: '은평구',
    icon: '⛰️',
    available: true,
    order: 6,
    subtitle: '한옥·사찰·숲길 탐험',
    centerLatitude: 37.6176,
    centerLongitude: 126.9227,
  },
  seongbuk: {
    id: 'seongbuk',
    name: '성북구',
    icon: '📚',
    available: true,
    order: 7,
    subtitle: '왕릉·인문·성곽 탐험',
    centerLatitude: 37.6068,
    centerLongitude: 127.023,
  },
  dongdaemun: {
    id: 'dongdaemun',
    name: '동대문구',
    icon: '🌿',
    available: true,
    order: 8,
    subtitle: '한방·왕실·숲길 탐험',
    centerLatitude: 37.5744,
    centerLongitude: 127.0396,
  },
  jungnang: {
    id: 'jungnang',
    name: '중랑구',
    icon: '🌹',
    available: true,
    order: 9,
    subtitle: '역사·장미·산길 탐험',
    centerLatitude: 37.6066,
    centerLongitude: 127.0927,
  },
  gangbuk: {
    id: 'gangbuk',
    name: '강북구',
    icon: '🏔️',
    available: true,
    order: 10,
    subtitle: '민주·북한산·숲 탐험',
    centerLatitude: 37.6396,
    centerLongitude: 127.0257,
  },
  dobong: {
    id: 'dobong',
    name: '도봉구',
    icon: '🏞️',
    available: true,
    order: 11,
    subtitle: '도봉산·문학·생활문화 탐험',
    centerLatitude: 37.6688,
    centerLongitude: 127.0471,
  },
  nowon: {
    id: 'nowon',
    name: '노원구',
    icon: '🚂',
    available: true,
    order: 12,
    subtitle: '철도·왕릉·과학·산길 탐험',
    centerLatitude: 37.6542,
    centerLongitude: 127.0759,
  },
  seongdong: {
    id: 'seongdong',
    name: '성동구',
    icon: '🌳',
    available: true,
    order: 13,
    subtitle: '서울숲·성수·물길·도시재생 탐험',
    centerLatitude: 37.5507,
    centerLongitude: 127.0409,
  },
  gwangjin: {
    id: 'gwangjin',
    name: '광진구',
    icon: '🏕️',
    available: true,
    order: 14,
    subtitle: '아차산·가족문화·한강 탐험',
    centerLatitude: 37.5385,
    centerLongitude: 127.0823,
  },
  gangdong: {
    id: 'gangdong',
    name: '강동구',
    icon: '🏺',
    available: true,
    order: 15,
    subtitle: '선사·생태·그린웨이·한강 탐험',
    centerLatitude: 37.5504,
    centerLongitude: 127.147,
  },
  songpa: {
    id: 'songpa',
    name: '송파구',
    icon: '🏟️',
    available: true,
    order: 16,
    subtitle: '백제·올림픽·호수·한강 탐험',
    centerLatitude: 37.5048,
    centerLongitude: 127.1147,
  },
  gangnam: {
    id: 'gangnam',
    name: '강남구',
    icon: '🌃',
    available: true,
    order: 17,
    subtitle: '역사·K컬처·도시·숲길 탐험',
    centerLatitude: 37.5172,
    centerLongitude: 127.0473,
  },
  seocho: {
    id: 'seocho',
    name: '서초구',
    icon: '🎼',
    available: true,
    order: 18,
    subtitle: '예술·왕릉·한강·숲길 탐험',
    centerLatitude: 37.4837,
    centerLongitude: 127.0324,
  },
  dongjak: {
    id: 'dongjak',
    name: '동작구',
    icon: '🕊️',
    available: true,
    order: 19,
    subtitle: '충절·노량진·한강·숲길 탐험',
    centerLatitude: 37.5124,
    centerLongitude: 126.9393,
  },

  gwanak: {
    id: 'gwanak',
    name: '관악구',
    icon: '⛰️',
    available: true,
    order: 20,
    subtitle: '강감찬·대학·박물관·관악산 탐험',
    centerLatitude: 37.4784,
    centerLongitude: 126.9516,
  },
  yeongdeungpo: {
    id: 'yeongdeungpo',
    name: '영등포구',
    icon: '🏙️',
    available: true,
    order: 21,
    subtitle: '국회·방송·문래·한강 생태 탐험',
    centerLatitude: 37.5264,
    centerLongitude: 126.8963,
  },

  guro: {
    id: 'guro',
    name: '구로구',
    icon: '⚙️',
    available: true,
    order: 22,
    subtitle: '돔·디지털산업·예술·수목원 탐험',
    centerLatitude: 37.4954,
    centerLongitude: 126.8874,
  },

  geumcheon: {
    id: 'geumcheon',
    name: '금천구',
    icon: '🐯',
    available: true,
    order: 23,
    subtitle: '산성·행궁·산업문화·숲과 물길 탐험',
    centerLatitude: 37.4569,
    centerLongitude: 126.8954,
  },

  yangcheon: {
    id: 'yangcheon',
    name: '양천구',
    icon: '🌿',
    available: true,
    order: 24,
    subtitle: '호수·목동문화·근대유산·숲과 물길 탐험',
    centerLatitude: 37.5169,
    centerLongitude: 126.8664,
  },
  gangseo: {
    id: 'gangseo',
    name: '강서구',
    icon: '✈️',
    available: true,
    order: 25,
    subtitle: '식물·항공·역사문화·한강습지 탐험',
    centerLatitude: 37.5658,
    centerLongitude: 126.8227,
  },
};

function isExplorationDistrictOpen(
  districtId: unknown,
  catalogAvailable?: boolean | null
) {
  const normalized = String(districtId ?? '').trim();

  return (
    catalogAvailable === true ||
    OPEN_EXPLORATION_DISTRICT_IDS.has(normalized)
  );
}


/*
 * react-native-svg의 G/Polygon onPress는 Android ScrollView 안에서
 * 터치가 전달되지 않는 경우가 있습니다.
 *
 * 그래서 지도 전체를 Pressable로 받고, 누른 좌표가 어느 구의
 * Polygon 내부인지 직접 계산합니다.
 */
function parsePolygonPoints(points: string) {
  return points
    .trim()
    .split(/\s+/)
    .map((point) => {
      const [x, y] = point.split(',').map(Number);
      return { x, y };
    })
    .filter(
      (point) =>
        Number.isFinite(point.x) && Number.isFinite(point.y)
    );
}

function isPointInsidePolygon(
  x: number,
  y: number,
  polygonPoints: Array<{ x: number; y: number }>
) {
  if (polygonPoints.length < 3) return false;

  let inside = false;

  for (
    let currentIndex = 0, previousIndex = polygonPoints.length - 1;
    currentIndex < polygonPoints.length;
    previousIndex = currentIndex++
  ) {
    const current = polygonPoints[currentIndex];
    const previous = polygonPoints[previousIndex];

    const crossesHorizontalRay =
      current.y > y !== previous.y > y &&
      x <
        ((previous.x - current.x) * (y - current.y)) /
          (previous.y - current.y || Number.EPSILON) +
          current.x;

    if (crossesHorizontalRay) {
      inside = !inside;
    }
  }

  return inside;
}

type ExplorationRewardData = {
  points: number;
  unlockedBuildingIds: string[];
  unlockedStampIds: string[];
  unlockedThemeBadgeIds: string[];
};

const EMPTY_REWARDS: ExplorationRewardData = {
  points: 0,
  unlockedBuildingIds: [],
  unlockedStampIds: [],
  unlockedThemeBadgeIds: [],
};

export default function ExploreScreen() {
  const { theme, isCityBlack } = useRootTheme();
  const insets = useSafeAreaInsets();

  const [mapLevel, setMapLevel] =
    useState<ExplorationMapLevel>('korea');
  const [explorationContentMode, setExplorationContentMode] =
    useState<'places' | 'festivals'>('places');
  const [festivalScope, setFestivalScope] =
    useState<'district' | 'region'>('region');
  const [selectedDistrictId, setSelectedDistrictId] = useState('jongno');
  const [completedPlaceIds, setCompletedPlaceIds] = useState<string[]>([]);
  const [rewards, setRewards] = useState<ExplorationRewardData>(EMPTY_REWARDS);
  const [mainBadgeId, setMainBadgeId] = useState<string | null>(null);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [nationalFestivalModalVisible, setNationalFestivalModalVisible] =
    useState(false);
  const [seoulCultureModalVisible, setSeoulCultureModalVisible] =
    useState(false);
  const [seoulCultureEvents, setSeoulCultureEvents] =
    useState<SeoulCultureEvent[]>([]);
  const [seoulCultureLoading, setSeoulCultureLoading] =
    useState(false);
  const [seoulCultureError, setSeoulCultureError] =
    useState<string | null>(null);
  const [seoulCultureFetchedAt, setSeoulCultureFetchedAt] =
    useState('');
  const [seoulCultureSampleMode, setSeoulCultureSampleMode] =
    useState(false);
  const [seoulCultureStaleCache, setSeoulCultureStaleCache] =
    useState(false);
  const [seoulCulturePeriodFilter, setSeoulCulturePeriodFilter] =
    useState<SeoulCulturePeriodFilter>('thisMonth');
  const [seoulCultureTypeFilter, setSeoulCultureTypeFilter] =
    useState<SeoulCultureTypeFilter>('all');
  const [seoulCultureConditionFilter, setSeoulCultureConditionFilter] =
    useState<SeoulCultureConditionFilter>('all');
  const [seoulCultureDistrictFilter, setSeoulCultureDistrictFilter] =
    useState('all');
  const [seoulCultureAudienceFilter, setSeoulCultureAudienceFilter] =
    useState<NationalFestivalAudienceFilter>('all');
  const [
    nationalFestivalRegionFilter,
    setNationalFestivalRegionFilter,
  ] = useState<NationalFestivalRegionFilter>('all');
  const [
    nationalFestivalPeriodFilter,
    setNationalFestivalPeriodFilter,
  ] = useState<NationalFestivalPeriodFilter>(
    'thisMonth'
  );
  const [
    nationalFestivalAudienceFilter,
    setNationalFestivalAudienceFilter,
  ] = useState<NationalFestivalAudienceFilter>(
    'all'
  );

  const nationalFestivalPeriodOptions =
    useMemo(
      () =>
        getNationalFestivalPeriodFilters(
          new Date()
        ),
      []
    );

  const nationalFestivalRegionList =
    useMemo(
      () =>
        nationalFestivalRegionFilter ===
        'all'
          ? FESTIVAL_CATALOG
          : FESTIVAL_CATALOG.filter(
              (festival) =>
                festival.regionId ===
                nationalFestivalRegionFilter
            ),
      [nationalFestivalRegionFilter]
    );

  const nationalFestivalPeriodCounts =
    useMemo(
      () =>
        nationalFestivalPeriodOptions.reduce(
          (result, option) => {
            result[option.id] =
              filterFestivalsByPeriod(
                nationalFestivalRegionList,
                option.id
              ).length;

            return result;
          },
          {} as Record<
            NationalFestivalPeriodFilter,
            number
          >
        ),
      [
        nationalFestivalPeriodOptions,
        nationalFestivalRegionList,
      ]
    );

  const nationalFestivalPeriodList =
    useMemo(
      () =>
        filterFestivalsByPeriod(
          nationalFestivalRegionList,
          nationalFestivalPeriodFilter
        ),
      [
        nationalFestivalPeriodFilter,
        nationalFestivalRegionList,
      ]
    );

  const nationalFestivalAudienceCounts =
    useMemo(
      () =>
        NATIONAL_FESTIVAL_AUDIENCE_FILTERS.reduce(
          (result, option) => {
            result[option.id] =
              nationalFestivalPeriodList.filter(
                (festival) =>
                  doesFestivalMatchAudience(
                    festival,
                    option.id
                  )
              ).length;

            return result;
          },
          {
            all: 0,
            children: 0,
            teen: 0,
            adult: 0,
            middleAge: 0,
            family: 0,
          } as Record<
            NationalFestivalAudienceFilter,
            number
          >
        ),
      [nationalFestivalPeriodList]
    );

  const nationalFestivalList = useMemo(
    () =>
      nationalFestivalPeriodList.filter(
        (festival) =>
          doesFestivalMatchAudience(
            festival,
            nationalFestivalAudienceFilter
          )
      ),
    [
      nationalFestivalAudienceFilter,
      nationalFestivalPeriodList,
    ]
  );

  const nationalFestivalRegionLabel =
    NATIONAL_FESTIVAL_REGION_FILTERS.find(
      (option) =>
        option.id ===
        nationalFestivalRegionFilter
    )?.label ?? '전체';

  const nationalFestivalPeriodLabel =
    getFestivalPeriodLabel(
      nationalFestivalPeriodFilter,
      nationalFestivalPeriodOptions
    );

  const nationalFestivalAudienceLabel =
    nationalFestivalAudienceFilter ===
    'all'
      ? '전체 대상'
      : FESTIVAL_AUDIENCE_LABELS[
          nationalFestivalAudienceFilter
        ];

  const loadSeoulCultureData = useCallback(
    async (forceRefresh = false) => {
      try {
        setSeoulCultureLoading(true);
        setSeoulCultureError(null);

        const result =
          await fetchSeoulCultureEvents({
            forceRefresh,
          });

        setSeoulCultureEvents(result.events);
        setSeoulCultureFetchedAt(
          result.fetchedAt
        );
        setSeoulCultureSampleMode(
          result.isSampleMode
        );
        setSeoulCultureStaleCache(
          result.isStaleCache
        );
      } catch (error) {
        console.log(
          'SEOUL CULTURE LOAD ERROR',
          error
        );
        setSeoulCultureError(
          error instanceof Error
            ? error.message
            : '서울 문화행사를 불러오지 못했어요.'
        );
      } finally {
        setSeoulCultureLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (
      seoulCultureModalVisible &&
      !seoulCultureFetchedAt &&
      !seoulCultureLoading
    ) {
      void loadSeoulCultureData(false);
    }
  }, [
    loadSeoulCultureData,
    seoulCultureFetchedAt,
    seoulCultureLoading,
    seoulCultureModalVisible,
  ]);

  const seoulCulturePeriodRange =
    useMemo(
      () =>
        getSeoulCulturePeriodRange(
          seoulCulturePeriodFilter
        ),
      [seoulCulturePeriodFilter]
    );

  const seoulCulturePeriodList = useMemo(
    () =>
      seoulCultureEvents.filter(
        (event) =>
          doesSeoulCultureEventOverlap(
            event,
            seoulCulturePeriodRange.start,
            seoulCulturePeriodRange.end
          ) &&
          (event.contentType !== 'exhibition' ||
            event.isLargeExhibition)
      ),
    [
      seoulCultureEvents,
      seoulCulturePeriodRange,
    ]
  );

  const seoulCultureDistrictOptions =
    useMemo(() => {
      const districts = [
        ...new Set(
          seoulCulturePeriodList
            .map((event) => event.districtName)
            .filter(
              (district) =>
                district && district !== '서울'
            )
        ),
      ].sort((first, second) =>
        first.localeCompare(second, 'ko')
      );

      return ['all', ...districts];
    }, [seoulCulturePeriodList]);

  const filteredSeoulCultureEvents =
    useMemo(
      () =>
        seoulCulturePeriodList.filter(
          (event) => {
            if (
              seoulCultureDistrictFilter !==
                'all' &&
              event.districtName !==
                seoulCultureDistrictFilter
            ) {
              return false;
            }

            if (
              seoulCultureTypeFilter !== 'all' &&
              event.contentType !==
                seoulCultureTypeFilter
            ) {
              return false;
            }

            if (
              seoulCultureConditionFilter ===
                'free' &&
              event.isFree !== true
            ) {
              return false;
            }

            if (
              seoulCultureConditionFilter ===
                'paid' &&
              event.isFree !== false
            ) {
              return false;
            }

            if (
              seoulCultureConditionFilter ===
                'reservation' &&
              event.reservationStatus ===
                'unknown'
            ) {
              return false;
            }

            if (
              seoulCultureAudienceFilter !==
                'all' &&
              !event.audiences.includes(
                seoulCultureAudienceFilter
              )
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        seoulCultureAudienceFilter,
        seoulCultureConditionFilter,
        seoulCultureDistrictFilter,
        seoulCulturePeriodList,
        seoulCultureTypeFilter,
      ]
    );

  const seoulCulturePeriodLabel =
    getSeoulCulturePeriodLabel(
      seoulCulturePeriodFilter
    );

  const [noticeModal, setNoticeModal] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [newThemeBadgeId, setNewThemeBadgeId] = useState<string | null>(null);
  const [mapLayout, setMapLayout] = useState({ width: 0, height: 0 });
  const [koreaMapLayout, setKoreaMapLayout] = useState({ width: 0, height: 0 });
  const [busanMapLayout, setBusanMapLayout] = useState({ width: 0, height: 0 });
  const [jejuMapLayout, setJejuMapLayout] = useState({ width: 0, height: 0 });
  const [incheonMapLayout, setIncheonMapLayout] = useState({ width: 0, height: 0 });
  const [gangwonMapLayout, setGangwonMapLayout] = useState({ width: 0, height: 0 });
  const [gyeonggiMapLayout, setGyeonggiMapLayout] = useState({ width: 0, height: 0 });
  const [daejeonMapLayout, setDaejeonMapLayout] = useState({ width: 0, height: 0 });
  const [gwangjuMapLayout, setGwangjuMapLayout] = useState({ width: 0, height: 0 });
  const [chungbukMapLayout, setChungbukMapLayout] = useState({ width: 0, height: 0 });
  const [chungnamMapLayout, setChungnamMapLayout] = useState({ width: 0, height: 0 });
  const [jeonbukMapLayout, setJeonbukMapLayout] = useState({ width: 0, height: 0 });
  const [extendedMapLayout, setExtendedMapLayout] = useState({ width: 0, height: 0 });
  const [selectedBusanDistrictId, setSelectedBusanDistrictId] = useState('busan-jung');
  const [selectedJejuCityId, setSelectedJejuCityId] = useState<'jeju-si' | 'seogwipo-si'>('jeju-si');
  const [selectedIncheonDistrictId, setSelectedIncheonDistrictId] = useState('incheon-jemulpo');
  const [selectedGangwonDistrictId, setSelectedGangwonDistrictId] = useState('gangwon-sokcho');
  const [selectedGyeonggiDistrictId, setSelectedGyeonggiDistrictId] = useState('gyeonggi-suwon');
  const [selectedDaejeonDistrictId, setSelectedDaejeonDistrictId] = useState('daejeon-yuseong');
  const [selectedGwangjuDistrictId, setSelectedGwangjuDistrictId] = useState('gwangju-dong');
  const [selectedChungbukDistrictId, setSelectedChungbukDistrictId] = useState('chungbuk-cheongju');
  const [selectedChungnamDistrictId, setSelectedChungnamDistrictId] = useState('chungnam-cheonan');
  const [selectedJeonbukDistrictId, setSelectedJeonbukDistrictId] = useState('jeonbuk-jeonju');
  const [placeSectionY, setPlaceSectionY] = useState(0);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const badgeNoticeShowingRef = useRef(false);

  const extendedRegionConfig = isExtendedMapLevel(mapLevel)
    ? EXTENDED_REGION_CONFIG[mapLevel]
    : null;

  const displayDistricts = useMemo(() => {
    const merged = new Map<string, any>();

    EXPLORATION_DISTRICTS
      .filter(
        (district) =>
          !String(district.id).startsWith('busan-') &&
          !String(district.id).startsWith('jeju-') &&
          !String(district.id).startsWith('incheon-') &&
          !String(district.id).startsWith('gangwon-') &&
          !String(district.id).startsWith('gyeonggi-') &&
          !String(district.id).startsWith('daejeon-') &&
          !String(district.id).startsWith('gwangju-') &&
          !String(district.id).startsWith('chungbuk-') &&
          !String(district.id).startsWith('chungnam-') &&
          !String(district.id).startsWith('jeonbuk-') &&
          !String(district.id).startsWith('jeonnam-') &&
          !String(district.id).startsWith('gyeongbuk-') &&
          !String(district.id).startsWith('gyeongnam-') &&
          !String(district.id).startsWith('daegu-') &&
          String(district.id) !== 'sejong' &&
          !String(district.id).startsWith('ulsan-')
      )
      .forEach((district) => {
        merged.set(String(district.id), district);
      });

    Object.values(EXPLORATION_DISTRICT_FALLBACKS).forEach((district) => {
      if (!merged.has(String(district.id))) {
        merged.set(String(district.id), district);
      }
    });

    return Array.from(merged.values()).sort(
      (first, second) =>
        Number(first?.order ?? 999) - Number(second?.order ?? 999)
    );
  }, []);



  const selectedDaejeonDistrict =
    DAEJEON_DISTRICT_SHAPES.find(
      (district) => district.id === selectedDaejeonDistrictId
    ) ?? DAEJEON_DISTRICT_SHAPES[0]!;

  const selectedDaejeonCatalogDistrict =
    getExplorationDistrict(selectedDaejeonDistrictId);

  const selectedDaejeonPlaces = useMemo(
    () => getExplorationPlacesByDistrict(selectedDaejeonDistrictId),
    [selectedDaejeonDistrictId]
  );

  const selectedDaejeonThemes = useMemo(
    () => getExplorationThemesByDistrict(selectedDaejeonDistrictId),
    [selectedDaejeonDistrictId]
  );

  const visitedInSelectedDaejeonDistrict = useMemo(
    () =>
      selectedDaejeonPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, selectedDaejeonPlaces]
  );

  const daejeonDistrictPercent = selectedDaejeonPlaces.length
    ? Math.round(
        (visitedInSelectedDaejeonDistrict / selectedDaejeonPlaces.length) * 100
      )
    : 0;


  const selectedGyeonggiDistrict =
    GYEONGGI_DISTRICT_SHAPES.find(
      (district) => district.id === selectedGyeonggiDistrictId
    ) ?? GYEONGGI_DISTRICT_SHAPES[0]!;

  const selectedGyeonggiCatalogDistrict =
    getExplorationDistrict(selectedGyeonggiDistrictId);

  const selectedGyeonggiPlaces = useMemo(
    () => getExplorationPlacesByDistrict(selectedGyeonggiDistrictId),
    [selectedGyeonggiDistrictId]
  );

  const selectedGyeonggiThemes = useMemo(
    () => getExplorationThemesByDistrict(selectedGyeonggiDistrictId),
    [selectedGyeonggiDistrictId]
  );

  const visitedInSelectedGyeonggiDistrict = useMemo(
    () =>
      selectedGyeonggiPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, selectedGyeonggiPlaces]
  );

  const gyeonggiDistrictPercent = selectedGyeonggiPlaces.length
    ? Math.round(
        (visitedInSelectedGyeonggiDistrict / selectedGyeonggiPlaces.length) * 100
      )
    : 0;

  const selectedGangwonDistrict =
    GANGWON_DISTRICT_SHAPES.find(
      (district) => district.id === selectedGangwonDistrictId
    ) ?? GANGWON_DISTRICT_SHAPES[0]!;

  const selectedGangwonCatalogDistrict =
    getExplorationDistrict(selectedGangwonDistrictId);

  const selectedGangwonPlaces = useMemo(
    () => getExplorationPlacesByDistrict(selectedGangwonDistrictId),
    [selectedGangwonDistrictId]
  );

  const selectedGangwonThemes = useMemo(
    () => getExplorationThemesByDistrict(selectedGangwonDistrictId),
    [selectedGangwonDistrictId]
  );

  const visitedInSelectedGangwonDistrict = useMemo(
    () =>
      selectedGangwonPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, selectedGangwonPlaces]
  );

  const gangwonDistrictPercent = selectedGangwonPlaces.length
    ? Math.round(
        (visitedInSelectedGangwonDistrict / selectedGangwonPlaces.length) * 100
      )
    : 0;

  const selectedIncheonDistrict =
    INCHEON_DISTRICT_SHAPES.find(
      (district) => district.id === selectedIncheonDistrictId
    ) ?? INCHEON_DISTRICT_SHAPES[0]!;

  const selectedIncheonCatalogDistrict =
    getExplorationDistrict(selectedIncheonDistrictId);

  const selectedIncheonPlaces = useMemo(
    () => getExplorationPlacesByDistrict(selectedIncheonDistrictId),
    [selectedIncheonDistrictId]
  );

  const selectedIncheonThemes = useMemo(
    () => getExplorationThemesByDistrict(selectedIncheonDistrictId),
    [selectedIncheonDistrictId]
  );

  const visitedInSelectedIncheonDistrict = useMemo(
    () =>
      selectedIncheonPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, selectedIncheonPlaces]
  );

  const incheonDistrictPercent = selectedIncheonPlaces.length
    ? Math.round(
        (visitedInSelectedIncheonDistrict / selectedIncheonPlaces.length) * 100
      )
    : 0;

  const selectedJejuCity =
    JEJU_CITY_SHAPES.find(
      (city) => city.id === selectedJejuCityId
    ) ?? JEJU_CITY_SHAPES[0]!;

  const selectedBusanDistrict =
    BUSAN_DISTRICT_SHAPES.find(
      (district) => district.id === selectedBusanDistrictId
    ) ?? BUSAN_DISTRICT_SHAPES[0]!;

  const selectedBusanCatalogDistrict =
    getExplorationDistrict(selectedBusanDistrictId);

  const selectedBusanPlaces = useMemo(
    () => getExplorationPlacesByDistrict(selectedBusanDistrictId),
    [selectedBusanDistrictId]
  );

  const selectedBusanThemes = useMemo(
    () => getExplorationThemesByDistrict(selectedBusanDistrictId),
    [selectedBusanDistrictId]
  );

  const visitedInSelectedBusanDistrict = useMemo(
    () =>
      selectedBusanPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, selectedBusanPlaces]
  );

  const busanDistrictPercent = selectedBusanPlaces.length
    ? Math.round(
        (visitedInSelectedBusanDistrict / selectedBusanPlaces.length) * 100
      )
    : 0;

  const selectedJejuCatalogDistrict =
    getExplorationDistrict(selectedJejuCityId);

  const selectedJejuPlaces = useMemo(
    () => getExplorationPlacesByDistrict(selectedJejuCityId),
    [selectedJejuCityId]
  );

  const selectedJejuThemes = useMemo(
    () => getExplorationThemesByDistrict(selectedJejuCityId),
    [selectedJejuCityId]
  );

  const visitedInSelectedJejuCity = useMemo(
    () =>
      selectedJejuPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, selectedJejuPlaces]
  );

  const jejuCityPercent = selectedJejuPlaces.length
    ? Math.round(
        (visitedInSelectedJejuCity / selectedJejuPlaces.length) * 100
      )
    : 0;

  const seoulPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter(
        (place) =>
          !String(place.districtId).startsWith('busan-') &&
          !String(place.districtId).startsWith('jeju-') &&
          !String(place.districtId).startsWith('incheon-') &&
          !String(place.districtId).startsWith('gangwon-') &&
          !String(place.districtId).startsWith('gyeonggi-') &&
          !String(place.districtId).startsWith('daejeon-') &&
          !String(place.districtId).startsWith('gwangju-') &&
          !String(place.districtId).startsWith('chungbuk-') &&
          !String(place.districtId).startsWith('chungnam-') &&
          !String(place.districtId).startsWith('jeonbuk-') &&
          !String(place.districtId).startsWith('jeonnam-') &&
          !String(place.districtId).startsWith('gyeongbuk-') &&
          !String(place.districtId).startsWith('gyeongnam-') &&
          !String(place.districtId).startsWith('daegu-') &&
          String(place.districtId) !== 'sejong' &&
          !String(place.districtId).startsWith('ulsan-')
      ),
    []
  );

  const busanPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('busan-')
      ),
    []
  );

  const jejuPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('jeju-')
      ),
    []
  );


  const gangwonPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('gangwon-')
      ),
    []
  );

  const incheonPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('incheon-')
      ),
    []
  );


  const daejeonPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('daejeon-')
      ),
    []
  );


  const gwangjuPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('gwangju-')
      ),
    []
  );


  const chungbukPlaces = useMemo(
    () => Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
      String(place.districtId).startsWith('chungbuk-')
    ),
    []
  );


  const chungnamPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('chungnam-')
      ),
    []
  );


  const jeonbukPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('jeonbuk-')
      ),
    []
  );

  const gyeonggiPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('gyeonggi-')
      ),
    []
  );


  const jeonnamPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('jeonnam-')
      ),
    []
  );

  const gyeongbukPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('gyeongbuk-')
      ),
    []
  );

  const gyeongnamPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('gyeongnam-')
      ),
    []
  );

  const daeguPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('daegu-')
      ),
    []
  );

  const sejongPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter(
        (place) => String(place.districtId) === 'sejong'
      ),
    []
  );

  const ulsanPlaces = useMemo(
    () =>
      Object.values(EXPLORATION_PLACE_CATALOG).filter((place) =>
        String(place.districtId).startsWith('ulsan-')
      ),
    []
  );

  const seoulVisitedCount = useMemo(
    () =>
      seoulPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, seoulPlaces]
  );

  const busanVisitedCount = useMemo(
    () =>
      busanPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [busanPlaces, completedPlaceIds]
  );

  const jejuVisitedCount = useMemo(
    () =>
      jejuPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, jejuPlaces]
  );


  const gangwonVisitedCount = useMemo(
    () =>
      gangwonPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, gangwonPlaces]
  );

  const incheonVisitedCount = useMemo(
    () =>
      incheonPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, incheonPlaces]
  );


  const daejeonVisitedCount = useMemo(
    () =>
      daejeonPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, daejeonPlaces]
  );


  const gwangjuVisitedCount = useMemo(
    () =>
      gwangjuPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, gwangjuPlaces]
  );


  const chungbukVisitedCount = useMemo(
    () => chungbukPlaces.filter((place) => completedPlaceIds.includes(place.id)).length,
    [completedPlaceIds, chungbukPlaces]
  );


  const chungnamVisitedCount = useMemo(
    () =>
      chungnamPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, chungnamPlaces]
  );


  const jeonbukVisitedCount = useMemo(
    () =>
      jeonbukPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, jeonbukPlaces]
  );

  const gyeonggiVisitedCount = useMemo(
    () =>
      gyeonggiPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, gyeonggiPlaces]
  );

  const seoulEarnedPoints = useMemo(
    () =>
      seoulPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, seoulPlaces]
  );

  const busanEarnedPoints = useMemo(
    () =>
      busanPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [busanPlaces, completedPlaceIds]
  );

  const jejuEarnedPoints = useMemo(
    () =>
      jejuPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, jejuPlaces]
  );


  const gangwonEarnedPoints = useMemo(
    () =>
      gangwonPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, gangwonPlaces]
  );

  const incheonEarnedPoints = useMemo(
    () =>
      incheonPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, incheonPlaces]
  );


  const daejeonEarnedPoints = useMemo(
    () =>
      daejeonPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, daejeonPlaces]
  );


  const gwangjuEarnedPoints = useMemo(
    () =>
      gwangjuPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, gwangjuPlaces]
  );


  const chungbukEarnedPoints = useMemo(
    () => chungbukPlaces.filter((place) => completedPlaceIds.includes(place.id)).reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, chungbukPlaces]
  );


  const chungnamEarnedPoints = useMemo(
    () =>
      chungnamPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) =>
            sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, chungnamPlaces]
  );


  const jeonbukEarnedPoints = useMemo(
    () =>
      jeonbukPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) =>
            sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, jeonbukPlaces]
  );

  const gyeonggiEarnedPoints = useMemo(
    () =>
      gyeonggiPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce((sum, place) => sum + Number(place.rewardPoints ?? 0), 0),
    [completedPlaceIds, gyeonggiPlaces]
  );


  const jeonnamVisitedCount = useMemo(
    () =>
      jeonnamPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, jeonnamPlaces]
  );

  const gyeongbukVisitedCount = useMemo(
    () =>
      gyeongbukPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, gyeongbukPlaces]
  );

  const gyeongnamVisitedCount = useMemo(
    () =>
      gyeongnamPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, gyeongnamPlaces]
  );

  const daeguVisitedCount = useMemo(
    () =>
      daeguPlaces.filter((place) =>
        completedPlaceIds.includes(place.id)
      ).length,
    [completedPlaceIds, daeguPlaces]
  );


  const sejongVisitedCount = useMemo(
    () =>
      sejongPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, sejongPlaces]
  );

  const ulsanVisitedCount = useMemo(
    () =>
      ulsanPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, ulsanPlaces]
  );

  const jeonnamEarnedPoints = useMemo(
    () =>
      jeonnamPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) => sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, jeonnamPlaces]
  );

  const gyeongbukEarnedPoints = useMemo(
    () =>
      gyeongbukPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) => sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, gyeongbukPlaces]
  );

  const gyeongnamEarnedPoints = useMemo(
    () =>
      gyeongnamPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) => sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, gyeongnamPlaces]
  );

  const daeguEarnedPoints = useMemo(
    () =>
      daeguPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) => sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, daeguPlaces]
  );


  const sejongEarnedPoints = useMemo(
    () =>
      sejongPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) => sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, sejongPlaces]
  );

  const ulsanEarnedPoints = useMemo(
    () =>
      ulsanPlaces
        .filter((place) => completedPlaceIds.includes(place.id))
        .reduce(
          (sum, place) => sum + Number(place.rewardPoints ?? 0),
          0
        ),
    [completedPlaceIds, ulsanPlaces]
  );

  const selectedDistrict =
    getExplorationDistrict(selectedDistrictId) ??
    displayDistricts.find(
      (district) => String(district?.id ?? '') === selectedDistrictId
    ) ??
    EXPLORATION_DISTRICT_FALLBACKS[selectedDistrictId] ??
    displayDistricts[0];

  const selectedPlaces = useMemo(() => {
    const normalizedDistrictId = String(selectedDistrictId ?? '').trim();
    const placesFromHelper = getExplorationPlacesByDistrict(
      normalizedDistrictId
    );

    /*
     * Metro의 이전 모듈 캐시나 지역 데이터 갱신 직후에도
     * 장소 목록이 비어 보이지 않도록 카탈로그를 한 번 더 직접 확인합니다.
     */
    const places =
      placesFromHelper.length > 0
        ? placesFromHelper
        : Object.values(EXPLORATION_PLACE_CATALOG).filter(
            (place) =>
              String(place?.districtId ?? '').trim() === normalizedDistrictId
          );

    console.log('EXPLORATION DISTRICT PLACES READY', {
      districtId: normalizedDistrictId,
      placeCount: places.length,
      placeIds: places.map((place) => place.id),
    });

    return places;
  }, [selectedDistrictId]);

  const selectedThemes = useMemo(
    () => getExplorationThemesByDistrict(selectedDistrictId),
    [selectedDistrictId]
  );

  const visitedInSelectedDistrict = useMemo(
    () =>
      selectedPlaces.filter((place) => completedPlaceIds.includes(place.id))
        .length,
    [completedPlaceIds, selectedPlaces]
  );

  const districtPercent =
    selectedPlaces.length > 0
      ? Math.round((visitedInSelectedDistrict / selectedPlaces.length) * 100)
      : 0;

  const showNewThemeBadgeIfNeeded = useCallback(async (badgeIds: string[]) => {
    if (badgeNoticeShowingRef.current || badgeIds.length === 0) return;

    try {
      const raw = await AsyncStorage.getItem(EXPLORATION_BADGE_NOTICE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const seenIds = Array.isArray(parsed)
        ? parsed.map((id) => String(id ?? '')).filter(Boolean)
        : [];
      const unseenBadgeId = badgeIds.find((id) => !seenIds.includes(id));

      if (!unseenBadgeId) return;

      badgeNoticeShowingRef.current = true;
      setNewThemeBadgeId(unseenBadgeId);
    } catch (error) {
      console.log('EXPLORATION BADGE NOTICE CHECK ERROR', error);
    }
  }, []);

  const closeThemeBadgeNotice = useCallback(async () => {
    const badgeId = newThemeBadgeId;
    setNewThemeBadgeId(null);
    badgeNoticeShowingRef.current = false;

    if (!badgeId) return;

    try {
      const raw = await AsyncStorage.getItem(EXPLORATION_BADGE_NOTICE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const next = Array.from(
        new Set([
          ...(Array.isArray(parsed)
            ? parsed.map((id) => String(id ?? '')).filter(Boolean)
            : []),
          badgeId,
        ])
      );
      await AsyncStorage.setItem(
        EXPLORATION_BADGE_NOTICE_KEY,
        JSON.stringify(next)
      );
    } catch (error) {
      console.log('EXPLORATION BADGE NOTICE SAVE ERROR', error);
    }
  }, [newThemeBadgeId]);

  const applyExplorationData = useCallback(
    (data: RootExplorationData, source: 'local' | 'cloud') => {
      const nextCompleted = Array.from(
        new Set(
          (Array.isArray(data?.visitedPlaceIds) ? data.visitedPlaceIds : [])
            .map((id) => String(id ?? '').trim())
            .filter(Boolean)
        )
      );
      const nextBadges = Array.from(
        new Set(
          (Array.isArray(data?.completedThemeIds)
            ? data.completedThemeIds
            : []
          )
            .map((id) => String(id ?? '').trim())
            .filter(Boolean)
        )
      );

      setCompletedPlaceIds(nextCompleted);
      setRewards({
        points: Math.max(0, Number(data?.points ?? 0)),
        unlockedBuildingIds: Array.from(
          new Set(data?.unlockedBuildingIds ?? [])
        ),
        unlockedStampIds: Array.from(new Set(data?.unlockedStampIds ?? [])),
        unlockedThemeBadgeIds: nextBadges,
      });
      setMainBadgeId(data?.mainBadgeId ?? null);
      void showNewThemeBadgeIfNeeded(nextBadges);

      console.log(
        source === 'local'
          ? 'EXPLORE SCREEN LOCAL CLOUD DATA APPLIED'
          : 'EXPLORE SCREEN SERVER CLOUD DATA APPLIED',
        {
          visitedCount: nextCompleted.length,
          points: Number(data?.points ?? 0),
          buildingCount: data?.unlockedBuildingIds?.length ?? 0,
          stampCount: data?.unlockedStampIds?.length ?? 0,
          themeBadgeCount: nextBadges.length,
          mainBadgeId: data?.mainBadgeId ?? null,
        }
      );
    },
    [showNewThemeBadgeIfNeeded]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const local = await loadLocalExplorationData();
          if (active) applyExplorationData(local, 'local');
        } catch (error) {
          console.log('EXPLORE SCREEN LOCAL CLOUD LOAD ERROR', error);
        }

        try {
          const synced = await syncExplorationData();
          if (active) applyExplorationData(synced, 'cloud');
        } catch (error) {
          console.log('EXPLORE SCREEN SERVER CLOUD LOAD ERROR', error);
        }
      };

      void load();
      return () => {
        active = false;
      };
    }, [applyExplorationData])
  );

  const openDistrict = useCallback(
    (districtId: string) => {
      const normalizedDistrictId = String(districtId ?? '').trim();
      const catalogDistrict = getExplorationDistrict(normalizedDistrictId);
      const fallbackDistrict =
        EXPLORATION_DISTRICT_FALLBACKS[normalizedDistrictId] ?? null;
      const district = catalogDistrict ?? fallbackDistrict;
      const open = isExplorationDistrictOpen(
        normalizedDistrictId,
        catalogDistrict?.available ?? null
      );
      const placeCount = Object.values(EXPLORATION_PLACE_CATALOG).filter(
        (place) =>
          String(place?.districtId ?? '').trim() === normalizedDistrictId
      ).length;

      console.log('EXPLORATION DISTRICT OPEN CHECK', {
        districtId: normalizedDistrictId,
        districtName: district?.name ?? null,
        catalogFound: Boolean(catalogDistrict),
        catalogAvailable: catalogDistrict?.available ?? null,
        forcedOpen: OPEN_EXPLORATION_DISTRICT_IDS.has(normalizedDistrictId),
        open,
        placeCount,
      });

      if (!open) {
        setNoticeModal({
          title: `${district?.name ?? '이 지역'} 준비 중`,
          message:
            '현재 열린 지역을 먼저 탐험한 뒤 다음 지역을 순서대로 열 예정이에요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedDistrictId(normalizedDistrictId);

      /*
       * 지도나 지역 버튼을 누른 직후 선택한 지역의 장소 목록이
       * 화면 아래에 숨어 보이지 않는 문제를 막습니다.
       */
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(0, placeSectionY - 16),
          animated: true,
        });
      }, 120);
    },
    [placeSectionY]
  );



  const openKoreaRegion = useCallback(
    (regionId: string) => {
      const region = KOREA_REGION_MARKERS.find(
        (item) => item.id === regionId
      );

      if (!region) return;

      if (
        region.available &&
        (
          region.id === 'seoul' ||
          region.id === 'busan' ||
          region.id === 'incheon' ||
          region.id === 'gyeonggi' ||
          region.id === 'gangwon' ||
          region.id === 'daejeon' ||
          region.id === 'gwangju' ||
          region.id === 'chungbuk' ||
          region.id === 'chungnam' ||
          region.id === 'jeonbuk' ||
          region.id === 'jeonnam' ||
          region.id === 'gyeongbuk' ||
          region.id === 'gyeongnam' ||
          region.id === 'daegu' ||
          region.id === 'sejong' ||
          region.id === 'ulsan' ||
          region.id === 'jeju'
        )
      ) {
        setNoticeModal(null);
        setMapLevel(region.id as ExplorationMapLevel);

        if (
          region.id === 'jeonnam' ||
          region.id === 'gyeongbuk' ||
          region.id === 'gyeongnam' ||
          region.id === 'daegu' ||
          region.id === 'sejong' ||
          region.id === 'ulsan'
        ) {
          const nextConfig =
            EXTENDED_REGION_CONFIG[region.id as ExtendedMapLevel];
          setSelectedDistrictId(nextConfig.firstDistrictId);
        }

        setTimeout(() => {
          mainScrollRef.current?.scrollTo({
            y: 0,
            animated: true,
          });
        }, 80);
        return;
      }

      setNoticeModal({
        title: `${region.name} 준비 중`,
        message:
          '대한민국 17개 광역지역 탐험이 모두 열렸어요.',
      });
    },
    []
  );

  const returnToKoreaMap = useCallback(() => {
    setMapLevel('korea');
    setNoticeModal(null);

    setTimeout(() => {
      mainScrollRef.current?.scrollTo({
        y: 0,
        animated: true,
      });
    }, 80);
  }, []);

  const handleKoreaMapPress = useCallback(
    (event: any) => {
      if (
        koreaMapLayout.width <= 0 ||
        koreaMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(
        event?.nativeEvent?.locationX ?? NaN
      );
      const locationY = Number(
        event?.nativeEvent?.locationY ?? NaN
      );

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 300;
      const viewBoxHeight = 430;
      const scale = Math.min(
        koreaMapLayout.width / viewBoxWidth,
        koreaMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) {
        return;
      }

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX =
        (koreaMapLayout.width - renderedWidth) / 2;
      const offsetY =
        (koreaMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      const nearestRegion =
        KOREA_REGION_MARKERS
          .map((region) => ({
            region,
            distance:
              Math.hypot(
                svgX - region.x,
                svgY - region.y
              ),
          }))
          .sort(
            (first, second) =>
              first.distance - second.distance
          )[0];

      if (
        !nearestRegion ||
        nearestRegion.distance > 24
      ) {
        return;
      }

      openKoreaRegion(nearestRegion.region.id);
    },
    [
      koreaMapLayout.height,
      koreaMapLayout.width,
      openKoreaRegion,
    ]
  );

  const handleMapPress = useCallback(
    (event: any) => {
      if (mapLayout.width <= 0 || mapLayout.height <= 0) return;

      const locationX = Number(event?.nativeEvent?.locationX ?? NaN);
      const locationY = Number(event?.nativeEvent?.locationY ?? NaN);

      if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;

      /*
       * Svg 기본 preserveAspectRatio="xMidYMid meet"를 고려합니다.
       * 단순히 가로·세로 비율로 나누면 위아래 여백 때문에
       * 특히 중구처럼 작은 구역의 터치 위치가 어긋날 수 있습니다.
       */
      const viewBoxWidth = 360;
      const viewBoxHeight = 330;
      const scale = Math.min(
        mapLayout.width / viewBoxWidth,
        mapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX = (mapLayout.width - renderedWidth) / 2;
      const offsetY = (mapLayout.height - renderedHeight) / 2;

      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      if (
        svgX < 0 ||
        svgX > viewBoxWidth ||
        svgY < 0 ||
        svgY > viewBoxHeight
      ) {
        return;
      }

      const pressedShape = SEOUL_DISTRICT_SHAPES.find((shape) =>
        isPointInsidePolygon(
          svgX,
          svgY,
          parsePolygonPoints(shape.points)
        )
      );

      if (!pressedShape) return;

      console.log('EXPLORATION MAP DISTRICT PRESSED', {
        districtId: pressedShape.id,
        districtName: pressedShape.name,
      });

      openDistrict(pressedShape.id);
    },
    [mapLayout.height, mapLayout.width, openDistrict]
  );

  const openBusanDistrict = useCallback(
    (districtId: string) => {
      const normalizedDistrictId = String(districtId ?? '').trim();
      const shape = BUSAN_DISTRICT_SHAPES.find(
        (item) => item.id === normalizedDistrictId
      );
      const catalogDistrict = getExplorationDistrict(normalizedDistrictId);
      const open = isExplorationDistrictOpen(
        normalizedDistrictId,
        catalogDistrict?.available ?? null
      );

      if (!open || !catalogDistrict) {
        setNoticeModal({
          title: `${shape?.name ?? '이 지역'} 준비 중`,
          message:
            '부산 16개 구·군 전체 탐험이 열렸어요. 원도심·역사공원·해운대·기장 추가 명소 30곳과 새 테마도 함께 연결했어요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedBusanDistrictId(normalizedDistrictId);

      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(0, placeSectionY - 16),
          animated: true,
        });
      }, 120);
    },
    [placeSectionY]
  );

  const handleBusanMapPress = useCallback(
    (event: any) => {
      if (
        busanMapLayout.width <= 0 ||
        busanMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(
        event?.nativeEvent?.locationX ?? NaN
      );
      const locationY = Number(
        event?.nativeEvent?.locationY ?? NaN
      );

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 360;
      const viewBoxHeight = 330;
      const scale = Math.min(
        busanMapLayout.width / viewBoxWidth,
        busanMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX =
        (busanMapLayout.width - renderedWidth) / 2;
      const offsetY =
        (busanMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      const pressedShape = BUSAN_DISTRICT_SHAPES.find(
        (shape) =>
          isPointInsidePolygon(
            svgX,
            svgY,
            parsePolygonPoints(shape.points)
          )
      );

      if (!pressedShape) return;

      openBusanDistrict(pressedShape.id);
    },
    [busanMapLayout.height, busanMapLayout.width, openBusanDistrict]
  );


  const openIncheonDistrict = useCallback(
    (districtId: string) => {
      const normalizedDistrictId = String(districtId ?? '').trim();
      const shape = INCHEON_DISTRICT_SHAPES.find(
        (item) => item.id === normalizedDistrictId
      );
      const catalogDistrict = getExplorationDistrict(normalizedDistrictId);
      const open = isExplorationDistrictOpen(
        normalizedDistrictId,
        catalogDistrict?.available ?? null
      );

      if (!open || !catalogDistrict) {
        setNoticeModal({
          title: `${shape?.name ?? '이 지역'} 준비 중`,
          message:
            '제물포구·영종구·미추홀구·연수구·남동구·부평구·계양구가 열렸어요. 다음은 서해구부터 인천의 대표 장소를 순서대로 추가할 예정이에요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedIncheonDistrictId(normalizedDistrictId);
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(0, placeSectionY - 16),
          animated: true,
        });
      }, 120);
    },
    [placeSectionY]
  );

  const handleIncheonMapPress = useCallback(
    (event: any) => {
      if (incheonMapLayout.width <= 0 || incheonMapLayout.height <= 0) return;
      const locationX = Number(event?.nativeEvent?.locationX ?? NaN);
      const locationY = Number(event?.nativeEvent?.locationY ?? NaN);
      if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;

      const viewBoxWidth = 360;
      const viewBoxHeight = 340;
      const scale = Math.min(
        incheonMapLayout.width / viewBoxWidth,
        incheonMapLayout.height / viewBoxHeight
      );
      if (!Number.isFinite(scale) || scale <= 0) return;
      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX = (incheonMapLayout.width - renderedWidth) / 2;
      const offsetY = (incheonMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;
      const pressedShape = INCHEON_DISTRICT_SHAPES.find((shape) =>
        isPointInsidePolygon(svgX, svgY, parsePolygonPoints(shape.points))
      );
      if (!pressedShape) return;
      openIncheonDistrict(pressedShape.id);
    },
    [incheonMapLayout.height, incheonMapLayout.width, openIncheonDistrict]
  );



  const openGyeonggiDistrict = useCallback(
    (districtId: string) => {
      const normalizedDistrictId = String(districtId ?? '').trim();
      const shape = GYEONGGI_DISTRICT_SHAPES.find(
        (item) => item.id === normalizedDistrictId
      );
      const catalogDistrict = getExplorationDistrict(normalizedDistrictId);
      const open = isExplorationDistrictOpen(
        normalizedDistrictId,
        catalogDistrict?.available ?? null
      );

      if (!open || !catalogDistrict) {
        setNoticeModal({
          title: `${shape?.name ?? '이 지역'} 준비 중`,
          message:
            '경기도 31개 시·군의 탐험이 모두 열렸어요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedGyeonggiDistrictId(normalizedDistrictId);

      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(0, placeSectionY - 16),
          animated: true,
        });
      }, 120);
    },
    [placeSectionY]
  );

  const handleGyeonggiMapPress = useCallback(
    (event: any) => {
      if (
        gyeonggiMapLayout.width <= 0 ||
        gyeonggiMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(event?.nativeEvent?.locationX ?? NaN);
      const locationY = Number(event?.nativeEvent?.locationY ?? NaN);
      if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;

      const viewBoxWidth = 360;
      const viewBoxHeight = 430;
      const scale = Math.min(
        gyeonggiMapLayout.width / viewBoxWidth,
        gyeonggiMapLayout.height / viewBoxHeight
      );
      if (!Number.isFinite(scale) || scale <= 0) return;

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX = (gyeonggiMapLayout.width - renderedWidth) / 2;
      const offsetY = (gyeonggiMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      const pressedShape = GYEONGGI_DISTRICT_SHAPES.find((shape) =>
        isPointInsidePolygon(
          svgX,
          svgY,
          parsePolygonPoints(shape.points)
        )
      );
      if (!pressedShape) return;
      openGyeonggiDistrict(pressedShape.id);
    },
    [
      gyeonggiMapLayout.height,
      gyeonggiMapLayout.width,
      openGyeonggiDistrict,
    ]
  );


  const openDaejeonDistrict = useCallback(
    (districtId: string) => {
      const normalizedDistrictId = String(districtId ?? '').trim();
      const shape = DAEJEON_DISTRICT_SHAPES.find(
        (item) => item.id === normalizedDistrictId
      );
      const catalogDistrict = getExplorationDistrict(normalizedDistrictId);
      const open = isExplorationDistrictOpen(
        normalizedDistrictId,
        catalogDistrict?.available ?? null
      );

      if (!open || !catalogDistrict) {
        setNoticeModal({
          title: `${shape?.name ?? '이 지역'} 준비 중`,
          message:
            '현재 유성구·중구·동구 탐험이 열렸어요. 다음은 서구부터 대전의 대표 장소와 테마를 순서대로 추가할 예정이에요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedDaejeonDistrictId(normalizedDistrictId);

      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(0, placeSectionY - 16),
          animated: true,
        });
      }, 120);
    },
    [placeSectionY]
  );

  const handleDaejeonMapPress = useCallback(
    (event: any) => {
      if (
        daejeonMapLayout.width <= 0 ||
        daejeonMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(event?.nativeEvent?.locationX ?? NaN);
      const locationY = Number(event?.nativeEvent?.locationY ?? NaN);
      if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;

      const viewBoxWidth = 360;
      const viewBoxHeight = 330;
      const scale = Math.min(
        daejeonMapLayout.width / viewBoxWidth,
        daejeonMapLayout.height / viewBoxHeight
      );
      if (!Number.isFinite(scale) || scale <= 0) return;

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX = (daejeonMapLayout.width - renderedWidth) / 2;
      const offsetY = (daejeonMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      const pressedShape = DAEJEON_DISTRICT_SHAPES.find((shape) =>
        isPointInsidePolygon(
          svgX,
          svgY,
          parsePolygonPoints(shape.points)
        )
      );
      if (!pressedShape) return;
      openDaejeonDistrict(pressedShape.id);
    },
    [
      daejeonMapLayout.height,
      daejeonMapLayout.width,
      openDaejeonDistrict,
    ]
  );


  const openGangwonDistrict = useCallback(
    (districtId: string) => {
      const normalizedDistrictId = String(districtId ?? '').trim();
      const shape = GANGWON_DISTRICT_SHAPES.find(
        (item) => item.id === normalizedDistrictId
      );
      const catalogDistrict = getExplorationDistrict(normalizedDistrictId);
      const open = isExplorationDistrictOpen(
        normalizedDistrictId,
        catalogDistrict?.available ?? null
      );

      if (!open || !catalogDistrict) {
        setNoticeModal({
          title: `${shape?.name ?? '이 지역'} 준비 중`,
          message:
            '현재 이 지역은 준비 중이에요. 열린 강원 지역부터 대표 여행지와 GPS 탐험을 이용할 수 있어요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedGangwonDistrictId(normalizedDistrictId);

      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(0, placeSectionY - 16),
          animated: true,
        });
      }, 120);
    },
    [placeSectionY]
  );

  const handleGangwonMapPress = useCallback(
    (event: any) => {
      if (
        gangwonMapLayout.width <= 0 ||
        gangwonMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(event?.nativeEvent?.locationX ?? NaN);
      const locationY = Number(event?.nativeEvent?.locationY ?? NaN);

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 360;
      const viewBoxHeight = 380;
      const scale = Math.min(
        gangwonMapLayout.width / viewBoxWidth,
        gangwonMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX =
        (gangwonMapLayout.width - renderedWidth) / 2;
      const offsetY =
        (gangwonMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      const pressedShape = GANGWON_DISTRICT_SHAPES.find((shape) =>
        isPointInsidePolygon(
          svgX,
          svgY,
          parsePolygonPoints(shape.points)
        )
      );

      if (!pressedShape) return;
      openGangwonDistrict(pressedShape.id);
    },
    [
      gangwonMapLayout.height,
      gangwonMapLayout.width,
      openGangwonDistrict,
    ]
  );


  
  const openGwangjuDistrict = useCallback(
    (districtId: string) => {
      const catalogDistrict = getExplorationDistrict(districtId);
      const open = isExplorationDistrictOpen(
        districtId,
        catalogDistrict?.available ?? null
      );

      if (!open) {
        setNoticeModal({
          title: `${catalogDistrict?.name ?? '이 지역'} 준비 중`,
          message:
            '광주권 동구·남구·서구·북구·광산구 탐험이 모두 열렸어요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedGwangjuDistrictId(districtId);
      setSelectedDistrictId(districtId);

      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(0, placeSectionY - 16),
          animated: true,
        });
      }, 120);
    },
    [placeSectionY]
  );

  const handleGwangjuMapPress = useCallback(
    (event: any) => {
      if (
        gwangjuMapLayout.width <= 0 ||
        gwangjuMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(
        event?.nativeEvent?.locationX ?? NaN
      );
      const locationY = Number(
        event?.nativeEvent?.locationY ?? NaN
      );

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 360;
      const viewBoxHeight = 330;
      const scale = Math.min(
        gwangjuMapLayout.width / viewBoxWidth,
        gwangjuMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX =
        (gwangjuMapLayout.width - renderedWidth) / 2;
      const offsetY =
        (gwangjuMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      const pressedShape = GWANGJU_DISTRICT_SHAPES.find(
        (shape) =>
          isPointInsidePolygon(
            svgX,
            svgY,
            parsePolygonPoints(shape.points)
          )
      );

      if (!pressedShape) return;
      openGwangjuDistrict(pressedShape.id);
    },
    [
      gwangjuMapLayout.height,
      gwangjuMapLayout.width,
      openGwangjuDistrict,
    ]
  );

  
  const openChungbukDistrict = useCallback(
    (districtId: string) => {
      const catalogDistrict = getExplorationDistrict(districtId);
      const open = isExplorationDistrictOpen(districtId, catalogDistrict?.available ?? null);
      if (!open) {
        setNoticeModal({ title: `${catalogDistrict?.name ?? '이 지역'} 준비 중`, message: '충청북도 11개 시·군이 모두 열렸어요. 원하는 지역을 선택해 자유롭게 탐험할 수 있어요.' });
        return;
      }
      setNoticeModal(null);
      setSelectedChungbukDistrictId(districtId);
      setSelectedDistrictId(districtId);
      setTimeout(() => mainScrollRef.current?.scrollTo({ y: Math.max(0, placeSectionY - 16), animated: true }), 120);
    },
    [placeSectionY]
  );

  const handleChungbukMapPress = useCallback(
    (event: any) => {
      if (chungbukMapLayout.width <= 0 || chungbukMapLayout.height <= 0) return;
      const locationX = Number(event?.nativeEvent?.locationX ?? NaN);
      const locationY = Number(event?.nativeEvent?.locationY ?? NaN);
      if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
      const viewBoxWidth = 370;
      const viewBoxHeight = 430;
      const scale = Math.min(chungbukMapLayout.width / viewBoxWidth, chungbukMapLayout.height / viewBoxHeight);
      if (!Number.isFinite(scale) || scale <= 0) return;
      const svgX = (locationX - (chungbukMapLayout.width - viewBoxWidth * scale) / 2) / scale;
      const svgY = (locationY - (chungbukMapLayout.height - viewBoxHeight * scale) / 2) / scale;
      const pressed = CHUNGBUK_DISTRICT_SHAPES.find((shape) => isPointInsidePolygon(svgX, svgY, parsePolygonPoints(shape.points)));
      if (pressed) openChungbukDistrict(pressed.id);
    },
    [chungbukMapLayout.height, chungbukMapLayout.width, openChungbukDistrict]
  );

  
  const openChungnamDistrict = useCallback(
    (districtId: string) => {
      const catalogDistrict =
        getExplorationDistrict(districtId);
      const open = isExplorationDistrictOpen(
        districtId,
        catalogDistrict?.available ?? null
      );

      if (!open) {
        setNoticeModal({
          title: `${catalogDistrict?.name ?? '이 지역'} 준비 중`,
          message:
            '충청남도 15개 시·군 탐험이 모두 열렸어요. 원하는 지역을 선택해 탐험을 시작해 보세요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedChungnamDistrictId(districtId);
      setSelectedDistrictId(districtId);

      setTimeout(
        () =>
          mainScrollRef.current?.scrollTo({
            y: Math.max(0, placeSectionY - 16),
            animated: true,
          }),
        120
      );
    },
    [placeSectionY]
  );

  const handleChungnamMapPress = useCallback(
    (event: any) => {
      if (
        chungnamMapLayout.width <= 0 ||
        chungnamMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(
        event?.nativeEvent?.locationX ?? NaN
      );
      const locationY = Number(
        event?.nativeEvent?.locationY ?? NaN
      );

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 420;
      const viewBoxHeight = 460;
      const scale = Math.min(
        chungnamMapLayout.width / viewBoxWidth,
        chungnamMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const svgX =
        (locationX -
          (chungnamMapLayout.width -
            viewBoxWidth * scale) /
            2) /
        scale;
      const svgY =
        (locationY -
          (chungnamMapLayout.height -
            viewBoxHeight * scale) /
            2) /
        scale;

      const pressed = CHUNGNAM_DISTRICT_SHAPES.find(
        (shape) =>
          isPointInsidePolygon(
            svgX,
            svgY,
            parsePolygonPoints(shape.points)
          )
      );

      if (pressed) {
        openChungnamDistrict(pressed.id);
      }
    },
    [
      chungnamMapLayout.height,
      chungnamMapLayout.width,
      openChungnamDistrict,
    ]
  );

  
  const openJeonbukDistrict = useCallback(
    (districtId: string) => {
      const catalogDistrict =
        getExplorationDistrict(districtId);
      const open = isExplorationDistrictOpen(
        districtId,
        catalogDistrict?.available ?? null
      );

      if (!open) {
        setNoticeModal({
          title: `${catalogDistrict?.name ?? '이 지역'} 준비 중`,
          message:
            '전북특별자치도 14개 시·군 탐험이 모두 열렸어요.',
        });
        return;
      }

      setNoticeModal(null);
      setSelectedJeonbukDistrictId(districtId);
      setSelectedDistrictId(districtId);

      setTimeout(
        () =>
          mainScrollRef.current?.scrollTo({
            y: Math.max(0, placeSectionY - 16),
            animated: true,
          }),
        120
      );
    },
    [placeSectionY]
  );

  const handleJeonbukMapPress = useCallback(
    (event: any) => {
      if (
        jeonbukMapLayout.width <= 0 ||
        jeonbukMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(
        event?.nativeEvent?.locationX ?? NaN
      );
      const locationY = Number(
        event?.nativeEvent?.locationY ?? NaN
      );

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 420;
      const viewBoxHeight = 460;
      const scale = Math.min(
        jeonbukMapLayout.width / viewBoxWidth,
        jeonbukMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const svgX =
        (locationX -
          (jeonbukMapLayout.width -
            viewBoxWidth * scale) /
            2) /
        scale;
      const svgY =
        (locationY -
          (jeonbukMapLayout.height -
            viewBoxHeight * scale) /
            2) /
        scale;

      const pressed = JEONBUK_DISTRICT_SHAPES.find(
        (shape) =>
          isPointInsidePolygon(
            svgX,
            svgY,
            parsePolygonPoints(shape.points)
          )
      );

      if (pressed) {
        openJeonbukDistrict(pressed.id);
      }
    },
    [
      jeonbukMapLayout.height,
      jeonbukMapLayout.width,
      openJeonbukDistrict,
    ]
  );


  const handleExtendedMapPress = useCallback(
    (event: any) => {
      if (
        !extendedRegionConfig ||
        extendedMapLayout.width <= 0 ||
        extendedMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(
        event?.nativeEvent?.locationX ?? NaN
      );
      const locationY = Number(
        event?.nativeEvent?.locationY ?? NaN
      );

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 460;
      const viewBoxHeight = 440;
      const scale = Math.min(
        extendedMapLayout.width / viewBoxWidth,
        extendedMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const svgX =
        (locationX -
          (extendedMapLayout.width -
            viewBoxWidth * scale) /
            2) /
        scale;
      const svgY =
        (locationY -
          (extendedMapLayout.height -
            viewBoxHeight * scale) /
            2) /
        scale;

      const pressed = extendedRegionConfig.shapes.find(
        (shape) =>
          isPointInsidePolygon(
            svgX,
            svgY,
            parsePolygonPoints(shape.points)
          )
      );

      if (pressed) {
        openDistrict(pressed.id);
      }
    },
    [
      extendedMapLayout.height,
      extendedMapLayout.width,
      extendedRegionConfig,
      openDistrict,
    ]
  );

  const openJejuCity = useCallback(
    (cityId: 'jeju-si' | 'seogwipo-si') => {
      setSelectedJejuCityId(cityId);
      setNoticeModal(null);
    },
    []
  );

  const handleJejuMapPress = useCallback(
    (event: any) => {
      if (
        jejuMapLayout.width <= 0 ||
        jejuMapLayout.height <= 0
      ) {
        return;
      }

      const locationX = Number(
        event?.nativeEvent?.locationX ?? NaN
      );
      const locationY = Number(
        event?.nativeEvent?.locationY ?? NaN
      );

      if (
        !Number.isFinite(locationX) ||
        !Number.isFinite(locationY)
      ) {
        return;
      }

      const viewBoxWidth = 360;
      const viewBoxHeight = 220;
      const scale = Math.min(
        jejuMapLayout.width / viewBoxWidth,
        jejuMapLayout.height / viewBoxHeight
      );

      if (!Number.isFinite(scale) || scale <= 0) return;

      const renderedWidth = viewBoxWidth * scale;
      const renderedHeight = viewBoxHeight * scale;
      const offsetX =
        (jejuMapLayout.width - renderedWidth) / 2;
      const offsetY =
        (jejuMapLayout.height - renderedHeight) / 2;
      const svgX = (locationX - offsetX) / scale;
      const svgY = (locationY - offsetY) / scale;

      const pressedShape = JEJU_CITY_SHAPES.find(
        (shape) =>
          isPointInsidePolygon(
            svgX,
            svgY,
            parsePolygonPoints(shape.points)
          )
      );

      if (!pressedShape) return;

      openJejuCity(pressedShape.id);
    },
    [
      jejuMapLayout.height,
      jejuMapLayout.width,
      openJejuCity,
    ]
  );

  const setAsMainBadge = useCallback(
    async (badgeId: string) => {
      if (!rewards.unlockedThemeBadgeIds.includes(badgeId)) return;

      try {
        const saved = await setExplorationMainBadge(badgeId);
        setMainBadgeId(saved.mainBadgeId);
      } catch (error) {
        console.log('EXPLORATION MAIN BADGE SAVE ERROR', error);
      }
    },
    [rewards.unlockedThemeBadgeIds]
  );


  const mapLevelPlaceCollections: Partial<
    Record<ExplorationMapLevel, any[]>
  > = {
    seoul: seoulPlaces,
    busan: busanPlaces,
    incheon: incheonPlaces,
    gyeonggi: gyeonggiPlaces,
    gangwon: gangwonPlaces,
    daejeon: daejeonPlaces,
    gwangju: gwangjuPlaces,
    chungbuk: chungbukPlaces,
    chungnam: chungnamPlaces,
    jeonbuk: jeonbukPlaces,
    jeonnam: jeonnamPlaces,
    gyeongbuk: gyeongbukPlaces,
    gyeongnam: gyeongnamPlaces,
    daegu: daeguPlaces,
    sejong: sejongPlaces,
    ulsan: ulsanPlaces,
    jeju: jejuPlaces,
  };

  const mapLevelVisitedCounts: Partial<
    Record<ExplorationMapLevel, number>
  > = {
    seoul: seoulVisitedCount,
    busan: busanVisitedCount,
    incheon: incheonVisitedCount,
    gyeonggi: gyeonggiVisitedCount,
    gangwon: gangwonVisitedCount,
    daejeon: daejeonVisitedCount,
    gwangju: gwangjuVisitedCount,
    chungbuk: chungbukVisitedCount,
    chungnam: chungnamVisitedCount,
    jeonbuk: jeonbukVisitedCount,
    jeonnam: jeonnamVisitedCount,
    gyeongbuk: gyeongbukVisitedCount,
    gyeongnam: gyeongnamVisitedCount,
    daegu: daeguVisitedCount,
    sejong: sejongVisitedCount,
    ulsan: ulsanVisitedCount,
    jeju: jejuVisitedCount,
  };

  const mapLevelEarnedPoints: Partial<
    Record<ExplorationMapLevel, number>
  > = {
    seoul: seoulEarnedPoints,
    busan: busanEarnedPoints,
    incheon: incheonEarnedPoints,
    gyeonggi: gyeonggiEarnedPoints,
    gangwon: gangwonEarnedPoints,
    daejeon: daejeonEarnedPoints,
    gwangju: gwangjuEarnedPoints,
    chungbuk: chungbukEarnedPoints,
    chungnam: chungnamEarnedPoints,
    jeonbuk: jeonbukEarnedPoints,
    jeonnam: jeonnamEarnedPoints,
    gyeongbuk: gyeongbukEarnedPoints,
    gyeongnam: gyeongnamEarnedPoints,
    daegu: daeguEarnedPoints,
    sejong: sejongEarnedPoints,
    ulsan: ulsanEarnedPoints,
    jeju: jejuEarnedPoints,
  };

  const mapLevelMeta: Record<
    Exclude<ExplorationMapLevel, 'korea'>,
    {
      title: string;
      shortTitle: string;
      regionCountText: string;
    }
  > = {
    seoul: {
      title: '서울특별시 탐험',
      shortTitle: '서울',
      regionCountText: '서울 25개 자치구',
    },
    busan: {
      title: '부산광역시 탐험',
      shortTitle: '부산',
      regionCountText: '부산 16개 구·군',
    },
    incheon: {
      title: '인천광역시 탐험',
      shortTitle: '인천',
      regionCountText: '인천 9개 구·2개 군',
    },
    gyeonggi: {
      title: '경기도 탐험',
      shortTitle: '경기',
      regionCountText: '경기 31개 시·군',
    },
    gangwon: {
      title: '강원특별자치도 탐험',
      shortTitle: '강원',
      regionCountText: '강원 18개 시·군',
    },
    daejeon: {
      title: '대전광역시 탐험',
      shortTitle: '대전',
      regionCountText: '대전 5개 자치구',
    },
    gwangju: {
      title: '광주권 탐험',
      shortTitle: '광주권',
      regionCountText: '광주권 5개 자치구',
    },
    chungbuk: {
      title: '충청북도 탐험',
      shortTitle: '충북',
      regionCountText: '충북 11개 시·군',
    },
    chungnam: {
      title: '충청남도 탐험',
      shortTitle: '충남',
      regionCountText: '충남 15개 시·군',
    },
    jeonbuk: {
      title: '전북특별자치도 탐험',
      shortTitle: '전북',
      regionCountText: '전북 14개 시·군',
    },
    jeonnam: {
      title: '전남권 탐험',
      shortTitle: '전남',
      regionCountText: '전남권 22개 시·군',
    },
    gyeongbuk: {
      title: '경상북도 탐험',
      shortTitle: '경북',
      regionCountText: '경북 22개 시·군',
    },
    gyeongnam: {
      title: '경상남도 탐험',
      shortTitle: '경남',
      regionCountText: '경남 18개 시·군',
    },
    daegu: {
      title: '대구광역시 탐험',
      shortTitle: '대구',
      regionCountText: '대구 9개 구·군',
    },
    sejong: {
      title: '세종특별자치시 탐험',
      shortTitle: '세종',
      regionCountText: '세종 단일 행정지역',
    },
    ulsan: {
      title: '울산광역시 탐험',
      shortTitle: '울산',
      regionCountText: '울산 5개 구·군',
    },
    jeju: {
      title: '제주특별자치도 탐험',
      shortTitle: '제주',
      regionCountText: '제주 2개 행정시',
    },
  };

  const activeFestivalDistrictId = useMemo(() => {
    if (mapLevel === 'busan') return selectedBusanDistrictId;
    if (mapLevel === 'incheon') return selectedIncheonDistrictId;
    if (mapLevel === 'gangwon') return selectedGangwonDistrictId;
    if (mapLevel === 'gyeonggi') return selectedGyeonggiDistrictId;
    if (mapLevel === 'daejeon') return selectedDaejeonDistrictId;
    if (mapLevel === 'gwangju') return selectedGwangjuDistrictId;
    if (mapLevel === 'jeju') return selectedJejuCityId;
    if (mapLevel === 'chungbuk') return selectedChungbukDistrictId;
    if (mapLevel === 'chungnam') return selectedChungnamDistrictId;
    if (mapLevel === 'jeonbuk') return selectedJeonbukDistrictId;
    if (mapLevel === 'sejong') return 'sejong';
    return selectedDistrictId;
  }, [
    mapLevel,
    selectedBusanDistrictId,
    selectedIncheonDistrictId,
    selectedGangwonDistrictId,
    selectedGyeonggiDistrictId,
    selectedDaejeonDistrictId,
    selectedGwangjuDistrictId,
    selectedJejuCityId,
    selectedChungbukDistrictId,
    selectedChungnamDistrictId,
    selectedJeonbukDistrictId,
    selectedDistrictId,
  ]);

  const selectedDistrictFestivals = useMemo(
    () => getFestivalsByDistrict(activeFestivalDistrictId),
    [activeFestivalDistrictId]
  );

  const selectedRegionFestivals = useMemo(
    () =>
      mapLevel === 'korea'
        ? []
        : getFestivalsByRegion(mapLevel as FestivalRegionId),
    [mapLevel]
  );

  const visibleFestivals =
    festivalScope === 'district'
      ? selectedDistrictFestivals
      : selectedRegionFestivals;

  const completedFestivalCount = visibleFestivals.filter((festival) =>
    completedPlaceIds.includes(festival.id)
  ).length;

  const currentMapMeta =
    mapLevel === 'korea' ? null : mapLevelMeta[mapLevel];
  const currentMapPlaces =
    mapLevel === 'korea'
      ? []
      : mapLevelPlaceCollections[mapLevel] ?? [];

  const mapLevelTitle =
    mapLevel === 'korea'
      ? '대한민국 탐험'
      : currentMapMeta?.title ?? '지역 탐험';

  const mapLevelSubtitle =
    mapLevel === 'korea'
      ? '대한민국 지도에서 탐험할 지역을 선택하세요.'
      : `${currentMapMeta?.regionCountText ?? '지역'}와 ${currentMapPlaces.length}개의 장소를 탐험해요.`;

  const summaryLabel =
    mapLevel === 'korea'
      ? '대한민국 탐험 포인트'
      : `${currentMapMeta?.shortTitle ?? '지역'} 탐험 포인트`;

  const summaryEarnedPoints =
    mapLevel === 'korea'
      ? rewards.points
      : mapLevelEarnedPoints[mapLevel] ?? 0;

  const allRegionLevels = Object.keys(
    mapLevelPlaceCollections
  ) as ExplorationMapLevel[];

  const allVisitedCount = allRegionLevels.reduce(
    (sum, level) =>
      sum + Number(mapLevelVisitedCounts[level] ?? 0),
    0
  );

  const allPlaceCount = allRegionLevels.reduce(
    (sum, level) =>
      sum + Number(mapLevelPlaceCollections[level]?.length ?? 0),
    0
  );

  const summaryVisitedCount =
    mapLevel === 'korea'
      ? allVisitedCount
      : mapLevelVisitedCounts[mapLevel] ?? 0;

  const summaryPlaceCount =
    mapLevel === 'korea'
      ? allPlaceCount
      : mapLevelPlaceCollections[mapLevel]?.length ?? 0;

  const regionalPrefixes = [
    'busan-',
    'jeju-',
    'incheon-',
    'gyeonggi-',
    'gangwon-',
    'daejeon-',
    'gwangju-',
    'chungbuk-',
    'chungnam-',
    'jeonbuk-',
    'jeonnam-',
    'gyeongbuk-',
    'gyeongnam-',
    'daegu-',
    'ulsan-',
  ];

  const mapLevelPrefix: Partial<
    Record<ExplorationMapLevel, string>
  > = {
    busan: 'busan-',
    jeju: 'jeju-',
    incheon: 'incheon-',
    gyeonggi: 'gyeonggi-',
    gangwon: 'gangwon-',
    daejeon: 'daejeon-',
    gwangju: 'gwangju-',
    chungbuk: 'chungbuk-',
    chungnam: 'chungnam-',
    jeonbuk: 'jeonbuk-',
    jeonnam: 'jeonnam-',
    gyeongbuk: 'gyeongbuk-',
    gyeongnam: 'gyeongnam-',
    daegu: 'daegu-',
    ulsan: 'ulsan-',
  };

  const summaryThemes = Object.values(
    EXPLORATION_THEME_CATALOG
  ).filter((item) => {
    if (mapLevel === 'korea') return true;

    const districtId = String(item.districtId);

    if (mapLevel === 'sejong') {
      return districtId === 'sejong';
    }

    if (mapLevel === 'seoul') {
      return (
        districtId !== 'sejong' &&
        !regionalPrefixes.some((prefix) =>
          districtId.startsWith(prefix)
        )
      );
    }

    const prefix = mapLevelPrefix[mapLevel];
    return prefix
      ? districtId.startsWith(prefix)
      : districtId.startsWith('jeju-');
  });

  const summaryUnlockedThemeCount = summaryThemes.filter((item) =>
    rewards.unlockedThemeBadgeIds.includes(item.id)
  ).length;

  const summaryProgressPercent = Math.min(
    100,
    (summaryVisitedCount /
      Math.max(1, summaryPlaceCount)) *
      100
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}> 
      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTitleArea}>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.title, { color: theme.text }]}>
                {mapLevel === 'korea'
                  ? '대한민국 지도'
                  : mapLevelTitle}
              </Text>

              {mapLevel !== 'korea' && (
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.subText },
                  ]}
                >
                  {mapLevelSubtitle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.headerActionRow}>
            {mapLevel !== 'korea' && (
              <Pressable
                onPress={returnToKoreaMap}
                style={({ pressed }) => [
                  styles.headerBackButton,
                  {
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 2 : 10,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={17}
                  color={theme.text}
                />
              </Pressable>
            )}

            <Pressable
              onPress={() => setRewardModalVisible(true)}
              style={({ pressed }) => [
                styles.rewardButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 10,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.rewardButtonText,
                  { color: theme.text },
                ]}
              >
                보상
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (mapLevel === 'korea') {
                  setNationalFestivalModalVisible(true);
                  return;
                }

                setFestivalScope('region');
                setExplorationContentMode('festivals');
              }}
              style={({ pressed }) => [
                styles.rewardButton,
                {
                  borderColor:
                    mapLevel !== 'korea' &&
                    explorationContentMode === 'festivals'
                      ? theme.strongLine ?? theme.line
                      : theme.line,
                  backgroundColor:
                    mapLevel !== 'korea' &&
                    explorationContentMode === 'festivals'
                      ? theme.background
                      : 'transparent',
                  borderRadius: isCityBlack ? 2 : 10,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.rewardButtonText,
                  { color: theme.text },
                ]}
              >
                축제
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                setSeoulCultureModalVisible(true)
              }
              style={({ pressed }) => [
                styles.rewardButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 10,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.rewardButtonText,
                  { color: theme.text },
                ]}
              >
                문화
              </Text>
            </Pressable>
          </View>
        </View>

        {mapLevel !== 'korea' && (
          <>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.summaryTop}>
                <View>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.subText },
                    ]}
                  >
                    {summaryLabel}
                  </Text>

                  <Text
                    style={[
                      styles.summaryPoints,
                      { color: theme.text },
                    ]}
                  >
                    {summaryEarnedPoints}P
                  </Text>
                </View>

                <View style={styles.summaryCounts}>
                  <Text
                    style={[
                      styles.summaryCountText,
                      { color: theme.text },
                    ]}
                  >
                    방문 {summaryVisitedCount}/{summaryPlaceCount}
                  </Text>

                  <Text
                    style={[
                      styles.summaryCountText,
                      { color: theme.text },
                    ]}
                  >
                    뱃지 {summaryUnlockedThemeCount}/{summaryThemes.length}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.background },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${summaryProgressPercent}%`,
                      backgroundColor:
                        theme.strongLine ?? theme.line,
                    },
                  ]}
                />
              </View>
            </View>

            <View
              style={[
                styles.explorationModeCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 14,
                },
              ]}
            >
              <Pressable
                onPress={() =>
                  setExplorationContentMode('places')
                }
                style={[
                  styles.explorationModeButton,
                  {
                    backgroundColor:
                      explorationContentMode === 'places'
                        ? theme.background
                        : theme.card,
                    borderColor:
                      explorationContentMode === 'places'
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                    borderRadius: isCityBlack ? 2 : 9,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.explorationModeTitle,
                    { color: theme.text },
                  ]}
                >
                  상시 탐험
                </Text>

                <Text
                  style={[
                    styles.explorationModeCount,
                    { color: theme.subText },
                  ]}
                >
                  장소 {summaryPlaceCount}곳
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setFestivalScope('region');
                  setExplorationContentMode('festivals');
                }}
                style={[
                  styles.explorationModeButton,
                  {
                    backgroundColor:
                      explorationContentMode === 'festivals'
                        ? theme.background
                        : theme.card,
                    borderColor:
                      explorationContentMode === 'festivals'
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                    borderRadius: isCityBlack ? 2 : 9,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.explorationModeTitle,
                    { color: theme.text },
                  ]}
                >
                  축제·행사·전시
                </Text>

                <Text
                  style={[
                    styles.explorationModeCount,
                    { color: theme.subText },
                  ]}
                >
                  등록 콘텐츠 {selectedRegionFestivals.length}개
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {mapLevel === 'korea' ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setKoreaMapLayout({ width, height });
                }}
                onPress={handleKoreaMapPress}
                style={({ pressed }) => [
                  styles.koreaSvgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 300 430"
                  pointerEvents="none"
                >
                  {/* 대한민국 본토: 서해·남해의 굴곡과 동해안의 긴 곡선을 강조한 단순화 윤곽 */}
                  <SvgPath
                    d="M91 31
                       C109 25 132 20 153 23
                       C176 25 198 31 214 45
                       C226 56 229 72 231 88
                       C233 106 241 119 246 136
                       C252 156 250 176 253 195
                       C256 215 253 235 246 250
                       C239 264 227 274 222 287
                       C218 297 222 306 217 315
                       C212 322 202 324 197 332
                       C191 341 184 349 174 353
                       C167 356 163 365 154 367
                       C145 369 139 361 131 360
                       C124 359 119 365 111 362
                       C103 360 99 352 91 349
                       C84 346 80 351 73 347
                       C66 343 64 335 59 330
                       C53 324 45 323 43 315
                       C41 307 47 301 43 294
                       C39 287 31 283 33 275
                       C35 267 42 261 39 253
                       C36 245 28 239 31 231
                       C34 223 42 218 39 209
                       C36 200 29 194 34 185
                       C39 176 48 171 46 161
                       C44 152 37 145 43 136
                       C49 127 58 122 57 112
                       C56 102 49 95 56 86
                       C63 77 73 73 73 63
                       C73 51 78 39 91 31 Z"
                    fill={isCityBlack ? '#343434' : '#F2E9DE'}
                    stroke={theme.strongLine ?? theme.line}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />

                  {/* 서해안과 남해안의 대표 섬 표현 */}
                  <Circle cx="24" cy="116" r="2.3" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.line} strokeWidth="0.8" />
                  <Circle cx="28" cy="158" r="1.8" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.line} strokeWidth="0.7" />
                  <Circle cx="24" cy="279" r="2.2" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.line} strokeWidth="0.8" />
                  <Circle cx="52" cy="347" r="2.4" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.line} strokeWidth="0.8" />
                  <Circle cx="84" cy="369" r="2" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.line} strokeWidth="0.8" />
                  <Circle cx="188" cy="368" r="2.2" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.line} strokeWidth="0.8" />

                  {/* 제주도 */}
                  <SvgPath
                    d="M83 400 C100 389 129 387 154 396 C147 408 132 414 108 414 C96 414 87 410 83 406 Z"
                    fill={isCityBlack ? '#343434' : '#F2E9DE'}
                    stroke={theme.strongLine ?? theme.line}
                    strokeWidth={1.2}
                  />

                  {/* 울릉도와 독도 */}
                  <Circle cx="273" cy="133" r="3.1" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.strongLine ?? theme.line} strokeWidth="0.9" />
                  <Circle cx="286" cy="146" r="1.7" fill={isCityBlack ? '#343434' : '#F2E9DE'} stroke={theme.strongLine ?? theme.line} strokeWidth="0.8" />
                  <SvgText x="271" y="125" fontSize="5.4" fill={theme.subText} textAnchor="middle">울릉</SvgText>
                  <SvgText x="286" y="140" fontSize="4.8" fill={theme.subText} textAnchor="middle">독도</SvgText>

                  {KOREA_REGION_MARKERS.map((region) => {
                    const available = region.available;
                    const highlighted = region.available;
                    const nextRegion = region.nextRegion === true;

                    return (
                      <G key={region.id}>
                        <Circle
                          cx={region.x}
                          cy={region.y}
                          r={highlighted ? 12 : nextRegion ? 9 : 5.5}
                          fill={
                            highlighted
                              ? isCityBlack
                                ? '#EFEFEF'
                                : '#D8C7B3'
                              : nextRegion
                                ? isCityBlack
                                  ? '#7A7A7A'
                                  : '#DDD1C4'
                                : isCityBlack
                                  ? '#555555'
                                  : '#D9D4CE'
                          }
                          stroke={
                            available || nextRegion
                              ? theme.strongLine ?? theme.line
                              : theme.line
                          }
                          strokeWidth={highlighted ? 2 : 1}
                          strokeDasharray={nextRegion ? '3 2' : undefined}
                        />
                        <SvgText
                          x={region.x}
                          y={region.y + (highlighted ? 3 : 2.5)}
                          fontSize={highlighted ? 7.5 : 5.5}
                          fontWeight={highlighted ? '800' : '600'}
                          fill={
                            highlighted
                              ? isCityBlack
                                ? '#111111'
                                : '#4D4035'
                              : theme.text
                          }
                          textAnchor="middle"
                        >
                          {region.shortLabel}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </Pressable>

              <View style={styles.koreaMapLegendRow}>
                <View style={styles.koreaMapLegendItem}>
                  <View
                    style={[
                      styles.koreaMapLegendDot,
                      {
                        backgroundColor: isCityBlack
                          ? '#EFEFEF'
                          : '#D8C7B3',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.koreaMapLegendText,
                      { color: theme.subText },
                    ]}
                  >
                    17개 광역지역 모두 탐험 가능
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.countryRegionButtonRow}
              >
                {KOREA_REGION_MARKERS.map((region) => (
                  <Pressable
                    key={region.id}
                    onPress={() => openKoreaRegion(region.id)}
                    style={({ pressed }) => [
                      styles.countryRegionButton,
                      {
                        backgroundColor: region.available
                          ? theme.background
                          : theme.card,
                        borderColor:
                          region.available || region.nextRegion
                            ? theme.strongLine ?? theme.line
                            : theme.line,
                        borderRadius: isCityBlack ? 2 : 10,
                        opacity: pressed ? 0.65 : region.available ? 1 : 0.68,
                      },
                    ]}
                  >
                    <Text style={styles.countryRegionIcon}>{region.icon}</Text>
                    <Text style={[styles.countryRegionName, { color: theme.text }]}>{region.name}</Text>
                    <Text style={[styles.countryRegionStatus, { color: theme.subText }]}>
                      {region.id === 'seoul'
                        ? `${seoulVisitedCount}/${seoulPlaces.length}곳`
                        : region.id === 'busan'
                          ? `${busanVisitedCount}/${busanPlaces.length}곳`
                          : region.id === 'incheon'
                            ? `${incheonVisitedCount}/${incheonPlaces.length}곳`
                            : region.id === 'gyeonggi'
                              ? `${gyeonggiVisitedCount}/${gyeonggiPlaces.length}곳`
                              : region.id === 'gangwon'
                                ? `${gangwonVisitedCount}/${gangwonPlaces.length}곳`
                                : region.id === 'jeju'
                                  ? '지도 열림'
                                  : '준비 중'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Pressable
              onPress={() => openKoreaRegion('seoul')}
              style={({ pressed }) => [
                styles.regionLaunchCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={[styles.regionLaunchIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 12 }]}>
                <Text style={styles.regionLaunchIcon}>🏙️</Text>
              </View>
              <View style={styles.regionLaunchContent}>
                <View style={styles.regionLaunchTitleRow}>
                  <Text style={[styles.regionLaunchTitle, { color: theme.text }]}>서울특별시</Text>
                  <Text style={[styles.regionLaunchPercent, { color: theme.text }]}>{Math.round((seoulVisitedCount / Math.max(1, seoulPlaces.length)) * 100)}%</Text>
                </View>
                <Text style={[styles.regionLaunchSubtitle, { color: theme.subText }]}>25개 자치구 · 탐험 장소 {seoulPlaces.length}곳</Text>
                <Text style={[styles.regionLaunchAction, { color: theme.text }]}>서울 지도 열기</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={theme.subText} />
            </Pressable>

            <Pressable
              onPress={() => openKoreaRegion('incheon')}
              style={({ pressed }) => [
                styles.regionLaunchCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={[styles.regionLaunchIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 12 }]}>
                <Text style={styles.regionLaunchIcon}>🌊</Text>
              </View>
              <View style={styles.regionLaunchContent}>
                <View style={styles.regionLaunchTitleRow}>
                  <Text style={[styles.regionLaunchTitle, { color: theme.text }]}>인천광역시</Text>
                  <Text style={[styles.regionLaunchPercent, { color: theme.text }]}>{Math.round((incheonVisitedCount / Math.max(1, incheonPlaces.length)) * 100)}%</Text>
                </View>
                <Text style={[styles.regionLaunchSubtitle, { color: theme.subText }]}>9개 구·2개 군 · 제물포구·영종구·미추홀구·연수구·남동구·부평구·계양구 70곳 탐험 가능</Text>
                <Text style={[styles.regionLaunchAction, { color: theme.text }]}>인천 지도 열기</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={theme.subText} />
            </Pressable>

            <Pressable
              onPress={() => openKoreaRegion('gyeonggi')}
              style={({ pressed }) => [
                styles.regionLaunchCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={[styles.regionLaunchIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 12 }]}>
                <Text style={styles.regionLaunchIcon}>🏰</Text>
              </View>
              <View style={styles.regionLaunchContent}>
                <View style={styles.regionLaunchTitleRow}>
                  <Text style={[styles.regionLaunchTitle, { color: theme.text }]}>경기도</Text>
                  <Text style={[styles.regionLaunchPercent, { color: theme.text }]}>{Math.round((gyeonggiVisitedCount / Math.max(1, gyeonggiPlaces.length)) * 100)}%</Text>
                </View>
                <Text style={[styles.regionLaunchSubtitle, { color: theme.subText }]}>31개 시·군 전체 · 대표 장소 310곳 탐험 가능</Text>
                <Text style={[styles.regionLaunchAction, { color: theme.text }]}>경기도 지도 열기</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={theme.subText} />
            </Pressable>

            <Pressable
              onPress={() => openKoreaRegion('busan')}
              style={({ pressed }) => [
                styles.regionLaunchCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={[styles.regionLaunchIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 12 }]}>
                <Text style={styles.regionLaunchIcon}>🌉</Text>
              </View>
              <View style={styles.regionLaunchContent}>
                <View style={styles.regionLaunchTitleRow}>
                  <Text style={[styles.regionLaunchTitle, { color: theme.text }]}>부산광역시</Text>
                  <Text style={[styles.regionLaunchPercent, { color: theme.text }]}>{Math.round((busanVisitedCount / Math.max(1, busanPlaces.length)) * 100)}%</Text>
                </View>
                <Text style={[styles.regionLaunchSubtitle, { color: theme.subText }]}>16개 구·군 전체 탐험 가능 · 탐험 장소 {busanPlaces.length}곳</Text>
                <Text style={[styles.regionLaunchAction, { color: theme.text }]}>부산 지도 열기</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={theme.subText} />
            </Pressable>


            <Pressable
              onPress={() => openKoreaRegion('gangwon')}
              style={({ pressed }) => [
                styles.regionLaunchCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={[styles.regionLaunchIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 12 }]}>
                <Text style={styles.regionLaunchIcon}>🏔️</Text>
              </View>
              <View style={styles.regionLaunchContent}>
                <View style={styles.regionLaunchTitleRow}>
                  <Text style={[styles.regionLaunchTitle, { color: theme.text }]}>강원특별자치도</Text>
                  <Text style={[styles.regionLaunchPercent, { color: theme.text }]}>{Math.round((gangwonVisitedCount / Math.max(1, gangwonPlaces.length)) * 100)}%</Text>
                </View>
                <Text style={[styles.regionLaunchSubtitle, { color: theme.subText }]}>18개 시·군 전체 탐험 가능 · 탐험 장소 {gangwonPlaces.length}곳</Text>
                <Text style={[styles.regionLaunchAction, { color: theme.text }]}>강원 지도 열기</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={theme.subText} />
            </Pressable>

            <Pressable
              onPress={() => openKoreaRegion('jeju')}
              style={({ pressed }) => [
                styles.regionLaunchCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <View style={[styles.regionLaunchIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 12 }]}>
                <Text style={styles.regionLaunchIcon}>🍊</Text>
              </View>
              <View style={styles.regionLaunchContent}>
                <View style={styles.regionLaunchTitleRow}>
                  <Text style={[styles.regionLaunchTitle, { color: theme.text }]}>제주특별자치도</Text>
                  <Text style={[styles.regionLaunchPercent, { color: theme.text }]}>지도 열림</Text>
                </View>
                <Text style={[styles.regionLaunchSubtitle, { color: theme.subText }]}>제주시 30곳 · 서귀포시 30곳 탐험 가능</Text>
                <Text style={[styles.regionLaunchAction, { color: theme.text }]}>제주 지도 열기</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={theme.subText} />
            </Pressable>
          </>
        ) : explorationContentMode === 'festivals' ? (
          <>
            <View style={styles.festivalScopeRow}>
              <Pressable
                onPress={() => setFestivalScope('region')}
                style={[
                  styles.festivalScopeButton,
                  {
                    backgroundColor: festivalScope === 'region' ? theme.background : theme.card,
                    borderColor: festivalScope === 'region' ? theme.strongLine ?? theme.line : theme.line,
                    borderRadius: isCityBlack ? 2 : 9,
                  },
                ]}
              >
                <Text style={[styles.festivalScopeText, { color: theme.text }]}>광역 전체 {selectedRegionFestivals.length}</Text>
              </Pressable>

              <Pressable
                onPress={() => setFestivalScope('district')}
                style={[
                  styles.festivalScopeButton,
                  {
                    backgroundColor: festivalScope === 'district' ? theme.background : theme.card,
                    borderColor: festivalScope === 'district' ? theme.strongLine ?? theme.line : theme.line,
                    borderRadius: isCityBlack ? 2 : 9,
                  },
                ]}
              >
                <Text style={[styles.festivalScopeText, { color: theme.text }]}>선택 지역 {selectedDistrictFestivals.length}</Text>
              </Pressable>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>축제·행사·전시</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>
                    매년 일정이 바뀌므로 공식 일정이 확정된 축제만 GPS 인증이 열려요.
                  </Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>
                  {completedFestivalCount}/{visibleFestivals.length}
                </Text>
              </View>

              {visibleFestivals.length === 0 ? (
                <View
                  style={[
                    styles.festivalEmptyCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 3 : 14,
                    },
                  ]}
                >
                  <Text style={[styles.festivalEmptyTitle, { color: theme.text }]}>등록된 축제·행사·전시가 없어요</Text>
                  <Text style={[styles.festivalEmptyText, { color: theme.subText }]}>광역 전체를 누르면 이 지역의 대표 축제를 확인할 수 있어요.</Text>
                </View>
              ) : (
                <View style={styles.placeList}>
                  {visibleFestivals.map((festival) => {
                    const completed = completedPlaceIds.includes(festival.id);
                    return (
                      <Pressable
                        key={festival.id}
                        onPress={() =>
                          router.push({
                            pathname:
                              '/explore/festival/[festivalId]',
                            params: {
                              festivalId:
                                festival.id,
                            },
                          } as any)
                        }
                        style={({ pressed }) => [
                          styles.placeCard,
                          {
                            backgroundColor: theme.card,
                            borderColor: completed ? theme.strongLine ?? theme.line : theme.line,
                            borderRadius: isCityBlack ? 3 : 14,
                            opacity: pressed ? 0.65 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}>
                          <Text style={styles.placeIcon}>{festival.icon}</Text>
                        </View>
                        <View style={styles.placeContent}>
                          <View style={styles.placeTitleRow}>
                            <Text style={[styles.placeName, { color: theme.text }]}>{festival.name}</Text>
                            <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>
                              {completed ? '참여 완료' : `+${festival.rewardPoints}P`}
                            </Text>
                          </View>
                          <Text style={[styles.placeMeta, { color: theme.subText }]}>
                            {getFestivalContentTypeLabel(festival)} · {festival.districtName} · {festival.category} · {FESTIVAL_SCALE_LABELS[festival.scale]}
                          </Text>
                          <View style={styles.placeTagRow}>
                            <View style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}>
                              <Text style={[styles.placeTagText, { color: theme.subText }]}>{getFestivalScheduleLabel(festival)}</Text>
                            </View>
                            {festival.emerging && (
                              <View style={[styles.placeTag, { borderColor: theme.strongLine ?? theme.line, borderRadius: isCityBlack ? 2 : 6 }]}>
                                <Text style={[styles.placeTagText, { color: theme.text }]}>최근 급성장</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>
                            보상 · {festival.festivalYear} 한정 스탬프 · {festival.venueName}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : mapLevel === 'gyeonggi' ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>경기 31개 시·군 탐험 지도</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>수원시부터 성남시까지 경기도 31개 시·군 전체 탐험이 열렸어요.</Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>31/31개 지역</Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setGyeonggiMapLayout({ width, height });
                }}
                onPress={handleGyeonggiMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg width="100%" height="100%" viewBox="0 0 360 430" pointerEvents="none">
                  <G>
                    {GYEONGGI_DISTRICT_SHAPES.map((shape) => {
                      const catalogDistrict = getExplorationDistrict(shape.id);
                      const available = isExplorationDistrictOpen(shape.id, catalogDistrict?.available ?? null);
                      const selected = selectedGyeonggiDistrictId === shape.id;
                      return (
                        <G key={shape.id}>
                          <Polygon
                            points={shape.points}
                            fill={selected ? (isCityBlack ? '#EFEFEF' : '#E7DDCF') : available ? (isCityBlack ? '#666666' : '#F5EFE7') : (isCityBlack ? '#272727' : '#F2F2F2')}
                            stroke={selected ? theme.strongLine ?? theme.line : theme.line}
                            strokeWidth={selected ? 2.5 : 1}
                          />
                          <SvgText
                            x={shape.labelX}
                            y={shape.labelY}
                            fontSize={shape.name.length >= 4 ? 7.2 : 8.5}
                            fontWeight={selected ? '700' : '500'}
                            fill={selected ? (isCityBlack ? '#111111' : '#4D4035') : available ? theme.text : theme.subText}
                            textAnchor="middle"
                          >
                            {shape.name}
                          </SvgText>
                        </G>
                      );
                    })}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtButtonRow}>
                {GYEONGGI_DISTRICT_SHAPES.map((district) => {
                  const catalogDistrict = getExplorationDistrict(district.id);
                  const districtOpen = isExplorationDistrictOpen(district.id, catalogDistrict?.available ?? null);
                  const districtPlaces = getExplorationPlacesByDistrict(district.id);
                  const districtVisited = districtPlaces.filter((place) => completedPlaceIds.includes(place.id)).length;
                  const selected = selectedGyeonggiDistrictId === district.id;
                  return (
                    <Pressable
                      key={district.id}
                      onPress={() => openGyeonggiDistrict(district.id)}
                      style={({ pressed }) => [
                        styles.districtButton,
                        {
                          backgroundColor: selected ? theme.background : theme.card,
                          borderColor: selected || districtOpen ? theme.strongLine ?? theme.line : theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed ? 0.65 : districtOpen ? 1 : 0.6,
                        },
                      ]}
                    >
                      <Text style={styles.districtIcon}>{district.icon}</Text>
                      <Text style={[styles.districtName, { color: theme.text }]}>{district.name}</Text>
                      <Text style={[styles.districtProgress, { color: theme.subText }]}>{districtOpen ? `${districtVisited}/${districtPlaces.length}곳` : '준비 중'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.districtSummaryCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
              <View style={styles.districtSummaryTop}>
                <View style={styles.districtTitleRow}>
                  <Text style={styles.districtSummaryIcon}>{selectedGyeonggiDistrict.icon}</Text>
                  <View style={styles.busanSummaryTextBlock}>
                    <Text style={[styles.districtSummaryTitle, { color: theme.text }]}>{selectedGyeonggiDistrict.name} 탐험</Text>
                    <Text style={[styles.districtSummarySubtitle, { color: theme.subText }]}>{selectedGyeonggiDistrict.subtitle}</Text>
                  </View>
                </View>
                <Text style={[styles.districtSummaryPercent, { color: theme.text }]}>{selectedGyeonggiCatalogDistrict?.available ? `${gyeonggiDistrictPercent}%` : '준비'}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View style={[styles.progressFill, { width: `${gyeonggiDistrictPercent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
              </View>
              <Text style={[styles.districtSummaryCount, { color: theme.subText }]}>
                {selectedGyeonggiCatalogDistrict?.available
                  ? `방문 ${visitedInSelectedGyeonggiDistrict}/${selectedGyeonggiPlaces.length}곳 · 테마 ${selectedGyeonggiThemes.filter((item) => rewards.unlockedThemeBadgeIds.includes(item.id)).length}/${selectedGyeonggiThemes.length}개 완료`
                  : '현재 선택한 지역은 준비 중이에요. 열린 경기 지역부터 대표 여행지와 GPS 탐험을 이용할 수 있어요.'}
              </Text>
            </View>

            {selectedGyeonggiCatalogDistrict?.available && (
              <>
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>테마 탐험</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
                    {selectedGyeonggiThemes.map((item) => {
                      const visitedCount = item.requiredPlaceIds.filter((id) => completedPlaceIds.includes(id)).length;
                      const percent = Math.round((visitedCount / Math.max(1, item.requiredPlaceIds.length)) * 100);
                      const completed = rewards.unlockedThemeBadgeIds.includes(item.id);
                      return (
                        <View key={item.id} style={[styles.themeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14 }]}>
                          <View style={styles.themeTop}>
                            <Text style={styles.themeIcon}>{item.icon}</Text>
                            <Text style={[styles.themeStatus, { color: theme.subText }]}>{completed ? '완료' : `${percent}%`}</Text>
                          </View>
                          <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.themeDescription, { color: theme.subText }]} numberOfLines={2}>{item.description}</Text>
                          <Text style={[styles.themeCount, { color: theme.text }]}>{visitedCount}/{item.requiredPlaceIds.length}곳 방문</Text>
                          <View style={[styles.themeProgressTrack, { backgroundColor: theme.background }]}>
                            <View style={[styles.themeProgressFill, { width: `${percent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
                          </View>
                          {completed && (
                            <Pressable onPress={() => void setAsMainBadge(item.id)} style={({ pressed }) => [styles.mainBadgeButton, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8, opacity: pressed ? 0.65 : 1 }]}>
                              <Text style={[styles.mainBadgeButtonText, { color: theme.text }]}>{mainBadgeId === item.id ? '대표 뱃지 사용 중' : '대표 뱃지로 설정'}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View key={`gyeonggi-place-section-${selectedGyeonggiDistrictId}`} style={styles.sectionBlock} onLayout={(event) => setPlaceSectionY(event.nativeEvent.layout.y)}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 장소</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>{selectedGyeonggiDistrict.name} 탐험 장소 {selectedGyeonggiPlaces.length}곳</Text>
                    </View>
                    <Text style={[styles.openCount, { color: theme.text }]}>{visitedInSelectedGyeonggiDistrict}/{selectedGyeonggiPlaces.length}</Text>
                  </View>
                  <View style={styles.placeList}>
                    {selectedGyeonggiPlaces.map((place) => {
                      const completed = completedPlaceIds.includes(place.id);
                      const relatedThemes = selectedGyeonggiThemes.filter((themeItem) => themeItem.requiredPlaceIds.includes(place.id));
                      return (
                        <Pressable key={place.id} onPress={() => router.push(`/explore/place/${place.id}`)} style={({ pressed }) => [styles.placeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14, opacity: pressed ? 0.65 : 1 }]}>
                          <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}><Text style={styles.placeIcon}>{place.icon}</Text></View>
                          <View style={styles.placeContent}>
                            <View style={styles.placeTitleRow}>
                              <Text style={[styles.placeName, { color: theme.text }]}>{place.name}</Text>
                              <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>{completed ? '방문 완료' : `+${place.rewardPoints}P`}</Text>
                            </View>
                            <Text style={[styles.placeMeta, { color: theme.subText }]}>{place.category} · {place.areaType}</Text>
                            <View style={styles.placeTagRow}>{relatedThemes.map((themeItem) => <View key={themeItem.id} style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}><Text style={[styles.placeTagText, { color: theme.subText }]}>{themeItem.icon} {themeItem.shortLabel}</Text></View>)}</View>
                            <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>보상 · {place.rewardLabel} · 방문 스탬프</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={[styles.nextRegionCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 3 : 13 }]}>
              <Text style={styles.nextRegionIcon}>🏰</Text>
              <View style={styles.nextRegionContent}>
                <Text style={[styles.nextRegionTitle, { color: theme.text }]}>경기도 31개 시·군 전체 탐험 열림</Text>
                <Text style={[styles.nextRegionSubtitle, { color: theme.subText }]}>수원시부터 성남시까지 경기도 31개 시·군의 테마 93개와 대표 장소 310곳을 모두 탐험할 수 있어요.</Text>
              </View>
            </View>
          </>

        ) : mapLevel === 'incheon' ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>인천 9개 구·2개 군 탐험 지도</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>2026년 개편 행정구역 기준이며 인천 11개 지역 전체 탐험이 열렸어요.</Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>111/11개 지역</Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setIncheonMapLayout({ width, height });
                }}
                onPress={handleIncheonMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg width="100%" height="100%" viewBox="0 0 360 340" pointerEvents="none">
                  <G>
                    {INCHEON_DISTRICT_SHAPES.map((shape) => {
                      const catalogDistrict = getExplorationDistrict(shape.id);
                      const available = isExplorationDistrictOpen(shape.id, catalogDistrict?.available ?? null);
                      const selected = selectedIncheonDistrictId === shape.id;
                      return (
                        <G key={shape.id}>
                          <Polygon
                            points={shape.points}
                            fill={selected ? (isCityBlack ? '#EFEFEF' : '#E7DDCF') : available ? (isCityBlack ? '#666666' : '#F5EFE7') : (isCityBlack ? '#272727' : '#F2F2F2')}
                            stroke={selected ? theme.strongLine ?? theme.line : theme.line}
                            strokeWidth={selected ? 2.5 : 1}
                          />
                          <SvgText
                            x={shape.labelX}
                            y={shape.labelY}
                            fontSize={shape.name.length >= 4 ? 7.2 : 8.5}
                            fontWeight={selected ? '700' : '500'}
                            fill={selected ? (isCityBlack ? '#111111' : '#4D4035') : available ? theme.text : theme.subText}
                            textAnchor="middle"
                          >
                            {shape.name}
                          </SvgText>
                        </G>
                      );
                    })}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtButtonRow}>
                {INCHEON_DISTRICT_SHAPES.map((district) => {
                  const catalogDistrict = getExplorationDistrict(district.id);
                  const districtOpen = isExplorationDistrictOpen(district.id, catalogDistrict?.available ?? null);
                  const districtPlaces = getExplorationPlacesByDistrict(district.id);
                  const districtVisited = districtPlaces.filter((place) => completedPlaceIds.includes(place.id)).length;
                  const selected = selectedIncheonDistrictId === district.id;
                  return (
                    <Pressable
                      key={district.id}
                      onPress={() => openIncheonDistrict(district.id)}
                      style={({ pressed }) => [
                        styles.districtButton,
                        {
                          backgroundColor: selected ? theme.background : theme.card,
                          borderColor: selected || districtOpen ? theme.strongLine ?? theme.line : theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed ? 0.65 : districtOpen ? 1 : 0.6,
                        },
                      ]}
                    >
                      <Text style={styles.districtIcon}>{district.icon}</Text>
                      <Text style={[styles.districtName, { color: theme.text }]}>{district.name}</Text>
                      <Text style={[styles.districtProgress, { color: theme.subText }]}>{districtOpen ? `${districtVisited}/${districtPlaces.length}곳` : '준비 중'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.districtSummaryCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
              <View style={styles.districtSummaryTop}>
                <View style={styles.districtTitleRow}>
                  <Text style={styles.districtSummaryIcon}>{selectedIncheonDistrict.icon}</Text>
                  <View style={styles.busanSummaryTextBlock}>
                    <Text style={[styles.districtSummaryTitle, { color: theme.text }]}>{selectedIncheonDistrict.name} 탐험</Text>
                    <Text style={[styles.districtSummarySubtitle, { color: theme.subText }]}>{selectedIncheonDistrict.subtitle}</Text>
                  </View>
                </View>
                <Text style={[styles.districtSummaryPercent, { color: theme.text }]}>{selectedIncheonCatalogDistrict?.available ? `${incheonDistrictPercent}%` : '준비'}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View style={[styles.progressFill, { width: `${incheonDistrictPercent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
              </View>
              <Text style={[styles.districtSummaryCount, { color: theme.subText }]}>
                {selectedIncheonCatalogDistrict?.available
                  ? `방문 ${visitedInSelectedIncheonDistrict}/${selectedIncheonPlaces.length}곳 · 테마 ${selectedIncheonThemes.filter((item) => rewards.unlockedThemeBadgeIds.includes(item.id)).length}/${selectedIncheonThemes.length}개 완료`
                  : '현재 선택한 지역은 준비 중이에요. 다음 지역부터 대표 장소와 GPS 탐험을 순서대로 열 예정이에요.'}
              </Text>
            </View>

            {selectedIncheonCatalogDistrict?.available && (
              <>
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>테마 탐험</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
                    {selectedIncheonThemes.map((item) => {
                      const visitedCount = item.requiredPlaceIds.filter((id) => completedPlaceIds.includes(id)).length;
                      const percent = Math.round((visitedCount / Math.max(1, item.requiredPlaceIds.length)) * 100);
                      const completed = rewards.unlockedThemeBadgeIds.includes(item.id);
                      return (
                        <View key={item.id} style={[styles.themeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14 }]}>
                          <View style={styles.themeTop}>
                            <Text style={styles.themeIcon}>{item.icon}</Text>
                            <Text style={[styles.themeStatus, { color: theme.subText }]}>{completed ? '완료' : `${percent}%`}</Text>
                          </View>
                          <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.themeDescription, { color: theme.subText }]} numberOfLines={2}>{item.description}</Text>
                          <Text style={[styles.themeCount, { color: theme.text }]}>{visitedCount}/{item.requiredPlaceIds.length}곳 방문</Text>
                          <View style={[styles.themeProgressTrack, { backgroundColor: theme.background }]}>
                            <View style={[styles.themeProgressFill, { width: `${percent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
                          </View>
                          {completed && (
                            <Pressable onPress={() => void setAsMainBadge(item.id)} style={({ pressed }) => [styles.mainBadgeButton, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8, opacity: pressed ? 0.65 : 1 }]}>
                              <Text style={[styles.mainBadgeButtonText, { color: theme.text }]}>{mainBadgeId === item.id ? '대표 뱃지 사용 중' : '대표 뱃지로 설정'}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View key={`incheon-place-section-${selectedIncheonDistrictId}`} style={styles.sectionBlock} onLayout={(event) => setPlaceSectionY(event.nativeEvent.layout.y)}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 장소</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>{selectedIncheonDistrict.name} 탐험 장소 {selectedIncheonPlaces.length}곳</Text>
                    </View>
                    <Text style={[styles.openCount, { color: theme.text }]}>{visitedInSelectedIncheonDistrict}/{selectedIncheonPlaces.length}</Text>
                  </View>
                  <View style={styles.placeList}>
                    {selectedIncheonPlaces.map((place) => {
                      const completed = completedPlaceIds.includes(place.id);
                      const relatedThemes = selectedIncheonThemes.filter((themeItem) => themeItem.requiredPlaceIds.includes(place.id));
                      return (
                        <Pressable key={place.id} onPress={() => router.push(`/explore/place/${place.id}`)} style={({ pressed }) => [styles.placeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14, opacity: pressed ? 0.65 : 1 }]}>
                          <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}><Text style={styles.placeIcon}>{place.icon}</Text></View>
                          <View style={styles.placeContent}>
                            <View style={styles.placeTitleRow}>
                              <Text style={[styles.placeName, { color: theme.text }]}>{place.name}</Text>
                              <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>{completed ? '방문 완료' : `+${place.rewardPoints}P`}</Text>
                            </View>
                            <Text style={[styles.placeMeta, { color: theme.subText }]}>{place.category} · {place.areaType}</Text>
                            <View style={styles.placeTagRow}>{relatedThemes.map((themeItem) => <View key={themeItem.id} style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}><Text style={[styles.placeTagText, { color: theme.subText }]}>{themeItem.icon} {themeItem.shortLabel}</Text></View>)}</View>
                            <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>보상 · {place.rewardLabel} · 방문 스탬프</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={[styles.nextRegionCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 3 : 13 }]}>
              <Text style={styles.nextRegionIcon}>🌆</Text>
              <View style={styles.nextRegionContent}>
                <Text style={[styles.nextRegionTitle, { color: theme.text }]}>인천 11개 지역 전체 탐험 완료</Text>
                <Text style={[styles.nextRegionSubtitle, { color: theme.subText }]}>제물포구부터 옹진군까지 인천 11개 지역과 대표 장소 110곳을 모두 탐험할 수 있어요.</Text>
              </View>
            </View>
          </>
        ) : mapLevel === 'daejeon' ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>대전 5개 자치구 탐험 지도</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>유성구·중구·동구·서구·대덕구 탐험이 모두 열렸어요.</Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>5/5개 지역</Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setDaejeonMapLayout({ width, height });
                }}
                onPress={handleDaejeonMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg width="100%" height="100%" viewBox="0 0 360 330" pointerEvents="none">
                  <G>
                    {DAEJEON_DISTRICT_SHAPES.map((shape) => {
                      const catalogDistrict = getExplorationDistrict(shape.id);
                      const available = isExplorationDistrictOpen(shape.id, catalogDistrict?.available ?? null);
                      const selected = selectedDaejeonDistrictId === shape.id;
                      return (
                        <G key={shape.id}>
                          <Polygon
                            points={shape.points}
                            fill={selected ? (isCityBlack ? '#EFEFEF' : '#E7DDCF') : available ? (isCityBlack ? '#666666' : '#F5EFE7') : (isCityBlack ? '#272727' : '#F2F2F2')}
                            stroke={selected ? theme.strongLine ?? theme.line : theme.line}
                            strokeWidth={selected ? 2.5 : 1}
                          />
                          <SvgText
                            x={shape.labelX}
                            y={shape.labelY}
                            fontSize={shape.name.length >= 4 ? 7.2 : 8.5}
                            fontWeight={selected ? '700' : '500'}
                            fill={selected ? (isCityBlack ? '#111111' : '#4D4035') : available ? theme.text : theme.subText}
                            textAnchor="middle"
                          >
                            {shape.name}
                          </SvgText>
                        </G>
                      );
                    })}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtButtonRow}>
                {DAEJEON_DISTRICT_SHAPES.map((district) => {
                  const catalogDistrict = getExplorationDistrict(district.id);
                  const districtOpen = isExplorationDistrictOpen(district.id, catalogDistrict?.available ?? null);
                  const districtPlaces = getExplorationPlacesByDistrict(district.id);
                  const districtVisited = districtPlaces.filter((place) => completedPlaceIds.includes(place.id)).length;
                  const selected = selectedDaejeonDistrictId === district.id;
                  return (
                    <Pressable
                      key={district.id}
                      onPress={() => openDaejeonDistrict(district.id)}
                      style={({ pressed }) => [
                        styles.districtButton,
                        {
                          backgroundColor: selected ? theme.background : theme.card,
                          borderColor: selected || districtOpen ? theme.strongLine ?? theme.line : theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed ? 0.65 : districtOpen ? 1 : 0.6,
                        },
                      ]}
                    >
                      <Text style={styles.districtIcon}>{district.icon}</Text>
                      <Text style={[styles.districtName, { color: theme.text }]}>{district.name}</Text>
                      <Text style={[styles.districtProgress, { color: theme.subText }]}>{districtOpen ? `${districtVisited}/${districtPlaces.length}곳` : '준비 중'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.districtSummaryCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
              <View style={styles.districtSummaryTop}>
                <View style={styles.districtTitleRow}>
                  <Text style={styles.districtSummaryIcon}>{selectedDaejeonDistrict.icon}</Text>
                  <View style={styles.busanSummaryTextBlock}>
                    <Text style={[styles.districtSummaryTitle, { color: theme.text }]}>{selectedDaejeonDistrict.name} 탐험</Text>
                    <Text style={[styles.districtSummarySubtitle, { color: theme.subText }]}>{selectedDaejeonDistrict.subtitle}</Text>
                  </View>
                </View>
                <Text style={[styles.districtSummaryPercent, { color: theme.text }]}>{selectedDaejeonCatalogDistrict?.available ? `${daejeonDistrictPercent}%` : '준비'}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View style={[styles.progressFill, { width: `${daejeonDistrictPercent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
              </View>
              <Text style={[styles.districtSummaryCount, { color: theme.subText }]}>
                {selectedDaejeonCatalogDistrict?.available
                  ? `방문 ${visitedInSelectedDaejeonDistrict}/${selectedDaejeonPlaces.length}곳 · 테마 ${selectedDaejeonThemes.filter((item) => rewards.unlockedThemeBadgeIds.includes(item.id)).length}/${selectedDaejeonThemes.length}개 완료`
                  : '현재 선택한 지역은 준비 중이에요. 다음 지역부터 대표 장소와 GPS 탐험을 순서대로 열 예정이에요.'}
              </Text>
            </View>

            {selectedDaejeonCatalogDistrict?.available && (
              <>
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>테마 탐험</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
                    {selectedDaejeonThemes.map((item) => {
                      const visitedCount = item.requiredPlaceIds.filter((id) => completedPlaceIds.includes(id)).length;
                      const percent = Math.round((visitedCount / Math.max(1, item.requiredPlaceIds.length)) * 100);
                      const completed = rewards.unlockedThemeBadgeIds.includes(item.id);
                      return (
                        <View key={item.id} style={[styles.themeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14 }]}>
                          <View style={styles.themeTop}>
                            <Text style={styles.themeIcon}>{item.icon}</Text>
                            <Text style={[styles.themeStatus, { color: theme.subText }]}>{completed ? '완료' : `${percent}%`}</Text>
                          </View>
                          <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.themeDescription, { color: theme.subText }]} numberOfLines={2}>{item.description}</Text>
                          <Text style={[styles.themeCount, { color: theme.text }]}>{visitedCount}/{item.requiredPlaceIds.length}곳 방문</Text>
                          <View style={[styles.themeProgressTrack, { backgroundColor: theme.background }]}>
                            <View style={[styles.themeProgressFill, { width: `${percent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
                          </View>
                          {completed && (
                            <Pressable onPress={() => void setAsMainBadge(item.id)} style={({ pressed }) => [styles.mainBadgeButton, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8, opacity: pressed ? 0.65 : 1 }]}>
                              <Text style={[styles.mainBadgeButtonText, { color: theme.text }]}>{mainBadgeId === item.id ? '대표 뱃지 사용 중' : '대표 뱃지로 설정'}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View key={`daejeon-place-section-${selectedDaejeonDistrictId}`} style={styles.sectionBlock} onLayout={(event) => setPlaceSectionY(event.nativeEvent.layout.y)}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 장소</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>{selectedDaejeonDistrict.name} 탐험 장소 {selectedDaejeonPlaces.length}곳</Text>
                    </View>
                    <Text style={[styles.openCount, { color: theme.text }]}>{visitedInSelectedDaejeonDistrict}/{selectedDaejeonPlaces.length}</Text>
                  </View>
                  <View style={styles.placeList}>
                    {selectedDaejeonPlaces.map((place) => {
                      const completed = completedPlaceIds.includes(place.id);
                      const relatedThemes = selectedDaejeonThemes.filter((themeItem) => themeItem.requiredPlaceIds.includes(place.id));
                      return (
                        <Pressable key={place.id} onPress={() => router.push(`/explore/place/${place.id}`)} style={({ pressed }) => [styles.placeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14, opacity: pressed ? 0.65 : 1 }]}>
                          <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}><Text style={styles.placeIcon}>{place.icon}</Text></View>
                          <View style={styles.placeContent}>
                            <View style={styles.placeTitleRow}>
                              <Text style={[styles.placeName, { color: theme.text }]}>{place.name}</Text>
                              <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>{completed ? '방문 완료' : `+${place.rewardPoints}P`}</Text>
                            </View>
                            <Text style={[styles.placeMeta, { color: theme.subText }]}>{place.category} · {place.areaType}</Text>
                            <View style={styles.placeTagRow}>{relatedThemes.map((themeItem) => <View key={themeItem.id} style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}><Text style={[styles.placeTagText, { color: theme.subText }]}>{themeItem.icon} {themeItem.shortLabel}</Text></View>)}</View>
                            <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>보상 · {place.rewardLabel} · 방문 스탬프</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={[styles.nextRegionCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 3 : 13 }]}>
              <Text style={styles.nextRegionIcon}>🌄</Text>
              <View style={styles.nextRegionContent}>
                <Text style={[styles.nextRegionTitle, { color: theme.text }]}>대전 유성구·중구·동구 탐험 열림</Text>
                <Text style={[styles.nextRegionSubtitle, { color: theme.subText }]}>유성구 과학·온천, 중구 가족·보문산·원도심, 동구 대청호·숲휴양·철도원도심을 잇는 대표 장소 30곳과 테마 9개를 탐험할 수 있어요.</Text>
              </View>
            </View>
          </>

        ) : mapLevel === 'gangwon' ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>강원 18개 시·군 탐험 지도</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>강원특별자치도 18개 시·군의 대표 장소와 GPS 탐험이 모두 열렸어요.</Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>18/18개 지역</Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setGangwonMapLayout({ width, height });
                }}
                onPress={handleGangwonMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg width="100%" height="100%" viewBox="0 0 360 380" pointerEvents="none">
                  <G>
                    {GANGWON_DISTRICT_SHAPES.map((shape) => {
                      const catalogDistrict = getExplorationDistrict(shape.id);
                      const available = isExplorationDistrictOpen(shape.id, catalogDistrict?.available ?? null);
                      const selected = selectedGangwonDistrictId === shape.id;
                      return (
                        <G key={shape.id}>
                          <Polygon
                            points={shape.points}
                            fill={selected ? (isCityBlack ? '#EFEFEF' : '#E7DDCF') : available ? (isCityBlack ? '#666666' : '#F5EFE7') : (isCityBlack ? '#272727' : '#F2F2F2')}
                            stroke={selected ? theme.strongLine ?? theme.line : theme.line}
                            strokeWidth={selected ? 2.5 : 1}
                          />
                          <SvgText
                            x={shape.labelX}
                            y={shape.labelY}
                            fontSize={shape.name.length >= 4 ? 7.2 : 8.5}
                            fontWeight={selected ? '700' : '500'}
                            fill={selected ? (isCityBlack ? '#111111' : '#4D4035') : available ? theme.text : theme.subText}
                            textAnchor="middle"
                          >
                            {shape.name}
                          </SvgText>
                        </G>
                      );
                    })}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtButtonRow}>
                {GANGWON_DISTRICT_SHAPES.map((district) => {
                  const catalogDistrict = getExplorationDistrict(district.id);
                  const districtOpen = isExplorationDistrictOpen(district.id, catalogDistrict?.available ?? null);
                  const districtPlaces = getExplorationPlacesByDistrict(district.id);
                  const districtVisited = districtPlaces.filter((place) => completedPlaceIds.includes(place.id)).length;
                  const selected = selectedGangwonDistrictId === district.id;
                  return (
                    <Pressable
                      key={district.id}
                      onPress={() => openGangwonDistrict(district.id)}
                      style={({ pressed }) => [
                        styles.districtButton,
                        {
                          backgroundColor: selected ? theme.background : theme.card,
                          borderColor: selected || districtOpen ? theme.strongLine ?? theme.line : theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed ? 0.65 : districtOpen ? 1 : 0.6,
                        },
                      ]}
                    >
                      <Text style={styles.districtIcon}>{district.icon}</Text>
                      <Text style={[styles.districtName, { color: theme.text }]}>{district.name}</Text>
                      <Text style={[styles.districtProgress, { color: theme.subText }]}>{districtOpen ? `${districtVisited}/${districtPlaces.length}곳` : '준비 중'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.districtSummaryCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
              <View style={styles.districtSummaryTop}>
                <View style={styles.districtTitleRow}>
                  <Text style={styles.districtSummaryIcon}>{selectedGangwonDistrict.icon}</Text>
                  <View style={styles.busanSummaryTextBlock}>
                    <Text style={[styles.districtSummaryTitle, { color: theme.text }]}>{selectedGangwonDistrict.name} 탐험</Text>
                    <Text style={[styles.districtSummarySubtitle, { color: theme.subText }]}>{selectedGangwonDistrict.subtitle}</Text>
                  </View>
                </View>
                <Text style={[styles.districtSummaryPercent, { color: theme.text }]}>{selectedGangwonCatalogDistrict?.available ? `${gangwonDistrictPercent}%` : '준비'}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View style={[styles.progressFill, { width: `${gangwonDistrictPercent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
              </View>
              <Text style={[styles.districtSummaryCount, { color: theme.subText }]}>
                {selectedGangwonCatalogDistrict?.available
                  ? `방문 ${visitedInSelectedGangwonDistrict}/${selectedGangwonPlaces.length}곳 · 테마 ${selectedGangwonThemes.filter((item) => rewards.unlockedThemeBadgeIds.includes(item.id)).length}/${selectedGangwonThemes.length}개 완료`
                  : '현재 선택한 지역은 준비 중이에요. 열린 강원 지역부터 대표 여행지와 GPS 탐험을 이용할 수 있어요.'}
              </Text>
            </View>

            {selectedGangwonCatalogDistrict?.available && (
              <>
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>테마 탐험</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
                    {selectedGangwonThemes.map((item) => {
                      const visitedCount = item.requiredPlaceIds.filter((id) => completedPlaceIds.includes(id)).length;
                      const percent = Math.round((visitedCount / Math.max(1, item.requiredPlaceIds.length)) * 100);
                      const completed = rewards.unlockedThemeBadgeIds.includes(item.id);
                      return (
                        <View key={item.id} style={[styles.themeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14 }]}>
                          <View style={styles.themeTop}>
                            <Text style={styles.themeIcon}>{item.icon}</Text>
                            <Text style={[styles.themeStatus, { color: theme.subText }]}>{completed ? '완료' : `${percent}%`}</Text>
                          </View>
                          <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.themeDescription, { color: theme.subText }]} numberOfLines={2}>{item.description}</Text>
                          <Text style={[styles.themeCount, { color: theme.text }]}>{visitedCount}/{item.requiredPlaceIds.length}곳 방문</Text>
                          <View style={[styles.themeProgressTrack, { backgroundColor: theme.background }]}>
                            <View style={[styles.themeProgressFill, { width: `${percent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
                          </View>
                          {completed && (
                            <Pressable onPress={() => void setAsMainBadge(item.id)} style={({ pressed }) => [styles.mainBadgeButton, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8, opacity: pressed ? 0.65 : 1 }]}>
                              <Text style={[styles.mainBadgeButtonText, { color: theme.text }]}>{mainBadgeId === item.id ? '대표 뱃지 사용 중' : '대표 뱃지로 설정'}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View key={`gangwon-place-section-${selectedGangwonDistrictId}`} style={styles.sectionBlock} onLayout={(event) => setPlaceSectionY(event.nativeEvent.layout.y)}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 장소</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>{selectedGangwonDistrict.name} 탐험 장소 {selectedGangwonPlaces.length}곳</Text>
                    </View>
                    <Text style={[styles.openCount, { color: theme.text }]}>{visitedInSelectedGangwonDistrict}/{selectedGangwonPlaces.length}</Text>
                  </View>
                  <View style={styles.placeList}>
                    {selectedGangwonPlaces.map((place) => {
                      const completed = completedPlaceIds.includes(place.id);
                      const relatedThemes = selectedGangwonThemes.filter((themeItem) => themeItem.requiredPlaceIds.includes(place.id));
                      return (
                        <Pressable key={place.id} onPress={() => router.push(`/explore/place/${place.id}`)} style={({ pressed }) => [styles.placeCard, { backgroundColor: theme.card, borderColor: completed ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 3 : 14, opacity: pressed ? 0.65 : 1 }]}>
                          <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}><Text style={styles.placeIcon}>{place.icon}</Text></View>
                          <View style={styles.placeContent}>
                            <View style={styles.placeTitleRow}>
                              <Text style={[styles.placeName, { color: theme.text }]}>{place.name}</Text>
                              <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>{completed ? '방문 완료' : `+${place.rewardPoints}P`}</Text>
                            </View>
                            <Text style={[styles.placeMeta, { color: theme.subText }]}>{place.category} · {place.areaType}</Text>
                            <View style={styles.placeTagRow}>{relatedThemes.map((themeItem) => <View key={themeItem.id} style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}><Text style={[styles.placeTagText, { color: theme.subText }]}>{themeItem.icon} {themeItem.shortLabel}</Text></View>)}</View>
                            <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>보상 · {place.rewardLabel} · 방문 스탬프</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={[styles.nextRegionCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 3 : 13 }]}>
              <Text style={styles.nextRegionIcon}>🏔️</Text>
              <View style={styles.nextRegionContent}>
                <Text style={[styles.nextRegionTitle, { color: theme.text }]}>강원특별자치도 18개 시·군 탐험 완료</Text>
                <Text style={[styles.nextRegionSubtitle, { color: theme.subText }]}>춘천·원주부터 동해안과 접경지역까지 강원 18개 시·군의 대표 장소와 테마 탐험이 모두 연결됐어요.</Text>
              </View>
            </View>
          </>
        ) : mapLevel === 'gwangju' ? (

          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    전남광주통합특별시 광주권 5개 자치구 탐험 지도
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>
                    동구·남구·서구·북구·광산구 탐험이 모두 열렸어요.
                  </Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>
                  5/5개 지역
                </Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setGwangjuMapLayout({ width, height });
                }}
                onPress={handleGwangjuMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 360 330"
                  pointerEvents="none"
                >
                  <G>
                    {GWANGJU_DISTRICT_SHAPES.map((shape) => {
                      const catalogDistrict =
                        getExplorationDistrict(shape.id);
                      const available =
                        isExplorationDistrictOpen(
                          shape.id,
                          catalogDistrict?.available ?? null
                        );
                      const selected =
                        selectedGwangjuDistrictId === shape.id;

                      return (
                        <G key={shape.id}>
                          <Polygon
                            points={shape.points}
                            fill={
                              selected
                                ? isCityBlack
                                  ? '#EFEFEF'
                                  : '#E7DDCF'
                                : available
                                  ? isCityBlack
                                    ? '#666666'
                                    : '#F5EFE7'
                                  : isCityBlack
                                    ? '#272727'
                                    : '#F2F2F2'
                            }
                            stroke={
                              selected
                                ? theme.strongLine ?? theme.line
                                : theme.line
                            }
                            strokeWidth={selected ? 2.5 : 1}
                          />
                          <SvgText
                            x={shape.labelX}
                            y={shape.labelY}
                            fontSize={shape.name.length >= 4 ? 7.2 : 8.5}
                            fontWeight={selected ? '700' : '500'}
                            fill={
                              selected
                                ? isCityBlack
                                  ? '#111111'
                                  : '#4D4035'
                                : available
                                  ? theme.text
                                  : theme.subText
                            }
                            textAnchor="middle"
                          >
                            {shape.name}
                          </SvgText>
                        </G>
                      );
                    })}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.districtButtonRow}
              >
                {GWANGJU_DISTRICT_SHAPES.map((district) => {
                  const catalogDistrict =
                    getExplorationDistrict(district.id);
                  const districtOpen =
                    isExplorationDistrictOpen(
                      district.id,
                      catalogDistrict?.available ?? null
                    );
                  const districtPlaces =
                    getExplorationPlacesByDistrict(district.id);
                  const districtVisited =
                    districtPlaces.filter((place) =>
                      completedPlaceIds.includes(place.id)
                    ).length;
                  const selected =
                    selectedGwangjuDistrictId === district.id;

                  return (
                    <Pressable
                      key={district.id}
                      onPress={() => openGwangjuDistrict(district.id)}
                      style={({ pressed }) => [
                        styles.districtButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor:
                            selected || districtOpen
                              ? theme.strongLine ?? theme.line
                              : theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed
                            ? 0.65
                            : districtOpen
                              ? 1
                              : 0.6,
                        },
                      ]}
                    >
                      <Text style={styles.districtIcon}>
                        {district.icon}
                      </Text>
                      <Text
                        style={[
                          styles.districtName,
                          { color: theme.text },
                        ]}
                      >
                        {district.name}
                      </Text>
                      <Text
                        style={[
                          styles.districtProgress,
                          { color: theme.subText },
                        ]}
                      >
                        {districtOpen
                          ? `${districtVisited}/${districtPlaces.length}곳`
                          : '준비 중'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View
              style={[
                styles.nextRegionCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 13,
                },
              ]}
            >
              <Text style={styles.nextRegionIcon}>🎨</Text>
              <View style={styles.nextRegionContent}>
                <Text
                  style={[
                    styles.nextRegionTitle,
                    { color: theme.text },
                  ]}
                >
                  광주권 5개 자치구 탐험 완성
                </Text>
                <Text
                  style={[
                    styles.nextRegionSubtitle,
                    { color: theme.subText },
                  ]}
                >
                  동구·남구·서구·북구와 함께 광산구의 송정 생활문화, 선비·문학·공동체, 황룡강·어등산 생태 탐험까지 광주권 5개 자치구를 모두 즐길 수 있어요.
                </Text>
              </View>
            </View>
          </>
        ) : mapLevel === 'chungbuk' ? (

          <>
            <View style={[styles.mapCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>충청북도 11개 시·군 탐험 지도</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>청주시 탐험이 열렸어요. 나머지 10개 시·군은 순서대로 추가할 예정이에요.</Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>11/11개 지역</Text>
              </View>
              <Pressable
                onLayout={(event) => { const { width, height } = event.nativeEvent.layout; setChungbukMapLayout({ width, height }); }}
                onPress={handleChungbukMapPress}
                style={({ pressed }) => [styles.svgBox, { backgroundColor: theme.background, minHeight: 390, opacity: pressed ? 0.97 : 1 }]}
              >
                <Svg width="100%" height="100%" viewBox="0 0 370 430" pointerEvents="none">
                  <G>
                    {CHUNGBUK_DISTRICT_SHAPES.map((shape) => {
                      const catalogDistrict = getExplorationDistrict(shape.id);
                      const available = isExplorationDistrictOpen(shape.id, catalogDistrict?.available ?? null);
                      const selected = selectedChungbukDistrictId === shape.id;
                      return (
                        <G key={shape.id}>
                          <Polygon points={shape.points} fill={selected ? (isCityBlack ? '#EFEFEF' : '#E7DDCF') : available ? (isCityBlack ? '#666666' : '#F5EFE7') : (isCityBlack ? '#272727' : '#F2F2F2')} stroke={selected ? theme.strongLine ?? theme.line : theme.line} strokeWidth={selected ? 2.5 : 1} />
                          <SvgText x={shape.labelX} y={shape.labelY} fontSize={shape.name.length >= 4 ? 7 : 8.5} fontWeight={selected ? '700' : '500'} fill={selected ? (isCityBlack ? '#111111' : '#4D4035') : available ? theme.text : theme.subText} textAnchor="middle">{shape.name}</SvgText>
                        </G>
                      );
                    })}
                  </G>
                </Svg>
              </Pressable>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtButtonRow}>
                {CHUNGBUK_DISTRICT_SHAPES.map((district) => {
                  const catalogDistrict = getExplorationDistrict(district.id);
                  const districtOpen = isExplorationDistrictOpen(district.id, catalogDistrict?.available ?? null);
                  const districtPlaces = getExplorationPlacesByDistrict(district.id);
                  const districtVisited = districtPlaces.filter((place) => completedPlaceIds.includes(place.id)).length;
                  const selected = selectedChungbukDistrictId === district.id;
                  return (
                    <Pressable key={district.id} onPress={() => openChungbukDistrict(district.id)} style={({ pressed }) => [styles.districtButton, { backgroundColor: selected ? theme.background : theme.card, borderColor: selected || districtOpen ? theme.strongLine ?? theme.line : theme.line, borderRadius: isCityBlack ? 2 : 10, opacity: pressed ? 0.65 : districtOpen ? 1 : 0.6 }]}>
                      <Text style={styles.districtIcon}>{district.icon}</Text>
                      <Text style={[styles.districtName, { color: theme.text }]}>{district.name}</Text>
                      <Text style={[styles.districtProgress, { color: theme.subText }]}>{districtOpen ? `${districtVisited}/${districtPlaces.length}곳` : '준비 중'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </>
        ) : mapLevel === 'chungnam' ? (

          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.text },
                    ]}
                  >
                    충청남도 15개 시·군 탐험 지도
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: theme.subText },
                    ]}
                  >
                    충청남도 15개 시·군 탐험이 모두 열렸어요. 원하는 지역을 선택해 탐험을 시작해 보세요.
                  </Text>
                </View>

                <Text
                  style={[
                    styles.openCount,
                    { color: theme.text },
                  ]}
                >
                  15/15개 지역
                </Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } =
                    event.nativeEvent.layout;
                  setChungnamMapLayout({ width, height });
                }}
                onPress={handleChungnamMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    minHeight: 410,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 420 460"
                  pointerEvents="none"
                >
                  <G>
                    {CHUNGNAM_DISTRICT_SHAPES.map(
                      (shape) => {
                        const catalogDistrict =
                          getExplorationDistrict(shape.id);
                        const available =
                          isExplorationDistrictOpen(
                            shape.id,
                            catalogDistrict?.available ?? null
                          );
                        const selected =
                          selectedChungnamDistrictId ===
                          shape.id;

                        return (
                          <G key={shape.id}>
                            <Polygon
                              points={shape.points}
                              fill={
                                selected
                                  ? isCityBlack
                                    ? '#EFEFEF'
                                    : '#E7DDCF'
                                  : available
                                    ? isCityBlack
                                      ? '#666666'
                                      : '#F5EFE7'
                                    : isCityBlack
                                      ? '#272727'
                                      : '#F2F2F2'
                              }
                              stroke={
                                selected
                                  ? theme.strongLine ??
                                    theme.line
                                  : theme.line
                              }
                              strokeWidth={
                                selected ? 2.5 : 1
                              }
                            />
                            <SvgText
                              x={shape.labelX}
                              y={shape.labelY}
                              fontSize={
                                shape.name.length >= 4
                                  ? 7
                                  : 8.5
                              }
                              fontWeight={
                                selected ? '700' : '500'
                              }
                              fill={
                                selected
                                  ? isCityBlack
                                    ? '#111111'
                                    : '#4D4035'
                                  : available
                                    ? theme.text
                                    : theme.subText
                              }
                              textAnchor="middle"
                            >
                              {shape.name}
                            </SvgText>
                          </G>
                        );
                      }
                    )}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.districtButtonRow
                }
              >
                {CHUNGNAM_DISTRICT_SHAPES.map(
                  (district) => {
                    const catalogDistrict =
                      getExplorationDistrict(district.id);
                    const districtOpen =
                      isExplorationDistrictOpen(
                        district.id,
                        catalogDistrict?.available ?? null
                      );
                    const districtPlaces =
                      getExplorationPlacesByDistrict(
                        district.id
                      );
                    const districtVisited =
                      districtPlaces.filter((place) =>
                        completedPlaceIds.includes(place.id)
                      ).length;
                    const selected =
                      selectedChungnamDistrictId ===
                      district.id;

                    return (
                      <Pressable
                        key={district.id}
                        onPress={() =>
                          openChungnamDistrict(district.id)
                        }
                        style={({ pressed }) => [
                          styles.districtButton,
                          {
                            backgroundColor: selected
                              ? theme.background
                              : theme.card,
                            borderColor:
                              selected || districtOpen
                                ? theme.strongLine ??
                                  theme.line
                                : theme.line,
                            borderRadius: isCityBlack
                              ? 2
                              : 10,
                            opacity: pressed
                              ? 0.65
                              : districtOpen
                                ? 1
                                : 0.6,
                          },
                        ]}
                      >
                        <Text style={styles.districtIcon}>
                          {district.icon}
                        </Text>
                        <Text
                          style={[
                            styles.districtName,
                            { color: theme.text },
                          ]}
                        >
                          {district.name}
                        </Text>
                        <Text
                          style={[
                            styles.districtProgress,
                            { color: theme.subText },
                          ]}
                        >
                          {districtOpen
                            ? `${districtVisited}/${districtPlaces.length}곳`
                            : '준비 중'}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>
            </View>
          </>
        ) : mapLevel === 'jeonbuk' ? (

          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.text },
                    ]}
                  >
                    전북특별자치도 14개 시·군 탐험 지도
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: theme.subText },
                    ]}
                  >
                    전북특별자치도 14개 시·군 대표 장소 탐험이 모두 열렸어요.
                  </Text>
                </View>

                <Text
                  style={[
                    styles.openCount,
                    { color: theme.text },
                  ]}
                >
                  14/14개 지역
                </Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } =
                    event.nativeEvent.layout;
                  setJeonbukMapLayout({ width, height });
                }}
                onPress={handleJeonbukMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    minHeight: 410,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 420 460"
                  pointerEvents="none"
                >
                  <G>
                    {JEONBUK_DISTRICT_SHAPES.map(
                      (shape) => {
                        const catalogDistrict =
                          getExplorationDistrict(shape.id);
                        const available =
                          isExplorationDistrictOpen(
                            shape.id,
                            catalogDistrict?.available ?? null
                          );
                        const selected =
                          selectedJeonbukDistrictId ===
                          shape.id;

                        return (
                          <G key={shape.id}>
                            <Polygon
                              points={shape.points}
                              fill={
                                selected
                                  ? isCityBlack
                                    ? '#EFEFEF'
                                    : '#E7DDCF'
                                  : available
                                    ? isCityBlack
                                      ? '#666666'
                                      : '#F5EFE7'
                                    : isCityBlack
                                      ? '#272727'
                                      : '#F2F2F2'
                              }
                              stroke={
                                selected
                                  ? theme.strongLine ??
                                    theme.line
                                  : theme.line
                              }
                              strokeWidth={
                                selected ? 2.5 : 1
                              }
                            />
                            <SvgText
                              x={shape.labelX}
                              y={shape.labelY}
                              fontSize={
                                shape.name.length >= 4
                                  ? 7
                                  : 8.5
                              }
                              fontWeight={
                                selected ? '700' : '500'
                              }
                              fill={
                                selected
                                  ? isCityBlack
                                    ? '#111111'
                                    : '#4D4035'
                                  : available
                                    ? theme.text
                                    : theme.subText
                              }
                              textAnchor="middle"
                            >
                              {shape.name}
                            </SvgText>
                          </G>
                        );
                      }
                    )}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.districtButtonRow
                }
              >
                {JEONBUK_DISTRICT_SHAPES.map(
                  (district) => {
                    const catalogDistrict =
                      getExplorationDistrict(district.id);
                    const districtOpen =
                      isExplorationDistrictOpen(
                        district.id,
                        catalogDistrict?.available ?? null
                      );
                    const districtPlaces =
                      getExplorationPlacesByDistrict(
                        district.id
                      );
                    const districtVisited =
                      districtPlaces.filter((place) =>
                        completedPlaceIds.includes(place.id)
                      ).length;
                    const selected =
                      selectedJeonbukDistrictId ===
                      district.id;

                    return (
                      <Pressable
                        key={district.id}
                        onPress={() =>
                          openJeonbukDistrict(district.id)
                        }
                        style={({ pressed }) => [
                          styles.districtButton,
                          {
                            backgroundColor: selected
                              ? theme.background
                              : theme.card,
                            borderColor:
                              selected || districtOpen
                                ? theme.strongLine ??
                                  theme.line
                                : theme.line,
                            borderRadius: isCityBlack
                              ? 2
                              : 10,
                            opacity: pressed
                              ? 0.65
                              : districtOpen
                                ? 1
                                : 0.6,
                          },
                        ]}
                      >
                        <Text style={styles.districtIcon}>
                          {district.icon}
                        </Text>
                        <Text
                          style={[
                            styles.districtName,
                            { color: theme.text },
                          ]}
                        >
                          {district.name}
                        </Text>
                        <Text
                          style={[
                            styles.districtProgress,
                            { color: theme.subText },
                          ]}
                        >
                          {districtOpen
                            ? `${districtVisited}/${districtPlaces.length}곳`
                            : '준비 중'}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>
            </View>
          </>
        ) : extendedRegionConfig ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.text },
                    ]}
                  >
                    {extendedRegionConfig.title}{' '}
                    {extendedRegionConfig.shapes.length}개{' '}
                    {extendedRegionConfig.unitLabel} 탐험 지도
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: theme.subText },
                    ]}
                  >
                    {extendedRegionConfig.openCount ===
                    extendedRegionConfig.shapes.length
                      ? '모든 지역의 대표 장소와 테마 탐험이 열렸어요.'
                      : `${extendedRegionConfig.openCount}개 지역이 열렸어요. 나머지 지역은 준비 중이에요.`}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.openCount,
                    { color: theme.text },
                  ]}
                >
                  {extendedRegionConfig.openCount}/
                  {extendedRegionConfig.shapes.length}개 지역
                </Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } =
                    event.nativeEvent.layout;
                  setExtendedMapLayout({ width, height });
                }}
                onPress={handleExtendedMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    minHeight: 430,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 460 440"
                  pointerEvents="none"
                >
                  <G>
                    {extendedRegionConfig.shapes.map(
                      (shape) => {
                        const catalogDistrict =
                          getExplorationDistrict(shape.id);
                        const available =
                          isExplorationDistrictOpen(
                            shape.id,
                            catalogDistrict?.available ?? null
                          );
                        const selected =
                          selectedDistrictId === shape.id;

                        return (
                          <G key={shape.id}>
                            <Polygon
                              points={shape.points}
                              fill={
                                selected
                                  ? isCityBlack
                                    ? '#EFEFEF'
                                    : '#E7DDCF'
                                  : available
                                    ? isCityBlack
                                      ? '#666666'
                                      : '#F5EFE7'
                                    : isCityBlack
                                      ? '#272727'
                                      : '#F2F2F2'
                              }
                              stroke={
                                selected
                                  ? theme.strongLine ??
                                    theme.line
                                  : theme.line
                              }
                              strokeWidth={
                                selected ? 2.5 : 1
                              }
                            />
                            <SvgText
                              x={shape.labelX}
                              y={shape.labelY}
                              fontSize={
                                shape.name.length >= 4
                                  ? 7
                                  : 8.5
                              }
                              fontWeight={
                                selected ? '700' : '500'
                              }
                              fill={
                                selected
                                  ? isCityBlack
                                    ? '#111111'
                                    : '#4D4035'
                                  : available
                                    ? theme.text
                                    : theme.subText
                              }
                              textAnchor="middle"
                            >
                              {shape.name}
                            </SvgText>
                          </G>
                        );
                      }
                    )}
                  </G>
                </Svg>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.districtButtonRow
                }
              >
                {extendedRegionConfig.shapes.map(
                  (district) => {
                    const catalogDistrict =
                      getExplorationDistrict(district.id);
                    const districtOpen =
                      isExplorationDistrictOpen(
                        district.id,
                        catalogDistrict?.available ?? null
                      );
                    const districtPlaces =
                      getExplorationPlacesByDistrict(
                        district.id
                      );
                    const districtVisited =
                      districtPlaces.filter((place) =>
                        completedPlaceIds.includes(place.id)
                      ).length;
                    const selected =
                      selectedDistrictId === district.id;

                    return (
                      <Pressable
                        key={district.id}
                        onPress={() =>
                          openDistrict(district.id)
                        }
                        style={({ pressed }) => [
                          styles.districtButton,
                          {
                            backgroundColor: selected
                              ? theme.background
                              : theme.card,
                            borderColor:
                              selected || districtOpen
                                ? theme.strongLine ??
                                  theme.line
                                : theme.line,
                            borderRadius: isCityBlack
                              ? 2
                              : 10,
                            opacity: pressed
                              ? 0.65
                              : districtOpen
                                ? 1
                                : 0.6,
                          },
                        ]}
                      >
                        <Text style={styles.districtIcon}>
                          {district.icon}
                        </Text>
                        <Text
                          style={[
                            styles.districtName,
                            { color: theme.text },
                          ]}
                        >
                          {district.name}
                        </Text>
                        <Text
                          style={[
                            styles.districtProgress,
                            { color: theme.subText },
                          ]}
                        >
                          {districtOpen
                            ? `${districtVisited}/${districtPlaces.length}곳`
                            : '준비 중'}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>
            </View>

            <View
              style={[
                styles.districtSummaryCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.districtSummaryTop}>
                <View style={styles.districtTitleRow}>
                  <Text style={styles.districtSummaryIcon}>
                    {selectedDistrict?.icon ?? '🗺️'}
                  </Text>
                  <View style={styles.busanSummaryTextBlock}>
                    <Text
                      style={[
                        styles.districtSummaryTitle,
                        { color: theme.text },
                      ]}
                    >
                      {selectedDistrict?.name ?? '지역'} 탐험
                    </Text>
                    <Text
                      style={[
                        styles.districtSummarySubtitle,
                        { color: theme.subText },
                      ]}
                    >
                      {selectedDistrict?.subtitle ??
                        '지역 대표 장소 탐험'}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.districtSummaryPercent,
                    { color: theme.text },
                  ]}
                >
                  {districtPercent}%
                </Text>
              </View>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.background },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${districtPercent}%`,
                      backgroundColor:
                        theme.strongLine ?? theme.line,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.districtSummaryCount,
                  { color: theme.subText },
                ]}
              >
                방문 {visitedInSelectedDistrict}/
                {selectedPlaces.length}곳 · 테마{' '}
                {
                  selectedThemes.filter((item) =>
                    rewards.unlockedThemeBadgeIds.includes(
                      item.id
                    )
                  ).length
                }
                /{selectedThemes.length}개 완료
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text },
                ]}
              >
                테마 탐험
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.themeRow}
              >
                {selectedThemes.map((item) => {
                  const visitedCount =
                    item.requiredPlaceIds.filter((id) =>
                      completedPlaceIds.includes(id)
                    ).length;
                  const percent = Math.round(
                    (visitedCount /
                      Math.max(
                        1,
                        item.requiredPlaceIds.length
                      )) *
                      100
                  );
                  const completed =
                    rewards.unlockedThemeBadgeIds.includes(
                      item.id
                    );

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.themeCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: completed
                            ? theme.strongLine ?? theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 3
                            : 14,
                        },
                      ]}
                    >
                      <View style={styles.themeTop}>
                        <Text style={styles.themeIcon}>
                          {item.icon}
                        </Text>
                        <Text
                          style={[
                            styles.themeStatus,
                            { color: theme.subText },
                          ]}
                        >
                          {completed ? '완료' : `${percent}%`}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.themeName,
                          { color: theme.text },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.themeDescription,
                          { color: theme.subText },
                        ]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                      <Text
                        style={[
                          styles.themeCount,
                          { color: theme.text },
                        ]}
                      >
                        {visitedCount}/
                        {item.requiredPlaceIds.length}곳 방문
                      </Text>
                      <View
                        style={[
                          styles.themeProgressTrack,
                          {
                            backgroundColor:
                              theme.background,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.themeProgressFill,
                            {
                              width: `${percent}%`,
                              backgroundColor:
                                theme.strongLine ??
                                theme.line,
                            },
                          ]}
                        />
                      </View>
                      {completed && (
                        <Pressable
                          onPress={() =>
                            void setAsMainBadge(item.id)
                          }
                          style={({ pressed }) => [
                            styles.mainBadgeButton,
                            {
                              borderColor: theme.line,
                              borderRadius: isCityBlack
                                ? 2
                                : 8,
                              opacity: pressed ? 0.65 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.mainBadgeButtonText,
                              { color: theme.text },
                            ]}
                          >
                            {mainBadgeId === item.id
                              ? '대표 뱃지 사용 중'
                              : '대표 뱃지로 설정'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View
              key={`extended-place-section-${selectedDistrictId}`}
              style={styles.sectionBlock}
              onLayout={(event) => {
                setPlaceSectionY(
                  event.nativeEvent.layout.y
                );
              }}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: theme.text },
                    ]}
                  >
                    탐험 장소
                  </Text>
                  <Text
                    style={[
                      styles.sectionSubtitle,
                      { color: theme.subText },
                    ]}
                  >
                    {selectedDistrict?.name ?? '지역'} 탐험 장소{' '}
                    {selectedPlaces.length}곳
                  </Text>
                </View>
                <Text
                  style={[
                    styles.openCount,
                    { color: theme.text },
                  ]}
                >
                  {visitedInSelectedDistrict}/
                  {selectedPlaces.length}
                </Text>
              </View>

              <View style={styles.placeList}>
                {selectedPlaces.length === 0 && (
                  <View
                    style={[
                      styles.placeCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.line,
                        borderRadius: isCityBlack
                          ? 3
                          : 14,
                      },
                    ]}
                  >
                    <View style={styles.placeContent}>
                      <Text
                        style={[
                          styles.placeName,
                          { color: theme.text },
                        ]}
                      >
                        장소 데이터를 다시 불러오는 중이에요.
                      </Text>
                      <Text
                        style={[
                          styles.placeMeta,
                          { color: theme.subText },
                        ]}
                      >
                        explorationCatalog.ts의 최신 지역
                        데이터가 함께 적용되어야 합니다.
                      </Text>
                    </View>
                  </View>
                )}

                {selectedPlaces.map((place) => {
                  const completed =
                    completedPlaceIds.includes(place.id);
                  const relatedThemes =
                    selectedThemes.filter((themeItem) =>
                      themeItem.requiredPlaceIds.includes(
                        place.id
                      )
                    );

                  return (
                    <Pressable
                      key={place.id}
                      onPress={() =>
                        router.push(
                          `/explore/place/${place.id}`
                        )
                      }
                      style={({ pressed }) => [
                        styles.placeCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: completed
                            ? theme.strongLine ?? theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 3
                            : 14,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.placeIconBox,
                          {
                            backgroundColor:
                              theme.background,
                            borderRadius: isCityBlack
                              ? 2
                              : 10,
                          },
                        ]}
                      >
                        <Text style={styles.placeIcon}>
                          {place.icon}
                        </Text>
                      </View>
                      <View style={styles.placeContent}>
                        <View style={styles.placeTitleRow}>
                          <Text
                            style={[
                              styles.placeName,
                              { color: theme.text },
                            ]}
                          >
                            {place.name}
                          </Text>
                          <Text
                            style={[
                              styles.placeStatus,
                              {
                                color: completed
                                  ? theme.text
                                  : theme.subText,
                              },
                            ]}
                          >
                            {completed
                              ? '방문 완료'
                              : `+${place.rewardPoints}P`}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.placeMeta,
                            { color: theme.subText },
                          ]}
                        >
                          {place.category} · {place.areaType}
                        </Text>
                        <View style={styles.placeTagRow}>
                          {relatedThemes.map(
                            (themeItem) => (
                              <View
                                key={themeItem.id}
                                style={[
                                  styles.placeTag,
                                  {
                                    borderColor: theme.line,
                                    borderRadius: isCityBlack
                                      ? 2
                                      : 6,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.placeTagText,
                                    { color: theme.subText },
                                  ]}
                                >
                                  {themeItem.icon}{' '}
                                  {themeItem.shortLabel}
                                </Text>
                              </View>
                            )
                          )}
                        </View>
                        <Text
                          style={[
                            styles.placeReward,
                            { color: theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          보상 · {place.rewardLabel} · 방문
                          스탬프
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={theme.subText}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : mapLevel === 'busan' ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>부산 16개 구·군 탐험 지도</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>중구·서구·동구·영도구·부산진구·동래구·남구·북구·금정구·강서구·사상구·사하구·연제구·수영구 탐험이 열렸어요.</Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>16개 지역</Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setBusanMapLayout({ width, height });
                }}
                onPress={handleBusanMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 360 330"
                  pointerEvents="none"
                >
                  <G>
                    {BUSAN_DISTRICT_SHAPES.map((shape) => {
                      const catalogDistrict = getExplorationDistrict(shape.id);
                      const available = isExplorationDistrictOpen(
                        shape.id,
                        catalogDistrict?.available ?? null
                      );
                      const selected = selectedBusanDistrictId === shape.id;

                      return (
                        <G key={shape.id}>
                          <Polygon
                            points={shape.points}
                            fill={
                              selected
                                ? isCityBlack
                                  ? '#EFEFEF'
                                  : '#E7DDCF'
                                : available
                                  ? isCityBlack
                                    ? '#666666'
                                    : '#F5EFE7'
                                  : isCityBlack
                                    ? '#272727'
                                    : '#F2F2F2'
                            }
                            stroke={
                              selected
                                ? theme.strongLine ?? theme.line
                                : theme.line
                            }
                            strokeWidth={selected ? 2.5 : 1}
                          />
                          <SvgText
                            x={shape.labelX}
                            y={shape.labelY}
                            fontSize={shape.name.length >= 4 ? 7.2 : 8.5}
                            fontWeight={selected ? '700' : '500'}
                            fill={
                              selected
                                ? isCityBlack
                                  ? '#111111'
                                  : '#4D4035'
                                : available
                                  ? theme.text
                                  : theme.subText
                            }
                            textAnchor="middle"
                          >
                            {shape.name}
                          </SvgText>
                        </G>
                      );
                    })}

                    <Circle
                      cx="235"
                      cy="292"
                      r="3"
                      fill={isCityBlack ? '#666666' : '#F5EFE7'}
                      stroke={theme.line}
                      strokeWidth="0.9"
                    />
                    <Circle
                      cx="248"
                      cy="300"
                      r="1.8"
                      fill={isCityBlack ? '#666666' : '#F5EFE7'}
                      stroke={theme.line}
                      strokeWidth="0.8"
                    />
                  </G>
                </Svg>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.districtButtonRow}
              >
                {BUSAN_DISTRICT_SHAPES.map((district) => {
                  const catalogDistrict = getExplorationDistrict(district.id);
                  const districtOpen = isExplorationDistrictOpen(
                    district.id,
                    catalogDistrict?.available ?? null
                  );
                  const districtPlaces = getExplorationPlacesByDistrict(district.id);
                  const districtVisited = districtPlaces.filter((place) =>
                    completedPlaceIds.includes(place.id)
                  ).length;
                  const selected = selectedBusanDistrictId === district.id;

                  return (
                    <Pressable
                      key={district.id}
                      onPress={() => openBusanDistrict(district.id)}
                      style={({ pressed }) => [
                        styles.districtButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor:
                            selected || districtOpen
                              ? theme.strongLine ?? theme.line
                              : theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed ? 0.65 : districtOpen ? 1 : 0.6,
                        },
                      ]}
                    >
                      <Text style={styles.districtIcon}>{district.icon}</Text>
                      <Text style={[styles.districtName, { color: theme.text }]}>{district.name}</Text>
                      <Text style={[styles.districtProgress, { color: theme.subText }]}>
                        {districtOpen
                          ? `${districtVisited}/${districtPlaces.length}곳`
                          : '준비 중'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View
              style={[
                styles.districtSummaryCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.districtSummaryTop}>
                <View style={styles.districtTitleRow}>
                  <Text style={styles.districtSummaryIcon}>{selectedBusanDistrict.icon}</Text>
                  <View style={styles.busanSummaryTextBlock}>
                    <Text style={[styles.districtSummaryTitle, { color: theme.text }]}>{selectedBusanDistrict.name} 탐험</Text>
                    <Text style={[styles.districtSummarySubtitle, { color: theme.subText }]}>{selectedBusanDistrict.subtitle}</Text>
                  </View>
                </View>
                <Text style={[styles.districtSummaryPercent, { color: theme.text }]}>
                  {selectedBusanCatalogDistrict?.available ? `${busanDistrictPercent}%` : '준비'}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${busanDistrictPercent}%`,
                      backgroundColor: theme.strongLine ?? theme.line,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.districtSummaryCount, { color: theme.subText }]}>
                {selectedBusanCatalogDistrict?.available
                  ? `방문 ${visitedInSelectedBusanDistrict}/${selectedBusanPlaces.length}곳 · 테마 ${selectedBusanThemes.filter((item) => rewards.unlockedThemeBadgeIds.includes(item.id)).length}/${selectedBusanThemes.length}개 완료`
                  : '부산 중구·서구·동구·영도구·부산진구·동래구·남구·북구·금정구·강서구·사상구·사하구·연제구·수영구·해운대구·기장군 탐험이 열렸어요. 부산 16개 구·군의 모든 지역 탐험이 열렸어요.'}
              </Text>
            </View>

            {selectedBusanCatalogDistrict?.available && (
              <>
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>테마 탐험</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.themeRow}
                  >
                    {selectedBusanThemes.map((item) => {
                      const visitedCount = item.requiredPlaceIds.filter((id) =>
                        completedPlaceIds.includes(id)
                      ).length;
                      const percent = Math.round(
                        (visitedCount / Math.max(1, item.requiredPlaceIds.length)) * 100
                      );
                      const completed = rewards.unlockedThemeBadgeIds.includes(item.id);

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.themeCard,
                            {
                              backgroundColor: theme.card,
                              borderColor: completed
                                ? theme.strongLine ?? theme.line
                                : theme.line,
                              borderRadius: isCityBlack ? 3 : 14,
                            },
                          ]}
                        >
                          <View style={styles.themeTop}>
                            <Text style={styles.themeIcon}>{item.icon}</Text>
                            <Text style={[styles.themeStatus, { color: theme.subText }]}>{completed ? '완료' : `${percent}%`}</Text>
                          </View>
                          <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.themeDescription, { color: theme.subText }]} numberOfLines={2}>{item.description}</Text>
                          <Text style={[styles.themeCount, { color: theme.text }]}>{visitedCount}/{item.requiredPlaceIds.length}곳 방문</Text>
                          <View style={[styles.themeProgressTrack, { backgroundColor: theme.background }]}>
                            <View style={[styles.themeProgressFill, { width: `${percent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
                          </View>
                          {completed && (
                            <Pressable
                              onPress={() => void setAsMainBadge(item.id)}
                              style={({ pressed }) => [
                                styles.mainBadgeButton,
                                {
                                  borderColor: theme.line,
                                  borderRadius: isCityBlack ? 2 : 8,
                                  opacity: pressed ? 0.65 : 1,
                                },
                              ]}
                            >
                              <Text style={[styles.mainBadgeButtonText, { color: theme.text }]}>{mainBadgeId === item.id ? '대표 뱃지 사용 중' : '대표 뱃지로 설정'}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View
                  key={`busan-place-section-${selectedBusanDistrictId}`}
                  style={styles.sectionBlock}
                  onLayout={(event) => {
                    setPlaceSectionY(event.nativeEvent.layout.y);
                  }}
                >
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 장소</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>{selectedBusanDistrict.name} 탐험 장소 {selectedBusanPlaces.length}곳</Text>
                    </View>
                    <Text style={[styles.openCount, { color: theme.text }]}>{visitedInSelectedBusanDistrict}/{selectedBusanPlaces.length}</Text>
                  </View>

                  <View style={styles.placeList}>
                    {selectedBusanPlaces.map((place) => {
                      const completed = completedPlaceIds.includes(place.id);
                      const relatedThemes = selectedBusanThemes.filter((themeItem) =>
                        themeItem.requiredPlaceIds.includes(place.id)
                      );

                      return (
                        <Pressable
                          key={place.id}
                          onPress={() => router.push(`/explore/place/${place.id}`)}
                          style={({ pressed }) => [
                            styles.placeCard,
                            {
                              backgroundColor: theme.card,
                              borderColor: completed
                                ? theme.strongLine ?? theme.line
                                : theme.line,
                              borderRadius: isCityBlack ? 3 : 14,
                              opacity: pressed ? 0.65 : 1,
                            },
                          ]}
                        >
                          <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}>
                            <Text style={styles.placeIcon}>{place.icon}</Text>
                          </View>
                          <View style={styles.placeContent}>
                            <View style={styles.placeTitleRow}>
                              <Text style={[styles.placeName, { color: theme.text }]}>{place.name}</Text>
                              <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>{completed ? '방문 완료' : `+${place.rewardPoints}P`}</Text>
                            </View>
                            <Text style={[styles.placeMeta, { color: theme.subText }]}>{place.category} · {place.areaType}</Text>
                            <View style={styles.placeTagRow}>
                              {relatedThemes.map((themeItem) => (
                                <View key={themeItem.id} style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}>
                                  <Text style={[styles.placeTagText, { color: theme.subText }]}>{themeItem.icon} {themeItem.shortLabel}</Text>
                                </View>
                              ))}
                            </View>
                            <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>보상 · {place.rewardLabel} · 방문 스탬프</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View
              style={[
                styles.nextRegionCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 13,
                },
              ]}
            >
              <Text style={styles.nextRegionIcon}>🗼</Text>
              <View style={styles.nextRegionContent}>
                <Text style={[styles.nextRegionTitle, { color: theme.text }]}>부산 중구·서구·동구·영도구·부산진구·동래구·남구·북구·금정구·강서구·사상구·사하구·연제구·수영구·해운대구·기장군 탐험 열림</Text>
                <Text style={[styles.nextRegionSubtitle, { color: theme.subText }]}>원도심·송도·산복도로·영도 해안·서면 도심·동래 역사온천·남구 해안평화·북구 낙동강구포·금정 산성회동호·강서 낙동강가덕도·사상 생태숲길생활문화·사하 다대포을숙도·연제 배산온천천·수영 광안리망미·해운대 동백삼포·기장 오시리아해안마을 대표 장소 160곳, 테마 뱃지 48개를 탐험할 수 있어요.</Text>
              </View>
            </View>
          </>
        ) : mapLevel === 'jeju' ? (
          <>
            <View
              style={[
                styles.mapCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>제주 2개 행정시 탐험 지도</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>제주시와 서귀포시 대표 장소 탐험이 모두 열렸어요.</Text>
                </View>
                <Text style={[styles.openCount, { color: theme.text }]}>2/2개 지역</Text>
              </View>

              <Pressable
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  setJejuMapLayout({ width, height });
                }}
                onPress={handleJejuMapPress}
                style={({ pressed }) => [
                  styles.svgBox,
                  {
                    backgroundColor: theme.background,
                    opacity: pressed ? 0.97 : 1,
                  },
                ]}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 360 220"
                  pointerEvents="none"
                >
                  <G>
                    {JEJU_CITY_SHAPES.map((shape) => {
                      const selected = selectedJejuCityId === shape.id;
                      const cityOpen = OPEN_EXPLORATION_DISTRICT_IDS.has(shape.id);

                      return (
                        <G key={shape.id}>
                          <Polygon
                            points={shape.points}
                            fill={
                              selected
                                ? isCityBlack
                                  ? '#EFEFEF'
                                  : '#E7DDCF'
                                : cityOpen
                                  ? isCityBlack
                                    ? '#666666'
                                    : '#F5EFE7'
                                  : isCityBlack
                                    ? '#444444'
                                    : '#ECE8E2'
                            }
                            stroke={
                              selected || cityOpen
                                ? theme.strongLine ?? theme.line
                                : theme.line
                            }
                            strokeWidth={selected ? 2.5 : 1.2}
                            opacity={cityOpen || selected ? 1 : 0.72}
                          />
                          <SvgText
                            x={shape.labelX}
                            y={shape.labelY}
                            fontSize="12"
                            fontWeight={selected ? '800' : '600'}
                            fill={
                              selected
                                ? isCityBlack
                                  ? '#111111'
                                  : '#4D4035'
                                : theme.text
                            }
                            textAnchor="middle"
                          >
                            {shape.name}
                          </SvgText>
                        </G>
                      );
                    })}

                    <Circle
                      cx="333"
                      cy="73"
                      r="6"
                      fill={isCityBlack ? '#666666' : '#F5EFE7'}
                      stroke={theme.line}
                      strokeWidth="1"
                    />
                    <SvgText x="333" y="59" fontSize="7" fill={theme.subText} textAnchor="middle">우도</SvgText>
                    <Circle
                      cx="103"
                      cy="202"
                      r="3.5"
                      fill={isCityBlack ? '#666666' : '#F5EFE7'}
                      stroke={theme.line}
                      strokeWidth="0.8"
                    />
                    <Circle
                      cx="82"
                      cy="211"
                      r="2.6"
                      fill={isCityBlack ? '#666666' : '#F5EFE7'}
                      stroke={theme.line}
                      strokeWidth="0.8"
                    />
                  </G>
                </Svg>
              </Pressable>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.districtButtonRow}
              >
                {JEJU_CITY_SHAPES.map((city) => {
                  const selected = selectedJejuCityId === city.id;
                  const cityPlaces = getExplorationPlacesByDistrict(city.id);
                  const cityVisited = cityPlaces.filter((place) =>
                    completedPlaceIds.includes(place.id)
                  ).length;
                  const cityOpen = OPEN_EXPLORATION_DISTRICT_IDS.has(city.id);

                  return (
                    <Pressable
                      key={city.id}
                      onPress={() => openJejuCity(city.id)}
                      style={({ pressed }) => [
                        styles.districtButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor:
                            selected || cityOpen
                              ? theme.strongLine ?? theme.line
                              : theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed ? 0.65 : cityOpen ? 1 : 0.6,
                        },
                      ]}
                    >
                      <Text style={styles.districtIcon}>{city.icon}</Text>
                      <Text style={[styles.districtName, { color: theme.text }]}>{city.name}</Text>
                      <Text style={[styles.districtProgress, { color: theme.subText }]}>
                        {cityOpen ? `${cityVisited}/${cityPlaces.length}곳` : '준비 중'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View
              style={[
                styles.districtSummaryCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            >
              <View style={styles.districtSummaryTop}>
                <View style={styles.districtTitleRow}>
                  <Text style={styles.districtSummaryIcon}>{selectedJejuCity.icon}</Text>
                  <View style={styles.busanSummaryTextBlock}>
                    <Text style={[styles.districtSummaryTitle, { color: theme.text }]}>{selectedJejuCity.name} 탐험</Text>
                    <Text style={[styles.districtSummarySubtitle, { color: theme.subText }]}>{selectedJejuCity.subtitle}</Text>
                  </View>
                </View>
                <Text style={[styles.districtSummaryPercent, { color: theme.text }]}>
                  {selectedJejuCatalogDistrict?.available ? `${jejuCityPercent}%` : '준비'}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.background }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${jejuCityPercent}%`,
                      backgroundColor: theme.strongLine ?? theme.line,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.districtSummaryCount, { color: theme.subText }]}>
                {selectedJejuCatalogDistrict?.available
                  ? `방문 ${visitedInSelectedJejuCity}/${selectedJejuPlaces.length}곳 · 테마 ${selectedJejuThemes.filter((item) => rewards.unlockedThemeBadgeIds.includes(item.id)).length}/${selectedJejuThemes.length}개 완료`
                  : '제주시와 서귀포시 대표 장소 60곳, 테마 뱃지 18개 탐험이 모두 열렸어요.'}
              </Text>
            </View>

            {selectedJejuCatalogDistrict?.available && (
              <>
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>테마 탐험</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.themeRow}
                  >
                    {selectedJejuThemes.map((item) => {
                      const visitedCount = item.requiredPlaceIds.filter((id) =>
                        completedPlaceIds.includes(id)
                      ).length;
                      const percent = Math.round(
                        (visitedCount / Math.max(1, item.requiredPlaceIds.length)) * 100
                      );
                      const completed = rewards.unlockedThemeBadgeIds.includes(item.id);

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.themeCard,
                            {
                              backgroundColor: theme.card,
                              borderColor: completed
                                ? theme.strongLine ?? theme.line
                                : theme.line,
                              borderRadius: isCityBlack ? 3 : 14,
                            },
                          ]}
                        >
                          <View style={styles.themeTop}>
                            <Text style={styles.themeIcon}>{item.icon}</Text>
                            <Text style={[styles.themeStatus, { color: theme.subText }]}>{completed ? '완료' : `${percent}%`}</Text>
                          </View>
                          <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.themeDescription, { color: theme.subText }]} numberOfLines={2}>{item.description}</Text>
                          <Text style={[styles.themeCount, { color: theme.text }]}>{visitedCount}/{item.requiredPlaceIds.length}곳 방문</Text>
                          <View style={[styles.themeProgressTrack, { backgroundColor: theme.background }]}>
                            <View style={[styles.themeProgressFill, { width: `${percent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
                          </View>
                          {completed && (
                            <Pressable
                              onPress={() => void setAsMainBadge(item.id)}
                              style={({ pressed }) => [
                                styles.mainBadgeButton,
                                {
                                  borderColor: theme.line,
                                  borderRadius: isCityBlack ? 2 : 8,
                                  opacity: pressed ? 0.65 : 1,
                                },
                              ]}
                            >
                              <Text style={[styles.mainBadgeButtonText, { color: theme.text }]}>{mainBadgeId === item.id ? '대표 뱃지 사용 중' : '대표 뱃지로 설정'}</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                <View
                  key={`jeju-place-section-${selectedJejuCityId}`}
                  style={styles.sectionBlock}
                  onLayout={(event) => {
                    setPlaceSectionY(event.nativeEvent.layout.y);
                  }}
                >
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 장소</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>{selectedJejuCity.name} 탐험 장소 {selectedJejuPlaces.length}곳</Text>
                    </View>
                    <Text style={[styles.openCount, { color: theme.text }]}>{visitedInSelectedJejuCity}/{selectedJejuPlaces.length}</Text>
                  </View>

                  <View style={styles.placeList}>
                    {selectedJejuPlaces.map((place) => {
                      const completed = completedPlaceIds.includes(place.id);
                      const relatedThemes = selectedJejuThemes.filter((themeItem) =>
                        themeItem.requiredPlaceIds.includes(place.id)
                      );

                      return (
                        <Pressable
                          key={place.id}
                          onPress={() => router.push(`/explore/place/${place.id}`)}
                          style={({ pressed }) => [
                            styles.placeCard,
                            {
                              backgroundColor: theme.card,
                              borderColor: completed
                                ? theme.strongLine ?? theme.line
                                : theme.line,
                              borderRadius: isCityBlack ? 3 : 14,
                              opacity: pressed ? 0.65 : 1,
                            },
                          ]}
                        >
                          <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}>
                            <Text style={styles.placeIcon}>{place.icon}</Text>
                          </View>
                          <View style={styles.placeContent}>
                            <View style={styles.placeTitleRow}>
                              <Text style={[styles.placeName, { color: theme.text }]}>{place.name}</Text>
                              <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>{completed ? '방문 완료' : `+${place.rewardPoints}P`}</Text>
                            </View>
                            <Text style={[styles.placeMeta, { color: theme.subText }]}>{place.category} · {place.areaType}</Text>
                            <View style={styles.placeTagRow}>
                              {relatedThemes.map((themeItem) => (
                                <View key={themeItem.id} style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}>
                                  <Text style={[styles.placeTagText, { color: theme.subText }]}>{themeItem.icon} {themeItem.shortLabel}</Text>
                                </View>
                              ))}
                            </View>
                            <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>보상 · {place.rewardLabel} · 방문 스탬프</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View
              style={[
                styles.nextRegionCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 13,
                },
              ]}
            >
              <Text style={styles.nextRegionIcon}>🍊</Text>
              <View style={styles.nextRegionContent}>
                <Text style={[styles.nextRegionTitle, { color: theme.text }]}>제주 2개 행정시 대표 장소 60곳 탐험 열림</Text>
                <Text style={[styles.nextRegionSubtitle, { color: theme.subText }]}>한라산·섬·해변·오름·용암숲·박물관과 서귀포 폭포·민속·차밭·남쪽섬 테마 18개를 탐험할 수 있어요.</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View
          style={[
            styles.mapCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>서울 25개 구 탐험 지도</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>{`현재 ${displayDistricts.filter((district) =>
                isExplorationDistrictOpen(district.id, district.available)
              ).length}개 지역이 열렸어요.`}</Text>
            </View>
            <Text style={[styles.openCount, { color: theme.text }]}>{displayDistricts.filter((district) =>
                isExplorationDistrictOpen(district.id, district.available)
              ).length}개 지역</Text>
          </View>

          <Pressable
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setMapLayout({ width, height });
            }}
            onPress={handleMapPress}
            style={({ pressed }) => [
              styles.svgBox,
              {
                backgroundColor: theme.background,
                opacity: pressed ? 0.97 : 1,
              },
            ]}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 360 330"
              pointerEvents="none"
            >
              <G>
                {SEOUL_DISTRICT_SHAPES.map((shape) => {
                  const district = getExplorationDistrict(shape.id);
                  const available = isExplorationDistrictOpen(
                    shape.id,
                    district?.available ?? null
                  );
                  const selected = selectedDistrictId === shape.id;

                  return (
                    <G key={shape.id}>
                      <Polygon
                        points={shape.points}
                        fill={
                          selected
                            ? isCityBlack
                              ? '#EFEFEF'
                              : '#E7DDCF'
                            : available
                              ? isCityBlack
                                ? '#666666'
                                : '#F5EFE7'
                              : isCityBlack
                                ? '#272727'
                                : '#F2F2F2'
                        }
                        stroke={
                          selected
                            ? theme.strongLine ?? theme.line
                            : theme.line
                        }
                        strokeWidth={selected ? 2.5 : 1}
                      />
                      <SvgText
                        x={shape.labelX}
                        y={shape.labelY}
                        fontSize={available ? 8.5 : 7.2}
                        fontWeight={selected ? '700' : '500'}
                        fill={
                          selected
                            ? isCityBlack
                              ? '#111111'
                              : '#4D4035'
                            : available
                              ? theme.text
                              : theme.subText
                        }
                        textAnchor="middle"
                      >
                        {shape.name}
                      </SvgText>
                    </G>
                  );
                })}
              </G>
            </Svg>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.districtButtonRow}
          >
            {displayDistricts.map((district) => {
              const districtPlaces = getExplorationPlacesByDistrict(district.id);
              const districtVisited = districtPlaces.filter((place) =>
                completedPlaceIds.includes(place.id)
              ).length;
              const selected = selectedDistrictId === district.id;
              const districtOpen = isExplorationDistrictOpen(
                district.id,
                district.available
              );

              return (
                <Pressable
                  key={district.id}
                  onPress={() => openDistrict(district.id)}
                  style={({ pressed }) => [
                    styles.districtButton,
                    {
                      backgroundColor: selected ? theme.background : theme.card,
                      borderColor:
                        selected || districtOpen
                          ? theme.strongLine ?? theme.line
                          : theme.line,
                      borderRadius: isCityBlack ? 2 : 10,
                      opacity: pressed ? 0.65 : districtOpen ? 1 : 0.6,
                    },
                  ]}
                >
                  <Text style={styles.districtIcon}>{district.icon}</Text>
                  <Text style={[styles.districtName, { color: theme.text }]}>{district.name}</Text>
                  <Text style={[styles.districtProgress, { color: theme.subText }]}> 
                    {districtOpen
                      ? `${districtVisited}/${districtPlaces.length}곳`
                      : '준비 중'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View
          style={[
            styles.districtSummaryCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.districtSummaryTop}>
            <View style={styles.districtTitleRow}>
              <Text style={styles.districtSummaryIcon}>{selectedDistrict.icon}</Text>
              <View>
                <Text style={[styles.districtSummaryTitle, { color: theme.text }]}>{selectedDistrict.name} 탐험</Text>
                <Text style={[styles.districtSummarySubtitle, { color: theme.subText }]}>{selectedDistrict.subtitle}</Text>
              </View>
            </View>
            <Text style={[styles.districtSummaryPercent, { color: theme.text }]}>{districtPercent}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.background }]}> 
            <View
              style={[
                styles.progressFill,
                {
                  width: `${districtPercent}%`,
                  backgroundColor: theme.strongLine ?? theme.line,
                },
              ]}
            />
          </View>
          <Text style={[styles.districtSummaryCount, { color: theme.subText }]}>방문 {visitedInSelectedDistrict}/{selectedPlaces.length}곳 · 테마 {selectedThemes.filter((item) => rewards.unlockedThemeBadgeIds.includes(item.id)).length}/{selectedThemes.length}개 완료</Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>테마 탐험</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
            {selectedThemes.map((item) => {
              const visitedCount = item.requiredPlaceIds.filter((id) => completedPlaceIds.includes(id)).length;
              const percent = Math.round((visitedCount / item.requiredPlaceIds.length) * 100);
              const completed = rewards.unlockedThemeBadgeIds.includes(item.id);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: completed ? theme.strongLine ?? theme.line : theme.line,
                      borderRadius: isCityBlack ? 3 : 14,
                    },
                  ]}
                >
                  <View style={styles.themeTop}>
                    <Text style={styles.themeIcon}>{item.icon}</Text>
                    <Text style={[styles.themeStatus, { color: theme.subText }]}>{completed ? '완료' : `${percent}%`}</Text>
                  </View>
                  <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.themeDescription, { color: theme.subText }]} numberOfLines={2}>{item.description}</Text>
                  <Text style={[styles.themeCount, { color: theme.text }]}>{visitedCount}/{item.requiredPlaceIds.length}곳 방문</Text>
                  <View style={[styles.themeProgressTrack, { backgroundColor: theme.background }]}> 
                    <View style={[styles.themeProgressFill, { width: `${percent}%`, backgroundColor: theme.strongLine ?? theme.line }]} />
                  </View>
                  {completed && (
                    <Pressable
                      onPress={() => void setAsMainBadge(item.id)}
                      style={({ pressed }) => [
                        styles.mainBadgeButton,
                        {
                          borderColor: theme.line,
                          borderRadius: isCityBlack ? 2 : 8,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.mainBadgeButtonText, { color: theme.text }]}>{mainBadgeId === item.id ? '대표 뱃지 사용 중' : '대표 뱃지로 설정'}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View
          key={`place-section-${selectedDistrictId}`}
          style={styles.sectionBlock}
          onLayout={(event) => {
            setPlaceSectionY(event.nativeEvent.layout.y);
          }}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>탐험 장소</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>
                {selectedDistrict.name} 탐험 장소 {selectedPlaces.length}곳 · 모두 불러옴
              </Text>
            </View>
            <Text style={[styles.openCount, { color: theme.text }]}>{visitedInSelectedDistrict}/{selectedPlaces.length}</Text>
          </View>

          <View style={styles.placeList}>
            {selectedPlaces.length === 0 && (
              <View
                style={[
                  styles.placeCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 3 : 14,
                  },
                ]}
              >
                <View style={styles.placeContent}>
                  <Text style={[styles.placeName, { color: theme.text }]}>
                    장소 데이터를 다시 불러오는 중이에요.
                  </Text>
                  <Text style={[styles.placeMeta, { color: theme.subText }]}>
                    앱을 새로고침하면 선택한 지역의 장소가 표시됩니다.
                  </Text>
                </View>
              </View>
            )}

            {selectedPlaces.map((place) => {
              const completed = completedPlaceIds.includes(place.id);
              const relatedThemes = selectedThemes.filter((themeItem) =>
                themeItem.requiredPlaceIds.includes(place.id)
              );

              return (
                <Pressable
                  key={place.id}
                  onPress={() => router.push(`/explore/place/${place.id}`)}
                  style={({ pressed }) => [
                    styles.placeCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: completed ? theme.strongLine ?? theme.line : theme.line,
                      borderRadius: isCityBlack ? 3 : 14,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <View style={[styles.placeIconBox, { backgroundColor: theme.background, borderRadius: isCityBlack ? 2 : 10 }]}>
                    <Text style={styles.placeIcon}>{place.icon}</Text>
                  </View>
                  <View style={styles.placeContent}>
                    <View style={styles.placeTitleRow}>
                      <Text style={[styles.placeName, { color: theme.text }]}>{place.name}</Text>
                      <Text style={[styles.placeStatus, { color: completed ? theme.text : theme.subText }]}>{completed ? '방문 완료' : `+${place.rewardPoints}P`}</Text>
                    </View>
                    <Text style={[styles.placeMeta, { color: theme.subText }]}>{place.category} · {place.areaType}</Text>
                    <View style={styles.placeTagRow}>
                      {relatedThemes.map((themeItem) => (
                        <View key={themeItem.id} style={[styles.placeTag, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 6 }]}>
                          <Text style={[styles.placeTagText, { color: theme.subText }]}>{themeItem.icon} {themeItem.shortLabel}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={[styles.placeReward, { color: theme.text }]} numberOfLines={1}>보상 · {place.rewardLabel} · 방문 스탬프</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                </Pressable>
              );
            })}
          </View>
        </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={nationalFestivalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setNationalFestivalModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 16,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.text },
              ]}
            >
              전국 축제·행사·전시
            </Text>

            <Text
              style={[
                styles.modalSummary,
                { color: theme.subText },
              ]}
            >
              {nationalFestivalRegionFilter === 'all'
                ? `전체 ${nationalFestivalList.length}개 · ${nationalFestivalPeriodLabel} · ${nationalFestivalAudienceLabel}`
                : `${nationalFestivalRegionLabel} ${nationalFestivalList.length}개 · ${nationalFestivalPeriodLabel} · ${nationalFestivalAudienceLabel}`}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.festivalRegionFilterScroll}
              contentContainerStyle={
                styles.festivalRegionFilterContent
              }
            >
              {NATIONAL_FESTIVAL_REGION_FILTERS.map(
                (option) => {
                  const selected =
                    nationalFestivalRegionFilter ===
                    option.id;

                  const regionCount =
                    option.id === 'all'
                      ? FESTIVAL_CATALOG.length
                      : FESTIVAL_CATALOG.filter(
                          (festival) =>
                            festival.regionId ===
                            option.id
                        ).length;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setNationalFestivalRegionFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.festivalRegionFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.festivalRegionFilterText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label} {regionCount}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={
                styles.festivalPeriodFilterScroll
              }
              contentContainerStyle={
                styles.festivalPeriodFilterContent
              }
            >
              {nationalFestivalPeriodOptions.map(
                (option) => {
                  const selected =
                    nationalFestivalPeriodFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setNationalFestivalPeriodFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.festivalPeriodFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed
                            ? 0.65
                            : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.festivalPeriodFilterLabel,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>

                      <Text
                        style={[
                          styles.festivalPeriodFilterCount,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {
                          nationalFestivalPeriodCounts[
                            option.id
                          ] ?? 0
                        }
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={
                styles.festivalAudienceFilterScroll
              }
              contentContainerStyle={
                styles.festivalAudienceFilterContent
              }
            >
              {NATIONAL_FESTIVAL_AUDIENCE_FILTERS.map(
                (option) => {
                  const selected =
                    nationalFestivalAudienceFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setNationalFestivalAudienceFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.festivalAudienceFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed
                            ? 0.65
                            : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.festivalAudienceFilterText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}{' '}
                        {
                          nationalFestivalAudienceCounts[
                            option.id
                          ] ?? 0
                        }
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <ScrollView
              style={styles.modalScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.placeList}>
                {nationalFestivalList.length === 0 && (
                  <View
                    style={[
                      styles.festivalEmptyCard,
                      {
                        backgroundColor:
                          theme.background,
                        borderColor: theme.line,
                        borderRadius: isCityBlack
                          ? 3
                          : 12,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.festivalEmptyTitle,
                        { color: theme.text },
                      ]}
                    >
                      조건에 맞는 콘텐츠가 없어요
                    </Text>

                    <Text
                      style={[
                        styles.festivalEmptyDescription,
                        { color: theme.subText },
                      ]}
                    >
                      지역·기간·추천 대상을 바꾸어 다시 확인해 보세요. 이번 주·다음 주는 정확한 일정이 있는 콘텐츠만 표시해요.
                    </Text>
                  </View>
                )}

                {nationalFestivalList.map((festival) => {
                  const completed =
                    completedPlaceIds.includes(festival.id);

                  return (
                    <Pressable
                      key={festival.id}
                      onPress={() => {
                        setNationalFestivalModalVisible(false);

                        router.push({
                          pathname:
                            '/explore/festival/[festivalId]',
                          params: {
                            festivalId:
                              festival.id,
                          },
                        } as any);
                      }}
                      style={({ pressed }) => [
                        styles.placeCard,
                        {
                          backgroundColor: theme.background,
                          borderColor: completed
                            ? theme.strongLine ?? theme.line
                            : theme.line,
                          borderRadius: isCityBlack ? 3 : 12,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.placeIconBox,
                          {
                            backgroundColor: theme.card,
                            borderRadius: isCityBlack ? 2 : 10,
                          },
                        ]}
                      >
                        <Text style={styles.placeIcon}>
                          {festival.icon}
                        </Text>
                      </View>

                      <View style={styles.placeContent}>
                        <View style={styles.placeTitleRow}>
                          <Text
                            style={[
                              styles.placeName,
                              { color: theme.text },
                            ]}
                          >
                            {festival.name}
                          </Text>

                          <Text
                            style={[
                              styles.placeStatus,
                              {
                                color: completed
                                  ? theme.text
                                  : theme.subText,
                              },
                            ]}
                          >
                            {completed
                              ? '참여 완료'
                              : `+${festival.rewardPoints}P`}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.placeMeta,
                            { color: theme.subText },
                          ]}
                        >
                          {getFestivalContentTypeLabel(festival)} · {festival.regionName} · {festival.districtName} · {festival.category}
                        </Text>

                        <Text
                          style={[
                            styles.festivalAudienceMeta,
                            { color: theme.subText },
                          ]}
                          numberOfLines={1}
                        >
                          추천{' '}
                          {getFestivalAudienceLabels(
                            festival
                          )
                            .slice(0, 3)
                            .join(' · ')}
                        </Text>

                        <Text
                          style={[
                            styles.placeReward,
                            { color: theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {getFestivalScheduleLabel(festival)} · {festival.venueName}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={theme.subText}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              onPress={() =>
                setNationalFestivalModalVisible(false)
              }
              style={({ pressed }) => [
                styles.modalButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: theme.text },
                ]}
              >
                닫기
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={seoulCultureModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSeoulCultureModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.cultureModalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 16,
              },
            ]}
          >
            <View style={styles.cultureModalTitleRow}>
              <View style={styles.cultureModalTitleBlock}>
                <Text
                  style={[
                    styles.cultureModalTitle,
                    { color: theme.text },
                  ]}
                >
                  서울 실시간 문화행사
                </Text>
                <Text
                  style={[
                    styles.cultureModalSubtitle,
                    { color: theme.subText },
                  ]}
                >
                  서울 열린데이터광장 · 공연·규모 전시·축제·교육·체험
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  void loadSeoulCultureData(true)
                }
                disabled={seoulCultureLoading}
                style={({ pressed }) => [
                  styles.cultureRefreshButton,
                  {
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 2 : 9,
                    opacity:
                      seoulCultureLoading
                        ? 0.45
                        : pressed
                          ? 0.65
                          : 1,
                  },
                ]}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={theme.text}
                />
              </Pressable>
            </View>

            <Text
              style={[
                styles.cultureModalSummary,
                { color: theme.subText },
              ]}
            >
              {filteredSeoulCultureEvents.length}개 · {seoulCulturePeriodLabel}
              {seoulCultureDistrictFilter === 'all'
                ? ' · 서울 전체'
                : ` · ${seoulCultureDistrictFilter}`}
              {seoulCultureFetchedAt
                ? ` · ${formatSeoulCultureFetchedAt(
                    seoulCultureFetchedAt
                  )}`
                : ''}
            </Text>

            {(seoulCultureSampleMode ||
              seoulCultureStaleCache) && (
              <View
                style={[
                  styles.cultureNoticeCard,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 2 : 9,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cultureNoticeText,
                    { color: theme.subText },
                  ]}
                >
                  {seoulCultureSampleMode
                    ? '현재 sample 인증키를 사용 중이라 최대 5개만 불러와요. .env에 실제 서울 열린데이터 인증키를 넣으면 전체 행사가 표시돼요.'
                    : '네트워크 연결이 원활하지 않아 마지막 저장 데이터를 표시하고 있어요.'}
                </Text>
              </View>
            )}

            <Text
              style={[
                styles.cultureFilterLabel,
                { color: theme.subText },
              ]}
            >
              기간
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cultureFilterScroll}
              contentContainerStyle={
                styles.cultureFilterContent
              }
            >
              {SEOUL_CULTURE_PERIOD_FILTERS.map(
                (option) => {
                  const selected =
                    seoulCulturePeriodFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setSeoulCulturePeriodFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.cultureFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cultureFilterText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <Text
              style={[
                styles.cultureFilterLabel,
                { color: theme.subText },
              ]}
            >
              자치구
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cultureFilterScroll}
              contentContainerStyle={
                styles.cultureFilterContent
              }
            >
              {seoulCultureDistrictOptions.map(
                (district) => {
                  const selected =
                    seoulCultureDistrictFilter ===
                    district;

                  return (
                    <Pressable
                      key={district}
                      onPress={() =>
                        setSeoulCultureDistrictFilter(
                          district
                        )
                      }
                      style={({ pressed }) => [
                        styles.cultureFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cultureFilterText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {district === 'all'
                          ? '전체'
                          : district}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <Text
              style={[
                styles.cultureFilterLabel,
                { color: theme.subText },
              ]}
            >
              종류
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cultureFilterScroll}
              contentContainerStyle={
                styles.cultureFilterContent
              }
            >
              {SEOUL_CULTURE_TYPE_FILTERS.map(
                (option) => {
                  const selected =
                    seoulCultureTypeFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setSeoulCultureTypeFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.cultureFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cultureFilterText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <Text
              style={[
                styles.cultureFilterLabel,
                { color: theme.subText },
              ]}
            >
              관람 조건
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cultureFilterScroll}
              contentContainerStyle={
                styles.cultureFilterContent
              }
            >
              {SEOUL_CULTURE_CONDITION_FILTERS.map(
                (option) => {
                  const selected =
                    seoulCultureConditionFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setSeoulCultureConditionFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.cultureFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cultureFilterText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <Text
              style={[
                styles.cultureFilterLabel,
                { color: theme.subText },
              ]}
            >
              추천 대상
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.cultureFilterScroll}
              contentContainerStyle={
                styles.cultureFilterContent
              }
            >
              {NATIONAL_FESTIVAL_AUDIENCE_FILTERS.map(
                (option) => {
                  const selected =
                    seoulCultureAudienceFilter ===
                    option.id;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        setSeoulCultureAudienceFilter(
                          option.id
                        )
                      }
                      style={({ pressed }) => [
                        styles.cultureFilterButton,
                        {
                          backgroundColor: selected
                            ? theme.background
                            : theme.card,
                          borderColor: selected
                            ? theme.strongLine ??
                              theme.line
                            : theme.line,
                          borderRadius: isCityBlack
                            ? 2
                            : 9,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cultureFilterText,
                          {
                            color: selected
                              ? theme.text
                              : theme.subText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>

            <ScrollView
              style={styles.cultureListScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {seoulCultureLoading &&
              filteredSeoulCultureEvents.length === 0 ? (
                <View style={styles.cultureLoadingBox}>
                  <ActivityIndicator
                    color={theme.text}
                  />
                  <Text
                    style={[
                      styles.cultureLoadingText,
                      { color: theme.subText },
                    ]}
                  >
                    서울 문화행사를 불러오고 있어요.
                  </Text>
                </View>
              ) : seoulCultureError ? (
                <View
                  style={[
                    styles.cultureEmptyCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 3 : 12,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cultureEmptyTitle,
                      { color: theme.text },
                    ]}
                  >
                    문화행사를 불러오지 못했어요
                  </Text>
                  <Text
                    style={[
                      styles.cultureEmptyDescription,
                      { color: theme.subText },
                    ]}
                  >
                    {seoulCultureError}
                  </Text>
                  <Pressable
                    onPress={() =>
                      void loadSeoulCultureData(true)
                    }
                    style={({ pressed }) => [
                      styles.cultureRetryButton,
                      {
                        borderColor: theme.line,
                        borderRadius: isCityBlack
                          ? 2
                          : 8,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cultureRetryButtonText,
                        { color: theme.text },
                      ]}
                    >
                      다시 불러오기
                    </Text>
                  </Pressable>
                </View>
              ) : filteredSeoulCultureEvents.length ===
                0 ? (
                <View
                  style={[
                    styles.cultureEmptyCard,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 3 : 12,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cultureEmptyTitle,
                      { color: theme.text },
                    ]}
                  >
                    조건에 맞는 문화행사가 없어요
                  </Text>
                  <Text
                    style={[
                      styles.cultureEmptyDescription,
                      { color: theme.subText },
                    ]}
                  >
                    기간·자치구·종류·관람 조건을 바꾸어 다시 확인해 보세요.
                  </Text>
                </View>
              ) : (
                <View style={styles.placeList}>
                  {filteredSeoulCultureEvents.map(
                    (event) => {
                      const completed =
                        completedPlaceIds.includes(
                          event.id
                        );

                      return (
                        <Pressable
                          key={event.id}
                          onPress={() => {
                            setSeoulCultureModalVisible(
                              false
                            );

                            router.push({
                              pathname:
                                '/explore/culture/[eventId]',
                              params: {
                                eventId: event.id,
                              },
                            } as any);
                          }}
                          style={({ pressed }) => [
                            styles.placeCard,
                            {
                              backgroundColor:
                                theme.background,
                              borderColor: completed
                                ? theme.strongLine ??
                                  theme.line
                                : theme.line,
                              borderRadius: isCityBlack
                                ? 3
                                : 12,
                              opacity: pressed
                                ? 0.65
                                : 1,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.placeIconBox,
                              {
                                backgroundColor:
                                  theme.card,
                                borderRadius:
                                  isCityBlack
                                    ? 2
                                    : 10,
                              },
                            ]}
                          >
                            <Text
                              style={styles.placeIcon}
                            >
                              {getSeoulCultureTypeIcon(
                                event.contentType
                              )}
                            </Text>
                          </View>

                          <View
                            style={styles.placeContent}
                          >
                            <View
                              style={styles.placeTitleRow}
                            >
                              <Text
                                style={[
                                  styles.placeName,
                                  { color: theme.text },
                                ]}
                                numberOfLines={2}
                              >
                                {event.title}
                              </Text>

                              <Text
                                style={[
                                  styles.placeStatus,
                                  {
                                    color: completed
                                      ? theme.text
                                      : theme.subText,
                                  },
                                ]}
                              >
                                {completed
                                  ? '참여 완료'
                                  : `+${event.rewardPoints}P`}
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.placeMeta,
                                { color: theme.subText },
                              ]}
                              numberOfLines={1}
                            >
                              {getSeoulCultureTypeLabel(
                                event.contentType
                              )} · {event.districtName} · {event.rawCategory}
                            </Text>

                            <Text
                              style={[
                                styles.cultureCardSecondary,
                                { color: theme.subText },
                              ]}
                              numberOfLines={1}
                            >
                              {event.isFree === true
                                ? '무료'
                                : event.isFree === false
                                  ? '유료'
                                  : '요금 확인'}{' '}
                              ·{' '}
                              {getSeoulCultureReservationLabel(
                                event.reservationStatus
                              )}{' '}
                              ·{' '}
                              {getSeoulCultureVenueTypeLabel(
                                event.venueType
                              )}
                            </Text>

                            <Text
                              style={[
                                styles.placeReward,
                                { color: theme.text },
                              ]}
                              numberOfLines={1}
                            >
                              {formatSeoulCultureDateLabel(
                                event
                              )}{event.eventTime
                                ? ` · ${event.eventTime}`
                                : ''}{' '}
                              · {event.place}
                            </Text>
                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={17}
                            color={theme.subText}
                          />
                        </Pressable>
                      );
                    }
                  )}
                </View>
              )}
            </ScrollView>

            <Pressable
              onPress={() =>
                setSeoulCultureModalVisible(false)
              }
              style={({ pressed }) => [
                styles.modalButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalButtonText,
                  { color: theme.text },
                ]}
              >
                닫기
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={rewardModalVisible} transparent animationType="fade" onRequestClose={() => setRewardModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>탐험 보상</Text>
            <Text style={[styles.modalSummary, { color: theme.subText }]}>포인트 {rewards.points}P · 건물 {rewards.unlockedBuildingIds.length}개 · 스탬프 {rewards.unlockedStampIds.length}개 · 뱃지 {rewards.unlockedThemeBadgeIds.length}개</Text>
            <ScrollView style={styles.modalScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {rewards.unlockedBuildingIds.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text }]}>획득한 건물·장식</Text>
                  {rewards.unlockedBuildingIds.map((id) => (
                    <Text key={id} style={[styles.modalItem, { color: theme.subText }]}>• {EXPLORATION_REWARD_NAMES[id] ?? id}</Text>
                  ))}
                </View>
              )}
              {rewards.unlockedThemeBadgeIds.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.text }]}>획득한 테마 뱃지</Text>
                  {rewards.unlockedThemeBadgeIds.map((id) => (
                    <Pressable key={id} onPress={() => void setAsMainBadge(id)} style={[styles.badgeListItem, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8 }]}>
                      <Text style={[styles.badgeListName, { color: theme.text }]}>{EXPLORATION_THEME_BADGE_NAMES[id] ?? id}</Text>
                      <Text style={[styles.badgeListStatus, { color: theme.subText }]}>{mainBadgeId === id ? '대표 뱃지' : '대표로 설정'}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
            <Pressable onPress={() => setRewardModalVisible(false)} style={({ pressed }) => [styles.modalButton, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8, opacity: pressed ? 0.65 : 1 }]}>
              <Text style={[styles.modalButtonText, { color: theme.text }]}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!newThemeBadgeId} transparent animationType="fade" onRequestClose={() => void closeThemeBadgeNotice()}>
        <View style={styles.modalOverlay}>
          <View style={[styles.badgeNoticeCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
            <Text style={styles.badgeNoticeIcon}>🏅</Text>
            <Text style={[styles.modalTitle, { color: theme.text }]}>새 탐험 뱃지 획득</Text>
            <Text style={[styles.badgeNoticeName, { color: theme.text }]}>{newThemeBadgeId ? EXPLORATION_THEME_BADGE_NAMES[newThemeBadgeId] ?? newThemeBadgeId : ''}</Text>
            <Text style={[styles.badgeNoticeDescription, { color: theme.subText }]}>{newThemeBadgeId ? EXPLORATION_THEME_BADGE_DESCRIPTIONS[newThemeBadgeId] ?? '' : ''}</Text>
            <Pressable onPress={() => void closeThemeBadgeNotice()} style={({ pressed }) => [styles.modalButton, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8, opacity: pressed ? 0.65 : 1 }]}>
              <Text style={[styles.modalButtonText, { color: theme.text }]}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!noticeModal} transparent animationType="fade" onRequestClose={() => setNoticeModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.noticeCard, { backgroundColor: theme.card, borderColor: theme.line, borderRadius: isCityBlack ? 4 : 16 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{noticeModal?.title}</Text>
            <Text style={[styles.noticeMessage, { color: theme.subText }]}>{noticeModal?.message}</Text>
            <Pressable onPress={() => setNoticeModal(null)} style={({ pressed }) => [styles.modalButton, { borderColor: theme.line, borderRadius: isCityBlack ? 2 : 8, opacity: pressed ? 0.65 : 1 }]}>
              <Text style={[styles.modalButtonText, { color: theme.text }]}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  explorationModeCard: {
    marginBottom: 12,
    padding: 5,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
  },
  explorationModeButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorationModeTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  explorationModeCount: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
  },
  festivalScopeRow: {
    marginBottom: 10,
    flexDirection: 'row',
    gap: 7,
  },
  festivalScopeButton: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  festivalScopeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  festivalEmptyCard: {
    padding: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  festivalEmptyTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  festivalEmptyText: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
  },
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  headerTitleArea: { flex: 1, minWidth: 0 },
  headerTextBlock: { flex: 1, minWidth: 0 },
  headerActionRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerBackButton: { width: 32, height: 32, borderWidth: 0.8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 18 },
  rewardButton: { minWidth: 54, height: 32, paddingHorizontal: 12, borderWidth: 0.8, alignItems: 'center', justifyContent: 'center' },
  rewardButtonText: { fontSize: 12, fontWeight: '700' },
  summaryCard: { borderWidth: 0.8, padding: 14 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 11 },
  summaryPoints: { marginTop: 3, fontSize: 22, fontWeight: '800' },
  summaryCounts: { alignItems: 'flex-end', gap: 3 },
  summaryCountText: { fontSize: 11, fontWeight: '600' },
  progressTrack: { marginTop: 11, height: 6, overflow: 'hidden' },
  progressFill: { height: '100%' },
  mapCard: { borderWidth: 0.8, padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  openCount: { fontSize: 12, fontWeight: '700' },
  svgBox: { marginTop: 12, height: 310, overflow: 'hidden' },
  koreaSvgBox: { marginTop: 12, height: 430, overflow: 'hidden' },
  koreaMapLegendRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12 },
  koreaMapLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  koreaMapLegendDot: { width: 9, height: 9, borderRadius: 5 },
  koreaMapLegendText: { fontSize: 10 },
  countryRegionButtonRow: { paddingTop: 13, gap: 8 },
  countryRegionButton: { width: 112, minHeight: 92, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 0.8, alignItems: 'center', justifyContent: 'center' },
  countryRegionIcon: { fontSize: 21 },
  countryRegionName: { marginTop: 5, fontSize: 11.5, fontWeight: '800', textAlign: 'center' },
  countryRegionStatus: { marginTop: 4, fontSize: 9.5, textAlign: 'center' },
  regionLaunchCard: { borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  regionLaunchIconBox: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  regionLaunchIcon: { fontSize: 28 },
  regionLaunchContent: { flex: 1, minWidth: 0 },
  regionLaunchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  regionLaunchTitle: { fontSize: 15, fontWeight: '800' },
  regionLaunchPercent: { fontSize: 14, fontWeight: '800' },
  regionLaunchSubtitle: { marginTop: 4, fontSize: 10.5 },
  regionLaunchAction: { marginTop: 7, fontSize: 11, fontWeight: '800' },
  nextRegionCard: { borderWidth: 0.8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextRegionIcon: { fontSize: 25 },
  nextRegionContent: { flex: 1, minWidth: 0 },
  nextRegionTitle: { fontSize: 12.5, fontWeight: '800' },
  nextRegionSubtitle: { marginTop: 4, fontSize: 10.5, lineHeight: 16 },
  districtButtonRow: { paddingTop: 12, gap: 8 },
  districtButton: { width: 96, paddingVertical: 10, paddingHorizontal: 9, borderWidth: 0.8, alignItems: 'center' },
  districtIcon: { fontSize: 20 },
  districtName: { marginTop: 4, fontSize: 12, fontWeight: '700' },
  districtProgress: { marginTop: 3, fontSize: 10 },
  districtSummaryCard: { borderWidth: 0.8, padding: 14 },
  districtSummaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  districtTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  busanSummaryTextBlock: { flex: 1, minWidth: 0 },
  districtSummaryIcon: { fontSize: 27 },
  districtSummaryTitle: { fontSize: 16, fontWeight: '800' },
  districtSummarySubtitle: { marginTop: 3, fontSize: 11 },
  districtSummaryPercent: { fontSize: 20, fontWeight: '800' },
  districtSummaryCount: { marginTop: 8, fontSize: 11 },
  sectionBlock: { gap: 10 },
  themeRow: { gap: 10, paddingRight: 16 },
  themeCard: { width: 220, padding: 13, borderWidth: 0.8 },
  themeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  themeIcon: { fontSize: 23 },
  themeStatus: { fontSize: 10, fontWeight: '700' },
  themeName: { marginTop: 8, fontSize: 14, fontWeight: '800' },
  themeDescription: { marginTop: 5, fontSize: 10.5, lineHeight: 15 },
  themeCount: { marginTop: 8, fontSize: 11, fontWeight: '700' },
  themeProgressTrack: { marginTop: 7, height: 5, overflow: 'hidden' },
  themeProgressFill: { height: '100%' },
  mainBadgeButton: { marginTop: 10, height: 30, borderWidth: 0.8, alignItems: 'center', justifyContent: 'center' },
  mainBadgeButtonText: { fontSize: 10.5, fontWeight: '700' },
  placeList: { gap: 8 },
  placeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 0.8 },
  placeIconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  placeIcon: { fontSize: 23 },
  placeContent: { flex: 1, minWidth: 0 },
  placeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  placeName: { flex: 1, fontSize: 13, fontWeight: '800' },
  placeStatus: { fontSize: 10.5, fontWeight: '700' },
  placeMeta: { marginTop: 3, fontSize: 10.5 },
  placeTagRow: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  placeTag: { borderWidth: 0.7, paddingHorizontal: 6, paddingVertical: 2 },
  placeTagText: { fontSize: 9.5 },
  placeReward: { marginTop: 6, fontSize: 10.5 },
  cultureModalCard: {
    width: '100%',
    maxHeight: '91%',
    borderWidth: 0.8,
    padding: 14,
  },
  cultureModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cultureModalTitleBlock: {
    flex: 1,
  },
  cultureModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cultureModalSubtitle: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 15,
  },
  cultureRefreshButton: {
    width: 34,
    height: 34,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cultureModalSummary: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 16,
  },
  cultureNoticeCard: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.8,
  },
  cultureNoticeText: {
    fontSize: 9.5,
    lineHeight: 15,
  },
  cultureFilterLabel: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 9.5,
    fontWeight: '800',
  },
  cultureFilterScroll: {
    flexGrow: 0,
  },
  cultureFilterContent: {
    paddingRight: 4,
    gap: 6,
  },
  cultureFilterButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cultureFilterText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  cultureListScroll: {
    marginTop: 10,
  },
  cultureLoadingBox: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cultureLoadingText: {
    fontSize: 10.5,
  },
  cultureEmptyCard: {
    minHeight: 125,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cultureEmptyTitle: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  cultureEmptyDescription: {
    marginTop: 7,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  cultureRetryButton: {
    marginTop: 12,
    minHeight: 32,
    paddingHorizontal: 13,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cultureRetryButtonText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  cultureCardSecondary: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: '700',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxHeight: '82%', borderWidth: 0.8, padding: 16 },
  noticeCard: { width: '100%', borderWidth: 0.8, padding: 16 },
  badgeNoticeCard: { width: '100%', borderWidth: 0.8, padding: 18, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  modalSummary: { marginTop: 7, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  festivalRegionFilterScroll: {
    marginTop: 12,
    flexGrow: 0,
  },
  festivalRegionFilterContent: {
    paddingRight: 4,
    gap: 6,
  },
  festivalRegionFilterButton: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  festivalRegionFilterText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  festivalPeriodFilterScroll: {
    marginTop: 9,
    flexGrow: 0,
  },
  festivalPeriodFilterContent: {
    paddingRight: 4,
    gap: 6,
  },
  festivalPeriodFilterButton: {
    minWidth: 82,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  festivalPeriodFilterLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  festivalPeriodFilterCount: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
  },
  festivalAudienceFilterScroll: {
    marginTop: 9,
    flexGrow: 0,
  },
  festivalAudienceFilterContent: {
    paddingRight: 4,
    gap: 6,
  },
  festivalAudienceFilterButton: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  festivalAudienceFilterText: {
    fontSize: 10,
    fontWeight: '800',
  },
  festivalAudienceMeta: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: '700',
  },
  
 
  festivalEmptyDescription: {
    marginTop: 7,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  modalScroll: { marginTop: 10 },
  modalSection: { marginBottom: 15 },
  modalSectionTitle: { marginBottom: 7, fontSize: 12, fontWeight: '800' },
  modalItem: { marginBottom: 5, fontSize: 11 },
  badgeListItem: { minHeight: 40, paddingHorizontal: 10, marginBottom: 6, borderWidth: 0.8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badgeListName: { flex: 1, fontSize: 11, fontWeight: '700' },
  badgeListStatus: { fontSize: 10 },
  modalButton: { marginTop: 14, height: 36, borderWidth: 0.8, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  modalButtonText: { fontSize: 12, fontWeight: '700' },
  badgeNoticeIcon: { fontSize: 42 },
  badgeNoticeName: { marginTop: 10, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  badgeNoticeDescription: { marginTop: 8, fontSize: 11, lineHeight: 18, textAlign: 'center' },
  noticeMessage: { marginTop: 9, fontSize: 11, lineHeight: 18, textAlign: 'center' },
});
