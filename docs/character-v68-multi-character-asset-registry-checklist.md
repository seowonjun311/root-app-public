# Character V68 legacy-Rooty + standard-character asset registry

## Corrected architecture

Rooty is intentionally not forced into the 23-frame rule.

The existing Rooty runtime predates the new characters and already has:

- variable generic frame counts
- generic action fallback
- generic idle fallback
- directional frame resolution
- mirrored directional fallback

Therefore Character V68 defines a common action interface, not a common frame count.

## Profiles

### Rooty

`frameProfile: 'legacy-rooty'`

Uses the existing:

`ROOTY_FRAMES`

and keeps the existing `RootySprite` / directional resolver unchanged.

### Moru / Mongsil / Dami

`frameProfile: 'standard-23'`

Each requires:

- idle 4
- walk 4
- sit 4
- sleep 5
- happy 4
- touch 2

Total:

`23 each`

New standard runtime total:

`69`

## Rooty duplicate/source folder

The untracked:

`characters/rooty`

is not used as the Rooty runtime source in V68.

The full original `characters/` directory is backed up externally before any mutation.

`characters/rooty` is then removed from the repository working tree only.

The current tracked `assets/rooty` runtime and all existing Rooty source files remain untouched.

## Full rollback safety

Before mutation V68 stores a byte-for-byte external copy:

`character-v68-<timestamp>/characters-original`

A SHA256 map is created and the copied folder is verified.

If installation fails before commit:

- the current characters/ folder is removed
- the full original characters/ backup is restored
- hashes are verified
- the rename helper is restored
- generated V68 files are removed

## Source/helper files

For Moru/Mongsil/Dami, only the exact standard runtime frames and detected reference sheets remain in Git.

Files such as:

- `_rename_backup_*.csv`
- generation/source images
- previews
- unrelated helper files

remain available in the full external characters-original backup but are excluded from Git.

## Reference sheets

- Moru reference sheet required
- Dami reference sheet required
- Mongsil reference sheet optional
- Rooty reference sheet not required

Reference sheets are metadata, not animation frames.

## Registry API

`constants/characterAssets.ts`

exports:

- `CHARACTER_IDS`
- `CharacterId`
- `CharacterAction`
- `CharacterFrameProfile`
- `CharacterFrameSet`
- `CharacterAssetDefinition`
- `CHARACTER_ASSET_REGISTRY`
- `getCharacterAssetDefinition`
- `getCharacterFrames`

## Safety boundary

V68 does not modify:

- `app/(tabs)/index.tsx`
- `components/rooty/RootySprite.tsx`
- `constants/rootyAssets.ts`
- `constants/rootyDirectionalAssets.ts`
- Behavior V55-V66 policies

## Next phase

Character V69 should create a compatibility preview layer:

- Rooty path -> existing RootySprite
- Moru/Mongsil/Dami -> common standard CharacterSprite

All actions should be verified in a separate preview screen before Home character selection is introduced.

## PC verification

- exact Behavior V66 baseline
- existing Rooty fallback architecture verified
- Rooty is not required to have 23 new files
- full characters/ external backup + SHA256 verification
- Moru exactly 23 standard runtime frames
- Mongsil exactly 23 standard runtime frames
- Dami exactly 23 standard runtime frames
- Moru/Dami reference sheet requirement
- Mongsil reference optional
- characters/rooty excluded from Git but preserved externally
- helper/source extras excluded from Git but preserved externally
- existing Rooty runtime untouched
- TypeScript passes
- Git whitespace passes
- rename helper excluded
- push succeeds
- final working tree clean
- local main equals origin/main
