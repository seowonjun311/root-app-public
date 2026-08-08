# ROOTY Behavior V25 live village-layout safety checklist

## Goal

Keep Rooty safe when the village building layout changes while Home is already running.

## Audit finding

Before V25:

- building placement prevented building-to-building overlap
- Rooty's current cell was not part of building placement occupancy
- there was no effect depending on placedBuildings
- long-lived Rooty behavior could retain an older React closure for placedBuildings

This meant a newly placed or restored building could overlap Rooty's current position until a later restart, and old behavior timers could continue using an outdated building list.

## V25 behavior

### Latest building ref

placedBuildingsRef always represents the latest committed building list used by Rooty collision checks.

All existing placed-building mutations are routed through applyPlacedBuildings.

The updater changes the ref before scheduling React state, so collision checks can see the new layout immediately.

### Live position reconciliation

Whenever placedBuildings changes after Rooty runtime is ready:

1. read Rooty's current x/y
2. check village bounds and current building collision
3. do nothing when the position remains safe
4. find the nearest safe grid cell when blocked
5. cancel active x/y animations
6. relocate Rooty
7. stabilize Rooty to idle
8. persist the relocated runtime position

### Placement UX

V25 does not reject a building merely because Rooty happens to stand on that tile.

The building can be placed, and Rooty moves to the nearest safe tile when necessary.

## Compatibility

- V23 safe cold-start restore remains
- multi-tile building collision remains
- V21 village bounds remain
- runtime storage schema remains unchanged
- building placement/edit save format remains unchanged
- no native dependency changes

## PC checks

- latest buildings ref exists
- collision reads the ref
- all 8 audited building mutation calls use applyPlacedBuildings
- only the atomic updater calls setPlacedBuildings directly
- reconciliation depends on placedBuildings
- reconciliation waits until rootyRuntimeReady
- blocked current position uses V23 nearest-safe resolver
- active x/y animations are cancelled before relocation
- relocated Rooty becomes idle
- relocated position is persisted
- TypeScript passes
- Git whitespace checks pass

## Phone checks later

1. Place a 1x1 building over Rooty's current tile.
   - Rooty should move to a nearby free tile.

2. Place/move a 2x2 building so its secondary occupied cell covers Rooty.
   - Rooty should move outside the full 2x2 footprint.

3. Place a building near Rooty without covering Rooty.
   - Rooty should not jump.

4. After relocation, allow Rooty to walk.
   - Rooty should continue respecting the newly changed layout.
