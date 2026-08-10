import React, {
  type ComponentProps,
} from 'react';

import LegacyRootySprite from '../rooty/RootySprite';
import CharacterSprite from './CharacterSprite';
import {
  useSelectedCharacter,
} from '../../store/selectedCharacter';

type LegacyProps =
  ComponentProps<
    typeof LegacyRootySprite
  >;

// CHARACTER_V70_SAFE_HOME_RENDER_SWITCH
export function SelectedCharacterSprite(
  props: LegacyProps
) {
  const {
    selectedCharacter,
    ready,
  } =
    useSelectedCharacter();

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

  const size =
    (
      'size' in props &&
      typeof props.size ===
        'number'
    )
      ? props.size
      : 160;

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
      testID="character-v70-home-sprite"
    />
  );
}

export default SelectedCharacterSprite;
