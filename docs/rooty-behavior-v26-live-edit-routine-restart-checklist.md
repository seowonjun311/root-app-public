# ROOTY Behavior V26 live-edit routine restart checklist

## Goal

Prevent pending pre-edit Rooty natural-behavior timers from surviving a live village layout update.

## Audit finding

V3 already has the correct cleanup lifecycle:

- a cancelled flag
- collected timeout handles
- callback cancellation checks
- clearTimeout cleanup
- rootyCycleKey in its dependency array

V25 already routes committed building-list changes through applyPlacedBuildings.

A direct placedBuildings dependency cannot be added to V3 because the V3 effect appears earlier in the component source than the placedBuildings state declaration.

## V26 behavior

applyPlacedBuildings now advances the existing rootyCycleKey after updating:

1. placedBuildingsRef
2. React placedBuildings state
3. rootyCycleKey

Because V3 already depends on rootyCycleKey, every committed building-list update triggers the existing V3 cleanup and restart lifecycle without referencing a later-declared variable.

## Result

When the village layout is changed:

1. the latest building ref is committed
2. React building state is updated
3. rootyCycleKey advances
4. the old V3 effect cleans up
5. cancelled becomes true
6. pending timeout handles are cleared
7. V25 reconciles Rooty's live position against the new building layout
8. a fresh V3 routine starts using the latest collision ref

## Compatibility

- no placedBuildings reference is added to the earlier V3 dependency array
- V25 live building ref remains
- V25 nearest-safe relocation remains
- V23 cold-start safe restore remains
- V21 village bounds remain
- movement timing values remain unchanged
- runtime storage schema remains unchanged
- no native dependency changes

## PC checks

- V26 marker exists
- applyPlacedBuildings still updates placedBuildingsRef first
- applyPlacedBuildings still updates React state
- applyPlacedBuildings advances rootyCycleKey
- V3 dependency array remains declaration-order safe
- V3 cancelled flag remains
- V3 timer collection remains
- V3 clearTimeout cleanup remains
- V25 reconciliation remains
- TypeScript passes
- Git whitespace checks pass

## Phone checks later

1. Let Rooty begin walking.
2. While Rooty is moving, place or move a building.
3. Pending behavior from before the edit should not resume afterward.
4. If the edit covers Rooty, V25 should relocate Rooty safely.
5. Rooty should then continue with a fresh natural routine.
