# Character V96A - Per-Character Relationship Foundation

## Goal

V59/V63/V64 already provide a global Rooty affection concept:

- 0..24 distant
- 25..49 familiar
- 50..74 close
- 75..100 bonded

The original V63/V64 social behaviors are tied to that global state.

With seven selectable characters, one global affection value cannot represent
a separate relationship with Rooty, Moru, Mongsil, Dami, Pio, Nuri, and Tori.

V96A adds the independent persistence/policy foundation without changing Home
runtime behavior yet.

## Per-character relationship state

Each character receives its own record:

- points 0..100
- tapCount
- longPressCount
- lastInteractionAt
- legacySeeded

Characters:

- rooty
- moru
- mongsil
- dami
- pio
- nuri
- tori

Storage key:

`character_relationship_v1`

## Relationship tiers

The thresholds intentionally reuse the established V59 language:

- 0..24: distant
- 25..49: familiar
- 50..74: close
- 75..100: bonded

This lets V96 migrate behavior gradually without inventing a second set of
relationship words.

## Interaction accounting contract

V96A defines but does not yet wire:

- short tap: +1 relationship point
- long press: +2 relationship points

There is no relationship decay in V96A.

Points clamp to 0..100.

## Relationship social multipliers

These will be composed after character personality in V96B.

### Distant

- spontaneousHappy 0.75
- passiveAttention 0
- bondedFollowUpTouch 0

### Familiar

- spontaneousHappy 0.90
- passiveAttention 0.25
- bondedFollowUpTouch 0

### Close

- spontaneousHappy 1.00
- passiveAttention 0.60
- bondedFollowUpTouch 0.35

### Bonded

- spontaneousHappy 1.05
- passiveAttention 1.00
- bondedFollowUpTouch 1.00

The result is progressive familiarity rather than one sudden on/off switch.

Character personality remains a separate layer.

For example, Tori already has:

- low spontaneous happy
- low passive attention
- strong bonded follow-up touch

So the relationship layer can make Tori reserved early and warm after bonding
without deleting the V95 personality identity.

## Legacy migration design

V96A does NOT migrate anything automatically.

V96B should:

1. load the per-character relationship store
2. seed Rooty once from the existing global V54/V59 affection value
3. leave the newly selectable characters independent
4. connect selected-character tap/long-press to the new relationship record

This preserves the user's existing Rooty progress while preventing one global
affection value from instantly making every new character bonded.

## V96A behavior boundary

V96A does NOT modify:

- Home
- V54 rooty_state_v1
- V55-V66 behavior logic
- V76 personality adapters
- V78 statistics
- V79 validation
- V85 renderer
- V86 roaming
- selected-character persistence
- character presentation
- character assets

Therefore no visible behavior change is expected after V96A.

## Planned V96B runtime integration

V96B should integrate the new relationship layer carefully:

- short tap still keeps existing mood +2 / global affection +1
- long press still keeps existing mood +3 / global affection +2
- additionally record relationship points only for the selected character
- Rooty's new relationship is seeded from existing global affection once
- V63 follow-up touch gate becomes selected-character relationship aware
- V64 passive attention becomes selected-character relationship aware
- V76 personality multiplier is preserved
- V65 spontaneous cooldown remains authoritative
- V66 rest anti-repeat remains authoritative

Target composition:

existing state/condition gate
→ selected character personality
→ selected character relationship
→ V65/V66 safety policy where applicable

## Planned V96C device validation

After V96B:

- verify each character relationship grows independently
- switch characters and confirm points do not leak
- restart app and confirm persistence
- confirm Tori is quiet at distant/familiar
- confirm Tori becomes noticeably warmer at close/bonded
- confirm Dami becomes socially attentive earlier than Tori because personality
  multipliers differ
- confirm Pio stays relatively independent
- confirm Nuri remains playful
- confirm no duplicate interaction rewards
- confirm no V63 follow-up reward loop
- confirm V65 cooldown and V66 anti-repeat remain intact
