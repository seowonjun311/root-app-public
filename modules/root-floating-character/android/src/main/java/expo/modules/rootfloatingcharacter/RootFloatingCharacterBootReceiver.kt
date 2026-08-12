package expo.modules.rootfloatingcharacter

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// CHARACTER_V101M_BOOT_PACKAGE_RECEIVER
class RootFloatingCharacterBootReceiver :
  BroadcastReceiver() {
  override fun onReceive(
    context: Context,
    intent: Intent
  ) {
    val supportedAction =
      when (intent.action) {
        Intent.ACTION_BOOT_COMPLETED,
        Intent.ACTION_MY_PACKAGE_REPLACED ->
          true

        else ->
          false
      }

    if (!supportedAction) {
      return
    }

    if (
      !RootFloatingCharacterService
        .readUserEnabled(
          context
        )
    ) {
      return
    }

    try {
      // CHARACTER_V101M_SYSTEM_EVENT_RESTORE
      RootFloatingCharacterService
        .restoreAfterSystemEvent(
          context
        )
    }
    catch (_: RuntimeException) {
      // Best effort only. Android/OEM background-start policy may still
      // reject a restore attempt. Never crash the boot/package receiver.
    }
  }
}
