# ROOTY Behavior V17 serialized runtime persistence checklist

## Goal

Guarantee Rooty runtime snapshots are written to AsyncStorage in request order.

## Why

Rooty can request persistence from several lifecycle paths:

- the V4 periodic checkpoint
- V12 app inactive handling
- V13 Home blur handling
- effect cleanup

Those saves can occur close together.

V17 routes every save through one Promise queue so only one AsyncStorage write is active at a time and later snapshots are always written after earlier snapshots.

## Behavior

saveRootyRuntimeSnapshot:

1. creates an immutable snapshot immediately
2. assigns savedAt immediately
3. appends the write to rootyRuntimeSaveQueue
4. waits for the previous write
5. writes the new snapshot
6. keeps the queue usable even if a write fails

## Important properties

- call order equals write order
- latest requested snapshot finishes after older requested snapshots
- coordinate clamping remains
- runtime key remains rooty_runtime_state_v1
- resume rules remain unchanged
- callers do not need API changes because the function still returns Promise<void>

## Compatibility

- V16 development tracing remains unchanged.
- V15 atomic state/ref sync remains unchanged.
- V14 Home resume stabilization remains unchanged.
- V13 Home focus persistence remains unchanged.
- V12 app lifecycle persistence remains unchanged.
- no native dependencies change

## PC checks

- V17 marker exists.
- one save queue exists.
- one AsyncStorage.setItem writer exists.
- queue chaining exists.
- queue error recovery exists.
- savedAt remains.
- coordinate clamping remains.
- resume resolver remains.
- TypeScript passes.
- Git whitespace check passes.

## Phone checks later

Rapidly switch Home to another tab and background the app around the same time.

After reopening, Rooty should resume from the newest saved state rather than an older position/action that happened to finish writing later.

V16 ROOTY DEBUG logs can be used alongside this check.
