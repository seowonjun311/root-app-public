# ROOTY Behavior V23 safe restore-position checklist

## Goal

Guarantee that Rooty starts or restores on a safe village position whenever at least one walkable grid cell exists.

## Before V23

Rooty's default screen position was:

- x: 430
- y: 250

Runtime restore accepted a saved coordinate only when it was:

- inside the village
- not blocked by a placed building

If the saved coordinate was unsafe, the code simply left Rooty at the default 430,250 position.

When there was no saved snapshot, the default position was also used without checking whether a newly placed building occupied that cell.

## V23 behavior

ROOTY_DEFAULT_POSITION centralizes the existing 430,250 default.

findSafeRootyPosition:

- converts the preferred screen position to a village grid cell
- scans the full village grid
- ignores outside or building-blocked cells
- chooses the safe cell with the smallest Manhattan grid distance
- returns null only if no safe grid cell exists

Runtime restore now:

1. uses the saved position when a snapshot exists
2. otherwise uses ROOTY_DEFAULT_POSITION as the preferred position
3. keeps the preferred position exactly when it is safe
4. relocates to the nearest safe grid cell when it is unsafe
5. restores direction/action only when a snapshot exists

## Compatibility

- default visual position remains 430,250
- safe saved coordinates are not snapped or changed
- V21 shared coordinate bounds remain
- multi-tile building collision remains
- V19 natural behavior remains
- V18 active-Home checkpoints remain
- V11 walk motion remains
- runtime storage schema is unchanged
- no native dependency changes

## PC checks

- V23 markers exist
- default coordinates remain 430,250
- default coordinates have one source of truth
- safe-position resolver scans the complete grid
- outside-village and building collision checks are reused
- nearest-grid fallback exists
- no-snapshot startup validates the default position
- safe snapshots preserve the exact saved coordinate
- TypeScript passes
- Git whitespace check passes

## Phone checks later

Cases to verify later:

1. Normal safe saved position
   - Rooty should reappear at the same exact position.

2. Building placed over the old saved position
   - Rooty should reappear on a nearby free tile.

3. Building placed over the default startup tile with no saved runtime
   - Rooty should choose a nearby free tile.

No visible change is expected during ordinary safe startup.
