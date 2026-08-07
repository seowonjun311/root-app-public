import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  ROOTY_ANIMATION,
  ROOTY_SIZE,
  type RootyAction,
} from '../../constants/rootyAssets';
import {
  resolveRootyDirectionalFrames,
  type RootyDirection,
} from '../../constants/rootyDirectionalAssets';

type RootySpriteProps = {
  action?: RootyAction;
  /**
   * ROOTY_BEHAVIOR_V5_DIRECTION_PROP
   *
   * Exact directional frames are preferred when registered.
   * Missing directional frames fall back safely.
   */
  direction?: RootyDirection;
  size?: number;
  playing?: boolean;

  /**
   * true  = 현재 동작을 계속 반복
   * false = 마지막 프레임에서 정지
   * 미지정 = rootyAssets.ts의 동작별 기본값 사용
   */
  loop?: boolean;

  /**
   * 프레임 속도를 개별적으로 덮어쓸 때 사용합니다.
   */
  frameMs?: number;

  /**
   * 오른쪽/왼쪽 이동용 이미지를 따로 만들기 전까지
   * 동일 이미지를 좌우 반전해서 사용할 수 있습니다.
   */
  flipX?: boolean;

  /**
   * walk / happy 등에 아주 작은 상하 움직임을 더합니다.
   */
  enableMotion?: boolean;

  /**
   * 캐릭터를 직접 눌렀을 때 호출됩니다.
   */
  onPress?: () => void;

  /**
   * loop=false인 애니메이션이 마지막 프레임까지 재생되면 호출됩니다.
   */
  onAnimationEnd?: (action: RootyAction) => void;

  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  testID?: string;
};

function RootySpriteComponent({
  action = 'idle',
  direction = 'downRight',
  size = ROOTY_SIZE.overlay,
  playing = true,
  loop,
  frameMs,
  flipX,
  enableMotion = true,
  onPress,
  onAnimationEnd,
  style,
  imageStyle,
  testID = 'rooty-sprite',
}: RootySpriteProps) {
  // ROOTY_BEHAVIOR_V5_DIRECTIONAL_RESOLVER
  const resolvedFrames =
    useMemo(
      () =>
        resolveRootyDirectionalFrames(
          action,
          direction
        ),
      [
        action,
        direction,
      ]
    );

  const frames =
    resolvedFrames.frames;

  const effectiveFlipX =
    flipX ??
    resolvedFrames.flipX;

  const frameSetKey =
    `${action}:${direction}:${resolvedFrames.source}:${resolvedFrames.resolvedDirection}`;

  const [frameIndex, setFrameIndex] =
    useState(0);

  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const animationConfig = ROOTY_ANIMATION[action];
  const effectiveLoop = loop ?? animationConfig.loop;
  const effectiveFrameMs = frameMs ?? animationConfig.frameMs;

  /**
   * 액션이 바뀌면 반드시 첫 프레임부터 시작합니다.
   * idle -> walk -> sit 같이 상태가 바뀔 때 이전 frameIndex가
   * 남아 이미지가 튀는 것을 방지합니다.
   */
  useEffect(() => {
    setFrameIndex(0);
  }, [frameSetKey]);

  /**
   * PNG 프레임 애니메이션.
   */
  useEffect(() => {
    if (!playing || frames.length <= 1) {
      return;
    }

    if (!effectiveLoop && frameIndex >= frames.length - 1) {
      return;
    }

    const timer = setTimeout(() => {
      const next = frameIndex + 1;

      if (next < frames.length) {
        setFrameIndex(next);

        if (!effectiveLoop && next === frames.length - 1) {
          onAnimationEnd?.(action);
        }

        return;
      }

      setFrameIndex(0);
    }, effectiveFrameMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    action,
    effectiveFrameMs,
    effectiveLoop,
    frameIndex,
    frames.length,
    onAnimationEnd,
    playing,
  ]);

  /**
   * 프레임 교체 외에 아주 작은 물리 움직임을 추가합니다.
   * 이미지 자체의 디자인을 해치지 않을 정도로만 움직입니다.
   */
  useEffect(() => {
    translateY.stopAnimation();
    scale.stopAnimation();

    translateY.setValue(0);
    scale.setValue(1);

    if (!playing || !enableMotion) {
      return;
    }

    let animation: Animated.CompositeAnimation | undefined;

    if (action === 'walk') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -2,
              duration: 85,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1.015,
              duration: 85,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 0,
              duration: 85,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 85,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
    } else if (action === 'happy') {
      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -10,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.035,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            speed: 20,
            bounciness: 7,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            speed: 20,
            bounciness: 5,
            useNativeDriver: true,
          }),
        ]),
      ]);
    } else if (action === 'idle') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
    } else if (action === 'sleep') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.008,
            duration: 1150,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1150,
            useNativeDriver: true,
          }),
        ]),
      );
    }

    animation?.start();

    return () => {
      animation?.stop();
    };
  }, [action, enableMotion, playing, scale, translateY]);

  const safeFrameIndex = Math.min(frameIndex, frames.length - 1);
  const source = frames[safeFrameIndex];

  const sprite = (
    <Animated.View
      style={[
        styles.sprite,
        {
          width: size,
          height: size,
          transform: [
            { translateY },
            { scale },
            { scaleX: effectiveFlipX ? -1 : 1 },
          ],
        },
      ]}
    >
      <Image
        source={source}
        resizeMode="contain"
        fadeDuration={0}
        style={[styles.image, imageStyle]}
      />
    </Animated.View>
  );

  if (!onPress) {
    return (
      <Animated.View
        testID={testID}
        pointerEvents="none"
        style={[styles.container, style]}
      >
        {sprite}
      </Animated.View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      style={[styles.container, style]}
    >
      {sprite}
    </Pressable>
  );
}

export const RootySprite = memo(RootySpriteComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sprite: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default RootySprite;
