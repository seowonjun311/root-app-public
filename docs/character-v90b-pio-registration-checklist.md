# Character V90B v4 - Pio Registry + Runtime Integration

## Registration

Pio is registered as a first-class standard-23 character.

Display name:

`?쇱삤`

Source uses Unicode escapes for encoding safety.

## Integrated systems

- CharacterId / CHARACTER_IDS
- 23-frame asset registry
- Pio reference sheet
- Character presentation
- V72 presentation override persistence
- V75 personality
- V78 runtime statistics
- V79 personality validation
- V81 device validation
- V83 image diagnostics
- Character Preview and selected Home character through shared CHARACTER_IDS

## Presentation baseline

- homeScale: 1.18
- homeTranslateY: +5
- previewScale: 1
- previewTranslateY: 0

V72 calibration remains available after device testing.

## Pio personality

Initial profile: `curious-active`

- lookAround: 1.25
- sitRest: 0.95
- nap: 0.70
- spontaneousHappy: 1.35
- passiveAttention: 0.85
- bondedFollowUpTouch: 0.90

V79 uses the curious-active signature check for both Moru and Pio.

## Device verification

1. Reload Metro/app.
2. Open Character Preview.
3. Confirm ?쇱삤 appears beside the existing four characters.
4. Test idle, walk, sit, sleep, happy, touch.
5. Test left/right facing.
6. Confirm no disappearance/flicker.
7. Tap Home???ъ슜.
8. Return Home.
9. Confirm Pio appears and roams across the village.
10. Confirm ground position/size.
11. Restart and confirm Pio remains selected.
12. If needed, use V72 size/Y controls for final tuning.
13. Optional: verify Pio in V83 image diagnostics.
14. Optional: record V81 device validation results.

## Safety

- V90A Pio PNGs are not modified.
- Existing character PNGs are not modified.
- V85 double-buffer renderer is untouched.
- V86 balanced roaming is untouched.
- V87 existing calibration is untouched.
- V88 display-name single-source behavior is preserved.
- V89 validator is preserved.
- V55-V66 core behavior policy is untouched.
- No native rebuild required.
