# Character V86 v6

## Character Preview
- Separates the V83 image-diagnostics Link from the V77 JSX marker.
- Character switching should no longer emit:
  `Text strings must be rendered within a <Text> component.`

## Balanced roaming
- Preserves V8 coherent walking.
- At normalized distance >= 0.65 from village center, new direction selection
  has an 80% chance to point inward.
- A movement step that had to be rectangularly clamped is rejected instead of
  being accepted as an edge-sliding step.
- Existing `isFoxOutsideVillage` and `isFoxBlockedByBuilding` checks remain.

## Device validation
1. Open `/character-preview`.
2. Switch Rooty -> Moru -> Mongsil -> Dami -> Rooty repeatedly.
3. Confirm the Text runtime error is gone.
4. Return Home and watch a standard character for 2-3 minutes.
5. Confirm the character travels through left, center and right portions.
6. Confirm `[ROOTY V86] center pull` appears sometimes near an outer band.
7. Confirm village/building collision safety remains.
8. Confirm V85 continuous rendering remains.

## Safety
- Exact V85 baseline required.
- Node.js UTF-8 IO used for TSX modifications.
- All patch targets are structurally verified before any source file is written.
- V85 CharacterSprite is untouched.
- Character PNG files are untouched.
- V55-V66 state/rest policy files are untouched.
- No native rebuild required.
