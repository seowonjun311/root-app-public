# Character V99E - Dialogue Diagnostics + Deterministic Simulation + Release Tuning

## Goal

Turn V99C/V99D dialogue behavior into a measurable release-candidate system
before device UX tuning.

V99E intentionally does not change the V99D runtime probabilities.

Instead it freezes the current values as the release candidate and adds
deterministic gates that fail if the policy drifts outside approved bounds.

## Current release-candidate values

Interactive dialogue cooldown:

- 2200ms

Autonomous dialogue:

- startup grace: 30s
- per-character cooldown: 75s
- idle: 4%
- lookAround: 10%
- sit: 8%
- sleep: 12%

Deterministic simulation:

- seed: 99005
- samples: 10,000 per context
- acceptable absolute rate error: 1.5 percentage points

## Relationship boundary diagnostics

The simulator checks exact boundary values:

- 0, 24 -> distant
- 25, 49 -> familiar
- 50, 74 -> close
- 75, 100 -> bonded

## State priority diagnostics

The simulator confirms:

- tired/exhausted over low mood
- low mood over excited
- excited over bonded long press
- bonded long press over happy
- happy over calm

This protects the V60/V62/V99C priority contract.

## Release tuning gates

Approved bounds:

- interactive cooldown: 1.8s to 3.0s
- startup grace: 20s to 45s
- autonomous cooldown: 60s to 120s
- maximum per-context autonomous chance: 12%

These are validation bounds, not new runtime settings.

## Deterministic probability simulation

A fixed PRNG seed runs 10,000 attempts for each context.

The same seed must produce the same hit count every time.

Each observed rate must remain within 1.5 percentage points of the configured
rate.

This simulation checks the probability policy only. Runtime cooldown timing is
validated separately by the release tuning gates.

## Diagnostics screen

Route:

`/character-dialogue-diagnostics`

Character Preview receives a `대사 정책 진단` button.

The screen shows:

- release READY / CHECK REQUIRED
- passed / total checks
- seed and sample size
- current release tuning
- relationship boundary checks
- state priority checks
- expected versus observed autonomous rates
- same-seed rerun button

The screen performs no character mutation.

## Safety

V99E does not modify:

- `store/characterMicroDialogue.ts`
- Home natural behavior integration
- V99C speech bubble
- V99B growth/relationship feedback
- V99A reward presentation
- V98 account/cloud
- V97 progression/acquisition/points
- V96 relationship persistence
- V95 personality probability profiles
- V59 condition classifier
- character assets/renderer
- package/native dependencies

No AsyncStorage or Firestore is used by V99E diagnostics.

## Device validation later

Open Character Preview -> `대사 정책 진단`.

Expected:

- status READY
- all relationship checks PASS
- all state checks PASS
- all tuning gates PASS
- all four probability checks PASS
- rerunning with the same seed yields the same observed rates

Then return Home and verify V99C/V99D UX naturally.

## Release note

After V99E passes code verification, dialogue policy code is release-hardened.

Real-device UX validation remains separate:

- bubble position
- wording feel
- perceived autonomous frequency
- interaction timing
- state transitions in real use

If those feel too intrusive or too quiet, change policy values only in a later
explicit tuning stage and rerun V99D/V99E regression.
