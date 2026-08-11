# Character V99A - Acquisition + Growth Reward Presentation

## Goal

Turn the V97 acquisition/growth systems into a visible game-like reward flow
without changing the authoritative progression, relationship, ROOT point, or
V98 account/cloud storage contracts.

## Acquisition flow

Existing V97F remains authoritative for:

- deciding which acquisition celebrations are unseen
- excluding starter / legacy ownership
- persistent one-time seen state
- sequential acquisition processing

V99A replaces the normal visible Alert with a rich presentation when a UI host
is mounted.

If a presentation host is unavailable, the original V97F Alert remains as the
fallback.

Flow:

condition achieved
-> V97E acquireCharacter
-> V97F unseen acquisition detected
-> V99A reward queue
-> animated happy CharacterSprite
-> character name + personality tagline
-> acquisition source
-> `나중에` or `바로 선택`

`바로 선택` calls the existing authoritative `saveSelectedCharacter()` gate.

## Growth flow

V99A does not estimate level changes from UI state.

It listens only to the existing V97C authoritative mutation result:

`result.newlyReachedLevels`

Therefore a level-up card is emitted only when the actual progression mutation
crosses a configured threshold.

Growth card:

- LEVEL UP badge
- happy character animation
- previous level -> new level
- existing milestone reward display

Reward display remains:

- Lv2 +5P
- Lv3 +10P
- Lv4 +15P
- Lv5 +25P

The actual ROOT point grant remains the existing V97D transaction/idempotency
system. V99A only presents it.

## Serialized presentation queue

Acquisition and growth events share one runtime queue.

This prevents:

- two Modals on top of each other
- acquisition + level-up overlap
- rapid-tap level events overwriting one another

If one interaction ever crosses more than one level, each reached level is
queued in order.

## Host policy

Home and Character Preview both mount a presentation host.

The most recently mounted host is active.

This avoids duplicate Modals if Home remains mounted under Character Preview.

When Preview closes, Home automatically becomes the active host again.

## Account/cloud safety

V99A adds no persistent storage key.

It does not change:

- V98 cloud envelope
- V98 scoped storage keys
- V98 schema version
- selected-character persistence format
- progression persistence format
- relationship persistence format
- celebration persistence format

Acquisition one-time seen state continues through the existing V98
account-scoped/cloud path.

The V99A visual queue is intentionally runtime-only.

## Device test later

### Acquisition

Trigger a real character unlock.

Expected:

- no plain Alert while Home/Preview host exists
- reward card appears once
- character uses happy animation
- source text is correct
- `나중에` closes it
- restart does not repeat it
- next unlock queues after the first

### Immediate selection

On acquisition card:

- tap `바로 선택`
- acquired character becomes selected
- Home uses that character
- locked-character gate is still respected

### Growth

Bring selected character near a level threshold.

Expected:

- crossing threshold shows exactly one LEVEL UP card
- displayed old/new level is correct
- milestone point display is correct
- existing V97D point balance changes independently/authoritatively

### Rapid interaction

Rapid taps around a threshold:

Expected:

- no duplicate level event
- no lost XP
- no overlapping reward card

### Preview/Home host transition

Open Character Preview while Home remains in navigation stack.

Expected:

- only one reward Modal
- closing Preview restores Home as presentation host

## Regression gates

Must remain PASS:

- V98E release integrity
- V98D guest handoff + cloud diagnostics
- V98C cloud sync/conflict/retry
- V98B account scoped runtime
- V98A cloud foundation
- V97F one-time acquisition
- V97E unlock conditions
- V97D ROOT point grant/idempotency
- V97C +1/+2 growth interaction
- V97B locked selection
- V96 relationship
- V95 personality
- V94 seven-character integration
- standard character assets
- TypeScript

## Next

After V99A:

Recommended V99B:

`character growth feedback in Home`

Possible scope:

- small floating `+1 XP / +2 XP`
- relationship `+1 / +2` feedback
- level progress ring/bar
- character-specific reaction text
- anti-spam batching for rapid taps

This should remain presentation-only and keep V97/V98 authoritative stores
unchanged.
