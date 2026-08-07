# ROOTY Behavior V5 directional sprite resolver checklist

## Goal

Prepare Rooty for independent down-right, down-left, up-right, and up-left sprite assets without requiring every directional PNG to exist immediately.

## Resolver priority

1. Exact action + direction frames.
2. Opposite horizontal direction frames mirrored with scaleX.
3. Existing generic action frames.
4. Existing generic idle frames.

Metro image requires remain static. Missing future PNG files must not be added to require(...) until those files actually exist.

## PC checks

- V4 runtime continuity remains.
- constants/rootyDirectionalAssets.ts exists.
- Four Rooty directions are typed.
- Exact directional lookup exists.
- Mirrored-direction fallback exists.
- Generic action fallback exists.
- Generic idle fallback exists.
- RootySprite accepts direction.
- RootySprite still accepts optional manual flipX override.
- Home passes foxDirection to RootySprite.
- Old home-level left/right flip expression is removed.
- TypeScript passes.
- Git whitespace check passes.
- No package files changed.

## Current visual expectation

Because no direction-specific Rooty PNGs are registered yet, current action PNGs remain the visual source. Left-facing directions are mirrored automatically. Up-facing directions safely reuse generic action frames until dedicated up-direction assets are registered.

## Future asset registration

Add real files first, then register them under ROOTY_DIRECTIONAL_FRAMES.

Suggested folder convention:

- assets/rooty/idle/down_right/
- assets/rooty/idle/up_right/
- assets/rooty/walk/down_right/
- assets/rooty/walk/up_right/
- assets/rooty/sit/down_right/
- assets/rooty/sit/up_right/
- assets/rooty/sleep/down_right/
- assets/rooty/sleep/up_right/
- assets/rooty/happy/down_right/
- assets/rooty/happy/up_right/

Left variants do not need to be mandatory when a visually correct right-facing counterpart can be mirrored.

## Phone checks later

- downRight uses the current visual orientation.
- downLeft mirrors automatically.
- upRight does not crash when no dedicated asset exists.
- upLeft does not crash and mirrors the fallback.
- walk animation continues while direction changes.
- sit/sleep/happy still animate.
- tap -> happy -> idle behavior still works.
- V4 position/action persistence still works.

## Completion gate

V5 is structurally complete when all PC checks pass and direction-specific assets can be added later by editing only the directional registry rather than home behavior code.
