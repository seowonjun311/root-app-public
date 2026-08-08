# ROOTY Behavior V8 coherent walking checklist

## Goal
Make Rooty walk in short readable routes instead of choosing an unrelated direction every step.

## Behavior
- Each walking session is roughly 4 to 7 steps.
- Rooty keeps one heading for about 2 to 4 steps.
- Normal segment changes avoid an immediate 180-degree reversal.
- If the preferred route is blocked, lateral directions are attempted before backtracking.
- Three failed movement rounds still return Rooty to the existing rest cycle.
- V7 rest-facing continuity remains unchanged.

## PC checks
- V3 natural behavior remains.
- V4 runtime continuity remains.
- V7 rest-facing continuity remains.
- V6 up-right assets remain registered.
- V8 coherent-walking marker exists.
- opposite-direction map exists.
- 2-to-4 step segments exist.
- preferred heading is tried first.
- lateral directions are tried before the opposite heading.
- rootyDirectionRef is synchronized with successful movement.
- TypeScript passes.
- Git whitespace passes.
- No package files change.

## Phone checks later
- Rooty no longer zig-zags every step.
- Up-right sprites remain visible for a readable stretch.
- Turns occur after short walking segments.
- Building edges cause side-step attempts before backtracking.
- Rest, sleep, happy, and relaunch continuity still work.
