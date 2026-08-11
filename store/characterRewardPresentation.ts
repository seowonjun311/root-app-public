import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  type CharacterGrowthLevel,
} from '../constants/characterProgression';

// CHARACTER_V99A_REWARD_PRESENTATION_QUEUE
export type CharacterRewardPresentationAction =
  | 'dismiss'
  | 'select';

export type CharacterAcquisitionPresentationEvent = {
  id: string;
  type: 'acquisition';
  characterId: CharacterId;
  sourceText: string;
};

export type CharacterGrowthPresentationEvent = {
  id: string;
  type: 'growth';
  characterId: CharacterId;
  beforeLevel: CharacterGrowthLevel;
  level: CharacterGrowthLevel;
  rewardPoints: number;
};

export type CharacterRewardPresentationEvent =
  | CharacterAcquisitionPresentationEvent
  | CharacterGrowthPresentationEvent;

type QueueItem = {
  event:
    CharacterRewardPresentationEvent;
  resolve:
    (
      action:
        CharacterRewardPresentationAction
    ) => void;
};

type Listener =
  () => void;

const listeners =
  new Set<Listener>();

const hosts:
  string[] =
  [];

const queue:
  QueueItem[] =
  [];

let active:
  QueueItem | null =
  null;

let sequence =
  0;

const GROWTH_REWARD_POINTS:
  Partial<
    Record<
      CharacterGrowthLevel,
      number
    >
  > = {
  2: 5,
  3: 10,
  4: 15,
  5: 25,
};

function emit(): void {
  listeners.forEach(
    (
      listener
    ) => {
      listener();
    }
  );
}

function nextId(
  prefix: string
): string {
  sequence +=
    1;

  return (
    prefix +
    ':' +
    Date.now() +
    ':' +
    sequence
  );
}

function currentHostId():
  string | null {
  return hosts.length >
    0
    ? hosts[
        hosts.length - 1
      ]
    : null;
}

function pump(): void {
  if (
    active !==
      null ||
    hosts.length ===
      0 ||
    queue.length ===
      0
  ) {
    return;
  }

  active =
    queue.shift() ??
    null;

  emit();
}

// CHARACTER_V99A_PRESENTATION_HOST_REGISTRY
export function registerCharacterRewardPresentationHost(
  hostId: string
): () => void {
  const existingIndex =
    hosts.indexOf(
      hostId
    );

  if (
    existingIndex >=
    0
  ) {
    hosts.splice(
      existingIndex,
      1
    );
  }

  hosts.push(
    hostId
  );

  emit();
  pump();

  return () => {
    const index =
      hosts.lastIndexOf(
        hostId
      );

    if (
      index >=
      0
    ) {
      hosts.splice(
        index,
        1
      );

      emit();
    }
  };
}

export function hasCharacterRewardPresentationConsumer():
  boolean {
  return hosts.length >
    0;
}

export function subscribeCharacterRewardPresentation(
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

export function getCharacterRewardPresentationSnapshot(
  hostId: string
): CharacterRewardPresentationEvent | null {
  if (
    currentHostId() !==
      hostId
  ) {
    return null;
  }

  return active
    ?.event ??
    null;
}

function enqueue(
  event:
    CharacterRewardPresentationEvent
): Promise<CharacterRewardPresentationAction> {
  return new Promise(
    (
      resolve
    ) => {
      queue.push({
        event,
        resolve,
      });

      pump();
    }
  );
}

// CHARACTER_V99A_ACQUISITION_PRESENTATION
export function presentCharacterAcquisitionReward(
  input: {
    characterId:
      CharacterId;
    sourceText:
      string;
  }
): Promise<CharacterRewardPresentationAction> {
  return enqueue({
    id:
      nextId(
        'acquisition'
      ),
    type:
      'acquisition',
    characterId:
      input.characterId,
    sourceText:
      input.sourceText,
  });
}

// CHARACTER_V99A_GROWTH_LEVEL_PRESENTATION
export function enqueueCharacterGrowthLevelPresentations(
  input: {
    characterId:
      CharacterId;
    beforeLevel:
      CharacterGrowthLevel;
    newlyReachedLevels:
      readonly CharacterGrowthLevel[];
  }
): void {
  if (
    hosts.length ===
    0 ||
    input
      .newlyReachedLevels
      .length ===
      0
  ) {
    return;
  }

  let previousLevel =
    input.beforeLevel;

  for (
    const level of
    input.newlyReachedLevels
  ) {
    void enqueue({
      id:
        nextId(
          'growth'
        ),
      type:
        'growth',
      characterId:
        input.characterId,
      beforeLevel:
        previousLevel,
      level,
      rewardPoints:
        GROWTH_REWARD_POINTS[
          level
        ] ??
        0,
    });

    previousLevel =
      level;
  }
}

// CHARACTER_V99A_SERIALIZED_PRESENTATION_COMPLETION
export function completeCharacterRewardPresentation(
  action:
    CharacterRewardPresentationAction
): void {
  if (
    active ===
    null
  ) {
    return;
  }

  const completed =
    active;

  active =
    null;

  completed.resolve(
    action
  );

  emit();

  queueMicrotask(
    () => {
      pump();
    }
  );
}
