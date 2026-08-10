# ROOTY Behavior V58 offline state drift checklist

## Goal

Extend V57 mood drift across real app inactivity without retroactively misreading old V57 state timestamps.

## Why V58 uses a dedicated checkpoint

`rooty_state_v1` already contains `savedAt`, but that value means "last state save time", not necessarily "moment the app became inactive".

Using it directly could over-count active time on the first V58 launch.

V58 therefore adds:

`rooty_offline_checkpoint_v1`

This key is written only when the app becomes inactive/backgrounded and is consumed once when the app becomes active or cold-launches again.

## V58 offline mood rule

V58 reuses the V57 rule:

- one 10-minute interval = 1 mood point toward baseline 70
- maximum catch-up per return = 6 points

Examples:

- 5 minutes offline -> 0
- 10 minutes offline -> 1
- 35 minutes offline -> 3
- 60 minutes offline -> 6
- 8 hours offline -> still maximum 6
- mood already 70 -> no mood change

The adjustment never overshoots 70.

## Lifecycle

When app becomes inactive/backgrounded:

1. save the current Rooty state through existing V54 serialization
2. write `rooty_offline_checkpoint_v1`

When app becomes active or cold-launches:

1. consume the checkpoint once
2. calculate elapsed inactive time
3. convert elapsed time to V57 mood steps
4. cap total adjustment at 6
5. move mood toward 70
6. persist via existing `applyRootyStateDelta`

The checkpoint store serializes save/consume operations so a fast background -> foreground transition cannot race and leave a stale checkpoint.

## First V58 launch behavior

No V58 checkpoint exists yet.

Therefore V58 does NOT retroactively apply a possibly inaccurate catch-up from an old V57 `savedAt`.

After the first background transition, offline catch-up becomes armed.

## Preserved systems

- V54 `rooty_state_v1` key and serialized save queue are unchanged
- V55 state-based behavior probability policy is unchanged
- V56 energy changes are unchanged
- V57 active-time 10-minute mood drift is unchanged
- affection does not decay
- offline energy does not change
- native dependencies do not change

## Development traces

Catch-up trace:

`[ROOTY V58] offline catch-up`

State update trace when mood actually moves:

`[ROOTY STATE] updated`

with:

`reason: offline-mood`

## PC verification

- V58 Home marker exists
- V58 offline checkpoint store exists
- checkpoint key is `rooty_offline_checkpoint_v1`
- checkpoint save/consume is serialized
- maximum offline mood adjustment is 6
- cold-launch catch-up is connected
- AppState active resume catch-up is connected
- AppState inactive checkpoint save is connected
- existing V54/V55/V56/V57 systems remain
- TypeScript passes
- Git whitespace check passes
- only expected V58 files are staged
- local main and origin/main match after push

## Phone verification later

A practical test:

1. run app normally
2. put app in background
3. wait at least 10 minutes
4. reopen app
5. confirm `[ROOTY V58] offline catch-up`
6. if mood differs from 70, confirm `reason: offline-mood`
7. background and reopen immediately; confirm the previous interval is not applied twice

## Not included in V58

- offline energy drain/recovery
- affection decay
- time-of-day rules
- weather
- hunger
- multi-day large catch-up beyond 6 points
- retroactive catch-up before V58 was installed

Those belong in later versions.
