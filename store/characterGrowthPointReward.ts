import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import {
  getRootOnboardingData,
  saveRootOnboardingData,
} from './rootMemory';
import {
  type CharacterId,
} from '../constants/characterAssets';
import {
  type CharacterGrowthLevel,
} from '../constants/characterProgression';

import {
  getRootCloudUidOrNull,
} from './rootCloudSession';

// ROOT_EXPLORE_V12D91A_CHARACTER_GROWTH_EFFECTIVE_FIREBASE_USER_BOUNDARY
function getRootEffectiveCharacterGrowthFirebaseUser() {
  const cloudUid =
    getRootCloudUidOrNull();

  if (!cloudUid) {
    return null;
  }

  const firebaseUser =
    auth().currentUser;

  if (
    !firebaseUser?.uid ||
    firebaseUser.uid !==
      cloudUid
  ) {
    return null;
  }

  return firebaseUser;
}

const REWARD_LEDGER_FIELD =
  'characterGrowthRewardGrantIds';

const REWARD_UPDATED_AT_FIELD =
  'characterGrowthRewardUpdatedAt';

export type CharacterGrowthPointRewardGrant = {
  grantId: string;
  characterId:
    CharacterId;
  level:
    CharacterGrowthLevel;
  pointReward: number;
  newlyGranted: boolean;
  rootPointAdjustment: number;
  rootData: any;
};

type RootDataListener =
  (
    rootData: any
  ) => void;

const listeners =
  new Set<
    RootDataListener
  >();

let grantQueue:
  Promise<void> =
  Promise.resolve();

function emit(
  rootData: any
): void {
  listeners.forEach(
    (listener) => {
      listener(
        rootData
      );
    }
  );
}

export function subscribeCharacterGrowthPointRewardRootData(
  listener:
    RootDataListener
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

function normalizePointAdjustment(
  value: unknown
): number {
  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function normalizeGrantIds(
  value: unknown
): string[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
              'string' &&
            item.length >
              0
        )
    )
  );
}

function getGrantId(
  characterId:
    CharacterId,
  level:
    CharacterGrowthLevel
): string {
  return (
    'character-growth:' +
    characterId +
    ':lv' +
    level
  );
}

async function saveLocalRootData(
  rootData: any
): Promise<void> {
  await saveRootOnboardingData(
    rootData
  );

  emit(
    rootData
  );
}

// CHARACTER_V97D_IDEMPOTENT_ROOT_POINT_GRANT
async function grantInternal(
  characterId:
    CharacterId,
  level:
    CharacterGrowthLevel,
  pointReward: number
): Promise<
  CharacterGrowthPointRewardGrant
