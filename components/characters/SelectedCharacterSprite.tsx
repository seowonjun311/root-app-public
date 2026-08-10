import React, {
  type ComponentProps,
} from 'react';

import LegacyRootySprite from '../rooty/RootySprite';
import CharacterSprite from './CharacterSprite';
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

  const cycleKey =
    'cycleKey' in props
      ? String(
          props.cycleKey ??
          ''
        )
      : '';

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
      key={
        selectedCharacter +
        '-' +
        action +
        '-' +
        cycleKey
      }
      characterId={
        selectedCharacter
      }
      action={
        action
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
        ],
      }}
      testID="character-v72-home-sprite"
    />
  );
}

export default SelectedCharacterSprite;
