import {
  type CharacterId,
} from '../constants/characterAssets';

// CHARACTER_V99B_HOME_MICROFEEDBACK_BUS
export type CharacterHomeFeedbackEvent = {
  id: number;
  characterId:
    CharacterId;
  xpDelta: number;
  relationshipDelta:
    number;
  source:
    'growth' |
    'relationship';
  at: number;
};

type Listener =
  (
    event:
      CharacterHomeFeedbackEvent
  ) => void;

const listeners =
  new Set<Listener>();

let sequence =
  0;

function normalizeDelta(
  value: number
): number {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      value
    )
  );
}

// CHARACTER_V99B_EMIT_CONFIRMED_FEEDBACK
export function emitCharacterHomeInteractionFeedback(
  input: {
    characterId:
      CharacterId;
    xpDelta?: number;
    relationshipDelta?:
      number;
    source:
      CharacterHomeFeedbackEvent[
        'source'
      ];
  }
): void {
  const xpDelta =
    normalizeDelta(
      input.xpDelta ??
        0
    );

  const relationshipDelta =
    normalizeDelta(
      input.relationshipDelta ??
        0
    );

  if (
    xpDelta <= 0 &&
    relationshipDelta <= 0
  ) {
    return;
  }

  sequence +=
    1;

  const event:
    CharacterHomeFeedbackEvent = {
    id: sequence,
    characterId:
      input.characterId,
    xpDelta,
    relationshipDelta,
    source:
      input.source,
    at:
      Date.now(),
  };

  listeners.forEach(
    (
      listener
    ) => {
      listener(
        event
      );
    }
  );
}

export function subscribeCharacterHomeInteractionFeedback(
  listener: Listener
): () => void {
  listeners.add(
    listener
  );

  return () => {
    listeners.delete(
      listener
    );
  };
}
