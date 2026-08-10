# Character V70 selected-character persistence + safe Home switch

## Core behavior

- Storage key: `selected_character_v1`
- Default: `rooty`
- Valid IDs: rooty / moru / mongsil / dami
- Invalid persisted value falls back to rooty.
- `/character-preview` previews and saves the Home character.

## Home safety

Home JSX is not rewritten.

Only the import target is changed:

- old: `../../components/rooty/RootySprite`
- new: `../../components/characters/SelectedCharacterSprite`

The local JSX component name remains `RootySprite`.

`SelectedCharacterSprite`:

- rooty or loading -> exact legacy `RootySprite`
- moru/mongsil/dami -> `CharacterSprite`
- reuses the existing Home action
- normalizes an optional legacy action to `idle` only for standard characters
- reuses numeric size when available
- uses cycleKey when available to restart repeated same-action animation

## Untouched

- Legacy RootySprite implementation
- CharacterSprite implementation
- Character V68 registry
- Rooty generic/directional assets
- Behavior V55-V66 policy files
- package files

## Manual check

1. Open `/character-preview`.
2. Preview Moru and press `Home use`.
3. Return Home and confirm Moru is rendered.
4. Restart the app and confirm Moru remains.
5. Repeat for Mongsil and Dami.
6. Save Rooty.
7. Confirm legacy Rooty direction/fallback/tap behavior is restored unchanged.

## Known boundary

Moru/Mongsil/Dami currently use generic standard-23 images.
They do not yet use Rooty's directional image resolver.
