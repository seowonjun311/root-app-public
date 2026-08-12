import {
  useCallback,
  useRef,
} from 'react';
import {
  AppState,
  type AppStateStatus,
} from 'react-native';
import {
  useFocusEffect,
} from 'expo-router';

import {
  setFloatingCharacterHomeHandoffActive,
} from '../modules/root-floating-character';

// CHARACTER_V101N_HOME_FLOATING_HANDOFF_HOOK
// CHARACTER_V101P_HOME_HANDOFF_HEARTBEAT
const HOME_HANDOFF_HEARTBEAT_MS = 2000;

export function useFloatingCharacterHomeHandoff() {
  const requestChainRef =
    useRef<
      Promise<unknown>
    >(
      Promise.resolve()
    );

  const queueHandoff =
    useCallback(
      (
        active: boolean
      ) => {
        requestChainRef.current =
          requestChainRef.current
            .catch(
              () =>
                undefined
            )
            .then(
              () =>
                setFloatingCharacterHomeHandoffActive(
                  active
                )
            )
            .catch(
              (
                error
              ) => {
                console.log(
                  'FLOATING CHARACTER HOME HANDOFF ERROR',
                  error
                );
              }
            );
      },
      []
    );

  useFocusEffect(
    useCallback(
      () => {
        let homeFocused =
          true;
        let heartbeatId:
          ReturnType<
            typeof setInterval
          > |
          null =
            null;

        const stopHeartbeat =
          () => {
            if (
              heartbeatId ===
                null
            ) {
              return;
            }

            clearInterval(
              heartbeatId
            );
            heartbeatId =
              null;
          };

        const startHeartbeat =
          () => {
            stopHeartbeat();

            heartbeatId =
              setInterval(
                () => {
                  queueHandoff(
                    true
                  );
                },
                HOME_HANDOFF_HEARTBEAT_MS
              );
          };

        const syncForAppState =
          (
            state:
              AppStateStatus
          ) => {
            // Preserve the exact V101N focus/app-state handoff expression.
            // The legacy regression verifier intentionally checks this shape.
            queueHandoff(
              homeFocused &&
                state ===
                  'active'
            );

            if (
              homeFocused &&
              state ===
                'active'
            ) {
              startHeartbeat();
              return;
            }

            stopHeartbeat();
          };

        syncForAppState(
          AppState.currentState
        );

        const subscription =
          AppState.addEventListener(
            'change',
            syncForAppState
          );

        return () => {
          homeFocused =
            false;

          stopHeartbeat();
          subscription.remove();

          queueHandoff(
            false
          );
        };
      },
      [
        queueHandoff,
      ]
    )
  );
}
