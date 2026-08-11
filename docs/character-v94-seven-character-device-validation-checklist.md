# Character V94A v2 - Seven-Character Integrated Device Validation

## Scope

Validate the complete current character lineup:

1. 루티 (`rooty`) - legacy Rooty runtime
2. 모루 (`moru`) - standard 23
3. 몽실 (`mongsil`) - standard 23
4. 다미 (`dami`) - standard 23
5. 피오 (`pio`) - standard 23
6. 누리 (`nuri`) - standard 23
7. 토리 (`tori`) - intentional 22-frame exception

Tori frame contract:

- idle 4
- walk 4
- sit 4
- sleep 5
- happy 3
- touch 2
- total 22

## Phase 1 - PC preflight

From the project root:

```powershell
& ".\scripts\run-character-v94-pc-preflight.ps1"
```

Required result:

`===== CHARACTER V94 PC PREFLIGHT PASS =====`

Do not begin runtime tuning if this preflight fails.

## Phase 2 - Character Preview / selection

For every character:

- character appears in the selector
- Korean display name is correct
- preview image is visible
- selecting the character changes the preview
- no red screen / missing asset error
- no Text-node warning caused by the character screen
- left/right direction preview is visually valid where supported
- `Home에 사용` succeeds

Expected names:

- 루티
- 모루
- 몽실
- 다미
- 피오
- 누리
- 토리

## Phase 3 - Home persistence

For every character:

1. select the character
2. tap `Home에 사용`
3. return to Home
4. confirm the selected character is shown
5. reload the app
6. return to Home
7. confirm the same character remains selected

Fail conditions:

- another character appears after reload
- character disappears
- selection resets unexpectedly
- runtime falls back to Rooty without an intentional reason

## Phase 4 - Standard animation actions

For Moru / Mongsil / Dami / Pio / Nuri:

- idle: 4 frames
- walk: 4 frames
- sit: 4 frames
- sleep: 5 frames
- happy: 4 frames
- touch: 2 frames

For Tori:

- idle: 4 frames
- walk: 4 frames
- sit: 4 frames
- sleep: 5 frames
- happy: exactly 3 frames
- touch: 2 frames

Tori must never request or display `tori_happy_04.png`.

For Rooty, validate the existing legacy action flow without converting it to
the standard-frame contract.

## Phase 5 - V85 rendering stability

Observe each standard character for at least 60 seconds.

Pass:

- no white flash between frames
- no disappearance while the next PNG loads
- no repeated fade flicker
- previous frame remains visible until the next frame is ready

Rooty remains on its legacy path and should show no regression.

## Phase 6 - V86 roaming

Observe Home roaming for each character.

Pass:

- can move left and right
- does not remain stuck against one edge
- naturally returns toward the center over time
- does not repeatedly slide along the boundary
- character stays within the intended village area

Observe each character for roughly 2-3 minutes when practical.

## Phase 7 - Size / ground calibration

Check visual size against the environment.

Current known standard baselines include previous V87/V90/V91 calibration,
while Tori starts at:

- homeScale: 1.10
- homeTranslateY: +5

For Tori specifically check:

- feet/body visually meet the ground
- not floating
- not buried into the floor
- not obviously too small or too large versus the other characters

Do not tune multiple characters at once. Record only the character that
visibly needs adjustment.

## Phase 8 - Personality / natural rest cycles

Do not force actions continuously. Let natural rest cycles occur.

Validate that:

- V65 spontaneous cooldown still prevents immediate spontaneous repeats
- V66 general rest anti-repeat still avoids obvious lookAround/sit/nap loops
- taps and long-press interactions still work
- character personality affects probabilities without bypassing common
  cooldown rules

Tori V93 target feel:

- quietly observant
- seated rest somewhat frequent
- calm nap rate
- spontaneous happy less frequent
- passive social attention not intrusive
- bonded follow-up touch warm and noticeable

Current Tori multipliers:

- lookAround 1.25
- sitRest 1.45
- nap 1.10
- spontaneousHappy 0.80
- passiveAttention 0.85
- bondedFollowUpTouch 1.55

## Phase 9 - V78 / V79 / V81 / V83 diagnostics

Open the existing character diagnostics/validation screens.

Confirm Tori is present in:

- runtime statistics
- personality validation
- device validation
- image diagnostics

Also spot-check Pio and Nuri to ensure the later Tori registration did not
remove their entries.

## Result classification

### PASS

Use when:

- PC preflight passes
- all seven characters are selectable
- Home persistence works
- actions render correctly
- no disappearance/flicker regression
- roaming remains balanced
- diagnostics include Tori
- Tori happy uses exactly three frames

### PASS WITH CALIBRATION NEEDED

Use when the system is stable but one character needs only:

- scale adjustment
- vertical ground adjustment
- small probability tuning

This should lead to a narrow calibration version rather than broad runtime
changes.

### FAIL

Use when there is:

- missing asset
- TypeScript error
- selection/persistence failure
- renderer disappearance
- roaming regression
- missing diagnostic integration
- invalid Tori happy_04 access
- repeated behavior that bypasses V65/V66 policy

## After V94

If V94 passes, the recommended development order is:

- V95: character-specific behavior identity refinement
- V96: relationship / affinity-driven behavior
- V97: acquisition, unlock, reward, and progression integration
- V98: release regression suite and new-character onboarding template
