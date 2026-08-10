import { Ionicons } from '@expo/vector-icons';
import {
  getApp,
} from '@react-native-firebase/app';
import RootySprite from '../../components/characters/SelectedCharacterSprite';
import type { RootyAction } from '../../constants/rootyAssets';
import { ROOTY_WALK_MOTION } from '../../constants/rootyMotion';
import { ROOTY_NATURAL_BEHAVIOR } from '../../constants/rootyBehavior';
import { ROOTY_VILLAGE_BOUNDS } from '../../constants/rootyVillageBounds';
import { logRootyDebugEvent } from '../../utils/rootyDebug';
import {
  hasRootyDirectionalFrames,
} from '../../constants/rootyDirectionalAssets';
import {
  getRootyResumeDelayMs,
  loadRootyRuntimeSnapshot,
  resolveRootyResumeAction,
  saveRootyRuntimeSnapshot,
} from '../../store/rootyRuntime';
import type {
  RootyDirection,
} from '../../store/rootyRuntime';
import {
  ROOTY_DEFAULT_STATE,
  loadRootyState,
  saveRootyState,
  type RootyState,
} from '../../store/rootyState';
import {
  getRootyConditionSnapshot,
  type RootyConditionSnapshot,
} from '../../store/rootyCondition';
import {
  getRootyConditionRestProbabilities,
  getRootyConditionWalkStepRange,
} from '../../store/rootyConditionBehaviorPolicy';
import {
  getRootySpontaneousHappyChance,
  shouldStartRootySpontaneousHappy,
} from '../../store/rootyMoodExpressionPolicy';
import {
  getRootyLowMoodRestProbabilities,
} from '../../store/rootyLowMoodBehaviorPolicy';
import {
  getRootyBondedTapFollowUpChance,
  shouldQueueRootyBondedTapFollowUp,
} from '../../store/rootyAffectionInteractionPolicy';
import {
  getRootyBondedPassiveAttentionChance,
  ROOTY_PASSIVE_SOCIAL_POLICY,
  shouldStartRootyBondedPassiveAttention,
} from '../../store/rootyPassiveSocialPolicy';
import {
  getRootySpontaneousCooldownAfterTrigger,
  resolveRootySpontaneousCooldown,
} from '../../store/rootySpontaneousCooldownPolicy';
import {
  getRootyStateRestProbabilities,
  pickRootyRestBehavior,
} from '../../store/rootyBehaviorPolicy';
import {
  getRootyNextRestAntiRepeatState,
  getRootyRestAntiRepeatProbabilities,
  type RootyRestAntiRepeatState,
} from '../../store/rootyRestAntiRepeatPolicy';
import {
  ROOTY_STATE_SIMULATION,
} from '../../constants/rootyStateSimulation';
import {
  consumeRootyOfflineCheckpoint,
  saveRootyOfflineCheckpoint,
} from '../../store/rootyOfflineState';

import {
  getAuth,
} from '@react-native-firebase/auth';

import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from '@react-native-firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  ACTION_GOAL_MAX_LENGTH,
  ACTION_GOAL_MIN_LENGTH,
} from '../../store/rootConstants';

import Svg, {
  Polyline as SvgPolyline,
} from 'react-native-svg';

import MapView, {
  Polyline as MapPolyline,
  Marker,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { syncRootWidgetData } from '../../utils/rootWidgetSync';

import {
  getRootMainBadgeId,
  getRootOnboardingData,
  ROOT_BADGES,
  saveRootOnboardingData,
  setRootOnboardingData,
} from '../../store/rootMemory';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkBadgeReward } from '../../store/badgeReward';
import { useRootTheme } from '../../store/rootTheme';

import {
  EXPLORATION_REWARD_NAMES,
  EXPLORATION_THEME_BADGE_NAMES,
} from '../../store/explorationHomeNames';

import {
  buildingImages,
  EXPLORATION_HOME_ITEMS,
} from '../../components/home/homeExplorationAssets';

import {
  buildingImageSizes,
  buildingOffsets,
  buildingSizes,
} from '../../components/home/homeVillageLayout';

import {
  loadLocalExplorationData,
} from '../../store/explorationCloud';
import {
  applySelectedCharacterPersonalityToRestWeights,
} from '../../store/characterPersonalityPolicy';
import {
  recordCharacterFinalRestDecision,
} from '../../store/characterRuntimeDiagnostics';
import {
  getSelectedCharacterSnapshot,
} from '../../store/selectedCharacter';

const firebaseApp =
  getApp();

const firebaseAuth =
  getAuth(
    firebaseApp
  );

const firebaseDb =
  getFirestore(
    firebaseApp
  );



const EXERCISE_CALORIE_LOGS_KEY =
  'daily_exercise_calorie_logs_v1';

const EXPLORATION_MAIN_BADGE_KEY =
  'root_exploration_main_badge_v1';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});


const categories = [
  { id: 'exercise', icon: '🏃', label: '운동' },
  { id: 'study', icon: '📚', label: '공부' },
  { id: 'mental', icon: '🧘', label: '정신' },
  { id: 'daily', icon: '💼', label: '일' },
];

type DecorateStickerType =
  | 'date'
  | 'title'
  | 'time'
  | 'distance'
  | 'pace'
  | 'route'
  | 'calorie'
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

const rootMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#1f2933' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d6c3a3' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1f2933' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#344052' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f5e9cf' }],
  },
  {
    featureType: 'water',
    stylers: [{ color: '#172554' }],
  },
  {
    featureType: 'poi.park',
    stylers: [{ color: '#234d35' }],
  },
];

const weekDays = ['월', '화', '수', '목', '금', '토', '일'];

const shopItems = [
  {
    id: 'tree1',
    name: '분홍 나무',
    price: 30,
    type: 'building',
    theme: '조선',
    image: require('../../assets/village/buildings/tree1.png'),
  },

  {
    id: 'tree2',
    name: '초록 나무',
    price: 50,
    type: 'building',
    theme: '조선',
    image: require(
      '../../assets/village/buildings/tree2.png'
    ),
  },
  {
  id: 'tree3',
  name: '노란 나무',
  price: 40,
  type: 'building',
  theme: '조선',
  image: require('../../assets/village/buildings/tree3.png'),
},

{
    id: 'tree4',
    name: '흰 나무',
    price: 30,
    type: 'building',
    theme: '조선',
    image: require('../../assets/village/buildings/tree4.png'),
  },
  {
    id: 'tree5',
    name: '빨강 나무',
    price: 30,
    type: 'building',
    theme: '조선',
    image: require('../../assets/village/buildings/tree5.png'),
  },

  {
    id: 'tree6',
    name: '작은 분홍 나무',
    price: 30,
    type: 'building',
    theme: '조선',
    image: require('../../assets/village/buildings/tree6.png'),
  },

  {
    id: 'tree7',
    name: '분홍 나무',
    price: 30,
    type: 'building',
    theme: '일본',
    image: require('../../assets/village/buildings/tree7.png'),
  },

  {
  id: 'building1',
  name: '궁전',
  price: 300,
  type: 'building',
  theme: '조선',
  image: require('../../assets/village/buildings/building1.png'),
},

{
  id: 'building2',
  name: '정자',
  price: 300,
  type: 'building',
  theme: '조선',
  image: require('../../assets/village/buildings/building2.png'),
},

{
  id: 'building3',
  name: '공원',
  price: 300,
  type: 'building',
  theme: '조선',
  image: require('../../assets/village/buildings/building3.png'),
},
{
  id: 'building4',
  name: '일본 성',
  price: 300,
  type: 'building',
  theme: '일본',
  image: require('../../assets/village/buildings/building4.png'),
},

{
  id: 'building5',
  name: '일본집',
  price: 100,
  type: 'building',
  theme: '일본',
  image: require('../../assets/village/buildings/building5.png'),
},

{
  id: 'building6',
  name: '목욕탕',
  price: 100,
  type: 'building',
  theme: '일본',
  image: require('../../assets/village/buildings/building6.png'),
},

{
  id: 'building7',
  name: '찻집',
  price: 100,
  type: 'building',
  theme: '일본',
  image: require('../../assets/village/buildings/building7.png'),
},

{
  id: 'object1',
  name: '석등',
  price: 50,
  type: 'object',
  theme: '조선',
  image: require('../../assets/village/buildings/object1.png'),
},

{
  id: 'object2',
  name: '궁궐등',
  price: 50,
  type: 'object',
  theme: '조선',
  image: require('../../assets/village/buildings/object2.png'),
},

{
  id: 'object3',
  name: '목등',
  price: 50,
  type: 'object',
  theme: '조선',
  image: require('../../assets/village/buildings/object3.png'),
},
];

const shopThemes = [
  '전체',
  '일본',
  '조선',
  ];

const bagThemes = [
  '전체',
  '조선',
  '일본',
];

const grassTile = require('../../assets/village/tiles/grass_tile.png');

const GRID_SIZE = 12;

const TILE_WIDTH = 190;
const TILE_HEIGHT = 95;

const MIN_COL = 0;
const MAX_COL = GRID_SIZE - 1;

const MIN_ROW = 0;
const MAX_ROW = GRID_SIZE - 1;

const foxImages = {
  downRight: require('../../assets/village/characters/fox_down_right.png'),
  downLeft: require('../../assets/village/characters/fox_down_left.png'),
  upRight: require('../../assets/village/characters/fox_up_right.png'),
  upLeft: require('../../assets/village/characters/fox_up_left.png'),

  // 부산 동구 탐험 10곳
  'explore-busan-dong-busan-station': {
    id: 'explore-busan-dong-busan-station',
    name: '부산역 건물',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/building7.png'),
  },
  'explore-busan-dong-choryang-ibagugil': {
    id: 'explore-busan-dong-choryang-ibagugil',
    name: '초량 이바구길 장식',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/object2.png'),
  },
  'explore-busan-dong-168-stairs': {
    id: 'explore-busan-dong-168-stairs',
    name: '168계단 장식',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/object2.png'),
  },
  'explore-busan-dong-yuchihwan-mailbox': {
    id: 'explore-busan-dong-yuchihwan-mailbox',
    name: '유치환 우체통 전망 장식',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/object3.png'),
  },
  'explore-busan-dong-north-port-park': {
    id: 'explore-busan-dong-north-port-park',
    name: '북항 친수공원 장식',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/object1.png'),
  },
  'explore-busan-dong-international-passenger-terminal': {
    id: 'explore-busan-dong-international-passenger-terminal',
    name: '국제여객터미널 건물',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/building4.png'),
  },
  'explore-busan-dong-busanjinseong-history-museum': {
    id: 'explore-busan-dong-busanjinseong-history-museum',
    name: '부산진성 역사 건물',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/building2.png'),
  },
  'explore-busan-dong-jeonggongdan': {
    id: 'explore-busan-dong-jeonggongdan',
    name: '정공단 기념 장식',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/building5.png'),
  },
  'explore-busan-dong-ilshin-school': {
    id: 'explore-busan-dong-ilshin-school',
    name: '일신여학교 건물',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/building6.png'),
  },
  'explore-busan-dong-busanpo-opening-museum': {
    id: 'explore-busan-dong-busanpo-opening-museum',
    name: '부산포 개항문화관 건물',
    price: 0,
    type: 'building',
    theme: '조선',
    source: 'exploration',
    nonRefundable: true,
    image: require('../../assets/village/buildings/building4.png'),
  },

};


const DEFAULT_EXPLORATION_REWARD_IMAGE =
  require('../../assets/village/buildings/building3.png');

/*
 * 전체 탐험 보상 매핑 검수는 앱 시작 시 실행하지 않습니다.
 * 필요할 때 npm run verify:exploration-home-names로 확인합니다.
 */
function getTodayIndex() {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}










function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}.${m}.${d}`;
}

function formatDateKey(
  date: Date
) {
  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const d =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${y}-${m}-${d}`;
}

function getWeekStartDate(
  sourceDate = new Date()
) {
  const date =
    new Date(sourceDate);

  date.setHours(
    0,
    0,
    0,
    0
  );

  const day =
    date.getDay();

  const moveDays =
    day === 0
      ? -6
      : 1 - day;

  date.setDate(
    date.getDate() +
      moveDays
  );

  return date;
}

function getActionGoalWeekSummary(
  goal: any,
  actionLogs: any[]
) {
  const weekStart =
    getWeekStartDate();

  const weekEnd =
    addDays(
      weekStart,
      6
    );

  const weekStartKey =
    formatDateKey(
      weekStart
    );

  const weekEndKey =
    formatDateKey(
      weekEnd
    );

  const completedDateSet =
    new Set<string>();

  const completedDates =
    Array.isArray(
      goal?.completedDates
    )
      ? goal.completedDates
      : [];

  completedDates.forEach(
    (value: any) => {
      const dateKey =
        String(
          value ?? ''
        ).slice(
          0,
          10
        );

      if (
        dateKey >=
          weekStartKey &&
        dateKey <=
          weekEndKey
      ) {
        completedDateSet.add(
          dateKey
        );
      }
    }
  );

/*
 * completedDates가 없는 예전 목표만
 * actionLogs를 대신 사용합니다.
 */
const shouldUseLegacyLogs =
  !Array.isArray(
    goal?.completedDates
  );

if (shouldUseLegacyLogs) {
  const safeActionLogs =
    Array.isArray(
      actionLogs
    )
      ? actionLogs
      : [];

  safeActionLogs.forEach(
    (log: any) => {
      if (
        String(
          log?.action_goal_id ??
            log?.actionGoalId ??
            ''
        ) !==
        String(
          goal?.id ?? ''
        )
      ) {
        return;
      }

      if (
        log?.completed ===
        false
      ) {
        return;
      }

      const dateKey =
        String(
          log?.date ??
            log?.createdAt ??
            ''
        ).slice(
          0,
          10
        );

      if (
        dateKey >=
          weekStartKey &&
        dateKey <=
          weekEndKey
      ) {
        completedDateSet.add(
          dateKey
        );
      }
    }
  );
}

  const repeatType =
    goal?.repeatType ===
      'weekdays'
      ? 'weekdays'
      : 'weeklyCount';

  const selectedDays =
    Array.isArray(
      goal?.selectedDays
    )
      ? goal.selectedDays
          .map(Number)
          .filter(
            (
              day: number
            ) =>
              day >= 0 &&
              day <= 6
          )
          .sort(
            (
              a: number,
              b: number
            ) => a - b
          )
      : [];

  const rawTargetCount =
    repeatType ===
      'weekdays'
      ? selectedDays.length
      : Number(
          goal?.weeklyCount ??
            0
        );

  const targetCount =
    Math.max(
      1,
      rawTargetCount || 1
    );

  const completedCount =
    completedDateSet.size;

  const progressPercent =
    Math.min(
      100,
      Math.round(
        (
          completedCount /
          targetCount
        ) * 100
      )
    );

  const selectedDayText =
    selectedDays
      .map(
        (
          index: number
        ) =>
          weekDays[index]
      )
      .filter(Boolean)
      .join('·');

  const scheduleText =
  repeatType === 'weekdays'
    ? selectedDayText || '요일 미설정'
    : '수행요일 자유';

  return {
    completedCount,
    targetCount,
    progressPercent,
    scheduleText,
  };
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function calculateSpeedKmh(distanceKm: number, minutes: number) {
  if (!distanceKm || !minutes) return 0;

  return distanceKm / (minutes / 60);
}

function formatRecordTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h <= 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}

function formatRecordClockTime(minutes: number) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(distanceKm: number, minutes: number) {
  if (!distanceKm || !minutes) return '-';

  const pace = minutes / distanceKm;
  const paceMin = Math.floor(pace);
  const paceSec = Math.round((pace - paceMin) * 60);

  return `${paceMin}'${String(paceSec).padStart(2, '0')}"`;
}

function calculatePreviewCalories(
  goal: any,
  minutes: number,
  weight: number
) {
  const met = Number(goal?.met ?? 0);

  if (!met || !minutes) return 0;

  return Math.round(
    met * weight * (minutes / 60)
  );
}

function getFocusLabel(category?: string) {
  if (category === 'exercise') return '운동 만족도';
  if (category === 'study') return '오늘의 집중';
  if (category === 'mental') return '마음 안정';
  if (category === 'daily') return '몰입도';
  return '오늘의 집중';
}


