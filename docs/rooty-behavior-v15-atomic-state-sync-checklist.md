# ROOTY Behavior V15 atomic state sync checklist

## Goal

Keep Rooty's React state and runtime refs synchronized in the same call instead of waiting for a later React effect.

## Atomic action updates

applyRootyAction(nextAction):

- writes rootyActionRef.current immediately
- updates rootyAction React state immediately
- all current Rooty action call sites use this helper

## Atomic direction updates

applyRootyDirection(nextDirection):

- writes rootyDirectionRef.current immediately
- updates foxDirection React state immediately
- all current Rooty direction call sites use this helper

## Why this matters

V4 persistence, V12 background handling, V13 Home blur saving, and V14 Home resume stabilization read the refs directly.

Before V15, a very fast blur/background transition could happen between a React state setter and the effect that copied that state into the ref.

V15 closes that one-render synchronization window.

## Compatibility

- existing state-to-ref effects remain as a defensive fallback
- V14 Home resume stabilization remains
- V13 Home focus pause remains
- V12 app lifecycle pause remains
- V9 tap freeze remains
- V8 coherent walking remains
- no native dependencies change

## PC checks

- V15 marker exists.
- applyRootyAction updates ref and React state.
- applyRootyDirection updates ref and React state.
- only the atomic helper owns the direct setRootyAction call.
- only the atomic helper owns the direct setFoxDirection call.
- previous Rooty behavior markers remain.
- TypeScript passes.
- Git whitespace check passes.

## Phone checks later

- rapidly switch away from Home while Rooty begins walking
- return and confirm the stored action/direction matches the visible state
- tap Rooty and immediately switch tabs
- background ROOT during a direction change
- repeated transitions should not restore an older direction or stale happy/walk action
