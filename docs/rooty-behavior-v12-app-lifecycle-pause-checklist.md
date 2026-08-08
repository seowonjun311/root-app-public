# ROOTY Behavior V12 app lifecycle pause checklist

## Goal

Prevent Rooty movement, behavior timers, and sprite playback from continuing while ROOT is backgrounded or inactive.

## Background behavior

When AppState leaves active:

- save the current Rooty runtime snapshot
- cancel the active X movement timing
- cancel the active Y movement timing
- set rootyAppActive to false
- V8 behavior effect cleanup clears its scheduled timers
- RootySprite playback pauses

## Resume behavior

When AppState returns to active:

- rootyAppActive becomes true
- the existing V8 behavior effect starts fresh
- V11 walk timing remains the single source of movement timing
- V9 tap freeze remains available
- V4 persistence remains available

## PC checks

- V12 marker exists.
- AppState active state exists.
- X/Y movement cancellation exists for non-active state.
- Background persistence remains.
- V8 behavior is gated by rootyAppActive.
- V8 effect depends on rootyAppActive.
- RootySprite playback is gated by rootyRuntimeReady and rootyAppActive.
- V11 synchronized motion remains.
- V9 tap freeze remains.
- TypeScript passes.
- Git whitespace check passes.
- No package files change.

## Phone checks later

- Let Rooty walk and immediately background ROOT.
- Return after a few seconds.
- Rooty should not jump through several delayed walk steps at once.
- Rooty should resume its normal behavior cycle after returning.
- Repeated background/foreground transitions should not create duplicate movement loops.
- Tap freeze should still work after returning from background.
- Saved position should remain valid.
