# ROOTY Behavior V6 up-right walk registration checklist

## Goal

Connect the first approved dedicated Rooty directional assets to the V5 resolver without changing the existing V3/V4 behavior logic.

## Registered assets

- assets/rooty/walk/up_right/rooty_walk_up_right_01.png
- assets/rooty/walk/up_right/rooty_walk_up_right_02.png

## Resolver behavior

- walk + upRight uses the two dedicated V6 frames.
- walk + upLeft uses the V5 mirrored fallback from upRight.
- walk + downRight continues using the generic walk frames.
- walk + downLeft continues using the mirrored generic walk frames.
- idle, sit, sleep, happy, and touch keep their existing V5 fallback behavior.

## PC checks

- Both V6 PNG files exist.
- ROOTY_DIRECTIONAL_FRAMES.walk.upRight exists.
- Both PNG require paths are static.
- V5 exact fallback remains.
- V5 mirrored fallback remains.
- V3 natural behavior remains unchanged.
- V4 runtime continuity remains unchanged.
- TypeScript passes.
- Git whitespace check passes.
- No package files change.

## Phone checks later

- Up-right movement shows the dedicated rear three-quarter Rooty pose.
- The two walk frames alternate without a visible character jump.
- Up-left movement mirrors the up-right frames horizontally.
- Down-right and down-left movement still work.
- Idle, sit, sleep, and happy still work.
- Tap -> happy -> idle behavior still works.
- App relaunch continuity still works.

## Completion gate

V6 code integration is complete when PC checks pass and only the two PNG files, directional resolver, and this checklist are committed.
