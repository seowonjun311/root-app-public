# ROOTY Behavior V35 own-village large-view Rooty checklist

## Goal

Make Home's own-village large view display Rooty instead of the legacy fox image.

## Scope

Home sends a snapshot when the user taps the own-village large-view button:

- Rooty action
- Rooty direction
- live X
- live Y

The large-view screen:

- recognizes `isOwnVillage`
- uses `RootySprite` only for the user's own village
- keeps the legacy fox path for friend villages
- preserves stable actions: idle, sit, sleep
- normalizes transient actions such as walk/happy/touch to idle
- preserves Rooty's current direction
- places Rooty at the captured Home X/Y coordinates
- does not run the Home natural-behavior movement routine

## Why transient actions become idle

The large-view route is a viewer, not a second Home runtime.

A captured walk/happy/touch action must not look like an independent second Rooty behavior loop after Home loses focus.

Stable idle/sit/sleep poses may remain visually animated through RootySprite frame playback.

## PC verification

- Home RootySprite remains unchanged.
- Home own-village route passes action/direction/X/Y.
- friend-village imports RootySprite.
- friend-village accepts Rooty snapshot params.
- own-village branch renders RootySprite.
- friend-village branch preserves legacy fox fallback.
- legacy fox asset remains available for friend villages.
- TypeScript passes.
- Git whitespace check passes.
- package files remain unchanged.

## Phone verification

1. Open Home and confirm Rooty is visible.
2. Wait until Rooty is at a clearly recognizable map position.
3. Tap the own-village large-view button.
4. Confirm the character is Rooty, not the old fox.
5. Confirm Rooty appears near the same map position and facing direction.
6. Return to Home and confirm normal Rooty behavior resumes.
7. Open a friend village if available and confirm its existing character rendering is not broken.
