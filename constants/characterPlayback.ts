import {
  type CharacterAction,
} from './characterAssets';

export type CharacterPlaybackMode =
  'loop' |
  'once-hold';

// CHARACTER_V73_STANDARD_PLAYBACK_POLICY
export const CHARACTER_PLAYBACK_MODE:
  Record<
    CharacterAction,
    CharacterPlaybackMode
  > = {
  idle: 'loop',
  walk: 'loop',
  sit: 'loop',
  sleep: 'loop',
  happy: 'once-hold',
  touch: 'once-hold',
};

export function getCharacterPlaybackMode(
  action: CharacterAction
): CharacterPlaybackMode {
  return CHARACTER_PLAYBACK_MODE[
    action
  ];
}
