# ROOTY Behavior V21 centralized village bounds checklist

## Goal

Use one shared definition for Rooty's allowed village movement area.

## New source of truth

constants/rootyVillageBounds.ts

ROOTY_VILLAGE_BOUNDS:

- minX: 120
- maxX: 1200
- minY: 80
- maxY: 900

## Home movement

The V8 movement routine previously clamped directly with:

- Math.max(120, Math.min(nextX, 1200))
- Math.max(80, Math.min(nextY, 900))

V21 replaces those literals with ROOTY_VILLAGE_BOUNDS.

## Runtime persistence

store/rootyRuntime.ts previously used:

- ROOTY_MIN_X
- ROOTY_MAX_X
- ROOTY_MIN_Y
- ROOTY_MAX_Y

V21 removes those duplicated constants and uses ROOTY_VILLAGE_BOUNDS for validation and save clamping.

## Why this matters

Home movement and runtime persistence now cannot drift to different coordinate limits.

## Compatibility

- V20 runtime continuity tuning remains.
- V19 natural behavior tuning remains.
- V18 active-Home checkpoints remain.
- V17 serialized persistence remains.
- V15 atomic state/ref sync remains.
- V11 synchronized movement remains.
- village and building collision checks remain.
- all existing bound values are preserved.
- no native dependencies change.

## PC checks

- V21 marker exists.
- 120/1200/80/900 values remain.
- Home imports ROOTY_VILLAGE_BOUNDS.
- runtime imports ROOTY_VILLAGE_BOUNDS.
- old Home inline clamps are removed.
- old runtime bound constants are removed.
- village/building collision checks remain.
- TypeScript passes.
- Git whitespace check passes.

## Phone checks later

No visible movement-area change is expected.

Rooty should remain inside exactly the same village area as before.
