# Character V95A - Behavior Identity Foundation

## Why V95A exists

The V75/V76 personality runtime already applies per-character rest and social
probability multipliers.

However, later characters initially reused the older personality ids:

- Pio reused `curious-active`
- Nuri reused `curious-active`
- Tori reused `social-warm`

That was safe for registration, but it no longer describes seven distinct
character identities.

V95A separates identity from probability tuning before changing any runtime
probability value.

## Seven behavior identity ids

- Rooty: `balanced`
- Moru: `curious-active`
- Mongsil: `cozy-calm`
- Dami: `social-warm`
- Pio: `explorer-curious`
- Nuri: `playful-adventurous`
- Tori: `gentle-shy`

All seven ids are unique.

## Runtime behavior safety

V95A changes no multiplier values.

Therefore the actual V76 runtime probabilities remain identical to the V94C
baseline.

This avoids mixing old and new probability statistics while the identity /
validation architecture is being corrected.

## V79 validator correction

Original V79 personality signature validation was character-id based:

- Rooty branch
- Moru branch
- Mongsil branch
- everything else used the old Dami-style fallback

That fallback was acceptable when V79 only covered the original four
characters, but later Pio/Nuri/Tori registrations made it too broad.

V95A changes the signature selector to `profile.id`.

Tori `gentle-shy` is now validated as:

- seated-rest personality share should increase

Social validation remains profile-driven and continues to compare the
recorded chance with the current profile's multiplier.

## V94 verifier maintenance

V94 integration verifier is updated for:

- Tori calibrated Home scale `1.16`
- Tori identity id `gentle-shy`

The V94 device/runtime baseline itself is not changed.

## Protected systems

V95A does not modify:

- Home behavior pipeline
- V55/V60/V61/V62/V63/V64/V65/V66 behavior policy
- V76 runtime adapters
- V78 runtime statistics persistence
- V85 double-buffer renderer
- V86 roaming
- character presentation/calibration
- selected-character persistence
- character assets
- Tori 22-frame / happy-3 contract
- package files

## Next: V95B

After V95A is confirmed, V95B can safely make Pio and Nuri behavior
probabilities genuinely different from Moru.

Before changing those probabilities, V95B should make V78 statistics
policy-version-aware so historical samples from the old profile do not cause
false V79 CHECK results.

Planned distinction:

- Moru: curious / energetic baseline
- Pio: exploration and observation emphasis
- Nuri: playful / adventurous expression emphasis
- Mongsil: cozy / calm
- Dami: attentive / social warmth
- Tori: shy / seated-rest / warm after bonding
- Rooty: balanced compatibility baseline
