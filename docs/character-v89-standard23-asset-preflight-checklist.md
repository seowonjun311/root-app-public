# Character V89 - Standard-23 Asset Preflight

## Purpose

V89 adds a reusable validator that runs before a new character is registered
in `constants/characterAssets.ts`.

This prevents incomplete or malformed character folders from being wired into
Metro `require()` calls.

## Standard-23 runtime contract

Each standard character folder must contain exactly these 23 runtime frames:

- idle: 4
- walk: 4
- sit: 4
- sleep: 5
- happy: 4
- touch: 2

File names must be:

- `<id>_idle_01.png` ... `<id>_idle_04.png`
- `<id>_walk_01.png` ... `<id>_walk_04.png`
- `<id>_sit_01.png` ... `<id>_sit_04.png`
- `<id>_sleep_01.png` ... `<id>_sleep_05.png`
- `<id>_happy_01.png` ... `<id>_happy_04.png`
- `<id>_touch_01.png` ... `<id>_touch_02.png`

Optional:

- `<id>_reference_sheet.png`

No other visible files are allowed in that character folder.

## PNG contract

Every runtime frame must:

- have a valid PNG signature and IHDR header;
- be exactly 1024 x 1536;
- have unique SHA-256 content among the 23 runtime frames.

The optional reference sheet must be a valid PNG but may use any dimensions.

## Commands

Validate every standard character folder:

`npm run verify:character-assets`

Validate one future character before registry integration:

`npm run verify:character-assets -- tori`

Multiple explicit folders can also be checked:

`npm run verify:character-assets -- tori mori raon`

## V89 installation verification

The installer itself runs the validator against the current Moru, Mongsil and
Dami folders. Installation is aborted before commit if any existing standard
character violates the contract.

## Future V90 registration flow

1. Copy a new character folder to `characters/<id>/`.
2. Run `npm run verify:character-assets -- <id>`.
3. Fix every reported missing/unexpected/size/duplicate problem.
4. Only after PASS, add that id and its 23 `require()` calls to the registry.
5. Add presentation defaults.
6. Test Character Preview.
7. Test Home continuous rendering and roaming.

## Safety

- No character PNG is modified by V89.
- No character registry entry is added by V89.
- V85 double-buffer rendering is untouched.
- V86 balanced roaming is untouched.
- V87 presentation calibration is untouched.
- V88 registry display-name normalization is untouched.
- V55-V66 behavior is untouched.
- No native rebuild is required.
