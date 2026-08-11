# Character V92B v3 - Tori Registry + Runtime Integration

## Registration

Tori becomes a first-class selectable character while preserving the
V92A 22-frame asset decision.

Display name:

`토리`

## Runtime frame contract

Tori uses:

- idle: 4
- walk: 4
- sit: 4
- sleep: 5
- happy: 3
- touch: 2

Total: 22 runtime frames.

There is intentionally no `tori_happy_04.png`.

The existing shared standard renderer profile is preserved so V82/V84/V85
rendering behavior continues to apply. The Tori-only frame-count exception
remains owned by the V92A asset validator.

## Integrated systems

- CharacterId / CHARACTER_IDS
- Tori 22-frame asset registry
- Tori reference sheet
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

- homeScale: 1.10
- homeTranslateY: +5
- previewScale: 1.0
- previewTranslateY: 0

V72 controls remain available for final device calibration.

## Personality

Tori concept:

- gentle
- sensitive
- thoughtful
- loyal
- warm-hearted
- initially shy

Initial safe runtime policy:

`social-warm`

V92B intentionally reuses the already validated Dami social-warm signature:

- lookAround: 1.15
- sitRest: 1.20
- nap: 0.80
- spontaneousHappy: 1.15
- passiveAttention: 1.50
- bondedFollowUpTouch: 1.40

This is a conservative compatibility baseline. A later personality-tuning
version can make Tori more reserved without changing the asset/runtime
registration completed here.

## Device verification

1. Reload Metro/app.
2. Open Character Preview.
3. Confirm 토리 is visible with the existing characters.
4. Select 토리.
5. Test idle / walk / sit / sleep / happy / touch.
6. Confirm Tori happy animation cycles through exactly 3 frames.
7. Confirm continuous rendering with no flicker/disappearance.
8. Test left/right direction.
9. Tap Home에 사용.
10. Return Home and confirm Tori appears.
11. Watch roaming for 2-3 minutes.
12. Confirm V86 center pull prevents long edge-sticking.
13. Confirm size and ground position.
14. Restart app and confirm Tori selection persists.
15. If required, tune with V72 presentation controls.

## Safety

- Tori PNGs are not modified.
- Existing character PNGs are not modified.
- V92A Tori 22-frame validator exception is preserved.
- Pio and Nuri integrations are preserved.
- V85 double-buffer renderer is untouched.
- V86 balanced roaming is untouched.
- V87 existing calibration is untouched.
- V88 display-name source behavior is preserved.
- V89/V92A validator is preserved.
- V55-V66 behavior policy is untouched.
- No native rebuild is required.
