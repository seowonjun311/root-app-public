# CREW CHAT V1.1

CREW CHAT V1.1 extends the member-only V1 text channel without weakening its
active-member boundary.

## User features

- Long-press a message to reply with an immutable 120-character preview.
- Add or remove one of five reactions: 👍 ❤️ 🔥 👏 😂.
- Report another member's message once with a fixed reason.
- Attach one JPG, PNG, or WEBP image up to 10 MB. Text is optional when an
  image is attached.
- The message author or crew owner can delete a message and its photo.

## Data model

- `crews/{crewId}/messages/{messageId}` uses version 2 for new messages and
  retains version 1 create compatibility for already-installed clients.
- `crews/{crewId}/messageReactions/{messageId}_{uid}` stores one reaction per
  member and message.
- `crews/{crewId}/messageReports/{messageId}_{uid}` stores one immutable
  pending report per reporter and message.
- `crew-chat/{crewId}/{uid}/{messageId}/photo.{jpg|png|webp}` stores the
  attachment.

## Security boundary

- Only current crew members can read messages, reactions, reports they own or
  manage as crew owner, and crew photos.
- Only the authenticated author can create a message, reaction, report, or
  upload into their UID path.
- Former members lose Firestore and Storage read access immediately.
- Message updates remain blocked. Reaction updates can only change the emoji
  and timestamp. Reports cannot be updated or deleted by clients.
- V1 text-only message creation remains allowed during client rollout.

## Verification

Run the V1.1 verifier, TypeScript, Firestore + Storage emulator suite, both
Rules dry runs, exact post-deploy exports, and the reviewed changed-file
boundary before committing.
