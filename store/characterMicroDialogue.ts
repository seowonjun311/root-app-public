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
  | 'longPress';

export type CharacterMicroDialogueTone =
  | 'low'
  | 'tired'
  | 'calm'
  | 'happy'
  | 'excited'
  | 'bonded';

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

  const pool =
    DIALOGUE_BY_PERSONALITY[
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
