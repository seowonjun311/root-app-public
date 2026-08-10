import React, {
  type ComponentProps,
} from 'react';

import LegacyRootySprite from '../rooty/RootySprite';
import CharacterSprite from './CharacterSprite';
import {
  resolveStandardCharacterScaleX,
} from '../../constants/characterFacing';
import {
  getCharacterPlaybackMode,
} from '../../constants/characterPlayback';
import {
  getCharacterPresentationProfile,
} from '../../constants/characterPresentation';
import {
  useCharacterPresentationOverride,
} from '../../store/characterPresentationOverrides';
import {
  useSelectedCharacter,
} from '../../store/selectedCharacter';

type LegacyProps =
  ComponentProps<
    typeof LegacyRootySprite
  >;

// CHARACTER_V70_SAFE_HOME_RENDER_SWITCH
// CHARACTER_V71_STANDARD_PRESENTATION_TUNING
// CHARACTER_V72_DEVICE_PRESENTATION_CALIBRATION
// CHARACTER_V73_HOME_PLAYBACK_IDENTITY
// CHARACTER_V74_STANDARD_HOME_FACING
export function SelectedCharacterSprite(
  props: LegacyProps
) {
  const {
    selectedCharacter,
    ready,
  } =
    useSelectedCharacter();

  const {
    override,
  } =
    useCharacterPresentationOverride(
      selectedCharacter
    );

  if (
    !ready ||
    selectedCharacter ===
      'rooty'
  ) {
    return (
      <LegacyRootySprite
        {...props}
      />
    );
  }

  const action =
    props.action ??
    'idle';

  const playbackKey =
    'cycleKey' in props
      ? String(
          props.cycleKey ??
          ''
        )
      : '';

  const legacyDirection =
    (
      props as unknown as {
        direction?: unknown;
      }
    ).direction;

  const facingScaleX =
    resolveStandardCharacterScaleX(
      legacyDirection
    );

  const baseSize =
    (
      'size' in props &&
      typeof props.size ===
        'number'
    )
      ? props.size
      : 160;

  const presentation =
    getCharacterPresentationProfile(
      selectedCharacter
    );

  const playbackMode =
    getCharacterPlaybackMode(
      action
    );

  const size =
    Math.max(
      1,
      Math.round(
        baseSize *
        presentation.homeScale *
        override.scale
      )
    );

  const translateY =
    presentation.homeTranslateY +
    override.translateY;

  return (
    <CharacterSprite
      characterId={
        selectedCharacter
      }
      action={
        action
      }
      playbackKey={
        playbackKey
      }
      playbackMode={
        playbackMode
      }
      size={
        size
      }
      frameDurationMs={
        presentation.frameDurationMs[
          action
        ]
      }
      style={{
        transform: [
          {
            translateY,
          },
          {
            scaleX:
              facingScaleX,
          },
        ],
      }}
      testID="character-v74-home-sprite"
    />
  );
}

export default SelectedCharacterSprite;
