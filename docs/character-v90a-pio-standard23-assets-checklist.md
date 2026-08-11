# Character V90A v3 - Pio Standard-23 Asset Import

## Source handling

The original `Downloads\pio` directory is read-only from the installer's point
of view. Nothing there is moved, renamed, deleted, or modified.

V90A v3 expects exactly 25 PNGs:

- 23 runtime frames;
- 1 extra base-front source ending in `01_20_39.png`;
- 1 remaining PNG, automatically treated as the Pio reference sheet.

No Korean filename/date text is used by the importer.

## Runtime mapping

| Runtime file | Original filename suffix |
| --- | --- |
| pio_idle_01.png | 01_21_52 (1).png |
| pio_idle_02.png | 01_21_53 (2).png |
| pio_idle_03.png | 01_21_53 (3).png |
| pio_idle_04.png | 01_21_53 (4).png |
| pio_walk_01.png | 01_21_53 (5).png |
| pio_walk_02.png | 01_21_53 (6).png |
| pio_walk_03.png | 01_21_53 (7).png |
| pio_walk_04.png | 01_21_53 (8).png |
| pio_sit_01.png | 01_21_53 (9).png |
| pio_sit_02.png | 01_21_53 (10).png |
| pio_sit_03.png | 01_22_10 (1).png |
| pio_sit_04.png | 01_22_11 (2).png |
| pio_sleep_01.png | 01_22_11 (3).png |
| pio_sleep_02.png | 01_22_11 (4).png |
| pio_sleep_03.png | 01_22_11 (5).png |
| pio_sleep_04.png | 01_22_11 (6).png |
| pio_sleep_05.png | 01_22_11 (7).png |
| pio_happy_01.png | 01_22_12 (8).png |
| pio_happy_02.png | 01_22_12 (9).png |
| pio_happy_03.png | 01_22_12 (10).png |
| pio_happy_04.png | 01_22_24 (1).png |
| pio_touch_01.png | 01_22_25 (2).png |
| pio_touch_02.png | 01_22_25 (3).png |

## Validation

- all 23 runtime sources must resolve uniquely;
- every runtime source must be 1024x1536 PNG;
- all runtime hashes must be unique;
- exactly one PNG must remain as the reference sheet;
- V89 `verify:character-assets -- pio` must pass.

## Safety

- no original Pio download is modified;
- no registry code is changed yet;
- no presentation code is changed yet;
- V85-V89 behavior and renderer work remains untouched;
- no native rebuild is required.

## Next

V90B registers Pio in the character registry and presentation profile.
