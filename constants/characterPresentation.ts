import {
  type CharacterAction,
  type CharacterId,
} from './characterAssets';

export type CharacterPresentationProfile = {
  homeScale: number;
  homeTranslateY: number;
  previewScale: number;
  previewTranslateY: number;
  frameDurationMs:
    Record<
      CharacterAction,
      number
    >;
};

const STANDARD_FRAME_DURATION_MS:
  Record<
    CharacterAction,
    number
  > = {
  idle: 460,
  walk: 180,
  sit: 380,
  sleep: 620,
  happy: 180,
  touch: 220,
};

const ROOTY_PREVIEW_FRAME_DURATION_MS:
  Record<
    CharacterAction,
    number
  > = {
  idle: 320,
  walk: 320,
  sit: 320,
  sleep: 320,
  happy: 320,
  touch: 320,
};

// CHARACTER_V71_PRESENTATION_PROFILE
export const CHARACTER_PRESENTATION:
  Record<
    CharacterId,
    CharacterPresentationProfile
  > = {
  rooty: {
    homeScale: 1,
    homeTranslateY: 0,
    previewScale: 1,
    previewTranslateY: 0,
    frameDurationMs:
      ROOTY_PREVIEW_FRAME_DURATION_MS,
  },
  // CHARACTER_V87_HOME_SIZE_GROUND_CALIBRATION
  // Standard-character artwork has different transparent-canvas geometry.
  // These Home-only baselines equalize visual presence and ground contact.
  moru: {
    homeScale: 0.98,
    homeTranslateY: 5,
    previewScale: 1,
    previewTranslateY: 0,
    frameDurationMs:
      STANDARD_FRAME_DURATION_MS,
  },
  mongsil: {
    homeScale: 1.2,
    homeTranslateY: 2,
    previewScale: 1,
    previewTranslateY: 0,
    frameDurationMs:
      STANDARD_FRAME_DURATION_MS,
  },
  dami: {
    homeScale: 1.03,
    homeTranslateY: 4,
    previewScale: 1,
    previewTranslateY: 0,
    frameDurationMs:
      STANDARD_FRAME_DURATION_MS,
  },  // CHARACTER_V90B_PIO_PRESENTATION
  pio: {
    homeScale: 1.18,
    homeTranslateY: 5,
    previewScale: 1,
    previewTranslateY: 0,
    frameDurationMs:
      STANDARD_FRAME_DURATION_MS,
  },

};

export function getCharacterPresentationProfile(
  characterId: CharacterId
): CharacterPresentationProfile {
  return CHARACTER_PRESENTATION[
    characterId
  ];
}
