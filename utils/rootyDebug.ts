export type RootyDebugEvent =
  | 'action'
  | 'direction'
  | 'home-focus'
  | 'home-blur'
  | 'app-active'
  | 'app-inactive';

export type RootyDebugPayload =
  Record<
    string,
    unknown
  >;

/**
 * ROOTY_BEHAVIOR_V16_DEVELOPMENT_RUNTIME_TRACING
 *
 * Development-only Rooty tracing.
 * Production builds do not emit these logs.
 */
export function logRootyDebugEvent(
  event:
    RootyDebugEvent,
  payload:
    RootyDebugPayload = {}
) {
  if (!__DEV__) {
    return;
  }

  console.log(
    '[ROOTY DEBUG]',
    event,
    payload
  );
}
