import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  getCharacterPersonalityProfile,
  type CharacterPersonalityId,
} from '../constants/characterPersonality';
import {
  type RootyConditionSnapshot,
} from './rootyCondition';

// CHARACTER_V99C_PERSONALITY_STATE_DIALOGUE
export type CharacterMicroDialogueInteraction =
  | 'tap'
  | 'longPress'
  | 'autonomous';

export type CharacterMicroDialogueTone =
  | 'low'
  | 'tired'
  | 'calm'
  | 'happy'
  | 'excited'
  | 'bonded';

// CHARACTER_V99D_RELATIONSHIP_DIALOGUE_DEPTH
export type CharacterRelationshipDialogueTier =
  | 'distant'
  | 'familiar'
  | 'close'
  | 'bonded';

export type CharacterAutonomousDialogueContext =
  | 'idle'
  | 'lookAround'
  | 'sit'
  | 'sleep';

export type CharacterMicroDialogueEvent = {
  id: number;
  characterId:
    CharacterId;
  personalityId:
    CharacterPersonalityId;
  interaction:
    CharacterMicroDialogueInteraction;
  tone:
    CharacterMicroDialogueTone;
  mood:
    RootyConditionSnapshot[
      'mood'
    ];
  energy:
    RootyConditionSnapshot[
      'energy'
    ];
  relationshipPoints:
    number;
  relationshipTier:
    CharacterRelationshipDialogueTier;
  context:
    CharacterAutonomousDialogueContext | null;
  text: string;
  at: number;
};

type Listener =
  (
    event:
      CharacterMicroDialogueEvent
  ) => void;

type DialoguePools =
  Record<
    CharacterMicroDialogueTone,
    readonly string[]
  >;

const listeners =
  new Set<Listener>();

// CHARACTER_V99C_DIALOGUE_COOLDOWN
export const CHARACTER_MICRO_DIALOGUE_COOLDOWN_MS =
  2200;

const CHARACTER_MICRO_DIALOGUE_RECENT_LIMIT =
  2;

let sequence =
  0;

const lastShownAtByCharacter =
  new Map<
    CharacterId,
    number
  >();

const recentLinesByKey =
  new Map<
    string,
    string[]
  >();