function getRouteRegion(coords: any[]) {
  if (!coords || coords.length === 0) {
    return {
      latitude: 37.5665,
      longitude: 126.978,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  const latitudes = coords.map((p) => p.latitude);
  const longitudes = coords.map((p) => p.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.005),
    longitudeDelta: Math.max((maxLon - minLon) * 1.8, 0.005),
  };
}

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

function calculateExp(goal: any) {
   if (goal.type === '시간기록형' || goal.type === 'timer' || goal.minutes > 0) return 15;
  return 10;
}

function gridToScreen(col: number, row: number) {
  const TILE_WIDTH = 190;
  const TILE_HEIGHT = 95;

  return {
    x: col * (TILE_WIDTH / 2) - row * (TILE_WIDTH / 2) + 430,
    y: col * (TILE_HEIGHT / 2) + row * (TILE_HEIGHT / 2) - 80,
  };
}

function clampGrid(value: number) {
  return Math.max(0, Math.min(value, 11));
}

function screenToGrid(x: number, y: number) {
  const TILE_WIDTH = 190;
  const TILE_HEIGHT = 95;

  const localX = x - 430;
  const localY = y + 80;

  const col = Math.round(
    localY / TILE_HEIGHT + localX / TILE_WIDTH
  );

  const row = Math.round(
    localY / TILE_HEIGHT - localX / TILE_WIDTH
  );

  return {
    col: clampGrid(col),
    row: clampGrid(row),
  };
}

function screenToRawGrid(x: number, y: number) {
  const TILE_WIDTH = 190;
  const TILE_HEIGHT = 95;

  const localX = x - 430;
  const localY = y + 80;

  const col = Math.round(
    localY / TILE_HEIGHT + localX / TILE_WIDTH
  );

  const row = Math.round(
    localY / TILE_HEIGHT - localX / TILE_WIDTH
  );

  return {
    col,
    row,
  };
}

function getDistance(a: any, b: any) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function clampCamera(value: number, min: number, max: number) {
  'worklet';

  return Math.max(min, Math.min(value, max));
}



function screenToStableGrid(
  x: number,
  y: number,
  currentGrid: { col: number; row: number }
) {
  const nextGrid = screenToGrid(x, y);

  if (
    nextGrid.col === currentGrid.col &&
    nextGrid.row === currentGrid.row
  ) {
    return currentGrid;
  }

  const currentPos = gridToScreen(
    currentGrid.col,
    currentGrid.row
  );

  const nextPos = gridToScreen(
    nextGrid.col,
    nextGrid.row
  );

  const touchPos = { x, y };

  const currentDistance = getDistance(touchPos, currentPos);
  const nextDistance = getDistance(touchPos, nextPos);

  if (nextDistance + 35 < currentDistance) {
    return nextGrid;
  }

  return currentGrid;
}

function getGoalEndInfo(goal: any) {
  const totalDays =
    Number(goal?.duration?.replace('주', '')) * 7 || 0;

  const createdAt = goal?.createdAt
  ? new Date(goal.createdAt)
  : new Date();

  const endDate = addDays(createdAt, totalDays);

  const today = new Date();

  const remainDays = Math.max(
    0,
    Math.ceil(
      (endDate.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return {
    endText: formatDate(endDate),
    remainDays,
    totalDays,
  };
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
          <Svg
            width={190}
            height={190}
            viewBox="0 0 190 190"
          >
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

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    widgetAction?: string;
    goalId?: string;
    category?: string;
    widgetTs?: string;
  }>();

  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';

  const [onboardingData, setOnboardingData] =
    useState<any>(getRootOnboardingData());


  const [selectedCategory, setSelectedCategory] =
    useState(
      onboardingData?.category ?? 'exercise'
    );

    const handledWidgetActionRef =
  useRef<string | null>(null);

  const [editingGoal, setEditingGoal] =
    useState<any>(null);

  const [editingResultGoal, setEditingResultGoal] =
    useState<any>(null);

 const [gpsModalGoalId, setGpsModalGoalId] =
  useState<string | number | null>(null);

  const [recordModalVisible, setRecordModalVisible] =
  useState(false);

  const routeCaptureRef = useRef<View | null>(null);

  const decorateCaptureRef = useRef<View | null>(null);

const [decorateModalVisible, setDecorateModalVisible] =
  useState(false);

  const [isDecorateSaving, setIsDecorateSaving] =
  useState(false);

const [decoratedPhotoUri, setDecoratedPhotoUri] =
  useState<string | null>(null);

  const [decorateStickers, setDecorateStickers] =
  useState<DecorateSticker[]>([]);

  const [showCustomStickerModal, setShowCustomStickerModal] =
    useState(false);

  const [customStickerText, setCustomStickerText] =
    useState('');

const [pendingCompleteGoal, setPendingCompleteGoal] =
  useState<any>(null);

const [selectedPhoto, setSelectedPhoto] =
  useState<any>(null);

const [pendingMinutes, setPendingMinutes] =
  useState(0);

const [recordMemo, setRecordMemo] = useState('');
const [focusRating, setFocusRating] = useState(5);
const [calorieWeight, setCalorieWeight] = useState(60);
const [completionSaveRequest, setCompletionSaveRequest] =
  useState<{
    withoutPhoto?: boolean;
    title: string;
    rewardXp: number;
    minutes: number;
    useGps: boolean;
    distanceKm: number;
  } | null>(null);

const [
  completionCalorieInput,
  setCompletionCalorieInput,
] = useState('');

const [
  isCompletionSaving,
  setIsCompletionSaving,
] = useState(false);
  const [runningGoalId, setRunningGoalId] =
  useState<string | number | null>(null);

  const [timerSeconds, setTimerSeconds] =
    useState(0);

    const [timerStartAt, setTimerStartAt] =
  useState<string | null>(null);

    const [gpsEnabled, setGpsEnabled] = useState(false);
const [gpsDistanceKm, setGpsDistanceKm] = useState(0);
const [gpsCoordinates, setGpsCoordinates] = useState<any[]>([]);
const [locationSubscription, setLocationSubscription] = useState<any>(null);
const timerNotificationIdRef = useRef<string | null>(null);
const [foxDirection, setFoxDirection] =
  useState<'downRight' | 'downLeft' | 'upRight' | 'upLeft'>('downRight');

const [rootyAction, setRootyAction] =
  useState<RootyAction>('walk');
const [rootyCycleKey, setRootyCycleKey] =
  useState(0);

const rootyReactingRef =
  useRef(false);

const [
  rootyRuntimeReady,
  setRootyRuntimeReady,
] = useState(false);
const [
  rootyAppActive,
  setRootyAppActive,
] = useState(
  AppState.currentState === 'active' ||
    AppState.currentState == null
);

const rootyAppActiveRef =
  useRef(
    AppState.currentState === 'active' ||
      AppState.currentState == null
  );

const rootyActionRef =
  useRef<RootyAction>('walk');

const rootyDirectionRef =
  useRef<RootyDirection>(
    'downRight'
  );

const rootyResumeDelayRef =
  useRef(300);

// ROOTY_BEHAVIOR_V54_PERSISTENT_STATE_SYSTEM
const rootyStateRef =
  useRef<RootyState>({
    ...ROOTY_DEFAULT_STATE,
  });


// ROOTY_BEHAVIOR_V59_CONDITION_CLASSIFICATION
const rootyConditionRef =
  useRef<RootyConditionSnapshot>(
    getRootyConditionSnapshot(
      ROOTY_DEFAULT_STATE
    )
  );


// ROOTY_BEHAVIOR_V63_AFFECTION_SOCIAL_RESPONSE
const rootyBondedTapFollowUpRef =
  useRef(false);

// ROOTY_BEHAVIOR_V65_SPONTANEOUS_ANTI_REPETITION_COOLDOWN
const rootySpontaneousCooldownRef =
  useRef(0);


// ROOTY_BEHAVIOR_V66_NORMAL_REST_ANTI_REPETITION
const rootyRestAntiRepeatStateRef =
  useRef<RootyRestAntiRepeatState>({
    behavior: null,
    streak: 0,
  });

const rootyStateReadyRef =
  useRef(false);

const rootyOfflineCatchUpRunningRef =
  useRef(false);

const applyRootyStateDelta =
  useCallback(
    (
      delta:
        Partial<RootyState>,
      reason:
        'tap' |
        'long-press' |
        'walk-session' |
        'look-around' |
        'sit-rest' |
        'nap' |
        'time-mood' |
        'offline-mood'
    ) => {
      if (
        !rootyStateReadyRef.current
      ) {
        return;
      }

      const current =
        rootyStateRef.current;

      const clamp =
        (value: number) =>
          Math.max(
            0,
            Math.min(
              100,
              Math.round(value)
            )
          );

      const next: RootyState = {
        mood:
          clamp(
            current.mood +
              (delta.mood ?? 0)
          ),
        energy:
          clamp(
            current.energy +
              (delta.energy ?? 0)
          ),
        affection:
          clamp(
            current.affection +
              (delta.affection ?? 0)
          ),
      };

      rootyStateRef.current =
        next;


      const nextCondition =
        getRootyConditionSnapshot(
          next
        );

      rootyConditionRef.current =
        nextCondition;

      if (__DEV__) {
        console.log(
          '[ROOTY V59] condition',
          {
            reason,
            ...nextCondition,
          }
        );
      }

      void saveRootyState(
        next
      );

      if (__DEV__) {
        console.log(
          '[ROOTY STATE] updated',
          {
            reason,
            ...next,
          }
        );
      }
    },
    []
  );

// ROOTY_BEHAVIOR_V58_OFFLINE_STATE_DRIFT
const applyRootyOfflineMoodCatchUp =
  useCallback(
    async (
      source:
        'launch' |
        'resume'
    ) => {
      if (
        !rootyStateReadyRef.current ||
        rootyOfflineCatchUpRunningRef.current
      ) {
        return;
      }

      rootyOfflineCatchUpRunningRef.current =
        true;

      try {
        const checkpointAt =
          await consumeRootyOfflineCheckpoint();

        if (checkpointAt == null) {
          return;
        }

        const now =
          Date.now();

        const elapsedMs =
          Math.max(
            0,
            now -
              checkpointAt
          );

        const elapsedIntervals =
          Math.floor(
            elapsedMs /
              ROOTY_STATE_SIMULATION
                .moodDriftIntervalMs
          );

        const availableAdjustment =
          Math.min(
            elapsedIntervals *
              ROOTY_STATE_SIMULATION
                .moodDriftStep,
            ROOTY_STATE_SIMULATION
              .offlineMoodMaxAdjustment
          );

        const currentMood =
          rootyStateRef.current.mood;

        const distance =
          ROOTY_STATE_SIMULATION
            .moodBaseline -
          currentMood;

        const adjustment =
          Math.min(
            Math.abs(distance),
            availableAdjustment
          );

        if (
          adjustment > 0
        ) {
          applyRootyStateDelta(
            {
              mood:
                distance > 0
                  ? adjustment
                  : -adjustment,
            },
            'offline-mood'
          );
        }

        if (__DEV__) {
          console.log(
            '[ROOTY V58] offline catch-up',
            {
              source,
              checkpointAt,
              elapsedMs,
              elapsedIntervals,
              availableAdjustment,
              appliedAdjustment:
                adjustment,
              moodBefore:
                currentMood,
              moodAfter:
                distance > 0
                  ? currentMood +
                    adjustment
                  : currentMood -
                    adjustment,
            }
          );
        }
      } finally {
        rootyOfflineCatchUpRunningRef.current =
          false;
      }
    },
    [
      applyRootyStateDelta,
    ]
  );
useEffect(() => {
  let cancelled = false;

  const restoreRootyState =
    async () => {
      const saved =
        await loadRootyState();

      if (cancelled) {
        return;
      }

      const next =
        saved ?? {
          ...ROOTY_DEFAULT_STATE,
        };

      rootyStateRef.current =
        next;


      const nextCondition =
        getRootyConditionSnapshot(
          next
        );

      rootyConditionRef.current =
        nextCondition;

      if (__DEV__) {
        console.log(
          '[ROOTY V59] condition',
          {
            reason: 'load',
            ...nextCondition,
          }
        );
      }

      rootyStateReadyRef.current =
        true;

      void applyRootyOfflineMoodCatchUp(
        'launch'
      );

      if (!saved) {
        void saveRootyState(
          next
        );
      }

      if (__DEV__) {
        console.log(
          '[ROOTY STATE] loaded',
          {
            source:
              saved
                ? 'storage'
                : 'default',
            ...next,
          }
        );
      }
    };

  void restoreRootyState();

  return () => {
    cancelled = true;
  };
}, []);

// ROOTY_BEHAVIOR_V57_TIME_BASED_STATE_DRIFT
useEffect(() => {
  if (!rootyAppActive) {
    return;
  }

  const applyMoodTimeDrift =
    () => {
      if (
        !rootyStateReadyRef.current
      ) {
        return;
      }

      const currentMood =
        rootyStateRef.current.mood;

      const moodBaseline =
        ROOTY_STATE_SIMULATION
          .moodBaseline;

      const distance =
        moodBaseline -
        currentMood;

      if (distance === 0) {
        return;
      }

      const step =
        Math.min(
          Math.abs(distance),
          ROOTY_STATE_SIMULATION
            .moodDriftStep
        );

      applyRootyStateDelta(
        {
          mood:
            distance > 0
              ? step
              : -step,
        },
        'time-mood'
      );
    };

  const interval =
    setInterval(
      applyMoodTimeDrift,
      ROOTY_STATE_SIMULATION
        .moodDriftIntervalMs
    );

  return () => {
    clearInterval(
      interval
    );
  };
}, [
  rootyAppActive,
  applyRootyStateDelta,
]);
// ROOTY_BEHAVIOR_V15_ATOMIC_STATE_SYNC
const applyRootyAction =
  useCallback(
    (
      nextAction:
        RootyAction
    ) => {
      const previousAction =
        rootyActionRef.current;

      if (
        previousAction !==
        nextAction
      ) {
        logRootyDebugEvent(
          'action',
          {
            from:
              previousAction,
            to:
              nextAction,
            direction:
              rootyDirectionRef.current,
            x:
              foxX.value,
            y:
              foxY.value,
          }
        );
      }
      rootyActionRef.current =
        nextAction;

      setRootyAction(
        nextAction
      );
    },
    []
  );

const applyRootyDirection =
  useCallback(
    (
      nextDirection:
        RootyDirection
    ) => {
      const previousDirection =
        rootyDirectionRef.current;

      if (
        previousDirection !==
        nextDirection
      ) {
        logRootyDebugEvent(
          'direction',
          {
            from:
              previousDirection,
            to:
              nextDirection,
            action:
              rootyActionRef.current,
            x:
              foxX.value,
            y:
              foxY.value,
          }
        );
      }
      rootyDirectionRef.current =
        nextDirection;

      setFoxDirection(
        nextDirection
      );
    },
    []
  );

const ROOTY_DEFAULT_POSITION = {
  x: 430,
  y: 250,
} as const;

// ROOTY_BEHAVIOR_V23_SAFE_RESTORE_POSITION
const foxX =
  useSharedValue<number>(
    ROOTY_DEFAULT_POSITION.x
  );

const foxY =
  useSharedValue<number>(
    ROOTY_DEFAULT_POSITION.y
  );
// ROOTY_BEHAVIOR_V13_HOME_FOCUS_PAUSE
const [
  rootyHomeFocused,
  setRootyHomeFocused,
] = useState(false);
useEffect(() => {
  if (!rootyRuntimeReady) {
    return;
  }

  logRootyDebugEvent(
    rootyHomeFocused
      ? 'home-focus'
      : 'home-blur',
    {
      action:
        rootyActionRef.current,
      direction:
        rootyDirectionRef.current,
      x:
        foxX.value,
      y:
        foxY.value,
      appActive:
        rootyAppActive,
    }
  );
}, [
  rootyHomeFocused,
  rootyRuntimeReady,
]);

useEffect(() => {
  if (!rootyRuntimeReady) {
    return;
  }

  logRootyDebugEvent(
    rootyAppActive
      ? 'app-active'
      : 'app-inactive',
    {
      action:
        rootyActionRef.current,
      direction:
        rootyDirectionRef.current,
      x:
        foxX.value,
      y:
        foxY.value,
      homeFocused:
        rootyHomeFocused,
    }
  );
}, [
  rootyAppActive,
  rootyRuntimeReady,
]);

// ROOTY_BEHAVIOR_V14_HOME_RESUME_STABILIZATION
const stabilizeRootyForHomeFocus =
  useCallback(() => {
    const currentAction =
      rootyActionRef.current;

    if (
      currentAction !== 'walk' &&
      currentAction !== 'happy'
    ) {
      return;
    }

    const currentDirection =
      rootyDirectionRef.current;

    let stableDirection =
      currentDirection;

    if (
      !hasRootyDirectionalFrames(
        'idle',
        currentDirection
      )
    ) {
      if (currentDirection === 'upRight') {
        stableDirection =
          'downRight';
      }
      else if (
        currentDirection === 'upLeft'
      ) {
        stableDirection =
          'downLeft';
      }
    }

    if (
      stableDirection !==
      currentDirection
    ) {
      rootyDirectionRef.current =
        stableDirection;

      applyRootyDirection(
        stableDirection
      );
    }

    rootyReactingRef.current =
      false;

    rootyActionRef.current =
      'idle';

    applyRootyAction(
      'idle'
    );
  }, []);
useFocusEffect(
  useCallback(() => {
    stabilizeRootyForHomeFocus();

    setRootyHomeFocused(
      true
    );

    return () => {
      setRootyHomeFocused(
        false
      );

      cancelAnimation(
        foxX
      );

      cancelAnimation(
        foxY
      );

      void saveRootyRuntimeSnapshot({
        x:
          foxX.value,
        y:
          foxY.value,
        direction:
          rootyDirectionRef.current,
        action:
          rootyActionRef.current,
      });
    };
  }, [
    foxX,
    foxY,
    stabilizeRootyForHomeFocus,
  ])
);

useEffect(() => {
  rootyActionRef.current =
    rootyAction;
}, [rootyAction]);

useEffect(() => {
  rootyDirectionRef.current =
    foxDirection;
}, [foxDirection]);

const scale = useSharedValue(0.28);

const translateX = useSharedValue(160);
const translateY = useSharedValue(100);

const savedTranslateX = useSharedValue(160);
const savedTranslateY = useSharedValue(100);

const savedScale = useSharedValue(0.28);
const startTranslateX = useSharedValue(250);
const startTranslateY = useSharedValue(200);
const startScale = useSharedValue(1);

const pinchGesture = Gesture.Pinch()
  .onStart(() => {
    startScale.value = scale.value;
    startTranslateX.value = translateX.value;
    startTranslateY.value = translateY.value;
  })
  .onUpdate((event) => {
  const nextScale =
    startScale.value * event.scale;

  const limitedScale = Math.max(
    0.2,
    Math.min(nextScale, 0.8)
  );

  translateX.value =
    event.focalX -
    (event.focalX - startTranslateX.value) *
      (limitedScale / startScale.value);

  translateY.value =
    event.focalY -
    (event.focalY - startTranslateY.value) *
      (limitedScale / startScale.value);

  scale.value = limitedScale;
})
  .onEnd(() => {
    savedScale.value = scale.value;
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  });



const animatedStyle =
  useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const foxAnimatedStyle = useAnimatedStyle(() => {
  return {
    left: foxX.value,
    top: foxY.value,
  };
});

const isFoxOutsideVillage = (x: number, y: number) => {
  const foxGrid = screenToRawGrid(x, y);

  return (
    foxGrid.col < 0 ||
    foxGrid.col > GRID_SIZE - 1 ||
    foxGrid.row < 0 ||
    foxGrid.row > GRID_SIZE - 1
  );
};

// ROOTY_BEHAVIOR_V25_LIVE_VILLAGE_LAYOUT_SAFETY
const placedBuildingsRef =
  useRef<any[]>(
    onboardingData?.placedBuildings ?? []
  );
const isFoxBlockedByBuilding = (x: number, y: number) => {
  const foxGrid = screenToGrid(x, y);

  return placedBuildingsRef.current.some((building) => {
    const size =
      buildingSizes[
        building.id as keyof typeof buildingSizes
      ] ?? { cols: 1, rows: 1 };

    for (let c = 0; c < size.cols; c++) {
      for (let r = 0; r < size.rows; r++) {
        if (
          building.col + c === foxGrid.col &&
          building.row + r === foxGrid.row
        ) {
          return true;
        }
      }
    }

    return false;
  });
};


// ROOTY_BEHAVIOR_V23_SAFE_RESTORE_POSITION_FALLBACK
const findSafeRootyPosition = (
  preferredX: number,
  preferredY: number
) => {
  const preferredGrid =
    screenToGrid(
      preferredX,
      preferredY
    );

  let bestPosition:
    {
      x: number;
      y: number;
    } |
    null =
      null;

  let bestDistance =
    Number.POSITIVE_INFINITY;

  for (
    let col = 0;
    col < GRID_SIZE;
    col += 1
  ) {
    for (
      let row = 0;
      row < GRID_SIZE;
      row += 1
    ) {
      const candidate =
        gridToScreen(
          col,
          row
        );

      if (
        isFoxOutsideVillage(
          candidate.x,
          candidate.y
        ) ||
        isFoxBlockedByBuilding(
          candidate.x,
          candidate.y
        )
      ) {
        continue;
      }

      const distance =
        Math.abs(
          col -
            preferredGrid.col
        ) +
        Math.abs(
          row -
            preferredGrid.row
        );

      if (
        distance <
        bestDistance
      ) {
        bestDistance =
          distance;

        bestPosition = {
          x:
            candidate.x,
          y:
            candidate.y,
        };
      }
    }
  }

  return bestPosition;
};

// ROOTY_BEHAVIOR_V4_RUNTIME_CONTINUITY
useEffect(() => {
  let cancelled = false;

  const restoreRootyRuntime =
    async () => {
      try {
        const snapshot =
          await loadRootyRuntimeSnapshot();

        if (cancelled) {
      return;
    }

    const preferredPosition =
      snapshot
        ? {
            x:
              snapshot.x,
            y:
              snapshot.y,
          }
        : ROOTY_DEFAULT_POSITION;

    const safePosition =
      !isFoxOutsideVillage(
        preferredPosition.x,
        preferredPosition.y
      ) &&
      !isFoxBlockedByBuilding(
        preferredPosition.x,
        preferredPosition.y
      );

    const restorePosition =
      safePosition
        ? preferredPosition
        : findSafeRootyPosition(
            preferredPosition.x,
            preferredPosition.y
          );

    if (restorePosition) {
      foxX.value =
        restorePosition.x;

      foxY.value =
        restorePosition.y;
    }

    if (!snapshot) {
      return;
    }

        rootyDirectionRef.current =
          snapshot.direction;

        applyRootyDirection(
          snapshot.direction
        );

        const resumeAction =
          resolveRootyResumeAction(
            snapshot
          );

        rootyActionRef.current =
          resumeAction;

        applyRootyAction(
          resumeAction
        );

        rootyResumeDelayRef.current =
          getRootyResumeDelayMs(
            resumeAction
          );
      } catch (error) {
        console.log(
          'ROOTY RUNTIME RESTORE ERROR',
          error
        );
      } finally {
        if (!cancelled) {
          setRootyRuntimeReady(
            true
          );
        }
      }
    };

  void restoreRootyRuntime();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  if (!rootyRuntimeReady) {
    return;
  }

  const persistRootyRuntime =
    () =>
      saveRootyRuntimeSnapshot({
        x:
          foxX.value,
        y:
          foxY.value,
        direction:
          rootyDirectionRef.current,
        action:
          rootyActionRef.current,
      });

  // ROOTY_BEHAVIOR_V18_ACTIVE_HOME_CHECKPOINTS
  const shouldCheckpoint =
    rootyAppActive &&
    rootyHomeFocused;

  if (shouldCheckpoint) {
    void persistRootyRuntime();
  }

  const interval =
    shouldCheckpoint
      ? setInterval(
          () => {
            void persistRootyRuntime();
          },
          5_000
        )
      : null;

  const subscription =
    AppState.addEventListener(
      'change',
      (nextState) => {
        // ROOTY_BEHAVIOR_V12_APP_LIFECYCLE_PAUSE
        const isActive =
          nextState ===
          'active';

        rootyAppActiveRef.current =
          isActive;

        setRootyAppActive(
          isActive
        );

        if (isActive) {
          void applyRootyOfflineMoodCatchUp(
            'resume'
          );
        }

        if (!isActive) {
          cancelAnimation(
            foxX
          );

          cancelAnimation(
            foxY
          );

          void persistRootyRuntime();

          if (
            rootyStateReadyRef.current
          ) {
            void saveRootyState(
              rootyStateRef.current
            );
          }

          void saveRootyOfflineCheckpoint();
        }
      }
    );

  return () => {
    if (interval !== null) {
      clearInterval(
        interval
      );
    }

    subscription.remove();
  };
}, [
  rootyRuntimeReady,
  rootyAppActive,
  rootyHomeFocused,
applyRootyOfflineMoodCatchUp,
]);
// ROOTY_BEHAVIOR_V3_NATURAL_ROUTINE
useEffect(() => {
  if (
    !rootyRuntimeReady ||
    !rootyAppActive ||
    !rootyHomeFocused
  ) {
    return;
  }

  logRootyDebugEvent(
    'routine-restart',
    {
      cycleKey:
        rootyCycleKey,
      action:
        rootyActionRef.current,
      direction:
        rootyDirectionRef.current,
      x:
        foxX.value,
      y:
        foxY.value,
    }
  );

  let cancelled = false;

  const timers:
    Array<ReturnType<typeof setTimeout>> =
      [];

  const later = (
    callback: () => void,
    delayMs: number
  ) => {
    const timer =
      setTimeout(() => {
        if (!cancelled) {
          callback();
        }
      }, delayMs);

    timers.push(timer);
  };

  const randomInt = (
    min: number,
    max: number
  ) =>
    Math.floor(
      min +
        Math.random() *
          (max - min + 1)
    );

  const directions = [
    'downRight',
    'downLeft',
    'upRight',
    'upLeft',
  ] as const;

  const pickRandomDirection =
    () =>
      directions[
        randomInt(
          0,
          directions.length - 1
        )
      ];

  // ROOTY_BEHAVIOR_V7_REST_FACING_CONTINUITY
  const getActionFacingDirections =
    (
      action: RootyAction
    ) =>
      directions.filter(
        (direction) =>
          direction ===
            'downRight' ||
          direction ===
            'downLeft' ||
          hasRootyDirectionalFrames(
            action,
            direction
          )
      );

  const faceRootyForAction =
    (
      action: RootyAction
    ) => {
      const currentDirection =
        rootyDirectionRef.current;

      if (
        currentDirection ===
          'downRight' ||
        currentDirection ===
          'downLeft' ||
        hasRootyDirectionalFrames(
          action,
          currentDirection
        )
      ) {
        return;
      }

      const fallbackDirection =
        currentDirection ===
        'upLeft'
          ? 'downLeft'
          : 'downRight';

      rootyDirectionRef.current =
        fallbackDirection;

      applyRootyDirection(
        fallbackDirection
      );
    };

  const faceAnotherDirection =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }

      const candidates =
        getActionFacingDirections(
          'idle'
        );

      const nextDirection =
        candidates[
          randomInt(
            0,
            candidates.length - 1
          )
        ];

      rootyDirectionRef.current =
        nextDirection;

      applyRootyDirection(
        nextDirection
      );
    };
  // ROOTY_BEHAVIOR_V8_COHERENT_WALKING
  const OPPOSITE_DIRECTION:
    Record<
      (typeof directions)[number],
      (typeof directions)[number]
    > = {
      downRight: 'upLeft',
      downLeft: 'upRight',
      upRight: 'downLeft',
      upLeft: 'downRight',
    };

  const pickNextWalkDirection =
    (
      currentDirection?:
        (typeof directions)[number]
    ) => {
      if (!currentDirection) {
        return (
          directions[
            randomInt(
              0,
              directions.length - 1
            )
          ] ?? 'downRight'
        );
      }

      if (Math.random() < ROOTY_NATURAL_BEHAVIOR.keepHeadingChance) {
        return currentDirection;
      }

      const candidates =
        directions.filter(
          (direction) =>
            direction !==
              currentDirection &&
            direction !==
              OPPOSITE_DIRECTION[
                currentDirection
              ]
        );

      return (
        candidates[
          randomInt(
            0,
            candidates.length - 1
          )
        ] ??
        currentDirection
      );
    };

  const tryMoveRootyOneStep =
    (
      preferredDirection:
        (typeof directions)[number]
    ) => {
      const lateralDirections =
        directions.filter(
          (direction) =>
            direction !==
              preferredDirection &&
            direction !==
              OPPOSITE_DIRECTION[
                preferredDirection
              ]
        );

      const firstLateral =
        lateralDirections[
          randomInt(
            0,
            lateralDirections.length - 1
          )
        ] ??
        preferredDirection;

      const secondLateral =
        lateralDirections.find(
          (direction) =>
            direction !==
            firstLateral
        ) ??
        preferredDirection;

      const attemptDirections:
        (typeof directions)[number][] = [
          preferredDirection,
          firstLateral,
          secondLateral,
          OPPOSITE_DIRECTION[
            preferredDirection
          ],
        ];

      for (
        const nextDirection of
        attemptDirections
      ) {
        let nextX = foxX.value;
        let nextY = foxY.value;

        if (nextDirection === 'downRight') {
          nextX += ROOTY_WALK_MOTION.stepX;
          nextY += ROOTY_WALK_MOTION.stepY;
        }

        if (nextDirection === 'downLeft') {
          nextX -= ROOTY_WALK_MOTION.stepX;
          nextY += ROOTY_WALK_MOTION.stepY;
        }

        if (nextDirection === 'upRight') {
          nextX += ROOTY_WALK_MOTION.stepX;
          nextY -= ROOTY_WALK_MOTION.stepY;
        }

        if (nextDirection === 'upLeft') {
          nextX -= ROOTY_WALK_MOTION.stepX;
          nextY -= ROOTY_WALK_MOTION.stepY;
        }

        nextX =
          Math.max(
            ROOTY_VILLAGE_BOUNDS.minX,
            Math.min(
              nextX,
              ROOTY_VILLAGE_BOUNDS.maxX
            )
          );

        nextY =
          Math.max(
            ROOTY_VILLAGE_BOUNDS.minY,
            Math.min(
              nextY,
              ROOTY_VILLAGE_BOUNDS.maxY
            )
          );

        if (
          isFoxOutsideVillage(
            nextX,
            nextY
          )
        ) {
          continue;
        }

        if (
          isFoxBlockedByBuilding(
            nextX,
            nextY
          )
        ) {
          continue;
        }

        rootyDirectionRef.current =
          nextDirection;

        applyRootyDirection(
          nextDirection
        );

        foxX.value =
          withTiming(
            nextX,
            {
              duration: ROOTY_WALK_MOTION.stepDurationMs,
            }
          );

        foxY.value =
          withTiming(
            nextY,
            {
              duration: ROOTY_WALK_MOTION.stepDurationMs,
            }
          );

        return nextDirection;
      }

      return null;
    };

  const startRootyWalkSession =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }

      applyRootyAction(
        'walk'
      );

      // ROOTY_BEHAVIOR_V60_CONDITION_BASED_BEHAVIOR_CONTROL
      const energyCondition =
        rootyConditionRef.current.energy;

      const walkStepRange =
        getRootyConditionWalkStepRange(
          energyCondition
        );

      let remainingSteps =
        randomInt(
          walkStepRange.minSteps,
          walkStepRange.maxSteps
        );

      if (__DEV__) {
        console.log(
          '[ROOTY V60] walk policy',
          {
            energyCondition,
            walkStepRange,
          }
        );
      }

      let currentWalkDirection =
        pickNextWalkDirection(
          rootyDirectionRef.current
        );

      let segmentStepsRemaining =
        randomInt(
          ROOTY_NATURAL_BEHAVIOR.headingMinSteps,
          ROOTY_NATURAL_BEHAVIOR.headingMaxSteps
        );

      let blockedRetries = 0;
      let movedSteps = 0;

      const chooseNextSegment =
        () => {
          currentWalkDirection =
            pickNextWalkDirection(
              currentWalkDirection
            );

          segmentStepsRemaining =
            randomInt(
          ROOTY_NATURAL_BEHAVIOR.headingMinSteps,
          ROOTY_NATURAL_BEHAVIOR.headingMaxSteps
        );
        };

      const walkStep =
        () => {
          if (
            cancelled ||
            rootyReactingRef.current
          ) {
            return;
          }

          const movedDirection =
            tryMoveRootyOneStep(
              currentWalkDirection
            );

          if (movedDirection) {
            remainingSteps -= 1;
            blockedRetries = 0;
            movedSteps += 1;

            if (
              movedDirection !==
              currentWalkDirection
            ) {
              currentWalkDirection =
                movedDirection;

              segmentStepsRemaining =
                randomInt(
          ROOTY_NATURAL_BEHAVIOR.headingMinSteps,
          ROOTY_NATURAL_BEHAVIOR.headingMaxSteps
        );
            } else {
              segmentStepsRemaining -= 1;

              if (
                segmentStepsRemaining <= 0 &&
                remainingSteps > 0
              ) {
                chooseNextSegment();
              }
            }
          } else {
            blockedRetries += 1;
            chooseNextSegment();
          }

          if (
            remainingSteps <= 0 ||
            blockedRetries >=
              ROOTY_NATURAL_BEHAVIOR.blockedRetryLimit
          ) {
            if (movedSteps > 0) {
              applyRootyStateDelta(
                {
                  energy:
                    ROOTY_STATE_SIMULATION
                      .walkSessionEnergyDelta,
                },
                'walk-session'
              );
            }

            applyRootyAction(
              'idle'
            );

            later(
              startRootyRest,
              randomInt(
                ROOTY_NATURAL_BEHAVIOR.postWalkRestDelayMinMs,
                ROOTY_NATURAL_BEHAVIOR.postWalkRestDelayMaxMs
              )
            );

            return;
          }

          later(
            walkStep,
            movedDirection
              ? randomInt(
                  ROOTY_WALK_MOTION.nextStepDelayMinMs,
                  ROOTY_WALK_MOTION.nextStepDelayMaxMs
                )
              : randomInt(
                  ROOTY_WALK_MOTION.blockedRetryDelayMinMs,
                  ROOTY_WALK_MOTION.blockedRetryDelayMaxMs
                )
          );
        };

      walkStep();
    };

  const finishRestAndWalk =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }

      faceRootyForAction('idle');

      applyRootyAction(
        'idle'
      );

      later(
        startRootyWalkSession,
        randomInt(
          ROOTY_NATURAL_BEHAVIOR.restToWalkDelayMinMs,
          ROOTY_NATURAL_BEHAVIOR.restToWalkDelayMaxMs
        )
      );
    };

  const startRootyLookAround =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }

      applyRootyAction(
        'idle'
      );

      faceAnotherDirection();

      later(
        () => {
          faceAnotherDirection();

          later(
            () => {
              faceAnotherDirection();

              if (
                cancelled ||
                rootyReactingRef.current
              ) {
                return;
              }

              applyRootyStateDelta(
                {
                  energy:
                    ROOTY_STATE_SIMULATION
                      .lookAroundEnergyDelta,
                },
                'look-around'
              );

              later(
                startRootyWalkSession,
                randomInt(
                  ROOTY_NATURAL_BEHAVIOR.lookReturnWalkDelayMinMs,
                  ROOTY_NATURAL_BEHAVIOR.lookReturnWalkDelayMaxMs
                )
              );
            },
            randomInt(
              ROOTY_NATURAL_BEHAVIOR.lookTurnDelayMinMs,
              ROOTY_NATURAL_BEHAVIOR.lookTurnDelayMaxMs
            )
          );
        },
        randomInt(
              ROOTY_NATURAL_BEHAVIOR.lookTurnDelayMinMs,
              ROOTY_NATURAL_BEHAVIOR.lookTurnDelayMaxMs
            )
      );
    };

  const startRootyNapSequence =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }

      // Sitting briefly doubles as the sleepy transition
      // until dedicated doze frames are added.
      faceRootyForAction('sit');

      applyRootyAction(
        'sit'
      );

      later(
        () => {
          if (
            cancelled ||
            rootyReactingRef.current
          ) {
            return;
          }

          faceRootyForAction('sleep');

          applyRootyAction(
            'sleep'
          );

          later(
            () => {
              if (
                cancelled ||
                rootyReactingRef.current
              ) {
                return;
              }

              applyRootyStateDelta(
                {
                  energy:
                    ROOTY_STATE_SIMULATION
                      .napEnergyDelta,
                },
                'nap'
              );

              // Sit once after sleep so waking up
              // does not jump directly into walking.
              applyRootyAction(
                'sit'
              );

              later(
                finishRestAndWalk,
                randomInt(
                  ROOTY_NATURAL_BEHAVIOR.wakeSitDelayMinMs,
                  ROOTY_NATURAL_BEHAVIOR.wakeSitDelayMaxMs
                )
              );
            },
            randomInt(
              ROOTY_NATURAL_BEHAVIOR.napDurationMinMs,
              ROOTY_NATURAL_BEHAVIOR.napDurationMaxMs
            )
          );
        },
        randomInt(
          ROOTY_NATURAL_BEHAVIOR.sleepySitDelayMinMs,
          ROOTY_NATURAL_BEHAVIOR.sleepySitDelayMaxMs
        )
      );
    };

  const startRootySitRest =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }

      faceRootyForAction('sit');

      applyRootyAction(
        'sit'
      );

      later(
        () => {
          if (
            cancelled ||
            rootyReactingRef.current
          ) {
            return;
          }

          applyRootyStateDelta(
            {
              energy:
                ROOTY_STATE_SIMULATION
                  .sitRestEnergyDelta,
            },
            'sit-rest'
          );

          finishRestAndWalk();
        },
        randomInt(
          ROOTY_NATURAL_BEHAVIOR.sitRestDurationMinMs,
          ROOTY_NATURAL_BEHAVIOR.sitRestDurationMaxMs
        )
      );
    };

  // ROOTY_BEHAVIOR_V61_MOOD_BASED_EXPRESSION_SYSTEM
  const startRootySpontaneousHappy =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }


      rootyBondedTapFollowUpRef.current =
        false;

      rootySpontaneousCooldownRef.current =
        getRootySpontaneousCooldownAfterTrigger();

      if (__DEV__) {
        console.log(
          '[ROOTY V65] cooldown armed',
          {
            source:
              'spontaneous-happy',
            cooldownCycles:
              rootySpontaneousCooldownRef
                .current,
          }
        );
      }

      rootyReactingRef.current =
        true;

      cancelAnimation(
        foxX
      );

      cancelAnimation(
        foxY
      );

      faceRootyForAction(
        'happy'
      );

      applyRootyAction(
        'happy'
      );

      if (__DEV__) {
        console.log(
          '[ROOTY V61] spontaneous happy start',
          {
            condition:
              rootyConditionRef.current,
          }
        );
      }

      /**
       * Reuses the existing happy animation-end path:
       * handleRootyAnimationEnd clears reacting and starts
       * a fresh natural cycle.
       */
      setRootyCycleKey(
        (current) =>
          current + 1
      );
    };
// ROOTY_BEHAVIOR_V64_BONDED_PASSIVE_SOCIAL_ATTENTION
  let skipBondedPassiveAttentionOnce =
    false;

  let skipSpontaneousCooldownConsumeOnce =
    false;

  const startRootyBondedPassiveAttention =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }


      rootySpontaneousCooldownRef.current =
        getRootySpontaneousCooldownAfterTrigger();

      if (__DEV__) {
        console.log(
          '[ROOTY V65] cooldown armed',
          {
            source:
              'passive-attention',
            cooldownCycles:
              rootySpontaneousCooldownRef
                .current,
          }
        );
      }

      const currentDirection =
        rootyDirectionRef.current;

      const attentionDirection:
        RootyDirection =
        currentDirection === 'upLeft' ||
        currentDirection === 'downLeft'
          ? 'downLeft'
          : 'downRight';

      rootyDirectionRef.current =
        attentionDirection;

      applyRootyDirection(
        attentionDirection
      );

      applyRootyAction(
        'idle'
      );

      if (__DEV__) {
        console.log(
          '[ROOTY V64] passive social attention start',
          {
            affectionCondition:
              rootyConditionRef.current
                .affection,
            direction:
              attentionDirection,
          }
        );
      }

      later(
        () => {
          if (
            cancelled ||
            rootyReactingRef.current
          ) {
            return;
          }

          skipBondedPassiveAttentionOnce =
            true;


          skipSpontaneousCooldownConsumeOnce =
            true;

          startRootyRest();
        },
        randomInt(
          ROOTY_PASSIVE_SOCIAL_POLICY
            .attentionDurationMinMs,
          ROOTY_PASSIVE_SOCIAL_POLICY
            .attentionDurationMaxMs
        )
      );
    };
// ROOTY_BEHAVIOR_V56_AUTOMATIC_STATE_CHANGES
// ROOTY_BEHAVIOR_V55_STATE_BASED_PROBABILITY_SYSTEM
  const startRootyRest =
    () => {
      if (
        cancelled ||
        rootyReactingRef.current
      ) {
        return;
      }

      const state =
        rootyStateRef.current;

      const condition =
        rootyConditionRef.current;

      const skipCooldownConsume =
        skipSpontaneousCooldownConsumeOnce;

      if (skipCooldownConsume) {
        skipSpontaneousCooldownConsumeOnce =
          false;
      }

      const cooldownResolution =
        resolveRootySpontaneousCooldown(
          rootySpontaneousCooldownRef.current,
          skipCooldownConsume
        );

      rootySpontaneousCooldownRef.current =
        cooldownResolution
          .nextCooldownCycles;

      const spontaneousSuppressed =
        cooldownResolution.suppressed;

      if (__DEV__) {
        console.log(
          '[ROOTY V65] spontaneous cooldown',
          {
            suppressed:
              spontaneousSuppressed,
            skippedConsumption:
              skipCooldownConsume,
            before:
              cooldownResolution
                .currentCooldownCycles,
            after:
              cooldownResolution
                .nextCooldownCycles,
          }
        );
      }

      const expressionChance =
        spontaneousSuppressed
          ? 0
          : getRootySpontaneousHappyChance(
              condition
            );

      const expressionRoll =
        Math.random();

      const shouldExpressHappy =
        !spontaneousSuppressed &&
        shouldStartRootySpontaneousHappy(
          condition,
          expressionRoll
        );

      if (__DEV__) {
        console.log(
          '[ROOTY V61] expression policy',
          {
            moodCondition:
              condition.mood,
            energyCondition:
              condition.energy,
            chance:
              expressionChance,
            roll:
              expressionRoll,
            triggered:
              shouldExpressHappy,
          }
        );
      }

      if (shouldExpressHappy) {
        startRootySpontaneousHappy();
        return;
      }


      const skipPassiveAttention =
        skipBondedPassiveAttentionOnce;

      if (skipPassiveAttention) {
        skipBondedPassiveAttentionOnce =
          false;
      }

      const passiveAttentionChance =
        skipPassiveAttention ||
        spontaneousSuppressed
          ? 0
          : getRootyBondedPassiveAttentionChance(
              condition
            );

      const passiveAttentionRoll =
        Math.random();

      const shouldShowPassiveAttention =
        !skipPassiveAttention &&
        !spontaneousSuppressed &&
        shouldStartRootyBondedPassiveAttention(
          condition,
          passiveAttentionRoll
        );

      if (__DEV__) {
        console.log(
          '[ROOTY V64] passive social policy',
          {
            affectionCondition:
              condition.affection,
            energyCondition:
              condition.energy,
            moodCondition:
              condition.mood,
            chance:
              passiveAttentionChance,
            roll:
              passiveAttentionRoll,
            skipped:
              skipPassiveAttention,
            triggered:
              shouldShowPassiveAttention,
          }
        );
      }

      if (
        shouldShowPassiveAttention
      ) {
        startRootyBondedPassiveAttention();
        return;
      }

      const baseProbabilities =
        getRootyStateRestProbabilities(
          state
        );

      // ROOTY_BEHAVIOR_V62_LOW_MOOD_CALM_REST
      const energyProbabilities =
        getRootyConditionRestProbabilities(
          baseProbabilities,
          condition.energy
        );

      const probabilities =
        getRootyLowMoodRestProbabilities(
          energyProbabilities,
          condition
        );


      const antiRepeatStateBefore =
        rootyRestAntiRepeatStateRef.current;

      const antiRepeatProbabilities =
        getRootyRestAntiRepeatProbabilities(
        // CHARACTER_V76_PERSONALITY_REST_RUNTIME
          applySelectedCharacterPersonalityToRestWeights(
          probabilities
        ),
          antiRepeatStateBefore
        );

      const behavior =
        pickRootyRestBehavior(
          antiRepeatProbabilities
        );

      // CHARACTER_V77_RUNTIME_REST_OBSERVATION
      recordCharacterFinalRestDecision(
        getSelectedCharacterSnapshot(),
        antiRepeatProbabilities,
        behavior
      );

      const antiRepeatStateAfter =
        getRootyNextRestAntiRepeatState(
          antiRepeatStateBefore,
          behavior
        );

      rootyRestAntiRepeatStateRef.current =
        antiRepeatStateAfter;

      if (__DEV__) {
        console.log(
          '[ROOTY V66] rest anti-repeat',
          {
            previousBehavior:
              antiRepeatStateBefore.behavior,
            streakBefore:
              antiRepeatStateBefore.streak,
            probabilitiesBefore:
              probabilities,
            probabilitiesAfter:
              antiRepeatProbabilities,
            behavior,
            streakAfter:
              antiRepeatStateAfter.streak,
          }
        );
      }

      if (__DEV__) {
        console.log(
          '[ROOTY V55] rest choice',
          {
            behavior,
            state,
            probabilities:
              antiRepeatProbabilities,
            conditionProbabilities:
              probabilities,
          }
        );

        console.log(
          '[ROOTY V60] rest policy',
          {
            energyCondition:
              condition.energy,
            baseProbabilities,
            probabilities:
              energyProbabilities,
            behavior,
          }
        );

        console.log(
          '[ROOTY V62] low mood rest policy',
          {
            moodCondition:
              condition.mood,
            energyCondition:
              condition.energy,
            energyProbabilities,
            probabilities,
            behavior,
          }
        );
      }

      if (
        behavior ===
        'lookAround'
      ) {
        startRootyLookAround();
        return;
      }

      if (
        behavior ===
        'sitRest'
      ) {
        startRootySitRest();
        return;
      }

      startRootyNapSequence();
    };

  if (
    !rootyReactingRef.current
  ) {
    later(
      startRootyWalkSession,
      rootyCycleKey === 0
        ? rootyResumeDelayRef.current
        : randomInt(
            ROOTY_NATURAL_BEHAVIOR.nextCycleDelayMinMs,
            ROOTY_NATURAL_BEHAVIOR.nextCycleDelayMaxMs
          )
    );
  }

  return () => {
    cancelled = true;

    timers.forEach(
      (timer) =>
        clearTimeout(
          timer
        )
    );
  };
}, [rootyCycleKey, rootyRuntimeReady, rootyAppActive, rootyHomeFocused]);

