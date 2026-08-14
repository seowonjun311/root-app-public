# CREW CHAT V1

## Scope

- One member-only text chat room per ROOT crew.
- Existing crew notice is pinned at the top of the chat.
- Messages are limited to 500 normalized characters.
- The latest 100 messages are streamed in real time.
- Last-read time is stored per signed-in account and crew on the device.
- A member can delete their own message; the crew owner can delete any crew message.
- Guest, unauthenticated, outsider and former-member access is rejected by Firestore Rules.

## Firestore contract

Messages are stored at:

```text
crews/{crewId}/messages/{messageId}
```

Every message contains `version`, `crewId`, `authorId`, display snapshot fields,
normalized text, immutable creation/update timestamps and an active status.

The client membership check only controls presentation. The production security
boundary reads the parent crew and requires `request.auth.uid` to exist in its
current `memberIds` array for every message read or write.

## Deliberately deferred

- Photo attachments and media moderation.
- Replies and emoji reactions.
- Message reports and user blocking.
- Push notifications.
- Mission completion and ROOT place-card sharing.
- Server-enforced rate limits and automated safety checks.

These belong to CREW CHAT V1.1 and later so V1.0 can validate the membership and
real-time text foundation first.

## Verification

```powershell
node .\scripts\verify-crew-chat-v1.mjs
npx tsc --noEmit
npx firebase-tools emulators:exec `
  --only firestore `
  --project demo-root-crew-chat-v1 `
  "node .\ops\root-place-rules-tests\crew-chat-v1.test.mjs"
```

Before production deployment, compile both the new candidate and the exact V1.2
rollback Rules file. Export the live rules before and after deployment and compare
their SHA-256 hashes with the reviewed sources.
