# Character V92A v2 - Tori 22-frame exception asset import

## Decision
Tori intentionally proceeds with 22 runtime frames.
No duplicate or fabricated `happy_02` image is created.

## Runtime contract
- idle: 4
- walk: 4
- sit: 4
- sleep: 5
- happy: 3
- touch: 2
- runtime total: 22
- reference sheet: 1

## Happy sequence
The three existing happy sources are normalized to contiguous runtime names:
- `tori_happy_01.png`
- `tori_happy_02.png`
- `tori_happy_03.png`

There is no `tori_happy_04.png` in the Tori 22-frame contract.

## Validator
V89 remains strict standard-23 for every other standard character.
V92A adds one explicit Tori-only exception so full asset verification still passes.

## Safety
- Downloads\tori originals remain untouched.
- V85 renderer is untouched.
- V86 roaming is untouched.
- V55-V66 behavior policy is untouched.
- Tori is not registered in CharacterId yet.
- V92B will register Tori with a 3-frame happy action.