const handleRootyPress =
  () => {
    if (
      rootyReactingRef.current
    ) {
      return;
    }

    rootyReactingRef.current =
      true;

    applyRootyStateDelta(
      {
        mood: 2,
        affection: 1,
      },
      'tap'
    );

    const interactionCondition =
      rootyConditionRef.current;

    const bondedFollowUpChance =
      getRootyBondedTapFollowUpChance(
        interactionCondition
      );

    const bondedFollowUpRoll =
      Math.random();

    const shouldQueueBondedFollowUp =
      shouldQueueRootyBondedTapFollowUp(
        interactionCondition,
        bondedFollowUpRoll
      );

    rootyBondedTapFollowUpRef.current =
      shouldQueueBondedFollowUp;

    if (__DEV__) {
      console.log(
        '[ROOTY V63] affection interaction policy',
        {
          affectionCondition:
            interactionCondition.affection,
          chance:
            bondedFollowUpChance,
          roll:
            bondedFollowUpRoll,
          queued:
            shouldQueueBondedFollowUp,
        }
      );
    }

// ROOTY_BEHAVIOR_V9_TAP_FREEZE_REACTION
    cancelAnimation(
      foxX
    );

    cancelAnimation(
      foxY
    );

    rootyActionRef.current =
      'happy';

    const currentDirection =
      rootyDirectionRef.current;

    if (
      (
        currentDirection ===
          'upRight' ||
        currentDirection ===
          'upLeft'
      ) &&
      !hasRootyDirectionalFrames(
        'happy',
        currentDirection
      )
    ) {
      const fallbackDirection =
        currentDirection ===
        'upLeft'
          ? 'downLeft'
          : 'downRight';

      rootyDirectionRef.current =
        fallbackDirection;

      applyRootyDirection(
        fallbackDirection
      );
    }
applyRootyAction(
      'happy'
    );

    setRootyCycleKey(
      (current) =>
        current + 1
    );
  };

// ROOTY_BEHAVIOR_V53_LONG_PRESS_INTERACTION
const handleRootyLongPress =
  () => {
    if (
      rootyReactingRef.current
    ) {
      return;
    }

    rootyReactingRef.current =
      true;



    rootyBondedTapFollowUpRef.current =
      false;

    applyRootyStateDelta(
      {
        mood: 3,
        affection: 2,
      },
      'long-press'
    );
cancelAnimation(
      foxX
    );

    cancelAnimation(
      foxY
    );

    applyRootyAction(
      'touch'
    );

    setRootyCycleKey(
      (current) =>
        current + 1
    );
  };
const handleRootyAnimationEnd =
  (
    finishedAction:
      RootyAction
  ) => {

    if (
      finishedAction ===
        'happy' &&
      rootyBondedTapFollowUpRef.current
    ) {
      rootyBondedTapFollowUpRef.current =
        false;

      rootyActionRef.current =
        'touch';

      applyRootyAction(
        'touch'
      );

      if (__DEV__) {
        console.log(
          '[ROOTY V63] bonded follow-up touch',
          {
            affectionCondition:
              rootyConditionRef.current
                .affection,
          }
        );
      }

      return;
    }

    if (
      finishedAction !==
        'happy' &&
      finishedAction !==
        'touch'
    ) {
      return;
    }


    rootyBondedTapFollowUpRef.current =
      false;

    rootyReactingRef.current =
      false;

    rootyActionRef.current =
      'idle';

    applyRootyAction(
      'idle'
    );

    setRootyCycleKey(
      (current) =>
        current + 1
    );
  };

useEffect(() => {
  const requestNotificationPermission = async () => {
    const permission =
      await Notifications.getPermissionsAsync();

    if (
      permission.status !== 'granted'
    ) {
      const result =
        await Notifications.requestPermissionsAsync();

      console.log(
        'NOTIFICATION PERMISSION RESULT',
        result
      );
    }
  };

  requestNotificationPermission();
}, []);

const [buyCompleteModal, setBuyCompleteModal] =
  useState<any>(null);

const [saveCompleteModal, setSaveCompleteModal] =
  useState(false);

  const [sellCompleteModal, setSellCompleteModal] =
  useState<any>(null);

  const [noticeModal, setNoticeModal] =
  useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);

  const [villageModal, setVillageModal] =
    useState<string | null>(null);

    const [selectedShopTheme, setSelectedShopTheme] =
  useState('전체');

  const [selectedBagTheme, setSelectedBagTheme] =
  useState('전체');

  const [actionGoals, setActionGoals] =
    useState<any[]>(
      onboardingData?.actionGoals ?? []
    );

const [bagItems, setBagItems] =
  useState<any[]>(
    onboardingData?.bagItems ?? []
  );

const [
  explorationPoints,
  setExplorationPoints,
] =
  useState(0);

const [
  explorationMainBadgeId,
  setExplorationMainBadgeId,
] =
  useState<string | null>(
    null
  );

/*
 * 대표 탐험 뱃지 동기화
 *
 * 처리 순서:
 * 1. AsyncStorage 또는 ROOT 메모리의 뱃지를
 *    즉시 홈 화면에 표시합니다.
 *
 * 2. Firestore 서버 확인은
 *    화면 표시와 별도로 진행합니다.
 *
 * 3. 서버에는 rootData 전체가 아니라
 *    대표 탐험 뱃지 필드만 저장합니다.
 *
 * 4. 서버가 느려도 로컬 데이터와
 *    홈 화면은 영향을 받지 않습니다.
 */
useFocusEffect(
  useCallback(() => {
    let mounted = true;

    const normalizeBadgeId = (
      value: any
    ) => {
      const badgeId =
        String(
          value ?? ''
        ).trim();

      return badgeId
        ? badgeId
        : null;
    };

    /*
     * 대표뱃지를 현재 기기와
     * ROOT 로컬 데이터에 저장합니다.
     */
    const saveBadgeLocally =
      async (
        badgeId: string
      ) => {
        try {
          await AsyncStorage.setItem(
            EXPLORATION_MAIN_BADGE_KEY,
            badgeId
          );

          const currentRootData =
            getRootOnboardingData() ??
            {};

          const currentUser =
           firebaseAuth.currentUser;

          const nextRootData = {
            ...currentRootData,

            ...(currentUser?.uid
              ? {
                  uid:
                    currentUser.uid,
                }
              : {}),

            explorationMainBadgeId:
              badgeId,
          };

          await saveRootOnboardingData(
            nextRootData
          );

          setRootOnboardingData(
            nextRootData
          );

          if (mounted) {
            setExplorationMainBadgeId(
              badgeId
            );

            setOnboardingData(
              nextRootData
            );
          }

          console.log(
            'HOME EXPLORATION MAIN BADGE LOCAL SAVE DONE',
            {
              badgeId,
            }
          );
        } catch (error) {
          console.log(
            'HOME EXPLORATION MAIN BADGE LOCAL SAVE ERROR',
            error
          );
        }
      };

    /*
     * Firestore 서버와 대표뱃지만
     * 별도로 동기화합니다.
     *
     * 이 함수는 홈 화면 표시를
     * 기다리게 하지 않습니다.
     */
    const syncBadgeWithServer =
      async (
        preferredLocalBadgeId:
          | string
          | null
      ) => {
        const currentUser =
          firebaseAuth.currentUser;

        if (
          !currentUser?.uid
        ) {
          console.log(
            'HOME EXPLORATION MAIN BADGE SERVER SKIPPED: NO USER'
          );

          return;
        }

        const userRef =
  doc(
    firebaseDb,
    'users',
    currentUser.uid
  );

        try {
          console.log(
            'HOME EXPLORATION MAIN BADGE SERVER LOAD START',
            {
              uid:
                currentUser.uid,
            }
          );

          /*
           * 타임아웃을 따로 만들지 않습니다.
           *
           * 로컬 뱃지는 이미 화면에
           * 표시되었기 때문에 서버 응답이
           * 늦어도 사용자 화면은 멈추지 않습니다.
           */
          const userSnapshot =
  await getDoc(
    userRef
  );

          const userData =
            userSnapshot.data() ??
            {};

          /*
           * 새 방식의 최상위 필드를 먼저 보고,
           * 이전 방식의 rootData 내부 필드를
           * 두 번째로 확인합니다.
           */
          const serverBadgeId =
            normalizeBadgeId(
              userData
                ?.explorationMainBadgeId
            ) ??
            normalizeBadgeId(
              userData
                ?.rootData
                ?.explorationMainBadgeId
            );

          console.log(
            'HOME EXPLORATION MAIN BADGE SERVER LOAD DONE',
            {
              preferredLocalBadgeId,
              serverBadgeId,
            }
          );

          /*
           * 현재 기기에 대표뱃지가 있으면
           * 현재 기기의 선택을 우선합니다.
           */
          if (
            preferredLocalBadgeId
          ) {
            if (
              serverBadgeId !==
              preferredLocalBadgeId
            ) {
              const savedAt =
                new Date()
                  .toISOString();

              /*
               * rootData 전체를 보내지 않고
               * 대표뱃지 관련 필드만 보냅니다.
               *
               * merge: true이므로 기존 사용자
               * 데이터는 유지됩니다.
               */
              await setDoc(
  userRef,
  {
    explorationMainBadgeId:
      preferredLocalBadgeId,

    explorationMainBadgeUpdatedAt:
      savedAt,

    rootData: {
      explorationMainBadgeId:
        preferredLocalBadgeId,
    },

    updatedAt:
      savedAt,
  },
  {
    merge: true,
  }
);

              console.log(
                'HOME EXPLORATION MAIN BADGE SERVER SAVE DONE',
                {
                  badgeId:
                    preferredLocalBadgeId,
                }
              );
            } else {
              console.log(
                'HOME EXPLORATION MAIN BADGE SERVER ALREADY SAME',
                {
                  badgeId:
                    preferredLocalBadgeId,
                }
              );
            }

            console.log(
              'HOME EXPLORATION MAIN BADGE SYNC DONE',
              {
                finalBadgeId:
                  preferredLocalBadgeId,

                source:
                  'local',
              }
            );

            return;
          }

          /*
           * 현재 기기에 대표뱃지가 없고
           * 서버에만 있다면 새 기기 복원입니다.
           */
          if (
            serverBadgeId
          ) {
            await saveBadgeLocally(
              serverBadgeId
            );

            console.log(
              'HOME EXPLORATION MAIN BADGE RESTORED FROM SERVER',
              {
                badgeId:
                  serverBadgeId,
              }
            );

            console.log(
              'HOME EXPLORATION MAIN BADGE SYNC DONE',
              {
                finalBadgeId:
                  serverBadgeId,

                source:
                  'server',
              }
            );

            return;
          }

          console.log(
            'HOME EXPLORATION MAIN BADGE NOT SELECTED'
          );
        } catch (error) {
          /*
           * 서버 연결 실패와 무관하게
           * 로컬 대표뱃지는 계속 유지됩니다.
           */
          console.log(
            'HOME EXPLORATION MAIN BADGE SERVER SYNC ERROR: LOCAL BADGE KEPT',
            error
          );
        }
      };

    const startBadgeSync =
      async () => {
        console.log(
          'HOME EXPLORATION MAIN BADGE SYNC START'
        );

        let asyncStorageBadgeId:
          | string
          | null = null;

        try {
          asyncStorageBadgeId =
            normalizeBadgeId(
              await AsyncStorage.getItem(
                EXPLORATION_MAIN_BADGE_KEY
              )
            );
        } catch (error) {
          console.log(
            'HOME EXPLORATION MAIN BADGE LOCAL LOAD ERROR',
            error
          );
        }

        const currentRootData =
          getRootOnboardingData() ??
          {};

        const memoryBadgeId =
          normalizeBadgeId(
            currentRootData
              ?.explorationMainBadgeId
          );

        /*
         * 현재 기기에서는
         * AsyncStorage 값을 가장 우선합니다.
         */
        const localBadgeId =
          asyncStorageBadgeId ??
          memoryBadgeId ??
          null;

        /*
         * 서버를 기다리지 않고
         * 로컬 대표뱃지를 즉시 표시합니다.
         */
        if (
          mounted
        ) {
          setExplorationMainBadgeId(
            localBadgeId
          );
        }

        console.log(
          'HOME EXPLORATION MAIN BADGE LOCAL APPLIED',
          {
            asyncStorageBadgeId,
            memoryBadgeId,
            localBadgeId,
          }
        );

        /*
         * AsyncStorage에는 있지만
         * ROOT 데이터에 없다면
         * ROOT 로컬 데이터에도 보완합니다.
         */
        if (
          localBadgeId &&
          memoryBadgeId !==
            localBadgeId
        ) {
          await saveBadgeLocally(
            localBadgeId
          );
        }

        /*
         * 서버 동기화는 화면 표시와
         * 별도로 실행합니다.
         */
        void syncBadgeWithServer(
          localBadgeId
        );
      };

    void startBadgeSync();

    return () => {
      /*
       * 화면을 벗어난 뒤에는
       * React 상태만 변경하지 않습니다.
       *
       * 이미 시작된 서버 저장은
       * 끝까지 진행할 수 있습니다.
       */
      mounted = false;
    };
  }, [])
);

const [
  originalPlacedBuildings,
  setOriginalPlacedBuildings,
] =
  useState<any[]>([]);

const [placedBuildings, setPlacedBuildings] =
  useState<any[]>(
    placedBuildingsRef.current
  );

const applyPlacedBuildings = (
  nextPlacedBuildings: any[]
) => {
  // ROOTY_BEHAVIOR_V51_SKIP_UNCHANGED_VILLAGE_REAPPLY
  const previousPlacedBuildings =
    placedBuildingsRef.current;

  let hasSameVillageLayout =
    previousPlacedBuildings ===
    nextPlacedBuildings;

  if (
    !hasSameVillageLayout &&
    previousPlacedBuildings.length ===
      nextPlacedBuildings.length
  ) {
    try {
      hasSameVillageLayout =
        JSON.stringify(
          previousPlacedBuildings
        ) ===
        JSON.stringify(
          nextPlacedBuildings
        );
    } catch {
      hasSameVillageLayout =
        false;
    }
  }

  if (hasSameVillageLayout) {
    return;
  }

  // ROOTY_BEHAVIOR_V33_RUNTIME_STRESS_TRACING
  logRootyDebugEvent(
    'village-layout-edit',
    {
      previousCount:
        placedBuildingsRef.current.length,
      nextCount:
        nextPlacedBuildings.length,
      action:
        rootyActionRef.current,
      direction:
        rootyDirectionRef.current,
      x:
        foxX.value,
      y:
        foxY.value,
      cycleKey:
        rootyCycleKey,
    }
  );

  placedBuildingsRef.current =
    nextPlacedBuildings;

  setPlacedBuildings(
    nextPlacedBuildings
  );

  // ROOTY_BEHAVIOR_V26_LIVE_EDIT_ROUTINE_RESTART
  setRootyCycleKey(
    (current) =>
      current + 1
  );
};

// ROOTY_BEHAVIOR_V25_LIVE_POSITION_RECONCILIATION
useEffect(() => {
  if (!rootyRuntimeReady) {
    return;
  }

  const currentX =
    foxX.value;

  const currentY =
    foxY.value;

  const needsRelocation =
    isFoxOutsideVillage(
      currentX,
      currentY
    ) ||
    isFoxBlockedByBuilding(
      currentX,
      currentY
    );

  if (!needsRelocation) {
    return;
  }

  const safePosition =
    findSafeRootyPosition(
      currentX,
      currentY
    );

  if (!safePosition) {
    return;
  }

  logRootyDebugEvent(
    'rooty-relocated',
    {
      fromX:
        currentX,
      fromY:
        currentY,
      toX:
        safePosition.x,
      toY:
        safePosition.y,
      action:
        rootyActionRef.current,
      direction:
        rootyDirectionRef.current,
      cycleKey:
        rootyCycleKey,
    }
  );

  cancelAnimation(
    foxX
  );

  cancelAnimation(
    foxY
  );

  foxX.value =
    safePosition.x;

  foxY.value =
    safePosition.y;

  rootyActionRef.current =
    'idle';

  applyRootyAction(
    'idle'
  );

  void saveRootyRuntimeSnapshot({
    x:
      safePosition.x,
    y:
      safePosition.y,
    direction:
      rootyDirectionRef.current,
    action:
      'idle',
  });
}, [
  placedBuildings,
  rootyRuntimeReady,
]);


const [placingItem, setPlacingItem] = useState<any>(null);

const [previewGrid, setPreviewGrid] = useState({
  col: 5,
  row: 5,
});
const [dragStart, setDragStart] = useState<any>(null);

const [editingPlacedId, setEditingPlacedId] = useState<number | null>(null);
const [isPlacingFromBag, setIsPlacingFromBag] = useState(false);
const [villageLayout, setVillageLayout] = useState({
  x: 0,
  y: 0,
});

const [isEditMode, setIsEditMode] =
  useState(false);
const oneFingerPanGesture = Gesture.Pan()
  .enabled(!isEditMode && !placingItem)
  .minPointers(1)
  .maxPointers(1)
  .onUpdate((event) => {
  const nextX =
    savedTranslateX.value + event.translationX;

  const nextY =
    savedTranslateY.value + event.translationY;

  translateX.value = clampCamera(
    nextX,
    -700,
    260
  );

  translateY.value = clampCamera(
    nextY,
    -150,
    200
  );
})
  .onEnd(() => {
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  });

const twoFingerPanGesture = Gesture.Pan()
  .enabled(isEditMode || !!placingItem)
  .minPointers(2)
  .onUpdate((event) => {
  const nextX =
    savedTranslateX.value + event.translationX;

  const nextY =
    savedTranslateY.value + event.translationY;

  translateX.value = clampCamera(
    nextX,
    -100,
    200
  );

  translateY.value = clampCamera(
    nextY,
    -150,
    200
  );
})
  .onEnd(() => {
    savedTranslateX.value = translateX.value;
    savedTranslateY.value = translateY.value;
  });

const composedGesture =
  isEditMode
    ? Gesture.Simultaneous(
        pinchGesture,
        twoFingerPanGesture
      )
    : Gesture.Simultaneous(
        pinchGesture,
        oneFingerPanGesture
      );

useFocusEffect(
  useCallback(() => {
    const loadCalorieWeight = async () => {
      try {
        const rawProfile = await AsyncStorage.getItem(
          'daily_calorie_profile_v1'
        );

        const profile = rawProfile ? JSON.parse(rawProfile) : null;
        const weight = Number(profile?.weight) || 60;

        setCalorieWeight(weight);
      } catch (e) {
        console.log('CALORIE WEIGHT LOAD ERROR', e);
        setCalorieWeight(60);
      }
    };

    loadCalorieWeight();
  }, [])
);

  useFocusEffect(
  useCallback(() => {
    const data = getRootOnboardingData();

    if (data?.forceLogout || (!data?.email && !data?.guest)) {
  router.replace('/');
  return;
}

    setOnboardingData(data);

    setActionGoals(
      data?.actionGoals ?? []
    );
    setBagItems(data?.bagItems ?? []);
applyPlacedBuildings(data?.placedBuildings ?? []);
if (data?.runningTimer?.goalId && data?.runningTimer?.startedAt) {
  setRunningGoalId(data.runningTimer.goalId);
  setTimerStartAt(data.runningTimer.startedAt);
  setGpsEnabled(data.runningTimer.gpsEnabled ?? false);

  const seconds = Math.floor(
    (Date.now() - new Date(data.runningTimer.startedAt).getTime()) / 1000
  );

  setTimerSeconds(seconds);

  }
  }, [])
);

  const todayIndex = getTodayIndex();

  const selectedResultGoal =
    onboardingData?.goals?.find(
      (goal: any) =>
        goal.category === selectedCategory
    );

  const goalEndInfo = selectedResultGoal
    ? getGoalEndInfo(selectedResultGoal)
    : null;

const updateRootWidgetData = async () => {
  await syncRootWidgetData();
};

useEffect(() => {
  updateRootWidgetData();
}, [actionGoals, runningGoalId]);

useFocusEffect(
  useCallback(() => {
    updateRootWidgetData();
  }, [actionGoals, runningGoalId])
);

  const filteredActionGoals =
    actionGoals.filter(
      (goal) =>
        goal.category === selectedCategory
    );

    const isTimerGoal = (goal: any) =>
  goal.type === '시간기록형' ||
  goal.type === 'timer';

const currentRunningTimer =
  onboardingData?.runningTimer ??
  getRootOnboardingData()?.runningTimer ??
  null;

const isRunningGoal = (goal: any) =>
  String(runningGoalId) === String(goal.id) ||
  String(currentRunningTimer?.goalId ?? '') === String(goal.id);

  const getActiveRunningGoalId = () => {
  const latestData =
    getRootOnboardingData() ?? onboardingData;

  return (
    runningGoalId ??
    latestData?.runningTimer?.goalId ??
    currentRunningTimer?.goalId ??
    null
  );
};

const isAnotherTimerRunning = (goal: any) => {
  const activeGoalId = getActiveRunningGoalId();

  if (!activeGoalId) return false;

  return String(activeGoalId) !== String(goal.id);
};

const getRunningGoalTitle = () => {
  const activeGoalId = getActiveRunningGoalId();

  const latestData =
    getRootOnboardingData() ?? onboardingData;

  const goals =
    latestData?.actionGoals ?? actionGoals;

  const runningGoal = goals.find(
    (item: any) =>
      String(item.id) === String(activeGoalId)
  );

  return runningGoal?.title ?? '다른 목표';
};

  const totalXp = useMemo(() => {
    return actionGoals.reduce(
      (sum, goal) =>
        sum +
        (goal.completedDays?.length ?? 0) * 10,
      0
    );
  }, [actionGoals]);

  const currentLevel =
    Math.floor(totalXp / 30) + 1;

  const currentXpInLevel =
    totalXp % 30;

    const mainBadge =
  ROOT_BADGES.find(
    (badge) => badge.id === getRootMainBadgeId()
  );

const explorationMainBadgeTitle =
  explorationMainBadgeId
    ? EXPLORATION_THEME_BADGE_NAMES[
        explorationMainBadgeId
      ] ?? null
    : null;

   const categoryStats = useMemo(() => {
  const stats: any = {};

  categories.forEach((category) => {
    const categoryXp = actionGoals
      .filter((goal) => goal.category === category.id)
      .reduce((sum, goal) => {
        const count = goal.completedDays?.length ?? 0;
        return sum + count * calculateExp(goal);
      }, 0);

    stats[category.id] = {
      xp: categoryXp,
      level: Math.floor(categoryXp / 30) + 1,
      currentXp: categoryXp % 30,
    };
  });

  return stats;
}, [actionGoals]);

const totalPoints =
  useMemo(() => {
    const earnedPoints =
      actionGoals.reduce(
        (
          sum,
          goal
        ) =>
          sum +
          (
            goal
              .completedDays
              ?.length ??
            0
          ) *
            5,
        0
      );

    const pointAdjustment =
      Number(
        onboardingData
          ?.testPoints ??
          0
      ) || 0;

    return Math.max(
      0,
      earnedPoints +
        explorationPoints +
        pointAdjustment
    );
  }, [
    actionGoals,
    onboardingData,
    explorationPoints,
  ]);

  const bagGroups = useMemo(() => {
  const groups: any[] = [];

  bagItems.forEach((item) => {
    const found = groups.find((g) => g.id === item.id);

    if (found) {
      found.count += 1;
      found.items.push(item);
    } else {
      groups.push({
        ...item,
        count: 1,
        items: [item],
      });
    }
  });

  return groups;
}, [bagItems]);

  useEffect(() => {
  if (runningGoalId === null || !timerStartAt) return;

  const timer = setInterval(() => {
    const seconds = Math.floor(
      (Date.now() - new Date(timerStartAt).getTime()) / 1000
    );

    setTimerSeconds(seconds);
    if (seconds > 0 && seconds % 60 === 0) {
  const goal = actionGoals.find(
  (item) => String(item.id) === String(runningGoalId)
);

  showTimerNotification(
    goal?.title ?? '시간기록형 목표',
    seconds,
    gpsDistanceKm,
    gpsEnabled
  );
}
  }, 1000);

  return () => clearInterval(timer);
}, [
  runningGoalId,
  timerStartAt,
  actionGoals,
  gpsDistanceKm,
  gpsEnabled,
]);

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;

  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

 const showTimerNotification = async (
  title: string,
  seconds = 0,
  distanceKm = 0,
  useGps = false
) => {

  console.log('SHOW TIMER NOTIFICATION CALLED', title);

  const permission =
    await Notifications.requestPermissionsAsync();

  console.log('NOTIFICATION PERMISSION', permission);

  if (!permission.granted) {
    throw new Error('알림 권한이 허용되지 않았습니다.');
  }

const channelId = 'root-timer-v2';

await Notifications.setNotificationChannelAsync(channelId, {
  name: '루트 시간 기록',
  importance: Notifications.AndroidImportance.HIGH,
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250],
  lockscreenVisibility:
    Notifications.AndroidNotificationVisibility.PUBLIC,
});

if (timerNotificationIdRef.current) {
  await Notifications.dismissNotificationAsync(
    timerNotificationIdRef.current
  );
}

const id = await Notifications.scheduleNotificationAsync({
  content: {
    title: '⏱️ 루트 시간 기록 중',
    body:
      `${title}\n` +
      `${formatTime(seconds)}` +
      `${useGps ? ` · ${distanceKm.toFixed(2)}km` : ''}`,
    sound: 'default',
    priority: Notifications.AndroidNotificationPriority.HIGH,
    channelId,
  } as any,
  trigger: null,
});

timerNotificationIdRef.current = id;
};

const cancelTimerNotification = async () => {
  if (!timerNotificationIdRef.current) return;

  await Notifications.dismissNotificationAsync(
    timerNotificationIdRef.current
  );

  timerNotificationIdRef.current = null;
};

  const saveTimeGoalToDayRecords = async (
  title: string,
  startAt: string,
  endAt: string
) => {
  const raw = await AsyncStorage.getItem('daily_time_records_v1');
  const records = raw ? JSON.parse(raw) : {};

  const start = new Date(startAt);
  const end = new Date(endAt);

  let cursor = new Date(start);

  while (cursor < end) {
    const dateKey = formatDateKey(cursor);

    const h24 = cursor.getHours();
    const mStr = cursor.getMinutes() < 30 ? '00' : '30';

    const key = `${
      h24 < 12 ? '낮' : '저녁'
    }_${h24 % 12 === 0 ? 12 : h24 % 12}_${mStr}`;

    records[dateKey] = {
      ...(records[dateKey] ?? {}),
      [key]: title,
    };

    cursor.setMinutes(cursor.getMinutes() < 30 ? 30 : 60);
  }

  await AsyncStorage.setItem(
    'daily_time_records_v1',
    JSON.stringify(records)
  );
};

const addExerciseCaloriesToDay =
  async ({
    calories,
    minutes,
    title,
    targetDateKey,
    goalId,
    recordId,
  }: {
    calories: number;
    minutes: number;
    title: string;
    targetDateKey: string;
    goalId:
      | string
      | number;
    recordId: string;
  }) => {
    const safeCalories =
      Math.max(
        0,
        Math.round(
          Number(
            calories
          ) || 0
        )
      );

    if (
      safeCalories <= 0
    ) {
      return 0;
    }

    const [
      totalsRaw,
      logsRaw,
    ] =
      await Promise.all([
        AsyncStorage.getItem(
          'daily_exercise_calories_v1'
        ),

        AsyncStorage.getItem(
          EXERCISE_CALORIE_LOGS_KEY
        ),
      ]);

    const savedTotals:
      Record<
        string,
        number
      > =
      totalsRaw
        ? JSON.parse(
            totalsRaw
          )
        : {};

    const savedLogs:
      any[] =
      logsRaw
        ? JSON.parse(
            logsRaw
          )
        : [];

    /*
     * 같은 홈 기록이
     * 두 번 저장되는 것을
     * 방지합니다.
     */
    const existingLog =
      savedLogs.find(
        (log: any) =>
          String(
            log?.recordId ??
              ''
          ) ===
          String(
            recordId
          )
      );

    if (existingLog) {
      return (
        Number(
          existingLog.calories
        ) || 0
      );
    }

    const nextTotals = {
      ...savedTotals,

      [targetDateKey]:
        (
          savedTotals[
            targetDateKey
          ] ?? 0
        ) +
        safeCalories,
    };

    const nextLog = {
      id:
        `timer_${recordId}`,

      date:
        targetDateKey,

      title:
        title.trim() ||
        '운동',

      calories:
        safeCalories,

      source:
        'timer' as const,

      durationMinutes:
        Math.max(
          0,
          Math.round(
            minutes
          )
        ),

      goalId:
        String(
          goalId
        ),

      recordId:
        String(
          recordId
        ),
    };

    const nextLogs = [
      nextLog,
      ...savedLogs,
    ];

    /*
     * 합계와 목록을 함께
     * 로컬에 저장합니다.
     */
    await AsyncStorage.multiSet(
      [
        [
          'daily_exercise_calories_v1',
          JSON.stringify(
            nextTotals
          ),
        ],

        [
          EXERCISE_CALORIE_LOGS_KEY,
          JSON.stringify(
            nextLogs
          ),
        ],
      ]
    );

    console.log(
      'DAY EXERCISE CALORIE SAVE DONE',
      {
        date:
          targetDateKey,

        title:
          nextLog.title,

        minutes:
          nextLog.durationMinutes,

        calories:
          safeCalories,

        recordId,
      }
    );

    return safeCalories;
  };

  const getDistanceKm = (a: any, b: any) => {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return R * y;
};

  const startTimerGoal = (
  id: string | number
) => {
  const activeGoalId = getActiveRunningGoalId();

  if (
    activeGoalId &&
    String(activeGoalId) !== String(id)
  ) {
    setNoticeModal({
      title: '이미 기록 중인 목표가 있어요',
      message:
        `${getRunningGoalTitle()} 기록을 먼저 종료한 뒤 ` +
        '다른 시간기록을 시작할 수 있어요.',
    });

    return;
  }

  setGpsModalGoalId(id);
};

const confirmStartTimer = async (
  id: string | number,
  useGps = false
) => {
  console.log('CONFIRM START TIMER CALLED', id, useGps);

  const activeGoalId = getActiveRunningGoalId();

  if (
    activeGoalId &&
    String(activeGoalId) !== String(id)
  ) {
    setGpsModalGoalId(null);

    setNoticeModal({
      title: '이미 기록 중인 목표가 있어요',
      message:
        `${getRunningGoalTitle()} 기록을 먼저 종료한 뒤 ` +
        '다른 시간기록을 시작할 수 있어요.',
    });

    return;
  }

  setGpsModalGoalId(null);

  const startedAt = new Date().toISOString();

  const goal = actionGoals.find(
    (item) => String(item.id) === String(id)
  );

  console.log('TIMER GOAL FOUND', goal?.title);

  let finalUseGps = useGps;

  if (useGps) {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setNoticeModal({
        title: '위치 권한 필요',
        message:
          'GPS 기록을 사용하려면 위치 권한이 필요해요. GPS 없이 시간을 기록할게요.',
      });

      finalUseGps = false;
    }
  }

  try {
    await showTimerNotification(
      goal?.title ?? '시간기록형 목표',
      0,
      0,
      finalUseGps
    );

    console.log('TIMER NOTIFICATION SHOWN');
  } catch (e) {
    console.log('TIMER NOTIFICATION ERROR', e);

    setNoticeModal({
      title: '알림 생성 실패',
      message: String(e),
    });
  }

  setRunningGoalId(id);
  setTimerSeconds(0);
  setTimerStartAt(startedAt);

  const currentData = getRootOnboardingData() ?? onboardingData;

  const next = {
    ...currentData,
    runningTimer: {
      goalId: id,
      startedAt,
      gpsEnabled: finalUseGps,
    },
  };

  await saveRootData(next);

  await updateRootWidgetData();

  console.log(
    'RUNNING TIMER SAVED',
    getRootOnboardingData()?.runningTimer
  );

  setGpsEnabled(finalUseGps);
  setGpsDistanceKm(0);
  setGpsCoordinates([]);

  if (!finalUseGps) return;

  try {
    const firstLocation =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

    const firstPoint = {
      latitude: firstLocation.coords.latitude,
      longitude: firstLocation.coords.longitude,
      timestamp: firstLocation.timestamp,
    };

    console.log('GPS FIRST POINT', firstPoint);

    setGpsCoordinates([firstPoint]);

    const subscription =
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (location) => {
          const point = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
          };

          console.log('GPS POINT', point);

          setGpsCoordinates((prev: any[]) => {
            if (prev.length === 0) {
              return [point];
            }

            const last = prev[prev.length - 1];
            const addedDistance = getDistanceKm(last, point);

            console.log('GPS ADDED DISTANCE', addedDistance);

            if (addedDistance < 0.005) {
              return prev;
            }

            setGpsDistanceKm((distance: number) =>
              Number((distance + addedDistance).toFixed(3))
            );

            return [...prev, point];
          });
        }
      );

    console.log('GPS WATCH STARTED');

    setLocationSubscription(subscription);
  } catch (e) {
    console.log('GPS START ERROR', e);

    setGpsEnabled(false);

    const currentData =
      getRootOnboardingData() ?? onboardingData;

    const next = {
      ...currentData,
      runningTimer: {
        goalId: id,
        startedAt,
        gpsEnabled: false,
      },
    };

    await saveRootData(next);
    await updateRootWidgetData();

    setNoticeModal({
      title: 'GPS 시작 실패',
      message:
        '위치 정보를 가져오지 못했어요. GPS 없이 시간만 기록할게요.',
    });
  }
};

