import AsyncStorage from '@react-native-async-storage/async-storage';

// ROOTY_BEHAVIOR_V58_OFFLINE_CHECKPOINT_STORE
export const ROOTY_OFFLINE_CHECKPOINT_KEY =
  'rooty_offline_checkpoint_v1';

let rootyOfflineCheckpointQueue:
  Promise<unknown> =
    Promise.resolve();

function enqueueRootyOfflineCheckpointTask<T>(
  task: () => Promise<T>
): Promise<T> {
  const next =
    rootyOfflineCheckpointQueue
      .catch(
        () => undefined
      )
      .then(task);

  rootyOfflineCheckpointQueue =
    next.then(
      () => undefined,
      () => undefined
    );

  return next;
}

export function saveRootyOfflineCheckpoint(
  timestamp = Date.now()
): Promise<void> {
  const safeTimestamp =
    Number.isFinite(timestamp) &&
    timestamp > 0
      ? Math.round(timestamp)
      : Date.now();

  return enqueueRootyOfflineCheckpointTask(
    async () => {
      try {
        await AsyncStorage.setItem(
          ROOTY_OFFLINE_CHECKPOINT_KEY,
          String(
            safeTimestamp
          )
        );
      } catch (error) {
        console.log(
          'ROOTY OFFLINE CHECKPOINT SAVE ERROR',
          error
        );
      }
    }
  );
}

/**
 * Reads and removes the checkpoint in one serialized task.
 * This prevents one offline interval from being applied twice.
 */
export function consumeRootyOfflineCheckpoint():
  Promise<number | null> {
  return enqueueRootyOfflineCheckpointTask(
    async () => {
      try {
        const raw =
          await AsyncStorage.getItem(
            ROOTY_OFFLINE_CHECKPOINT_KEY
          );

        if (!raw) {
          return null;
        }

        await AsyncStorage.removeItem(
          ROOTY_OFFLINE_CHECKPOINT_KEY
        );

        const timestamp =
          Number(raw);

        if (
          !Number.isFinite(
            timestamp
          ) ||
          timestamp <= 0
        ) {
          return null;
        }

        return timestamp;
      } catch (error) {
        console.log(
          'ROOTY OFFLINE CHECKPOINT CONSUME ERROR',
          error
        );

        return null;
      }
    }
  );
}
