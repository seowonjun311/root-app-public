import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Image,
  type ImageStyle,
  type StyleProp,
} from 'react-native';

import {
  getCharacterFrames,
  type CharacterAction,
  type CharacterId,
} from '../../constants/characterAssets';

export type CharacterSpriteProps = {
  characterId: CharacterId;
  action: CharacterAction;
  size?: number;
  frameDurationMs?: number;
  paused?: boolean;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

// CHARACTER_V69_CHARACTER_SPRITE_COMPATIBILITY_PREVIEW
export function CharacterSprite({
  characterId,
  action,
  size = 160,
  frameDurationMs = 320,
  paused = false,
  style,
  testID,
}: CharacterSpriteProps) {
  const frames =
    useMemo(
      () =>
        getCharacterFrames(
          characterId,
          action
        ),
      [
        characterId,
        action,
      ]
    );

  const [frameIndex, setFrameIndex] =
    useState(0);

  useEffect(
    () => {
      setFrameIndex(0);
    },
    [
      characterId,
      action,
    ]
  );

  useEffect(
    () => {
      if (
        paused ||
        frames.length <= 1
      ) {
        return;
      }

      const safeDuration =
        Math.max(
          80,
          Math.floor(
            frameDurationMs
          )
        );

      const timer =
        setInterval(
          () => {
            setFrameIndex(
              (current) =>
                (
                  current + 1
                ) %
                frames.length
            );
          },
          safeDuration
        );

      return () => {
        clearInterval(
          timer
        );
      };
    },
    [
      paused,
      frameDurationMs,
      frames,
    ]
  );

  const safeFrameIndex =
    frames.length > 0
      ? frameIndex %
        frames.length
      : 0;

  const source =
    frames[
      safeFrameIndex
    ];

  if (!source) {
    return null;
  }

  return (
    <Image
      testID={testID}
      source={source}
      resizeMode="contain"
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}

export default CharacterSprite;