const stopTimerGoal = async (
  id: string | number
) => {
  const goal =
    actionGoals.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

  console.log(
    'TIMER STOP PRESSED',
    {
      requestedGoalId:
        String(id),

      foundGoalId:
        goal?.id ?? null,

      title:
        goal?.title ?? null,

      category:
        goal?.category ?? null,

      type:
        goal?.type ?? null,

      timerStartAt,
      timerSeconds,
    }
  );

  if (!goal) {
    console.log(
      'TIMER STOP FAILED: GOAL NOT FOUND',
      id
    );

    setNoticeModal({
      title: '기록 종료 실패',
      message:
        '시간기록 중인 행동목표를 찾지 못했어요.',
    });

    return;
  }

  /*
   * state를 초기화하기 전에
   * 시작 시각과 측정 시간을 복사합니다.
   */
  const savedTimerStartAt =
    timerStartAt;

  const seconds =
    savedTimerStartAt
      ? Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              new Date(
                savedTimerStartAt
              ).getTime()
            ) / 1000
          )
        )
      : Math.max(
          0,
          timerSeconds
        );

  const minutes =
    Math.max(
      1,
      Math.ceil(
        seconds / 60
      )
    );

  try {
    if (
      locationSubscription
    ) {
      locationSubscription.remove();
    }
  } catch (error) {
    console.log(
      'GPS STOP ERROR',
      error
    );
  }

  setLocationSubscription(
    null
  );

  setRunningGoalId(
    null
  );

  setTimerSeconds(
    0
  );

  /*
   * 여기에서는 timerStartAt을
   * null로 만들면 안 됩니다.
   *
   * saveCompleteRecord가 시작 시각을
   * 사용한 뒤 초기화해야 합니다.
   */

  void cancelTimerNotification()
    .catch((error) => {
      console.log(
        'TIMER NOTIFICATION CANCEL ERROR',
        error
      );
    });

  const currentData =
    getRootOnboardingData() ??
    onboardingData ??
    {};

  const nextData = {
    ...currentData,
    runningTimer: null,
  };

  try {
    /*
     * Firestore를 기다리지 않고
     * 실행 중 상태만 로컬에 먼저 저장합니다.
     */
    await saveRootOnboardingData(
      nextData
    );

    setOnboardingData(
      nextData
    );

    console.log(
      'TIMER STOP LOCAL STATE SAVED',
      {
        goalId:
          goal.id,

        title:
          goal.title,

        minutes,
      }
    );
  } catch (error) {
    console.log(
      'TIMER STOP LOCAL STATE SAVE ERROR',
      error
    );

    /*
     * 실행 상태 저장에 실패하더라도
     * 기록 저장 모달은 열어줍니다.
     */
  }

  /*
   * 위젯 동기화보다 기록 저장 모달을
   * 먼저 엽니다.
   */
  openRecordModal(
    goal,
    minutes
  );

  console.log(
    'TIMER RECORD MODAL OPEN',
    {
      goalId:
        goal.id,

      title:
        goal.title,

      category:
        goal.category,

      type:
        goal.type,

      minutes,

      startedAt:
        savedTimerStartAt,
    }
  );

  /*
   * 위젯 동기화는 모달을 막지 않도록
   * 뒤에서 실행합니다.
   */
  void updateRootWidgetData()
    .catch((error) => {
      console.log(
        'TIMER STOP WIDGET SYNC ERROR',
        error
      );
    });
};

  const openRecordModal = (goal: any, minutes = 0) => {
  setPendingCompleteGoal(goal);
  setPendingMinutes(minutes);
  setSelectedPhoto(null);
  setDecoratedPhotoUri(null);
  setRecordMemo('');
  setFocusRating(5);
  setDecorateStickers([]);
  setDecorateModalVisible(false);
  setShowCustomStickerModal(false);
  setCustomStickerText('');
  setRecordModalVisible(true);
};

const pickPhotoFromGallery = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
  setSelectedPhoto(result.assets[0]);
    setDecoratedPhotoUri(null);
  setDecorateStickers([]);
}
};

const takePhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    setNoticeModal({
  title: '카메라 권한 필요',
  message:
    '사진을 찍으려면 카메라 권한이 필요해요.',
});
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
  setSelectedPhoto(result.assets[0]);
  setDecoratedPhotoUri(null);
  setDecorateStickers([]);
}
};

const isDecorateTimerGoal = () => {
  return (
    pendingCompleteGoal?.type === '시간기록형' ||
    pendingCompleteGoal?.type === 'timer' ||
    pendingMinutes > 0
  );
};

const getPreviewBurnedCalories = () => {
  const previewCategory =
  String(
    pendingCompleteGoal
      ?.category ??
      ''
  ).trim();

if (
  previewCategory !==
    'exercise' &&
  previewCategory !==
    '운동'
) {
  return 0;
}

  const met = Number(pendingCompleteGoal?.met ?? 0);
  const minutes = Number(pendingMinutes ?? 0);

  if (!met || !minutes) {
    return 0;
  }

  return Math.round(
    met * calorieWeight * (minutes / 60)
  );
};

const getDecoratePresetKey = () => {
  const category = pendingCompleteGoal?.category ?? 'daily';
  const isTimer = isDecorateTimerGoal();

  return `${category}_${isTimer ? 'timer' : 'check'}`;
};

const makeInitialDecorateStickers = () => {
  const now = Date.now();

  const category = pendingCompleteGoal?.category ?? 'daily';
  const presetKey = getDecoratePresetKey();

  const title = pendingCompleteGoal?.title ?? '기록';

  const base: DecorateSticker[] = [
    {
      id: `date_${now}`,
      type: 'date',
      text: formatDate(new Date()),
      x: 28,
      y: 64,
      size: 'small',
    },
    {
      id: `title_${now}`,
      type: 'title',
       text: title,
      x: 28,
      y: 108,
      size: 'medium',
    },
    {
      id: `root_${now}`,
      type: 'root',
      text: 'ROOT',
      x: 28,
       y: 450,
      size: 'small',
    },
  ];

  // 1. 운동 / 시간기록형
  if (presetKey === 'exercise_timer') {
   const previewCalories = getPreviewBurnedCalories();

  base.push(
    {
      id: `exercise_time_${now}`,
      type: 'time',
      text: formatRecordClockTime(pendingMinutes),
      x: 28,
      y: 160,
      size: 'large',
    },
    {
      id: `exercise_distance_${now}`,
      type: 'distance',
      text: `${gpsDistanceKm.toFixed(2)} km`,
      x: 28,
      y: 240,
      size: 'medium',
    },
    {
      id: `exercise_pace_${now}`,
      type: 'pace',
      text: `Pace ${formatPace(gpsDistanceKm, pendingMinutes)}`,
      x: 28,
      y: 292,
      size: 'medium',
    },
    {
      id: `exercise_calorie_${now}`,
      type: 'calorie',
      text:
  previewCalories > 0
    ? `${previewCalories} kcal`
    : '칼로리 계산중',
      x: 28,
      y: 344,
      size: 'medium',
    },
    {
      id: `exercise_badge_${now}`,
      type: 'pace',
      text: `운동 만족도 ${'★'.repeat(focusRating)}`,
      x: 28,
      y: 396,
      size: 'small',
    }
  );

  if (gpsCoordinates.length >= 2) {
    base.push({
      id: `exercise_route_${now}`,
      type: 'route',
      text: '',
      x: 125,
      y: 360,
      size: 'medium',
      route: true,
      points: makeRouteStickerPoints(gpsCoordinates),
    });
  }

  return base;
}

  // 2. 운동 / 확인형
  if (presetKey === 'exercise_check') {
    base.push(
      {
        id: `exercise_done_${now}`,
        type: 'time',
        text: '운동 완료',
        x: 28,
        y: 170,
        size: 'large',
      },
      {
        id: `exercise_condition_${now}`,
        type: 'pace',
        text: `몸 상태 ${'★'.repeat(focusRating)}`,
        x: 28,
        y: 255,
        size: 'medium',
      },
      {
        id: `exercise_message_${now}`,
        type: 'pace',
        text: '오늘도 움직였다',
        x: 28,
        y: 315,
        size: 'small',
      }
    );

    return base;
  }

  // 3. 공부 / 시간기록형
  if (presetKey === 'study_timer') {
    base.push(
      {
        id: `study_time_${now}`,
        type: 'time',
        text: formatRecordClockTime(pendingMinutes),
        x: 28,
        y: 160,
        size: 'large',
      },
      {
        id: `study_focus_${now}`,
        type: 'pace',
        text: `집중도 ${'★'.repeat(focusRating)}`,
        x: 28,
        y: 245,
        size: 'medium',
      },
      {
        id: `study_message_${now}`,
        type: 'pace',
        text: '깊게 공부한 시간',
        x: 28,
        y: 305,
        size: 'small',
      }
    );

    return base;
  }

  // 4. 공부 / 확인형
  if (presetKey === 'study_check') {
    base.push(
      {
        id: `study_done_${now}`,
        type: 'time',
        text: '공부 완료',
        x: 28,
        y: 170,
        size: 'large',
      },
      {
        id: `study_understand_${now}`,
        type: 'pace',
        text: `이해도 ${'★'.repeat(focusRating)}`,
        x: 28,
        y: 255,
        size: 'medium',
      },
      {
        id: `study_message_${now}`,
        type: 'pace',
        text: '하나 더 알게 된 날',
        x: 28,
        y: 315,
        size: 'small',
      }
    );

    return base;
  }

  // 5. 정신 / 시간기록형
  if (presetKey === 'mental_timer') {
    base.push(
      {
        id: `mental_time_${now}`,
        type: 'time',
        text: formatRecordClockTime(pendingMinutes),
        x: 28,
        y: 160,
        size: 'large',
      },
      {
        id: `mental_calm_${now}`,
        type: 'pace',
        text: `마음 안정 ${'★'.repeat(focusRating)}`,
        x: 28,
        y: 245,
        size: 'medium',
      },
      {
        id: `mental_message_${now}`,
        type: 'pace',
        text: '나를 돌본 시간',
        x: 28,
        y: 305,
        size: 'small',
      }
    );

    return base;
  }

  // 6. 정신 / 확인형
  if (presetKey === 'mental_check') {
    base.push(
      {
        id: `mental_done_${now}`,
        type: 'time',
        text: '마음 돌봄',
        x: 28,
        y: 170,
        size: 'large',
      },
      {
        id: `mental_stable_${now}`,
        type: 'pace',
        text: `안정감 ${'★'.repeat(focusRating)}`,
        x: 28,
        y: 255,
        size: 'medium',
      },
      {
        id: `mental_message_${now}`,
        type: 'pace',
        text: '잠깐 멈추고 숨을 골랐다',
        x: 28,
        y: 315,
        size: 'small',
      }
    );

    return base;
  }

  // 7. 일 / 시간기록형
  if (presetKey === 'daily_timer') {
    base.push(
      {
        id: `work_time_${now}`,
        type: 'time',
        text: formatRecordClockTime(pendingMinutes),
        x: 28,
        y: 160,
        size: 'large',
      },
      {
        id: `work_flow_${now}`,
        type: 'pace',
        text: `업무 몰입 ${'★'.repeat(focusRating)}`,
        x: 28,
        y: 245,
        size: 'medium',
      },
      {
        id: `work_message_${now}`,
        type: 'pace',
        text: '쌓아 올린 업무 시간',
        x: 28,
        y: 305,
        size: 'small',
      }
    );

    return base;
  }

  // 8. 일 / 확인형
  base.push(
    {
      id: `work_done_${now}`,
      type: 'time',
      text: '업무 완료',
      x: 28,
      y: 170,
      size: 'large',
    },
    {
      id: `work_complete_${now}`,
      type: 'pace',
      text: `완료감 ${'★'.repeat(focusRating)}`,
      x: 28,
      y: 255,
      size: 'medium',
    },
    {
      id: `work_message_${now}`,
      type: 'pace',
      text: '오늘의 할 일을 해냈다',
      x: 28,
      y: 315,
      size: 'small',
    }
  );

  return base;
};

const normalizeDecorateStickers = (
  stickers: DecorateSticker[]
): DecorateSticker[] => {
  return stickers.map((item) => ({
    id: String(item.id),
    type: item.type,
    text: item.text ?? '',
    x: Number(item.x ?? 28),
    y: Number(item.y ?? 120),
    scale: Number(item.scale ?? 1),
    size: item.size ?? 'medium',
    route: item.route ?? false,
    points: item.points ?? '',
  }));
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

const openDecorateModal = () => {
  if (!selectedPhoto?.uri) {
    setNoticeModal({
      title: '사진이 필요해요',
      message: '먼저 사진을 선택하거나 촬영해주세요.',
    });
    return;
  }

  if (decoratedPhotoUri && decorateStickers.length > 0) {
    setDecorateStickers(
      normalizeDecorateStickers(decorateStickers)
    );
  } else {
    setDecorateStickers(makeInitialDecorateStickers());
  }

  setShowCustomStickerModal(false);
  setCustomStickerText('');
  setDecorateModalVisible(true);
};

const saveDecoratedPhoto = async () => {
  if (!decorateCaptureRef.current) return;

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
      `${FileSystem.documentDirectory}decorated_${Date.now()}.jpg`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: savedUri,
    });

    setDecoratedPhotoUri(savedUri);
    setDecorateModalVisible(false);
    setShowCustomStickerModal(false);
    setCustomStickerText('');

    setNoticeModal({
      title: '꾸미기 완료',
      message: '꾸민 사진이 기록에 적용되었어요.',
    });
  } catch (e) {
    console.log('DECORATED PHOTO SAVE ERROR', e);

    setNoticeModal({
      title: '꾸미기 저장 실패',
      message: '사진을 저장하지 못했어요. 다시 시도해주세요.',
    });
  } finally {
    setIsDecorateSaving(false);
  }
};

const saveCompleteRecord = async (
  options?: {
    withoutPhoto?: boolean;
    manualCalories?: number;
    hideCompletionNotice?: boolean;
  }
) => {
  console.log(
    'SAVE COMPLETE RECORD START'
  );

  if (!pendingCompleteGoal) {
    console.log(
      'SAVE STOP: pendingCompleteGoal 없음'
    );
    return;
  }

  /*
   * 저장 중 state가 초기화돼도 사용할 수 있도록
   * 현재 입력값을 먼저 복사합니다.
   */
  const goal = pendingCompleteGoal;
  const minutes = pendingMinutes;
  const startedAt = timerStartAt;

const isExerciseGoal =
  [
    'exercise',
    '운동',
  ].includes(
    String(
      goal?.category ??
        ''
    ).trim()
  );


  const useGps = gpsEnabled;
  const distanceKm = gpsDistanceKm;
  const coordinates = [
    ...gpsCoordinates,
  ];

  const sourcePhotoUri =
    selectedPhoto?.uri ?? null;

  const finalDecoratedPhotoUri =
    decoratedPhotoUri;

  const stickerData =
    normalizeDecorateStickers(
      decorateStickers
    );

  const today =
    formatDateKey(new Date());

  const currentData =
    getRootOnboardingData() ??
    onboardingData ??
    {};

  const currentUser =
    firebaseAuth.currentUser;

  const currentActionGoals =
    currentData?.actionGoals ??
    actionGoals;

 const updatedActionGoals =
  currentActionGoals.map(
    (item: any) => {
      if (
        String(item.id) !==
        String(goal.id)
      ) {
        return item;
      }

      /*
       * 기존 홈·위젯 호환용 요일 데이터
       */
      const completedDays =
        Array.isArray(
          item.completedDays
        )
          ? item.completedDays
          : [];

      /*
       * 실제 완료 이력은 날짜로 저장합니다.
       */
      const completedDates =
        Array.isArray(
          item.completedDates
        )
          ? item.completedDates
          : [];

      return {
        ...item,

        completedDays:
          completedDays.includes(
            todayIndex
          )
            ? completedDays
            : [
                ...completedDays,
                todayIndex,
              ],

        completedDates:
          completedDates.includes(
            today
          )
            ? completedDates
            : [
                ...completedDates,
                today,
              ],
      };
    }
  );

  let routeImageUri:
    | string
    | null = null;

  if (
    useGps &&
    coordinates.length > 0 &&
    routeCaptureRef.current
  ) {
    try {
      await new Promise<void>(
        (resolve) => {
          setTimeout(
            () => resolve(),
            500
          );
        }
      );

      const tempUri =
        await captureRef(
          routeCaptureRef.current,
          {
            format: 'jpg',
            quality: 0.9,
            result: 'tmpfile',
          }
        );

      const savedUri =
        `${FileSystem.documentDirectory}` +
        `route_${Date.now()}.jpg`;

      await FileSystem.copyAsync({
        from: tempUri,
        to: savedUri,
      });

      routeImageUri =
        savedUri;

      console.log(
        'ROUTE IMAGE SAVED',
        routeImageUri
      );
    } catch (error) {
      console.log(
        'ROUTE SNAPSHOT ERROR',
        error
      );
    }
  }

  let logBurnedCalories = 0;

  if (
  isExerciseGoal &&
  Number(
    goal.met
  ) > 0 &&
  minutes > 0
) {
    try {
      const rawProfile =
        await AsyncStorage.getItem(
          'daily_calorie_profile_v1'
        );

      const profile =
        rawProfile
          ? JSON.parse(rawProfile)
          : null;

      const weight =
        Number(profile?.weight) ||
        60;

      logBurnedCalories =
        Math.round(
          Number(goal.met) *
            weight *
            (minutes / 60)
        );
    } catch (error) {
      console.log(
        'RECORD CALORIE CALC ERROR',
        error
      );
    }
  }

  if (
  isExerciseGoal &&
  options?.manualCalories !== undefined
) {
  logBurnedCalories =
    Math.max(
      0,
      Math.round(
        Number(
          options.manualCalories
        ) || 0
      )
    );
}

  const logId =
    Date.now().toString();

  const ownerId =
    currentUser?.uid ??
    currentData?.guestId ??
    null;

  const log = {
    id: logId,

    ...(ownerId
      ? {
          userId:
            currentUser?.uid ??
            `guest:${String(
              currentData.guestId
            )}`,
        }
      : {}),

    action_goal_id:
      goal.id,

    goal_id:
      selectedResultGoal?.id ??
      null,

    category:
      goal.category,

    action_title:
      goal.title,

    date:
      today,

    completed:
      true,

    duration_minutes:
      minutes,

    burned_calories:
      logBurnedCalories,

    calories:
      logBurnedCalories,

    gps_enabled:
      useGps,

    distance_km:
      useGps
        ? distanceKm
        : null,

    route_coordinates:
      useGps
        ? coordinates
        : null,

    route_image_uri:
      routeImageUri,

    routeImageUri,

    original_photo_url:
      options?.withoutPhoto
        ? null
        : sourcePhotoUri,

    originalPhotoUri:
      options?.withoutPhoto
        ? null
        : sourcePhotoUri,

    photo_url:
      options?.withoutPhoto
        ? null
        : finalDecoratedPhotoUri ??
          sourcePhotoUri,

    photoUri:
      options?.withoutPhoto
        ? null
        : finalDecoratedPhotoUri ??
          sourcePhotoUri,

    decorated_photo_url:
      options?.withoutPhoto
        ? null
        : finalDecoratedPhotoUri,

    decoratedPhotoUri:
      options?.withoutPhoto
        ? null
        : finalDecoratedPhotoUri,

    decorate_stickers:
      options?.withoutPhoto
        ? []
        : stickerData,

    decorateStickers:
      options?.withoutPhoto
        ? []
        : stickerData,

    decorate_updated_at:
      !options?.withoutPhoto &&
      finalDecoratedPhotoUri
        ? new Date()
            .toISOString()
        : null,

    memo:
      recordMemo.trim(),

    focusRating,

    pace:
      useGps &&
      distanceKm > 0
        ? formatPace(
            distanceKm,
            minutes
          )
        : null,

    speed_kmh:
      useGps &&
      distanceKm > 0
        ? calculateSpeedKmh(
            distanceKm,
            minutes
          )
        : null,
  };

  const nextActionLogs = [
    log,
    ...(currentData?.actionLogs ??
      []),
  ];

 /*
 * 행동 기록을 저장하면서
 * rootData 전체가 교체되므로
 * 대표 탐험 뱃지도 함께 넣습니다.
 */
let savedExplorationMainBadgeId:
  | string
  | null = null;

try {
  const localBadgeId =
    await AsyncStorage.getItem(
      EXPLORATION_MAIN_BADGE_KEY
    );

  savedExplorationMainBadgeId =
    String(
      localBadgeId ??
      currentData
        ?.explorationMainBadgeId ??
      ''
    ).trim() ||
    null;
} catch (error) {
  console.log(
    'RECORD EXPLORATION MAIN BADGE LOAD ERROR',
    error
  );

  savedExplorationMainBadgeId =
    String(
      currentData
        ?.explorationMainBadgeId ??
      ''
    ).trim() ||
    null;
}

const next =
  removeUndefined({
    ...currentData,

    ...(currentUser?.uid
      ? {
          uid:
            currentUser.uid,
        }
      : {}),

    ...(savedExplorationMainBadgeId
      ? {
          explorationMainBadgeId:
            savedExplorationMainBadgeId,
        }
      : {}),

    actionGoals:
      updatedActionGoals,

    actionLogs:
      nextActionLogs,
  });

  try {
    /*
     * 가장 중요한 부분:
     * 완료 표시보다 기록 데이터를 먼저
     * AsyncStorage에 확실하게 저장합니다.
     */
    await saveRootOnboardingData(
      next
    );

    setOnboardingData(next);
    setActionGoals(
      updatedActionGoals
    );

    console.log(
      'LOCAL RECORD SAVE DONE',
      {
        logId,
        actionLogCount:
          nextActionLogs.length,
      }
    );
  } catch (error) {
    console.error(
      'LOCAL RECORD SAVE ERROR',
      error
    );

    setNoticeModal({
      title: '기록 저장 실패',
      message:
        '기록을 기기에 저장하지 못했어요.\n' +
        '다시 시도해주세요.',
    });

    return;
  }

  /*
 * 하루 탭으로 이동하기 전에
 * 운동 칼로리를 먼저 저장합니다.
 */
if (
  isExerciseGoal &&
  logBurnedCalories >
    0
  ) {
  try {
    await addExerciseCaloriesToDay({
      calories:
        logBurnedCalories,

      minutes,

      title:
        String(
          goal.title ??
            '운동'
        ),

      targetDateKey:
        today,

      goalId:
        goal.id,

      recordId:
        logId,
    });
  } catch (error) {
    console.log(
      'DAY EXERCISE CALORIE SAVE ERROR',
      error
    );
  }
}

/*
 * 기록이 로컬에 저장된 즉시
 * 뱃지를 계산합니다.
 *
 * Firestore·하루 기록·위젯 동기화가
 * 늦어져도 뱃지 획득은 막히지 않습니다.
 */
void checkBadgeReward()
  .then((newBadges) => {
    console.log(
      'LOCAL BADGE CHECK COMPLETE',
      {
        newBadgeCount:
          newBadges.length,

        newBadgeIds:
          newBadges.map(
            (badge) => badge.id
          ),
      }
    );
  })
  .catch((error) => {
    console.log(
      'LOCAL BADGE CHECK ERROR',
      error
    );
  });

  const rewardXp =
    calculateExp(goal);

  const rewardPoint = 5;

  const completionNotice =
  isExerciseGoal
      ? {
          title:
            `✅ ${goal.title} 완료!`,

          message:
            `+${rewardXp} XP\n` +
            `+${rewardPoint} 포인트\n\n` +
            `${
              minutes > 0
                ? `운동 시간: ${minutes}분\n`
                : ''
            }` +
            `${
              useGps
                ? `이동 거리: ${distanceKm.toFixed(
                    2
                  )}km\n`
                : ''
            }` +
            `예상 소모 칼로리: ` +
            `${logBurnedCalories}kcal`,
        }
      : {
          title:
            `✅ ${goal.title} 완료!`,

          message:
            `+${rewardXp} XP\n` +
            `+${rewardPoint} 포인트\n\n` +
            `오늘도 한 걸음 성장했어요.`,
        };

  /*
   * 로컬 기록 저장이 끝났으므로
   * 기록 모달을 즉시 닫습니다.
   */
  setRecordModalVisible(false);
  setTimerStartAt(null);
  setRecordMemo('');
  setFocusRating(5);
  setSelectedPhoto(null);
  setPendingCompleteGoal(null);
  setDecoratedPhotoUri(null);
  setDecorateModalVisible(false);
  setShowCustomStickerModal(false);
  setCustomStickerText('');
  setPendingMinutes(0);
  setGpsEnabled(false);
  setGpsDistanceKm(0);
  setGpsCoordinates([]);

  console.log(
    'COMPLETE RECORD UI CLOSED'
  );

 if (
  !options?.hideCompletionNotice
) {
  setTimeout(() => {
    setNoticeModal(
      completionNotice
    );
  }, 150);
}

  /*
   * 서버 저장, 하루 기록, 뱃지는
   * 모달을 막지 않고 뒤에서 처리합니다.
   */
  void (async () => {
    try {
      if (currentUser?.uid) {
        console.log(
          'FIRESTORE SAVE START',
          currentUser.uid
        );

        await setDoc(
  doc(
    firebaseDb,
    'users',
    currentUser.uid
  ),
  {
    rootData:
      next,

    updatedAt:
      new Date()
        .toISOString(),
  },
  {
    merge: true,
  }
);

        console.log(
          'FIRESTORE SAVE DONE'
        );
      }

      const isTimerGoal =
        goal.type ===
          '시간기록형' ||
        goal.type ===
          'timer';

      if (
        isTimerGoal &&
        minutes > 0 &&
        startedAt
      ) {
        await saveTimeGoalToDayRecords(
          goal.title,
          startedAt,
          new Date()
            .toISOString()
        );
      }

          await updateRootWidgetData();

         } catch (error) {
      console.log(
        'BACKGROUND RECORD SYNC ERROR',
        error
      );
    }
  })();
};

const requestCompleteRecordSave = (
  options?: {
    withoutPhoto?: boolean;
  }
) => {
  if (!pendingCompleteGoal) {
    return;
  }

  const isExerciseGoal =
    [
      'exercise',
      '운동',
    ].includes(
      String(
        pendingCompleteGoal
          ?.category ?? ''
      ).trim()
    );

  /*
   * 운동 이외의 목표는
   * 기존 방식대로 바로 저장합니다.
   */
  if (!isExerciseGoal) {
    void saveCompleteRecord(
      options
    ).catch((error) => {
      console.error(
        'SAVE COMPLETE RECORD ERROR',
        error
      );
    });

    return;
  }

  const estimatedCalories =
    calculatePreviewCalories(
      pendingCompleteGoal,
      pendingMinutes,
      calorieWeight
    );

  setCompletionCalorieInput(
    estimatedCalories > 0
      ? String(
          estimatedCalories
        )
      : ''
  );

  setCompletionSaveRequest({
    withoutPhoto:
      options?.withoutPhoto,

    title:
      String(
        pendingCompleteGoal
          ?.title ?? '운동'
      ),

    rewardXp:
      calculateExp(
        pendingCompleteGoal
      ),

    minutes:
      pendingMinutes,

    useGps:
      gpsEnabled,

    distanceKm:
      gpsDistanceKm,
  });
};

const toggleComplete = async (
  id: string | number
) => {
  const goal =
    actionGoals.find(
      (item) =>
        String(item.id) ===
        String(id)
    );

  if (!goal) {
    return;
  }

  const todayKey =
    formatDateKey(
      new Date()
    );

  const hasCompletedDates =
    Array.isArray(
      goal?.completedDates
    );

  const alreadyDone =
    hasCompletedDates
      ? goal.completedDates.includes(
          todayKey
        )
      : (
          goal.completedDays ??
          []
        ).includes(
          todayIndex
        );

  /*
   * 오늘 이미 완료한 확인형 목표는
   * 다시 실행하거나 취소하지 않습니다.
   */
  if (alreadyDone) {
    return;
  }

  openRecordModal(
    goal,
    0
  );
};

useFocusEffect(
  useCallback(() => {
    const widgetAction = getParam(params.widgetAction);
    const goalId = getParam(params.goalId);
    const categoryParam = getParam(params.category);
    const widgetTs = getParam(params.widgetTs) ?? '';

    if (!widgetAction) return;

    const actionKey = [
      widgetAction,
      goalId ?? '',
      categoryParam ?? '',
      widgetTs,
    ].join('_');

    if (handledWidgetActionRef.current === actionKey) {
      return;
    }

    handledWidgetActionRef.current = actionKey;

    const runWidgetAction = async () => {
      if (widgetAction === 'openCategory') {
        if (
          categoryParam === 'exercise' ||
          categoryParam === 'study' ||
          categoryParam === 'mental' ||
          categoryParam === 'daily'
        ) {
          setSelectedCategory(categoryParam);
        }

        return;
      }

      if (
        widgetAction !== 'startTimer' &&
        widgetAction !== 'completeGoal'
      ) {
        return;
      }

      const latestData =
        getRootOnboardingData() ?? onboardingData;

      const latestActionGoals =
        latestData?.actionGoals ?? actionGoals;

      const targetGoal = latestActionGoals.find(
        (goal: any) =>
          String(goal.id) === String(goalId)
      );

      if (!targetGoal) {
        setNoticeModal({
          title: '목표를 찾을 수 없어요',
          message:
            '위젯에서 누른 목표가 홈에 있는지 확인해주세요.',
        });
        return;
      }

      if (targetGoal.category) {
        setSelectedCategory(targetGoal.category);
      }

      if (widgetAction === 'startTimer') {
        const isTimer =
          targetGoal.type === '시간기록형' ||
          targetGoal.type === 'timer';

        if (!isTimer) {
          setNoticeModal({
            title: '시간기록형 목표가 아니에요',
            message: `${targetGoal.title} 목표는 시간측정 목표가 아니에요.`,
          });
          return;
        }

        const runningTimer = latestData?.runningTimer;

        if (
          runningTimer?.goalId &&
          String(runningTimer.goalId) ===
            String(targetGoal.id)
        ) {
          setRunningGoalId(runningTimer.goalId);
          setTimerStartAt(runningTimer.startedAt ?? null);

          const seconds = runningTimer.startedAt
            ? Math.floor(
                (Date.now() -
                  new Date(
                    runningTimer.startedAt
                  ).getTime()) /
                  1000
              )
            : 0;

          setTimerSeconds(seconds);
          setGpsEnabled(runningTimer.gpsEnabled ?? false);

          await updateRootWidgetData();
          return;
        }

        if (
  runningTimer?.goalId &&
  String(runningTimer.goalId) !==
    String(targetGoal.id)
) {
  const runningGoal = latestActionGoals.find(
    (goal: any) =>
      String(goal.id) === String(runningTimer.goalId)
  );

  setNoticeModal({
    title: '이미 기록 중인 목표가 있어요',
    message:
      `${runningGoal?.title ?? '다른 목표'} 기록을 먼저 종료한 뒤 ` +
      '다른 시간기록을 시작할 수 있어요.',
  });

  return;
}


        if (targetGoal.category === 'exercise') {
          setGpsModalGoalId((prev) => {
            if (
              prev &&
              String(prev) === String(targetGoal.id)
            ) {
              return prev;
            }

            return targetGoal.id;
          });

          return;
        }

        await confirmStartTimer(targetGoal.id, false);
        return;
      }

      if (widgetAction === 'completeGoal') {
        toggleComplete(targetGoal.id);
      }
    };

    runWidgetAction();
  }, [
    params.widgetAction,
    params.goalId,
    params.category,
    params.widgetTs,
    actionGoals,
    onboardingData,
  ])
);

