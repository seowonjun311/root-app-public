# ROOTY Behavior V11 synchronized walk motion checklist

## Goal

Keep Rooty's PNG walk rhythm, small body bob, movement distance, and village timing under one shared configuration.

## Shared values

- horizontal step: 40
- vertical step: 20
- movement timing: 900ms
- walk frame timing: 225ms
- body bob half-cycle: 225ms
- next step delay: 1000 to 1150ms
- blocked retry delay: 250 to 500ms

## Why 225ms

The generic walk set has four frames.

4 frames x 225ms = 900ms.

That means the generic walk image sequence completes one full frame cycle during one 900ms village movement step.

The dedicated V6 up-right set currently has two frames.

2 frames x 225ms = 450ms.

That gives two two-frame gait cycles during the same 900ms movement step.

## Architecture

- constants/rootyMotion.ts owns the shared movement values.
- constants/rootyAssets.ts reads the walk frame timing from the shared config.
- RootySprite reads its walk body-bob timing from the shared config.
- Home V8 movement reads step distance, movement duration, and next-step delays from the shared config.
- V9 tap cancellation remains unchanged.

## PC checks

- V11 motion marker exists.
- TypeScript passes.
- Git whitespace check passes.
- No package files change.
- V8 coherent walking remains.
- V9 tap freeze remains.
- V6 directional frame resolution remains.

## Phone checks later

- Walking should not look like Rooty is rapidly cycling its feet while barely moving.
- Generic walk should complete about one four-frame cycle per movement step.
- V6 up-right two-frame walk should have a readable repeating gait.
- Body bob should feel calmer than the original 85ms half-cycle.
- Tap while moving should still stop Rooty immediately.
- If the visual speed needs tuning, adjust constants/rootyMotion.ts rather than editing three separate files.
