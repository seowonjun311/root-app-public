# Character V94C - Tori Size Calibration

## Device result entering V94C

Seven-character integration result:

- Rooty: PASS
- Moru: PASS
- Mongsil: PASS
- Dami: PASS
- Pio: PASS
- Nuri: PASS
- Tori: PASS WITH CALIBRATION NEEDED

Tori runtime observations:

- selection: PASS
- Home: PASS
- persistence after app restart: PASS
- happy 3-frame sequence: PASS
- flicker/disappearance: PASS
- roaming: PASS
- ground position: PASS
- size: slightly small

## Calibration

Only Tori Home scale changes:

- previous `homeScale`: 1.10
- V94C `homeScale`: 1.16
- `homeTranslateY`: remains +5

This is a narrow ~5.5% increase relative to the previous Tori baseline.

## Not changed

- Tori 22-frame contract
- Tori happy 3-frame sequence
- Tori PNGs
- preview scale
- ground Y position
- V93 gentle-shy personality
- V72 override system
- V78/V79/V81/V83 integration
- V85 double-buffer renderer
- V86 roaming
- V55-V66 behavior engine
- all other character presentation values

## Device check after V94C

1. Reload the app.
2. Keep/select Tori on Home.
3. Confirm Tori is visibly a little larger.
4. Confirm the feet/body still meet the same ground position.
5. Confirm Tori is not oversized versus Pio/Nuri/Moru.
6. Observe one walk cycle and one sit/sleep cycle.
7. Confirm no clipping at movement boundaries.
8. Confirm no flicker or disappearing regression.

If size now looks natural, V94 is complete and V95 can begin.

If Tori is still slightly small, use a second narrow calibration only; do not
change renderer or movement behavior.
