// ROOT_EXPLORE_V12D1_SET_MODERATOR_CLAIM

import {
  applicationDefault,
  initializeApp,
} from 'firebase-admin/app';

import {
  getAuth,
} from 'firebase-admin/auth';

function parseArgs() {
  const args =
    process.argv.slice(2);

  const read =
    (name) => {
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
    };

  return {
    uid:
      read('--uid'),
    projectId:
      read('--project'),
    mode:
      args.includes(
        '--disable'
      )
        ? 'disable'
        : 'enable',
    confirm:
      read('--confirm'),
  };
}

const {
  uid,
  projectId,
  mode,
  confirm,
} = parseArgs();

if (
  !uid ||
  !projectId
) {
  console.error(
    'Usage: node set-moderator-claim.mjs --project <projectId> --uid <uid> [--disable] --confirm <projectId>:<uid>'
  );
  process.exit(2);
}

const expectedConfirm =
  `${projectId}:${uid}`;

if (
  confirm !==
  expectedConfirm
) {
  console.error(
    'Safety confirmation mismatch.'
  );
  console.error(
    `Re-run with: --confirm ${expectedConfirm}`
  );
  process.exit(3);
}

if (
  !process.env
    .GOOGLE_APPLICATION_CREDENTIALS
) {
  console.warn(
    'WARN - GOOGLE_APPLICATION_CREDENTIALS is not set.'
  );
  console.warn(
    'Application Default Credentials may still work in a Google-managed environment, but local Windows use should normally point this variable at a service-account JSON file.'
  );
}

initializeApp({
  credential:
    applicationDefault(),
  projectId,
});

const auth =
  getAuth();

const before =
  await auth.getUser(
    uid
  );

const previousClaims = {
  ...(
    before.customClaims ??
    {}
  ),
};

const nextClaims = {
  ...previousClaims,
};

if (
  mode ===
  'enable'
) {
  nextClaims.rootModerator =
    true;
} else {
  delete nextClaims.rootModerator;
}

await auth.setCustomUserClaims(
  uid,
  nextClaims
);

const after =
  await auth.getUser(
    uid
  );

console.log(
  'PASS - Firebase custom claims updated'
);

console.log(
  JSON.stringify(
    {
      projectId,
      uid:
        after.uid,
      email:
        after.email ??
        null,
      mode,
      beforeRootModerator:
        previousClaims
          .rootModerator ===
        true,
      afterRootModerator:
        after.customClaims
          ?.rootModerator ===
        true,
      preservedClaimKeys:
        Object.keys(
          previousClaims
        )
          .filter(
            (
              key
            ) =>
              key !==
              'rootModerator'
          )
          .sort(),
    },
    null,
    2
  )
);

console.log(
  'NEXT - The user must refresh their Firebase ID token or sign out/in before the app sees the new claim.'
);
