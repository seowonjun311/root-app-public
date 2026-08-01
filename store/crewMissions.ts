export type CrewMissionDifficulty =
  | 'easy'
  | 'normal'
  | 'hard'
  | 'epic'
  | 'legend';

export type CrewMissionType =
  | 'post'
  | 'minutes'
  | 'photo'
  | 'cheer'
  | 'comment'
  | 'activeUser'
  | 'todayAttendance'
  | 'categoryPost';

export type CrewMissionCategory =
  | 'exercise'
  | 'study'
  | 'mental'
  | 'daily';

export type CrewMission = {
  id: string;
  icon: string;
  title: string;
  type: CrewMissionType;
  target: number;
  unit: string;
  difficulty: CrewMissionDifficulty;
  exp: number;
  category?: CrewMissionCategory;
};

export const CREW_MISSION_POOL: CrewMission[] = [
  {
    id: 'easy-post-10',
    icon: '📝',
    title: '기록 10개 공유',
    type: 'post',
    target: 10,
    unit: '개',
    difficulty: 'easy',
    exp: 30,
  },
  {
    id: 'easy-photo-3',
    icon: '📸',
    title: '사진 인증 3개',
    type: 'photo',
    target: 3,
    unit: '개',
    difficulty: 'easy',
    exp: 30,
  },
  {
    id: 'easy-cheer-5',
    icon: '👏',
    title: '응원 5회 받기',
    type: 'cheer',
    target: 5,
    unit: '회',
    difficulty: 'easy',
    exp: 30,
  },
  {
    id: 'easy-comment-5',
    icon: '💬',
    title: '댓글 5개 달성',
    type: 'comment',
    target: 5,
    unit: '개',
    difficulty: 'easy',
    exp: 30,
  },
  {
    id: 'easy-attendance-3',
    icon: '👥',
    title: '오늘 출석 3명',
    type: 'todayAttendance',
    target: 3,
    unit: '명',
    difficulty: 'easy',
    exp: 30,
  },

  {
    id: 'normal-post-20',
    icon: '📝',
    title: '기록 20개 공유',
    type: 'post',
    target: 20,
    unit: '개',
    difficulty: 'normal',
    exp: 60,
  },
  {
    id: 'normal-min-600',
    icon: '⏱️',
    title: '총 10시간 기록',
    type: 'minutes',
    target: 600,
    unit: '분',
    difficulty: 'normal',
    exp: 60,
  },
  {
    id: 'normal-active-5',
    icon: '🔥',
    title: '활동 멤버 5명',
    type: 'activeUser',
    target: 5,
    unit: '명',
    difficulty: 'normal',
    exp: 60,
  },
  {
    id: 'normal-exercise-10',
    icon: '🏃',
    title: '운동 기록 10회',
    type: 'categoryPost',
    category: 'exercise',
    target: 10,
    unit: '회',
    difficulty: 'normal',
    exp: 60,
  },
  {
    id: 'normal-study-10',
    icon: '📚',
    title: '공부 기록 10회',
    type: 'categoryPost',
    category: 'study',
    target: 10,
    unit: '회',
    difficulty: 'normal',
    exp: 60,
  },

  {
    id: 'hard-min-1200',
    icon: '⏱️',
    title: '총 20시간 기록',
    type: 'minutes',
    target: 1200,
    unit: '분',
    difficulty: 'hard',
    exp: 120,
  },
  {
    id: 'hard-post-50',
    icon: '📝',
    title: '기록 50개 공유',
    type: 'post',
    target: 50,
    unit: '개',
    difficulty: 'hard',
    exp: 120,
  },
  {
    id: 'hard-cheer-50',
    icon: '👏',
    title: '응원 50회 받기',
    type: 'cheer',
    target: 50,
    unit: '회',
    difficulty: 'hard',
    exp: 120,
  },
  {
    id: 'hard-comment-30',
    icon: '💬',
    title: '댓글 30개 달성',
    type: 'comment',
    target: 30,
    unit: '개',
    difficulty: 'hard',
    exp: 120,
  },
  {
    id: 'hard-photo-30',
    icon: '📸',
    title: '사진 인증 30개',
    type: 'photo',
    target: 30,
    unit: '개',
    difficulty: 'hard',
    exp: 120,
  },

  {
    id: 'epic-min-3000',
    icon: '⏱️',
    title: '총 50시간 기록',
    type: 'minutes',
    target: 3000,
    unit: '분',
    difficulty: 'epic',
    exp: 250,
  },
  {
    id: 'epic-post-100',
    icon: '📝',
    title: '기록 100개 공유',
    type: 'post',
    target: 100,
    unit: '개',
    difficulty: 'epic',
    exp: 250,
  },
  {
    id: 'epic-active-25',
    icon: '👥',
    title: '활동 멤버 25명',
    type: 'activeUser',
    target: 25,
    unit: '명',
    difficulty: 'epic',
    exp: 250,
  },

  {
    id: 'legend-min-6000',
    icon: '👑',
    title: '총 100시간 기록',
    type: 'minutes',
    target: 6000,
    unit: '분',
    difficulty: 'legend',
    exp: 500,
  },
  {
    id: 'legend-post-300',
    icon: '🏆',
    title: '기록 300개 공유',
    type: 'post',
    target: 300,
    unit: '개',
    difficulty: 'legend',
    exp: 500,
  },
];

function formatLocalDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export const getMondayKey = (
  baseDate: Date = new Date()
) => {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    12,
    0,
    0,
    0
  );

  const day = date.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  date.setDate(
    date.getDate() + diff
  );

  return formatLocalDateKey(
    date
  );
};

const seededRandom = (
  seed: string
) => {
  let value = 0;

  for (
    let index = 0;
    index < seed.length;
    index += 1
  ) {
    value +=
      seed.charCodeAt(index) *
      (index + 1);
  }

  return () => {
    value =
      (value * 9301 + 49297) %
      233280;

    return value / 233280;
  };
};

const pickRandom = (
  list: CrewMission[],
  count: number,
  random: () => number
): CrewMission[] => {
  const copied = [...list];

  const result: CrewMission[] =
    [];

  while (
    copied.length > 0 &&
    result.length < count
  ) {
    const index = Math.floor(
      random() * copied.length
    );

    const [picked] =
      copied.splice(index, 1);

    if (picked) {
      result.push(picked);
    }
  }

  return result;
};

export const getWeeklyCrewMissions = (
  crewId: string,
  baseDate: Date = new Date()
): CrewMission[] => {
  const safeCrewId = String(
    crewId || 'unknown'
  );

  const weekKey =
    getMondayKey(baseDate);

  const random = seededRandom(
    `${safeCrewId}-${weekKey}`
  );

  const easy =
    CREW_MISSION_POOL.filter(
      (mission) =>
        mission.difficulty ===
        'easy'
    );

  const normal =
    CREW_MISSION_POOL.filter(
      (mission) =>
        mission.difficulty ===
        'normal'
    );

  const hard =
    CREW_MISSION_POOL.filter(
      (mission) =>
        mission.difficulty ===
        'hard'
    );

  const epicOrLegend =
    CREW_MISSION_POOL.filter(
      (mission) =>
        mission.difficulty ===
          'epic' ||
        mission.difficulty ===
          'legend'
    );

  return [
    ...pickRandom(
      easy,
      4,
      random
    ),
    ...pickRandom(
      normal,
      4,
      random
    ),
    ...pickRandom(
      hard,
      4,
      random
    ),
    ...pickRandom(
      epicOrLegend,
      3,
      random
    ),
  ];
};

const DIFFICULTY_LABELS: Record<
  CrewMissionDifficulty,
  string
> = {
  easy: 'EASY',
  normal: 'NORMAL',
  hard: 'HARD',
  epic: 'EPIC',
  legend: 'LEGEND',
};

export const getMissionDifficultyLabel = (
  difficulty: CrewMissionDifficulty
) => {
  return DIFFICULTY_LABELS[
    difficulty
  ];
};

export const getMissionProgressPercent = (
  current: number,
  target: number
) => {
  if (target <= 0) {
    return 0;
  }

  const percent =
    (Math.max(0, current) /
      target) *
    100;

  return Math.min(
    100,
    Math.round(percent)
  );
};

export const isMissionCompleted = (
  current: number,
  target: number
) => {
  if (target <= 0) {
    return false;
  }

  return current >= target;
};
