# ROOTY Behavior V33 runtime stress tracing checklist

## Goal

Add development-only observability for the live-edit stress scenario without changing Rooty's runtime behavior.

## New trace events

All events continue to use the existing V16 `[ROOTY DEBUG]` logger.

### village-layout-edit

Emitted before a placed-building layout update is applied.

Includes:
- previous building count
- next building count
- Rooty action
- Rooty direction
- live X/Y
- current rootyCycleKey

### rooty-relocated

Emitted only when V25 detects that Rooty's current position became invalid and a safe replacement tile was found.

Includes:
- previous X/Y
- safe X/Y
- action before stabilization
- direction
- current rootyCycleKey

### routine-restart

Emitted when the V3 natural routine starts after its active/focus/runtime gates pass.

Includes:
- rootyCycleKey
- action
- direction
- live X/Y

A building edit advances rootyCycleKey through V26, so the nearby village-layout-edit and routine-restart events can be correlated.

## Production safety

- The existing V16 helper still returns immediately when `__DEV__` is false.
- No diagnostic UI is added.
- No AsyncStorage debug history is added.
- No network reporting is added.
- No native package is added.

## Runtime stress test later

With the development client and Metro logs visible:

1. Wait until Rooty is walking.
2. Edit or move a building while Rooty is moving.
3. Repeat several edits, including one that makes Rooty's current tile invalid.
4. Leave Home and return.
5. Background and foreground the app.
6. Repeat the sequence several times.

Expected useful event sequence for a collision-causing edit:

`[ROOTY DEBUG] village-layout-edit`
`[ROOTY DEBUG] rooty-relocated`
`[ROOTY DEBUG] routine-restart`

A non-colliding edit can legitimately omit `rooty-relocated`.

Also expect the existing V16 events:
- action
- direction
- home-blur
- home-focus
- app-inactive
- app-active

## PC verification

- V33 marker exists.
- Three new debug event names exist exactly once in the Rooty debug event union.
- V25/V26 behavior markers remain.
- V3 still depends on rootyCycleKey.
- TypeScript passes.
- Git whitespace check passes.
- package files remain unchanged.
