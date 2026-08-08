# ROOTY Behavior V20 runtime continuity tuning checklist

## Goal

Move Rooty's relaunch/resume timing values into one dedicated runtime continuity configuration file.

## New source of truth

constants/rootyRuntimeConfig.ts

ROOTY_RUNTIME_CONTINUITY controls:

- short relaunch window
- medium relaunch window
- sleep resume delay
- sit resume delay
- idle resume delay
- fallback resume delay

## Preserved values

- short window: 15 seconds
- medium window: 10 minutes
- sleep resume delay: 8 seconds
- sit resume delay: 3.5 seconds
- idle resume delay: 1.6 seconds
- fallback resume delay: 0.8 seconds

V20 changes structure only.
It does not intentionally change Rooty's behavior.

## Existing responsibilities stay separate

constants/rootyMotion.ts:
- physical movement and visual walk rhythm

constants/rootyBehavior.ts:
- natural routine personality and timing

constants/rootyRuntimeConfig.ts:
- app relaunch / saved-state resume timing

store/rootyRuntime.ts:
- validation, persistence, resume decision logic

## Compatibility

- V19 natural behavior tuning remains.
- V18 active-Home checkpoints remain.
- V17 serialized persistence remains.
- V16 tracing remains.
- V15 atomic state/ref sync remains.
- no native dependencies change

## PC checks

- V20 marker exists.
- runtime config import exists.
- short and medium resume windows use the config.
- all resume delays use the config.
- all old numeric values are preserved.
- V17 serialized persistence remains.
- runtime storage key remains unchanged.
- TypeScript passes.
- Git whitespace check passes.

## Phone checks later

No visible difference is expected.

When real-device testing begins, relaunch timing can be tuned from constants/rootyRuntimeConfig.ts without editing persistence logic.
