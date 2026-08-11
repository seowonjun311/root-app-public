# Character V99D - Relationship Depth + Contextual Autonomous Dialogue

## Goal

Make character dialogue deepen naturally as the relationship grows and allow
very rare action-aware speech without changing behavior selection or persisted
character state.

## Relationship depth

The existing V96 relationship points remain authoritative.

V99D derives:

- 0..24: distant
- 25..49: familiar
- 50..74: close
- 75..100: bonded

No new relationship value is stored.

Each of the seven V95 personalities has dedicated wording for all four tiers.

## Interactive priority

Short tap keeps V99C state/personality dialogue.

Long press:

- tired/exhausted still wins
- low mood still wins
- excited still wins
- otherwise relationship-tier dialogue is used

This preserves V99C/V60/V62 state priority while making intentional long-press
interaction reveal relationship depth.

Examples of the intended progression:

- distant: polite / cautious
- familiar: recognizes the user
- close: openly comfortable
- bonded: explicitly trusting and emotionally close

## Contextual autonomous dialogue

V99D listens only at existing natural-action transition points.

Contexts:

- idle: after a rest sequence returns to idle
- lookAround: when natural look-around begins
- sit: when natural sit-rest begins
- sleep: when the actual sleep action begins

V99D does not create a new behavior timer and does not alter action duration,
probability, movement, cooldown, energy, or mood.

## Structural verification

V99D v2 validates each autonomous Home hook by its V99D marker and semantic
`context: 'idle' | 'lookAround' | 'sit' | 'sleep'` value. Verification does
not depend on the owning function's indentation depth.

## Rarity policy

Autonomous speech is intentionally rare.

- startup grace: 30 seconds
- per-character autonomous cooldown: 75 seconds
- idle chance: 4%
- lookAround chance: 10%
- sit chance: 8%
- sleep chance: 12%

The existing V99C 2200ms dialogue cooldown also applies, so autonomous speech
cannot immediately overlap a recent user-triggered line.

## Anti-repeat

The existing V99C recent-line anti-repeat path is reused.

No dialogue state is persisted.

## Safety boundaries

V99D does not change:

- V99B XP/relationship feedback or progress HUD
- V99A reward presentation queue
- V98 account/cloud schema
- V97 acquisition/progression/ROOT point authority
- V96 relationship persistence
- V95 personality profiles/probability multipliers
- V59 state classifier
- V55/V60/V62/V65/V66 behavior probability engine
- V67+ behavior telemetry policy
- character renderer/assets
- package/native dependencies

Only the existing Home action transitions receive non-authoritative
`considerCharacterAutonomousDialogue(...)` calls.

## Device test later

### Relationship depth

Use one character at each relationship tier and long press after the normal
dialogue cooldown.

Expected:

- distant wording is cautious
- familiar wording recognizes repeated meetings
- close wording is warmer
- bonded wording is explicitly close/trusting

Tired/low/excited state should still override relationship depth.

### Autonomous rarity

Leave Home open and allow natural actions.

Expected:

- most action transitions produce no dialogue
- no autonomous line during the first 30 seconds after runtime module start
- after a successful autonomous line, another autonomous line does not appear
  for at least 75 seconds for that character
- idle/look/sit/sleep wording matches the action context

### Existing interaction flow

Expected:

- V99B +XP/+relationship feedback still works
- V99C tap dialogue still works
- V99A level-up/acquisition presentation still works
- no action timing or movement change is visible

## Next

Recommended V99E:

`dialogue diagnostics + deterministic policy simulation + release tuning`

This can statistically simulate relationship tiers, state priority, cooldown,
anti-repeat, and autonomous rarity before device UX tuning.