const DIALOGUE_BY_PERSONALITY:
  Record<
    CharacterPersonalityId,
    DialoguePools
  > = {
  balanced: {
    low: [
      '오늘은 천천히 가도 괜찮아.',
      '조금 조용히 쉬어볼까?',
      '곁에 있어줘서 마음이 놓여.',
    ],
    tired: [
      '조금 쉬었다가 다시 움직이자.',
      '에너지를 채우는 것도 중요한 모험이야.',
      '잠깐 앉아 있으면 다시 괜찮아질 거야.',
    ],
    calm: [
      '오늘도 우리 속도로 가보자.',
      '지금 이 순간도 꽤 좋아.',
      '천천히 둘러보는 것도 재밌어.',
    ],
    happy: [
      '같이 있으니까 기분이 좋아!',
      '오늘도 좋은 일이 생길 것 같아.',
      '조금 더 돌아다녀 볼까?',
    ],
    excited: [
      '좋아! 지금은 뭐든 할 수 있을 것 같아!',
      '두근두근해! 어디부터 가볼까?',
      '오늘은 신나는 일이 생길 것 같아!',
    ],
    bonded: [
      '네가 오래 곁에 있어줘서 좋아.',
      '우리 꽤 좋은 팀이 된 것 같아.',
      '앞으로도 같이 성장하자.',
    ],
  },
  'curious-active': {
    low: [
      '오늘은 멀리 말고 가까운 곳부터 볼래.',
      '조용한 곳에도 신기한 게 있을까?',
      '조금 쉬면 다시 궁금한 게 생길 거야.',
    ],
    tired: [
      '발은 쉬고 싶은데... 저쪽은 조금 궁금해.',
      '잠깐만 쉬고 다시 탐색하자!',
      '에너지 충전부터 하고 출발할래.',
    ],
    calm: [
      '저기엔 뭐가 있을까?',
      '새로운 걸 하나만 찾아보자!',
      '가만히 보면 재밌는 게 보여.',
    ],
    happy: [
      '좋아! 오늘은 이것저것 찾아보자!',
      '궁금한 게 너무 많아!',
      '조금만 더 돌아다녀도 돼?',
    ],
    excited: [
      '와! 저쪽도 보고 이쪽도 보자!',
      '빨리 가보자! 뭔가 있을 것 같아!',
      '오늘은 탐색할 게 잔뜩이야!',
    ],
    bonded: [
      '너랑 같이 찾으면 더 재밌어.',
      '내가 발견하면 제일 먼저 알려줄게!',
      '우리만 아는 멋진 곳을 찾아보자.',
    ],
  },
  'cozy-calm': {
    low: [
      '오늘은 포근하게 쉬어도 괜찮아.',
      '조용히 곁에 있어주면 좋겠어.',
      '느린 하루도 나쁘지 않아.',
    ],
    tired: [
      '조금 졸려... 같이 쉬자.',
      '포근한 곳에서 잠깐만 쉬고 싶어.',
      '오늘은 느긋하게 가자.',
    ],
    calm: [
      '여기 가만히 있으니까 편안해.',
      '천천히 쉬면서 구경하자.',
      '포근한 시간이 제일 좋아.',
    ],
    happy: [
      '같이 쉬고 있으니까 기분 좋아.',
      '오늘은 마음이 말랑말랑해.',
      '이대로 조금 더 있고 싶어.',
    ],
    excited: [
      '나도 오늘은 조금 신나!',
      '신나지만... 너무 빨리는 말고!',
      '좋아! 그래도 중간에 꼭 쉬자.',
    ],
    bonded: [
      '네 옆이 제일 편안해.',
      '오래 같이 있어도 전혀 안 피곤해.',
      '같이 쉬는 시간이 제일 좋아.',
    ],
  },
  'social-warm': {
    low: [
      '오늘은 내가 옆에 있어줄게.',
      '말하지 않아도 괜찮아. 같이 있자.',
      '조금 힘들면 나한테 기대도 돼.',
    ],
    tired: [
      '무리하지 말고 같이 쉬자.',
      '오늘은 내가 천천히 맞춰줄게.',
      '잠깐 쉬면 기분도 좋아질 거야.',
    ],
    calm: [
      '같이 있어서 좋아.',
      '오늘 하루도 잘 부탁해.',
      '우리 천천히 이야기하면서 가자.',
    ],
    happy: [
      '네가 와줘서 정말 좋아!',
      '같이 있으니까 더 즐거워.',
      '오늘 좋은 추억 하나 만들자!',
    ],
    excited: [
      '신난다! 다 같이 즐거우면 좋겠어!',
      '오늘은 웃을 일이 많을 것 같아!',
      '좋아! 즐거운 일부터 찾아보자!',
    ],
    bonded: [
      '네가 내 친구라서 정말 좋아.',
      '우리 오래오래 같이 다니자.',
      '네가 오면 언제나 반가워.',
    ],
  },
  'explorer-curious': {
    low: [
      '오늘은 가까운 길부터 살펴볼래.',
      '멀리 가지 않아도 발견은 있어.',
      '잠시 쉬면서 다음 길을 생각해볼게.',
    ],
    tired: [
      '날개를 잠깐 쉬게 해줘.',
      '조금 충전하고 다음 목적지로 가자.',
      '탐험도 휴식이 있어야 오래 할 수 있어.',
    ],
    calm: [
      '다음 목적지는 어디일까?',
      '처음 보는 길은 언제나 궁금해.',
      '오늘 지도에 점 하나 더 찍고 싶어.',
    ],
    happy: [
      '새로운 곳을 찾으러 가자!',
      '오늘은 좋은 발견이 있을 것 같아!',
      '길을 따라가면 뭐가 나올까?',
    ],
    excited: [
      '출발! 새로운 곳이 날 기다리고 있어!',
      '저 너머까지 한번 가보고 싶어!',
      '오늘은 완전 탐험하는 날이야!',
    ],
    bonded: [
      '너랑 가는 곳이면 어디든 좋아.',
      '다음 여행도 꼭 같이 가자.',
      '우리 탐험 기록을 더 많이 만들자!',
    ],
  },
  'playful-adventurous': {
    low: [
      '오늘은 장난도 살짝만 칠게.',
      '조금 조용한 모험도 괜찮지.',
      '쉬었다가 다시 재밌는 걸 찾자.',
    ],
    tired: [
      '으으... 잠깐 충전하고 다시 놀자!',
      '이번 판은 휴식! 다음 판은 모험!',
      '조금 쉬면 다시 씩씩해질 거야.',
    ],
    calm: [
      '이번엔 뭘 하고 놀까?',
      '재밌는 길 하나 골라봐!',
      '가볍게 한 바퀴 돌아볼래?',
    ],
    happy: [
      '좋아! 오늘은 신나게 놀자!',
      '뭔가 재밌는 일이 생길 것 같아!',
      '같이 있으면 심심할 틈이 없어!',
    ],
    excited: [
      '가자 가자! 오늘은 모험이다!',
      '누가 더 신나는지 해볼까!',
      '와! 지금 당장 뛰어가고 싶어!',
    ],
    bonded: [
      '너랑 노는 게 제일 재밌어!',
      '우리 둘이면 어떤 모험도 가능해.',
      '다음 장난은 너한테만 알려줄게.',
    ],
  },
  'gentle-shy': {
    low: [
      '오늘은... 조금 조용히 있고 싶어.',
      '곁에만 있어줘도 괜찮아.',
      '천천히 있으면 마음이 편해질 것 같아.',
    ],
    tired: [
      '조금 쉬어도 될까...?',
      '잠깐만 눈을 붙이고 싶어.',
      '천천히 움직이면 괜찮을 것 같아.',
    ],
    calm: [
      '같이 있으면... 편안해.',
      '조용한 시간이 좋아.',
      '나도 천천히 따라갈게.',
    ],
    happy: [
      '조금 부끄럽지만... 기분 좋아.',
      '네가 와줘서... 반가워.',
      '오늘은 나도 조금 더 가까이 있을래.',
    ],
    excited: [
      '나도 신나... 조금만!',
      '두근두근해. 좋은 의미로...',
      '오늘은 용기 내서 같이 가볼래.',
    ],
    bonded: [
      '너한테는... 조금 덜 부끄러워.',
      '오래 곁에 있어줘서 고마워.',
      '너랑 있으면 마음이 따뜻해.',
    ],
  },
};


