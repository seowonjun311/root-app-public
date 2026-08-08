# ROOTY Behavior V7 rest-facing continuity checklist

## Goal

Prevent Rooty from visually snapping from a dedicated up-facing walk sprite into a generic front-facing idle, sit, sleep, or happy sprite while those up-facing action assets are still missing.

## Behavior

- Walking may still use all four directions.
- walk + upRight uses the V6 dedicated frames.
- walk + upLeft mirrors the V6 dedicated frames.
- idle look-around only chooses an up direction when an idle up-direction asset exists.
- sit keeps an up direction only when a sit up-direction asset exists.
- sleep keeps an up direction only when a sleep up-direction asset exists.
- tapping Rooty while facing up turns Rooty toward the matching lower-left/lower-right side before generic happy is shown.
- As future up-facing idle/sit/sleep/happy assets are registered, V7 automatically allows those directions without another home behavior rewrite.

## PC checks

- V3 natural routine remains.
- V4 runtime continuity remains.
- V5 directional resolver remains.
- V6 up-right walk frames remain.
- hasRootyDirectionalFrames exists.
- Rest-facing V7 marker exists.
- idle direction filtering exists.
- sit facing guard exists.
- sleep facing guard exists.
- happy facing guard exists.
- TypeScript passes.
- Git whitespace passes.
- No package files change.

## Phone checks later

- Walking up-right uses the rear/up-right V6 sprites.
- When Rooty stops to sit, it naturally turns down-right before the generic sit sprite appears.
- When Rooty sleeps, it does not remain logically up-facing with a front-facing sleep image.
- Up-left uses the equivalent down-left turn for generic rest actions.
- Tap while walking upward turns Rooty toward the viewer-side direction before happy.
- Existing walk, position persistence, tap reaction, and wake cycle still work.

## Future asset behavior

Once dedicated idle/sit/sleep/happy upRight frames are registered, V7 detects them through the directional registry and no longer forces the corresponding rest action to turn downward.
