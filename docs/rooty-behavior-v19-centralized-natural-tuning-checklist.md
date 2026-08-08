# ROOTY Behavior V19 centralized natural tuning checklist

## Goal

Move Rooty's natural-routine tuning values out of the Home screen and into one dedicated configuration file.

## New source of truth

constants/rootyBehavior.ts

ROOTY_NATURAL_BEHAVIOR controls:

- walking session step count
- heading segment length
- keep-heading probability
- blocked retry limit
- post-walk rest delay
- rest-to-walk delay
- look-around timing
- nap transition and duration timing
- sit-rest duration
- look-around / sit / nap probability thresholds
- normal next-cycle delay

## Existing motion config stays separate

constants/rootyMotion.ts continues to control:

- physical X/Y step distance
- movement duration
- walk PNG frame timing
- bob timing
- next physical step delay
- blocked physical retry delay

V19 does not change any current values.
It only centralizes them.

## Why this helps

Phone testing can now tune Rooty's personality without editing the large Home screen.

For example:

- make Rooty walk longer
- make turns less frequent
- make naps rarer
- shorten sitting
- increase looking around

can be done from one small configuration file.

## Compatibility

- V18 active-Home checkpoints remain.
- V17 serialized persistence remains.
- V16 development tracing remains.
- V15 atomic state/ref sync remains.
- V11 synchronized motion remains.
- V8 coherent walking remains.
- no native dependencies change

## PC checks

- V19 marker exists.
- ROOTY_NATURAL_BEHAVIOR exists.
- Home imports the config.
- all selected natural-routine literals use config values.
- V11 motion config remains separate.
- TypeScript passes.
- Git whitespace check passes.

## Phone checks later

No visual difference is expected from V19 because every value is preserved.

After the first real-device behavior review, tune only constants/rootyBehavior.ts and constants/rootyMotion.ts instead of patching behavior logic.