// CHARACTER_V99D_RELATIONSHIP_DIALOGUE_DEPTH
const RELATIONSHIP_DIALOGUE_BY_PERSONALITY:
  Record<
    CharacterPersonalityId,
    Record<
      CharacterRelationshipDialogueTier,
      readonly string[]
    >
  > = {
  balanced: {
    distant: [
      '아직은 조금 어색하지만, 천천히 알아가자.',
      '반가워. 오늘도 잘 부탁해.',
    ],
    familiar: [
      '이제 네가 오는 게 조금 익숙해졌어.',
      '우리, 제법 자주 만나는 것 같아.',
    ],
    close: [
      '네가 오면 자연스럽게 마음이 놓여.',
      '같이 있는 시간이 점점 좋아져.',
    ],
    bonded: [
      '네가 곁에 있는 게 이제 정말 자연스러워.',
      '우리라면 오래 함께 갈 수 있을 것 같아.',
    ],
  },
  'curious-active': {
    distant: [
      '음... 너는 어떤 걸 좋아해?',
      '아직 모르는 게 많네. 천천히 알아볼래.',
    ],
    familiar: [
      '또 왔네! 이번엔 뭐가 궁금해?',
      '네 취향도 조금씩 알 것 같아.',
    ],
    close: [
      '너랑 같이 찾으면 발견이 더 재밌어.',
      '새로운 걸 찾으면 제일 먼저 너한테 말할게.',
    ],
    bonded: [
      '우리 둘이면 어디든 재밌게 탐색할 수 있어!',
      '이제 너랑 함께 보는 풍경이 제일 궁금해.',
    ],
  },
  'cozy-calm': {
    distant: [
      '안녕... 여기서 천천히 쉬고 있어.',
      '조용히 같이 있는 건 괜찮아.',
    ],
    familiar: [
      '네가 오면 분위기가 조금 더 편해져.',
      '이제 옆에 있어도 꽤 익숙해.',
    ],
    close: [
      '네 옆에서는 금방 편안해져.',
      '같이 쉬는 시간이 참 좋아.',
    ],
    bonded: [
      '네 옆이 내가 제일 편하게 쉴 수 있는 곳이야.',
      '아무 말 없이 같이 있어도 정말 좋아.',
    ],
  },
  'social-warm': {
    distant: [
      '안녕! 천천히 친해져도 좋아.',
      '오늘부터 조금씩 이야기해보자.',
    ],
    familiar: [
      '또 만나서 반가워!',
      '이제 네가 오면 먼저 인사하고 싶어.',
    ],
    close: [
      '네 이야기를 듣는 시간이 좋아.',
      '우리 꽤 가까운 친구가 된 것 같아.',
    ],
    bonded: [
      '네가 있어서 정말 든든해.',
      '너는 내게 아주 소중한 친구야.',
    ],
  },
  'explorer-curious': {
    distant: [
      '같이 갈 거라면 천천히 출발해보자.',
      '먼저 가까운 길부터 함께 확인해볼래?',
    ],
    familiar: [
      '네가 좋아할 만한 길을 하나 찾았어.',
      '이제 함께 가는 속도가 조금 맞는 것 같아.',
    ],
    close: [
      '다음 목적지도 너랑 같이 정하고 싶어.',
      '우리 탐험 기록이 점점 특별해지고 있어.',
    ],
    bonded: [
      '어디든 너와 함께라면 좋은 목적지가 돼.',
      '다음 지도도 마지막 지도도 같이 채우자.',
    ],
  },
  'playful-adventurous': {
    distant: [
      '처음부터 너무 큰 장난은 안 칠게!',
      '일단 가볍게 한 판 놀아볼래?',
    ],
    familiar: [
      '이제 어떤 장난에 웃는지 조금 알겠어!',
      '또 왔네? 이번엔 더 재밌게 놀자!',
    ],
    close: [
      '너랑 있으면 뭘 해도 재밌어!',
      '우리만 아는 놀이 하나 더 만들자.',
    ],
    bonded: [
      '최고의 모험 파트너는 역시 너야!',
      '너랑 같이면 매일 새로운 모험 같아.',
    ],
  },
  'gentle-shy': {
    distant: [
      '안녕... 아직은 조금 부끄러워.',
      '천천히 가까워져도 괜찮지...?',
    ],
    familiar: [
      '이제 네가 와도 예전만큼 긴장하진 않아.',
      '조금씩... 익숙해지고 있어.',
    ],
    close: [
      '네 옆에서는 말이 조금 더 잘 나와.',
      '가까이 있어도 이제 편안해.',
    ],
    bonded: [
      '너한테는... 내 마음을 더 많이 말할 수 있어.',
      '네가 곁에 있으면 정말 따뜻해.',
    ],
  },
};

