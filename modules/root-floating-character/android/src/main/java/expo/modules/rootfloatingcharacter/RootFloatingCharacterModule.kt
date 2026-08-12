package expo.modules.rootfloatingcharacter

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// CHARACTER_V101A_ANDROID_OVERLAY_NATIVE_BRIDGE
class RootFloatingCharacterModule : Module() {
  override fun definition() =
    ModuleDefinition {
      Name(
        "RootFloatingCharacter"
      )

      AsyncFunction(
        "canDrawOverlays"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        if (
          Build.VERSION.SDK_INT <
          Build.VERSION_CODES.M
        ) {
          return@AsyncFunction true
        }

        Settings.canDrawOverlays(
          context
        )
      }

      AsyncFunction(
        "openOverlayPermissionSettings"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction

        if (
          Build.VERSION.SDK_INT <
          Build.VERSION_CODES.M
        ) {
          return@AsyncFunction
        }

        val intent =
          Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse(
              "package:${context.packageName}"
            )
          ).apply {
            addFlags(
              Intent.FLAG_ACTIVITY_NEW_TASK
            )
          }

        context.startActivity(
          intent
        )
      }

      AsyncFunction(
        "getStatus"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction mapOf(
              "supported" to false,
              "permissionGranted" to false,
              "running" to false,
              "characterId" to null
            )

        val permissionGranted =
          if (
            Build.VERSION.SDK_INT <
            Build.VERSION_CODES.M
          ) {
            true
          }
          else {
            Settings.canDrawOverlays(
              context
            )
          }

        mapOf(
          "supported" to true,
          "permissionGranted" to permissionGranted,
          "running" to
            RootFloatingCharacterService
              .isRunning,
          "characterId" to
            RootFloatingCharacterService
              .readSelectedCharacter(
                context
              )
        )
      }

      AsyncFunction(
        "start"
      ) {
        characterId:
          String ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        val permissionGranted =
          if (
            Build.VERSION.SDK_INT <
            Build.VERSION_CODES.M
          ) {
            true
          }
          else {
            Settings.canDrawOverlays(
              context
            )
          }

        if (
          !permissionGranted
        ) {
          return@AsyncFunction false
        }

        RootFloatingCharacterService.start(
          context,
          characterId
        )

        true
      }

      AsyncFunction(
        "stop"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction

        RootFloatingCharacterService.stop(
          context
        )
      }

      AsyncFunction(
        "updateCharacter"
      ) {
        characterId:
          String ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction

        RootFloatingCharacterService
          .updateCharacter(
            context,
            characterId
          )
      }
    }
}
