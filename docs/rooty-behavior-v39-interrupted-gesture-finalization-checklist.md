# ROOTY Behavior V39 interrupted gesture finalization checklist

## Goal

Prevent cumulative pan/zoom jumps when a large-view gesture is interrupted before normal onEnd completion.

## Pan

- Keep the existing one-pointer pan behavior.
- Keep the existing X/Y clamps.
- Continue updating visible translateX/translateY during onUpdate.
- Finalize savedTranslateX/savedTranslateY in onFinalize.
- This covers normal completion and interrupted/cancelled finalization.

## Pinch

- Keep the existing 0.2 to 0.82 zoom clamp.
- Continue updating visible scale during onUpdate.
- Finalize savedScale in onFinalize.
- This covers normal completion and interrupted/cancelled finalization.

## Scope

- app/friend-village.tsx only for runtime source.
- No Rooty Home behavior changes.
- No Rooty runtime persistence changes.
- No village coordinate changes.
- No native dependency changes.

## PC checks

- Pan baseline-only onEnd is removed.
- Pinch baseline-only onEnd is removed.
- Pan onFinalize saves current X/Y.
- Pinch onFinalize saves current scale.
- Pan/pinch simultaneous composition remains.
- Rooty remains inside the transformed tileMap.
- V35 own-village Rooty integration remains.
- TypeScript passes.
- Git whitespace check passes.
- package files are unchanged.

## Phone checks later

- Start a one-finger pan and add a second finger before lifting the first.
- Continue into pinch, then start another one-finger pan.
- The map must not jump back to an older X/Y baseline.
- Start a pinch and rotate before fully releasing the fingers.
- The next pinch must start from the visible current scale.
- Repeat pan/pinch and portrait/landscape transitions several times.
- Rooty must remain aligned with nearby buildings.