type AutonomousDialoguePools =
  Record<
    CharacterAutonomousDialogueContext,
    readonly string[]
  >;

// CHARACTER_V99D_CONTEXTUAL_AUTONOMOUS_DIALOGUE
const AUTONOMOUS_DIALOGUE_BY_PERSONALITY:
  Record<
    CharacterPersonalityId,
    AutonomousDialoguePools
  > = {
  balanced: {
    idle: [
      '잠깐 멈춰서 주변을 느껴보자.',
      '가만히 있는 시간도 괜찮네.',
    ],
    lookAround: [
      '저쪽엔 뭐가 있을까?',
      '주변을 조금 더 살펴볼게.',
    ],
    sit: [
      '여기서 잠깐 쉬었다 가자.',
      '앉아 있으니 마음이 차분해져.',
    ],
    sleep: [
      '조금만 눈을 붙일게.',
      '잠깐 쉬고 다시 만나자.',
    ],
  },
  'curious-active': {
    idle: [
      '가만히 있어도 궁금한 게 생기네.',
      '다음엔 어디부터 볼까?',
    ],
    lookAround: [
      '어? 저쪽이 조금 신경 쓰여!',
      '뭔가 새로 발견할 것 같아.',
    ],
    sit: [
      '앉아서도 주변은 계속 볼 수 있지!',
      '잠깐 쉬면서 다음 탐색 계획을 세울래.',
    ],
    sleep: [
      '궁금한 건 많지만... 일단 충전!',
      '조금 자고 더 멀리 가볼래.',
    ],
  },
  'cozy-calm': {
    idle: [
      '조용해서 좋다.',
      '이런 느린 시간도 좋아.',
    ],
    lookAround: [
      '천천히 둘러보니까 편안해.',
      '예쁜 곳이 있는지 살짝 볼게.',
    ],
    sit: [
      '응... 역시 앉아 있는 게 좋아.',
      '여기 꽤 포근한데?',
    ],
    sleep: [
      '조금 졸려... 잘 자.',
      '포근하게 조금만 잘게.',
    ],
  },
  'social-warm': {
    idle: [
      '누가 지나가면 인사하고 싶어.',
      '오늘도 좋은 만남이 있으면 좋겠다.',
    ],
    lookAround: [
      '누가 있나 한번 둘러볼게!',
      '반가운 얼굴이 보일지도 몰라.',
    ],
    sit: [
      '같이 앉아서 이야기하면 좋겠다.',
      '쉬는 동안에도 함께 있으면 좋아.',
    ],
    sleep: [
      '조금 쉬고 다시 반갑게 인사할게.',
      '잠깐만 잘게. 이따 또 이야기하자.',
    ],
  },
  'explorer-curious': {
    idle: [
      '다음 경로를 머릿속에 그리고 있어.',
      '여기서 다음 목적지를 정해볼까.',
    ],
    lookAround: [
      '탐험 포인트가 있는지 확인 중이야.',
      '저 방향도 지도에 표시해둘래.',
    ],
    sit: [
      '잠깐 쉬면서 지도를 정리할게.',
      '다음 길을 고르기 전에 잠시 휴식.',
    ],
    sleep: [
      '탐험은 내일도 계속되니까 조금 잘게.',
      '다음 목적지를 꿈에서 먼저 볼지도 몰라.',
    ],
  },
  'playful-adventurous': {
    idle: [
      '가만히 있으려니 장난치고 싶어져!',
      '다음 재미있는 일을 기다리는 중!',
    ],
    lookAround: [
      '재밌는 거 어디 없나?',
      '저쪽에 뭔가 신나는 게 있을 것 같아!',
    ],
    sit: [
      '이번 라운드는 잠깐 쉬는 시간!',
      '앉아서 다음 장난을 생각해볼래.',
    ],
    sleep: [
      '충전하고 더 신나게 놀 거야!',
      '잠깐만 자고 다시 모험하자.',
    ],
  },
  'gentle-shy': {
    idle: [
      '조용히 있으니까 마음이 편해.',
      '잠깐 이렇게 있어도 괜찮겠지...?',
    ],
    lookAround: [
      '살짝만... 주변을 볼게.',
      '저쪽도 조용한 곳일까...?',
    ],
    sit: [
      '여기 앉아 있으니 조금 안심돼.',
      '잠깐 쉬면 용기가 다시 날 것 같아.',
    ],
    sleep: [
      '조금만 잘게... 깨우진 않아도 돼.',
      '편안한 꿈을 꾸면 좋겠다.',
    ],
  },
};

