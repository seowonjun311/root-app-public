import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

import {
  deleteObject,
  getDownloadURL,
  getStorage,
  putFile,
  ref as storageRef,
} from '@react-native-firebase/storage';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { captureRef } from 'react-native-view-shot';

import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import Svg, {
  Polyline as SvgPolyline,
} from 'react-native-svg';
import {
  EXPLORATION_COLLECTION_ICON_BY_PLACE,
  EXPLORATION_DISTRICT_ROADMAP,
  EXPLORATION_DISTRICTS,
  EXPLORATION_PLACE_META,
  EXPLORATION_THEME_FILTERS,
  EXPLORATION_THEME_META,
  EXPLORATION_THEME_PLACE_IDS,
} from '../../store/explorationCatalog';
import {
  clearExplorationJournalFeedShared,
  deleteExplorationJournal,
  EXPLORATION_REWARD_BY_PLACE,
  loadLocalExplorationData,
  markExplorationJournalFeedShared,
  saveExplorationJournal,
} from '../../store/explorationCloud';
import {
  addRootCrewPost,
  checkNewEarnedBadges,
  getEarnedBadges,
  getRootActionLogs,
  getRootCrewPosts,
  getRootOnboardingData,
  getSeenBadgeIds,
  loadRootCrewPosts,
  loadRootCrews,
  loadRootEarnedBadges,
  loadRootMainBadgeId,
  loadRootOnboardingData,
  recoverLegacyBadgesForCurrentUser,
  removeRootCrewPost,
  ROOT_BADGES,
  saveRootOnboardingData,
  setRootMainBadgeId,
} from '../../store/rootMemory';
import { useRootTheme } from '../../store/rootTheme';
import { validateText } from '../../utils/textGuard';
const categories = [
  { id: 'all', icon: '✨', label: '전체' },
  { id: 'exercise', icon: '🏃', label: '운동' },
  { id: 'study', icon: '📚', label: '공부' },
  { id: 'mental', icon: '🧘', label: '정신' },
  { id: 'daily', icon: '💼', label: '일' },
];

const normalizeCrewCategory = (
  value: any
) => {
  const category =
    String(
      value ?? ''
    ).trim();

  if (
    category === 'exercise' ||
    category === '운동'
  ) {
    return 'exercise';
  }

  if (
    category === 'study' ||
    category === '공부'
  ) {
    return 'study';
  }

  if (
    category === 'mental' ||
    category === '정신'
  ) {
    return 'mental';
  }

  if (
    category === 'daily' ||
    category === '일' ||
    category === '일상'
  ) {
    return 'daily';
  }

  return category;
};

function formatMonthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');

  return `${y}-${m}`;
}

function shiftMonthKey(monthKey: string, amount: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const next = new Date(year, month - 1 + amount, 1);

  return formatMonthKey(next);
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');

  return `${year}.${month}`;
}

const WEEKDAY_EN_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function getGrowthWeekdayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return WEEKDAY_EN_LABELS[date.getDay()] ?? '';
}

function formatGrowthDateLabel(dateKey: string) {
  return String(dateKey).replace(/-/g, '.');
}

function formatArchivedGoalDate(
  value?: string | null
) {
  if (!value) return '-';

  return String(value)
    .slice(0, 10)
    .replace(/-/g, '.');
}


const COLLECTION_FILTERS = [
  {
    id: 'all',
    label: '전체',
  },
  {
    id: 'building',
    label: '건물',
  },
  {
    id: 'stamp',
    label: '스탬프',
  },
  {
    id: 'badge',
    label: '뱃지',
  },
] as const;

type CollectionFilter =
  (typeof COLLECTION_FILTERS)[number]['id'];

type ExplorationThemeFilter =
  (typeof EXPLORATION_THEME_FILTERS)[number]['id'];

const EXPLORATION_JOURNAL_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'written', label: '여행기 있음' },
  { id: 'unwritten', label: '미작성' },
  { id: 'needs-reshare', label: '다시 공유 필요' },
  { id: 'source-deleted', label: '피드만 남음' },
] as const;

type ExplorationJournalFilter =
  (typeof EXPLORATION_JOURNAL_FILTERS)[number]['id'];

const EXPLORATION_SORT_OPTIONS = [
  { id: 'visited-desc', label: '최근 방문순' },
  { id: 'visited-asc', label: '오래된 방문순' },
  { id: 'journal-desc', label: '최근 여행기순' },
] as const;

type ExplorationSortOption =
  (typeof EXPLORATION_SORT_OPTIONS)[number]['id'];

const EXPLORATION_PHOTO_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'with-photos', label: '사진 있음' },
  { id: 'without-photos', label: '사진 없음' },
] as const;

type ExplorationPhotoFilter =
  (typeof EXPLORATION_PHOTO_FILTERS)[number]['id'];

type ExplorationViewMode =
  | 'list'
  | 'map';


type ExplorationMapSourceFilter =
  | 'all'
  | 'gps'
  | 'place';

type ExplorationSmartTaskId =
  | 'unwritten'
  | 'needs-reshare'
  | 'source-deleted'
  | 'photo-missing'
  | 'next-theme';


const EXPLORATION_PLAN_STORAGE_KEY =
  'root_exploration_plan_v1';

const EXPLORATION_WISHLIST_STORAGE_KEY =
  'root_exploration_wishlist_v1';

const EXPLORATION_CALENDAR_WEEKDAYS = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
] as const;

function getExplorationDateKey(
  value: unknown
) {
  const date = new Date(
    String(value ?? '')
  );

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, '0')}-` +
    `${String(date.getDate()).padStart(2, '0')}`
  );
}

function formatExplorationCalendarMonthLabel(
  monthKey: string
) {
  const [year, month] = String(monthKey).split('-');
  return `${year}년 ${Number(month)}월`;
}

function formatExplorationCalendarDateLabel(
  dateKey: string
) {
  const [year, month, day] = String(dateKey).split('-');
  return `${year}.${month}.${day}`;
}

function calculateExplorationDistanceKm(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) {
  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(
    second.latitude - first.latitude
  );
  const longitudeDelta = toRadians(
    second.longitude - first.longitude
  );
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(Math.max(0, 1 - haversine))
    )
  );
}

function formatExplorationDifference(
  current: number,
  previous: number,
  unit: string
) {
  const difference = current - previous;

  if (difference === 0) {
    return `지난달과 같음`;
  }

  return `${difference > 0 ? '+' : ''}${difference}${unit}`;
}

const EXPLORATION_JOURNAL_MOODS = [
  {
    id: 'great',
    emoji: '😊',
    label: '좋았어요',
  },
  {
    id: 'calm',
    emoji: '😌',
    label: '편안했어요',
  },
  {
    id: 'special',
    emoji: '🤩',
    label: '특별했어요',
  },
  {
    id: 'moved',
    emoji: '🥹',
    label: '감동했어요',
  },
  {
    id: 'tired',
    emoji: '😅',
    label: '힘들었어요',
  },
] as const;

type ExplorationJournalMoodId =
  (typeof EXPLORATION_JOURNAL_MOODS)[number]['id'];

const MAX_EXPLORATION_JOURNAL_PHOTOS =
  5;

function normalizeExplorationJournalPhotoUrls(
  value: unknown
): string[] {
  const values =
    Array.isArray(
      value
    )
      ? value
      : [];

  return Array.from(
    new Set(
      values
        .map(
          (
            item: any
          ) =>
            String(
              item?.url ??
              item?.downloadUrl ??
              item ??
              ''
            ).trim()
        )
        .filter(
          (
            item
          ) =>
            item.length >
            0
        )
    )
  ).slice(
    0,
    MAX_EXPLORATION_JOURNAL_PHOTOS
  );
}

function hasExplorationJournalContent(
  record: any
) {
  const memo =
    String(
      record?.journalMemo ??
      ''
    ).trim();

  const mood =
    String(
      record?.journalMood ??
      ''
    ).trim();

  const photoUrls =
    normalizeExplorationJournalPhotoUrls(
      record?.journalPhotoUrls
    );

  return (
    memo.length > 0 ||
    mood.length > 0 ||
    photoUrls.length > 0
  );
}

function getExplorationJournalMood(
  value: unknown
) {
  const moodId =
    String(
      value ?? ''
    ).trim();

  return (
    EXPLORATION_JOURNAL_MOODS.find(
      (
        item
      ) =>
        item.id ===
        moodId
    ) ?? null
  );
}

type ExplorationJournalFeedStatus =
  | 'not-shared'
  | 'shared'
  | 'needs-reshare'
  | 'source-deleted';

function getSafeDateTime(
  value: unknown
) {
  const time =
    new Date(
      String(
        value ?? ''
      )
    ).getTime();

  return Number.isFinite(
    time
  )
    ? time
    : 0;
}

function getExplorationJournalFeedStatus(
  record: any,
  fallbackPost?: any
): ExplorationJournalFeedStatus {
  const journalMemo =
    String(
      record
        ?.journalMemo ??
        ''
    ).trim();

  const journalMood =
    String(
      record
        ?.journalMood ??
        ''
    ).trim();

  const journalPhotoUrls =
    normalizeExplorationJournalPhotoUrls(
      record
        ?.journalPhotoUrls
    );

  const hasJournalContent =
    journalMemo.length >
      0 ||
    journalMood.length >
      0 ||
    journalPhotoUrls.length >
      0;

  const journalUpdatedAt =
    String(
      record
        ?.journalUpdatedAt ??
        ''
    ).trim();

  const sharedJournalUpdatedAt =
    String(
      record
        ?.journalFeedSharedJournalUpdatedAt ??
        ''
    ).trim();

  const hasFeedConnection =
    Boolean(
      String(
        record
          ?.journalFeedPostId ??
          ''
      ).trim()
    ) ||
    Boolean(
      String(
        record
          ?.journalFeedSharedAt ??
          ''
      ).trim()
    ) ||
    Boolean(
      sharedJournalUpdatedAt
    ) ||
    Boolean(
      fallbackPost
    );

  if (
    !hasJournalContent &&
    hasFeedConnection
  ) {
    return 'source-deleted';
  }

  if (sharedJournalUpdatedAt) {
    return (
      getSafeDateTime(
        sharedJournalUpdatedAt
      ) >=
      getSafeDateTime(
        journalUpdatedAt
      )
    )
      ? 'shared'
      : 'needs-reshare';
  }

  /*
   * 새 필드를 적용하기 전에 이미 공유했던 게시물도
   * 첫 화면부터 최대한 정확히 표시하기 위한 이전 데이터 호환 처리입니다.
   */
  if (fallbackPost) {
    const postUpdatedAt =
      getSafeDateTime(
        fallbackPost
          ?.updatedAt ??
        fallbackPost
          ?.createdAt
      );

    const journalTime =
      getSafeDateTime(
        journalUpdatedAt
      );

    if (postUpdatedAt > 0) {
      return postUpdatedAt >=
        journalTime
        ? 'shared'
        : 'needs-reshare';
    }
  }

  return 'not-shared';
}

function getExplorationJournalFeedStatusLabel(
  status:
    ExplorationJournalFeedStatus
) {
  if (
    status ===
    'shared'
  ) {
    return '피드에 최신 여행기 공유됨';
  }

  if (
    status ===
    'needs-reshare'
  ) {
    return '수정됨 · 다시 공유 필요';
  }

  if (
    status ===
    'source-deleted'
  ) {
    return '원본 여행기 삭제됨 · 피드 게시물 유지';
  }

  return '피드에 공유하지 않음';
}

function formatExplorationVerifiedAt(
  value: unknown
) {
  const date =
    new Date(
      String(
        value ?? ''
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-';
  }

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

  const hour =
    String(
      date.getHours()
    ).padStart(
      2,
      '0'
    );

  const minute =
    String(
      date.getMinutes()
    ).padStart(
      2,
      '0'
    );

  return (
    `${year}.${month}.${day}` +
    ` ${hour}:${minute}`
  );
}


function getRouteSnapshotRegion(
  coordinates: any[]
) {
  const safeCoordinates =
    Array.isArray(coordinates)
      ? coordinates.filter(
          (point: any) =>
            Number.isFinite(
              Number(point?.latitude)
            ) &&
            Number.isFinite(
              Number(point?.longitude)
            )
        )
      : [];

  if (
    safeCoordinates.length === 0
  ) {
    return {
      latitude: 37.5665,
      longitude: 126.978,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  const latitudes =
    safeCoordinates.map(
      (point: any) =>
        Number(point.latitude)
    );

  const longitudes =
    safeCoordinates.map(
      (point: any) =>
        Number(point.longitude)
    );

  const minLatitude =
    Math.min(...latitudes);

  const maxLatitude =
    Math.max(...latitudes);

  const minLongitude =
    Math.min(...longitudes);

  const maxLongitude =
    Math.max(...longitudes);

  return {
    latitude:
      (minLatitude +
        maxLatitude) /
      2,

    longitude:
      (minLongitude +
        maxLongitude) /
      2,

    latitudeDelta:
      Math.max(
        (maxLatitude -
          minLatitude) *
          1.45,
        0.003
      ),

    longitudeDelta:
      Math.max(
        (maxLongitude -
          minLongitude) *
          1.45,
        0.003
      ),
  };
}

type DecorateStickerType =
  | 'date'
  | 'title'
  | 'time'
  | 'distance'
  | 'pace'
  | 'calorie'
  | 'route'
  | 'root'
  | 'customText';

type DecorateSticker = {
  id: string;
  type: DecorateStickerType;
  text: string;
  x: number;
  y: number;
  scale?: number;
  size?: 'small' | 'medium' | 'large';
  route?: boolean;
  points?: string;
};

type GrowthGoalPickerState = {
  date: string;
  categoryId: string;
  categoryLabel: string;
  logs: any[];
} | null;

function makeRouteStickerPoints(
  coords: any[],
  width = 190,
  height = 190,
  padding = 18
) {
  if (!coords || coords.length < 2) return '';

  const latitudes = coords.map((p) => p.latitude);
  const longitudes = coords.map((p) => p.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  const latRange = Math.max(maxLat - minLat, 0.000001);
  const lonRange = Math.max(maxLon - minLon, 0.000001);

  return coords
    .map((point) => {
      const x =
        padding +
        ((point.longitude - minLon) / lonRange) *
          (width - padding * 2);

      const y =
        padding +
        ((maxLat - point.latitude) / latRange) *
          (height - padding * 2);

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function DraggableDecorateSticker({
  sticker,
  onMove,
  onRemove,
  isCaptureMode = false,
}: {
  sticker: DecorateSticker;
  onMove: (
  id: string,
  x: number,
  y: number,
  scale?: number
) => void;
  onRemove: (id: string) => void;
  isCaptureMode?: boolean;
}) {
  const x = useSharedValue(sticker.x);
  const y = useSharedValue(sticker.y);
  const savedX = useSharedValue(sticker.x);
  const savedY = useSharedValue(sticker.y);

  const initialScale = sticker.scale ?? 1;

const stickerScale = useSharedValue(initialScale);
const savedStickerScale = useSharedValue(initialScale);

  const pan = Gesture.Pan()
    .minDistance(1)
    .onUpdate((event) => {
      x.value = savedX.value + event.translationX;
      y.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      const finalX = x.value;
      const finalY = y.value;

      savedX.value = finalX;
      savedY.value = finalY;

      runOnJS(onMove)(
  sticker.id,
  finalX,
  finalY,
  stickerScale.value
);
    });

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      stickerScale.value = Math.max(
        0.5,
        Math.min(savedStickerScale.value * event.scale, 2.2)
      );
    })
    .onEnd(() => {
  const finalScale = stickerScale.value;

  savedStickerScale.value = finalScale;

  runOnJS(onMove)(
    sticker.id,
    x.value,
    y.value,
    finalScale
  );
});

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedStickerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: stickerScale.value },
    ],
  }));

  const fontSize =
    sticker.size === 'large'
      ? 52
      : sticker.size === 'medium'
      ? 28
      : 17;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.decorateSingleSticker,
          sticker.route && styles.decorateRouteSticker,
          isCaptureMode && styles.decorateSingleStickerCapture,
          animatedStickerStyle,
        ]}
      >
        {sticker.route ? (
          <Svg width={190} height={190} viewBox="0 0 190 190">
            <SvgPolyline
              points={sticker.points ?? ''}
              fill="none"
              stroke="#ff5a1f"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <Text
            style={[
              styles.decorateSingleStickerText,
              { fontSize },
            ]}
          >
            {sticker.text}
          </Text>
        )}

        {!isCaptureMode && (
          <Pressable
            style={styles.decorateStickerDelete}
            onPress={() => onRemove(sticker.id)}
          >
            <Text style={styles.decorateStickerDeleteText}>×</Text>
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function RecordScreen() {
  const params = useLocalSearchParams<{
    actionGoalId?: string | string[];
    actionGoalTitle?: string | string[];
    actionGoalCategory?: string | string[];
  }>();

  const getRouteParam = (
    value: string | string[] | undefined
  ) => {
    return Array.isArray(value)
      ? value[0]
      : value;
  };

  const selectedActionGoalId =
    getRouteParam(params.actionGoalId)?.trim() ?? '';

  const selectedActionGoalTitle =
    getRouteParam(params.actionGoalTitle)?.trim() ?? '';

  const selectedActionGoalCategory =
    getRouteParam(params.actionGoalCategory)?.trim() ?? '';

 const [activeTab, setActiveTab] =
  useState<
    | 'timeline'
    | 'exploration'
    | 'collection'
    | 'album'
    | 'stats'
  >('timeline');

  const { themeMode, theme } = useRootTheme();
const isCityBlack = themeMode === 'cityBlack';
const [selectedCategory, setSelectedCategory] = useState('all');

const [
  explorationData,
  setExplorationData,
] = useState<any>(null);

const [
  explorationLoading,
  setExplorationLoading,
] = useState(true);

const [
  collectionFilter,
  setCollectionFilter,
] = useState<CollectionFilter>(
  'all'
);

const [explorationSearchText, setExplorationSearchText] =
  useState('');
const [explorationDistrictFilter, setExplorationDistrictFilter] =
  useState('all');
const [explorationThemeFilter, setExplorationThemeFilter] =
  useState<ExplorationThemeFilter>('all');
const [explorationJournalFilter, setExplorationJournalFilter] =
  useState<ExplorationJournalFilter>('all');
const [explorationSortOption, setExplorationSortOption] =
  useState<ExplorationSortOption>('visited-desc');

const [explorationMonthFilter, setExplorationMonthFilter] =
  useState('all');

const [explorationCalendarMonth, setExplorationCalendarMonth] =
  useState(formatMonthKey(new Date()));

const [
  explorationCalendarDateFilter,
  setExplorationCalendarDateFilter,
] = useState<string | null>(null);

const [explorationCalendarExpanded, setExplorationCalendarExpanded] =
  useState(true);

const explorationCalendarInitializedRef =
  useRef(false);

const [explorationPhotoFilter, setExplorationPhotoFilter] =
  useState<ExplorationPhotoFilter>('all');

const [explorationFiltersExpanded, setExplorationFiltersExpanded] =
  useState(true);

const [explorationViewMode, setExplorationViewMode] =
  useState<ExplorationViewMode>('list');

const [selectedExplorationMapPlaceId, setSelectedExplorationMapPlaceId] =
  useState<string | null>(null);

const explorationMapViewRef =
  useRef<MapView | null>(null);


const [explorationMapRouteVisible, setExplorationMapRouteVisible] =
  useState(true);

const [explorationMapSourceFilter, setExplorationMapSourceFilter] =
  useState<ExplorationMapSourceFilter>('all');

const [explorationActionCenterExpanded, setExplorationActionCenterExpanded] =
  useState(true);

const [explorationMonthlyReportExpanded, setExplorationMonthlyReportExpanded] =
  useState(true);

const [explorationInsightsExpanded, setExplorationInsightsExpanded] =
  useState(true);

const [explorationMilestonesExpanded, setExplorationMilestonesExpanded] =
  useState(true);

const [explorationMonthlyReportSharing, setExplorationMonthlyReportSharing] =
  useState(false);

const explorationMonthlyReportCaptureRef =
  useRef<View | null>(null);


const [explorationDistrictRoadmapExpanded, setExplorationDistrictRoadmapExpanded] =
  useState(true);

const [explorationWeeklyChallengeExpanded, setExplorationWeeklyChallengeExpanded] =
  useState(true);

const [explorationPlannerExpanded, setExplorationPlannerExpanded] =
  useState(true);

const [explorationHighlightsExpanded, setExplorationHighlightsExpanded] =
  useState(true);

const [explorationPlanPlaceIds, setExplorationPlanPlaceIds] =
  useState<string[]>([]);

const [explorationWishlistPlaceIds, setExplorationWishlistPlaceIds] =
  useState<string[]>([]);

const explorationPlannerStorageReadyRef =
  useRef(false);


useEffect(() => {
  let active = true;

  const loadExplorationPlannerStorage = async () => {
    try {
      const values = await AsyncStorage.multiGet([
        EXPLORATION_PLAN_STORAGE_KEY,
        EXPLORATION_WISHLIST_STORAGE_KEY,
      ]);

      if (!active) return;

      const valueMap = new Map(values);

      const parseIds = (value: string | null | undefined) => {
        try {
          const parsed = JSON.parse(String(value ?? '[]'));
          return Array.isArray(parsed)
            ? Array.from(
                new Set<string>(
                  parsed
                    .map((item: unknown) => String(item ?? '').trim())
                    .filter(Boolean)
                )
              )
            : [];
        } catch {
          return [];
        }
      };

      setExplorationPlanPlaceIds(
        parseIds(valueMap.get(EXPLORATION_PLAN_STORAGE_KEY)).slice(0, 5)
      );
      setExplorationWishlistPlaceIds(
        parseIds(valueMap.get(EXPLORATION_WISHLIST_STORAGE_KEY))
      );
    } catch (error) {
      console.log('EXPLORATION PLANNER STORAGE LOAD ERROR', error);
    } finally {
      if (active) {
        explorationPlannerStorageReadyRef.current = true;
      }
    }
  };

  void loadExplorationPlannerStorage();

  return () => {
    active = false;
  };
}, []);

useEffect(() => {
  if (!explorationPlannerStorageReadyRef.current) return;

  void AsyncStorage.multiSet([
    [EXPLORATION_PLAN_STORAGE_KEY, JSON.stringify(explorationPlanPlaceIds)],
    [EXPLORATION_WISHLIST_STORAGE_KEY, JSON.stringify(explorationWishlistPlaceIds)],
  ]).catch((error) => {
    console.log('EXPLORATION PLANNER STORAGE SAVE ERROR', error);
  });
}, [explorationPlanPlaceIds, explorationWishlistPlaceIds]);

const [
  explorationJournalRecord,
  setExplorationJournalRecord,
] = useState<any>(null);

const [
  explorationJournalMemo,
  setExplorationJournalMemo,
] = useState('');

const [
  explorationJournalMood,
  setExplorationJournalMood,
] = useState<
  ExplorationJournalMoodId |
  null
>(null);

const [
  explorationJournalSaving,
  setExplorationJournalSaving,
] = useState(false);

const [
  explorationJournalPhotoUrls,
  setExplorationJournalPhotoUrls,
] = useState<string[]>([]);

const [
  explorationJournalPhotoUploading,
  setExplorationJournalPhotoUploading,
] = useState(false);

const [
  explorationJournalPhotoUploadProgress,
  setExplorationJournalPhotoUploadProgress,
] = useState({
  current: 0,
  total: 0,
});

const [
  explorationJournalPhotoRemovingUrl,
  setExplorationJournalPhotoRemovingUrl,
] = useState<string | null>(
  null
);

const [
  explorationJournalShareRecord,
  setExplorationJournalShareRecord,
] = useState<any>(null);

const [
  explorationJournalDetailRecord,
  setExplorationJournalDetailRecord,
] = useState<any>(null);

const [
  explorationJournalDetailPhotoIndex,
  setExplorationJournalDetailPhotoIndex,
] = useState(0);

const [
  explorationJournalFeedSharing,
  setExplorationJournalFeedSharing,
] = useState(false);

const [
  explorationJournalExternalSharing,
  setExplorationJournalExternalSharing,
] = useState(false);

const [
  explorationJournalUnshareRecord,
  setExplorationJournalUnshareRecord,
] = useState<any>(null);

const [
  explorationJournalFeedUnsharing,
  setExplorationJournalFeedUnsharing,
] = useState(false);

const [
  explorationJournalDeleteRecord,
  setExplorationJournalDeleteRecord,
] = useState<any>(null);

const [
  explorationJournalDeleting,
  setExplorationJournalDeleting,
] = useState(false);

const explorationJournalShareCaptureRef =
  useRef<View | null>(null);

const explorationJournalShareBusy =
  explorationJournalFeedSharing ||
  explorationJournalExternalSharing;

const explorationJournalBusy =
  explorationJournalSaving ||
  explorationJournalPhotoUploading ||
  explorationJournalFeedUnsharing ||
  explorationJournalDeleting ||
  !!explorationJournalPhotoRemovingUrl;

const explorationJournalCanDelete =
  hasExplorationJournalContent(
    explorationJournalRecord
  );

const [selectedGrowthMonth, setSelectedGrowthMonth] =
  useState(formatMonthKey(new Date()));

const [selectedGrowthDate, setSelectedGrowthDate] =
  useState<string | null>(null);

const growthCardRefs = useRef<Record<string, View | null>>({});

const [savingGrowthDate, setSavingGrowthDate] =
  useState<string | null>(null);  

  const [
  externalSharingGrowthDate,
  setExternalSharingGrowthDate,
] = useState<string | null>(
  null
);

/*
 * 날짜와 카테고리별로 오늘의 성장 카드에
 * 표시할 행동목표 기록 ID를 저장합니다.
 *
 * 예:
 * 2026-07-14_exercise: 기록 ID
 */
const [
  selectedGrowthLogIds,
  setSelectedGrowthLogIds,
] = useState<
  Record<string, string>
>(() => {
  const savedSelections =
    getRootOnboardingData()
      ?.growthCardSelections;

  if (
    savedSelections &&
    typeof savedSelections ===
      'object' &&
    !Array.isArray(
      savedSelections
    )
  ) {
    return {
      ...savedSelections,
    };
  }

  return {};
});

const [
  growthGoalPicker,
  setGrowthGoalPicker,
] =
  useState<GrowthGoalPickerState>(
    null
  );

  const [crews, setCrews] = useState<any[]>([]);
  const [data, setData] = useState<any>(getRootOnboardingData());
  const [logs, setLogs] = useState<any[]>(getRootActionLogs());
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
const [selectedImageLog, setSelectedImageLog] = useState<any>(null);
const [selectedImageType, setSelectedImageType] =
  useState<'photo' | 'route' | null>(null);
  const decorateCaptureRef = useRef<View | null>(null);
const [decorateLog, setDecorateLog] = useState<any>(null);
const [decorateImageUri, setDecorateImageUri] = useState<string | null>(null);
const [decorateStickers, setDecorateStickers] = useState<DecorateSticker[]>([]);
const [showCustomStickerModal, setShowCustomStickerModal] = useState(false);
const [customStickerText, setCustomStickerText] = useState('');
const [isDecorateSaving, setIsDecorateSaving] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
const [editMemo, setEditMemo] = useState('');
  const [openGpsLogId, setOpenGpsLogId] = useState<string | null>(null);
const [shareLog, setShareLog] = useState<any>(null);
const routeSnapshotMapRef =
  useRef<MapView | null>(
    null
  );

const routeSnapshotResolveRef =
  useRef<
    ((
      uri: string | null
    ) => void) | null
  >(null);

const routeSnapshotTimeoutRef =
  useRef<
    ReturnType<
      typeof setTimeout
    > | null
  >(null);

const [
  routeSnapshotCoordinates,
  setRouteSnapshotCoordinates,
] = useState<any[]>([]);

const [
  routeSnapshotRequestKey,
  setRouteSnapshotRequestKey,
] = useState(0);

const [
  routeSnapshotMapLoaded,
  setRouteSnapshotMapLoaded,
] = useState(false);
const [shareMemo, setShareMemo] = useState('');
const [shareTags, setShareTags] = useState('');
const [
  isSharingCrewPost,
  setIsSharingCrewPost,
] = useState(false);
const [shareTarget, setShareTarget] = useState<'public' | 'crew'>('public');
const [noticeModal, setNoticeModal] =  useState<{    title: string;    message: string;  } | null>(null);
const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
const [showBadgeList, setShowBadgeList] = useState(false);
const [statDetailType, setStatDetailType] =  useState<'time' | 'count' | 'distance' | null>(null);
const [showPastGoals, setShowPastGoals] = useState(false);
const [newBadge, setNewBadge] = useState<any>(null);
const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned'>('all');
const [mainBadgeId, setMainBadgeId] =
  useState<string | null>(null);
const [
  isUnsharingCrewPost,
  setIsUnsharingCrewPost,
] = useState(false);
const mainBadge =
  ROOT_BADGES.find((badge) => badge.id === mainBadgeId) ??
  earnedBadges[0];

const visibleBadges =
  badgeFilter === 'earned'
    ? ROOT_BADGES.filter((badge) =>
        earnedBadges.some((item) => item?.id === badge.id)
      )
    : ROOT_BADGES;


const openExplorationJournalDetail =
  (
    record: any
  ) => {
    setExplorationJournalDetailRecord(
      record
    );

    setExplorationJournalDetailPhotoIndex(
      0
    );
  };

const closeExplorationJournalDetail =
  () => {
    setExplorationJournalDetailRecord(
      null
    );

    setExplorationJournalDetailPhotoIndex(
      0
    );
  };

const openExplorationJournal =
  (
    record: any
  ) => {
    const savedMood =
      String(
        record
          ?.journalMood ??
          ''
      ).trim();

    const normalizedMood =
      EXPLORATION_JOURNAL_MOODS.some(
        (
          item
        ) =>
          item.id ===
          savedMood
      )
        ? (
            savedMood as
              ExplorationJournalMoodId
          )
        : null;

    setExplorationJournalRecord(
      record
    );

    setExplorationJournalMemo(
      String(
        record
          ?.journalMemo ??
          ''
      )
    );

    setExplorationJournalMood(
      normalizedMood
    );

    setExplorationJournalPhotoUrls(
      normalizeExplorationJournalPhotoUrls(
        record
          ?.journalPhotoUrls
      )
    );

    setExplorationJournalPhotoUploadProgress({
      current: 0,
      total: 0,
    });
  };

const closeExplorationJournal =
  () => {
    if (
      explorationJournalBusy
    ) {
      return;
    }

    setExplorationJournalRecord(
      null
    );

    setExplorationJournalMemo(
      ''
    );

    setExplorationJournalMood(
      null
    );

    setExplorationJournalPhotoUrls(
      []
    );

    setExplorationJournalPhotoUploadProgress({
      current: 0,
      total: 0,
    });
  };

const updateExplorationJournalFromSavedData =
  (
    savedData: any,
    placeId: string
  ) => {
    setExplorationData(
      savedData
    );

    const nextRecord =
      Array.isArray(
        savedData
          ?.visitRecords
      )
        ? savedData
            .visitRecords
            .find(
              (
                record: any
              ) =>
                String(
                  record
                    ?.placeId ??
                    ''
                ) ===
                placeId
            )
        : null;

    if (
      nextRecord
    ) {
      setExplorationJournalRecord(
        nextRecord
      );
    }
  };

const persistExplorationJournalPhotos =
  async (
    placeId: string,
    nextPhotoUrls: string[]
  ) => {
    const savedMemo =
      String(
        explorationJournalRecord
          ?.journalMemo ??
          ''
      );

    const savedMood =
      String(
        explorationJournalRecord
          ?.journalMood ??
          ''
      ).trim() ||
      null;

    const savedData =
      await saveExplorationJournal({
        placeId,

        memo:
          savedMemo,

        mood:
          savedMood,

        photoUrls:
          nextPhotoUrls,
      });

    updateExplorationJournalFromSavedData(
      savedData,
      placeId
    );

    setExplorationJournalPhotoUrls(
      normalizeExplorationJournalPhotoUrls(
        nextPhotoUrls
      )
    );

    return savedData;
  };

const handlePickExplorationJournalPhotos =
  async () => {
    const placeId =
      String(
        explorationJournalRecord
          ?.placeId ??
          ''
      ).trim();

    if (
      !placeId ||
      explorationJournalBusy
    ) {
      return;
    }

    const remainingCount =
      MAX_EXPLORATION_JOURNAL_PHOTOS -
      explorationJournalPhotoUrls
        .length;

    if (
      remainingCount <=
      0
    ) {
      setNoticeModal({
        title:
          '사진은 최대 5장',

        message:
          '여행기 사진은 최대 5장까지 저장할 수 있어요.',
      });

      return;
    }

    const currentUserData =
      getRootOnboardingData() ??
      data;

    const uid =
      String(
        currentUserData
          ?.uid ??
          ''
      ).trim();

    if (
      !uid ||
      currentUserData
        ?.loginType ===
        'guest'
    ) {
      setNoticeModal({
        title:
          'Google 로그인 필요',

        message:
          '새 기기에서도 사진을 복원하려면 Google 로그인 계정이 필요해요.',
      });

      return;
    }

    try {
      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (
        !permission.granted
      ) {
        setNoticeModal({
          title:
            '사진 권한 필요',

          message:
            '여행기 사진을 선택하려면 사진 접근 권한이 필요해요.',
        });

        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes: [
              'images',
            ],

            allowsMultipleSelection:
              true,

            selectionLimit:
              remainingCount,

            quality:
              0.85,
          });

      if (
        result.canceled
      ) {
        return;
      }

      const selectedAssets =
        (
          result.assets ??
          []
        ).slice(
          0,
          remainingCount
        );

      if (
        selectedAssets.length ===
        0
      ) {
        return;
      }

      setExplorationJournalPhotoUploading(
        true
      );

      setExplorationJournalPhotoUploadProgress({
        current: 0,
        total:
          selectedAssets.length,
      });

      let nextPhotoUrls =
        normalizeExplorationJournalPhotoUrls(
          explorationJournalPhotoUrls
        );

      let successCount =
        0;

      let failedCount =
        0;

      for (
        let index = 0;
        index <
        selectedAssets.length;
        index += 1
      ) {
        const asset =
          selectedAssets[
            index
          ];

        setExplorationJournalPhotoUploadProgress({
          current:
            index +
            1,
          total:
            selectedAssets.length,
        });

        let uploadedUrl:
          | string
          | null =
          null;

        try {
          uploadedUrl =
            await uploadFeedImageToStorage({
              uri:
                asset.uri,

              uid,

              postId:
                `exploration_journal_${placeId}_${Date.now()}_${index}`,

              folder:
                'shared-posts',
            });

          if (
            !uploadedUrl
          ) {
            throw new Error(
              'EXPLORATION_JOURNAL_PHOTO_URL_EMPTY'
            );
          }

          nextPhotoUrls =
            normalizeExplorationJournalPhotoUrls([
              ...nextPhotoUrls,
              uploadedUrl,
            ]);

          await persistExplorationJournalPhotos(
            placeId,
            nextPhotoUrls
          );

          successCount +=
            1;

          console.log(
            'EXPLORATION JOURNAL PHOTO SAVE DONE',
            {
              placeId,

              photoCount:
                nextPhotoUrls.length,

              current:
                index +
                1,

              total:
                selectedAssets.length,
            }
          );
        } catch (
          error
        ) {
          failedCount +=
            1;

          console.log(
            'EXPLORATION JOURNAL PHOTO SAVE ERROR',
            {
              placeId,
              index,
              error,
            }
          );

          if (
            uploadedUrl
          ) {
            void deleteFeedImageFromStorage(
              uploadedUrl
            );
          }
        }
      }

      if (
        failedCount >
        0
      ) {
        setNoticeModal({
          title:
            '일부 사진 저장 실패',

          message:
            `${successCount}장은 저장했고 ${failedCount}장은 저장하지 못했어요. 다시 추가해 주세요.`,
        });
      }
    } catch (
      error
    ) {
      console.log(
        'EXPLORATION JOURNAL PHOTO PICK ERROR',
        error
      );

      setNoticeModal({
        title:
          '사진 추가 실패',

        message:
          '여행기 사진을 추가하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setExplorationJournalPhotoUploading(
        false
      );

      setExplorationJournalPhotoUploadProgress({
        current: 0,
        total: 0,
      });
    }
  };

const openExplorationJournalDelete =
  (
    record: any =
      explorationJournalRecord
  ) => {
    if (
      explorationJournalBusy
    ) {
      return;
    }

    const placeId =
      String(
        record?.placeId ??
        ''
      ).trim();

    if (!placeId) {
      setNoticeModal({
        title:
          '여행기 삭제 오류',
        message:
          '삭제할 여행기 장소 정보를 찾지 못했어요.',
      });

      return;
    }

    if (
      !hasExplorationJournalContent(
        record
      )
    ) {
      setNoticeModal({
        title:
          '삭제할 여행기가 없어요',
        message:
          '먼저 여행기를 작성해 주세요.',
      });

      return;
    }

    const currentUserData =
      getRootOnboardingData() ??
      data ??
      {};

    const uid =
      String(
        currentUserData?.uid ??
        ''
      ).trim();

    const storedPostId =
      String(
        record?.journalFeedPostId ??
        ''
      ).trim();

    const fallbackPostId =
      uid &&
      placeId
        ? `${uid}_exploration_journal_${placeId}`
        : '';

    const resolvedPostId =
      storedPostId ||
      fallbackPostId;

    const currentPosts =
      getRootCrewPosts();

    const hasFallbackPost =
      Boolean(
        resolvedPostId &&
        Array.isArray(
          currentPosts
        ) &&
        currentPosts.some(
          (post: any) =>
            String(
              post?.id ??
              ''
            ) ===
            resolvedPostId
        )
      );

    const hasFeedConnection =
      Boolean(
        storedPostId
      ) ||
      Boolean(
        record?.journalFeedSharedAt
      ) ||
      Boolean(
        record
          ?.journalFeedSharedJournalUpdatedAt
      ) ||
      hasFallbackPost;

    const currentRecordPlaceId =
      String(
        explorationJournalRecord
          ?.placeId ??
        ''
      ).trim();

    const targetPhotoUrls =
      currentRecordPlaceId ===
      placeId
        ? normalizeExplorationJournalPhotoUrls(
            explorationJournalPhotoUrls
          )
        : normalizeExplorationJournalPhotoUrls(
            record?.journalPhotoUrls
          );

    setExplorationJournalDeleteRecord({
      record,
      placeId,
      uid,
      postId:
        resolvedPostId,
      hasFeedConnection,
      journalPhotoUrls:
        targetPhotoUrls,
    });
  };

const handleRemoveExplorationJournalPhoto =
  async (
    photoUrl: string
  ) => {
    const placeId =
      String(
        explorationJournalRecord
          ?.placeId ??
          ''
      ).trim();

    if (
      !placeId ||
      explorationJournalBusy
    ) {
      return;
    }

    const nextPhotoUrls =
      explorationJournalPhotoUrls
        .filter(
          (
            item
          ) =>
            item !==
            photoUrl
        );

    const savedMemo =
      String(
        explorationJournalRecord
          ?.journalMemo ??
          ''
      ).trim();

    const savedMood =
      String(
        explorationJournalRecord
          ?.journalMood ??
          ''
      ).trim();

    /*
     * 사진만 있는 여행기에서 마지막 사진을 지우면
     * 즉시 삭제하지 않고 동일한 삭제 선택창을 먼저 띄웁니다.
     */
    if (
      nextPhotoUrls.length ===
        0 &&
      !savedMemo &&
      !savedMood
    ) {
      openExplorationJournalDelete(
        explorationJournalRecord
      );

      return;
    }

    try {
      setExplorationJournalPhotoRemovingUrl(
        photoUrl
      );

      await persistExplorationJournalPhotos(
        placeId,
        nextPhotoUrls
      );

      await deleteFeedImageFromStorage(
        photoUrl
      );

      console.log(
        'EXPLORATION JOURNAL PHOTO REMOVE DONE',
        {
          placeId,

          photoCount:
            nextPhotoUrls.length,
        }
      );
    } catch (
      error
    ) {
      console.log(
        'EXPLORATION JOURNAL PHOTO REMOVE ERROR',
        error
      );

      setNoticeModal({
        title:
          '사진 삭제 실패',

        message:
          '여행기 사진을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setExplorationJournalPhotoRemovingUrl(
        null
      );
    }
  };

const handleSaveExplorationJournal =
  async () => {
    const placeId =
      String(
        explorationJournalRecord
          ?.placeId ??
          ''
      ).trim();

    if (!placeId) {
      setNoticeModal({
        title:
          '여행기 저장 오류',

        message:
          '방문 장소 정보를 찾지 못했어요.',
      });

      return;
    }

    const memo =
      explorationJournalMemo
        .trim();

    if (
      memo.length > 0
    ) {
      const memoError =
        validateText(
          memo,
          {
            label:
              '탐험 여행기',

            max:
              500,
          }
        );

      if (
        memoError
      ) {
        setNoticeModal({
          title:
            '여행기 확인',

          message:
            memoError,
        });

        return;
      }
    }

    const hadJournal =
      String(
        explorationJournalRecord
          ?.journalMemo ??
          ''
      ).trim().length >
        0 ||
      !!String(
        explorationJournalRecord
          ?.journalMood ??
          ''
      ).trim() ||
      explorationJournalPhotoUrls
        .length >
        0;

    const draftIsEmpty =
      !memo &&
      !explorationJournalMood &&
      explorationJournalPhotoUrls
        .length ===
        0;

    if (
      draftIsEmpty &&
      !hadJournal
    ) {
      setNoticeModal({
        title:
          '여행기를 남겨주세요',

        message:
          '기분을 선택하거나 여행기 내용을 입력해 주세요.',
      });

      return;
    }

    if (
      draftIsEmpty &&
      hadJournal
    ) {
      openExplorationJournalDelete(
        explorationJournalRecord
      );

      return;
    }

    try {
      setExplorationJournalSaving(
        true
      );

      const savedData =
        await saveExplorationJournal({
          placeId,

          memo,

          mood:
            explorationJournalMood,

          photoUrls:
            explorationJournalPhotoUrls,
        });

      setExplorationData(
        savedData
      );

      setExplorationJournalRecord(
        null
      );

      setExplorationJournalMemo(
        ''
      );

      setExplorationJournalMood(
        null
      );

      setExplorationJournalPhotoUrls(
        []
      );

      setNoticeModal({
        title:
          memo ||
          explorationJournalMood ||
          explorationJournalPhotoUrls
            .length >
            0
            ? '여행기 저장 완료'
            : '여행기 삭제 완료',

        message:
          memo ||
          explorationJournalMood ||
          explorationJournalPhotoUrls
            .length >
            0
            ? '탐험 기록에 여행기를 저장했어요.'
            : '저장된 여행기 내용을 비웠어요.',
      });

      console.log(
        'RECORD EXPLORATION JOURNAL SAVE DONE',
        {
          placeId,

          hasMemo:
            memo.length >
            0,

          mood:
            explorationJournalMood,

          photoCount:
            explorationJournalPhotoUrls
              .length,
        }
      );
    } catch (
      error
    ) {
      console.log(
        'RECORD EXPLORATION JOURNAL SAVE ERROR',
        error
      );

      setNoticeModal({
        title:
          '여행기 저장 실패',

        message:
          '여행기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setExplorationJournalSaving(
        false
      );
    }
  };


const closeExplorationJournalDelete =
  () => {
    if (
      explorationJournalDeleting
    ) {
      return;
    }

    setExplorationJournalDeleteRecord(
      null
    );
  };

/*
 * 여행기 내용을 완전히 삭제합니다.
 *
 * deleteFeedToo가 false이면 피드 게시물과 공유 카드는 유지합니다.
 * deleteFeedToo가 true이면 피드 게시물, 공유 카드, 공유 상태까지 함께 정리합니다.
 */
const handleDeleteExplorationJournal =
  async (
    deleteFeedToo: boolean
  ) => {
    const target =
      explorationJournalDeleteRecord;

    if (
      !target ||
      explorationJournalDeleting
    ) {
      return;
    }

    const record =
      target.record;

    const placeId =
      String(
        target.placeId ??
        record?.placeId ??
        ''
      ).trim();

    const currentUserData =
      getRootOnboardingData() ??
      data ??
      {};

    const uid =
      String(
        target.uid ??
        currentUserData?.uid ??
        ''
      ).trim();

    const postId =
      String(
        target.postId ??
        record?.journalFeedPostId ??
        (
          uid &&
          placeId
            ? `${uid}_exploration_journal_${placeId}`
            : ''
        )
      ).trim();

    if (!placeId) {
      setNoticeModal({
        title:
          '여행기 삭제 실패',
        message:
          '삭제할 여행기 장소 정보를 찾지 못했어요.',
      });

      return;
    }

    setExplorationJournalDeleting(
      true
    );

    let feedPostRemoved =
      false;

    let feedCardCleanupFailed =
      false;

    let journalPhotoCleanupFailedCount =
      0;

    try {
      let existingPost: any =
        null;

      let cardUrl =
        '';

      if (
        deleteFeedToo &&
        postId
      ) {
        let latestPosts: any[] =
          [];

        try {
          const loadedPosts =
            await loadRootCrewPosts();

          latestPosts =
            Array.isArray(
              loadedPosts
            )
              ? loadedPosts
              : [];
        } catch (loadError) {
          console.log(
            'EXPLORATION JOURNAL DELETE POST LOAD FALLBACK',
            loadError
          );

          const memoryPosts =
            getRootCrewPosts();

          latestPosts =
            Array.isArray(
              memoryPosts
            )
              ? memoryPosts
              : [];
        }

        existingPost =
          latestPosts.find(
            (post: any) =>
              String(
                post?.id ??
                ''
              ) ===
              postId
          ) ??
          null;

        cardUrl =
          String(
            existingPost
              ?.photoUri ??
            existingPost
              ?.photo_url ??
            existingPost
              ?.sharedPhotoUrl ??
            ''
          ).trim();

        console.log(
          'EXPLORATION JOURNAL FULL DELETE FEED START',
          {
            placeId,
            postId,
            hasPost:
              !!existingPost,
            hasCardUrl:
              !!cardUrl,
          }
        );

        if (existingPost) {
          await removeRootCrewPost(
            postId
          );

          feedPostRemoved =
            true;

          console.log(
            'EXPLORATION JOURNAL FULL DELETE FEED POST DONE',
            {
              placeId,
              postId,
            }
          );
        } else {
          console.log(
            'EXPLORATION JOURNAL FULL DELETE FEED POST ALREADY MISSING',
            {
              placeId,
              postId,
            }
          );
        }

        if (
          cardUrl &&
          uid
        ) {
          const cardObjectPath =
            getStorageObjectPathFromUrl(
              cardUrl
            );

          const expectedCardPrefix =
            `shared-posts/${uid}/` +
            `${uid}_exploration_journal_${sanitizeStorageName(
              placeId
            )}_card_`;

          if (
            cardObjectPath &&
            cardObjectPath.startsWith(
              expectedCardPrefix
            )
          ) {
            try {
              await deleteFeedImageFromStorage(
                cardUrl
              );
            } catch (storageError) {
              feedCardCleanupFailed =
                true;

              console.log(
                'EXPLORATION JOURNAL FULL DELETE FEED CARD ERROR',
                storageError
              );
            }
          }
        }
      }

      const deletedData =
        await deleteExplorationJournal({
          placeId,
          clearFeedStatus:
            deleteFeedToo,
        });

      setExplorationData(
        deletedData
      );

      const journalPhotoUrls =
        normalizeExplorationJournalPhotoUrls(
          target
            .journalPhotoUrls ??
          record
            ?.journalPhotoUrls
        );

      for (
        const photoUrl of
        journalPhotoUrls
      ) {
        const objectPath =
          getStorageObjectPathFromUrl(
            photoUrl
          );

        const expectedPhotoPrefix =
          uid
            ? `shared-posts/${uid}/exploration_journal_${sanitizeStorageName(
                placeId
              )}_`
            : '';

        if (
          !objectPath ||
          !expectedPhotoPrefix ||
          !objectPath.startsWith(
            expectedPhotoPrefix
          )
        ) {
          continue;
        }

        try {
          await deleteFeedImageFromStorage(
            photoUrl
          );
        } catch (photoError) {
          journalPhotoCleanupFailedCount +=
            1;

          console.log(
            'EXPLORATION JOURNAL FULL DELETE PHOTO ERROR',
            {
              placeId,
              photoUrl,
              photoError,
            }
          );
        }
      }

      console.log(
        'EXPLORATION JOURNAL FULL DELETE COMPLETE',
        {
          placeId,
          deleteFeedToo,
          feedPostRemoved,
          feedCardCleanupFailed,
          journalPhotoCleanupFailedCount,
        }
      );

      setExplorationJournalDeleteRecord(
        null
      );

      setExplorationJournalRecord(
        null
      );

      setExplorationJournalMemo(
        ''
      );

      setExplorationJournalMood(
        null
      );

      setExplorationJournalPhotoUrls(
        []
      );

      setExplorationJournalShareRecord(
        null
      );

      setExplorationJournalUnshareRecord(
        null
      );

      const cleanupWarning =
        feedCardCleanupFailed ||
        journalPhotoCleanupFailedCount >
          0;

      setNoticeModal({
        title:
          deleteFeedToo
            ? '여행기와 피드 삭제 완료'
            : '여행기 삭제 완료',

        message:
          cleanupWarning
            ? deleteFeedToo
              ? '여행기와 피드 게시물은 삭제했지만 일부 Storage 이미지 정리는 완료되지 않았어요.'
              : '여행기는 삭제했지만 일부 원본 사진 파일 정리는 완료되지 않았어요.'
            : deleteFeedToo
            ? '여행기 내용과 원본 사진, 피드 게시물, 공유 카드 이미지를 함께 삭제했어요.'
            : target
                ?.hasFeedConnection
            ? '여행기 내용과 원본 사진을 삭제했어요. 기존 피드 게시물은 그대로 유지돼요.'
            : '여행기 내용과 원본 사진을 삭제했어요.',
      });
    } catch (error: any) {
      console.log(
        'EXPLORATION JOURNAL FULL DELETE ERROR',
        {
          placeId,
          postId,
          deleteFeedToo,
          code:
            error?.code ??
            null,
          message:
            error?.message ??
            String(error),
        }
      );

      const localData =
        error?.localData;

      if (localData) {
        setExplorationData(
          localData
        );
      }

      setNoticeModal({
        title:
          '여행기 삭제 실패',
        message:
          deleteFeedToo &&
          feedPostRemoved
            ? '피드 게시물은 삭제했지만 여행기 서버 삭제 확인이 완료되지 않았어요. 잠시 후 다시 시도해 주세요.'
            : '여행기를 삭제하지 못했어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      });
    } finally {
      setExplorationJournalDeleting(
        false
      );
    }
  };

useFocusEffect(
  useCallback(() => {
    let active = true;

    const refreshRecordData = async () => {
      try {
        /*
         * 메모리 값만 가져오지 않고
         * AsyncStorage에 저장된 최신 데이터를 다시 읽습니다.
         */
        const latestData =
          (await loadRootOnboardingData()) ??
          {};

        const latestLogs = Array.isArray(
          latestData?.actionLogs
        )
          ? latestData.actionLogs
          : [];

        if (!active) {
          return;
        }

        setData(latestData);

        const savedGrowthSelections =
  latestData
    ?.growthCardSelections;

if (
  savedGrowthSelections &&
  typeof savedGrowthSelections ===
    'object' &&
  !Array.isArray(
    savedGrowthSelections
  )
) {
  setSelectedGrowthLogIds({
    ...savedGrowthSelections,
  });
} else {
  setSelectedGrowthLogIds(
    {}
  );
}

        /*
         * 새 배열을 만들어야 React가
         * logs가 변경되었다고 확실하게 인식합니다.
         */
        setLogs([...latestLogs]);

        console.log(
          'RECORD LOCAL DATA LOADED',
          {
            actionLogCount:
              latestLogs.length,

            latestLogId:
              latestLogs[0]?.id ??
              null,

            latestLogDate:
              latestLogs[0]?.date ??
              null,

            latestLogTitle:
              latestLogs[0]
                ?.action_title ??
              null,
          }
        );
      } catch (error) {
        console.log(
          'RECORD LOCAL DATA LOAD ERROR',
          error
        );

        /*
         * AsyncStorage 읽기에 실패했을 때만
         * 기존 메모리 데이터를 대신 사용합니다.
         */
        const fallbackData =
          getRootOnboardingData() ??
          {};

        const fallbackLogs =
          Array.isArray(
            fallbackData?.actionLogs
          )
            ? fallbackData.actionLogs
            : [];

        if (!active) {
          return;
        }

        setData(fallbackData);
        setLogs([...fallbackLogs]);
      }
    };

    refreshRecordData();

    return () => {
      active = false;
    };
  }, [])
);

useFocusEffect(
  useCallback(() => {
    let active = true;

    /*
     * 크루 데이터는 뱃지 로딩과 분리해서
     * 가장 먼저 화면에 반영합니다.
     */
    const loadCrewData = async () => {
      const loadedCrews =
        await loadRootCrews();

      if (!active) {
        return;
      }

      setCrews([
        ...loadedCrews,
      ]);

      console.log(
        'RECORD CREWS STATE SET',
        {
          count:
            loadedCrews.length,

          crews:
            loadedCrews.map(
              (crew: any) => ({
                id:
                  crew?.id ??
                  null,

                title:
                  crew?.title ??
                  null,

                category:
                  crew?.category ??
                  null,

                ownerId:
                  crew?.ownerId ??
                  null,

                memberIds:
                  crew?.memberIds ??
                  [],
              })
            ),
        }
      );

      /*
       * 게시글은 크루 목록을 화면에 반영한 뒤 불러옵니다.
       */
      await loadRootCrewPosts();
    };

    const loadBadgeData = async () => {
  try {
    /*
     * 먼저 AsyncStorage의 최신 rootData를 읽고,
     * 네트워크를 기다리지 않고 현재 기록으로
     * 획득 뱃지를 즉시 계산합니다.
     */
    await loadRootOnboardingData();

    const calculatedBadges =
      getEarnedBadges();

    if (!active) {
      return;
    }

    setEarnedBadges([
      ...calculatedBadges,
    ]);

    console.log(
      'RECORD BADGE LOCAL CALCULATION',
      {
        count:
          calculatedBadges.length,

        badgeIds:
          calculatedBadges.map(
            (badge) => badge.id
          ),
      }
    );

    /*
     * 저장된 뱃지와 예전 버전 뱃지는
     * 그다음에 복구합니다.
     */
    const recoveredBadges =
      await recoverLegacyBadgesForCurrentUser();

    const loadedEarnedBadges =
      recoveredBadges.length > 0
        ? recoveredBadges
        : await loadRootEarnedBadges();

    if (!active) {
      return;
    }

    /*
     * 서버/저장소에 값이 있으면 그것을 사용하고,
     * 없거나 지연되면 방금 계산한 값을 유지합니다.
     */
    const resolvedBadges =
      loadedEarnedBadges.length > 0
        ? loadedEarnedBadges
        : calculatedBadges;

    setEarnedBadges([
      ...resolvedBadges,
    ]);

    console.log(
      'RECORD BADGE STATE SET',
      {
        count:
          resolvedBadges.length,

        badgeIds:
          resolvedBadges.map(
            (badge) => badge.id
          ),
      }
    );

    /*
     * 확인 이력은 뱃지 숫자 표시를
     * 막지 않도록 백그라운드에서 처리합니다.
     */
    void getSeenBadgeIds()
      .catch((error) => {
        console.log(
          'RECORD BADGE SEEN LOAD ERROR',
          error
        );
      });

    /*
     * 대표 뱃지도 별도로 불러옵니다.
     */
    try {
      const loadedMainBadgeId =
        await loadRootMainBadgeId();

      if (!active) {
        return;
      }

      setMainBadgeId(
        loadedMainBadgeId
      );
    } catch (error) {
      console.log(
        'RECORD MAIN BADGE LOAD ERROR',
        error
      );
    }
  } catch (error) {
    console.log(
      'RECORD BADGE DATA LOAD ERROR',
      error
    );

    /*
     * 복구 과정에서 문제가 생겨도
     * 현재 기록 기준으로 한 번 더 계산합니다.
     */
    const fallbackBadges =
      getEarnedBadges();

    if (!active) {
      return;
    }

    setEarnedBadges([
      ...fallbackBadges,
    ]);
  }
};

    loadCrewData().catch(
      (error) => {
        console.log(
          'RECORD CREW DATA LOAD ERROR',
          error
        );
      }
    );

    loadBadgeData().catch(
      (error) => {
        console.log(
          'RECORD BADGE DATA LOAD ERROR',
          error
        );
      }
    );

    return () => {
      active = false;
    };
  }, [])
);

useFocusEffect(
  useCallback(() => {
    /*
     * 기록 화면에 다시 들어올 때
     * 이전 날짜 선택을 해제합니다.
     */
    setSelectedGrowthDate(null);

    /*
     * 특정 행동목표 기록으로
     * 들어온 경우 타임라인을 엽니다.
     */
    if (
      selectedActionGoalId
    ) {
      setActiveTab(
        'timeline'
      );
    }
  }, [
    selectedActionGoalId,
  ])
);


useFocusEffect(
  useCallback(() => {
    let active = true;

    const refreshExplorationRecords =
      async () => {
        try {
          setExplorationLoading(
            true
          );

          const loadedData =
            await loadLocalExplorationData();

          if (!active) {
            return;
          }

          setExplorationData(
            loadedData
          );

          console.log(
            'RECORD EXPLORATION DATA LOADED',
            {
              points:
                loadedData.points,

              visitedCount:
                loadedData
                  .visitRecords
                  .length,

              completedThemeCount:
                loadedData
                  .completedThemeIds
                  .length,

              stampCount:
                loadedData
                  .unlockedStampIds
                  .length,
            }
          );
        } catch (
          error
        ) {
          console.log(
            'RECORD EXPLORATION DATA LOAD ERROR',
            error
          );
        } finally {
          if (active) {
            setExplorationLoading(
              false
            );
          }
        }
      };

    void refreshExplorationRecords();

    return () => {
      active = false;
    };
  }, [])
);

const explorationVisitRecords =
  useMemo(() => {
    const visitRecords =
      Array.isArray(
        explorationData
          ?.visitRecords
      )
        ? explorationData
            .visitRecords
        : [];

    return [
      ...visitRecords,
    ].sort(
      (
        first: any,
        second: any
      ) =>
        new Date(
          second
            ?.verifiedAt ??
            0
        ).getTime() -
        new Date(
          first
            ?.verifiedAt ??
            0
        ).getTime()
    );
  }, [explorationData]);

useEffect(() => {
  if (
    explorationCalendarInitializedRef.current ||
    explorationVisitRecords.length === 0
  ) {
    return;
  }

  const latestDateKey = getExplorationDateKey(
    explorationVisitRecords[0]?.verifiedAt
  );

  if (latestDateKey) {
    setExplorationCalendarMonth(
      latestDateKey.slice(0, 7)
    );
  }

  explorationCalendarInitializedRef.current = true;
}, [explorationVisitRecords]);

const explorationDistrictOptions = useMemo(() => {
  const availableDistricts = EXPLORATION_DISTRICTS
    .filter((district) => district.available)
    .map((district) => district.name);

  const recordedDistricts = explorationVisitRecords
    .map((record: any) => {
      const placeId = String(record?.placeId ?? '').trim();
      return String(
        EXPLORATION_PLACE_META[placeId]?.district ?? ''
      ).trim();
    })
    .filter(Boolean);

  return [
    'all',
    ...Array.from(
      new Set<string>([
        ...availableDistricts,
        ...recordedDistricts,
      ])
    ),
  ];
}, [explorationVisitRecords]);

const explorationMonthOptions = useMemo(() => {
  const monthKeys = explorationVisitRecords
    .map((record: any) => {
      const verifiedAt = String(record?.verifiedAt ?? '').trim();
      const parsedDate = new Date(verifiedAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return '';
      }

      return `${parsedDate.getFullYear()}-${String(
        parsedDate.getMonth() + 1
      ).padStart(2, '0')}`;
    })
    .filter(Boolean);

  return [
    'all',
    ...Array.from(new Set<string>(monthKeys)).sort((a, b) =>
      b.localeCompare(a)
    ),
  ];
}, [explorationVisitRecords]);

const explorationJournalSummary = useMemo(() => {
  const uid = String(data?.uid ?? '').trim();
  const feedPosts = getRootCrewPosts();

  return explorationVisitRecords.reduce(
    (summary: {
      journalCount: number;
      photoCount: number;
      sharedCount: number;
      needsReshareCount: number;
      sourceDeletedCount: number;
      gpsCount: number;
    }, record: any) => {
      const placeId = String(record?.placeId ?? '').trim();
      const memo = String(record?.journalMemo ?? '').trim();
      const mood = String(record?.journalMood ?? '').trim();
      const photos = normalizeExplorationJournalPhotoUrls(
        record?.journalPhotoUrls
      );
      const hasJournal =
        memo.length > 0 || mood.length > 0 || photos.length > 0;

      if (hasJournal) {
        summary.journalCount += 1;
      }

      summary.photoCount += photos.length;

      const postId = uid && placeId
        ? `${uid}_exploration_journal_${placeId}`
        : '';
      const fallbackPost = postId && Array.isArray(feedPosts)
        ? feedPosts.find(
            (post: any) => String(post?.id ?? '') === postId
          ) ?? null
        : null;
      const feedStatus = getExplorationJournalFeedStatus(
        record,
        fallbackPost
      );

      if (feedStatus === 'shared') {
        summary.sharedCount += 1;
      } else if (feedStatus === 'needs-reshare') {
        summary.needsReshareCount += 1;
      } else if (feedStatus === 'source-deleted') {
        summary.sourceDeletedCount += 1;
      }

      const latitude = Number(record?.latitude);
      const longitude = Number(record?.longitude);
      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) >= 0.000001 &&
        Math.abs(longitude) >= 0.000001
      ) {
        summary.gpsCount += 1;
      }

      return summary;
    },
    {
      journalCount: 0,
      photoCount: 0,
      sharedCount: 0,
      needsReshareCount: 0,
      sourceDeletedCount: 0,
      gpsCount: 0,
    }
  );
}, [data?.uid, explorationVisitRecords]);

const explorationKnownPlaceCount =
  Object.keys(EXPLORATION_PLACE_META).length;

const explorationCompletionPercent =
  explorationKnownPlaceCount > 0
    ? Math.min(
        100,
        Math.round(
          (explorationVisitRecords.length /
            explorationKnownPlaceCount) *
            100
        )
      )
    : 0;

const explorationThemeProgressItems = useMemo(() => {
  const visitedPlaceIds = new Set<string>(
    explorationVisitRecords.map((record: any) =>
      String(record?.placeId ?? '').trim()
    )
  );

  return EXPLORATION_THEME_FILTERS
    .filter((item) => item.id !== 'all')
    .map((item) => {
      const placeIds = EXPLORATION_THEME_PLACE_IDS[item.id] ?? [];
      const visitedCount = placeIds.filter((placeId) =>
        visitedPlaceIds.has(placeId)
      ).length;
      const completed = visitedCount >= placeIds.length;

      return {
        ...item,
        totalCount: placeIds.length,
        visitedCount,
        completed,
        percent:
          placeIds.length > 0
            ? Math.min(
                100,
                Math.round((visitedCount / placeIds.length) * 100)
              )
            : 0,
      };
    });
}, [explorationVisitRecords]);

const explorationCalendarRecordMap = useMemo(() => {
  const recordMap = new Map<string, any[]>();

  explorationVisitRecords.forEach((record: any) => {
    const dateKey = getExplorationDateKey(
      record?.verifiedAt
    );

    if (!dateKey) {
      return;
    }

    const previous = recordMap.get(dateKey) ?? [];
    recordMap.set(dateKey, [...previous, record]);
  });

  return recordMap;
}, [explorationVisitRecords]);

const explorationJourneyDaySummary = useMemo(() => {
  const dateKeys = Array.from(
    explorationCalendarRecordMap.keys()
  ).sort((a, b) => a.localeCompare(b));

  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;

  dateKeys.forEach((dateKey) => {
    const currentDate = new Date(`${dateKey}T12:00:00`);

    if (
      previousDate &&
      Math.round(
        (currentDate.getTime() - previousDate.getTime()) /
          86400000
      ) === 1
    ) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(
      longestStreak,
      currentStreak
    );
    previousDate = currentDate;
  });

  return {
    visitDayCount: dateKeys.length,
    longestStreak,
    latestVisitDate:
      dateKeys.length > 0
        ? dateKeys[dateKeys.length - 1]
        : null,
  };
}, [explorationCalendarRecordMap]);

const explorationCalendarMonthRecords = useMemo(() => {
  return explorationVisitRecords.filter((record: any) =>
    getExplorationDateKey(record?.verifiedAt).startsWith(
      explorationCalendarMonth
    )
  );
}, [
  explorationCalendarMonth,
  explorationVisitRecords,
]);

const explorationCalendarMonthSummary = useMemo(() => {
  const visitDays = new Set<string>();
  let journalCount = 0;
  let photoCount = 0;
  const moodCounts = new Map<string, number>();

  explorationCalendarMonthRecords.forEach((record: any) => {
    const dateKey = getExplorationDateKey(record?.verifiedAt);
    if (dateKey) visitDays.add(dateKey);

    const memo = String(record?.journalMemo ?? '').trim();
    const mood = String(record?.journalMood ?? '').trim();
    const photos = normalizeExplorationJournalPhotoUrls(
      record?.journalPhotoUrls
    );

    if (memo || mood || photos.length > 0) {
      journalCount += 1;
    }

    photoCount += photos.length;

    if (mood) {
      moodCounts.set(
        mood,
        (moodCounts.get(mood) ?? 0) + 1
      );
    }
  });

  const topMoodEntry = Array.from(moodCounts.entries())
    .sort((first, second) => second[1] - first[1])[0];

  return {
    visitCount: explorationCalendarMonthRecords.length,
    visitDayCount: visitDays.size,
    journalCount,
    photoCount,
    topMood:
      topMoodEntry
        ? getExplorationJournalMood(topMoodEntry[0])
        : null,
  };
}, [explorationCalendarMonthRecords]);


const explorationPreviousCalendarMonth = useMemo(
  () => shiftMonthKey(explorationCalendarMonth, -1),
  [explorationCalendarMonth]
);

const explorationPreviousMonthRecords = useMemo(() => {
  return explorationVisitRecords.filter((record: any) =>
    getExplorationDateKey(record?.verifiedAt).startsWith(
      explorationPreviousCalendarMonth
    )
  );
}, [
  explorationPreviousCalendarMonth,
  explorationVisitRecords,
]);

const summarizeExplorationRecordGroup = useCallback(
  (records: any[]) => {
    const visitDays = new Set<string>();
    const moodCounts = new Map<string, number>();
    const areaTypeCounts = new Map<string, number>();
    let journalCount = 0;
    let photoCount = 0;

    records.forEach((record: any) => {
      const placeId = String(record?.placeId ?? '').trim();
      const placeMeta = EXPLORATION_PLACE_META[placeId];
      const dateKey = getExplorationDateKey(record?.verifiedAt);
      const memo = String(record?.journalMemo ?? '').trim();
      const mood = String(record?.journalMood ?? '').trim();
      const photos = normalizeExplorationJournalPhotoUrls(
        record?.journalPhotoUrls
      );

      if (dateKey) visitDays.add(dateKey);
      if (memo || mood || photos.length > 0) journalCount += 1;
      photoCount += photos.length;

      if (mood) {
        moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
      }

      const areaType = String(placeMeta?.areaType ?? '기타').trim();
      areaTypeCounts.set(
        areaType,
        (areaTypeCounts.get(areaType) ?? 0) + 1
      );
    });

    const topMoodEntry = Array.from(moodCounts.entries()).sort(
      (first, second) => second[1] - first[1]
    )[0];
    const topAreaTypeEntry = Array.from(areaTypeCounts.entries()).sort(
      (first, second) => second[1] - first[1]
    )[0];

    return {
      visitCount: records.length,
      visitDayCount: visitDays.size,
      journalCount,
      photoCount,
      topMood: topMoodEntry
        ? getExplorationJournalMood(topMoodEntry[0])
        : null,
      topAreaType: topAreaTypeEntry?.[0] ?? null,
      moodCounts,
      areaTypeCounts,
    };
  },
  []
);

const explorationPreviousMonthSummary = useMemo(
  () => summarizeExplorationRecordGroup(explorationPreviousMonthRecords),
  [explorationPreviousMonthRecords, summarizeExplorationRecordGroup]
);

const explorationAllMonthSummaries = useMemo(() => {
  const monthRecordMap = new Map<string, any[]>();

  explorationVisitRecords.forEach((record: any) => {
    const dateKey = getExplorationDateKey(record?.verifiedAt);
    const monthKey = dateKey.slice(0, 7);
    if (!monthKey) return;
    const previous = monthRecordMap.get(monthKey) ?? [];
    monthRecordMap.set(monthKey, [...previous, record]);
  });

  return Array.from(monthRecordMap.entries())
    .map(([monthKey, records]) => ({
      monthKey,
      ...summarizeExplorationRecordGroup(records),
    }))
    .sort((first, second) => {
      if (second.visitCount !== first.visitCount) {
        return second.visitCount - first.visitCount;
      }
      if (second.journalCount !== first.journalCount) {
        return second.journalCount - first.journalCount;
      }
      return second.monthKey.localeCompare(first.monthKey);
    });
}, [explorationVisitRecords, summarizeExplorationRecordGroup]);

const explorationBestMonthSummary =
  explorationAllMonthSummaries[0] ?? null;

const explorationCurrentMonthDetailedSummary = useMemo(
  () => summarizeExplorationRecordGroup(explorationCalendarMonthRecords),
  [explorationCalendarMonthRecords, summarizeExplorationRecordGroup]
);

const explorationMonthlyAreaTypeStats = useMemo(() => {
  const entries = Array.from(
    explorationCurrentMonthDetailedSummary.areaTypeCounts.entries()
  ).sort((first, second) => second[1] - first[1]);
  const maxCount = Math.max(1, ...entries.map((entry) => entry[1]));

  return entries.map(([label, count]) => ({
    label,
    count,
    percent: Math.round((count / maxCount) * 100),
  }));
}, [explorationCurrentMonthDetailedSummary]);

const explorationMonthlyMoodStats = useMemo(() => {
  const entries = Array.from(
    explorationCurrentMonthDetailedSummary.moodCounts.entries()
  ).sort((first, second) => second[1] - first[1]);
  const total = Math.max(1, entries.reduce((sum, entry) => sum + entry[1], 0));

  return entries.map(([moodId, count]) => ({
    mood: getExplorationJournalMood(moodId),
    count,
    percent: Math.round((count / total) * 100),
  }));
}, [explorationCurrentMonthDetailedSummary]);

const explorationHealthSummary = useMemo(() => {
  const visitCount = explorationVisitRecords.length;
  const journalRate = visitCount > 0
    ? Math.round((explorationJournalSummary.journalCount / visitCount) * 100)
    : 0;
  const photoJournalCount = explorationVisitRecords.filter((record: any) =>
    normalizeExplorationJournalPhotoUrls(record?.journalPhotoUrls).length > 0
  ).length;
  const photoRate = visitCount > 0
    ? Math.round((photoJournalCount / visitCount) * 100)
    : 0;
  const gpsRate = visitCount > 0
    ? Math.round((explorationJournalSummary.gpsCount / visitCount) * 100)
    : 0;
  const sharedBase =
    explorationJournalSummary.sharedCount +
    explorationJournalSummary.needsReshareCount;
  const feedFreshRate = sharedBase > 0
    ? Math.round((explorationJournalSummary.sharedCount / sharedBase) * 100)
    : 100;

  return { journalRate, photoRate, gpsRate, feedFreshRate };
}, [explorationJournalSummary, explorationVisitRecords]);

const explorationMilestoneItems = useMemo(() => {
  const resolveMilestone = (current: number, goals: number[]) => {
    const nextGoal = goals.find((goal) => current < goal) ?? goals[goals.length - 1];
    const completedGoal = [...goals].reverse().find((goal) => current >= goal) ?? 0;
    return {
      current,
      nextGoal,
      completedGoal,
      completed: current >= goals[goals.length - 1],
      percent: Math.min(100, Math.round((current / Math.max(1, nextGoal)) * 100)),
    };
  };

  return [
    {
      id: 'visit',
      icon: '📍',
      label: '방문 장소',
      unit: '곳',
      ...resolveMilestone(explorationVisitRecords.length, [1, 3, 5, 10]),
    },
    {
      id: 'journal',
      icon: '📖',
      label: '여행기',
      unit: '개',
      ...resolveMilestone(explorationJournalSummary.journalCount, [1, 3, 5, 10]),
    },
    {
      id: 'photo',
      icon: '📷',
      label: '여행기 사진',
      unit: '장',
      ...resolveMilestone(explorationJournalSummary.photoCount, [1, 5, 10, 30]),
    },
    {
      id: 'day',
      icon: '🔥',
      label: '탐험 방문일',
      unit: '일',
      ...resolveMilestone(explorationJourneyDaySummary.visitDayCount, [1, 3, 7, 30]),
    },
  ];
}, [
  explorationJournalSummary,
  explorationJourneyDaySummary.visitDayCount,
  explorationVisitRecords.length,
]);

const explorationCompletedMilestoneCount = explorationMilestoneItems.filter(
  (item) => item.completedGoal > 0
).length;

const explorationCalendarCells = useMemo(() => {
  const [yearValue, monthValue] = explorationCalendarMonth
    .split('-')
    .map(Number);

  const firstWeekday = new Date(
    yearValue,
    monthValue - 1,
    1
  ).getDay();

  const daysInMonth = new Date(
    yearValue,
    monthValue,
    0
  ).getDate();

  const totalCellCount = Math.ceil(
    (firstWeekday + daysInMonth) / 7
  ) * 7;

  return Array.from(
    { length: totalCellCount },
    (_, index) => {
      const day = index - firstWeekday + 1;
      const inMonth = day >= 1 && day <= daysInMonth;

      return {
        key: `${explorationCalendarMonth}-${index}`,
        day: inMonth ? day : 0,
        inMonth,
        dateKey: inMonth
          ? `${explorationCalendarMonth}-${String(day).padStart(2, '0')}`
          : '',
      };
    }
  );
}, [explorationCalendarMonth]);

const selectedExplorationCalendarRecords = useMemo(() => {
  if (!explorationCalendarDateFilter) {
    return [];
  }

  return (
    explorationCalendarRecordMap.get(
      explorationCalendarDateFilter
    ) ?? []
  );
}, [
  explorationCalendarDateFilter,
  explorationCalendarRecordMap,
]);

const explorationNextRecommendation = useMemo(() => {
  const visitedPlaceIds = new Set<string>(
    explorationVisitRecords.map((record: any) =>
      String(record?.placeId ?? '').trim()
    )
  );

  const incompleteThemes = explorationThemeProgressItems
    .filter((item) => !item.completed)
    .map((item) => {
      const missingPlaceIds = (
        EXPLORATION_THEME_PLACE_IDS[item.id] ?? []
      ).filter((placeId) => !visitedPlaceIds.has(placeId));

      return {
        ...item,
        missingPlaceIds,
      };
    })
    .sort((first, second) => {
      if (second.visitedCount !== first.visitedCount) {
        return second.visitedCount - first.visitedCount;
      }

      return first.missingPlaceIds.length -
        second.missingPlaceIds.length;
    });

  return incompleteThemes[0] ?? null;
}, [
  explorationThemeProgressItems,
  explorationVisitRecords,
]);

const explorationSmartTasks = useMemo(() => {
  const unwrittenCount = explorationVisitRecords.filter(
    (record: any) => !hasExplorationJournalContent(record)
  ).length;
  const photoMissingCount = explorationVisitRecords.filter((record: any) =>
    hasExplorationJournalContent(record) &&
    normalizeExplorationJournalPhotoUrls(record?.journalPhotoUrls).length === 0
  ).length;
  const tasks: Array<{
    id: ExplorationSmartTaskId;
    icon: string;
    title: string;
    description: string;
    count: number;
  }> = [];

  if (unwrittenCount > 0) {
    tasks.push({
      id: 'unwritten',
      icon: '✍️',
      title: '여행기 남기기',
      description: '방문만 하고 기록하지 않은 장소',
      count: unwrittenCount,
    });
  }
  if (explorationJournalSummary.needsReshareCount > 0) {
    tasks.push({
      id: 'needs-reshare',
      icon: '🔄',
      title: '피드 다시 공유',
      description: '수정된 최신 여행기로 바꾸기',
      count: explorationJournalSummary.needsReshareCount,
    });
  }
  if (explorationJournalSummary.sourceDeletedCount > 0) {
    tasks.push({
      id: 'source-deleted',
      icon: '🧹',
      title: '피드 연결 정리',
      description: '원본 없이 피드만 남은 기록',
      count: explorationJournalSummary.sourceDeletedCount,
    });
  }
  if (photoMissingCount > 0) {
    tasks.push({
      id: 'photo-missing',
      icon: '📷',
      title: '사진 더하기',
      description: '여행기는 있지만 사진이 없는 장소',
      count: photoMissingCount,
    });
  }
  if (explorationNextRecommendation) {
    tasks.push({
      id: 'next-theme',
      icon: explorationNextRecommendation.icon,
      title: `${explorationNextRecommendation.label} 이어가기`,
      description: `완성까지 ${explorationNextRecommendation.missingPlaceIds.length}곳`,
      count: explorationNextRecommendation.missingPlaceIds.length,
    });
  }

  return tasks.slice(0, 5);
}, [
  explorationJournalSummary,
  explorationNextRecommendation,
  explorationVisitRecords,
]);

const explorationFilterActive =
  explorationSearchText.trim().length > 0 ||
  explorationDistrictFilter !== 'all' ||
  explorationThemeFilter !== 'all' ||
  explorationJournalFilter !== 'all' ||
  explorationMonthFilter !== 'all' ||
  explorationPhotoFilter !== 'all' ||
  !!explorationCalendarDateFilter ||
  explorationSortOption !== 'visited-desc';

const resetExplorationFilters = () => {
  setExplorationSearchText('');
  setExplorationDistrictFilter('all');
  setExplorationThemeFilter('all');
  setExplorationJournalFilter('all');
  setExplorationMonthFilter('all');
  setExplorationPhotoFilter('all');
  setExplorationCalendarDateFilter(null);
  setExplorationSortOption('visited-desc');
};


const applyExplorationSmartTask = (taskId: ExplorationSmartTaskId) => {
  setExplorationViewMode('list');
  setExplorationFiltersExpanded(false);
  setExplorationSearchText('');
  setExplorationDistrictFilter('all');
  setExplorationMonthFilter('all');
  setExplorationCalendarDateFilter(null);
  setExplorationSortOption('visited-desc');

  if (taskId === 'unwritten') {
    setExplorationThemeFilter('all');
    setExplorationJournalFilter('unwritten');
    setExplorationPhotoFilter('all');
    return;
  }

  if (taskId === 'needs-reshare') {
    setExplorationThemeFilter('all');
    setExplorationJournalFilter('needs-reshare');
    setExplorationPhotoFilter('all');
    return;
  }

  if (taskId === 'source-deleted') {
    setExplorationThemeFilter('all');
    setExplorationJournalFilter('source-deleted');
    setExplorationPhotoFilter('all');
    return;
  }

  if (taskId === 'photo-missing') {
    setExplorationThemeFilter('all');
    setExplorationJournalFilter('written');
    setExplorationPhotoFilter('without-photos');
    return;
  }

  if (taskId === 'next-theme' && explorationNextRecommendation) {
    setExplorationThemeFilter(
      explorationNextRecommendation.id as ExplorationThemeFilter
    );
    setExplorationJournalFilter('all');
    setExplorationPhotoFilter('all');
  }
};

const explorationActiveFilterLabels = useMemo(() => {
  const labels: string[] = [];
  const searchText = explorationSearchText.trim();

  if (searchText) labels.push(`검색: ${searchText}`);
  if (explorationDistrictFilter !== 'all') {
    labels.push(explorationDistrictFilter);
  }
  if (explorationThemeFilter !== 'all') {
    const themeItem = EXPLORATION_THEME_FILTERS.find(
      (item) => item.id === explorationThemeFilter
    );
    if (themeItem) labels.push(`${themeItem.icon} ${themeItem.label}`);
  }
  if (explorationJournalFilter !== 'all') {
    const journalItem = EXPLORATION_JOURNAL_FILTERS.find(
      (item) => item.id === explorationJournalFilter
    );
    if (journalItem) labels.push(journalItem.label);
  }
  if (explorationMonthFilter !== 'all') {
    labels.push(explorationMonthFilter.replace('-', '.'));
  }
  if (explorationPhotoFilter !== 'all') {
    const photoItem = EXPLORATION_PHOTO_FILTERS.find(
      (item) => item.id === explorationPhotoFilter
    );
    if (photoItem) labels.push(photoItem.label);
  }
  if (explorationCalendarDateFilter) {
    labels.push(
      `방문일 ${formatExplorationCalendarDateLabel(
        explorationCalendarDateFilter
      )}`
    );
  }
  if (explorationSortOption !== 'visited-desc') {
    const sortItem = EXPLORATION_SORT_OPTIONS.find(
      (item) => item.id === explorationSortOption
    );
    if (sortItem) labels.push(sortItem.label);
  }

  return labels;
}, [
  explorationCalendarDateFilter,
  explorationDistrictFilter,
  explorationJournalFilter,
  explorationMonthFilter,
  explorationPhotoFilter,
  explorationSearchText,
  explorationSortOption,
  explorationThemeFilter,
]);

const filteredExplorationVisitRecords = useMemo(() => {
  const query = explorationSearchText.trim().toLowerCase();
  const uid = String(data?.uid ?? '').trim();
  const feedPosts = getRootCrewPosts();

  const filtered = explorationVisitRecords.filter((record: any) => {
    const placeId = String(record?.placeId ?? '').trim();
    const placeMeta = EXPLORATION_PLACE_META[placeId];
    const memo = String(record?.journalMemo ?? '').trim();
    const photos = normalizeExplorationJournalPhotoUrls(
      record?.journalPhotoUrls
    );
    const hasJournal =
      memo.length > 0 ||
      !!String(record?.journalMood ?? '').trim() ||
      photos.length > 0;

    const postId = uid && placeId
      ? `${uid}_exploration_journal_${placeId}`
      : '';
    const fallbackPost = postId && Array.isArray(feedPosts)
      ? feedPosts.find((post: any) => String(post?.id ?? '') === postId) ?? null
      : null;
    const feedStatus = getExplorationJournalFeedStatus(
      record,
      fallbackPost
    );

    if (query) {
      const target = [
        placeMeta?.name,
        placeMeta?.district,
        placeMeta?.areaType,
        memo,
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');
      if (!target.includes(query)) return false;
    }

    if (
      explorationDistrictFilter !== 'all' &&
      String(placeMeta?.district ?? '') !== explorationDistrictFilter
    ) return false;

    if (explorationMonthFilter !== 'all') {
      const verifiedDate = new Date(String(record?.verifiedAt ?? ''));
      const monthKey = Number.isNaN(verifiedDate.getTime())
        ? ''
        : `${verifiedDate.getFullYear()}-${String(
            verifiedDate.getMonth() + 1
          ).padStart(2, '0')}`;

      if (monthKey !== explorationMonthFilter) return false;
    }

    if (
      explorationCalendarDateFilter &&
      getExplorationDateKey(record?.verifiedAt) !==
        explorationCalendarDateFilter
    ) {
      return false;
    }

    if (
      explorationThemeFilter !== 'all' &&
      !(EXPLORATION_THEME_PLACE_IDS[explorationThemeFilter] ?? [])
        .includes(placeId)
    ) return false;

    if (explorationJournalFilter === 'written' && !hasJournal)
      return false;
    if (explorationJournalFilter === 'unwritten' && hasJournal)
      return false;
    if (
      explorationJournalFilter === 'needs-reshare' &&
      feedStatus !== 'needs-reshare'
    ) return false;
    if (
      explorationJournalFilter === 'source-deleted' &&
      feedStatus !== 'source-deleted'
    ) return false;

    if (
      explorationPhotoFilter === 'with-photos' &&
      photos.length === 0
    ) return false;

    if (
      explorationPhotoFilter === 'without-photos' &&
      photos.length > 0
    ) return false;

    return true;
  });

  return [...filtered].sort((first: any, second: any) => {
    if (explorationSortOption === 'visited-asc') {
      return getSafeDateTime(first?.verifiedAt) -
        getSafeDateTime(second?.verifiedAt);
    }

    if (explorationSortOption === 'journal-desc') {
      return getSafeDateTime(
        second?.journalUpdatedAt ?? second?.verifiedAt
      ) - getSafeDateTime(
        first?.journalUpdatedAt ?? first?.verifiedAt
      );
    }

    return getSafeDateTime(second?.verifiedAt) -
      getSafeDateTime(first?.verifiedAt);
  });
}, [
  data?.uid,
  explorationCalendarDateFilter,
  explorationDistrictFilter,
  explorationJournalFilter,
  explorationMonthFilter,
  explorationPhotoFilter,
  explorationSearchText,
  explorationSortOption,
  explorationThemeFilter,
  explorationVisitRecords,
]);

type ExplorationMapCoordinateSource =
  | 'gps'
  | 'place';

const getExplorationMapCoordinate = (
  record: any
): {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  source: ExplorationMapCoordinateSource;
} | null => {
  const latitude = Number(record?.latitude);
  const longitude = Number(record?.longitude);

  const hasVerifiedGps =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) >= 0.000001 &&
    Math.abs(longitude) >= 0.000001;

  if (hasVerifiedGps) {
    return {
      coordinate: {
        latitude,
        longitude,
      },
      source: 'gps',
    };
  }

  /*
   * 예전 탐험 기록은 통합 이전 과정에서
   * latitude / longitude가 0으로 저장된 경우가 있습니다.
   * 이때 실제 GPS 인증 위치인 것처럼 표시하지 않고,
   * 장소의 대표 위치를 지도 표시용으로만 사용합니다.
   */
  const placeId = String(
    record?.placeId ?? ''
  ).trim();

  const placeMeta =
    EXPLORATION_PLACE_META[placeId];

  const fallbackLatitude = Number(
    placeMeta?.mapLatitude
  );

  const fallbackLongitude = Number(
    placeMeta?.mapLongitude
  );

  if (
    !Number.isFinite(fallbackLatitude) ||
    !Number.isFinite(fallbackLongitude)
  ) {
    return null;
  }

  return {
    coordinate: {
      latitude: fallbackLatitude,
      longitude: fallbackLongitude,
    },
    source: 'place',
  };
};

const explorationMapBaseRecords = useMemo(() => {
  return filteredExplorationVisitRecords
    .map((record: any) => {
      const resolved =
        getExplorationMapCoordinate(record);

      return resolved
        ? {
            record,
            coordinate:
              resolved.coordinate,
            coordinateSource:
              resolved.source,
          }
        : null;
    })
    .filter(Boolean) as Array<{
      record: any;
      coordinate: {
        latitude: number;
        longitude: number;
      };
      coordinateSource:
        ExplorationMapCoordinateSource;
    }>;
}, [filteredExplorationVisitRecords]);

const explorationMapRecords = useMemo(() => {
  if (explorationMapSourceFilter === 'all') {
    return explorationMapBaseRecords;
  }

  return explorationMapBaseRecords.filter(
    (item) => item.coordinateSource === explorationMapSourceFilter
  );
}, [explorationMapBaseRecords, explorationMapSourceFilter]);

const explorationMapGpsCount = useMemo(
  () =>
    explorationMapRecords.filter(
      (item) =>
        item.coordinateSource === 'gps'
    ).length,
  [explorationMapRecords]
);

const explorationMapPlaceCount = useMemo(
  () =>
    explorationMapRecords.filter(
      (item) =>
        item.coordinateSource === 'place'
    ).length,
  [explorationMapRecords]
);


const explorationMapJourneyRecords = useMemo(() => {
  return [...explorationMapRecords].sort(
    (first, second) =>
      getSafeDateTime(first.record?.verifiedAt) -
      getSafeDateTime(second.record?.verifiedAt)
  );
}, [explorationMapRecords]);

const explorationMapRouteCoordinates = useMemo(
  () => explorationMapJourneyRecords.map((item) => item.coordinate),
  [explorationMapJourneyRecords]
);

const explorationMapRouteDistanceKm = useMemo(() => {
  return explorationMapRouteCoordinates.reduce(
    (total, coordinate, index) => {
      if (index === 0) return 0;
      return total + calculateExplorationDistanceKm(
        explorationMapRouteCoordinates[index - 1],
        coordinate
      );
    },
    0
  );
}, [explorationMapRouteCoordinates]);

const explorationMapRegion = useMemo(() => {
  return getRouteSnapshotRegion(
    explorationMapRecords.map(
      (item: any) => item.coordinate
    )
  );
}, [explorationMapRecords]);

const explorationMapKey = useMemo(() => {
  return `${explorationMapSourceFilter}_` + (
    explorationMapRecords
      .map((item: any) =>
        String(item.record?.placeId ?? '')
      )
      .join('_') || 'empty'
  );
}, [explorationMapRecords, explorationMapSourceFilter]);

const selectedExplorationMapItem = useMemo(() => {
  if (!selectedExplorationMapPlaceId) {
    return explorationMapRecords[0] ?? null;
  }

  return (
    explorationMapRecords.find(
      (item: any) =>
        String(item.record?.placeId ?? '') ===
        selectedExplorationMapPlaceId
    ) ??
    explorationMapRecords[0] ??
    null
  );
}, [
  explorationMapRecords,
  selectedExplorationMapPlaceId,
]);

const selectedExplorationMapRecord =
  selectedExplorationMapItem?.record ?? null;

const selectedExplorationMapIndex = useMemo(() => {
  if (!selectedExplorationMapRecord) return -1;

  const selectedPlaceId = String(
    selectedExplorationMapRecord?.placeId ?? ''
  );

  return explorationMapRecords.findIndex(
    (item: any) =>
      String(item.record?.placeId ?? '') === selectedPlaceId
  );
}, [explorationMapRecords, selectedExplorationMapRecord]);

const focusAllExplorationMapMarkers = useCallback(() => {
  const coordinates = explorationMapRecords.map(
    (item: any) => item.coordinate
  );

  if (coordinates.length === 0) return;

  explorationMapViewRef.current?.fitToCoordinates(coordinates, {
    edgePadding: {
      top: 58,
      right: 58,
      bottom: 58,
      left: 58,
    },
    animated: true,
  });
}, [explorationMapRecords]);

const moveExplorationMapSelection = useCallback(
  (direction: -1 | 1) => {
    if (explorationMapRecords.length === 0) return;

    const currentIndex =
      selectedExplorationMapIndex >= 0
        ? selectedExplorationMapIndex
        : 0;
    const nextIndex =
      (currentIndex + direction + explorationMapRecords.length) %
      explorationMapRecords.length;
    const nextItem = explorationMapRecords[nextIndex];
    const nextPlaceId = String(nextItem?.record?.placeId ?? '').trim();

    if (!nextPlaceId) return;

    setSelectedExplorationMapPlaceId(nextPlaceId);
    explorationMapViewRef.current?.animateToRegion(
      {
        ...nextItem.coordinate,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      350
    );
  },
  [explorationMapRecords, selectedExplorationMapIndex]
);

useEffect(() => {
  if (explorationViewMode !== 'map') {
    return;
  }

  const selectedStillVisible = explorationMapRecords.some(
    (item: any) =>
      String(item.record?.placeId ?? '') ===
      selectedExplorationMapPlaceId
  );

  if (!selectedStillVisible) {
    setSelectedExplorationMapPlaceId(
      explorationMapRecords[0]?.record?.placeId
        ? String(explorationMapRecords[0].record.placeId)
        : null
    );
  }
}, [
  explorationMapRecords,
  explorationViewMode,
  selectedExplorationMapPlaceId,
]);


const explorationNearbyRecommendations = useMemo(() => {
  const latestRecord = [...explorationVisitRecords].sort(
    (first: any, second: any) =>
      getSafeDateTime(second?.verifiedAt) -
      getSafeDateTime(first?.verifiedAt)
  )[0];

  if (!latestRecord) return [];

  const latestResolved = getExplorationMapCoordinate(latestRecord);
  if (!latestResolved) return [];

  const visitedPlaceIds = new Set(
    explorationVisitRecords.map((record: any) =>
      String(record?.placeId ?? '').trim()
    )
  );

  return Object.entries(EXPLORATION_PLACE_META)
    .filter(([placeId]) => !visitedPlaceIds.has(placeId))
    .map(([placeId, placeMeta]) => ({
      placeId,
      placeMeta,
      distanceKm: calculateExplorationDistanceKm(
        latestResolved.coordinate,
        {
          latitude: placeMeta.mapLatitude,
          longitude: placeMeta.mapLongitude,
        }
      ),
    }))
    .sort((first, second) => first.distanceKm - second.distanceKm)
    .slice(0, 3);
}, [explorationVisitRecords]);


const explorationVisitedPlaceIdSet = useMemo(
  () =>
    new Set<string>(
      explorationVisitRecords.map((record: any) =>
        String(record?.placeId ?? '').trim()
      )
    ),
  [explorationVisitRecords]
);

const explorationUnvisitedCatalogPlaces = useMemo(
  () =>
    Object.entries(EXPLORATION_PLACE_META)
      .filter(([placeId]) => !explorationVisitedPlaceIdSet.has(placeId))
      .map(([placeId, placeMeta]) => ({ placeId, placeMeta })),
  [explorationVisitedPlaceIdSet]
);

const explorationWishlistItems = useMemo(
  () =>
    explorationWishlistPlaceIds
      .map((placeId) => ({
        placeId,
        placeMeta: EXPLORATION_PLACE_META[placeId],
      }))
      .filter((item) => !!item.placeMeta && !explorationVisitedPlaceIdSet.has(item.placeId)),
  [explorationVisitedPlaceIdSet, explorationWishlistPlaceIds]
);

const explorationPlanItems = useMemo(
  () =>
    explorationPlanPlaceIds
      .map((placeId) => ({
        placeId,
        placeMeta: EXPLORATION_PLACE_META[placeId],
      }))
      .filter((item) => !!item.placeMeta && !explorationVisitedPlaceIdSet.has(item.placeId)),
  [explorationPlanPlaceIds, explorationVisitedPlaceIdSet]
);

const explorationLatestReferenceCoordinate = useMemo(() => {
  const latestRecord = [...explorationVisitRecords].sort(
    (first: any, second: any) =>
      getSafeDateTime(second?.verifiedAt) -
      getSafeDateTime(first?.verifiedAt)
  )[0];

  return latestRecord
    ? getExplorationMapCoordinate(latestRecord)?.coordinate ?? null
    : null;
}, [explorationVisitRecords]);

const explorationPlanDistanceKm = useMemo(() => {
  const coordinates = explorationPlanItems.map((item) => ({
    latitude: item.placeMeta.mapLatitude,
    longitude: item.placeMeta.mapLongitude,
  }));

  if (coordinates.length === 0) return 0;

  let total = 0;
  let previous = explorationLatestReferenceCoordinate ?? coordinates[0];

  coordinates.forEach((coordinate, index) => {
    if (index === 0 && !explorationLatestReferenceCoordinate) {
      previous = coordinate;
      return;
    }

    total += calculateExplorationDistanceKm(previous, coordinate);
    previous = coordinate;
  });

  return total;
}, [explorationLatestReferenceCoordinate, explorationPlanItems]);

const toggleExplorationWishlistPlace = useCallback((placeId: string) => {
  setExplorationWishlistPlaceIds((current) =>
    current.includes(placeId)
      ? current.filter((item) => item !== placeId)
      : [...current, placeId]
  );
}, []);

const toggleExplorationPlanPlace = useCallback((placeId: string) => {
  setExplorationPlanPlaceIds((current) => {
    if (current.includes(placeId)) {
      return current.filter((item) => item !== placeId);
    }

    if (current.length >= 5) {
      setNoticeModal({
        title: '코스는 최대 5곳',
        message: '하루 탐험 코스는 최대 5곳까지 담을 수 있어요.',
      });
      return current;
    }

    return [...current, placeId];
  });
}, []);

const buildExplorationRecommendedPlan = useCallback(() => {
  const remaining = explorationUnvisitedCatalogPlaces.map((item) => ({
    ...item,
    coordinate: {
      latitude: item.placeMeta.mapLatitude,
      longitude: item.placeMeta.mapLongitude,
    },
  }));

  if (remaining.length === 0) {
    setNoticeModal({
      title: '현재 지역 탐험 완료',
      message: '현재 등록된 종로구·중구·서대문구·용산구 탐험 장소를 모두 방문했어요.',
    });
    return;
  }

  const ordered: string[] = [];
  let currentCoordinate =
    explorationLatestReferenceCoordinate ?? {
      latitude: 37.5685,
      longitude: 126.9900,
    };

  while (remaining.length > 0 && ordered.length < 4) {
    remaining.sort(
      (first, second) =>
        calculateExplorationDistanceKm(currentCoordinate, first.coordinate) -
        calculateExplorationDistanceKm(currentCoordinate, second.coordinate)
    );

    const next = remaining.shift();
    if (!next) break;

    ordered.push(next.placeId);
    currentCoordinate = next.coordinate;
  }

  setExplorationPlanPlaceIds(ordered);
  setExplorationPlannerExpanded(true);
}, [explorationLatestReferenceCoordinate, explorationUnvisitedCatalogPlaces]);

const addWishlistToExplorationPlan = useCallback(() => {
  const next = explorationWishlistItems
    .map((item) => item.placeId)
    .slice(0, 5);

  if (next.length === 0) {
    setNoticeModal({
      title: '가고 싶은 곳이 없어요',
      message: '미방문 장소의 별 버튼을 눌러 먼저 저장해 주세요.',
    });
    return;
  }

  setExplorationPlanPlaceIds(next);
  setExplorationPlannerExpanded(true);
}, [explorationWishlistItems]);

const explorationWeeklySummary = useMemo(() => {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const endInclusive = new Date(end);
  endInclusive.setDate(endInclusive.getDate() - 1);

  const records = explorationVisitRecords.filter((record: any) => {
    const time = getSafeDateTime(record?.verifiedAt);
    return time >= start.getTime() && time < end.getTime();
  });

  const journalCount = records.filter((record: any) =>
    hasExplorationJournalContent(record)
  ).length;
  const photoCount = records.reduce(
    (total: number, record: any) =>
      total + normalizeExplorationJournalPhotoUrls(record?.journalPhotoUrls).length,
    0
  );

  const tasks = [
    {
      id: 'visit',
      icon: '📍',
      title: '이번 주 1곳 방문',
      description: `${Math.min(records.length, 1)}/1곳`,
      completed: records.length >= 1,
    },
    {
      id: 'journal',
      icon: '📖',
      title: '여행기 1개 작성',
      description: `${Math.min(journalCount, 1)}/1개`,
      completed: journalCount >= 1,
    },
    {
      id: 'photo',
      icon: '📷',
      title: '사진 1장 남기기',
      description: `${Math.min(photoCount, 1)}/1장`,
      completed: photoCount >= 1,
    },
    {
      id: 'feed',
      icon: '🔄',
      title: '피드 최신 상태 유지',
      description:
        explorationJournalSummary.needsReshareCount === 0
          ? '정리 완료'
          : `${explorationJournalSummary.needsReshareCount}개 남음`,
      completed: explorationJournalSummary.needsReshareCount === 0,
    },
  ];

  return {
    start,
    end,
    endInclusive,
    records,
    tasks,
    completedCount: tasks.filter((item) => item.completed).length,
  };
}, [explorationJournalSummary.needsReshareCount, explorationVisitRecords]);

const explorationDistrictRoadmapItems = useMemo(() => {
  return EXPLORATION_DISTRICT_ROADMAP.map((item) => {
    const district = EXPLORATION_DISTRICTS.find(
      (candidate) => candidate.id === item.id
    );
    const districtPlaces = Object.entries(EXPLORATION_PLACE_META).filter(
      ([, placeMeta]) => placeMeta.districtId === item.id
    );
    const districtPlaceIds = new Set(
      districtPlaces.map(([placeId]) => placeId)
    );
    const visitedCount = explorationVisitRecords.filter((record: any) =>
      districtPlaceIds.has(String(record?.placeId ?? '').trim())
    ).length;

    return {
      ...item,
      status: district?.available ? 'active' : 'planned',
      subtitle: district?.available
        ? '현재 탐험 가능'
        : item.subtitle,
      visitedCount,
      totalCount: districtPlaces.length,
    };
  });
}, [explorationVisitRecords]);

const explorationMemoryHighlights = useMemo(() => {
  const journalRecords = explorationVisitRecords.filter((record: any) =>
    hasExplorationJournalContent(record)
  );

  if (journalRecords.length === 0) return [];

  const candidates = [
    {
      id: 'latest',
      label: '최근 여행기',
      icon: '🕒',
      record: [...journalRecords].sort(
        (first: any, second: any) =>
          getSafeDateTime(second?.journalUpdatedAt) -
          getSafeDateTime(first?.journalUpdatedAt)
      )[0],
    },
    {
      id: 'photos',
      label: '사진이 많은 기록',
      icon: '📷',
      record: [...journalRecords].sort(
        (first: any, second: any) =>
          normalizeExplorationJournalPhotoUrls(second?.journalPhotoUrls).length -
          normalizeExplorationJournalPhotoUrls(first?.journalPhotoUrls).length
      )[0],
    },
    {
      id: 'story',
      label: '가장 긴 여행기',
      icon: '✍️',
      record: [...journalRecords].sort(
        (first: any, second: any) =>
          String(second?.journalMemo ?? '').trim().length -
          String(first?.journalMemo ?? '').trim().length
      )[0],
    },
  ];

  const seen = new Set<string>();
  return candidates.filter((item) => {
    const placeId = String(item.record?.placeId ?? '').trim();
    if (!placeId || seen.has(placeId)) return false;
    seen.add(placeId);
    return true;
  });
}, [explorationVisitRecords]);

const shareExplorationMonthlyReport = async () => {
  if (
    explorationMonthlyReportSharing ||
    !explorationMonthlyReportCaptureRef.current
  ) {
    return;
  }

  try {
    setExplorationMonthlyReportSharing(true);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    const reportUri = await captureRef(
      explorationMonthlyReportCaptureRef.current,
      {
        format: 'jpg',
        quality: 0.95,
        result: 'tmpfile',
      }
    );

    const sharingAvailable = await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
      setNoticeModal({
        title: '공유 기능을 사용할 수 없어요',
        message: '이 기기에서는 월간 탐험 리포트 공유를 지원하지 않아요.',
      });
      return;
    }

    await Sharing.shareAsync(reportUri, {
      mimeType: 'image/jpeg',
      dialogTitle: `${formatExplorationCalendarMonthLabel(
        explorationCalendarMonth
      )} ROOT 탐험 리포트`,
    });

    console.log('EXPLORATION MONTHLY REPORT SHARE COMPLETE', {
      month: explorationCalendarMonth,
      visitCount: explorationCalendarMonthSummary.visitCount,
      journalCount: explorationCalendarMonthSummary.journalCount,
      photoCount: explorationCalendarMonthSummary.photoCount,
    });
  } catch (error) {
    console.log('EXPLORATION MONTHLY REPORT SHARE ERROR', error);
    setNoticeModal({
      title: '월간 리포트 공유 실패',
      message: '탐험 리포트를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
    });
  } finally {
    setExplorationMonthlyReportSharing(false);
  }
};

const completedExplorationThemes =
  useMemo(() => {
    const themeIds =
      Array.isArray(
        explorationData
          ?.completedThemeIds
      )
        ? explorationData
            .completedThemeIds
        : [];

    return themeIds.map(
      (
        themeId: string
      ) => ({
        id:
          themeId,

        name:
          EXPLORATION_THEME_META[
            themeId
          ]?.name ??
          themeId,

        icon:
          EXPLORATION_THEME_META[
            themeId
          ]?.icon ??
          '🏅',
      })
    );
  }, [explorationData]);

const unlockedBuildingCollection =
  useMemo(() => {
    const buildingIds =
      Array.isArray(
        explorationData
          ?.unlockedBuildingIds
      )
        ? explorationData
            .unlockedBuildingIds
        : [];

    const uniqueIds: string[] =
      Array.from(
        new Set<string>(
          buildingIds.map(
            (
              value: unknown
            ) =>
              String(
                value ?? ''
              ).trim()
          )
        )
      ).filter(
        (value) =>
          value.length > 0
      );

    return uniqueIds.map(
      (
        buildingId: string
      ) => {
        const rewardEntry =
          Object.entries(
            EXPLORATION_REWARD_BY_PLACE
          ).find(
            ([, reward]) =>
              reward.buildingId ===
              buildingId
          );

        const placeId =
          rewardEntry?.[0] ??
          buildingId.replace(
            /^explore-/,
            ''
          );

        const placeMeta =
          EXPLORATION_PLACE_META[
            placeId
          ];

        return {
          id:
            buildingId,

          placeId,

          icon:
            EXPLORATION_COLLECTION_ICON_BY_PLACE[
              placeId
            ] ?? '🏠',

          title:
            placeMeta
              ?.rewardLabel ??
            `${placeMeta?.name ?? placeId} 건물`,

          subtitle:
            `${placeMeta?.district ?? '탐험'} · ` +
            `${placeMeta?.areaType ?? '건물 보상'}`,
        };
      }
    );
  }, [explorationData]);

const unlockedStampCollection =
  useMemo(() => {
    const stampIds =
      Array.isArray(
        explorationData
          ?.unlockedStampIds
      )
        ? explorationData
            .unlockedStampIds
        : [];

    const uniqueIds: string[] =
      Array.from(
        new Set<string>(
          stampIds.map(
            (
              value: unknown
            ) =>
              String(
                value ?? ''
              ).trim()
          )
        )
      ).filter(
        (value) =>
          value.length > 0
      );

    return uniqueIds.map(
      (
        stampId: string
      ) => {
        const rewardEntry =
          Object.entries(
            EXPLORATION_REWARD_BY_PLACE
          ).find(
            ([, reward]) =>
              reward.stampId ===
              stampId
          );

        const placeId =
          rewardEntry?.[0] ??
          stampId.replace(
            /^stamp-/,
            ''
          );

        const placeMeta =
          EXPLORATION_PLACE_META[
            placeId
          ];

        return {
          id:
            stampId,

          placeId,

          icon:
            EXPLORATION_COLLECTION_ICON_BY_PLACE[
              placeId
            ] ?? '📍',

          title:
            `${placeMeta?.name ?? placeId} 스탬프`,

          subtitle:
            `${placeMeta?.district ?? '탐험'} · ` +
            `${placeMeta?.areaType ?? '방문 인증'}`,
        };
      }
    );
  }, [explorationData]);

const explorationBadgeCollection =
  useMemo(() => {
    const explorationMainBadgeId =
      String(
        explorationData
          ?.mainBadgeId ?? ''
      ).trim();

    return completedExplorationThemes.map(
      (
        themeItem: any
      ) => ({
        id:
          themeItem.id,

        icon:
          themeItem.icon,

        title:
          themeItem.name,

        subtitle:
          '테마 탐험 완료',

        badgeType:
          '탐험 뱃지',

        isMain:
          explorationMainBadgeId ===
          themeItem.id,
      })
    );
  }, [
    completedExplorationThemes,
    explorationData,
  ]);

const growthBadgeCollection =
  useMemo(() => {
    const badgeMap =
      new Map<
        string,
        any
      >();

    earnedBadges.forEach(
      (
        earnedBadge: any
      ) => {
        const badgeId =
          String(
            earnedBadge
              ?.id ?? ''
          ).trim();

        if (!badgeId) {
          return;
        }

        const badgeDefinition =
          ROOT_BADGES.find(
            (
              item: any
            ) =>
              item?.id ===
              badgeId
          ) ??
          earnedBadge;

        badgeMap.set(
          badgeId,
          {
            id:
              badgeId,

            icon:
              badgeDefinition
                ?.icon ?? '🏅',

            title:
              badgeDefinition
                ?.title ??
              '성장 뱃지',

            subtitle:
              badgeDefinition
                ?.desc ??
              badgeDefinition
                ?.conditionText ??
              '성장 기록으로 획득',

            badgeType:
              '성장 뱃지',

            isMain:
              mainBadgeId ===
              badgeId,
          }
        );
      }
    );

    return Array.from(
      badgeMap.values()
    );
  }, [
    earnedBadges,
    mainBadgeId,
  ]);

const allBadgeCollection =
  useMemo(
    () => [
      ...explorationBadgeCollection,
      ...growthBadgeCollection,
    ],
    [
      explorationBadgeCollection,
      growthBadgeCollection,
    ]
  );

useEffect(() => {
  console.log(
    'RECORD COLLECTION READY',
    {
      buildingCount:
        unlockedBuildingCollection.length,

      stampCount:
        unlockedStampCollection.length,

      explorationBadgeCount:
        explorationBadgeCollection.length,

      growthBadgeCount:
        growthBadgeCollection.length,

      totalBadgeCount:
        allBadgeCollection.length,
    }
  );
}, [
  unlockedBuildingCollection.length,
  unlockedStampCollection.length,
  explorationBadgeCollection.length,
  growthBadgeCollection.length,
  allBadgeCollection.length,
]);

  const filteredLogs = useMemo(() => {
    if (selectedCategory === 'all') return logs;

    return logs.filter(
      (log) => log.category === selectedCategory
    );
  }, [logs, selectedCategory]);

const statDetailLogs = useMemo(() => {
  if (
    statDetailType ===
    'distance'
  ) {
    return filteredLogs.filter(
      (log: any) =>
        log.distance_km != null ||
        log.distanceKm != null
    );
  }

  return filteredLogs;
}, [
  filteredLogs,
  statDetailType,
]);


const getLogDateKey = (log: any) => {
  return String(
    log.date ??
      log.log_date ??
      log.createdAt ??
      ''
  ).slice(0, 10);
};

const getLogActionGoalId = (log: any) => {
  return String(
    log.action_goal_id ??
      log.actionGoalId ??
      ''
  );
};

const focusedActionGoal =
  [
    ...(data?.actionGoals ?? []),
    ...(data?.archivedActionGoals ?? []),
  ].find(
    (goal: any) =>
      String(goal.id) ===
      selectedActionGoalId
  ) ?? null;

const focusedActionGoalName =
  selectedActionGoalTitle ||
  focusedActionGoal?.title ||
  logs.find(
    (log: any) =>
      getLogActionGoalId(log) ===
      selectedActionGoalId
  )?.action_title ||
  '행동목표';

const focusedActionGoalCategory =
  selectedActionGoalCategory ||
  focusedActionGoal?.category ||
  logs.find(
    (log: any) =>
      getLogActionGoalId(log) ===
      selectedActionGoalId
  )?.category ||
  '';

const timelineLogs = useMemo(() => {
  const filtered = logs.filter((log: any) => {
    const dateKey = getLogDateKey(log);

    if (!dateKey) {
      return false;
    }

    if (selectedActionGoalId) {
      return (
        getLogActionGoalId(log) ===
        selectedActionGoalId
      );
    }

    if (!dateKey.startsWith(selectedGrowthMonth)) {
      return false;
    }

    if (
      selectedGrowthDate &&
      dateKey !== selectedGrowthDate
    ) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) =>
    getLogDateKey(b).localeCompare(
      getLogDateKey(a)
    )
  );
}, [
  logs,
  selectedGrowthMonth,
  selectedGrowthDate,
  selectedActionGoalId,
]);

const focusedActionGoalSummary = useMemo(() => {
  if (!selectedActionGoalId) {
    return null;
  }

  return timelineLogs.reduce(
    (summary, log) => {
      summary.count += 1;
      summary.minutes += Number(
        log.duration_minutes ??
          log.minutes ??
          0
      );
      summary.distance += Number(
        log.distance_km ??
          log.distanceKm ??
          0
      );
      summary.calories += Number(
        log.burned_calories ??
          log.calories ??
          log.burnedCalories ??
          0
      );

      return summary;
    },
    {
      count: 0,
      minutes: 0,
      distance: 0,
      calories: 0,
    }
  );
}, [
  selectedActionGoalId,
  timelineLogs,
]);

const currentRootUser =
  getRootOnboardingData() ??
  data ??
  {};

const currentUid =
  currentRootUser?.uid
    ? String(currentRootUser.uid)
    : '';

const currentGuestId =
  currentRootUser?.guestId
    ? String(currentRootUser.guestId)
    : '';

const currentNickname =
  String(
    currentRootUser?.nickname ??
      ''
  ).trim();


const explorationJournalDetailPlaceId =
  String(
    explorationJournalDetailRecord
      ?.placeId ??
      ''
  ).trim();

const explorationJournalDetailPlaceMeta =
  explorationJournalDetailPlaceId
    ? EXPLORATION_PLACE_META[
        explorationJournalDetailPlaceId
      ]
    : null;

const explorationJournalDetailReward =
  explorationJournalDetailPlaceId
    ? EXPLORATION_REWARD_BY_PLACE[
        explorationJournalDetailPlaceId
      ]
    : null;

const explorationJournalDetailMood =
  getExplorationJournalMood(
    explorationJournalDetailRecord
      ?.journalMood
  );

const explorationJournalDetailPhotoUrls =
  normalizeExplorationJournalPhotoUrls(
    explorationJournalDetailRecord
      ?.journalPhotoUrls
  );

const explorationJournalDetailMemo =
  String(
    explorationJournalDetailRecord
      ?.journalMemo ??
      ''
  ).trim();

const explorationJournalDetailHasJournal =
  explorationJournalDetailMemo.length >
    0 ||
  !!explorationJournalDetailMood ||
  explorationJournalDetailPhotoUrls
    .length >
    0;

const explorationJournalDetailPostId =
  currentUid &&
  explorationJournalDetailPlaceId
    ? `${currentUid}_exploration_journal_${explorationJournalDetailPlaceId}`
    : '';

const explorationJournalDetailPost =
  explorationJournalDetailPostId
    ? getRootCrewPosts().find(
        (post: any) =>
          String(
            post?.id ??
              ''
          ) ===
          explorationJournalDetailPostId
      ) ?? null
    : null;

const explorationJournalDetailFeedStatus =
  getExplorationJournalFeedStatus(
    explorationJournalDetailRecord,
    explorationJournalDetailPost
  );

const explorationJournalDetailFeedLabel =
  getExplorationJournalFeedStatusLabel(
    explorationJournalDetailFeedStatus
  );

/*
 * 게스트 계정에서 구글 계정으로 승계한 경우를 위해
 * 현재 UID와 이전 guestId를 모두 인정합니다.
 */
const currentIdentityIds =
  new Set<string>(
    [
      currentUid,
      currentGuestId,
      currentGuestId
        ? `guest:${currentGuestId}`
        : '',
    ].filter(Boolean)
  );

const myShareCrews =
  crews.filter((crew) => {
    const ownerId =
      String(
        crew?.ownerId ??
          ''
      );

    const memberIds = (
      crew?.memberIds ??
      []
    ).map(
      (memberId: any) =>
        String(memberId)
    );

    const isOwner =
      currentIdentityIds.has(
        ownerId
      );

    const isMember =
      memberIds.some(
        (memberId: string) =>
          currentIdentityIds.has(
            memberId
          )
      );

    /*
     * 이전 UID로 만들어진 크루의 복구용 조건입니다.
     * 닉네임 중복 방지를 사용하고 있으므로
     * 크루장 닉네임이 현재 닉네임과 같으면
     * 내가 만든 이전 크루로 인정합니다.
     */
    const isLegacyOwner =
      currentNickname.length > 0 &&
      String(
        crew?.ownerNickname ??
          ''
      ).trim() ===
        currentNickname;

    return (
      isOwner ||
      isMember ||
      isLegacyOwner
    );
  });

const shareLogCategory =
  normalizeCrewCategory(
    shareLog?.category
  );

const categoryMatchedShareCrews =
  shareLog
    ? myShareCrews.filter(
        (crew: any) =>
          normalizeCrewCategory(
            crew?.category
          ) ===
          shareLogCategory
      )
    : [];

console.log(
  'CREW SHARE IDENTITY CHECK',
  {
    currentUid:
      currentUid || null,

    currentGuestId:
      currentGuestId || null,

    currentNickname:
      currentNickname || null,

    loadedCrewCount:
      crews.length,

    myCrewCount:
      myShareCrews.length,

    crews:
      crews.map((crew) => ({
        id:
          crew?.id ?? null,

        title:
          crew?.title ?? null,

        category:
          crew?.category ??
          null,

        ownerId:
          crew?.ownerId ??
          null,

        ownerNickname:
          crew?.ownerNickname ??
          null,

        memberIds:
          crew?.memberIds ??
          [],
      })),
  }
);

const formatLogClockTime = (minutes: number) => {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getLogMinutes = (log: any) =>
  Number(log.duration_minutes ?? log.minutes ?? 0);

const getLogDistance = (log: any) =>
  log.distance_km != null || log.distanceKm != null
    ? Number(log.distance_km ?? log.distanceKm)
    : null;

const getLogCalories = (log: any) =>
  Number(
    log.burned_calories ??
      log.calories ??
      log.burnedCalories ??
      0
  );

/*
 * 사용자가 저장한 실제 기록 사진만 반환합니다.
 * GPS 경로 이미지는 여기에서 제외합니다.
 */
const getLogPhotoUri = (
  log: any
) =>
  log?.decorated_photo_url ??
  log?.decoratedPhotoUri ??
  log?.photo_url ??
  log?.photoUri ??
  log?.original_photo_url ??
  log?.originalPhotoUri ??
  null;

/*
 * GPS 경로 이미지만 반환합니다.
 */
const getLogRouteImageUri = (
  log: any
) =>
  log?.route_image_uri ??
  log?.routeImageUri ??
  null;

/*
 * 피드에 공유할 실제 기록 사진만 반환합니다.
 * GPS 지도 이미지는 피드에 포함하지 않습니다.
 */
const getLogFeedPhotoUri = (
  log: any
) =>
  getLogPhotoUri(log) ??
  log?.shared_photo_url ??
  log?.sharedPhotoUrl ??
  null;

/*
 * 외부공유에 사용할 이미지입니다.
 * 실제 사진이 없을 때만 GPS 이미지를 사용할 수 있습니다.
 */
const getLogShareImageUri = (
  log: any
) =>
  getLogFeedPhotoUri(log) ??
  getLogRouteImageUri(log) ??
  null;

  const getUploadImageContentType = (
  uri: string
) => {
  const cleanUri =
    String(uri)
      .split('?')[0]
      .toLowerCase();

  if (
    cleanUri.endsWith('.png')
  ) {
    return 'image/png';
  }

  if (
    cleanUri.endsWith('.webp')
  ) {
    return 'image/webp';
  }

  if (
    cleanUri.endsWith('.heic') ||
    cleanUri.endsWith('.heif')
  ) {
    return 'image/heic';
  }

  return 'image/jpeg';
};

const sanitizeStorageName = (
  value: any
) => {
  return String(
    value ?? 'unknown'
  ).replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );
};

const uploadFeedImageToStorage =
  async ({
    uri,
    uid,
    postId,
    folder,
  }: {
    uri:
      | string
      | null
      | undefined;

    uid: string;
    postId: string;

    folder:
      | 'shared-posts'
      | 'growth-cards';
  }): Promise<string | null> => {
    const sourceUri =
      String(
        uri ?? ''
      ).trim();

    if (!sourceUri) {
      return null;
    }

    /*
     * 이미 Firebase Storage 주소나
     * 인터넷 이미지 주소라면 다시 업로드하지 않습니다.
     */
    if (
      sourceUri.startsWith(
        'https://'
      ) ||
      sourceUri.startsWith(
        'http://'
      )
    ) {
      return sourceUri;
    }

    /*
     * file:// 주소는 Storage putFile에 전달할
     * 실제 로컬 파일 경로로 바꿉니다.
     *
     * content:// 주소는 그대로 전달합니다.
     */
    const localFilePath =
      sourceUri.startsWith(
        'file://'
      )
        ? decodeURI(
            sourceUri.slice(7)
          )
        : sourceUri;

    const safeUid =
      sanitizeStorageName(
        uid
      );

    const safePostId =
      sanitizeStorageName(
        postId
      );

 /*
 * 재공유할 때 같은 Storage 파일을 덮어쓰지 않고
 * 매번 새 경로에 올립니다.
 *
 * 이전 다운로드 토큰이 남는 문제를 방지합니다.
 */
const uploadVersion =
  Date.now();

const storagePath =
  `${folder}/` +
  `${safeUid}/` +
  `${safePostId}_` +
  `${uploadVersion}`;

    const imageReference =
      storageRef(
        getStorage(),
        storagePath
      );

    console.log(
      'FEED IMAGE UPLOAD START',
      {
        storagePath,
        sourceUri,
        localFilePath,
      }
    );

    const uploadTask =
      putFile(
        imageReference,
        localFilePath,
        {
          contentType:
            getUploadImageContentType(
              sourceUri
            ),
        }
      );

    await uploadTask;

    const downloadUrl =
      await getDownloadURL(
        imageReference
      );

    console.log(
      'FEED IMAGE UPLOAD SUCCESS',
      {
        storagePath,
        downloadUrl,
      }
    );

    return downloadUrl;
  };

const captureRouteMapImage = (
  coordinates: any[]
): Promise<string | null> => {
  const safeCoordinates =
    Array.isArray(coordinates)
      ? coordinates.filter(
          (point: any) =>
            Number.isFinite(
              Number(point?.latitude)
            ) &&
            Number.isFinite(
              Number(point?.longitude)
            )
        )
      : [];

  if (
    safeCoordinates.length < 2
  ) {
    return Promise.resolve(
      null
    );
  }

  return new Promise(
    (resolve) => {
      const resolveOnce = (
        uri: string | null
      ) => {
        if (
          routeSnapshotTimeoutRef.current
        ) {
          clearTimeout(
            routeSnapshotTimeoutRef.current
          );

          routeSnapshotTimeoutRef.current =
            null;
        }

        resolve(uri);
      };

      routeSnapshotResolveRef.current =
        resolveOnce;

      setRouteSnapshotMapLoaded(
        false
      );

      setRouteSnapshotCoordinates(
        safeCoordinates
      );

      setRouteSnapshotRequestKey(
        Date.now()
      );

      routeSnapshotTimeoutRef.current =
        setTimeout(() => {
          if (
            routeSnapshotResolveRef.current !==
            resolveOnce
          ) {
            return;
          }

          routeSnapshotResolveRef.current =
            null;

          setRouteSnapshotRequestKey(
            0
          );

          setRouteSnapshotCoordinates(
            []
          );

          setRouteSnapshotMapLoaded(
            false
          );

          console.log(
            'ROUTE SNAPSHOT TIMEOUT'
          );

          resolveOnce(null);
        }, 8000);
    }
  );
};

useEffect(() => {
  if (
    routeSnapshotRequestKey <= 0 ||
    !routeSnapshotMapLoaded ||
    routeSnapshotCoordinates.length < 2
  ) {
    return;
  }

  let cancelled = false;

  const finish = (
    uri: string | null
  ) => {
    if (cancelled) {
      return;
    }

    const resolve =
      routeSnapshotResolveRef.current;

    routeSnapshotResolveRef.current =
      null;

    setRouteSnapshotRequestKey(
      0
    );

    setRouteSnapshotCoordinates(
      []
    );

    setRouteSnapshotMapLoaded(
      false
    );

    resolve?.(uri);
  };

  const createSnapshot =
    async () => {
      try {
        await new Promise<void>(
          (resolve) =>
            setTimeout(
              resolve,
              350
            )
        );

        routeSnapshotMapRef.current
          ?.fitToCoordinates(
            routeSnapshotCoordinates,
            {
              edgePadding: {
                top: 65,
                right: 65,
                bottom: 65,
                left: 65,
              },
              animated: false,
            }
          );

        await new Promise<void>(
          (resolve) =>
            setTimeout(
              resolve,
              700
            )
        );

        const snapshotUri =
          await routeSnapshotMapRef.current
            ?.takeSnapshot({
              width: 900,
              height: 520,
              format: 'jpg',
              quality: 0.95,
              result: 'file',
            });

        if (!snapshotUri) {
          finish(null);
          return;
        }

        const normalizedSnapshotUri =
          String(snapshotUri)
            .startsWith(
              'file://'
            )
            ? String(
                snapshotUri
              )
            : `file://${String(
                snapshotUri
              )}`;

        const documentDirectory =
          FileSystem.documentDirectory;

        if (!documentDirectory) {
          finish(
            normalizedSnapshotUri
          );
          return;
        }

        const savedUri =
          `${documentDirectory}` +
          `route_share_${Date.now()}.jpg`;

        await FileSystem.copyAsync({
          from:
            normalizedSnapshotUri,
          to: savedUri,
        });

        console.log(
          'ROUTE SNAPSHOT SAVE SUCCESS',
          {
            coordinateCount:
              routeSnapshotCoordinates.length,
            savedUri,
          }
        );

        finish(savedUri);
      } catch (error) {
        console.log(
          'ROUTE SNAPSHOT SAVE ERROR',
          error
        );

        finish(null);
      }
    };

  void createSnapshot();

  return () => {
    cancelled = true;
  };
}, [
  routeSnapshotCoordinates,
  routeSnapshotMapLoaded,
  routeSnapshotRequestKey,
]);

const getStorageObjectPathFromUrl = (
  value: string
): string | null => {
  const storageUrl =
    String(
      value ?? ''
    ).trim();

  if (!storageUrl) {
    return null;
  }

  /*
   * gs://bucket/path 형식
   */
  if (
    storageUrl.startsWith(
      'gs://'
    )
  ) {
    const withoutScheme =
      storageUrl.slice(
        5
      );

    const firstSlashIndex =
      withoutScheme.indexOf(
        '/'
      );

    if (
      firstSlashIndex < 0
    ) {
      return null;
    }

    return withoutScheme.slice(
      firstSlashIndex + 1
    );
  }

  /*
   * Firebase 다운로드 URL 형식:
   * .../o/shared-posts%2FUID%2F파일명
   */
  try {
    const parsedUrl =
      new URL(
        storageUrl
      );

    const objectMarker =
      '/o/';

    const objectMarkerIndex =
      parsedUrl.pathname.indexOf(
        objectMarker
      );

    if (
      objectMarkerIndex < 0
    ) {
      return null;
    }

    const encodedPath =
      parsedUrl.pathname.slice(
        objectMarkerIndex +
        objectMarker.length
      );

    return decodeURIComponent(
      encodedPath
    );
  } catch {
    return null;
  }
};

const deleteFeedImageFromStorage =
  async (
    uri:
      | string
      | null
      | undefined
  ) => {
    const storageUrl =
      String(
        uri ?? ''
      ).trim();

    if (!storageUrl) {
      return;
    }

    const objectPath =
      getStorageObjectPathFromUrl(
        storageUrl
      );

    if (
      !objectPath
    ) {
      console.log(
        'FEED IMAGE DELETE SKIPPED: PATH NOT FOUND',
        {
          storageUrl,
        }
      );

      return;
    }

    /*
     * ROOT의 공유용 폴더만 삭제합니다.
     * 기록 원본 사진이나 다른 경로는 삭제하지 않습니다.
     */
    const isRootFeedImage =
      objectPath.startsWith(
        'shared-posts/'
      ) ||
      objectPath.startsWith(
        'growth-cards/'
      );

    if (
      !isRootFeedImage
    ) {
      console.log(
        'FEED IMAGE DELETE SKIPPED: INVALID PATH',
        {
          objectPath,
        }
      );

      return;
    }

    try {
      const imageReference =
        storageRef(
          getStorage(),
          objectPath
        );

      console.log(
        'FEED IMAGE DELETE START',
        {
          storageUrl,
          objectPath,
        }
      );

      await deleteObject(
        imageReference
      );

      console.log(
        'FEED IMAGE DELETE SUCCESS',
        {
          objectPath,
        }
      );
    } catch (
      error: any
    ) {
      if (
        error?.code ===
        'storage/object-not-found'
      ) {
        console.log(
          'FEED IMAGE ALREADY DELETED',
          {
            objectPath,
          }
        );

        return;
      }

      console.log(
        'FEED IMAGE DELETE ERROR',
        {
          objectPath,

          code:
            error?.code ??
            null,

          message:
            error?.message ??
            String(
              error
            ),
        }
      );

      throw error;
    }
  };


const getGrowthSelectionKey = (
  date: string,
  categoryId: string
) => {
  return (
    `${String(date)}_` +
    `${String(categoryId)}`
  );
};

/*
 * 같은 행동목표가 하루에 여러 번 기록된 경우
 * 선택 목록에는 행동목표를 한 번만 보여줍니다.
 */
const getGrowthGoalIdentity = (
  log: any
) => {
  const actionGoalId =
    getLogActionGoalId(log);

  if (actionGoalId) {
    return actionGoalId;
  }

  return String(
    log?.id ??
      log?.action_title ??
      log?.title ??
      ''
  );
};

const openGrowthGoalPicker = (
  date: string,
  categoryCard: any
) => {
  const selectableLogs =
    Array.isArray(
      categoryCard?.logs
    )
      ? categoryCard.logs
      : [];

  if (
    selectableLogs.length ===
    0
  ) {
    return;
  }

  setGrowthGoalPicker({
    date,
    categoryId:
      String(
        categoryCard.id
      ),
    categoryLabel:
      String(
        categoryCard.label ??
          '기록'
      ),
    logs: selectableLogs,
  });
};

const selectGrowthGoalLog =
  async (
    selectedLog: any
  ) => {
    if (!growthGoalPicker) {
      return;
    }

    const selectedGoalIdentity =
  getGrowthGoalIdentity(
    selectedLog
  );

if (!selectedGoalIdentity) {
  return;
}

    const selectionKey =
      getGrowthSelectionKey(
        growthGoalPicker.date,
        growthGoalPicker.categoryId
      );

    const nextSelections = {
  ...selectedGrowthLogIds,
  [selectionKey]:
    selectedGoalIdentity,
};

    /*
     * 먼저 화면에 적용합니다.
     */
    setSelectedGrowthLogIds(
      nextSelections
    );

    setGrowthGoalPicker(
      null
    );

    /*
     * 앱을 다시 실행해도 선택한 행동목표가
     * 유지되도록 rootData에 저장합니다.
     */
    try {
      const currentData =
        (
          await loadRootOnboardingData()
        ) ??
        getRootOnboardingData() ??
        data ??
        {};

      const nextData = {
        ...currentData,
        growthCardSelections:
          nextSelections,
      };

      await saveRootOnboardingData(
        nextData
      );

      setData(nextData);

      console.log(
        'GROWTH GOAL SELECTION SAVED',
        {
          date:
            growthGoalPicker.date,
          category:
            growthGoalPicker.categoryId,
          goalIdentity:
  selectedGoalIdentity,
          title:
            getLogTitle(
              selectedLog
            ),
        }
      );
    } catch (error) {
      console.log(
        'GROWTH GOAL SELECTION SAVE ERROR',
        error
      );
    }
  };


const getLogOriginalPhotoUri = (log: any) =>
  log.original_photo_url ??
  log.originalPhotoUri ??
  log.originalPhotoUrl ??
  getLogPhotoUri(log);

const getLogDecorateStickers = (log: any) => {
  if (Array.isArray(log.decorate_stickers)) {
    return log.decorate_stickers;
  }

  if (Array.isArray(log.decorateStickers)) {
    return log.decorateStickers;
  }

  return null;
};

const normalizeDecorateStickers = (
  stickers: DecorateSticker[]
): DecorateSticker[] => {
  return stickers.map((sticker) => ({
    ...sticker,
    scale: sticker.scale ?? 1,
  }));
};

  const growthCategoryIds = [
  'study',
  'exercise',
  'mental',
  'daily',
];

const formatGrowthMinutes = (minutes: number) => {
  if (minutes <= 0) return '0분';

  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);

  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;

  return `${m}분`;
};

const archivedActionGoalItems = useMemo(() => {
  const archivedGoals =
    Array.isArray(
      data?.archivedActionGoals
    )
      ? data.archivedActionGoals
      : [];

  return archivedGoals
    .filter((goal: any) => {
      if (selectedCategory === 'all') {
        return true;
      }

      return (
        goal.category ===
        selectedCategory
      );
    })
    .map((goal: any) => {
      const goalLogs = logs.filter(
        (log: any) =>
          getLogActionGoalId(log) ===
          String(goal.id)
      );

      const totalMinutes =
        goalLogs.reduce(
          (sum: number, log: any) =>
            sum + getLogMinutes(log),
          0
        );

      const totalDistance =
        goalLogs.reduce(
          (sum: number, log: any) =>
            sum +
            (getLogDistance(log) ?? 0),
          0
        );

      const totalCalories =
        goalLogs.reduce(
          (sum: number, log: any) =>
            sum + getLogCalories(log),
          0
        );

      const statusLabel =
        goal.endStatus === 'completed'
          ? '완료'
          : goal.endStatus === 'expired'
          ? '기간 종료'
          : '중단';

      return {
        ...goal,
        recordCount: goalLogs.length,
        totalMinutes,
        totalDistance,
        totalCalories,
        statusLabel,
      };
    })
    .sort((a: any, b: any) => {
      const aDate = String(
        a.endedAt ??
          a.archivedAt ??
          ''
      );

      const bDate = String(
        b.endedAt ??
          b.archivedAt ??
          ''
      );

      return bDate.localeCompare(aDate);
    });
}, [
  data,
  logs,
  selectedCategory,
]);


const growthCalendarDays = useMemo(() => {
  const [year, month] = selectedGrowthMonth
    .split('-')
    .map(Number);

  const firstDate = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0);

  const firstDay = firstDate.getDay();
  const days: (string | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= lastDate.getDate(); day++) {
    days.push(
      `${selectedGrowthMonth}-${String(day).padStart(2, '0')}`
    );
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}, [selectedGrowthMonth]);

const growthDateSet = useMemo(() => {
  const set = new Set<string>();

  logs.forEach((log: any) => {
    const dateKey = String(
      log.date ??
        log.log_date ??
        log.createdAt ??
        ''
    ).slice(0, 10);

    if (dateKey) {
      set.add(dateKey);
    }
  });

  return set;
}, [logs]);

const growthDays = useMemo(() => {
  const grouped: Record<string, any[]> = {};

  logs.forEach((log: any) => {
    const dateKey = String(
      log.date ??
        log.log_date ??
        log.createdAt ??
        ''
    ).slice(0, 10);

    if (!dateKey) return;

    if (!dateKey.startsWith(selectedGrowthMonth)) return;

if (selectedGrowthDate && dateKey !== selectedGrowthDate) {
  return;
}

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(log);
  });

  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayLogs]) => {
      const totalMinutes = dayLogs.reduce(
        (sum, log) => sum + getLogMinutes(log),
        0
      );

      const totalDistance = dayLogs.reduce((sum, log) => {
        const distance = getLogDistance(log);
        return sum + (distance ?? 0);
      }, 0);

      const totalCalories = dayLogs.reduce(
        (sum, log) => sum + getLogCalories(log),
        0
      );

      const categoryCards = growthCategoryIds.map((categoryId) => {
        const categoryLogs = dayLogs.filter(
          (log: any) => log.category === categoryId
        );

        const category = categories.find(
          (item) => item.id === categoryId
        );

        const minutes = categoryLogs.reduce(
          (sum, log) => sum + getLogMinutes(log),
          0
        );

        const distance = categoryLogs.reduce((sum, log) => {
          const d = getLogDistance(log);
          return sum + (d ?? 0);
        }, 0);

        const calories = categoryLogs.reduce(
          (sum, log) => sum + getLogCalories(log),
          0
        );

        /*
 * 같은 행동목표가 하루에 여러 번 기록되었더라도
 * 선택 목록에는 한 번만 표시합니다.
 */
const selectableLogs =
  categoryLogs.filter(
    (
      log: any,
      index: number,
      array: any[]
    ) => {
      const identity =
        getGrowthGoalIdentity(
          log
        );

      return (
        array.findIndex(
          (candidate) =>
            getGrowthGoalIdentity(
              candidate
            ) === identity
        ) === index
      );
    }
  );

const selectionKey =
  getGrowthSelectionKey(
    date,
    categoryId
  );

const savedSelectedGoalIdentity =
  selectedGrowthLogIds[
    selectionKey
  ];

/*
 * 우선순위:
 * 1. 사용자가 직접 고른 행동목표
 * 2. 사진이 있는 행동목표
 * 3. 첫 번째 행동목표
 */
const selectedLog =
  selectableLogs.find(
    (log: any) =>
      getGrowthGoalIdentity(
        log
      ) ===
      String(
        savedSelectedGoalIdentity ??
          ''
      )
  ) ??
  selectableLogs.find(
    (log: any) =>
      !!getLogPhotoUri(log)
  ) ??
  selectableLogs[0] ??
  null;

const selectedPhotoUri =
  selectedLog
    ? getLogPhotoUri(
        selectedLog
      )
    : null;

return {
  id: categoryId,

  icon:
    category?.icon ??
    '✨',

  label:
    category?.label ??
    '기록',

  /*
   * 모달에는 중복을 정리한 행동목표 목록을 전달합니다.
   */
  logs:
    selectableLogs,

  count:
    selectableLogs.length,

  minutes,
  distance,
  calories,

  selectedLog,

  photoUri:
    selectedPhotoUri,

  /*
   * 기존 코드와의 호환성을 위해
   * photoLog에도 선택된 기록을 넣습니다.
   */
  photoLog:
    selectedLog,

  title:
    selectedLog
      ?.action_title ??
    selectedLog
      ?.title ??
    '',
};
      });

      const completedCategoryCount = categoryCards.filter(
        (item) => item.count > 0
      ).length;

      const growthRate = Math.round(
        (completedCategoryCount / growthCategoryIds.length) * 100
      );

      return {
        date,
        logs: dayLogs,
        totalMinutes,
        totalDistance,
        totalCalories,
        categoryCards,
        completedCategoryCount,
        growthRate,
      };
    });
}, [logs, selectedGrowthMonth, selectedGrowthDate, selectedGrowthLogIds,]);

const getLogTitle = (log: any) =>
  log.action_title ?? log.title ?? '행동목표';

const formatPace = (distanceKm: number, minutes: number) => {
  if (!distanceKm || !minutes) return '-';

  const pace = minutes / distanceKm;
  const paceMin = Math.floor(pace);
  const paceSec = Math.round((pace - paceMin) * 60);

  return `${paceMin}'${String(paceSec).padStart(2, '0')}"`;
};

const makeDecorateStickersForLog = (log: any) => {
  const icon =
    categories.find((c) => c.id === log.category)?.icon ?? '✨';

  const minutes = getLogMinutes(log);
  const distanceKm = getLogDistance(log);
  const calories = getLogCalories(log);

  const routeCoordinates =
    log.route_coordinates ??
    log.routeCoordinates ??
    [];

  const base: DecorateSticker[] = [
    {
      id: `date_${Date.now()}`,
      type: 'date',
      text: String(log.date ?? '').replace(/-/g, '.'),
      x: 28,
      y: 70,
      size: 'small',
    },
    {
      id: `title_${Date.now()}`,
      type: 'title',
      text: getLogTitle(log),
      x: 28,
      y: 115,
      size: 'medium',
    },
    {
      id: `time_${Date.now()}`,
      type: 'time',
      text: formatLogClockTime(minutes),
      x: 28,
      y: 170,
      size: 'large',
    },
    {
      id: `root_${Date.now()}`,
      type: 'root',
      text: 'ROOT',
      x: 28,
      y: 285,
      size: 'small',
    },
  ];

  if (distanceKm !== null) {
    base.push({
      id: `distance_${Date.now()}`,
      type: 'distance',
      text: `${distanceKm.toFixed(2)} km`,
      x: 28,
      y: 245,
      size: 'medium',
    });

    base.push({
      id: `pace_${Date.now()}`,
      type: 'pace',
      text: `Pace ${formatPace(distanceKm, minutes)}`,
      x: 28,
      y: 335,
      size: 'medium',
    });
  }

  if (calories > 0) {
    base.push({
      id: `calorie_${Date.now()}`,
      type: 'calorie',
      text: `${calories} kcal`,
      x: 28,
      y: 385,
      size: 'medium',
    });
  }

  if (routeCoordinates.length >= 2) {
    base.push({
      id: `route_${Date.now()}`,
      type: 'route',
      text: '',
      x: 110,
      y: 430,
      route: true,
      points: makeRouteStickerPoints(routeCoordinates),
    });
  }

  return base;
};

const openDecorateForLog = (
  log: any,
  photoUriOverride?: string | null,
  keepSavedStickers = true
) => {
  if (!log) {
    setNoticeModal({
      title: '꾸미기 불가',
      message: '꾸밀 수 있는 기록 사진이 없어요.',
    });
    return;
  }

  const originalPhotoUri =
    photoUriOverride ??
    getLogOriginalPhotoUri(log);

  if (!originalPhotoUri) {
    setNoticeModal({
      title: '꾸미기 불가',
      message: '원본 사진을 찾을 수 없어요.',
    });
    return;
  }

  const savedStickers = getLogDecorateStickers(log);

  setDecorateLog(log);

  // 중요: 최종 꾸민 이미지가 아니라 원본 사진 위에 스티커를 다시 올림
  setDecorateImageUri(String(originalPhotoUri));

  setDecorateStickers(
    keepSavedStickers && savedStickers && savedStickers.length > 0
      ? normalizeDecorateStickers(savedStickers)
      : makeDecorateStickersForLog(log)
  );

  setSelectedImageUri(null);
  setSelectedImageLog(null);
};

const openDecorateFromImageModal = () => {
  if (!selectedImageLog) {
    setNoticeModal({
      title: '꾸미기 불가',
      message: '꾸밀 수 있는 기록 사진이 없어요.',
    });
    return;
  }

  openDecorateForLog(selectedImageLog);
};

const moveDecorateSticker = (
  id: string,
  x: number,
  y: number,
  scale?: number
) => {
  setDecorateStickers((prev) =>
    prev.map((item) =>
      item.id === id
        ? {
            ...item,
            x,
            y,
            scale: scale ?? item.scale ?? 1,
          }
        : item
    )
  );
};

const removeDecorateSticker = (id: string) => {
  setDecorateStickers((prev) =>
    prev.filter((item) => item.id !== id)
  );
};

const closeCustomStickerModal = () => {
  setShowCustomStickerModal(false);
  setCustomStickerText('');
};

const addCustomTextSticker = () => {
  const cleanText = customStickerText.trim();

  if (!cleanText) {
    return;
  }

  const createdAt = Date.now();

  setDecorateStickers((prev) => [
    ...prev,
    {
      id: `customText_${createdAt}_${Math.random()}`,
      type: 'customText',
      text: cleanText,
      x: 52,
      y: 260,
      scale: 1,
      size: 'medium',
    },
  ]);

  closeCustomStickerModal();
};

const saveDecoratedLogPhoto = async () => {
  if (!decorateCaptureRef.current || !decorateLog) return;

  try {
    setIsDecorateSaving(true);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    const tempUri = await captureRef(
      decorateCaptureRef.current,
      {
        format: 'jpg',
        quality: 0.95,
        result: 'tmpfile',
      }
    );

    const savedUri =
      `${FileSystem.documentDirectory}record_decorated_${Date.now()}.jpg`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: savedUri,
    });

    const currentData =
  (await loadRootOnboardingData()) ??
  getRootOnboardingData() ??
  data ??
  {};
    const currentLogs = currentData?.actionLogs ?? logs;

  const stickerData =
  normalizeDecorateStickers(decorateStickers);

const updatedLogs = currentLogs.map((item: any) => {
  if (String(item.id) !== String(decorateLog.id)) {
    return item;
  }

 const originalPhotoUri =
  decorateImageUri ??
  item.original_photo_url ??
  item.originalPhotoUri ??
  getLogPhotoUri(item);

  return {
    ...item,

    // 원본 사진 보관
    original_photo_url: originalPhotoUri,
    originalPhotoUri,

    // 최종 꾸민 이미지
    photo_url: savedUri,
    photoUri: savedUri,
    decorated_photo_url: savedUri,
    decoratedPhotoUri: savedUri,

    // 다시 꾸미기용 스티커 데이터
    decorate_stickers: stickerData,
    decorateStickers: stickerData,
    decorate_updated_at: new Date().toISOString(),
  };
});

    const nextData = {
      ...currentData,
      actionLogs: updatedLogs,
    };

    await saveRootOnboardingData(nextData);
    setData(nextData);
    setLogs(updatedLogs);

    setDecorateLog(null);
    setDecorateImageUri(null);
    setDecorateStickers([]);
    setShowCustomStickerModal(false);
    setCustomStickerText('');

    setNoticeModal({
      title: '꾸미기 완료',
      message: '꾸민 사진이 기록에 저장되었어요.',
    });
  } catch (e) {
    console.log('RECORD DECORATE SAVE ERROR', e);

    setNoticeModal({
      title: '꾸미기 저장 실패',
      message: '사진을 저장하지 못했어요. 다시 시도해주세요.',
    });
  } finally {
    setIsDecorateSaving(false);
  }
};

const shareGrowthCardToPublicFeed = async (
  day: any
) => {
  const target =
    growthCardRefs.current[
      day.date
    ];

  const currentUserData =
    getRootOnboardingData() ??
    data;

  if (!currentUserData?.uid) {
    setNoticeModal({
      title: '로그인 필요',
      message:
        '오늘의 성장 공유는 구글 로그인 후 사용할 수 있어요.',
    });

    return;
  }

  if (!target) {
    setNoticeModal({
      title: '공유 실패',
      message:
        '오늘의 성장 카드를 찾지 못했어요.',
    });

    return;
  }

  try {
    setSavingGrowthDate(
      day.date
    );

    /*
     * 로딩 글자가 카드 캡처에 포함되지 않도록
     * 화면 렌더링을 잠시 기다립니다.
     */
    await new Promise<void>(
      (resolve) => {
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              () => resolve()
            );
          }
        );
      }
    );

    const tempUri =
      await captureRef(
        target,
        {
          format: 'jpg',
          quality: 0.95,
          result: 'tmpfile',
        }
      );

    const safeDate =
      String(day.date)
        .replace(
          /-/g,
          ''
        );

    const savedUri =
      `${FileSystem.documentDirectory}` +
      `growth_public_${safeDate}_${Date.now()}.jpg`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: savedUri,
    });

    /*
     * 같은 날짜의 오늘 성장 카드는
     * 다시 공유해도 새 게시물이 계속 생기지 않고
     * 기존 게시물이 수정되도록 고정 ID를 사용합니다.
     */
    const postId =
      `${currentUserData.uid}` +
      `_growth_${day.date}`;

/*
 * 캡처한 오늘의 성장 이미지를
 * Firebase Storage에 업로드합니다.
 */
const uploadedGrowthPhotoUrl =
  await uploadFeedImageToStorage({
    uri:
      savedUri,

    uid:
      String(
        currentUserData.uid
      ),

    postId,

    folder:
      'growth-cards',
  });

console.log(
  'GROWTH IMAGE UPLOAD RESULT',
  {
    date:
      day.date,

    savedUri,

    uploadedGrowthPhotoUrl:
      uploadedGrowthPhotoUrl ??
      null,
  }
);

    const totalMinutes =
      Number(
        day.totalMinutes ??
        0
      );

    const totalDistance =
      Number(
        day.totalDistance ??
        0
      );

    const summaryText =
      `${formatGrowthMinutes(
        totalMinutes
      )}` +
      (
        totalDistance > 0
          ? ` · ${totalDistance.toFixed(
              2
            )}km`
          : ''
      );

    console.log(
  'GROWTH PUBLIC SHARE START',
  {
    postId,
    date:
      day.date,

    photoUri:
      uploadedGrowthPhotoUrl ??
      null,
  }
);

    await addRootCrewPost({
      id: postId,

      sourceLogId:
        `growth_${day.date}`,

      userId:
        currentUserData.uid,

      nickname:
        currentUserData
          ?.nickname ??
        '루트유저',

      profileEmoji:
        currentUserData
          ?.profileEmoji ??
        '🦊',

      level:
        currentUserData
          ?.level ??
        1,

      placedBuildings:
        currentUserData
          ?.placedBuildings ??
        [],

      /*
       * 오늘의 성장은 무조건 전체공개입니다.
       * 크루 ID는 저장하지 않습니다.
       */
      target: 'public',
      crewId: null,
      sharedCrewId: null,

      /*
       * 네 가지 카테고리가 합쳐진 카드이므로
       * 특정 카테고리가 아닌 전체에만 표시합니다.
       */
      category: 'all',

      title: '오늘의 성장',
      date: day.date,

      minutes:
        totalMinutes,

      distanceKm:
        totalDistance > 0
          ? totalDistance
          : undefined,

      photoUri:
  uploadedGrowthPhotoUrl ??
  undefined,

      routeCoordinates: [],

      memo: '',
      shareMemo:
        summaryText,

      tags: [],
      cheers: 0,

      createdAt:
        new Date()
          .toISOString(),

      updatedAt:
        new Date()
          .toISOString(),
    });

    console.log(
      'GROWTH PUBLIC SHARE SUCCESS',
      {
        postId,
        date: day.date,
      }
    );

    setNoticeModal({
      title:
        '전체공유 완료',
      message:
        '오늘의 성장 카드가 전체 피드에 올라갔어요.',
    });
  } catch (error: any) {
    console.log(
      'GROWTH PUBLIC SHARE ERROR',
      {
        code:
          error?.code ??
          null,
        message:
          error?.message ??
          String(error),
      }
    );

    setNoticeModal({
      title: '공유 실패',
      message:
        '오늘의 성장 카드를 전체 피드에 올리지 못했어요.',
    });
  } finally {
    setSavingGrowthDate(
      null
    );
  }
};

const shareGrowthCardExternal = async (
  day: any
) => {
  const target =
    growthCardRefs.current[
      day.date
    ];

  if (!target) {
    setNoticeModal({
      title: '외부공유 실패',
      message:
        '오늘의 성장 카드를 찾지 못했어요.',
    });

    return;
  }

  try {
    setExternalSharingGrowthDate(
      day.date
    );

    /*
     * 버튼 상태 변경이 끝난 뒤
     * 오늘의 성장 카드만 캡처합니다.
     */
    await new Promise<void>(
      (resolve) => {
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              () => resolve()
            );
          }
        );
      }
    );

    const tempUri =
      await captureRef(
        target,
        {
          format: 'jpg',
          quality: 0.95,
          result: 'tmpfile',
        }
      );

    const documentDirectory =
      FileSystem.documentDirectory;

    if (!documentDirectory) {
      throw new Error(
        'DOCUMENT_DIRECTORY_NOT_AVAILABLE'
      );
    }

    const safeDate =
      String(day.date).replace(
        /-/g,
        ''
      );

    const savedUri =
      `${documentDirectory}` +
      `growth_external_${safeDate}_${Date.now()}.jpg`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: savedUri,
    });

    const available =
      await Sharing.isAvailableAsync();

    if (!available) {
      setNoticeModal({
        title: '외부공유 불가',
        message:
          '이 기기에서는 외부공유 기능을 사용할 수 없어요.',
      });

      return;
    }

    console.log(
      'GROWTH EXTERNAL SHARE START',
      {
        date: day.date,
        photoUri: savedUri,
      }
    );

    await Sharing.shareAsync(
      savedUri,
      {
        mimeType:
          'image/jpeg',

        dialogTitle:
          '오늘의 성장 외부공유',

        UTI:
          'public.jpeg',
      }
    );

    console.log(
      'GROWTH EXTERNAL SHARE COMPLETE',
      {
        date: day.date,
      }
    );
  } catch (error: any) {
    console.log(
      'GROWTH EXTERNAL SHARE ERROR',
      {
        code:
          error?.code ??
          null,

        message:
          error?.message ??
          String(error),
      }
    );

    setNoticeModal({
      title: '외부공유 실패',
      message:
        '오늘의 성장 카드를 외부 앱으로 공유하지 못했어요.',
    });
  } finally {
    setExternalSharingGrowthDate(
      null
    );
  }
};

const shareLogExternal = async (log: any) => {
  try {
    const photoUri =
  getLogShareImageUri(
    log
  );

    const title = getLogTitle(log);
    const minutes = getLogMinutes(log);
    const distanceKm = getLogDistance(log);
    const calories = getLogCalories(log);

    const message =
      `ROOT 기록\n` +
      `${title}\n` +
      `${String(log.date ?? '').replace(/-/g, '.')}\n` +
      `시간: ${formatLogClockTime(minutes)}` +
      `${distanceKm !== null ? `\n거리: ${distanceKm.toFixed(2)}km` : ''}` +
      `${calories > 0 ? `\n칼로리: ${calories}kcal` : ''}`;

    if (photoUri) {
      const available = await Sharing.isAvailableAsync();

      if (available) {
        await Sharing.shareAsync(String(photoUri), {
          mimeType: 'image/jpeg',
          dialogTitle: 'ROOT 기록 공유',
          UTI: 'public.jpeg',
        });

        return;
      }
    }

    await Share.share({
      message,
    });
  } catch (e) {
    console.log('EXTERNAL SHARE ERROR', e);

    setNoticeModal({
      title: '외부 공유 실패',
      message:
        '기록을 외부 앱으로 공유하지 못했어요. 다시 시도해주세요.',
    });
  }
};



const openExplorationJournalFeedUnshare =
  (record: any) => {
    if (
      explorationJournalFeedUnsharing
    ) {
      return;
    }

    setExplorationJournalUnshareRecord(
      record
    );
  };

const closeExplorationJournalFeedUnshare =
  () => {
    if (
      explorationJournalFeedUnsharing
    ) {
      return;
    }

    setExplorationJournalUnshareRecord(
      null
    );
  };

/*
 * 여행기 피드 게시물을 내리고 탐험 데이터의 공유 상태도 함께 초기화합니다.
 * 게시물이 이미 없더라도 공유 상태는 서버에서 확정 초기화합니다.
 */
const handleUnshareExplorationJournalFeed =
  async () => {
    const record =
      explorationJournalUnshareRecord;

    if (
      !record ||
      explorationJournalFeedUnsharing
    ) {
      return;
    }

    const placeId =
      String(
        record?.placeId ??
        ''
      ).trim();

    const currentUserData =
      getRootOnboardingData() ??
      data ??
      {};

    const uid =
      String(
        currentUserData?.uid ??
        ''
      ).trim();

    if (!placeId || !uid) {
      setNoticeModal({
        title: '피드 내리기 실패',
        message:
          '여행기 또는 로그인 정보를 확인하지 못했어요.',
      });

      return;
    }

    const postId =
      String(
        record
          ?.journalFeedPostId ??
        `${uid}_exploration_journal_${placeId}`
      ).trim();

    setExplorationJournalFeedUnsharing(
      true
    );

    let storageCleanupFailed =
      false;

    let statusServerConfirmed =
      false;

    try {
      let latestPosts: any[] =
        [];

      try {
        const loadedPosts =
          await loadRootCrewPosts();

        latestPosts =
          Array.isArray(loadedPosts)
            ? loadedPosts
            : [];
      } catch (loadError) {
        console.log(
          'EXPLORATION JOURNAL UNSHARE POST LOAD FALLBACK',
          loadError
        );

        const memoryPosts =
          getRootCrewPosts();

        latestPosts =
          Array.isArray(memoryPosts)
            ? memoryPosts
            : [];
      }

      const existingPost =
        latestPosts.find(
          (post: any) =>
            String(
              post?.id ??
              ''
            ) ===
            postId
        ) ??
        null;

      const cardUrl =
        String(
          existingPost
            ?.photoUri ??
          existingPost
            ?.photo_url ??
          existingPost
            ?.sharedPhotoUrl ??
          ''
        ).trim();

      const cardObjectPath =
        getStorageObjectPathFromUrl(
          cardUrl
        );

      const safePlaceId =
        sanitizeStorageName(
          placeId
        );

      const expectedCardPrefix =
        `shared-posts/${uid}/` +
        `${uid}_exploration_journal_${safePlaceId}_card_`;

      const canDeleteCard =
        Boolean(
          cardObjectPath &&
          cardObjectPath.startsWith(
            expectedCardPrefix
          )
        );

      console.log(
        'EXPLORATION JOURNAL FEED UNSHARE START',
        {
          placeId,
          postId,
          hasPost:
            !!existingPost,
          hasCardUrl:
            !!cardUrl,
          canDeleteCard,
          cardObjectPath:
            cardObjectPath ??
            null,
        }
      );

      /*
       * 실제 게시물이 있을 때만 삭제합니다.
       * 이미 삭제된 게시물이면 상태 복구만 계속 진행합니다.
       */
      if (existingPost) {
        await removeRootCrewPost(
          postId
        );

        console.log(
          'EXPLORATION JOURNAL FEED POST REMOVE DONE',
          {
            placeId,
            postId,
          }
        );
      } else {
        console.log(
          'EXPLORATION JOURNAL FEED POST ALREADY MISSING',
          {
            placeId,
            postId,
          }
        );
      }

      /*
       * 여행기 공유 카드 경로가 정확히 일치할 때만 Storage에서 삭제합니다.
       * 여행기 원본 사진은 다른 파일명이므로 삭제되지 않습니다.
       */
      if (
        cardUrl &&
        canDeleteCard
      ) {
        try {
          await deleteFeedImageFromStorage(
            cardUrl
          );
        } catch (storageError) {
          storageCleanupFailed =
            true;

          console.log(
            'EXPLORATION JOURNAL FEED UNSHARE CARD CLEANUP ERROR',
            storageError
          );
        }
      }

      try {
        const clearedData =
          await clearExplorationJournalFeedShared({
            placeId,
          });

        setExplorationData(
          clearedData
        );

        statusServerConfirmed =
          true;
      } catch (statusError: any) {
        const localData =
          statusError
            ?.localData;

        if (localData) {
          setExplorationData(
            localData
          );
        }

        console.log(
          'EXPLORATION JOURNAL FEED UNSHARE STATUS ERROR',
          {
            placeId,
            postId,
            code:
              statusError?.code ??
              null,
            message:
              statusError?.message ??
              String(
                statusError
              ),
          }
        );
      }

      console.log(
        'EXPLORATION JOURNAL FEED UNSHARE COMPLETE',
        {
          placeId,
          postId,
          storageCleanupFailed,
          statusServerConfirmed,
        }
      );

      setExplorationJournalUnshareRecord(
        null
      );

      setExplorationJournalShareRecord(
        null
      );

      setNoticeModal({
        title: '피드 내리기 완료',
        message:
          !statusServerConfirmed
            ? '피드 게시물은 내렸지만 여행기 공유 상태의 서버 확인이 완료되지 않았어요. 잠시 후 다시 확인해 주세요.'
            : storageCleanupFailed
            ? '피드 게시물과 공유 상태는 정리했지만 이전 카드 이미지 정리는 완료되지 않았어요.'
            : '피드 게시물과 공유 카드 이미지를 삭제하고 여행기 공유 상태도 초기화했어요.',
      });
    } catch (error: any) {
      console.log(
        'EXPLORATION JOURNAL FEED UNSHARE ERROR',
        {
          placeId,
          postId,
          code:
            error?.code ??
            null,
          message:
            error?.message ??
            String(error),
        }
      );

      setNoticeModal({
        title: '피드 내리기 실패',
        message:
          '여행기 피드를 내리지 못했어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      });
    } finally {
      setExplorationJournalFeedUnsharing(
        false
      );
    }
  };

const openExplorationJournalShare = (
  record: any
) => {
  const memo =
    String(
      record?.journalMemo ?? ''
    ).trim();

  const mood =
    getExplorationJournalMood(
      record?.journalMood
    );

  const photoUrls =
    normalizeExplorationJournalPhotoUrls(
      record?.journalPhotoUrls
    );

  if (
    !memo &&
    !mood &&
    photoUrls.length === 0
  ) {
    setNoticeModal({
      title: '공유할 여행기가 없어요',
      message:
        '기분, 사진 또는 여행기 내용을 먼저 저장해 주세요.',
    });

    return;
  }

  setExplorationJournalShareRecord(
    record
  );
};

const closeExplorationJournalShare = () => {
  if (
    explorationJournalShareBusy
  ) {
    return;
  }

  setExplorationJournalShareRecord(
    null
  );
};

const captureExplorationJournalShareCard =
  async (
    record: any
  ) => {
    const target =
      explorationJournalShareCaptureRef.current;

    if (!target) {
      throw new Error(
        'EXPLORATION_JOURNAL_SHARE_CARD_NOT_FOUND'
      );
    }

    const photoUrls =
      normalizeExplorationJournalPhotoUrls(
        record?.journalPhotoUrls
      );

    /*
     * 원격 사진을 미리 캐시에 내려받은 뒤
     * 카드가 다시 그려질 시간을 줍니다.
     */
    await Promise.all(
      photoUrls.map(
        (photoUrl) =>
          Image.prefetch(
            photoUrl
          ).catch(
            () => false
          )
      )
    );

    await new Promise<void>(
      (resolve) => {
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              () => resolve()
            );
          }
        );
      }
    );

    await new Promise<void>(
      (resolve) =>
        setTimeout(
          resolve,
          300
        )
    );

    const tempUri =
      await captureRef(
        target,
        {
          format: 'jpg',
          quality: 0.95,
          result: 'tmpfile',
        }
      );

    const documentDirectory =
      FileSystem.documentDirectory;

    if (!documentDirectory) {
      return tempUri;
    }

    const placeId =
      sanitizeStorageName(
        record?.placeId ??
        'exploration'
      );

    const savedUri =
      `${documentDirectory}` +
      `exploration_journal_share_${placeId}_${Date.now()}.jpg`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: savedUri,
    });

    return savedUri;
  };

const shareExplorationJournalExternal =
  async () => {
    const record =
      explorationJournalShareRecord;

    if (
      !record ||
      explorationJournalShareBusy
    ) {
      return;
    }

    try {
      setExplorationJournalExternalSharing(
        true
      );

      const savedUri =
        await captureExplorationJournalShareCard(
          record
        );

      const available =
        await Sharing.isAvailableAsync();

      if (!available) {
        setNoticeModal({
          title: '외부공유 불가',
          message:
            '이 기기에서는 외부공유 기능을 사용할 수 없어요.',
        });

        return;
      }

      const placeId =
        String(
          record?.placeId ?? ''
        ).trim();

      const placeName =
        EXPLORATION_PLACE_META[
          placeId
        ]?.name ??
        '탐험 여행기';

      console.log(
        'EXPLORATION JOURNAL EXTERNAL SHARE START',
        {
          placeId,
          savedUri,
        }
      );

      await Sharing.shareAsync(
        savedUri,
        {
          mimeType:
            'image/jpeg',

          dialogTitle:
            `${placeName} 여행기 공유`,

          UTI:
            'public.jpeg',
        }
      );

      console.log(
        'EXPLORATION JOURNAL EXTERNAL SHARE COMPLETE',
        {
          placeId,
        }
      );
    } catch (
      error: any
    ) {
      console.log(
        'EXPLORATION JOURNAL EXTERNAL SHARE ERROR',
        {
          code:
            error?.code ??
            null,

          message:
            error?.message ??
            String(error),
        }
      );

      setNoticeModal({
        title: '외부공유 실패',
        message:
          '여행기 카드를 외부 앱으로 공유하지 못했어요.',
      });
    } finally {
      setExplorationJournalExternalSharing(
        false
      );
    }
  };

const shareExplorationJournalToFeed =
  async () => {
    const record =
      explorationJournalShareRecord;

    if (
      !record ||
      explorationJournalShareBusy
    ) {
      return;
    }

    const currentUserData =
      getRootOnboardingData() ??
      data;

    const uid =
      String(
        currentUserData?.uid ?? ''
      ).trim();

    if (
      !uid ||
      currentUserData?.loginType ===
        'guest'
    ) {
      setNoticeModal({
        title: 'Google 로그인 필요',
        message:
          '여행기 피드공유는 Google 로그인 후 사용할 수 있어요.',
      });

      return;
    }

    /*
     * 새 카드 업로드 뒤 게시글 저장에 실패하면
     * 방금 올린 고아 파일을 정리하기 위해 보관합니다.
     */
    let uploadedCardUrlForCleanup:
      | string
      | null = null;

    let feedPostSaved = false;

    try {
      setExplorationJournalFeedSharing(
        true
      );

      const placeId =
        String(
          record?.placeId ?? ''
        ).trim();

      if (!placeId) {
        throw new Error(
          'EXPLORATION_JOURNAL_PLACE_ID_EMPTY'
        );
      }

      const placeMeta =
        EXPLORATION_PLACE_META[
          placeId
        ];

      const mood =
        getExplorationJournalMood(
          record?.journalMood
        );

      const memo =
        String(
          record?.journalMemo ?? ''
        ).trim();

      const postId =
        `${uid}_exploration_journal_${placeId}`;

      /*
       * 현재 같은 장소의 피드 게시물을 먼저 찾습니다.
       * 여기의 photoUri가 재공유 전에 사용하던 카드 이미지입니다.
       */
      let loadedPosts =
        getRootCrewPosts();

      if (
        !Array.isArray(
          loadedPosts
        )
      ) {
        loadedPosts = [];
      }

      let previousPost =
        loadedPosts.find(
          (post: any) =>
            String(
              post?.id ?? ''
            ) === postId
        ) ?? null;

      /*
       * 화면 진입 직후라 로컬 게시글 메모리가 아직 비어 있으면
       * 저장소/서버 로드를 한 번 시도합니다.
       * 이 함수는 서버가 느려도 로컬 데이터로 돌아옵니다.
       */
      if (!previousPost) {
        try {
          const refreshedPosts =
            await loadRootCrewPosts();

          previousPost =
            (
              Array.isArray(
                refreshedPosts
              )
                ? refreshedPosts
                : []
            ).find(
              (post: any) =>
                String(
                  post?.id ?? ''
                ) === postId
            ) ?? null;
        } catch (
          loadError: any
        ) {
          console.log(
            'EXPLORATION JOURNAL PREVIOUS POST LOAD ERROR',
            {
              placeId,
              postId,
              code:
                loadError?.code ??
                null,
              message:
                loadError?.message ??
                String(
                  loadError
                ),
            }
          );
        }
      }

      const previousCardUrl =
        String(
          previousPost?.photoUri ??
            ''
        ).trim();

      const previousCardObjectPath =
        getStorageObjectPathFromUrl(
          previousCardUrl
        );

      /*
       * 여행기 카드 파일만 지우도록 경로를 엄격하게 검사합니다.
       * 여행기에 첨부한 원본 사진은 절대 삭제하지 않습니다.
       */
      const expectedCardPathPrefix =
        `shared-posts/` +
        `${sanitizeStorageName(
          uid
        )}/` +
        `${sanitizeStorageName(
          `${postId}_card`
        )}_`;

      const canDeletePreviousCard =
        Boolean(
          previousCardUrl &&
            previousCardObjectPath &&
            previousCardObjectPath.startsWith(
              expectedCardPathPrefix
            )
        );

      console.log(
        'EXPLORATION JOURNAL PREVIOUS CARD CHECK',
        {
          placeId,
          postId,
          hasPreviousPost:
            Boolean(previousPost),
          hasPreviousCardUrl:
            Boolean(
              previousCardUrl
            ),
          previousCardObjectPath,
          canDeletePreviousCard,
        }
      );

      const cardUri =
        await captureExplorationJournalShareCard(
          record
        );

      /*
       * 안전한 교체 순서
       * 1) 새 카드 업로드
       * 2) 피드 게시글을 새 URL로 저장
       * 3) 이전 카드 삭제
       *
       * 이전 카드를 먼저 지우면 새 업로드가 실패했을 때
       * 기존 피드 이미지까지 사라질 수 있으므로 이 순서를 사용합니다.
       */
      const uploadedCardUrl =
        await uploadFeedImageToStorage({
          uri:
            cardUri,

          uid,

          postId:
            `${postId}_card`,

          folder:
            'shared-posts',
        });

      if (!uploadedCardUrl) {
        throw new Error(
          'EXPLORATION_JOURNAL_CARD_UPLOAD_URL_EMPTY'
        );
      }

      uploadedCardUrlForCleanup =
        uploadedCardUrl;

      const verifiedDate =
        new Date(
          String(
            record?.verifiedAt ?? ''
          )
        );

      const dateKey =
        Number.isNaN(
          verifiedDate.getTime()
        )
          ? new Date()
              .toISOString()
              .slice(0, 10)
          : [
              verifiedDate.getFullYear(),
              String(
                verifiedDate.getMonth() + 1
              ).padStart(
                2,
                '0'
              ),
              String(
                verifiedDate.getDate()
              ).padStart(
                2,
                '0'
              ),
            ].join('-');

      const shareSummary =
        [
          mood
            ? `${mood.emoji} ${mood.label}`
            : '',

          `${formatExplorationVerifiedAt(
            record?.verifiedAt
          )} 방문`,
        ]
          .filter(Boolean)
          .join(' · ');

      console.log(
        'EXPLORATION JOURNAL FEED SHARE START',
        {
          placeId,
          postId,
          photoCount:
            normalizeExplorationJournalPhotoUrls(
              record?.journalPhotoUrls
            ).length,
          replacingPreviousCard:
            canDeletePreviousCard,
        }
      );

      /*
       * 장소마다 고정 게시물 ID를 사용합니다.
       * 다시 공유하면 같은 게시물이 최신 여행기로 갱신됩니다.
       */
      await addRootCrewPost({
        id:
          postId,

        sourceLogId:
          `exploration_journal_${placeId}`,

        userId:
          uid,

        nickname:
          currentUserData?.nickname ??
          '루트유저',

        profileEmoji:
          currentUserData?.profileEmoji ??
          '🦊',

        level:
          currentUserData?.level ??
          1,

        placedBuildings:
          currentUserData?.placedBuildings ??
          [],

        target:
          'public',

        crewId:
          null,

        sharedCrewId:
          null,

        category:
          'daily',

        title:
          `${placeMeta?.name ?? placeId} 여행기`,

        date:
          dateKey,

        minutes:
          0,

        photoUri:
          uploadedCardUrl,

        routeImageUri:
          null,

        routeCoordinates:
          [],

        memo,

        shareMemo:
          shareSummary,

        tags:
          [],

        cheers:
          0,

        createdAt:
          previousPost?.createdAt ??
          record?.journalUpdatedAt ??
          record?.verifiedAt ??
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString(),
      });

      feedPostSaved = true;

      let previousCardCleanupSucceeded =
        false;

      /*
       * 게시글이 새 URL로 저장된 뒤에만 이전 카드 이미지를 삭제합니다.
       * 삭제 실패 시 한 번 더 재시도하지만 피드 공유 성공 자체는 유지합니다.
       */
      if (
        canDeletePreviousCard &&
        previousCardUrl !==
          uploadedCardUrl
      ) {
        let previousCardDeleted =
          false;

        let lastDeleteError:
          any = null;

        for (
          let attempt = 1;
          attempt <= 2;
          attempt += 1
        ) {
          try {
            console.log(
              'EXPLORATION JOURNAL PREVIOUS CARD DELETE START',
              {
                placeId,
                postId,
                attempt,
                previousCardObjectPath,
              }
            );

            await deleteFeedImageFromStorage(
              previousCardUrl
            );

            previousCardDeleted =
              true;

            previousCardCleanupSucceeded =
              true;

            console.log(
              'EXPLORATION JOURNAL PREVIOUS CARD DELETE SUCCESS',
              {
                placeId,
                postId,
                attempt,
                previousCardObjectPath,
              }
            );

            break;
          } catch (
            deleteError: any
          ) {
            lastDeleteError =
              deleteError;

            console.log(
              'EXPLORATION JOURNAL PREVIOUS CARD DELETE RETRY',
              {
                placeId,
                postId,
                attempt,
                code:
                  deleteError?.code ??
                  null,
                message:
                  deleteError?.message ??
                  String(
                    deleteError
                  ),
              }
            );

            if (attempt < 2) {
              await new Promise(
                (resolve) =>
                  setTimeout(
                    resolve,
                    900
                  )
              );
            }
          }
        }

        if (!previousCardDeleted) {
          console.log(
            'EXPLORATION JOURNAL PREVIOUS CARD DELETE FAILED',
            {
              placeId,
              postId,
              previousCardObjectPath,
              code:
                lastDeleteError?.code ??
                null,
              message:
                lastDeleteError?.message ??
                String(
                  lastDeleteError ??
                    'UNKNOWN_DELETE_ERROR'
                ),
            }
          );
        }
      } else {
        console.log(
          'EXPLORATION JOURNAL PREVIOUS CARD DELETE SKIPPED',
          {
            placeId,
            postId,
            reason:
              !previousCardUrl
                ? 'NO_PREVIOUS_CARD'
                : !canDeletePreviousCard
                ? 'NOT_JOURNAL_CARD_PATH'
                : 'SAME_URL',
          }
        );
      }

      /*
       * 피드에 실제로 반영된 여행기 버전을 탐험 데이터에도 기록합니다.
       * 이후 메모·기분·사진을 수정하면 journalUpdatedAt만 새로 바뀌므로
       * 카드에서 자동으로 "다시 공유 필요" 상태가 됩니다.
       */
      let feedStatusServerConfirmed =
        false;

      try {
        const feedStatusData =
          await markExplorationJournalFeedShared({
            placeId,

            sharedJournalUpdatedAt:
              record
                ?.journalUpdatedAt ??
              null,

            postId,
          });

        setExplorationData(
          feedStatusData
        );

        feedStatusServerConfirmed =
          true;
      } catch (
        statusError: any
      ) {
        const localStatusData =
          statusError
            ?.localData;

        if (
          localStatusData
        ) {
          setExplorationData(
            localStatusData
          );
        }

        console.log(
          'EXPLORATION JOURNAL FEED STATUS SAVE ERROR',
          {
            placeId,
            postId,
            code:
              statusError
                ?.code ??
              null,
            message:
              statusError
                ?.message ??
              String(
                statusError
              ),
          }
        );
      }

      console.log(
        'EXPLORATION JOURNAL FEED SHARE SUCCESS',
        {
          placeId,
          postId,
          uploadedCardUrl,
          previousCardDeleted:
            previousCardCleanupSucceeded,
          feedStatusServerConfirmed,
        }
      );

      setExplorationJournalShareRecord(
        null
      );

      setNoticeModal({
        title: '피드공유 완료',
        message:
          previousCardCleanupSucceeded
            ? '여행기 카드가 최신 내용으로 바뀌었고 이전 카드 이미지는 자동 정리되었어요.'
            : canDeletePreviousCard
            ? '여행기 카드는 최신 내용으로 바뀌었지만 이전 이미지 정리는 완료되지 않았어요. 다음 재공유 때 다시 정리해요.'
            : '여행기 카드가 전체 피드에 올라갔어요. 다시 공유하면 같은 게시물이 최신 내용으로 바뀌어요.',
      });
    } catch (
      error: any
    ) {
      /*
       * 새 이미지 업로드 뒤 게시글 저장이 실패했다면
       * 피드에서 쓰지 않는 새 카드 파일을 자동 삭제합니다.
       */
      if (
        uploadedCardUrlForCleanup &&
        !feedPostSaved
      ) {
        try {
          console.log(
            'EXPLORATION JOURNAL NEW ORPHAN CARD DELETE START',
            {
              uploadedCardUrl:
                uploadedCardUrlForCleanup,
            }
          );

          await deleteFeedImageFromStorage(
            uploadedCardUrlForCleanup
          );

          console.log(
            'EXPLORATION JOURNAL NEW ORPHAN CARD DELETE SUCCESS'
          );
        } catch (
          cleanupError: any
        ) {
          console.log(
            'EXPLORATION JOURNAL NEW ORPHAN CARD DELETE ERROR',
            {
              code:
                cleanupError?.code ??
                null,
              message:
                cleanupError?.message ??
                String(
                  cleanupError
                ),
            }
          );
        }
      }

      console.log(
        'EXPLORATION JOURNAL FEED SHARE ERROR',
        {
          code:
            error?.code ??
            null,

          message:
            error?.message ??
            String(error),
        }
      );

      setNoticeModal({
        title: '피드공유 실패',
        message:
          '여행기 카드를 전체 피드에 올리지 못했어요.',
      });
    } finally {
      setExplorationJournalFeedSharing(
        false
      );
    }
  };

const openEditLogModal = (log: any) => {
  setEditingLog(log);
  setEditPhotoUri(getLogPhotoUri(log));
  setEditMemo(log.memo ?? '');
};

const pickEditPhotoFromGallery = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (!result.canceled) {
    setEditPhotoUri(result.assets[0].uri);
  }
};

const takeEditPhoto = async () => {
  const permission =
    await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    setNoticeModal({
      title: '카메라 권한 필요',
      message: '사진을 찍으려면 카메라 권한이 필요해요.',
    });
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.85,
  });

  if (!result.canceled) {
    setEditPhotoUri(result.assets[0].uri);
  }
};

const removeEditPhoto = () => {
  setEditPhotoUri(null);
};

const saveEditedLog = async () => {
  if (!editingLog) return;

  const currentData =
  (await loadRootOnboardingData()) ??
  getRootOnboardingData() ??
  data ??
  {};
  const currentLogs = currentData?.actionLogs ?? logs;

  const originalPhotoUri = getLogPhotoUri(editingLog);
  const photoChanged = editPhotoUri !== originalPhotoUri;

  const updatedLogs = currentLogs.map((item: any) => {
    if (String(item.id) !== String(editingLog.id)) {
      return item;
    }

    const nextOriginalPhotoUri = editPhotoUri ?? null;

return {
  ...item,
  memo: editMemo,

  photo_url: editPhotoUri,
  photoUri: editPhotoUri,

  original_photo_url: photoChanged
    ? nextOriginalPhotoUri
    : item.original_photo_url ??
      item.originalPhotoUri ??
      originalPhotoUri,

  originalPhotoUri: photoChanged
    ? nextOriginalPhotoUri
    : item.originalPhotoUri ??
      item.original_photo_url ??
      originalPhotoUri,

  decorated_photo_url: photoChanged
    ? null
    : item.decorated_photo_url ?? null,

  decoratedPhotoUri: photoChanged
    ? null
    : item.decoratedPhotoUri ?? null,

  decorate_stickers: photoChanged
    ? []
    : item.decorate_stickers ??
      item.decorateStickers ??
      [],

  decorateStickers: photoChanged
    ? []
    : item.decorateStickers ??
      item.decorate_stickers ??
      [],
};
  });

  const nextData = {
    ...currentData,
    actionLogs: updatedLogs,
  };

  await saveRootOnboardingData(nextData);
  setData(nextData);
  setLogs(updatedLogs);

  setEditingLog(null);
  setEditPhotoUri(null);
  setEditMemo('');

 setNoticeModal({
  title: '기록 수정 완료',
  message: '기록 사진이 저장되었어요.',
});
};


  const stats = useMemo(() => {
    const totalMinutes = filteredLogs.reduce(
  (sum, log) =>
    sum +
    Number(
      log.duration_minutes ??
      log.minutes ??
      0
    ),
  0
);

    const totalHours = Math.round(totalMinutes / 60);

    const completedGoals =
      data?.goals?.filter(
        (goal: any) =>
          goal.status === 'completed' ||
          goal.achievement_success === true
      )?.length ?? 0;

    const totalCount = filteredLogs.length;

    const totalDistance = filteredLogs.reduce(
  (sum, log) =>
    sum +
    Number(
      log.distance_km ??
      log.distanceKm ??
      0
    ),
  0
);

    return {
      totalHours,
      completedGoals,
      totalCount,
      totalDistance,
    };
  }, [filteredLogs, data]);


const handleUnshareCrewPost =
  async () => {
    if (
      !shareLog ||
      isUnsharingCrewPost
    ) {
      return;
    }

    setIsUnsharingCrewPost(
      true
    );

    /*
     * 이전 요청에서 떠 있던
     * 안내 팝업을 먼저 닫습니다.
     */
    setNoticeModal(
      null
    );

    const targetLogId =
      String(
        shareLog.id
      );

    let storageCleanupFailed =
      false;

    try {
      /*
       * 아래 기존 코드 그대로
       */
      const currentData =
        (
          await loadRootOnboardingData()
        ) ??
        getRootOnboardingData() ??
        data ??
        {};

      const currentLogs =
        Array.isArray(
          currentData?.actionLogs
        )
          ? currentData.actionLogs
          : logs;

      const latestShareLog =
        currentLogs.find(
          (
            item: any
          ) =>
            String(
              item?.id
            ) ===
            targetLogId
        ) ??
        shareLog;

      const sharedPostId =
        String(
          latestShareLog
            ?.sharedCrewPostId ??
          shareLog
            ?.sharedCrewPostId ??
          ''
        ).trim();

      const sharedPhotoUrl =
        String(
          latestShareLog
            ?.shared_photo_url ??
          latestShareLog
            ?.sharedPhotoUrl ??
          shareLog
            ?.shared_photo_url ??
          shareLog
            ?.sharedPhotoUrl ??
          ''
        ).trim();

      const sharedRouteImageUrl =
        String(
          latestShareLog
            ?.shared_route_image_url ??
          latestShareLog
            ?.sharedRouteImageUrl ??
          shareLog
            ?.shared_route_image_url ??
          shareLog
            ?.sharedRouteImageUrl ??
          ''
        ).trim();

      console.log(
        'CREW UNSHARE START',
        {
          targetLogId,

          sharedPostId:
            sharedPostId ||
            null,

          sharedPhotoUrl:
            sharedPhotoUrl ||
            null,

          sharedRouteImageUrl:
            sharedRouteImageUrl ||
            null,
        }
      );

      /*
       * Firestore 게시물부터 삭제합니다.
       */
      if (
        sharedPostId
      ) {
        await removeRootCrewPost(
          sharedPostId
        );
      }

      /*
       * Firestore 게시물이 내려간 뒤
       * 공유용 Storage 사진을 삭제합니다.
       *
       * Storage 삭제가 실패하더라도
       * 피드 내리기 자체는 완료합니다.
       */
      if (
        sharedPhotoUrl
      ) {
        try {
          await deleteFeedImageFromStorage(
            sharedPhotoUrl
          );
        } catch (
          storageError
        ) {
          storageCleanupFailed =
            true;

          console.log(
            'CREW UNSHARE STORAGE CLEANUP ERROR',
            storageError
          );
        }
      }

      if (
        sharedRouteImageUrl
      ) {
        try {
          await deleteFeedImageFromStorage(
            sharedRouteImageUrl
          );
        } catch (
          storageError
        ) {
          storageCleanupFailed =
            true;

          console.log(
            'CREW UNSHARE ROUTE IMAGE CLEANUP ERROR',
            storageError
          );
        }
      }

      const updatedLogs =
        currentLogs.map(
          (
            item: any
          ) =>
            String(
              item?.id
            ) ===
            targetLogId
              ? {
                  ...item,

                  sharedToCrew:
                    false,

                  sharedCrewPostId:
                    null,

                  sharedCrewId:
                    null,

                  shareTarget:
                    null,

                  shareMemo:
                    '',

                  shareTags:
                    [],

                  /*
                   * 삭제한 Storage 주소도
                   * 기록에서 제거합니다.
                   */
                  shared_photo_url:
                    null,

                  sharedPhotoUrl:
                    null,

                  shared_route_image_url:
                    null,

                  sharedRouteImageUrl:
                    null,

                  /*
                   * 다시 공유할 때 새로운
                   * 공유 시각을 사용하도록 초기화합니다.
                   */
                  sharedAt:
                    null,
                }
              : item
        );

      const nextData = {
        ...currentData,

        actionLogs:
          updatedLogs,
      };

      await saveRootOnboardingData(
        nextData
      );

      setData(
        nextData
      );

      setLogs(
        updatedLogs
      );

      setShareLog(
        null
      );

      setShareMemo(
        ''
      );

      setShareTags(
        ''
      );

      setShareTarget(
        'public'
      );

      setSelectedCrewId(
        null
      );

      console.log(
        'CREW UNSHARE COMPLETE',
        {
          targetLogId,

          sharedPostId:
            sharedPostId ||
            null,

          storageCleanupFailed,
        }
      );

      setNoticeModal({
        title:
          '피드 내리기 완료',

        message:
          storageCleanupFailed
            ? '피드는 정상적으로 내렸지만\n' +
              'Storage 사진 정리에 실패했어요.'
            : '피드 게시물과 공유 사진을 삭제했어요.',
      });
    } catch (
      error: any
    ) {
      console.log(
        'CREW UNSHARE ERROR',
        {
          code:
            error?.code ??
            null,

          message:
            error?.message ??
            String(
              error
            ),
        }
      );

      setNoticeModal({
        title:
          '공유내리기 실패',

        message:
          '공유를 내리지 못했어요.\n' +
          '권한 설정 또는 네트워크 상태를 확인해주세요.',
       });
    } finally {
      setIsUnsharingCrewPost(
        false
      );
    }
  };
const handleShareCrewPost = async () => {
  if (isSharingCrewPost) {
    console.log(
      'CREW SHARE STOP: 이미 공유 저장 중'
    );

    return;
  }

  if (!shareLog) {
    console.log(
      'CREW SHARE STOP: shareLog 없음'
    );

    return;
  }

  setIsSharingCrewPost(true);

  console.log(
  'CREW SHARE BUTTON PRESSED',
  {
    shareLogId:
      shareLog.id,

    sharedToCrew:
      shareLog.sharedToCrew,

    shareTarget,
    selectedCrewId,
  }
);

  try {
    const currentUserData = getRootOnboardingData();

    if (!currentUserData?.uid) {
      setNoticeModal({
        title: '로그인 필요',
        message: '공유 기능은 구글 로그인 후 사용할 수 있어요.',
      });
      return;
    }

  
    if (shareMemo.trim().length > 0) {
      const shareMemoError = validateText(shareMemo, {
        label: '공유글',
        max: 300,
      });

      if (shareMemoError) {
        setNoticeModal({
          title: '공유글 확인',
          message: shareMemoError,
        });
        return;
      }
    }

    const selectedShareCrew =
  shareTarget === 'crew'
    ? categoryMatchedShareCrews.find(
        (crew: any) =>
          String(
            crew?.id ?? ''
          ) ===
          String(
            selectedCrewId ?? ''
          )
      )
    : null;

if (
  shareTarget === 'crew' &&
  !selectedShareCrew
) {
  setNoticeModal({
    title:
      '크루를 선택해주세요',

    message:
      '같은 카테고리의 가입 크루 또는 내가 만든 크루를 선택해주세요.',
  });

  return;
}

   

    const tags: string[] = [];

    const normalizedCategory =
      shareLog.category === '운동'
        ? 'exercise'
        : shareLog.category === '공부'
        ? 'study'
        : shareLog.category === '정신'
        ? 'mental'
        : shareLog.category === '일상' || shareLog.category === '일'
        ? 'daily'
        : shareLog.category;

 const isOwnExistingShare =
  shareLog.sharedToCrew === true &&
  !!shareLog.sharedCrewPostId &&
  String(shareLog.userId ?? '') ===
    String(currentUserData.uid);

const crewPostId =
  isOwnExistingShare
    ? String(
        shareLog.sharedCrewPostId
      )
    : `${currentUserData.uid}_${String(
        shareLog.id
      )}`;

/*
 * 피드에는 실제 기록 사진만 공유합니다.
 * GPS 지도 이미지와 GPS 좌표는 공유하지 않습니다.
 */
const localPhotoUri =
  getLogFeedPhotoUri(
    shareLog
  );

const uploadedPhotoUrl =
  localPhotoUri
    ? await uploadFeedImageToStorage({
        uri:
          localPhotoUri,

        uid:
          String(
            currentUserData.uid
          ),

        postId:
          `${crewPostId}_photo`,

        folder:
          'shared-posts',
      })
    : null;

console.log(
  'CREW SHARE PHOTO UPLOAD RESULT',
  {
    shareLogId:
      shareLog.id,

    localPhotoUri:
      localPhotoUri ??
      null,

    uploadedPhotoUrl:
      uploadedPhotoUrl ??
      null,
  }
);

console.log('CREW SHARE POST ID CHECK', {
  currentUid: currentUserData.uid,
  logUserId: shareLog.userId ?? null,
  oldPostId:
    shareLog.sharedCrewPostId ?? null,
  isOwnExistingShare,
  nextPostId: crewPostId,
});


console.log('CREW SHARE FIRESTORE START', {
  uid: currentUserData?.uid,
  postId: crewPostId,
  target: shareTarget,
  crewId:
    shareTarget === 'crew'
      ? selectedCrewId
      : null,
});

    await addRootCrewPost({
      id: crewPostId,
      sourceLogId: String(shareLog.id),

      userId:
        currentUserData?.uid ??
        currentUserData?.guestId ??
        'guest',

      nickname: currentUserData?.nickname ?? '루트유저',
      profileEmoji: currentUserData?.profileEmoji ?? '🦊',

      level: currentUserData?.level ?? 1,
      placedBuildings: currentUserData?.placedBuildings ?? [],

      target: shareTarget,

crewId:
  shareTarget === 'crew'
    ? selectedCrewId
    : null,

sharedCrewId:
  shareTarget === 'crew'
    ? selectedCrewId
    : null,

category: normalizedCategory,
      title: shareLog.action_title ?? shareLog.title ?? '행동목표',
      date: shareLog.date,
      minutes: Number(
        shareLog.duration_minutes ??
          shareLog.minutes ??
          0
      ),
      distanceKm:
  shareLog.distance_km != null || shareLog.distanceKm != null
    ? Number(shareLog.distance_km ?? shareLog.distanceKm)
    : undefined,

photoUri:
  uploadedPhotoUrl ??
  null,

/*
 * 기존 게시글을 다시 공유하는 경우에도
 * 예전에 저장된 지도 정보를 확실히 제거합니다.
 */
routeImageUri: null,
routeCoordinates: [],
      memo: shareLog.memo ?? '',
      shareMemo,
      tags,
      cheers: shareLog.cheers ?? 0,
      createdAt: shareLog.sharedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(
  'CREW SHARE LOCAL SAVE ACCEPTED',
  crewPostId
);

/*
 * 공유 직전에 AsyncStorage의 최신 전체 데이터를
 * 다시 읽습니다. 오래된 메모리 데이터가 행동목표를
 * 덮어쓰는 것을 방지합니다.
 */
const currentData =
  (await loadRootOnboardingData()) ??
  getRootOnboardingData() ??
  data ??
  {};

    const updatedLogs = (currentData?.actionLogs ?? logs).map(
      (item: any) =>
        String(item?.id) ===
String(shareLog.id)
          ? {
    ...item,

    userId:
      currentUserData.uid,

    sharedToCrew:
      true,

    sharedCrewPostId:
      crewPostId,

    sharedCrewId:
      shareTarget ===
      'crew'
        ? selectedCrewId
        : null,

    shareTarget,
    shareMemo,
    shareTags: tags,

    /*
     * 피드공유용 Firebase Storage 주소입니다.
     *
     * 기존 photo_url과 original_photo_url은
     * 수정하지 않으므로 기록 사진과 꾸미기 기능은
     * 그대로 유지됩니다.
     */
    shared_photo_url:
      uploadedPhotoUrl,

    sharedPhotoUrl:
      uploadedPhotoUrl,

    /*
     * 나의 기록에 저장된 원본 GPS 정보는 유지하고,
     * 피드공유용 지도 주소만 제거합니다.
     */
    shared_route_image_url:
      null,

    sharedRouteImageUrl:
      null,

    sharedAt:
      item.sharedAt ??
      new Date()
        .toISOString(),
  }
          : item
    );

    const nextData = {
      ...currentData,
      actionLogs: updatedLogs,
    };

    await saveRootOnboardingData(nextData);
    setData(nextData);
    setLogs(updatedLogs);
/*
 * Firestore 게시글 저장과 로컬 기록 수정이 끝났으므로
 * 공유 모달부터 즉시 닫습니다.
 */
setShareLog(null);
setShareMemo('');
setShareTags('');
setShareTarget('public');
setSelectedCrewId(null);

console.log(
  'CREW SHARE UI CLOSED',
  crewPostId
);

/*
 * 뱃지 계산과 알림은 공유 화면을 막지 않도록
 * 백그라운드에서 실행합니다.
 */
void (async () => {
  try {
    const newBadges =
      await checkNewEarnedBadges();

    const nextEarnedBadges =
      await loadRootEarnedBadges();

    setEarnedBadges(
      nextEarnedBadges
    );

    if (newBadges.length === 0) {
      return;
    }

    const badge =
      newBadges[0];

    setNewBadge(badge);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title:
            '🏅 새로운 뱃지 획득!',
          body:
            `${badge.icon} ${badge.title}`,
          sound: 'default',
        },
        trigger: null,
      });
    } catch (notificationError) {
      console.log(
        'CREW SHARE BADGE NOTIFICATION ERROR',
        notificationError
      );
    }
  } catch (badgeError) {
    console.log(
      'CREW SHARE BACKGROUND BADGE ERROR',
      badgeError
    );
  }
})();
   } catch (e: any) {
    console.log(
      'CREW SHARE SAVE ERROR DETAIL',
      {
        name:
          e?.name ?? null,

        code:
          e?.code ?? null,

        message:
          e?.message ??
          String(e),

        currentUid:
          getRootOnboardingData()
            ?.uid ?? null,

        selectedCrewId,

        shareLogId:
          shareLog?.id ?? null,

        sharedCrewPostId:
          shareLog
            ?.sharedCrewPostId ??
          null,
      }
    );

    setNoticeModal({
      title: '공유 실패',
      message:
        '공유를 저장하지 못했어요.\n\n' +
        `${
          e?.code ??
          e?.message ??
          '원인을 확인할 수 없어요.'
        }`,
    });
  } finally {
    setIsSharingCrewPost(
      false
    );
  }
};


const renderRecordCalendar = () => (
  <View
  style={[
    styles.growthCalendarBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 26,
    },
  ]}
>
    <View style={styles.growthCalendarHeader}>
      <Pressable
        style={[
  styles.growthMonthButton,
  {
    backgroundColor: theme.card2,
    borderRadius: isCityBlack ? 4 : 21,
  },
]}
        onPress={() => {
          setSelectedGrowthMonth((prev) =>
            shiftMonthKey(prev, -1)
          );
          setSelectedGrowthDate(null);
        }}
      >
        <Text
  style={[
    styles.growthMonthButtonText,
    { color: theme.text },
  ]}
>
  ‹
</Text>
      </Pressable>

      <Text
  style={[
    styles.growthMonthTitle,
    { color: theme.text },
  ]}
>
        {formatMonthLabel(selectedGrowthMonth)}
      </Text>

      <Pressable
        style={[
  styles.growthMonthButton,
  {
    backgroundColor: theme.card2,
    borderRadius: isCityBlack ? 4 : 21,
  },
]}
        onPress={() => {
          setSelectedGrowthMonth((prev) =>
            shiftMonthKey(prev, 1)
          );
          setSelectedGrowthDate(null);
        }}
      >
        <Text
  style={[
    styles.growthMonthButtonText,
    { color: theme.text },
  ]}
>
  ›
</Text>
      </Pressable>
    </View>

    <View style={styles.growthWeekRow}>
      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
        <Text
  key={day}
  style={[
    styles.growthWeekText,
    { color: theme.subText },
  ]}
>
          {day}
        </Text>
      ))}
    </View>

    <View style={styles.growthCalendarGrid}>
      {growthCalendarDays.map((dateKey, index) => {
        const hasRecord =
          !!dateKey && growthDateSet.has(dateKey);

        const selected =
          !!dateKey && selectedGrowthDate === dateKey;

        return (
          <Pressable
            key={`${dateKey ?? 'blank'}_${index}`}
            disabled={!dateKey || !hasRecord}
            onPress={() => {
              if (!dateKey) return;

              setSelectedGrowthDate((prev) =>
                prev === dateKey ? null : dateKey
              );
            }}
            style={[
              styles.growthCalendarDay,
              !dateKey && styles.growthCalendarBlankDay,
            ]}
          >
            <View
  style={[
    styles.growthCalendarDayCircle,
    hasRecord && {
      backgroundColor: theme.card2,
      borderWidth: 1,
      borderColor: theme.line,
    },
    selected && {
      backgroundColor: '#fff',
      borderColor: theme.strongLine,
    },
  ]}
>
  <Text
    style={[
      styles.growthCalendarDayText,
      {
        color: hasRecord
          ? theme.text
          : theme.mutedText,
      },
      selected && {
        color: theme.buttonText,
      },
    ]}
  >
    {dateKey ? Number(dateKey.slice(-2)) : ''}
  </Text>
</View>
          </Pressable>
        );
      })}
    </View>

    {selectedGrowthDate && (
     <Pressable
  style={[
    styles.growthSelectedDateButton,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 18,
      borderWidth: 1,
    },
  ]}
  onPress={() => setSelectedGrowthDate(null)}
>
  <Text
    style={[
      styles.growthSelectedDateText,
      { color: theme.text },
    ]}
  >
    {selectedGrowthDate.replace(/-/g, '.')} 선택 중 · 전체 보기
  </Text>
</Pressable>
    )}
  </View>
);

  return (
    <>
      {routeSnapshotRequestKey > 0 &&
      routeSnapshotCoordinates.length >= 2 ? (
        <View
          pointerEvents="none"
          style={
            styles.routeSnapshotCaptureBox
          }
        >
          <MapView
            key={
              routeSnapshotRequestKey
            }
            ref={
              routeSnapshotMapRef
            }
            provider={
              PROVIDER_GOOGLE
            }
            mapType="standard"
            style={
              styles.routeSnapshotMap
            }
            initialRegion={
              getRouteSnapshotRegion(
                routeSnapshotCoordinates
              )
            }
            scrollEnabled={
              false
            }
            zoomEnabled={
              false
            }
            rotateEnabled={
              false
            }
            pitchEnabled={
              false
            }
            toolbarEnabled={
              false
            }
            onMapReady={() =>
              setRouteSnapshotMapLoaded(
                true
              )
            }
            onMapLoaded={() =>
              setRouteSnapshotMapLoaded(
                true
              )
            }
          >
            <Polyline
              coordinates={
                routeSnapshotCoordinates
              }
              strokeWidth={7}
              strokeColor="#ff5a1f"
            />

            <Marker
              coordinate={
                routeSnapshotCoordinates[0]
              }
              title="시작"
            />

            <Marker
              coordinate={
                routeSnapshotCoordinates[
                  routeSnapshotCoordinates.length -
                    1
                ]
              }
              title="도착"
            />
          </MapView>
        </View>
      ) : null}

    <ScrollView
  style={[
    styles.container,
    { backgroundColor: theme.background },
  ]}
>
            <View
  style={[
    styles.tabRow,
    {
      backgroundColor: theme.card2,
      borderRadius: isCityBlack ? 4 : 18,
      borderWidth: isCityBlack ? 1 : 0,
      borderColor: theme.line,
    },
  ]}
>
  <Pressable
    style={[
  styles.tabButton,
  activeTab === 'timeline' && {
    backgroundColor: theme.card,
    borderRadius: isCityBlack ? 3 : 18,
  },
]}
    onPress={() => setActiveTab('timeline')}
  >
    <Text
  style={[
    styles.tabText,
    { color: theme.text },
  ]}
  numberOfLines={1}
>
  타임라인
</Text>
  </Pressable>

  <Pressable
    style={[
      styles.tabButton,
      activeTab ===
        'exploration' && {
        backgroundColor:
          theme.card,
        borderRadius:
          isCityBlack
            ? 3
            : 18,
      },
    ]}
    onPress={() =>
      setActiveTab(
        'exploration'
      )
    }
  >
    <Text
      style={[
        styles.tabText,
        {
          color:
            theme.text,
        },
      ]}
      numberOfLines={1}
    >
      탐험 기록
    </Text>
  </Pressable>

  <Pressable
    style={[
      styles.tabButton,
      activeTab ===
        'collection' && {
        backgroundColor:
          theme.card,
        borderRadius:
          isCityBlack
            ? 3
            : 18,
      },
    ]}
    onPress={() =>
      setActiveTab(
        'collection'
      )
    }
  >
    <Text
      style={[
        styles.tabText,
        {
          color:
            theme.text,
        },
      ]}
      numberOfLines={1}
    >
      컬렉션
    </Text>
  </Pressable>

  <Pressable
    style={[
  styles.tabButton,
  activeTab === 'album' && {
    backgroundColor: theme.card,
    borderRadius: isCityBlack ? 3 : 18,
  },
]}
    onPress={() => setActiveTab('album')}
  >
    <Text
  style={[
    styles.tabText,
    { color: theme.text },
  ]}
  numberOfLines={1}
>
  오늘의 성장
</Text>
  </Pressable>

  <Pressable
    style={[
  styles.tabButton,
  activeTab === 'stats' && {
    backgroundColor: theme.card,
    borderRadius: isCityBlack ? 3 : 18,
  },
]}
    onPress={() => setActiveTab('stats')}
  >
    <Text
  style={[
    styles.tabText,
    { color: theme.text },
  ]}
  numberOfLines={1}
>
  통계
</Text>
  </Pressable>
</View>

{activeTab === 'stats' && (
  <View style={styles.categoryRow}>
    {categories.map((category) => {
      const selected =
        selectedCategory ===
        category.id;

      return (
        <Pressable
          key={category.id}
          onPress={() =>
            setSelectedCategory(
              category.id
            )
          }
          style={[
            styles.categoryButton,
            {
              /*
               * 아래 통계 버튼과 같은 배경색
               */
              backgroundColor:
                theme.card,

              borderColor:
                selected
                  ? theme.strongLine
                  : theme.line,

              borderWidth:
                selected
                  ? 2
                  : 1,

              borderRadius:
                isCityBlack
                  ? 4
                  : 14,
            },
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              {
                color:
                  selected
                    ? theme.button
                    : theme.text,
              },
            ]}
          >
            {category.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
)}
      {activeTab === 'stats' && (
        <>
          <View style={styles.statList}>
            <Pressable
              style={[
                styles.statRow,
                {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
}
              ]}
              onPress={() => setStatDetailType('time')}
            >
              
              <Text
                style={[
                  styles.statRowLabel,
                  { color: theme.text },
                ]}
              >
                총 수련 시간
              </Text>

              <View style={styles.statRowRight}>
                <Text
                  style={[
                    styles.statRowValue,
                    { color: theme.text },
                  ]}
                >
                  {stats.totalHours}시간
                </Text>

                <Text
                  style={[
                    styles.statRowArrow,
                    { color: theme.subText },
                  ]}
                >
                  ›
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.statRow,
                {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
}
              ]}
              onPress={() => {
                setBadgeFilter('earned');
                setShowBadgeList(true);
              }}
            >
                            <Text
                style={[
                  styles.statRowLabel,
                  { color: theme.text },
                ]}
              >
                획득한 뱃지
              </Text>

              <View style={styles.statRowRight}>
                <Text
                  style={[
                    styles.statRowValue,
                    { color: theme.text },
                  ]}
                >
                  {earnedBadges.length}개
                </Text>

                <Text
                  style={[
                    styles.statRowArrow,
                    { color: theme.subText },
                  ]}
                >
                  ›
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.statRow,
                {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
}
              ]}
              onPress={() => setStatDetailType('count')}
            >
                            <Text
                style={[
                  styles.statRowLabel,
                  { color: theme.text },
                ]}
              >
                총 수련 횟수
              </Text>

              <View style={styles.statRowRight}>
                <Text
                  style={[
                    styles.statRowValue,
                    { color: theme.text },
                  ]}
                >
                  {stats.totalCount}회
                </Text>

                <Text
                  style={[
                    styles.statRowArrow,
                    { color: theme.subText },
                  ]}
                >
                  ›
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.statRow,
                {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
}
              ]}
              onPress={() => setStatDetailType('distance')}
            >
                            <Text
                style={[
                  styles.statRowLabel,
                  { color: theme.text },
                ]}
              >
                총 이동거리
              </Text>

              <View style={styles.statRowRight}>
                <Text
                  style={[
                    styles.statRowValue,
                    { color: theme.text },
                  ]}
                >
                  {stats.totalDistance.toFixed(1)}km
                </Text>

                <Text
                  style={[
                    styles.statRowArrow,
                    { color: theme.subText },
                  ]}
                >
                  ›
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.statRow,
                {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
}
              ]}
              onPress={() =>
                setShowPastGoals((prev) => !prev)
              }
            >
                            <Text
                style={[
                  styles.statRowLabel,
                  { color: theme.text },
                ]}
              >
                지난 행동목표
              </Text>

              <View style={styles.statRowRight}>
                <Text
                  style={[
                    styles.statRowValue,
                    { color: theme.text },
                  ]}
                >
                  {archivedActionGoalItems.length}개
                </Text>

                <Text
                  style={[
                    styles.statRowArrow,
                    { color: theme.subText },
                  ]}
                >
                  {showPastGoals ? '⌃' : '›'}
                </Text>
              </View>
            </Pressable>
          </View>

          {showPastGoals ? (
            <View style={styles.pastGoalDetails}>
              {archivedActionGoalItems.length === 0 ? (
                <View
  style={[
    styles.pastGoalEmptyBox,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderWidth:
        0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 10,
    },
  ]}
>
                  <Text
                    style={[
                      styles.pastGoalEmptyText,
                      { color: theme.subText },
                    ]}
                  >
                    이 카테고리에 보관된 행동목표가 없어요.
                  </Text>
                </View>
              ) : (
                archivedActionGoalItems.map(
                  (goal: any) => {
                    const categoryInfo =
                      categories.find(
                        (category) =>
                          category.id ===
                          goal.category
                      );

                    return (
                      <Pressable
  key={String(goal.id)}
  style={[
    styles.pastGoalCard,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderWidth:
        0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 10,
    },
  ]}
                        onPress={() =>
                          router.push({
                            pathname:
                              '/(tabs)/record',
                            params: {
                              actionGoalId:
                                String(goal.id),
                              actionGoalTitle:
                                goal.title ??
                                '행동목표',
                              actionGoalCategory:
                                goal.category ??
                                '',
                            },
                          })
                        }
                      >
                        <View
                          style={
                            styles.pastGoalCardContent
                          }
                        >
                          <View
                            style={
                              styles.pastGoalTitleRow
                            }
                          >
                            <Text
                              style={
                                styles.pastGoalIcon
                              }
                            >
                              {categoryInfo?.icon ??
                                '✨'}
                            </Text>

                            <Text
                              style={[
                                styles.pastGoalTitle,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {goal.title ??
                                '행동목표'}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.pastGoalDate,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {goal.statusLabel}
                            {' · '}
                            {formatArchivedGoalDate(
                              goal.createdAt
                            )}
                            {' ~ '}
                            {formatArchivedGoalDate(
                              goal.endedAt ??
                                goal.archivedAt
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.pastGoalSummary,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            총 {goal.recordCount}회
                            {goal.totalMinutes > 0
                              ? ` · ${formatGrowthMinutes(
                                  goal.totalMinutes
                                )}`
                              : ''}
                            {goal.totalDistance > 0
                              ? ` · ${goal.totalDistance.toFixed(
                                  2
                                )}km`
                              : ''}
                            {goal.totalCalories > 0
                              ? ` · ${Math.round(
                                  goal.totalCalories
                                ).toLocaleString(
                                  'ko-KR'
                                )}kcal`
                              : ''}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.pastGoalArrow,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          ›
                        </Text>
                      </Pressable>
                    );
                  }
                )
              )}
            </View>
          ) : null}
        </>
      )}

     {activeTab === 'timeline' && (
  <View>
    {selectedActionGoalId ? (
      <View
        style={[
          styles.actionGoalHistoryHeader,
          {
            backgroundColor: theme.card,
            borderColor: theme.line,
            borderRadius: isCityBlack ? 4 : 22,
          },
        ]}
      >
        <View style={styles.actionGoalHistoryTopRow}>
          <View style={styles.actionGoalHistoryTitleArea}>
            <Text
              style={[
                styles.actionGoalHistoryLabel,
                { color: theme.subText },
              ]}
            >
              행동목표 기록
            </Text>

            <Text
              style={[
                styles.actionGoalHistoryTitle,
                { color: theme.text },
              ]}
            >
              {categories.find(
                (category) =>
                  category.id ===
                  focusedActionGoalCategory
              )?.icon ?? '✨'}{' '}
              {focusedActionGoalName}
            </Text>
          </View>

          <Pressable
            style={[
              styles.actionGoalHistoryAllButton,
              {
                backgroundColor: theme.card2,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 12,
              },
            ]}
            onPress={() =>
              router.replace('/(tabs)/record')
            }
          >
            <Text
              style={[
                styles.actionGoalHistoryAllButtonText,
                { color: theme.text },
              ]}
            >
              전체 기록
            </Text>
          </Pressable>
        </View>

        <View style={styles.actionGoalHistorySummaryRow}>
          <Text
            style={[
              styles.actionGoalHistorySummaryText,
              { color: theme.text },
            ]}
          >
            총 {focusedActionGoalSummary?.count ?? 0}회
          </Text>

          <Text
            style={[
              styles.actionGoalHistorySummaryDot,
              { color: theme.mutedText },
            ]}
          >
            ·
          </Text>

          <Text
            style={[
              styles.actionGoalHistorySummaryText,
              { color: theme.text },
            ]}
          >
            {formatGrowthMinutes(
              focusedActionGoalSummary?.minutes ?? 0
            )}
          </Text>

          {(focusedActionGoalSummary?.distance ?? 0) > 0 ? (
            <>
              <Text
                style={[
                  styles.actionGoalHistorySummaryDot,
                  { color: theme.mutedText },
                ]}
              >
                ·
              </Text>

              <Text
                style={[
                  styles.actionGoalHistorySummaryText,
                  { color: theme.text },
                ]}
              >
                {(
                  focusedActionGoalSummary?.distance ?? 0
                ).toFixed(2)}
                km
              </Text>
            </>
          ) : null}

          {(focusedActionGoalSummary?.calories ?? 0) > 0 ? (
            <>
              <Text
                style={[
                  styles.actionGoalHistorySummaryDot,
                  { color: theme.mutedText },
                ]}
              >
                ·
              </Text>

              <Text
                style={[
                  styles.actionGoalHistorySummaryText,
                  { color: theme.text },
                ]}
              >
                {Math.round(
                  focusedActionGoalSummary?.calories ?? 0
                ).toLocaleString('ko-KR')}
                kcal
              </Text>
            </>
          ) : null}
        </View>
      </View>
    ) : (
      renderRecordCalendar()
    )}

    {timelineLogs.length === 0 ? (
      <Text
        style={[
          styles.emptyText,
          { color: theme.subText },
        ]}
      >
        {selectedActionGoalId
          ? '이 행동목표의 기록이 아직 없어요.'
          : '선택한 날짜에는 기록이 없어요.'}
      </Text>
    ) : (
      timelineLogs.map((log) => (
              <View
  key={log.id}
  style={[
    styles.timelineCard,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 24,
    },
  ]}
>
<View style={styles.timelineTop}>
  <View style={styles.timelineHeaderContent}>
    <View style={styles.timelineTitleDateRow}>
      <Text
        style={[
          styles.timelineTitle,
          {
            color:
              theme.text,
          },
        ]}
        numberOfLines={1}
      >
        {log.action_title ??
          log.title ??
          '행동목표'}
      </Text>

      <Text
        style={[
          styles.timelineDateInline,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={1}
      >
        {String(
          log.date ?? ''
        ).replace(/-/g, '.')}
      </Text>
    </View>

    {log.memo ? (
      <Text
        style={[
          styles.memoText,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={2}
      >
        “{log.memo}”
      </Text>
    ) : null}
  </View>
</View>

               {getLogPhotoUri(log) && (
  <Pressable
    style={[
      styles.timelineImageBox,
      {
        backgroundColor:
          theme.card2,

        borderColor:
          theme.line,

        borderRadius:
          isCityBlack
            ? 4
            : 22,
      },
    ]}
    onPress={() => {
      setSelectedImageLog(
        log
      );

      setSelectedImageUri(
        String(
          getLogPhotoUri(
            log
          )
        )
      );

      setSelectedImageType(
        'photo'
      );
    }}
  >
    <Image
      source={{
        uri: String(
          getLogPhotoUri(
            log
          )
        ),
      }}
      style={
        styles.timelineImage
      }
      resizeMode="contain"
    />
  </Pressable>
)}

{(log.distance_km != null || log.distanceKm != null) ? (() => {
  const distanceKm = Number(
    log.distance_km ?? log.distanceKm ?? 0
  );

  const minutes = Number(
    log.duration_minutes ?? log.minutes ?? 0
  );

  const speedKmh =
    distanceKm > 0 && minutes > 0
      ? distanceKm / (minutes / 60)
      : 0;

  const routeImageUri =
    log.route_image_uri ?? log.routeImageUri;

  if (routeImageUri) {
  return (
    <Pressable
      onPress={() => {
  setSelectedImageLog(log);
  setSelectedImageUri(String(routeImageUri));
  setSelectedImageType('route');
}}
    >
      <View
  style={[
    styles.routeSavedImageBox,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 18,
      borderWidth: isCityBlack ? 1 : 0,
    },
  ]}
>
          <Image
            source={{ uri: String(routeImageUri) }}
            style={styles.routeSavedImage}
            resizeMode="cover"
          />
<View
  style={[
    styles.routeSavedMiniBadge,
    {
      backgroundColor: isCityBlack
        ? 'rgba(9,9,11,0.88)'
        : 'rgba(20,30,45,0.82)',
      borderColor: isCityBlack
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(255,255,255,0.2)',
      borderRadius: isCityBlack ? 4 : 14,
      borderWidth: 1,
    },
  ]}
>
  <View style={styles.routeSavedStatsLine}>
    <Text
  style={[
    styles.routeSavedMiniText,
    { color: '#ffffff' },
  ]}
>
      {distanceKm.toFixed(2)}km
    </Text>

    <Text
  style={[
    styles.routeSavedMiniText,
    { color: '#ffffff' },
  ]}
>
      {formatLogClockTime(minutes)}
    </Text>
  </View>

  <View style={styles.routeSavedStatsLine}>
    <Text
  style={[
    styles.routeSavedMiniText,
    { color: '#ffffff' },
  ]}
>
      {speedKmh.toFixed(1)}km/h
    </Text>

    <Text
  style={[
    styles.routeSavedMiniText,
    { color: '#ffffff' },
  ]}
>
      {getLogCalories(log)}kcal
    </Text>
  </View>
</View>


        </View>
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
  style={[
    styles.timelineGpsBox,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 18,
    },
  ]}
  onPress={() =>
    setOpenGpsLogId(
      openGpsLogId === log.id ? null : log.id
    )
  }
>
  <Text
    style={[
      styles.timelineGpsText,
      { color: theme.text },
    ]}
  >
    🗺️ 이동 경로 보기
  </Text>
</Pressable>

      {openGpsLogId === log.id && (() => {
        const routeCoordinates =
          log.route_coordinates ??
          log.routeCoordinates ??
          [];

        if (routeCoordinates.length === 0) return null;

        const startPoint = routeCoordinates[0];
        const endPoint =
          routeCoordinates[routeCoordinates.length - 1];

        return (
          <View
  style={[
    styles.inlineMapBox,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 18,
      borderWidth: isCityBlack ? 1 : 0,
    },
  ]}
>
            <MapView
              provider={PROVIDER_GOOGLE}
              mapType="standard"
              style={styles.inlineMap}
              initialRegion={{
                latitude: startPoint.latitude,
                longitude: startPoint.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
            >
              {routeCoordinates.length >= 2 && (
               <Polyline
  coordinates={routeCoordinates}
  strokeWidth={6}
  strokeColor={isCityBlack ? '#f4f4f5' : '#2563eb'}
/>
              )}

              <Marker coordinate={startPoint} title="시작" />

              {routeCoordinates.length >= 2 && (
                <Marker coordinate={endPoint} title="도착" />
              )}
            </MapView>
          </View>
        );
      })()}
    </>
  );
})() : null}

<View style={styles.timelineBottomButtonRow}>
  <Pressable
    style={[
      styles.timelineEditButton,
      {
        backgroundColor: theme.card,
        borderColor: theme.line,
        borderRadius: isCityBlack ? 4 : 16,
      },
    ]}
    onPress={() => openEditLogModal(log)}
  >
    <Text
      style={[
        styles.timelineEditButtonText,
        { color: theme.text },
      ]}
    >
      수정
    </Text>
  </Pressable>

<Pressable
  style={[
    styles.timelineCrewShareButton,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 14,
    },
  ]}

onPress={async () => {
  const currentUserData =
    getRootOnboardingData();

  if (!currentUserData?.uid) {
    setNoticeModal({
      title:
        '로그인 필요',
      message:
          '공유 기능은 구글 로그인 후 사용할 수 있어요.',
    });

    return;
  }


  /*
   * 화면 상태가 아직 비어 있으면
   * 공유 버튼을 누른 시점에 로컬 크루를 다시 읽습니다.
   */
  let latestCrews =
    crews;

  if (
    latestCrews.length ===
    0
  ) {
    try {
      latestCrews =
        await loadRootCrews();

      setCrews([
        ...latestCrews,
      ]);
    } catch (error) {
      console.log(
        'CREW SHARE CREW RELOAD ERROR',
        error
      );

      latestCrews = [];
    }
  }

  const currentUid =
    String(
      currentUserData.uid
    );

  const currentGuestId =
    currentUserData?.guestId
      ? String(
          currentUserData.guestId
        )
      : '';

  const currentNickname =
    String(
      currentUserData
        ?.nickname ??
        ''
    ).trim();

  const identityIds =
    new Set(
      [
        currentUid,
        currentGuestId,
        currentGuestId
          ? `guest:${currentGuestId}`
          : '',
      ].filter(Boolean)
    );

  const myLatestCrews =
    latestCrews.filter(
      (crew: any) => {
        const ownerId =
          String(
            crew?.ownerId ??
              ''
          );

        const isOwner =
          identityIds.has(
            ownerId
          );

        const isMember = (
          crew?.memberIds ??
          []
        ).some(
          (
            memberId: any
          ) =>
            identityIds.has(
              String(
                memberId
              )
            )
        );

        const isLegacyOwner =
          currentNickname
            .length > 0 &&
          String(
            crew?.ownerNickname ??
              ''
          ).trim() ===
            currentNickname;

        return (
          isOwner ||
          isMember ||
          isLegacyOwner
        );
      }
    );

  const logCategory =
    normalizeCrewCategory(
      log.category
    );

  const matchingCrews =
    myLatestCrews.filter(
      (crew: any) =>
        normalizeCrewCategory(
          crew?.category
        ) ===
        logCategory
    );

  const savedCrewId =
    log.sharedCrewId ??
    log.crewId ??
    null;

  const savedMatchingCrew =
    savedCrewId
      ? matchingCrews.find(
          (crew: any) =>
            String(
              crew?.id
            ) ===
            String(
              savedCrewId
            )
        )
      : null;

  const nextCrew =
    savedMatchingCrew ??
    matchingCrews[0] ??
    null;

  console.log(
    'CREW SHARE FRESH CHECK',
    {
      logId:
        log.id,

      logCategory,

      loadedCrewCount:
        latestCrews.length,

      myCrewCount:
        myLatestCrews.length,

      matchingCrewCount:
        matchingCrews.length,

      crews:
        latestCrews.map(
          (crew: any) => ({
            id:
              crew?.id ??
              null,

            title:
              crew?.title ??
              null,

            category:
              crew?.category ??
              null,

            normalizedCategory:
              normalizeCrewCategory(
                crew?.category
              ),

            ownerId:
              crew?.ownerId ??
              null,

            ownerNickname:
              crew?.ownerNickname ??
              null,
          })
        ),
    }
  );

  setShareMemo(
  log.sharedToCrew
    ? log.shareMemo ?? ''
    : log.memo ?? ''
);

setShareTags('');

/*
 * 예전 크루공유 기록에는 shareTarget이 없을 수 있으므로
 * 저장된 크루 ID가 있으면 크루공유로 복원합니다.
 */
const wantsCrewTarget =
  log?.shareTarget === 'crew' ||
  (
    !log?.shareTarget &&
    Boolean(savedCrewId)
  );

const nextShareTarget:
  'public' | 'crew' =
  wantsCrewTarget &&
  nextCrew?.id
    ? 'crew'
    : 'public';

setShareTarget(
  nextShareTarget
);

setSelectedCrewId(
  nextShareTarget === 'crew' &&
  nextCrew?.id
    ? String(nextCrew.id)
    : null
);

/*
 * 같은 카테고리의 크루가 없어도
 * 전체공개를 선택할 수 있도록
 * 공유 모달을 엽니다.
 */
setShareLog(log);

console.log(
  'CREW SHARE MODAL OPEN',
  {
    logId:
      log.id,

    category:
      logCategory,

    nextShareTarget,

    selectedCrewId:
      nextCrew?.id
        ? String(nextCrew.id)
        : null,

    selectedCrewTitle:
      nextCrew?.title ??
      null,

    selectedCrewCategory:
      nextCrew?.category
        ? normalizeCrewCategory(
            nextCrew.category
          )
        : null,
  }
);
}}
>
  <Text
  style={[
    styles.timelineCrewShareButtonText,
    {
      color:
        theme.text,
    },
  ]}
>
  {log.sharedToCrew === true &&
  !!log.sharedCrewPostId
    ? '피드 내리기'
    : '피드공유'}
</Text>
</Pressable>

  <Pressable
  style={[
    styles.timelineExternalShareButton,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 14,
    },
  ]}
  onPress={() =>
    shareLogExternal(log)
  }
>
  <Text
    style={[
      styles.timelineExternalShareButtonText,
      {
        color:
          theme.text,
      },
    ]}
  >
    외부공유
  </Text>
</Pressable>

</View>
              </View>
            ))
          )}
        </View>
      )}


    {activeTab ===
      'exploration' && (
      <View
        style={
          styles.explorationRecordSection
        }
      >
        <View
          style={[
            styles.explorationSummaryCard,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 4
                  : 20,
            },
          ]}
        >
          <View
            style={
              styles.explorationSummaryTopRow
            }
          >
            <View
              style={
                styles.explorationSummaryTitleBox
              }
            >
              <Text
                style={[
                  styles.explorationSummaryTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                나의 탐험 기록
              </Text>

              <Text
                style={[
                  styles.explorationSummarySubtitle,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                직접 방문하고 GPS로 인증한 장소예요.
              </Text>
            </View>

            <Text
              style={[
                styles.explorationSummaryCompass,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              🧭
            </Text>
          </View>

          <View
            style={
              styles.explorationSummaryStats
            }
          >
            <View
              style={
                styles.explorationSummaryStat
              }
            >
              <Text
                style={[
                  styles.explorationSummaryStatValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {
                  explorationVisitRecords.length
                }
              </Text>

              <Text
                style={[
                  styles.explorationSummaryStatLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문 장소
              </Text>
            </View>

            <View
              style={[
                styles.explorationSummaryDivider,
                {
                  backgroundColor:
                    theme.line,
                },
              ]}
            />

            <View
              style={
                styles.explorationSummaryStat
              }
            >
              <Text
                style={[
                  styles.explorationSummaryStatValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {Math.max(
                  0,
                  Math.floor(
                    Number(
                      explorationData
                        ?.points
                    ) || 0
                  )
                )}
              </Text>

              <Text
                style={[
                  styles.explorationSummaryStatLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                탐험 포인트
              </Text>
            </View>

            <View
              style={[
                styles.explorationSummaryDivider,
                {
                  backgroundColor:
                    theme.line,
                },
              ]}
            />

            <View
              style={
                styles.explorationSummaryStat
              }
            >
              <Text
                style={[
                  styles.explorationSummaryStatValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {
                  Array.isArray(
                    explorationData
                      ?.unlockedStampIds
                  )
                    ? explorationData
                        .unlockedStampIds
                        .length
                    : 0
                }
              </Text>

              <Text
                style={[
                  styles.explorationSummaryStatLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                방문 스탬프
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.explorationInsightCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationInsightHeader}>
            <View>
              <Text
                style={[
                  styles.explorationInsightTitle,
                  { color: theme.text },
                ]}
              >
                내 탐험 한눈에
              </Text>
              <Text
                style={[
                  styles.explorationInsightSubtitle,
                  { color: theme.subText },
                ]}
              >
                종로구·중구·서대문구·용산구 탐험 기록을 한눈에 모아봤어요.
              </Text>
            </View>

            <Text
              style={[
                styles.explorationInsightPercent,
                { color: theme.text },
              ]}
            >
              {explorationCompletionPercent}%
            </Text>
          </View>

          <View
            style={[
              styles.explorationInsightProgressTrack,
              { backgroundColor: theme.background },
            ]}
          >
            <View
              style={[
                styles.explorationInsightProgressFill,
                {
                  width: `${explorationCompletionPercent}%`,
                  backgroundColor: theme.strongLine ?? theme.line,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.explorationInsightProgressText,
              { color: theme.subText },
            ]}
          >
            방문 {explorationVisitRecords.length}/{explorationKnownPlaceCount}곳
          </Text>

          <View style={styles.explorationInsightGrid}>
            {[
              {
                label: '여행기',
                value: `${explorationJournalSummary.journalCount}개`,
                icon: '📖',
              },
              {
                label: '사진',
                value: `${explorationJournalSummary.photoCount}장`,
                icon: '📷',
              },
              {
                label: '최신 피드',
                value: `${explorationJournalSummary.sharedCount}개`,
                icon: '📡',
              },
              {
                label: 'GPS 기록',
                value: `${explorationJournalSummary.gpsCount}개`,
                icon: '📍',
              },
              {
                label: '방문일',
                value: `${explorationJourneyDaySummary.visitDayCount}일`,
                icon: '🗓️',
              },
              {
                label: '최장 연속',
                value: `${explorationJourneyDaySummary.longestStreak}일`,
                icon: '🔥',
              },
            ].map((item) => (
              <View
                key={item.label}
                style={[
                  styles.explorationInsightStat,
                  {
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 3 : 10,
                  },
                ]}
              >
                <Text style={styles.explorationInsightStatIcon}>
                  {item.icon}
                </Text>
                <Text
                  style={[
                    styles.explorationInsightStatValue,
                    { color: theme.text },
                  ]}
                >
                  {item.value}
                </Text>
                <Text
                  style={[
                    styles.explorationInsightStatLabel,
                    { color: theme.subText },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {(explorationJournalSummary.needsReshareCount > 0 ||
            explorationJournalSummary.sourceDeletedCount > 0) && (
            <View
              style={[
                styles.explorationInsightNotice,
                {
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationInsightNoticeText,
                  { color: theme.text },
                ]}
              >
                다시 공유 필요 {explorationJournalSummary.needsReshareCount}개
                {explorationJournalSummary.sourceDeletedCount > 0
                  ? ` · 피드만 남음 ${explorationJournalSummary.sourceDeletedCount}개`
                  : ''}
              </Text>
            </View>
          )}
        </View>


        <View
          style={[
            styles.explorationCalendarCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationCalendarHeader}>
            <View style={styles.explorationCalendarTitleBox}>
              <Text
                style={[
                  styles.explorationCalendarTitle,
                  { color: theme.text },
                ]}
              >
                탐험 발자국 달력
              </Text>
              <Text
                style={[
                  styles.explorationCalendarSubtitle,
                  { color: theme.subText },
                ]}
              >
                방문한 날을 누르면 그날의 기록만 볼 수 있어요.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                setExplorationCalendarExpanded(
                  (previous) => !previous
                )
              }
              style={[
                styles.explorationCalendarToggleButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationCalendarToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationCalendarExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.explorationCalendarMonthRow}>
            <Pressable
              onPress={() => {
                setExplorationCalendarMonth((previous) =>
                  shiftMonthKey(previous, -1)
                );
                setExplorationCalendarDateFilter(null);
              }}
              style={[
                styles.explorationCalendarMonthButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationCalendarMonthButtonText,
                  { color: theme.text },
                ]}
              >
                ‹
              </Text>
            </Pressable>

            <Text
              style={[
                styles.explorationCalendarMonthLabel,
                { color: theme.text },
              ]}
            >
              {formatExplorationCalendarMonthLabel(
                explorationCalendarMonth
              )}
            </Text>

            <Pressable
              onPress={() => {
                setExplorationCalendarMonth((previous) =>
                  shiftMonthKey(previous, 1)
                );
                setExplorationCalendarDateFilter(null);
              }}
              style={[
                styles.explorationCalendarMonthButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationCalendarMonthButtonText,
                  { color: theme.text },
                ]}
              >
                ›
              </Text>
            </Pressable>
          </View>

          {explorationCalendarExpanded && (
            <>
              <View style={styles.explorationCalendarStatsRow}>
                {[
                  {
                    label: '방문',
                    value: `${explorationCalendarMonthSummary.visitCount}곳`,
                  },
                  {
                    label: '방문일',
                    value: `${explorationCalendarMonthSummary.visitDayCount}일`,
                  },
                  {
                    label: '여행기',
                    value: `${explorationCalendarMonthSummary.journalCount}개`,
                  },
                  {
                    label: '사진',
                    value: `${explorationCalendarMonthSummary.photoCount}장`,
                  },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={[
                      styles.explorationCalendarStat,
                      {
                        borderColor: theme.line,
                        borderRadius: isCityBlack ? 3 : 9,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.explorationCalendarStatValue,
                        { color: theme.text },
                      ]}
                    >
                      {item.value}
                    </Text>
                    <Text
                      style={[
                        styles.explorationCalendarStatLabel,
                        { color: theme.subText },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              {explorationCalendarMonthSummary.topMood && (
                <View
                  style={[
                    styles.explorationCalendarMoodRow,
                    {
                      backgroundColor: theme.background,
                      borderRadius: isCityBlack ? 2 : 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationCalendarMoodText,
                      { color: theme.text },
                    ]}
                  >
                    이달의 대표 기분{' '}
                    {explorationCalendarMonthSummary.topMood.emoji}{' '}
                    {explorationCalendarMonthSummary.topMood.label}
                  </Text>
                </View>
              )}

              <View style={styles.explorationCalendarWeekdayRow}>
                {EXPLORATION_CALENDAR_WEEKDAYS.map((weekday) => (
                  <Text
                    key={weekday}
                    style={[
                      styles.explorationCalendarWeekday,
                      { color: theme.subText },
                    ]}
                  >
                    {weekday}
                  </Text>
                ))}
              </View>

              <View style={styles.explorationCalendarGrid}>
                {explorationCalendarCells.map((cell) => {
                  const dayRecords = cell.dateKey
                    ? explorationCalendarRecordMap.get(cell.dateKey) ?? []
                    : [];
                  const selected =
                    !!cell.dateKey &&
                    explorationCalendarDateFilter === cell.dateKey;
                  const hasVisit = dayRecords.length > 0;
                  const journalCount = dayRecords.filter((record: any) => {
                    const memo = String(record?.journalMemo ?? '').trim();
                    const mood = String(record?.journalMood ?? '').trim();
                    const photos = normalizeExplorationJournalPhotoUrls(
                      record?.journalPhotoUrls
                    );
                    return !!memo || !!mood || photos.length > 0;
                  }).length;
                  const photoCount = dayRecords.reduce(
                    (total: number, record: any) =>
                      total +
                      normalizeExplorationJournalPhotoUrls(
                        record?.journalPhotoUrls
                      ).length,
                    0
                  );

                  return (
                    <View
                      key={cell.key}
                      style={styles.explorationCalendarDaySlot}
                    >
                      {cell.inMonth ? (
                        <Pressable
                          disabled={!hasVisit}
                          onPress={() => {
                            setExplorationCalendarDateFilter(
                              selected ? null : cell.dateKey
                            );
                            if (!selected) {
                              setExplorationMonthFilter('all');
                            }
                          }}
                          style={({ pressed }) => [
                            styles.explorationCalendarDay,
                            {
                              backgroundColor: selected
                                ? theme.background
                                : 'transparent',
                              borderColor: selected
                                ? theme.strongLine ?? theme.line
                                : hasVisit
                                ? theme.line
                                : 'transparent',
                              borderRadius: isCityBlack ? 2 : 9,
                              opacity: pressed ? 0.65 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.explorationCalendarDayText,
                              {
                                color: hasVisit
                                  ? theme.text
                                  : theme.subText,
                              },
                            ]}
                          >
                            {cell.day}
                          </Text>

                          {hasVisit && (
                            <View
                              style={styles.explorationCalendarDayMetaRow}
                            >
                              <View
                                style={[
                                  styles.explorationCalendarDayDot,
                                  {
                                    backgroundColor:
                                      theme.strongLine ?? theme.line,
                                  },
                                ]}
                              />
                              {journalCount > 0 && (
                                <View
                                  style={[
                                    styles.explorationCalendarDayDot,
                                    { backgroundColor: theme.text },
                                  ]}
                                />
                              )}
                              {photoCount > 0 && (
                                <Text
                                  style={[
                                    styles.explorationCalendarDayPhoto,
                                    { color: theme.subText },
                                  ]}
                                >
                                  📷
                                </Text>
                              )}
                            </View>
                          )}

                          {dayRecords.length > 1 && (
                            <View
                              style={[
                                styles.explorationCalendarDayCountBadge,
                                { backgroundColor: theme.background },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.explorationCalendarDayCountText,
                                  { color: theme.text },
                                ]}
                              >
                                {dayRecords.length}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {explorationCalendarDateFilter && (
                <View
                  style={[
                    styles.explorationCalendarSelectedNotice,
                    {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 3 : 10,
                    },
                  ]}
                >
                  <View style={styles.explorationCalendarSelectedTextBox}>
                    <Text
                      style={[
                        styles.explorationCalendarSelectedTitle,
                        { color: theme.text },
                      ]}
                    >
                      {formatExplorationCalendarDateLabel(
                        explorationCalendarDateFilter
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.explorationCalendarSelectedSubtitle,
                        { color: theme.subText },
                      ]}
                    >
                      방문 기록 {selectedExplorationCalendarRecords.length}개만 표시 중
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      setExplorationCalendarDateFilter(null)
                    }
                    style={[
                      styles.explorationCalendarClearButton,
                      {
                        borderColor: theme.line,
                        borderRadius: isCityBlack ? 3 : 9,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.explorationCalendarClearText,
                        { color: theme.text },
                      ]}
                    >
                      해제
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.explorationCalendarActionRow}>
                <Pressable
                  onPress={() => {
                    setExplorationCalendarDateFilter(null);
                    setExplorationMonthFilter(explorationCalendarMonth);
                    setExplorationFiltersExpanded(false);
                  }}
                  style={[
                    styles.explorationCalendarActionButton,
                    {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 3 : 10,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationCalendarActionText,
                      { color: theme.text },
                    ]}
                  >
                    이달 기록만 보기
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const latestDateKey =
                      explorationJourneyDaySummary.latestVisitDate;

                    if (latestDateKey) {
                      setExplorationCalendarMonth(
                        latestDateKey.slice(0, 7)
                      );
                      setExplorationCalendarDateFilter(latestDateKey);
                      setExplorationMonthFilter('all');
                    }
                  }}
                  disabled={!explorationJourneyDaySummary.latestVisitDate}
                  style={[
                    styles.explorationCalendarActionButton,
                    {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 3 : 10,
                      opacity: explorationJourneyDaySummary.latestVisitDate
                        ? 1
                        : 0.45,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationCalendarActionText,
                      { color: theme.text },
                    ]}
                  >
                    최근 방문일
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={styles.explorationProgressSection}>
          <View style={styles.explorationProgressHeader}>
            <Text
              style={[
                styles.explorationSectionTitle,
                { color: theme.text },
              ]}
            >
              테마 진행 현황
            </Text>
            <Text
              style={[
                styles.explorationProgressHint,
                { color: theme.subText },
              ]}
            >
              누르면 해당 테마만 보여요
            </Text>
          </View>

          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.explorationProgressRow}
          >
            {explorationThemeProgressItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setExplorationThemeFilter(item.id as ExplorationThemeFilter);
                  setExplorationFiltersExpanded(true);
                }}
                style={({ pressed }) => [
                  styles.explorationProgressCard,
                  {
                    backgroundColor:
                      explorationThemeFilter === item.id
                        ? theme.background
                        : theme.card,
                    borderColor:
                      explorationThemeFilter === item.id
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                    borderRadius: isCityBlack ? 3 : 12,
                    opacity: pressed ? 0.68 : 1,
                  },
                ]}
              >
                <View style={styles.explorationProgressCardHeader}>
                  <Text style={styles.explorationProgressIcon}>
                    {item.icon}
                  </Text>
                  <Text
                    style={[
                      styles.explorationProgressStatus,
                      { color: theme.subText },
                    ]}
                  >
                    {item.completed ? '완료' : `${item.percent}%`}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.explorationProgressName,
                    { color: theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.label} 탐험
                </Text>
                <Text
                  style={[
                    styles.explorationProgressCount,
                    { color: theme.subText },
                  ]}
                >
                  {item.visitedCount}/{item.totalCount}곳 방문
                </Text>
                <View
                  style={[
                    styles.explorationProgressTrack,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <View
                    style={[
                      styles.explorationProgressFill,
                      {
                        width: `${item.percent}%`,
                        backgroundColor: theme.strongLine ?? theme.line,
                      },
                    ]}
                  />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>


        <View
          style={[
            styles.explorationDistrictRoadmapCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFeatureHeader}>
            <View style={styles.explorationFeatureTitleBox}>
              <Text
                style={[
                  styles.explorationFeatureTitle,
                  { color: theme.text },
                ]}
              >
                대한민국 탐험 지역 도감
              </Text>
              <Text
                style={[
                  styles.explorationFeatureSubtitle,
                  { color: theme.subText },
                ]}
              >
                서울 25개 자치구와 부산 16개 구·군 전체 탐험이 열렸어요.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setExplorationDistrictRoadmapExpanded((current) => !current)
              }
              style={({ pressed }) => [
                styles.explorationFeatureToggle,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationFeatureToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationDistrictRoadmapExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          {explorationDistrictRoadmapExpanded && (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.explorationDistrictRoadmapRow}
            >
              {explorationDistrictRoadmapItems.map((item) => {
                const active = item.status === 'active';

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (active) {
                        setExplorationDistrictFilter(item.name);
                        setExplorationFiltersExpanded(true);
                        setExplorationViewMode('list');
                        return;
                      }

                      setNoticeModal({
                        title: `${item.name} 준비 중`,
                        message:
                          '서울 25개 자치구와 부산 16개 구·군, 제주 2개 행정시, 인천 제물포구·영종구·미추홀구·연수구·남동구·부평구·계양구 대표 장소 70곳 탐험이 열렸어요.',
                      });
                    }}
                    style={({ pressed }) => [
                      styles.explorationDistrictRoadmapItem,
                      {
                        backgroundColor: active ? theme.background : theme.card,
                        borderColor:
                          active
                            ? theme.strongLine ?? theme.line
                            : theme.line,
                        borderRadius: isCityBlack ? 3 : 12,
                        opacity: pressed ? 0.65 : item.status === 'planned' ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={styles.explorationDistrictRoadmapTop}>
                      <Text style={styles.explorationDistrictRoadmapIcon}>
                        {item.icon}
                      </Text>
                      <Text
                        style={[
                          styles.explorationDistrictRoadmapOrder,
                          { color: theme.subText },
                        ]}
                      >
                        {item.order}단계
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.explorationDistrictRoadmapName,
                        { color: theme.text },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.explorationDistrictRoadmapSubtitle,
                        { color: theme.subText },
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                    <Text
                      style={[
                        styles.explorationDistrictRoadmapCount,
                        { color: theme.text },
                      ]}
                    >
                      {active
                        ? `${item.visitedCount}/${item.totalCount}곳`
                        : '순차 공개'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View
          style={[
            styles.explorationWeeklyCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFeatureHeader}>
            <View style={styles.explorationFeatureTitleBox}>
              <Text
                style={[
                  styles.explorationFeatureTitle,
                  { color: theme.text },
                ]}
              >
                이번 주 탐험 도전
              </Text>
              <Text
                style={[
                  styles.explorationFeatureSubtitle,
                  { color: theme.subText },
                ]}
              >
                방문·여행기·사진·피드 상태를 한 주 단위로 관리해요.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setExplorationWeeklyChallengeExpanded((current) => !current)
              }
              style={({ pressed }) => [
                styles.explorationFeatureToggle,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationFeatureToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationWeeklyChallengeExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          {explorationWeeklyChallengeExpanded && (
            <>
              <View style={styles.explorationWeeklyProgressHeader}>
                <Text
                  style={[
                    styles.explorationWeeklyProgressText,
                    { color: theme.text },
                  ]}
                >
                  {explorationWeeklySummary.completedCount}/4 완료
                </Text>
                <Text
                  style={[
                    styles.explorationWeeklyDateText,
                    { color: theme.subText },
                  ]}
                >
                  {`${explorationWeeklySummary.start.getMonth() + 1}.${explorationWeeklySummary.start.getDate()} ~ ${explorationWeeklySummary.endInclusive.getMonth() + 1}.${explorationWeeklySummary.endInclusive.getDate()}`}
                </Text>
              </View>
              <View
                style={[
                  styles.explorationWeeklyProgressTrack,
                  { backgroundColor: theme.background },
                ]}
              >
                <View
                  style={[
                    styles.explorationWeeklyProgressFill,
                    {
                      width: `${(explorationWeeklySummary.completedCount / 4) * 100}%`,
                      backgroundColor: theme.strongLine ?? theme.line,
                    },
                  ]}
                />
              </View>

              <View style={styles.explorationWeeklyTaskList}>
                {explorationWeeklySummary.tasks.map((task) => (
                  <Pressable
                    key={task.id}
                    onPress={() => {
                      if (task.completed) return;
                      if (task.id === 'visit') {
                        router.push('/explore' as any);
                      } else if (task.id === 'journal') {
                        applyExplorationSmartTask('unwritten');
                      } else if (task.id === 'photo') {
                        applyExplorationSmartTask('photo-missing');
                      } else {
                        applyExplorationSmartTask('needs-reshare');
                      }
                    }}
                    style={({ pressed }) => [
                      styles.explorationWeeklyTaskItem,
                      {
                        borderColor: theme.line,
                        backgroundColor: task.completed ? theme.background : theme.card,
                        borderRadius: isCityBlack ? 2 : 10,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.explorationWeeklyTaskIcon}>
                      {task.completed ? '✅' : task.icon}
                    </Text>
                    <View style={styles.explorationWeeklyTaskTextBox}>
                      <Text
                        style={[
                          styles.explorationWeeklyTaskTitle,
                          { color: theme.text },
                        ]}
                      >
                        {task.title}
                      </Text>
                      <Text
                        style={[
                          styles.explorationWeeklyTaskDescription,
                          { color: theme.subText },
                        ]}
                      >
                        {task.description}
                      </Text>
                    </View>
                    {!task.completed && (
                      <Text
                        style={[
                          styles.explorationWeeklyTaskArrow,
                          { color: theme.subText },
                        ]}
                      >
                        ›
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>

        <View
          style={[
            styles.explorationPlannerCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFeatureHeader}>
            <View style={styles.explorationFeatureTitleBox}>
              <Text
                style={[
                  styles.explorationFeatureTitle,
                  { color: theme.text },
                ]}
              >
                다음 탐험 코스 만들기
              </Text>
              <Text
                style={[
                  styles.explorationFeatureSubtitle,
                  { color: theme.subText },
                ]}
              >
                미방문 장소를 최대 5곳까지 골라 하루 코스를 만들어요.
              </Text>
            </View>
            <Pressable
              onPress={() => setExplorationPlannerExpanded((current) => !current)}
              style={({ pressed }) => [
                styles.explorationFeatureToggle,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationFeatureToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationPlannerExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          {explorationPlannerExpanded && (
            <>
              <View style={styles.explorationPlannerActionRow}>
                <Pressable
                  onPress={buildExplorationRecommendedPlan}
                  style={({ pressed }) => [
                    styles.explorationPlannerActionButton,
                    {
                      borderColor: theme.strongLine ?? theme.line,
                      borderRadius: isCityBlack ? 2 : 9,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationPlannerActionText,
                      { color: theme.text },
                    ]}
                  >
                    추천 코스 자동 만들기
                  </Text>
                </Pressable>
                <Pressable
                  onPress={addWishlistToExplorationPlan}
                  style={({ pressed }) => [
                    styles.explorationPlannerActionButton,
                    {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 2 : 9,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationPlannerActionText,
                      { color: theme.text },
                    ]}
                  >
                    별표 장소 담기
                  </Text>
                </Pressable>
              </View>

              <View
                style={[
                  styles.explorationPlannerSummary,
                  {
                    borderColor: theme.line,
                    backgroundColor: theme.background,
                    borderRadius: isCityBlack ? 2 : 10,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.explorationPlannerSummaryText,
                    { color: theme.text },
                  ]}
                >
                  코스 {explorationPlanItems.length}/5곳
                </Text>
                <Text
                  style={[
                    styles.explorationPlannerSummarySubText,
                    { color: theme.subText },
                  ]}
                >
                  {explorationPlanItems.length > 1
                    ? `표시 위치 기준 약 ${explorationPlanDistanceKm.toFixed(1)}km`
                    : '장소를 2곳 이상 담으면 연결 거리를 계산해요.'}
                </Text>
                {explorationPlanItems.length > 0 && (
                  <Pressable
                    onPress={() => setExplorationPlanPlaceIds([])}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text
                      style={[
                        styles.explorationPlannerClearText,
                        { color: theme.subText },
                      ]}
                    >
                      코스 비우기
                    </Text>
                  </Pressable>
                )}
              </View>

              {explorationPlanItems.length > 0 && (
                <View style={styles.explorationPlannerRouteList}>
                  {explorationPlanItems.map((item, index) => (
                    <View
                      key={item.placeId}
                      style={[
                        styles.explorationPlannerRouteItem,
                        {
                          borderColor: theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.explorationPlannerRouteOrder,
                          {
                            borderColor: theme.strongLine ?? theme.line,
                            borderRadius: isCityBlack ? 2 : 999,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationPlannerRouteOrderText,
                            { color: theme.text },
                          ]}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          router.push(`/explore/place/${item.placeId}` as any)
                        }
                        style={({ pressed }) => [
                          styles.explorationPlannerRouteTextBox,
                          { opacity: pressed ? 0.65 : 1 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationPlannerRouteName,
                            { color: theme.text },
                          ]}
                        >
                          {item.placeMeta.name}
                        </Text>
                        <Text
                          style={[
                            styles.explorationPlannerRouteMeta,
                            { color: theme.subText },
                          ]}
                        >
                          {item.placeMeta.district} · {item.placeMeta.areaType}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => toggleExplorationPlanPlace(item.placeId)}
                        style={({ pressed }) => [
                          styles.explorationPlannerRemoveButton,
                          { opacity: pressed ? 0.6 : 1 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationPlannerRemoveText,
                            { color: theme.subText },
                          ]}
                        >
                          ×
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Text
                style={[
                  styles.explorationPlannerSectionLabel,
                  { color: theme.text },
                ]}
              >
                미방문 장소
              </Text>

              {explorationUnvisitedCatalogPlaces.length > 0 ? (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.explorationPlannerCandidateRow}
                >
                  {explorationUnvisitedCatalogPlaces.map((item) => {
                    const selected = explorationPlanPlaceIds.includes(item.placeId);
                    const wished = explorationWishlistPlaceIds.includes(item.placeId);

                    return (
                      <View
                        key={item.placeId}
                        style={[
                          styles.explorationPlannerCandidateCard,
                          {
                            backgroundColor: selected ? theme.background : theme.card,
                            borderColor: selected
                              ? theme.strongLine ?? theme.line
                              : theme.line,
                            borderRadius: isCityBlack ? 3 : 12,
                          },
                        ]}
                      >
                        <View style={styles.explorationPlannerCandidateTop}>
                          <Text style={styles.explorationPlannerCandidateIcon}>
                            {EXPLORATION_COLLECTION_ICON_BY_PLACE[item.placeId] ?? '📍'}
                          </Text>
                          <Pressable
                            onPress={() => toggleExplorationWishlistPlace(item.placeId)}
                            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
                          >
                            <Text style={styles.explorationPlannerWishlistIcon}>
                              {wished ? '★' : '☆'}
                            </Text>
                          </Pressable>
                        </View>
                        <Text
                          style={[
                            styles.explorationPlannerCandidateName,
                            { color: theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.placeMeta.name}
                        </Text>
                        <Text
                          style={[
                            styles.explorationPlannerCandidateMeta,
                            { color: theme.subText },
                          ]}
                          numberOfLines={1}
                        >
                          {item.placeMeta.areaType}
                        </Text>
                        <View style={styles.explorationPlannerCandidateButtons}>
                          <Pressable
                            onPress={() => toggleExplorationPlanPlace(item.placeId)}
                            style={({ pressed }) => [
                              styles.explorationPlannerCandidateButton,
                              {
                                borderColor: theme.line,
                                borderRadius: isCityBlack ? 2 : 7,
                                opacity: pressed ? 0.6 : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.explorationPlannerCandidateButtonText,
                                { color: theme.text },
                              ]}
                            >
                              {selected ? '빼기' : '담기'}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              router.push(`/explore/place/${item.placeId}` as any)
                            }
                            style={({ pressed }) => [
                              styles.explorationPlannerCandidateButton,
                              {
                                borderColor: theme.line,
                                borderRadius: isCityBlack ? 2 : 7,
                                opacity: pressed ? 0.6 : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.explorationPlannerCandidateButtonText,
                                { color: theme.text },
                              ]}
                            >
                              보기
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View
                  style={[
                    styles.explorationPlannerCompleteBox,
                    {
                      borderColor: theme.line,
                      backgroundColor: theme.background,
                      borderRadius: isCityBlack ? 2 : 10,
                    },
                  ]}
                >
                  <Text style={styles.explorationPlannerCompleteIcon}>🏆</Text>
                  <Text
                    style={[
                      styles.explorationPlannerCompleteText,
                      { color: theme.text },
                    ]}
                  >
                    현재 등록된 종로구·중구·서대문구·용산구 탐험 장소를 모두 방문했어요.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>


        <View
          style={[
            styles.explorationActionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFeatureHeader}>
            <View style={styles.explorationFeatureTitleBox}>
              <Text
                style={[
                  styles.explorationFeatureTitle,
                  { color: theme.text },
                ]}
              >
                지금 할 탐험
              </Text>
              <Text
                style={[
                  styles.explorationFeatureSubtitle,
                  { color: theme.subText },
                ]}
              >
                기록 상태를 확인하고 필요한 작업으로 바로 이동해요.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setExplorationActionCenterExpanded((current) => !current)
              }
              style={({ pressed }) => [
                styles.explorationFeatureToggle,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationFeatureToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationActionCenterExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          {explorationActionCenterExpanded && (
            <>
              <View style={styles.explorationHealthGrid}>
                {[
                  {
                    label: '여행기 작성률',
                    value: explorationHealthSummary.journalRate,
                  },
                  {
                    label: '사진 기록률',
                    value: explorationHealthSummary.photoRate,
                  },
                  {
                    label: 'GPS 보존률',
                    value: explorationHealthSummary.gpsRate,
                  },
                  {
                    label: '피드 최신률',
                    value: explorationHealthSummary.feedFreshRate,
                  },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={[
                      styles.explorationHealthItem,
                      {
                        borderColor: theme.line,
                        backgroundColor: theme.background,
                        borderRadius: isCityBlack ? 2 : 10,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.explorationHealthValue,
                        { color: theme.text },
                      ]}
                    >
                      {item.value}%
                    </Text>
                    <Text
                      style={[
                        styles.explorationHealthLabel,
                        { color: theme.subText },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              {explorationSmartTasks.length > 0 ? (
                <View style={styles.explorationTaskList}>
                  {explorationSmartTasks.map((task) => (
                    <Pressable
                      key={task.id}
                      onPress={() => applyExplorationSmartTask(task.id)}
                      style={({ pressed }) => [
                        styles.explorationTaskButton,
                        {
                          borderColor: theme.line,
                          borderRadius: isCityBlack ? 2 : 10,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.explorationTaskIcon}>
                        {task.icon}
                      </Text>
                      <View style={styles.explorationTaskTextBox}>
                        <Text
                          style={[
                            styles.explorationTaskTitle,
                            { color: theme.text },
                          ]}
                        >
                          {task.title}
                        </Text>
                        <Text
                          style={[
                            styles.explorationTaskDescription,
                            { color: theme.subText },
                          ]}
                          numberOfLines={1}
                        >
                          {task.description}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.explorationTaskCountBadge,
                          {
                            borderColor: theme.strongLine ?? theme.line,
                            borderRadius: isCityBlack ? 2 : 999,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationTaskCountText,
                            { color: theme.text },
                          ]}
                        >
                          {task.count}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.explorationTaskArrow,
                          { color: theme.subText },
                        ]}
                      >
                        ›
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    styles.explorationTaskCompleteBox,
                    {
                      borderColor: theme.line,
                      backgroundColor: theme.background,
                      borderRadius: isCityBlack ? 2 : 10,
                    },
                  ]}
                >
                  <Text style={styles.explorationTaskCompleteIcon}>✅</Text>
                  <Text
                    style={[
                      styles.explorationTaskCompleteText,
                      { color: theme.text },
                    ]}
                  >
                    지금 정리할 탐험 기록이 없어요.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View
          style={[
            styles.explorationReportCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFeatureHeader}>
            <View style={styles.explorationFeatureTitleBox}>
              <Text
                style={[
                  styles.explorationFeatureTitle,
                  { color: theme.text },
                ]}
              >
                월간 탐험 리포트
              </Text>
              <Text
                style={[
                  styles.explorationFeatureSubtitle,
                  { color: theme.subText },
                ]}
              >
                선택한 달의 방문·여행기·사진을 한눈에 봐요.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setExplorationMonthlyReportExpanded((current) => !current)
              }
              style={({ pressed }) => [
                styles.explorationFeatureToggle,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationFeatureToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationMonthlyReportExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          {explorationMonthlyReportExpanded && (
            <>
              <View
                ref={explorationMonthlyReportCaptureRef}
                collapsable={false}
                style={[
                  styles.explorationReportCapture,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 2 : 12,
                  },
                ]}
              >
                <View style={styles.explorationReportCaptureHeader}>
                  <View>
                    <Text
                      style={[
                        styles.explorationReportBrand,
                        { color: theme.subText },
                      ]}
                    >
                      ROOT EXPLORATION REPORT
                    </Text>
                    <Text
                      style={[
                        styles.explorationReportMonth,
                        { color: theme.text },
                      ]}
                    >
                      {formatExplorationCalendarMonthLabel(
                        explorationCalendarMonth
                      )}
                    </Text>
                  </View>
                  <Text style={styles.explorationReportCompass}>🧭</Text>
                </View>

                <View style={styles.explorationReportStatsGrid}>
                  {[
                    {
                      label: '방문 장소',
                      value: `${explorationCalendarMonthSummary.visitCount}곳`,
                      difference: formatExplorationDifference(
                        explorationCalendarMonthSummary.visitCount,
                        explorationPreviousMonthSummary.visitCount,
                        '곳'
                      ),
                    },
                    {
                      label: '탐험한 날',
                      value: `${explorationCalendarMonthSummary.visitDayCount}일`,
                      difference: formatExplorationDifference(
                        explorationCalendarMonthSummary.visitDayCount,
                        explorationPreviousMonthSummary.visitDayCount,
                        '일'
                      ),
                    },
                    {
                      label: '여행기',
                      value: `${explorationCalendarMonthSummary.journalCount}개`,
                      difference: formatExplorationDifference(
                        explorationCalendarMonthSummary.journalCount,
                        explorationPreviousMonthSummary.journalCount,
                        '개'
                      ),
                    },
                    {
                      label: '사진',
                      value: `${explorationCalendarMonthSummary.photoCount}장`,
                      difference: formatExplorationDifference(
                        explorationCalendarMonthSummary.photoCount,
                        explorationPreviousMonthSummary.photoCount,
                        '장'
                      ),
                    },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={[
                        styles.explorationReportStat,
                        {
                          borderColor: theme.line,
                          backgroundColor: theme.background,
                          borderRadius: isCityBlack ? 2 : 9,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.explorationReportStatValue,
                          { color: theme.text },
                        ]}
                      >
                        {item.value}
                      </Text>
                      <Text
                        style={[
                          styles.explorationReportStatLabel,
                          { color: theme.subText },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.explorationReportDifference,
                          { color: theme.mutedText ?? theme.subText },
                        ]}
                      >
                        {item.difference}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.explorationReportHighlight,
                    {
                      borderColor: theme.line,
                      backgroundColor: theme.background,
                      borderRadius: isCityBlack ? 2 : 9,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationReportHighlightText,
                      { color: theme.text },
                    ]}
                  >
                    {explorationCalendarMonthSummary.topMood
                      ? `${explorationCalendarMonthSummary.topMood.emoji} 이달의 기분 · ${explorationCalendarMonthSummary.topMood.label}`
                      : '🙂 이달에는 아직 기분 기록이 없어요'}
                  </Text>
                  <Text
                    style={[
                      styles.explorationReportHighlightText,
                      { color: theme.subText },
                    ]}
                  >
                    {explorationCurrentMonthDetailedSummary.topAreaType
                      ? `가장 많이 찾은 유형 · ${explorationCurrentMonthDetailedSummary.topAreaType}`
                      : '방문 기록을 남기면 장소 유형을 분석해요'}
                  </Text>
                  <Text
                    style={[
                      styles.explorationReportHighlightText,
                      { color: theme.subText },
                    ]}
                  >
                    {explorationBestMonthSummary
                      ? `최고의 달 · ${formatMonthLabel(
                          explorationBestMonthSummary.monthKey
                        )} (${explorationBestMonthSummary.visitCount}곳)`
                      : '최고의 달 · -'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.explorationReportFooter,
                    { color: theme.subText },
                  ]}
                >
                  현실을 RPG처럼 · ROOT 🌱
                </Text>
              </View>

              <Pressable
                onPress={() => void shareExplorationMonthlyReport()}
                disabled={explorationMonthlyReportSharing}
                style={({ pressed }) => [
                  styles.explorationReportShareButton,
                  {
                    borderColor: theme.strongLine ?? theme.line,
                    borderRadius: isCityBlack ? 2 : 9,
                    opacity:
                      pressed || explorationMonthlyReportSharing ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.explorationReportShareButtonText,
                    { color: theme.text },
                  ]}
                >
                  {explorationMonthlyReportSharing
                    ? '리포트 만드는 중...'
                    : '월간 리포트 외부공유'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View
          style={[
            styles.explorationInsightsCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFeatureHeader}>
            <View style={styles.explorationFeatureTitleBox}>
              <Text
                style={[
                  styles.explorationFeatureTitle,
                  { color: theme.text },
                ]}
              >
                탐험 인사이트
              </Text>
              <Text
                style={[
                  styles.explorationFeatureSubtitle,
                  { color: theme.subText },
                ]}
              >
                이달에 어떤 장소와 기분이 많았는지 분석해요.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setExplorationInsightsExpanded((current) => !current)
              }
              style={({ pressed }) => [
                styles.explorationFeatureToggle,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationFeatureToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationInsightsExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          {explorationInsightsExpanded && (
            <View style={styles.explorationInsightsBody}>
              <Text
                style={[
                  styles.explorationInsightSectionLabel,
                  { color: theme.text },
                ]}
              >
                장소 유형
              </Text>
              {explorationMonthlyAreaTypeStats.length > 0 ? (
                explorationMonthlyAreaTypeStats.map((item) => (
                  <View key={item.label} style={styles.explorationInsightRow}>
                    <Text
                      style={[
                        styles.explorationInsightLabel,
                        { color: theme.subText },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <View
                      style={[
                        styles.explorationInsightTrack,
                        { backgroundColor: theme.background },
                      ]}
                    >
                      <View
                        style={[
                          styles.explorationInsightFill,
                          {
                            width: `${item.percent}%`,
                            backgroundColor: theme.strongLine ?? theme.line,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.explorationInsightCount,
                        { color: theme.text },
                      ]}
                    >
                      {item.count}
                    </Text>
                  </View>
                ))
              ) : (
                <Text
                  style={[
                    styles.explorationInsightEmpty,
                    { color: theme.subText },
                  ]}
                >
                  이달 방문 기록이 없어요.
                </Text>
              )}

              <Text
                style={[
                  styles.explorationInsightSectionLabel,
                  styles.explorationInsightSecondLabel,
                  { color: theme.text },
                ]}
              >
                기분 분포
              </Text>
              {explorationMonthlyMoodStats.length > 0 ? (
                <View style={styles.explorationMoodInsightWrap}>
                  {explorationMonthlyMoodStats.map((item) => (
                    <View
                      key={item.mood?.id ?? String(item.count)}
                      style={[
                        styles.explorationMoodInsightChip,
                        {
                          borderColor: theme.line,
                          backgroundColor: theme.background,
                          borderRadius: isCityBlack ? 2 : 999,
                        },
                      ]}
                    >
                      <Text style={styles.explorationMoodInsightEmoji}>
                        {item.mood?.emoji ?? '🙂'}
                      </Text>
                      <Text
                        style={[
                          styles.explorationMoodInsightText,
                          { color: theme.text },
                        ]}
                      >
                        {item.mood?.label ?? '기분'} {item.count}개 · {item.percent}%
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={[
                    styles.explorationInsightEmpty,
                    { color: theme.subText },
                  ]}
                >
                  이달 기분 기록이 없어요.
                </Text>
              )}
            </View>
          )}
        </View>

        {explorationMemoryHighlights.length > 0 && (
          <View
            style={[
              styles.explorationHighlightsCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 16,
              },
            ]}
          >
            <View style={styles.explorationFeatureHeader}>
              <View style={styles.explorationFeatureTitleBox}>
                <Text
                  style={[
                    styles.explorationFeatureTitle,
                    { color: theme.text },
                  ]}
                >
                  기억에 남는 탐험
                </Text>
                <Text
                  style={[
                    styles.explorationFeatureSubtitle,
                    { color: theme.subText },
                  ]}
                >
                  최근·사진·이야기를 기준으로 여행기를 다시 꺼내 봐요.
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  setExplorationHighlightsExpanded((current) => !current)
                }
                style={({ pressed }) => [
                  styles.explorationFeatureToggle,
                  {
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 2 : 8,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.explorationFeatureToggleText,
                    { color: theme.text },
                  ]}
                >
                  {explorationHighlightsExpanded ? '접기' : '펴기'}
                </Text>
              </Pressable>
            </View>

            {explorationHighlightsExpanded && (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.explorationHighlightsRow}
              >
                {explorationMemoryHighlights.map((item) => {
                  const placeId = String(item.record?.placeId ?? '').trim();
                  const placeMeta = EXPLORATION_PLACE_META[placeId];
                  const mood = getExplorationJournalMood(item.record?.journalMood);
                  const photoCount = normalizeExplorationJournalPhotoUrls(
                    item.record?.journalPhotoUrls
                  ).length;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => openExplorationJournalDetail(item.record)}
                      style={({ pressed }) => [
                        styles.explorationHighlightItem,
                        {
                          borderColor: theme.line,
                          backgroundColor: theme.background,
                          borderRadius: isCityBlack ? 3 : 12,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <View style={styles.explorationHighlightTop}>
                        <Text style={styles.explorationHighlightIcon}>
                          {item.icon}
                        </Text>
                        <Text
                          style={[
                            styles.explorationHighlightLabel,
                            { color: theme.subText },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.explorationHighlightName,
                          { color: theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {placeMeta?.name ?? placeId}
                      </Text>
                      <Text
                        style={[
                          styles.explorationHighlightMeta,
                          { color: theme.subText },
                        ]}
                        numberOfLines={1}
                      >
                        {mood ? `${mood.emoji} ${mood.label}` : '기분 미선택'} · 사진 {photoCount}장
                      </Text>
                      <Text
                        style={[
                          styles.explorationHighlightMemo,
                          { color: theme.text },
                        ]}
                        numberOfLines={3}
                      >
                        {String(item.record?.journalMemo ?? '').trim() || '사진과 기분으로 남긴 여행기'}
                      </Text>
                      <Text
                        style={[
                          styles.explorationHighlightOpen,
                          { color: theme.subText },
                        ]}
                      >
                        상세 보기 ›
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}


        <View
          style={[
            styles.explorationMilestoneCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFeatureHeader}>
            <View style={styles.explorationFeatureTitleBox}>
              <Text
                style={[
                  styles.explorationFeatureTitle,
                  { color: theme.text },
                ]}
              >
                탐험 마일스톤
              </Text>
              <Text
                style={[
                  styles.explorationFeatureSubtitle,
                  { color: theme.subText },
                ]}
              >
                {explorationCompletedMilestoneCount}/4개 분야에서 첫 목표를 달성했어요.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setExplorationMilestonesExpanded((current) => !current)
              }
              style={({ pressed }) => [
                styles.explorationFeatureToggle,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationFeatureToggleText,
                  { color: theme.text },
                ]}
              >
                {explorationMilestonesExpanded ? '접기' : '펴기'}
              </Text>
            </Pressable>
          </View>

          {explorationMilestonesExpanded && (
            <View style={styles.explorationMilestoneList}>
              {explorationMilestoneItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.explorationMilestoneItem,
                    {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 2 : 10,
                    },
                  ]}
                >
                  <Text style={styles.explorationMilestoneIcon}>
                    {item.icon}
                  </Text>
                  <View style={styles.explorationMilestoneTextBox}>
                    <View style={styles.explorationMilestoneTitleRow}>
                      <Text
                        style={[
                          styles.explorationMilestoneTitle,
                          { color: theme.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.explorationMilestoneValue,
                          { color: theme.text },
                        ]}
                      >
                        {item.current}{item.unit}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.explorationMilestoneNext,
                        { color: theme.subText },
                      ]}
                    >
                      {item.completed
                        ? '최종 마일스톤 달성'
                        : `다음 목표 ${item.nextGoal}${item.unit}`}
                    </Text>
                    <View
                      style={[
                        styles.explorationMilestoneTrack,
                        { backgroundColor: theme.background },
                      ]}
                    >
                      <View
                        style={[
                          styles.explorationMilestoneFill,
                          {
                            width: `${item.percent}%`,
                            backgroundColor: theme.strongLine ?? theme.line,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {explorationNextRecommendation && (
          <View
            style={[
              styles.explorationRecommendationCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 16,
              },
            ]}
          >
            <View style={styles.explorationRecommendationHeader}>
              <View style={styles.explorationRecommendationTitleBox}>
                <Text
                  style={[
                    styles.explorationRecommendationTitle,
                    { color: theme.text },
                  ]}
                >
                  다음 탐험 추천
                </Text>
                <Text
                  style={[
                    styles.explorationRecommendationSubtitle,
                    { color: theme.subText },
                  ]}
                >
                  가장 완성에 가까운 테마부터 이어가 보세요.
                </Text>
              </View>
              <Text style={styles.explorationRecommendationThemeIcon}>
                {explorationNextRecommendation.icon}
              </Text>
            </View>

            <View style={styles.explorationRecommendationProgressRow}>
              <View style={styles.explorationRecommendationProgressTextBox}>
                <Text
                  style={[
                    styles.explorationRecommendationThemeName,
                    { color: theme.text },
                  ]}
                >
                  {explorationNextRecommendation.label} 탐험
                </Text>
                <Text
                  style={[
                    styles.explorationRecommendationProgressText,
                    { color: theme.subText },
                  ]}
                >
                  {explorationNextRecommendation.visitedCount}/
                  {explorationNextRecommendation.totalCount}곳 · 완성까지{' '}
                  {explorationNextRecommendation.missingPlaceIds.length}곳
                </Text>
              </View>

              <Text
                style={[
                  styles.explorationRecommendationPercent,
                  { color: theme.text },
                ]}
              >
                {explorationNextRecommendation.percent}%
              </Text>
            </View>

            <View
              style={[
                styles.explorationRecommendationProgressTrack,
                { backgroundColor: theme.background },
              ]}
            >
              <View
                style={[
                  styles.explorationRecommendationProgressFill,
                  {
                    width: `${explorationNextRecommendation.percent}%`,
                    backgroundColor: theme.strongLine ?? theme.line,
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.explorationRecommendationMissingLabel,
                { color: theme.subText },
              ]}
            >
              아직 방문하지 않은 장소
            </Text>

            <View style={styles.explorationRecommendationPlaceWrap}>
              {explorationNextRecommendation.missingPlaceIds
                .slice(0, 3)
                .map((placeId: string) => {
                  const placeMeta = EXPLORATION_PLACE_META[placeId];
                  return (
                    <Pressable
                      key={placeId}
                      onPress={() =>
                        router.push(
                          `/explore/place/${placeId}` as any
                        )
                      }
                      style={({ pressed }) => [
                        styles.explorationRecommendationPlaceButton,
                        {
                          borderColor: theme.line,
                          borderRadius: isCityBlack ? 3 : 10,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={styles.explorationRecommendationPlaceIcon}
                      >
                        {EXPLORATION_COLLECTION_ICON_BY_PLACE[placeId] ?? '📍'}
                      </Text>
                      <View style={styles.explorationRecommendationPlaceTextBox}>
                        <Text
                          style={[
                            styles.explorationRecommendationPlaceName,
                            { color: theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {placeMeta?.name ?? placeId}
                        </Text>
                        <Text
                          style={[
                            styles.explorationRecommendationPlaceMeta,
                            { color: theme.subText },
                          ]}
                          numberOfLines={1}
                        >
                          {placeMeta?.district ?? '탐험'} ·{' '}
                          {placeMeta?.areaType ?? '장소'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.explorationRecommendationPlaceArrow,
                          { color: theme.subText },
                        ]}
                      >
                        ›
                      </Text>
                    </Pressable>
                  );
                })}
            </View>

            <Pressable
              onPress={() => {
                setExplorationThemeFilter(
                  explorationNextRecommendation.id as ExplorationThemeFilter
                );
                setExplorationFiltersExpanded(false);
              }}
              style={[
                styles.explorationRecommendationThemeButton,
                {
                  borderColor: theme.strongLine ?? theme.line,
                  borderRadius: isCityBlack ? 3 : 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationRecommendationThemeButtonText,
                  { color: theme.text },
                ]}
              >
                이 테마 기록 보기
              </Text>
            </Pressable>
          </View>
        )}

        {explorationNearbyRecommendations.length > 0 && (
          <View
            style={[
              styles.explorationNearbyCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 16,
              },
            ]}
          >
            <View style={styles.explorationNearbyHeader}>
              <View>
                <Text
                  style={[
                    styles.explorationNearbyTitle,
                    { color: theme.text },
                  ]}
                >
                  최근 탐험 근처
                </Text>
                <Text
                  style={[
                    styles.explorationNearbySubtitle,
                    { color: theme.subText },
                  ]}
                >
                  마지막 방문 장소의 대표 위치에서 직선거리로 계산했어요.
                </Text>
              </View>
              <Text style={styles.explorationNearbyIcon}>🧭</Text>
            </View>

            <View style={styles.explorationNearbyList}>
              {explorationNearbyRecommendations.map((item) => (
                <Pressable
                  key={item.placeId}
                  onPress={() =>
                    router.push(`/explore/place/${item.placeId}` as any)
                  }
                  style={({ pressed }) => [
                    styles.explorationNearbyButton,
                    {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 2 : 10,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text style={styles.explorationNearbyPlaceIcon}>
                    {EXPLORATION_COLLECTION_ICON_BY_PLACE[item.placeId] ?? '📍'}
                  </Text>
                  <View style={styles.explorationNearbyTextBox}>
                    <Text
                      style={[
                        styles.explorationNearbyName,
                        { color: theme.text },
                      ]}
                    >
                      {item.placeMeta.name}
                    </Text>
                    <Text
                      style={[
                        styles.explorationNearbyMeta,
                        { color: theme.subText },
                      ]}
                    >
                      {item.placeMeta.district} · {item.placeMeta.areaType}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.explorationNearbyDistance,
                      { color: theme.text },
                    ]}
                  >
                    약 {item.distanceKm.toFixed(1)}km
                  </Text>
                  <Text
                    style={[
                      styles.explorationNearbyArrow,
                      { color: theme.subText },
                    ]}
                  >
                    ›
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}


        <View
          style={[
            styles.explorationFilterCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderRadius: isCityBlack ? 4 : 16,
            },
          ]}
        >
          <View style={styles.explorationFilterHeader}>
            <View>
              <Text
                style={[
                  styles.explorationFilterTitle,
                  { color: theme.text },
                ]}
              >
                탐험 기록 찾기
              </Text>
              <Text
                style={[
                  styles.explorationFilterResultText,
                  { color: theme.subText },
                ]}
              >
                전체 {explorationVisitRecords.length}개 중{' '}
                {filteredExplorationVisitRecords.length}개 표시
              </Text>
            </View>

            <View style={styles.explorationFilterHeaderActions}>
              {explorationFilterActive && (
                <Pressable
                  onPress={resetExplorationFilters}
                  style={({ pressed }) => [
                    styles.explorationFilterResetButton,
                    {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 3 : 9,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationFilterResetText,
                      { color: theme.text },
                    ]}
                  >
                    초기화
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() =>
                  setExplorationFiltersExpanded((current) => !current)
                }
                style={({ pressed }) => [
                  styles.explorationFilterResetButton,
                  {
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 3 : 9,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.explorationFilterResetText,
                    { color: theme.text },
                  ]}
                >
                  {explorationFiltersExpanded ? '접기' : '펴기'}
                </Text>
              </Pressable>
            </View>
          </View>

          {!explorationFiltersExpanded && (
            <View
              style={[
                styles.explorationCollapsedFilterSummary,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 2 : 8,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationCollapsedFilterSummaryText,
                  { color: theme.subText },
                ]}
                numberOfLines={2}
              >
                {explorationActiveFilterLabels.length > 0
                  ? explorationActiveFilterLabels.join(' · ')
                  : '전체 기록 · 최근 방문순'}
              </Text>
            </View>
          )}

          {explorationFiltersExpanded && (
            <>
          <View
            style={
              styles.explorationViewModeRow
            }
          >
            {([
              { id: 'list', label: '목록 보기', icon: '☰' },
              { id: 'map', label: '지도 보기', icon: '🗺️' },
            ] as const).map((item) => {
              const selected =
                explorationViewMode ===
                item.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setExplorationViewMode(
                      item.id
                    );

                    if (
                      item.id === 'map' &&
                      !selectedExplorationMapPlaceId
                    ) {
                      const firstPlaceId =
                        filteredExplorationVisitRecords[0]
                          ?.placeId;

                      setSelectedExplorationMapPlaceId(
                        firstPlaceId
                          ? String(firstPlaceId)
                          : null
                      );
                    }
                  }}
                  style={({ pressed }) => [
                    styles.explorationViewModeButton,
                    {
                      backgroundColor:
                        selected
                          ? theme.background
                          : 'transparent',

                      borderColor:
                        selected
                          ? theme.strongLine ??
                            theme.line
                          : theme.line,

                      borderRadius:
                        isCityBlack
                          ? 3
                          : 9,

                      opacity:
                        pressed
                          ? 0.65
                          : 1,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.explorationViewModeIcon
                    }
                  >
                    {item.icon}
                  </Text>

                  <Text
                    style={[
                      styles.explorationViewModeText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.explorationSearchBox,
              {
                borderColor: theme.line,
                borderRadius: isCityBlack ? 3 : 10,
              },
            ]}
          >
            <Text style={styles.explorationSearchIcon}>🔎</Text>
            <TextInput
              value={explorationSearchText}
              onChangeText={setExplorationSearchText}
              placeholder="장소 이름이나 여행기 내용 검색"
              placeholderTextColor={theme.mutedText ?? theme.subText}
              style={[
                styles.explorationSearchInput,
                { color: theme.text },
              ]}
              returnKeyType="search"
            />
            {explorationSearchText.length > 0 && (
              <Pressable
                onPress={() => setExplorationSearchText('')}
                style={styles.explorationSearchClear}
              >
                <Text
                  style={[
                    styles.explorationSearchClearText,
                    { color: theme.subText },
                  ]}
                >
                  ×
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.explorationFilterLabel, { color: theme.subText }]}>지역</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.explorationFilterChipRow}
          >
            {explorationDistrictOptions.map((district) => {
              const selected = explorationDistrictFilter === district;
              return (
                <Pressable
                  key={district}
                  onPress={() => setExplorationDistrictFilter(district)}
                  style={[
                    styles.explorationFilterChip,
                    {
                      backgroundColor: selected ? theme.background : 'transparent',
                      borderColor: selected
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                      borderRadius: isCityBlack ? 3 : 999,
                    },
                  ]}
                >
                  <Text style={[styles.explorationFilterChipText, { color: theme.text }]}>
                    {district === 'all' ? '전체' : district}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.explorationFilterLabel, { color: theme.subText }]}>방문 월</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.explorationFilterChipRow}
          >
            {explorationMonthOptions.map((monthKey) => {
              const selected = explorationMonthFilter === monthKey;
              return (
                <Pressable
                  key={monthKey}
                  onPress={() => setExplorationMonthFilter(monthKey)}
                  style={[
                    styles.explorationFilterChip,
                    {
                      backgroundColor: selected ? theme.background : 'transparent',
                      borderColor: selected
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                      borderRadius: isCityBlack ? 3 : 999,
                    },
                  ]}
                >
                  <Text style={[styles.explorationFilterChipText, { color: theme.text }]}>
                    {monthKey === 'all' ? '전체' : monthKey.replace('-', '.')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.explorationFilterLabel, { color: theme.subText }]}>테마</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.explorationFilterChipRow}
          >
            {EXPLORATION_THEME_FILTERS.map((item) => {
              const selected = explorationThemeFilter === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setExplorationThemeFilter(item.id)}
                  style={[
                    styles.explorationFilterChip,
                    {
                      backgroundColor: selected ? theme.background : 'transparent',
                      borderColor: selected
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                      borderRadius: isCityBlack ? 3 : 999,
                    },
                  ]}
                >
                  <Text style={styles.explorationFilterChipIcon}>{item.icon}</Text>
                  <Text style={[styles.explorationFilterChipText, { color: theme.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.explorationFilterLabel, { color: theme.subText }]}>여행기 상태</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.explorationFilterChipRow}
          >
            {EXPLORATION_JOURNAL_FILTERS.map((item) => {
              const selected = explorationJournalFilter === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setExplorationJournalFilter(item.id)}
                  style={[
                    styles.explorationFilterChip,
                    {
                      backgroundColor: selected ? theme.background : 'transparent',
                      borderColor: selected
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                      borderRadius: isCityBlack ? 3 : 999,
                    },
                  ]}
                >
                  <Text style={[styles.explorationFilterChipText, { color: theme.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.explorationFilterLabel, { color: theme.subText }]}>사진 상태</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.explorationFilterChipRow}
          >
            {EXPLORATION_PHOTO_FILTERS.map((item) => {
              const selected = explorationPhotoFilter === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setExplorationPhotoFilter(item.id)}
                  style={[
                    styles.explorationFilterChip,
                    {
                      backgroundColor: selected ? theme.background : 'transparent',
                      borderColor: selected
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                      borderRadius: isCityBlack ? 3 : 999,
                    },
                  ]}
                >
                  <Text style={[styles.explorationFilterChipText, { color: theme.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.explorationFilterLabel, { color: theme.subText }]}>정렬</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.explorationFilterChipRow}
          >
            {EXPLORATION_SORT_OPTIONS.map((item) => {
              const selected = explorationSortOption === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setExplorationSortOption(item.id)}
                  style={[
                    styles.explorationFilterChip,
                    {
                      backgroundColor: selected ? theme.background : 'transparent',
                      borderColor: selected
                        ? theme.strongLine ?? theme.line
                        : theme.line,
                      borderRadius: isCityBlack ? 3 : 999,
                    },
                  ]}
                >
                  <Text style={[styles.explorationFilterChipText, { color: theme.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
            </>
          )}
        </View>

        {completedExplorationThemes.length >
        0 ? (
          <View
            style={
              styles.explorationThemeSection
            }
          >
            <Text
              style={[
                styles.explorationSectionTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              완료한 테마
            </Text>

            <View
              style={
                styles.explorationThemeWrap
              }
            >
              {completedExplorationThemes.map(
                (
                  item: any
                ) => (
                  <View
                    key={
                      item.id
                    }
                    style={[
                      styles.explorationThemeChip,
                      {
                        backgroundColor:
                          theme.card,

                        borderColor:
                          theme.line,

                        borderRadius:
                          isCityBlack
                            ? 4
                            : 12,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.explorationThemeIcon
                      }
                    >
                      {
                        item.icon
                      }
                    </Text>

                    <Text
                      style={[
                        styles.explorationThemeName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                      numberOfLines={
                        1
                      }
                    >
                      {
                        item.name
                      }
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.explorationVisitSectionTitleRow}>
          <Text
            style={[
              styles.explorationSectionTitle,
              { color: theme.text },
            ]}
          >
            {explorationViewMode ===
            'map'
              ? '방문 지도'
              : '방문한 장소'}
          </Text>
          <Text
            style={[
              styles.explorationVisitSectionCount,
              { color: theme.subText },
            ]}
          >
            {filteredExplorationVisitRecords.length}/
            {explorationVisitRecords.length}
          </Text>
        </View>

        {explorationLoading ? (
          <Text
            style={[
              styles.explorationEmptyText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            탐험 기록을 불러오는 중이에요.
          </Text>
        ) : explorationVisitRecords.length ===
          0 ? (
          <View
            style={[
              styles.explorationEmptyCard,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 4
                    : 18,
              },
            ]}
          >
            <Text
              style={
                styles.explorationEmptyIcon
              }
            >
              🗺️
            </Text>

            <Text
              style={[
                styles.explorationEmptyTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              아직 완료한 탐험이 없어요
            </Text>

            <Text
              style={[
                styles.explorationEmptyText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              탐험 탭에서 장소를 찾아 방문 인증을 완료해 보세요.
            </Text>
          </View>
        ) : filteredExplorationVisitRecords.length === 0 ? (
          <View
            style={[
              styles.explorationEmptyCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 18,
              },
            ]}
          >
            <Text style={styles.explorationEmptyIcon}>🔎</Text>
            <Text
              style={[
                styles.explorationEmptyTitle,
                { color: theme.text },
              ]}
            >
              조건에 맞는 기록이 없어요
            </Text>
            <Text
              style={[
                styles.explorationEmptyText,
                { color: theme.subText },
              ]}
            >
              검색어나 필터를 바꾸면 다른 탐험 기록을 볼 수 있어요.
            </Text>
            <Pressable
              onPress={resetExplorationFilters}
              style={[
                styles.explorationEmptyResetButton,
                {
                  borderColor: theme.line,
                  borderRadius: isCityBlack ? 3 : 9,
                },
              ]}
            >
              <Text style={[styles.explorationEmptyResetText, { color: theme.text }]}>필터 초기화</Text>
            </Pressable>
          </View>
        ) : explorationViewMode ===
          'map' ? (
          <View
            style={
              styles.explorationMapSection
            }
          >
            {explorationMapRecords.length >
            0 ? (
              <>
                <View
                  style={[
                    styles.explorationMapCard,
                    {
                      backgroundColor:
                        theme.card,

                      borderColor:
                        theme.line,

                      borderRadius:
                        isCityBlack
                          ? 4
                          : 18,
                    },
                  ]}
                >
                  <View style={styles.explorationMapAdvancedPanel}>
                    <View style={styles.explorationMapAdvancedHeader}>
                      <View>
                        <Text
                          style={[
                            styles.explorationMapAdvancedTitle,
                            { color: theme.text },
                          ]}
                        >
                          지도 표시 설정
                        </Text>
                        <Text
                          style={[
                            styles.explorationMapAdvancedSubtitle,
                            { color: theme.subText },
                          ]}
                        >
                          위치 종류를 고르고 방문 순서 경로를 확인해요.
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setExplorationMapRouteVisible((current) => !current)
                        }
                        style={({ pressed }) => [
                          styles.explorationMapRouteToggle,
                          {
                            borderColor: theme.strongLine ?? theme.line,
                            borderRadius: isCityBlack ? 2 : 8,
                            opacity: pressed ? 0.65 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationMapRouteToggleText,
                            { color: theme.text },
                          ]}
                        >
                          {explorationMapRouteVisible ? '경로선 ON' : '경로선 OFF'}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.explorationMapSourceFilterRow}>
                      {[
                        { id: 'all', label: '전체 위치' },
                        { id: 'gps', label: 'GPS만' },
                        { id: 'place', label: '장소 기준만' },
                      ].map((item) => {
                        const selected = explorationMapSourceFilter === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() =>
                              setExplorationMapSourceFilter(
                                item.id as ExplorationMapSourceFilter
                              )
                            }
                            style={({ pressed }) => [
                              styles.explorationMapSourceFilterButton,
                              {
                                borderColor: selected
                                  ? theme.strongLine ?? theme.line
                                  : theme.line,
                                backgroundColor: selected
                                  ? theme.background
                                  : 'transparent',
                                borderRadius: isCityBlack ? 2 : 999,
                                opacity: pressed ? 0.65 : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.explorationMapSourceFilterText,
                                { color: theme.text },
                              ]}
                            >
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <MapView
                    ref={explorationMapViewRef}
                    key={
                      explorationMapKey
                    }
                    style={
                      styles.explorationVisitMap
                    }
                    provider={
                      PROVIDER_GOOGLE
                    }
                    initialRegion={
                      explorationMapRegion
                    }
                    showsUserLocation
                    showsMyLocationButton
                    toolbarEnabled={
                      false
                    }
                    loadingEnabled
                  >
                    {explorationMapRouteVisible &&
                      explorationMapRouteCoordinates.length >= 2 && (
                        <Polyline
                          coordinates={explorationMapRouteCoordinates}
                          strokeColor={isCityBlack ? '#F2F2F2' : '#8B5A2B'}
                          strokeWidth={4}
                          lineDashPattern={[10, 6]}
                        />
                      )}

                    {explorationMapRecords.map(
                      (item: any) => {
                        const record =
                          item.record;

                        const placeId =
                          String(
                            record?.placeId ??
                              ''
                          ).trim();

                        const placeMeta =
                          EXPLORATION_PLACE_META[
                            placeId
                          ];

                        return (
                          <Marker
                            key={
                              placeId
                            }
                            coordinate={
                              item.coordinate
                            }
                            title={
                              placeMeta
                                ?.name ??
                              placeId
                            }
                            description={`${Math.max(
                              1,
                              explorationMapJourneyRecords.findIndex(
                                (journeyItem) =>
                                  String(journeyItem.record?.placeId ?? '') ===
                                  placeId
                              ) + 1
                            )}번째 방문 · ${formatExplorationVerifiedAt(
                              record?.verifiedAt
                            )} · ${
                              item.coordinateSource ===
                              'gps'
                                ? 'GPS 인증 위치'
                                : '장소 기준 위치'
                            }`}
                            pinColor={
                              selectedExplorationMapPlaceId === placeId
                                ? '#7A4C22'
                                : item.coordinateSource === 'gps'
                                  ? '#2F7D4A'
                                  : '#C95C3D'
                            }
                            onPress={() => {
                              setSelectedExplorationMapPlaceId(
                                placeId
                              );
                            }}
                          />
                        );
                      }
                    )}
                  </MapView>

                  <View style={styles.explorationMapControlRow}>
                    <Pressable
                      onPress={focusAllExplorationMapMarkers}
                      style={({ pressed }) => [
                        styles.explorationMapControlButton,
                        {
                          borderColor: theme.line,
                          borderRadius: isCityBlack ? 2 : 8,
                          opacity: pressed ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.explorationMapControlButtonText,
                          { color: theme.text },
                        ]}
                      >
                        전체 보기
                      </Text>
                    </Pressable>

                    <View style={styles.explorationMapPager}>
                      <Pressable
                        onPress={() => moveExplorationMapSelection(-1)}
                        style={({ pressed }) => [
                          styles.explorationMapPagerButton,
                          {
                            borderColor: theme.line,
                            borderRadius: isCityBlack ? 2 : 8,
                            opacity: pressed ? 0.65 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationMapPagerButtonText,
                            { color: theme.text },
                          ]}
                        >
                          ‹
                        </Text>
                      </Pressable>

                      <Text
                        style={[
                          styles.explorationMapPagerText,
                          { color: theme.subText },
                        ]}
                      >
                        {selectedExplorationMapIndex >= 0
                          ? selectedExplorationMapIndex + 1
                          : 0}
                        /{explorationMapRecords.length}
                      </Text>

                      <Pressable
                        onPress={() => moveExplorationMapSelection(1)}
                        style={({ pressed }) => [
                          styles.explorationMapPagerButton,
                          {
                            borderColor: theme.line,
                            borderRadius: isCityBlack ? 2 : 8,
                            opacity: pressed ? 0.65 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationMapPagerButtonText,
                            { color: theme.text },
                          ]}
                        >
                          ›
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.explorationMapLegendRow}>
                    <View style={styles.explorationMapLegendItem}>
                      <View
                        style={[
                          styles.explorationMapLegendDot,
                          { backgroundColor: '#2F7D4A' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.explorationMapLegendText,
                          { color: theme.subText },
                        ]}
                      >
                        GPS 인증
                      </Text>
                    </View>
                    <View style={styles.explorationMapLegendItem}>
                      <View
                        style={[
                          styles.explorationMapLegendDot,
                          { backgroundColor: '#C95C3D' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.explorationMapLegendText,
                          { color: theme.subText },
                        ]}
                      >
                        장소 기준
                      </Text>
                    </View>
                    <View style={styles.explorationMapLegendItem}>
                      <View
                        style={[
                          styles.explorationMapLegendDot,
                          { backgroundColor: '#7A4C22' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.explorationMapLegendText,
                          { color: theme.subText },
                        ]}
                      >
                        선택됨
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.explorationMapInfoRow
                    }
                  >
                    <Text
                      style={[
                        styles.explorationMapInfoText,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      지도에{' '}
                      {
                        explorationMapRecords.length
                      }
                      개 장소 표시
                    </Text>

                    <Text
                      style={[
                        styles.explorationMapInfoText,
                        {
                          color:
                            theme.mutedText ??
                            theme.subText,
                        },
                      ]}
                    >
                      GPS 인증 위치{' '}
                      {explorationMapGpsCount}개
                      {' · '}
                      장소 기준 위치{' '}
                      {explorationMapPlaceCount}개
                    </Text>

                    <Text
                      style={[
                        styles.explorationMapRouteDistance,
                        { color: theme.subText },
                      ]}
                    >
                      표시 위치 연결 약 {explorationMapRouteDistanceKm.toFixed(1)}km
                    </Text>
                  </View>
                </View>

                {selectedExplorationMapRecord &&
                  (() => {
                    const record =
                      selectedExplorationMapRecord;

                    const placeId =
                      String(
                        record?.placeId ??
                          ''
                      ).trim();

                    const placeMeta =
                      EXPLORATION_PLACE_META[
                        placeId
                      ];

                    const mood =
                      getExplorationJournalMood(
                        record?.journalMood
                      );

                    const photoUrls =
                      normalizeExplorationJournalPhotoUrls(
                        record?.journalPhotoUrls
                      );

                    const memo =
                      String(
                        record?.journalMemo ??
                          ''
                      ).trim();

                    const hasJournal =
                      memo.length > 0 ||
                      !!mood ||
                      photoUrls.length >
                        0;

                    const uid =
                      String(
                        data?.uid ??
                          ''
                      ).trim();

                    const postId =
                      uid && placeId
                        ? `${uid}_exploration_journal_${placeId}`
                        : '';

                    const fallbackPost =
                      postId
                        ? getRootCrewPosts().find(
                            (post: any) =>
                              String(
                                post?.id ??
                                  ''
                              ) ===
                              postId
                          ) ?? null
                        : null;

                    const feedStatus =
                      getExplorationJournalFeedStatus(
                        record,
                        fallbackPost
                      );

                    return (
                      <View
                        style={[
                          styles.explorationMapSelectedCard,
                          {
                            backgroundColor:
                              theme.card,

                            borderColor:
                              theme.line,

                            borderRadius:
                              isCityBlack
                                ? 4
                                : 16,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.explorationMapSelectedHeader
                          }
                        >
                          <Text
                            style={
                              styles.explorationMapSelectedIcon
                            }
                          >
                            {EXPLORATION_COLLECTION_ICON_BY_PLACE[
                              placeId
                            ] ?? '📍'}
                          </Text>

                          <View
                            style={
                              styles.explorationMapSelectedTitleBox
                            }
                          >
                            <Text
                              style={[
                                styles.explorationMapSelectedTitle,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                              numberOfLines={
                                1
                              }
                            >
                              {placeMeta
                                ?.name ??
                                placeId}
                            </Text>

                            <Text
                              style={[
                                styles.explorationMapSelectedSubtitle,
                                {
                                  color:
                                    theme.subText,
                                },
                              ]}
                            >
                              {placeMeta
                                ?.district ??
                                '탐험'}
                              {' · '}
                              {placeMeta
                                ?.areaType ??
                                '방문 장소'}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.explorationMapSelectedVisitDate,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {formatExplorationVerifiedAt(
                            record?.verifiedAt
                          )}
                          {' 방문 인증'}
                        </Text>

                        <Text
                          style={[
                            styles.explorationMapSelectedSubtitle,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {selectedExplorationMapItem
                            ?.coordinateSource ===
                          'gps'
                            ? '표시 위치: 방문 당시 GPS 인증 위치'
                            : '표시 위치: 장소 기준 위치 · 예전 기록에는 GPS 좌표가 없어요'}
                        </Text>

                        <View
                          style={
                            styles.explorationMapSelectedMetaRow
                          }
                        >
                          <Text
                            style={[
                              styles.explorationMapSelectedMeta,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            {hasJournal
                              ? mood
                                ? `${mood.emoji} ${mood.label}`
                                : '여행기 작성됨'
                              : '여행기 미작성'}
                          </Text>

                          <Text
                            style={[
                              styles.explorationMapSelectedMeta,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                          >
                            사진{' '}
                            {
                              photoUrls.length
                            }
                            장
                          </Text>
                        </View>

                        {memo.length >
                          0 && (
                          <Text
                            style={[
                              styles.explorationMapSelectedMemo,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                            numberOfLines={
                              2
                            }
                          >
                            {memo}
                          </Text>
                        )}

                        <View
                          style={[
                            styles.explorationMapSelectedStatus,
                            {
                              borderColor:
                                feedStatus ===
                                'needs-reshare'
                                  ? theme.strongLine ??
                                    theme.line
                                  : theme.line,

                              borderRadius:
                                isCityBlack
                                  ? 2
                                  : 8,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.explorationMapSelectedStatusText,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {getExplorationJournalFeedStatusLabel(
                              feedStatus
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.explorationMapSelectedButtonRow
                          }
                        >
                          <Pressable
                            onPress={() =>
                              openExplorationJournalDetail(
                                record
                              )
                            }
                            style={({
                              pressed,
                            }) => [
                              styles.explorationMapSelectedButton,
                              {
                                borderColor:
                                  theme.line,

                                borderRadius:
                                  isCityBlack
                                    ? 2
                                    : 9,

                                opacity:
                                  pressed
                                    ? 0.65
                                    : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.explorationMapSelectedButtonText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              상세 보기
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              router.push(
                                `/explore/place/${placeId}` as any
                              );
                            }}
                            style={({
                              pressed,
                            }) => [
                              styles.explorationMapSelectedButton,
                              {
                                borderColor:
                                  theme.strongLine ??
                                  theme.line,

                                borderRadius:
                                  isCityBlack
                                    ? 2
                                    : 9,

                                opacity:
                                  pressed
                                    ? 0.65
                                    : 1,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.explorationMapSelectedButtonText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              장소 보기
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })()}
              </>
            ) : (
              <View
                style={[
                  styles.explorationEmptyCard,
                  {
                    backgroundColor:
                      theme.card,

                    borderColor:
                      theme.line,

                    borderRadius:
                      isCityBlack
                        ? 4
                        : 18,
                  },
                ]}
              >
                <Text
                  style={
                    styles.explorationEmptyIcon
                  }
                >
                  📍
                </Text>

                <Text
                  style={[
                    styles.explorationEmptyTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {explorationMapSourceFilter !== 'all'
                    ? '선택한 위치 종류의 기록이 없어요'
                    : '지도에 표시할 장소 위치가 없어요'}
                </Text>

                <Text
                  style={[
                    styles.explorationEmptyText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  {explorationMapSourceFilter !== 'all'
                    ? '전체 위치로 바꾸면 장소 기준 위치를 포함해 다시 볼 수 있어요.'
                    : '목록 보기에서는 모든 방문 기록을 계속 확인할 수 있어요.'}
                </Text>

                <Pressable
                  onPress={() => {
                    if (explorationMapSourceFilter !== 'all') {
                      setExplorationMapSourceFilter('all');
                      return;
                    }

                    setExplorationViewMode('list');
                  }}
                  style={[
                    styles.explorationEmptyResetButton,
                    {
                      borderColor:
                        theme.line,

                      borderRadius:
                        isCityBlack
                          ? 3
                          : 9,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.explorationEmptyResetText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {explorationMapSourceFilter !== 'all'
                      ? '전체 위치 보기'
                      : '목록 보기'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View
            style={
              styles.explorationVisitList
            }
          >
            {filteredExplorationVisitRecords.map(
              (
                record: any
              ) => {
                const placeId =
                  String(
                    record
                      ?.placeId ??
                      ''
                  ).trim();

                const placeMeta =
                  EXPLORATION_PLACE_META[
                    placeId
                  ];

                const reward =
                  EXPLORATION_REWARD_BY_PLACE[
                    placeId
                  ];

                const distanceMeters =
                  Math.max(
                    0,
                    Number(
                      record
                        ?.distanceMeters
                    ) || 0
                  );

                const accuracyMeters =
                  Math.max(
                    0,
                    Number(
                      record
                        ?.accuracyMeters
                    ) || 0
                  );

                const journalMemo =
                  String(
                    record
                      ?.journalMemo ??
                      ''
                  ).trim();

                const journalMood =
                  getExplorationJournalMood(
                    record
                      ?.journalMood
                  );

                const journalPhotoUrls =
                  normalizeExplorationJournalPhotoUrls(
                    record
                      ?.journalPhotoUrls
                  );

                const hasJournal =
                  journalMemo.length >
                    0 ||
                  !!journalMood ||
                  journalPhotoUrls
                    .length >
                    0;

                const currentUid =
                  String(
                    data
                      ?.uid ??
                      ''
                  ).trim();

                const journalFeedPostId =
                  currentUid &&
                  placeId
                    ? `${currentUid}_exploration_journal_${placeId}`
                    : '';

                const currentFeedPosts =
                  getRootCrewPosts();

                const existingJournalFeedPost =
                  journalFeedPostId &&
                  Array.isArray(
                    currentFeedPosts
                  )
                    ? currentFeedPosts
                        .find(
                          (post: any) =>
                            String(
                              post
                                ?.id ??
                                ''
                            ) ===
                            journalFeedPostId
                        ) ??
                      null
                    : null;

                const journalFeedStatus =
                  getExplorationJournalFeedStatus(
                    record,
                    existingJournalFeedPost
                  );

                const journalSourceDeleted =
                  journalFeedStatus ===
                  'source-deleted';

                const journalFeedStatusLabel =
                  getExplorationJournalFeedStatusLabel(
                    journalFeedStatus
                  );

                const journalNeedsReshare =
                  journalFeedStatus ===
                  'needs-reshare';

                return (
                  <Pressable
                    key={
                      `${placeId}_${record?.verifiedAt ?? ''}`
                    }
                    onPress={() => {
                      if (!placeId) {
                        return;
                      }

                      router.push(
                        `/explore/place/${placeId}` as any
                      );
                    }}
                    style={({
                      pressed,
                    }) => [
                      styles.explorationVisitCard,
                      {
                        backgroundColor:
                          theme.card,

                        borderColor:
                          theme.line,

                        borderRadius:
                          isCityBlack
                            ? 4
                            : 18,

                        opacity:
                          pressed
                            ? 0.72
                            : 1,
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.explorationVisitHeader
                      }
                    >
                      <View
                        style={
                          styles.explorationVisitIconBox
                        }
                      >
                        <Text
                          style={
                            styles.explorationVisitIcon
                          }
                        >
                          ✅
                        </Text>
                      </View>

                      <View
                        style={
                          styles.explorationVisitTitleBox
                        }
                      >
                        <Text
                          style={[
                            styles.explorationVisitName,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                          numberOfLines={
                            1
                          }
                        >
                          {placeMeta
                            ?.name ??
                            placeId}
                        </Text>

                        <Text
                          style={[
                            styles.explorationVisitMeta,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                          numberOfLines={
                            1
                          }
                        >
                          {placeMeta
                            ?.district ??
                            '탐험'}
                          {' · '}
                          {placeMeta
                            ?.areaType ??
                            '방문 장소'}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.explorationVisitArrow,
                          {
                            color:
                              theme.subText,
                          },
                        ]}
                      >
                        ›
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.explorationVisitDate,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {formatExplorationVerifiedAt(
                        record
                          ?.verifiedAt
                      )}
                      {' 방문 인증'}
                    </Text>

                    <Text
                      style={[
                        styles.explorationVisitReward,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                    >
                      +{
                        Math.max(
                          0,
                          Number(
                            reward
                              ?.points
                          ) || 0
                        )
                      }P
                      {' · '}
                      {placeMeta
                        ?.rewardLabel ??
                        '탐험 건물'}
                      {' · 방문 스탬프'}
                    </Text>

                    {(distanceMeters >
                      0 ||
                      accuracyMeters >
                        0) && (
                      <Text
                        style={[
                          styles.explorationVisitGps,
                          {
                            color:
                              theme.mutedText ??
                              theme.subText,
                          },
                        ]}
                      >
                        GPS 인증
                        {distanceMeters >
                        0
                          ? ` · 인증 지점에서 ${Math.round(
                              distanceMeters
                            )}m`
                          : ''}
                        {accuracyMeters >
                        0
                          ? ` · 정확도 ${Math.round(
                              accuracyMeters
                            )}m`
                          : ''}
                      </Text>
                    )}

                    {(hasJournal ||
                      journalSourceDeleted) && (
                      <View
                        style={[
                          styles.explorationJournalPreview,
                          {
                            backgroundColor:
                              theme.background,

                            borderColor:
                              theme.line,

                            borderRadius:
                              isCityBlack
                                ? 3
                                : 12,
                          },
                        ]}
                      >
                        <View
                          style={
                            styles.explorationJournalPreviewHeader
                          }
                        >
                          <Text
                            style={[
                              styles.explorationJournalPreviewLabel,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {journalSourceDeleted
                              ? '원본 여행기 삭제됨'
                              : '여행기'}
                          </Text>

                          <View
                            style={
                              styles.explorationJournalPreviewHeaderRight
                            }
                          >
                            {journalMood && (
                              <Text
                                style={[
                                  styles.explorationJournalPreviewMood,
                                  {
                                    color:
                                      theme.subText,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {journalMood.emoji}
                                {' '}
                                {journalMood.label}
                              </Text>
                            )}

                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();

                                openExplorationJournalDetail(
                                  record
                                );
                              }}
                              style={({
                                pressed,
                              }) => [
                                styles.explorationJournalDetailOpenButton,
                                {
                                  borderColor:
                                    theme.line,

                                  borderRadius:
                                    isCityBlack
                                      ? 2
                                      : 7,

                                  opacity:
                                    pressed
                                      ? 0.6
                                      : 1,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.explorationJournalDetailOpenText,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                상세 보기
                              </Text>
                            </Pressable>
                          </View>
                        </View>

                        {journalPhotoUrls
                          .length >
                          0 && (
                          <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator={
                              false
                            }
                            contentContainerStyle={
                              styles.explorationJournalPreviewPhotoRow
                            }
                            onTouchStart={(
                              event
                            ) => {
                              event
                                .stopPropagation();
                            }}
                          >
                            {journalPhotoUrls.map(
                              (
                                photoUrl,
                                photoIndex
                              ) => (
                                <Pressable
                                  key={
                                    `${photoUrl}_${photoIndex}`
                                  }
                                  onPress={(
                                    event
                                  ) => {
                                    event
                                      .stopPropagation();

                                    setSelectedImageUri(
                                      photoUrl
                                    );

                                    setSelectedImageType(
                                      'photo'
                                    );

                                    setSelectedImageLog(
                                      null
                                    );
                                  }}
                                >
                                  <Image
                                    source={{
                                      uri:
                                        photoUrl,
                                    }}
                                    style={[
                                      styles.explorationJournalPreviewPhoto,
                                      {
                                        borderRadius:
                                          isCityBlack
                                            ? 2
                                            : 8,
                                      },
                                    ]}
                                  />
                                </Pressable>
                              )
                            )}
                          </ScrollView>
                        )}

                        {journalMemo.length >
                          0 && (
                          <Text
                            style={[
                              styles.explorationJournalPreviewMemo,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                            numberOfLines={
                              3
                            }
                          >
                            {journalMemo}
                          </Text>
                        )}

                        {record
                          ?.journalUpdatedAt && (
                          <Text
                            style={[
                              styles.explorationJournalPreviewDate,
                              {
                                color:
                                  theme.mutedText ??
                                  theme.subText,
                              },
                            ]}
                          >
                            {formatExplorationVerifiedAt(
                              record
                                .journalUpdatedAt
                            )}
                            {journalSourceDeleted
                              ? ' 삭제'
                              : ' 작성'}
                          </Text>
                        )}

                        <View
                          style={[
                            styles.explorationJournalFeedStatusBadge,
                            {
                              borderColor:
                                journalNeedsReshare
                                  ? theme.strongLine ??
                                    theme.line
                                  : theme.line,

                              borderRadius:
                                isCityBlack
                                  ? 2
                                  : 8,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.explorationJournalFeedStatusText,
                              {
                                color:
                                  journalNeedsReshare
                                    ? theme.text
                                    : theme.mutedText ??
                                      theme.subText,
                              },
                            ]}
                          >
                            {journalFeedStatusLabel}
                          </Text>

                          {record
                            ?.journalFeedSharedAt &&
                          journalFeedStatus ===
                            'shared' && (
                            <Text
                              style={[
                                styles.explorationJournalFeedStatusDate,
                                {
                                  color:
                                    theme.mutedText ??
                                    theme.subText,
                                },
                              ]}
                            >
                              {formatExplorationVerifiedAt(
                                record
                                  .journalFeedSharedAt
                              )}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    <View
                      style={
                        styles.explorationJournalActionRow
                      }
                    >
                      {journalFeedStatus !==
                        'not-shared' && (
                        <Pressable
                          disabled={
                            explorationJournalFeedUnsharing
                          }
                          onPress={(
                            event
                          ) => {
                            event
                              .stopPropagation();

                            openExplorationJournalFeedUnshare(
                              record
                            );
                          }}
                          style={({
                            pressed,
                          }) => [
                            styles.explorationJournalButton,
                            styles.explorationJournalUnshareButton,
                            {
                              borderColor:
                                theme.strongLine ??
                                theme.line,

                              borderRadius:
                                isCityBlack
                                  ? 3
                                  : 9,

                              opacity:
                                explorationJournalFeedUnsharing
                                  ? 0.4
                                  : pressed
                                  ? 0.65
                                  : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.explorationJournalButtonText,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            피드 내리기
                          </Text>
                        </Pressable>
                      )}

                      {hasJournal && (
                        <Pressable
                          onPress={(
                            event
                          ) => {
                            event
                              .stopPropagation();

                            openExplorationJournalShare(
                              record
                            );
                          }}
                          style={({
                            pressed,
                          }) => [
                            styles.explorationJournalButton,
                            styles.explorationJournalShareButton,
                            {
                              borderColor:
                                theme.line,

                              borderRadius:
                                isCityBlack
                                  ? 3
                                  : 9,

                              opacity:
                                pressed
                                  ? 0.65
                                  : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.explorationJournalButtonText,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                          >
                            {journalNeedsReshare
                              ? '다시 공유 필요'
                              : '여행기 공유'}
                          </Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={(
                          event
                        ) => {
                          event
                            .stopPropagation();

                          openExplorationJournal(
                            record
                          );
                        }}
                        style={({
                          pressed,
                        }) => [
                          styles.explorationJournalButton,
                          {
                            borderColor:
                              theme.strongLine ??
                              theme.line,

                            borderRadius:
                              isCityBlack
                                ? 3
                                : 9,

                            opacity:
                              pressed
                                ? 0.65
                                : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.explorationJournalButtonText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {journalSourceDeleted
                            ? '여행기 다시 쓰기'
                            : hasJournal
                            ? '여행기 수정'
                            : '여행기 쓰기'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              }
            )}
          </View>
        )}
      </View>
    )}


    {activeTab ===
      'collection' && (
      <View
        style={
          styles.collectionSection
        }
      >
        <View
          style={[
            styles.collectionSummaryCard,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 4
                  : 20,
            },
          ]}
        >
          <View
            style={
              styles.collectionSummaryTopRow
            }
          >
            <View
              style={
                styles.collectionSummaryTitleBox
              }
            >
              <Text
                style={[
                  styles.collectionSummaryTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                나의 컬렉션
              </Text>

              <Text
                style={[
                  styles.collectionSummarySubtitle,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                탐험과 성장으로 획득한 보상을 한곳에서 확인해요.
              </Text>
            </View>

            <Text
              style={
                styles.collectionSummaryIcon
              }
            >
              🎒
            </Text>
          </View>

          <View
            style={
              styles.collectionSummaryStats
            }
          >
            <View
              style={
                styles.collectionSummaryStat
              }
            >
              <Text
                style={[
                  styles.collectionSummaryStatValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {
                  unlockedBuildingCollection.length
                }
              </Text>

              <Text
                style={[
                  styles.collectionSummaryStatLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                건물
              </Text>
            </View>

            <View
              style={[
                styles.collectionSummaryDivider,
                {
                  backgroundColor:
                    theme.line,
                },
              ]}
            />

            <View
              style={
                styles.collectionSummaryStat
              }
            >
              <Text
                style={[
                  styles.collectionSummaryStatValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {
                  unlockedStampCollection.length
                }
              </Text>

              <Text
                style={[
                  styles.collectionSummaryStatLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                스탬프
              </Text>
            </View>

            <View
              style={[
                styles.collectionSummaryDivider,
                {
                  backgroundColor:
                    theme.line,
                },
              ]}
            />

            <View
              style={
                styles.collectionSummaryStat
              }
            >
              <Text
                style={[
                  styles.collectionSummaryStatValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {
                  allBadgeCollection.length
                }
              </Text>

              <Text
                style={[
                  styles.collectionSummaryStatLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                뱃지
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.collectionFilterRow
          }
        >
          {COLLECTION_FILTERS.map(
            (
              filterItem
            ) => {
              const selected =
                collectionFilter ===
                filterItem.id;

              return (
                <Pressable
                  key={
                    filterItem.id
                  }
                  onPress={() =>
                    setCollectionFilter(
                      filterItem.id
                    )
                  }
                  style={[
                    styles.collectionFilterButton,
                    {
                      backgroundColor:
                        selected
                          ? theme.card
                          : 'transparent',

                      borderColor:
                        selected
                          ? theme.strongLine
                          : theme.line,

                      borderWidth:
                        selected
                          ? 1
                          : 0.5,

                      borderRadius:
                        isCityBlack
                          ? 4
                          : 10,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.collectionFilterText,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {
                      filterItem.label
                    }
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        {explorationLoading ? (
          <Text
            style={[
              styles.collectionEmptyText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            컬렉션을 불러오는 중이에요.
          </Text>
        ) : unlockedBuildingCollection.length ===
            0 &&
          unlockedStampCollection.length ===
            0 &&
          allBadgeCollection.length ===
            0 ? (
          <View
            style={[
              styles.collectionEmptyCard,
              {
                backgroundColor:
                  theme.card,

                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 4
                    : 18,
              },
            ]}
          >
            <Text
              style={
                styles.collectionEmptyIcon
              }
            >
              🎒
            </Text>

            <Text
              style={[
                styles.collectionEmptyTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              아직 획득한 컬렉션이 없어요
            </Text>

            <Text
              style={[
                styles.collectionEmptyText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              탐험을 완료하고 성장 기록을 쌓아 컬렉션을 모아보세요.
            </Text>
          </View>
        ) : (
          <>
            {(collectionFilter ===
                'all' ||
              collectionFilter ===
                'building') && (
              <View
                style={
                  styles.collectionGroup
                }
              >
                <View
                  style={
                    styles.collectionGroupHeader
                  }
                >
                  <Text
                    style={[
                      styles.collectionGroupTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    획득한 건물
                  </Text>

                  <Text
                    style={[
                      styles.collectionGroupCount,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {
                      unlockedBuildingCollection.length
                    }개
                  </Text>
                </View>

                {unlockedBuildingCollection.length ===
                0 ? (
                  <Text
                    style={[
                      styles.collectionGroupEmpty,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    아직 획득한 탐험 건물이 없어요.
                  </Text>
                ) : (
                  <View
                    style={
                      styles.collectionGrid
                    }
                  >
                    {unlockedBuildingCollection.map(
                      (
                        item: any
                      ) => (
                        <Pressable
                          key={
                            item.id
                          }
                          onPress={() => {
                            if (
                              !item.placeId
                            ) {
                              return;
                            }

                            router.push(
                              `/explore/place/${item.placeId}` as any
                            );
                          }}
                          style={({
                            pressed,
                          }) => [
                            styles.collectionItemCard,
                            {
                              backgroundColor:
                                theme.card,

                              borderColor:
                                theme.line,

                              borderRadius:
                                isCityBlack
                                  ? 4
                                  : 16,

                              opacity:
                                pressed
                                  ? 0.72
                                  : 1,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.collectionItemIconBox,
                              {
                                backgroundColor:
                                  theme.card2,

                                borderRadius:
                                  isCityBlack
                                    ? 4
                                    : 14,
                              },
                            ]}
                          >
                            <Text
                              style={
                                styles.collectionItemIcon
                              }
                            >
                              {
                                item.icon
                              }
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.collectionItemTitle,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                            numberOfLines={
                              2
                            }
                          >
                            {
                              item.title
                            }
                          </Text>

                          <Text
                            style={[
                              styles.collectionItemSubtitle,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                            numberOfLines={
                              2
                            }
                          >
                            {
                              item.subtitle
                            }
                          </Text>

                          <View
                            style={[
                              styles.collectionItemTag,
                              {
                                borderColor:
                                  theme.line,

                                borderRadius:
                                  isCityBlack
                                    ? 4
                                    : 8,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.collectionItemTagText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              탐험 보상
                            </Text>
                          </View>
                        </Pressable>
                      )
                    )}
                  </View>
                )}
              </View>
            )}

            {(collectionFilter ===
                'all' ||
              collectionFilter ===
                'stamp') && (
              <View
                style={
                  styles.collectionGroup
                }
              >
                <View
                  style={
                    styles.collectionGroupHeader
                  }
                >
                  <Text
                    style={[
                      styles.collectionGroupTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    방문 스탬프
                  </Text>

                  <Text
                    style={[
                      styles.collectionGroupCount,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {
                      unlockedStampCollection.length
                    }개
                  </Text>
                </View>

                {unlockedStampCollection.length ===
                0 ? (
                  <Text
                    style={[
                      styles.collectionGroupEmpty,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    아직 모은 방문 스탬프가 없어요.
                  </Text>
                ) : (
                  <View
                    style={
                      styles.collectionGrid
                    }
                  >
                    {unlockedStampCollection.map(
                      (
                        item: any
                      ) => (
                        <Pressable
                          key={
                            item.id
                          }
                          onPress={() => {
                            if (
                              !item.placeId
                            ) {
                              return;
                            }

                            router.push(
                              `/explore/place/${item.placeId}` as any
                            );
                          }}
                          style={({
                            pressed,
                          }) => [
                            styles.collectionItemCard,
                            {
                              backgroundColor:
                                theme.card,

                              borderColor:
                                theme.line,

                              borderRadius:
                                isCityBlack
                                  ? 4
                                  : 16,

                              opacity:
                                pressed
                                  ? 0.72
                                  : 1,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.collectionStampIconBox,
                              {
                                backgroundColor:
                                  theme.card2,

                                borderColor:
                                  theme.line,

                                borderRadius:
                                  isCityBlack
                                    ? 4
                                    : 999,
                              },
                            ]}
                          >
                            <Text
                              style={
                                styles.collectionStampIcon
                              }
                            >
                              {
                                item.icon
                              }
                            </Text>

                            <Text
                              style={[
                                styles.collectionStampCheck,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              ✓
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.collectionItemTitle,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                            numberOfLines={
                              2
                            }
                          >
                            {
                              item.title
                            }
                          </Text>

                          <Text
                            style={[
                              styles.collectionItemSubtitle,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                            numberOfLines={
                              2
                            }
                          >
                            {
                              item.subtitle
                            }
                          </Text>

                          <View
                            style={[
                              styles.collectionItemTag,
                              {
                                borderColor:
                                  theme.line,

                                borderRadius:
                                  isCityBlack
                                    ? 4
                                    : 8,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.collectionItemTagText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              방문 인증
                            </Text>
                          </View>
                        </Pressable>
                      )
                    )}
                  </View>
                )}
              </View>
            )}

            {(collectionFilter ===
                'all' ||
              collectionFilter ===
                'badge') && (
              <View
                style={
                  styles.collectionGroup
                }
              >
                <View
                  style={
                    styles.collectionGroupHeader
                  }
                >
                  <Text
                    style={[
                      styles.collectionGroupTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    획득한 뱃지
                  </Text>

                  <Text
                    style={[
                      styles.collectionGroupCount,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {
                      allBadgeCollection.length
                    }개
                  </Text>
                </View>

                {allBadgeCollection.length ===
                0 ? (
                  <Text
                    style={[
                      styles.collectionGroupEmpty,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    아직 획득한 뱃지가 없어요.
                  </Text>
                ) : (
                  <View
                    style={
                      styles.collectionGrid
                    }
                  >
                    {allBadgeCollection.map(
                      (
                        item: any
                      ) => (
                        <View
                          key={
                            `${item.badgeType}_${item.id}`
                          }
                          style={[
                            styles.collectionItemCard,
                            {
                              backgroundColor:
                                theme.card,

                              borderColor:
                                item.isMain
                                  ? theme.strongLine
                                  : theme.line,

                              borderWidth:
                                item.isMain
                                  ? 1
                                  : 0.5,

                              borderRadius:
                                isCityBlack
                                  ? 4
                                  : 16,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.collectionBadgeIconBox,
                              {
                                backgroundColor:
                                  theme.card2,

                                borderColor:
                                  item.isMain
                                    ? theme.strongLine
                                    : theme.line,

                                borderRadius:
                                  isCityBlack
                                    ? 4
                                    : 999,
                              },
                            ]}
                          >
                            <Text
                              style={
                                styles.collectionBadgeIcon
                              }
                            >
                              {
                                item.icon
                              }
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.collectionItemTitle,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                            numberOfLines={
                              2
                            }
                          >
                            {
                              item.title
                            }
                          </Text>

                          <Text
                            style={[
                              styles.collectionItemSubtitle,
                              {
                                color:
                                  theme.subText,
                              },
                            ]}
                            numberOfLines={
                              3
                            }
                          >
                            {
                              item.subtitle
                            }
                          </Text>

                          <View
                            style={
                              styles.collectionBadgeTagRow
                            }
                          >
                            <View
                              style={[
                                styles.collectionItemTag,
                                {
                                  borderColor:
                                    theme.line,

                                  borderRadius:
                                    isCityBlack
                                      ? 4
                                      : 8,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.collectionItemTagText,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                {
                                  item.badgeType
                                }
                              </Text>
                            </View>

                            {item.isMain && (
                              <View
                                style={[
                                  styles.collectionMainTag,
                                  {
                                    borderColor:
                                      theme.strongLine,

                                    borderRadius:
                                      isCityBlack
                                        ? 4
                                        : 8,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.collectionMainTagText,
                                    {
                                      color:
                                        theme.text,
                                    },
                                  ]}
                                >
                                  대표
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </View>
    )}

    {activeTab === 'album' && (
  <>
    {renderRecordCalendar()}

    <View style={styles.growthList}>
      {growthDays.length === 0 ? (
        <Text
  style={[
    styles.emptyText,
    { color: theme.subText },
  ]}
>
          이 달에는 아직 성장이 없어요.
        </Text>
      ) : (
        growthDays.map((day) => (
  <View key={day.date} style={styles.growthCardShell}>
    <View
  ref={(ref) => {
    growthCardRefs.current[day.date] = ref;
  }}
  collapsable={false}
  style={[
    styles.growthCard,
    {
      backgroundColor: theme.card,
      borderRadius: isCityBlack ? 4 : 24,
      borderWidth: isCityBlack ? 1 : 0,
      borderColor: theme.line,
    },
  ]}
>
           <View
  style={[
    styles.growthMosaicFrame,
    {
      backgroundColor: isCityBlack ? '#080808' : '#ead7b3',
      borderRadius: isCityBlack ? 2 : 0,
    },
  ]}
>
  <View style={styles.growthMosaic}>
    {day.categoryCards.map(
  (item, index) => {
    const cellStyle = [
      styles.growthMosaicCell,

      (
        index === 0 ||
        index === 2
      ) && {
        borderRightWidth:
          1.5,

        borderRightColor:
          isCityBlack
            ? '#18181b'
            : '#f7f0e5',
      },

      (
        index === 0 ||
        index === 1
      ) && {
        borderBottomWidth:
          1.5,

        borderBottomColor:
          isCityBlack
            ? '#18181b'
            : '#f7f0e5',
      },
    ];

    const hasRecord =
      item.count > 0;

    const hasPhoto =
      !!item.photoUri &&
      !!item.photoLog;

    const isCapturingThisCard =
      savingGrowthDate ===
        day.date ||
      externalSharingGrowthDate ===
        day.date;

    return (
      <Pressable
        key={
          `${day.date}_` +
          `${item.id}`
        }
        disabled={!hasRecord}
        style={[
          cellStyle,

          !hasPhoto && {
            backgroundColor:
              isCityBlack
                ? '#101013'
                : '#ead7b3',
          },

          hasRecord &&
            !hasPhoto && {
              backgroundColor:
                isCityBlack
                  ? '#16161a'
                  : '#e8d3a8',
            },
        ]}
        onPress={() =>
          openGrowthGoalPicker(
            day.date,
            item
          )
        }
      >
        {hasPhoto ? (
          <Image
            source={{
              uri: String(
                item.photoUri
              ),
            }}
            style={
              styles.growthMosaicImage
            }
            resizeMode="cover"
          />
        ) : (
          <Text
            style={[
              styles.growthMosaicEmptyText,

              {
                color:
                  isCityBlack
                    ? 'rgba(255,255,255,0.26)'
                    : 'rgba(95,59,27,0.28)',
              },

              hasRecord &&
                styles.growthMosaicRecordText,

              hasRecord && {
                color:
                  isCityBlack
                    ? 'rgba(255,255,255,0.72)'
                    : 'rgba(95,59,27,0.74)',
              },
            ]}
            numberOfLines={2}
          >
            {hasRecord
              ? item.title ||
                item.label
              : item.label}
          </Text>
        )}

        {/*
         * 선택할 행동목표가 둘 이상일 때만
         * 작은 선택 표시를 보여줍니다.
         * 캡처 중에는 공유 이미지에 들어가지 않습니다.
         */}
        {item.count > 1 &&
          !isCapturingThisCard && (
            <View
              pointerEvents="none"
              style={[
                styles
                  .growthMosaicChoiceBadge,

                {
                  backgroundColor:
                    isCityBlack
                      ? 'rgba(0,0,0,0.72)'
                      : 'rgba(255,248,236,0.90)',

                  borderColor:
                    theme.line,

                  borderRadius:
                    isCityBlack
                      ? 3
                      : 999,
                },
              ]}
            >
              <Text
                style={[
                  styles
                    .growthMosaicChoiceBadgeText,

                  {
                    color:
                      isCityBlack
                        ? '#ffffff'
                        : theme.text,
                  },
                ]}
              >
                선택 {item.count}
              </Text>
            </View>
          )}
      </Pressable>
    );
  }
)}
  </View>

  <View
    pointerEvents="none"
    style={styles.growthCenterDayOverlay}
  >
    <Text
  style={[
    styles.growthCenterWeekday,
    {
      color: isCityBlack
        ? 'rgba(255,255,255,0.96)'
        : 'rgba(255, 250, 240, 0.96)',
      textShadowColor: isCityBlack
        ? 'rgba(0,0,0,0.8)'
        : 'rgba(60, 35, 15, 0.38)',
    },
  ]}
>
  {getGrowthWeekdayLabel(day.date)}
</Text>

<Text
  style={[
    styles.growthCenterDate,
    {
      color: isCityBlack
        ? 'rgba(255,255,255,0.78)'
        : 'rgba(255, 250, 240, 0.9)',
      textShadowColor: isCityBlack
        ? 'rgba(0,0,0,0.8)'
        : 'rgba(60, 35, 15, 0.38)',
    },
  ]}
>
  {formatGrowthDateLabel(day.date)}
</Text>
  </View>
</View>



             <View style={styles.growthRootLogo}>
  <Image
    source={require('../../assets/images/icon.png')}
    style={styles.growthRootLogoImage}
    resizeMode="contain"
  />
  <Text
  style={[
    styles.growthRootLogoText,
    {
      color: isCityBlack
        ? 'rgba(255,255,255,0.92)'
        : '#5f3b1b',
    },
  ]}
>
  ROOT
</Text>
</View>
          </View>

          <View
  style={
    styles.growthShareButtonRow
  }
>
  {/* 전체 피드 공유 */}
<Pressable
  style={[
    styles.growthShareSmallButton,
    {
      backgroundColor:
        theme.card,

      borderColor:
        theme.line,

      borderRadius:
        isCityBlack
          ? 4
          : 999,
    },
      (
        savingGrowthDate ===
          day.date ||
        externalSharingGrowthDate ===
          day.date
      ) &&
        styles.growthShareButtonDisabled,
    ]}
    disabled={
      savingGrowthDate ===
        day.date ||
      externalSharingGrowthDate ===
        day.date
    }
    onPress={() =>
      shareGrowthCardToPublicFeed(
        day
      )
    }
  >
    <Text
  style={[
    styles.growthShareSmallButtonText,
    {
      color:
        theme.text,
    },
  ]}
>
      {savingGrowthDate ===
      day.date
        ? '공유 중'
        : '피드공유'}
    </Text>
  </Pressable>

  {/* 카카오톡·인스타 등 외부공유 */}
  <Pressable
    style={[
      styles.growthShareSmallButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.line,

        borderRadius:
          isCityBlack
            ? 4
            : 999,
      },

      (
        savingGrowthDate ===
          day.date ||
        externalSharingGrowthDate ===
          day.date
      ) &&
        styles.growthShareButtonDisabled,
    ]}
    disabled={
      savingGrowthDate ===
        day.date ||
      externalSharingGrowthDate ===
        day.date
    }
    onPress={() =>
      shareGrowthCardExternal(
        day
      )
    }
  >
    <Text
      style={[
        styles.growthShareSmallButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      {externalSharingGrowthDate ===
      day.date
        ? '준비 중'
        : '외부공유'}
    </Text>
  </Pressable>
</View>
        </View>
      ))
      )}
    </View>
  </>
)}

      <View style={{ height: 100 }} />
    </ScrollView>

<Modal
  visible={
    !!explorationJournalDetailRecord
  }
  transparent
  animationType="slide"
  onRequestClose={
    closeExplorationJournalDetail
  }
>
  <View
    style={
      styles.explorationJournalDetailOverlay
    }
  >
    <Pressable
      style={
        styles.explorationJournalDetailBackdrop
      }
      onPress={
        closeExplorationJournalDetail
      }
    />

    <View
      style={[
        styles.explorationJournalDetailBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 20,
        },
      ]}
    >
      <View
        style={
          styles.explorationJournalDetailHeader
        }
      >
        <View
          style={
            styles.explorationJournalDetailTitleBox
          }
        >
          <Text
            style={[
              styles.explorationJournalDetailTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {explorationJournalDetailPlaceMeta
              ?.name ??
              explorationJournalDetailPlaceId}
            {' 여행기'}
          </Text>

          <Text
            style={[
              styles.explorationJournalDetailSubtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {explorationJournalDetailPlaceMeta
              ?.district ??
              '탐험'}
            {' · '}
            {explorationJournalDetailPlaceMeta
              ?.areaType ??
              '방문 장소'}
          </Text>
        </View>

        <Pressable
          onPress={
            closeExplorationJournalDetail
          }
          style={
            styles.explorationJournalDetailClose
          }
        >
          <Text
            style={[
              styles.explorationJournalDetailCloseText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            ×
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={
          styles.explorationJournalDetailScroll
        }
        contentContainerStyle={
          styles.explorationJournalDetailScrollContent
        }
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        <View
          style={[
            styles.explorationJournalDetailVisitBadge,
            {
              backgroundColor:
                theme.background,

              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 2
                  : 10,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalDetailVisitDate,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {formatExplorationVerifiedAt(
              explorationJournalDetailRecord
                ?.verifiedAt
            )}
            {' 방문 인증'}
          </Text>

          <Text
            style={[
              styles.explorationJournalDetailVisitReward,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            +{
              Math.max(
                0,
                Number(
                  explorationJournalDetailReward
                    ?.points
                ) || 0
              )
            }P
            {' · '}
            {explorationJournalDetailPlaceMeta
              ?.rewardLabel ??
              '탐험 건물'}
            {' · 방문 스탬프'}
          </Text>
        </View>

        {explorationJournalDetailPhotoUrls
          .length >
          0 && (
          <>
            <View
              style={
                styles.explorationJournalDetailSectionHeader
              }
            >
              <Text
                style={[
                  styles.explorationJournalDetailSectionTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                사진
              </Text>

              <Text
                style={[
                  styles.explorationJournalDetailPhotoCount,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                {explorationJournalDetailPhotoIndex +
                  1}
                /
                {
                  explorationJournalDetailPhotoUrls
                    .length
                }
              </Text>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={
                false
              }
              onMomentumScrollEnd={(event) => {
                const pageWidth =
                  event.nativeEvent
                    .layoutMeasurement
                    .width;

                const nextIndex =
                  pageWidth > 0
                    ? Math.round(
                        event.nativeEvent
                          .contentOffset.x /
                          pageWidth
                      )
                    : 0;

                setExplorationJournalDetailPhotoIndex(
                  Math.max(
                    0,
                    Math.min(
                      nextIndex,
                      explorationJournalDetailPhotoUrls
                        .length - 1
                    )
                  )
                );
              }}
              style={
                styles.explorationJournalDetailPhotoPager
              }
            >
              {explorationJournalDetailPhotoUrls.map(
                (
                  photoUrl,
                  photoIndex
                ) => (
                  <Pressable
                    key={
                      `${photoUrl}_${photoIndex}`
                    }
                    onPress={() => {
                      setSelectedImageUri(
                        photoUrl
                      );

                      setSelectedImageType(
                        'photo'
                      );

                      setSelectedImageLog(
                        null
                      );
                    }}
                    style={
                      styles.explorationJournalDetailPhotoPage
                    }
                  >
                    <Image
                      source={{
                        uri:
                          photoUrl,
                      }}
                      resizeMode="cover"
                      style={[
                        styles.explorationJournalDetailPhoto,
                        {
                          borderRadius:
                            isCityBlack
                              ? 2
                              : 14,
                        },
                      ]}
                    />
                  </Pressable>
                )
              )}
            </ScrollView>

            <Text
              style={[
                styles.explorationJournalDetailPhotoHint,
                {
                  color:
                    theme.mutedText ??
                    theme.subText,
                },
              ]}
            >
              사진을 누르면 크게 볼 수 있어요.
            </Text>
          </>
        )}

        {explorationJournalDetailMood && (
          <View
            style={[
              styles.explorationJournalDetailMoodCard,
              {
                backgroundColor:
                  theme.background,

                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 2
                    : 10,
              },
            ]}
          >
            <Text
              style={
                styles.explorationJournalDetailMoodEmoji
              }
            >
              {
                explorationJournalDetailMood
                  .emoji
              }
            </Text>

            <View
              style={
                styles.explorationJournalDetailMoodTextBox
              }
            >
              <Text
                style={[
                  styles.explorationJournalDetailMoodCaption,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                그날의 기분
              </Text>

              <Text
                style={[
                  styles.explorationJournalDetailMoodLabel,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {
                  explorationJournalDetailMood
                    .label
                }
              </Text>
            </View>
          </View>
        )}

        {explorationJournalDetailMemo.length >
          0 && (
          <>
            <Text
              style={[
                styles.explorationJournalDetailSectionTitle,
                styles.explorationJournalDetailMemoTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              여행기
            </Text>

            <View
              style={[
                styles.explorationJournalDetailMemoCard,
                {
                  backgroundColor:
                    theme.background,

                  borderColor:
                    theme.line,

                  borderRadius:
                    isCityBlack
                      ? 2
                      : 12,
                },
              ]}
            >
              <Text
                style={[
                  styles.explorationJournalDetailMemo,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {
                  explorationJournalDetailMemo
                }
              </Text>

              {explorationJournalDetailRecord
                ?.journalUpdatedAt && (
                <Text
                  style={[
                    styles.explorationJournalDetailMemoDate,
                    {
                      color:
                        theme.mutedText ??
                        theme.subText,
                    },
                  ]}
                >
                  {formatExplorationVerifiedAt(
                    explorationJournalDetailRecord
                      .journalUpdatedAt
                  )}
                  {' 작성'}
                </Text>
              )}
            </View>
          </>
        )}

        <Text
          style={[
            styles.explorationJournalDetailSectionTitle,
            styles.explorationJournalDetailStatusTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          피드 공유 상태
        </Text>

        <View
          style={[
            styles.explorationJournalDetailStatusCard,
            {
              backgroundColor:
                theme.background,

              borderColor:
                explorationJournalDetailFeedStatus ===
                'needs-reshare'
                  ? theme.strongLine ??
                    theme.line
                  : theme.line,

              borderRadius:
                isCityBlack
                  ? 2
                  : 12,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalDetailStatusLabel,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {
              explorationJournalDetailFeedLabel
            }
          </Text>

          <Text
            style={[
              styles.explorationJournalDetailStatusLine,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            현재 여행기 버전:{' '}
            {explorationJournalDetailRecord
              ?.journalUpdatedAt
              ? formatExplorationVerifiedAt(
                  explorationJournalDetailRecord
                    .journalUpdatedAt
                )
              : '-'}
          </Text>

          <Text
            style={[
              styles.explorationJournalDetailStatusLine,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            공유된 여행기 버전:{' '}
            {explorationJournalDetailRecord
              ?.journalFeedSharedJournalUpdatedAt
              ? formatExplorationVerifiedAt(
                  explorationJournalDetailRecord
                    .journalFeedSharedJournalUpdatedAt
                )
              : '-'}
          </Text>

          <Text
            style={[
              styles.explorationJournalDetailStatusLine,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            마지막 피드 공유:{' '}
            {explorationJournalDetailRecord
              ?.journalFeedSharedAt
              ? formatExplorationVerifiedAt(
                  explorationJournalDetailRecord
                    .journalFeedSharedAt
                )
              : '-'}
          </Text>
        </View>

        {(Number(
          explorationJournalDetailRecord
            ?.distanceMeters
        ) > 0 ||
          Number(
            explorationJournalDetailRecord
              ?.accuracyMeters
          ) > 0) && (
          <View
            style={
              styles.explorationJournalDetailGpsBox
            }
          >
            <Text
              style={[
                styles.explorationJournalDetailGpsTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              GPS 인증 정보
            </Text>

            <Text
              style={[
                styles.explorationJournalDetailGpsText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              인증 지점까지{' '}
              {Math.round(
                Math.max(
                  0,
                  Number(
                    explorationJournalDetailRecord
                      ?.distanceMeters
                  ) || 0
                )
              )}
              m
              {' · 정확도 '}
              {Math.round(
                Math.max(
                  0,
                  Number(
                    explorationJournalDetailRecord
                      ?.accuracyMeters
                  ) || 0
                )
              )}
              m
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={
          styles.explorationJournalDetailButtonRow
        }
      >
        <Pressable
          onPress={() => {
            const placeId =
              explorationJournalDetailPlaceId;

            closeExplorationJournalDetail();

            if (
              placeId
            ) {
              router.push(
                `/explore/place/${placeId}` as any
              );
            }
          }}
          style={({
            pressed,
          }) => [
            styles.explorationJournalDetailButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 2
                  : 9,

              opacity:
                pressed
                  ? 0.65
                  : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalDetailButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            장소 보기
          </Text>
        </Pressable>

        {explorationJournalDetailHasJournal && (
          <Pressable
            onPress={() => {
              const detailRecord =
                explorationJournalDetailRecord;

              closeExplorationJournalDetail();

              requestAnimationFrame(() => {
                openExplorationJournalShare(
                  detailRecord
                );
              });
            }}
            style={({
              pressed,
            }) => [
              styles.explorationJournalDetailButton,
              {
                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 2
                    : 9,

                opacity:
                  pressed
                    ? 0.65
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.explorationJournalDetailButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {explorationJournalDetailFeedStatus ===
              'needs-reshare'
                ? '다시 공유'
                : '공유'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            const detailRecord =
              explorationJournalDetailRecord;

            closeExplorationJournalDetail();

            requestAnimationFrame(() => {
              openExplorationJournal(
                detailRecord
              );
            });
          }}
          style={({
            pressed,
          }) => [
            styles.explorationJournalDetailButton,
            {
              borderColor:
                theme.strongLine ??
                theme.line,

              borderRadius:
                isCityBlack
                  ? 2
                  : 9,

              opacity:
                pressed
                  ? 0.65
                  : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalDetailButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {explorationJournalDetailHasJournal
              ? '수정'
              : '다시 쓰기'}
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>


<Modal
  visible={
    !!explorationJournalRecord
  }
  transparent
  animationType="slide"
  onRequestClose={
    closeExplorationJournal
  }
>
  <KeyboardAvoidingView
    style={
      styles.explorationJournalModalOverlay
    }
    behavior={
      Platform.OS ===
      'ios'
        ? 'padding'
        : undefined
    }
  >
    <Pressable
      style={
        styles.explorationJournalModalBackdrop
      }
      onPress={
        closeExplorationJournal
      }
    />

    <View
      style={[
        styles.explorationJournalModalBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 18,
        },
      ]}
    >
      <View
        style={
          styles.explorationJournalModalHeader
        }
      >
        <View
          style={
            styles.explorationJournalModalTitleBox
          }
        >
          <Text
            style={[
              styles.explorationJournalModalTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {EXPLORATION_PLACE_META[
              String(
                explorationJournalRecord
                  ?.placeId ??
                  ''
              )
            ]?.name ??
              '탐험'}
            {' 여행기'}
          </Text>

          <Text
            style={[
              styles.explorationJournalModalSubtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            방문했을 때의 기분과 기억을 남겨보세요.
          </Text>
        </View>

        <Pressable
          disabled={
            explorationJournalBusy
          }
          onPress={
            closeExplorationJournal
          }
          style={
            styles.explorationJournalModalClose
          }
        >
          <Text
            style={[
              styles.explorationJournalModalCloseText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            ×
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={
          styles.explorationJournalModalScroll
        }
        contentContainerStyle={
          styles.explorationJournalModalScrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
      <Text
        style={[
          styles.explorationJournalFieldLabel,
          {
            color:
              theme.text,
          },
        ]}
      >
        오늘의 기분
      </Text>

      <View
        style={
          styles.explorationJournalMoodWrap
        }
      >
        {EXPLORATION_JOURNAL_MOODS.map(
          (
            mood
          ) => {
            const selected =
              explorationJournalMood ===
              mood.id;

            return (
              <Pressable
                key={
                  mood.id
                }
                disabled={
                  explorationJournalBusy
                }
                onPress={() => {
                  setExplorationJournalMood(
                    (
                      current
                    ) =>
                      current ===
                      mood.id
                        ? null
                        : mood.id
                  );
                }}
                style={({
                  pressed,
                }) => [
                  styles.explorationJournalMoodButton,
                  {
                    backgroundColor:
                      selected
                        ? theme.background
                        : 'transparent',

                    borderColor:
                      selected
                        ? theme.strongLine ??
                          theme.line
                        : theme.line,

                    borderRadius:
                      isCityBlack
                        ? 3
                        : 10,

                    opacity:
                      pressed
                        ? 0.65
                        : 1,
                  },
                ]}
              >
                <Text
                  style={
                    styles.explorationJournalMoodEmoji
                  }
                >
                  {mood.emoji}
                </Text>

                <Text
                  style={[
                    styles.explorationJournalMoodLabel,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                  numberOfLines={
                    1
                  }
                >
                  {mood.label}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>

      <View
        style={
          styles.explorationJournalPhotoLabelRow
        }
      >
        <Text
          style={[
            styles.explorationJournalFieldLabel,
            {
              color:
                theme.text,
            },
          ]}
        >
          사진
        </Text>

        <Text
          style={[
            styles.explorationJournalPhotoCount,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {
            explorationJournalPhotoUrls
              .length
          }
          /5
        </Text>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.explorationJournalPhotoRow
        }
      >
        {explorationJournalPhotoUrls.map(
          (
            photoUrl,
            photoIndex
          ) => {
            const removing =
              explorationJournalPhotoRemovingUrl ===
              photoUrl;

            return (
              <View
                key={
                  `${photoUrl}_${photoIndex}`
                }
                style={
                  styles.explorationJournalPhotoItem
                }
              >
                <Pressable
                  disabled={
                    explorationJournalBusy
                  }
                  onPress={() => {
                    setSelectedImageUri(
                      photoUrl
                    );

                    setSelectedImageType(
                      'photo'
                    );

                    setSelectedImageLog(
                      null
                    );
                  }}
                >
                  <Image
                    source={{
                      uri:
                        photoUrl,
                    }}
                    style={[
                      styles.explorationJournalPhotoImage,
                      {
                        borderRadius:
                          isCityBlack
                            ? 2
                            : 9,
                      },
                    ]}
                  />
                </Pressable>

                <Pressable
                  disabled={
                    explorationJournalBusy
                  }
                  onPress={() => {
                    void handleRemoveExplorationJournalPhoto(
                      photoUrl
                    );
                  }}
                  style={[
                    styles.explorationJournalPhotoRemoveButton,
                    {
                      opacity:
                        removing
                          ? 0.45
                          : 1,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.explorationJournalPhotoRemoveText
                    }
                  >
                    ×
                  </Text>
                </Pressable>
              </View>
            );
          }
        )}

        {explorationJournalPhotoUrls
          .length <
          MAX_EXPLORATION_JOURNAL_PHOTOS && (
          <Pressable
            disabled={
              explorationJournalBusy
            }
            onPress={() => {
              void handlePickExplorationJournalPhotos();
            }}
            style={({
              pressed,
            }) => [
              styles.explorationJournalPhotoAddButton,
              {
                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 2
                    : 9,

                opacity:
                  explorationJournalBusy
                    ? 0.45
                    : pressed
                    ? 0.65
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.explorationJournalPhotoAddIcon,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              +
            </Text>

            <Text
              style={[
                styles.explorationJournalPhotoAddText,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              사진 추가
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <Text
        style={[
          styles.explorationJournalPhotoStatus,
          {
            color:
              theme.mutedText ??
              theme.subText,
          },
        ]}
      >
        {explorationJournalPhotoUploading
          ? `${explorationJournalPhotoUploadProgress.current}/${explorationJournalPhotoUploadProgress.total}장 클라우드 저장 중`
          : explorationJournalPhotoRemovingUrl
          ? '사진 삭제 중'
          : explorationJournalPhotoUrls.length > 0
          ? '선택한 사진은 Firebase에 바로 저장돼요.'
          : '최대 5장 · 선택하면 바로 클라우드에 저장돼요.'}
      </Text>

      <View
        style={
          styles.explorationJournalMemoLabelRow
        }
      >
        <Text
          style={[
            styles.explorationJournalFieldLabel,
            {
              color:
                theme.text,
            },
          ]}
        >
          여행기
        </Text>

        <Text
          style={[
            styles.explorationJournalMemoCount,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {
            explorationJournalMemo
              .length
          }
          /500
        </Text>
      </View>

      <TextInput
        value={
          explorationJournalMemo
        }
        onChangeText={
          setExplorationJournalMemo
        }
        editable={
          !explorationJournalBusy
        }
        maxLength={
          500
        }
        multiline
        textAlignVertical="top"
        placeholder="이 장소에서 기억에 남은 순간을 적어보세요."
        placeholderTextColor={
          theme.mutedText ??
          theme.subText
        }
        style={[
          styles.explorationJournalMemoInput,
          {
            color:
              theme.text,

            backgroundColor:
              'transparent',

            borderColor:
              theme.line,

            borderRadius:
              isCityBlack
                ? 3
                : 12,
          },
        ]}
      />

      <View
        style={
          styles.explorationJournalModalButtonRow
        }
      >
        <Pressable
          disabled={
            explorationJournalBusy
          }
          onPress={
            closeExplorationJournal
          }
          style={({
            pressed,
          }) => [
            styles.explorationJournalModalButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 3
                  : 9,

              opacity:
                pressed
                  ? 0.65
                  : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalModalButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            취소
          </Text>
        </Pressable>

        {explorationJournalCanDelete && (
          <Pressable
            disabled={
              explorationJournalBusy
            }
            onPress={() => {
              openExplorationJournalDelete(
                explorationJournalRecord
              );
            }}
            style={({
              pressed,
            }) => [
              styles.explorationJournalModalButton,
              {
                borderColor:
                  theme.strongLine ??
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 3
                    : 9,

                opacity:
                  explorationJournalDeleting
                    ? 0.45
                    : pressed
                    ? 0.65
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.explorationJournalModalButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              삭제
            </Text>
          </Pressable>
        )}

        <Pressable
          disabled={
            explorationJournalBusy
          }
          onPress={
            handleSaveExplorationJournal
          }
          style={({
            pressed,
          }) => [
            styles.explorationJournalModalButton,
            {
              borderColor:
                theme.strongLine ??
                theme.line,

              borderRadius:
                isCityBlack
                  ? 3
                  : 9,

              opacity:
                explorationJournalSaving
                  ? 0.45
                  : pressed
                  ? 0.65
                  : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalModalButtonText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {explorationJournalPhotoUploading
              ? '사진 저장 중'
              : explorationJournalPhotoRemovingUrl
              ? '사진 삭제 중'
              : explorationJournalSaving
              ? '저장 중'
              : '저장'}
          </Text>
        </Pressable>
      </View>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>


<Modal
  visible={
    !!explorationJournalDeleteRecord
  }
  transparent
  animationType="fade"
  onRequestClose={
    closeExplorationJournalDelete
  }
>
  <View
    style={
      styles.explorationJournalUnshareOverlay
    }
  >
    <Pressable
      style={
        styles.explorationJournalUnshareBackdrop
      }
      onPress={
        closeExplorationJournalDelete
      }
    />

    <View
      style={[
        styles.explorationJournalUnshareBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 18,
        },
      ]}
    >
      <Text
        style={[
          styles.explorationJournalUnshareTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        여행기를 삭제할까요?
      </Text>

      <Text
        style={[
          styles.explorationJournalUnshareDescription,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {explorationJournalDeleteRecord
          ?.hasFeedConnection
          ? '이 여행기는 피드에도 공유되어 있어요. 여행기만 삭제하거나 피드 게시물까지 함께 삭제할 수 있어요.'
          : '여행기 내용과 여행기에 첨부한 원본 사진을 삭제해요. 방문 기록과 탐험 보상은 그대로 유지됩니다.'}
      </Text>

      <View
        style={
          styles.explorationJournalDeleteButtonColumn
        }
      >
        <Pressable
          disabled={
            explorationJournalDeleting
          }
          onPress={
            closeExplorationJournalDelete
          }
          style={[
            styles.explorationJournalDeleteActionButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 3
                  : 9,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalUnshareActionText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            취소
          </Text>
        </Pressable>

        <Pressable
          disabled={
            explorationJournalDeleting
          }
          onPress={() => {
            void handleDeleteExplorationJournal(
              false
            );
          }}
          style={[
            styles.explorationJournalDeleteActionButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 3
                  : 9,

              opacity:
                explorationJournalDeleting
                  ? 0.45
                  : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalUnshareActionText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {explorationJournalDeleting
              ? '삭제 중'
              : explorationJournalDeleteRecord
                  ?.hasFeedConnection
              ? '여행기만 삭제'
              : '여행기 삭제'}
          </Text>
        </Pressable>

        {explorationJournalDeleteRecord
          ?.hasFeedConnection && (
          <Pressable
            disabled={
              explorationJournalDeleting
            }
            onPress={() => {
              void handleDeleteExplorationJournal(
                true
              );
            }}
            style={[
              styles.explorationJournalDeleteActionButton,
              {
                borderColor:
                  theme.strongLine ??
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 3
                    : 9,

                opacity:
                  explorationJournalDeleting
                    ? 0.45
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.explorationJournalUnshareActionText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {explorationJournalDeleting
                ? '삭제 중'
                : '피드도 함께 삭제'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  </View>
</Modal>


<Modal
  visible={
    !!explorationJournalShareRecord
  }
  transparent
  animationType="slide"
  onRequestClose={
    closeExplorationJournalShare
  }
>
  <View
    style={
      styles.explorationJournalShareOverlay
    }
  >
    <Pressable
      style={
        styles.explorationJournalShareBackdrop
      }
      onPress={
        closeExplorationJournalShare
      }
    />

    <View
      style={[
        styles.explorationJournalShareModalBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderTopLeftRadius:
            isCityBlack
              ? 4
              : 24,

          borderTopRightRadius:
            isCityBlack
              ? 4
              : 24,
        },
      ]}
    >
      <View
        style={
          styles.explorationJournalShareHeader
        }
      >
        <View
          style={
            styles.explorationJournalShareHeaderTextBox
          }
        >
          <Text
            style={[
              styles.explorationJournalShareTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            여행기 공유
          </Text>

          <Text
            style={[
              styles.explorationJournalShareSubtitle,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            사진과 방문 기록이 담긴 카드로 공유해요.
          </Text>
        </View>

        <Pressable
          disabled={
            explorationJournalShareBusy
          }
          onPress={
            closeExplorationJournalShare
          }
          style={
            styles.explorationJournalShareClose
          }
        >
          <Text
            style={[
              styles.explorationJournalShareCloseText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            ×
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={
          styles.explorationJournalShareScroll
        }
        contentContainerStyle={
          styles.explorationJournalShareScrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {explorationJournalShareRecord && (() => {
          const shareRecord =
            explorationJournalShareRecord;

          const placeId =
            String(
              shareRecord?.placeId ?? ''
            ).trim();

          const placeMeta =
            EXPLORATION_PLACE_META[
              placeId
            ];

          const placeIcon =
            EXPLORATION_COLLECTION_ICON_BY_PLACE[
              placeId
            ] ?? '🧭';

          const mood =
            getExplorationJournalMood(
              shareRecord?.journalMood
            );

          const memo =
            String(
              shareRecord?.journalMemo ?? ''
            ).trim();

          const photoUrls =
            normalizeExplorationJournalPhotoUrls(
              shareRecord?.journalPhotoUrls
            );

          const firstPhotoUrl =
            photoUrls[0] ?? null;

          const remainingPhotoUrls =
            photoUrls.slice(1);

          return (
            <View
              ref={
                explorationJournalShareCaptureRef
              }
              collapsable={false}
              style={[
                styles.explorationJournalShareCard,
                {
                  backgroundColor:
                    isCityBlack
                      ? '#111214'
                      : '#fffaf0',

                  borderColor:
                    isCityBlack
                      ? '#3f3f46'
                      : '#d9b871',
                },
              ]}
            >
              <View
                style={
                  styles.explorationJournalShareCardTop
                }
              >
                <View>
                  <Text
                    style={[
                      styles.explorationJournalShareBrand,
                      {
                        color:
                          isCityBlack
                            ? '#a1a1aa'
                            : '#9a6a27',
                      },
                    ]}
                  >
                    ROOT EXPLORATION
                  </Text>

                  <Text
                    style={[
                      styles.explorationJournalSharePlaceName,
                      {
                        color:
                          isCityBlack
                            ? '#fafafa'
                            : '#5f3b1b',
                      },
                    ]}
                  >
                    {placeMeta?.name ??
                      placeId}
                  </Text>

                  <Text
                    style={[
                      styles.explorationJournalSharePlaceMeta,
                      {
                        color:
                          isCityBlack
                            ? '#a1a1aa'
                            : '#8f6a43',
                      },
                    ]}
                  >
                    {placeMeta?.district ??
                      '탐험'}
                    {' · '}
                    {placeMeta?.areaType ??
                      '방문 장소'}
                  </Text>
                </View>

                <Text
                  style={
                    styles.explorationJournalSharePlaceIcon
                  }
                >
                  {placeIcon}
                </Text>
              </View>

              <Text
                style={[
                  styles.explorationJournalShareVisitDate,
                  {
                    color:
                      isCityBlack
                        ? '#d4d4d8'
                        : '#6f4b2b',
                  },
                ]}
              >
                {formatExplorationVerifiedAt(
                  shareRecord?.verifiedAt
                )}
                {' 방문'}
              </Text>

              {firstPhotoUrl ? (
                <>
                  <Image
                    source={{
                      uri:
                        firstPhotoUrl,
                    }}
                    resizeMode="cover"
                    style={[
                      styles.explorationJournalShareHeroImage,
                      {
                        borderRadius:
                          isCityBlack
                            ? 3
                            : 14,
                      },
                    ]}
                  />

                  {remainingPhotoUrls.length > 0 && (
                    <View
                      style={
                        styles.explorationJournalSharePhotoGrid
                      }
                    >
                      {remainingPhotoUrls.map(
                        (
                          photoUrl,
                          photoIndex
                        ) => (
                          <Image
                            key={
                              `${photoUrl}_${photoIndex}`
                            }
                            source={{
                              uri:
                                photoUrl,
                            }}
                            resizeMode="cover"
                            style={[
                              styles.explorationJournalShareGridImage,
                              {
                                borderRadius:
                                  isCityBlack
                                    ? 2
                                    : 10,
                              },
                            ]}
                          />
                        )
                      )}
                    </View>
                  )}
                </>
              ) : (
                <View
                  style={[
                    styles.explorationJournalShareNoPhoto,
                    {
                      backgroundColor:
                        isCityBlack
                          ? '#18181b'
                          : '#f6e8c9',

                      borderRadius:
                        isCityBlack
                          ? 3
                          : 14,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.explorationJournalShareNoPhotoIcon
                    }
                  >
                    🧭
                  </Text>

                  <Text
                    style={[
                      styles.explorationJournalShareNoPhotoText,
                      {
                        color:
                          isCityBlack
                            ? '#a1a1aa'
                            : '#8f6a43',
                      },
                    ]}
                  >
                    나의 탐험 여행기
                  </Text>
                </View>
              )}

              {mood && (
                <View
                  style={[
                    styles.explorationJournalShareMoodPill,
                    {
                      backgroundColor:
                        isCityBlack
                          ? '#18181b'
                          : '#f6e8c9',

                      borderColor:
                        isCityBlack
                          ? '#3f3f46'
                          : '#dec38c',
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.explorationJournalShareMoodEmoji
                    }
                  >
                    {mood.emoji}
                  </Text>

                  <Text
                    style={[
                      styles.explorationJournalShareMoodText,
                      {
                        color:
                          isCityBlack
                            ? '#e4e4e7'
                            : '#5f3b1b',
                      },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </View>
              )}

              {memo.length > 0 && (
                <Text
                  style={[
                    styles.explorationJournalShareMemo,
                    {
                      color:
                        isCityBlack
                          ? '#e4e4e7'
                          : '#5f3b1b',
                    },
                  ]}
                  numberOfLines={10}
                >
                  {memo}
                </Text>
              )}

              <View
                style={[
                  styles.explorationJournalShareFooter,
                  {
                    borderTopColor:
                      isCityBlack
                        ? '#3f3f46'
                        : '#e6cf9e',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.explorationJournalShareFooterText,
                    {
                      color:
                        isCityBlack
                          ? '#a1a1aa'
                          : '#9a744b',
                    },
                  ]}
                >
                  현실을 RPG처럼 · ROOT
                </Text>

                <Text
                  style={
                    styles.explorationJournalShareFooterIcon
                  }
                >
                  🌱
                </Text>
              </View>
            </View>
          );
        })()}

        <Text
          style={[
            styles.explorationJournalShareGuide,
            {
              color:
                theme.subText,
            },
          ]}
        >
          피드공유는 전체 피드에 올라가며, 같은 장소를 다시 공유하면 최신 카드로 갱신돼요.
        </Text>

        <View
          style={
            styles.explorationJournalShareButtonRow
          }
        >
          <Pressable
            disabled={
              explorationJournalShareBusy
            }
            onPress={
              closeExplorationJournalShare
            }
            style={[
              styles.explorationJournalShareActionButton,
              {
                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 3
                    : 9,
              },
            ]}
          >
            <Text
              style={[
                styles.explorationJournalShareActionText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              취소
            </Text>
          </Pressable>

          <Pressable
            disabled={
              explorationJournalShareBusy
            }
            onPress={() => {
              void shareExplorationJournalExternal();
            }}
            style={[
              styles.explorationJournalShareActionButton,
              {
                borderColor:
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 3
                    : 9,

                opacity:
                  explorationJournalShareBusy
                    ? 0.45
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.explorationJournalShareActionText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {explorationJournalExternalSharing
                ? '준비 중'
                : '외부공유'}
            </Text>
          </Pressable>

          <Pressable
            disabled={
              explorationJournalShareBusy
            }
            onPress={() => {
              void shareExplorationJournalToFeed();
            }}
            style={[
              styles.explorationJournalShareActionButton,
              {
                borderColor:
                  theme.strongLine ??
                  theme.line,

                borderRadius:
                  isCityBlack
                    ? 3
                    : 9,

                opacity:
                  explorationJournalShareBusy
                    ? 0.45
                    : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.explorationJournalShareActionText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {explorationJournalFeedSharing
                ? '공유 중'
                : '피드공유'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  </View>
</Modal>

<Modal
  visible={
    !!explorationJournalUnshareRecord
  }
  transparent
  animationType="fade"
  onRequestClose={
    closeExplorationJournalFeedUnshare
  }
>
  <View
    style={
      styles.explorationJournalUnshareOverlay
    }
  >
    <Pressable
      style={
        styles.explorationJournalUnshareBackdrop
      }
      onPress={
        closeExplorationJournalFeedUnshare
      }
    />

    <View
      style={[
        styles.explorationJournalUnshareBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 18,
        },
      ]}
    >
      <Text
        style={[
          styles.explorationJournalUnshareTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        피드에서 내릴까요?
      </Text>

      <Text
        style={[
          styles.explorationJournalUnshareDescription,
          {
            color:
              theme.subText,
          },
        ]}
      >
        피드 게시물과 공유 카드 이미지를 삭제해요. 여행기 내용과 여행기에 첨부한 원본 사진은 그대로 유지됩니다.
      </Text>

      <View
        style={
          styles.explorationJournalUnshareButtonRow
        }
      >
        <Pressable
          disabled={
            explorationJournalFeedUnsharing
          }
          onPress={
            closeExplorationJournalFeedUnshare
          }
          style={[
            styles.explorationJournalUnshareActionButton,
            {
              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 3
                  : 9,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalUnshareActionText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            취소
          </Text>
        </Pressable>

        <Pressable
          disabled={
            explorationJournalFeedUnsharing
          }
          onPress={() => {
            void handleUnshareExplorationJournalFeed();
          }}
          style={[
            styles.explorationJournalUnshareActionButton,
            {
              borderColor:
                theme.strongLine ??
                theme.line,

              borderRadius:
                isCityBlack
                  ? 3
                  : 9,

              opacity:
                explorationJournalFeedUnsharing
                  ? 0.45
                  : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.explorationJournalUnshareActionText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {explorationJournalFeedUnsharing
              ? '내리는 중'
              : '피드 내리기'}
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal visible={!!statDetailType} transparent animationType="slide">
  <View style={styles.statDetailOverlay}>
    <View
      style={[
        styles.statDetailBox,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderTopLeftRadius: isCityBlack ? 6 : 28,
          borderTopRightRadius: isCityBlack ? 6 : 28,
          borderWidth: isCityBlack ? 1 : 0,
        },
      ]}
    >
      <View style={styles.statDetailHeader}>
        <Text
          style={[
            styles.statDetailTitle,
            { color: theme.text },
          ]}
        >
          {statDetailType === 'time'
            ? '⏱️ 총 수련 시간'
            : statDetailType === 'count'
            ? '🔥 총 수련 횟수'
            : '📊 총 이동거리'}
        </Text>

        <Pressable onPress={() => setStatDetailType(null)}>
          <Text
            style={[
              styles.statDetailClose,
              { color: theme.text },
            ]}
          >
            ×
          </Text>
        </Pressable>
      </View>

      <ScrollView
  style={
    styles.statDetailList
  }
>
  {statDetailLogs.length ===
  0 ? (
    <Text
      style={[
        styles.statDetailEmpty,
        {
          color:
            theme.subText,
        },
      ]}
    >
      아직 기록이 없어요.
    </Text>
  ) : (
    statDetailLogs.map(
      (log: any) => {
        const categoryIcon =
          categories.find(
            (category) =>
              category.id ===
              log.category
          )?.icon ?? '✨';

        const title =
          log.action_title ??
          log.title ??
          '행동목표';

        const date =
          String(
            log.date ??
              log.log_date ??
              log.createdAt ??
              ''
          ).slice(
            0,
            10
          );

        const value =
          statDetailType ===
          'time'
            ? `${
                Number(
                  log.duration_minutes ??
                    log.minutes ??
                    0
                )
              }분`
            : statDetailType ===
              'count'
            ? '1회'
            : `${Number(
                log.distance_km ??
                  log.distanceKm ??
                  0
              ).toFixed(
                2
              )}km`;

        return (
          <View
            key={
              String(
                log.id
              )
            }
            style={[
  styles.statDetailItem,

  (
    statDetailType ===
      'time' ||
    statDetailType ===
      'count'
  ) &&
    styles.statDetailCompactItem,

  {
    backgroundColor:
      'transparent',

    borderColor:
      theme.line,

    borderRadius:
      isCityBlack
        ? 4
        : 8,
  },
]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
  styles.statDetailLine,

  (
    statDetailType ===
      'time' ||
    statDetailType ===
      'count'
  ) &&
    styles.statDetailCompactLine,

  {
    color:
      theme.text,
  },
]}
            >
              {categoryIcon}{' '}
              {title} · {date} ·{' '}
              {value}
            </Text>
          </View>
        );
      }
    )
  )}
</ScrollView>
    </View>
  </View>
</Modal>

   <Modal visible={showBadgeList} transparent animationType="slide">
  <View style={styles.badgeModalOverlay}>
    <View
      style={[
        styles.badgeModalBox,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderTopLeftRadius: isCityBlack ? 6 : 28,
          borderTopRightRadius: isCityBlack ? 6 : 28,
          borderWidth: isCityBlack ? 1 : 0,
        },
      ]}
    >
      <View style={styles.badgeModalHeader}>
        <Text
          style={[
            styles.badgeModalTitle,
            { color: theme.text },
          ]}
        >
          🏅 전체 뱃지
        </Text>

        <Pressable onPress={() => setShowBadgeList(false)}>
          <Text
            style={[
              styles.badgeModalClose,
              { color: theme.text },
            ]}
          >
            ×
          </Text>
        </Pressable>
      </View>

      <Text
        style={[
          styles.badgeModalDesc,
          { color: theme.subText },
        ]}
      >
        내가 획득한 뱃지와 아직 잠긴 뱃지를 확인해요.
      </Text>

      <View style={styles.badgeFilterRow}>
        {(['all', 'earned'] as const).map((filter) => {
          const selected = badgeFilter === filter;

          return (
            <Pressable
  key={filter}
  style={[
    styles.badgeFilterButton,
    {
      backgroundColor:
        'transparent',

      borderColor:
        selected
          ? theme.strongLine
          : theme.line,

      borderWidth:
        selected
          ? 1
          : 0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 10,
    },
  ]}
  onPress={() =>
    setBadgeFilter(
      filter
    )
  }
>
  <Text
    style={[
      styles.badgeFilterText,
      {
        color:
          theme.text,
      },
    ]}
  >
    {filter === 'all'
      ? '전체 뱃지'
      : '획득한 뱃지'}
  </Text>
</Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.badgeList}>
        {visibleBadges.map(
  (badge) => {
    const earned =
      earnedBadges.some(
        (item) =>
          item?.id ===
          badge.id
      );

    const isMain =
      mainBadgeId ===
      badge.id;

    return (
      <Pressable
        key={badge.id}
        disabled={!earned}
        onPress={async () => {
          if (!earned) {
            return;
          }

          await setRootMainBadgeId(
            badge.id
          );

          setMainBadgeId(
            badge.id
          );
        }}
        style={[
          styles.badgeListItem,
          {
            backgroundColor:
              'transparent',

            borderColor:
              isMain
                ? theme.strongLine
                : theme.line,

            borderWidth:
              isMain
                ? 1
                : 0.5,

            borderRadius:
              isCityBlack
                ? 4
                : 10,

            opacity:
              earned
                ? 1
                : 0.45,
          },
        ]}
      >
        <Text
          style={
            styles.badgeListIcon
          }
        >
          {earned
            ? badge.icon
            : '🔒'}
        </Text>

        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.badgeListLine,
            {
              color:
                earned
                  ? theme.text
                  : theme.subText,
            },
          ]}
        >
          {badge.title} ·{' '}
          {earned
            ? badge.desc
            : badge.conditionText}
        </Text>

        {isMain && (
          <Text
            style={[
              styles.badgeMainText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            대표
          </Text>
        )}
      </Pressable>
    );
  }
)}
      </ScrollView>
    </View>
  </View>
</Modal>

<Modal
  visible={!!selectedImageUri}
  transparent
  animationType="fade"
>
  <View style={styles.imageModalOverlay}>
    <Pressable
  style={styles.imageModalCloseButton}
  hitSlop={16}
  onPress={() => {
  setSelectedImageUri(null);
  setSelectedImageLog(null);
  setSelectedImageType(null);
}}
>
  <Text
  style={[
    styles.imageModalCloseText,
    {
      color: '#ffffff',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
  ]}
>
  ×
</Text>
</Pressable>

    {selectedImageUri && (
      <Image
        source={{ uri: selectedImageUri }}
        style={styles.fullImage}
        resizeMode="contain"
      />
    )}

{selectedImageType === 'route' && selectedImageLog && (() => {
  const distanceKm = getLogDistance(selectedImageLog) ?? 0;
  const minutes = getLogMinutes(selectedImageLog);

  const speedKmh =
    distanceKm > 0 && minutes > 0
      ? distanceKm / (minutes / 60)
      : 0;

  return (
    <View style={styles.imageRouteStatsOverlay}>
      <View style={styles.imageRouteStatsLine}>
        <Text style={styles.imageRouteStatsText}>
          {distanceKm.toFixed(2)}km
        </Text>

        <Text style={styles.imageRouteStatsText}>
          {formatLogClockTime(minutes)}
        </Text>
      </View>

      <View style={styles.imageRouteStatsLine}>
        <Text style={styles.imageRouteStatsText}>
          {speedKmh.toFixed(1)}km/h
        </Text>

        <Text style={styles.imageRouteStatsText}>
          {getLogCalories(selectedImageLog)}kcal
        </Text>
      </View>
    </View>
  );
})()}

   </View>
</Modal>

<Modal
  visible={!!decorateLog}
  transparent
  animationType="fade"
>
  <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={styles.decorateOverlay}>
      <View
        ref={decorateCaptureRef}
        collapsable={false}
        style={styles.decorateCaptureBox}
      >
        {decorateImageUri && (
          <Image
            source={{ uri: decorateImageUri }}
            style={styles.decorateBaseImage}
            resizeMode="cover"
          />
        )}

        {decorateStickers.map((sticker) => (
          <DraggableDecorateSticker
            key={sticker.id}
            sticker={sticker}
            onMove={moveDecorateSticker}
            onRemove={removeDecorateSticker}
            isCaptureMode={isDecorateSaving}
          />
        ))}
      </View>

      {!isDecorateSaving && (
        <Pressable
          style={styles.decorateCloseButton}
          onPress={() => {
            setDecorateLog(null);
            setDecorateImageUri(null);
            setDecorateStickers([]);
            closeCustomStickerModal();
          }}
        >
          <Text
            style={[
              styles.decorateCloseText,
              {
                color: '#ffffff',
                textShadowColor: 'rgba(0,0,0,0.8)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 6,
              },
            ]}
          >
            ×
          </Text>
        </Pressable>
      )}

      {!isDecorateSaving && (
        <View
          style={[
            styles.decorateBottomBar,
            {
              backgroundColor: isCityBlack
                ? 'rgba(9,9,11,0.86)'
                : 'rgba(255,248,236,0.72)',
              borderTopColor: isCityBlack
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(95,59,27,0.12)',
              borderTopWidth: 1,
            },
          ]}
        >
          <Pressable
            style={[
              styles.decorateCancelButton,
              {
                backgroundColor: isCityBlack
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.55)',
                borderColor: isCityBlack
                  ? 'rgba(255,255,255,0.18)'
                  : 'rgba(95,59,27,0.18)',
                borderRadius: isCityBlack ? 4 : 18,
                borderWidth: 1,
              },
            ]}
            onPress={() => {
              setDecorateLog(null);
              setDecorateImageUri(null);
              setDecorateStickers([]);
              closeCustomStickerModal();
            }}
          >
            <Text
              style={[
                styles.decorateCancelText,
                { color: isCityBlack ? '#f4f4f5' : '#5f3b1b' },
              ]}
            >
              닫기
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.decorateTextButton,
              {
                backgroundColor: isCityBlack
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.68)',
                borderColor: isCityBlack
                  ? 'rgba(255,255,255,0.24)'
                  : 'rgba(95,59,27,0.22)',
                borderRadius: isCityBlack ? 4 : 18,
              },
            ]}
            onPress={() => {
              setCustomStickerText('');
              setShowCustomStickerModal(true);
            }}
          >
            <Text
              style={[
                styles.decorateTextButtonText,
                { color: isCityBlack ? '#f4f4f5' : '#5f3b1b' },
              ]}
            >
              글쓰기
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.decorateSaveButton,
              {
                backgroundColor: isCityBlack
                  ? '#f4f4f5'
                  : '#9c651f',
                borderColor: isCityBlack
                  ? '#ffffff'
                  : '#8a551a',
                borderRadius: isCityBlack ? 4 : 18,
                borderWidth: 1,
              },
            ]}
            onPress={saveDecoratedLogPhoto}
          >
            <Text
              style={[
                styles.decorateSaveText,
                { color: isCityBlack ? '#09090b' : '#ffffff' },
              ]}
            >
              적용하기
            </Text>
          </Pressable>
        </View>
      )}

      {showCustomStickerModal && !isDecorateSaving && (
        <KeyboardAvoidingView
          style={styles.decorateTextEditorOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeCustomStickerModal}
          />

          <Pressable
            style={[
              styles.decorateTextEditorBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 24,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text
              style={[
                styles.decorateTextEditorTitle,
                { color: theme.text },
              ]}
            >
              빈칸 스티커
            </Text>

            <Text
              style={[
                styles.decorateTextEditorDescription,
                { color: theme.subText },
              ]}
            >
              사진에 넣을 글을 직접 입력해 주세요.
            </Text>

            <TextInput
              value={customStickerText}
              onChangeText={setCustomStickerText}
              placeholder="예: 오늘도 해냈다"
              placeholderTextColor={theme.mutedText}
              maxLength={40}
              multiline
              autoFocus
              style={[
                styles.decorateTextEditorInput,
                {
                  backgroundColor: theme.card2,
                  borderColor: theme.line,
                  color: theme.text,
                  borderRadius: isCityBlack ? 4 : 16,
                },
              ]}
            />

            <Text
              style={[
                styles.decorateTextEditorCount,
                { color: theme.mutedText },
              ]}
            >
              {customStickerText.length} / 40
            </Text>

            <View style={styles.decorateTextEditorButtonRow}>
              <Pressable
                style={[
                  styles.decorateTextEditorCancelButton,
                  {
                    backgroundColor: theme.card2,
                    borderColor: theme.line,
                    borderRadius: isCityBlack ? 4 : 16,
                  },
                ]}
                onPress={closeCustomStickerModal}
              >
                <Text
                  style={[
                    styles.decorateTextEditorCancelText,
                    { color: theme.text },
                  ]}
                >
                  취소
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.decorateTextEditorAddButton,
                  {
                    backgroundColor: '#fff',
                    borderColor: theme.strongLine,
                    borderRadius: isCityBlack ? 4 : 16,
                    opacity: customStickerText.trim() ? 1 : 0.45,
                  },
                ]}
                disabled={!customStickerText.trim()}
                onPress={addCustomTextSticker}
              >
                <Text
                  style={[
                    styles.decorateTextEditorAddText,
                    { color: theme.buttonText },
                  ]}
                >
                  스티커 추가
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </View>
  </GestureHandlerRootView>
</Modal>


<Modal
  visible={!!editingLog}
  transparent
  animationType="slide"
>
  <KeyboardAvoidingView
    style={styles.editLogOverlay}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <View
      style={[
        styles.editLogBox,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderTopLeftRadius: isCityBlack ? 6 : 28,
          borderTopRightRadius: isCityBlack ? 6 : 28,
          borderWidth: isCityBlack ? 1 : 0,
        },
      ]}
    >
      <View style={styles.editLogHeader}>
        <Text
          style={[
            styles.editLogTitle,
            { color: theme.text },
          ]}
        >
          기록 수정
        </Text>

        <Pressable
          onPress={() => {
            setEditingLog(null);
            setEditPhotoUri(null);
            setEditMemo('');
          }}
        >
          <Text
            style={[
              styles.editLogClose,
              { color: theme.text },
            ]}
          >
            ×
          </Text>
        </Pressable>
      </View>

      <View style={styles.editPhotoOnlyArea}>
        {editPhotoUri ? (
          <View
            style={[
              styles.editPhotoPreviewBox,
              {
                backgroundColor: theme.card2,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 18,
              },
            ]}
          >
            <Image
              source={{ uri: editPhotoUri }}
              style={styles.editPhotoPreview}
              resizeMode="cover"
            />

            <Pressable
  style={[
    styles.editPhotoDecorateButton,
    {
      /*
       * 사진이 버튼 뒤로 보이도록
       * 버튼 배경을 완전히 투명하게 합니다.
       */
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderWidth:
        1,

      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
              onPress={() => {
                if (!editingLog || !editPhotoUri) return;

                const currentSavedPhotoUri = getLogPhotoUri(editingLog);

                const isNewUnsavedPhoto =
                  editPhotoUri !== currentSavedPhotoUri;

                const sourcePhotoUri = isNewUnsavedPhoto
                  ? editPhotoUri
                  : getLogOriginalPhotoUri(editingLog);

                openDecorateForLog(
                  editingLog,
                  sourcePhotoUri,
                  !isNewUnsavedPhoto
                );

                setEditingLog(null);
                setEditPhotoUri(null);
                setEditMemo('');
              }}
            >
              <Text
  style={[
    styles.editPhotoDecorateButtonText,
    {
            color:
        theme.text,
    },
  ]}
>
  꾸미기
</Text>
            </Pressable>

            <Pressable
              style={[
                styles.editPhotoRemoveButton,
                {
                  backgroundColor: isCityBlack
                    ? '#2a1515'
                    : '#fff1df',
                  borderColor: isCityBlack
                    ? '#5f2a2a'
                    : '#e5b58a',
                  borderRadius: isCityBlack ? 4 : 16,
                  borderWidth: 1,
                },
              ]}
              onPress={removeEditPhoto}
            >
              <Text
                style={[
                  styles.editPhotoRemoveText,
                  {
                    color: isCityBlack
                      ? '#ffb4b4'
                      : '#8a3f1f',
                  },
                ]}
              >
                사진 삭제
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
  style={[
    styles.editPhotoEmptyBox,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 18,
    },
  ]}
>
            <Text
              style={[
                styles.editPhotoEmptyText,
                { color: theme.subText },
              ]}
            >
              아직 사진이 없어요.
            </Text>
          </View>
        )}

        <View style={styles.editPhotoButtonRow}>
          <Pressable
  style={[
    styles.editPhotoButton,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
  onPress={
    pickEditPhotoFromGallery
  }
>
            <Text
              style={[
                styles.editPhotoButtonText,
                { color: theme.text },
              ]}
            >
              앨범에서 선택
            </Text>
          </Pressable>

          <Pressable
  style={[
    styles.editPhotoButton,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
  onPress={takeEditPhoto}
>
            <Text
              style={[
                styles.editPhotoButtonText,
                { color: theme.text },
              ]}
            >
              카메라 촬영
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.editLogButtonRow}>
        <Pressable
  style={[
    styles.editLogCancelButton,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
          onPress={() => {
            setEditingLog(null);
            setEditPhotoUri(null);
            setEditMemo('');
          }}
        >
          <Text
            style={[
              styles.editLogCancelText,
              { color: theme.text },
            ]}
          >
            취소
          </Text>
        </Pressable>

  <Pressable
  style={[
    styles.editLogSaveButton,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
  onPress={saveEditedLog}
>
  <Text
    style={[
      styles.editLogSaveText,
      {
        color:
          theme.text,
      },
    ]}
  >
    저장
  </Text>
</Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal
  visible={!!shareLog}
  transparent
  animationType="slide"
>
  <KeyboardAvoidingView
  style={styles.shareModalOverlay}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
  <View
  style={[
    styles.shareModalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderTopLeftRadius: isCityBlack ? 6 : 28,
      borderTopRightRadius: isCityBlack ? 6 : 28,
    },
  ]}
>
   

{shareLog && (
  <View style={styles.sharePreviewSection}>
    {getLogFeedPhotoUri(shareLog) ? (
      <Image
        source={{
          uri: String(
            getLogFeedPhotoUri(
              shareLog
            )
          ),
        }}
        style={[
          styles.sharePreviewImage,
          {
            backgroundColor:
              theme.card2,

            borderColor:
              theme.line,

            borderRadius:
              isCityBlack
                ? 4
                : 16,
          },
        ]}
        resizeMode="contain"
      />
    ) : null}

    <View
      style={[
        styles.sharePreviewBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 18,
        },
      ]}
    >
      <View
        style={
          styles.sharePreviewContent
        }
      >
        <Text
          style={[
            styles.sharePreviewTitle,
            {
              color:
                theme.text,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {shareLog.action_title ??
            shareLog.title ??
            '행동목표'}
        </Text>

        <Text
          style={[
            styles.sharePreviewText,
            {
              color:
                theme.subText,
            },
          ]}
          numberOfLines={1}
        >
          {String(
            shareLog.date ?? ''
          ).replace(/-/g, '.')}

          {' · '}

          {shareLog.duration_minutes ??
            shareLog.minutes ??
            0}
          분

          {(shareLog.distance_km !=
            null ||
            shareLog.distanceKm !=
              null)
            ? ` · ${Number(
                shareLog.distance_km ??
                  shareLog.distanceKm
              ).toFixed(2)}km`
            : ''}
        </Text>
      </View>
    </View>
  </View>
)}

      <Text
  style={[
    styles.shareLabel,
    { color: theme.text },
  ]}
>
  공유 위치
</Text>

      <View style={styles.shareTargetRow}>
  <Pressable
    style={[
      styles.shareTargetButton,
      {
        backgroundColor:
  theme.card,

borderColor:
  shareTarget === 'public'
    ? theme.strongLine
    : theme.line,
        borderRadius: isCityBlack ? 4 : 16,
      },
    ]}
    onPress={() => {
      setShareTarget('public');
      setSelectedCrewId(null);
    }}
  >
    <Text
      style={[
        styles.shareTargetText,
        {
          color:
  theme.text,
        },
      ]}
    >
      전체공개
    </Text>
  </Pressable>

 <Pressable
  style={[
    styles.shareTargetButton,
    {
      backgroundColor:
        theme.card,

      borderColor:
        shareTarget ===
        'crew'
          ? theme.strongLine
          : theme.line,

      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
  onPress={() =>
    setShareTarget(
      'crew'
    )
  }
>
  <Text
    style={[
      styles.shareTargetText,
      {
        color:
          theme.text,
      },
    ]}
  >
    크루공개
  </Text>
</Pressable>
</View>
{shareTarget === 'crew' && (
  <View
    style={
      styles.crewSelectBox
    }
  >
    {categoryMatchedShareCrews.map(
  (crew: any) => (
        <Pressable
          key={
            String(crew.id)
          }
          style={[
            styles.crewSelectButton,
            {
              backgroundColor:
                String(
                  selectedCrewId
                ) ===
                String(crew.id)
                  ? theme.button
                  : theme.card2,

              borderColor:
                String(
                  selectedCrewId
                ) ===
                String(crew.id)
                  ? theme.strongLine
                  : theme.line,

              borderRadius:
                isCityBlack
                  ? 4
                  : 16,
            },
          ]}
          onPress={() =>
            setSelectedCrewId(
              String(crew.id)
            )
          }
        >
          <Text
            style={[
              styles.crewSelectText,
              {
                color:
                  String(
                    selectedCrewId
                  ) ===
                  String(crew.id)
                    ? theme.buttonText
                    : theme.text,
              },
            ]}
          >
            {categories.find(
              (category) =>
                category.id ===
                crew.category
            )?.icon ?? '👥'}{' '}
            {crew.title}
          </Text>
        </Pressable>
      )
    )}


    {categoryMatchedShareCrews.length ===
  0 && (
      <Text
  style={[
    styles.noCrewText,
    {
      color:
        theme.subText,
    },
  ]}
>
  같은 카테고리의 가입 크루가 없어요.{'\n'}
  전체공개는 바로 사용할 수 있어요.
</Text>
    )}
  </View>
)}

      <View style={styles.shareModalButtonRow}>
  <Pressable
  style={[
    styles.shareCancelButton,
    {
      backgroundColor:
        theme.card,
      borderColor:
        theme.line,
      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
  onPress={() =>
    setShareLog(null)
  }
>
  <Text
    style={[
      styles.shareCancelText,
      {
        color:
          theme.text,
      },
    ]}
  >
    취소
  </Text>
</Pressable>

 {shareLog?.sharedToCrew && (
  <Pressable
    style={[
      styles.shareUnshareButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.line,

        borderRadius:
          isCityBlack
            ? 4
            : 16,

        opacity:
          isUnsharingCrewPost
            ? 0.55
            : 1,
      },
    ]}
    disabled={
      isUnsharingCrewPost
    }
    onPress={
      handleUnshareCrewPost
    }
  >
    <Text
      style={[
        styles.shareUnshareText,
        {
          color:
            theme.text,
        },
      ]}
      numberOfLines={1}
    >
      {isUnsharingCrewPost
        ? '내리는 중...'
        : '공유내리기'}
    </Text>
  </Pressable>
)}

<Pressable
  style={[
    styles.shareSubmitButton,
    {
      backgroundColor:
        theme.card,

      borderColor:
        theme.line,

      borderRadius:
        isCityBlack
          ? 4
          : 16,

      opacity:
        isSharingCrewPost
          ? 0.55
          : 1,
    },
  ]}
  disabled={
    isSharingCrewPost
  }
  onPress={
    handleShareCrewPost
  }
>
  <Text
    style={[
      styles.shareSubmitText,
      {
        color:
          theme.text,
      },
    ]}
  >
    {isSharingCrewPost
      ? '공유 중'
      : '공유하기'}
  </Text>
</Pressable>
    
</View>
    </View>
  </KeyboardAvoidingView>
</Modal>
  

<Modal
  visible={
    !!growthGoalPicker
  }
  transparent
  animationType="fade"
  onRequestClose={() =>
    setGrowthGoalPicker(
      null
    )
  }
>
  <View
    style={
      styles
        .growthGoalPickerOverlay
    }
  >
    <View
      style={[
        styles
          .growthGoalPickerBox,

        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 6
              : 26,
        },
      ]}
    >
      <View
        style={
          styles
            .growthGoalPickerHeader
        }
      >
        <View
          style={
            styles
              .growthGoalPickerHeaderText
          }
        >
          <Text
            style={[
              styles
                .growthGoalPickerTitle,

              {
                color:
                  theme.text,
              },
            ]}
          >
            {categories.find(
              (category) =>
                category.id ===
                growthGoalPicker
                  ?.categoryId
            )?.icon ?? '✨'}{' '}
            {
              growthGoalPicker
                ?.categoryLabel
            }에서 보여줄 목표
          </Text>

          <Text
            style={[
              styles
                .growthGoalPickerDate,

              {
                color:
                  theme.subText,
              },
            ]}
          >
            {String(
              growthGoalPicker
                ?.date ?? ''
            ).replace(
              /-/g,
              '.'
            )}
            {' · '}
            오늘 완료한 행동목표 중 하나를 선택하세요.
          </Text>
        </View>

        <Pressable
          style={[
            styles
              .growthGoalPickerClose,

            {
              backgroundColor:
                theme.card2,

              borderRadius:
                isCityBlack
                  ? 4
                  : 18,
            },
          ]}
          onPress={() =>
            setGrowthGoalPicker(
              null
            )
          }
        >
          <Text
            style={[
              styles
                .growthGoalPickerCloseText,

              {
                color:
                  theme.text,
              },
            ]}
          >
            ×
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={
          styles
            .growthGoalPickerList
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {(
          growthGoalPicker
            ?.logs ?? []
        ).map(
          (log: any) => {
            const logId =
              String(
                log?.id ??
                  ''
              );

              const goalIdentity =
  getGrowthGoalIdentity(
    log
  );

            const selectionKey =
              getGrowthSelectionKey(
                growthGoalPicker
                  ?.date ??
                  '',
                growthGoalPicker
                  ?.categoryId ??
                  ''
              );

            const savedGoalIdentity =
  selectedGrowthLogIds[
    selectionKey
  ];

            const defaultLog =
              (
                growthGoalPicker
                  ?.logs ?? []
              ).find(
                (candidate: any) =>
                  !!getLogPhotoUri(
                    candidate
                  )
              ) ??
              growthGoalPicker
                ?.logs?.[0] ??
              null;

           const currentGoalIdentity =
  savedGoalIdentity ??
  (
    defaultLog
      ? getGrowthGoalIdentity(
          defaultLog
        )
      : ''
  );

const isSelected =
  goalIdentity ===
  String(
    currentGoalIdentity
  );

            const photoUri =
              getLogPhotoUri(
                log
              );

            const minutes =
              getLogMinutes(
                log
              );

            const distance =
              getLogDistance(
                log
              );

            return (
              <Pressable
                key={
                  `${growthGoalPicker?.date}_` +
                  `${growthGoalPicker?.categoryId}_` +
                  `${logId}`
                }
                style={[
                  styles
                    .growthGoalPickerRow,

                  {
                    backgroundColor:
                      isSelected
                        ? theme.card2
                        : theme.card,

                    borderColor:
                      isSelected
                        ? theme.strongLine
                        : theme.line,

                    borderRadius:
                      isCityBlack
                        ? 4
                        : 18,
                  },
                ]}
                onPress={() => {
                  void selectGrowthGoalLog(
                    log
                  );
                }}
              >
                {photoUri ? (
                  <Image
                    source={{
                      uri: String(
                        photoUri
                      ),
                    }}
                    style={
                      styles
                        .growthGoalPickerThumbnail
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles
                        .growthGoalPickerPlaceholder,

                      {
                        backgroundColor:
                          theme.card2,

                        borderColor:
                          theme.line,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles
                          .growthGoalPickerPlaceholderIcon
                      }
                    >
                      {
                        categories.find(
                          (
                            category
                          ) =>
                            category.id ===
                            growthGoalPicker
                              ?.categoryId
                        )?.icon ??
                        '✨'
                      }
                    </Text>
                  </View>
                )}

                <View
                  style={
                    styles
                      .growthGoalPickerContent
                  }
                >
                  <Text
                    style={[
                      styles
                        .growthGoalPickerRowTitle,

                      {
                        color:
                          theme.text,
                      },
                    ]}
                    numberOfLines={
                      2
                    }
                  >
                    {getLogTitle(
                      log
                    )}
                  </Text>

                  <Text
                    style={[
                      styles
                        .growthGoalPickerRowMeta,

                      {
                        color:
                          theme.subText,
                      },
                    ]}
                    numberOfLines={
                      1
                    }
                  >
                    {formatGrowthMinutes(
                      minutes
                    )}

                    {distance !==
                    null
                      ? ` · ${distance.toFixed(
                          2
                        )}km`
                      : ''}

                    {photoUri
                      ? ' · 사진 있음'
                      : ''}
                  </Text>
                </View>

                <View
                  style={[
                    styles
                      .growthGoalPickerCheck,

                    {
                      backgroundColor:
                        isSelected
                          ? theme.button
                          : theme.card2,

                      borderColor:
                        isSelected
                          ? theme.strongLine
                          : theme.line,

                      borderRadius:
                        isCityBlack
                          ? 4
                          : 999,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles
                        .growthGoalPickerCheckText,

                      {
                        color:
                          isSelected
                            ? theme.buttonText
                            : theme.subText,
                      },
                    ]}
                  >
                    {isSelected
                      ? '선택됨'
                      : '선택'}
                  </Text>
                </View>
              </Pressable>
            );
          }
        )}
      </ScrollView>
    </View>
  </View>
</Modal>

<Modal visible={!!newBadge} transparent animationType="fade">
  <View style={styles.newBadgeOverlay}>
    <View
      style={[
        styles.newBadgeBox,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderRadius: isCityBlack ? 6 : 28,
          borderWidth: isCityBlack ? 1 : 2,
        },
      ]}
    >
      <Text
        style={[
          styles.newBadgeTitle,
          { color: theme.text },
        ]}
      >
        🎉 새로운 뱃지 획득!
      </Text>

      <Text style={styles.newBadgeIcon}>
        {newBadge?.icon}
      </Text>

      <Text
        style={[
          styles.newBadgeName,
          { color: theme.text },
        ]}
      >
        {newBadge?.title}
      </Text>

      <Text
        style={[
          styles.newBadgeDesc,
          { color: theme.subText },
        ]}
      >
        {newBadge?.desc}
      </Text>

      <Pressable
        style={[
          styles.newBadgeButton,
          {
            backgroundColor: '#fff',
            borderColor: theme.strongLine,
            borderRadius: isCityBlack ? 4 : 18,
            borderWidth: 1,
          },
        ]}
        onPress={() => setNewBadge(null)}
      >
        <Text
          style={[
            styles.newBadgeButtonText,
            { color: theme.buttonText },
          ]}
        >
          확인
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal visible={!!noticeModal} transparent animationType="fade">
  <View style={styles.noticeOverlay}>
    <View
      style={[
        styles.noticeBox,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderRadius: isCityBlack ? 6 : 28,
        },
      ]}
    >
      <Text style={styles.noticeIcon}>🦊</Text>

      <Text
        style={[
          styles.noticeTitle,
          { color: theme.text },
        ]}
      >
        {noticeModal?.title}
      </Text>

      <Text
        style={[
          styles.noticeMessage,
          { color: theme.subText },
        ]}
      >
        {noticeModal?.message}
      </Text>

      <Pressable
  style={[
    styles.noticeButton,
    {
     
      backgroundColor:
        theme.card,

      borderColor:
        theme.strongLine,

      borderRadius:
        isCityBlack
          ? 4
          : 14,

      borderWidth:
        1,
    },
  ]}
  onPress={() =>
    setNoticeModal(null)
  }
>
  <Text
    style={[
      styles.noticeButtonText,
      {
        
        color:
          theme.text,
      },
    ]}
  >
    확인
  </Text>
</Pressable>
    </View>
  </View>
</Modal>
  </>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5e9cf',
    paddingHorizontal: 18,
  },

  title: {
    marginTop: 52,
    fontSize: 42,
    fontWeight: '900',
    color: '#6b3514',
  },
inlineMapBox: {
  marginTop: 12,
  borderRadius: 18,
  overflow: 'hidden',
  backgroundColor: '#ddd',
},

noticeOverlay: {
  flex: 1,
  backgroundColor: 'rgba(61, 37, 21, 0.45)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 24,
},

noticeBox: {
  width: '100%',
  backgroundColor: '#fff8ec',
  borderRadius: 28,
  padding: 26,
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#d8b56c',
},

noticeIcon: {
  fontSize: 52,
  marginBottom: 10,
},

noticeTitle: {
  fontSize: 24,
  fontWeight: '900',
  color: '#5f3b1b',
  textAlign: 'center',
},

noticeMessage: {
  marginTop: 12,
  fontSize: 16,
  fontWeight: '800',
  color: '#8b6a45',
  textAlign: 'center',
  lineHeight: 24,
},

noticeButton: {
  marginTop: 20,
  paddingVertical: 9,
  paddingHorizontal: 32,
  alignItems: 'center',
  justifyContent: 'center',
},

noticeButtonText: {
  fontSize: 15,
  fontWeight: '900',
},

inlineMap: {
  width: '100%',
  height: 240,
},
tabRow: {
  marginTop: 64,
  flexDirection: 'row',
  backgroundColor: '#dfd1bc',
  borderRadius: 18,
  padding: 3,
},

tabButton: {
  flex: 1,
  minWidth: 0,
  paddingVertical: 9,
  paddingHorizontal: 2,
  alignItems: 'center',
  borderRadius: 18,
},

imageModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.9)',
  justifyContent: 'center',
  alignItems: 'center',
},

imageModalCloseArea: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
},

imageModalCloseText: {
  color: '#fff',
  fontSize: 46,
  fontWeight: '900',
  lineHeight: 52,
},

fullImage: {
  width: '100%',
  height: '85%',
},
  
  activeTab: {
    backgroundColor: '#f7f0e5',
  },

  tabText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#5f3b1b',
    letterSpacing: -0.35,
  },

  activeCategory: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },

  
  categoryRow: {
  marginTop: 22,
  flexDirection: 'row',
  flexWrap: 'nowrap',
  justifyContent: 'space-between',
  gap: 6,
},


categoryButton: {
  flex: 1,
  paddingVertical: 10,
  paddingHorizontal: 4,
  borderRadius: 14,
  backgroundColor: '#fff8ec',
  borderWidth: 1.5,
  borderColor: '#d8b56c',
  alignItems: 'center',
},

shareButton: {
  marginTop: 14,
  backgroundColor: '#9c651f',
  borderRadius: 16,
  paddingVertical: 13,
  alignItems: 'center',
},

shareButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '900',
},

shareModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

shareModalBox: {
  backgroundColor: '#f7f0e5',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  padding: 20,
  paddingBottom: 60,
  maxHeight: '84%',
},

shareModalTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: '#5f3b1b',
  marginBottom: 12,
},

sharePreviewTitle: {
  flex: 1,
  flexShrink: 1,
  marginRight: 12,
  fontSize: 18,
  fontWeight: '900',
},

sharePreviewText: {
  flexShrink: 0,
  fontSize: 13,
  fontWeight: '900',
  textAlign: 'right',
},


shareInput: {
  backgroundColor: '#fff8ec',
  borderRadius: 16,
  padding: 14,
  fontSize: 15,
  fontWeight: '700',
  color: '#5f3b1b',
  borderWidth: 1.5,
  borderColor: '#dfc28e',
  minHeight: 48,
},



activeShareTarget: {
  backgroundColor: '#f59e0b',
  borderColor: '#f59e0b',
},




badgeModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

badgeModalBox: {
  backgroundColor: '#f7f0e5',
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  padding: 20,
  paddingBottom: 34,
  maxHeight: '88%',
},

badgeModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

badgeModalTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: '#5f3b1b',
},

badgeModalClose: {
  fontSize: 34,
  fontWeight: '900',
  color: '#7a4c1f',
},

badgeModalDesc: {
  marginTop: 8,
  marginBottom: 14,
  fontSize: 15,
  fontWeight: '800',
  color: '#8b6a45',
},

categoryText: {
  fontSize: 12,
  fontWeight: '900',
  color: '#5f3b1b',
},

  statRowIcon: {
    width: 38,
    marginRight: 12,
    fontSize: 27,
    textAlign: 'center',
  },

  
  crewSelectBox: {
  marginTop: 12,
  gap: 8,
},
statList: {
  marginTop: 14,
  gap: 7,
},

statRow: {
  width: '100%',
  minHeight: 42,
  paddingHorizontal: 14,
  paddingVertical: 0,

  flexDirection: 'row',
  alignItems: 'center',

  borderWidth: 0.5,
},

statRowLabel: {
  flex: 1,
  fontSize: 14,
  fontWeight: '800',
},

statRowRight: {
  marginLeft: 8,
  flexDirection: 'row',
  alignItems: 'center',
},

statRowValue: {
  minWidth: 65,
  fontSize: 15,
  fontWeight: '900',
  textAlign: 'right',
},

statRowArrow: {
  width: 18,
  marginLeft: 5,
  fontSize: 19,
  fontWeight: '700',
  textAlign: 'center',
},

crewSelectButton: {
  backgroundColor: '#fff8ec',
  borderRadius: 16,
  paddingVertical: 13,
  paddingHorizontal: 14,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

activeCrewSelectButton: {
  backgroundColor: '#f59e0b',
  borderColor: '#f59e0b',
},

sharedRow: {
  marginTop: 14,
  flexDirection: 'row',
  gap: 10,
},

sharedButton: {
  flex: 1,
  backgroundColor: '#ead7b3',
  borderRadius: 16,
  paddingVertical: 13,
  alignItems: 'center',
},

sharedButtonText: {
  color: '#7a4c1f',
  fontSize: 15,
  fontWeight: '900',
},

editShareButton: {
  width: 90,
  backgroundColor: '#9c651f',
  borderRadius: 16,
  paddingVertical: 13,
  alignItems: 'center',
},

editShareButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '900',
},

crewSelectText: {
  fontSize: 15,
  fontWeight: '900',
  color: '#5f3b1b',
},

noCrewText: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: '800',
  color: '#8b6a45',
  },

 timelineCard: {
  marginTop: 12,
  paddingHorizontal: 16,
  paddingVertical: 13,
  borderWidth: 1,
},

  timelineTop: {
  flexDirection: 'row',
  alignItems: 'center',
},

timelineHeaderContent: {
  flex: 1,
  minWidth: 0,
},

 timelineTitle: {
  flex: 1,
  minWidth: 0,
  fontSize: 18,
  fontWeight: '900',
},

  timelineDate: {
    marginTop: 6,
    fontSize: 15,
    color: '#8b6a45',
    fontWeight: '700',
  },

  memoText: {
    marginTop: 8,
    color: '#7a4c1f',
    fontSize: 15,
  },

  badge: {
    fontSize: 24,
  },

  timelineGpsBox: {
  marginTop: 12,
  backgroundColor: '#e8f1ff',
  borderRadius: 14,
  padding: 12,
},

timelineGpsText: {
  color: '#2563eb',
  fontSize: 15,
  fontWeight: '900',
},

  timelineImageBox: {
  marginTop: 16,
  width: '100%',
  height: 260,

  overflow: 'hidden',

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

timelineImage: {
  width: '100%',
  height: '100%',
},

  emptyText: {
    marginTop: 60,
    textAlign: 'center',
    color: '#8b6a45',
    fontSize: 20,
    fontWeight: '800',
  },
  activeMainBadgeItem: {
  borderColor: '#f59e0b',
  borderWidth: 2,
  backgroundColor: '#fff3d1',
},
mainBadgeCard: {
  backgroundColor:'#fff8ec',
  borderRadius:20,
  padding:18,
  marginTop:20,
  borderWidth:1.5,
  borderColor:'#dfc28e',
},

mainBadgeLabel:{
  fontSize:16,
  fontWeight:'900',
  color:'#8b6a45',
},

mainBadgeText:{
  marginTop:10,
  fontSize:24,
  fontWeight:'900',
  color:'#5f3b1b',
},


newBadgeOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 24,
},

newBadgeBox: {
  width: '100%',
  backgroundColor: '#fff8ec',
  borderRadius: 28,
  padding: 26,
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#f59e0b',
},

newBadgeTitle: {
  fontSize: 24,
  fontWeight: '900',
  color: '#5f3b1b',
},

newBadgeIcon: {
  marginTop: 18,
  fontSize: 64,
},

newBadgeName: {
  marginTop: 10,
  fontSize: 26,
  fontWeight: '900',
  color: '#7a3514',
},

newBadgeDesc: {
  marginTop: 10,
  fontSize: 16,
  fontWeight: '800',
  color: '#8b6a45',
  textAlign: 'center',
},

newBadgeButton: {
  marginTop: 22,
  backgroundColor: '#f59e0b',
  borderRadius: 18,
  paddingVertical: 14,
  paddingHorizontal: 50,
},

newBadgeButtonText: {
  color: '#fff',
  fontSize: 17,
  fontWeight: '900',
},

statDetailOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

statDetailBox: {
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 22,
  maxHeight: '78%',
},

statDetailHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

statDetailTitle: {
  fontSize: 20,
  fontWeight: '900',
},

statDetailClose: {
  fontSize: 28,
  fontWeight: '800',
},

statDetailList: {
  marginTop: 12,
  maxHeight: 560,
},

statDetailItem: {
  height: 42,
  marginBottom: 7,
  paddingHorizontal: 12,
  paddingVertical: 0,

  borderWidth: 0.5,

  justifyContent: 'center',
},

statDetailItemTitle: {
  fontSize: 17,
  fontWeight: '900',
  color: '#5f3b1b',
},

statDetailItemSub: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: '800',
  color: '#8b6a45',
},

statDetailEmpty: {
  paddingVertical: 40,
  textAlign: 'center',
  fontSize: 17,
  fontWeight: '900',
  color: '#8b6a45',
},
routeSavedImageBox: {
  marginTop: 12,
  borderRadius: 18,
  overflow: 'hidden',
  backgroundColor: '#ddd',
},

routeSavedImage: {
  width: '100%',
  height: 240,
},

timelineActionRow: {
  marginTop: 14,
  flexDirection: 'row',
  gap: 10,
},

editLogOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'flex-end',
},

editLogBox: {
  backgroundColor: '#f7f0e5',
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  padding: 20,
  paddingBottom: 40,
  maxHeight: '90%',
},

editLogHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 14,
},

editLogTitle: {
  fontSize: 26,
  fontWeight: '900',
  color: '#5f3b1b',
},

editLogClose: {
  fontSize: 36,
  fontWeight: '900',
  color: '#7a4c1f',
},

editLogPreviewBox: {
  backgroundColor: '#fff8ec',
  borderRadius: 18,
  padding: 14,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
  marginBottom: 16,
},

editLogPreviewTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#5f3b1b',
},

editLogPreviewSub: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: '800',
  color: '#8b6a45',
},

editLogLabel: {
  marginTop: 12,
  marginBottom: 8,
  fontSize: 15,
  fontWeight: '900',
  color: '#5f3b1b',
},

editPhotoPreviewBox: {
  position: 'relative',
  backgroundColor: '#fff8ec',
  borderRadius: 20,
  overflow: 'hidden',
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

editPhotoOnlyArea: {
  marginTop: 8,
},

editPhotoPreview: {
  width: '100%',
  height: 420,
},

editPhotoEmptyBox: {
  height: 360,
  borderRadius: 22,
  backgroundColor: '#fff8ec',
  borderWidth: 1.5,
  borderColor: '#dfc28e',
  alignItems: 'center',
  justifyContent: 'center',
},

editPhotoRemoveButton: {
  paddingVertical: 13,
  alignItems: 'center',
  backgroundColor: '#ead7b3',
},

editPhotoRemoveText: {
  fontSize: 15,
  fontWeight: '900',
  color: '#7a4c1f',
},


editPhotoEmptyText: {
  fontSize: 15,
  fontWeight: '800',
  color: '#8b6a45',
},


imageModalCloseButton: {
  position: 'absolute',
  top: 52,
  right: 24,
  width: 58,
  height: 58,
  borderRadius: 29,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
  elevation: 999,
},

imageModalBottomBar: {
  position: 'absolute',
  left: 20,
  right: 20,
  bottom: 42,
  zIndex: 20,
},

imageDecorateButton: {
  backgroundColor: 'rgba(245, 158, 11, 0.95)',
  borderRadius: 20,
  paddingVertical: 15,
  alignItems: 'center',
},

imageDecorateButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '900',
},

decorateOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.92)',
  justifyContent: 'center',
  alignItems: 'center',
},

decorateCaptureBox: {
  width: '92%',
  height: '82%',
  backgroundColor: '#111',
  overflow: 'hidden',
  borderRadius: 18,
},

decorateBaseImage: {
  ...StyleSheet.absoluteFillObject,
  width: '100%',
  height: '100%',
},

decorateSingleSticker: {
  position: 'absolute',
  left: 0,
  top: 0,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 12,
  backgroundColor: 'rgba(90,90,90,0.42)',
  zIndex: 20,
  elevation: 20,
},

decorateSingleStickerCapture: {
  backgroundColor: 'transparent',
  elevation: 0,
},

decorateSingleStickerText: {
  color: '#fff',
  fontWeight: '900',
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 4,
},

decorateStickerDelete: {
  position: 'absolute',
  top: -10,
  right: -10,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: 'rgba(90,90,90,0.75)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.45)',
  alignItems: 'center',
  justifyContent: 'center',
},

decorateStickerDeleteText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '900',
  lineHeight: 20,
},

decorateRouteSticker: {
  width: 210,
  height: 210,
  paddingVertical: 10,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

decorateCloseButton: {
  position: 'absolute',
  top: 48,
  right: 24,
  zIndex: 50,
},

decorateCloseText: {
  color: '#fff',
  fontSize: 44,
  fontWeight: '900',
},

decorateBottomBar: {
  position: 'absolute',
  left: 20,
  right: 20,
  bottom: 42,
  flexDirection: 'row',
  gap: 12,
  zIndex: 50,
},

decorateCancelButton: {
  flex: 1,
  backgroundColor: 'rgba(120,120,120,0.65)',
  borderRadius: 18,
  paddingVertical: 14,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.35)',
},

decorateSaveButton: {
  flex: 1,
  backgroundColor: 'rgba(245, 158, 11, 0.95)',
  borderRadius: 18,
  paddingVertical: 14,
  alignItems: 'center',
},

decorateCancelText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '900',
},

decorateSaveText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '900',
},

decorateTextButton: {
  flex: 1,
  paddingVertical: 14,
  alignItems: 'center',
  borderWidth: 1,
},

decorateTextButtonText: {
  fontSize: 15,
  fontWeight: '900',
},

decorateTextEditorOverlay: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 100,
  elevation: 100,
  justifyContent: 'center',
  paddingHorizontal: 24,
  backgroundColor: 'rgba(0,0,0,0.64)',
},

decorateTextEditorBox: {
  width: '100%',
  maxWidth: 420,
  alignSelf: 'center',
  padding: 22,
  borderWidth: 1,
},

decorateTextEditorTitle: {
  fontSize: 23,
  fontWeight: '900',
},

decorateTextEditorDescription: {
  marginTop: 8,
  fontSize: 14,
  fontWeight: '700',
  lineHeight: 21,
},

decorateTextEditorInput: {
  minHeight: 104,
  marginTop: 18,
  paddingHorizontal: 15,
  paddingVertical: 14,
  borderWidth: 1,
  fontSize: 19,
  fontWeight: '800',
  textAlignVertical: 'top',
},

decorateTextEditorCount: {
  marginTop: 8,
  fontSize: 12,
  fontWeight: '700',
  textAlign: 'right',
},

decorateTextEditorButtonRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 18,
},

decorateTextEditorCancelButton: {
  flex: 1,
  paddingVertical: 14,
  alignItems: 'center',
  borderWidth: 1,
},

decorateTextEditorAddButton: {
  flex: 1,
  paddingVertical: 14,
  alignItems: 'center',
  borderWidth: 1,
},

decorateTextEditorCancelText: {
  fontSize: 16,
  fontWeight: '900',
},

decorateTextEditorAddText: {
  fontSize: 16,
  fontWeight: '900',
},

growthList: {
  marginTop: 22,
  gap: 18,
},

growthCard: {
  backgroundColor: '#f7f0e5',
  borderRadius: 28,
  padding: 14,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

growthMosaic: {
  width: '100%',
  height: '100%',
  flexDirection: 'row',
  flexWrap: 'wrap',
  overflow: 'hidden',
  borderRadius: 0,
  backgroundColor: '#ead7b3',
},

growthMosaicCell: {
  width: '50%',
  height: '50%',
  backgroundColor: '#ead7b3',
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
},

growthMosaicEmptyText: {
  fontSize: 28,
  fontWeight: '900',
  color: 'rgba(95, 59, 27, 0.16)',
  textAlign: 'center',
  paddingHorizontal: 12,
},
growthMosaicRecordCell: {
  backgroundColor: '#e8d3a8',
},

growthMosaicRecordText: {
  color: 'rgba(95, 59, 27, 0.48)',
  fontSize: 26,
},


growthMosaicRightLine: {
  borderRightWidth: 1.5,
  borderRightColor: '#f7f0e5',
},

growthMosaicBottomLine: {
  borderBottomWidth: 1.5,
  borderBottomColor: '#f7f0e5',
},

growthMosaicImage: {
  width: '100%',
  height: '100%',
},

growthMosaicEmptyCell: {
  backgroundColor: '#ead7b3',
},


growthCalendarBox: {
  marginTop: 22,
  backgroundColor: '#f7f0e5',
  borderRadius: 26,
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 12,
  borderWidth: 1.5,
  borderColor: '#dfc28e',
},

growthCalendarHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
},

growthMonthButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: '#ead7b3',
  alignItems: 'center',
  justifyContent: 'center',
},

growthMonthButtonText: {
  fontSize: 30,
  fontWeight: '900',
  color: '#6b3514',
  lineHeight: 34,
},

growthMonthTitle: {
  fontSize: 28,
  fontWeight: '900',
  color: '#5f3b1b',
},
growthWeekRow: {
  flexDirection: 'row',
  marginBottom: 0,
},

growthWeekText: {
  width: `${100 / 7}%`,
  textAlign: 'center',
  fontSize: 13,
  fontWeight: '900',
  color: '#8b6a45',
},

growthCalendarGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
},

growthCalendarDay: {
  width: `${100 / 7}%`,
  height: 20,
  alignItems: 'center',
  justifyContent: 'center',
},

growthCalendarBlankDay: {
  opacity: 0,
},

growthCalendarRecordDay: {
  backgroundColor: '#fff8ec',
},

growthCalendarSelectedDay: {
  backgroundColor: '#f59e0b',
},

growthCalendarDayText: {
  fontSize: 12,
  fontWeight: '900',
  color: 'rgba(95, 59, 27, 0.35)',
},

growthCalendarRecordDayText: {
  color: '#5f3b1b',
},

growthCalendarSelectedDayText: {
  color: '#fff',
},

growthCalendarDot: {
  marginTop: 3,
  width: 5,
  height: 5,
  borderRadius: 2.5,
  backgroundColor: '#f59e0b',
},

growthCalendarSelectedDot: {
  backgroundColor: '#fff',
},

growthSelectedDateButton: {
  marginTop: 12,
  backgroundColor: '#ead7b3',
  borderRadius: 16,
  paddingVertical: 11,
  alignItems: 'center',
},

growthSelectedDateText: {
  fontSize: 14,
  fontWeight: '900',
  color: '#7a4c1f',
},
growthCalendarDayCircle: {
  width: 20,
  height: 20,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

growthCalendarRecordCircle: {
  backgroundColor: '#fff8ec',
  borderWidth: 1.2,
  borderColor: '#f59e0b',
},

growthCalendarSelectedCircle: {
  backgroundColor: '#f59e0b',
  borderColor: '#f59e0b',
},
growthCardShell: {
  position: 'relative',
},

growthShareButtonRow: {
  position: 'absolute',

  /*
   * 기존 ROOT 스티커가 있던
   * 카드 오른쪽 아래 위치입니다.
   */
  right: 12,
  bottom: 20,

  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,

  zIndex: 30,
  elevation: 30,
},

growthShareSmallButton: {
  minWidth: 74,
  height: 38,

  paddingHorizontal: 10,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 1,
},

growthShareSmallButtonText: {
  fontSize: 11,
  fontWeight: '900',
},

growthShareButtonDisabled: {
  opacity: 0.55,
},


growthShareButton: {
  backgroundColor: '#f59e0b',
  borderRadius: 18,
  paddingVertical: 14,
  alignItems: 'center',
  borderWidth: 1.5,
  borderColor: '#d8b56c',
},

growthShareButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '900',
},
growthRootLogo: {
  position: 'absolute',
  right: 12,
  bottom: 20,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 248, 236, 0.88)',
  borderRadius: 999,
  paddingVertical: 5,
  paddingLeft: 6,
  paddingRight: 10,
  borderWidth: 1,
  borderColor: 'rgba(107, 63, 24, 0.18)',
},

growthRootLogoImage: {
  width: 22,
  height: 22,
  borderRadius: 7,
  marginRight: 5,
},

growthRootLogoText: {
  fontSize: 12,
  fontWeight: '900',
  color: '#6B3F18',
  letterSpacing: 0.5,
},

timelineTitleDateRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
  gap: 10,
},

timelineDateInline: {
  flexShrink: 0,
  fontSize: 13,
  fontWeight: '800',
},

timelineShareButton: {
  flex: 1,
  backgroundColor: '#9c651f',
  borderRadius: 16,
  paddingVertical: 13,
  alignItems: 'center',
},

timelineShareButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '900',
},

routeSavedStatsLine: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

routeSavedMiniBadge: {
  position: 'absolute',
  left: 12,
  right: 12,
  bottom: 12,
  backgroundColor: 'rgba(20, 30, 45, 0.82)',
  borderRadius: 14,
  paddingVertical: 9,
  paddingHorizontal: 14,
  gap: 5,
},

routeSavedMiniText: {
  flex: 1,
  color: '#fff',
  fontSize: 14,
  fontWeight: '900',
  textAlign: 'center',
},
editPhotoDecorateButton: {
  position: 'absolute',
  top: 14,
  right: 14,
  backgroundColor: 'rgba(61, 37, 21, 0.62)',
  borderRadius: 999,
  paddingVertical: 9,
  paddingHorizontal: 16,
  zIndex: 5,
},

editPhotoDecorateButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '900',
},
imageRouteStatsOverlay: {
  position: 'absolute',
  left: 28,
  right: 28,
  bottom: 86,
  backgroundColor: 'rgba(12, 18, 28, 0.82)',
  borderRadius: 24,
  paddingVertical: 16,
  paddingHorizontal: 22,
  zIndex: 30,
},

imageRouteStatsLine: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginVertical: 3,
},

imageRouteStatsText: {
  color: '#fff',
  fontSize: 20,
  fontWeight: '900',
},
actionGoalHistoryHeader: {
  marginTop: 20,
  padding: 18,
  borderWidth: 1,
},

actionGoalHistoryTopRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

actionGoalHistoryTitleArea: {
  flex: 1,
  minWidth: 0,
},

actionGoalHistoryLabel: {
  fontSize: 12,
  fontWeight: '800',
},

actionGoalHistoryTitle: {
  marginTop: 5,
  fontSize: 22,
  fontWeight: '900',
},

actionGoalHistoryAllButton: {
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderWidth: 1,
},

actionGoalHistoryAllButtonText: {
  fontSize: 12,
  fontWeight: '900',
},

actionGoalHistorySummaryRow: {
  marginTop: 14,
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  rowGap: 4,
},

actionGoalHistorySummaryText: {
  fontSize: 14,
  fontWeight: '800',
},

actionGoalHistorySummaryDot: {
  marginHorizontal: 7,
  fontSize: 14,
  fontWeight: '900',
},

timelineBottomButtonRow: {
  marginTop: 11,
  flexDirection: 'row',
  gap: 8,
},

timelineEditButton: {
  flex: 1,
  height: 34,
  borderWidth: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

timelineEditButtonText: {
  fontSize: 13,
  fontWeight: '900',
},

timelineCrewShareButton: {
  flex: 1,
  height: 34,
  borderWidth: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

timelineCrewShareButtonText: {
  fontSize: 13,
  fontWeight: '900',
},

timelineExternalShareButton: {
  flex: 1,
  height: 34,
  borderWidth: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

timelineExternalShareButtonText: {
  fontSize: 13,
  fontWeight: '900',
},

growthMosaicFrame: {
  width: '100%',
  aspectRatio: 1,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#ead7b3',
},

growthCenterDayOverlay: {
  position: 'absolute',
  left: 0,
  right: 0,
  top: '50%',
  marginTop: -46,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20,
},

growthCenterWeekday: {
  fontSize: 54,
  fontWeight: '900',
  color: 'rgba(255, 250, 240, 0.96)',
  textAlign: 'center',
  letterSpacing: -1.5,
  textShadowColor: 'rgba(60, 35, 15, 0.38)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 8,
},

growthCenterDate: {
  marginTop: -4,
  fontSize: 14,
  fontWeight: '900',
  color: 'rgba(255, 250, 240, 0.9)',
  textAlign: 'center',
  letterSpacing: 1,
  textShadowColor: 'rgba(60, 35, 15, 0.38)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 5,
},

pastGoalDetails: {
  marginTop: 8,
  marginBottom: 18,
},

pastGoalEmptyBox: {
  minHeight: 48,
  paddingHorizontal: 12,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 0.5,
},

pastGoalEmptyText: {
  fontSize: 13,
  fontWeight: '700',
  textAlign: 'center',
},

pastGoalCard: {
  minHeight: 62,
  marginBottom: 7,
  paddingHorizontal: 12,
  paddingVertical: 8,

  flexDirection: 'row',
  alignItems: 'center',

  borderWidth: 0.5,
},

pastGoalCardContent: {
  flex: 1,
  minWidth: 0,
},

pastGoalTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

pastGoalIcon: {
  marginRight: 6,
  fontSize: 18,
},

pastGoalTitle: {
  flex: 1,
  fontSize: 14,
  fontWeight: '900',
},

pastGoalDate: {
  marginTop: 3,
  fontSize: 11,
  fontWeight: '700',
},

pastGoalSummary: {
  marginTop: 3,
  fontSize: 12,
  fontWeight: '800',
},

pastGoalArrow: {
  marginLeft: 8,
  fontSize: 20,
  fontWeight: '700',
},


growthMosaicChoiceBadge: {
  position: 'absolute',
  top: 8,
  right: 8,

  minWidth: 48,
  height: 24,

  paddingHorizontal: 8,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 1,

  zIndex: 12,
  elevation: 12,
},

growthMosaicChoiceBadgeText: {
  fontSize: 10,
  fontWeight: '900',
},

growthGoalPickerOverlay: {
  flex: 1,

  backgroundColor:
    'rgba(20, 14, 10, 0.58)',

  justifyContent: 'center',

  paddingHorizontal: 22,
  paddingVertical: 50,
},

growthGoalPickerBox: {
  width: '100%',
  maxHeight: '76%',

  borderWidth: 1,

  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 10,
},

growthGoalPickerHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent:
    'space-between',

  gap: 12,
},

growthGoalPickerHeaderText: {
  flex: 1,
},

growthGoalPickerTitle: {
  fontSize: 19,
  fontWeight: '900',
},

growthGoalPickerDate: {
  marginTop: 6,

  fontSize: 12,
  fontWeight: '700',
  lineHeight: 18,
},

growthGoalPickerClose: {
  width: 36,
  height: 36,

  alignItems: 'center',
  justifyContent: 'center',
},

growthGoalPickerCloseText: {
  fontSize: 24,
  fontWeight: '900',
  lineHeight: 28,
},

growthGoalPickerList: {
  marginTop: 16,
},

growthGoalPickerRow: {
  minHeight: 78,

  flexDirection: 'row',
  alignItems: 'center',

  marginBottom: 10,
  padding: 9,

  borderWidth: 1,
},

growthGoalPickerThumbnail: {
  width: 60,
  height: 60,
  borderRadius: 10,
},

growthGoalPickerPlaceholder: {
  width: 60,
  height: 60,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 1,
  borderRadius: 10,
},

growthGoalPickerPlaceholderIcon: {
  fontSize: 25,
},

growthGoalPickerContent: {
  flex: 1,

  marginHorizontal: 11,
},

growthGoalPickerRowTitle: {
  fontSize: 15,
  fontWeight: '900',
},

growthGoalPickerRowMeta: {
  marginTop: 6,

  fontSize: 11,
  fontWeight: '700',
},

growthGoalPickerCheck: {
  minWidth: 54,
  height: 30,

  paddingHorizontal: 8,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 1,
},

growthGoalPickerCheckText: {
  fontSize: 10,
  fontWeight: '900',
},
editPhotoButtonRow: {
  marginTop: 10,
  flexDirection: 'row',
  gap: 10,
},

editPhotoButton: {
  flex: 1,
  height: 42,
  borderWidth: 1.5,
  alignItems: 'center',
  justifyContent: 'center',
},

editPhotoButtonText: {
  fontSize: 15,
  fontWeight: '900',
},

editLogButtonRow: {
  marginTop: 8,
  marginBottom: 58,
  paddingBottom: 8,
  flexDirection: 'row',
  gap: 10,
},

editLogCancelButton: {
  flex: 1,
  height: 42,
  borderWidth: 1.5,
  alignItems: 'center',
  justifyContent: 'center',
},

editLogCancelText: {
  fontSize: 15,
  fontWeight: '900',
},

editLogSaveButton: {
  flex: 1,
  height: 42,
  borderWidth: 1.5,
  alignItems: 'center',
  justifyContent: 'center',
},

editLogSaveText: {
  fontSize: 15,
  fontWeight: '900',
},
sharePreviewBox: {
  minHeight: 0,
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderWidth: 1.5,
},
sharePreviewContent: {
  minHeight: 28,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
shareLabel: {
  marginTop: 8,
  marginBottom: 6,
  fontSize: 15,
  fontWeight: '900',
},

shareTargetRow: {
  flexDirection: 'row',
  gap: 8,
},

shareTargetButton: {
  flex: 1,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
},

shareTargetText: {
  fontSize: 14,
  fontWeight: '900',
},

shareModalButtonRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 8,
  marginBottom: 2,
},

shareCancelButton: {
  flex: 1,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
},

shareSubmitButton: {
  flex: 1,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
},

shareUnshareButton: {
  flex: 1,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1.5,
},

shareCancelText: {
  fontSize: 14,
  fontWeight: '900',
},

shareSubmitText: {
  fontSize: 14,
  fontWeight: '900',
},

shareUnshareText: {
  fontSize: 14,
  fontWeight: '900',
},
sharePreviewSection: {
  width: '100%',
  marginBottom: 12,
},

sharePreviewImage: {
  width: '100%',
  height: 320,
  marginBottom: 8,
  borderWidth: 1,
  overflow: 'hidden',
},
statDetailLine: {
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: '800',
},

badgeFilterRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 12,
  marginBottom: 12,
},

badgeFilterButton: {
  flex: 1,
  height: 36,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 0.5,
},

badgeFilterText: {
  fontSize: 13,
  fontWeight: '800',
},

badgeList: {
  maxHeight: 560,
},

badgeListItem: {
  minHeight: 44,
  marginBottom: 7,
  paddingHorizontal: 11,
  paddingVertical: 7,

  flexDirection: 'row',
  alignItems: 'center',

  borderWidth: 0.5,
},

badgeListIcon: {
  width: 28,
  marginRight: 6,
  fontSize: 19,
  textAlign: 'center',
},

badgeListLine: {
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: '800',
},

badgeMainText: {
  marginLeft: 8,
  fontSize: 11,
  fontWeight: '900',
},
statDetailCompactItem: {
  height: 24,
  marginBottom: 4,
  paddingHorizontal: 10,
  paddingVertical: 0,
},

statDetailCompactLine: {
  fontSize: 12,
  lineHeight: 15,
},


explorationRecordSection: {
  paddingTop: 14,
  paddingBottom: 28,
},

explorationSummaryCard: {
  borderWidth: 0.5,
  paddingHorizontal: 16,
  paddingVertical: 15,
  marginBottom: 18,
},

explorationSummaryTopRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
},

explorationSummaryTitleBox: {
  flex: 1,
  minWidth: 0,
},

explorationSummaryTitle: {
  fontSize: 18,
  fontWeight: '900',
},

explorationSummarySubtitle: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: '700',
  lineHeight: 18,
},

explorationSummaryCompass: {
  marginLeft: 12,
  fontSize: 28,
},

explorationSummaryStats: {
  marginTop: 16,
  flexDirection: 'row',
  alignItems: 'center',
},

explorationSummaryStat: {
  flex: 1,
  alignItems: 'center',
},

explorationSummaryStatValue: {
  fontSize: 18,
  fontWeight: '900',
},

explorationSummaryStatLabel: {
  marginTop: 3,
  fontSize: 11,
  fontWeight: '700',
},

explorationSummaryDivider: {
  width: 0.5,
  height: 28,
},

explorationThemeSection: {
  marginBottom: 18,
},

explorationSectionTitle: {
  marginBottom: 9,
  fontSize: 15,
  fontWeight: '900',
},

explorationThemeWrap: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 7,
},

explorationThemeChip: {
  maxWidth: '100%',
  minHeight: 34,
  paddingHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 0.5,
},

explorationThemeIcon: {
  marginRight: 6,
  fontSize: 16,
},

explorationThemeName: {
  flexShrink: 1,
  fontSize: 12,
  fontWeight: '800',
},

explorationVisitList: {
  gap: 9,
},

explorationVisitCard: {
  borderWidth: 0.5,
  paddingHorizontal: 14,
  paddingVertical: 13,
},

explorationVisitHeader: {
  flexDirection: 'row',
  alignItems: 'center',
},

explorationVisitIconBox: {
  width: 30,
  height: 30,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationVisitIcon: {
  fontSize: 18,
},

explorationVisitTitleBox: {
  flex: 1,
  minWidth: 0,
  marginLeft: 7,
},

explorationVisitName: {
  fontSize: 15,
  fontWeight: '900',
},

explorationVisitMeta: {
  marginTop: 2,
  fontSize: 11,
  fontWeight: '700',
},

explorationVisitArrow: {
  marginLeft: 8,
  fontSize: 23,
  fontWeight: '700',
},

explorationVisitDate: {
  marginTop: 10,
  fontSize: 12,
  fontWeight: '800',
},

explorationVisitReward: {
  marginTop: 4,
  fontSize: 11,
  fontWeight: '700',
  lineHeight: 17,
},

explorationVisitGps: {
  marginTop: 4,
  fontSize: 10,
  fontWeight: '700',
  lineHeight: 15,
},

explorationJournalPreview: {
  marginTop: 10,
  paddingHorizontal: 11,
  paddingVertical: 10,
  borderWidth: 0.5,
},

explorationJournalPreviewHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},

explorationJournalPreviewLabel: {
  fontSize: 11,
  fontWeight: '900',
},

explorationJournalPreviewMood: {
  flexShrink: 1,
  fontSize: 10,
  fontWeight: '800',
},


explorationJournalPreviewHeaderRight: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexShrink: 1,
  gap: 6,
},

explorationJournalDetailOpenButton: {
  height: 24,
  paddingHorizontal: 8,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.6,
},

explorationJournalDetailOpenText: {
  fontSize: 9,
  fontWeight: '900',
},

explorationJournalPreviewMemo: {
  marginTop: 7,
  fontSize: 11,
  fontWeight: '700',
  lineHeight: 17,
},

explorationJournalPreviewDate: {
  marginTop: 7,
  fontSize: 9,
  fontWeight: '700',
},

explorationJournalPreviewPhotoRow: {
  marginTop: 8,
  gap: 7,
},

explorationJournalPreviewPhoto: {
  width: 64,
  height: 64,
  borderWidth: 0.5,
  borderColor: 'rgba(120, 90, 55, 0.22)',
},

explorationJournalButton: {
  alignSelf: 'flex-end',
  minWidth: 82,
  height: 30,
  marginTop: 0,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.7,
},

explorationJournalButtonText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationJournalFeedStatusBadge: {
  minHeight: 30,
  marginTop: 10,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderWidth: 0.8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},

explorationJournalFeedStatusText: {
  flex: 1,
  fontSize: 12,
  fontWeight: '800',
},

explorationJournalFeedStatusDate: {
  fontSize: 10,
  fontWeight: '600',
},

explorationJournalActionRow: {
  marginTop: 10,
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 7,
},

explorationJournalActionRowButton: {
  marginTop: 0,
},

explorationJournalShareButton: {
  marginTop: 0,
  minWidth: 76,
},

explorationJournalUnshareButton: {
  marginTop: 0,
  minWidth: 76,
},

explorationJournalUnshareOverlay: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 24,
},

explorationJournalUnshareBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(20, 14, 10, 0.52)',
},

explorationJournalUnshareBox: {
  width: '100%',
  maxWidth: 420,
  borderWidth: 0.5,
  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: 18,
},

explorationJournalUnshareTitle: {
  fontSize: 20,
  fontWeight: '900',
},

explorationJournalUnshareDescription: {
  marginTop: 12,
  fontSize: 13,
  fontWeight: '700',
  lineHeight: 21,
},

explorationJournalUnshareButtonRow: {
  marginTop: 20,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
},

explorationJournalUnshareActionButton: {
  flex: 1,
  minHeight: 42,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 10,
},

explorationJournalUnshareActionText: {
  fontSize: 13,
  fontWeight: '900',
},

explorationJournalDeleteButtonColumn: {
  marginTop: 20,
  gap: 8,
},

explorationJournalDeleteActionButton: {
  width: '100%',
  minHeight: 42,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 12,
},

explorationJournalDetailOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
},

explorationJournalDetailBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(20, 14, 10, 0.58)',
},

explorationJournalDetailBox: {
  width: '100%',
  maxHeight: '92%',
  paddingHorizontal: 18,
  paddingTop: 18,
  paddingBottom: 26,
  borderWidth: 0.5,
},

explorationJournalDetailHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

explorationJournalDetailTitleBox: {
  flex: 1,
  minWidth: 0,
},

explorationJournalDetailTitle: {
  fontSize: 21,
  fontWeight: '900',
},

explorationJournalDetailSubtitle: {
  marginTop: 5,
  fontSize: 11,
  fontWeight: '700',
},

explorationJournalDetailClose: {
  width: 34,
  height: 34,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationJournalDetailCloseText: {
  fontSize: 25,
  fontWeight: '900',
  lineHeight: 28,
},

explorationJournalDetailScroll: {
  flexShrink: 1,
  marginTop: 14,
},

explorationJournalDetailScrollContent: {
  paddingBottom: 14,
},

explorationJournalDetailVisitBadge: {
  paddingHorizontal: 12,
  paddingVertical: 11,
  borderWidth: 0.6,
},

explorationJournalDetailVisitDate: {
  fontSize: 12,
  fontWeight: '900',
},

explorationJournalDetailVisitReward: {
  marginTop: 5,
  fontSize: 10,
  fontWeight: '700',
  lineHeight: 16,
},

explorationJournalDetailSectionHeader: {
  marginTop: 18,
  marginBottom: 9,
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
},

explorationJournalDetailSectionTitle: {
  fontSize: 14,
  fontWeight: '900',
},

explorationJournalDetailPhotoCount: {
  fontSize: 10,
  fontWeight: '700',
},

explorationJournalDetailPhotoPager: {
  width: '100%',
},

explorationJournalDetailPhotoPage: {
  width: 330,
  paddingRight: 10,
},

explorationJournalDetailPhoto: {
  width: 320,
  height: 220,
  borderWidth: 0.5,
  borderColor: 'rgba(120, 90, 55, 0.22)',
},

explorationJournalDetailPhotoHint: {
  marginTop: 7,
  fontSize: 9,
  fontWeight: '700',
},

explorationJournalDetailMoodCard: {
  marginTop: 18,
  paddingHorizontal: 12,
  paddingVertical: 11,
  borderWidth: 0.6,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

explorationJournalDetailMoodEmoji: {
  fontSize: 27,
},

explorationJournalDetailMoodTextBox: {
  flex: 1,
},

explorationJournalDetailMoodCaption: {
  fontSize: 9,
  fontWeight: '700',
},

explorationJournalDetailMoodLabel: {
  marginTop: 2,
  fontSize: 13,
  fontWeight: '900',
},

explorationJournalDetailMemoTitle: {
  marginTop: 18,
},

explorationJournalDetailMemoCard: {
  marginTop: 9,
  paddingHorizontal: 13,
  paddingVertical: 12,
  borderWidth: 0.6,
},

explorationJournalDetailMemo: {
  fontSize: 13,
  fontWeight: '700',
  lineHeight: 21,
},

explorationJournalDetailMemoDate: {
  marginTop: 12,
  fontSize: 9,
  fontWeight: '700',
},

explorationJournalDetailStatusTitle: {
  marginTop: 18,
},

explorationJournalDetailStatusCard: {
  marginTop: 9,
  paddingHorizontal: 12,
  paddingVertical: 11,
  borderWidth: 0.7,
},

explorationJournalDetailStatusLabel: {
  fontSize: 12,
  fontWeight: '900',
},

explorationJournalDetailStatusLine: {
  marginTop: 6,
  fontSize: 10,
  fontWeight: '700',
  lineHeight: 16,
},

explorationJournalDetailGpsBox: {
  marginTop: 18,
},

explorationJournalDetailGpsTitle: {
  fontSize: 12,
  fontWeight: '900',
},

explorationJournalDetailGpsText: {
  marginTop: 5,
  fontSize: 10,
  fontWeight: '700',
},

explorationJournalDetailButtonRow: {
  paddingTop: 12,
  flexDirection: 'row',
  gap: 8,
},

explorationJournalDetailButton: {
  flex: 1,
  height: 38,
  paddingHorizontal: 8,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.7,
},

explorationJournalDetailButtonText: {
  fontSize: 11,
  fontWeight: '900',
},

explorationJournalModalOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
},

explorationJournalModalBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(20, 14, 10, 0.52)',
},

explorationJournalModalBox: {
  width: '100%',
  maxHeight: '88%',
  paddingHorizontal: 18,
  paddingTop: 18,
  paddingBottom: 28,
  borderWidth: 0.5,
},

explorationJournalModalScroll: {
  flexShrink: 1,
},

explorationJournalModalScrollContent: {
  paddingBottom: 2,
},

explorationJournalModalHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

explorationJournalModalTitleBox: {
  flex: 1,
  minWidth: 0,
},

explorationJournalModalTitle: {
  fontSize: 19,
  fontWeight: '900',
},

explorationJournalModalSubtitle: {
  marginTop: 5,
  fontSize: 11,
  fontWeight: '700',
  lineHeight: 17,
},

explorationJournalModalClose: {
  width: 34,
  height: 34,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationJournalModalCloseText: {
  fontSize: 25,
  fontWeight: '800',
  lineHeight: 28,
},

explorationJournalFieldLabel: {
  marginTop: 18,
  fontSize: 13,
  fontWeight: '900',
},

explorationJournalMoodWrap: {
  marginTop: 9,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 7,
},

explorationJournalMoodButton: {
  width: '31.5%',
  minHeight: 58,
  paddingHorizontal: 6,
  paddingVertical: 8,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.7,
},

explorationJournalMoodEmoji: {
  fontSize: 21,
},

explorationJournalMoodLabel: {
  marginTop: 4,
  fontSize: 9,
  fontWeight: '800',
},

explorationJournalPhotoLabelRow: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
},

explorationJournalPhotoCount: {
  marginBottom: 1,
  fontSize: 10,
  fontWeight: '700',
},

explorationJournalPhotoRow: {
  marginTop: 9,
  paddingRight: 2,
  gap: 8,
},

explorationJournalPhotoItem: {
  width: 82,
  height: 82,
},

explorationJournalPhotoImage: {
  width: 82,
  height: 82,
  borderWidth: 0.5,
  borderColor: 'rgba(120, 90, 55, 0.22)',
},

explorationJournalPhotoRemoveButton: {
  position: 'absolute',
  top: -5,
  right: -5,
  width: 23,
  height: 23,
  borderRadius: 12,
  backgroundColor: 'rgba(32, 24, 18, 0.82)',
  alignItems: 'center',
  justifyContent: 'center',
},

explorationJournalPhotoRemoveText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '900',
  lineHeight: 18,
},

explorationJournalPhotoAddButton: {
  width: 82,
  height: 82,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationJournalPhotoAddIcon: {
  fontSize: 25,
  fontWeight: '500',
  lineHeight: 28,
},

explorationJournalPhotoAddText: {
  marginTop: 2,
  fontSize: 9,
  fontWeight: '800',
},

explorationJournalPhotoStatus: {
  marginTop: 7,
  fontSize: 9,
  fontWeight: '700',
  lineHeight: 14,
},

explorationJournalMemoLabelRow: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
},

explorationJournalMemoCount: {
  marginBottom: 1,
  fontSize: 10,
  fontWeight: '700',
},

explorationJournalMemoInput: {
  minHeight: 142,
  maxHeight: 220,
  marginTop: 9,
  paddingHorizontal: 12,
  paddingVertical: 11,
  borderWidth: 0.7,
  fontSize: 13,
  fontWeight: '700',
  lineHeight: 20,
},

explorationJournalModalButtonRow: {
  marginTop: 14,
  flexDirection: 'row',
  gap: 8,
},

explorationJournalModalButton: {
  flex: 1,
  height: 38,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.7,
},

explorationJournalModalButtonText: {
  fontSize: 12,
  fontWeight: '900',
},

explorationJournalShareOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
},

explorationJournalShareBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(20, 14, 10, 0.58)',
},

explorationJournalShareModalBox: {
  width: '100%',
  maxHeight: '92%',
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 24,
  borderWidth: 0.5,
},

explorationJournalShareHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

explorationJournalShareHeaderTextBox: {
  flex: 1,
  minWidth: 0,
},

explorationJournalShareTitle: {
  fontSize: 18,
  fontWeight: '900',
},

explorationJournalShareSubtitle: {
  marginTop: 4,
  fontSize: 10,
  fontWeight: '700',
  lineHeight: 15,
},

explorationJournalShareClose: {
  width: 32,
  height: 32,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationJournalShareCloseText: {
  fontSize: 24,
  fontWeight: '900',
  lineHeight: 26,
},

explorationJournalShareScroll: {
  marginTop: 12,
},

explorationJournalShareScrollContent: {
  paddingBottom: 2,
},

explorationJournalShareCard: {
  width: '100%',
  paddingHorizontal: 18,
  paddingTop: 18,
  paddingBottom: 14,
  borderWidth: 1,
  borderRadius: 18,
},

explorationJournalShareCardTop: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

explorationJournalShareBrand: {
  fontSize: 8,
  fontWeight: '900',
  letterSpacing: 1.1,
},

explorationJournalSharePlaceName: {
  marginTop: 5,
  fontSize: 24,
  fontWeight: '900',
},

explorationJournalSharePlaceMeta: {
  marginTop: 3,
  fontSize: 10,
  fontWeight: '800',
},

explorationJournalSharePlaceIcon: {
  fontSize: 34,
},

explorationJournalShareVisitDate: {
  marginTop: 12,
  fontSize: 11,
  fontWeight: '800',
},

explorationJournalShareHeroImage: {
  width: '100%',
  height: 190,
  marginTop: 13,
  borderWidth: 0.5,
  borderColor: 'rgba(120, 90, 55, 0.20)',
},

explorationJournalSharePhotoGrid: {
  marginTop: 7,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 7,
},

explorationJournalShareGridImage: {
  flexGrow: 1,
  flexBasis: '47%',
  height: 92,
  borderWidth: 0.5,
  borderColor: 'rgba(120, 90, 55, 0.20)',
},

explorationJournalShareNoPhoto: {
  height: 165,
  marginTop: 13,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationJournalShareNoPhotoIcon: {
  fontSize: 40,
},

explorationJournalShareNoPhotoText: {
  marginTop: 7,
  fontSize: 12,
  fontWeight: '800',
},

explorationJournalShareMoodPill: {
  alignSelf: 'flex-start',
  minHeight: 30,
  marginTop: 12,
  paddingHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  borderWidth: 0.5,
  borderRadius: 999,
},

explorationJournalShareMoodEmoji: {
  fontSize: 15,
},

explorationJournalShareMoodText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationJournalShareMemo: {
  marginTop: 12,
  fontSize: 13,
  fontWeight: '700',
  lineHeight: 20,
},

explorationJournalShareFooter: {
  marginTop: 16,
  paddingTop: 11,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTopWidth: 0.5,
},

explorationJournalShareFooterText: {
  fontSize: 8,
  fontWeight: '800',
},

explorationJournalShareFooterIcon: {
  fontSize: 14,
},

explorationJournalShareGuide: {
  marginTop: 10,
  fontSize: 9,
  fontWeight: '700',
  lineHeight: 14,
},

explorationJournalShareButtonRow: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 7,
},

explorationJournalShareActionButton: {
  flex: 1,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.7,
},

explorationJournalShareActionText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationEmptyCard: {
  minHeight: 160,
  paddingHorizontal: 24,
  paddingVertical: 24,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationEmptyIcon: {
  fontSize: 34,
},

explorationEmptyTitle: {
  marginTop: 10,
  fontSize: 15,
  fontWeight: '900',
  textAlign: 'center',
},

explorationEmptyText: {
  paddingVertical: 18,
  paddingHorizontal: 12,
  fontSize: 12,
  fontWeight: '700',
  lineHeight: 18,
  textAlign: 'center',
},

collectionSection: {
  marginTop: 18,
  paddingHorizontal: 14,
  paddingBottom: 44,
},

collectionSummaryCard: {
  paddingHorizontal: 18,
  paddingVertical: 18,
  borderWidth: 0.5,
},

collectionSummaryTopRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

collectionSummaryTitleBox: {
  flex: 1,
},

collectionSummaryTitle: {
  fontSize: 18,
  fontWeight: '900',
},

collectionSummarySubtitle: {
  marginTop: 5,
  fontSize: 11,
  fontWeight: '700',
  lineHeight: 17,
},

collectionSummaryIcon: {
  fontSize: 30,
},

collectionSummaryStats: {
  marginTop: 18,
  flexDirection: 'row',
  alignItems: 'center',
},

collectionSummaryStat: {
  flex: 1,
  alignItems: 'center',
},

collectionSummaryStatValue: {
  fontSize: 20,
  fontWeight: '900',
},

collectionSummaryStatLabel: {
  marginTop: 3,
  fontSize: 10,
  fontWeight: '800',
},

collectionSummaryDivider: {
  width: 0.5,
  height: 28,
},

collectionFilterRow: {
  marginTop: 14,
  flexDirection: 'row',
  gap: 6,
},

collectionFilterButton: {
  flex: 1,
  paddingVertical: 7,
  alignItems: 'center',
  justifyContent: 'center',
},

collectionFilterText: {
  fontSize: 11,
  fontWeight: '900',
},

collectionGroup: {
  marginTop: 22,
},

collectionGroupHeader: {
  marginBottom: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

collectionGroupTitle: {
  fontSize: 15,
  fontWeight: '900',
},

collectionGroupCount: {
  fontSize: 11,
  fontWeight: '800',
},

collectionGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},

collectionItemCard: {
  width: '48.5%',
  minHeight: 190,
  paddingHorizontal: 12,
  paddingVertical: 13,
  borderWidth: 0.5,
  alignItems: 'center',
},

collectionItemIconBox: {
  width: 66,
  height: 66,
  alignItems: 'center',
  justifyContent: 'center',
},

collectionItemIcon: {
  fontSize: 35,
},

collectionStampIconBox: {
  width: 66,
  height: 66,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

collectionStampIcon: {
  fontSize: 31,
},

collectionStampCheck: {
  position: 'absolute',
  right: 4,
  bottom: 2,
  fontSize: 13,
  fontWeight: '900',
},

collectionBadgeIconBox: {
  width: 66,
  height: 66,
  borderWidth: 0.5,
  alignItems: 'center',
  justifyContent: 'center',
},

collectionBadgeIcon: {
  fontSize: 34,
},

collectionItemTitle: {
  marginTop: 10,
  minHeight: 36,
  fontSize: 13,
  fontWeight: '900',
  lineHeight: 18,
  textAlign: 'center',
},

collectionItemSubtitle: {
  marginTop: 4,
  minHeight: 34,
  fontSize: 10,
  fontWeight: '700',
  lineHeight: 15,
  textAlign: 'center',
},

collectionItemTag: {
  marginTop: 'auto',
  paddingHorizontal: 7,
  paddingVertical: 4,
  borderWidth: 0.5,
},

collectionItemTagText: {
  fontSize: 9,
  fontWeight: '900',
},

collectionBadgeTagRow: {
  marginTop: 'auto',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: 5,
},

collectionMainTag: {
  paddingHorizontal: 7,
  paddingVertical: 4,
  borderWidth: 1,
},

collectionMainTagText: {
  fontSize: 9,
  fontWeight: '900',
},

collectionGroupEmpty: {
  paddingVertical: 20,
  fontSize: 11,
  fontWeight: '700',
  textAlign: 'center',
},

collectionEmptyCard: {
  marginTop: 18,
  minHeight: 170,
  paddingHorizontal: 24,
  paddingVertical: 24,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

collectionEmptyIcon: {
  fontSize: 36,
},

collectionEmptyTitle: {
  marginTop: 10,
  fontSize: 15,
  fontWeight: '900',
  textAlign: 'center',
},

collectionEmptyText: {
  paddingVertical: 18,
  paddingHorizontal: 12,
  fontSize: 12,
  fontWeight: '700',
  lineHeight: 18,
  textAlign: 'center',
},

routeSnapshotCaptureBox: {
  position: 'absolute',
  left: -10000,
  top: 0,
  width: 900,
  height: 520,
  overflow: 'hidden',
},

routeSnapshotMap: {
  width: 900,
  height: 520,
},

explorationInsightCard: {
  marginTop: 16,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationInsightHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
},

explorationInsightTitle: {
  fontSize: 14,
  fontWeight: '900',
},

explorationInsightSubtitle: {
  marginTop: 3,
  fontSize: 10,
  fontWeight: '700',
},

explorationInsightPercent: {
  fontSize: 21,
  fontWeight: '900',
},

explorationInsightProgressTrack: {
  marginTop: 12,
  width: '100%',
  height: 7,
  overflow: 'hidden',
  borderRadius: 999,
},

explorationInsightProgressFill: {
  height: '100%',
  borderRadius: 999,
},

explorationInsightProgressText: {
  marginTop: 6,
  fontSize: 10,
  fontWeight: '800',
},

explorationInsightGrid: {
  marginTop: 12,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

explorationInsightStat: {
  width: '48.7%',
  minHeight: 64,
  paddingHorizontal: 10,
  paddingVertical: 9,
  borderWidth: 0.5,
},

explorationInsightStatIcon: {
  fontSize: 14,
},

explorationInsightStatValue: {
  marginTop: 3,
  fontSize: 14,
  fontWeight: '900',
},

explorationInsightStatLabel: {
  marginTop: 1,
  fontSize: 9,
  fontWeight: '800',
},

explorationInsightNotice: {
  marginTop: 10,
  minHeight: 34,
  paddingHorizontal: 10,
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationInsightNoticeText: {
  fontSize: 10,
  fontWeight: '900',
},


explorationCalendarCard: {
  marginTop: 16,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationCalendarHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
},

explorationCalendarTitleBox: {
  flex: 1,
},

explorationCalendarTitle: {
  fontSize: 14,
  fontWeight: '900',
},

explorationCalendarSubtitle: {
  marginTop: 3,
  fontSize: 9,
  fontWeight: '700',
  lineHeight: 14,
},

explorationCalendarToggleButton: {
  minWidth: 54,
  height: 30,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationCalendarToggleText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationCalendarMonthRow: {
  marginTop: 13,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
},

explorationCalendarMonthButton: {
  width: 34,
  height: 32,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationCalendarMonthButtonText: {
  fontSize: 22,
  fontWeight: '900',
  lineHeight: 23,
},

explorationCalendarMonthLabel: {
  minWidth: 112,
  fontSize: 13,
  fontWeight: '900',
  textAlign: 'center',
},

explorationCalendarStatsRow: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 6,
},

explorationCalendarStat: {
  flex: 1,
  minHeight: 52,
  paddingHorizontal: 6,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationCalendarStatValue: {
  fontSize: 12,
  fontWeight: '900',
},

explorationCalendarStatLabel: {
  marginTop: 2,
  fontSize: 8,
  fontWeight: '800',
},

explorationCalendarMoodRow: {
  marginTop: 9,
  minHeight: 32,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationCalendarMoodText: {
  fontSize: 9,
  fontWeight: '900',
},

explorationCalendarWeekdayRow: {
  marginTop: 13,
  flexDirection: 'row',
},

explorationCalendarWeekday: {
  width: '14.2857%',
  fontSize: 9,
  fontWeight: '900',
  textAlign: 'center',
},

explorationCalendarGrid: {
  marginTop: 5,
  flexDirection: 'row',
  flexWrap: 'wrap',
},

explorationCalendarDaySlot: {
  width: '14.2857%',
  padding: 2,
},

explorationCalendarDay: {
  position: 'relative',
  width: '100%',
  minHeight: 48,
  paddingTop: 6,
  paddingBottom: 4,
  alignItems: 'center',
  justifyContent: 'flex-start',
  borderWidth: 0.5,
},

explorationCalendarDayText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationCalendarDayMetaRow: {
  marginTop: 6,
  minHeight: 11,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
},

explorationCalendarDayDot: {
  width: 5,
  height: 5,
  borderRadius: 999,
},

explorationCalendarDayPhoto: {
  fontSize: 7,
},

explorationCalendarDayCountBadge: {
  position: 'absolute',
  right: 3,
  top: 3,
  minWidth: 13,
  height: 13,
  paddingHorizontal: 2,
  borderRadius: 999,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationCalendarDayCountText: {
  fontSize: 7,
  fontWeight: '900',
},

explorationCalendarSelectedNotice: {
  marginTop: 10,
  minHeight: 52,
  paddingHorizontal: 11,
  paddingVertical: 9,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  borderWidth: 0.5,
},

explorationCalendarSelectedTextBox: {
  flex: 1,
},

explorationCalendarSelectedTitle: {
  fontSize: 11,
  fontWeight: '900',
},

explorationCalendarSelectedSubtitle: {
  marginTop: 2,
  fontSize: 9,
  fontWeight: '700',
},

explorationCalendarClearButton: {
  minWidth: 48,
  height: 30,
  paddingHorizontal: 9,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationCalendarClearText: {
  fontSize: 9,
  fontWeight: '900',
},

explorationCalendarActionRow: {
  marginTop: 10,
  flexDirection: 'row',
  gap: 8,
},

explorationCalendarActionButton: {
  flex: 1,
  height: 34,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationCalendarActionText: {
  fontSize: 9,
  fontWeight: '900',
},

explorationRecommendationCard: {
  marginTop: 18,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationRecommendationHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
},

explorationRecommendationTitleBox: {
  flex: 1,
},

explorationRecommendationTitle: {
  fontSize: 14,
  fontWeight: '900',
},

explorationRecommendationSubtitle: {
  marginTop: 3,
  fontSize: 9,
  fontWeight: '700',
  lineHeight: 14,
},

explorationRecommendationThemeIcon: {
  fontSize: 25,
},

explorationRecommendationProgressRow: {
  marginTop: 12,
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 10,
},

explorationRecommendationProgressTextBox: {
  flex: 1,
},

explorationRecommendationThemeName: {
  fontSize: 12,
  fontWeight: '900',
},

explorationRecommendationProgressText: {
  marginTop: 3,
  fontSize: 9,
  fontWeight: '800',
},

explorationRecommendationPercent: {
  fontSize: 17,
  fontWeight: '900',
},

explorationRecommendationProgressTrack: {
  marginTop: 9,
  width: '100%',
  height: 7,
  overflow: 'hidden',
  borderRadius: 999,
},

explorationRecommendationProgressFill: {
  height: '100%',
  borderRadius: 999,
},

explorationRecommendationMissingLabel: {
  marginTop: 13,
  marginBottom: 7,
  fontSize: 9,
  fontWeight: '900',
},

explorationRecommendationPlaceWrap: {
  gap: 7,
},

explorationRecommendationPlaceButton: {
  minHeight: 52,
  paddingHorizontal: 10,
  paddingVertical: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
  borderWidth: 0.5,
},

explorationRecommendationPlaceIcon: {
  width: 30,
  fontSize: 20,
  textAlign: 'center',
},

explorationRecommendationPlaceTextBox: {
  flex: 1,
},

explorationRecommendationPlaceName: {
  fontSize: 11,
  fontWeight: '900',
},

explorationRecommendationPlaceMeta: {
  marginTop: 2,
  fontSize: 8,
  fontWeight: '700',
},

explorationRecommendationPlaceArrow: {
  fontSize: 21,
  fontWeight: '900',
},

explorationRecommendationThemeButton: {
  marginTop: 10,
  height: 35,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationRecommendationThemeButtonText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationProgressSection: {
  marginTop: 18,
},

explorationProgressHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
},

explorationProgressHint: {
  fontSize: 9,
  fontWeight: '700',
},

explorationProgressRow: {
  marginTop: 10,
  gap: 9,
  paddingRight: 8,
},

explorationProgressCard: {
  width: 142,
  minHeight: 108,
  paddingHorizontal: 11,
  paddingVertical: 10,
  borderWidth: 0.5,
},

explorationProgressCardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

explorationProgressIcon: {
  fontSize: 18,
},

explorationProgressStatus: {
  fontSize: 9,
  fontWeight: '900',
},

explorationProgressName: {
  marginTop: 7,
  fontSize: 12,
  fontWeight: '900',
},

explorationProgressCount: {
  marginTop: 3,
  fontSize: 9,
  fontWeight: '800',
},

explorationProgressTrack: {
  marginTop: 10,
  height: 6,
  overflow: 'hidden',
  borderRadius: 999,
},

explorationProgressFill: {
  height: '100%',
  borderRadius: 999,
},

explorationFilterCard: {
  marginTop: 16,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationFilterHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
},

explorationFilterHeaderActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

explorationCollapsedFilterSummary: {
  marginTop: 12,
  minHeight: 38,
  paddingHorizontal: 10,
  paddingVertical: 8,
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationCollapsedFilterSummaryText: {
  fontSize: 10,
  fontWeight: '800',
  lineHeight: 15,
},

explorationFilterTitle: {
  fontSize: 14,
  fontWeight: '900',
},

explorationFilterResultText: {
  marginTop: 3,
  fontSize: 10,
  fontWeight: '700',
},

explorationFilterResetButton: {
  minWidth: 54,
  height: 30,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationFilterResetText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationSearchBox: {
  marginTop: 12,
  height: 42,
  paddingHorizontal: 11,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 0.5,
},

explorationSearchIcon: {
  marginRight: 7,
  fontSize: 14,
},

explorationSearchInput: {
  flex: 1,
  height: 40,
  paddingVertical: 0,
  fontSize: 11,
  fontWeight: '700',
},

explorationSearchClear: {
  width: 28,
  height: 28,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationSearchClearText: {
  fontSize: 20,
  fontWeight: '900',
},

explorationFilterLabel: {
  marginTop: 12,
  marginBottom: 6,
  fontSize: 10,
  fontWeight: '900',
},

explorationFilterChipRow: {
  gap: 7,
  paddingRight: 8,
},

explorationFilterChip: {
  minHeight: 31,
  paddingHorizontal: 11,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  borderWidth: 0.5,
},

explorationFilterChipIcon: {
  fontSize: 12,
},

explorationFilterChipText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationViewModeRow: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 8,
},

explorationViewModeButton: {
  flex: 1,
  height: 34,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  borderWidth: 0.5,
},

explorationViewModeIcon: {
  fontSize: 12,
},

explorationViewModeText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationMapSection: {
  marginTop: 2,
},

explorationMapCard: {
  overflow: 'hidden',
  borderWidth: 0.5,
},

explorationVisitMap: {
  width: '100%',
  height: 310,
},

explorationMapControlRow: {
  paddingHorizontal: 10,
  paddingTop: 9,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},

explorationMapControlButton: {
  minWidth: 76,
  height: 31,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationMapControlButtonText: {
  fontSize: 9,
  fontWeight: '900',
},

explorationMapPager: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
},

explorationMapPagerButton: {
  width: 32,
  height: 31,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationMapPagerButtonText: {
  fontSize: 20,
  fontWeight: '900',
  lineHeight: 22,
},

explorationMapPagerText: {
  minWidth: 34,
  fontSize: 10,
  fontWeight: '900',
  textAlign: 'center',
},

explorationMapLegendRow: {
  paddingHorizontal: 11,
  paddingTop: 9,
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
},

explorationMapLegendItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
},

explorationMapLegendDot: {
  width: 9,
  height: 9,
  borderRadius: 999,
},

explorationMapLegendText: {
  fontSize: 9,
  fontWeight: '800',
},

explorationMapInfoRow: {
  minHeight: 40,
  paddingHorizontal: 12,
  paddingVertical: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},

explorationMapInfoText: {
  flexShrink: 1,
  fontSize: 10,
  fontWeight: '800',
},

explorationMapSelectedCard: {
  marginTop: 12,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationMapSelectedHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

explorationMapSelectedIcon: {
  width: 38,
  fontSize: 26,
  textAlign: 'center',
},

explorationMapSelectedTitleBox: {
  flex: 1,
},

explorationMapSelectedTitle: {
  fontSize: 15,
  fontWeight: '900',
},

explorationMapSelectedSubtitle: {
  marginTop: 2,
  fontSize: 10,
  fontWeight: '700',
},

explorationMapSelectedVisitDate: {
  marginTop: 12,
  fontSize: 11,
  fontWeight: '900',
},

explorationMapSelectedMetaRow: {
  marginTop: 7,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},

explorationMapSelectedMeta: {
  fontSize: 10,
  fontWeight: '800',
},

explorationMapSelectedMemo: {
  marginTop: 9,
  fontSize: 11,
  fontWeight: '700',
  lineHeight: 17,
},

explorationMapSelectedStatus: {
  marginTop: 10,
  minHeight: 34,
  paddingHorizontal: 10,
  alignItems: 'flex-start',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationMapSelectedStatusText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationMapSelectedButtonRow: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 8,
},

explorationMapSelectedButton: {
  flex: 1,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationMapSelectedButtonText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationVisitSectionTitleRow: {
  marginTop: 22,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

explorationVisitSectionCount: {
  fontSize: 11,
  fontWeight: '900',
},

explorationEmptyResetButton: {
  marginTop: 12,
  minWidth: 110,
  height: 36,
  paddingHorizontal: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationEmptyResetText: {
  fontSize: 11,
  fontWeight: '900',
},

explorationActionCard: {
  marginTop: 14,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationReportCard: {
  marginTop: 14,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationInsightsCard: {
  marginTop: 14,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationMilestoneCard: {
  marginTop: 14,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationFeatureHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
},

explorationFeatureTitleBox: {
  flex: 1,
},

explorationFeatureTitle: {
  fontSize: 16,
  fontWeight: '900',
},

explorationFeatureSubtitle: {
  marginTop: 4,
  fontSize: 10,
  fontWeight: '700',
  lineHeight: 15,
},

explorationFeatureToggle: {
  minWidth: 54,
  height: 32,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.5,
},

explorationFeatureToggleText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationHealthGrid: {
  marginTop: 14,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

explorationHealthItem: {
  width: '48.5%',
  minHeight: 62,
  paddingHorizontal: 10,
  paddingVertical: 9,
  borderWidth: 0.5,
  justifyContent: 'center',
},

explorationHealthValue: {
  fontSize: 17,
  fontWeight: '900',
},

explorationHealthLabel: {
  marginTop: 3,
  fontSize: 9,
  fontWeight: '800',
},

explorationTaskList: {
  marginTop: 12,
  gap: 8,
},

explorationTaskButton: {
  minHeight: 58,
  paddingHorizontal: 11,
  paddingVertical: 9,
  borderWidth: 0.5,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
},

explorationTaskIcon: {
  width: 30,
  fontSize: 22,
  textAlign: 'center',
},

explorationTaskTextBox: {
  flex: 1,
},

explorationTaskTitle: {
  fontSize: 12,
  fontWeight: '900',
},

explorationTaskDescription: {
  marginTop: 2,
  fontSize: 9,
  fontWeight: '700',
},

explorationTaskCountBadge: {
  minWidth: 30,
  height: 26,
  paddingHorizontal: 8,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationTaskCountText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationTaskArrow: {
  fontSize: 22,
  fontWeight: '800',
},

explorationTaskCompleteBox: {
  marginTop: 12,
  minHeight: 54,
  paddingHorizontal: 12,
  borderWidth: 0.5,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 9,
},

explorationTaskCompleteIcon: {
  fontSize: 20,
},

explorationTaskCompleteText: {
  fontSize: 11,
  fontWeight: '900',
},

explorationReportCapture: {
  marginTop: 14,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationReportCaptureHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

explorationReportBrand: {
  fontSize: 8,
  fontWeight: '900',
  letterSpacing: 1.1,
},

explorationReportMonth: {
  marginTop: 3,
  fontSize: 19,
  fontWeight: '900',
},

explorationReportCompass: {
  fontSize: 34,
},

explorationReportStatsGrid: {
  marginTop: 14,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

explorationReportStat: {
  width: '48.5%',
  minHeight: 86,
  paddingHorizontal: 10,
  paddingVertical: 10,
  borderWidth: 0.5,
},

explorationReportStatValue: {
  fontSize: 18,
  fontWeight: '900',
},

explorationReportStatLabel: {
  marginTop: 3,
  fontSize: 9,
  fontWeight: '800',
},

explorationReportDifference: {
  marginTop: 7,
  fontSize: 8,
  fontWeight: '800',
},

explorationReportHighlight: {
  marginTop: 10,
  paddingHorizontal: 11,
  paddingVertical: 10,
  borderWidth: 0.5,
  gap: 4,
},

explorationReportHighlightText: {
  fontSize: 10,
  fontWeight: '800',
  lineHeight: 15,
},

explorationReportFooter: {
  marginTop: 12,
  fontSize: 9,
  fontWeight: '900',
  textAlign: 'right',
},

explorationReportShareButton: {
  marginTop: 10,
  height: 38,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationReportShareButtonText: {
  fontSize: 11,
  fontWeight: '900',
},

explorationInsightsBody: {
  marginTop: 14,
},

explorationInsightSectionLabel: {
  fontSize: 11,
  fontWeight: '900',
},

explorationInsightSecondLabel: {
  marginTop: 16,
},

explorationInsightRow: {
  marginTop: 9,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

explorationInsightLabel: {
  width: 58,
  fontSize: 9,
  fontWeight: '800',
},

explorationInsightTrack: {
  flex: 1,
  height: 8,
  overflow: 'hidden',
  borderRadius: 999,
},

explorationInsightFill: {
  height: '100%',
  borderRadius: 999,
},

explorationInsightCount: {
  width: 22,
  fontSize: 10,
  fontWeight: '900',
  textAlign: 'right',
},

explorationInsightEmpty: {
  marginTop: 9,
  fontSize: 10,
  fontWeight: '700',
},

explorationMoodInsightWrap: {
  marginTop: 9,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 7,
},

explorationMoodInsightChip: {
  minHeight: 34,
  paddingHorizontal: 10,
  borderWidth: 0.5,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
},

explorationMoodInsightEmoji: {
  fontSize: 15,
},

explorationMoodInsightText: {
  fontSize: 9,
  fontWeight: '800',
},

explorationMilestoneList: {
  marginTop: 13,
  gap: 8,
},

explorationMilestoneItem: {
  minHeight: 78,
  paddingHorizontal: 11,
  paddingVertical: 10,
  borderWidth: 0.5,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

explorationMilestoneIcon: {
  width: 32,
  fontSize: 23,
  textAlign: 'center',
},

explorationMilestoneTextBox: {
  flex: 1,
},

explorationMilestoneTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

explorationMilestoneTitle: {
  fontSize: 11,
  fontWeight: '900',
},

explorationMilestoneValue: {
  fontSize: 11,
  fontWeight: '900',
},

explorationMilestoneNext: {
  marginTop: 3,
  fontSize: 9,
  fontWeight: '700',
},

explorationMilestoneTrack: {
  marginTop: 8,
  height: 7,
  borderRadius: 999,
  overflow: 'hidden',
},

explorationMilestoneFill: {
  height: '100%',
  borderRadius: 999,
},

explorationNearbyCard: {
  marginTop: 14,
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderWidth: 0.5,
},

explorationNearbyHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
},

explorationNearbyTitle: {
  fontSize: 16,
  fontWeight: '900',
},

explorationNearbySubtitle: {
  marginTop: 4,
  fontSize: 10,
  fontWeight: '700',
},

explorationNearbyIcon: {
  fontSize: 28,
},

explorationNearbyList: {
  marginTop: 12,
  gap: 8,
},

explorationNearbyButton: {
  minHeight: 58,
  paddingHorizontal: 10,
  paddingVertical: 9,
  borderWidth: 0.5,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},

explorationNearbyPlaceIcon: {
  width: 30,
  fontSize: 21,
  textAlign: 'center',
},

explorationNearbyTextBox: {
  flex: 1,
},

explorationNearbyName: {
  fontSize: 11,
  fontWeight: '900',
},

explorationNearbyMeta: {
  marginTop: 2,
  fontSize: 9,
  fontWeight: '700',
},

explorationNearbyDistance: {
  fontSize: 9,
  fontWeight: '900',
},

explorationNearbyArrow: {
  fontSize: 20,
  fontWeight: '800',
},

explorationMapAdvancedPanel: {
  paddingHorizontal: 12,
  paddingTop: 12,
  paddingBottom: 10,
},

explorationMapAdvancedHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
},

explorationMapAdvancedTitle: {
  fontSize: 11,
  fontWeight: '900',
},

explorationMapAdvancedSubtitle: {
  marginTop: 3,
  fontSize: 8,
  fontWeight: '700',
},

explorationMapRouteToggle: {
  minWidth: 78,
  height: 32,
  paddingHorizontal: 9,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationMapRouteToggleText: {
  fontSize: 9,
  fontWeight: '900',
},

explorationMapSourceFilterRow: {
  marginTop: 10,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 7,
},

explorationMapSourceFilterButton: {
  minHeight: 31,
  paddingHorizontal: 10,
  borderWidth: 0.5,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationMapSourceFilterText: {
  fontSize: 9,
  fontWeight: '900',
},

explorationMapRouteDistance: {
  marginTop: 5,
  fontSize: 9,
  fontWeight: '800',
  textAlign: 'right',
},

explorationDistrictRoadmapCard: {
  marginHorizontal: 16,
  marginTop: 14,
  padding: 14,
  borderWidth: 0.7,
},

explorationDistrictRoadmapRow: {
  paddingTop: 12,
  paddingRight: 8,
  gap: 9,
},

explorationDistrictRoadmapItem: {
  width: 134,
  minHeight: 126,
  padding: 12,
  borderWidth: 0.7,
},

explorationDistrictRoadmapTop: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

explorationDistrictRoadmapIcon: {
  fontSize: 24,
},

explorationDistrictRoadmapOrder: {
  fontSize: 8,
  fontWeight: '800',
},

explorationDistrictRoadmapName: {
  marginTop: 9,
  fontSize: 14,
  fontWeight: '900',
},

explorationDistrictRoadmapSubtitle: {
  marginTop: 3,
  fontSize: 8,
  fontWeight: '700',
},

explorationDistrictRoadmapCount: {
  marginTop: 11,
  fontSize: 10,
  fontWeight: '900',
},

explorationWeeklyCard: {
  marginHorizontal: 16,
  marginTop: 14,
  padding: 14,
  borderWidth: 0.7,
},

explorationWeeklyProgressHeader: {
  marginTop: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

explorationWeeklyProgressText: {
  fontSize: 13,
  fontWeight: '900',
},

explorationWeeklyDateText: {
  fontSize: 8,
  fontWeight: '800',
},

explorationWeeklyProgressTrack: {
  marginTop: 8,
  height: 7,
  overflow: 'hidden',
},

explorationWeeklyProgressFill: {
  height: '100%',
},

explorationWeeklyTaskList: {
  marginTop: 12,
  gap: 8,
},

explorationWeeklyTaskItem: {
  minHeight: 52,
  paddingHorizontal: 11,
  paddingVertical: 8,
  borderWidth: 0.6,
  flexDirection: 'row',
  alignItems: 'center',
},

explorationWeeklyTaskIcon: {
  width: 30,
  fontSize: 19,
},

explorationWeeklyTaskTextBox: {
  flex: 1,
},

explorationWeeklyTaskTitle: {
  fontSize: 11,
  fontWeight: '900',
},

explorationWeeklyTaskDescription: {
  marginTop: 2,
  fontSize: 8,
  fontWeight: '700',
},

explorationWeeklyTaskArrow: {
  marginLeft: 8,
  fontSize: 22,
  fontWeight: '700',
},

explorationPlannerCard: {
  marginHorizontal: 16,
  marginTop: 14,
  padding: 14,
  borderWidth: 0.7,
},

explorationPlannerActionRow: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 8,
},

explorationPlannerActionButton: {
  flex: 1,
  minHeight: 38,
  paddingHorizontal: 8,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationPlannerActionText: {
  fontSize: 9,
  fontWeight: '900',
  textAlign: 'center',
},

explorationPlannerSummary: {
  marginTop: 10,
  minHeight: 54,
  paddingHorizontal: 11,
  paddingVertical: 9,
  borderWidth: 0.6,
},

explorationPlannerSummaryText: {
  fontSize: 11,
  fontWeight: '900',
},

explorationPlannerSummarySubText: {
  marginTop: 3,
  fontSize: 8,
  fontWeight: '700',
},

explorationPlannerClearText: {
  marginTop: 5,
  fontSize: 8,
  fontWeight: '900',
  textAlign: 'right',
},

explorationPlannerRouteList: {
  marginTop: 10,
  gap: 7,
},

explorationPlannerRouteItem: {
  minHeight: 50,
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderWidth: 0.6,
  flexDirection: 'row',
  alignItems: 'center',
},

explorationPlannerRouteOrder: {
  width: 27,
  height: 27,
  borderWidth: 0.8,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationPlannerRouteOrderText: {
  fontSize: 10,
  fontWeight: '900',
},

explorationPlannerRouteTextBox: {
  flex: 1,
  marginLeft: 9,
},

explorationPlannerRouteName: {
  fontSize: 11,
  fontWeight: '900',
},

explorationPlannerRouteMeta: {
  marginTop: 2,
  fontSize: 8,
  fontWeight: '700',
},

explorationPlannerRemoveButton: {
  width: 30,
  height: 30,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationPlannerRemoveText: {
  fontSize: 20,
  fontWeight: '700',
},

explorationPlannerSectionLabel: {
  marginTop: 14,
  fontSize: 11,
  fontWeight: '900',
},

explorationPlannerCandidateRow: {
  paddingTop: 9,
  paddingRight: 8,
  gap: 9,
},

explorationPlannerCandidateCard: {
  width: 142,
  minHeight: 146,
  padding: 11,
  borderWidth: 0.7,
},

explorationPlannerCandidateTop: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

explorationPlannerCandidateIcon: {
  fontSize: 24,
},

explorationPlannerWishlistIcon: {
  fontSize: 22,
  color: '#b88a2a',
},

explorationPlannerCandidateName: {
  marginTop: 9,
  fontSize: 11,
  fontWeight: '900',
},

explorationPlannerCandidateMeta: {
  marginTop: 3,
  fontSize: 8,
  fontWeight: '700',
},

explorationPlannerCandidateButtons: {
  marginTop: 12,
  flexDirection: 'row',
  gap: 6,
},

explorationPlannerCandidateButton: {
  flex: 1,
  minHeight: 31,
  borderWidth: 0.6,
  alignItems: 'center',
  justifyContent: 'center',
},

explorationPlannerCandidateButtonText: {
  fontSize: 8,
  fontWeight: '900',
},

explorationPlannerCompleteBox: {
  marginTop: 10,
  padding: 16,
  borderWidth: 0.6,
  alignItems: 'center',
},

explorationPlannerCompleteIcon: {
  fontSize: 30,
},

explorationPlannerCompleteText: {
  marginTop: 7,
  fontSize: 10,
  fontWeight: '900',
  textAlign: 'center',
},

explorationHighlightsCard: {
  marginHorizontal: 16,
  marginTop: 14,
  padding: 14,
  borderWidth: 0.7,
},

explorationHighlightsRow: {
  paddingTop: 12,
  paddingRight: 8,
  gap: 9,
},

explorationHighlightItem: {
  width: 182,
  minHeight: 152,
  padding: 12,
  borderWidth: 0.6,
},

explorationHighlightTop: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

explorationHighlightIcon: {
  fontSize: 18,
},

explorationHighlightLabel: {
  fontSize: 8,
  fontWeight: '800',
},

explorationHighlightName: {
  marginTop: 10,
  fontSize: 13,
  fontWeight: '900',
},

explorationHighlightMeta: {
  marginTop: 4,
  fontSize: 8,
  fontWeight: '700',
},

explorationHighlightMemo: {
  marginTop: 9,
  minHeight: 42,
  fontSize: 9,
  fontWeight: '700',
  lineHeight: 14,
},

explorationHighlightOpen: {
  marginTop: 8,
  fontSize: 8,
  fontWeight: '900',
  textAlign: 'right',
},

});
