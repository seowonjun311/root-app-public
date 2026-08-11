# Character V84 Android frame fade fix

## Finding from V83
- Rooty, Moru, Mongsil and Dami resolve correctly.
- Registry source and direct PNG require both load successfully.
- Standard PNG dimensions resolve as 1024x1536.
- The remaining Home symptom is frame-transition flicker / excessive invisible time.

## V84 change
- Add `fadeDuration={0}` only to the `standard-23` Image renderer.
- Keep the legacy Rooty renderer unchanged.
- Keep V82 standard canvas normalization unchanged.
- Do not rewrite any character PNG.

## Device validation
1. Reload the Android app.
2. Select Mongsil on Home.
3. Observe idle for at least 10 seconds.
4. Trigger/observe walk, sit, sleep, happy and touch.
5. Confirm frames switch without long transparent fade intervals.
6. Repeat briefly with Moru and Dami.
7. Confirm Rooty behavior is unchanged.

## Escalation
If a visible blank gap remains after V84, the next step is decoded-frame retention:
mount each action frame as a stable Image layer and switch only opacity, instead of replacing the Image source.
