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

        const syncForAppState =
          (
            state:
              AppStateStatus
          ) => {
            queueHandoff(
              homeFocused &&
                state ===
                  'active'
            );
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
