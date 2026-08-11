import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Image,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  getCharacterAssetDefinition,
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
type StandardFrameBufferSlot =
  | 'a'
  | 'b';

type StandardFrameBufferProps = {
  source: ImageSourcePropType;
  size: number;
  testID?: string;
};

function StandardFrameDoubleBuffer({
  source,
  size,
  testID,
}: StandardFrameBufferProps) {
  const desiredSourceRef =
    useRef<ImageSourcePropType>(
      source
    );

  const [
    slotA,
    setSlotA,
  ] =
    useState<ImageSourcePropType>(
      source
    );

  const [
    slotB,
    setSlotB,
  ] =
    useState<ImageSourcePropType>(
      source
    );

  const [
    slotALoaded,
    setSlotALoaded,
  ] =
    useState(false);

  const [
    slotBLoaded,
    setSlotBLoaded,
  ] =
    useState(false);

  const [
    activeSlot,
    setActiveSlot,
  ] =
    useState<StandardFrameBufferSlot>(
      'a'
    );

  useEffect(
    () => {
      desiredSourceRef.current =
        source;

      const activeSource =
        activeSlot === 'a'
          ? slotA
          : slotB;

      if (
        source ===
        activeSource
      ) {
        return;
      }

      if (
        activeSlot === 'a'
      ) {
        if (
          slotB ===
          source
        ) {
          if (
            slotBLoaded
          ) {
            setActiveSlot(
              'b'
            );
          }

          return;
        }

        setSlotBLoaded(
          false
        );

        setSlotB(
          source
        );

        return;
      }

      if (
        slotA ===
        source
      ) {
        if (
          slotALoaded
        ) {
          setActiveSlot(
            'a'
          );
        }

        return;
      }

      setSlotALoaded(
        false
      );

      setSlotA(
        source
      );
    },
    [
      source,
      activeSlot,
      slotA,
      slotB,
      slotALoaded,
      slotBLoaded,
    ]
  );

  const handleLoaded =
    (
      slot:
        StandardFrameBufferSlot,
      loadedSource:
        ImageSourcePropType
    ) => {
      if (
        slot === 'a'
      ) {
        setSlotALoaded(
          true
        );
      }
      else {
        setSlotBLoaded(
          true
        );
      }

      if (
        loadedSource !==
        desiredSourceRef.current
      ) {
        return;
      }

      setActiveSlot(
        slot
      );
    };

  const imageBaseStyle = {
    position:
      'absolute' as const,
    left: 0,
    top: 0,
    width: size,
    height: size,
  };

  return (
    <View
      testID={
        testID
      }
      pointerEvents="none"
      style={{
        width: size,
        height: size,
      }}
    >
      <Image
        key={
          `standard-buffer-a-${String(slotA)}`
        }
        source={
          slotA
        }
        fadeDuration={0}
        resizeMode="contain"
        onLoad={
          () => {
            handleLoaded(
              'a',
              slotA
            );
          }
        }
        style={[
          imageBaseStyle,
          {
            opacity:
              activeSlot ===
                'a'
                ? 1
                : 0,
          },
        ]}
      />

      <Image
        key={
          `standard-buffer-b-${String(slotB)}`
        }
        source={
          slotB
        }
        fadeDuration={0}
        resizeMode="contain"
        onLoad={
          () => {
            handleLoaded(
              'b',
              slotB
            );
          }
        }
        style={[
          imageBaseStyle,
          {
            opacity:
              activeSlot ===
                'b'
                ? 1
                : 0,
          },
        ]}
      />
    </View>
  );
}

// CHARACTER_V69_CHARACTER_SPRITE_COMPATIBILITY_PREVIEW
// CHARACTER_V73_PLAYBACK_STABILITY_ENGINE
// CHARACTER_V82_STANDARD_FRAME_CANVAS_NORMALIZATION
// CHARACTER_V84_ANDROID_FRAME_FADE_FIX
// CHARACTER_V85_PERSISTENT_DOUBLE_BUFFER
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

  const frameProfile =
    getCharacterAssetDefinition(
      characterId
    ).frameProfile;

  const usesStandardCanvas =
    frameProfile ===
      'standard-23';

  if (usesStandardCanvas) {
    const normalizedSize =
      Math.max(
        1,
        Math.round(
          size * 1.6
        )
      );

    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
          },
          style as StyleProp<ViewStyle>,
        ]}
      >
        <StandardFrameDoubleBuffer
          key={characterId}
          testID={testID}
          source={source}
          size={normalizedSize}
        />
      </View>
    );
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