> {
  if (
    level <= 1 ||
    !Number.isFinite(
      pointReward
    ) ||
    pointReward <= 0
  ) {
    throw new Error(
      'CHARACTER_GROWTH_REWARD_INVALID'
    );
  }

  const currentRoot =
    getRootOnboardingData();

  if (
    !currentRoot ||
    typeof currentRoot !==
      'object'
  ) {
    throw new Error(
      'CHARACTER_GROWTH_REWARD_ROOT_DATA_NOT_READY'
    );
  }

  const grantId =
    getGrantId(
      characterId,
      level
    );

  const localIds =
    normalizeGrantIds(
      currentRoot[
        REWARD_LEDGER_FIELD
      ]
    );

  const currentUser =
    getRootEffectiveCharacterGrowthFirebaseUser();

  // Guest users use the same rootData.testPoints adjustment as Home shop
  // purchase/refund logic, with a persistent local idempotency ledger.
  if (
    !currentUser?.uid
  ) {
    const alreadyGranted =
      localIds.includes(
        grantId
      );

    const rootPointAdjustment =
      normalizePointAdjustment(
        currentRoot
          ?.testPoints
      ) +
      (
        alreadyGranted
          ? 0
          : Math.floor(
              pointReward
            )
      );

    const nextIds =
      alreadyGranted
        ? localIds
        : [
            ...localIds,
            grantId,
          ];

    const nextRoot = {
      ...currentRoot,
      testPoints:
        rootPointAdjustment,
      [REWARD_LEDGER_FIELD]:
        nextIds,
      [REWARD_UPDATED_AT_FIELD]:
        new Date()
          .toISOString(),
    };

    await saveLocalRootData(
      nextRoot
    );

    return {
      grantId,
      characterId,
      level,
      pointReward:
        Math.floor(
          pointReward
        ),
      newlyGranted:
        !alreadyGranted,
      rootPointAdjustment,
      rootData:
        nextRoot,
    };
  }

  // CHARACTER_V97D_SERVER_TRANSACTION_LEDGER
  // Logged-in users use Firestore transaction state as the authoritative
  // cross-device idempotency decision. Local rootData is synchronized only
  // after the transaction succeeds.
  const userReference =
    firestore()
      .collection(
        'users'
      )
      .doc(
        currentUser.uid
      );

  let finalAdjustment =
    normalizePointAdjustment(
      currentRoot
        ?.testPoints
    );

  let finalIds =
    localIds;

  let newlyGranted =
    false;

  await firestore()
    .runTransaction(
      async (
        transaction
      ) => {
        const snapshot =
          await transaction.get(
            userReference
          );

        const exists =
          typeof snapshot
            ?.exists ===
            'function'
            ? snapshot.exists()
            : Boolean(
                snapshot
                  ?.exists
              );

        const userData =
          exists
            ? (
                snapshot.data() ??
                {}
              )
            : {};

        const serverRoot =
          userData
            ?.rootData &&
          typeof userData
            .rootData ===
            'object'
            ? userData
                .rootData
            : {};

        const serverIds =
          normalizeGrantIds(
            serverRoot[
              REWARD_LEDGER_FIELD
            ]
          );

        const alreadyGranted =
          serverIds.includes(
            grantId
          );

        const baseAdjustment =
          normalizePointAdjustment(
            serverRoot
              ?.testPoints ??
            currentRoot
              ?.testPoints
          );

        finalAdjustment =
          baseAdjustment +
          (
            alreadyGranted
              ? 0
              : Math.floor(
                  pointReward
                )
          );

        newlyGranted =
          !alreadyGranted;

        finalIds =
          Array.from(
            new Set([
              ...serverIds,
              grantId,
            ])
          );

        const updatedAt =
          new Date()
            .toISOString();

        if (
          exists
        ) {
          transaction.update(
            userReference,
            {
              'rootData.testPoints':
                finalAdjustment,
              'rootData.characterGrowthRewardGrantIds':
                finalIds,
              'rootData.characterGrowthRewardUpdatedAt':
                updatedAt,
              updatedAt,
            }
          );

          return;
        }

        transaction.set(
          userReference,
          {
            rootData: {
              ...currentRoot,
              testPoints:
                finalAdjustment,
              [REWARD_LEDGER_FIELD]:
                finalIds,
              [REWARD_UPDATED_AT_FIELD]:
                updatedAt,
            },
            updatedAt,
          },
          {
            merge: true,
          }
        );
      }
    );

  const nextRoot = {
    ...currentRoot,
    uid:
      currentUser.uid,
    testPoints:
      finalAdjustment,
    [REWARD_LEDGER_FIELD]:
      finalIds,
    [REWARD_UPDATED_AT_FIELD]:
      new Date()
        .toISOString(),
  };

  await saveLocalRootData(
    nextRoot
  );

  return {
    grantId,
    characterId,
    level,
    pointReward:
      Math.floor(
        pointReward
      ),
    newlyGranted,
    rootPointAdjustment:
      finalAdjustment,
    rootData:
      nextRoot,
  };
}

// CHARACTER_V97D_SERIALIZED_POINT_REWARD_QUEUE
export function grantCharacterGrowthMilestoneRootPoints(
  characterId:
    CharacterId,
  level:
    CharacterGrowthLevel,
  pointReward: number
): Promise<
  CharacterGrowthPointRewardGrant
> {
  const task =
    grantQueue
      .then(
        () =>
          grantInternal(
            characterId,
            level,
            pointReward
          )
      );

  grantQueue =
    task
      .then(
        () => undefined,
        () => undefined
      );

  return task;
}
