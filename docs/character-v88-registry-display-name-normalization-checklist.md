# Character V88 - Registry Display Name Normalization

## Purpose
Character display names are now owned by `constants/characterAssets.ts`.

Before V88:
- The registry contained mojibake/corrupted displayName strings.
- `app/character-preview.tsx` kept a second `CHARACTER_LABEL` map.
- Adding a character required maintaining multiple name sources.

After V88:
- Rooty = 猷⑦떚
- Moru = 紐⑤（
- Mongsil = 紐쎌떎
- Dami = ?ㅻ?
- Source values are stored as Unicode escapes for encoding safety.
- Character Preview reads names directly from the asset registry.
- The duplicated `CHARACTER_LABEL` map is removed.

## Device validation
1. Open Character Preview.
2. Confirm selector buttons show 猷⑦떚 / 紐⑤（ / 紐쎌떎 / ?ㅻ?.
3. Select each character.
4. Confirm the large current-character name matches the selected button.
5. Save each as Home character once if desired.
6. Confirm `?꾩옱 Home:` displays the correct Korean name.
7. Confirm character images, scale, ground position, animation and roaming are unchanged.

## Safety
- No PNG files modified.
- No frame arrays modified.
- No presentation scale/translate values modified.
- V85 renderer untouched.
- V86 roaming untouched.
- V87 size/ground calibration untouched.
- V55-V66 behavior untouched.
- No native rebuild required.

## Next
V89 can add additional standard-23 characters to the same registry without
creating another UI label map.
