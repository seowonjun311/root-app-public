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
import {
  type CharacterPlaybackMode,
} from '../../constants/characterPlayback';

export type CharacterSpriteProps = {
  characterId: CharacterId;
  action: CharacterAction;
  size?: number;
  frameDurationMs?: number;
  paused?: boolean;
  playbackKey?: string | number;
  playbackMode?: CharacterPlaybackMode;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

// CHARACTER_V69_CHARACTER_SPRITE_COMPATIBILITY_PREVIEW
// CHARACTER_V73_PLAYBACK_STABILITY_ENGINE
export function CharacterSprite({
  characterId,
  action,
  size = 160,
  frameDurationMs = 320,
  paused = false,
  playbackKey,
  playbackMode = 'loop',
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

  const [
    frameIndex,
    setFrameIndex,
  ] =
    useState(0);

  useEffect(
    () => {
      setFrameIndex(0);
    },
    [
      characterId,
      action,
      playbackKey,
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

      if (
        playbackMode ===
          'once-hold' &&
        frameIndex >=
          frames.length - 1
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
        setTimeout(
          () => {
            setFrameIndex(
              (current) => {
                if (
                  playbackMode ===
                  'once-hold'
                ) {
                  return Math.min(
                    current + 1,
                    frames.length - 1
                  );
                }

                return (
                  current + 1
                ) %
                  frames.length;
              }
            );
          },
          safeDuration
        );

      return () => {
        clearTimeout(
          timer
        );
      };
    },
    [
      paused,
      frameDurationMs,
      frames,
      frameIndex,
      playbackMode,
    ]
  );

  const safeFrameIndex =
    frames.length > 0
      ? Math.min(
          frameIndex,
          frames.length - 1
        )
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
