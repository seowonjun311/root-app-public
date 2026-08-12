import fs from 'node:fs';

const servicePath =
  'modules/root-floating-character/android/src/main/java/expo/modules/rootfloatingcharacter/RootFloatingCharacterService.kt';

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

if (!fs.existsSync(servicePath)) {
  fail(`missing ${servicePath}`);
}

const service =
  fs
    .readFileSync(servicePath, 'utf8')
    .replace(/\r\n/g, '\n');

const invalidPatterns = [
  /\$pending([가-힣]+)/g,
  /\$\{pending([가-힣]+)\}/g,
  /\$completed([가-힣]+)/g,
  /\$\{completed([가-힣]+)\}/g,
];

let malformed = 0;

for (const pattern of invalidPatterns) {
  malformed +=
    [...service.matchAll(pattern)].length;
}

if (malformed !== 0) {
  fail(`malformed pending/completed Korean-suffix interpolation remains: ${malformed}`);
}

const fixedPending =
  [...service.matchAll(/\$\{pending\}[가-힣]+/g)].length;

const fixedCompleted =
  [...service.matchAll(/\$\{completed\}[가-힣]+/g)].length;

if (fixedPending + fixedCompleted < 15) {
  fail(
    `expected at least 15 corrected pending/completed Korean-suffix interpolations, found ${
      fixedPending + fixedCompleted
    }`
  );
}

console.log(
  'PASS - malformed pending/completed Korean-suffix Kotlin interpolation count is zero'
);
console.log(
  `PASS - corrected forms found: pending=${fixedPending}, completed=${fixedCompleted}`
);
console.log(
  'PASS - V101Q1 verifier scope is interpolation-only; V101P preservation is checked by the existing V101P verifier'
);
console.log(
  'PASS - CHARACTER V101Q1 KOTLIN INTERPOLATION BUILD FIX'
);
