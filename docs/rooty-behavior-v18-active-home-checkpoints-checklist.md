# ROOTY Behavior V18 active-home checkpoints checklist

## Goal

Run Rooty's 5-second runtime checkpoint only while ROOT is active and Home is actually focused.

## Before V18

The V4 persistence effect starts a 5-second interval whenever Rooty runtime hydration is ready.

V12 and V13 already save explicitly when the app becomes inactive or Home loses focus, so periodic writes are not needed while Rooty is hidden.

## V18 rules

Periodic checkpointing requires:

- rootyRuntimeReady
- rootyAppActive
- rootyHomeFocused

When all are true:

- save one immediate checkpoint
- run the existing 5-second checkpoint interval

When Home is hidden or the app is inactive:

- no 5-second checkpoint interval runs
- V12 still saves when the app becomes inactive
- V13 still saves when Home loses focus
- V17 still serializes all actual runtime writes

## Cleanup

Effect cleanup:

- clears the interval when one exists
- removes the AppState subscription
- does not perform another unconditional persistence write

This prevents an inactive-to-active or hidden-to-visible dependency cleanup from refreshing savedAt for an old hidden state.

## Compatibility

- V17 serialized persistence remains.
- V16 ROOTY DEBUG tracing remains.
- V15 atomic state/ref sync remains.
- V14 Home resume stabilization remains.
- V13 Home blur persistence remains.
- V12 app inactive persistence and movement cancellation remain.
- no native dependencies change

## PC checks

- V18 marker exists.
- shouldCheckpoint requires app active and Home focused.
- immediate checkpoint is gated.
- 5-second interval is gated.
- inactive one-shot persistence remains.
- V12 X/Y movement cancellation remains.
- cleanup no longer performs an unconditional save.
- effect dependencies include runtime ready, app active, and Home focused.
- TypeScript passes.
- Git whitespace check passes.

## Phone checks later

With V16 logs visible:

1. stay on Home for more than 5 seconds
2. move to another tab for 15 seconds
3. return to Home
4. background ROOT for 15 seconds
5. return again

Rooty should keep the explicit leave-time snapshot without hidden periodic checkpoints continuously refreshing savedAt.