const toggleEditingSelectedDay = (
  dayIndex: number
) => {
  if (!editingGoal) {
    return;
  }

  const currentDays =
    Array.isArray(
      editingGoal
        ?.selectedDays
    )
      ? editingGoal.selectedDays
          .map(Number)
          .filter(
            (
              day: number
            ) =>
              day >= 0 &&
              day <= 6
          )
      : [];

  const nextDays =
    currentDays.includes(
      dayIndex
    )
      ? currentDays.filter(
          (
            day: number
          ) =>
            day !==
            dayIndex
        )
      : [
          ...currentDays,
          dayIndex,
        ].sort(
          (
            a: number,
            b: number
          ) => a - b
        );

  setEditingGoal({
    ...editingGoal,

    repeatType:
      'weekdays',

    selectedDays:
      nextDays,

    weeklyCount:
      nextDays.length,
  });
};

const saveEdit = async () => {
  if (!editingGoal) {
    return;
  }

  const editedTitle =
    String(
      editingGoal.title ?? ''
    ).trim();

  if (
    editedTitle.length <
      ACTION_GOAL_MIN_LENGTH ||
    editedTitle.length >
      ACTION_GOAL_MAX_LENGTH
  ) {
    setNoticeModal({
      title:
        '행동목표 확인',

      message:
        `행동목표는 ${ACTION_GOAL_MIN_LENGTH}자 이상 ${ACTION_GOAL_MAX_LENGTH}자 이하로 입력해 주세요.`,
    });

    return;
  }

  const normalizedRepeatType =
    editingGoal
      ?.repeatType ===
      'weekdays'
      ? 'weekdays'
      : 'weeklyCount';

  const normalizedSelectedDays =
    Array.isArray(
      editingGoal
        ?.selectedDays
    )
      ? editingGoal.selectedDays
          .map(Number)
          .filter(
            (
              day: number
            ) =>
              day >= 0 &&
              day <= 6
          )
          .sort(
            (
              a: number,
              b: number
            ) => a - b
          )
      : [];

  if (
    normalizedRepeatType ===
      'weekdays' &&
    normalizedSelectedDays.length ===
      0
  ) {
    setNoticeModal({
      title:
        '요일 선택',

      message:
        '반복할 요일을 한 개 이상 선택해 주세요.',
    });

    return;
  }

  const normalizedWeeklyCount =
    normalizedRepeatType ===
      'weekdays'
      ? normalizedSelectedDays.length
      : Math.min(
          7,
          Math.max(
            1,
            Number(
              editingGoal
                ?.weeklyCount ??
                3
            )
          )
        );

  const normalizedEditingGoal = {
    ...editingGoal,

    title:
      editedTitle,

    repeatType:
      normalizedRepeatType,

    selectedDays:
      normalizedRepeatType ===
        'weekdays'
        ? normalizedSelectedDays
        : [],

    weeklyCount:
      normalizedWeeklyCount,

    updatedAt:
      new Date()
        .toISOString(),
  };

  const updated =
    actionGoals.map(
      (goal) =>
        String(goal.id) ===
        String(
          normalizedEditingGoal.id
        )
          ? normalizedEditingGoal
          : goal
    );

  const currentData =
    getRootOnboardingData() ??
    onboardingData ??
    {};

  const next = {
    ...currentData,

    actionGoals:
      updated,

    updatedAt:
      normalizedEditingGoal
        .updatedAt,
  };

 try {
  /*
   * 화면 상태를 먼저 반영합니다.
   */
  setActionGoals(
    updated
  );

  /*
   * 수정 창은 즉시 닫습니다.
   *
   * 서버 저장이나 위젯 동기화가
   * 느려도 창이 계속 남지 않습니다.
   */
  setEditingGoal(
    null
  );

  /*
   * 로컬·서버 저장은 별도로 진행합니다.
   */
  saveRootData(
    next
  )
    .then(() => {
      console.log(
        'ACTION GOAL EDIT SAVE DONE',
        {
          id:
            normalizedEditingGoal.id,

          title:
            normalizedEditingGoal.title,

          repeatType:
            normalizedEditingGoal.repeatType,

          selectedDays:
            normalizedEditingGoal.selectedDays,

          weeklyCount:
            normalizedEditingGoal.weeklyCount,
        }
      );
    })
    .catch((error) => {
      console.log(
        'ACTION GOAL EDIT SAVE ERROR',
        error
      );
    });

  /*
   * 위젯 동기화도 창 닫기와 분리합니다.
   */
  updateRootWidgetData()
    .catch((error) => {
      console.log(
        'ACTION GOAL EDIT WIDGET SYNC ERROR',
        error
      );
    });
} catch (error) {
  console.log(
    'ACTION GOAL EDIT LOCAL ERROR',
    error
  );

  setNoticeModal({
    title:
      '행동목표 수정 실패',

    message:
      '행동목표를 수정하지 못했어요. 다시 시도해 주세요.',
  });
}

};

const deleteGoal = async () => {
  if (!editingGoal) {
    return;
  }

  const activeGoalId =
    getActiveRunningGoalId();

  if (
    activeGoalId &&
    String(activeGoalId) ===
      String(editingGoal.id)
  ) {
    setNoticeModal({
      title:
        '기록을 먼저 종료해 주세요',

      message:
        '현재 시간 기록 중인 행동목표는 종료할 수 없어요.\n' +
        '기록을 먼저 끝낸 뒤 다시 진행해 주세요.',
    });

    return;
  }

  const currentData =
    getRootOnboardingData() ??
    onboardingData ??
    {};

  const endedAt =
    new Date().toISOString();

  const endedGoalTitle =
    String(
      editingGoal.title ?? ''
    );

  const archivedGoal = {
    ...editingGoal,

    status:
      'archived',

    endStatus:
      'stopped',

    endedAt,

    archivedAt:
      endedAt,
  };

  const updatedActionGoals =
    actionGoals.filter(
      (goal) =>
        String(goal.id) !==
        String(editingGoal.id)
    );

  const previousArchivedGoals =
    Array.isArray(
      currentData
        ?.archivedActionGoals
    )
      ? currentData
          .archivedActionGoals
      : [];

  const updatedArchivedGoals = [
    archivedGoal,

    ...previousArchivedGoals.filter(
      (goal: any) =>
        String(goal.id) !==
        String(editingGoal.id)
    ),
  ];

  const next = {
    ...currentData,

    actionGoals:
      updatedActionGoals,

    archivedActionGoals:
      updatedArchivedGoals,

    updatedAt:
      endedAt,
  };

  try {
  /*
   * 1. 홈 화면에서 목표를 즉시 제거합니다.
   */
  setActionGoals(
    updatedActionGoals
  );

  /*
   * 2. 행동목표 수정 창을 즉시 닫습니다.
   *
   * 서버 저장이나 위젯 동기화가
   * 느려도 창이 남지 않습니다.
   */
  setEditingGoal(
    null
  );

  /*
   * 3. 종료 완료 안내를 바로 표시합니다.
   */
  setNoticeModal({
    title:
      '행동목표 종료',

    message:
      `${endedGoalTitle} 목표가 종료되어 보관됐어요.\n` +
      '기존 수행 기록은 삭제되지 않습니다.',
  });

  /*
   * 4. 데이터 저장은 별도로 진행합니다.
   */
  saveRootData(
    next
  )
    .then(() => {
      console.log(
        'ACTION GOAL ARCHIVE SAVE DONE',
        {
          id:
            archivedGoal.id,

          title:
            archivedGoal.title,

          activeGoalCount:
            updatedActionGoals.length,

          archivedGoalCount:
            updatedArchivedGoals.length,
        }
      );
    })
    .catch((error) => {
      console.log(
        'ACTION GOAL ARCHIVE SAVE ERROR',
        error
      );
    });

  /*
   * 5. 위젯 동기화도 화면 처리와 분리합니다.
   */
  updateRootWidgetData()
    .catch((error) => {
      console.log(
        'ACTION GOAL ARCHIVE WIDGET SYNC ERROR',
        error
      );
    });
} catch (error) {
  console.log(
    'ACTION GOAL ARCHIVE LOCAL ERROR',
    error
  );

  setNoticeModal({
    title:
      '행동목표 종료 실패',

    message:
      '행동목표를 종료하지 못했어요. 다시 시도해 주세요.',
  });
}
};

const archiveResultGoal =
  async (
    targetResultGoal: any
  ) => {
    if (
      !targetResultGoal
    ) {
      return;
    }

    const currentData =
      getRootOnboardingData() ??
      onboardingData ??
      {};

    const targetCategory =
  String(
    targetResultGoal
      ?.category ??
    selectedCategory ??
    ''
  );

    const currentActionGoals =
      Array.isArray(
        currentData
          ?.actionGoals
      )
        ? currentData
            .actionGoals
        : [];

    const linkedActionGoals =
      currentActionGoals.filter(
        (goal: any) =>
          String(
            goal?.category ??
              ''
          ) ===
          targetCategory
      );

    /*
     * 연결된 시간기록형 목표가
     * 실행 중이면 결과목표를
     * 종료하지 않습니다.
     */
    const activeGoalId =
      getActiveRunningGoalId();

    const hasRunningLinkedGoal =
      Boolean(
        activeGoalId &&
        linkedActionGoals.some(
          (goal: any) =>
            String(
              goal?.id
            ) ===
            String(
              activeGoalId
            )
        )
      );

    if (
      hasRunningLinkedGoal
    ) {
      setNoticeModal({
        title:
          '기록을 먼저 종료해 주세요',

        message:
          '연결된 행동목표의 시간 기록이 진행 중이에요.\n' +
          '기록을 완료한 뒤 결과목표를 종료해 주세요.',
      });

      return;
    }

    const endedAt =
      new Date()
        .toISOString();

    const resultGoalTitle =
  String(
    targetResultGoal
      ?.resultGoal ??
      '결과목표'
  );

    const currentGoals =
      Array.isArray(
        currentData?.goals
      )
        ? currentData.goals
        : [];

    const remainingGoals =
      currentGoals.filter(
        (goal: any) =>
          String(
            goal?.category ??
              ''
          ) !==
          targetCategory
      );

    const remainingActionGoals =
      currentActionGoals.filter(
        (goal: any) =>
          String(
            goal?.category ??
              ''
          ) !==
          targetCategory
      );

    /*
     * 결과목표 보관 데이터
     */
    const archivedResultGoal = {
  ...targetResultGoal,

      status:
        'archived',

      endStatus:
        'stopped',

      endedAt,

      archivedAt:
        endedAt,
    };

    const previousArchivedResultGoals =
      Array.isArray(
        currentData
          ?.archivedResultGoals
      )
        ? currentData
            .archivedResultGoals
        : [];

    const updatedArchivedResultGoals = [
      archivedResultGoal,

      ...previousArchivedResultGoals.filter(
        (goal: any) =>
          String(
            goal?.id
          ) !==
          String(
  targetResultGoal
    ?.id
)
      ),
    ];

    /*
     * 연결된 행동목표들도 보관합니다.
     */
    const archivedLinkedActionGoals =
      linkedActionGoals.map(
        (goal: any) => ({
          ...goal,

          status:
            'archived',

          endStatus:
            'result-goal-ended',

          endedAt,

          archivedAt:
            endedAt,
        })
      );

    const previousArchivedActionGoals =
      Array.isArray(
        currentData
          ?.archivedActionGoals
      )
        ? currentData
            .archivedActionGoals
        : [];

    const linkedGoalIdSet =
      new Set(
        archivedLinkedActionGoals.map(
          (goal: any) =>
            String(goal?.id)
        )
      );

    const updatedArchivedActionGoals = [
      ...archivedLinkedActionGoals,

      ...previousArchivedActionGoals.filter(
        (goal: any) =>
          !linkedGoalIdSet.has(
            String(goal?.id)
          )
      ),
    ];

    /*
     * actionLogs는 건드리지 않습니다.
     * 기존 기록과 보상은 유지됩니다.
     */
    const next = {
      ...currentData,

      goals:
        remainingGoals,

      actionGoals:
        remainingActionGoals,

      archivedResultGoals:
        updatedArchivedResultGoals,

      archivedActionGoals:
        updatedArchivedActionGoals,

      updatedAt:
        endedAt,
    };

    try {
      /*
       * 화면을 먼저 즉시 반영합니다.
       */
      setActionGoals(
        remainingActionGoals
      );

      setEditingResultGoal(
        null
      );

      setNoticeModal({
        title:
          '결과목표 종료',

        message:
          `${resultGoalTitle} 목표가 종료되어 보관됐어요.\n` +
          `연결된 행동목표 ${linkedActionGoals.length}개도 함께 보관됐습니다.\n` +
          '기존 수행 기록과 보상은 그대로 유지됩니다.',
      });

      /*
       * 저장은 화면 처리와 분리합니다.
       */
      saveRootData(
        next
      )
        .then(() => {
          console.log(
            'RESULT GOAL ARCHIVE SAVE DONE',
            {
              resultGoalId:
                editingResultGoal
                  ?.id,

              title:
                resultGoalTitle,

              category:
                targetCategory,

              linkedActionGoalCount:
                linkedActionGoals
                  .length,
            }
          );
        })
        .catch((error) => {
          console.log(
            'RESULT GOAL ARCHIVE SAVE ERROR',
            error
          );
        });

      updateRootWidgetData()
        .catch((error) => {
          console.log(
            'RESULT GOAL ARCHIVE WIDGET SYNC ERROR',
            error
          );
        });
    } catch (error) {
      console.log(
        'RESULT GOAL ARCHIVE LOCAL ERROR',
        error
      );

      setNoticeModal({
        title:
          '결과목표 종료 실패',

        message:
          '결과목표를 종료하지 못했어요. 다시 시도해 주세요.',
      });
    }
  };


const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  if (obj && typeof obj === 'object') {
    const cleaned: any = {};

    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    });

    return cleaned;
  }

  return obj;
};

const saveRootData = async (
  next: any
) => {
  const currentUser =
    firebaseAuth.currentUser;

  /*
   * 탐험 탭에서 선택한 대표 뱃지를
   * 일반 ROOT 데이터 저장 시에도
   * 함께 보존합니다.
   */
  let savedExplorationMainBadgeId:
    | string
    | null = null;

  try {
    const localBadgeId =
      await AsyncStorage.getItem(
        EXPLORATION_MAIN_BADGE_KEY
      );

    const normalizedLocalBadgeId =
      String(
        localBadgeId ?? ''
      ).trim();

    const normalizedNextBadgeId =
      String(
        next
          ?.explorationMainBadgeId ??
          ''
      ).trim();

    const normalizedMemoryBadgeId =
      String(
        getRootOnboardingData()
          ?.explorationMainBadgeId ??
          ''
      ).trim();

    savedExplorationMainBadgeId =
      normalizedLocalBadgeId ||
      normalizedNextBadgeId ||
      normalizedMemoryBadgeId ||
      null;
  } catch (error) {
    console.log(
      'ROOT DATA EXPLORATION MAIN BADGE LOAD ERROR',
      error
    );

    const fallbackBadgeId =
      String(
        next
          ?.explorationMainBadgeId ??
          getRootOnboardingData()
            ?.explorationMainBadgeId ??
          ''
      ).trim();

    savedExplorationMainBadgeId =
      fallbackBadgeId ||
      null;
  }

  const cleanedNext =
    removeUndefined({
      ...next,

      ...(savedExplorationMainBadgeId
        ? {
            explorationMainBadgeId:
              savedExplorationMainBadgeId,
          }
        : {}),

      uid:
        currentUser?.uid ??
        next?.uid,
    });

  setOnboardingData(
    cleanedNext
  );

  setRootOnboardingData(
    cleanedNext
  );

  /*
   * 먼저 기기에 저장합니다.
   */
  await saveRootOnboardingData(
    cleanedNext
  );

  /*
   * 로그인된 사용자는
   * Firestore에도 저장합니다.
   */
  if (
    currentUser?.uid
  ) {
    try {
      await setDoc(
  doc(
    firebaseDb,
    'users',
    currentUser.uid
  ),
  {
    rootData:
      cleanedNext,

    updatedAt:
      new Date()
        .toISOString(),
  },
  {
    merge: true,
  }
);

      console.log(
        'ROOT DATA SERVER SAVE DONE',
        {
          explorationMainBadgeId:
            cleanedNext
              ?.explorationMainBadgeId ??
            null,
        }
      );
    } catch (error) {
      console.log(
        'ROOT DATA SERVER SAVE ERROR',
        error
      );
    }
  }
};

useFocusEffect(
  useCallback(() => {
    let mounted = true;

    /*
     * 예전 탐험 아이템에는
     * explorationRewardId가 없을 수 있습니다.
     *
     * id가 explore-로 시작하거나
     * source가 exploration이면
     * 새 구조로 자동 보완합니다.
     */
    const normalizeExplorationItem =
      (
        item: any
      ) => {
        const itemId =
          String(
            item?.id ?? ''
          ).trim();

        const savedRewardId =
          String(
            item
              ?.explorationRewardId ??
              ''
          ).trim();

        const isExplorationItem =
          item?.source ===
            'exploration' ||
          itemId.startsWith(
            'explore-'
          ) ||
          !!savedRewardId;

        if (
          !isExplorationItem
        ) {
          return item;
        }

        const explorationRewardId =
          savedRewardId ||
          itemId;

        if (
          !explorationRewardId
        ) {
          return item;
        }

        /*
         * 이미 새 구조라면
         * 기존 객체를 그대로 사용합니다.
         */
        if (
          item
            ?.explorationRewardId ===
            explorationRewardId &&
          item?.source ===
            'exploration' &&
          item?.nonRefundable ===
            true
        ) {
          return item;
        }

        return {
          ...item,

          id:
            itemId ||
            explorationRewardId,

          explorationRewardId,

          source:
            'exploration',

          nonRefundable:
            true,
        };
      };

    const getExplorationRewardId =
      (
        item: any
      ) => {
        const savedRewardId =
          String(
            item
              ?.explorationRewardId ??
              ''
          ).trim();

        if (
          savedRewardId
        ) {
          return savedRewardId;
        }

        const itemId =
          String(
            item?.id ?? ''
          ).trim();

        if (
          item?.source ===
            'exploration' ||
          itemId.startsWith(
            'explore-'
          )
        ) {
          return itemId;
        }

        return '';
      };

    const syncExplorationRewardsToBag =
      async () => {
        try {
          const explorationData =
            await loadLocalExplorationData();

          if (!mounted) {
            return;
          }

          const loadedExplorationPoints =
            Math.max(
              0,
              Math.floor(
                Number(
                  explorationData
                    ?.points
                ) || 0
              )
            );

          setExplorationPoints(
            loadedExplorationPoints
          );

          console.log(
            'HOME EXPLORATION POINTS APPLIED',
            {
              points:
                loadedExplorationPoints,
            }
          );

          const unlockedIds =
            Array.from(
              new Set(
                (
                  Array.isArray(
                    explorationData
                      ?.unlockedBuildingIds
                  )
                    ? explorationData
                        .unlockedBuildingIds
                    : []
                )
                  .map(
                    (
                      value: any
                    ) =>
                      String(
                        value ?? ''
                      ).trim()
                  )
                  .filter(Boolean)
              )
            );

          const currentData =
            getRootOnboardingData() ??
            onboardingData ??
            {};

          const currentBag =
            Array.isArray(
              currentData
                ?.bagItems
            )
              ? currentData
                  .bagItems
              : [];

          const currentPlacedBuildings =
            Array.isArray(
              currentData
                ?.placedBuildings
            )
              ? currentData
                  .placedBuildings
              : [];

          /*
           * 기존에 받은 탐험 아이템에도
           * explorationRewardId를 보완합니다.
           */
          const normalizedBag =
            currentBag.map(
              normalizeExplorationItem
            );

          const normalizedPlacedBuildings =
            currentPlacedBuildings.map(
              normalizeExplorationItem
            );

          const bagNormalized =
            normalizedBag.some(
              (
                item: any,
                index: number
              ) =>
                item !==
                currentBag[index]
            );

          const placedNormalized =
            normalizedPlacedBuildings.some(
              (
                item: any,
                index: number
              ) =>
                item !==
                currentPlacedBuildings[
                  index
                ]
            );

          /*
           * 배치된 탐험 아이템을 먼저
           * 유지합니다.
           *
           * 같은 탐험 보상이 마을에
           * 여러 번 들어 있다면
           * 첫 번째 아이템만 유지합니다.
           */
          const placedRewardIds =
            new Set<string>();

          const deduplicatedPlacedBuildings =
            normalizedPlacedBuildings.filter(
              (
                item: any
              ) => {
                const rewardId =
                  getExplorationRewardId(
                    item
                  );

                if (!rewardId) {
                  return true;
                }

                if (
                  placedRewardIds.has(
                    rewardId
                  )
                ) {
                  return false;
                }

                placedRewardIds.add(
                  rewardId
                );

                return true;
              }
            );

          /*
           * 이미 마을에 배치된 보상은
           * 가방에 다시 추가하지 않습니다.
           *
           * 가방 내부 중복도 함께 제거합니다.
           */
          const bagRewardIds =
            new Set<string>();

          const deduplicatedBag =
            normalizedBag.filter(
              (
                item: any
              ) => {
                const rewardId =
                  getExplorationRewardId(
                    item
                  );

                if (!rewardId) {
                  return true;
                }

                if (
                  placedRewardIds.has(
                    rewardId
                  )
                ) {
                  return false;
                }

                if (
                  bagRewardIds.has(
                    rewardId
                  )
                ) {
                  return false;
                }

                bagRewardIds.add(
                  rewardId
                );

                return true;
              }
            );

          const existingRewardIds =
            new Set<string>([
              ...Array.from(
                placedRewardIds
              ),

              ...Array.from(
                bagRewardIds
              ),
            ]);

          /*
           * 새 탐험 데이터에는 있지만
           * 가방이나 마을 어디에도 없는
           * 보상만 추가합니다.
           */
          const missingItems =
            unlockedIds
              .filter(
                (
                  rewardId
                ) =>
                  !existingRewardIds.has(
                    rewardId
                  )
              )
              .map(
                (
                  rewardId,
                  index
                ) => {
                  const rewardImage =
                    buildingImages[
                      rewardId as keyof typeof buildingImages
                    ] ??
                    (rewardId.startsWith(
                      'explore-'
                    )
                      ? DEFAULT_EXPLORATION_REWARD_IMAGE
                      : undefined);

                  const rewardItem =
                    EXPLORATION_HOME_ITEMS[
                      rewardId
                    ] ??
                    (rewardImage
                      ? {
                          id: rewardId,
                          name:
                            EXPLORATION_REWARD_NAMES[
                              rewardId
                            ] ??
                            '탐험 보상',
                          price: 0,
                          type: 'building',
                          theme: '조선',
                          source: 'exploration',
                          nonRefundable: true,
                          image: rewardImage,
                        }
                      : null);

                  if (
                    !rewardItem
                  ) {
                    console.log(
                      'HOME EXPLORATION BAG ITEM MAP MISSING',
                      {
                        rewardId,
                      }
                    );

                    return null;
                  }

                  return {
                    ...rewardItem,

                    id:
                      rewardId,

                    bagId:
                      Date.now() +
                      index,

                    explorationRewardId:
                      rewardId,

                    source:
                      'exploration',

                    nonRefundable:
                      true,
                  };
                }
              )
              .filter(
                Boolean
              );

          const nextBag = [
            ...deduplicatedBag,
            ...missingItems,
          ];

          const removedDuplicateCount =
            (
              normalizedBag.length -
              deduplicatedBag.length
            ) +
            (
              normalizedPlacedBuildings
                .length -
              deduplicatedPlacedBuildings
                .length
            );

          const hasChanges =
            bagNormalized ||
            placedNormalized ||
            missingItems.length >
              0 ||
            removedDuplicateCount >
              0;

          if (
            !hasChanges
          ) {
            console.log(
              'HOME EXPLORATION BAG ALREADY SYNCED',
              {
                unlockedBuildingCount:
                  unlockedIds.length,

                bagExplorationCount:
                  bagRewardIds.size,

                placedExplorationCount:
                  placedRewardIds.size,
              }
            );

            return;
          }

          const nextData = {
            ...currentData,

            bagItems:
              nextBag,

            placedBuildings:
              deduplicatedPlacedBuildings,
          };

          if (!mounted) {
            return;
          }

          setBagItems(
            nextBag
          );

          applyPlacedBuildings(
            deduplicatedPlacedBuildings
          );

          await saveRootData(
            nextData
          );

          console.log(
            'HOME EXPLORATION BAG SYNC DONE',
            {
              unlockedBuildingCount:
                unlockedIds.length,

              addedCount:
                missingItems.length,

              addedRewardIds:
                missingItems.map(
                  (
                    item: any
                  ) =>
                    item
                      .explorationRewardId
                ),

              removedDuplicateCount,

              bagExplorationCount:
                nextBag.filter(
                  (
                    item: any
                  ) =>
                    !!getExplorationRewardId(
                      item
                    )
                ).length,

              placedExplorationCount:
                deduplicatedPlacedBuildings
                  .filter(
                    (
                      item: any
                    ) =>
                      !!getExplorationRewardId(
                        item
                      )
                  )
                  .length,
            }
          );
        } catch (
          error
        ) {
          console.log(
            'HOME EXPLORATION BAG SYNC ERROR',
            error
          );
        }
      };

    void syncExplorationRewardsToBag();

    return () => {
      mounted = false;
    };
  }, [])
);

const buyItem = (item: any) => {
  const currentData = getRootOnboardingData() ?? onboardingData;
  const currentTestPoints = currentData?.testPoints ?? 0;

  if (totalPoints < item.price) {
    setNoticeModal({
  title: '포인트 부족',
  message: '포인트가 부족합니다.',
});
    return;
  }

  const newBagItem = {
    ...item,
    bagId: Date.now(),
  };

  const updatedBagItems = [
    ...bagItems,
    newBagItem,
  ];

  const next = {
    ...currentData,
    testPoints: currentTestPoints - item.price,
    bagItems: updatedBagItems,
  };

  setBagItems(updatedBagItems);
  saveRootData(next);

  setBuyCompleteModal(item);
};

const filteredShopItems =
  selectedShopTheme === '전체'
    ? shopItems
    : shopItems.filter(
        (item: any) =>
          item.theme === selectedShopTheme
      );

const filteredBagItems =
  selectedBagTheme === '전체'
    ? bagGroups
    : bagGroups.filter(
        (item: any) =>
          item.theme === selectedBagTheme
      );


const sellBagItem = (groupItem: any) => {
  const sellTarget = groupItem.items?.[0];

  if (!sellTarget) return;

  if (
    groupItem?.nonRefundable ||
    sellTarget?.nonRefundable ||
    groupItem?.source ===
      'exploration' ||
    sellTarget?.source ===
      'exploration'
  ) {
    setNoticeModal({
      title:
        '탐험 보상',

      message:
        '탐험으로 획득한 아이템은 환급할 수 없어요.',
    });

    return;
  }

  const refundPoint = Math.floor((groupItem.price ?? 0) / 2);

  const updatedBagItems = bagItems.filter(
    (item) => item.bagId !== sellTarget.bagId
  );

  const currentData = getRootOnboardingData() ?? onboardingData;

  const next = {
    ...currentData,
    testPoints:
      (currentData?.testPoints ?? 0) + refundPoint,
    bagItems: updatedBagItems,
  };

  setBagItems(updatedBagItems);
  saveRootData(next);

  setSellCompleteModal({
  name: groupItem.name,
  point: refundPoint,
});
};

const startPlaceBuilding = (item: any) => {
  setPlacingItem(item.items ? item.items[0] : item);
  setEditingPlacedId(null);
  setPreviewGrid({ col: 5, row: 5 });
  setIsPlacingFromBag(true);
  setVillageModal(null);

  setNoticeModal({
  title: '배치 모드',
  message:
    '아이템을 원하는 위치로 옮긴 뒤 화면을 한 번 눌러 배치하세요.',
});
};

const isGridOccupied = (
  col: number,
  row: number,
  exceptPlacedId: number | null = null
) => {
  const placingSize =
    placingItem
      ? buildingSizes[
          placingItem.id as keyof typeof buildingSizes
        ] ?? { cols: 1, rows: 1 }
      : { cols: 1, rows: 1 };

  for (let pc = 0; pc < placingSize.cols; pc++) {
    for (let pr = 0; pr < placingSize.rows; pr++) {
      const targetCol = col + pc;
      const targetRow = row + pr;

      const occupied = placedBuildings.some((building) => {
        if (building.placedId === exceptPlacedId) {
          return false;
        }

        const size =
          buildingSizes[
            building.id as keyof typeof buildingSizes
          ] ?? { cols: 1, rows: 1 };

        for (let c = 0; c < size.cols; c++) {
          for (let r = 0; r < size.rows; r++) {
            if (
              building.col + c === targetCol &&
              building.row + r === targetRow
            ) {
              return true;
            }
          }
        }

        return false;
      });

      if (occupied) return true;
    }
  }

  return false;
};




const placeBuildingOnVillage = () => {
  if (!placingItem) return;

   if (
    isGridOccupied(
      previewGrid.col,
      previewGrid.row,
      editingPlacedId
    )
  ) {
    setNoticeModal({
  title: '배치 불가',
  message: '이미 이 위치에 다른 오브젝트가 있어요.',
});
    return;
  }

  if (editingPlacedId !== null) {
    const updatedPlacedBuildings = placedBuildings.map((building) =>
      building.placedId === editingPlacedId
        ? {
            ...building,
            col: previewGrid.col,
            row: previewGrid.row,
          }
        : building
    );

    const currentData = getRootOnboardingData() ?? onboardingData;

    const next = {
      ...currentData,
      placedBuildings: updatedPlacedBuildings,
    };

    applyPlacedBuildings(updatedPlacedBuildings);
    setOnboardingData(next);
    setRootOnboardingData(next);

    setEditingPlacedId(null);
    setPlacingItem(null);
    setIsPlacingFromBag(false);
    return;
  }

  const newPlacedBuilding = {
    ...placingItem,
    placedId: Date.now(),
    col: previewGrid.col,
    row: previewGrid.row,
  };

  const updatedPlacedBuildings = [
    ...placedBuildings,
    newPlacedBuilding,
  ];

  const updatedBagItems = bagItems.filter(
    (bagItem) => bagItem.bagId !== placingItem.bagId
  );

  const currentData = getRootOnboardingData() ?? onboardingData;

  const next = {
    ...currentData,
    placedBuildings: updatedPlacedBuildings,
    bagItems: updatedBagItems,
  };

  applyPlacedBuildings(updatedPlacedBuildings);
  setBagItems(updatedBagItems);
saveRootData(next);


  setPlacingItem(null);
  setIsPlacingFromBag(false);
};

 const editPlacedBuilding = (building: any) => {
  setPlacingItem({
    ...building,
    bagId: building.bagId ?? building.placedId,
  });

  setEditingPlacedId(building.placedId);
setIsPlacingFromBag(false);

  setPreviewGrid({
    col: building.col ?? 5,
    row: building.row ?? 5,
  });
};

