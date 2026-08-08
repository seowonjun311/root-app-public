# ROOTY Behavior V16 development runtime tracing checklist

## Goal

Add development-only observability without changing Rooty's behavior.

## Trace prefix

All V16 logs begin with:

[ROOTY DEBUG]

## Logged events

### action

Emitted when applyRootyAction changes Rooty's action.

Includes:

- previous action
- next action
- current direction
- current X
- current Y

### direction

Emitted when applyRootyDirection changes direction.

Includes:

- previous direction
- next direction
- current action
- current X
- current Y

### home-focus / home-blur

Emitted when V13 Home focus state changes after runtime hydration.

Includes:

- action
- direction
- X/Y
- app active state

### app-active / app-inactive

Emitted when V12 app activity state changes after runtime hydration.

Includes:

- action
- direction
- X/Y
- Home focus state

## Production safety

The helper returns immediately when __DEV__ is false.

No diagnostic UI is added.
No AsyncStorage debug history is added.
No network debug reporting is added.
No native dependencies are added.

## Compatibility

- V15 atomic state sync remains.
- V14 Home resume stabilization remains.
- V13 Home focus pause remains.
- V12 app lifecycle pause remains.
- V11 motion timing remains.
- V9 tap freeze remains.

## PC checks

- V16 marker exists.
- __DEV__ guard exists.
- action transition tracing exists.
- direction transition tracing exists.
- Home focus tracing exists.
- app activity tracing exists.
- TypeScript passes.
- Git whitespace check passes.
- no package files change.

## Phone checks later

Run the dev client and watch Metro logs.

Useful examples:

[ROOTY DEBUG] action
[ROOTY DEBUG] direction
[ROOTY DEBUG] home-blur
[ROOTY DEBUG] home-focus
[ROOTY DEBUG] app-inactive
[ROOTY DEBUG] app-active

When a visual issue occurs, copy the nearby ROOTY DEBUG lines so the exact action, direction, and lifecycle transition can be reconstructed.