// CHARACTER_V99D_AUTONOMOUS_RARITY_POLICY
export const CHARACTER_AUTONOMOUS_DIALOGUE_POLICY = {
  startupGraceMs:
    30_000,
  cooldownMs:
    75_000,
  chance: {
    idle: 0.04,
    lookAround: 0.10,
    sit: 0.08,
    sleep: 0.12,
  },
} as const;

const autonomousDialogueRuntimeStartedAt =
  Date.now();

const lastAutonomousAtByCharacter =
  new Map<
    CharacterId,
    number
  >();

export function getCharacterRelationshipDialogueTier(
  points: number
): CharacterRelationshipDialogueTier {
  const value =
    Number.isFinite(
      points
    )
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              points
            )
          )
        )
      : 0;

  if (
    value >=
    75
  ) {
    return 'bonded';
  }

  if (
    value >=
    50
  ) {
    return 'close';
  }

  if (
    value >=
    25
  ) {
    return 'familiar';
  }

  return 'distant';
}

// CHARACTER_V99C_STATE_PRIORITY
export function getCharacterMicroDialogueTone(
  input: {
    condition:
      RootyConditionSnapshot;
    interaction:
      CharacterMicroDialogueInteraction;
    relationshipPoints:
      number;
  }
): CharacterMicroDialogueTone {
  const {
    condition,
    interaction,
  } =
    input;

  /**
   * Preserve the existing V60/V62 priority:
   * tired/exhausted energy recovery is stronger than low-mood expression.
   */
  if (
    condition.flags.isTired ||
    condition.flags.isExhausted
  ) {
    return 'tired';
  }

  if (
    condition.flags.isLowMood
  ) {
    return 'low';
  }

  if (
    condition.flags.isExcited
  ) {
    return 'excited';
  }

  if (
    interaction ===
      'longPress' &&
    Number.isFinite(
      input.relationshipPoints
    ) &&
    input.relationshipPoints >=
      75
  ) {
    return 'bonded';
  }

  if (
    condition.mood ===
      'happy'
  ) {
    return 'happy';
  }

  return 'calm';
}

