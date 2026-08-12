import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Linking, Modal, NativeModules, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Svg, {
  Circle,
  G,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';
import {
  getNativePendingCardNotifications,
  hasCardNotificationAccess,
  openCardNotificationSettings,
  removeNativePendingCardNotification,
} from '../../store/cardNotificationNative';
import { syncDailyDataToServer } from '../../store/dailyCloud';
import {
  syncFloatingCharacterSpendingContext,
} from '../../utils/floatingCharacterLifestyleSync';
import type {
  LedgerItem
} from '../../store/ledgerTypes';

import { addRootPoints } from '../../store/rootMemory';
import { useRootTheme } from '../../store/rootTheme';
import { syncRootWidgetData } from '../../utils/rootWidgetSync';
// =========================================================================
// 1. 상수 및 타입 정의 (Constants & Types)
// =========================================================================
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const LEDGER_CATEGORIES = ['식비', '교통', '쇼핑', '의료', '문화', '교육', '기타'];

type LedgerExpenseCategory =
  | '식비'
  | '교통'
  | '쇼핑'
  | '의료'
  | '문화'
  | '교육'
  | '기타';
type FinancialMerchantType =
  | 'single'
  | 'mixed';

type MerchantCategoryHistoryItem = {
  category:
    LedgerExpenseCategory;

  usedAt:
    string;
};

type MerchantCategoryHistory =
  Record<
    string,
    MerchantCategoryHistoryItem[]
  >;

type MerchantAutoSaveRule = {
  category:
    LedgerExpenseCategory;

  enabledAt:
    number;
};

type MerchantAutoSaveRules =
  Record<
    string,
    MerchantAutoSaveRule
  >;

type FinancialMerchantProfile = {
  key: string;

  label: string;

  type:
    FinancialMerchantType;

  defaultCategory:
    LedgerExpenseCategory;
};

const FINANCIAL_MERCHANT_HISTORY_KEY =
  'financial_merchant_category_history_v1';

const FINANCIAL_MERCHANT_AUTO_SAVE_KEY =
  'financial_merchant_auto_save_v1';
  
  /*
 * 자산 이동 또는 제외 처리한 금융 알림을
 * 다시 감지 목록에 표시하지 않기 위한 키입니다.
 */
const FINANCIAL_HANDLED_NOTIFICATION_IDS_KEY =
  'financial_handled_notification_ids_v1';

const MAX_HANDLED_FINANCIAL_NOTIFICATION_IDS =
  500;

type FinancialHandledNotificationMap =
  Record<
    string,
    number
  >;
/*
 * 기존 금융 알림 가계부에
 * merchantName을 보완했는지 기록합니다.
 */
const FINANCIAL_MERCHANT_NAME_MIGRATION_KEY =
  'financial_merchant_name_migration_v1';

  /*
 * 한 결제 내역에 보관할
 * 취소 알림 fingerprint 최대 개수입니다.
 *
 * 가장 최근 취소 알림 20개만 유지합니다.
 */
const MAX_CANCELLATION_FINGERPRINT_HISTORY =
  20;

const FINANCIAL_CATEGORY_RULES: {
  category:
    LedgerExpenseCategory;

  keywords:
    string[];
}[] = [
  {
    category:
      '식비',

    keywords: [
      '카페',
      '커피',
      '스타벅스',
      '투썸',
      '이디야',
      '메가커피',
      '컴포즈',
      '빽다방',
      '식당',
      '음식점',
      '김밥',
      '치킨',
      '피자',
      '햄버거',
      '버거',
      '국밥',
      '분식',
      '베이커리',
      '빵',
      '배달의민족',
      '배민',
      '요기요',
      '쿠팡이츠',
      '편의점',
      'cu',
      'gs25',
      '세븐일레븐',
      '이마트24',
      '마트',
      '식품',
      '벙커컴퍼니',
    ],
  },

  {
    category:
      '교통',

    keywords: [
      '택시',
      '카카오t',
      '카카오모빌리티',
      '우버',
      '티머니',
      '캐시비',
      '버스',
      '지하철',
      '철도',
      '코레일',
      'ktx',
      'srt',
      '주유',
      '주유소',
      '충전소',
      '하이패스',
      '톨게이트',
      '주차',
      '쏘카',
      '그린카',
    ],
  },

  {
    category:
      '쇼핑',

    keywords: [
      '쿠팡',
      '네이버쇼핑',
      '스마트스토어',
      '11번가',
      'g마켓',
      '옥션',
      '무신사',
      '올리브영',
      '다이소',
      '백화점',
      '아울렛',
      '홈플러스',
      '이마트',
      '롯데마트',
      '마켓컬리',
      '컬리',
      '쇼핑',
    ],
  },

  {
    category:
      '의료',

    keywords: [
      '병원',
      '의원',
      '치과',
      '약국',
      '한의원',
      '건강검진',
      '클리닉',
      '정형외과',
      '내과',
      '피부과',
      '안과',
      '이비인후과',
    ],
  },

  {
    category:
      '문화',

    keywords: [
      '영화',
      'cgv',
      '롯데시네마',
      '메가박스',
      '공연',
      '전시',
      '박물관',
      '미술관',
      '콘서트',
      '노래방',
      '게임',
      '넷플릭스',
      '왓챠',
      '티빙',
      '디즈니',
      '유튜브',
      '멜론',
    ],
  },

  {
    category:
      '교육',

    keywords: [
      '학원',
      '학교',
      '교육',
      '강의',
      '인강',
      '교보문고',
      '알라딘',
      '예스24',
      '서점',
      '도서',
      '책',
      '문구',
      '스터디',
      '클래스',
    ],
  },
];

const FINANCIAL_MERCHANT_PROFILES: {
  keywords:
    string[];

  profile:
    Omit<
      FinancialMerchantProfile,
      'key'
    >;
}[] = [
  /*
   * =====================================================
   * SINGLE · 식비
   * 대부분 식비로 분류되는 가맹점
   * =====================================================
   */
  {
    keywords: [
      '스타벅스',
      'starbucks',
    ],

    profile: {
      label:
        '스타벅스',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '투썸플레이스',
      '투썸',
    ],

    profile: {
      label:
        '투썸플레이스',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '이디야',
    ],

    profile: {
      label:
        '이디야',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '메가엠지씨커피',
      '메가mgc',
      '메가커피',
    ],

    profile: {
      label:
        '메가커피',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '컴포즈커피',
      '컴포즈',
    ],

    profile: {
      label:
        '컴포즈커피',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '빽다방',
    ],

    profile: {
      label:
        '빽다방',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '파리바게뜨',
      '파리바게트',
    ],

    profile: {
      label:
        '파리바게뜨',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '뚜레쥬르',
    ],

    profile: {
      label:
        '뚜레쥬르',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '배달의민족',
      '우아한형제들',
      '배민',
    ],

    profile: {
      label:
        '배달의민족',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '요기요',
    ],

    profile: {
      label:
        '요기요',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '쿠팡이츠',
    ],

    profile: {
      label:
        '쿠팡이츠',

      type:
        'single',

      defaultCategory:
        '식비',
    },
  },

  /*
   * =====================================================
   * SINGLE · 교통
   * =====================================================
   */
  {
    keywords: [
      '카카오t',
      '카카오티',
      '카카오모빌리티',
      '카카오t일반택',
    ],

    profile: {
      label:
        '카카오T',

      type:
        'single',

      defaultCategory:
        '교통',
    },
  },

  {
    keywords: [
      '티머니',
    ],

    profile: {
      label:
        '티머니',

      type:
        'single',

      defaultCategory:
        '교통',
    },
  },

  {
    keywords: [
      '캐시비',
    ],

    profile: {
      label:
        '캐시비',

      type:
        'single',

      defaultCategory:
        '교통',
    },
  },

  {
    keywords: [
      '코레일',
      'korail',
      'ktx',
    ],

    profile: {
      label:
        '코레일',

      type:
        'single',

      defaultCategory:
        '교통',
    },
  },

  {
    keywords: [
      '에스알',
      'srt',
    ],

    profile: {
      label:
        'SRT',

      type:
        'single',

      defaultCategory:
        '교통',
    },
  },

  {
    keywords: [
      '쏘카',
      'socar',
    ],

    profile: {
      label:
        '쏘카',

      type:
        'single',

      defaultCategory:
        '교통',
    },
  },

  {
    keywords: [
      '그린카',
    ],

    profile: {
      label:
        '그린카',

      type:
        'single',

      defaultCategory:
        '교통',
    },
  },

  /*
   * =====================================================
   * SINGLE · 의료
   * =====================================================
   */
  {
    keywords: [
      '약국',
    ],

    profile: {
      label:
        '약국',

      type:
        'single',

      defaultCategory:
        '의료',
    },
  },

  {
    keywords: [
      '치과',
    ],

    profile: {
      label:
        '치과',

      type:
        'single',

      defaultCategory:
        '의료',
    },
  },

  {
    keywords: [
      '한의원',
    ],

    profile: {
      label:
        '한의원',

      type:
        'single',

      defaultCategory:
        '의료',
    },
  },

  {
    keywords: [
      '병원',
      '의원',
      '클리닉',
    ],

    profile: {
      label:
        '병원·의원',

      type:
        'single',

      defaultCategory:
        '의료',
    },
  },

  /*
   * =====================================================
   * SINGLE · 문화
   * =====================================================
   */
  {
    keywords: [
      'cgv',
      '씨지브이',
    ],

    profile: {
      label:
        'CGV',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  {
    keywords: [
      '메가박스',
    ],

    profile: {
      label:
        '메가박스',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  {
    keywords: [
      '롯데시네마',
    ],

    profile: {
      label:
        '롯데시네마',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  {
    keywords: [
      '넷플릭스',
      'netflix',
    ],

    profile: {
      label:
        '넷플릭스',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  {
    keywords: [
      '티빙',
    ],

    profile: {
      label:
        '티빙',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  {
    keywords: [
      '왓챠',
    ],

    profile: {
      label:
        '왓챠',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  {
    keywords: [
      '디즈니플러스',
      '디즈니+',
    ],

    profile: {
      label:
        '디즈니플러스',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  {
    keywords: [
      '멜론',
    ],

    profile: {
      label:
        '멜론',

      type:
        'single',

      defaultCategory:
        '문화',
    },
  },

  /*
   * =====================================================
   * SINGLE · 교육
   * =====================================================
   */
  {
    keywords: [
      '교보문고',
    ],

    profile: {
      label:
        '교보문고',

      type:
        'single',

      defaultCategory:
        '교육',
    },
  },

  {
    keywords: [
      '알라딘',
    ],

    profile: {
      label:
        '알라딘',

      type:
        'single',

      defaultCategory:
        '교육',
    },
  },

  {
    keywords: [
      '예스24',
      'yes24',
    ],

    profile: {
      label:
        '예스24',

      type:
        'single',

      defaultCategory:
        '교육',
    },
  },

  {
    keywords: [
      '클래스101',
    ],

    profile: {
      label:
        '클래스101',

      type:
        'single',

      defaultCategory:
        '교육',
    },
  },

  {
    keywords: [
      '메가스터디',
    ],

    profile: {
      label:
        '메가스터디',

      type:
        'single',

      defaultCategory:
        '교육',
    },
  },

  /*
   * =====================================================
   * MIXED · 온라인 쇼핑
   * 구매 품목에 따라 카테고리가 바뀔 수 있음
   * =====================================================
   */
 

  {
    keywords: [
      '쿠팡',
      'coupang',
    ],

    profile: {
      label:
        '쿠팡',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '네이버쇼핑',
      '스마트스토어',
      'naver shopping',
    ],

    profile: {
      label:
        '네이버쇼핑',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '11번가',
    ],

    profile: {
      label:
        '11번가',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '지마켓',
      'g마켓',
      'gmarket',
    ],

    profile: {
      label:
        'G마켓',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '옥션',
      'auction',
    ],

    profile: {
      label:
        '옥션',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      'ssg',
      '쓱닷컴',
    ],

    profile: {
      label:
        'SSG.COM',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '컬리',
      '마켓컬리',
    ],

    profile: {
      label:
        '컬리',

      type:
        'mixed',

      defaultCategory:
        '식비',
    },
  },

  /*
   * =====================================================
   * MIXED · 생활 및 유통
   * =====================================================
   */
  {
    keywords: [
      '올리브영',
    ],

    profile: {
      label:
        '올리브영',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '다이소',
    ],

    profile: {
      label:
        '다이소',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '무신사',
    ],

    profile: {
      label:
        '무신사',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  /*
   * 편의점은 대형마트보다 위에 둡니다.
   * 이마트24가 '이마트'에 먼저 걸리는 것을 막습니다.
   */
  {
    keywords: [
      '이마트24',
    ],

    profile: {
      label:
        '이마트24',

      type:
        'mixed',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      'gs25',
      '지에스25',
    ],

    profile: {
      label:
        'GS25',

      type:
        'mixed',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '세븐일레븐',
    ],

    profile: {
      label:
        '세븐일레븐',

      type:
        'mixed',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      '미니스톱',
    ],

    profile: {
      label:
        '미니스톱',

      type:
        'mixed',

      defaultCategory:
        '식비',
    },
  },

  {
    keywords: [
      'cu',
      '씨유',
    ],

    profile: {
      label:
        'CU',

      type:
        'mixed',

      defaultCategory:
        '식비',
    },
  },

  /*
   * 대형마트
   */
  {
    keywords: [
      '이마트',
    ],

    profile: {
      label:
        '이마트',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '홈플러스',
    ],

    profile: {
      label:
        '홈플러스',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '롯데마트',
    ],

    profile: {
      label:
        '롯데마트',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '코스트코',
    ],

    profile: {
      label:
        '코스트코',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  /*
   * 백화점
   */
  {
    keywords: [
      '신세계백화점',
    ],

    profile: {
      label:
        '신세계백화점',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '현대백화점',
    ],

    profile: {
      label:
        '현대백화점',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },

  {
    keywords: [
      '롯데백화점',
    ],

    profile: {
      label:
        '롯데백화점',

      type:
        'mixed',

      defaultCategory:
        '쇼핑',
    },
  },
];



const WATER_GOAL_ML = 2000;
const QUICK_WATER_AMOUNTS = [200];
const WATER_LOGS_KEY = 'root_water_logs';
const WATER_ENABLED_KEY = 'root_water_enabled';
const WEIGHT_LOGS_KEY = 'root_weight_logs';
const WEIGHT_ENABLED_KEY = 'root_weight_enabled';
const SHOW_WEATHER_KEY = 'daily_show_weather_v1';
const SHOW_TIME_GRID_KEY = 'daily_show_time_grid_v1';
const EXERCISE_CALORIE_LOGS_KEY =  'daily_exercise_calorie_logs_v1';
const STEP_LOGS_KEY = 'root_step_logs';
const STEP_ENABLED_KEY = 'root_step_enabled';
const STEP_POINT_PER = 1000;
const ATTENDANCE_LOGS_KEY = 'root_attendance_logs';
const ATTENDANCE_POINT = 20;
const LEDGER_BUDGETS_KEY =  'daily_ledger_budgets_v1';
const MEAL_TYPES = [
  { key: 'breakfast', label: '아침', emoji: '🌅' },
  { key: 'lunch', label: '점심', emoji: '☀️' },
  { key: 'dinner', label: '저녁', emoji: '🌙' },
  { key: 'snack', label: '간식', emoji: '🍪' },
];
const mealMenus = {
  diet: ['닭가슴살 샐러드', '연어 샐러드', '두부 샐러드', '현미 닭가슴살 도시락', '포케', '샐러드 파스타', '비빔밥 소식', '쌀국수', '월남쌈', '참치 샐러드', '계란 김밥', '닭가슴살 김밥', '오트밀', '그릭요거트 볼', '곤약 비빔면'],
  muscle: ['닭가슴살 덮밥', '소고기 덮밥', '제육덮밥', '불고기덮밥', '연어덮밥', '참치 비빔밥', '계란 볶음밥', '닭갈비', '돼지고기 김치볶음', '훈제오리 현미밥', '두부 계란덮밥', '삼겹살 정식', '보쌈 정식', '고등어구이 백반', '순두부찌개 정식'],
  normal: ['김치찌개', '된장찌개', '순두부찌개', '부대찌개', '제육덮밥', '비빔밥', '김치볶음밥', '카레라이스', '짜장면', '짬뽕', '탕수육', '돈까스', '라멘', '우동', '쌀국수', '칼국수', '냉면', '콩국수', '떡볶이', '김밥', '라볶이', '순대국', '설렁탕', '갈비탕', '국밥', '삼겹살', '불고기', '닭갈비', '찜닭', '치킨', '피자', '햄버거', '샌드위치', '파스타', '리조또', '샤브샤브', '초밥', '회덮밥', '오므라이스', '도시락'],
  night: ['라면', '컵라면', '김밥', '떡볶이', '순대', '어묵탕', '치킨', '피자', '족발', '보쌈', '닭발', '곱창', '막창', '타코야끼', '핫도그', '햄버거', '샌드위치', '군만두', '김치전', '부침개', '삶은 계란', '두유', '그릭요거트', '바나나'],
};

type CellInfo = { hour: number; period: '낮' | '저녁'; minute: '00' | '30'; key: string };
type Todo = {  id: string;  text: string;  completed: boolean;  date: string;  reminderAt?: string;  notificationId?: string;};
type Story = { weather: string; mood: string; text: string };
 

type MealItem = { id: string; name: string; memo: string; price: number; calories: number; imageUri?: string };
type EditingMealTarget = {
  dateKey: string;
  mealType: string;
  item: MealItem;
};

type EditingLedgerTarget = {
  dateKey: string;
  item: LedgerItem;
};

type SleepSession = {
  bedTime: string;
  wakeTime: string;
  sleepMinutes: number;
  startAt: string;
  endAt: string;
};

type SleepRecord =
  SleepSession & {
    /*
     * 같은 수면일에 저장된
     * 개별 수면 기록입니다.
     */
    sessions?: SleepSession[];
  };
type CalorieProfile = { height: string; weight: string; age: string; gender: 'male' | 'female' };
type WaterLog = {
  id: string;
  amount_ml: number;
  log_date: string;

  created_at?: string;
};
type WeightLog = { id: string; weight: number; memo?: string; log_date: string };
type StepLog = {  id: string;  steps: number;  points: number;  log_date: string;};
type AttendanceLog = {  id: string;  log_date: string;  points: number;};
type ExerciseCalorieLog = {
  id: string;
  date: string;
  title: string;
  calories: number;
  source: 'manual' | 'timer';
  durationMinutes?: number;
  goalId?: string;
  recordId?: string;
};
type PendingFinancialNotification = {
  id: string;
  packageName: string;
  title: string;
  text: string;
  postedAt: number;
};
type FinancialNotificationAction =
  | 'expense'
  | 'income'
  | 'transfer';

type CancellationLinkCandidate = {
  ledgerDateKey:
    string;

  ledgerItem:
    LedgerItem;
};

type CancellationRestoreTarget = {
  ledgerDateKey:
    string;

  ledgerItem:
    LedgerItem;
};

// =========================================================================
// 2. 헬퍼 함수 (Helper Functions)
// =========================================================================
async function markFinancialNotificationsHandled(
  notificationIds:
    string[]
) {
  const raw =
    await AsyncStorage.getItem(
      FINANCIAL_HANDLED_NOTIFICATION_IDS_KEY
    );

  let saved:
    FinancialHandledNotificationMap =
    {};

  try {
    const parsed =
      raw
        ? JSON.parse(
            raw
          )
        : {};

    if (
      parsed &&
      typeof parsed ===
        'object' &&
      !Array.isArray(
        parsed
      )
    ) {
      saved =
        parsed;
    }
  } catch (
    error
  ) {
    console.log(
      'FINANCIAL HANDLED IDS PARSE ERROR',
      error
    );
  }

  const handledAt =
    Date.now();

  const nextMap = {
    ...saved,
  };

  notificationIds.forEach(
    notificationId => {
      const normalizedId =
        String(
          notificationId ??
            ''
        ).trim();

      if (
        normalizedId
      ) {
        nextMap[
          normalizedId
        ] =
          handledAt;
      }
    }
  );

  /*
   * 저장 데이터가 끝없이 커지지 않도록
   * 가장 최근 500건만 유지합니다.
   */
  const limitedMap =
    Object.fromEntries(
      Object.entries(
        nextMap
      )
        .sort(
          (
            a,
            b
          ) =>
            Number(
              b[1]
            ) -
            Number(
              a[1]
            )
        )
        .slice(
          0,
          MAX_HANDLED_FINANCIAL_NOTIFICATION_IDS
        )
    ) as FinancialHandledNotificationMap;

  await AsyncStorage.setItem(
    FINANCIAL_HANDLED_NOTIFICATION_IDS_KEY,
    JSON.stringify(
      limitedMap
    )
  );

  return limitedMap;
}


function formatDateKey(date: Date) {  const y = date.getFullYear();  const m = String(date.getMonth() + 1).padStart(2, '0');  const d = String(date.getDate()).padStart(2, '0');  return `${y}-${m}-${d}`;}
function formatReminderTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;}
function formatWaterLogTime(
  log: WaterLog
) {
  /*
   * 새 기록은 created_at을 사용하고,
   * 기존 기록은 Date.now()로 만든 id를 사용합니다.
   */
  const idTimestamp =
    Number(
      String(log.id)
        .split('_')[0]
    );

  const date =
    log.created_at
      ? new Date(
          log.created_at
        )
      : Number.isFinite(
          idTimestamp
        )
      ? new Date(
          idTimestamp
        )
      : null;

  if (
    !date ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '--:--';
  }

  const hour =
    String(
      date.getHours()
    ).padStart(2, '0');

  const minute =
    String(
      date.getMinutes()
    ).padStart(2, '0');

  return `${hour}:${minute}`;
}

function formatKoreanDate(date: Date) { return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`; }
function formatMoney(amount: number) { return amount.toLocaleString('ko-KR'); }
function extractWonAmount(
  item:
    PendingFinancialNotification
) {
  const combinedText =
    `${item.title}\n${item.text}`;

  const matched =
    combinedText.match(
      /(?:₩\s*)?(\d{1,3}(?:,\d{3})+|\d+)\s*원/
    );

  if (!matched?.[1]) {
    return 0;
  }

  return Number(
    matched[1].replace(
      /,/g,
      ''
    )
  );
}

function isFinancialCancellationNotification(
  item:
    PendingFinancialNotification
) {
  const combinedText =
    `${item.title} ${item.text}`
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );

  return [
    '승인취소',
    '승인 취소',
    '결제취소',
    '결제 취소',
    '매출취소',
    '매출 취소',
    '체크취소',
    '체크 취소',
    '이용취소',
    '이용 취소',
  ].some(
    keyword =>
      combinedText.includes(
        keyword
      )
  );
}

function findCancellationTarget(
  savedLedgers:
    Record<
      string,
      LedgerItem[]
    >,

  cancellationItem:
    PendingFinancialNotification,

  cancellationAmount:
    number
) {
  const cancellationMerchant =
    getFinancialMerchantProfile(
      cancellationItem
    );

  const cancellationTime =
    Number(
      cancellationItem.postedAt
    );

  const candidates =
    Object.entries(
      savedLedgers
    )
      .flatMap(
        ([
          ledgerDateKey,
          ledgerItems,
        ]) =>
          (
            Array.isArray(
              ledgerItems
            )
              ? ledgerItems
              : []
          ).map(
            ledgerItem => ({
              ledgerDateKey,
              ledgerItem,
            }))
      )
      .filter(
        candidate => {
          const {
            ledgerItem,
          } =
            candidate;

          if (
            ledgerItem.type !==
            'expense'
          ) {
            return false;
          }

          /*
 * 카드 알림으로 생성된 지출만
 * 승인 취소 대상으로 사용합니다.
 */
if (
  ledgerItem.inputSource !==
  'notification'
) {
  return false;
}

          if (
            ledgerItem.cancelled
          ) {
            return false;
          }

          if (
            Number(
              ledgerItem.amount
            ) !==
            cancellationAmount
          ) {
            return false;
          }

          const merchantMatched =
            ledgerItem
              .merchantName
              ?.trim()
              .toLowerCase() ===
            cancellationMerchant
              .label
              .trim()
              .toLowerCase();

          /*
           * 결제처 정보가 없는 옛 기록은
           * 금액을 우선 기준으로 사용할 수 있습니다.
           */
          if (
            ledgerItem
              .merchantName &&
            !merchantMatched
          ) {
            return false;
          }

          const occurredTime =
            ledgerItem
              .occurredAt
              ? new Date(
                  ledgerItem
                    .occurredAt
                ).getTime()
              : 0;

          /*
           * 취소 알림보다 나중에 발생한
           * 결제는 대상이 아닙니다.
           */
          if (
            occurredTime >
            cancellationTime
          ) {
            return false;
          }

          return true;
        }
      )
      .sort(
        (a, b) => {
          const aTime =
            a.ledgerItem
              .occurredAt
              ? new Date(
                  a.ledgerItem
                    .occurredAt
                ).getTime()
              : 0;

          const bTime =
            b.ledgerItem
              .occurredAt
              ? new Date(
                  b.ledgerItem
                    .occurredAt
                ).getTime()
              : 0;

          /*
           * 가장 최근 결제부터 찾습니다.
           */
          return (
            bTime -
            aTime
          );
        }
      );

  return (
    candidates[0] ??
    null
  );
}

function getCancellationLinkCandidates(
  savedLedgers:
    Record<
      string,
      LedgerItem[]
    >,

  cancellationItem:
    PendingFinancialNotification,

  cancellationAmount:
    number
): CancellationLinkCandidate[] {
  const cancellationTime =
    Number(
      cancellationItem.postedAt
    );

  return Object.entries(
    savedLedgers
  )
    .flatMap(
      ([
        ledgerDateKey,
        ledgerItems,
      ]) =>
        (
          Array.isArray(
            ledgerItems
          )
            ? ledgerItems
            : []
        ).map(
          ledgerItem => ({
            ledgerDateKey,
            ledgerItem,
          })
        )
    )
    .filter(
      candidate => {
        const {
          ledgerItem,
        } =
          candidate;

        /*
         * 카드 금융 알림으로 저장된
         * 지출만 후보로 보여줍니다.
         */
        if (
          ledgerItem.type !==
            'expense' ||
          ledgerItem.inputSource !==
            'notification'
        ) {
          return false;
        }

        /*
         * 이미 취소된 내역은
         * 다시 선택할 수 없습니다.
         */
        if (
          ledgerItem.cancelled
        ) {
          return false;
        }

        /*
         * 수동 연결에서도 우선
         * 금액이 같은 결제만 표시합니다.
         */
        if (
          Number(
            ledgerItem.amount
          ) !==
          cancellationAmount
        ) {
          return false;
        }

        const occurredTime =
          ledgerItem.occurredAt
            ? new Date(
                ledgerItem.occurredAt
              ).getTime()
            : new Date(
                candidate
                  .ledgerDateKey
              ).getTime();

        /*
         * 취소 알림 이후에 발생한 결제는
         * 후보가 될 수 없습니다.
         */
        if (
          occurredTime >
          cancellationTime
        ) {
          return false;
        }

        return true;
      }
    )
    .sort(
      (a, b) => {
        const aTime =
          a.ledgerItem
            .occurredAt
            ? new Date(
                a.ledgerItem
                  .occurredAt
              ).getTime()
            : new Date(
                a.ledgerDateKey
              ).getTime();

        const bTime =
          b.ledgerItem
            .occurredAt
            ? new Date(
                b.ledgerItem
                  .occurredAt
              ).getTime()
            : new Date(
                b.ledgerDateKey
              ).getTime();

        return (
          bTime -
          aTime
        );
      }
    )
    .slice(
      0,
      10
    );
}

function buildCancellationFingerprintHistory(
  ledgerItem:
    LedgerItem,

  newFingerprint:
    string
) {
  const currentHistory =
    Array.isArray(
      ledgerItem
        .cancellationFingerprintHistory
    )
      ? ledgerItem
          .cancellationFingerprintHistory
      : [];

  /*
   * 배열에는 없지만 현재 단일 필드에만
   * 들어 있는 과거 fingerprint도 포함합니다.
   */
  const currentFingerprint =
    ledgerItem
      .cancellationFingerprint;

  const uniqueHistory =
    Array.from(
      new Set([
        ...currentHistory,

        ...(
          currentFingerprint
            ? [
                currentFingerprint,
              ]
            : []
        ),

        newFingerprint,
      ])
    );

  /*
   * 새 알림이 배열 마지막에 추가되므로
   * 뒤에서 최근 20개만 남깁니다.
   */
  return uniqueHistory.slice(
    -MAX_CANCELLATION_FINGERPRINT_HISTORY
  );
}



function isActiveLedgerExpense(
  item:
    LedgerItem
) {
  return (
    item.type ===
      'expense' &&
    !item.cancelled
  );
}

function normalizeMerchantText(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /\[web발신\]/g,
      ' '
    )
    .replace(
      /\[[^\]]+\]/g,
      ' '
    )
    .replace(
      /\d{2}\/\d{2}/g,
      ' '
    )
    .replace(
      /\d{1,2}:\d{2}/g,
      ' '
    )
    .replace(
      /\d{1,3}(?:,\d{3})*\s*원/g,
      ' '
    )
    .replace(
      /잔액\s*\d{1,3}(?:,\d{3})*\s*원/g,
      ' '
    )
    .replace(
      /[^가-힣a-z0-9\s()]/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

function getFinancialMerchantProfile(
  item:
    PendingFinancialNotification
): FinancialMerchantProfile {
  const combinedText =
    normalizeMerchantText(
      `${item.title} ${item.text}`
    );

  const matchedProfile =
    FINANCIAL_MERCHANT_PROFILES.find(
      merchant =>
        merchant.keywords.some(
          keyword =>
            combinedText.includes(
              keyword.toLowerCase()
            )
        )
    );

  if (matchedProfile) {
    const normalizedKey =
      matchedProfile
        .profile
        .label
        .toLowerCase()
        .replace(
          /\s+/g,
          ''
        );

    return {
      key:
        normalizedKey,

      ...matchedProfile.profile,
    };
  }

  /*
   * DB에 없는 가맹점은 알림 문구에서
   * 마지막에 가까운 일반 텍스트를 추출합니다.
   */
  const words =
    combinedText
      .split(' ')
      .map(
        word =>
          word.trim()
      )
      .filter(
        word =>
          word.length >= 2
      )
      .filter(
        word =>
          ![
            '신한카드',
            '승인안내',
            '신한체크승인',
            '일반택',
            '일시불',
            '승인',
            '체크승인',
          ].some(
            ignored =>
              word.includes(
                ignored
              )
          )
      );

  const fallbackLabel =
    words[
      words.length - 1
    ] ??
    item.title.trim() ??
    '알 수 없는 가맹점';

  const fallbackKey =
    fallbackLabel
      .toLowerCase()
      .replace(
        /\s+/g,
        ''
      )
      .slice(
        0,
        40
      );

  return {
    key:
      fallbackKey ||
      item.packageName,

    label:
      fallbackLabel,

    type:
      'mixed',

    defaultCategory:
      '기타',
  };
}

function getRecommendedLedgerCategories(
  item:
    PendingFinancialNotification,

  merchantHistory:
    MerchantCategoryHistory
): LedgerExpenseCategory[] {
  const combinedText =
    `${item.title} ${item.text}`
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );

  const merchantProfile =
    getFinancialMerchantProfile(
      item
    );

  /*
   * 최근 기록일수록 높은 점수를 줍니다.
   * 최대 최근 20건만 사용합니다.
   */
  const historyItems =
    (
      merchantHistory[
        merchantProfile.key
      ] ?? []
    ).slice(
      0,
      20
    );

  const historyScoreMap =
    new Map<
      LedgerExpenseCategory,
      number
    >();

  historyItems.forEach(
    (
      historyItem,
      index
    ) => {
      /*
       * 최신 기록:
       * 20점부터 시작
       *
       * 오래된 기록일수록
       * 점수가 조금씩 낮아집니다.
       */
      const score =
        Math.max(
          1,
          20 - index
        );

      historyScoreMap.set(
        historyItem.category,
        (
          historyScoreMap.get(
            historyItem.category
          ) ?? 0
        ) + score
      );
    }
  );

  /*
   * 기존 키워드 규칙 점수
   */
  const keywordScoreMap =
    new Map<
      LedgerExpenseCategory,
      number
    >();

  FINANCIAL_CATEGORY_RULES.forEach(
    rule => {
      const matchedCount =
        rule.keywords.filter(
          keyword =>
            combinedText.includes(
              keyword.toLowerCase()
            )
        ).length;

      if (
        matchedCount > 0
      ) {
        keywordScoreMap.set(
          rule.category,
          matchedCount * 10
        );
      }
    }
  );

  /*
   * single 가맹점은 기본 카테고리에
   * 강한 우선점수를 줍니다.
   *
   * mixed는 기본 추천만 살짝 우선하고
   * 사용자 기록이 충분하면 뒤집힐 수 있습니다.
   */
  const merchantDefaultScore =
    merchantProfile.type ===
    'single'
      ? 80
      : 12;

  const allCategories =
    LEDGER_CATEGORIES.filter(
      category =>
        category !==
        '기타'
    ) as LedgerExpenseCategory[];

  const scoredCategories =
    allCategories
      .map(
        (
          category,
          originalIndex
        ) => {
          const defaultScore =
            category ===
            merchantProfile
              .defaultCategory
              ? merchantDefaultScore
              : 0;

          return {
            category,

            score:
              defaultScore +
              (
                keywordScoreMap.get(
                  category
                ) ?? 0
              ) +
              (
                historyScoreMap.get(
                  category
                ) ?? 0
              ),

            originalIndex,
          };
        }
      )
      .sort(
        (a, b) =>
          b.score -
            a.score ||
          a.originalIndex -
            b.originalIndex
      )
      .map(
        result =>
          result.category
      );

  return [
    ...scoredCategories,
    '기타',
  ];
}

function getMerchantCategoryHistorySummary(
  item:
    PendingFinancialNotification,

  merchantHistory:
    MerchantCategoryHistory
) {
  const merchantProfile =
    getFinancialMerchantProfile(
      item
    );

  const historyItems =
    merchantHistory[
      merchantProfile.key
    ] ?? [];

  if (
    historyItems.length === 0
  ) {
    return {
      totalCount:
        0,

      summaryText:
        '아직 선택 기록이 없어요.',
    };
  }

  const countMap =
    new Map<
      LedgerExpenseCategory,
      number
    >();

  historyItems.forEach(
    historyItem => {
      countMap.set(
        historyItem.category,
        (
          countMap.get(
            historyItem.category
          ) ?? 0
        ) + 1
      );
    }
  );

  const sortedItems =
    Array.from(
      countMap.entries()
    )
      .sort(
        (a, b) =>
          b[1] -
          a[1]
      )
      .slice(
        0,
        3
      );

  const summaryText =
    sortedItems
      .map(
        (
          [
            category,
            count,
          ]
        ) =>
          `${category} ${count}회`
      )
      .join(
        ' · '
      );

  return {
    totalCount:
      historyItems.length,

    summaryText:
      `최근 선택: ${summaryText}`,
  };
}

function getMerchantLabelByKey(
  merchantKey:
    string
) {
  const matchedProfile =
    FINANCIAL_MERCHANT_PROFILES.find(
      merchant => {
        const profileKey =
          merchant.profile.label
            .toLowerCase()
            .replace(
              /\s+/g,
              ''
            );

        return (
          profileKey ===
          merchantKey
        );
      }
    );

  return (
    matchedProfile
      ?.profile
      .label ??
    merchantKey
  );
}


function formatMonthKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  return `${year}-${month}`;
}

/*
 * 월 예산을 이번 달 전체 날짜로
 * 고정 배분합니다.
 *
 * 사용 금액과 관계없이
 * 월 예산이 바뀌지 않는 한
 * 날짜별 배정 예산도 바뀌지 않습니다.
 */
function getFixedDailyBudget(
  monthBudget: number,
  date: Date
) {
  if (monthBudget <= 0) {
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

  /*
   * 나누고 남은 금액은
   * 월초 날짜부터 1원씩 배정합니다.
   *
   * 모든 날짜의 배정액 합계가
   * 월 예산과 정확히 같아집니다.
   */
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

/*
 * 이번 주 월요일~일요일 범위
 *
 * 월 예산을 기준으로 보기 때문에
 * 월이 넘어가는 날짜는 현재 월까지만 포함합니다.
 */
function getBudgetWeekRange(
  date: Date
) {
  const current =
    new Date(date);

  current.setHours(
    0,
    0,
    0,
    0
  );

  const monday =
    new Date(current);

  const dayOfWeek =
    monday.getDay();

  monday.setDate(
    monday.getDate() +
      (
        dayOfWeek === 0
          ? -6
          : 1 - dayOfWeek
      )
  );

  const sunday =
    new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  const monthStart =
    new Date(
      current.getFullYear(),
      current.getMonth(),
      1
    );

  const monthEnd =
    new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      0
    );

  monthStart.setHours(
    0,
    0,
    0,
    0
  );

  monthEnd.setHours(
    0,
    0,
    0,
    0
  );

  return {
    start:
      monday < monthStart
        ? monthStart
        : monday,

    end:
      sunday > monthEnd
        ? monthEnd
        : sunday,
  };
}

function formatSleepMinutes(minutes: number) {  const h = Math.floor(minutes / 60);  const m = minutes % 60;  return `${h}시간 ${m}분`;}
/*
 * 수면 날짜는 낮 12시를 기준으로 구분합니다.
 *
 * 예:
 * 07월 16일 오전 7시 종료
 * → 07월 16일 수면
 *
 * 07월 16일 오후 1시 종료
 * → 07월 17일 수면
 */
function getSleepDayKey(
  endDate: Date
) {
  const sleepDay =
    new Date(endDate);

  if (
    sleepDay.getHours() >= 12
  ) {
    sleepDay.setDate(
      sleepDay.getDate() + 1
    );
  }

  return formatDateKey(
    sleepDay
  );
}

function getSleepSessions(
  record?: SleepRecord
): SleepSession[] {
  if (!record) {
    return [];
  }

  /*
   * 새 형식의 데이터
   */
  if (
    Array.isArray(
      record.sessions
    ) &&
    record.sessions.length > 0
  ) {
    return record.sessions;
  }

  /*
   * 기존 단일 수면 데이터를
   * 세션 하나로 변환합니다.
   */
  return [
    {
      bedTime:
        record.bedTime,

      wakeTime:
        record.wakeTime,

      sleepMinutes:
        record.sleepMinutes,

      startAt:
        record.startAt,

      endAt:
        record.endAt,
    },
  ];
}

function mergeSleepRecord(
  currentRecord:
    | SleepRecord
    | undefined,

  newSession:
    SleepSession
): SleepRecord {
  /*
   * 앱과 위젯에서 같은 기록이
   * 중복 저장되는 것을 막습니다.
   */
  const sessionMap =
    new Map<
      string,
      SleepSession
    >();

  [
    ...getSleepSessions(
      currentRecord
    ),
    newSession,
  ].forEach((session) => {
    const sessionKey =
      `${session.startAt}_` +
      `${session.endAt}`;

    sessionMap.set(
      sessionKey,
      session
    );
  });

  const sessions =
    Array.from(
      sessionMap.values()
    ).sort(
      (a, b) =>
        new Date(
          a.startAt
        ).getTime() -
        new Date(
          b.startAt
        ).getTime()
    );

  const firstSession =
    sessions[0];

  const lastSession =
    sessions[
      sessions.length - 1
    ];

  const totalMinutes =
    sessions.reduce(
      (
        sum,
        session
      ) =>
        sum +
        session.sleepMinutes,
      0
    );

  return {
    /*
     * 한 번 잔 날에는 기존처럼
     * 취침~기상 시간을 표시합니다.
     */
    bedTime:
      firstSession.bedTime,

    wakeTime:
      lastSession.wakeTime,

    sleepMinutes:
      totalMinutes,

    startAt:
      firstSession.startAt,

    endAt:
      lastSession.endAt,

    sessions,
  };
}

function getSleepRecordSummary(
  record: SleepRecord
) {
  const sessionCount =
    getSleepSessions(
      record
    ).length;

  if (sessionCount <= 1) {
    return (
      `${formatSleepMinutes(
        record.sleepMinutes
      )} · ` +
      `${record.bedTime}` +
      ` ~ ${record.wakeTime}`
    );
  }

  return (
    `${formatSleepMinutes(
      record.sleepMinutes
    )} · ` +
    `${sessionCount}회`
  );
}

function parseWidgetSleepDate(value: any) {
  const numberValue = Number(value);

  if (
    Number.isFinite(numberValue) &&
    numberValue > 0
  ) {
    return new Date(numberValue);
  }

  return new Date(value);
}



function calculateBmr(profile: CalorieProfile) {
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  const age = Number(profile.age);
  if (!height || !weight || !age) return 0;
  return profile.gender === 'male'
    ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
    : Math.round(10 * weight + 6.25 * height - 5 * age - 161);
}
function formatSleepTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  return `${h}시간 ${m}분`;
}
function getWeatherInfo(code: number) {
  if (code === 0) return { icon: '☀️', label: '맑음' };
  if (code === 1) return { icon: '🌤️', label: '대체로 맑음' };
  if (code === 2) return { icon: '⛅', label: '구름 조금' };
  if (code === 3) return { icon: '☁️', label: '흐림' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: '안개' };
  if ([51, 53, 55].includes(code)) return { icon: '🌦️', label: '이슬비' };
  if ([61, 63, 65, 80, 81, 82].includes(code)) return { icon: '🌧️', label: '비' };
  if ([71, 73, 75, 85, 86].includes(code)) return { icon: '❄️', label: '눈' };
  if ([95, 96, 99].includes(code)) return { icon: '⛈️', label: '천둥번개' };

  return { icon: '🌤️', label: '날씨' };
}
function calculateRecommendedCalories(profile: CalorieProfile) {  const bmr = calculateBmr(profile);  return bmr ? Math.round(bmr * 1.3) : 0;}
function isToday(date: Date) { return formatDateKey(date) === formatDateKey(new Date()); }
function getCalendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startDay);
  return Array.from({ length: 42 }).map((_, index) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    return day;
  });
}
const LEDGER_CHART_COLORS = [
  '#A96B1F',
  '#C4873A',
  '#D3A35A',
  '#7A5C32',
  '#B85C38',
  '#6F7B4A',
  '#8B6F9E',
];

type LedgerCategoryChartItem = {
  category: string;
  amount: number;
  color: string;
};

function LedgerCategoryDonut({
  data,
  theme,
  isCityBlack,
}: {
  data: LedgerCategoryChartItem[];
  theme: any;
  isCityBlack: boolean;
}) {
  const total =
    data.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

  const size = 156;
  const center = size / 2;
  const radius = 52;
  const strokeWidth = 24;

  const circumference =
    2 *
    Math.PI *
    radius;

  let runningOffset = 0;

  const segments =
    total > 0
      ? data.map(
          (item) => {
            const length =
              (
                item.amount /
                total
              ) *
              circumference;

            const offset =
              runningOffset;

            runningOffset +=
              length;

            /*
             * 조각 사이에 작은 틈을
             * 만들기 위해 2를 뺍니다.
             */
            const visibleLength =
              Math.max(
                0.5,
                length - 2
              );

            return {
              ...item,
              length:
                visibleLength,
              offset,
            };
          }
        )
      : [];

  return (
    <View
      style={[
        styles.ledgerCategoryChartCard,
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
    >
      <Text
        style={[
          styles.ledgerCategoryChartTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        카테고리별 지출
      </Text>

      {total <= 0 ? (
        <Text
          style={[
            styles.ledgerCategoryChartEmpty,
            {
              color:
                theme.subText,
            },
          ]}
        >
          이번 달 지출 내역이
          없습니다.
        </Text>
      ) : (
        <View
          style={
            styles.ledgerCategoryChartContent
          }
        >
          <View
            style={
              styles.ledgerCategoryDonutWrap
            }
          >
            <Svg
              width={size}
              height={size}
            >
              {/* 그래프 바탕 */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={
                  theme.line
                }
                strokeWidth={
                  strokeWidth
                }
              />

              {/* 카테고리별 조각 */}
              <G
                rotation="-90"
                origin={`${center}, ${center}`}
              >
                {segments.map(
                  (
                    segment
                  ) => (
                    <Circle
                      key={
                        segment.category
                      }
                      cx={
                        center
                      }
                      cy={
                        center
                      }
                      r={
                        radius
                      }
                      fill="none"
                      stroke={
                        segment.color
                      }
                      strokeWidth={
                        strokeWidth
                      }
                      strokeDasharray={[
                        segment.length,
                        circumference -
                          segment.length,
                      ]}
                      strokeDashoffset={
                        -segment.offset
                      }
                      strokeLinecap="butt"
                    />
                  )
                )}
              </G>
            </Svg>

            {/* 그래프 중앙 금액 */}
            <View
              pointerEvents="none"
              style={
                styles.ledgerCategoryDonutCenter
              }
            >
              <Text
                style={[
                  styles.ledgerCategoryDonutLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                총 지출
              </Text>

              <Text
                style={[
                  styles.ledgerCategoryDonutAmount,
                  {
                    color:
                      theme.text,
                  },
                ]}
                numberOfLines={
                  1
                }
                adjustsFontSizeToFit
              >
                {formatMoney(
                  total
                )}
                원
              </Text>
            </View>
          </View>

          {/* 카테고리 설명 */}
          <View
            style={
              styles.ledgerCategoryLegend
            }
          >
            {data.map(
              (item) => (
                <View
                  key={
                    item.category
                  }
                  style={
                    styles.ledgerCategoryLegendItem
                  }
                >
                  <View
                    style={[
                      styles.ledgerCategoryLegendDot,
                      {
                        backgroundColor:
                          item.color,
                      },
                    ]}
                  />

                  <View
                    style={
                      styles.ledgerCategoryLegendTextBox
                    }
                  >
                    <Text
                      style={[
                        styles.ledgerCategoryLegendLabel,
                        {
                          color:
                            theme.subText,
                        },
                      ]}
                      numberOfLines={
                        1
                      }
                    >
                      {
                        item.category
                      }
                    </Text>

                    <Text
  style={[
    styles.ledgerCategoryLegendAmount,
    {
      color:
        theme.text,
    },
  ]}
  numberOfLines={1}
>
  {formatMoney(
    item.amount
  )}
  원 ·{' '}
  {Math.round(
    (
      item.amount /
      total
    ) *
      100
  )}
  %
</Text>
                  </View>
                </View>
              )
            )}
          </View>
        </View>
      )}
    </View>
  );
}
// =========================================================================
// 3. 메인 화면 컴포넌트 (Main Screen Component)
// =========================================================================
export default function DayScreen() {



  const params =
  useLocalSearchParams<{
    openTodoModal?: string;
    openTodoSection?: string;
    openMealModal?: string;
    openLedgerModal?: string;
    openLedgerSection?: string;
    mealType?: string;
    sleepAction?: string;
    widgetTs?: string;
  }>();

  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';
const [
  hasFinancialNotificationAccess,
  setHasFinancialNotificationAccess,
] = useState(false);

const [
  pendingFinancialNotifications,
  setPendingFinancialNotifications,
] = useState<
  PendingFinancialNotification[]
>([]);

const [
  financialNotificationLoading,
  setFinancialNotificationLoading,
] = useState(false);

const [
  merchantCategoryHistory,
  setMerchantCategoryHistory,
] = useState<
  MerchantCategoryHistory
>({});

const [
  merchantAutoSaveRules,
  setMerchantAutoSaveRules,
] = useState<
  MerchantAutoSaveRules
>({});

const [
  showMerchantAutoSaveModal,
  setShowMerchantAutoSaveModal,
] = useState(false);

const [
  showCancellationLinkModal,
  setShowCancellationLinkModal,
] = useState(false);

const [
  pendingCancellationItem,
  setPendingCancellationItem,
] = useState<
  PendingFinancialNotification |
  null
>(null);

const [
  cancellationLinkCandidates,
  setCancellationLinkCandidates,
] = useState<
  CancellationLinkCandidate[]
>([]);

const [
  cancellationRestoreTarget,
  setCancellationRestoreTarget,
] = useState<
  CancellationRestoreTarget |
  null
>(null);

const [
  financialActionProcessing,
  setFinancialActionProcessing,
] = useState(false);

const financialActionProcessingRef =
  useRef(false);

  const startFinancialActionProcessing =
  useCallback(() => {
    if (
      financialActionProcessingRef
        .current
    ) {
      return false;
    }

    financialActionProcessingRef
      .current = true;

    setFinancialActionProcessing(
      true
    );

    return true;
  }, []);

const finishFinancialActionProcessing =
  useCallback(() => {
    financialActionProcessingRef
      .current = false;

    setFinancialActionProcessing(
      false
    );
  }, []);


const loadMerchantCategoryHistory =
  useCallback(async () => {
    try {
      const raw =
        await AsyncStorage.getItem(
          FINANCIAL_MERCHANT_HISTORY_KEY
        );

      const saved:
        MerchantCategoryHistory =
        raw
          ? JSON.parse(
              raw
            )
          : {};

      setMerchantCategoryHistory(
        saved
      );

      return saved;
    } catch (error) {
      console.log(
        'MERCHANT CATEGORY HISTORY LOAD ERROR',
        error
      );

      setMerchantCategoryHistory(
        {}
      );

      return {};
    }
  }, []);

  const loadMerchantAutoSaveRules =
  useCallback(async () => {
    try {
      const raw =
        await AsyncStorage.getItem(
          FINANCIAL_MERCHANT_AUTO_SAVE_KEY
        );

      const saved:
        MerchantAutoSaveRules =
        raw
          ? JSON.parse(
              raw
            )
          : {};

      setMerchantAutoSaveRules(
        saved
      );

      return saved;
    } catch (error) {
      console.log(
        'MERCHANT AUTO SAVE LOAD ERROR',
        error
      );

      setMerchantAutoSaveRules(
        {}
      );

      return {};
    }
  }, []);

const migrateExistingLedgerMerchantNames =
  useCallback(async () => {
    try {
      const migrationDone =
        await AsyncStorage.getItem(
          FINANCIAL_MERCHANT_NAME_MIGRATION_KEY
        );

      /*
       * 이미 마이그레이션을 완료했다면
       * 다시 실행하지 않습니다.
       */
      if (
        migrationDone ===
        'done'
      ) {
        return;
      }

      const raw =
        await AsyncStorage.getItem(
          'daily_ledger_v1'
        );

      const savedLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        raw
          ? JSON.parse(raw)
          : {};

      let changedCount =
        0;

      const nextLedgers =
        Object.fromEntries(
          Object.entries(
            savedLedgers
          ).map(
            ([
              ledgerDateKey,
              ledgerItems,
            ]) => {
              const nextItems =
                (
                  Array.isArray(
                    ledgerItems
                  )
                    ? ledgerItems
                    : []
                ).map(
                  ledgerItem => {
                    /*
                     * 수동 입력과 식사 기록은
                     * 마이그레이션 대상이 아닙니다.
                     */
                    if (
                      ledgerItem.inputSource !==
                      'notification'
                    ) {
                      return ledgerItem;
                    }

                    /*
                     * 이미 결제처명이 있는 기록은
                     * 그대로 유지합니다.
                     */
                    if (
                      ledgerItem
                        .merchantName
                        ?.trim()
                    ) {
                      return ledgerItem;
                    }

                    const fallbackNotification:
                      PendingFinancialNotification = {
                      id:
                        ledgerItem
                          .notificationFingerprint ??
                        ledgerItem.id,

                      packageName:
                        ledgerItem
                          .sourcePackage ??
                        '',

                      title:
                        ledgerItem
                          .paymentMethod ??
                        '',

                      text:
                        ledgerItem.memo ??
                        '',

                      postedAt:
                        ledgerItem
                          .occurredAt
                          ? new Date(
                              ledgerItem
                                .occurredAt
                            ).getTime()
                          : Date.now(),
                    };

                    const merchantProfile =
                      getFinancialMerchantProfile(
                        fallbackNotification
                      );

                    const merchantName =
                      merchantProfile
                        .label
                        .trim();

                    if (
                      !merchantName
                    ) {
                      return ledgerItem;
                    }

                    changedCount +=
                      1;

                    return {
                      ...ledgerItem,

                      merchantName,
                    };
                  }
                );

              return [
                ledgerDateKey,
                nextItems,
              ];
            }
          )
        ) as Record<
          string,
          LedgerItem[]
        >;

      if (
        changedCount > 0
      ) {
        await AsyncStorage.setItem(
          'daily_ledger_v1',
          JSON.stringify(
            nextLedgers
          )
        );

        setLedgers(
          nextLedgers
        );

       
        /*
 * 변경된 가계부 데이터를
 * 서버에도 동기화합니다.
 */
syncDailyDataToServer()
  .catch(
    error => {
      console.log(
        'FINANCIAL MERCHANT MIGRATION CLOUD SYNC ERROR',
        error
      );
    }
  );
      }

      await AsyncStorage.setItem(
        FINANCIAL_MERCHANT_NAME_MIGRATION_KEY,
        'done'
      );

      console.log(
        'FINANCIAL MERCHANT NAME MIGRATION DONE',
        {
          changedCount,
        }
      );
    } catch (error) {
      console.log(
        'FINANCIAL MERCHANT NAME MIGRATION ERROR',
        error
      );
    }
  }, []);

const loadPendingFinancialNotifications =
  useCallback(async () => {
    try {
      setFinancialNotificationLoading(
        true
      );

      const granted =
        await hasCardNotificationAccess();

      setHasFinancialNotificationAccess(
        granted
      );

      if (!granted) {
        setPendingFinancialNotifications(
          []
        );

        return;
      }

      const nativeItems =
        await getNativePendingCardNotifications();

      const normalizedItems:
        PendingFinancialNotification[] =
        (
          Array.isArray(
            nativeItems
          )
            ? nativeItems
            : []
        ).map(
          (
            item: any,
            index: number
          ) => {
            const postedAt =
              Number(
                item?.postedAt ??
                  item?.postTime ??
                  Date.now()
              );

            return {
              id:
                String(
                  item?.id ??
                    item
                      ?.notificationFingerprint ??
                    item?.fingerprint ??
                    `${postedAt}_${index}`
                ),

              packageName:
                String(
                  item?.packageName ??
                    ''
                ),

              title:
                String(
                  item?.title ??
                    ''
                ),

              text:
                String(
                  item?.text ??
                    ''
                ),

              postedAt:
                Number.isFinite(
                  postedAt
                )
                  ? postedAt
                  : Date.now(),
            };
          }
        );
/*
 * 자산 이동 또는 제외 처리한 알림 ID를
 * 로컬 저장소에서 불러옵니다.
 */
const handledRaw =
  await AsyncStorage.getItem(
    FINANCIAL_HANDLED_NOTIFICATION_IDS_KEY
  );

let handledMap:
  FinancialHandledNotificationMap =
  {};

try {
  const parsedHandledMap =
    handledRaw
      ? JSON.parse(
          handledRaw
        )
      : {};

  if (
    parsedHandledMap &&
    typeof parsedHandledMap ===
      'object' &&
    !Array.isArray(
      parsedHandledMap
    )
  ) {
    handledMap =
      parsedHandledMap;
  }
} catch (
  error
) {
  console.log(
    'FINANCIAL HANDLED IDS LOAD ERROR',
    error
  );
}

const handledIdSet =
  new Set(
    Object.keys(
      handledMap
    )
  );
      /*
       * 이미 가계부에 반영한 금융 알림은
       * 네이티브 목록에 남아 있더라도
       * 다시 화면에 보여주지 않습니다.
       */
      const ledgerRaw =
        await AsyncStorage.getItem(
          'daily_ledger_v1'
        );

      const savedLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        ledgerRaw
          ? JSON.parse(
              ledgerRaw
            )
          : {};

      const savedFingerprintSet =
  new Set(
    Object.values(
      savedLedgers
    )
      .flat()
      .flatMap(
        ledgerItem => [
          ledgerItem
            ?.notificationFingerprint,

          ledgerItem
            ?.cancellationFingerprint,

          ...(
            Array.isArray(
              ledgerItem
                ?.cancellationFingerprintHistory
            )
              ? ledgerItem
                  .cancellationFingerprintHistory
              : []
          ),
        ]
      )
      .filter(
        (
          fingerprint
        ): fingerprint is string =>
          typeof fingerprint ===
            'string' &&
          fingerprint.length > 0
      )
  );

      const alreadyHandledItems =
  normalizedItems.filter(
    item =>
      savedFingerprintSet.has(
        item.id
      ) ||
      handledIdSet.has(
        item.id
      )
  );

      /*
       * 네이티브 저장소에도 남아 있는
       * 처리 완료 알림을 다시 삭제합니다.
       *
       * 삭제 실패가 있더라도 화면에서는
       * 이미 제외했으므로 다시 나타나지 않습니다.
       */
      await Promise.allSettled(
        alreadyHandledItems.map(
          item =>
            removeNativePendingCardNotification(
              item.id
            )
        )
      );

      const visibleItems =
  normalizedItems.filter(
    item =>
      !savedFingerprintSet.has(
        item.id
      ) &&
      !handledIdSet.has(
        item.id
      )
  );

      visibleItems.sort(
        (a, b) =>
          b.postedAt -
          a.postedAt
      );

      setPendingFinancialNotifications(
        visibleItems
      );


      console.log(
        'CARD NOTIFICATION RAW COUNT',
        normalizedItems.length
      );

      console.log(
        'CARD NOTIFICATION ALREADY HANDLED COUNT',
        alreadyHandledItems.length
      );

      console.log(
        'CARD NOTIFICATION VISIBLE COUNT',
        visibleItems.length
      );
    } catch (error) {
      console.log(
        'CARD NOTIFICATION LOAD ERROR',
        error
      );
    } finally {
      setFinancialNotificationLoading(
        false
      );
    }
  }, []);

const dismissPendingFinancialNotification =
  useCallback(
    async (
      item:
        PendingFinancialNotification
    ) => {
      try {
        /*
         * 네이티브 목록을 삭제하기 전에
         * 처리 완료 ID를 먼저 저장합니다.
         *
         * 네이티브 삭제가 늦거나 실패해도
         * 같은 알림이 다시 표시되지 않습니다.
         */
        await markFinancialNotificationsHandled([
          item.id,
        ]);

        /*
         * 화면에서는 즉시 제거합니다.
         */
        setPendingFinancialNotifications(
          currentItems =>
            currentItems.filter(
              notification =>
                notification.id !==
                item.id
            )
        );

        /*
         * 네이티브 알림 저장소에서도
         * 삭제를 시도합니다.
         */
        try {
          await removeNativePendingCardNotification(
            item.id
          );
        } catch (
          nativeRemoveError
        ) {
          /*
           * 처리 완료 ID가 이미 저장됐으므로
           * 네이티브 삭제 실패만으로
           * 전체 처리를 실패시키지 않습니다.
           */
          console.log(
            'CARD NOTIFICATION NATIVE REMOVE ERROR',
            {
              notificationId:
                item.id,

              error:
                nativeRemoveError,
            }
          );
        }

        /*
         * 네이티브 저장소와 화면 상태를
         * 한 번 더 맞춥니다.
         */
        await loadPendingFinancialNotifications();

        console.log(
          'CARD NOTIFICATION DISMISSED',
          {
            notificationId:
              item.id,

            title:
              item.title,

            text:
              item.text,
          }
        );
      } catch (error) {
        console.log(
          'CARD NOTIFICATION DISMISS ERROR',
          error
        );

        setNoticeModal({
          title:
            '내역 삭제 실패',

          message:
            '금융 알림을 목록에서 삭제하지 못했어요.',
        });

        /*
         * 일괄 삭제에서도 실패 건수를
         * 확인할 수 있도록 오류를 전달합니다.
         */
        throw error;
      }
    },
    [
      loadPendingFinancialNotifications,
    ]
  );

  const [selectedDate, setSelectedDate] = useState(new Date());
   const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [exerciseAddModal, setExerciseAddModal] = useState(false);
const [extraExerciseCalories, setExtraExerciseCalories] = useState('');
const [extraExerciseTitle, setExtraExerciseTitle] = useState('');
const [weather, setWeather] = useState<any>(null);
const [weatherLoading, setWeatherLoading] = useState(false);
const [weeklyWeather, setWeeklyWeather] = useState<any>(null);
const [hourlyWeather, setHourlyWeather] = useState<any>(null);
const [showHourlyWeatherModal, setShowHourlyWeatherModal] = useState(false);
const [selectedWeatherDate, setSelectedWeatherDate] = useState<string | null>(null);
const [weatherLocationName, setWeatherLocationName] = useState('');
const [showWeather, setShowWeather] =  useState(true);
const [showTimeGrid, setShowTimeGrid] = useState(true);
const loadWeather = async () => {
  try {
    setWeatherLoading(true);
    setWeather(null);

    const { status } =
      await Location.requestForegroundPermissionsAsync();

    console.log('WEATHER PERMISSION', status);

    if (status !== 'granted') {
      setNoticeModal({
        title: '위치 권한 필요',
        message: '날씨를 보려면 위치 권한이 필요해요.',
      });
      return;
    }

    let location =
      await Location.getLastKnownPositionAsync();

    if (!location) {
      location =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
    }

    if (!location) {
      setNoticeModal({
        title: '위치 확인 실패',
        message: '현재 위치를 가져오지 못했어요.',
      });
      return;
    }

    const { latitude, longitude } = location.coords;

console.log('WEATHER LAT', latitude);
console.log('WEATHER LON', longitude);

try {
  const places = await Location.reverseGeocodeAsync({
    latitude,
    longitude,
  });

  const place = places?.[0];

  const nextLocationName = [
    place?.region,
    place?.city,
    place?.district,
    place?.subregion,
  ]
    .filter(Boolean)
    .join(' ');

  setWeatherLocationName(
    nextLocationName ||
      `위도 ${latitude.toFixed(2)}, 경도 ${longitude.toFixed(2)}`
  );
} catch (e) {
  console.log('WEATHER LOCATION NAME ERROR', e);

  setWeatherLocationName(
    `위도 ${latitude.toFixed(2)}, 경도 ${longitude.toFixed(2)}`
  );
}

const url =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${latitude}` +
  `&longitude=${longitude}` +
  `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
  `&hourly=temperature_2m,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
  `&timezone=auto` +
  `&forecast_days=7`;

  
   console.log('WEATHER FETCH START', url);

const controller = new AbortController();

const timeoutId = setTimeout(() => {
  controller.abort();
}, 20000);

const res = await fetch(url, {
  signal: controller.signal,
});

clearTimeout(timeoutId);

console.log('WEATHER RESPONSE OK', res.ok);
const json = await res.json();

console.log('WEATHER DATA', json);

if (!res.ok || !json.current) {
  setNoticeModal({
    title: '날씨 불러오기 실패',
    message:
      json?.reason ??
      '날씨 데이터를 가져오지 못했어요.',
  });
  return;
}

setWeather(json.current);
setWeeklyWeather(json.daily ?? null);
setHourlyWeather(json.hourly ?? null);

  } catch (e: any) {
  console.log('WEATHER ERROR', e?.name, e?.message, e);

  setNoticeModal({
    title: '날씨 오류',
    message:
      e?.name === 'AbortError'
        ? '날씨 서버 응답이 너무 오래 걸렸어요. 인터넷 연결을 확인해주세요.'
        : String(e?.message ?? e),
  });
} finally {
    setWeatherLoading(false);
  }
};
 
const [noticeModal, setNoticeModal] =
  useState<{
    title: string;
    message: string;
  } | null>(null);
  // 기능별 온오프 및 데이터 상태
  const [records, setRecords] = useState<Record<string, Record<string, string>>>({});
  const [todos, setTodos] = useState<Record<string, Todo[]>>({});
  const [stories, setStories] = useState<Record<string, Story>>({});
  const [ledgers, setLedgers] = useState<Record<string, LedgerItem[]>>({});
  const [meals, setMeals] = useState<Record<string, Record<string, MealItem[]>>>({});
  const [sleeps, setSleeps] = useState<Record<string, SleepRecord>>({});
  const [sleepStartAt, setSleepStartAt] = useState<string | null>(null);
  const [sleepSeconds, setSleepSeconds] = useState(0);
  const [sleepNotificationId, setSleepNotificationId] =  useState<string | null>(null);
  const [waterEnabled, setWaterEnabled] = useState(false);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [weightEnabled, setWeightEnabled] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [stepEnabled, setStepEnabled] = useState(false);
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [showStory, setShowStory] = useState(true);
  const [showLedger, setShowLedger] = useState(true);
  const [showMeal, setShowMeal] = useState(true);
  const [showSleep, setShowSleep] = useState(true);

  // 모달 제어 상태
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [inputText, setInputText] = useState('');
  const [recordColors, setRecordColors] =  useState<Record<string, string>>({});
  const [showColorPicker, setShowColorPicker] =
  useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [todoInput, setTodoInput] = useState('');
 const [  showSelectedTodoSection,  setShowSelectedTodoSection,] = useState(false);
/*
 * 위젯의 할 일 문구를 누르면
 * 오늘 날짜를 선택하고
 * 오늘의 할 일 목록까지 엽니다.
 */
useFocusEffect(
  useCallback(() => {
    if (
      params.openTodoSection !==
      'true'
    ) {
      return;
    }

    const today =
      new Date();

    setSelectedDate(
      today
    );

    setCalendarMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    /*
     * 할 일 추가창은 닫고
     * 오늘의 할 일 목록을 엽니다.
     */
    setShowTodoModal(
      false
    );

    setShowSelectedTodoSection(
      true
    );
  }, [
    params.openTodoSection,
    params.widgetTs,
  ])
);



useFocusEffect(
  useCallback(() => {
    if (
      params.openTodoModal !==
      'true'
    ) {
      return;
    }

    const today =
      new Date();

    setSelectedDate(
      today
    );

    setCalendarMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setTodoInput(
      ''
    );

    /*
     * 추가창을 열 때는
     * 목록 팝업을 닫아둡니다.
     */
    setShowSelectedTodoSection(
      false
    );

    setShowTodoModal(
      true
    );
  }, [
    params.openTodoModal,
    params.widgetTs,
  ])
);

  const [reminderTodo, setReminderTodo] = useState<Todo | null>(null);
const [reminderHour, setReminderHour] = useState<number | null>(9);
const [reminderMinute, setReminderMinute] = useState<number | null>(0);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [selectedWeather, setSelectedWeather] = useState('☀️');
  const [selectedMood, setSelectedMood] = useState('😊');
  const [storyInput, setStoryInput] = useState('');
  
  const [showLedgerModal, setShowLedgerModal] = useState(false);
useFocusEffect(
  useCallback(() => {
    if (
      params.openLedgerModal !==
      'true'
    ) {
      return;
    }

    const today =
      new Date();

    setSelectedDate(
      today
    );

    setCalendarMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    /*
     * 가계부 기능이 꺼져 있어도
     * 자동으로 활성화합니다.
     */
    setShowLedger(
      true
    );

    AsyncStorage.setItem(
      'daily_show_ledger_v1',
      JSON.stringify(
        true
      )
    ).catch(
      error => {
        console.log(
          'OPEN LEDGER MODAL SETTING SAVE ERROR',
          error
        );
      }
    );

    setLedgerType(
      'expense'
    );

    setLedgerCategory(
      '식비'
    );

    setLedgerMemo(
      ''
    );

    setLedgerAmount(
      ''
    );

    setEditingLedger(
      null
    );

    setShowLedgerModal(
      true
    );

    console.log(
      'WIDGET LEDGER MODAL OPENED'
    );
  }, [
    params.openLedgerModal,
    params.widgetTs,
  ])
);


  const [showLedgerMonthModal, setShowLedgerMonthModal] = useState(false);
  const [
  ledgerBudgets,
  setLedgerBudgets,
] = useState<
  Record<string, number>
>({});

const [
  showLedgerBudgetModal,
  setShowLedgerBudgetModal,
] = useState(false);

const [
  ledgerBudgetInput,
  setLedgerBudgetInput,
] = useState('');
/*
 * 예산이 이미 저장된 경우에는
 * 금액 보기 화면을 먼저 보여주고,
 * 변경 버튼을 누르면 입력 화면으로 전환합니다.
 */
const [
  isEditingLedgerBudget,
  setIsEditingLedgerBudget,
] = useState(false);

const [
  ledgerBudgetTargetMonth,
  setLedgerBudgetTargetMonth,
] = useState(
  new Date()
);
/*
 * 현재 예산 팝업에서 보고 있는 월
 */
const ledgerBudgetTargetMonthKey =
  formatMonthKey(
    ledgerBudgetTargetMonth
  );

/*
 * 해당 월에 이미 저장된 목표 예산
 */
const ledgerBudgetTargetAmount =
  ledgerBudgets[
    ledgerBudgetTargetMonthKey
  ] ?? 0;

const [
  showLedgerDetailModal,
  setShowLedgerDetailModal,
] = useState(false);

const [
  ledgerDetailMode,
  setLedgerDetailMode,
] = useState<
  'day' | 'week'
>('day');

const [
  ledgerDetailDate,
  setLedgerDetailDate,
] = useState(
  new Date()
);

/*
 * 이번 주 내역 카테고리 필터
 */
const [
  ledgerWeekCategory,
  setLedgerWeekCategory,
] = useState('전체');

  const [ledgerType, setLedgerType] = useState<'expense' | 'income'>('expense');
  const [ledgerCategory, setLedgerCategory] = useState('식비');
  const [ledgerMemo, setLedgerMemo] = useState('');
  const [ledgerAmount, setLedgerAmount] = useState('');

const [
  editingLedger,
  setEditingLedger,
] = useState<
  EditingLedgerTarget |
  null
>(null);

  // 식단 관련 상태
  const [mealRecommendEnabled, setMealRecommendEnabled] = useState(true);
  const [mealMode, setMealMode] = useState<'diet' | 'muscle' | 'normal' | 'night'>('normal');
  const [excludeYesterdayMenu, setExcludeYesterdayMenu] = useState(false);
  const [recommendedMenus, setRecommendedMenus] = useState<string[]>([]);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [mealName, setMealName] = useState('');
  const [mealMemo, setMealMemo] = useState('');
  const [mealPrice, setMealPrice] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealImageUri, setMealImageUri] = useState<string | undefined>();
/*
 * 현재 수정 중인 식단입니다.
 * null이면 새 식단 추가 상태입니다.
 */
const [
  editingMeal,
  setEditingMeal,
] = useState<
  EditingMealTarget |
  null
>(null);
  /*
 * 식단 저장 버튼의 연속 클릭과
 * 중복 저장을 막습니다.
 */
const mealSavingRef =
  useRef(false);

const [
  mealSaving,
  setMealSaving,
] = useState(false);

  useFocusEffect(
  useCallback(() => {
    if (params.openMealModal !== 'true') return;

    
    const mealType =
      params.mealType === 'breakfast' ||
      params.mealType === 'lunch' ||
      params.mealType === 'dinner' ||
      params.mealType === 'snack'
        ? params.mealType
        : 'breakfast';

    const today = new Date();

    setSelectedDate(today);
    setCalendarMonth(today);
    setSelectedMealType(mealType);
    setEditingMeal(  null);
    setMealName('');
    setMealMemo('');
    setMealPrice('');
    setMealCalories('');
    setMealImageUri(undefined);
    setShowMealModal(true);
  }, [params.openMealModal, params.mealType, params.widgetTs])
);

  // 칼로리 및 프로필 프로필 상태
  const [calorieProfile, setCalorieProfile] = useState<CalorieProfile>({ height: '', weight: '', age: '', gender: 'male' });
  const [exerciseCalories, setExerciseCalories] = useState<Record<string, number>>({});
  
  const [exerciseCalorieLogs, setExerciseCalorieLogs] =
  useState<ExerciseCalorieLog[]>([]);

const [exerciseLogModal, setExerciseLogModal] =
  useState(false);
  const [showCalorieModal, setShowCalorieModal] = useState(false);
  const [showNumberPickerModal, setShowNumberPickerModal] = useState(false);
  const [numberPickerTarget, setNumberPickerTarget] = useState<'height' | 'weight' | 'age'>('height');

  const scrollRef = useRef<ScrollView | null>(null);
const ledgerSectionYRef =  useRef(0);
useFocusEffect(
  useCallback(() => {
    if (
      params.openLedgerSection !==
      'true'
    ) {
      return;
    }

    const today =
      new Date();

    setSelectedDate(
      today
    );

    setCalendarMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setShowLedger(
      true
    );

    AsyncStorage.setItem(
      'daily_show_ledger_v1',
      JSON.stringify(
        true
      )
    ).catch(
      error => {
        console.log(
          'OPEN LEDGER SECTION SETTING SAVE ERROR',
          error
        );
      }
    );

    let cancelled =
      false;

    let retryCount =
      0;

    let timer:
      ReturnType<
        typeof setTimeout
      > |
      null = null;

    const scrollToLedger =
      () => {
        if (
          cancelled
        ) {
          return;
        }

        const ledgerY =
          ledgerSectionYRef.current;

        /*
         * 아직 onLayout이 실행되지 않았다면
         * 잠시 후 다시 확인합니다.
         */
        if (
          ledgerY <= 0 &&
          retryCount < 6
        ) {
          retryCount +=
            1;

          timer =
            setTimeout(
              scrollToLedger,
              200
            );

          return;
        }

        const targetY =
          Math.max(
            0,
            ledgerY - 12
          );

        scrollRef.current
          ?.scrollTo({
            y: targetY,
            animated: true,
          });

        console.log(
          'WIDGET LEDGER SECTION OPENED',
          {
            targetY,
            retryCount,
          }
        );
      };

    timer =
      setTimeout(
        scrollToLedger,
        300
      );

    return () => {
      cancelled =
        true;

      if (
        timer
      ) {
        clearTimeout(
          timer
        );
      }
    };
  }, [
    params.openLedgerSection,
    params.widgetTs,
  ])
);


const autoSavingFinancialIdsRef =
  useRef<
    Set<string>
  >(
    new Set()
  );

  const dateKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(new Date());
const currentSleepDayKey =
  getSleepDayKey(
    new Date()
  );
 
  const safeSyncDailyData =
  useCallback(
    async () => {
      console.log(
        '🔥 safeSyncDailyData CALL'
      );

      try {
        await syncDailyDataToServer();

        console.log(
          '✅ DAILY CLOUD SYNC DONE'
        );
      } catch (
        error
      ) {
        console.log(
          'DAILY CLOUD SYNC ERROR',
          error
        );

        throw error;
      }
    },
    []
  );

/*
 * 가계부가 짧은 시간에 여러 번 저장될 때
 * 서버 동기화를 매번 실행하지 않고
 * 마지막 저장 이후 한 번만 실행합니다.
 *
 * 일괄 저장 속도도 함께 개선됩니다.
 */
const ledgerBackgroundSyncTimerRef =
  useRef<
    ReturnType<
      typeof setTimeout
    > |
    null
  >(null);

const scheduleLedgerBackgroundSync =
  useCallback(() => {
    if (
      ledgerBackgroundSyncTimerRef
        .current
    ) {
      clearTimeout(
        ledgerBackgroundSyncTimerRef
          .current
      );
    }

    ledgerBackgroundSyncTimerRef
      .current =
      setTimeout(
        () => {
          ledgerBackgroundSyncTimerRef
            .current =
            null;

          /*
           * 호출한 화면에서는 기다리지 않습니다.
           * 서버와 위젯 동기화는 뒤에서 진행됩니다.
           */
          void Promise.allSettled([
            safeSyncDailyData(),
            syncRootWidgetData(),
          ]).then(
            ([
              cloudResult,
              widgetResult,
            ]) => {
              if (
                cloudResult.status ===
                'rejected'
              ) {
                console.log(
                  'LEDGER BACKGROUND CLOUD SYNC ERROR',
                  cloudResult.reason
                );
              } else {
                console.log(
                  'LEDGER BACKGROUND CLOUD SYNC DONE'
                );
              }

              if (
                widgetResult.status ===
                'rejected'
              ) {
                console.log(
                  'LEDGER BACKGROUND WIDGET SYNC ERROR',
                  widgetResult.reason
                );
              } else {
                console.log(
                  'LEDGER BACKGROUND WIDGET SYNC DONE'
                );
              }
            }
          );
        },
        200
      );
  }, [
    safeSyncDailyData,
  ]);

  const checkAttendanceReward = async () => {
  const today = formatDateKey(new Date());

  const raw = await AsyncStorage.getItem(
    ATTENDANCE_LOGS_KEY
  );

  const logs: AttendanceLog[] =
    raw ? JSON.parse(raw) : [];

  const alreadyChecked = logs.some(
    (log) => log.log_date === today
  );

  if (alreadyChecked) return;

  const nextLogs = [
    {
      id: today,
      log_date: today,
      points: ATTENDANCE_POINT,
    },
    ...logs,
  ];

  await AsyncStorage.setItem(
    ATTENDANCE_LOGS_KEY,
    JSON.stringify(nextLogs)
  );

  await addRootPoints(ATTENDANCE_POINT);

  setNoticeModal({
    title: '출석 완료',
    message: `오늘 출석 보상 ${ATTENDANCE_POINT}P 지급!`,
  });
};

const addManualExerciseCalories =
  async () => {
    const amount =
      Number(
        extraExerciseCalories.replace(
          /[^0-9]/g,
          ''
        )
      );

    if (!amount) {
      return;
    }

    /*
     * 현재 화면에서 선택한 날짜에
     * 운동 기록을 저장합니다.
     */
    const targetDateKey =
      dateKey;

    const raw =
      await AsyncStorage.getItem(
        'daily_exercise_calories_v1'
      );

    const saved:
      Record<string, number> =
      raw
        ? JSON.parse(raw)
        : {};

    const next = {
      ...saved,

      [targetDateKey]:
        (
          saved[
            targetDateKey
          ] ?? 0
        ) + amount,
    };

    await saveExerciseCalories(
      next
    );

    await saveExerciseCalorieLogs([
      {
        id:
          `${Date.now()}_` +
          `${Math.random()}`,

        date:
          targetDateKey,

        title:
          extraExerciseTitle.trim() ||
          '직접 추가',

        calories:
          amount,

        source:
          'manual',
      },

      ...exerciseCalorieLogs,
    ]);

    setExtraExerciseCalories(
      ''
    );

    setExtraExerciseTitle(
      ''
    );

    setExerciseAddModal(
      false
    );
  };

  const loadData = async () => {const savedRecordColors =
  await AsyncStorage.getItem('daily_record_colors_v1');

setRecordColors(
  savedRecordColors ? JSON.parse(savedRecordColors) : {}
);
  const savedRecords = await AsyncStorage.getItem('daily_time_records_v1');
  setRecords(savedRecords ? JSON.parse(savedRecords) : {});

const savedTodos =
  await AsyncStorage.getItem(
    'daily_todos_v1'
  );

const parsedTodos:
  Record<
    string,
    Todo[]
  > =
  savedTodos
    ? JSON.parse(
        savedTodos
      )
    : {};

/*
 * 과거 수면 종료 과정에서
 * 오늘의 할 일에 자동 생성했던
 * 수면 항목만 제거합니다.
 *
 * 사용자가 직접 만든 할 일은
 * 삭제하지 않습니다.
 */
let removedSleepTodoCount =
  0;

const cleanedTodos =
  Object.fromEntries(
    Object.entries(
      parsedTodos
    ).map(
      ([
        todoDateKey,
        todoItems,
      ]) => {
        const safeTodoItems =
          Array.isArray(
            todoItems
          )
            ? todoItems
            : [];

        const nextTodoItems =
          safeTodoItems.filter(
            todo => {
              const isAutoSleepTodo =
                String(
                  todo?.id ?? ''
                ).startsWith(
                  'widget_sleep_'
                );

              if (
                isAutoSleepTodo
              ) {
                removedSleepTodoCount +=
                  1;
              }

              return (
                !isAutoSleepTodo
              );
            }
          );

        return [
          todoDateKey,
          nextTodoItems,
        ];
      }
    )
  ) as Record<
    string,
    Todo[]
  >;

setTodos(
  cleanedTodos
);

/*
 * 자동 생성 수면 할 일이 발견된 경우에만
 * 로컬과 서버 데이터를 정리합니다.
 */
if (
  removedSleepTodoCount >
  0
) {
  await AsyncStorage.setItem(
    'daily_todos_v1',
    JSON.stringify(
      cleanedTodos
    )
  );

  console.log(
    'AUTO SLEEP TODOS REMOVED',
    {
      removedCount:
        removedSleepTodoCount,
    }
  );

  await safeSyncDailyData();

  await syncRootWidgetData();
}

  const savedStories = await AsyncStorage.getItem('daily_story_v1');
  setStories(savedStories ? JSON.parse(savedStories) : {});

  const savedLedgers = await AsyncStorage.getItem('daily_ledger_v1');
  setLedgers(savedLedgers ? JSON.parse(savedLedgers) : {});

const savedLedgerBudgets =
  await AsyncStorage.getItem(
    LEDGER_BUDGETS_KEY
  );

setLedgerBudgets(
  savedLedgerBudgets
    ? JSON.parse(
        savedLedgerBudgets
      )
    : {}
);

  const savedMeals = await AsyncStorage.getItem('daily_meals_v1');
  setMeals(savedMeals ? JSON.parse(savedMeals) : {});

  const savedSleeps = await AsyncStorage.getItem('daily_sleep_v1');
  setSleeps(savedSleeps ? JSON.parse(savedSleeps) : {});

  const savedShowStory = await AsyncStorage.getItem('daily_show_story_v1');
  setShowStory(savedShowStory ? JSON.parse(savedShowStory) : true);

  const savedShowLedger = await AsyncStorage.getItem('daily_show_ledger_v1');
  setShowLedger(savedShowLedger ? JSON.parse(savedShowLedger) : true);

  const savedShowMeal = await AsyncStorage.getItem('daily_show_meal_v1');
  setShowMeal(savedShowMeal ? JSON.parse(savedShowMeal) : true);

  const savedShowSleep = await AsyncStorage.getItem('daily_show_sleep_v1');
  setShowSleep(savedShowSleep ? JSON.parse(savedShowSleep) : true);

  const savedShowWeather =
  await AsyncStorage.getItem(
    SHOW_WEATHER_KEY
  );

if (savedShowWeather !== null) {
  setShowWeather(
    savedShowWeather === 'true'
  );
}

const savedShowTimeGrid =
  await AsyncStorage.getItem(
    SHOW_TIME_GRID_KEY
  );

if (savedShowTimeGrid !== null) {
  setShowTimeGrid(
    savedShowTimeGrid === 'true'
  );
}

  const savedCalorieProfile = await AsyncStorage.getItem('daily_calorie_profile_v1');
  setCalorieProfile(
    savedCalorieProfile
      ? JSON.parse(savedCalorieProfile)
      : { height: '', weight: '', age: '', gender: 'male' }
  );

  const savedExerciseCalories = await AsyncStorage.getItem('daily_exercise_calories_v1');
  setExerciseCalories(savedExerciseCalories ? JSON.parse(savedExerciseCalories) : {});

  const savedExerciseLogs = await AsyncStorage.getItem(
  EXERCISE_CALORIE_LOGS_KEY
);

setExerciseCalorieLogs(
  savedExerciseLogs ? JSON.parse(savedExerciseLogs) : []
);

  const savedSleepStartAt = await AsyncStorage.getItem('daily_sleep_start_at_v1');
  setSleepStartAt(savedSleepStartAt ?? null);
};

  const loadWaterData = async () => {
    const enabledRaw = await AsyncStorage.getItem(WATER_ENABLED_KEY);
    const logsRaw = await AsyncStorage.getItem(WATER_LOGS_KEY);
    setWaterEnabled(enabledRaw === 'true');
    setWaterLogs(logsRaw ? JSON.parse(logsRaw) : []);
  };

  const loadWeightData = async () => {
    const enabledRaw = await AsyncStorage.getItem(WEIGHT_ENABLED_KEY);
    const logsRaw = await AsyncStorage.getItem(WEIGHT_LOGS_KEY);
    setWeightEnabled(enabledRaw === 'true');
    setWeightLogs(logsRaw ? JSON.parse(logsRaw) : []);
  };

 const loadStepData = async () => {
  const enabledRaw = await AsyncStorage.getItem(STEP_ENABLED_KEY);
  const logsRaw = await AsyncStorage.getItem(STEP_LOGS_KEY);

  const logs: StepLog[] = logsRaw ? JSON.parse(logsRaw) : [];
  const today = formatDateKey(new Date());
  const todayLog = logs.find((l) => l.log_date === today);

  setStepEnabled(enabledRaw === 'true');
  setStepLogs(logs);
  setTodaySteps(todayLog?.steps ?? 0);
};

const resetStepIfNewDay = async () => {
  const currentKey = formatDateKey(new Date());
  const logsRaw = await AsyncStorage.getItem(STEP_LOGS_KEY);
  const logs: StepLog[] = logsRaw ? JSON.parse(logsRaw) : [];

  const todayLog = logs.find((l) => l.log_date === currentKey);

  if (!todayLog) {
    setTodaySteps(0);
  }
};

  useEffect(() => {
  const init = async () => {
    await loadData();

    await migrateExistingLedgerMerchantNames();

    const savedShowWeather = await AsyncStorage.getItem(
      SHOW_WEATHER_KEY
    );

    const weatherVisible =
      savedShowWeather === null
        ? true
        : savedShowWeather === 'true';

    if (weatherVisible) {
      await loadWeather();
    }

    loadWaterData();
    loadWeightData();
    loadStepData();
    resetStepIfNewDay();

    checkAttendanceReward();
  };

  init();
}, []);

useFocusEffect(useCallback(() => {
  loadData();
  loadWaterData();
  loadWeightData();
  loadStepData();
  resetStepIfNewDay();
}, []));

useFocusEffect(
  useCallback(() => {
    console.log(
      'DAY SCREEN FOCUSED'
    );

    loadMerchantCategoryHistory();

    loadMerchantAutoSaveRules();

    loadPendingFinancialNotifications();
  }, [
    loadMerchantCategoryHistory,
    loadMerchantAutoSaveRules,
    loadPendingFinancialNotifications,
  ])
);



  // 데이터 스토리지 저장 함수들
 const saveRecords = async (
  next:
    Record<
      string,
      Record<string, string>
    >
) => {
  setRecords(
    next
  );

  await AsyncStorage.setItem(
    'daily_time_records_v1',
    JSON.stringify(
      next
    )
  );

  safeSyncDailyData();

  await syncRootWidgetData();
};

  const saveRecordColors = async (
  next: Record<string, string>
) => {
  setRecordColors(next);
  await AsyncStorage.setItem(
    'daily_record_colors_v1',
    JSON.stringify(next)
  );
};
  const saveTodos = async (next: Record<string, Todo[]>) => {
  setTodos(next);

  await AsyncStorage.setItem(
    'daily_todos_v1',
    JSON.stringify(next)
  );

  safeSyncDailyData();

  await syncRootWidgetData();
};
  const saveStories = async (next: Record<string, Story>) => { setStories(next); await AsyncStorage.setItem('daily_story_v1', JSON.stringify(next)); safeSyncDailyData(); };
const saveLedgers =
  async (
    next: Record<
      string,
      LedgerItem[]
    >
  ) => {
    /*
     * 화면에 먼저 반영합니다.
     */
    setLedgers(
      next
    );

    /*
     * 기기에 저장하는 작업까지만
     * 완료를 기다립니다.
     */
    await AsyncStorage.setItem(
      'daily_ledger_v1',
      JSON.stringify(
        next
      )
    );

    console.log(
      'LEDGER LOCAL SAVE DONE',
      {
        dateCount:
          Object.keys(
            next
          ).length,
      }
    );

    /*
     * Firestore와 위젯은
     * 백그라운드에서 동기화합니다.
     */
    scheduleLedgerBackgroundSync();
  };

/*
 * 가계부 로컬 저장을 마친 금융 알림은
 * 처리 완료 기록과 네이티브 삭제를
 * 백그라운드에서 진행합니다.
 *
 * ledger에 notificationFingerprint가
 * 저장되어 있으므로 네이티브 삭제가 늦어도
 * 같은 알림이 다시 표시되지 않습니다.
 */
const cleanupSavedFinancialNotificationInBackground =
  useCallback(
    (
      notificationId:
        string
    ) => {
      void (
        async () => {
          try {
            await markFinancialNotificationsHandled([
              notificationId,
            ]);
          } catch (
            handledError
          ) {
            console.log(
              'FINANCIAL SAVED NOTIFICATION HANDLED ID ERROR',
              {
                notificationId,

                error:
                  handledError,
              }
            );
          }

          try {
            await removeNativePendingCardNotification(
              notificationId
            );

            console.log(
              'FINANCIAL SAVED NOTIFICATION NATIVE REMOVE DONE',
              {
                notificationId,
              }
            );
          } catch (
            nativeRemoveError
          ) {
            console.log(
              'FINANCIAL SAVED NOTIFICATION NATIVE REMOVE ERROR',
              {
                notificationId,

                error:
                  nativeRemoveError,
              }
            );
          }
        }
      )();
    },
    []
  );

const undoFinancialNotificationSave =
  useCallback(
    async (
      notificationIds:
        string[]
    ) => {
      const targetIdSet =
        new Set(
          notificationIds
        );

      if (
        targetIdSet.size ===
        0
      ) {
        return;
      }

      const ledgerRaw =
        await AsyncStorage.getItem(
          'daily_ledger_v1'
        );

      const latestLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        ledgerRaw
          ? JSON.parse(
              ledgerRaw
            )
          : {};

      let removedCount =
        0;

      const nextLedgers =
        Object.fromEntries(
          Object.entries(
            latestLedgers
          ).map(
            ([
              ledgerDateKey,
              ledgerItems,
            ]) => {
              const nextItems =
                (
                  Array.isArray(
                    ledgerItems
                  )
                    ? ledgerItems
                    : []
                ).filter(
                  ledgerItem => {
                    const shouldRemove =
                      ledgerItem.inputSource ===
                        'notification' &&
                      Boolean(
                        ledgerItem
                          .notificationFingerprint
                      ) &&
                      targetIdSet.has(
                        ledgerItem
                          .notificationFingerprint as string
                      );

                    if (
                      shouldRemove
                    ) {
                      removedCount +=
                        1;
                    }

                    return !shouldRemove;
                  }
                );

              return [
                ledgerDateKey,
                nextItems,
              ];
            }
          )
        ) as Record<
          string,
          LedgerItem[]
        >;

      if (
        removedCount ===
        0
      ) {
        throw new Error(
          'UNDO_TARGET_NOT_FOUND'
        );
      }

      await saveLedgers(
        nextLedgers
      );

      console.log(
        'FINANCIAL BULK UNDO COMPLETE',
        {
          requestedCount:
            targetIdSet.size,

          removedCount,
        }
      );
    },
    []
  );

const saveMerchantCategorySelection =
  useCallback(
    async (
      item:
        PendingFinancialNotification,

      category:
        LedgerExpenseCategory
    ) => {
      try {
        const merchantProfile =
          getFinancialMerchantProfile(
            item
          );

        const raw =
          await AsyncStorage.getItem(
            FINANCIAL_MERCHANT_HISTORY_KEY
          );

        const saved:
          MerchantCategoryHistory =
          raw
            ? JSON.parse(
                raw
              )
            : {};

        const currentHistory =
          saved[
            merchantProfile.key
          ] ?? [];

        const nextHistoryItems = [
          {
            category,

            usedAt:
              new Date()
                .toISOString(),
          },

          ...currentHistory,
        ].slice(
          0,
          50
        );

        const nextHistory = {
          ...saved,

          [merchantProfile.key]:
            nextHistoryItems,
        };

        await AsyncStorage.setItem(
          FINANCIAL_MERCHANT_HISTORY_KEY,
          JSON.stringify(
            nextHistory
          )
        );

        setMerchantCategoryHistory(
          nextHistory
        );

        console.log(
          'MERCHANT CATEGORY HISTORY SAVED',
          {
            merchantKey:
              merchantProfile.key,

            merchantType:
              merchantProfile.type,

            category,

            historyCount:
              nextHistoryItems.length,
          }
        );
      } catch (error) {
        /*
         * 가계부 저장 자체는 성공했으므로
         * 추천 기록 저장 실패 때문에
         * 전체 처리를 실패시키지는 않습니다.
         */
        console.log(
          'MERCHANT CATEGORY HISTORY SAVE ERROR',
          error
        );
      }
    },
    []
  );

const toggleMerchantAutoSave =
  useCallback(
    async (
      item:
        PendingFinancialNotification,

      category:
        LedgerExpenseCategory
    ) => {
      try {
        const merchantProfile =
          getFinancialMerchantProfile(
            item
          );

        /*
         * mixed 가맹점은 코드상으로도
         * 자동 저장을 절대 허용하지 않습니다.
         */
        if (
          merchantProfile.type !==
          'single'
        ) {
          setNoticeModal({
            title:
              '자동 저장 불가',

            message:
              '구매 목적이 달라질 수 있는 복합 결제처는 자동 저장을 사용할 수 없어요.',
          });

          return;
        }

        const raw =
          await AsyncStorage.getItem(
            FINANCIAL_MERCHANT_AUTO_SAVE_KEY
          );

        const saved:
          MerchantAutoSaveRules =
          raw
            ? JSON.parse(
                raw
              )
            : {};

        const alreadyEnabled =
          Boolean(
            saved[
              merchantProfile.key
            ]
          );

        let nextRules:
          MerchantAutoSaveRules;

        if (alreadyEnabled) {
  const {
    [
      merchantProfile.key
    ]:
      _removedRule,

    ...remainingRules
  } = saved;

  nextRules =
    remainingRules;

          setNoticeModal({
            title:
              '자동 저장 해제',

            message:
              `${merchantProfile.label} 결제는 다시 확인 후 저장됩니다.`,
          });
        } else {
          nextRules = {
            ...saved,

            [merchantProfile.key]: {
              category,

              /*
               * 현재 화면에 떠 있는 결제는
               * 자동 저장하지 않고,
               * 이 시점 이후에 발생한 결제부터
               * 적용합니다.
               */
              enabledAt:
                Date.now(),
            },
          };

          setNoticeModal({
            title:
              '자동 저장 설정',

            message:
              `다음 ${merchantProfile.label} 결제부터 ${category}로 자동 저장됩니다.`,
          });
        }

        await AsyncStorage.setItem(
          FINANCIAL_MERCHANT_AUTO_SAVE_KEY,
          JSON.stringify(
            nextRules
          )
        );

        setMerchantAutoSaveRules(
          nextRules
        );

        console.log(
          'MERCHANT AUTO SAVE UPDATED',
          {
            merchantKey:
              merchantProfile.key,

            enabled:
              !alreadyEnabled,

            category,
          }
        );
      } catch (error) {
        console.log(
          'MERCHANT AUTO SAVE UPDATE ERROR',
          error
        );

        setNoticeModal({
          title:
            '자동 저장 설정 실패',

          message:
            '자동 저장 설정을 변경하지 못했어요.',
        });
      }
    },
    []
  );

const removeMerchantAutoSaveRule =
  useCallback(
    async (
      merchantKey:
        string
    ) => {
      try {
        const raw =
          await AsyncStorage.getItem(
            FINANCIAL_MERCHANT_AUTO_SAVE_KEY
          );

        const saved:
          MerchantAutoSaveRules =
          raw
            ? JSON.parse(
                raw
              )
            : {};

        const {
          [merchantKey]:
            _removedRule,

          ...remainingRules
        } = saved;

        await AsyncStorage.setItem(
          FINANCIAL_MERCHANT_AUTO_SAVE_KEY,
          JSON.stringify(
            remainingRules
          )
        );

        setMerchantAutoSaveRules(
          remainingRules
        );

        setNoticeModal({
          title:
            '자동 저장 해제',

          message:
            `${getMerchantLabelByKey(
              merchantKey
            )} 자동 저장을 해제했어요.`,
        });
      } catch (error) {
        console.log(
          'MERCHANT AUTO SAVE REMOVE ERROR',
          error
        );

        setNoticeModal({
          title:
            '자동 저장 해제 실패',

          message:
            '자동 저장 설정을 해제하지 못했어요.',
        });
      }
    },
    []
  );

  const handleManualCancellationLink =
  useCallback(
    async (
      candidate:
        CancellationLinkCandidate
    ) => {
      if (
  !pendingCancellationItem
) {
  return;
}

if (
  !startFinancialActionProcessing()
) {
  return false;
}

try {
        const ledgerRaw =
          await AsyncStorage.getItem(
            'daily_ledger_v1'
          );

        const latestLedgers:
          Record<
            string,
            LedgerItem[]
          > =
          ledgerRaw
            ? JSON.parse(
                ledgerRaw
              )
            : {};

        const targetItems =
          latestLedgers[
            candidate
              .ledgerDateKey
          ] ?? [];

        const cancellationAmount =
  extractWonAmount(
    pendingCancellationItem
  );

const targetExists =
  targetItems.some(
    ledgerItem =>
      ledgerItem.id ===
        candidate
          .ledgerItem
          .id &&
      ledgerItem.type ===
        'expense' &&
      ledgerItem.inputSource ===
        'notification' &&
      !ledgerItem.cancelled &&
      Number(
        ledgerItem.amount
      ) ===
        cancellationAmount
  );

        /*
         * 모달이 열린 이후 데이터가 변경됐을 수
         * 있으므로 저장 직전에 다시 확인합니다.
         */
        if (
          !targetExists
        ) {
          setNoticeModal({
            title:
              '연결할 수 없음',

            message:
              '선택한 결제 내역이 없거나 이미 취소 처리되었어요.',
          });

          setShowCancellationLinkModal(
            false
          );

          setPendingCancellationItem(
            null
          );

          setCancellationLinkCandidates(
            []
          );

          return;
        }

        const nextLedgers =
          Object.fromEntries(
            Object.entries(
              latestLedgers
            ).map(
              ([
                ledgerDateKey,
                ledgerItems,
              ]) => [
                ledgerDateKey,

                ledgerDateKey ===
                  candidate
                    .ledgerDateKey
                  ? ledgerItems.map(
                      ledgerItem =>
                        ledgerItem.id ===
                          candidate
                            .ledgerItem
                            .id
                          ? {
                              ...ledgerItem,

                              cancelled:
                                true,

                              cancelledAt:
                                new Date(
                                  pendingCancellationItem
                                    .postedAt
                                ).toISOString(),

                              cancellationFingerprint:
                                pendingCancellationItem
                                  .id,

cancellationFingerprintHistory:
  buildCancellationFingerprintHistory(
    ledgerItem,

    pendingCancellationItem
      .id
  ),



                            }
                          : ledgerItem
                    )
                  : ledgerItems,
              ]
            )
          ) as Record<
            string,
            LedgerItem[]
          >;

        await saveLedgers(
          nextLedgers
        );

              await removeNativePendingCardNotification(
          pendingCancellationItem
            .id
        );

        await loadPendingFinancialNotifications();

        setShowCancellationLinkModal(
          false
        );

        setPendingCancellationItem(
          null
        );

        setCancellationLinkCandidates(
          []
        );

        setNoticeModal({
          title:
            '결제 취소 연결 완료',

          message:
            `${
              candidate
                .ledgerItem
                .merchantName ??
              candidate
                .ledgerItem
                .memo ??
              '선택한 결제'
            } ` +
            `${formatMoney(
              candidate
                .ledgerItem
                .amount
            )}원 내역을 취소 처리했어요.`,
        });

        console.log(
          'FINANCIAL MANUAL CANCELLATION LINK COMPLETE',
          {
            cancellationId:
              pendingCancellationItem
                .id,

            linkedLedgerId:
              candidate
                .ledgerItem
                .id,

            ledgerDateKey:
              candidate
                .ledgerDateKey,
          }
        );
      } catch (error) {
        console.log(
          'FINANCIAL MANUAL CANCELLATION LINK ERROR',
          error
        );

        setNoticeModal({
          title:
            '취소 연결 실패',

          message:
            '선택한 결제와 취소 알림을 연결하지 못했어요.',
        });
      } finally {
        finishFinancialActionProcessing();
         }
    },
    [
   pendingCancellationItem,
  loadPendingFinancialNotifications,
  startFinancialActionProcessing,
  finishFinancialActionProcessing,
]
  );

const handleFinancialNotificationAction =
  useCallback(
    async (
      item:
        PendingFinancialNotification,

      action:
        FinancialNotificationAction,

      selectedCategory:
  LedgerExpenseCategory =
    '기타',

isAutoSave:
  boolean =
    false,

suppressNotice:
  boolean =
    false,

otherDetail:
  string =
    ''
): Promise<boolean> => {
  if (
    !startFinancialActionProcessing()
  ) {
    return false;
  }

  try {
        /*
         * 자산 이동은 지출이나 수입으로
         * 가계부에 저장하지 않습니다.
         */
       if (
  action ===
  'transfer'
) {
  /*
   * 네이티브 삭제보다 먼저 처리 완료 ID를
   * 저장해야 재조회 과정에서 다시 나타나지 않습니다.
   */
  await markFinancialNotificationsHandled([
    item.id,
  ]);

  /*
   * 화면에서는 즉시 제거합니다.
   */
  setPendingFinancialNotifications(
    current =>
      current.filter(
        notification =>
          notification.id !==
          item.id
      )
  );

  /*
   * 네이티브 저장소 삭제는 추가로 시도합니다.
   *
   * 삭제가 늦거나 실패해도 처리 완료 ID가 있으므로
   * 앱 화면에 다시 나타나지는 않습니다.
   */
  try {
    await removeNativePendingCardNotification(
      item.id
    );
  } catch (
    nativeRemoveError
  ) {
    console.log(
      'FINANCIAL ASSET TRANSFER NATIVE REMOVE ERROR',
      {
        notificationId:
          item.id,

        error:
          nativeRemoveError,
      }
    );
  }

  console.log(
    'FINANCIAL ASSET TRANSFER HANDLED',
    {
      notificationId:
        item.id,

      title:
        item.title,

      text:
        item.text,
    }
  );

  setNoticeModal({
    title:
      '자산 이동 처리',

    message:
      '자산 이동으로 분류했어요. 가계부 수입·지출에는 반영하지 않았어요.',
  });

  return true;
}

     const amount =
  extractWonAmount(
    item
  );

const isCancellation =
  isFinancialCancellationNotification(
    item
  );

 

/*
 * 취소 알림은 기존 결제와 금액을
 * 비교해야 하므로 금액 확인이 필수입니다.
 *
 * 금액을 찾지 못한 알림은 삭제하지 않고
 * 대기 목록에 남겨둡니다.
 */
if (
  isCancellation &&
  amount <= 0
) {
  setNoticeModal({
    title:
      '취소 금액 확인 필요',

    message:
      '취소 알림에서 금액을 찾지 못했어요. 알림은 삭제하지 않고 남겨두었어요.',
  });

  console.log(
    'FINANCIAL CANCELLATION AMOUNT MISSING',
    {
      cancellationId:
        item.id,

      title:
        item.title,

      text:
        item.text,
    }
  );

  return false;
}

if (
  isCancellation
) {   
  const ledgerRaw =
    await AsyncStorage.getItem(
      'daily_ledger_v1'
    );

  const latestLedgers:
    Record<
      string,
      LedgerItem[]
    > =
    ledgerRaw
      ? JSON.parse(
          ledgerRaw
        )
      : {};

  const cancellationTarget =
    findCancellationTarget(
      latestLedgers,
      item,
      amount
    );

 if (
  !cancellationTarget
) {
  const manualCandidates =
    getCancellationLinkCandidates(
      latestLedgers,
      item,
      amount
    );

  console.log(
    'FINANCIAL CANCELLATION TARGET NOT FOUND',
    {
      cancellationId:
        item.id,

      amount,

      merchantName:
        getFinancialMerchantProfile(
          item
        ).label,

      manualCandidateCount:
        manualCandidates.length,
    }
  );

  if (
    manualCandidates.length ===
    0
  ) {
    setNoticeModal({
      title:
        '취소 내역 확인 필요',

      message:
        `${formatMoney(
          amount
        )}원 취소와 연결할 기존 카드 결제를 찾지 못했어요. 알림은 삭제하지 않고 남겨두었어요.`,
    });

    return false;
  }

  setPendingCancellationItem(
    item
  );

  setCancellationLinkCandidates(
    manualCandidates
  );

  setShowCancellationLinkModal(
    true
  );

  return false;
}

  const nextLedgers =
    Object.fromEntries(
      Object.entries(
        latestLedgers
      ).map(
        ([
          ledgerDateKey,
          ledgerItems,
        ]) => [
          ledgerDateKey,

          ledgerDateKey ===
          cancellationTarget
            .ledgerDateKey
            ? ledgerItems.map(
                ledgerItem =>
                  ledgerItem.id ===
                  cancellationTarget
                    .ledgerItem
                    .id
                    ? {
                        ...ledgerItem,

                        cancelled:
                          true,

                        cancelledAt:
                          new Date(
                            item.postedAt
                          ).toISOString(),

                        cancellationFingerprint:
                          item.id,

                          cancellationFingerprintHistory:
  buildCancellationFingerprintHistory(
    ledgerItem,
    item.id
  ),

                      }
                    : ledgerItem
              )
            : ledgerItems,
        ]
      )
    ) as Record<
      string,
      LedgerItem[]
    >;

  await saveLedgers(
    nextLedgers
  );

  await removeNativePendingCardNotification(
    item.id
  );

  await loadPendingFinancialNotifications();

  setNoticeModal({
    title:
      '결제 취소 반영 완료',

    message:
      `${cancellationTarget
        .ledgerItem
        .merchantName ??
        '기존 결제'} ` +
      `${formatMoney(
        amount
      )}원 내역을 취소 처리했어요.`,
  });

  console.log(
    'FINANCIAL CANCELLATION COMPLETE',
    {
      cancellationId:
        item.id,

      linkedLedgerId:
        cancellationTarget
          .ledgerItem
          .id,

      amount,

      merchantName:
        cancellationTarget
          .ledgerItem
          .merchantName,
    }
  );

  return true;
}

        if (
  amount <= 0
) {
  if (
    !suppressNotice
  ) {
    setNoticeModal({
      title:
        '금액 확인 필요',

      message:
        '알림에서 금액을 찾지 못했어요. 내역 추가에서 직접 입력해주세요.',
    });
  }

  return false;
}

const normalizedOtherDetail =
  otherDetail.trim();

/*
 * 기타 지출은 구체적인 내용을
 * 입력한 후에만 저장합니다.
 */
if (
  action ===
    'expense' &&
  selectedCategory ===
    '기타' &&
  !isAutoSave &&
  !normalizedOtherDetail
) {
  if (
    !suppressNotice
  ) {
    setNoticeModal({
      title:
        '기타 내용 입력',

      message:
        '기타 지출이 어떤 내용인지 입력해주세요.',
    });
  }

  return false;
}

        const occurredDate =
          new Date(
            item.postedAt
          );

        const occurredDateKey =
          Number.isNaN(
            occurredDate.getTime()
          )
            ? formatDateKey(
                new Date()
              )
            : formatDateKey(
                occurredDate
              );

        /*
         * React 상태가 오래됐을 수 있으므로
         * AsyncStorage에서 최신 가계부를
         * 다시 불러옵니다.
         */
        const ledgerRaw =
          await AsyncStorage.getItem(
            'daily_ledger_v1'
          );

        const latestLedgers:
          Record<
            string,
            LedgerItem[]
          > =
          ledgerRaw
            ? JSON.parse(
                ledgerRaw
              )
            : {};

        const currentItems =
          latestLedgers[
            occurredDateKey
          ] ?? [];

        /*
         * 이미 같은 금융 알림으로
         * 저장된 기록이 있으면
         * 중복 저장하지 않습니다.
         */
        const alreadySaved =
          currentItems.some(
            ledgerItem =>
              ledgerItem
                .notificationFingerprint ===
              item.id
          );

          if (
  alreadySaved
) {
  /*
   * 같은 내역이 이미 저장되어 있다면
   * 화면에서 즉시 제거합니다.
   */
  setPendingFinancialNotifications(
    currentItems =>
      currentItems.filter(
        notification =>
          notification.id !==
          item.id
      )
  );

  /*
   * 네이티브 저장소 정리는
   * 백그라운드에서 진행합니다.
   */
  cleanupSavedFinancialNotificationInBackground(
    item.id
  );

  if (
    !suppressNotice
  ) {
    setNoticeModal({
      title:
        '이미 저장된 내역',

      message:
        '같은 금융 알림이 이미 가계부에 저장되어 있어요.',
    });
  }

  return false;
}

/*
 * 금융 알림 제목과 본문에서
 * 실제 결제처 이름을 추출합니다.
 */
const merchantProfile =
  getFinancialMerchantProfile(
    item
  );

       const notificationMemo =
  (
    item.text.trim() ||
    item.title.trim() ||
    (
      action ===
      'expense'
        ? '금융 알림 지출'
        : '금융 알림 수입'
    )
  );

const memo =
  action ===
    'expense' &&
  selectedCategory ===
    '기타' &&
  normalizedOtherDetail
    ? normalizedOtherDetail
    : notificationMemo;

        const ledgerItem:
          LedgerItem = {
          id:
            `notification_` +
            `${item.id}_` +
            `${Date.now()}`,

          type:
            action,

          category:
  action ===
  'expense'
    ? selectedCategory
    : '수입',

          memo,

          amount,

          /*
 * 카드사명이나 알림 앱 제목
 */
paymentMethod:
  item.title.trim() ||
  undefined,

/*
 * 실제 결제처 이름
 */
merchantName:
  merchantProfile.label.trim() ||
  undefined,

inputSource:
  'notification',

autoSaved:
  isAutoSave,

sourcePackage:
  item.packageName,

          notificationFingerprint:
            item.id,

          occurredAt:
            Number.isNaN(
              occurredDate.getTime()
            )
              ? new Date()
                  .toISOString()
              : occurredDate
                  .toISOString(),
        };

        const nextLedgers = {
          ...latestLedgers,

          [occurredDateKey]: [
            ...currentItems,
            ledgerItem,
          ],
        };

/*
 * 저장 버튼을 누른 즉시
 * 금융 알림 목록에서 제거합니다.
 */
setPendingFinancialNotifications(
  currentItems =>
    currentItems.filter(
      notification =>
        notification.id !==
        item.id
    )
);

try {
  /*
   * 가계부 로컬 저장까지만 기다립니다.
   * 서버와 위젯은 saveLedgers 내부에서
   * 백그라운드 동기화됩니다.
   */
  await saveLedgers(
    nextLedgers
  );
} catch (
  localSaveError
) {
  /*
   * 로컬 저장에 실패했다면
   * 낙관적으로 반영한 가계부 상태를 되돌립니다.
   */
  setLedgers(
    latestLedgers
  );

  /*
   * 금융 알림도 다시 목록에 복구합니다.
   */
  setPendingFinancialNotifications(
    currentItems => {
      const alreadyRestored =
        currentItems.some(
          notification =>
            notification.id ===
            item.id
        );

      if (
        alreadyRestored
      ) {
        return currentItems;
      }

      return [
        ...currentItems,
        item,
      ].sort(
        (
          a,
          b
        ) =>
          b.postedAt -
          a.postedAt
      );
    }
  );

  throw localSaveError;
}

/*
 * 사용자가 직접 카테고리를 결정한 경우에만
 * 가맹점 카테고리 학습 기록에 반영합니다.
 *
 * 이 작업은 로컬 저장이므로 완료를 기다려도
 * 화면에는 이미 알림이 사라진 상태입니다.
 */
if (
  action ===
    'expense' &&
  !isAutoSave
) {
  await saveMerchantCategorySelection(
    item,
    selectedCategory
  );
}

/*
 * 처리 완료 ID 저장과 네이티브 알림 삭제는
 * 백그라운드에서 진행합니다.
 *
 * 목록 전체를 다시 불러오지 않으므로
 * 저장 후 기다리는 시간이 사라집니다.
 */
cleanupSavedFinancialNotificationInBackground(
  item.id
);

        /*
 * 화면을 보고 있지 않은 동안에도
 * 자동 저장될 수 있으므로 로그는 항상 남깁니다.
 */
console.log(
  isAutoSave
    ? 'FINANCIAL AUTO LEDGER SAVE COMPLETE'
    : 'FINANCIAL MANUAL LEDGER SAVE COMPLETE',
  {
    notificationId:
      item.id,

       merchantName:
      merchantProfile.label,

    amount,

    category:
      selectedCategory,
  }
);

if (
  !suppressNotice
) {
  setNoticeModal({
    title:
      action ===
      'expense'
        ? '지출 저장 완료'
        : '수입 저장 완료',

    message:
      `${formatMoney(
        amount
      )}원이 가계부에 반영되었어요.`,
  });
}

return true;

      } catch (error) {
  console.log(
    'FINANCIAL NOTIFICATION ACTION ERROR',
    error
  );

  if (
    !suppressNotice
  ) {
    setNoticeModal({
      title:
        '금융 내역 처리 실패',

      message:
        '금융 내역을 처리하지 못했어요. 잠시 후 다시 시도해주세요.',
    });
  }

  return false;
} finally {
  finishFinancialActionProcessing();
}
       },
    [
  saveMerchantCategorySelection,
  startFinancialActionProcessing,
  finishFinancialActionProcessing,
  cleanupSavedFinancialNotificationInBackground,
]
  );

useEffect(() => {
  pendingFinancialNotifications.forEach(
    item => {
      const merchantProfile =
        getFinancialMerchantProfile(
          item
        );

      /*
       * mixed 결제처는 자동 저장 금지
       */
      if (
        merchantProfile.type !==
        'single'
      ) {
        return;
      }

      const autoSaveRule =
        merchantAutoSaveRules[
          merchantProfile.key
        ];

      if (!autoSaveRule) {
        return;
      }

      /*
       * 자동 저장을 설정하기 전에 발생한
       * 기존 알림은 처리하지 않습니다.
       */
      if (
        item.postedAt <=
        autoSaveRule.enabledAt
      ) {
        return;
      }

      if (
        autoSavingFinancialIdsRef
          .current
          .has(
            item.id
          )
      ) {
        return;
      }

      autoSavingFinancialIdsRef
        .current
        .add(
          item.id
        );

      handleFinancialNotificationAction(
  item,
  'expense',
  autoSaveRule.category,
  true,
  true
)
  .then(
    saveSucceeded => {
      if (
        !saveSucceeded
      ) {
        console.log(
          'MERCHANT AUTO SAVE SKIPPED OR FAILED',
          {
            merchantKey:
              merchantProfile.key,

            category:
              autoSaveRule.category,

            notificationId:
              item.id,
          }
        );

        return;
      }

      console.log(
        'MERCHANT AUTO SAVE COMPLETE',
        {
          merchantKey:
            merchantProfile.key,

          category:
            autoSaveRule.category,

          notificationId:
            item.id,
        }
      );
    }
  )
  .catch(
    error => {
      console.log(
        'MERCHANT AUTO SAVE ERROR',
        {
          merchantKey:
            merchantProfile.key,

          category:
            autoSaveRule.category,

          notificationId:
            item.id,

          error,
        }
      );
    }
  )
  .finally(
    () => {
      autoSavingFinancialIdsRef
        .current
        .delete(
          item.id
        );
    }
  );
    }
  );
}, [
  pendingFinancialNotifications,
  merchantAutoSaveRules,
  handleFinancialNotificationAction,
]);

const saveMeals =
  async (
    next: Record<
      string,
      Record<
        string,
        MealItem[]
      >
    >
  ) => {
    /*
     * 화면에 먼저 반영합니다.
     */
    setMeals(
      next
    );

    /*
     * 앱을 종료해도 남도록
     * 로컬 저장을 완료합니다.
     */
    await AsyncStorage.setItem(
      'daily_meals_v1',
      JSON.stringify(
        next
      )
    );

    console.log(
      'MEALS LOCAL SAVE DONE',
      {
        dateCount:
          Object.keys(
            next
          ).length,
      }
    );

    /*
     * 서버 저장이 끝날 때까지
     * 기다립니다.
     */
    await safeSyncDailyData();

    console.log(
      'MEALS CLOUD SYNC WAIT DONE'
    );

    await syncRootWidgetData();
  };

  const saveWaterLogs =
  async (
    nextLogs: WaterLog[]
  ) => {
    /*
     * 화면 상태를 먼저 반영합니다.
     */
    setWaterLogs(
      nextLogs
    );

    /*
     * 앱을 종료해도 남도록
     * 로컬 저장 완료를 기다립니다.
     */
    await AsyncStorage.setItem(
      WATER_LOGS_KEY,
      JSON.stringify(
        nextLogs
      )
    );

    console.log(
      'WATER LOCAL SAVE DONE',
      {
        count:
          nextLogs.length,

        latest:
          nextLogs[0] ??
          null,
      }
    );

    /*
     * 서버 저장이 끝날 때까지
     * 기다립니다.
     */
    await safeSyncDailyData();

    console.log(
      'WATER CLOUD SYNC WAIT DONE'
    );

    await syncRootWidgetData();
  };
  const saveWeightLogs = async (nextLogs: WeightLog[]) => {
  const sorted = [...nextLogs].sort((a, b) =>
    b.log_date.localeCompare(a.log_date)
  );

  const limited = sorted.slice(0, 220);

  setWeightLogs(limited);

  await AsyncStorage.setItem(
    WEIGHT_LOGS_KEY,
    JSON.stringify(limited)
  );

  const latestWeight = limited[0]?.weight;

  if (latestWeight) {
    const nextProfile = {
      ...calorieProfile,
      weight: String(latestWeight),
    };

    setCalorieProfile(nextProfile);

    await AsyncStorage.setItem(
      'daily_calorie_profile_v1',
      JSON.stringify(nextProfile)
    );
  }

  safeSyncDailyData();

  await syncRootWidgetData();
};
  const saveStepLogs = async (nextLogs: StepLog[]) => {
  const sorted = [...nextLogs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const limited = sorted.slice(0, 60);

  setStepLogs(limited);
  await AsyncStorage.setItem(STEP_LOGS_KEY, JSON.stringify(limited));
  safeSyncDailyData();
};

const saveStepLogForToday = async (steps: number) => {
  const points = Math.floor(steps / STEP_POINT_PER);
  const today = formatDateKey(new Date());

  const logsRaw = await AsyncStorage.getItem(STEP_LOGS_KEY);
  const logs: StepLog[] = logsRaw ? JSON.parse(logsRaw) : [];

  const nextLogs = [
    { id: today, steps, points, log_date: today },
    ...logs.filter((l) => l.log_date !== today),
  ];

  await saveStepLogs(nextLogs);
};


  const saveCalorieProfile = async (next: CalorieProfile) => {
  setCalorieProfile(next);

  await AsyncStorage.setItem(
    'daily_calorie_profile_v1',
    JSON.stringify(next)
  );

  safeSyncDailyData();

  await syncRootWidgetData();
};
  const saveExerciseCalories = async (
  next: Record<string, number>
) => {
  setExerciseCalories(next);

  await AsyncStorage.setItem(
    'daily_exercise_calories_v1',
    JSON.stringify(next)
  );

  safeSyncDailyData();

  await syncRootWidgetData();
};
  
  const saveExerciseCalorieLogs = async (
  next: ExerciseCalorieLog[]
) => {
  setExerciseCalorieLogs(next);

  await AsyncStorage.setItem(
    EXERCISE_CALORIE_LOGS_KEY,
    JSON.stringify(next)
  );

  safeSyncDailyData();

  await syncRootWidgetData();
};

  const saveSleeps = async (
  next: Record<
    string,
    SleepRecord
  >
) => {
  setSleeps(next);

  await AsyncStorage.setItem(
    'daily_sleep_v1',
    JSON.stringify(next)
  );

  /*
   * 수면 기록의 서버 저장이
   * 끝날 때까지 기다립니다.
   */
  await safeSyncDailyData();

  await syncRootWidgetData();
};

const consumePendingWidgetSleepRecord = async () => {
  try {
    const module = NativeModules.RootWidgetModule;

    if (!module?.consumePendingSleepRecord) {
      return;
    }

    const raw = await module.consumePendingSleepRecord();

    if (!raw) {
      return;
    }

    const pending = JSON.parse(raw);

    const start = parseWidgetSleepDate(pending.startAt);
    const end = parseWidgetSleepDate(pending.endAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return;
    }

    const sleepMinutes = Math.max(
      0,
      Math.floor(
        (end.getTime() - start.getTime()) / 60000
      )
    );

   /*
 * 수면 저장용 날짜:
 * 낮 12시 기준
 */
const sleepDateKey =
  getSleepDayKey(end);

/*
 * 하루 기록표와 할 일 저장용 날짜:
 * 실제 달력 날짜
 */
const recordDateKey =
  formatDateKey(end);

    const sleepRecord: SleepRecord = {
      bedTime: `${String(start.getHours()).padStart(2, '0')}:${String(
        start.getMinutes()
      ).padStart(2, '0')}`,
      wakeTime: `${String(end.getHours()).padStart(2, '0')}:${String(
        end.getMinutes()
      ).padStart(2, '0')}`,
      sleepMinutes,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    };

    const savedSleepsRaw = await AsyncStorage.getItem(
      'daily_sleep_v1'
    );

    const savedSleeps: Record<string, SleepRecord> =
      savedSleepsRaw ? JSON.parse(savedSleepsRaw) : {};

   const nextSleeps = {
  ...savedSleeps,

  [sleepDateKey]:
    mergeSleepRecord(
      savedSleeps[
        sleepDateKey
      ],
      sleepRecord
    ),
};

    setSleeps(nextSleeps);

    await AsyncStorage.setItem(
      'daily_sleep_v1',
      JSON.stringify(nextSleeps)
    );

    const savedRecordsRaw = await AsyncStorage.getItem(
      'daily_time_records_v1'
    );

    const savedRecords: Record<string, Record<string, string>> =
      savedRecordsRaw ? JSON.parse(savedRecordsRaw) : {};

    let cursor = new Date(start);

    const nextDayRecords = {
      ...(savedRecords[recordDateKey] ?? {}),
    };

    while (cursor < end) {
      const h24 = cursor.getHours();
      const mStr = cursor.getMinutes() < 30 ? '00' : '30';

      const key = `${
        h24 < 12 ? '낮' : '저녁'
      }_${h24 % 12 === 0 ? 12 : h24 % 12}_${mStr}`;

      nextDayRecords[key] = '🌙 수면';

      cursor.setMinutes(
        cursor.getMinutes() < 30 ? 30 : 60
      );
    }

    const nextRecords = {
      ...savedRecords,
      [recordDateKey]: nextDayRecords,
    };

    setRecords(nextRecords);

    await AsyncStorage.setItem(
      'daily_time_records_v1',
      JSON.stringify(nextRecords)
    );

    setSelectedDate(end);
setCalendarMonth(end);

setSleepStartAt(null);
setSleepSeconds(0);

await AsyncStorage.removeItem(
  'daily_sleep_start_at_v1'
);

await AsyncStorage.removeItem(
  'daily_sleep_started_from_widget_v1'
);

await NativeModules.RootWidgetModule
  ?.cancelWidgetSleepNotification?.();

await cancelLegacyExpoSleepNotifications();

await safeSyncDailyData();

await syncRootWidgetData();
  } catch (e) {
    console.log(
      'WIDGET SLEEP CONSUME ERROR',
      e
    );
  }
};

const syncWidgetSleepStartToDay =
  async () => {
    try {
      const module =
        NativeModules
          .RootWidgetModule;

      const localStartRaw =
        await AsyncStorage.getItem(
          'daily_sleep_start_at_v1'
        );

      let nativeStartRaw:
        string | null = null;

      if (
        module
          ?.getWidgetSleepStartAt
      ) {
        nativeStartRaw =
          await module
            .getWidgetSleepStartAt();
      }

      /*
       * 네이티브에는 없지만
       * 로컬에 실행 중 수면이 남아 있다면
       * 네이티브 쪽으로 복구합니다.
       */
      if (
        !nativeStartRaw &&
        localStartRaw &&
        module?.startWidgetSleep
      ) {
        nativeStartRaw =
          await module
            .startWidgetSleep(
              localStartRaw
            );
      }

      const actualRaw =
        nativeStartRaw ??
        localStartRaw;

      if (!actualRaw) {
        setSleepStartAt(
          null
        );

        setSleepSeconds(
          0
        );

        return;
      }

      const start =
        parseWidgetSleepDate(
          actualRaw
        );

      if (
        Number.isNaN(
          start.getTime()
        )
      ) {
        return;
      }

      const iso =
        start.toISOString();

      /*
       * 네이티브와 하루 탭이
       * 완전히 같은 시작 시간을 사용합니다.
       */
      await AsyncStorage.setItem(
        'daily_sleep_start_at_v1',
        iso
      );

      setSleepStartAt(
        iso
      );

      /*
       * 이전 Expo 알림은 제거하고
       * 네이티브 알림 하나만 유지합니다.
       */
      if (
        nativeStartRaw
      ) {
        await cancelLegacyExpoSleepNotifications();
      }

      await syncRootWidgetData();

      console.log(
        'WIDGET SLEEP START SYNC DONE',
        iso
      );
    } catch (error) {
      console.log(
        'WIDGET SLEEP START SYNC ERROR',
        error
      );
    }
  };

useFocusEffect(
  useCallback(() => {
    let cancelled =
      false;

    let retryTimer:
      ReturnType<
        typeof setTimeout
      > |
      null = null;

    const synchronizeSleep =
      async () => {
        /*
         * 종료된 위젯 기록을 먼저 저장한 뒤
         * 실행 중 수면을 확인합니다.
         */
        await consumePendingWidgetSleepRecord();

        if (cancelled) {
          return;
        }

        await syncWidgetSleepStartToDay();

        /*
         * 초기 AsyncStorage 로딩이
         * 수면 상태를 다시 덮어쓰는 경우를
         * 방지하기 위해 한 번 더 맞춥니다.
         */
        retryTimer =
          setTimeout(
            () => {
              if (
                !cancelled
              ) {
                void syncWidgetSleepStartToDay();
              }
            },
            500
          );
      };

    void synchronizeSleep();

    return () => {
      cancelled =
        true;

      if (
        retryTimer
      ) {
        clearTimeout(
          retryTimer
        );
      }
    };
  }, [])
);


useEffect(() => {
  return; // 걸음수 기능 임심 비활성화
}, [stepEnabled, todayKey]);

  // 비즈니스 로직 핸들러
  // CHARACTER_V101G_DAY_LEDGER_CONTEXT_SYNC
  useEffect(() => {
    void syncFloatingCharacterSpendingContext(
      ledgers,
      ledgerBudgets
    );
  }, [
    ledgers,
    ledgerBudgets,
  ]);

  const handleCellOpen = (hour: number, period: '낮' | '저녁', minute: '00' | '30') => {
    const key = `${period}_${hour}_${minute}`;
    setSelectedCell({ hour, period, minute, key });
    setInputText(records[dateKey]?.[key] ?? '');
  };

  const handleCellSave = () => {
    if (!selectedCell) return;
    const next = { ...records, [dateKey]: { ...(records[dateKey] ?? {}), [selectedCell.key]: inputText } };
    setSelectedCell(null); setInputText(''); saveRecords(next);
  };

 

  const handleAddTodo = () => {
    const lines = todoInput.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return;
   const newTodos = lines.map((text) => ({
  id: `${Date.now()}_${Math.random()}`,
  text,
  completed: false,
  date: dateKey,
}));
    saveTodos({ ...todos, [dateKey]: [...(todos[dateKey] ?? []), ...newTodos] });
    setTodoInput(
  ''
);

setShowTodoModal(
  false
);

setShowSelectedTodoSection(
  true
);
  };

  const handleToggleTodo = (id: string) => {
    saveTodos({ ...todos, [dateKey]: (todos[dateKey] ?? []).map((t) => t.id === id ? { ...t, completed: !t.completed } : t) });
  };

  const handleDeleteTodo = async (id: string) => {
  const target = (todos[dateKey] ?? []).find((t) => t.id === id);

  if (target?.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(
      target.notificationId
    );
  }

  saveTodos({
    ...todos,
    [dateKey]: (todos[dateKey] ?? []).filter((t) => t.id !== id),
  });
};

  const handleSaveTodoReminder = async () => {
  if (!reminderTodo) return;

  const hour = Number(reminderHour);
  const minute = Number(reminderMinute);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return;

  const targetDate = new Date(selectedDate);
  targetDate.setHours(hour);
  targetDate.setMinutes(minute);
  targetDate.setSeconds(0);
  targetDate.setMilliseconds(0);

  if (targetDate.getTime() <= Date.now()) {
  setNoticeModal({
    title: '알림 시간 확인',
    message: '현재 시간보다 이후 시간을 선택해 주세요.',
  });
  return;
}

  if (reminderTodo.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(
      reminderTodo.notificationId
    );
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '루트 할일 알림',
      body: reminderTodo.text,
      sound: 'default',
    },
    trigger: {
  type: Notifications.SchedulableTriggerInputTypes.DATE,
  date: targetDate,
},
  });

  const nextTodos = (todos[dateKey] ?? []).map((todo) =>
    todo.id === reminderTodo.id
      ? {
          ...todo,
          reminderAt: targetDate.toISOString(),
          notificationId: id,
        }
      : todo
  );

  await saveTodos({
    ...todos,
    [dateKey]: nextTodos,
  });

  setReminderTodo(
  null
);

setShowSelectedTodoSection(
  true
);
};

  const handleSaveStory = () => {
    if (storyInput.trim() === '') return;
    saveStories({ ...stories, [dateKey]: { weather: selectedWeather, mood: selectedMood, text: storyInput } });
    setShowStoryModal(false);
  };

const handleCloseLedgerModal =
  () => {
    setShowLedgerModal(
      false
    );

    setEditingLedger(
      null
    );

    setLedgerType(
      'expense'
    );

    setLedgerCategory(
      '식비'
    );

    setLedgerMemo(
      ''
    );

    setLedgerAmount(
      ''
    );
  };

const handleAddLedger =
  async () => {
    const amount =
      Number(
        ledgerAmount.replace(
          /[^0-9]/g,
          ''
        )
      );

    if (amount <= 0) {
      setNoticeModal({
        title:
          '금액 확인',

        message:
          '금액을 입력해주세요.',
      });

      return;
    }

    const newItem:
      LedgerItem = {
      id:
        `${Date.now()}_` +
        `${Math.random()}`,

      type:
        ledgerType,

      category:
        ledgerType ===
        'expense'
          ? ledgerCategory
          : '수입',

      memo:
        ledgerMemo.trim(),

      amount,

      inputSource:
        'manual',
    };

    const nextLedgers = {
      ...ledgers,

      [dateKey]: [
        ...(
          ledgers[
            dateKey
          ] ?? []
        ),

        newItem,
      ],
    };

    const savePromise =
      saveLedgers(
        nextLedgers
      );

    handleCloseLedgerModal();

    try {
      await savePromise;
    } catch (error) {
      console.log(
        'LEDGER ADD SAVE ERROR',
        error
      );

      setNoticeModal({
  title:
    '가계부 저장 실패',

  message:
    '가계부를 기기에 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
});
    }
  };


  const openLedgerBudgetModal = (
  targetDate: Date =
    new Date()
) => {
  const normalizedDate =
    new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1
    );

  const monthKey =
    formatMonthKey(
      normalizedDate
    );

  const savedBudget =
    ledgerBudgets[
      monthKey
    ] ?? 0;

  setLedgerBudgetTargetMonth(
    normalizedDate
  );

  /*
   * 예산이 없으면 바로 입력 화면,
   * 예산이 있으면 금액 보기 화면
   */
  setIsEditingLedgerBudget(
    savedBudget <= 0
  );

  setLedgerBudgetInput(
    savedBudget > 0
      ? String(savedBudget)
      : ''
  );

  setShowLedgerBudgetModal(
    true
  );
};

const saveLedgerBudgets =
  async (
    next: Record<
      string,
      number
    >
  ) => {
    setLedgerBudgets(
      next
    );

    await AsyncStorage.setItem(
      LEDGER_BUDGETS_KEY,
      JSON.stringify(next)
    );

    safeSyncDailyData();
  };
  
const handleSaveLedgerBudget =
  async () => {
    const amount =
      Number(
        ledgerBudgetInput.replace(
          /[^0-9]/g,
          ''
        )
      );

    if (amount <= 0) {
      setNoticeModal({
        title:
          '예산 금액 확인',

        message:
          '이번 달 목표 예산을 입력해주세요.',
      });

      return;
    }

    const monthKey =
      formatMonthKey(
        ledgerBudgetTargetMonth
      );

    await saveLedgerBudgets({
      ...ledgerBudgets,

      [monthKey]:
        amount,
    });

    /*
     * 저장 후 입력창을 없애고
     * 금액 + 변경 버튼 화면으로 전환
     */
    setLedgerBudgetInput(
      String(amount)
    );

    setIsEditingLedgerBudget(
      false
    );
  };
  
const openCancellationRestoreModal =
  (
    targetDateKey:
      string,

    ledgerItem:
      LedgerItem
  ) => {
    if (
      ledgerItem.cancelled !==
      true
    ) {
      return;
    }

    setCancellationRestoreTarget({
      ledgerDateKey:
        targetDateKey,

      ledgerItem,
    });
  };

const handleRestoreCancelledLedger =
  async (
    targetDateKey:
      string,

    ledgerId:
      string
  ) => {
    if (
  !startFinancialActionProcessing()
) {
  return false;
}

try {
      const ledgerRaw =
        await AsyncStorage.getItem(
          'daily_ledger_v1'
        );

      const latestLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        ledgerRaw
          ? JSON.parse(
              ledgerRaw
            )
          : {};

      const targetItems =
        latestLedgers[
          targetDateKey
        ] ?? [];

      const targetItem =
        targetItems.find(
          ledgerItem =>
            ledgerItem.id ===
              ledgerId &&
            ledgerItem.cancelled ===
              true
        );

      if (
        !targetItem
      ) {
        setNoticeModal({
          title:
            '복구할 수 없음',

          message:
            '취소된 가계부 내역을 찾지 못했어요.',
        });

        return;
      }

      const nextLedgers =
        Object.fromEntries(
          Object.entries(
            latestLedgers
          ).map(
            ([
              ledgerDateKey,
              ledgerItems,
            ]) => [
              ledgerDateKey,

              ledgerDateKey ===
                targetDateKey
                ? ledgerItems.map(
                    ledgerItem => {
                      if (
                        ledgerItem.id !==
                        ledgerId
                      ) {
                        return ledgerItem;
                      }

                     /*
 * 취소 상태와 취소 시각만 제거합니다.
 *
 * cancellationFingerprint는
 * 이미 처리한 취소 알림이 다시
 * 나타나지 않도록 유지합니다.
 */
                      const {
  cancelled:
    _cancelled,

  cancelledAt:
    _cancelledAt,

  ...restoredLedgerItem
} =
  ledgerItem;

                      return (
                        restoredLedgerItem
                      );
                    }
                  )
                : ledgerItems,
            ]
          )
        ) as Record<
          string,
          LedgerItem[]
        >;

      await saveLedgers(
        nextLedgers
      );

      setCancellationRestoreTarget(
  null
);

      setNoticeModal({
        title:
          '취소 처리 복구',

        message:
          `${
            targetItem
              .merchantName ??
            targetItem.memo ??
            '선택한 결제'
          } ` +
          `${formatMoney(
            targetItem.amount
          )}원 내역을 다시 지출에 반영했어요.`,
      });

      console.log(
  'FINANCIAL CANCELLATION RESTORED',
  {
    ledgerId,

    targetDateKey,

    amount:
      targetItem.amount,

    cancellationFingerprint:
      targetItem
        .cancellationFingerprint ??
      null,

      cancellationHistoryCount:
  Array.isArray(
    targetItem
      .cancellationFingerprintHistory
  )
    ? targetItem
        .cancellationFingerprintHistory
        .length
    : targetItem
        .cancellationFingerprint
      ? 1
      : 0,

cancellationHistoryLimit:
  MAX_CANCELLATION_FINGERPRINT_HISTORY,

  }
);
    } catch (error) {
      console.log(
        'FINANCIAL CANCELLATION RESTORE ERROR',
        error
      );

      setNoticeModal({
        title:
          '복구 실패',

        message:
          '취소된 내역을 복구하지 못했어요.',
      });
    } finally {
      finishFinancialActionProcessing();
    }
  };

const handleOpenLedgerEdit =
  async (
    targetDateKey: string,
    item: LedgerItem
  ) => {
    if (
      item.cancelled ===
      true
    ) {
      setNoticeModal({
        title:
          '취소된 내역',

        message:
          '취소된 내역은 먼저 취소 복구를 한 뒤 수정해주세요.',
      });

      return;
    }

    /*
     * 식단에서 생성된 가계부 내역은
     * 일반 가계부 수정창이 아니라
     * 원본 식단 수정창을 바로 엽니다.
     *
     * 이렇게 해야 식단 가격과 가계부 금액이
     * 항상 같은 값으로 유지됩니다.
     */
    if (
      item.inputSource ===
      'meal'
    ) {
      try {
        const mealId =
          item.id.startsWith(
            'meal_'
          )
            ? item.id.slice(
                'meal_'.length
              )
            : '';

        if (!mealId) {
          setNoticeModal({
            title:
              '식단 연결 확인',

            message:
              '연결된 식단 ID를 찾지 못했어요.',
          });

          return;
        }

        /*
         * 화면 상태보다 저장소의 최신 식단을
         * 우선 확인합니다.
         */
        const mealsRaw =
          await AsyncStorage.getItem(
            'daily_meals_v1'
          );

        const latestMeals:
          Record<
            string,
            Record<
              string,
              MealItem[]
            >
          > =
          mealsRaw
            ? JSON.parse(
                mealsRaw
              )
            : meals;

        const targetDateMeals =
          latestMeals[
            targetDateKey
          ] ?? {};

        let matchedMealType =
          '';

        let matchedMeal:
          MealItem |
          null =
          null;

        /*
         * 아침·점심·저녁·간식 중에서
         * meal ID가 일치하는 원본 식단을 찾습니다.
         */
        for (
          const [
            mealType,
            mealItems,
          ] of Object.entries(
            targetDateMeals
          )
        ) {
          const foundMeal =
            (
              Array.isArray(
                mealItems
              )
                ? mealItems
                : []
            ).find(
              mealItem =>
                mealItem.id ===
                mealId
            );

          if (
            foundMeal
          ) {
            matchedMealType =
              mealType;

            matchedMeal =
              foundMeal;

            break;
          }
        }

        if (
          !matchedMeal ||
          !matchedMealType
        ) {
          setNoticeModal({
            title:
              '식단 연결 확인',

            message:
              '가격을 수정할 원본 식단을 찾지 못했어요.',
          });

          return;
        }

        /*
         * 가계부 수정 버튼에서
         * 원본 식단 수정창을 바로 엽니다.
         */
        handleOpenMealEdit(
          matchedMealType,
          matchedMeal,
          targetDateKey
        );

        return;
      } catch (
        error
      ) {
        console.log(
          'OPEN MEAL FROM LEDGER ERROR',
          error
        );

        setNoticeModal({
          title:
            '식단 열기 실패',

          message:
            '연결된 식단 수정창을 열지 못했어요.',
        });

        return;
      }
    }

    /*
     * 일반 지출·수입 내역은
     * 기존 가계부 수정창을 사용합니다.
     */
    setEditingLedger({
      dateKey:
        targetDateKey,

      item,
    });

    setLedgerType(
      item.type
    );

    setLedgerCategory(
      item.type ===
        'expense' &&
      LEDGER_CATEGORIES.includes(
        item.category
      )
        ? item.category
        : '식비'
    );

    setLedgerMemo(
      item.merchantName?.trim() ||
      item.memo?.trim() ||
      item.paymentMethod?.trim() ||
      ''
    );

    setLedgerAmount(
      String(
        Number(
          item.amount
        ) || 0
      )
    );

    setShowLedgerModal(
      true
    );
  };

const handleUpdateLedger =
  async () => {
    const target =
      editingLedger;

    if (!target) {
      return;
    }

    const amount =
      Number(
        ledgerAmount.replace(
          /[^0-9]/g,
          ''
        )
      );

    if (amount <= 0) {
      setNoticeModal({
        title:
          '금액 확인',

        message:
          '금액을 입력해주세요.',
      });

      return;
    }

    const nextMemo =
      ledgerMemo.trim();

    try {
      const ledgerRaw =
        await AsyncStorage.getItem(
          'daily_ledger_v1'
        );

      const latestLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        ledgerRaw
          ? JSON.parse(
              ledgerRaw
            )
          : ledgers;

      const targetItems =
        latestLedgers[
          target.dateKey
        ] ?? [];

      const targetExists =
        targetItems.some(
          item =>
            item.id ===
            target.item.id
        );

      if (!targetExists) {
        handleCloseLedgerModal();

        setNoticeModal({
          title:
            '수정할 내역 없음',

          message:
            '수정할 가계부 내역을 찾지 못했어요. 내역 화면을 다시 열어주세요.',
        });

        return;
      }

      const nextLedgers:
        Record<
          string,
          LedgerItem[]
        > = {
        ...latestLedgers,

        [target.dateKey]:
          targetItems.map(
            item => {
              if (
                item.id !==
                target.item.id
              ) {
                return item;
              }

              return {
                ...item,

                type:
                  ledgerType,

                category:
                  ledgerType ===
                  'expense'
                    ? ledgerCategory
                    : '수입',

                memo:
                  nextMemo,

                amount,

                ...(
                  item.inputSource ===
                  'notification'
                    ? {
                        merchantName:
                          nextMemo,
                      }
                    : {}
                ),
              };
            }
          ),
      };

      const savePromise =
        saveLedgers(
          nextLedgers
        );

      handleCloseLedgerModal();

      await savePromise;

      console.log(
        'LEDGER UPDATE COMPLETE',
        {
          dateKey:
            target.dateKey,

          ledgerId:
            target.item.id,

          type:
            ledgerType,

          category:
            ledgerType ===
            'expense'
              ? ledgerCategory
              : '수입',

          amount,
        }
      );
    } catch (error) {
      console.log(
        'LEDGER UPDATE ERROR',
        error
      );

      setNoticeModal({
        title:
          '가계부 수정 실패',

        message:
          '가계부 내역을 수정하지 못했어요. 잠시 후 다시 시도해주세요.',
      });
    }
  };

  const handleDeleteLedger = (
  targetDateKey: string,
  id: string
) => {
  saveLedgers({
    ...ledgers,

    [targetDateKey]:
      (
        ledgers[
          targetDateKey
        ] ?? []
      ).filter(
        (item) =>
          item?.id !== id
      ),
  });
};

/*
 * 저장된 식단의 수정 팝업을 엽니다.
 */
const handleOpenMealEdit = (
  mealType: string,
  item: MealItem,
  targetDateKey: string =
    dateKey
) => {
  if (
    mealSavingRef.current
  ) {
    return;
  }

 setEditingMeal({
  dateKey:
    targetDateKey,

  mealType,
  item,
});

  setSelectedMealType(
    mealType
  );

  setMealName(
    item.name ?? ''
  );

  setMealMemo(
    item.memo ?? ''
  );

  setMealPrice(
    item.price > 0
      ? String(
          item.price
        )
      : ''
  );

  setMealCalories(
    item.calories > 0
      ? String(
          item.calories
        )
      : ''
  );

  setMealImageUri(
    item.imageUri
  );

  setShowMealModal(
    true
  );
};

/*
 * 식단 팝업을 닫고
 * 수정 상태를 해제합니다.
 */
const handleCloseMealModal =
  () => {
    if (
      mealSavingRef.current
    ) {
      return;
    }

    setShowMealModal(
      false
    );

    setEditingMeal(
      null
    );
  };


  const handlePickMealImage = async (camera: boolean) => {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = camera ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) setMealImageUri(result.assets[0].uri);
  };

  const handleAddMeal =
  async () => {
    /*
     * 저장 버튼을 연속으로 눌러
     * 같은 식단이 두 번 생기는 것을 막습니다.
     */
    if (
      mealSavingRef.current
    ) {
      return;
    }

    const nextMealName =
      mealName.trim();

    if (
      !nextMealName &&
      !mealImageUri
    ) {
      setNoticeModal({
        title:
          '식단 확인',

        message:
          '음식 이름이나 사진을 입력해주세요.',
      });

      return;
    }

    mealSavingRef.current =
      true;

    setMealSaving(
      true
    );

    /*
     * 입력값은 팝업을 닫기 전에
     * 현재 변수에 고정합니다.
     */
    const targetMealType =
      selectedMealType;

    const mealDateKey =
      dateKey;

    const createdAt =
      Date.now();

    const price =
      Number(
        mealPrice.replace(
          /[^0-9]/g,
          ''
        )
      ) || 0;

    const calories =
      Number(
        mealCalories.replace(
          /[^0-9]/g,
          ''
        )
      ) || 0;

    const newItem:
      MealItem = {
      id:
        `${createdAt}_` +
        `${Math.random()}`,

      name:
        nextMealName,

      memo:
        mealMemo.trim(),

      price,

      calories,

      imageUri:
        mealImageUri,
    };

    try {
      /*
       * React 상태가 오래되었을 수 있으므로
       * AsyncStorage에서 식단과 가계부의
       * 최신 데이터를 함께 읽습니다.
       */
      const [
        mealsRaw,
        ledgerRaw,
      ] =
        await Promise.all([
          AsyncStorage.getItem(
            'daily_meals_v1'
          ),

          AsyncStorage.getItem(
            'daily_ledger_v1'
          ),
        ]);

      const latestMeals:
        Record<
          string,
          Record<
            string,
            MealItem[]
          >
        > =
        mealsRaw
          ? JSON.parse(
              mealsRaw
            )
          : {};

      const latestLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        ledgerRaw
          ? JSON.parse(
              ledgerRaw
            )
          : {};

      const currentMeals =
        latestMeals[
          mealDateKey
        ]?.[
          targetMealType
        ] ?? [];

      const nextMeals:
        Record<
          string,
          Record<
            string,
            MealItem[]
          >
        > = {
        ...latestMeals,

        [mealDateKey]: {
          ...(
            latestMeals[
              mealDateKey
            ] ?? {}
          ),

          [targetMealType]: [
            ...currentMeals,
            newItem,
          ],
        },
      };

      let nextLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        latestLedgers;

      /*
       * 가격을 입력한 식단만
       * 가계부 식비에 함께 추가합니다.
       */
      if (
        price > 0
      ) {
        const mealLabel =
          MEAL_TYPES.find(
            mealType =>
              mealType.key ===
              targetMealType
          )?.label ??
          '식단';

        const ledgerItem:
          LedgerItem = {
          id:
            `meal_${newItem.id}`,

          type:
            'expense',

          category:
            '식비',

          memo:
            `${mealLabel} - ` +
            `${
              newItem.name ||
              '음식'
            }`,

          amount:
            price,

          inputSource:
            'meal',

          occurredAt:
            new Date(
              createdAt
            ).toISOString(),
        };

        nextLedgers = {
          ...latestLedgers,

          [mealDateKey]: [
            ...(
              latestLedgers[
                mealDateKey
              ] ?? []
            ),

            ledgerItem,
          ],
        };
      }

      /*
       * 식단과 연결 가계부를
       * 한 번의 로컬 저장 작업으로 기록합니다.
       *
       * 가격이 없는 식단은
       * 식단 데이터만 저장합니다.
       */
      const storagePairs:
        [string, string][] = [
        [
          'daily_meals_v1',

          JSON.stringify(
            nextMeals
          ),
        ],
      ];

      if (
        price > 0
      ) {
        storagePairs.push([
          'daily_ledger_v1',

          JSON.stringify(
            nextLedgers
          ),
        ]);
      }

      await AsyncStorage.multiSet(
        storagePairs
      );

      /*
       * 하루 탭 화면을 즉시 갱신합니다.
       */
      setMeals(
        nextMeals
      );

      if (
        price > 0
      ) {
        setLedgers(
          nextLedgers
        );
      }

      console.log(
        'MEAL BUNDLE LOCAL SAVE DONE',
        {
          mealDateKey,

          mealType:
            targetMealType,

          mealId:
            newItem.id,

          price,

          calories,

          ledgerLinked:
            price > 0,
        }
      );

      /*
       * 로컬 저장이 완료됐으므로
       * 입력값을 초기화하고 팝업을 즉시 닫습니다.
       *
       * 서버 저장을 기다리는 동안에도
       * 사용자는 바로 하루 화면을 볼 수 있습니다.
       */
      setMealName(
        ''
      );

      setMealMemo(
        ''
      );

      setMealPrice(
        ''
      );

      setMealCalories(
        ''
      );

      setMealImageUri(
        undefined
      );

      setShowMealModal(
        false
      );

      /*
       * 로컬 저장은 끝났으므로 버튼 잠금을
       * 지금 해제합니다.
       *
       * Firestore REST 대기 중에도 목록의
       * 수정 버튼을 바로 누를 수 있습니다.
       */
      mealSavingRef.current =
        false;

      setMealSaving(
        false
      );

      /*
       * 위젯과 서버는 동시에 갱신합니다.
       *
       * 기존처럼 서버 저장 뒤에 위젯을
       * 갱신하지 않으므로 위젯 반영이 빨라집니다.
       */
      const [
        widgetResult,
        cloudResult,
      ] =
        await Promise.allSettled([
          syncRootWidgetData(),

          safeSyncDailyData(),
        ]);

      if (
        widgetResult.status ===
        'rejected'
      ) {
        console.log(
          'MEAL BUNDLE WIDGET SYNC ERROR',
          widgetResult.reason
        );
      } else {
        console.log(
          'MEAL BUNDLE WIDGET SYNC DONE'
        );
      }

      if (
        cloudResult.status ===
        'rejected'
      ) {
        console.log(
          'MEAL BUNDLE CLOUD SYNC ERROR',
          cloudResult.reason
        );
      } else {
        console.log(
          'MEAL BUNDLE CLOUD SYNC DONE'
        );
      }
    } catch (error) {
      console.log(
        'MEAL BUNDLE SAVE ERROR',
        error
      );

      /*
       * 로컬 저장 자체가 실패한 경우에만
       * 오류 안내를 표시합니다.
       */
      setNoticeModal({
        title:
          '식단 저장 실패',

        message:
          '식단을 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      mealSavingRef.current =
        false;

      setMealSaving(
        false
      );
    }
  };

/*
 * 저장된 식단을 수정합니다.
 *
 * 식단 가격과 연결된 가계부 내역도
 * 같은 작업에서 함께 수정합니다.
 */
const handleUpdateMeal =
  async () => {
    const target =
      editingMeal;

    if (
      !target ||
      mealSavingRef.current
    ) {
      return;
    }

    const nextMealName =
      mealName.trim();

    if (
      !nextMealName &&
      !mealImageUri
    ) {
      setNoticeModal({
        title:
          '식단 확인',

        message:
          '음식 이름이나 사진을 입력해주세요.',
      });

      return;
    }

    mealSavingRef.current =
      true;

    setMealSaving(
      true
    );

    const price =
      Number(
        mealPrice.replace(
          /[^0-9]/g,
          ''
        )
      ) || 0;

    const calories =
      Number(
        mealCalories.replace(
          /[^0-9]/g,
          ''
        )
      ) || 0;

    const nextMealItem:
      MealItem = {
      ...target.item,

      name:
        nextMealName,

      memo:
        mealMemo.trim(),

      price,

      calories,

      imageUri:
        mealImageUri,
    };

    try {
      /*
       * 화면 상태가 오래되었을 수 있으므로
       * 저장소의 최신 식단과 가계부를 읽습니다.
       */
      const [
        mealsRaw,
        ledgerRaw,
      ] =
        await Promise.all([
          AsyncStorage.getItem(
            'daily_meals_v1'
          ),

          AsyncStorage.getItem(
            'daily_ledger_v1'
          ),
        ]);

      const latestMeals:
        Record<
          string,
          Record<
            string,
            MealItem[]
          >
        > =
        mealsRaw
          ? JSON.parse(
              mealsRaw
            )
          : {};

      const latestLedgers:
        Record<
          string,
          LedgerItem[]
        > =
        ledgerRaw
          ? JSON.parse(
              ledgerRaw
            )
          : {};

      const currentMealItems =
        latestMeals[
          target.dateKey
        ]?.[
          target.mealType
        ] ?? [];

      const targetExists =
        currentMealItems.some(
          item =>
            item.id ===
            target.item.id
        );

      if (
        !targetExists
      ) {
        setNoticeModal({
          title:
            '식단 수정 실패',

          message:
            '수정할 식단을 찾지 못했어요. 화면을 다시 열어주세요.',
        });

        return;
      }

      const nextMealItems =
        currentMealItems.map(
          item =>
            item.id ===
            target.item.id
              ? nextMealItem
              : item
        );

      const nextMeals:
        Record<
          string,
          Record<
            string,
            MealItem[]
          >
        > = {
        ...latestMeals,

        [target.dateKey]: {
          ...(
            latestMeals[
              target.dateKey
            ] ?? {}
          ),

          [target.mealType]:
            nextMealItems,
        },
      };

      /*
       * 식단과 연결된 가계부 ID입니다.
       */
      const linkedLedgerId =
        `meal_${target.item.id}`;

      const currentLedgerItems =
        latestLedgers[
          target.dateKey
        ] ?? [];

      const existingLedgerItem =
        currentLedgerItems.find(
          item =>
            item.id ===
            linkedLedgerId
        );

      /*
       * 기존 연결 가계부를 먼저 제외합니다.
       *
       * 가격이 0원이 되면 그대로 제거되고,
       * 가격이 있으면 새로운 값으로 다시 추가됩니다.
       */
      const ledgerItemsWithoutMeal =
        currentLedgerItems.filter(
          item =>
            item.id !==
            linkedLedgerId
        );

      const mealLabel =
        MEAL_TYPES.find(
          mealType =>
            mealType.key ===
            target.mealType
        )?.label ??
        '식단';

      let nextDateLedgerItems =
        ledgerItemsWithoutMeal;

      if (
        price > 0
      ) {
        const nextLedgerItem:
          LedgerItem = {
          ...(
            existingLedgerItem ??
            {}
          ),

          id:
            linkedLedgerId,

          type:
            'expense',

          category:
            '식비',

          memo:
            `${mealLabel} - ` +
            `${
              nextMealItem.name ||
              '음식'
            }`,

          amount:
            price,

          inputSource:
            'meal',

          occurredAt:
            existingLedgerItem
              ?.occurredAt ??
            new Date()
              .toISOString(),
        };

        nextDateLedgerItems = [
          ...ledgerItemsWithoutMeal,

          nextLedgerItem,
        ];
      }

      const nextLedgers:
        Record<
          string,
          LedgerItem[]
        > = {
        ...latestLedgers,

        [target.dateKey]:
          nextDateLedgerItems,
      };

      /*
       * 식단과 연결 가계부를 함께 저장하여
       * 둘 중 하나만 수정되는 상황을 막습니다.
       */
      await AsyncStorage.multiSet([
        [
          'daily_meals_v1',

          JSON.stringify(
            nextMeals
          ),
        ],

        [
          'daily_ledger_v1',

          JSON.stringify(
            nextLedgers
          ),
        ],
      ]);

      setMeals(
        nextMeals
      );

      setLedgers(
        nextLedgers
      );

      console.log(
        'MEAL BUNDLE LOCAL UPDATE DONE',
        {
          mealDateKey:
            target.dateKey,

          mealType:
            target.mealType,

          mealId:
            target.item.id,

          price,

          calories,

          ledgerLinked:
            price > 0,
        }
      );

      /*
       * 입력값과 수정 상태를 초기화합니다.
       */
      setMealName(
        ''
      );

      setMealMemo(
        ''
      );

      setMealPrice(
        ''
      );

      setMealCalories(
        ''
      );

      setMealImageUri(
        undefined
      );

      setEditingMeal(
        null
      );

      setShowMealModal(
        false
      );

      /*
       * 식단과 연결 가계부의 로컬 저장이
       * 끝났으므로 버튼 잠금을 먼저 해제합니다.
       */
      mealSavingRef.current =
        false;

      setMealSaving(
        false
      );

      /*
       * 위젯과 Firestore를 갱신합니다.
       */
      const [
        widgetResult,
        cloudResult,
      ] =
        await Promise.allSettled([
          syncRootWidgetData(),

          safeSyncDailyData(),
        ]);

      if (
        widgetResult.status ===
        'rejected'
      ) {
        console.log(
          'MEAL UPDATE WIDGET SYNC ERROR',
          widgetResult.reason
        );
      } else {
        console.log(
          'MEAL UPDATE WIDGET SYNC DONE'
        );
      }

      if (
        cloudResult.status ===
        'rejected'
      ) {
        console.log(
          'MEAL UPDATE CLOUD SYNC ERROR',
          cloudResult.reason
        );
      } else {
        console.log(
          'MEAL UPDATE CLOUD SYNC DONE'
        );
      }
    } catch (error) {
      console.log(
        'MEAL BUNDLE UPDATE ERROR',
        error
      );

      setNoticeModal({
        title:
          '식단 수정 실패',

        message:
          '식단을 수정하지 못했어요. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      mealSavingRef.current =
        false;

      setMealSaving(
        false
      );
    }
  };

 const handleDeleteMeal =
  async (
    mealKey: string,
    id: string
  ) => {
    const current =
      meals[
        dateKey
      ]?.[
        mealKey
      ] ?? [];

    await saveMeals({
      ...meals,

      [dateKey]: {
        ...(
          meals[
            dateKey
          ] ?? {}
        ),

        [mealKey]:
          current.filter(
            (item) =>
              item?.id !== id
          ),
      },
    });

    const ledgerRaw =
      await AsyncStorage.getItem(
        'daily_ledger_v1'
      );

    const latestLedgers:
      Record<
        string,
        LedgerItem[]
      > =
      ledgerRaw
        ? JSON.parse(
            ledgerRaw
          )
        : {};

    await saveLedgers({
      ...latestLedgers,

      [dateKey]:
        (
          latestLedgers[
            dateKey
          ] ?? []
        ).filter(
          (item) =>
            item?.id !==
            `meal_${id}`
        ),
    });
  };

  const handleGetRecommendedMenus = () => {
    let menus = mealMenus[mealMode];
    if (excludeYesterdayMenu) {
      const yesterday = new Date(selectedDate); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayMeals = meals[formatDateKey(yesterday)] ?? {};
      const yesterdayMenuNames = Object.values(yesterdayMeals).flat().map((item) => item.name);
      menus = menus.filter((menu) => !yesterdayMenuNames.includes(menu));
    }
    const shuffled = [...menus].sort(() => Math.random() - 0.5);
    setRecommendedMenus(shuffled.slice(0, 6));
  };

  // 수면 타이머 로직
const showSleepNotification = async () => {
  await Notifications.setNotificationChannelAsync('sleep', {
    name: '수면 기록',
    importance: Notifications.AndroidImportance.LOW,
  });

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 수면 기록 중',
      body: '수면 중입니다.',
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  });

  setSleepNotificationId(id);
};

const cancelSleepNotification = async () => {
  if (!sleepNotificationId) return;

  await Notifications.dismissNotificationAsync(sleepNotificationId);
  setSleepNotificationId(null);
};

/*
 * 과거 하루 탭에서 만든
 * Expo 수면 알림만 제거합니다.
 *
 * 네이티브의
 * "루트 수면 기록 중" 알림은
 * 제거하지 않습니다.
 */
const cancelLegacyExpoSleepNotifications =
  async () => {
    try {
      const identifierSet =
        new Set<string>();

      if (
        sleepNotificationId
      ) {
        identifierSet.add(
          sleepNotificationId
        );
      }

      const presented =
        await Notifications
          .getPresentedNotificationsAsync();

      presented.forEach(
        notification => {
          const title =
            String(
              notification
                .request
                .content
                .title ??
              ''
            );

          if (
            title ===
            '🌙 수면 기록 중'
          ) {
            identifierSet.add(
              notification
                .request
                .identifier
            );
          }
        }
      );

      await Promise.all(
        Array.from(
          identifierSet
        ).map(
          identifier =>
            Notifications
              .dismissNotificationAsync(
                identifier
              )
        )
      );
    } catch (error) {
      console.log(
        'LEGACY SLEEP NOTIFICATION CANCEL ERROR',
        error
      );
    } finally {
      setSleepNotificationId(
        null
      );
    }
  };

  const handleStartSleep =
  async () => {
    try {
      const module =
        NativeModules
          .RootWidgetModule;

      /*
       * 이미 네이티브 또는 로컬에서
       * 시작 중인 수면이 있는지 확인합니다.
       */
      const nativeStartRaw =
        module
          ?.getWidgetSleepStartAt
          ? await module
              .getWidgetSleepStartAt()
          : null;

      const localStartRaw =
        await AsyncStorage.getItem(
          'daily_sleep_start_at_v1'
        );

      const existingRaw =
        nativeStartRaw ??
        sleepStartAt ??
        localStartRaw;

      if (existingRaw) {
  const existingDate =
    parseWidgetSleepDate(
      existingRaw
    );

  if (
    !Number.isNaN(
      existingDate.getTime()
    )
  ) {
    let existingIso =
      existingDate
        .toISOString();

    /*
     * 로컬에는 수면이 있지만
     * 네이티브 위젯에는 없다면
     * 같은 시작 시간으로 복구합니다.
     */
    if (
      !nativeStartRaw &&
      module?.startWidgetSleep
    ) {
      const restoredStartRaw =
        await module
          .startWidgetSleep(
            existingIso
          );

      const restoredDate =
        parseWidgetSleepDate(
          restoredStartRaw ??
          existingIso
        );

      if (
        !Number.isNaN(
          restoredDate.getTime()
        )
      ) {
        existingIso =
          restoredDate
            .toISOString();
      }
    }

    setSleepStartAt(
      existingIso
    );

    await AsyncStorage.setItem(
      'daily_sleep_start_at_v1',
      existingIso
    );

    if (
      module?.startWidgetSleep
    ) {
      await cancelLegacyExpoSleepNotifications();
    }

    await safeSyncDailyData();

    await syncRootWidgetData();

    return;
  }
}

      const requestedStartAt =
        new Date()
          .toISOString();

      let actualStartAt =
        requestedStartAt;

      /*
       * 네이티브 공통 수면 상태를
       * 먼저 시작합니다.
       */
      if (
        module?.startWidgetSleep
      ) {
        const nativeResult =
          await module
            .startWidgetSleep(
              requestedStartAt
            );

        const nativeDate =
          parseWidgetSleepDate(
            nativeResult ??
            requestedStartAt
          );

        if (
          !Number.isNaN(
            nativeDate.getTime()
          )
        ) {
          actualStartAt =
            nativeDate
              .toISOString();
        }
      } else {
        /*
         * 새 development build 전
         * 기존 네이티브 모듈을 위한 임시 처리입니다.
         */
        await showSleepNotification();
      }

      setSleepStartAt(
        actualStartAt
      );

      await AsyncStorage.setItem(
        'daily_sleep_start_at_v1',
        actualStartAt
      );

      await AsyncStorage.removeItem(
        'daily_sleep_started_from_widget_v1'
      );

      /*
       * 과거 Expo 수면 알림이 남아 있다면
       * 제거합니다.
       */
      if (
        module?.startWidgetSleep
      ) {
        await cancelLegacyExpoSleepNotifications();
      }

      await safeSyncDailyData();

      await syncRootWidgetData();
    } catch (error) {
      console.log(
        'SLEEP START ERROR',
        error
      );
    }
  };

  const handleFinishSleep =
  async () => {
    const module =
      NativeModules
        .RootWidgetModule;

    const nativeStartAt =
      module
        ?.getWidgetSleepStartAt
        ? await module
            .getWidgetSleepStartAt()
        : null;

    /*
     * 공통 네이티브 시작 시간을
     * 가장 먼저 사용합니다.
     */
    const savedStartAt =
      nativeStartAt ??
      sleepStartAt ??
      (
        await AsyncStorage.getItem(
          'daily_sleep_start_at_v1'
        )
      );

    if (!savedStartAt) {
      return;
    }
   const start =
  parseWidgetSleepDate(
    savedStartAt
  );

const end =
  new Date();

if (
  Number.isNaN(
    start.getTime()
  )
) {
  console.log(
    'SLEEP FINISH INVALID START DATE',
    savedStartAt
  );

  return;
}

const sleepMinutes =
  Math.max(
    0,
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
      60000
    )
  );
    const sleepDateKey =
  getSleepDayKey(end);

const recordDateKey =
  formatDateKey(end);

const newSleepSession:
  SleepSession = {
  bedTime:
    `${String(
      start.getHours()
    ).padStart(
      2,
      '0'
    )}:${String(
      start.getMinutes()
    ).padStart(
      2,
      '0'
    )}`,

  wakeTime:
    `${String(
      end.getHours()
    ).padStart(
      2,
      '0'
    )}:${String(
      end.getMinutes()
    ).padStart(
      2,
      '0'
    )}`,

  sleepMinutes,

  startAt:
    start.toISOString(),

  endAt:
    end.toISOString(),
};

const nextSleeps = {
  ...sleeps,

  [sleepDateKey]:
    mergeSleepRecord(
      sleeps[
        sleepDateKey
      ],
      newSleepSession
    ),
};
    await saveSleeps(nextSleeps);

    // 타임라인 셀 자동 수면 마크 채우기
    let cursor = new Date(start); const nextDayRecords = { ...(records[recordDateKey] ?? {}) };
    while (cursor < end) {
      const h24 = cursor.getHours(); const mStr = cursor.getMinutes() < 30 ? '00' : '30';
      const key = `${h24 < 12 ? '낮' : '저녁'}_${h24 % 12 === 0 ? 12 : h24 % 12}_${mStr}`;
      nextDayRecords[key] = '🌙 수면';
      cursor.setMinutes(cursor.getMinutes() < 30 ? 30 : 60);
    }
    await saveRecords({ ...records, [recordDateKey]: nextDayRecords });
    setSelectedDate(end); setSleepStartAt(null);
    await AsyncStorage.removeItem(
  'daily_sleep_start_at_v1'
);

await AsyncStorage.removeItem(
  'daily_sleep_started_from_widget_v1'
);

/*
 * 위젯과 하루 탭이 함께 사용하는
 * 네이티브 수면 상태를 종료합니다.
 */
if (
  module
    ?.stopWidgetSleepState
) {
  await module
    .stopWidgetSleepState();
} else {
  await module
    ?.cancelWidgetSleepNotification
    ?.();
}

/*
 * 이전 방식의 Expo 수면 알림도
 * 남아 있지 않도록 정리합니다.
 */
await cancelLegacyExpoSleepNotifications();

await safeSyncDailyData();

await syncRootWidgetData();
  };

  const handledSleepWidgetActionRef = useRef<string | null>(null);

useFocusEffect(
  useCallback(() => {
    if (
      params.sleepAction !== 'start' &&
      params.sleepAction !== 'finish'
    ) {
      return;
    }

    const key = `${params.sleepAction}_${params.widgetTs ?? ''}`;

    if (handledSleepWidgetActionRef.current === key) {
      return;
    }

    handledSleepWidgetActionRef.current = key;

    const runSleepAction = async () => {
      const currentSleepStartAt =
        sleepStartAt ??
        (await AsyncStorage.getItem(
          'daily_sleep_start_at_v1'
        ));

      if (params.sleepAction === 'start') {
        if (currentSleepStartAt) return;

        await handleStartSleep();
        return;
      }

      if (params.sleepAction === 'finish') {
        if (!currentSleepStartAt) return;

        await handleFinishSleep();
      }
    };

    runSleepAction();
  }, [params.sleepAction, params.widgetTs, sleepStartAt])
);

  useEffect(() => {
  if (!sleepStartAt) {
    setSleepSeconds(0);
    return;
  }

  const timer = setInterval(() => {
    const seconds = Math.floor(
      (Date.now() -
        new Date(sleepStartAt).getTime()) /
        1000
    );

    setSleepSeconds(seconds);
  }, 1000);

  return () => clearInterval(timer);
}, [sleepStartAt]);

  // 가계부 / 식단 요약 통계 계산
 
/*
 * 오늘의 가계부에는
 * 실제 현재 월을 표시합니다.
 */
const currentLedgerDate =
  new Date();

const currentLedgerMonthKey =
  formatMonthKey(
    currentLedgerDate
  );

const currentLedgerMonthItems =
  Object.entries(
    ledgers
  )
    .filter(([key]) =>
      key.startsWith(
        currentLedgerMonthKey
      )
    )
    .flatMap(
      ([, items]) =>
        items
    );

const currentMonthExpense =
  currentLedgerMonthItems
    .filter(
      isActiveLedgerExpense
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

const currentMonthBudget =
  ledgerBudgets[
    currentLedgerMonthKey
  ] ?? 0;
/*
 * 월 전체 남은 예산
 *
 * 이 값은 실제 월 지출에 따라
 * 변하는 것이 맞습니다.
 */
const currentMonthRemaining =
  currentMonthBudget -
  currentMonthExpense;

/*
 * 오늘 실제 지출
 */
const currentTodayExpense =
  (
    ledgers[
      todayKey
    ] ?? []
  )
    .filter(
      isActiveLedgerExpense
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

/*
 * 오늘 고정 배정 예산
 *
 * 월 예산이 바뀌지 않는 한
 * 돈을 사용해도 이 값은
 * 변하지 않습니다.
 */
const fixedTodayBudget =
  getFixedDailyBudget(
    currentMonthBudget,
    currentLedgerDate
  );

/*
 * 오늘 남은 예산
 *
 * 고정 배정 예산에서
 * 오늘 실제 지출만 차감합니다.
 */
const todayAvailableBudget =
  currentMonthBudget > 0
    ? fixedTodayBudget -
      currentTodayExpense
    : 0;

    const currentLedgerMonthLabel =
  `${
    currentLedgerDate.getMonth() +
    1
  }월`;

/*
 * 이번 주 날짜별 내역
 */
const currentWeekRange =
  getBudgetWeekRange(
    currentLedgerDate
  );

const currentWeekRows =
  (() => {
    const rows: Array<{
      date: Date;
      dateKey: string;
      items: LedgerItem[];
    }> = [];

    const cursor =
      new Date(
        currentWeekRange.start
      );

    while (
      cursor.getTime() <=
      currentWeekRange.end.getTime()
    ) {
      const rowDate =
        new Date(cursor);

      const rowDateKey =
        formatDateKey(
          rowDate
        );

      rows.push({
        date:
          rowDate,

        dateKey:
          rowDateKey,

        items:
          ledgers[
            rowDateKey
          ] ?? [],
      });

      cursor.setDate(
        cursor.getDate() + 1
      );
    }

    return rows;
  })();

const currentWeekItems =
  currentWeekRows.flatMap(
    (row) =>
      row.items
  );

  /*
 * 이번 주 내역에서 보여줄
 * 카테고리 목록
 */
const ledgerWeekCategoryOptions = [
  '전체',
  ...LEDGER_CATEGORIES,
];

/*
 * 선택한 카테고리만 남긴
 * 날짜별 주간 내역
 */
const filteredCurrentWeekRows =
  currentWeekRows
    .map((row) => ({
      ...row,

      items:
        ledgerWeekCategory ===
        '전체'
          ? row.items
          : row.items.filter(
              (item) =>
                item.category ===
                ledgerWeekCategory
            ),
    }))
    .filter(
      (row) =>
        row.items.length > 0
    );

const filteredCurrentWeekItems =
  filteredCurrentWeekRows.flatMap(
    (row) =>
      row.items
  );

const currentWeekExpense =
  currentWeekItems
    .filter(
      isActiveLedgerExpense
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

const currentWeekIncome =
  currentWeekItems
    .filter(
      (item) =>
        item.type ===
        'income'
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

/*
 * 이번 주 고정 배정 예산
 *
 * 이번 주에 포함되는 각 날짜의
 * 고정 일간 예산을 합산합니다.
 *
 * getBudgetWeekRange()에서
 * 현재 월에 포함되는 날짜만
 * currentWeekRows에 담고 있습니다.
 */
const fixedWeekBudget =
  currentWeekRows.reduce(
    (
      sum,
      row
    ) =>
      sum +
      getFixedDailyBudget(
        currentMonthBudget,
        row.date
      ),
    0
  );

/*
 * 이번 주 남은 예산
 *
 * 고정된 주간 배정 예산에서
 * 이번 주 실제 지출만 차감합니다.
 */
const weekAvailableBudget =
  currentMonthBudget > 0
    ? fixedWeekBudget -
      currentWeekExpense
    : 0;



/*
 * 날짜 상세 내역
 */
const ledgerDetailDayKey =
  formatDateKey(
    ledgerDetailDate
  );

const ledgerDetailDayItems =
  ledgers[
    ledgerDetailDayKey
  ] ?? [];

const ledgerDetailDayExpense =
  ledgerDetailDayItems
    .filter(
      isActiveLedgerExpense
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

const ledgerDetailDayIncome =
  ledgerDetailDayItems
    .filter(
      (item) =>
        item.type ===
        'income'
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

const isLedgerDetailToday =
  ledgerDetailDayKey ===
  todayKey;

 
  const todayMeals = meals[dateKey] ?? {};
  const totalMealCalories = Object.values(todayMeals).flat().reduce((s, i) => s + i.calories, 0);
  const totalMealPrice = Object.values(todayMeals).flat().reduce((s, i) => s + i.price, 0);
  const recommendedCalories = calculateRecommendedCalories(calorieProfile);
  const todayExerciseCalories = exerciseCalories[dateKey] ?? 0;
const ledgerMonthKey =
  `${calendarMonth.getFullYear()}-${String(
    calendarMonth.getMonth() + 1
  ).padStart(2, '0')}`;

const ledgerMonthItems =
  Object.entries(ledgers)
    .filter(([key]) =>
      key.startsWith(ledgerMonthKey)
    )
    .flatMap(([, items]) => items);

/*
 * 선택한 월의 총지출
 */
const ledgerMonthExpense =
  ledgerMonthItems
    .filter(
      isActiveLedgerExpense
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

/*
 * 선택한 월의 총수입
 */
const ledgerMonthIncome =
  ledgerMonthItems
    .filter(
      item =>
        item.type ===
          'income' &&
        !item.cancelled
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

/*
 * 월간 수지
 *
 * 양수: 수입이 더 많음
 * 음수: 지출이 더 많음
 */
const ledgerMonthNet =
  ledgerMonthIncome -
  ledgerMonthExpense;

/*
 * 선택한 월의 카테고리별
 * 지출 합계
 *
 * 금액이 큰 카테고리부터
 * 표시합니다.
 */
const ledgerMonthCategoryData:
  LedgerCategoryChartItem[] =
  LEDGER_CATEGORIES
    .map(
      (
        category,
        index
      ) => {
        const amount =
          ledgerMonthItems
            .filter(
              item =>
                isActiveLedgerExpense(
                  item
                ) &&
                item.category ===
                  category
            )
            .reduce(
              (
                sum,
                item
              ) =>
                sum +
                item.amount,
              0
            );

        return {
          category,
          amount,

          color:
            LEDGER_CHART_COLORS[
              index %
                LEDGER_CHART_COLORS.length
            ],
        };
      }
    )
    .filter(
      item =>
        item.amount >
        0
    )
    .sort(
      (
        a,
        b
      ) =>
        b.amount -
        a.amount
    );


/*
 * 선택한 월의 예산
 */
const ledgerMonthBudget =
  ledgerBudgets[
    ledgerMonthKey
  ] ?? 0;

const ledgerMonthRemaining =
  ledgerMonthBudget -
  ledgerMonthExpense;



  const selectedHourlyDate = selectedWeatherDate ?? todayKey;
const currentHour = new Date().getHours();

const hourlyWeatherItems =
  hourlyWeather?.time
    ?.map((time: string, index: number) => ({
      time,
      hour: Number(time.slice(11, 13)),
      temp: hourlyWeather.temperature_2m[index],
      code: hourlyWeather.weather_code[index],
      rain: hourlyWeather.precipitation_probability?.[index] ?? 0,
      humidity: hourlyWeather.relative_humidity_2m?.[index],
      wind: hourlyWeather.wind_speed_10m?.[index],
    }))
    .filter((item: any) => {
      const isSelectedDate =
        item.time.slice(0, 10) === selectedHourlyDate;

      if (!isSelectedDate) return false;

      if (selectedHourlyDate === todayKey) {
        return item.hour >= currentHour;
      }

      return true;
    }) ?? [];


const modalBoxTheme = {
  backgroundColor: theme.card,
  borderColor: theme.line,
  borderWidth: 1,
  borderRadius: isCityBlack ? 4 : 24,
};

const modalTitleTheme = {
  color: theme.text,
};

const modalInputTheme = {
  backgroundColor: theme.card2,
  borderColor: theme.line,
  color: theme.text,
  borderRadius: isCityBlack ? 4 : 12,
};

const modalConfirmButtonTheme = {
  backgroundColor: theme.button,
  borderColor: theme.strongLine,
  borderWidth: 1,
  borderRadius: isCityBlack ? 4 : 18,
};

const modalCancelButtonTheme = {
  backgroundColor: theme.card2,
  borderColor: theme.line,
  borderWidth: 1,
  borderRadius: isCityBlack ? 4 : 18,
};

const modalConfirmTextTheme = {
  color: theme.buttonText,
};

const modalCancelTextTheme = {
  color: theme.text,
};

const modalEmptyTextTheme = {
  color: theme.subText,
};

const outlineSurfaceTheme = {
  backgroundColor:
    'transparent',

  borderColor:
    theme.line,

  borderWidth:
    1,

  borderRadius:
    isCityBlack
      ? 4
      : 10,
};

const outlineSelectedSurfaceTheme = {
  ...outlineSurfaceTheme,

  borderColor:
    theme.strongLine,
};

const outlineInputTheme = {
  ...outlineSurfaceTheme,

  color:
    theme.text,
};

const renderLedgerDetailItem = (
  item: LedgerItem,
  targetDateKey: string
) => {
  return (
    <View
      key={item.id}
      style={[
        styles.ledgerDetailItem,
        {
          backgroundColor:
            theme.card2,

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
          styles.ledgerDetailCategoryInline,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={1}
      >
        {item.category}
      </Text>

      <View
  style={
    styles.ledgerDetailMemoBox
  }
>
  <Text
    style={[
      styles.ledgerDetailMemoInline,
      {
        color:
          item.cancelled
            ? theme.subText
            : theme.text,

        textDecorationLine:
          item.cancelled
            ? 'line-through'
            : 'none',
      },
    ]}
    numberOfLines={
      1
    }
    ellipsizeMode="tail"
  >
    {item.merchantName?.trim() ||
      item.memo?.trim() ||
      item.paymentMethod?.trim() ||
      '내역'}
  </Text>

  {item.autoSaved ===
    true && (
    <View
      style={[
        styles.ledgerAutoSavedBadge,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 3
              : 6,
        },
      ]}
    >
      <Text
        style={[
          styles.ledgerAutoSavedBadgeText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        자동 입력
      </Text>
    </View>
  )}

  {item.cancelled ===
    true && (
    <View
      style={[
        styles.ledgerCancelledBadge,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderRadius:
            isCityBlack
              ? 3
              : 6,
        },
      ]}
    >
      <Text
        style={[
          styles.ledgerCancelledBadgeText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        취소됨
      </Text>
    </View>
  )}
</View>

     <Text
  style={[
    styles.ledgerDetailAmount,
    {
      color:
        item.cancelled
          ? theme.subText
          : item.type ===
            'expense'
          ? theme.danger
          : '#2F7D5B',

      textDecorationLine:
        item.cancelled
          ? 'line-through'
          : 'none',
    },
  ]}
  numberOfLines={
    1
  }
>
  {item.type ===
  'expense'
    ? '-'
    : '+'}
  {formatMoney(
    item.amount
  )}
  원
</Text>

    <View
  style={
    styles.ledgerDetailActionBox
  }
>
  {item.cancelled ===
    true && (
    <Pressable
      hitSlop={
        8
      }
      onPress={() =>
  openCancellationRestoreModal(
    targetDateKey,
    item
  )
}
    >
      <Text
        style={[
          styles.ledgerRestoreText,
          {
            color:
              theme.text,
          },
        ]}
      >
        취소 복구
      </Text>
    </Pressable>
  )}

  {item.cancelled !==
    true && (
    <Pressable
      hitSlop={
        8
      }
      onPress={() =>
        handleOpenLedgerEdit(
          targetDateKey,
          item
        )
      }
    >
      <Text
        style={[
          styles.ledgerDetailEditText,
          {
            color:
              theme.text,
          },
        ]}
      >
        수정
      </Text>
    </Pressable>
  )}

  <Pressable
    hitSlop={
      8
    }
    onPress={() =>
      handleDeleteLedger(
        targetDateKey,
        item.id
      )
    }
  >
    <Text
      style={[
        styles.ledgerDetailDeleteText,
        {
          color:
            theme.danger,
        },
      ]}
    >
      삭제
    </Text>
  </Pressable>
</View>
    </View>
  );
};

  return (
    <View
    style={{
      flex: 1,
      backgroundColor: theme.background,
    }}
  >
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
    >
      <ScrollView
        ref={scrollRef}
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      >
         

          {/* 메인 콘텐츠 섹션 조합 */}
         
          
        <TodoCalendar
  calendarMonth={
    calendarMonth
  }
  selectedDate={
    selectedDate
  }
  todos={todos}
  onSelectDate={(day) => {
    /*
     * 누른 날짜를
     * 현재 선택 날짜로 변경합니다.
     */
    setSelectedDate(
      day
    );

    /*
     * 이전·다음 달 날짜를
     * 눌러도 해당 월로 이동합니다.
     */
    setCalendarMonth(
      new Date(
        day.getFullYear(),
        day.getMonth(),
        1
      )
    );

    /*
     * 날짜를 누른 뒤에만
     * 아래 할 일 영역을 표시합니다.
     */
    setShowSelectedTodoSection(
      true
    );
  }}
  onPrevMonth={() => {
    const previousMonth =
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() -
          1,
        1
      );

    setCalendarMonth(
      previousMonth
    );

    /*
     * 월을 이동하면 이전 날짜의
     * 할 일 영역은 숨깁니다.
     */
    setShowSelectedTodoSection(
      false
    );
  }}
  onNextMonth={() => {
    const nextMonth =
      new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() +
          1,
        1
      );

    setCalendarMonth(
      nextMonth
    );

    setShowSelectedTodoSection(
      false
    );
  }}
/>


<View
  style={[
    styles.weatherSection,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 0.5,

borderRadius:
  isCityBlack
    ? 4
    : 12,

paddingHorizontal: 14,
paddingVertical: 8,
    },
  ]}
>
 <View
  style={[
    styles.weatherSectionHeader,
    {
      paddingHorizontal:
        0,

      marginBottom:
        showWeather
          ? 10
          : 0,
    },
  ]}
>
  <Text
    style={[
      styles.sectionTitle,
      { color: theme.text },
    ]}
  >
    🌤️ 오늘의 날씨
  </Text>

    <Pressable
      onPress={async () => {
        const next = !showWeather;

        setShowWeather(next);

        await AsyncStorage.setItem(
          SHOW_WEATHER_KEY,
          String(next)
        );

        if (next) {
          await loadWeather();
        }

        safeSyncDailyData();
      }}
      style={[
  styles.toggleOuter,
  {
    backgroundColor: showWeather
      ? theme.button
      : theme.card2,
    borderColor: showWeather
      ? theme.strongLine
      : theme.line,
    borderWidth: 0.3,
    borderRadius: isCityBlack ? 4 : 999,
  },
]}
    >
      <View
        style={[
  styles.toggleInner,
  showWeather && styles.toggleInnerOn,
  {
    backgroundColor: showWeather
      ? theme.buttonText
      : theme.subText,
    borderRadius: isCityBlack ? 2 : 13,
  },
]}
      />
    </Pressable>
  </View>

  {showWeather && (
    <View
  style={[
    styles.weatherInnerBox,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 18,
    },
  ]}
>
      {weatherLoading ? (
        <Text
  style={[
    styles.weatherInfoText,
    { color: theme.subText },
  ]}
>
          날씨를 불러오는 중...
        </Text>
      ) : weather ? (
       <>
  {/* 위치 · 현재 기온 · 현재 날씨를 한 줄로 표시 */}
  <View style={styles.weatherCurrentLine}>
    <Text
      style={[
        styles.weatherCurrentLineText,
        {
          color: theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
    >
      📍 {weatherLocationName || '현재 위치'}
      {' · '}
      {Math.round(
        weather.temperature_2m
      )}
      °C
      {' · '}
      {
        getWeatherInfo(
          weather.weather_code
        ).icon
      }{' '}
      {
        getWeatherInfo(
          weather.weather_code
        ).label
      }
    </Text>
  </View>

  {/* 오늘부터 7일 날씨를 한 줄로 표시 */}
  {weeklyWeather && (
    <View style={styles.weatherWeekRow}>
      {weeklyWeather.time
        .slice(0, 7)
        .map(
          (
            date: string,
            index: number
          ) => {
            const info =
              getWeatherInfo(
                weeklyWeather
                  .weather_code[
                  index
                ]
              );

            const weekday =
              [
                '일',
                '월',
                '화',
                '수',
                '목',
                '금',
                '토',
              ][
                new Date(
                  `${date}T00:00:00`
                ).getDay()
              ];

            const maxTemp =
              Math.round(
                weeklyWeather
                  .temperature_2m_max[
                  index
                ]
              );

            const minTemp =
              Math.round(
                weeklyWeather
                  .temperature_2m_min[
                  index
                ]
              );

            return (
              <Pressable
                key={date}
                style={[
                  styles.weatherDayMiniCard,
                  {
                    backgroundColor:
                      theme.card,

                    borderColor:
                      index === 0
                        ? theme.strongLine
                        : theme.line,

                    borderWidth: 1,

                    borderRadius:
                      isCityBlack
                        ? 4
                        : 10,
                  },
                ]}
                onPress={() => {
                  setSelectedWeatherDate(
                    date
                  );

                  setShowHourlyWeatherModal(
                    true
                  );
                }}
              >
                <Text
                  style={[
                    styles.weatherDayDate,
                    {
                      color:
                        index === 0
                          ? theme.text
                          : theme.subText,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {index === 0
                    ? '오늘'
                    : weekday}
                </Text>

                <Text
                  style={
                    styles.weatherDayIcon
                  }
                >
                  {info.icon}
                </Text>

                <Text
                  style={[
                    styles.weatherDayTemp,
                    {
                      color: theme.text,
                    },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {maxTemp}°/{minTemp}°
                </Text>
              </Pressable>
            );
          }
        )}
    </View>
  )}
</>
      ) : (
        <>
          <Text
  style={[
    styles.weatherInfoText,
    { color: theme.subText },
  ]}
>
            위치 권한을 허용하면 날씨를 볼 수 있어요.
          </Text>

          <Pressable
  style={[
    styles.weatherHourButton,
    {
      backgroundColor: theme.button,
      borderColor: theme.strongLine,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 12,
    },
  ]}
  onPress={() => Linking.openSettings()}
>
  <Text
    style={[
      styles.weatherHourButtonText,
      { color: theme.buttonText },
    ]}
  >
    위치 권한 설정
  </Text>
</Pressable>
        </>
      )}
    </View>
  )}
</View>

<View
  style={[
    styles.timeGridSection,
    {
      marginHorizontal: 12,
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 0.5,

borderRadius:
  isCityBlack
    ? 4
    : 12,

paddingHorizontal: 14,
paddingVertical: 8,

    },
  ]}
>
  <View
  style={[
    styles.timeGridSectionHeader,
    {
      paddingHorizontal:
        0,

      marginBottom:
        showTimeGrid
          ? 10
          : 0,
    },
  ]}
>
  <Text
    style={[
      styles.sectionTitle,
      { color: theme.text },
    ]}
  >
    ⏰ 하루 기록표
  </Text>

    <Pressable
      onPress={async () => {
        const next = !showTimeGrid;

        setShowTimeGrid(next);

        await AsyncStorage.setItem(
          SHOW_TIME_GRID_KEY,
          String(next)
        );

        safeSyncDailyData();
      }}
      style={[
  styles.toggleOuter,
  {
    backgroundColor: showTimeGrid
      ? theme.button
      : theme.card2,
    borderColor: showTimeGrid
      ? theme.strongLine
      : theme.line,
    borderWidth: 0.3,
    borderRadius: isCityBlack ? 4 : 999,
  },
]}
    >
      <View
        style={[
  styles.toggleInner,
  showTimeGrid && styles.toggleInnerOn,
  {
    backgroundColor: showTimeGrid
      ? theme.buttonText
      : theme.subText,
    borderRadius: isCityBlack ? 2 : 13,
  },
]}
      />
    </Pressable>
  </View>

  {showTimeGrid && (
    <TimeGrid
      todayRecords={records[dateKey] ?? {}}
      onCellPress={handleCellOpen}
      recordColors={recordColors}
    />
  )}
</View>
 
<WaterSection
  waterEnabled={
    waterEnabled
  }
  setWaterEnabled={async (
    value
  ) => {
    setWaterEnabled(
      value
    );

    await AsyncStorage.setItem(
      WATER_ENABLED_KEY,
      String(value)
    );
  }}
  waterLogs={
    waterLogs
  }
  todayKey={
    todayKey
  }
  onAddWater={async (
    amount
  ) => {
    if (amount <= 0) {
      return;
    }

    const now =
      new Date();

    const next: WaterLog[] = [
      {
        id: now
          .getTime()
          .toString(),

        amount_ml:
          amount,

        log_date:
          todayKey,

        created_at:
          now.toISOString(),
      },
      ...waterLogs,
    ];

    await saveWaterLogs(
      next
    );
  }}
  onDeleteWater={async (
    id
  ) => {
    const next =
      waterLogs.filter(
        (log) =>
          String(log.id) !==
          String(id)
      );

    await saveWaterLogs(
      next
    );
  }}
/>
          
 {/*
<StepSection
  stepEnabled={stepEnabled}
  setStepEnabled={async (v) => {
  setStepEnabled(v);
  await AsyncStorage.setItem(STEP_ENABLED_KEY, String(v));
  safeSyncDailyData();
}}
  todaySteps={todaySteps}
  todayKey={todayKey}
  stepLogs={stepLogs}
  isPedometerAvailable={isPedometerAvailable}
/>
*/}

          <SleepSection
  showSleep={showSleep}
  setShowSleep={async (v) => {
    setShowSleep(v);
    await AsyncStorage.setItem(
      'daily_show_sleep_v1',
      JSON.stringify(v)
    );
  }}
  todaySleep={
  sleeps[
    currentSleepDayKey
  ]
}
  sleepRecords={sleeps}
  sleepStartAt={sleepStartAt}
  sleepSeconds={sleepSeconds}
  onStartSleep={handleStartSleep}
  onFinishSleep={handleFinishSleep}
/>
          
          <StorySection showStory={showStory} setShowStory={async (v) => { setShowStory(v); await AsyncStorage.setItem('daily_show_story_v1', JSON.stringify(v)); }} todayStory={stories[dateKey]} onWritePress={() => { setSelectedWeather('☀️'); setSelectedMood('😊'); setStoryInput(stories[dateKey]?.text ?? ''); setShowStoryModal(true); }} />
          
<View
  onLayout={event => {
    ledgerSectionYRef.current =
      event.nativeEvent.layout.y;
  }}
>
  <LedgerSection
    showLedger={
      showLedger
    }

    setShowLedger={async (
      value
    ) => {
      setShowLedger(
        value
      );

      await AsyncStorage.setItem(
        'daily_show_ledger_v1',
        JSON.stringify(
          value
        )
      );
    }}

    monthLabel={
      currentLedgerMonthLabel
    }

    monthBudget={
      currentMonthBudget
    }

    remainingBudget={
      currentMonthRemaining
    }

    monthExpense={
      currentMonthExpense
    }

    weekAvailable={
      weekAvailableBudget
    }

    weekExpense={
      currentWeekExpense
    }

    todayAvailable={
      todayAvailableBudget
    }

    todayExpense={
      currentTodayExpense
    }

    onBudgetPress={() =>
      openLedgerBudgetModal(
        new Date()
      )
    }

    onMonthPress={() => {
      setCalendarMonth(
        new Date()
      );

      setShowLedgerMonthModal(
        true
      );
    }}

    onWeekPress={() => {
      setLedgerDetailMode(
        'week'
      );

      setLedgerDetailDate(
        new Date()
      );

      setLedgerWeekCategory(
        '전체'
      );

      setShowLedgerDetailModal(
        true
      );
    }}

    onTodayPress={() => {
      setLedgerDetailMode(
        'day'
      );

      setLedgerDetailDate(
        new Date()
      );

      setShowLedgerDetailModal(
        true
      );
    }}

    onAddPress={() => {
      setEditingLedger(
        null
      );

      setLedgerType(
        'expense'
      );

      setLedgerCategory(
        '식비'
      );

      setLedgerMemo(
        ''
      );

      setLedgerAmount(
        ''
      );

      setShowLedgerModal(
        true
      );
    }}

    pendingFinancialNotifications={
      pendingFinancialNotifications
    }

    merchantCategoryHistory={
      merchantCategoryHistory
    }

    merchantAutoSaveRules={
      merchantAutoSaveRules
    }

    hasFinancialNotificationAccess={
      hasFinancialNotificationAccess
    }

    financialNotificationLoading={
      financialNotificationLoading
    }

    onRefreshFinancialNotifications={
      loadPendingFinancialNotifications
    }

    onDismissFinancialNotification={
      dismissPendingFinancialNotification
    }

    onFinancialNotificationAction={
      handleFinancialNotificationAction
    }

    onUndoFinancialNotificationSave={
      undoFinancialNotificationSave
    }

    onToggleMerchantAutoSave={
      toggleMerchantAutoSave
    }

    onOpenMerchantAutoSaveManagement={() =>
      setShowMerchantAutoSaveModal(
        true
      )
    }

    onOpenFinancialNotificationSettings={
      openCardNotificationSettings
    }
  />
</View>
          <MealSection
  showMeal={showMeal}
  setShowMeal={async (v) => {
    setShowMeal(v);
    await AsyncStorage.setItem(
      'daily_show_meal_v1',
      JSON.stringify(v)
    );
  }}
  todayMeals={todayMeals}
  totalCalories={totalMealCalories}
  totalPrice={totalMealPrice}
  onAddMealPress={(key) => {
  /*
   * 새 식단 추가이므로
   * 기존 수정 대상을 해제합니다.
   */
  setEditingMeal(
    null
  );

  setSelectedMealType(
    key
  );

  setMealName(
    ''
  );

  setMealMemo(
    ''
  );

  setMealPrice(
    ''
  );

  setMealCalories(
    ''
  );

  setMealImageUri(
    undefined
  );

  setShowMealModal(
    true
  );
}}

onEditMeal={
  handleOpenMealEdit
}

onDeleteMeal={
  handleDeleteMeal
}
  weightEnabled={weightEnabled}
  setWeightEnabled={async (v) => {
    setWeightEnabled(v);
    await AsyncStorage.setItem(
      WEIGHT_ENABLED_KEY,
      String(v)
    );
    safeSyncDailyData();
  }}
  weightLogs={weightLogs}
  todayKey={todayKey}
  onSaveWeight={saveWeightLogs}
  scrollRef={scrollRef}
  recommendedCalories={recommendedCalories}
exerciseCalories={todayExerciseCalories}
exerciseLogs={exerciseCalorieLogs.filter((log) => log.date === dateKey)}
onSettingPress={() => setShowCalorieModal(true)}
onAddExerciseCaloriesPress={() => setExerciseAddModal(true)}
calorieProfile={calorieProfile}
  
/>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* =========================================================================
          4. 공통 모달 오버레이 관리 (Modals)
         ========================================================================= */}
      {/* 타임그리드 타임라인 텍스트 입력 모달 */}
      
      {/* 선택 날짜의 할 일 팝업 */}
<Modal
  visible={
    showSelectedTodoSection
  }
  transparent
  animationType="fade"
  onRequestClose={() =>
    setShowSelectedTodoSection(
      false
    )
  }
>
  <View
    style={
      styles.modalOverlay
    }
  >
    <TodoSection
      selectedDate={
        selectedDate
      }
      selectedTodos={
        todos[
          dateKey
        ] ?? []
      }
      onToggle={
        handleToggleTodo
      }
      onDelete={
        handleDeleteTodo
      }
      onClose={() =>
        setShowSelectedTodoSection(
          false
        )
      }
      onAddPress={() => {
        setShowSelectedTodoSection(
          false
        );

        setTodoInput(
          ''
        );

        setShowTodoModal(
          true
        );
      }}
      onReminderPress={(
        todo
      ) => {
        setShowSelectedTodoSection(
          false
        );

        setReminderTodo(
          todo
        );

        if (
          todo.reminderAt
        ) {
          const reminderDate =
            new Date(
              todo.reminderAt
            );

          setReminderHour(
            reminderDate.getHours()
          );

          setReminderMinute(
            reminderDate.getMinutes()
          );
        } else {
          setReminderHour(
            9
          );

          setReminderMinute(
            0
          );
        }
      }}
    />
  </View>
</Modal>    
      
      
         <Modal visible={!!selectedCell} transparent animationType="fade">
        <View style={styles.modalOverlay}>
  <View
    style={[
      styles.modalBox,
      modalBoxTheme,
    ]}
  >
           <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>{selectedCell?.hour}:{selectedCell?.minute} {selectedCell?.period} — 활동 기록</Text>
  <TextInput
  value={
    inputText
  }
  onChangeText={
    setInputText
  }
  placeholder="활동 내용을 입력하세요"
  placeholderTextColor={
    theme.subText
  }
  style={[
    styles.modalInput,
    modalInputTheme,
    {
      /*
       * modalBoxTheme와 같은 색을 사용해서
       * 입력창과 팝업 배경을 통일합니다.
       */
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
  autoFocus
/>          
<View
  style={
    styles.activityRecordButtonRow
  }
>
  {/* 확인 */}
  <Pressable
    style={[
      styles.activityRecordButton,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 9,
      },
    ]}
    onPress={
      handleCellSave
    }
  >
    <Text
      style={[
        styles.activityRecordButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      확인
    </Text>
  </Pressable>

  {/* 색상 변경 */}
  {!isCityBlack && (
    <Pressable
      style={[
        styles.activityRecordButton,
        {
          backgroundColor:
            'transparent',

          borderColor:
            theme.strongLine,

          borderRadius: 9,
        },
      ]}
      onPress={() => {
        if (
          !inputText.trim()
        ) {
          return;
        }

        setShowColorPicker(
          true
        );
      }}
    >
      <Text
        style={[
          styles.activityRecordButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        색상변경
      </Text>
    </Pressable>
  )}

  {/* 취소 */}
  <Pressable
    style={[
      styles.activityRecordButton,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 9,
      },
    ]}
    onPress={() => {
      setSelectedCell(
        null
      );

      setInputText(
        ''
      );
    }}
  >
    <Text
      style={[
        styles.activityRecordButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      취소
    </Text>
  </Pressable>
</View>
          </View>
        </View>
      </Modal>

<Modal
  visible={showColorPicker}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
>
     <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>색상 선택</Text>

      <View style={styles.colorGrid}>
        {RECORD_COLORS.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.colorCircle,
              { backgroundColor: color },
              recordColors[inputText.trim()] === color &&
                styles.selectedColorCircle,
            ]}
            onPress={async () => {
              const cleanText = inputText.trim();

              await saveRecordColors({
                ...recordColors,
                [cleanText]: color,
              });

              setShowColorPicker(false);
            }}
          />
        ))}
      </View>

      <Pressable
  style={[
    styles.cancelButton,
    modalCancelButtonTheme,
  ]}
  onPress={() => setShowColorPicker(false)}
>
  <Text
    style={[
      styles.cancelText,
      modalCancelTextTheme,
    ]}
  >
    닫기
  </Text>
</Pressable>
    </View>
  </View>
</Modal>

      {/* 할 일 추가 멀티라인 모달 */}
    <Modal
  visible={
    showTodoModal
  }
  transparent
  animationType="fade"
  onRequestClose={() => {
    setShowTodoModal(
      false
    );

    setTodoInput(
      ''
    );

    setShowSelectedTodoSection(
      true
    );
  }}
>
        <View style={styles.modalOverlay}>
          <View
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
>
          <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>
  {isToday(
    selectedDate
  )
    ? '오늘의 할 일 추가'
    : `${
        selectedDate.getMonth() +
        1
      }월 ${
        selectedDate.getDate()
      }일 할 일 추가`}
</Text>
  <TextInput
  value={
    todoInput
  }
  onChangeText={
    setTodoInput
  }
  placeholder={
    '한 줄에 하나씩 입력하세요.\n엔터로 분리 시 각각 저장됩니다.'
  }
  placeholderTextColor={
    theme.subText
  }
  style={[
    styles.todoModalInput,
    modalInputTheme,
    {
      /*
       * 기존 modalInputTheme의
       * 입력창 배경색을 제거합니다.
       */
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      color:
        theme.text,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
  multiline
  textAlignVertical="top"
  autoFocus
/>
            <View
  style={
    styles.todoModalButtonRow
  }
>
  {/* 저장 */}
  <Pressable
    style={[
      styles.todoModalButton,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={
      handleAddTodo
    }
  >
    <Text
      style={[
        styles.todoModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      저장
    </Text>
  </Pressable>

  {/* 취소 */}
  <Pressable
    style={[
      styles.todoModalButton,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={() => {
      setShowTodoModal(
        false
      );

      setTodoInput(
        ''
      );

      setShowSelectedTodoSection(
        true
      );
    }}
  >
    <Text
      style={[
        styles.todoModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      취소
    </Text>
  </Pressable>
</View>
          </View>
        </View>
      </Modal>

<Modal visible={reminderTodo !== null} transparent animationType="fade">
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
>
      <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>
        할일 알림 설정
      </Text>

      <Text
  style={[
    styles.emptyText,
    modalEmptyTextTheme,
  ]}
>
        {reminderTodo?.text}
      </Text>

      <View style={styles.reminderPickerRow}>
  <ScrollView
  style={[
    styles.reminderPicker,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderRadius:
        isCityBlack
          ? 4
          : 16,
    },
  ]}
  showsVerticalScrollIndicator={
    false
  }
>
    {Array.from({ length: 24 }).map((_, hour) => {
      const selected = reminderHour === hour;

      return (
        <Pressable
  key={
    hour
  }
  style={[
    styles.reminderPickerItem,

    {
      backgroundColor:
        'transparent',

      /*
       * 선택된 숫자만
       * 테두리로 표시합니다.
       */
      borderWidth: 1,

      borderColor:
        selected
          ? theme.strongLine
          : 'transparent',

      borderRadius:
        isCityBlack
          ? 4
          : 10,

      marginHorizontal:
        8,
    },
  ]}
  onPress={() =>
    setReminderHour(
      hour
    )
  }
>
  <Text
    style={[
      styles.reminderPickerText,
      {
        color:
          theme.text,

        fontWeight:
          selected
            ? '900'
            : '800',
      },
    ]}
  >
    {String(
      hour
    ).padStart(
      2,
      '0'
    )}
  </Text>
</Pressable>
      );
    })}
  </ScrollView>

  <Text
    style={[
      styles.reminderColon,
      { color: theme.text },
    ]}
  >
    :
  </Text>

  <ScrollView
    style={[
      styles.reminderPicker,
      {
        backgroundColor:
  'transparent',
        borderRadius: isCityBlack ? 4 : 16,
      },
    ]}
  >
    {Array.from({ length: 12 }).map((_, index) => {
      const minute = index * 5;
      const selected = reminderMinute === minute;

      return (
        <Pressable
  key={
    minute
  }
  style={[
    styles.reminderPickerItem,

    {
      backgroundColor:
        'transparent',

      borderWidth: 1,

      borderColor:
        selected
          ? theme.strongLine
          : 'transparent',

      borderRadius:
        isCityBlack
          ? 4
          : 10,

      marginHorizontal:
        8,
    },
  ]}
  onPress={() =>
    setReminderMinute(
      minute
    )
  }
>
  <Text
    style={[
      styles.reminderPickerText,
      {
        color:
          theme.text,

        fontWeight:
          selected
            ? '900'
            : '800',
      },
    ]}
  >
    {String(
      minute
    ).padStart(
      2,
      '0'
    )}
  </Text>
</Pressable>
      );
    })}
  </ScrollView>
</View>

      <View
  style={
    styles.reminderModalButtonRow
  }
>
  {/* 저장 */}
  <Pressable
    disabled={
      reminderHour ===
        null ||
      reminderMinute ===
        null
    }
    style={[
      styles.reminderModalButton,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },

      (
        reminderHour ===
          null ||
        reminderMinute ===
          null
      ) &&
        styles.disabledButton,
    ]}
    onPress={
      handleSaveTodoReminder
    }
  >
    <Text
      style={[
        styles.reminderModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      저장
    </Text>
  </Pressable>

  {/* 취소 */}
  <Pressable
    style={[
      styles.reminderModalButton,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={() => {
      setReminderTodo(
        null
      );

      /*
       * 알림창을 닫은 뒤
       * 할 일 목록 팝업으로
       * 돌아갑니다.
       */
      setShowSelectedTodoSection(
        true
      );
    }}
  >
    <Text
      style={[
        styles.reminderModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      취소
    </Text>
  </Pressable>
</View>
    </View>
  </View>
</Modal>


      {/* 다이어리 스토리 작성 전체화면 모달 */}
      <Modal
  visible={showStoryModal}
  animationType="slide"
>
  <ScrollView
    style={[
      styles.storyModalContainer,
      {
        backgroundColor:
          theme.background,
      },
    ]}
    contentContainerStyle={
      styles.storyModalContent
    }
    keyboardShouldPersistTaps="handled"
  >
    <Text
      style={[
        styles.storyDate,
        {
          color:
            theme.subText,
        },
      ]}
    >
      {formatKoreanDate(
        selectedDate
      )}
    </Text>

    {/* 제목 */}
    <Text
      style={[
        styles.storyBigTitle,
        {
          color:
            theme.text,
        },
      ]}
    >
      📖 일기
    </Text>

    {/* 날씨 */}
    <Text
      style={[
        styles.storyLabel,
        {
          color:
            theme.text,
        },
      ]}
    >
      오늘 날씨
    </Text>

    <View
      style={
        styles.storyEmojiGrid
      }
    >
      {[
        '☀️',
        '🌤️',
        '☁️',
        '🌧️',
        '⛈️',
        '❄️',
        '🌫️',
        '🌈',
      ].map((emoji) => {
        const selected =
          selectedWeather ===
          emoji;

        return (
          <Pressable
            key={emoji}
            style={
              styles.storyEmojiTouch
            }
            onPress={() =>
              setSelectedWeather(
                emoji
              )
            }
          >
            <Text
              style={[
                styles.storyEmojiText,

                selected &&
                  styles.storyEmojiTextSelected,
              ]}
            >
              {emoji}
            </Text>
          </Pressable>
        );
      })}
    </View>

    {/* 기분 */}
    <Text
      style={[
        styles.storyLabel,
        {
          color:
            theme.text,
        },
      ]}
    >
      오늘 기분
    </Text>

    <View
      style={
        styles.storyEmojiGrid
      }
    >
      {[
        '😄',
        '😊',
        '😳',
        '😔',
        '😭',
        '😴',
        '😱',
        '🥰',
      ].map((emoji) => {
        const selected =
          selectedMood ===
          emoji;

        return (
          <Pressable
            key={emoji}
            style={
              styles.storyEmojiTouch
            }
            onPress={() =>
              setSelectedMood(
                emoji
              )
            }
          >
            <Text
              style={[
                styles.storyEmojiText,

                selected &&
                  styles.storyEmojiTextSelected,
              ]}
            >
              {emoji}
            </Text>
          </Pressable>
        );
      })}
    </View>

    {/* 일기 입력 */}
    <TextInput
      multiline
      value={storyInput}
      onChangeText={
        setStoryInput
      }
      placeholder="일기쓰기"
      placeholderTextColor={
        theme.subText
      }
      style={[
        styles.storyInputSmall,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          color:
            theme.text,

          borderRadius:
            isCityBlack
              ? 4
              : 16,
        },
      ]}
      textAlignVertical="top"
    />

    {/* 저장·취소 한 줄 */}
    <View
      style={
        styles.storyModalButtonRow
      }
    >
      <Pressable
        style={[
          styles.storyModalActionButton,
          {
            backgroundColor:
              theme.card,

            borderColor:
              theme.strongLine,

            borderRadius:
              isCityBlack
                ? 4
                : 10,
          },
        ]}
        onPress={
          handleSaveStory
        }
      >
        <Text
          style={[
            styles.storyModalActionText,
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
          styles.storyModalActionButton,
          {
            backgroundColor:
              theme.card,

            borderColor:
              theme.strongLine,

            borderRadius:
              isCityBlack
                ? 4
                : 10,
          },
        ]}
        onPress={() => {
          setShowStoryModal(
            false
          );
        }}
      >
        <Text
          style={[
            styles.storyModalActionText,
            {
              color:
                theme.text,
            },
          ]}
        >
          취소
        </Text>
      </Pressable>
    </View>
  </ScrollView>
</Modal>

      {/* 가계부 내역 추가 모달 */}
      <Modal
  visible={showLedgerModal}
  transparent
  animationType="fade"
  onRequestClose={
    handleCloseLedgerModal
  }
>
  <View
  style={[
    styles.modalOverlay,
    styles.ledgerModalOverlay,
  ]}
>
  <View
    style={[
      styles.modalBox,
      modalBoxTheme,
      styles.ledgerModalBox,
    ]}
  >
      <Text
  style={[
    styles.ledgerModalTitle,
    {
      color:
        theme.text,
    },
  ]}
>
  {editingLedger
    ? '가계부 내역 수정'
    : '가계부 내역 추가'}
</Text>

{/* 지출·수입 선택 */}
<View
  style={
    styles.ledgerTypeRow
  }
>
  <Pressable
    onPress={() => {
      setLedgerType(
        'expense'
      );

      setLedgerCategory(
        '식비'
      );
    }}
    style={[
      styles.ledgerTypeButton,
      {
        backgroundColor:
          ledgerType ===
          'expense'
            ? theme.card2
            : theme.card,

        borderColor:
          theme.strongLine,

        borderWidth:
          ledgerType ===
          'expense'
            ? 1.5
            : 1,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
  >
    <Text
      style={[
        styles.ledgerTypeText,
        {
          color:
            theme.text,
        },
      ]}
    >
      지출
    </Text>
  </Pressable>

  <Pressable
    onPress={() => {
      setLedgerType(
        'income'
      );
    }}
    style={[
      styles.ledgerTypeButton,
      {
        backgroundColor:
          ledgerType ===
          'income'
            ? theme.card2
            : theme.card,

        borderColor:
          theme.strongLine,

        borderWidth:
          ledgerType ===
          'income'
            ? 1.5
            : 1,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
  >
    <Text
      style={[
        styles.ledgerTypeText,
        {
          color:
            theme.text,
        },
      ]}
    >
      수입
    </Text>
  </Pressable>
</View>
      

      {/* 지출일 때만 카테고리 표시 */}
{ledgerType ===
  'expense' && (
  <ScrollView
    horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.ledgerCategoryScroll}
        contentContainerStyle={
          styles.ledgerCategoryRow
        }
      >
        {LEDGER_CATEGORIES.map(
          (cat) => {
            const selected =
              ledgerCategory === cat;

            return (
              <Pressable
                key={cat}
                onPress={() =>
                  setLedgerCategory(cat)
                }
                style={[
                  styles.ledgerCategoryButton,
                  {
                    backgroundColor:
                      selected
                        ? theme.card2
                        : theme.card,

                    borderColor:
                      theme.strongLine,

                    borderRadius:
                      isCityBlack
                        ? 4
                        : 10,

                    borderWidth:
                      selected
                        ? 1.5
                        : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ledgerCategoryText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          }
        )}
      </ScrollView>
)}
      <TextInput
        value={ledgerMemo}
        onChangeText={setLedgerMemo}
        placeholder={
  ledgerType === 'income'
    ? '수입 내용 (선택)'
    : '지출 내용 (선택)'
}
        placeholderTextColor={
          theme.subText
        }
        style={[
  styles.modalInput,
  modalInputTheme,
  styles.ledgerModalInput,
]}
      />

      <TextInput
        value={ledgerAmount}
        onChangeText={(value) => {
          setLedgerAmount(
            value.replace(
              /[^0-9]/g,
              ''
            )
          );
        }}
        placeholder="금액 입력 (원)"
        placeholderTextColor={
          theme.subText
        }
        keyboardType="number-pad"
        style={[
  styles.modalInput,
  modalInputTheme,
  styles.ledgerModalInput,
  {
    marginTop: 8,
  },
]}
      />

      {/* 저장·취소 같은 색상 한 줄 */}
      <View
        style={
          styles.ledgerModalButtonRow
        }
      >
        <Pressable
          style={[
            styles.ledgerModalActionButton,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.strongLine,

              borderRadius:
                isCityBlack
                  ? 4
                  : 10,
            },
          ]}
          onPress={
            editingLedger
              ? handleUpdateLedger
              : handleAddLedger
          }
        >
          <Text
            style={[
              styles.ledgerModalActionText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {editingLedger
              ? '수정 완료'
              : '저장'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.ledgerModalActionButton,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.strongLine,

              borderRadius:
                isCityBlack
                  ? 4
                  : 10,
            },
          ]}
          onPress={
            handleCloseLedgerModal
          }
        >
          <Text
            style={[
              styles.ledgerModalActionText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            취소
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

   {/* 가계부 월별 달력 모달 */}
<Modal
  visible={
    showLedgerMonthModal
  }
  animationType="slide"
  onRequestClose={() =>
    setShowLedgerMonthModal(
      false
    )
  }
>
  <ScrollView
    style={[
      styles.monthModal,
      {
        backgroundColor:
          theme.background,
      },
    ]}
    contentContainerStyle={{
  paddingTop:
    Platform.OS === 'android'
      ? 18
      : 8,

  paddingBottom: 50,
}}
  >
    {/* 월 이동 */}
    <View
      style={
        styles.calendarHeader
      }
    >
      <Pressable
        onPress={() =>
          setCalendarMonth(
            new Date(
              calendarMonth.getFullYear(),
              calendarMonth.getMonth() - 1,
              1
            )
          )
        }
      >
        <Ionicons
          name="chevron-back"
          size={28}
          color={
            theme.text
          }
        />
      </Pressable>

      <Text
        style={[
          styles.calendarTitle,
          {
            color:
              theme.text,
          },
        ]}
      >
        {calendarMonth.getFullYear()}
        년{' '}
        {calendarMonth.getMonth() +
          1}
        월
      </Text>

      <Pressable
        onPress={() =>
          setCalendarMonth(
            new Date(
              calendarMonth.getFullYear(),
              calendarMonth.getMonth() + 1,
              1
            )
          )
        }
      >
        <Ionicons
          name="chevron-forward"
          size={28}
          color={
            theme.text
          }
        />
      </Pressable>

      <Pressable
        onPress={() =>
          setShowLedgerMonthModal(
            false
          )
        }
      >
        <Ionicons
          name="close"
          size={28}
          color={
            theme.text
          }
        />
      </Pressable>
    </View>

    {/* 월 예산 요약 */}
<Pressable
  style={[
    styles.ledgerMonthSummaryCard,
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
  onPress={() => {
    setShowLedgerMonthModal(
      false
    );

    openLedgerBudgetModal(
      calendarMonth
    );
  }}
>
  {/* 월간 예산 */}
  <View
    style={
      styles.ledgerMonthSummaryLine
    }
  >
    <Text
      style={[
        styles.ledgerMonthSummaryLabel,
        {
          color:
            theme.subText,
        },
      ]}
    >
      월간 예산
    </Text>

    <Text
      style={[
        styles.ledgerMonthSummaryValue,
        {
          color:
            theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {ledgerMonthBudget >
      0
        ? `${formatMoney(
            ledgerMonthBudget
          )}원`
        : '＋ 예산 입력'}
    </Text>
  </View>

  {/* 월 지출 */}
  <View
    style={[
      styles.ledgerMonthSummaryLine,
      styles.ledgerMonthSummaryDivider,
      {
        borderTopColor:
          theme.line,
      },
    ]}
  >
    <Text
      style={[
        styles.ledgerMonthSummaryLabel,
        {
          color:
            theme.subText,
        },
      ]}
    >
      {calendarMonth.getMonth() +
        1}
      월 지출
    </Text>

    <Text
      style={[
        styles.ledgerMonthSummaryValue,
        {
          color:
            ledgerMonthExpense >
            0
              ? theme.danger
              : theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {formatMoney(
        ledgerMonthExpense
      )}
      원
    </Text>
  </View>

  {/* 월 수입 */}
  <View
    style={[
      styles.ledgerMonthSummaryLine,
      styles.ledgerMonthSummaryDivider,
      {
        borderTopColor:
          theme.line,
      },
    ]}
  >
    <Text
      style={[
        styles.ledgerMonthSummaryLabel,
        {
          color:
            theme.subText,
        },
      ]}
    >
      {calendarMonth.getMonth() +
        1}
      월 수입
    </Text>

    <Text
      style={[
        styles.ledgerMonthSummaryValue,
        {
          color:
            ledgerMonthIncome >
            0
              ? '#2F7D5B'
              : theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {formatMoney(
        ledgerMonthIncome
      )}
      원
    </Text>
  </View>

  {/* 월간 수지 */}
  <View
    style={[
      styles.ledgerMonthSummaryLine,
      styles.ledgerMonthSummaryDivider,
      {
        borderTopColor:
          theme.line,
      },
    ]}
  >
    <Text
      style={[
        styles.ledgerMonthSummaryLabel,
        {
          color:
            theme.subText,
        },
      ]}
    >
      수입 - 지출
    </Text>

    <Text
      style={[
        styles.ledgerMonthSummaryValue,
        {
          color:
            ledgerMonthNet <
            0
              ? theme.danger
              : ledgerMonthNet >
                0
              ? '#2F7D5B'
              : theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {ledgerMonthNet >
      0
        ? '+'
        : ''}
      {formatMoney(
        ledgerMonthNet
      )}
      원
    </Text>
  </View>

  {/* 남은 예산 */}
  <View
    style={[
      styles.ledgerMonthSummaryLine,
      styles.ledgerMonthSummaryDivider,
      {
        borderTopColor:
          theme.line,
      },
    ]}
  >
    <Text
      style={[
        styles.ledgerMonthSummaryLabel,
        {
          color:
            theme.subText,
        },
      ]}
    >
      남은 예산
    </Text>

    <Text
      style={[
        styles.ledgerMonthSummaryValue,
        {
          color:
            ledgerMonthRemaining <
            0
              ? theme.danger
              : theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {ledgerMonthBudget >
      0
        ? `${formatMoney(
            ledgerMonthRemaining
          )}원`
        : '-'}
    </Text>
  </View>
</Pressable>


    {/* 요일 */}
    <View
      style={
        styles.ledgerCalendarWeekdayRow
      }
    >
      {[
        '일',
        '월',
        '화',
        '수',
        '목',
        '금',
        '토',
      ].map(
        (weekday) => (
          <Text
            key={
              weekday
            }
            style={[
              styles.ledgerCalendarWeekdayText,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {weekday}
          </Text>
        )
      )}
    </View>

{/* 날짜별 수입·지출 금액 */}
<View
  style={
    styles.calendarGrid
  }
>
  {getCalendarDays(
    calendarMonth
  ).map((day) => {
    const dayKey =
      formatDateKey(
        day
      );

    const isCurrentMonth =
      day.getFullYear() ===
        calendarMonth.getFullYear() &&
      day.getMonth() ===
        calendarMonth.getMonth();

    const isSelected =
      dayKey ===
      formatDateKey(
        ledgerDetailDate
      );

    const dayItems =
      ledgers[
        dayKey
      ] ?? [];

    const dayExpense =
  dayItems
    .filter(
      isActiveLedgerExpense
    )
    .reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.amount,
      0
    );

    const dayIncome =
      dayItems
        .filter(
          (item) =>
            item.type ===
            'income'
        )
        .reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.amount,
          0
        );

    return (
      <Pressable
        key={
          dayKey
        }
        disabled={
          !isCurrentMonth
        }
        style={[
          styles.calendarDay,
          styles.ledgerMonthCalendarDay,

          isSelected &&
            isCurrentMonth &&
            styles.selectedCalendarDay,

          {
            opacity:
              isCurrentMonth
                ? 1
                : 0.3,

            backgroundColor:
              isSelected &&
              isCurrentMonth
                ? theme.button
                : theme.card2,

            borderColor:
              isSelected &&
              isCurrentMonth
                ? theme.strongLine
                : theme.line,

            borderWidth: 1,

            borderRadius:
              isCityBlack
                ? 4
                : 8,
          },
        ]}
        onPress={() => {
          setLedgerDetailMode(
            'day'
          );

          setLedgerDetailDate(
            day
          );

          setShowLedgerDetailModal(
            true
          );
        }}
      >
        <Text
          style={[
            styles.calendarDayText,
            styles.ledgerMonthCalendarDateText,
            {
              color:
                isSelected &&
                isCurrentMonth
                  ? theme.buttonText
                  : theme.text,
            },
          ]}
        >
          {day.getDate()}
        </Text>

        <View
          style={
            styles.ledgerCalendarAmountBox
          }
        >
          {/* 수입 */}
          {isCurrentMonth &&
            dayIncome > 0 && (
              <Text
                style={[
                  styles.ledgerCalendarIncome,
                  {
                    color:
                      isSelected
                        ? theme.buttonText
                        : '#2F7D5B',
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={
                  0.55
                }
              >
                +{formatMoney(
  dayIncome
)}
원

              </Text>
            )}

          {/* 지출 */}
          {isCurrentMonth &&
            dayExpense > 0 && (
              <Text
                style={[
                  styles.ledgerCalendarExpense,
                  {
                    color:
                      isSelected
                        ? theme.buttonText
                        : theme.danger,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={
                  0.55
                }
              >
                -{formatMoney(
                  dayExpense
                )}
                원
              </Text>
            )}
        </View>
      </Pressable>
    );
  })}
</View>

{/* 카테고리별 지출 원그래프 */}
<LedgerCategoryDonut
  data={
    ledgerMonthCategoryData
  }
  theme={theme}
  isCityBlack={
    isCityBlack
  }
/>
</ScrollView>
</Modal>


{/* 가계부 날짜·주간 상세 모달 */}
<Modal
  visible={
    showLedgerDetailModal
  }
  transparent
  animationType="fade"
  onRequestClose={() =>
    setShowLedgerDetailModal(
      false
    )
  }
>
  <View
    style={
      styles.modalOverlay
    }
  >
    <View
      style={[
        styles.ledgerDetailModalBox,
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
      {/* 제목 */}
      <View
        style={
          styles.ledgerDetailHeader
        }
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={[
              styles.ledgerDetailTitle,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {ledgerDetailMode ===
            'week'
              ? '이번 주 사용 내역'
              : `${ledgerDetailDate.getMonth() +
                  1}월 ${ledgerDetailDate.getDate()}일 내역`}
          </Text>

          {ledgerDetailMode ===
            'week' && (
            <Text
              style={[
                styles.ledgerDetailDateRange,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {currentWeekRange.start.getMonth() +
                1}
              월{' '}
              {currentWeekRange.start.getDate()}
              일
              {' ~ '}
              {currentWeekRange.end.getMonth() +
                1}
              월{' '}
              {currentWeekRange.end.getDate()}
              일
            </Text>
          )}
        </View>

        <Pressable
          onPress={() =>
            setShowLedgerDetailModal(
              false
            )
          }
        >
          <Ionicons
            name="close"
            size={26}
            color={
              theme.text
            }
          />
        </Pressable>
      </View>

      {/* 주간 요약 */}
      {ledgerDetailMode ===
      'week' ? (
        <View
          style={
            styles.ledgerDetailSummaryRow
          }
        >
          <View
            style={[
              styles.ledgerDetailSummaryCard,
              {
                backgroundColor:
                  theme.card2,

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
              style={[
                styles.ledgerDetailSummaryLabel,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              이번 주 지출
            </Text>

            <Text
              style={[
                styles.ledgerDetailSummaryValue,
                {
                  color:
                    theme.danger,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatMoney(
                currentWeekExpense
              )}
              원
            </Text>
          </View>

          <View
            style={[
              styles.ledgerDetailSummaryCard,
              {
                backgroundColor:
                  theme.card2,

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
              style={[
                styles.ledgerDetailSummaryLabel,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              남은 예산
            </Text>

            <Text
              style={[
                styles.ledgerDetailSummaryValue,
{
  color:
    weekAvailableBudget < 0
      ? theme.danger
      : theme.text,
},
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {currentMonthBudget >
              0
                ? `${formatMoney(
                    weekAvailableBudget
                  )}원`
                : '-'}
            </Text>
          </View>
        </View>
      ) : (
        <>
          {isLedgerDetailToday &&
            currentMonthBudget >
              0 && (
              <View
                style={[
                  styles.ledgerDetailBudgetBanner,
                  {
                    backgroundColor:
                      theme.card2,

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
                  style={[
                    styles.ledgerDetailBudgetLabel,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  오늘 사용 남은 예산
                </Text>

                <Text
                  style={[
                    styles.ledgerDetailBudgetValue,
{
  color:
    todayAvailableBudget < 0
      ? theme.danger
      : theme.text,
},
                  ]}
                >
                  {formatMoney(
                    todayAvailableBudget
                  )}
                  원
                </Text>
              </View>
            )}

          <View
            style={
              styles.ledgerDetailSummaryRow
            }
          >
            <View
              style={[
                styles.ledgerDetailSummaryCard,
                {
                  backgroundColor:
                    theme.card2,

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
                style={[
                  styles.ledgerDetailSummaryLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                지출
              </Text>

              <Text
                style={[
                  styles.ledgerDetailSummaryValue,
                  {
                    color:
                      theme.danger,
                  },
                ]}
              >
                {formatMoney(
                  ledgerDetailDayExpense
                )}
                원
              </Text>
            </View>

            <View
              style={[
                styles.ledgerDetailSummaryCard,
                {
                  backgroundColor:
                    theme.card2,

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
                style={[
                  styles.ledgerDetailSummaryLabel,
                  {
                    color:
                      theme.subText,
                  },
                ]}
              >
                수입
              </Text>

              <Text
                style={[
                  styles.ledgerDetailSummaryValue,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                {formatMoney(
                  ledgerDetailDayIncome
                )}
                원
              </Text>
            </View>
          </View>
        </>
      )}

{/* 이번 주 카테고리 필터 */}
{ledgerDetailMode ===
  'week' &&
  currentWeekItems.length >
    0 && (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={
        false
      }
      style={
        styles.ledgerCategoryFilterScroll
      }
      contentContainerStyle={
        styles.ledgerCategoryFilterContent
      }
    >
      {ledgerWeekCategoryOptions.map(
        (category) => {
          const isSelected =
            ledgerWeekCategory ===
            category;

          const categoryCount =
            category === '전체'
              ? currentWeekItems.length
              : currentWeekItems.filter(
                  (item) =>
                    item.category ===
                    category
                ).length;

          /*
           * 이번 주에 없는 카테고리는
           * 버튼을 숨깁니다.
           */
          if (
            category !== '전체' &&
            categoryCount === 0
          ) {
            return null;
          }

          return (
            <Pressable
              key={category}
              onPress={() =>
                setLedgerWeekCategory(
                  category
                )
              }
              style={[
                styles.ledgerCategoryFilterButton,
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
                      : 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.ledgerCategoryFilterText,
                  {
                    color:
                      isSelected
                        ? theme.buttonText
                        : theme.text,
                  },
                ]}
              >
                {category}{' '}
                {categoryCount}
              </Text>
            </Pressable>
          );
        }
      )}
    </ScrollView>
  )}

      {/* 내역 목록 */}
      <ScrollView
        style={
          styles.ledgerDetailScroll
        }
        contentContainerStyle={{
          paddingBottom: 8,
        }}
        showsVerticalScrollIndicator={
          false
        }
      >
        {ledgerDetailMode ===
        'week' ? (
          filteredCurrentWeekItems.length ===
0 ? (
            <Text
              style={[
                styles.ledgerDetailEmpty,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              이번 주 등록된 내역이
              없습니다.
            </Text>
          ) : (
            filteredCurrentWeekRows.map(
              (row) => {
                if (
                  row.items.length ===
                  0
                ) {
                  return null;
                }

                return (
                  <View
                    key={
                      row.dateKey
                    }
                    style={
                      styles.ledgerDetailDateGroup
                    }
                  >
                    <Text
                      style={[
                        styles.ledgerDetailDateTitle,
                        {
                          color:
                            theme.text,
                        },
                      ]}
                    >
                      {row.date.getMonth() +
                        1}
                      월{' '}
                      {row.date.getDate()}
                      일
                    </Text>

                   {row.items.map(
  (item) =>
    renderLedgerDetailItem(
      item,
      row.dateKey
    )
)}
                  </View>
                );
              }
            )
          )
        ) : ledgerDetailDayItems.length ===
          0 ? (
          <Text
            style={[
              styles.ledgerDetailEmpty,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            등록된 내역이 없습니다.
          </Text>
        ) : (
          ledgerDetailDayItems.map(
  (item) =>
    renderLedgerDetailItem(
      item,
      ledgerDetailDayKey
    )
)
        )}
      </ScrollView>

      <Pressable
        style={[
          styles.ledgerDetailCloseButton,
          {
            backgroundColor:
              theme.card2,

            borderColor:
              theme.line,

            borderRadius:
              isCityBlack
                ? 4
                : 12,
          },
        ]}
        onPress={() =>
          setShowLedgerDetailModal(
            false
          )
        }
      >
        <Text
          style={[
            styles.ledgerDetailCloseText,
            {
              color:
                theme.text,
            },
          ]}
        >
          닫기
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>


{/* 월 예산 설정 모달 */}
<Modal
  visible={
    showLedgerBudgetModal
  }
  transparent
  animationType="fade"
  onRequestClose={() => {
    setShowLedgerBudgetModal(
      false
    );

    setIsEditingLedgerBudget(
      false
    );

    setLedgerBudgetInput(
      ''
    );
  }}
>
  <View
    style={
      styles.modalOverlay
    }
  >
    <View
      style={[
        styles.ledgerBudgetCompactModal,
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
      {/* 제목과 닫기 */}
      <View
        style={
          styles.ledgerBudgetCompactHeader
        }
      >
        <Text
          style={[
            styles.ledgerBudgetCompactTitle,
            {
              color:
                theme.text,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {
            ledgerBudgetTargetMonth.getFullYear()
          }
          년{' '}
          {
            ledgerBudgetTargetMonth.getMonth() +
            1
          }
          월 목표 예산
        </Text>

        <Pressable
          style={
            styles.ledgerBudgetCloseButton
          }
          hitSlop={8}
          onPress={() => {
            setShowLedgerBudgetModal(
              false
            );

            setIsEditingLedgerBudget(
              false
            );

            setLedgerBudgetInput(
              ''
            );
          }}
        >
          <Ionicons
            name="close"
            size={23}
            color={
              theme.text
            }
          />
        </Pressable>
      </View>

      {/*
       * 예산이 없거나 변경을 누른 상태:
       * 입력창 + 저장 버튼
       */}
      {ledgerBudgetTargetAmount <=
        0 ||
      isEditingLedgerBudget ? (
        <View
          style={
            styles.ledgerBudgetInputRow
          }
        >
          <TextInput
            value={
              ledgerBudgetInput
            }
            onChangeText={(
              value
            ) => {
              setLedgerBudgetInput(
                value.replace(
                  /[^0-9]/g,
                  ''
                )
              );
            }}
            keyboardType="number-pad"
            placeholder="이번 달에 사용할 수 있는 금액을 입력해 주세요."
            placeholderTextColor={
              theme.subText
            }
            style={[
              styles.ledgerBudgetCompactInput,
              {
                backgroundColor:
                  'transparent',

                borderColor:
                  theme.line,

                color:
                  theme.text,

                borderRadius:
                  isCityBlack
                    ? 4
                    : 10,
              },
            ]}
          />

          <Pressable
            style={[
              styles.ledgerBudgetCompactButton,
              {
                backgroundColor:
                  'transparent',

                borderColor:
                  theme.strongLine,

                borderRadius:
                  isCityBlack
                    ? 4
                    : 10,
              },
            ]}
            onPress={
              handleSaveLedgerBudget
            }
          >
            <Text
              style={[
                styles.ledgerBudgetCompactButtonText,
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
      ) : (
        /*
         * 예산이 저장된 상태:
         * 금액 + 변경 버튼
         */
        <View
          style={
            styles.ledgerBudgetSavedRow
          }
        >
          <Text
            style={[
              styles.ledgerBudgetSavedAmount,
              {
                color:
                  theme.text,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMoney(
              ledgerBudgetTargetAmount
            )}
            원
          </Text>

          <Pressable
            style={[
              styles.ledgerBudgetCompactButton,
              {
                backgroundColor:
                  'transparent',

                borderColor:
                  theme.strongLine,

                borderRadius:
                  isCityBlack
                    ? 4
                    : 10,
              },
            ]}
            onPress={() => {
              setLedgerBudgetInput(
                String(
                  ledgerBudgetTargetAmount
                )
              );

              setIsEditingLedgerBudget(
                true
              );
            }}
          >
            <Text
              style={[
                styles.ledgerBudgetCompactButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              변경
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  </View>
</Modal>

      {/* 기초대사량 및 권장 칼로리 설정 모달 */}
      <Modal visible={showCalorieModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
>
         <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>
   신체 프로필 및 운동 칼로리 설정
   </Text>
            <Pressable
  style={[
    styles.profileSelectBox,
styles.compactProfileSelectBox,
outlineSurfaceTheme,
  ]}
  onPress={() => {
    setNumberPickerTarget('height');
    setShowNumberPickerModal(true);
  }}
>
  <Text
    style={[
      styles.profileSelectText,
      { color: theme.text },
    ]}
  >
    키:{' '}
    {calorieProfile.height
      ? `${calorieProfile.height} cm`
      : '선택'}
  </Text>
</Pressable>

<View
  style={[
    styles.profileSelectBox,
    styles.compactProfileSelectBox,
    outlineSurfaceTheme,
  ]}
>
  <Text
    style={[
      styles.profileSelectText,
      {
        color:
          theme.text,
      },
    ]}
  >
    현재 체중:{' '}
    {calorieProfile.weight
      ? `${calorieProfile.weight} kg`
      : '체중 기록 없음'}
  </Text>
</View>

<Pressable
  style={[
    styles.profileSelectBox,
    styles.compactProfileSelectBox,
    outlineSurfaceTheme,
  ]}
  onPress={() => {
    setNumberPickerTarget(
      'age'
    );

    setShowNumberPickerModal(
      true
    );
  }}
>
  <Text
    style={[
      styles.profileSelectText,
      {
        color:
          theme.text,
      },
    ]}
  >
    나이:{' '}
    {calorieProfile.age
      ? `${calorieProfile.age} 세`
      : '선택'}
  </Text>
</Pressable>

<View
  style={
    styles.genderRow
  }
>
  {(
    [
      'male',
      'female',
    ] as const
  ).map((gender) => {
    const selected =
      calorieProfile.gender ===
      gender;

    return (
      <Pressable
        key={
          gender
        }
        onPress={() =>
          setCalorieProfile({
            ...calorieProfile,

            gender,
          })
        }
        style={[
          styles.genderButton,
          styles.compactGenderButton,

          selected
            ? outlineSelectedSurfaceTheme
            : outlineSurfaceTheme,
        ]}
      >
        <Text
          style={[
            styles.genderText,
            {
              color:
                theme.text,
            },
          ]}
        >
          {gender ===
          'male'
            ? '남자'
            : '여자'}
        </Text>
      </Pressable>
    );
  })}
</View>

<View
  style={
    styles.modalButtonRow
  }
>
<Pressable
  style={[
    styles.confirmButton,
    styles.compactModalButton,
    outlineSelectedSurfaceTheme,
  ]}
  onPress={async () => {
    await saveCalorieProfile(
      calorieProfile
    );

    setShowCalorieModal(
      false
    );
  }}
>
  <Text
    style={[
      styles.confirmText,
      styles.compactModalButtonText,
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
      styles.cancelButton,
      styles.compactModalButton,
      outlineSurfaceTheme,
    ]}
    onPress={() =>
      setShowCalorieModal(
        false
      )
    }
  >
    <Text
      style={[
        styles.cancelText,
        styles.compactModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      취소
    </Text>
  </Pressable>
</View>

          </View>
        </View>
      </Modal>

      {/* 프로필 입력 스크롤 피커 모달 */}
<Modal
  visible={showNumberPickerModal}
  transparent
  animationType="slide"
>
  <View style={styles.modalOverlay}>
    <View
      style={[
        styles.numberPickerBox,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderWidth: 1,
          borderRadius: isCityBlack ? 4 : 20,
        },
      ]}
    >
      <Text
        style={[
          styles.modalTitle,
          modalTitleTheme,
        ]}
      >
        {numberPickerTarget === 'height'
          ? '키 선택'
          : numberPickerTarget === 'weight'
          ? '체중 선택'
          : '나이 선택'}
      </Text>

      <ScrollView
  style={[
    styles.numberPickerScroll,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
>
        {(numberPickerTarget === 'height'
          ? Array.from({ length: 101 }).map(
              (_, i) => 120 + i
            )
          : numberPickerTarget === 'weight'
          ? Array.from({ length: 131 }).map(
              (_, i) => 30 + i
            )
          : Array.from({ length: 83 }).map(
              (_, i) => 10 + i
            )
        ).map((value) => (
          <Pressable
            key={value}
            style={[
              styles.numberPickerItem,
              {
                borderBottomColor: theme.line,
              },
            ]}
            onPress={() => {
              setCalorieProfile({
                ...calorieProfile,
                [numberPickerTarget]:
                  String(value),
              });

              setShowNumberPickerModal(false);
            }}
          >
            <Text
              style={[
                styles.numberPickerText,
                { color: theme.text },
              ]}
            >
              {value}
              {numberPickerTarget === 'height'
                ? ' cm'
                : numberPickerTarget === 'weight'
                ? ' kg'
                : ' 세'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
  style={[
    styles.numberPickerCloseButton,
    {
      height: 36,

      backgroundColor:
        'transparent',

      borderColor:
        theme.line,

      borderWidth:
        1,

      borderRadius:
        isCityBlack
          ? 4
          : 10,
    },
  ]}
  onPress={() =>
    setShowNumberPickerModal(
      false
    )
  }
>
  <Text
    style={[
      styles.cancelText,
      styles.compactModalButtonText,
      {
        color:
          theme.text,
      },
    ]}
  >
    닫기
  </Text>
</Pressable>
    </View>
  </View>
</Modal>

      {/* 식단 추가 모달 (카메라/사진 첨부 포함) */}
      <Modal
  visible={
    showMealModal
  }
  transparent
  animationType="slide"
  onRequestClose={
    handleCloseMealModal
  }
>
        <View style={styles.modalOverlay}>
          <View
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
             <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>
  {editingMeal
    ? '식단 기록 수정'
    : '식단 기록 추가'}
</Text>
              <Pressable
  onPress={
  handleCloseMealModal
}
  style={[
  styles.weatherModalCloseButton,
  styles.compactCloseButton,
  outlineSurfaceTheme,
]}
>
  <Text
    style={[
      styles.mealClose,
      { color: theme.text },
    ]}
  >
    ×
  </Text>
</Pressable>
            </View>
             <View style={styles.photoButtonRow}>
  <Pressable
    style={[
  styles.photoButton,
  styles.compactPhotoButton,
  outlineSurfaceTheme,
]}
    onPress={() => handlePickMealImage(true)}
  >
    <Text
      style={[
        styles.photoButtonText,
        { color: theme.text },
      ]}
    >
      📷 촬영
    </Text>
  </Pressable>

<Pressable
  style={[
    styles.photoButton,
    styles.compactPhotoButton,
    outlineSurfaceTheme,
  ]}
  onPress={() =>
    handlePickMealImage(
      false
    )
  }
>
  <Text
    style={[
      styles.photoButtonText,
      {
        color:
          theme.text,
      },
    ]}
  >
    🖼️ 갤러리
  </Text>
</Pressable>
</View>
           {mealImageUri && (
  <Image
    source={{ uri: mealImageUri }}
    style={[
      styles.mealPreviewImage,
      {
        borderColor: theme.line,
        borderWidth: 1,
        borderRadius: isCityBlack ? 4 : 14,
      },
    ]}
  />
)}
            <TextInput value={mealName} onChangeText={setMealName} placeholder="음식 이름 (예: 닭가슴살 샐러드)"
             placeholderTextColor={theme.subText}
             style={[
  styles.modalInput,
  styles.compactModalInput,
  outlineInputTheme,
]} />
 {/* 짧은 메모 */}
<TextInput
  value={
    mealMemo
  }
  onChangeText={
    setMealMemo
  }
  placeholder="짧은 메모 (선택)"
  placeholderTextColor={
    theme.subText
  }
  style={[
    styles.modalInput,
    styles.compactModalInput,
    outlineInputTheme,
    {
      marginTop: 8,
    },
  ]}
/>

{/* 가격과 칼로리 */}
<View
  style={
    styles.mealInputRow
  }
>
  <TextInput
    value={
      mealPrice
    }
    onChangeText={
      setMealPrice
    }
    placeholder="가격 (원)"
    placeholderTextColor={
      theme.subText
    }
    keyboardType="number-pad"
    style={[
      styles.modalInput,
      styles.compactModalInput,
      styles.mealHalfInput,
      outlineInputTheme,
    ]}
  />

  <TextInput
    value={
      mealCalories
    }
    onChangeText={
      setMealCalories
    }
    placeholder="칼로리 (kcal)"
    placeholderTextColor={
      theme.subText
    }
    keyboardType="number-pad"
    style={[
      styles.modalInput,
      styles.compactModalInput,
      styles.mealHalfInput,
      outlineInputTheme,
    ]}
  />
</View>

{/* 저장·취소 */}
<View
  style={
    styles.modalButtonRow
  }
>
  <Pressable
  style={[
    styles.confirmButton,
    styles.compactModalButton,
    outlineSelectedSurfaceTheme,

    mealSaving && {
      opacity:
        0.45,
    },
  ]}
  disabled={
    mealSaving
  }
  onPress={
  editingMeal
    ? handleUpdateMeal
    : handleAddMeal
}
>
    <Text
      style={[
        styles.confirmText,
        styles.compactModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      {mealSaving
  ? '저장 중.'
  : editingMeal
  ? '수정 완료'
  : '저장'}
    </Text>
  </Pressable>

  <Pressable
    style={[
      styles.cancelButton,
      styles.compactModalButton,
      outlineSurfaceTheme,
    ]}
    onPress={
  handleCloseMealModal
}
  >
    <Text
      style={[
        styles.cancelText,
        styles.compactModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      취소
    </Text>
  </Pressable>
</View>
          </View>
        </View>
      </Modal>
<Modal
  visible={exerciseAddModal}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
>
     <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>
  운동 소모 칼로리 추가
</Text>

<TextInput
  value={
    extraExerciseTitle
  }
  onChangeText={
    setExtraExerciseTitle
  }
  placeholder="운동명 예: 러닝, 헬스, 수영"
  placeholderTextColor={
    theme.subText
  }
  style={[
    styles.modalInput,
    styles.compactModalInput,
    outlineInputTheme,
  ]}
/>

<TextInput
  value={
    extraExerciseCalories
  }
  onChangeText={
    setExtraExerciseCalories
  }
  keyboardType="numeric"
  placeholder="소모 칼로리 예: 120"
  placeholderTextColor={
    theme.subText
  }
  style={[
    styles.modalInput,
    styles.compactModalInput,
    outlineInputTheme,
    {
      marginTop: 8,
    },
  ]}
/>

<View
  style={
    styles.modalButtonRow
  }
>
  <Pressable
    style={[
      styles.cancelButton,
      styles.compactModalButton,
      outlineSurfaceTheme,
    ]}
    onPress={() => {
      setExtraExerciseCalories(
        ''
      );

      setExtraExerciseTitle(
        ''
      );

      setExerciseAddModal(
        false
      );
    }}
  >
    <Text
      style={[
        styles.cancelText,
        styles.compactModalButtonText,
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
      styles.confirmButton,
      styles.compactModalButton,
      outlineSelectedSurfaceTheme,
    ]}
    onPress={
      addManualExerciseCalories
    }
  >
    <Text
      style={[
        styles.confirmText,
        styles.compactModalButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      추가
    </Text>
  </Pressable>
</View>
    </View>
  </View>
</Modal>

<Modal
  visible={exerciseLogModal}
  transparent
  animationType="fade"
>
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setExerciseLogModal(false)}
  >
    <Pressable
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
  onPress={(e) => e.stopPropagation()}
>
     <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>운동 소모 내역</Text>

      {exerciseCalorieLogs.filter((log) => log.date === dateKey).length === 0 ? (
        <Text
  style={[
    styles.emptyText,
    modalEmptyTextTheme,
  ]}
>
          오늘 운동 소모 내역이 없습니다.
        </Text>
      ) : (
        exerciseCalorieLogs
          .filter((log) => log.date === dateKey)
          .map((log) => (
  <Text
    key={log.id}
    style={[
      styles.emptyText,
      modalEmptyTextTheme,
    ]}
  >
    {log.title} - {log.calories} kcal
  </Text>
))
      )}

      <Pressable
  style={[
    styles.cancelButton,
    modalCancelButtonTheme,
  ]}
  onPress={() => setExerciseLogModal(false)}
>
  <Text
    style={[
      styles.cancelText,
      modalCancelTextTheme,
    ]}
  >
    닫기
  </Text>
</Pressable>
    </Pressable>
  </Pressable>
</Modal>

     
<Modal
  visible={showHourlyWeatherModal}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
>
      <View style={styles.weatherModalHeader}>
       <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>
          {selectedHourlyDate === todayKey
            ? '오늘 시간별 날씨'
            : `${selectedHourlyDate.slice(5)} 시간별 날씨`}
        </Text>

        <Pressable
  onPress={() => setShowHourlyWeatherModal(false)}
  style={[
    styles.weatherModalCloseButton,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 18,
    },
  ]}
>
  <Text
    style={[
      styles.weatherModalCloseText,
      { color: theme.text },
    ]}
  >
    ×
  </Text>
</Pressable>
      </View>

      {selectedHourlyDate === todayKey && (
  <Text
    style={[
      styles.weatherNowGuide,
      { color: theme.subText },
    ]}
  >
    현재 시간부터 보여드려요
  </Text>
)}

      <ScrollView
        style={styles.hourlyWeatherScroll}
        contentContainerStyle={styles.hourlyWeatherScrollContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {hourlyWeatherItems.length === 0 ? (
          <Text
  style={[
    styles.emptyText,
    modalEmptyTextTheme,
  ]}
>
            시간별 날씨 정보가 없습니다.
          </Text>
        ) : (
          hourlyWeatherItems.map((item: any, index: number) => {
            const info = getWeatherInfo(item.code);
            const isCurrentHour =
              selectedHourlyDate === todayKey &&
              item.hour === currentHour;

            return (
              <View
  key={item.time}
  style={[
    styles.hourlyWeatherRow,
    isCurrentHour &&
      styles.currentHourlyWeatherRow,
    {
      borderBottomColor: theme.line,
    },
    isCityBlack && {
      backgroundColor: isCurrentHour
        ? theme.button
        : theme.card2,
      borderColor: isCurrentHour
        ? theme.strongLine
        : theme.line,
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 10,
      marginBottom: 6,
    },
  ]}
>
  <Text
    style={[
      styles.hourlyWeatherTime,
      {
        color:
          isCityBlack && isCurrentHour
            ? theme.buttonText
            : theme.text,
      },
    ]}
  >
    {isCurrentHour
      ? `지금 ${item.time.slice(11, 16)}`
      : item.time.slice(11, 16)}
  </Text>

  <Text style={styles.hourlyWeatherIcon}>
    {info.icon}
  </Text>

  <Text
    style={[
      styles.hourlyWeatherText,
      {
        color:
          isCityBlack && isCurrentHour
            ? theme.buttonText
            : theme.subText,
      },
    ]}
  >
    {Math.round(item.temp)}°C · 비 {item.rain}%
  </Text>
</View>
            );
          })
        )}
      </ScrollView>

      <Pressable
  style={[
    styles.cancelButton,
    modalCancelButtonTheme,
  ]}
  onPress={() => setShowHourlyWeatherModal(false)}
>
  <Text
    style={[
      styles.cancelText,
      modalCancelTextTheme,
    ]}
  >
    닫기
  </Text>
</Pressable>
    </View>
  </View>
</Modal>

<Modal
  visible={
    showCancellationLinkModal
  }
  transparent
  animationType="fade"
  onRequestClose={() => {
    setShowCancellationLinkModal(
      false
    );

    setPendingCancellationItem(
      null
    );

    setCancellationLinkCandidates(
      []
    );
  }}
>
  <View
    style={
      styles.modalOverlay
    }
  >
    <View
      style={[
        styles.modalBox,
        modalBoxTheme,
      ]}
    >
      <Text
        style={[
          styles.modalTitle,
          modalTitleTheme,
        ]}
      >
        취소 내역 연결
      </Text>

      {pendingCancellationItem && (
        <View
          style={[
            styles.cancellationLinkSummary,
            {
              backgroundColor:
                theme.card2,

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
              styles.cancellationLinkSummaryLabel,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            취소 알림
          </Text>

          <Text
            style={[
              styles.cancellationLinkSummaryText,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {
              getFinancialMerchantProfile(
                pendingCancellationItem
              ).label
            }
            {' · '}
            {formatMoney(
              extractWonAmount(
                pendingCancellationItem
              )
            )}
            원
          </Text>
        </View>
      )}

      <Text
        style={[
          styles.cancellationLinkGuide,
          {
            color:
              theme.subText,
          },
        ]}
      >
        연결할 기존 결제를 선택하세요.
      </Text>

      <ScrollView
        style={
          styles.cancellationLinkList
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {cancellationLinkCandidates.map(
          candidate => {
            const ledgerItem =
              candidate
                .ledgerItem;

            return (
              <Pressable
  key={
    `${candidate.ledgerDateKey}_${ledgerItem.id}`
  }
  disabled={
    financialActionProcessing
  }
  style={[
                  styles.cancellationLinkItem,
                  {
                    backgroundColor:
                      'transparent',

                    borderColor:
                      theme.line,

                    borderRadius:
                      isCityBlack
                        ? 4
                        : 9,
                  },
                  financialActionProcessing && {
      opacity:
        0.45,
    },
                ]}
                onPress={() =>
                  handleManualCancellationLink(
                    candidate
                  )
                }
              >
                <View
                  style={
                    styles.cancellationLinkItemTextBox
                  }
                >
                  <Text
                    style={[
                      styles.cancellationLinkItemTitle,
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
                      ledgerItem
                        .merchantName ??
                      ledgerItem
                        .memo ??
                      ledgerItem
                        .paymentMethod ??
                      '결제처 미확인'
                    }
                  </Text>

                  <Text
                    style={[
                      styles.cancellationLinkItemDate,
                      {
                        color:
                          theme.subText,
                      },
                    ]}
                  >
                    {
                      candidate
                        .ledgerDateKey
                    }
                    {' · '}
                    {
                      ledgerItem
                        .category
                    }
                  </Text>
                </View>

                <Text
                  style={[
                    styles.cancellationLinkItemAmount,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {formatMoney(
                    ledgerItem.amount
                  )}
                  원
                </Text>
              </Pressable>
            );
          }
        )}
      </ScrollView>

      <Pressable
        style={[
          styles.cancelButton,
          modalCancelButtonTheme,
        ]}
        onPress={() => {
          setShowCancellationLinkModal(
            false
          );

          setPendingCancellationItem(
            null
          );

          setCancellationLinkCandidates(
            []
          );
        }}
      >
        <Text
          style={[
            styles.cancelText,
            modalCancelTextTheme,
          ]}
        >
          닫기
        </Text>
      </Pressable>
    </View>
  </View>
</Modal>

<Modal
  visible={
    cancellationRestoreTarget !==
    null
  }
  transparent
  animationType="fade"
  onRequestClose={() =>
    setCancellationRestoreTarget(
      null
    )
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
        modalBoxTheme,
      ]}
    >
      <Text
        style={[
          styles.modalTitle,
          modalTitleTheme,
        ]}
      >
        취소 처리를 복구할까요?
      </Text>

      {cancellationRestoreTarget && (
        <View
          style={[
            styles.cancellationRestoreSummary,
            {
              backgroundColor:
                theme.card2,

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
              styles.cancellationRestoreMerchant,
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
              cancellationRestoreTarget
                .ledgerItem
                .merchantName ??
              cancellationRestoreTarget
                .ledgerItem
                .memo ??
              cancellationRestoreTarget
                .ledgerItem
                .paymentMethod ??
              '결제 내역'
            }
          </Text>

          <Text
            style={[
              styles.cancellationRestoreAmount,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {formatMoney(
              cancellationRestoreTarget
                .ledgerItem
                .amount
            )}
            원
          </Text>

          <Text
            style={[
              styles.cancellationRestoreDate,
              {
                color:
                  theme.subText,
              },
            ]}
          >
            {
              cancellationRestoreTarget
                .ledgerDateKey
            }
            {' · '}
            {
              cancellationRestoreTarget
                .ledgerItem
                .category
            }
          </Text>
        </View>
      )}

      <Text
        style={[
          styles.cancellationRestoreGuide,
          {
            color:
              theme.subText,
          },
        ]}
      >
        복구하면 이 금액이 지출 합계와
        예산 사용액에 다시 포함됩니다.
      </Text>

      <View
        style={
          styles.modalButtonRow
        }
      >
        <Pressable
          style={[
            styles.cancelButton,
            modalCancelButtonTheme,
          ]}
          onPress={() =>
            setCancellationRestoreTarget(
              null
            )
          }
        >
          <Text
            style={[
              styles.cancelText,
              modalCancelTextTheme,
            ]}
          >
            닫기
          </Text>
        </Pressable>

        <Pressable
  disabled={
    financialActionProcessing
  }
  style={[
    styles.confirmButton,
    outlineSelectedSurfaceTheme,
    financialActionProcessing && {
      opacity:
        0.45,
    },
  ]}
  onPress={() => {
    if (
      !cancellationRestoreTarget ||
      financialActionProcessing
    ) {
      return;
    }

    handleRestoreCancelledLedger(
      cancellationRestoreTarget
        .ledgerDateKey,

      cancellationRestoreTarget
        .ledgerItem
        .id
    );
  }}
>
  <Text
    style={[
      styles.confirmText,
      {
        color:
          theme.text,
      },
    ]}
  >
    {financialActionProcessing
  ? '복구 중...'
  : '복구'}
  </Text>
</Pressable>
      </View>
    </View>
  </View>
</Modal>

<Modal
  visible={noticeModal !== null}
  transparent
  animationType="fade"
>
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setNoticeModal(null)}
  >
    <Pressable
  style={[
    styles.modalBox,
    modalBoxTheme,
  ]}
  onPress={(e) => e.stopPropagation()}
>
      <Text
  style={[
    styles.modalTitle,
    modalTitleTheme,
  ]}
>
        {noticeModal?.title}
      </Text>

      <Text
  style={[
    styles.emptyText,
    modalEmptyTextTheme,
  ]}
>
        {noticeModal?.message}
      </Text>
    </Pressable>
  </Pressable>
</Modal>

    </View>
  );
}

// =========================================================================
// 5. 기능별 서브 컴포넌트 분리 (Sub-Components Breakdown)
// =========================================================================

/* A. 24시간 플래너 타임그리드 */
const RECORD_COLORS = [
  '#FFB3BA', // 분홍
  '#FFDFBA', // 살구
  '#FFFFBA', // 노랑
  '#BAFFC9', // 연두
  '#BAE1FF', // 하늘

  '#D4A5A5', // 로즈
  '#FFD3B6', // 오렌지
  '#FFF3B0', // 레몬
  '#B5EAD7', // 민트
  '#C7CEEA', // 라벤더

  '#F6C1C1', // 연분홍
  '#FAD6A5', // 황토
  '#F9F7A1', // 밝은 노랑
  '#A8E6CF', // 에메랄드
  '#A0D8EF', // 스카이

  '#E4C1F9', // 보라
  '#D0F4DE', // 연녹
  '#FCF6BD', // 크림
  '#FFCAD4', // 핑크
  '#BDE0FE', // 블루

  '#9BF6FF', // 청록
  '#CAFFBF', // 그린
  '#FDFFB6', // 옐로
  '#FFC6FF', // 마젠타
];

function getRecordColor(
  text: string,
  customColors: Record<string, string>
) {
  if (customColors[text]) {
    return customColors[text];
  }
  

  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  return RECORD_COLORS[Math.abs(hash) % RECORD_COLORS.length];
}
interface TimeGridProps {
  todayRecords: Record<string, string>;
  onCellPress: (
    hour: number,
    period: '낮' | '저녁',
    minute: '00' | '30'
  ) => void;
  recordColors: Record<string, string>;
}
function TimeGrid({
  todayRecords,
  onCellPress,
  recordColors,
}: TimeGridProps) {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';

  return (
    <View
  style={[
    styles.table,
    {
      marginTop: 0,
      marginHorizontal: 0,
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 16,
      overflow: 'hidden',
    },
  ]}
>
      <View
  style={[
    styles.headerRow,
    {
      backgroundColor:
        theme.card,
    },
  ]}
>
  <Text
  style={[
    styles.timeHeader,
    {
      color:
        theme.text,
    },
  ]}
>
  시간
</Text>

  <Text
    style={[
      styles.periodHeader,
      { color: theme.text },
    ]}
  >
    낮 (오전)
  </Text>

  <Text
    style={[
      styles.periodHeader,
      { color: theme.text },
    ]}
  >
    저녁 (오후)
  </Text>
</View>
      <View
  style={[
    styles.minuteRow,
    {
      backgroundColor: theme.card2,
    },
  ]}
>
  <Text
    style={[
      styles.minuteEmpty,
      { backgroundColor: theme.card2 },
    ]}
  />

  <Text
    style={[
      styles.minuteCell,
      { color: theme.subText },
    ]}
  >
    :00
  </Text>

  <Text
    style={[
      styles.minuteCell,
      { color: theme.subText },
    ]}
  >
    :30
  </Text>

  <Text
    style={[
      styles.minuteCell,
      { color: theme.subText },
    ]}
  >
    :00
  </Text>

  <Text
    style={[
      styles.minuteCell,
      { color: theme.subText },
    ]}
  >
    :30
  </Text>
</View>
      {HOURS.map((hour) => {
        const cells = [
          { key: `낮_${hour}_00`, period: '낮' as const, minute: '00' as const },
          { key: `낮_${hour}_30`, period: '낮' as const, minute: '30' as const },
          { key: `저녁_${hour}_00`, period: '저녁' as const, minute: '00' as const },
          { key: `저녁_${hour}_30`, period: '저녁' as const, minute: '30' as const },
        ];
        return (
         <View
  key={hour}
  style={[
    styles.row,
    {
      backgroundColor: theme.card,
    },
  ]}
>
  <View
    style={[
      styles.timeCell,
      {
        backgroundColor: theme.card2,
        borderColor: theme.line,
      },
    ]}
  >
    <Text
      style={[
        styles.timeText,
        { color: theme.text },
      ]}
    >
      {hour}
    </Text>
  </View>
            {cells.map((cell) => (
                          <Pressable
  key={cell.key}
  style={[
    styles.cell,
    {
      backgroundColor: todayRecords[cell.key]
        ? isCityBlack
          ? theme.button
          : getRecordColor(
              todayRecords[cell.key],
              recordColors
            )
        : theme.card,
      borderColor: todayRecords[cell.key]
        ? theme.strongLine
        : theme.line,
    },
  ]}
  onPress={() =>
    onCellPress(
      hour,
      cell.period,
      cell.minute
    )
  }
>
<Text
  style={[
    todayRecords[cell.key]
      ? styles.cellText
      : styles.plus,
    {
      color: todayRecords[cell.key]
        ? isCityBlack
          ? theme.buttonText
          : theme.text
        : theme.subText,
    },
  ]}
>
  {todayRecords[cell.key] || '＋'}
</Text>
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}

/* B. 오늘의 할 일 섹션 */
interface TodoSectionProps {
  selectedDate: Date;

  selectedTodos:
    Todo[];

  onToggle:
    (id: string) => void;

  onDelete:
    (id: string) => void;

  onAddPress:
    () => void;

  onReminderPress:
    (todo: Todo) => void;

  onClose:
    () => void;
}

function TodoCalendar({
  calendarMonth,
  selectedDate,
  todos,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: {
  calendarMonth: Date;
  selectedDate: Date;
  todos: Record<string, Todo[]>;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) { const { themeMode, theme } = useRootTheme(); const isCityBlack = themeMode === 'cityBlack'; const days = getCalendarDays(calendarMonth);
  const monthKey = `${calendarMonth.getFullYear()}년 ${calendarMonth.getMonth() + 1}월`;

  return (
    <View style={[ styles.todoCalendarBox, { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: isCityBlack ? 4 : 22, }, ]} >
      <View style={styles.todoCalendarHeader}>
        <Pressable onPress={onPrevMonth}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>

        <Text style={[ styles.todoCalendarTitle, { color: theme.text }, ]} > {monthKey} </Text>

        <Pressable onPress={onNextMonth}>
         <Ionicons name="chevron-forward" size={24} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.todoWeekRow}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => ( <Text key={day} style={[ styles.todoWeekText, { color: theme.subText }, ]} > {day} </Text> ))}
      </View>

      <View style={styles.todoCalendarGrid}>
        {days.map((day, index) => {
          const key = formatDateKey(day);
          const dayTodos = todos[key] ?? [];
          const isSelected = key === formatDateKey(selectedDate);
          const isTodayDate = key === formatDateKey(new Date());
          const isOtherMonth = day.getMonth() !== calendarMonth.getMonth();

          return (
           <Pressable
  key={index}
  style={[
    styles.todoCalendarDay,
    {
      /*
       * 선택해도 배경색은
       * 바꾸지 않습니다.
       */
      backgroundColor:
        'transparent',

      /*
       * 선택한 날짜만
       * 테두리가 보입니다.
       */
      borderColor:
        isSelected
          ? theme.strongLine
          : 'transparent',

      /*
       * 모든 날짜에 같은 두께를
       * 적용하고 색만 투명하게 해야
       * 선택 시 칸 크기가 움직이지 않습니다.
       */
      borderWidth: 2,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
  onPress={() =>
    onSelectDate(
      day
    )
  }
>
    <Text
  style={[
    styles.todoCalendarDayText,
    {
      color:
        isOtherMonth
          ? theme.subText
          : theme.text,

      opacity:
        isOtherMonth
          ? 0.4
          : 1,

      fontWeight:
        isTodayDate
          ? '900'
          : '600',
    },
  ]}
>
  {day.getDate()}
</Text>        

          {dayTodos
  .slice(
    0,
    2
  )
  .map(
    (todo) => (
      <Text
        key={
          todo.id
        }
        numberOfLines={
          1
        }
        ellipsizeMode="tail"
        style={[
          styles.todoCalendarTodoBadge,
          {
            color:
  todo.completed
    ? theme.subText
    : theme.text,

            textDecorationLine:
              todo.completed
                ? 'line-through'
                : 'none',

            opacity:
              todo.completed
                ? 0.55
                : 1,
          },
        ]}
      >
        {todo.text}
      </Text>
    )
  )}

              {dayTodos.length > 2 && (
                <Text
  style={[
    styles.todoCalendarMoreText,
    {
      color:
        theme.subText,
    },
  ]}
>
  +{dayTodos.length - 2}
</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TodoSection({
  selectedDate,
  selectedTodos,
  onToggle,
  onDelete,
  onAddPress,
  onReminderPress,
  onClose,
}: TodoSectionProps) {
  const {
    themeMode,
    theme,
  } = useRootTheme();

  const isCityBlack =
    themeMode ===
    'cityBlack';

  const selectedIsToday =
    formatDateKey(
      selectedDate
    ) ===
    formatDateKey(
      new Date()
    );

  const selectedTodoTitle =
    selectedIsToday
      ? '📝 오늘의 할 일'
      : `📝 ${
          selectedDate.getMonth() +
          1
        }월 ${
          selectedDate.getDate()
        }일 할 일`;

  const selectedTodoEmptyText =
    selectedIsToday
      ? '오늘의 할 일이 없습니다'
      : `${
          selectedDate.getMonth() +
          1
        }월 ${
          selectedDate.getDate()
        }일의 할 일이 없습니다`;

  return (
    <View
      style={[
        styles.todoSection,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderWidth: 1,

          borderRadius:
            isCityBlack
              ? 4
              : 22,

          padding: 16,
        },
      ]}
    >
      <View
  style={
    styles.sectionHeader
  }
>
  <Text
    style={[
      styles.sectionTitle,
      {
        color:
          theme.text,
      },
    ]}
    numberOfLines={1}
    adjustsFontSizeToFit
  >
    {selectedTodoTitle}
  </Text>

  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    }}
  >
    {/* 할 일 추가 */}
<Pressable
  style={[
    styles.todoPopupAddButton,
    {
      backgroundColor:
        'transparent',

      borderColor:
        theme.strongLine,

      borderRadius:
        isCityBlack
          ? 4
          : 8,
    },
  ]}
  onPress={
    onAddPress
  }
>
  <Text
    style={[
      styles.todoPopupAddButtonText,
      {
        color:
          theme.text,
      },
    ]}
  >
    ＋ 추가
  </Text>
</Pressable>

    {/* 팝업 닫기 */}
    <Pressable
      style={
        styles.todoPopupCloseButton
      }
      onPress={
        onClose
      }
      hitSlop={8}
    >
      <Ionicons
        name="close"
        size={25}
        color={
          theme.text
        }
      />
    </Pressable>
  </View>
</View>

<ScrollView
  style={
    styles.todoPopupList
  }
  contentContainerStyle={{
    paddingBottom: 2,
  }}
  showsVerticalScrollIndicator={
    false
  }
>
  {selectedTodos.length ===
  0 ? (
    <Text
      style={[
        styles.todoPopupEmptyText,
        {
          color:
            theme.subText,
        },
      ]}
    >
      {
        selectedTodoEmptyText
      }
    </Text>
  ) : (
    selectedTodos.map(
      (todo) => (
        <View
          key={
            todo.id
          }
          style={[
            styles.todoPopupRow,
            {
              borderBottomColor:
                theme.line,
            },
          ]}
        >
          {/* 완료 표시 */}
          <Pressable
            onPress={() =>
              onToggle(
                todo.id
              )
            }
            style={[
              styles.todoPopupCircle,
              {
                backgroundColor:
                  todo.completed
                    ? theme.button
                    : 'transparent',

                borderColor:
                  todo.completed
                    ? theme.strongLine
                    : theme.line,

                borderRadius:
                  isCityBlack
                    ? 3
                    : 999,
              },
            ]}
          >
            {todo.completed ? (
              <Text
                style={[
                  styles.todoPopupCheck,
                  {
                    color:
                      theme.buttonText,
                  },
                ]}
              >
                ✓
              </Text>
            ) : null}
          </Pressable>

          {/* 할 일 이름 */}
          <Text
            style={[
              styles.todoPopupText,
              {
                color:
                  todo.completed
                    ? theme.subText
                    : theme.text,

                textDecorationLine:
                  todo.completed
                    ? 'line-through'
                    : 'none',
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {todo.text}
          </Text>

          {/* 알림 */}
          <Pressable
            style={
              styles.todoPopupActionButton
            }
            onPress={() =>
              onReminderPress(
                todo
              )
            }
          >
            <Text
              style={[
                styles.todoPopupActionText,
                {
                  color:
                    theme.text,
                },
              ]}
              numberOfLines={1}
            >
              {todo.reminderAt
                ? `알림 ${formatReminderTime(
                    todo.reminderAt
                  )}`
                : '알림'}
            </Text>
          </Pressable>

          {/* 삭제 */}
          <Pressable
            style={
              styles.todoPopupActionButton
            }
            onPress={() =>
              onDelete(
                todo.id
              )
            }
          >
            <Text
              style={[
                styles.todoPopupActionText,
                {
                  color:
                    theme.danger,
                },
              ]}
            >
              삭제
            </Text>
          </Pressable>
        </View>
      )
    )
  )}
</ScrollView>
    </View>
  );
}

/* C. 수분 트래커 섹션 */
interface WaterSectionProps {
  waterEnabled: boolean;
  setWaterEnabled: (v: boolean) => void;
  waterLogs: WaterLog[];
  todayKey: string;
  onAddWater: (amt: number) => void;
  onDeleteWater: (id: string) => void;
}

function WaterSection({
  waterEnabled,
  setWaterEnabled,
  waterLogs,
  todayKey,
  onAddWater,
  onDeleteWater,
}: WaterSectionProps) {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';

  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const currentLogs = waterLogs.filter((l) => l.log_date === todayKey);
  const totalMl = currentLogs.reduce((s, l) => s + l.amount_ml, 0);
  const flowerCount = Math.min(10, Math.floor(totalMl / 200));

  return (
    <View
  style={[
    styles.waterSection,
    {
      backgroundColor: theme.card,
      borderColor: theme.line,
     borderWidth: 0.5,

borderRadius:
  isCityBlack
    ? 4
    : 12,

paddingHorizontal: 14,
paddingVertical: 8,

    },
  ]}
>
      <View
  style={{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
  }}
>
  <Text
    style={[
      styles.sectionTitle,
      { color: theme.text },
    ]}
  >
    💧 수분 섭취 트래커
  </Text>

        <Pressable
          onPress={() => setWaterEnabled(!waterEnabled)}
          style={[
  styles.toggleOuter,
  {
    backgroundColor: waterEnabled
      ? theme.button
      : theme.card2,
    borderColor: waterEnabled
      ? theme.strongLine
      : theme.line,
    borderWidth: 0.3,
    borderRadius: isCityBlack ? 4 : 999,
  },
]}
        >
          <View
            style={[
  styles.toggleInner,
  waterEnabled && styles.toggleInnerOn,
  {
    backgroundColor: waterEnabled
      ? theme.buttonText
      : theme.subText,
    borderRadius: isCityBlack ? 2 : 13,
  },
]}
          />
        </Pressable>
      </View>

      {waterEnabled && (
        <View
  style={[
    styles.waterCard,
    {
      backgroundColor: theme.card2,
      borderColor: theme.line,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 18,
    },
  ]}
>
<Text
  style={[
    styles.waterAmount,
    {
      color: theme.text,
    },
  ]}
>
  {totalMl}ml / {WATER_GOAL_ML}ml
</Text>

<View style={styles.waterFlowerRow}>
  {Array.from({
    length: 10,
  }).map((_, i) => (
    <Text
      key={i}
      style={[
        styles.waterFlower,

        i >= flowerCount &&
          styles.waterFlowerEmpty,
      ]}
    >
      {i < flowerCount
        ? [
            '🌸',
            '🌼',
            '🌺',
            '🌻',
            '💐',
          ][i % 5]
        : '🌱'}
    </Text>
  ))}
</View>

          {totalMl >= WATER_GOAL_ML && (
            <Text
  style={[
    styles.waterGoalBanner,
    {
      backgroundColor: isCityBlack
        ? theme.button
        : theme.card,
      color: isCityBlack
        ? theme.buttonText
        : theme.text,
      borderColor: theme.strongLine,
      borderWidth: 1,
      borderRadius: isCityBlack ? 4 : 12,
    },
  ]}
>
  🌟 오늘의 수분 목표 달성!
</Text>
          )}

         <View style={styles.waterButtonRow}>
  {/* +200ml */}
  <Pressable
    style={[
      styles.waterActionButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={() => {
      onAddWater(200);
    }}
  >
    <Text
      style={[
        styles.waterQuickText,
        {
          color: theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      +200ml
    </Text>
  </Pressable>

  {/* 직접 입력 */}
  <Pressable
    style={[
      styles.waterActionButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={() => {
      setShowCustom(
        !showCustom
      );

      setShowHistory(
        false
      );
    }}
  >
    <Text
      style={[
        styles.waterQuickText,
        {
          color: theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      직접 입력
    </Text>
  </Pressable>

  {/* 오늘 기록 보기 */}
  <Pressable
    style={[
      styles.waterActionButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={() => {
      setShowHistory(
        !showHistory
      );

      setShowCustom(
        false
      );
    }}
  >
    <Text
      style={[
        styles.waterQuickText,
        {
          color: theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {showHistory
        ? '기록 닫기'
        : '오늘 기록 보기'}
    </Text>
  </Pressable>
</View>
    {showCustom && (
  <View
    style={
      styles.waterCustomRow
    }
  >
    <TextInput
      value={
        customAmount
      }
      onChangeText={
        setCustomAmount
      }
      keyboardType="numeric"
      placeholder="예: 300"
      placeholderTextColor={
        theme.subText
      }
      style={[
        styles.waterInput,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          color:
            theme.text,

          borderRadius:
            isCityBlack
              ? 4
              : 9,
        },
      ]}
    />

    <Pressable
      style={[
        styles.waterAddButton,
        {
          /*
           * 버튼 배경 제거
           */
          backgroundColor:
            'transparent',

          borderColor:
            theme.strongLine,

          borderRadius:
            isCityBlack
              ? 4
              : 9,
        },
      ]}
      onPress={() => {
        const amount =
          Number(
            customAmount
          );

        if (
          !amount ||
          amount <= 0
        ) {
          return;
        }

        onAddWater(
          amount
        );

        setCustomAmount(
          ''
        );

        setShowCustom(
          false
        );
      }}
    >
      <Text
        style={[
          styles.waterAddText,
          {
            color:
              theme.text,
          },
        ]}
      >
        추가
      </Text>
    </Pressable>
  </View>
)}     
      
{showHistory && (
  <View
    style={
      styles.waterHistoryList
    }
  >
    {currentLogs.map(
      (log) => (
        <View
          key={
            log.id
          }
          style={[
            styles.waterHistoryItem,
            {
              backgroundColor:
                theme.card,

              borderColor:
                theme.line,

              borderRadius:
                isCityBlack
                  ? 4
                  : 8,
            },
          ]}
        >
          {/* 시간 - 수분량 */}
          <Text
            style={[
              styles.waterHistoryMainText,
              {
                color:
                  theme.text,
              },
            ]}
            numberOfLines={
              1
            }
          >
            {formatWaterLogTime(
              log
            )}{' '}
            -{' '}
            {log.amount_ml}
            ml
          </Text>

          {/* 삭제 */}
          <Pressable
            style={
              styles.waterHistoryDeleteButton
            }
            onPress={() =>
              onDeleteWater(
                log.id
              )
            }
          >
            <Text
              style={[
                styles.waterHistoryDeleteText,
                {
                  color:
                    theme.danger,
                },
              ]}
            >
              삭제
            </Text>
          </Pressable>
        </View>
      )
    )}
  </View>
)}
        </View>
      )}
    </View>
  );
}

/* D. 체중 변화 / 입력 */
type WeightViewMode = 'day' | 'week' | 'month';
type WeightChartItem = { key: string; label: string; weight: number | null };

interface WeightSectionProps {
  showChart: boolean;
  showInput: boolean;
  weightLogs: WeightLog[];
  todayKey: string;
  onSaveWeight: (logs: WeightLog[]) => void;
  onInputSaved: () => void;
  scrollRef: any;
}

function WeightSection({
  showChart,
  showInput,
  weightLogs,
  todayKey,
  onSaveWeight,
  onInputSaved,
  scrollRef,
}: WeightSectionProps) {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';
  const [inputWeight, setInputWeight] = useState('');
  const [viewMode, setViewMode] = useState<WeightViewMode>('day');

  if (!showChart && !showInput) return null;

  const logsAsc = [...weightLogs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const logsDesc = [...weightLogs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const latestLog = logsDesc[0];
  const prevLog = logsDesc[1];
  const todayLog = weightLogs.find((log) => log.log_date === todayKey);
  const diff = latestLog && prevLog
    ? Number((latestLog.weight - prevLog.weight).toFixed(1))
    : null;

  const baseDate = new Date(`${todayKey}T00:00:00`);
  const average = (logs: WeightLog[]) =>
    logs.length
      ? Number((logs.reduce((sum, log) => sum + log.weight, 0) / logs.length).toFixed(1))
      : null;

  const getMonday = (date: Date) => {
    const monday = new Date(date);
    const day = monday.getDay();
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
    return monday;
  };

  const dayItems: WeightChartItem[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - (6 - index));
    const key = formatDateKey(date);
    return {
      key,
      label: `${date.getMonth() + 1}.${date.getDate()}`,
      weight: logsAsc.find((log) => log.log_date === key)?.weight ?? null,
    };
  });

  const currentMonday = getMonday(baseDate);
  const weekItems: WeightChartItem[] = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() - 7 * (6 - index));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startKey = formatDateKey(start);
    const endKey = formatDateKey(end);
    const logs = logsAsc.filter((log) => log.log_date >= startKey && log.log_date <= endKey);
    return {
      key: startKey,
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      weight: average(logs),
    };
  });

  const monthItems: WeightChartItem[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - (5 - index), 1);
    const key = formatMonthKey(date);
    return {
      key,
      label: `${date.getMonth() + 1}월`,
      weight: average(logsAsc.filter((log) => log.log_date.startsWith(key))),
    };
  });

  const chartItems = viewMode === 'day' ? dayItems : viewMode === 'week' ? weekItems : monthItems;
  const values = chartItems.map((item) => item.weight).filter((value): value is number => value !== null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = Math.max(1, max - min);
  const chartMin = min - range * 0.2;
  const chartMax = max + range * 0.2;
  const width = 320;
  const height = 150;
  const left = 24;
  const top = 22;
  const bottom = 30;

  const points = chartItems.map((item, index) => {
    const x = left + (index / Math.max(chartItems.length - 1, 1)) * (width - left * 2);
    const y = item.weight === null
      ? null
      : top + ((chartMax - item.weight) / Math.max(chartMax - chartMin, 1)) * (height - top - bottom);
    return { ...item, x, y };
  });

  const linePoints = points
    .filter((item): item is typeof item & { y: number } => item.y !== null)
    .map((item) => `${item.x},${item.y}`)
    .join(' ');

  const saveWeight = () => {
    const value = Number(inputWeight);
    if (!Number.isFinite(value) || value <= 0) return;

    const next = todayLog
      ? weightLogs.map((log) => log.log_date === todayKey ? { ...log, weight: value } : log)
      : [{ id: Date.now().toString(), weight: value, log_date: todayKey }, ...weightLogs];

    onSaveWeight(next);
    setInputWeight('');
    onInputSaved();
  };

  return (
    <View style={styles.weightChangeWrap}>
      {showChart && (
        <View style={[styles.weightChangeCard, {
          backgroundColor: theme.card2,
          borderColor: theme.line,
          borderRadius: isCityBlack ? 4 : 16,
        }]}>
          <View style={styles.weightChangeHeader}>
            <Text style={[styles.weightChangeTitle, { color: theme.text }]}>체중 변화</Text>
            <View style={styles.weightChartModeRow}>
              {(['day', 'week', 'month'] as const).map((mode) => {
                const selected = viewMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.weightChartModeButton, {
                      backgroundColor: selected ? theme.button : theme.card,
                      borderColor: selected ? theme.strongLine : theme.line,
                      borderRadius: isCityBlack ? 4 : 8,
                    }]}
                    onPress={() => setViewMode(mode)}
                  >
                    <Text style={[styles.weightChartModeText, {
                      color: selected ? theme.buttonText : theme.text,
                    }]}>
                      {mode === 'day' ? '일' : mode === 'week' ? '주' : '월'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.weightLineChartBox, {
            backgroundColor: theme.card,
            borderColor: theme.line,
            borderRadius: isCityBlack ? 4 : 12,
          }]}>
            {values.length === 0 ? (
              <Text style={[styles.weightChartEmpty, { color: theme.subText }]}>이 기간의 체중 기록이 없습니다.</Text>
            ) : (
              <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
                <Polyline
                  points={linePoints}
                  fill="none"
                  stroke={theme.button}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {points.map((item) => (
                  <G key={item.key}>
                    {item.y !== null && (
                      <>
                        <Circle cx={item.x} cy={item.y} r={5} fill={theme.button} stroke={theme.card} strokeWidth={2} />
                        <SvgText
                          x={item.x}
                          y={Math.max(12, item.y - 9)}
                          fontSize={10}
                          fontWeight="800"
                          textAnchor="middle"
                          fill={theme.text}
                        >
                          {item.weight}
                        </SvgText>
                      </>
                    )}
                    <SvgText
                      x={item.x}
                      y={height - 8}
                      fontSize={9}
                      fontWeight="700"
                      textAnchor="middle"
                      fill={theme.subText}
                    >
                      {item.label}
                    </SvgText>
                  </G>
                ))}
              </Svg>
            )}
          </View>

          <View style={styles.weightChartSummaryRow}>
            <Text style={[styles.weightChartSummaryText, { color: theme.text }]}>최근 {latestLog ? `${latestLog.weight}kg` : '-'}</Text>
            <Text style={[styles.weightChartDiffText, {
              color: diff === null ? theme.subText : diff > 0 ? theme.danger : diff < 0 ? theme.button : theme.subText,
            }]}>
              {diff === null
                ? '비교 기록 없음'
                : diff > 0
                ? `지난 기록 대비 +${diff}kg`
                : diff < 0
                ? `지난 기록 대비 ${diff}kg`
                : '지난 기록과 동일'}
            </Text>
          </View>
        </View>
      )}

      {showInput && (
        <View style={[styles.weightInputCard, {
          backgroundColor: theme.card2,
          borderColor: theme.line,
          borderRadius: isCityBlack ? 4 : 16,
        }]}>
          <Text style={[styles.weightInputTitle, { color: theme.text }]}>오늘 체중 입력</Text>
          <View style={styles.weightInputInlineRow}>
            <TextInput
              value={inputWeight}
              onChangeText={setInputWeight}
              keyboardType="decimal-pad"
              placeholder={todayLog ? `${todayLog.weight}kg 기록됨` : '예: 75.0'}
              placeholderTextColor={theme.subText}
              style={[styles.weightInlineInput, {
                backgroundColor: theme.card,
                borderColor: theme.line,
                color: theme.text,
                borderRadius: isCityBlack ? 4 : 10,
              }]}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd(), 300)}
            />
            <Pressable
              style={[styles.weightInlineSaveButton, {
                backgroundColor: theme.button,
                borderColor: theme.strongLine,
                borderRadius: isCityBlack ? 4 : 10,
              }]}
              onPress={saveWeight}
            >
              <Text style={[styles.weightInlineSaveText, { color: theme.buttonText }]}>{todayLog ? '수정' : '저장'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}


interface StepSectionProps {
  stepEnabled: boolean;
  setStepEnabled: (v: boolean) => void;
  todaySteps: number;
  todayKey: string;
  stepLogs: StepLog[];
  isPedometerAvailable: boolean;
}

function StepSection({
  stepEnabled,
  setStepEnabled,
  todaySteps,
  todayKey,
  stepLogs,
  isPedometerAvailable,
}: StepSectionProps) {
  const todayLog = stepLogs.find((l) => l.log_date === todayKey);
  const steps = todayLog?.steps ?? todaySteps;
  const points = Math.floor(steps / STEP_POINT_PER);
  const remainRaw = steps % STEP_POINT_PER;
const nextRemain = remainRaw === 0 ? 0 : STEP_POINT_PER - remainRaw;

  return (
    <View style={styles.waterSection}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
        <Text style={styles.sectionTitle}>👟 걸음수 기록</Text>
        <Pressable
          onPress={() => setStepEnabled(!stepEnabled)}
          style={[styles.toggleOuter, stepEnabled && styles.toggleOuterOn]}
        >
          <View style={[styles.toggleInner, stepEnabled && styles.toggleInnerOn]} />
        </Pressable>
      </View>

      {stepEnabled && (
        <View style={styles.stepCard}>
          {!isPedometerAvailable ? (
            <Text style={styles.emptyText}>이 기기에서는 걸음수 센서를 사용할 수 없습니다.</Text>
          ) : (
            <>
              <Text style={styles.stepMainText}>{steps.toLocaleString('ko-KR')} 걸음</Text>
              <Text style={styles.stepPointText}>획득 포인트: {points}P</Text>
              <Text style={styles.stepSubText}>
  다음 포인트까지 {nextRemain.toLocaleString('ko-KR')} 걸음
</Text>

              <View style={styles.stepProgressOuter}>
                <View
                  style={[
                    styles.stepProgressInner,
                    { width: `${Math.min(100, (steps % STEP_POINT_PER) / 10)}%` },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

/* E. 수면 플래너 섹션 */
interface SleepSectionProps {
  showSleep: boolean;

  setShowSleep: (
    value: boolean
  ) => void;

  todaySleep?: SleepRecord;

  /*
   * 날짜별 전체 수면 기록
   */
  sleepRecords: Record<
    string,
    SleepRecord
  >;

  sleepStartAt: string | null;
  sleepSeconds: number;

  onStartSleep: () => void;
  onFinishSleep: () => void;
}

function SleepSection({
  showSleep,
  setShowSleep,
  sleepSeconds,
  todaySleep,
  sleepRecords,
  sleepStartAt,
  onStartSleep,
  onFinishSleep,
}: SleepSectionProps) {
  const { themeMode, theme } =
    useRootTheme();

  const isCityBlack =
    themeMode === 'cityBlack';

  const [
    showSleepHistory,
    setShowSleepHistory,
  ] = useState(false);

 /*
 * 현재 수면일도
 * 낮 12시를 기준으로 계산합니다.
 */
const currentSleepKey =
  getSleepDayKey(
    new Date()
  );

/*
 * YYYY-MM-DD를 로컬 날짜로
 * 안전하게 변환합니다.
 */
const sleepHistoryEndDate =
  new Date(
    `${currentSleepKey}T12:00:00`
  );

const sleepHistoryStartDate =
  new Date(
    sleepHistoryEndDate
  );

sleepHistoryStartDate.setDate(
  sleepHistoryStartDate.getDate() -
    6
);

const sleepHistoryStartKey =
  formatDateKey(
    sleepHistoryStartDate
  );

const sleepHistoryEndKey =
  formatDateKey(
    sleepHistoryEndDate
  );

/*
 * 오늘을 포함한 최근 7일의
 * 수면 기록만 최신순으로 표시합니다.
 */
const recentSevenDaySleepRecords =
  Object.entries(
    sleepRecords
  )
    .filter(
      ([sleepDate]) =>
        sleepDate >=
          sleepHistoryStartKey &&
        sleepDate <=
          sleepHistoryEndKey
    )
    .sort(
      ([dateA], [dateB]) =>
        dateB.localeCompare(
          dateA
        )
    );

  return (
    <View
      style={[
        styles.sleepSection,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderWidth: 0.5,

borderRadius:
  isCityBlack
    ? 4
    : 12,

paddingHorizontal: 14,
paddingVertical: 8,

        },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          🌙 오늘의 수면
        </Text>

        <Pressable
          onPress={() => setShowSleep(!showSleep)}
          style={[
            styles.toggleOuter,
            {
              backgroundColor: showSleep
                ? theme.button
                : theme.card2,
              borderColor: showSleep
                ? theme.strongLine
                : theme.line,
              borderWidth: 0.3,
              borderRadius: isCityBlack ? 4 : 999,
            },
          ]}
        >
          <View
            style={[
              styles.toggleInner,
              showSleep && styles.toggleInnerOn,
              {
                backgroundColor: showSleep
                  ? theme.buttonText
                  : theme.subText,
                borderRadius: isCityBlack ? 2 : 13,
              },
            ]}
          />
        </Pressable>
      </View>

      {showSleep && (
        <View
          style={[
            styles.sleepCard,
            {
              backgroundColor: theme.card2,
              borderColor: theme.line,
              borderWidth: 1,
              borderRadius: isCityBlack ? 4 : 18,
            },
          ]}
        >
         {/* 오늘 수면 기록 한 줄 */}
{todaySleep ? (
  <Text
    style={[
      styles.sleepSummaryText,
      {
        color:
          theme.text,
      },
    ]}
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={
      0.65
    }
  >
    오늘 총 수면{' '}
{getSleepRecordSummary(
  todaySleep
)}
  </Text>
) : (
  <Text
    style={[
      styles.sleepSummaryText,
      {
        color:
          theme.subText,
      },
    ]}
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={
      0.72
    }
  >
    오늘 수면 0시간 0분
    {' · '}
    기록 없음
  </Text>
)}

{/* 현재 수면 기록 중 */}
{sleepStartAt && (
  <Text
    style={[
      styles.sleepRunningLine,
      {
        color: theme.text,
      },
    ]}
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={0.75}
  >
    🌙 수면 중 ·{' '}
    {formatSleepTimer(
      sleepSeconds
    )}
  </Text>
)}

{/* 수면 시작/종료 + 기록 보기 */}
<View
  style={
    styles.sleepActionRow
  }
>
  <Pressable
    style={[
      styles.sleepActionButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={
      sleepStartAt
        ? onFinishSleep
        : onStartSleep
    }
  >
    <Text
      style={[
        styles.sleepActionButtonText,
        {
          color: theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {sleepStartAt
        ? '수면 종료 (기상)'
        : '수면 시작 (취침)'}
    </Text>
  </Pressable>

  <Pressable
    style={[
      styles.sleepActionButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={() => {
      setShowSleepHistory(
        !showSleepHistory
      );
    }}
  >
    <Text
      style={[
        styles.sleepActionButtonText,
        {
          color: theme.text,
        },
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {showSleepHistory
        ? '기록 닫기'
        : '수면 기록 보기'}
    </Text>
  </Pressable>
</View>

{/* 날짜별 수면 기록 */}
{showSleepHistory && (
  <View
    style={
      styles.sleepHistoryList
    }
  >
    <Text
  style={[
    styles.sleepHistoryTitle,
    {
      color:
        theme.text,
    },
  ]}
>
  최근 7일 수면 기록
  {' · '}
  낮 12시 기준
</Text>

    {recentSevenDaySleepRecords.length ===
    0 ? (
      <Text
        style={[
          styles.sleepHistoryEmpty,
          {
            color:
              theme.subText,
          },
        ]}
      >
        저장된 수면 기록이
        없습니다.
      </Text>
    ) : (
      recentSevenDaySleepRecords.map(
        ([
          sleepDate,
          record,
        ]) => (
          <View
            key={sleepDate}
            style={[
              styles.sleepHistoryItem,
              {
                backgroundColor:
                  theme.card,

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
                styles.sleepHistoryDate,
                {
                  color:
                    theme.subText,
                },
              ]}
            >
              {sleepDate
  .slice(5)
  .replace(
    '-',
    '.'
  )}
            </Text>

            <Text
              style={[
                styles.sleepHistoryValue,
                {
                  color:
                    theme.text,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {getSleepRecordSummary(
  record
)}
            </Text>
          </View>
        )
      )
    )}
  </View>
)}
        </View>
      )}
    </View>
  );
}

/* F. 하루 이야기 다이어리 이야기 섹션 */
interface StorySectionProps { showStory: boolean; setShowStory: (v: boolean) => void; todayStory?: Story; onWritePress: () => void; }
function StorySection({
  showStory,
  setShowStory,
  todayStory,
  onWritePress,
}: StorySectionProps) {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';

  return (
    <View
      style={[
        styles.storySection,
        {
          backgroundColor: theme.card,
          borderColor: theme.line,
          borderWidth: 0.5,

borderRadius:
  isCityBlack
    ? 4
    : 12,

paddingHorizontal: 14,
paddingVertical: 8,

        },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: showStory ? 12 : 0,
        }}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.text },
          ]}
        >
          📖 일기
        </Text>

        <Pressable
          onPress={() => setShowStory(!showStory)}
          style={[
            styles.toggleOuter,
            {
              backgroundColor: showStory
                ? theme.button
                : theme.card2,
              borderColor: showStory
                ? theme.strongLine
                : theme.line,
              borderWidth: 0.3,
              borderRadius: isCityBlack ? 4 : 999,
            },
          ]}
        >
          <View
            style={[
              styles.toggleInner,
              showStory && styles.toggleInnerOn,
              {
                backgroundColor: showStory
                  ? theme.buttonText
                  : theme.subText,
                borderRadius: isCityBlack ? 2 : 13,
              },
            ]}
          />
        </Pressable>
      </View>

      {showStory && (
        <View>
          {!todayStory ? (
  <Pressable
    style={[
      styles.storyWriteButton,
      {
        backgroundColor:
          theme.card,

        borderColor:
          theme.strongLine,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
    onPress={
      onWritePress
    }
  >
    <Text
      style={[
        styles.storyWriteButtonText,
        {
          color:
            theme.text,
        },
      ]}
    >
      일기쓰기
    </Text>
  </Pressable>
) : (
            <View
              style={[
                styles.storyCard,
                {
                  backgroundColor: theme.card2,
                  borderColor: theme.line,
                  borderWidth: 1,
                  borderRadius: isCityBlack ? 4 : 18,
                },
              ]}
            >
              <View
                style={[
                  styles.storyTopRow,
                  {
                    alignItems: 'center',
                    gap: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.text,
                  }}
                >
                  날씨: {todayStory.weather} · 기분: {todayStory.mood}
                </Text>

                <Pressable
                  style={[
                    styles.storyMiniEditButton,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.strongLine,
                      borderWidth: 1,
                      borderRadius: isCityBlack ? 4 : 8,
                    },
                  ]}
                  onPress={onWritePress}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontWeight: '700',
                    }}
                  >
                    수정
                  </Text>
                </Pressable>
              </View>

              <Text
                style={[
                  styles.storyPreview,
                  { color: theme.text },
                ]}
              >
                {todayStory.text}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* G. 오늘의 가계부 */
interface LedgerSectionProps {
  showLedger:
    boolean;

  setShowLedger: (
    value: boolean
  ) => void;

  monthLabel:
    string;

  monthBudget:
    number;
remainingBudget:
  number;

monthExpense:
  number;

weekAvailable:
  number;

weekExpense:
  number;

todayAvailable:
  number;

todayExpense:
  number;

  onBudgetPress:
    () => void;

  onMonthPress:
    () => void;

  onWeekPress:
    () => void;

  onTodayPress:
    () => void;

  onAddPress:
    () => void;

      pendingFinancialNotifications:
    PendingFinancialNotification[];

    merchantCategoryHistory:
  MerchantCategoryHistory;

  merchantAutoSaveRules:
  MerchantAutoSaveRules;

  onToggleMerchantAutoSave:
  (
    item:
      PendingFinancialNotification,

    category:
      LedgerExpenseCategory
  ) => void;

onOpenMerchantAutoSaveManagement:
  () => void;

  hasFinancialNotificationAccess:
    boolean;

  financialNotificationLoading:
    boolean;

  onRefreshFinancialNotifications:
    () => void;

 onDismissFinancialNotification:
  (
    item:
      PendingFinancialNotification
  ) => Promise<void>;


  onFinancialNotificationAction:
  (
    item:
      PendingFinancialNotification,

    action:
      FinancialNotificationAction,

    selectedCategory:
      LedgerExpenseCategory,

    isAutoSave?:
      boolean,

    suppressNotice?:
      boolean,

    otherDetail?:
      string
  ) => Promise<boolean>;

onUndoFinancialNotificationSave:
  (
    notificationIds:
      string[]
  ) => Promise<void>;

  onOpenFinancialNotificationSettings:
    () => void;
}

function LedgerSection({
  showLedger,
  setShowLedger,

  monthLabel,
monthBudget,
remainingBudget,
monthExpense,

weekAvailable,
weekExpense,

todayAvailable,
todayExpense,

  onBudgetPress,
  onMonthPress,
  onWeekPress,
    onTodayPress,
  onAddPress,

  pendingFinancialNotifications,
merchantCategoryHistory,
merchantAutoSaveRules,
hasFinancialNotificationAccess,
  financialNotificationLoading,
  onRefreshFinancialNotifications,
onDismissFinancialNotification,
onFinancialNotificationAction,
onUndoFinancialNotificationSave,
onToggleMerchantAutoSave,
onOpenMerchantAutoSaveManagement,
onOpenFinancialNotificationSettings,
}: LedgerSectionProps) {
  const {
    themeMode,
    theme,
  } = useRootTheme();

  const isCityBlack =
    themeMode ===
    'cityBlack';

    const [
  selectedFinancialCategories,
  setSelectedFinancialCategories,
] = useState<
  Record<
    string,
    LedgerExpenseCategory
  >
>({});

/*
 * 금융 알림에서 기타를 선택했을 때
 * 사용자가 입력한 상세 내용입니다.
 */
const [
  financialOtherDetails,
  setFinancialOtherDetails,
] = useState<
  Record<
    string,
    string
  >
>({});

const [
  expandedFinancialNotificationId,
  setExpandedFinancialNotificationId,
] = useState<string | null>(
  null
);

const [
  selectedFinancialNotificationIds,
  setSelectedFinancialNotificationIds,
] = useState<string[]>(
  []
);

const [
  financialActionProcessing,
  setFinancialActionProcessing,
] = useState(false);

const [
  financialBulkResultMessage,
  setFinancialBulkResultMessage,
] = useState('');

const [
  financialBulkUndoIds,
  setFinancialBulkUndoIds,
] = useState<string[]>(
  []
);

const [
  financialBulkUndoProcessing,
  setFinancialBulkUndoProcessing,
] = useState(false);

const financialBulkResultTimerRef =
  useRef<
    ReturnType<
      typeof setTimeout
    > |
    null
  >(null);

const financialActionProcessingRef =
  useRef(false);

const selectedFinancialNotificationIdSet =
  new Set(
    selectedFinancialNotificationIds
  );

const selectedFinancialNotifications =
  pendingFinancialNotifications.filter(
    item =>
      selectedFinancialNotificationIdSet.has(
        item.id
      )
  );

const toggleFinancialNotificationSelection =
  useCallback(
    (
      notificationId:
        string
    ) => {
      setSelectedFinancialNotificationIds(
        currentIds =>
          currentIds.includes(
            notificationId
          )
            ? currentIds.filter(
                id =>
                  id !==
                  notificationId
              )
            : [
                ...currentIds,
                notificationId,
              ]
      );
    },
    []
  );

const selectAllFinancialNotifications =
  useCallback(() => {
    setSelectedFinancialNotificationIds(
      pendingFinancialNotifications
        .filter(
          item =>
            !isFinancialCancellationNotification(
              item
            ) &&
            extractWonAmount(
              item
            ) > 0
        )
        .map(
          item =>
            item.id
        )
    );
  }, [
    pendingFinancialNotifications,
  ]);

const clearFinancialNotificationSelection =
  useCallback(() => {
    setSelectedFinancialNotificationIds(
      []
    );
  }, []);

const startBulkFinancialProcessing =
  useCallback(() => {
    if (
      financialActionProcessingRef.current
    ) {
      return false;
    }

    financialActionProcessingRef.current =
      true;

    setFinancialActionProcessing(
      true
    );

    return true;
  }, []);

const finishBulkFinancialProcessing =
  useCallback(() => {
    financialActionProcessingRef.current =
      false;

    setFinancialActionProcessing(
      false
    );
  }, []);

const showFinancialBulkResult =
  useCallback(
    (
      message:
        string,

      preserveUndo:
        boolean = false
    ) => {
      if (
        !preserveUndo
      ) {
        setFinancialBulkUndoIds(
          []
        );
      }

      setFinancialBulkResultMessage(
        message
      );

      if (
        financialBulkResultTimerRef.current
      ) {
        clearTimeout(
          financialBulkResultTimerRef.current
        );
      }

      financialBulkResultTimerRef.current =
        setTimeout(
          () => {
            setFinancialBulkResultMessage(
              ''
            );

            setFinancialBulkUndoIds(
              []
            );

            financialBulkResultTimerRef.current =
              null;
          },
          4000
        );
    },
    []
  );

useEffect(() => {
  return () => {
    if (
      financialBulkResultTimerRef.current
    ) {
      clearTimeout(
        financialBulkResultTimerRef.current
      );
    }
  };
}, []);

const dismissFinancialNotifications =
  useCallback(
    async (
      targetItems:
        PendingFinancialNotification[]
    ) => {
      if (
  targetItems.length ===
  0
) {
  showFinancialBulkResult(
    '제외할 금융 내역을 선택해주세요.'
  );

  return;
}

      if (
        !startBulkFinancialProcessing()
      ) {
        return;
      }

      try {
        const results =
          await Promise.allSettled(
            targetItems.map(
              item =>
                onDismissFinancialNotification(
                  item
                )
            )
          );

        const failedCount =
  results.filter(
    result =>
      result.status ===
      'rejected'
  ).length;

const dismissedCount =
  targetItems.length -
  failedCount;

setSelectedFinancialNotificationIds(
  []
);

if (
  failedCount ===
  0
) {
  showFinancialBulkResult(
    `✓ ${dismissedCount}건을 목록에서 제외했어요.`
  );
} else {
  showFinancialBulkResult(
    `⚠ ${dismissedCount}건을 제외했고, ${failedCount}건은 처리하지 못했어요.`
  );
}

        console.log(
          'FINANCIAL BULK DISMISS COMPLETE',
          {
            requestedCount:
              targetItems.length,

            failedCount,
          }
        );
      } catch (error) {
  console.log(
    'FINANCIAL BULK DISMISS ERROR',
    error
  );

  showFinancialBulkResult(
    '⚠ 금융 내역을 제외하는 중 오류가 발생했어요.'
  );
} finally {
        finishBulkFinancialProcessing();
      }
    },
    [
      onDismissFinancialNotification,
      startBulkFinancialProcessing,
      finishBulkFinancialProcessing,
      showFinancialBulkResult,
    ]
  );

const saveSelectedFinancialNotifications =
  useCallback(
    async () => {
      const targetItems =
        pendingFinancialNotifications.filter(
          item =>
            selectedFinancialNotificationIds.includes(
              item.id
            )
        );

      if (
  targetItems.length ===
  0
) {
  showFinancialBulkResult(
    '저장할 금융 내역을 선택해주세요.'
  );

  return;
}

      const saveableItems =
        targetItems.filter(
          item =>
            !isFinancialCancellationNotification(
              item
            ) &&
            extractWonAmount(
              item
            ) > 0
        );

      if (
  saveableItems.length ===
  0
) {
  showFinancialBulkResult(
    '취소 알림이나 금액 미확인 알림은 일괄 저장할 수 없어요.'
  );

  return;
}

      if (
        !startBulkFinancialProcessing()
      ) {
        return;
      }

      let savedCount =
        0;

      let failedCount =
        0;

        const savedNotificationIds:
  string[] = [];

      try {
        for (
          const item of
          saveableItems
        ) {
          try {
            const recommendedCategories =
              getRecommendedLedgerCategories(
                item,
                merchantCategoryHistory
              );

            const selectedCategory =
              selectedFinancialCategories[
                item.id
              ] ??
              recommendedCategories[0] ??
              '기타';

           const saveSucceeded =
  await onFinancialNotificationAction(
    item,
    'expense',
    selectedCategory,
    false,
    true,
    financialOtherDetails[
      item.id
    ] ?? ''
  );

if (
  saveSucceeded
) {
  savedNotificationIds.push(
    item.id
  );

  savedCount +=
    1;
} else {
  failedCount +=
    1;
}
          } catch (error) {
            failedCount +=
              1;

            console.log(
              'FINANCIAL BULK SAVE ITEM ERROR',
              {
                notificationId:
                  item.id,

                error,
              }
            );
          }
        }

        setSelectedFinancialNotificationIds(
          []
        );

setFinancialBulkUndoIds(
  savedNotificationIds.length >
  0
    ? savedNotificationIds
    : []
);

const skippedCount =
  targetItems.length -
  saveableItems.length;

if (
  savedNotificationIds.length >
  0
) {
  showFinancialBulkResult(
    failedCount === 0
      ? skippedCount > 0
        ? `✓ ${savedCount}건을 저장했고, ${skippedCount}건은 개별 확인이 필요해요.`
        : `✓ ${savedCount}건을 지출로 저장했어요.`
      : `⚠ ${savedCount}건을 저장했고, ${failedCount}건은 처리하지 못했어요.`,

    true
  );
} else {
  showFinancialBulkResult(
    '⚠ 저장된 금융 내역이 없어요.'
  );
}

        console.log(
          'FINANCIAL BULK SAVE COMPLETE',
          {
            requestedCount:
              saveableItems.length,

            savedCount,

            failedCount,
          }
        );
      } catch (error) {
        console.log(
          'FINANCIAL BULK SAVE ERROR',
          error
        );

        showFinancialBulkResult(
          '⚠ 금융 내역을 저장하는 중 오류가 발생했어요.'
        );
      } finally {
        finishBulkFinancialProcessing();
      }
    },
    [
      pendingFinancialNotifications,
  selectedFinancialNotificationIds,
  selectedFinancialCategories,
  financialOtherDetails,
  merchantCategoryHistory,
  onFinancialNotificationAction,
  startBulkFinancialProcessing,
  finishBulkFinancialProcessing,
  showFinancialBulkResult,
    ]
  );

const undoFinancialBulkSave =
  useCallback(
    async () => {
      if (
        financialBulkUndoIds.length ===
          0 ||
        financialBulkUndoProcessing
      ) {
        return;
      }

      try {
        setFinancialBulkUndoProcessing(
          true
        );

        await onUndoFinancialNotificationSave(
          financialBulkUndoIds
        );

        const undoCount =
          financialBulkUndoIds.length;

        setFinancialBulkUndoIds(
          []
        );

        setFinancialBulkResultMessage(
          `✓ ${undoCount}건의 저장을 되돌렸어요.`
        );

        if (
          financialBulkResultTimerRef.current
        ) {
          clearTimeout(
            financialBulkResultTimerRef.current
          );
        }

        financialBulkResultTimerRef.current =
          setTimeout(
            () => {
              setFinancialBulkResultMessage(
                ''
              );

              financialBulkResultTimerRef.current =
                null;
            },
            4000
          );
      } catch (error) {
        console.log(
          'FINANCIAL BULK UNDO ERROR',
          error
        );

        showFinancialBulkResult(
  '⚠ 저장 내역을 되돌리지 못했어요.',

  true
);
      } finally {
        setFinancialBulkUndoProcessing(
          false
        );
      }
    },
    [
      financialBulkUndoIds,
      financialBulkUndoProcessing,
      onUndoFinancialNotificationSave,
      showFinancialBulkResult,
    ]
  );


useEffect(() => {
  const visibleIdSet =
    new Set(
      pendingFinancialNotifications.map(
        item =>
          item.id
      )
    );

  setSelectedFinancialNotificationIds(
    currentIds =>
      currentIds.filter(
        id =>
          visibleIdSet.has(
            id
          )
      )
  );
}, [
  pendingFinancialNotifications,
]);

const merchantAutoSaveRuleCount =
  Object.keys(
    merchantAutoSaveRules
  ).length;

  return (
    <View
      style={[
        styles.ledgerSection,
        {
          backgroundColor:
            theme.card,

          borderColor:
            theme.line,

          borderWidth: 0.5,

borderRadius:
  isCityBlack
    ? 4
    : 12,

paddingHorizontal: 14,
paddingVertical: 8,

        },
      ]}
    >
      {/* 제목 + ON/OFF */}
      <View
        style={{
          flexDirection:
            'row',

          justifyContent:
            'space-between',

          alignItems:
            'center',

          marginBottom:
            showLedger
              ? 12
              : 0,
        }}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          💰 오늘의 가계부
        </Text>

        <Pressable
          onPress={() =>
            setShowLedger(
              !showLedger
            )
          }
          style={[
            styles.toggleOuter,
            {
              backgroundColor:
                showLedger
                  ? theme.button
                  : theme.card2,

              borderColor:
                showLedger
                  ? theme.strongLine
                  : theme.line,

              borderWidth: 0.3,

              borderRadius:
                isCityBlack
                  ? 4
                  : 999,
            },
          ]}
        >
          <View
            style={[
              styles.toggleInner,

              showLedger &&
                styles.toggleInnerOn,

              {
                backgroundColor:
                  showLedger
                    ? theme.buttonText
                    : theme.subText,

                borderRadius:
                  isCityBlack
                    ? 2
                    : 13,
              },
            ]}
          />
        </Pressable>
      </View>

      {showLedger && (
  <View
    style={[
      styles.ledgerSingleBox,
      {
        backgroundColor:
          theme.card2,

        borderColor:
          theme.line,

        borderRadius:
          isCityBlack
            ? 4
            : 14,
      },
    ]}
  ><View
  style={[
    styles.financialNotificationBox,
    {
      borderColor:
        theme.line,

      backgroundColor:
        theme.card,

      borderRadius:
        isCityBlack
          ? 4
          : 12,
    },
  ]}
>
  <View
    style={
      styles.financialNotificationHeader
    }
  >
    <View
      style={
        styles.financialNotificationTitleBox
      }
    >
      
      <View
  style={
    styles.financialNotificationTitleRow
  }
>
  <Text
    style={[
      styles.financialNotificationTitle,
      {
        color:
          theme.text,
      },
    ]}
  >
    감지된 금융 내역
  </Text>

  <Pressable
    onPress={
      onOpenMerchantAutoSaveManagement
    }
    style={[
      styles.financialAutoSaveManageButton,
      {
        backgroundColor:
          theme.card,

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
    styles.financialAutoSaveManageButtonText,
    {
      color:
        theme.text,
    },
  ]}
>
  자동 저장 관리
{merchantAutoSaveRuleCount > 0
  ? ` ${merchantAutoSaveRuleCount}`
  : ''}
</Text>
  </Pressable>
</View>

      <Text
        style={[
          styles.financialNotificationCount,
          {
            color:
              theme.subText,
          },
        ]}
      >
        {
          pendingFinancialNotifications.length
        }
        건
      </Text>
    </View>

    <Pressable
      onPress={
  onRefreshFinancialNotifications
}
      style={[
        styles.financialNotificationRefreshButton,
        {
          borderColor:
            theme.line,
        },
      ]}
    >
      <Text
        style={[
          styles.financialNotificationRefreshText,
          {
            color:
              theme.text,
          },
        ]}
      >
        새로고침
      </Text>
    </Pressable>
  </View>

  {!hasFinancialNotificationAccess ? (
    <View
      style={
        styles.financialNotificationEmpty
      }
    >
      <Text
        style={[
          styles.financialNotificationEmptyText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        결제 알림을 확인하려면
        알림 접근 권한이 필요해요.
      </Text>

      <Pressable
        onPress={
  onOpenFinancialNotificationSettings
}
        style={[
          styles.financialNotificationSettingButton,
          {
            borderColor:
              theme.line,
          },
        ]}
      >
        <Text
          style={[
            styles.financialNotificationSettingText,
            {
              color:
                theme.text,
            },
          ]}
        >
          알림 접근 설정
        </Text>
      </Pressable>
    </View>
  ) : financialNotificationLoading ? (
    <Text
      style={[
        styles.financialNotificationEmptyText,
        {
          color:
            theme.subText,
        },
      ]}
    >
      금융 내역을 불러오는 중이에요.
    </Text>
  ) : pendingFinancialNotifications.length ===
  0 ? null : (
    <View
      style={
        styles.financialNotificationList
      }
    >

<View
  style={
    styles.financialBulkActionArea
  }
>
  <View
    style={
      styles.financialBulkSelectionRow
    }
  >
    <Pressable
      disabled={
        financialActionProcessing
      }
      onPress={
        selectAllFinancialNotifications
      }
      style={[
        styles.financialBulkSmallButton,
        {
          borderColor:
            theme.line,

          opacity:
            financialActionProcessing
              ? 0.45
              : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.financialBulkSmallButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        전체 선택
      </Text>
    </Pressable>

    <Pressable
      disabled={
        financialActionProcessing
      }
      onPress={
        clearFinancialNotificationSelection
      }
      style={[
        styles.financialBulkSmallButton,
        {
          borderColor:
            theme.line,

          opacity:
            financialActionProcessing
              ? 0.45
              : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.financialBulkSmallButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        선택 해제
      </Text>
    </Pressable>

    <Text
      style={[
        styles.financialBulkSelectedCount,
        {
          color:
            theme.subText,
        },
      ]}
    >
      {
        selectedFinancialNotificationIds
          .length
      }
      건 선택
    </Text>
  </View>

  <View
    style={
      styles.financialBulkMainRow
    }
  >
    <Pressable
      disabled={
        financialActionProcessing ||
        selectedFinancialNotificationIds
          .length === 0
      }
      onPress={
        saveSelectedFinancialNotifications
      }
      style={[
        styles.financialBulkMainButton,
        {
          borderColor:
            theme.line,

          opacity:
            financialActionProcessing ||
            selectedFinancialNotificationIds
              .length === 0
              ? 0.45
              : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.financialBulkMainButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        추천대로 지출 저장
      </Text>
    </Pressable>

    <Pressable
      disabled={
        financialActionProcessing ||
        selectedFinancialNotificationIds
          .length === 0
      }
      onPress={() =>
        dismissFinancialNotifications(
          selectedFinancialNotifications
        )
      }
      style={[
        styles.financialBulkMainButton,
        {
          borderColor:
            theme.line,

          opacity:
            financialActionProcessing ||
            selectedFinancialNotificationIds
              .length === 0
              ? 0.45
              : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.financialBulkMainButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        선택 삭제
      </Text>
    </Pressable>

    <Pressable
      disabled={
        financialActionProcessing
      }
      onPress={() =>
        dismissFinancialNotifications(
          pendingFinancialNotifications
        )
      }
      style={[
        styles.financialBulkMainButton,
        {
          borderColor:
            theme.line,

          opacity:
            financialActionProcessing
              ? 0.45
              : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.financialBulkMainButtonText,
          {
            color:
              theme.danger,
          },
        ]}
      >
        전체 삭제
      </Text>
    </Pressable>
  </View>

  <Text
    style={[
      styles.financialBulkGuide,
      {
        color:
          theme.subText,
      },
    ]}
  >
    취소 알림과 금액 미확인 알림은
    일괄 지출 저장에서 제외됩니다.
  </Text>
  {financialBulkResultMessage ? (
  <View
    style={[
      styles.financialBulkResultBox,
      {
        borderColor:
          theme.line,

        backgroundColor:
          theme.card,
      },
    ]}
  >
    <Text
      style={[
        styles.financialBulkResultText,
        {
          color:
            financialBulkResultMessage.startsWith(
              '⚠'
            )
              ? theme.danger
              : theme.text,
        },
      ]}
    >
      {
        financialBulkResultMessage
      }
     </Text>

    {financialBulkUndoIds.length >
      0 && (
      <Pressable
        disabled={
          financialBulkUndoProcessing
        }
        onPress={
          undoFinancialBulkSave
        }
        style={[
          styles.financialBulkUndoButton,
          {
            borderColor:
              theme.strongLine,

            opacity:
              financialBulkUndoProcessing
                ? 0.45
                : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.financialBulkUndoButtonText,
            {
              color:
                theme.text,
            },
          ]}
        >
          {financialBulkUndoProcessing
            ? '되돌리는 중'
            : '되돌리기'}
        </Text>
      </Pressable>
    )}
  </View>
) : null}
</View>

      {pendingFinancialNotifications.map(
  item => {
    const recommendedCategories =
  getRecommendedLedgerCategories(
    item,
    merchantCategoryHistory
  );

  const merchantProfile =
  getFinancialMerchantProfile(
    item
  );

const merchantHistorySummary =
  getMerchantCategoryHistorySummary(
    item,
    merchantCategoryHistory
  );

const merchantAutoSaveRule =
  merchantAutoSaveRules[
    merchantProfile.key
  ];

const isCancellation =
  isFinancialCancellationNotification(
    item
  );

const financialAmount =
  extractWonAmount(
    item
  );

const isBulkSelectable =
  !isCancellation &&
  financialAmount > 0;

const merchantAutoSaveEnabled =
  Boolean(
    merchantAutoSaveRule
  );

const selectedCategory =
  selectedFinancialCategories[
    item.id
  ] ??
  recommendedCategories[0] ??
  '기타';

  const isExpanded =
  expandedFinancialNotificationId ===
  item.id;

return (
      <View
            key={
              item.id
            }
            style={[
              styles.financialNotificationItem,
              {
                borderColor:
                  theme.line,
              },
            ]}
          >

            <Pressable
  disabled={
    financialActionProcessing ||
    !isBulkSelectable
  }
  onPress={() =>
    toggleFinancialNotificationSelection(
      item.id
    )
  }
  style={[
    styles.financialSelectionButton,
    {
      borderColor:
        selectedFinancialNotificationIdSet.has(
          item.id
        )
          ? theme.text
          : theme.line,

      backgroundColor:
        selectedFinancialNotificationIdSet.has(
          item.id
        )
          ? theme.card2
          : 'transparent',

      opacity:
        financialActionProcessing ||
        !isBulkSelectable
          ? 0.3
          : 1,
    },
  ]}
>
  <Ionicons
    name={
      !isBulkSelectable
        ? 'remove-outline'
        : selectedFinancialNotificationIdSet.has(
            item.id
          )
        ? 'checkmark'
        : 'ellipse-outline'
    }
    size={
      14
    }
    color={
      selectedFinancialNotificationIdSet.has(
        item.id
      )
        ? theme.text
        : theme.subText
    }
  />
</Pressable>

<View
  style={
    styles.financialNotificationMain
  }
>
         <Pressable
  onPress={() =>
    setExpandedFinancialNotificationId(
      currentId =>
        currentId ===
        item.id
          ? null
          : item.id
    )
  }
  style={
    styles.financialNotificationContent
  }
>
  <View
    style={
      styles.financialCompactTitleRow
    }
  >
    <Text
      style={[
        styles.financialNotificationItemTitle,
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
        merchantProfile.label ||
        item.title ||
        '금융 알림'
      }
    </Text>

    {financialAmount > 0 && (
      <Text
        style={[
          styles.financialCompactAmount,
          {
            color:
              theme.text,
          },
        ]}
        numberOfLines={
          1
        }
      >
        {formatMoney(
          financialAmount
        )}
        원
      </Text>
    )}

    <Ionicons
      name={
        isExpanded
          ? 'chevron-up'
          : 'chevron-down'
      }
      size={
        15
      }
      color={
        theme.subText
      }
    />
  </View>

  <View
    style={
      styles.financialCompactInfoRow
    }
  >
    <Text
      style={[
        styles.financialCompactCategory,
        {
          color:
            theme.subText,
        },
      ]}
      numberOfLines={
        1
      }
    >
      {selectedCategory}
      {
        merchantAutoSaveEnabled
          ? ' · 자동 저장'
          : ''
      }
    </Text>

    <Text
      style={[
        styles.financialNotificationTime,
        {
          color:
            theme.subText,
        },
      ]}
      numberOfLines={
        1
      }
    >
      {new Date(
        item.postedAt
      ).toLocaleString(
        'ko-KR',
        {
          month:
            'numeric',

          day:
            'numeric',

          hour:
            '2-digit',

          minute:
            '2-digit',
        }
      )}
    </Text>
  </View>

  {isExpanded && (
    <Text
      style={[
        styles.financialNotificationItemText,
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
        item.text ||
        '내용 없음'
      }
    </Text>
  )}
</Pressable>


{isExpanded && (
            <View
  style={
    styles.financialNotificationActionArea
  }
>
  <View
  style={
    styles.financialCategoryArea
  }
>
 <View
  style={
    styles.financialCategoryTitleArea
  }
>
  <Text
    style={[
      styles.financialCategoryTitle,
      {
        color:
          theme.text,
      },
    ]}
  >
    지출 카테고리
  </Text>

  <Text
    style={[
      styles.financialCategoryRecommendText,
      {
        color:
          theme.subText,
      },
    ]}
     numberOfLines={
    2
  }
  >
    {merchantProfile.type ===
    'single'
      ? '단일 목적 · 추천 정확도 높음'
      : '복합 결제처 · 최근 선택 반영'}
  </Text>

  <Text
    style={[
      styles.financialCategoryHistoryText,
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
      merchantHistorySummary
        .summaryText
    }
  </Text>
</View>

{merchantProfile.type ===
'single' && (
  <Pressable
    onPress={() =>
      onToggleMerchantAutoSave(
        item,
        selectedCategory
      )
    }
    style={[
      styles.financialAutoSaveButton,
      {
        backgroundColor:
          merchantAutoSaveEnabled
            ? theme.button
            : theme.card,

        borderColor:
          merchantAutoSaveEnabled
            ? theme.strongLine
            : theme.line,

        borderRadius:
          isCityBlack
            ? 4
            : 8,
      },
    ]}
  >
    <Text
  style={[
    styles.financialAutoSaveButtonText,
    {
      color:
        merchantAutoSaveEnabled
          ? theme.buttonText
          : theme.text,
    },
  ]}
  numberOfLines={
    1
  }
  adjustsFontSizeToFit
  minimumFontScale={
    0.8
  }
>
  {merchantAutoSaveEnabled
    ? `자동 저장 중 · ${
        merchantAutoSaveRule
          ?.category
      }`
    : `다음부터 ${
        selectedCategory
      }로 자동 저장`}
</Text>
  </Pressable>
)}

  <View
  style={
    styles.financialCategoryButtonRow
  }
>
  {recommendedCategories.map(
    (
      category,
      index
    ) => {
      const selected =
        selectedCategory ===
        category;

      return (
        <View
          key={
            category
          }
          style={[
            styles.financialCategoryChoiceWrap,

            category ===
              '기타' &&
              selected &&
              styles.financialOtherCategoryRowSelected,
          ]}
        >
          <Pressable
            onPress={() => {
  setSelectedFinancialCategories(
    current => ({
      ...current,

      [item.id]:
        category,
    })
  );

  /*
   * 기타가 아닌 카테고리로 변경하면
   * 이전에 입력했던 기타 내용을 삭제합니다.
   */
  if (
    category !==
    '기타'
  ) {
    setFinancialOtherDetails(
      current => {
        const next = {
          ...current,
        };

        delete next[
          item.id
        ];

        return next;
      }
    );
  }
}}
            style={[
              styles.financialCategoryButton,
              {
                backgroundColor:
                  selected
                    ? theme.button
                    : theme.card,

                borderColor:
                  selected
                    ? theme.strongLine
                    : theme.line,

                borderRadius:
                  isCityBlack
                    ? 4
                    : 8,
              },
            ]}
          >
            <Text
              style={[
                styles.financialCategoryButtonText,
                {
                  color:
                    selected
                      ? theme.buttonText
                      : theme.text,
                },
              ]}
            >
              {category}

              {index === 0
                ? ' 추천'
                : ''}
            </Text>
          </Pressable>

          {category ===
            '기타' &&
            selected && (
              <TextInput
                value={
                  financialOtherDetails[
                    item.id
                  ] ?? ''
                }
                onChangeText={
                  value =>
                    setFinancialOtherDetails(
                      current => ({
                        ...current,

                        [item.id]:
                          value,
                      })
                    )
                }
                placeholder="어떤 내용인지 입력"
                placeholderTextColor={
                  theme.subText
                }
                maxLength={40}
                returnKeyType="done"
                style={[
                  styles.financialOtherCategoryInput,
                  {
                    color:
                      theme.text,

                    backgroundColor:
                      theme.card,

                    borderColor:
                      theme.line,

                    borderRadius:
                      isCityBlack
                        ? 4
                        : 8,
                  },
                ]}
              />
            )}
        </View>
      );
    }
  )}
</View>
</View>

  <View
    style={
      styles.financialNotificationActionRow
    }
  >
    <Pressable
    onPress={async () => {
  const saved =
    await onFinancialNotificationAction(
      item,
      'expense',
      selectedCategory,
      false,
      false,
      financialOtherDetails[
        item.id
      ] ?? ''
    );

  /*
   * 저장에 성공하면 해당 입력값을
   * 화면 상태에서도 제거합니다.
   */
  if (saved) {
    setFinancialOtherDetails(
      current => {
        const next = {
          ...current,
        };

        delete next[
          item.id
        ];

        return next;
      }
    );
  }
}}
style={[
    styles.financialNotificationActionButton,
    {
      borderColor:
        theme.strongLine,

      backgroundColor:
        theme.card,
    },
  ]}
    >
      <Text
        style={[
          styles.financialNotificationActionText,
          {
            color:
              theme.text,
          },
        ]}
      >
        지출
      </Text>
    </Pressable>

    <Pressable
      onPress={() =>
        onFinancialNotificationAction(
  item,
  'income',
  selectedCategory
)
      }
      style={[
        styles.financialNotificationActionButton,
        {
          borderColor:
            theme.strongLine,

          backgroundColor:
            theme.card,
        },
      ]}
    >
      <Text
        style={[
          styles.financialNotificationActionText,
          {
            color:
              theme.text,
          },
        ]}
      >
        수입
      </Text>
    </Pressable>

    <Pressable
      onPress={() =>
        onFinancialNotificationAction(
  item,
  'transfer',
  selectedCategory
)
      }
      style={[
        styles.financialNotificationActionButton,
        {
          borderColor:
            theme.line,

          backgroundColor:
            theme.card,
        },
      ]}
    >
      <Text
        style={[
          styles.financialNotificationActionText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        자산 이동
      </Text>
    </Pressable>

    <Pressable
      onPress={() =>
        onDismissFinancialNotification(
          item
        )
      }
      style={[
        styles.financialNotificationActionButton,
        {
          borderColor:
            theme.line,

          backgroundColor:
            theme.card,
        },
      ]}
    >
      <Text
        style={[
          styles.financialNotificationActionText,
          {
            color:
              theme.subText,
          },
        ]}
      >
        삭제
      </Text>
    </Pressable>
  </View>
</View>
)}


</View>
           </View>
    );
  }
)}
  </View>
      )}

  {Object.keys(
  merchantAutoSaveRules
).length > 0 && (
  <Text
    style={[
      styles.financialNotificationGuideText,
      {
        color:
          theme.subText,
      },
    ]}
  >
    현재{' '}
    {
      Object.keys(
        merchantAutoSaveRules
      ).length
    }
    개 결제처가 자동 저장 중입니다.
  </Text>
)}


</View>
    {/* 이번 달 남은 예산 + 사용 금액 + 달력 */}
<View
  style={[
    styles.ledgerSingleRow,
    styles.ledgerPeriodRow,
  ]}
>
  <View
    style={
      styles.ledgerPeriodSummaryRow
    }
  >
    {/* 이번 달 남은 예산 */}
    <Pressable
      style={
        styles.ledgerPeriodSummaryItem
      }
      onPress={
        onBudgetPress
      }
    >
      <Text
        style={[
          styles.ledgerCompactLabel,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
      >
        {monthLabel}{' '}
        남은 예산
      </Text>

      <Text
        style={[
          styles.ledgerCompactSubValue,
          {
            color:
              monthBudget >
                0 &&
              remainingBudget <
                0
                ? theme.danger
                : theme.text,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
        minimumFontScale={
          0.65
        }
      >
        {monthBudget >
        0
          ? `${formatMoney(
              remainingBudget
            )}원`
          : '＋ 예산 입력'}
      </Text>
    </Pressable>

    {/* 이번 달 사용 금액 */}
    <Pressable
      style={[
        styles.ledgerPeriodSummaryItem,
        styles.ledgerPeriodExpenseItem,
        {
          borderLeftColor:
            theme.line,
        },
      ]}
      onPress={
        onMonthPress
      }
    >
      <Text
        style={[
          styles.ledgerCompactLabel,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
      >
        {monthLabel}{' '}
        사용 금액
      </Text>

      <Text
        style={[
          styles.ledgerCompactSubValue,
          {
            color:
              theme.text,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
        minimumFontScale={
          0.65
        }
      >
        {formatMoney(
          monthExpense
        )}
        원
      </Text>

      <Text
        style={[
          styles.ledgerTodayDetailHint,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
      >
        눌러서 내역 보기
      </Text>
    </Pressable>
  </View>

  {/* 기존 달력 버튼 유지 */}
  <Pressable
    style={
      styles.ledgerSingleCalendarAction
    }
    onPress={
      onMonthPress
    }
  >
    <Ionicons
      name="calendar-outline"
      size={22}
      color={
        theme.text
      }
    />

    <Text
      style={[
        styles.ledgerSingleActionText,
        {
          color:
            theme.text,
        },
      ]}
    >
      달력
    </Text>
  </Pressable>
</View>

    {/* 이번 주 남은 예산 + 사용 금액 */}
<View
  style={[
    styles.ledgerSingleRow,
    styles.ledgerPeriodRow,
  ]}
>
  <View
  style={[
    styles.ledgerPeriodSummaryRow,
    styles.ledgerSummaryCalendarSpace,
  ]}
>
    {/* 이번 주 남은 예산 */}
    <Pressable
      style={
        styles.ledgerPeriodSummaryItem
      }
      onPress={
        onWeekPress
      }
    >
      <Text
        style={[
          styles.ledgerCompactLabel,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
      >
        이번 주 남은 예산
      </Text>

      <Text
        style={[
          styles.ledgerCompactSubValue,
          {
            color:
              weekAvailable <
              0
                ? theme.danger
                : theme.text,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
        minimumFontScale={
          0.65
        }
      >
        {monthBudget >
        0
          ? `${formatMoney(
              weekAvailable
            )}원`
          : '-'}
      </Text>
    </Pressable>

    {/* 이번 주 사용 금액 */}
    <Pressable
      style={[
        styles.ledgerPeriodSummaryItem,
        styles.ledgerPeriodExpenseItem,
        {
          borderLeftColor:
            theme.line,
        },
      ]}
      onPress={
        onWeekPress
      }
    >
      <Text
        style={[
          styles.ledgerCompactLabel,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
      >
        이번 주 사용 금액
      </Text>

      <Text
        style={[
          styles.ledgerCompactSubValue,
          {
            color:
              theme.text,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
        minimumFontScale={
          0.65
        }
      >
        {formatMoney(
          weekExpense
        )}
        원
      </Text>

      <Text
        style={[
          styles.ledgerTodayDetailHint,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
      >
        눌러서 내역 보기
      </Text>
    </Pressable>
  </View>
</View>    

    {/* 오늘 남은 예산 + 오늘 사용 금액 */}
<View
  style={
    styles.ledgerTodayContent
  }
>
  <View
  style={[
    styles.ledgerTodayAmountRow,
    styles.ledgerSummaryCalendarSpace,
  ]}
>
    {/* 오늘 남은 예산 */}
    <Pressable
      style={
        styles.ledgerTodaySummaryItem
      }
      onPress={
        onTodayPress
      }
    >
      <Text
        style={[
          styles.ledgerCompactLabel,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
      >
        오늘 사용 남은 예산
      </Text>

      <Text
        style={[
          styles.ledgerCompactSubValue,
          {
            color:
              todayAvailable <
              0
                ? theme.danger
                : theme.text,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
        minimumFontScale={
          0.7
        }
      >
        {monthBudget >
        0
          ? `${formatMoney(
              todayAvailable
            )}원`
          : '-'}
      </Text>
    </Pressable>

    {/* 오늘 사용 금액 */}
    <Pressable
      style={[
        styles.ledgerTodaySummaryItem,
        styles.ledgerTodayExpenseItem,
        {
          borderLeftColor:
            theme.line,
        },
      ]}
      onPress={
        onTodayPress
      }
    >
      <Text
        style={[
          styles.ledgerCompactLabel,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
      >
        오늘 사용 금액
      </Text>

      <Text
        style={[
          styles.ledgerCompactSubValue,
          {
            color:
              theme.text,
          },
        ]}
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
        minimumFontScale={
          0.7
        }
      >
        {formatMoney(
          todayExpense
        )}
        원
      </Text>

      <Text
        style={[
          styles.ledgerTodayDetailHint,
          {
            color:
              theme.subText,
          },
        ]}
      >
        눌러서 내역 보기
      </Text>
    </Pressable>
  </View>

  {/* 내역 추가 */}
  <Pressable
    style={
      styles.ledgerTodayInlineAdd
    }
    onPress={
      onAddPress
    }
  >
    <Text
      style={[
        styles.ledgerTodayInlineAddText,
        {
          color:
            theme.text,
        },
      ]}
    >
      ＋ 내역 추가
    </Text>
  </Pressable>
</View>
  </View>
)}
    </View>
  );
}



/* H. 식단 & 몸 기록 */
interface MealSectionProps {
  showMeal: boolean;
  setShowMeal: (v: boolean) => void;
  todayMeals: Record<string, MealItem[]>;
  totalCalories: number;
  totalPrice: number;
  onAddMealPress: (key: string) => void;

  onEditMeal:
  (
    mk: string,
    item: MealItem
  ) => void;
  onDeleteMeal: (mk: string, id: string) => void;
  calorieProfile: CalorieProfile;
  weightEnabled: boolean;
  setWeightEnabled: (v: boolean) => void;
  weightLogs: WeightLog[];
  todayKey: string;
  onSaveWeight: (logs: WeightLog[]) => void;
  scrollRef: any;
  recommendedCalories: number;
  exerciseCalories: number;
  exerciseLogs: ExerciseCalorieLog[];
  onSettingPress: () => void;
  onAddExerciseCaloriesPress: () => void;
  }

function MealSection({
  showMeal,
  setShowMeal,
  todayMeals,
  totalCalories,
  totalPrice,
  onAddMealPress,
  onEditMeal,
  onDeleteMeal,
  calorieProfile,
  weightEnabled,
  setWeightEnabled,
  weightLogs,
  todayKey,
  onSaveWeight,
  scrollRef,
  recommendedCalories,
  exerciseCalories,
  exerciseLogs,
  onSettingPress,
  onAddExerciseCaloriesPress,
  }: MealSectionProps) {
  const { themeMode, theme } = useRootTheme();
  const isCityBlack = themeMode === 'cityBlack';
const [showWeightChart, setShowWeightChart] =
  useState(false);

const [showWeightInput, setShowWeightInput] =
  useState(false);

const [showMealPicker, setShowMealPicker] =
  useState(false);

const [showMealList, setShowMealList] =
  useState(false);

const [
  showExerciseList,
  setShowExerciseList,
] = useState(false);

  const remain = recommendedCalories > 0
    ? recommendedCalories + exerciseCalories - totalCalories
    : 0;

  const latestWeightLog = [...weightLogs].sort((a, b) => b.log_date.localeCompare(a.log_date))[0];
  const profileWeight = Number(calorieProfile.weight);
  const currentWeight = latestWeightLog?.weight ??
    (Number.isFinite(profileWeight) && profileWeight > 0 ? profileWeight : null);

  const openWeightChart = () => {
    if (!weightEnabled) setWeightEnabled(true);
    setShowWeightChart((value) => !value);
  };

  const openWeightInput = () => {
    if (!weightEnabled) setWeightEnabled(true);
    setShowWeightInput((value) => !value);
  };

const openMealEditFromList = (
  mealTypeKey: string,
  item: MealItem
) => {
  setShowMealList(
    false
  );

  requestAnimationFrame(
    () => {
      onEditMeal(
        mealTypeKey,
        item
      );
    }
  );
};

  return (
    <View style={[styles.mealSection, {
      backgroundColor: theme.card,
      borderColor: theme.line,
      borderWidth: 0.5,

borderRadius:
  isCityBlack
    ? 4
    : 12,

paddingHorizontal: 14,
paddingVertical: 8,

    }]}>
      <View
  style={[
    styles.mealSectionTopRow,
    {
      marginBottom:
        showMeal
          ? 10
          : 0,
    },
  ]}
>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🍽️ 식단 & 몸 기록</Text>
        <Pressable
          onPress={() => setShowMeal(!showMeal)}
          style={[styles.toggleOuter, {
            backgroundColor: showMeal ? theme.button : theme.card2,
            borderColor: showMeal ? theme.strongLine : theme.line,
            borderWidth: 0.3,
            borderRadius: isCityBlack ? 4 : 999,
          }]}
        >
          <View style={[styles.toggleInner, showMeal && styles.toggleInnerOn, {
            backgroundColor: showMeal ? theme.buttonText : theme.subText,
            borderRadius: isCityBlack ? 2 : 13,
          }]} />
        </Pressable>
      </View>

      {showMeal && (
        <View>
          <View style={[styles.bodySummaryCard, {
            backgroundColor: theme.card2,
            borderColor: theme.line,
            borderRadius: isCityBlack ? 4 : 16,
          }]}>
            <View style={styles.bodyProfileRow}>
              <Text style={[styles.bodyProfileText, { color: theme.text }]}>
                {calorieProfile.gender === 'male' ? '남자' : '여자'} ·{' '}
                {calorieProfile.age ? `${calorieProfile.age}세` : '나이 미설정'} ·{' '}
                {calorieProfile.height ? `${calorieProfile.height}cm` : '키 미설정'}
              </Text>
              <Pressable style={[styles.bodySmallButton, {
                backgroundColor: theme.card,
                borderColor: theme.line,
                borderRadius: isCityBlack ? 4 : 8,
              }]} onPress={onSettingPress}>
                <Text style={[styles.bodySmallButtonText, { color: theme.text }]}>설정</Text>
              </Pressable>
            </View>

            <View style={styles.bodyWeightRow}>
              <Text style={[styles.bodyWeightText, { color: theme.text }]}>현재 체중 {currentWeight ? `${currentWeight}kg` : '미설정'}</Text>
              <View style={styles.bodyWeightButtons}>
                <Pressable style={[styles.bodySmallButton, {
                  backgroundColor: showWeightChart ? theme.button : theme.card,
                  borderColor: showWeightChart ? theme.strongLine : theme.line,
                  borderRadius: isCityBlack ? 4 : 8,
                }]} onPress={openWeightChart}>
                  <Text style={[styles.bodySmallButtonText, {
                    color: showWeightChart ? theme.buttonText : theme.text,
                  }]}>변화 보기</Text>
                </Pressable>
                <Pressable style={[styles.bodySmallButton, {
                  backgroundColor: showWeightInput ? theme.button : theme.card,
                  borderColor: showWeightInput ? theme.strongLine : theme.line,
                  borderRadius: isCityBlack ? 4 : 8,
                }]} onPress={openWeightInput}>
                  <Text style={[styles.bodySmallButtonText, {
                    color: showWeightInput ? theme.buttonText : theme.text,
                  }]}>체중 입력</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.bodySummaryDivider, { backgroundColor: theme.line }]} />

            {/* 섭취 칼로리 */}
<View
  style={
    styles.bodyMetricRow
  }
>
  <Text
    style={[
      styles.bodyMetricLabel,
      {
        color:
          theme.subText,
      },
    ]}
  >
    섭취 칼로리
  </Text>

  <View
    style={
      styles.bodyMetricRight
    }
  >
    <Text
      style={[
        styles.bodyMetricValue,
        {
          color:
            theme.text,
        },
      ]}
    >
      {formatMoney(
        totalCalories
      )}{' '}
      kcal
    </Text>

    {/* 식단 추가 */}
    <Pressable
      style={[
        styles.bodyMetricButton,
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
      onPress={() =>
        setShowMealPicker(
          (value) =>
            !value
        )
      }
    >
      <Text
        style={[
          styles.bodyMetricButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        + 추가
      </Text>
    </Pressable>

    {/* 식단 목록 열기 */}
    <Pressable
      style={[
        styles.bodyMetricButton,
        {
          backgroundColor:
            showMealList
              ? theme.button
              : 'transparent',

          borderColor:
            showMealList
              ? theme.strongLine
              : theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 8,
        },
      ]}
      onPress={() =>
        setShowMealList(
          (value) =>
            !value
        )
      }
    >
      <Text
        style={[
          styles.bodyMetricButtonText,
          {
            color:
              showMealList
                ? theme.buttonText
                : theme.text,
          },
        ]}
      >
        목록
      </Text>
    </Pressable>
  </View>
</View>

{/* 운동 소모량 */}
<View
  style={
    styles.bodyMetricRow
  }
>
  <Text
    style={[
      styles.bodyMetricLabel,
      {
        color:
          theme.subText,
      },
    ]}
  >
    운동 소모량
  </Text>

  <View
    style={
      styles.bodyMetricRight
    }
  >
    <Text
      style={[
        styles.bodyMetricValue,
        {
          color:
            theme.text,
        },
      ]}
    >
      {formatMoney(
        exerciseCalories
      )}{' '}
      kcal
    </Text>

    {/* 운동 칼로리 직접 추가 */}
    <Pressable
      style={[
        styles.bodyMetricButton,
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
      onPress={
        onAddExerciseCaloriesPress
      }
    >
      <Text
        style={[
          styles.bodyMetricButtonText,
          {
            color:
              theme.text,
          },
        ]}
      >
        + 추가
      </Text>
    </Pressable>

    {/* 운동 목록 열기 */}
    <Pressable
      style={[
        styles.bodyMetricButton,
        {
          backgroundColor:
            showExerciseList
              ? theme.button
              : 'transparent',

          borderColor:
            showExerciseList
              ? theme.strongLine
              : theme.line,

          borderRadius:
            isCityBlack
              ? 4
              : 8,
        },
      ]}
      onPress={() =>
        setShowExerciseList(
          (value) =>
            !value
        )
      }
    >
      <Text
        style={[
          styles.bodyMetricButtonText,
          {
            color:
              showExerciseList
                ? theme.buttonText
                : theme.text,
          },
        ]}
      >
        목록
      </Text>
    </Pressable>
  </View>
</View>

            <View style={[styles.bodyRemainRow, { borderTopColor: theme.line }]}>
              <Text style={[styles.bodyRemainLabel, { color: theme.text }]}>남은 칼로리</Text>
              <Text style={[styles.bodyRemainValue, { color: theme.text }]}>
                {recommendedCalories > 0 ? `${formatMoney(remain)} kcal` : '-'}
              </Text>
            </View>

            {showMealPicker && (
  <View
    style={[
      styles.mealQuickPicker,
      {
        backgroundColor:
          'transparent',

        borderColor:
          theme.line,

        borderRadius:
          isCityBlack
            ? 4
            : 10,
      },
    ]}
  >
                {MEAL_TYPES.map((mealType) => (
                  <Pressable
                    key={mealType.key}
                    style={[styles.mealQuickPickerButton, {
                      borderColor: theme.line,
                      borderRadius: isCityBlack ? 4 : 8,
                    }]}
                    onPress={() => {
                      setShowMealPicker(false);
                      onAddMealPress(mealType.key);
                    }}
                  >
                    <Text style={[styles.mealQuickPickerText, { color: theme.text }]}>{mealType.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <WeightSection
            showChart={showWeightChart}
            showInput={showWeightInput}
            weightLogs={weightLogs}
            todayKey={todayKey}
            onSaveWeight={onSaveWeight}
            onInputSaved={() => setShowWeightInput(false)}
            scrollRef={scrollRef}
          />
 {/* 섭취 칼로리 목록 */}
          {showMealList && (
            <View
              style={[
                styles.compactRecordCard,
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
              <View
                style={
                  styles.compactRecordHeader
                }
              >
                <Text
                  style={[
                    styles.compactRecordTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  오늘의 식단
                </Text>

                <Text
                  style={[
                    styles.compactRecordTotal,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {formatMoney(
                    totalCalories
                  )}{' '}
                  kcal
                </Text>
              </View>

              {MEAL_TYPES.map(
                (mealType) => {
                  const items =
                    todayMeals[
                      mealType.key
                    ] ?? [];

                  const calories =
                    items.reduce(
                      (
                        sum,
                        item
                      ) =>
                        sum +
                        item.calories,
                      0
                    );

                  return (
                    <View
                      key={
                        mealType.key
                      }
                    >
                      <View
                        style={[
                          styles.compactMealRow,
                          {
                            borderTopColor:
                              theme.line,
                          },
                        ]}
                      >
                        <Text
                          style={
                            styles.compactMealEmoji
                          }
                        >
                          {
                            mealType.emoji
                          }
                        </Text>

                        <Text
                          style={[
                            styles.compactMealLabel,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {
                            mealType.label
                          }
                        </Text>

                        <Text
                          style={[
                            styles.compactMealCalories,
                            {
                              color:
                                theme.subText,
                            },
                          ]}
                        >
                          {formatMoney(
                            calories
                          )}{' '}
                          kcal
                        </Text>

                      </View>

                      {items.map(
  (item) => (
    <View
      key={
        item.id
      }
      style={[
        styles.compactMealDetail,
        {
          borderTopColor:
            theme.line,
        },
      ]}
    >
      <Text
        style={[
          styles.compactMealDetailName,
          {
            color:
              theme.text,
          },
        ]}
        numberOfLines={
          1
        }
        ellipsizeMode="tail"
      >
        {item.name ||
          '음식'}
      </Text>

      <Text
        style={[
          styles.compactMealDetailMeta,
          {
            color:
              theme.subText,
          },
        ]}
        numberOfLines={
          1
        }
      >
        {formatMoney(
          item.calories
        )}{' '}
        kcal ·{' '}
        {formatMoney(
          item.price
        )}
        원
      </Text>

      <View
  style={{
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      10,

    marginLeft:
      8,
  }}
>
  <Pressable
    onPress={() =>
      openMealEditFromList(
        mealType.key,
        item
      )
    }
    hitSlop={
      8
    }
  >
    <Text
      style={[
        styles.compactDeleteText,
        {
          color:
            theme.text,
        },
      ]}
    >
      수정
    </Text>
  </Pressable>

  <Pressable
    onPress={() =>
      onDeleteMeal(
        mealType.key,
        item.id
      )
    }
    hitSlop={
      8
    }
  >
    <Text
      style={[
        styles.compactDeleteText,
        {
          color:
            theme.danger,
        },
      ]}
    >
      삭제
    </Text>
  </Pressable>
</View>
    </View>
  )
)}
                    </View>
                  );
                }
              )}

              {totalPrice > 0 && (
                <Text
                  style={[
                    styles.compactMealPrice,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  오늘 식비{' '}
                  {formatMoney(
                    totalPrice
                  )}
                  원
                </Text>
              )}
            </View>
          )}

          {/* 운동 소모량 목록 */}
          {showExerciseList && (
            <View
              style={[
                styles.compactRecordCard,
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
              <View
                style={
                  styles.compactRecordHeader
                }
              >
                <Text
                  style={[
                    styles.compactRecordTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  오늘의 운동
                </Text>

                <Text
                  style={[
                    styles.compactRecordTotal,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {formatMoney(
                    exerciseCalories
                  )}{' '}
                  kcal
                </Text>
              </View>

              {exerciseLogs.length ===
              0 ? (
                <Text
                  style={[
                    styles.compactEmptyText,
                    {
                      color:
                        theme.subText,
                    },
                  ]}
                >
                  오늘 기록된 운동이
                  없습니다.
                </Text>
              ) : (
               exerciseLogs
  .map(
    (log) => (
      <View
        key={
          log.id
        }
        style={
          styles.compactExerciseRow
        }
      >
        <Text
          style={[
            styles.compactExerciseName,
            {
              color:
                theme.text,
            },
          ]}
          numberOfLines={
            1
          }
          ellipsizeMode="tail"
        >
          {log.title}
        </Text>

        <Text
          style={[
            styles.compactExerciseType,
            {
              color:
                theme.subText,
            },
          ]}
          numberOfLines={
            1
          }
        >
          {log.durationMinutes
            ? `${log.durationMinutes}분`
            : log.source ===
              'timer'
            ? '시간 기록'
            : '직접 입력'}
        </Text>

        <Text
          style={[
            styles.compactExerciseCalories,
            {
              color:
                theme.text,
            },
          ]}
          numberOfLines={
            1
          }
        >
          {formatMoney(
            log.calories
          )}{' '}
          kcal
        </Text>
      </View>
    )
  )
              )}

                       </View>
          )}
        </View>
      )}
    </View>
  );
}


// =========================================================================
// 6. 스타일시트 (Styles Definition)
// =========================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e9e0d2' },
  header: { paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 18, paddingBottom: 18, backgroundColor: '#e9e0d2', borderBottomWidth: 1, borderBottomColor: '#d6c7af', flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  dateBox: { flex: 1, alignItems: 'center' },
  dateText: { fontSize: 20, fontWeight: '700', color: '#5c3b1e' },
  todayText: { marginTop: 2, fontSize: 14, color: '#d27800', fontWeight: '700' },
  table: { marginTop: 24, marginHorizontal: 10, borderWidth: 1, borderColor: '#ccb89b' },
  headerRow: { flexDirection: 'row', backgroundColor: '#e8dcc7' },
   minuteRow: { flexDirection: 'row', backgroundColor: '#efe6d8' },
  timeHeader: {
  width: 60,

  paddingVertical: 8,
  paddingHorizontal: 4,

  textAlign: 'center',

  fontSize: 14,
  lineHeight: 18,
  fontWeight: '700',
},

periodHeader: {
  flex: 2,

  paddingVertical: 8,
  paddingHorizontal: 4,

  textAlign: 'center',

  fontSize: 14,
  lineHeight: 18,
  fontWeight: '700',
},

minuteEmpty: {
  width: 60,
  paddingVertical: 5,
},

minuteCell: {
  flex: 1,

  paddingVertical: 5,

  textAlign: 'center',

  fontSize: 12,
  lineHeight: 16,
},
   row: { flexDirection: 'row' },
 timeCell: {
  width: 60,
  height: 24,

  borderWidth: 0.5,
  borderColor: '#ccb89b',

  justifyContent: 'center',
  alignItems: 'center',
},

timeText: {
  fontSize: 14,
  lineHeight: 18,
  fontWeight: '700',
},

cell: {
  flex: 1,
  height: 24,

  borderWidth: 0.5,
  borderColor: '#ccb89b',

  justifyContent: 'center',
  alignItems: 'center',

  paddingHorizontal: 2,
},

plus: {
  fontSize: 15,
  lineHeight: 18,
},

cellText: {
  fontSize: 9,
  lineHeight: 12,

  fontWeight: '700',
  textAlign: 'center',
},
 
todoSection: {
  width: '90%',
  maxHeight: '78%',

  marginTop: 0,
  marginHorizontal: 0,
},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
 sectionTitle: {
  flex: 1,

  fontSize: 15,
  lineHeight: 20,
  fontWeight: '800',

  color: '#3d2515',
},
  smallButton: { backgroundColor: '#ded0bb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  smallButtonText: { fontSize: 14, color: '#6a421f', fontWeight: '700' },
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#c9ab89', borderRadius: 18, paddingVertical: 24, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  emptyText: { fontSize: 16, color: '#8b6b45' },
  todoCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#e6dccd',
  borderRadius: 16,
  paddingVertical: 10,
  paddingHorizontal: 14,
  marginBottom: 6,
},
  todoCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#c4a77f', justifyContent: 'center', alignItems: 'center', backgroundColor: '#efe8dc' },
  todoCircleDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  todoCheck: { color: '#fff', fontSize: 16, fontWeight: '800' },
  todoText: { flex: 1, marginLeft: 12, fontSize: 16, color: '#4d2f17' },
  todoTextDone: { textDecorationLine: 'line-through', color: '#7d6a56' },
  todoIconButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  todoIcon: { fontSize: 18, color: '#6a421f' },
  waterSection: { marginTop: 12, marginHorizontal: 12 },
  waterCard: { marginTop: 10, backgroundColor: '#fff8ec', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#d8b56c' },
  waterAmount: {
  fontSize: 18,
  lineHeight: 24,
  fontWeight: '900',
},

waterFlowerRow: {
  width: '100%',

  marginTop: 10,

  flexDirection: 'row',
  flexWrap: 'nowrap',

  alignItems: 'center',
  justifyContent: 'space-between',
},

waterFlower: {
  flex: 1,
  minWidth: 0,

  fontSize: 18,
  lineHeight: 24,

  textAlign: 'center',
},

waterFlowerEmpty: {
  opacity: 0.2,
},
waterButtonRow: {
  width: '100%',
  marginTop: 12,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 6,
},

waterActionButton: {
  flex: 1,
  minWidth: 0,

  height: 30,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',

  paddingHorizontal: 3,
},

waterQuickText: {
  width: '100%',

  fontSize: 11,
  lineHeight: 14,
  fontWeight: '900',

  textAlign: 'center',
},
  waterGoalBanner: { marginTop: 12, backgroundColor: '#fff2b8', color: '#8b5a2b', fontSize: 14, fontWeight: '900', padding: 10, borderRadius: 12, textAlign: 'center' },

  waterCustomRow: {
  width: '100%',

  marginTop: 8,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 6,
},

waterInput: {
  flex: 1,

  /*
   * 기존 44에서 축소
   */
  height: 32,

  paddingHorizontal: 10,
  paddingVertical: 0,

  borderWidth: 1,

  fontSize: 12,
  lineHeight: 15,
},

waterAddButton: {
  width: 68,
  height: 32,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',

  paddingHorizontal: 8,
},

waterAddText: {
  fontSize: 12,
  lineHeight: 15,
  fontWeight: '900',

  textAlign: 'center',
},

waterHistoryList: {
  marginTop: 8,

  gap: 4,
},

waterHistoryItem: {
  width: '100%',

  /*
   * 기존 최소 높이 42에서 축소
   */
  height: 32,

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',

  paddingHorizontal: 10,

  borderWidth: 1,
},

waterHistoryMainText: {
  flex: 1,
  minWidth: 0,

  fontSize: 12,
  lineHeight: 15,
  fontWeight: '800',
},

waterHistoryDeleteButton: {
  width: 42,
  height: 28,

  marginLeft: 6,

  alignItems: 'center',
  justifyContent: 'center',
},

waterHistoryDeleteText: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '900',
},

 toggleOuter: {
  width: 44,
  height: 24,

  padding: 3,

  justifyContent: 'center',
},

toggleOuterOn: {
  backgroundColor: '#8b5424',
},

toggleInner: {
  width: 18,
  height: 18,

  borderRadius: 9,
},

toggleInnerOn: {
  alignSelf: 'flex-end',
},
  weightCurrentValue: { fontSize: 28, fontWeight: '900', color: '#5f3b1b' },
  weightDiffText: { fontSize: 16, fontWeight: '700' },
  weightUpText: { color: '#dc2626' },
  weightDownText: { color: '#2563eb' },
  weightModeRow: { flexDirection: 'row', marginVertical: 10, gap: 4 },
  weightModeButton: { flex: 1, backgroundColor: '#efe3cf', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  weightModeButtonSelected: { backgroundColor: '#9c651f' },
  weightInput: { backgroundColor: '#f7f0e5', borderRadius: 12, padding: 12, fontSize: 16, color: '#3d2515', marginVertical: 8, borderWidth: 0.3, borderColor: '#ccb89b' },
  weightSaveButton: { backgroundColor: '#9c651f', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  weightEmptyText: { color: '#8b6a45', textAlign: 'center', marginVertical: 10 },
  sleepSection: { marginTop: 12, marginHorizontal: 12 },
  sleepCard: { backgroundColor: '#e6dccd', borderRadius: 20, padding: 16, marginTop: 10 },
 
  storySection: { marginTop: 12, marginHorizontal: 12 },
  storyCard: { backgroundColor: '#fff8ec', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#d8b56c' },
  storyTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  storyMiniEditButton: { backgroundColor: '#ded0bb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  storyPreview: { fontSize: 16, color: '#5c3b1e', lineHeight: 22 },
  ledgerSection: { marginTop: 12, marginHorizontal: 12 },
  ledgerSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  expenseBox: { flex: 1, backgroundColor: '#fff1f2', borderRadius: 14, padding: 14 },
  incomeBox: { flex: 1, backgroundColor: '#ecfdf5', borderRadius: 14, padding: 14 },
  summaryLabel: { fontSize: 14, color: '#7d6a56' },
  expenseText: { fontSize: 18, fontWeight: '800', color: '#ef4444' },
  incomeText: { fontSize: 18, fontWeight: '800', color: '#22c55e' },
  ledgerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6dccd', borderRadius: 14, padding: 12, marginBottom: 8 },
  ledgerMemo: { fontSize: 16, fontWeight: '700', color: '#4d2f17' },
  ledgerCategory: { fontSize: 12, color: '#7d6a56' },
  ledgerAmount: { fontSize: 16, fontWeight: '700', marginRight: 8 },
  mealSection: { marginTop: 12, marginHorizontal: 12 },
  calorieBox: { backgroundColor: '#fffaf0', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d6c7af' },
  calorieTitle: { fontSize: 18, fontWeight: '800', color: '#3d2515' },
  calorieSettingButton: { backgroundColor: '#ded0bb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  calorieEmpty: { fontSize: 14, color: '#7d6a56' },
  mealRecommendBox: { backgroundColor: '#fff8e8', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ccb89b' },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionText: { fontSize: 15, fontWeight: '800', color: '#4a2f1b' },
  toggleButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#c8b89f' },
  toggleButtonOn: { backgroundColor: '#7b5a35' },
  mealModeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#eadcc4', marginRight: 4, marginBottom: 4 },
  mealModeButtonActive: { backgroundColor: '#7b5a35' },
  excludeButton: { marginTop: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f4ead8', alignItems: 'center' },
  recommendMainButton: { marginTop: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#8a6035', alignItems: 'center' },
  recommendedMenuList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  recommendedMenuChip: { backgroundColor: '#f1e5cf', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  recommendedMenuChipText: { color: '#4a2f1b', fontSize: 13, fontWeight: '700' },
  mealCard: { backgroundColor: '#e6dccd', borderRadius: 18, padding: 14, marginBottom: 10 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealTitle: { fontSize: 16, fontWeight: '800', color: '#3d2515' },
  mealItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#efe8dc', borderRadius: 12, padding: 10, marginTop: 8 },
  mealImage: { width: 44, height: 44, borderRadius: 8, marginRight: 10 },
  mealName: { fontSize: 16, fontWeight: '800', color: '#3d2515' },
  mealMemo: { fontSize: 13, color: '#7d6a56' },
  mealMeta: { fontSize: 13, color: '#f97316', fontWeight: '600' },
  mealDelete: { fontSize: 24, color: '#6a421f', paddingHorizontal: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalBox: { width: '90%', backgroundColor: '#f8f3ea', borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, color: '#3d2515', marginBottom: 12, fontWeight: '700' },
  modalInput: { backgroundColor: '#fff8ee', borderWidth: 1, borderColor: '#ccb89b', borderRadius: 12, padding: 12, fontSize: 16, color: '#3d2515' },
  modalButtonRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
 
 compactProfileSelectBox: {
  minHeight: 40,

  paddingHorizontal: 12,
  paddingVertical: 0,

  justifyContent:
    'center',
},

compactGenderButton: {
  height: 36,

  paddingVertical: 0,

  justifyContent:
    'center',
},

compactModalInput: {
  height: 40,

  paddingHorizontal: 12,
  paddingVertical: 0,

  fontSize: 14,
},

compactModalButton: {
  flex: 1,

  height: 36,

  marginTop: 0,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

compactModalButtonText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',

  textAlign: 'center',
},

compactPhotoButton: {
  flex: 1,

  height: 36,

  paddingHorizontal: 8,
  paddingVertical: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

compactCloseButton: {
  width: 30,
  height: 30,

  alignItems: 'center',
  justifyContent: 'center',
},

  confirmButton: {
    flex: 1,
  backgroundColor: '#9c6228',
  borderRadius: 18,
  height: 56,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 12,
},
  confirmText: {
  color: '#ffffff',
    fontSize: 18,
  fontWeight: '700',
  textAlign: 'center',
},
  cancelButton: { flex: 1, backgroundColor: '#d8ccb8',borderRadius: 18,
  height: 56,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 12,},
  
  cancelText: { color: '#3d2515', fontSize: 16, fontWeight: '800' },
  todoModalInput: { height: 120,  borderWidth: 1, borderColor: '#ccb89b', borderRadius: 12, padding: 12, fontSize: 16, color: '#3d2515', textAlignVertical: 'top' },
  storyModalContainer: { flex: 1, backgroundColor: '#efe1b6', padding: 18 },
  storyModalContent: { paddingBottom: 40 },
  storyDate: { fontSize: 18, fontWeight: '700', color: '#6a421f', marginTop: 20 },
  storyBigTitle: { fontSize: 28, fontWeight: '900', color: '#5c3b1e', marginTop: 4 },
  storyLabel: { fontSize: 18, fontWeight: '800', color: '#6a421f', marginTop: 20, marginBottom: 10 },
storyEmojiGrid: {
  width: '100%',

  flexDirection: 'row',
  flexWrap: 'nowrap',

  alignItems: 'center',
  justifyContent: 'center',

  gap: 2,

  marginTop: 2,
  marginBottom: 8,
},

storyEmojiTouch: {
  width: 36,
  height: 36,

  alignItems: 'center',
  justifyContent: 'center',
},

storyEmojiText: {
  fontSize: 22,
  lineHeight: 28,

  opacity: 0.35,
},

storyEmojiTextSelected: {
  opacity: 1,

  transform: [
    {
      scale: 1.05,
    },
  ],
},
storyModalButtonRow: {
  width: '100%',

  marginTop: 12,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,
},

storyModalActionButton: {
  flex: 1,
  minWidth: 0,

  height: 34,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',

  paddingHorizontal: 6,
},

storyModalActionText: {
  width: '100%',

  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',

  textAlign: 'center',
},
  storyInputSmall: { minHeight: 150, borderWidth: 1.5, borderColor: '#d9ad57', borderRadius: 16, padding: 14, fontSize: 16, color: '#5b351a', backgroundColor: '#fff7df', marginBottom: 14 },
  storySaveButton: { backgroundColor: '#8b5424', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  storySaveText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  storyCancelButton: { backgroundColor: '#d9ccb6', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  storyCancelText: { color: '#5c3b1e', fontSize: 16, fontWeight: '700' },
  mealClose: { fontSize: 28, color: '#6a421f' },
  photoButtonRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  photoButton: { backgroundColor: '#ded0bb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  photoButtonText: { fontSize: 14, fontWeight: '800', color: '#3d2515' },
  mealPreviewImage: { width: '100%', height: 150, borderRadius: 14, marginBottom: 12 },
  mealInputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  mealHalfInput: { flex: 1 },
  profileSelectBox: { backgroundColor: '#fff8ee', borderWidth: 1, borderColor: '#ccb89b', borderRadius: 12, padding: 12, marginBottom: 8 },
  profileSelectText: { fontSize: 16, color: '#3d2515', fontWeight: '700' },
  genderRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  genderButton: { flex: 1, backgroundColor: '#ded0bb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  genderButtonOn: { backgroundColor: '#8b5424' },
  genderText: { fontSize: 15, fontWeight: '800' },
  genderTextOn: { color: '#fff' },
  numberPickerBox: { width: '80%', backgroundColor: '#efe8dc', borderRadius: 20, padding: 16, maxHeight: '70%' },
  numberPickerScroll: { maxHeight: 240, backgroundColor: '#fff8ee', borderRadius: 12, borderWidth: 1, borderColor: '#ccb89b' },
  numberPickerItem: { paddingVertical: 14, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#eadfca' },
  numberPickerText: { fontSize: 18, fontWeight: '700' },
  numberPickerCloseButton: { marginTop: 10, height: 48, borderRadius: 12, backgroundColor: '#ded0bb', justifyContent: 'center', alignItems: 'center' },
  monthModal: { flex: 1, backgroundColor: '#e9e0d2', padding: 16 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calendarTitle: { fontSize: 20, fontWeight: '800' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
calendarDay: {
  width: '14.28%',
  height: 58,

  justifyContent: 'center',
  alignItems: 'center',

  paddingHorizontal: 2,
},
  selectedCalendarDay: { backgroundColor: '#8b5424', borderRadius: 8 },
  calendarDayText: { fontSize: 16 },
  selectedCalendarDayText: { color: '#fff', fontWeight: '800' },
  otherMonthText: { color: '#b8aa98' },
  calendarOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'center',
  padding: 20,
},
colorGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 16,
  marginBottom: 20,
},

weeklyWeatherScroll: {
  marginTop: 18,
},

weeklyWeatherCard: {
  width: 92,
  marginRight: 10,
  padding: 12,
  borderRadius: 18,
  backgroundColor: '#f4e5c8',
  alignItems: 'center',
},

weeklyWeatherDate: {
  fontSize: 14,
  fontWeight: '800',
  color: '#6b4317',
},

weeklyWeatherIcon: {
  fontSize: 30,
  marginTop: 8,
},

weeklyWeatherLabel: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: '700',
  color: '#7b5a35',
},

weeklyWeatherTemp: {
  marginTop: 6,
  fontSize: 14,
  fontWeight: '900',
  color: '#2563eb',
},

colorCircle: {
  width: 42,
  height: 42,
  borderRadius: 21,
  borderWidth: 2,
  borderColor: '#d2b48c',
},

selectedColorCircle: {
  borderWidth: 4,
  borderColor: '#3d2515',
},
calendarBox: {
  backgroundColor: '#fffaf0',
  borderRadius: 24,
  padding: 20,
},

todoCalendarBox: {
  backgroundColor: '#f8f1e5',
  borderRadius: 24,
  borderWidth: 1.5,
  borderColor: '#d8b56c',
  padding: 14,
  marginBottom: 0,
},

todoCalendarHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
  paddingHorizontal: 18,
  paddingTop: 24,
},

todoCalendarTitle: {
    fontSize: 22,
  fontWeight: '900',
  color: '#5f3b1b',
},

reminderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 16,
},

reminderInput: {
  width: 80,
  height: 52,
  backgroundColor: '#fff8ee',
  borderWidth: 1,
  borderColor: '#ccb89b',
  borderRadius: 12,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: '800',
  color: '#3d2515',
},

todoReminderBox: {
  width: 54,
  alignItems: 'center',
  justifyContent: 'center',
},

todoReminderIcon: {
  fontSize: 18,
},

todoReminderTime: {
  marginTop: 2,
  fontSize: 10,
  fontWeight: '800',
  color: '#8b5424',
},

todoWeekRow: {
  flexDirection: 'row',
  marginBottom: 6,
},

todoWeekText: {
  flex: 1,
  textAlign: 'center',
  fontSize: 13,
  fontWeight: '900',
  color: '#8b6a45',
},

todoCalendarGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
},

todoCalendarDay: {
  width: '14.28%',
  minHeight: 70,
  borderWidth: 0.5,
  borderColor: '#ead8b6',
  padding: 4,
},

todoCalendarSelectedDay: {
  backgroundColor: '#efe3cf',
},

todoCalendarDayText: {
  fontSize: 13,
  fontWeight: '800',
  color: '#5f3b1b',
  marginBottom: 3,
},

todoCalendarTodayText: {
  color: '#c96a00',
  fontWeight: '900',
},

todoCalendarOtherMonthText: {
  color: '#c8bca8',
},
reminderPickerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 16,
  gap: 12,
},
reminderPicker: {
  width: 100,
  height: 150,

  borderWidth: 1,

  borderRadius: 16,
},

reminderPickerItem: {
  height: 44,
  justifyContent: 'center',
  alignItems: 'center',
},

reminderPickerText: {
  fontSize: 20,
  fontWeight: '800',
  color: '#6f4a25',
},

reminderPickerTextSelected: {
  color: '#fff',
},

reminderColon: {
  fontSize: 30,
  fontWeight: '900',
  color: '#5c3b1e',
},

disabledButton: {
  opacity: 0.4,
},
todoCalendarTodoBadge: {
  width: '100%',
  marginTop: 1,
  fontSize: 9,
  lineHeight: 12,
  fontWeight: '800',
  textAlign: 'left',
},

todoCalendarTodoDone: {
  opacity: 0.45,
  textDecorationLine: 'line-through',
},

todoCalendarMoreText: {
  fontSize: 9,
  color: '#8b6a45',
  marginTop: 2,
  fontWeight: '800',
},

selectedEmojiButton: {
  backgroundColor: '#f3d28b',
  borderColor: '#8b5424',
  borderWidth: 2,
},

weightGraph: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-around',
  marginTop: 20,
  height: 180,
},

sleepRunningText: {
  fontSize: 22,
  fontWeight: '800',
  color: '#3d2515',
  textAlign: 'center',
  marginTop: 12,
},

weatherCard: {
  marginTop: 18,
  backgroundColor: '#fff8ec',
  borderRadius: 24,
  padding: 20,
  borderWidth: 1.5,
  borderColor: '#d8b56c',
},

weatherTitle: {
  fontSize: 22,
  fontWeight: '900',
  color: '#5f3b1b',
  marginBottom: 12,
},

weatherTemp: {
  fontSize: 38,
  fontWeight: '900',
  color: '#2563eb',
},

weatherText: {
  marginTop: 6,
  fontSize: 16,
  fontWeight: '700',
  color: '#8b5a2b',
},
sleepSummaryText: {
  width: '100%',

  fontSize: 16,
  lineHeight: 22,
  fontWeight: '900',
},

sleepRunningLine: {
  width: '100%',

  marginTop: 8,

  fontSize: 14,
  lineHeight: 19,
  fontWeight: '800',
},

sleepActionRow: {
  width: '100%',

  marginTop: 12,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,
},

sleepActionButton: {
  flex: 1,
  minWidth: 0,

  height: 32,

  borderWidth: 1,

  paddingHorizontal: 4,

  alignItems: 'center',
  justifyContent: 'center',
},

sleepActionButtonText: {
  width: '100%',

  fontSize: 12,
  lineHeight: 15,
  fontWeight: '900',

  textAlign: 'center',
},

sleepHistoryList: {
  width: '100%',

  marginTop: 12,

  gap: 6,
},

sleepHistoryItem: {
  width: '100%',

  minHeight: 42,

  paddingVertical: 7,
  paddingHorizontal: 10,

  borderWidth: 1,

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',

  gap: 10,
},

sleepHistoryDate: {
  flexShrink: 0,

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '700',
},

sleepHistoryValue: {
  flex: 1,

  fontSize: 14,
  lineHeight: 19,
  fontWeight: '800',

  textAlign: 'right',
},

sleepHistoryEmpty: {
  paddingVertical: 8,

  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',

  textAlign: 'center',
},

weightBarWrap: {
  alignItems: 'center',
  flex: 1,
},

weightBar: {
  width: 24,
  backgroundColor: '#4f8cff',
  borderRadius: 8,
},

weightBarLabel: {
  fontSize: 11,
  marginBottom: 4,
  color: '#3d2515',
},

weightDateLabel: {
  fontSize: 10,
  marginTop: 4,
  color: '#777',
},

stepCard: {
  marginTop: 12,
  marginHorizontal: 12,
  padding: 18,
  borderRadius: 20,
  backgroundColor: '#fff8e8',
  borderWidth: 1,
  borderColor: '#d6c7af',
},
stepMainText: {
  fontSize: 30,
  fontWeight: '900',
  color: '#3d2515',
  textAlign: 'center',
},
stepPointText: {
  marginTop: 8,
  fontSize: 18,
  fontWeight: '800',
  color: '#7b5a35',
  textAlign: 'center',
},
stepSubText: {
  marginTop: 6,
  fontSize: 14,
  color: '#8a745d',
  textAlign: 'center',
},
stepProgressOuter: {
  marginTop: 16,
  height: 14,
  borderRadius: 999,
  backgroundColor: '#eadcc8',
  overflow: 'hidden',
},
stepProgressInner: {
  height: '100%',
  borderRadius: 999,
  backgroundColor: '#7b5a35',
},
calorieSummaryList: {
  marginTop: 10,
  gap: 8,
},

calorieInfoRow: {
  minHeight: 26,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

calorieInfoLabel: {
  fontSize: 14,
  fontWeight: '700',
},

calorieInfoValue: {
  fontSize: 15,
  fontWeight: '800',
  textAlign: 'right',
},

calorieActionRow: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  marginTop: 1,
},

calorieRemainRow: {
  marginTop: 4,
  paddingTop: 11,
  borderTopWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

calorieRemainLabel: {
  fontSize: 14,
  fontWeight: '800',
},

calorieRemainValue: {
  fontSize: 18,
  fontWeight: '900',
  textAlign: 'right',
},

smallAddButton: {
  backgroundColor: '#8b5a2b',

  paddingHorizontal: 12,
  paddingVertical: 6,

  borderRadius: 10,
  marginLeft: 6,
},

smallAddButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '700',
},
weatherToggleCard: {
  marginTop: 20,
  backgroundColor: '#fff8ec',
  borderRadius: 20,
  padding: 16,
  borderWidth: 1.5,
  borderColor: '#d8b56c',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

weatherToggleTitle: {
  fontSize: 20,
  fontWeight: '900',
  color: '#5f3b1b',
},

weatherToggleButton: {
  backgroundColor: '#e5d6b8',
  borderRadius: 999,
  paddingHorizontal: 22,
  paddingVertical: 10,
},

weatherToggleButtonOn: {
  backgroundColor: '#16a34a',
},

weatherToggleButtonText: {
  fontSize: 16,
  fontWeight: '900',
  color: '#7a4c1f',
},

weatherToggleButtonTextOn: {
  color: '#fff',
},
hourlyWeatherRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#ead8b8',
},

hourlyWeatherTime: {
  width: 60,
  fontSize: 16,
  fontWeight: '900',
  color: '#5f3b1b',
},

hourlyWeatherIcon: {
  width: 42,
  fontSize: 24,
},
weeklyWeatherRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 14,
},
hourlyWeatherText: {
  flex: 1,
  fontSize: 16,
  fontWeight: '800',
  color: '#7a4c1f',
},
weatherModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

weatherModalCloseButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#efe1c8',
},

weatherModalCloseText: {
  fontSize: 26,
  fontWeight: '900',
  color: '#5a351f',
  lineHeight: 30,
},

weatherNowGuide: {
  fontSize: 15,
  fontWeight: '700',
  color: '#9a7244',
  marginBottom: 12,
},

hourlyWeatherScroll: {
  maxHeight: 430,
  width: '100%',
},

hourlyWeatherScrollContent: {
  paddingBottom: 24,
},

currentHourlyWeatherRow: {
  backgroundColor: '#fff3d6',
  borderRadius: 18,
  paddingHorizontal: 10,
},
weatherSection: {
  marginTop: 12,
  marginHorizontal: 12,
},

weatherSectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 12,
  marginBottom: 12,
},

weatherInnerBox: {
  backgroundColor: '#fff8ec',
  borderRadius: 20,

  paddingHorizontal: 12,
  paddingVertical: 14,

  borderWidth: 1,
  borderColor: '#d8b56c',
},
weatherHourButton: {
  backgroundColor: '#8b5a2b',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 12,
},

weatherHourButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '900',
},


weatherInfoText: {
  fontSize: 17,
  fontWeight: '800',
  color: '#5f3b1b',
  marginTop: 4,
},

timeGridSection: {
  marginTop: 12,
},

weatherCurrentLine: {
  width: '100%',
  paddingHorizontal: 2,
  marginBottom: 12,
},

weatherCurrentLineText: {
  width: '100%',

  fontSize: 15,
  lineHeight: 21,
  fontWeight: '900',

  flexShrink: 1,
},

weatherWeekRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'stretch',

  gap: 3,
},

weatherDayMiniCard: {
  flex: 1,
  minWidth: 0,

  paddingVertical: 7,
  paddingHorizontal: 0,

  alignItems: 'center',
  justifyContent: 'center',
},

weatherDayDate: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '900',

  marginBottom: 2,
},

weatherDayIcon: {
  fontSize: 19,
  lineHeight: 24,

  marginBottom: 2,
},

weatherDayTemp: {
  width: '100%',

  fontSize: 9,
  lineHeight: 12,
  fontWeight: '900',

  textAlign: 'center',
  letterSpacing: -0.3,
},

timeGridSectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 24,
  marginBottom: 12,
},
mealProfileSummaryBox: {
  backgroundColor: '#fffaf0',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 14,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#d6c7af',
},

mealProfileSummaryText: {
  fontSize: 15,
  fontWeight: '800',
  color: '#4d2f17',
},

mealProfileWeightText: {
  marginTop: 8,
  fontSize: 20,
  fontWeight: '900',
  color: '#6b3f18',
},

weightMiniTitle: {
  fontSize: 16,
  fontWeight: '900',
  color: '#4d2f17',
  marginBottom: 4,
},
weightCard: {
  backgroundColor: '#fffaf0',
  borderRadius: 24,
  padding: 18,
  marginBottom: 16,
  borderWidth: 2,
  borderColor: '#d6b56d',
},

weightInlineSection: {
  marginBottom: 12,
},
sleepHistoryTitle: {
  marginBottom: 2,

  fontSize: 13,
  lineHeight: 18,
  fontWeight: '900',
},
storyWriteButton: {
  width: '100%',
  height: 32,

  marginTop: 2,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',

  paddingHorizontal: 8,
},

storyWriteButtonText: {
  width: '100%',

  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',

  textAlign: 'center',
},

ledgerCompactRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'stretch',

  gap: 8,

  marginBottom: 8,
},

ledgerCompactMain: {
  flex: 1,
  minWidth: 0,

  minHeight: 56,

  paddingHorizontal: 12,
  paddingVertical: 8,

  borderWidth: 1,

  justifyContent: 'center',
},

ledgerCompactDetailRow: {
  width: '100%',
  minHeight: 56,

  marginBottom: 8,

  paddingHorizontal: 12,
  paddingVertical: 8,

  borderWidth: 1,

  flexDirection: 'row',
  alignItems: 'center',
},

ledgerCompactLabel: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
},

ledgerCompactValue: {
  width: '100%',

  marginTop: 2,

  fontSize: 19,
  lineHeight: 24,
  fontWeight: '900',
},

ledgerCompactSubValue: {
  width: '100%',

  marginTop: 2,

  fontSize: 16,
  lineHeight: 21,
  fontWeight: '900',
},

ledgerCalendarButton: {
  width: 58,
  minHeight: 56,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerCalendarButtonText: {
  marginTop: 1,

  fontSize: 10,
  lineHeight: 13,
  fontWeight: '900',
},

ledgerAddButton: {
  width: 106,
  minHeight: 56,

  paddingHorizontal: 5,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerAddButtonText: {
  width: '100%',

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',

  textAlign: 'center',
},

ledgerDetailModalBox: {
  width: '92%',
  maxHeight: '84%',

  padding: 16,

  borderWidth: 1,
},

ledgerDetailHeader: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',

  marginBottom: 12,
},

ledgerDetailTitle: {
  fontSize: 20,
  lineHeight: 26,
  fontWeight: '900',
},

ledgerDetailDateRange: {
  marginTop: 2,

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
},

ledgerDetailSummaryRow: {
  width: '100%',

  flexDirection: 'row',
  gap: 8,

  marginBottom: 10,
},

ledgerDetailSummaryCard: {
  flex: 1,
  minWidth: 0,

  paddingVertical: 9,
  paddingHorizontal: 10,

  borderWidth: 1,
},

ledgerDetailSummaryLabel: {
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '800',
},

ledgerDetailSummaryValue: {
  width: '100%',

  marginTop: 3,

  fontSize: 15,
  lineHeight: 20,
  fontWeight: '900',
},

ledgerDetailBudgetBanner: {
  width: '100%',

  marginBottom: 8,

  paddingVertical: 9,
  paddingHorizontal: 10,

  borderWidth: 1,

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

ledgerDetailBudgetLabel: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
},

ledgerDetailBudgetValue: {
  fontSize: 16,
  lineHeight: 21,
  fontWeight: '900',
},

ledgerDetailScroll: {
  width: '100%',
  maxHeight: 360,
},

ledgerDetailDateGroup: {
  width: '100%',

  marginBottom: 10,
},

ledgerDetailDateTitle: {
  marginBottom: 5,

  fontSize: 13,
  lineHeight: 18,
  fontWeight: '900',
},

ledgerDetailItem: {
  width: '100%',

  marginBottom: 6,

  paddingHorizontal: 10,
  paddingVertical: 7,

  borderWidth: 1,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 6,
},

ledgerDetailAmount: {
  minWidth: 80,

  fontSize: 12,
  lineHeight: 17,
  fontWeight: '900',

  textAlign: 'right',
},

ledgerDetailMemo: {
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '900',
},

ledgerDetailCategory: {
  marginTop: 1,

  fontSize: 10,
  lineHeight: 14,
  fontWeight: '700',
},

ledgerDetailEmpty: {
  paddingVertical: 28,

  fontSize: 13,
  lineHeight: 18,
  fontWeight: '800',

  textAlign: 'center',
},

ledgerDetailCloseButton: {
  width: '100%',
  height: 34,

  marginTop: 8,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerDetailCloseText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
},

ledgerBudgetModalGuide: {
  marginBottom: 10,

  fontSize: 13,
  lineHeight: 19,
  fontWeight: '700',
},

ledgerBudgetPreview: {
  marginTop: 8,

  fontSize: 18,
  lineHeight: 24,
  fontWeight: '900',

  textAlign: 'center',
},
ledgerSingleBox: {
  width: '100%',

  borderWidth: 1,

  overflow: 'hidden',
},

ledgerSingleRow: {
  width: '100%',
  minHeight: 62,

  paddingHorizontal: 12,

  flexDirection: 'row',
  alignItems: 'center',
},

ledgerSingleMain: {
  flex: 1,
  minWidth: 0,

  paddingVertical: 10,

  justifyContent: 'center',
},

ledgerPeriodRow: {
  minHeight: 82,
},

ledgerPeriodSummaryRow: {
  flex: 1,
  minWidth: 0,

  flexDirection: 'row',
  alignItems: 'flex-start',

  gap: 10,

  paddingVertical: 10,
},

ledgerSummaryCalendarSpace: {
  paddingRight: 64,
},

ledgerPeriodSummaryItem: {
  flex: 1,
  minWidth: 0,

  paddingVertical: 2,

  justifyContent: 'flex-start',
},

ledgerPeriodExpenseItem: {
  borderLeftWidth: 0.5,

  paddingLeft: 10,
},


ledgerSingleCalendarAction: {
  width: 64,
  minHeight: 50,

  marginRight: -8,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerSingleActionText: {
  marginTop: 2,

  fontSize: 10,
  lineHeight: 13,
  fontWeight: '900',
},

ledgerSingleAddAction: {
  width: 108,
  minHeight: 50,

  alignItems: 'center',
  justifyContent: 'center',

  paddingHorizontal: 4,
},

ledgerSingleAddText: {
  width: '100%',

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',

  textAlign: 'center',
},
ledgerModalTitle: {
  marginBottom: 12,

  fontSize: 18,
  lineHeight: 24,
  fontWeight: '900',
},

ledgerCategoryScroll: {
  width: '100%',
  marginBottom: 12,
},

ledgerCategoryRow: {
  flexDirection: 'row',
  alignItems: 'center',

  gap: 5,

  paddingRight: 4,
},

ledgerCategoryButton: {
  height: 30,

  paddingHorizontal: 9,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerCategoryText: {
  fontSize: 12,
  lineHeight: 15,
  fontWeight: '800',
},

ledgerModalButtonRow: {
  width: '100%',

  marginTop: 12,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,
},

ledgerModalActionButton: {
  flex: 1,
  minWidth: 0,

  height: 36,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',

  paddingHorizontal: 6,
},

ledgerModalActionText: {
  width: '100%',

  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',

  textAlign: 'center',
},
ledgerModalOverlay: {
  paddingHorizontal: 6,
},

ledgerModalBox: {
  width: '100%',
  maxWidth: '100%',

  paddingHorizontal: 16,
  paddingVertical: 18,
},
ledgerModalInput: {
  width: '100%',
  height: 44,

  paddingVertical: 0,
  paddingHorizontal: 12,

  fontSize: 15,
  lineHeight: 19,

  textAlignVertical: 'center',
},

ledgerTodayContent: {
  width: '100%',
  minHeight: 96,

  paddingHorizontal: 12,
  paddingVertical: 10,

  justifyContent:
    'center',
},

ledgerTodayAmountRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems:
    'flex-start',

  gap: 10,
},

ledgerTodaySummaryItem: {
  flex: 1,
  minWidth: 0,

  paddingVertical: 2,
},

ledgerTodayExpenseItem: {
  borderLeftWidth: 0.5,

  paddingLeft: 10,
},

ledgerTodayDetailHint: {
  marginTop: 3,

  fontSize: 9,
  lineHeight: 12,
  fontWeight: '700',
},

ledgerTodayInlineAdd: {
  height: 28,
    marginTop: -40,
  paddingHorizontal: 6,
  alignSelf:    'flex-end',
  alignItems: 'center',
  justifyContent:    'center',
},

ledgerTodayInlineAddText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',
},

ledgerCategoryFilterScroll: {
  width: '100%',

  marginBottom: 9,

  flexGrow: 0,
},

ledgerCategoryFilterContent: {
  paddingRight: 4,

  gap: 6,
},

ledgerCategoryFilterButton: {
  height: 30,

  paddingHorizontal: 10,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerCategoryFilterText: {
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '900',
},

ledgerDetailCategoryInline: {
  width: 34,

  fontSize: 11,
  lineHeight: 16,
  fontWeight: '800',
},

ledgerDetailMemoInline: {
  flex: 1,
  minWidth: 0,

  fontSize: 12,
  lineHeight: 17,
  fontWeight: '900',
},

ledgerDetailDeleteText: {
  fontSize: 11,
  lineHeight: 16,
  fontWeight: '900',
},
ledgerMonthSummaryCard: {
  width: '100%',

  paddingHorizontal: 14,
  paddingVertical: 6,

  marginBottom: 12,

  borderWidth: 1,
},

ledgerMonthSummaryLine: {
  width: '100%',
  minHeight: 42,

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

ledgerMonthSummaryDivider: {
  borderTopWidth: 0.5,
},

ledgerMonthSummaryLabel: {
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '800',
},

ledgerMonthSummaryValue: {
  maxWidth: '62%',

  fontSize: 15,
  lineHeight: 20,
  fontWeight: '900',

  textAlign: 'right',
},


ledgerCalendarWeekdayRow: {
  width: '100%',

  flexDirection: 'row',

  marginTop: 4,
  marginBottom: 3,
},

ledgerCalendarWeekdayText: {
  width: '14.28%',

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',

  textAlign: 'center',
},

/*
 * 월 가계부 달력 전용 날짜 칸
 */
ledgerMonthCalendarDay: {
  height: 43,

  justifyContent: 'flex-start',
  alignItems: 'stretch',

  paddingHorizontal: 4,
  paddingTop: 2,
  paddingBottom: 1,

  overflow: 'hidden',
},

ledgerMonthCalendarDateText: {
  width: '100%',

  fontSize: 13,
  lineHeight: 15,
  fontWeight: '900',

  textAlign: 'left',
  includeFontPadding: false,
},

ledgerCalendarAmountBox: {
  width: '100%',

  // 날짜 바로 아래에 붙임
  marginTop: 0,

  justifyContent: 'flex-start',
},

ledgerCalendarIncome: {
  width: '100%',

  fontSize: 8,
  lineHeight: 10,
  fontWeight: '900',

  textAlign: 'left',
  includeFontPadding: false,
},

ledgerCalendarExpense: {
  width: '100%',

  // 수입과 지출 사이의 불필요한 간격 제거
  marginTop: 0,

  fontSize: 8,
  lineHeight: 10,
  fontWeight: '900',

  textAlign: 'left',
  includeFontPadding: false,
},

/*
 * 카테고리별 원그래프
 */
ledgerCategoryChartCard: {
  width: '100%',

  marginTop: 18,
  marginBottom: 24,

  padding: 14,

  borderWidth: 1,
},

ledgerCategoryChartTitle: {
  fontSize: 16,
  lineHeight: 21,
  fontWeight: '900',

  marginBottom: 10,
},

ledgerCategoryChartEmpty: {
  paddingVertical: 24,

  fontSize: 12,
  lineHeight: 17,
  fontWeight: '800',

  textAlign: 'center',
},

ledgerCategoryChartContent: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',
},

ledgerCategoryDonutWrap: {
  width: 156,
  height: 156,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerCategoryDonutCenter: {
  position: 'absolute',

  width: 88,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerCategoryDonutLabel: {
  fontSize: 10,
  lineHeight: 14,
  fontWeight: '800',
},

ledgerCategoryDonutAmount: {
  width: '100%',

  marginTop: 2,

  fontSize: 13,
  lineHeight: 18,
  fontWeight: '900',

  textAlign: 'center',
},

ledgerCategoryLegend: {
  flex: 1,
  minWidth: 0,

  marginLeft: 10,
},

ledgerCategoryLegendItem: {
  width: '100%',

  minHeight: 30,

  flexDirection: 'row',
  alignItems: 'center',
},

ledgerCategoryLegendDot: {
  width: 9,
  height: 9,

  borderRadius: 999,

  marginRight: 7,
},
ledgerCategoryLegendTextBox: {
  flex: 1,
  minWidth: 0,

  flexDirection: 'row',
  alignItems: 'center',
},

ledgerCategoryLegendLabel: {
  width: 30,
  flexShrink: 0,

  fontSize: 10,
  lineHeight: 14,
  fontWeight: '800',
},

ledgerCategoryLegendAmount: {
  flex: 1,
  minWidth: 0,

  marginLeft: 4,

  fontSize: 10,
  lineHeight: 14,
  fontWeight: '900',

  textAlign: 'right',
  includeFontPadding: false,
},
ledgerTypeRow: {
  width: '100%',

  flexDirection: 'row',
  gap: 6,

  marginBottom: 8,
},

ledgerTypeButton: {
  flex: 1,

  height: 34,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerTypeText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',
},
todoPopupCloseButton: {
  width: 34,
  height: 34,

  marginLeft: 4,

  alignItems: 'center',
  justifyContent: 'center',
},

todoPopupList: {
  width: '100%',
  maxHeight: 430,
},
todoPopupAddButton: {
  height: 30,

  paddingHorizontal: 10,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

todoPopupAddButtonText: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '800',
},

todoPopupRow: {
  width: '100%',
  minHeight: 38,

  flexDirection: 'row',
  alignItems: 'center',

  paddingHorizontal: 2,
  paddingVertical: 3,

  borderBottomWidth: 0.5,
},

todoPopupCircle: {
  width: 22,
  height: 22,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

todoPopupCheck: {
  fontSize: 12,
  lineHeight: 14,
  fontWeight: '900',
},

todoPopupText: {
  flex: 1,
  minWidth: 0,

  marginLeft: 8,

  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',
},

todoPopupActionButton: {
  minWidth: 40,
  height: 30,

  paddingHorizontal: 4,

  alignItems: 'center',
  justifyContent: 'center',
},

todoPopupActionText: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '800',
},

todoPopupEmptyText: {
  width: '100%',

  paddingVertical: 24,

  fontSize: 13,
  lineHeight: 18,
  fontWeight: '700',

  textAlign: 'center',
},
activityRecordButtonRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,

  marginTop: 12,
},

activityRecordButton: {
  flex: 1,

  /*
   * 기존 버튼 높이 56의 절반
   */
  height: 28,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

activityRecordButtonText: {
  fontSize: 12,
  lineHeight: 15,
  fontWeight: '800',

  textAlign: 'center',
},
todoModalButtonRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,

  marginTop: 12,
},

todoModalButton: {
  flex: 1,

  height: 34,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

todoModalButtonText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',

  textAlign: 'center',
},
reminderModalButtonRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,

  marginTop: 14,
},

reminderModalButton: {
  flex: 1,

  height: 34,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

reminderModalButtonText: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '800',

  textAlign: 'center',
},
ledgerBudgetCompactModal: {
  width: '88%',

  paddingHorizontal: 18,
  paddingTop: 16,
  paddingBottom: 18,

  borderWidth: 1,
},

ledgerBudgetCompactHeader: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',

  marginBottom: 14,
},

ledgerBudgetCompactTitle: {
  flex: 1,
  minWidth: 0,

  fontSize: 18,
  lineHeight: 23,
  fontWeight: '900',
},

ledgerBudgetCloseButton: {
  width: 32,
  height: 32,

  marginLeft: 6,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerBudgetInputRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,
},

ledgerBudgetCompactInput: {
  flex: 1,
  minWidth: 0,

  height: 38,

  paddingHorizontal: 10,
  paddingVertical: 0,

  borderWidth: 1,

  fontSize: 11,
  lineHeight: 15,
  fontWeight: '700',
},

ledgerBudgetCompactButton: {
  width: 68,
  height: 38,

  borderWidth: 1,

  alignItems: 'center',
  justifyContent: 'center',
},

ledgerBudgetCompactButtonText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',

  textAlign: 'center',
},

ledgerBudgetSavedRow: {
  width: '100%',

  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',

  minHeight: 42,
},

ledgerBudgetSavedAmount: {
  flex: 1,
  minWidth: 0,

  marginRight: 12,

  fontSize: 21,
  lineHeight: 27,
  fontWeight: '900',
},
mealSectionTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
},
bodySummaryCard: {
  borderWidth: 1,
  padding: 12,
  marginBottom: 10,
},
bodyProfileRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},
bodyProfileText: {
  flex: 1,
  fontSize: 14,
  lineHeight: 19,
  fontWeight: '900',
},
bodyWeightRow: {
  marginTop: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},
bodyWeightText: {
  flex: 1,
  fontSize: 15,
  lineHeight: 20,
  fontWeight: '900',
},
bodyWeightButtons: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
},
bodySmallButton: {
  minWidth: 54,
  height: 28,
  paddingHorizontal: 8,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
bodySmallButtonText: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '900',
},
bodySummaryDivider: {
  width: '100%',
  height: 1,
  marginVertical: 10,
},
bodyMetricRow: {
  minHeight: 34,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 6,
},
bodyMetricLabel: {
  width: 82,
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
},
bodyMetricRight: {
  flex: 1,
  minWidth: 0,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 5,
},
bodyMetricValue: {
  flexShrink: 1,
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
  textAlign: 'right',
},
bodyMetricButton: {
  height: 27,
  paddingHorizontal: 7,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
bodyMetricButtonText: {
  fontSize: 10,
  lineHeight: 13,
  fontWeight: '900',
},
bodyRemainRow: {
  marginTop: 8,
  paddingTop: 10,
  borderTopWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
bodyRemainLabel: {
  fontSize: 14,
  lineHeight: 19,
  fontWeight: '900',
},
bodyRemainValue: {
  fontSize: 17,
  lineHeight: 22,
  fontWeight: '900',
},
mealQuickPicker: {
  marginTop: 10,
  padding: 6,
  borderWidth: 1,
  flexDirection: 'row',
  gap: 5,
},
mealQuickPickerButton: {
  flex: 1,
  height: 30,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
mealQuickPickerText: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '900',
},
weightChangeWrap: {
  width: '100%',
},
weightChangeCard: {
  width: '100%',
  marginBottom: 10,
  padding: 12,
  borderWidth: 1,
},
weightChangeHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 8,
},
weightChangeTitle: {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: '900',
},
weightChartModeRow: {
  flexDirection: 'row',
  gap: 4,
},
weightChartModeButton: {
  width: 34,
  height: 27,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
weightChartModeText: {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: '900',
},
weightLineChartBox: {
  width: '100%',
  minHeight: 150,
  borderWidth: 1,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
},
weightChartEmpty: {
  fontSize: 12,
  lineHeight: 17,
  fontWeight: '800',
  textAlign: 'center',
},
weightChartSummaryRow: {
  marginTop: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},
weightChartSummaryText: {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',
},
weightChartDiffText: {
  flex: 1,
  fontSize: 11,
  lineHeight: 15,
  fontWeight: '800',
  textAlign: 'right',
},
weightInputCard: {
  width: '100%',
  marginBottom: 10,
  padding: 12,
  borderWidth: 1,
},
weightInputTitle: {
  marginBottom: 7,
  fontSize: 14,
  lineHeight: 19,
  fontWeight: '900',
},
weightInputInlineRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
weightInlineInput: {
  flex: 1,
  height: 34,
  paddingHorizontal: 10,
  paddingVertical: 0,
  borderWidth: 1,
  fontSize: 13,
},
weightInlineSaveButton: {
  width: 58,
  height: 34,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
weightInlineSaveText: {
  fontSize: 12,
  lineHeight: 15,
  fontWeight: '900',
},
compactRecordCard: {
  width: '100%',
  marginBottom: 10,
  padding: 12,
  borderWidth: 1,
},
compactRecordHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
},
compactRecordTitle: {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: '900',
},
compactRecordTotal: {
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
},
compactMealRow: {
  minHeight: 39,
  borderTopWidth: 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
compactMealEmoji: {
  width: 23,
  fontSize: 17,
  lineHeight: 22,
  textAlign: 'center',
},
compactMealLabel: {
  width: 42,
  fontSize: 13,
  lineHeight: 17,
  fontWeight: '900',
},
compactMealCalories: {
  flex: 1,
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '800',
  textAlign: 'right',
},
compactPlusButton: {
  width: 32,
  height: 28,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
compactPlusText: {
  fontSize: 16,
  lineHeight: 19,
  fontWeight: '900',
},

compactMealDetail: {
  minHeight: 36,

  marginLeft: 29,

  paddingVertical: 5,
  paddingLeft: 8,

  borderTopWidth: 1,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 7,
},

compactMealDetailName: {
  flex: 1,
  minWidth: 0,

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',
},

compactMealDetailMeta: {
  marginTop: 0,

  fontSize: 10,
  lineHeight: 14,
  fontWeight: '700',

  textAlign: 'right',
},
compactDeleteText: {
  fontSize: 10,
  lineHeight: 14,
  fontWeight: '900',
},
compactMealPrice: {
  marginTop: 7,
  fontSize: 10,
  lineHeight: 14,
  fontWeight: '800',
  textAlign: 'right',
},

compactExerciseRow: {
  minHeight: 34,

  borderTopWidth: 0,

  flexDirection: 'row',
  alignItems: 'center',

  gap: 8,
},

compactExerciseName: {
  flex: 1,
  minWidth: 0,

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',
},

compactExerciseType: {
  marginTop: 0,

  fontSize: 10,
  lineHeight: 14,
  fontWeight: '700',
},

compactExerciseCalories: {
  minWidth: 58,

  fontSize: 12,
  lineHeight: 16,
  fontWeight: '900',

  textAlign: 'right',
},
compactEmptyText: {
  paddingVertical: 14,
  fontSize: 12,
  lineHeight: 17,
  fontWeight: '800',
  textAlign: 'center',
},
compactListButton: {
  alignSelf: 'flex-end',
  height: 28,
  marginTop: 7,
  paddingHorizontal: 10,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
compactListButtonText: {
  fontSize: 10,
  lineHeight: 13,
  fontWeight: '900',
},
financialNotificationBox: {
  marginTop: 10,
  marginBottom: 10,
  borderWidth: 0.8,
  padding: 12,
},

financialNotificationHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
  gap: 10,
},

financialNotificationTitleBox: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  flex: 1,
},

financialNotificationTitle: {
  fontSize: 13,
  fontWeight: '700',
},

financialNotificationCount: {
  fontSize: 11,
},

financialNotificationRefreshButton: {
  minHeight: 28,
  paddingHorizontal: 10,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

financialNotificationRefreshText: {
  fontSize: 10.5,
  fontWeight: '600',
},

financialNotificationEmpty: {
  marginTop: 10,
  gap: 8,
  alignItems: 'flex-start',
},

financialNotificationEmptyText: {
  marginTop: 10,
  fontSize: 11,
  lineHeight: 17,
},

financialNotificationSettingButton: {
  minHeight: 30,
  paddingHorizontal: 11,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

financialNotificationSettingText: {
  fontSize: 10.5,
  fontWeight: '600',
},

financialNotificationList: {
  gap: 0,
},

financialNotificationItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  width: '100%',
  minHeight: 0,
  paddingVertical: 8,
  borderBottomWidth: 0.6,
},

financialNotificationContent: {
  width: '100%',
  minWidth: 0,
  gap: 2,
},

financialNotificationItemTitle: {
  flexShrink: 1,
  fontSize: 12,
  lineHeight: 17,
  fontWeight: '700',
},

financialNotificationItemText: {
  marginTop: 4,
  fontSize: 10,
  lineHeight: 14,
},

financialNotificationTime: {
  fontSize: 9,
  lineHeight: 13,
},

financialNotificationAmount: {
  fontSize: 13,
  fontWeight: '800',
  marginBottom: 7,
},


financialNotificationActionRow: {
  width: '100%',

  flexDirection: 'row',
  flexWrap: 'nowrap',

  alignItems: 'center',

  gap: 4,
},

financialNotificationWideActionButton: {
  minWidth: 70,
  minHeight: 29,
  paddingHorizontal: 9,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

financialNotificationActionText: {
  width: '100%',

  fontSize: 9.5,
  lineHeight: 13,
  fontWeight: '700',

  textAlign: 'center',
},

financialNotificationGuideText: {
  marginTop: 10,
  fontSize: 9.5,
  lineHeight: 14,
},
financialCategoryArea: {
  width: '100%',
  minWidth: 0,
  marginTop: 2,
  marginBottom: 10,
},


financialCategoryTitle: {
  fontSize: 11.5,
  fontWeight: '700',
},
financialCategoryRecommendText: {
  width: '100%',
  marginTop: 3,
  fontSize: 9,
  lineHeight: 13,
  textAlign: 'left',
},

financialCategoryButtonRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  width: '100%',
  gap: 6,
},

financialCategoryButton: {
  minHeight: 29,
  paddingHorizontal: 9,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

financialCategoryButtonText: {
  fontSize: 10,
  fontWeight: '700',
},

financialCategoryChoiceWrap: {
  flexDirection:
    'row',

  alignItems:
    'center',
},

financialOtherCategoryRowSelected: {
  flexGrow:
    1,

  flexShrink:
    1,

  minWidth:
    205,

  gap:
    6,
},

financialOtherCategoryInput: {
  flex:
    1,

  minWidth:
    120,

  height:
    29,

  paddingHorizontal:
    9,

  borderWidth:
    0.7,

  fontSize:
    10,

  lineHeight:
    14,

  fontWeight:
    '600',
},

financialCategoryTitleArea: {
  width: '100%',
  minWidth: 0,
  marginBottom: 7,
},

financialCategoryHistoryText: {
  width: '100%',
  marginTop: 3,
  fontSize: 9.5,
  lineHeight: 14,
},

financialAutoSaveButton: {
  alignSelf: 'flex-start',
  maxWidth: '100%',
  minHeight: 30,
  marginTop: 7,
  marginBottom: 9,
  paddingHorizontal: 10,
  borderWidth: 0.7,
  alignItems: 'center',
  justifyContent: 'center',
},

financialAutoSaveButtonText: {
  fontSize:
    10,

  fontWeight:
    '700',
},
financialNotificationTitleRow: {
  flexDirection:
    'row',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    10,
},

financialAutoSaveManageButton: {
  minHeight:
    28,

  paddingHorizontal:
    9,

  borderWidth:
    0.7,

  alignItems:
    'center',

  justifyContent:
    'center',
},

financialAutoSaveManageButtonText: {
  fontSize:
    10,

  fontWeight:
    '700',
},

merchantAutoSaveModalBox: {
  width:
    '88%',

  maxHeight:
    '72%',

  padding:
    16,

  borderWidth:
    0.7,
},

merchantAutoSaveModalHeader: {
  flexDirection:
    'row',

  alignItems:
    'center',

  justifyContent:
    'space-between',
},

merchantAutoSaveModalTitle: {
  fontSize:
    16,

  fontWeight:
    '800',
},

merchantAutoSaveModalDescription: {
  marginTop:
    7,

  marginBottom:
    12,

  fontSize:
    11,

  lineHeight:
    17,
},

merchantAutoSaveRuleList: {
  maxHeight:
    330,
},

merchantAutoSaveRuleRow: {
  minHeight:
    54,

  marginBottom:
    7,

  paddingHorizontal:
    11,

  paddingVertical:
    8,

  borderWidth:
    0.6,

  flexDirection:
    'row',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    10,
},

merchantAutoSaveRuleInfo: {
  flex:
    1,
},

merchantAutoSaveRuleMerchant: {
  fontSize:
    12,

  fontWeight:
    '800',
},

merchantAutoSaveRuleCategory: {
  marginTop:
    3,

  fontSize:
    10,
},

merchantAutoSaveRuleRemoveButton: {
  minWidth:
    45,

  minHeight:
    27,

  paddingHorizontal:
    8,

  borderWidth:
    0.7,

  alignItems:
    'center',

  justifyContent:
    'center',
},

merchantAutoSaveRuleRemoveText: {
  fontSize:
    10,

  fontWeight:
    '700',
},

merchantAutoSaveEmptyText: {
  paddingVertical:
    28,

  textAlign:
    'center',

  fontSize:
    11,
},

merchantAutoSaveModalCloseButton: {
  alignSelf:
    'flex-end',

  minWidth:
    54,

  minHeight:
    30,

  marginTop:
    10,

  paddingHorizontal:
    11,

  borderWidth:
    0.7,

  alignItems:
    'center',

  justifyContent:
    'center',
},

merchantAutoSaveModalCloseText: {
  fontSize:
    11,

  fontWeight:
    '700',
},
ledgerDetailMemoBox: {
  flex:
    1,

  minWidth:
    0,

  flexDirection:
    'row',

  alignItems:
    'center',

  gap:
    5,
},

ledgerAutoSavedBadge: {
  flexShrink:
    0,

  minHeight:
    18,

  paddingHorizontal:
    5,

  borderWidth:
    0.5,

  alignItems:
    'center',

  justifyContent:
    'center',
},

ledgerAutoSavedBadgeText: {
  fontSize:
    8,

  lineHeight:
    11,

  fontWeight:
    '700',
},
ledgerCancelledBadge: {
  flexShrink:
    0,

  minHeight:
    18,

  paddingHorizontal:
    5,

  borderWidth:
    0.5,

  alignItems:
    'center',

  justifyContent:
    'center',
},

ledgerCancelledBadgeText: {
  fontSize:
    8,

  lineHeight:
    11,

  fontWeight:
    '700',
},

financialCancellationBadge: {
  alignSelf:
    'flex-start',

  minHeight:
    19,

  marginTop:
    5,

  paddingHorizontal:
    6,

  borderWidth:
    0.5,

  alignItems:
    'center',

  justifyContent:
    'center',
},

financialCancellationBadgeText: {
  fontSize:
    9,

  lineHeight:
    12,

  fontWeight:
    '700',
},
cancellationLinkSummary: {
  marginTop:
    10,

  paddingHorizontal:
    10,

  paddingVertical:
    9,

  borderWidth:
    0.5,
},

cancellationLinkSummaryLabel: {
  fontSize:
    9,

  lineHeight:
    12,

  marginBottom:
    2,
},

cancellationLinkSummaryText: {
  fontSize:
    12,

  lineHeight:
    17,

  fontWeight:
    '700',
},

cancellationLinkGuide: {
  marginTop:
    12,

  marginBottom:
    6,

  fontSize:
    10,

  lineHeight:
    14,
},

cancellationLinkList: {
  maxHeight:
    280,
},

cancellationLinkItem: {
  minHeight:
    52,

  marginBottom:
    6,

  paddingHorizontal:
    10,

  paddingVertical:
    7,

  borderWidth:
    0.5,

  flexDirection:
    'row',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    10,
},

cancellationLinkItemTextBox: {
  flex:
    1,

  minWidth:
    0,
},

cancellationLinkItemTitle: {
  fontSize:
    11,

  lineHeight:
    15,

  fontWeight:
    '700',
},

cancellationLinkItemDate: {
  marginTop:
    2,

  fontSize:
    9,

  lineHeight:
    12,
},

cancellationLinkItemAmount: {
  flexShrink:
    0,

  fontSize:
    11,

  lineHeight:
    15,

  fontWeight:
    '700',
},
ledgerDetailActionBox: {
  flexShrink: 0,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 10,
  marginLeft: 8,
},

ledgerDetailEditText: {
  fontSize:
    9,

  lineHeight:
    12,

  fontWeight:
    '700',

  textDecorationLine:
    'underline',
},

ledgerRestoreText: {
  fontSize:
    9,

  lineHeight:
    12,

  fontWeight:
    '700',

  textDecorationLine:
    'underline',
},

cancellationRestoreSummary: {
  marginTop:
    10,

  paddingHorizontal:
    10,

  paddingVertical:
    10,

  borderWidth:
    0.5,

  alignItems:
    'center',
},

cancellationRestoreMerchant: {
  maxWidth:
    '100%',

  fontSize:
    12,

  lineHeight:
    17,

  fontWeight:
    '700',
},

cancellationRestoreAmount: {
  marginTop:
    3,

  fontSize:
    15,

  lineHeight:
    20,

  fontWeight:
    '700',
},

cancellationRestoreDate: {
  marginTop:
    3,

  fontSize:
    9,

  lineHeight:
    12,
},

cancellationRestoreGuide: {
  marginTop:
    10,

  marginBottom:
    12,

  fontSize:
    10,

  lineHeight:
    15,

  textAlign:
    'center',
},
financialBulkActionArea: {
  gap: 7,
  marginBottom: 9,
},

financialBulkSelectionRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

financialBulkSmallButton: {
  minHeight: 28,
  paddingHorizontal: 9,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.6,
  borderRadius: 7,
},

financialBulkSmallButtonText: {
  fontSize: 11,
  fontWeight: '600',
},

financialBulkSelectedCount: {
  marginLeft: 'auto',
  fontSize: 11,
  fontWeight: '500',
},

financialBulkMainRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
},

financialBulkMainButton: {
  minHeight: 30,
  paddingHorizontal: 9,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.6,
  borderRadius: 7,
},

financialBulkMainButtonText: {
  fontSize: 11,
  fontWeight: '600',
},

financialBulkGuide: {
  fontSize: 10,
  lineHeight: 14,
},

financialSelectionButton: {
  width: 27,
  height: 27,

  marginTop: 1,
  marginRight: 8,

  alignItems: 'center',
  justifyContent: 'center',

  borderWidth: 0.6,
  borderRadius: 14,
},
financialCompactTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
},

financialCompactAmount: {
  marginLeft: 'auto',
  fontSize: 12,
  fontWeight: '700',
},

financialCompactInfoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 2,
  gap: 8,
},

financialCompactCategory: {
  flex: 1,
  fontSize: 10,
  lineHeight: 14,
},
financialNotificationActionArea: {
  width: '100%',
  minWidth: 0,
  marginTop: 8,
  gap: 8,
},

financialNotificationActionButton: {
  flex: 1,
  minWidth: 0,

  height: 32,

  paddingHorizontal: 2,

  borderWidth: 0.6,

  alignItems: 'center',
  justifyContent: 'center',
},
financialNotificationMain: {
  flex: 1,
  minWidth: 0,
  width: 0,
},
financialBulkResultBox: {
  minHeight: 30,
  marginTop: 2,
  paddingHorizontal: 10,
  paddingVertical: 7,
  justifyContent: 'center',
  borderWidth: 0.6,
  borderRadius: 8,
},

financialBulkResultText: {
  fontSize: 10.5,
  lineHeight: 15,
  fontWeight: '600',
},
financialBulkUndoButton: {
  alignSelf: 'flex-end',
  minHeight: 27,
  marginTop: 6,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0.6,
  borderRadius: 7,
},

financialBulkUndoButtonText: {
  fontSize: 10.5,
  fontWeight: '700',
},
});