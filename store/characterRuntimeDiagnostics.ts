import {
  useEffect,
  useState,
} from 'react';

import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  type CharacterRestWeights,
  type CharacterSocialChanceChannel,
} from './characterPersonalityPolicy';

export type CharacterRuntimeDiagnosticsSnapshot = {
  characterId: CharacterId;
  personalityRest:
    CharacterRestWeights | null;
  finalRest:
    CharacterRestWeights | null;
  selectedRestBehavior:
    string | null;
  socialChance: Partial<
    Record<
      CharacterSocialChanceChannel,
      number
    >
  >;
  updatedAt: number | null;
};

type Listener =
  (
    snapshot:
      CharacterRuntimeDiagnosticsSnapshot
  ) => void;

const listeners =
  new Set<Listener>();

let snapshot:
  CharacterRuntimeDiagnosticsSnapshot = {
  characterId: 'rooty',
  personalityRest: null,
  finalRest: null,
  selectedRestBehavior: null,
  socialChance: {},
  updatedAt: null,
};

function emit() {
  const next = {
    ...snapshot,
    personalityRest:
      snapshot.personalityRest
        ? {
            ...snapshot.personalityRest,
          }
        : null,
    finalRest:
      snapshot.finalRest
        ? {
            ...snapshot.finalRest,
          }
        : null,
    socialChance: {
      ...snapshot.socialChance,
    },
  };

  listeners.forEach(
    (listener) => {
      listener(
        next
      );
    }
  );
}

// CHARACTER_V77_RUNTIME_DIAGNOSTICS_STORE
export function recordCharacterPersonalityRestInput(
  characterId: CharacterId,
  weights: CharacterRestWeights
): void {
  snapshot = {
    ...snapshot,
    characterId,
    personalityRest: {
      ...weights,
    },
    updatedAt:
      Date.now(),
  };

  emit();
}

export function recordCharacterFinalRestDecision(
  characterId: CharacterId,
  weights: CharacterRestWeights,
  behavior: string
): void {
  snapshot = {
    ...snapshot,
    characterId,
    finalRest: {
      ...weights,
    },
    selectedRestBehavior:
      behavior,
    updatedAt:
      Date.now(),
  };

  emit();
}

export function recordCharacterSocialChance(
  characterId: CharacterId,
  channel:
    CharacterSocialChanceChannel,
  chance: number
): void {
  snapshot = {
    ...snapshot,
    characterId,
    socialChance: {
      ...snapshot.socialChance,
      [channel]:
        chance,
    },
    updatedAt:
      Date.now(),
  };

  emit();
}

export function getCharacterRuntimeDiagnosticsSnapshot():
  CharacterRuntimeDiagnosticsSnapshot {
  return {
    ...snapshot,
    personalityRest:
      snapshot.personalityRest
        ? {
            ...snapshot.personalityRest,
          }
        : null,
    finalRest:
      snapshot.finalRest
        ? {
            ...snapshot.finalRest,
          }
        : null,
    socialChance: {
      ...snapshot.socialChance,
    },
  };
}

export function subscribeCharacterRuntimeDiagnostics(
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

export function useCharacterRuntimeDiagnostics() {
  const [
    current,
    setCurrent,
  ] =
    useState(
      () =>
        getCharacterRuntimeDiagnosticsSnapshot()
    );

  useEffect(
    () =>
      subscribeCharacterRuntimeDiagnostics(
        setCurrent
      ),
    []
  );

  return current;
}
