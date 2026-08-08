# ROOTY Behavior V13 home-focus pause checklist

## Goal

Pause Rooty while the user is inside ROOT but viewing another tab or screen.

## Home focused

When the Home tab is focused:

- rootyHomeFocused is true.
- V8 behavior can run when runtime hydration and V12 app activity are also ready.
- RootySprite can play.
- V11 synchronized walk timing remains unchanged.

## Home blurred

When the user leaves Home:

- rootyHomeFocused becomes false.
- V8 behavior effect cleanup clears scheduled timers.
- active X movement is cancelled.
- active Y movement is cancelled.
- the current Rooty runtime snapshot is saved.
- RootySprite playback pauses.

## Combined execution gate

Rooty behavior now requires all three:

- rootyRuntimeReady
- rootyAppActive
- rootyHomeFocused

This prevents hidden movement in another tab and prevents background movement.

## PC checks

- V13 marker exists.
- useFocusEffect controls Rooty home focus.
- X/Y movement cancellation exists on Home blur.
- runtime snapshot save exists on Home blur.
- behavior gate includes rootyHomeFocused.
- behavior dependency includes rootyHomeFocused.
- RootySprite playback includes rootyHomeFocused.
- V12 lifecycle pause remains.
- V11 motion timing remains.
- V9 tap freeze remains.
- TypeScript passes.
- Git whitespace check passes.
- no package files change.

## Phone checks later

- Watch Rooty move on Home.
- Switch to Record, Crew, Day, or Explore.
- Wait several seconds.
- Return to Home.
- Rooty should resume from its stopped/saved area instead of having silently walked across the village.
- Rapid tab switching should not create duplicate walk loops.
- Background/foreground behavior from V12 should still work.
