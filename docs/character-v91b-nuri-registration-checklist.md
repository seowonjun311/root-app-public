# Character V91B - Nuri Registry + Runtime Integration

## Registration

Nuri becomes a first-class `standard-23` character.

Display name:

`?꾨━`

## Integrated systems

- CharacterId / CHARACTER_IDS
- 23-frame asset registry
- Nuri reference sheet
- shared Character Preview
- selected Home character
- character presentation
- V72 presentation override persistence
- V75 personality
- V78 runtime statistics
- V79 personality validation
- V81 device validation
- V83 image diagnostics

## Presentation baseline

Initial Home values:

- homeScale: 1.12
- homeTranslateY: +5
- previewScale: 1.0
- previewTranslateY: 0

V72 controls remain available for final device calibration.

## Personality

Nuri concept:

- playful
- curious
- friendly
- adventurous

Initial runtime policy:

`curious-active`

Multipliers:

- lookAround: 1.25
- sitRest: 0.95
- nap: 0.70
- spontaneousHappy: 1.35
- passiveAttention: 0.85
- bondedFollowUpTouch: 0.90

The existing curious-active validation signature is shared with Moru and Pio.

## Device verification

1. Reload Metro/app.
2. Open Character Preview.
3. Confirm ?꾨━ is visible with 猷⑦떚 / 紐⑤（ / 紐쎌떎 / ?ㅻ? / ?쇱삤.
4. Select ?꾨━.
5. Test idle / walk / sit / sleep / happy / touch.
6. Confirm continuous rendering with no flicker/disappearance.
7. Test left/right direction.
8. Tap Home???ъ슜.
9. Return Home and confirm Nuri appears.
10. Watch roaming for 2-3 minutes.
11. Confirm V86 center pull prevents long edge-sticking.
12. Confirm size and ground position.
13. Restart app and confirm Nuri selection persists.
14. If required, tune with V72 presentation controls.

## Safety

- Nuri PNGs are not modified.
- Existing character PNGs are not modified.
- Pio integration is preserved.
- V85 double-buffer renderer is untouched.
- V86 balanced roaming is untouched.
- V87 existing calibration is untouched.
- V88 display-name source behavior is preserved.
- V89 validator is preserved.
- V90 Pio integration is preserved.
- V55-V66 behavior policy is untouched.
- No native rebuild is required.
