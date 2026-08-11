# Character V83 image-load diagnostics

## Purpose
- Distinguish registry resolution from direct PNG require.
- Display Image.resolveAssetSource output on-device.
- Display Image onLoad/onError status on-device.
- Display Image.getSize result on-device.
- Compare Rooty with Moru/Mongsil/Dami without changing original PNG bytes.

## Device test
1. Open `/character-preview`.
2. Tap `?대?吏 濡쒕뵫 吏꾨떒`.
3. Test 猷⑦떚, 紐⑤（, 紐쎌떎, ?ㅻ?.
4. Capture both A. Registry source and B. Direct PNG require.
5. Include `onLoad`, `getSize`, and `uri` in the screenshot.

## Safety
- No standard PNG file is rewritten.
- CharacterSprite production renderer is untouched by V83.
- Home behavior/runtime logic is untouched.