const returnPlacedBuildingToBag = () => {
  if (editingPlacedId === null || !placingItem) return;

  const returnedItem = {
    ...placingItem,
    bagId: Date.now(),
  };

  delete returnedItem.placedId;
  delete returnedItem.col;
  delete returnedItem.row;

  const updatedPlacedBuildings = placedBuildings.filter(
    (building) => building.placedId !== editingPlacedId
  );

  const updatedBagItems = [
    ...bagItems,
    returnedItem,
  ];

  const currentData =
    getRootOnboardingData() ?? onboardingData;

  const next = {
    ...currentData,
    placedBuildings: updatedPlacedBuildings,
    bagItems: updatedBagItems,
  };

  applyPlacedBuildings(updatedPlacedBuildings);
  setBagItems(updatedBagItems);
  saveRootData(next);

  setPlacingItem(null);
  setEditingPlacedId(null);
  setIsPlacingFromBag(false);
  setDragStart(null);
};

const flipSelectedBuilding = () => {
  if (editingPlacedId === null) return;

  const updatedPlacedBuildings = placedBuildings.map((building) =>
    building.placedId === editingPlacedId
      ? {
          ...building,
          flipped: !building.flipped,
        }
      : building
  );

  const currentData =
    getRootOnboardingData() ?? onboardingData;

  const next = {
    ...currentData,
    placedBuildings: updatedPlacedBuildings,
  };

  applyPlacedBuildings(updatedPlacedBuildings);
  saveRootData(next);

  setPlacingItem((prev: any) =>
    prev
      ? {
          ...prev,
          flipped: !prev.flipped,
        }
      : prev
  );
};

const saveVillageEdit = () => {
  const currentData = getRootOnboardingData() ?? onboardingData;

  const latestPlacedBuildings =
    currentData?.placedBuildings ?? placedBuildings;

  const next = {
    ...currentData,
    placedBuildings: latestPlacedBuildings,
  };

  applyPlacedBuildings(latestPlacedBuildings);
  saveRootData(next);

  setOriginalPlacedBuildings(
    JSON.parse(JSON.stringify(latestPlacedBuildings))
  );

  setPlacingItem(null);
  setEditingPlacedId(null);
  setIsPlacingFromBag(false);
  setDragStart(null);
  setIsEditMode(false);

  setSaveCompleteModal(true);
};

const isTwoByTwoBuilding =
  placingItem?.id === 'building1' ||
    placingItem?.id === 'building3' ||
    placingItem?.id === 'building4' ;

const previewSize = isTwoByTwoBuilding
  ? { cols: 2, rows: 2 }
  : { cols: 1, rows: 1 };

 return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ScrollView
  style={[
    styles.container,
    { backgroundColor: theme.background },
  ]}
>

   {/* 상단 프로필 */}
<View
  style={[
    styles.homeProfileCard,
    {
      backgroundColor:
        theme.card,

      borderColor:
        theme.line,

      borderRadius:
        isCityBlack
          ? 4
          : 22,
    },
  ]}
>
 {/* 프로필 캐릭터 */}
<View
  style={
    styles.profileCharacterBox
  }
>
  <Text
    style={
      styles.profileCharacter
    }
  >
    🦊
  </Text>
