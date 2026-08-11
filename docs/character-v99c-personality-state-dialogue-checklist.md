# Character V99C - Personality + State Micro-dialogue

## Goal

Give the selected Home character a recognizable voice without changing the
authoritative behavior, relationship, progression, reward, account, or cloud
systems.

## Personality source

V99C consumes the existing V95 personality profile identity:

- Rooty: balanced
- Moru: curious-active
- Mongsil: cozy-calm
- Dami: social-warm
- Pio: explorer-curious
- Nuri: playful-adventurous
- Tori: gentle-shy

The dialogue policy calls `getCharacterPersonalityProfile(characterId)` rather
than creating a second personality identity system.

## State source

V99C consumes the live V59 `rootyConditionRef.current` snapshot already kept by
Home.

Dialogue tones:

- tired/exhausted -> tired
- low mood -> low
- excited -> excited
- bonded long-press -> bonded
- happy -> happy
- otherwise -> calm

The ordering intentionally preserves the existing V60/V62 rule that tired or
exhausted energy recovery has priority over low-mood expression.

V99C does not change numeric state or semantic thresholds.

## Interaction flow

Short tap:

V96 relationship update
-> V99B actual relationship feedback
-> V99C personality/state dialogue
-> V97C growth
-> V97E acquisition evaluation

Long press follows the same ordering.

## Anti-spam

Dialogue is intentionally not emitted for every rapid tap.

Per selected character:

- cooldown: 2200ms
- recent history: last 2 lines for the current tone
- candidate selection avoids both recent lines when possible

V99B XP/relationship batching remains independent and unchanged.

## Dialogue presentation

The Home speech bubble:

- is pointer-events transparent
- shows the selected character name
- animates in
- remains visible about 1800ms
- fades away
- ignores events for a different selected character

No dialogue state is persisted.

## Safety boundaries

V99C does not change:

- V99B feedback bus or progress HUD
- V99A reward presentation queue
- V98 account/cloud schema
- V97 progression/acquisition/ROOT point authority
- V96 relationship persistence
- V95 personality profiles or probability multipliers
- V59 condition thresholds
- V55/V60/V62/V65/V66 behavior selection
- character sprite renderer
- package/native dependencies

## Device test later

### Personality

Switch characters and tap after the cooldown.

Expected:

- every character has recognizably different wording
- no dialogue from the previously selected character appears

### State

Test when state is:

- tired/exhausted
- low mood
- happy
- excited

Expected:

- dialogue tone follows the semantic state
- tired/exhausted takes priority if low mood is also present

### Bonded long press

For a character relationship >= 75:

Expected:

- long press can use the bonded tone
- short tap continues to follow state tone

### Rapid taps

Expected:

- V99B XP/relationship numbers may batch
- dialogue does not spam every tap
- same line does not repeat immediately
- dialogue resumes after cooldown

## Next

Recommended V99D:

`relationship-tier dialogue depth + contextual idle speech`

Possible scope:

- distant/familiar/close/bonded wording depth
- rare idle speech with long cooldown
- action-aware lines for sit/sleep/look-around
- keep all autonomous dialogue non-intrusive and anti-repeat protected
