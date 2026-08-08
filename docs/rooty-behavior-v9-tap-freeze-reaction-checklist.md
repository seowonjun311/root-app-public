# ROOTY Behavior V9 tap-freeze reaction checklist

## Goal

Make a tap feel like Rooty notices the user immediately instead of continuing to slide toward an already scheduled walking destination while the happy reaction starts.

## Behavior

- Rooty walking still uses the V8 coherent walking system.
- When Rooty is tapped, active X and Y Reanimated timing animations are cancelled immediately.
- Rooty remains at the current on-screen position.
- V7 facing compatibility still turns unsupported up-facing happy poses toward a compatible front-side direction.
- Rooty enters happy at the stopped position.
- When happy finishes, Rooty returns to idle and the existing cycle restarts naturally.
- rootyActionRef is updated immediately for happy and idle so V4 persistence sees the current interaction state consistently.

## PC checks

- cancelAnimation is imported from react-native-reanimated.
- foxX animation is cancelled on tap.
- foxY animation is cancelled on tap.
- V9 marker exists.
- happy action ref sync exists.
- idle action ref sync exists.
- V8 coherent walking remains.
- V7 rest-facing continuity remains.
- V4 runtime continuity remains.
- TypeScript passes.
- Git whitespace check passes.
- No package files change.

## Phone checks later

- Tap Rooty while moving.
- Rooty should stop immediately instead of sliding for the remainder of the walk step.
- Happy animation should happen at the stopped position.
- After happy finishes, Rooty should return to idle and later resume normal walking.
- Repeated rapid taps should not start overlapping reactions.
- Tapping an up-facing Rooty should still respect V7 facing compatibility.
- Closing/reopening after a tap should not corrupt Rooty runtime state.
