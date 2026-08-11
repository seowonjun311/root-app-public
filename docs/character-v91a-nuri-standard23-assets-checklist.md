# Character V91A - Nuri Standard-23 Asset Import

## Result

Nuri is imported as a standard-23 character asset set.

The original files in `Downloads\nuri` are not moved, renamed, deleted, or
modified. V91A copies only the selected runtime sources into `characters/nuri`.

The single PNG remaining after the 23 runtime sources are resolved is copied as:

`nuri_reference_sheet.png`

## Runtime mapping

| Runtime file | Original filename suffix |
| --- | --- |
| nuri_idle_01.png | 01_22_40 (1).png |
| nuri_idle_02.png | 01_22_41 (2).png |
| nuri_idle_03.png | 01_22_41 (3).png |
| nuri_idle_04.png | 01_22_41 (4).png |
| nuri_walk_01.png | 01_22_41 (5).png |
| nuri_walk_02.png | 01_22_41 (6).png |
| nuri_walk_03.png | 01_22_41 (7).png |
| nuri_walk_04.png | 01_22_41 (8).png |
| nuri_sit_01.png | 01_22_41 (9).png |
| nuri_sit_02.png | 01_22_41 (10).png |
| nuri_sit_03.png | 01_22_52 (1).png |
| nuri_sit_04.png | 01_22_52 (2).png |
| nuri_sleep_01.png | 01_22_52 (3).png |
| nuri_sleep_02.png | 01_22_52 (4).png |
| nuri_sleep_03.png | 01_22_52 (5).png |
| nuri_sleep_04.png | 01_22_52 (6).png |
| nuri_sleep_05.png | 01_22_52 (7).png |
| nuri_happy_01.png | 01_22_52 (8).png |
| nuri_happy_02.png | 01_22_52 (9).png |
| nuri_happy_03.png | 01_22_52 (10).png |
| nuri_happy_04.png | 01_23_03 (1).png |
| nuri_touch_01.png | 01_23_04 (2).png |
| nuri_touch_02.png | 01_23_04 (3).png |

## Visual sequence

- idle: neutral / blink / subtle idle variations
- walk: four alternating step poses
- sit: standing-to-seated progression
- sleep: lowering / lying / sleeping progression
- happy: arms rise / crouch / jump / highest jump
- touch: sprout touch reaction / affectionate wink

## Validation

V91A requires:

- exactly 24 PNGs in `Downloads\nuri`;
- exactly 23 mapped runtime files;
- exactly one remaining reference-sheet PNG;
- all runtime files to be valid 1024x1536 PNGs;
- all 23 runtime hashes to be unique;
- V89 `verify:character-assets -- nuri` PASS.

## Safety

- `Downloads\nuri` remains untouched.
- No Nuri registry entry is added yet.
- No Nuri presentation/personality profile is added yet.
- Existing character PNGs are untouched.
- V85-V90 systems are untouched.
- V55-V66 behavior is untouched.
- No native rebuild is required.

## Next

V91B will register Nuri in the shared character registry and runtime systems.
