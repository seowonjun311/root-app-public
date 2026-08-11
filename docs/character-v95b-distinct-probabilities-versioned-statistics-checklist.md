# Character V95B - Distinct Probabilities + Versioned Statistics

## Goal

Make Pio and Nuri visibly different from Moru without changing the shared
Home behavior engine.

V95A gave every character a unique identity id.
V95B now gives Pio and Nuri distinct probability fingerprints.

## Pio - explorer-curious

Rest multipliers:

- lookAround: 1.55
- sitRest: 0.85
- nap: 0.55

Social multipliers:

- spontaneousHappy: 1.15
- passiveAttention: 0.75
- bondedFollowUpTouch: 0.85

Intent:

- strongest observation/exploration tendency
- clearly fewer naps
- happy expression remains present but is less exuberant than Moru/Nuri
- social attention is relatively independent/reserved

Using the old neutral 45/33/22 rest example, the approximate normalized
distribution becomes:

- lookAround: 63.47%
- sitRest: 25.52%
- nap: 11.01%

## Nuri - playful-adventurous

Rest multipliers:

- lookAround: 1.15
- sitRest: 0.80
- nap: 0.60

Social multipliers:

- spontaneousHappy: 1.65
- passiveAttention: 1.05
- bondedFollowUpTouch: 1.00

Intent:

- active/adventurous rather than deeply observational
- fewer long seated/sleeping rests
- strongest spontaneous happy expression in the current lineup
- normal-friendly social attention

Using neutral 45/33/22, approximate rest distribution:

- lookAround: 56.65%
- sitRest: 28.90%
- nap: 14.45%

## Moru remains curious-active

Moru remains the original V75 baseline:

- lookAround 1.25
- sitRest 0.95
- nap 0.70
- spontaneousHappy 1.35
- passiveAttention 0.85
- bondedFollowUpTouch 0.90

So the three formerly similar characters now read as:

- Moru: curious + energetic
- Pio: explorer + observer
- Nuri: playful + adventurous

## Statistics policy versioning

V78 previously stored samples without a personality-policy version.

V95B adds `personalityPolicyVersion` to every new:

- rest sample
- social sample

Existing stored samples are preserved and normalized as version `0`.

Current profile versions:

- Rooty: 1
- Moru: 1
- Mongsil: 1
- Dami: 1
- Pio: 2
- Nuri: 2
- Tori: 2

V79 now filters statistics to the selected character's current
`policyVersion` before validating.

Therefore:

- historical data remains available in V78
- old probability samples do not contaminate V79 PASS/CHECK
- V79 will temporarily show WAIT until enough fresh current-version samples
  accumulate

This WAIT is expected immediately after V95B.

## Expected social examples

Using existing base chances:

- spontaneous happy base 22%
- passive attention base 12%
- bonded follow-up touch base 35%

Pio:

- happy: 25.3%
- passive attention: 9.0%
- bonded follow-up: 29.75%

Nuri:

- happy: 36.3%
- passive attention: 12.6%
- bonded follow-up: 35.0%

## Protected systems

V95B does not edit:

- Home behavior orchestration
- V55-V66 trigger/cooldown/anti-repeat logic
- V76 personality runtime adapter logic
- V77 diagnostic bridge
- V85 renderer
- V86 roaming
- selected-character persistence
- character presentation
- character PNGs
- Tori 22-frame / happy-3 contract

## Device verification

After install:

1. Reload the app.
2. Use Pio for several natural rest cycles.
3. Pio should feel observant and should nap relatively rarely.
4. Use Nuri for several natural rest cycles.
5. Nuri should feel more expressive/playful than Pio.
6. Confirm Nuri spontaneous happy remains protected by V65 cooldown.
7. Open Character runtime statistics and confirm new samples continue to grow.
8. Open Personality auto-validation.
9. Immediately after V95B, WAIT is normal because old version-0 samples are
   ignored.
10. After at least 5 current-version rest samples, signature can evaluate.
11. After at least 20 current-version rest samples, selection calibration can
   evaluate.
12. Verify no renderer/roaming regression.

## Next

V95C should be used only if device observation says one profile is too strong
or too subtle.

If Pio/Nuri feel clearly distinct and natural, V95 is complete and V96 can
begin relationship/affinity-driven behavior.
