package expo.modules.rootfloatingcharacter

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// CHARACTER_V101A_ANDROID_OVERLAY_NATIVE_BRIDGE
// CHARACTER_V101C_MOTION_SCALE_NATIVE_BRIDGE
// CHARACTER_V101E_GOAL_SPEECH_NATIVE_BRIDGE
// CHARACTER_V101F_GOAL_COMPLETION_NATIVE_BRIDGE
// CHARACTER_V101G_LIFESTYLE_NATIVE_BRIDGE
// CHARACTER_V101I_QUIET_NATIVE_BRIDGE
// CHARACTER_V101N_HOME_HANDOFF_NATIVE_BRIDGE
// CHARACTER_V101O_RUNTIME_HEALTH_NATIVE_BRIDGE
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

      // CHARACTER_V101B_EAS_KOTLIN_NULL_RETURN_FIX
      AsyncFunction(
        "openOverlayPermissionSettings"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction null

        if (
          Build.VERSION.SDK_INT <
          Build.VERSION_CODES.M
        ) {
          return@AsyncFunction null
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

        null
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
              "characterId" to null,
              "scale" to 1.0,
              "autoMoveEnabled" to true,
              "goalSpeechEnabled" to true,
              "pendingGoalCount" to 0,
              "quietScheduleEnabled" to true,
              "quietStartMinute" to 1380,
              "quietEndMinute" to 420,
              "quietStopAutoMove" to true,
              "quietUntilAt" to 0.0,
              "quietActive" to false
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
              ),
          "scale" to
            RootFloatingCharacterService
              .readScale(
                context
              )
              .toDouble(),
          "autoMoveEnabled" to
            RootFloatingCharacterService
              .readAutoMoveEnabled(
                context
              ),
          "goalSpeechEnabled" to
            RootFloatingCharacterService
              .readGoalSpeechEnabled(
                context
              ),
          "pendingGoalCount" to
            RootFloatingCharacterService
              .readPendingGoalCount(
                context
              ),
          "quietScheduleEnabled" to
            RootFloatingCharacterService
              .readQuietScheduleEnabled(
                context
              ),
          "quietStartMinute" to
            RootFloatingCharacterService
              .readQuietStartMinute(
                context
              ),
          "quietEndMinute" to
            RootFloatingCharacterService
              .readQuietEndMinute(
                context
              ),
          "quietStopAutoMove" to
            RootFloatingCharacterService
              .readQuietStopAutoMove(
                context
              ),
          "quietUntilAt" to
            RootFloatingCharacterService
              .readQuietUntilAt(
                context
              )
              .toDouble(),
          "quietActive" to
            RootFloatingCharacterService
              .isQuietActiveNow(
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

        if (!permissionGranted) {
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
            ?: return@AsyncFunction null

        RootFloatingCharacterService.stop(
          context
        )

        null
      }

      AsyncFunction(
        "updateCharacter"
      ) {
        characterId:
          String ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction null

        RootFloatingCharacterService
          .updateCharacter(
            context,
            characterId
          )

        null
      }

      AsyncFunction(
        "setScale"
      ) {
        scale:
          Double ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction 1.0

        RootFloatingCharacterService
          .setScale(
            context,
            scale.toFloat()
          )
          .toDouble()
      }

      AsyncFunction(
        "setAutoMoveEnabled"
      ) {
        enabled:
          Boolean ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        RootFloatingCharacterService
          .setAutoMoveEnabled(
            context,
            enabled
          )
      }

      AsyncFunction(
        "setHomeHandoffActive"
      ) {
        active:
          Boolean ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        RootFloatingCharacterService
          .setHomeHandoffActive(
            context,
            active
          )
      }

      // CHARACTER_V101O_DIAGNOSTIC_BRIDGE_FUNCTIONS
      AsyncFunction(
        "getRuntimeHealth"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction mapOf(
              "userEnabled" to false,
              "permissionGranted" to false,
              "serviceRunning" to false,
              "instanceReady" to false,
              "overlayAttached" to false,
              "homeHandoffActive" to false,
              "screenInteractive" to true,
              "runtimeState" to "unsupported",
              "behaviorMode" to "stopped",
              "characterId" to "rooty",
              "x" to 0,
              "y" to 0,
              "displayWidthPx" to 0,
              "displayHeightPx" to 0,
              "positionSaved" to false,
              "scale" to 1.0,
              "autoMoveEnabled" to true
            )

        RootFloatingCharacterService
          .readRuntimeHealth(
            context
          )
      }

      AsyncFunction(
        "repairRuntime"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction "unsupported"

        RootFloatingCharacterService
          .repairRuntime(
            context
          )
      }

      AsyncFunction(
        "resetPosition"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        RootFloatingCharacterService
          .resetOverlayPosition(
            context
          )
      }

      AsyncFunction(
        "setGoalSnapshot"
      ) {
        goalsJson:
          String ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction 0

        RootFloatingCharacterService
          .setGoalSnapshot(
            context,
            goalsJson
          )
      }

      AsyncFunction(
        "setGoalCompletionSnapshot"
      ) {
        completionsJson:
          String ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction 0

        RootFloatingCharacterService
          .setGoalCompletionSnapshot(
            context,
            completionsJson
          )
      }

      AsyncFunction(
        "setLifestyleContextSnapshot"
      ) {
        contextJson:
          String ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        RootFloatingCharacterService
          .setLifestyleContextSnapshot(
            context,
            contextJson
          )
      }

      AsyncFunction(
        "setQuietSchedule"
      ) {
        enabled:
          Boolean,
        startMinute:
          Int,
        endMinute:
          Int,
        stopAutoMove:
          Boolean ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        RootFloatingCharacterService
          .setQuietSchedule(
            context,
            enabled,
            startMinute,
            endMinute,
            stopAutoMove
          )
      }

      AsyncFunction(
        "setQuietUntil"
      ) {
        untilAt:
          Double ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction 0.0

        RootFloatingCharacterService
          .setQuietUntil(
            context,
            untilAt.toLong()
          )
          .toDouble()
      }

      AsyncFunction(
        "setGoalSpeechEnabled"
      ) {
        enabled:
          Boolean ->

        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        RootFloatingCharacterService
          .setGoalSpeechEnabled(
            context,
            enabled
          )
      }

      AsyncFunction(
        "showGoalSpeechNow"
      ) {
        val context =
          appContext.reactContext
            ?: return@AsyncFunction false

        RootFloatingCharacterService
          .showGoalSpeechNow(
            context
          )
      }
    }
}