</View>

  {/* 닉네임·대표 뱃지·레벨 */}
  <View
    style={
      styles.profileMainInfo
    }
  >
    {/* 첫 번째 줄 */}
    <View
      style={
        styles.profileNameRow
      }
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.profileName,
          {
            color:
              theme.text,

            flexShrink: 1,
          },
        ]}
      >
        {onboardingData
          ?.nickname ??
          '루트워커'}
      </Text>

      <View
        style={
          styles.mainBadgeChip
        }
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.mainBadgeText,
            {
              color:
                theme.text,
            },
          ]}
        >
          {explorationMainBadgeTitle
            ? `🏆 ${explorationMainBadgeTitle}`
            : mainBadge
              ? `${mainBadge.icon} ${mainBadge.title}`
              : '대표뱃지'}
        </Text>
      </View>
    </View>

    {/* 두 번째 줄 */}
    <View
      style={
        styles.profileStatRow
      }
    >
      <Text
        style={[
          styles.profileStatText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        Lv.{currentLevel}
      </Text>

      <Text
        style={[
          styles.profileStatText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {totalPoints}P
      </Text>

      <Text
        style={[
          styles.profileStatText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        XP{' '}
        {currentXpInLevel}/30
      </Text>

      {/* 오른쪽 아래 설정 버튼 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="설정 열기"
        hitSlop={10}
        onPress={() =>
          router.push(
            '/(tabs)/settings'
          )
        }
        style={({
          pressed,
        }) => [
          styles.homeSettingsButton,
          {
            opacity:
              pressed
                ? 0.5
                : 1,
          },
        ]}
      >
        <Ionicons
          name="settings-outline"
          size={19}
          color={
            theme.text
          }
        />
      </Pressable>
          {/* CHARACTER_V71_HOME_SELECTION_ENTRY */}
          <Pressable
            onPress={() =>
              router.push(
                '/character-preview' as never
              )
            }
            style={{
              alignSelf: 'flex-end',
              marginTop: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(95, 87, 79, 0.20)',
              backgroundColor: 'rgba(255, 255, 255, 0.90)',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#5F574F',
              }}
            >
              {'\uCE90\uB9AD\uD130 \uBCC0\uACBD'}
            </Text>
          </Pressable>
    </View>
  </View>
</View>

{/* 마을 */}
<View style={styles.villageWrapper}>

  {/* 마을 영역 */}
<GestureDetector gesture={composedGesture}>
  <View
    style={styles.villagePreview}
    onTouchStart={(event) => {
      if (!placingItem) return;

      const touch = event.nativeEvent;

      setDragStart({
        x: touch.locationX,
        y: touch.locationY,
        col: previewGrid.col,
        row: previewGrid.row,
      });
    }}
    onTouchMove={(event) => {
      if (!placingItem) return;
      if (!dragStart) return;

      const touch = event.nativeEvent;

      const dx =
        (touch.locationX - dragStart.x) /
        scale.value;

      const dy =
        (touch.locationY - dragStart.y) /
        scale.value;

      const moveCol = Math.round(
        dy / TILE_HEIGHT + dx / TILE_WIDTH
      );

      const moveRow = Math.round(
        dy / TILE_HEIGHT - dx / TILE_WIDTH
      );

      setPreviewGrid({
        col: clampGrid(dragStart.col + moveCol),
        row: clampGrid(dragStart.row + moveRow),
      });
    }}
    onTouchEnd={() => {
  if (!placingItem) return;
  if (!isEditMode && !isPlacingFromBag) return;

  placeBuildingOnVillage();
  setDragStart(null);
}}
  >
    <Animated.View
      style={[
        styles.tileMap,
        animatedStyle,
      ]}
    >
     {Array.from({ length: 144 }).map((_, index) => {
  const GRID_SIZE = 12;

  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;

  const x =
    col * (TILE_WIDTH / 2) -
    row * (TILE_WIDTH / 2) +
    430;

  const y =
    col * (TILE_HEIGHT / 2) +
    row * (TILE_HEIGHT / 2) -
    80;

  return (
    <Image
      key={`${col}-${row}`}
      source={grassTile}
      style={[
        styles.tile,
        {
          left: x,
          top: y,
        },
      ]}
    />
  );
})}

      {placedBuildings
        .filter((building) => building.placedId !== editingPlacedId)
        .map((building) => (
          <Pressable
            key={building.placedId}
            onPress={() => {
              if (isEditMode) {
                editPlacedBuilding(building);
              }
            }}
            style={{
              position: 'absolute',
              left:
  gridToScreen(building.col ?? 5, building.row ?? 5).x +
  (buildingOffsets[
    building.id as keyof typeof buildingOffsets
  ]?.x ??
  (String(building.id).startsWith('explore-')
    ? 0
    : -70)),

top:
  gridToScreen(building.col ?? 5, building.row ?? 5).y +
  (buildingOffsets[
    building.id as keyof typeof buildingOffsets
  ]?.y ??
  (String(building.id).startsWith('explore-')
    ? -80
    : -210)),
             zIndex:
  ((building.row ?? 0) +
    (building.col ?? 0) +
    (buildingSizes[
      building.id as keyof typeof buildingSizes
    ]?.rows ?? 1)) *
  100,
            }}
          >
            <Image
  source={
    buildingImages[
      building.id as keyof typeof buildingImages
    ] ??
    building.image ??
    DEFAULT_EXPLORATION_REWARD_IMAGE
  }
  style={{
    width:
      buildingImageSizes[
        building.id as keyof typeof buildingImageSizes
      ] ??
      (String(building.id).startsWith('explore-')
        ? 180
        : 360),

    height:
      buildingImageSizes[
        building.id as keyof typeof buildingImageSizes
      ] ??
      (String(building.id).startsWith('explore-')
        ? 180
        : 360),

    transform: [
      {
        scaleX: building.flipped ? -1 : 1,
      },
    ],
  }}
  resizeMode="contain"
/>
          </Pressable>
        ))}

      {placingItem && isEditMode && (
  <>
    {Array.from({ length: previewSize.cols }, (_, c) =>
      Array.from({ length: previewSize.rows }, (_, r) => {
        const tilePos = gridToScreen(
          previewGrid.col + c,
          previewGrid.row + r
        );

        return (
          <Image
            key={`${c}-${r}`}
            source={grassTile}
            style={[
              styles.tile,
              {
                left: tilePos.x,
                top: tilePos.y,
                tintColor: isCityBlack
  ? theme.text
  : '#38d26b',
opacity: isCityBlack ? 0.35 : 0.55,
                zIndex: 5,
              },
            ]}
          />
        );
      })
    )}
  </>
)}

      {placingItem && (
        <Image
          source={
            buildingImages[
              placingItem.id as keyof typeof buildingImages
            ] ??
            placingItem.image ??
            DEFAULT_EXPLORATION_REWARD_IMAGE
          }
          style={{
            position: 'absolute',
            width:
  buildingImageSizes[
    placingItem.id as keyof typeof buildingImageSizes
  ] ??
  (String(placingItem.id).startsWith('explore-')
    ? 180
    : 360),

height:
  buildingImageSizes[
    placingItem.id as keyof typeof buildingImageSizes
  ] ??
  (String(placingItem.id).startsWith('explore-')
    ? 180
    : 360),
            left:
  gridToScreen(previewGrid.col, previewGrid.row).x +
  (buildingOffsets[
    placingItem.id as keyof typeof buildingOffsets
  ]?.x ??
  (String(placingItem.id).startsWith('explore-')
    ? 0
    : -70)),

top:
  gridToScreen(previewGrid.col, previewGrid.row).y +
  (buildingOffsets[
    placingItem.id as keyof typeof buildingOffsets
  ]?.y ??
  (String(placingItem.id).startsWith('explore-')
    ? -80
    : -210)),
            opacity: isCityBlack ? 0.78 : 0.65,
            zIndex: 10,
            transform: [
  {
    scaleX: placingItem.flipped ? -1 : 1,
  },
],
          }}
          resizeMode="contain"
        />
      )}

      <Animated.View
  style={[
    styles.foxCharacter,
    foxAnimatedStyle,
    {
      opacity:
        rootyRuntimeReady
          ? 1
          : 0,
    },
  ]}
>
  <RootySprite
    action={rootyAction}
    playing={rootyRuntimeReady && rootyAppActive && rootyHomeFocused}
    size={80}
    direction={foxDirection}
    onPress={
      handleRootyPress
    }
    onLongPress={
      handleRootyLongPress
    }
    onAnimationEnd={
      handleRootyAnimationEnd
    }
  />
</Animated.View>
    </Animated.View>
  </View>
</GestureDetector>

          {/* 버튼 */}
          <View style={styles.villageButtonRow}>
  <Pressable
  style={[
    styles.villageButton,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
  onPress={() => setVillageModal('가방')}
>
  <Ionicons
    name="briefcase-outline"
    size={24}
    color={theme.text}
  />
</Pressable>

 <Pressable
  style={[
    styles.villageButton,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
  onPress={() => setVillageModal('상점')}
>
  <Ionicons
    name="storefront-outline"
    size={24}
    color={theme.text}
  />
</Pressable>

    <Pressable
    accessibilityRole="button"
    accessibilityLabel="내 마을 크게보기"
    style={[
      styles.largeVillageButton,
      {
        backgroundColor: theme.card,
        borderColor: theme.line,
        borderWidth: 1,
        borderRadius: isCityBlack ? 4 : 14,
      },
    ]}
    onPress={() => {
      router.push({
        pathname: '/friend-village',
        params: {
          userId:
            firebaseAuth.currentUser?.uid ?? '',
          nickname:
            onboardingData?.nickname ?? '루트워커',
          profileEmoji: '🦊',
          placedBuildings:
            JSON.stringify(placedBuildings),
          isOwnVillage: '1',
          // ROOTY_BEHAVIOR_V35_OWN_VILLAGE_LARGE_VIEW_ROOTY
          rootyAction:
            rootyActionRef.current,
          rootyDirection:
            rootyDirectionRef.current,
          rootyX:
            String(foxX.value),
          rootyY:
            String(foxY.value),
        },
      });
    }}
  >
    <Ionicons
      name="expand-outline"
      size={18}
      color={theme.text}
    />

    <Text
      style={[
        styles.largeVillageButtonText,
        {
          color: theme.text,
        },
      ]}
    >
      크게보기
    </Text>
  </Pressable>

<View style={{ flex: 1 }} />

  {isEditMode && (
  <Pressable
    style={[
      styles.villageButton,
      {
        backgroundColor: theme.button,
        borderColor: theme.strongLine,
        borderWidth: 1,
        borderRadius: isCityBlack ? 4 : 14,
      },
    ]}
    onPress={saveVillageEdit}
  >
    <Ionicons
      name="save-outline"
      size={20}
      color={theme.buttonText}
    />
  </Pressable>
)}

  <Pressable
  style={[
    styles.editVillageButton,
    {
      backgroundColor: isEditMode
        ? theme.button
        : theme.card,
      borderColor: isEditMode
        ? theme.strongLine
        : theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
    onPress={() => {
      if (!isEditMode) {
        setOriginalPlacedBuildings(
          JSON.parse(JSON.stringify(placedBuildings))
        );
        setIsEditMode(true);
        return;
      }

      setNoticeModal({
  title: '편집 종료',
  message: '저장하지 않고 종료하면 이전 상태로 돌아갑니다.',
  cancelText: '취소',
  confirmText: '종료',
  onConfirm: () => {
    applyPlacedBuildings(originalPlacedBuildings);

    const next = {
      ...onboardingData,
      placedBuildings: originalPlacedBuildings,
    };

    saveRootData(next);

    setPlacingItem(null);
    setEditingPlacedId(null);
    setIsPlacingFromBag(false);
    setDragStart(null);
    setIsEditMode(false);
  },
});
    }}
  >
    <Ionicons
  name="create-outline"
  size={18}
  color={
    isEditMode
      ? theme.buttonText
      : theme.text
  }
/>
    <Text
  style={[
    styles.editVillageText,
    {
      color: isEditMode
        ? theme.buttonText
        : theme.text,
    },
  ]}
>
  편집
</Text>
  </Pressable>
</View>

</View>

        {/* 카테고리 */}
        <View
          style={styles.categoryRow}
        >

          {categories.map(
            (category) => {
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
  styles.categoryCard,
  {
    backgroundColor: selected
      ? theme.button
      : theme.card,
    borderColor: selected
      ? theme.strongLine
      : theme.line,
    borderRadius: isCityBlack ? 4 : 22,
  },
]}
                >
               <Text
  style={[
    styles.categoryTitle,
    {
      color: selected
        ? theme.buttonText
        : theme.text,
    },
  ]}
>
  {category.icon} {category.label} Lv.{categoryStats[category.id]?.level ?? 1}
</Text>
                  <View style={styles.expRow}>
  <View
  style={[
    styles.expBar,
    {
      backgroundColor: selected
        ? isCityBlack
          ? 'rgba(0,0,0,0.35)'
          : 'rgba(255,255,255,0.35)'
        : theme.card2,
    },
  ]}
>
    <View
  style={[
    styles.expFill,
    {
      width: `${((categoryStats[category.id]?.currentXp ?? 0) / 30) * 100}%`,
      backgroundColor: selected
        ? theme.buttonText
        : theme.button,
    },
  ]}
/>
  </View>

  <Text
  style={[
    styles.expText,
    {
      color: selected
        ? theme.buttonText
        : theme.subText,
    },
  ]}
>
   {categoryStats[category.id]?.currentXp ?? 0}/30
  </Text>
</View>
                </Pressable>
              );
            }
          )}
        </View>

        {/* 결과목표 */}
        <View
  style={[
    styles.goalCard,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 24,
    },
  ]}
>
         {selectedResultGoal ? (
  <>
    <View style={styles.simpleGoalTop}>
<Text
  numberOfLines={2}
  style={[
    styles.simpleSectionTitle,
    {
      color: theme.text,
      flex: 1,
      marginRight: 12,
    },
  ]}
>
  {String(
    selectedResultGoal.resultGoal ?? ''
  ).slice(0, 12)}
</Text>

  <Pressable
  style={[
    styles.smallEditButton,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 14,
      borderWidth: 1,
    },
  ]}
        onPress={() =>
          setEditingResultGoal({
            ...selectedResultGoal,
          })
        }
      >
        <Text
  style={[
    styles.smallEditText,
    { color: theme.text },
  ]}
>
          수정
        </Text>
      </Pressable>
    </View>

      <View style={styles.simpleGoalBottomRow}>
  <Text
  style={[
    styles.simpleGoalDate,
    { color: theme.subText },
  ]}
>
    {goalEndInfo?.endText ?? '-'} 까지
  </Text>

  <Text
  style={[
    styles.simpleRemainText,
    { color: theme.subText },
  ]}
>
  {goalEndInfo?.remainDays ?? 0}일 남음
</Text>
</View>
  </>
) : (
            <>
              <Text
                style={
                  styles.emptyFox
                }
              >
                🦊
              </Text>

              <Text
  style={[
    styles.emptyGoalTitle,
    { color: theme.text },
  ]}
>
                아직 결과목표가
                없습니다.
              </Text>

              <Text
  style={[
    styles.emptyGoalDesc,
    { color: theme.subText },
  ]}
>
                결과목표와 행동목표를
                함께 만들어 주세요.
              </Text>

        <Pressable
  style={[
    styles.makeGoalButton,
    {
      backgroundColor:
        isCityBlack
          ? theme.card
          : '#fff',

      borderColor: theme.line,
      borderWidth: 1,
      borderRadius:
        isCityBlack
          ? 4
          : 14,
    },
  ]}
  onPress={() =>
    router.push({
      pathname: '/add-result-goal',
      params: {
        category: selectedCategory,
        requireActionGoal: 'true',
      },
    })
  }
>
  <Text
    style={[
      styles.makeGoalText,
      { color: theme.text },
    ]}
  >
    ✦ 결과목표 만들기
  </Text>
</Pressable>
            </>
          )}
        </View>

        {/* 행동목표 */}
       <View style={styles.todayTodoHeader}>
  <Text
  style={[
    styles.todayTodoTitle,
    { color: theme.text },
  ]}
>
  오늘의 할일
</Text>
  </View>

        {filteredActionGoals.map(
          (goal) => {
           const todayKey =
  formatDateKey(
    new Date()
  );

const hasCompletedDates =
  Array.isArray(
    goal?.completedDates
  );

const completed =
  hasCompletedDates
    ? goal.completedDates.includes(
        todayKey
      )
    : (
        goal.completedDays ??
        []
      ).includes(
        todayIndex
      );

   const weekSummary =
      getActionGoalWeekSummary(
        goal,
        onboardingData
          ?.actionLogs ?? []
      );

      const controlBackgroundColor =
  theme.card;

const controlBorderColor =
  completed
    ? theme.strongLine
    : theme.line;

const controlTextColor =
  theme.text;

            return (

 <View
  key={goal.id}
  style={[
    styles.actionCard,
    {
  backgroundColor:
    theme.card,

  borderColor:
    controlBorderColor,

  borderRadius:
    isCityBlack ? 4 : 24,
},
  ]}
>
   <View style={styles.actionTop}>
  <View style={{ flex: 1, paddingRight: 8 }}>
    <Text
      style={[
        styles.actionTitle,
        {
          color: theme.text,
        },
      ]}
    >
      {isTimerGoal(goal) ? '⏱ ' : '▣ '}
      {goal.title}
    </Text>
  </View>

  <View style={styles.actionHeaderButtonRow}>
    <Pressable
      style={[
        styles.actionRecordButton,
        {
  backgroundColor:
    controlBackgroundColor,

  borderColor:
    controlBorderColor,

  borderWidth: 0.5,

  borderRadius:
    isCityBlack ? 4 : 12,
},
      ]}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/record',
          params: {
            actionGoalId: String(goal.id),
            actionGoalTitle: goal.title,
            actionGoalCategory: goal.category,
          },
        })
      }
    >
      <Text
        style={[
          styles.actionRecordButtonText,
          { color: controlTextColor }
        ]}
      >
        기록
      </Text>
    </Pressable>

    <Pressable
      style={[
        styles.actionEditButton,
        {
  backgroundColor:
    controlBackgroundColor,

  borderColor:
    controlBorderColor,

  borderWidth: 0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
},
      ]}
      onPress={() => {
  const savedDays =
    Array.isArray(
      goal?.selectedDays
    )
      ? goal.selectedDays
          .map(Number)
          .filter(
            (
              day: number
            ) =>
              day >= 0 &&
              day <= 6
          )
          .sort(
            (
              a: number,
              b: number
            ) => a - b
          )
      : [];

  const normalizedRepeatType =
    goal?.repeatType ===
      'weekdays' ||
    (
      !goal?.repeatType &&
      savedDays.length > 0
    )
      ? 'weekdays'
      : 'weeklyCount';

  setEditingGoal({
    ...goal,

    repeatType:
      normalizedRepeatType,

    selectedDays:
      savedDays,

    weeklyCount:
      normalizedRepeatType ===
        'weekdays'
        ? savedDays.length
        : Math.min(
            7,
            Math.max(
              1,
              Number(
                goal?.weeklyCount ??
                  3
              )
            )
          ),
  });
}}
    >
      <Text
        style={[
          styles.editTextButtonText,
          {
  color:
    controlTextColor,
},
        ]}
      >
        수정
      </Text>
    </Pressable>
  </View>
</View>
<View
  style={
    styles.actionBottomRow
  }
>
  {/* 왼쪽: 완료 또는 시간 기록 */}
  <View
    style={
      styles.actionStatusColumn
    }
  >
    <View
      style={
        styles.actionButtonRow
      }
    >
      {isTimerGoal(goal) ? (
  /*
   * 현재 기록 중이라면
   * 완료 여부보다 기록 중 화면을
   * 먼저 표시합니다.
   */
  isRunningGoal(goal) ? (
    <Pressable
      onPress={() =>
        stopTimerGoal(
          goal.id
        )
      }
      style={[
        styles.stopButton,
        styles.actionStatusButton,
        {
          backgroundColor:
            isCityBlack
              ? '#ef4444'
              : '#c93f36',

          borderColor:
            isCityBlack
              ? '#f87171'
              : '#c93f36',

          borderWidth: 0,

          borderRadius:
            isCityBlack
              ? 4
              : 16,
        },
      ]}
    >
      <View
        style={
          styles.runningTimerInfo
        }
      >
        <Text
          allowFontScaling={
            false
          }
          numberOfLines={
            1
          }
          adjustsFontSizeToFit
          minimumFontScale={
            0.85
          }
          style={[
            styles.runningTimerLine,
            {
              color:
                '#fff',
            },
          ]}
        >
          시간{' '}
          {formatTime(
            timerSeconds
          )}
          {'  ·  '}
          거리{' '}
          {gpsEnabled
            ? `${gpsDistanceKm.toFixed(
                2
              )} km`
            : '-'}
        </Text>
      </View>
    </Pressable>
  ) : completed ? (
    /*
     * 오늘 시간기록을 저장한 뒤에는
     * 시작 버튼 대신 완료됨을 표시합니다.
     */
    <Pressable
      disabled
      style={[
        styles.completeButton,
        styles.actionStatusButton,
        {
          backgroundColor:
            controlBackgroundColor,

          borderColor:
            controlBorderColor,

          borderWidth:
            0.5,

          borderRadius:
            isCityBlack
              ? 4
              : 12,
        },
      ]}
    >
      <Text
        style={[
          styles.completeText,
          {
            color:
              controlTextColor,
          },
        ]}
      >
        ✓ 완료됨
      </Text>
    </Pressable>
  ) : (
    /*
     * 아직 오늘 기록하지 않은
     * 시간기록형 목표입니다.
     */
    <Pressable
      disabled={
        isAnotherTimerRunning(
          goal
        )
      }
      onPress={() =>
        startTimerGoal(
          goal.id
        )
      }
      style={[
        styles.completeButton,
        styles.actionStatusButton,
        {
          backgroundColor:
            controlBackgroundColor,

          borderColor:
            controlBorderColor,

          borderWidth:
            0.5,

          borderRadius:
            isCityBlack
              ? 4
              : 12,
        },

        isAnotherTimerRunning(
          goal
        ) && {
          opacity: 0.4,
        },
      ]}
    >
      <Text
        style={[
          styles.completeText,
          {
            color:
              controlTextColor,
          },
        ]}
      >
        {isAnotherTimerRunning(
          goal
        )
          ? '다른 기록중'
          : '▷ 시작'}
      </Text>
    </Pressable>
  )
) : (
        <Pressable
  disabled={completed}
  onPress={() => {
    if (completed) {
      return;
    }

    toggleComplete(
      goal.id
    );
  }}
  style={[
    styles.completeButton,
    styles.actionStatusButton,
    {
      backgroundColor:
        controlBackgroundColor,

      borderColor:
        controlBorderColor,

      borderWidth: 0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
>
  <Text
    style={[
      styles.completeText,
      {
        color:
          controlTextColor,
      },
    ]}
  >
    {completed
      ? '✓ 완료됨'
      : '✓ 완료'}
  </Text>
</Pressable>
      )}
    </View>
  </View>

  {/* 오른쪽: 이번 주 진행률 */}
  <View
    style={[
      styles.repeatProgressBox,
      {
  backgroundColor:
    controlBackgroundColor,

  borderColor:
    controlBorderColor,

  borderWidth: 0,

  borderRadius:
    isCityBlack
      ? 4
      : 14,
},
    ]}
  >
    <Text
  allowFontScaling={false}
  numberOfLines={1}
  adjustsFontSizeToFit
  minimumFontScale={0.75}
  style={[
    styles.repeatProgressText,
    {
  color:
    controlTextColor,
},
  ]}
>
  주 {weekSummary.completedCount}/
  {weekSummary.targetCount}회 ·{' '}
  {weekSummary.scheduleText}
</Text>
  </View>
</View>
              </View>
            );
          }
        )}

        <Pressable
  style={[
    styles.addButton,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderRadius: isCityBlack ? 4 : 22,
    },
  ]}
          onPress={() => {
            if (
              selectedResultGoal
            ) {
              router.push({
                pathname:
                  '/add-action-goal',
                params: {
                  category:
                    selectedCategory,
                },
              });
            } else {
              router.push({
                pathname:
                  '/add-result-goal',
                params: {
                  category:
                    selectedCategory,
                  requireActionGoal:
                    'true',
                },
              });
            }
          }}
        >
          <Text
  style={[
    styles.addButtonText,
    { color: theme.subText },
  ]}
>
  ＋ 행동목표 추가
</Text>
        </Pressable>

        <View
          style={{ height: 80 }}
        />
      </ScrollView>

      {/* GPS */}
      <Modal
        visible={
          gpsModalGoalId !== null
        }
        animationType="slide"
        transparent
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
  style={[
    styles.modalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 28,
    },
  ]}
>
            <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
  GPS 추적을 사용할까요?
</Text>

<View
  style={{
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  }}
>
  {/* GPS 사용 안 함 */}
  <Pressable
    onPress={() =>
      confirmStartTimer(
        gpsModalGoalId!,
        false
      )
    }
    style={{
      flex: 1,

      backgroundColor:
        'transparent',

      borderColor:
        theme.strongLine,

      borderWidth: 0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 12,

      paddingVertical: 12,
      paddingHorizontal: 8,

      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text
      style={{
        color:
          theme.text,

        fontSize: 16,
        fontWeight: '800',
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      GPS 사용 안 함
    </Text>
  </Pressable>

  {/* GPS 사용 */}
  <Pressable
    onPress={() =>
      confirmStartTimer(
        gpsModalGoalId!,
        true
      )
    }
    style={{
      flex: 1,

      backgroundColor:
        'transparent',

      borderColor:
        theme.strongLine,

      borderWidth: 0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 12,

      paddingVertical: 12,
      paddingHorizontal: 8,

      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text
      style={{
        color:
          theme.text,

        fontSize: 16,
        fontWeight: '800',
      }}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      GPS 사용
    </Text>
  </Pressable>
</View>


          </View>
        </View>
      </Modal>



{/* 기록저장 수정 modal */}
<Modal
  visible={recordModalVisible}
  transparent
  animationType="slide"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.recordModalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 28,
    },
  ]}
>
     <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
  기록을 어떻게 남길까요?
</Text>


{gpsEnabled && gpsCoordinates.length > 0 && (
  <View style={styles.gpsResultBox}>

    <View
      ref={routeCaptureRef}
      collapsable={false}
      style={styles.routeCaptureCard}
    >
      <MapView
  provider={PROVIDER_GOOGLE}
  mapType="standard"
  customMapStyle={rootMapStyle}
  style={styles.routeCaptureMap}
        initialRegion={getRouteRegion(gpsCoordinates)}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <MapPolyline
  coordinates={gpsCoordinates}
  strokeWidth={9}
  strokeColor="#4DE1C1"
/>

        <Marker
  coordinate={gpsCoordinates[0]}
  title="시작"
>
  <View style={styles.routeStartMarker}>
    <Text style={styles.routeMarkerText}>S</Text>
  </View>
</Marker>

<Marker
  coordinate={gpsCoordinates[gpsCoordinates.length - 1]}
  title="도착"
>
  <View style={styles.routeEndMarker}>
    <Text style={styles.routeMarkerText}>F</Text>
  </View>
</Marker>

</MapView>

<View style={styles.routeMapTitleBadge}>
  <Text style={styles.routeMapTitleBadgeText}>
    GPS 이동 기록
  </Text>
</View>

      <View style={styles.routeActionTitleBadge}>
  <Text style={styles.routeActionTitleBadgeText}>
    {pendingCompleteGoal?.title ?? '운동 기록'}
  </Text>
</View>

<View style={styles.routeCaptureOverlay}>
  <View style={styles.routeCaptureStatsLine}>
    <Text style={styles.routeCaptureStatValue}>
      {gpsDistanceKm.toFixed(2)}km
    </Text>

    <Text style={styles.routeCaptureStatValue}>
      {formatRecordClockTime(pendingMinutes)}
    </Text>
  </View>

  <View style={styles.routeCaptureStatsLine}>
  <Text style={styles.routeCaptureStatValue}>
    {calculateSpeedKmh(
      gpsDistanceKm,
      pendingMinutes
    ).toFixed(1)}km/h
  </Text>

  <Text style={styles.routeCaptureStatValue}>
    {calculatePreviewCalories(
      pendingCompleteGoal,
      pendingMinutes,
      calorieWeight
    )}kcal
  </Text>
</View>
</View>
    </View>
  </View>
)}

  {(selectedPhoto?.uri || decoratedPhotoUri) && (
 <View
  style={[
    styles.selectedPhotoPreviewBox,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 22,
    },
  ]}
>
    <Image
      source={{
        uri: decoratedPhotoUri ?? selectedPhoto?.uri,
      }}
      style={styles.selectedPhotoPreview}
      resizeMode="cover"
    />

    <Pressable
      style={styles.photoDecorateMiniButton}
      onPress={openDecorateModal}
    >
      <Text style={styles.photoDecorateMiniButtonText}>
        꾸미기
      </Text>
    </Pressable>
  </View>
)}

      <View style={styles.photoButtonRow}>

  <Pressable
  style={[
    styles.photoHalfButton,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
  onPress={pickPhotoFromGallery}
>
   <Text
  style={[
    styles.photoButtonText,
    { color: theme.text },
  ]}
>
  사진 앨범
</Text>
  </Pressable>

  <Pressable
  style={[
    styles.photoHalfButton,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
  onPress={takePhoto}
>
    <Text
  style={[
    styles.photoButtonText,
    { color: theme.text },
  ]}
>
  사진 찍기
</Text>
  </Pressable>

</View>



     <View style={styles.recordModalBottomRow}>
  <Pressable
  style={[
    styles.recordCancelSmallButton,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
    onPress={() => {
      setRecordModalVisible(false);
  setRecordMemo('');
  setFocusRating(5);
  setSelectedPhoto(null);
  setDecoratedPhotoUri(null);
  setDecorateModalVisible(false);
  setPendingCompleteGoal(null);
  setPendingMinutes(0);

  setTimerStartAt(null);
  setGpsEnabled(false);
  setGpsDistanceKm(0);
  setGpsCoordinates([]);
    }}
  >
    <Text
  style={[
    styles.recordCancelSmallText,
    { color: theme.subText },
  ]}
>
  취소
</Text>
  </Pressable>

  <Pressable
  style={[
    styles.recordNoPhotoSmallButton,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
    onPress={() => {
  console.log('RECORD NO PHOTO SAVE BUTTON PRESSED');

  requestCompleteRecordSave({
  withoutPhoto: true,
});
}}
  >
   <Text
  style={[
    styles.recordNoPhotoSmallText,
    { color: theme.text },
  ]}
>
  사진없이저장
</Text>
  </Pressable>

<Pressable
  style={[
    styles.recordSaveSmallButton,
    {
      backgroundColor: theme.button,
      borderColor: theme.strongLine,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
    onPress={() => {
  console.log('RECORD SAVE BUTTON PRESSED');

  requestCompleteRecordSave();
}}
  >
   <Text
  style={[
    styles.recordSaveSmallText,
    { color: theme.buttonText },
  ]}
>
  저장
</Text>
  </Pressable>
</View>
    </View>
  </View>
</Modal>

<Modal
  visible={
    completionSaveRequest !== null
  }
  transparent
  animationType="fade"
>
  <KeyboardAvoidingView
    style={styles.modalOverlay}
    behavior={
      Platform.OS === 'ios'
        ? 'padding'
        : 'height'
    }
  >
    <View
      style={[
        styles.completionCalorieBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 28,
        },
      ]}
    >
      <Text
        style={[
          styles.completionCalorieTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        ✅{' '}
        {completionSaveRequest
          ?.title}{' '}
        완료!
      </Text>

      <Text
        style={[
          styles.completionRewardText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        +
        {completionSaveRequest
          ?.rewardXp ?? 0}{' '}
        XP
        {'\n'}
        +5 포인트
      </Text>

      {(
        completionSaveRequest
          ?.minutes ?? 0
      ) > 0 && (
        <Text
          style={[
            styles.completionInfoText,
            {
              color:
                theme.subText,
            },
          ]}
        >
          운동 시간:{' '}
          {
            completionSaveRequest
              ?.minutes
          }
          분
        </Text>
      )}

      {completionSaveRequest
        ?.useGps && (
        <Text
          style={[
            styles.completionInfoText,
            {
              color:
                theme.subText,
            },
          ]}
        >
          이동 거리:{' '}
          {completionSaveRequest
            .distanceKm
            .toFixed(2)}
          km
        </Text>
      )}

      <View
        style={
          styles.completionCalorieRow
        }
      >
        <Text
          style={[
            styles.completionCalorieLabel,
            {
              color:
                theme.subText,
            },
          ]}
        >
          소모 칼로리
        </Text>

        <TextInput
          value={
            completionCalorieInput
          }
          onChangeText={(value) => {
            const onlyNumbers =
              value
                .replace(
                  /[^0-9]/g,
                  ''
                )
                .slice(
                  0,
                  5
                );

            setCompletionCalorieInput(
              onlyNumbers
            );
          }}
          keyboardType="number-pad"
          maxLength={5}
          placeholder="직접 입력"
          placeholderTextColor={
            theme.subText
          }
          style={[
            styles.completionCalorieInput,
            {
              color:
                theme.text,

              backgroundColor:
                theme.card,

              borderColor:
                theme.line,
            },
          ]}
        />

        <Text
          style={[
            styles.completionCalorieUnit,
            {
              color:
                theme.subText,
            },
          ]}
        >
          kcal
        </Text>
      </View>

      <Pressable
        disabled={
          isCompletionSaving
        }
        style={[
          styles.completionCalorieConfirmButton,
          {
            backgroundColor:
              'transparent',

            borderColor:
              theme.strongLine,

            borderRadius:
              isCityBlack
                ? 4
                : 12,

            opacity:
              isCompletionSaving
                ? 0.5
                : 1,
          },
        ]}
        onPress={async () => {
          if (
            !completionSaveRequest ||
            isCompletionSaving
          ) {
            return;
          }

          const request =
            completionSaveRequest;

          const manualCalories =
            Math.max(
              0,
              Math.round(
                Number(
                  completionCalorieInput
                ) || 0
              )
            );

          try {
            setIsCompletionSaving(
              true
            );

            await saveCompleteRecord({
              withoutPhoto:
                request
                  .withoutPhoto,

              manualCalories,

              hideCompletionNotice:
                true,
            });

            setCompletionSaveRequest(
              null
            );

            setCompletionCalorieInput(
              ''
            );
          } finally {
            setIsCompletionSaving(
              false
            );
          }
        }}
      >
        <Text
          style={[
            styles.completionCalorieConfirmText,
            {
              color:
                theme.text,
            },
          ]}
        >
          {isCompletionSaving
            ? '저장 중...'
            : '확인'}
        </Text>
      </Pressable>
    </View>
  </KeyboardAvoidingView>
</Modal>

<Modal
  visible={decorateModalVisible}
  transparent
  animationType="slide"
>
  <GestureHandlerRootView style={{ flex: 1 }}>
  <View style={styles.decorateOverlay}>
    <View
  style={[
    styles.decorateBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 24,
    },
  ]}
>
      <Text
  style={[
    styles.decorateTitle,
    { color: theme.text },
  ]}
>
  ✨ 기록 꾸미기
</Text>

      <View
  ref={decorateCaptureRef}
  collapsable={false}
  style={[
    styles.decorateCanvas,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 18,
      overflow: 'hidden',
    },
  ]}
>
        {selectedPhoto?.uri && (
  <View
    pointerEvents="none"
    style={StyleSheet.absoluteFillObject}
  >
    <Image
      source={{ uri: selectedPhoto.uri }}
      style={styles.decorateImage}
      resizeMode="cover"
    />
  </View>
)}

       {decorateStickers.map((sticker) => (
  <DraggableDecorateSticker
  key={sticker.id}
  sticker={sticker}
  isCaptureMode={isDecorateSaving}

onMove={(id, x, y, scale) => {
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
}}
    onRemove={(id) => {
      setDecorateStickers((prev) =>
        prev.filter((item) => item.id !== id)
      );
    }}
  />
))}
      </View>

     <Text
  style={[
    styles.decorateHint,
    { color: theme.subText },
  ]}
>
  스티커를 손가락으로 움직일 수 있어요.
</Text>

      <View style={styles.decorateBottomBar}>
        <Pressable
          style={[
            styles.decorateCloseButton,
            {
              backgroundColor: theme.card2,
              borderColor: theme.line,
              borderWidth: 1,
              borderRadius: isCityBlack ? 4 : 14,
            },
          ]}
          onPress={() => {
            setDecorateModalVisible(false);
            closeCustomStickerModal();
          }}
        >
          <Text
            style={[
              styles.decorateCloseText,
              { color: theme.subText },
            ]}
          >
            닫기
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.decorateTextButton,
            {
              backgroundColor: theme.card2,
              borderColor: theme.line,
              borderWidth: 1,
              borderRadius: isCityBlack ? 4 : 14,
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
              { color: theme.text },
            ]}
          >
            글쓰기
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.decorateApplyButton,
            {
              backgroundColor: theme.button,
              borderColor: theme.strongLine,
              borderWidth: 1,
              borderRadius: isCityBlack ? 4 : 14,
            },
          ]}
          onPress={saveDecoratedPhoto}
        >
          <Text
            style={[
              styles.decorateApplyText,
              { color: theme.buttonText },
            ]}
          >
            적용하기
          </Text>
        </Pressable>
      </View>

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
                    backgroundColor: theme.button,
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
  </View>
    </GestureHandlerRootView>
</Modal>

<Modal
  visible={editingResultGoal !== null}
  transparent
  animationType="slide"
  onRequestClose={() =>
    setEditingResultGoal(null)
  }
>
  <KeyboardAvoidingView
    style={styles.modalKeyboardAvoidingView}
    behavior={
      Platform.OS === 'ios'
        ? 'padding'
        : 'height'
    }
    keyboardVerticalOffset={
      Platform.OS === 'ios'
        ? 20
        : 10
    }
  >
    <View style={styles.modalOverlay}>
      <ScrollView
        style={styles.resultGoalEditScroll}
        contentContainerStyle={
          styles.resultGoalEditScrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.modalBox,
            styles.resultGoalEditModalBox,
            {
              backgroundColor: theme.card,
              borderColor: theme.line,
              borderWidth: 1,
              borderRadius:
                isCityBlack ? 4 : 28,
            },
          ]}
        >
      <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
  결과목표 수정
</Text>


     <Text
  style={[
    styles.inputLabel,
    { color: theme.subText },
  ]}
>
  결과목표 이름
</Text>

      <TextInput
  value={editingResultGoal?.resultGoal ?? ''}
  onChangeText={(text) =>
    setEditingResultGoal({
      ...editingResultGoal,
      resultGoal: text,
    })
  }
maxLength={12}
  style={[
  styles.goalInput,
  {
    backgroundColor:
      theme.card,

    borderColor:
      theme.line,

    borderWidth:
      0.5,

    color:
      theme.text,

    borderRadius:
      isCityBlack
        ? 4
        : 12,
  },
]}
  placeholderTextColor={theme.subText}
/>

      <Text
  style={[
    styles.inputLabel,
    { color: theme.subText },
  ]}
>
  도전 기간
</Text>

      <View style={styles.durationRow}>
        {['1주', '2주', '3주', '4주'].map((duration) => (
          <Pressable
            key={duration}
            onPress={() =>
              setEditingResultGoal({
                ...editingResultGoal,
                duration,
              })
            }
            style={[
  styles.durationButton,
  {
  backgroundColor:
    theme.card,

  borderColor:
    editingResultGoal
      ?.duration === duration
      ? theme.strongLine
      : theme.line,

  borderWidth:
    editingResultGoal
      ?.duration === duration
      ? 1
      : 0.5,

  borderRadius:
    isCityBlack
      ? 4
      : 12,
},
]}
          >
            <Text
  style={[
    styles.durationText,
    {
      color:
        theme.text,
    },
  ]}
>
  {duration}
</Text>
          </Pressable>
        ))}
      </View>

<View style={styles.customDurationRow}>
  <TextInput
  value={
    editingResultGoal?.duration?.replace('주', '') ?? ''
  }
  keyboardType="number-pad"
  returnKeyType="done"
  selectTextOnFocus
  onChangeText={(text) => {
    const onlyNumber = text.replace(/[^0-9]/g, '');

    setEditingResultGoal({
      ...editingResultGoal,
      duration: onlyNumber ? `${onlyNumber}주` : '',
    });
  }}
  style={[
  styles.customDurationInput,
  {
    backgroundColor:
      theme.card,

    borderColor:
      theme.line,

    borderWidth:
      0.5,

    color:
      theme.text,

    borderRadius:
      isCityBlack
        ? 4
        : 12,
  },
]}
placeholder="직접 입력"
placeholderTextColor={theme.subText}
/>

  <Text
  style={[
    styles.customDurationText,
    { color: theme.subText },
  ]}
>
  주
</Text>
</View>

      <View style={styles.editModalButtonRow}>
  <Pressable
  style={[
  styles.cancelEditButton,
  {
    backgroundColor:
      theme.card,

    borderColor:
      theme.line,

    borderWidth:
      0.5,

    borderRadius:
      isCityBlack
        ? 4
        : 12,
  },
]}
  onPress={() => setEditingResultGoal(null)}
>
  <Text
  style={[
    styles.cancelEditText,
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
    !editingResultGoal?.duration?.replace(/[^0-9]/g, '')
  }
  style={[
  styles.saveEditButton,
  {
    backgroundColor:
      theme.card,

    borderColor:
      theme.strongLine,

    borderWidth:
      1,

    borderRadius:
      isCityBlack
        ? 4
        : 12,
  },

  !editingResultGoal
    ?.duration
    ?.replace(
      /[^0-9]/g,
      ''
    ) && {
    opacity: 0.4,
  },
]}
  onPress={() => {
  const resultGoalTitle =
    String(
      editingResultGoal?.resultGoal ??
        ''
    ).trim();

  const durationNumber =
    editingResultGoal?.duration?.replace(
      /[^0-9]/g,
      ''
    ) ?? '';

  if (!resultGoalTitle) {
    setNoticeModal({
      title: '결과목표 확인',
      message:
        '결과목표를 입력해 주세요.',
    });

    return;
  }

  if (
    resultGoalTitle.length > 12
  ) {
    setNoticeModal({
      title: '결과목표 확인',
      message:
        '결과목표는 12자 이하로 입력해 주세요.',
    });

    return;
  }

  if (!durationNumber) {
    return;
  }

  const updatedGoals =
    (
      onboardingData?.goals ??
      []
    ).map((goal: any) =>
      goal.category ===
      selectedCategory
        ? {
            ...editingResultGoal,

            resultGoal:
              resultGoalTitle,

            duration:
              `${durationNumber}주`,
          }
        : goal
    );

  const next = {
    ...onboardingData,
    goals: updatedGoals,
  };

  saveRootData(next);
  setEditingResultGoal(null);
}}
>
  <Text
  style={[
    styles.saveEditText,
    {
      color:
        theme.text,
    },
  ]}
>
  저장
</Text>
</Pressable>

  <Pressable
  style={[
  styles.deleteEditButton,
  {
    backgroundColor:
      theme.card,

    borderColor:
      isCityBlack
        ? '#ef4444'
        : '#c93f36',

    borderWidth:
      0.5,

    borderRadius:
      isCityBlack
        ? 4
        : 12,
  },
]}
    onPress={() => {
  if (
    !editingResultGoal
  ) {
    return;
  }

  /*
   * 수정 모달이 닫힌 이후에도
   * 종료 대상을 사용할 수 있도록 복사합니다.
   */
  const targetResultGoal = {
    ...editingResultGoal,
  };

  const targetCategory =
    String(
      targetResultGoal
        ?.category ??
      selectedCategory ??
      ''
    );

  const linkedActionGoalCount =
    (
      onboardingData
        ?.actionGoals ??
      []
    ).filter(
      (goal: any) =>
        String(
          goal?.category ??
            ''
        ) ===
        targetCategory
    ).length;

  /*
   * 먼저 결과목표 수정 모달을 닫습니다.
   */
  setEditingResultGoal(
    null
  );

  /*
   * 수정 모달이 닫힌 뒤
   * 종료 확인창을 표시합니다.
   */
  setTimeout(() => {
    setNoticeModal({
      title:
        '결과목표를 종료할까요?',

      message:
        '이 결과목표를 종료하고 보관합니다.\n' +
        `연결된 행동목표 ${linkedActionGoalCount}개도 함께 종료되어 보관됩니다.\n` +
        '기존 수행 기록과 XP·포인트는 그대로 유지됩니다.',

      confirmText:
        '종료 및 보관',

      cancelText:
        '취소',

      onConfirm: () =>
        archiveResultGoal(
          targetResultGoal
        ),
    });
  }, 150);
}}
  >
   <Text
  style={[
    styles.deleteEditText,
    {
      color: isCityBlack
        ? '#f87171'
        : '#c93f36',
    },
  ]}
>
  종료 및 보관
</Text>
  </Pressable>
</View>
        </View>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>



{/* 행동목표 수정 modal */}
<Modal
  visible={editingGoal !== null}
  transparent
  animationType="slide"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 28,
    },
  ]}
>
    <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
  행동 목표 수정
</Text>

      <Text
  style={[
    styles.inputLabel,
    { color: theme.subText },
  ]}
>
  행동 목표 이름
</Text>

      <TextInput
  value={editingGoal?.title ?? ''}
  onChangeText={(text) =>
    setEditingGoal({
      ...editingGoal,
      title: text,
    })
  }
    maxLength={
    ACTION_GOAL_MAX_LENGTH
  }
  style={[
  styles.goalInput,
  {
    backgroundColor:
      theme.card,

    borderColor:
      theme.line,

    borderWidth:
      0.5,

    color:
      theme.text,

    borderRadius:
      isCityBlack
        ? 4
        : 12,
  },
]}
  placeholderTextColor={theme.subText}
/>

      <Text
  style={[
    styles.inputLabel,
    { color: theme.subText },
  ]}
>
  목표 유형
</Text>

      <View style={styles.typeGrid}>
       {['확인형', '시간기록형'].map((type) => (
          <Pressable
            key={type}
            onPress={() =>
              setEditingGoal({
                ...editingGoal,
                type,
              })
            }
           style={[
  styles.typeButton,
  {
    backgroundColor:
      theme.card,

    borderColor:
      editingGoal
        ?.type === type
        ? theme.strongLine
        : theme.line,

    borderWidth:
      editingGoal
        ?.type === type
        ? 1
        : 0.5,

    borderRadius:
      isCityBlack
        ? 4
        : 12,
  },
]}
          >
            <Text
  style={[
    styles.typeButtonText,
    {
      color: theme.text,
    },
  ]}
>
  {type}
</Text>
          </Pressable>
        ))}
      </View>

{editingGoal && (
  <>
    <Text
      style={[
        styles.inputLabel,
        {
          color:
            theme.subText,
        },
      ]}
    >
      반복 방식
    </Text>

    <View
      style={
        styles.typeGrid
      }
    >
      {[
        {
          id:
            'weekdays',

          label:
            '요일 지정',
        },
        {
          id:
            'weeklyCount',

          label:
            '주 횟수',
        },
      ].map((item) => {
        const selected =
          editingGoal
            ?.repeatType ===
          item.id;

        return (
          <Pressable
            key={item.id}
            onPress={() =>
              setEditingGoal({
                ...editingGoal,

                repeatType:
                  item.id,
              })
            }
           style={[
  styles.typeButton,
  {
    backgroundColor:
      theme.card,

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
        : 12,
  },
]}
          >
            <Text
  style={[
    styles.typeButtonText,
    {
      color: theme.text,
    },
  ]}
>
  {item.label}
</Text>
          </Pressable>
        );
      })}
    </View>

    {editingGoal
      ?.repeatType ===
    'weekdays' ? (
      <>
        <Text
          style={[
            styles.inputLabel,
            {
              color:
                theme.subText,
            },
          ]}
        >
          반복 요일
        </Text>

        <View
          style={
            styles.weekCountRow
          }
        >
          {weekDays.map(
            (
              day,
              index
            ) => {
              const selected =
                (
                  editingGoal
                    ?.selectedDays ??
                  []
                ).includes(
                  index
                );

              return (
                <Pressable
                  key={day}
                  onPress={() =>
                    toggleEditingSelectedDay(
                      index
                    )
                  }
                  style={[
  styles.weekCountButton,
  {
    backgroundColor:
      theme.card,

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
    styles.weekCountText,
    {
      color:
        theme.text,
    },
  ]}
>
                    {day}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        <Text
          style={[
            styles.weekDesc,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {(
            editingGoal
              ?.selectedDays ??
            []
          ).length > 0
            ? `매주 ${(
                editingGoal
                  ?.selectedDays ??
                []
              )
                .map(
                  (
                    index: number
                  ) =>
                    weekDays[index]
                )
                .filter(Boolean)
                .join('·')}`
            : '반복할 요일을 선택해 주세요.'}
        </Text>
      </>
    ) : (
      <>
        <Text
          style={[
            styles.inputLabel,
            {
              color:
                theme.subText,
            },
          ]}
        >
          주 횟수
        </Text>

        <View
          style={
            styles.weekCountRow
          }
        >
          {[
            1,
            2,
            3,
            4,
            5,
            6,
            7,
          ].map(
            (count) => {
              const selected =
                Number(
                  editingGoal
                    ?.weeklyCount
                ) === count;

              return (
                <Pressable
                  key={count}
                  onPress={() =>
                    setEditingGoal({
                      ...editingGoal,

                      repeatType:
                        'weeklyCount',

                      weeklyCount:
                        count,
                    })
                  }
                  style={[
  styles.weekCountButton,
  {
    backgroundColor:
      theme.card,

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
    styles.weekCountText,
    {
      color:
        theme.text,
    },
  ]}
>
                    {count}
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>

        <Text
          style={[
            styles.weekDesc,
            {
              color:
                theme.subText,
            },
          ]}
        >
          원하는 날 주{' '}
          {
            editingGoal
              ?.weeklyCount ??
            3
          }
          회
        </Text>
      </>
    )}
  </>
)}

      <View style={styles.editModalButtonRow}>
  <Pressable
    style={[
      styles.cancelEditButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.line,

        borderWidth:
          0.5,

        borderRadius:
          isCityBlack
            ? 4
            : 12,
      },
    ]}
    onPress={() =>
      setEditingGoal(null)
    }
  >
    <Text
      style={[
        styles.cancelEditText,
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
    style={[
      styles.saveEditButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.strongLine,

        borderWidth:
          1,

        borderRadius:
          isCityBlack
            ? 4
            : 12,
      },
    ]}
    onPress={saveEdit}
  >
    <Text
      style={[
        styles.saveEditText,
        {
          color:
            theme.text,
        },
      ]}
    >
      저장
    </Text>
  </Pressable>

  <Pressable
    style={[
      styles.deleteEditButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          isCityBlack
            ? '#ef4444'
            : '#c93f36',

        borderWidth:
          0.5,

        borderRadius:
          isCityBlack
            ? 4
            : 12,
      },
    ]}
    onPress={() => {
  if (
    !editingGoal
  ) {
    return;
  }

  const goalTitle =
    String(
      editingGoal?.title ??
        '행동목표'
    );

  setNoticeModal({
    title:
      '행동목표를 종료할까요?',

    message:
      `${goalTitle} 목표를 종료하고 보관합니다.\n` +
      '기존 수행 기록과 XP·포인트는 그대로 유지됩니다.',

    confirmText:
      '종료 및 보관',

    cancelText:
      '취소',

    onConfirm:
      deleteGoal,
  });
}}
  >
    <Text
      style={[
        styles.deleteEditText,
        {
          color:
            isCityBlack
              ? '#f87171'
              : '#c93f36',
        },
      ]}
    >
      종료 및 보관
    </Text>
  </Pressable>
</View>
    </View>
  </View>
</Modal>
      {/* 마을 버튼 modal */}
      <Modal
  visible={
    villageModal !== null
  }
  transparent
  animationType="fade"
  onRequestClose={() =>
    setVillageModal(null)
  }
>
  <View
    style={
      styles.modalOverlay
    }
  >
    <View
      style={[
        styles.modalBox,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderWidth: 1,

          borderRadius:
            isCityBlack
              ? 4
              : 28,
        },
      ]}
    >
      <Text
        style={[
          styles.modalTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        {villageModal}
      </Text>

      {/* 가방과 상점에서는 설명 문구를 표시하지 않습니다. */}
      {(
        villageModal ===
          '확대' ||
        villageModal ===
          '편집'
      ) && (
        <Text
          style={[
            styles.gpsText,
            {
              color:
                theme.subText,
            },
          ]}
        >
          {villageModal ===
          '확대'
            ? '마을을 크게 볼 수 있어요.'
            : '마을을 꾸밀 수 있어요.'}
        </Text>
      )}

      {/* 가방 */}
      {villageModal ===
        '가방' && (
        <ScrollView
          style={
            styles.shopScroll
          }
          contentContainerStyle={
            styles.villageItemScrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={
              styles.villageThemeTabRow
            }
          >
            {bagThemes.map(
              (
                tabName
              ) => {
                const selected =
                  selectedBagTheme ===
                  tabName;

                return (
                  <Pressable
                    key={
                      tabName
                    }
                    onPress={() =>
                      setSelectedBagTheme(
                        tabName
                      )
                    }
                    style={[
                      styles.themeTab,
                      {
                        backgroundColor:
                          isCityBlack
                            ? theme.card2
                            : '#fff',

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
                        styles.themeTabText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {
                        tabName
                      }
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          {filteredBagItems.length ===
          0 ? (
            <View
              style={
                styles.villageEmptyItemBox
              }
            >
              <Text
                style={[
                  styles.villageEmptyItemText,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                가방에 아이템이
                없어요.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.bagGrid
              }
            >
              {filteredBagItems.map(
                (
                  item
                ) => (
                  <View
                    key={
                      item.id
                    }
                    style={[
                      styles.bagGridCard,
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
                  >
                    {item.count >
                      1 && (
                      <View
                        style={
                          styles.bagCountBadge
                        }
                      >
                        <Text
                          style={
                            styles.bagCountBadgeText
                          }
                        >
                          {
                            item.count
                          }
                        </Text>
                      </View>
                    )}

                    {/* 1. 아이템 이름 */}
                    <Text
                      style={[
                        styles.bagGridName,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                      numberOfLines={
                        2
                      }
                      ellipsizeMode="tail"
                    >
                      {
                        item.name
                      }
                    </Text>

                    {/* 2. 아이템 사진 */}
                    <Image
                      source={
                        item.image
                      }
                      style={
                        styles.bagGridImage
                      }
                      resizeMode="contain"
                    />

                    {/* 3. 꺼내기 */}
                    <Pressable
                      onPress={() =>
                        startPlaceBuilding(
                          item
                        )
                      }
                      style={[
                        styles.bagTakeButton,
                        {
                          backgroundColor:
                            isCityBlack
                              ? theme.card
                              : '#fff',

                          borderColor:
                            theme.line,

                          borderRadius:
                            isCityBlack
                              ? 4
                              : 10,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bagTakeText,
                          {
                            color:
                              theme.text,
                          },
                        ]}
                      >
                        꺼내기
                      </Text>
                    </Pressable>

                    {/* 4. 환급 또는 탐험 보상 표시 */}
                    <Pressable
                      disabled={
                        item.nonRefundable ||
                        item.source ===
                          'exploration'
                      }
                      onPress={() =>
                        sellBagItem(
                          item
                        )
                      }
                      style={[
                        styles.bagSellButton,
                        {
                          backgroundColor:
                            isCityBlack
                              ? theme.card
                              : '#fff',

                          borderColor:
                            item.nonRefundable ||
                            item.source ===
                              'exploration'
                              ? theme.line
                              : isCityBlack
                                ? '#ef4444'
                                : '#c93f36',

                          borderRadius:
                            isCityBlack
                              ? 4
                              : 10,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bagSellText,
                          {
                            color:
                              item.nonRefundable ||
                              item.source ===
                                'exploration'
                                ? theme.subText
                                : isCityBlack
                                  ? '#f87171'
                                  : '#c93f36',
                          },
                        ]}
                      >
                        {item.nonRefundable ||
                        item.source ===
                          'exploration'
                          ? '탐험 보상'
                          : `${Math.floor(
                              item.price /
                                2
                            )}P 환급`}
                      </Text>
                    </Pressable>
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* 상점 */}
      {villageModal ===
        '상점' && (
        <ScrollView
          style={
            styles.shopScroll
          }
          contentContainerStyle={
            styles.villageItemScrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <Text
            style={[
              styles.shopPointText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            보유 포인트:{' '}
            {totalPoints} ✦
          </Text>

          <View
            style={
              styles.villageThemeTabRow
            }
          >
            {shopThemes.map(
              (
                tabName
              ) => {
                const selected =
                  selectedShopTheme ===
                  tabName;

                return (
                  <Pressable
                    key={
                      tabName
                    }
                    onPress={() =>
                      setSelectedShopTheme(
                        tabName
                      )
                    }
                    style={[
                      styles.themeTab,
                      {
                        backgroundColor:
                          isCityBlack
                            ? theme.card2
                            : '#fff',

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
                        styles.themeTabText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {
                        tabName
                      }
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <View
            style={
              styles.shopGrid
            }
          >
            {filteredShopItems.map(
              (
                item
              ) => (
                <View
                  key={
                    item.id
                  }
                  style={[
                    styles.shopCard,
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
                >
                  {/* 1. 아이템 이름 */}
                  <Text
                    style={[
                      styles.shopName,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                    numberOfLines={
                      2
                    }
                    ellipsizeMode="tail"
                  >
                    {
                      item.name
                    }
                  </Text>

                  {/* 2. 아이템 사진 */}
                  <Image
                    source={
                      item.image
                    }
                    style={
                      styles.shopImage
                    }
                    resizeMode="contain"
                  />

                  {/* 3. 구매 포인트 */}
                  <Pressable
                    onPress={() =>
                      buyItem(
                        item
                      )
                    }
                    style={[
                      styles.buyButton,
                      {
                        backgroundColor:
                          isCityBlack
                            ? theme.card
                            : '#fff',

                        borderColor:
                          theme.line,

                        borderRadius:
                          isCityBlack
                            ? 4
                            : 10,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buyButtonText,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {
                        item.price
                      }{' '}
                      ✦
                    </Text>
                  </Pressable>
                </View>
              )
            )}
          </View>
        </ScrollView>
      )}

      <Pressable
        style={[
          styles.villageConfirmButton,
          {
            backgroundColor:
              isCityBlack
                ? theme.card
                : '#fff',

            borderColor:
              theme.line,

            borderRadius:
              isCityBlack
                ? 4
                : 10,
          },
        ]}
        onPress={() =>
          setVillageModal(
            null
          )
        }
      >
        <Text
          style={[
            styles.villageConfirmText,
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

<Modal
  visible={buyCompleteModal !== null}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 28,
    },
  ]}
>
      <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
  구매 완료
</Text>

      <Text
  style={[
    styles.gpsText,
    { color: theme.subText },
  ]}
>
        {buyCompleteModal?.name}을 구매했어요!
      </Text>

      <Pressable
  style={[
    styles.saveButton,
    {
      backgroundColor: theme.button,
      borderColor: theme.strongLine,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
  onPress={() => setBuyCompleteModal(null)}
>
  <Text
    style={[
      styles.saveText,
      { color: theme.buttonText },
    ]}
  >
    확인
  </Text>
</Pressable>
    </View>
  </View>
</Modal>

<Modal
  visible={sellCompleteModal !== null}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 28,
    },
  ]}
>
      <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
        환급 완료
      </Text>

      <Text
  style={[
    styles.gpsText,
    { color: theme.subText },
  ]}
>
        {sellCompleteModal?.name}을 판매하고{' '}
        {sellCompleteModal?.point}P를 받았어요.
      </Text>

      <Pressable
  style={[
    styles.saveButton,
    {
      backgroundColor: theme.button,
      borderColor: theme.strongLine,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
        onPress={() => setSellCompleteModal(null)}
      >
        <Text
  style={[
    styles.saveText,
    { color: theme.buttonText },
  ]}
>
          확인
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>




<Modal
  visible={saveCompleteModal}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 28,
    },

  ]}
>
     <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
  저장 완료
</Text>

      <Text
  style={[
    styles.gpsText,
    { color: theme.subText },
  ]}
>
        마을 배치가 저장되었어요.
      </Text>

      <Pressable
  style={[
    styles.saveButton,
    {
      backgroundColor: theme.button,
      borderColor: theme.strongLine,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 14,
    },
  ]}
  onPress={() =>
    setSaveCompleteModal(false)
  }
>
  <Text
    style={[
      styles.saveText,
      { color: theme.buttonText },
    ]}
  >
    확인
  </Text>
</Pressable>
    </View>
  </View>
</Modal>

<Modal
  visible={noticeModal !== null}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 28,
    },
  ]}
>
      <Text
  style={[
    styles.modalTitle,
    { color: theme.text },
  ]}
>
  {noticeModal?.title}
</Text>

      <Text
  style={[
    styles.gpsText,
    { color: theme.subText },
  ]}
>
        {noticeModal?.message}
      </Text>

      {noticeModal?.cancelText ? (
        <View style={styles.editModalButtonRow}>
          <Pressable
            style={[
  styles.cancelEditButton,
  {
    backgroundColor: theme.card2,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: isCityBlack ? 4 : 14,
  },
]}
            onPress={() => setNoticeModal(null)}
          >
           <Text
  style={[
    styles.cancelEditText,
    { color: theme.subText },
  ]}
>
              {noticeModal.cancelText}
            </Text>
          </Pressable>

          <Pressable
            style={[
  styles.deleteEditButton,
  {
    backgroundColor: isCityBlack
      ? '#2a1111'
      : '#f7d8d5',
    borderColor: isCityBlack
      ? '#ef4444'
      : '#c93f36',
    borderWidth: 1,
    borderRadius: isCityBlack ? 4 : 14,
  },
]}
            onPress={() => {
              const action = noticeModal?.onConfirm;
              setNoticeModal(null);
              action?.();
            }}
          >
            <Text
  style={[
    styles.deleteEditText,
    {
      color: isCityBlack
        ? '#f87171'
        : '#c93f36',
    },
  ]}
>
  {noticeModal.confirmText ?? '확인'}
</Text>
          </Pressable>
        </View>
      ) : (
  <Pressable
    style={{
      marginTop: 14,

      backgroundColor:
        'transparent',

      borderColor:
        theme.strongLine,

      borderWidth: 0.5,

      borderRadius:
        isCityBlack
          ? 4
          : 12,

      paddingVertical: 12,
      paddingHorizontal: 16,

      alignItems: 'center',
      justifyContent: 'center',
    }}
    onPress={() =>
      setNoticeModal(null)
    }
  >
    <Text
      style={{
        color:
          theme.text,

        fontSize: 16,
        fontWeight: '800',
      }}
    >
      확인
    </Text>
  </Pressable>
)}
    </View>
  </View>
</Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 15,
    backgroundColor: '#f5e9cf',
    paddingHorizontal: 16,
  },

  villageWrapper: {
    marginTop: 20,
    backgroundColor: '#111b44',
    borderRadius: 28,
    padding: 10,
  },

  profileTop: {
  backgroundColor: '#f5ead7',
  borderRadius: 14,
  paddingVertical: 1,
  paddingHorizontal: 12,
  marginBottom: 5,
},

  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#5f3b1b',
      },

  profileInfo: {
    marginTop: -4,
    color: '#b88632',
    fontSize: 12,
    fontWeight: '800',
  },

tileMap: {
   width: 2000,
  height: 1600,
  position: 'relative',
},

tile: {
  position: 'absolute',
  width: 220,
  height: 110,
},

gpsMapBox: {
  marginTop: 12,
  height: 180,
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: '#dbeafe',
},

gpsMap: {
  width: '100%',
  height: '100%',
},

bagImage: {
  width: 70,
  height: 70,
  marginRight: 14,
},

bagName: {
  fontSize: 20,
  fontWeight: '900',
  color: '#5f3b1b',
},

bagCount: {
  marginTop: 4,
  fontSize: 14,
  fontWeight: '700',
  color: '#9c651f',
},

gpsResultBox: {
  backgroundColor: 'transparent',
  borderRadius: 0,
  padding: 0,
  marginTop: 4,
  marginBottom: 6,
  borderWidth: 0,
  borderColor: 'transparent',
},

gpsResultTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#5f3b1b',
},

gpsResultDistance: {
  marginTop: 8,
  fontSize: 24,
  fontWeight: '900',
  color: '#2563eb',
},

gpsResultDesc: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: '700',
  color: '#8b5a2b',
},

bagPlaceText: {
  fontSize: 16,
  fontWeight: '900',
  color: '#9c651f',
},

bagCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff8ec',
  borderRadius: 18,
  padding: 14,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#e0c78f',
},

  villagePreview: {
    width: '100%',
    height: 330,
    borderRadius: 22,
    backgroundColor: '#21315b',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  previewText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },

  villageButtonRow: {
  position: 'absolute',

  left: 18,
  bottom: 18,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,

  zIndex: 50,
},

  villageButton: {
  width: 42,
  height: 42,
  backgroundColor: '#f5ead7',
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
},

largeVillageButton: {
  height: 42,
  paddingHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
},

largeVillageButtonText: {
  fontSize: 11,
  fontWeight: '900',
},

activeVillageButton: {
  backgroundColor: '#ffd36b',
},

  villageButtonText: {
   display: 'none',
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginTop: 18,
  },

  categoryCard: {
    width: '23%',
    backgroundColor: '#b7863a',
    borderRadius: 18,
    padding: 10,
  },

  selectedCategoryCard: {
    backgroundColor: '#8b5a2b',
  },

  categoryTitle: {
    color: '#fff6dd',
    fontSize: 10,
    fontWeight: '700',
  },

  categoryLevel: {
  color: '#fff',
  marginTop: 4,
  fontWeight: '800',
  fontSize: 13,
},

  expBar: {
  flex: 1,
  height: 8,
  backgroundColor: '#7a5a2d',
  borderRadius: 10,
  overflow: 'hidden',
},


  expRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 5,
},

  expFill: {
    height: '100%',
    backgroundColor: '#ffd54d',
  },

  expText: {
  marginLeft: 8,
  color: '#fff6dd',
  fontSize: 10,
  fontWeight: '700',
},


  goalCard: {
    backgroundColor: '#f3e4c4',
    borderRadius: 28,
    padding: 18,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#d8b56c',
  },

  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goalBadge: {
    backgroundColor: '#ead7b3',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  goalBadgeText: {
    color: '#8b5a2b',
    fontWeight: '700',
  },

  foxCharacter: {
  position: 'absolute',
  width: 80,
  height: 80,
  },

  progressBox: {
    marginLeft: 12,
    backgroundColor: '#f4ead4',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
  },

  progressLabel: {
    color: '#8b5a2b',
    fontSize: 12,
  },

  progressText: {
    fontWeight: '800',
    fontSize: 24,
    color: '#8b5a2b',
  },

  goalIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#f4ead4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  goalTitle: {
    marginTop: 22,
    fontSize: 38,
    fontWeight: '800',
    color: '#5f3b1b',
  },

  bigProgressBar: {
    height: 16,
    backgroundColor: '#dfd0af',
    borderRadius: 20,
    marginTop: 22,
    overflow: 'hidden',
  },

  bigProgressFill: {
    height: '100%',
    backgroundColor: '#c48a2d',
  },

  dateText: {
    marginLeft: 10,
    color: '#8b5a2b',
    fontWeight: '700',
  },

  emptyFox: {
    fontSize: 44,
    textAlign: 'center',
  },

  emptyGoalTitle: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    color: '#5f3b1b',
  },

  emptyGoalDesc: {
    marginTop: 10,
    textAlign: 'center',
    color: '#8b5a2b',
    lineHeight: 24,
  },
makeGoalButton: {
  alignSelf: 'center',
  height: 42,
  marginTop: 20,
  paddingHorizontal: 22,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

makeGoalText: {
  fontSize: 15,
  fontWeight: '800',
},

  sectionTitle: {
    marginTop: 28,
    marginBottom: 14,
    fontSize: 28,
    fontWeight: '800',
    color: '#7a4c1f',
  },

  count: {
    color: '#d0a14a',
  },

actionCard: {
  backgroundColor: '#f8edcf',
  borderWidth:0.5,
  borderColor: '#d6b86a',
  borderRadius: 24,
  paddingHorizontal: 14,
  paddingTop: 6,
  paddingBottom: 5,
  marginBottom: 10,
},

  actionTop: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
},

actionHeaderButtonRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  marginTop: 4, // 추가
},

actionRecordButton: {
  alignSelf: 'flex-start',
  height: 25, // 36 → 18
  paddingHorizontal: 12,
  paddingVertical: 0,
  borderWidth: 0.5,
  alignItems: 'center',
  justifyContent: 'center',
},

actionRecordButtonText: {
  fontSize: 12,
  fontWeight: '900',
},

actionEditButton: {
  alignSelf: 'flex-start',
  height: 25, // 36 → 18
  paddingHorizontal: 12,
  paddingVertical: 0,
  alignItems: 'center',
  justifyContent: 'center',
},
  actionMain: {
  flex: 1,
  minWidth: 0,
},

  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e9dcc1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  doneCircle: {
    backgroundColor: '#c7a25a',
  },

  check: {
    color: '#fff',
    fontWeight: '900',
  },

 actionTitle: {
  fontSize: 22,
  fontWeight: '900',
  color: '#5f3b1b',
  flexShrink: 1,
},

completeButton: {
  backgroundColor: 'transparent',
  borderRadius: 0,
  paddingHorizontal: 4,
  paddingVertical: 0,
  alignItems: 'center',
  justifyContent: 'center',
},

 stopButton: {
  backgroundColor: '#c93f36',
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 8,
  alignSelf: 'flex-start',
  marginTop: 8,
},

  completedButton: {
    backgroundColor: '#8b5a2b',
  },

 completeText: {
  fontWeight: '700',
},

  editButton: {
  width: 56,
  height: 56,
  borderRadius: 18,
  backgroundColor: '#efe2c6',
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: 8,
  zIndex: 20,
  elevation: 20,
},

 weekRow: {
  marginTop: 14,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

  weekItem: {
    alignItems: 'center',
  },

weekText: {
  fontSize: 13,
  color: '#8b5a2b',
  fontWeight: '800',
},

weekCircle: {
  width: 20 ,
  height: 20,
  borderRadius: 21,
  backgroundColor: '#695220',
  alignItems: 'center',
  justifyContent: 'center',
},

weekCheck: {
  color: '#fff',
  fontSize: 10,
  fontWeight: '900',
},

   weekDone: {
    backgroundColor: '#c7a25a',
  },
addButton: {
  alignSelf: 'center',
  height: 42,
  marginTop: 12,
  marginBottom: 100,
  paddingHorizontal: 24,
  paddingVertical: 0,

  borderWidth: 1,
  borderStyle: 'dashed',

  alignItems: 'center',
  justifyContent: 'center',
},

addButtonText: {
  fontSize: 15,
  fontWeight: '800',
},

  modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

  disabledButton: {
  opacity: 0.35,
},

  modalBox: {
    backgroundColor: '#efe8dc',
    borderRadius: 28,
    padding: 20,
  },

  modalTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#3d2a18',
    marginBottom: 22,
  },

  gpsText: {
    textAlign: 'center',
    color: '#7a4c1f',
    fontSize: 18,
    marginBottom: 24,
  },

  noGpsButton: {
    marginTop: 10,
    backgroundColor: '#f7f0e5',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },

  noGpsText: {
    color: '#3d2a18',
    fontSize: 20,
    fontWeight: '700',
  },

  gpsButton: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },

  saveButton: {
    marginTop: 14,
    backgroundColor: '#9c651f',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },

saveText: {
  color: '#fff',
  fontWeight: '800',
  fontSize: 18,
},

placingNotice: {
  position: 'absolute',
  top: 12,
  left: 12,
  right: 12,
  zIndex: 20,
  backgroundColor: '#fff8ec',
  borderRadius: 14,
  paddingVertical: 10,
  paddingHorizontal: 12,
},

placingNoticeText: {
  textAlign: 'center',
  color: '#7a4c1f',
  fontWeight: '900',
},

inputLabel: {
  marginTop: 12,
  marginBottom: 8,
  color: '#8b5a2b',
  fontSize: 16,
  fontWeight: '800',
},

goalInput: {
  height: 42,
  paddingHorizontal: 14,
  paddingVertical: 0,

  borderWidth: 0.5,

  fontSize: 15,
},

typeGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

typeButton: {
  width: '48%',
  height: 40,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},


typeButtonText: {
  fontSize: 14,
  fontWeight: '800',
},



weekCountRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 3,
},

weekCountButton: {
  flex: 1,
  height: 38,

  justifyContent: 'center',
  alignItems: 'center',
},

weekCountText: {
  fontSize: 14,
  fontWeight: '800',
},


weekDesc: {  marginTop: 8,  color: '#8b5a2b',  fontSize: 14,  fontWeight: '700',},
editModalButtonRow: {
  flexDirection: 'row',
  gap: 8,
  marginTop: 20,
},

cancelEditButton: {
  flex: 1,
  height: 40,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

saveEditButton: {
  flex: 1,
  height: 40,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

deleteEditButton: {
  flex: 1.25,
  paddingVertical: 14,
  paddingHorizontal: 8,
  alignItems: 'center',
  justifyContent: 'center',
},

cancelEditText: {
  fontSize: 14,
  fontWeight: '900',
},

saveEditText: {
  fontSize: 14,
  fontWeight: '900',
},

deleteEditText: {
  fontSize: 13,
  fontWeight: '900',
},
durationRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 6,
},

durationButton: {
  flex: 1,
  height: 40,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

selectedDurationButton: {  backgroundColor: '#9c651f',},
durationText: {
  fontSize: 14,
  fontWeight: '800',
},
selectedDurationText: {  color: '#fff',},
customDurationRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 10,
},

customDurationInput: {
  flex: 1,
  height: 42,
  paddingHorizontal: 14,
  paddingVertical: 0,

  borderWidth: 0.5,

  fontSize: 16,
},
customDurationText: {
  marginLeft: 10,
  fontSize: 22,
  fontWeight: '800',
  color: '#8b5a2b',
},

recordModalBox: {
  backgroundColor: '#efe8dc',
  borderRadius: 28,
  padding: 20,
},

photoOption: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#fff8ec',
  borderRadius: 18,
  padding: 18,
  marginBottom: 12,
},

photoOptionIcon: {
  fontSize: 26,
  marginRight: 14,
},

photoOptionTitle: {
  fontSize: 18,
  fontWeight: '900',
  color: '#5f3b1b',
},

photoOptionDesc: {
  marginTop: 4,
  fontSize: 14,
  color: '#8b5a2b',
},

noPhotoButton: {
  backgroundColor: '#ead7b3',
  borderRadius: 18,
  paddingVertical: 18,
  alignItems: 'center',
  marginTop: 8,
},

noPhotoText: {
  color: '#8b5a2b',
  fontSize: 18,
  fontWeight: '900',
},

simpleGoalBottomRow: {
  marginTop: 12,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

selectedPhotoText: {
  marginTop: 12,
  textAlign: 'center',
  color: '#8b5a2b',
  fontWeight: '800',
},

villageTitle: {
  textAlign: 'center',
  color: '#fff6dd',
  fontSize: 20,
  fontWeight: '900',
  marginBottom: 8,
},

simpleGoalTop: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

simpleSectionTitle: {
  fontSize: 20,
  lineHeight: 32,
  fontWeight: '900',
  color: '#5f3b1b',
  flexShrink: 1,
},

smallEditButton: {
  height: 32,
  paddingHorizontal: 12,
  paddingVertical: 0,
  alignItems: 'center',
  justifyContent: 'center',
},

smallEditText: {
  fontSize: 13,
  fontWeight: '900',
},

simpleGoalTitle: {
  marginTop: 18,
  fontSize: 26,
  fontWeight: '900',
  color: '#5f3b1b',
},

simpleGoalDate: {
  fontSize: 15,
  color: '#8b5a2b',
  fontWeight: '800',
},
simpleRemainText: {
  fontSize: 15,
  fontWeight: '800',
},

todayTodoTitle: {
  marginTop: 8,
  marginBottom: 4,
  textAlign: 'center',
  fontSize: 24,
  fontWeight: '900',
  color: '#7a4c1f',
},
todayTodoHeader: {
  marginTop: 2,
  marginBottom: 10,
  alignItems: 'center',
},

editTextButton: {
  backgroundColor: '#efe2c6',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
},

editTextButtonText: {
  color: '#8b5a2b',
  fontSize: 12,
  fontWeight: '900',
},

homeProfileCard: {
  marginTop: 30,

  backgroundColor:
    '#f3e4c4',

  borderRadius: 22,

  paddingHorizontal: 14,
  paddingVertical: 0,

  flexDirection: 'row',
  alignItems: 'center',

  borderWidth: 2,
  borderColor:
    '#d8b56c',
},

homeSettingsButton: {
  width: 26,
  height: 26,

  marginLeft: 'auto',

  backgroundColor:
    'transparent',

  borderWidth: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

profileCharacterBox: {
  width: 46,
  height: 46,

  backgroundColor:
    'transparent',

  borderWidth: 0,

  justifyContent: 'center',
  alignItems: 'center',

  marginRight: 12,
},

profileCharacter: {
  fontSize: 28,
},

profileMainInfo: {
  flex: 1,
  minWidth: 0,
},

profileNameRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',

  minWidth: 0,
},

profileStatRow: {
  width: '100%',

  marginTop: 2,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 14,
},

profileStatText: {
  color: '#8b5a2b',

  fontSize: 13,
  fontWeight: '900',
},

mainBadgeChip: {
  flex: 1,
  minWidth: 0,

  marginLeft: 8,

  paddingHorizontal: 4,
  paddingVertical: 1,

  backgroundColor:
    'transparent',

  borderWidth: 0,
},

mainBadgeText: {
  fontSize: 15,
  fontWeight: '900',

  textAlign: 'right',
},

actionBottomRow: {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'stretch',
  gap: 3,
  marginTop: 1,
},

actionStatusColumn: {
  flex: 1.4,
  minWidth: 0,
},

actionButtonRow: {
  width: '100%',
  flex: 1,
  flexDirection: 'row',
  alignItems: 'stretch',
},

actionStatusButton: {
  width: '100%',
  height: 24,
  marginTop: 0,
  alignSelf: 'stretch',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
  paddingVertical: 0,
},

runningTimerInfo: {
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
},


runningTimerLine: {
  width: '100%',
  fontSize: 11,
  fontWeight: '900',
  lineHeight: 14,
  textAlign: 'center',
  flexShrink: 1,
},

repeatProgressBox: {
  flex: 1,
  height: 24,
  minWidth: 0,
  marginTop: 0,
  marginLeft: 6,
  paddingHorizontal: 2,
  paddingVertical: 0,
  borderWidth: 0,
  alignItems: 'flex-end',
  justifyContent: 'center',
},

repeatProgressText: {
  width: '100%',
  fontSize: 11,
  fontWeight: '900',
  lineHeight: 14,
  textAlign: 'right',
  flexShrink: 1,
},

editVillageButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff8ec',
  borderRadius: 16,
  paddingHorizontal: 14,
  height: 42,
    marginRight: 10,
},

editVillageText: {
  marginLeft: 6,
  fontSize: 16,
  fontWeight: '900',
  color: '#8b5a2b',
},
routeCaptureCard: {
  marginTop: 0,
  height: 370,
  borderRadius: 22,
  overflow: 'hidden',
  backgroundColor: '#dbeafe',
},

routeCaptureMap: {
  width: '100%',
  height: '100%',
},


routeCaptureTitle: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '900',
  marginBottom: 10,
},

routeCaptureStatsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 6,
},

recordReviewBox: {
  backgroundColor: '#fff7e8',
  borderRadius: 22,
  padding: 18,
  marginTop: 14,
  marginBottom: 14,
},

recordReviewTitle: {
  fontSize: 20,
  fontWeight: '900',
  color: '#5c3518',
  marginBottom: 8,
},

recordReviewMain: {
  fontSize: 34,
  fontWeight: '900',
  color: '#2f2418',
  marginBottom: 10,
},

recordStatRow: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 12,
},

recordStatText: {
  backgroundColor: '#2f2418',
  color: '#fff',
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 999,
  fontSize: 13,
  fontWeight: '800',
},

focusLabel: {
  fontSize: 15,
  fontWeight: '800',
  color: '#7a552f',
  marginTop: 8,
},

starRow: {
  flexDirection: 'row',
  marginTop: 6,
  marginBottom: 12,
},

starText: {
  fontSize: 30,
  color: '#f59e0b',
  marginRight: 4,
},

recordMemoInput: {
  minHeight: 80,
  borderRadius: 16,
  backgroundColor: '#fff',
  padding: 14,
  color: '#4b2e18',
  fontSize: 15,
  textAlignVertical: 'top',
},
routeStartMarker: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: '#22c55e',
  borderWidth: 3,
  borderColor: '#ffffff',
  alignItems: 'center',
  justifyContent: 'center',
},

routeEndMarker: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: '#ef4444',
  borderWidth: 3,
  borderColor: '#ffffff',
  alignItems: 'center',
  justifyContent: 'center',
},

routeMarkerText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '900',
},
photoButtonRow: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 8,
},

photoHalfButton: {
  flex: 1,
  backgroundColor: '#fff7e8',
  borderRadius: 14,
  paddingVertical: 9,
  alignItems: 'center',
  justifyContent: 'center',
},
photoButtonText: {
  fontSize: 15,
  fontWeight: '900',
  color: '#6b3514',
},
decorateOverlay: {
  flex: 1,
  backgroundColor: '#000',
},

decorateBox: {
  flex: 1,
  backgroundColor: '#000',
},

decorateCanvas: {
  flex: 1,
  width: '100%',
  backgroundColor: '#111',
},

decorateTitle: {
  fontSize: 24,
  fontWeight: '900',
  color: '#5c3518',
  marginBottom: 14,
},

decorateImage: {
  width: '100%',
  height: '100%',
  position: 'absolute',
},

recordSticker: {
  position: 'absolute',
  left: 0,
  top: 0,
  backgroundColor: 'rgba(0,0,0,0.35)',
  borderRadius: 18,
  paddingVertical: 12,
  paddingHorizontal: 16,
},

stickerDate: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '700',
},

stickerTitle: {
  color: '#fff',
  fontSize: 22,
  fontWeight: '900',
  marginTop: 4,
},

stickerMain: {
  color: '#fff',
  fontSize: 38,
  fontWeight: '900',
  marginTop: 8,
},

stickerSub: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '800',
  marginTop: 2,
},

stickerRoot: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '900',
  marginTop: 10,
  letterSpacing: 2,
},

decorateHint: {
  marginTop: 10,
  color: '#8b5a2b',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
},

decorateButton: {
  marginTop: 12,
  backgroundColor: '#2f2418',
  borderRadius: 18,
  paddingVertical: 16,
  alignItems: 'center',
},

decorateButtonText: {
  color: '#fff',
  fontSize: 17,
  fontWeight: '900',
},
decorateBottomBar: {
  position: 'absolute',
  left: 16,
  right: 16,
  bottom: 60,
  flexDirection: 'row',
  gap: 12,
  zIndex: 999,
  elevation: 999,
},

decorateCloseButton: {
  flex: 1,
  backgroundColor: 'rgba(120,120,120,0.55)',
  borderRadius: 18,
  paddingVertical: 13,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.35)',
},

decorateApplyButton: {
  flex: 1,
  backgroundColor: 'rgba(120,120,120,0.55)',
  borderRadius: 18,
  paddingVertical: 13,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.35)',
},

decorateTextButton: {
  flex: 1,
  paddingVertical: 13,
  alignItems: 'center',
  borderWidth: 1,
},

decorateTextButtonText: {
  fontSize: 17,
  fontWeight: '900',
},

decorateTextEditorOverlay: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 2000,
  elevation: 2000,
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

decorateCloseText: {
  fontSize: 17,
  fontWeight: '900',
  color: '#fff',
},

decorateApplyText: {
  fontSize: 17,
  fontWeight: '900',
  color: '#fff',
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
  textShadowColor: 'rgba(0,0,0,0.7)',
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

selectedPhotoPreviewBox: {
  marginTop: 14,
  width: '100%',
  height: 250,
  borderRadius: 22,
  overflow: 'hidden',
  backgroundColor: '#ead7b3',
},

selectedPhotoPreview: {
  width: '100%',
  height: '100%',
},

selectedPhotoBadge: {
  position: 'absolute',
  left: 12,
  bottom: 12,
  backgroundColor: 'rgba(255, 248, 236, 0.88)',
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 7,
},

selectedPhotoBadgeText: {
  fontSize: 13,
  fontWeight: '900',
  color: '#6b3f18',
},

photoDecorateMiniButton: {
  position: 'absolute',
  right: 12,
  top: 12,
  backgroundColor: 'rgba(49, 34, 20, 0.72)',
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 8,
},

photoDecorateMiniButtonText: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '900',
},

recordModalBottomRow: {
  marginTop: 10,
  flexDirection: 'row',
  gap: 8,
},

recordCancelSmallButton: {
  flex: 1,
  backgroundColor: '#fff8ec',
  borderRadius: 14,
  paddingVertical: 8,
  alignItems: 'center',
},

recordNoPhotoSmallButton: {
  flex: 1.25,
  backgroundColor: '#ead7b3',
  borderRadius: 14,
  paddingVertical: 8,
  alignItems: 'center',
},

recordSaveSmallButton: {
  flex: 1,
  backgroundColor: '#a96f1f',
  borderRadius: 14,
  paddingVertical: 8,
  alignItems: 'center',
},

recordCancelSmallText: {
  color: '#6b3f18',
  fontSize: 15,
  fontWeight: '900',
},

recordNoPhotoSmallText: {
  color: '#8b5a2b',
  fontSize: 14,
  fontWeight: '900',
},

recordSaveSmallText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '900',
},
routeMapTitleBadge: {
  position: 'absolute',
  left: 12,
  top: 12,
  backgroundColor: 'rgba(20, 30, 45, 0.72)',
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 6,
},

routeMapTitleBadgeText: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '900',
},
routeActionTitleBadge: {
  position: 'absolute',
  right: 12,
  top: 12,
  maxWidth: '52%',
  backgroundColor: 'rgba(20, 30, 45, 0.72)',
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 6,
},

routeActionTitleBadgeText: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '900',
},
routeCaptureOverlay: {
  position: 'absolute',
  left: 12,
  right: 12,
  bottom: 12,
  backgroundColor: 'rgba(20, 30, 45, 0.78)',
  borderRadius: 18,
  paddingVertical: 12,
  paddingHorizontal: 18,
  gap: 8,
},

routeCaptureStatsLine: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

routeCaptureStatItem: {
  flex: 1,
  alignItems: 'center',
},

routeCaptureStatValue: {
  flex: 1,
  color: '#fff',
  fontSize: 13,
  fontWeight: '900',
  textAlign: 'center',
},
villageConfirmButton: {
  alignSelf: 'flex-end',
  minWidth: 82,
  height: 38,
  marginTop: 14,
  paddingHorizontal: 16,
  paddingVertical: 0,

  borderWidth: 0.5,

  alignItems: 'center',
  justifyContent: 'center',
},

villageConfirmText: {
  fontSize: 14,
  fontWeight: '800',
},

completionCalorieBox: {
  width: '88%',
  maxWidth: 430,
  paddingHorizontal: 24,
  paddingTop: 26,
  paddingBottom: 22,

  borderWidth: 1,
  alignSelf: 'center',
},

completionCalorieTitle: {
  fontSize: 24,
  fontWeight: '900',
  textAlign: 'center',
},

completionRewardText: {
  marginTop: 20,
  fontSize: 19,
  fontWeight: '700',
  lineHeight: 28,
  textAlign: 'center',
},

completionInfoText: {
  marginTop: 8,
  fontSize: 15,
  fontWeight: '700',
  textAlign: 'center',
},

completionCalorieRow: {
  marginTop: 24,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

completionCalorieLabel: {
  fontSize: 15,
  fontWeight: '800',
},

completionCalorieInput: {
  width: 90,
  height: 40,
  paddingHorizontal: 10,
  paddingVertical: 0,

  borderWidth: 0.5,
  borderRadius: 10,

  fontSize: 16,
  fontWeight: '800',
  textAlign: 'center',
},

completionCalorieUnit: {
  fontSize: 15,
  fontWeight: '800',
},

completionCalorieConfirmButton: {
  height: 42,
  marginTop: 24,

  borderWidth: 0.5,

  alignItems: 'center',
  justifyContent: 'center',
},

completionCalorieConfirmText: {
  fontSize: 15,
  fontWeight: '900',
},
villageItemScrollContent: {
  paddingBottom: 6,
},

villageThemeTabRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'flex-start',

  gap: 7,

  marginTop: 2,
  marginBottom: 12,
},

themeTab: {
  minWidth: 62,
  height: 32,

  paddingHorizontal: 10,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

themeTabText: {
  fontSize: 12,
  fontWeight: '800',
  textAlign: 'center',
},

shopScroll: {
  maxHeight: 520,
  marginTop: 2,
},

shopPointText: {
  marginTop: 0,
  marginBottom: 12,

  fontSize: 16,
  lineHeight: 21,
  fontWeight: '800',
  textAlign: 'center',
},

shopGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent:
    'flex-start',

  columnGap: 8,
  rowGap: 10,

  paddingBottom: 10,
},

shopCard: {
  width: '31%',

  minHeight: 176,

  paddingTop: 10,
  paddingHorizontal: 7,
  paddingBottom: 9,

  borderWidth: 1,

  alignItems: 'center',
},

shopName: {
  width: '100%',
  minHeight: 34,

  paddingHorizontal: 2,

  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
  textAlign: 'center',
  textAlignVertical:
    'center',
},

shopImage: {
  width: 72,
  height: 72,

  marginTop: 3,
  marginBottom: 5,
},

buyButton: {
  width: '100%',
  height: 34,

  marginTop: 6,

  paddingHorizontal: 4,
  paddingVertical: 0,

  borderWidth: 0.5,

  alignItems: 'center',
  justifyContent: 'center',
},

buyButtonText: {
  fontSize: 13,
  fontWeight: '900',
  textAlign: 'center',
},

bagGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent:
    'flex-start',

  columnGap: 8,
  rowGap: 10,

  paddingBottom: 10,
},

bagGridCard: {
  position: 'relative',

  width: '31%',
  minHeight: 225,

  paddingTop: 10,
  paddingHorizontal: 7,
  paddingBottom: 9,

  borderWidth: 1,

  alignItems: 'center',
},

bagCountBadge: {
  position: 'absolute',

  top: 5,
  right: 5,

  minWidth: 24,
  height: 24,

  paddingHorizontal: 6,

  borderRadius: 12,

  backgroundColor:
    '#c79a3b',

  alignItems: 'center',
  justifyContent: 'center',

  zIndex: 10,
},

bagCountBadgeText: {
  color: '#fff',

  fontSize: 12,
  fontWeight: '900',
},

bagGridName: {
  width: '100%',
  minHeight: 34,

  paddingHorizontal: 17,

  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
  textAlign: 'center',
  textAlignVertical:
    'center',
},

bagGridImage: {
  width: 72,
  height: 72,

  marginTop: 3,
  marginBottom: 5,
},

bagTakeButton: {
  width: '100%',
  height: 34,

  marginTop: 6,

  paddingHorizontal: 4,
  paddingVertical: 0,

  borderWidth: 0.5,

  alignItems: 'center',
  justifyContent: 'center',
},

bagTakeText: {
  fontSize: 13,
  fontWeight: '900',
  textAlign: 'center',
},

bagSellButton: {
  width: '100%',
  height: 34,

  marginTop: 6,

  paddingHorizontal: 4,
  paddingVertical: 0,

  borderWidth: 0.5,

  alignItems: 'center',
  justifyContent: 'center',
},

bagSellText: {
  fontSize: 12,
  fontWeight: '900',
  textAlign: 'center',
},

villageEmptyItemBox: {
  minHeight: 150,

  alignItems: 'center',
  justifyContent: 'center',
},

villageEmptyItemText: {
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
},
modalKeyboardAvoidingView: {
  flex: 1,
},

resultGoalEditScroll: {
  flex: 1,
  width: '100%',
},

resultGoalEditScrollContent: {
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 32,
},

resultGoalEditModalBox: {
  width: '92%',
  maxWidth: 720,
  maxHeight: '88%',
  alignSelf: 'center',
},
});