function recentKey(
  characterId:
    CharacterId,
  tone:
    CharacterMicroDialogueTone
): string {
  return (
    characterId +
    ':' +
    tone
  );
}

// CHARACTER_V99C_ANTI_REPEAT
function pickNonRepeatingLine(
  characterId:
    CharacterId,
  tone:
    CharacterMicroDialogueTone,
  pool:
    readonly string[]
): string {
  const key =
    recentKey(
      characterId,
      tone
    );

  const recent =
    recentLinesByKey.get(
      key
    ) ??
    [];

  const candidates =
    pool.filter(
      (
        line
      ) =>
        !recent.includes(
          line
        )
    );

  const usable =
    candidates.length >
      0
      ? candidates
      : [
          ...pool,
        ];

  const rawIndex =
    Math.floor(
      Math.random() *
      usable.length
    );

  const index =
    Math.max(
      0,
      Math.min(
        usable.length - 1,
        rawIndex
      )
    );

  const line =
    usable[
      index
    ] ??
    pool[
      0
    ] ??
    '...';

  const nextRecent =
    [
      ...recent,
      line,
    ].slice(
      -CHARACTER_MICRO_DIALOGUE_RECENT_LIMIT
    );

  recentLinesByKey.set(
    key,
    nextRecent
  );

  return line;
}

// CHARACTER_V99C_RUNTIME_ONLY_DIALOGUE_EVENT
export function emitCharacterMicroDialogue(
  input: {
    characterId:
      CharacterId;
    interaction:
      CharacterMicroDialogueInteraction;
    condition:
      RootyConditionSnapshot;
    relationshipPoints:
      number;
    now?: number;
  }
): boolean {
  if (
    listeners.size ===
    0
  ) {
    return false;
  }

  const now =
    Number.isFinite(
      input.now
    )
      ? Number(
          input.now
        )
      : Date.now();

  const lastShownAt =
    lastShownAtByCharacter.get(
      input.characterId
    ) ??
    0;

  if (
    now -
      lastShownAt <
    CHARACTER_MICRO_DIALOGUE_COOLDOWN_MS
  ) {
    return false;
  }

  const personality =
    getCharacterPersonalityProfile(
      input.characterId
    );

  const tone =
    getCharacterMicroDialogueTone({
      condition:
        input.condition,
      interaction:
        input.interaction,
      relationshipPoints:
        input.relationshipPoints,
    });

  const relationshipTier =
    getCharacterRelationshipDialogueTier(
      input.relationshipPoints
    );

  // CHARACTER_V99D_LONG_PRESS_RELATIONSHIP_DEPTH
  const usesRelationshipDepth =
    input.interaction ===
      'longPress' &&
    tone !==
      'tired' &&
    tone !==
      'low' &&
    tone !==
      'excited';

  const pool =
    usesRelationshipDepth
      ? RELATIONSHIP_DIALOGUE_BY_PERSONALITY[
          personality.id
        ][
          relationshipTier
        ]
      : DIALOGUE_BY_PERSONALITY[
          personality.id
        ][
          tone
        ];

  const text =
    pickNonRepeatingLine(
      input.characterId,
      tone,
      pool
    );

  sequence +=
    1;

  const event:
    CharacterMicroDialogueEvent = {
    id: sequence,
    characterId:
      input.characterId,
    personalityId:
      personality.id,
    interaction:
      input.interaction,
    tone,
    mood:
      input.condition.mood,
    energy:
      input.condition.energy,
    relationshipPoints:
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            input.relationshipPoints
          )
        )
      ),
    relationshipTier,
    context: null,
    text,
    at: now,
  };

  lastShownAtByCharacter.set(
    input.characterId,
    now
  );

  listeners.forEach(
    (
      listener
    ) => {
      listener(
        event
      );
    }
  );

  return true;
}


