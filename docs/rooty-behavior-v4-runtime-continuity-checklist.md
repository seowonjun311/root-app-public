# ROOTY Behavior V4 runtime continuity checklist

## Goal

Verify that Rooty feels continuous across app backgrounding, force-close, and relaunch without running animation while the app process is closed.

## PC checks

- TypeScript passes.
- Git whitespace check passes.
- No native dependency changes.
- V3 natural behavior marker remains.
- V4 runtime continuity marker exists.
- Runtime state is stored only in AsyncStorage.
- Corrupt runtime JSON is discarded safely.
- Position is bounded to the existing village movement range.
- Rooty is hidden until local runtime hydration finishes.

## Phone runtime checks

### Short relaunch

1. Let Rooty walk to a clearly different position.
2. Close the app.
3. Reopen within about 15 seconds.
4. Confirm Rooty reappears near the last saved position.
5. Confirm transient walk/happy state does not resume mid-animation.
6. Confirm natural behavior starts again after a short pause.

### Medium absence

1. Close the app for more than 15 seconds but less than 10 minutes.
2. Reopen.
3. Confirm Rooty resumes in idle or sit.
4. Confirm Rooty later returns to the V3 natural behavior cycle.

### Long absence

1. Close the app for at least 10 minutes.
2. Reopen.
3. Confirm Rooty initially appears sleeping.
4. Confirm Rooty wakes naturally after the resume delay.
5. Confirm sit/idle/walk behavior continues normally.

### Background save

1. Let Rooty move.
2. Send ROOT to the background.
3. Reopen ROOT.
4. Confirm the last location and direction are retained.

### Safety

- No crash when there is no saved Rooty runtime state.
- No crash when an old/corrupt runtime state exists.
- Rooty never restores outside the village movement bounds.
- Rooty never restores inside a currently occupied building tile.
- Existing V3 tap -> happy -> idle behavior still works.
- Existing V3 blocked-path retries still work.

## Completion gate

V4 is complete when PC checks pass and the phone tests above show no teleport flash, no invalid position, and normal V3 behavior after restoration.
