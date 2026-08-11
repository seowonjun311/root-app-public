# Character V82 standard frame canvas normalization

## Goal

Make Moru, Mongsil, and Dami visibly match the existing Home/preview character scale without changing any PNG source file.

## Diagnosis carried forward

The standard characters already have all 23 runtime frames:

- idle: 4
- walk: 4
- sit: 4
- sleep: 5
- happy: 4
- touch: 2

The imported standard PNG files use a tall 1024 x 1536 source canvas. The existing common renderer puts that whole tall canvas into a square `size x size` Image with `resizeMode="contain"`.

That preserves the full PNG, but it also scales the transparent portrait canvas down inside the square. The visible character artwork can therefore appear much smaller than the legacy Rooty artwork.

## V82 rendering rule

V82 keeps the external logical sprite box unchanged.

For `frameProfile === 'standard-23'` only:

1. keep the outer box at the requested `size`
2. apply the existing caller style/transform to that outer box
3. center an inner Image at `1.60x` the logical size
4. keep `resizeMode="contain"`
5. keep `overflow: visible`

This is canvas compensation, not a PNG edit.

## Why the outer wrapper matters

V72/V74 already use transforms for:

- vertical calibration
- left/right `scaleX` mirroring

If V82 simply appended another transform directly to the same Image, one transform could overwrite or distort another.

The V82 outer View preserves the existing Home transform. The enlarged inner Image only compensates for transparent portrait-canvas padding.

## Rooty safety

Rooty Home still uses `LegacyRootySprite`.

If Rooty is rendered through the compatibility CharacterSprite preview, its `legacy-rooty` frame profile continues to use the previous 1.0x Image path.

V82 does not modify:

- `components/rooty/RootySprite.tsx`
- `constants/rootyAssets.ts`
- `constants/rootyDirectionalAssets.ts`
- Home behavior policy
- V55-V66 behavior files
- V72 calibration store
- V73 playback policy
- V74 facing policy
- V75/V76 personality logic
- V77/V78/V79 diagnostics/statistics/validation
- V81 device-validation data
- any PNG file
- any package file

## Asset protection

Before editing source, the installer creates a SHA256 manifest for all PNG files under:

- `characters/moru`
- `characters/mongsil`
- `characters/dami`

After the code patch the same manifest is recalculated and must match exactly.

## Files changed

Changed:

- `components/characters/CharacterSprite.tsx`

New:

- `docs/character-v82-standard-frame-canvas-normalization-checklist.md`

## Manual verification

After installation:

1. Open `/character-preview`.
2. Select Moru.
3. Verify idle/walk/sit/sleep/happy/touch are clearly visible.
4. Repeat for Mongsil.
5. Repeat for Dami.
6. Save Moru as Home character and return Home.
7. Verify walking left/right still mirrors correctly.
8. Verify sit/sleep/happy/touch stay visible.
9. Repeat Home verification for Mongsil and Dami.
10. Select Rooty and confirm legacy Rooty appearance did not change.

If a standard character is now too large because a previous V72 device calibration override was already increased, use the existing calibration controls to reset or reduce that character's scale.

## Next step

If all three standard characters are visible, run the V81 real-device checklist again and mark the visibility/action checks based on the actual device result.

If any character is still blank rather than merely too small, the next patch should add runtime `Image.resolveAssetSource(...)`/load-error diagnostics instead of changing the PNG assets.
