# Character V87 - Home Size + Ground Calibration

## Scope
Home presentation only.

The standard 23-frame characters use portrait source canvases with different
amounts of transparent space around the visible artwork. V82 normalized the
shared canvas, while V87 now gives each character a small Home-only baseline
adjustment so their visible presence and ground contact are more consistent.

## V87 baselines

| Character | Home scale | Home translateY |
| --- | ---: | ---: |
| Moru | 0.98 | +5 |
| Mongsil | 1.20 | +2 |
| Dami | 1.03 | +4 |

Rooty remains unchanged.

Preview scale and preview translateY remain unchanged. The V72 per-device
override layer also remains active on top of these baseline values.

## Device validation
1. Reload the app.
2. Select Moru and watch idle/walk/sit/sleep.
3. Confirm the feet/body visually sit on the same village ground level.
4. Repeat with Mongsil and Dami.
5. Compare overall character presence rather than exact ear/tail width.
6. Confirm Mongsil is no longer visibly undersized relative to Moru/Dami.
7. Confirm no frame flicker or disappearance returns.
8. Confirm V86 balanced roaming still crosses left/center/right areas.
9. Confirm Rooty looks exactly as before.

## If an old V72 override exists
The saved override is intentionally preserved.

To inspect the pure V87 baseline, open Character Preview for that standard
character and use the existing presentation-reset control once. Then return
Home and compare again.

## Safety
- No character PNG is modified.
- CharacterSprite V85 double buffering is untouched.
- V86 balanced roaming is untouched.
- V55-V66 state/rest behavior is untouched.
- Standard frame timing is untouched.
- No native rebuild is required.
