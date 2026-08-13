// ROOT_EXPLORE_V12D1_VERIFY_MODERATOR_CLAIM

import {
  applicationDefault,
  initializeApp,
} from 'firebase-admin/app';

import {
  getAuth,
} from 'firebase-admin/auth';

const args =
  process.argv.slice(2);

function read(
  name
) {
  const index =
    args.indexOf(
      name
    );

  if (
    index < 0 ||
    index + 1 >=
      args.length
  ) {
    return '';
  }

  return String(
    args[index + 1] ??
      ''
  ).trim();
}

const projectId =
  read('--project');

const uid =
  read('--uid');

if (
  !projectId ||
  !uid
) {
  console.error(
    'Usage: node verify-moderator-claim.mjs --project <projectId> --uid <uid>'
  );
  process.exit(2);
}

initializeApp({
  credential:
    applicationDefault(),
  projectId,
});

const user =
  await getAuth()
    .getUser(
      uid
    );

console.log(
  JSON.stringify(
    {
      projectId,
      uid:
        user.uid,
      email:
        user.email ??
        null,
      rootModerator:
        user.customClaims
          ?.rootModerator ===
        true,
      moderator:
        user.customClaims
          ?.moderator ===
        true,
      admin:
        user.customClaims
          ?.admin ===
        true,
      customClaimKeys:
        Object.keys(
          user.customClaims ??
            {}
        ).sort(),
    },
    null,
    2
  )
);
