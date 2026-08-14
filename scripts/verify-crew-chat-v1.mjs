// ROOT_CREW_CHAT_V1_STATIC_VERIFIER

import fs from 'node:fs';

const read =
  (
    path
  ) =>
    fs.readFileSync(
      path,
      'utf8'
    );

const requireTokens =
  (
    label,
    source,
    tokens
  ) => {
    for (
      const token of tokens
    ) {
      if (
        !source.includes(
          token
        )
      ) {
        throw new Error(
          `${label} missing token: ${token}`
        );
      }
    }
  };

const screen =
  read(
    'app/crew-chat.tsx'
  );
const detail =
  read(
    'app/crew-detail.tsx'
  );
const store =
  read(
    'store/rootCrewChat.ts'
  );
const activeRules =
  read(
    'firestore.rules'
  );
const candidateRules =
  read(
    'firebase/firestore-crew-chat-v1.rules'
  );
const rulesTest =
  read(
    'ops/root-place-rules-tests/crew-chat-v1.test.mjs'
  );

requireTokens(
  'chat screen',
  screen,
  [
    'ROOT_CREW_CHAT_V1_SCREEN',
    '크루 멤버 전용 대화예요',
    'ROOT_CREW_CHAT_MESSAGE_MAX_LENGTH',
    'subscribeRootCrewChatMessages',
    'deleteRootCrewChatMessage',
    'crew?.notice?.trim()',
    '읽지 않은 메시지',
  ]
);

requireTokens(
  'crew detail entry',
  detail,
  [
    "'/crew-chat' as any",
    'countUnreadRootCrewChatMessages',
    '새 메시지',
    '멤버들과 목표와 탐험 이야기를 나눠보세요',
  ]
);

requireTokens(
  'chat store',
  store,
  [
    "'crews'",
    "'messages'",
    'limit(100)',
    'validateText',
    'markRootCrewChatRead',
    'ROOT_CREW_CHAT_LAST_READ_PREFIX',
  ]
);

for (
  const [
    label,
    rules,
  ] of [
    [
      'active rules',
      activeRules,
    ],
    [
      'candidate rules',
      candidateRules,
    ],
  ]
) {
  requireTokens(
    label,
    rules,
    [
      'ROOT_CREW_CHAT_V1_ACTIVE_MEMBER_BOUNDARY',
      'match /crews/{crewId}/messages/{messageId}',
      'allow read: if isCrewMember(crewId)',
      'request.resource.data.authorId == request.auth.uid',
      'request.resource.data.text.size() <= 500',
      'allow update: if false',
      'resource.data.authorId == request.auth.uid',
      'isCrewOwner(crewId)',
    ]
  );
}

if (
  activeRules !==
  candidateRules
) {
  throw new Error(
    'Active and candidate Crew Chat V1 rules must be byte-identical.'
  );
}

requireTokens(
  'emulator test',
  rulesTest,
  [
    'active member can read crew message',
    'signed-in outsider cannot read crew message',
    'member cannot spoof another author',
    'former member loses message read access immediately',
  ]
);

console.log(
  'PASS - CREW CHAT V1 member-only text chat, notice, unread state and deletion'
);