// CHARACTER_V99D_CONTEXTUAL_AUTONOMOUS_DIALOGUE
export function considerCharacterAutonomousDialogue(
  input: {
    characterId:
      CharacterId;
    context:
      CharacterAutonomousDialogueContext;
    condition:
      RootyConditionSnapshot;
    relationshipPoints:
      number;
    roll?: number;
    now?: number;
  }
): boolean {
  if (
    listeners.size ===
    0
  ) {
    return false;
  }

  const now =
    Number.isFinite(
      input.now
    )
      ? Number(
          input.now
        )
      : Date.now();

  if (
    now -
      autonomousDialogueRuntimeStartedAt <
    CHARACTER_AUTONOMOUS_DIALOGUE_POLICY
      .startupGraceMs
  ) {
    return false;
  }

  const lastShownAt =
    lastShownAtByCharacter.get(
      input.characterId
    ) ??
    0;

  if (
    now -
      lastShownAt <
    CHARACTER_MICRO_DIALOGUE_COOLDOWN_MS
  ) {
    return false;
  }

  const lastAutonomousAt =
    lastAutonomousAtByCharacter.get(
      input.characterId
    ) ??
    0;

  if (
    now -
      lastAutonomousAt <
    CHARACTER_AUTONOMOUS_DIALOGUE_POLICY
      .cooldownMs
  ) {
    return false;
  }

  const roll =
    Number.isFinite(
      input.roll
    )
      ? Number(
          input.roll
        )
      : Math.random();

  const chance =
    CHARACTER_AUTONOMOUS_DIALOGUE_POLICY
      .chance[
        input.context
      ];

  if (
    roll <
      0 ||
    roll >=
      chance
  ) {
    return false;
  }

  const personality =
    getCharacterPersonalityProfile(
      input.characterId
    );

  const relationshipTier =
    getCharacterRelationshipDialogueTier(
      input.relationshipPoints
    );

  const tone =
    getCharacterMicroDialogueTone({
      condition:
        input.condition,
      interaction:
        'autonomous',
      relationshipPoints:
        input.relationshipPoints,
    });

  const pool =
    AUTONOMOUS_DIALOGUE_BY_PERSONALITY[
      personality.id
    ][
      input.context
    ];

  const text =
    pickNonRepeatingLine(
      input.characterId,
      tone,
      pool
    );

  sequence +=
    1;

  const event:
    CharacterMicroDialogueEvent = {
    id: sequence,
    characterId:
      input.characterId,
    personalityId:
      personality.id,
    interaction:
      'autonomous',
    tone,
    mood:
      input.condition.mood,
    energy:
      input.condition.energy,
    relationshipPoints:
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            input.relationshipPoints
          )
        )
      ),
    relationshipTier,
    context:
      input.context,
    text,
    at: now,
  };

  lastShownAtByCharacter.set(
    input.characterId,
    now
  );

  lastAutonomousAtByCharacter.set(
    input.characterId,
    now
  );

  listeners.forEach(
    (
      listener
    ) => {
      listener(
        event
      );
    }
  );

  return true;
}

export function subscribeCharacterMicroDialogue(
  listener: Listener
): () => void {
  listeners.add(
    listener
  );

  return () => {
    listeners.delete(
      listener
    );
  };
}
