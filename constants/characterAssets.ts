import type { ImageSourcePropType } from 'react-native';

import {
  ROOTY_FRAMES,
  type RootyAction,
} from './rootyAssets';

// CHARACTER_V68_MULTI_CHARACTER_ASSET_REGISTRY
export const CHARACTER_IDS = [
  'rooty',
  'moru',
  'mongsil',
  'dami',
] as const;

export type CharacterId =
  (typeof CHARACTER_IDS)[number];

export type CharacterAction = RootyAction;

export type CharacterFrameProfile =
  | 'legacy-rooty'
  | 'standard-23';

export type CharacterFrameSet =
  Record<
    CharacterAction,
    readonly ImageSourcePropType[]
  >;

export type CharacterAssetDefinition = {
  id: CharacterId;
  displayName: string;
  frameProfile: CharacterFrameProfile;
  frames: CharacterFrameSet;
  referenceSheet?: ImageSourcePropType;
};

const MORU_CHARACTER_FRAMES:
  CharacterFrameSet = {
  idle: [
    require('../characters/moru/moru_idle_01.png'),
    require('../characters/moru/moru_idle_02.png'),
    require('../characters/moru/moru_idle_03.png'),
    require('../characters/moru/moru_idle_04.png'),
  ],
  walk: [
    require('../characters/moru/moru_walk_01.png'),
    require('../characters/moru/moru_walk_02.png'),
    require('../characters/moru/moru_walk_03.png'),
    require('../characters/moru/moru_walk_04.png'),
  ],
  sit: [
    require('../characters/moru/moru_sit_01.png'),
    require('../characters/moru/moru_sit_02.png'),
    require('../characters/moru/moru_sit_03.png'),
    require('../characters/moru/moru_sit_04.png'),
  ],
  sleep: [
    require('../characters/moru/moru_sleep_01.png'),
    require('../characters/moru/moru_sleep_02.png'),
    require('../characters/moru/moru_sleep_03.png'),
    require('../characters/moru/moru_sleep_04.png'),
    require('../characters/moru/moru_sleep_05.png'),
  ],
  happy: [
    require('../characters/moru/moru_happy_01.png'),
    require('../characters/moru/moru_happy_02.png'),
    require('../characters/moru/moru_happy_03.png'),
    require('../characters/moru/moru_happy_04.png'),
  ],
  touch: [
    require('../characters/moru/moru_touch_01.png'),
    require('../characters/moru/moru_touch_02.png'),
  ],
};

const MONGSIL_CHARACTER_FRAMES:
  CharacterFrameSet = {
  idle: [
    require('../characters/mongsil/mongsil_idle_01.png'),
    require('../characters/mongsil/mongsil_idle_02.png'),
    require('../characters/mongsil/mongsil_idle_03.png'),
    require('../characters/mongsil/mongsil_idle_04.png'),
  ],
  walk: [
    require('../characters/mongsil/mongsil_walk_01.png'),
    require('../characters/mongsil/mongsil_walk_02.png'),
    require('../characters/mongsil/mongsil_walk_03.png'),
    require('../characters/mongsil/mongsil_walk_04.png'),
  ],
  sit: [
    require('../characters/mongsil/mongsil_sit_01.png'),
    require('../characters/mongsil/mongsil_sit_02.png'),
    require('../characters/mongsil/mongsil_sit_03.png'),
    require('../characters/mongsil/mongsil_sit_04.png'),
  ],
  sleep: [
    require('../characters/mongsil/mongsil_sleep_01.png'),
    require('../characters/mongsil/mongsil_sleep_02.png'),
    require('../characters/mongsil/mongsil_sleep_03.png'),
    require('../characters/mongsil/mongsil_sleep_04.png'),
    require('../characters/mongsil/mongsil_sleep_05.png'),
  ],
  happy: [
    require('../characters/mongsil/mongsil_happy_01.png'),
    require('../characters/mongsil/mongsil_happy_02.png'),
    require('../characters/mongsil/mongsil_happy_03.png'),
    require('../characters/mongsil/mongsil_happy_04.png'),
  ],
  touch: [
    require('../characters/mongsil/mongsil_touch_01.png'),
    require('../characters/mongsil/mongsil_touch_02.png'),
  ],
};

const DAMI_CHARACTER_FRAMES:
  CharacterFrameSet = {
  idle: [
    require('../characters/dami/dami_idle_01.png'),
    require('../characters/dami/dami_idle_02.png'),
    require('../characters/dami/dami_idle_03.png'),
    require('../characters/dami/dami_idle_04.png'),
  ],
  walk: [
    require('../characters/dami/dami_walk_01.png'),
    require('../characters/dami/dami_walk_02.png'),
    require('../characters/dami/dami_walk_03.png'),
    require('../characters/dami/dami_walk_04.png'),
  ],
  sit: [
    require('../characters/dami/dami_sit_01.png'),
    require('../characters/dami/dami_sit_02.png'),
    require('../characters/dami/dami_sit_03.png'),
    require('../characters/dami/dami_sit_04.png'),
  ],
  sleep: [
    require('../characters/dami/dami_sleep_01.png'),
    require('../characters/dami/dami_sleep_02.png'),
    require('../characters/dami/dami_sleep_03.png'),
    require('../characters/dami/dami_sleep_04.png'),
    require('../characters/dami/dami_sleep_05.png'),
  ],
  happy: [
    require('../characters/dami/dami_happy_01.png'),
    require('../characters/dami/dami_happy_02.png'),
    require('../characters/dami/dami_happy_03.png'),
    require('../characters/dami/dami_happy_04.png'),
  ],
  touch: [
    require('../characters/dami/dami_touch_01.png'),
    require('../characters/dami/dami_touch_02.png'),
  ],
};

export const CHARACTER_ASSET_REGISTRY:
  Record<CharacterId, CharacterAssetDefinition> = {
  rooty: {
    id: 'rooty',
    displayName: '猷⑦떚',
    frameProfile: 'legacy-rooty',
    frames: ROOTY_FRAMES,
  },
  moru: {
    id: 'moru',
    displayName: '紐⑤（',
    frameProfile: 'standard-23',
    frames: MORU_CHARACTER_FRAMES,
    referenceSheet:
      require('../characters/moru/moru_reference_sheet.png'),
  },
  mongsil: {
    id: 'mongsil',
    displayName: '紐쎌떎',
    frameProfile: 'standard-23',
    frames: MONGSIL_CHARACTER_FRAMES,
  },
  dami: {
    id: 'dami',
    displayName: '?ㅻ?',
    frameProfile: 'standard-23',
    frames: DAMI_CHARACTER_FRAMES,
    referenceSheet:
      require('../characters/dami/dami_reference_sheet.png'),
  },
};

export function getCharacterAssetDefinition(
  characterId: CharacterId
): CharacterAssetDefinition {
  return CHARACTER_ASSET_REGISTRY[characterId];
}

export function getCharacterFrames(
  characterId: CharacterId,
  action: CharacterAction
): readonly ImageSourcePropType[] {
  const frames =
    CHARACTER_ASSET_REGISTRY[characterId].frames[action];

  if (frames.length > 0) {
    return frames;
  }

  return CHARACTER_ASSET_REGISTRY[characterId].frames.idle;
}
