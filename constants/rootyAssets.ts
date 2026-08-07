import type { ImageSourcePropType } from 'react-native';

export type RootyAction =
  | 'idle'
  | 'walk'
  | 'sit'
  | 'sleep'
  | 'happy'
  | 'touch';

export type RootyAnimationConfig = {
  frameMs: number;
  loop: boolean;
};

export const ROOTY_SIZE = {
  overlay: 120,
  preview: 180,
} as const;

/**
 * 현재 준비된 루티 PNG만 연결합니다.
 *
 * 준비 현황
 * - idle: 4
 * - walk: 4
 * - sit: 4
 * - sleep: 1
 * - happy: 3
 * - touch: 0
 *
 * sleep / happy / touch의 남은 이미지가 들어오면
 * 아래 배열에 require(...)만 추가하면 RootySprite가 자동으로 사용합니다.
 */
export const ROOTY_FRAMES: Record<RootyAction, readonly ImageSourcePropType[]> = {
  idle: [
    require('../assets/rooty/idle/rooty_idle_01.png'),
    require('../assets/rooty/idle/rooty_idle_02.png'),
    require('../assets/rooty/idle/rooty_idle_03.png'),
    require('../assets/rooty/idle/rooty_idle_04.png'),
  ],

  walk: [
    require('../assets/rooty/walk/rooty_walk_01.png'),
    require('../assets/rooty/walk/rooty_walk_02.png'),
    require('../assets/rooty/walk/rooty_walk_03.png'),
    require('../assets/rooty/walk/rooty_walk_04.png'),
  ],

  sit: [
    require('../assets/rooty/sit/rooty_sit_01.png'),
    require('../assets/rooty/sit/rooty_sit_02.png'),
    require('../assets/rooty/sit/rooty_sit_03.png'),
    require('../assets/rooty/sit/rooty_sit_04.png'),
  ],

  sleep: [
    require('../assets/rooty/sleep/rooty_sleep_01.png'),
    // TODO:
    // require('../assets/rooty/sleep/rooty_sleep_02.png'),
    // require('../assets/rooty/sleep/rooty_sleep_03.png'),
    // require('../assets/rooty/sleep/rooty_sleep_04.png'),
  ],

  happy: [
    require('../assets/rooty/happy/rooty_happy_01.png'),
    require('../assets/rooty/happy/rooty_happy_02.png'),
    require('../assets/rooty/happy/rooty_happy_03.png'),
    // TODO:
    // require('../assets/rooty/happy/rooty_happy_04.png'),
  ],

  // 아직 touch 전용 PNG가 없으므로 빈 배열로 둡니다.
  // RootySprite는 빈 배열이면 자동으로 idle을 사용합니다.
  touch: [
    // TODO:
    // require('../assets/rooty/touch/rooty_touch_01.png'),
    // require('../assets/rooty/touch/rooty_touch_02.png'),
    // require('../assets/rooty/touch/rooty_touch_03.png'),
  ],
};

export const ROOTY_ANIMATION: Record<RootyAction, RootyAnimationConfig> = {
  idle: {
    frameMs: 650,
    loop: true,
  },
  walk: {
    frameMs: 170,
    loop: true,
  },
  sit: {
    frameMs: 720,
    loop: true,
  },
  sleep: {
    frameMs: 900,
    loop: true,
  },
  happy: {
    frameMs: 160,
    loop: false,
  },
  touch: {
    frameMs: 180,
    loop: false,
  },
};

export function getRootyFrames(
  action: RootyAction,
): readonly ImageSourcePropType[] {
  const frames = ROOTY_FRAMES[action];

  if (frames.length > 0) {
    return frames;
  }

  return ROOTY_FRAMES.idle;
}
