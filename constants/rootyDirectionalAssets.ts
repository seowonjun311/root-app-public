import type {
  ImageSourcePropType,
} from 'react-native';

import {
  ROOTY_FRAMES,
  type RootyAction,
} from './rootyAssets';

export type RootyDirection =
  | 'downRight'
  | 'downLeft'
  | 'upRight'
  | 'upLeft';

export type RootyDirectionalFrameRegistry =
  Partial<
    Record<
      RootyAction,
      Partial<
        Record<
          RootyDirection,
          readonly ImageSourcePropType[]
        >
      >
    >
  >;

export type RootyDirectionalResolutionSource =
  | 'exact'
  | 'mirrored'
  | 'generic-action'
  | 'generic-idle';

export type RootyDirectionalFrameResolution = {
  frames:
    readonly ImageSourcePropType[];
  flipX: boolean;
  requestedDirection:
    RootyDirection;
  resolvedDirection:
    RootyDirection;
  source:
    RootyDirectionalResolutionSource;
};

/**
 * ROOTY_BEHAVIOR_V5_DIRECTIONAL_ASSET_REGISTRY
 *
 * Direction-specific PNGs are registered here only after the
 * corresponding files actually exist in the repository.
 *
 * Example for a future asset set:
 *
 * walk: {
 *   upRight: [
 *     require('../assets/rooty/walk/up_right/rooty_walk_up_right_01.png'),
 *   ],
 * },
 *
 * Keeping missing files out of require(...) is important because Metro
 * resolves image assets statically at bundle time.
 */
export const ROOTY_DIRECTIONAL_FRAMES:
  RootyDirectionalFrameRegistry = {
    walk: {
      upRight: [
        require('../assets/rooty/walk/up_right/rooty_walk_up_right_01.png'),
        require('../assets/rooty/walk/up_right/rooty_walk_up_right_02.png'),
      ],
    },
  };

const MIRRORED_DIRECTION:
  Record<
    RootyDirection,
    RootyDirection
  > = {
    downRight:
      'downLeft',
    downLeft:
      'downRight',
    upRight:
      'upLeft',
    upLeft:
      'upRight',
  };

const isLeftDirection = (
  direction: RootyDirection
) =>
  direction === 'downLeft' ||
  direction === 'upLeft';

function getRegisteredFrames(
  action: RootyAction,
  direction: RootyDirection
) {
  const frames =
    ROOTY_DIRECTIONAL_FRAMES[
      action
    ]?.[
      direction
    ];

  if (
    frames &&
    frames.length > 0
  ) {
    return frames;
  }

  return null;
}

export function hasRootyDirectionalFrames(
  action: RootyAction,
  direction: RootyDirection
) {
  if (
    getRegisteredFrames(
      action,
      direction
    )
  ) {
    return true;
  }

  const mirroredDirection =
    MIRRORED_DIRECTION[
      direction
    ];

  return Boolean(
    getRegisteredFrames(
      action,
      mirroredDirection
    )
  );
}
export function resolveRootyDirectionalFrames(
  action: RootyAction,
  direction: RootyDirection
): RootyDirectionalFrameResolution {
  const exactFrames =
    getRegisteredFrames(
      action,
      direction
    );

  if (exactFrames) {
    return {
      frames:
        exactFrames,
      flipX:
        false,
      requestedDirection:
        direction,
      resolvedDirection:
        direction,
      source:
        'exact',
    };
  }

  const mirroredDirection =
    MIRRORED_DIRECTION[
      direction
    ];

  const mirroredFrames =
    getRegisteredFrames(
      action,
      mirroredDirection
    );

  if (mirroredFrames) {
    return {
      frames:
        mirroredFrames,
      flipX:
        true,
      requestedDirection:
        direction,
      resolvedDirection:
        mirroredDirection,
      source:
        'mirrored',
    };
  }

  const genericActionFrames =
    ROOTY_FRAMES[
      action
    ];

  if (
    genericActionFrames.length >
    0
  ) {
    return {
      frames:
        genericActionFrames,
      flipX:
        isLeftDirection(
          direction
        ),
      requestedDirection:
        direction,
      resolvedDirection:
        isLeftDirection(
          direction
        )
          ? 'downLeft'
          : 'downRight',
      source:
        'generic-action',
    };
  }

  return {
    frames:
      ROOTY_FRAMES.idle,
    flipX:
      isLeftDirection(
        direction
      ),
    requestedDirection:
      direction,
    resolvedDirection:
      isLeftDirection(
        direction
      )
        ? 'downLeft'
        : 'downRight',
    source:
      'generic-idle',
  };
}
