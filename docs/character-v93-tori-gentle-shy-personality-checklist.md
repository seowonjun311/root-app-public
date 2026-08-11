# Character V93 - Tori Gentle-Shy Personality Tuning

## Goal

Keep Tori fully compatible with the V75/V79 personality runtime while making
the character feel more gentle, shy, thoughtful, and affectionate after
bonding.

V93 does not add a new personality enum/id. Tori remains on:

`social-warm`

The differentiation is entirely in Tori's existing per-character
multipliers.

## V93 Tori multipliers

Rest:

- lookAround: 1.25
- sitRest: 1.45
- nap: 1.10

Social:

- spontaneousHappy: 0.80
- passiveAttention: 0.85
- bondedFollowUpTouch: 1.55

## Intended behavior

Compared with the V92B temporary baseline, Tori should:

- spend more time quietly observing
- choose seated rest more often
- nap at a calm, near-neutral rate
- celebrate spontaneously less often
- initiate passive social attention less often
- become noticeably warmer in bonded follow-up touch interactions

This creates a "shy at first, warm after bonding" identity without changing
the shared V55-V66 behavior engine.

## What V93 does not change

- Tori 22-frame asset contract
- happy 3-frame sequence
- CharacterId / asset registry
- Home scale / ground position
- V72 presentation overrides
- V78 statistics structure
- V79 generic validator architecture
- V81 device validation
- V83 image diagnostics
- V85 renderer
- V86 roaming
- V55-V66 trigger/cooldown logic
- Pio / Nuri / existing character personality values

## Device validation

Use Tori on Home for several natural rest cycles.

Check:

1. Tori still walks and changes direction normally.
2. Tori does not become visually "inactive."
3. Sit/rest feels more common than the V92B baseline.
4. Spontaneous happy is present but not overly frequent.
5. Passive attention does not feel intrusive.
6. Bonded follow-up touch remains noticeably warm.
7. V65/V66 anti-repetition continues to prevent obvious loops.
8. Happy still uses exactly three frames with no missing-frame error.

If Tori feels too quiet, first raise `passiveAttention` slightly.
If Tori still feels too energetic, first lower `spontaneousHappy`.
Do not change V55-V66 cooldown logic for character-specific tuning.
