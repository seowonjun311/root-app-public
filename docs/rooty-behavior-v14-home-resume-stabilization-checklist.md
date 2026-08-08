# ROOTY Behavior V14 home-resume stabilization checklist

## Goal

Prevent a stale transient Rooty action from visually leaking into Home when the user returns from another tab.

## Stable Home return

When Home gains focus:

- if Rooty was idle, sit, or sleep, keep that stable action
- if Rooty was walk or happy, normalize to idle before Home becomes active
- clear the reacting guard for a stale happy reaction
- keep the existing direction when idle supports it
- if an up-facing idle asset is unavailable, turn upRight to downRight or upLeft to downLeft
- then allow V13 to mark Home focused
- V8 starts one fresh behavior cycle from a stable visual state

## Why this helps

V13 stops hidden movement, but the React action state can still describe the transient action that existed when Home lost focus.

V14 makes the first visible frame after returning deterministic and stable instead of briefly showing a walking or happy pose with no matching movement.

## PC checks

- V14 marker exists.
- walk and happy are recognized as transient return actions.
- idle capability detection uses the V7 directional helper.
- up-right idle fallback uses down-right when needed.
- up-left idle fallback uses down-left when needed.
- rootyReactingRef resets.
- rootyActionRef and rootyAction both become idle for transient states.
- V13 focus callback invokes the stabilizer before setting Home focused.
- V13 lifecycle pause remains.
- V12 app lifecycle pause remains.
- V9 tap freeze remains.
- TypeScript passes.
- Git whitespace check passes.
- no package files change.

## Phone checks later

- Leave Home while Rooty is walking and return.
- Rooty should first appear stable instead of walking in place.
- Leave Home immediately after tapping Rooty and return.
- A stale happy animation should not continue.
- Leaving while Rooty is sitting or sleeping should preserve that stable action.
- Up-facing transient actions should not return as a front-facing generic idle mismatch.
